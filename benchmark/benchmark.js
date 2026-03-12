import { app, auth } from "./client.js";
import { getBenchmarkBasePath, isMobileViewport } from "./utils.js";
import { getCachedElementById, getCachedQuery } from "./utils/domUtils.js";
import {
    readJson,
    readString,
    removeItem,
    writeString,
    SCORE_STORAGE_KEY,
    CAVE_LINKS_STORAGE_KEY,
    SCORE_UPDATED_AT_STORAGE_KEY,
    CACHED_VIEWS_STORAGE_KEY,
    PROFILE_PIC_STORAGE_KEY,
    PROFILE_PIC_ORIGINAL_STORAGE_KEY,
    PROFILE_PIC_STATE_STORAGE_KEY,
    COUNTRY_FLAG_STORAGE_KEY,
    GUILDS_STORAGE_KEY,
    ACHIEVEMENTS_STORAGE_KEY,
    SEASONAL_TROPHIES_STORAGE_KEY,
    CONFIG_THEMES_STORAGE_KEY,
    LEGACY_ACCOUNT_ID_STORAGE_KEY,
    THEME_STORAGE_KEY,
    THEME_USER_SELECTED_STORAGE_KEY,
    CUSTOM_THEME_ENABLED_STORAGE_KEY,
    CUSTOM_THEME_NAME_STORAGE_KEY,
    CUSTOM_THEME_HEX_STORAGE_KEY,
    SAVED_CUSTOM_THEMES_STORAGE_KEY,
    AUTO_RANK_THEME_STORAGE_KEY,
    DEFAULT_CONFIG_STORAGE_KEY,
    VISIBILITY_STORAGE_KEY,
    PACMAN_STORAGE_KEY,
    THEME_UNLOCK_STORAGE_KEY,
    SUB_INPUT_MODE_STORAGE_KEY,
    LANGUAGE_STORAGE_KEY
} from "./storage.js?v=20260310-sub-score-input-3";
import { calculateRankFromData } from "./scoring.js";
import {
    normalizeCellImagePaths as normalizeCaveCellImagePaths,
    bindCaveImageViewer as bindCaveCellImageViewer,
    setupCavePlayEditors as setupCavePlayEditorsModule,
    openImageViewerModal,
    closeImageViewerModal
} from "./caveUI.js?v=20260310-exit-view-cave-click-fix-1";

export { app };

import { state, getRuntimeAccountId, setCurrentConfigState, setRuntimeAccountId } from "./appState.js";
import {
    DEFAULT_MOUNT_CONFIG,
    MOUNT_CONFIG_IMAGES,
    CONFIG_OPTIONS
} from "./constants.js";
import * as Slugs from "./slugs.js?v=20260310-public-slug-directory-1";
import {
    normalizeMountConfig,
    getMountConfigLabel,
    getConfigLookupKeys,
    getConfigKey,
    getCurrentConfig,
    buildConfigKey,
    readDefaultConfig,
    getStartupConfigDefaults
} from "./configManager.js";
import * as RankingUI from "./rankingUI.js?v=20260311-compare-theme-colors-1";
import * as RadarUI from "./radarUI.js";
import * as FriendsUI from "./friendsUI.js?v=20260311-friends-layout-8";
import { persistUserData } from "./persistence.js";
import * as ScoreManager from "./scoreManager.js?v=20260311-view-mode-compare-2";
import * as ViewModeManager from "./viewModeManager.js?v=20260311-view-mode-compare-2";
import * as ShareManager from "./shareManager.js?v=20260311-desktop-screenshot-warmup-4";
import { bindModalOverlayQuickClose } from "./shareManager.js?v=20260311-desktop-screenshot-warmup-4";
import * as TrophyUI from "./trophyUI.js?v=20260309-view-mode-asset-fix-1";
import * as LayoutRuntime from "./layoutRuntime.js";
import {
    MASKED_ACCOUNT_ID,
    setupAccountIdUI,
    initAccountId,
    applyActiveAccountId,
    rememberAccountIdForUid,
    getRememberedAccountIdForUid,
    generateAccountId,
    resetAccountIdVisibility,
    resetFriendAccountIdVisibility
} from "./accountId.js";
import {
    t,
    currentLanguage,
    BENCHMARK_LANGUAGE_LABELS
} from "./i18n.js";
import * as ThemeUI from "./themeUI.js?v=20260310-reset-theme-fix-1";
import * as AchievementsUI from "./achievementsUI.js?v=20260309-achievements-view-fix-1";
import * as ProfileUI from "./profileUI.js?v=20260311-profile-original-sync-1";
import * as AuthManager from "./authManager.js?v=20260311-profile-original-sync-1";
import * as PacmanUI from "./pacmanUI.js";
import { initFriendsModalController } from "./friendsModalUI.js?v=20260311-friends-layout-8";
import { initAuthLifecycle } from "./authLifecycle.js?v=20260311-view-mode-language-fix-2";
import { initOnboardingUI } from "./onboardingUI.js?v=20260311-profile-original-sync-1";
import { handleProfileLink } from "./routeManager.js?v=20260311-view-mode-language-fix-2";
import { exitViewMode as runExitViewMode } from "./viewModeExit.js?v=20260311-exit-slug-fix-1";
import { initProfileModalController } from "./profileModalUI.js?v=20260311-profile-original-sync-1";
import { createConfirmModalController } from "./confirmModalUI.js";
import { initSecondaryModals } from "./secondaryModalsUI.js?v=20260311-profile-original-sync-1";
import { initSettingsUI } from "./settingsUI.js?v=20260309-modal-lang-dropdown-1";
import { setupScoreInputHandlers as setupScoreInputHandlersUI } from "./scoreInputUI.js?v=20260311-compare-theme-colors-1";
import { setupMountDropdownUI, setupConfigDropdownsUI } from "./configDropdownUI.js";
import { createLanguageController, enforceBenchmarkSupportedLanguages } from "./languageUI.js?v=20260310-score-link-lang-sync-1";
import { createSettingsStateController } from "./settingsStateUI.js?v=20260311-pacman-settings-desktop-1";
import { createTopNavController } from "./topNavUI.js";
import { hidePageLoader as hidePageLoaderUI } from "./pageLoaderUI.js?v=20260309-logout-loader-cover-1";

const PAGE_LOADER_MIN_VISIBLE_MS = 1300;
const LAST_ACTIVE_AUTH_UID_STORAGE_KEY = "benchmark_last_active_user_uid";
let settingsUIController = null;
let friendsModalController = null;
let confirmModalController = null;
let onboardingUI = null;
let languageController = null;
let settingsStateController = null;
let topNavController = null;
let manualConfirmCleanup = null;
let globalListenersInitialized = false;
let uiControllersInitialized = false;
let benchmarkAppInitialized = false;
let moduleConfigurationsInitialized = false;
const visibilitySelect = getCachedElementById('visibilitySelect');
let authGateActive = false;
let authenticatedBackNavigationGuardActive = false;
let authenticatedBackNavigationGuardHasSentinel = false;

function resolveBenchmarkAssetUrl(assetPath) {
    const raw = typeof assetPath === "string" ? assetPath.trim() : "";
    if (!raw || typeof window === "undefined") return raw;
    try {
        return new URL(raw, new URL(Slugs.getBenchmarkAppEntryUrl(), window.location.origin)).toString();
    } catch (e) {
        return raw;
    }
}

function normalizeBenchmarkStaticAssetPaths(root = document) {
    const targetRoot = root && typeof root.querySelectorAll === "function" ? root : document;
    targetRoot.querySelectorAll('img[src], link[href], image[href]').forEach((el) => {
        const tagName = (el.tagName || "").toLowerCase();
        const attrName = tagName === "img" ? "src" : "href";
        const raw = (el.getAttribute(attrName) || "").trim();
        if (!raw.startsWith("../icons/")) return;
        const resolved = resolveBenchmarkAssetUrl(raw);
        if (!resolved || resolved === raw) return;
        el.setAttribute(attrName, resolved);
        if (tagName === "image" && el.href && typeof el.href.baseVal === "string") {
            el.href.baseVal = resolved;
        }
    });
}

function clearBenchmarkVisualState() {
    document.querySelectorAll(".score-input").forEach((input) => {
        input.value = "0";
    });
    document.querySelectorAll(".score-text-overlay").forEach((overlay) => {
        overlay.textContent = "0";
        overlay.style.background = "";
        overlay.style.webkitBackgroundClip = "";
        overlay.style.backgroundClip = "";
        overlay.style.color = "white";
        overlay.style.animation = "";
        overlay.style.backgroundSize = "";
    });
    document.querySelectorAll(".rating-value").forEach((valueEl) => {
        valueEl.textContent = "0";
        valueEl.style.background = "";
        valueEl.style.webkitBackgroundClip = "";
        valueEl.style.backgroundClip = "";
        valueEl.style.color = "white";
        valueEl.style.animation = "";
        valueEl.style.backgroundSize = "";
    });
    document.querySelectorAll(".bg-stripe").forEach((stripe) => {
        stripe.style.background = "none";
        stripe.classList.remove("stripe-active");
    });
    document.querySelectorAll(".rank-bar").forEach((bar) => {
        bar.style.setProperty("--fill-percent", "0%");
        bar.style.setProperty("--fill-color", "transparent");
        bar.style.setProperty("--fill-duration", "0ms");
    });
    document.querySelectorAll(".cave-play-wrapper").forEach((wrapper) => {
        wrapper.dataset.youtube = "";
        wrapper.classList.remove("has-link");
    });
    const progressBar = document.querySelector(".progress-bar");
    if (progressBar) {
        const fill = progressBar.querySelector(".progress-fill");
        if (fill) {
            fill.style.setProperty("--main-fill-duration", "0ms");
            fill.style.width = "0px";
            fill.style.backgroundColor = "";
        }
        const scoreSpan = progressBar.querySelector("span");
        if (scoreSpan) {
            scoreSpan.textContent = "0 / 0";
        }
        progressBar.querySelectorAll(".rank-line").forEach((line) => {
            line.style.transitionDelay = "0ms";
            line.style.background = "linear-gradient(to bottom, transparent, #444 15%, #444 85%, transparent)";
        });
    }
    document.dispatchEvent(new CustomEvent("benchmark:collapse-sub-inputs"));
}

function setAuthGateActive(active) {
    const nextActive = !!active;
    if (authGateActive === nextActive) return;
    authGateActive = nextActive;
    document.body.classList.toggle("auth-gate-active", nextActive);
    if (nextActive) {
        clearBenchmarkVisualState();
    }
}

function getCurrentRelativeLocation() {
    return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function resolveAuthenticatedBackNavigationTargetUrl() {
    const user = auth.currentUser;
    if (!user) return "";

    const params = new URLSearchParams(window.location.search || "");
    const requestedSlug = Slugs.getRequestedProfileSlugFromPath();
    if (requestedSlug && !params.has("__restore") && !params.has("id")) {
        return getCurrentRelativeLocation();
    }

    if (Slugs.isLocalDevRoutingEnv()) {
        return `${getBenchmarkBasePath()}/benchmark.html`;
    }

    const accountIdDisplay = getCachedElementById("accountIdDisplay");
    const accountIdFromDataset = accountIdDisplay && accountIdDisplay.dataset
        ? (accountIdDisplay.dataset.realValue || "").trim()
        : "";
    const accountId = getRuntimeAccountId() || accountIdFromDataset;
    if (!accountId) {
        return getCurrentRelativeLocation();
    }

    const profileName = getCachedQuery("profileName", () => document.querySelector(".profile-name"));
    const username = (profileName && profileName.textContent ? profileName.textContent : user.displayName || "player").trim() || "player";
    const slug = Slugs.resolveProfileSlug({
        username,
        accountId,
        profile: {}
    }, {
        usernameFallback: username,
        accountIdFallback: accountId,
        uid: user.uid
    });
    return `${getBenchmarkBasePath()}/${slug}`;
}

function syncAuthenticatedBackNavigationGuard(options = {}) {
    const enabled = Object.prototype.hasOwnProperty.call(options, "enabled")
        ? !!options.enabled
        : !!auth.currentUser;

    if (!enabled) {
        authenticatedBackNavigationGuardActive = false;
        authenticatedBackNavigationGuardHasSentinel = false;
        return;
    }

    const targetUrl = resolveAuthenticatedBackNavigationTargetUrl();
    if (!targetUrl) return;

    authenticatedBackNavigationGuardActive = true;
    const currentUrl = getCurrentRelativeLocation();
    if (currentUrl !== targetUrl) {
        window.history.replaceState(window.history.state || {}, "", targetUrl);
    }

    if (authenticatedBackNavigationGuardHasSentinel) return;
    authenticatedBackNavigationGuardHasSentinel = true;
    window.history.pushState({ benchmarkAuthBackGuard: true }, "", targetUrl);
}

function handleAuthenticatedBackNavigationPopState() {
    if (!authenticatedBackNavigationGuardActive || !auth.currentUser) return;
    const targetUrl = resolveAuthenticatedBackNavigationTargetUrl() || getCurrentRelativeLocation();
    window.history.pushState({ benchmarkAuthBackGuard: true }, "", targetUrl);
}

function resetSessionScopedState() {
    const profileName = getCachedQuery("profileName", () => document.querySelector(".profile-name"));
    const userMenuName = getCachedElementById("userMenuUsername");
    const viewCountEl = getCachedElementById("viewCount");
    const accountIdDisplay = getCachedElementById("accountIdDisplay");
    const friendPageAccountIdDisplay = getCachedElementById("friendPageAccountIdDisplay");

    state.savedScores = {};
    state.savedCaveLinks = {};
    state.savedConfigThemes = {};
    state.currentFriendRequests = [];
    state.hasPendingRequests = false;
    state.userAchievements = {};
    state.viewerCompareScores = {};
    state.compareViewEnabled = false;
    state.radarMode = "combined";
    state.lastMainRankIndex = null;
    state.activeViewProfileContext = null;
    state.pacmanModeEnabled = false;
    state.lastProgressInRank = 0;
    state.allRowThresholds = [];
    state.individualRatings = [];
    state.focusedInputIndex = -1;
    state.subInputModeEnabled = false;
    state.activeSubInputRowIndex = -1;
    state.scoresHydrated = false;
    state.scoresDirty = false;
    state.maxUnlockedRankIndex = 0;
    if (state.ratingUpdateRafId) {
        cancelAnimationFrame(state.ratingUpdateRafId);
        state.ratingUpdateRafId = null;
    }
    const existingRowAnimationStates = Array.isArray(state.rowFillAnimationStates) ? state.rowFillAnimationStates : [];
    existingRowAnimationStates.forEach((rowState) => {
        if (rowState && rowState.rafId) {
            cancelAnimationFrame(rowState.rafId);
        }
    });
    state.rowFillAnimationStates = [];
    if (state.radarLabelsCache) {
        state.radarLabelsCache = [];
    }
    if (state.saveScoresDebounceTimer) {
        clearTimeout(state.saveScoresDebounceTimer);
        state.saveScoresDebounceTimer = null;
    }

    if (typeof ViewModeManager?.clearViewModeChrome === "function") {
        ViewModeManager.clearViewModeChrome();
    } else {
        state.isViewMode = false;
        state.activeViewProfileContext = null;
        document.body.classList.remove("view-mode");
    }
    clearBenchmarkVisualState();

    removeItem(SCORE_STORAGE_KEY);
    removeItem(CAVE_LINKS_STORAGE_KEY);
    removeItem(CONFIG_THEMES_STORAGE_KEY);
    removeItem(THEME_STORAGE_KEY);
    removeItem(THEME_USER_SELECTED_STORAGE_KEY);
    removeItem(CUSTOM_THEME_ENABLED_STORAGE_KEY);
    removeItem(CUSTOM_THEME_NAME_STORAGE_KEY);
    removeItem(CUSTOM_THEME_HEX_STORAGE_KEY);
    removeItem(SAVED_CUSTOM_THEMES_STORAGE_KEY);
    removeItem(AUTO_RANK_THEME_STORAGE_KEY);
    removeItem(DEFAULT_CONFIG_STORAGE_KEY);
    removeItem(VISIBILITY_STORAGE_KEY);
    removeItem(PACMAN_STORAGE_KEY);
    removeItem(SUB_INPUT_MODE_STORAGE_KEY);
    removeItem(THEME_UNLOCK_STORAGE_KEY);
    removeItem(LEGACY_ACCOUNT_ID_STORAGE_KEY);
    try {
        const storageKeys = Object.keys(localStorage || {});
        storageKeys.forEach((storageKey) => {
            if (typeof storageKey === "string" && storageKey.startsWith("benchmark_youtube_")) {
                removeItem(storageKey);
            }
        });
    } catch (e) {}
    removeItem(SCORE_UPDATED_AT_STORAGE_KEY);
    removeItem(CACHED_VIEWS_STORAGE_KEY);
    removeItem(PROFILE_PIC_STORAGE_KEY);
    removeItem(PROFILE_PIC_ORIGINAL_STORAGE_KEY);
    removeItem(PROFILE_PIC_STATE_STORAGE_KEY);
    removeItem(COUNTRY_FLAG_STORAGE_KEY);
    removeItem(GUILDS_STORAGE_KEY);
    removeItem(ACHIEVEMENTS_STORAGE_KEY);
    removeItem(SEASONAL_TROPHIES_STORAGE_KEY);

    ThemeUI.setMaxUnlockedRankIndex(0);
    ThemeUI.setAutoRankThemeEnabled(false);
    ThemeUI.setCustomThemeEnabled(false);
    ThemeUI.setCustomThemeName("Custom");
    ThemeUI.setCustomThemeHex({});
    ThemeUI.setSavedCustomThemes([]);
    document.dispatchEvent(new CustomEvent("benchmark:sub-input-mode-updated", {
        detail: { enabled: false }
    }));
    if (visibilitySelect) {
        visibilitySelect.value = "everyone";
    }
    if (typeof settingsStateController?.syncSettingsUI === "function") {
        settingsStateController.syncSettingsUI();
    }

    if (typeof PacmanUI.syncPacmanUI === "function") {
        PacmanUI.syncPacmanUI(refreshRadarVisuals);
    }
    if (profileName) profileName.textContent = "Player";
    if (userMenuName) userMenuName.textContent = "Player";
    if (viewCountEl) viewCountEl.textContent = "0";

    setRuntimeAccountId("");
    if (typeof resetAccountIdVisibility === "function") {
        resetAccountIdVisibility();
    }
    if (accountIdDisplay) accountIdDisplay.dataset.realValue = "";
    if (friendPageAccountIdDisplay) friendPageAccountIdDisplay.dataset.realValue = "";
    resetFriendAccountIdVisibility();

    if (typeof ProfileUI?.updateMainHeaderLayout === "function") {
        ProfileUI.updateMainHeaderLayout();
    }
    if (typeof ProfileUI?.updateMainPageGuildDisplay === "function") {
        ProfileUI.updateMainPageGuildDisplay();
    }
    if (typeof TrophyUI?.renderTrophies === "function") {
        TrophyUI.renderTrophies();
    }
    if (typeof AchievementsUI?.updateAchievementsProgress === "function") {
        AchievementsUI.updateAchievementsProgress();
    }

    applyConfig(getStartupConfigDefaults(), {
        skipSaveCurrent: true,
        animateRowTransition: false
    });
    ThemeUI.applyTheme("default", false);
    if (typeof PacmanUI?.syncPacmanUI === "function") {
        PacmanUI.syncPacmanUI(refreshRadarVisuals);
    }
    ScoreManager.loadSavedScores();
    ScoreManager.loadSavedCaveLinks();
    state.scoresHydrated = false;
}

function handleAuthSessionChange({ currentUid, force = false }) {
    const nextUid = (currentUid || "").toString();
    const lastUid = readString(LAST_ACTIVE_AUTH_UID_STORAGE_KEY, "");

    document.dispatchEvent(new CustomEvent("benchmark:auth-session-changed", {
        detail: {
            currentUid: nextUid || null
        }
    }));

    if (!force && nextUid === lastUid) {
        return;
    }

    if (nextUid) {
        resetSessionScopedState();
        writeString(LAST_ACTIVE_AUTH_UID_STORAGE_KEY, nextUid);
    } else {
        resetSessionScopedState();
        removeItem(LAST_ACTIVE_AUTH_UID_STORAGE_KEY);
        syncAuthenticatedBackNavigationGuard({ enabled: false });
    }
}

async function resetLocalDevCaches() {
    if (typeof window === "undefined") return false;

    const { hostname } = window.location;
    const isLocalDevHost = hostname === "localhost" || hostname === "127.0.0.1";
    if (!isLocalDevHost) return false;

    const reloadFlag = "__benchmark_local_cache_reset__";
    if (window.sessionStorage.getItem(reloadFlag) === "done") {
        window.sessionStorage.removeItem(reloadFlag);
        return false;
    }

    try {
        if ("serviceWorker" in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.all(registrations.map((registration) => registration.unregister()));
        }

        if ("caches" in window) {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
        }
    } catch (_) {
        return false;
    }

    window.sessionStorage.setItem(reloadFlag, "done");
    window.location.reload();
    return true;
}

function registerRootServiceWorker() {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const { hostname } = window.location;
    if (hostname === "localhost" || hostname === "127.0.0.1") return;
    const mobileReloadFlag = "__benchmark_mobile_sw_controller_reload__";
    const clearMobileReloadState = () => {
        try {
            window.sessionStorage.removeItem("__benchmark_mobile_sw_disabled__");
            window.sessionStorage.removeItem(mobileReloadFlag);
        } catch (_) {}
    };
    const armMobileControllerReload = () => {
        if (!isMobileViewport()) {
            clearMobileReloadState();
            return;
        }
        try {
            window.sessionStorage.removeItem("__benchmark_mobile_sw_disabled__");
        } catch (_) {}
        if (navigator.serviceWorker.controller) {
            try {
                window.sessionStorage.removeItem(mobileReloadFlag);
            } catch (_) {}
            return;
        }
        if (window.sessionStorage.getItem(mobileReloadFlag) === "done") return;
        window.sessionStorage.setItem(mobileReloadFlag, "pending");
        navigator.serviceWorker.addEventListener("controllerchange", () => {
            if (window.sessionStorage.getItem(mobileReloadFlag) === "done") return;
            window.sessionStorage.setItem(mobileReloadFlag, "done");
            window.location.reload();
        }, { once: true });
    };

    window.addEventListener("load", () => {
        armMobileControllerReload();
        navigator.serviceWorker.register("../service-worker.js")
            .then((registration) => {
                registration.update().catch(() => {});
                if (!isMobileViewport()) clearMobileReloadState();
                if (isMobileViewport() && navigator.serviceWorker.controller) {
                    try {
                        window.sessionStorage.removeItem(mobileReloadFlag);
                    } catch (_) {}
                }
            })
            .catch(() => {});
    }, { once: true });
}

registerRootServiceWorker();
resetLocalDevCaches();

function getCachedUserMenuDropdown() {
    return getCachedQuery('userMenuDropdown', () => {
        const box = getCachedElementById('userMenuBox');
        return box ? box.querySelector('.dropdown-menu') : null;
    });
}

function showPrivateProfileOverlay() {
    const privatePage = getCachedElementById('privateProfilePage');
    if (!privatePage) return;
    privatePage.classList.remove('initially-hidden');
    privatePage.classList.remove('is-hidden');
    privatePage.classList.add('is-flex');
}

function hidePrivateProfileOverlay() {
    const privatePage = getCachedElementById('privateProfilePage');
    if (!privatePage) return;
    privatePage.classList.remove('is-flex');
    privatePage.classList.add('is-hidden');
}

const MOBILE_BENCHMARK_GEOMETRY_PROPS = [
    '--mobile-cave-start',
    '--mobile-bg-stripe-left',
    '--mobile-bg-stripe-width',
    '--mobile-cave-header-left',
    '--mobile-cave-header-width',
    '--mobile-ranks-top-gap',
    '--mobile-cave-row-height',
    '--mobile-cave-row-gap',
    '--mobile-score-left',
    '--mobile-score-width',
    '--mobile-slanted-left',
    '--mobile-slanted-width',
    '--mobile-progression-width',
    '--mobile-rating-gap',
    '--mobile-rating-left',
    '--mobile-rating-width',
    '--mobile-active-outline-left',
    '--mobile-active-outline-width',
    '--mobile-benchmark-track-width',
    '--mobile-benchmark-scroll-width',
    '--mobile-cave-label-width',
    '--mobile-cave-label-gap',
    '--mobile-rank-box-left',
    '--mobile-rank-box-width',
    '--mobile-ranks-strip-left',
    '--mobile-ranks-strip-width',
    '--mobile-ranks-strip-step',
    '--mobile-roman-pos-0',
    '--mobile-roman-pos-1',
    '--mobile-roman-pos-2',
    '--mobile-roman-pos-3',
    '--mobile-roman-pos-4'
];

let mobileBenchmarkGeometryRafId = 0;
const MOBILE_STRIPE_GROUPS = [[0, 1], [2, 3], [4, 5], [6], [7, 8], [9, 10], [11, 12], [13]];

function scheduleMobileBenchmarkGeometrySync(options = {}) {
    const {
        immediate = false,
        settleFrames = 1
    } = options;
    if (immediate) syncMobileBenchmarkGeometry();
    if (mobileBenchmarkGeometryRafId) {
        cancelAnimationFrame(mobileBenchmarkGeometryRafId);
        mobileBenchmarkGeometryRafId = 0;
    }
    const frames = Math.max(1, Math.round(Number(settleFrames) || 1));
    let framesRemaining = frames;
    const step = () => {
        syncMobileBenchmarkGeometry();
        framesRemaining -= 1;
        if (framesRemaining > 0) {
            mobileBenchmarkGeometryRafId = requestAnimationFrame(step);
            return;
        }
        mobileBenchmarkGeometryRafId = 0;
    };
    mobileBenchmarkGeometryRafId = requestAnimationFrame(step);
}

function restoreBaseStripeGeometry() {
    document.querySelectorAll('.bg-stripe').forEach((stripe) => {
        if (!(stripe instanceof HTMLElement)) return;
        if (!stripe.dataset.baseTop && stripe.style.top) stripe.dataset.baseTop = stripe.style.top;
        if (!stripe.dataset.baseHeight && stripe.style.height) stripe.dataset.baseHeight = stripe.style.height;
        if (stripe.dataset.baseTop) stripe.style.setProperty('top', stripe.dataset.baseTop);
        else stripe.style.removeProperty('top');
        if (stripe.dataset.baseHeight) stripe.style.setProperty('height', stripe.dataset.baseHeight);
        else stripe.style.removeProperty('height');
        stripe.style.removeProperty('left');
        stripe.style.removeProperty('width');
    });
}

function clearMobileBenchmarkGeometryVars() {
    if (!document.body) return;
    MOBILE_BENCHMARK_GEOMETRY_PROPS.forEach((prop) => {
        document.body.style.removeProperty(prop);
    });
    delete document.body.dataset.mobileTrackShiftApplied;
    restoreBaseStripeGeometry();
}

function syncMobileBenchmarkGeometry() {
    const body = document.body;
    if (!body || !body.classList.contains('mobile-layout-active')) {
        clearMobileBenchmarkGeometryVars();
        return;
    }

    const container = getCachedQuery('benchmarkContainer', () => document.querySelector('.container'));
    const middleBox = getCachedQuery('benchmarkMiddleBox', () => document.querySelector('.middle-box'));
    const firstRow = container ? container.querySelector('.ranks-bars') : null;
    const rows = container ? Array.from(container.querySelectorAll('.ranks-bars')) : [];
    const stripes = container ? Array.from(container.querySelectorAll('.bg-stripe')) : [];
    const caveLabel = firstRow ? firstRow.querySelector('.rank-bar.cave-cell-label') : null;
    const visibleTrackBars = firstRow
        ? Array.from(firstRow.querySelectorAll('.rank-bar')).filter((bar) => (
            bar
            && !bar.classList.contains('cave-cell-label')
            && bar.getClientRects().length > 0
        ))
        : [];
    if (!container || !firstRow || !caveLabel || !visibleTrackBars.length) return;

    // Always measure from the base mobile rules so repeated resizes do not
    // compound previously applied geometry overrides.
    clearMobileBenchmarkGeometryVars();

    const containerRect = container.getBoundingClientRect();
    const rowRect = firstRow.getBoundingClientRect();
    const caveRect = caveLabel.getBoundingClientRect();
    const firstTrackRect = visibleTrackBars[0].getBoundingClientRect();
    const lastTrackRect = visibleTrackBars[visibleTrackBars.length - 1].getBoundingClientRect();
    if (!containerRect.width || !rowRect.width || !caveRect.width || !firstTrackRect.width || !lastTrackRect.width) return;

    const firstScoreWrapper = container.querySelector('.score-input-wrapper');
    const firstRatingValue = container.querySelector('.rating-value');
    const ranksWrapper = document.querySelector('.ranks-wrapper');
    const rankBox = document.querySelector('.rounded-inner-box');
    const progressBar = document.querySelector('.progress-bar');
    const rankLines = progressBar
        ? Array.from(progressBar.querySelectorAll('.rank-line')).filter((line) => line.getClientRects().length > 0)
        : [];
    const secondRow = rows.length > 1 ? rows[1] : null;
    const secondRowRect = secondRow ? secondRow.getBoundingClientRect() : null;
    const scoreRect = firstScoreWrapper ? firstScoreWrapper.getBoundingClientRect() : null;
    const ratingRect = firstRatingValue ? firstRatingValue.getBoundingClientRect() : null;
    const root = document.documentElement;
    const mobileScale = parseFloat(root.style.getPropertyValue('--mobile-layout-scale')) || 1;
    const clampGap = (value, fallback) => Math.max(6, Math.min(14, Math.round(Number.isFinite(value) ? value : fallback)));
    const toPx = (value) => `${Math.round(Math.max(0, Number(value) || 0))}px`;
    const appliedTrackShift = Number.parseFloat(body.dataset.mobileTrackShiftApplied || '0') || 0;

    const caveStart = caveRect.left - rowRect.left;
    const caveLabelWidth = caveRect.width;
    const measuredFirstTrackLeft = (firstTrackRect.left - rowRect.left) - appliedTrackShift;
    const trackCenters = visibleTrackBars.map((bar) => {
        const rect = bar.getBoundingClientRect();
        return ((rect.left + (rect.width / 2)) - rowRect.left) - appliedTrackShift;
    });
    const slantedWidth = lastTrackRect.right - firstTrackRect.left;
    const scoreWidth = scoreRect && scoreRect.width ? scoreRect.width : 70;
    const measuredCaveScoreGap = scoreRect && scoreRect.width
        ? (scoreRect.left - caveRect.right)
        : (5 * mobileScale);
    const caveScoreGap = Math.max(6, Math.min(18, Math.round(Number.isFinite(measuredCaveScoreGap) ? measuredCaveScoreGap : (5 * mobileScale))));
    const desiredTrackShift = Math.max(3, Math.min(8, Math.round((caveScoreGap * 0.5) + mobileScale)));
    const scoreLeft = caveStart + caveLabelWidth + caveScoreGap;
    const actualVisualTrackGap = measuredFirstTrackLeft - (scoreLeft + scoreWidth);
    const slantedVisualCompensation = Math.max(0, Math.round(caveScoreGap - actualVisualTrackGap));
    const caveLabelGap = scoreWidth + (caveScoreGap * 2) + slantedVisualCompensation;
    const slantedLeft = caveStart + caveLabelWidth + caveLabelGap + desiredTrackShift;
    const ranksStripStep = trackCenters.length > 1
        ? trackCenters.slice(1).reduce((sum, center, index) => sum + (center - trackCenters[index]), 0) / (trackCenters.length - 1)
        : slantedWidth;
    const ranksStripLeft = (trackCenters.length
        ? (trackCenters[0] - (ranksStripStep / 2))
        : (slantedLeft - desiredTrackShift)) + desiredTrackShift;
    const ranksStripWidth = ranksStripStep * Math.max(trackCenters.length, 1);
    const ratingWidth = ratingRect && ratingRect.width ? ratingRect.width : 90;
    const measuredRatingGap = ratingRect && ratingRect.width
        ? (ratingRect.left - lastTrackRect.right)
        : (10 * mobileScale);
    const ratingRightGap = 0;
    const ratingLeftGap = Math.max(
        -14,
        Math.min(0, Math.round((Number.isFinite(measuredRatingGap) ? measuredRatingGap : (10 * mobileScale)) - 12))
    );
    const ratingLeft = slantedLeft + slantedWidth + ratingLeftGap;
    const benchmarkTrackWidth = ratingLeft + ratingWidth + ratingRightGap;
    const bgStripeLeft = (firstTrackRect.left - containerRect.left) - appliedTrackShift + desiredTrackShift;
    const bgStripeWidth = Math.max(0, benchmarkTrackWidth - bgStripeLeft);
    const ranksWrapperRect = ranksWrapper ? ranksWrapper.getBoundingClientRect() : null;
    const progressBarRect = progressBar ? progressBar.getBoundingClientRect() : null;
    const progressWidth = progressBarRect && progressBarRect.width ? progressBarRect.width : slantedWidth;
    const defaultRomanPositions = [0.015, 0.215, 0.415, 0.615, 0.815].map((ratio) => progressWidth * ratio);
    const rankLineCenters = progressBarRect
        ? rankLines.map((line) => {
            const rect = line.getBoundingClientRect();
            return (rect.left + (rect.width / 2)) - progressBarRect.left;
        }).filter((center) => Number.isFinite(center))
        : [];
    const romanStep = rankLineCenters.length > 1
        ? rankLineCenters.slice(1).reduce((sum, center, index) => sum + (center - rankLineCenters[index]), 0) / (rankLineCenters.length - 1)
        : (defaultRomanPositions[1] - defaultRomanPositions[0]);
    const romanPositions = defaultRomanPositions.slice();
    if (rankLineCenters.length >= 4) {
        // Tick 1 maps to IV, then III, II, I. V sits one step before tick 1.
        romanPositions[0] = Math.max(0, Math.min(progressWidth, rankLineCenters[0] - romanStep));
        romanPositions[1] = Math.max(0, Math.min(progressWidth, rankLineCenters[0]));
        romanPositions[2] = Math.max(0, Math.min(progressWidth, rankLineCenters[1]));
        romanPositions[3] = Math.max(0, Math.min(progressWidth, rankLineCenters[2]));
        romanPositions[4] = Math.max(0, Math.min(progressWidth, rankLineCenters[3]));
    }
    const progressStartWithinWrapper = ranksWrapperRect
        ? ((progressBarRect ? progressBarRect.left : firstTrackRect.left) - ranksWrapperRect.left)
        : Math.max(0, bgStripeLeft - (15 * mobileScale));
    const availableRankBoxWidth = Math.max(0, progressStartWithinWrapper);
    const naturalRankBoxWidth = rankBox
        ? Math.max(rankBox.scrollWidth || 0, rankBox.getBoundingClientRect().width || 0)
        : (300 * mobileScale);
    const preferredRankBoxWidth = Math.max(180 * mobileScale, Math.min(naturalRankBoxWidth || (300 * mobileScale), 300 * mobileScale));
    const fittedRankBoxWidth = Math.max(0, availableRankBoxWidth - (10 * mobileScale));
    const rankBoxWidth = Math.round(fittedRankBoxWidth > 0 ? Math.min(preferredRankBoxWidth, fittedRankBoxWidth) : preferredRankBoxWidth);
    const rankBoxLeft = Math.max(0, Math.round((availableRankBoxWidth - rankBoxWidth) / 2));
    const caveRowHeight = caveRect.height || (scoreRect ? scoreRect.height : 36);
    const caveRowGap = secondRowRect
        ? Math.max(0, secondRowRect.top - rowRect.bottom)
        : (4 * mobileScale);
    const ranksTopGap = Math.max(0, rowRect.top - containerRect.top);
    const caveHeaderWidth = Math.min(Math.max(48 * mobileScale, 44), caveLabelWidth);
    const benchmarkScrollWidth = benchmarkTrackWidth;

    body.style.setProperty('--mobile-cave-start', toPx(caveStart));
    body.style.setProperty('--mobile-bg-stripe-left', toPx(bgStripeLeft));
    body.style.setProperty('--mobile-bg-stripe-width', toPx(bgStripeWidth));
    body.style.setProperty('--mobile-cave-header-left', toPx(caveStart));
    body.style.setProperty('--mobile-cave-header-width', toPx(caveHeaderWidth));
    body.style.setProperty('--mobile-ranks-top-gap', toPx(ranksTopGap));
    body.style.setProperty('--mobile-cave-row-height', toPx(caveRowHeight));
    body.style.setProperty('--mobile-cave-row-gap', toPx(caveRowGap));
    body.style.setProperty('--mobile-score-left', toPx(scoreLeft));
    body.style.setProperty('--mobile-score-width', toPx(scoreWidth));
    body.style.setProperty('--mobile-slanted-left', toPx(slantedLeft));
    body.style.setProperty('--mobile-slanted-width', toPx(slantedWidth));
    body.style.setProperty('--mobile-progression-width', toPx(slantedWidth));
    body.style.setProperty('--mobile-rating-gap', toPx(ratingLeftGap));
    body.style.setProperty('--mobile-rating-left', toPx(ratingLeft));
    body.style.setProperty('--mobile-rating-width', toPx(ratingWidth));
    body.style.setProperty('--mobile-active-outline-left', toPx(caveStart));
    body.style.setProperty('--mobile-active-outline-width', toPx(benchmarkTrackWidth - caveStart));
    body.style.setProperty('--mobile-benchmark-track-width', toPx(benchmarkTrackWidth));
    body.style.setProperty('--mobile-benchmark-scroll-width', toPx(benchmarkScrollWidth));
    body.style.setProperty('--mobile-cave-label-width', toPx(caveLabelWidth));
    body.style.setProperty('--mobile-cave-label-gap', toPx(caveLabelGap + desiredTrackShift));
    body.style.setProperty('--mobile-rank-box-left', toPx(rankBoxLeft));
    body.style.setProperty('--mobile-rank-box-width', toPx(rankBoxWidth));
    body.style.setProperty('--mobile-ranks-strip-left', toPx(ranksStripLeft));
    body.style.setProperty('--mobile-ranks-strip-width', toPx(ranksStripWidth));
    body.style.setProperty('--mobile-ranks-strip-step', toPx(ranksStripStep));
    romanPositions.forEach((position, index) => {
        body.style.setProperty(`--mobile-roman-pos-${index}`, toPx(position));
    });
    body.dataset.mobileTrackShiftApplied = String(desiredTrackShift);

    MOBILE_STRIPE_GROUPS.forEach((group, index) => {
        const stripe = stripes[index];
        const firstGroupRow = rows[group[0]];
        const lastGroupRow = rows[group[group.length - 1]];
        if (!(stripe instanceof HTMLElement) || !firstGroupRow || !lastGroupRow) return;
        if (!stripe.dataset.baseTop && stripe.style.top) stripe.dataset.baseTop = stripe.style.top;
        if (!stripe.dataset.baseHeight && stripe.style.height) stripe.dataset.baseHeight = stripe.style.height;
        const firstGroupRect = firstGroupRow.getBoundingClientRect();
        const lastGroupRect = lastGroupRow.getBoundingClientRect();
        const stripeTop = firstGroupRect.top - containerRect.top;
        const stripeHeight = lastGroupRect.bottom - firstGroupRect.top;
        stripe.style.setProperty('top', `${Math.round(stripeTop)}px`, 'important');
        stripe.style.setProperty('height', `${Math.round(stripeHeight)}px`, 'important');
        stripe.style.setProperty('left', `${Math.round(bgStripeLeft)}px`, 'important');
        stripe.style.setProperty('width', `${Math.round(bgStripeWidth)}px`, 'important');
    });
}

function syncMobileHoneycombMask() {
    const rankBox = getCachedQuery('roundedInnerBox', () => document.querySelector('.rounded-inner-box'));
    const isMobile = isMobileViewport();
    const root = document.documentElement;
    if (root) {
        if (isMobile) {
            const vv = window.visualViewport || null;
            const viewportWidth = vv && vv.width ? vv.width : (window.innerWidth || root.clientWidth || 0);
            const viewportHeight = vv && vv.height ? vv.height : (window.innerHeight || root.clientHeight || 0);
            const baseHeight = parseFloat(root.style.getPropertyValue('--mobile-safe-vh-base')) || viewportHeight || 0;
            const referenceShortSide = 390;
            const referenceHeight = 932;
            const shortSide = Math.min(
                Math.max(viewportWidth || referenceShortSide, 1),
                Math.max(baseHeight || viewportHeight || referenceShortSide, 1)
            );
            const clampedShortSide = Math.max(320, Math.min(430, shortSide || referenceShortSide));
            const mobileScale = Math.max(0.84, Math.min(1.08, clampedShortSide / referenceShortSide));
            const heightRatio = Math.max(0.82, Math.min(1, (baseHeight || viewportHeight || referenceHeight) / referenceHeight));
            root.style.setProperty('--mobile-layout-short-side', `${Math.round(clampedShortSide)}px`);
            root.style.setProperty('--mobile-layout-scale', mobileScale.toFixed(4));
            root.style.setProperty('--mobile-layout-height-fit', heightRatio.toFixed(4));
        } else {
            root.style.removeProperty('--mobile-layout-short-side');
            root.style.removeProperty('--mobile-layout-scale');
            root.style.removeProperty('--mobile-layout-height-fit');
        }
    }
    if (rankBox) {
        rankBox.classList.toggle('rounded-inner-box--mobile-mask', isMobile);
    }
    document.body.classList.toggle('mobile-layout-active', isMobile);
    const container = getCachedQuery('benchmarkContainer', () => document.querySelector('.container'));
    if (container) container.classList.toggle('mobile-layout-active', isMobile);
    scheduleMobileBenchmarkGeometrySync({ immediate: true, settleFrames: 3 });
}

function initStartupSideEffects() {
    // Remove legacy persistent account id so it no longer appears in browser local storage.
    removeItem(LEGACY_ACCOUNT_ID_STORAGE_KEY);
    Slugs.restorePathFromFallback();
    normalizeBenchmarkStaticAssetPaths();
    window.addEventListener('resize', syncMobileHoneycombMask);
    window.addEventListener('orientationchange', syncMobileHoneycombMask, { passive: true });
    window.addEventListener('pageshow', syncMobileHoneycombMask, { passive: true });
    window.addEventListener('load', () => {
        syncMobileHoneycombMask();
        scheduleMobileBenchmarkGeometrySync({ settleFrames: 4 });
    }, { passive: true });
    document.addEventListener('benchmark:mobile-layout-settled', () => {
        scheduleMobileBenchmarkGeometrySync({ settleFrames: 3 });
    });
    document.addEventListener('benchmark:scores-loaded', () => {
        scheduleMobileBenchmarkGeometrySync({ settleFrames: 2 });
    });
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', syncMobileHoneycombMask, { passive: true });
    }
    if (document.fonts && typeof document.fonts.ready?.then === 'function') {
        document.fonts.ready.then(() => {
            scheduleMobileBenchmarkGeometrySync({ settleFrames: 3 });
        }).catch(() => {});
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', syncMobileHoneycombMask);
    } else {
        syncMobileHoneycombMask();
    }
}

function isLocalDebugHost() {
    if (typeof window === "undefined" || !window.location) return false;
    const host = window.location.hostname || "";
    return host === "localhost" || host === "127.0.0.1";
}

function applyMountConfigVisual(value) {
    const mount = normalizeMountConfig(value);
    const mountBox = getCachedElementById('mountBox');
    const mountImg = getCachedElementById('mountConfigImage');
    if (mountBox) mountBox.dataset.value = mount;
    if (mountImg) {
        mountImg.src = resolveBenchmarkAssetUrl(MOUNT_CONFIG_IMAGES[mount]);
        mountImg.alt = getMountConfigLabel(mount, currentLanguage);
    }
    if (mountBox) {
        mountBox.querySelectorAll('.dropdown-item').forEach(item => {
            const itemValue = item.getAttribute('data-value');
            item.classList.toggle('active', itemValue === mount);
            const optionImg = item.querySelector('.mount-option-image');
            if (optionImg && itemValue) {
                optionImg.src = resolveBenchmarkAssetUrl(MOUNT_CONFIG_IMAGES[itemValue] || "");
                optionImg.alt = getMountConfigLabel(itemValue, currentLanguage);
            }
        });
    }
}

function syncConfigDropdownActiveStates(config) {
    const resolved = config && typeof config === 'object' ? config : {};
    const mappings = [
        { boxId: 'platformBox', value: resolved.platform || '' },
        { boxId: 'timeBox', value: resolved.time || '' },
        { boxId: 'statBox', value: resolved.stat || '' }
    ];

    mappings.forEach(({ boxId, value }) => {
        const box = getCachedElementById(boxId);
        if (!box) return;
        if (value) box.dataset.value = value;
        box.querySelectorAll('.dropdown-item').forEach((item) => {
            const itemValue = item.getAttribute('data-value') || item.textContent.trim();
            item.classList.toggle('active', itemValue === value);
        });
    });
}

async function saveUserData(data) {
    await persistUserData(data, { label: "user data" });
}

async function saveSettings() {
    if (state.isViewMode) return;
    const settings = {
        language: currentLanguage,
        theme: ThemeUI.getCurrentTheme(),
        autoRankTheme: ThemeUI.isAutoRankThemeEnabled() ? 'true' : 'false',
        visibility: visibilitySelect ? visibilitySelect.value : 'everyone',
        defaultConfig: readDefaultConfig(),
        customTheme: {
            enabled: ThemeUI.isCustomThemeEnabled() ? 'true' : 'false',
            name: ThemeUI.getCustomThemeName(),
            hex: ThemeUI.getCustomThemeHex(),
            saved: ThemeUI.getSavedCustomThemes()
        },
        rankThemeUnlock: String(ThemeUI.getMaxUnlockedRankIndex()),
        pacmanMode: state.pacmanModeEnabled ? 'true' : 'false',
        subInputMode: state.subInputModeEnabled ? 'true' : 'false'
    };
    await saveUserData({ settings });
}

function initModuleConfigurations() {
    if (moduleConfigurationsInitialized) return;
    moduleConfigurationsInitialized = true;
    ThemeUI.configure({
        saveSettings,
        getConfigKey,
        getConfigLookupKeys,
        calculateRankFromData
    });

    ScoreManager.configure({
        onRatingsUpdated: handleRatingsUpdated
    });

    ShareManager.configure({
        applyConfig
    });

    ViewModeManager.configure({
        showPrivateProfileOverlay,
        hidePrivateProfileOverlay,
        syncAuthenticatedBackNavigationGuard,
        applyMountConfigVisual,
        syncPlatformLabelColor,
        renderSeasonalTrophyList: TrophyUI.renderSeasonalTrophyList,
        openImageViewer,
        showConfirmModal,
        updateViewProfileUrl: Slugs.updateViewProfileUrl
    });

    FriendsUI.configure({
        calculateRankFromData,
        enterViewMode: ViewModeManager.enterViewMode,
        closeFriendsModal: closeFriendsModalUI,
        showConfirmModal,
        updateNotificationVisibility,
        onFriendRequestsLoaded: (uid, requests, requestsTabActive) => {
            AuthManager.syncFriendRequestState(uid, requests, requestsTabActive);
        }
    });

    languageController = createLanguageController({
        maskedAccountId: MASKED_ACCOUNT_ID,
        setupMobileSettingsDropdowns: () => {
            if (settingsUIController && typeof settingsUIController.setupMobileSettingsDropdowns === "function") {
                settingsUIController.setupMobileSettingsDropdowns();
            }
        },
        renderTrophies: TrophyUI.renderTrophies,
        renderAchievementsIfOpen: () => {
            const achievementsModalEl = getCachedElementById("achievementsModal");
            if (achievementsModalEl && achievementsModalEl.classList.contains("show")) {
                AchievementsUI.renderAchievements(openImageViewer, showConfirmModal);
            }
        },
        refreshAchievementsProgress: () => AchievementsUI.updateAchievementsProgress(),
        refreshFriendsModalIfOpen: () => {
            const friendsModalEl = getCachedElementById("friendsModal");
            if (friendsModalEl && friendsModalEl.classList.contains("show")) {
                if (friendsModalController && typeof friendsModalController.refreshActiveTab === "function") {
                    friendsModalController.refreshActiveTab().catch(console.error);
                    return;
                }
                Promise.all([
                    FriendsUI.loadFriendsList(),
                    FriendsUI.loadFriendRequests(),
                    FriendsUI.loadRemoveFriendsList()
                ]).catch(console.error);
            }
        },
        renderGuildsList: () => {
            ProfileUI.renderGuildsList(addGuildBtn);
        },
        applyMountConfigVisual,
        getCurrentConfig,
        syncResetConfigUI,
        updateCustomSwatches: ThemeUI.updateCustomSwatches,
        updateCustomThemeUI: ThemeUI.updateCustomThemeUI,
        applyTheme: ThemeUI.applyTheme,
        saveSettings
    });

    settingsStateController = createSettingsStateController({
        t,
        getCurrentLanguage: () => currentLanguage,
        defaultMountConfig: DEFAULT_MOUNT_CONFIG,
        normalizeMountConfig,
        getCurrentConfig,
        buildConfigKey,
        getConfigKey,
        getConfigLookupKeys,
        readDefaultConfig,
        getStartupConfigDefaults,
        ThemeUI,
        PacmanUI,
        ScoreManager,
        RankingUI,
        applyLanguage,
        applyConfig,
        refreshRadarVisuals,
        saveSettings,
        showConfirmModal
    });

    topNavController = createTopNavController({
        state,
        getUserMenuDropdown: getCachedUserMenuDropdown,
        bindModalOverlayQuickClose
    });
}

function applyLanguage(lang, persist = true) {
    if (!languageController) return;
    languageController.applyLanguage(lang, persist);
}

function applyStoredStartupLanguage() {
    const storedLang = readString(LANGUAGE_STORAGE_KEY, "en") || "en";
    applyLanguage(storedLang, false);
}

function syncResetConfigUI() {
    if (!settingsStateController) return;
    settingsStateController.syncResetConfigUI();
}

function syncPlatformLabelColor(platform) {
    const platformText = getCachedElementById('platformText');
    if (!platformText) return;
    platformText.classList.toggle('platform-label--mobile', platform === 'Mobile');
    platformText.classList.toggle('platform-label--pc', platform === 'PC');
}

function applyConfig(config, options = {}) {
    const animateRowTransition = options.animateRowTransition === true;
    const preserveTheme = options.preserveTheme === true || (isMobileViewport() && animateRowTransition);
    const skipSaveCurrent = options.skipSaveCurrent === true;
    const resolvedConfig = {
        platform: config && config.platform ? config.platform : 'Mobile',
        time: config && config.time ? config.time : '5 Min',
        stat: config && config.stat ? config.stat : 'Baddy Kills',
        mount: normalizeMountConfig((config && config.mount) || DEFAULT_MOUNT_CONFIG)
    };
    if (!skipSaveCurrent) {
        ScoreManager.saveCurrentScores();
        if (isLocalDebugHost() && auth.currentUser) {
            ScoreManager.saveSavedScores().catch(console.error);
        }
    }
    setCurrentConfigState(resolvedConfig);
    const platformText = getCachedElementById('platformText');
    const timeText = getCachedElementById('timeText');
    const statText = getCachedElementById('statText');

    if (platformText && resolvedConfig.platform) {
        platformText.textContent = resolvedConfig.platform;
        syncPlatformLabelColor(resolvedConfig.platform);
    }
    if (timeText && resolvedConfig.time) timeText.textContent = resolvedConfig.time;
    if (statText && resolvedConfig.stat) statText.textContent = resolvedConfig.stat;
    if (resolvedConfig.mount) applyMountConfigVisual(resolvedConfig.mount);
    syncConfigDropdownActiveStates(resolvedConfig);

    const keyCandidates = getConfigLookupKeys();
    let themeForConfig = 'default';
    for (const key of keyCandidates) {
        if (state.savedConfigThemes[key]) {
            themeForConfig = state.savedConfigThemes[key];
            break;
        }
    }
    if (!preserveTheme) {
        ThemeUI.applyTheme(themeForConfig, false);
    }

    state.lastMainRankIndex = -1;
    RankingUI.updateScoreRequirements(ScoreManager.getBaseScoresForConfig(), animateRowTransition);
    ScoreManager.loadScores();
    syncResetConfigUI();
    ScoreManager.loadCaveLinks();
}

function syncSettingsUI() {
    if (!settingsStateController) return;
    settingsStateController.syncSettingsUI();
}

function applyStoredSettings() {
    if (!settingsStateController) return;
    settingsStateController.applyStoredSettings();
}

function setupMountDropdown() {
    const mountConfigImages = Object.fromEntries(
        Object.entries(MOUNT_CONFIG_IMAGES).map(([key, value]) => {
            return [key, resolveBenchmarkAssetUrl(value)];
        })
    );
    setupMountDropdownUI({
        mountOptions: CONFIG_OPTIONS.mount,
        mountConfigImages,
        getMountConfigLabel,
        getLanguage: () => currentLanguage
    });
}

function setupConfigDropdowns() {
    setupConfigDropdownsUI({
        getCurrentConfig,
        applyConfig,
        updateNotificationVisibility
    });
}

function updateNotificationVisibility() {
    if (!topNavController) return;
    topNavController.updateNotificationVisibility();
}

function resetSelectedScores() {
    if (!settingsStateController) return;
    settingsStateController.resetSelectedScores();
}

function resetAllConfigurations() {
    if (!settingsStateController) return;
    settingsStateController.resetAllConfigurations();
}

function refreshRadarVisuals() {
    RadarUI.updateRadar();
    RadarUI.updateBarGraph();
}

function applyAutoRankThemeForCurrentConfig() {
    if (state.isViewMode || !ThemeUI.isAutoRankThemeEnabled()) return;
    const rankIndex = Number.isFinite(state.lastMainRankIndex) ? Math.floor(state.lastMainRankIndex) : 0;
    const unlockLimit = ThemeUI.getThemeUnlockRankLimit();
    const boundedRank = Math.max(0, Math.min(rankIndex, unlockLimit));
    const targetTheme = boundedRank > 0 ? `rank-${boundedRank}` : 'default';
    const currentTheme = ThemeUI.getCurrentTheme();
    const configKey = getConfigKey();
    const mappedTheme = state.savedConfigThemes[configKey] || 'default';
    if (currentTheme === targetTheme && mappedTheme === targetTheme) return;
    ThemeUI.applyTheme(targetTheme, true);
}

function handleRatingsUpdated() {
    refreshRadarVisuals();
    applyAutoRankThemeForCurrentConfig();
}

function initRulesModalBindings() {
    if (!topNavController) return;
    topNavController.initRulesModalBindings();
}

const handleDefaultConfigChange = () => {
    if (!settingsStateController) return;
    settingsStateController.handleDefaultConfigChange();
};

function initSettingsUIBindings() {
    settingsUIController = initSettingsUI({
        BENCHMARK_LANGUAGE_LABELS,
        applyLanguage,
        syncSettingsUI,
        saveSettings,
        resetSelectedScores,
        resetAllConfigurations,
        handleDefaultConfigChange,
        bindModalOverlayQuickClose
    });
}

const privateHomeBtn = getCachedElementById('privateProfileHomeBtn');
function initPrivateHomeBinding() {
    if (privateHomeBtn) {
        privateHomeBtn.addEventListener('click', () => {
            window.location.href = Slugs.getBenchmarkAppEntryUrl();
        });
    }
}

// Friends Logic
const friendsMenuBtn = getCachedElementById('friendsMenuBtn');
const friendsModal = getCachedElementById('friendsModal');
const closeFriendsModal = getCachedElementById('closeFriendsModal');
const friendIdInput = getCachedElementById('friendIdInput');
const addFriendBtn = getCachedElementById('addFriendBtn');
const addFriendMessage = getCachedElementById('addFriendMessage');
const friendList = getCachedElementById('friendList');
const sentRequestsList = getCachedElementById('sentRequestsList');
const friendRequestsList = getCachedElementById('friendRequestsList');
const exitViewModeBtn = getCachedElementById('exitViewModeBtn');
const exitViewModeContainer = getCachedElementById('exitViewModeContainer');
const tabFriendsList = getCachedElementById('tabFriendsList');
const tabFriendRequests = getCachedElementById('tabFriendRequests');
const tabRemoveFriends = getCachedElementById('tabRemoveFriends');
const friendsListContent = getCachedElementById('friendsListContent');
const friendRequestsContent = getCachedElementById('friendRequestsContent');
const removeFriendsContent = getCachedElementById('removeFriendsContent');
const removeFriendsList = getCachedElementById('removeFriendsList');

function closeFriendsModalUI() {
    if (friendsModalController && typeof friendsModalController.closeFriendsModal === 'function') {
        friendsModalController.closeFriendsModal();
        return;
    }
    if (friendsModal) friendsModal.classList.remove('show');
    resetFriendAccountIdVisibility();
    updateNotificationVisibility();
}

function initFriendsModalBindings() {
    friendsModalController = initFriendsModalController({
        friendsMenuBtn,
        friendsModal,
        closeFriendsModal,
        friendIdInput,
        addFriendBtn,
        addFriendMessage,
        friendList,
        sentRequestsList,
        friendRequestsList,
        tabFriendsList,
        tabFriendRequests,
        tabRemoveFriends,
        friendsListContent,
        friendRequestsContent,
        removeFriendsContent,
        removeFriendsList,
        bindModalOverlayQuickClose,
        updateNotificationVisibility,
        markCurrentFriendRequestsViewed: AuthManager.markCurrentFriendRequestsViewed
    });

    if (exitViewModeBtn) {
        exitViewModeBtn.addEventListener('click', async () => {
            await runExitViewMode({
                user: auth.currentUser,
                exitViewModeContainer,
                loadUserProfile,
                applyStoredSettings,
                syncAuthenticatedBackNavigationGuard
            });
        });
    }
}

function initTrophyUI() {
    TrophyUI.initTrophySystem({
        saveUserData,
        bindModalOverlayQuickClose
    });
}

function openImageViewer(src, title = '') {
    openImageViewerModal(
        {
            imageViewerModal: getCachedElementById("imageViewerModal"),
            imageViewerImg: getCachedElementById("imageViewerImg"),
            imageViewerTitle: getCachedElementById("imageViewerTitle")
        },
        src,
        title
    );
}

function closeImageViewerUI() {
    closeImageViewerModal({
        imageViewerModal: getCachedElementById("imageViewerModal")
    });
}

function initCaveEnhancements() {
    normalizeCaveCellImagePaths();
    bindCaveCellImageViewer();
    setupCavePlayEditorsModule();
}

function initAccountIdUIBindings() {
    setupAccountIdUI();
    initAccountId();
}

// Profile Modal Logic
const profilePicInput = getCachedElementById('profilePicInput');
const cropperContainer = getCachedElementById('cropperContainer');
const cropperImage = getCachedElementById('cropperImage');
const newGuildInputBox = getCachedElementById('newGuildInputBox');

async function loadUserProfile(user) {
    await AuthManager.loadUserProfile(user, {
        initOnboarding,
        applyLanguage,
        applyConfig,
        syncSettingsUI,
        syncPacmanUI: () => PacmanUI.syncPacmanUI(refreshRadarVisuals),
        applyActiveAccountId,
        rememberAccountIdForUid,
        getRememberedAccountIdForUid,
        generateAccountId
    });
}

// Confirmation Modal Logic

function showConfirmModal(title, message, callback) {
    if (confirmModalController) {
        confirmModalController.showConfirmModal(title, message, callback);
        return;
    }

    const confirmModal = getCachedElementById("confirmModal");
    const confirmTitle = getCachedElementById("confirmTitle");
    const confirmMessage = getCachedElementById("confirmMessage");
    const confirmOkBtn = getCachedElementById("confirmOkBtn");
    const confirmCancelBtn = getCachedElementById("confirmCancelBtn");
    if (!confirmModal || !confirmOkBtn || !confirmCancelBtn) return;

    if (manualConfirmCleanup) {
        manualConfirmCleanup();
        manualConfirmCleanup = null;
    }

    if (confirmTitle) confirmTitle.textContent = title;
    if (confirmMessage) confirmMessage.textContent = message;
    confirmModal.classList.remove("closing");
    confirmModal.classList.add("show");

    let cleaned = false;
    const cleanup = () => {
        if (cleaned) return;
        cleaned = true;
        confirmOkBtn.removeEventListener("click", handleOk, true);
        confirmCancelBtn.removeEventListener("click", handleCancel, true);
        confirmModal.removeEventListener("click", handleOverlayClick, true);
        confirmModal.classList.remove("show");
        confirmModal.classList.add("closing");
        setTimeout(() => {
            confirmModal.classList.remove("closing");
        }, 200);
        if (manualConfirmCleanup === cleanup) {
            manualConfirmCleanup = null;
        }
    };

    const handleOk = (e) => {
        e.preventDefault();
        e.stopPropagation();
        cleanup();
        if (typeof callback === "function") callback();
    };

    const handleCancel = (e) => {
        e.preventDefault();
        e.stopPropagation();
        cleanup();
    };

    const handleOverlayClick = (e) => {
        if (e.target !== confirmModal) return;
        e.preventDefault();
        e.stopPropagation();
        cleanup();
    };

    confirmOkBtn.addEventListener("click", handleOk, true);
    confirmCancelBtn.addEventListener("click", handleCancel, true);
    confirmModal.addEventListener("click", handleOverlayClick, true);
    manualConfirmCleanup = cleanup;
}

const addGuildBtn = getCachedElementById('addGuildBtn');

function initModalControllers() {
    confirmModalController = createConfirmModalController({
        bindModalOverlayQuickClose
    });

    const imageViewerModal = getCachedElementById("imageViewerModal");
    const closeImageViewerModalBtn = getCachedElementById("closeImageViewerModal");
    if (closeImageViewerModalBtn) {
        closeImageViewerModalBtn.addEventListener("click", closeImageViewerUI);
    }
    if (imageViewerModal) {
        bindModalOverlayQuickClose(imageViewerModal, closeImageViewerUI);
    }

    initSecondaryModals({
        openImageViewer,
        showConfirmModal,
        bindModalOverlayQuickClose
    });

    initProfileModalController({
        state,
        t,
        bindModalOverlayQuickClose,
        addGuildBtn,
        profilePicInput,
        cropperContainer,
        cropperImage,
        newGuildInputBox,
        showConfirmModal,
        getLoginUrl: Slugs.getBenchmarkLoginUrl
    });
}

function hidePageLoader(options = {}) {
    hidePageLoaderUI(options, PAGE_LOADER_MIN_VISIBLE_MS);
}

function initOnboardingUIBindings() {
    onboardingUI = initOnboardingUI({
        t,
        profilePicInput,
        onOnboardingVisibilityChange: setAuthGateActive
    });
}

function initOnboarding() {
    if (!onboardingUI) return;
    onboardingUI.initOnboarding();
}

function runPostDomReadySetup() {
    const savedAchievements = readJson(ACHIEVEMENTS_STORAGE_KEY, null);
    if (savedAchievements && typeof savedAchievements === 'object' && !Array.isArray(savedAchievements)) {
        state.userAchievements = savedAchievements;
    }
    AchievementsUI.updateAchievementsProgress();
    if (typeof ProfileUI.setupVerticalBoxClasses === 'function') {
        ProfileUI.setupVerticalBoxClasses();
    }
    LayoutRuntime.setupRatingValueClasses();
    LayoutRuntime.restructureRatingsLayout();
    LayoutRuntime.scheduleRestructureRankBox();
    syncMobileHoneycombMask();
}

function initGlobalListeners() {
    if (globalListenersInitialized) return;
    globalListenersInitialized = true;
    window.addEventListener('resize', ProfileUI.syncUserMenuDropdownWidth);
    window.addEventListener('popstate', handleAuthenticatedBackNavigationPopState);
    window.addEventListener('pagehide', () => {
        if (state.isViewMode) return;
        if (!state.scoresDirty) return;
        ScoreManager.saveCurrentScores();
        ScoreManager.saveSavedScores().catch(console.error);
    });
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runPostDomReadySetup, { once: true });
    } else {
        runPostDomReadySetup();
    }
}

function initUIControllers() {
    if (uiControllersInitialized) return;
    uiControllersInitialized = true;

    const runInitStep = (label, fn) => {
        try {
            fn();
        } catch (e) {
            console.error(`[initUIControllers] ${label} failed:`, e);
        }
    };

    runInitStep('settings UI', initSettingsUIBindings);
    runInitStep('score inputs', () => setupScoreInputHandlersUI({
        getLoginUrl: Slugs.getBenchmarkLoginUrl,
        onRatingsUpdated: handleRatingsUpdated,
        onSubInputModeChanged: saveSettings
    }));
    runInitStep('radar tabs', () => RadarUI.setupRadarTabs());
    runInitStep('share UI', () => ShareManager.setupShareUI(refreshRadarVisuals));
    runInitStep('rules modal', initRulesModalBindings);
    runInitStep('private home button', initPrivateHomeBinding);
    runInitStep('friends modal', initFriendsModalBindings);
    runInitStep('trophy UI', initTrophyUI);
    runInitStep('cave enhancements', initCaveEnhancements);
    runInitStep('account id UI', initAccountIdUIBindings);
    runInitStep('profile modal', initModalControllers);
    runInitStep('onboarding UI', initOnboardingUIBindings);
    runInitStep('global listeners', initGlobalListeners);
}

function initBenchmarkApp() {
    if (benchmarkAppInitialized) return;
    benchmarkAppInitialized = true;
    enforceBenchmarkSupportedLanguages();
    initStartupSideEffects();
    initModuleConfigurations();
    initUIControllers();
    applyStoredStartupLanguage();
    initAuthLifecycle({
        loadUserProfile,
        hidePageLoader,
        hidePrivateProfileOverlay,
        syncAuthenticatedBackNavigationGuard,
        updateNotificationVisibility,
        onAuthSessionChange: handleAuthSessionChange,
        setAuthGateActive,
        applyLanguage
    });
    ThemeUI.initCustomThemePicker(ThemeUI.applyTheme);
    AuthManager.waitForAuthInitialization()
        .then((resolvedUser) => {
            // Avoid hydrating stale local state when an authenticated session exists;
            // signed-in users are populated from profile loading.
            if (resolvedUser) return;
            ScoreManager.loadSavedCaveLinks();
            ScoreManager.loadSavedScores();
            state.scoresHydrated = true;
            applyStoredSettings();
        })
        .catch((err) => {
            console.warn("Auth initialization check failed; applying local settings fallback:", err);
            ScoreManager.loadSavedCaveLinks();
            ScoreManager.loadSavedScores();
            state.scoresHydrated = true;
            applyStoredSettings();
        });
    setupMountDropdown();
    setupConfigDropdowns();
    ProfileUI.syncUserMenuDropdownWidth();
    requestAnimationFrame(ProfileUI.syncUserMenuDropdownWidth);
    ShareManager.applyShareFromUrl();
    handleProfileLink({
        showPrivateProfileOverlay,
        hidePrivateProfileOverlay,
        hidePageLoader,
        applyLanguage
    });
    LayoutRuntime.initRankBoxResponsive();
}

initBenchmarkApp();
