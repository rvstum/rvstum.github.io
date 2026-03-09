import {
    I18N,
    setLanguage,
    tForLang,
    SUPPORTED_BENCHMARK_LANGUAGES,
    BENCHMARK_LANGUAGE_LABELS
} from "./i18n.js";
import {
    readString,
    writeString,
    LANGUAGE_STORAGE_KEY,
    PROFILE_PIC_STORAGE_KEY
} from "./storage.js";
import { getCachedElementById, getCachedQuery } from "./utils/domUtils.js";

function getPageLoadingLabel(lang) {
    if (lang === "es") return "Cargando...";
    if (lang === "pt-BR") return "Carregando...";
    return "Loading...";
}

function getCaveSwitchLabel(lang) {
    if (lang === "es") return "Cambio de Cueva";
    if (lang === "pt-BR") return "Troca de Caverna";
    return "Cave Switch";
}

function applyCaveSwitchTranslations(lang) {
    const localizedSwitch = getCaveSwitchLabel(lang);
    document.querySelectorAll(".cave-cell-name").forEach((el) => {
        if (!el || !(el instanceof HTMLElement)) return;
        if (!el.dataset.baseName) {
            el.dataset.baseName = String(el.textContent || "");
        }
        const baseName = String(el.dataset.baseName || "");
        if (!baseName) return;
        el.textContent = baseName.replace(/\(Cave Switch\)/g, `(${localizedSwitch})`);
    });
}

export function enforceBenchmarkSupportedLanguages() {
    Object.keys(I18N || {}).forEach((lang) => {
        if (!SUPPORTED_BENCHMARK_LANGUAGES.includes(lang)) {
            delete I18N[lang];
        }
    });

    const storedLang = readString(LANGUAGE_STORAGE_KEY, "");
    const safeLang = SUPPORTED_BENCHMARK_LANGUAGES.includes(storedLang) ? storedLang : "en";
    if (storedLang !== safeLang) {
        writeString(LANGUAGE_STORAGE_KEY, safeLang);
    }

    const selects = new Set([
        ...Array.from(document.querySelectorAll(".auth-lang-select")),
        ...Array.from(document.querySelectorAll("#languageSelect"))
    ]);
    selects.forEach((selectEl) => {
        if (!selectEl) return;
        const selected = SUPPORTED_BENCHMARK_LANGUAGES.includes(selectEl.value) ? selectEl.value : safeLang;
        selectEl.innerHTML = "";
        SUPPORTED_BENCHMARK_LANGUAGES.forEach((lang) => {
            const option = document.createElement("option");
            option.value = lang;
            option.textContent = BENCHMARK_LANGUAGE_LABELS[lang] || lang;
            selectEl.appendChild(option);
        });
        selectEl.value = SUPPORTED_BENCHMARK_LANGUAGES.includes(selected) ? selected : "en";
    });
}

export function createLanguageController(options = {}) {
    const {
        maskedAccountId,
        setupMobileSettingsDropdowns,
        renderHighlights,
        renderTrophies,
        renderAchievementsIfOpen,
        refreshAchievementsProgress,
        refreshFriendsModalIfOpen,
        renderGuildsList,
        applyMountConfigVisual,
        getCurrentConfig,
        syncResetConfigUI,
        updateCustomSwatches,
        updateCustomThemeUI,
        applyTheme,
        saveSettings
    } = options;

    function applyLanguage(lang, persist = true) {
        if (!I18N[lang]) lang = "en";
        setLanguage(lang);
        document.documentElement.setAttribute("data-benchmark-lang", lang);
        document.body.setAttribute("data-benchmark-lang", lang);
        if (persist) writeString(LANGUAGE_STORAGE_KEY, lang);

        document.querySelectorAll("[data-i18n]").forEach((el) => {
            const key = el.getAttribute("data-i18n");
            const value = tForLang(lang, key);
            if (key && key.startsWith("rule_")) {
                el.innerHTML = value;
            } else {
                el.textContent = value;
            }
        });
        document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
            const key = el.getAttribute("data-i18n-placeholder");
            el.setAttribute("placeholder", tForLang(lang, key));
        });
        document.querySelectorAll("[data-i18n-title]").forEach((el) => {
            const key = el.getAttribute("data-i18n-title");
            el.setAttribute("title", tForLang(lang, key));
        });
        document.querySelectorAll(".cave-play-edit").forEach((el) => {
            el.textContent = tForLang(lang, "edit_hint");
        });
        document.querySelectorAll(".radar-tab").forEach((el) => {
            const mode = el.dataset.mode;
            if (mode === "combined") el.textContent = tForLang(lang, "radar_tab_combined");
            if (mode === "swords") el.textContent = tForLang(lang, "radar_tab_swords");
            if (mode === "bombs") el.textContent = tForLang(lang, "radar_tab_bombs");
        });
        applyCaveSwitchTranslations(lang);

        const pageLoaderText = getCachedQuery("pageLoaderText", () => document.querySelector("#pageLoader .page-loader-text"));
        if (pageLoaderText) {
            pageLoaderText.textContent = getPageLoadingLabel(lang);
        }

        const langSelect = getCachedElementById("languageSelect");
        if (langSelect) langSelect.value = lang;
        if (typeof setupMobileSettingsDropdowns === "function") {
            setupMobileSettingsDropdowns();
        }
        document.querySelectorAll(".auth-lang-select").forEach((sel) => {
            sel.value = lang;
            const dropdown = sel.nextElementSibling;
            if (dropdown && dropdown.classList && dropdown.classList.contains("auth-lang-dropdown--modal")) {
                const button = dropdown.querySelector(".auth-lang-button");
                const selected = sel.options[sel.selectedIndex];
                if (button) button.textContent = selected ? selected.textContent : "Language";
            }
        });

        const confirmCancel = getCachedElementById("confirmCancelBtn");
        const confirmOk = getCachedElementById("confirmOkBtn");
        if (confirmCancel) confirmCancel.textContent = tForLang(lang, "cancel");
        if (confirmOk) confirmOk.textContent = tForLang(lang, "confirm");

        const reauthCancel = getCachedElementById("cancelReauthBtn");
        const reauthConfirm = getCachedElementById("confirmReauthBtn");
        if (reauthCancel) reauthCancel.textContent = tForLang(lang, "cancel");
        if (reauthConfirm && !reauthConfirm.disabled) reauthConfirm.textContent = tForLang(lang, "reauth_confirm");

        const exitViewBtn = getCachedElementById("exitViewModeBtn");
        if (exitViewBtn) exitViewBtn.textContent = tForLang(lang, "exit_view_mode");
        const mobileExitBtn = getCachedElementById("mobileExitViewBtn");
        if (mobileExitBtn) mobileExitBtn.textContent = tForLang(lang, "exit_view_mode");

        const hasProfilePic = readString(PROFILE_PIC_STORAGE_KEY, "") !== "";
        const uploadBtn = getCachedElementById("uploadProfilePicBtn");
        const onboardingUploadBtn = getCachedElementById("onboardingUploadProfilePicBtn");
        const uploadKey = hasProfilePic ? "replace_image" : "upload_image";
        if (uploadBtn) uploadBtn.textContent = tForLang(lang, uploadKey);
        if (onboardingUploadBtn) onboardingUploadBtn.textContent = tForLang(lang, uploadKey);

        const accountInput = getCachedElementById("accountIdDisplay");
        const accountToggle = getCachedElementById("toggleAccountIdView");
        if (accountInput && accountToggle) {
            accountToggle.textContent = accountInput.value === maskedAccountId
                ? tForLang(lang, "show")
                : tForLang(lang, "hide");
        }
        const friendAccountInput = getCachedElementById("friendPageAccountIdDisplay");
        const friendAccountToggle = getCachedElementById("friendPageToggleAccountIdView");
        if (friendAccountInput && friendAccountToggle) {
            friendAccountToggle.textContent = friendAccountInput.value === maskedAccountId
                ? tForLang(lang, "show")
                : tForLang(lang, "hide");
        }

        const cavePanelSaveBtn = getCachedQuery("cavePlayPanelSaveBtn", () => document.querySelector(".cave-play-panel.floating button"));
        if (cavePanelSaveBtn) {
            cavePanelSaveBtn.textContent = tForLang(lang, "save");
        }

        const emailInput = getCachedElementById("accountEmailDisplay");
        const emailToggle = getCachedElementById("toggleEmailView");
        if (emailInput && emailToggle) {
            emailToggle.textContent = emailInput.value.includes("**************")
                ? tForLang(lang, "show")
                : tForLang(lang, "hide");
        }

        try {
            if (typeof renderHighlights === "function") renderHighlights();
        } catch (e) {}
        try {
            if (typeof renderTrophies === "function") renderTrophies();
        } catch (e) {}
        try {
            if (typeof renderAchievementsIfOpen === "function") renderAchievementsIfOpen();
        } catch (e) {}
        try {
            if (typeof refreshAchievementsProgress === "function") refreshAchievementsProgress();
        } catch (e) {}
        try {
            if (typeof refreshFriendsModalIfOpen === "function") refreshFriendsModalIfOpen();
        } catch (e) {}
        try {
            if (typeof renderGuildsList === "function") renderGuildsList();
        } catch (e) {}

        if (typeof getCurrentConfig === "function" && typeof applyMountConfigVisual === "function") {
            const current = getCurrentConfig();
            applyMountConfigVisual(current.mount);
        }
        if (typeof syncResetConfigUI === "function") syncResetConfigUI();
        if (typeof updateCustomSwatches === "function") updateCustomSwatches(applyTheme);
        if (typeof updateCustomThemeUI === "function") updateCustomThemeUI(applyTheme);
        if (persist && typeof saveSettings === "function") saveSettings();
    }

    return {
        applyLanguage
    };
}
