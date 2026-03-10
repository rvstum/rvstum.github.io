import { auth } from "./client.js";
import { state, setCurrentConfigState } from "./appState.js";
import { readJson, GUILDS_STORAGE_KEY } from "./storage.js";
import { t } from "./i18n.js";
import { getFlagUrl } from "./utils.js";
import { getCachedElementById, getCachedQuery, setHidden, setFlexVisible } from "./utils/domUtils.js";
import * as UserService from "./userService.js?v=20260309-remove-highlights-1";
import * as ThemeUI from "./themeUI.js?v=20260308-cave-save-btn-dark-3";
import * as AchievementsUI from "./achievementsUI.js?v=20260309-achievements-view-fix-1";
import * as FriendsService from "./friendsService.js?v=20260309-public-view-fix-1";
import * as RadarUI from "./radarUI.js";
import * as RankingUI from "./rankingUI.js?v=20260309-view-mode-rank-trophy-fix-1";
import * as ScoreManager from "./scoreManager.js?v=20260309-view-mode-rank-trophy-fix-2";
import * as Slugs from "./slugs.js?v=20260309-public-view-fix-1";
import { calculateRankFromData, calculateTotalRatingForScores } from "./scoring.js";
import { getScoreBaseForConfigKey, DEFAULT_MOUNT_CONFIG, FINAL_RANK_INDEX, RANK_NAMES } from "./constants.js";
import { normalizeMountConfig, getConfigLookupKeys } from "./configManager.js";

const viewModeDeps = {
    showPrivateProfileOverlay: null,
    hidePrivateProfileOverlay: null,
    applyMountConfigVisual: null,
    syncPlatformLabelColor: null,
    renderSeasonalTrophyList: null,
    openImageViewer: null,
    showConfirmModal: null,
    updateViewProfileUrl: null
};

function requireDep(name) {
    const fn = viewModeDeps[name];
    if (typeof fn !== "function") {
        throw new Error(`viewModeManager missing dependency: ${name}`);
    }
    return fn;
}

function normalizeRecord(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function normalizeGuildList(list) {
    if (!Array.isArray(list)) return [];
    return [...new Set(
        list
            .map((value) => (typeof value === "string" ? value.trim() : ""))
            .filter((value) => value !== "")
    )];
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

function resolveViewModeRankIndex(data = {}) {
    const settings = data && typeof data.settings === "object" && data.settings ? data.settings : {};
    const profile = data && typeof data.profile === "object" && data.profile ? data.profile : {};
    const aeternusLabel = String(RANK_NAMES[FINAL_RANK_INDEX] || "").trim().toLowerCase();

    let best = clampRankIndex(calculateRankFromData(data));
    [
        data.maxRankIndex,
        data.rankIndex,
        settings.rankThemeUnlock,
        profile.maxRankIndex,
        profile.rankIndex
    ].forEach((value) => {
        const rankIndex = clampRankIndex(value);
        if (rankIndex > best) best = rankIndex;
    });

    const themedRankIndex = parseRankIndexFromTheme(settings.theme);
    if (themedRankIndex > best) best = themedRankIndex;

    if (aeternusLabel) {
        const hasAeternusName = [
            data.currentRank,
            profile.currentRank
        ].some((value) => String(value || "").trim().toLowerCase().includes(aeternusLabel));
        if (hasAeternusName) return FINAL_RANK_INDEX;
    }

    return best;
}

function syncViewModeExitButtonTheme(rankIndex = 0) {
    if (rankIndex >= FINAL_RANK_INDEX) {
        document.body.style.setProperty("--exit-view-btn-text", "#0a0a0a");
        return;
    }
    document.body.style.removeProperty("--exit-view-btn-text");
}

async function resolveViewerGuilds(viewerUid) {
    const storedGuilds = normalizeGuildList(readJson(GUILDS_STORAGE_KEY, null));
    if (storedGuilds.length > 0) return storedGuilds;
    try {
        const viewerDoc = await UserService.getUserDocument(viewerUid);
        if (!viewerDoc.exists()) return [];
        const viewerData = viewerDoc.data() || {};
        return normalizeGuildList((viewerData.profile && viewerData.profile.guilds) || []);
    } catch (e) {
        console.error("Failed to resolve viewer guilds:", e);
        return null;
    }
}

export function configure(deps = {}) {
    if (!deps || typeof deps !== "object") return;
    Object.keys(viewModeDeps).forEach((key) => {
        if (!Object.prototype.hasOwnProperty.call(deps, key)) return;
        viewModeDeps[key] = typeof deps[key] === "function" ? deps[key] : null;
    });
}

export async function canViewProfile(profileUid, profileData, viewerUser) {
    const data = profileData && typeof profileData === "object" ? profileData : {};
    const settings = data.settings && typeof data.settings === "object" ? data.settings : {};
    const visibility = settings.visibility || "everyone";
    const targetUid = typeof profileUid === "string" ? profileUid.trim() : "";
    if (visibility !== "friends") return true;
    if (!viewerUser) return false;
    if (targetUid && viewerUser.uid === targetUid) return true;

    const friends = Array.isArray(data.friends) ? data.friends : [];
    if (friends.includes(viewerUser.uid)) return true;
    try {
        const viewerDoc = await UserService.getUserDocument(viewerUser.uid);
        if (viewerDoc && viewerDoc.exists()) {
            const viewerData = viewerDoc.data() || {};
            const viewerFriends = Array.isArray(viewerData.friends) ? viewerData.friends : [];
            if (targetUid && viewerFriends.includes(targetUid)) return true;
        }
    } catch (e) {
        console.error("Failed to resolve viewer-side friendship visibility:", e);
    }
    try {
        if (targetUid && await FriendsService.areFriends(viewerUser.uid, targetUid)) return true;
    } catch (e) {
        console.error("Failed to resolve friendship visibility:", e);
    }

    const targetGuilds = normalizeGuildList((data.profile && data.profile.guilds) || []);
    if (!targetGuilds.length) return false;

    const viewerGuilds = await resolveViewerGuilds(viewerUser.uid);
    if (!Array.isArray(viewerGuilds) || !viewerGuilds.length) return false;
    return viewerGuilds.some((guild) => targetGuilds.includes(guild));
}

function applyViewModeChrome() {
    state.isViewMode = true;
    document.body.classList.add("view-mode");
    const viewedRankIndex = state.activeViewProfileContext && Number.isFinite(state.activeViewProfileContext.rankIndex)
        ? state.activeViewProfileContext.rankIndex
        : 0;
    syncViewModeExitButtonTheme(viewedRankIndex);

    const userMenuBox = getCachedElementById("userMenuBox");
    const settingsBtn = getCachedElementById("settingsBtn");
    setHidden(userMenuBox, true);
    setHidden(settingsBtn, true);
    const viewedUid = state.activeViewProfileContext && state.activeViewProfileContext.uid
        ? state.activeViewProfileContext.uid
        : "";
    const currentUid = auth.currentUser && auth.currentUser.uid ? auth.currentUser.uid : "";
    const viewingOwnProfile = !!(viewedUid && currentUid && viewedUid === currentUid);

    const exitViewModeContainer = getCachedElementById("exitViewModeContainer");
    if (exitViewModeContainer) {
        if (viewingOwnProfile) {
            setFlexVisible(exitViewModeContainer, false);
            exitViewModeContainer.classList.add("initially-hidden");
        } else {
            exitViewModeContainer.classList.remove("initially-hidden");
            setFlexVisible(exitViewModeContainer, true);
        }
    }

    let mobileExitBtn = getCachedElementById("mobileExitViewBtn");
    if (!mobileExitBtn) {
        mobileExitBtn = document.createElement("button");
        mobileExitBtn.id = "mobileExitViewBtn";
        mobileExitBtn.className = "mobile-exit-view-btn";
        mobileExitBtn.textContent = t("exit_view_mode");
        document.body.appendChild(mobileExitBtn);
        mobileExitBtn.addEventListener("click", () => {
            const exitViewModeBtn = getCachedElementById("exitViewModeBtn");
            if (exitViewModeBtn) exitViewModeBtn.click();
        });
    }
    if (viewingOwnProfile) {
        mobileExitBtn.classList.remove("mobile-exit-view-btn--visible");
    } else {
        mobileExitBtn.classList.add("mobile-exit-view-btn--visible");
    }
}

export function clearViewModeChrome() {
    state.isViewMode = false;
    state.activeViewProfileContext = null;
    document.body.classList.remove("view-mode");
    syncViewModeExitButtonTheme(0);
    const userMenuBox = getCachedElementById("userMenuBox");
    const settingsBtn = getCachedElementById("settingsBtn");
    setHidden(userMenuBox, false);
    setHidden(settingsBtn, false);
    const exitViewModeContainer = getCachedElementById("exitViewModeContainer");
    if (exitViewModeContainer) {
        setFlexVisible(exitViewModeContainer, false);
        exitViewModeContainer.classList.add("initially-hidden");
    }
    const mobileExitBtn = getCachedElementById("mobileExitViewBtn");
    if (mobileExitBtn) mobileExitBtn.classList.remove("mobile-exit-view-btn--visible");
}

function applyViewModeDataSnapshot(data) {
    state.savedScores = normalizeRecord(data.scores);
    state.savedCaveLinks = normalizeRecord(data.caveLinks);
    state.savedConfigThemes = normalizeRecord(data.configThemes);

    const settings = data.settings || {};
    if (settings.rankThemeUnlock) {
        ThemeUI.setMaxUnlockedRankIndex(Number(settings.rankThemeUnlock) || 0);
    }
    if (settings.autoRankTheme) {
        ThemeUI.setAutoRankThemeEnabled(settings.autoRankTheme === "true");
    } else {
        ThemeUI.setAutoRankThemeEnabled(false);
    }
    if (settings.customTheme && settings.customTheme.hex) {
        ThemeUI.setCustomThemeHex(settings.customTheme.hex);
    }
    if (settings.pacmanMode) {
        state.pacmanModeEnabled = settings.pacmanMode === "true";
    }

}

function resolveBestViewModeConfig(data) {
    let bestConfig = null;
    if (data.scores) {
        let maxTotalRating = -1;
        Object.entries(data.scores).forEach(([key, scores]) => {
            if (!Array.isArray(scores)) return;
            const baseScores = getScoreBaseForConfigKey(key);
            const totalRating = calculateTotalRatingForScores(scores, baseScores);
            if (totalRating <= maxTotalRating) return;
            maxTotalRating = totalRating;
            const parts = key.split("|");
            if (parts.length < 3) return;
            bestConfig = {
                platform: parts[0],
                time: parts[1],
                stat: parts[2],
                mount: normalizeMountConfig(parts[3] || DEFAULT_MOUNT_CONFIG)
            };
        });
    }
    return bestConfig || (data.settings && data.settings.defaultConfig) || {
        platform: "Mobile",
        time: "5 Min",
        stat: "Baddy Kills",
        mount: DEFAULT_MOUNT_CONFIG
    };
}

function applyViewModeConfigAndTheme(data, configToUse) {
    const platformText = getCachedElementById("platformText");
    const timeText = getCachedElementById("timeText");
    const statText = getCachedElementById("statText");
    const syncPlatformLabelColor = requireDep("syncPlatformLabelColor");
    const applyMountConfigVisual = requireDep("applyMountConfigVisual");
    const resolvedConfig = {
        platform: configToUse && configToUse.platform ? configToUse.platform : "Mobile",
        time: configToUse && configToUse.time ? configToUse.time : "5 Min",
        stat: configToUse && configToUse.stat ? configToUse.stat : "Baddy Kills",
        mount: normalizeMountConfig((configToUse && configToUse.mount) || DEFAULT_MOUNT_CONFIG)
    };
    setCurrentConfigState(resolvedConfig);

    if (platformText && resolvedConfig.platform) {
        platformText.textContent = resolvedConfig.platform;
        syncPlatformLabelColor(resolvedConfig.platform);
    }
    if (timeText && resolvedConfig.time) timeText.textContent = resolvedConfig.time;
    if (statText && resolvedConfig.stat) statText.textContent = resolvedConfig.stat;
    applyMountConfigVisual(resolvedConfig.mount);

    const themeFallback = (data.settings && data.settings.theme) || "default";
    const keyCandidates = getConfigLookupKeys(resolvedConfig);
    let themeToApply = themeFallback;
    for (const key of keyCandidates) {
        if (!state.savedConfigThemes[key]) continue;
        themeToApply = state.savedConfigThemes[key];
        break;
    }
    ThemeUI.applyTheme(themeToApply, false);
}

function applyViewModeProfileHeader(data) {
    const profile = data.profile || {};
    const profileNameEl = getCachedQuery("viewModeProfileName", () => document.querySelector(".profile-name"));
    if (profileNameEl) {
        profileNameEl.textContent = data.username || profile.username || "Unknown";
    }

    const circle = getCachedQuery("viewModeProfileCircle", () => document.querySelector(".profile-circle"));
    const flagEl = getCachedQuery("viewModeFlagEl", () => document.querySelector(".nationality-flag"));
    if (circle) {
        if (profile.pic) {
            circle.style.backgroundImage = `url(${profile.pic})`;
            circle.style.backgroundSize = "cover";
            circle.style.backgroundColor = "transparent";
            setHidden(circle, false);
            circle.classList.remove("no-pic-has-flag");
        } else {
            circle.style.backgroundImage = "";
            circle.style.backgroundColor = "transparent";
            if (profile.flag) {
                circle.classList.add("no-pic-has-flag");
                setHidden(circle, false);
            } else {
                setHidden(circle, true);
            }
        }
    }

    if (flagEl) {
        if (profile.flag) {
            flagEl.textContent = "";
            flagEl.style.backgroundImage = `url(${getFlagUrl(profile.flag)})`;
            setFlexVisible(flagEl, true);
        } else {
            flagEl.textContent = "";
            flagEl.style.backgroundImage = "";
            setFlexVisible(flagEl, false);
        }
    }

    const guildNameEl = getCachedQuery("viewModeGuildName", () => document.querySelector(".guild-name"));
    if (!guildNameEl) return;
    if (profile.guilds && profile.guilds.length > 0) {
        guildNameEl.textContent = profile.guilds.map((g) => `(${g})`).join(" ");
        setHidden(guildNameEl, false);
    } else {
        setHidden(guildNameEl, true);
    }
}

function applyViewModeTrophiesAchievementsAndViews(data, uid) {
    const renderSeasonalTrophyList = requireDep("renderSeasonalTrophyList");
    const openImageViewer = requireDep("openImageViewer");
    const showConfirmModal = requireDep("showConfirmModal");
    const profile = data.profile || {};
    const trophyList = getCachedElementById("trophyList");
    const trophyPlaceholder = getCachedElementById("trophyPlaceholder");
    setHidden(trophyPlaceholder, true);
    if (trophyList) {
        renderSeasonalTrophyList(trophyList, profile.trophies || {});
        setFlexVisible(trophyList, true);
    }

    state.userAchievements = (data.achievements && typeof data.achievements === "object" && !Array.isArray(data.achievements))
        ? data.achievements
        : {};
    AchievementsUI.renderAchievements(openImageViewer, showConfirmModal);

    const viewCountEl = getCachedElementById("viewCount");
    if (viewCountEl) {
        const views = profile.views || 0;
        viewCountEl.textContent = views.toLocaleString();
    }
    if (uid) FriendsService.incrementViewCount(uid);
}

function lockViewModeInteractiveInputs() {
    document.querySelectorAll(".score-input").forEach((input) => {
        input.disabled = true;
        input.classList.add("score-input--view-locked");
    });
}

function resetViewModeHorizontalScroll() {
    const ranksBarsContainer = getCachedElementById("ranksBarsContainer")
        || getCachedQuery("viewModeRanksBarsContainerFallback", () => document.querySelector(".ranks-bars-stack"));
    const ranksWrapper = getCachedQuery("viewModeRanksWrapper", () => document.querySelector(".ranks-wrapper"));
    const ranksScroll = getCachedQuery("viewModeRanksScroll", () => document.querySelector(".ranks-scroll"));
    const applyReset = () => {
        if (ranksBarsContainer) ranksBarsContainer.scrollLeft = 0;
        if (ranksWrapper) ranksWrapper.scrollLeft = 0;
        if (ranksScroll) ranksScroll.scrollLeft = 0;
    };

    applyReset();
    requestAnimationFrame(() => {
        applyReset();
        requestAnimationFrame(applyReset);
    });
}

export async function enterViewMode(data, uid) {
    const showPrivateProfileOverlay = requireDep("showPrivateProfileOverlay");
    const hidePrivateProfileOverlay = requireDep("hidePrivateProfileOverlay");
    const updateViewProfileUrl = requireDep("updateViewProfileUrl");
    const user = auth.currentUser;

    if (user && uid && user.uid === uid) {
        hidePrivateProfileOverlay();
        clearViewModeChrome();
        return;
    }

    const allowed = await canViewProfile(uid, data, user);
    if (!allowed) {
        showPrivateProfileOverlay();
        return;
    }

    hidePrivateProfileOverlay();
    ScoreManager.saveCurrentScores();
    updateViewProfileUrl(data, uid);

    const profile = (data && typeof data.profile === "object" && data.profile) ? data.profile : {};
    const resolvedUsername = Slugs.resolveProfileUsername(data, profile.username || "player");
    const resolvedAccountId = Slugs.resolveProfileAccountId(data, "");
    const resolvedPublicSlug = Slugs.resolveProfileSlug(data || {}, {
        usernameFallback: resolvedUsername,
        accountIdFallback: resolvedAccountId,
        uid: uid || ""
    });
    state.activeViewProfileContext = {
        uid: uid || "",
        username: resolvedUsername,
        accountId: resolvedAccountId,
        publicSlug: resolvedPublicSlug,
        rankIndex: resolveViewModeRankIndex(data)
    };

    applyViewModeChrome();
    applyViewModeDataSnapshot(data);
    const configToUse = resolveBestViewModeConfig(data);
    applyViewModeConfigAndTheme(data, configToUse);
    applyViewModeProfileHeader(data);
    applyViewModeTrophiesAchievementsAndViews(data, uid);

    RadarUI.setRadarMode("combined", false);
    RadarUI.updateRadar();
    RankingUI.updateScoreRequirements(ScoreManager.getBaseScoresForConfig());
    ScoreManager.loadScores();
    ScoreManager.loadCaveLinks();
    lockViewModeInteractiveInputs();
    resetViewModeHorizontalScroll();
}
