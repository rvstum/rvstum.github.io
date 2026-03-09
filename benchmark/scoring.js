import { FINAL_RANK_INDEX, RANK_THRESHOLDS, getScoreBaseForConfigKey } from "./constants.js";

const SCORE_PER_RANK = 100;
const SCORE_BASE_DECREASE_STEP = 0.05;

export function buildThresholdsFromBase(base) {
    const safeBase = Number.isFinite(Number(base)) ? Number(base) : 0;
    const thresholds = new Array(FINAL_RANK_INDEX);
    for (let i = 0; i < FINAL_RANK_INDEX; i++) {
        const stepsFromTop = (FINAL_RANK_INDEX - 1) - i;
        const decrease = stepsFromTop * SCORE_BASE_DECREASE_STEP;
        thresholds[i] = Math.max(0, Math.round(safeBase * (1 - decrease)));
    }
    return thresholds;
}

export function calculateSingleRating(score, thresholds) {
    const thresholdsList = Array.isArray(thresholds) ? thresholds : [];
    const thresholdCount = FINAL_RANK_INDEX;
    const maxRating = thresholdCount * SCORE_PER_RANK;
    const lastThresholdIndex = thresholdCount - 1;

    score = Number(score);
    if (!score || score <= 0 || thresholdsList.length < thresholdCount) return 0;

    const T = thresholdsList;

    if (score >= T[lastThresholdIndex]) {
        return maxRating;
    }

    for (let i = lastThresholdIndex - 1; i >= 0; i--) {
        if (score >= T[i]) {
            const baseRating = (i + 1) * 100;
            const lowerBound = T[i];
            const upperBound = T[i + 1];
            const range = upperBound - lowerBound;

            const progress = (range > 0) ? (score - lowerBound) / range : 0;
            return Math.round(baseRating + (progress * 100));
        }
    }

    if (score < T[0]) {
        const progress = (T[0] > 0) ? score / T[0] : 0;
        return Math.round(progress * 100);
    }

    return 0;
}

export function calculateTotalRatingForScores(scores, baseScores) {
    const scoreList = Array.isArray(scores) ? scores : [];
    const baseList = Array.isArray(baseScores) ? baseScores : [];
    let totalRating = 0;

    scoreList.forEach((score, idx) => {
        const base = Number(baseList[idx] ?? baseList[0] ?? 0);
        const thresholds = buildThresholdsFromBase(base);
        totalRating += calculateSingleRating(score, thresholds);
    });

    return totalRating;
}

function getRankIndexForTotalRating(totalRating) {
    for (let i = RANK_THRESHOLDS.length - 1; i > 0; i--) {
        if (totalRating >= RANK_THRESHOLDS[i]) return i;
    }
    return 0;
}

export function calculateRankFromData(data = {}) {
    const scoresByConfig = data && typeof data === "object" ? data.scores : null;
    if (!scoresByConfig || typeof scoresByConfig !== "object") return 0;

    let maxRankIndex = 0;
    Object.entries(scoresByConfig).forEach(([configKey, scoreArray]) => {
        if (!Array.isArray(scoreArray)) return;
        const baseScores = getScoreBaseForConfigKey(configKey);
        const totalRating = calculateTotalRatingForScores(scoreArray, baseScores);
        const rankIndex = getRankIndexForTotalRating(totalRating);
        if (rankIndex > maxRankIndex) maxRankIndex = rankIndex;
    });

    return maxRankIndex;
}
