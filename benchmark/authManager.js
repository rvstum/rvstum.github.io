import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { auth } from "./client.js";
import { state, getRuntimeAccountId } from "./appState.js";
import { normalizeFriendRequestIds } from "./utils.js";
import { getCachedElementById, getCachedQuery } from "./utils/domUtils.js";
import {
    readString,
    writeString,
    readJson,
    writeJson,
    removeItem,
    LANGUAGE_STORAGE_KEY,
    VISIBILITY_STORAGE_KEY,
    SCORE_STORAGE_KEY,
    CAVE_LINKS_STORAGE_KEY,
    SCORE_UPDATED_AT_STORAGE_KEY,
    VIEWED_REQUESTS_STORAGE_PREFIX,
    ACHIEVEMENTS_STORAGE_KEY,
    THEME_STORAGE_KEY,
    THEME_USER_SELECTED_STORAGE_KEY,
    DEFAULT_CONFIG_STORAGE_KEY,
    CACHED_VIEWS_STORAGE_KEY,
    SEASONAL_TROPHIES_STORAGE_KEY,
    PROFILE_PIC_STORAGE_KEY,
    PROFILE_PIC_ORIGINAL_STORAGE_KEY,
    PROFILE_PIC_STATE_STORAGE_KEY,
    COUNTRY_FLAG_STORAGE_KEY,
    GUILDS_STORAGE_KEY,
    THEME_UNLOCK_STORAGE_KEY,
    AUTO_RANK_THEME_STORAGE_KEY,
    CONFIG_THEMES_STORAGE_KEY
} from "./storage.js";
import * as Slugs from "./slugs.js?v=20260309-public-view-fix-1";
import * as UserService from "./userService.js?v=20260309-remove-highlights-1";
import * as ScoreManager from "./scoreManager.js?v=20260309-view-mode-rank-trophy-fix-2";
import * as ThemeUI from "./themeUI.js?v=20260308-cave-save-btn-dark-3";
import * as ProfileUI from "./profileUI.js?v=20260309-remove-highlights-1";
import * as TrophyUI from "./trophyUI.js?v=20260309-view-mode-asset-fix-1";
import * as AchievementsUI from "./achievementsUI.js?v=20260304-achievements-6k";
import { persistUserData } from "./persistence.js";

export function waitForAuthInitialization(authInstance = auth) {
    return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(authInstance, (user) => {
            unsubscribe();
            resolve(user || null);
        });
    });
}

function getViewedFriendRequestsStorageKey(uid) {
    return `${VIEWED_REQUESTS_STORAGE_PREFIX}_${uid}`;
}

function readViewedFriendRequests(uid) {
    if (!uid) return [];
    const parsed = readJson(getViewedFriendRequestsStorageKey(uid), []);
    return Array.isArray(parsed)
        ? parsed.filter((value) => typeof value === "string" && value.trim() !== "")
        : [];
}

function writeViewedFriendRequests(uid, requests) {
    if (!uid) return;
    const normalized = [...new Set((Array.isArray(requests) ? requests : []).filter((value) => typeof value === "string" && value.trim() !== ""))];
    writeJson(getViewedFriendRequestsStorageKey(uid), normalized);
}

function refreshPendingRequestState(uid, currentRequests) {
    const viewed = readViewedFriendRequests(uid);
    const requestSet = new Set(currentRequests);
    const pruned = viewed.filter((uidValue) => requestSet.has(uidValue));
    if (pruned.length !== viewed.length) {
        writeViewedFriendRequests(uid, pruned);
    }
    const viewedSet = new Set(pruned);
    state.hasPendingRequests = currentRequests.some((requestUid) => !viewedSet.has(requestUid));
}

export function syncFriendRequestState(uid, requests, requestsTabActive) {
    const normalized = normalizeFriendRequestIds(requests);
    state.currentFriendRequests = normalized;
    if (!uid) return normalized;
    if (requestsTabActive) {
        writeViewedFriendRequests(uid, normalized);
        state.hasPendingRequests = false;
    } else {
        refreshPendingRequestState(uid, normalized);
    }
    return normalized;
}

export function markCurrentFriendRequestsViewed() {
    const user = auth.currentUser;
    if (!user) return;
    writeViewedFriendRequests(user.uid, state.currentFriendRequests || []);
    state.hasPendingRequests = false;
}

export async function loadUserProfile(user, hooks = {}) {
    const {
        initOnboarding = () => {},
        applyLanguage = () => {},
        applyConfig = () => {},
        syncSettingsUI = () => {},
        syncPacmanUI = () => {},
        applyActiveAccountId = () => {},
        rememberAccountIdForUid = () => {},
        getRememberedAccountIdForUid = () => null,
        generateAccountId = () => null
    } = hooks;
    const sessionUid = user && user.uid ? user.uid : "";
    const isStaleAuthSession = () => {
        const activeUid = auth.currentUser && auth.currentUser.uid ? auth.currentUser.uid : "";
        return !sessionUid || activeUid !== sessionUid;
    };

    if (isStaleAuthSession()) return;

    try {
        const docSnap = await UserService.getUserDocument(sessionUid);
        if (isStaleAuthSession()) return;
        if (!docSnap.exists()) return;

        const data = docSnap.data();
        ProfileUI.setCurrentUserEmail(user.email || "");
        const shouldInitOnboarding = !!data.isNewUser;
        let didApplyConfig = false;

        if (!data.username && user.displayName) {
            await UserService.updateUserData(
                sessionUid,
                { username: user.displayName },
                { merge: true }
            );
            if (isStaleAuthSession()) return;
        }

        const username = data.username || user.displayName;
        if (username) {
            const usernameInput = getCachedElementById("profileUsernameInput");
            if (usernameInput) usernameInput.value = username;
            const profileName = getCachedQuery("profileName", () => document.querySelector(".profile-name"));
            if (profileName) profileName.textContent = username;
            const userMenuName = getCachedElementById("userMenuUsername");
            if (userMenuName) userMenuName.textContent = username;
            ProfileUI.syncUserMenuDropdownWidth();
        }

        if (data.profile) {
            if (data.profile.guilds) writeJson(GUILDS_STORAGE_KEY, data.profile.guilds);
            if (data.profile.flag) writeString(COUNTRY_FLAG_STORAGE_KEY, data.profile.flag);
            else removeItem(COUNTRY_FLAG_STORAGE_KEY);

            if (data.profile.pic) writeString(PROFILE_PIC_STORAGE_KEY, data.profile.pic);
            else removeItem(PROFILE_PIC_STORAGE_KEY);

            if (data.profile.originalPic) writeString(PROFILE_PIC_ORIGINAL_STORAGE_KEY, data.profile.originalPic);
            else removeItem(PROFILE_PIC_ORIGINAL_STORAGE_KEY);

            if (data.profile.cropState) writeJson(PROFILE_PIC_STATE_STORAGE_KEY, data.profile.cropState);
            else removeItem(PROFILE_PIC_STATE_STORAGE_KEY);

            ProfileUI.updateMainPageGuildDisplay();
            ProfileUI.updateMainHeaderLayout();

            const viewCountEl = getCachedElementById("viewCount");
            if (viewCountEl) {
                const views = data.profile.views || 0;
                viewCountEl.textContent = views.toLocaleString();
                writeString(CACHED_VIEWS_STORAGE_KEY, views);
            }

            if (data.profile.trophies) {
                writeJson(SEASONAL_TROPHIES_STORAGE_KEY, data.profile.trophies);
            } else {
                removeItem(SEASONAL_TROPHIES_STORAGE_KEY);
            }
            TrophyUI.renderTrophies();

            if (data.achievements) {
                state.userAchievements = data.achievements;
                writeJson(ACHIEVEMENTS_STORAGE_KEY, state.userAchievements);
            } else {
                state.userAchievements = {};
                removeItem(ACHIEVEMENTS_STORAGE_KEY);
            }
            AchievementsUI.updateAchievementsProgress();
        }

        const directoryPreviewData = {
            ...(data && typeof data === "object" ? data : {}),
            username: (data && typeof data.username === "string" && data.username.trim() !== "")
                ? data.username
                : (user.displayName || "")
        };

        if (data.accountId) {
            const stableId = data.accountId;
            applyActiveAccountId(stableId);
            rememberAccountIdForUid(sessionUid, stableId);
            UserService.syncAccountDirectoryEntry(sessionUid, stableId, {
                ...directoryPreviewData,
                accountId: stableId
            }).catch((err) => {
                console.error("Error syncing account directory entry:", err);
            });
        } else {
            const rememberedId = getRememberedAccountIdForUid(sessionUid);
            const stableId = rememberedId || getRuntimeAccountId() || generateAccountId();
            applyActiveAccountId(stableId);
            rememberAccountIdForUid(sessionUid, stableId);
            await persistUserData({ accountId: stableId }, { label: "account id" });
            if (isStaleAuthSession()) return;
            UserService.syncAccountDirectoryEntry(sessionUid, stableId, {
                ...directoryPreviewData,
                accountId: stableId
            }).catch((err) => {
                console.error("Error syncing account directory entry:", err);
            });
        }

        {
            const effectiveUsername = data.username || user.displayName || "";
            const desiredSlug = Slugs.resolveProfileSlug(data || {}, {
                usernameFallback: effectiveUsername,
                accountIdFallback: getRuntimeAccountId(),
                uid: sessionUid
            });
            if (effectiveUsername && desiredSlug && data.publicSlug !== desiredSlug) {
                await persistUserData({ publicSlug: desiredSlug }, { label: "profile slug" });
                if (isStaleAuthSession()) return;
            }
        }

        if (data.settings) {
            if (data.settings.language) {
                writeString(LANGUAGE_STORAGE_KEY, data.settings.language);
                applyLanguage(data.settings.language, false);
            }
            if (data.settings.theme) {
                writeString(THEME_STORAGE_KEY, data.settings.theme);
                if (data.settings.theme !== "default") writeString(THEME_USER_SELECTED_STORAGE_KEY, "true");
                await ThemeUI.applyTheme(data.settings.theme, false);
                if (isStaleAuthSession()) return;
            }
            if (data.settings.autoRankTheme) {
                writeString(AUTO_RANK_THEME_STORAGE_KEY, data.settings.autoRankTheme);
                ThemeUI.loadAutoRankThemeSetting();
                ThemeUI.syncAutoRankThemeUI();
            }
            if (data.settings.visibility) {
                writeString(VISIBILITY_STORAGE_KEY, data.settings.visibility);
                const visibilitySelect = getCachedElementById("visibilitySelect");
                if (visibilitySelect) visibilitySelect.value = data.settings.visibility;
            }
            if (data.settings.defaultConfig) {
                writeJson(DEFAULT_CONFIG_STORAGE_KEY, data.settings.defaultConfig);
                applyConfig(data.settings.defaultConfig, { skipSaveCurrent: true });
                syncSettingsUI();
                didApplyConfig = true;
            }
            if (data.settings.rankThemeUnlock) {
                writeString(THEME_UNLOCK_STORAGE_KEY, data.settings.rankThemeUnlock);
                ThemeUI.loadRankThemeUnlock();
                ThemeUI.updateThemeButtons();
            }

            if (data.settings.customTheme) {
                const ct = data.settings.customTheme;
                if (Object.prototype.hasOwnProperty.call(ct, "enabled")) ThemeUI.setCustomThemeEnabled(ct.enabled === "true");
                if (typeof ct.name === "string") ThemeUI.setCustomThemeName(ct.name);
                if (ct.hex && typeof ct.hex === "object") ThemeUI.setCustomThemeHex(ct.hex);
                if (Array.isArray(ct.saved)) ThemeUI.setSavedCustomThemes(ct.saved);
                ThemeUI.saveCustomThemeState();
                ThemeUI.saveCustomThemeHex();
                ThemeUI.saveSavedCustomThemes();
                ThemeUI.updateCustomSwatches(ThemeUI.applyTheme);
                ThemeUI.updateCustomThemeUI(ThemeUI.applyTheme);
                if (ThemeUI.getCurrentTheme() === "custom") await ThemeUI.applyTheme("custom", false);
            }

            state.pacmanModeEnabled = data.settings.pacmanMode === "true";
            syncPacmanUI();
        }

        if (!didApplyConfig) {
            const fallbackStoredConfig = readJson(DEFAULT_CONFIG_STORAGE_KEY, null);
            const fallbackConfig = fallbackStoredConfig && typeof fallbackStoredConfig === "object"
                ? fallbackStoredConfig
                : {
                    platform: "Mobile",
                    time: "5 Min",
                    stat: "Baddy Kills",
                    mount: "mountspeed1"
                };
            applyConfig(fallbackConfig, { skipSaveCurrent: true });
            syncSettingsUI();
        }

        if (shouldInitOnboarding) {
            initOnboarding();
        }

        if (data.scores && typeof data.scores === "object") {
            const localScoresUpdatedAt = Number(readString(SCORE_UPDATED_AT_STORAGE_KEY, "0") || 0);
            const remoteScoresUpdatedAt = Number(data.scoresUpdatedAt || 0);
            const localHasScores = state.savedScores && Object.keys(state.savedScores).length > 0;
            let useRemoteScores = false;
            if (!localHasScores) {
                useRemoteScores = true;
            } else if (localScoresUpdatedAt > 0 && remoteScoresUpdatedAt > 0) {
                useRemoteScores = remoteScoresUpdatedAt > localScoresUpdatedAt;
            } else if (localScoresUpdatedAt <= 0 && remoteScoresUpdatedAt <= 0) {
                useRemoteScores = false;
            } else if (localScoresUpdatedAt > 0 && remoteScoresUpdatedAt <= 0) {
                useRemoteScores = false;
            } else {
                useRemoteScores = false;
            }

            if (useRemoteScores) {
                state.savedScores = data.scores;
                writeJson(SCORE_STORAGE_KEY, state.savedScores);
                if (remoteScoresUpdatedAt > 0) {
                    writeString(SCORE_UPDATED_AT_STORAGE_KEY, String(remoteScoresUpdatedAt));
                }
            } else if (localScoresUpdatedAt > remoteScoresUpdatedAt && !state.isViewMode) {
                clearTimeout(state.saveScoresDebounceTimer);
                state.saveScoresDebounceTimer = setTimeout(() => {
                    ScoreManager.saveSavedScores();
                }, 50);
            }
            ScoreManager.loadScores();
            ThemeUI.validateRankUnlock();
        }

        if (data.configThemes) {
            state.savedConfigThemes = data.configThemes;
            writeJson(CONFIG_THEMES_STORAGE_KEY, state.savedConfigThemes);
        }

        if (data.caveLinks) {
            state.savedCaveLinks = data.caveLinks;
            writeJson(CAVE_LINKS_STORAGE_KEY, state.savedCaveLinks);
            ScoreManager.loadCaveLinks();
        }
    } catch (e) {
        console.error("Error loading user data:", e);
    }
}
