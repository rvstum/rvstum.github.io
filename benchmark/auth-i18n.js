import {
    AUTH_I18N,
    authT,
    applyAuthTranslations,
    resolveAuthError,
    setupAuthLangDropdown as baseSetupAuthLangDropdown,
    initAuthLanguage as baseInitAuthLanguage,
    getCurrentAuthLanguage
} from "./i18n.js";

let authLangMenuScrollLocked = false;

function authLangMenuAllowsTargetScroll(target) {
    const menu = document.getElementById("authLangMenu");
    return !!(menu && target instanceof Node && menu.contains(target));
}

function handleAuthLangMenuTouchMove(event) {
    if (!authLangMenuScrollLocked) return;
    if (authLangMenuAllowsTargetScroll(event.target)) return;
    event.preventDefault();
}

function handleAuthLangMenuWheel(event) {
    if (!authLangMenuScrollLocked) return;
    if (authLangMenuAllowsTargetScroll(event.target)) return;
    event.preventDefault();
}

window.addEventListener("touchmove", handleAuthLangMenuTouchMove, { passive: false, capture: true });
window.addEventListener("wheel", handleAuthLangMenuWheel, { passive: false, capture: true });

function syncAuthLangMenuOpenState(dropdown) {
    const isOpen = !!(dropdown && dropdown.classList.contains("open"));
    document.documentElement.classList.toggle("auth-lang-menu-open", isOpen);
    document.body.classList.toggle("auth-lang-menu-open", isOpen);
    authLangMenuScrollLocked = isOpen;
}

function bindAuthLangDropdownState(dropdown) {
    if (!dropdown || dropdown.dataset.authLangStateBound === "1") {
        syncAuthLangMenuOpenState(dropdown);
        return;
    }

    const observer = new MutationObserver(() => {
        syncAuthLangMenuOpenState(dropdown);
    });

    observer.observe(dropdown, {
        attributes: true,
        attributeFilter: ["class"]
    });

    window.addEventListener("pagehide", () => {
        syncAuthLangMenuOpenState(null);
        observer.disconnect();
    }, { once: true });

    dropdown.dataset.authLangStateBound = "1";
    syncAuthLangMenuOpenState(dropdown);
}

function setupAuthLangDropdown(selectEl) {
    baseSetupAuthLangDropdown(selectEl);
    bindAuthLangDropdownState(document.getElementById("authLangDropdown"));
}

function initAuthLanguage(pageKey) {
    baseInitAuthLanguage(pageKey);
    bindAuthLangDropdownState(document.getElementById("authLangDropdown"));
}

window.AUTH_I18N = AUTH_I18N;
window.authT = (key, lang) => authT(key, lang || getCurrentAuthLanguage());
window.applyAuthTranslations = applyAuthTranslations;
window.resolveAuthError = resolveAuthError;
window.setupAuthLangDropdown = setupAuthLangDropdown;
window.initAuthLanguage = initAuthLanguage;
