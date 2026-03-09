import { state } from "./appState.js";
import { getCachedElementById } from "./utils/domUtils.js";

export function showPageLoader() {
    const loader = getCachedElementById("pageLoader");
    if (!loader) return;
    if (state.pageLoaderHideTimeout) {
        clearTimeout(state.pageLoaderHideTimeout);
        state.pageLoaderHideTimeout = null;
    }
    state.pageLoaderStartedAt = (typeof performance !== "undefined" && performance.now)
        ? performance.now()
        : Date.now();
    loader.classList.remove("is-hidden");
    loader.classList.remove("page-loader-fading");
    loader.classList.add("is-flex");
}

export function hidePageLoader(options = {}, minVisibleMs = 1300) {
    const loader = getCachedElementById("pageLoader");
    if (!loader) return;
    if (loader.classList.contains("is-hidden")) return;

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
                loader.classList.add("page-loader-fading");
                setTimeout(() => {
                    loader.classList.add("is-hidden");
                    loader.classList.remove("is-flex");
                }, 520);
            });
        });
    }, delay);
}
