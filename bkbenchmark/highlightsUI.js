import { compressImageFileToDataUrl } from "./imageUtils.js";
import {
    resetHighlightModalFields,
    showHighlightErrorMessage,
    setModalVisibility,
    openImageViewerModal,
    closeImageViewerModal
} from "./caveUI.js";
import { getCachedElementById, setHidden } from "./utils/domUtils.js";
import { makeLikedHighlightKey } from "./userService.js";

export function createHighlightsController(options = {}) {
    const {
        state,
        auth,
        t,
        escapeHtml,
        saveHighlights,
        toggleHighlightLike,
        showConfirmModal,
        bindModalOverlayQuickClose,
        getLoginUrl
    } = options;

    const addHighlightBtn = getCachedElementById("addHighlightBtn");
    const highlightsGrid = getCachedElementById("highlightsGrid");
    const highlightModal = getCachedElementById("highlightModal");
    const closeHighlightModalBtn = getCachedElementById("closeHighlightModal");
    const cancelHighlightBtn = getCachedElementById("cancelHighlightBtn");
    const saveHighlightBtn = getCachedElementById("saveHighlightBtn");
    const highlightUploadArea = getCachedElementById("highlightUploadArea");
    const highlightUploadText = getCachedElementById("highlightUploadText");
    const highlightPreviewImg = getCachedElementById("highlightPreviewImg");
    const highlightFileInput = getCachedElementById("highlightFileInput");
    const highlightTitleInput = getCachedElementById("highlightTitleInput");
    const highlightDescInput = getCachedElementById("highlightDescInput");
    const highlightErrorMessage = getCachedElementById("highlightErrorMessage");
    const imageViewerModal = getCachedElementById("imageViewerModal");
    const imageViewerImg = getCachedElementById("imageViewerImg");
    const imageViewerTitle = getCachedElementById("imageViewerTitle");
    const closeImageViewerModalBtn = getCachedElementById("closeImageViewerModal");

    let highlightDraftImage = "";
    let editingHighlightIndex = -1;
    let activeHighlightPreviewCard = null;
    const pendingLikeUpdates = new Set();

    function ensureHighlightLikesState() {
        if (!state || !state.highlightLikes || typeof state.highlightLikes !== "object" || Array.isArray(state.highlightLikes)) {
            state.highlightLikes = {};
            return state.highlightLikes;
        }
        return state.highlightLikes;
    }

    function ensureLikedHighlightsState() {
        if (!state || !state.likedHighlights || typeof state.likedHighlights !== "object" || Array.isArray(state.likedHighlights)) {
            state.likedHighlights = {};
            return state.likedHighlights;
        }
        return state.likedHighlights;
    }

    function normalizeHighlightLikesMap(rawValue) {
        if (!rawValue || typeof rawValue !== "object" || Array.isArray(rawValue)) return {};
        const normalized = {};
        Object.entries(rawValue).forEach(([highlightId, rawEntry]) => {
            if (typeof highlightId !== "string" || !highlightId.trim()) return;
            const entry = rawEntry && typeof rawEntry === "object" && !Array.isArray(rawEntry) ? rawEntry : {};
            const likedByRaw = entry.likedBy;
            const likedBy = {};
            if (Array.isArray(likedByRaw)) {
                likedByRaw.forEach((uid) => {
                    if (typeof uid !== "string" || !uid.trim()) return;
                    likedBy[uid] = true;
                });
            } else if (likedByRaw && typeof likedByRaw === "object" && !Array.isArray(likedByRaw)) {
                Object.entries(likedByRaw).forEach(([uid, liked]) => {
                    if (typeof uid !== "string" || !uid.trim()) return;
                    if (liked === true) likedBy[uid] = true;
                });
            }
            normalized[highlightId.trim()] = {
                count: Object.keys(likedBy).length,
                likedBy
            };
        });
        return normalized;
    }

    function getHighlightOwnerUid() {
        if (state.isViewMode && state.activeViewProfileContext && state.activeViewProfileContext.uid) {
            return String(state.activeViewProfileContext.uid).trim();
        }
        return getViewerUid();
    }

    function createHighlightId() {
        const rand = Math.random().toString(36).slice(2, 10);
        return `hl_${Date.now().toString(36)}_${rand}`;
    }

    function sanitizeLegacySegment(value) {
        const text = (value || "").toString().toLowerCase();
        const cleaned = text.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
        return cleaned || "item";
    }

    function getLegacyHighlightId(item, index) {
        const createdAt = Number(item && item.createdAt);
        if (Number.isFinite(createdAt) && createdAt > 0) {
            return `hl_legacy_${Math.trunc(createdAt)}`;
        }
        const updatedAt = Number(item && item.updatedAt);
        const stableTime = Number.isFinite(updatedAt) && updatedAt > 0 ? Math.trunc(updatedAt) : 0;
        const titlePart = sanitizeLegacySegment(item && item.title);
        return `hl_legacy_${stableTime}_${titlePart}_${index}`;
    }

    function getResolvedHighlightId(item, index) {
        const directId = item && typeof item.id === "string" ? item.id.trim() : "";
        if (directId) return directId;
        return getLegacyHighlightId(item, index);
    }

    async function persistHighlights() {
        if (state.isViewMode) return;
        if (typeof saveHighlights === "function") {
            await saveHighlights();
        }
    }

    function normalizeHighlightStateForRender() {
        if (!Array.isArray(state.userHighlights)) {
            state.userHighlights = [];
        }

        const normalizedLikes = normalizeHighlightLikesMap(ensureHighlightLikesState());
        state.highlightLikes = normalizedLikes;

        if (state.userHighlights.length === 0) return;

        let highlightsChanged = false;
        let likesChanged = false;
        const likesMap = { ...state.highlightLikes };

        const nextHighlights = state.userHighlights.map((rawItem, index) => {
            if (!rawItem || typeof rawItem !== "object") return rawItem;
            const item = { ...rawItem };
            const currentId = typeof item.id === "string" ? item.id.trim() : "";
            if (currentId) {
                if (item.id !== currentId) {
                    item.id = currentId;
                    highlightsChanged = true;
                }
                return item;
            }

            if (state.isViewMode) return item;

            const legacyId = getLegacyHighlightId(item, index);
            const newId = createHighlightId();
            item.id = newId;
            highlightsChanged = true;

            if (Object.prototype.hasOwnProperty.call(likesMap, legacyId) && !Object.prototype.hasOwnProperty.call(likesMap, newId)) {
                likesMap[newId] = likesMap[legacyId];
                delete likesMap[legacyId];
                likesChanged = true;
            }

            return item;
        });

        if (highlightsChanged) {
            state.userHighlights = nextHighlights;
        }
        if (likesChanged) {
            state.highlightLikes = normalizeHighlightLikesMap(likesMap);
        }

        if ((highlightsChanged || likesChanged) && !state.isViewMode) {
            persistHighlights().catch((err) => {
                console.error("Error migrating highlight metadata:", err);
            });
        }
    }

    function resetHighlightModal() {
        highlightDraftImage = "";
        editingHighlightIndex = -1;
        resetHighlightModalFields({
            highlightTitleInput,
            highlightDescInput,
            highlightPreviewImg,
            highlightUploadText,
            highlightFileInput,
            highlightErrorMessage
        });
    }

    function showHighlightError(message) {
        showHighlightErrorMessage(highlightErrorMessage, message);
    }

    function closeHighlightModalUI() {
        setModalVisibility(highlightModal, false);
    }

    function openHighlightModal(index = -1) {
        if (!highlightModal || state.isViewMode) return;
        resetHighlightModal();
        editingHighlightIndex = Number.isInteger(index) ? index : -1;
        if (editingHighlightIndex >= 0 && state.userHighlights[editingHighlightIndex]) {
            const existing = state.userHighlights[editingHighlightIndex];
            highlightDraftImage = existing.image || "";
            if (highlightTitleInput) highlightTitleInput.value = existing.title || "";
            if (highlightDescInput) highlightDescInput.value = existing.description || "";
            if (highlightPreviewImg && highlightDraftImage) {
                highlightPreviewImg.src = highlightDraftImage;
                setHidden(highlightPreviewImg, false);
            }
            if (highlightUploadText) {
                setHidden(highlightUploadText, !!highlightDraftImage);
            }
        }
        highlightModal.classList.add("show");
    }

    function openImageViewer(src, title = "") {
        document.body.classList.add("highlight-viewer-open");
        openImageViewerModal({ imageViewerModal, imageViewerImg, imageViewerTitle }, src, title);
    }

    function closeImageViewerModalUI() {
        document.body.classList.remove("highlight-viewer-open");
        activeHighlightPreviewCard = closeImageViewerModal({
            imageViewerModal,
            activeHighlightPreviewCard
        });
    }

    function getViewerUid() {
        return auth && auth.currentUser && auth.currentUser.uid ? auth.currentUser.uid : "";
    }

    function readLikeState(highlightId) {
        const likesMap = normalizeHighlightLikesMap(ensureHighlightLikesState());
        if (state.highlightLikes !== likesMap) {
            state.highlightLikes = likesMap;
        }
        const entry = likesMap[highlightId] || { count: 0, likedBy: {} };
        const likedBy = entry.likedBy && typeof entry.likedBy === "object" ? entry.likedBy : {};
        const viewerUid = getViewerUid();
        const ownerUid = getHighlightOwnerUid();
        const isOwnHighlight = !!(viewerUid && ownerUid && viewerUid === ownerUid);
        const countableLikedBy = { ...likedBy };
        if (ownerUid && countableLikedBy[ownerUid] === true) {
            delete countableLikedBy[ownerUid];
        }
        let count = Object.keys(countableLikedBy).length;
        const likedHighlights = ensureLikedHighlightsState();
        const likeKey = makeLikedHighlightKey(ownerUid, highlightId);
        const likedFromOwner = !!(viewerUid && !isOwnHighlight && countableLikedBy[viewerUid] === true);
        const likedFromFallback = !!(!isOwnHighlight && likedHighlights[likeKey]);
        if (likedFromFallback && !likedFromOwner) {
            count += 1;
        }
        return {
            likeKey,
            count,
            liked: likedFromOwner || likedFromFallback,
            isOwnHighlight
        };
    }

    function setLikeStateLocally(highlightId, likerUid, shouldLike) {
        const normalized = normalizeHighlightLikesMap(ensureHighlightLikesState());
        const entry = normalized[highlightId] || { count: 0, likedBy: {} };
        const likedBy = entry.likedBy && typeof entry.likedBy === "object" ? { ...entry.likedBy } : {};
        if (shouldLike) likedBy[likerUid] = true;
        else delete likedBy[likerUid];
        normalized[highlightId] = {
            count: Object.keys(likedBy).length,
            likedBy
        };
        state.highlightLikes = normalized;
        return normalized[highlightId];
    }

    function removeLikeStateForHighlight(item, index) {
        const likesMap = normalizeHighlightLikesMap(ensureHighlightLikesState());
        const resolvedId = getResolvedHighlightId(item, index);
        const legacyId = getLegacyHighlightId(item, index);
        let changed = false;
        if (Object.prototype.hasOwnProperty.call(likesMap, resolvedId)) {
            delete likesMap[resolvedId];
            changed = true;
        }
        if (legacyId !== resolvedId && Object.prototype.hasOwnProperty.call(likesMap, legacyId)) {
            delete likesMap[legacyId];
            changed = true;
        }
        if (changed) {
            state.highlightLikes = likesMap;
        }
    }

    function updateLikeControlUI(likeButton, likeCount, liked, count, shouldAnimate = false) {
        if (!likeButton || !likeCount) return;
        likeButton.classList.toggle("is-liked", !!liked);
        if (shouldAnimate && liked && state.isViewMode) {
            likeButton.classList.remove("like-burst");
            void likeButton.offsetWidth;
            likeButton.classList.add("like-burst");
            window.setTimeout(() => {
                likeButton.classList.remove("like-burst");
            }, 520);
        }
        likeCount.textContent = String(Math.max(0, Number(count) || 0));
    }

    function showLikeLoginRequiredPopup() {
        const title = t("highlight_like_login_required_title");
        const message = t("highlight_like_login_required_message");
        if (typeof showConfirmModal === "function") {
            showConfirmModal(title, message, () => {
                if (typeof getLoginUrl === "function") {
                    window.location.href = getLoginUrl();
                }
            });
            return;
        }
        alert(message);
    }

    async function handleLikeClick(event, item, index, likeButton, likeCount) {
        event.preventDefault();
        event.stopPropagation();

        const viewerUid = getViewerUid();
        if (!viewerUid) {
            showLikeLoginRequiredPopup();
            return;
        }

        const ownerUid = getHighlightOwnerUid();
        if (viewerUid && ownerUid && viewerUid === ownerUid) {
            return;
        }

        const highlightId = getResolvedHighlightId(item, index);
        if (!highlightId || pendingLikeUpdates.has(highlightId)) return;

        const before = readLikeState(highlightId);
        const nextLiked = !before.liked;
        const likedHighlights = ensureLikedHighlightsState();
        const beforeFallbackLike = !!likedHighlights[before.likeKey];
        const optimistic = setLikeStateLocally(highlightId, viewerUid, nextLiked);
        updateLikeControlUI(likeButton, likeCount, nextLiked, optimistic.count, nextLiked);

        pendingLikeUpdates.add(highlightId);
        likeButton.disabled = true;

        try {
            if (typeof toggleHighlightLike === "function") {
                const result = await toggleHighlightLike({
                    highlightId,
                    currentLiked: before.liked,
                    currentCount: before.count
                });
                const resolvedLikeKey = result && result.likeKey ? result.likeKey : before.likeKey;
                if (result && resolvedLikeKey) {
                    if (result.liked) likedHighlights[resolvedLikeKey] = true;
                    else delete likedHighlights[resolvedLikeKey];
                }
            } else if (!state.isViewMode) {
                await persistHighlights();
            }
        } catch (err) {
            console.error("Error toggling highlight like:", err);
            const rolledBack = setLikeStateLocally(highlightId, viewerUid, before.liked);
            if (before.likeKey) {
                if (beforeFallbackLike) likedHighlights[before.likeKey] = true;
                else delete likedHighlights[before.likeKey];
            }
            updateLikeControlUI(likeButton, likeCount, before.liked, rolledBack.count, false);
            if (typeof showConfirmModal === "function") {
                showConfirmModal(t("highlight_like_failed_title"), t("highlight_like_failed_message"), null);
            } else {
                alert(t("highlight_like_failed_message"));
            }
        } finally {
            const resolved = readLikeState(highlightId);
            updateLikeControlUI(likeButton, likeCount, resolved.liked, resolved.count, false);
            likeButton.disabled = false;
            pendingLikeUpdates.delete(highlightId);
        }
    }

    function renderHighlights() {
        if (!highlightsGrid) return;
        normalizeHighlightStateForRender();
        if (addHighlightBtn) addHighlightBtn.disabled = state.isViewMode;
        highlightsGrid.innerHTML = "";

        if (!Array.isArray(state.userHighlights) || state.userHighlights.length === 0) {
            highlightsGrid.classList.add("empty");
            const empty = document.createElement("div");
            empty.className = "highlights-empty-state";
            empty.textContent = t("highlights_empty");
            highlightsGrid.appendChild(empty);
            return;
        }

        highlightsGrid.classList.remove("empty");
        state.userHighlights.forEach((item, index) => {
            if (!item || !item.image) return;
            const cardShell = document.createElement("div");
            cardShell.className = "highlight-item-shell";

            const card = document.createElement("div");
            card.className = "highlight-item";

            const imageWrap = document.createElement("div");
            imageWrap.className = "highlight-img-container";
            imageWrap.innerHTML = `<img class="highlight-img" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title || "Highlight")}">`;
            let touchHoldTimer = null;
            let suppressClickUntil = 0;
            const HOLD_MS = 420;
            const clearTouchHoldTimer = () => {
                if (!touchHoldTimer) return;
                clearTimeout(touchHoldTimer);
                touchHoldTimer = null;
            };
            imageWrap.addEventListener("touchstart", () => {
                clearTouchHoldTimer();
                touchHoldTimer = setTimeout(() => {
                    suppressClickUntil = Date.now() + 900;
                }, HOLD_MS);
            }, { passive: true });
            imageWrap.addEventListener("touchmove", clearTouchHoldTimer, { passive: true });
            imageWrap.addEventListener("touchend", clearTouchHoldTimer, { passive: true });
            imageWrap.addEventListener("touchcancel", clearTouchHoldTimer, { passive: true });
            imageWrap.addEventListener("click", (e) => {
                if (Date.now() < suppressClickUntil) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
                activeHighlightPreviewCard = null;
                openImageViewer(item.image, item.title || "");
            });
            card.appendChild(imageWrap);

            if (!state.isViewMode) {
                const editBtn = document.createElement("button");
                editBtn.className = "highlight-edit-btn";
                editBtn.type = "button";
                editBtn.innerHTML = "&#9998;";
                editBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    const style = window.getComputedStyle(editBtn);
                    if (style.visibility === "hidden" || Number.parseFloat(style.opacity || "0") < 0.5 || style.pointerEvents === "none") return;
                    openHighlightModal(index);
                });
                card.appendChild(editBtn);

                const deleteBtn = document.createElement("button");
                deleteBtn.className = "highlight-delete-btn";
                deleteBtn.type = "button";
                deleteBtn.innerHTML = "&times;";
                deleteBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    const style = window.getComputedStyle(deleteBtn);
                    if (style.visibility === "hidden" || Number.parseFloat(style.opacity || "0") < 0.5 || style.pointerEvents === "none") return;
                    showConfirmModal(
                        t("highlight_delete_title"),
                        t("highlight_delete_confirm"),
                        async () => {
                            removeLikeStateForHighlight(item, index);
                            state.userHighlights.splice(index, 1);
                            renderHighlights();
                            try {
                                await persistHighlights();
                            } catch (err) {
                                console.error("Error deleting highlight:", err);
                            }
                        }
                    );
                });
                card.appendChild(deleteBtn);
            }

            const info = document.createElement("div");
            info.className = "highlight-info";
            const title = document.createElement("div");
            title.className = "highlight-title";
            title.textContent = item.title || "";
            info.appendChild(title);
            if (item.description) {
                const desc = document.createElement("div");
                desc.className = "highlight-desc";
                desc.textContent = item.description;
                info.appendChild(desc);
            }
            card.appendChild(info);

            const likeWrap = document.createElement("div");
            likeWrap.className = "highlight-like-wrap";
            const likeBtn = document.createElement("button");
            likeBtn.className = "highlight-like-btn";
            likeBtn.type = "button";
            likeBtn.setAttribute("aria-label", "Like highlight");
            likeBtn.innerHTML = '<span class="highlight-like-icon">&#10084;</span>';
            const likeCount = document.createElement("div");
            likeCount.className = "highlight-like-count";
            likeWrap.appendChild(likeBtn);
            likeWrap.appendChild(likeCount);
            cardShell.appendChild(likeWrap);

            const highlightId = getResolvedHighlightId(item, index);
            const likeState = readLikeState(highlightId);
            updateLikeControlUI(likeBtn, likeCount, likeState.liked, likeState.count, false);
            likeBtn.disabled = !!likeState.isOwnHighlight;
            likeBtn.classList.toggle("is-self-disabled", !!likeState.isOwnHighlight);
            likeBtn.addEventListener("click", (e) => {
                handleLikeClick(e, item, index, likeBtn, likeCount);
            });

            cardShell.appendChild(card);
            highlightsGrid.appendChild(cardShell);
        });
    }

    if (addHighlightBtn) {
        addHighlightBtn.addEventListener("click", () => {
            if (state.isViewMode) return;
            if (!auth.currentUser) {
                if (typeof getLoginUrl === "function") {
                    window.location.href = getLoginUrl();
                }
                return;
            }
            if ((state.userHighlights || []).length >= 6) {
                alert(t("highlight_limit_reached"));
                return;
            }
            openHighlightModal(-1);
        });
    }

    if (highlightUploadArea && highlightFileInput) {
        highlightUploadArea.addEventListener("click", () => {
            if (state.isViewMode) return;
            highlightFileInput.click();
        });

        highlightFileInput.addEventListener("change", async (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            try {
                const dataUrl = await compressImageFileToDataUrl(file, 1280, 0.82);
                highlightDraftImage = dataUrl || "";
                if (highlightPreviewImg && highlightDraftImage) {
                    highlightPreviewImg.src = highlightDraftImage;
                    setHidden(highlightPreviewImg, false);
                }
                if (highlightUploadText) setHidden(highlightUploadText, !!highlightDraftImage);
                if (highlightErrorMessage) {
                    highlightErrorMessage.textContent = "";
                    setHidden(highlightErrorMessage, true);
                }
            } catch (err) {
                console.error("Error preparing highlight image:", err);
                showHighlightError(t("highlight_upload_required_error"));
            }
        });
    }

    if (closeHighlightModalBtn) {
        closeHighlightModalBtn.addEventListener("click", closeHighlightModalUI);
    }
    if (cancelHighlightBtn) {
        cancelHighlightBtn.addEventListener("click", closeHighlightModalUI);
    }
    if (highlightModal && typeof bindModalOverlayQuickClose === "function") {
        bindModalOverlayQuickClose(highlightModal, closeHighlightModalUI);
    }

    if (saveHighlightBtn) {
        saveHighlightBtn.addEventListener("click", async () => {
            if (state.isViewMode) return;
            const title = (highlightTitleInput ? highlightTitleInput.value : "").trim();
            const description = (highlightDescInput ? highlightDescInput.value : "").trim();
            const image = highlightDraftImage || "";

            if (!title) {
                showHighlightError(t("highlight_title_required_error"));
                return;
            }
            if (!image) {
                showHighlightError(t("highlight_upload_required_error"));
                return;
            }

            const payload = {
                title,
                description,
                image,
                updatedAt: Date.now()
            };

            if (editingHighlightIndex >= 0 && state.userHighlights[editingHighlightIndex]) {
                const existing = state.userHighlights[editingHighlightIndex];
                state.userHighlights[editingHighlightIndex] = {
                    ...existing,
                    ...payload
                };
            } else {
                state.userHighlights.push({
                    id: createHighlightId(),
                    ...payload,
                    createdAt: Date.now()
                });
            }

            renderHighlights();
            closeHighlightModalUI();
            try {
                await persistHighlights();
            } catch (err) {
                console.error("Error saving highlight:", err);
                showHighlightError(t("highlight_save_failed"));
            }
        });
    }

    if (closeImageViewerModalBtn) {
        closeImageViewerModalBtn.addEventListener("click", closeImageViewerModalUI);
    }
    if (imageViewerImg) {
        imageViewerImg.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeImageViewerModalUI();
        });
    }
    if (imageViewerModal && typeof bindModalOverlayQuickClose === "function") {
        bindModalOverlayQuickClose(imageViewerModal, closeImageViewerModalUI);
    }

    return {
        renderHighlights,
        openImageViewer,
        closeImageViewerModalUI
    };
}
