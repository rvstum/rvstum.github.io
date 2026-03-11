import * as FriendsUI from "./friendsUI.js?v=20260311-remove-friend-fix-1";
import { resetFriendAccountIdVisibility } from "./accountId.js";
import { setHidden, setFlexVisible } from "./utils/domUtils.js";

function clearAddFriendMessage(addFriendMessage) {
    if (!addFriendMessage) return;
    setHidden(addFriendMessage, true);
    addFriendMessage.textContent = "";
    addFriendMessage.style.color = "#ccc";
}

function resetFriendInput(friendIdInput) {
    if (!friendIdInput) return;
    friendIdInput.value = "";
}

function bindTapOrClick(element, handler) {
    if (!element || typeof handler !== "function") return;
    let suppressClickUntil = 0;

    const run = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        handler();
    };

    element.addEventListener("pointerup", (e) => {
        suppressClickUntil = Date.now() + 400;
        run(e);
    });

    element.addEventListener("click", (e) => {
        if (Date.now() < suppressClickUntil) return;
        run(e);
    });
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

    function closeFriendsModalUI() {
        if (friendsModal) friendsModal.classList.remove("show");
        if (addFriendTimeout) {
            clearTimeout(addFriendTimeout);
            addFriendTimeout = null;
        }
        resetFriendInput(friendIdInput);
        clearAddFriendMessage(addFriendMessage);
        resetFriendAccountIdVisibility();
        updateNotifications();
    }

    if (friendsMenuBtn) {
        friendsMenuBtn.addEventListener("click", () => {
            resetFriendAccountIdVisibility();
            if (addFriendTimeout) {
                clearTimeout(addFriendTimeout);
                addFriendTimeout = null;
            }
            resetFriendInput(friendIdInput);
            clearAddFriendMessage(addFriendMessage);
            if (friendsModal) friendsModal.classList.add("show");
            updateNotifications();
            if (tabFriendsList) tabFriendsList.click();
        });
    }

    if (tabFriendsList && tabFriendRequests && tabRemoveFriends) {
        const openFriendsListTab = () => {
            tabFriendsList.classList.add("active");
            tabFriendRequests.classList.remove("active");
            tabRemoveFriends.classList.remove("active");
            setFlexVisible(friendsListContent, true);
            setFlexVisible(friendRequestsContent, false);
            setFlexVisible(removeFriendsContent, false);
            FriendsUI.loadFriendsList({ friendList });
            updateNotifications();
        };

        const openFriendRequestsTab = () => {
            tabFriendRequests.classList.add("active");
            tabFriendsList.classList.remove("active");
            tabRemoveFriends.classList.remove("active");
            setFlexVisible(friendRequestsContent, true);
            setFlexVisible(friendsListContent, false);
            setFlexVisible(removeFriendsContent, false);
            if (typeof markCurrentFriendRequestsViewed === "function") {
                markCurrentFriendRequestsViewed();
            }
            FriendsUI.loadFriendRequestsTab({
                friendRequestsList,
                sentRequestsList,
                tabFriendRequests
            });
            updateNotifications();
        };

        const openRemoveFriendsTab = () => {
            tabRemoveFriends.classList.add("active");
            tabFriendsList.classList.remove("active");
            tabFriendRequests.classList.remove("active");
            setFlexVisible(removeFriendsContent, true);
            setFlexVisible(friendsListContent, false);
            setFlexVisible(friendRequestsContent, false);
            FriendsUI.loadRemoveFriendsList({ removeFriendsList });
            updateNotifications();
        };

        bindTapOrClick(tabFriendsList, openFriendsListTab);
        bindTapOrClick(tabFriendRequests, openFriendRequestsTab);
        bindTapOrClick(tabRemoveFriends, openRemoveFriendsTab);
    }

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
                tabFriendRequests,
                getAddFriendTimeout: () => addFriendTimeout,
                setAddFriendTimeout: (value) => {
                    addFriendTimeout = value;
                }
            });
        });
    }

    return {
        closeFriendsModalUI
    };
}
