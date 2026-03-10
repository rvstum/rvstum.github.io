import {
    updateProfile,
    signOut,
    verifyBeforeUpdateEmail,
    sendPasswordResetEmail,
    EmailAuthProvider,
    reauthenticateWithCredential,
    deleteUser
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db } from "./client.js";
import { getRuntimeAccountId } from "./appState.js";
import * as ProfileUI from "./profileUI.js?v=20260309-flag-remove-fix-1";
import * as Slugs from "./slugs.js";
import * as UserService from "./userService.js?v=20260309-request-directory-1";
import { compressImageFileToDataUrl } from "./imageUtils.js";
import { resetAccountIdVisibility } from "./accountId.js";
import { showPageLoader, hidePageLoader as hidePageLoaderUI } from "./pageLoaderUI.js?v=20260309-logout-loader-cover-1";
import { getCachedElementById, setHidden } from "./utils/domUtils.js";
import {
    writeString,
    writeJson,
    removeItem,
    PROFILE_PIC_STORAGE_KEY,
    PROFILE_PIC_ORIGINAL_STORAGE_KEY,
    PROFILE_PIC_STATE_STORAGE_KEY,
    COUNTRY_FLAG_STORAGE_KEY,
    GUILDS_STORAGE_KEY
} from "./storage.js";

function maskEmail(emailValue) {
    const parts = String(emailValue || "").split("@");
    return `**************@${parts[1] || "gmail.com"}`;
}

function parseCropState(state) {
    const raw = state && typeof state === "object" ? state : {};
    return {
        x: Number(raw.x) || 0,
        y: Number(raw.y) || 0,
        scale: Number(raw.scale) > 0 ? Number(raw.scale) : 1
    };
}

function getSlugAccountId() {
    const accountIdDisplay = getCachedElementById("accountIdDisplay");
    const fromDataset = accountIdDisplay && accountIdDisplay.dataset
        ? (accountIdDisplay.dataset.realValue || "").trim()
        : "";
    return fromDataset || getRuntimeAccountId();
}

function readDraftProfileState() {
    const raw = ProfileUI.draftProfileState && typeof ProfileUI.draftProfileState === "object"
        ? ProfileUI.draftProfileState
        : {};
    return {
        username: typeof raw.username === "string" ? raw.username : "",
        pic: typeof raw.pic === "string" ? raw.pic : "",
        flag: typeof raw.flag === "string" ? raw.flag : "",
        originalPic: typeof raw.originalPic === "string" ? raw.originalPic : "",
        cropState: raw.cropState && typeof raw.cropState === "object" ? { ...raw.cropState } : null
    };
}

function readOriginalProfileState() {
    const raw = ProfileUI.originalProfileState && typeof ProfileUI.originalProfileState === "object"
        ? ProfileUI.originalProfileState
        : {};
    return {
        username: typeof raw.username === "string" ? raw.username : "",
        pic: typeof raw.pic === "string" ? raw.pic : "",
        flag: typeof raw.flag === "string" ? raw.flag : "",
        originalPic: typeof raw.originalPic === "string" ? raw.originalPic : "",
        guilds: Array.isArray(raw.guilds) ? [...raw.guilds] : [],
        cropState: raw.cropState && typeof raw.cropState === "object" ? { ...raw.cropState } : null
    };
}

function readEditingGuilds() {
    return Array.isArray(ProfileUI.editingGuilds) ? [...ProfileUI.editingGuilds] : [];
}

function updateDraftProfileState(patch = {}) {
    const next = { ...readDraftProfileState(), ...(patch || {}) };
    ProfileUI.setDraftProfileState(next);
    return next;
}

function normalizeProfileDraftForSave(draft) {
    const source = draft && typeof draft === "object" ? draft : {};
    return {
        username: String(source.username || "").trim(),
        pic: typeof source.pic === "string" ? source.pic : "",
        flag: typeof source.flag === "string" ? source.flag : "",
        originalPic: typeof source.originalPic === "string" ? source.originalPic : "",
        cropState: source.cropState && typeof source.cropState === "object"
            ? parseCropState(source.cropState)
            : null
    };
}

export function initProfileModalController(options = {}) {
    const {
        state,
        t,
        bindModalOverlayQuickClose,
        addGuildBtn,
        profilePicInput,
        cropperContainer,
        cropperImage,
        newGuildInputBox,
        showConfirmModal,
        getLoginUrl
    } = options;

    const profileModal = getCachedElementById("profileModal");
    const closeProfileModal = getCachedElementById("closeProfileModal");
    const userProfileBtn = getCachedElementById("userProfileBtn");
    const signOutBtn = getCachedElementById("signOutBtn");
    const toggleEmailView = getCachedElementById("toggleEmailView");
    const accountEmailDisplay = getCachedElementById("accountEmailDisplay");
    const profileUsernameInput = getCachedElementById("profileUsernameInput");
    const saveProfileBtn = getCachedElementById("saveProfileBtn");
    const discardProfileBtn = getCachedElementById("discardProfileBtn");
    const uploadProfilePicBtn = getCachedElementById("uploadProfilePicBtn");
    const editProfilePicBtn = getCachedElementById("editProfilePicBtn");
    const removeProfilePicBtn = getCachedElementById("removeProfilePicBtn");
    const profilePicMessage = getCachedElementById("profilePicMessage");
    const removeFlagBtn = getCachedElementById("removeFlagBtn");

    const newGuildInput = getCachedElementById("newGuildInput");
    const confirmAddGuildBtn = getCachedElementById("confirmAddGuildBtn");
    const cancelAddGuildBtn = getCachedElementById("cancelAddGuildBtn");

    const changeEmailBtn = getCachedElementById("changeEmailBtn");
    const emailChangeContainer = getCachedElementById("emailChangeContainer");
    const newEmailInput = getCachedElementById("newEmailInput");
    const confirmEmailChangeBtn = getCachedElementById("confirmEmailChangeBtn");
    const cancelEmailChangeBtn = getCachedElementById("cancelEmailChangeBtn");
    const emailChangeMessage = getCachedElementById("emailChangeMessage");

    const changePasswordBtn = getCachedElementById("changePasswordBtn");
    const passwordChangeMessage = getCachedElementById("passwordChangeMessage");
    const deleteAccountBtn = getCachedElementById("deleteAccountBtn");

    const reauthModal = getCachedElementById("reauthModal");
    const closeReauthModal = getCachedElementById("closeReauthModal");
    const cancelReauthBtn = getCachedElementById("cancelReauthBtn");
    const confirmReauthBtn = getCachedElementById("confirmReauthBtn");
    const reauthPasswordInput = getCachedElementById("reauthPasswordInput");
    const reauthMessage = getCachedElementById("reauthMessage");

    const cropperArea = getCachedElementById("cropperArea");
    const cropperZoom = getCachedElementById("cropperZoom");
    const centerImageBtn = getCachedElementById("centerImageBtn");
    const cancelImageBtn = getCachedElementById("cancelImageBtn");
    const saveImageBtn = getCachedElementById("saveImageBtn");

    let pendingProtectedAction = null;

    let cropState = { x: 0, y: 0, scale: 1 };
    let isCropDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragOriginX = 0;
    let dragOriginY = 0;

    function setStatusMessage(el, message, type = "note") {
        if (!el) return;
        el.textContent = message || "";
        el.classList.remove("message-error", "message-success", "message-note");
        if (type === "error") el.classList.add("message-error");
        else if (type === "success") el.classList.add("message-success");
        else el.classList.add("message-note");
        setHidden(el, !message);
    }

    function clearStatusMessage(el) {
        setStatusMessage(el, "", "note");
    }

    function updateAddGuildVisibility() {
        const guildCount = readEditingGuilds().length;
        if (newGuildInputBox) setHidden(newGuildInputBox, true);
        if (addGuildBtn) setHidden(addGuildBtn, guildCount >= 6);
        if (newGuildInput) newGuildInput.value = "";
    }

    function showAddGuildInput() {
        if (!newGuildInputBox) return;
        setHidden(newGuildInputBox, false);
        if (addGuildBtn) setHidden(addGuildBtn, true);
        if (newGuildInput) {
            newGuildInput.value = "";
            newGuildInput.focus();
        }
    }

    function resetProfileSensitiveVisibility() {
        resetAccountIdVisibility();
        const user = auth.currentUser;
        if (accountEmailDisplay) {
            accountEmailDisplay.value = maskEmail(user ? user.email : "");
        }
        if (toggleEmailView) toggleEmailView.textContent = t("show");
        updateAddGuildVisibility();
        if (emailChangeContainer) setHidden(emailChangeContainer, true);
        if (changeEmailBtn) setHidden(changeEmailBtn, false);
        clearStatusMessage(emailChangeMessage);
        clearStatusMessage(passwordChangeMessage);
        clearStatusMessage(profilePicMessage);
    }

    function closeProfileModalUI() {
        if (profileModal) profileModal.classList.remove("show");
        resetProfileSensitiveVisibility();
    }

    function applyCropTransform() {
        if (!cropperImage) return;
        cropperImage.style.transform = `translate(${cropState.x}px, ${cropState.y}px) scale(${cropState.scale})`;
        ProfileUI.setCropperState(cropState);
    }

    function getCropScaleBounds() {
        const min = cropperZoom ? Number(cropperZoom.min) : 0.05;
        const max = cropperZoom ? Number(cropperZoom.max) : 3;
        return {
            min: Number.isFinite(min) && min > 0 ? min : 0.05,
            max: Number.isFinite(max) && max > 0 ? max : 3
        };
    }

    function setCropScale(nextScale, anchorToCrosshair = true) {
        const { min, max } = getCropScaleBounds();
        const currentScale = Number(cropState.scale) > 0 ? Number(cropState.scale) : 1;
        const clamped = Math.max(min, Math.min(max, Number(nextScale) || currentScale));
        if (!Number.isFinite(clamped) || clamped <= 0) return;
        if (anchorToCrosshair && currentScale > 0 && clamped !== currentScale) {
            const ratio = clamped / currentScale;
            cropState.x *= ratio;
            cropState.y *= ratio;
        }
        cropState.scale = clamped;
        if (cropperZoom) cropperZoom.value = String(clamped);
        applyCropTransform();
    }

    function openCropper(sourceUrl, options = {}) {
        if (!cropperContainer || !cropperImage || !sourceUrl) return;
        const resetPosition = options.resetPosition !== false;
        cropperImage.src = sourceUrl;
        cropperImage.dataset.originalSrc = sourceUrl;
        cropperImage.draggable = false;
        if (resetPosition) {
            cropState = { x: 0, y: 0, scale: 1 };
        } else {
            const draft = readDraftProfileState();
            cropState = draft.cropState ? parseCropState(draft.cropState) : { x: 0, y: 0, scale: 1 };
        }
        if (cropperZoom) cropperZoom.value = String(cropState.scale);
        applyCropTransform();
        setHidden(cropperContainer, false);
    }

    function closeCropper() {
        if (!cropperContainer || !cropperImage) return;
        setHidden(cropperContainer, true);
        cropperImage.removeAttribute("src");
        delete cropperImage.dataset.originalSrc;
    }

    function getCroppedImageDataUrl() {
        if (!cropperImage || !cropperImage.src || !cropperImage.naturalWidth || !cropperImage.naturalHeight) return "";
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return "";
        canvas.width = 120;
        canvas.height = 120;
        ctx.fillStyle = "#0a0a0a";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.translate(cropState.x, cropState.y);
        ctx.scale(cropState.scale, cropState.scale);
        ctx.drawImage(cropperImage, -cropperImage.naturalWidth / 2, -cropperImage.naturalHeight / 2);
        return canvas.toDataURL("image/png");
    }

    async function withReauth(action, onError = null) {
        try {
            await action();
            return true;
        } catch (e) {
            if (e && e.code === "auth/requires-recent-login") {
                pendingProtectedAction = { action, onError };
                if (reauthPasswordInput) reauthPasswordInput.value = "";
                clearStatusMessage(reauthMessage);
                if (reauthModal) reauthModal.classList.add("show");
                return false;
            }
            if (typeof onError === "function") {
                onError(e);
                return false;
            }
            throw e;
        }
    }

    function closeReauth() {
        if (reauthModal) reauthModal.classList.remove("show");
        if (reauthPasswordInput) reauthPasswordInput.value = "";
        clearStatusMessage(reauthMessage);
    }

    function initProfileModalState() {
        ProfileUI.initProfileModalState(
            profileModal,
            accountEmailDisplay,
            toggleEmailView,
            (auth.currentUser && auth.currentUser.email) || "",
            cropperContainer,
            profilePicInput,
            cropperImage,
            newGuildInputBox,
            addGuildBtn
        );
    }

    async function saveProfileChanges() {
        if (state && state.isViewMode) return;
        const user = auth.currentUser;
        if (!user) {
            alert(t("profile_save_login_required"));
            return;
        }

        const usernameInputValue = profileUsernameInput ? String(profileUsernameInput.value || "").trim() : "";
        const draftBefore = updateDraftProfileState({ username: usernameInputValue });
        const draft = normalizeProfileDraftForSave(draftBefore);
        const username = draft.username || "Player";
        const guilds = readEditingGuilds();

        if (saveProfileBtn) {
            saveProfileBtn.disabled = true;
            saveProfileBtn.textContent = t("profile_saving");
        }

        try {
            await updateProfile(user, { displayName: username });

            const profileName = document.querySelector(".profile-name");
            if (profileName) profileName.textContent = username;
            const userMenuName = getCachedElementById("userMenuUsername");
            if (userMenuName) userMenuName.textContent = username;

            if (draft.pic) writeString(PROFILE_PIC_STORAGE_KEY, draft.pic);
            else removeItem(PROFILE_PIC_STORAGE_KEY);

            if (draft.flag) writeString(COUNTRY_FLAG_STORAGE_KEY, draft.flag);
            else removeItem(COUNTRY_FLAG_STORAGE_KEY);

            if (draft.originalPic) writeString(PROFILE_PIC_ORIGINAL_STORAGE_KEY, draft.originalPic);
            else removeItem(PROFILE_PIC_ORIGINAL_STORAGE_KEY);

            if (draft.cropState) writeJson(PROFILE_PIC_STATE_STORAGE_KEY, draft.cropState);
            else removeItem(PROFILE_PIC_STATE_STORAGE_KEY);

            writeJson(GUILDS_STORAGE_KEY, guilds);

            const profileData = ProfileUI.cleanProfileData(draft, guilds);
            const accountId = getSlugAccountId();
            const publicSlug = Slugs.buildProfileSlug(username, accountId, user.uid);

            await setDoc(doc(db, "users", user.uid), {
                username,
                profile: profileData,
                publicSlug
            }, { merge: true });
            await UserService.syncAccountDirectoryEntry(user.uid, accountId, {
                username,
                accountId,
                profile: profileData
            });

            ProfileUI.setDraftProfileState({ ...draft });
            ProfileUI.setOriginalProfileState({
                ...draft,
                username,
                guilds: [...guilds],
                cropState: draft.cropState ? { ...draft.cropState } : null
            });
            ProfileUI.setEditingGuilds([...guilds]);
            ProfileUI.setEditingGuildIndex(-1);

            ProfileUI.updateMainPageGuildDisplay();
            ProfileUI.updateMainHeaderLayout();
            ProfileUI.renderGuildsList(addGuildBtn);
            updateAddGuildVisibility();
            ProfileUI.updateProfileButtons();
        } catch (e) {
            console.error("Error saving profile:", e);
            alert(t("profile_save_failed"));
        } finally {
            if (saveProfileBtn) {
                saveProfileBtn.disabled = false;
                saveProfileBtn.textContent = t("save_changes");
            }
        }
    }

    function discardProfileChanges() {
        const original = readOriginalProfileState();
        ProfileUI.setDraftProfileState({
            username: original.username,
            pic: original.pic,
            flag: original.flag,
            originalPic: original.originalPic,
            cropState: original.cropState ? { ...original.cropState } : null
        });
        ProfileUI.setEditingGuilds([...original.guilds]);
        ProfileUI.setEditingGuildIndex(-1);

        if (profileUsernameInput) profileUsernameInput.value = original.username;
        ProfileUI.updateProfilePicPreview(original.pic);
        ProfileUI.updateFlagPreview(original.flag);
        ProfileUI.renderGuildsList(addGuildBtn);
        updateAddGuildVisibility();
        ProfileUI.updateProfileButtons();

        clearStatusMessage(emailChangeMessage);
        clearStatusMessage(passwordChangeMessage);
        clearStatusMessage(profilePicMessage);
    }

    if (userProfileBtn) {
        userProfileBtn.addEventListener("click", () => {
            if (state && state.isViewMode) return;
            resetProfileSensitiveVisibility();
            initProfileModalState();
        });
    }

    if (signOutBtn) {
        signOutBtn.addEventListener("click", async () => {
            try {
                closeProfileModalUI();
                showPageLoader();
                await signOut(auth);
                const targetUrl = typeof getLoginUrl === "function"
                    ? getLoginUrl()
                    : Slugs.getBenchmarkLoginUrl();
                window.location.href = targetUrl;
            } catch (e) {
                hidePageLoaderUI({ immediate: true }, 0);
                console.error("Error signing out:", e);
            }
        });
    }

    if (closeProfileModal) {
        closeProfileModal.addEventListener("click", closeProfileModalUI);
    }
    if (typeof bindModalOverlayQuickClose === "function") {
        bindModalOverlayQuickClose(profileModal, closeProfileModalUI);
    }

    if (profileUsernameInput) {
        profileUsernameInput.addEventListener("input", () => {
            updateDraftProfileState({ username: profileUsernameInput.value });
            ProfileUI.updateProfileButtons();
        });
    }

    if (saveProfileBtn) {
        saveProfileBtn.addEventListener("click", saveProfileChanges);
    }
    if (discardProfileBtn) {
        discardProfileBtn.addEventListener("click", discardProfileChanges);
    }

    if (addGuildBtn) addGuildBtn.addEventListener("click", showAddGuildInput);
    if (cancelAddGuildBtn) cancelAddGuildBtn.addEventListener("click", updateAddGuildVisibility);
    if (confirmAddGuildBtn && newGuildInput) {
        confirmAddGuildBtn.addEventListener("click", () => {
            if (ProfileUI.addEditingGuild(newGuildInput.value, addGuildBtn)) {
                updateAddGuildVisibility();
            }
        });
        newGuildInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                confirmAddGuildBtn.click();
            }
            if (e.key === "Escape") {
                e.preventDefault();
                updateAddGuildVisibility();
            }
        });
    }

    if (removeFlagBtn) {
        removeFlagBtn.addEventListener("click", () => {
            updateDraftProfileState({ flag: "" });
            ProfileUI.updateFlagPreview("");
            ProfileUI.updateProfileButtons();
        });
    }

    if (toggleEmailView && accountEmailDisplay) {
        toggleEmailView.addEventListener("click", () => {
            const user = auth.currentUser;
            if (!user) return;
            const masked = maskEmail(user.email);
            const showingMasked = accountEmailDisplay.value === masked;
            accountEmailDisplay.value = showingMasked ? user.email : masked;
            toggleEmailView.textContent = showingMasked ? t("hide") : t("show");
        });
    }

    if (uploadProfilePicBtn && profilePicInput) {
        uploadProfilePicBtn.addEventListener("click", () => profilePicInput.click());
    }
    if (editProfilePicBtn) {
        editProfilePicBtn.addEventListener("click", () => {
            const draft = readDraftProfileState();
            const source = draft.originalPic || draft.pic;
            if (!source) {
                if (profilePicInput) profilePicInput.click();
                return;
            }
            openCropper(source, { resetPosition: false });
        });
    }
    if (removeProfilePicBtn) {
        removeProfilePicBtn.addEventListener("click", () => {
            updateDraftProfileState({ pic: "", originalPic: "", cropState: null });
            ProfileUI.updateProfilePicPreview("");
            ProfileUI.updateProfileButtons();
            closeCropper();
        });
    }

    if (profilePicInput) {
        profilePicInput.addEventListener("change", async (event) => {
            const file = event && event.target && event.target.files ? event.target.files[0] : null;
            if (!file) return;
            try {
                const dataUrl = await compressImageFileToDataUrl(file, 1280, 0.9);
                updateDraftProfileState({
                    originalPic: dataUrl,
                    cropState: { x: 0, y: 0, scale: 1 }
                });
                openCropper(dataUrl, { resetPosition: true });
                clearStatusMessage(profilePicMessage);
            } catch (e) {
                console.error("Error processing profile image:", e);
                setStatusMessage(profilePicMessage, t("err_unknown"), "error");
            } finally {
                profilePicInput.value = "";
            }
        });
    }

    if (cropperZoom) {
        cropperZoom.addEventListener("input", () => {
            setCropScale(Number(cropperZoom.value), true);
        });
    }
    if (centerImageBtn) {
        centerImageBtn.addEventListener("click", () => {
            cropState.x = 0;
            cropState.y = 0;
            applyCropTransform();
        });
    }
    if (cancelImageBtn) {
        cancelImageBtn.addEventListener("click", closeCropper);
    }
    if (saveImageBtn) {
        saveImageBtn.addEventListener("click", () => {
            const cropped = getCroppedImageDataUrl();
            if (!cropped) return;
            const draft = readDraftProfileState();
            updateDraftProfileState({
                pic: cropped,
                originalPic: draft.originalPic || cropped,
                cropState: { ...cropState }
            });
            ProfileUI.updateProfilePicPreview(cropped);
            ProfileUI.updateProfileButtons();
            closeCropper();
        });
    }

    if (cropperArea) {
        cropperArea.addEventListener("dragstart", (event) => {
            event.preventDefault();
        });
        if (cropperImage) {
            cropperImage.addEventListener("dragstart", (event) => {
                event.preventDefault();
            });
        }
        cropperArea.addEventListener("wheel", (event) => {
            if (!cropperImage || !cropperImage.getAttribute("src")) return;
            event.preventDefault();
            // Smooth wheel zoom anchored to the center crosshair.
            const factor = Math.exp(-event.deltaY * 0.0015);
            setCropScale(cropState.scale * factor, true);
        }, { passive: false });
        cropperArea.addEventListener("pointerdown", (event) => {
            if (!cropperImage || !cropperImage.getAttribute("src")) return;
            isCropDragging = true;
            dragStartX = event.clientX;
            dragStartY = event.clientY;
            dragOriginX = cropState.x;
            dragOriginY = cropState.y;
            try {
                cropperArea.setPointerCapture(event.pointerId);
            } catch (e) {}
        });
        cropperArea.addEventListener("pointermove", (event) => {
            if (!isCropDragging) return;
            cropState.x = dragOriginX + (event.clientX - dragStartX);
            cropState.y = dragOriginY + (event.clientY - dragStartY);
            applyCropTransform();
        });
        const stopDragging = (event) => {
            if (!isCropDragging) return;
            isCropDragging = false;
            try {
                cropperArea.releasePointerCapture(event.pointerId);
            } catch (e) {}
        };
        cropperArea.addEventListener("pointerup", stopDragging);
        cropperArea.addEventListener("pointercancel", stopDragging);
    }

    if (changeEmailBtn && emailChangeContainer) {
        changeEmailBtn.addEventListener("click", () => {
            setHidden(emailChangeContainer, false);
            setHidden(changeEmailBtn, true);
            clearStatusMessage(emailChangeMessage);
            if (newEmailInput) {
                newEmailInput.value = "";
                newEmailInput.focus();
            }
        });
    }
    if (cancelEmailChangeBtn && emailChangeContainer && changeEmailBtn) {
        cancelEmailChangeBtn.addEventListener("click", () => {
            setHidden(emailChangeContainer, true);
            setHidden(changeEmailBtn, false);
            clearStatusMessage(emailChangeMessage);
            if (newEmailInput) newEmailInput.value = "";
        });
    }
    if (confirmEmailChangeBtn && newEmailInput) {
        confirmEmailChangeBtn.addEventListener("click", async () => {
            const user = auth.currentUser;
            if (!user) {
                setStatusMessage(emailChangeMessage, t("profile_not_logged_in"), "error");
                return;
            }
            const email = String(newEmailInput.value || "").trim();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                setStatusMessage(emailChangeMessage, t("profile_email_valid_error"), "error");
                return;
            }
            if (String(user.email || "").toLowerCase() === email.toLowerCase()) {
                setStatusMessage(emailChangeMessage, t("profile_email_different_error"), "error");
                return;
            }

            const action = async () => {
                confirmEmailChangeBtn.disabled = true;
                confirmEmailChangeBtn.textContent = t("profile_email_sending_verification");
                try {
                    await verifyBeforeUpdateEmail(user, email);
                    setStatusMessage(
                        emailChangeMessage,
                        t("profile_email_verification_sent").replace("{email}", email),
                        "success"
                    );
                    setHidden(emailChangeContainer, true);
                    setHidden(changeEmailBtn, false);
                    if (newEmailInput) newEmailInput.value = "";
                } finally {
                    confirmEmailChangeBtn.disabled = false;
                    confirmEmailChangeBtn.textContent = t("verify_update");
                }
            };

            await withReauth(action, (e) => {
                console.error("Error updating email:", e);
                const message = e && e.message ? e.message : t("err_unknown");
                setStatusMessage(emailChangeMessage, message, "error");
            });
        });
    }

    if (changePasswordBtn) {
        changePasswordBtn.addEventListener("click", async () => {
            const user = auth.currentUser;
            if (!user || !user.email) {
                setStatusMessage(passwordChangeMessage, t("profile_not_logged_in"), "error");
                return;
            }
            changePasswordBtn.disabled = true;
            changePasswordBtn.textContent = t("profile_change_password_sending");
            try {
                await sendPasswordResetEmail(auth, user.email);
                setStatusMessage(passwordChangeMessage, t("profile_password_reset_sent"), "success");
            } catch (e) {
                console.error("Error sending password reset email:", e);
                const message = e && e.code === "auth/user-not-found"
                    ? t("profile_email_not_exist")
                    : (e && e.message ? e.message : t("err_unknown"));
                setStatusMessage(passwordChangeMessage, message, "error");
            } finally {
                changePasswordBtn.disabled = false;
                changePasswordBtn.textContent = t("change_password");
            }
        });
    }

    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener("click", () => {
            const runDelete = async () => {
                const user = auth.currentUser;
                if (!user) return;
                const action = async () => {
                    const accountId = getSlugAccountId();
                    try {
                        await UserService.cleanupUserDataForAccountDeletion(user.uid, { accountId });
                    } catch (cleanupError) {
                        console.warn("Account cleanup partially skipped before auth delete:", cleanupError);
                        try {
                            await UserService.deleteUserDocument(user.uid);
                        } catch (fallbackCleanupError) {
                            console.warn("Fallback user document delete failed before auth delete:", fallbackCleanupError);
                        }
                    }
                    await deleteUser(user);
                    const targetUrl = typeof getLoginUrl === "function"
                        ? getLoginUrl()
                        : Slugs.getBenchmarkLoginUrl();
                    window.location.href = targetUrl;
                };
                await withReauth(action, (e) => {
                    console.error("Error deleting account:", e);
                    alert(`${t("profile_delete_error_prefix")}${e && e.message ? e.message : t("err_unknown")}`);
                });
            };

            if (typeof showConfirmModal === "function") {
                showConfirmModal(
                    t("profile_delete_confirm_title"),
                    t("profile_delete_confirm_message"),
                    runDelete
                );
            } else if (window.confirm(t("profile_delete_confirm_message"))) {
                runDelete();
            }
        });
    }

    if (confirmReauthBtn) {
        confirmReauthBtn.addEventListener("click", async () => {
            const user = auth.currentUser;
            if (!user || !user.email) {
                setStatusMessage(reauthMessage, t("profile_not_logged_in"), "error");
                return;
            }
            const password = String((reauthPasswordInput && reauthPasswordInput.value) || "");
            if (!password) {
                setStatusMessage(reauthMessage, t("reauth_password_required"), "error");
                return;
            }

            confirmReauthBtn.disabled = true;
            confirmReauthBtn.textContent = t("reauth_verifying");
            try {
                const credential = EmailAuthProvider.credential(user.email, password);
                await reauthenticateWithCredential(user, credential);
                const pending = pendingProtectedAction;
                pendingProtectedAction = null;
                closeReauth();
                if (pending && typeof pending.action === "function") {
                    await pending.action();
                }
            } catch (e) {
                console.error("Reauthentication failed:", e);
                const prefix = t("reauth_failed_prefix");
                setStatusMessage(reauthMessage, `${prefix}${e && e.message ? e.message : t("err_unknown")}`, "error");
            } finally {
                confirmReauthBtn.disabled = false;
                confirmReauthBtn.textContent = t("reauth_confirm");
            }
        });
    }

    if (cancelReauthBtn) cancelReauthBtn.addEventListener("click", closeReauth);
    if (closeReauthModal) closeReauthModal.addEventListener("click", closeReauth);
    if (typeof bindModalOverlayQuickClose === "function") {
        bindModalOverlayQuickClose(reauthModal, closeReauth);
    }

    return {
        closeProfileModalUI,
        resetProfileSensitiveVisibility
    };
}
