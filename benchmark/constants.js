export const RANK_THRESHOLDS = [0, 1350, 2700, 4050, 5400, 6750, 8100, 9450, 10800, 12150, 13500, 14850, 16200, 17550];

export const RANKS = [
    { name: 'Unranked', color: 'transparent', textColor: '#e0e0e0', scoreTextColor: '#ffffff', lineColor: 'rgba(255, 255, 255, 0.4)' },
    { name: 'Iron', color: '#505050', textColor: '#6E6E6E', scoreTextColor: '#b0b0b0', lineColor: '#909090' },
    { name: 'Bronze', color: '#A05A2C', textColor: '#CD7F32', scoreTextColor: '#e6a060', lineColor: '#8B4513' },
    { name: 'Silver', color: '#A0A0A0', textColor: '#C0C0C0', scoreTextColor: '#e0e0e0', lineColor: '#333333' },
    { name: 'Gold', color: '#967A00', textColor: '#C5A000', scoreTextColor: '#ffd700', lineColor: '#FFF59D' },
    { name: 'Platinum', color: '#40B0B0', textColor: '#5FE0E0', scoreTextColor: '#80ffff', lineColor: '#00fcff' },
    { name: 'Diamond', color: '#1976D2', textColor: '#2196F3', scoreTextColor: '#64b5f6', lineColor: '#19c1d2' },
    { name: 'Master', color: '#5E35B1', textColor: '#7B3FE4', scoreTextColor: '#b388ff', lineColor: '#aa00ff' },
    { name: 'Grandmaster', color: '#B8AA00', textColor: '#E6E600', scoreTextColor: '#ffff00', lineColor: '#fff122' },
    { name: 'Champion', color: '#FF3B30', textColor: '#FF3B30', scoreTextColor: '#ff8585', lineColor: '#8d0000' },
    { name: 'Paragon', color: '#00796B', textColor: '#00A892', scoreTextColor: '#4db6ac', lineColor: '#00e2b1' },
    { name: 'Stellar', color: '#FF9100', textColor: '#FF6F00', scoreTextColor: '#ffa726', lineColor: '#ffb700' },
    { name: 'Celestium', color: '#AD1457', textColor: '#D8007F', scoreTextColor: '#f48fb1', lineColor: '#FFB2DD' },
    { name: 'Aeternus', color: '#d1bf8f', textColor: '#e5d9b6', scoreTextColor: '#f2e9cf', lineColor: '#fff7e5' }
];

export const RANK_COLORS = RANKS.map((rank) => rank.color);
export const RANK_NAMES = RANKS.map((rank) => rank.name);
export const RANK_TEXT_COLORS = RANKS.map((rank) => rank.textColor);
export const SCORE_TEXT_COLORS = RANKS.map((rank) => rank.scoreTextColor);
export const RANK_LINE_COLORS = RANKS.map((rank) => rank.lineColor);
export const FINAL_RANK_INDEX = RANKS.length - 1;

export const STELLAR_TROPHY_FILTER = 'sepia(1) hue-rotate(-18deg) saturate(4.8) brightness(1.05)';
export const DEFAULT_BAR_COLOR = 'rgba(255, 255, 255, 0.02)';
export const DEFAULT_SLANTED_COLOR = 'rgba(0, 0, 0, 0.55)';

export const DEFAULT_MOUNT_CONFIG = 'mountspeed1';
export const CAVE_GROUPS = [
    [0, 1], [2, 3], [4, 5], [6], [7, 8], [9, 10], [11, 12], [13]
];
export const MOUNT_CONFIG_IMAGES = {
    mountspeed1: '../icons/mountspeed1.png',
    mountspeed2: '../icons/mountspeed2.png'
};
export const MOUNT_CONFIG_I18N_KEYS = {
    mountspeed1: 'mount_speed_1',
    mountspeed2: 'mount_speed_2'
};
export const CONFIG_OPTIONS = {
    platform: ['Mobile', 'PC'],
    time: ['5 Min', '10 Min', '60 Min'],
    stat: ['Baddy Kills', 'Baddy Points'],
    mount: [DEFAULT_MOUNT_CONFIG, 'mountspeed2']
};

const SCORE_BASES_BY_RUNTIME_CONFIG = {
    '5 Min|Baddy Kills|mountspeed1': [70, 53, 68, 39, 54, 53, 22, 85, 119, 85, 106, 118, 137, 85],
    '5 Min|Baddy Points|mountspeed1': [53, 44, 53, 26, 39, 42, 26, 38, 53, 47, 49, 67, 80, 43],
    '5 Min|Baddy Kills|mountspeed2': [75, 57, 72, 42, 57, 57, 24, 91, 127, 91, 113, 126, 147, 91],
    '5 Min|Baddy Points|mountspeed2': [57, 48, 56, 28, 41, 46, 28, 40, 56, 51, 52, 72, 86, 46],
    '10 Min|Baddy Kills|mountspeed1': [138, 104, 134, 77, 106, 104, 43, 167, 234, 167, 209, 232, 270, 167],
    '10 Min|Baddy Points|mountspeed1': [104, 87, 104, 51, 77, 83, 51, 75, 104, 93, 97, 132, 158, 85],
    '10 Min|Baddy Kills|mountspeed2': [148, 112, 142, 83, 112, 112, 47, 179, 250, 179, 223, 248, 290, 179],
    '10 Min|Baddy Points|mountspeed2': [112, 95, 110, 55, 81, 91, 55, 79, 110, 100, 102, 142, 169, 91],
    '60 Min|Baddy Kills|mountspeed1': [827, 626, 804, 461, 638, 626, 260, 1005, 1407, 1005, 1253, 1395, 1619, 1005],
    '60 Min|Baddy Points|mountspeed1': [626, 520, 626, 307, 461, 496, 307, 449, 626, 556, 579, 792, 946, 508],
    '60 Min|Baddy Kills|mountspeed2': [887, 674, 851, 496, 674, 674, 284, 1076, 1501, 1076, 1336, 1489, 1738, 1076],
    '60 Min|Baddy Points|mountspeed2': [674, 567, 662, 331, 485, 544, 331, 473, 662, 603, 615, 851, 1017, 544]
};

const SCORE_BASE_PLATFORMS = ['Mobile', 'PC'];
const DEFAULT_SCORE_BASE_RUNTIME_KEY = '5 Min|Baddy Kills|mountspeed1';
// DBCS_02 (layout row 12) uses reduced thresholds across every runtime config.
const SCORE_BASE_ROW_MULTIPLIERS = {
    12: 0.92
};

function toRuntimeScoreBaseKey(configKey) {
    const raw = typeof configKey === 'string' ? configKey.trim() : '';
    if (!raw) return DEFAULT_SCORE_BASE_RUNTIME_KEY;
    const parts = raw.split('|');
    if (parts.length === 4) {
        const platform = parts[0];
        if (SCORE_BASE_PLATFORMS.includes(platform)) {
            return parts.slice(1).join('|');
        }
    }
    if (parts.length === 3) {
        if (SCORE_BASE_PLATFORMS.includes(parts[0])) {
            // Legacy key format: platform|time|stat
            return `${parts[1]}|${parts[2]}|${DEFAULT_MOUNT_CONFIG}`;
        }
        return raw;
    }
    return DEFAULT_SCORE_BASE_RUNTIME_KEY;
}

export function getScoreBaseForConfigKey(configKey) {
    const runtimeKey = toRuntimeScoreBaseKey(configKey);
    const resolved = SCORE_BASES_BY_RUNTIME_CONFIG[runtimeKey] || SCORE_BASES_BY_RUNTIME_CONFIG[DEFAULT_SCORE_BASE_RUNTIME_KEY];
    return resolved.map((base, index) => {
        const multiplier = SCORE_BASE_ROW_MULTIPLIERS[index];
        return Number.isFinite(multiplier) ? Number(base) * multiplier : base;
    });
}

export const RADAR_BAR_COLORS = {
    Rats: '#9D8F84',
    Bats: '#41384B',
    Lizardrons: '#1A361B',
    Pyrats: '#A0140E',
    Rebels: '#008000',
    'Dark Blobs': '#58554E',
    Spiders: '#BD6B29'
};

export const RADAR_CATEGORY_WEIGHTS = [
    { name: 'Rats',       weights: [[2, 1], [3, 1], [0, 0.5], [1, 0.5], [9, 0.25], [10, 0.05], [11, 0.05], [12, 0.05]] },
    { name: 'Bats',       weights: [[0, 0.5], [1, 0.5], [4, 1], [5, 1]] },
    { name: 'Lizardrons', weights: [[6, 1]] },
    { name: 'Pyrats',     weights: [[7, 1], [8, 1]] },
    { name: 'Rebels',     weights: [[9, 0.75], [10, 0.95]] },
    { name: 'Dark Blobs', weights: [[11, 0.95], [12, 0.95]] },
    { name: 'Spiders',    weights: [[13, 1]] }
];

export const RADAR_SWORDS_CATEGORIES = ['Rats', 'Bats', 'Lizardrons'];
