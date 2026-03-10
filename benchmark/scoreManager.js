import { state } from "./appState.js";
import {
    readJson,
    readString,
    writeJson,
    writeString,
    removeItem,
    SCORE_STORAGE_KEY,
    CAVE_LINKS_STORAGE_KEY,
    SCORE_UPDATED_AT_STORAGE_KEY
} from "./storage.js";
import { auth } from "./client.js";
import {
    getConfigKey,
    getConfigLookupKeys,
    getAllConfigKeys,
    buildLegacyConfigKey,
    normalizeMountConfig,
    getCurrentConfig,
    buildConfigKey
} from "./configManager.js";
import { CONFIG_OPTIONS, DEFAULT_MOUNT_CONFIG, getScoreBaseForConfigKey } from "./constants.js";
import * as RankingUI from "./rankingUI.js?v=20260310-sub-score-input-14";
import { createSyncedStore } from "./persistence.js";

const scoreManagerCallbacks = {
    onRatingsUpdated: null
};

const OPPOSITE_STAT_MAP = {
    "Baddy Kills": "Baddy Points",
    "Baddy Points": "Baddy Kills"
};
const SCORE_RESET_PENDING_STORAGE_KEY = "benchmark_score_reset_pending";
const KNOWN_SCORE_PLATFORMS = new Set(CONFIG_OPTIONS.platform || []);
const KNOWN_SCORE_TIMES = new Set(CONFIG_OPTIONS.time || []);
const KNOWN_SCORE_STATS = new Set(CONFIG_OPTIONS.stat || []);
const DEFAULT_SCORE_CONFIG_KEY = buildConfigKey("Mobile", "5 Min", "Baddy Kills", DEFAULT_MOUNT_CONFIG);
const SCORE_MOUNT_LABEL_ALIASES = new Map([
    ["mount speed 1", "mountspeed1"],
    ["mount speed 2", "mountspeed2"],
    ["velocidad de montura 1", "mountspeed1"],
    ["velocidad de montura 2", "mountspeed2"],
    ["velocidade da montaria 1", "mountspeed1"],
    ["velocidade da montaria 2", "mountspeed2"],
    ["mountspeed1", "mountspeed1"],
    ["mountspeed2", "mountspeed2"]
]);
const SCORE_PLATFORM_ALIASES = new Map([
    ["mobile", "Mobile"],
    ["pc", "PC"]
]);
const SCORE_TIME_ALIASES = new Map([
    ["5 min", "5 Min"],
    ["5min", "5 Min"],
    ["10 min", "10 Min"],
    ["10min", "10 Min"],
    ["60 min", "60 Min"],
    ["60min", "60 Min"]
]);
const SCORE_STAT_ALIASES = new Map([
    ["baddy kills", "Baddy Kills"],
    ["baddykills", "Baddy Kills"],
    ["baddy points", "Baddy Points"],
    ["baddypoints", "Baddy Points"]
]);
const SCORE_CAVE_ROW_KEYS = [
    "Mercy",
    "Ruin",
    "Rats_01",
    "Rats_02",
    "Bats_01",
    "Bats_02",
    "Lizardron_04",
    "Pyrats_01",
    "PCS_01 (Cave Switch)",
    "Rebels_04",
    "RCS_04 (Cave Switch)",
    "Dark Blobs_02",
    "DBCS_02 (Cave Switch)",
    "Spiders_01"
];
const SCORE_CAVE_KEY_ALIASES = new Map(
    SCORE_CAVE_ROW_KEYS.flatMap((label, index) => {
        const base = normalizeLooseLabel(label)
            .replace(/\(cave switch\)/g, "")
            .trim();
        const compact = base.replace(/[^a-z0-9]/g, "");
        return [
            [base, index],
            [compact, index]
        ];
    })
);
const SCORE_VALUE_FIELD_CANDIDATES = ["scores", "values", "rows", "items", "data"];

function cloneScoresArray(scores) {
    return Array.isArray(scores) ? [...scores] : [];
}

function normalizeSimpleRecord(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function normalizeNumericScoreValue(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
}

function normalizeScoreArrayCandidate(value) {
    if (Array.isArray(value)) {
        return value.map((entry) => normalizeNumericScoreValue(entry));
    }
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;

    for (const fieldName of SCORE_VALUE_FIELD_CANDIDATES) {
        if (!Object.prototype.hasOwnProperty.call(value, fieldName)) continue;
        const nestedCandidate = normalizeScoreArrayCandidate(value[fieldName]);
        if (nestedCandidate) return nestedCandidate;
    }

    const keys = Object.keys(value);
    if (!keys.length) return null;
    const numericKeys = keys.filter((key) => /^\d+$/.test(key));
    if (numericKeys.length === keys.length) {
        const sorted = [...numericKeys].sort((a, b) => Number(a) - Number(b));
        const result = [];
        sorted.forEach((key) => {
            result[Number(key)] = normalizeNumericScoreValue(value[key]);
        });
        return result.map((entry) => normalizeNumericScoreValue(entry));
    }

    const caveEntries = [];
    let hasUnknownCaveKey = false;
    keys.forEach((key) => {
        const caveIndex = SCORE_CAVE_KEY_ALIASES.get(
            normalizeLooseLabel(key).replace(/[^a-z0-9]/g, "")
        );
        if (!Number.isInteger(caveIndex)) {
            hasUnknownCaveKey = true;
            return;
        }
        caveEntries.push([caveIndex, normalizeNumericScoreValue(value[key])]);
    });

    if (caveEntries.length > 0 && !hasUnknownCaveKey) {
        const result = new Array(SCORE_CAVE_ROW_KEYS.length).fill(0);
        caveEntries.forEach(([index, scoreValue]) => {
            result[index] = scoreValue;
        });
        return result;
    }

    return null;
}

function isSignedInUser() {
    return !!(auth && auth.currentUser && auth.currentUser.uid);
}

function isLocalDebugHost() {
    if (typeof window === "undefined" || !window.location) return false;
    const host = window.location.hostname || "";
    return host === "localhost" || host === "127.0.0.1";
}

function canSaveSignedInScores(resetIntent = false) {
    if (!isSignedInUser()) return true;
    return resetIntent || state.scoresHydrated === true;
}

function normalizeLooseLabel(value) {
    return (value || "")
        .toString()
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .toLowerCase();
}

function resolveMountAlias(rawValue) {
    const normalized = normalizeLooseLabel(rawValue);
    return SCORE_MOUNT_LABEL_ALIASES.get(normalized) || normalizeMountConfig(rawValue || DEFAULT_MOUNT_CONFIG);
}

function resolvePlatformAlias(rawValue) {
    return SCORE_PLATFORM_ALIASES.get(normalizeLooseLabel(rawValue)) || null;
}

function resolveTimeAlias(rawValue) {
    return SCORE_TIME_ALIASES.get(normalizeLooseLabel(rawValue)) || null;
}

function resolveStatAlias(rawValue) {
    return SCORE_STAT_ALIASES.get(normalizeLooseLabel(rawValue)) || null;
}

function isCurrentScoreConfigKey(rawKey) {
    const parts = typeof rawKey === "string" ? rawKey.split("|") : [];
    return parts.length === 4
        && KNOWN_SCORE_PLATFORMS.has(parts[0])
        && KNOWN_SCORE_TIMES.has(parts[1])
        && KNOWN_SCORE_STATS.has(parts[2]);
}

function resolveLegacyScoreKeys(rawKey) {
    const key = typeof rawKey === "string" ? rawKey.trim() : "";
    if (!key) return [];
    const parts = key.split("|").map((part) => part.trim());
    const labelParts = key.split(/\s+-\s+/).map((part) => part.trim()).filter(Boolean);
    const resolvedParts = parts.map((part, index) => {
        if (index === 0) return resolvePlatformAlias(part) || resolveTimeAlias(part) || part;
        if (index === 1) return resolveTimeAlias(part) || resolveStatAlias(part) || part;
        if (index === 2) return resolveStatAlias(part) || part;
        return part;
    });
    const resolvedLabelParts = labelParts.map((part, index) => {
        if (index === 0) return resolvePlatformAlias(part) || resolveTimeAlias(part) || part;
        if (index === 1) return resolveTimeAlias(part) || resolveStatAlias(part) || part;
        if (index === 2) return resolveStatAlias(part) || part;
        return part;
    });

    if (resolvedParts.length === 4 && KNOWN_SCORE_PLATFORMS.has(resolvedParts[0]) && KNOWN_SCORE_TIMES.has(resolvedParts[1]) && KNOWN_SCORE_STATS.has(resolvedParts[2])) {
        return [buildConfigKey(resolvedParts[0], resolvedParts[1], resolvedParts[2], resolvedParts[3])];
    }

    if (resolvedParts.length === 3 && KNOWN_SCORE_PLATFORMS.has(resolvedParts[0]) && KNOWN_SCORE_TIMES.has(resolvedParts[1]) && KNOWN_SCORE_STATS.has(resolvedParts[2])) {
        return [buildConfigKey(resolvedParts[0], resolvedParts[1], resolvedParts[2], DEFAULT_MOUNT_CONFIG)];
    }

    if (resolvedParts.length === 3 && KNOWN_SCORE_TIMES.has(resolvedParts[0]) && KNOWN_SCORE_STATS.has(resolvedParts[1])) {
        const normalizedMount = resolveMountAlias(resolvedParts[2] || DEFAULT_MOUNT_CONFIG);
        return (CONFIG_OPTIONS.platform || []).map((platform) => buildConfigKey(platform, resolvedParts[0], resolvedParts[1], normalizedMount));
    }

    if (resolvedParts.length === 2 && KNOWN_SCORE_TIMES.has(resolvedParts[0]) && KNOWN_SCORE_STATS.has(resolvedParts[1])) {
        return (CONFIG_OPTIONS.platform || []).map((platform) => buildConfigKey(platform, resolvedParts[0], resolvedParts[1], DEFAULT_MOUNT_CONFIG));
    }

    if (resolvedLabelParts.length === 4 && KNOWN_SCORE_PLATFORMS.has(resolvedLabelParts[0]) && KNOWN_SCORE_TIMES.has(resolvedLabelParts[1]) && KNOWN_SCORE_STATS.has(resolvedLabelParts[2])) {
        return [buildConfigKey(resolvedLabelParts[0], resolvedLabelParts[1], resolvedLabelParts[2], resolveMountAlias(resolvedLabelParts[3]))];
    }

    if (resolvedLabelParts.length === 3 && KNOWN_SCORE_TIMES.has(resolvedLabelParts[0]) && KNOWN_SCORE_STATS.has(resolvedLabelParts[1])) {
        const resolvedMount = resolveMountAlias(resolvedLabelParts[2]);
        return (CONFIG_OPTIONS.platform || []).map((platform) => buildConfigKey(platform, resolvedLabelParts[0], resolvedLabelParts[1], resolvedMount));
    }

    return [key];
}

function parseSavedScoreConfigKey(rawKey) {
    const resolvedKeys = resolveLegacyScoreKeys(rawKey);
    const candidate = resolvedKeys.find((value) => isCurrentScoreConfigKey(value));
    if (!candidate) return null;
    const parts = candidate.split("|");
    if (parts.length !== 4) return null;
    return {
        platform: parts[0],
        time: parts[1],
        stat: parts[2],
        mount: normalizeMountConfig(parts[3] || DEFAULT_MOUNT_CONFIG)
    };
}

function appendResolvedScores(target, rawKey, rawScores) {
    const normalizedScores = normalizeScoreArrayCandidate(rawScores);
    if (!normalizedScores) return false;
    resolveLegacyScoreKeys(rawKey).forEach((resolvedKey) => {
        if (!resolvedKey || Object.prototype.hasOwnProperty.call(target, resolvedKey)) return;
        target[resolvedKey] = cloneScoresArray(normalizedScores);
    });
    return true;
}

function collectNestedScores(value, pathParts, target) {
    if (!value || typeof value !== "object") return;
    const directScores = normalizeScoreArrayCandidate(value);
    if (directScores && pathParts.length > 0) {
        appendResolvedScores(target, pathParts.join("|"), directScores);
        return;
    }
    if (Array.isArray(value)) return;
    Object.entries(value).forEach(([key, child]) => {
        if (appendResolvedScores(target, key, child)) return;
        if (child && typeof child === "object") {
            collectNestedScores(child, [...pathParts, key.trim()], target);
        }
    });
}

function normalizeScoresRecord(value) {
    if (Array.isArray(value)) {
        return {
            [DEFAULT_SCORE_CONFIG_KEY]: cloneScoresArray(value)
        };
    }
    const directScores = normalizeScoreArrayCandidate(value);
    if (directScores) {
        return {
            [DEFAULT_SCORE_CONFIG_KEY]: directScores
        };
    }
    if (!value || typeof value !== "object") return {};

    const normalized = {};
    const entries = Object.entries(value);

    entries
        .filter(([key]) => isCurrentScoreConfigKey(key))
        .forEach(([key, scores]) => {
            const normalizedScores = normalizeScoreArrayCandidate(scores);
            if (!normalizedScores) return;
            normalized[key] = cloneScoresArray(normalizedScores);
        });

    entries.forEach(([key, scores]) => {
        appendResolvedScores(normalized, key, scores);
        if (scores && typeof scores === "object") {
            collectNestedScores(scores, [key.trim()], normalized);
        }
    });

    return normalized;
}

function hasAnyNonZeroSavedScoreEntries(value) {
    return Object.values(normalizeScoresRecord(value)).some((scores) => (
        Array.isArray(scores)
        && scores.some((entry) => normalizeNumericScoreValue(entry) > 0)
    ));
}

const savedScoresStore = createSyncedStore({
    storageKey: SCORE_STORAGE_KEY,
    firestoreField: "scores",
    getValue: () => state.savedScores,
    setValue: (value) => {
        state.savedScores = normalizeScoresRecord(value);
    },
    defaultValue: {},
    normalize: normalizeScoresRecord,
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
        state.savedCaveLinks = normalizeSimpleRecord(value);
    },
    defaultValue: null,
    normalize: (value) => {
        const normalized = normalizeSimpleRecord(value);
        return Object.keys(normalized).length > 0 ? normalized : null;
    },
    label: "cave links"
});

function runRatingsUpdate() {
    if (typeof scoreManagerCallbacks.onRatingsUpdated === "function") {
        RankingUI.updateAllRatings(scoreManagerCallbacks.onRatingsUpdated);
    } else {
        RankingUI.updateAllRatings();
    }
}

function getPersistedScoresForConfig(config = null) {
    const keys = getConfigLookupKeys(config);
    for (const key of keys) {
        if (Array.isArray(state.savedScores[key])) {
            return cloneScoresArray(state.savedScores[key]);
        }
    }
    return [];
}

function persistScoresForConfig(config, scores) {
    const resolvedConfig = config || getCurrentConfig();
    const key = buildConfigKey(
        resolvedConfig.platform,
        resolvedConfig.time,
        resolvedConfig.stat,
        resolvedConfig.mount
    );
    state.savedScores[key] = cloneScoresArray(scores);
    state.scoresDirty = true;
    removeItem(SCORE_RESET_PENDING_STORAGE_KEY);
    writeString(SCORE_UPDATED_AT_STORAGE_KEY, String(Date.now()));
    writeJson(SCORE_STORAGE_KEY, state.savedScores);
    clearTimeout(state.saveScoresDebounceTimer);
    state.saveScoresDebounceTimer = setTimeout(() => {
        saveSavedScores().catch(console.error);
    }, isLocalDebugHost() ? 150 : 1000);
}

function writeScoresSnapshotLocally(scoresUpdatedAt = Date.now()) {
    const normalized = normalizeScoresRecord(state.savedScores);
    state.savedScores = normalized;
    writeJson(SCORE_STORAGE_KEY, normalized);
    writeString(SCORE_UPDATED_AT_STORAGE_KEY, String(scoresUpdatedAt));
}

function dispatchScoresLoadedEvent() {
    if (typeof document === "undefined" || typeof document.dispatchEvent !== "function") return;
    document.dispatchEvent(new CustomEvent("benchmark:scores-loaded", {
        detail: {
            config: getCurrentConfig()
        }
    }));
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
    state.scoresDirty = false;
}

export async function saveSavedScores(options = {}) {
    const scoresUpdatedAt = Date.now();
    const resetIntent = options && options.resetIntent === true;
    if (!canSaveSignedInScores(resetIntent)) {
        return false;
    }
    writeScoresSnapshotLocally(scoresUpdatedAt);
    if (!resetIntent && !hasAnyNonZeroSavedScoreEntries(state.savedScores)) {
        state.scoresDirty = false;
        return true;
    }
    if (resetIntent) {
        writeString(SCORE_RESET_PENDING_STORAGE_KEY, "true");
    } else {
        removeItem(SCORE_RESET_PENDING_STORAGE_KEY);
    }
    const success = await savedScoresStore.save({ scoresUpdatedAt });
    if (success) {
        removeItem(SCORE_RESET_PENDING_STORAGE_KEY);
        state.scoresDirty = false;
    }
    return success;
}

export function getOppositeStat(stat) {
    const normalized = typeof stat === "string" ? stat.trim() : "";
    return OPPOSITE_STAT_MAP[normalized] || OPPOSITE_STAT_MAP["Baddy Kills"];
}

export function getAlternateConfig(config = null) {
    const current = config || getCurrentConfig();
    return {
        ...current,
        stat: getOppositeStat(current.stat)
    };
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
    if (!canSaveSignedInScores(false)) return;
    const scores = Array.from(document.querySelectorAll(".score-input")).map((input) => Number(input.value) || 0);
    persistScoresForConfig(getCurrentConfig(), scores);
}

export function loadScores() {
    const scores = getPersistedScoresForConfig();
    document.querySelectorAll(".score-input").forEach((input, idx) => {
        const value = scores[idx] ?? 0;
        input.value = String(value);
        const overlay = input.parentElement ? input.parentElement.querySelector(".score-text-overlay") : null;
        if (overlay) overlay.textContent = String(value);
    });
    runRatingsUpdate();
    dispatchScoresLoadedEvent();
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

export function getAlternateScoresForCurrentConfig() {
    return getPersistedScoresForConfig(getAlternateConfig());
}

export function getAlternateScoreValueForRow(rowIndex) {
    const scores = getAlternateScoresForCurrentConfig();
    return Number(scores[rowIndex]) || 0;
}

export function setAlternateScoreValueForRow(rowIndex, value) {
    if (state.isViewMode) return;
    const nextScores = getPersistedScoresForConfig(getAlternateConfig());
    nextScores[rowIndex] = Number(value) || 0;
    persistScoresForConfig(getAlternateConfig(), nextScores);
}

export function hasSavedScoresForConfig(config = null) {
    const keys = getConfigLookupKeys(config);
    return keys.some((key) => Array.isArray(state.savedScores[key]));
}

export function hasNonZeroSavedScoresForConfig(config = null) {
    const keys = getConfigLookupKeys(config);
    return keys.some((key) => (
        Array.isArray(state.savedScores[key])
        && state.savedScores[key].some((value) => normalizeNumericScoreValue(value) > 0)
    ));
}

export function resolvePreferredSavedConfig(options = {}) {
    const preferNonZero = !!(options && options.preferNonZero);
    let bestConfig = null;
    let bestScore = -1;
    Object.entries(normalizeScoresRecord(state.savedScores)).forEach(([key, scores]) => {
        if (!Array.isArray(scores)) return;
        const parsedConfig = parseSavedScoreConfigKey(key);
        if (!parsedConfig) return;
        const total = scores.reduce((sum, value) => sum + normalizeNumericScoreValue(value), 0);
        if (preferNonZero && total <= 0) return;
        if (total <= bestScore) return;
        bestScore = total;
        bestConfig = parsedConfig;
    });
    return bestConfig;
}

export function readPersistedScoresFromStorage() {
    return normalizeScoresRecord(readJson(SCORE_STORAGE_KEY, {}));
}

export function normalizeSavedScoresRecord(value) {
    return normalizeScoresRecord(value);
}
