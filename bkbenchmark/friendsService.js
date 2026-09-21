import {
    arrayRemove,
    arrayUnion,
    collection,
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    query,
    setDoc,
    where,
    writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db } from "./client.js";
import { FINAL_RANK_INDEX, RANK_NAMES } from "./constants.js";
import { calculateRankFromData } from "./scoring.js";
import * as ScoreManager from "./scoreManager.js?v=20260920-friend-graph";
import {
    PROFILE_VIEW_COOLDOWNS_STORAGE_KEY,
    PROFILE_VIEW_GUEST_ID_STORAGE_KEY,
    readJson,
    readString,
    writeJson,
    writeString
} from "./storage.js";
import * as UserService from "./userService.js";
import { resolveProfileAccountId, resolveProfileSlug, resolveProfileUsername } from "./slugs.js";

const USERS_COLLECTION = "users";
const FRIEND_REQUESTS_COLLECTION = "friendRequests";
const FRIENDSHIPS_COLLECTION = "friendships";
const PROFILE_VIEW_COOLDOWN_MS = 5 * 60 * 1000;
const PROFILE_VIEW_COOLDOWN_KEY_SEPARATOR = "::";
const MAX_PROFILE_GUILDS = 6;
let cachedGuestProfileViewerId = "";

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

function normalizeGuildList(value) {
    if (!Array.isArray(value)) return [];
    return [...new Set(value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter((item) => item !== ""))]
        .slice(0, MAX_PROFILE_GUILDS);
}

function resolveGuildListFromUserData(data = {}, directoryData = null) {
    const safeData = safeObject(data);
    const profile = safeObject(safeData.profile);
    const safeDirectoryData = safeObject(directoryData);
    const fromProfile = normalizeGuildList(profile.guilds);
    if (fromProfile.length) return fromProfile;
    const fromRoot = normalizeGuildList(safeData.guilds);
    if (fromRoot.length) return fromRoot;
    return normalizeGuildList(safeDirectoryData.guilds);
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

function pickHighestRankIndex(...values) {
    let best = 0;
    values.forEach((value) => {
        const candidate = clampRankIndex(value);
        if (candidate > best) best = candidate;
    });
    return best;
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
            if (Array.isArray(value)) {
                const normalizedList = normalizeGuildList(value);
                if (normalizedList.length) merged[key] = normalizedList;
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
    const explicitRankName = pickNonEmpty(
        safeData.currentRank,
        profile.currentRank
    );
    const parsedRankIndex = parseRankIndexFromName(explicitRankName);
    const derivedRankIndex = pickHighestRankIndex(
        safeData.rankIndex,
        safeData.maxRankIndex,
        profile.rankIndex,
        profile.maxRankIndex,
        safeDirectoryData.rankIndex,
        deriveRankIndex(safeData)
    );
    const rankIndex = Math.max(parsedRankIndex, derivedRankIndex);
    const resolvedGuilds = resolveGuildListFromUserData(safeData, safeDirectoryData);
    return {
        uid: normalizeUid(uid),
        username: pickNonEmpty(
            resolveProfileUsername(safeData, "player"),
            safeDirectoryData.username,
            "Unknown Player"
        ),
        accountId,
        rankIndex,
        rankName: parsedRankIndex >= rankIndex && explicitRankName
            ? explicitRankName
            : (RANK_NAMES[rankIndex] || RANK_NAMES[0]),
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
        ...(resolvedGuilds.length ? { guilds: resolvedGuilds } : {}),
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
    return mergeSnapshots(preferredSnapshot, resolvedSnapshot);
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

function generateGuestProfileViewerId() {
    try {
        if (window.crypto && typeof window.crypto.randomUUID === "function") {
            return window.crypto.randomUUID();
        }
    } catch (_) {
        // Ignore crypto access failures and fall back to a time-based identifier.
    }

    return `guest_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function getGuestProfileViewerId() {
    if (cachedGuestProfileViewerId) return cachedGuestProfileViewerId;
    const storedId = readString(PROFILE_VIEW_GUEST_ID_STORAGE_KEY, "").trim();
    if (storedId) {
        cachedGuestProfileViewerId = storedId;
        return storedId;
    }
    const generatedId = generateGuestProfileViewerId();
    cachedGuestProfileViewerId = generatedId;
    writeString(PROFILE_VIEW_GUEST_ID_STORAGE_KEY, generatedId);
    return generatedId;
}

function resolveProfileViewCooldownViewerKey(options = {}) {
    const explicitViewerKey = typeof options?.viewerKey === "string" ? options.viewerKey.trim() : "";
    if (explicitViewerKey) return explicitViewerKey;

    const currentViewerUid = normalizeUid(auth && auth.currentUser ? auth.currentUser.uid : "");
    if (currentViewerUid) return `auth:${currentViewerUid}`;

    const guestViewerId = getGuestProfileViewerId();
    return guestViewerId ? `guest:${guestViewerId}` : "guest:unknown";
}

function buildProfileViewCooldownKey(uid, viewerKey) {
    const normalizedUid = normalizeUid(uid);
    const normalizedViewerKey = typeof viewerKey === "string" ? viewerKey.trim() : "";
    if (!normalizedUid || !normalizedViewerKey) return "";
    return `${normalizedViewerKey}${PROFILE_VIEW_COOLDOWN_KEY_SEPARATOR}${normalizedUid}`;
}

function getProfileViewCooldownKeyCandidates(uid, viewerKey) {
    const normalizedUid = normalizeUid(uid);
    if (!normalizedUid) return [];

    const keys = [];
    const scopedKey = buildProfileViewCooldownKey(normalizedUid, viewerKey);
    if (scopedKey) keys.push(scopedKey);

    // Honor existing installs briefly while migrating away from profile-only cooldown keys.
    keys.push(normalizedUid);
    return keys;
}

function readProfileViewCooldownMap() {
    const raw = readJson(PROFILE_VIEW_COOLDOWNS_STORAGE_KEY, {});
    const safeMap = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    const now = Date.now();
    const nextMap = {};

    Object.entries(safeMap).forEach(([key, value]) => {
        const normalizedKey = normalizeUid(key);
        const expiresAt = Number(value);
        if (!normalizedKey || !Number.isFinite(expiresAt) || expiresAt <= now) return;
        nextMap[normalizedKey] = expiresAt;
    });

    const previousKeys = Object.keys(safeMap);
    const nextKeys = Object.keys(nextMap);
    const changed = previousKeys.length !== nextKeys.length
        || nextKeys.some((key) => safeMap[key] !== nextMap[key]);
    if (changed) {
        writeJson(PROFILE_VIEW_COOLDOWNS_STORAGE_KEY, nextMap);
    }

    return nextMap;
}

function getProfileViewCooldownExpiry(uid, viewerKey) {
    const cooldownMap = readProfileViewCooldownMap();
    return getProfileViewCooldownKeyCandidates(uid, viewerKey).reduce((latestExpiry, key) => {
        const expiresAt = Number(cooldownMap[key]);
        return Number.isFinite(expiresAt) ? Math.max(latestExpiry, expiresAt) : latestExpiry;
    }, 0);
}

function setProfileViewCooldown(uid, viewerKey, now = Date.now()) {
    const normalizedUid = normalizeUid(uid);
    if (!normalizedUid) return false;
    const cooldownMap = readProfileViewCooldownMap();
    const expiresAt = now + PROFILE_VIEW_COOLDOWN_MS;
    const scopedKey = buildProfileViewCooldownKey(normalizedUid, viewerKey);
    if (scopedKey) {
        cooldownMap[scopedKey] = expiresAt;
        delete cooldownMap[normalizedUid];
    } else {
        cooldownMap[normalizedUid] = expiresAt;
    }
    return writeJson(PROFILE_VIEW_COOLDOWNS_STORAGE_KEY, cooldownMap);
}

export async function incrementViewCount(uid, options = {}) {
    const normalizedUid = normalizeUid(uid);
    if (!normalizedUid) return false;
    const normalizedAccountId = typeof options?.accountId === "string" ? options.accountId.trim() : "";
    const normalizedVisibility = typeof options?.visibility === "string" ? options.visibility.trim() : "";
    const viewerCooldownKey = resolveProfileViewCooldownViewerKey(options);
    if (getProfileViewCooldownExpiry(normalizedUid, viewerCooldownKey) > Date.now()) {
        return false;
    }
    try {
        const userRef = doc(db, USERS_COLLECTION, normalizedUid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
            const createPayload = {
                profile: {
                    views: 1
                }
            };
            if (normalizedAccountId) {
                createPayload.accountId = normalizedAccountId;
            }
            if (normalizedVisibility) {
                createPayload.settings = {
                    visibility: normalizedVisibility
                };
            }
            await setDoc(userRef, createPayload, { merge: true });
            setProfileViewCooldown(normalizedUid, viewerCooldownKey);
            return 1;
        }
        const data = userSnap.data() || {};
        const profile = safeObject(data.profile);
        const currentViews = Number(profile.views) || 0;
        const nextViews = currentViews + 1;
        await setDoc(userRef, {
            profile: {
                views: nextViews
            }
        }, { merge: true });
        setProfileViewCooldown(normalizedUid, viewerCooldownKey);
        return nextViews;
    } catch (error) {
        if (!isPermissionLikeError(error)) {
            console.warn("Failed to increment benchmark views:", error);
        }
        return false;
    }
}

// ---------------------------------------------------------------------------------------------
// Friend graph
//
// The `friendRequests` and `friendships` collections are the ONLY source of truth. Nothing here
// writes to the other person's user document (the old design mirrored `friends`, `friendRequests`
// and `sentFriendRequests` arrays onto both users; the remote half of those writes was routinely
// refused and swallowed, which is how one side ended up friends while the other still showed a
// pending request). Every change is a single atomic batch, and both sides read the same documents
// through live listeners (subscribeFriendGraph), so an accept shows up for both people at once.
// ---------------------------------------------------------------------------------------------

function friendError(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
}

function buildFriendshipPayload(currentUid, otherUid, requestData, snapshotsByUid) {
    return {
        users: [currentUid, otherUid].sort(),
        createdAt: pickNonEmpty(safeObject(requestData).createdAt, Date.now()),
        updatedAt: Date.now(),
        snapshotByUid: snapshotsByUid
    };
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

// Live view of everything that involves this user: friendships, requests they received and
// requests they sent. `onChange` gets { friendships, incoming, sent } once all three have loaded
// and again on every change made by either side. Returns an unsubscribe function.
export function subscribeFriendGraph(uid, handlers = {}) {
    const normalizedUid = normalizeUid(uid);
    if (!normalizedUid) return () => {};
    const onChange = typeof handlers.onChange === "function" ? handlers.onChange : () => {};
    const onError = typeof handlers.onError === "function" ? handlers.onError : () => {};

    const graph = { friendships: [], incoming: [], sent: [] };
    const loaded = { friendships: false, incoming: false, sent: false };
    let active = true;

    const emit = () => {
        if (!active || !loaded.friendships || !loaded.incoming || !loaded.sent) return;
        onChange({
            friendships: graph.friendships.slice(),
            incoming: graph.incoming.slice(),
            sent: graph.sent.slice()
        });
    };

    const listen = (key, sourceQuery) => onSnapshot(
        sourceQuery,
        (snapshot) => {
            graph[key] = mapQueryDocs(snapshot);
            loaded[key] = true;
            emit();
        },
        (error) => {
            // One failing listener must not leave the whole friends UI stuck on "Loading".
            loaded[key] = true;
            console.warn(`Friend ${key} listener failed:`, error);
            onError(error, key);
            emit();
        }
    );

    const unsubscribers = [
        listen("friendships", query(collection(db, FRIENDSHIPS_COLLECTION), where("users", "array-contains", normalizedUid))),
        listen("incoming", query(collection(db, FRIEND_REQUESTS_COLLECTION), where("toUid", "==", normalizedUid))),
        listen("sent", query(collection(db, FRIEND_REQUESTS_COLLECTION), where("fromUid", "==", normalizedUid)))
    ];

    return () => {
        active = false;
        unsubscribers.forEach((unsubscribe) => {
            try { unsubscribe(); } catch (_) { /* already closed */ }
        });
    };
}

export async function sendFriendRequest(fromUid, toUid, options = {}) {
    const senderUid = normalizeUid(fromUid);
    const targetUid = normalizeUid(toUid);
    if (!senderUid || !targetUid) {
        throw new Error("sendFriendRequest requires both UIDs");
    }
    if (senderUid === targetUid) {
        throw friendError("friend/self", "Cannot send a friend request to yourself");
    }

    const [friendship, existingOutgoing, existingIncoming] = await Promise.all([
        getFriendshipDocument(senderUid, targetUid),
        getFriendRequestDocument(senderUid, targetUid),
        getFriendRequestDocument(targetUid, senderUid)
    ]);
    if (friendship) throw friendError("friend/already-friends", "Users are already friends");
    if (existingOutgoing) throw friendError("friend/already-sent", "Friend request already exists");
    if (existingIncoming) throw friendError("friend/incoming-exists", "Target user already sent a friend request");

    const requestId = buildFriendRequestId(senderUid, targetUid);
    const [senderSnapshot, targetSnapshot] = await Promise.all([
        resolveSnapshotForUid(senderUid, options.fromSnapshot || options.senderSnapshot || null),
        resolveSnapshotForUid(targetUid, options.toSnapshot || options.targetSnapshot || null)
    ]);

    const now = Date.now();
    try {
        await setDoc(doc(db, FRIEND_REQUESTS_COLLECTION, requestId), {
            fromUid: senderUid,
            toUid: targetUid,
            createdAt: now,
            updatedAt: now,
            fromSnapshot: senderSnapshot || null,
            toSnapshot: targetSnapshot || null
        });
    } catch (error) {
        if (isPermissionLikeError(error)) {
            throw friendError("friend/request-write-failed", "Friend request write failed");
        }
        throw error;
    }

    return {
        id: requestId,
        fromUid: senderUid,
        toUid: targetUid,
        fromSnapshot: senderSnapshot || null,
        toSnapshot: targetSnapshot || null
    };
}

// Deletes only the request documents that actually exist: deleting a missing document is refused
// by the rules (there is no data to authorize against), which would fail an entire batch.
async function deleteExistingRequests(batch, pairs) {
    let count = 0;
    for (const [fromUid, toUid] of pairs) {
        const requestSnap = await getFriendRequestDocument(fromUid, toUid);
        if (!requestSnap) continue;
        batch.delete(requestSnap.ref);
        count += 1;
    }
    return count;
}

export async function cancelFriendRequest(fromUid, toUid) {
    const senderUid = normalizeUid(fromUid);
    const targetUid = normalizeUid(toUid);
    if (!buildFriendRequestId(senderUid, targetUid)) return false;
    const batch = writeBatch(db);
    const removed = await deleteExistingRequests(batch, [[senderUid, targetUid]]);
    if (removed) await batch.commit();
    return true;
}

export async function declineFriendRequest(userUid, fromUid) {
    const currentUid = normalizeUid(userUid);
    const requesterUid = normalizeUid(fromUid);
    if (!buildFriendRequestId(requesterUid, currentUid)) return false;
    const batch = writeBatch(db);
    const removed = await deleteExistingRequests(batch, [[requesterUid, currentUid]]);
    if (removed) await batch.commit();
    return true;
}

export async function acceptFriendRequest(userUid, fromUid, options = {}) {
    const currentUid = normalizeUid(userUid);
    const requesterUid = normalizeUid(fromUid);
    if (!currentUid || !requesterUid || currentUid === requesterUid) {
        throw new Error("acceptFriendRequest requires two distinct UIDs");
    }

    const requestSnap = await getFriendRequestDocument(requesterUid, currentUid);
    if (!requestSnap) {
        // Already accepted (for example from another tab) counts as done rather than as an error.
        if (await areFriends(currentUid, requesterUid)) {
            return { friendshipId: buildFriendshipId(currentUid, requesterUid), users: [currentUid, requesterUid] };
        }
        throw friendError("friend/request-not-found", "Friend request not found");
    }

    const requestData = requestSnap.data() || {};
    const [requesterSnapshot, currentSnapshot] = await Promise.all([
        resolveSnapshotForUid(requesterUid, safeObject(requestData.fromSnapshot)),
        resolveSnapshotForUid(currentUid, mergeSnapshots(
            safeObject(requestData.toSnapshot),
            options.currentSnapshot || null
        ))
    ]);

    // One atomic commit: the friendship appears and the request(s) disappear together, for both
    // people, or nothing changes at all.
    const friendshipRef = doc(db, FRIENDSHIPS_COLLECTION, buildFriendshipId(currentUid, requesterUid));
    const batch = writeBatch(db);
    batch.set(friendshipRef, buildFriendshipPayload(currentUid, requesterUid, requestData, {
        [requesterUid]: requesterSnapshot || null,
        [currentUid]: currentSnapshot || null
    }));
    batch.delete(requestSnap.ref);
    // Both people may have sent a request to each other at the same moment.
    await deleteExistingRequests(batch, [[currentUid, requesterUid]]);

    try {
        await batch.commit();
    } catch (error) {
        if (isPermissionLikeError(error)) {
            throw friendError("friend/accept-write-failed", "Friend acceptance write failed");
        }
        throw error;
    }

    return {
        friendshipId: friendshipRef.id,
        users: [currentUid, requesterUid]
    };
}

export async function removeFriend(userUid, targetValue, options = {}) {
    const currentUid = await resolveUidCandidate(userUid, options.currentUserAliases || []);
    const targetUid = await resolveUidCandidate(targetValue, options.friendAliases || []);
    if (!currentUid || !targetUid || currentUid === targetUid) {
        throw new Error("removeFriend requires two distinct users");
    }

    const batch = writeBatch(db);
    for (const id of getFriendshipIdCandidates(currentUid, targetUid)) {
        const friendshipRef = doc(db, FRIENDSHIPS_COLLECTION, id);
        try {
            const friendshipSnap = await getDoc(friendshipRef);
            if (friendshipSnap.exists()) batch.delete(friendshipRef);
        } catch (error) {
            if (!isPermissionLikeError(error)) throw error;
        }
    }
    await deleteExistingRequests(batch, [[currentUid, targetUid], [targetUid, currentUid]]);
    // Friends from before the friendships collection also live in the `friends` list on the user's
    // own document, and the other person's copy of that list cannot be edited from here. Drop the
    // entry from our list and remember the removal, so neither the list fallback nor the legacy
    // restore brings this person back.
    batch.set(doc(db, USERS_COLLECTION, currentUid), {
        friends: arrayRemove(targetUid),
        removedFriends: arrayUnion(targetUid)
    }, { merge: true });
    await batch.commit();

    return {
        removed: true,
        userUid: currentUid,
        targetUid
    };
}

// Friendships made before the collections became the source of truth can exist only as `friends`
// arrays on both user documents (the friendship document write used to fail quietly). The rules
// accept a friendship document for a pair whose arrays list each other, so this rebuilds them.
// It runs once per account per device; a pair the rules refuse is simply skipped.
const LEGACY_FRIEND_HEAL_STORAGE_PREFIX = "benchmark_friend_heal_v2_";

export async function healLegacyFriendships(uid) {
    const currentUid = normalizeUid(uid);
    if (!currentUid) return 0;
    const storageKey = `${LEGACY_FRIEND_HEAL_STORAGE_PREFIX}${currentUid}`;
    if (readString(storageKey, "") === "done") return 0;

    let created = 0;
    let failed = 0;
    try {
        const [userData, friendships] = await Promise.all([
            getReadableUserData(currentUid),
            listFriendships(currentUid)
        ]);
        const removedUids = new Set(normalizeUidList(safeObject(userData).removedFriends));
        const legacyUids = normalizeUidList(safeObject(userData).friends)
            .filter((value) => value !== currentUid && !removedUids.has(value));
        const knownUids = new Set();
        friendships.forEach((friendship) => {
            normalizeUidList(safeObject(friendship).users).forEach((value) => {
                if (value !== currentUid) knownUids.add(value);
            });
        });

        for (const otherUid of legacyUids.filter((value) => !knownUids.has(value))) {
            try {
                const now = Date.now();
                await setDoc(doc(db, FRIENDSHIPS_COLLECTION, buildFriendshipId(currentUid, otherUid)), {
                    users: [currentUid, otherUid].sort(),
                    createdAt: now,
                    updatedAt: now,
                    snapshotByUid: {}
                });
                created += 1;
            } catch (error) {
                failed += 1;
                if (!isPermissionLikeError(error)) console.warn("Could not restore a legacy friendship:", error);
            }
        }
        if (!failed) writeString(storageKey, "done");
    } catch (error) {
        console.warn("Legacy friendship check failed:", error);
    }
    return created;
}
