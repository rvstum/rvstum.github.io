import { state } from "./appState.js";
import { calculateSingleRating } from "./scoring.js";
import { RADAR_CATEGORY_WEIGHTS, RADAR_SWORDS_CATEGORIES } from "./constants.js";

const RADAR_LABEL_OVERRIDES = new Map([
    ["lizardron_04", "Liz_04"],
    ["pyrats_01", "Py_01"],
    ["pcs_01 (cave switch)", "PCS_01"],
    ["rebels_04", "Reb_04"],
    ["rcs_04 (cave switch)", "RCS_04"],
    ["dark blobs_02", "DB_02"],
    ["dbcs_02 (cave switch)", "DBCS_04"],
    ["spiders_01", "Spi_01"]
]);

function normalizeRadarLabel(label, { shorten = true } = {}) {
    const normalized = String(label || "").replace(/\s+/g, " ").trim();
    if (!normalized) return "Cave";
    if (!shorten) return normalized;
    return RADAR_LABEL_OVERRIDES.get(normalized.toLowerCase()) || normalized;
}

function collectCaveLabels({ shorten = true } = {}) {
    const rows = document.querySelectorAll(".ranks-bars");
    if (!rows.length) return [];
    return Array.from(rows).map((row) => {
        const cells = row.querySelectorAll(".rank-bar");
        const labelCell = cells[1];
        if (!labelCell) return "Cave";
        const img = labelCell.querySelector("img");
        const altLabel = (img && typeof img.getAttribute === "function")
            ? (img.getAttribute("alt") || "").trim()
            : "";
        if (altLabel) return normalizeRadarLabel(altLabel, { shorten });

        // Avoid control text ("Right click to edit") leaking into radar labels.
        const raw = Array.from(labelCell.childNodes)
            .filter((node) => node && node.nodeType === Node.TEXT_NODE)
            .map((node) => String(node.textContent || ""))
            .join(" ")
            .replace(/\s+/g, " ")
            .trim();
        return normalizeRadarLabel(raw, { shorten });
    });
}

export function getCaveLabels() {
    return collectCaveLabels({ shorten: true });
}

export function getFullCaveLabels() {
    return collectCaveLabels({ shorten: false });
}

export function getRadarRatings() {
    return Array.from(document.querySelectorAll(".score-input")).map((input, index) => {
        const score = Number(input.value);
        if (!Number.isFinite(score) || score <= 0) return 0;
        const thresholds = state.allRowThresholds[index] || state.allRowThresholds[0] || [];
        let rating = calculateSingleRating(score, thresholds);
        const topThreshold = thresholds[12];
        if (Number.isFinite(topThreshold) && topThreshold > 0 && score > topThreshold) {
            const bonus = Math.round(((score - topThreshold) / topThreshold) * 100);
            rating = 1300 + bonus;
        }
        return rating;
    });
}

export function getRadarData() {
    if (!state.radarLabelsCache.length) {
        state.radarLabelsCache = getCaveLabels();
    }
    const rawScores = getRadarRatings();
    const total = rawScores.length;
    if (!total) return { labels: [], values: [], rawValues: [] };
    const half = Math.floor(total / 2);
    const swords = rawScores.slice(0, half);
    const bombs = rawScores.slice(half);

    if (state.radarMode === "bombs") {
        const maxValue = Math.max(1, ...bombs);
        return {
            labels: state.radarLabelsCache.slice(half, half + bombs.length),
            values: bombs.map((val) => Math.max(0, Math.min(1, val / maxValue))),
            rawValues: bombs,
            maxValue,
            splitIndex: half
        };
    }

    if (state.radarMode === "combined") {
        const labels = state.radarLabelsCache.slice(0, total);
        const maxValue = Math.max(1, ...rawScores);
        const swordsValues = new Array(total).fill(0);
        const bombsValues = new Array(total).fill(0);
        for (let i = 0; i < total; i++) {
            const value = Math.max(0, Math.min(1, rawScores[i] / maxValue));
            if (i < half) swordsValues[i] = value;
            else bombsValues[i] = value;
        }
        return {
            labels,
            values: rawScores.map((val) => Math.max(0, Math.min(1, val / maxValue))),
            rawValues: rawScores,
            maxValue,
            splitIndex: half,
            swordsValues,
            bombsValues
        };
    }

    const maxValue = Math.max(1, ...swords);
    return {
        labels: state.radarLabelsCache.slice(0, swords.length),
        values: swords.map((val) => Math.max(0, Math.min(1, val / maxValue))),
        rawValues: swords,
        maxValue,
        splitIndex: half
    };
}

export function getRadarCategoryValues(mode = state.radarMode) {
    const ratings = getRadarRatings();
    let filteredCategories = RADAR_CATEGORY_WEIGHTS;
    if (mode === "swords") {
        filteredCategories = RADAR_CATEGORY_WEIGHTS.filter((c) => RADAR_SWORDS_CATEGORIES.includes(c.name));
    } else if (mode === "bombs") {
        filteredCategories = RADAR_CATEGORY_WEIGHTS.filter((c) => !RADAR_SWORDS_CATEGORIES.includes(c.name));
    }

    return filteredCategories.map((category) => {
        let sum = 0;
        let totalWeight = 0;
        category.weights.forEach((entry) => {
            const idx = entry[0];
            const weight = entry[1];
            sum += (ratings[idx] || 0) * weight;
            totalWeight += weight;
        });
        const avg = totalWeight > 0 ? sum / totalWeight : 0;
        return { label: category.name, value: avg };
    });
}
