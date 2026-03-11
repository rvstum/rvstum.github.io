import { auth } from "./client.js";
import { getRuntimeAccountId, state } from "./appState.js";
import { FINAL_RANK_INDEX, RANK_NAMES, RANK_TEXT_COLORS, STELLAR_TROPHY_FILTER } from "./constants.js";
import { t, tf } from "./i18n.js";
import { calculateRankFromData } from "./scoring.js";
import * as Slugs from "./slugs.js";
import * as FriendsService from "./friendsService.js";
import * as UserService from "./userService.js";
import { getFlagUrl, normalizeFriendRequestIds } from "./utils.js";
import { getCachedElementById } from "./utils/domUtils.js";

const FRIEND_RANK_TROPHY_URL = new URL("../icons/trophy.png", import.meta.url).toString();
const FRIEND_RANK_TROPHY_SIZE = 32;

const warmedFriendRankTrophyImage = (() => {
    if (typeof Image === "undefined") return null;
    const image = new Image();
    image.decoding = "async";
    image.loading = "eager";
    image.fetchPriority = "high";
    image.src = FRIEND_RANK_TROPHY_URL;
    if (typeof image.decode === "function") {
        image.decode().catch(() => {});
    }
    return image;
})();

const coreDeps = {
    showConfirmModal: null,
    updateNotificationVisibility: null,
    openFriendProfile: null,
    closeFriendsModal: null,
    markCurrentFriendRequestsViewed: null
};

function safeObject(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function isPermissionLikeError(error) {
    const code = typeof error?.code === "string" ? error.code : "";
    return code === "permission-denied" || code === "not-found";
}

function pickFirstString(...values) {
    for (const value of values) {
        if (typeof value !== "string") continue;
        const trimmed = value.trim();
        if (trimmed) return trimmed;
    }
    return "";
}

function pickFirstNumber(...values) {
    for (const value of values) {
        const numeric = Number(value);
        if (Number.isFinite(numeric)) return numeric;
    }
    return 0;
}

function normalizeRankIndex(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 0;
    return Math.max(0, Math.min(FINAL_RANK_INDEX, Math.floor(parsed)));
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

function deriveRankIndexFromUserData(userData = {}) {
    const safeData = safeObject(userData);
    let best = normalizeRankIndex(calculateRankFromData(safeData));

    [
        safeData.rankIndex,
        safeData.maxRankIndex,
        safeObject(safeData.profile).rankIndex,
        safeObject(safeData.profile).maxRankIndex,
        safeObject(safeData.settings).rankThemeUnlock
    ].forEach((value) => {
        const candidate = normalizeRankIndex(value);
        if (candidate > best) best = candidate;
    });

    [
        safeData.currentRank,
        safeObject(safeData.profile).currentRank
    ].forEach((value) => {
        const candidate = parseRankIndexFromName(value);
        if (candidate > best) best = candidate;
    });

    return best;
}

function normalizeTimestamp(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
}

function buildUnknownSnapshot(uid = "") {
    return {
        uid: normalizeUid(uid),
        username: t("unknown_player"),
        accountId: "",
        rankIndex: 0,
        rankName: RANK_NAMES[0] || "Unranked",
        flag: "",
        pic: "",
        publicSlug: ""
    };
}

function extractSnapshotMap(data) {
    const safeData = safeObject(data);
    return safeObject(safeData.snapshotByUid);
}

function getFallbackSnapshot(data, uid, primaryKey) {
    const safeData = safeObject(data);
    const snapshotMap = extractSnapshotMap(safeData);
    const targetUid = normalizeUid(uid);
    const snapshots = [
        snapshotMap[targetUid],
        safeObject(safeData[primaryKey]),
        safeObject(safeData.profileSnapshot)
    ];
    if (targetUid && normalizeUid(safeData.fromUid) === targetUid) {
        snapshots.push(safeObject(safeData.fromSnapshot));
    }
    if (targetUid && normalizeUid(safeData.toUid) === targetUid) {
        snapshots.push(safeObject(safeData.toSnapshot));
    }
    return mergeProfileSnapshots(...snapshots);
}

function resolveEntryName(entry) {
    return pickFirstString(
        entry && entry.snapshot && entry.snapshot.username,
        entry && entry.data && entry.data.username,
        t("unknown_player")
    );
}

function resolveEntryRankIndex(entry) {
    const snapshot = safeObject(entry && entry.snapshot);
    const data = safeObject(entry && entry.data);
    const profile = safeObject(data.profile);
    let best = normalizeRankIndex(
        pickFirstNumber(
            snapshot.rankIndex,
            data.rankIndex,
            data.maxRankIndex,
            profile.rankIndex,
            profile.maxRankIndex,
            deriveRankIndexFromUserData(data)
        )
    );

    [
        snapshot.rankName,
        data.currentRank,
        profile.currentRank
    ].forEach((value) => {
        const candidate = parseRankIndexFromName(value);
        if (candidate > best) best = candidate;
    });

    return best;
}

function resolveEntryRankText(entry) {
    const snapshot = safeObject(entry && entry.snapshot);
    const data = safeObject(entry && entry.data);
    const profile = safeObject(data.profile);
    const rankIndex = resolveEntryRankIndex(entry);
    const rankedNames = [
        pickFirstString(snapshot.rankName),
        pickFirstString(data.currentRank, profile.currentRank)
    ].filter((value) => parseRankIndexFromName(value) === rankIndex && rankIndex > 0);
    if (rankedNames.length) return rankedNames[0];
    const explicitRank = pickFirstString(snapshot.rankName, data.currentRank, profile.currentRank);
    if (explicitRank && rankIndex === 0) return explicitRank;
    return RANK_NAMES[rankIndex] || RANK_NAMES[0] || "Unranked";
}

function getRankTrophyFilter(rankIndex) {
    switch (normalizeRankIndex(rankIndex)) {
        case 1: return "grayscale(100%)";
        case 2: return "sepia(1) hue-rotate(-35deg) saturate(3) brightness(0.65)";
        case 3: return "grayscale(100%) brightness(1.3)";
        case 4: return "sepia(1) hue-rotate(5deg) saturate(2.5) brightness(0.9)";
        case 5: return "sepia(1) hue-rotate(130deg) saturate(1.5) brightness(1.1)";
        case 6: return "sepia(1) hue-rotate(170deg) saturate(3) brightness(1.0)";
        case 7: return "sepia(1) hue-rotate(220deg) saturate(3) brightness(0.9)";
        case 8: return "sepia(1) hue-rotate(10deg) saturate(5) brightness(1.2)";
        case 9: return "sepia(1) hue-rotate(330deg) saturate(5) brightness(0.8)";
        case 10: return "sepia(1) hue-rotate(120deg) saturate(2) brightness(0.9)";
        case 11: return STELLAR_TROPHY_FILTER;
        case 12: return "sepia(1) hue-rotate(290deg) saturate(3) brightness(0.9)";
        case 13: return "sepia(1) hue-rotate(2deg) saturate(0.74) brightness(1.16)";
        default: return "";
    }
}

function applyRankTextStyle(textEl, rankIndex) {
    if (!textEl) return;
    const safeRankIndex = normalizeRankIndex(rankIndex);
    textEl.style.color = "";
    textEl.style.background = "";
    textEl.style.backgroundSize = "";
    textEl.style.webkitBackgroundClip = "";
    textEl.style.backgroundClip = "";
    textEl.style.animation = "";

    if (safeRankIndex <= 0) return;
    if (safeRankIndex === 11) {
        textEl.style.background = "linear-gradient(110deg, #FF6F00 20%, #FF8F00 40%, #FFA000 48%, #FFB300 50%, #FFA000 52%, #FF8F00 60%, #FF6F00 80%)";
        textEl.style.backgroundSize = "200% auto";
        textEl.style.webkitBackgroundClip = "text";
        textEl.style.backgroundClip = "text";
        textEl.style.color = "transparent";
        textEl.style.animation = "eternalShimmer 2.5s linear infinite";
        return;
    }
    if (safeRankIndex === 12) {
        textEl.style.background = "linear-gradient(110deg, #D8007F 20%, #E91E63 35%, #F06292 45%, #FF80AB 50%, #F06292 55%, #E91E63 65%, #D8007F 80%)";
        textEl.style.backgroundSize = "200% auto";
        textEl.style.webkitBackgroundClip = "text";
        textEl.style.backgroundClip = "text";
        textEl.style.color = "transparent";
        textEl.style.animation = "eternalShimmer 2.5s linear infinite";
        return;
    }
    if (safeRankIndex === 13) {
        textEl.style.background = "linear-gradient(110deg, #cab98a 20%, #e5d9b6 35%, #f2e9cf 48%, #fff7e5 50%, #f2e9cf 52%, #e5d9b6 65%, #cab98a 80%)";
        textEl.style.backgroundSize = "200% auto";
        textEl.style.webkitBackgroundClip = "text";
        textEl.style.backgroundClip = "text";
        textEl.style.color = "transparent";
        textEl.style.animation = "eternalShimmer 2.5s linear infinite";
        return;
    }
    textEl.style.color = RANK_TEXT_COLORS[safeRankIndex] || "";
}

function sortEntriesByName(entries) {
    return [...entries].sort((left, right) => resolveEntryName(left).localeCompare(resolveEntryName(right), undefined, { sensitivity: "base" }));
}

function dispatchFriendStateEvent(uids) {
    document.dispatchEvent(new CustomEvent("benchmark:friends-request-state", {
        detail: {
            requestUids: [...uids]
        }
    }));
}

function defaultOpenFriendProfile(entry) {
    if (!entry) return;
    const uid = normalizeUid(entry.uid);
    const snapshot = safeObject(entry.snapshot);
    if (!uid && !snapshot.publicSlug) return;

    if (Slugs.isLocalDevRoutingEnv()) {
        const targetUrl = new URL(Slugs.getBenchmarkAppEntryUrl(), window.location.origin);
        if (uid) targetUrl.searchParams.set("id", uid);
        window.location.href = `${targetUrl.pathname}${targetUrl.search}`;
        return;
    }

    const publicSlug = pickFirstString(snapshot.publicSlug, entry.publicSlug);
    if (!publicSlug) return;
    window.location.href = Slugs.buildViewModePathFromSlug(publicSlug);
}

export function configure(deps = {}) {
    if (!deps || typeof deps !== "object") return;
    Object.keys(coreDeps).forEach((key) => {
        if (!Object.prototype.hasOwnProperty.call(deps, key)) return;
        coreDeps[key] = typeof deps[key] === "function" ? deps[key] : null;
    });
}

export function normalizeUid(value) {
    return typeof value === "string" ? value.trim() : "";
}

export function normalizeUidList(values) {
    return [...new Set(normalizeFriendRequestIds(values))];
}

export function mergeProfileSnapshots(...snapshots) {
    const merged = {};
    snapshots.forEach((snapshot) => {
        const safeSnapshot = safeObject(snapshot);
        Object.keys(safeSnapshot).forEach((key) => {
            const value = safeSnapshot[key];
            if (typeof value === "string") {
                const trimmed = value.trim();
                if (trimmed) merged[key] = trimmed;
                return;
            }
            if (typeof value === "number" && Number.isFinite(value)) {
                merged[key] = value;
            }
        });
    });
    return merged;
}

export function buildSnapshotFromUserData(userData = {}, fallback = {}, directoryData = null) {
    const safeData = safeObject(userData);
    const profile = safeObject(safeData.profile);
    const safeFallback = safeObject(fallback);
    const safeDirectoryData = safeObject(directoryData);
    const rankName = pickFirstString(
        safeData.currentRank,
        profile.currentRank,
        safeFallback.rankName
    );
    const parsedRankIndex = parseRankIndexFromName(rankName);
    const explicitRankIndex = normalizeRankIndex(
        pickFirstNumber(
            safeData.rankIndex,
            safeData.maxRankIndex,
            profile.rankIndex,
            profile.maxRankIndex,
            safeDirectoryData.rankIndex,
            safeFallback.rankIndex,
            deriveRankIndexFromUserData(safeData)
        )
    );
    const rankIndex = parsedRankIndex > explicitRankIndex ? parsedRankIndex : explicitRankIndex;
    const resolvedRankName = parsedRankIndex >= rankIndex
        ? rankName
        : (RANK_NAMES[rankIndex] || RANK_NAMES[0] || "Unranked");
    return {
        uid: normalizeUid(pickFirstString(safeFallback.uid, safeData.uid)),
        username: pickFirstString(
            safeData.username,
            profile.username,
            safeDirectoryData.username,
            safeFallback.username,
            t("unknown_player")
        ),
        accountId: pickFirstString(
            safeData.accountId,
            profile.accountId,
            safeDirectoryData.accountId,
            safeFallback.accountId
        ),
        rankIndex,
        rankName: resolvedRankName,
        flag: pickFirstString(profile.flag, safeData.flag, safeDirectoryData.flag, safeFallback.flag),
        pic: pickFirstString(profile.pic, safeData.pic, safeDirectoryData.pic, safeFallback.pic),
        publicSlug: pickFirstString(
            safeData.publicSlug,
            safeDirectoryData.publicSlug,
            safeFallback.publicSlug,
            Slugs.resolveProfileSlug(safeData, {
                usernameFallback: pickFirstString(safeData.username, profile.username, "player"),
                accountIdFallback: pickFirstString(safeData.accountId, profile.accountId, safeDirectoryData.accountId, safeFallback.accountId),
                uid: pickFirstString(safeFallback.uid, safeData.uid)
            })
        )
    };
}

export async function safeResolveReadableUserDoc(uid) {
    const normalizedUid = normalizeUid(uid);
    if (!normalizedUid) return null;
    try {
        const userDoc = await UserService.getUserDocument(normalizedUid);
        return userDoc && userDoc.exists() ? userDoc : null;
    } catch (error) {
        const code = typeof error?.code === "string" ? error.code : "";
        if (code !== "permission-denied" && code !== "not-found") throw error;
        return null;
    }
}

async function readReadableUserDataByUid(uid) {
    const userDoc = await safeResolveReadableUserDoc(uid);
    return userDoc ? (userDoc.data() || {}) : null;
}

async function safeLoadFriendEdges(loader, label) {
    try {
        return await loader();
    } catch (error) {
        if (!isPermissionLikeError(error)) throw error;
        console.warn(`[friends] ${label} unavailable; falling back to mirrored user data.`, error);
        return [];
    }
}

export async function resolveTargetUidFromIdentifier(identifier, currentUserData = null) {
    const rawIdentifier = typeof identifier === "string" ? identifier.trim() : "";
    if (!rawIdentifier) return "";

    const currentUser = auth.currentUser;
    const currentUid = normalizeUid(currentUser && currentUser.uid);
    const currentAccountId = pickFirstString(
        getRuntimeAccountId(),
        safeObject(currentUserData).accountId,
        safeObject(safeObject(currentUserData).profile).accountId
    );
    if (rawIdentifier === currentUid || (currentAccountId && rawIdentifier.toUpperCase() === currentAccountId.toUpperCase())) {
        return currentUid;
    }

    const directUserDoc = await safeResolveReadableUserDoc(rawIdentifier);
    if (directUserDoc) return directUserDoc.id;

    try {
        const resolvedUid = await UserService.resolveUidByAccountId(rawIdentifier);
        if (resolvedUid) return normalizeUid(resolvedUid);
    } catch (error) {
        const code = typeof error?.code === "string" ? error.code : "";
        if (code !== "permission-denied" && code !== "not-found") throw error;
    }

    try {
        const identifierDoc = await UserService.resolveUserDocByIdentifier(rawIdentifier);
        if (identifierDoc && identifierDoc.exists()) return identifierDoc.id;
    } catch (error) {
        const code = typeof error?.code === "string" ? error.code : "";
        if (code !== "permission-denied" && code !== "not-found") throw error;
    }

    return "";
}

export async function hydrateUserRecord(uid, fallbackSnapshot = null) {
    const normalizedUid = normalizeUid(uid);
    if (!normalizedUid) return null;

    let directoryData = null;
    const [userDoc] = await Promise.all([
        safeResolveReadableUserDoc(normalizedUid),
        (async () => {
            try {
                directoryData = await UserService.resolveAccountDirectoryEntryByUid(normalizedUid);
            } catch (error) {
                const code = typeof error?.code === "string" ? error.code : "";
                if (code !== "permission-denied" && code !== "not-found") throw error;
            }
        })()
    ]);

    if (userDoc) {
        const data = userDoc.data() || {};
        const snapshot = mergeProfileSnapshots(
            buildUnknownSnapshot(normalizedUid),
            fallbackSnapshot,
            buildSnapshotFromUserData(data, { uid: normalizedUid }, directoryData)
        );
        return {
            uid: normalizedUid,
            data,
            snapshot
        };
    }

    const snapshot = mergeProfileSnapshots(
        buildUnknownSnapshot(normalizedUid),
        fallbackSnapshot,
        buildSnapshotFromUserData({}, { uid: normalizedUid }, directoryData)
    );

    return {
        uid: normalizedUid,
        data: null,
        snapshot
    };
}

export async function loadHydratedFriendEntries(currentUid) {
    const normalizedUid = normalizeUid(currentUid);
    if (!normalizedUid) return [];
    const [friendships, currentUserData] = await Promise.all([
        safeLoadFriendEdges(() => FriendsService.listFriendships(normalizedUid), "friendships query"),
        readReadableUserDataByUid(normalizedUid)
    ]);

    const friendshipByUid = new Map();
    friendships.forEach((friendship) => {
        const users = normalizeUidList(safeObject(friendship).users);
        const friendUid = users.find((value) => value !== normalizedUid) || "";
        if (!friendUid || friendshipByUid.has(friendUid)) return;
        friendshipByUid.set(friendUid, friendship);
    });

    const mirroredFriendUids = normalizeUidList(safeObject(currentUserData).friends)
        .filter((value) => value !== normalizedUid);
    const targetUids = normalizeUidList([
        ...mirroredFriendUids,
        ...Array.from(friendshipByUid.keys())
    ]);

    const hydrated = await Promise.all(targetUids.map(async (friendUid) => {
        const friendship = friendshipByUid.get(friendUid) || null;
        const fallbackSnapshot = getFallbackSnapshot(friendship, friendUid, "friendSnapshot");
        const record = await hydrateUserRecord(friendUid, fallbackSnapshot);
        if (!record) return null;
        return {
            kind: "friendship",
            id: pickFirstString(safeObject(friendship).id, `mirror_friendship__${normalizedUid}__${friendUid}`),
            uid: friendUid,
            snapshot: mergeProfileSnapshots(fallbackSnapshot, record.snapshot),
            data: record.data,
            createdAt: normalizeTimestamp(safeObject(friendship).createdAt),
            updatedAt: normalizeTimestamp(safeObject(friendship).updatedAt),
            raw: friendship
        };
    }));
    return sortEntriesByName(hydrated.filter(Boolean));
}

export async function loadHydratedIncomingRequests(currentUid) {
    const normalizedUid = normalizeUid(currentUid);
    if (!normalizedUid) return [];
    const [requests, currentUserData] = await Promise.all([
        safeLoadFriendEdges(() => FriendsService.listIncomingFriendRequests(normalizedUid), "incoming friend requests query"),
        readReadableUserDataByUid(normalizedUid)
    ]);

    const requestByUid = new Map();
    requests.forEach((request) => {
        const requesterUid = normalizeUid(request.fromUid);
        if (!requesterUid || requestByUid.has(requesterUid)) return;
        requestByUid.set(requesterUid, request);
    });

    const mirroredRequestUids = normalizeUidList(safeObject(currentUserData).friendRequests)
        .filter((value) => value !== normalizedUid);
    const targetUids = normalizeUidList([
        ...mirroredRequestUids,
        ...Array.from(requestByUid.keys())
    ]);

    const hydrated = await Promise.all(targetUids.map(async (requesterUid) => {
        const request = requestByUid.get(requesterUid) || null;
        const fallbackSnapshot = getFallbackSnapshot(request, requesterUid, "fromSnapshot");
        const record = await hydrateUserRecord(requesterUid, fallbackSnapshot);
        if (!record) return null;
        return {
            kind: "incoming-request",
            id: pickFirstString(safeObject(request).id, `mirror_request__${requesterUid}__${normalizedUid}`),
            uid: requesterUid,
            snapshot: mergeProfileSnapshots(fallbackSnapshot, record.snapshot),
            data: record.data,
            createdAt: normalizeTimestamp(safeObject(request).createdAt),
            updatedAt: normalizeTimestamp(safeObject(request).updatedAt),
            raw: request
        };
    }));
    return sortEntriesByName(hydrated.filter(Boolean));
}

export async function loadHydratedSentRequests(currentUid) {
    const normalizedUid = normalizeUid(currentUid);
    if (!normalizedUid) return [];
    const [requests, currentUserData] = await Promise.all([
        safeLoadFriendEdges(() => FriendsService.listSentFriendRequests(normalizedUid), "sent friend requests query"),
        readReadableUserDataByUid(normalizedUid)
    ]);

    const requestByUid = new Map();
    requests.forEach((request) => {
        const targetUid = normalizeUid(request.toUid);
        if (!targetUid || requestByUid.has(targetUid)) return;
        requestByUid.set(targetUid, request);
    });

    const mirroredRequestUids = normalizeUidList(safeObject(currentUserData).sentFriendRequests)
        .filter((value) => value !== normalizedUid);
    const targetUids = normalizeUidList([
        ...mirroredRequestUids,
        ...Array.from(requestByUid.keys())
    ]);

    const hydrated = await Promise.all(targetUids.map(async (targetUid) => {
        const request = requestByUid.get(targetUid) || null;
        const fallbackSnapshot = getFallbackSnapshot(request, targetUid, "toSnapshot");
        const record = await hydrateUserRecord(targetUid, fallbackSnapshot);
        if (!record) return null;
        return {
            kind: "sent-request",
            id: pickFirstString(safeObject(request).id, `mirror_request__${normalizedUid}__${targetUid}`),
            uid: targetUid,
            snapshot: mergeProfileSnapshots(fallbackSnapshot, record.snapshot),
            data: record.data,
            createdAt: normalizeTimestamp(safeObject(request).createdAt),
            updatedAt: normalizeTimestamp(safeObject(request).updatedAt),
            raw: request
        };
    }));
    return sortEntriesByName(hydrated.filter(Boolean));
}

export function buildActionItem(options = {}) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `friend-request-btn ${pickFirstString(options.className)}`.trim();
    button.textContent = pickFirstString(options.label);
    if (pickFirstString(options.title)) button.title = pickFirstString(options.title);
    if (typeof options.onClick === "function") {
        button.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            options.onClick(event);
        });
    }
    return button;
}

export function getFriendListInteractionState() {
    return {
        canOpenProfile: typeof coreDeps.openFriendProfile === "function" || !!auth.currentUser,
        requestsTabActive: getCurrentRequestsTabActive()
    };
}

export function renderState(container, message, options = {}) {
    if (!container) return null;
    container.innerHTML = "";
    const list = document.createElement("div");
    list.className = "friend-list-container friend-list-container--state";
    const stateEl = document.createElement("div");
    stateEl.className = "friend-state-message";
    if (options.pending) stateEl.classList.add("friend-state-message--pending");
    stateEl.textContent = pickFirstString(message);
    list.appendChild(stateEl);
    container.appendChild(list);
    return list;
}

export function setLoading(container, message = "Loading...") {
    return renderState(container, message, { pending: true });
}

export function renderFriendViewEntries(container, entries, options = {}) {
    if (!container) return;
    container.innerHTML = "";
    const list = document.createElement("div");
    list.className = "friend-list-container";

    const safeEntries = Array.isArray(entries) ? entries : [];
    safeEntries.forEach((entry) => {
        const interactive = options.allowOpen !== false;
        const card = document.createElement(interactive ? "button" : "div");
        card.className = "friend-item";
        if (interactive) {
            card.type = "button";
            card.classList.add("friend-item--view");
        }
        if (options.pending) card.classList.add("friend-item--pending");

        const mainRow = document.createElement("div");
        mainRow.className = "friend-main";

        const snapshot = mergeProfileSnapshots(buildUnknownSnapshot(entry.uid), safeObject(entry.snapshot));
        const profilePic = document.createElement("div");
        profilePic.className = "friend-profile-pic";
        const flagUrl = snapshot.flag ? getFlagUrl(snapshot.flag) : "";
        const profilePicUrl = pickFirstString(snapshot.pic);
        const imageUrl = pickFirstString(profilePicUrl, flagUrl);
        if (imageUrl) profilePic.style.backgroundImage = `url(${imageUrl})`;
        mainRow.appendChild(profilePic);

        const info = document.createElement("div");
        info.className = "friend-info";

        const nameRow = document.createElement("div");
        nameRow.className = "friend-name-row";

        const nameEl = document.createElement("div");
        nameEl.className = "friend-name";
        nameEl.textContent = pickFirstString(snapshot.username, t("unknown_player"));
        nameRow.appendChild(nameEl);

        if (flagUrl) {
            const inlineFlag = document.createElement("span");
            inlineFlag.className = "friend-inline-flag";
            inlineFlag.style.backgroundImage = `url(${flagUrl})`;
            inlineFlag.setAttribute("aria-hidden", "true");
            nameRow.appendChild(inlineFlag);
        }
        info.appendChild(nameRow);

        const rankIndex = resolveEntryRankIndex(entry);
        const showRankTrophy = options.showRankTrophy !== false && rankIndex > 0;
        const statusEl = document.createElement("div");
        statusEl.className = "friend-status";
        const statusTextEl = document.createElement("span");
        statusTextEl.className = "friend-status-text";
        statusTextEl.textContent = resolveEntryRankText(entry);
        applyRankTextStyle(statusTextEl, rankIndex);
        statusEl.appendChild(statusTextEl);
        info.appendChild(statusEl);

        mainRow.appendChild(info);

        if (showRankTrophy) {
            const trophyEl = document.createElement("img");
            trophyEl.className = "friend-rank-icon";
            trophyEl.loading = "eager";
            trophyEl.decoding = "sync";
            trophyEl.fetchPriority = "high";
            trophyEl.width = FRIEND_RANK_TROPHY_SIZE;
            trophyEl.height = FRIEND_RANK_TROPHY_SIZE;
            trophyEl.src = FRIEND_RANK_TROPHY_URL;
            trophyEl.alt = "";
            trophyEl.setAttribute("aria-hidden", "true");
            const filter = getRankTrophyFilter(rankIndex);
            if (filter) trophyEl.style.filter = filter;
            trophyEl.classList.add("friend-rank-icon--edge");
            mainRow.appendChild(trophyEl);
        }
        card.appendChild(mainRow);

        const actionItems = typeof options.buildActions === "function" ? options.buildActions(entry) : [];
        const safeActions = Array.isArray(actionItems) ? actionItems.filter(Boolean) : [];
        if (safeActions.length) {
            const actionRow = document.createElement("div");
            actionRow.className = "friend-actions";
            safeActions.forEach((actionEl) => actionRow.appendChild(actionEl));
            if (options.inlineActions) {
                mainRow.appendChild(actionRow);
            } else {
                card.classList.add("friend-item--has-actions");
                card.appendChild(actionRow);
            }
        }

        if (interactive) {
            card.addEventListener("click", () => {
                if (typeof options.onSelect === "function") {
                    options.onSelect(entry);
                    return;
                }
                const openProfile = coreDeps.openFriendProfile || defaultOpenFriendProfile;
                openProfile(entry);
            });
        }

        list.appendChild(card);
    });

    container.appendChild(list);
}

export function showRemoveFriendConfirmModal(entry, onConfirm) {
    const name = resolveEntryName(entry);
    const title = t("remove_friend_title");
    const message = tf("remove_friend_confirm", { name });
    if (typeof coreDeps.showConfirmModal === "function") {
        coreDeps.showConfirmModal(title, message, onConfirm);
        return;
    }
    if (window.confirm(`${title}\n\n${message}`) && typeof onConfirm === "function") {
        onConfirm();
    }
}

export async function readCurrentUserData() {
    const currentUser = auth.currentUser;
    if (!currentUser) return null;
    const userDoc = await safeResolveReadableUserDoc(currentUser.uid);
    return userDoc ? (userDoc.data() || {}) : null;
}

export function getCurrentUserAccountId(userData = null) {
    return pickFirstString(
        getRuntimeAccountId(),
        safeObject(userData).accountId,
        safeObject(safeObject(userData).profile).accountId
    );
}

export function getCurrentRequestsTabActive() {
    const tab = getCachedElementById("tabFriendRequests");
    return !!(tab && tab.classList.contains("active"));
}

export function publishIncomingRequestState(entriesOrUids) {
    const requestUids = normalizeUidList(
        (Array.isArray(entriesOrUids) ? entriesOrUids : []).map((item) => {
            if (typeof item === "string") return item;
            return normalizeUid(safeObject(item).uid);
        })
    );
    state.currentFriendRequests = requestUids;
    if (getCurrentRequestsTabActive()) {
        if (typeof coreDeps.markCurrentFriendRequestsViewed === "function") {
            coreDeps.markCurrentFriendRequestsViewed();
        }
        state.hasPendingRequests = false;
    } else {
        state.hasPendingRequests = requestUids.length > 0;
    }
    if (typeof coreDeps.updateNotificationVisibility === "function") {
        coreDeps.updateNotificationVisibility();
    }
    dispatchFriendStateEvent(requestUids);
    return requestUids;
}
