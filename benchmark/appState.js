export const state = {
    savedScores: {},
    savedCaveLinks: {},
    savedConfigThemes: {},
    allRowThresholds: [],
    individualRatings: [],
    lastMainRankIndex: null,
    maxUnlockedRankIndex: 0,
    isViewMode: false,
    hasPendingRequests: false,
    currentFriendRequests: [],
    saveScoresDebounceTimer: null,
    scoresHydrated: false,
    ratingUpdateRafId: null,
    pacmanModeEnabled: false,
    userAchievements: {},
    lastProgressInRank: 0,
    rowFillAnimationStates: [],
    focusedInputIndex: -1,
    subInputModeEnabled: false,
    activeSubInputRowIndex: -1,
    activeViewProfileContext: null,
    pageLoaderHideTimeout: null,
    pageLoaderStartedAt: (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(),
    theme: {
        currentTheme: 'default',
        customThemeHex: {},
        customThemeEnabled: false,
        customThemeName: 'Custom',
        savedCustomThemes: [],
        autoRankThemeEnabled: false,
        maxUnlockedRankIndex: 0
    },
    runtimeAccountId: '',
    currentConfig: {
        platform: 'Mobile',
        time: '5 Min',
        stat: 'Baddy Kills',
        mount: 'mountspeed1'
    },
    radarMode: 'combined',
    radarLabelsCache: []
};

export function getRuntimeAccountId() {
    return state.runtimeAccountId || '';
}

export function setRuntimeAccountId(value) {
    state.runtimeAccountId = (value || '').toString().trim();
    return state.runtimeAccountId;
}

export function getCurrentConfigState() {
    return state.currentConfig && typeof state.currentConfig === 'object'
        ? { ...state.currentConfig }
        : null;
}

export function setCurrentConfigState(nextConfig) {
    if (!nextConfig || typeof nextConfig !== 'object') return getCurrentConfigState();
    const platform = (nextConfig.platform || '').toString().trim();
    const time = (nextConfig.time || '').toString().trim();
    const stat = (nextConfig.stat || '').toString().trim();
    const mount = (nextConfig.mount || '').toString().trim();
    state.currentConfig = {
        platform: platform || 'Mobile',
        time: time || '5 Min',
        stat: stat || 'Baddy Kills',
        mount: mount || 'mountspeed1'
    };
    return getCurrentConfigState();
}
