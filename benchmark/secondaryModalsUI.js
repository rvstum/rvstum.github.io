import { getCachedElementById, getCachedQuery } from "./utils/domUtils.js";
import * as AchievementsUI from "./achievementsUI.js?v=20260304-achievements-6k";
import * as ProfileUI from "./profileUI.js?v=20260309-remove-highlights-1";

export function initSecondaryModals(options = {}) {
    const {
        openImageViewer,
        showConfirmModal,
        bindModalOverlayQuickClose
    } = options;

    const achievementsSection = getCachedQuery("achievementsSection", () => document.querySelector(".achievements-section"));
    const achievementsModal = getCachedElementById("achievementsModal");
    const closeAchievementsModal = getCachedElementById("closeAchievementsModal");
    const closeAchievements = () => {
        if (!achievementsModal) return;
        achievementsModal.classList.add("closing");
        setTimeout(() => {
            achievementsModal.classList.remove("show");
            achievementsModal.classList.remove("closing");
        }, 200);
    };
    if (achievementsSection && achievementsModal) {
        achievementsSection.addEventListener("click", () => {
            AchievementsUI.renderAchievements(openImageViewer, showConfirmModal);
            achievementsModal.classList.add("show");
            const scrollBox = achievementsModal.querySelector(".settings-content-box");
            if (scrollBox) scrollBox.scrollTop = 0;
        });
    }
    if (closeAchievementsModal) {
        closeAchievementsModal.addEventListener("click", closeAchievements);
    }
    if (achievementsModal && typeof bindModalOverlayQuickClose === "function") {
        bindModalOverlayQuickClose(achievementsModal, closeAchievements);
    }

    const onboardingFlagSelectorBox = getCachedElementById("onboardingFlagSelectorBox");
    const flagSelectorBox = getCachedElementById("flagSelectorBox");
    const flagModal = getCachedElementById("flagModal");
    const flagGrid = getCachedElementById("flagGrid");
    const closeFlagModal = getCachedElementById("closeFlagModal");

    const closeFlagModalUI = () => {
        ProfileUI.closeFlagPicker(flagModal);
    };

    const openFlagModal = () => {
        ProfileUI.renderFlags(flagGrid, flagModal, () => ProfileUI.closeFlagPicker(flagModal));
        const scrollBox = flagModal && flagModal.querySelector(".settings-content-box");
        if (scrollBox) scrollBox.scrollTop = 0;
        flagModal.classList.add("show");
    };

    if (flagSelectorBox) {
        flagSelectorBox.addEventListener("click", openFlagModal);
    }
    if (onboardingFlagSelectorBox) {
        onboardingFlagSelectorBox.addEventListener("click", openFlagModal);
    }
    if (closeFlagModal) {
        closeFlagModal.addEventListener("click", closeFlagModalUI);
    }
    if (flagModal && typeof bindModalOverlayQuickClose === "function") {
        bindModalOverlayQuickClose(flagModal, closeFlagModalUI);
    }
}
