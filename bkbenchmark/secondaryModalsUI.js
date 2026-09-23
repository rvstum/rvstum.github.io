import { getCachedElementById, getCachedQuery } from "./utils/domUtils.js";
import * as ProfileUI from "./profileUI.js?v=20260311-profile-original-sync-1";

export function initSecondaryModals(options = {}) {
    const {
        bindModalOverlayQuickClose
    } = options;

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
