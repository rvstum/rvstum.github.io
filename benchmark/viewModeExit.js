import { state, getRuntimeAccountId } from "./appState.js";
import { getCachedElementById, getCachedQuery, setHidden, setFlexVisible } from "./utils/domUtils.js";
import { readString, readJson, CACHED_VIEWS_STORAGE_KEY, ACHIEVEMENTS_STORAGE_KEY } from "./storage.js";
import * as ScoreManager from "./scoreManager.js?v=20260310-score-save-fix-18";
import * as ThemeUI from "./themeUI.js?v=20260310-reset-theme-fix-1";
import * as PacmanUI from "./pacmanUI.js";
import * as ProfileUI from "./profileUI.js?v=20260310-profile-save-fix-2";
import * as Slugs from "./slugs.js?v=20260310-public-slug-directory-1";
import * as TrophyUI from "./trophyUI.js?v=20260309-view-mode-asset-fix-1";
import * as AchievementsUI from "./achievementsUI.js?v=20260304-achievements-6k";
import * as RankingUI from "./rankingUI.js?v=20260310-sub-score-input-14";
import * as RadarUI from "./radarUI.js";

export async function exitViewMode(options = {}) {
    const {
        user,
        exitViewModeContainer,
        loadUserProfile,
        applyStoredSettings,
        syncAuthenticatedBackNavigationGuard = null
    } = options;

    if (!user) {
        window.location.replace(Slugs.getBenchmarkLoginUrl());
        return;
    }

    state.isViewMode = false;
    state.activeViewProfileContext = null;
    document.body.classList.remove("view-mode");
    document.body.style.removeProperty("--exit-view-btn-text");

    const userMenuBox = getCachedElementById("userMenuBox");
    const settingsBtn = getCachedElementById("settingsBtn");
    setHidden(userMenuBox, false);
    setHidden(settingsBtn, false);

    if (exitViewModeContainer) {
        setFlexVisible(exitViewModeContainer, false);
        exitViewModeContainer.classList.add("initially-hidden");
    }

    const mobileExitBtn = getCachedElementById("mobileExitViewBtn");
    if (mobileExitBtn) mobileExitBtn.classList.remove("mobile-exit-view-btn--visible");

    const trophyPlaceholder = getCachedElementById("trophyPlaceholder");
    setHidden(trophyPlaceholder, false);

    document.querySelectorAll(".score-input, .sub-score-input").forEach((input) => {
        input.disabled = false;
        input.classList.remove("score-input--view-locked");
    });

    const url = new URL(window.location);
    if (url.searchParams.has("id")) {
        url.searchParams.delete("id");
        window.history.pushState({}, "", url);
    }

    ScoreManager.loadSavedScores();
    ScoreManager.loadSavedCaveLinks();
    ThemeUI.loadSavedConfigThemes();

    ThemeUI.loadCustomThemeState();
    ThemeUI.loadSavedCustomThemes();
    ThemeUI.loadCustomThemeHex();
    ThemeUI.loadRankThemeUnlock();
    ThemeUI.loadAutoRankThemeSetting();
    PacmanUI.loadPacmanSetting();

    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    const ranksBarsContainer = getCachedElementById("ranksBarsContainer");
    if (ranksBarsContainer) ranksBarsContainer.scrollLeft = 0;
    const ranksWrapper = getCachedQuery("ranksWrapper", () => document.querySelector(".ranks-wrapper"));
    const ranksScroll = getCachedQuery("ranksScroll", () => document.querySelector(".ranks-scroll"));
    if (ranksWrapper) ranksWrapper.scrollLeft = 0;
    if (ranksScroll) ranksScroll.scrollLeft = 0;

    ProfileUI.updateMainHeaderLayout();
    ProfileUI.updateMainPageGuildDisplay();

    if (user.displayName) {
        const profileName = getCachedQuery("profileName", () => document.querySelector(".profile-name"));
        if (profileName) profileName.textContent = user.displayName;
        const userMenuName = getCachedElementById("userMenuUsername");
        if (userMenuName) userMenuName.textContent = user.displayName;
    }
    const profileName = getCachedQuery("profileName", () => document.querySelector(".profile-name"));
    Slugs.updateOwnProfileUrl(user, {
        username: user.displayName || (profileName ? profileName.textContent : "player"),
        accountId: getRuntimeAccountId(),
        profile: {}
    });
    if (typeof syncAuthenticatedBackNavigationGuard === "function") {
        syncAuthenticatedBackNavigationGuard({ enabled: true });
    }

    const cachedViews = readString(CACHED_VIEWS_STORAGE_KEY, "");
    const viewCountEl = getCachedElementById("viewCount");
    if (viewCountEl) {
        viewCountEl.textContent = cachedViews ? Number(cachedViews).toLocaleString() : "0";
    }

    TrophyUI.renderTrophies();

    const savedAchievements = readJson(ACHIEVEMENTS_STORAGE_KEY, null);
    state.userAchievements = (savedAchievements && typeof savedAchievements === "object" && !Array.isArray(savedAchievements))
        ? savedAchievements
        : {};
    AchievementsUI.updateAchievementsProgress();

    if (typeof loadUserProfile === "function") {
        await loadUserProfile(user);
    }

    if (typeof applyStoredSettings === "function") {
        applyStoredSettings();
    }

    RankingUI.updateScoreRequirements(ScoreManager.getBaseScoresForConfig());
    ScoreManager.loadScores();
    ScoreManager.loadCaveLinks();

    RadarUI.setRadarMode("combined", false);
    RadarUI.updateRadar();
}
