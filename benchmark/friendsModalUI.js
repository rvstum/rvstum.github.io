import * as FriendsUI from "./friendsUI.js?v=20260311-friends-rewrite-1";
import { resetFriendAccountIdVisibility } from "./accountId.js";
import { setHidden, setFlexVisible } from "./utils/domUtils.js";

function bindTapOrClick(element, handler) {
    if (!element || typeof handler !== "function") return;
    let suppressClickUntil = 0;

    const run = (event) => {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        handler();
    };

    element.addEventListener("pointerup", (event) => {
        suppressClickUntil = Date.now() + 400;
        run(event);
    });

    element.addEventListener("click", (event) => {
        if (Date.now() < suppressClickUntil) return;
        run(event);
    });
}

function clearAddFriendMessage(addFriendMessage) {
    if (!addFriendMessage) return;
    addFriendMessage.textContent = "";
    addFriendMessage.style.color = "#ccc";
    setHidden(addFriendMessage, true);
}

function resetAddFriendInput(friendIdInput) {
    if (!friendIdInput) return;
    friendIdInput.value = "";
}

export function initFriendsModalController(options = {}) {
    const {
        friendsMenuBtn,
        friendsModal,
        closeFriendsModal,
        friendIdInput,
        addFriendBtn,
        addFriendMessage,
        friendList,
        sentRequestsList,
        friendRequestsList,
        tabFriendsList,
        tabFriendRequests,
        tabRemoveFriends,
        friendsListContent,
        friendRequestsContent,
        removeFriendsContent,
        removeFriendsList,
        bindModalOverlayQuickClose,
        updateNotificationVisibility,
        markCurrentFriendRequestsViewed
    } = options;

    let addFriendTimeout = null;

    const updateNotifications = () => {
        if (typeof updateNotificationVisibility === "function") {
            updateNotificationVisibility();
        }
    };

    const closeFriendsModalUI = () => {
        if (friendsModal) friendsModal.classList.remove("show");
        if (addFriendTimeout) {
            clearTimeout(addFriendTimeout);
            addFriendTimeout = null;
        }
        resetAddFriendInput(friendIdInput);
        clearAddFriendMessage(addFriendMessage);
        resetFriendAccountIdVisibility();
        updateNotifications();
    };

    const openFriendsListTab = () => {
        if (tabFriendsList) tabFriendsList.classList.add("active");
        if (tabFriendRequests) tabFriendRequests.classList.remove("active");
        if (tabRemoveFriends) tabRemoveFriends.classList.remove("active");
        setFlexVisible(friendsListContent, true);
        setFlexVisible(friendRequestsContent, false);
        setFlexVisible(removeFriendsContent, false);
        FriendsUI.loadFriendsList({ friendList });
        updateNotifications();
    };

    const openFriendRequestsTab = () => {
        if (tabFriendRequests) tabFriendRequests.classList.add("active");
        if (tabFriendsList) tabFriendsList.classList.remove("active");
        if (tabRemoveFriends) tabRemoveFriends.classList.remove("active");
        setFlexVisible(friendRequestsContent, true);
        setFlexVisible(friendsListContent, false);
        setFlexVisible(removeFriendsContent, false);
        if (typeof markCurrentFriendRequestsViewed === "function") {
            markCurrentFriendRequestsViewed();
        }
        FriendsUI.loadFriendRequestsTab({
            friendRequestsList,
            sentRequestsList,
            tabFriendRequests,
            friendList,
            removeFriendsList
        });
        updateNotifications();
    };

    const openRemoveFriendsTab = () => {
        if (tabRemoveFriends) tabRemoveFriends.classList.add("active");
        if (tabFriendsList) tabFriendsList.classList.remove("active");
        if (tabFriendRequests) tabFriendRequests.classList.remove("active");
        setFlexVisible(removeFriendsContent, true);
        setFlexVisible(friendsListContent, false);
        setFlexVisible(friendRequestsContent, false);
        FriendsUI.loadRemoveFriendsList({ removeFriendsList, friendList });
        updateNotifications();
    };

    if (friendsMenuBtn) {
        friendsMenuBtn.addEventListener("click", () => {
            resetFriendAccountIdVisibility();
            if (addFriendTimeout) {
                clearTimeout(addFriendTimeout);
                addFriendTimeout = null;
            }
            resetAddFriendInput(friendIdInput);
            clearAddFriendMessage(addFriendMessage);
            if (friendsModal) friendsModal.classList.add("show");
            openFriendsListTab();
        });
    }

    bindTapOrClick(tabFriendsList, openFriendsListTab);
    bindTapOrClick(tabFriendRequests, openFriendRequestsTab);
    bindTapOrClick(tabRemoveFriends, openRemoveFriendsTab);

    if (closeFriendsModal) {
        closeFriendsModal.addEventListener("click", closeFriendsModalUI);
    }

    if (typeof bindModalOverlayQuickClose === "function") {
        bindModalOverlayQuickClose(friendsModal, closeFriendsModalUI);
    }

    if (addFriendBtn) {
        addFriendBtn.addEventListener("click", async () => {
            await FriendsUI.addFriendByAccountId({
                friendIdInput,
                addFriendBtn,
                addFriendMessage,
                sentRequestsList,
                getAddFriendTimeout: () => addFriendTimeout,
                setAddFriendTimeout: (value) => {
                    addFriendTimeout = value;
                }
            });
        });
    }

    if (friendIdInput) {
        friendIdInput.addEventListener("keydown", (event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            if (addFriendBtn) addFriendBtn.click();
        });
    }

    return {
        closeFriendsModalUI
    };
}
