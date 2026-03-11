import { isMobileViewport } from "./utils.js";
import { getCachedElementById } from "./utils/domUtils.js";
import { state, getCurrentConfigState } from "./appState.js";
import * as RankingUI from "./rankingUI.js?v=20260311-compare-theme-colors-1";
import { t } from "./i18n.js";
import { generateShareScreenshotCanvas } from "./shareScreenshot.js";
import {
    requestShareServicePreviewUrl,
    hasShareServiceConfigured
} from "./shareServiceClient.js";
import {
    configureShareLinks,
    buildShareUrl,
    buildCopyLinkUrl,
    applyShareFromUrl,
    copyBenchmarkLinkToClipboard as copyProfileLinkToClipboard
} from "./shareLinks.js?v=20260309-public-view-fix-1";

export { buildShareUrl, buildCopyLinkUrl, applyShareFromUrl };

const SCREENSHOT_CACHE_VERSION = "share-rebuild-v22";
const MOBILE_MIN_SCREENSHOT_LOADING_MS = 650;
const DESKTOP_MIN_SCREENSHOT_LOADING_MS = 0;

export function configure(deps = {}) {
    configureShareLinks(deps);
}

function renderLoadingScreenshot(container) {
    if (!container) return;
    container.innerHTML = `
        <div class="share-screenshot-loading">
            <div class="share-screenshot-spinner"></div>
            <div class="share-screenshot-loading-text">${t("generating_screenshot")}</div>
        </div>
    `;
}

function renderScreenshotCanvas(container, canvas) {
    if (!container || !canvas) return;
    canvas.classList.add("share-screenshot-preview");
    container.innerHTML = "";
    const frame = document.createElement("div");
    frame.className = "share-screenshot-stage";
    frame.appendChild(canvas);
    container.appendChild(frame);
    container.scrollTop = 0;
}

function renderScreenshotImage(container, imageUrl) {
    if (!container || !imageUrl) return Promise.resolve();
    return new Promise((resolve, reject) => {
        const img = document.createElement("img");
        let settled = false;
        const settle = (callback) => {
            if (settled) return;
            settled = true;
            img.onload = null;
            img.onerror = null;
            callback();
        };
        img.className = "share-screenshot-preview";
        img.alt = t("share_preview_alt");
        img.decoding = "sync";
        img.loading = "eager";
        img.fetchPriority = "high";
        img.onload = () => {
            settle(() => {
                container.innerHTML = "";
                const frame = document.createElement("div");
                frame.className = "share-screenshot-stage";
                frame.appendChild(img);
                container.appendChild(frame);
                container.scrollTop = 0;
                resolve();
            });
        };
        img.onerror = () => {
            settle(() => reject(new Error(t("share_preview_image_load_failed"))));
        };
        img.src = imageUrl;
        if (img.complete && img.naturalWidth > 0) {
            img.onload();
        }
    });
}

function localizeScreenshotErrorMessage(err) {
    const fallbackMessage = t("share_preview_generation_failed");
    const rawMessage = err && err.message ? String(err.message).trim() : "";
    if (!rawMessage) return fallbackMessage;

    if (rawMessage.startsWith("Share service request failed")) {
        return t("share_preview_service_failed");
    }

    const knownMessages = {
        "Preview image failed to load.": "share_preview_image_load_failed",
        "Screenshot image failed to load.": "share_preview_image_load_failed",
        "Screenshot generation failed.": "share_preview_generation_failed",
        "Unable to export screenshot.": "share_preview_export_failed",
        "Screenshot generation timed out.": "share_preview_timeout",
        "Screenshot engine not ready.": "share_preview_engine_not_ready",
        "Screenshot capture failed.": "share_preview_capture_failed",
        "Share service returned an empty image URL.": "share_preview_service_empty",
        "Share service request failed.": "share_preview_service_failed"
    };

    const key = knownMessages[rawMessage];
    return key ? t(key) : rawMessage;
}

function renderScreenshotError(container, err) {
    if (!container) return;
    const message = localizeScreenshotErrorMessage(err);
    container.innerHTML = `
        <div class="share-screenshot-error">
            <div class="share-screenshot-error-title">${t("share_preview_failed")}</div>
            <div class="share-screenshot-error-text">${message}</div>
            <button class="share-btn btn-copy" type="button" data-share-retry>${t("share_preview_try_again")}</button>
        </div>
    `;
}

function readTextContent(selector) {
    const el = document.querySelector(selector);
    return el ? (el.textContent || "").trim() : "";
}

function buildThemeCacheSegment() {
    const theme = state && state.theme ? state.theme : {};
    const customThemeHex = theme.customThemeHex && typeof theme.customThemeHex === "object"
        ? Object.keys(theme.customThemeHex)
            .sort()
            .map((key) => `${key}:${theme.customThemeHex[key]}`)
            .join(",")
        : "";

    return [
        theme.currentTheme || "",
        theme.customThemeEnabled ? "1" : "0",
        theme.autoRankThemeEnabled ? "1" : "0",
        theme.customThemeName || "",
        customThemeHex
    ].join("|");
}

function buildScreenshotCacheKey() {
    const config = getCurrentConfigState() || {};
    const configSegment = [
        config.platform || "",
        config.time || "",
        config.stat || "",
        config.mount || ""
    ].join("|");

    const scoreSegment = Array.from(document.querySelectorAll(".score-input"))
        .map((input) => String(Number(input.value) || 0))
        .join(",");

    const caveLinksSegment = Array.from(document.querySelectorAll(".cave-play-wrapper"))
        .map((wrapper) => wrapper.dataset.youtube || "")
        .join("|");

    const profileSegment = [
        readTextContent(".profile-name"),
        readTextContent(".guild-name"),
        readTextContent("#viewCount"),
        readTextContent(".achievements-text"),
        readTextContent(".rounded-inner-box")
    ].join("|");

    const trophyList = getCachedElementById("trophyList");
    const trophyCount = trophyList ? trophyList.childElementCount : 0;
    const radarMode = state && state.radarMode ? state.radarMode : "";
    const viewportSegment = isMobileViewport() ? "mobile" : "desktop";

    return [
        SCREENSHOT_CACHE_VERSION,
        configSegment,
        buildThemeCacheSegment(),
        radarMode,
        viewportSegment,
        String(trophyCount),
        profileSegment,
        scoreSegment,
        caveLinksSegment
    ].join("::");
}

function isVisibleOverlayElement(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return false;
    if (Number(style.opacity || "1") <= 0.01) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
}

function setShareStatus(statusEl, tone, text) {
    if (!statusEl) return;
    statusEl.textContent = text || "";
    statusEl.dataset.tone = tone || "idle";
}

function syncScreenshotActionState({ downloadImageBtn }, isBusy, hasCanvas) {
    if (downloadImageBtn) downloadImageBtn.disabled = isBusy || !hasCanvas;
}

function canvasToJpegBlob(canvas, quality = 0.92) {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) {
                resolve(blob);
            } else {
                reject(new Error(t("share_preview_export_failed")));
            }
        }, "image/jpeg", quality);
    });
}

function delay(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

function getMinScreenshotLoadingMs() {
    return isMobileViewport()
        ? MOBILE_MIN_SCREENSHOT_LOADING_MS
        : DESKTOP_MIN_SCREENSHOT_LOADING_MS;
}

let modalLockScrollY = 0;
let modalScrollLocked = false;
let activeGlobalModalTouchContainer = null;
let activeGlobalModalTouchY = 0;

function syncGlobalModalScrollLock() {
    const hasOpenOverlay = Array.from(document.querySelectorAll(".share-modal-overlay.show"))
        .some((el) => isVisibleOverlayElement(el));
    const shouldLockPageScroll = hasOpenOverlay;
    document.documentElement.classList.toggle("modal-open", shouldLockPageScroll);
    document.body.classList.toggle("modal-open", shouldLockPageScroll);

    if (shouldLockPageScroll && !modalScrollLocked) {
        modalLockScrollY = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
        modalScrollLocked = true;
    }

    if (!shouldLockPageScroll && modalScrollLocked) {
        modalScrollLocked = false;
    }

    if (shouldLockPageScroll) {
        document.body.style.overflow = "hidden";
        document.documentElement.style.overflow = "hidden";
    } else {
        document.body.style.overflow = "";
        document.documentElement.style.overflow = "";
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.left = "";
        document.body.style.right = "";
        document.body.style.width = "";
        modalLockScrollY = 0;
    }
}

function findScrollableModalAncestor(target, modalEl) {
    let node = target instanceof Element ? target : null;
    while (node && node !== modalEl) {
        const style = window.getComputedStyle(node);
        const overflowY = style ? style.overflowY : "";
        const canScrollY = (overflowY === "auto" || overflowY === "scroll")
            && node.scrollHeight > (node.clientHeight + 1);
        if (canScrollY) return node;
        node = node.parentElement;
    }
    return null;
}

function canContinueTouchScroll(container, deltaY) {
    if (!container) return false;
    const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);
    if (maxScrollTop <= 0) return false;
    if (deltaY > 0 && container.scrollTop <= 0) return false;
    if (deltaY < 0 && container.scrollTop >= (maxScrollTop - 1)) return false;
    return true;
}

function getActiveModalOverlay() {
    const overlays = Array.from(document.querySelectorAll(".share-modal-overlay.show"))
        .filter((el) => isVisibleOverlayElement(el));
    return overlays.length ? overlays[overlays.length - 1] : null;
}

function shouldBlockGlobalModalTouchMove(event) {
    if (!isMobileViewport()) return false;
    const activeOverlay = getActiveModalOverlay();
    if (!activeOverlay) return false;
    if (!event.touches || !event.touches.length) return true;

    const currentY = event.touches[0].clientY;
    const deltaY = currentY - activeGlobalModalTouchY;
    activeGlobalModalTouchY = currentY;

    if (!activeOverlay.contains(event.target)) return true;

    const scrollContainer = findScrollableModalAncestor(event.target, activeOverlay) || activeGlobalModalTouchContainer;
    if (!scrollContainer || !activeOverlay.contains(scrollContainer)) return true;

    return !canContinueTouchScroll(scrollContainer, deltaY);
}

function syncGlobalModalTouchLock() {
    if (getActiveModalOverlay()) return;
    activeGlobalModalTouchContainer = null;
    activeGlobalModalTouchY = 0;
}

export function bindModalOverlayQuickClose(modalEl, onQuickOverlayClick) {
    const MODAL_OUTSIDE_CLICK_MAX_MS = 220;
    if (!modalEl || typeof onQuickOverlayClick !== "function") return;

    let outsidePressStartedAt = 0;
    let outsidePressStartedOnOverlay = false;
    let activeTouchScrollContainer = null;
    let lastTouchClientY = 0;

    modalEl.addEventListener("pointerdown", (e) => {
        if (e.target === modalEl) {
            outsidePressStartedOnOverlay = true;
            outsidePressStartedAt = performance.now();
        } else {
            outsidePressStartedOnOverlay = false;
            outsidePressStartedAt = 0;
        }
    });

    modalEl.addEventListener("click", (e) => {
        if (e.target !== modalEl) return;
        if (!outsidePressStartedOnOverlay || outsidePressStartedAt <= 0) return;

        const pressDuration = performance.now() - outsidePressStartedAt;
        outsidePressStartedOnOverlay = false;
        outsidePressStartedAt = 0;
        if (pressDuration > MODAL_OUTSIDE_CLICK_MAX_MS) return;

        onQuickOverlayClick();
    });

    modalEl.addEventListener("touchmove", (e) => {
        if (!isMobileViewport()) return;
        if (!e.touches || !e.touches.length) return;

        const currentY = e.touches[0].clientY;
        const deltaY = currentY - lastTouchClientY;
        lastTouchClientY = currentY;

        if (e.target === modalEl) {
            e.preventDefault();
            return;
        }

        const scrollContainer = findScrollableModalAncestor(e.target, modalEl) || activeTouchScrollContainer;
        if (!scrollContainer || !modalEl.contains(scrollContainer)) {
            e.preventDefault();
            return;
        }

        if (!canContinueTouchScroll(scrollContainer, deltaY)) {
            e.preventDefault();
        }
    }, { passive: false });

    modalEl.addEventListener("wheel", (e) => {
        if (e.target !== modalEl) return;
        e.preventDefault();
    }, { passive: false });

    modalEl.addEventListener("touchstart", (e) => {
        if (!isMobileViewport()) return;
        if (!e.touches || !e.touches.length) return;
        lastTouchClientY = e.touches[0].clientY;
        activeTouchScrollContainer = findScrollableModalAncestor(e.target, modalEl);
    }, { passive: true });

    modalEl.addEventListener("touchend", () => {
        activeTouchScrollContainer = null;
        lastTouchClientY = 0;
    }, { passive: true });

    modalEl.addEventListener("touchcancel", () => {
        activeTouchScrollContainer = null;
        lastTouchClientY = 0;
    }, { passive: true });
}

export function setupShareUI(refreshRadarVisuals) {
    const shareBtn = getCachedElementById("shareBtn");
    const shareModal = getCachedElementById("shareModal");
    const closeShareModal = getCachedElementById("closeShareModal");
    const screenshotContainer = getCachedElementById("screenshotContainer");
    const shareScreenshotStatus = getCachedElementById("shareScreenshotStatus");
    const downloadImageBtn = getCachedElementById("downloadImageBtn");
    const copyLinkBtn = getCachedElementById("copyLinkBtn");
    const mobileCopyLinkBtn = getCachedElementById("mobileCopyLinkBtn");
    const mobileShareBtn = getCachedElementById("mobileShareBtn");
    let currentScreenshotCanvas = null;
    let currentScreenshotImageUrl = "";
    let currentScreenshotCacheKey = "";
    let activeScreenshotPromise = null;
    let activeScreenshotPromiseKey = "";
    let latestScreenshotRequestId = 0;
    let shareServiceTemporarilyDisabled = false;

    const shouldUseShareService = ({ force = false } = {}) => (
        hasShareServiceConfigured() && (force || !shareServiceTemporarilyDisabled)
    );

    const generateCanvasResult = (cacheKey, promiseKey, { offscreenOnly = false } = {}) => generateShareScreenshotCanvas({ offscreenOnly })
        .then((canvas) => {
            if (activeScreenshotPromiseKey === promiseKey) {
                currentScreenshotCanvas = canvas;
                currentScreenshotImageUrl = "";
                currentScreenshotCacheKey = cacheKey;
            }
            return { kind: "canvas", value: canvas };
        });

    const getScreenshotForKey = (cacheKey, { force = false, background = false } = {}) => {
        const useShareService = shouldUseShareService({ force });
        const useOffscreenLocalCapture = background && !isMobileViewport();

        if (useShareService) {
            if (!force && currentScreenshotImageUrl && currentScreenshotCacheKey === cacheKey) {
                return Promise.resolve({ kind: "image", value: currentScreenshotImageUrl });
            }

            if (!force && activeScreenshotPromise && activeScreenshotPromiseKey === cacheKey) {
                return activeScreenshotPromise;
            }

            const promiseKey = force ? `${cacheKey}::refresh::${Date.now()}` : cacheKey;
            activeScreenshotPromiseKey = promiseKey;
            const requestPromise = requestShareServicePreviewUrl()
                .then((imageUrl) => {
                    shareServiceTemporarilyDisabled = false;
                    if (activeScreenshotPromiseKey === promiseKey) {
                        currentScreenshotCanvas = null;
                        currentScreenshotImageUrl = imageUrl;
                        currentScreenshotCacheKey = cacheKey;
                    }
                    return { kind: "image", value: imageUrl };
                })
                .catch((error) => {
                    shareServiceTemporarilyDisabled = true;
                    console.warn("Share service unavailable; using in-browser share renderer.", error);
                    return generateCanvasResult(cacheKey, promiseKey, { offscreenOnly: useOffscreenLocalCapture });
                })
                .finally(() => {
                    if (activeScreenshotPromise === requestPromise) {
                        activeScreenshotPromise = null;
                        activeScreenshotPromiseKey = "";
                    }
                });

            activeScreenshotPromise = requestPromise;
            return requestPromise;
        }

        if (!force && currentScreenshotCanvas && currentScreenshotCacheKey === cacheKey) {
            currentScreenshotImageUrl = "";
            return Promise.resolve({ kind: "canvas", value: currentScreenshotCanvas });
        }

        if (!force && activeScreenshotPromise && activeScreenshotPromiseKey === cacheKey) {
            return activeScreenshotPromise;
        }

        const promiseKey = force ? `${cacheKey}::refresh::${Date.now()}` : cacheKey;
        activeScreenshotPromiseKey = promiseKey;
        const requestPromise = generateCanvasResult(cacheKey, promiseKey, { offscreenOnly: useOffscreenLocalCapture })
            .finally(() => {
                if (activeScreenshotPromise === requestPromise) {
                    activeScreenshotPromise = null;
                    activeScreenshotPromiseKey = "";
                }
            });

        activeScreenshotPromise = requestPromise;
        return requestPromise;
    };

    const updateScreenshotUiState = ({ busy = false, tone = "idle", message = "" } = {}) => {
        setShareStatus(shareScreenshotStatus, tone, message);
        syncScreenshotActionState({ downloadImageBtn }, busy, !!(currentScreenshotCanvas || currentScreenshotImageUrl));
    };

    const requestScreenshotPreview = async ({ force = false } = {}) => {
        if (shareModal) shareModal.classList.add("show");
        RankingUI.updateAllRatings(refreshRadarVisuals);
        const useShareService = shouldUseShareService({ force });
        const effectiveForce = force || useShareService;
        const loadingStartedAt = Date.now();

        const cacheKey = buildScreenshotCacheKey();
        const requestId = ++latestScreenshotRequestId;
        const hasCachedScreenshot = !effectiveForce
            && currentScreenshotCacheKey === cacheKey
            && !!(currentScreenshotCanvas || currentScreenshotImageUrl);

        if (!hasCachedScreenshot) {
            renderLoadingScreenshot(screenshotContainer);
            updateScreenshotUiState({ busy: true, tone: "loading", message: t("generating_screenshot") });
        }

        if (effectiveForce) {
            currentScreenshotCanvas = null;
            currentScreenshotImageUrl = "";
            currentScreenshotCacheKey = "";
        }

        if (!effectiveForce && currentScreenshotCacheKey === cacheKey) {
            if (currentScreenshotCanvas) {
                renderScreenshotCanvas(screenshotContainer, currentScreenshotCanvas);
            } else if (currentScreenshotImageUrl) {
                await renderScreenshotImage(screenshotContainer, currentScreenshotImageUrl);
            }
            updateScreenshotUiState({ busy: false, tone: "ready", message: "" });
            return;
        }

        if (currentScreenshotCacheKey !== cacheKey) {
            currentScreenshotCanvas = null;
            currentScreenshotImageUrl = "";
            currentScreenshotCacheKey = "";
        }

        try {
            const result = await getScreenshotForKey(cacheKey, { force: effectiveForce });
            if (requestId !== latestScreenshotRequestId) return;
            const remainingLoadingMs = getMinScreenshotLoadingMs() - (Date.now() - loadingStartedAt);
            if (remainingLoadingMs > 0) {
                await delay(remainingLoadingMs);
                if (requestId !== latestScreenshotRequestId) return;
            }
            if (result.kind === "image") {
                await renderScreenshotImage(screenshotContainer, result.value);
            } else {
                renderScreenshotCanvas(screenshotContainer, result.value);
            }
            if (requestId !== latestScreenshotRequestId) return;
            updateScreenshotUiState({ busy: false, tone: "ready", message: "" });
        } catch (err) {
            if (requestId !== latestScreenshotRequestId) return;
            console.error("Screenshot error:", err);
            renderScreenshotError(screenshotContainer, err);
            updateScreenshotUiState({ busy: false, tone: "error", message: t("share_preview_failed") });
        }
    };

    if (shareBtn) {
        shareBtn.addEventListener("click", () => {
            requestScreenshotPreview({ force: false });
        });
    }

    if (mobileShareBtn) {
        mobileShareBtn.addEventListener("click", () => {
            requestScreenshotPreview({ force: false });
        });
    }

    if (screenshotContainer) {
        screenshotContainer.addEventListener("click", (e) => {
            const retryBtn = e.target && e.target.closest ? e.target.closest("[data-share-retry]") : null;
            if (!retryBtn) return;
            requestScreenshotPreview({ force: true });
        });
    }

    const globalModalObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            const target = mutation.target;
            if (target && target.classList && target.classList.contains("share-modal-overlay")) {
                syncGlobalModalScrollLock();
                syncGlobalModalTouchLock();
                return;
            }
        }
    });

    if (document.body) {
        globalModalObserver.observe(document.body, { subtree: true, attributes: true, attributeFilter: ["class"] });
        syncGlobalModalScrollLock();
        syncGlobalModalTouchLock();

        document.addEventListener("touchstart", (e) => {
            if (!isMobileViewport()) return;
            const activeOverlay = getActiveModalOverlay();
            if (!activeOverlay) return;
            if (!e.touches || !e.touches.length) return;
            activeGlobalModalTouchY = e.touches[0].clientY;
            activeGlobalModalTouchContainer = findScrollableModalAncestor(e.target, activeOverlay);
        }, { capture: true, passive: true });

        document.addEventListener("touchmove", (e) => {
            if (!shouldBlockGlobalModalTouchMove(e)) return;
            e.preventDefault();
        }, { capture: true, passive: false });

        document.addEventListener("touchend", () => {
            activeGlobalModalTouchContainer = null;
            activeGlobalModalTouchY = 0;
        }, { capture: true, passive: true });

        document.addEventListener("touchcancel", () => {
            activeGlobalModalTouchContainer = null;
            activeGlobalModalTouchY = 0;
        }, { capture: true, passive: true });
    }

    function closeShareModalQuick() {
        if (!shareModal) return;
        shareModal.classList.remove("show");
    }

    if (closeShareModal) closeShareModal.addEventListener("click", closeShareModalQuick);
    bindModalOverlayQuickClose(shareModal, closeShareModalQuick);

    if (downloadImageBtn) {
        downloadImageBtn.addEventListener("click", async () => {
            if (currentScreenshotImageUrl) {
                const link = document.createElement("a");
                link.href = currentScreenshotImageUrl;
                link.target = "_blank";
                link.rel = "noopener";
                link.click();
                return;
            }
            if (!currentScreenshotCanvas) return;
            try {
                const blob = await canvasToJpegBlob(currentScreenshotCanvas);
                const objectUrl = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.download = "benchmark-result.jpg";
                link.href = objectUrl;
                link.click();
                setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
            } catch (err) {
                console.error("Download image failed:", err);
            }
        });
    }

    if (copyLinkBtn || mobileCopyLinkBtn) {
        const copyFeedbackTimers = new WeakMap();
        const renderCopyLinkLabel = (el, labelText) => {
            if (!el) return;
            if (el === mobileCopyLinkBtn) {
                el.innerHTML = '<svg class="nav-icon mobile-link-icon" viewBox="0 0 24 24" width="14" height="14"><path d="M16 1H4c-1.1 0-2 .9-2 2v12h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg><span>' + labelText + "</span>";
            } else {
                el.textContent = labelText;
            }
        };
        const restoreCopyLabel = (el) => {
            if (!el) return;
            el.classList.remove("copy-success");
            renderCopyLinkLabel(el, t("copy_link"));
        };
        const showCopySuccessState = (el) => {
            if (!el) return;
            const successLabel = t("copied");
            const existingTimer = copyFeedbackTimers.get(el);
            if (existingTimer) clearTimeout(existingTimer);
            el.classList.add("copy-success");
            el.innerHTML = '<span class="copy-success-check">&#10003;</span>' + successLabel;
            const nextTimer = setTimeout(() => restoreCopyLabel(el), 1400);
            copyFeedbackTimers.set(el, nextTimer);
        };
        const copyHandler = async () => {
            await copyProfileLinkToClipboard();
        };

        if (copyLinkBtn) {
            copyLinkBtn.addEventListener("click", async () => {
                try {
                    await copyHandler();
                    if (!isMobileViewport()) {
                        showCopySuccessState(copyLinkBtn);
                    }
                } catch (err) {
                    console.error("Copy link failed:", err);
                    if (!isMobileViewport()) {
                        restoreCopyLabel(copyLinkBtn);
                    }
                }
            });
        }

        if (mobileCopyLinkBtn) {
            mobileCopyLinkBtn.addEventListener("click", async () => {
                try {
                    await copyHandler();
                    showCopySuccessState(mobileCopyLinkBtn);
                } catch (err) {
                    console.error("Mobile copy link failed:", err);
                    restoreCopyLabel(mobileCopyLinkBtn);
                }
            });
        }
    }

    updateScreenshotUiState({ busy: false, tone: "idle", message: "" });
}
