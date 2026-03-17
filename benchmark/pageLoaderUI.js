import { state } from "./appState.js";
import { getCachedElementById } from "./utils/domUtils.js";

function releaseBootVisibilityLock() {
    if (typeof document === "undefined") return;
    document.body.classList.remove("benchmark-boot-loading");
}

function getBootLoaderSuppressionUntil() {
    if (typeof window === "undefined") return 0;
    const value = Number(window.__BENCHMARK_SUPPRESS_BOOT_LOADER_UNTIL__ || 0);
    return Number.isFinite(value) ? value : 0;
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

export function showPageLoader() {
    if (shouldSuppressBootLoader()) return;
    const loader = getCachedElementById("pageLoader");
    if (!loader) return;
    if (state.pageLoaderHideTimeout) {
        clearTimeout(state.pageLoaderHideTimeout);
        state.pageLoaderHideTimeout = null;
    }
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
