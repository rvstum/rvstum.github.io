import { state } from "./appState.js";
import { getCachedElementById } from "./utils/domUtils.js";
import {
    readString,
    writeJson,
    LANGUAGE_STORAGE_KEY,
    THEME_STORAGE_KEY,
    THEME_USER_SELECTED_STORAGE_KEY,
    DEFAULT_CONFIG_STORAGE_KEY
} from "./storage.js";

export function createSettingsStateController(options = {}) {
    const {
        t,
        getCurrentLanguage,
        defaultMountConfig,
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
    } = options;

    function syncResetConfigUI() {
        const current = getCurrentConfig();
        const resetPlatform = getCachedElementById("resetPlatform");
        const resetTime = getCachedElementById("resetTime");
        const resetStat = getCachedElementById("resetStat");
        const resetMount = getCachedElementById("resetMount");
        if (resetPlatform) resetPlatform.value = current.platform;
        if (resetTime) resetTime.value = current.time;
        if (resetStat) resetStat.value = current.stat;
        if (resetMount) resetMount.value = normalizeMountConfig(current.mount || defaultMountConfig);
    }

    function syncSettingsUI() {
        const stored = readDefaultConfig();
        const base = stored || getStartupConfigDefaults();
        const defaultPlatform = getCachedElementById("defaultPlatform");
        const defaultTime = getCachedElementById("defaultTime");
        const defaultStat = getCachedElementById("defaultStat");
        const defaultMount = getCachedElementById("defaultMount");
        if (defaultPlatform) defaultPlatform.value = base.platform;
        if (defaultTime) defaultTime.value = base.time;
        if (defaultStat) defaultStat.value = base.stat;
        if (defaultMount) defaultMount.value = normalizeMountConfig(base.mount || defaultMountConfig);
        ThemeUI.updateThemeButtons();
        ThemeUI.syncAutoRankThemeUI();
        syncResetConfigUI();
        ThemeUI.updateCustomSwatches(ThemeUI.applyTheme);
        ThemeUI.updateCustomThemeUI(ThemeUI.applyTheme);
    }

    function performResetCurrentScores() {
        document.querySelectorAll(".score-input").forEach((input) => {
            input.value = "0";
        });
        document.querySelectorAll(".score-text-overlay").forEach((overlay) => {
            overlay.textContent = "0";
        });
        const key = getConfigKey();
        delete state.savedScores[key];
        ScoreManager.saveSavedScores();
        RankingUI.updateAllRatings(refreshRadarVisuals);
    }

    function resetSelectedScores() {
        const current = getCurrentConfig();
        const selection = {
            platform: getCachedElementById("resetPlatform")?.value || current.platform,
            time: getCachedElementById("resetTime")?.value || current.time,
            stat: getCachedElementById("resetStat")?.value || current.stat,
            mount: normalizeMountConfig(getCachedElementById("resetMount")?.value || current.mount || defaultMountConfig)
        };
        const selectedKey = buildConfigKey(selection.platform, selection.time, selection.stat, selection.mount);

        showConfirmModal(t("settings_reset_selected"), t("reset_confirm"), () => {
            if (selectedKey === getConfigKey()) {
                performResetCurrentScores();
            } else {
                delete state.savedScores[selectedKey];
                ScoreManager.saveSavedScores();
            }
        });
    }

    function resetAllConfigurations() {
        showConfirmModal(t("settings_reset_all"), t("reset_all_confirm"), () => {
            Object.keys(state.savedScores).forEach((key) => delete state.savedScores[key]);
            ScoreManager.saveSavedScores();
            performResetCurrentScores();
        });
    }

    function handleDefaultConfigChange() {
        const startupDefaults = getStartupConfigDefaults();
        const platform = getCachedElementById("defaultPlatform")?.value || startupDefaults.platform;
        const time = getCachedElementById("defaultTime")?.value || startupDefaults.time;
        const stat = getCachedElementById("defaultStat")?.value || startupDefaults.stat;
        const mount = normalizeMountConfig(getCachedElementById("defaultMount")?.value || startupDefaults.mount);
        const config = { platform, time, stat, mount };
        if (state.isViewMode) return;
        writeJson(DEFAULT_CONFIG_STORAGE_KEY, config);
        saveSettings();
    }

    function applyStoredSettings() {
        const storedLang = readString(LANGUAGE_STORAGE_KEY, "en");
        const storedTheme = readString(THEME_STORAGE_KEY, "default");
        const userSelectedTheme = readString(THEME_USER_SELECTED_STORAGE_KEY, "false") === "true";
        const themeToApply = userSelectedTheme ? storedTheme : "default";

        ThemeUI.loadCustomThemeState();
        ThemeUI.loadSavedCustomThemes();
        ThemeUI.loadCustomThemeHex();
        ThemeUI.loadRankThemeUnlock();
        ThemeUI.loadSavedConfigThemes();
        ThemeUI.loadAutoRankThemeSetting();
        PacmanUI.loadPacmanSetting();
        applyLanguage(storedLang, false);

        const storedConfig = readDefaultConfig();
        if (storedConfig) {
            applyConfig(storedConfig, { skipSaveCurrent: true });
        } else {
            const keyCandidates = getConfigLookupKeys();
            let theme = themeToApply;
            for (const key of keyCandidates) {
                if (state.savedConfigThemes[key]) {
                    theme = state.savedConfigThemes[key];
                    break;
                }
            }
            ThemeUI.applyTheme(theme, false);
            RankingUI.updateScoreRequirements(ScoreManager.getBaseScoresForConfig(), false);
            ScoreManager.loadScores();
            ScoreManager.loadCaveLinks();
        }
        ThemeUI.validateRankUnlock();

        syncSettingsUI();
        PacmanUI.injectPacmanSettingUI({
            onSave: saveSettings,
            onRadarUpdate: refreshRadarVisuals,
            reapplyLanguage: () => applyLanguage(getCurrentLanguage(), false)
        });
    }

    return {
        syncResetConfigUI,
        syncSettingsUI,
        applyStoredSettings,
        resetSelectedScores,
        resetAllConfigurations,
        handleDefaultConfigChange
    };
}
