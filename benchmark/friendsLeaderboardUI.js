import { auth } from "./client.js";
import { t } from "./i18n.js";
import {
    BRONZE_TROPHY_FILTER,
    CONFIG_OPTIONS,
    FINAL_RANK_INDEX,
    RADAR_CATEGORY_WEIGHTS,
    RANK_NAMES,
    RANK_THRESHOLDS,
    RANK_TEXT_COLORS,
    STELLAR_TROPHY_FILTER,
    getScoreBaseForConfigKey
} from "./constants.js";
import { getConfigLookupKeys, normalizeMountConfig } from "./configManager.js";
import {
    buildThresholdsFromBase,
    calculateSingleRating,
    calculateTotalRatingForScores
} from "./scoring.js";
import * as ScoreManager from "./scoreManager.js?v=20260311-view-mode-compare-2";
import {
    buildSnapshotFromUserData,
    loadHydratedFriendEntries,
    readCurrentUserData
} from "./friendsCoreUI.js?v=20260317-guild-view-fix-2";
import { getFlagUrl } from "./utils.js";
import { getCachedElementById } from "./utils/domUtils.js";

const LEADERBOARD_PAGE_SIZE = 50;
const DEFAULT_FILTERS = Object.freeze({
    scope: "worldwide",
    platform: "all",
    time: "5 Min",
    stat: "Baddy Kills",
    mount: "mountspeed1"
});
const TROPHY_ICON_URL = new URL("../icons/trophy.png", import.meta.url).toString();
const SHIMMER_DURATION_MS = 2500;
const TOP_BADDY_ICON_URLS = {
    Rats: new URL("../icons/rat.png", import.meta.url).toString(),
    Bats: new URL("../icons/bat.png", import.meta.url).toString(),
    Lizardrons: new URL("../icons/lizardron.png", import.meta.url).toString(),
    Pyrats: new URL("../icons/pyrat.png", import.meta.url).toString(),
    Rebels: new URL("../icons/rebel.png", import.meta.url).toString(),
    "Dark Blobs": new URL("../icons/darkblob.png", import.meta.url).toString(),
    Spiders: new URL("../icons/spider.png", import.meta.url).toString()
};
const LEADERBOARD_RANK_NAME_KEYS = Object.freeze({
    Unranked: "rank_name_unranked",
    Iron: "rank_name_iron",
    Bronze: "rank_name_bronze",
    Silver: "rank_name_silver",
    Gold: "rank_name_gold",
    Platinum: "rank_name_platinum",
    Diamond: "rank_name_diamond",
    Master: "rank_name_master",
    Grandmaster: "rank_name_grandmaster",
    Champion: "rank_name_champion",
    Paragon: "rank_name_paragon",
    Stellar: "rank_name_stellar",
    Celestium: "rank_name_celestium",
    Aeternus: "rank_name_aeternus"
});

function safeObject(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function pickFirstString(...values) {
    for (const value of values) {
        if (typeof value !== "string") continue;
        const trimmed = value.trim();
        if (trimmed) return trimmed;
    }
    return "";
}

function getLocalizedLeaderboardRankName(rankName) {
    const raw = pickFirstString(rankName);
    if (!raw) return "";
    const key = LEADERBOARD_RANK_NAME_KEYS[raw];
    return key ? t(key) : raw;
}

function normalizeRankIndex(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 0;
    return Math.max(0, Math.min(FINAL_RANK_INDEX, Math.floor(parsed)));
}

function parseRankIndexFromName(rankName) {
    const lower = typeof rankName === "string" ? rankName.trim().toLowerCase() : "";
    if (!lower) return 0;
    for (let index = FINAL_RANK_INDEX; index >= 1; index -= 1) {
        const known = String(RANK_NAMES[index] || "").trim().toLowerCase();
        if (known && lower.includes(known)) return index;
    }
    return 0;
}

function resolveLeaderboardRankIndex(totalRating) {
    const safeTotalRating = Math.max(0, Number(totalRating) || 0);
    for (let index = RANK_THRESHOLDS.length - 1; index >= 1; index -= 1) {
        if (safeTotalRating >= Number(RANK_THRESHOLDS[index] || 0)) {
            return normalizeRankIndex(index);
        }
    }
    return 0;
}

function getRomanSubRank(progressPercent) {
    const value = Number.isFinite(progressPercent) ? progressPercent : 0;
    const clamped = Math.max(0, Math.min(100, value));
    if (clamped >= 80) return "I";
    if (clamped >= 60) return "II";
    if (clamped >= 40) return "III";
    if (clamped >= 20) return "IV";
    return "V";
}

function resolveLeaderboardRankText(totalRating, rankIndex) {
    const safeRankIndex = normalizeRankIndex(rankIndex);
    const baseRankName = RANK_NAMES[safeRankIndex] || RANK_NAMES[0] || "Unranked";
    const rankName = getLocalizedLeaderboardRankName(baseRankName) || baseRankName;
    if (safeRankIndex <= 0) return rankName;

    const safeTotalRating = Math.max(0, Number(totalRating) || 0);
    const lowerBound = Number(RANK_THRESHOLDS[safeRankIndex] || 0);
    const upperBound = safeRankIndex + 1 < RANK_THRESHOLDS.length
        ? Number(RANK_THRESHOLDS[safeRankIndex + 1] || lowerBound)
        : lowerBound + 650;
    const range = upperBound - lowerBound;
    const progressInRank = range > 0
        ? Math.max(0, Math.min(100, ((safeTotalRating - lowerBound) / range) * 100))
        : 100;
    if (safeRankIndex === FINAL_RANK_INDEX && progressInRank >= 100) {
        return `${rankName} ${t("rank_complete_suffix")}`;
    }
    const subRank = getRomanSubRank(progressInRank);
    return `${rankName}&nbsp;<span class="rank-sub-rn">${subRank}</span>`;
}

function getShimmerAnimationDelay() {
    const now = typeof performance !== "undefined" && Number.isFinite(performance.now())
        ? performance.now()
        : Date.now();
    return `-${(now % SHIMMER_DURATION_MS) / 1000}s`;
}

function getRankTrophyFilter(rankIndex) {
    switch (normalizeRankIndex(rankIndex)) {
        case 1: return "grayscale(100%)";
        case 2: return BRONZE_TROPHY_FILTER;
        case 3: return "grayscale(100%) brightness(1.3)";
        case 4: return "sepia(1) hue-rotate(5deg) saturate(2.5) brightness(0.9)";
        case 5: return "sepia(1) hue-rotate(130deg) saturate(1.5) brightness(1.1)";
        case 6: return "sepia(1) hue-rotate(170deg) saturate(3) brightness(1.0)";
        case 7: return "sepia(1) hue-rotate(220deg) saturate(3) brightness(0.9)";
        case 8: return "sepia(1) hue-rotate(10deg) saturate(5) brightness(1.2)";
        case 9: return "sepia(1) hue-rotate(330deg) saturate(5) brightness(0.8)";
        case 10: return "sepia(1) hue-rotate(120deg) saturate(2) brightness(0.9)";
        case 11: return STELLAR_TROPHY_FILTER;
        case 12: return "sepia(1) hue-rotate(290deg) saturate(3) brightness(0.9)";
        case 13: return "sepia(1) hue-rotate(2deg) saturate(0.74) brightness(1.16)";
        default: return "";
    }
}

function applyRankTextStyle(textEl, rankIndex) {
    if (!textEl) return;
    const safeRankIndex = normalizeRankIndex(rankIndex);
    textEl.style.color = "";
    textEl.style.background = "";
    textEl.style.backgroundSize = "";
    textEl.style.webkitBackgroundClip = "";
    textEl.style.backgroundClip = "";
    textEl.style.animation = "";
    textEl.style.animationDelay = "";

    if (safeRankIndex <= 0) {
        textEl.style.color = "#ffffff";
        return;
    }
    if (safeRankIndex === 11) {
        textEl.style.background = "linear-gradient(110deg, #FF6F00 20%, #FF8F00 40%, #FFA000 48%, #FFB300 50%, #FFA000 52%, #FF8F00 60%, #FF6F00 80%)";
        textEl.style.backgroundSize = "200% auto";
        textEl.style.webkitBackgroundClip = "text";
        textEl.style.backgroundClip = "text";
        textEl.style.color = "transparent";
        textEl.style.animation = "eternalShimmer 2.5s linear infinite";
        textEl.style.animationDelay = getShimmerAnimationDelay();
        return;
    }
    if (safeRankIndex === 12) {
        textEl.style.background = "linear-gradient(110deg, #D8007F 20%, #E91E63 35%, #F06292 45%, #FF80AB 50%, #F06292 55%, #E91E63 65%, #D8007F 80%)";
        textEl.style.backgroundSize = "200% auto";
        textEl.style.webkitBackgroundClip = "text";
        textEl.style.backgroundClip = "text";
        textEl.style.color = "transparent";
        textEl.style.animation = "eternalShimmer 2.5s linear infinite";
        textEl.style.animationDelay = getShimmerAnimationDelay();
        return;
    }
    if (safeRankIndex === 13) {
        textEl.style.background = "linear-gradient(110deg, #cab98a 20%, #e5d9b6 35%, #f2e9cf 48%, #fff7e5 50%, #f2e9cf 52%, #e5d9b6 65%, #cab98a 80%)";
        textEl.style.backgroundSize = "200% auto";
        textEl.style.webkitBackgroundClip = "text";
        textEl.style.backgroundClip = "text";
        textEl.style.color = "transparent";
        textEl.style.animation = "eternalShimmer 2.5s linear infinite";
        textEl.style.animationDelay = getShimmerAnimationDelay();
        return;
    }
    textEl.style.color = RANK_TEXT_COLORS[safeRankIndex] || "#ffffff";
}

function formatNumber(value) {
    return new Intl.NumberFormat(undefined, {
        maximumFractionDigits: 0
    }).format(Math.max(0, Number(value) || 0));
}

function resolveEntryName(entry) {
    return pickFirstString(
        safeObject(entry && entry.snapshot).username,
        safeObject(entry && entry.data).username,
        t("unknown_player")
    );
}

function resolveEntryFlag(entry) {
    const snapshot = safeObject(entry && entry.snapshot);
    const data = safeObject(entry && entry.data);
    const profile = safeObject(data.profile);
    return pickFirstString(snapshot.flag, profile.flag, data.flag).toLowerCase();
}

function resolveEntryAvatar(entry) {
    const snapshot = safeObject(entry && entry.snapshot);
    const data = safeObject(entry && entry.data);
    const profile = safeObject(data.profile);
    return pickFirstString(snapshot.pic, profile.pic, data.pic);
}

function resolveTrophyTotal(entry) {
    const trophies = safeObject(safeObject(safeObject(entry && entry.data).profile).trophies);
    return ["1st", "2nd", "3rd", "plaque"].reduce((sum, key) => {
        const count = Number(trophies[key]);
        return sum + (Number.isFinite(count) && count > 0 ? Math.floor(count) : 0);
    }, 0);
}

function getCurrentUserCountryFlag(userData = null) {
    const safeData = safeObject(userData);
    return pickFirstString(
        safeObject(safeData.profile).flag,
        safeData.flag
    ).toLowerCase();
}

function resolveMetricForPlatform(scoresByConfig, config) {
    const lookupKeys = getConfigLookupKeys(config);
    const matchedKey = lookupKeys.find((key) => Array.isArray(scoresByConfig[key]));
    const scoreArray = matchedKey ? scoresByConfig[matchedKey] : null;

    if (!Array.isArray(scoreArray)) {
        return {
            hasScores: false,
            totalScore: 0,
            totalRating: 0,
            rowScores: [],
            rowRatings: [],
            categoryValues: []
        };
    }

    const rowScores = scoreArray.map((value) => Number(value) || 0);
    const totalScore = rowScores.reduce((sum, value) => sum + value, 0);
    const baseScores = getScoreBaseForConfigKey(matchedKey || lookupKeys[0]);
    const rowRatings = rowScores.map((score, index) => {
        const base = Number(baseScores[index] ?? baseScores[0] ?? 0);
        const thresholds = buildThresholdsFromBase(base);
        let rating = calculateSingleRating(score, thresholds);
        const topThreshold = Number(thresholds[12]);
        if (Number.isFinite(topThreshold) && topThreshold > 0 && score > topThreshold) {
            const bonus = Math.round(((score - topThreshold) / topThreshold) * 100);
            rating = 1300 + bonus;
        }
        return rating;
    });
    const totalRating = calculateTotalRatingForScores(rowScores, baseScores);
    const categoryValues = getRadarCategoryValuesForRatings(rowRatings);
    return {
        hasScores: true,
        totalScore,
        totalRating,
        rowScores,
        rowRatings,
        categoryValues
    };
}

function isMetricBetter(candidate, currentBest) {
    const safeCandidate = candidate && typeof candidate === "object" ? candidate : {};
    const safeCurrentBest = currentBest && typeof currentBest === "object" ? currentBest : null;
    if (!safeCurrentBest) return true;
    if ((Number(safeCandidate.totalRating) || 0) !== (Number(safeCurrentBest.totalRating) || 0)) {
        return (Number(safeCandidate.totalRating) || 0) > (Number(safeCurrentBest.totalRating) || 0);
    }
    return (Number(safeCandidate.totalScore) || 0) > (Number(safeCurrentBest.totalScore) || 0);
}

function getRadarCategoryValuesForRatings(rowRatings = []) {
    return RADAR_CATEGORY_WEIGHTS.map((category) => {
        let sum = 0;
        let totalWeight = 0;
        category.weights.forEach(([index, weight]) => {
            sum += (Number(rowRatings[index]) || 0) * weight;
            totalWeight += weight;
        });
        return {
            label: category.name,
            value: totalWeight > 0 ? sum / totalWeight : 0
        };
    });
}

function resolveEntryMetric(entry, filters) {
    const data = safeObject(entry && entry.data);
    const scoresByConfig = ScoreManager.normalizeSavedScoresRecord(data.scores);
    const mount = normalizeMountConfig(filters.mount);
    const platforms = filters.platform === "all" ? CONFIG_OPTIONS.platform : [filters.platform];
    const times = filters.time === "all" ? CONFIG_OPTIONS.time : [filters.time];

    let totalScore = 0;
    let totalRating = 0;
    let hasScores = false;
    const topBaddyValues = RADAR_CATEGORY_WEIGHTS.map(() => 0);

    times.forEach((time) => {
        let bestMetric = {
            hasScores: false,
            totalScore: 0,
            totalRating: 0,
            rowScores: [],
            rowRatings: [],
            categoryValues: []
        };

        platforms.forEach((platform) => {
            const metric = resolveMetricForPlatform(scoresByConfig, {
                platform,
                time,
                stat: filters.stat,
                mount
            });
            if (isMetricBetter(metric, bestMetric)) {
                bestMetric = metric;
            }
        });

        totalScore += bestMetric.totalScore;
        totalRating += bestMetric.totalRating;
        hasScores = hasScores || bestMetric.hasScores;
        bestMetric.categoryValues.forEach((category, index) => {
            topBaddyValues[index] += Number(category && category.value) || 0;
        });
    });

    const hasTopBaddyData = topBaddyValues.some((value) => value > 0);
    let topBaddyLabel = "";
    let topBaddyValue = 0;
    if (hasTopBaddyData) {
        RADAR_CATEGORY_WEIGHTS.forEach((category, index) => {
            const value = Number(topBaddyValues[index]) || 0;
            if (value > topBaddyValue) {
                topBaddyValue = value;
                topBaddyLabel = category.name;
            }
        });
    }

    return {
        hasScores,
        totalScore,
        totalRating,
        topBaddyName: topBaddyLabel || "--",
        topBaddyIconUrl: TOP_BADDY_ICON_URLS[topBaddyLabel] || "",
        topBaddyScore: topBaddyValue
    };
}

function resolveEntryViewConfig(entry, filters) {
    const data = safeObject(entry && entry.data);
    const scoresByConfig = ScoreManager.normalizeSavedScoresRecord(data.scores);
    const mount = normalizeMountConfig(filters && filters.mount);
    const platforms = filters && filters.platform === "all" ? CONFIG_OPTIONS.platform : [pickFirstString(filters && filters.platform, CONFIG_OPTIONS.platform[0])];
    const times = filters && filters.time === "all" ? CONFIG_OPTIONS.time : [pickFirstString(filters && filters.time, CONFIG_OPTIONS.time[0])];
    const stat = pickFirstString(filters && filters.stat, CONFIG_OPTIONS.stat[0]);

    let bestMetric = null;
    let bestConfig = {
        platform: platforms[0] || CONFIG_OPTIONS.platform[0] || "Mobile",
        time: times[0] || CONFIG_OPTIONS.time[0] || "5 Min",
        stat,
        mount
    };

    times.forEach((time) => {
        platforms.forEach((platform) => {
            const metric = resolveMetricForPlatform(scoresByConfig, {
                platform,
                time,
                stat,
                mount
            });
            if (isMetricBetter(metric, bestMetric)) {
                bestMetric = metric;
                bestConfig = {
                    platform,
                    time,
                    stat,
                    mount
                };
            }
        });
    });

    return bestConfig;
}

function createEmptyState(message) {
    const stateEl = document.createElement("div");
    stateEl.className = "leaderboard-empty-state";
    stateEl.textContent = message;
    return stateEl;
}

function waitForNextPaint() {
    if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") {
        return Promise.resolve();
    }
    return new Promise((resolve) => {
        window.requestAnimationFrame(() => {
            window.requestAnimationFrame(resolve);
        });
    });
}

function createRowMetricCell(value, extraClass = "") {
    const cell = document.createElement("div");
    cell.className = `leaderboard-cell leaderboard-value-cell ${extraClass}`.trim();

    const valueEl = document.createElement("span");
    valueEl.className = "leaderboard-value-text";
    valueEl.textContent = value;

    cell.appendChild(valueEl);
    return cell;
}

function createTopBaddyCell(metric = {}) {
    const cell = document.createElement("div");
    cell.className = "leaderboard-cell leaderboard-value-cell leaderboard-baddy-cell";

    const iconUrl = pickFirstString(metric.topBaddyIconUrl);
    if (iconUrl) {
        const shell = document.createElement("span");
        shell.className = "leaderboard-baddy-icon-shell";
        const icon = document.createElement("img");
        icon.className = "leaderboard-baddy-icon";
        icon.src = iconUrl;
        icon.alt = pickFirstString(metric.topBaddyName, t("leaderboard_top_baddy"));
        icon.title = pickFirstString(metric.topBaddyName);
        icon.dataset.baddy = pickFirstString(metric.topBaddyName).toLowerCase().replace(/\s+/g, "-");
        shell.appendChild(icon);
        cell.appendChild(shell);
        return cell;
    }

    const placeholder = document.createElement("span");
    placeholder.className = "leaderboard-value-text";
    placeholder.textContent = "--";
    cell.appendChild(placeholder);
    return cell;
}

function buildCurrentUserEntry(currentUserData = null) {
    const currentUid = pickFirstString(auth && auth.currentUser ? auth.currentUser.uid : "");
    if (!currentUid) return null;
    return {
        kind: "self",
        id: `self__${currentUid}`,
        uid: currentUid,
        snapshot: buildSnapshotFromUserData(currentUserData || {}, { uid: currentUid }),
        data: safeObject(currentUserData),
        createdAt: 0,
        updatedAt: 0,
        raw: null
    };
}

function clampPage(page, totalItems) {
    const pageCount = Math.max(1, Math.ceil(totalItems / LEADERBOARD_PAGE_SIZE));
    const parsed = Number.isFinite(page) ? Math.floor(page) : 0;
    return Math.max(0, Math.min(pageCount - 1, parsed));
}

export function createFriendsLeaderboardUI(options = {}) {
    const elements = {
        list: options.listEl || getCachedElementById("leaderboardList"),
        pageIndicator: options.pageIndicatorEl || getCachedElementById("leaderboardPageIndicator"),
        prevButton: options.prevButton || getCachedElementById("leaderboardPrevPageBtn"),
        nextButton: options.nextButton || getCachedElementById("leaderboardNextPageBtn"),
        scopeFilter: options.scopeFilter || getCachedElementById("leaderboardScopeFilter"),
        platformFilter: options.platformFilter || getCachedElementById("leaderboardPlatformFilter"),
        timeFilter: options.timeFilter || getCachedElementById("leaderboardTimeFilter"),
        statFilter: options.statFilter || getCachedElementById("leaderboardStatFilter"),
        mountFilter: options.mountFilter || getCachedElementById("leaderboardMountFilter")
    };

    const state = {
        filters: { ...DEFAULT_FILTERS },
        page: 0,
        entries: [],
        currentUserFlag: "",
        bound: false
    };
    const onSelectEntry = typeof options.onSelectEntry === "function"
        ? options.onSelectEntry
        : null;

    function resetListViewport() {
        if (elements.list) {
            elements.list.scrollTop = 0;
        }
        const tableScroll = elements.list && elements.list.closest
            ? elements.list.closest(".leaderboard-table-scroll")
            : null;
        if (tableScroll) {
            tableScroll.scrollLeft = 0;
            tableScroll.scrollTop = 0;
        }
    }

    function setListStateMode(active) {
        if (!elements.list) return;
        elements.list.classList.toggle("leaderboard-list--state-mode", !!active);
        const tableTrack = elements.list.closest && typeof elements.list.closest === "function"
            ? elements.list.closest(".leaderboard-table-track")
            : null;
        if (tableTrack) {
            tableTrack.classList.toggle("leaderboard-table-track--state-mode", !!active);
        }
    }

    function renderState(message) {
        if (!elements.list) return;
        elements.list.innerHTML = "";
        setListStateMode(true);
        elements.list.appendChild(createEmptyState(message));
    }

    function syncFilterControls() {
        if (elements.scopeFilter) elements.scopeFilter.value = state.filters.scope;
        if (elements.platformFilter) elements.platformFilter.value = state.filters.platform;
        if (elements.timeFilter) elements.timeFilter.value = state.filters.time;
        if (elements.statFilter) elements.statFilter.value = state.filters.stat;
        if (elements.mountFilter) elements.mountFilter.value = state.filters.mount;
    }

    function bindControls() {
        if (state.bound) return;
        state.bound = true;

        const handleFilterChange = () => {
            state.filters = {
                scope: elements.scopeFilter ? elements.scopeFilter.value : DEFAULT_FILTERS.scope,
                platform: elements.platformFilter ? elements.platformFilter.value : DEFAULT_FILTERS.platform,
                time: elements.timeFilter ? elements.timeFilter.value : DEFAULT_FILTERS.time,
                stat: elements.statFilter ? elements.statFilter.value : DEFAULT_FILTERS.stat,
                mount: normalizeMountConfig(elements.mountFilter ? elements.mountFilter.value : DEFAULT_FILTERS.mount)
            };
            state.page = 0;
            render();
        };

        [elements.scopeFilter, elements.platformFilter, elements.timeFilter, elements.statFilter, elements.mountFilter]
            .filter(Boolean)
            .forEach((element) => {
                element.addEventListener("change", handleFilterChange);
            });

        if (elements.prevButton) {
            elements.prevButton.addEventListener("click", () => {
                state.page = clampPage(state.page - 1, getProcessedEntries().length);
                render();
            });
        }

        if (elements.nextButton) {
            elements.nextButton.addEventListener("click", () => {
                state.page = clampPage(state.page + 1, getProcessedEntries().length);
                render();
            });
        }
    }

    function getProcessedEntries() {
        const normalizedUserFlag = String(state.currentUserFlag || "").trim().toLowerCase();
        const scopedEntries = state.filters.scope === "country" && normalizedUserFlag
            ? state.entries.filter((entry) => resolveEntryFlag(entry) === normalizedUserFlag)
            : [...state.entries];

        return scopedEntries
            .map((entry) => {
                const metric = resolveEntryMetric(entry, state.filters);
                const rankIndex = resolveLeaderboardRankIndex(metric.totalRating);
                return {
                    entry,
                    name: resolveEntryName(entry),
                    flagCode: resolveEntryFlag(entry),
                    avatarUrl: resolveEntryAvatar(entry),
                    rankIndex,
                    rankText: resolveLeaderboardRankText(metric.totalRating, rankIndex),
                    trophyTotal: resolveTrophyTotal(entry),
                    metric
                };
            })
            .sort((left, right) => {
                if (right.metric.totalRating !== left.metric.totalRating) {
                    return right.metric.totalRating - left.metric.totalRating;
                }
                if (right.metric.totalScore !== left.metric.totalScore) {
                    return right.metric.totalScore - left.metric.totalScore;
                }
                if (right.rankIndex !== left.rankIndex) {
                    return right.rankIndex - left.rankIndex;
                }
                if (right.trophyTotal !== left.trophyTotal) {
                    return right.trophyTotal - left.trophyTotal;
                }
                return left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
            });
    }

    function renderPagination(totalItems, pageEntriesLength) {
        const currentPage = clampPage(state.page, totalItems);
        state.page = currentPage;

        const pageStart = pageEntriesLength ? (currentPage * LEADERBOARD_PAGE_SIZE) + 1 : 0;
        const pageEnd = pageEntriesLength ? pageStart + pageEntriesLength - 1 : 0;
        if (elements.pageIndicator) {
            elements.pageIndicator.textContent = totalItems
                ? `${pageStart}-${pageEnd} / ${formatNumber(totalItems)}`
                : "0";
        }

        if (elements.prevButton) {
            elements.prevButton.disabled = currentPage <= 0;
        }
        if (elements.nextButton) {
            elements.nextButton.disabled = pageEnd >= totalItems;
        }
    }

    function renderRows(pageEntries) {
        if (!elements.list) return;
        elements.list.innerHTML = "";
        setListStateMode(false);

        pageEntries.forEach((item, index) => {
            const row = document.createElement("div");
            row.className = "leaderboard-row";
            if (onSelectEntry) {
                row.classList.add("leaderboard-row--interactive");
                row.tabIndex = 0;
                row.setAttribute("role", "button");
            }

            const absoluteRank = (state.page * LEADERBOARD_PAGE_SIZE) + index + 1;
            const positionCell = document.createElement("div");
            positionCell.className = "leaderboard-cell leaderboard-position-cell";
            const positionText = document.createElement("span");
            positionText.className = "leaderboard-position-text";
            if (absoluteRank === 1) positionText.classList.add("is-first");
            if (absoluteRank === 2) positionText.classList.add("is-second");
            if (absoluteRank === 3) positionText.classList.add("is-third");
            const positionHash = document.createElement("span");
            positionHash.className = "leaderboard-position-hash";
            positionHash.textContent = "#";
            const positionNumber = document.createElement("span");
            positionNumber.className = "leaderboard-position-number";
            positionNumber.textContent = formatNumber(absoluteRank);
            positionText.appendChild(positionHash);
            positionText.appendChild(positionNumber);
            positionCell.appendChild(positionText);
            row.appendChild(positionCell);

            const playerCell = document.createElement("div");
            playerCell.className = "leaderboard-cell leaderboard-player-cell";

            const avatar = document.createElement("div");
            avatar.className = "leaderboard-avatar";
            if (item.avatarUrl) {
                avatar.style.backgroundImage = `url(${item.avatarUrl})`;
            } else if (item.flagCode) {
                avatar.style.backgroundImage = `url(${getFlagUrl(item.flagCode)})`;
            } else {
                avatar.textContent = (item.name || "?").charAt(0).toUpperCase();
            }
            playerCell.appendChild(avatar);

            const copy = document.createElement("div");
            copy.className = "leaderboard-player-copy";

            const nameRow = document.createElement("div");
            nameRow.className = "leaderboard-player-name-row";

            const nameEl = document.createElement("div");
            nameEl.className = "leaderboard-player-name";
            nameEl.textContent = item.name;
            nameRow.appendChild(nameEl);

            if (item.flagCode) {
                const flagEl = document.createElement("span");
                flagEl.className = "leaderboard-inline-flag";
                flagEl.style.backgroundImage = `url(${getFlagUrl(item.flagCode)})`;
                flagEl.setAttribute("aria-hidden", "true");
                nameRow.appendChild(flagEl);
            }

            copy.appendChild(nameRow);
            playerCell.appendChild(copy);
            row.appendChild(playerCell);

            const rankCell = document.createElement("div");
            rankCell.className = "leaderboard-cell leaderboard-rank-cell";
            const rankIconShell = document.createElement("span");
            rankIconShell.className = "leaderboard-rank-icon-shell";
            if (item.rankIndex <= 0) {
                rankCell.classList.add("is-unranked");
                rankIconShell.classList.add("is-empty");
            }

            const rankMeta = document.createElement("div");
            rankMeta.className = "leaderboard-rank-meta";

            const ratingValue = document.createElement("span");
            ratingValue.className = "leaderboard-rank-rating";
            ratingValue.textContent = formatNumber(item.metric.totalRating);
            applyRankTextStyle(ratingValue, item.rankIndex);

            const rankText = document.createElement("span");
            rankText.className = "leaderboard-rank-text";
            rankText.innerHTML = item.rankText;
            applyRankTextStyle(rankText, item.rankIndex);
            if (item.rankIndex > 0) {
                const rankIcon = document.createElement("img");
                rankIcon.className = "leaderboard-rank-icon";
                rankIcon.src = TROPHY_ICON_URL;
                rankIcon.alt = "";
                rankIcon.setAttribute("aria-hidden", "true");
                const trophyFilter = getRankTrophyFilter(item.rankIndex);
                if (trophyFilter) rankIcon.style.filter = trophyFilter;
                rankIconShell.appendChild(rankIcon);
            }
            rankMeta.appendChild(ratingValue);
            rankMeta.appendChild(rankText);
            rankCell.appendChild(rankMeta);
            rankCell.appendChild(rankIconShell);
            row.appendChild(rankCell);

            if (onSelectEntry) {
                const handleSelect = () => {
                    onSelectEntry({
                        entry: item.entry,
                        filters: { ...state.filters },
                        viewConfig: resolveEntryViewConfig(item.entry, state.filters)
                    });
                };
                row.addEventListener("click", handleSelect);
                row.addEventListener("keydown", (event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    handleSelect();
                });
            }

            elements.list.appendChild(row);
        });
    }

    function render() {
        bindControls();
        syncFilterControls();

        const processedEntries = getProcessedEntries();
        const needsCountryFlag = state.filters.scope === "country" && !state.currentUserFlag;
        const currentPage = clampPage(state.page, processedEntries.length);
        state.page = currentPage;

        if (!elements.list) return;

        if (!auth.currentUser) {
            renderState(t("leaderboard_empty_sign_in"));
            renderPagination(0, 0);
            return;
        }

        if (!state.entries.length) {
            renderState(t("leaderboard_empty_no_friends"));
            renderPagination(0, 0);
            return;
        }

        if (needsCountryFlag) {
            renderState(t("leaderboard_empty_country_flag"));
            renderPagination(0, 0);
            return;
        }

        if (!processedEntries.length) {
            renderState(
                state.filters.scope === "country"
                    ? t("leaderboard_empty_country_matches")
                    : t("leaderboard_empty_scores")
            );
            renderPagination(0, 0);
            return;
        }

        const startIndex = currentPage * LEADERBOARD_PAGE_SIZE;
        const pageEntries = processedEntries.slice(startIndex, startIndex + LEADERBOARD_PAGE_SIZE);
        renderRows(pageEntries);
        renderPagination(processedEntries.length, pageEntries.length);
    }

    async function refresh() {
        bindControls();
        syncFilterControls();

        if (!elements.list) return;
        resetListViewport();
        renderState(t("leaderboard_loading"));
        await waitForNextPaint();

        if (!auth.currentUser) {
            state.entries = [];
            state.currentUserFlag = "";
            render();
            return;
        }

        const [entries, currentUserData] = await Promise.all([
            loadHydratedFriendEntries(auth.currentUser.uid),
            readCurrentUserData()
        ]);

        const nextEntries = [];
        const seenUids = new Set();
        const currentUserEntry = buildCurrentUserEntry(currentUserData);
        [currentUserEntry, ...(Array.isArray(entries) ? entries : [])].forEach((entry) => {
            const uid = pickFirstString(safeObject(entry).uid);
            if (!uid || seenUids.has(uid)) return;
            seenUids.add(uid);
            nextEntries.push(entry);
        });

        state.entries = nextEntries;
        state.currentUserFlag = getCurrentUserCountryFlag(currentUserData);
        render();
    }

    return {
        refresh,
        render
    };
}
