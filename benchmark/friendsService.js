import {
    doc,
    setDoc,
    getDoc,
    getDocs,
    deleteDoc,
    updateDoc,
    arrayUnion,
    arrayRemove,
    increment,
    collection,
    query,
    where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./client.js";
import { readJson, writeJson, PROFILE_VIEW_COOLDOWNS_STORAGE_KEY } from "./storage.js";

const FRIEND_REQUESTS_COLLECTION = "friendRequests";
const FRIENDSHIPS_COLLECTION = "friendships";
const PROFILE_VIEW_COOLDOWN_MS = 20 * 60 * 1000;

function normalizeIdentifierArray(values) {
    if (!Array.isArray(values)) return [];
    return [...new Set(values
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter((value) => value !== ""))];
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

export function buildFriendRequestId(fromUid, toUid) {
    const fromPart = sanitizeSegment(fromUid) || "from";
    const toPart = sanitizeSegment(toUid) || "to";
    return `${fromPart}__${toPart}`;
}

export function buildFriendshipId(userA, userB) {
    const ids = [sanitizeSegment(userA) || "userA", sanitizeSegment(userB) || "userB"].sort();
    return `${ids[0]}__${ids[1]}`;
}

function buildFriendshipPayload(userA, userB) {
    const ids = [
        (userA || "").toString().trim(),
        (userB || "").toString().trim()
    ].filter((value) => value !== "").sort();
    return {
        users: ids,
        createdAt: Date.now()
    };
}

function readProfileViewCooldowns() {
    const raw = readJson(PROFILE_VIEW_COOLDOWNS_STORAGE_KEY, {});
    return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
}

function writeProfileViewCooldowns(map) {
    writeJson(PROFILE_VIEW_COOLDOWNS_STORAGE_KEY, map && typeof map === "object" ? map : {});
}

function pruneExpiredProfileViewCooldowns(map, now = Date.now()) {
    const normalized = {};
    Object.entries(map || {}).forEach(([uid, rawValue]) => {
        const targetUid = typeof uid === "string" ? uid.trim() : "";
        const viewedAt = Number(rawValue);
        if (!targetUid || !Number.isFinite(viewedAt)) return;
        if ((now - viewedAt) > PROFILE_VIEW_COOLDOWN_MS) return;
        normalized[targetUid] = viewedAt;
    });
    return normalized;
}

export async function incrementViewCount(targetUid) {
    const targetUserUid = typeof targetUid === "string" ? targetUid.trim() : "";
    if (!targetUserUid) return false;
    const now = Date.now();
    const cooldowns = pruneExpiredProfileViewCooldowns(readProfileViewCooldowns(), now);
    const lastViewedAt = Number(cooldowns[targetUserUid]) || 0;
    if (lastViewedAt > 0 && (now - lastViewedAt) < PROFILE_VIEW_COOLDOWN_MS) {
        writeProfileViewCooldowns(cooldowns);
        return false;
    }

    const userRef = doc(db, "users", targetUserUid);
    await updateDoc(userRef, {
        "profile.views": increment(1)
    });
    cooldowns[targetUserUid] = now;
    writeProfileViewCooldowns(cooldowns);
    return true;
}

export async function getFriendshipDocument(userA, userB) {
    const requestUserA = typeof userA === "string" ? userA.trim() : "";
    const requestUserB = typeof userB === "string" ? userB.trim() : "";
    if (!requestUserA || !requestUserB) return null;
    try {
        return await getDoc(doc(db, FRIENDSHIPS_COLLECTION, buildFriendshipId(requestUserA, requestUserB)));
    } catch (e) {
        if (!isPermissionLikeError(e)) throw e;
        return null;
    }
}

export async function areFriends(userA, userB) {
    const friendshipSnap = await getFriendshipDocument(userA, userB);
    return !!(friendshipSnap && friendshipSnap.exists());
}

export async function getFriendRequestDocument(fromUid, toUid) {
    const requestFromUid = typeof fromUid === "string" ? fromUid.trim() : "";
    const requestToUid = typeof toUid === "string" ? toUid.trim() : "";
    if (!requestFromUid || !requestToUid) return null;
    try {
        return await getDoc(doc(db, FRIEND_REQUESTS_COLLECTION, buildFriendRequestId(requestFromUid, requestToUid)));
    } catch (e) {
        if (!isPermissionLikeError(e)) throw e;
        return null;
    }
}

export async function listIncomingFriendRequests(userUid) {
    const targetUid = typeof userUid === "string" ? userUid.trim() : "";
    if (!targetUid) return [];
    try {
        const snap = await getDocs(query(collection(db, FRIEND_REQUESTS_COLLECTION), where("toUid", "==", targetUid)));
        return snap.docs;
    } catch (e) {
        if (!isPermissionLikeError(e)) throw e;
        return [];
    }
}

export async function listSentFriendRequests(userUid) {
    const fromUid = typeof userUid === "string" ? userUid.trim() : "";
    if (!fromUid) return [];
    try {
        const snap = await getDocs(query(collection(db, FRIEND_REQUESTS_COLLECTION), where("fromUid", "==", fromUid)));
        return snap.docs;
    } catch (e) {
        if (!isPermissionLikeError(e)) throw e;
        return [];
    }
}

export async function listFriendships(userUid) {
    const targetUid = typeof userUid === "string" ? userUid.trim() : "";
    if (!targetUid) return [];
    try {
        const snap = await getDocs(query(collection(db, FRIENDSHIPS_COLLECTION), where("users", "array-contains", targetUid)));
        return snap.docs;
    } catch (e) {
        if (!isPermissionLikeError(e)) throw e;
        return [];
    }
}

export async function sendFriendRequest(fromUid, toUid, options = {}) {
    const senderUid = typeof fromUid === "string" ? fromUid.trim() : "";
    const receiverUid = typeof toUid === "string" ? toUid.trim() : "";
    if (!senderUid || !receiverUid) {
        throw new Error("sendFriendRequest requires fromUid and toUid");
    }
    const fromProfile = options && options.fromProfile && typeof options.fromProfile === "object" ? options.fromProfile : null;
    const toProfile = options && options.toProfile && typeof options.toProfile === "object" ? options.toProfile : null;
    const requestPayload = {
        fromUid: senderUid,
        toUid: receiverUid,
        createdAt: Date.now()
    };
    if (fromProfile) requestPayload.fromProfile = fromProfile;
    if (toProfile) requestPayload.toProfile = toProfile;

    try {
        const requestRef = doc(db, FRIEND_REQUESTS_COLLECTION, buildFriendRequestId(senderUid, receiverUid));
        await setDoc(requestRef, requestPayload, { merge: true });
    } catch (e) {
        if (!isPermissionLikeError(e)) throw e;
    }

    await updateDoc(doc(db, "users", senderUid), {
        sentFriendRequests: arrayUnion(receiverUid)
    });

    try {
        await updateDoc(doc(db, "users", receiverUid), {
            friendRequests: arrayUnion(senderUid)
        });
        return { mirroredToTarget: true };
    } catch (e) {
        if (!isPermissionLikeError(e)) throw e;
        return { mirroredToTarget: false };
    }
}

export async function cancelFriendRequest(fromUid, toUid) {
    const senderUid = typeof fromUid === "string" ? fromUid.trim() : "";
    const receiverUid = typeof toUid === "string" ? toUid.trim() : "";
    if (!senderUid || !receiverUid) return;

    try {
        await deleteDoc(doc(db, FRIEND_REQUESTS_COLLECTION, buildFriendRequestId(senderUid, receiverUid)));
    } catch (e) {
        if (!isPermissionLikeError(e)) throw e;
    }
    await updateDoc(doc(db, "users", senderUid), {
        sentFriendRequests: arrayRemove(receiverUid)
    });

    try {
        await updateDoc(doc(db, "users", receiverUid), {
            friendRequests: arrayRemove(senderUid)
        });
    } catch (e) {
        if (!isPermissionLikeError(e)) throw e;
    }
}

export async function declineFriendRequest(userId, requesterUid) {
    const targetUid = typeof userId === "string" ? userId.trim() : "";
    const sourceUid = typeof requesterUid === "string" ? requesterUid.trim() : "";
    if (!targetUid || !sourceUid) return;

    try {
        await deleteDoc(doc(db, FRIEND_REQUESTS_COLLECTION, buildFriendRequestId(sourceUid, targetUid)));
    } catch (e) {
        if (!isPermissionLikeError(e)) throw e;
    }
    await updateDoc(doc(db, "users", targetUid), {
        friendRequests: arrayRemove(sourceUid)
    });

    try {
        await updateDoc(doc(db, "users", sourceUid), {
            friends: arrayUnion(targetUid),
            sentFriendRequests: arrayRemove(targetUid)
        });
    } catch (e) {
        if (!isPermissionLikeError(e)) throw e;
    }
}

export async function acceptFriendRequest(userId, requesterUid) {
    const targetUid = typeof userId === "string" ? userId.trim() : "";
    const sourceUid = typeof requesterUid === "string" ? requesterUid.trim() : "";
    if (!targetUid || !sourceUid) return;

    try {
        await setDoc(doc(db, FRIENDSHIPS_COLLECTION, buildFriendshipId(targetUid, sourceUid)), buildFriendshipPayload(targetUid, sourceUid), { merge: true });
    } catch (e) {
        if (!isPermissionLikeError(e)) throw e;
    }
    try {
        await deleteDoc(doc(db, FRIEND_REQUESTS_COLLECTION, buildFriendRequestId(sourceUid, targetUid)));
    } catch (e) {
        if (!isPermissionLikeError(e)) throw e;
    }

    const ownUpdate = updateDoc(doc(db, "users", targetUid), {
        friends: arrayUnion(sourceUid),
        friendRequests: arrayRemove(sourceUid)
    });
    await ownUpdate;

    try {
        await updateDoc(doc(db, "users", sourceUid), {
            friends: arrayUnion(targetUid),
            sentFriendRequests: arrayRemove(targetUid)
        });
    } catch (e) {
        if (!isPermissionLikeError(e)) throw e;
    }
}

export async function pruneSentFriendRequests(userId, targetUids) {
    const ownerUid = typeof userId === "string" ? userId.trim() : "";
    const staleTargets = Array.isArray(targetUids)
        ? [...new Set(targetUids.map((value) => (typeof value === "string" ? value.trim() : "")).filter(Boolean))]
        : [];
    if (!ownerUid || !staleTargets.length) return;

    try {
        await updateDoc(doc(db, "users", ownerUid), {
            sentFriendRequests: arrayRemove(...staleTargets)
        });
    } catch (e) {
        if (!isPermissionLikeError(e)) throw e;
    }
}

export async function removeFriend(userId, friendUid, options = {}) {
    const targetUid = typeof userId === "string" ? userId.trim() : "";
    const otherUid = typeof friendUid === "string" ? friendUid.trim() : "";
    if (!targetUid || !otherUid) return;
    const friendAliases = normalizeIdentifierArray(options && Array.isArray(options.friendAliases) ? options.friendAliases : []);
    const currentUserAliases = normalizeIdentifierArray(options && Array.isArray(options.currentUserAliases) ? options.currentUserAliases : []);
    const currentUserRemovalValues = normalizeIdentifierArray([otherUid, ...friendAliases].filter((value) => value !== targetUid));
    const otherUserRemovalValues = normalizeIdentifierArray([targetUid, ...currentUserAliases].filter((value) => value !== otherUid));

    try {
        await deleteDoc(doc(db, FRIENDSHIPS_COLLECTION, buildFriendshipId(targetUid, otherUid)));
    } catch (e) {
        if (!isPermissionLikeError(e)) throw e;
    }

    const currentUserUpdate = updateDoc(doc(db, "users", targetUid), {
        friends: arrayRemove(...currentUserRemovalValues)
    });
    await currentUserUpdate;

    try {
        await updateDoc(doc(db, "users", otherUid), {
            friends: arrayRemove(...otherUserRemovalValues)
        });
    } catch (e) {
        if (!isPermissionLikeError(e)) throw e;
    }
}
