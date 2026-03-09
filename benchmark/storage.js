export const THEME_UNLOCK_STORAGE_KEY = 'benchmark_rank_theme_unlock_level';
export const AUTO_RANK_THEME_STORAGE_KEY = 'benchmark_auto_rank_theme';
export const CONFIG_THEMES_STORAGE_KEY = 'benchmark_saved_config_themes';
export const THEME_STORAGE_KEY = 'benchmark_theme';
export const THEME_USER_SELECTED_STORAGE_KEY = 'benchmark_theme_user_selected';
export const CUSTOM_THEME_ENABLED_STORAGE_KEY = 'benchmark_custom_theme_enabled';
export const CUSTOM_THEME_NAME_STORAGE_KEY = 'benchmark_custom_theme_name';
export const CUSTOM_THEME_HEX_STORAGE_KEY = 'benchmark_custom_theme_hex';
export const SAVED_CUSTOM_THEMES_STORAGE_KEY = 'benchmark_saved_custom_themes';
export const LANGUAGE_STORAGE_KEY = 'benchmark_language';
export const VISIBILITY_STORAGE_KEY = 'benchmark_visibility_setting';
export const SCORE_STORAGE_KEY = 'benchmark_saved_scores';
export const CAVE_LINKS_STORAGE_KEY = 'benchmark_saved_cave_links';
export const SCORE_UPDATED_AT_STORAGE_KEY = 'benchmark_saved_scores_updated_at';
export const VIEWED_REQUESTS_STORAGE_PREFIX = 'benchmark_viewed_requests_v2';
export const PACMAN_STORAGE_KEY = 'benchmark_pacman_mode';
export const ACCOUNT_ID_MAP_STORAGE_KEY = 'benchmark_account_ids_v1';
export const ACHIEVEMENTS_STORAGE_KEY = 'benchmark_achievements';
export const DEFAULT_CONFIG_STORAGE_KEY = 'benchmark_default_config';
export const CACHED_VIEWS_STORAGE_KEY = 'benchmark_cached_views';
export const PROFILE_VIEW_COOLDOWNS_STORAGE_KEY = 'benchmark_profile_view_cooldowns_v1';
export const SEASONAL_TROPHIES_STORAGE_KEY = 'benchmark_seasonal_trophies';
export const PROFILE_PIC_STORAGE_KEY = 'benchmark_profile_pic';
export const PROFILE_PIC_ORIGINAL_STORAGE_KEY = 'benchmark_profile_pic_original';
export const PROFILE_PIC_STATE_STORAGE_KEY = 'benchmark_profile_pic_state';
export const COUNTRY_FLAG_STORAGE_KEY = 'benchmark_country_flag';
export const GUILDS_STORAGE_KEY = 'benchmark_guilds';
export const LEGACY_ACCOUNT_ID_STORAGE_KEY = 'benchmark_account_id';
export const REDIRECT_GUARD_FLAG_KEY = 'benchmark_disable_auto_nav';
export const REDIRECT_LOAD_GUARD_KEY = 'benchmark_auto_nav_load_guard';
export const LOGIN_REDIRECT_LOOP_COUNT_KEY = 'benchmark_login_redirect_count';
export const LOGIN_REDIRECT_LOOP_AT_KEY = 'benchmark_login_redirect_count_at';
export const LOGIN_REDIRECT_TARGET_KEY = 'benchmark_login_redirect_target';
export const LOGIN_REDIRECT_AT_KEY = 'benchmark_login_redirect_at';

export function readString(key, fallback = "") {
    try {
        const value = localStorage.getItem(key);
        return value == null ? fallback : String(value);
    } catch (e) {
        return fallback;
    }
}

export function writeString(key, value) {
    try {
        localStorage.setItem(key, String(value));
        return true;
    } catch (e) {
        return false;
    }
}

export function removeItem(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (e) {
        return false;
    }
}

export function readJson(key, fallback = null) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        return JSON.parse(raw);
    } catch (e) {
        return fallback;
    }
}

export function writeJson(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (e) {
        return false;
    }
}
