import { auth } from "./client.js";
import { t } from "./i18n.js";
import * as FriendsService from "./friendsService.js?v=20260311-friends-layout-8";
import {
    buildActionItem,
    buildSnapshotFromUserData,
    configure as configureCore,
    getCurrentUserAccountId,
    hydrateUserRecord,
    invalidateHydratedFriendEntriesCache,
    loadHydratedFriendEntries,
    loadHydratedIncomingRequests,
    loadHydratedSentRequests,
    mergeProfileSnapshots,
    normalizeUidList,
    publishIncomingRequestState,
    readCurrentUserData,
    renderFriendViewEntries,
    renderState,
    resolveTargetUidFromIdentifier,
    setLoading,
    showRemoveFriendConfirmModal
} from "./friendsCoreUI.js?v=20260311-friends-layout-8";
import { getCachedElementById, setHidden } from "./utils/domUtils.js";

function getFriendsListContent() {
    return getCachedElementById("friendsListContent");
}

function getFriendRequestsContent() {
    return getCachedElementById("friendRequestsContent");
}

function getRemoveFriendsContent() {
    return getCachedElementById("removeFriendsContent");
}

function getFriendInput() {
    return getCachedElementById("friendIdInput");
}

function ensureAddFriendMessageElement() {
    let messageEl = getCachedElementById("addFriendMessage");
    if (messageEl) return messageEl;

    const input = getFriendInput();
    if (!input || !input.parentElement) return null;

    messageEl = document.createElement("div");
    messageEl.id = "addFriendMessage";
    messageEl.className = "friend-status";
    messageEl.style.marginTop = "8px";

    const parent = input.parentElement.parentElement || input.parentElement;
    parent.appendChild(messageEl);
    return messageEl;
}

function clearAddFriendMessage() {
    const messageEl = ensureAddFriendMessageElement();
    if (!messageEl) return;
    messageEl.textContent = "";
    messageEl.style.color = "";
    messageEl.classList.add("is-hidden");
}

function setAddFriendMessage(message, tone = "neutral") {
    const messageEl = ensureAddFriendMessageElement();
    if (!messageEl) return;
    messageEl.textContent = message;
    messageEl.classList.remove("is-hidden");
    if (tone === "error") {
        messageEl.style.color = "#ff8f8f";
        return;
    }
    if (tone === "success") {
        messageEl.style.color = "#9fdc7a";
        return;
    }
    messageEl.style.color = "";
}

function getTabs() {
    return {
        friends: getCachedElementById("tabFriendsList"),
        requests: getCachedElementById("tabFriendRequests"),
        remove: getCachedElementById("tabRemoveFriends")
    };
}

function setActiveTab(tabName) {
    const tabs = getTabs();
    const friendsContent = getFriendsListContent();
    const requestsContent = getFriendRequestsContent();
    const removeContent = getRemoveFriendsContent();

    Object.entries(tabs).forEach(([name, tabEl]) => {
        if (!tabEl) return;
        tabEl.classList.toggle("active", name === tabName);
    });

    setHidden(friendsContent, tabName !== "friends");
    setHidden(requestsContent, tabName !== "requests");
    setHidden(removeContent, tabName !== "remove");
}

function createSection(titleText) {
    const section = document.createElement("section");
    section.className = "friend-request-section";
    const title = document.createElement("div");
    title.className = "settings-card-title";
    title.textContent = titleText;
    const body = document.createElement("div");
    body.className = "friend-request-section-body";
    section.appendChild(title);
    section.appendChild(body);
    return { section, body };
}

function renderRequestSections(container, incomingEntries, sentEntries, handlers) {
    if (!container) return;
    container.innerHTML = "";

    const incomingSection = createSection(t("received_friend_requests"));
    if (incomingEntries.length) {
        renderFriendViewEntries(incomingSection.body, incomingEntries, {
            pending: true,
            allowOpen: false,
            showRankTrophy: false,
            inlineActions: true,
            buildActions: (entry) => [
                buildActionItem({
                    label: t("accept"),
                    className: "accept",
                    onClick: () => handlers.accept(entry)
                }),
                buildActionItem({
                    label: t("decline"),
                    className: "decline",
                    onClick: () => handlers.decline(entry)
                })
            ]
        });
    } else {
        renderState(incomingSection.body, t("friend_requests_none"));
    }

    const sentSection = createSection(t("sent_friend_requests"));
    if (sentEntries.length) {
        renderFriendViewEntries(sentSection.body, sentEntries, {
            pending: true,
            allowOpen: false,
            showRankTrophy: false,
            inlineActions: true,
            buildActions: (entry) => [
                buildActionItem({
                    label: t("remove"),
                    className: "decline",
                    onClick: () => handlers.cancel(entry)
                })
            ]
        });
    } else {
        renderState(sentSection.body, t("sent_requests_none"));
    }

    container.appendChild(incomingSection.section);
    container.appendChild(sentSection.section);
}

async function handleAccept(entry) {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    const currentUserData = await readCurrentUserData();
    const currentSnapshot = buildSnapshotFromUserData(currentUserData || {}, {
        uid: currentUser.uid,
        accountId: getCurrentUserAccountId(currentUserData)
    });
    await FriendsService.acceptFriendRequest(currentUser.uid, entry.uid, {
        currentSnapshot
    });
    invalidateHydratedFriendEntriesCache(currentUser.uid);
    await loadFriendRequests();
}

async function handleDecline(entry) {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    await FriendsService.declineFriendRequest(currentUser.uid, entry.uid);
    await loadFriendRequests();
}

async function handleCancel(entry) {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    await FriendsService.cancelFriendRequest(currentUser.uid, entry.uid);
    await loadFriendRequests();
}

async function handleRemove(entry) {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    const currentUserData = await readCurrentUserData();
    const currentUserAccountId = getCurrentUserAccountId(currentUserData);
    showRemoveFriendConfirmModal(entry, async () => {
        try {
            await FriendsService.removeFriend(currentUser.uid, entry.uid, {
                friendAliases: normalizeUidList([entry && entry.snapshot && entry.snapshot.accountId]),
                currentUserAliases: normalizeUidList([currentUserAccountId])
            });
            invalidateHydratedFriendEntriesCache(currentUser.uid);
            await loadRemoveFriendsList();
        } catch (error) {
            console.error("Failed to remove friend:", error);
            const container = getRemoveFriendsContent();
            if (container) renderState(container, t("remove_friend_failed"));
        }
    });
}

export function configure(deps = {}) {
    configureCore(deps);
}

export async function loadFriendsList() {
    const container = getFriendsListContent();
    if (!container) return [];

    const currentUser = auth.currentUser;
    if (!currentUser) {
        renderState(container, t("friends_none"));
        return [];
    }

    setLoading(container, "Loading...");
    try {
        const entries = await loadHydratedFriendEntries(currentUser.uid);
        if (!entries.length) {
            renderState(container, t("friends_none"));
            return [];
        }
        renderFriendViewEntries(container, entries);
        return entries;
    } catch (error) {
        console.error("Failed to load friends list:", error);
        renderState(container, t("friends_error_loading"));
        return [];
    }
}

export async function loadFriendRequests() {
    const container = getFriendRequestsContent();
    if (!container) return [];

    const currentUser = auth.currentUser;
    if (!currentUser) {
        renderState(container, t("friend_requests_none"));
        return [];
    }

    setLoading(container, "Loading...");
    try {
        const [incomingEntries, sentEntries] = await Promise.all([
            loadHydratedIncomingRequests(currentUser.uid),
            loadHydratedSentRequests(currentUser.uid)
        ]);
        publishIncomingRequestState(incomingEntries);
        renderRequestSections(container, incomingEntries, sentEntries, {
            accept: handleAccept,
            decline: handleDecline,
            cancel: handleCancel
        });
        return incomingEntries;
    } catch (error) {
        console.error("Failed to load friend requests:", error);
        renderState(container, t("friend_requests_error_loading"));
        return [];
    }
}

export async function loadRemoveFriendsList() {
    const container = getRemoveFriendsContent();
    if (!container) return [];

    const currentUser = auth.currentUser;
    if (!currentUser) {
        renderState(container, t("remove_friends_none"));
        return [];
    }

    setLoading(container, "Loading...");
    try {
        const entries = await loadHydratedFriendEntries(currentUser.uid);
        if (!entries.length) {
            renderState(container, t("remove_friends_none"));
            return [];
        }
        renderFriendViewEntries(container, entries, {
            allowOpen: false,
            showRankTrophy: false,
            inlineActions: true,
            buildActions: (entry) => [
                buildActionItem({
                    label: t("remove"),
                    className: "decline",
                    onClick: () => handleRemove(entry)
                })
            ]
        });
        return entries;
    } catch (error) {
        console.error("Failed to load removable friends:", error);
        renderState(container, t("remove_friend_failed"));
        return [];
    }
}

export async function loadSentFriendRequests() {
    const currentUser = auth.currentUser;
    if (!currentUser) return [];
    try {
        return await loadHydratedSentRequests(currentUser.uid);
    } catch (error) {
        console.error("Failed to load sent friend requests:", error);
        return [];
    }
}

export async function loadFriendRequestsTab() {
    setActiveTab("requests");
    return loadFriendRequests();
}

export async function addFriendByAccountId(rawIdentifier = null) {
    const currentUser = auth.currentUser;
    const input = getFriendInput();
    const addFriendBtn = getCachedElementById("addFriendBtn");
    const identifier = rawIdentifier == null
        ? (input ? input.value : "")
        : rawIdentifier;
    const safeIdentifier = typeof identifier === "string" ? identifier.trim() : "";

    if (!currentUser || !safeIdentifier) {
        setAddFriendMessage(t("add_friend_error"), "error");
        return false;
    }

    if (addFriendBtn) addFriendBtn.disabled = true;

    try {
        const currentUserData = await readCurrentUserData();
        const targetUid = await resolveTargetUidFromIdentifier(safeIdentifier, currentUserData);
        if (!targetUid) {
            setAddFriendMessage(t("add_friend_user_not_found"), "error");
            return false;
        }
        if (targetUid === currentUser.uid) {
            setAddFriendMessage(t("add_friend_self"), "error");
            return false;
        }

        const targetRecord = await hydrateUserRecord(targetUid);
        const currentSnapshot = buildSnapshotFromUserData(currentUserData || {}, {
            uid: currentUser.uid,
            accountId: getCurrentUserAccountId(currentUserData)
        });
        const targetSnapshot = mergeProfileSnapshots(
            targetRecord ? targetRecord.snapshot : null,
            { uid: targetUid, accountId: safeIdentifier }
        );

        await FriendsService.sendFriendRequest(currentUser.uid, targetUid, {
            fromSnapshot: currentSnapshot,
            toSnapshot: targetSnapshot
        });

        if (input) input.value = "";
        setAddFriendMessage(t("add_friend_sent"), "success");
        const tabs = getTabs();
        const requestsTabActive = !!(tabs.requests && tabs.requests.classList.contains("active"));
        if (requestsTabActive) {
            await loadFriendRequests();
        }
        return true;
    } catch (error) {
        const errorCode = typeof error?.code === "string" ? error.code : "";
        if (errorCode === "friend/already-friends") {
            setAddFriendMessage(t("add_friend_already_friends"), "error");
            return false;
        }
        if (errorCode === "friend/already-sent") {
            setAddFriendMessage(t("add_friend_already_sent"), "error");
            return false;
        }
        if (errorCode === "friend/incoming-exists") {
            setAddFriendMessage(t("add_friend_check_requests"), "error");
            return false;
        }
        console.error("Failed to send friend request:", error);
        setAddFriendMessage(t("add_friend_error"), "error");
        return false;
    } finally {
        if (addFriendBtn) addFriendBtn.disabled = false;
    }
}

export { clearAddFriendMessage, setActiveTab };
