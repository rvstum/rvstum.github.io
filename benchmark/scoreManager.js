import { state } from "./appState.js";
import {
    readJson,
    readString,
    writeJson,
    writeString,
    SCORE_STORAGE_KEY,
    CAVE_LINKS_STORAGE_KEY,
    SCORE_UPDATED_AT_STORAGE_KEY
} from "./storage.js";
import {
    getConfigKey,
    getConfigLookupKeys,
    getAllConfigKeys,
    buildLegacyConfigKey,
    getCurrentConfig,
    buildConfigKey
} from "./configManager.js";
import { DEFAULT_MOUNT_CONFIG, getScoreBaseForConfigKey } from "./constants.js";
import * as RankingUI from "./rankingUI.js?v=20260309-view-mode-rank-trophy-fix-1";
import { createSyncedStore } from "./persistence.js";

const scoreManagerCallbacks = {
    onRatingsUpdated: null
};

function normalizeRecord(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

const savedScoresStore = createSyncedStore({
    storageKey: SCORE_STORAGE_KEY,
    firestoreField: "scores",
    getValue: () => state.savedScores,
    setValue: (value) => {
        state.savedScores = normalizeRecord(value);
    },
    defaultValue: {},
    normalize: normalizeRecord,
    buildRemoteData: (value, context = {}) => {
        const scoresUpdatedAt = Number.isFinite(context.scoresUpdatedAt)
            ? context.scoresUpdatedAt
            : Date.now();
        return {
            scores: value,
            scoresUpdatedAt
        };
    },
    onLocalWrite: (_value, context = {}) => {
        const scoresUpdatedAt = Number.isFinite(context.scoresUpdatedAt)
            ? context.scoresUpdatedAt
            : Date.now();
        writeString(SCORE_UPDATED_AT_STORAGE_KEY, String(scoresUpdatedAt));
    },
    label: "scores"
});

const savedCaveLinksStore = createSyncedStore({
    storageKey: CAVE_LINKS_STORAGE_KEY,
    firestoreField: "caveLinks",
    getValue: () => state.savedCaveLinks,
    setValue: (value) => {
        state.savedCaveLinks = normalizeRecord(value);
    },
    defaultValue: null,
    normalize: (value) => (value && typeof value === "object" && !Array.isArray(value) ? value : null),
    label: "cave links"
});

function runRatingsUpdate() {
    if (typeof scoreManagerCallbacks.onRatingsUpdated === "function") {
        RankingUI.updateAllRatings(scoreManagerCallbacks.onRatingsUpdated);
    } else {
        RankingUI.updateAllRatings();
    }
}

function migrateLegacyCaveLinks() {
    const migratedLinks = {};
    try {
        const allKeys = getAllConfigKeys();
        allKeys.forEach(({ key, platform, time, stat, mount }) => {
            for (let i = 0; i < 20; i++) {
                const oldKey = `benchmark_youtube_${key}_${i}`;
                let val = readString(oldKey, "");
                if (!val && mount === DEFAULT_MOUNT_CONFIG) {
                    const legacyKey = buildLegacyConfigKey(platform, time, stat);
                    val = readString(`benchmark_youtube_${legacyKey}_${i}`, "");
                }
                if (!val) continue;
                if (!migratedLinks[key]) migratedLinks[key] = {};
                migratedLinks[key][i] = val;
            }
        });
    } catch (e) {
        console.error("Failed to migrate legacy cave links:", e);
        return {};
    }
    return migratedLinks;
}

export function configure(deps = {}) {
    if (!deps || typeof deps !== "object") return;
    if (Object.prototype.hasOwnProperty.call(deps, "onRatingsUpdated")) {
        scoreManagerCallbacks.onRatingsUpdated = typeof deps.onRatingsUpdated === "function"
            ? deps.onRatingsUpdated
            : null;
    }
}

export function loadSavedScores() {
    savedScoresStore.load();
}

export async function saveSavedScores() {
    const scoresUpdatedAt = Date.now();
    await savedScoresStore.save({ scoresUpdatedAt });
}

export function loadSavedCaveLinks() {
    const parsed = savedCaveLinksStore.load();
    if (parsed && typeof parsed === "object") return;
    state.savedCaveLinks = migrateLegacyCaveLinks();
    if (Object.keys(state.savedCaveLinks).length > 0) {
        saveSavedCaveLinks().catch((e) => {
            console.error("Failed to persist migrated cave links:", e);
        });
    }
}

export async function saveSavedCaveLinks() {
    await savedCaveLinksStore.save();
}

export function saveCurrentScores() {
    if (state.isViewMode) return;
    const key = getConfigKey();
    const scores = Array.from(document.querySelectorAll(".score-input")).map((input) => Number(input.value) || 0);
    state.savedScores[key] = scores;
    // Persist immediately to avoid losing edits on quick navigation/refresh.
    writeString(SCORE_UPDATED_AT_STORAGE_KEY, String(Date.now()));
    writeJson(SCORE_STORAGE_KEY, state.savedScores);
    clearTimeout(state.saveScoresDebounceTimer);
    state.saveScoresDebounceTimer = setTimeout(() => {
        saveSavedScores().catch(console.error);
    }, 1000);
}

export function loadScores() {
    const keys = getConfigLookupKeys();
    let scores = [];
    for (const key of keys) {
        if (Array.isArray(state.savedScores[key])) {
            scores = state.savedScores[key];
            break;
        }
    }
    document.querySelectorAll(".score-input").forEach((input, idx) => {
        const value = scores[idx] ?? 0;
        input.value = String(value);
        const overlay = input.parentElement ? input.parentElement.querySelector(".score-text-overlay") : null;
        if (overlay) overlay.textContent = String(value);
    });
    runRatingsUpdate();
}

export function loadCaveLinks() {
    const wrappers = document.querySelectorAll(".cave-play-wrapper");
    const keys = getConfigLookupKeys();
    let links = {};
    for (const key of keys) {
        if (state.savedCaveLinks[key] && typeof state.savedCaveLinks[key] === "object") {
            links = state.savedCaveLinks[key];
            break;
        }
    }
    wrappers.forEach((wrapper) => {
        const index = wrapper.dataset.index;
        const url = links[index];
        if (url) {
            wrapper.dataset.youtube = url;
            wrapper.classList.add("has-link");
        } else {
            wrapper.dataset.youtube = "";
            wrapper.classList.remove("has-link");
        }
    });
}

export function getBaseScoresForConfig() {
    const current = getCurrentConfig();
    const key = buildConfigKey(current.platform, current.time, current.stat, current.mount);
    return getScoreBaseForConfigKey(key);
}

export function getScoresArray() {
    return Array.from(document.querySelectorAll(".score-input")).map((input) => Number(input.value) || 0);
}

export function setScoresFromArray(scores) {
    const safeScores = Array.isArray(scores) ? scores : [];
    document.querySelectorAll(".score-input").forEach((input, idx) => {
        const value = safeScores[idx] ?? 0;
        input.value = String(value);
        const overlay = input.parentElement ? input.parentElement.querySelector(".score-text-overlay") : null;
        if (overlay) overlay.textContent = String(value);
    });
    runRatingsUpdate();
    saveCurrentScores();
}

export function readPersistedScoresFromStorage() {
    const parsed = readJson(SCORE_STORAGE_KEY, {});
    return parsed && typeof parsed === "object" ? parsed : {};
}
