import { state, getCurrentConfigState } from "./appState.js";
import { getRadarCategoryValues } from "./radarData.js";
import { calculateSingleRating } from "./scoring.js";
import { FINAL_RANK_INDEX, RANK_COLORS, SCORE_TEXT_COLORS } from "./constants.js";
import { darkenColor } from "./utils/colorUtils.js";

function readText(selector) {
    const el = document.querySelector(selector);
    return el ? (el.textContent || "").trim() : "";
}

function readCssVar(name, fallback = "") {
    const rootStyles = getComputedStyle(document.documentElement);
    const bodyStyles = getComputedStyle(document.body);
    return rootStyles.getPropertyValue(name).trim()
        || bodyStyles.getPropertyValue(name).trim()
        || fallback;
}

function getFlagImageUrl() {
    const flagEl = document.querySelector(".nationality-flag");
    if (!flagEl) return "";
    const bg = getComputedStyle(flagEl).backgroundImage || "";
    const match = bg.match(/url\(["']?(.*?)["']?\)/i);
    return match ? match[1] : "";
}

function getBackgroundImageUrl(selector) {
    const el = document.querySelector(selector);
    if (!el) return "";
    const bg = getComputedStyle(el).backgroundImage || "";
    const match = bg.match(/url\(["']?(.*?)["']?\)/i);
    return match ? match[1] : "";
}

function getMountImageUrl() {
    const mountEl = document.querySelector("#mountConfigImage");
    if (!mountEl) return "";
    return mountEl.currentSrc || mountEl.src || "";
}

function getMountLabel() {
    const mountEl = document.querySelector("#mountConfigImage");
    return mountEl ? (mountEl.alt || "").trim() : "";
}

function collectTrophies() {
    const list = document.querySelector("#trophyList");
    const placeholder = document.querySelector("#trophyPlaceholder");
    const headerTitle = list ? (list.querySelector(".seasonal-label")?.textContent || "").trim() : "";
    const headerTotal = list ? (list.querySelector(".seasonal-total")?.textContent || "").trim() : "";
    const items = list
        ? Array.from(list.querySelectorAll(".trophy-card")).map((card) => {
            const img = card.querySelector(".trophy-img");
            return {
                imageUrl: img?.currentSrc || img?.src || "",
                label: (card.querySelector(".trophy-card-label")?.textContent || "").trim(),
                count: (card.querySelector(".trophy-card-count")?.textContent || "").trim()
            };
        }).filter((item) => item.imageUrl || item.label || item.count)
        : [];

    return {
        title: headerTitle,
        total: headerTotal,
        emptyLabel: placeholder ? (placeholder.textContent || "").trim() : "+ Add Seasonal Placements",
        items
    };
}

function collectRankThresholds() {
    return Array.from(document.querySelectorAll(".ranks-labels .rank-item")).map((item) => ({
        name: (item.querySelector(".rank-name")?.textContent || "").trim(),
        threshold: (item.querySelector(".rank-number")?.textContent || "").trim()
    }));
}

function getRowProgressValue(score, thresholds) {
    if (!Array.isArray(thresholds) || thresholds.length < FINAL_RANK_INDEX) return 0;
    const rating = calculateSingleRating(score, thresholds);
    return Math.max(0, rating / 100);
}

function getRowFillColor(progressValue) {
    if (!(progressValue > 0)) return "";
    const colorIndex = Math.max(1, Math.min(FINAL_RANK_INDEX, Math.floor(progressValue)));
    return RANK_COLORS[colorIndex] || "";
}

function collectRows() {
    const scoreInputs = Array.from(document.querySelectorAll(".score-input"));
    const ratingValues = Array.from(document.querySelectorAll(".rating-value"));

    return Array.from(document.querySelectorAll(".ranks-bars")).map((row, index) => {
        const label = row.querySelector(".cave-cell-name");
        const image = row.querySelector(".cave-cell-content img");
        const youtube = row.querySelector(".cave-play-wrapper");
        const rowThresholds = Array.from(row.querySelectorAll(".rank-bar"))
            .slice(2)
            .map((cell) => (cell.textContent || "").trim())
            .filter(Boolean);
        const score = Number(scoreInputs[index]?.value || 0);
        const thresholdNumbers = rowThresholds.map((threshold) => Number(String(threshold).replace(/[^\d.-]/g, "")));
        const progressValue = getRowProgressValue(score, thresholdNumbers);
        const rankIndex = progressValue > 0
            ? Math.min(FINAL_RANK_INDEX, Math.floor(progressValue))
            : 0;
        const fillColor = getRowFillColor(progressValue);
        return {
            index,
            cave: label ? (label.textContent || "").trim() : `Cave ${index + 1}`,
            score,
            rating: (ratingValues[index]?.textContent || "").trim(),
            imageUrl: image?.currentSrc || image?.src || "",
            hasYoutube: !!(youtube && youtube.dataset.youtube),
            thresholds: rowThresholds,
            rankIndex,
            progressValue,
            fillColor,
            scoreTextColor: rankIndex > 0 ? (SCORE_TEXT_COLORS[rankIndex] || "#ffffff") : "#ffffff",
            scoreBg: rankIndex > 0 ? darkenColor(RANK_COLORS[rankIndex], 0.6) : "",
            scoreAccent: rankIndex > 0 ? darkenColor(RANK_COLORS[rankIndex], 0.28) : ""
        };
    });
}

function collectRadarList(selector) {
    return Array.from(document.querySelectorAll(selector)).map((item) => {
        const label = item.childNodes && item.childNodes.length
            ? String(item.childNodes[0].textContent || "").trim()
            : "";
        const valueEl = item.querySelector(".radar-stat-value");
        return {
            label,
            value: (valueEl?.textContent || "").trim()
        };
    });
}

function getCanvasImageDataUrl(canvasId, maxWidth = 820, maxHeight = 420) {
    const sourceCanvas = document.getElementById(canvasId);
    if (!(sourceCanvas instanceof HTMLCanvasElement)) return "";

    const sourceWidth = sourceCanvas.width || sourceCanvas.clientWidth || 0;
    const sourceHeight = sourceCanvas.height || sourceCanvas.clientHeight || 0;
    if (!(sourceWidth > 0 && sourceHeight > 0)) return "";

    const scale = Math.min(1, maxWidth / sourceWidth, maxHeight / sourceHeight);
    const targetWidth = Math.max(1, Math.round(sourceWidth * scale));
    const targetHeight = Math.max(1, Math.round(sourceHeight * scale));

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = targetWidth;
    exportCanvas.height = targetHeight;

    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return "";
    ctx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);

    try {
        const webp = exportCanvas.toDataURL("image/webp", 0.82);
        if (webp.startsWith("data:image/webp")) return webp;
        const jpeg = exportCanvas.toDataURL("image/jpeg", 0.84);
        if (jpeg.startsWith("data:image/jpeg")) return jpeg;
        return exportCanvas.toDataURL("image/png");
    } catch {
        return "";
    }
}

export function getShareServiceBaseUrl() {
    const globalValue = typeof window !== "undefined"
        ? (window.__BENCHMARK_SHARE_SERVICE_URL__ || "")
        : "";
    const normalized = String(globalValue || "").trim().replace(/\/+$/g, "");
    if (!normalized || typeof window === "undefined") return normalized;

    try {
        const url = new URL(normalized, window.location.href);
        const pageHost = String(window.location.hostname || "").trim();
        const isServiceLocalHost = /^(localhost|127\.0\.0\.1|\[::1\])$/i.test(url.hostname);
        const isPageLocalHost = /^(localhost|127\.0\.0\.1|\[::1\])$/i.test(pageHost);

        if (isServiceLocalHost && pageHost && !isPageLocalHost) {
            url.hostname = pageHost;
        }

        return url.toString().replace(/\/+$/g, "");
    } catch {
        return normalized;
    }
}

function withPort(urlString, nextPort) {
    try {
        const url = new URL(urlString);
        url.port = String(nextPort);
        return url.toString().replace(/\/+$/g, "");
    } catch {
        return "";
    }
}

function getShareServiceCandidateBaseUrls() {
    const baseUrl = getShareServiceBaseUrl();
    if (!baseUrl) return [];

    const candidates = [baseUrl];
    if (typeof window === "undefined") return candidates;

    try {
        const url = new URL(baseUrl, window.location.href);
        const isLocalHost = /^(localhost|127\.0\.0\.1|\[::1\])$/i.test(url.hostname);
        const port = String(url.port || "");

        if (isLocalHost && port === "3000") {
            const fallbackUrl = withPort(url.toString(), 3001);
            if (fallbackUrl && !candidates.includes(fallbackUrl)) {
                candidates.push(fallbackUrl);
            }
        }
    } catch {
        return candidates;
    }

    return candidates;
}

export function hasShareServiceConfigured() {
    return !!getShareServiceBaseUrl();
}

export async function buildShareServiceSnapshot() {
    const config = getCurrentConfigState() || {};
    const progressLabel = readText(".progress-value-label");
    const strongest = collectRadarList("#radarStrongList .radar-stat-item");
    const weakest = collectRadarList("#radarWeakList .radar-stat-item");
    const categoryValues = getRadarCategoryValues(state.radarMode).map((item) => ({
        label: item.label,
        value: Math.round(Number(item.value) || 0)
    }));
    const trophies = collectTrophies();
    const radarImages = {
        main: getCanvasImageDataUrl("radarCanvas", 760, 380),
        donut: getCanvasImageDataUrl("radarDonut", 420, 380),
        bar: getCanvasImageDataUrl("radarBar", 760, 380)
    };
    return {
        version: 1,
        generatedAt: Date.now(),
        profile: {
            name: readText(".profile-name") || "Player",
            guild: readText(".guild-name"),
            views: readText("#viewCount"),
            achievements: readText(".achievements-text"),
            achievementsPercent: readText(".achievements-percent"),
            currentRank: readText(".rounded-inner-box"),
            progressLabel,
            flagUrl: getFlagImageUrl(),
            profileImageUrl: getBackgroundImageUrl(".profile-circle"),
            noPicHasFlag: !!document.querySelector(".profile-circle.no-pic-has-flag"),
            userMenuName: readText("#userMenuUsername") || readText(".profile-name") || "Player",
            trophiesTitle: trophies.title,
            trophiesTotal: trophies.total,
            trophiesEmptyLabel: trophies.emptyLabel,
            trophies: trophies.items
        },
        config: {
            platform: config.platform || "Mobile",
            time: config.time || "5 Min",
            stat: config.stat || "Baddy Kills",
            mount: config.mount || "mountspeed1",
            mountLabel: getMountLabel(),
            mountImageUrl: getMountImageUrl()
        },
        theme: {
            panelBg: readCssVar("--panel-bg", "#170700"),
            panelBorder: readCssVar("--panel-border", "rgba(255,255,255,0.16)"),
            accent: readCssVar("--accent-color", "#f5c645"),
            text: readCssVar("--text-primary", "#f6eee7"),
            muted: readCssVar("--text-secondary", "#c9b2a0"),
            appBg: readCssVar("--app-bg", "#050505"),
            configBoxBg: readCssVar("--config-box-bg", "rgba(255,255,255,0.03)"),
            configBoxBorder: readCssVar("--config-box-border", "rgba(255,255,255,0.05)"),
            slantedBarBase: readCssVar("--slanted-bar-base", "rgba(0,0,0,0.55)"),
            caveBoxBase: readCssVar("--cave-box-base", "rgba(255,255,255,0.02)"),
            progressSpan: readCssVar("--progress-span", "1014px"),
            progressionWidth: readCssVar("--progression-width", "1014px"),
            progressionRight: readCssVar("--progression-right", "70px"),
            ranksWrapperWidth: readCssVar("--ranks-wrapper-width", "540px"),
            caveBoxWidth: readCssVar("--cave-box-width", "300px"),
            caveBoxOffset: readCssVar("--cave-box-offset", "124px")
        },
        ranks: collectRankThresholds(),
        rows: collectRows(),
        strongest,
        weakest,
        radarMode: state.radarMode || "combined",
        radarCategories: categoryValues,
        radarImages
    };
}

export async function requestShareServicePreviewUrl(snapshot = null) {
    const candidateBaseUrls = getShareServiceCandidateBaseUrls();
    if (!candidateBaseUrls.length) return "";
    const payloadSnapshot = snapshot || await buildShareServiceSnapshot();
    let lastError = null;

    for (const baseUrl of candidateBaseUrls) {
        try {
            const response = await fetch(`${baseUrl}/api/share-snapshot`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payloadSnapshot),
                mode: "cors",
                cache: "no-store"
            });

            if (!response.ok) {
                throw new Error(`Share service request failed (${response.status})`);
            }

            const payload = await response.json();
            const imageUrl = payload && typeof payload.imageUrl === "string"
                ? payload.imageUrl.trim()
                : "";

            if (!imageUrl) {
                throw new Error("Share service returned an empty image URL.");
            }

            return imageUrl;
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError || new Error("Share service request failed.");
}
