import { state } from "./appState.js";
import { t } from "./i18n.js";
import { hexToRgba, darkenColor, lightenColor, colorWithAlpha, parseColorToRgba, hexToRgb, rgbToHex, blendHex, rgbToHsv, hsvToRgb } from "./utils/colorUtils.js";
import { RANK_TEXT_COLORS, FINAL_RANK_INDEX } from "./constants.js";
import {
    readString,
    writeString,
    readJson,
    writeJson,
    THEME_STORAGE_KEY,
    THEME_USER_SELECTED_STORAGE_KEY,
    CUSTOM_THEME_ENABLED_STORAGE_KEY,
    CUSTOM_THEME_NAME_STORAGE_KEY,
    CUSTOM_THEME_HEX_STORAGE_KEY,
    SAVED_CUSTOM_THEMES_STORAGE_KEY,
    THEME_UNLOCK_STORAGE_KEY,
    AUTO_RANK_THEME_STORAGE_KEY,
    CONFIG_THEMES_STORAGE_KEY
} from "./storage.js";
import * as RadarUI from "./radarUI.js";
import { createSyncedStore } from "./persistence.js";
import { getCachedElementById } from "./utils/domUtils.js";

const themeUICallbacks = {
    saveSettings: null,
    getConfigKey: null,
    getConfigLookupKeys: null,
    calculateRankFromData: null
};

const themeState = (state.theme && typeof state.theme === "object")
    ? state.theme
    : (state.theme = {
        currentTheme: "default",
        customThemeHex: {},
        customThemeEnabled: false,
        customThemeName: "Custom",
        savedCustomThemes: [],
        autoRankThemeEnabled: false,
        maxUnlockedRankIndex: 0
    });

const savedConfigThemesStore = createSyncedStore({
    storageKey: CONFIG_THEMES_STORAGE_KEY,
    firestoreField: "configThemes",
    getValue: () => state.savedConfigThemes,
    setValue: (value) => {
        state.savedConfigThemes = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    },
    defaultValue: {},
    normalize: (value) => (value && typeof value === "object" && !Array.isArray(value) ? value : {}),
    label: "config themes"
});

function invokeConfiguredSaveSettings() {
    if (typeof themeUICallbacks.saveSettings !== 'function') return;
    try {
        const result = themeUICallbacks.saveSettings();
        if (result && typeof result.catch === 'function') {
            result.catch(console.error);
        }
    } catch (e) {
        console.error('Error saving settings:', e);
    }
}

function getConfiguredThemeUnlockRankLimit(config = null) {
    if (state.isViewMode) return FINAL_RANK_INDEX;
    if (typeof themeUICallbacks.getConfigLookupKeys !== 'function') return FINAL_RANK_INDEX;
    if (typeof themeUICallbacks.calculateRankFromData !== 'function') return FINAL_RANK_INDEX;

    const keys = themeUICallbacks.getConfigLookupKeys(config);
    const scopedScores = {};
    keys.forEach((key) => {
        if (Array.isArray(state.savedScores[key])) {
            scopedScores[key] = state.savedScores[key];
        }
    });
    return themeUICallbacks.calculateRankFromData({ scores: scopedScores });
}

export function configure(deps = {}) {
    if (!deps || typeof deps !== 'object') return;
    if (Object.prototype.hasOwnProperty.call(deps, 'saveSettings')) {
        themeUICallbacks.saveSettings = typeof deps.saveSettings === 'function' ? deps.saveSettings : null;
    }
    if (Object.prototype.hasOwnProperty.call(deps, 'getConfigKey')) {
        themeUICallbacks.getConfigKey = typeof deps.getConfigKey === 'function' ? deps.getConfigKey : null;
    }
    if (Object.prototype.hasOwnProperty.call(deps, 'getConfigLookupKeys')) {
        themeUICallbacks.getConfigLookupKeys = typeof deps.getConfigLookupKeys === 'function' ? deps.getConfigLookupKeys : null;
    }
    if (Object.prototype.hasOwnProperty.call(deps, 'calculateRankFromData')) {
        themeUICallbacks.calculateRankFromData = typeof deps.calculateRankFromData === 'function' ? deps.calculateRankFromData : null;
    }
}

const CUSTOM_THEME_DEFAULT = {
    '--app-bg': '#050505',
    '--app-accent-1': 'rgba(76, 29, 149, 0.08)',
    '--app-accent-2': 'rgba(14, 165, 233, 0.08)',
    '--panel-bg': 'rgba(20, 20, 20, 0.6)',
    '--panel-border': 'rgba(255, 255, 255, 0.05)',
    '--app-text': '#e0e0e0'
};

const CUSTOM_THEME_META = {
    '--app-bg': { alpha: null },
    '--app-accent-1': { alpha: 0.12 },
    '--app-accent-2': { alpha: 0.08 },
    '--panel-bg': { alpha: 0.6 },
    '--panel-border': { alpha: 0.18 },
    '--app-text': { alpha: null }
};

const CUSTOM_THEME_HEX_DEFAULTS = {
    '--app-bg': '#050505',
    '--app-accent-1': '#4c1d95',
    '--app-accent-2': '#0ea5e9',
    '--panel-bg': '#141414',
    '--panel-border': '#ffffff',
    '--app-text': '#e0e0e0'
};

const CUSTOM_THEME_SUBTLE = 0.2;

const CUSTOM_TARGETS = [
    { key: '--app-bg', labelKey: 'settings_color_background' },
    { key: '--app-accent-1', labelKey: 'settings_color_accent1' },
    { key: '--app-accent-2', labelKey: 'settings_color_accent2' },
    { key: '--panel-bg', labelKey: 'settings_color_panel' },
    { key: '--panel-border', labelKey: 'settings_color_border' },
    { key: '--app-text', labelKey: 'settings_color_text' }
];

const THEMES = {
    default: {
        '--app-bg': '#050505',
        '--app-accent-1': 'rgba(76, 29, 149, 0.08)',
        '--app-accent-2': 'rgba(14, 165, 233, 0.08)',
        '--panel-bg': 'rgba(20, 20, 20, 0.6)',
        '--panel-border': 'rgba(255, 255, 255, 0.05)',
        '--app-text': '#e0e0e0'
    },
    ember: {
        '--app-bg': '#0b0507',
        '--app-accent-1': 'rgba(255, 98, 0, 0.1)',
        '--app-accent-2': 'rgba(255, 0, 85, 0.08)',
        '--panel-bg': 'rgba(26, 12, 12, 0.62)',
        '--panel-border': 'rgba(255, 120, 90, 0.12)',
        '--app-text': '#f1e6e1'
    },
    frost: {
        '--app-bg': '#05070b',
        '--app-accent-1': 'rgba(0, 148, 255, 0.1)',
        '--app-accent-2': 'rgba(0, 255, 214, 0.08)',
        '--panel-bg': 'rgba(10, 16, 24, 0.6)',
        '--panel-border': 'rgba(120, 190, 255, 0.12)',
        '--app-text': '#e6f3ff'
    },
    verdant: {
        '--app-bg': '#050807',
        '--app-accent-1': 'rgba(0, 200, 120, 0.1)',
        '--app-accent-2': 'rgba(120, 255, 0, 0.08)',
        '--panel-bg': 'rgba(12, 20, 16, 0.6)',
        '--panel-border': 'rgba(120, 220, 160, 0.12)',
        '--app-text': '#e4f7ec'
    },
    royal: {
        '--app-bg': '#07060d',
        '--app-accent-1': 'rgba(130, 90, 255, 0.12)',
        '--app-accent-2': 'rgba(80, 160, 255, 0.1)',
        '--panel-bg': 'rgba(18, 14, 30, 0.62)',
        '--panel-border': 'rgba(160, 120, 255, 0.14)',
        '--app-text': '#efe9ff'
    },
    obsidian: {
        '--app-bg': '#040404',
        '--app-accent-1': 'rgba(255, 255, 255, 0.04)',
        '--app-accent-2': 'rgba(120, 120, 120, 0.06)',
        '--panel-bg': 'rgba(14, 14, 14, 0.72)',
        '--panel-border': 'rgba(255, 255, 255, 0.08)',
        '--app-text': '#f2f2f2'
    },
    sands: {
        '--app-bg': '#0c0a06',
        '--app-accent-1': 'rgba(255, 197, 116, 0.12)',
        '--app-accent-2': 'rgba(255, 149, 0, 0.08)',
        '--panel-bg': 'rgba(28, 20, 12, 0.62)',
        '--panel-border': 'rgba(255, 197, 116, 0.16)',
        '--app-text': '#f6efe4'
    }
};

function buildRankTheme(rankHex) {
    const accent1 = hexToRgba(rankHex, 0.12);
    const accent2 = hexToRgba(rankHex, 0.08);
    const panelBorder = hexToRgba(rankHex, 0.18);
    const panelBg = hexToRgba(rankHex, 0.08);
    return {
        '--app-bg': '#050505',
        '--app-accent-1': accent1,
        '--app-accent-2': accent2,
        '--panel-bg': panelBg,
        '--panel-border': panelBorder,
        '--app-text': '#e0e0e0'
    };
}

for (let i = 1; i < RANK_TEXT_COLORS.length; i++) {
    THEMES[`rank-${i}`] = buildRankTheme(RANK_TEXT_COLORS[i]);
}

THEMES['rank-2'] = {
    ...THEMES['rank-2'],
    '--app-bg': '#020100',
    '--app-accent-1': 'rgba(70, 38, 16, 0.24)',
    '--app-accent-2': 'rgba(98, 58, 30, 0.1)',
    '--panel-bg': 'rgba(16, 9, 5, 0.76)',
    '--panel-border': 'rgba(88, 55, 32, 0.26)',
    '--app-text': '#e6d7c8'
};

THEMES['rank-11'] = {
    ...THEMES['rank-11'],
    '--app-bg': '#0c0501',
    '--app-accent-1': 'rgba(255, 132, 0, 0.26)',
    '--app-accent-2': 'rgba(255, 168, 46, 0.16)',
    '--panel-bg': 'rgba(56, 23, 4, 0.68)',
    '--panel-border': 'rgba(255, 160, 36, 0.32)',
    '--app-text': '#fff0df'
};

export function getRankThemeIndex(themeName) {
    if (!themeName || !themeName.startsWith('rank-')) return null;
    const raw = themeName.slice('rank-'.length);
    const value = Number(raw);
    if (!Number.isFinite(value)) return null;
    return Math.max(0, Math.min(FINAL_RANK_INDEX, Math.floor(value)));
}

export function getThemeUnlockRankLimit(config = null) {
    return getConfiguredThemeUnlockRankLimit(config);
}

export async function applyTheme(themeName, persist = true) {
    const rankIndex = getRankThemeIndex(themeName);
    const unlockLimit = getConfiguredThemeUnlockRankLimit();
    if (rankIndex !== null && rankIndex > unlockLimit) {
        themeName = 'default';
    }
    let resolvedTheme = themeName;
    if (themeName === 'custom') {
        resolvedTheme = 'default';
    }
    const finalTheme = resolvedTheme === 'custom' ? getCustomTheme() : (THEMES[resolvedTheme] || THEMES.default);
    themeState.currentTheme = resolvedTheme === 'custom' ? 'custom' : (THEMES[resolvedTheme] ? resolvedTheme : 'default');
    Object.keys(finalTheme).forEach(key => {
        document.documentElement.style.setProperty(key, finalTheme[key]);
    });
    const panelBg = finalTheme['--panel-bg'] || 'rgba(20, 20, 20, 0.6)';
    const panelBorder = finalTheme['--panel-border'] || 'rgba(255, 255, 255, 0.05)';
    const baseAppBg = finalTheme['--app-bg'] || '#050505';
    const themedAppBg = themeState.currentTheme === 'default'
        ? baseAppBg
        : darkenColor(colorWithAlpha(panelBorder, 1), 0.95);
    document.documentElement.style.setProperty('--app-bg', themedAppBg);
    const legalLinksBg = darkenColor(colorWithAlpha(panelBg, 1), 0.6);
    document.documentElement.style.setProperty('--config-box-bg', colorWithAlpha(panelBg, 0.14));
    document.documentElement.style.setProperty('--config-box-bg-hover', colorWithAlpha(panelBg, 0.22));
    document.documentElement.style.setProperty('--config-box-border', colorWithAlpha(panelBorder, 0.2));
    document.documentElement.style.setProperty('--config-box-border-hover', colorWithAlpha(panelBorder, 0.35));
    document.documentElement.style.setProperty('--legal-links-bg', legalLinksBg);
    const themeTextBase = colorWithAlpha(panelBorder, 1);
    const legalAuthorColor = themeState.currentTheme === 'default' ? '#9a9a9a' : lightenColor(themeTextBase, 0.38);
    const legalLinkColor = themeState.currentTheme === 'default' ? '#9a9a9a' : lightenColor(themeTextBase, 0.32);
    const legalLinkHoverColor = themeState.currentTheme === 'default' ? '#bdbdbd' : lightenColor(themeTextBase, 0.5);
    document.documentElement.style.setProperty('--legal-author-color', legalAuthorColor);
    document.documentElement.style.setProperty('--legal-link-color', legalLinkColor);
    document.documentElement.style.setProperty('--legal-link-hover-color', legalLinkHoverColor);
    const caveSaveBtnBg = themeState.currentTheme === 'default'
        ? '#1c1c1c'
        : colorWithAlpha(finalTheme['--app-accent-2'] || panelBorder, 1);
    const caveSaveBtnParsed = parseColorToRgba(caveSaveBtnBg);
    const caveSaveBtnYiq = caveSaveBtnParsed
        ? ((caveSaveBtnParsed.r * 299) + (caveSaveBtnParsed.g * 587) + (caveSaveBtnParsed.b * 114)) / 1000
        : 200;
    const caveSaveBtnText = caveSaveBtnYiq >= 150 ? '#111' : '#f8f8f8';
    const caveSaveBtnBgDark = themeState.currentTheme === 'default'
        ? '#1c1c1c'
        : darkenColor(caveSaveBtnBg, 0.2);
    document.documentElement.style.setProperty('--cave-save-btn-bg', caveSaveBtnBg);
    document.documentElement.style.setProperty('--cave-save-btn-bg-dark', caveSaveBtnBgDark);
    document.documentElement.style.setProperty('--cave-save-btn-text', caveSaveBtnText);
    document.documentElement.style.setProperty('--cave-save-btn-border', themeState.currentTheme === 'default' ? '#303030' : colorWithAlpha(panelBorder, 0.9));
    const exitViewBtnBg = themeState.currentTheme === 'default' ? '#2d2d2d' : caveSaveBtnBg;
    const exitViewBtnBorder = themeState.currentTheme === 'default' ? '#3f3f3f' : colorWithAlpha(panelBorder, 0.9);
    const exitViewBtnText = themeState.currentTheme === 'default' ? '#f2f2f2' : '#f5f8ff';
    const exitViewBtnOutline = themeState.currentTheme === 'default'
        ? 'rgba(0, 0, 0, 0.65)'
        : colorWithAlpha(darkenColor(colorWithAlpha(panelBorder, 1), 0.55), 0.9);
    document.documentElement.style.setProperty('--exit-view-btn-bg', exitViewBtnBg);
    document.documentElement.style.setProperty('--exit-view-btn-border', exitViewBtnBorder);
    document.documentElement.style.setProperty('--exit-view-btn-text', exitViewBtnText);
    document.documentElement.style.setProperty('--exit-view-btn-outline', exitViewBtnOutline);
    const activeOutlineColor = themeState.currentTheme === 'default'
        ? '#ffffff'
        : colorWithAlpha(finalTheme['--app-accent-2'] || panelBorder, 1);
    const activeOutlineShadow = colorWithAlpha(darkenColor(activeOutlineColor, 0.75), 0.95);
    document.documentElement.style.setProperty('--active-outline-color', activeOutlineColor);
    document.documentElement.style.setProperty('--active-outline-shadow', activeOutlineShadow);
    const currentRankThemeIndex = getRankThemeIndex(themeState.currentTheme);
    let legalBaddyColor = '#9a9a9a';
    if (currentRankThemeIndex !== null && currentRankThemeIndex > 0) {
        legalBaddyColor = RANK_TEXT_COLORS[currentRankThemeIndex] || legalBaddyColor;
    } else if (themeState.currentTheme !== 'default') {
        legalBaddyColor = lightenColor(themeTextBase, 0.2);
    }
    document.documentElement.style.setProperty('--legal-baddy-base-color', legalBaddyColor);
    if (typeof window.updateLegalBaddyIcons === 'function') {
        window.updateLegalBaddyIcons(legalBaddyColor);
    }

    updateThemeButtons();
    updateCustomSwatches(applyTheme);
    updateCustomThemeUI(applyTheme);
    RadarUI.updateRadar();
    RadarUI.updateBarGraph();

    if (persist) {
        writeString(THEME_STORAGE_KEY, themeState.currentTheme);
        
        if (typeof themeUICallbacks.getConfigKey === 'function') {
            const key = themeUICallbacks.getConfigKey();
            state.savedConfigThemes[key] = themeState.currentTheme;
            saveSavedConfigThemes().catch(console.error);
        }
        invokeConfiguredSaveSettings();
    }
    const preview = getCachedElementById('settingsPreview');
    const source = getCachedElementById('benchmark-content');
    const modal = getCachedElementById('settingsModal');
    if (preview && source && modal && modal.classList.contains('show')) {
        const stage = preview.querySelector('.settings-preview-stage');
        if (stage) {
            updateSettingsPreviewLayout(preview, source, stage);
        } else {
            buildSettingsPreview();
        }
    }
}

export function updateThemeButtons() {
    const unlockLimit = getConfiguredThemeUnlockRankLimit();
    document.querySelectorAll('.theme-option').forEach(btn => {
        const theme = btn.getAttribute('data-theme') || '';
        const rankIndex = getRankThemeIndex(theme);
        const locked = rankIndex !== null && rankIndex > unlockLimit;
        btn.classList.toggle('locked', locked);
        btn.disabled = locked;
        btn.classList.toggle('active', theme === themeState.currentTheme);
    });
    renderCustomThemeList(applyTheme);
}

export function loadCustomThemeState() {
    const storedEnabled = readString(CUSTOM_THEME_ENABLED_STORAGE_KEY, '');
    themeState.customThemeEnabled = storedEnabled === 'true';
    const storedName = readString(CUSTOM_THEME_NAME_STORAGE_KEY, '');
    if (storedName && storedName.trim()) {
        themeState.customThemeName = storedName.trim().slice(0, 16);
    }
}

export function loadRankThemeUnlock() {
    const raw = readString(THEME_UNLOCK_STORAGE_KEY, '');
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) {
        themeState.maxUnlockedRankIndex = Math.max(0, Math.min(FINAL_RANK_INDEX, Math.floor(parsed)));
        return;
    }
    themeState.maxUnlockedRankIndex = 0;
}

export function updateRankThemeUnlock(currentRankIndex) {
    if (state.isViewMode) return false;
    const rank = Math.max(0, Math.min(FINAL_RANK_INDEX, Math.floor(currentRankIndex)));
    if (rank <= themeState.maxUnlockedRankIndex) return false;
    themeState.maxUnlockedRankIndex = rank;
    writeString(THEME_UNLOCK_STORAGE_KEY, String(themeState.maxUnlockedRankIndex));
    invokeConfiguredSaveSettings();
    return true;
}

export function validateRankUnlock() {
    if (state.isViewMode) return;
    if (typeof themeUICallbacks.calculateRankFromData !== 'function') return;
    const calculatedMax = themeUICallbacks.calculateRankFromData({ scores: state.savedScores });
    if (themeState.maxUnlockedRankIndex !== calculatedMax) {
        themeState.maxUnlockedRankIndex = calculatedMax;
        writeString(THEME_UNLOCK_STORAGE_KEY, String(themeState.maxUnlockedRankIndex));
        invokeConfiguredSaveSettings();
        updateThemeButtons();
    }
}

export function loadAutoRankThemeSetting() {
    themeState.autoRankThemeEnabled = readString(AUTO_RANK_THEME_STORAGE_KEY, '') === 'true';
}

export function saveAutoRankThemeSetting() {
    if (state.isViewMode) return;
    writeString(AUTO_RANK_THEME_STORAGE_KEY, themeState.autoRankThemeEnabled ? 'true' : 'false');
    invokeConfiguredSaveSettings();
}

export function syncAutoRankThemeUI() {
    const select = getCachedElementById('autoRankThemeSelect');
    if (!select) return;
    select.value = themeState.autoRankThemeEnabled ? 'on' : 'off';
}

export function saveCustomThemeState() {
    if (state.isViewMode) return;
    writeString(CUSTOM_THEME_ENABLED_STORAGE_KEY, themeState.customThemeEnabled ? 'true' : 'false');
    writeString(CUSTOM_THEME_NAME_STORAGE_KEY, themeState.customThemeName);
    invokeConfiguredSaveSettings();
}

export function updateCustomThemeUI(applyThemeFunc) {
    const customCard = getCachedElementById('customThemeCard');
    const nameInput = getCachedElementById('customThemeName');
    const saveBtn = getCachedElementById('saveCustomThemeNameBtn');
    const removeBtn = getCachedElementById('removeCustomThemeBtn');
    const customLocked = themeState.currentTheme !== 'custom';
    const canRemove = themeState.savedCustomThemes.some(theme => theme.name === themeState.customThemeName);

    if (customCard) customCard.classList.toggle('is-disabled', customLocked);
    if (nameInput) {
        nameInput.value = (themeState.customThemeName && themeState.customThemeName !== 'Custom') ? themeState.customThemeName : '';
        nameInput.disabled = false;
    }
    if (saveBtn) saveBtn.disabled = false;
    if (removeBtn) removeBtn.disabled = !themeState.customThemeEnabled || !canRemove;
    renderCustomThemeList(applyThemeFunc);
}

export function updateSettingsPreviewLayout(preview, source, stage) {
    if (!preview || !source) return;
    const bodyStyle = getComputedStyle(document.body);
    preview.style.backgroundColor = bodyStyle.backgroundColor;
    preview.style.backgroundImage = bodyStyle.backgroundImage;
    preview.style.backgroundRepeat = bodyStyle.backgroundRepeat;
    requestAnimationFrame(() => {
        const previewRect = preview.getBoundingClientRect();
        const sourceRect = source.getBoundingClientRect();
        const previewWidth = preview.clientWidth || previewRect.width;
        const previewHeight = preview.clientHeight || previewRect.height;
        if (!previewWidth || !previewHeight || !sourceRect.width || !sourceRect.height) return;
        const scale = Math.min(previewWidth / sourceRect.width, previewHeight / sourceRect.height);
        const safeScale = Math.max(Math.min(scale, 1), 0.1);
        const scaledWidth = sourceRect.width * safeScale;
        const scaledHeight = sourceRect.height * safeScale;
        const offsetX = (previewWidth - scaledWidth) / 2;
        const offsetY = (previewHeight - scaledHeight) / 2;
        if (stage) {
            stage.style.width = `${sourceRect.width}px`;
            stage.style.height = `${sourceRect.height}px`;
            stage.style.transformOrigin = 'top left';
            stage.style.transform = `scale(${safeScale})`;
            stage.style.left = `${offsetX}px`;
            stage.style.top = `${offsetY}px`;
        }
        const viewportW = window.innerWidth || document.documentElement.clientWidth || sourceRect.width;
        const viewportH = window.innerHeight || document.documentElement.clientHeight || sourceRect.height;
        const bgSizeX = viewportW * safeScale;
        const bgSizeY = viewportH * safeScale;
        const bgPosX = (-sourceRect.left * safeScale) + offsetX;
        const bgPosY = (-sourceRect.top * safeScale) + offsetY;
        preview.style.backgroundSize = `${bgSizeX}px ${bgSizeY}px`;
        preview.style.backgroundPosition = `${bgPosX}px ${bgPosY}px`;
    });
}

export function buildSettingsPreview() {
    const preview = getCachedElementById('settingsPreview');
    const source = getCachedElementById('benchmark-content');
    if (!preview || !source) return;
    preview.innerHTML = '';
    const stage = document.createElement('div');
    stage.className = 'settings-preview-stage';
    const clone = source.cloneNode(true);
    clone.classList.add('settings-preview-benchmark');
    clone.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
    clone.querySelectorAll('input, button, select, textarea').forEach(el => {
        el.setAttribute('disabled', '');
        el.setAttribute('tabindex', '-1');
    });
    clone.querySelectorAll('.dropdown-menu').forEach(el => el.classList.remove('show'));
    stage.appendChild(clone);
    preview.appendChild(stage);
    updateSettingsPreviewLayout(preview, source, stage);
}

export function loadCustomThemeHex() {
    const parsed = readJson(CUSTOM_THEME_HEX_STORAGE_KEY, null);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        themeState.customThemeHex = { ...CUSTOM_THEME_HEX_DEFAULTS };
        return;
    }
    themeState.customThemeHex = { ...CUSTOM_THEME_HEX_DEFAULTS, ...parsed };
}

export function getCustomTheme() {
    if (!themeState.customThemeHex || !Object.keys(themeState.customThemeHex).length) {
        loadCustomThemeHex();
    }
    const theme = { ...CUSTOM_THEME_DEFAULT };
    Object.keys(CUSTOM_THEME_META).forEach(key => {
        const hex = themeState.customThemeHex[key] || CUSTOM_THEME_HEX_DEFAULTS[key];
        if (!hex) return;
        const baseHex = CUSTOM_THEME_HEX_DEFAULTS[key] || hex;
        const blendedHex = blendHex(baseHex, hex, CUSTOM_THEME_SUBTLE);
        const meta = CUSTOM_THEME_META[key];
        theme[key] = meta.alpha === null ? blendedHex : hexToRgba(blendedHex, meta.alpha);
    });
    return theme;
}

export function saveCustomThemeHex() {
    if (state.isViewMode) return;
    writeJson(CUSTOM_THEME_HEX_STORAGE_KEY, themeState.customThemeHex);
    invokeConfiguredSaveSettings();
}

export function loadSavedCustomThemes() {
    const parsed = readJson(SAVED_CUSTOM_THEMES_STORAGE_KEY, []);
    if (!Array.isArray(parsed)) {
        themeState.savedCustomThemes = [];
        return;
    }
    themeState.savedCustomThemes = parsed.filter(item => item && item.name && item.hex);
}

export function saveSavedCustomThemes() {
    if (state.isViewMode) return;
    writeJson(SAVED_CUSTOM_THEMES_STORAGE_KEY, themeState.savedCustomThemes);
    invokeConfiguredSaveSettings();
}

export function getCustomThemeHexSnapshot() {
    if (!themeState.customThemeHex || !Object.keys(themeState.customThemeHex).length) {
        loadCustomThemeHex();
    }
    return { ...CUSTOM_THEME_HEX_DEFAULTS, ...themeState.customThemeHex };
}

export function renderCustomThemeList(applyThemeFunc) {
    const list = getCachedElementById('customThemeList');
    if (!list) return;
    list.innerHTML = '';
    if (!themeState.savedCustomThemes.length) return;
    themeState.savedCustomThemes.forEach(theme => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'custom-theme-chip';
        btn.textContent = theme.name;
        btn.classList.toggle('active', themeState.currentTheme === 'custom' && themeState.customThemeName === theme.name);
        btn.addEventListener('click', () => {
            themeState.customThemeEnabled = true;
            themeState.customThemeName = theme.name;
            themeState.customThemeHex = { ...CUSTOM_THEME_HEX_DEFAULTS, ...theme.hex };
            saveCustomThemeState();
            saveCustomThemeHex();
            writeString(THEME_USER_SELECTED_STORAGE_KEY, 'true');
            if (applyThemeFunc) applyThemeFunc('custom');
            updateCustomSwatches(applyThemeFunc);
            updateCustomThemeUI(applyThemeFunc);
        });
        list.appendChild(btn);
    });
}

let pickerHue = 0;
let pickerSat = 1;
let pickerVal = 1;

export function populateCustomTargetSelect() {
    const select = getCachedElementById('customThemeTarget');
    if (!select) return;
    const current = select.value || (CUSTOM_TARGETS[0] ? CUSTOM_TARGETS[0].key : '--app-bg');
    select.innerHTML = '';
    CUSTOM_TARGETS.forEach(item => {
        const option = document.createElement('option');
        option.value = item.key;
        option.textContent = t(item.labelKey);
        select.appendChild(option);
    });
    select.value = CUSTOM_TARGETS.some(item => item.key === current) ? current : (CUSTOM_TARGETS[0]?.key || '--app-bg');
}

export function updatePickerUI() {
    const svPicker = getCachedElementById('svPicker');
    const svThumb = getCachedElementById('svThumb');
    const hueSlider = getCachedElementById('hueSlider');
    const hueThumb = getCachedElementById('hueThumb');
    if (!svPicker || !svThumb || !hueSlider || !hueThumb) return;
    svPicker.style.backgroundColor = `hsl(${pickerHue}, 100%, 50%)`;
    const svWidth = svPicker.clientWidth;
    const svHeight = svPicker.clientHeight;
    svThumb.style.left = `${pickerSat * svWidth}px`;
    svThumb.style.top = `${(1 - pickerVal) * svHeight}px`;
    const hueInset = 1;
    const hueHeight = Math.max(hueSlider.clientHeight - (hueInset * 2), 0);
    hueThumb.style.top = `${(1 - (pickerHue / 360)) * hueHeight + hueInset}px`;
}

export function setPickerFromHex(hex) {
    const rgb = hexToRgb(hex);
    if (!rgb) return;
    const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
    pickerHue = hsv.h;
    pickerSat = hsv.s;
    pickerVal = hsv.v;
    updatePickerUI();
}

export function updateCustomSwatches(applyThemeFunc) {
    if (!themeState.customThemeHex || !Object.keys(themeState.customThemeHex).length) {
        loadCustomThemeHex();
    }
    populateCustomTargetSelect();
    const targetSelect = getCachedElementById('customThemeTarget');
    const preview = getCachedElementById('customColorPreview');
    const hexInput = getCachedElementById('customHexInput');
    if (!targetSelect) return;
    const target = targetSelect.value;
    const hex = themeState.customThemeHex[target] || CUSTOM_THEME_HEX_DEFAULTS[target] || '#ffffff';
    if (preview) preview.style.backgroundColor = hex;
    if (hexInput) hexInput.value = hex.toUpperCase();
    setPickerFromHex(hex);
}

export function initCustomThemePicker(applyThemeFunc) {
    const targetSelect = getCachedElementById('customThemeTarget');
    const svPicker = getCachedElementById('svPicker');
    const hueSlider = getCachedElementById('hueSlider');
    const hexInput = getCachedElementById('customHexInput');
    const preview = getCachedElementById('customColorPreview');
    if (!targetSelect || !svPicker || !hueSlider) return;

    populateCustomTargetSelect();
    updateCustomSwatches(applyThemeFunc);

    targetSelect.addEventListener('change', () => {
        updateCustomSwatches(applyThemeFunc);
    });

    const applyCurrentColor = () => {
        const target = targetSelect.value;
        const rgb = hsvToRgb(pickerHue, pickerSat, pickerVal);
        const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
        themeState.customThemeHex[target] = hex;
        saveCustomThemeHex();
        if (applyThemeFunc) applyThemeFunc('custom');
        if (preview) preview.style.backgroundColor = hex;
        if (hexInput) hexInput.value = hex.toUpperCase();
    };

    const handleSvPointer = (event) => {
        const rect = svPicker.getBoundingClientRect();
        const x = Math.min(Math.max(0, event.clientX - rect.left), rect.width);
        const y = Math.min(Math.max(0, event.clientY - rect.top), rect.height);
        pickerSat = rect.width === 0 ? 0 : x / rect.width;
        pickerVal = rect.height === 0 ? 0 : 1 - (y / rect.height);
        updatePickerUI();
        applyCurrentColor();
    };

    const handleHuePointer = (event) => {
        const rect = hueSlider.getBoundingClientRect();
        const y = Math.min(Math.max(0, event.clientY - rect.top), rect.height);
        pickerHue = rect.height === 0 ? 0 : 360 * (1 - (y / rect.height));
        updatePickerUI();
        applyCurrentColor();
    };

    svPicker.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        svPicker.setPointerCapture(event.pointerId);
        handleSvPointer(event);
        const move = (e) => handleSvPointer(e);
        const up = () => {
            svPicker.releasePointerCapture(event.pointerId);
            svPicker.removeEventListener('pointermove', move);
            svPicker.removeEventListener('pointerup', up);
            svPicker.removeEventListener('pointercancel', up);
        };
        svPicker.addEventListener('pointermove', move);
        svPicker.addEventListener('pointerup', up);
        svPicker.addEventListener('pointercancel', up);
    });

    hueSlider.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        hueSlider.setPointerCapture(event.pointerId);
        handleHuePointer(event);
        const move = (e) => handleHuePointer(e);
        const up = () => {
            hueSlider.releasePointerCapture(event.pointerId);
            hueSlider.removeEventListener('pointermove', move);
            hueSlider.removeEventListener('pointerup', up);
            hueSlider.removeEventListener('pointercancel', up);
        };
        hueSlider.addEventListener('pointermove', move);
        hueSlider.addEventListener('pointerup', up);
        hueSlider.addEventListener('pointercancel', up);
    });

    if (hexInput) {
        hexInput.addEventListener('change', () => {
            let value = hexInput.value.trim();
            if (!value.startsWith('#')) value = `#${value}`;
            if (!/^#([0-9a-fA-F]{6})$/.test(value)) {
                updateCustomSwatches(applyThemeFunc);
                return;
            }
            const target = targetSelect.value;
            themeState.customThemeHex[target] = value.toUpperCase();
            saveCustomThemeHex();
            if (applyThemeFunc) applyThemeFunc('custom');
            updateCustomSwatches(applyThemeFunc);
        });
    }
}

async function saveSavedConfigThemes() {
    await savedConfigThemesStore.save();
}

export function loadSavedConfigThemes() {
    savedConfigThemesStore.load();
}

export function getCurrentTheme() {
    return themeState.currentTheme;
}

export function getCustomThemeHex() {
    return { ...themeState.customThemeHex };
}

export function isCustomThemeEnabled() {
    return themeState.customThemeEnabled;
}

export function getCustomThemeName() {
    return themeState.customThemeName;
}

export function getSavedCustomThemes() {
    return themeState.savedCustomThemes.map((theme) => ({
        name: theme.name,
        hex: theme && theme.hex && typeof theme.hex === 'object' ? { ...theme.hex } : {}
    }));
}

export function isAutoRankThemeEnabled() {
    return themeState.autoRankThemeEnabled;
}

export function getMaxUnlockedRankIndex() {
    return themeState.maxUnlockedRankIndex;
}

export function setCustomThemeName(name) {
    const value = typeof name === 'string' ? name.trim() : '';
    themeState.customThemeName = value ? value.slice(0, 16) : 'Custom';
}

export function setCustomThemeEnabled(enabled) {
    themeState.customThemeEnabled = !!enabled;
}

export function setCustomThemeHex(hex) {
    const next = (hex && typeof hex === 'object' && !Array.isArray(hex)) ? hex : {};
    themeState.customThemeHex = { ...CUSTOM_THEME_HEX_DEFAULTS, ...next };
}

export function setSavedCustomThemes(themes) {
    if (!Array.isArray(themes)) {
        themeState.savedCustomThemes = [];
        return;
    }
    themeState.savedCustomThemes = themes
        .filter(item => item && typeof item.name === 'string' && item.hex && typeof item.hex === 'object')
        .map(item => ({
            name: item.name.trim().slice(0, 16) || 'Custom',
            hex: { ...item.hex }
        }));
}

export function setAutoRankThemeEnabled(enabled) {
    themeState.autoRankThemeEnabled = !!enabled;
}

export function setMaxUnlockedRankIndex(index) {
    const value = Number(index);
    themeState.maxUnlockedRankIndex = Number.isFinite(value)
        ? Math.max(0, Math.min(FINAL_RANK_INDEX, Math.floor(value)))
        : 0;
}


