import {
    doc,
    getDoc,
    collection,
    query,
    where,
    getDocs,
    updateDoc,
    arrayUnion,
    arrayRemove
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db } from "./client.js";
import { normalizeFriendRequestIds, getFlagUrl, escapeHtml } from "./utils.js";
import { getCachedElementById, setHidden } from "./utils/domUtils.js";
import { FINAL_RANK_INDEX, RANK_NAMES, RANK_TEXT_COLORS, STELLAR_TROPHY_FILTER } from "./constants.js";
import { t, tf } from "./i18n.js";
import * as UserService from "./userService.js?v=20260310-public-slug-directory-1";
import * as FriendsService from "./friendsService.js?v=20260311-friendship-profile-fallback-1";
import * as Slugs from "./slugs.js?v=20260310-public-slug-directory-1";

function resolveFriendAssetUrl(assetPath) {
    const raw = typeof assetPath === "string" ? assetPath.trim() : "";
    if (!raw || typeof window === "undefined") return raw;
    try {
        return new URL(raw, new URL(Slugs.getBenchmarkAppEntryUrl(), window.location.origin)).toString();
    } catch (e) {
        return raw;
    }
}

const FRIEND_TROPHY_ICON_SRC = resolveFriendAssetUrl("../icons/trophy.png");
const friendTrophyIconPreload = primeFriendTrophyIcon();
void friendTrophyIconPreload;

const friendsUIDeps = {
    calculateRankFromData: null,
    enterViewMode: null,
    closeFriendsModalUI: null,
    showConfirmModal: null,
    updateNotificationVisibility: null,
    onFriendRequestsLoaded: null
};
let activeRemoveFriendModalCleanup = null;
const FRIEND_ITEM_TAP_MOVE_PX = 12;
const FRIEND_ITEM_CLICK_SUPPRESS_MS = 400;
const friendListInteractionStates = new WeakMap();

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

export function configure(deps = {}) {
    if (!deps || typeof deps !== "object") return;
    Object.keys(friendsUIDeps).forEach((key) => {
        if (!Object.prototype.hasOwnProperty.call(deps, key)) return;
        friendsUIDeps[key] = typeof deps[key] === "function" ? deps[key] : null;
    });
}

function showRemoveFriendConfirmModal(title, message, onConfirm) {
    const modal = getCachedElementById("removeFriendConfirmModal");
    const titleEl = getCachedElementById("removeFriendConfirmTitle");
    const messageEl = getCachedElementById("removeFriendConfirmMessage");
    const okBtn = getCachedElementById("removeFriendConfirmOkBtn");
    const cancelBtn = getCachedElementById("removeFriendConfirmCancelBtn");
    if (!modal || !okBtn || !cancelBtn) return;

    if (activeRemoveFriendModalCleanup) {
        activeRemoveFriendModalCleanup();
        activeRemoveFriendModalCleanup = null;
    }

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

    okBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        cleanup();
        if (typeof onConfirm === "function") {
            void onConfirm();
        }
    };

    cancelBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        cleanup();
    };

    modal.onclick = (e) => {
        if (e.target !== modal) return;
        e.preventDefault();
        e.stopPropagation();
        cleanup();
    };

    activeRemoveFriendModalCleanup = cleanup;
}

function getRankFilter(maxRankIndex) {
    let filter = "grayscale(100%)";
    if (maxRankIndex === 2) filter = "sepia(1) hue-rotate(-35deg) saturate(3) brightness(0.65)";
    else if (maxRankIndex === 3) filter = "grayscale(100%) brightness(1.3)";
    else if (maxRankIndex === 4) filter = "sepia(1) hue-rotate(5deg) saturate(2.5) brightness(0.9)";
    else if (maxRankIndex === 5) filter = "sepia(1) hue-rotate(130deg) saturate(1.5) brightness(1.1)";
    else if (maxRankIndex === 6) filter = "sepia(1) hue-rotate(170deg) saturate(3) brightness(1.0)";
    else if (maxRankIndex === 7) filter = "sepia(1) hue-rotate(220deg) saturate(3) brightness(0.9)";
    else if (maxRankIndex === 8) filter = "sepia(1) hue-rotate(10deg) saturate(5) brightness(1.2)";
    else if (maxRankIndex === 9) filter = "sepia(1) hue-rotate(330deg) saturate(5) brightness(0.8)";
    else if (maxRankIndex === 10) filter = "sepia(1) hue-rotate(120deg) saturate(2) brightness(0.9)";
    else if (maxRankIndex === 11) filter = STELLAR_TROPHY_FILTER;
    else if (maxRankIndex === 12) filter = "sepia(1) hue-rotate(290deg) saturate(3) brightness(0.9)";
    else if (maxRankIndex >= 13) filter = "sepia(1) hue-rotate(2deg) saturate(0.74) brightness(1.16)";
    return filter;
}

function getRankTextStyle(maxRankIndex) {
    if (maxRankIndex === 11) return "background: linear-gradient(110deg, #FF6F00 20%, #FF8F00 40%, #FFA000 48%, #FFB300 50%, #FFA000 52%, #FF8F00 60%, #FF6F00 80%); background-size: 200% auto; -webkit-background-clip: text; background-clip: text; color: transparent; animation: eternalShimmer 2.5s linear infinite; font-weight: bold;";
    if (maxRankIndex === 12) return "background: linear-gradient(110deg, #D8007F 20%, #E91E63 35%, #F06292 45%, #FF80AB 50%, #F06292 55%, #E91E63 65%, #D8007F 80%); background-size: 200% auto; -webkit-background-clip: text; background-clip: text; color: transparent; animation: eternalShimmer 2.5s linear infinite; font-weight: bold;";
    if (maxRankIndex >= 13) return "background: linear-gradient(110deg, #cab98a 20%, #e5d9b6 35%, #f2e9cf 48%, #fff7e5 50%, #f2e9cf 52%, #e5d9b6 65%, #cab98a 80%); background-size: 200% auto; -webkit-background-clip: text; background-clip: text; color: transparent; animation: eternalShimmer 2.5s linear infinite; font-weight: bold;";
    return `color: ${RANK_TEXT_COLORS[maxRankIndex] || "#888"};`;
}

function buildFriendProfilePicHtml(profile) {
    const pic = typeof profile?.pic === "string" ? profile.pic.trim() : "";
    if (!pic) return "";
    const safePic = pic.replace(/'/g, "\\'");
    return `<div class="friend-profile-pic" style="background-image: url('${safePic}');"></div>`;
}

function createFriendFlagElement(flag) {
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

function buildFriendListViewItem({ uid = "", name = "", rankName = "", rankStyle = "", filter = "", profile = {} } = {}) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "friend-item friend-item--view";
    item.dataset.friendUid = typeof uid === "string" ? uid.trim() : "";

    const pic = typeof profile?.pic === "string" ? profile.pic.trim() : "";
    if (pic) {
        const picEl = document.createElement("div");
        picEl.className = "friend-profile-pic";
        picEl.style.backgroundImage = `url('${pic.replace(/'/g, "\\'")}')`;
        item.appendChild(picEl);
    }

    const info = document.createElement("div");
    info.className = "friend-info";

    const topRow = document.createElement("div");
    topRow.style.display = "flex";
    topRow.style.alignItems = "center";
    topRow.style.marginBottom = "2px";

    const nameEl = document.createElement("div");
    nameEl.className = "friend-name";
    nameEl.style.lineHeight = "1";
    nameEl.textContent = name;
    topRow.appendChild(nameEl);

    const flagEl = createFriendFlagElement(profile && profile.flag);
    if (flagEl) topRow.appendChild(flagEl);

    const statusEl = document.createElement("div");
    statusEl.className = "friend-status";
    if (rankStyle) statusEl.style.cssText = rankStyle;
    statusEl.textContent = rankName;

    info.appendChild(topRow);
    info.appendChild(statusEl);
    item.appendChild(info);

    const trophyEl = document.createElement("img");
    trophyEl.src = FRIEND_TROPHY_ICON_SRC;
    trophyEl.className = "friend-rank-icon";
    trophyEl.alt = "";
    trophyEl.decoding = "sync";
    trophyEl.loading = "eager";
    if ("fetchPriority" in trophyEl) {
        trophyEl.fetchPriority = "high";
    }
    trophyEl.style.filter = filter;
    trophyEl.style.marginLeft = "auto";
    item.appendChild(trophyEl);

    return item;
}

function getFriendListInteractionState(friendList) {
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
    if (!friendList || !target) return null;
    const candidate = target && target.nodeType === 1
        ? target
        : (target && target.parentElement ? target.parentElement : null);
    if (!candidate || !candidate.closest) return null;
    const item = candidate.closest(".friend-item--view");
    if (!item || !friendList.contains(item)) return null;
    return item;
}

function isPrivateProfileOverlayVisible() {
    const overlay = getCachedElementById("privateProfilePage");
    if (!overlay) return false;
    return !overlay.classList.contains("initially-hidden") && !overlay.classList.contains("is-hidden");
}

function navigateToFriendBenchmark(friendUid) {
    const targetUid = typeof friendUid === "string" ? friendUid.trim() : "";
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

    const friendUid = typeof item.dataset.friendUid === "string" ? item.dataset.friendUid.trim() : "";
    if (!friendUid || state.activeUid) return;

    const payload = state.payloadByUid.get(friendUid);
    let friendData = payload && payload.data && typeof payload.data === "object" ? payload.data : null;

    state.activeUid = friendUid;
    item.classList.add("friend-item--pending");

    try {
        try {
            const latestDoc = await UserService.getUserDocument(friendUid);
            if (latestDoc && latestDoc.exists()) {
                friendData = latestDoc.data() || friendData;
            }
        } catch (refreshErr) {
            console.warn("Unable to refresh friend profile before entering view mode:", refreshErr);
        }

        if (!friendData || typeof friendsUIDeps.enterViewMode !== "function") {
            navigateToFriendBenchmark(friendUid);
            return;
        }
        await friendsUIDeps.enterViewMode(friendData, friendUid);
        const enteredViewMode = document.body.classList.contains("view-mode");
        const privateOverlayVisible = isPrivateProfileOverlayVisible();
        if (enteredViewMode && typeof friendsUIDeps.closeFriendsModalUI === "function") {
            friendsUIDeps.closeFriendsModalUI();
            return;
        }
        if (!enteredViewMode && !privateOverlayVisible) {
            navigateToFriendBenchmark(friendUid);
        }
    } catch (err) {
        console.error("Failed to enter friend view mode:", err);
        navigateToFriendBenchmark(friendUid);
    } finally {
        item.classList.remove("friend-item--pending");
        if (state.activeUid === friendUid) {
            state.activeUid = "";
        }
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
            uid: item.dataset.friendUid || "",
            x: Number(event.clientX) || 0,
            y: Number(event.clientY) || 0
        };
    });

    friendList.addEventListener("pointermove", (event) => {
        if (!state.pendingPointer) return;
        const deltaX = Math.abs((Number(event.clientX) || 0) - state.pendingPointer.x);
        const deltaY = Math.abs((Number(event.clientY) || 0) - state.pendingPointer.y);
        if (deltaX > FRIEND_ITEM_TAP_MOVE_PX || deltaY > FRIEND_ITEM_TAP_MOVE_PX) {
            state.pendingPointer = null;
        }
    });

    friendList.addEventListener("pointercancel", () => {
        state.pendingPointer = null;
    });

    friendList.addEventListener("pointerup", (event) => {
        const item = getViewableFriendItem(friendList, event.target);
        if (!item || !state.pendingPointer) return;
        const pendingUid = typeof state.pendingPointer.uid === "string" ? state.pendingPointer.uid.trim() : "";
        state.pendingPointer = null;
        if (!pendingUid || pendingUid !== (item.dataset.friendUid || "").trim()) return;
        state.suppressClickUntil = Date.now() + FRIEND_ITEM_CLICK_SUPPRESS_MS;
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

function buildFriendRequestProfileSnapshot(data = {}, fallbackAccountId = "") {
    const safeData = data && typeof data === "object" ? data : {};
    const profile = safeData.profile && typeof safeData.profile === "object" ? safeData.profile : {};
    const username = typeof safeData.username === "string" && safeData.username.trim() !== ""
        ? safeData.username.trim()
        : (typeof profile.username === "string" ? profile.username.trim() : "");
    const accountId = typeof safeData.accountId === "string" && safeData.accountId.trim() !== ""
        ? safeData.accountId.trim()
        : (typeof profile.accountId === "string" && profile.accountId.trim() !== ""
            ? profile.accountId.trim()
            : ((fallbackAccountId || "").toString().trim()));
    const flag = typeof profile.flag === "string" ? profile.flag.trim() : "";
    const pic = typeof profile.pic === "string" ? profile.pic.trim() : "";
    return {
        username,
        accountId,
        rankIndex: getRankIndex(safeData),
        flag,
        pic
    };
}

function normalizeFriendRequestProfileSnapshot(rawProfile = {}, fallbackIdentifier = "") {
    const safeProfile = rawProfile && typeof rawProfile === "object" ? rawProfile : {};
    return {
        username: typeof safeProfile.username === "string" ? safeProfile.username.trim() : "",
        accountId: typeof safeProfile.accountId === "string" && safeProfile.accountId.trim() !== ""
            ? safeProfile.accountId.trim()
            : ((fallbackIdentifier || "").toString().trim()),
        rankIndex: clampRankIndex(safeProfile.rankIndex),
        flag: typeof safeProfile.flag === "string" ? safeProfile.flag.trim() : "",
        pic: typeof safeProfile.pic === "string" ? safeProfile.pic.trim() : ""
    };
}

function buildFriendRequestProfileSnapshotFromDirectoryEntry(rawEntry = {}, fallbackIdentifier = "") {
    const safeEntry = rawEntry && typeof rawEntry === "object" ? rawEntry : {};
    return normalizeFriendRequestProfileSnapshot({
        username: safeEntry.username,
        accountId: safeEntry.accountId,
        rankIndex: safeEntry.rankIndex,
        flag: safeEntry.flag,
        pic: safeEntry.pic
    }, fallbackIdentifier);
}

function buildFriendRequestProfileSnapshotFromFriendshipEntry(rawEntry = {}, friendUid = "", fallbackIdentifier = "") {
    const safeEntry = rawEntry && typeof rawEntry === "object" ? rawEntry : {};
    const safeFriendUid = typeof friendUid === "string" ? friendUid.trim() : "";
    const profilesByUid = safeEntry.profilesByUid && typeof safeEntry.profilesByUid === "object"
        ? safeEntry.profilesByUid
        : {};
    const profileEntry = safeFriendUid && profilesByUid[safeFriendUid] && typeof profilesByUid[safeFriendUid] === "object"
        ? profilesByUid[safeFriendUid]
        : {};
    return normalizeFriendRequestProfileSnapshot(profileEntry, fallbackIdentifier || safeFriendUid);
}

function mergeFriendRequestProfileSnapshots(...profiles) {
    const merged = {
        username: "",
        accountId: "",
        rankIndex: 0,
        flag: "",
        pic: ""
    };
    profiles.forEach((profile) => {
        const normalized = normalizeFriendRequestProfileSnapshot(profile, merged.accountId);
        if (!merged.username && normalized.username) merged.username = normalized.username;
        if (!merged.accountId && normalized.accountId) merged.accountId = normalized.accountId;
        if (normalized.rankIndex > merged.rankIndex) merged.rankIndex = normalized.rankIndex;
        if (!merged.flag && normalized.flag) merged.flag = normalized.flag;
        if (!merged.pic && normalized.pic) merged.pic = normalized.pic;
    });
    return merged;
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

function getFallbackRankIndex(data = {}) {
    const settings = data && typeof data.settings === "object" && data.settings ? data.settings : {};
    const profile = data && typeof data.profile === "object" && data.profile ? data.profile : {};

    const numericCandidates = [
        data.maxRankIndex,
        data.rankIndex,
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

    const rankNameCandidates = [
        data.currentRank,
        profile.currentRank
    ];
    rankNameCandidates.forEach((value) => {
        const rank = parseRankIndexFromName(value);
        if (rank > best) best = rank;
    });

    return best;
}

function getRankIndex(data) {
    const computed = typeof friendsUIDeps.calculateRankFromData === "function"
        ? clampRankIndex(friendsUIDeps.calculateRankFromData(data))
        : 0;
    const fallback = getFallbackRankIndex(data);
    return Math.max(computed, fallback);
}

function setLoading(el) {
    if (!el) return;
    el.innerHTML = "<div style=\"display: flex; justify-content: center; padding: 20px;\"><div style=\"width: 24px; height: 24px; border: 2px solid rgba(255,255,255,0.1); border-radius: 50%; border-top-color: #f5c645; animation: spin 0.8s linear infinite;\"></div></div>";
}

async function resolveUserUidByAccountId(rawAccountId) {
    const trimmed = typeof rawAccountId === "string" ? rawAccountId.trim() : "";
    if (!trimmed) return "";

    const directoryUid = await UserService.resolveUidByAccountId(rawAccountId);
    if (directoryUid) return directoryUid;

    const candidates = [...new Set([
        trimmed,
        trimmed.toUpperCase(),
        trimmed.toLowerCase()
    ].filter((value) => typeof value === "string" && value.trim() !== ""))];

    const fields = ["accountId", "profile.accountId"];
    for (const field of fields) {
        for (const candidate of candidates) {
            try {
                const accountQuery = query(collection(db, "users"), where(field, "==", candidate));
                const snap = await getDocs(accountQuery);
                if (!snap.empty) return snap.docs[0].id || "";
            } catch (e) {
                const code = e && typeof e.code === "string" ? e.code : "";
                if (code !== "permission-denied") {
                    console.error("Error resolving account id fallback query:", e);
                }
            }
        }
    }
    return "";
}

async function resolveDirectoryRequestProfile({ accountId = "", uid = "" } = {}) {
    const normalizedAccountId = typeof accountId === "string" ? accountId.trim() : "";
    if (normalizedAccountId) {
        const directoryEntry = await UserService.resolveAccountDirectoryEntry(normalizedAccountId);
        if (directoryEntry) return directoryEntry;
    }
    const normalizedUid = typeof uid === "string" ? uid.trim() : "";
    if (normalizedUid) {
        const directoryEntry = await UserService.resolveAccountDirectoryEntryByUid(normalizedUid);
        if (directoryEntry) return directoryEntry;
    }
    return null;
}

async function inferAcceptedSentFriendUids(userUid, sentRequestUids) {
    const ownerUid = typeof userUid === "string" ? userUid.trim() : "";
    const pendingTargets = normalizeFriendRequestIds(sentRequestUids);
    if (!ownerUid || !pendingTargets.length) return [];

    const inferredAccepted = [];
    await Promise.all(pendingTargets.map(async (targetUid) => {
        try {
            const [isFriend, requestDoc, targetDoc] = await Promise.all([
                FriendsService.areFriends(ownerUid, targetUid),
                FriendsService.getFriendRequestDocument(ownerUid, targetUid),
                UserService.resolveUserDocByIdentifier(targetUid)
            ]);

            if (isFriend) {
                inferredAccepted.push(targetUid);
                return;
            }
            if (requestDoc && requestDoc.exists()) return;
            if (!targetDoc || !targetDoc.exists()) return;

            const targetData = targetDoc.data() || {};
            const targetFriends = normalizeFriendRequestIds(targetData.friends || []);
            if (targetFriends.includes(ownerUid)) {
                inferredAccepted.push(targetDoc.id || targetUid);
            }
        } catch (err) {
            console.warn("Unable to inspect pending sent request for accepted friend inference:", err);
        }
    }));

    return normalizeFriendRequestIds(inferredAccepted);
}

async function selfHealAcceptedFriends(userUid, acceptedFriendUids) {
    const ownerUid = typeof userUid === "string" ? userUid.trim() : "";
    const accepted = normalizeFriendRequestIds(acceptedFriendUids);
    if (!ownerUid || !accepted.length) return;

    try {
        await updateDoc(doc(db, "users", ownerUid), {
            friends: arrayUnion(...accepted),
            sentFriendRequests: arrayRemove(...accepted)
        });
    } catch (err) {
        console.warn("Unable to self-heal accepted friend entries on current user doc:", err);
    }
}

export async function loadFriendsList(options = {}) {
    const friendList = options.friendList || getCachedElementById("friendList");
    const user = auth.currentUser;
    if (!user || !friendList) return;

    setLoading(friendList);

    try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.exists() ? (userDoc.data() || {}) : {};
        const storedFriends = normalizeFriendRequestIds(userData.friends).filter((uid) => typeof uid === "string" && uid.trim() !== "");
        let edgeFriends = [];
        const friendshipProfileByUid = new Map();
        try {
            const friendshipDocs = await FriendsService.listFriendships(user.uid);
            edgeFriends = normalizeFriendRequestIds(friendshipDocs.map((snap) => {
                const data = snap.data() || {};
                const users = Array.isArray(data.users) ? data.users : [];
                const friendUid = users.find((uidValue) => typeof uidValue === "string" && uidValue.trim() !== "" && uidValue !== user.uid) || "";
                if (friendUid && !friendshipProfileByUid.has(friendUid)) {
                    friendshipProfileByUid.set(
                        friendUid,
                        buildFriendRequestProfileSnapshotFromFriendshipEntry(data, friendUid, friendUid)
                    );
                }
                return friendUid;
            }));
        } catch (e) {
            console.error("Error loading friendship edges:", e);
        }

        let friends = normalizeFriendRequestIds([...storedFriends, ...edgeFriends]);
        if (edgeFriends.length) {
            await selfHealAcceptedFriends(user.uid, edgeFriends);
        }

        const legacySentRequests = normalizeFriendRequestIds(userData.sentFriendRequests || []);
        if (legacySentRequests.length) {
            const inferredAccepted = await inferAcceptedSentFriendUids(user.uid, legacySentRequests);
            if (inferredAccepted.length) {
                friends = normalizeFriendRequestIds([...friends, ...inferredAccepted]);
                await selfHealAcceptedFriends(user.uid, inferredAccepted);
            }
        }

        if (friends.length === 0) {
            friendList.innerHTML = `<div style="color:#888; text-align:center; padding:20px;">${t("friends_none")}</div>`;
            return;
        }

        const friendDocResults = await Promise.allSettled(
            friends.map(async (identifier) => {
                const normalizedIdentifier = typeof identifier === "string" ? identifier.trim() : "";
                let snap = normalizedIdentifier
                    ? await UserService.resolveUserDocByIdentifier(normalizedIdentifier)
                    : null;
                let resolvedUid = snap && snap.exists()
                    ? snap.id
                    : "";

                if (!resolvedUid && normalizedIdentifier) {
                    resolvedUid = await resolveUserUidByAccountId(normalizedIdentifier);
                    if (resolvedUid) {
                        snap = await UserService.resolveUserDocByIdentifier(resolvedUid);
                    }
                }

                const directoryProfile = (!snap || !snap.exists())
                    ? await resolveDirectoryRequestProfile({
                        accountId: normalizedIdentifier,
                        uid: resolvedUid || normalizedIdentifier
                    })
                    : null;

                return {
                    identifier: normalizedIdentifier,
                    snap: snap && snap.exists() ? snap : null,
                    resolvedUid: (resolvedUid || normalizedIdentifier || "").trim(),
                    directoryProfile,
                    friendshipProfile: friendshipProfileByUid.get((resolvedUid || normalizedIdentifier || "").trim()) || null
                };
            })
        );

        const renderableFriends = [];
        const renderedFriendUids = new Set();
        const interactionState = getFriendListInteractionState(friendList);
        if (interactionState) {
            interactionState.payloadByUid.clear();
            interactionState.pendingPointer = null;
            interactionState.activeUid = "";
            interactionState.suppressClickUntil = 0;
        }

        friendDocResults.forEach((result) => {
            if (result.status !== "fulfilled") return;
            const friendIdentifier = typeof result.value.identifier === "string" ? result.value.identifier.trim() : "";
            const friendDoc = result.value.snap;
            const friendUid = typeof result.value.resolvedUid === "string" ? result.value.resolvedUid.trim() : "";
            if (!friendUid || renderedFriendUids.has(friendUid)) return;
            renderedFriendUids.add(friendUid);
            try {
                const data = friendDoc ? (friendDoc.data() || {}) : {};
                const profile = (data && typeof data.profile === "object" && data.profile) ? data.profile : {};
                const friendshipMeta = normalizeFriendRequestProfileSnapshot(
                    result.value.friendshipProfile,
                    friendIdentifier || friendUid
                );
                const directoryMeta = buildFriendRequestProfileSnapshotFromDirectoryEntry(
                    result.value.directoryProfile,
                    friendIdentifier || friendUid
                );
                const fallbackMeta = mergeFriendRequestProfileSnapshots(friendshipMeta, directoryMeta);
                const name = data.username
                    || profile.username
                    || fallbackMeta.username
                    || t("unknown_player");
                const maxRankIndex = friendDoc ? getRankIndex(data) : fallbackMeta.rankIndex;
                const rankName = RANK_NAMES[maxRankIndex] || RANK_NAMES[0];
                const filter = getRankFilter(maxRankIndex);
                const rankStyle = getRankTextStyle(maxRankIndex);

                renderableFriends.push({
                    uid: friendUid,
                    name,
                    data: friendDoc ? data : null,
                    profile: friendDoc ? profile : fallbackMeta,
                    rankName,
                    rankStyle,
                    filter
                });
            } catch (renderErr) {
                console.warn("Skipping invalid friend entry:", renderErr);
            }
        });

        friendList.innerHTML = "";

        renderableFriends
            .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base", numeric: true }))
            .forEach((entry) => {
                if (interactionState && entry.uid) {
                    interactionState.payloadByUid.set(entry.uid, { data: entry.data });
                }
                friendList.appendChild(buildFriendListViewItem({
                    uid: entry.uid,
                    name: entry.name,
                    rankName: entry.rankName,
                    rankStyle: entry.rankStyle,
                    filter: entry.filter,
                    profile: entry.profile
                }));
            });

        if (!friendList.children.length) {
            friendList.innerHTML = `<div style="color:#888; text-align:center; padding:20px;">${t("friends_none")}</div>`;
        }
    } catch (e) {
        console.error("Error loading friends list", e);
        friendList.innerHTML = `<div style="color:#ff6666; text-align:center; padding:20px;">${t("friends_error_loading")}</div>`;
    }
}

export async function loadFriendRequests(options = {}) {
    const friendRequestsList = options.friendRequestsList || getCachedElementById("friendRequestsList");
    const tabFriendRequests = options.tabFriendRequests || getCachedElementById("tabFriendRequests");
    const user = auth.currentUser;
    if (!user || !friendRequestsList) return;
    const deferRender = !!options.deferRender;

    if (!deferRender) setLoading(friendRequestsList);

    try {
        let requests = [];
        let requestDocs = [];
        try {
            requestDocs = await FriendsService.listIncomingFriendRequests(user.uid);
            requests = normalizeFriendRequestIds(requestDocs.map((snap) => {
                const data = snap.data() || {};
                return typeof data.fromUid === "string" ? data.fromUid : "";
            }));
        } catch (e) {
            console.error("Error loading incoming request edges:", e);
        }
        if (!requests.length) {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            const userData = userDoc.exists() ? (userDoc.data() || {}) : {};
            requests = normalizeFriendRequestIds(userData.friendRequests || []);
        }
        const requestsTabActive = !!(tabFriendRequests && tabFriendRequests.classList.contains("active"));
        const requestDocByFromUid = new Map();
        requestDocs.forEach((snap) => {
            const data = snap.data() || {};
            const fromUid = typeof data.fromUid === "string" ? data.fromUid.trim() : "";
            if (!fromUid || requestDocByFromUid.has(fromUid)) return;
            requestDocByFromUid.set(fromUid, data);
        });

        if (typeof friendsUIDeps.onFriendRequestsLoaded === "function") {
            friendsUIDeps.onFriendRequestsLoaded(user.uid, requests, requestsTabActive);
        }
        if (typeof friendsUIDeps.updateNotificationVisibility === "function") {
            friendsUIDeps.updateNotificationVisibility();
        }

        let requesterEntries = [];
        if (requests.length) {
            const requesterDocResults = await Promise.allSettled(
                requests.map(async (identifier) => {
                    const normalizedIdentifier = typeof identifier === "string" ? identifier.trim() : "";
                    let requesterUid = normalizedIdentifier;
                    let snap = normalizedIdentifier
                        ? await UserService.resolveUserDocByIdentifier(normalizedIdentifier)
                        : null;

                    if ((!snap || !snap.exists()) && normalizedIdentifier) {
                        const resolvedUid = await resolveUserUidByAccountId(normalizedIdentifier);
                        if (resolvedUid) {
                            requesterUid = resolvedUid;
                            snap = await UserService.resolveUserDocByIdentifier(resolvedUid);
                        }
                    }

                    const directoryProfile = (!snap || !snap.exists())
                        ? await resolveDirectoryRequestProfile({
                            accountId: normalizedIdentifier,
                            uid: requesterUid || normalizedIdentifier
                        })
                        : null;

                    return {
                        identifier: normalizedIdentifier,
                        requesterUid,
                        snap: snap && snap.exists() ? snap : null,
                        directoryProfile
                    };
                })
            );
            requesterEntries = requesterDocResults
                .map((result) => (result.status === "fulfilled" ? result.value : null))
                .filter((entry) => entry && (entry.requesterUid || entry.identifier))
                .map((entry) => ({
                    identifier: entry.identifier,
                    requesterUid: entry.requesterUid || entry.identifier,
                    requesterDoc: entry.snap || null,
                    directoryProfile: entry.directoryProfile || null
                }));
        }

        const syncRenderedRequestState = (nextRequests) => {
            requests = normalizeFriendRequestIds(nextRequests);
            const isRequestsTabActive = !!(tabFriendRequests && tabFriendRequests.classList.contains("active"));
            if (typeof friendsUIDeps.onFriendRequestsLoaded === "function") {
                friendsUIDeps.onFriendRequestsLoaded(user.uid, requests, isRequestsTabActive);
            }
            if (typeof friendsUIDeps.updateNotificationVisibility === "function") {
                friendsUIDeps.updateNotificationVisibility();
            }
        };

        const renderEmptyState = () => {
            friendRequestsList.innerHTML = `<div style="color:#888; text-align:center; padding:20px;">${t("friend_requests_none")}</div>`;
        };

        const removeRenderedRequest = (requesterUid, requestIdentifier, item) => {
            syncRenderedRequestState(requests.filter((uid) => uid !== requesterUid && uid !== requestIdentifier));
            requesterEntries = requesterEntries.filter((entry) => entry.requesterUid !== requesterUid && entry.identifier !== requestIdentifier);
            if (item && item.parentNode === friendRequestsList) {
                item.remove();
            }
            if (!requests.length) {
                renderEmptyState();
            }
        };

        const render = () => {
            if (requests.length === 0) {
                renderEmptyState();
                return;
            }

            friendRequestsList.innerHTML = "";

            requesterEntries.forEach((entry) => {
                const requesterDoc = entry.requesterDoc;
                const requesterUid = entry.requesterUid;
                const requestIdentifier = entry.identifier;
                const requestMeta = normalizeFriendRequestProfileSnapshot(
                    (requestDocByFromUid.get(requesterUid) || requestDocByFromUid.get(requestIdentifier || requesterUid))?.fromProfile,
                    requestIdentifier || requesterUid
                );
                const directoryMeta = buildFriendRequestProfileSnapshotFromDirectoryEntry(
                    entry.directoryProfile,
                    requestMeta.accountId || requestIdentifier || requesterUid
                );
                const fallbackMeta = mergeFriendRequestProfileSnapshots(directoryMeta, requestMeta);
                const data = requesterDoc ? (requesterDoc.data() || {}) : {};
                const profile = data.profile || {};
                const fallbackIdentifier = requestIdentifier || requesterUid;
                const name = data.username
                    || profile.username
                    || fallbackMeta.username
                    || (data.accountId ? `ID: ${data.accountId}` : ((fallbackMeta.accountId || fallbackIdentifier) ? `ID: ${fallbackMeta.accountId || fallbackIdentifier}` : t("unknown_player")));
                const maxRankIndex = requesterDoc ? getRankIndex(data) : fallbackMeta.rankIndex;
                const rankName = RANK_NAMES[maxRankIndex] || RANK_NAMES[0];
                const rankStyle = getRankTextStyle(maxRankIndex);
                const picHtml = requesterDoc
                    ? buildFriendProfilePicHtml(profile)
                    : buildFriendProfilePicHtml({ pic: fallbackMeta.pic });
                const flag = requesterDoc ? profile.flag : fallbackMeta.flag;
                let flagHtml = "";
                if (flag) {
                    flagHtml = `<div style="width: 20px; height: 13px; background-image: url('${getFlagUrl(flag)}'); background-size: cover; background-position: center; border-radius: 2px; margin-left: 6px; flex-shrink: 0;"></div>`;
                }

                const item = document.createElement("div");
                item.className = "friend-item";
                item.style.cursor = "default";
                item.innerHTML = `
                    ${picHtml}
                    <div class="friend-info">
                        <div style="display: flex; align-items: center; margin-bottom: 2px;">
                            <div class="friend-name">${escapeHtml(name)}</div>
                            ${flagHtml}
                        </div>
                        <div class="friend-status" style="${rankStyle}">${rankName}</div>
                    </div>
                    <div class="friend-actions">
                        <button class="friend-request-btn accept">${t("accept")}</button>
                        <button class="friend-request-btn decline">${t("decline")}</button>
                    </div>
                `;

                item.addEventListener("click", (e) => e.stopPropagation());
                const acceptBtn = item.querySelector(".accept");
                const declineBtn = item.querySelector(".decline");
                let requestActionInFlight = false;
                const setButtonsDisabled = (disabled) => {
                    if (acceptBtn) acceptBtn.disabled = !!disabled;
                    if (declineBtn) declineBtn.disabled = !!disabled;
                };

                const runRequestAction = async (action, e) => {
                    if (e) {
                        e.preventDefault();
                        e.stopPropagation();
                    }
                    if (requestActionInFlight) return;
                    requestActionInFlight = true;
                    setButtonsDisabled(true);
                    try {
                        if (action === "accept") {
                            await FriendsService.acceptFriendRequest(user.uid, requesterUid);
                        } else {
                            await FriendsService.declineFriendRequest(user.uid, requesterUid);
                        }
                        removeRenderedRequest(requesterUid, requestIdentifier, item);
                        if (action === "accept") {
                            void loadFriendsList(options).catch((refreshErr) => {
                                console.error("Error refreshing friends list after acceptance:", refreshErr);
                            });
                            void loadRemoveFriendsList(options).catch((refreshErr) => {
                                console.error("Error refreshing remove-friends list after acceptance:", refreshErr);
                            });
                        }
                    } catch (e) {
                        if (action === "accept") {
                            console.error("Error accepting friend", e);
                        } else {
                            console.error("Error declining friend", e);
                        }
                        requestActionInFlight = false;
                        setButtonsDisabled(false);
                    }
                };

                if (acceptBtn) {
                    acceptBtn.addEventListener("click", (e) => runRequestAction("accept", e));
                    acceptBtn.addEventListener("pointerup", (e) => runRequestAction("accept", e));
                }
                if (declineBtn) {
                    declineBtn.addEventListener("click", (e) => runRequestAction("decline", e));
                    declineBtn.addEventListener("pointerup", (e) => runRequestAction("decline", e));
                }

                friendRequestsList.appendChild(item);
            });

            if (!friendRequestsList.children.length) {
                renderEmptyState();
            }
        };

        if (deferRender) return render;
        render();
    } catch (e) {
        console.error("Error loading requests", e);
        const renderError = () => {
            friendRequestsList.innerHTML = `<div style="color:#ff6666; text-align:center; padding:20px;">${t("friend_requests_error_loading")}</div>`;
        };
        if (deferRender) return renderError;
        renderError();
    }
}

export async function loadRemoveFriendsList(options = {}) {
    const removeFriendsList = options.removeFriendsList || getCachedElementById("removeFriendsList");
    const user = auth.currentUser;
    if (!user || !removeFriendsList) return;

    setLoading(removeFriendsList);

    try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.exists() ? (userDoc.data() || {}) : {};
        const storedFriends = normalizeFriendRequestIds(userData.friends).filter((uid) => typeof uid === "string" && uid.trim() !== "");
        const currentProfile = userData && typeof userData.profile === "object" && userData.profile ? userData.profile : {};
        const currentUserAccountId = typeof userData.accountId === "string" && userData.accountId.trim() !== ""
            ? userData.accountId.trim()
            : (typeof currentProfile.accountId === "string" ? currentProfile.accountId.trim() : "");
        let friends = [];
        let edgeFriends = [];
        const friendshipProfileByUid = new Map();
        try {
            const friendshipDocs = await FriendsService.listFriendships(user.uid);
            edgeFriends = normalizeFriendRequestIds(friendshipDocs.map((snap) => {
                const data = snap.data() || {};
                const users = Array.isArray(data.users) ? data.users : [];
                const friendUid = users.find((uidValue) => typeof uidValue === "string" && uidValue.trim() !== "" && uidValue !== user.uid) || "";
                if (friendUid && !friendshipProfileByUid.has(friendUid)) {
                    friendshipProfileByUid.set(
                        friendUid,
                        buildFriendRequestProfileSnapshotFromFriendshipEntry(data, friendUid, friendUid)
                    );
                }
                return friendUid;
            }));
        } catch (e) {
            console.error("Error loading remove-friends edges:", e);
        }
        friends = normalizeFriendRequestIds([...storedFriends, ...edgeFriends]);
        if (edgeFriends.length) {
            await selfHealAcceptedFriends(user.uid, edgeFriends);
        }

        if (friends.length === 0) {
            removeFriendsList.innerHTML = `<div style="color:#888; text-align:center; padding:20px;">${t("remove_friends_none")}</div>`;
            return;
        }

        const friendDocResults = await Promise.allSettled(
            friends.map(async (identifier) => {
                const normalizedIdentifier = typeof identifier === "string" ? identifier.trim() : "";
                const snap = await UserService.resolveUserDocByIdentifier(normalizedIdentifier);
                const resolvedUid = snap && snap.exists()
                    ? snap.id
                    : await resolveUserUidByAccountId(normalizedIdentifier);
                return {
                    identifier: normalizedIdentifier,
                    snap: snap && snap.exists() ? snap : null,
                    resolvedUid: typeof resolvedUid === "string" ? resolvedUid.trim() : "",
                    friendshipProfile: friendshipProfileByUid.get((typeof resolvedUid === "string" ? resolvedUid.trim() : "") || normalizedIdentifier) || null
                };
            })
        );

        removeFriendsList.innerHTML = "";
        const renderedFriendUids = new Set();
        friendDocResults.forEach((result) => {
            if (result.status !== "fulfilled") return;
            const friendIdentifier = typeof result.value.identifier === "string" ? result.value.identifier.trim() : "";
            const friendDoc = result.value.snap;
            const friendUid = typeof result.value.resolvedUid === "string" && result.value.resolvedUid.trim() !== ""
                ? result.value.resolvedUid.trim()
                : friendIdentifier;
            if (!friendUid || renderedFriendUids.has(friendUid)) return;
            renderedFriendUids.add(friendUid);

            const data = friendDoc ? (friendDoc.data() || {}) : {};
            const profile = data && typeof data.profile === "object" && data.profile ? data.profile : {};
            const friendshipMeta = normalizeFriendRequestProfileSnapshot(
                result.value.friendshipProfile,
                friendIdentifier || friendUid
            );
            const name = data.username || profile.username || friendshipMeta.username || t("unknown_player");
            const maxRankIndex = friendDoc ? getRankIndex(data) : friendshipMeta.rankIndex;
            const rankName = RANK_NAMES[maxRankIndex] || RANK_NAMES[0];
            const rankStyle = getRankTextStyle(maxRankIndex);
            const picHtml = friendDoc
                ? buildFriendProfilePicHtml(profile)
                : buildFriendProfilePicHtml({ pic: friendshipMeta.pic });

            const flag = friendDoc ? profile.flag : friendshipMeta.flag;
            let flagHtml = "";
            if (flag) {
                flagHtml = `<div style="width: 20px; height: 13px; background-image: url('${getFlagUrl(flag)}'); background-size: cover; background-position: center; border-radius: 2px; margin-left: 6px; flex-shrink: 0;"></div>`;
            }

            const item = document.createElement("div");
            item.className = "friend-item";
            item.style.cursor = "default";
            item.innerHTML = `
                ${picHtml}
                <div class="friend-info">
                    <div style="display: flex; align-items: center; margin-bottom: 2px;">
                        <div class="friend-name" style="line-height: 1;">${escapeHtml(name)}</div>
                        ${flagHtml}
                    </div>
                    <div class="friend-status" style="${rankStyle}">${rankName}</div>
                </div>
                <div class="friend-actions">
                    <button
                        class="friend-request-btn decline"
                        type="button"
                        style="padding: 6px 12px;"
                    >${t("remove")}</button>
                </div>
            `;

            const removeBtn = item.querySelector(".decline");
            if (removeBtn) {
                removeBtn.addEventListener("click", (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (removeBtn.disabled) return;

                    showRemoveFriendConfirmModal(
                        t("remove_friend_title"),
                        tf("remove_friend_confirm", { name }),
                        async () => {
                            removeBtn.disabled = true;
                            try {
                                await FriendsService.removeFriend(user.uid, friendUid, {
                                    friendAliases: [friendIdentifier, friendAccountId],
                                    currentUserAliases: [currentUserAccountId]
                                });
                                await loadRemoveFriendsList(options);
                            } catch (err) {
                                console.error("Error removing friend:", err);
                                alert(t("remove_friend_failed"));
                                removeBtn.disabled = false;
                            }
                        }
                    );
                });
            }

            removeFriendsList.appendChild(item);
        });

        if (!removeFriendsList.children.length) {
            removeFriendsList.innerHTML = `<div style="color:#888; text-align:center; padding:20px;">${t("remove_friends_none")}</div>`;
        }
    } catch (e) {
        console.error("Error loading remove friends list", e);
        removeFriendsList.innerHTML = `<div style="color:#ff6666; text-align:center; padding:20px;">${t("friends_error_loading")}</div>`;
    }
}

export async function loadSentFriendRequests(options = {}) {
    const sentRequestsList = options.sentRequestsList || getCachedElementById("sentRequestsList");
    const user = auth.currentUser;
    if (!user || !sentRequestsList) return;
    const deferRender = !!options.deferRender;

    if (!deferRender) setLoading(sentRequestsList);

    try {
        let sentRequests = [];
        let requestDocs = [];
        try {
            requestDocs = await FriendsService.listSentFriendRequests(user.uid);
            sentRequests = normalizeFriendRequestIds(requestDocs.map((snap) => {
                const data = snap.data() || {};
                return typeof data.toUid === "string" ? data.toUid : "";
            }));
        } catch (e) {
            console.error("Error loading sent request edges:", e);
        }
        if (!sentRequests.length) {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            sentRequests = normalizeFriendRequestIds((userDoc.data() || {}).sentFriendRequests || []);
        }

        if (sentRequests.length) {
            const statusResults = await Promise.all(sentRequests.map(async (targetUid) => {
                const [isFriend, requestDoc] = await Promise.all([
                    FriendsService.areFriends(user.uid, targetUid),
                    FriendsService.getFriendRequestDocument(user.uid, targetUid)
                ]);
                return {
                    targetUid,
                    isFriend,
                    keep: !isFriend && !!(requestDoc && requestDoc.exists())
                };
            }));

            const acceptedSentRequests = statusResults
                .filter((entry) => entry.isFriend)
                .map((entry) => entry.targetUid);
            if (acceptedSentRequests.length) {
                selfHealAcceptedFriends(user.uid, acceptedSentRequests).catch((err) => {
                    console.warn("Unable to self-heal accepted sent friend requests:", err);
                });
            }

            const staleSentRequests = statusResults
                .filter((entry) => !entry.keep && !entry.isFriend)
                .map((entry) => entry.targetUid);
            if (staleSentRequests.length) {
                FriendsService.pruneSentFriendRequests(user.uid, staleSentRequests).catch((err) => {
                    console.warn("Unable to prune stale sent friend requests:", err);
                });
            }
            sentRequests = statusResults
                .filter((entry) => entry.keep)
                .map((entry) => entry.targetUid);
        }
        const requestDocByToUid = new Map();
        requestDocs.forEach((snap) => {
            const data = snap.data() || {};
            const toUid = typeof data.toUid === "string" ? data.toUid.trim() : "";
            if (!toUid || requestDocByToUid.has(toUid)) return;
            requestDocByToUid.set(toUid, data);
        });

        let targetEntries = [];
        if (sentRequests.length) {
            const docsResult = await Promise.allSettled(
                sentRequests.map(async (identifier) => {
                    const normalizedIdentifier = typeof identifier === "string" ? identifier.trim() : "";
                    let targetUid = normalizedIdentifier;
                    let snap = normalizedIdentifier
                        ? await UserService.resolveUserDocByIdentifier(normalizedIdentifier)
                        : null;

                    if ((!snap || !snap.exists()) && normalizedIdentifier) {
                        const resolvedUid = await resolveUserUidByAccountId(normalizedIdentifier);
                        if (resolvedUid) {
                            targetUid = resolvedUid;
                            snap = await UserService.resolveUserDocByIdentifier(resolvedUid);
                        }
                    }

                    const directoryProfile = (!snap || !snap.exists())
                        ? await resolveDirectoryRequestProfile({
                            accountId: normalizedIdentifier,
                            uid: targetUid || normalizedIdentifier
                        })
                        : null;

                    return {
                        identifier: normalizedIdentifier,
                        targetUid,
                        targetDoc: snap && snap.exists() ? snap : null,
                        directoryProfile
                    };
                })
            );
            targetEntries = docsResult
                .map((entry) => (entry.status === "fulfilled" ? entry.value : null))
                .filter((entry) => entry && (entry.targetUid || entry.identifier));
        }

        const renderSentEmptyState = () => {
            sentRequestsList.innerHTML = `<div style="color:#888; text-align:center; padding:10px 20px;">${t("sent_requests_none")}</div>`;
        };

        const removeRenderedSentRequest = (targetUid, requestIdentifier, item) => {
            sentRequests = sentRequests.filter((uid) => uid !== targetUid && uid !== requestIdentifier);
            targetEntries = targetEntries.filter((entry) => entry.targetUid !== targetUid && entry.identifier !== requestIdentifier);
            if (item && item.parentNode === sentRequestsList) {
                item.remove();
            }
            if (!sentRequests.length) {
                renderSentEmptyState();
            }
        };

        const render = () => {
            if (!sentRequests.length) {
                renderSentEmptyState();
                return;
            }

            sentRequestsList.innerHTML = "";

            targetEntries.forEach((entry) => {
                const targetDoc = entry.targetDoc;
                const targetUid = entry.targetUid || entry.identifier;
                const requestIdentifier = entry.identifier;
                if (!targetUid) return;
                const requestMeta = normalizeFriendRequestProfileSnapshot(
                    (requestDocByToUid.get(targetUid) || requestDocByToUid.get(requestIdentifier || targetUid))?.toProfile,
                    requestIdentifier || targetUid
                );
                const directoryMeta = buildFriendRequestProfileSnapshotFromDirectoryEntry(
                    entry.directoryProfile,
                    requestMeta.accountId || requestIdentifier || targetUid
                );
                const fallbackMeta = mergeFriendRequestProfileSnapshots(directoryMeta, requestMeta);
                const data = targetDoc ? (targetDoc.data() || {}) : {};
                const profile = data && typeof data.profile === "object" && data.profile ? data.profile : {};
                const fallbackIdentifier = requestIdentifier || targetUid;
                const name = data.username
                    || profile.username
                    || fallbackMeta.username
                    || (data.accountId ? `ID: ${data.accountId}` : ((fallbackMeta.accountId || fallbackIdentifier) ? `ID: ${fallbackMeta.accountId || fallbackIdentifier}` : t("unknown_player")));
                const maxRankIndex = targetDoc ? getRankIndex(data) : fallbackMeta.rankIndex;
                const rankName = RANK_NAMES[maxRankIndex] || RANK_NAMES[0];
                const rankStyle = getRankTextStyle(maxRankIndex);
                const picHtml = targetDoc
                    ? buildFriendProfilePicHtml(profile)
                    : buildFriendProfilePicHtml({ pic: fallbackMeta.pic });

                const flag = targetDoc ? profile.flag : fallbackMeta.flag;
                let flagHtml = "";
                if (flag) {
                    flagHtml = `<div style="width: 20px; height: 13px; background-image: url('${getFlagUrl(flag)}'); background-size: cover; background-position: center; border-radius: 2px; margin-left: 6px; flex-shrink: 0;"></div>`;
                }

                const item = document.createElement("div");
                item.className = "friend-item";
                item.style.cursor = "default";
                item.innerHTML = `
                    ${picHtml}
                    <div class="friend-info">
                        <div style="display: flex; align-items: center; margin-bottom: 2px;">
                            <div class="friend-name" style="line-height: 1;">${escapeHtml(name)}</div>
                            ${flagHtml}
                        </div>
                        <div class="friend-status" style="${rankStyle}">${rankName}</div>
                    </div>
                    <div class="friend-actions">
                        <button class="friend-request-btn decline" type="button">${t("cancel")}</button>
                    </div>
                `;

                item.addEventListener("click", (e) => {
                    e.stopPropagation();
                });
                const cancelBtn = item.querySelector(".decline");
                let cancelInFlight = false;
                const handleCancelClick = async (e) => {
                    if (e) {
                        e.preventDefault();
                        e.stopPropagation();
                    }
                    if (cancelInFlight) return;
                    cancelInFlight = true;
                    if (cancelBtn) cancelBtn.disabled = true;
                    try {
                        await FriendsService.cancelFriendRequest(user.uid, targetUid);
                        removeRenderedSentRequest(targetUid, requestIdentifier, item);
                    } catch (e) {
                        console.error("Error cancelling request:", e);
                        if (cancelBtn) cancelBtn.disabled = false;
                        cancelInFlight = false;
                    }
                };
                if (cancelBtn) {
                    cancelBtn.addEventListener("click", handleCancelClick);
                    cancelBtn.addEventListener("pointerup", handleCancelClick);
                }

                sentRequestsList.appendChild(item);
            });

            if (!sentRequestsList.children.length) {
                renderSentEmptyState();
            }
        };

        if (deferRender) return render;
        render();
    } catch (e) {
        console.error("Error loading sent requests", e);
        const renderError = () => {
            sentRequestsList.innerHTML = `<div style="color:#ff6666; text-align:center; padding:20px;">${t("sent_requests_error_loading")}</div>`;
        };
        if (deferRender) return renderError;
        renderError();
    }
}

export async function loadFriendRequestsTab(options = {}) {
    const friendRequestsList = options.friendRequestsList || getCachedElementById("friendRequestsList");
    const sentRequestsList = options.sentRequestsList || getCachedElementById("sentRequestsList");
    if (friendRequestsList) setLoading(friendRequestsList);
    if (sentRequestsList) setLoading(sentRequestsList);

    const [incomingRender, sentRender] = await Promise.all([
        loadFriendRequests({ ...options, friendRequestsList, deferRender: true }),
        loadSentFriendRequests({ ...options, sentRequestsList, deferRender: true })
    ]);

    if (typeof incomingRender === "function") incomingRender();
    if (typeof sentRender === "function") sentRender();
}

export async function addFriendByAccountId(options = {}) {
    const friendIdInput = options.friendIdInput || getCachedElementById("friendIdInput");
    const addFriendBtn = options.addFriendBtn || getCachedElementById("addFriendBtn");
    const addFriendMessage = options.addFriendMessage || getCachedElementById("addFriendMessage");
    const sentRequestsList = options.sentRequestsList || getCachedElementById("sentRequestsList");
    const tabFriendRequests = options.tabFriendRequests || getCachedElementById("tabFriendRequests");
    const getAddFriendTimeout = typeof options.getAddFriendTimeout === "function" ? options.getAddFriendTimeout : () => null;
    const setAddFriendTimeout = typeof options.setAddFriendTimeout === "function" ? options.setAddFriendTimeout : () => {};

    const user = auth.currentUser;
    if (!user || !friendIdInput || !addFriendBtn || !addFriendMessage) return;

    const rawId = friendIdInput.value.trim();
    if (!rawId) return;

    addFriendBtn.disabled = true;
    setHidden(addFriendMessage, true);

    try {
        const currentUserDoc = await UserService.getUserDocument(user.uid);
        const currentData = currentUserDoc && currentUserDoc.exists() ? (currentUserDoc.data() || {}) : {};

        const friendUid = await resolveUserUidByAccountId(rawId);
        if (!friendUid) {
            addFriendMessage.textContent = t("add_friend_user_not_found");
            addFriendMessage.style.color = "#ff6666";
            setHidden(addFriendMessage, false);
            return;
        }
        const currentFriends = normalizeFriendRequestIds(currentData.friends || []);
        const legacySentRequests = normalizeFriendRequestIds(currentData.sentFriendRequests || []);
        const legacyReceivedRequests = normalizeFriendRequestIds(currentData.friendRequests || []);
        const friendshipExists = await FriendsService.areFriends(user.uid, friendUid);
        const sentRequestDoc = await FriendsService.getFriendRequestDocument(user.uid, friendUid);
        const receivedRequestDoc = await FriendsService.getFriendRequestDocument(friendUid, user.uid);
        const hasSentRequest = !!(sentRequestDoc && sentRequestDoc.exists());
        const hasReceivedRequest = !!(receivedRequestDoc && receivedRequestDoc.exists());

        if (friendUid === user.uid) {
            addFriendMessage.textContent = t("add_friend_self");
            addFriendMessage.style.color = "#ff6666";
            setHidden(addFriendMessage, false);
        } else if (friendshipExists || currentFriends.includes(friendUid)) {
            addFriendMessage.textContent = t("add_friend_already_friends");
            addFriendMessage.style.color = "#ff6666";
            setHidden(addFriendMessage, false);
        } else if (hasSentRequest || legacySentRequests.includes(friendUid)) {
            addFriendMessage.textContent = t("add_friend_already_sent");
            addFriendMessage.style.color = "#ffcc00";
            setHidden(addFriendMessage, false);
        } else if (hasReceivedRequest || legacyReceivedRequests.includes(friendUid)) {
            addFriendMessage.textContent = t("add_friend_check_requests");
            addFriendMessage.style.color = "#ffcc00";
            setHidden(addFriendMessage, false);
        } else {
            const targetUserDoc = await UserService.resolveUserDocByIdentifier(friendUid);
            const targetData = targetUserDoc && targetUserDoc.exists() ? (targetUserDoc.data() || {}) : {};
            const targetDirectoryProfile = (!targetUserDoc || !targetUserDoc.exists())
                ? await resolveDirectoryRequestProfile({ accountId: rawId, uid: friendUid })
                : null;
            await FriendsService.sendFriendRequest(user.uid, friendUid, {
                fromProfile: buildFriendRequestProfileSnapshot(currentData),
                toProfile: (targetUserDoc && targetUserDoc.exists())
                    ? buildFriendRequestProfileSnapshot(targetData, rawId)
                    : mergeFriendRequestProfileSnapshots(
                        buildFriendRequestProfileSnapshotFromDirectoryEntry(targetDirectoryProfile, rawId),
                        { accountId: rawId }
                    )
            });
            addFriendMessage.textContent = t("add_friend_sent");
            addFriendMessage.style.color = "#4caf50";
            setHidden(addFriendMessage, false);
            friendIdInput.value = "";

            if (sentRequestsList) {
                loadSentFriendRequests({ ...options, sentRequestsList }).catch((err) => {
                    console.error("Error refreshing sent requests list:", err);
                });
            }

            const existing = getAddFriendTimeout();
            if (existing) clearTimeout(existing);
            const timeoutId = setTimeout(() => {
                setHidden(addFriendMessage, true);
            }, 5000);
            setAddFriendTimeout(timeoutId);
        }
    } catch (e) {
        console.error("Error adding friend:", e);
        addFriendMessage.textContent = t("add_friend_error");
        addFriendMessage.style.color = "#ff6666";
        setHidden(addFriendMessage, false);
    } finally {
        addFriendBtn.disabled = false;
    }
}
