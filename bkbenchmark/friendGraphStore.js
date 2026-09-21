import * as FriendsService from "./friendsService.js?v=20260920-friend-graph";

// One shared, live copy of the signed-in user's friend graph (friendships + incoming/sent
// requests). Everything that shows friends or friend requests reads from here, so an accepted
// request, a decline or a removal made by the other person shows up on this side straight away
// instead of after the next manual reload.

const listeners = new Set();
let activeUid = "";
let unsubscribe = null;
let latest = null;
let firstSnapshotWaiters = [];

function notify() {
    listeners.forEach((listener) => {
        try {
            listener(latest);
        } catch (error) {
            console.error("Friend graph listener failed:", error);
        }
    });
    try {
        document.dispatchEvent(new CustomEvent("benchmark:friend-graph-changed", {
            detail: { uid: activeUid }
        }));
    } catch (_) {
        // No DOM (should not happen in the browser).
    }
}

function resolveFirstSnapshotWaiters() {
    const waiters = firstSnapshotWaiters;
    firstSnapshotWaiters = [];
    waiters.forEach((resolve) => resolve(latest));
}

export function startFriendGraph(uid) {
    const normalizedUid = typeof uid === "string" ? uid.trim() : "";
    if (!normalizedUid) {
        stopFriendGraph();
        return;
    }
    if (normalizedUid === activeUid && unsubscribe) return;

    stopFriendGraph();
    activeUid = normalizedUid;
    FriendsService.healLegacyFriendships(normalizedUid).catch(() => {});
    unsubscribe = FriendsService.subscribeFriendGraph(normalizedUid, {
        onChange: (graph) => {
            latest = { uid: normalizedUid, ...graph };
            resolveFirstSnapshotWaiters();
            notify();
        }
    });
}

export function stopFriendGraph() {
    if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
    }
    const hadData = latest !== null;
    activeUid = "";
    latest = null;
    resolveFirstSnapshotWaiters();
    if (hadData) notify();
}

export function getFriendGraph(uid) {
    return latest && latest.uid === uid ? latest : null;
}

export function onFriendGraphChange(listener) {
    if (typeof listener !== "function") return () => {};
    listeners.add(listener);
    return () => listeners.delete(listener);
}

async function safeList(loader) {
    try {
        return await loader();
    } catch (error) {
        const code = typeof error?.code === "string" ? error.code : "";
        if (code !== "permission-denied" && code !== "not-found") console.warn("Friend graph query failed:", error);
        return [];
    }
}

// Resolves with the live graph when it is available. Right after sign-in the first snapshot may
// still be on its way, so wait briefly for it and only then fall back to one-off queries.
export async function readFriendGraph(uid) {
    const normalizedUid = typeof uid === "string" ? uid.trim() : "";
    if (!normalizedUid) return { uid: "", friendships: [], incoming: [], sent: [] };

    const current = getFriendGraph(normalizedUid);
    if (current) return current;

    if (normalizedUid === activeUid && unsubscribe) {
        const waited = await Promise.race([
            new Promise((resolve) => firstSnapshotWaiters.push(resolve)),
            new Promise((resolve) => setTimeout(() => resolve(null), 4000))
        ]);
        if (waited && waited.uid === normalizedUid) return waited;
    }

    const [friendships, incoming, sent] = await Promise.all([
        safeList(() => FriendsService.listFriendships(normalizedUid)),
        safeList(() => FriendsService.listIncomingFriendRequests(normalizedUid)),
        safeList(() => FriendsService.listSentFriendRequests(normalizedUid))
    ]);
    return { uid: normalizedUid, friendships, incoming, sent };
}
