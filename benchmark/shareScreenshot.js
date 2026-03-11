import { isMobileViewport } from "./utils.js";
import { getCachedElementById, getCachedQuery } from "./utils/domUtils.js";
import { STELLAR_TROPHY_FILTER } from "./constants.js";
import { t } from "./i18n.js";
import {
    DESKTOP_SCREENSHOT_WIDTH_PX,
    DESKTOP_CAPTURE_OVERRIDE_CSS,
    createScreenshotOverrideStyle
} from "./shareScreenshotStyles.js";

const SCREENSHOT_PLAY_ICON_PATH = "M21.582,6.186c-0.23-0.86-0.908-1.538-1.768-1.768C18.254,4,12,4,12,4S5.746,4,4.186,4.418 c-0.86,0.23-1.538,0.908-1.768,1.768C2,7.746,2,12,2,12s0,4.254,0.418,5.814c0.23,0.86,0.908,1.538,1.768,1.768 C5.746,20,12,20,12,20s6.254,0,7.814-0.418c0.861-0.23,1.538-0.908,1.768-1.768C22,16.254,22,12,22,12S22,7.746,21.582,6.186z M10,15.464V8.536L16,12L10,15.464z";

const CAPTURE_SCALE = 1;
const SHARE_SCREENSHOT_OUTER_PADDING_PX = 28;
const DESKTOP_CAPTURE_ATTEMPTS = [
    { width: DESKTOP_SCREENSHOT_WIDTH_PX, quality: 0.84, timeoutMs: 12000 },
    { width: 1440, quality: 0.8, timeoutMs: 9000 },
    { width: 1366, quality: 0.76, timeoutMs: 8000 }
];
const MOBILE_CAPTURE_ATTEMPTS = [
    { width: 980, quality: 0.72, timeoutMs: 18000 },
    { width: 920, quality: 0.68, timeoutMs: 14000 },
    { width: 860, quality: 0.64, timeoutMs: 11000 }
];
const HIDE_CLASS_NAMES = new Set([
    "share-modal-overlay",
    "benchmark-footer",
    "trophy-placeholder",
    "page-loader"
]);
const HIDE_IDS = new Set([
    "shareModal",
    "rulesModal",
    "settingsModal",
    "trophyModal",
    "profileModal",
    "friendsModal",
    "imageViewerModal",
    "flagModal",
    "achievementsModal",
    "reauthModal",
    "emailReloginModal",
    "verificationModal",
    "confirmModal"
]);
const TRANSFORM_RESET_SELECTORS = [".cave-text", ".score-text", ".progression-text", ".rating-text", ".bg-stripe"];
const LIVE_CANVAS_IDS = ["radarCanvas", "radarDonut", "radarBar"];

function applyImportantStyles(element, styles) {
    if (!element || !styles) return;
    Object.entries(styles).forEach(([property, value]) => {
        element.style.setProperty(property, value, "important");
    });
}

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(t("share_preview_image_load_failed")));
        img.src = src;
    });
}

function createLockedScreenshotPlayIcon(doc, hasLink) {
    const svg = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "cave-play-icon");
    svg.setAttribute("viewBox", "0 0 24 24");

    const path = doc.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", SCREENSHOT_PLAY_ICON_PATH);
    svg.appendChild(path);

    applyImportantStyles(svg, {
        display: "block",
        width: "18px",
        height: "18px",
        margin: "0",
        position: "static",
        transform: "none",
        opacity: hasLink ? "1" : "0.7",
        stroke: hasLink ? "#f5c645" : "#e0e0e0",
        fill: "none",
        filter: hasLink ? "drop-shadow(0 0 6px rgba(245, 198, 69, 0.35))" : "none"
    });

    return svg;
}

function normalizeCaveLabelForScreenshot(doc, caveBar) {
    if (!doc || !caveBar) return;

    const existingLock = caveBar.querySelector(".screenshot-cave-play-lock");
    if (existingLock) existingLock.remove();
    const existingLabelContent = caveBar.querySelector(".screenshot-cave-label-content");
    if (existingLabelContent) existingLabelContent.remove();

    caveBar.querySelectorAll(".cave-play-edit, .cave-play-panel, .cave-play-overlay").forEach((el) => el.remove());

    const sourceWrapper = caveBar.querySelector(".cave-play-wrapper");
    const hasLink = !!(
        (sourceWrapper && typeof sourceWrapper.dataset.youtube === "string" && sourceWrapper.dataset.youtube.trim())
        || (sourceWrapper && sourceWrapper.classList.contains("has-link"))
    );

    if (sourceWrapper) {
        const sourceAnchor = sourceWrapper.querySelector(".cave-play-anchor") || sourceWrapper;
        const sourceIcon = sourceWrapper.querySelector(".cave-play-icon");
        applyImportantStyles(caveBar, {
            position: "absolute",
            "box-sizing": "border-box",
            display: "flex",
            "align-items": "center",
            gap: "0"
        });
        applyImportantStyles(sourceWrapper, {
            position: "static",
            display: "inline-flex",
            "align-items": "center",
            "margin-left": "auto",
            "margin-right": "0",
            padding: "0",
            flex: "0 0 auto",
            "z-index": "4"
        });
        applyImportantStyles(sourceAnchor, {
            position: "static",
            display: "inline-flex",
            "align-items": "center",
            "justify-content": "center",
            width: "30px",
            height: "30px",
            padding: "0",
            margin: "0",
            border: "none",
            background: "transparent"
        });
        if (sourceIcon) {
            applyImportantStyles(sourceIcon, {
                display: "block",
                width: "18px",
                height: "18px",
                margin: "0",
                position: "static",
                transform: "none",
                opacity: hasLink ? "1" : "0.7",
                stroke: hasLink ? "#f5c645" : "#e0e0e0",
                fill: "none",
                filter: hasLink ? "drop-shadow(0 0 6px rgba(245, 198, 69, 0.35))" : "none"
            });
        }
        return;
    }

    caveBar.querySelectorAll(".cave-play-icon").forEach((icon) => icon.remove());

    const labelContent = doc.createElement("span");
    labelContent.className = "screenshot-cave-label-content";
    applyImportantStyles(labelContent, {
        display: "flex",
        "align-items": "center",
        gap: "5px",
        "min-width": "0",
        width: "100%",
        "max-width": "none",
        overflow: "hidden",
        "white-space": "nowrap",
        "text-overflow": "ellipsis",
        "padding-right": "0"
    });

    Array.from(caveBar.childNodes).forEach((node) => {
        labelContent.appendChild(node);
    });

    const lock = doc.createElement("span");
    lock.className = "screenshot-cave-play-lock";
    applyImportantStyles(lock, {
        position: "static",
        display: "inline-flex",
        "align-items": "center",
        "justify-content": "center",
        width: "18px",
        height: "18px",
        margin: "0",
        padding: "0",
        "pointer-events": "none",
        "z-index": "4",
        "justify-self": "end"
    });
    lock.appendChild(createLockedScreenshotPlayIcon(doc, hasLink));

    applyImportantStyles(caveBar, {
        position: "absolute",
        "box-sizing": "border-box",
        display: "grid",
        "grid-template-columns": "minmax(0, 1fr) 18px",
        "align-items": "center",
        gap: "10px"
    });
    caveBar.appendChild(labelContent);
    caveBar.appendChild(lock);
}

function getCaptureTarget() {
    return getCachedElementById("benchmark-content")
        || getCachedElementById("responsive-wrapper")
        || document.body;
}

function readRootThemeVars() {
    const vars = {};
    Array.from(document.documentElement.style).forEach((propertyName) => {
        if (typeof propertyName === "string" && propertyName.startsWith("--")) {
            vars[propertyName] = document.documentElement.style.getPropertyValue(propertyName);
        }
    });
    return vars;
}

function getScreenshotBackgroundColor() {
    const liveBodyStyle = getComputedStyle(document.body);
    const fallbackThemeBg = getComputedStyle(document.documentElement).getPropertyValue("--app-bg").trim();
    return liveBodyStyle.backgroundColor || fallbackThemeBg || "#050505";
}

function getCropMetricsForDocument(doc, captureTarget) {
    const radarBoxEl = doc === document
        ? getCachedQuery("radarBox", () => document.querySelector(".radar-box"))
        : doc.querySelector(".radar-box");
    if (!captureTarget || typeof captureTarget.getBoundingClientRect !== "function") {
        return { captureSourceWidthPx: null, captureSourceHeightPx: null, cropToRadarPx: null };
    }

    const elementRect = captureTarget.getBoundingClientRect();
    const captureSourceWidthPx = Math.max(1, elementRect.width || 0);
    const radarBottom = radarBoxEl ? radarBoxEl.getBoundingClientRect().bottom : null;
    const cropAnchorY = [
        Number.isFinite(radarBottom) ? radarBottom : null
    ].reduce((max, value) => (value !== null && value > max ? value : max), 0);
    const rawHeight = cropAnchorY > 0 ? (cropAnchorY - elementRect.top) : 0;
    const cropToRadarPx = Number.isFinite(rawHeight) && rawHeight > 0 ? Math.ceil(rawHeight) : null;
    const captureSourceHeightPx = cropToRadarPx
        ? Math.max(1, cropToRadarPx + 24)
        : Math.max(1, Math.ceil(elementRect.height || 0));
    return { captureSourceWidthPx, captureSourceHeightPx, cropToRadarPx };
}

function getCropMetrics(captureTarget) {
    return getCropMetricsForDocument(document, captureTarget);
}

function copyElementAttributes(sourceEl, targetEl) {
    if (!sourceEl || !targetEl) return;
    Array.from(sourceEl.attributes || []).forEach((attr) => {
        if (!attr || attr.name === "style") return;
        targetEl.setAttribute(attr.name, attr.value);
    });
}

function syncCloneFormState(sourceRoot, targetRoot) {
    if (!sourceRoot || !targetRoot) return;
    const sourceFields = sourceRoot.querySelectorAll("input, textarea, select");
    const targetFields = targetRoot.querySelectorAll("input, textarea, select");
    sourceFields.forEach((sourceField, index) => {
        const targetField = targetFields[index];
        if (!targetField) return;

        if (sourceField.tagName === "TEXTAREA") {
            targetField.value = sourceField.value;
            targetField.textContent = sourceField.value;
            return;
        }

        if (sourceField.tagName === "SELECT") {
            targetField.value = sourceField.value;
            targetField.selectedIndex = sourceField.selectedIndex;
            Array.from(targetField.options || []).forEach((option, optionIndex) => {
                option.selected = !!(sourceField.options && sourceField.options[optionIndex] && sourceField.options[optionIndex].selected);
            });
            return;
        }

        if (sourceField.type === "checkbox" || sourceField.type === "radio") {
            targetField.checked = sourceField.checked;
            return;
        }

        targetField.value = sourceField.value;
        targetField.setAttribute("value", sourceField.value);
    });
}

function copyHeadStylesToDocument(targetDoc) {
    const styleNodes = Array.from(document.head.querySelectorAll("style, link[rel='stylesheet']"));
    styleNodes.forEach((node) => {
        const clone = node.cloneNode(true);
        if (clone.tagName === "LINK" && node.href) {
            clone.href = node.href;
        }
        targetDoc.head.appendChild(clone);
    });
}

function copyDocumentPresentationState(targetDoc) {
    copyElementAttributes(document.documentElement, targetDoc.documentElement);
    copyElementAttributes(document.body, targetDoc.body);
    targetDoc.documentElement.className = document.documentElement.className || "";
    targetDoc.body.className = document.body.className || "";
}

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForAnimationFrames(win, count = 2) {
    return new Promise((resolve) => {
        if (!win || typeof win.requestAnimationFrame !== "function" || count <= 0) {
            resolve();
            return;
        }
        const step = (remaining) => {
            if (remaining <= 0) {
                resolve();
                return;
            }
            win.requestAnimationFrame(() => step(remaining - 1));
        };
        step(count);
    });
}

async function waitForStylesheets(doc) {
    const stylesheetLinks = Array.from(doc.querySelectorAll("link[rel='stylesheet']"));
    await Promise.allSettled(stylesheetLinks.map((link) => new Promise((resolve) => {
        if (link.sheet) {
            resolve();
            return;
        }
        const finish = () => resolve();
        link.addEventListener("load", finish, { once: true });
        link.addEventListener("error", finish, { once: true });
        setTimeout(finish, 2000);
    })));
}

async function waitForImages(doc) {
    const images = Array.from(doc.images || []);
    await Promise.allSettled(images.map((img) => new Promise((resolve) => {
        if (img.complete) {
            resolve();
            return;
        }
        const finish = () => resolve();
        if (typeof img.decode === "function") {
            img.decode().then(finish).catch(finish);
            return;
        }
        img.addEventListener("load", finish, { once: true });
        img.addEventListener("error", finish, { once: true });
        setTimeout(finish, 2000);
    })));
}

function applyTemporaryMainRankScreenshotOverrides() {
    const mainRankBox = getCachedQuery("roundedInnerBox", () => document.querySelector(".rounded-inner-box"));
    const mainRankImg = mainRankBox ? mainRankBox.querySelector("img") : null;
    const mainRankSpan = mainRankBox ? mainRankBox.querySelector("span") : null;
    const mainText = mainRankBox ? (mainRankBox.textContent || "") : "";

    const previousImgFilter = mainRankImg ? mainRankImg.style.filter : null;
    const previousSpanStyle = mainRankSpan ? mainRankSpan.style.cssText : null;

    if (mainRankImg) {
        if (mainText.includes("Stellar")) {
            mainRankImg.style.filter = STELLAR_TROPHY_FILTER;
        } else if (mainText.includes("Celestium")) {
            mainRankImg.style.filter = "sepia(1) hue-rotate(290deg) saturate(3) brightness(0.9)";
        } else if (mainText.includes("Aeternus")) {
            mainRankImg.style.filter = "sepia(1) hue-rotate(2deg) saturate(0.74) brightness(1.16)";
        }
    }

    if (mainRankSpan) {
        const baseStyle = previousSpanStyle || "";
        if (mainText.includes("Stellar")) {
            mainRankSpan.style.cssText = baseStyle
                .replace(/background[^;]*;/g, "")
                .replace(/-webkit-background-clip[^;]*;/g, "")
                .replace(/background-clip[^;]*;/g, "")
                .replace(/color: transparent[^;]*/g, "color: #FF6F00")
                + " color: #FF6F00 !important; -webkit-text-fill-color: #FF6F00 !important; background: none !important; animation: none !important;";
        } else if (mainText.includes("Celestium")) {
            mainRankSpan.style.cssText = baseStyle
                .replace(/background[^;]*;/g, "")
                .replace(/-webkit-background-clip[^;]*;/g, "")
                .replace(/background-clip[^;]*;/g, "")
                .replace(/color: transparent[^;]*/g, "color: #D8007F")
                + " color: #D8007F !important; -webkit-text-fill-color: #D8007F !important; background: none !important; animation: none !important;";
        } else if (mainText.includes("Aeternus")) {
            mainRankSpan.style.cssText = baseStyle
                .replace(/background[^;]*;/g, "")
                .replace(/-webkit-background-clip[^;]*;/g, "")
                .replace(/background-clip[^;]*;/g, "")
                .replace(/color: transparent[^;]*/g, "color: #e5d9b6")
                + " color: #e5d9b6 !important; -webkit-text-fill-color: #e5d9b6 !important; background: none !important; animation: none !important;";
        }
    }

    return () => {
        if (mainRankImg && previousImgFilter !== null) {
            mainRankImg.style.filter = previousImgFilter;
        }
        if (mainRankSpan && previousSpanStyle !== null) {
            mainRankSpan.style.cssText = previousSpanStyle;
        }
    };
}

function buildCaptureContext() {
    const captureTarget = getCaptureTarget();
    return {
        captureTarget,
        screenshotBgColor: getScreenshotBackgroundColor(),
        rootThemeVars: readRootThemeVars(),
        ...getCropMetrics(captureTarget)
    };
}

function shouldCaptureNode(node) {
    if (!node || node.nodeType !== 1) return true;

    const element = node;
    const elementId = typeof element.id === "string" ? element.id : "";
    if (HIDE_IDS.has(elementId) || elementId.endsWith("Modal")) return false;

    if (typeof element.closest === "function" && element.closest(".share-modal-overlay")) {
        return false;
    }

    if (element.classList) {
        for (const className of HIDE_CLASS_NAMES) {
            if (element.classList.contains(className)) return false;
        }
    }

    return true;
}

function applyCloneThemeVars(doc, rootThemeVars) {
    Object.keys(rootThemeVars).forEach((key) => {
        doc.documentElement.style.setProperty(key, rootThemeVars[key]);
    });
}

function injectCloneResetStyle(doc, screenshotBgColor) {
    const style = doc.createElement("style");
    style.innerHTML = `
        * {
            animation: none !important;
            transition: none !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            transform-style: flat !important;
            caret-color: transparent !important;
        }
        html, body {
            background: ${screenshotBgColor} !important;
            background-image: none !important;
        }
        .rank-name::before,
        .rounded-inner-box span::before,
        .share-modal-overlay,
        .page-loader,
        .dropdown-menu,
        .cave-play-overlay,
        .cave-play-edit,
        .cave-play-panel,
        .mobile-top-links,
        .mobile-exit-view-btn,
        .benchmark-footer {
            display: none !important;
        }
        .score-input:focus,
        .score-input:focus-visible,
        .score-input-wrapper:focus-within {
            outline: none !important;
            box-shadow: none !important;
        }
    `;
    doc.head.appendChild(style);
}

function stripCloneTransientState(doc) {
    doc.body.classList.remove("mobile-layout-active", "score-input-focused");
    doc.documentElement.classList.remove("mobile-layout-active");

    doc.querySelectorAll(".dropdown-menu").forEach((el) => el.classList.remove("show"));
    doc.querySelectorAll(".ranks-bars").forEach((row) => {
        row.classList.remove("row-active-first", "row-active-second", "row-active-single");
        row.style.removeProperty("--row-active-outline-color");
        row.style.removeProperty("--row-active-outline-shadow");
    });
    doc.querySelectorAll(".bg-stripe").forEach((stripe) => stripe.classList.remove("stripe-active"));
    doc.querySelectorAll(".cave-play-wrapper").forEach((wrapper) => wrapper.classList.remove("is-hot", "panel-open"));
}

function normalizeCloneDimensions(doc, captureWidthPx, screenshotBgColor) {
    if (doc.body) {
        doc.body.style.backgroundColor = screenshotBgColor;
        doc.body.style.backgroundImage = "none";
        doc.body.style.overflow = "visible";
        doc.body.style.width = `${captureWidthPx}px`;
        doc.body.style.minWidth = `${captureWidthPx}px`;
        doc.body.style.height = "auto";
        doc.body.style.minHeight = "0";
    }

    doc.documentElement.style.width = `${captureWidthPx}px`;
    doc.documentElement.style.minWidth = `${captureWidthPx}px`;
    doc.documentElement.style.height = "auto";

    const responsiveWrapper = doc.getElementById("responsive-wrapper");
    if (responsiveWrapper) {
        applyImportantStyles(responsiveWrapper, {
            width: `${captureWidthPx}px`,
            "min-width": `${captureWidthPx}px`,
            "max-width": "none",
            height: "auto",
            "min-height": "0",
            padding: "20px"
        });
    }

    const benchmarkContent = doc.getElementById("benchmark-content");
    if (benchmarkContent) {
        applyImportantStyles(benchmarkContent, {
            width: "100%",
            "max-width": "none",
            height: "auto",
            "min-height": "0"
        });
    }
}

function injectCloneLayoutStyles(doc) {
    const desktopOverrideStyle = doc.createElement("style");
    desktopOverrideStyle.innerHTML = DESKTOP_CAPTURE_OVERRIDE_CSS;
    doc.head.appendChild(desktopOverrideStyle);
}

function normalizeCloneFloatingRows(doc) {
    const container = doc.querySelector(".container");
    if (!container) return;
    container.classList.remove("mobile-layout-active");

    doc.querySelectorAll(".score-input-wrapper").forEach((element) => {
        if (!element.dataset.desktopTop) return;
        container.appendChild(element);
        applyImportantStyles(element, {
            position: "absolute",
            top: element.dataset.desktopTop,
            left: "360px",
            transform: "none",
            margin: "0",
            display: "block"
        });
    });

    doc.querySelectorAll(".rating-value").forEach((element) => {
        if (!element.dataset.desktopTop) return;
        container.appendChild(element);
        applyImportantStyles(element, {
            position: "absolute",
            top: element.dataset.desktopTop,
            height: element.dataset.desktopHeight || "78px",
            left: "auto",
            right: "0",
            transform: "none",
            margin: "0",
            display: "flex"
        });
    });
}

function normalizeCloneRankBox(doc) {
    const rankBox = doc.querySelector(".rounded-inner-box");
    const middleBox = doc.querySelector(".middle-box");
    if (!rankBox || !middleBox) return;

    middleBox.insertBefore(rankBox, middleBox.firstChild);
    applyImportantStyles(rankBox, {
        position: "absolute",
        top: "20px",
        left: "20px",
        right: "20px",
        bottom: "20px",
        transform: "none",
        width: "auto",
        height: "auto",
        margin: "0"
    });
}

function resetCloneTransforms(doc) {
    TRANSFORM_RESET_SELECTORS.forEach((selector) => {
        doc.querySelectorAll(selector).forEach((element) => {
            element.style.transform = "";
            element.style.left = "";
            element.style.right = "";
            element.style.top = "";
        });
    });
}

function normalizeCloneCaveLabels(doc) {
    doc.querySelectorAll(".rank-bar.cave-cell-label").forEach((caveBar) => {
        const row = caveBar.closest(".ranks-bars");
        if (row) row.style.setProperty("position", "relative", "important");

        applyImportantStyles(caveBar, {
            position: "absolute",
            right: "calc(100% + 124px)",
            top: "-6.5px",
            height: "38px",
            width: "300px",
            "min-width": "300px",
            "max-width": "300px",
            transform: "none",
            overflow: "visible",
            display: "flex",
            "align-items": "center",
            "box-sizing": "border-box",
            "padding-left": "10px",
            "padding-right": "10px",
            "margin-left": "0",
            "margin-right": "0",
            gap: "0"
        });

        normalizeCaveLabelForScreenshot(doc, caveBar);
    });
}

function resetCloneScrollPositions(doc) {
    doc.querySelectorAll(".ranks-wrapper, .ranks-scroll, #ranksBarsContainer, .container > .ranks-bars-stack").forEach((element) => {
        if (typeof element.scrollLeft === "number") element.scrollLeft = 0;
    });
}

function copyDynamicCloneStyles(doc) {
    const originalHoneycomb = getCachedElementById("dynamic-honeycomb-style");
    if (!originalHoneycomb) return;

    const clonedHoneycomb = doc.createElement("style");
    clonedHoneycomb.id = "dynamic-honeycomb-style";
    clonedHoneycomb.innerHTML = originalHoneycomb.innerHTML;
    doc.head.appendChild(clonedHoneycomb);
}

function copyLiveCanvasBitmaps(doc) {
    LIVE_CANVAS_IDS.forEach((canvasId) => {
        const sourceCanvas = document.getElementById(canvasId);
        const targetCanvas = doc.getElementById(canvasId);
        if (!sourceCanvas || !targetCanvas) return;

        targetCanvas.width = sourceCanvas.width;
        targetCanvas.height = sourceCanvas.height;

        const sourceRect = sourceCanvas.getBoundingClientRect();
        if (sourceRect.width > 0 && sourceRect.height > 0) {
            applyImportantStyles(targetCanvas, {
                width: `${sourceRect.width}px`,
                height: `${sourceRect.height}px`
            });
        }

        const targetCtx = targetCanvas.getContext("2d");
        if (!targetCtx) return;
        targetCtx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
        targetCtx.drawImage(sourceCanvas, 0, 0);
    });
}

function normalizeCloneForScreenshot(doc, context, captureWidthPx) {
    applyCloneThemeVars(doc, context.rootThemeVars);
    injectCloneResetStyle(doc, context.screenshotBgColor);
    normalizeCloneDimensions(doc, captureWidthPx, context.screenshotBgColor);
    stripCloneTransientState(doc);
    injectCloneLayoutStyles(doc);
    normalizeCloneFloatingRows(doc);
    normalizeCloneRankBox(doc);
    resetCloneTransforms(doc);
    normalizeCloneCaveLabels(doc);
    resetCloneScrollPositions(doc);
    copyDynamicCloneStyles(doc);
    copyLiveCanvasBitmaps(doc);
}

async function buildOffscreenDesktopCaptureContext(baseContext, captureWidthPx) {
    const sourceRoot = getCachedElementById("responsive-wrapper")
        || getCaptureTarget();
    if (!sourceRoot) throw new Error("Capture target unavailable.");

    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    applyImportantStyles(iframe, {
        position: "fixed",
        left: "-20000px",
        top: "0",
        width: `${captureWidthPx}px`,
        height: `${Math.max(baseContext.captureSourceHeightPx || 0, 1800)}px`,
        border: "0",
        margin: "0",
        padding: "0",
        opacity: "0.01",
        "pointer-events": "none",
        "z-index": "-1",
        background: "transparent"
    });
    document.body.appendChild(iframe);

    const frameDoc = iframe.contentDocument;
    if (!frameDoc) {
        iframe.remove();
        throw new Error("Capture frame unavailable.");
    }

    frameDoc.open();
    frameDoc.write(`<!DOCTYPE html><html lang="${document.documentElement.lang || "en"}"><head><meta charset="UTF-8"><base href="${document.baseURI}"></head><body></body></html>`);
    frameDoc.close();

    copyDocumentPresentationState(frameDoc);
    copyHeadStylesToDocument(frameDoc);

    const clonedRoot = sourceRoot.cloneNode(true);
    syncCloneFormState(sourceRoot, clonedRoot);
    frameDoc.body.appendChild(clonedRoot);
    normalizeCloneForScreenshot(frameDoc, baseContext, captureWidthPx);

    const frameOverrideStyle = createScreenshotOverrideStyle();
    frameDoc.head.appendChild(frameDoc.importNode(frameOverrideStyle, true));

    await waitForStylesheets(frameDoc);
    if (frameDoc.fonts && frameDoc.fonts.ready) {
        try {
            await frameDoc.fonts.ready;
        } catch (error) {
            void error;
        }
    }
    await waitForImages(frameDoc);
    await waitForAnimationFrames(frameDoc.defaultView, 3);
    await wait(140);

    const frameCaptureTarget = frameDoc.getElementById("benchmark-content")
        || frameDoc.getElementById("responsive-wrapper")
        || frameDoc.body;
    const frameMetrics = getCropMetricsForDocument(frameDoc, frameCaptureTarget);
    iframe.style.height = `${Math.max((frameMetrics.captureSourceHeightPx || 0) + 120, 1800)}px`;

    return {
        captureTarget: frameCaptureTarget,
        screenshotBgColor: baseContext.screenshotBgColor,
        captureSourceWidthPx: frameMetrics.captureSourceWidthPx,
        captureSourceHeightPx: frameMetrics.captureSourceHeightPx,
        cropToRadarPx: frameMetrics.cropToRadarPx,
        cleanup: () => {
            if (iframe.isConnected) iframe.remove();
        }
    };
}

export async function buildShareServiceDesktopMarkup() {
    const context = buildCaptureContext();
    const iframeContext = await buildOffscreenDesktopCaptureContext(context, DESKTOP_SCREENSHOT_WIDTH_PX);
    try {
        return iframeContext.captureTarget && typeof iframeContext.captureTarget.outerHTML === "string"
            ? iframeContext.captureTarget.outerHTML
            : "";
    } finally {
        iframeContext.cleanup();
    }
}

function withTimeout(promise, timeoutMs) {
    if (!timeoutMs || timeoutMs <= 0) return promise;
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(t("share_preview_timeout"))), timeoutMs);
    });
    return Promise.race([promise, timeoutPromise]);
}

function getScreenshotEngine() {
    const screenshotEngine = window.modernScreenshot;
    if (!screenshotEngine || typeof screenshotEngine.domToJpeg !== "function") {
        throw new Error(t("share_preview_engine_not_ready"));
    }
    return screenshotEngine;
}

function getHtml2CanvasEngine() {
    const html2canvas = window.html2canvas;
    if (typeof html2canvas !== "function") {
        throw new Error("html2canvas engine not ready.");
    }
    return html2canvas;
}

async function runHtml2CanvasCapture(target, options = {}) {
    const html2canvas = getHtml2CanvasEngine();
    const canvas = await html2canvas(target, {
        backgroundColor: options.backgroundColor || null,
        width: options.width || undefined,
        height: options.height || undefined,
        scale: 1,
        useCORS: true,
        allowTaint: true,
        logging: false,
        removeContainer: true,
        imageTimeout: 0,
        windowWidth: options.width || undefined,
        windowHeight: options.height || undefined
    });
    if (!canvas || typeof canvas.toDataURL !== "function") {
        throw new Error("html2canvas capture failed.");
    }
    return canvas.toDataURL("image/jpeg", options.quality || 0.82);
}

async function runDirectCaptureAttempt(context, attempt) {
    const screenshotEngine = getScreenshotEngine();
    const capturePromise = screenshotEngine.domToJpeg(context.captureTarget, {
        scale: CAPTURE_SCALE,
        width: attempt.width,
        height: context.captureSourceHeightPx || undefined,
        quality: attempt.quality,
        pixelRatio: 1,
        fontEmbedCSS: "",
        style: {
            margin: "0",
            padding: "0",
            backgroundColor: context.screenshotBgColor,
            width: `${attempt.width}px`,
            minWidth: `${attempt.width}px`,
            height: context.captureSourceHeightPx ? `${context.captureSourceHeightPx}px` : "auto",
            minHeight: context.captureSourceHeightPx ? `${context.captureSourceHeightPx}px` : "auto",
            transform: "none"
        },
        filter: shouldCaptureNode,
        onClone: (doc) => {
            normalizeCloneForScreenshot(doc, context, attempt.width);
        }
    });

    return withTimeout(capturePromise, attempt.timeoutMs);
}

async function runDirectHtml2CanvasAttempt(context, attempt) {
    return {
        dataUrl: await withTimeout(runHtml2CanvasCapture(context.captureTarget, {
            backgroundColor: context.screenshotBgColor,
            width: attempt.width,
            height: context.captureSourceHeightPx || undefined,
            quality: attempt.quality
        }), attempt.timeoutMs),
        captureSourceWidthPx: context.captureSourceWidthPx,
        cropToRadarPx: context.cropToRadarPx
    };
}

async function runIframeCaptureAttempt(context, attempt) {
    const screenshotEngine = getScreenshotEngine();
    const iframeContext = await buildOffscreenDesktopCaptureContext(context, attempt.width);
    try {
        const capturePromise = screenshotEngine.domToJpeg(iframeContext.captureTarget, {
            scale: CAPTURE_SCALE,
            width: attempt.width,
            height: iframeContext.captureSourceHeightPx || undefined,
            quality: attempt.quality,
            pixelRatio: 1,
            fontEmbedCSS: "",
            style: {
                margin: "0",
                padding: "0",
                backgroundColor: iframeContext.screenshotBgColor,
                width: `${attempt.width}px`,
                minWidth: `${attempt.width}px`,
                height: iframeContext.captureSourceHeightPx ? `${iframeContext.captureSourceHeightPx}px` : "auto",
                minHeight: iframeContext.captureSourceHeightPx ? `${iframeContext.captureSourceHeightPx}px` : "auto",
                transform: "none"
            },
            filter: shouldCaptureNode
        });

        return {
            dataUrl: await withTimeout(capturePromise, attempt.timeoutMs),
            captureSourceWidthPx: iframeContext.captureSourceWidthPx,
            cropToRadarPx: iframeContext.cropToRadarPx
        };
    } finally {
        iframeContext.cleanup();
    }
}

async function runIframeHtml2CanvasAttempt(context, attempt) {
    const iframeContext = await buildOffscreenDesktopCaptureContext(context, attempt.width);
    try {
        return {
            dataUrl: await withTimeout(runHtml2CanvasCapture(iframeContext.captureTarget, {
                backgroundColor: iframeContext.screenshotBgColor,
                width: attempt.width,
                height: iframeContext.captureSourceHeightPx || undefined,
                quality: attempt.quality
            }), attempt.timeoutMs),
            captureSourceWidthPx: iframeContext.captureSourceWidthPx,
            cropToRadarPx: iframeContext.cropToRadarPx
        };
    } finally {
        iframeContext.cleanup();
    }
}

async function captureDataUrl(context, options = {}) {
    const forceOffscreenDesktop = !!options.forceOffscreenDesktop;
    const allowLiveDesktopFallback = options.allowLiveDesktopFallback !== false;
    let lastError = null;
    const attempts = isMobileViewport() ? MOBILE_CAPTURE_ATTEMPTS : DESKTOP_CAPTURE_ATTEMPTS;

    for (const attempt of attempts) {
        try {
            if (isMobileViewport()) {
                try {
                    return await runIframeCaptureAttempt(context, attempt);
                } catch (iframeError) {
                    lastError = iframeError;
                    try {
                        return await runIframeHtml2CanvasAttempt(context, attempt);
                    } catch (iframeCanvasError) {
                        lastError = iframeCanvasError;
                        try {
                            return {
                                dataUrl: await runDirectCaptureAttempt(context, attempt),
                                captureSourceWidthPx: context.captureSourceWidthPx,
                                cropToRadarPx: context.cropToRadarPx
                            };
                        } catch (directModernError) {
                            lastError = directModernError;
                            return await runDirectHtml2CanvasAttempt(context, attempt);
                        }
                    }
                }
            }
            if (forceOffscreenDesktop) {
                try {
                    return await runIframeCaptureAttempt(context, attempt);
                } catch (iframeError) {
                    lastError = iframeError;
                    try {
                        return await runIframeHtml2CanvasAttempt(context, attempt);
                    } catch (iframeCanvasError) {
                        lastError = iframeCanvasError;
                        if (!allowLiveDesktopFallback) {
                            continue;
                        }
                    }
                }
            }
            return {
                dataUrl: await runDirectCaptureAttempt(context, attempt),
                captureSourceWidthPx: context.captureSourceWidthPx,
                cropToRadarPx: context.cropToRadarPx
            };
        } catch (error) {
            lastError = error;
        }
    }

    throw (lastError || new Error(t("share_preview_capture_failed")));
}

async function cropCapturedImage(dataUrl, captureSourceWidthPx, cropToRadarPx, screenshotBgColor) {
    const img = await loadImage(dataUrl);
    const cropScale = captureSourceWidthPx && captureSourceWidthPx > 0
        ? (img.width / captureSourceWidthPx)
        : 1;
    const scaledCropToRadarPx = cropToRadarPx
        ? Math.max(1, Math.ceil(cropToRadarPx * cropScale))
        : null;
    const croppedHeight = cropToRadarPx
        ? Math.max(1, Math.min(img.height, scaledCropToRadarPx))
        : img.height;

    const canvas = document.createElement("canvas");
    canvas.width = img.width + (SHARE_SCREENSHOT_OUTER_PADDING_PX * 2);
    canvas.height = croppedHeight + (SHARE_SCREENSHOT_OUTER_PADDING_PX * 2);

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context unavailable");

    ctx.fillStyle = screenshotBgColor || "#050505";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.drawImage(
        img,
        0,
        0,
        img.width,
        croppedHeight,
        SHARE_SCREENSHOT_OUTER_PADDING_PX,
        SHARE_SCREENSHOT_OUTER_PADDING_PX,
        img.width,
        croppedHeight
    );

    return canvas;
}

export async function generateShareScreenshotCanvas(options = {}) {
    const offscreenOnly = !!options.offscreenOnly;
    const context = buildCaptureContext();
    const shouldUseLiveDocumentOverrides = !(offscreenOnly && !isMobileViewport());
    const overrideStyle = shouldUseLiveDocumentOverrides ? createScreenshotOverrideStyle() : null;
    const restoreMainRankStyles = shouldUseLiveDocumentOverrides
        ? applyTemporaryMainRankScreenshotOverrides()
        : () => {};

    if (overrideStyle) {
        document.head.appendChild(overrideStyle);
    }

    try {
        const captureResult = await captureDataUrl(context, {
            forceOffscreenDesktop: offscreenOnly && !isMobileViewport(),
            allowLiveDesktopFallback: !offscreenOnly
        });
        return await cropCapturedImage(
            captureResult.dataUrl,
            captureResult.captureSourceWidthPx,
            captureResult.cropToRadarPx,
            context.screenshotBgColor
        );
    } finally {
        if (overrideStyle.isConnected) overrideStyle.remove();
        restoreMainRankStyles();
    }
}
