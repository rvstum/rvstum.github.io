import { state } from "./appState.js";
import { USER_STATS_STORAGE_KEY } from "./storage.js";
import { createSyncedStore } from "./persistence.js";

const STAT_KEYS = ["mostBkDay", "mostPtDay", "mostBkSeason", "highestBkStreak"];
const MAX_STAT_DIGITS = 15;
let statMeasureCanvas = null;

function normalizeStatValue(value) {
    const digits = String(value ?? "").replace(/[^0-9]/g, "").slice(0, MAX_STAT_DIGITS);
    const num = Number(digits);
    if (!Number.isFinite(num) || num < 0) return 0;
    return Math.floor(num);
}

function formatStatValue(value) {
    const digits = String(value ?? "")
        .replace(/[^0-9]/g, "")
        .replace(/^0+(?=\d)/, "")
        .slice(0, MAX_STAT_DIGITS);
    if (!digits) return "";
    const num = Number(digits);
    return Number.isFinite(num) ? Math.floor(num).toLocaleString("en-US") : "";
}

function fitStatInputText(input) {
    input.style.removeProperty("font-size");
    if (!input.value || !input.clientWidth) return;

    statMeasureCanvas ||= document.createElement("canvas");
    const context = statMeasureCanvas.getContext("2d");
    if (!context) return;
    const style = window.getComputedStyle(input);
    const baseSize = Number.parseFloat(style.fontSize) || 13;
    const horizontalPadding = (Number.parseFloat(style.paddingLeft) || 0)
        + (Number.parseFloat(style.paddingRight) || 0);
    const availableWidth = Math.max(1, input.clientWidth - horizontalPadding - 2);
    context.font = `${style.fontWeight} ${baseSize}px ${style.fontFamily}`;
    const textWidth = context.measureText(input.value).width;
    if (textWidth <= availableWidth) return;

    const fittedSize = Math.max(6, Math.floor((baseSize * availableWidth / textWidth) * 10) / 10);
    input.style.setProperty("font-size", `${fittedSize}px`, "important");
}

function formatStatInput(input) {
    const rawValue = String(input.value || "");
    const rawCaret = input.selectionStart ?? rawValue.length;
    const digitsBeforeCaret = rawValue.slice(0, rawCaret).replace(/[^0-9]/g, "").length;
    const formattedValue = formatStatValue(rawValue);
    input.value = formattedValue;
    fitStatInputText(input);

    if (document.activeElement !== input || typeof input.setSelectionRange !== "function") return;
    let nextCaret = 0;
    let seenDigits = 0;
    while (nextCaret < formattedValue.length && seenDigits < digitsBeforeCaret) {
        if (/\d/.test(formattedValue[nextCaret])) seenDigits += 1;
        nextCaret += 1;
    }
    input.setSelectionRange(nextCaret, nextCaret);
}

function normalizeUserStats(value) {
    const source = (value && typeof value === "object") ? value : {};
    const normalized = {};
    STAT_KEYS.forEach((key) => {
        normalized[key] = normalizeStatValue(source[key]);
    });
    return normalized;
}

const userStatsStore = createSyncedStore({
    storageKey: USER_STATS_STORAGE_KEY,
    firestoreField: "userStats",
    getValue: () => state.userStats,
    setValue: (value) => {
        state.userStats = normalizeUserStats(value);
    },
    defaultValue: { mostBkDay: 0, mostPtDay: 0, mostBkSeason: 0, highestBkStreak: 0 },
    normalize: normalizeUserStats,
    label: "user stats"
});

const FIELD_MAP = {
    statMostBkDay: "mostBkDay",
    statMostPtDay: "mostPtDay",
    statMostBkSeason: "mostBkSeason",
    statHighestBkStreak: "highestBkStreak"
};

let saveDebounceTimer = null;

export function renderUserStats() {
    Object.entries(FIELD_MAP).forEach(([inputId, statKey]) => {
        const input = document.getElementById(inputId);
        if (!input) return;
        const value = state.userStats?.[statKey] || 0;
        if (document.activeElement !== input) {
            input.value = value ? formatStatValue(value) : "";
            fitStatInputText(input);
        }
    });
}

export function applyUserStatsFromRemote(userStats) {
    state.userStats = normalizeUserStats(userStats);
    renderUserStats();
}

export function loadUserStats() {
    userStatsStore.load();
    renderUserStats();
}

export async function saveUserStats() {
    return userStatsStore.save();
}

function handleStatInput(event) {
    const input = event.target;
    const statKey = FIELD_MAP[input.id];
    if (!statKey) return;
    formatStatInput(input);
    state.userStats = {
        ...normalizeUserStats(state.userStats),
        [statKey]: normalizeStatValue(input.value)
    };
    if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
    saveDebounceTimer = setTimeout(() => {
        saveUserStats();
    }, 600);
}

export function initUserStatsInputs() {
    Object.keys(FIELD_MAP).forEach((inputId) => {
        const input = document.getElementById(inputId);
        if (!input) return;
        input.addEventListener("input", handleStatInput);
        input.addEventListener("blur", () => {
            input.value = state.userStats?.[FIELD_MAP[inputId]]
                ? formatStatValue(state.userStats[FIELD_MAP[inputId]])
                : "";
            fitStatInputText(input);
            if (saveDebounceTimer) {
                clearTimeout(saveDebounceTimer);
                saveDebounceTimer = null;
            }
            saveUserStats();
        });
    });
    window.addEventListener("resize", () => {
        Object.keys(FIELD_MAP).forEach((inputId) => {
            const input = document.getElementById(inputId);
            if (input) fitStatInputText(input);
        });
    });
}
