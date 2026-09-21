import { getCurrentConfigState, setCurrentConfigState } from "./appState.js";
import { tForLang, currentLanguage } from "./i18n.js";
import {
    DEFAULT_MOUNT_CONFIG,
    MOUNT_CONFIG_IMAGES,
    MOUNT_CONFIG_I18N_KEYS,
    CONFIG_OPTIONS
} from "./constants.js";
import { readString, DEFAULT_CONFIG_STORAGE_KEY } from "./storage.js";

export function normalizeMountConfig(value) {
    return Object.prototype.hasOwnProperty.call(MOUNT_CONFIG_IMAGES, value) ? value : DEFAULT_MOUNT_CONFIG;
}

export function getMountConfigLabel(value, lang = currentLanguage || "en") {
    const mount = normalizeMountConfig(value);
    const key = MOUNT_CONFIG_I18N_KEYS[mount] || "mount_speed_1";
    return tForLang(lang, key);
}

export function buildLegacyConfigKey(platform, time, stat) {
    return `${platform}|${time}|${stat}`;
}

export function buildConfigKey(platform, time, stat, mount = DEFAULT_MOUNT_CONFIG) {
    return `${platform}|${time}|${stat}|${normalizeMountConfig(mount)}`;
}

export function formatConfigLabel(platform, time, stat, mount = DEFAULT_MOUNT_CONFIG, lang = currentLanguage || "en") {
    return `${platform} - ${time} - ${stat} - ${getMountConfigLabel(mount, lang)}`;
}

export function getCurrentConfig() {
    const configState = getCurrentConfigState();
    if (configState && configState.platform && configState.time && configState.stat) {
        return {
            platform: configState.platform,
            time: configState.time,
            stat: configState.stat,
            mount: normalizeMountConfig(configState.mount || DEFAULT_MOUNT_CONFIG)
        };
    }

    const resolved = readDefaultConfig() || getStartupConfigDefaults();
    setCurrentConfigState(resolved);
    return resolved;
}

export function getConfigKey() {
    const current = getCurrentConfig();
    return buildConfigKey(current.platform, current.time, current.stat, current.mount);
}

export function getConfigLookupKeys(config = null) {
    const current = config || getCurrentConfig();
    const mount = normalizeMountConfig(current.mount);
    const fullKey = buildConfigKey(current.platform, current.time, current.stat, mount);
    if (mount === DEFAULT_MOUNT_CONFIG) {
        return [fullKey, buildLegacyConfigKey(current.platform, current.time, current.stat)];
    }
    return [fullKey];
}

export function getAllConfigKeys() {
    const keys = [];
    CONFIG_OPTIONS.platform.forEach((platform) => {
        CONFIG_OPTIONS.time.forEach((time) => {
            CONFIG_OPTIONS.stat.forEach((stat) => {
                CONFIG_OPTIONS.mount.forEach((mount) => {
                    keys.push({
                        platform,
                        time,
                        stat,
                        mount,
                        key: buildConfigKey(platform, time, stat, mount)
                    });
                });
            });
        });
    });
    return keys;
}

export function readDefaultConfig() {
    const raw = readString(DEFAULT_CONFIG_STORAGE_KEY, "");
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw);
        if (!parsed || !parsed.platform || !parsed.time || !parsed.stat) return null;
        return {
            ...parsed,
            mount: normalizeMountConfig(parsed.mount || DEFAULT_MOUNT_CONFIG)
        };
    } catch (e) {
        return null;
    }
}

export function getStartupConfigDefaults() {
    return {
        platform: CONFIG_OPTIONS.platform[0] || "Mobile",
        time: CONFIG_OPTIONS.time[0] || "5 Min",
        stat: CONFIG_OPTIONS.stat[0] || "Baddy Kills",
        mount: normalizeMountConfig((CONFIG_OPTIONS.mount && CONFIG_OPTIONS.mount[0]) || DEFAULT_MOUNT_CONFIG)
    };
}
