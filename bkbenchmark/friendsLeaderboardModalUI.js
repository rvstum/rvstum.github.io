import { onFriendGraphChange } from "./friendGraphStore.js?v=20260920-friend-graph";
import { createFriendsLeaderboardUI } from "./friendsLeaderboardUI.js?v=20260920-friend-graph";
import { getCachedElementById, setFlexVisible, setHidden } from "./utils/domUtils.js";

let lastLeaderboardTouchTime = 0;

function bindTapOrClick(element, handler) {
    if (!element || typeof handler !== "function") return;

    element.addEventListener("touchend", (event) => {
        lastLeaderboardTouchTime = Date.now();
        event.preventDefault();
        handler(event);
    }, { passive: false });

    element.addEventListener("click", (event) => {
        if (Date.now() - lastLeaderboardTouchTime < 500) {
            event.preventDefault();
            return;
        }
        handler(event);
    });
}

function closeUserMenuDropdown() {
    const userMenuBox = getCachedElementById("userMenuBox");
    if (!userMenuBox) return;
    const dropdownMenu = userMenuBox.querySelector(".dropdown-menu");
    const arrowIcon = userMenuBox.querySelector(".arrow-icon");
    if (dropdownMenu) dropdownMenu.classList.remove("show");
    if (arrowIcon) arrowIcon.classList.remove("rotate");
}

export function initFriendsLeaderboardModalController(options = {}) {
    const bindModalOverlayQuickClose = typeof options.bindModalOverlayQuickClose === "function"
        ? options.bindModalOverlayQuickClose
        : null;
    const onSelectEntry = typeof options.onSelectEntry === "function"
        ? options.onSelectEntry
        : null;

    const leaderboardModal = getCachedElementById("leaderboardModal");
    const openButton = getCachedElementById("leaderboardMenuBtn");
    const closeButton = getCachedElementById("closeLeaderboardModal");
    const leaderboardUI = createFriendsLeaderboardUI({
        onSelectEntry: async (payload) => {
            closeLeaderboardModal();
            if (typeof onSelectEntry !== "function") return;
            try {
                await onSelectEntry(payload);
            } catch (error) {
                console.error("Failed to open leaderboard profile:", error);
            }
        }
    });

    function closeLeaderboardModal() {
        if (!leaderboardModal) return;
        closeUserMenuDropdown();
        leaderboardModal.classList.add("closing");
        setTimeout(() => {
            leaderboardModal.classList.remove("show");
            leaderboardModal.classList.remove("closing");
            setHidden(leaderboardModal, true);
            setFlexVisible(leaderboardModal, false);
        }, 200);
    }

    async function openLeaderboardModal() {
        if (!leaderboardModal) return;
        closeUserMenuDropdown();
        setHidden(leaderboardModal, false);
        setFlexVisible(leaderboardModal, true);
        leaderboardModal.classList.add("show");
        try {
            await leaderboardUI.refresh();
        } catch (error) {
            console.error("Failed to load leaderboard:", error);
            leaderboardUI.render();
        }
    }

    // Friends are live: if the board is open when a friendship is made or removed, redraw it.
    let liveRefreshTimer = 0;
    onFriendGraphChange(() => {
        if (!leaderboardModal || !leaderboardModal.classList.contains("show")) return;
        clearTimeout(liveRefreshTimer);
        liveRefreshTimer = setTimeout(() => {
            leaderboardUI.refresh().catch((error) => console.warn("Live leaderboard refresh failed:", error));
        }, 200);
    });

    bindTapOrClick(openButton, () => {
        openLeaderboardModal();
    });

    bindTapOrClick(closeButton, () => {
        closeLeaderboardModal();
    });

    if (bindModalOverlayQuickClose && leaderboardModal) {
        bindModalOverlayQuickClose(leaderboardModal, closeLeaderboardModal);
    }

    return {
        openLeaderboardModal,
        closeLeaderboardModal,
        refreshActive: async () => {
            if (!leaderboardModal || !leaderboardModal.classList.contains("show")) return;
            await leaderboardUI.refresh();
        }
    };
}
