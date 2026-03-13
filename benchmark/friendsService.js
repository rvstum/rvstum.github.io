import {
    arrayRemove,
    arrayUnion,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    query,
    setDoc,
    updateDoc,
    where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./client.js";
import { FINAL_RANK_INDEX, RANK_NAMES } from "./constants.js";
import { calculateRankFromData } from "./scoring.js";
import * as ScoreManager from "./scoreManager.js";
import * as UserService from "./userService.js";
import { resolveProfileAccountId, resolveProfileSlug, resolveProfileUsername } from "./slugs.js";

const USERS_COLLECTION = "users";
const FRIEND_REQUESTS_COLLECTION = "friendRequests";
const FRIENDSHIPS_COLLECTION = "friendships";

function normalizeUid(value) {
    return typeof value === "string" ? value.trim() : "";
}

function normalizeUidList(values) {
    if (!Array.isArray(values)) return [];
    return [...new Set(values.map(normalizeUid).filter((value) => value !== ""))];
}

function isPermissionLikeError(error) {
    if (!error || typeof error !== "object") return false;
    const code = typeof error.code === "string" ? error.code : "";
    return code === "permission-denied" || code === "not-found";
}

function safeObject(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function pickNonEmpty(...values) {
    for (const value of values) {
        if (typeof value === "string" && value.trim() !== "") return value.trim();
        if (typeof value === "number" && Number.isFinite(value)) return value;
        if (typeof value === "boolean") return value;
    }
    return "";
}

function clampRankIndex(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 0;
    return Math.max(0, Math.min(FINAL_RANK_INDEX, Math.floor(parsed)));
}

function parseRankIndexFromTheme(themeName) {
    const value = typeof themeName === "string" ? themeName.trim().toLowerCase() : "";
    if (!value.startsWith("rank-")) return 0;
    return clampRankIndex(value.slice(5));
}

function parseRankIndexFromName(rankName) {
    const lower = typeof rankName === "string" ? rankName.trim().toLowerCase() : "";
    if (!lower) return 0;
    for (let index = FINAL_RANK_INDEX; index >= 1; index -= 1) {
        const known = String(RANK_NAMES[index] || "").trim().toLowerCase();
        if (known && lower.includes(known)) return index;
    }
    return 0;
}

function normalizeRankSourceData(userData = {}) {
    const safeData = safeObject(userData);
    return {
        ...safeData,
        scores: ScoreManager.normalizeSavedScoresRecord(safeData.scores)
    };
}

function deriveRankIndex(userData = {}) {
    const safeData = normalizeRankSourceData(userData);
    const profile = safeObject(safeData.profile);
    const settings = safeObject(safeData.settings);
    let best = clampRankIndex(calculateRankFromData(safeData));

    [
        safeData.rankIndex,
        safeData.maxRankIndex,
        profile.rankIndex,
        profile.maxRankIndex,
        settings.rankThemeUnlock
    ].forEach((value) => {
        const candidate = clampRankIndex(value);
        if (candidate > best) best = candidate;
    });

    const themedRank = parseRankIndexFromTheme(settings.theme);
    if (themedRank > best) best = themedRank;

    [
        safeData.currentRank,
        profile.currentRank
    ].forEach((value) => {
        const candidate = parseRankIndexFromName(value);
        if (candidate > best) best = candidate;
    });

    return best;
}

function mergeSnapshots(...snapshots) {
    const merged = {};
    snapshots.forEach((snapshot) => {
        const safeSnapshot = safeObject(snapshot);
        Object.keys(safeSnapshot).forEach((key) => {
            const value = safeSnapshot[key];
            if (typeof value === "string") {
                const trimmed = value.trim();
                if (trimmed !== "") merged[key] = trimmed;
                return;
            }
            if (typeof value === "number" && Number.isFinite(value)) {
                merged[key] = value;
                return;
            }
            if (typeof value === "boolean") {
                merged[key] = value;
            }
        });
    });
    return merged;
}

function buildSnapshotFromUserData(uid, userData = {}, directoryData = null) {
    const safeData = safeObject(userData);
    const profile = safeObject(safeData.profile);
    const safeDirectoryData = safeObject(directoryData);
    const accountId = pickNonEmpty(
        resolveProfileAccountId(safeData, ""),
        safeDirectoryData.accountId
    );
    return {
        uid: normalizeUid(uid),
        username: pickNonEmpty(
            resolveProfileUsername(safeData, "player"),
            safeDirectoryData.username,
            "Unknown Player"
        ),
        accountId,
        rankIndex: clampRankIndex(
            pickNonEmpty(
                safeData.rankIndex,
                safeData.maxRankIndex,
                profile.rankIndex,
                profile.maxRankIndex,
                safeDirectoryData.rankIndex,
                deriveRankIndex(safeData)
            )
        ),
        rankName: pickNonEmpty(
            safeData.currentRank,
            profile.currentRank,
            RANK_NAMES[deriveRankIndex(safeData)] || RANK_NAMES[0]
        ),
        flag: pickNonEmpty(profile.flag, safeDirectoryData.flag),
        pic: pickNonEmpty(profile.pic, safeDirectoryData.pic),
        publicSlug: pickNonEmpty(
            resolveProfileSlug(safeData, {
                usernameFallback: resolveProfileUsername(safeData, "player"),
                accountIdFallback: accountId,
                uid
            }),
            safeDirectoryData.publicSlug
        ),
        visibility: pickNonEmpty(safeObject(safeData.settings).visibility, safeDirectoryData.visibility, "everyone"),
        updatedAt: Date.now()
    };
}

async function getReadableUserData(uid) {
    const normalizedUid = normalizeUid(uid);
    if (!normalizedUid) return null;
    try {
        const userSnap = await UserService.getUserDocument(normalizedUid);
        if (!userSnap || !userSnap.exists()) return null;
        return userSnap.data() || {};
    } catch (error) {
        if (!isPermissionLikeError(error)) throw error;
        return null;
    }
}

function getUidListField(data, field) {
    return normalizeUidList(safeObject(data)[field]);
}

function hasUidInField(data, field, uid) {
    const normalizedUid = normalizeUid(uid);
    if (!normalizedUid) return false;
    return getUidListField(data, field).includes(normalizedUid);
}

async function readMirrorRelationshipState(userA, userB) {
    const first = normalizeUid(userA);
    const second = normalizeUid(userB);
    if (!first || !second || first === second) {
        return {
            areFriends: false,
            outgoingRequest: false,
            incomingRequest: false
        };
    }

    const [firstData, secondData] = await Promise.all([
        getReadableUserData(first),
        getReadableUserData(second)
    ]);

    const firstFriends = hasUidInField(firstData, "friends", second);
    const secondFriends = hasUidInField(secondData, "friends", first);
    const outgoingRequest = hasUidInField(firstData, "sentFriendRequests", second)
        || hasUidInField(secondData, "friendRequests", first);
    const incomingRequest = hasUidInField(firstData, "friendRequests", second)
        || hasUidInField(secondData, "sentFriendRequests", first);

    return {
        areFriends: firstFriends || secondFriends,
        outgoingRequest,
        incomingRequest
    };
}

async function getDirectoryDataByUid(uid) {
    const normalizedUid = normalizeUid(uid);
    if (!normalizedUid) return null;
    try {
        return await UserService.resolveAccountDirectoryEntryByUid(normalizedUid);
    } catch (error) {
        if (!isPermissionLikeError(error)) throw error;
        return null;
    }
}

async function resolveSnapshotForUid(uid, preferredSnapshot = null) {
    const normalizedUid = normalizeUid(uid);
    if (!normalizedUid) return null;
    const [userData, directoryData] = await Promise.all([
        getReadableUserData(normalizedUid),
        getDirectoryDataByUid(normalizedUid)
    ]);
    const resolvedSnapshot = buildSnapshotFromUserData(normalizedUid, userData || {}, directoryData || null);
    return mergeSnapshots(resolvedSnapshot, preferredSnapshot);
}

async function resolveUidCandidate(primaryValue, aliases = []) {
    const candidates = normalizeUidList([primaryValue, ...aliases]);
    for (const candidate of candidates) {
        try {
            const directSnap = await getDoc(doc(db, USERS_COLLECTION, candidate));
            if (directSnap.exists()) return candidate;
        } catch (error) {
            if (!isPermissionLikeError(error)) throw error;
        }

        try {
            const resolvedUid = await UserService.resolveUidByAccountId(candidate);
            if (resolvedUid) return normalizeUid(resolvedUid);
        } catch (error) {
            if (!isPermissionLikeError(error)) throw error;
        }
    }
    return normalizeUid(primaryValue);
}

function getFriendshipIdCandidates(userA, userB) {
    const first = normalizeUid(userA);
    const second = normalizeUid(userB);
    if (!first || !second || first === second) return [];
    const sorted = [first, second].sort();
    return [...new Set([
        `${sorted[0]}__${sorted[1]}`,
        `${first}__${second}`,
        `${second}__${first}`
    ])];
}

async function deleteDocIfExists(ref) {
    try {
        const snap = await getDoc(ref);
        if (!snap.exists()) return false;
        await deleteDoc(ref);
        return true;
    } catch (error) {
        if (!isPermissionLikeError(error)) throw error;
        return false;
    }
}

async function bestEffortUpdateUser(uid, payload) {
    const normalizedUid = normalizeUid(uid);
    if (!normalizedUid || !payload || typeof payload !== "object") return false;
    try {
        await updateDoc(doc(db, USERS_COLLECTION, normalizedUid), payload);
        return true;
    } catch (error) {
        if (!isPermissionLikeError(error)) throw error;
        return false;
    }
}

function mapQueryDocs(snapshot) {
    if (!snapshot || snapshot.empty) return [];
    return snapshot.docs.map((entryDoc) => ({
        id: entryDoc.id,
        ...safeObject(entryDoc.data())
    }));
}

export function buildFriendRequestId(fromUid, toUid) {
    const from = normalizeUid(fromUid);
    const to = normalizeUid(toUid);
    if (!from || !to || from === to) return "";
    return `${from}__${to}`;
}

export function buildFriendshipId(userA, userB) {
    const ids = getFriendshipIdCandidates(userA, userB);
    return ids.length ? ids[0] : "";
}

export async function incrementViewCount(uid) {
    const normalizedUid = normalizeUid(uid);
    if (!normalizedUid) return false;
    try {
        const userSnap = await getDoc(doc(db, USERS_COLLECTION, normalizedUid));
        if (!userSnap.exists()) return false;
        const data = userSnap.data() || {};
        const profile = safeObject(data.profile);
        const currentViews = Number(profile.views) || 0;
        await updateDoc(doc(db, USERS_COLLECTION, normalizedUid), {
            "profile.views": currentViews + 1
        });
        return true;
    } catch (error) {
        if (!isPermissionLikeError(error)) {
            console.warn("Failed to increment benchmark views:", error);
        }
        return false;
    }
}

export async function getFriendshipDocument(userA, userB) {
    const ids = getFriendshipIdCandidates(userA, userB);
    for (const id of ids) {
        try {
            const friendshipSnap = await getDoc(doc(db, FRIENDSHIPS_COLLECTION, id));
            if (friendshipSnap.exists()) return friendshipSnap;
        } catch (error) {
            if (!isPermissionLikeError(error)) throw error;
        }
    }
    return null;
}

export async function areFriends(userA, userB) {
    const first = normalizeUid(userA);
    const second = normalizeUid(userB);
    if (!first || !second || first === second) return false;
    const friendshipSnap = await getFriendshipDocument(first, second);
    return !!(friendshipSnap && friendshipSnap.exists());
}

export async function getFriendRequestDocument(fromUid, toUid) {
    const requestId = buildFriendRequestId(fromUid, toUid);
    if (!requestId) return null;
    try {
        const requestSnap = await getDoc(doc(db, FRIEND_REQUESTS_COLLECTION, requestId));
        return requestSnap.exists() ? requestSnap : null;
    } catch (error) {
        if (!isPermissionLikeError(error)) throw error;
        return null;
    }
}

export async function listIncomingFriendRequests(uid) {
    const normalizedUid = normalizeUid(uid);
    if (!normalizedUid) return [];
    const requestQuery = query(collection(db, FRIEND_REQUESTS_COLLECTION), where("toUid", "==", normalizedUid));
    return mapQueryDocs(await getDocs(requestQuery));
}

export async function listSentFriendRequests(uid) {
    const normalizedUid = normalizeUid(uid);
    if (!normalizedUid) return [];
    const requestQuery = query(collection(db, FRIEND_REQUESTS_COLLECTION), where("fromUid", "==", normalizedUid));
    return mapQueryDocs(await getDocs(requestQuery));
}

export async function listFriendships(uid) {
    const normalizedUid = normalizeUid(uid);
    if (!normalizedUid) return [];
    const friendshipQuery = query(collection(db, FRIENDSHIPS_COLLECTION), where("users", "array-contains", normalizedUid));
    return mapQueryDocs(await getDocs(friendshipQuery));
}

export async function sendFriendRequest(fromUid, toUid, options = {}) {
    const senderUid = normalizeUid(fromUid);
    const targetUid = normalizeUid(toUid);
    if (!senderUid || !targetUid) {
        throw new Error("sendFriendRequest requires both UIDs");
    }
    if (senderUid === targetUid) {
        const error = new Error("Cannot send a friend request to yourself");
        error.code = "friend/self";
        throw error;
    }
    if (await areFriends(senderUid, targetUid)) {
        const error = new Error("Users are already friends");
        error.code = "friend/already-friends";
        throw error;
    }

    const mirrorState = await readMirrorRelationshipState(senderUid, targetUid);
    if (mirrorState.areFriends) {
        const error = new Error("Users are already friends");
        error.code = "friend/already-friends";
        throw error;
    }

    const existingOutgoing = await getFriendRequestDocument(senderUid, targetUid);
    if (existingOutgoing) {
        const error = new Error("Friend request already exists");
        error.code = "friend/already-sent";
        throw error;
    }

    const existingIncoming = await getFriendRequestDocument(targetUid, senderUid);
    if (existingIncoming) {
        const error = new Error("Target user already sent a friend request");
        error.code = "friend/incoming-exists";
        throw error;
    }

    if (mirrorState.outgoingRequest) {
        const error = new Error("Friend request already exists");
        error.code = "friend/already-sent";
        throw error;
    }

    if (mirrorState.incomingRequest) {
        const error = new Error("Target user already sent a friend request");
        error.code = "friend/incoming-exists";
        throw error;
    }

    const requestId = buildFriendRequestId(senderUid, targetUid);
    const [senderSnapshot, targetSnapshot] = await Promise.all([
        resolveSnapshotForUid(senderUid, options.fromSnapshot || options.senderSnapshot || null),
        resolveSnapshotForUid(targetUid, options.toSnapshot || options.targetSnapshot || null)
    ]);

    let usedMirrorFallback = false;
    try {
        await setDoc(doc(db, FRIEND_REQUESTS_COLLECTION, requestId), {
            fromUid: senderUid,
            toUid: targetUid,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            fromSnapshot: senderSnapshot || null,
            toSnapshot: targetSnapshot || null
        });
    } catch (error) {
        if (!isPermissionLikeError(error)) throw error;
        usedMirrorFallback = true;
    }

    const [senderUpdated, targetUpdated] = await Promise.all([
        bestEffortUpdateUser(senderUid, {
            sentFriendRequests: arrayUnion(targetUid)
        }),
        bestEffortUpdateUser(targetUid, {
            friendRequests: arrayUnion(senderUid)
        })
    ]);

    if (usedMirrorFallback && (!senderUpdated || !targetUpdated)) {
        await Promise.all([
            senderUpdated
                ? bestEffortUpdateUser(senderUid, { sentFriendRequests: arrayRemove(targetUid) })
                : Promise.resolve(false),
            targetUpdated
                ? bestEffortUpdateUser(targetUid, { friendRequests: arrayRemove(senderUid) })
                : Promise.resolve(false)
        ]);
        const error = new Error("Friend request write failed");
        error.code = "friend/request-write-failed";
        throw error;
    }

    return {
        id: requestId,
        fromUid: senderUid,
        toUid: targetUid,
        fromSnapshot: senderSnapshot || null,
        toSnapshot: targetSnapshot || null,
        mirrorOnly: usedMirrorFallback
    };
}

export async function cancelFriendRequest(fromUid, toUid) {
    const senderUid = normalizeUid(fromUid);
    const targetUid = normalizeUid(toUid);
    const requestId = buildFriendRequestId(senderUid, targetUid);
    if (!requestId) return false;

    await deleteDocIfExists(doc(db, FRIEND_REQUESTS_COLLECTION, requestId));
    await Promise.all([
        bestEffortUpdateUser(senderUid, {
            sentFriendRequests: arrayRemove(targetUid)
        }),
        bestEffortUpdateUser(targetUid, {
            friendRequests: arrayRemove(senderUid)
        })
    ]);
    return true;
}

export async function declineFriendRequest(userUid, fromUid) {
    const currentUid = normalizeUid(userUid);
    const requesterUid = normalizeUid(fromUid);
    const requestId = buildFriendRequestId(requesterUid, currentUid);
    if (!requestId) return false;

    await deleteDocIfExists(doc(db, FRIEND_REQUESTS_COLLECTION, requestId));
    await Promise.all([
        bestEffortUpdateUser(currentUid, {
            friendRequests: arrayRemove(requesterUid)
        }),
        bestEffortUpdateUser(requesterUid, {
            sentFriendRequests: arrayRemove(currentUid)
        })
    ]);
    return true;
}

export async function acceptFriendRequest(userUid, fromUid, options = {}) {
    const currentUid = normalizeUid(userUid);
    const requesterUid = normalizeUid(fromUid);
    if (!currentUid || !requesterUid || currentUid === requesterUid) {
        throw new Error("acceptFriendRequest requires two distinct UIDs");
    }

    const requestSnap = await getFriendRequestDocument(requesterUid, currentUid);
    const mirrorState = await readMirrorRelationshipState(currentUid, requesterUid);
    if (!requestSnap && !mirrorState.incomingRequest) {
        const error = new Error("Friend request not found");
        error.code = "friend/request-not-found";
        throw error;
    }

    const requestData = requestSnap ? (requestSnap.data() || {}) : {};
    const [requesterSnapshot, currentSnapshot] = await Promise.all([
        resolveSnapshotForUid(requesterUid, safeObject(requestData.fromSnapshot)),
        resolveSnapshotForUid(currentUid, mergeSnapshots(
            safeObject(requestData.toSnapshot),
            options.currentSnapshot || null
        ))
    ]);

    const friendshipRef = doc(db, FRIENDSHIPS_COLLECTION, buildFriendshipId(currentUid, requesterUid));
    let friendshipCreated = false;
    try {
        await setDoc(friendshipRef, {
            users: [currentUid, requesterUid].sort(),
            createdAt: pickNonEmpty(requestData.createdAt, Date.now()),
            updatedAt: Date.now(),
            snapshotByUid: {
                [requesterUid]: requesterSnapshot || null,
                [currentUid]: currentSnapshot || null
            }
        });
        friendshipCreated = true;
    } catch (error) {
        if (!isPermissionLikeError(error)) throw error;
    }

    if (requestSnap) {
        await deleteDocIfExists(requestSnap.ref);
    }

    const reverseRequestRef = doc(db, FRIEND_REQUESTS_COLLECTION, buildFriendRequestId(currentUid, requesterUid));
    const reverseRequestDeleted = await deleteDocIfExists(reverseRequestRef);

    const currentUserPayload = {
        friends: arrayUnion(requesterUid),
        friendRequests: arrayRemove(requesterUid)
    };
    if (reverseRequestDeleted) {
        currentUserPayload.sentFriendRequests = arrayRemove(requesterUid);
    }

    const requesterPayload = {
        friends: arrayUnion(currentUid),
        sentFriendRequests: arrayRemove(currentUid)
    };
    if (reverseRequestDeleted) {
        requesterPayload.friendRequests = arrayRemove(currentUid);
    }

    const [currentUpdated, requesterUpdated] = await Promise.all([
        bestEffortUpdateUser(currentUid, currentUserPayload),
        bestEffortUpdateUser(requesterUid, requesterPayload)
    ]);

    if (!friendshipCreated && !currentUpdated && !requesterUpdated) {
        const error = new Error("Friend acceptance write failed");
        error.code = "friend/accept-write-failed";
        throw error;
    }

    return {
        friendshipId: friendshipRef.id,
        users: [currentUid, requesterUid],
        mirrorOnly: !friendshipCreated
    };
}

export async function pruneSentFriendRequests(uid) {
    const currentUid = normalizeUid(uid);
    if (!currentUid) return [];

    const userSnap = await getReadableUserData(currentUid);
    const sentRequestUids = normalizeUidList(safeObject(userSnap).sentFriendRequests);
    if (!sentRequestUids.length) return [];

    const staleUids = [];
    for (const targetUid of sentRequestUids) {
        const requestSnap = await getFriendRequestDocument(currentUid, targetUid);
        if (!requestSnap) staleUids.push(targetUid);
    }

    if (!staleUids.length) return [];

    await bestEffortUpdateUser(currentUid, {
        sentFriendRequests: arrayRemove(...staleUids)
    });
    return staleUids;
}

export async function removeFriend(userUid, targetValue, options = {}) {
    const currentUid = await resolveUidCandidate(userUid, options.currentUserAliases || []);
    const targetUid = await resolveUidCandidate(targetValue, options.friendAliases || []);
    if (!currentUid || !targetUid || currentUid === targetUid) {
        throw new Error("removeFriend requires two distinct users");
    }

    const friendshipIds = getFriendshipIdCandidates(currentUid, targetUid);
    await Promise.all(friendshipIds.map((id) => deleteDocIfExists(doc(db, FRIENDSHIPS_COLLECTION, id))));

    await Promise.all([
        deleteDocIfExists(doc(db, FRIEND_REQUESTS_COLLECTION, buildFriendRequestId(currentUid, targetUid))),
        deleteDocIfExists(doc(db, FRIEND_REQUESTS_COLLECTION, buildFriendRequestId(targetUid, currentUid)))
    ]);

    await Promise.all([
        bestEffortUpdateUser(currentUid, {
            friends: arrayRemove(targetUid),
            friendRequests: arrayRemove(targetUid),
            sentFriendRequests: arrayRemove(targetUid)
        }),
        bestEffortUpdateUser(targetUid, {
            friends: arrayRemove(currentUid),
            friendRequests: arrayRemove(currentUid),
            sentFriendRequests: arrayRemove(currentUid)
        })
    ]);

    return {
        removed: true,
        userUid: currentUid,
        targetUid
    };
}
