import { doc, setDoc, getDoc, collection, query, where, getDocs, deleteDoc, updateDoc, arrayRemove } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./client.js";
import { normalizeFriendRequestIds } from "./utils.js";
import { FINAL_RANK_INDEX, RANK_NAMES } from "./constants.js";
import { calculateRankFromData } from "./scoring.js";
import { buildProfileSlug } from "./slugs.js?v=20260310-public-slug-directory-1";

const ACCOUNT_DIRECTORY_COLLECTION = "publicAccountDirectory";
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
    let best = clampRankIndex(calculateRankFromData(safeData));
    const numericCandidates = [
        safeData.maxRankIndex,
        safeData.rankIndex,
        settings.rankThemeUnlock,
        profile.maxRankIndex,
        profile.rankIndex
    ];

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
    const settings = safeData.settings && typeof safeData.settings === "object" ? safeData.settings : {};
    const username = typeof safeData.username === "string" && safeData.username.trim() !== ""
        ? safeData.username.trim()
        : (typeof profile.username === "string" ? profile.username.trim() : "");
    const accountId = typeof safeData.accountId === "string" && safeData.accountId.trim() !== ""
        ? safeData.accountId.trim()
        : (typeof profile.accountId === "string" ? profile.accountId.trim() : "");
    const fallbackUid = typeof safeData.uid === "string" ? safeData.uid.trim() : "";
    const explicitPublicSlug = typeof safeData.publicSlug === "string" ? safeData.publicSlug.trim() : "";
    const visibility = typeof settings.visibility === "string" && settings.visibility.trim() !== ""
        ? settings.visibility.trim()
        : "everyone";
    return {
        username,
        rankIndex: derivePublicRankIndex(safeData),
        flag: typeof profile.flag === "string" ? profile.flag.trim() : "",
        pic: typeof profile.pic === "string" ? profile.pic.trim() : "",
        publicSlug: explicitPublicSlug || buildProfileSlug(username || "player", accountId, fallbackUid),
        visibility
    };
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
            accountId: normalizedAccountId,
            uid: targetUid
        });
        payload.username = preview.username || "";
        payload.rankIndex = preview.rankIndex;
        payload.flag = preview.flag || "";
        payload.pic = preview.pic || "";
        payload.publicSlug = preview.publicSlug || "";
        payload.visibility = preview.visibility || "everyone";
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
        deletedFriendships: 0
    };

    let userData = {};
    const userSnap = await getDoc(doc(db, "users", targetUid));
    if (userSnap.exists()) {
        userData = userSnap.data() || {};
    }

    const counterpartUidSet = new Set();

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
