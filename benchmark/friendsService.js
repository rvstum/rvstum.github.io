import {
    arrayRemove,
    arrayUnion,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    increment,
    query,
    setDoc,
    updateDoc,
    where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./client.js";
import { readJson, writeJson, PROFILE_VIEW_COOLDOWNS_STORAGE_KEY } from "./storage.js";

const USERS_COLLECTION = "users";
const FRIEND_REQUESTS_COLLECTION = "friendRequests";
const FRIENDSHIPS_COLLECTION = "friendships";
const PROFILE_VIEW_COOLDOWN_MS = 20 * 60 * 1000;

function normalizeUid(value) {
    return typeof value === "string" ? value.trim() : "";
}

function normalizeUidList(values) {
    if (!Array.isArray(values)) return [];
    return [...new Set(values
        .map((value) => normalizeUid(value))
        .filter(Boolean))];
}

function sanitizeSegment(value) {
    return (value || "")
        .toString()
        .trim()
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "");
}

function isPermissionLikeError(err) {
    if (!err || typeof err !== "object") return false;
    const code = typeof err.code === "string" ? err.code : "";
    return code === "permission-denied" || code === "not-found";
}

function normalizeProfileSnapshot(rawProfile = {}, fallbackIdentifier = "") {
    const safeProfile = rawProfile && typeof rawProfile === "object" ? rawProfile : {};
    const parsedRankIndex = Number(safeProfile.rankIndex);
    return {
        username: typeof safeProfile.username === "string" ? safeProfile.username.trim() : "",
        accountId: typeof safeProfile.accountId === "string" && safeProfile.accountId.trim() !== ""
            ? safeProfile.accountId.trim()
            : normalizeUid(fallbackIdentifier),
        rankIndex: Number.isFinite(parsedRankIndex) ? Math.max(0, Math.floor(parsedRankIndex)) : 0,
        flag: typeof safeProfile.flag === "string" ? safeProfile.flag.trim() : "",
        pic: typeof safeProfile.pic === "string" ? safeProfile.pic.trim() : ""
    };
}

function buildFriendshipPayload(userA, userB, profileSnapshots = {}) {
    const users = normalizeUidList([userA, userB]).sort();
    const payload = {
        users,
        createdAt: Date.now()
    };

    const profilesByUid = {};
    users.forEach((uid) => {
        const snapshot = normalizeProfileSnapshot(profileSnapshots[uid], uid);
        if (!snapshot.username && !snapshot.accountId && !snapshot.flag && !snapshot.pic && snapshot.rankIndex === 0) {
            return;
        }
        profilesByUid[uid] = snapshot;
    });

    if (Object.keys(profilesByUid).length) {
        payload.profilesByUid = profilesByUid;
    }

    return payload;
}

async function bestEffortMergeUserDoc(uid, data) {
    const targetUid = normalizeUid(uid);
    if (!targetUid || !data || typeof data !== "object") return false;
    try {
        await setDoc(doc(db, USERS_COLLECTION, targetUid), data, { merge: true });
        return true;
    } catch (err) {
        if (!isPermissionLikeError(err)) throw err;
        return false;
    }
}

async function bestEffortDeleteDoc(docRef) {
    try {
        await deleteDoc(docRef);
        return true;
    } catch (err) {
        if (!isPermissionLikeError(err)) throw err;
        return false;
    }
}

function readProfileViewCooldowns() {
    const raw = readJson(PROFILE_VIEW_COOLDOWNS_STORAGE_KEY, {});
    return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
}

function writeProfileViewCooldowns(map) {
    writeJson(PROFILE_VIEW_COOLDOWNS_STORAGE_KEY, map && typeof map === "object" ? map : {});
}

function pruneExpiredProfileViewCooldowns(map, now = Date.now()) {
    const next = {};
    Object.entries(map || {}).forEach(([uid, rawValue]) => {
        const targetUid = normalizeUid(uid);
        const viewedAt = Number(rawValue);
        if (!targetUid || !Number.isFinite(viewedAt)) return;
        if ((now - viewedAt) > PROFILE_VIEW_COOLDOWN_MS) return;
        next[targetUid] = viewedAt;
    });
    return next;
}

export function buildFriendRequestId(fromUid, toUid) {
    const fromPart = sanitizeSegment(fromUid) || "from";
    const toPart = sanitizeSegment(toUid) || "to";
    return `${fromPart}__${toPart}`;
}

export function buildFriendshipId(userA, userB) {
    const ids = [sanitizeSegment(userA) || "userA", sanitizeSegment(userB) || "userB"].sort();
    return `${ids[0]}__${ids[1]}`;
}

export async function incrementViewCount(targetUid) {
    const profileUid = normalizeUid(targetUid);
    if (!profileUid) return false;

    const now = Date.now();
    const cooldowns = pruneExpiredProfileViewCooldowns(readProfileViewCooldowns(), now);
    const lastViewedAt = Number(cooldowns[profileUid]) || 0;
    if (lastViewedAt > 0 && (now - lastViewedAt) < PROFILE_VIEW_COOLDOWN_MS) {
        writeProfileViewCooldowns(cooldowns);
        return false;
    }

    try {
        await updateDoc(doc(db, USERS_COLLECTION, profileUid), {
            "profile.views": increment(1)
        });
    } catch (err) {
        if (!isPermissionLikeError(err)) throw err;
        return false;
    }

    cooldowns[profileUid] = now;
    writeProfileViewCooldowns(cooldowns);
    return true;
}

export async function getFriendshipDocument(userA, userB) {
    const firstUid = normalizeUid(userA);
    const secondUid = normalizeUid(userB);
    if (!firstUid || !secondUid) return null;
    try {
        return await getDoc(doc(db, FRIENDSHIPS_COLLECTION, buildFriendshipId(firstUid, secondUid)));
    } catch (err) {
        if (!isPermissionLikeError(err)) throw err;
        return null;
    }
}

export async function areFriends(userA, userB) {
    const friendshipSnap = await getFriendshipDocument(userA, userB);
    return !!(friendshipSnap && friendshipSnap.exists());
}

export async function getFriendRequestDocument(fromUid, toUid) {
    const senderUid = normalizeUid(fromUid);
    const receiverUid = normalizeUid(toUid);
    if (!senderUid || !receiverUid) return null;
    try {
        return await getDoc(doc(db, FRIEND_REQUESTS_COLLECTION, buildFriendRequestId(senderUid, receiverUid)));
    } catch (err) {
        if (!isPermissionLikeError(err)) throw err;
        return null;
    }
}

export async function listIncomingFriendRequests(userUid) {
    const targetUid = normalizeUid(userUid);
    if (!targetUid) return [];
    try {
        const snap = await getDocs(query(collection(db, FRIEND_REQUESTS_COLLECTION), where("toUid", "==", targetUid)));
        return snap.docs;
    } catch (err) {
        if (!isPermissionLikeError(err)) throw err;
        return [];
    }
}

export async function listSentFriendRequests(userUid) {
    const senderUid = normalizeUid(userUid);
    if (!senderUid) return [];
    try {
        const snap = await getDocs(query(collection(db, FRIEND_REQUESTS_COLLECTION), where("fromUid", "==", senderUid)));
        return snap.docs;
    } catch (err) {
        if (!isPermissionLikeError(err)) throw err;
        return [];
    }
}

export async function listFriendships(userUid) {
    const targetUid = normalizeUid(userUid);
    if (!targetUid) return [];
    try {
        const snap = await getDocs(query(collection(db, FRIENDSHIPS_COLLECTION), where("users", "array-contains", targetUid)));
        return snap.docs;
    } catch (err) {
        if (!isPermissionLikeError(err)) throw err;
        return [];
    }
}

export async function sendFriendRequest(fromUid, toUid, options = {}) {
    const senderUid = normalizeUid(fromUid);
    const receiverUid = normalizeUid(toUid);
    if (!senderUid || !receiverUid || senderUid === receiverUid) {
        throw new Error("sendFriendRequest requires two distinct uids");
    }

    const requestPayload = {
        fromUid: senderUid,
        toUid: receiverUid,
        createdAt: Date.now(),
        fromProfile: normalizeProfileSnapshot(options.fromProfile, senderUid),
        toProfile: normalizeProfileSnapshot(options.toProfile, receiverUid)
    };

    await setDoc(
        doc(db, FRIEND_REQUESTS_COLLECTION, buildFriendRequestId(senderUid, receiverUid)),
        requestPayload,
        { merge: true }
    );

    await bestEffortMergeUserDoc(senderUid, {
        sentFriendRequests: arrayUnion(receiverUid)
    });

    const mirroredToTarget = await bestEffortMergeUserDoc(receiverUid, {
        friendRequests: arrayUnion(senderUid)
    });

    return { mirroredToTarget };
}

export async function cancelFriendRequest(fromUid, toUid) {
    const senderUid = normalizeUid(fromUid);
    const receiverUid = normalizeUid(toUid);
    if (!senderUid || !receiverUid) return;

    await bestEffortDeleteDoc(doc(db, FRIEND_REQUESTS_COLLECTION, buildFriendRequestId(senderUid, receiverUid)));

    await bestEffortMergeUserDoc(senderUid, {
        sentFriendRequests: arrayRemove(receiverUid)
    });

    await bestEffortMergeUserDoc(receiverUid, {
        friendRequests: arrayRemove(senderUid)
    });
}

export async function declineFriendRequest(userId, requesterUid) {
    const targetUid = normalizeUid(userId);
    const sourceUid = normalizeUid(requesterUid);
    if (!targetUid || !sourceUid) return;

    await bestEffortDeleteDoc(doc(db, FRIEND_REQUESTS_COLLECTION, buildFriendRequestId(sourceUid, targetUid)));

    await bestEffortMergeUserDoc(targetUid, {
        friendRequests: arrayRemove(sourceUid)
    });

    await bestEffortMergeUserDoc(sourceUid, {
        sentFriendRequests: arrayRemove(targetUid)
    });
}

export async function acceptFriendRequest(userId, requesterUid) {
    const targetUid = normalizeUid(userId);
    const sourceUid = normalizeUid(requesterUid);
    if (!targetUid || !sourceUid || targetUid === sourceUid) return;

    const requestRef = doc(db, FRIEND_REQUESTS_COLLECTION, buildFriendRequestId(sourceUid, targetUid));
    let requestData = {};
    try {
        const requestSnap = await getDoc(requestRef);
        if (requestSnap && requestSnap.exists()) {
            requestData = requestSnap.data() || {};
        }
    } catch (err) {
        if (!isPermissionLikeError(err)) throw err;
    }

    await setDoc(
        doc(db, FRIENDSHIPS_COLLECTION, buildFriendshipId(targetUid, sourceUid)),
        buildFriendshipPayload(targetUid, sourceUid, {
            [targetUid]: requestData.toProfile,
            [sourceUid]: requestData.fromProfile
        }),
        { merge: true }
    );

    await bestEffortDeleteDoc(requestRef);

    await bestEffortMergeUserDoc(targetUid, {
        friends: arrayUnion(sourceUid),
        friendRequests: arrayRemove(sourceUid),
        sentFriendRequests: arrayRemove(sourceUid)
    });

    await bestEffortMergeUserDoc(sourceUid, {
        friends: arrayUnion(targetUid),
        friendRequests: arrayRemove(targetUid),
        sentFriendRequests: arrayRemove(targetUid)
    });
}

export async function pruneSentFriendRequests(userId, targetUids) {
    const ownerUid = normalizeUid(userId);
    const staleTargets = normalizeUidList(targetUids);
    if (!ownerUid || !staleTargets.length) return;

    await bestEffortMergeUserDoc(ownerUid, {
        sentFriendRequests: arrayRemove(...staleTargets)
    });
}

export async function removeFriend(userId, friendUid, options = {}) {
    const ownerUid = normalizeUid(userId);
    const targetUid = normalizeUid(friendUid);
    if (!ownerUid || !targetUid || ownerUid === targetUid) return;

    await bestEffortDeleteDoc(doc(db, FRIENDSHIPS_COLLECTION, buildFriendshipId(ownerUid, targetUid)));

    const ownerRemovalValues = normalizeUidList([
        targetUid,
        ...(Array.isArray(options.friendAliases) ? options.friendAliases : [])
    ]);
    if (ownerRemovalValues.length) {
        await bestEffortMergeUserDoc(ownerUid, {
            friends: arrayRemove(...ownerRemovalValues)
        });
    }

    await bestEffortMergeUserDoc(targetUid, {
        friends: arrayRemove(ownerUid)
    });

    const remoteAliases = normalizeUidList(Array.isArray(options.currentUserAliases) ? options.currentUserAliases : []);
    for (const alias of remoteAliases) {
        if (!alias || alias === ownerUid) continue;
        await bestEffortMergeUserDoc(targetUid, {
            friends: arrayRemove(alias)
        });
    }
}
