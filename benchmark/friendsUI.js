import { auth } from "./client.js";
import { getCachedElementById, setHidden } from "./utils/domUtils.js";
import { t, tf } from "./i18n.js";
import * as FriendsService from "./friendsService.js?v=20260311-friends-rewrite-1";
import {
    buildActionItem,
    buildSnapshotFromUserData,
    configure as configureCore,
    getCurrentUserAccountId,
    hydrateUserRecord,
    loadHydratedFriendEntries,
    loadHydratedIncomingRequests,
    loadHydratedSentRequests,
    mergeProfileSnapshots,
    normalizeUid,
    normalizeUidList,
    publishIncomingRequestState,
    readCurrentUserData,
    renderFriendViewEntries,
    renderState,
    resolveTargetUidFromIdentifier,
    setLoading,
    showRemoveFriendConfirmModal
} from "./friendsCoreUI.js?v=20260311-friends-rewrite-1";

export const configure = configureCore;

export async function loadFriendsList(options = {}) {
    const friendList = options.friendList || getCachedElementById("friendList");
    const user = auth.currentUser;
    if (!user || !friendList) return;

    setLoading(friendList);

    try {
        const entries = await loadHydratedFriendEntries(user.uid, t("unknown_player"));
        if (!entries.length) {
            renderState(friendList, t("friends_none"));
            return;
        }
        renderFriendViewEntries(friendList, entries);
    } catch (err) {
        console.error("Error loading friends list:", err);
        renderState(friendList, t("friends_error_loading"), "#ff6666");
    }
}

export async function loadFriendRequests(options = {}) {
    const friendRequestsList = options.friendRequestsList || getCachedElementById("friendRequestsList");
    const tabFriendRequests = options.tabFriendRequests || getCachedElementById("tabFriendRequests");
    const user = auth.currentUser;
    if (!user || !friendRequestsList) return;

    setLoading(friendRequestsList);

    try {
        const { requestUids, entries } = await loadHydratedIncomingRequests(user.uid, t("unknown_player"));
        publishIncomingRequestState(user.uid, requestUids, tabFriendRequests);

        friendRequestsList.innerHTML = "";
        if (!entries.length) {
            renderState(friendRequestsList, t("friend_requests_none"));
            return;
        }

        entries.forEach(({ requesterUid, identity }) => {
            let inFlight = false;
            const item = buildActionItem(identity, [
                {
                    label: t("accept"),
                    className: "friend-request-btn accept",
                    onClick: async (event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        if (inFlight) return;
                        inFlight = true;
                        try {
                            await FriendsService.acceptFriendRequest(user.uid, requesterUid);
                            await Promise.all([
                                loadFriendRequests({
                                    friendRequestsList,
                                    tabFriendRequests
                                }),
                                loadFriendsList({ friendList: options.friendList }),
                                loadRemoveFriendsList({ removeFriendsList: options.removeFriendsList })
                            ]);
                        } catch (err) {
                            console.error("Error accepting friend request:", err);
                        } finally {
                            inFlight = false;
                        }
                    }
                },
                {
                    label: t("decline"),
                    className: "friend-request-btn decline",
                    onClick: async (event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        if (inFlight) return;
                        inFlight = true;
                        try {
                            await FriendsService.declineFriendRequest(user.uid, requesterUid);
                            await loadFriendRequests({
                                friendRequestsList,
                                tabFriendRequests
                            });
                        } catch (err) {
                            console.error("Error declining friend request:", err);
                        } finally {
                            inFlight = false;
                        }
                    }
                }
            ]);
            friendRequestsList.appendChild(item);
        });
    } catch (err) {
        console.error("Error loading incoming friend requests:", err);
        renderState(friendRequestsList, t("friend_requests_error_loading"), "#ff6666");
    }
}

export async function loadRemoveFriendsList(options = {}) {
    const removeFriendsList = options.removeFriendsList || getCachedElementById("removeFriendsList");
    const user = auth.currentUser;
    if (!user || !removeFriendsList) return;

    setLoading(removeFriendsList);

    try {
        const [entries, currentUserData] = await Promise.all([
            loadHydratedFriendEntries(user.uid, t("unknown_player")),
            readCurrentUserData()
        ]);
        const currentUserAccountId = getCurrentUserAccountId(currentUserData);

        removeFriendsList.innerHTML = "";
        if (!entries.length) {
            renderState(removeFriendsList, t("remove_friends_none"));
            return;
        }

        entries.forEach((entry) => {
            let inFlight = false;
            const item = buildActionItem(entry, [
                {
                    label: t("remove"),
                    className: "friend-request-btn decline",
                    style: "padding: 6px 12px;",
                    onClick: (event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        if (inFlight) return;

                        showRemoveFriendConfirmModal(
                            t("remove_friend_title"),
                            tf("remove_friend_confirm", { name: entry.name }),
                            async () => {
                                if (inFlight) return;
                                inFlight = true;
                                try {
                                    await FriendsService.removeFriend(user.uid, entry.uid, {
                                        friendAliases: normalizeUidList([entry.snapshot?.accountId]),
                                        currentUserAliases: normalizeUidList([currentUserAccountId])
                                    });
                                    await Promise.all([
                                        loadRemoveFriendsList({ removeFriendsList }),
                                        loadFriendsList({ friendList: options.friendList })
                                    ]);
                                } catch (err) {
                                    console.error("Error removing friend:", err);
                                    alert(t("remove_friend_failed"));
                                } finally {
                                    inFlight = false;
                                }
                            }
                        );
                    }
                }
            ]);
            removeFriendsList.appendChild(item);
        });
    } catch (err) {
        console.error("Error loading remove friends list:", err);
        renderState(removeFriendsList, t("friends_error_loading"), "#ff6666");
    }
}

export async function loadSentFriendRequests(options = {}) {
    const sentRequestsList = options.sentRequestsList || getCachedElementById("sentRequestsList");
    const user = auth.currentUser;
    if (!user || !sentRequestsList) return;

    setLoading(sentRequestsList);

    try {
        const entries = await loadHydratedSentRequests(user.uid, t("unknown_player"));
        sentRequestsList.innerHTML = "";
        if (!entries.length) {
            renderState(sentRequestsList, t("sent_requests_none"), "#888", "10px 20px");
            return;
        }

        entries.forEach(({ targetUid, identity }) => {
            let inFlight = false;
            const item = buildActionItem(identity, [
                {
                    label: t("cancel"),
                    className: "friend-request-btn decline",
                    onClick: async (event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        if (inFlight) return;
                        inFlight = true;
                        try {
                            await FriendsService.cancelFriendRequest(user.uid, targetUid);
                            await loadSentFriendRequests({ sentRequestsList });
                        } catch (err) {
                            console.error("Error cancelling sent request:", err);
                        } finally {
                            inFlight = false;
                        }
                    }
                }
            ]);
            sentRequestsList.appendChild(item);
        });
    } catch (err) {
        console.error("Error loading sent friend requests:", err);
        renderState(sentRequestsList, t("sent_requests_error_loading"), "#ff6666");
    }
}

export async function loadFriendRequestsTab(options = {}) {
    await Promise.all([
        loadFriendRequests({
            friendRequestsList: options.friendRequestsList,
            tabFriendRequests: options.tabFriendRequests,
            friendList: options.friendList,
            removeFriendsList: options.removeFriendsList
        }),
        loadSentFriendRequests({
            sentRequestsList: options.sentRequestsList
        })
    ]);
}

export async function addFriendByAccountId(options = {}) {
    const friendIdInput = options.friendIdInput || getCachedElementById("friendIdInput");
    const addFriendBtn = options.addFriendBtn || getCachedElementById("addFriendBtn");
    const addFriendMessage = options.addFriendMessage || getCachedElementById("addFriendMessage");
    const sentRequestsList = options.sentRequestsList || getCachedElementById("sentRequestsList");
    const getAddFriendTimeout = typeof options.getAddFriendTimeout === "function" ? options.getAddFriendTimeout : () => null;
    const setAddFriendTimeout = typeof options.setAddFriendTimeout === "function" ? options.setAddFriendTimeout : () => {};
    const user = auth.currentUser;

    if (!user || !friendIdInput || !addFriendBtn || !addFriendMessage) return;

    const rawIdentifier = normalizeUid(friendIdInput.value);
    if (!rawIdentifier) return;

    addFriendBtn.disabled = true;
    setHidden(addFriendMessage, true);

    try {
        const [currentUserData, targetUid] = await Promise.all([
            readCurrentUserData(),
            resolveTargetUidFromIdentifier(rawIdentifier)
        ]);

        if (!targetUid) {
            addFriendMessage.textContent = t("add_friend_user_not_found");
            addFriendMessage.style.color = "#ff6666";
            setHidden(addFriendMessage, false);
            return;
        }

        if (targetUid === user.uid) {
            addFriendMessage.textContent = t("add_friend_self");
            addFriendMessage.style.color = "#ff6666";
            setHidden(addFriendMessage, false);
            return;
        }

        const [alreadyFriends, sentRequestDoc, receivedRequestDoc, targetRecord] = await Promise.all([
            FriendsService.areFriends(user.uid, targetUid),
            FriendsService.getFriendRequestDocument(user.uid, targetUid),
            FriendsService.getFriendRequestDocument(targetUid, user.uid),
            hydrateUserRecord(targetUid)
        ]);

        if (alreadyFriends) {
            addFriendMessage.textContent = t("add_friend_already_friends");
            addFriendMessage.style.color = "#ff6666";
            setHidden(addFriendMessage, false);
            return;
        }

        if (sentRequestDoc && sentRequestDoc.exists()) {
            addFriendMessage.textContent = t("add_friend_already_sent");
            addFriendMessage.style.color = "#ffcc00";
            setHidden(addFriendMessage, false);
            return;
        }

        if (receivedRequestDoc && receivedRequestDoc.exists()) {
            addFriendMessage.textContent = t("add_friend_check_requests");
            addFriendMessage.style.color = "#ffcc00";
            setHidden(addFriendMessage, false);
            return;
        }

        const targetSnapshot = mergeProfileSnapshots(
            targetRecord ? targetRecord.snapshot : null,
            { accountId: rawIdentifier }
        );
        await FriendsService.sendFriendRequest(user.uid, targetUid, {
            fromProfile: buildSnapshotFromUserData(currentUserData, user.uid),
            toProfile: targetSnapshot
        });

        addFriendMessage.textContent = t("add_friend_sent");
        addFriendMessage.style.color = "#4caf50";
        setHidden(addFriendMessage, false);
        friendIdInput.value = "";

        if (sentRequestsList) {
            await loadSentFriendRequests({ sentRequestsList });
        }

        const existingTimeout = getAddFriendTimeout();
        if (existingTimeout) clearTimeout(existingTimeout);
        const timeoutId = setTimeout(() => {
            setHidden(addFriendMessage, true);
        }, 5000);
        setAddFriendTimeout(timeoutId);
    } catch (err) {
        console.error("Error adding friend:", err);
        addFriendMessage.textContent = t("add_friend_error");
        addFriendMessage.style.color = "#ff6666";
        setHidden(addFriendMessage, false);
    } finally {
        addFriendBtn.disabled = false;
    }
}
