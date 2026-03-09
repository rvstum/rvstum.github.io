import { doc, setDoc, getDoc, collection, query, where, getDocs, deleteDoc, updateDoc, arrayUnion, arrayRemove, deleteField } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./client.js";
import { normalizeFriendRequestIds } from "./utils.js";
import { FINAL_RANK_INDEX, RANK_NAMES } from "./constants.js";

const ACCOUNT_DIRECTORY_COLLECTION = "publicAccountDirectory";
const HIGHLIGHT_LIKE_EDGES_COLLECTION = "highlightLikeEdges";
const FRIEND_REQUESTS_COLLECTION = "friendRequests";
const FRIENDSHIPS_COLLECTION = "friendships";

export async function updateUserData(uid, data) {
    if (!uid) return;
    try {
        await setDoc(doc(db, 'users', uid), data, { merge: true });
    } catch (e) {
        console.error('Error saving user data:', e);
        throw e;
    }
}

export async function deleteUserDocument(uid) {
    if (!uid) return;
    await deleteDoc(doc(db, 'users', uid));
}

export async function getUserDocument(uid) {
    if (!uid) return null;
    return await getDoc(doc(db, 'users', uid));
}

export async function resolveUserDocByIdentifier(identifier) {
    const candidates = normalizeFriendRequestIds([identifier]);
    if (typeof identifier === 'string' && identifier.trim() !== '') {
        const raw = identifier.trim();
        if (!candidates.includes(raw)) candidates.unshift(raw);
    }

    for (const candidate of candidates) {
        try {
            const directDoc = await getDoc(doc(db, 'users', candidate));
            if (directDoc.exists()) return directDoc;
        } catch (e) {
            if (!isPermissionLikeError(e)) throw e;
        }
    }
    return null;
}

function normalizeHighlightLikesMap(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const normalized = {};
    Object.entries(value).forEach(([highlightId, rawEntry]) => {
        if (typeof highlightId !== "string" || !highlightId.trim()) return;
        const entry = rawEntry && typeof rawEntry === "object" && !Array.isArray(rawEntry) ? rawEntry : {};
        const likedByRaw = entry.likedBy;
        const likedBy = {};
        if (Array.isArray(likedByRaw)) {
            likedByRaw.forEach((uid) => {
                if (typeof uid !== "string" || !uid.trim()) return;
                likedBy[uid] = true;
            });
        } else if (likedByRaw && typeof likedByRaw === "object" && !Array.isArray(likedByRaw)) {
            Object.entries(likedByRaw).forEach(([uid, liked]) => {
                if (typeof uid !== "string" || !uid.trim()) return;
                if (liked === true) likedBy[uid] = true;
            });
        }
        normalized[highlightId] = {
            count: Object.keys(likedBy).length,
            likedBy
        };
    });
    return normalized;
}

function sanitizeFieldSegment(value) {
    return (value || "")
        .toString()
        .trim()
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "");
}

function buildLikedHighlightKey(ownerUid, highlightId) {
    const ownerPart = sanitizeFieldSegment(ownerUid) || "owner";
    const highlightPart = sanitizeFieldSegment(highlightId) || "highlight";
    return `${ownerPart}__${highlightPart}`;
}

function parseLikedHighlightKey(likeKey) {
    const raw = typeof likeKey === "string" ? likeKey.trim() : "";
    if (!raw) return null;
    const parts = raw.split("__");
    if (parts.length !== 2) return null;
    const ownerUid = parts[0] ? parts[0].trim() : "";
    const highlightId = parts[1] ? parts[1].trim() : "";
    if (!ownerUid || !highlightId) return null;
    return { ownerUid, highlightId };
}

function normalizeAccountDirectoryId(accountId) {
    return (accountId || "")
        .toString()
        .trim()
        .replace(/[^a-zA-Z0-9]/g, "")
        .toUpperCase();
}

function normalizeUidArray(value) {
    if (!Array.isArray(value)) return [];
    return [...new Set(value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter((item) => item !== ""))];
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
    const raw = typeof rankName === "string" ? rankName.trim() : "";
    if (!raw) return 0;
    const lower = raw.toLowerCase();
    for (let i = FINAL_RANK_INDEX; i >= 1; i--) {
        const known = String(RANK_NAMES[i] || "").toLowerCase();
        if (known && lower.includes(known)) {
            return i;
        }
    }
    return 0;
}

function derivePublicRankIndex(userData = {}) {
    const safeData = userData && typeof userData === "object" ? userData : {};
    const settings = safeData.settings && typeof safeData.settings === "object" ? safeData.settings : {};
    const profile = safeData.profile && typeof safeData.profile === "object" ? safeData.profile : {};
    const numericCandidates = [
        safeData.maxRankIndex,
        safeData.rankIndex,
        settings.rankThemeUnlock,
        profile.maxRankIndex,
        profile.rankIndex
    ];

    let best = 0;
    numericCandidates.forEach((value) => {
        const rank = clampRankIndex(value);
        if (rank > best) best = rank;
    });

    const themedRank = parseRankIndexFromTheme(settings.theme);
    if (themedRank > best) best = themedRank;

    [
        safeData.currentRank,
        profile.currentRank
    ].forEach((value) => {
        const rank = parseRankIndexFromName(value);
        if (rank > best) best = rank;
    });

    return best;
}

function buildAccountDirectoryPreview(userData = {}) {
    const safeData = userData && typeof userData === "object" ? userData : {};
    const profile = safeData.profile && typeof safeData.profile === "object" ? safeData.profile : {};
    const username = typeof safeData.username === "string" && safeData.username.trim() !== ""
        ? safeData.username.trim()
        : (typeof profile.username === "string" ? profile.username.trim() : "");
    return {
        username,
        rankIndex: derivePublicRankIndex(safeData),
        flag: typeof profile.flag === "string" ? profile.flag.trim() : "",
        pic: typeof profile.pic === "string" ? profile.pic.trim() : ""
    };
}

function buildHighlightLikeEdgeId(ownerUid, highlightId, likerUid) {
    const ownerPart = sanitizeFieldSegment(ownerUid) || "owner";
    const highlightPart = sanitizeFieldSegment(highlightId) || "highlight";
    const likerPart = sanitizeFieldSegment(likerUid) || "liker";
    return `${ownerPart}__${highlightPart}__${likerPart}`;
}

function isPermissionLikeError(err) {
    if (!err || typeof err !== "object") return false;
    const code = typeof err.code === "string" ? err.code : "";
    return code === "permission-denied" || code === "not-found";
}

function isNotFoundError(err) {
    if (!err || typeof err !== "object") return false;
    return (typeof err.code === "string" ? err.code : "") === "not-found";
}

function sanitizeLegacySegment(value) {
    const text = (value || "").toString().toLowerCase();
    const cleaned = text.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    return cleaned || "item";
}

function resolveHighlightLikeId(item, index) {
    if (!item || typeof item !== "object") return "";
    const explicitId = typeof item.id === "string" ? item.id.trim() : "";
    if (explicitId) return explicitId;

    const createdAt = Number(item.createdAt);
    if (Number.isFinite(createdAt) && createdAt > 0) {
        return `hl_legacy_${Math.trunc(createdAt)}`;
    }

    const updatedAt = Number(item.updatedAt);
    const stableTime = Number.isFinite(updatedAt) && updatedAt > 0 ? Math.trunc(updatedAt) : 0;
    const titlePart = sanitizeLegacySegment(item.title);
    return `hl_legacy_${stableTime}_${titlePart}_${Number(index) || 0}`;
}

function buildHighlightCanonicalMap(highlights, baseLikes) {
    const canonicalById = {};
    const canonicalIds = new Set();
    const normalizedBase = normalizeHighlightLikesMap(baseLikes);
    Object.keys(normalizedBase).forEach((id) => {
        canonicalById[id] = id;
        canonicalIds.add(id);
    });

    if (Array.isArray(highlights)) {
        highlights.forEach((item, index) => {
            const canonicalId = resolveHighlightLikeId(item, index);
            if (!canonicalId) return;
            canonicalById[canonicalId] = canonicalId;
            canonicalIds.add(canonicalId);

            const legacyId = (!item || typeof item !== "object")
                ? ""
                : (() => {
                    const createdAt = Number(item.createdAt);
                    if (Number.isFinite(createdAt) && createdAt > 0) {
                        return `hl_legacy_${Math.trunc(createdAt)}`;
                    }
                    const updatedAt = Number(item.updatedAt);
                    const stableTime = Number.isFinite(updatedAt) && updatedAt > 0 ? Math.trunc(updatedAt) : 0;
                    const titlePart = sanitizeLegacySegment(item.title);
                    return `hl_legacy_${stableTime}_${titlePart}_${Number(index) || 0}`;
                })();
            if (legacyId && legacyId !== canonicalId) {
                canonicalById[legacyId] = canonicalId;
            }
        });
    }

    return {
        canonicalById,
        canonicalIds: [...canonicalIds]
    };
}

export async function syncAccountDirectoryEntry(uid, accountId, userData = null) {
    const targetUid = typeof uid === "string" ? uid.trim() : "";
    const normalizedAccountId = normalizeAccountDirectoryId(accountId);
    if (!targetUid || !normalizedAccountId) return false;
    const payload = {
        uid: targetUid,
        accountId: normalizedAccountId,
        updatedAt: Date.now()
    };
    if (userData && typeof userData === "object") {
        const preview = buildAccountDirectoryPreview({
            ...userData,
            accountId: normalizedAccountId
        });
        payload.username = preview.username || "";
        payload.rankIndex = preview.rankIndex;
        payload.flag = preview.flag || "";
        payload.pic = preview.pic || "";
    }
    await setDoc(doc(db, ACCOUNT_DIRECTORY_COLLECTION, normalizedAccountId), payload, { merge: true });
    return true;
}

export async function resolveUidByAccountId(accountId) {
    const entry = await resolveAccountDirectoryEntry(accountId);
    if (!entry) return "";
    return typeof entry.uid === "string" ? entry.uid.trim() : "";
}

export async function resolveAccountDirectoryEntry(accountId) {
    const normalizedAccountId = normalizeAccountDirectoryId(accountId);
    if (!normalizedAccountId) return null;
    try {
        const directorySnap = await getDoc(doc(db, ACCOUNT_DIRECTORY_COLLECTION, normalizedAccountId));
        if (!directorySnap.exists()) return null;
        return directorySnap.data() || null;
    } catch (e) {
        if (!isPermissionLikeError(e)) throw e;
        return null;
    }
}

export async function resolveAccountDirectoryEntryByUid(uid) {
    const normalizedUid = typeof uid === "string" ? uid.trim() : "";
    if (!normalizedUid) return null;
    try {
        const directorySnap = await getDocs(query(collection(db, ACCOUNT_DIRECTORY_COLLECTION), where("uid", "==", normalizedUid)));
        if (directorySnap.empty) return null;
        return directorySnap.docs[0].data() || null;
    } catch (e) {
        if (!isPermissionLikeError(e)) throw e;
        return null;
    }
}

async function removeUserRelationshipReferences(targetUid, ownerUid) {
    const normalizedTargetUid = typeof targetUid === "string" ? targetUid.trim() : "";
    const normalizedOwnerUid = typeof ownerUid === "string" ? ownerUid.trim() : "";
    if (!normalizedTargetUid || !normalizedOwnerUid || normalizedTargetUid === normalizedOwnerUid) return false;
    try {
        await updateDoc(doc(db, "users", normalizedOwnerUid), {
            friends: arrayRemove(normalizedTargetUid),
            friendRequests: arrayRemove(normalizedTargetUid),
            sentFriendRequests: arrayRemove(normalizedTargetUid)
        });
        return true;
    } catch (e) {
        if (!isPermissionLikeError(e)) throw e;
        return false;
    }
}

async function removeHighlightLikeOwnerReferences(ownerUid, likerUid, highlightIds = []) {
    const normalizedOwnerUid = typeof ownerUid === "string" ? ownerUid.trim() : "";
    const normalizedLikerUid = typeof likerUid === "string" ? likerUid.trim() : "";
    const sanitizedHighlightIds = normalizeUidArray(highlightIds);
    if (!normalizedOwnerUid || !normalizedLikerUid || !sanitizedHighlightIds.length) return false;

    const patch = {};
    sanitizedHighlightIds.forEach((highlightId) => {
        patch[`highlightLikes.${highlightId}.likedBy`] = arrayRemove(normalizedLikerUid);
    });

    try {
        await updateDoc(doc(db, "users", normalizedOwnerUid), patch);
        return true;
    } catch (e) {
        if (!isPermissionLikeError(e)) throw e;
        return false;
    }
}

async function deleteDirectoryEntriesForUid(targetUid) {
    const normalizedUid = typeof targetUid === "string" ? targetUid.trim() : "";
    if (!normalizedUid) return 0;
    const directorySnap = await getDocs(query(collection(db, ACCOUNT_DIRECTORY_COLLECTION), where("uid", "==", normalizedUid)));
    if (directorySnap.empty) return 0;
    await Promise.all(directorySnap.docs.map(async (entryDoc) => {
        try {
            await deleteDoc(entryDoc.ref);
        } catch (e) {
            if (!isNotFoundError(e)) throw e;
        }
    }));
    return directorySnap.size;
}

export async function cleanupUserDataForAccountDeletion(uid, options = {}) {
    const targetUid = typeof uid === "string" ? uid.trim() : "";
    if (!targetUid) {
        throw new Error("cleanupUserDataForAccountDeletion requires a uid");
    }

    const cleanupSummary = {
        deletedUserDoc: false,
        deletedDirectoryEntries: 0,
        deletedIncomingRequests: 0,
        deletedOutgoingRequests: 0,
        deletedFriendships: 0,
        deletedOwnedLikeEdges: 0,
        deletedLikedByUserEdges: 0
    };

    let userData = {};
    const userSnap = await getDoc(doc(db, "users", targetUid));
    if (userSnap.exists()) {
        userData = userSnap.data() || {};
    }

    const counterpartUidSet = new Set();
    const likeOwnersByHighlightIds = new Map();

    const outgoingRequestsSnap = await getDocs(query(collection(db, FRIEND_REQUESTS_COLLECTION), where("fromUid", "==", targetUid)));
    cleanupSummary.deletedOutgoingRequests = outgoingRequestsSnap.size;
    outgoingRequestsSnap.forEach((requestDoc) => {
        const requestData = requestDoc.data() || {};
        const toUid = typeof requestData.toUid === "string" ? requestData.toUid.trim() : "";
        if (toUid && toUid !== targetUid) counterpartUidSet.add(toUid);
    });
    await Promise.all(outgoingRequestsSnap.docs.map(async (requestDoc) => {
        try {
            await deleteDoc(requestDoc.ref);
        } catch (e) {
            if (!isNotFoundError(e)) throw e;
        }
    }));

    const incomingRequestsSnap = await getDocs(query(collection(db, FRIEND_REQUESTS_COLLECTION), where("toUid", "==", targetUid)));
    cleanupSummary.deletedIncomingRequests = incomingRequestsSnap.size;
    incomingRequestsSnap.forEach((requestDoc) => {
        const requestData = requestDoc.data() || {};
        const fromUid = typeof requestData.fromUid === "string" ? requestData.fromUid.trim() : "";
        if (fromUid && fromUid !== targetUid) counterpartUidSet.add(fromUid);
    });
    await Promise.all(incomingRequestsSnap.docs.map(async (requestDoc) => {
        try {
            await deleteDoc(requestDoc.ref);
        } catch (e) {
            if (!isNotFoundError(e)) throw e;
        }
    }));

    const friendshipsSnap = await getDocs(query(collection(db, FRIENDSHIPS_COLLECTION), where("users", "array-contains", targetUid)));
    cleanupSummary.deletedFriendships = friendshipsSnap.size;
    friendshipsSnap.forEach((friendshipDoc) => {
        const friendshipData = friendshipDoc.data() || {};
        normalizeUidArray(friendshipData.users).forEach((friendUid) => {
            if (friendUid !== targetUid) counterpartUidSet.add(friendUid);
        });
    });
    await Promise.all(friendshipsSnap.docs.map(async (friendshipDoc) => {
        try {
            await deleteDoc(friendshipDoc.ref);
        } catch (e) {
            if (!isNotFoundError(e)) throw e;
        }
    }));

    const ownedLikeEdgesSnap = await getDocs(query(collection(db, HIGHLIGHT_LIKE_EDGES_COLLECTION), where("ownerUid", "==", targetUid)));
    cleanupSummary.deletedOwnedLikeEdges = ownedLikeEdgesSnap.size;
    await Promise.all(ownedLikeEdgesSnap.docs.map(async (edgeDoc) => {
        try {
            await deleteDoc(edgeDoc.ref);
        } catch (e) {
            if (!isNotFoundError(e)) throw e;
        }
    }));

    const likedByUserEdgesSnap = await getDocs(query(collection(db, HIGHLIGHT_LIKE_EDGES_COLLECTION), where("likerUid", "==", targetUid)));
    cleanupSummary.deletedLikedByUserEdges = likedByUserEdgesSnap.size;
    likedByUserEdgesSnap.forEach((edgeDoc) => {
        const edgeData = edgeDoc.data() || {};
        const ownerUid = typeof edgeData.ownerUid === "string" ? edgeData.ownerUid.trim() : "";
        const highlightId = typeof edgeData.highlightId === "string" ? edgeData.highlightId.trim() : "";
        if (!ownerUid || !highlightId || ownerUid === targetUid) return;
        if (!likeOwnersByHighlightIds.has(ownerUid)) likeOwnersByHighlightIds.set(ownerUid, new Set());
        likeOwnersByHighlightIds.get(ownerUid).add(highlightId);
    });
    await Promise.all(likedByUserEdgesSnap.docs.map(async (edgeDoc) => {
        try {
            await deleteDoc(edgeDoc.ref);
        } catch (e) {
            if (!isNotFoundError(e)) throw e;
        }
    }));

    const ownFriends = normalizeUidArray(userData.friends);
    const ownIncomingRequests = normalizeUidArray(userData.friendRequests);
    const ownSentRequests = normalizeUidArray(userData.sentFriendRequests);
    [...ownFriends, ...ownIncomingRequests, ...ownSentRequests].forEach((relatedUid) => {
        if (relatedUid && relatedUid !== targetUid) counterpartUidSet.add(relatedUid);
    });

    const relationshipCleanupTasks = [...counterpartUidSet].map((counterpartUid) =>
        removeUserRelationshipReferences(targetUid, counterpartUid)
    );
    await Promise.all(relationshipCleanupTasks);

    const likeCleanupTasks = [...likeOwnersByHighlightIds.entries()].map(([ownerUid, highlightIds]) =>
        removeHighlightLikeOwnerReferences(ownerUid, targetUid, [...highlightIds])
    );
    await Promise.all(likeCleanupTasks);

    const explicitAccountId = typeof options.accountId === "string" ? options.accountId : "";
    const fallbackAccountId = typeof userData.accountId === "string"
        ? userData.accountId
        : (userData.profile && typeof userData.profile.accountId === "string" ? userData.profile.accountId : "");
    const normalizedAccountId = normalizeAccountDirectoryId(explicitAccountId || fallbackAccountId);
    if (normalizedAccountId) {
        try {
            await deleteDoc(doc(db, ACCOUNT_DIRECTORY_COLLECTION, normalizedAccountId));
            cleanupSummary.deletedDirectoryEntries += 1;
        } catch (e) {
            if (!isNotFoundError(e)) throw e;
        }
    }
    try {
        cleanupSummary.deletedDirectoryEntries += await deleteDirectoryEntriesForUid(targetUid);
    } catch (e) {
        if (!isPermissionLikeError(e)) throw e;
    }

    try {
        await deleteDoc(doc(db, "users", targetUid));
    } catch (e) {
        if (!isNotFoundError(e)) throw e;
    }
    cleanupSummary.deletedUserDoc = true;

    return cleanupSummary;
}

async function syncHighlightLikeEdge(ownerUid, highlightId, likerUid, shouldLike) {
    const edgeId = buildHighlightLikeEdgeId(ownerUid, highlightId, likerUid);
    const edgeRef = doc(db, HIGHLIGHT_LIKE_EDGES_COLLECTION, edgeId);
    try {
        if (shouldLike) {
            await setDoc(edgeRef, {
                ownerUid,
                highlightId,
                likerUid,
                updatedAt: Date.now()
            }, { merge: true });
            return true;
        }
        await deleteDoc(edgeRef);
        return false;
    } catch (e) {
        if (!isPermissionLikeError(e)) throw e;
        return false;
    }
}

export async function toggleHighlightLike(ownerUid, highlightId, likerUid, options = {}) {
    const targetOwnerUid = typeof ownerUid === "string" ? ownerUid.trim() : "";
    const targetHighlightId = typeof highlightId === "string" ? highlightId.trim() : "";
    const targetLikerUid = typeof likerUid === "string" ? likerUid.trim() : "";
    if (!targetOwnerUid || !targetHighlightId || !targetLikerUid) {
        throw new Error("toggleHighlightLike requires ownerUid, highlightId, and likerUid");
    }

    const currentlyLiked = options && typeof options.currentLiked === "boolean"
        ? options.currentLiked
        : false;
    const currentCount = Number.isFinite(Number(options && options.currentCount))
        ? Number(options.currentCount)
        : 0;
    const nextLiked = !currentlyLiked;
    const nextCount = Math.max(0, currentCount + (nextLiked ? 1 : -1));

    const likeKey = buildLikedHighlightKey(targetOwnerUid, targetHighlightId);
    const likerRef = doc(db, "users", targetLikerUid);
    await setDoc(likerRef, {
        likedHighlights: {
            [likeKey]: nextLiked ? true : deleteField()
        }
    }, { merge: true });
    await syncHighlightLikeEdge(targetOwnerUid, targetHighlightId, targetLikerUid, nextLiked);

    const ownerRef = doc(db, "users", targetOwnerUid);
    const ownerUpdate = {
        [`highlightLikes.${targetHighlightId}.likedBy`]: nextLiked ? arrayUnion(targetLikerUid) : arrayRemove(targetLikerUid)
    };
    let fallbackSavedToAccount = false;

    try {
        await updateDoc(ownerRef, ownerUpdate);
    } catch (e) {
        const code = e && typeof e.code === "string" ? e.code : "";
        if (code === "permission-denied" || code === "not-found") {
            fallbackSavedToAccount = true;
        } else {
            throw e;
        }
    }

    return {
        count: nextCount,
        liked: nextLiked,
        fallbackSavedToAccount,
        likeKey
    };
}

export function makeLikedHighlightKey(ownerUid, highlightId) {
    return buildLikedHighlightKey(ownerUid, highlightId);
}

export function normalizeHighlightLikes(value) {
    return normalizeHighlightLikesMap(value);
}

export function normalizeLikedHighlights(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const normalized = {};
    Object.entries(value).forEach(([key, liked]) => {
        if (typeof key !== "string" || !key.trim()) return;
        if (liked === true) normalized[key.trim()] = true;
    });
    return normalized;
}

export async function backfillLikedHighlightEdges(likerUid, likedHighlights = {}) {
    const targetLikerUid = typeof likerUid === "string" ? likerUid.trim() : "";
    const normalized = normalizeLikedHighlights(likedHighlights);
    if (!targetLikerUid || !Object.keys(normalized).length) return 0;

    let synced = 0;
    await Promise.all(Object.keys(normalized).map(async (likeKey) => {
        const parsed = parseLikedHighlightKey(likeKey);
        if (!parsed) return;
        try {
            await syncHighlightLikeEdge(parsed.ownerUid, parsed.highlightId, targetLikerUid, true);
            synced += 1;
        } catch (e) {
            if (!isPermissionLikeError(e)) {
                console.error("Error backfilling highlight like edge:", e);
            }
        }
    }));
    return synced;
}

export async function resolveAggregatedHighlightLikes(ownerUid, highlights = [], baseLikes = {}) {
    const targetOwnerUid = typeof ownerUid === "string" ? ownerUid.trim() : "";
    const normalizedBase = normalizeHighlightLikesMap(baseLikes);
    if (!targetOwnerUid) return normalizedBase;

    const { canonicalById, canonicalIds } = buildHighlightCanonicalMap(highlights, normalizedBase);
    if (canonicalIds.length === 0) return normalizedBase;

    const merged = {};
    canonicalIds.forEach((highlightId) => {
        const baseEntry = normalizedBase[highlightId];
        const likedBy = (baseEntry && baseEntry.likedBy && typeof baseEntry.likedBy === "object")
            ? { ...baseEntry.likedBy }
            : {};
        merged[highlightId] = {
            count: Object.keys(likedBy).length,
            likedBy
        };
    });

    Object.entries(normalizedBase).forEach(([rawId, entry]) => {
        const canonicalId = canonicalById[rawId] || rawId;
        if (!merged[canonicalId]) {
            merged[canonicalId] = { count: 0, likedBy: {} };
        }
        const likedBy = entry && entry.likedBy && typeof entry.likedBy === "object" ? entry.likedBy : {};
        Object.keys(likedBy).forEach((likerUid) => {
            if (typeof likerUid !== "string" || !likerUid.trim()) return;
            merged[canonicalId].likedBy[likerUid.trim()] = true;
        });
        merged[canonicalId].count = Object.keys(merged[canonicalId].likedBy).length;
    });

    try {
        const likesSnap = await getDocs(query(collection(db, HIGHLIGHT_LIKE_EDGES_COLLECTION), where("ownerUid", "==", targetOwnerUid)));
        likesSnap.forEach((likeDoc) => {
            const likeData = likeDoc.data() || {};
            const rawHighlightId = typeof likeData.highlightId === "string" ? likeData.highlightId.trim() : "";
            const likerUid = typeof likeData.likerUid === "string" ? likeData.likerUid.trim() : "";
            if (!rawHighlightId || !likerUid) return;
            const canonicalId = canonicalById[rawHighlightId] || rawHighlightId;
            if (!merged[canonicalId]) {
                merged[canonicalId] = { count: 0, likedBy: {} };
            }
            merged[canonicalId].likedBy[likerUid] = true;
        });
    } catch (e) {
        const code = e && typeof e.code === "string" ? e.code : "";
        if (code !== "permission-denied") {
            console.error(`Error aggregating likes for owner ${targetOwnerUid}:`, e);
        }
    }

    Object.values(merged).forEach((entry) => {
        entry.count = Object.keys(entry.likedBy).length;
    });

    return merged;
}
