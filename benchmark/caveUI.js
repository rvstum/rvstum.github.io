import { state, getCurrentConfigState } from "./appState.js";
import { t } from "./i18n.js";
import { escapeHtml, isMobileViewport, getBenchmarkBasePath } from "./utils.js";
import { getCachedElementById } from "./utils/domUtils.js";
import { writeJson, CAVE_LINKS_STORAGE_KEY } from "./storage.js";
import { DEFAULT_MOUNT_CONFIG } from "./constants.js";
import { persistUserAndLocal } from "./persistence.js";

export function openImageViewerModal({ imageViewerModal, imageViewerImg, imageViewerTitle }, src, title = "") {
    if (!imageViewerModal || !imageViewerImg) return;
    imageViewerImg.src = src;
    if (imageViewerTitle) imageViewerTitle.textContent = title || "";
    imageViewerModal.classList.add("show");
}

export function closeImageViewerModal({ imageViewerModal, activeHighlightPreviewCard }) {
    if (imageViewerModal) imageViewerModal.classList.remove("show");
    if (activeHighlightPreviewCard && activeHighlightPreviewCard.classList) {
        activeHighlightPreviewCard.classList.remove("preview-opening");
    }
    return null;
}

function resolveRoot(root = document) {
    return root && typeof root.querySelectorAll === "function" ? root : document;
}

export function normalizeCellImagePaths(root = document) {
    const targetRoot = resolveRoot(root);
    const imgs = targetRoot.querySelectorAll(".rank-bar:nth-child(2) img");
    imgs.forEach((img) => {
        if (!img) return;
        const raw = img.getAttribute("src") || "";
        const match = raw.match(/cellimage_[0-9]+_[0-9]+\.jpg/i) || raw.match(/cellImage_[0-9]+_[0-9]+\.jpg/i);
        if (!match) return;

        const properCaseName = match[0].replace(/^cellimage_/i, "cellImage_");
        const lowerCaseName = properCaseName.replace(/^cellImage_/, "cellimage_");
        const candidates = [
            `/icons/${properCaseName}`,
            `${getBenchmarkBasePath()}/icons/${properCaseName}`,
            `/icons/${lowerCaseName}`,
            `${getBenchmarkBasePath()}/icons/${lowerCaseName}`
        ];

        let candidateIndex = 0;
        const applyCandidate = (index) => {
            if (index >= candidates.length) return;
            candidateIndex = index;
            const nextSrc = candidates[index];
            if (img.getAttribute("src") !== nextSrc) {
                img.setAttribute("src", nextSrc);
            }
        };

        applyCandidate(0);
        if (img.dataset.cellFallbackBound === "1") return;
        img.dataset.cellFallbackBound = "1";
        img.addEventListener("error", () => {
            applyCandidate(candidateIndex + 1);
        });
        if (img.complete && img.naturalWidth === 0) {
            applyCandidate(candidateIndex + 1);
        }
    });
}

function openDefaultImageViewer(src, title = "") {
    openImageViewerModal(
        {
            imageViewerModal: getCachedElementById("imageViewerModal"),
            imageViewerImg: getCachedElementById("imageViewerImg"),
            imageViewerTitle: getCachedElementById("imageViewerTitle")
        },
        src,
        title
    );
}

export function bindCaveImageViewer(options = {}) {
    const root = resolveRoot(options.root);
    const doc = root.ownerDocument || document;
    const openImageViewer = typeof options.openImageViewer === "function"
        ? options.openImageViewer
        : openDefaultImageViewer;
    const imageViewerModal = options.imageViewerModal || getCachedElementById("imageViewerModal");
    const mobileViewportChecker = typeof options.isMobileViewport === "function"
        ? options.isMobileViewport
        : isMobileViewport;

    const caveRows = root.querySelectorAll(".rank-bar:nth-child(2)");
    caveRows.forEach((row) => {
        if (!row) return;
        const img = row.querySelector("img");
        if (img) img.classList.add("cave-cell-image");
    });

    if (bindCaveImageViewer._bound) return;
    bindCaveImageViewer._bound = true;
    let activeHoverImg = null;

    const hasVisibleBlockingOverlay = () => {
        const overlays = doc.querySelectorAll(".share-modal-overlay.show");
        for (const overlay of overlays) {
            if (!overlay) continue;
            const style = window.getComputedStyle(overlay);
            if (style.display === "none" || style.visibility === "hidden") continue;
            if (Number(style.opacity || "1") <= 0.01) continue;
            const rect = overlay.getBoundingClientRect();
            if (rect.width <= 0 || rect.height <= 0) continue;
            return true;
        }
        return false;
    };

    const findImageAtPoint = (clientX, clientY) => {
        const images = root.querySelectorAll(".rank-bar:nth-child(2) img.cave-cell-image");
        for (const img of images) {
            if (!img || !img.getBoundingClientRect) continue;
            const rect = img.getBoundingClientRect();
            if (rect.width <= 0 || rect.height <= 0) continue;
            if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
                return img;
            }
        }
        return null;
    };

    root.addEventListener("click", (e) => {
        if (!e) return;
        if (hasVisibleBlockingOverlay()) return;
        if (imageViewerModal && imageViewerModal.classList.contains("show")) return;
        if (e.target && e.target.closest && e.target.closest(".cave-play-wrapper, .cave-play-icon, .cave-play-edit, .cave-play-panel")) return;
        const img = findImageAtPoint(e.clientX, e.clientY);
        if (!img) return;
        const src = img.getAttribute("src");
        if (!src) return;
        e.preventDefault();
        e.stopPropagation();
        const row = img.closest(".rank-bar:nth-child(2)");
        const title = row ? (row.textContent || "").trim() : "";
        openImageViewer(src, title);
    }, true);

    root.addEventListener("mousemove", (e) => {
        if (!e || mobileViewportChecker()) return;
        if (hasVisibleBlockingOverlay()) {
            if (activeHoverImg && activeHoverImg.classList) activeHoverImg.classList.remove("cave-img-hover");
            activeHoverImg = null;
            return;
        }
        const img = findImageAtPoint(e.clientX, e.clientY);
        if (img === activeHoverImg) return;
        if (activeHoverImg && activeHoverImg.classList) activeHoverImg.classList.remove("cave-img-hover");
        activeHoverImg = img || null;
        if (activeHoverImg && activeHoverImg.classList) activeHoverImg.classList.add("cave-img-hover");
    }, true);

    root.addEventListener("mouseleave", () => {
        if (activeHoverImg && activeHoverImg.classList) activeHoverImg.classList.remove("cave-img-hover");
        activeHoverImg = null;
    }, true);
}

const initializedCaveRoots = typeof WeakSet !== "undefined" ? new WeakSet() : null;

function getCaveConfigKey() {
    const current = getCurrentConfigState() || {};
    const platform = current.platform || "Mobile";
    const time = current.time || "5 Min";
    const stat = current.stat || "Baddy Kills";
    const mount = (current.mount || DEFAULT_MOUNT_CONFIG).toString().trim() || DEFAULT_MOUNT_CONFIG;
    return `${platform}|${time}|${stat}|${mount}`;
}

async function persistSavedCaveLinks() {
    await persistUserAndLocal({
        remoteData: {
            caveLinks: state.savedCaveLinks
        },
        localWrite: () => {
            writeJson(CAVE_LINKS_STORAGE_KEY, state.savedCaveLinks);
        },
        label: "cave links"
    });
}

export function setupCavePlayEditors(root = document) {
    const targetRoot = resolveRoot(root);
    const doc = targetRoot.ownerDocument || document;
    if (initializedCaveRoots && initializedCaveRoots.has(targetRoot)) return;
    if (!initializedCaveRoots && setupCavePlayEditors._initialized) return;

    const wrappers = Array.from(targetRoot.querySelectorAll(".cave-play-wrapper"));
    if (!wrappers.length) return;
    if (initializedCaveRoots) initializedCaveRoots.add(targetRoot);
    else setupCavePlayEditors._initialized = true;

    let activeWrapper = null;
    let closeTimer = null;
    let suppressNextOutsideDismissClick = false;
    const floatingPanel = document.createElement("div");
    floatingPanel.className = "cave-play-panel floating";
    floatingPanel.innerHTML = `
        <div class="cave-play-panel-body">
            <input type="url" placeholder="https://youtu.be/..." />
            <div class="cave-play-error"></div>
            <button type="button">${escapeHtml(t("save"))}</button>
        </div>
    `;
    doc.body.appendChild(floatingPanel);

    const floatingInput = floatingPanel.querySelector("input");
    const floatingSave = floatingPanel.querySelector("button");
    const floatingError = floatingPanel.querySelector(".cave-play-error");

    const setWrapperLinkState = (wrapper, url) => {
        if (!wrapper) return;
        const safeUrl = typeof url === "string" ? url.trim() : "";
        wrapper.dataset.youtube = safeUrl;
        wrapper.classList.toggle("has-link", !!safeUrl);
        const anchor = wrapper.querySelector(".cave-play-anchor");
        const caveName = wrapper.dataset.caveName || "Cave";
        if (anchor) {
            anchor.setAttribute(
                "aria-label",
                safeUrl ? `Open ${caveName} YouTube link` : `Add ${caveName} YouTube link`
            );
        }
    };

    const closeFloating = (instant = false) => {
        if (closeTimer) {
            clearTimeout(closeTimer);
            closeTimer = null;
        }
        if (instant) {
            floatingPanel.classList.remove("open", "closing");
        } else if (floatingPanel.classList.contains("open")) {
            floatingPanel.classList.remove("open");
            floatingPanel.classList.add("closing");
            closeTimer = setTimeout(() => {
                floatingPanel.classList.remove("closing");
            }, 190);
        } else {
            floatingPanel.classList.remove("closing");
        }
        if (activeWrapper) {
            activeWrapper.classList.remove("panel-open");
            activeWrapper = null;
        }
        targetRoot.querySelectorAll(".cave-play-wrapper.panel-open").forEach((el) => {
            el.classList.remove("panel-open");
        });
        targetRoot.querySelectorAll(".container.cave-panel-open").forEach((container) => {
            container.classList.remove("cave-panel-open");
        });
    };

    const positionFloating = () => {
        if (!activeWrapper) return;
        const anchor = activeWrapper.querySelector(".cave-play-anchor") || activeWrapper;
        const rect = anchor.getBoundingClientRect();
        const panelWidth = floatingPanel.offsetWidth || floatingPanel.getBoundingClientRect().width;
        const panelHeight = floatingPanel.offsetHeight || floatingPanel.getBoundingClientRect().height;
        const pageX = window.pageXOffset || document.documentElement.scrollLeft || 0;
        const pageY = window.pageYOffset || document.documentElement.scrollTop || 0;
        let left = (rect.left + (rect.width / 2) - (panelWidth / 2)) + pageX;
        left = Math.max(pageX + 8, Math.min(left, pageX + window.innerWidth - panelWidth - 8));
        let top = rect.bottom + 8 + pageY;
        const maxTop = pageY + window.innerHeight - panelHeight - 8;
        if (top > maxTop) {
            top = Math.max(pageY + 8, rect.top - panelHeight - 8 + pageY);
        }
        floatingPanel.style.left = `${left}px`;
        floatingPanel.style.top = `${top}px`;
    };

    const openFloating = (wrapper) => {
        if (state.isViewMode) return;
        closeFloating(true);
        doc.dispatchEvent(new CustomEvent("benchmark:clear-row-selection"));
        activeWrapper = wrapper;
        floatingInput.value = wrapper.dataset.youtube || "";
        floatingPanel.classList.remove("closing");
        floatingPanel.classList.add("open");
        wrapper.classList.add("panel-open");
        const container = wrapper.closest(".container");
        if (container) container.classList.add("cave-panel-open");
        requestAnimationFrame(() => {
            positionFloating();
            floatingInput.focus();
            floatingInput.select();
        });
    };

    window.addEventListener("resize", () => {
        if (activeWrapper) requestAnimationFrame(positionFloating);
    });
    window.addEventListener("scroll", () => {
        if (activeWrapper) requestAnimationFrame(positionFloating);
    }, true);

    floatingSave.addEventListener("click", (e) => {
        e.preventDefault();
        if (!activeWrapper) return;
        const url = floatingInput.value.trim();

        const isYoutubeLink = (value) => {
            if (!value) return true;
            const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
            return youtubeRegex.test(value);
        };

        if (!isYoutubeLink(url)) {
            if (floatingError) {
                floatingError.textContent = "Please enter a valid YouTube link.";
                floatingError.classList.add("cave-play-error-visible");
            }
            return;
        }

        if (floatingError) floatingError.classList.remove("cave-play-error-visible");

        const configKey = getCaveConfigKey();
        const index = activeWrapper.dataset.index;

        if (url) {
            setWrapperLinkState(activeWrapper, url);
            if (!state.savedCaveLinks[configKey]) state.savedCaveLinks[configKey] = {};
            state.savedCaveLinks[configKey][index] = url;
        } else {
            setWrapperLinkState(activeWrapper, "");
            if (state.savedCaveLinks[configKey]) delete state.savedCaveLinks[configKey][index];
        }
        persistSavedCaveLinks().catch(console.error);
        closeFloating();
    });

    floatingInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            floatingSave.click();
        } else if (e.key === "Escape") {
            e.preventDefault();
            closeFloating();
        }
    });

    const handleWrapperClick = (wrapper) => {
        const url = (wrapper.dataset.youtube || "").trim();
        if (!url) return false;
        window.open(url, "_blank", "noopener,noreferrer");
        return true;
    };

    wrappers.forEach((wrapper, index) => {
        const anchor = wrapper.querySelector(".cave-play-anchor");
        const icon = wrapper.querySelector(".cave-play-icon");
        const editBtn = wrapper.querySelector(".cave-play-edit");
        if (!anchor || !icon || !editBtn) return;

        const wrapperIndex = typeof wrapper.dataset.index === "string" && wrapper.dataset.index !== ""
            ? wrapper.dataset.index
            : String(index);
        wrapper.dataset.index = wrapperIndex;
        editBtn.textContent = t("edit_hint");

        const setIconHot = (isHot) => {
            const nextHot = !!isHot;
            wrapper.classList.toggle("is-hot", nextHot);
            const container = wrapper.closest(".container");
            if (container) container.classList.toggle("cave-tooltip-hot", nextHot);
        };
        wrapper.addEventListener("mouseenter", () => setIconHot(true));
        wrapper.addEventListener("mouseleave", () => setIconHot(false));
        wrapper.addEventListener("selectstart", (e) => {
            e.preventDefault();
        });
        wrapper.addEventListener("dragstart", (e) => {
            e.preventDefault();
        });

        let longPressTimer = null;
        let longPressTriggered = false;

        const startLongPress = () => {
            if (state.isViewMode) return;
            longPressTriggered = false;
            longPressTimer = setTimeout(() => {
                longPressTriggered = true;
                openFloating(wrapper);
                if (navigator.vibrate) navigator.vibrate(50);
                setTimeout(() => { longPressTriggered = false; }, 1000);
            }, 500);
        };

        const cancelLongPress = () => {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
        };

        wrapper.addEventListener("touchstart", startLongPress, { passive: true });
        wrapper.addEventListener("touchend", cancelLongPress);
        wrapper.addEventListener("touchmove", cancelLongPress);
        wrapper.addEventListener("touchcancel", cancelLongPress);

        wrapper.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (state.isViewMode) return;
            if (!longPressTriggered) {
                openFloating(wrapper);
            }
        });

        anchor.addEventListener("click", (e) => {
            if (longPressTriggered) {
                e.preventDefault();
                e.stopPropagation();
                longPressTriggered = false;
                return;
            }
            e.preventDefault();
            e.stopPropagation();
            if (!handleWrapperClick(wrapper) && !state.isViewMode) {
                openFloating(wrapper);
            }
        });

        const configKey = getCaveConfigKey();
        const savedUrl = state.savedCaveLinks[configKey] && state.savedCaveLinks[configKey][wrapperIndex];
        setWrapperLinkState(wrapper, savedUrl || "");

        editBtn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (state.isViewMode) return;
            if (activeWrapper === wrapper) {
                closeFloating();
            } else {
                openFloating(wrapper);
            }
        });
    });

    doc.addEventListener("click", (e) => {
        if (e.target.closest(".cave-play-wrapper")) return;
        if (e.target.closest(".cave-play-panel")) return;
        closeFloating();
    });

    doc.addEventListener("pointerdown", (e) => {
        if (!activeWrapper) return;
        if (!e.target || !e.target.closest) return;
        if (e.target.closest(".cave-play-panel")) return;
        if (e.target.closest(".cave-play-wrapper.panel-open")) return;
        suppressNextOutsideDismissClick = true;
        closeFloating(true);
        e.preventDefault();
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
    }, true);

    doc.addEventListener("click", (e) => {
        if (!suppressNextOutsideDismissClick) return;
        suppressNextOutsideDismissClick = false;
        e.preventDefault();
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
    }, true);

    doc.addEventListener("focusin", (e) => {
        if (!isMobileViewport()) return;
        if (!activeWrapper) return;
        if (!e.target || !e.target.closest) return;
        if (e.target.closest(".score-input-wrapper")) {
            closeFloating(true);
        }
    }, true);
}
