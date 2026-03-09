import { getCachedElementById } from "./utils/domUtils.js";

export function createConfirmModalController(options = {}) {
    const { bindModalOverlayQuickClose } = options;
    const confirmModal = getCachedElementById("confirmModal");
    const confirmTitle = getCachedElementById("confirmTitle");
    const confirmMessage = getCachedElementById("confirmMessage");
    const confirmOkBtn = getCachedElementById("confirmOkBtn");
    const confirmCancelBtn = getCachedElementById("confirmCancelBtn");

    let currentConfirmCallback = null;

    function showConfirmModal(title, message, callback) {
        if (confirmTitle) confirmTitle.textContent = title;
        if (confirmMessage) confirmMessage.textContent = message;
        currentConfirmCallback = callback;
        if (confirmModal) confirmModal.classList.add("show");
    }

    function closeConfirmModal() {
        if (confirmModal) {
            confirmModal.classList.remove("show");
            confirmModal.classList.add("closing");
            setTimeout(() => {
                confirmModal.classList.remove("closing");
            }, 200);
        }
        currentConfirmCallback = null;
    }

    if (confirmOkBtn) {
        confirmOkBtn.addEventListener("click", () => {
            if (currentConfirmCallback) currentConfirmCallback();
            closeConfirmModal();
        });
    }

    if (confirmCancelBtn) {
        confirmCancelBtn.addEventListener("click", () => {
            closeConfirmModal();
        });
    }

    if (typeof bindModalOverlayQuickClose === "function") {
        bindModalOverlayQuickClose(confirmModal, closeConfirmModal);
    }

    return {
        showConfirmModal,
        closeConfirmModal
    };
}
