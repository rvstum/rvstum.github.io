import { getCachedElementById } from "./utils/domUtils.js";

export function createTopNavController(options = {}) {
    const { state, getUserMenuDropdown, bindModalOverlayQuickClose } = options;

    const rulesBtn = getCachedElementById("rulesBtn");
    const rulesModal = getCachedElementById("rulesModal");
    const closeRulesModal = getCachedElementById("closeRulesModal");

    function closeRules() {
        if (!rulesModal) return;
        rulesModal.classList.add("closing");
        setTimeout(() => {
            rulesModal.classList.remove("show");
            rulesModal.classList.remove("closing");
        }, 200);
    }

    function initRulesModalBindings() {
        if (rulesBtn && rulesModal) {
            rulesBtn.addEventListener("click", () => {
                rulesModal.classList.add("show");
            });
        }
        if (closeRulesModal) {
            closeRulesModal.addEventListener("click", closeRules);
        }
        if (typeof bindModalOverlayQuickClose === "function") {
            bindModalOverlayQuickClose(rulesModal, closeRules);
        }
    }

    function updateNotificationVisibility() {
        const userMenuDot = getCachedElementById("userMenuNotification");
        const friendsBtnDot = getCachedElementById("friendsBtnNotification");
        const tabDot = getCachedElementById("requestsTabNotification");
        const setHidden = (el, hidden) => {
            if (!el) return;
            el.classList.toggle("is-hidden", !!hidden);
        };

        if (!state.hasPendingRequests) {
            setHidden(userMenuDot, true);
            setHidden(friendsBtnDot, true);
            setHidden(tabDot, true);
            return;
        }

        const friendsModal = getCachedElementById("friendsModal");
        const friendsModalOpen = friendsModal && friendsModal.classList.contains("show");
        const userMenuDropdown = typeof getUserMenuDropdown === "function" ? getUserMenuDropdown() : null;
        const userMenuOpen = !!(userMenuDropdown && userMenuDropdown.classList.contains("show"));

        if (friendsModalOpen) {
            setHidden(userMenuDot, true);
            setHidden(friendsBtnDot, true);
            const requestsTab = getCachedElementById("tabFriendRequests");
            const requestsTabActive = requestsTab && requestsTab.classList.contains("active");
            setHidden(tabDot, !!requestsTabActive);
        } else {
            setHidden(userMenuDot, !!userMenuOpen);
            setHidden(friendsBtnDot, !userMenuOpen);
            setHidden(tabDot, true);
        }
    }

    return {
        initRulesModalBindings,
        updateNotificationVisibility
    };
}
