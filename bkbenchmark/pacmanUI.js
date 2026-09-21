import { state } from "./appState.js";
import { readString, writeString, PACMAN_STORAGE_KEY } from "./storage.js";
import { getCachedElementById } from "./utils/domUtils.js";

export function loadPacmanSetting() {
    state.pacmanModeEnabled = readString(PACMAN_STORAGE_KEY, "false") === "true";
}

export async function savePacmanSetting(saveSettings) {
    if (state.isViewMode) return;
    writeString(PACMAN_STORAGE_KEY, state.pacmanModeEnabled ? "true" : "false");
    if (typeof saveSettings === "function") {
        await saveSettings();
    }
}

function syncPacmanToggle() {
    const toggle = getCachedElementById("pacmanModeToggle");
    if (!toggle) return;
    toggle.dataset.state = state.pacmanModeEnabled ? "on" : "off";
    toggle.setAttribute("aria-pressed", state.pacmanModeEnabled ? "true" : "false");
}

export function syncPacmanUI(onRadarUpdate) {
    const select = getCachedElementById("pacmanModeSelect");
    if (select) {
        select.value = state.pacmanModeEnabled ? "on" : "off";
    }
    syncPacmanToggle();
    if (typeof onRadarUpdate === "function") {
        onRadarUpdate();
    }
}

export function injectPacmanSettingUI({
    onSave = null,
    onRadarUpdate = null,
    reapplyLanguage = null
} = {}) {
    const settingsGrid = document.querySelector("#settingsModal .settings-grid");
    if (!settingsGrid || getCachedElementById("pacmanModeCard")) return;

    const card = document.createElement("div");
    card.className = "settings-card";
    card.id = "pacmanModeCard";
    card.innerHTML = `
        <div class="settings-card-title" data-i18n="settings_pacman">Pacman</div>
        <div class="settings-field">
            <select id="pacmanModeSelect" hidden aria-hidden="true" tabindex="-1">
                <option value="off">off</option>
                <option value="on">on</option>
            </select>
            <button type="button" id="pacmanModeToggle" class="settings-toggle-wide" data-state="off" aria-pressed="false" aria-label="Pacman">
                <span class="settings-toggle-wide-on" data-i18n="settings_toggle_enabled">Enabled</span>
                <span class="settings-toggle-wide-off" data-i18n="settings_toggle_disabled">Disabled</span>
            </button>
        </div>
    `;
    settingsGrid.appendChild(card);

    const select = card.querySelector("#pacmanModeSelect");
    const toggle = card.querySelector("#pacmanModeToggle");
    if (select && toggle) {
        toggle.addEventListener("click", () => {
            select.value = select.value === "on" ? "off" : "on";
            select.dispatchEvent(new Event("change", { bubbles: true }));
        });
    }
    if (select) {
        select.value = state.pacmanModeEnabled ? "on" : "off";
        syncPacmanToggle();
        select.addEventListener("change", async (e) => {
            state.pacmanModeEnabled = e.target.value === "on";
            syncPacmanToggle();
            await savePacmanSetting(onSave);
            if (typeof onRadarUpdate === "function") {
                onRadarUpdate();
            }
        });
    }

    if (typeof reapplyLanguage === "function") {
        reapplyLanguage();
    }
}
