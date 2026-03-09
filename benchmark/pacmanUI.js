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

export function syncPacmanUI(onRadarUpdate) {
    const select = getCachedElementById("pacmanModeSelect");
    if (select) {
        select.value = state.pacmanModeEnabled ? "on" : "off";
    }
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
            <select id="pacmanModeSelect" class="settings-select">
                <option value="off" data-i18n="settings_toggle_off">Off</option>
                <option value="on" data-i18n="settings_toggle_on">On</option>
            </select>
        </div>
    `;
    settingsGrid.appendChild(card);

    const select = card.querySelector("#pacmanModeSelect");
    if (select) {
        select.value = state.pacmanModeEnabled ? "on" : "off";
        select.addEventListener("change", async (e) => {
            state.pacmanModeEnabled = e.target.value === "on";
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
