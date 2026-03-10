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
    CONFIG_THEMES_STORAGE_KEY,
    SUB_INPUT_MODE_STORAGE_KEY
} from "./storage.js?v=20260310-sub-score-input-3";
import * as Slugs from "./slugs.js?v=20260310-public-slug-directory-1";
import * as UserService from "./userService.js?v=20260310-public-slug-directory-1";
import * as ScoreManager from "./scoreManager.js?v=20260310-score-save-fix-18";
import * as ThemeUI from "./themeUI.js?v=20260310-reset-theme-fix-1";
import * as ProfileUI from "./profileUI.js?v=20260310-profile-save-fix-2";
import * as TrophyUI from "./trophyUI.js?v=20260309-view-mode-asset-fix-1";
import * as AchievementsUI from "./achievementsUI.js?v=20260304-achievements-6k";
import { persistUserData } from "./persistence.js";

const SCORE_RESET_PENDING_STORAGE_KEY = "benchmark_score_reset_pending";

function summarizeScoresRecord(record) {
    const safeRecord = record && typeof record === "object" ? record : {};
    let configCount = 0;
    let nonZeroConfigCount = 0;
    let nonZeroEntries = 0;
    let totalSum = 0;

    Object.values(safeRecord).forEach((scores) => {
        if (!Array.isArray(scores)) return;
        configCount += 1;
        let configHasNonZero = false;
        scores.forEach((value) => {
            const numeric = Number(value) || 0;
            totalSum += numeric;
            if (numeric > 0) {
                nonZeroEntries += 1;
                configHasNonZero = true;
            }
        });
        if (configHasNonZero) {
            nonZeroConfigCount += 1;
        }
    });

    return {
        configCount,
        nonZeroConfigCount,
        nonZeroEntries,
        totalSum
    };
}

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
    const isLocalDebugHost = (() => {
        try {
            const host = window.location && window.location.hostname ? window.location.hostname : "";
            return host === "localhost" || host === "127.0.0.1";
        } catch (_) {
            return false;
        }
    })();

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
            const incomingProfilePic = typeof data.profile.pic === "string" ? data.profile.pic : "";
            const existingLocalProfilePic = readString(PROFILE_PIC_STORAGE_KEY, "");
            const existingLocalOriginalPic = readString(PROFILE_PIC_ORIGINAL_STORAGE_KEY, "");
            const hasRemoteOriginalPic = Object.prototype.hasOwnProperty.call(data.profile, "originalPic");

            if (data.profile.guilds) writeJson(GUILDS_STORAGE_KEY, data.profile.guilds);
            if (data.profile.flag) writeString(COUNTRY_FLAG_STORAGE_KEY, data.profile.flag);
            else removeItem(COUNTRY_FLAG_STORAGE_KEY);

            if (incomingProfilePic) writeString(PROFILE_PIC_STORAGE_KEY, incomingProfilePic);
            else removeItem(PROFILE_PIC_STORAGE_KEY);

            if (hasRemoteOriginalPic) {
                if (data.profile.originalPic) writeString(PROFILE_PIC_ORIGINAL_STORAGE_KEY, data.profile.originalPic);
                else removeItem(PROFILE_PIC_ORIGINAL_STORAGE_KEY);
            } else if (!existingLocalOriginalPic || !incomingProfilePic || incomingProfilePic !== existingLocalProfilePic) {
                removeItem(PROFILE_PIC_ORIGINAL_STORAGE_KEY);
            }

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

            const storedSubInputMode = readString(SUB_INPUT_MODE_STORAGE_KEY, "false");
            const remoteSubInputMode = Object.prototype.hasOwnProperty.call(data.settings, "subInputMode")
                ? data.settings.subInputMode
                : storedSubInputMode;
            const subInputModeEnabled = remoteSubInputMode === true || remoteSubInputMode === "true";
            writeString(SUB_INPUT_MODE_STORAGE_KEY, subInputModeEnabled ? "true" : "false");
            state.subInputModeEnabled = subInputModeEnabled;
            state.activeSubInputRowIndex = -1;
            document.dispatchEvent(new CustomEvent("benchmark:sub-input-mode-updated", {
                detail: { enabled: subInputModeEnabled }
            }));
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

        const remoteScoresCandidate = (data.scores && typeof data.scores === "object")
            ? ScoreManager.normalizeSavedScoresRecord(data.scores)
            : null;
        const remoteScores = remoteScoresCandidate && Object.keys(remoteScoresCandidate).length > 0
            ? remoteScoresCandidate
            : null;
        if (data.scores && !remoteScores) {
            console.warn("[benchmark scores] Unrecognized score data shape.", data.scores);
        }
        const localScoresUpdatedAt = Number(readString(SCORE_UPDATED_AT_STORAGE_KEY, "0") || 0);
        const remoteScoresUpdatedAt = Number(data.scoresUpdatedAt || 0);
        const localScoreSnapshot = readJson(SCORE_STORAGE_KEY, null);
        const localHasRawScoreSnapshot = !!(
            localScoreSnapshot
            && typeof localScoreSnapshot === "object"
            && !Array.isArray(localScoreSnapshot)
        );
        const localNormalizedScores = localHasRawScoreSnapshot
            ? ScoreManager.normalizeSavedScoresRecord(localScoreSnapshot)
            : null;
        const localHasScoreSnapshot = !!(localNormalizedScores && Object.keys(localNormalizedScores).length > 0);
        const localScoreKeyCount = localHasScoreSnapshot ? Object.keys(localNormalizedScores).length : 0;
        const remoteScoreKeyCount = remoteScores ? Object.keys(remoteScores).length : 0;
        const localScoreStats = summarizeScoresRecord(localNormalizedScores);
        const remoteScoreStats = summarizeScoresRecord(remoteScores);
        const resetPending = readString(SCORE_RESET_PENDING_STORAGE_KEY, "false") === "true";

        if (remoteScores || localHasScoreSnapshot) {
            const syncLocalScoresToRemote = () => {
                if (state.isViewMode) return;
                clearTimeout(state.saveScoresDebounceTimer);
                state.saveScoresDebounceTimer = setTimeout(() => {
                    ScoreManager.saveSavedScores({ resetIntent: resetPending }).catch(console.error);
                }, 50);
            };

            let useRemoteScores = false;
            if (isLocalDebugHost && remoteScores) {
                useRemoteScores = true;
            } else if (resetPending && localHasScoreSnapshot && localScoreKeyCount === 0 && remoteScoreKeyCount > 0) {
                useRemoteScores = false;
            } else if (!remoteScores) {
                useRemoteScores = false;
            } else if (localScoresUpdatedAt > 0 && remoteScoresUpdatedAt > 0) {
                useRemoteScores = remoteScoresUpdatedAt > localScoresUpdatedAt;
            } else if (remoteScoresUpdatedAt > 0 && localScoresUpdatedAt <= 0) {
                useRemoteScores = true;
            } else if (localScoresUpdatedAt > 0 && remoteScoresUpdatedAt <= 0) {
                useRemoteScores = remoteScoreStats.nonZeroEntries > localScoreStats.nonZeroEntries
                    || remoteScoreStats.totalSum > localScoreStats.totalSum;
            } else if (!localHasScoreSnapshot || localScoreKeyCount === 0) {
                useRemoteScores = true;
            } else {
                useRemoteScores = remoteScoreStats.nonZeroEntries > localScoreStats.nonZeroEntries
                    || remoteScoreStats.totalSum > localScoreStats.totalSum;
            }

            if (useRemoteScores && remoteScores) {
                state.savedScores = remoteScores;
                writeJson(SCORE_STORAGE_KEY, state.savedScores);
                if (remoteScoresUpdatedAt > 0) {
                    writeString(SCORE_UPDATED_AT_STORAGE_KEY, String(remoteScoresUpdatedAt));
                }
                removeItem(SCORE_RESET_PENDING_STORAGE_KEY);
            } else if (localHasScoreSnapshot) {
                state.savedScores = localNormalizedScores;
                writeJson(SCORE_STORAGE_KEY, state.savedScores);
                if (!isLocalDebugHost && (!remoteScores || localScoresUpdatedAt > remoteScoresUpdatedAt || resetPending)) {
                    syncLocalScoresToRemote();
                }
            } else if (remoteScores) {
                state.savedScores = remoteScores;
            }

            const currentConfigHasVisibleScores = ScoreManager.hasNonZeroSavedScoresForConfig();
            if (!currentConfigHasVisibleScores) {
                const preferredSavedConfig = ScoreManager.resolvePreferredSavedConfig({ preferNonZero: true })
                    || ScoreManager.resolvePreferredSavedConfig();
                if (preferredSavedConfig) {
                    applyConfig(preferredSavedConfig, { skipSaveCurrent: true });
                }
            }

            ScoreManager.loadScores();
            ThemeUI.validateRankUnlock();
            state.scoresHydrated = true;
            state.scoresDirty = false;
            if (isLocalDebugHost) {
                console.debug("[benchmark scores]", {
                    source: useRemoteScores ? "remote" : (localHasScoreSnapshot ? "local" : "empty"),
                    currentConfig: state.currentConfig ? { ...state.currentConfig } : null,
                    remoteScoreKeyCount,
                    localScoreKeyCount,
                    remoteScoreStats,
                    localScoreStats,
                    activeScoreKeys: Object.keys(state.savedScores || {})
                });
            }
        } else {
            state.savedScores = {};
            ScoreManager.loadScores();
            ThemeUI.validateRankUnlock();
            state.scoresHydrated = true;
            state.scoresDirty = false;
            if (isLocalDebugHost) {
                console.debug("[benchmark scores]", {
                    source: "empty",
                    currentConfig: state.currentConfig ? { ...state.currentConfig } : null,
                    remoteScoreKeyCount,
                    localScoreKeyCount,
                    remoteScoreStats,
                    localScoreStats,
                    activeScoreKeys: []
                });
            }
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
