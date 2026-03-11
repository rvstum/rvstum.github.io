import { resetFriendAccountIdVisibility } from "./accountId.js";
import {
    addFriendByAccountId,
    clearAddFriendMessage,
    loadFriendRequests,
    loadFriendsList,
    loadRemoveFriendsList,
    loadFriendRequestsTab,
    setActiveTab
} from "./friendsUI.js?v=20260311-friends-layout-8";
import { getCachedElementById, setFlexVisible, setHidden } from "./utils/domUtils.js";

function bindTapOrClick(element, handler) {
    if (!element || typeof handler !== "function") return;
    let lastTouchTime = 0;

    element.addEventListener("touchend", (event) => {
        lastTouchTime = Date.now();
        handler(event);
    }, { passive: true });

    element.addEventListener("click", (event) => {
        if (Date.now() - lastTouchTime < 500) return;
        handler(event);
    });
}

function resetAddFriendInput() {
    const input = getCachedElementById("friendIdInput");
    if (input) input.value = "";
    clearAddFriendMessage();
}

export function initFriendsModalController(options = {}) {
    const bindModalOverlayQuickClose = typeof options.bindModalOverlayQuickClose === "function"
        ? options.bindModalOverlayQuickClose
        : null;

    const friendsModal = getCachedElementById("friendsModal");
    const openButtons = [
        getCachedElementById("friendsMenuBtn"),
        getCachedElementById("friendsBtn"),
        getCachedElementById("openFriendsModalBtn")
    ].filter(Boolean);
    const closeButton = getCachedElementById("closeFriendsModal");
    const addFriendBtn = getCachedElementById("addFriendBtn");
    const friendInput = getCachedElementById("friendIdInput");
    const tabFriends = getCachedElementById("tabFriendsList");
    const tabRequests = getCachedElementById("tabFriendRequests");
    const tabRemove = getCachedElementById("tabRemoveFriends");

    function closeFriendsModal() {
        if (!friendsModal) return;
        friendsModal.classList.add("closing");
        setTimeout(() => {
            friendsModal.classList.remove("show");
            friendsModal.classList.remove("closing");
            setHidden(friendsModal, true);
            setFlexVisible(friendsModal, false);
        }, 200);
        resetAddFriendInput();
        resetFriendAccountIdVisibility();
    }

    async function openFriendsModal(defaultTab = "friends") {
        if (!friendsModal) return;
        setHidden(friendsModal, false);
        setFlexVisible(friendsModal, true);
        friendsModal.classList.add("show");
        resetFriendAccountIdVisibility();

        if (defaultTab === "requests") {
            await loadFriendRequestsTab();
            return;
        }
        if (defaultTab === "remove") {
            setActiveTab("remove");
            await loadRemoveFriendsList();
            return;
        }
        setActiveTab("friends");
        await loadFriendsList();
    }

    async function refreshActiveTab() {
        if (tabRequests && tabRequests.classList.contains("active")) {
            await loadFriendRequests();
            return;
        }
        if (tabRemove && tabRemove.classList.contains("active")) {
            await loadRemoveFriendsList();
            return;
        }
        await loadFriendsList();
    }

    openButtons.forEach((button) => {
        bindTapOrClick(button, () => {
            openFriendsModal("friends");
        });
    });

    if (closeButton) {
        bindTapOrClick(closeButton, () => {
            closeFriendsModal();
        });
    }

    if (bindModalOverlayQuickClose && friendsModal) {
        bindModalOverlayQuickClose(friendsModal, closeFriendsModal);
    }

    if (tabFriends) {
        bindTapOrClick(tabFriends, () => {
            setActiveTab("friends");
            loadFriendsList();
        });
    }

    if (tabRequests) {
        bindTapOrClick(tabRequests, () => {
            loadFriendRequestsTab();
        });
    }

    if (tabRemove) {
        bindTapOrClick(tabRemove, () => {
            setActiveTab("remove");
            loadRemoveFriendsList();
        });
    }

    if (addFriendBtn) {
        bindTapOrClick(addFriendBtn, () => {
            addFriendByAccountId();
        });
    }

    if (friendInput) {
        friendInput.addEventListener("keydown", (event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            addFriendByAccountId();
        });
    }

    return {
        openFriendsModal,
        closeFriendsModal,
        refreshActiveTab
    };
}
