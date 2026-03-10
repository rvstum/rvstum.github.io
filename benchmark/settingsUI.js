import { state } from "./appState.js";
import { isMobileViewport } from "./utils.js";
import { getCachedElementById } from "./utils/domUtils.js";
import * as ThemeUI from "./themeUI.js?v=20260310-reset-theme-fix-1";
import {
    readString,
    writeString,
    THEME_USER_SELECTED_STORAGE_KEY,
    VISIBILITY_STORAGE_KEY
} from "./storage.js";

const MOBILE_SETTINGS_SELECT_SELECTOR = "#settingsModal select.settings-select";

export function initSettingsUI(options = {}) {
    const {
        BENCHMARK_LANGUAGE_LABELS,
        applyLanguage,
        syncSettingsUI,
        saveSettings,
        resetSelectedScores,
        resetAllConfigurations,
        handleDefaultConfigChange,
        bindModalOverlayQuickClose
    } = options;

    const settingsBtn = getCachedElementById("settingsBtn");
    const mobileOptionsLink = getCachedElementById("mobileOptionsLink");
    const settingsModal = getCachedElementById("settingsModal");
    const closeSettingsModal = getCachedElementById("closeSettingsModal");
    const resetSelectedScoresBtn = getCachedElementById("resetSelectedScoresBtn");
    const resetAllScoresBtn = getCachedElementById("resetAllScoresBtn");
    const autoRankThemeSelect = getCachedElementById("autoRankThemeSelect");
    const languageSelect = getCachedElementById("languageSelect");
    const visibilitySelect = getCachedElementById("visibilitySelect");
    const saveCustomThemeNameBtn = getCachedElementById("saveCustomThemeNameBtn");
    const removeCustomThemeBtn = getCachedElementById("removeCustomThemeBtn");
    const customThemeNameInput = getCachedElementById("customThemeName");

    let mobileSettingsDropdownDocBound = false;
    let modalAuthLangDropdownDocBound = false;

    function normalizeSettingsLanguageDropdownLabels() {
        const langSelect = getCachedElementById("languageSelect");
        if (!langSelect) return;
        Array.from(langSelect.options).forEach((opt) => {
            const clean = BENCHMARK_LANGUAGE_LABELS[opt.value];
            if (clean) opt.textContent = clean;
        });
    }

    function normalizeAuthLanguageDropdownLabels() {
        document.querySelectorAll(".auth-lang-select").forEach((selectEl) => {
            Array.from(selectEl.options).forEach((opt) => {
                const clean = BENCHMARK_LANGUAGE_LABELS[opt.value];
                if (clean) opt.textContent = clean;
            });
        });
    }

    function syncMobileSettingsMenuPlacement(wrapper, trigger, menu) {
        if (!wrapper || !trigger || !menu) return;

        wrapper.classList.remove("open-up");
        menu.style.maxHeight = "";

        const modalBox = wrapper.closest(".settings-content-box");
        const triggerRect = trigger.getBoundingClientRect();
        const modalRect = modalBox
            ? modalBox.getBoundingClientRect()
            : { top: 0, bottom: window.innerHeight };
        const viewportTop = Math.max(0, modalRect.top + 8);
        const viewportBottom = Math.min(window.innerHeight, modalRect.bottom - 8);
        const availableAbove = Math.max(0, Math.floor(triggerRect.top - viewportTop - 4));
        const availableBelow = Math.max(0, Math.floor(viewportBottom - triggerRect.bottom - 4));
        const estimatedMenuHeight = Math.min(180, Math.max(menu.scrollHeight || 0, menu.childElementCount * 38, 76));
        const shouldOpenUp = availableBelow < estimatedMenuHeight && availableAbove > availableBelow;
        const boundedHeight = shouldOpenUp ? availableAbove : availableBelow;

        wrapper.classList.toggle("open-up", shouldOpenUp);
        if (boundedHeight > 0) {
            menu.style.maxHeight = `${Math.max(76, boundedHeight)}px`;
        } else {
            menu.style.maxHeight = `${estimatedMenuHeight}px`;
        }
    }

    function setupMobileSettingsDropdowns() {
        normalizeSettingsLanguageDropdownLabels();
        const selects = Array.from(document.querySelectorAll(MOBILE_SETTINGS_SELECT_SELECTOR));
        if (!selects.length) return;

        const isMobile = isMobileViewport();
        selects.forEach((selectEl) => {
            const existing = selectEl.nextElementSibling;
            const hasCustom = existing && existing.classList && existing.classList.contains("settings-custom-select");

            if (!isMobile) {
                selectEl.classList.remove("settings-select-native-hidden");
                if (hasCustom) existing.remove();
                return;
            }

            selectEl.classList.add("settings-select-native-hidden");
            const wrapper = hasCustom ? existing : document.createElement("div");
            if (!hasCustom) {
                wrapper.className = "settings-custom-select";
                wrapper.innerHTML = `
                    <button type="button" class="settings-custom-trigger" aria-expanded="false"></button>
                    <div class="settings-custom-menu"></div>
                `;
                selectEl.insertAdjacentElement("afterend", wrapper);
            }

            const trigger = wrapper.querySelector(".settings-custom-trigger");
            const menu = wrapper.querySelector(".settings-custom-menu");
            if (!trigger || !menu) return;

            const syncLabel = () => {
                const selected = selectEl.options[selectEl.selectedIndex];
                trigger.textContent = selected ? selected.textContent : "";
            };

            menu.innerHTML = "";
            Array.from(selectEl.options).forEach((opt) => {
                const item = document.createElement("button");
                item.type = "button";
                item.className = "settings-custom-item";
                item.textContent = opt.textContent;
                item.dataset.value = opt.value;
                item.addEventListener("click", () => {
                    selectEl.value = opt.value;
                    selectEl.dispatchEvent(new Event("change", { bubbles: true }));
                    wrapper.classList.remove("open");
                    trigger.setAttribute("aria-expanded", "false");
                    syncLabel();
                });
                menu.appendChild(item);
            });

            if (wrapper.dataset.bound !== "1") {
                trigger.addEventListener("click", (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const willOpen = !wrapper.classList.contains("open");
                    document.querySelectorAll("#settingsModal .settings-custom-select.open").forEach((el) => {
                        el.classList.remove("open");
                        const btn = el.querySelector(".settings-custom-trigger");
                        if (btn) btn.setAttribute("aria-expanded", "false");
                    });
                    if (willOpen) {
                        syncMobileSettingsMenuPlacement(wrapper, trigger, menu);
                    }
                    wrapper.classList.toggle("open", willOpen);
                    trigger.setAttribute("aria-expanded", willOpen ? "true" : "false");
                });
                selectEl.addEventListener("change", syncLabel);
                wrapper.dataset.bound = "1";
            }

            syncLabel();
        });

        if (!mobileSettingsDropdownDocBound) {
            document.addEventListener("click", (e) => {
                if (e.target && e.target.closest && e.target.closest("#settingsModal .settings-custom-select")) return;
                document.querySelectorAll("#settingsModal .settings-custom-select.open").forEach((el) => {
                    el.classList.remove("open");
                    const btn = el.querySelector(".settings-custom-trigger");
                    if (btn) btn.setAttribute("aria-expanded", "false");
                });
            });
            mobileSettingsDropdownDocBound = true;
        }
    }

    function setupModalAuthLanguageDropdowns() {
        normalizeAuthLanguageDropdownLabels();
        const selects = Array.from(document.querySelectorAll("#verificationModal .auth-lang-select, #onboardingModal .auth-lang-select"));
        if (!selects.length) return;

        selects.forEach((selectEl) => {
            const existing = selectEl.nextElementSibling;
            const hasCustom = existing
                && existing.classList
                && existing.classList.contains("auth-lang-dropdown")
                && existing.classList.contains("auth-lang-dropdown--modal");

            selectEl.classList.add("auth-lang-select-native-hidden");

            const wrapper = hasCustom ? existing : document.createElement("div");
            if (!hasCustom) {
                wrapper.className = "auth-lang-dropdown auth-lang-dropdown--modal";
                wrapper.innerHTML = `
                    <button type="button" class="auth-lang-button" aria-expanded="false"></button>
                    <div class="auth-lang-menu"></div>
                `;
                selectEl.insertAdjacentElement("afterend", wrapper);
            }

            const trigger = wrapper.querySelector(".auth-lang-button");
            const menu = wrapper.querySelector(".auth-lang-menu");
            if (!trigger || !menu) return;

            const syncLabel = () => {
                const selected = selectEl.options[selectEl.selectedIndex];
                trigger.textContent = selected ? selected.textContent : "Language";
            };

            menu.innerHTML = "";
            Array.from(selectEl.options).forEach((opt) => {
                const item = document.createElement("button");
                item.type = "button";
                item.className = "auth-lang-option";
                item.textContent = opt.textContent;
                item.dataset.value = opt.value;
                item.addEventListener("click", () => {
                    selectEl.value = opt.value;
                    selectEl.dispatchEvent(new Event("change", { bubbles: true }));
                    wrapper.classList.remove("open");
                    trigger.setAttribute("aria-expanded", "false");
                    syncLabel();
                });
                menu.appendChild(item);
            });

            if (wrapper.dataset.bound !== "1") {
                trigger.addEventListener("click", (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const willOpen = !wrapper.classList.contains("open");
                    document.querySelectorAll(".auth-lang-dropdown--modal.open").forEach((el) => {
                        el.classList.remove("open");
                        const btn = el.querySelector(".auth-lang-button");
                        if (btn) btn.setAttribute("aria-expanded", "false");
                    });
                    wrapper.classList.toggle("open", willOpen);
                    trigger.setAttribute("aria-expanded", willOpen ? "true" : "false");
                });
                selectEl.addEventListener("change", syncLabel);
                wrapper.dataset.bound = "1";
            }

            syncLabel();
        });

        if (!modalAuthLangDropdownDocBound) {
            document.addEventListener("click", (e) => {
                if (e.target && e.target.closest && e.target.closest(".auth-lang-dropdown--modal")) return;
                document.querySelectorAll(".auth-lang-dropdown--modal.open").forEach((el) => {
                    el.classList.remove("open");
                    const btn = el.querySelector(".auth-lang-button");
                    if (btn) btn.setAttribute("aria-expanded", "false");
                });
            });
            modalAuthLangDropdownDocBound = true;
        }
    }

    function closeSettings() {
        if (!settingsModal) return;
        settingsModal.classList.add("closing");
        setTimeout(() => {
            settingsModal.classList.remove("show");
            settingsModal.classList.remove("closing");
        }, 200);
    }

    if (settingsBtn) {
        settingsBtn.addEventListener("click", () => {
            syncSettingsUI();
            setupMobileSettingsDropdowns();
            if (settingsModal) settingsModal.classList.add("show");
            requestAnimationFrame(() => {
                ThemeUI.updateCustomSwatches(ThemeUI.applyTheme);
                ThemeUI.buildSettingsPreview();
            });
        });
    }

    if (mobileOptionsLink && settingsBtn) {
        mobileOptionsLink.addEventListener("click", () => {
            settingsBtn.click();
        });
    }

    window.addEventListener("resize", setupMobileSettingsDropdowns);
    requestAnimationFrame(setupMobileSettingsDropdowns);
    requestAnimationFrame(setupModalAuthLanguageDropdowns);

    if (closeSettingsModal) {
        closeSettingsModal.addEventListener("click", closeSettings);
    }
    if (typeof bindModalOverlayQuickClose === "function") {
        bindModalOverlayQuickClose(settingsModal, closeSettings);
    }

    document.querySelectorAll(".theme-option").forEach((btn) => {
        btn.addEventListener("click", async () => {
            const theme = btn.getAttribute("data-theme");
            const rankIndex = ThemeUI.getRankThemeIndex(theme);
            const unlockLimit = ThemeUI.getThemeUnlockRankLimit();
            if (rankIndex !== null && rankIndex > unlockLimit) return;
            writeString(THEME_USER_SELECTED_STORAGE_KEY, "true");
            await ThemeUI.applyTheme(theme, true);
        });
    });

    if (autoRankThemeSelect) {
        autoRankThemeSelect.addEventListener("change", (e) => {
            ThemeUI.setAutoRankThemeEnabled(e.target.value === "on");
            ThemeUI.saveAutoRankThemeSetting();
            if (ThemeUI.isAutoRankThemeEnabled() && Number.isFinite(state.lastMainRankIndex) && state.lastMainRankIndex > 0) {
                const applyIndex = Math.min(state.lastMainRankIndex, ThemeUI.getThemeUnlockRankLimit());
                writeString(THEME_USER_SELECTED_STORAGE_KEY, "true");
                ThemeUI.applyTheme(`rank-${applyIndex}`, true);
            }
        });
    }

    if (languageSelect) {
        languageSelect.addEventListener("change", (e) => {
            applyLanguage(e.target.value);
        });
    }
    document.querySelectorAll(".auth-lang-select").forEach((sel) => {
        sel.addEventListener("change", (e) => {
            applyLanguage(e.target.value);
        });
    });

    if (visibilitySelect) {
        const savedVisibility = readString(VISIBILITY_STORAGE_KEY, "");
        if (savedVisibility) visibilitySelect.value = savedVisibility;
        visibilitySelect.addEventListener("change", (e) => {
            writeString(VISIBILITY_STORAGE_KEY, e.target.value);
            saveSettings();
        });
    }

    if (saveCustomThemeNameBtn) {
        saveCustomThemeNameBtn.addEventListener("click", () => {
            const nextName = (customThemeNameInput?.value || "").trim();
            if (!nextName) return;
            ThemeUI.setCustomThemeName(nextName.slice(0, 16));
            const savedThemes = ThemeUI.getSavedCustomThemes();
            const themeName = ThemeUI.getCustomThemeName();
            const existingIndex = savedThemes.findIndex((theme) => theme.name === themeName);
            const isNew = existingIndex < 0;
            const snapshot = ThemeUI.getCustomThemeHexSnapshot();
            if (isNew) {
                ThemeUI.setCustomThemeHex(snapshot);
                ThemeUI.saveCustomThemeHex();
            }
            const nextThemes = [...savedThemes];
            if (existingIndex >= 0) {
                nextThemes[existingIndex] = { name: themeName, hex: snapshot };
            } else {
                nextThemes.push({ name: themeName, hex: snapshot });
            }
            ThemeUI.setSavedCustomThemes(nextThemes);
            ThemeUI.setCustomThemeEnabled(true);
            ThemeUI.saveCustomThemeState();
            ThemeUI.saveSavedCustomThemes();

            if (ThemeUI.getCurrentTheme() === "custom" || isNew) {
                ThemeUI.applyTheme("custom", true);
            }
            ThemeUI.updateCustomSwatches(ThemeUI.applyTheme);
            ThemeUI.updateCustomThemeUI(ThemeUI.applyTheme);
        });
    }

    if (customThemeNameInput) {
        customThemeNameInput.addEventListener("keydown", (e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            if (saveCustomThemeNameBtn) saveCustomThemeNameBtn.click();
        });
    }

    if (removeCustomThemeBtn) {
        removeCustomThemeBtn.addEventListener("click", () => {
            if (!ThemeUI.isCustomThemeEnabled()) return;
            const currentThemeName = ThemeUI.getCustomThemeName();
            const targetName = (customThemeNameInput?.value || currentThemeName || "").trim();
            if (!targetName) return;
            const savedThemes = ThemeUI.getSavedCustomThemes();
            const nextList = savedThemes.filter((theme) => theme.name !== targetName);
            if (nextList.length === savedThemes.length) return;
            ThemeUI.setSavedCustomThemes(nextList);
            if (currentThemeName === targetName) {
                ThemeUI.setCustomThemeName("Custom");
            }
            ThemeUI.saveCustomThemeState();
            ThemeUI.saveSavedCustomThemes();
            ThemeUI.updateCustomThemeUI(ThemeUI.applyTheme);
        });
    }

    if (resetSelectedScoresBtn) {
        resetSelectedScoresBtn.addEventListener("click", resetSelectedScores);
    }
    if (resetAllScoresBtn) {
        resetAllScoresBtn.addEventListener("click", resetAllConfigurations);
    }

    ["defaultPlatform", "defaultTime", "defaultStat", "defaultMount"].forEach((id) => {
        const select = getCachedElementById(id);
        if (select) select.addEventListener("change", handleDefaultConfigChange);
    });

    return {
        setupMobileSettingsDropdowns,
        setupModalAuthLanguageDropdowns
    };
}
