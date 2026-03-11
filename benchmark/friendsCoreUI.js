import {
    collection,
    getDocs,
    query,
    where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db } from "./client.js";
import { normalizeFriendRequestIds, getFlagUrl } from "./utils.js";
import { getCachedElementById } from "./utils/domUtils.js";
import { FINAL_RANK_INDEX, RANK_NAMES, RANK_TEXT_COLORS, STELLAR_TROPHY_FILTER } from "./constants.js";
import * as UserService from "./userService.js?v=20260310-public-slug-directory-1";
import * as FriendsService from "./friendsService.js?v=20260311-friends-rewrite-1";
import * as Slugs from "./slugs.js?v=20260310-public-slug-directory-1";

const FRIEND_TAP_MOVE_PX = 12;
const FRIEND_CLICK_SUPPRESS_MS = 400;
const FRIEND_TROPHY_ICON_SRC = resolveFriendAssetUrl("../icons/trophy.png");

const friendsUIDeps = {
    calculateRankFromData: null,
    enterViewMode: null,
    closeFriendsModalUI: null,
    showConfirmModal: null,
    updateNotificationVisibility: null,
    onFriendRequestsLoaded: null
};

const friendListInteractionStates = new WeakMap();
let activeRemoveFriendModalCleanup = null;

primeFriendTrophyIcon();

export function configure(deps = {}) {
    if (!deps || typeof deps !== "object") return;
    Object.keys(friendsUIDeps).forEach((key) => {
        if (!Object.prototype.hasOwnProperty.call(deps, key)) return;
        friendsUIDeps[key] = typeof deps[key] === "function" ? deps[key] : null;
    });
}

export function normalizeUid(value) {
    return typeof value === "string" ? value.trim() : "";
}

export function normalizeUidList(values) {
    if (!Array.isArray(values)) return [];
    return [...new Set(values.map((value) => normalizeUid(value)).filter(Boolean))];
}

function isPermissionLikeError(err) {
    if (!err || typeof err !== "object") return false;
    const code = typeof err.code === "string" ? err.code : "";
    return code === "permission-denied" || code === "not-found";
}

function resolveFriendAssetUrl(assetPath) {
    const raw = typeof assetPath === "string" ? assetPath.trim() : "";
    if (!raw || typeof window === "undefined") return raw;
    try {
        return new URL(raw, new URL(Slugs.getBenchmarkAppEntryUrl(), window.location.origin)).toString();
    } catch (err) {
        return raw;
    }
}

function primeFriendTrophyIcon() {
    if (typeof Image === "undefined") return null;
    const preloadImage = new Image();
    preloadImage.decoding = "sync";
    if ("fetchPriority" in preloadImage) {
        preloadImage.fetchPriority = "high";
    }
    preloadImage.src = FRIEND_TROPHY_ICON_SRC;
    if (typeof preloadImage.decode === "function") {
        preloadImage.decode().catch(() => {});
    }
    return preloadImage;
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

function getRankIndex(data = {}) {
    const safeData = data && typeof data === "object" ? data : {};
    const settings = safeData.settings && typeof safeData.settings === "object" ? safeData.settings : {};
    const profile = safeData.profile && typeof safeData.profile === "object" ? safeData.profile : {};
    let best = typeof friendsUIDeps.calculateRankFromData === "function"
        ? clampRankIndex(friendsUIDeps.calculateRankFromData(safeData))
        : 0;

    [
        safeData.maxRankIndex,
        safeData.rankIndex,
        settings.rankThemeUnlock,
        profile.maxRankIndex,
        profile.rankIndex
    ].forEach((value) => {
        best = Math.max(best, clampRankIndex(value));
    });

    best = Math.max(best, parseRankIndexFromTheme(settings.theme));
    best = Math.max(best, parseRankIndexFromName(safeData.currentRank));
    best = Math.max(best, parseRankIndexFromName(profile.currentRank));
    return best;
}

function getRankFilter(rankIndex) {
    if (rankIndex === 2) return "sepia(1) hue-rotate(-35deg) saturate(3) brightness(0.65)";
    if (rankIndex === 3) return "grayscale(100%) brightness(1.3)";
    if (rankIndex === 4) return "sepia(1) hue-rotate(5deg) saturate(2.5) brightness(0.9)";
    if (rankIndex === 5) return "sepia(1) hue-rotate(130deg) saturate(1.5) brightness(1.1)";
    if (rankIndex === 6) return "sepia(1) hue-rotate(170deg) saturate(3) brightness(1.0)";
    if (rankIndex === 7) return "sepia(1) hue-rotate(220deg) saturate(3) brightness(0.9)";
    if (rankIndex === 8) return "sepia(1) hue-rotate(10deg) saturate(5) brightness(1.2)";
    if (rankIndex === 9) return "sepia(1) hue-rotate(330deg) saturate(5) brightness(0.8)";
    if (rankIndex === 10) return "sepia(1) hue-rotate(120deg) saturate(2) brightness(0.9)";
    if (rankIndex === 11) return STELLAR_TROPHY_FILTER;
    if (rankIndex === 12) return "sepia(1) hue-rotate(290deg) saturate(3) brightness(0.9)";
    if (rankIndex >= 13) return "sepia(1) hue-rotate(2deg) saturate(0.74) brightness(1.16)";
    return "grayscale(100%)";
}

function getRankTextStyle(rankIndex) {
    if (rankIndex === 11) {
        return "background: linear-gradient(110deg, #FF6F00 20%, #FF8F00 40%, #FFA000 48%, #FFB300 50%, #FFA000 52%, #FF8F00 60%, #FF6F00 80%); background-size: 200% auto; -webkit-background-clip: text; background-clip: text; color: transparent; animation: eternalShimmer 2.5s linear infinite; font-weight: bold;";
    }
    if (rankIndex === 12) {
        return "background: linear-gradient(110deg, #D8007F 20%, #E91E63 35%, #F06292 45%, #FF80AB 50%, #F06292 55%, #E91E63 65%, #D8007F 80%); background-size: 200% auto; -webkit-background-clip: text; background-clip: text; color: transparent; animation: eternalShimmer 2.5s linear infinite; font-weight: bold;";
    }
    if (rankIndex >= 13) {
        return "background: linear-gradient(110deg, #cab98a 20%, #e5d9b6 35%, #f2e9cf 48%, #fff7e5 50%, #f2e9cf 52%, #e5d9b6 65%, #cab98a 80%); background-size: 200% auto; -webkit-background-clip: text; background-clip: text; color: transparent; animation: eternalShimmer 2.5s linear infinite; font-weight: bold;";
    }
    return `color: ${RANK_TEXT_COLORS[rankIndex] || "#888"};`;
}

function normalizeProfileSnapshot(rawProfile = {}, fallbackIdentifier = "") {
    const safeProfile = rawProfile && typeof rawProfile === "object" ? rawProfile : {};
    return {
        username: typeof safeProfile.username === "string" ? safeProfile.username.trim() : "",
        accountId: typeof safeProfile.accountId === "string" && safeProfile.accountId.trim() !== ""
            ? safeProfile.accountId.trim()
            : normalizeUid(fallbackIdentifier),
        rankIndex: clampRankIndex(safeProfile.rankIndex),
        flag: typeof safeProfile.flag === "string" ? safeProfile.flag.trim() : "",
        pic: typeof safeProfile.pic === "string" ? safeProfile.pic.trim() : ""
    };
}

export function mergeProfileSnapshots(...snapshots) {
    const merged = normalizeProfileSnapshot({});
    snapshots.forEach((snapshot) => {
        if (!snapshot || typeof snapshot !== "object") return;
        const normalized = normalizeProfileSnapshot(snapshot, merged.accountId);
        if (!merged.username && normalized.username) merged.username = normalized.username;
        if (!merged.accountId && normalized.accountId) merged.accountId = normalized.accountId;
        if (normalized.rankIndex > merged.rankIndex) merged.rankIndex = normalized.rankIndex;
        if (!merged.flag && normalized.flag) merged.flag = normalized.flag;
        if (!merged.pic && normalized.pic) merged.pic = normalized.pic;
    });
    return merged;
}

export function buildSnapshotFromUserData(userData = {}, fallbackIdentifier = "") {
    const safeData = userData && typeof userData === "object" ? userData : {};
    const profile = safeData.profile && typeof safeData.profile === "object" ? safeData.profile : {};
    return {
        username: typeof safeData.username === "string" && safeData.username.trim() !== ""
            ? safeData.username.trim()
            : (typeof profile.username === "string" ? profile.username.trim() : ""),
        accountId: typeof safeData.accountId === "string" && safeData.accountId.trim() !== ""
            ? safeData.accountId.trim()
            : (typeof profile.accountId === "string" && profile.accountId.trim() !== ""
                ? profile.accountId.trim()
                : normalizeUid(fallbackIdentifier)),
        rankIndex: getRankIndex(safeData),
        flag: typeof profile.flag === "string" ? profile.flag.trim() : "",
        pic: typeof profile.pic === "string" ? profile.pic.trim() : ""
    };
}

function buildSnapshotFromDirectoryEntry(entry = {}, fallbackIdentifier = "") {
    const safeEntry = entry && typeof entry === "object" ? entry : {};
    return normalizeProfileSnapshot({
        username: safeEntry.username,
        accountId: safeEntry.accountId,
        rankIndex: safeEntry.rankIndex,
        flag: safeEntry.flag,
        pic: safeEntry.pic
    }, fallbackIdentifier);
}

function buildSnapshotFromFriendshipData(friendshipData = {}, friendUid = "") {
    const safeData = friendshipData && typeof friendshipData === "object" ? friendshipData : {};
    const profilesByUid = safeData.profilesByUid && typeof safeData.profilesByUid === "object"
        ? safeData.profilesByUid
        : {};
    return normalizeProfileSnapshot(profilesByUid[normalizeUid(friendUid)], friendUid);
}

function buildSnapshotFromRequestData(requestData = {}, profileKey = "fromProfile", fallbackIdentifier = "") {
    const safeData = requestData && typeof requestData === "object" ? requestData : {};
    return normalizeProfileSnapshot(safeData[profileKey], fallbackIdentifier);
}

export function setLoading(el) {
    if (!el) return;
    el.innerHTML = "<div style=\"display:flex; justify-content:center; padding:20px;\"><div style=\"width:24px; height:24px; border:2px solid rgba(255,255,255,0.1); border-radius:50%; border-top-color:#f5c645; animation:spin 0.8s linear infinite;\"></div></div>";
}

export function renderState(el, message, color = "#888", padding = "20px") {
    if (!el) return;
    el.innerHTML = "";
    const stateEl = document.createElement("div");
    stateEl.style.color = color;
    stateEl.style.textAlign = "center";
    stateEl.style.padding = padding;
    stateEl.textContent = message;
    el.appendChild(stateEl);
}

export function getCurrentRequestsTabActive(tabFriendRequests = null) {
    const tab = tabFriendRequests || getCachedElementById("tabFriendRequests");
    return !!(tab && tab.classList.contains("active"));
}

export function publishIncomingRequestState(userUid, requestUids, tabFriendRequests = null) {
    const requests = normalizeFriendRequestIds(requestUids);
    const requestsTabActive = getCurrentRequestsTabActive(tabFriendRequests);
    if (typeof friendsUIDeps.onFriendRequestsLoaded === "function") {
        friendsUIDeps.onFriendRequestsLoaded(userUid, requests, requestsTabActive);
    }
    if (typeof friendsUIDeps.updateNotificationVisibility === "function") {
        friendsUIDeps.updateNotificationVisibility();
    }
}

export async function safeResolveReadableUserDoc(identifier) {
    const normalizedIdentifier = normalizeUid(identifier);
    if (!normalizedIdentifier) return null;
    try {
        return await UserService.resolveUserDocByIdentifier(normalizedIdentifier);
    } catch (err) {
        if (!isPermissionLikeError(err)) throw err;
        return null;
    }
}

async function queryUidByAccountId(accountId) {
    const raw = normalizeUid(accountId);
    if (!raw) return "";
    const candidates = [...new Set([raw, raw.toUpperCase(), raw.toLowerCase()])];
    const fields = ["accountId", "profile.accountId"];
    for (const field of fields) {
        for (const candidate of candidates) {
            try {
                const snap = await getDocs(query(collection(db, "users"), where(field, "==", candidate)));
                if (!snap.empty) return normalizeUid(snap.docs[0].id);
            } catch (err) {
                if (!isPermissionLikeError(err)) throw err;
            }
        }
    }
    return "";
}

export async function resolveTargetUidFromIdentifier(identifier) {
    const normalizedIdentifier = normalizeUid(identifier);
    if (!normalizedIdentifier) return "";
    const directDoc = await safeResolveReadableUserDoc(normalizedIdentifier);
    if (directDoc && directDoc.exists()) return normalizeUid(directDoc.id);
    const directoryUid = await UserService.resolveUidByAccountId(normalizedIdentifier);
    if (directoryUid) return normalizeUid(directoryUid);
    return queryUidByAccountId(normalizedIdentifier);
}

export async function hydrateUserRecord(uid, fallbackSnapshots = []) {
    const normalizedUid = normalizeUid(uid);
    if (!normalizedUid) return null;
    const [userDoc, directoryEntry] = await Promise.all([
        safeResolveReadableUserDoc(normalizedUid),
        UserService.resolveAccountDirectoryEntryByUid(normalizedUid)
    ]);
    const readableUserDoc = userDoc && userDoc.exists() ? userDoc : null;
    const userData = readableUserDoc ? (readableUserDoc.data() || {}) : null;
    const snapshot = mergeProfileSnapshots(
        userData ? buildSnapshotFromUserData(userData, normalizedUid) : null,
        buildSnapshotFromDirectoryEntry(directoryEntry, normalizedUid),
        ...fallbackSnapshots
    );
    return { uid: normalizedUid, userData, snapshot };
}

function buildRenderableIdentity(record, tUnknown = "Unknown Player") {
    if (!record || !record.uid) return null;
    const userData = record.userData && typeof record.userData === "object" ? record.userData : null;
    const snapshot = mergeProfileSnapshots(record.snapshot);
    const profile = userData && userData.profile && typeof userData.profile === "object" ? userData.profile : {};
    const pic = (typeof profile.pic === "string" && profile.pic.trim() !== "") ? profile.pic.trim() : snapshot.pic;
    const flag = (typeof profile.flag === "string" && profile.flag.trim() !== "") ? profile.flag.trim() : snapshot.flag;
    const rankIndex = userData ? getRankIndex(userData) : clampRankIndex(snapshot.rankIndex);
    return {
        uid: record.uid,
        data: userData,
        snapshot: { ...snapshot, pic, flag },
        name: snapshot.username || tUnknown,
        rankName: RANK_NAMES[rankIndex] || RANK_NAMES[0],
        rankStyle: getRankTextStyle(rankIndex),
        filter: getRankFilter(rankIndex)
    };
}

export async function loadHydratedFriendEntries(userUid, tUnknown = "Unknown Player") {
    const friendshipDocs = await FriendsService.listFriendships(userUid);
    const entries = await Promise.all(friendshipDocs.map(async (friendshipSnap) => {
        const friendshipData = friendshipSnap.data() || {};
        const users = normalizeUidList(friendshipData.users);
        const friendUid = users.find((uid) => uid !== userUid) || "";
        if (!friendUid) return null;
        const record = await hydrateUserRecord(friendUid, [
            buildSnapshotFromFriendshipData(friendshipData, friendUid)
        ]);
        return buildRenderableIdentity(record, tUnknown);
    }));
    const uniqueEntries = [];
    const seen = new Set();
    entries.forEach((entry) => {
        if (!entry || !entry.uid || seen.has(entry.uid)) return;
        seen.add(entry.uid);
        uniqueEntries.push(entry);
    });
    return uniqueEntries.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base", numeric: true }));
}

export async function loadHydratedIncomingRequests(userUid, tUnknown = "Unknown Player") {
    const requestDocs = await FriendsService.listIncomingFriendRequests(userUid);
    const requestUids = [];
    const entries = await Promise.all(requestDocs.map(async (requestSnap) => {
        const requestData = requestSnap.data() || {};
        const requesterUid = normalizeUid(requestData.fromUid);
        if (!requesterUid) return null;
        requestUids.push(requesterUid);
        const record = await hydrateUserRecord(requesterUid, [
            buildSnapshotFromRequestData(requestData, "fromProfile", requesterUid)
        ]);
        return {
            requesterUid,
            identity: buildRenderableIdentity(record, tUnknown)
        };
    }));
    return {
        requestUids: normalizeFriendRequestIds(requestUids),
        entries: entries.filter((entry) => entry && entry.identity)
    };
}

export async function loadHydratedSentRequests(userUid, tUnknown = "Unknown Player") {
    const requestDocs = await FriendsService.listSentFriendRequests(userUid);
    const entries = await Promise.all(requestDocs.map(async (requestSnap) => {
        const requestData = requestSnap.data() || {};
        const targetUid = normalizeUid(requestData.toUid);
        if (!targetUid) return null;
        const record = await hydrateUserRecord(targetUid, [
            buildSnapshotFromRequestData(requestData, "toProfile", targetUid)
        ]);
        return {
            targetUid,
            identity: buildRenderableIdentity(record, tUnknown)
        };
    }));
    return entries.filter((entry) => entry && entry.identity);
}

function createProfilePicElement(pic) {
    const normalizedPic = typeof pic === "string" ? pic.trim() : "";
    if (!normalizedPic) return null;
    const picEl = document.createElement("div");
    picEl.className = "friend-profile-pic";
    picEl.style.backgroundImage = `url('${normalizedPic.replace(/'/g, "\\'")}')`;
    return picEl;
}

function createFlagElement(flag) {
    const normalizedFlag = typeof flag === "string" ? flag.trim() : "";
    if (!normalizedFlag) return null;
    const flagEl = document.createElement("div");
    flagEl.style.width = "20px";
    flagEl.style.height = "13px";
    flagEl.style.backgroundImage = `url('${getFlagUrl(normalizedFlag)}')`;
    flagEl.style.backgroundSize = "cover";
    flagEl.style.backgroundPosition = "center";
    flagEl.style.borderRadius = "2px";
    flagEl.style.marginLeft = "6px";
    flagEl.style.flexShrink = "0";
    return flagEl;
}

function appendIdentityBlock(container, entry) {
    const picEl = createProfilePicElement(entry.snapshot?.pic);
    if (picEl) container.appendChild(picEl);
    const infoEl = document.createElement("div");
    infoEl.className = "friend-info";
    const topRow = document.createElement("div");
    topRow.style.display = "flex";
    topRow.style.alignItems = "center";
    topRow.style.marginBottom = "2px";
    const nameEl = document.createElement("div");
    nameEl.className = "friend-name";
    nameEl.style.lineHeight = "1";
    nameEl.textContent = entry.name;
    topRow.appendChild(nameEl);
    const flagEl = createFlagElement(entry.snapshot?.flag);
    if (flagEl) topRow.appendChild(flagEl);
    const rankEl = document.createElement("div");
    rankEl.className = "friend-status";
    if (entry.rankStyle) rankEl.style.cssText = entry.rankStyle;
    rankEl.textContent = entry.rankName;
    infoEl.appendChild(topRow);
    infoEl.appendChild(rankEl);
    container.appendChild(infoEl);
}

export function buildActionItem(entry, actions = []) {
    const item = document.createElement("div");
    item.className = "friend-item";
    item.style.cursor = "default";
    appendIdentityBlock(item, entry);
    const actionsEl = document.createElement("div");
    actionsEl.className = "friend-actions";
    actions.forEach((action) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = action.className || "friend-request-btn";
        if (action.style) button.style.cssText = action.style;
        button.textContent = action.label || "";
        if (typeof action.onClick === "function") {
            button.addEventListener("click", action.onClick);
        }
        actionsEl.appendChild(button);
    });
    item.appendChild(actionsEl);
    item.addEventListener("click", (event) => {
        event.stopPropagation();
    });
    return item;
}

function buildViewItem(entry) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "friend-item friend-item--view";
    item.dataset.friendUid = entry.uid;
    appendIdentityBlock(item, entry);
    const trophyEl = document.createElement("img");
    trophyEl.src = FRIEND_TROPHY_ICON_SRC;
    trophyEl.className = "friend-rank-icon";
    trophyEl.alt = "";
    trophyEl.decoding = "sync";
    trophyEl.loading = "eager";
    if ("fetchPriority" in trophyEl) {
        trophyEl.fetchPriority = "high";
    }
    trophyEl.style.filter = entry.filter;
    trophyEl.style.marginLeft = "auto";
    item.appendChild(trophyEl);
    return item;
}

export function getFriendListInteractionState(friendList) {
    if (!friendList) return null;
    let state = friendListInteractionStates.get(friendList);
    if (state) return state;
    state = {
        payloadByUid: new Map(),
        pendingPointer: null,
        suppressClickUntil: 0,
        activeUid: ""
    };
    friendListInteractionStates.set(friendList, state);
    bindFriendListInteractions(friendList, state);
    return state;
}

function getViewableFriendItem(friendList, target) {
    if (!friendList || !target || !target.closest) return null;
    const item = target.closest(".friend-item--view");
    if (!item || !friendList.contains(item)) return null;
    return item;
}

function isPrivateProfileOverlayVisible() {
    const overlay = getCachedElementById("privateProfilePage");
    if (!overlay) return false;
    return !overlay.classList.contains("initially-hidden") && !overlay.classList.contains("is-hidden");
}

function navigateToFriendBenchmark(friendUid) {
    const targetUid = normalizeUid(friendUid);
    if (!targetUid || typeof window === "undefined") return;
    const targetUrl = new URL(Slugs.getBenchmarkAppEntryUrl(), window.location.origin);
    targetUrl.searchParams.set("id", targetUid);
    targetUrl.hash = "";
    window.location.assign(targetUrl.toString());
}

async function activateFriendListItem(friendList, item, event = null) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    const state = getFriendListInteractionState(friendList);
    if (!state || !item) return;
    const friendUid = normalizeUid(item.dataset.friendUid);
    if (!friendUid || state.activeUid) return;
    const payload = state.payloadByUid.get(friendUid);
    let friendData = payload && payload.data && typeof payload.data === "object" ? payload.data : null;
    state.activeUid = friendUid;
    item.classList.add("friend-item--pending");
    try {
        const latestDoc = await safeResolveReadableUserDoc(friendUid);
        if (latestDoc && latestDoc.exists()) {
            friendData = latestDoc.data() || friendData;
        }
        if (!friendData || typeof friendsUIDeps.enterViewMode !== "function") {
            navigateToFriendBenchmark(friendUid);
            return;
        }
        await friendsUIDeps.enterViewMode(friendData, friendUid);
        const enteredViewMode = document.body.classList.contains("view-mode");
        if (enteredViewMode && typeof friendsUIDeps.closeFriendsModalUI === "function") {
            friendsUIDeps.closeFriendsModalUI();
            return;
        }
        if (!enteredViewMode && !isPrivateProfileOverlayVisible()) {
            navigateToFriendBenchmark(friendUid);
        }
    } catch (err) {
        console.error("Failed to enter friend view mode:", err);
        navigateToFriendBenchmark(friendUid);
    } finally {
        item.classList.remove("friend-item--pending");
        if (state.activeUid === friendUid) state.activeUid = "";
    }
}

function bindFriendListInteractions(friendList, state) {
    if (!friendList || !state || friendList.dataset.viewBindingsReady === "1") return;
    friendList.addEventListener("pointerdown", (event) => {
        const item = getViewableFriendItem(friendList, event.target);
        if (!item) {
            state.pendingPointer = null;
            return;
        }
        state.pendingPointer = {
            uid: normalizeUid(item.dataset.friendUid),
            x: Number(event.clientX) || 0,
            y: Number(event.clientY) || 0
        };
    });
    friendList.addEventListener("pointermove", (event) => {
        if (!state.pendingPointer) return;
        const deltaX = Math.abs((Number(event.clientX) || 0) - state.pendingPointer.x);
        const deltaY = Math.abs((Number(event.clientY) || 0) - state.pendingPointer.y);
        if (deltaX > FRIEND_TAP_MOVE_PX || deltaY > FRIEND_TAP_MOVE_PX) {
            state.pendingPointer = null;
        }
    });
    friendList.addEventListener("pointercancel", () => {
        state.pendingPointer = null;
    });
    friendList.addEventListener("pointerup", (event) => {
        const item = getViewableFriendItem(friendList, event.target);
        if (!item || !state.pendingPointer) return;
        const pendingUid = normalizeUid(state.pendingPointer.uid);
        state.pendingPointer = null;
        if (!pendingUid || pendingUid !== normalizeUid(item.dataset.friendUid)) return;
        state.suppressClickUntil = Date.now() + FRIEND_CLICK_SUPPRESS_MS;
        void activateFriendListItem(friendList, item, event);
    });
    friendList.addEventListener("click", (event) => {
        const item = getViewableFriendItem(friendList, event.target);
        if (!item) return;
        if (Date.now() < state.suppressClickUntil) {
            event.preventDefault();
            event.stopPropagation();
            return;
        }
        void activateFriendListItem(friendList, item, event);
    });
    friendList.dataset.viewBindingsReady = "1";
}

export function renderFriendViewEntries(friendList, entries) {
    const interactionState = getFriendListInteractionState(friendList);
    if (interactionState) {
        interactionState.payloadByUid.clear();
        interactionState.pendingPointer = null;
        interactionState.activeUid = "";
        interactionState.suppressClickUntil = 0;
    }
    friendList.innerHTML = "";
    entries.forEach((entry) => {
        if (interactionState) {
            interactionState.payloadByUid.set(entry.uid, { data: entry.data });
        }
        friendList.appendChild(buildViewItem(entry));
    });
}

export function showRemoveFriendConfirmModal(title, message, onConfirm) {
    const modal = getCachedElementById("removeFriendConfirmModal");
    const titleEl = getCachedElementById("removeFriendConfirmTitle");
    const messageEl = getCachedElementById("removeFriendConfirmMessage");
    const okBtn = getCachedElementById("removeFriendConfirmOkBtn");
    const cancelBtn = getCachedElementById("removeFriendConfirmCancelBtn");
    if (!modal || !okBtn || !cancelBtn) return;
    if (activeRemoveFriendModalCleanup) activeRemoveFriendModalCleanup();
    if (titleEl) titleEl.textContent = title;
    if (messageEl) messageEl.textContent = message;
    modal.classList.remove("closing");
    modal.classList.add("show");
    let closed = false;
    const cleanup = () => {
        if (closed) return;
        closed = true;
        okBtn.onclick = null;
        cancelBtn.onclick = null;
        modal.onclick = null;
        modal.classList.remove("show");
        modal.classList.add("closing");
        setTimeout(() => {
            modal.classList.remove("closing");
        }, 200);
        if (activeRemoveFriendModalCleanup === cleanup) {
            activeRemoveFriendModalCleanup = null;
        }
    };
    okBtn.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        cleanup();
        if (typeof onConfirm === "function") void onConfirm();
    };
    cancelBtn.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        cleanup();
    };
    modal.onclick = (event) => {
        if (event.target !== modal) return;
        event.preventDefault();
        event.stopPropagation();
        cleanup();
    };
    activeRemoveFriendModalCleanup = cleanup;
}

export async function readCurrentUserData() {
    const user = auth.currentUser;
    if (!user) return {};
    try {
        const userDoc = await UserService.getUserDocument(user.uid);
        return userDoc && userDoc.exists() ? (userDoc.data() || {}) : {};
    } catch (err) {
        console.warn("Unable to read current user data for friends UI:", err);
        return {};
    }
}

export function getCurrentUserAccountId(userData = {}) {
    const safeData = userData && typeof userData === "object" ? userData : {};
    const profile = safeData.profile && typeof safeData.profile === "object" ? safeData.profile : {};
    if (typeof safeData.accountId === "string" && safeData.accountId.trim() !== "") {
        return safeData.accountId.trim();
    }
    if (typeof profile.accountId === "string" && profile.accountId.trim() !== "") {
        return profile.accountId.trim();
    }
    return "";
}
