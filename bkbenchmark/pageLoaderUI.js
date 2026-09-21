import { state } from "./appState.js";
import { getCachedElementById } from "./utils/domUtils.js";

const PAGE_LOADER_SHOW_LOCK_WINDOW_KEY = "__BENCHMARK_PAGE_LOADER_SHOWN_THIS_NAVIGATION__";

function releaseBootVisibilityLock() {
    if (typeof document === "undefined") return;
    document.body.classList.remove("benchmark-boot-loading");
}

function hasShownPageLoaderThisNavigation() {
    if (typeof window === "undefined") return false;
    return !!window[PAGE_LOADER_SHOW_LOCK_WINDOW_KEY];
}

function markPageLoaderShownThisNavigation() {
    if (typeof window === "undefined") return;
    window[PAGE_LOADER_SHOW_LOCK_WINDOW_KEY] = true;
}

function markInitialBootLoaderShown() {
    if (typeof document === "undefined") return;
    if (!document.getElementById("pageLoader")) return;
    markPageLoaderShownThisNavigation();
}

function isLoaderVisible(loader) {
    if (!loader) return false;
    return !loader.classList.contains("is-hidden");
}

function getBootLoaderSuppressionUntil() {
    if (typeof window === "undefined") return 0;
    const value = Number(window.__BENCHMARK_SUPPRESS_BOOT_LOADER_UNTIL__ || 0);
    return Number.isFinite(value) ? value : 0;
}

function isForcedBootHoldActive() {
    if (typeof window === "undefined") return false;
    return !!window.__BENCHMARK_FORCE_BOOT_HOLD__;
}

function shouldSuppressBootLoader() {
    const suppressUntil = getBootLoaderSuppressionUntil();
    if (!suppressUntil) return false;
    if (Date.now() <= suppressUntil) return true;
    try {
        delete window.__BENCHMARK_SUPPRESS_BOOT_LOADER_UNTIL__;
    } catch (_) {
        window.__BENCHMARK_SUPPRESS_BOOT_LOADER_UNTIL__ = 0;
    }
    return false;
}

markInitialBootLoaderShown();

export function showPageLoader(options = {}) {
    const allowRepeatInSameNavigation = !!options.allowRepeatInSameNavigation;
    const loader = getCachedElementById("pageLoader");
    if (!loader) return;
    if (isLoaderVisible(loader)) return;
    if (!allowRepeatInSameNavigation && shouldSuppressBootLoader()) return;
    if (!allowRepeatInSameNavigation && hasShownPageLoaderThisNavigation()) return;
    if (state.pageLoaderHideTimeout) {
        clearTimeout(state.pageLoaderHideTimeout);
        state.pageLoaderHideTimeout = null;
    }
    markPageLoaderShownThisNavigation();
    state.pageLoaderStartedAt = (typeof performance !== "undefined" && performance.now)
        ? performance.now()
        : Date.now();
    loader.style.removeProperty("display");
    loader.style.removeProperty("opacity");
    loader.classList.remove("is-hidden");
    loader.classList.remove("page-loader-fading");
    loader.classList.add("is-flex");
}

export function hidePageLoader(options = {}, minVisibleMs = 1300) {
    const loader = getCachedElementById("pageLoader");
    if (!loader) return;
    if (isForcedBootHoldActive() && !options.forceReleaseBootHold) {
        return;
    }
    if (loader.classList.contains("is-hidden")) {
        releaseBootVisibilityLock();
        return;
    }

    const immediate = !!options.immediate;
    const configuredMin = Number.isFinite(minVisibleMs) ? Math.max(0, minVisibleMs) : 0;
    const fallbackMinVisibleMs = Number.isFinite(options.minVisibleMs) ? Math.max(0, options.minVisibleMs) : configuredMin;
    const now = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
    const elapsed = now - state.pageLoaderStartedAt;
    const delay = immediate ? 0 : Math.max(0, fallbackMinVisibleMs - elapsed);

    if (state.pageLoaderHideTimeout) clearTimeout(state.pageLoaderHideTimeout);
    state.pageLoaderHideTimeout = setTimeout(() => {
        state.pageLoaderHideTimeout = null;
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                releaseBootVisibilityLock();
                loader.classList.add("page-loader-fading");
                setTimeout(() => {
                    loader.classList.add("is-hidden");
                    loader.classList.remove("is-flex");
                }, 520);
            });
        });
    }, delay);
}
