import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, updateProfile, updateEmail, updatePassword, deleteUser, onAuthStateChanged, reauthenticateWithCredential, EmailAuthProvider, signOut, sendPasswordResetEmail, verifyBeforeUpdateEmail, sendEmailVerification } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs, updateDoc, arrayUnion, arrayRemove, onSnapshot, deleteDoc, increment } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAiZHVFIXe8LrxGS-TklX-pIqC135IpIbY",
  authDomain: "benchmark-5a89f.firebaseapp.com",
  projectId: "benchmark-5a89f",
  storageBucket: "benchmark-5a89f.appspot.com",
  messagingSenderId: "1001899133728",
  appId: "1:1001899133728:web:73b7dc8f8814533020e545",
  measurementId: "G-CCRXR4PKK2"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const RANK_THRESHOLDS = [0, 1350, 2700, 4050, 5400, 6750, 8100, 9450, 10800, 12150, 13500, 14850, 16200, 17550];
const RANK_COLORS = [
    'transparent',
    '#505050',
    '#A05A2C',
    '#A0A0A0',
    '#967A00',
    '#40B0B0',
    '#1976D2',
    '#5E35B1',
    '#FFC400',
    '#FF3B30',
    '#00796B',
    '#FF9100',
    '#AD1457',
    '#a64747'
];
const RANK_NAMES = [
    'Unranked', 'Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 
    'Master', 'Grandmaster', 'Champion', 'Paragon', 'Stellar', 'Celestium', 'Aeternus'
];
const FINAL_RANK_INDEX = RANK_NAMES.length - 1;
const THEME_UNLOCK_STORAGE_KEY = 'benchmark_rank_theme_unlock_level';
const AUTO_RANK_THEME_STORAGE_KEY = 'benchmark_auto_rank_theme';
const VISIBILITY_STORAGE_KEY = 'benchmark_visibility_setting';
const RANK_TEXT_COLORS = [
    '#e0e0e0',
    '#6E6E6E',
    '#CD7F32',
    '#C0C0C0',
    '#C5A000',
    '#5FE0E0',
    '#2196F3',
    '#7B3FE4', // Master
    '#E6E600', // Grandmaster
    '#FF3B30', // Champion
    '#00A892', // Paragon
    '#FF6F00', // Stellar
    '#D8007F', // Celestium
    '#a64747'  // Aeternus
];
const SCORE_TEXT_COLORS = [
    '#ffffff', // Unranked
    '#b0b0b0', // Iron
    '#e6a060', // Bronze
    '#e0e0e0', // Silver
    '#ffd700', // Gold
    '#80ffff', // Platinum
    '#64b5f6', // Diamond
    '#b388ff', // Master
    '#ffff00', // Grandmaster
    '#ff8585', // Champion
    '#4db6ac', // Paragon
    '#ffa726', // Stellar
    '#f48fb1', // Celestium
    '#d46a6a'  // Aeternus
];
const RANK_LINE_COLORS = [
    'rgba(255, 255, 255, 0.4)', // Unranked
    '#909090', // Iron (Brighter)
    '#8B4513', // Bronze (Fixed visibility)
    '#333333', // Silver (Darker 70%)
    '#FFF59D', // Gold (Brighter 70%)
    '#00fcff', // Platinum
    '#19c1d2', // Diamond
    '#aa00ff', // Master
    '#fff122', // Grandmaster
    '#8d0000', // Champion
    '#00e2b1', // Paragon
    '#ffb700', // Stellar
    '#FFB2DD', // Celestium (Brighter Pink)
    '#f58d89'  // Aeternus
];
const STELLAR_TROPHY_FILTER = 'sepia(1) hue-rotate(-18deg) saturate(4.8) brightness(1.05)';
const DEFAULT_BAR_COLOR = 'rgba(255, 255, 255, 0.02)';
const DEFAULT_SLANTED_COLOR = 'rgba(0, 0, 0, 0.55)';
// Global state variables

const SCORE_STORAGE_KEY = 'benchmark_saved_scores';
const CAVE_LINKS_STORAGE_KEY = 'benchmark_saved_cave_links';
const SCORE_UPDATED_AT_STORAGE_KEY = 'benchmark_saved_scores_updated_at';
const SCORE_BASES_BY_CONFIG = {
    default: [70, 53, 68, 39, 54, 53, 22, 85, 119, 85, 106, 118, 137, 85],
    // Mobile 5 Min
    'Mobile|5 Min|Baddy Kills|mountspeed1': [70, 53, 68, 39, 54, 53, 22, 85, 119, 85, 106, 118, 137, 85],
    'Mobile|5 Min|Baddy Points|mountspeed1': [53, 44, 53, 26, 39, 42, 26, 38, 53, 47, 49, 67, 80, 43],
    'Mobile|5 Min|Baddy Kills|mountspeed2': [75, 57, 72, 42, 57, 57, 24, 91, 127, 91, 113, 126, 147, 91],
    'Mobile|5 Min|Baddy Points|mountspeed2': [57, 48, 56, 28, 41, 46, 28, 40, 56, 51, 52, 72, 86, 46],
    // PC 5 Min
    'PC|5 Min|Baddy Kills|mountspeed1': [70, 53, 68, 39, 54, 53, 22, 85, 119, 85, 106, 118, 137, 85],
    'PC|5 Min|Baddy Points|mountspeed1': [53, 44, 53, 26, 39, 42, 26, 38, 53, 47, 49, 67, 80, 43],
    'PC|5 Min|Baddy Kills|mountspeed2': [75, 57, 72, 42, 57, 57, 24, 91, 127, 91, 113, 126, 147, 91],
    'PC|5 Min|Baddy Points|mountspeed2': [57, 48, 56, 28, 41, 46, 28, 40, 56, 51, 52, 72, 86, 46],
    // Mobile 10 Min
    'Mobile|10 Min|Baddy Kills|mountspeed1': [138, 104, 134, 77, 106, 104, 43, 167, 234, 167, 209, 232, 270, 167],
    'Mobile|10 Min|Baddy Points|mountspeed1': [104, 87, 104, 51, 77, 83, 51, 75, 104, 93, 97, 132, 158, 85],
    'Mobile|10 Min|Baddy Kills|mountspeed2': [148, 112, 142, 83, 112, 112, 47, 179, 250, 179, 223, 248, 290, 179],
    'Mobile|10 Min|Baddy Points|mountspeed2': [112, 95, 110, 55, 81, 91, 55, 79, 110, 100, 102, 142, 169, 91],
    // PC 10 Min
    'PC|10 Min|Baddy Kills|mountspeed1': [138, 104, 134, 77, 106, 104, 43, 167, 234, 167, 209, 232, 270, 167],
    'PC|10 Min|Baddy Points|mountspeed1': [104, 87, 104, 51, 77, 83, 51, 75, 104, 93, 97, 132, 158, 85],
    'PC|10 Min|Baddy Kills|mountspeed2': [148, 112, 142, 83, 112, 112, 47, 179, 250, 179, 223, 248, 290, 179],
    'PC|10 Min|Baddy Points|mountspeed2': [112, 95, 110, 55, 81, 91, 55, 79, 110, 100, 102, 142, 169, 91],
    // Mobile 60 Min
    'Mobile|60 Min|Baddy Kills|mountspeed1': [827, 626, 804, 461, 638, 626, 260, 1005, 1407, 1005, 1253, 1395, 1619, 1005],
    'Mobile|60 Min|Baddy Points|mountspeed1': [626, 520, 626, 307, 461, 496, 307, 449, 626, 556, 579, 792, 946, 508],
    'Mobile|60 Min|Baddy Kills|mountspeed2': [887, 674, 851, 496, 674, 674, 284, 1076, 1501, 1076, 1336, 1489, 1738, 1076],
    'Mobile|60 Min|Baddy Points|mountspeed2': [674, 567, 662, 331, 485, 544, 331, 473, 662, 603, 615, 851, 1017, 544],
    // PC 60 Min
    'PC|60 Min|Baddy Kills|mountspeed1': [827, 626, 804, 461, 638, 626, 260, 1005, 1407, 1005, 1253, 1395, 1619, 1005],
    'PC|60 Min|Baddy Points|mountspeed1': [626, 520, 626, 307, 461, 496, 307, 449, 626, 556, 579, 792, 946, 508],
    'PC|60 Min|Baddy Kills|mountspeed2': [887, 674, 851, 496, 674, 674, 284, 1076, 1501, 1076, 1336, 1489, 1738, 1076],
    'PC|60 Min|Baddy Points|mountspeed2': [674, 567, 662, 331, 485, 544, 331, 473, 662, 603, 615, 851, 1017, 544]
};
let savedScores = {};
let savedCaveLinks = {};
let savedConfigThemes = {};
const CONFIG_THEMES_STORAGE_KEY = 'benchmark_saved_config_themes';
let allRowThresholds = [];
let individualRatings = [];
let lastMainRankIndex = null;
let maxUnlockedRankIndex = 0;
let autoRankThemeEnabled = false;
let isViewMode = false;
let hasPendingRequests = false;
let currentFriendRequests = [];
const VIEWED_REQUESTS_STORAGE_PREFIX = 'benchmark_viewed_requests_v2';
let saveScoresDebounceTimer = null;
let userHighlights = [];
let ratingUpdateRafId = null;
let pacmanModeEnabled = false;
const PACMAN_STORAGE_KEY = 'benchmark_pacman_mode';
let userAchievements = {};
let lastProgressInRank = 0;
let rowFillAnimationStates = [];
let focusedInputIndex = -1;
let activeViewProfileContext = null;
const PAGE_LOADER_MIN_VISIBLE_MS = 1300;
let pageLoaderHideTimeout = null;
const pageLoaderStartedAt = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
let runtimeAccountId = '';

function setRuntimeAccountId(value) {
    runtimeAccountId = (value || '').toString().trim();
    return runtimeAccountId;
}

function getRuntimeAccountId() {
    return runtimeAccountId || '';
}

try {
    // Remove legacy persistent account id so it no longer appears in browser local storage.
    localStorage.removeItem('benchmark_account_id');
} catch (e) {
    // ignore storage access issues
}

function normalizeFriendRequestIds(rawRequests) {
    const normalized = [];
    const seen = new Set();

    const pushId = (value) => {
        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (!trimmed) return;
            const parts = trimmed.split('/').filter(Boolean);
            const candidate = parts.length ? parts[parts.length - 1] : trimmed;
            if (!candidate || seen.has(candidate)) return;
            seen.add(candidate);
            normalized.push(candidate);
            return;
        }
        if (value && typeof value === 'object') {
            if (typeof value.id === 'string') pushId(value.id);
            if (typeof value.uid === 'string') pushId(value.uid);
            if (typeof value.userId === 'string') pushId(value.userId);
            if (typeof value.accountId === 'string') pushId(value.accountId);
            if (typeof value.path === 'string') pushId(value.path);
        }
    };

    if (Array.isArray(rawRequests)) {
        rawRequests.forEach(pushId);
        return normalized;
    }

    if (rawRequests && typeof rawRequests === 'object') {
        Object.entries(rawRequests).forEach(([key, val]) => {
            if (Array.isArray(val)) {
                val.forEach(pushId);
            } else if (val && typeof val === 'object') {
                pushId(val);
            } else if (typeof val === 'string' || typeof val === 'number') {
                pushId(String(val));
            } else if (val === true || val === 1 || val === 'true') {
                pushId(key);
            }
        });
    }

    return normalized;
}

function getBenchmarkBasePath() {
    const pathname = window.location.pathname || '';
    const lower = pathname.toLowerCase();
    const marker = '/benchmark';
    const markerIndex = lower.indexOf(marker);
    if (markerIndex >= 0) {
        return pathname.slice(0, markerIndex + marker.length) || '/benchmark';
    }
    const fallback = pathname.replace(/\/[^/]*$/, '');
    return fallback || '/benchmark';
}

function isLocalDevRoutingEnv() {
    const host = (window.location.hostname || '').toLowerCase();
    if (window.location.protocol === 'file:') return true;
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '0.0.0.0') return true;
    if (host.endsWith('.local') || host.endsWith('.lan')) return true;
    const privateV4 = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/;
    if (privateV4.test(host)) return true;
    return false;
}

function restorePathFromFallback() {
    try {
        const url = new URL(window.location.href);
        const restoreRaw = url.searchParams.get('__restore');
        if (!restoreRaw) return;
        const decoded = decodeURIComponent(restoreRaw);
        if (!decoded) return;
        const target = decoded.startsWith('/') ? decoded : `/${decoded}`;
        const lower = target.toLowerCase();
        if (!lower.startsWith('/benchmark')) return;
        window.history.replaceState({}, '', target);
    } catch (e) {
        // Ignore malformed restore parameters and continue normal boot.
    }
}

restorePathFromFallback();

function getBenchmarkLoginUrl() {
    return `${getBenchmarkBasePath()}/`;
}

function getBenchmarkAppEntryUrl() {
    if (isLocalDevRoutingEnv()) return `${getBenchmarkBasePath()}/benchmark.html`;
    return `${getBenchmarkBasePath()}/`;
}

function slugifyProfileSegment(value) {
    const raw = (value || '').toString().trim().toLowerCase();
    const slug = raw
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return slug || 'player';
}

function getAccountIdTail(accountId) {
    const clean = (accountId || '')
        .toString()
        .trim()
        .replace(/[^a-zA-Z0-9]/g, '');
    if (!clean) return '0000';
    return clean.slice(-4).toLowerCase();
}

function buildProfileSlug(username, accountId, fallbackId = '') {
    const namePart = slugifyProfileSegment(username || 'player');
    const tailSource = accountId || fallbackId || '';
    const tail = getAccountIdTail(tailSource);
    return `${namePart}-${tail}`;
}

function getRequestedProfileSlugFromPath() {
    const path = (window.location.pathname || '').replace(/\/+$/, '');
    const base = getBenchmarkBasePath();
    if (!path.startsWith(base)) return null;
    let remainder = path.slice(base.length);
    remainder = remainder.replace(/^\/+/, '');
    if (!remainder) return null;
    const segments = remainder.split('/').filter(Boolean);
    if (!segments.length) return null;
    const first = segments[0].toLowerCase();
    if (first === 'sign-up' || first === 'forgot-password' || first === 'verification-sent' || first === 'benchmark.html' || first === 'index.html') {
        return null;
    }
    if (segments.length > 1 && segments[1].toLowerCase() !== 'view-mode') {
        return null;
    }
    return segments[0];
}

function waitForAuthInitialization() {
    return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe();
            resolve(user || null);
        });
    });
}

function showPrivateProfileOverlay() {
    const privatePage = document.getElementById('privateProfilePage');
    if (!privatePage) return;
    privatePage.style.display = 'flex';
}

function updateOwnProfileUrl(user, data) {
    if (!user) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('id')) return;
    const profile = (data && typeof data.profile === 'object' && data.profile) ? data.profile : {};
    const username = (data && data.username) || profile.username || user.displayName || 'player';
    const accountId = (data && data.accountId) || getRuntimeAccountId();
    const slug = buildProfileSlug(username, accountId, user.uid);
    if (isLocalDevRoutingEnv()) {
        const target = `${getBenchmarkBasePath()}/benchmark.html`;
        const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
        if (current !== target) {
            window.history.replaceState({}, '', target);
        }
        return;
    }
    const targetPath = `${getBenchmarkBasePath()}/${slug}`;
    const currentPath = (window.location.pathname || '').replace(/\/+$/, '');
    if (currentPath !== targetPath) {
        window.history.replaceState({}, '', `${targetPath}${window.location.search}${window.location.hash}`);
    }
}

function forceOwnSlugUrlFromAvailableData(user, data = null) {
    if (!user) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('id')) return;
    if (isLocalDevRoutingEnv()) return;
    const currentPath = (window.location.pathname || '').toLowerCase();
    if (!currentPath.endsWith('/benchmark.html')) return;
    updateOwnProfileUrl(user, data || {
        username: user.displayName || 'player',
        accountId: getRuntimeAccountId(),
        profile: {}
    });
}

function updateViewProfileUrl(data, uid) {
    const profile = (data && typeof data.profile === 'object' && data.profile) ? data.profile : {};
    const username = (data && data.username) || profile.username || 'player';
    const accountId = (data && data.accountId) || '';
    const slug = buildProfileSlug(username, accountId, uid || '');
    if (isLocalDevRoutingEnv()) {
        const url = new URL(window.location.href);
        url.pathname = `${getBenchmarkBasePath()}/benchmark.html`;
        if (uid) url.searchParams.set('id', uid);
        else url.searchParams.delete('id');
        url.hash = '';
        const target = `${url.pathname}${url.search}`;
        const current = `${window.location.pathname}${window.location.search}`;
        if (current !== target) {
            window.history.replaceState({}, '', target);
        }
        return;
    }
    const targetPath = `${getBenchmarkBasePath()}/${slug}`;
    const currentPath = (window.location.pathname || '').replace(/\/+$/, '');
    if (currentPath !== targetPath) {
        window.history.replaceState({}, '', targetPath);
    }
}

async function resolveProfileDocBySlug(slug, options = {}) {
    if (!slug) return null;
    const trimmedSlug = String(slug).trim();
    if (!trimmedSlug) return null;
    const allowFallback = options.allowFallback !== false;

    const signedInViewer = !!auth.currentUser;

    try {
        const directQuery = signedInViewer
            ? query(collection(db, 'users'), where('publicSlug', '==', trimmedSlug))
            : query(
                collection(db, 'users'),
                where('publicSlug', '==', trimmedSlug),
                where('settings.visibility', '==', 'everyone')
            );
        const directSnap = await getDocs(directQuery);
        if (!directSnap.empty) return directSnap.docs[0];
        console.warn('Slug query returned no documents:', trimmedSlug);
    } catch (e) {
        console.warn('publicSlug query failed:', e);
    }

    // Guest viewers cannot safely run broad collection scans under strict rules.
    if (!signedInViewer || !allowFallback) return null;

    try {
        const allUsersSnap = await getDocs(collection(db, 'users'));
        for (const userDoc of allUsersSnap.docs) {
            const data = userDoc.data() || {};
            const profile = (data.profile && typeof data.profile === 'object') ? data.profile : {};
            const username = data.username || profile.username || '';
            const accountId = data.accountId || '';
            const candidate = buildProfileSlug(username, accountId, userDoc.id);
            if (candidate === trimmedSlug) return userDoc;
        }
        console.warn('Fallback slug scan found no match:', trimmedSlug);
    } catch (e) {
        console.error('Fallback slug scan failed:', e);
    }

    return null;
}

async function resolveUserDocByIdentifier(identifier) {
    const candidates = normalizeFriendRequestIds([identifier]);
    if (typeof identifier === 'string' && identifier.trim() !== '') {
        const raw = identifier.trim();
        if (!candidates.includes(raw)) candidates.unshift(raw);
    }

    for (const candidate of candidates) {
        const directDoc = await getDoc(doc(db, 'users', candidate));
        if (directDoc.exists()) {
            return directDoc;
        }
    }

    const accountIdCandidates = [];
    candidates.forEach((candidate) => {
        if (typeof candidate !== 'string') return;
        const trimmed = candidate.trim();
        if (!trimmed) return;
        accountIdCandidates.push(trimmed);
        accountIdCandidates.push(trimmed.toUpperCase());
    });

    const seen = new Set();
    for (const accountId of accountIdCandidates) {
        if (!accountId || seen.has(accountId)) continue;
        seen.add(accountId);
        const q = query(collection(db, 'users'), where('accountId', '==', accountId));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            return querySnapshot.docs[0];
        }
    }

    return null;
}

function getViewedFriendRequestsStorageKey(uid) {
    return `${VIEWED_REQUESTS_STORAGE_PREFIX}_${uid}`;
}

function readViewedFriendRequests(uid) {
    if (!uid) return [];
    try {
        const raw = localStorage.getItem(getViewedFriendRequestsStorageKey(uid));
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed)
            ? parsed.filter((value) => typeof value === 'string' && value.trim() !== '')
            : [];
    } catch (e) {
        return [];
    }
}

function writeViewedFriendRequests(uid, requests) {
    if (!uid) return;
    const normalized = [...new Set((Array.isArray(requests) ? requests : []).filter((uidValue) => typeof uidValue === 'string' && uidValue.trim() !== ''))];
    localStorage.setItem(getViewedFriendRequestsStorageKey(uid), JSON.stringify(normalized));
}

function getPrunedViewedFriendRequests(uid, currentRequests) {
    const viewed = readViewedFriendRequests(uid);
    const requestSet = new Set(currentRequests);
    const pruned = viewed.filter((uidValue) => requestSet.has(uidValue));
    if (pruned.length !== viewed.length) {
        writeViewedFriendRequests(uid, pruned);
    }
    return pruned;
}

function refreshPendingRequestState(uid, currentRequests) {
    const viewed = getPrunedViewedFriendRequests(uid, currentRequests);
    const viewedSet = new Set(viewed);
    hasPendingRequests = currentRequests.some((requestUid) => !viewedSet.has(requestUid));
}

function markCurrentFriendRequestsViewed() {
    const user = auth.currentUser;
    if (!user) return;
    writeViewedFriendRequests(user.uid, currentFriendRequests);
    hasPendingRequests = false;
}

function syncMobileHoneycombMask() {
    const rankBox = document.querySelector('.rounded-inner-box');
    if (!rankBox) return;
    if (window.innerWidth <= 900) {
        rankBox.style.setProperty('--honeycomb-mask-x', '90px', 'important');
        rankBox.style.setProperty('--honeycomb-mask-y', '170px', 'important');
    } else {
        rankBox.style.removeProperty('--honeycomb-mask-x');
        rankBox.style.removeProperty('--honeycomb-mask-y');
    }
}
window.addEventListener('resize', syncMobileHoneycombMask);
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncMobileHoneycombMask);
} else {
    syncMobileHoneycombMask();
}

function normalizeMountConfig(value) {
    return Object.prototype.hasOwnProperty.call(MOUNT_CONFIG_IMAGES, value) ? value : DEFAULT_MOUNT_CONFIG;
}

function getMountConfigLabel(value, lang = 'en') {
    const mount = normalizeMountConfig(value);
    const key = MOUNT_CONFIG_I18N_KEYS[mount] || 'mount_speed_1';
    return tForLang(lang, key);
}

function buildLegacyConfigKey(platform, time, stat) {
    return `${platform}|${time}|${stat}`;
}

function getConfigLookupKeys(config = null) {
    const current = config || getCurrentConfig();
    const mount = normalizeMountConfig(current.mount);
    const fullKey = buildConfigKey(current.platform, current.time, current.stat, mount);
    if (mount === DEFAULT_MOUNT_CONFIG) {
        return [fullKey, buildLegacyConfigKey(current.platform, current.time, current.stat)];
    }
    return [fullKey];
}

function applyMountConfigVisual(value) {
    const mount = normalizeMountConfig(value);
    const mountBox = document.getElementById('mountBox');
    const mountImg = document.getElementById('mountConfigImage');
    if (mountBox) mountBox.dataset.value = mount;
    if (mountImg) {
        mountImg.src = MOUNT_CONFIG_IMAGES[mount];
        mountImg.alt = getMountConfigLabel(mount, currentLanguage);
    }
    if (mountBox) {
        mountBox.querySelectorAll('.dropdown-item').forEach(item => {
            const itemValue = item.getAttribute('data-value');
            item.classList.toggle('active', itemValue === mount);
            const optionImg = item.querySelector('.mount-option-image');
            if (optionImg && itemValue) optionImg.alt = getMountConfigLabel(itemValue, currentLanguage);
        });
    }
}

function getConfigKey() {
    const current = getCurrentConfig();
    return buildConfigKey(current.platform, current.time, current.stat, current.mount);
}

function loadSavedScores() {
    try {
        const raw = localStorage.getItem(SCORE_STORAGE_KEY);
        if (!raw) {
            savedScores = {};
            return;
        }
        const parsed = JSON.parse(raw);
        savedScores = parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) {
        savedScores = {};
    }
}

async function saveSavedScores() {
    try {
        if (isViewMode) return;
        const scoresUpdatedAt = Date.now();
        const user = auth.currentUser;
        if (user) {
            await setDoc(doc(db, 'users', user.uid), {
                scores: savedScores,
                scoresUpdatedAt
            }, { merge: true });
        }
        localStorage.setItem(SCORE_UPDATED_AT_STORAGE_KEY, String(scoresUpdatedAt));
        localStorage.setItem(SCORE_STORAGE_KEY, JSON.stringify(savedScores));
    } catch (e) {
        console.error('Error saving scores:', e);
    }
}

function loadSavedCaveLinks() {
    try {
        const raw = localStorage.getItem(CAVE_LINKS_STORAGE_KEY);
        if (raw) {
            savedCaveLinks = JSON.parse(raw);
        } else {
            savedCaveLinks = {};
            const allKeys = getAllConfigKeys();
            let migrated = false;
            allKeys.forEach(({ key, platform, time, stat, mount }) => {
                for (let i = 0; i < 20; i++) {
                    const oldKey = `benchmark_youtube_${key}_${i}`;
                    let val = localStorage.getItem(oldKey);
                    if (!val && mount === DEFAULT_MOUNT_CONFIG) {
                        const legacyKey = buildLegacyConfigKey(platform, time, stat);
                        val = localStorage.getItem(`benchmark_youtube_${legacyKey}_${i}`);
                    }
                    if (val) {
                        if (!savedCaveLinks[key]) savedCaveLinks[key] = {};
                        savedCaveLinks[key][i] = val;
                        migrated = true;
                    }
                }
            });
            if (migrated) {
                saveSavedCaveLinks();
            }
        }
    } catch (e) {
        savedCaveLinks = {};
    }
}

async function saveSavedCaveLinks() {
    if (isViewMode) return;
    try {
        const user = auth.currentUser;
        if (user) {
            await setDoc(doc(db, 'users', user.uid), {
                caveLinks: savedCaveLinks
            }, { merge: true });
        }
        localStorage.setItem(CAVE_LINKS_STORAGE_KEY, JSON.stringify(savedCaveLinks));
    } catch (e) {
        console.error('Error saving cave links:', e);
    }
}

function loadSavedConfigThemes() {
    try {
        const raw = localStorage.getItem(CONFIG_THEMES_STORAGE_KEY);
        if (!raw) {
            savedConfigThemes = {};
            return;
        }
        const parsed = JSON.parse(raw);
        savedConfigThemes = parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) {
        savedConfigThemes = {};
    }
}

async function saveSavedConfigThemes() {
    if (isViewMode) return;
    try {
        const user = auth.currentUser;
        if (user) {
            await setDoc(doc(db, 'users', user.uid), {
                configThemes: savedConfigThemes
            }, { merge: true });
        }
        localStorage.setItem(CONFIG_THEMES_STORAGE_KEY, JSON.stringify(savedConfigThemes));
    } catch (e) {
        console.error('Error saving config themes:', e);
    }
}

async function saveUserData(data) {
    if (isViewMode) return;
    const user = auth.currentUser;
    if (!user) return;
    try {
        await setDoc(doc(db, 'users', user.uid), data, { merge: true });
    } catch (e) {
        console.error('Error saving user data:', e);
    }
}

async function saveSettings() {
    if (isViewMode) return;
    const settings = {
        language: currentLanguage,
        theme: currentTheme,
        autoRankTheme: autoRankThemeEnabled ? 'true' : 'false',
        visibility: visibilitySelect ? visibilitySelect.value : 'everyone',
        defaultConfig: readDefaultConfig(),
        customTheme: {
            enabled: customThemeEnabled ? 'true' : 'false',
            name: customThemeName,
            hex: customThemeHex,
            saved: savedCustomThemes
        },
        rankThemeUnlock: String(maxUnlockedRankIndex),
        pacmanMode: pacmanModeEnabled ? 'true' : 'false'
    };
    await saveUserData({ settings });
}

function saveCurrentScores() {
    if (isViewMode) return;
    const key = getConfigKey();
    const scores = Array.from(document.querySelectorAll('.score-input')).map(input => Number(input.value) || 0);
    savedScores[key] = scores;
    // Persist immediately to avoid losing edits on quick navigation/refresh.
    localStorage.setItem(SCORE_UPDATED_AT_STORAGE_KEY, String(Date.now()));
    localStorage.setItem(SCORE_STORAGE_KEY, JSON.stringify(savedScores));
    clearTimeout(saveScoresDebounceTimer);
    saveScoresDebounceTimer = setTimeout(() => {
        saveSavedScores();
    }, 1000);
}

function loadScores() {
    const keys = getConfigLookupKeys();
    let scores = [];
    for (const key of keys) {
        if (Array.isArray(savedScores[key])) {
            scores = savedScores[key];
            break;
        }
    }
    document.querySelectorAll('.score-input').forEach((input, idx) => {
        const value = scores[idx] ?? 0;
        input.value = String(value);
        const overlay = input.parentElement ? input.parentElement.querySelector('.score-text-overlay') : null;
        if (overlay) overlay.textContent = String(value);
    });
    updateAllRatings();
}

function loadCaveLinks() {
    const wrappers = document.querySelectorAll('.cave-play-wrapper');
    const keys = getConfigLookupKeys();
    let links = {};
    for (const key of keys) {
        if (savedCaveLinks[key] && typeof savedCaveLinks[key] === 'object') {
            links = savedCaveLinks[key];
            break;
        }
    }
    wrappers.forEach(wrapper => {
        const index = wrapper.dataset.index;
        const url = links[index];
        if (url) {
            wrapper.dataset.youtube = url;
            wrapper.classList.add('has-link');
        } else {
            wrapper.dataset.youtube = '';
            wrapper.classList.remove('has-link');
        }
    });
}

function getBaseScoresForConfig() {
    const current = getCurrentConfig();
    const key = buildConfigKey(current.platform, current.time, current.stat, current.mount);
    const fallback = SCORE_BASES_BY_CONFIG.default || [];
    const configScores = SCORE_BASES_BY_CONFIG[key];
    if (!configScores) return fallback;
    if (configScores.length >= fallback.length) return configScores;
    const merged = fallback.slice();
    configScores.forEach((value, idx) => {
        if (Number.isFinite(value)) merged[idx] = value;
    });
    return merged;
}

function getScoresArray() {
    return Array.from(document.querySelectorAll('.score-input')).map(input => Number(input.value) || 0);
}

function setScoresFromArray(scores) {
    const safeScores = Array.isArray(scores) ? scores : [];
    document.querySelectorAll('.score-input').forEach((input, idx) => {
        const value = safeScores[idx] ?? 0;
        input.value = String(value);
        const overlay = input.parentElement ? input.parentElement.querySelector('.score-text-overlay') : null;
        if (overlay) overlay.textContent = String(value);
    });
    updateAllRatings();
    saveCurrentScores();
}

function buildShareUrl() {
    const current = getCurrentConfig();
    const scores = getScoresArray();
    const params = new URLSearchParams();
    params.set('platform', current.platform);
    params.set('time', current.time);
    params.set('stat', current.stat);
    params.set('mount', current.mount);
    params.set('scores', scores.join(','));
    const url = new URL(window.location.href);
    url.hash = params.toString();
    return url.toString();
}

function buildCopyLinkUrl() {
    const user = auth.currentUser;
    const context = isViewMode && activeViewProfileContext ? activeViewProfileContext : null;
    const usernameEl = document.querySelector('.profile-name');
    const username = context
        ? (context.username || 'player')
        : (usernameEl ? usernameEl.textContent : 'player');
    const accountId = context
        ? (context.accountId || '')
        : (getRuntimeAccountId());
    const fallbackId = context
        ? (context.uid || '')
        : (user ? user.uid : '');
    const slug = buildProfileSlug(username, accountId, fallbackId);
    const url = new URL(window.location.href);
    if (isLocalDevRoutingEnv()) {
        url.pathname = `${getBenchmarkBasePath()}/benchmark.html`;
        url.search = '';
        const targetId = context ? (context.uid || '') : (user ? user.uid : '');
        if (targetId) url.searchParams.set('id', targetId);
        else url.searchParams.delete('id');
    } else {
        url.pathname = `${getBenchmarkBasePath()}/${slug}`;
        url.search = '';
    }
    url.hash = '';
    return url.toString();
}

function applyShareFromUrl() {
    if (!window.location.hash || window.location.hash.length < 2) return;
    const params = new URLSearchParams(window.location.hash.slice(1));
    if (![...params.keys()].length) return;
    const platform = params.get('platform');
    const time = params.get('time');
    const stat = params.get('stat');
    const mount = params.get('mount');
    const scoresRaw = params.get('scores');
    const current = getCurrentConfig();
    const nextConfig = {
        platform: platform || current.platform,
        time: time || current.time,
        stat: stat || current.stat,
        mount: mount || current.mount
    };
    applyConfig(nextConfig, { animateRowTransition: true });
    if (scoresRaw) {
        const scores = scoresRaw.split(',').map(val => {
            const num = Number(val);
            return Number.isFinite(num) && num >= 0 ? Math.round(num) : 0;
        });
        setScoresFromArray(scores);
    }
}

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

// Make Bronze (rank-2) read as a richer bronze theme.
THEMES['rank-2'] = {
    ...THEMES['rank-2'],
    '--app-bg': '#020100',
    '--app-accent-1': 'rgba(70, 38, 16, 0.24)',
    '--app-accent-2': 'rgba(98, 58, 30, 0.1)',
    '--panel-bg': 'rgba(16, 9, 5, 0.76)',
    '--panel-border': 'rgba(88, 55, 32, 0.26)',
    '--app-text': '#e6d7c8'
};

// Make Stellar (rank-11) read as a distinct orange-gold theme, not Bronze-like brown.
THEMES['rank-11'] = {
    ...THEMES['rank-11'],
    '--app-bg': '#0c0501',
    '--app-accent-1': 'rgba(255, 132, 0, 0.26)',
    '--app-accent-2': 'rgba(255, 168, 46, 0.16)',
    '--panel-bg': 'rgba(56, 23, 4, 0.68)',
    '--panel-border': 'rgba(255, 160, 36, 0.32)',
    '--app-text': '#fff0df'
};

const I18N = {
    en: {
        share: 'Share',
        settings: 'Settings',
        rating: 'Rating',
        score: 'Score',
        progression: 'Score Threshold',
        cave: 'Cave',
        edit: 'Edit',
        edit_hint: 'Right-Click to Edit',
        swords: 'Swords',
        bombs: 'Bombs',
        radar_title: 'Cave Graph',
        radar_strongest: 'Strongest Caves',
        radar_weakest: 'Weakest Caves',
        radar_tab_combined: 'Combined',
        radar_tab_swords: 'Swords',
        radar_tab_bombs: 'Bombs',
        rule_1: 'The benchmark is intended exclusively for <span style="color: #fff;">personal use</span>.',
        rule_2: 'All baddies in the cave must be <span style="color: #fff;">reset to full health</span> before starting.',
        rule_3: 'No <span style="color: #fff;">speed boosts</span> from bushes are allowed.',
        rule_4: 'Scoring thresholds must be achieved <span style="color: #fff;">without any assistance</span> from other players or accidental damage caused by other players.',
        rule_5: 'The <span style="color: #fff;">Swords</span> category allows the use of swords only, while the <span style="color: #fff;">Bombs</span> category permits the use of both bombs and swords.',
        download_image: 'Download Image',
        copy_link: 'Copy Benchmark Link',
        guidelines_title: 'Guidelines',
        guidelines_subtitle: 'for accurate scoring',
        settings_title: 'Settings',
        settings_subtitle: 'Customize your benchmark',
        settings_language: 'Language',
        settings_language_note: 'Applies instantly.',
        settings_display: 'Display',
        settings_font_scale: 'Font Size',
        settings_font_family: 'Font',
        settings_compact_mode: 'Compact Mode',
        settings_pacman: 'Pacman',
        settings_font_small: 'Small',
        settings_font_normal: 'Normal',
        settings_font_large: 'Large',
        settings_font_default: 'Default',
        settings_font_modern: 'Modern',
        settings_font_classic: 'Classic',
        settings_font_mono: 'Mono',
        settings_toggle_on: 'On',
        settings_toggle_off: 'Off',
        settings_theme: 'Themes',
    settings_theme_note: 'Rank themes unlock as you climb the ranks.',
    settings_theme_auto: 'Auto-apply your current rank theme when you rank up',
        settings_custom_name: 'Custom',
        settings_save_name: 'Save',
        settings_remove_custom: 'Remove',
        settings_custom_create: 'Create',
        settings_custom_locked_note: 'Click Create to unlock custom colors.',
        settings_custom_select_note: 'Select a custom theme.',
        settings_custom_theme: 'Custom Colors',
        settings_custom_note: 'Pick colors to build your own theme.',
        settings_preview: 'Preview',
        settings_preview_title: 'Benchmark Preview',
        settings_preview_note: 'Updates as you change colors.',
        settings_color_target: 'Color Target',
        settings_color_background: 'Background',
        settings_color_accent1: 'Accent 1',
        settings_color_accent2: 'Accent 2',
        settings_color_panel: 'Panel Background',
        settings_color_border: 'Panel Border',
        settings_color_text: 'Text',
        settings_default_config: 'Configuration',
        settings_default_config_startup: 'Configuration Start up',
        settings_visibility_title: 'Visibility',
        settings_visibility_note: 'Choose who can view your benchmark.',
        settings_visibility_label: 'Visibility',
        settings_visibility_everyone: 'Everyone',
        settings_visibility_friends: 'Friends Only',
        edit_hint: 'Right-Click to Edit',
        settings_platform: 'Platform',
        settings_time: 'Time',
        settings_stat: 'Stat',
        settings_save_default: 'Set Default',
        settings_reset_scores: 'Reset Score Values',
        settings_reset_config: 'Configuration',
        settings_current_config: 'Current configuration',
        settings_reset_selected: 'Reset Selected',
        settings_reset_all: 'Reset All Configurations',
        settings_reset_note: 'Does not change defaults.',
        generating_screenshot: 'Generating screenshot...',
        reset_confirm: 'Reset all selected configuration scores?',
        reset_all_confirm: 'Reset all saved configurations scores?',
        settings_pacman: 'Pacman'
    },
    ar: {
        share: 'Ã™â€¦Ã˜Â´Ã˜Â§Ã˜Â±Ã™Æ’Ã˜Â©',
        settings: 'Ã˜Â§Ã™â€žÃ˜Â¥Ã˜Â¹Ã˜Â¯Ã˜Â§Ã˜Â¯Ã˜Â§Ã˜Âª',
        rating: 'Ã˜Â§Ã™â€žÃ˜ÂªÃ™â€šÃ™Å Ã™Å Ã™â€¦',
        score: 'Ã˜Â§Ã™â€žÃ™â€ Ã˜ÂªÃ™Å Ã˜Â¬Ã˜Â©',
        progression: 'Ã˜Â­Ã˜Â¯ Ã˜Â§Ã™â€žÃ™â€ Ã™â€šÃ˜Â§Ã˜Â·',
        cave: 'Ã˜Â§Ã™â€žÃ™Æ’Ã™â€¡Ã™Â',
        edit: 'Ã˜ÂªÃ˜Â¹Ã˜Â¯Ã™Å Ã™â€ž',
        edit_hint: 'Ã˜Â§Ã™â€ Ã™â€šÃ˜Â± Ã˜Â¨Ã˜Â²Ã˜Â± Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â§Ã™Ë†Ã˜Â³ Ã˜Â§Ã™â€žÃ˜Â£Ã™Å Ã™â€¦Ã™â€  Ã™â€žÃ™â€žÃ˜ÂªÃ˜Â¹Ã˜Â¯Ã™Å Ã™â€ž',
        swords: 'Ã˜Â§Ã™â€žÃ˜Â³Ã™Å Ã™Ë†Ã™Â',
        bombs: 'Ã˜Â§Ã™â€žÃ™â€šÃ™â€ Ã˜Â§Ã˜Â¨Ã™â€ž',
        radar_title: 'Ã˜Â±Ã˜Â³Ã™â€¦ Ã˜Â¨Ã™Å Ã˜Â§Ã™â€ Ã™Å  Ã™â€žÃ™â€žÃ™Æ’Ã™â€¡Ã™Â',
        radar_strongest: 'Ã˜Â£Ã™â€šÃ™Ë†Ã™â€° Ã˜Â§Ã™â€žÃ™Æ’Ã™â€¡Ã™Ë†Ã™Â',
        radar_weakest: 'Ã˜Â£Ã˜Â¶Ã˜Â¹Ã™Â Ã˜Â§Ã™â€žÃ™Æ’Ã™â€¡Ã™Ë†Ã™Â',
        radar_tab_combined: 'Ã™â€¦Ã˜Â´Ã˜ÂªÃ˜Â±Ã™Æ’',
        radar_tab_swords: 'Ã˜Â§Ã™â€žÃ˜Â³Ã™Å Ã™Ë†Ã™Â',
        radar_tab_bombs: 'Ã˜Â§Ã™â€žÃ™â€šÃ™â€ Ã˜Â§Ã˜Â¨Ã™â€ž',
        rule_1: 'Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â¹Ã™Å Ã˜Â§Ã˜Â± Ã™â€¦Ã˜Â®Ã˜ÂµÃ˜Âµ Ã˜Â­Ã˜ÂµÃ˜Â±Ã™Å Ã™â€¹Ã˜Â§ <span style="color: #fff;">Ã™â€žÃ™â€žÃ˜Â§Ã˜Â³Ã˜ÂªÃ˜Â®Ã˜Â¯Ã˜Â§Ã™â€¦ Ã˜Â§Ã™â€žÃ˜Â´Ã˜Â®Ã˜ÂµÃ™Å </span>.',
        rule_2: 'Ã™Å Ã˜Â¬Ã˜Â¨ <span style="color: #fff;">Ã˜Â¥Ã˜Â¹Ã˜Â§Ã˜Â¯Ã˜Â© Ã˜ÂªÃ˜Â¹Ã™Å Ã™Å Ã™â€  Ã˜ÂµÃ˜Â­Ã˜Â© Ã˜Â¬Ã™â€¦Ã™Å Ã˜Â¹ Ã˜Â§Ã™â€žÃ˜Â£Ã˜Â¹Ã˜Â¯Ã˜Â§Ã˜Â¡</span> Ã™ÂÃ™Å  Ã˜Â§Ã™â€žÃ™Æ’Ã™â€¡Ã™Â Ã˜Â¨Ã˜Â§Ã™â€žÃ™Æ’Ã˜Â§Ã™â€¦Ã™â€ž Ã™â€šÃ˜Â¨Ã™â€ž Ã˜Â§Ã™â€žÃ˜Â¨Ã˜Â¯Ã˜Â¡.',
        rule_3: 'Ã™â€žÃ˜Â§ Ã™Å Ã™ÂÃ˜Â³Ã™â€¦Ã˜Â­ Ã˜Â¨Ã˜Â§Ã˜Â³Ã˜ÂªÃ˜Â®Ã˜Â¯Ã˜Â§Ã™â€¦ <span style="color: #fff;">Ã˜ÂªÃ˜Â¹Ã˜Â²Ã™Å Ã˜Â²Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ˜Â³Ã˜Â±Ã˜Â¹Ã˜Â©</span> Ã™â€¦Ã™â€  Ã˜Â§Ã™â€žÃ˜Â´Ã˜Â¬Ã™Å Ã˜Â±Ã˜Â§Ã˜Âª.',
        rule_4: 'Ã™Å Ã˜Â¬Ã˜Â¨ Ã˜ÂªÃ˜Â­Ã™â€šÃ™Å Ã™â€š Ã˜Â¹Ã˜ÂªÃ˜Â¨Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â³Ã˜Â¬Ã™Å Ã™â€ž <span style="color: #fff;">Ã˜Â¯Ã™Ë†Ã™â€  Ã˜Â£Ã™Å  Ã™â€¦Ã˜Â³Ã˜Â§Ã˜Â¹Ã˜Â¯Ã˜Â©</span> Ã™â€¦Ã™â€  Ã™â€žÃ˜Â§Ã˜Â¹Ã˜Â¨Ã™Å Ã™â€  Ã˜Â¢Ã˜Â®Ã˜Â±Ã™Å Ã™â€  Ã˜Â£Ã™Ë† Ã˜Â¶Ã˜Â±Ã˜Â± Ã˜Â¹Ã˜Â±Ã˜Â¶Ã™Å  Ã™Å Ã˜Â³Ã˜Â¨Ã˜Â¨Ã™â€¡ Ã™â€žÃ˜Â§Ã˜Â¹Ã˜Â¨Ã™Ë†Ã™â€  Ã˜Â¢Ã˜Â®Ã˜Â±Ã™Ë†Ã™â€ .',
        rule_5: 'Ã˜ÂªÃ˜Â³Ã™â€¦Ã˜Â­ Ã™ÂÃ˜Â¦Ã˜Â© <span style="color: #fff;">Ã˜Â§Ã™â€žÃ˜Â³Ã™Å Ã™Ë†Ã™Â</span> Ã˜Â¨Ã˜Â§Ã˜Â³Ã˜ÂªÃ˜Â®Ã˜Â¯Ã˜Â§Ã™â€¦ Ã˜Â§Ã™â€žÃ˜Â³Ã™Å Ã™Ë†Ã™Â Ã™ÂÃ™â€šÃ˜Â·Ã˜Å’ Ã˜Â¨Ã™Å Ã™â€ Ã™â€¦Ã˜Â§ Ã˜ÂªÃ˜Â³Ã™â€¦Ã˜Â­ Ã™ÂÃ˜Â¦Ã˜Â© <span style="color: #fff;">Ã˜Â§Ã™â€žÃ™â€šÃ™â€ Ã˜Â§Ã˜Â¨Ã™â€ž</span> Ã˜Â¨Ã˜Â§Ã˜Â³Ã˜ÂªÃ˜Â®Ã˜Â¯Ã˜Â§Ã™â€¦ Ã™Æ’Ã™â€ž Ã™â€¦Ã™â€  Ã˜Â§Ã™â€žÃ™â€šÃ™â€ Ã˜Â§Ã˜Â¨Ã™â€ž Ã™Ë†Ã˜Â§Ã™â€žÃ˜Â³Ã™Å Ã™Ë†Ã™Â.',
        download_image: 'Ã˜ÂªÃ™â€ Ã˜Â²Ã™Å Ã™â€ž Ã˜Â§Ã™â€žÃ˜ÂµÃ™Ë†Ã˜Â±Ã˜Â©',
        copy_link: 'Ã™â€ Ã˜Â³Ã˜Â® Ã˜Â±Ã˜Â§Ã˜Â¨Ã˜Â· Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â¹Ã™Å Ã˜Â§Ã˜Â±',
        guidelines_title: 'Ã˜Â¥Ã˜Â±Ã˜Â´Ã˜Â§Ã˜Â¯Ã˜Â§Ã˜Âª',
        guidelines_subtitle: 'Ã™â€žÃ˜ÂªÃ˜Â³Ã˜Â¬Ã™Å Ã™â€ž Ã˜Â¯Ã™â€šÃ™Å Ã™â€š',
        settings_title: 'Ã˜Â§Ã™â€žÃ˜Â¥Ã˜Â¹Ã˜Â¯Ã˜Â§Ã˜Â¯Ã˜Â§Ã˜Âª',
        settings_subtitle: 'Ã˜ÂªÃ˜Â®Ã˜ÂµÃ™Å Ã˜Âµ Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â¹Ã™Å Ã˜Â§Ã˜Â± Ã˜Â§Ã™â€žÃ˜Â®Ã˜Â§Ã˜Âµ Ã˜Â¨Ã™Æ’',
        settings_language: 'Ã˜Â§Ã™â€žÃ™â€žÃ˜ÂºÃ˜Â©',
        settings_language_note: 'Ã™Å Ã˜ÂªÃ™â€¦ Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â·Ã˜Â¨Ã™Å Ã™â€š Ã™ÂÃ™Ë†Ã˜Â±Ã˜Â§Ã™â€¹.',
        settings_display: 'Ã˜Â§Ã™â€žÃ˜Â¹Ã˜Â±Ã˜Â¶',
        settings_font_scale: 'Ã˜Â­Ã˜Â¬Ã™â€¦ Ã˜Â§Ã™â€žÃ˜Â®Ã˜Â·',
        settings_font_family: 'Ã˜Â§Ã™â€žÃ˜Â®Ã˜Â·',
        settings_compact_mode: 'Ã˜Â§Ã™â€žÃ™Ë†Ã˜Â¶Ã˜Â¹ Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â¶Ã˜ÂºÃ™Ë†Ã˜Â·',
        settings_pacman: '??? ???',
        settings_font_small: 'Ã˜ÂµÃ˜ÂºÃ™Å Ã˜Â±',
        settings_font_normal: 'Ã˜Â¹Ã˜Â§Ã˜Â¯Ã™Å ',
        settings_font_large: 'Ã™Æ’Ã˜Â¨Ã™Å Ã˜Â±',
        settings_font_default: 'Ã˜Â§Ã™ÂÃ˜ÂªÃ˜Â±Ã˜Â§Ã˜Â¶Ã™Å ',
        settings_font_modern: 'Ã˜Â­Ã˜Â¯Ã™Å Ã˜Â«',
        settings_font_classic: 'Ã™Æ’Ã™â€žÃ˜Â§Ã˜Â³Ã™Å Ã™Æ’Ã™Å ',
        settings_font_mono: 'Ã˜Â£Ã˜Â­Ã˜Â§Ã˜Â¯Ã™Å ',
        settings_toggle_on: 'Ã˜ÂªÃ˜Â´Ã˜ÂºÃ™Å Ã™â€ž',
        settings_toggle_off: 'Ã˜Â¥Ã™Å Ã™â€šÃ˜Â§Ã™Â',
        settings_theme: 'Ã˜Â§Ã™â€žÃ˜Â³Ã™â€¦Ã˜Â§Ã˜Âª',
        settings_theme_note: 'Ã™Å Ã˜ÂªÃ™â€¦ Ã™ÂÃ˜ÂªÃ˜Â­ Ã˜Â³Ã™â€¦Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ˜Â±Ã˜ÂªÃ˜Â¨Ã˜Â© Ã™Æ’Ã™â€žÃ™â€¦Ã˜Â§ Ã˜ÂµÃ˜Â¹Ã˜Â¯Ã˜Âª Ã™ÂÃ™Å  Ã˜Â§Ã™â€žÃ˜Â±Ã˜ÂªÃ˜Â¨.',
        settings_theme_auto: 'Ã˜ÂªÃ˜Â·Ã˜Â¨Ã™Å Ã™â€š Ã˜Â³Ã™â€¦Ã˜Â© Ã˜Â±Ã˜ÂªÃ˜Â¨Ã˜ÂªÃ™Æ’ Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â§Ã™â€žÃ™Å Ã˜Â© Ã˜ÂªÃ™â€žÃ™â€šÃ˜Â§Ã˜Â¦Ã™Å Ã™â€¹Ã˜Â§ Ã˜Â¹Ã™â€ Ã˜Â¯ Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â±Ã™â€šÃ™Å Ã˜Â©',
        settings_custom_name: 'Ã™â€¦Ã˜Â®Ã˜ÂµÃ˜Âµ',
        settings_save_name: 'Ã˜Â­Ã™ÂÃ˜Â¸',
        settings_remove_custom: 'Ã˜Â¥Ã˜Â²Ã˜Â§Ã™â€žÃ˜Â©',
        settings_custom_create: 'Ã˜Â¥Ã™â€ Ã˜Â´Ã˜Â§Ã˜Â¡',
        settings_custom_locked_note: 'Ã˜Â§Ã™â€ Ã™â€šÃ˜Â± Ã™ÂÃ™Ë†Ã™â€š Ã˜Â¥Ã™â€ Ã˜Â´Ã˜Â§Ã˜Â¡ Ã™â€žÃ™ÂÃ˜ÂªÃ˜Â­ Ã˜Â§Ã™â€žÃ˜Â£Ã™â€žÃ™Ë†Ã˜Â§Ã™â€  Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â®Ã˜ÂµÃ˜ÂµÃ˜Â©.',
        settings_custom_select_note: 'Ã˜Â§Ã˜Â®Ã˜ÂªÃ˜Â± Ã˜Â³Ã™â€¦Ã˜Â© Ã™â€¦Ã˜Â®Ã˜ÂµÃ˜ÂµÃ˜Â©.',
        settings_custom_theme: 'Ã˜Â£Ã™â€žÃ™Ë†Ã˜Â§Ã™â€  Ã™â€¦Ã˜Â®Ã˜ÂµÃ˜ÂµÃ˜Â©',
        settings_custom_note: 'Ã˜Â§Ã˜Â®Ã˜ÂªÃ˜Â± Ã˜Â§Ã™â€žÃ˜Â£Ã™â€žÃ™Ë†Ã˜Â§Ã™â€  Ã™â€žÃ˜Â¨Ã™â€ Ã˜Â§Ã˜Â¡ Ã˜Â§Ã™â€žÃ˜Â³Ã™â€¦Ã˜Â© Ã˜Â§Ã™â€žÃ˜Â®Ã˜Â§Ã˜ÂµÃ˜Â© Ã˜Â¨Ã™Æ’.',
        settings_preview: 'Ã™â€¦Ã˜Â¹Ã˜Â§Ã™Å Ã™â€ Ã˜Â©',
        settings_preview_title: 'Ã™â€¦Ã˜Â¹Ã˜Â§Ã™Å Ã™â€ Ã˜Â© Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â¹Ã™Å Ã˜Â§Ã˜Â±',
        settings_preview_note: 'Ã™Å Ã˜ÂªÃ™â€¦ Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â­Ã˜Â¯Ã™Å Ã˜Â« Ã˜Â¹Ã™â€ Ã˜Â¯ Ã˜ÂªÃ˜ÂºÃ™Å Ã™Å Ã˜Â± Ã˜Â§Ã™â€žÃ˜Â£Ã™â€žÃ™Ë†Ã˜Â§Ã™â€ .',
        settings_color_target: 'Ã™â€¡Ã˜Â¯Ã™Â Ã˜Â§Ã™â€žÃ™â€žÃ™Ë†Ã™â€ ',
        settings_color_background: 'Ã˜Â§Ã™â€žÃ˜Â®Ã™â€žÃ™ÂÃ™Å Ã˜Â©',
        settings_color_accent1: 'Ã˜Â§Ã™â€žÃ™â€žÃ™Ë†Ã™â€  Ã˜Â§Ã™â€žÃ™â€¦Ã™â€¦Ã™Å Ã˜Â² 1',
        settings_color_accent2: 'Ã˜Â§Ã™â€žÃ™â€žÃ™Ë†Ã™â€  Ã˜Â§Ã™â€žÃ™â€¦Ã™â€¦Ã™Å Ã˜Â² 2',
        settings_color_panel: 'Ã˜Â®Ã™â€žÃ™ÂÃ™Å Ã˜Â© Ã˜Â§Ã™â€žÃ™â€žÃ™Ë†Ã˜Â­Ã˜Â©',
        settings_color_border: 'Ã˜Â­Ã˜Â¯Ã™Ë†Ã˜Â¯ Ã˜Â§Ã™â€žÃ™â€žÃ™Ë†Ã˜Â­Ã˜Â©',
        settings_color_text: 'Ã˜Â§Ã™â€žÃ™â€ Ã˜Âµ',
        settings_default_config: 'Ã˜Â§Ã™â€žÃ˜ÂªÃ™Æ’Ã™Ë†Ã™Å Ã™â€ ',
        settings_default_config_startup: 'Ã˜ÂªÃ™Æ’Ã™Ë†Ã™Å Ã™â€  Ã˜Â¨Ã˜Â¯Ã˜Â¡ Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â´Ã˜ÂºÃ™Å Ã™â€ž',
        settings_visibility_title: 'Ã˜Â§Ã™â€žÃ˜Â±Ã˜Â¤Ã™Å Ã˜Â©',
        settings_visibility_note: 'Ã˜Â§Ã˜Â®Ã˜ÂªÃ˜Â± Ã™â€¦Ã™â€  Ã™Å Ã™â€¦Ã™Æ’Ã™â€ Ã™â€¡ Ã˜Â±Ã˜Â¤Ã™Å Ã˜Â© Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â¹Ã™Å Ã˜Â§Ã˜Â± Ã˜Â§Ã™â€žÃ˜Â®Ã˜Â§Ã˜Âµ Ã˜Â¨Ã™Æ’.',
        settings_visibility_label: 'Ã˜Â§Ã™â€žÃ˜Â±Ã˜Â¤Ã™Å Ã˜Â©',
        settings_visibility_everyone: 'Ã˜Â§Ã™â€žÃ˜Â¬Ã™â€¦Ã™Å Ã˜Â¹',
        settings_visibility_friends: 'Ã˜Â§Ã™â€žÃ˜Â£Ã˜ÂµÃ˜Â¯Ã™â€šÃ˜Â§Ã˜Â¡/Ã˜Â§Ã™â€žÃ™â€ Ã™â€šÃ˜Â§Ã˜Â¨Ã˜Â© Ã™ÂÃ™â€šÃ˜Â·',
        edit_hint: 'Ã˜Â§Ã™â€ Ã™â€šÃ˜Â± Ã˜Â¨Ã˜Â²Ã˜Â± Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â§Ã™Ë†Ã˜Â³ Ã˜Â§Ã™â€žÃ˜Â£Ã™Å Ã™â€¦Ã™â€  Ã™â€žÃ™â€žÃ˜ÂªÃ˜Â¹Ã˜Â¯Ã™Å Ã™â€ž',
        settings_platform: 'Ã˜Â§Ã™â€žÃ™â€¦Ã™â€ Ã˜ÂµÃ˜Â©',
        settings_time: 'Ã˜Â§Ã™â€žÃ™Ë†Ã™â€šÃ˜Âª',
        settings_stat: 'Ã˜Â§Ã™â€žÃ˜Â¥Ã˜Â­Ã˜ÂµÃ˜Â§Ã˜Â¦Ã™Å Ã˜Â©',
        settings_save_default: 'Ã˜ÂªÃ˜Â¹Ã™Å Ã™Å Ã™â€  Ã˜Â§Ã™â€žÃ˜Â§Ã™ÂÃ˜ÂªÃ˜Â±Ã˜Â§Ã˜Â¶Ã™Å ',
        settings_reset_scores: 'Ã˜Â¥Ã˜Â¹Ã˜Â§Ã˜Â¯Ã˜Â© Ã˜ÂªÃ˜Â¹Ã™Å Ã™Å Ã™â€  Ã™â€šÃ™Å Ã™â€¦ Ã˜Â§Ã™â€žÃ™â€ Ã˜ÂªÃ˜Â§Ã˜Â¦Ã˜Â¬',
        settings_reset_config: 'Ã˜Â§Ã™â€žÃ˜ÂªÃ™Æ’Ã™Ë†Ã™Å Ã™â€ ',
        settings_current_config: 'Ã˜Â§Ã™â€žÃ˜ÂªÃ™Æ’Ã™Ë†Ã™Å Ã™â€  Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â§Ã™â€žÃ™Å ',
        settings_reset_selected: 'Ã˜Â¥Ã˜Â¹Ã˜Â§Ã˜Â¯Ã˜Â© Ã˜ÂªÃ˜Â¹Ã™Å Ã™Å Ã™â€  Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â­Ã˜Â¯Ã˜Â¯',
        settings_reset_all: 'Ã˜Â¥Ã˜Â¹Ã˜Â§Ã˜Â¯Ã˜Â© Ã˜ÂªÃ˜Â¹Ã™Å Ã™Å Ã™â€  Ã˜Â¬Ã™â€¦Ã™Å Ã˜Â¹ Ã˜Â§Ã™â€žÃ˜ÂªÃ™Æ’Ã™Ë†Ã™Å Ã™â€ Ã˜Â§Ã˜Âª',
        settings_reset_note: 'Ã™â€žÃ˜Â§ Ã™Å Ã˜ÂºÃ™Å Ã˜Â± Ã˜Â§Ã™â€žÃ˜Â§Ã™ÂÃ˜ÂªÃ˜Â±Ã˜Â§Ã˜Â¶Ã™Å Ã˜Â§Ã˜Âª.',
        generating_screenshot: 'Ã˜Â¬Ã˜Â§Ã˜Â±Ã™Å  Ã˜Â¥Ã™â€ Ã˜Â´Ã˜Â§Ã˜Â¡ Ã™â€žÃ™â€šÃ˜Â·Ã˜Â© Ã˜Â§Ã™â€žÃ˜Â´Ã˜Â§Ã˜Â´Ã˜Â©...',
        reset_confirm: 'Ã™â€¡Ã™â€ž Ã˜ÂªÃ˜Â±Ã™Å Ã˜Â¯ Ã˜Â¥Ã˜Â¹Ã˜Â§Ã˜Â¯Ã˜Â© Ã˜ÂªÃ˜Â¹Ã™Å Ã™Å Ã™â€  Ã˜Â¬Ã™â€¦Ã™Å Ã˜Â¹ Ã™â€šÃ™Å Ã™â€¦ Ã˜Â§Ã™â€žÃ™â€ Ã˜ÂªÃ˜Â§Ã˜Â¦Ã˜Â¬ Ã˜Â¥Ã™â€žÃ™â€° 0Ã˜Å¸',
        reset_all_confirm: 'Ã™â€¡Ã™â€ž Ã˜ÂªÃ˜Â±Ã™Å Ã˜Â¯ Ã˜Â¥Ã˜Â¹Ã˜Â§Ã˜Â¯Ã˜Â© Ã˜ÂªÃ˜Â¹Ã™Å Ã™Å Ã™â€  Ã˜Â¬Ã™â€¦Ã™Å Ã˜Â¹ Ã˜Â§Ã™â€žÃ˜ÂªÃ™Æ’Ã™Ë†Ã™Å Ã™â€ Ã˜Â§Ã˜Âª Ã™Ë†Ã˜Â§Ã™â€žÃ™â€ Ã˜ÂªÃ˜Â§Ã˜Â¦Ã˜Â¬ Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â­Ã™ÂÃ™Ë†Ã˜Â¸Ã˜Â©Ã˜Å¸'
    },
    bn: {
        share: 'Ã Â¦Â¶Ã Â§â€¡Ã Â¦Â¯Ã Â¦Â¼Ã Â¦Â¾Ã Â¦Â°',
        settings: 'Ã Â¦Â¸Ã Â§â€¡Ã Â¦Å¸Ã Â¦Â¿Ã Â¦â€šÃ Â¦Â¸',
        rating: 'Ã Â¦Â°Ã Â§â€¡Ã Â¦Å¸Ã Â¦Â¿Ã Â¦â€š',
        score: 'Ã Â¦Â¸Ã Â§ÂÃ Â¦â€¢Ã Â§â€¹Ã Â¦Â°',
        progression: 'Ã Â¦Â¸Ã Â§ÂÃ Â¦â€¢Ã Â§â€¹Ã Â¦Â° Ã Â¦Â¸Ã Â§â‚¬Ã Â¦Â®Ã Â¦Â¾',
        cave: 'Ã Â¦â€”Ã Â§ÂÃ Â¦Â¹Ã Â¦Â¾',
        edit: 'Ã Â¦Â¸Ã Â¦Â®Ã Â§ÂÃ Â¦ÂªÃ Â¦Â¾Ã Â¦Â¦Ã Â¦Â¨Ã Â¦Â¾',
        edit_hint: 'Ã Â¦Â¸Ã Â¦Â®Ã Â§ÂÃ Â¦ÂªÃ Â¦Â¾Ã Â¦Â¦Ã Â¦Â¨Ã Â¦Â¾ Ã Â¦â€¢Ã Â¦Â°Ã Â¦Â¤Ã Â§â€¡ Ã Â¦Â°Ã Â¦Â¾Ã Â¦â€¡Ã Â¦Å¸-Ã Â¦â€¢Ã Â§ÂÃ Â¦Â²Ã Â¦Â¿Ã Â¦â€¢ Ã Â¦â€¢Ã Â¦Â°Ã Â§ÂÃ Â¦Â¨',
        swords: 'Ã Â¦Â¤Ã Â¦Â²Ã Â§â€¹Ã Â¦Â¯Ã Â¦Â¼Ã Â¦Â¾Ã Â¦Â°',
        bombs: 'Ã Â¦Â¬Ã Â§â€¹Ã Â¦Â®Ã Â¦Â¾',
        radar_title: 'Ã Â¦â€”Ã Â§ÂÃ Â¦Â¹Ã Â¦Â¾ Ã Â¦â€”Ã Â§ÂÃ Â¦Â°Ã Â¦Â¾Ã Â¦Â«',
        radar_strongest: 'Ã Â¦Â¶Ã Â¦â€¢Ã Â§ÂÃ Â¦Â¤Ã Â¦Â¿Ã Â¦Â¶Ã Â¦Â¾Ã Â¦Â²Ã Â§â‚¬ Ã Â¦â€”Ã Â§ÂÃ Â¦Â¹Ã Â¦Â¾',
        radar_weakest: 'Ã Â¦Â¦Ã Â§ÂÃ Â¦Â°Ã Â§ÂÃ Â¦Â¬Ã Â¦Â² Ã Â¦â€”Ã Â§ÂÃ Â¦Â¹Ã Â¦Â¾',
        radar_tab_combined: 'Ã Â¦Â¯Ã Â§Å’Ã Â¦Â¥',
        radar_tab_swords: 'Ã Â¦Â¤Ã Â¦Â²Ã Â§â€¹Ã Â¦Â¯Ã Â¦Â¼Ã Â¦Â¾Ã Â¦Â°',
        radar_tab_bombs: 'Ã Â¦Â¬Ã Â§â€¹Ã Â¦Â®Ã Â¦Â¾',
        rule_1: 'Ã Â¦Â¬Ã Â§â€¡Ã Â¦Å¾Ã Â§ÂÃ Â¦Å¡Ã Â¦Â®Ã Â¦Â¾Ã Â¦Â°Ã Â§ÂÃ Â¦â€¢Ã Â¦Å¸Ã Â¦Â¿ Ã Â¦Â¶Ã Â§ÂÃ Â¦Â§Ã Â§ÂÃ Â¦Â®Ã Â¦Â¾Ã Â¦Â¤Ã Â§ÂÃ Â¦Â° <span style="color: #fff;">Ã Â¦Â¬Ã Â§ÂÃ Â¦Â¯Ã Â¦â€¢Ã Â§ÂÃ Â¦Â¤Ã Â¦Â¿Ã Â¦â€”Ã Â¦Â¤ Ã Â¦Â¬Ã Â§ÂÃ Â¦Â¯Ã Â¦Â¬Ã Â¦Â¹Ã Â¦Â¾Ã Â¦Â°Ã Â§â€¡Ã Â¦Â°</span> Ã Â¦Å“Ã Â¦Â¨Ã Â§ÂÃ Â¦Â¯Ã Â¥Â¤',
        rule_2: 'Ã Â¦Â¶Ã Â§ÂÃ Â¦Â°Ã Â§Â Ã Â¦â€¢Ã Â¦Â°Ã Â¦Â¾Ã Â¦Â° Ã Â¦â€ Ã Â¦â€”Ã Â§â€¡ Ã Â¦â€”Ã Â§ÂÃ Â¦Â¹Ã Â¦Â¾Ã Â¦Â° Ã Â¦Â¸Ã Â¦Â®Ã Â¦Â¸Ã Â§ÂÃ Â¦Â¤ Ã Â¦Â¶Ã Â¦Â¤Ã Â§ÂÃ Â¦Â°Ã Â§ÂÃ Â¦Â¦Ã Â§â€¡Ã Â¦Â° <span style="color: #fff;">Ã Â¦ÂªÃ Â§â€šÃ Â¦Â°Ã Â§ÂÃ Â¦Â£ Ã Â¦Â¸Ã Â§ÂÃ Â¦Â¬Ã Â¦Â¾Ã Â¦Â¸Ã Â§ÂÃ Â¦Â¥Ã Â§ÂÃ Â¦Â¯Ã Â§â€¡ Ã Â¦Â°Ã Â¦Â¿Ã Â¦Â¸Ã Â§â€¡Ã Â¦Å¸</span> Ã Â¦â€¢Ã Â¦Â°Ã Â¦Â¤Ã Â§â€¡ Ã Â¦Â¹Ã Â¦Â¬Ã Â§â€¡Ã Â¥Â¤',
        rule_3: 'Ã Â¦ÂÃ Â§â€¹Ã Â¦Âª Ã Â¦Â¥Ã Â§â€¡Ã Â¦â€¢Ã Â§â€¡ Ã Â¦â€¢Ã Â§â€¹Ã Â¦Â¨Ã Â§â€¹ <span style="color: #fff;">Ã Â¦â€”Ã Â¦Â¤Ã Â¦Â¿ Ã Â¦Â¬Ã Â§Æ’Ã Â¦Â¦Ã Â§ÂÃ Â¦Â§Ã Â¦Â¿</span> Ã Â¦â€¦Ã Â¦Â¨Ã Â§ÂÃ Â¦Â®Ã Â§â€¹Ã Â¦Â¦Ã Â¦Â¿Ã Â¦Â¤ Ã Â¦Â¨Ã Â¦Â¯Ã Â¦Â¼Ã Â¥Â¤',
        rule_4: 'Ã Â¦Â¸Ã Â§ÂÃ Â¦â€¢Ã Â§â€¹Ã Â¦Â°Ã Â¦Â¿Ã Â¦â€š Ã Â¦Â¥Ã Â§ÂÃ Â¦Â°Ã Â§â€¡Ã Â¦Â¶Ã Â¦Â¹Ã Â§â€¹Ã Â¦Â²Ã Â§ÂÃ Â¦Â¡Ã Â¦â€”Ã Â§ÂÃ Â¦Â²Ã Â¦Â¿ Ã Â¦â€¦Ã Â¦Â¨Ã Â§ÂÃ Â¦Â¯ Ã Â¦â€“Ã Â§â€¡Ã Â¦Â²Ã Â§â€¹Ã Â¦Â¯Ã Â¦Â¼Ã Â¦Â¾Ã Â¦Â¡Ã Â¦Â¼Ã Â¦Â¦Ã Â§â€¡Ã Â¦Â° <span style="color: #fff;">Ã Â¦Â¸Ã Â¦Â¹Ã Â¦Â¾Ã Â¦Â¯Ã Â¦Â¼Ã Â¦Â¤Ã Â¦Â¾ Ã Â¦â€ºÃ Â¦Â¾Ã Â¦Â¡Ã Â¦Â¼Ã Â¦Â¾</span> Ã Â¦Â¬Ã Â¦Â¾ Ã Â¦â€¦Ã Â¦Â¨Ã Â§ÂÃ Â¦Â¯ Ã Â¦â€“Ã Â§â€¡Ã Â¦Â²Ã Â§â€¹Ã Â¦Â¯Ã Â¦Â¼Ã Â¦Â¾Ã Â¦Â¡Ã Â¦Â¼Ã Â¦Â¦Ã Â§â€¡Ã Â¦Â° Ã Â¦Â¦Ã Â§ÂÃ Â¦Â¬Ã Â¦Â¾Ã Â¦Â°Ã Â¦Â¾ Ã Â¦Â¸Ã Â§Æ’Ã Â¦Â·Ã Â§ÂÃ Â¦Å¸ Ã Â¦Â¦Ã Â§ÂÃ Â¦Â°Ã Â§ÂÃ Â¦ËœÃ Â¦Å¸Ã Â¦Â¨Ã Â¦Â¾Ã Â¦Å“Ã Â¦Â¨Ã Â¦Â¿Ã Â¦Â¤ Ã Â¦â€¢Ã Â§ÂÃ Â¦Â·Ã Â¦Â¤Ã Â¦Â¿ Ã Â¦â€ºÃ Â¦Â¾Ã Â¦Â¡Ã Â¦Â¼Ã Â¦Â¾Ã Â¦â€¡ Ã Â¦â€¦Ã Â¦Â°Ã Â§ÂÃ Â¦Å“Ã Â¦Â¨ Ã Â¦â€¢Ã Â¦Â°Ã Â¦Â¤Ã Â§â€¡ Ã Â¦Â¹Ã Â¦Â¬Ã Â§â€¡Ã Â¥Â¤',
        rule_5: '<span style="color: #fff;">Ã Â¦Â¤Ã Â¦Â²Ã Â§â€¹Ã Â¦Â¯Ã Â¦Â¼Ã Â¦Â¾Ã Â¦Â°</span> Ã Â¦Â¬Ã Â¦Â¿Ã Â¦Â­Ã Â¦Â¾Ã Â¦â€”Ã Â§â€¡ Ã Â¦Â¶Ã Â§ÂÃ Â¦Â§Ã Â§ÂÃ Â¦Â®Ã Â¦Â¾Ã Â¦Â¤Ã Â§ÂÃ Â¦Â° Ã Â¦Â¤Ã Â¦Â²Ã Â§â€¹Ã Â¦Â¯Ã Â¦Â¼Ã Â¦Â¾Ã Â¦Â° Ã Â¦Â¬Ã Â§ÂÃ Â¦Â¯Ã Â¦Â¬Ã Â¦Â¹Ã Â¦Â¾Ã Â¦Â°Ã Â§â€¡Ã Â¦Â° Ã Â¦â€¦Ã Â¦Â¨Ã Â§ÂÃ Â¦Â®Ã Â¦Â¤Ã Â¦Â¿ Ã Â¦Â°Ã Â¦Â¯Ã Â¦Â¼Ã Â§â€¡Ã Â¦â€ºÃ Â§â€¡, Ã Â¦Â¯Ã Â¦â€“Ã Â¦Â¨ <span style="color: #fff;">Ã Â¦Â¬Ã Â§â€¹Ã Â¦Â®Ã Â¦Â¾</span> Ã Â¦Â¬Ã Â¦Â¿Ã Â¦Â­Ã Â¦Â¾Ã Â¦â€”Ã Â§â€¡ Ã Â¦Â¬Ã Â§â€¹Ã Â¦Â®Ã Â¦Â¾ Ã Â¦ÂÃ Â¦Â¬Ã Â¦â€š Ã Â¦Â¤Ã Â¦Â²Ã Â§â€¹Ã Â¦Â¯Ã Â¦Â¼Ã Â¦Â¾Ã Â¦Â° Ã Â¦â€°Ã Â¦Â­Ã Â¦Â¯Ã Â¦Â¼Ã Â¦â€¡ Ã Â¦Â¬Ã Â§ÂÃ Â¦Â¯Ã Â¦Â¬Ã Â¦Â¹Ã Â¦Â¾Ã Â¦Â°Ã Â§â€¡Ã Â¦Â° Ã Â¦â€¦Ã Â¦Â¨Ã Â§ÂÃ Â¦Â®Ã Â¦Â¤Ã Â¦Â¿ Ã Â¦Â°Ã Â¦Â¯Ã Â¦Â¼Ã Â§â€¡Ã Â¦â€ºÃ Â§â€¡Ã Â¥Â¤',
        download_image: 'Ã Â¦â€ºÃ Â¦Â¬Ã Â¦Â¿ Ã Â¦Â¡Ã Â¦Â¾Ã Â¦â€°Ã Â¦Â¨Ã Â¦Â²Ã Â§â€¹Ã Â¦Â¡ Ã Â¦â€¢Ã Â¦Â°Ã Â§ÂÃ Â¦Â¨',
        copy_link: 'Ã Â¦Â¬Ã Â§â€¡Ã Â¦Å¾Ã Â§ÂÃ Â¦Å¡Ã Â¦Â®Ã Â¦Â¾Ã Â¦Â°Ã Â§ÂÃ Â¦â€¢ Ã Â¦Â²Ã Â¦Â¿Ã Â¦â„¢Ã Â§ÂÃ Â¦â€¢ Ã Â¦â€¢Ã Â¦ÂªÃ Â¦Â¿ Ã Â¦â€¢Ã Â¦Â°Ã Â§ÂÃ Â¦Â¨',
        guidelines_title: 'Ã Â¦Â¨Ã Â¦Â¿Ã Â¦Â°Ã Â§ÂÃ Â¦Â¦Ã Â§â€¡Ã Â¦Â¶Ã Â¦Â¿Ã Â¦â€¢Ã Â¦Â¾',
        guidelines_subtitle: 'Ã Â¦Â¸Ã Â¦Â Ã Â¦Â¿Ã Â¦â€¢ Ã Â¦Â¸Ã Â§ÂÃ Â¦â€¢Ã Â§â€¹Ã Â¦Â°Ã Â¦Â¿Ã Â¦â€šÃ Â¦Â¯Ã Â¦Â¼Ã Â§â€¡Ã Â¦Â° Ã Â¦Å“Ã Â¦Â¨Ã Â§ÂÃ Â¦Â¯',
        settings_title: 'Ã Â¦Â¸Ã Â§â€¡Ã Â¦Å¸Ã Â¦Â¿Ã Â¦â€šÃ Â¦Â¸',
        settings_subtitle: 'Ã Â¦â€ Ã Â¦ÂªÃ Â¦Â¨Ã Â¦Â¾Ã Â¦Â° Ã Â¦Â¬Ã Â§â€¡Ã Â¦Å¾Ã Â§ÂÃ Â¦Å¡Ã Â¦Â®Ã Â¦Â¾Ã Â¦Â°Ã Â§ÂÃ Â¦â€¢ Ã Â¦â€¢Ã Â¦Â¾Ã Â¦Â¸Ã Â§ÂÃ Â¦Å¸Ã Â¦Â®Ã Â¦Â¾Ã Â¦â€¡Ã Â¦Å“ Ã Â¦â€¢Ã Â¦Â°Ã Â§ÂÃ Â¦Â¨',
        settings_language: 'Ã Â¦Â­Ã Â¦Â¾Ã Â¦Â·Ã Â¦Â¾',
        settings_language_note: 'Ã Â¦Â¤Ã Â¦Â¾Ã Â§Å½Ã Â¦â€¢Ã Â§ÂÃ Â¦Â·Ã Â¦Â£Ã Â¦Â¿Ã Â¦â€¢Ã Â¦Â­Ã Â¦Â¾Ã Â¦Â¬Ã Â§â€¡ Ã Â¦ÂªÃ Â§ÂÃ Â¦Â°Ã Â¦Â¯Ã Â¦Â¼Ã Â§â€¹Ã Â¦â€” Ã Â¦Â¹Ã Â¦Â¯Ã Â¦Â¼Ã Â¥Â¤',
        settings_display: 'Ã Â¦ÂªÃ Â§ÂÃ Â¦Â°Ã Â¦Â¦Ã Â¦Â°Ã Â§ÂÃ Â¦Â¶Ã Â¦Â¨',
        settings_font_scale: 'Ã Â¦Â«Ã Â¦Â¨Ã Â§ÂÃ Â¦Å¸Ã Â§â€¡Ã Â¦Â° Ã Â¦â€ Ã Â¦â€¢Ã Â¦Â¾Ã Â¦Â°',
        settings_font_family: 'Ã Â¦Â«Ã Â¦Â¨Ã Â§ÂÃ Â¦Å¸',
        settings_compact_mode: 'Ã Â¦â€¢Ã Â¦Â®Ã Â¦ÂªÃ Â§ÂÃ Â¦Â¯Ã Â¦Â¾Ã Â¦â€¢Ã Â§ÂÃ Â¦Å¸ Ã Â¦Â®Ã Â§â€¹Ã Â¦Â¡',
        settings_pacman: '??????????',
        settings_font_small: 'Ã Â¦â€ºÃ Â§â€¹Ã Â¦Å¸',
        settings_font_normal: 'Ã Â¦Â¸Ã Â§ÂÃ Â¦Â¬Ã Â¦Â¾Ã Â¦Â­Ã Â¦Â¾Ã Â¦Â¬Ã Â¦Â¿Ã Â¦â€¢',
        settings_font_large: 'Ã Â¦Â¬Ã Â¦Â¡Ã Â¦Â¼',
        settings_font_default: 'Ã Â¦Â¡Ã Â¦Â¿Ã Â¦Â«Ã Â¦Â²Ã Â§ÂÃ Â¦Å¸',
        settings_font_modern: 'Ã Â¦â€ Ã Â¦Â§Ã Â§ÂÃ Â¦Â¨Ã Â¦Â¿Ã Â¦â€¢',
        settings_font_classic: 'Ã Â¦â€¢Ã Â§ÂÃ Â¦Â²Ã Â¦Â¾Ã Â¦Â¸Ã Â¦Â¿Ã Â¦â€¢',
        settings_font_mono: 'Ã Â¦Â®Ã Â¦Â¨Ã Â§â€¹',
        settings_toggle_on: 'Ã Â¦Å¡Ã Â¦Â¾Ã Â¦Â²Ã Â§Â',
        settings_toggle_off: 'Ã Â¦Â¬Ã Â¦Â¨Ã Â§ÂÃ Â¦Â§',
        settings_theme: 'Ã Â¦Â¥Ã Â¦Â¿Ã Â¦Â®',
        settings_theme_note: 'Ã Â¦Â°Ã¢â‚¬ÂÃ Â§ÂÃ Â¦Â¯Ã Â¦Â¾Ã Â¦â„¢Ã Â§ÂÃ Â¦â€¢ Ã Â¦Â¬Ã Â¦Â¾Ã Â¦Â¡Ã Â¦Â¼Ã Â¦Â¾Ã Â¦Â° Ã Â¦Â¸Ã Â¦Â¾Ã Â¦Â¥Ã Â§â€¡ Ã Â¦Â¸Ã Â¦Â¾Ã Â¦Â¥Ã Â§â€¡ Ã Â¦Â°Ã¢â‚¬ÂÃ Â§ÂÃ Â¦Â¯Ã Â¦Â¾Ã Â¦â„¢Ã Â§ÂÃ Â¦â€¢ Ã Â¦Â¥Ã Â¦Â¿Ã Â¦Â® Ã Â¦â€ Ã Â¦Â¨Ã Â¦Â²Ã Â¦â€¢ Ã Â¦Â¹Ã Â¦Â¯Ã Â¦Â¼Ã Â¥Â¤',
        settings_theme_auto: 'Ã Â¦Â°Ã¢â‚¬ÂÃ Â§ÂÃ Â¦Â¯Ã Â¦Â¾Ã Â¦â„¢Ã Â§ÂÃ Â¦â€¢ Ã Â¦â€ Ã Â¦Âª Ã Â¦â€¢Ã Â¦Â°Ã Â¦Â¾Ã Â¦Â° Ã Â¦Â¸Ã Â¦Â®Ã Â¦Â¯Ã Â¦Â¼ Ã Â¦Â¸Ã Â§ÂÃ Â¦Â¬Ã Â¦Â¯Ã Â¦Â¼Ã Â¦â€šÃ Â¦â€¢Ã Â§ÂÃ Â¦Â°Ã Â¦Â¿Ã Â¦Â¯Ã Â¦Â¼Ã Â¦Â­Ã Â¦Â¾Ã Â¦Â¬Ã Â§â€¡ Ã Â¦â€ Ã Â¦ÂªÃ Â¦Â¨Ã Â¦Â¾Ã Â¦Â° Ã Â¦Â¬Ã Â¦Â°Ã Â§ÂÃ Â¦Â¤Ã Â¦Â®Ã Â¦Â¾Ã Â¦Â¨ Ã Â¦Â°Ã¢â‚¬ÂÃ Â§ÂÃ Â¦Â¯Ã Â¦Â¾Ã Â¦â„¢Ã Â§ÂÃ Â¦â€¢ Ã Â¦Â¥Ã Â¦Â¿Ã Â¦Â® Ã Â¦ÂªÃ Â§ÂÃ Â¦Â°Ã Â¦Â¯Ã Â¦Â¼Ã Â§â€¹Ã Â¦â€” Ã Â¦â€¢Ã Â¦Â°Ã Â§ÂÃ Â¦Â¨',
        settings_custom_name: 'Ã Â¦â€¢Ã Â¦Â¾Ã Â¦Â¸Ã Â§ÂÃ Â¦Å¸Ã Â¦Â®',
        settings_save_name: 'Ã Â¦Â¸Ã Â¦â€šÃ Â¦Â°Ã Â¦â€¢Ã Â§ÂÃ Â¦Â·Ã Â¦Â£',
        settings_remove_custom: 'Ã Â¦Â¸Ã Â¦Â°Ã Â¦Â¾Ã Â¦Â¨',
        settings_custom_create: 'Ã Â¦Â¤Ã Â§Ë†Ã Â¦Â°Ã Â¦Â¿ Ã Â¦â€¢Ã Â¦Â°Ã Â§ÂÃ Â¦Â¨',
        settings_custom_locked_note: 'Ã Â¦â€¢Ã Â¦Â¾Ã Â¦Â¸Ã Â§ÂÃ Â¦Å¸Ã Â¦Â® Ã Â¦Â°Ã Â¦â€š Ã Â¦â€ Ã Â¦Â¨Ã Â¦Â²Ã Â¦â€¢ Ã Â¦â€¢Ã Â¦Â°Ã Â¦Â¤Ã Â§â€¡ Ã Â¦Â¤Ã Â§Ë†Ã Â¦Â°Ã Â¦Â¿ Ã Â¦â€¢Ã Â¦Â°Ã Â§ÂÃ Â¦Â¨ Ã Â¦Â Ã Â¦â€¢Ã Â§ÂÃ Â¦Â²Ã Â¦Â¿Ã Â¦â€¢ Ã Â¦â€¢Ã Â¦Â°Ã Â§ÂÃ Â¦Â¨Ã Â¥Â¤',
        settings_custom_select_note: 'Ã Â¦ÂÃ Â¦â€¢Ã Â¦Å¸Ã Â¦Â¿ Ã Â¦â€¢Ã Â¦Â¾Ã Â¦Â¸Ã Â§ÂÃ Â¦Å¸Ã Â¦Â® Ã Â¦Â¥Ã Â¦Â¿Ã Â¦Â® Ã Â¦Â¨Ã Â¦Â¿Ã Â¦Â°Ã Â§ÂÃ Â¦Â¬Ã Â¦Â¾Ã Â¦Å¡Ã Â¦Â¨ Ã Â¦â€¢Ã Â¦Â°Ã Â§ÂÃ Â¦Â¨Ã Â¥Â¤',
        settings_custom_theme: 'Ã Â¦â€¢Ã Â¦Â¾Ã Â¦Â¸Ã Â§ÂÃ Â¦Å¸Ã Â¦Â® Ã Â¦Â°Ã Â¦â€š',
        settings_custom_note: 'Ã Â¦â€ Ã Â¦ÂªÃ Â¦Â¨Ã Â¦Â¾Ã Â¦Â° Ã Â¦Â¨Ã Â¦Â¿Ã Â¦Å“Ã Â¦Â¸Ã Â§ÂÃ Â¦Â¬ Ã Â¦Â¥Ã Â¦Â¿Ã Â¦Â® Ã Â¦Â¤Ã Â§Ë†Ã Â¦Â°Ã Â¦Â¿ Ã Â¦â€¢Ã Â¦Â°Ã Â¦Â¤Ã Â§â€¡ Ã Â¦Â°Ã Â¦â€š Ã Â¦Â¨Ã Â¦Â¿Ã Â¦Â°Ã Â§ÂÃ Â¦Â¬Ã Â¦Â¾Ã Â¦Å¡Ã Â¦Â¨ Ã Â¦â€¢Ã Â¦Â°Ã Â§ÂÃ Â¦Â¨Ã Â¥Â¤',
        settings_preview: 'Ã Â¦ÂªÃ Â§ÂÃ Â¦Â°Ã Â¦Â¿Ã Â¦Â­Ã Â¦Â¿Ã Â¦â€°',
        settings_preview_title: 'Ã Â¦Â¬Ã Â§â€¡Ã Â¦Å¾Ã Â§ÂÃ Â¦Å¡Ã Â¦Â®Ã Â¦Â¾Ã Â¦Â°Ã Â§ÂÃ Â¦â€¢ Ã Â¦ÂªÃ Â§ÂÃ Â¦Â°Ã Â¦Â¿Ã Â¦Â­Ã Â¦Â¿Ã Â¦â€°',
        settings_preview_note: 'Ã Â¦Â°Ã Â¦â€š Ã Â¦ÂªÃ Â¦Â°Ã Â¦Â¿Ã Â¦Â¬Ã Â¦Â°Ã Â§ÂÃ Â¦Â¤Ã Â¦Â¨Ã Â§â€¡Ã Â¦Â° Ã Â¦Â¸Ã Â¦Â¾Ã Â¦Â¥Ã Â§â€¡ Ã Â¦Â¸Ã Â¦Â¾Ã Â¦Â¥Ã Â§â€¡ Ã Â¦â€ Ã Â¦ÂªÃ Â¦Â¡Ã Â§â€¡Ã Â¦Å¸ Ã Â¦Â¹Ã Â¦Â¯Ã Â¦Â¼Ã Â¥Â¤',
        settings_color_target: 'Ã Â¦Â°Ã Â¦â„¢Ã Â§â€¡Ã Â¦Â° Ã Â¦Â²Ã Â¦â€¢Ã Â§ÂÃ Â¦Â·Ã Â§ÂÃ Â¦Â¯',
        settings_color_background: 'Ã Â¦Â¬Ã Â§ÂÃ Â¦Â¯Ã Â¦Â¾Ã Â¦â€¢Ã Â¦â€”Ã Â§ÂÃ Â¦Â°Ã Â¦Â¾Ã Â¦â€°Ã Â¦Â¨Ã Â§ÂÃ Â¦Â¡',
        settings_color_accent1: 'Ã Â¦â€¦Ã Â§ÂÃ Â¦Â¯Ã Â¦Â¾Ã Â¦â€¢Ã Â¦Â¸Ã Â§â€¡Ã Â¦Â¨Ã Â§ÂÃ Â¦Å¸ Ã Â§Â§',
        settings_color_accent2: 'Ã Â¦â€¦Ã Â§ÂÃ Â¦Â¯Ã Â¦Â¾Ã Â¦â€¢Ã Â¦Â¸Ã Â§â€¡Ã Â¦Â¨Ã Â§ÂÃ Â¦Å¸ Ã Â§Â¨',
        settings_color_panel: 'Ã Â¦ÂªÃ Â§ÂÃ Â¦Â¯Ã Â¦Â¾Ã Â¦Â¨Ã Â§â€¡Ã Â¦Â² Ã Â¦Â¬Ã Â§ÂÃ Â¦Â¯Ã Â¦Â¾Ã Â¦â€¢Ã Â¦â€”Ã Â§ÂÃ Â¦Â°Ã Â¦Â¾Ã Â¦â€°Ã Â¦Â¨Ã Â§ÂÃ Â¦Â¡',
        settings_color_border: 'Ã Â¦ÂªÃ Â§ÂÃ Â¦Â¯Ã Â¦Â¾Ã Â¦Â¨Ã Â§â€¡Ã Â¦Â² Ã Â¦Â¬Ã Â¦Â°Ã Â§ÂÃ Â¦Â¡Ã Â¦Â¾Ã Â¦Â°',
        settings_color_text: 'Ã Â¦Å¸Ã Â§â€¡Ã Â¦â€¢Ã Â§ÂÃ Â¦Â¸Ã Â¦Å¸',
        settings_default_config: 'Ã Â¦â€¢Ã Â¦Â¨Ã Â¦Â«Ã Â¦Â¿Ã Â¦â€”Ã Â¦Â¾Ã Â¦Â°Ã Â§â€¡Ã Â¦Â¶Ã Â¦Â¨',
        settings_default_config_startup: 'Ã Â¦â€¢Ã Â¦Â¨Ã Â¦Â«Ã Â¦Â¿Ã Â¦â€”Ã Â¦Â¾Ã Â¦Â°Ã Â§â€¡Ã Â¦Â¶Ã Â¦Â¨ Ã Â¦Â¸Ã Â§ÂÃ Â¦Å¸Ã Â¦Â¾Ã Â¦Â°Ã Â§ÂÃ Â¦Å¸ Ã Â¦â€ Ã Â¦Âª',
        settings_visibility_title: 'Ã Â¦Â¦Ã Â§Æ’Ã Â¦Â¶Ã Â§ÂÃ Â¦Â¯Ã Â¦Â®Ã Â¦Â¾Ã Â¦Â¨Ã Â¦Â¤Ã Â¦Â¾',
        settings_visibility_note: 'Ã Â¦â€¢Ã Â§â€¡ Ã Â¦â€ Ã Â¦ÂªÃ Â¦Â¨Ã Â¦Â¾Ã Â¦Â° Ã Â¦Â¬Ã Â§â€¡Ã Â¦Å¾Ã Â§ÂÃ Â¦Å¡Ã Â¦Â®Ã Â¦Â¾Ã Â¦Â°Ã Â§ÂÃ Â¦â€¢ Ã Â¦Â¦Ã Â§â€¡Ã Â¦â€“Ã Â¦Â¤Ã Â§â€¡ Ã Â¦ÂªÃ Â¦Â¾Ã Â¦Â¬Ã Â§â€¡ Ã Â¦Â¤Ã Â¦Â¾ Ã Â¦Å¡Ã Â¦Â¯Ã Â¦Â¼Ã Â¦Â¨ Ã Â¦â€¢Ã Â¦Â°Ã Â§ÂÃ Â¦Â¨Ã Â¥Â¤',
        settings_visibility_label: 'Ã Â¦Â¦Ã Â§Æ’Ã Â¦Â¶Ã Â§ÂÃ Â¦Â¯Ã Â¦Â®Ã Â¦Â¾Ã Â¦Â¨Ã Â¦Â¤Ã Â¦Â¾',
        settings_visibility_everyone: 'Ã Â¦Â¸Ã Â¦Â¬Ã Â¦Â¾Ã Â¦â€¡',
        settings_visibility_friends: 'Ã Â¦Â¬Ã Â¦Â¨Ã Â§ÂÃ Â¦Â§Ã Â§Â/Ã Â¦â€”Ã Â¦Â¿Ã Â¦Â²Ã Â§ÂÃ Â¦Â¡ Ã Â¦Â¶Ã Â§ÂÃ Â¦Â§Ã Â§ÂÃ Â¦Â®Ã Â¦Â¾Ã Â¦Â¤Ã Â§ÂÃ Â¦Â°',
        edit_hint: 'Ã Â¦Â¸Ã Â¦Â®Ã Â§ÂÃ Â¦ÂªÃ Â¦Â¾Ã Â¦Â¦Ã Â¦Â¨Ã Â¦Â¾ Ã Â¦â€¢Ã Â¦Â°Ã Â¦Â¤Ã Â§â€¡ Ã Â¦Â°Ã Â¦Â¾Ã Â¦â€¡Ã Â¦Å¸-Ã Â¦â€¢Ã Â§ÂÃ Â¦Â²Ã Â¦Â¿Ã Â¦â€¢ Ã Â¦â€¢Ã Â¦Â°Ã Â§ÂÃ Â¦Â¨',
        settings_platform: 'Ã Â¦ÂªÃ Â§ÂÃ Â¦Â²Ã Â§ÂÃ Â¦Â¯Ã Â¦Â¾Ã Â¦Å¸Ã Â¦Â«Ã Â¦Â°Ã Â§ÂÃ Â¦Â®',
        settings_time: 'Ã Â¦Â¸Ã Â¦Â®Ã Â¦Â¯Ã Â¦Â¼',
        settings_stat: 'Ã Â¦Â¸Ã Â§ÂÃ Â¦Å¸Ã Â§ÂÃ Â¦Â¯Ã Â¦Â¾Ã Â¦Å¸',
        settings_save_default: 'Ã Â¦Â¡Ã Â¦Â¿Ã Â¦Â«Ã Â¦Â²Ã Â§ÂÃ Â¦Å¸ Ã Â¦Â¸Ã Â§â€¡Ã Â¦Å¸ Ã Â¦â€¢Ã Â¦Â°Ã Â§ÂÃ Â¦Â¨',
        settings_reset_scores: 'Ã Â¦Â¸Ã Â§ÂÃ Â¦â€¢Ã Â§â€¹Ã Â¦Â° Ã Â¦Â®Ã Â¦Â¾Ã Â¦Â¨ Ã Â¦Â°Ã Â¦Â¿Ã Â¦Â¸Ã Â§â€¡Ã Â¦Å¸ Ã Â¦â€¢Ã Â¦Â°Ã Â§ÂÃ Â¦Â¨',
        settings_reset_config: 'Ã Â¦â€¢Ã Â¦Â¨Ã Â¦Â«Ã Â¦Â¿Ã Â¦â€”Ã Â¦Â¾Ã Â¦Â°Ã Â§â€¡Ã Â¦Â¶Ã Â¦Â¨',
        settings_current_config: 'Ã Â¦Â¬Ã Â¦Â°Ã Â§ÂÃ Â¦Â¤Ã Â¦Â®Ã Â¦Â¾Ã Â¦Â¨ Ã Â¦â€¢Ã Â¦Â¨Ã Â¦Â«Ã Â¦Â¿Ã Â¦â€”Ã Â¦Â¾Ã Â¦Â°Ã Â§â€¡Ã Â¦Â¶Ã Â¦Â¨',
        settings_reset_selected: 'Ã Â¦Â¨Ã Â¦Â¿Ã Â¦Â°Ã Â§ÂÃ Â¦Â¬Ã Â¦Â¾Ã Â¦Å¡Ã Â¦Â¿Ã Â¦Â¤ Ã Â¦Â°Ã Â¦Â¿Ã Â¦Â¸Ã Â§â€¡Ã Â¦Å¸ Ã Â¦â€¢Ã Â¦Â°Ã Â§ÂÃ Â¦Â¨',
        settings_reset_all: 'Ã Â¦Â¸Ã Â¦Â®Ã Â¦Â¸Ã Â§ÂÃ Â¦Â¤ Ã Â¦â€¢Ã Â¦Â¨Ã Â¦Â«Ã Â¦Â¿Ã Â¦â€”Ã Â¦Â¾Ã Â¦Â°Ã Â§â€¡Ã Â¦Â¶Ã Â¦Â¨ Ã Â¦Â°Ã Â¦Â¿Ã Â¦Â¸Ã Â§â€¡Ã Â¦Å¸ Ã Â¦â€¢Ã Â¦Â°Ã Â§ÂÃ Â¦Â¨',
        settings_reset_note: 'Ã Â¦Â¡Ã Â¦Â¿Ã Â¦Â«Ã Â¦Â²Ã Â§ÂÃ Â¦Å¸ Ã Â¦ÂªÃ Â¦Â°Ã Â¦Â¿Ã Â¦Â¬Ã Â¦Â°Ã Â§ÂÃ Â¦Â¤Ã Â¦Â¨ Ã Â¦â€¢Ã Â¦Â°Ã Â§â€¡ Ã Â¦Â¨Ã Â¦Â¾Ã Â¥Â¤',
        generating_screenshot: 'Ã Â¦Â¸Ã Â§ÂÃ Â¦â€¢Ã Â§ÂÃ Â¦Â°Ã Â¦Â¿Ã Â¦Â¨Ã Â¦Â¶Ã Â¦Å¸ Ã Â¦Â¤Ã Â§Ë†Ã Â¦Â°Ã Â¦Â¿ Ã Â¦Â¹Ã Â¦Å¡Ã Â§ÂÃ Â¦â€ºÃ Â§â€¡...',
        reset_confirm: 'Ã Â¦Â¸Ã Â¦Â®Ã Â¦Â¸Ã Â§ÂÃ Â¦Â¤ Ã Â¦Â¸Ã Â§ÂÃ Â¦â€¢Ã Â§â€¹Ã Â¦Â° Ã Â¦Â®Ã Â¦Â¾Ã Â¦Â¨ Ã Â§Â¦-Ã Â¦Â Ã Â¦Â°Ã Â¦Â¿Ã Â¦Â¸Ã Â§â€¡Ã Â¦Å¸ Ã Â¦â€¢Ã Â¦Â°Ã Â¦Â¬Ã Â§â€¡Ã Â¦Â¨?',
        reset_all_confirm: 'Ã Â¦Â¸Ã Â¦Â®Ã Â¦Â¸Ã Â§ÂÃ Â¦Â¤ Ã Â¦Â¸Ã Â¦â€šÃ Â¦Â°Ã Â¦â€¢Ã Â§ÂÃ Â¦Â·Ã Â¦Â¿Ã Â¦Â¤ Ã Â¦â€¢Ã Â¦Â¨Ã Â¦Â«Ã Â¦Â¿Ã Â¦â€”Ã Â¦Â¾Ã Â¦Â°Ã Â§â€¡Ã Â¦Â¶Ã Â¦Â¨ Ã Â¦ÂÃ Â¦Â¬Ã Â¦â€š Ã Â¦Â¸Ã Â§ÂÃ Â¦â€¢Ã Â§â€¹Ã Â¦Â° Ã Â¦Â°Ã Â¦Â¿Ã Â¦Â¸Ã Â§â€¡Ã Â¦Å¸ Ã Â¦â€¢Ã Â¦Â°Ã Â¦Â¬Ã Â§â€¡Ã Â¦Â¨?'
    },
    da: {
        share: 'Del',
        settings: 'Indstillinger',
        rating: 'Vurdering',
        score: 'Score',
        progression: 'ScoregrÃƒÂ¦nse',
        cave: 'Hule',
        edit: 'Rediger',
        edit_hint: 'HÃƒÂ¸jreklik for at redigere',
        swords: 'SvÃƒÂ¦rd',
        bombs: 'Bomber',
        radar_title: 'Hulegraf',
        radar_strongest: 'StÃƒÂ¦rkeste huler',
        radar_weakest: 'Svageste huler',
        radar_tab_combined: 'Kombineret',
        radar_tab_swords: 'SvÃƒÂ¦rd',
        radar_tab_bombs: 'Bomber',
        rule_1: 'Benchmarken er udelukkende beregnet til <span style="color: #fff;">personlig brug</span>.',
        rule_2: 'Alle fjender i hulen skal <span style="color: #fff;">nulstilles til fuldt helbred</span> fÃƒÂ¸r start.',
        rule_3: 'Ingen <span style="color: #fff;">hastighedsboosts</span> fra buske er tilladt.',
        rule_4: 'ScoringstÃƒÂ¦rskler skal opnÃƒÂ¥s <span style="color: #fff;">uden hjÃƒÂ¦lp</span> fra andre spillere eller utilsigtet skade forÃƒÂ¥rsaget af andre spillere.',
        rule_5: 'Kategorien <span style="color: #fff;">SvÃƒÂ¦rd</span> tillader kun brug af svÃƒÂ¦rd, mens kategorien <span style="color: #fff;">Bomber</span> tillader brug af bÃƒÂ¥de bomber og svÃƒÂ¦rd.',
        download_image: 'Download billede',
        copy_link: 'Kopier benchmark-link',
        guidelines_title: 'Retningslinjer',
        guidelines_subtitle: 'for nÃƒÂ¸jagtig scoring',
        settings_title: 'Indstillinger',
        settings_subtitle: 'Tilpas din benchmark',
        settings_language: 'Sprog',
        settings_language_note: 'Anvendes ÃƒÂ¸jeblikkeligt.',
        settings_display: 'Visning',
        settings_font_scale: 'SkriftstÃƒÂ¸rrelse',
        settings_font_family: 'Skrifttype',
        settings_compact_mode: 'Kompakt tilstand',
        settings_pacman: 'Pacman',
        settings_font_small: 'Lille',
        settings_font_normal: 'Normal',
        settings_font_large: 'Stor',
        settings_font_default: 'Standard',
        settings_font_modern: 'Moderne',
        settings_font_classic: 'Klassisk',
        settings_font_mono: 'Mono',
        settings_toggle_on: 'Til',
        settings_toggle_off: 'Fra',
        settings_theme: 'Temaer',
        settings_theme_note: 'Rangtemaer lÃƒÂ¥ses op, nÃƒÂ¥r du stiger i graderne.',
        settings_theme_auto: 'Anvend automatisk dit nuvÃƒÂ¦rende rangtema, nÃƒÂ¥r du stiger i grad',
        settings_custom_name: 'Brugerdefineret',
        settings_save_name: 'Gem',
        settings_remove_custom: 'Fjern',
        settings_custom_create: 'Opret',
        settings_custom_locked_note: 'Klik pÃƒÂ¥ Opret for at lÃƒÂ¥se op for brugerdefinerede farver.',
        settings_custom_select_note: 'VÃƒÂ¦lg et brugerdefineret tema.',
        settings_custom_theme: 'Brugerdefinerede farver',
        settings_custom_note: 'VÃƒÂ¦lg farver for at bygge dit eget tema.',
        settings_preview: 'ForhÃƒÂ¥ndsvisning',
        settings_preview_title: 'Benchmark forhÃƒÂ¥ndsvisning',
        settings_preview_note: 'Opdateres, nÃƒÂ¥r du ÃƒÂ¦ndrer farver.',
        settings_color_target: 'FarvemÃƒÂ¥l',
        settings_color_background: 'Baggrund',
        settings_color_accent1: 'Accent 1',
        settings_color_accent2: 'Accent 2',
        settings_color_panel: 'Panelbaggrund',
        settings_color_border: 'Panelkant',
        settings_color_text: 'Tekst',
        settings_default_config: 'Konfiguration',
        settings_default_config_startup: 'Konfiguration ved opstart',
        settings_visibility_title: 'Synlighed',
        settings_visibility_note: 'VÃƒÂ¦lg hvem der kan se din benchmark.',
        settings_visibility_label: 'Synlighed',
        settings_visibility_everyone: 'Alle',
        settings_visibility_friends: 'Kun venner/laug',
        edit_hint: 'HÃƒÂ¸jreklik for at redigere',
        settings_platform: 'Platform',
        settings_time: 'Tid',
        settings_stat: 'Statistik',
        settings_save_default: 'Indstil standard',
        settings_reset_scores: 'Nulstil scorevÃƒÂ¦rdier',
        settings_reset_config: 'Konfiguration',
        settings_current_config: 'NuvÃƒÂ¦rende konfiguration',
        settings_reset_selected: 'Nulstil valgte',
        settings_reset_all: 'Nulstil alle konfigurationer',
        settings_reset_note: 'Ãƒâ€ ndrer ikke standarder.',
        generating_screenshot: 'Genererer skÃƒÂ¦rmbillede...',
        reset_confirm: 'Nulstil alle scorevÃƒÂ¦rdier til 0?',
        reset_all_confirm: 'Nulstil alle gemte konfigurationer og scorer?'
    },
    de: {
        share: 'Teilen',
        settings: 'Einstellungen',
        rating: 'Bewertung',
        score: 'Punktzahl',
        progression: 'Punkteschwelle',
        cave: 'HÃƒÂ¶hle',
        edit: 'Bearbeiten',
        edit_hint: 'Rechtsklick zum Bearbeiten',
        swords: 'Schwerter',
        bombs: 'Bomben',
        radar_title: 'HÃƒÂ¶hlendiagramm',
        radar_strongest: 'StÃƒÂ¤rkste HÃƒÂ¶hlen',
        radar_weakest: 'SchwÃƒÂ¤chste HÃƒÂ¶hlen',
        radar_tab_combined: 'Kombiniert',
        radar_tab_swords: 'Schwerter',
        radar_tab_bombs: 'Bomben',
        rule_1: 'Der Benchmark ist ausschlieÃƒÅ¸lich fÃƒÂ¼r den <span style="color: #fff;">persÃƒÂ¶nlichen Gebrauch</span> bestimmt.',
        rule_2: 'Alle Gegner in der HÃƒÂ¶hle mÃƒÂ¼ssen vor Beginn auf <span style="color: #fff;">volle Gesundheit zurÃƒÂ¼ckgesetzt</span> werden.',
        rule_3: 'Es sind keine <span style="color: #fff;">GeschwindigkeitsschÃƒÂ¼be</span> durch BÃƒÂ¼sche erlaubt.',
        rule_4: 'Punkteschwellen mÃƒÂ¼ssen <span style="color: #fff;">ohne Hilfe</span> anderer Spieler oder versehentlichen Schaden durch andere Spieler erreicht werden.',
        rule_5: 'Die Kategorie <span style="color: #fff;">Schwerter</span> erlaubt nur die Verwendung von Schwertern, wÃƒÂ¤hrend die Kategorie <span style="color: #fff;">Bomben</span> sowohl Bomben als auch Schwerter erlaubt.',
        download_image: 'Bild herunterladen',
        copy_link: 'Benchmark-Link kopieren',
        guidelines_title: 'Richtlinien',
        guidelines_subtitle: 'fÃƒÂ¼r genaue Bewertung',
        settings_title: 'Einstellungen',
        settings_subtitle: 'Passe deinen Benchmark an',
        settings_language: 'Sprache',
        settings_language_note: 'Wird sofort angewendet.',
        settings_display: 'Anzeige',
        settings_font_scale: 'SchriftgrÃƒÂ¶ÃƒÅ¸e',
        settings_font_family: 'Schriftart',
        settings_compact_mode: 'Kompaktmodus',
        settings_pacman: 'Pacman',
        settings_font_small: 'Klein',
        settings_font_normal: 'Normal',
        settings_font_large: 'GroÃƒÅ¸',
        settings_font_default: 'Standard',
        settings_font_modern: 'Modern',
        settings_font_classic: 'Klassisch',
        settings_font_mono: 'Mono',
        settings_toggle_on: 'Ein',
        settings_toggle_off: 'Aus',
        settings_theme: 'Themen',
        settings_theme_note: 'Rang-Themen werden freigeschaltet, wenn du im Rang aufsteigst.',
        settings_theme_auto: 'Wende dein aktuelles Rang-Thema automatisch an, wenn du aufsteigst',
        settings_custom_name: 'Benutzerdefiniert',
        settings_save_name: 'Speichern',
        settings_remove_custom: 'Entfernen',
        settings_custom_create: 'Erstellen',
        settings_custom_locked_note: 'Klicke auf Erstellen, um benutzerdefinierte Farben freizuschalten.',
        settings_custom_select_note: 'WÃƒÂ¤hle ein benutzerdefiniertes Thema.',
        settings_custom_theme: 'Benutzerdefinierte Farben',
        settings_custom_note: 'WÃƒÂ¤hle Farben, um dein eigenes Thema zu erstellen.',
        settings_preview: 'Vorschau',
        settings_preview_title: 'Benchmark-Vorschau',
        settings_preview_note: 'Aktualisiert sich, wenn du Farben ÃƒÂ¤nderst.',
        settings_color_target: 'Farbziel',
        settings_color_background: 'Hintergrund',
        settings_color_accent1: 'Akzent 1',
        settings_color_accent2: 'Akzent 2',
        settings_color_panel: 'Panel-Hintergrund',
        settings_color_border: 'Panel-Rahmen',
        settings_color_text: 'Text',
        settings_default_config: 'Konfiguration',
        settings_default_config_startup: 'Startkonfiguration',
        settings_visibility_title: 'Sichtbarkeit',
        settings_visibility_note: 'WÃƒÂ¤hle, wer deinen Benchmark sehen kann.',
        settings_visibility_label: 'Sichtbarkeit',
        settings_visibility_everyone: 'Jeder',
        settings_visibility_friends: 'Nur Freunde/Gilde',
        edit_hint: 'Rechtsklick zum Bearbeiten',
        settings_platform: 'Plattform',
        settings_time: 'Zeit',
        settings_stat: 'Statistik',
        settings_save_default: 'Standard festlegen',
        settings_reset_scores: 'Punktwerte zurÃƒÂ¼cksetzen',
        settings_reset_config: 'Konfiguration',
        settings_current_config: 'Aktuelle Konfiguration',
        settings_reset_selected: 'AusgewÃƒÂ¤hlte zurÃƒÂ¼cksetzen',
        settings_reset_all: 'Alle Konfigurationen zurÃƒÂ¼cksetzen',
        settings_reset_note: 'Ãƒâ€žndert keine Standards.',
        generating_screenshot: 'Screenshot wird erstellt...',
        reset_confirm: 'Alle Punktwerte auf 0 zurÃƒÂ¼cksetzen?',
        reset_all_confirm: 'Alle gespeicherten Konfigurationen und Punkte zurÃƒÂ¼cksetzen?'
    },
    nl: {
        share: 'Delen',
        settings: 'Instellingen',
        rating: 'Beoordeling',
        score: 'Score',
        progression: 'Scoregrens',
        cave: 'Grot',
        edit: 'Bewerken',
        edit_hint: 'Rechtsklik om te bewerken',
        swords: 'Zwaarden',
        bombs: 'Bommen',
        radar_title: 'Grotgrafiek',
        radar_strongest: 'Sterkste grotten',
        radar_weakest: 'Zwakste grotten',
        radar_tab_combined: 'Gecombineerd',
        radar_tab_swords: 'Zwaarden',
        radar_tab_bombs: 'Bommen',
        rule_1: 'De benchmark is uitsluitend bedoeld voor <span style="color: #fff;">persoonlijk gebruik</span>.',
        rule_2: 'Alle vijanden in de grot moeten <span style="color: #fff;">volledig hersteld</span> zijn voordat je begint.',
        rule_3: 'Geen <span style="color: #fff;">snelheidsboosts</span> van struiken toegestaan.',
        rule_4: 'Scoredrempels moeten worden bereikt <span style="color: #fff;">zonder hulp</span> van andere spelers of accidentele schade door andere spelers.',
        rule_5: 'De categorie <span style="color: #fff;">Zwaarden</span> staat alleen het gebruik van zwaarden toe, terwijl de categorie <span style="color: #fff;">Bommen</span> zowel bommen als zwaarden toestaat.',
        download_image: 'Afbeelding downloaden',
        copy_link: 'Benchmarklink kopiÃƒÂ«ren',
        guidelines_title: 'Richtlijnen',
        guidelines_subtitle: 'voor nauwkeurige scoring',
        settings_title: 'Instellingen',
        settings_subtitle: 'Pas je benchmark aan',
        settings_language: 'Taal',
        settings_language_note: 'Wordt direct toegepast.',
        settings_display: 'Weergave',
        settings_font_scale: 'Lettergrootte',
        settings_font_family: 'Lettertype',
        settings_compact_mode: 'Compacte modus',
        settings_pacman: 'Pacman',
        settings_font_small: 'Klein',
        settings_font_normal: 'Normaal',
        settings_font_large: 'Groot',
        settings_font_default: 'Standaard',
        settings_font_modern: 'Modern',
        settings_font_classic: 'Klassiek',
        settings_font_mono: 'Mono',
        settings_toggle_on: 'Aan',
        settings_toggle_off: 'Uit',
        settings_theme: 'Thema\'s',
        settings_theme_note: 'Rangthema\'s worden ontgrendeld naarmate je stijgt in rang.',
        settings_theme_auto: 'Pas automatisch je huidige rangthema toe wanneer je in rang stijgt',
        settings_custom_name: 'Aangepast',
        settings_save_name: 'Opslaan',
        settings_remove_custom: 'Verwijderen',
        settings_custom_create: 'Maken',
        settings_custom_locked_note: 'Klik op Maken om aangepaste kleuren te ontgrendelen.',
        settings_custom_select_note: 'Selecteer een aangepast thema.',
        settings_custom_theme: 'Aangepaste kleuren',
        settings_custom_note: 'Kies kleuren om je eigen thema te bouwen.',
        settings_preview: 'Voorbeeld',
        settings_preview_title: 'Benchmarkvoorbeeld',
        settings_preview_note: 'Wordt bijgewerkt terwijl je kleuren wijzigt.',
        settings_color_target: 'Kleurdoel',
        settings_color_background: 'Achtergrond',
        settings_color_accent1: 'Accent 1',
        settings_color_accent2: 'Accent 2',
        settings_color_panel: 'Paneelachtergrond',
        settings_color_border: 'Paneelrand',
        settings_color_text: 'Tekst',
        settings_default_config: 'Configuratie',
        settings_default_config_startup: 'Opstartconfiguratie',
        settings_visibility_title: 'Zichtbaarheid',
        settings_visibility_note: 'Kies wie je benchmark kan zien.',
        settings_visibility_label: 'Zichtbaarheid',
        settings_visibility_everyone: 'Iedereen',
        settings_visibility_friends: 'Alleen vrienden/gilde',
        edit_hint: 'Rechtsklik om te bewerken',
        settings_platform: 'Platform',
        settings_time: 'Tid',
        settings_stat: 'Statistiek',
        settings_save_default: 'Standaard instellen',
        settings_reset_scores: 'Scorewaarden resetten',
        settings_reset_config: 'Configuratie',
        settings_current_config: 'Huidige configuratie',
        settings_reset_selected: 'Geselecteerde resetten',
        settings_reset_all: 'Alle configuraties resetten',
        settings_reset_note: 'Wijzigt geen standaarden.',
        generating_screenshot: 'Screenshot genereren...',
        reset_confirm: 'Alle scorewaarden resetten naar 0?',
        reset_all_confirm: 'Alle opgeslagen configuraties en scores resetten?'
    },
    es: {
        share: 'Compartir',
        settings: 'Ajustes',
        settings_title: 'Ajustes',
        settings_subtitle: 'Personaliza tu benchmark',
        rating: 'Clasificación',
        score: 'Puntuación',
        progression: 'Umbral de puntuación',
        cave: 'Cueva',
        edit: 'Editar',
        edit_hint: 'Clic derecho para editar',
        swords: 'Espadas',
        bombs: 'Bombas',
        radar_title: 'Gráfico de Cueva',
        radar_strongest: 'Cuevas más fuertes',
        radar_weakest: 'Cuevas más débiles',
        radar_tab_combined: 'Combinado',
        radar_tab_swords: 'Espadas',
        radar_tab_bombs: 'Bombas',
        rule_1: 'El benchmark está destinado exclusivamente para <span style="color: #fff;">uso personal</span>.',
        rule_2: 'Todos los enemigos en la cueva deben ser <span style="color: #fff;">restablecidos a salud completa</span> antes de comenzar.',
        rule_3: 'No se permiten <span style="color: #fff;">aumentos de velocidad</span> de los arbustos.',
        rule_4: 'Los umbrales de puntuación deben alcanzarse <span style="color: #fff;">sin ninguna ayuda</span> de otros jugadores o daño accidental causado por otros jugadores.',
        rule_5: 'La categoría <span style="color: #fff;">Espadas</span> permite solo el uso de espadas, mientras que la categoría <span style="color: #fff;">Bombas</span> permite el uso tanto de bombas como de espadas.',
        guidelines_title: 'Directrices',
        guidelines_subtitle: 'para una puntuación precisa',
        settings_language: 'Idioma',
        settings_language_note: 'Se aplica al instante.',
        settings_display: 'Pantalla',
        settings_mount: 'Montura',
        mount_speed_1: 'Velocidad de montura 1',
        mount_speed_2: 'Velocidad de montura 2',
        settings_font_scale: 'Tamaño de fuente',
        settings_font_family: 'Fuente',
        settings_compact_mode: 'Modo compacto',
        settings_pacman: 'Pacman',
        settings_font_small: 'Pequeño',
        settings_font_normal: 'Normal',
        settings_font_large: 'Grande',
        settings_font_default: 'Predeterminado',
        settings_font_modern: 'Moderno',
        settings_font_classic: 'Clásico',
        settings_font_mono: 'Mono',
        settings_toggle_on: 'Encendido',
        settings_toggle_off: 'Apagado',
        settings_theme: 'Temas',
        settings_theme_note: 'Los temas de rango se desbloquean a medida que subes de rango.',
        settings_theme_auto: 'Aplicar automáticamente tu tema de rango actual al subir de rango',
        settings_custom_name: 'Personalizado',
        settings_save_name: 'Guardar',
        settings_remove_custom: 'Eliminar',
        settings_custom_create: 'Crear',
        settings_custom_locked_note: 'Haz clic en Crear para desbloquear colores personalizados.',
        settings_custom_select_note: 'Selecciona un tema personalizado.',
        settings_custom_theme: 'Colores personalizados',
        settings_custom_note: 'Elige colores para construir tu propio tema.',
        settings_preview: 'Vista previa',
        settings_preview_title: 'Vista previa del benchmark',
        settings_preview_note: 'Se actualiza a medida que cambias los colores.',
        settings_color_target: 'Objetivo de color',
        settings_color_background: 'Fondo',
        settings_color_accent1: 'Acento 1',
        settings_color_accent2: 'Acento 2',
        settings_color_panel: 'Fondo del panel',
        settings_color_border: 'Borde del panel',
        settings_color_text: 'Texto',
        settings_default_config: 'Configuración',
        settings_default_config_startup: 'Configuración de inicio',
        settings_visibility_title: 'Visibilidad',
        settings_visibility_note: 'Elige quién puede ver tu benchmark.',
        settings_visibility_label: 'Visibilidad',
        settings_visibility_everyone: 'Todos',
        settings_visibility_friends: 'Solo amigos/gremio',
        settings_platform: 'Plataforma',
        settings_time: 'Tiempo',
        settings_stat: 'Estadística',
        settings_save_default: 'Establecer predeterminado',
        settings_reset_scores: 'Restablecer valores de puntuación',
        settings_reset_config: 'Configuración',
        settings_current_config: 'Configuración actual',
        settings_reset_selected: 'Restablecer seleccionados',
        settings_reset_all: 'Restablecer todas las configuraciones',
        settings_reset_note: 'No cambia los valores predeterminados.',
        menu_profile: 'Perfil',
        menu_friends: 'Amigos',
        menu_logout: 'Cerrar sesión',
        achievements_title: 'Logros',
        highlights_title: 'Destacados',
        profile_settings_title: 'Configuración de perfil',
        friends_title: 'Amigos',
        friends_subtitle: 'Agrega y ve los benchmarks de tus amigos',
        add_highlight_btn: '+ Agregar destacado',
        add_friend: 'Agregar amigo',
        show: 'Mostrar',
        hide: 'Ocultar',
        seasonal_modal_title: 'Posiciones de temporada',
        seasonal_modal_subtitle: 'Agrega tus trofeos obtenidos',
        seasonal_current_total: 'Total actual de posiciones',
        seasonal_total_label: 'Total',
        seasonal_reset_values: 'Restablecer valores',
        seasonal_save_placements: 'Guardar posiciones',
        seasonal_place_1st: '1.er lugar',
        seasonal_place_2nd: '2.º lugar',
        seasonal_place_3rd: '3.er lugar',
        seasonal_place_plaque: 'Placa',
        friends_none: 'Aún no tienes amigos.',
        friend_requests_none: 'No hay solicitudes de amistad.',
        remove_friends_none: 'No hay amigos para eliminar.',
        highlight_modal_title: 'Agregar destacado',
        highlight_label_image: 'Imagen',
        highlight_click_upload: 'Haz clic para subir una imagen',
        copy_link: 'Copiar enlace del benchmark',
        download_image: 'Descargar imagen',
        generating_screenshot: 'Generando captura de pantalla...',
        reset_confirm: '¿Restablecer todos los valores de puntuación a 0?',
        reset_all_confirm: '¿Restablecer todas las configuraciones y puntuaciones guardadas?',
        achievement_you_have: 'Has desbloqueado',
        achievement_completed: 'Completado',
        achievement_incomplete: 'Incompleto',
        achievement_upload_image: 'Subir imagen',
        achievement_enter_friend_name: 'Ingresa el nombre de tu amigo',
        achievement_friend_label: 'Amigo {index}',
        achievement_session_incomplete: 'Sesión incompleta',
        achievement_no_image: 'Sin imagen',
        achievement_remove_image_title: 'Eliminar imagen',
        achievement_remove_image_confirm: '¿Eliminar esta imagen?',
        achievement_session_image: 'Imagen de sesión',
        achievement_cat_lifetime: 'Acumulado',
        achievement_cat_kills: 'Bajas',
        achievement_cat_points: 'Puntos',
        achievement_cat_streak: 'Racha',
        achievement_cat_duo: 'Dúo',
        achievement_cat_trio: 'Trío',
        achievement_cat_quad: 'Cuarteto',
        achievement_cat_challenge: 'Desafío',
        achievement_progress_view_prefix: '{name} ha desbloqueado',
        remove_friend_title: 'Eliminar amigo',
        remove_friend_confirm: '¿Eliminar a {name} de tu lista de amigos?',
        remove_friend_failed: 'No se pudo eliminar al amigo.',
        highlight_delete_title: 'Eliminar destacado',
        highlight_delete_confirm: '¿Seguro que quieres eliminar este destacado?',
        replace_image: 'Reemplazar imagen',
        password: 'Contraseña',
        sent_requests_none: 'No hay solicitudes enviadas.',
        center: 'Centrar',
        save: 'Guardar',
        cancel: 'Cancelar',
        add: 'Agregar',
        remove: 'Eliminar',
        accept: 'Aceptar',
        decline: 'Rechazar',
        drag_to_reorder: 'Arrastra para reordenar',
        profile_email_verification_sent: 'Se envió un correo de verificación a {email}. Revisa tu bandeja de entrada o spam.',
        verification_email_sent_to: 'Correo de verificación enviado a {email}',
        reauth_password_required: 'Se requiere contraseña.',
        reauth_verifying: 'Verificando...',
        reauth_confirm: 'Confirmar',
        reauth_title: 'Se requiere reautenticación',
        reauth_subtitle: 'Ingresa tu contraseña para continuar.',
        reauth_current_password: 'Contraseña actual',
        reauth_failed_prefix: 'La reautenticación falló: ',
        email_update_relogin_title: 'Actualización de correo solicitada',
        back_to_login_page: 'Volver a la página de inicio de sesión',
        footer_site_made_by: 'Sitio creado por',
        footer_disclaimer: 'Este sitio no est\u00E1 afiliado, mantenido, respaldado ni patrocinado por GraalOnline. Todos los recursos \u00A9 2026 GraalOnline',
        footer_terms: 'T\u00E9rminos y condiciones',
        footer_privacy: 'Pol\u00EDtica de privacidad',
        footer_cookie: 'Pol\u00EDtica de cookies',
        footer_dmca: 'Pol\u00EDtica DMCA',
        views_label: 'Vistas'
    },
    'pt-BR': {
        share: 'Compartilhar',
        settings: 'Configurações',
        rating: 'Classificação',
        score: 'Pontuação',
        progression: 'Limiar de pontuação',
        cave: 'Caverna',
        edit: 'Editar',
        edit_hint: 'Clique com o botão direito para editar',
        swords: 'Espadas',
        bombs: 'Bombas',
        radar_title: 'Gráfico da Caverna',
        radar_strongest: 'Cavernas Mais Fortes',
        radar_weakest: 'Cavernas Mais Fracas',
        radar_tab_combined: 'Combinado',
        radar_tab_swords: 'Espadas',
        radar_tab_bombs: 'Bombas',
        rule_1: 'O benchmark destina-se exclusivamente para <span style="color: #fff;">uso pessoal</span>.',
        rule_2: 'Todos os inimigos na caverna devem ser <span style="color: #fff;">redefinidos para a saúde total</span> antes de começar.',
        rule_3: 'Não são permitidos <span style="color: #fff;">aumentos de velocidade</span> de arbustos.',
        rule_4: 'Os limites de pontuação devem ser alcançados <span style="color: #fff;">sem qualquer ajuda</span> de outros jogadores ou danos acidentais causados por outros jogadores.',
        rule_5: 'A categoria <span style="color: #fff;">Espadas</span> permite apenas o uso de espadas, enquanto a categoria <span style="color: #fff;">Bombas</span> permite o uso de bombas e espadas.',
        download_image: 'Baixar Imagem',
        copy_link: 'Copiar Link do Benchmark',
        guidelines_title: 'Diretrizes',
        guidelines_subtitle: 'para pontuação precisa',
        settings_title: 'Configurações',
        settings_subtitle: 'Personalize seu benchmark',
        settings_language: 'Idioma',
        settings_language_note: 'Aplica-se instantaneamente.',
        settings_display: 'Tela',
        settings_font_scale: 'Tamanho da Fonte',
        settings_font_family: 'Tipo de Letra',
        settings_compact_mode: 'Modo Compacto',
        settings_pacman: 'Pacman',
        settings_font_small: 'Pequeno',
        settings_font_normal: 'Normal',
        settings_font_large: 'Grande',
        settings_font_default: 'Padrão',
        settings_font_modern: 'Moderno',
        settings_font_classic: 'Clássico',
        settings_font_mono: 'Mono',
        settings_toggle_on: 'Ligado',
        settings_toggle_off: 'Desligado',
        settings_theme: 'Temas',
        settings_theme_note: 'Temas de classificação são desbloqueados conforme sobe de nível.',
        settings_theme_auto: 'Aplicar automaticamente seu tema de classificação atual ao subir de nível',
        settings_custom_name: 'Personalizado',
        settings_save_name: 'Salvar',
        settings_remove_custom: 'Remover',
        settings_custom_create: 'Criar',
        settings_custom_locked_note: 'Clique em Criar para desbloquear cores personalizadas.',
        settings_custom_select_note: 'Selecione um tema personalizado.',
        settings_custom_theme: 'Cores Personalizadas',
        settings_custom_note: 'Escolha cores para criar seu próprio tema.',
        settings_preview: 'Pré-visualização',
        settings_preview_title: 'Pré-visualização do Benchmark',
        settings_preview_note: 'Atualiza conforme altera as cores.',
        settings_color_target: 'Alvo de Cor',
        settings_color_background: 'Fundo',
        settings_color_accent1: 'Destaque 1',
        settings_color_accent2: 'Destaque 2',
        settings_color_panel: 'Fundo do Painel',
        settings_color_border: 'Borda do Painel',
        settings_color_text: 'Texto',
        settings_default_config: 'Configuração',
        settings_default_config_startup: 'Configuração Inicial',
        settings_visibility_title: 'Visibilidade',
        settings_visibility_note: 'Escolha quem pode ver seu benchmark.',
        settings_visibility_label: 'Visibilidade',
        settings_visibility_everyone: 'Todos',
        settings_visibility_friends: 'Apenas Amigos/Guilda',
        settings_platform: 'Plataforma',
        settings_time: 'Tempo',
        settings_stat: 'Estatística',
        settings_save_default: 'Definir Padrão',
        settings_reset_scores: 'Redefinir Valores de Pontuação',
        settings_reset_config: 'Configuração',
        settings_current_config: 'Configuração atual',
        settings_reset_selected: 'Redefinir Selecionado',
        settings_reset_all: 'Redefinir Todas as Configurações',
        settings_reset_note: 'Não altera os padrões.',
        generating_screenshot: 'Gerando captura de tela...',
        reset_confirm: 'Redefinir todos os valores de pontuação para 0?',
        reset_all_confirm: 'Redefinir todas as configurações e pontuações guardadas?',
        menu_profile: 'Perfil',
        menu_friends: 'Amigos',
        menu_logout: 'Terminar sessão',
        achievements_title: 'Conquistas',
        highlights_title: 'Destaques',
        profile_settings_title: 'Configurações do Perfil',
        friends_title: 'Amigos',
        friends_subtitle: 'Adicione e veja os benchmarks dos seus amigos',
        add_highlight_btn: '+ Adicionar destaque',
        add_friend: 'Adicionar amigo',
        show: 'Mostrar',
        hide: 'Ocultar',
        seasonal_modal_title: 'Classificações Sazonais',
        seasonal_modal_subtitle: 'Adicione seus troféus conquistados',
        seasonal_current_total: 'Total atual de classificações',
        seasonal_total_label: 'Total',
        seasonal_reset_values: 'Redefinir valores',
        seasonal_save_placements: 'Salvar classificações',
        seasonal_place_1st: '1.º lugar',
        seasonal_place_2nd: '2.º lugar',
        seasonal_place_3rd: '3.º lugar',
        seasonal_place_plaque: 'Placa',
        friends_none: 'Você ainda não tem amigos.',
        friend_requests_none: 'Nenhuma solicitação de amizade.',
        remove_friends_none: 'Nenhum amigo para remover.',
        highlight_modal_title: 'Adicionar destaque',
        highlight_label_image: 'Imagem',
        highlight_click_upload: 'Clique para carregar uma imagem',
        achievement_completed: 'Concluído',
        achievement_incomplete: 'Incompleto',
        achievement_upload_image: 'Carregar imagem',
        achievement_enter_friend_name: 'Introduza o nome do amigo',
        achievement_friend_label: 'Amigo {index}',
        achievement_session_incomplete: 'Sessão incompleta',
        achievement_no_image: 'Sem imagem',
        achievement_remove_image_title: 'Remover imagem',
        achievement_remove_image_confirm: 'Remover esta imagem?',
        achievement_session_image: 'Imagem da sessão',
        achievement_cat_lifetime: 'Total',
        achievement_cat_kills: 'Abates',
        achievement_cat_points: 'Pontos',
        achievement_cat_streak: 'Sequência',
        achievement_cat_duo: 'Dupla',
        achievement_cat_trio: 'Trio',
        achievement_cat_quad: 'Quarteto',
        achievement_cat_challenge: 'Desafio',
        achievement_progress_view_prefix: '{name} desbloqueou',
        remove_friend_title: 'Remover Amigo',
        remove_friend_confirm: 'Remover {name} da sua lista de amigos?',
        remove_friend_failed: 'Não foi possível remover o amigo.',
        highlight_delete_title: 'Remover destaque',
        highlight_delete_confirm: 'Tem certeza de que deseja excluir este destaque?',
        replace_image: 'Substituir imagem',
        password: 'Palavra-passe',
        sent_requests_none: 'Sem pedidos enviados.',
        center: 'Centrar',
        save: 'Salvar',
        cancel: 'Cancelar',
        add: 'Adicionar',
        remove: 'Remover',
        edit: 'Editar',
        drag_to_reorder: 'Arraste para reordenar',
        profile_email_verification_sent: 'E-mail de verificação enviado para {email}. Verifique sua caixa de entrada ou pasta de spam.',
        verification_email_sent_to: 'E-mail de verificação enviado para {email}',
        reauth_password_required: 'A palavra-passe é obrigatória.',
        reauth_verifying: 'A verificar...',
        reauth_confirm: 'Confirmar',
        reauth_title: 'Reautenticação necessária',
        reauth_subtitle: 'Introduza sua palavra-passe para continuar.',
        reauth_current_password: 'Palavra-passe atual',
        reauth_failed_prefix: 'Falha na reautenticação: ',
        email_update_relogin_title: 'Atualização de e-mail solicitada',
        back_to_login_page: 'Voltar para a página de login',
        footer_site_made_by: 'Site feito por',
        footer_disclaimer: 'Este site não é afiliado, mantido, apoiado ou patrocinado pela GraalOnline. Todos os recursos © 2026 GraalOnline',
        footer_terms: 'Termos e Condições',
        footer_privacy: 'Política de Privacidade',
        footer_cookie: 'Política de Cookies',
        footer_dmca: 'Política DMCA',
        views_label: 'Visualizações',
        settings_mount: 'Montaria',
        mount_speed_1: 'Velocidade da montaria 1',
        mount_speed_2: 'Velocidade da montaria 2',
        profile_picture: 'Foto de perfil',
        upload_image: 'Enviar imagem',
        edit_image: 'Editar imagem',
        remove_image: 'Remover imagem',
        username_label: 'Nome de usuário (1-20 caracteres)',
        guilds_max: 'Guildas (Máx 6)',
        add_guild: 'Adicionar guilda',
        guild_name_placeholder: 'Nome da guilda',
        country_flag: 'Bandeira do país',
        remove_flag: 'Remover bandeira',
        account_details: 'Detalhes da conta',
        account_id: 'ID da conta',
        email_address: 'Endereço de e-mail',
        new_email_placeholder: 'Novo endereço de e-mail',
        verify_update: 'Verificar e atualizar',
        change_email_address: 'Alterar endereço de e-mail',
        change_password: 'Alterar senha',
        delete_personal_account: 'Excluir conta pessoal',
        cannot_undo: 'Isto não pode ser desfeito.',
        delete_account: 'Excluir conta',
        discard_changes: 'Descartar alterações',
        save_changes: 'Salvar alterações',
        your_account_id: 'Seu ID da conta',
        friends_list_tab: 'Lista de amigos',
        friend_requests_tab: 'Solicitações de amizade',
        remove_friends_tab: 'Remover amigos',
        enter_account_id_placeholder: 'Digite o ID da conta',
        received_friend_requests: 'Solicitações recebidas',
        sent_friend_requests: 'Solicitações enviadas',
        select_friends_remove: 'Selecione amigos para remover',
        highlight_title_required_label: 'Título (Obrigatório)',
        highlight_desc_optional_label: 'Descrição (Opcional)',
        highlight_title_placeholder: 'Digite um título...',
        highlight_desc_placeholder: 'Digite uma descrição...',
        highlights_empty: 'Ainda não há destaques.',
        highlight_title_required_error: 'O título é obrigatório.',
        highlight_upload_required_error: 'A imagem é obrigatória.',
        highlight_save_failed: 'Não foi possível salvar o destaque.',
        highlight_limit_reached: 'Você atingiu o limite de destaques.',
        friends_error_loading: 'Erro ao carregar amigos.',
        friend_requests_error_loading: 'Erro ao carregar solicitações de amizade.',
        add_friend_user_not_found: 'Usuário não encontrado.',
        add_friend_self: 'Você não pode adicionar a si mesmo.',
        add_friend_already_friends: 'Vocês já são amigos.',
        add_friend_already_sent: 'Solicitação já enviada.',
        add_friend_check_requests: 'Verifique suas solicitações de amizade.',
        add_friend_sent: 'Solicitação de amizade enviada.',
        add_friend_error: 'Não foi possível enviar a solicitação de amizade.'
    },
    'pt-PT': {
        share: 'Partilhar',
        settings: 'Defini\u00E7\u00F5es',
        rating: 'Classifica\u00E7\u00E3o',
        score: 'Pontua\u00E7\u00E3o',
        progression: 'Limiar de pontua\u00E7\u00E3o',
        cave: 'Gruta',
        edit: 'Editar',
        edit_hint: 'Clique com o bot\u00E3o direito para editar',
        swords: 'Espadas',
        bombs: 'Bombas',
        radar_title: 'Gr\u00E1fico da Gruta',
        radar_strongest: 'Grutas Mais Fortes',
        radar_weakest: 'Grutas Mais Fracas',
        radar_tab_combined: 'Combinado',
        radar_tab_swords: 'Espadas',
        radar_tab_bombs: 'Bombas',
        rule_1: 'O benchmark destina-se exclusivamente para <span style="color: #fff;">uso pessoal</span>.',
        rule_2: 'Todos os inimigos na gruta devem ser <span style="color: #fff;">repostos para a sa\u00FAde total</span> antes de come\u00E7ar.',
        rule_3: 'N\u00E3o s\u00E3o permitidos <span style="color: #fff;">aumentos de velocidade</span> de arbustos.',
        rule_4: 'Os limites de pontua\u00E7\u00E3o devem ser alcan\u00E7ados <span style="color: #fff;">sem qualquer ajuda</span> de outros jogadores ou danos acidentais causados por outros jogadores.',
        rule_5: 'A categoria <span style="color: #fff;">Espadas</span> permite apenas o uso de espadas, enquanto a categoria <span style="color: #fff;">Bombas</span> permite o uso de bombas e espadas.',
        download_image: 'Descarregar Imagem',
        copy_link: 'Copiar Link do Benchmark',
        guidelines_title: 'Diretrizes',
        guidelines_subtitle: 'para pontua\u00E7\u00E3o precisa',
        settings_title: 'Defini\u00E7\u00F5es',
        settings_subtitle: 'Personalize o seu benchmark',
        settings_language: 'Idioma',
        settings_language_note: 'Aplica-se instantaneamente.',
        settings_display: 'Ecr\u00E3',
        settings_font_scale: 'Tamanho da Fonte',
        settings_font_family: 'Tipo de Letra',
        settings_compact_mode: 'Modo Compacto',
        settings_pacman: 'Pacman',
        settings_font_small: 'Pequeno',
        settings_font_normal: 'Normal',
        settings_font_large: 'Grande',
        settings_font_default: 'Predefini\u00E7\u00E3o',
        settings_font_modern: 'Moderno',
        settings_font_classic: 'Cl\u00E1ssico',
        settings_font_mono: 'Mono',
        settings_toggle_on: 'Ligado',
        settings_toggle_off: 'Desligado',
        settings_theme: 'Temas',
        settings_theme_note: 'Temas de classifica\u00E7\u00E3o s\u00E3o desbloqueados conforme sobe de n\u00EDvel.',
        settings_theme_auto: 'Aplicar automaticamente o seu tema de classifica\u00E7\u00E3o atual ao subir de n\u00EDvel',
        settings_custom_name: 'Personalizado',
        settings_save_name: 'Guardar',
        settings_remove_custom: 'Remover',
        settings_custom_create: 'Criar',
        settings_custom_locked_note: 'Clique em Criar para desbloquear cores personalizadas.',
        settings_custom_select_note: 'Selecione um tema personalizado.',
        settings_custom_theme: 'Cores Personalizadas',
        settings_custom_note: 'Escolha cores para criar o seu pr\u00F3prio tema.',
        settings_preview: 'Pr\u00E9-visualiza\u00E7\u00E3o',
        settings_preview_title: 'Pr\u00E9-visualiza\u00E7\u00E3o do Benchmark',
        settings_preview_note: 'Atualiza conforme altera as cores.',
        settings_color_target: 'Alvo de Cor',
        settings_color_background: 'Fundo',
        settings_color_accent1: 'Destaque 1',
        settings_color_accent2: 'Destaque 2',
        settings_color_panel: 'Fundo do Painel',
        settings_color_border: 'Borda do Painel',
        settings_color_text: 'Texto',
        settings_default_config: 'Configura\u00E7\u00E3o',
        settings_default_config_startup: 'Configura\u00E7\u00E3o de Arranque',
        settings_visibility_title: 'Visibilidade',
        settings_visibility_note: 'Escolha quem pode ver o seu benchmark.',
        settings_visibility_label: 'Visibilidade',
        settings_visibility_everyone: 'Todos',
        settings_visibility_friends: 'Apenas Amigos/Guilda',
        settings_platform: 'Plataforma',
        settings_time: 'Tempo',
        settings_stat: 'Estat\u00EDstica',
        settings_save_default: 'Definir Predefini\u00E7\u00E3o',
        settings_reset_scores: 'Repor Valores de Pontua\u00E7\u00E3o',
        settings_reset_config: 'Configura\u00E7\u00E3o',
        settings_current_config: 'Configura\u00E7\u00E3o atual',
        settings_reset_selected: 'Repor Selecionado',
        settings_reset_all: 'Repor Todas as Configura\u00E7\u00F5es',
        settings_reset_note: 'N\u00E3o altera as predefini\u00E7\u00F5es.',
        generating_screenshot: 'A gerar captura de ecr\u00E3...',
        reset_confirm: 'Repor todos os valores de pontua\u00E7\u00E3o para 0?',
        reset_all_confirm: 'Repor todas as configura\u00E7\u00F5es e pontua\u00E7\u00F5es guardadas?'
    },
    fi: {
        share: 'Jaa',
        settings: 'Asetukset',
        rating: 'Luokitus',
        score: 'Pisteet',
        progression: 'Pisteraja',
        cave: 'Luola',
        edit: 'Muokkaa',
        edit_hint: 'Klikkaa hiiren oikealla muokataksesi',
        swords: 'Miekat',
        bombs: 'Pommit',
        radar_title: 'Luolakaavio',
        radar_strongest: 'Vahvimmat luolat',
        radar_weakest: 'Heikoimmat luolat',
        radar_tab_combined: 'Yhdistetty',
        radar_tab_swords: 'Miekat',
        radar_tab_bombs: 'Pommit',
        rule_1: 'Vertailuarvo on tarkoitettu yksinomaan <span style="color: #fff;">henkilÃƒÂ¶kohtaiseen kÃƒÂ¤yttÃƒÂ¶ÃƒÂ¶n</span>.',
        rule_2: 'Kaikki luolan viholliset on <span style="color: #fff;">palautettava tÃƒÂ¤yteen terveyteen</span> ennen aloitusta.',
        rule_3: 'Pensaista saatavat <span style="color: #fff;">nopeuslisÃƒÂ¤ykset</span> eivÃƒÂ¤t ole sallittuja.',
        rule_4: 'Pistekynnykset on saavutettava <span style="color: #fff;">ilman apua</span> muilta pelaajilta tai muiden pelaajien aiheuttamaa vahinkoa.',
        rule_5: '<span style="color: #fff;">Miekat</span>-kategoria sallii vain miekkojen kÃƒÂ¤ytÃƒÂ¶n, kun taas <span style="color: #fff;">Pommit</span>-kategoria sallii sekÃƒÂ¤ pommien ettÃƒÂ¤ miekkojen kÃƒÂ¤ytÃƒÂ¶n.',
        download_image: 'Lataa kuva',
        copy_link: 'Kopioi vertailulinkki',
        guidelines_title: 'Ohjeet',
        guidelines_subtitle: 'tarkkaa pisteytystÃƒÂ¤ varten',
        settings_title: 'Asetukset',
        settings_subtitle: 'Mukauta vertailuarvoasi',
        settings_language: 'Kieli',
        settings_language_note: 'Otetaan kÃƒÂ¤yttÃƒÂ¶ÃƒÂ¶n heti.',
        settings_display: 'NÃƒÂ¤yttÃƒÂ¶',
        settings_font_scale: 'Fonttikoko',
        settings_font_family: 'Fontti',
        settings_compact_mode: 'Kompakti tila',
        settings_pacman: 'Pacman',
        settings_font_small: 'Pieni',
        settings_font_normal: 'Normaali',
        settings_font_large: 'Suuri',
        settings_font_default: 'Oletus',
        settings_font_modern: 'Moderni',
        settings_font_classic: 'Klassinen',
        settings_font_mono: 'Mono',
        settings_toggle_on: 'PÃƒÂ¤ÃƒÂ¤llÃƒÂ¤',
        settings_toggle_off: 'Pois',
        settings_theme: 'Teemat',
        settings_theme_note: 'Sijoitusteemat avautuvat, kun nouset sijoituksissa.',
        settings_theme_auto: 'KÃƒÂ¤ytÃƒÂ¤ nykyistÃƒÂ¤ sijoitusteemaasi automaattisesti, kun nouset sijoituksessa',
        settings_custom_name: 'Mukautettu',
        settings_save_name: 'Tallenna',
        settings_remove_custom: 'Poista',
        settings_custom_create: 'Luo',
        settings_custom_locked_note: 'Klikkaa Luo avataksesi mukautetut vÃƒÂ¤rit.',
        settings_custom_select_note: 'Valitse mukautettu teema.',
        settings_custom_theme: 'Mukautetut vÃƒÂ¤rit',
        settings_custom_note: 'Valitse vÃƒÂ¤rit oman teeman luomiseksi.',
        settings_preview: 'Esikatselu',
        settings_preview_title: 'Vertailun esikatselu',
        settings_preview_note: 'PÃƒÂ¤ivittyy, kun muutat vÃƒÂ¤rejÃƒÂ¤.',
        settings_color_target: 'VÃƒÂ¤rikohde',
        settings_color_background: 'Tausta',
        settings_color_accent1: 'Korostus 1',
        settings_color_accent2: 'Korostus 2',
        settings_color_panel: 'Paneelin tausta',
        settings_color_border: 'Paneelin reunus',
        settings_color_text: 'Teksti',
        settings_default_config: 'Konfiguraatio',
        settings_default_config_startup: 'KÃƒÂ¤ynnistyskonfiguraatio',
        settings_visibility_title: 'NÃƒÂ¤kyvyys',
        settings_visibility_note: 'Valitse, kuka voi nÃƒÂ¤hdÃƒÂ¤ vertailusi.',
        settings_visibility_label: 'NÃƒÂ¤kyvyys',
        settings_visibility_everyone: 'Kaikki',
        settings_visibility_friends: 'Vain ystÃƒÂ¤vÃƒÂ¤t/kilta',
        settings_platform: 'Alusta',
        settings_time: 'Aika',
        settings_stat: 'Tilasto',
        settings_save_default: 'Aseta oletus',
        settings_reset_scores: 'Nollaa pistearvot',
        settings_reset_config: 'Konfiguraatio',
        settings_current_config: 'Nykyinen konfiguraatio',
        settings_reset_selected: 'Nollaa valitut',
        settings_reset_all: 'Nollaa kaikki konfiguraatiot',
        settings_reset_note: 'Ei muuta oletuksia.',
        generating_screenshot: 'Luodaan kuvakaappausta...',
        reset_confirm: 'Nollataanko kaikki pistearvot nollaan?',
        reset_all_confirm: 'Nollataanko kaikki tallennetut konfiguraatiot ja pisteet?'
    },
    sv: {
        share: 'Dela',
        settings: 'InstÃƒÂ¤llningar',
        rating: 'Betyg',
        score: 'PoÃƒÂ¤ng',
        progression: 'PoÃƒÂ¤nggrÃƒÂ¤ns',
        cave: 'Grotta',
        edit: 'Redigera',
        edit_hint: 'HÃƒÂ¶gerklicka fÃƒÂ¶r att redigera',
        swords: 'SvÃƒÂ¤rd',
        bombs: 'Bomber',
        radar_title: 'Grottgraf',
        radar_strongest: 'Starkaste grottor',
        radar_weakest: 'Svagaste grottor',
        radar_tab_combined: 'Kombinerad',
        radar_tab_swords: 'SvÃƒÂ¤rd',
        radar_tab_bombs: 'Bomber',
        rule_1: 'Benchmarken ÃƒÂ¤r uteslutande avsedd fÃƒÂ¶r <span style="color: #fff;">personligt bruk</span>.',
        rule_2: 'Alla fiender i grottan mÃƒÂ¥ste <span style="color: #fff;">ÃƒÂ¥terstÃƒÂ¤llas till full hÃƒÂ¤lsa</span> innan start.',
        rule_3: 'Inga <span style="color: #fff;">hastighetsÃƒÂ¶kningar</span> frÃƒÂ¥n buskar ÃƒÂ¤r tillÃƒÂ¥tna.',
        rule_4: 'PoÃƒÂ¤ngtrÃƒÂ¶sklar mÃƒÂ¥ste uppnÃƒÂ¥s <span style="color: #fff;">utan hjÃƒÂ¤lp</span> frÃƒÂ¥n andra spelare eller oavsiktlig skada orsakad av andra spelare.',
        rule_5: 'Kategorin <span style="color: #fff;">SvÃƒÂ¤rd</span> tillÃƒÂ¥ter endast anvÃƒÂ¤ndning av svÃƒÂ¤rd, medan kategorin <span style="color: #fff;">Bomber</span> tillÃƒÂ¥ter anvÃƒÂ¤ndning av bÃƒÂ¥de bomber och svÃƒÂ¤rd.',
        download_image: 'Ladda ner bild',
        copy_link: 'Kopiera benchmarklÃƒÂ¤nk',
        guidelines_title: 'Riktlinjer',
        guidelines_subtitle: 'fÃƒÂ¶r exakt poÃƒÂ¤ngsÃƒÂ¤ttning',
        settings_title: 'InstÃƒÂ¤llningar',
        settings_subtitle: 'Anpassa din benchmark',
        settings_language: 'SprÃƒÂ¥k',
        settings_language_note: 'TillÃƒÂ¤mpas direkt.',
        settings_display: 'Visning',
        settings_font_scale: 'Teckenstorlek',
        settings_font_family: 'Typsnitt',
        settings_compact_mode: 'Kompakt lÃƒÂ¤ge',
        settings_pacman: 'Pacman',
        settings_font_small: 'Liten',
        settings_font_normal: 'Normal',
        settings_font_large: 'Stor',
        settings_font_default: 'Standard',
        settings_font_modern: 'Modern',
        settings_font_classic: 'Klassisk',
        settings_font_mono: 'Mono',
        settings_toggle_on: 'PÃƒÂ¥',
        settings_toggle_off: 'Av',
        settings_theme: 'Teman',
        settings_theme_note: 'Rangteman lÃƒÂ¥ses upp nÃƒÂ¤r du stiger i graderna.',
        settings_theme_auto: 'TillÃƒÂ¤mpa automatiskt ditt nuvarande rangtema nÃƒÂ¤r du stiger i grad',
        settings_custom_name: 'Anpassad',
        settings_save_name: 'Spara',
        settings_remove_custom: 'Ta bort',
        settings_custom_create: 'Skapa',
        settings_custom_locked_note: 'Klicka pÃƒÂ¥ Skapa fÃƒÂ¶r att lÃƒÂ¥sa upp anpassade fÃƒÂ¤rger.',
        settings_custom_select_note: 'VÃƒÂ¤lj ett anpassat tema.',
        settings_custom_theme: 'Anpassade fÃƒÂ¤rger',
        settings_custom_note: 'VÃƒÂ¤lj fÃƒÂ¤rger fÃƒÂ¶r att bygga ditt eget tema.',
        settings_preview: 'FÃƒÂ¶rhandsgranskning',
        settings_preview_title: 'Benchmark fÃƒÂ¶rhandsgranskning',
        settings_preview_note: 'Uppdateras nÃƒÂ¤r du ÃƒÂ¤ndrar fÃƒÂ¤rger.',
        settings_color_target: 'FÃƒÂ¤rgmÃƒÂ¥l',
        settings_color_background: 'Bakgrund',
        settings_color_accent1: 'Accent 1',
        settings_color_accent2: 'Accent 2',
        settings_color_panel: 'Panelbakgrund',
        settings_color_border: 'Panelkant',
        settings_color_text: 'Text',
        settings_default_config: 'Konfiguration',
        settings_default_config_startup: 'Startkonfiguration',
        settings_visibility_title: 'Synlighet',
        settings_visibility_note: 'VÃƒÂ¤lj vem som kan se din benchmark.',
        settings_visibility_label: 'Synlighet',
        settings_visibility_everyone: 'Alla',
        settings_visibility_friends: 'Endast vÃƒÂ¤nner/gille',
        settings_platform: 'Plattform',
        settings_time: 'Tid',
        settings_stat: 'Statistik',
        settings_save_default: 'Ange standard',
        settings_reset_scores: 'Ãƒâ€¦terstÃƒÂ¤ll poÃƒÂ¤ngvÃƒÂ¤rden',
        settings_reset_config: 'Konfiguration',
        settings_current_config: 'Nuvarande konfiguration',
        settings_reset_selected: 'Ãƒâ€¦terstÃƒÂ¤ll valda',
        settings_reset_all: 'Ãƒâ€¦terstÃƒÂ¤ll alla konfigurationer',
        settings_reset_note: 'Ãƒâ€žndrar inte standardvÃƒÂ¤rden.',
        generating_screenshot: 'Genererar skÃƒÂ¤rmdump...',
        reset_confirm: 'Ãƒâ€¦terstÃƒÂ¤lla alla poÃƒÂ¤ngvÃƒÂ¤rden till 0?',
        reset_all_confirm: 'Ãƒâ€¦terstÃƒÂ¤lla alla sparade konfigurationer och poÃƒÂ¤ng?'
    },
    tr: {
        share: 'PaylaÃ…Å¸',
        settings: 'Ayarlar',
        rating: 'Derecelendirme',
        score: 'Puan',
        progression: 'Skor EÃ…Å¸iÃ„Å¸i',
        cave: 'MaÃ„Å¸ara',
        edit: 'DÃƒÂ¼zenle',
        edit_hint: 'DÃƒÂ¼zenlemek iÃƒÂ§in SaÃ„Å¸ TÃ„Â±kla',
        swords: 'KÃ„Â±lÃ„Â±ÃƒÂ§lar',
        bombs: 'Bombalar',
        radar_title: 'MaÃ„Å¸ara GrafiÃ„Å¸i',
        radar_strongest: 'En GÃƒÂ¼ÃƒÂ§lÃƒÂ¼ MaÃ„Å¸aralar',
        radar_weakest: 'En ZayÃ„Â±f MaÃ„Å¸aralar',
        radar_tab_combined: 'BirleÃ…Å¸ik',
        radar_tab_swords: 'KÃ„Â±lÃ„Â±ÃƒÂ§lar',
        radar_tab_bombs: 'Bombalar',
        rule_1: 'KÃ„Â±yaslama yalnÃ„Â±zca <span style="color: #fff;">kiÃ…Å¸isel kullanÃ„Â±m</span> iÃƒÂ§indir.',
        rule_2: 'MaÃ„Å¸aradaki tÃƒÂ¼m dÃƒÂ¼Ã…Å¸manlar baÃ…Å¸lamadan ÃƒÂ¶nce <span style="color: #fff;">tam saÃ„Å¸lÃ„Â±Ã„Å¸a sÃ„Â±fÃ„Â±rlanmalÃ„Â±dÃ„Â±r</span>.',
        rule_3: 'Ãƒâ€¡alÃ„Â±lardan <span style="color: #fff;">hÃ„Â±z artÃ„Â±Ã…Å¸Ã„Â±</span> alÃ„Â±nmasÃ„Â±na izin verilmez.',
        rule_4: 'Puanlama eÃ…Å¸ikleri, diÃ„Å¸er oyunculardan <span style="color: #fff;">hiÃƒÂ§bir yardÃ„Â±m almadan</span> veya diÃ„Å¸er oyuncularÃ„Â±n neden olduÃ„Å¸u kazara hasar olmadan elde edilmelidir.',
        rule_5: '<span style="color: #fff;">KÃ„Â±lÃ„Â±ÃƒÂ§lar</span> kategorisi yalnÃ„Â±zca kÃ„Â±lÃ„Â±ÃƒÂ§ kullanÃ„Â±mÃ„Â±na izin verirken, <span style="color: #fff;">Bombalar</span> kategorisi hem bomba hem de kÃ„Â±lÃ„Â±ÃƒÂ§ kullanÃ„Â±mÃ„Â±na izin verir.',
        download_image: 'Resmi Ã„Â°ndir',
        copy_link: 'KÃ„Â±yaslama BaÃ„Å¸lantÃ„Â±sÃ„Â±nÃ„Â± Kopyala',
        guidelines_title: 'YÃƒÂ¶nergeler',
        guidelines_subtitle: 'doÃ„Å¸ru puanlama iÃƒÂ§in',
        settings_title: 'Ayarlar',
        settings_subtitle: 'KÃ„Â±yaslamanÃ„Â±zÃ„Â± ÃƒÂ¶zelleÃ…Å¸tirin',
        settings_language: 'Dil',
        settings_language_note: 'AnÃ„Â±nda uygulanÃ„Â±r.',
        settings_display: 'GÃƒÂ¶rÃƒÂ¼nÃƒÂ¼m',
        settings_font_scale: 'YazÃ„Â± Boyutu',
        settings_font_family: 'YazÃ„Â± Tipi',
        settings_compact_mode: 'Kompakt Mod',
        settings_pacman: 'Pacman',
        settings_font_small: 'KÃƒÂ¼ÃƒÂ§ÃƒÂ¼k',
        settings_font_normal: 'Normal',
        settings_font_large: 'BÃƒÂ¼yÃƒÂ¼k',
        settings_font_default: 'VarsayÃ„Â±lan',
        settings_font_modern: 'Modern',
        settings_font_classic: 'Klasik',
        settings_font_mono: 'Mono',
        settings_toggle_on: 'AÃƒÂ§Ã„Â±k',
        settings_toggle_off: 'KapalÃ„Â±',
        settings_theme: 'Temalar',
        settings_theme_note: 'RÃƒÂ¼tbe temalarÃ„Â±, rÃƒÂ¼tbe atladÃ„Â±kÃƒÂ§a aÃƒÂ§Ã„Â±lÃ„Â±r.',
        settings_theme_auto: 'RÃƒÂ¼tbe atlarken mevcut rÃƒÂ¼tbe temanÃ„Â±zÃ„Â± otomatik olarak uygulayÃ„Â±n',
        settings_custom_name: 'Ãƒâ€“zel',
        settings_save_name: 'Kaydet',
        settings_remove_custom: 'KaldÃ„Â±r',
        settings_custom_create: 'OluÃ…Å¸tur',
        settings_custom_locked_note: 'Ãƒâ€“zel renklerin kilidini aÃƒÂ§mak iÃƒÂ§in OluÃ…Å¸tur\'a tÃ„Â±klayÃ„Â±n.',
        settings_custom_select_note: 'Ãƒâ€“zel bir tema seÃƒÂ§in.',
        settings_custom_theme: 'Ãƒâ€“zel Renkler',
        settings_custom_note: 'Kendi temanÃ„Â±zÃ„Â± oluÃ…Å¸turmak iÃƒÂ§in renkleri seÃƒÂ§in.',
        settings_preview: 'Ãƒâ€“nizleme',
        settings_preview_title: 'KÃ„Â±yaslama Ãƒâ€“nizlemesi',
        settings_preview_note: 'Renkleri deÃ„Å¸iÃ…Å¸tirdikÃƒÂ§e gÃƒÂ¼ncellenir.',
        settings_color_target: 'Renk Hedefi',
        settings_color_background: 'Arka Plan',
        settings_color_accent1: 'Vurgu 1',
        settings_color_accent2: 'Vurgu 2',
        settings_color_panel: 'Panel Arka PlanÃ„Â±',
        settings_color_border: 'Panel KenarlÃ„Â±Ã„Å¸Ã„Â±',
        settings_color_text: 'Metin',
        settings_default_config: 'YapÃ„Â±landÃ„Â±rma',
        settings_default_config_startup: 'BaÃ…Å¸langÃ„Â±ÃƒÂ§ YapÃ„Â±landÃ„Â±rmasÃ„Â±',
        settings_visibility_title: 'GÃƒÂ¶rÃƒÂ¼nÃƒÂ¼rlÃƒÂ¼k',
        settings_visibility_note: 'KÃ„Â±yaslamanÃ„Â±zÃ„Â± kimlerin gÃƒÂ¶rebileceÃ„Å¸ini seÃƒÂ§in.',
        settings_visibility_label: 'GÃƒÂ¶rÃƒÂ¼nÃƒÂ¼rlÃƒÂ¼k',
        settings_visibility_everyone: 'Herkes',
        settings_visibility_friends: 'Sadece ArkadaÃ…Å¸lar/Lonca',
        settings_platform: 'Platform',
        settings_time: 'Zaman',
        settings_stat: 'Ã„Â°statistik',
        settings_save_default: 'VarsayÃ„Â±lanÃ„Â± Ayarla',
        settings_reset_scores: 'Puan DeÃ„Å¸erlerini SÃ„Â±fÃ„Â±rla',
        settings_reset_config: 'YapÃ„Â±landÃ„Â±rma',
        settings_current_config: 'Mevcut yapÃ„Â±landÃ„Â±rma',
        settings_reset_selected: 'SeÃƒÂ§ileni SÃ„Â±fÃ„Â±rla',
        settings_reset_all: 'TÃƒÂ¼m YapÃ„Â±landÃ„Â±rmalarÃ„Â± SÃ„Â±fÃ„Â±rla',
        settings_reset_note: 'VarsayÃ„Â±lanlarÃ„Â± deÃ„Å¸iÃ…Å¸tirmez.',
        generating_screenshot: 'Ekran gÃƒÂ¶rÃƒÂ¼ntÃƒÂ¼sÃƒÂ¼ oluÃ…Å¸turuluyor...',
        reset_confirm: 'TÃƒÂ¼m puan deÃ„Å¸erleri 0\'a sÃ„Â±fÃ„Â±rlansÃ„Â±n mÃ„Â±?',
        reset_all_confirm: 'TÃƒÂ¼m kayÃ„Â±tlÃ„Â± yapÃ„Â±landÃ„Â±rmalar ve puanlar sÃ„Â±fÃ„Â±rlansÃ„Â±n mÃ„Â±?'
    },
    vi: {
        share: 'Chia sÃ¡ÂºÂ»',
        settings: 'CÃƒÂ i Ã„â€˜Ã¡ÂºÂ·t',
        rating: 'XÃ¡ÂºÂ¿p hÃ¡ÂºÂ¡ng',
        score: 'Ã„ÂiÃ¡Â»Æ’m sÃ¡Â»â€˜',
        progression: 'NgÃ†Â°Ã¡Â»Â¡ng Ã„â€˜iÃ¡Â»Æ’m',
        cave: 'Hang Ã„â€˜Ã¡Â»â„¢ng',
        edit: 'ChÃ¡Â»â€°nh sÃ¡Â»Â­a',
        edit_hint: 'NhÃ¡ÂºÂ¥p chuÃ¡Â»â„¢t phÃ¡ÂºÂ£i Ã„â€˜Ã¡Â»Æ’ chÃ¡Â»â€°nh sÃ¡Â»Â­a',
        swords: 'KiÃ¡ÂºÂ¿m',
        bombs: 'Bom',
        radar_title: 'BiÃ¡Â»Æ’u Ã„â€˜Ã¡Â»â€œ Hang Ã„â€˜Ã¡Â»â„¢ng',
        radar_strongest: 'Hang mÃ¡ÂºÂ¡nh nhÃ¡ÂºÂ¥t',
        radar_weakest: 'Hang yÃ¡ÂºÂ¿u nhÃ¡ÂºÂ¥t',
        radar_tab_combined: 'KÃ¡ÂºÂ¿t hÃ¡Â»Â£p',
        radar_tab_swords: 'KiÃ¡ÂºÂ¿m',
        radar_tab_bombs: 'Bom',
        rule_1: 'Ã„ÂiÃ¡Â»Æ’m chuÃ¡ÂºÂ©n chÃ¡Â»â€° dÃƒÂ nh riÃƒÂªng cho <span style="color: #fff;">sÃ¡Â»Â­ dÃ¡Â»Â¥ng cÃƒÂ¡ nhÃƒÂ¢n</span>.',
        rule_2: 'TÃ¡ÂºÂ¥t cÃ¡ÂºÂ£ kÃ¡ÂºÂ» thÃƒÂ¹ trong hang phÃ¡ÂºÂ£i Ã„â€˜Ã†Â°Ã¡Â»Â£c <span style="color: #fff;">Ã„â€˜Ã¡ÂºÂ·t lÃ¡ÂºÂ¡i Ã„â€˜Ã¡ÂºÂ§y mÃƒÂ¡u</span> trÃ†Â°Ã¡Â»â€ºc khi bÃ¡ÂºÂ¯t Ã„â€˜Ã¡ÂºÂ§u.',
        rule_3: 'KhÃƒÂ´ng Ã„â€˜Ã†Â°Ã¡Â»Â£c phÃƒÂ©p <span style="color: #fff;">tÃ„Æ’ng tÃ¡Â»â€˜c</span> tÃ¡Â»Â« bÃ¡Â»Â¥i rÃ¡ÂºÂ­m.',
        rule_4: 'CÃƒÂ¡c ngÃ†Â°Ã¡Â»Â¡ng Ã„â€˜iÃ¡Â»Æ’m phÃ¡ÂºÂ£i Ã„â€˜Ã¡ÂºÂ¡t Ã„â€˜Ã†Â°Ã¡Â»Â£c <span style="color: #fff;">mÃƒÂ  khÃƒÂ´ng cÃƒÂ³ sÃ¡Â»Â± trÃ¡Â»Â£ giÃƒÂºp</span> tÃ¡Â»Â« ngÃ†Â°Ã¡Â»Âi chÃ†Â¡i khÃƒÂ¡c hoÃ¡ÂºÂ·c sÃƒÂ¡t thÃ†Â°Ã†Â¡ng ngÃ¡ÂºÂ«u nhiÃƒÂªn do ngÃ†Â°Ã¡Â»Âi chÃ†Â¡i khÃƒÂ¡c gÃƒÂ¢y ra.',
        rule_5: 'Danh mÃ¡Â»Â¥c <span style="color: #fff;">KiÃ¡ÂºÂ¿m</span> chÃ¡Â»â€° cho phÃƒÂ©p sÃ¡Â»Â­ dÃ¡Â»Â¥ng kiÃ¡ÂºÂ¿m, trong khi danh mÃ¡Â»Â¥c <span style="color: #fff;">Bom</span> cho phÃƒÂ©p sÃ¡Â»Â­ dÃ¡Â»Â¥ng cÃ¡ÂºÂ£ bom vÃƒÂ  kiÃ¡ÂºÂ¿m.',
        download_image: 'TÃ¡ÂºÂ£i Ã¡ÂºÂ£nh xuÃ¡Â»â€˜ng',
        copy_link: 'Sao chÃƒÂ©p liÃƒÂªn kÃ¡ÂºÂ¿t Ã„â€˜iÃ¡Â»Æ’m chuÃ¡ÂºÂ©n',
        guidelines_title: 'HÃ†Â°Ã¡Â»â€ºng dÃ¡ÂºÂ«n',
        guidelines_subtitle: 'Ã„â€˜Ã¡Â»Æ’ tÃƒÂ­nh Ã„â€˜iÃ¡Â»Æ’m chÃƒÂ­nh xÃƒÂ¡c',
        settings_title: 'CÃƒÂ i Ã„â€˜Ã¡ÂºÂ·t',
        settings_subtitle: 'TÃƒÂ¹y chÃ¡Â»â€°nh Ã„â€˜iÃ¡Â»Æ’m chuÃ¡ÂºÂ©n cÃ¡Â»Â§a bÃ¡ÂºÂ¡n',
        settings_language: 'NgÃƒÂ´n ngÃ¡Â»Â¯',
        settings_language_note: 'ÃƒÂp dÃ¡Â»Â¥ng ngay lÃ¡ÂºÂ­p tÃ¡Â»Â©c.',
        settings_display: 'HiÃ¡Â»Æ’n thÃ¡Â»â€¹',
        settings_font_scale: 'CÃ¡Â»Â¡ chÃ¡Â»Â¯',
        settings_font_family: 'PhÃƒÂ´ng chÃ¡Â»Â¯',
        settings_compact_mode: 'ChÃ¡ÂºÂ¿ Ã„â€˜Ã¡Â»â„¢ gÃ¡Â»Ân',
        settings_pacman: 'Pacman',
        settings_font_small: 'NhÃ¡Â»Â',
        settings_font_normal: 'BÃƒÂ¬nh thÃ†Â°Ã¡Â»Âng',
        settings_font_large: 'LÃ¡Â»â€ºn',
        settings_font_default: 'MÃ¡ÂºÂ·c Ã„â€˜Ã¡Â»â€¹nh',
        settings_font_modern: 'HiÃ¡Â»â€¡n Ã„â€˜Ã¡ÂºÂ¡i',
        settings_font_classic: 'CÃ¡Â»â€¢ Ã„â€˜iÃ¡Â»Æ’n',
        settings_font_mono: 'Ã„ÂÃ†Â¡n cÃƒÂ¡ch',
        settings_toggle_on: 'BÃ¡ÂºÂ­t',
        settings_toggle_off: 'TÃ¡ÂºÂ¯t',
        settings_theme: 'ChÃ¡Â»Â§ Ã„â€˜Ã¡Â»Â',
        settings_theme_note: 'ChÃ¡Â»Â§ Ã„â€˜Ã¡Â»Â xÃ¡ÂºÂ¿p hÃ¡ÂºÂ¡ng mÃ¡Â»Å¸ khÃƒÂ³a khi bÃ¡ÂºÂ¡n thÃ„Æ’ng hÃ¡ÂºÂ¡ng.',
        settings_theme_auto: 'TÃ¡Â»Â± Ã„â€˜Ã¡Â»â„¢ng ÃƒÂ¡p dÃ¡Â»Â¥ng chÃ¡Â»Â§ Ã„â€˜Ã¡Â»Â xÃ¡ÂºÂ¿p hÃ¡ÂºÂ¡ng hiÃ¡Â»â€¡n tÃ¡ÂºÂ¡i cÃ¡Â»Â§a bÃ¡ÂºÂ¡n khi thÃ„Æ’ng hÃ¡ÂºÂ¡ng',
        settings_custom_name: 'TÃƒÂ¹y chÃ¡Â»â€°nh',
        settings_save_name: 'LÃ†Â°u',
        settings_remove_custom: 'XÃƒÂ³a',
        settings_custom_create: 'TÃ¡ÂºÂ¡o',
        settings_custom_locked_note: 'NhÃ¡ÂºÂ¥p vÃƒÂ o TÃ¡ÂºÂ¡o Ã„â€˜Ã¡Â»Æ’ mÃ¡Â»Å¸ khÃƒÂ³a mÃƒÂ u tÃƒÂ¹y chÃ¡Â»â€°nh.',
        settings_custom_select_note: 'ChÃ¡Â»Ân mÃ¡Â»â„¢t chÃ¡Â»Â§ Ã„â€˜Ã¡Â»Â tÃƒÂ¹y chÃ¡Â»â€°nh.',
        settings_custom_theme: 'MÃƒÂ u tÃƒÂ¹y chÃ¡Â»â€°nh',
        settings_custom_note: 'ChÃ¡Â»Ân mÃƒÂ u Ã„â€˜Ã¡Â»Æ’ xÃƒÂ¢y dÃ¡Â»Â±ng chÃ¡Â»Â§ Ã„â€˜Ã¡Â»Â cÃ¡Â»Â§a riÃƒÂªng bÃ¡ÂºÂ¡n.',
        settings_preview: 'Xem trÃ†Â°Ã¡Â»â€ºc',
        settings_preview_title: 'Xem trÃ†Â°Ã¡Â»â€ºc Ã„â€˜iÃ¡Â»Æ’m chuÃ¡ÂºÂ©n',
        settings_preview_note: 'CÃ¡ÂºÂ­p nhÃ¡ÂºÂ­t khi bÃ¡ÂºÂ¡n thay Ã„â€˜Ã¡Â»â€¢i mÃƒÂ u sÃ¡ÂºÂ¯c.',
        settings_color_target: 'MÃ¡Â»Â¥c tiÃƒÂªu mÃƒÂ u',
        settings_color_background: 'NÃ¡Â»Ân',
        settings_color_accent1: 'Ã„ÂiÃ¡Â»Æ’m nhÃ¡ÂºÂ¥n 1',
        settings_color_accent2: 'Ã„ÂiÃ¡Â»Æ’m nhÃ¡ÂºÂ¥n 2',
        settings_color_panel: 'NÃ¡Â»Ân bÃ¡ÂºÂ£ng Ã„â€˜iÃ¡Â»Âu khiÃ¡Â»Æ’n',
        settings_color_border: 'ViÃ¡Â»Ân bÃ¡ÂºÂ£ng Ã„â€˜iÃ¡Â»Âu khiÃ¡Â»Æ’n',
        settings_color_text: 'VÃ„Æ’n bÃ¡ÂºÂ£n',
        settings_default_config: 'CÃ¡ÂºÂ¥u hÃƒÂ¬nh',
        settings_default_config_startup: 'CÃ¡ÂºÂ¥u hÃƒÂ¬nh khÃ¡Â»Å¸i Ã„â€˜Ã¡Â»â„¢ng',
        settings_visibility_title: 'HiÃ¡Â»Æ’n thÃ¡Â»â€¹',
        settings_visibility_note: 'ChÃ¡Â»Ân ai cÃƒÂ³ thÃ¡Â»Æ’ xem Ã„â€˜iÃ¡Â»Æ’m chuÃ¡ÂºÂ©n cÃ¡Â»Â§a bÃ¡ÂºÂ¡n.',
        settings_visibility_label: 'HiÃ¡Â»Æ’n thÃ¡Â»â€¹',
        settings_visibility_everyone: 'MÃ¡Â»Âi ngÃ†Â°Ã¡Â»Âi',
        settings_visibility_friends: 'ChÃ¡Â»â€° BÃ¡ÂºÂ¡n bÃƒÂ¨/Bang hÃ¡Â»â„¢i',
        settings_platform: 'NÃ¡Â»Ân tÃ¡ÂºÂ£ng',
        settings_time: 'ThÃ¡Â»Âi gian',
        settings_stat: 'ChÃ¡Â»â€° sÃ¡Â»â€˜',
        settings_save_default: 'Ã„ÂÃ¡ÂºÂ·t mÃ¡ÂºÂ·c Ã„â€˜Ã¡Â»â€¹nh',
        settings_reset_scores: 'Ã„ÂÃ¡ÂºÂ·t lÃ¡ÂºÂ¡i giÃƒÂ¡ trÃ¡Â»â€¹ Ã„â€˜iÃ¡Â»Æ’m',
        settings_reset_config: 'CÃ¡ÂºÂ¥u hÃƒÂ¬nh',
        settings_current_config: 'CÃ¡ÂºÂ¥u hÃƒÂ¬nh hiÃ¡Â»â€¡n tÃ¡ÂºÂ¡i',
        settings_reset_selected: 'Ã„ÂÃ¡ÂºÂ·t lÃ¡ÂºÂ¡i Ã„â€˜ÃƒÂ£ chÃ¡Â»Ân',
        settings_reset_all: 'Ã„ÂÃ¡ÂºÂ·t lÃ¡ÂºÂ¡i tÃ¡ÂºÂ¥t cÃ¡ÂºÂ£ cÃ¡ÂºÂ¥u hÃƒÂ¬nh',
        settings_reset_note: 'KhÃƒÂ´ng thay Ã„â€˜Ã¡Â»â€¢i mÃ¡ÂºÂ·c Ã„â€˜Ã¡Â»â€¹nh.',
        generating_screenshot: 'Ã„Âang tÃ¡ÂºÂ¡o Ã¡ÂºÂ£nh chÃ¡Â»Â¥p mÃƒÂ n hÃƒÂ¬nh...',
        reset_confirm: 'Ã„ÂÃ¡ÂºÂ·t lÃ¡ÂºÂ¡i tÃ¡ÂºÂ¥t cÃ¡ÂºÂ£ giÃƒÂ¡ trÃ¡Â»â€¹ Ã„â€˜iÃ¡Â»Æ’m vÃ¡Â»Â 0?',
        reset_all_confirm: 'Ã„ÂÃ¡ÂºÂ·t lÃ¡ÂºÂ¡i tÃ¡ÂºÂ¥t cÃ¡ÂºÂ£ cÃ¡ÂºÂ¥u hÃƒÂ¬nh vÃƒÂ  Ã„â€˜iÃ¡Â»Æ’m sÃ¡Â»â€˜ Ã„â€˜ÃƒÂ£ lÃ†Â°u?'
    },
    ja: {
        share: 'Ã¥â€¦Â±Ã¦Å“â€°',
        settings: 'Ã¨Â¨Â­Ã¥Â®Å¡',
        rating: 'Ã¨Â©â€¢Ã¤Â¾Â¡',
        score: 'Ã£â€šÂ¹Ã£â€šÂ³Ã£â€šÂ¢',
        progression: 'Ã£â€šÂ¹Ã£â€šÂ³Ã£â€šÂ¢Ã©â€“Â¾Ã¥â‚¬Â¤',
        cave: 'Ã¦Â´Å¾Ã§ÂªÅ¸',
        edit: 'Ã§Â·Â¨Ã©â€ºâ€ ',
        edit_hint: 'Ã¥ÂÂ³Ã£â€šÂ¯Ã£Æ’ÂªÃ£Æ’Æ’Ã£â€šÂ¯Ã£ÂÂ§Ã§Â·Â¨Ã©â€ºâ€ ',
        swords: 'Ã¥â€°Â£',
        bombs: 'Ã§Ë†â€ Ã¥Â¼Â¾',
        radar_title: 'Ã¦Â´Å¾Ã§ÂªÅ¸Ã£â€šÂ°Ã£Æ’Â©Ã£Æ’â€¢',
        radar_strongest: 'Ã¦Å“â‚¬Ã¥Â¼Â·Ã£ÂÂ®Ã¦Â´Å¾Ã§ÂªÅ¸',
        radar_weakest: 'Ã¦Å“â‚¬Ã¥Â¼Â±Ã£ÂÂ®Ã¦Â´Å¾Ã§ÂªÅ¸',
        radar_tab_combined: 'Ã§Â·ÂÃ¥ÂË†',
        radar_tab_swords: 'Ã¥â€°Â£',
        radar_tab_bombs: 'Ã§Ë†â€ Ã¥Â¼Â¾',
        rule_1: 'Ã£Æ’â„¢Ã£Æ’Â³Ã£Æ’ÂÃ£Æ’Å¾Ã£Æ’Â¼Ã£â€šÂ¯Ã£ÂÂ¯<span style="color: #fff;">Ã¥â‚¬â€¹Ã¤ÂºÂºÃ§Å¡â€žÃ£ÂÂªÃ¤Â½Â¿Ã§â€Â¨</span>Ã£ÂÂ®Ã£ÂÂ¿Ã£â€šâ€™Ã§â€ºÂ®Ã§Å¡â€žÃ£ÂÂ¨Ã£Ââ€”Ã£ÂÂ¦Ã£Ââ€žÃ£ÂÂ¾Ã£Ââ„¢Ã£â‚¬â€š',
        rule_2: 'Ã©â€“â€¹Ã¥Â§â€¹Ã¥â€°ÂÃ£ÂÂ«Ã¦Â´Å¾Ã§ÂªÅ¸Ã¥â€ â€¦Ã£ÂÂ®Ã£Ââ„¢Ã£ÂÂ¹Ã£ÂÂ¦Ã£ÂÂ®Ã¦â€¢ÂµÃ£â€šâ€™<span style="color: #fff;">Ã¥Â®Å’Ã¥â€¦Â¨Ã£ÂÂªÃ¤Â½â€œÃ¥Å â€ºÃ£ÂÂ«Ã£Æ’ÂªÃ£â€šÂ»Ã£Æ’Æ’Ã£Æ’Ë†</span>Ã£Ââ„¢Ã£â€šâ€¹Ã¥Â¿â€¦Ã¨Â¦ÂÃ£ÂÅ’Ã£Ââ€šÃ£â€šÅ Ã£ÂÂ¾Ã£Ââ„¢Ã£â‚¬â€š',
        rule_3: 'Ã¨Å’â€šÃ£ÂÂ¿Ã£Ââ€¹Ã£â€šâ€°Ã£ÂÂ®<span style="color: #fff;">Ã£â€šÂ¹Ã£Æ’â€Ã£Æ’Â¼Ã£Æ’â€°Ã£Æ’â€“Ã£Æ’Â¼Ã£â€šÂ¹Ã£Æ’Ë†</span>Ã£ÂÂ¯Ã¨Â¨Â±Ã¥ÂÂ¯Ã£Ââ€¢Ã£â€šÅ’Ã£ÂÂ¦Ã£Ââ€žÃ£ÂÂ¾Ã£Ââ€ºÃ£â€šâ€œÃ£â‚¬â€š',
        rule_4: 'Ã£â€šÂ¹Ã£â€šÂ³Ã£â€šÂ¢Ã£ÂÂ®Ã£Ââ€”Ã£ÂÂÃ£Ââ€žÃ¥â‚¬Â¤Ã£ÂÂ¯Ã£â‚¬ÂÃ¤Â»â€“Ã£ÂÂ®Ã£Æ’â€”Ã£Æ’Â¬Ã£â€šÂ¤Ã£Æ’Â¤Ã£Æ’Â¼Ã£Ââ€¹Ã£â€šâ€°Ã£ÂÂ®<span style="color: #fff;">Ã¦â€Â¯Ã¦ÂÂ´Ã£ÂÂªÃ£Ââ€”</span>Ã£â‚¬ÂÃ£ÂÂ¾Ã£ÂÅ¸Ã£ÂÂ¯Ã¤Â»â€“Ã£ÂÂ®Ã£Æ’â€”Ã£Æ’Â¬Ã£â€šÂ¤Ã£Æ’Â¤Ã£Æ’Â¼Ã£ÂÂ«Ã£â€šË†Ã£â€šâ€¹Ã¥ÂÂ¶Ã§â„¢ÂºÃ§Å¡â€žÃ£ÂÂªÃ£Æ’â‚¬Ã£Æ’Â¡Ã£Æ’Â¼Ã£â€šÂ¸Ã£ÂÂªÃ£Ââ€”Ã£ÂÂ§Ã©Ââ€Ã¦Ë†ÂÃ£Ââ„¢Ã£â€šâ€¹Ã¥Â¿â€¦Ã¨Â¦ÂÃ£ÂÅ’Ã£Ââ€šÃ£â€šÅ Ã£ÂÂ¾Ã£Ââ„¢Ã£â‚¬â€š',
        rule_5: '<span style="color: #fff;">Ã¥â€°Â£</span>Ã£â€šÂ«Ã£Æ’â€ Ã£â€šÂ´Ã£Æ’ÂªÃ£ÂÂ§Ã£ÂÂ¯Ã¥â€°Â£Ã£ÂÂ®Ã£ÂÂ¿Ã£ÂÂ®Ã¤Â½Â¿Ã§â€Â¨Ã£ÂÅ’Ã¨Â¨Â±Ã¥ÂÂ¯Ã£Ââ€¢Ã£â€šÅ’Ã£â‚¬Â<span style="color: #fff;">Ã§Ë†â€ Ã¥Â¼Â¾</span>Ã£â€šÂ«Ã£Æ’â€ Ã£â€šÂ´Ã£Æ’ÂªÃ£ÂÂ§Ã£ÂÂ¯Ã§Ë†â€ Ã¥Â¼Â¾Ã£ÂÂ¨Ã¥â€°Â£Ã£ÂÂ®Ã¤Â¸Â¡Ã¦â€“Â¹Ã£ÂÂ®Ã¤Â½Â¿Ã§â€Â¨Ã£ÂÅ’Ã¨Â¨Â±Ã¥ÂÂ¯Ã£Ââ€¢Ã£â€šÅ’Ã£ÂÂ¾Ã£Ââ„¢Ã£â‚¬â€š',
        download_image: 'Ã§â€Â»Ã¥Æ’ÂÃ£â€šâ€™Ã£Æ’â‚¬Ã£â€šÂ¦Ã£Æ’Â³Ã£Æ’Â­Ã£Æ’Â¼Ã£Æ’â€°',
        copy_link: 'Ã£Æ’â„¢Ã£Æ’Â³Ã£Æ’ÂÃ£Æ’Å¾Ã£Æ’Â¼Ã£â€šÂ¯Ã£Æ’ÂªÃ£Æ’Â³Ã£â€šÂ¯Ã£â€šâ€™Ã£â€šÂ³Ã£Æ’â€Ã£Æ’Â¼',
        guidelines_title: 'Ã£â€šÂ¬Ã£â€šÂ¤Ã£Æ’â€°Ã£Æ’Â©Ã£â€šÂ¤Ã£Æ’Â³',
        guidelines_subtitle: 'Ã¦Â­Â£Ã§Â¢ÂºÃ£ÂÂªÃ£â€šÂ¹Ã£â€šÂ³Ã£â€šÂ¢Ã£Æ’ÂªÃ£Æ’Â³Ã£â€šÂ°Ã£ÂÂ®Ã£ÂÅ¸Ã£â€šÂÃ£ÂÂ«',
        settings_title: 'Ã¨Â¨Â­Ã¥Â®Å¡',
        settings_subtitle: 'Ã£Æ’â„¢Ã£Æ’Â³Ã£Æ’ÂÃ£Æ’Å¾Ã£Æ’Â¼Ã£â€šÂ¯Ã£â€šâ€™Ã£â€šÂ«Ã£â€šÂ¹Ã£â€šÂ¿Ã£Æ’Å¾Ã£â€šÂ¤Ã£â€šÂº',
        settings_language: 'Ã¨Â¨â‚¬Ã¨ÂªÅ¾',
        settings_language_note: 'Ã¥ÂÂ³Ã¥ÂºÂ§Ã£ÂÂ«Ã©ÂÂ©Ã§â€Â¨Ã£Ââ€¢Ã£â€šÅ’Ã£ÂÂ¾Ã£Ââ„¢Ã£â‚¬â€š',
        settings_display: 'Ã¨Â¡Â¨Ã§Â¤Âº',
        settings_font_scale: 'Ã£Æ’â€¢Ã£â€šÂ©Ã£Æ’Â³Ã£Æ’Ë†Ã£â€šÂµÃ£â€šÂ¤Ã£â€šÂº',
        settings_font_family: 'Ã£Æ’â€¢Ã£â€šÂ©Ã£Æ’Â³Ã£Æ’Ë†',
        settings_compact_mode: 'Ã£â€šÂ³Ã£Æ’Â³Ã£Æ’â€˜Ã£â€šÂ¯Ã£Æ’Ë†Ã£Æ’Â¢Ã£Æ’Â¼Ã£Æ’â€°',
        settings_pacman: '?????',
        settings_font_small: 'Ã¥Â°Â',
        settings_font_normal: 'Ã¦Â¨â„¢Ã¦Âºâ€“',
        settings_font_large: 'Ã¥Â¤Â§',
        settings_font_default: 'Ã£Æ’â€¡Ã£Æ’â€¢Ã£â€šÂ©Ã£Æ’Â«Ã£Æ’Ë†',
        settings_font_modern: 'Ã£Æ’Â¢Ã£Æ’â‚¬Ã£Æ’Â³',
        settings_font_classic: 'Ã£â€šÂ¯Ã£Æ’Â©Ã£â€šÂ·Ã£Æ’Æ’Ã£â€šÂ¯',
        settings_font_mono: 'Ã§Â­â€°Ã¥Â¹â€¦',
        settings_toggle_on: 'Ã£â€šÂªÃ£Æ’Â³',
        settings_toggle_off: 'Ã£â€šÂªÃ£Æ’â€¢',
        settings_theme: 'Ã£Æ’â€ Ã£Æ’Â¼Ã£Æ’Å¾',
        settings_theme_note: 'Ã£Æ’Â©Ã£Æ’Â³Ã£â€šÂ¯Ã£Æ’â€ Ã£Æ’Â¼Ã£Æ’Å¾Ã£ÂÂ¯Ã£Æ’Â©Ã£Æ’Â³Ã£â€šÂ¯Ã£ÂÅ’Ã¤Â¸Å Ã£ÂÅ’Ã£â€šâ€¹Ã£ÂÂ¨Ã£Æ’Â­Ã£Æ’Æ’Ã£â€šÂ¯Ã¨Â§Â£Ã©â„¢Â¤Ã£Ââ€¢Ã£â€šÅ’Ã£ÂÂ¾Ã£Ââ„¢Ã£â‚¬â€š',
        settings_theme_auto: 'Ã£Æ’Â©Ã£Æ’Â³Ã£â€šÂ¯Ã£â€šÂ¢Ã£Æ’Æ’Ã£Æ’â€”Ã¦â„¢â€šÃ£ÂÂ«Ã§ÂÂ¾Ã¥Å“Â¨Ã£ÂÂ®Ã£Æ’Â©Ã£Æ’Â³Ã£â€šÂ¯Ã£Æ’â€ Ã£Æ’Â¼Ã£Æ’Å¾Ã£â€šâ€™Ã¨â€¡ÂªÃ¥â€¹â€¢Ã§Å¡â€žÃ£ÂÂ«Ã©ÂÂ©Ã§â€Â¨Ã£Ââ„¢Ã£â€šâ€¹',
        settings_custom_name: 'Ã£â€šÂ«Ã£â€šÂ¹Ã£â€šÂ¿Ã£Æ’Â ',
        settings_save_name: 'Ã¤Â¿ÂÃ¥Â­Ëœ',
        settings_remove_custom: 'Ã¥â€°Å Ã©â„¢Â¤',
        settings_custom_create: 'Ã¤Â½Å“Ã¦Ë†Â',
        settings_custom_locked_note: 'Ã¤Â½Å“Ã¦Ë†ÂÃ£â€šâ€™Ã£â€šÂ¯Ã£Æ’ÂªÃ£Æ’Æ’Ã£â€šÂ¯Ã£Ââ€”Ã£ÂÂ¦Ã£â€šÂ«Ã£â€šÂ¹Ã£â€šÂ¿Ã£Æ’Â Ã£â€šÂ«Ã£Æ’Â©Ã£Æ’Â¼Ã£ÂÂ®Ã£Æ’Â­Ã£Æ’Æ’Ã£â€šÂ¯Ã£â€šâ€™Ã¨Â§Â£Ã©â„¢Â¤Ã£Ââ€”Ã£ÂÂ¾Ã£Ââ„¢Ã£â‚¬â€š',
        settings_custom_select_note: 'Ã£â€šÂ«Ã£â€šÂ¹Ã£â€šÂ¿Ã£Æ’Â Ã£Æ’â€ Ã£Æ’Â¼Ã£Æ’Å¾Ã£â€šâ€™Ã©ÂÂ¸Ã¦Å Å¾Ã£Ââ€”Ã£ÂÂ¾Ã£Ââ„¢Ã£â‚¬â€š',
        settings_custom_theme: 'Ã£â€šÂ«Ã£â€šÂ¹Ã£â€šÂ¿Ã£Æ’Â Ã£â€šÂ«Ã£Æ’Â©Ã£Æ’Â¼',
        settings_custom_note: 'Ã¨â€°Â²Ã£â€šâ€™Ã©ÂÂ¸Ã¦Å Å¾Ã£Ââ€”Ã£ÂÂ¦Ã§â€¹Â¬Ã¨â€¡ÂªÃ£ÂÂ®Ã£Æ’â€ Ã£Æ’Â¼Ã£Æ’Å¾Ã£â€šâ€™Ã¤Â½Å“Ã¦Ë†ÂÃ£Ââ€”Ã£ÂÂ¾Ã£Ââ„¢Ã£â‚¬â€š',
        settings_preview: 'Ã£Æ’â€”Ã£Æ’Â¬Ã£Æ’â€œÃ£Æ’Â¥Ã£Æ’Â¼',
        settings_preview_title: 'Ã£Æ’â„¢Ã£Æ’Â³Ã£Æ’ÂÃ£Æ’Å¾Ã£Æ’Â¼Ã£â€šÂ¯Ã£Æ’â€”Ã£Æ’Â¬Ã£Æ’â€œÃ£Æ’Â¥Ã£Æ’Â¼',
        settings_preview_note: 'Ã¨â€°Â²Ã£â€šâ€™Ã¥Â¤â€°Ã¦â€ºÂ´Ã£Ââ„¢Ã£â€šâ€¹Ã£ÂÂ¨Ã¦â€ºÂ´Ã¦â€“Â°Ã£Ââ€¢Ã£â€šÅ’Ã£ÂÂ¾Ã£Ââ„¢Ã£â‚¬â€š',
        settings_color_target: 'Ã£â€šÂ«Ã£Æ’Â©Ã£Æ’Â¼Ã£â€šÂ¿Ã£Æ’Â¼Ã£â€šÂ²Ã£Æ’Æ’Ã£Æ’Ë†',
        settings_color_background: 'Ã¨Æ’Å’Ã¦â„¢Â¯',
        settings_color_accent1: 'Ã£â€šÂ¢Ã£â€šÂ¯Ã£â€šÂ»Ã£Æ’Â³Ã£Æ’Ë† 1',
        settings_color_accent2: 'Ã£â€šÂ¢Ã£â€šÂ¯Ã£â€šÂ»Ã£Æ’Â³Ã£Æ’Ë† 2',
        settings_color_panel: 'Ã£Æ’â€˜Ã£Æ’ÂÃ£Æ’Â«Ã¨Æ’Å’Ã¦â„¢Â¯',
        settings_color_border: 'Ã£Æ’â€˜Ã£Æ’ÂÃ£Æ’Â«Ã¦Å¾Â ',
        settings_color_text: 'Ã£Æ’â€ Ã£â€šÂ­Ã£â€šÂ¹Ã£Æ’Ë†',
        settings_default_config: 'Ã¦Â§â€¹Ã¦Ë†Â',
        settings_default_config_startup: 'Ã¨ÂµÂ·Ã¥â€¹â€¢Ã¦â„¢â€šÃ£ÂÂ®Ã¦Â§â€¹Ã¦Ë†Â',
        settings_visibility_title: 'Ã¥â€¦Â¬Ã©â€“â€¹Ã¨Â¨Â­Ã¥Â®Å¡',
        settings_visibility_note: 'Ã£Æ’â„¢Ã£Æ’Â³Ã£Æ’ÂÃ£Æ’Å¾Ã£Æ’Â¼Ã£â€šÂ¯Ã£â€šâ€™Ã¨Â¡Â¨Ã§Â¤ÂºÃ£ÂÂ§Ã£ÂÂÃ£â€šâ€¹Ã£Æ’Â¦Ã£Æ’Â¼Ã£â€šÂ¶Ã£Æ’Â¼Ã£â€šâ€™Ã©ÂÂ¸Ã¦Å Å¾Ã£Ââ€”Ã£ÂÂ¾Ã£Ââ„¢Ã£â‚¬â€š',
        settings_visibility_label: 'Ã¥â€¦Â¬Ã©â€“â€¹Ã¨Â¨Â­Ã¥Â®Å¡',
        settings_visibility_everyone: 'Ã¥â€¦Â¨Ã¥â€œÂ¡',
        settings_visibility_friends: 'Ã¥Ââ€¹Ã©Ââ€/Ã£â€šÂ®Ã£Æ’Â«Ã£Æ’â€°Ã£ÂÂ®Ã£ÂÂ¿',
        settings_platform: 'Ã£Æ’â€”Ã£Æ’Â©Ã£Æ’Æ’Ã£Æ’Ë†Ã£Æ’â€¢Ã£â€šÂ©Ã£Æ’Â¼Ã£Æ’Â ',
        settings_time: 'Ã¦â„¢â€šÃ©â€“â€œ',
        settings_stat: 'Ã§ÂµÂ±Ã¨Â¨Ë†',
        settings_save_default: 'Ã£Æ’â€¡Ã£Æ’â€¢Ã£â€šÂ©Ã£Æ’Â«Ã£Æ’Ë†Ã£ÂÂ«Ã¨Â¨Â­Ã¥Â®Å¡',
        settings_reset_scores: 'Ã£â€šÂ¹Ã£â€šÂ³Ã£â€šÂ¢Ã¥â‚¬Â¤Ã£â€šâ€™Ã£Æ’ÂªÃ£â€šÂ»Ã£Æ’Æ’Ã£Æ’Ë†',
        settings_reset_config: 'Ã¦Â§â€¹Ã¦Ë†Â',
        settings_current_config: 'Ã§ÂÂ¾Ã¥Å“Â¨Ã£ÂÂ®Ã¦Â§â€¹Ã¦Ë†Â',
        settings_reset_selected: 'Ã©ÂÂ¸Ã¦Å Å¾Ã£Ââ€”Ã£ÂÅ¸Ã£â€šâ€šÃ£ÂÂ®Ã£â€šâ€™Ã£Æ’ÂªÃ£â€šÂ»Ã£Æ’Æ’Ã£Æ’Ë†',
        settings_reset_all: 'Ã£Ââ„¢Ã£ÂÂ¹Ã£ÂÂ¦Ã£ÂÂ®Ã¦Â§â€¹Ã¦Ë†ÂÃ£â€šâ€™Ã£Æ’ÂªÃ£â€šÂ»Ã£Æ’Æ’Ã£Æ’Ë†',
        settings_reset_note: 'Ã£Æ’â€¡Ã£Æ’â€¢Ã£â€šÂ©Ã£Æ’Â«Ã£Æ’Ë†Ã£ÂÂ¯Ã¥Â¤â€°Ã¦â€ºÂ´Ã£Ââ€¢Ã£â€šÅ’Ã£ÂÂ¾Ã£Ââ€ºÃ£â€šâ€œÃ£â‚¬â€š',
        generating_screenshot: 'Ã£â€šÂ¹Ã£â€šÂ¯Ã£Æ’ÂªÃ£Æ’Â¼Ã£Æ’Â³Ã£â€šÂ·Ã£Æ’Â§Ã£Æ’Æ’Ã£Æ’Ë†Ã£â€šâ€™Ã§â€Å¸Ã¦Ë†ÂÃ¤Â¸Â­...',
        reset_confirm: 'Ã£Ââ„¢Ã£ÂÂ¹Ã£ÂÂ¦Ã£ÂÂ®Ã£â€šÂ¹Ã£â€šÂ³Ã£â€šÂ¢Ã¥â‚¬Â¤Ã£â€šâ€™0Ã£ÂÂ«Ã£Æ’ÂªÃ£â€šÂ»Ã£Æ’Æ’Ã£Æ’Ë†Ã£Ââ€”Ã£ÂÂ¾Ã£Ââ„¢Ã£Ââ€¹Ã¯Â¼Å¸',
        reset_all_confirm: 'Ã¤Â¿ÂÃ¥Â­ËœÃ£Ââ€¢Ã£â€šÅ’Ã£ÂÅ¸Ã£Ââ„¢Ã£ÂÂ¹Ã£ÂÂ¦Ã£ÂÂ®Ã¦Â§â€¹Ã¦Ë†ÂÃ£ÂÂ¨Ã£â€šÂ¹Ã£â€šÂ³Ã£â€šÂ¢Ã£â€šâ€™Ã£Æ’ÂªÃ£â€šÂ»Ã£Æ’Æ’Ã£Æ’Ë†Ã£Ââ€”Ã£ÂÂ¾Ã£Ââ„¢Ã£Ââ€¹Ã¯Â¼Å¸'
    },
    ko: {
        share: 'ÃªÂ³ÂµÃ¬Å“Â ',
        settings: 'Ã¬â€žÂ¤Ã¬Â â€¢',
        rating: 'Ã«â€œÂ±ÃªÂ¸â€°',
        score: 'Ã¬Â ÂÃ¬Ë†Ëœ',
        progression: 'Ã¬Â ÂÃ¬Ë†Ëœ Ã¬Å¾â€žÃªÂ³â€žÃªÂ°â€™',
        cave: 'Ã«Ââ„¢ÃªÂµÂ´',
        edit: 'Ã­Å½Â¸Ã¬Â§â€˜',
        edit_hint: 'Ã¬Å¡Â°Ã­ÂÂ´Ã«Â¦Â­Ã­â€¢ËœÃ¬â€”Â¬ Ã­Å½Â¸Ã¬Â§â€˜',
        swords: 'ÃªÂ²â‚¬',
        bombs: 'Ã­ÂÂ­Ã­Æ’â€ž',
        radar_title: 'Ã«Ââ„¢ÃªÂµÂ´ ÃªÂ·Â¸Ã«Å¾ËœÃ­â€â€ž',
        radar_strongest: 'ÃªÂ°â‚¬Ã¬Å¾Â¥ ÃªÂ°â€¢Ã­â€¢Å“ Ã«Ââ„¢ÃªÂµÂ´',
        radar_weakest: 'ÃªÂ°â‚¬Ã¬Å¾Â¥ Ã¬â€¢Â½Ã­â€¢Å“ Ã«Ââ„¢ÃªÂµÂ´',
        radar_tab_combined: 'Ã­â€ ÂµÃ­â€¢Â©',
        radar_tab_swords: 'ÃªÂ²â‚¬',
        radar_tab_bombs: 'Ã­ÂÂ­Ã­Æ’â€ž',
        rule_1: 'Ã«Â²Â¤Ã¬Â¹ËœÃ«Â§Ë†Ã­ÂÂ¬Ã«Å â€ <span style="color: #fff;">ÃªÂ°Å“Ã¬ÂÂ¸Ã¬Â ÂÃ¬ÂÂ¸ Ã¬Å¡Â©Ã«Ââ€ž</span>Ã«Â¡Å“Ã«Â§Å’ Ã¬â€šÂ¬Ã¬Å¡Â©Ã«ÂÂ©Ã«â€¹Ë†Ã«â€¹Â¤.',
        rule_2: 'Ã¬â€¹Å“Ã¬Å¾â€˜Ã­â€¢ËœÃªÂ¸Â° Ã¬Â â€žÃ¬â€”Â Ã«Ââ„¢ÃªÂµÂ´Ã¬ÂËœ Ã«ÂªÂ¨Ã«â€œÂ  Ã¬Â ÂÃ¬Ââ€ž <span style="color: #fff;">Ã¬â„¢â€žÃ¬Â â€žÃ­â€¢Å“ Ã¬Â²Â´Ã«Â Â¥Ã¬Å“Â¼Ã«Â¡Å“ Ã¬Â´Ë†ÃªÂ¸Â°Ã­â„¢â€</span>Ã­â€¢Â´Ã¬â€¢Â¼ Ã­â€¢Â©Ã«â€¹Ë†Ã«â€¹Â¤.',
        rule_3: 'Ã«ÂÂ¤Ã«Â¶Ë†Ã¬â€”ÂÃ¬â€žÅ“Ã¬ÂËœ <span style="color: #fff;">Ã¬â€ ÂÃ«Ââ€ž Ã«Â¶â‚¬Ã¬Å Â¤Ã­Å Â¸</span>Ã«Å â€ Ã­â€”Ë†Ã¬Å¡Â©Ã«ÂËœÃ¬Â§â‚¬ Ã¬â€¢Å Ã¬Å ÂµÃ«â€¹Ë†Ã«â€¹Â¤.',
        rule_4: 'Ã¬Â ÂÃ¬Ë†Ëœ Ã¬Å¾â€žÃªÂ³â€žÃªÂ°â€™Ã¬Ââ‚¬ Ã«â€¹Â¤Ã«Â¥Â¸ Ã­â€Å’Ã«Â Ë†Ã¬ÂÂ´Ã¬â€“Â´Ã¬ÂËœ <span style="color: #fff;">Ã«Ââ€žÃ¬â€ºâ‚¬ Ã¬â€”â€ Ã¬ÂÂ´</span> Ã«ËœÂÃ«Å â€ Ã«â€¹Â¤Ã«Â¥Â¸ Ã­â€Å’Ã«Â Ë†Ã¬ÂÂ´Ã¬â€“Â´Ã«Â¡Å“ Ã¬ÂÂ¸Ã­â€¢Å“ Ã¬Å¡Â°Ã«Â°Å“Ã¬Â ÂÃ¬ÂÂ¸ Ã­â€Â¼Ã­â€¢Â´ Ã¬â€”â€ Ã¬ÂÂ´ Ã«â€¹Â¬Ã¬â€žÂ±Ã­â€¢Â´Ã¬â€¢Â¼ Ã­â€¢Â©Ã«â€¹Ë†Ã«â€¹Â¤.',
        rule_5: '<span style="color: #fff;">ÃªÂ²â‚¬</span> Ã¬Â¹Â´Ã­â€¦Å’ÃªÂ³Â Ã«Â¦Â¬Ã«Å â€ ÃªÂ²â‚¬Ã«Â§Å’ Ã¬â€šÂ¬Ã¬Å¡Â©Ã­â€¢Â  Ã¬Ë†Ëœ Ã¬Å¾Ë†Ã¬Å“Â¼Ã«Â©Â°, <span style="color: #fff;">Ã­ÂÂ­Ã­Æ’â€ž</span> Ã¬Â¹Â´Ã­â€¦Å’ÃªÂ³Â Ã«Â¦Â¬Ã«Å â€ Ã­ÂÂ­Ã­Æ’â€žÃªÂ³Â¼ ÃªÂ²â‚¬Ã¬Ââ€ž Ã«ÂªÂ¨Ã«â€˜Â Ã¬â€šÂ¬Ã¬Å¡Â©Ã­â€¢Â  Ã¬Ë†Ëœ Ã¬Å¾Ë†Ã¬Å ÂµÃ«â€¹Ë†Ã«â€¹Â¤.',
        download_image: 'Ã¬ÂÂ´Ã«Â¯Â¸Ã¬Â§â‚¬ Ã«â€¹Â¤Ã¬Å¡Â´Ã«Â¡Å“Ã«â€œÅ“',
        copy_link: 'Ã«Â²Â¤Ã¬Â¹ËœÃ«Â§Ë†Ã­ÂÂ¬ Ã«Â§ÂÃ­ÂÂ¬ Ã«Â³ÂµÃ¬â€šÂ¬',
        guidelines_title: 'Ã¬Â§â‚¬Ã¬Â¹Â¨',
        guidelines_subtitle: 'Ã¬Â â€¢Ã­â„¢â€¢Ã­â€¢Å“ Ã¬Â ÂÃ¬Ë†Ëœ Ã¬â€šÂ°Ã¬Â â€¢Ã¬Ââ€ž Ã¬Å“â€žÃ­â€¢Â´',
        settings_title: 'Ã¬â€žÂ¤Ã¬Â â€¢',
        settings_subtitle: 'Ã«Â²Â¤Ã¬Â¹ËœÃ«Â§Ë†Ã­ÂÂ¬ Ã¬â€šÂ¬Ã¬Å¡Â©Ã¬Å¾Â Ã¬Â â€¢Ã¬ÂËœ',
        settings_language: 'Ã¬â€“Â¸Ã¬â€“Â´',
        settings_language_note: 'Ã¬Â¦â€°Ã¬â€¹Å“ Ã¬Â ÂÃ¬Å¡Â©Ã«ÂÂ©Ã«â€¹Ë†Ã«â€¹Â¤.',
        settings_display: 'Ã«â€â€Ã¬Å Â¤Ã­â€Å’Ã«Â Ë†Ã¬ÂÂ´',
        settings_font_scale: 'ÃªÂ¸â‚¬ÃªÂ¼Â´ Ã­ÂÂ¬ÃªÂ¸Â°',
        settings_font_family: 'ÃªÂ¸â‚¬ÃªÂ¼Â´',
        settings_compact_mode: 'Ã¬Â»Â´Ã­Å’Â©Ã­Å Â¸ Ã«ÂªÂ¨Ã«â€œÅ“',
        settings_pacman: '??',
        settings_font_small: 'Ã¬Å¾â€˜ÃªÂ²Å’',
        settings_font_normal: 'Ã«Â³Â´Ã­â€ Âµ',
        settings_font_large: 'Ã­ÂÂ¬ÃªÂ²Å’',
        settings_font_default: 'ÃªÂ¸Â°Ã«Â³Â¸ÃªÂ°â€™',
        settings_font_modern: 'Ã«ÂªÂ¨Ã«ÂËœ',
        settings_font_classic: 'Ã­ÂÂ´Ã«Å¾ËœÃ¬â€¹Â',
        settings_font_mono: 'ÃªÂ³Â Ã¬Â â€¢Ã­ÂÂ­',
        settings_toggle_on: 'Ã¬Â¼Å“ÃªÂ¸Â°',
        settings_toggle_off: 'Ã«Ââ€žÃªÂ¸Â°',
        settings_theme: 'Ã­â€¦Å’Ã«Â§Ë†',
        settings_theme_note: 'Ã«Å¾Â­Ã­ÂÂ¬ÃªÂ°â‚¬ Ã¬ËœÂ¬Ã«ÂÂ¼ÃªÂ°â‚¬Ã«Â©Â´ Ã«Å¾Â­Ã­ÂÂ¬ Ã­â€¦Å’Ã«Â§Ë†ÃªÂ°â‚¬ Ã¬Å¾Â ÃªÂ¸Ë† Ã­â€¢Â´Ã¬Â Å“Ã«ÂÂ©Ã«â€¹Ë†Ã«â€¹Â¤.',
        settings_theme_auto: 'Ã«Å¾Â­Ã­ÂÂ¬ Ã¬â€”â€¦ Ã¬â€¹Å“ Ã­Ëœâ€žÃ¬Å¾Â¬ Ã«Å¾Â­Ã­ÂÂ¬ Ã­â€¦Å’Ã«Â§Ë† Ã¬Å¾ÂÃ«Ââ„¢ Ã¬Â ÂÃ¬Å¡Â©',
        settings_custom_name: 'Ã¬â€šÂ¬Ã¬Å¡Â©Ã¬Å¾Â Ã¬Â â€¢Ã¬ÂËœ',
        settings_save_name: 'Ã¬Â â‚¬Ã¬Å¾Â¥',
        settings_remove_custom: 'Ã¬Â Å“ÃªÂ±Â°',
        settings_custom_create: 'Ã«Â§Å’Ã«â€œÂ¤ÃªÂ¸Â°',
        settings_custom_locked_note: 'Ã«Â§Å’Ã«â€œÂ¤ÃªÂ¸Â°Ã«Â¥Â¼ Ã­ÂÂ´Ã«Â¦Â­Ã­â€¢ËœÃ¬â€”Â¬ Ã¬â€šÂ¬Ã¬Å¡Â©Ã¬Å¾Â Ã¬Â â€¢Ã¬ÂËœ Ã¬Æ’â€°Ã¬Æ’ÂÃ¬Ââ€ž Ã¬Å¾Â ÃªÂ¸Ë† Ã­â€¢Â´Ã¬Â Å“Ã­â€¢ËœÃ¬â€žÂ¸Ã¬Å¡â€.',
        settings_custom_select_note: 'Ã¬â€šÂ¬Ã¬Å¡Â©Ã¬Å¾Â Ã¬Â â€¢Ã¬ÂËœ Ã­â€¦Å’Ã«Â§Ë†Ã«Â¥Â¼ Ã¬â€žÂ Ã­Æ’ÂÃ­â€¢ËœÃ¬â€žÂ¸Ã¬Å¡â€.',
        settings_custom_theme: 'Ã¬â€šÂ¬Ã¬Å¡Â©Ã¬Å¾Â Ã¬Â â€¢Ã¬ÂËœ Ã¬Æ’â€°Ã¬Æ’Â',
        settings_custom_note: 'Ã¬Æ’â€°Ã¬Æ’ÂÃ¬Ââ€ž Ã¬â€žÂ Ã­Æ’ÂÃ­â€¢ËœÃ¬â€”Â¬ Ã«â€šËœÃ«Â§Å’Ã¬ÂËœ Ã­â€¦Å’Ã«Â§Ë†Ã«Â¥Â¼ Ã«Â§Å’Ã«â€œÅ“Ã¬â€žÂ¸Ã¬Å¡â€.',
        settings_preview: 'Ã«Â¯Â¸Ã«Â¦Â¬Ã«Â³Â´ÃªÂ¸Â°',
        settings_preview_title: 'Ã«Â²Â¤Ã¬Â¹ËœÃ«Â§Ë†Ã­ÂÂ¬ Ã«Â¯Â¸Ã«Â¦Â¬Ã«Â³Â´ÃªÂ¸Â°',
        settings_preview_note: 'Ã¬Æ’â€°Ã¬Æ’ÂÃ¬Ââ€ž Ã«Â³â‚¬ÃªÂ²Â½Ã­â€¢ËœÃ«Â©Â´ Ã¬â€”â€¦Ã«ÂÂ°Ã¬ÂÂ´Ã­Å Â¸Ã«ÂÂ©Ã«â€¹Ë†Ã«â€¹Â¤.',
        settings_color_target: 'Ã¬Æ’â€°Ã¬Æ’Â Ã«Å’â‚¬Ã¬Æ’Â',
        settings_color_background: 'Ã«Â°Â°ÃªÂ²Â½',
        settings_color_accent1: 'ÃªÂ°â€¢Ã¬Â¡Â° 1',
        settings_color_accent2: 'ÃªÂ°â€¢Ã¬Â¡Â° 2',
        settings_color_panel: 'Ã­Å’Â¨Ã«â€žÂ Ã«Â°Â°ÃªÂ²Â½',
        settings_color_border: 'Ã­Å’Â¨Ã«â€žÂ Ã­â€¦Å’Ã«â€˜ÂÃ«Â¦Â¬',
        settings_color_text: 'Ã­â€¦ÂÃ¬Å Â¤Ã­Å Â¸',
        settings_default_config: 'ÃªÂµÂ¬Ã¬â€žÂ±',
        settings_default_config_startup: 'Ã¬â€¹Å“Ã¬Å¾â€˜ ÃªÂµÂ¬Ã¬â€žÂ±',
        settings_visibility_title: 'ÃªÂ°â‚¬Ã¬â€¹Å“Ã¬â€žÂ±',
        settings_visibility_note: 'Ã«Â²Â¤Ã¬Â¹ËœÃ«Â§Ë†Ã­ÂÂ¬Ã«Â¥Â¼ Ã«Â³Â¼ Ã¬Ë†Ëœ Ã¬Å¾Ë†Ã«Å â€ Ã¬â€šÂ¬Ã«Å¾Å’Ã¬Ââ€ž Ã¬â€žÂ Ã­Æ’ÂÃ­â€¢ËœÃ¬â€žÂ¸Ã¬Å¡â€.',
        settings_visibility_label: 'ÃªÂ°â‚¬Ã¬â€¹Å“Ã¬â€žÂ±',
        settings_visibility_everyone: 'Ã«ÂªÂ¨Ã«â€œÂ  Ã¬â€šÂ¬Ã«Å¾Å’',
        settings_visibility_friends: 'Ã¬Â¹Å“ÃªÂµÂ¬/ÃªÂ¸Â¸Ã«â€œÅ“Ã«Â§Å’',
        settings_platform: 'Ã­â€Å’Ã«Å¾Â«Ã­ÂÂ¼',
        settings_time: 'Ã¬â€¹Å“ÃªÂ°â€ž',
        settings_stat: 'Ã­â€ ÂµÃªÂ³â€ž',
        settings_save_default: 'ÃªÂ¸Â°Ã«Â³Â¸ÃªÂ°â€™ Ã¬â€žÂ¤Ã¬Â â€¢',
        settings_reset_scores: 'Ã¬Â ÂÃ¬Ë†Ëœ ÃªÂ°â€™ Ã¬Â´Ë†ÃªÂ¸Â°Ã­â„¢â€',
        settings_reset_config: 'ÃªÂµÂ¬Ã¬â€žÂ±',
        settings_current_config: 'Ã­Ëœâ€žÃ¬Å¾Â¬ ÃªÂµÂ¬Ã¬â€žÂ±',
        settings_reset_selected: 'Ã¬â€žÂ Ã­Æ’Â Ã­â€¢Â­Ã«ÂªÂ© Ã¬Â´Ë†ÃªÂ¸Â°Ã­â„¢â€',
        settings_reset_all: 'Ã«ÂªÂ¨Ã«â€œÂ  ÃªÂµÂ¬Ã¬â€žÂ± Ã¬Â´Ë†ÃªÂ¸Â°Ã­â„¢â€',
        settings_reset_note: 'ÃªÂ¸Â°Ã«Â³Â¸ÃªÂ°â€™Ã¬Ââ‚¬ Ã«Â³â‚¬ÃªÂ²Â½Ã«ÂËœÃ¬Â§â‚¬ Ã¬â€¢Å Ã¬Å ÂµÃ«â€¹Ë†Ã«â€¹Â¤.',
        generating_screenshot: 'Ã¬Å Â¤Ã­ÂÂ¬Ã«Â¦Â°Ã¬Æ’Â· Ã¬Æ’ÂÃ¬â€žÂ± Ã¬Â¤â€˜...',
        reset_confirm: 'Ã«ÂªÂ¨Ã«â€œÂ  Ã¬Â ÂÃ¬Ë†Ëœ ÃªÂ°â€™Ã¬Ââ€ž 0Ã¬Å“Â¼Ã«Â¡Å“ Ã¬Â´Ë†ÃªÂ¸Â°Ã­â„¢â€Ã­â€¢ËœÃ¬â€¹Å“ÃªÂ²Â Ã¬Å ÂµÃ«â€¹Ë†ÃªÂ¹Å’?',
        reset_all_confirm: 'Ã¬Â â‚¬Ã¬Å¾Â¥Ã«ÂÅ“ Ã«ÂªÂ¨Ã«â€œÂ  ÃªÂµÂ¬Ã¬â€žÂ± Ã«Â°Â Ã¬Â ÂÃ¬Ë†ËœÃ«Â¥Â¼ Ã¬Â´Ë†ÃªÂ¸Â°Ã­â„¢â€Ã­â€¢ËœÃ¬â€¹Å“ÃªÂ²Â Ã¬Å ÂµÃ«â€¹Ë†ÃªÂ¹Å’?'
    },
    zh: {
        share: 'Ã¥Ë†â€ Ã¤ÂºÂ«',
        settings: 'Ã¨Â®Â¾Ã§Â½Â®',
        rating: 'Ã¨Â¯â€žÃ§ÂºÂ§',
        score: 'Ã¥Ë†â€ Ã¦â€¢Â°',
        progression: 'Ã¥Ë†â€ Ã¦â€¢Â°Ã©ËœË†Ã¥â‚¬Â¼',
        cave: 'Ã¦Â´Å¾Ã§Â©Â´',
        edit: 'Ã§Â¼â€“Ã¨Â¾â€˜',
        edit_hint: 'Ã¥ÂÂ³Ã©â€Â®Ã§â€šÂ¹Ã¥â€¡Â»Ã§Â¼â€“Ã¨Â¾â€˜',
        swords: 'Ã¥â€°â€˜',
        bombs: 'Ã§â€šÂ¸Ã¥Â¼Â¹',
        radar_title: 'Ã¦Â´Å¾Ã§Â©Â´Ã¥â€ºÂ¾Ã¨Â¡Â¨',
        radar_strongest: 'Ã¦Å“â‚¬Ã¥Â¼ÂºÃ¦Â´Å¾Ã§Â©Â´',
        radar_weakest: 'Ã¦Å“â‚¬Ã¥Â¼Â±Ã¦Â´Å¾Ã§Â©Â´',
        radar_tab_combined: 'Ã§Â»Â¼Ã¥ÂË†',
        radar_tab_swords: 'Ã¥â€°â€˜',
        radar_tab_bombs: 'Ã§â€šÂ¸Ã¥Â¼Â¹',
        rule_1: 'Ã¥Å¸ÂºÃ¥â€¡â€ Ã¦Âµâ€¹Ã¨Â¯â€¢Ã¤Â»â€¦Ã¤Â¾â€º<span style="color: #fff;">Ã¤Â¸ÂªÃ¤ÂºÂºÃ¤Â½Â¿Ã§â€Â¨</span>Ã£â‚¬â€š',
        rule_2: 'Ã¥Â¼â‚¬Ã¥Â§â€¹Ã¥â€°ÂÃ¥Â¿â€¦Ã©Â¡Â»Ã¥Â°â€ Ã¦Â´Å¾Ã§Â©Â´Ã¤Â¸Â­Ã§Å¡â€žÃ¦â€°â‚¬Ã¦Å“â€°Ã¦â€¢Å’Ã¤ÂºÂº<span style="color: #fff;">Ã©â€¡ÂÃ§Â½Â®Ã¤Â¸ÂºÃ¦Â»Â¡Ã¨Â¡â‚¬</span>Ã£â‚¬â€š',
        rule_3: 'Ã¤Â¸ÂÃ¥â€¦ÂÃ¨Â®Â¸Ã¤Â½Â¿Ã§â€Â¨Ã§ÂÅ’Ã¦Å“Â¨Ã¤Â¸â€ºÃ§Å¡â€ž<span style="color: #fff;">Ã©â‚¬Å¸Ã¥ÂºÂ¦Ã¦ÂÂÃ¥Ââ€¡</span>Ã£â‚¬â€š',
        rule_4: 'Ã¥Â¿â€¦Ã©Â¡Â»Ã¥Å“Â¨<span style="color: #fff;">Ã¦Â²Â¡Ã¦Å“â€°Ã¤Â»Â»Ã¤Â½â€¢Ã¥â€¦Â¶Ã¤Â»â€“Ã§Å½Â©Ã¥Â®Â¶Ã¥Â¸Â®Ã¥Å Â©</span>Ã¦Ë†â€“Ã©â‚¬Â Ã¦Ë†ÂÃ¦â€žÂÃ¥Â¤â€“Ã¤Â¼Â¤Ã¥Â®Â³Ã§Å¡â€žÃ¦Æ’â€¦Ã¥â€ ÂµÃ¤Â¸â€¹Ã¨Â¾Â¾Ã¥Ë†Â°Ã¨Â¯â€žÃ¥Ë†â€ Ã©ËœË†Ã¥â‚¬Â¼Ã£â‚¬â€š',
        rule_5: '<span style="color: #fff;">Ã¥â€°â€˜</span>Ã§Â±Â»Ã¥Ë†Â«Ã¤Â»â€¦Ã¥â€¦ÂÃ¨Â®Â¸Ã¤Â½Â¿Ã§â€Â¨Ã¥â€°â€˜Ã¯Â¼Å’Ã¨â‚¬Å’<span style="color: #fff;">Ã§â€šÂ¸Ã¥Â¼Â¹</span>Ã§Â±Â»Ã¥Ë†Â«Ã¥â€¦ÂÃ¨Â®Â¸Ã¥ÂÅ’Ã¦â€”Â¶Ã¤Â½Â¿Ã§â€Â¨Ã§â€šÂ¸Ã¥Â¼Â¹Ã¥â€™Å’Ã¥â€°â€˜Ã£â‚¬â€š',
        download_image: 'Ã¤Â¸â€¹Ã¨Â½Â½Ã¥â€ºÂ¾Ã§â€°â€¡',
        copy_link: 'Ã¥Â¤ÂÃ¥Ë†Â¶Ã¥Å¸ÂºÃ¥â€¡â€ Ã¦Âµâ€¹Ã¨Â¯â€¢Ã©â€œÂ¾Ã¦Å½Â¥',
        guidelines_title: 'Ã¦Å’â€¡Ã¥Ââ€”',
        guidelines_subtitle: 'Ã§â€Â¨Ã¤ÂºÅ½Ã¥â€¡â€ Ã§Â¡Â®Ã¨Â¯â€žÃ¥Ë†â€ ',
        settings_title: 'Ã¨Â®Â¾Ã§Â½Â®',
        settings_subtitle: 'Ã¨â€¡ÂªÃ¥Â®Å¡Ã¤Â¹â€°Ã¦â€šÂ¨Ã§Å¡â€žÃ¥Å¸ÂºÃ¥â€¡â€ Ã¦Âµâ€¹Ã¨Â¯â€¢',
        settings_language: 'Ã¨Â¯Â­Ã¨Â¨â‚¬',
        settings_language_note: 'Ã§Â«â€¹Ã¥ÂÂ³Ã¥Âºâ€Ã§â€Â¨Ã£â‚¬â€š',
        settings_display: 'Ã¦ËœÂ¾Ã§Â¤Âº',
        settings_font_scale: 'Ã¥Â­â€”Ã¤Â½â€œÃ¥Â¤Â§Ã¥Â°Â',
        settings_font_family: 'Ã¥Â­â€”Ã¤Â½â€œ',
        settings_compact_mode: 'Ã§Â´Â§Ã¥â€¡â€˜Ã¦Â¨Â¡Ã¥Â¼Â',
        settings_pacman: '???',
        settings_font_small: 'Ã¥Â°Â',
        settings_font_normal: 'Ã¦Â­Â£Ã¥Â¸Â¸',
        settings_font_large: 'Ã¥Â¤Â§',
        settings_font_default: 'Ã©Â»ËœÃ¨Â®Â¤',
        settings_font_modern: 'Ã§Å½Â°Ã¤Â»Â£',
        settings_font_classic: 'Ã§Â»ÂÃ¥â€¦Â¸',
        settings_font_mono: 'Ã§Â­â€°Ã¥Â®Â½',
        settings_toggle_on: 'Ã¥Â¼â‚¬Ã¥ÂÂ¯',
        settings_toggle_off: 'Ã¥â€¦Â³Ã©â€”Â­',
        settings_theme: 'Ã¤Â¸Â»Ã©Â¢Ëœ',
        settings_theme_note: 'Ã¦Å½â€™Ã¥ÂÂÃ¤Â¸Â»Ã©Â¢ËœÃ©Å¡ÂÃ§Ââ‚¬Ã¦â€šÂ¨Ã§Å¡â€žÃ¦Å½â€™Ã¥ÂÂÃ¦ÂÂÃ¥Ââ€¡Ã¨â‚¬Å’Ã¨Â§Â£Ã©â€ÂÃ£â‚¬â€š',
        settings_theme_auto: 'Ã¥Ââ€¡Ã§ÂºÂ§Ã¦â€”Â¶Ã¨â€¡ÂªÃ¥Å Â¨Ã¥Âºâ€Ã§â€Â¨Ã¥Â½â€œÃ¥â€°ÂÃ§Å¡â€žÃ¦Å½â€™Ã¥ÂÂÃ¤Â¸Â»Ã©Â¢Ëœ',
        settings_custom_name: 'Ã¨â€¡ÂªÃ¥Â®Å¡Ã¤Â¹â€°',
        settings_save_name: 'Ã¤Â¿ÂÃ¥Â­Ëœ',
        settings_remove_custom: 'Ã§Â§Â»Ã©â„¢Â¤',
        settings_custom_create: 'Ã¥Ë†â€ºÃ¥Â»Âº',
        settings_custom_locked_note: 'Ã§â€šÂ¹Ã¥â€¡Â»Ã¥Ë†â€ºÃ¥Â»ÂºÃ¤Â»Â¥Ã¨Â§Â£Ã©â€ÂÃ¨â€¡ÂªÃ¥Â®Å¡Ã¤Â¹â€°Ã©Â¢Å“Ã¨â€°Â²Ã£â‚¬â€š',
        settings_custom_select_note: 'Ã©â‚¬â€°Ã¦â€¹Â©Ã¤Â¸â‚¬Ã¤Â¸ÂªÃ¨â€¡ÂªÃ¥Â®Å¡Ã¤Â¹â€°Ã¤Â¸Â»Ã©Â¢ËœÃ£â‚¬â€š',
        settings_custom_theme: 'Ã¨â€¡ÂªÃ¥Â®Å¡Ã¤Â¹â€°Ã©Â¢Å“Ã¨â€°Â²',
        settings_custom_note: 'Ã©â‚¬â€°Ã¦â€¹Â©Ã©Â¢Å“Ã¨â€°Â²Ã¤Â»Â¥Ã¦Å¾â€žÃ¥Â»ÂºÃ¦â€šÂ¨Ã¨â€¡ÂªÃ¥Â·Â±Ã§Å¡â€žÃ¤Â¸Â»Ã©Â¢ËœÃ£â‚¬â€š',
        settings_preview: 'Ã©Â¢â€žÃ¨Â§Ë†',
        settings_preview_title: 'Ã¥Å¸ÂºÃ¥â€¡â€ Ã¦Âµâ€¹Ã¨Â¯â€¢Ã©Â¢â€žÃ¨Â§Ë†',
        settings_preview_note: 'Ã©Å¡ÂÃ§Ââ‚¬Ã¦â€šÂ¨Ã¦â€ºÂ´Ã¦â€Â¹Ã©Â¢Å“Ã¨â€°Â²Ã¨â‚¬Å’Ã¦â€ºÂ´Ã¦â€“Â°Ã£â‚¬â€š',
        settings_color_target: 'Ã©Â¢Å“Ã¨â€°Â²Ã§â€ºÂ®Ã¦Â â€¡',
        settings_color_background: 'Ã¨Æ’Å’Ã¦â„¢Â¯',
        settings_color_accent1: 'Ã¥Â¼ÂºÃ¨Â°Æ’Ã¨â€°Â² 1',
        settings_color_accent2: 'Ã¥Â¼ÂºÃ¨Â°Æ’Ã¨â€°Â² 2',
        settings_color_panel: 'Ã©ÂÂ¢Ã¦ÂÂ¿Ã¨Æ’Å’Ã¦â„¢Â¯',
        settings_color_border: 'Ã©ÂÂ¢Ã¦ÂÂ¿Ã¨Â¾Â¹Ã¦Â¡â€ ',
        settings_color_text: 'Ã¦â€“â€¡Ã¦Å“Â¬',
        settings_default_config: 'Ã©â€¦ÂÃ§Â½Â®',
        settings_default_config_startup: 'Ã¥ÂÂ¯Ã¥Å Â¨Ã©â€¦ÂÃ§Â½Â®',
        settings_visibility_title: 'Ã¥ÂÂ¯Ã¨Â§ÂÃ¦â‚¬Â§',
        settings_visibility_note: 'Ã©â‚¬â€°Ã¦â€¹Â©Ã¨Â°ÂÃ¥ÂÂ¯Ã¤Â»Â¥Ã¦Å¸Â¥Ã§Å“â€¹Ã¦â€šÂ¨Ã§Å¡â€žÃ¥Å¸ÂºÃ¥â€¡â€ Ã¦Âµâ€¹Ã¨Â¯â€¢Ã£â‚¬â€š',
        settings_visibility_label: 'Ã¥ÂÂ¯Ã¨Â§ÂÃ¦â‚¬Â§',
        settings_visibility_everyone: 'Ã¦â€°â‚¬Ã¦Å“â€°Ã¤ÂºÂº',
        settings_visibility_friends: 'Ã¤Â»â€¦Ã¥Â¥Â½Ã¥Ââ€¹/Ã¥â€¦Â¬Ã¤Â¼Å¡',
        settings_platform: 'Ã¥Â¹Â³Ã¥ÂÂ°',
        settings_time: 'Ã¦â€”Â¶Ã©â€”Â´',
        settings_stat: 'Ã§Â»Å¸Ã¨Â®Â¡',
        settings_save_default: 'Ã¨Â®Â¾Ã¤Â¸ÂºÃ©Â»ËœÃ¨Â®Â¤',
        settings_reset_scores: 'Ã©â€¡ÂÃ§Â½Â®Ã¥Ë†â€ Ã¦â€¢Â°Ã¥â‚¬Â¼',
        settings_reset_config: 'Ã©â€¦ÂÃ§Â½Â®',
        settings_current_config: 'Ã¥Â½â€œÃ¥â€°ÂÃ©â€¦ÂÃ§Â½Â®',
        settings_reset_selected: 'Ã©â€¡ÂÃ§Â½Â®Ã¦â€°â‚¬Ã©â‚¬â€°',
        settings_reset_all: 'Ã©â€¡ÂÃ§Â½Â®Ã¦â€°â‚¬Ã¦Å“â€°Ã©â€¦ÂÃ§Â½Â®',
        settings_reset_note: 'Ã¤Â¸ÂÃ¦â€ºÂ´Ã¦â€Â¹Ã©Â»ËœÃ¨Â®Â¤Ã¥â‚¬Â¼Ã£â‚¬â€š',
        generating_screenshot: 'Ã¦Â­Â£Ã¥Å“Â¨Ã§â€Å¸Ã¦Ë†ÂÃ¦Ë†ÂªÃ¥â€ºÂ¾...',
        reset_confirm: 'Ã¥Â°â€ Ã¦â€°â‚¬Ã¦Å“â€°Ã¥Ë†â€ Ã¦â€¢Â°Ã¥â‚¬Â¼Ã©â€¡ÂÃ§Â½Â®Ã¤Â¸Âº 0Ã¯Â¼Å¸',
        reset_all_confirm: 'Ã©â€¡ÂÃ§Â½Â®Ã¦â€°â‚¬Ã¦Å“â€°Ã¤Â¿ÂÃ¥Â­ËœÃ§Å¡â€žÃ©â€¦ÂÃ§Â½Â®Ã¥â€™Å’Ã¥Ë†â€ Ã¦â€¢Â°Ã¯Â¼Å¸'
    }
};

const I18N_EXTRA = {
    en: {
        settings_mount: 'Mount',
        mount_speed_1: 'Mount Speed 1',
        mount_speed_2: 'Mount Speed 2',
        footer_site_made_by: 'Site made by',
        footer_disclaimer: 'This site is not affiliated, maintained, endorsed or sponsored by GraalOnline. All assets \u00A9 2026 GraalOnline',
        footer_terms: 'Terms & Conditions',
        footer_privacy: 'Privacy Policy',
        footer_cookie: 'Cookie Policy',
        footer_dmca: 'DMCA Policy',
        menu_profile: 'Profile',
        menu_friends: 'Friends',
        menu_logout: 'Log Out',
        seasonal_add_placements: '+ Add Seasonal Placements',
        seasonal_modal_title: 'Seasonal Placements',
        seasonal_modal_subtitle: 'Add your earned trophies',
        seasonal_current_total: 'Current Total Placements',
        seasonal_total_label: 'Total',
        seasonal_place_1st: '1st Place',
        seasonal_place_2nd: '2nd Place',
        seasonal_place_3rd: '3rd Place',
        seasonal_place_plaque: 'Plaque',
        seasonal_reset_values: 'Reset Values',
        seasonal_save_placements: 'Save Placements',
        achievements_title: 'Achievements',
        highlights_title: 'Highlights',
        add_highlight_btn: '+ Add Highlight',
        profile_settings_title: 'Profile Settings',
        profile_picture: 'Profile Picture',
        upload_image: 'Upload Image',
        replace_image: 'Replace Image',
        edit_image: 'Edit Image',
        remove_image: 'Remove Image',
        username_label: 'Username (1-20 characters)',
        username_placeholder: 'Player',
        guilds_max: 'Guilds (Max 6)',
        add_guild: 'Add Guild',
        guild_name_placeholder: 'Guild Name',
        add: 'Add',
        cancel: 'Cancel',
        save: 'Save',
        confirm: 'Confirm',
        country_flag: 'Country Flag',
        remove_flag: 'Remove Flag',
        account_details: 'Account Details',
        account_id: 'Account ID',
        show: 'Show',
        hide: 'Hide',
        email_address: 'Email Address',
        new_email_placeholder: 'New email address',
        verify_update: 'Verify & Update',
        change_email_address: 'Change Email Address',
        password: 'Password',
        change_password: 'Change Password',
        delete_personal_account: 'Delete Personal Account',
        cannot_undo: 'This cannot be undone.',
        delete_account: 'Delete Account',
        discard_changes: 'Discard Changes',
        save_changes: 'Save Changes',
        friends_title: 'Friends',
        friends_subtitle: 'Add and view your friends benchmarks',
        your_account_id: 'Your Account ID',
        friends_list_tab: 'Friends List',
        friend_requests_tab: 'Friend Requests',
        remove_friends_tab: 'Remove Friends',
        enter_account_id_placeholder: 'Enter Account ID',
        add_friend: 'Add Friend',
        received_friend_requests: 'Received Friend Requests',
        sent_friend_requests: 'Friend Requests Sent',
        select_friends_remove: 'Select friends to remove',
        highlight_modal_title: 'Add Highlight',
        highlight_label_image: 'Image',
        highlight_click_upload: 'Click to upload image',
        highlight_title_required_label: 'Title (Required)',
        highlight_desc_optional_label: 'Description (Optional)',
        highlight_title_placeholder: 'Enter a title...',
        highlight_desc_placeholder: 'Enter a description...',
        highlights_empty: 'No highlights yet.',
        delete: 'Delete',
        highlight_delete_title: 'Delete Highlight',
        highlight_delete_confirm: 'Are you sure you want to delete this highlight?',
        highlight_limit_reached: 'You can only have up to 6 highlights.',
        highlight_title_required_error: 'Title is required.',
        highlight_upload_required_error: 'Please upload an image.',
        highlight_save_failed: 'Failed to save highlight. Please try again.',
        achievement_cat_lifetime: 'Lifetime',
        achievement_cat_kills: 'Kills',
        achievement_cat_points: 'Points',
        achievement_cat_streak: 'Streak',
        achievement_cat_duo: 'Duo',
        achievement_cat_trio: 'Trio',
        achievement_cat_quad: 'Quad',
        achievement_cat_challenge: 'Challenge',
        achievement_input_restricted: 'Session Incomplete',
        achievement_enter_friend_name: 'Enter friend name',
        achievement_partner_label: 'Friend 1',
        achievement_friend_label: 'Friend {index}',
        achievement_session_incomplete: 'Session Incomplete',
        achievement_no_image: 'No image',
        achievement_upload_image: 'Upload image',
        achievement_session_image: 'Session Image',
        achievement_completed: 'Completed',
        achievement_incomplete: 'Incomplete',
        achievement_remove_image_title: 'Remove Image',
        achievement_remove_image_confirm: 'Remove this image?',
        achievement_you_have: 'You have unlocked',
        achievement_progress_prefix: '{name}:',
        achievement_goal_total: 'Obtain {value} baddy kills',
        achievement_goal_kills_day: 'Kill {value} baddies in one day',
        achievement_goal_points_day: 'Reach {value} baddy points in one day',
        achievement_goal_streak: 'Get a {value} baddy streak',
        achievement_goal_group_day: 'Complete a {group} session by getting {value} baddy kills in one day',
        achievement_group_duo: 'duo',
        achievement_group_trio: 'trio',
        achievement_group_quad: 'quad',
        friends_none: 'No friends yet.',
        unknown_player: 'Unknown Player',
        friends_error_loading: 'Error loading friends list.',
        friend_requests_none: 'No friend requests.',
        friend_requests_error_loading: 'Error loading friend requests.',
        remove_friends_none: 'No friends to remove.',
        remove_friend_title: 'Remove Friend',
        remove_friend_confirm: 'Remove {name} from your friends list?',
        remove_friend_failed: 'Failed to remove friend.',
        sent_requests_none: 'No sent requests.',
        sent_requests_error_loading: 'Error loading sent requests.',
        accept: 'Accept',
        decline: 'Decline',
        remove: 'Remove',
        add_friend_user_not_found: 'User not found.',
        add_friend_self: 'You cannot add yourself.',
        add_friend_already_friends: 'You are already friends with this account.',
        add_friend_already_sent: 'Friend request already sent.',
        add_friend_check_requests: 'This user already sent you a request. Check Friend Requests.',
        add_friend_sent: 'Friend request sent!',
        add_friend_error: 'Error adding friend. Please try again.',
        profile_email_valid_error: 'Please enter a valid email address.',
        profile_email_different_error: 'Please enter a different email address.',
        profile_email_sending_verification: 'Sending verification...',
        profile_email_verification_sent: 'Verification email sent to {email}. Please check your inbox or spam folder.',
        profile_not_logged_in: 'Not logged in.',
        profile_password_sending_reset: 'Sending password reset email...',
        profile_password_reset_sent: 'Password reset email sent. Please check your inbox or spam folder.',
        profile_email_not_exist: 'Email does not exist.',
        profile_change_password_sending: 'Sending...',
        profile_delete_confirm_title: 'Delete Personal Account',
        profile_delete_confirm_message: 'Are you sure you want to delete your account? This cannot be undone.',
        profile_delete_error_prefix: 'Error deleting account: ',
        profile_save_login_required: 'You must be logged in to save profile changes.',
        profile_saving: 'Saving...',
        profile_save_failed: 'Failed to save profile changes. Please try again.',
        verification_email_sent_to: 'Verification email sent to {email}',
        reauth_password_required: 'Password is required.',
        reauth_verifying: 'Verifying...',
        reauth_confirm: 'Confirm',
        exit_view_mode: 'Exit View Mode'
    },
    ar: {
        settings_mount: 'Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â·Ã™Å Ã˜Â©',
        mount_speed_1: 'Ã˜Â³Ã˜Â±Ã˜Â¹Ã˜Â© Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â·Ã™Å Ã˜Â© 1',
        mount_speed_2: 'Ã˜Â³Ã˜Â±Ã˜Â¹Ã˜Â© Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â·Ã™Å Ã˜Â© 2',
        footer_site_made_by: 'Ã˜ÂªÃ™â€¦ Ã˜Â¥Ã™â€ Ã˜Â´Ã˜Â§Ã˜Â¡ Ã˜Â§Ã™â€žÃ™â€¦Ã™Ë†Ã™â€šÃ˜Â¹ Ã˜Â¨Ã™Ë†Ã˜Â§Ã˜Â³Ã˜Â·Ã˜Â©',
        footer_disclaimer: 'Ã™â€¡Ã˜Â°Ã˜Â§ Ã˜Â§Ã™â€žÃ™â€¦Ã™Ë†Ã™â€šÃ˜Â¹ Ã˜ÂºÃ™Å Ã˜Â± Ã˜ÂªÃ˜Â§Ã˜Â¨Ã˜Â¹ Ã™â€žÃ™â‚¬ GraalOnline Ã™Ë†Ã˜ÂºÃ™Å Ã˜Â± Ã™â€¦Ã™ÂÃ˜Â¯Ã˜Â§Ã˜Â± Ã˜Â£Ã™Ë† Ã™â€¦Ã™ÂÃ˜Â¹Ã˜ÂªÃ™â€¦Ã˜Â¯ Ã˜Â£Ã™Ë† Ã™â€¦Ã™ÂÃ™â€¦Ã™Ë†Ã™â€˜Ã™â€ž Ã™â€¦Ã™â€  Ã™â€šÃ˜Â¨Ã™â€žÃ™â€¡. Ã˜Â¬Ã™â€¦Ã™Å Ã˜Â¹ Ã˜Â§Ã™â€žÃ˜Â£Ã˜ÂµÃ™Ë†Ã™â€ž Ã‚Â© 2026 GraalOnline',
        footer_terms: 'Ã˜Â§Ã™â€žÃ˜Â´Ã˜Â±Ã™Ë†Ã˜Â· Ã™Ë†Ã˜Â§Ã™â€žÃ˜Â£Ã˜Â­Ã™Æ’Ã˜Â§Ã™â€¦',
        footer_privacy: 'Ã˜Â³Ã™Å Ã˜Â§Ã˜Â³Ã˜Â© Ã˜Â§Ã™â€žÃ˜Â®Ã˜ÂµÃ™Ë†Ã˜ÂµÃ™Å Ã˜Â©',
        footer_cookie: 'Ã˜Â³Ã™Å Ã˜Â§Ã˜Â³Ã˜Â© Ã™â€¦Ã™â€žÃ™ÂÃ˜Â§Ã˜Âª Ã˜ÂªÃ˜Â¹Ã˜Â±Ã™Å Ã™Â Ã˜Â§Ã™â€žÃ˜Â§Ã˜Â±Ã˜ÂªÃ˜Â¨Ã˜Â§Ã˜Â·',
        footer_dmca: 'Ã˜Â³Ã™Å Ã˜Â§Ã˜Â³Ã˜Â© DMCA'
    },
    bn: {
        settings_mount: 'Ã Â¦Â®Ã Â¦Â¾Ã Â¦â€°Ã Â¦Â¨Ã Â§ÂÃ Â¦Å¸',
        mount_speed_1: 'Ã Â¦Â®Ã Â¦Â¾Ã Â¦â€°Ã Â¦Â¨Ã Â§ÂÃ Â¦Å¸ Ã Â¦â€”Ã Â¦Â¤Ã Â¦Â¿ 1',
        mount_speed_2: 'Ã Â¦Â®Ã Â¦Â¾Ã Â¦â€°Ã Â¦Â¨Ã Â§ÂÃ Â¦Å¸ Ã Â¦â€”Ã Â¦Â¤Ã Â¦Â¿ 2',
        footer_site_made_by: 'Ã Â¦Â¸Ã Â¦Â¾Ã Â¦â€¡Ã Â¦Å¸Ã Â¦Å¸Ã Â¦Â¿ Ã Â¦Â¤Ã Â§Ë†Ã Â¦Â°Ã Â¦Â¿ Ã Â¦â€¢Ã Â¦Â°Ã Â§â€¡Ã Â¦â€ºÃ Â§â€¡Ã Â¦Â¨',
        footer_disclaimer: 'Ã Â¦ÂÃ Â¦â€¡ Ã Â¦Â¸Ã Â¦Â¾Ã Â¦â€¡Ã Â¦Å¸Ã Â¦Å¸Ã Â¦Â¿ GraalOnline-Ã Â¦ÂÃ Â¦Â° Ã Â¦Â¸Ã Â¦Â¾Ã Â¦Â¥Ã Â§â€¡ Ã Â¦Â¸Ã Â¦â€šÃ Â¦Â¯Ã Â§ÂÃ Â¦â€¢Ã Â§ÂÃ Â¦Â¤, Ã Â¦ÂªÃ Â¦Â°Ã Â¦Â¿Ã Â¦Å¡Ã Â¦Â¾Ã Â¦Â²Ã Â¦Â¿Ã Â¦Â¤, Ã Â¦â€¦Ã Â¦Â¨Ã Â§ÂÃ Â¦Â®Ã Â§â€¹Ã Â¦Â¦Ã Â¦Â¿Ã Â¦Â¤ Ã Â¦Â¬Ã Â¦Â¾ Ã Â¦ÂªÃ Â§Æ’Ã Â¦Â·Ã Â§ÂÃ Â¦Â Ã Â¦ÂªÃ Â§â€¹Ã Â¦Â·Ã Â¦â€¢Ã Â¦Â¤Ã Â¦Â¾Ã Â¦ÂªÃ Â§ÂÃ Â¦Â°Ã Â¦Â¾Ã Â¦ÂªÃ Â§ÂÃ Â¦Â¤ Ã Â¦Â¨Ã Â¦Â¯Ã Â¦Â¼Ã Â¥Â¤ Ã Â¦Â¸Ã Â¦â€¢Ã Â¦Â² Ã Â¦Â¸Ã Â¦Â®Ã Â§ÂÃ Â¦ÂªÃ Â¦Â¦ Ã‚Â© 2026 GraalOnline',
        footer_terms: 'Ã Â¦Â¶Ã Â¦Â°Ã Â§ÂÃ Â¦Â¤Ã Â¦Â¾Ã Â¦Â¬Ã Â¦Â²Ã Â¦Â¿',
        footer_privacy: 'Ã Â¦â€”Ã Â§â€¹Ã Â¦ÂªÃ Â¦Â¨Ã Â§â‚¬Ã Â¦Â¯Ã Â¦Â¼Ã Â¦Â¤Ã Â¦Â¾ Ã Â¦Â¨Ã Â§â‚¬Ã Â¦Â¤Ã Â¦Â¿',
        footer_cookie: 'Ã Â¦â€¢Ã Â§ÂÃ Â¦â€¢Ã Â¦Â¿ Ã Â¦Â¨Ã Â§â‚¬Ã Â¦Â¤Ã Â¦Â¿',
        footer_dmca: 'DMCA Ã Â¦Â¨Ã Â§â‚¬Ã Â¦Â¤Ã Â¦Â¿'
    },
    da: {
        settings_mount: 'Mount',
        mount_speed_1: 'Mount-hastighed 1',
        mount_speed_2: 'Mount-hastighed 2',
        footer_site_made_by: 'Siden er lavet af',
        footer_disclaimer: 'Denne side er ikke tilknyttet, vedligeholdt, godkendt eller sponsoreret af GraalOnline. Alle aktiver Ã‚Â© 2026 GraalOnline',
        footer_terms: 'VilkÃƒÂ¥r og betingelser',
        footer_privacy: 'Privatlivspolitik',
        footer_cookie: 'Cookiepolitik',
        footer_dmca: 'DMCA-politik'
    },
    de: {
        settings_mount: 'Reittier',
        mount_speed_1: 'Reittier-Geschwindigkeit 1',
        mount_speed_2: 'Reittier-Geschwindigkeit 2',
        footer_site_made_by: 'Website erstellt von',
        footer_disclaimer: 'Diese Website ist nicht mit GraalOnline verbunden, wird nicht von GraalOnline gepflegt, unterstÃƒÂ¼tzt oder gesponsert. Alle Assets Ã‚Â© 2026 GraalOnline',
        footer_terms: 'Nutzungsbedingungen',
        footer_privacy: 'DatenschutzerklÃƒÂ¤rung',
        footer_cookie: 'Cookie-Richtlinie',
        footer_dmca: 'DMCA-Richtlinie'
    },
    fil: {
        settings_mount: 'Mount',
        mount_speed_1: 'Bilis ng Mount 1',
        mount_speed_2: 'Bilis ng Mount 2',
        footer_site_made_by: 'Site na ginawa ni',
        footer_disclaimer: 'Ang site na ito ay hindi kaakibat, pinapanatili, ineendorso o ini-sponsor ng GraalOnline. Lahat ng assets Ã‚Â© 2026 GraalOnline',
        footer_terms: 'Mga Tuntunin at Kondisyon',
        footer_privacy: 'Patakaran sa Privacy',
        footer_cookie: 'Patakaran sa Cookie',
        footer_dmca: 'Patakaran ng DMCA'
    },
    fr: {
        settings_mount: 'Monture',
        mount_speed_1: 'Vitesse de monture 1',
        mount_speed_2: 'Vitesse de monture 2',
        footer_site_made_by: 'Site crÃƒÂ©ÃƒÂ© par',
        footer_disclaimer: 'Ce site n\'est ni affiliÃƒÂ©, ni maintenu, ni approuvÃƒÂ©, ni sponsorisÃƒÂ© par GraalOnline. Tous les contenus Ã‚Â© 2026 GraalOnline',
        footer_terms: 'Conditions gÃƒÂ©nÃƒÂ©rales',
        footer_privacy: 'Politique de confidentialitÃƒÂ©',
        footer_cookie: 'Politique relative aux cookies',
        footer_dmca: 'Politique DMCA'
    },
    hmn: {
        settings_mount: 'Mount',
        mount_speed_1: 'Mount Speed 1',
        mount_speed_2: 'Mount Speed 2',
        footer_site_made_by: 'Lub vev xaib tsim los ntawm',
        footer_disclaimer: 'Lub vev xaib no tsis muaj kev koom tes, tswj, txhawb, lossis pub nyiaj los ntawm GraalOnline. Txhua yam assets Ã‚Â© 2026 GraalOnline',
        footer_terms: 'Nqe lus thiab Kev Cai',
        footer_privacy: 'Txoj Cai Ntiag Tug',
        footer_cookie: 'Txoj Cai Cookie',
        footer_dmca: 'Txoj Cai DMCA'
    },
    id: {
        settings_mount: 'Tunggangan',
        mount_speed_1: 'Kecepatan Tunggangan 1',
        mount_speed_2: 'Kecepatan Tunggangan 2',
        footer_site_made_by: 'Situs dibuat oleh',
        footer_disclaimer: 'Situs ini tidak berafiliasi, dikelola, didukung, atau disponsori oleh GraalOnline. Semua aset Ã‚Â© 2026 GraalOnline',
        footer_terms: 'Syarat & Ketentuan',
        footer_privacy: 'Kebijakan Privasi',
        footer_cookie: 'Kebijakan Cookie',
        footer_dmca: 'Kebijakan DMCA'
    },
    it: {
        settings_mount: 'Cavalcatura',
        mount_speed_1: 'VelocitÃƒÂ  cavalcatura 1',
        mount_speed_2: 'VelocitÃƒÂ  cavalcatura 2',
        footer_site_made_by: 'Sito creato da',
        footer_disclaimer: 'Questo sito non ÃƒÂ¨ affiliato, gestito, approvato o sponsorizzato da GraalOnline. Tutte le risorse Ã‚Â© 2026 GraalOnline',
        footer_terms: 'Termini e condizioni',
        footer_privacy: 'Informativa sulla privacy',
        footer_cookie: 'Informativa sui cookie',
        footer_dmca: 'Politica DMCA'
    },
    hu: {
        settings_mount: 'HÃƒÂ¡tas',
        mount_speed_1: 'HÃƒÂ¡tassebessÃƒÂ©g 1',
        mount_speed_2: 'HÃƒÂ¡tassebessÃƒÂ©g 2',
        footer_site_made_by: 'Az oldalt kÃƒÂ©szÃƒÂ­tette',
        footer_disclaimer: 'Ez az oldal nem ÃƒÂ¡ll kapcsolatban a GraalOnline-nal, ÃƒÂ©s nem a GraalOnline kezeli, tÃƒÂ¡mogatja vagy szponzorÃƒÂ¡lja. Minden eszkÃƒÂ¶z Ã‚Â© 2026 GraalOnline',
        footer_terms: 'FelhasznÃƒÂ¡lÃƒÂ¡si feltÃƒÂ©telek',
        footer_privacy: 'AdatvÃƒÂ©delmi irÃƒÂ¡nyelv',
        footer_cookie: 'Cookie szabÃƒÂ¡lyzat',
        footer_dmca: 'DMCA szabÃƒÂ¡lyzat'
    },
    ms: {
        settings_mount: 'Tunggangan',
        mount_speed_1: 'Kelajuan Tunggangan 1',
        mount_speed_2: 'Kelajuan Tunggangan 2',
        footer_site_made_by: 'Laman dibuat oleh',
        footer_disclaimer: 'Laman ini tidak berafiliasi, diselenggara, disokong atau ditaja oleh GraalOnline. Semua aset Ã‚Â© 2026 GraalOnline',
        footer_terms: 'Terma & Syarat',
        footer_privacy: 'Dasar Privasi',
        footer_cookie: 'Dasar Kuki',
        footer_dmca: 'Dasar DMCA'
    }
,
    nl: {
        settings_mount: 'Rijdier',
        mount_speed_1: 'Rijdiersnelheid 1',
        mount_speed_2: 'Rijdiersnelheid 2',
        footer_site_made_by: 'Site gemaakt door',
        footer_disclaimer: 'Deze site is niet gelieerd aan, onderhouden door, goedgekeurd door of gesponsord door GraalOnline. Alle middelen ? 2026 GraalOnline',
        footer_terms: 'Algemene voorwaarden',
        footer_privacy: 'Privacybeleid',
        footer_cookie: 'Cookiebeleid',
        footer_dmca: 'DMCA-beleid'
    },
    no: {
        settings_mount: 'Mount',
        mount_speed_1: 'Mount-hastighet 1',
        mount_speed_2: 'Mount-hastighet 2',
        footer_site_made_by: 'Nettsted laget av',
        footer_disclaimer: 'Dette nettstedet er ikke tilknyttet, vedlikeholdt, godkjent eller sponset av GraalOnline. Alle ressurser ? 2026 GraalOnline',
        footer_terms: 'Vilk?r og betingelser',
        footer_privacy: 'Personvernerkl?ring',
        footer_cookie: 'Informasjonskapselpolicy',
        footer_dmca: 'DMCA-policy'
    },
    pl: {
        settings_mount: 'Wierzchowiec',
        mount_speed_1: 'Pr?dko?? wierzchowca 1',
        mount_speed_2: 'Pr?dko?? wierzchowca 2',
        footer_site_made_by: 'Strona stworzona przez',
        footer_disclaimer: 'Ta strona nie jest powi?zana, utrzymywana, wspierana ani sponsorowana przez GraalOnline. Wszystkie zasoby ? 2026 GraalOnline',
        footer_terms: 'Regulamin',
        footer_privacy: 'Polityka prywatno?ci',
        footer_cookie: 'Polityka plik?w cookie',
        footer_dmca: 'Polityka DMCA'
    },
    'pt-BR': {
        settings_mount: 'Montaria',
        mount_speed_1: 'Velocidade da montaria 1',
        mount_speed_2: 'Velocidade da montaria 2',
        footer_site_made_by: 'Site feito por',
        footer_disclaimer: 'Este site n\u00E3o \u00E9 afiliado, mantido, apoiado ou patrocinado pela GraalOnline. Todos os recursos \u00A9 2026 GraalOnline',
        footer_terms: 'Termos e Condi\u00E7\u00F5es',
        footer_privacy: 'Pol\u00EDtica de Privacidade',
        footer_cookie: 'Pol\u00EDtica de Cookies',
        footer_dmca: 'Pol\u00EDtica DMCA',
        exit_view_mode: 'Sair do modo de visualização'
    },
    'pt-PT': {
        settings_mount: 'Montaria',
        mount_speed_1: 'Velocidade da montaria 1',
        mount_speed_2: 'Velocidade da montaria 2',
        footer_site_made_by: 'Site feito por',
        footer_disclaimer: 'Este site n\u00E3o \u00E9 afiliado, mantido, apoiado ou patrocinado pela GraalOnline. Todos os recursos \u00A9 2026 GraalOnline',
        footer_terms: 'Termos e Condi\u00E7\u00F5es',
        footer_privacy: 'Pol\u00EDtica de Privacidade',
        footer_cookie: 'Pol\u00EDtica de Cookies',
        footer_dmca: 'Pol\u00EDtica DMCA'
    },
    fi: {
        settings_mount: 'Ratsu',
        mount_speed_1: 'Ratsun nopeus 1',
        mount_speed_2: 'Ratsun nopeus 2',
        footer_site_made_by: 'Sivuston teki',
        footer_disclaimer: 'T?m? sivusto ei ole GraalOnlineen liittyv?, yll?pit?m?, hyv?ksym? tai sponsoroima. Kaikki aineistot ? 2026 GraalOnline',
        footer_terms: 'K?ytt?ehdot',
        footer_privacy: 'Tietosuojak?yt?nt?',
        footer_cookie: 'Ev?stek?yt?nt?',
        footer_dmca: 'DMCA-k?yt?nt?'
    },
    sv: {
        settings_mount: 'Mount',
        mount_speed_1: 'Mount-hastighet 1',
        mount_speed_2: 'Mount-hastighet 2',
        footer_site_made_by: 'Sidan skapad av',
        footer_disclaimer: 'Denna sida ?r inte ansluten till, underh?llen av, godk?nd av eller sponsrad av GraalOnline. Alla tillg?ngar ? 2026 GraalOnline',
        footer_terms: 'Villkor',
        footer_privacy: 'Integritetspolicy',
        footer_cookie: 'Cookiepolicy',
        footer_dmca: 'DMCA-policy'
    },
    vi: {
        settings_mount: 'Th? c??i',
        mount_speed_1: 'T?c ?? th? c??i 1',
        mount_speed_2: 'T?c ?? th? c??i 2',
        footer_site_made_by: 'Trang web ???c t?o b?i',
        footer_disclaimer: 'Trang n?y kh?ng li?n k?t, ???c duy tr?, x?c nh?n ho?c t?i tr? b?i GraalOnline. M?i t?i s?n ? 2026 GraalOnline',
        footer_terms: '?i?u kho?n & ?i?u ki?n',
        footer_privacy: 'Ch?nh s?ch quy?n ri?ng t?',
        footer_cookie: 'Ch?nh s?ch Cookie',
        footer_dmca: 'Ch?nh s?ch DMCA'
    },
    tr: {
        settings_mount: 'Binek',
        mount_speed_1: 'Binek H?z? 1',
        mount_speed_2: 'Binek H?z? 2',
        footer_site_made_by: 'Siteyi yapan',
        footer_disclaimer: 'Bu site GraalOnline ile ba?lant?l? de?ildir; GraalOnline taraf?ndan y?netilmez, onaylanmaz veya sponsorlanmaz. T?m varl?klar ? 2026 GraalOnline',
        footer_terms: '?artlar ve Ko?ullar',
        footer_privacy: 'Gizlilik Politikas?',
        footer_cookie: '?erez Politikas?',
        footer_dmca: 'DMCA Politikas?'
    },
    zh: {
        settings_mount: '??',
        mount_speed_1: '???? 1',
        mount_speed_2: '???? 2',
        footer_site_made_by: '?????',
        footer_disclaimer: '???? GraalOnline ??????? GraalOnline ????????????? ? 2026 GraalOnline',
        footer_terms: '?????',
        footer_privacy: '????',
        footer_cookie: 'Cookie ??',
        footer_dmca: 'DMCA ??'
    },
    ja: {
        settings_mount: '????',
        mount_speed_1: '?????? 1',
        mount_speed_2: '?????? 2',
        footer_site_made_by: '?????',
        footer_disclaimer: '?????? GraalOnline ?????????????????????????? ? 2026 GraalOnline',
        footer_terms: '????',
        footer_privacy: '??????????',
        footer_cookie: '????????',
        footer_dmca: 'DMCA????'
    },
    ko: {
        settings_mount: '??',
        mount_speed_1: '?? ?? 1',
        mount_speed_2: '?? ?? 2',
        footer_site_made_by: '??? ??',
        footer_disclaimer: '? ???? GraalOnline? ??, ????, ?? ?? ??? ?? ????. ?? ?? ? 2026 GraalOnline',
        footer_terms: '????',
        footer_privacy: '???? ????',
        footer_cookie: '?? ??',
        footer_dmca: 'DMCA ??'
    }};
Object.keys(I18N_EXTRA).forEach((lang) => {
    I18N[lang] = { ...(I18N[lang] || {}), ...I18N_EXTRA[lang] };
});

const I18N_SECTION_OVERRIDES = {
    ar: {
        menu_profile: 'Ã˜Â§Ã™â€žÃ™â€¦Ã™â€žÃ™Â Ã˜Â§Ã™â€žÃ˜Â´Ã˜Â®Ã˜ÂµÃ™Å ',
        menu_friends: 'Ã˜Â§Ã™â€žÃ˜Â£Ã˜ÂµÃ˜Â¯Ã™â€šÃ˜Â§Ã˜Â¡',
        menu_logout: 'Ã˜ÂªÃ˜Â³Ã˜Â¬Ã™Å Ã™â€ž Ã˜Â§Ã™â€žÃ˜Â®Ã˜Â±Ã™Ë†Ã˜Â¬',
        achievements_title: 'Ã˜Â§Ã™â€žÃ˜Â¥Ã™â€ Ã˜Â¬Ã˜Â§Ã˜Â²Ã˜Â§Ã˜Âª',
        highlights_title: 'Ã˜Â£Ã˜Â¨Ã˜Â±Ã˜Â² Ã˜Â§Ã™â€žÃ™â€žÃ™â€šÃ˜Â·Ã˜Â§Ã˜Âª',
        profile_settings_title: 'Ã˜Â¥Ã˜Â¹Ã˜Â¯Ã˜Â§Ã˜Â¯Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ™â€¦Ã™â€žÃ™Â Ã˜Â§Ã™â€žÃ˜Â´Ã˜Â®Ã˜ÂµÃ™Å ',
        friends_title: 'Ã˜Â§Ã™â€žÃ˜Â£Ã˜ÂµÃ˜Â¯Ã™â€šÃ˜Â§Ã˜Â¡',
        friends_subtitle: 'Ã˜Â£Ã˜Â¶Ã™Â Ã˜Â£Ã˜ÂµÃ˜Â¯Ã™â€šÃ˜Â§Ã˜Â¡Ã™Æ’ Ã™Ë†Ã˜Â§Ã˜Â¹Ã˜Â±Ã˜Â¶ Ã™â€ Ã˜ÂªÃ˜Â§Ã˜Â¦Ã˜Â¬Ã™â€¡Ã™â€¦',
        add_highlight_btn: '+ Ã˜Â¥Ã˜Â¶Ã˜Â§Ã™ÂÃ˜Â© Ã™â€žÃ™â€šÃ˜Â·Ã˜Â©',
        add_friend: 'Ã˜Â¥Ã˜Â¶Ã˜Â§Ã™ÂÃ˜Â© Ã˜ÂµÃ˜Â¯Ã™Å Ã™â€š',
        show: 'Ã˜Â¹Ã˜Â±Ã˜Â¶',
        hide: 'Ã˜Â¥Ã˜Â®Ã™ÂÃ˜Â§Ã˜Â¡'
    },
    bn: {
        menu_profile: 'Ã Â¦ÂªÃ Â§ÂÃ Â¦Â°Ã Â§â€¹Ã Â¦Â«Ã Â¦Â¾Ã Â¦â€¡Ã Â¦Â²',
        menu_friends: 'Ã Â¦Â¬Ã Â¦Â¨Ã Â§ÂÃ Â¦Â§Ã Â§ÂÃ Â¦Â°Ã Â¦Â¾',
        menu_logout: 'Ã Â¦Â²Ã Â¦â€” Ã Â¦â€ Ã Â¦â€°Ã Â¦Å¸',
        achievements_title: 'Ã Â¦â€¦Ã Â¦Â°Ã Â§ÂÃ Â¦Å“Ã Â¦Â¨Ã Â¦Â¸Ã Â¦Â®Ã Â§â€šÃ Â¦Â¹',
        highlights_title: 'Ã Â¦Â¹Ã Â¦Â¾Ã Â¦â€¡Ã Â¦Â²Ã Â¦Â¾Ã Â¦â€¡Ã Â¦Å¸Ã Â¦Â¸',
        profile_settings_title: 'Ã Â¦ÂªÃ Â§ÂÃ Â¦Â°Ã Â§â€¹Ã Â¦Â«Ã Â¦Â¾Ã Â¦â€¡Ã Â¦Â² Ã Â¦Â¸Ã Â§â€¡Ã Â¦Å¸Ã Â¦Â¿Ã Â¦â€šÃ Â¦Â¸',
        friends_title: 'Ã Â¦Â¬Ã Â¦Â¨Ã Â§ÂÃ Â¦Â§Ã Â§ÂÃ Â¦Â°Ã Â¦Â¾',
        friends_subtitle: 'Ã Â¦â€ Ã Â¦ÂªÃ Â¦Â¨Ã Â¦Â¾Ã Â¦Â° Ã Â¦Â¬Ã Â¦Â¨Ã Â§ÂÃ Â¦Â§Ã Â§ÂÃ Â¦Â¦Ã Â§â€¡Ã Â¦Â° Ã Â¦Â¬Ã Â§â€¡Ã Â¦Å¾Ã Â§ÂÃ Â¦Å¡Ã Â¦Â®Ã Â¦Â¾Ã Â¦Â°Ã Â§ÂÃ Â¦â€¢ Ã Â¦Â¯Ã Â§â€¹Ã Â¦â€” Ã Â¦â€¢Ã Â¦Â°Ã Â§ÂÃ Â¦Â¨ Ã Â¦ÂÃ Â¦Â¬Ã Â¦â€š Ã Â¦Â¦Ã Â§â€¡Ã Â¦â€“Ã Â§ÂÃ Â¦Â¨',
        add_highlight_btn: '+ Ã Â¦Â¹Ã Â¦Â¾Ã Â¦â€¡Ã Â¦Â²Ã Â¦Â¾Ã Â¦â€¡Ã Â¦Å¸ Ã Â¦Â¯Ã Â§â€¹Ã Â¦â€” Ã Â¦â€¢Ã Â¦Â°Ã Â§ÂÃ Â¦Â¨',
        add_friend: 'Ã Â¦Â¬Ã Â¦Â¨Ã Â§ÂÃ Â¦Â§Ã Â§Â Ã Â¦Â¯Ã Â§â€¹Ã Â¦â€” Ã Â¦â€¢Ã Â¦Â°Ã Â§ÂÃ Â¦Â¨',
        show: 'Ã Â¦Â¦Ã Â§â€¡Ã Â¦â€“Ã Â¦Â¾Ã Â¦Â¨',
        hide: 'Ã Â¦Â²Ã Â§ÂÃ Â¦â€¢Ã Â¦Â¾Ã Â¦Â¨'
    },
    da: {
        menu_profile: 'Profil',
        menu_friends: 'Venner',
        menu_logout: 'Log ud',
        achievements_title: 'PrÃƒÂ¦stationer',
        highlights_title: 'HÃƒÂ¸jdepunkter',
        profile_settings_title: 'Profilindstillinger',
        friends_title: 'Venner',
        friends_subtitle: 'TilfÃƒÂ¸j og se dine venners benchmarks',
        add_highlight_btn: '+ TilfÃƒÂ¸j hÃƒÂ¸jdepunkt',
        add_friend: 'TilfÃƒÂ¸j ven',
        show: 'Vis',
        hide: 'Skjul'
    },
    de: {
        menu_profile: 'Profil',
        menu_friends: 'Freunde',
        menu_logout: 'Abmelden',
        achievements_title: 'Erfolge',
        highlights_title: 'Highlights',
        profile_settings_title: 'Profileinstellungen',
        friends_title: 'Freunde',
        friends_subtitle: 'FÃƒÂ¼ge die Benchmarks deiner Freunde hinzu und sieh sie dir an',
        add_highlight_btn: '+ Highlight hinzufÃƒÂ¼gen',
        add_friend: 'Freund hinzufÃƒÂ¼gen',
        show: 'Anzeigen',
        hide: 'Ausblenden'
    },
    fil: {
        menu_profile: 'Profile',
        menu_friends: 'Mga Kaibigan',
        menu_logout: 'Mag-log out',
        achievements_title: 'Mga Achievement',
        highlights_title: 'Mga Highlight',
        profile_settings_title: 'Mga Setting ng Profile',
        friends_title: 'Mga Kaibigan',
        friends_subtitle: 'Idagdag at tingnan ang benchmarks ng iyong mga kaibigan',
        add_highlight_btn: '+ Magdagdag ng Highlight',
        add_friend: 'Magdagdag ng Kaibigan',
        show: 'Ipakita',
        hide: 'Itago'
    },
    fr: {
        menu_profile: 'Profil',
        menu_friends: 'Amis',
        menu_logout: 'Se dÃƒÂ©connecter',
        achievements_title: 'SuccÃƒÂ¨s',
        highlights_title: 'Moments forts',
        profile_settings_title: 'ParamÃƒÂ¨tres du profil',
        friends_title: 'Amis',
        friends_subtitle: 'Ajoutez et consultez les benchmarks de vos amis',
        add_highlight_btn: '+ Ajouter un moment fort',
        add_friend: 'Ajouter un ami',
        show: 'Afficher',
        hide: 'Masquer'
    },
    hmn: {
        menu_profile: 'Profile',
        menu_friends: 'Friends',
        menu_logout: 'Log Out',
        achievements_title: 'Achievements',
        highlights_title: 'Highlights',
        profile_settings_title: 'Profile Settings',
        friends_title: 'Friends',
        friends_subtitle: 'Add and view your friends benchmarks',
        add_highlight_btn: '+ Add Highlight',
        add_friend: 'Add Friend',
        show: 'Show',
        hide: 'Hide'
    },
    id: {
        menu_profile: 'Profil',
        menu_friends: 'Teman',
        menu_logout: 'Keluar',
        achievements_title: 'Pencapaian',
        highlights_title: 'Sorotan',
        profile_settings_title: 'Pengaturan Profil',
        friends_title: 'Teman',
        friends_subtitle: 'Tambahkan dan lihat benchmark teman Anda',
        add_highlight_btn: '+ Tambah Sorotan',
        add_friend: 'Tambah Teman',
        show: 'Tampilkan',
        hide: 'Sembunyikan'
    },
    it: {
        menu_profile: 'Profilo',
        menu_friends: 'Amici',
        menu_logout: 'Disconnetti',
        achievements_title: 'Obiettivi',
        highlights_title: 'In evidenza',
        profile_settings_title: 'Impostazioni profilo',
        friends_title: 'Amici',
        friends_subtitle: 'Aggiungi e visualizza i benchmark dei tuoi amici',
        add_highlight_btn: '+ Aggiungi evidenza',
        add_friend: 'Aggiungi amico',
        show: 'Mostra',
        hide: 'Nascondi'
    },
    hu: {
        menu_profile: 'Profil',
        menu_friends: 'BarÃƒÂ¡tok',
        menu_logout: 'KijelentkezÃƒÂ©s',
        achievements_title: 'EredmÃƒÂ©nyek',
        highlights_title: 'KiemelÃƒÂ©sek',
        profile_settings_title: 'ProfilbeÃƒÂ¡llÃƒÂ­tÃƒÂ¡sok',
        friends_title: 'BarÃƒÂ¡tok',
        friends_subtitle: 'Add hozzÃƒÂ¡ ÃƒÂ©s nÃƒÂ©zd meg barÃƒÂ¡taid benchmarkjait',
        add_highlight_btn: '+ KiemelÃƒÂ©s hozzÃƒÂ¡adÃƒÂ¡sa',
        add_friend: 'BarÃƒÂ¡t hozzÃƒÂ¡adÃƒÂ¡sa',
        show: 'MegjelenÃƒÂ­tÃƒÂ©s',
        hide: 'ElrejtÃƒÂ©s'
    },
    ms: {
        menu_profile: 'Profil',
        menu_friends: 'Rakan',
        menu_logout: 'Log Keluar',
        achievements_title: 'Pencapaian',
        highlights_title: 'Sorotan',
        profile_settings_title: 'Tetapan Profil',
        friends_title: 'Rakan',
        friends_subtitle: 'Tambah dan lihat benchmark rakan anda',
        add_highlight_btn: '+ Tambah Sorotan',
        add_friend: 'Tambah Rakan',
        show: 'Papar',
        hide: 'Sembunyi'
    },
    nl: {
        menu_profile: 'Profiel',
        menu_friends: 'Vrienden',
        menu_logout: 'Uitloggen',
        achievements_title: 'Prestaties',
        highlights_title: 'Hoogtepunten',
        profile_settings_title: 'Profielinstellingen',
        friends_title: 'Vrienden',
        friends_subtitle: 'Voeg benchmarks van je vrienden toe en bekijk ze',
        add_highlight_btn: '+ Hoogtepunt toevoegen',
        add_friend: 'Vriend toevoegen',
        show: 'Tonen',
        hide: 'Verbergen'
    },
    no: {
        menu_profile: 'Profil',
        menu_friends: 'Venner',
        menu_logout: 'Logg ut',
        achievements_title: 'Prestasjoner',
        highlights_title: 'HÃƒÂ¸ydepunkter',
        profile_settings_title: 'Profilinnstillinger',
        friends_title: 'Venner',
        friends_subtitle: 'Legg til og se vennenes benchmarker',
        add_highlight_btn: '+ Legg til hÃƒÂ¸ydepunkt',
        add_friend: 'Legg til venn',
        show: 'Vis',
        hide: 'Skjul'
    },
    pl: {
        menu_profile: 'Profil',
        menu_friends: 'Znajomi',
        menu_logout: 'Wyloguj siÃ„â„¢',
        achievements_title: 'OsiÃ„â€¦gniÃ„â„¢cia',
        highlights_title: 'WyrÃƒÂ³Ã…Â¼nienia',
        profile_settings_title: 'Ustawienia profilu',
        friends_title: 'Znajomi',
        friends_subtitle: 'Dodawaj i przeglÃ„â€¦daj benchmarki znajomych',
        add_highlight_btn: '+ Dodaj wyrÃƒÂ³Ã…Â¼nienie',
        add_friend: 'Dodaj znajomego',
        show: 'PokaÃ…Â¼',
        hide: 'Ukryj'
    },
    'pt-PT': {
        menu_profile: 'Perfil',
        menu_friends: 'Amigos',
        menu_logout: 'Terminar sess\u00E3o',
        achievements_title: 'Conquistas',
        highlights_title: 'Destaques',
        profile_settings_title: 'Defini\u00E7\u00F5es do Perfil',
        friends_title: 'Amigos',
        friends_subtitle: 'Adicione e veja os benchmarks dos seus amigos',
        add_highlight_btn: '+ Adicionar destaque',
        add_friend: 'Adicionar amigo',
        show: 'Mostrar',
        hide: 'Ocultar'
    },
    fi: {
        menu_profile: 'Profiili',
        menu_friends: 'YstÃƒÂ¤vÃƒÂ¤t',
        menu_logout: 'Kirjaudu ulos',
        achievements_title: 'Saavutukset',
        highlights_title: 'Kohokohdat',
        profile_settings_title: 'Profiilin asetukset',
        friends_title: 'YstÃƒÂ¤vÃƒÂ¤t',
        friends_subtitle: 'LisÃƒÂ¤ÃƒÂ¤ ja katso ystÃƒÂ¤viesi benchmarkit',
        add_highlight_btn: '+ LisÃƒÂ¤ÃƒÂ¤ kohokohta',
        add_friend: 'LisÃƒÂ¤ÃƒÂ¤ ystÃƒÂ¤vÃƒÂ¤',
        show: 'NÃƒÂ¤ytÃƒÂ¤',
        hide: 'Piilota'
    },
    sv: {
        menu_profile: 'Profil',
        menu_friends: 'VÃƒÂ¤nner',
        menu_logout: 'Logga ut',
        achievements_title: 'Prestationer',
        highlights_title: 'HÃƒÂ¶jdpunkter',
        profile_settings_title: 'ProfilinstÃƒÂ¤llningar',
        friends_title: 'VÃƒÂ¤nner',
        friends_subtitle: 'LÃƒÂ¤gg till och se dina vÃƒÂ¤nners benchmarkar',
        add_highlight_btn: '+ LÃƒÂ¤gg till hÃƒÂ¶jdpunkt',
        add_friend: 'LÃƒÂ¤gg till vÃƒÂ¤n',
        show: 'Visa',
        hide: 'DÃƒÂ¶lj'
    },
    vi: {
        menu_profile: 'HÃ¡Â»â€œ sÃ†Â¡',
        menu_friends: 'BÃ¡ÂºÂ¡n bÃƒÂ¨',
        menu_logout: 'Ã„ÂÃ„Æ’ng xuÃ¡ÂºÂ¥t',
        achievements_title: 'ThÃƒÂ nh tÃƒÂ­ch',
        highlights_title: 'Ã„ÂiÃ¡Â»Æ’m nÃ¡Â»â€¢i bÃ¡ÂºÂ­t',
        profile_settings_title: 'CÃƒÂ i Ã„â€˜Ã¡ÂºÂ·t hÃ¡Â»â€œ sÃ†Â¡',
        friends_title: 'BÃ¡ÂºÂ¡n bÃƒÂ¨',
        friends_subtitle: 'ThÃƒÂªm vÃƒÂ  xem benchmark cÃ¡Â»Â§a bÃ¡ÂºÂ¡n bÃƒÂ¨',
        add_highlight_btn: '+ ThÃƒÂªm Ã„â€˜iÃ¡Â»Æ’m nÃ¡Â»â€¢i bÃ¡ÂºÂ­t',
        add_friend: 'ThÃƒÂªm bÃ¡ÂºÂ¡n',
        show: 'HiÃ¡Â»â€¡n',
        hide: 'Ã¡ÂºÂ¨n'
    },
    tr: {
        menu_profile: 'Profil',
        menu_friends: 'ArkadaÃ…Å¸lar',
        menu_logout: 'Ãƒâ€¡Ã„Â±kÃ„Â±Ã…Å¸ Yap',
        achievements_title: 'BaÃ…Å¸arÃ„Â±lar',
        highlights_title: 'Ãƒâ€“ne Ãƒâ€¡Ã„Â±kanlar',
        profile_settings_title: 'Profil AyarlarÃ„Â±',
        friends_title: 'ArkadaÃ…Å¸lar',
        friends_subtitle: 'ArkadaÃ…Å¸larÃ„Â±nÃ„Â±zÃ„Â±n benchmarklarÃ„Â±nÃ„Â± ekleyin ve gÃƒÂ¶rÃƒÂ¼ntÃƒÂ¼leyin',
        add_highlight_btn: '+ Ãƒâ€“ne Ãƒâ€¡Ã„Â±kan Ekle',
        add_friend: 'ArkadaÃ…Å¸ Ekle',
        show: 'GÃƒÂ¶ster',
        hide: 'Gizle'
    },
    zh: {
        menu_profile: 'Ã¤Â¸ÂªÃ¤ÂºÂºÃ¨Âµâ€žÃ¦â€“â„¢',
        menu_friends: 'Ã¥Â¥Â½Ã¥Ââ€¹',
        menu_logout: 'Ã©â‚¬â‚¬Ã¥â€¡ÂºÃ§â„¢Â»Ã¥Â½â€¢',
        achievements_title: 'Ã¦Ë†ÂÃ¥Â°Â±',
        highlights_title: 'Ã§Â²Â¾Ã¥Â½Â©Ã¦â€”Â¶Ã¥Ë†Â»',
        profile_settings_title: 'Ã¤Â¸ÂªÃ¤ÂºÂºÃ¨Âµâ€žÃ¦â€“â„¢Ã¨Â®Â¾Ã§Â½Â®',
        friends_title: 'Ã¥Â¥Â½Ã¥Ââ€¹',
        friends_subtitle: 'Ã¦Â·Â»Ã¥Å Â Ã¥Â¹Â¶Ã¦Å¸Â¥Ã§Å“â€¹Ã¥Â¥Â½Ã¥Ââ€¹Ã§Å¡â€žÃ¥Å¸ÂºÃ¥â€¡â€ Ã¦Ë†ÂÃ§Â»Â©',
        add_highlight_btn: '+ Ã¦Â·Â»Ã¥Å Â Ã§Â²Â¾Ã¥Â½Â©Ã¦â€”Â¶Ã¥Ë†Â»',
        add_friend: 'Ã¦Â·Â»Ã¥Å Â Ã¥Â¥Â½Ã¥Ââ€¹',
        show: 'Ã¦ËœÂ¾Ã§Â¤Âº',
        hide: 'Ã©Å¡ÂÃ¨â€”Â'
    },
    ja: {
        menu_profile: 'Ã£Æ’â€”Ã£Æ’Â­Ã£Æ’â€¢Ã£â€šÂ£Ã£Æ’Â¼Ã£Æ’Â«',
        menu_friends: 'Ã¥Ââ€¹Ã©Ââ€',
        menu_logout: 'Ã£Æ’Â­Ã£â€šÂ°Ã£â€šÂ¢Ã£â€šÂ¦Ã£Æ’Ë†',
        achievements_title: 'Ã¥Â®Å¸Ã§Â¸Â¾',
        highlights_title: 'Ã£Æ’ÂÃ£â€šÂ¤Ã£Æ’Â©Ã£â€šÂ¤Ã£Æ’Ë†',
        profile_settings_title: 'Ã£Æ’â€”Ã£Æ’Â­Ã£Æ’â€¢Ã£â€šÂ£Ã£Æ’Â¼Ã£Æ’Â«Ã¨Â¨Â­Ã¥Â®Å¡',
        friends_title: 'Ã¥Ââ€¹Ã©Ââ€',
        friends_subtitle: 'Ã¥Ââ€¹Ã©Ââ€Ã£ÂÂ®Ã£Æ’â„¢Ã£Æ’Â³Ã£Æ’ÂÃ£Æ’Å¾Ã£Æ’Â¼Ã£â€šÂ¯Ã£â€šâ€™Ã¨Â¿Â½Ã¥Å Â Ã£Ââ€”Ã£ÂÂ¦Ã¨Â¡Â¨Ã§Â¤Âº',
        add_highlight_btn: '+ Ã£Æ’ÂÃ£â€šÂ¤Ã£Æ’Â©Ã£â€šÂ¤Ã£Æ’Ë†Ã£â€šâ€™Ã¨Â¿Â½Ã¥Å Â ',
        add_friend: 'Ã¥Ââ€¹Ã©Ââ€Ã£â€šâ€™Ã¨Â¿Â½Ã¥Å Â ',
        show: 'Ã¨Â¡Â¨Ã§Â¤Âº',
        hide: 'Ã©ÂÅ¾Ã¨Â¡Â¨Ã§Â¤Âº'
    },
    ko: {
        menu_profile: 'Ã­â€â€žÃ«Â¡Å“Ã­â€¢â€ž',
        menu_friends: 'Ã¬Â¹Å“ÃªÂµÂ¬',
        menu_logout: 'Ã«Â¡Å“ÃªÂ·Â¸Ã¬â€¢â€žÃ¬â€ºÆ’',
        achievements_title: 'Ã¬â€”â€¦Ã¬Â Â',
        highlights_title: 'Ã­â€¢ËœÃ¬ÂÂ´Ã«ÂÂ¼Ã¬ÂÂ´Ã­Å Â¸',
        profile_settings_title: 'Ã­â€â€žÃ«Â¡Å“Ã­â€¢â€ž Ã¬â€žÂ¤Ã¬Â â€¢',
        friends_title: 'Ã¬Â¹Å“ÃªÂµÂ¬',
        friends_subtitle: 'Ã¬Â¹Å“ÃªÂµÂ¬Ã¬ÂËœ Ã«Â²Â¤Ã¬Â¹ËœÃ«Â§Ë†Ã­ÂÂ¬Ã«Â¥Â¼ Ã¬Â¶â€ÃªÂ°â‚¬Ã­â€¢ËœÃªÂ³Â  Ã­â„¢â€¢Ã¬ÂÂ¸Ã­â€¢ËœÃ¬â€žÂ¸Ã¬Å¡â€',
        add_highlight_btn: '+ Ã­â€¢ËœÃ¬ÂÂ´Ã«ÂÂ¼Ã¬ÂÂ´Ã­Å Â¸ Ã¬Â¶â€ÃªÂ°â‚¬',
        add_friend: 'Ã¬Â¹Å“ÃªÂµÂ¬ Ã¬Â¶â€ÃªÂ°â‚¬',
        show: 'Ã­â€˜Å“Ã¬â€¹Å“',
        hide: 'Ã¬Ë†Â¨ÃªÂ¸Â°ÃªÂ¸Â°'
    }
};
Object.keys(I18N_SECTION_OVERRIDES).forEach((lang) => {
    I18N[lang] = { ...(I18N[lang] || {}), ...I18N_SECTION_OVERRIDES[lang] };
});

const I18N_SECTION_PATCH = {
    ar: {
        seasonal_modal_title: 'Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â±Ã˜Â§Ã™Æ’Ã˜Â² Ã˜Â§Ã™â€žÃ™â€¦Ã™Ë†Ã˜Â³Ã™â€¦Ã™Å Ã˜Â©',
        seasonal_modal_subtitle: 'Ã˜Â£Ã˜Â¶Ã™Â Ã˜Â§Ã™â€žÃ™Æ’Ã˜Â¤Ã™Ë†Ã˜Â³ Ã˜Â§Ã™â€žÃ˜ÂªÃ™Å  Ã˜Â­Ã˜ÂµÃ™â€žÃ˜Âª Ã˜Â¹Ã™â€žÃ™Å Ã™â€¡Ã˜Â§',
        seasonal_current_total: 'Ã˜Â¥Ã˜Â¬Ã™â€¦Ã˜Â§Ã™â€žÃ™Å  Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â±Ã˜Â§Ã™Æ’Ã˜Â² Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â§Ã™â€žÃ™Å Ã˜Â©',
        seasonal_total_label: 'Ã˜Â§Ã™â€žÃ˜Â¥Ã˜Â¬Ã™â€¦Ã˜Â§Ã™â€žÃ™Å ',
        seasonal_reset_values: 'Ã˜Â¥Ã˜Â¹Ã˜Â§Ã˜Â¯Ã˜Â© Ã˜ÂªÃ˜Â¹Ã™Å Ã™Å Ã™â€  Ã˜Â§Ã™â€žÃ™â€šÃ™Å Ã™â€¦',
        seasonal_save_placements: 'Ã˜Â­Ã™ÂÃ˜Â¸ Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â±Ã˜Â§Ã™Æ’Ã˜Â²',
        friends_none: 'Ã™â€žÃ˜Â§ Ã™Å Ã™Ë†Ã˜Â¬Ã˜Â¯ Ã˜Â£Ã˜ÂµÃ˜Â¯Ã™â€šÃ˜Â§Ã˜Â¡ Ã˜Â¨Ã˜Â¹Ã˜Â¯.',
        friend_requests_none: 'Ã™â€žÃ˜Â§ Ã˜ÂªÃ™Ë†Ã˜Â¬Ã˜Â¯ Ã˜Â·Ã™â€žÃ˜Â¨Ã˜Â§Ã˜Âª Ã˜ÂµÃ˜Â¯Ã˜Â§Ã™â€šÃ˜Â©.',
        remove_friends_none: 'Ã™â€žÃ˜Â§ Ã™Å Ã™Ë†Ã˜Â¬Ã˜Â¯ Ã˜Â£Ã˜ÂµÃ˜Â¯Ã™â€šÃ˜Â§Ã˜Â¡ Ã™â€žÃ˜Â¥Ã˜Â²Ã˜Â§Ã™â€žÃ˜ÂªÃ™â€¡Ã™â€¦.',
        highlight_modal_title: 'Ã˜Â¥Ã˜Â¶Ã˜Â§Ã™ÂÃ˜Â© Ã™â€žÃ™â€šÃ˜Â·Ã˜Â© Ã˜Â¨Ã˜Â§Ã˜Â±Ã˜Â²Ã˜Â©',
        highlight_label_image: 'Ã˜ÂµÃ™Ë†Ã˜Â±Ã˜Â©',
        highlight_click_upload: 'Ã˜Â§Ã™â€ Ã™â€šÃ˜Â± Ã™â€žÃ˜Â±Ã™ÂÃ˜Â¹ Ã˜ÂµÃ™Ë†Ã˜Â±Ã˜Â©',
        achievement_completed: 'Ã™â€¦Ã™Æ’Ã˜ÂªÃ™â€¦Ã™â€ž',
        achievement_incomplete: 'Ã˜ÂºÃ™Å Ã˜Â± Ã™â€¦Ã™Æ’Ã˜ÂªÃ™â€¦Ã™â€ž',
        achievement_upload_image: 'Ã˜Â±Ã™ÂÃ˜Â¹ Ã˜ÂµÃ™Ë†Ã˜Â±Ã˜Â©',
        achievement_enter_friend_name: 'Ã˜Â£Ã˜Â¯Ã˜Â®Ã™â€ž Ã˜Â§Ã˜Â³Ã™â€¦ Ã˜Â§Ã™â€žÃ˜ÂµÃ˜Â¯Ã™Å Ã™â€š'
    },
    bn: {
        seasonal_modal_title: 'Ã Â¦Â®Ã Â§Å’Ã Â¦Â¸Ã Â§ÂÃ Â¦Â®Ã Â¦Â¿ Ã Â¦â€¦Ã Â¦Â¬Ã Â¦Â¸Ã Â§ÂÃ Â¦Â¥Ã Â¦Â¾Ã Â¦Â¨',
        seasonal_modal_subtitle: 'Ã Â¦â€ Ã Â¦ÂªÃ Â¦Â¨Ã Â¦Â¾Ã Â¦Â° Ã Â¦â€¦Ã Â¦Â°Ã Â§ÂÃ Â¦Å“Ã Â¦Â¿Ã Â¦Â¤ Ã Â¦Å¸Ã Â§ÂÃ Â¦Â°Ã Â¦Â«Ã Â¦Â¿Ã Â¦â€”Ã Â§ÂÃ Â¦Â²Ã Â§â€¹ Ã Â¦Â¯Ã Â§â€¹Ã Â¦â€” Ã Â¦â€¢Ã Â¦Â°Ã Â§ÂÃ Â¦Â¨',
        seasonal_current_total: 'Ã Â¦Â¬Ã Â¦Â°Ã Â§ÂÃ Â¦Â¤Ã Â¦Â®Ã Â¦Â¾Ã Â¦Â¨ Ã Â¦Â®Ã Â§â€¹Ã Â¦Å¸ Ã Â¦â€¦Ã Â¦Â¬Ã Â¦Â¸Ã Â§ÂÃ Â¦Â¥Ã Â¦Â¾Ã Â¦Â¨',
        seasonal_total_label: 'Ã Â¦Â®Ã Â§â€¹Ã Â¦Å¸',
        seasonal_reset_values: 'Ã Â¦Â®Ã Â¦Â¾Ã Â¦Â¨ Ã Â¦Â°Ã Â¦Â¿Ã Â¦Â¸Ã Â§â€¡Ã Â¦Å¸ Ã Â¦â€¢Ã Â¦Â°Ã Â§ÂÃ Â¦Â¨',
        seasonal_save_placements: 'Ã Â¦â€¦Ã Â¦Â¬Ã Â¦Â¸Ã Â§ÂÃ Â¦Â¥Ã Â¦Â¾Ã Â¦Â¨ Ã Â¦Â¸Ã Â¦â€šÃ Â¦Â°Ã Â¦â€¢Ã Â§ÂÃ Â¦Â·Ã Â¦Â£ Ã Â¦â€¢Ã Â¦Â°Ã Â§ÂÃ Â¦Â¨',
        friends_none: 'Ã Â¦ÂÃ Â¦â€“Ã Â¦Â¨Ã Â¦â€œ Ã Â¦â€¢Ã Â§â€¹Ã Â¦Â¨Ã Â§â€¹ Ã Â¦Â¬Ã Â¦Â¨Ã Â§ÂÃ Â¦Â§Ã Â§Â Ã Â¦Â¨Ã Â§â€¡Ã Â¦â€¡Ã Â¥Â¤',
        friend_requests_none: 'Ã Â¦â€¢Ã Â§â€¹Ã Â¦Â¨Ã Â§â€¹ Ã Â¦Â«Ã Â§ÂÃ Â¦Â°Ã Â§â€¡Ã Â¦Â¨Ã Â§ÂÃ Â¦Â¡ Ã Â¦Â°Ã Â¦Â¿Ã Â¦â€¢Ã Â§â€¹Ã Â§Å¸Ã Â§â€¡Ã Â¦Â¸Ã Â§ÂÃ Â¦Å¸ Ã Â¦Â¨Ã Â§â€¡Ã Â¦â€¡Ã Â¥Â¤',
        remove_friends_none: 'Ã Â¦Â¸Ã Â¦Â°Ã Â¦Â¾Ã Â¦Â¨Ã Â§â€¹Ã Â¦Â° Ã Â¦Å“Ã Â¦Â¨Ã Â§ÂÃ Â¦Â¯ Ã Â¦â€¢Ã Â§â€¹Ã Â¦Â¨Ã Â§â€¹ Ã Â¦Â¬Ã Â¦Â¨Ã Â§ÂÃ Â¦Â§Ã Â§Â Ã Â¦Â¨Ã Â§â€¡Ã Â¦â€¡Ã Â¥Â¤',
        highlight_modal_title: 'Ã Â¦Â¹Ã Â¦Â¾Ã Â¦â€¡Ã Â¦Â²Ã Â¦Â¾Ã Â¦â€¡Ã Â¦Å¸ Ã Â¦Â¯Ã Â§â€¹Ã Â¦â€” Ã Â¦â€¢Ã Â¦Â°Ã Â§ÂÃ Â¦Â¨',
        highlight_label_image: 'Ã Â¦â€ºÃ Â¦Â¬Ã Â¦Â¿',
        highlight_click_upload: 'Ã Â¦â€ºÃ Â¦Â¬Ã Â¦Â¿ Ã Â¦â€ Ã Â¦ÂªÃ Â¦Â²Ã Â§â€¹Ã Â¦Â¡ Ã Â¦â€¢Ã Â¦Â°Ã Â¦Â¤Ã Â§â€¡ Ã Â¦â€¢Ã Â§ÂÃ Â¦Â²Ã Â¦Â¿Ã Â¦â€¢ Ã Â¦â€¢Ã Â¦Â°Ã Â§ÂÃ Â¦Â¨',
        achievement_completed: 'Ã Â¦Â¸Ã Â¦Â®Ã Â§ÂÃ Â¦ÂªÃ Â¦Â¨Ã Â§ÂÃ Â¦Â¨',
        achievement_incomplete: 'Ã Â¦â€¦Ã Â¦Â¸Ã Â¦Â®Ã Â§ÂÃ Â¦ÂªÃ Â§â€šÃ Â¦Â°Ã Â§ÂÃ Â¦Â£',
        achievement_upload_image: 'Ã Â¦â€ºÃ Â¦Â¬Ã Â¦Â¿ Ã Â¦â€ Ã Â¦ÂªÃ Â¦Â²Ã Â§â€¹Ã Â¦Â¡ Ã Â¦â€¢Ã Â¦Â°Ã Â§ÂÃ Â¦Â¨',
        achievement_enter_friend_name: 'Ã Â¦Â¬Ã Â¦Â¨Ã Â§ÂÃ Â¦Â§Ã Â§ÂÃ Â¦Â° Ã Â¦Â¨Ã Â¦Â¾Ã Â¦Â® Ã Â¦Â²Ã Â¦Â¿Ã Â¦â€“Ã Â§ÂÃ Â¦Â¨'
    },
    da: {
        seasonal_modal_title: 'SÃƒÂ¦sonplaceringer',
        seasonal_modal_subtitle: 'TilfÃƒÂ¸j dine optjente trofÃƒÂ¦er',
        seasonal_current_total: 'NuvÃƒÂ¦rende samlede placeringer',
        seasonal_total_label: 'I alt',
        seasonal_reset_values: 'Nulstil vÃƒÂ¦rdier',
        seasonal_save_placements: 'Gem placeringer',
        friends_none: 'Ingen venner endnu.',
        friend_requests_none: 'Ingen venneanmodninger.',
        remove_friends_none: 'Ingen venner at fjerne.',
        highlight_modal_title: 'TilfÃƒÂ¸j hÃƒÂ¸jdepunkt',
        highlight_label_image: 'Billede',
        highlight_click_upload: 'Klik for at uploade billede',
        achievement_completed: 'FuldfÃƒÂ¸rt',
        achievement_incomplete: 'Ikke fuldfÃƒÂ¸rt',
        achievement_upload_image: 'Upload billede',
        achievement_enter_friend_name: 'Indtast vens navn'
    },
    de: {
        seasonal_modal_title: 'Saisonplatzierungen',
        seasonal_modal_subtitle: 'FÃƒÂ¼ge deine verdienten TrophÃƒÂ¤en hinzu',
        seasonal_current_total: 'Aktuelle Gesamtplatzierungen',
        seasonal_total_label: 'Gesamt',
        seasonal_reset_values: 'Werte zurÃƒÂ¼cksetzen',
        seasonal_save_placements: 'Platzierungen speichern',
        friends_none: 'Noch keine Freunde.',
        friend_requests_none: 'Keine Freundschaftsanfragen.',
        remove_friends_none: 'Keine Freunde zum Entfernen.',
        highlight_modal_title: 'Highlight hinzufÃƒÂ¼gen',
        highlight_label_image: 'Bild',
        highlight_click_upload: 'Klicken, um ein Bild hochzuladen',
        achievement_completed: 'Abgeschlossen',
        achievement_incomplete: 'UnvollstÃƒÂ¤ndig',
        achievement_upload_image: 'Bild hochladen',
        achievement_enter_friend_name: 'Namen des Freundes eingeben'
    },
    es: {
        seasonal_modal_title: 'Clasificaciones de Temporada',
        seasonal_modal_subtitle: 'Añade tus trofeos ganados',
        seasonal_current_total: 'Total actual de clasificaciones',
        seasonal_total_label: 'Total',
        seasonal_reset_values: 'Restablecer valores',
        seasonal_save_placements: 'Guardar clasificaciones',
        friends_none: 'A\u00FAn no tienes amigos.',
        friend_requests_none: 'No hay solicitudes de amistad.',
        remove_friends_none: 'No hay amigos para eliminar.',
        highlight_modal_title: 'Agregar destacado',
        highlight_label_image: 'Imagen',
        highlight_click_upload: 'Haz clic para subir imagen',
        achievement_completed: 'Completado',
        achievement_incomplete: 'Incompleto',
        achievement_upload_image: 'Subir imagen',
        achievement_enter_friend_name: 'Nombre del amigo'
    },
    fil: {
        seasonal_modal_title: 'Mga Seasonal Placement',
        seasonal_modal_subtitle: 'Idagdag ang mga nakuha mong tropeo',
        seasonal_current_total: 'Kasalukuyang kabuuang placement',
        seasonal_total_label: 'Kabuuan',
        seasonal_reset_values: 'I-reset ang mga halaga',
        seasonal_save_placements: 'I-save ang placements',
        friends_none: 'Wala pang kaibigan.',
        friend_requests_none: 'Walang friend requests.',
        remove_friends_none: 'Walang kaibigang aalisin.',
        highlight_modal_title: 'Magdagdag ng Highlight',
        highlight_label_image: 'Larawan',
        highlight_click_upload: 'I-click para mag-upload ng larawan',
        achievement_completed: 'Kumpleto',
        achievement_incomplete: 'Hindi kumpleto',
        achievement_upload_image: 'Mag-upload ng larawan',
        achievement_enter_friend_name: 'Ilagay ang pangalan ng kaibigan'
    },
    fr: {
        seasonal_modal_title: 'Classements saisonniers',
        seasonal_modal_subtitle: 'Ajoutez vos trophÃƒÂ©es obtenus',
        seasonal_current_total: 'Total actuel des classements',
        seasonal_total_label: 'Total',
        seasonal_reset_values: 'RÃƒÂ©initialiser les valeurs',
        seasonal_save_placements: 'Enregistrer les classements',
        friends_none: 'Aucun ami pour le moment.',
        friend_requests_none: 'Aucune demande d\'ami.',
        remove_friends_none: 'Aucun ami ÃƒÂ  supprimer.',
        highlight_modal_title: 'Ajouter un moment fort',
        highlight_label_image: 'Image',
        highlight_click_upload: 'Cliquez pour tÃƒÂ©lÃƒÂ©verser une image',
        achievement_completed: 'TerminÃƒÂ©',
        achievement_incomplete: 'Incomplet',
        achievement_upload_image: 'TÃƒÂ©lÃƒÂ©verser une image',
        achievement_enter_friend_name: 'Entrez le nom d\'un ami'
    },
    hmn: {
        seasonal_modal_title: 'Seasonal Placements',
        seasonal_modal_subtitle: 'Ntxiv koj cov trophies uas koj tau txais',
        seasonal_current_total: 'Tag nrho cov placements tam sim no',
        seasonal_total_label: 'Tag nrho',
        seasonal_reset_values: 'Reset Values',
        seasonal_save_placements: 'Save Placements',
        friends_none: 'Tsis tau muaj phooj ywg.',
        friend_requests_none: 'Tsis muaj friend requests.',
        remove_friends_none: 'Tsis muaj phooj ywg los tshem.',
        highlight_modal_title: 'Add Highlight',
        highlight_label_image: 'Duab',
        highlight_click_upload: 'Nias kom upload duab',
        achievement_completed: 'Ua tiav',
        achievement_incomplete: 'Tsis tiav',
        achievement_upload_image: 'Upload duab',
        achievement_enter_friend_name: 'Sau npe phooj ywg'
    },
    id: {
        seasonal_modal_title: 'Peringkat Musiman',
        seasonal_modal_subtitle: 'Tambahkan trofi yang Anda peroleh',
        seasonal_current_total: 'Total peringkat saat ini',
        seasonal_total_label: 'Total',
        seasonal_reset_values: 'Atur ulang nilai',
        seasonal_save_placements: 'Simpan peringkat',
        friends_none: 'Belum ada teman.',
        friend_requests_none: 'Tidak ada permintaan pertemanan.',
        remove_friends_none: 'Tidak ada teman untuk dihapus.',
        highlight_modal_title: 'Tambah Sorotan',
        highlight_label_image: 'Gambar',
        highlight_click_upload: 'Klik untuk mengunggah gambar',
        achievement_completed: 'Selesai',
        achievement_incomplete: 'Belum selesai',
        achievement_upload_image: 'Unggah gambar',
        achievement_enter_friend_name: 'Masukkan nama teman'
    },
    it: {
        seasonal_modal_title: 'Posizionamenti stagionali',
        seasonal_modal_subtitle: 'Aggiungi i trofei guadagnati',
        seasonal_current_total: 'Posizionamenti totali attuali',
        seasonal_total_label: 'Totale',
        seasonal_reset_values: 'Reimposta valori',
        seasonal_save_placements: 'Salva posizionamenti',
        friends_none: 'Nessun amico ancora.',
        friend_requests_none: 'Nessuna richiesta di amicizia.',
        remove_friends_none: 'Nessun amico da rimuovere.',
        highlight_modal_title: 'Aggiungi evidenza',
        highlight_label_image: 'Immagine',
        highlight_click_upload: 'Clicca per caricare un\'immagine',
        achievement_completed: 'Completato',
        achievement_incomplete: 'Incompleto',
        achievement_upload_image: 'Carica immagine',
        achievement_enter_friend_name: 'Inserisci il nome dell\'amico'
    },
    hu: {
        seasonal_modal_title: 'SzezonÃƒÂ¡lis helyezÃƒÂ©sek',
        seasonal_modal_subtitle: 'Add hozzÃƒÂ¡ a megszerzett trÃƒÂ³feÃƒÂ¡idat',
        seasonal_current_total: 'Jelenlegi ÃƒÂ¶sszes helyezÃƒÂ©s',
        seasonal_total_label: 'Ãƒâ€“sszesen',
        seasonal_reset_values: 'Ãƒâ€°rtÃƒÂ©kek visszaÃƒÂ¡llÃƒÂ­tÃƒÂ¡sa',
        seasonal_save_placements: 'HelyezÃƒÂ©sek mentÃƒÂ©se',
        friends_none: 'MÃƒÂ©g nincsenek barÃƒÂ¡tok.',
        friend_requests_none: 'Nincsenek barÃƒÂ¡tkÃƒÂ©relmek.',
        remove_friends_none: 'Nincs eltÃƒÂ¡volÃƒÂ­thatÃƒÂ³ barÃƒÂ¡t.',
        highlight_modal_title: 'KiemelÃƒÂ©s hozzÃƒÂ¡adÃƒÂ¡sa',
        highlight_label_image: 'KÃƒÂ©p',
        highlight_click_upload: 'Kattints a kÃƒÂ©p feltÃƒÂ¶ltÃƒÂ©sÃƒÂ©hez',
        achievement_completed: 'TeljesÃƒÂ­tve',
        achievement_incomplete: 'Nincs teljesÃƒÂ­tve',
        achievement_upload_image: 'KÃƒÂ©p feltÃƒÂ¶ltÃƒÂ©se',
        achievement_enter_friend_name: 'Add meg a barÃƒÂ¡t nevÃƒÂ©t'
    },
    ms: {
        seasonal_modal_title: 'Kedudukan Musim',
        seasonal_modal_subtitle: 'Tambah trofi yang anda peroleh',
        seasonal_current_total: 'Jumlah kedudukan semasa',
        seasonal_total_label: 'Jumlah',
        seasonal_reset_values: 'Tetapkan semula nilai',
        seasonal_save_placements: 'Simpan kedudukan',
        friends_none: 'Belum ada rakan.',
        friend_requests_none: 'Tiada permintaan rakan.',
        remove_friends_none: 'Tiada rakan untuk dibuang.',
        highlight_modal_title: 'Tambah Sorotan',
        highlight_label_image: 'Imej',
        highlight_click_upload: 'Klik untuk muat naik imej',
        achievement_completed: 'Selesai',
        achievement_incomplete: 'Belum selesai',
        achievement_upload_image: 'Muat naik imej',
        achievement_enter_friend_name: 'Masukkan nama rakan'
    },
    nl: {
        seasonal_modal_title: 'Seizoensplaatsingen',
        seasonal_modal_subtitle: 'Voeg je behaalde trofeeÃƒÂ«n toe',
        seasonal_current_total: 'Huidig totaal aantal plaatsingen',
        seasonal_total_label: 'Totaal',
        seasonal_reset_values: 'Waarden resetten',
        seasonal_save_placements: 'Plaatsingen opslaan',
        friends_none: 'Nog geen vrienden.',
        friend_requests_none: 'Geen vriendschapsverzoeken.',
        remove_friends_none: 'Geen vrienden om te verwijderen.',
        highlight_modal_title: 'Hoogtepunt toevoegen',
        highlight_label_image: 'Afbeelding',
        highlight_click_upload: 'Klik om een afbeelding te uploaden',
        achievement_completed: 'Voltooid',
        achievement_incomplete: 'Onvoltooid',
        achievement_upload_image: 'Afbeelding uploaden',
        achievement_enter_friend_name: 'Voer de naam van een vriend in'
    },
    no: {
        seasonal_modal_title: 'Sesongplasseringer',
        seasonal_modal_subtitle: 'Legg til trofeene du har tjent',
        seasonal_current_total: 'NÃƒÂ¥vÃƒÂ¦rende totale plasseringer',
        seasonal_total_label: 'Totalt',
        seasonal_reset_values: 'Tilbakestill verdier',
        seasonal_save_placements: 'Lagre plasseringer',
        friends_none: 'Ingen venner ennÃƒÂ¥.',
        friend_requests_none: 'Ingen venneforespÃƒÂ¸rsler.',
        remove_friends_none: 'Ingen venner ÃƒÂ¥ fjerne.',
        highlight_modal_title: 'Legg til hÃƒÂ¸ydepunkt',
        highlight_label_image: 'Bilde',
        highlight_click_upload: 'Klikk for ÃƒÂ¥ laste opp bilde',
        achievement_completed: 'FullfÃƒÂ¸rt',
        achievement_incomplete: 'Ikke fullfÃƒÂ¸rt',
        achievement_upload_image: 'Last opp bilde',
        achievement_enter_friend_name: 'Skriv inn vennens navn'
    },
    pl: {
        seasonal_modal_title: 'Miejsca sezonowe',
        seasonal_modal_subtitle: 'Dodaj zdobyte trofea',
        seasonal_current_total: 'Aktualna Ã…â€šÃ„â€¦czna liczba miejsc',
        seasonal_total_label: 'Ã…ÂÃ„â€¦cznie',
        seasonal_reset_values: 'Resetuj wartoÃ…â€ºci',
        seasonal_save_placements: 'Zapisz miejsca',
        friends_none: 'Nie masz jeszcze znajomych.',
        friend_requests_none: 'Brak zaproszeÃ…â€ž do znajomych.',
        remove_friends_none: 'Brak znajomych do usuniÃ„â„¢cia.',
        highlight_modal_title: 'Dodaj wyrÃƒÂ³Ã…Â¼nienie',
        highlight_label_image: 'Obraz',
        highlight_click_upload: 'Kliknij, aby przesÃ…â€šaÃ„â€¡ obraz',
        achievement_completed: 'UkoÃ…â€žczone',
        achievement_incomplete: 'NieukoÃ…â€žczone',
        achievement_upload_image: 'PrzeÃ…â€ºlij obraz',
        achievement_enter_friend_name: 'Wpisz imiÃ„â„¢ znajomego'
    },
    'pt-BR': {
        seasonal_modal_title: 'Classificações Sazonais',
        seasonal_modal_subtitle: 'Adicione seus troféus',
        seasonal_current_total: 'Total atual',
        seasonal_total_label: 'Total',
        seasonal_reset_values: 'Redefinir',
        seasonal_save_placements: 'Salvar',
        friends_none: 'Você ainda não tem amigos.',
        friend_requests_none: 'Nenhuma solicitação de amizade.',
        remove_friends_none: 'Nenhum amigo para remover.',
        highlight_modal_title: 'Adicionar Destaque',
        highlight_label_image: 'Imagem',
        highlight_click_upload: 'Clique para enviar imagem',
        achievement_completed: 'Concluído',
        achievement_incomplete: 'Incompleto',
        achievement_upload_image: 'Enviar imagem',
        achievement_enter_friend_name: 'Nome do amigo'
    },
    'pt-BR': {
        seasonal_modal_title: 'Classifica\u00E7\u00F5es sazonais',
        seasonal_modal_subtitle: 'Adicione os trof\u00E9us conquistados',
        seasonal_current_total: 'Total atual de classifica\u00E7\u00F5es',
        seasonal_total_label: 'Total',
        seasonal_reset_values: 'Redefinir valores',
        seasonal_save_placements: 'Salvar classifica\u00E7\u00F5es',
        friends_none: 'Ainda n\u00E3o h\u00E1 amigos.',
        friend_requests_none: 'Sem pedidos de amizade.',
        remove_friends_none: 'Sem amigos para remover.',
        highlight_modal_title: 'Adicionar destaque',
        highlight_label_image: 'Imagem',
        highlight_click_upload: 'Clique para carregar uma imagem',
        achievement_completed: 'Conclu\u00EDdo',
        achievement_incomplete: 'Incompleto',
        achievement_upload_image: 'Carregar imagem',
        achievement_enter_friend_name: 'Introduza o nome do amigo'
    },
    'pt-PT': {
        seasonal_modal_title: 'Classifica\u00E7\u00F5es sazonais',
        seasonal_modal_subtitle: 'Adicione os trof\u00E9us conquistados',
        seasonal_current_total: 'Total atual de classifica\u00E7\u00F5es',
        seasonal_total_label: 'Total',
        seasonal_reset_values: 'Repor valores',
        seasonal_save_placements: 'Guardar classifica\u00E7\u00F5es',
        friends_none: 'Ainda n\u00E3o h\u00E1 amigos.',
        friend_requests_none: 'Sem pedidos de amizade.',
        remove_friends_none: 'Sem amigos para remover.',
        highlight_modal_title: 'Adicionar destaque',
        highlight_label_image: 'Imagem',
        highlight_click_upload: 'Clique para carregar uma imagem',
        achievement_completed: 'Conclu\u00EDdo',
        achievement_incomplete: 'Incompleto',
        achievement_upload_image: 'Carregar imagem',
        achievement_enter_friend_name: 'Introduza o nome do amigo'
    },
    fi: {
        seasonal_modal_title: 'Kausisijoitukset',
        seasonal_modal_subtitle: 'LisÃƒÂ¤ÃƒÂ¤ ansaitsemasi pokaalit',
        seasonal_current_total: 'Nykyinen sijoitusten kokonaismÃƒÂ¤ÃƒÂ¤rÃƒÂ¤',
        seasonal_total_label: 'YhteensÃƒÂ¤',
        seasonal_reset_values: 'Nollaa arvot',
        seasonal_save_placements: 'Tallenna sijoitukset',
        friends_none: 'Ei ystÃƒÂ¤viÃƒÂ¤ vielÃƒÂ¤.',
        friend_requests_none: 'Ei kaveripyyntÃƒÂ¶jÃƒÂ¤.',
        remove_friends_none: 'Ei poistettavia ystÃƒÂ¤viÃƒÂ¤.',
        highlight_modal_title: 'LisÃƒÂ¤ÃƒÂ¤ kohokohta',
        highlight_label_image: 'Kuva',
        highlight_click_upload: 'Klikkaa ladataksesi kuvan',
        achievement_completed: 'Valmis',
        achievement_incomplete: 'KeskenerÃƒÂ¤inen',
        achievement_upload_image: 'Lataa kuva',
        achievement_enter_friend_name: 'SyÃƒÂ¶tÃƒÂ¤ ystÃƒÂ¤vÃƒÂ¤n nimi'
    },
    sv: {
        seasonal_modal_title: 'SÃƒÂ¤songsplaceringar',
        seasonal_modal_subtitle: 'LÃƒÂ¤gg till dina intjÃƒÂ¤nade trofÃƒÂ©er',
        seasonal_current_total: 'Nuvarande totala placeringar',
        seasonal_total_label: 'Totalt',
        seasonal_reset_values: 'Ãƒâ€¦terstÃƒÂ¤ll vÃƒÂ¤rden',
        seasonal_save_placements: 'Spara placeringar',
        friends_none: 'Inga vÃƒÂ¤nner ÃƒÂ¤nnu.',
        friend_requests_none: 'Inga vÃƒÂ¤nfÃƒÂ¶rfrÃƒÂ¥gningar.',
        remove_friends_none: 'Inga vÃƒÂ¤nner att ta bort.',
        highlight_modal_title: 'LÃƒÂ¤gg till hÃƒÂ¶jdpunkt',
        highlight_label_image: 'Bild',
        highlight_click_upload: 'Klicka fÃƒÂ¶r att ladda upp bild',
        achievement_completed: 'SlutfÃƒÂ¶rd',
        achievement_incomplete: 'OfullstÃƒÂ¤ndig',
        achievement_upload_image: 'Ladda upp bild',
        achievement_enter_friend_name: 'Ange vÃƒÂ¤nens namn'
    },
    vi: {
        seasonal_modal_title: 'XÃ¡ÂºÂ¿p hÃ¡ÂºÂ¡ng mÃƒÂ¹a',
        seasonal_modal_subtitle: 'ThÃƒÂªm cÃƒÂ¡c cÃƒÂºp bÃ¡ÂºÂ¡n Ã„â€˜ÃƒÂ£ Ã„â€˜Ã¡ÂºÂ¡t Ã„â€˜Ã†Â°Ã¡Â»Â£c',
        seasonal_current_total: 'TÃ¡Â»â€¢ng xÃ¡ÂºÂ¿p hÃ¡ÂºÂ¡ng hiÃ¡Â»â€¡n tÃ¡ÂºÂ¡i',
        seasonal_total_label: 'TÃ¡Â»â€¢ng',
        seasonal_reset_values: 'Ã„ÂÃ¡ÂºÂ·t lÃ¡ÂºÂ¡i giÃƒÂ¡ trÃ¡Â»â€¹',
        seasonal_save_placements: 'LÃ†Â°u xÃ¡ÂºÂ¿p hÃ¡ÂºÂ¡ng',
        friends_none: 'ChÃ†Â°a cÃƒÂ³ bÃ¡ÂºÂ¡n bÃƒÂ¨.',
        friend_requests_none: 'KhÃƒÂ´ng cÃƒÂ³ lÃ¡Â»Âi mÃ¡Â»Âi kÃ¡ÂºÂ¿t bÃ¡ÂºÂ¡n.',
        remove_friends_none: 'KhÃƒÂ´ng cÃƒÂ³ bÃ¡ÂºÂ¡n Ã„â€˜Ã¡Â»Æ’ xÃƒÂ³a.',
        highlight_modal_title: 'ThÃƒÂªm Ã„â€˜iÃ¡Â»Æ’m nÃ¡Â»â€¢i bÃ¡ÂºÂ­t',
        highlight_label_image: 'HÃƒÂ¬nh Ã¡ÂºÂ£nh',
        highlight_click_upload: 'NhÃ¡ÂºÂ¥p Ã„â€˜Ã¡Â»Æ’ tÃ¡ÂºÂ£i Ã¡ÂºÂ£nh lÃƒÂªn',
        achievement_completed: 'HoÃƒÂ n thÃƒÂ nh',
        achievement_incomplete: 'ChÃ†Â°a hoÃƒÂ n thÃƒÂ nh',
        achievement_upload_image: 'TÃ¡ÂºÂ£i Ã¡ÂºÂ£nh lÃƒÂªn',
        achievement_enter_friend_name: 'NhÃ¡ÂºÂ­p tÃƒÂªn bÃ¡ÂºÂ¡n bÃƒÂ¨'
    },
    tr: {
        seasonal_modal_title: 'Sezon SÃ„Â±ralamalarÃ„Â±',
        seasonal_modal_subtitle: 'KazandÃ„Â±Ã„Å¸Ã„Â±n kupalarÃ„Â± ekle',
        seasonal_current_total: 'Mevcut toplam sÃ„Â±ralama',
        seasonal_total_label: 'Toplam',
        seasonal_reset_values: 'DeÃ„Å¸erleri sÃ„Â±fÃ„Â±rla',
        seasonal_save_placements: 'SÃ„Â±ralamalarÃ„Â± kaydet',
        friends_none: 'HenÃƒÂ¼z arkadaÃ…Å¸ yok.',
        friend_requests_none: 'ArkadaÃ…Å¸lÃ„Â±k isteÃ„Å¸i yok.',
        remove_friends_none: 'KaldÃ„Â±rÃ„Â±lacak arkadaÃ…Å¸ yok.',
        highlight_modal_title: 'Ãƒâ€“ne Ãƒâ€¡Ã„Â±kan Ekle',
        highlight_label_image: 'GÃƒÂ¶rsel',
        highlight_click_upload: 'GÃƒÂ¶rsel yÃƒÂ¼klemek iÃƒÂ§in tÃ„Â±kla',
        achievement_completed: 'TamamlandÃ„Â±',
        achievement_incomplete: 'TamamlanmadÃ„Â±',
        achievement_upload_image: 'GÃƒÂ¶rsel yÃƒÂ¼kle',
        achievement_enter_friend_name: 'ArkadaÃ…Å¸ adÃ„Â±nÃ„Â± gir'
    },
    zh: {
        seasonal_modal_title: 'Ã¨Âµâ€ºÃ¥Â­Â£Ã¦Å½â€™Ã¥ÂÂ',
        seasonal_modal_subtitle: 'Ã¦Â·Â»Ã¥Å Â Ã¤Â½Â Ã¨Å½Â·Ã¥Â¾â€”Ã§Å¡â€žÃ¥Â¥â€“Ã¦ÂÂ¯',
        seasonal_current_total: 'Ã¥Â½â€œÃ¥â€°ÂÃ¦â‚¬Â»Ã¦Å½â€™Ã¥ÂÂ',
        seasonal_total_label: 'Ã¦â‚¬Â»Ã¨Â®Â¡',
        seasonal_reset_values: 'Ã©â€¡ÂÃ§Â½Â®Ã¦â€¢Â°Ã¥â‚¬Â¼',
        seasonal_save_placements: 'Ã¤Â¿ÂÃ¥Â­ËœÃ¦Å½â€™Ã¥ÂÂ',
        friends_none: 'Ã¨Â¿ËœÃ¦Â²Â¡Ã¦Å“â€°Ã¥Â¥Â½Ã¥Ââ€¹Ã£â‚¬â€š',
        friend_requests_none: 'Ã¦Â²Â¡Ã¦Å“â€°Ã¥Â¥Â½Ã¥Ââ€¹Ã¨Â¯Â·Ã¦Â±â€šÃ£â‚¬â€š',
        remove_friends_none: 'Ã¦Â²Â¡Ã¦Å“â€°Ã¥ÂÂ¯Ã§Â§Â»Ã©â„¢Â¤Ã§Å¡â€žÃ¥Â¥Â½Ã¥Ââ€¹Ã£â‚¬â€š',
        highlight_modal_title: 'Ã¦Â·Â»Ã¥Å Â Ã§Â²Â¾Ã¥Â½Â©Ã¦â€”Â¶Ã¥Ë†Â»',
        highlight_label_image: 'Ã¥â€ºÂ¾Ã§â€°â€¡',
        highlight_click_upload: 'Ã§â€šÂ¹Ã¥â€¡Â»Ã¤Â¸Å Ã¤Â¼Â Ã¥â€ºÂ¾Ã§â€°â€¡',
        achievement_completed: 'Ã¥Â·Â²Ã¥Â®Å’Ã¦Ë†Â',
        achievement_incomplete: 'Ã¦Å“ÂªÃ¥Â®Å’Ã¦Ë†Â',
        achievement_upload_image: 'Ã¤Â¸Å Ã¤Â¼Â Ã¥â€ºÂ¾Ã§â€°â€¡',
        achievement_enter_friend_name: 'Ã¨Â¾â€œÃ¥â€¦Â¥Ã¥Â¥Â½Ã¥Ââ€¹Ã¥ÂÂÃ§Â§Â°'
    },
    ja: {
        seasonal_modal_title: 'Ã£â€šÂ·Ã£Æ’Â¼Ã£â€šÂºÃ£Æ’Â³Ã©Â â€ Ã¤Â½Â',
        seasonal_modal_subtitle: 'Ã§ÂÂ²Ã¥Â¾â€”Ã£Ââ€”Ã£ÂÅ¸Ã£Æ’Ë†Ã£Æ’Â­Ã£Æ’â€¢Ã£â€šÂ£Ã£Æ’Â¼Ã£â€šâ€™Ã¨Â¿Â½Ã¥Å Â ',
        seasonal_current_total: 'Ã§ÂÂ¾Ã¥Å“Â¨Ã£ÂÂ®Ã¥ÂË†Ã¨Â¨Ë†Ã©Â â€ Ã¤Â½Â',
        seasonal_total_label: 'Ã¥ÂË†Ã¨Â¨Ë†',
        seasonal_reset_values: 'Ã¥â‚¬Â¤Ã£â€šâ€™Ã£Æ’ÂªÃ£â€šÂ»Ã£Æ’Æ’Ã£Æ’Ë†',
        seasonal_save_placements: 'Ã©Â â€ Ã¤Â½ÂÃ£â€šâ€™Ã¤Â¿ÂÃ¥Â­Ëœ',
        friends_none: 'Ã£ÂÂ¾Ã£ÂÂ Ã¥Ââ€¹Ã©Ââ€Ã£ÂÅ’Ã£Ââ€žÃ£ÂÂ¾Ã£Ââ€ºÃ£â€šâ€œÃ£â‚¬â€š',
        friend_requests_none: 'Ã£Æ’â€¢Ã£Æ’Â¬Ã£Æ’Â³Ã£Æ’â€°Ã§â€Â³Ã¨Â«â€¹Ã£ÂÂ¯Ã£Ââ€šÃ£â€šÅ Ã£ÂÂ¾Ã£Ââ€ºÃ£â€šâ€œÃ£â‚¬â€š',
        remove_friends_none: 'Ã¥â€°Å Ã©â„¢Â¤Ã£ÂÂ§Ã£ÂÂÃ£â€šâ€¹Ã¥Ââ€¹Ã©Ââ€Ã£ÂÅ’Ã£Ââ€žÃ£ÂÂ¾Ã£Ââ€ºÃ£â€šâ€œÃ£â‚¬â€š',
        highlight_modal_title: 'Ã£Æ’ÂÃ£â€šÂ¤Ã£Æ’Â©Ã£â€šÂ¤Ã£Æ’Ë†Ã£â€šâ€™Ã¨Â¿Â½Ã¥Å Â ',
        highlight_label_image: 'Ã§â€Â»Ã¥Æ’Â',
        highlight_click_upload: 'Ã£â€šÂ¯Ã£Æ’ÂªÃ£Æ’Æ’Ã£â€šÂ¯Ã£Ââ€”Ã£ÂÂ¦Ã§â€Â»Ã¥Æ’ÂÃ£â€šâ€™Ã£â€šÂ¢Ã£Æ’Æ’Ã£Æ’â€”Ã£Æ’Â­Ã£Æ’Â¼Ã£Æ’â€°',
        achievement_completed: 'Ã¥Â®Å’Ã¤Âºâ€ ',
        achievement_incomplete: 'Ã¦Å“ÂªÃ¥Â®Å’Ã¤Âºâ€ ',
        achievement_upload_image: 'Ã§â€Â»Ã¥Æ’ÂÃ£â€šâ€™Ã£â€šÂ¢Ã£Æ’Æ’Ã£Æ’â€”Ã£Æ’Â­Ã£Æ’Â¼Ã£Æ’â€°',
        achievement_enter_friend_name: 'Ã£Æ’â€¢Ã£Æ’Â¬Ã£Æ’Â³Ã£Æ’â€°Ã¥ÂÂÃ£â€šâ€™Ã¥â€¦Â¥Ã¥Å â€º'
    },
    ko: {
        seasonal_modal_title: 'Ã¬â€¹Å“Ã¬Â¦Å’ Ã¬Ë†Å“Ã¬Å“â€ž',
        seasonal_modal_subtitle: 'Ã­Å¡ÂÃ«â€œÂÃ­â€¢Å“ Ã­Å Â¸Ã«Â¡Å“Ã­â€Â¼Ã«Â¥Â¼ Ã¬Â¶â€ÃªÂ°â‚¬Ã­â€¢ËœÃ¬â€žÂ¸Ã¬Å¡â€',
        seasonal_current_total: 'Ã­Ëœâ€žÃ¬Å¾Â¬ Ã¬Â´Â Ã¬Ë†Å“Ã¬Å“â€ž',
        seasonal_total_label: 'Ã­â€¢Â©ÃªÂ³â€ž',
        seasonal_reset_values: 'ÃªÂ°â€™ Ã¬Â´Ë†ÃªÂ¸Â°Ã­â„¢â€',
        seasonal_save_placements: 'Ã¬Ë†Å“Ã¬Å“â€ž Ã¬Â â‚¬Ã¬Å¾Â¥',
        friends_none: 'Ã¬â€¢â€žÃ¬Â§Â Ã¬Â¹Å“ÃªÂµÂ¬ÃªÂ°â‚¬ Ã¬â€”â€ Ã¬Å ÂµÃ«â€¹Ë†Ã«â€¹Â¤.',
        friend_requests_none: 'Ã¬Â¹Å“ÃªÂµÂ¬ Ã¬Å¡â€Ã¬Â²Â­Ã¬ÂÂ´ Ã¬â€”â€ Ã¬Å ÂµÃ«â€¹Ë†Ã«â€¹Â¤.',
        remove_friends_none: 'Ã¬â€šÂ­Ã¬Â Å“Ã­â€¢Â  Ã¬Â¹Å“ÃªÂµÂ¬ÃªÂ°â‚¬ Ã¬â€”â€ Ã¬Å ÂµÃ«â€¹Ë†Ã«â€¹Â¤.',
        highlight_modal_title: 'Ã­â€¢ËœÃ¬ÂÂ´Ã«ÂÂ¼Ã¬ÂÂ´Ã­Å Â¸ Ã¬Â¶â€ÃªÂ°â‚¬',
        highlight_label_image: 'Ã¬ÂÂ´Ã«Â¯Â¸Ã¬Â§â‚¬',
        highlight_click_upload: 'Ã­ÂÂ´Ã«Â¦Â­Ã­â€¢ËœÃ¬â€”Â¬ Ã¬ÂÂ´Ã«Â¯Â¸Ã¬Â§â‚¬ Ã¬â€”â€¦Ã«Â¡Å“Ã«â€œÅ“',
        achievement_completed: 'Ã¬â„¢â€žÃ«Â£Å’',
        achievement_incomplete: 'Ã«Â¯Â¸Ã¬â„¢â€žÃ«Â£Å’',
        achievement_upload_image: 'Ã¬ÂÂ´Ã«Â¯Â¸Ã¬Â§â‚¬ Ã¬â€”â€¦Ã«Â¡Å“Ã«â€œÅ“',
        achievement_enter_friend_name: 'Ã¬Â¹Å“ÃªÂµÂ¬ Ã¬ÂÂ´Ã«Â¦â€ž Ã¬Å¾â€¦Ã«Â Â¥'
    }
};
Object.keys(I18N_SECTION_PATCH).forEach((lang) => {
    I18N[lang] = { ...(I18N[lang] || {}), ...I18N_SECTION_PATCH[lang] };
});

// Keep options modal title aligned with each language's existing "settings" label.
Object.keys(I18N).forEach((lang) => {
    if (I18N[lang] && I18N[lang].settings) {
        I18N[lang].settings_title = lang === 'en' ? 'Options' : I18N[lang].settings;
    }
});

const I18N_ADD_FRIEND_ALERT_PATCH = {
    ar: {
        add_friend_user_not_found: 'Ã™â€žÃ™â€¦ Ã™Å Ã˜ÂªÃ™â€¦ Ã˜Â§Ã™â€žÃ˜Â¹Ã˜Â«Ã™Ë†Ã˜Â± Ã˜Â¹Ã™â€žÃ™â€° Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â³Ã˜ÂªÃ˜Â®Ã˜Â¯Ã™â€¦.',
        add_friend_self: 'Ã™â€žÃ˜Â§ Ã™Å Ã™â€¦Ã™Æ’Ã™â€ Ã™Æ’ Ã˜Â¥Ã˜Â¶Ã˜Â§Ã™ÂÃ˜Â© Ã™â€ Ã™ÂÃ˜Â³Ã™Æ’.'
    },
    bn: {
        add_friend_user_not_found: 'Ã Â¦Â¬Ã Â§ÂÃ Â¦Â¯Ã Â¦Â¬Ã Â¦Â¹Ã Â¦Â¾Ã Â¦Â°Ã Â¦â€¢Ã Â¦Â¾Ã Â¦Â°Ã Â§â‚¬ Ã Â¦ÂªÃ Â¦Â¾Ã Â¦â€œÃ Â¦Â¯Ã Â¦Â¼Ã Â¦Â¾ Ã Â¦Â¯Ã Â¦Â¾Ã Â¦Â¯Ã Â¦Â¼Ã Â¦Â¨Ã Â¦Â¿Ã Â¥Â¤',
        add_friend_self: 'Ã Â¦â€ Ã Â¦ÂªÃ Â¦Â¨Ã Â¦Â¿ Ã Â¦Â¨Ã Â¦Â¿Ã Â¦Å“Ã Â§â€¡Ã Â¦â€¢Ã Â§â€¡ Ã Â¦Â¯Ã Â§â€¹Ã Â¦â€” Ã Â¦â€¢Ã Â¦Â°Ã Â¦Â¤Ã Â§â€¡ Ã Â¦ÂªÃ Â¦Â¾Ã Â¦Â°Ã Â¦Â¬Ã Â§â€¡Ã Â¦Â¨ Ã Â¦Â¨Ã Â¦Â¾Ã Â¥Â¤'
    },
    da: {
        add_friend_user_not_found: 'Bruger ikke fundet.',
        add_friend_self: 'Du kan ikke tilfÃƒÂ¸je dig selv.'
    },
    de: {
        add_friend_user_not_found: 'Benutzer nicht gefunden.',
        add_friend_self: 'Du kannst dich nicht selbst hinzufÃƒÂ¼gen.'
    },
    fil: {
        add_friend_user_not_found: 'Hindi nahanap ang user.',
        add_friend_self: 'Hindi mo maaaring idagdag ang iyong sarili.'
    },
    fr: {
        add_friend_user_not_found: 'Utilisateur introuvable.',
        add_friend_self: 'Vous ne pouvez pas vous ajouter vous-mÃƒÂªme.'
    },
    hmn: {
        add_friend_user_not_found: 'Tsis pom tus neeg siv.',
        add_friend_self: 'Koj tsis tuaj yeem ntxiv koj tus kheej.'
    },
    id: {
        add_friend_user_not_found: 'Pengguna tidak ditemukan.',
        add_friend_self: 'Anda tidak dapat menambahkan diri sendiri.'
    },
    it: {
        add_friend_user_not_found: 'Utente non trovato.',
        add_friend_self: 'Non puoi aggiungere te stesso.'
    },
    hu: {
        add_friend_user_not_found: 'FelhasznÃƒÂ¡lÃƒÂ³ nem talÃƒÂ¡lhatÃƒÂ³.',
        add_friend_self: 'Nem adhatod hozzÃƒÂ¡ sajÃƒÂ¡t magad.'
    },
    ms: {
        add_friend_user_not_found: 'Pengguna tidak ditemui.',
        add_friend_self: 'Anda tidak boleh menambah diri sendiri.'
    },
    nl: {
        add_friend_user_not_found: 'Gebruiker niet gevonden.',
        add_friend_self: 'Je kunt jezelf niet toevoegen.'
    },
    no: {
        add_friend_user_not_found: 'Bruker ikke funnet.',
        add_friend_self: 'Du kan ikke legge til deg selv.'
    },
    pl: {
        add_friend_user_not_found: 'Nie znaleziono uÃ…Â¼ytkownika.',
        add_friend_self: 'Nie moÃ…Â¼esz dodaÃ„â€¡ siebie.'
    },
    'pt-PT': {
        add_friend_user_not_found: 'Utilizador n\u00E3o encontrado.',
        add_friend_self: 'N\u00E3o pode adicionar-se a si pr\u00F3prio.'
    },
    fi: {
        add_friend_user_not_found: 'KÃƒÂ¤yttÃƒÂ¤jÃƒÂ¤ÃƒÂ¤ ei lÃƒÂ¶ytynyt.',
        add_friend_self: 'Et voi lisÃƒÂ¤tÃƒÂ¤ itseÃƒÂ¤si.'
    },
    sv: {
        add_friend_user_not_found: 'AnvÃƒÂ¤ndaren hittades inte.',
        add_friend_self: 'Du kan inte lÃƒÂ¤gga till dig sjÃƒÂ¤lv.'
    },
    vi: {
        add_friend_user_not_found: 'KhÃƒÂ´ng tÃƒÂ¬m thÃ¡ÂºÂ¥y ngÃ†Â°Ã¡Â»Âi dÃƒÂ¹ng.',
        add_friend_self: 'BÃ¡ÂºÂ¡n khÃƒÂ´ng thÃ¡Â»Æ’ tÃ¡Â»Â± thÃƒÂªm chÃƒÂ­nh mÃƒÂ¬nh.'
    },
    tr: {
        add_friend_user_not_found: 'KullanÃ„Â±cÃ„Â± bulunamadÃ„Â±.',
        add_friend_self: 'Kendinizi ekleyemezsiniz.'
    },
    zh: {
        add_friend_user_not_found: 'Ã¦Å“ÂªÃ¦â€°Â¾Ã¥Ë†Â°Ã§â€Â¨Ã¦Ë†Â·Ã£â‚¬â€š',
        add_friend_self: 'Ã¤Â½Â Ã¤Â¸ÂÃ¨Æ’Â½Ã¦Â·Â»Ã¥Å Â Ã¨â€¡ÂªÃ¥Â·Â±Ã£â‚¬â€š'
    },
    ja: {
        add_friend_user_not_found: 'Ã£Æ’Â¦Ã£Æ’Â¼Ã£â€šÂ¶Ã£Æ’Â¼Ã£ÂÅ’Ã¨Â¦â€¹Ã£ÂÂ¤Ã£Ââ€¹Ã£â€šÅ Ã£ÂÂ¾Ã£Ââ€ºÃ£â€šâ€œÃ£â‚¬â€š',
        add_friend_self: 'Ã¨â€¡ÂªÃ¥Ë†â€ Ã¨â€¡ÂªÃ¨ÂºÂ«Ã£â€šâ€™Ã¨Â¿Â½Ã¥Å Â Ã£Ââ„¢Ã£â€šâ€¹Ã£Ââ€œÃ£ÂÂ¨Ã£ÂÂ¯Ã£ÂÂ§Ã£ÂÂÃ£ÂÂ¾Ã£Ââ€ºÃ£â€šâ€œÃ£â‚¬â€š'
    },
    ko: {
        add_friend_user_not_found: 'Ã¬â€šÂ¬Ã¬Å¡Â©Ã¬Å¾ÂÃ«Â¥Â¼ Ã¬Â°Â¾Ã¬Ââ€ž Ã¬Ë†Ëœ Ã¬â€”â€ Ã¬Å ÂµÃ«â€¹Ë†Ã«â€¹Â¤.',
        add_friend_self: 'Ã¬Å¾ÂÃªÂ¸Â° Ã¬Å¾ÂÃ¬â€¹Â Ã¬Ââ€ž Ã¬Â¶â€ÃªÂ°â‚¬Ã­â€¢Â  Ã¬Ë†Ëœ Ã¬â€”â€ Ã¬Å ÂµÃ«â€¹Ë†Ã«â€¹Â¤.'
    }
};
Object.keys(I18N_ADD_FRIEND_ALERT_PATCH).forEach((lang) => {
    I18N[lang] = { ...(I18N[lang] || {}), ...I18N_ADD_FRIEND_ALERT_PATCH[lang] };
});

const I18N_SEASONAL_TIER_PATCH = {
    ar: { seasonal_place_1st: 'Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â±Ã™Æ’Ã˜Â² Ã˜Â§Ã™â€žÃ˜Â£Ã™Ë†Ã™â€ž', seasonal_place_2nd: 'Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â±Ã™Æ’Ã˜Â² Ã˜Â§Ã™â€žÃ˜Â«Ã˜Â§Ã™â€ Ã™Å ', seasonal_place_3rd: 'Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â±Ã™Æ’Ã˜Â² Ã˜Â§Ã™â€žÃ˜Â«Ã˜Â§Ã™â€žÃ˜Â«', seasonal_place_plaque: 'Ã™â€žÃ™Ë†Ã˜Â­Ã˜Â©' },
    bn: { seasonal_place_1st: 'Ã Â§Â§Ã Â¦Â® Ã Â¦Â¸Ã Â§ÂÃ Â¦Â¥Ã Â¦Â¾Ã Â¦Â¨', seasonal_place_2nd: 'Ã Â§Â¨Ã Â¦Â¯Ã Â¦Â¼ Ã Â¦Â¸Ã Â§ÂÃ Â¦Â¥Ã Â¦Â¾Ã Â¦Â¨', seasonal_place_3rd: 'Ã Â§Â©Ã Â¦Â¯Ã Â¦Â¼ Ã Â¦Â¸Ã Â§ÂÃ Â¦Â¥Ã Â¦Â¾Ã Â¦Â¨', seasonal_place_plaque: 'Ã Â¦Â«Ã Â¦Â²Ã Â¦â€¢' },
    da: { seasonal_place_1st: '1. plads', seasonal_place_2nd: '2. plads', seasonal_place_3rd: '3. plads', seasonal_place_plaque: 'Plakette' },
    de: { seasonal_place_1st: '1. Platz', seasonal_place_2nd: '2. Platz', seasonal_place_3rd: '3. Platz', seasonal_place_plaque: 'Plakette' },
    es: { seasonal_place_1st: '1.er Lugar', seasonal_place_2nd: '2.º Lugar', seasonal_place_3rd: '3.er Lugar', seasonal_place_plaque: 'Placa' },
    'pt-BR': { seasonal_place_1st: '1.º lugar', seasonal_place_2nd: '2.º lugar', seasonal_place_3rd: '3.º lugar', seasonal_place_plaque: 'Placa' },
    fil: { seasonal_place_1st: 'Ika-1 Pwesto', seasonal_place_2nd: 'Ika-2 Pwesto', seasonal_place_3rd: 'Ika-3 Pwesto', seasonal_place_plaque: 'Plake' },
    fr: { seasonal_place_1st: '1re place', seasonal_place_2nd: '2e place', seasonal_place_3rd: '3e place', seasonal_place_plaque: 'Plaque' },
    hmn: { seasonal_place_1st: 'Qib 1', seasonal_place_2nd: 'Qib 2', seasonal_place_3rd: 'Qib 3', seasonal_place_plaque: 'Daim phaj' },
    id: { seasonal_place_1st: 'Juara 1', seasonal_place_2nd: 'Juara 2', seasonal_place_3rd: 'Juara 3', seasonal_place_plaque: 'Plakat' },
    it: { seasonal_place_1st: '1Ã‚Â° posto', seasonal_place_2nd: '2Ã‚Â° posto', seasonal_place_3rd: '3Ã‚Â° posto', seasonal_place_plaque: 'Targa' },
    hu: { seasonal_place_1st: '1. hely', seasonal_place_2nd: '2. hely', seasonal_place_3rd: '3. hely', seasonal_place_plaque: 'Plakett' },
    ms: { seasonal_place_1st: 'Tempat 1', seasonal_place_2nd: 'Tempat 2', seasonal_place_3rd: 'Tempat 3', seasonal_place_plaque: 'Plak' },
    nl: { seasonal_place_1st: '1e plaats', seasonal_place_2nd: '2e plaats', seasonal_place_3rd: '3e plaats', seasonal_place_plaque: 'Plaquette' },
    no: { seasonal_place_1st: '1. plass', seasonal_place_2nd: '2. plass', seasonal_place_3rd: '3. plass', seasonal_place_plaque: 'Plakett' },
    pl: { seasonal_place_1st: '1. miejsce', seasonal_place_2nd: '2. miejsce', seasonal_place_3rd: '3. miejsce', seasonal_place_plaque: 'Plakietka' },
    'pt-PT': { seasonal_place_1st: '1.\u00BA lugar', seasonal_place_2nd: '2.\u00BA lugar', seasonal_place_3rd: '3.\u00BA lugar', seasonal_place_plaque: 'Placa' },
    fi: { seasonal_place_1st: '1. sija', seasonal_place_2nd: '2. sija', seasonal_place_3rd: '3. sija', seasonal_place_plaque: 'Laatta' },
    sv: { seasonal_place_1st: '1:a plats', seasonal_place_2nd: '2:a plats', seasonal_place_3rd: '3:e plats', seasonal_place_plaque: 'Plakett' },
    vi: { seasonal_place_1st: 'Háº¡ng 1', seasonal_place_2nd: 'Háº¡ng 2', seasonal_place_3rd: 'Háº¡ng 3', seasonal_place_plaque: 'Báº£ng danh dá»±' },
    tr: { seasonal_place_1st: '1.lik', seasonal_place_2nd: '2.lik', seasonal_place_3rd: '3.lÒ¼k', seasonal_place_plaque: 'Plaket' },
    zh: { seasonal_place_1st: 'ç¬¬ä¸��å', seasonal_place_2nd: 'ç¬¬äº�å', seasonal_place_3rd: 'ç¬¬ä¸⬰å', seasonal_place_plaque: 'Ã¥Â¥â€“Ã§â€°Å’' },
    ja: { seasonal_place_1st: '1ä½', seasonal_place_2nd: '2ä½', seasonal_place_3rd: '3ä½', seasonal_place_plaque: 'Ã£Æ’â€”Ã£Æ’Â¬Ã£Æ’Â¼Ã£Æ’Ë†' },
    ko: { seasonal_place_1st: '1Ã¬Å“â€ž', seasonal_place_2nd: '2Ã¬Å“â€ž', seasonal_place_3rd: '3Ã¬Å“â€ž', seasonal_place_plaque: 'ëª⬦í�' }
};
Object.keys(I18N_SEASONAL_TIER_PATCH).forEach((lang) => {
    I18N[lang] = { ...(I18N[lang] || {}), ...I18N_SEASONAL_TIER_PATCH[lang] };
});

const I18N_BENCHMARK_MISSING_PATCH = {};
I18N_BENCHMARK_MISSING_PATCH.ar = {
    footer_site_made_by: 'Ã˜ÂªÃ™â€¦ Ã˜Â¥Ã™â€ Ã˜Â´Ã˜Â§Ã˜Â¡ Ã˜Â§Ã™â€žÃ™â€¦Ã™Ë†Ã™â€šÃ˜Â¹ Ã˜Â¨Ã™Ë†Ã˜Â§Ã˜Â³Ã˜Â·Ã˜Â©',
    footer_disclaimer: 'Ã™â€¡Ã˜Â°Ã˜Â§ Ã˜Â§Ã™â€žÃ™â€¦Ã™Ë†Ã™â€šÃ˜Â¹ Ã˜ÂºÃ™Å Ã˜Â± Ã˜ÂªÃ˜Â§Ã˜Â¨Ã˜Â¹ Ã™â€žÃ™â‚¬ GraalOnline Ã™Ë†Ã˜ÂºÃ™Å Ã˜Â± Ã™â€¦Ã™ÂÃ˜Â¯Ã˜Â§Ã˜Â± Ã˜Â£Ã™Ë† Ã™â€¦Ã™ÂÃ˜Â¹Ã˜ÂªÃ™â€¦Ã˜Â¯ Ã˜Â£Ã™Ë† Ã™â€¦Ã™ÂÃ™â€¦Ã™Ë†Ã™â€˜Ã™â€ž Ã™â€¦Ã™â€  Ã™â€šÃ˜Â¨Ã™â€žÃ™â€¡. Ã˜Â¬Ã™â€¦Ã™Å Ã˜Â¹ Ã˜Â§Ã™â€žÃ˜Â£Ã˜ÂµÃ™Ë†Ã™â€ž Ã‚Â© 2026 GraalOnline',
    footer_terms: 'Ã˜Â§Ã™â€žÃ˜Â´Ã˜Â±Ã™Ë†Ã˜Â· Ã™Ë†Ã˜Â§Ã™â€žÃ˜Â£Ã˜Â­Ã™Æ’Ã˜Â§Ã™â€¦',
    footer_privacy: 'Ã˜Â³Ã™Å Ã˜Â§Ã˜Â³Ã˜Â© Ã˜Â§Ã™â€žÃ˜Â®Ã˜ÂµÃ™Ë†Ã˜ÂµÃ™Å Ã˜Â©',
    footer_cookie: 'Ã˜Â³Ã™Å Ã˜Â§Ã˜Â³Ã˜Â© Ã™â€¦Ã™â€žÃ™ÂÃ˜Â§Ã˜Âª Ã˜ÂªÃ˜Â¹Ã˜Â±Ã™Å Ã™Â Ã˜Â§Ã™â€žÃ˜Â§Ã˜Â±Ã˜ÂªÃ˜Â¨Ã˜Â§Ã˜Â·',
    footer_dmca: 'Ã˜Â³Ã™Å Ã˜Â§Ã˜Â³Ã˜Â© DMCA',
    profile_picture: 'Ã˜ÂµÃ™Ë†Ã˜Â±Ã˜Â© Ã˜Â§Ã™â€žÃ™â€¦Ã™â€žÃ™Â Ã˜Â§Ã™â€žÃ˜Â´Ã˜Â®Ã˜ÂµÃ™Å ',
    upload_image: 'Ã˜Â±Ã™ÂÃ˜Â¹ Ã˜ÂµÃ™Ë†Ã˜Â±Ã˜Â©',
    edit_image: 'Ã˜ÂªÃ˜Â¹Ã˜Â¯Ã™Å Ã™â€ž Ã˜Â§Ã™â€žÃ˜ÂµÃ™Ë†Ã˜Â±Ã˜Â©',
    remove_image: 'Ã˜Â¥Ã˜Â²Ã˜Â§Ã™â€žÃ˜Â© Ã˜Â§Ã™â€žÃ˜ÂµÃ™Ë†Ã˜Â±Ã˜Â©',
    username_label: 'Ã˜Â§Ã˜Â³Ã™â€¦ Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â³Ã˜ÂªÃ˜Â®Ã˜Â¯Ã™â€¦ (1-20 Ã˜Â­Ã˜Â±Ã™ÂÃ™â€¹Ã˜Â§)',
    guilds_max: 'Ã˜Â§Ã™â€žÃ™â€ Ã™â€šÃ˜Â§Ã˜Â¨Ã˜Â§Ã˜Âª (Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â¯ Ã˜Â§Ã™â€žÃ˜Â£Ã™â€šÃ˜ÂµÃ™â€° 6)',
    add_guild: 'Ã˜Â¥Ã˜Â¶Ã˜Â§Ã™ÂÃ˜Â© Ã™â€ Ã™â€šÃ˜Â§Ã˜Â¨Ã˜Â©',
    guild_name_placeholder: 'Ã˜Â§Ã˜Â³Ã™â€¦ Ã˜Â§Ã™â€žÃ™â€ Ã™â€šÃ˜Â§Ã˜Â¨Ã˜Â©',
    country_flag: 'Ã˜Â¹Ã™â€žÃ™â€¦ Ã˜Â§Ã™â€žÃ˜Â¯Ã™Ë†Ã™â€žÃ˜Â©',
    remove_flag: 'Ã˜Â¥Ã˜Â²Ã˜Â§Ã™â€žÃ˜Â© Ã˜Â§Ã™â€žÃ˜Â¹Ã™â€žÃ™â€¦',
    account_details: 'Ã˜ÂªÃ™ÂÃ˜Â§Ã˜ÂµÃ™Å Ã™â€ž Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â³Ã˜Â§Ã˜Â¨',
    account_id: 'Ã™â€¦Ã˜Â¹Ã˜Â±Ã™â€˜Ã™Â Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â³Ã˜Â§Ã˜Â¨',
    email_address: 'Ã˜Â¹Ã™â€ Ã™Ë†Ã˜Â§Ã™â€  Ã˜Â§Ã™â€žÃ˜Â¨Ã˜Â±Ã™Å Ã˜Â¯ Ã˜Â§Ã™â€žÃ˜Â¥Ã™â€žÃ™Æ’Ã˜ÂªÃ˜Â±Ã™Ë†Ã™â€ Ã™Å ',
    new_email_placeholder: 'Ã˜Â¹Ã™â€ Ã™Ë†Ã˜Â§Ã™â€  Ã˜Â¨Ã˜Â±Ã™Å Ã˜Â¯ Ã˜Â¥Ã™â€žÃ™Æ’Ã˜ÂªÃ˜Â±Ã™Ë†Ã™â€ Ã™Å  Ã˜Â¬Ã˜Â¯Ã™Å Ã˜Â¯',
    verify_update: 'Ã˜ÂªÃ˜Â­Ã™â€šÃ™â€š Ã™Ë†Ã˜ÂªÃ˜Â­Ã˜Â¯Ã™Å Ã˜Â«',
    change_email_address: 'Ã˜ÂªÃ˜ÂºÃ™Å Ã™Å Ã˜Â± Ã˜Â¹Ã™â€ Ã™Ë†Ã˜Â§Ã™â€  Ã˜Â§Ã™â€žÃ˜Â¨Ã˜Â±Ã™Å Ã˜Â¯ Ã˜Â§Ã™â€žÃ˜Â¥Ã™â€žÃ™Æ’Ã˜ÂªÃ˜Â±Ã™Ë†Ã™â€ Ã™Å ',
    change_password: 'Ã˜ÂªÃ˜ÂºÃ™Å Ã™Å Ã˜Â± Ã™Æ’Ã™â€žÃ™â€¦Ã˜Â© Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â±Ã™Ë†Ã˜Â±',
    delete_personal_account: 'Ã˜Â­Ã˜Â°Ã™Â Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â³Ã˜Â§Ã˜Â¨ Ã˜Â§Ã™â€žÃ˜Â´Ã˜Â®Ã˜ÂµÃ™Å ',
    cannot_undo: 'Ã™â€žÃ˜Â§ Ã™Å Ã™â€¦Ã™Æ’Ã™â€  Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â±Ã˜Â§Ã˜Â¬Ã˜Â¹ Ã˜Â¹Ã™â€  Ã™â€¡Ã˜Â°Ã˜Â§.',
    delete_account: 'Ã˜Â­Ã˜Â°Ã™Â Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â³Ã˜Â§Ã˜Â¨',
    discard_changes: 'Ã˜ÂªÃ˜Â¬Ã˜Â§Ã™â€¡Ã™â€ž Ã˜Â§Ã™â€žÃ˜ÂªÃ˜ÂºÃ™Å Ã™Å Ã˜Â±Ã˜Â§Ã˜Âª',
    save_changes: 'Ã˜Â­Ã™ÂÃ˜Â¸ Ã˜Â§Ã™â€žÃ˜ÂªÃ˜ÂºÃ™Å Ã™Å Ã˜Â±Ã˜Â§Ã˜Âª',
    your_account_id: 'Ã™â€¦Ã˜Â¹Ã˜Â±Ã™â€˜Ã™Â Ã˜Â­Ã˜Â³Ã˜Â§Ã˜Â¨Ã™Æ’',
    friends_list_tab: 'Ã™â€šÃ˜Â§Ã˜Â¦Ã™â€¦Ã˜Â© Ã˜Â§Ã™â€žÃ˜Â£Ã˜ÂµÃ˜Â¯Ã™â€šÃ˜Â§Ã˜Â¡',
    friend_requests_tab: 'Ã˜Â·Ã™â€žÃ˜Â¨Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ˜ÂµÃ˜Â¯Ã˜Â§Ã™â€šÃ˜Â©',
    remove_friends_tab: 'Ã˜Â¥Ã˜Â²Ã˜Â§Ã™â€žÃ˜Â© Ã˜Â§Ã™â€žÃ˜Â£Ã˜ÂµÃ˜Â¯Ã™â€šÃ˜Â§Ã˜Â¡',
    enter_account_id_placeholder: 'Ã˜Â£Ã˜Â¯Ã˜Â®Ã™â€ž Ã™â€¦Ã˜Â¹Ã˜Â±Ã™â€˜Ã™Â Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â³Ã˜Â§Ã˜Â¨',
    received_friend_requests: 'Ã˜Â·Ã™â€žÃ˜Â¨Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ˜ÂµÃ˜Â¯Ã˜Â§Ã™â€šÃ˜Â© Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â³Ã˜ÂªÃ™â€žÃ™â€¦Ã˜Â©',
    sent_friend_requests: 'Ã˜Â·Ã™â€žÃ˜Â¨Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ˜ÂµÃ˜Â¯Ã˜Â§Ã™â€šÃ˜Â© Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â±Ã˜Â³Ã™â€žÃ˜Â©',
    select_friends_remove: 'Ã˜Â§Ã˜Â®Ã˜ÂªÃ˜Â± Ã˜Â£Ã˜ÂµÃ˜Â¯Ã™â€šÃ˜Â§Ã˜Â¡ Ã™â€žÃ˜Â¥Ã˜Â²Ã˜Â§Ã™â€žÃ˜ÂªÃ™â€¡Ã™â€¦',
    highlight_title_required_label: 'Ã˜Â§Ã™â€žÃ˜Â¹Ã™â€ Ã™Ë†Ã˜Â§Ã™â€  (Ã™â€¦Ã˜Â·Ã™â€žÃ™Ë†Ã˜Â¨)',
    highlight_desc_optional_label: 'Ã˜Â§Ã™â€žÃ™Ë†Ã˜ÂµÃ™Â (Ã˜Â§Ã˜Â®Ã˜ÂªÃ™Å Ã˜Â§Ã˜Â±Ã™Å )',
    highlight_title_placeholder: 'Ã˜Â£Ã˜Â¯Ã˜Â®Ã™â€ž Ã˜Â¹Ã™â€ Ã™Ë†Ã˜Â§Ã™â€ Ã™â€¹Ã˜Â§...',
    highlight_desc_placeholder: 'Ã˜Â£Ã˜Â¯Ã˜Â®Ã™â€ž Ã™Ë†Ã˜ÂµÃ™ÂÃ™â€¹Ã˜Â§...',
    highlights_empty: 'Ã™â€žÃ˜Â§ Ã˜ÂªÃ™Ë†Ã˜Â¬Ã˜Â¯ Ã™â€žÃ™â€šÃ˜Â·Ã˜Â§Ã˜Âª Ã˜Â¨Ã˜Â§Ã˜Â±Ã˜Â²Ã˜Â© Ã˜Â¨Ã˜Â¹Ã˜Â¯.',
    achievement_you_have: 'Ã™â€žÃ™â€šÃ˜Â¯ Ã™ÂÃ˜ÂªÃ˜Â­Ã˜Âª',
    achievement_progress_prefix: '{name}:',
    achievement_goal_total: 'Ã˜Â§Ã˜Â­Ã˜ÂµÃ™â€ž Ã˜Â¹Ã™â€žÃ™â€° {value} Ã™â€¦Ã™â€  Ã™â€šÃ˜ÂªÃ™â€žÃ˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ˜Â¨Ã˜Â§Ã˜Â¯Ã™Å ',
    achievement_goal_kills_day: 'Ã˜Â§Ã™â€šÃ˜ÂªÃ™â€ž {value} Ã˜Â¨Ã˜Â§Ã˜Â¯Ã™Å  Ã™ÂÃ™Å  Ã™Å Ã™Ë†Ã™â€¦ Ã™Ë†Ã˜Â§Ã˜Â­Ã˜Â¯',
    achievement_goal_points_day: 'Ã˜Â­Ã™â€šÃ™â€š {value} Ã™â€ Ã™â€šÃ˜Â·Ã˜Â© Ã˜Â¨Ã˜Â§Ã˜Â¯Ã™Å  Ã™ÂÃ™Å  Ã™Å Ã™Ë†Ã™â€¦ Ã™Ë†Ã˜Â§Ã˜Â­Ã˜Â¯',
    achievement_goal_streak: 'Ã˜Â§Ã˜Â­Ã˜ÂµÃ™â€ž Ã˜Â¹Ã™â€žÃ™â€° Ã˜Â³Ã™â€žÃ˜Â³Ã™â€žÃ˜Â© Ã˜Â¨Ã˜Â§Ã˜Â¯Ã™Å  Ã™â€šÃ˜Â¯Ã˜Â±Ã™â€¡Ã˜Â§ {value}',
    achievement_goal_group_day: 'Ã˜Â£Ã™Æ’Ã™â€¦Ã™â€ž Ã˜Â¬Ã™â€žÃ˜Â³Ã˜Â© {group} Ã˜Â¨Ã˜Â§Ã™â€žÃ˜Â­Ã˜ÂµÃ™Ë†Ã™â€ž Ã˜Â¹Ã™â€žÃ™â€° {value} Ã™â€šÃ˜ÂªÃ™â€žÃ˜Â© Ã˜Â¨Ã˜Â§Ã˜Â¯Ã™Å  Ã™ÂÃ™Å  Ã™Å Ã™Ë†Ã™â€¦ Ã™Ë†Ã˜Â§Ã˜Â­Ã˜Â¯',
    achievement_group_duo: 'Ã˜Â«Ã™â€ Ã˜Â§Ã˜Â¦Ã™Å ',
    achievement_group_trio: 'Ã˜Â«Ã™â€žÃ˜Â§Ã˜Â«Ã™Å ',
    achievement_group_quad: 'Ã˜Â±Ã˜Â¨Ã˜Â§Ã˜Â¹Ã™Å '
};
I18N_BENCHMARK_MISSING_PATCH.de = {
    footer_site_made_by: 'Website erstellt von',
    footer_disclaimer: 'Diese Website ist nicht mit GraalOnline verbunden, wird nicht von GraalOnline gepflegt, unterstÃƒÂ¼tzt oder gesponsert. Alle Assets Ã‚Â© 2026 GraalOnline',
    footer_terms: 'Nutzungsbedingungen',
    footer_privacy: 'DatenschutzerklÃƒÂ¤rung',
    footer_cookie: 'Cookie-Richtlinie',
    footer_dmca: 'DMCA-Richtlinie',
    profile_picture: 'Profilbild',
    upload_image: 'Bild hochladen',
    edit_image: 'Bild bearbeiten',
    remove_image: 'Bild entfernen',
    username_label: 'Benutzername (1-20 Zeichen)',
    guilds_max: 'Gilden (max. 6)',
    add_guild: 'Gilde hinzufÃƒÂ¼gen',
    guild_name_placeholder: 'Gildenname',
    country_flag: 'Landesflagge',
    remove_flag: 'Flagge entfernen',
    account_details: 'Kontodetails',
    account_id: 'Konto-ID',
    email_address: 'E-Mail-Adresse',
    new_email_placeholder: 'Neue E-Mail-Adresse',
    verify_update: 'Verifizieren & aktualisieren',
    change_email_address: 'E-Mail-Adresse ÃƒÂ¤ndern',
    change_password: 'Passwort ÃƒÂ¤ndern',
    delete_personal_account: 'PersÃƒÂ¶nliches Konto lÃƒÂ¶schen',
    cannot_undo: 'Dies kann nicht rÃƒÂ¼ckgÃƒÂ¤ngig gemacht werden.',
    delete_account: 'Konto lÃƒÂ¶schen',
    discard_changes: 'Ãƒâ€žnderungen verwerfen',
    save_changes: 'Ãƒâ€žnderungen speichern',
    your_account_id: 'Deine Konto-ID',
    friends_list_tab: 'Freundesliste',
    friend_requests_tab: 'Freundschaftsanfragen',
    remove_friends_tab: 'Freunde entfernen',
    enter_account_id_placeholder: 'Konto-ID eingeben',
    received_friend_requests: 'Erhaltene Freundschaftsanfragen',
    sent_friend_requests: 'Gesendete Freundschaftsanfragen',
    select_friends_remove: 'Freunde zum Entfernen auswÃƒÂ¤hlen',
    highlight_title_required_label: 'Titel (erforderlich)',
    highlight_desc_optional_label: 'Beschreibung (optional)',
    highlight_title_placeholder: 'Titel eingeben...',
    highlight_desc_placeholder: 'Beschreibung eingeben...',
    highlights_empty: 'Noch keine Highlights.',
    achievement_you_have: 'Du hast freigeschaltet',
    achievement_progress_prefix: '{name}:',
    achievement_goal_total: 'Erreiche {value} Baddy-Kills',
    achievement_goal_kills_day: 'TÃƒÂ¶te {value} Baddies an einem Tag',
    achievement_goal_points_day: 'Erreiche {value} Baddy-Punkte an einem Tag',
    achievement_goal_streak: 'Erreiche eine Baddy-Serie von {value}',
    achievement_goal_group_day: 'SchlieÃƒÅ¸e eine {group}-Session ab, indem du {value} Baddy-Kills an einem Tag erreichst',
    achievement_group_duo: 'Duo',
    achievement_group_trio: 'Trio',
    achievement_group_quad: 'Viererteam'
};
I18N_BENCHMARK_MISSING_PATCH.es = {
    footer_site_made_by: 'Sitio creado por',
    footer_disclaimer: 'Este sitio no estÃƒÂ¡ afiliado, mantenido, respaldado ni patrocinado por GraalOnline. Todos los recursos Ã‚Â© 2026 GraalOnline',
    footer_terms: 'TÃƒÂ©rminos y condiciones',
    footer_privacy: 'PolÃƒÂ­tica de privacidad',
    footer_cookie: 'PolÃƒÂ­tica de cookies',
    footer_dmca: 'PolÃƒÂ­tica DMCA',
    profile_picture: 'Foto de perfil',
    upload_image: 'Subir imagen',
    edit_image: 'Editar imagen',
    remove_image: 'Eliminar imagen',
    username_label: 'Nombre de usuario (1-20 caracteres)',
    guilds_max: 'Gremios (mÃƒÂ¡x. 6)',
    add_guild: 'Agregar gremio',
    guild_name_placeholder: 'Nombre del gremio',
    country_flag: 'Bandera del paÃƒÂ­s',
    remove_flag: 'Quitar bandera',
    account_details: 'Detalles de la cuenta',
    account_id: 'ID de cuenta',
    email_address: 'DirecciÃƒÂ³n de correo',
    new_email_placeholder: 'Nueva direcciÃƒÂ³n de correo',
    verify_update: 'Verificar y actualizar',
    change_email_address: 'Cambiar direcciÃƒÂ³n de correo',
    change_password: 'Cambiar contraseÃƒÂ±a',
    delete_personal_account: 'Eliminar cuenta personal',
    cannot_undo: 'Esto no se puede deshacer.',
    delete_account: 'Eliminar cuenta',
    discard_changes: 'Descartar cambios',
    save_changes: 'Guardar cambios',
    your_account_id: 'Tu ID de cuenta',
    friends_list_tab: 'Lista de amigos',
    friend_requests_tab: 'Solicitudes de amistad',
    remove_friends_tab: 'Eliminar amigos',
    enter_account_id_placeholder: 'Ingresa el ID de cuenta',
    received_friend_requests: 'Solicitudes de amistad recibidas',
    sent_friend_requests: 'Solicitudes enviadas',
    select_friends_remove: 'Selecciona amigos para eliminar',
    highlight_title_required_label: 'Título (Obligatorio)',
    highlight_desc_optional_label: 'Descripción (Opcional)',
    highlight_title_placeholder: 'Introduce un título...',
    highlight_desc_placeholder: 'Introduce una descripción...',
    highlights_empty: 'AÃƒÂºn no hay destacados.',
    achievement_you_have: 'Has desbloqueado',
    achievement_progress_prefix: '{name}:',
    achievement_goal_total: 'Consigue {value} bajas',
    achievement_goal_kills_day: 'Mata {value} enemigos en un día',
    achievement_goal_points_day: 'Consigue {value} puntos en un día',
    achievement_goal_streak: 'Racha de {value} enemigos',
    achievement_goal_group_day: 'Completa sesión {group} con {value} bajas en un día',
    achievement_group_duo: 'de dúo',
    achievement_group_trio: 'de trío',
    achievement_group_quad: 'de cuarteto'
};
I18N_BENCHMARK_MISSING_PATCH.vi = {
    footer_site_made_by: 'Trang web Ã„â€˜Ã†Â°Ã¡Â»Â£c tÃ¡ÂºÂ¡o bÃ¡Â»Å¸i',
    footer_disclaimer: 'Trang nÃƒÂ y khÃƒÂ´ng liÃƒÂªn kÃ¡ÂºÂ¿t, Ã„â€˜Ã†Â°Ã¡Â»Â£c duy trÃƒÂ¬, xÃƒÂ¡c nhÃ¡ÂºÂ­n hoÃ¡ÂºÂ·c tÃƒÂ i trÃ¡Â»Â£ bÃ¡Â»Å¸i GraalOnline. MÃ¡Â»Âi tÃƒÂ i sÃ¡ÂºÂ£n Ã‚Â© 2026 GraalOnline',
    footer_terms: 'Ã„ÂiÃ¡Â»Âu khoÃ¡ÂºÂ£n & Ã„ÂiÃ¡Â»Âu kiÃ¡Â»â€¡n',
    footer_privacy: 'ChÃƒÂ­nh sÃƒÂ¡ch quyÃ¡Â»Ân riÃƒÂªng tÃ†Â°',
    footer_cookie: 'ChÃƒÂ­nh sÃƒÂ¡ch Cookie',
    footer_dmca: 'ChÃƒÂ­nh sÃƒÂ¡ch DMCA',
    profile_picture: 'Ã¡ÂºÂ¢nh hÃ¡Â»â€œ sÃ†Â¡',
    upload_image: 'TÃ¡ÂºÂ£i Ã¡ÂºÂ£nh lÃƒÂªn',
    edit_image: 'ChÃ¡Â»â€°nh sÃ¡Â»Â­a Ã¡ÂºÂ£nh',
    remove_image: 'XÃƒÂ³a Ã¡ÂºÂ£nh',
    username_label: 'TÃƒÂªn ngÃ†Â°Ã¡Â»Âi dÃƒÂ¹ng (1-20 kÃƒÂ½ tÃ¡Â»Â±)',
    guilds_max: 'Guild (TÃ¡Â»â€˜i Ã„â€˜a 6)',
    add_guild: 'ThÃƒÂªm guild',
    guild_name_placeholder: 'TÃƒÂªn guild',
    country_flag: 'QuÃ¡Â»â€˜c kÃ¡Â»Â³',
    remove_flag: 'XÃƒÂ³a cÃ¡Â»Â',
    account_details: 'Chi tiÃ¡ÂºÂ¿t tÃƒÂ i khoÃ¡ÂºÂ£n',
    account_id: 'ID tÃƒÂ i khoÃ¡ÂºÂ£n',
    email_address: 'Ã„ÂÃ¡Â»â€¹a chÃ¡Â»â€° email',
    new_email_placeholder: 'Ã„ÂÃ¡Â»â€¹a chÃ¡Â»â€° email mÃ¡Â»â€ºi',
    verify_update: 'XÃƒÂ¡c minh & cÃ¡ÂºÂ­p nhÃ¡ÂºÂ­t',
    change_email_address: 'Ã„ÂÃ¡Â»â€¢i Ã„â€˜Ã¡Â»â€¹a chÃ¡Â»â€° email',
    change_password: 'Ã„ÂÃ¡Â»â€¢i mÃ¡ÂºÂ­t khÃ¡ÂºÂ©u',
    delete_personal_account: 'XÃƒÂ³a tÃƒÂ i khoÃ¡ÂºÂ£n cÃƒÂ¡ nhÃƒÂ¢n',
    cannot_undo: 'KhÃƒÂ´ng thÃ¡Â»Æ’ hoÃƒÂ n tÃƒÂ¡c.',
    delete_account: 'XÃƒÂ³a tÃƒÂ i khoÃ¡ÂºÂ£n',
    discard_changes: 'HÃ¡Â»Â§y thay Ã„â€˜Ã¡Â»â€¢i',
    save_changes: 'LÃ†Â°u thay Ã„â€˜Ã¡Â»â€¢i',
    your_account_id: 'ID tÃƒÂ i khoÃ¡ÂºÂ£n cÃ¡Â»Â§a bÃ¡ÂºÂ¡n',
    friends_list_tab: 'Danh sÃƒÂ¡ch bÃ¡ÂºÂ¡n bÃƒÂ¨',
    friend_requests_tab: 'YÃƒÂªu cÃ¡ÂºÂ§u kÃ¡ÂºÂ¿t bÃ¡ÂºÂ¡n',
    remove_friends_tab: 'XÃƒÂ³a bÃ¡ÂºÂ¡n bÃƒÂ¨',
    enter_account_id_placeholder: 'NhÃ¡ÂºÂ­p ID tÃƒÂ i khoÃ¡ÂºÂ£n',
    received_friend_requests: 'YÃƒÂªu cÃ¡ÂºÂ§u kÃ¡ÂºÂ¿t bÃ¡ÂºÂ¡n Ã„â€˜ÃƒÂ£ nhÃ¡ÂºÂ­n',
    sent_friend_requests: 'YÃƒÂªu cÃ¡ÂºÂ§u kÃ¡ÂºÂ¿t bÃ¡ÂºÂ¡n Ã„â€˜ÃƒÂ£ gÃ¡Â»Â­i',
    select_friends_remove: 'ChÃ¡Â»Ân bÃ¡ÂºÂ¡n bÃƒÂ¨ Ã„â€˜Ã¡Â»Æ’ xÃƒÂ³a',
    highlight_title_required_label: 'TiÃƒÂªu Ã„â€˜Ã¡Â»Â (BÃ¡ÂºÂ¯t buÃ¡Â»â„¢c)',
    highlight_desc_optional_label: 'MÃƒÂ´ tÃ¡ÂºÂ£ (TÃƒÂ¹y chÃ¡Â»Ân)',
    highlight_title_placeholder: 'NhÃ¡ÂºÂ­p tiÃƒÂªu Ã„â€˜Ã¡Â»Â...',
    highlight_desc_placeholder: 'NhÃ¡ÂºÂ­p mÃƒÂ´ tÃ¡ÂºÂ£...',
    highlights_empty: 'ChÃ†Â°a cÃƒÂ³ Ã„â€˜iÃ¡Â»Æ’m nÃ¡Â»â€¢i bÃ¡ÂºÂ­t.',
    achievement_you_have: 'BÃ¡ÂºÂ¡n Ã„â€˜ÃƒÂ£ mÃ¡Â»Å¸ khÃƒÂ³a',
    achievement_progress_prefix: '{name}:',
    achievement_goal_total: 'Ã„ÂÃ¡ÂºÂ¡t {value} lÃ¡ÂºÂ§n hÃ¡ÂºÂ¡ baddy',
    achievement_goal_kills_day: 'HÃ¡ÂºÂ¡ {value} baddy trong mÃ¡Â»â„¢t ngÃƒÂ y',
    achievement_goal_points_day: 'Ã„ÂÃ¡ÂºÂ¡t {value} Ã„â€˜iÃ¡Â»Æ’m baddy trong mÃ¡Â»â„¢t ngÃƒÂ y',
    achievement_goal_streak: 'Ã„ÂÃ¡ÂºÂ¡t chuÃ¡Â»â€”i baddy {value}',
    achievement_goal_group_day: 'HoÃƒÂ n thÃƒÂ nh phiÃƒÂªn {group} bÃ¡ÂºÂ±ng cÃƒÂ¡ch Ã„â€˜Ã¡ÂºÂ¡t {value} lÃ¡ÂºÂ§n hÃ¡ÂºÂ¡ baddy trong mÃ¡Â»â„¢t ngÃƒÂ y',
    achievement_group_duo: 'Ã„â€˜ÃƒÂ´i',
    achievement_group_trio: 'ba ngÃ†Â°Ã¡Â»Âi',
    achievement_group_quad: 'bÃ¡Â»â€˜n ngÃ†Â°Ã¡Â»Âi'
};
I18N_BENCHMARK_MISSING_PATCH.tr = {
    footer_site_made_by: 'Siteyi yapan',
    footer_disclaimer: 'Bu site GraalOnline ile baÃ„Å¸lantÃ„Â±lÃ„Â± deÃ„Å¸ildir; GraalOnline tarafÃ„Â±ndan yÃƒÂ¶netilmez, onaylanmaz veya sponsorlanmaz. TÃƒÂ¼m varlÃ„Â±klar Ã‚Â© 2026 GraalOnline',
    footer_terms: 'Ã…Å¾artlar ve KoÃ…Å¸ullar',
    footer_privacy: 'Gizlilik PolitikasÃ„Â±',
    footer_cookie: 'Ãƒâ€¡erez PolitikasÃ„Â±',
    footer_dmca: 'DMCA PolitikasÃ„Â±',
    profile_picture: 'Profil resmi',
    upload_image: 'GÃƒÂ¶rsel yÃƒÂ¼kle',
    edit_image: 'GÃƒÂ¶rseli dÃƒÂ¼zenle',
    remove_image: 'GÃƒÂ¶rseli kaldÃ„Â±r',
    username_label: 'KullanÃ„Â±cÃ„Â± adÃ„Â± (1-20 karakter)',
    guilds_max: 'Loncalar (Maks 6)',
    add_guild: 'Lonca ekle',
    guild_name_placeholder: 'Lonca adÃ„Â±',
    country_flag: 'ÃƒÅ“lke bayraÃ„Å¸Ã„Â±',
    remove_flag: 'BayraÃ„Å¸Ã„Â± kaldÃ„Â±r',
    account_details: 'Hesap detaylarÃ„Â±',
    account_id: 'Hesap ID',
    email_address: 'E-posta adresi',
    new_email_placeholder: 'Yeni e-posta adresi',
    verify_update: 'DoÃ„Å¸rula ve gÃƒÂ¼ncelle',
    change_email_address: 'E-posta adresini deÃ„Å¸iÃ…Å¸tir',
    change_password: 'Ã…Å¾ifre deÃ„Å¸iÃ…Å¸tir',
    delete_personal_account: 'KiÃ…Å¸isel hesabÃ„Â± sil',
    cannot_undo: 'Bu geri alÃ„Â±namaz.',
    delete_account: 'HesabÃ„Â± sil',
    discard_changes: 'DeÃ„Å¸iÃ…Å¸iklikleri iptal et',
    save_changes: 'DeÃ„Å¸iÃ…Å¸iklikleri kaydet',
    your_account_id: 'Hesap ID\'niz',
    friends_list_tab: 'ArkadaÃ…Å¸ listesi',
    friend_requests_tab: 'ArkadaÃ…Å¸lÃ„Â±k istekleri',
    remove_friends_tab: 'ArkadaÃ…Å¸larÃ„Â± kaldÃ„Â±r',
    enter_account_id_placeholder: 'Hesap ID girin',
    received_friend_requests: 'AlÃ„Â±nan arkadaÃ…Å¸lÃ„Â±k istekleri',
    sent_friend_requests: 'GÃƒÂ¶nderilen arkadaÃ…Å¸lÃ„Â±k istekleri',
    select_friends_remove: 'KaldÃ„Â±rÃ„Â±lacak arkadaÃ…Å¸larÃ„Â± seÃƒÂ§in',
    highlight_title_required_label: 'BaÃ…Å¸lÃ„Â±k (Zorunlu)',
    highlight_desc_optional_label: 'AÃƒÂ§Ã„Â±klama (Ã„Â°steÃ„Å¸e baÃ„Å¸lÃ„Â±)',
    highlight_title_placeholder: 'Bir baÃ…Å¸lÃ„Â±k girin...',
    highlight_desc_placeholder: 'Bir aÃƒÂ§Ã„Â±klama girin...',
    highlights_empty: 'HenÃƒÂ¼z ÃƒÂ¶ne ÃƒÂ§Ã„Â±kan yok.',
    achievement_you_have: 'Kilidini aÃƒÂ§tÃ„Â±n',
    achievement_progress_prefix: '{name}:',
    achievement_goal_total: '{value} baddy ÃƒÂ¶ldÃƒÂ¼rmesi elde et',
    achievement_goal_kills_day: 'Bir gÃƒÂ¼nde {value} baddy ÃƒÂ¶ldÃƒÂ¼r',
    achievement_goal_points_day: 'Bir gÃƒÂ¼nde {value} baddy puanÃ„Â±na ulaÃ…Å¸',
    achievement_goal_streak: '{value} baddy serisi yap',
    achievement_goal_group_day: 'Bir gÃƒÂ¼nde {value} baddy ÃƒÂ¶ldÃƒÂ¼rerek {group} oturumunu tamamla',
    achievement_group_duo: 'ikili',
    achievement_group_trio: 'ÃƒÂ¼ÃƒÂ§lÃƒÂ¼',
    achievement_group_quad: 'dÃƒÂ¶rtlÃƒÂ¼'
};
I18N_BENCHMARK_MISSING_PATCH.zh = {
    footer_site_made_by: 'Ã§Â½â€˜Ã§Â«â„¢Ã¥Ë†Â¶Ã¤Â½Å“Ã¨â‚¬â€¦',
    footer_disclaimer: 'Ã¦Å“Â¬Ã§Â½â€˜Ã§Â«â„¢Ã¤Â¸Å½ GraalOnline Ã¦â€”Â Ã¥â€¦Â³Ã¨Ââ€Ã¯Â¼Å’Ã¤Â¸â€Ã¦Å“ÂªÃ§Â»Â GraalOnline Ã§Â»Â´Ã¦Å Â¤Ã£â‚¬ÂÃ¨Â®Â¤Ã¥ÂÂ¯Ã¦Ë†â€“Ã¨ÂµÅ¾Ã¥Å Â©Ã£â‚¬â€šÃ¦â€°â‚¬Ã¦Å“â€°Ã¨Âµâ€žÃ¦ÂºÂ Ã‚Â© 2026 GraalOnline',
    footer_terms: 'Ã¦ÂÂ¡Ã¦Â¬Â¾Ã¥â€™Å’Ã¦ÂÂ¡Ã¤Â»Â¶',
    footer_privacy: 'Ã©Å¡ÂÃ§Â§ÂÃ¦â€Â¿Ã§Â­â€“',
    footer_cookie: 'Cookie Ã¦â€Â¿Ã§Â­â€“',
    footer_dmca: 'DMCA Ã¦â€Â¿Ã§Â­â€“',
    profile_picture: 'Ã¥Â¤Â´Ã¥Æ’Â',
    upload_image: 'Ã¤Â¸Å Ã¤Â¼Â Ã¥â€ºÂ¾Ã§â€°â€¡',
    edit_image: 'Ã§Â¼â€“Ã¨Â¾â€˜Ã¥â€ºÂ¾Ã§â€°â€¡',
    remove_image: 'Ã§Â§Â»Ã©â„¢Â¤Ã¥â€ºÂ¾Ã§â€°â€¡',
    username_label: 'Ã§â€Â¨Ã¦Ë†Â·Ã¥ÂÂÃ¯Â¼Ë†1-20Ã¤Â¸ÂªÃ¥Â­â€”Ã§Â¬Â¦Ã¯Â¼â€°',
    guilds_max: 'Ã¥â€¦Â¬Ã¤Â¼Å¡Ã¯Â¼Ë†Ã¦Å“â‚¬Ã¥Â¤Å¡6Ã¤Â¸ÂªÃ¯Â¼â€°',
    add_guild: 'Ã¦Â·Â»Ã¥Å Â Ã¥â€¦Â¬Ã¤Â¼Å¡',
    guild_name_placeholder: 'Ã¥â€¦Â¬Ã¤Â¼Å¡Ã¥ÂÂÃ§Â§Â°',
    country_flag: 'Ã¥â€ºÂ½Ã¥Â®Â¶Ã¦â€”â€”Ã¥Â¸Å“',
    remove_flag: 'Ã§Â§Â»Ã©â„¢Â¤Ã¦â€”â€”Ã¥Â¸Å“',
    account_details: 'Ã¨Â´Â¦Ã¦Ë†Â·Ã¨Â¯Â¦Ã¦Æ’â€¦',
    account_id: 'Ã¨Â´Â¦Ã¦Ë†Â·ID',
    email_address: 'Ã©â€šÂ®Ã§Â®Â±Ã¥Å“Â°Ã¥Ââ‚¬',
    new_email_placeholder: 'Ã¦â€“Â°Ã©â€šÂ®Ã§Â®Â±Ã¥Å“Â°Ã¥Ââ‚¬',
    verify_update: 'Ã©ÂªÅ’Ã¨Â¯ÂÃ¥Â¹Â¶Ã¦â€ºÂ´Ã¦â€“Â°',
    change_email_address: 'Ã¦â€ºÂ´Ã¦â€Â¹Ã©â€šÂ®Ã§Â®Â±Ã¥Å“Â°Ã¥Ââ‚¬',
    change_password: 'Ã¦â€ºÂ´Ã¦â€Â¹Ã¥Â¯â€ Ã§Â Â',
    delete_personal_account: 'Ã¥Ë†Â Ã©â„¢Â¤Ã¤Â¸ÂªÃ¤ÂºÂºÃ¨Â´Â¦Ã¦Ë†Â·',
    cannot_undo: 'Ã¦Â­Â¤Ã¦â€œÂÃ¤Â½Å“Ã¦â€”Â Ã¦Â³â€¢Ã¦â€™Â¤Ã©â€â‚¬Ã£â‚¬â€š',
    delete_account: 'Ã¥Ë†Â Ã©â„¢Â¤Ã¨Â´Â¦Ã¦Ë†Â·',
    discard_changes: 'Ã¦â€Â¾Ã¥Â¼Æ’Ã¦â€ºÂ´Ã¦â€Â¹',
    save_changes: 'Ã¤Â¿ÂÃ¥Â­ËœÃ¦â€ºÂ´Ã¦â€Â¹',
    your_account_id: 'Ã¤Â½Â Ã§Å¡â€žÃ¨Â´Â¦Ã¦Ë†Â·ID',
    friends_list_tab: 'Ã¥Â¥Â½Ã¥Ââ€¹Ã¥Ë†â€”Ã¨Â¡Â¨',
    friend_requests_tab: 'Ã¥Â¥Â½Ã¥Ââ€¹Ã¨Â¯Â·Ã¦Â±â€š',
    remove_friends_tab: 'Ã§Â§Â»Ã©â„¢Â¤Ã¥Â¥Â½Ã¥Ââ€¹',
    enter_account_id_placeholder: 'Ã¨Â¾â€œÃ¥â€¦Â¥Ã¨Â´Â¦Ã¦Ë†Â·ID',
    received_friend_requests: 'Ã¦â€Â¶Ã¥Ë†Â°Ã§Å¡â€žÃ¥Â¥Â½Ã¥Ââ€¹Ã¨Â¯Â·Ã¦Â±â€š',
    sent_friend_requests: 'Ã¥Â·Â²Ã¥Ââ€˜Ã©â‚¬ÂÃ§Å¡â€žÃ¥Â¥Â½Ã¥Ââ€¹Ã¨Â¯Â·Ã¦Â±â€š',
    select_friends_remove: 'Ã©â‚¬â€°Ã¦â€¹Â©Ã¨Â¦ÂÃ§Â§Â»Ã©â„¢Â¤Ã§Å¡â€žÃ¥Â¥Â½Ã¥Ââ€¹',
    highlight_title_required_label: 'Ã¦Â â€¡Ã©Â¢ËœÃ¯Â¼Ë†Ã¥Â¿â€¦Ã¥Â¡Â«Ã¯Â¼â€°',
    highlight_desc_optional_label: 'Ã¦ÂÂÃ¨Â¿Â°Ã¯Â¼Ë†Ã¥ÂÂ¯Ã©â‚¬â€°Ã¯Â¼â€°',
    highlight_title_placeholder: 'Ã¨Â¾â€œÃ¥â€¦Â¥Ã¦Â â€¡Ã©Â¢Ëœ...',
    highlight_desc_placeholder: 'Ã¨Â¾â€œÃ¥â€¦Â¥Ã¦ÂÂÃ¨Â¿Â°...',
    highlights_empty: 'Ã¦Å¡â€šÃ¦â€”Â Ã§Â²Â¾Ã¥Â½Â©Ã¦â€”Â¶Ã¥Ë†Â»Ã£â‚¬â€š',
    achievement_you_have: 'Ã¤Â½Â Ã¥Â·Â²Ã¨Â§Â£Ã©â€Â',
    achievement_progress_prefix: '{name}:',
    achievement_goal_total: 'Ã¨Å½Â·Ã¥Â¾â€” {value} Ã¦Â¬Â¡ baddy Ã¥â€¡Â»Ã¦Ââ‚¬',
    achievement_goal_kills_day: 'Ã¤Â¸â‚¬Ã¥Â¤Â©Ã¥â€ â€¦Ã¥â€¡Â»Ã¦Ââ‚¬ {value} Ã¤Â¸Âª baddy',
    achievement_goal_points_day: 'Ã¤Â¸â‚¬Ã¥Â¤Â©Ã¥â€ â€¦Ã¨Â¾Â¾Ã¥Ë†Â° {value} baddy Ã§Â§Â¯Ã¥Ë†â€ ',
    achievement_goal_streak: 'Ã¨Å½Â·Ã¥Â¾â€” {value} Ã§Å¡â€ž baddy Ã¨Â¿Å¾Ã¦Ââ‚¬',
    achievement_goal_group_day: 'Ã¥Å“Â¨Ã¤Â¸â‚¬Ã¥Â¤Â©Ã¥â€ â€¦Ã¨Å½Â·Ã¥Â¾â€” {value} Ã¦Â¬Â¡ baddy Ã¥â€¡Â»Ã¦Ââ‚¬Ã¦ÂÂ¥Ã¥Â®Å’Ã¦Ë†ÂÃ¤Â¸â‚¬Ã¦Â¬Â¡ {group} Ã¥Å“ÂºÃ¦Â¬Â¡',
    achievement_group_duo: 'Ã¥ÂÅ’Ã¤ÂºÂº',
    achievement_group_trio: 'Ã¤Â¸â€°Ã¤ÂºÂº',
    achievement_group_quad: 'Ã¥â€ºâ€ºÃ¤ÂºÂº'
};
I18N_BENCHMARK_MISSING_PATCH.ja = {
    footer_site_made_by: 'Ã£â€šÂµÃ£â€šÂ¤Ã£Æ’Ë†Ã¥Ë†Â¶Ã¤Â½Å“',
    footer_disclaimer: 'Ã£Ââ€œÃ£ÂÂ®Ã£â€šÂµÃ£â€šÂ¤Ã£Æ’Ë†Ã£ÂÂ¯ GraalOnline Ã£ÂÂ¨Ã¦ÂÂÃ¦ÂÂºÃ£Æ’Â»Ã§Â®Â¡Ã§Ââ€ Ã£Æ’Â»Ã¦â€°Â¿Ã¨ÂªÂÃ£Æ’Â»Ã¥Â¾Å’Ã¦ÂÂ´Ã£Ââ€¢Ã£â€šÅ’Ã£ÂÂ¦Ã£Ââ€žÃ£ÂÂ¾Ã£Ââ€ºÃ£â€šâ€œÃ£â‚¬â€šÃ£Ââ„¢Ã£ÂÂ¹Ã£ÂÂ¦Ã£ÂÂ®Ã¨Â³â€¡Ã§â€Â£ Ã‚Â© 2026 GraalOnline',
    footer_terms: 'Ã¥Ë†Â©Ã§â€Â¨Ã¨Â¦ÂÃ§Â´â€ž',
    footer_privacy: 'Ã£Æ’â€”Ã£Æ’Â©Ã£â€šÂ¤Ã£Æ’ÂÃ£â€šÂ·Ã£Æ’Â¼Ã£Æ’ÂÃ£Æ’ÂªÃ£â€šÂ·Ã£Æ’Â¼',
    footer_cookie: 'Ã£â€šÂ¯Ã£Æ’Æ’Ã£â€šÂ­Ã£Æ’Â¼Ã£Æ’ÂÃ£Æ’ÂªÃ£â€šÂ·Ã£Æ’Â¼',
    footer_dmca: 'DMCAÃ£Æ’ÂÃ£Æ’ÂªÃ£â€šÂ·Ã£Æ’Â¼',
    profile_picture: 'Ã£Æ’â€”Ã£Æ’Â­Ã£Æ’â€¢Ã£â€šÂ£Ã£Æ’Â¼Ã£Æ’Â«Ã§â€Â»Ã¥Æ’Â',
    upload_image: 'Ã§â€Â»Ã¥Æ’ÂÃ£â€šâ€™Ã£â€šÂ¢Ã£Æ’Æ’Ã£Æ’â€”Ã£Æ’Â­Ã£Æ’Â¼Ã£Æ’â€°',
    edit_image: 'Ã§â€Â»Ã¥Æ’ÂÃ£â€šâ€™Ã§Â·Â¨Ã©â€ºâ€ ',
    remove_image: 'Ã§â€Â»Ã¥Æ’ÂÃ£â€šâ€™Ã¥â€°Å Ã©â„¢Â¤',
    username_label: 'Ã£Æ’Â¦Ã£Æ’Â¼Ã£â€šÂ¶Ã£Æ’Â¼Ã¥ÂÂÃ¯Â¼Ë†1-20Ã¦â€“â€¡Ã¥Â­â€”Ã¯Â¼â€°',
    guilds_max: 'Ã£â€šÂ®Ã£Æ’Â«Ã£Æ’â€°Ã¯Â¼Ë†Ã¦Å“â‚¬Ã¥Â¤Â§6Ã¯Â¼â€°',
    add_guild: 'Ã£â€šÂ®Ã£Æ’Â«Ã£Æ’â€°Ã£â€šâ€™Ã¨Â¿Â½Ã¥Å Â ',
    guild_name_placeholder: 'Ã£â€šÂ®Ã£Æ’Â«Ã£Æ’â€°Ã¥ÂÂ',
    country_flag: 'Ã¥â€ºÂ½Ã¦â€”â€”',
    remove_flag: 'Ã¦â€”â€”Ã£â€šâ€™Ã¥â€°Å Ã©â„¢Â¤',
    account_details: 'Ã£â€šÂ¢Ã£â€šÂ«Ã£â€šÂ¦Ã£Æ’Â³Ã£Æ’Ë†Ã¨Â©Â³Ã§Â´Â°',
    account_id: 'Ã£â€šÂ¢Ã£â€šÂ«Ã£â€šÂ¦Ã£Æ’Â³Ã£Æ’Ë†ID',
    email_address: 'Ã£Æ’Â¡Ã£Æ’Â¼Ã£Æ’Â«Ã£â€šÂ¢Ã£Æ’â€°Ã£Æ’Â¬Ã£â€šÂ¹',
    new_email_placeholder: 'Ã¦â€“Â°Ã£Ââ€”Ã£Ââ€žÃ£Æ’Â¡Ã£Æ’Â¼Ã£Æ’Â«Ã£â€šÂ¢Ã£Æ’â€°Ã£Æ’Â¬Ã£â€šÂ¹',
    verify_update: 'Ã§Â¢ÂºÃ¨ÂªÂÃ£Ââ€”Ã£ÂÂ¦Ã¦â€ºÂ´Ã¦â€“Â°',
    change_email_address: 'Ã£Æ’Â¡Ã£Æ’Â¼Ã£Æ’Â«Ã£â€šÂ¢Ã£Æ’â€°Ã£Æ’Â¬Ã£â€šÂ¹Ã£â€šâ€™Ã¥Â¤â€°Ã¦â€ºÂ´',
    change_password: 'Ã£Æ’â€˜Ã£â€šÂ¹Ã£Æ’Â¯Ã£Æ’Â¼Ã£Æ’â€°Ã£â€šâ€™Ã¥Â¤â€°Ã¦â€ºÂ´',
    delete_personal_account: 'Ã¥â‚¬â€¹Ã¤ÂºÂºÃ£â€šÂ¢Ã£â€šÂ«Ã£â€šÂ¦Ã£Æ’Â³Ã£Æ’Ë†Ã£â€šâ€™Ã¥â€°Å Ã©â„¢Â¤',
    cannot_undo: 'Ã£Ââ€œÃ£â€šÅ’Ã£ÂÂ¯Ã¥â€¦Æ’Ã£ÂÂ«Ã¦Ë†Â»Ã£Ââ€ºÃ£ÂÂ¾Ã£Ââ€ºÃ£â€šâ€œÃ£â‚¬â€š',
    delete_account: 'Ã£â€šÂ¢Ã£â€šÂ«Ã£â€šÂ¦Ã£Æ’Â³Ã£Æ’Ë†Ã£â€šâ€™Ã¥â€°Å Ã©â„¢Â¤',
    discard_changes: 'Ã¥Â¤â€°Ã¦â€ºÂ´Ã£â€šâ€™Ã§Â Â´Ã¦Â£â€ž',
    save_changes: 'Ã¥Â¤â€°Ã¦â€ºÂ´Ã£â€šâ€™Ã¤Â¿ÂÃ¥Â­Ëœ',
    your_account_id: 'Ã£Ââ€šÃ£ÂÂªÃ£ÂÅ¸Ã£ÂÂ®Ã£â€šÂ¢Ã£â€šÂ«Ã£â€šÂ¦Ã£Æ’Â³Ã£Æ’Ë†ID',
    friends_list_tab: 'Ã£Æ’â€¢Ã£Æ’Â¬Ã£Æ’Â³Ã£Æ’â€°Ã¤Â¸â‚¬Ã¨Â¦Â§',
    friend_requests_tab: 'Ã£Æ’â€¢Ã£Æ’Â¬Ã£Æ’Â³Ã£Æ’â€°Ã§â€Â³Ã¨Â«â€¹',
    remove_friends_tab: 'Ã£Æ’â€¢Ã£Æ’Â¬Ã£Æ’Â³Ã£Æ’â€°Ã£â€šâ€™Ã¥â€°Å Ã©â„¢Â¤',
    enter_account_id_placeholder: 'Ã£â€šÂ¢Ã£â€šÂ«Ã£â€šÂ¦Ã£Æ’Â³Ã£Æ’Ë†IDÃ£â€šâ€™Ã¥â€¦Â¥Ã¥Å â€º',
    received_friend_requests: 'Ã¥Ââ€”Ã¤Â¿Â¡Ã£Ââ€”Ã£ÂÅ¸Ã£Æ’â€¢Ã£Æ’Â¬Ã£Æ’Â³Ã£Æ’â€°Ã§â€Â³Ã¨Â«â€¹',
    sent_friend_requests: 'Ã©â‚¬ÂÃ¤Â¿Â¡Ã£Ââ€”Ã£ÂÅ¸Ã£Æ’â€¢Ã£Æ’Â¬Ã£Æ’Â³Ã£Æ’â€°Ã§â€Â³Ã¨Â«â€¹',
    select_friends_remove: 'Ã¥â€°Å Ã©â„¢Â¤Ã£Ââ„¢Ã£â€šâ€¹Ã£Æ’â€¢Ã£Æ’Â¬Ã£Æ’Â³Ã£Æ’â€°Ã£â€šâ€™Ã©ÂÂ¸Ã¦Å Å¾',
    highlight_title_required_label: 'Ã£â€šÂ¿Ã£â€šÂ¤Ã£Æ’Ë†Ã£Æ’Â«Ã¯Â¼Ë†Ã¥Â¿â€¦Ã©Â Ë†Ã¯Â¼â€°',
    highlight_desc_optional_label: 'Ã¨ÂªÂ¬Ã¦ËœÅ½Ã¯Â¼Ë†Ã¤Â»Â»Ã¦â€žÂÃ¯Â¼â€°',
    highlight_title_placeholder: 'Ã£â€šÂ¿Ã£â€šÂ¤Ã£Æ’Ë†Ã£Æ’Â«Ã£â€šâ€™Ã¥â€¦Â¥Ã¥Å â€º...',
    highlight_desc_placeholder: 'Ã¨ÂªÂ¬Ã¦ËœÅ½Ã£â€šâ€™Ã¥â€¦Â¥Ã¥Å â€º...',
    highlights_empty: 'Ã£ÂÂ¾Ã£ÂÂ Ã£Æ’ÂÃ£â€šÂ¤Ã£Æ’Â©Ã£â€šÂ¤Ã£Æ’Ë†Ã£ÂÅ’Ã£Ââ€šÃ£â€šÅ Ã£ÂÂ¾Ã£Ââ€ºÃ£â€šâ€œÃ£â‚¬â€š',
    achievement_you_have: 'Ã¨Â§Â£Ã©â„¢Â¤Ã¦Â¸Ë†Ã£ÂÂ¿',
    achievement_progress_prefix: '{name}:',
    achievement_goal_total: '{value} Ã£ÂÂ®Ã£Æ’ÂÃ£Æ’â€¡Ã£â€šÂ£Ã£â€šÂ­Ã£Æ’Â«Ã£â€šâ€™Ã§ÂÂ²Ã¥Â¾â€”',
    achievement_goal_kills_day: '1Ã¦â€”Â¥Ã£ÂÂ§ {value} Ã¤Â½â€œÃ£ÂÂ®Ã£Æ’ÂÃ£Æ’â€¡Ã£â€šÂ£Ã£â€šâ€™Ã¥â‚¬â€™Ã£Ââ„¢',
    achievement_goal_points_day: '1Ã¦â€”Â¥Ã£ÂÂ§ {value} Ã£Æ’ÂÃ£Æ’â€¡Ã£â€šÂ£Ã£Æ’ÂÃ£â€šÂ¤Ã£Æ’Â³Ã£Æ’Ë†Ã£ÂÂ«Ã¥Ë†Â°Ã©Ââ€',
    achievement_goal_streak: '{value} Ã£ÂÂ®Ã£Æ’ÂÃ£Æ’â€¡Ã£â€šÂ£Ã©â‚¬Â£Ã§Â¶Å¡Ã£â€šÂ­Ã£Æ’Â«Ã£â€šâ€™Ã©Ââ€Ã¦Ë†Â',
    achievement_goal_group_day: '1Ã¦â€”Â¥Ã£ÂÂ§ {value} Ã£Æ’ÂÃ£Æ’â€¡Ã£â€šÂ£Ã£â€šÂ­Ã£Æ’Â«Ã£â€šâ€™Ã©Ââ€Ã¦Ë†ÂÃ£Ââ€”Ã£ÂÂ¦ {group} Ã£â€šÂ»Ã£Æ’Æ’Ã£â€šÂ·Ã£Æ’Â§Ã£Æ’Â³Ã£â€šâ€™Ã¥Â®Å’Ã¤Âºâ€ ',
    achievement_group_duo: 'Ã£Æ’â€¡Ã£Æ’Â¥Ã£â€šÂª',
    achievement_group_trio: 'Ã£Æ’Ë†Ã£Æ’ÂªÃ£â€šÂª',
    achievement_group_quad: 'Ã£â€šÂ¯Ã£â€šÂ¢Ã£Æ’Æ’Ã£Æ’â€°'
};
I18N_BENCHMARK_MISSING_PATCH.ko = {
    footer_site_made_by: 'Ã¬â€šÂ¬Ã¬ÂÂ´Ã­Å Â¸ Ã¬Â Å“Ã¬Å¾â€˜',
    footer_disclaimer: 'Ã¬ÂÂ´ Ã¬â€šÂ¬Ã¬ÂÂ´Ã­Å Â¸Ã«Å â€ GraalOnlineÃªÂ³Â¼ Ã¬Â Å“Ã­Å“Â´, Ã¬Å“Â Ã¬Â§â‚¬ÃªÂ´â‚¬Ã«Â¦Â¬, Ã¬Å Â¹Ã¬ÂÂ¸ Ã«ËœÂÃ«Å â€ Ã­â€ºâ€žÃ¬â€ºÂÃ¬Ââ€ž Ã«Â°â€ºÃ¬Â§â‚¬ Ã¬â€¢Å Ã¬Å ÂµÃ«â€¹Ë†Ã«â€¹Â¤. Ã«ÂªÂ¨Ã«â€œÂ  Ã¬Å¾ÂÃ¬â€šÂ° Ã‚Â© 2026 GraalOnline',
    footer_terms: 'Ã¬ÂÂ´Ã¬Å¡Â©Ã¬â€¢Â½ÃªÂ´â‚¬',
    footer_privacy: 'ÃªÂ°Å“Ã¬ÂÂ¸Ã¬Â â€¢Ã«Â³Â´ Ã¬Â²ËœÃ«Â¦Â¬Ã«Â°Â©Ã¬Â¹Â¨',
    footer_cookie: 'Ã¬Â¿Â Ã­â€šÂ¤ Ã¬Â â€¢Ã¬Â±â€¦',
    footer_dmca: 'DMCA Ã¬Â â€¢Ã¬Â±â€¦',
    profile_picture: 'Ã­â€â€žÃ«Â¡Å“Ã­â€¢â€ž Ã¬â€šÂ¬Ã¬Â§â€ž',
    upload_image: 'Ã¬ÂÂ´Ã«Â¯Â¸Ã¬Â§â‚¬ Ã¬â€”â€¦Ã«Â¡Å“Ã«â€œÅ“',
    edit_image: 'Ã¬ÂÂ´Ã«Â¯Â¸Ã¬Â§â‚¬ Ã­Å½Â¸Ã¬Â§â€˜',
    remove_image: 'Ã¬ÂÂ´Ã«Â¯Â¸Ã¬Â§â‚¬ Ã¬Â Å“ÃªÂ±Â°',
    username_label: 'Ã¬â€šÂ¬Ã¬Å¡Â©Ã¬Å¾Â Ã¬ÂÂ´Ã«Â¦â€ž (1-20Ã¬Å¾Â)',
    guilds_max: 'ÃªÂ¸Â¸Ã«â€œÅ“ (Ã¬ÂµÅ“Ã«Å’â‚¬ 6ÃªÂ°Å“)',
    add_guild: 'ÃªÂ¸Â¸Ã«â€œÅ“ Ã¬Â¶â€ÃªÂ°â‚¬',
    guild_name_placeholder: 'ÃªÂ¸Â¸Ã«â€œÅ“ Ã¬ÂÂ´Ã«Â¦â€ž',
    country_flag: 'ÃªÂµÂ­ÃªÂ¸Â°',
    remove_flag: 'ÃªÂµÂ­ÃªÂ¸Â° Ã¬Â Å“ÃªÂ±Â°',
    account_details: 'ÃªÂ³â€žÃ¬Â â€¢ Ã¬Â â€¢Ã«Â³Â´',
    account_id: 'ÃªÂ³â€žÃ¬Â â€¢ ID',
    email_address: 'Ã¬ÂÂ´Ã«Â©â€Ã¬ÂÂ¼ Ã¬Â£Â¼Ã¬â€ Å’',
    new_email_placeholder: 'Ã¬Æ’Ë† Ã¬ÂÂ´Ã«Â©â€Ã¬ÂÂ¼ Ã¬Â£Â¼Ã¬â€ Å’',
    verify_update: 'Ã¬ÂÂ¸Ã¬Â¦Â Ã­â€ºâ€ž Ã¬â€”â€¦Ã«ÂÂ°Ã¬ÂÂ´Ã­Å Â¸',
    change_email_address: 'Ã¬ÂÂ´Ã«Â©â€Ã¬ÂÂ¼ Ã¬Â£Â¼Ã¬â€ Å’ Ã«Â³â‚¬ÃªÂ²Â½',
    change_password: 'Ã«Â¹â€žÃ«Â°â‚¬Ã«Â²Ë†Ã­ËœÂ¸ Ã«Â³â‚¬ÃªÂ²Â½',
    delete_personal_account: 'ÃªÂ°Å“Ã¬ÂÂ¸ ÃªÂ³â€žÃ¬Â â€¢ Ã¬â€šÂ­Ã¬Â Å“',
    cannot_undo: 'Ã¬ÂÂ´ Ã¬Å¾â€˜Ã¬â€”â€¦Ã¬Ââ‚¬ Ã«ÂËœÃ«ÂÅ’Ã«Â¦Â´ Ã¬Ë†Ëœ Ã¬â€”â€ Ã¬Å ÂµÃ«â€¹Ë†Ã«â€¹Â¤.',
    delete_account: 'ÃªÂ³â€žÃ¬Â â€¢ Ã¬â€šÂ­Ã¬Â Å“',
    discard_changes: 'Ã«Â³â‚¬ÃªÂ²Â½ Ã¬â€šÂ¬Ã­â€¢Â­ Ã¬Â·Â¨Ã¬â€ Å’',
    save_changes: 'Ã«Â³â‚¬ÃªÂ²Â½ Ã¬â€šÂ¬Ã­â€¢Â­ Ã¬Â â‚¬Ã¬Å¾Â¥',
    your_account_id: 'Ã«â€šÂ´ ÃªÂ³â€žÃ¬Â â€¢ ID',
    friends_list_tab: 'Ã¬Â¹Å“ÃªÂµÂ¬ Ã«ÂªÂ©Ã«Â¡Â',
    friend_requests_tab: 'Ã¬Â¹Å“ÃªÂµÂ¬ Ã¬Å¡â€Ã¬Â²Â­',
    remove_friends_tab: 'Ã¬Â¹Å“ÃªÂµÂ¬ Ã¬â€šÂ­Ã¬Â Å“',
    enter_account_id_placeholder: 'ÃªÂ³â€žÃ¬Â â€¢ ID Ã¬Å¾â€¦Ã«Â Â¥',
    received_friend_requests: 'Ã«Â°â€ºÃ¬Ââ‚¬ Ã¬Â¹Å“ÃªÂµÂ¬ Ã¬Å¡â€Ã¬Â²Â­',
    sent_friend_requests: 'Ã«Â³Â´Ã«â€šÂ¸ Ã¬Â¹Å“ÃªÂµÂ¬ Ã¬Å¡â€Ã¬Â²Â­',
    select_friends_remove: 'Ã¬â€šÂ­Ã¬Â Å“Ã­â€¢Â  Ã¬Â¹Å“ÃªÂµÂ¬ Ã¬â€žÂ Ã­Æ’Â',
    highlight_title_required_label: 'Ã¬Â Å“Ã«ÂªÂ© (Ã­â€¢â€žÃ¬Ë†Ëœ)',
    highlight_desc_optional_label: 'Ã¬â€žÂ¤Ã«Âªâ€¦ (Ã¬â€žÂ Ã­Æ’Â)',
    highlight_title_placeholder: 'Ã¬Â Å“Ã«ÂªÂ© Ã¬Å¾â€¦Ã«Â Â¥...',
    highlight_desc_placeholder: 'Ã¬â€žÂ¤Ã«Âªâ€¦ Ã¬Å¾â€¦Ã«Â Â¥...',
    highlights_empty: 'Ã¬â€¢â€žÃ¬Â§Â Ã­â€¢ËœÃ¬ÂÂ´Ã«ÂÂ¼Ã¬ÂÂ´Ã­Å Â¸ÃªÂ°â‚¬ Ã¬â€”â€ Ã¬Å ÂµÃ«â€¹Ë†Ã«â€¹Â¤.',
    achievement_you_have: 'Ã­â€¢Â´ÃªÂ¸Ë†Ã­â€¢Å“ Ã­â€¢Â­Ã«ÂªÂ©',
    achievement_progress_prefix: '{name}:',
    achievement_goal_total: 'Ã«Â°â€Ã«â€â€ Ã¬Â²ËœÃ¬Â¹Ëœ {value}Ã­Å¡Å’ Ã«â€¹Â¬Ã¬â€žÂ±',
    achievement_goal_kills_day: 'Ã­â€¢ËœÃ«Â£Â¨Ã¬â€”Â Ã«Â°â€Ã«â€â€ {value}Ã«Â§Ë†Ã«Â¦Â¬ Ã¬Â²ËœÃ¬Â¹Ëœ',
    achievement_goal_points_day: 'Ã­â€¢ËœÃ«Â£Â¨Ã¬â€”Â Ã«Â°â€Ã«â€â€ Ã­ÂÂ¬Ã¬ÂÂ¸Ã­Å Â¸ {value} Ã«â€¹Â¬Ã¬â€žÂ±',
    achievement_goal_streak: 'Ã«Â°â€Ã«â€â€ Ã¬â€”Â°Ã¬â€ Â Ã¬Â²ËœÃ¬Â¹Ëœ {value} Ã«â€¹Â¬Ã¬â€žÂ±',
    achievement_goal_group_day: 'Ã­â€¢ËœÃ«Â£Â¨Ã¬â€”Â Ã«Â°â€Ã«â€â€ {value}Ã«Â§Ë†Ã«Â¦Â¬ Ã¬Â²ËœÃ¬Â¹ËœÃ«Â¡Å“ {group} Ã¬â€žÂ¸Ã¬â€¦Ëœ Ã¬â„¢â€žÃ«Â£Å’',
    achievement_group_duo: 'Ã«â€œâ‚¬Ã¬ËœÂ¤',
    achievement_group_trio: 'Ã­Å Â¸Ã«Â¦Â¬Ã¬ËœÂ¤',
    achievement_group_quad: 'Ã¬Â¿Â¼Ã«â€œÅ“'
};
I18N_BENCHMARK_MISSING_PATCH.fr = {
    footer_site_made_by: 'Site crÃƒÂ©ÃƒÂ© par',
    footer_disclaimer: 'Ce site n\'est ni affiliÃƒÂ©, ni maintenu, ni approuvÃƒÂ©, ni sponsorisÃƒÂ© par GraalOnline. Tous les contenus Ã‚Â© 2026 GraalOnline',
    footer_terms: 'Conditions gÃƒÂ©nÃƒÂ©rales',
    footer_privacy: 'Politique de confidentialitÃƒÂ©',
    footer_cookie: 'Politique relative aux cookies',
    footer_dmca: 'Politique DMCA',
    profile_picture: 'Photo de profil',
    upload_image: 'TÃƒÂ©lÃƒÂ©verser une image',
    edit_image: 'Modifier l\'image',
    remove_image: 'Supprimer l\'image',
    username_label: 'Nom d\'utilisateur (1-20 caractÃƒÂ¨res)',
    guilds_max: 'Guildes (max 6)',
    add_guild: 'Ajouter une guilde',
    guild_name_placeholder: 'Nom de la guilde',
    country_flag: 'Drapeau du pays',
    remove_flag: 'Supprimer le drapeau',
    account_details: 'DÃƒÂ©tails du compte',
    account_id: 'ID du compte',
    email_address: 'Adresse e-mail',
    new_email_placeholder: 'Nouvelle adresse e-mail',
    verify_update: 'VÃƒÂ©rifier et mettre ÃƒÂ  jour',
    change_email_address: 'Changer l\'adresse e-mail',
    change_password: 'Changer le mot de passe',
    delete_personal_account: 'Supprimer le compte personnel',
    cannot_undo: 'Cela ne peut pas ÃƒÂªtre annulÃƒÂ©.',
    delete_account: 'Supprimer le compte',
    discard_changes: 'Annuler les modifications',
    save_changes: 'Enregistrer les modifications',
    your_account_id: 'Votre ID de compte',
    friends_list_tab: 'Liste d\'amis',
    friend_requests_tab: 'Demandes d\'ami',
    remove_friends_tab: 'Retirer des amis',
    enter_account_id_placeholder: 'Entrez l\'ID du compte',
    received_friend_requests: 'Demandes d\'ami reÃƒÂ§ues',
    sent_friend_requests: 'Demandes d\'ami envoyÃƒÂ©es',
    select_friends_remove: 'SÃƒÂ©lectionnez des amis ÃƒÂ  retirer',
    highlight_title_required_label: 'Titre (obligatoire)',
    highlight_desc_optional_label: 'Description (optionnelle)',
    highlight_title_placeholder: 'Entrez un titre...',
    highlight_desc_placeholder: 'Entrez une description...',
    highlights_empty: 'Aucun moment fort pour le moment.',
    achievement_you_have: 'Vous avez dÃƒÂ©bloquÃƒÂ©',
    achievement_progress_prefix: '{name} :',
    achievement_goal_total: 'Obtenez {value} ÃƒÂ©liminations de baddies',
    achievement_goal_kills_day: 'Tuez {value} baddies en une journÃƒÂ©e',
    achievement_goal_points_day: 'Atteignez {value} points de baddy en une journÃƒÂ©e',
    achievement_goal_streak: 'Faites une sÃƒÂ©rie de {value} baddies',
    achievement_goal_group_day: 'Terminez une session {group} en obtenant {value} ÃƒÂ©liminations de baddies en une journÃƒÂ©e',
    achievement_group_duo: 'duo',
    achievement_group_trio: 'trio',
    achievement_group_quad: 'quad'
};
I18N_BENCHMARK_MISSING_PATCH.fil = {
    footer_site_made_by: 'Site na ginawa ni',
    footer_disclaimer: 'Ang site na ito ay hindi kaakibat, pinapanatili, ineendorso o ini-sponsor ng GraalOnline. Lahat ng assets Ã‚Â© 2026 GraalOnline',
    footer_terms: 'Mga Tuntunin at Kondisyon',
    footer_privacy: 'Patakaran sa Privacy',
    footer_cookie: 'Patakaran sa Cookie',
    footer_dmca: 'Patakaran ng DMCA',
    profile_picture: 'Larawan ng profile',
    upload_image: 'Mag-upload ng larawan',
    edit_image: 'I-edit ang larawan',
    remove_image: 'Tanggalin ang larawan',
    username_label: 'Username (1-20 character)',
    guilds_max: 'Guilds (Max 6)',
    add_guild: 'Magdagdag ng Guild',
    guild_name_placeholder: 'Pangalan ng Guild',
    country_flag: 'Bandila ng bansa',
    remove_flag: 'Alisin ang bandila',
    account_details: 'Detalye ng account',
    account_id: 'Account ID',
    email_address: 'Email address',
    new_email_placeholder: 'Bagong email address',
    verify_update: 'I-verify at i-update',
    change_email_address: 'Palitan ang email address',
    change_password: 'Palitan ang password',
    delete_personal_account: 'Tanggalin ang personal account',
    cannot_undo: 'Hindi na ito mababawi.',
    delete_account: 'Tanggalin ang account',
    discard_changes: 'Itapon ang mga pagbabago',
    save_changes: 'I-save ang mga pagbabago',
    your_account_id: 'Iyong Account ID',
    friends_list_tab: 'Listahan ng Kaibigan',
    friend_requests_tab: 'Friend Requests',
    remove_friends_tab: 'Alisin ang Kaibigan',
    enter_account_id_placeholder: 'Ilagay ang Account ID',
    received_friend_requests: 'Natanggap na Friend Requests',
    sent_friend_requests: 'Naipadalang Friend Requests',
    select_friends_remove: 'Pumili ng kaibigang aalisin',
    highlight_title_required_label: 'Pamagat (Required)',
    highlight_desc_optional_label: 'Paglalarawan (Optional)',
    highlight_title_placeholder: 'Maglagay ng pamagat...',
    highlight_desc_placeholder: 'Maglagay ng paglalarawan...',
    highlights_empty: 'Wala pang highlights.',
    achievement_you_have: 'Na-unlock mo na',
    achievement_progress_prefix: '{name}:',
    achievement_goal_total: 'Makakuha ng {value} baddy kills',
    achievement_goal_kills_day: 'Pumatay ng {value} baddies sa isang araw',
    achievement_goal_points_day: 'Umabot ng {value} baddy points sa isang araw',
    achievement_goal_streak: 'Makakuha ng {value} baddy streak',
    achievement_goal_group_day: 'Kumpletuhin ang isang {group} session sa pamamagitan ng pagkuha ng {value} baddy kills sa isang araw',
    achievement_group_duo: 'duo',
    achievement_group_trio: 'trio',
    achievement_group_quad: 'quad'
};
I18N_BENCHMARK_MISSING_PATCH.id = {
    footer_site_made_by: 'Situs dibuat oleh',
    footer_disclaimer: 'Situs ini tidak berafiliasi, dikelola, didukung, atau disponsori oleh GraalOnline. Semua aset Ã‚Â© 2026 GraalOnline',
    footer_terms: 'Syarat & Ketentuan',
    footer_privacy: 'Kebijakan Privasi',
    footer_cookie: 'Kebijakan Cookie',
    footer_dmca: 'Kebijakan DMCA',
    profile_picture: 'Foto profil',
    upload_image: 'Unggah gambar',
    edit_image: 'Edit gambar',
    remove_image: 'Hapus gambar',
    username_label: 'Nama pengguna (1-20 karakter)',
    guilds_max: 'Guild (Maks 6)',
    add_guild: 'Tambah guild',
    guild_name_placeholder: 'Nama guild',
    country_flag: 'Bendera negara',
    remove_flag: 'Hapus bendera',
    account_details: 'Detail akun',
    account_id: 'ID akun',
    email_address: 'Alamat email',
    new_email_placeholder: 'Alamat email baru',
    verify_update: 'Verifikasi & Perbarui',
    change_email_address: 'Ubah alamat email',
    change_password: 'Ubah kata sandi',
    delete_personal_account: 'Hapus akun pribadi',
    cannot_undo: 'Tindakan ini tidak dapat dibatalkan.',
    delete_account: 'Hapus akun',
    discard_changes: 'Batalkan perubahan',
    save_changes: 'Simpan perubahan',
    your_account_id: 'ID akun Anda',
    friends_list_tab: 'Daftar teman',
    friend_requests_tab: 'Permintaan pertemanan',
    remove_friends_tab: 'Hapus teman',
    enter_account_id_placeholder: 'Masukkan ID akun',
    received_friend_requests: 'Permintaan pertemanan masuk',
    sent_friend_requests: 'Permintaan pertemanan terkirim',
    select_friends_remove: 'Pilih teman untuk dihapus',
    highlight_title_required_label: 'Judul (Wajib)',
    highlight_desc_optional_label: 'Deskripsi (Opsional)',
    highlight_title_placeholder: 'Masukkan judul...',
    highlight_desc_placeholder: 'Masukkan deskripsi...',
    highlights_empty: 'Belum ada sorotan.',
    achievement_you_have: 'Anda telah membuka',
    achievement_progress_prefix: '{name}:',
    achievement_goal_total: 'Dapatkan {value} kill baddy',
    achievement_goal_kills_day: 'Bunuh {value} baddy dalam satu hari',
    achievement_goal_points_day: 'Raih {value} poin baddy dalam satu hari',
    achievement_goal_streak: 'Dapatkan streak baddy {value}',
    achievement_goal_group_day: 'Selesaikan sesi {group} dengan mendapatkan {value} kill baddy dalam satu hari',
    achievement_group_duo: 'duo',
    achievement_group_trio: 'trio',
    achievement_group_quad: 'quad'
};
I18N_BENCHMARK_MISSING_PATCH.it = {
    footer_site_made_by: 'Sito creato da',
    footer_disclaimer: 'Questo sito non ÃƒÂ¨ affiliato, gestito, approvato o sponsorizzato da GraalOnline. Tutte le risorse Ã‚Â© 2026 GraalOnline',
    footer_terms: 'Termini e condizioni',
    footer_privacy: 'Informativa sulla privacy',
    footer_cookie: 'Informativa sui cookie',
    footer_dmca: 'Politica DMCA',
    profile_picture: 'Immagine del profilo',
    upload_image: 'Carica immagine',
    edit_image: 'Modifica immagine',
    remove_image: 'Rimuovi immagine',
    username_label: 'Nome utente (1-20 caratteri)',
    guilds_max: 'Gilde (Max 6)',
    add_guild: 'Aggiungi gilda',
    guild_name_placeholder: 'Nome gilda',
    country_flag: 'Bandiera del paese',
    remove_flag: 'Rimuovi bandiera',
    account_details: 'Dettagli account',
    account_id: 'ID account',
    email_address: 'Indirizzo email',
    new_email_placeholder: 'Nuovo indirizzo email',
    verify_update: 'Verifica e aggiorna',
    change_email_address: 'Cambia indirizzo email',
    change_password: 'Cambia password',
    delete_personal_account: 'Elimina account personale',
    cannot_undo: 'Questa azione non puÃƒÂ² essere annullata.',
    delete_account: 'Elimina account',
    discard_changes: 'Annulla modifiche',
    save_changes: 'Salva modifiche',
    your_account_id: 'Il tuo ID account',
    friends_list_tab: 'Lista amici',
    friend_requests_tab: 'Richieste di amicizia',
    remove_friends_tab: 'Rimuovi amici',
    enter_account_id_placeholder: 'Inserisci ID account',
    received_friend_requests: 'Richieste ricevute',
    sent_friend_requests: 'Richieste inviate',
    select_friends_remove: 'Seleziona amici da rimuovere',
    highlight_title_required_label: 'Titolo (obbligatorio)',
    highlight_desc_optional_label: 'Descrizione (opzionale)',
    highlight_title_placeholder: 'Inserisci un titolo...',
    highlight_desc_placeholder: 'Inserisci una descrizione...',
    highlights_empty: 'Nessun highlight ancora.',
    achievement_you_have: 'Hai sbloccato',
    achievement_progress_prefix: '{name}:',
    achievement_goal_total: 'Ottieni {value} uccisioni baddy',
    achievement_goal_kills_day: 'Uccidi {value} baddies in un giorno',
    achievement_goal_points_day: 'Raggiungi {value} punti baddy in un giorno',
    achievement_goal_streak: 'Ottieni una streak baddy di {value}',
    achievement_goal_group_day: 'Completa una sessione {group} ottenendo {value} uccisioni baddy in un giorno',
    achievement_group_duo: 'duo',
    achievement_group_trio: 'trio',
    achievement_group_quad: 'quad'
};
I18N_BENCHMARK_MISSING_PATCH.nl = {
    footer_site_made_by: 'Site gemaakt door',
    footer_disclaimer: 'Deze site is niet gelieerd aan, onderhouden door, goedgekeurd door of gesponsord door GraalOnline. Alle middelen Ã‚Â© 2026 GraalOnline',
    footer_terms: 'Algemene voorwaarden',
    footer_privacy: 'Privacybeleid',
    footer_cookie: 'Cookiebeleid',
    footer_dmca: 'DMCA-beleid',
    profile_picture: 'Profielfoto',
    upload_image: 'Afbeelding uploaden',
    edit_image: 'Afbeelding bewerken',
    remove_image: 'Afbeelding verwijderen',
    username_label: 'Gebruikersnaam (1-20 tekens)',
    guilds_max: 'Guilds (Max 6)',
    add_guild: 'Guild toevoegen',
    guild_name_placeholder: 'Guildnaam',
    country_flag: 'Landvlag',
    remove_flag: 'Vlag verwijderen',
    account_details: 'Accountgegevens',
    account_id: 'Account-ID',
    email_address: 'E-mailadres',
    new_email_placeholder: 'Nieuw e-mailadres',
    verify_update: 'VerifiÃƒÂ«ren en updaten',
    change_email_address: 'E-mailadres wijzigen',
    change_password: 'Wachtwoord wijzigen',
    delete_personal_account: 'Persoonlijk account verwijderen',
    cannot_undo: 'Dit kan niet ongedaan worden gemaakt.',
    delete_account: 'Account verwijderen',
    discard_changes: 'Wijzigingen negeren',
    save_changes: 'Wijzigingen opslaan',
    your_account_id: 'Jouw account-ID',
    friends_list_tab: 'Vriendenlijst',
    friend_requests_tab: 'Vriendschapsverzoeken',
    remove_friends_tab: 'Vrienden verwijderen',
    enter_account_id_placeholder: 'Voer account-ID in',
    received_friend_requests: 'Ontvangen vriendschapsverzoeken',
    sent_friend_requests: 'Verzonden vriendschapsverzoeken',
    select_friends_remove: 'Selecteer vrienden om te verwijderen',
    highlight_title_required_label: 'Titel (verplicht)',
    highlight_desc_optional_label: 'Beschrijving (optioneel)',
    highlight_title_placeholder: 'Voer een titel in...',
    highlight_desc_placeholder: 'Voer een beschrijving in...',
    highlights_empty: 'Nog geen hoogtepunten.',
    achievement_you_have: 'Je hebt ontgrendeld',
    achievement_progress_prefix: '{name}:',
    achievement_goal_total: 'Behaal {value} baddy-kills',
    achievement_goal_kills_day: 'Dood {value} baddies in ÃƒÂ©ÃƒÂ©n dag',
    achievement_goal_points_day: 'Behaal {value} baddy-punten in ÃƒÂ©ÃƒÂ©n dag',
    achievement_goal_streak: 'Behaal een baddy-streak van {value}',
    achievement_goal_group_day: 'Voltooi een {group}-sessie door {value} baddy-kills in ÃƒÂ©ÃƒÂ©n dag te behalen',
    achievement_group_duo: 'duo',
    achievement_group_trio: 'trio',
    achievement_group_quad: 'quad'
};
I18N_BENCHMARK_MISSING_PATCH['pt-BR'] = {
    footer_site_made_by: 'Site feito por',
    footer_disclaimer: 'Este site nÃƒÂ£o ÃƒÂ© afiliado, mantido, endossado ou patrocinado pela GraalOnline. Todos os ativos Ã‚Â© 2026 GraalOnline',
    footer_terms: 'Termos e CondiÃƒÂ§ÃƒÂµes',
    footer_privacy: 'PolÃƒÂ­tica de Privacidade',
    footer_cookie: 'PolÃƒÂ­tica de Cookies',
    footer_dmca: 'PolÃƒÂ­tica DMCA',
    profile_picture: 'Foto de perfil',
    upload_image: 'Enviar imagem',
    edit_image: 'Editar imagem',
    remove_image: 'Remover imagem',
    username_label: 'Nome de usuÃƒÂ¡rio (1-20 caracteres)',
    guilds_max: 'Guildas (MÃƒÂ¡x 6)',
    add_guild: 'Adicionar guilda',
    guild_name_placeholder: 'Nome da guilda',
    country_flag: 'Bandeira do paÃƒÂ­s',
    remove_flag: 'Remover bandeira',
    account_details: 'Detalhes da conta',
    account_id: 'ID da conta',
    email_address: 'EndereÃƒÂ§o de e-mail',
    new_email_placeholder: 'Novo endereÃƒÂ§o de e-mail',
    verify_update: 'Verificar e atualizar',
    change_email_address: 'Alterar endereÃƒÂ§o de e-mail',
    change_password: 'Alterar senha',
    delete_personal_account: 'Excluir conta pessoal',
    cannot_undo: 'Isto nÃƒÂ£o pode ser desfeito.',
    delete_account: 'Excluir conta',
    discard_changes: 'Descartar alteraÃƒÂ§ÃƒÂµes',
    save_changes: 'Salvar alteraÃƒÂ§ÃƒÂµes',
    your_account_id: 'Seu ID da conta',
    friends_list_tab: 'Lista de amigos',
    friend_requests_tab: 'SolicitaÃƒÂ§ÃƒÂµes de amizade',
    remove_friends_tab: 'Remover amigos',
    enter_account_id_placeholder: 'Digite o ID da conta',
    received_friend_requests: 'SolicitaÃƒÂ§ÃƒÂµes recebidas',
    sent_friend_requests: 'SolicitaÃƒÂ§ÃƒÂµes enviadas',
    select_friends_remove: 'Selecione amigos para remover',
    highlight_title_required_label: 'Título (Obrigatório)',
    highlight_desc_optional_label: 'Descrição (Opcional)',
    highlight_title_placeholder: 'Digite um tÃƒÂ­tulo...',
    highlight_desc_placeholder: 'Digite uma descriÃƒÂ§ÃƒÂ£o...',
    highlights_empty: 'Ainda nÃƒÂ£o hÃƒÂ¡ destaques.',
    achievement_you_have: 'Você desbloqueou',
    achievement_progress_prefix: '{name}:',
    achievement_goal_total: 'Obtenha {value} abates',
    achievement_goal_kills_day: 'Mate {value} inimigos em um dia',
    achievement_goal_points_day: 'Alcance {value} pontos em um dia',
    achievement_goal_streak: 'Sequência de {value} inimigos',
    achievement_goal_group_day: 'Complete sessão {group} com {value} abates em um dia',
    achievement_group_duo: 'de dupla',
    achievement_group_trio: 'de trio',
    achievement_group_quad: 'de quarteto'
};
I18N_BENCHMARK_MISSING_PATCH['pt-PT'] = {
    footer_site_made_by: 'Site feito por',
    footer_disclaimer: 'Este site nÃƒÂ£o ÃƒÂ© afiliado, mantido, apoiado ou patrocinado pela GraalOnline. Todos os recursos Ã‚Â© 2026 GraalOnline',
    footer_terms: 'Termos e CondiÃƒÂ§ÃƒÂµes',
    footer_privacy: 'PolÃƒÂ­tica de Privacidade',
    footer_cookie: 'PolÃƒÂ­tica de Cookies',
    footer_dmca: 'PolÃƒÂ­tica DMCA',
    profile_picture: 'Foto de perfil',
    upload_image: 'Carregar imagem',
    edit_image: 'Editar imagem',
    remove_image: 'Remover imagem',
    username_label: 'Nome de utilizador (1-20 caracteres)',
    guilds_max: 'Guildas (MÃƒÂ¡x 6)',
    add_guild: 'Adicionar guilda',
    guild_name_placeholder: 'Nome da guilda',
    country_flag: 'Bandeira do paÃƒÂ­s',
    remove_flag: 'Remover bandeira',
    account_details: 'Detalhes da conta',
    account_id: 'ID da conta',
    email_address: 'EndereÃƒÂ§o de e-mail',
    new_email_placeholder: 'Novo endereÃƒÂ§o de e-mail',
    verify_update: 'Verificar e atualizar',
    change_email_address: 'Alterar endereÃƒÂ§o de e-mail',
    change_password: 'Alterar palavra-passe',
    delete_personal_account: 'Eliminar conta pessoal',
    cannot_undo: 'Isto nÃƒÂ£o pode ser desfeito.',
    delete_account: 'Eliminar conta',
    discard_changes: 'Descartar alteraÃƒÂ§ÃƒÂµes',
    save_changes: 'Guardar alteraÃƒÂ§ÃƒÂµes',
    your_account_id: 'O seu ID da conta',
    friends_list_tab: 'Lista de amigos',
    friend_requests_tab: 'Pedidos de amizade',
    remove_friends_tab: 'Remover amigos',
    enter_account_id_placeholder: 'Introduza o ID da conta',
    received_friend_requests: 'Pedidos de amizade recebidos',
    sent_friend_requests: 'Pedidos de amizade enviados',
    select_friends_remove: 'Selecione amigos para remover',
    highlight_title_required_label: 'TÃƒÂ­tulo (ObrigatÃƒÂ³rio)',
    highlight_desc_optional_label: 'DescriÃƒÂ§ÃƒÂ£o (Opcional)',
    highlight_title_placeholder: 'Introduza um tÃƒÂ­tulo...',
    highlight_desc_placeholder: 'Introduza uma descriÃƒÂ§ÃƒÂ£o...',
    highlights_empty: 'Ainda nÃƒÂ£o hÃƒÂ¡ destaques.',
    achievement_you_have: 'Desbloqueou',
    achievement_progress_prefix: '{name}:',
    achievement_goal_total: 'Obtenha {value} abates de baddy',
    achievement_goal_kills_day: 'Mate {value} baddies num dia',
    achievement_goal_points_day: 'Atinja {value} pontos de baddy num dia',
    achievement_goal_streak: 'Obtenha uma sequÃƒÂªncia de baddy de {value}',
    achievement_goal_group_day: 'Complete uma sessÃƒÂ£o {group} obtendo {value} abates de baddy num dia',
    achievement_group_duo: 'duo',
    achievement_group_trio: 'trio',
    achievement_group_quad: 'quad'
};
I18N_BENCHMARK_MISSING_PATCH.bn = {
    footer_site_made_by: 'Ã Â¦Â¸Ã Â¦Â¾Ã Â¦â€¡Ã Â¦Å¸Ã Â¦Å¸Ã Â¦Â¿ Ã Â¦Â¤Ã Â§Ë†Ã Â¦Â°Ã Â¦Â¿ Ã Â¦â€¢Ã Â¦Â°Ã Â§â€¡Ã Â¦â€ºÃ Â§â€¡Ã Â¦Â¨',
    footer_disclaimer: 'Ã Â¦ÂÃ Â¦â€¡ Ã Â¦Â¸Ã Â¦Â¾Ã Â¦â€¡Ã Â¦Å¸Ã Â¦Å¸Ã Â¦Â¿ GraalOnline-Ã Â¦ÂÃ Â¦Â° Ã Â¦Â¸Ã Â¦Â¾Ã Â¦Â¥Ã Â§â€¡ Ã Â¦Â¸Ã Â¦â€šÃ Â¦Â¯Ã Â§ÂÃ Â¦â€¢Ã Â§ÂÃ Â¦Â¤, Ã Â¦ÂªÃ Â¦Â°Ã Â¦Â¿Ã Â¦Å¡Ã Â¦Â¾Ã Â¦Â²Ã Â¦Â¿Ã Â¦Â¤, Ã Â¦â€¦Ã Â¦Â¨Ã Â§ÂÃ Â¦Â®Ã Â§â€¹Ã Â¦Â¦Ã Â¦Â¿Ã Â¦Â¤ Ã Â¦Â¬Ã Â¦Â¾ Ã Â¦ÂªÃ Â§Æ’Ã Â¦Â·Ã Â§ÂÃ Â¦Â Ã Â¦ÂªÃ Â§â€¹Ã Â¦Â·Ã Â¦â€¢Ã Â¦Â¤Ã Â¦Â¾Ã Â¦ÂªÃ Â§ÂÃ Â¦Â°Ã Â¦Â¾Ã Â¦ÂªÃ Â§ÂÃ Â¦Â¤ Ã Â¦Â¨Ã Â¦Â¯Ã Â¦Â¼Ã Â¥Â¤ Ã Â¦Â¸Ã Â¦â€¢Ã Â¦Â² Ã Â¦Â¸Ã Â¦Â®Ã Â§ÂÃ Â¦ÂªÃ Â¦Â¦ Ã‚Â© 2026 GraalOnline',
    footer_terms: 'Ã Â¦Â¶Ã Â¦Â°Ã Â§ÂÃ Â¦Â¤Ã Â¦Â¾Ã Â¦Â¬Ã Â¦Â²Ã Â¦Â¿',
    footer_privacy: 'Ã Â¦â€”Ã Â§â€¹Ã Â¦ÂªÃ Â¦Â¨Ã Â§â‚¬Ã Â¦Â¯Ã Â¦Â¼Ã Â¦Â¤Ã Â¦Â¾ Ã Â¦Â¨Ã Â§â‚¬Ã Â¦Â¤Ã Â¦Â¿',
    footer_cookie: 'Ã Â¦â€¢Ã Â§ÂÃ Â¦â€¢Ã Â¦Â¿ Ã Â¦Â¨Ã Â§â‚¬Ã Â¦Â¤Ã Â¦Â¿',
    footer_dmca: 'DMCA Ã Â¦Â¨Ã Â§â‚¬Ã Â¦Â¤Ã Â¦Â¿',
    profile_picture: 'Ã Â¦ÂªÃ Â§ÂÃ Â¦Â°Ã Â§â€¹Ã Â¦Â«Ã Â¦Â¾Ã Â¦â€¡Ã Â¦Â² Ã Â¦â€ºÃ Â¦Â¬Ã Â¦Â¿',
    upload_image: 'Ã Â¦â€ºÃ Â¦Â¬Ã Â¦Â¿ Ã Â¦â€ Ã Â¦ÂªÃ Â¦Â²Ã Â§â€¹Ã Â¦Â¡ Ã Â¦â€¢Ã Â¦Â°Ã Â§ÂÃ Â¦Â¨',
    edit_image: 'Ã Â¦â€ºÃ Â¦Â¬Ã Â¦Â¿ Ã Â¦Â¸Ã Â¦Â®Ã Â§ÂÃ Â¦ÂªÃ Â¦Â¾Ã Â¦Â¦Ã Â¦Â¨Ã Â¦Â¾ Ã Â¦â€¢Ã Â¦Â°Ã Â§ÂÃ Â¦Â¨',
    remove_image: 'Ã Â¦â€ºÃ Â¦Â¬Ã Â¦Â¿ Ã Â¦Â¸Ã Â¦Â°Ã Â¦Â¾Ã Â¦Â¨',
    username_label: 'Ã Â¦Â¬Ã Â§ÂÃ Â¦Â¯Ã Â¦Â¬Ã Â¦Â¹Ã Â¦Â¾Ã Â¦Â°Ã Â¦â€¢Ã Â¦Â¾Ã Â¦Â°Ã Â§â‚¬Ã Â¦Â° Ã Â¦Â¨Ã Â¦Â¾Ã Â¦Â® (Ã Â§Â§-Ã Â§Â¨Ã Â§Â¦ Ã Â¦â€¦Ã Â¦â€¢Ã Â§ÂÃ Â¦Â·Ã Â¦Â°)',
    guilds_max: 'Ã Â¦â€”Ã Â¦Â¿Ã Â¦Â²Ã Â§ÂÃ Â¦Â¡ (Ã Â¦Â¸Ã Â¦Â°Ã Â§ÂÃ Â¦Â¬Ã Â§â€¹Ã Â¦Å¡Ã Â§ÂÃ Â¦Å¡ Ã Â§Â¬)',
    add_guild: 'Ã Â¦â€”Ã Â¦Â¿Ã Â¦Â²Ã Â§ÂÃ Â¦Â¡ Ã Â¦Â¯Ã Â§â€¹Ã Â¦â€” Ã Â¦â€¢Ã Â¦Â°Ã Â§ÂÃ Â¦Â¨',
    guild_name_placeholder: 'Ã Â¦â€”Ã Â¦Â¿Ã Â¦Â²Ã Â§ÂÃ Â¦Â¡Ã Â§â€¡Ã Â¦Â° Ã Â¦Â¨Ã Â¦Â¾Ã Â¦Â®',
    country_flag: 'Ã Â¦Â¦Ã Â§â€¡Ã Â¦Â¶Ã Â§â€¡Ã Â¦Â° Ã Â¦ÂªÃ Â¦Â¤Ã Â¦Â¾Ã Â¦â€¢Ã Â¦Â¾',
    remove_flag: 'Ã Â¦ÂªÃ Â¦Â¤Ã Â¦Â¾Ã Â¦â€¢Ã Â¦Â¾ Ã Â¦Â¸Ã Â¦Â°Ã Â¦Â¾Ã Â¦Â¨',
    account_details: 'Ã Â¦â€¦Ã Â§ÂÃ Â¦Â¯Ã Â¦Â¾Ã Â¦â€¢Ã Â¦Â¾Ã Â¦â€°Ã Â¦Â¨Ã Â§ÂÃ Â¦Å¸Ã Â§â€¡Ã Â¦Â° Ã Â¦Â¤Ã Â¦Â¥Ã Â§ÂÃ Â¦Â¯',
    account_id: 'Ã Â¦â€¦Ã Â§ÂÃ Â¦Â¯Ã Â¦Â¾Ã Â¦â€¢Ã Â¦Â¾Ã Â¦â€°Ã Â¦Â¨Ã Â§ÂÃ Â¦Å¸ Ã Â¦â€ Ã Â¦â€¡Ã Â¦Â¡Ã Â¦Â¿',
    email_address: 'Ã Â¦â€¡Ã Â¦Â®Ã Â§â€¡Ã Â¦â€¡Ã Â¦Â² Ã Â¦Â Ã Â¦Â¿Ã Â¦â€¢Ã Â¦Â¾Ã Â¦Â¨Ã Â¦Â¾',
    new_email_placeholder: 'Ã Â¦Â¨Ã Â¦Â¤Ã Â§ÂÃ Â¦Â¨ Ã Â¦â€¡Ã Â¦Â®Ã Â§â€¡Ã Â¦â€¡Ã Â¦Â² Ã Â¦Â Ã Â¦Â¿Ã Â¦â€¢Ã Â¦Â¾Ã Â¦Â¨Ã Â¦Â¾',
    verify_update: 'Ã Â¦Â¯Ã Â¦Â¾Ã Â¦Å¡Ã Â¦Â¾Ã Â¦â€¡ Ã Â¦â€œ Ã Â¦â€ Ã Â¦ÂªÃ Â¦Â¡Ã Â§â€¡Ã Â¦Å¸',
    change_email_address: 'Ã Â¦â€¡Ã Â¦Â®Ã Â§â€¡Ã Â¦â€¡Ã Â¦Â² Ã Â¦Â Ã Â¦Â¿Ã Â¦â€¢Ã Â¦Â¾Ã Â¦Â¨Ã Â¦Â¾ Ã Â¦ÂªÃ Â¦Â°Ã Â¦Â¿Ã Â¦Â¬Ã Â¦Â°Ã Â§ÂÃ Â¦Â¤Ã Â¦Â¨ Ã Â¦â€¢Ã Â¦Â°Ã Â§ÂÃ Â¦Â¨',
    change_password: 'Ã Â¦ÂªÃ Â¦Â¾Ã Â¦Â¸Ã Â¦â€œÃ Â¦Â¯Ã Â¦Â¼Ã Â¦Â¾Ã Â¦Â°Ã Â§ÂÃ Â¦Â¡ Ã Â¦ÂªÃ Â¦Â°Ã Â¦Â¿Ã Â¦Â¬Ã Â¦Â°Ã Â§ÂÃ Â¦Â¤Ã Â¦Â¨ Ã Â¦â€¢Ã Â¦Â°Ã Â§ÂÃ Â¦Â¨',
    delete_personal_account: 'Ã Â¦Â¬Ã Â§ÂÃ Â¦Â¯Ã Â¦â€¢Ã Â§ÂÃ Â¦Â¤Ã Â¦Â¿Ã Â¦â€”Ã Â¦Â¤ Ã Â¦â€¦Ã Â§ÂÃ Â¦Â¯Ã Â¦Â¾Ã Â¦â€¢Ã Â¦Â¾Ã Â¦â€°Ã Â¦Â¨Ã Â§ÂÃ Â¦Å¸ Ã Â¦Â®Ã Â§ÂÃ Â¦â€ºÃ Â§ÂÃ Â¦Â¨',
    cannot_undo: 'Ã Â¦ÂÃ Â¦Å¸Ã Â¦Â¿ Ã Â¦â€ Ã Â¦Â° Ã Â¦Â«Ã Â¦Â¿Ã Â¦Â°Ã Â¦Â¿Ã Â¦Â¯Ã Â¦Â¼Ã Â§â€¡ Ã Â¦â€ Ã Â¦Â¨Ã Â¦Â¾ Ã Â¦Â¯Ã Â¦Â¾Ã Â¦Â¬Ã Â§â€¡ Ã Â¦Â¨Ã Â¦Â¾Ã Â¥Â¤',
    delete_account: 'Ã Â¦â€¦Ã Â§ÂÃ Â¦Â¯Ã Â¦Â¾Ã Â¦â€¢Ã Â¦Â¾Ã Â¦â€°Ã Â¦Â¨Ã Â§ÂÃ Â¦Å¸ Ã Â¦Â®Ã Â§ÂÃ Â¦â€ºÃ Â§ÂÃ Â¦Â¨',
    discard_changes: 'Ã Â¦ÂªÃ Â¦Â°Ã Â¦Â¿Ã Â¦Â¬Ã Â¦Â°Ã Â§ÂÃ Â¦Â¤Ã Â¦Â¨ Ã Â¦Â¬Ã Â¦Â¾Ã Â¦Â¤Ã Â¦Â¿Ã Â¦Â² Ã Â¦â€¢Ã Â¦Â°Ã Â§ÂÃ Â¦Â¨',
    save_changes: 'Ã Â¦ÂªÃ Â¦Â°Ã Â¦Â¿Ã Â¦Â¬Ã Â¦Â°Ã Â§ÂÃ Â¦Â¤Ã Â¦Â¨ Ã Â¦Â¸Ã Â¦â€šÃ Â¦Â°Ã Â¦â€¢Ã Â§ÂÃ Â¦Â·Ã Â¦Â£ Ã Â¦â€¢Ã Â¦Â°Ã Â§ÂÃ Â¦Â¨',
    your_account_id: 'Ã Â¦â€ Ã Â¦ÂªÃ Â¦Â¨Ã Â¦Â¾Ã Â¦Â° Ã Â¦â€¦Ã Â§ÂÃ Â¦Â¯Ã Â¦Â¾Ã Â¦â€¢Ã Â¦Â¾Ã Â¦â€°Ã Â¦Â¨Ã Â§ÂÃ Â¦Å¸ Ã Â¦â€ Ã Â¦â€¡Ã Â¦Â¡Ã Â¦Â¿',
    friends_list_tab: 'Ã Â¦Â¬Ã Â¦Â¨Ã Â§ÂÃ Â¦Â§Ã Â§Â Ã Â¦Â¤Ã Â¦Â¾Ã Â¦Â²Ã Â¦Â¿Ã Â¦â€¢Ã Â¦Â¾',
    friend_requests_tab: 'Ã Â¦Â«Ã Â§ÂÃ Â¦Â°Ã Â§â€¡Ã Â¦Â¨Ã Â§ÂÃ Â¦Â¡ Ã Â¦Â°Ã Â¦Â¿Ã Â¦â€¢Ã Â§â€¹Ã Â¦Â¯Ã Â¦Â¼Ã Â§â€¡Ã Â¦Â¸Ã Â§ÂÃ Â¦Å¸',
    remove_friends_tab: 'Ã Â¦Â¬Ã Â¦Â¨Ã Â§ÂÃ Â¦Â§Ã Â§Â Ã Â¦Â¸Ã Â¦Â°Ã Â¦Â¾Ã Â¦Â¨',
    enter_account_id_placeholder: 'Ã Â¦â€¦Ã Â§ÂÃ Â¦Â¯Ã Â¦Â¾Ã Â¦â€¢Ã Â¦Â¾Ã Â¦â€°Ã Â¦Â¨Ã Â§ÂÃ Â¦Å¸ Ã Â¦â€ Ã Â¦â€¡Ã Â¦Â¡Ã Â¦Â¿ Ã Â¦Â²Ã Â¦Â¿Ã Â¦â€“Ã Â§ÂÃ Â¦Â¨',
    received_friend_requests: 'Ã Â¦ÂªÃ Â§ÂÃ Â¦Â°Ã Â¦Â¾Ã Â¦ÂªÃ Â§ÂÃ Â¦Â¤ Ã Â¦Â«Ã Â§ÂÃ Â¦Â°Ã Â§â€¡Ã Â¦Â¨Ã Â§ÂÃ Â¦Â¡ Ã Â¦Â°Ã Â¦Â¿Ã Â¦â€¢Ã Â§â€¹Ã Â¦Â¯Ã Â¦Â¼Ã Â§â€¡Ã Â¦Â¸Ã Â§ÂÃ Â¦Å¸',
    sent_friend_requests: 'Ã Â¦ÂªÃ Â¦Â¾Ã Â¦Â Ã Â¦Â¾Ã Â¦Â¨Ã Â§â€¹ Ã Â¦Â«Ã Â§ÂÃ Â¦Â°Ã Â§â€¡Ã Â¦Â¨Ã Â§ÂÃ Â¦Â¡ Ã Â¦Â°Ã Â¦Â¿Ã Â¦â€¢Ã Â§â€¹Ã Â¦Â¯Ã Â¦Â¼Ã Â§â€¡Ã Â¦Â¸Ã Â§ÂÃ Â¦Å¸',
    select_friends_remove: 'Ã Â¦Â¸Ã Â¦Â°Ã Â¦Â¾Ã Â¦Â¨Ã Â§â€¹Ã Â¦Â° Ã Â¦Å“Ã Â¦Â¨Ã Â§ÂÃ Â¦Â¯ Ã Â¦Â¬Ã Â¦Â¨Ã Â§ÂÃ Â¦Â§Ã Â§Â Ã Â¦Â¬Ã Â§â€¡Ã Â¦â€ºÃ Â§â€¡ Ã Â¦Â¨Ã Â¦Â¿Ã Â¦Â¨',
    highlight_title_required_label: 'Ã Â¦Â¶Ã Â¦Â¿Ã Â¦Â°Ã Â§â€¹Ã Â¦Â¨Ã Â¦Â¾Ã Â¦Â® (Ã Â¦â€ Ã Â¦Â¬Ã Â¦Â¶Ã Â§ÂÃ Â¦Â¯Ã Â¦â€¢)',
    highlight_desc_optional_label: 'Ã Â¦Â¬Ã Â¦Â¿Ã Â¦Â¬Ã Â¦Â°Ã Â¦Â£ (Ã Â¦ÂÃ Â¦Å¡Ã Â§ÂÃ Â¦â€ºÃ Â¦Â¿Ã Â¦â€¢)',
    highlight_title_placeholder: 'Ã Â¦ÂÃ Â¦â€¢Ã Â¦Å¸Ã Â¦Â¿ Ã Â¦Â¶Ã Â¦Â¿Ã Â¦Â°Ã Â§â€¹Ã Â¦Â¨Ã Â¦Â¾Ã Â¦Â® Ã Â¦Â²Ã Â¦Â¿Ã Â¦â€“Ã Â§ÂÃ Â¦Â¨...',
    highlight_desc_placeholder: 'Ã Â¦ÂÃ Â¦â€¢Ã Â¦Å¸Ã Â¦Â¿ Ã Â¦Â¬Ã Â¦Â¿Ã Â¦Â¬Ã Â¦Â°Ã Â¦Â£ Ã Â¦Â²Ã Â¦Â¿Ã Â¦â€“Ã Â§ÂÃ Â¦Â¨...',
    highlights_empty: 'Ã Â¦ÂÃ Â¦â€“Ã Â¦Â¨Ã Â¦â€œ Ã Â¦â€¢Ã Â§â€¹Ã Â¦Â¨Ã Â§â€¹ Ã Â¦Â¹Ã Â¦Â¾Ã Â¦â€¡Ã Â¦Â²Ã Â¦Â¾Ã Â¦â€¡Ã Â¦Å¸ Ã Â¦Â¨Ã Â§â€¡Ã Â¦â€¡Ã Â¥Â¤',
    achievement_you_have: 'Ã Â¦â€ Ã Â¦ÂªÃ Â¦Â¨Ã Â¦Â¿ Ã Â¦â€ Ã Â¦Â¨Ã Â¦Â²Ã Â¦â€¢ Ã Â¦â€¢Ã Â¦Â°Ã Â§â€¡Ã Â¦â€ºÃ Â§â€¡Ã Â¦Â¨',
    achievement_progress_prefix: '{name}:',
    achievement_goal_total: '{value} Ã Â¦Â¬Ã Â¦Â¾Ã Â¦Â¡Ã Â¦Â¿ Ã Â¦â€¢Ã Â¦Â¿Ã Â¦Â² Ã Â¦â€¦Ã Â¦Â°Ã Â§ÂÃ Â¦Å“Ã Â¦Â¨ Ã Â¦â€¢Ã Â¦Â°Ã Â§ÂÃ Â¦Â¨',
    achievement_goal_kills_day: 'Ã Â¦ÂÃ Â¦â€¢ Ã Â¦Â¦Ã Â¦Â¿Ã Â¦Â¨Ã Â§â€¡ {value} Ã Â¦Â¬Ã Â¦Â¾Ã Â¦Â¡Ã Â¦Â¿ Ã Â¦Â®Ã Â¦Â¾Ã Â¦Â°Ã Â§ÂÃ Â¦Â¨',
    achievement_goal_points_day: 'Ã Â¦ÂÃ Â¦â€¢ Ã Â¦Â¦Ã Â¦Â¿Ã Â¦Â¨Ã Â§â€¡ {value} Ã Â¦Â¬Ã Â¦Â¾Ã Â¦Â¡Ã Â¦Â¿ Ã Â¦ÂªÃ Â¦Â¯Ã Â¦Â¼Ã Â§â€¡Ã Â¦Â¨Ã Â§ÂÃ Â¦Å¸ Ã Â¦â€¦Ã Â¦Â°Ã Â§ÂÃ Â¦Å“Ã Â¦Â¨ Ã Â¦â€¢Ã Â¦Â°Ã Â§ÂÃ Â¦Â¨',
    achievement_goal_streak: '{value} Ã Â¦Â¬Ã Â¦Â¾Ã Â¦Â¡Ã Â¦Â¿ Ã Â¦Â¸Ã Â§ÂÃ Â¦Å¸Ã Â§ÂÃ Â¦Â°Ã Â¦Â¿Ã Â¦â€¢ Ã Â¦â€¦Ã Â¦Â°Ã Â§ÂÃ Â¦Å“Ã Â¦Â¨ Ã Â¦â€¢Ã Â¦Â°Ã Â§ÂÃ Â¦Â¨',
    achievement_goal_group_day: 'Ã Â¦ÂÃ Â¦â€¢ Ã Â¦Â¦Ã Â¦Â¿Ã Â¦Â¨Ã Â§â€¡ {value} Ã Â¦Â¬Ã Â¦Â¾Ã Â¦Â¡Ã Â¦Â¿ Ã Â¦â€¢Ã Â¦Â¿Ã Â¦Â² Ã Â¦â€¢Ã Â¦Â°Ã Â§â€¡ Ã Â¦ÂÃ Â¦â€¢Ã Â¦Å¸Ã Â¦Â¿ {group} Ã Â¦Â¸Ã Â§â€¡Ã Â¦Â¶Ã Â¦Â¨ Ã Â¦Â¸Ã Â¦Â®Ã Â§ÂÃ Â¦ÂªÃ Â¦Â¨Ã Â§ÂÃ Â¦Â¨ Ã Â¦â€¢Ã Â¦Â°Ã Â§ÂÃ Â¦Â¨',
    achievement_group_duo: 'Ã Â¦Â¦Ã Â§ÂÃ Â¦Â¬Ã Â§Ë†Ã Â¦Â¤',
    achievement_group_trio: 'Ã Â¦Â¤Ã Â§ÂÃ Â¦Â°Ã Â¦Â¯Ã Â¦Â¼Ã Â§â‚¬',
    achievement_group_quad: 'Ã Â¦Å¡Ã Â¦Â¾Ã Â¦Â°Ã Â¦Å“Ã Â¦Â¨'
};
I18N_BENCHMARK_MISSING_PATCH.da = {
    footer_site_made_by: 'Siden er lavet af',
    footer_disclaimer: 'Denne side er ikke tilknyttet, vedligeholdt, godkendt eller sponsoreret af GraalOnline. Alle aktiver Ã‚Â© 2026 GraalOnline',
    footer_terms: 'VilkÃƒÂ¥r og betingelser',
    footer_privacy: 'Privatlivspolitik',
    footer_cookie: 'Cookiepolitik',
    footer_dmca: 'DMCA-politik',
    profile_picture: 'Profilbillede',
    upload_image: 'Upload billede',
    edit_image: 'Rediger billede',
    remove_image: 'Fjern billede',
    username_label: 'Brugernavn (1-20 tegn)',
    guilds_max: 'Guilds (maks 6)',
    add_guild: 'TilfÃƒÂ¸j guild',
    guild_name_placeholder: 'Guild-navn',
    country_flag: 'Landeflag',
    remove_flag: 'Fjern flag',
    account_details: 'Kontodetaljer',
    account_id: 'Konto-ID',
    email_address: 'E-mailadresse',
    new_email_placeholder: 'Ny e-mailadresse',
    verify_update: 'BekrÃƒÂ¦ft og opdater',
    change_email_address: 'Skift e-mailadresse',
    change_password: 'Skift adgangskode',
    delete_personal_account: 'Slet personlig konto',
    cannot_undo: 'Dette kan ikke fortrydes.',
    delete_account: 'Slet konto',
    discard_changes: 'KassÃƒÂ©r ÃƒÂ¦ndringer',
    save_changes: 'Gem ÃƒÂ¦ndringer',
    your_account_id: 'Dit konto-ID',
    friends_list_tab: 'Venneliste',
    friend_requests_tab: 'Venneanmodninger',
    remove_friends_tab: 'Fjern venner',
    enter_account_id_placeholder: 'Indtast konto-ID',
    received_friend_requests: 'Modtagne venneanmodninger',
    sent_friend_requests: 'Sendte venneanmodninger',
    select_friends_remove: 'VÃƒÂ¦lg venner, der skal fjernes',
    highlight_title_required_label: 'Titel (pÃƒÂ¥krÃƒÂ¦vet)',
    highlight_desc_optional_label: 'Beskrivelse (valgfri)',
    highlight_title_placeholder: 'Indtast en titel...',
    highlight_desc_placeholder: 'Indtast en beskrivelse...',
    highlights_empty: 'Ingen highlights endnu.',
    achievement_you_have: 'Du har lÃƒÂ¥st op',
    achievement_progress_prefix: '{name}:',
    achievement_goal_total: 'OpnÃƒÂ¥ {value} baddy-drab',
    achievement_goal_kills_day: 'DrÃƒÂ¦b {value} baddies pÃƒÂ¥ ÃƒÂ©n dag',
    achievement_goal_points_day: 'NÃƒÂ¥ {value} baddy-point pÃƒÂ¥ ÃƒÂ©n dag',
    achievement_goal_streak: 'FÃƒÂ¥ en baddy-streak pÃƒÂ¥ {value}',
    achievement_goal_group_day: 'FuldfÃƒÂ¸r en {group}-session ved at fÃƒÂ¥ {value} baddy-drab pÃƒÂ¥ ÃƒÂ©n dag',
    achievement_group_duo: 'duo',
    achievement_group_trio: 'trio',
    achievement_group_quad: 'quad'
};
I18N_BENCHMARK_MISSING_PATCH.hu = {
    footer_site_made_by: 'Az oldalt kÃƒÂ©szÃƒÂ­tette',
    footer_disclaimer: 'Ez az oldal nem ÃƒÂ¡ll kapcsolatban a GraalOnline-nal, ÃƒÂ©s nem a GraalOnline kezeli, tÃƒÂ¡mogatja vagy szponzorÃƒÂ¡lja. Minden eszkÃƒÂ¶z Ã‚Â© 2026 GraalOnline',
    footer_terms: 'FelhasznÃƒÂ¡lÃƒÂ¡si feltÃƒÂ©telek',
    footer_privacy: 'AdatvÃƒÂ©delmi irÃƒÂ¡nyelv',
    footer_cookie: 'Cookie szabÃƒÂ¡lyzat',
    footer_dmca: 'DMCA szabÃƒÂ¡lyzat',
    profile_picture: 'ProfilkÃƒÂ©p',
    upload_image: 'KÃƒÂ©p feltÃƒÂ¶ltÃƒÂ©se',
    edit_image: 'KÃƒÂ©p szerkesztÃƒÂ©se',
    remove_image: 'KÃƒÂ©p eltÃƒÂ¡volÃƒÂ­tÃƒÂ¡sa',
    username_label: 'FelhasznÃƒÂ¡lÃƒÂ³nÃƒÂ©v (1-20 karakter)',
    guilds_max: 'Guildek (Max 6)',
    add_guild: 'Guild hozzÃƒÂ¡adÃƒÂ¡sa',
    guild_name_placeholder: 'Guild neve',
    country_flag: 'OrszÃƒÂ¡g zÃƒÂ¡szlÃƒÂ³',
    remove_flag: 'ZÃƒÂ¡szlÃƒÂ³ eltÃƒÂ¡volÃƒÂ­tÃƒÂ¡sa',
    account_details: 'FiÃƒÂ³kadatok',
    account_id: 'FiÃƒÂ³kazonosÃƒÂ­tÃƒÂ³',
    email_address: 'E-mail cÃƒÂ­m',
    new_email_placeholder: 'ÃƒÅ¡j e-mail cÃƒÂ­m',
    verify_update: 'EllenÃ…â€˜rzÃƒÂ©s ÃƒÂ©s frissÃƒÂ­tÃƒÂ©s',
    change_email_address: 'E-mail cÃƒÂ­m mÃƒÂ³dosÃƒÂ­tÃƒÂ¡sa',
    change_password: 'JelszÃƒÂ³ mÃƒÂ³dosÃƒÂ­tÃƒÂ¡sa',
    delete_personal_account: 'SzemÃƒÂ©lyes fiÃƒÂ³k tÃƒÂ¶rlÃƒÂ©se',
    cannot_undo: 'Ez nem vonhatÃƒÂ³ vissza.',
    delete_account: 'FiÃƒÂ³k tÃƒÂ¶rlÃƒÂ©se',
    discard_changes: 'VÃƒÂ¡ltoztatÃƒÂ¡sok elvetÃƒÂ©se',
    save_changes: 'VÃƒÂ¡ltoztatÃƒÂ¡sok mentÃƒÂ©se',
    your_account_id: 'A fiÃƒÂ³kazonosÃƒÂ­tÃƒÂ³d',
    friends_list_tab: 'BarÃƒÂ¡tlista',
    friend_requests_tab: 'BarÃƒÂ¡tkÃƒÂ©relmek',
    remove_friends_tab: 'BarÃƒÂ¡tok eltÃƒÂ¡volÃƒÂ­tÃƒÂ¡sa',
    enter_account_id_placeholder: 'FiÃƒÂ³kazonosÃƒÂ­tÃƒÂ³ megadÃƒÂ¡sa',
    received_friend_requests: 'Kapott barÃƒÂ¡tkÃƒÂ©relmek',
    sent_friend_requests: 'ElkÃƒÂ¼ldÃƒÂ¶tt barÃƒÂ¡tkÃƒÂ©relmek',
    select_friends_remove: 'VÃƒÂ¡lassz barÃƒÂ¡tokat az eltÃƒÂ¡volÃƒÂ­tÃƒÂ¡shoz',
    highlight_title_required_label: 'CÃƒÂ­m (kÃƒÂ¶telezÃ…â€˜)',
    highlight_desc_optional_label: 'LeÃƒÂ­rÃƒÂ¡s (opcionÃƒÂ¡lis)',
    highlight_title_placeholder: 'Adj meg egy cÃƒÂ­met...',
    highlight_desc_placeholder: 'Adj meg egy leÃƒÂ­rÃƒÂ¡st...',
    highlights_empty: 'MÃƒÂ©g nincsenek kiemelÃƒÂ©sek.',
    achievement_you_have: 'Feloldva',
    achievement_progress_prefix: '{name}:',
    achievement_goal_total: 'Szerezz {value} baddy ÃƒÂ¶lÃƒÂ©st',
    achievement_goal_kills_day: 'Ãƒâ€“lj meg {value} baddyt egy nap alatt',
    achievement_goal_points_day: 'Ãƒâ€°rj el {value} baddy pontot egy nap alatt',
    achievement_goal_streak: 'Szerezz {value} baddy szÃƒÂ©riÃƒÂ¡t',
    achievement_goal_group_day: 'TeljesÃƒÂ­ts egy {group} menetet ÃƒÂºgy, hogy egy nap alatt {value} baddy ÃƒÂ¶lÃƒÂ©st szerzel',
    achievement_group_duo: 'duÃƒÂ³',
    achievement_group_trio: 'triÃƒÂ³',
    achievement_group_quad: 'nÃƒÂ©gyes'
};
I18N_BENCHMARK_MISSING_PATCH.ms = {
    footer_site_made_by: 'Laman dibuat oleh',
    footer_disclaimer: 'Laman ini tidak berafiliasi, diselenggara, disokong atau ditaja oleh GraalOnline. Semua aset Ã‚Â© 2026 GraalOnline',
    footer_terms: 'Terma & Syarat',
    footer_privacy: 'Dasar Privasi',
    footer_cookie: 'Dasar Kuki',
    footer_dmca: 'Dasar DMCA',
    profile_picture: 'Gambar profil',
    upload_image: 'Muat naik imej',
    edit_image: 'Edit imej',
    remove_image: 'Buang imej',
    username_label: 'Nama pengguna (1-20 aksara)',
    guilds_max: 'Guild (Maks 6)',
    add_guild: 'Tambah guild',
    guild_name_placeholder: 'Nama guild',
    country_flag: 'Bendera negara',
    remove_flag: 'Buang bendera',
    account_details: 'Butiran akaun',
    account_id: 'ID akaun',
    email_address: 'Alamat e-mel',
    new_email_placeholder: 'Alamat e-mel baharu',
    verify_update: 'Sahkan & kemas kini',
    change_email_address: 'Tukar alamat e-mel',
    change_password: 'Tukar kata laluan',
    delete_personal_account: 'Padam akaun peribadi',
    cannot_undo: 'Ini tidak boleh dibatalkan.',
    delete_account: 'Padam akaun',
    discard_changes: 'Buang perubahan',
    save_changes: 'Simpan perubahan',
    your_account_id: 'ID akaun anda',
    friends_list_tab: 'Senarai rakan',
    friend_requests_tab: 'Permintaan rakan',
    remove_friends_tab: 'Buang rakan',
    enter_account_id_placeholder: 'Masukkan ID akaun',
    received_friend_requests: 'Permintaan rakan diterima',
    sent_friend_requests: 'Permintaan rakan dihantar',
    select_friends_remove: 'Pilih rakan untuk dibuang',
    highlight_title_required_label: 'Tajuk (Wajib)',
    highlight_desc_optional_label: 'Penerangan (Pilihan)',
    highlight_title_placeholder: 'Masukkan tajuk...',
    highlight_desc_placeholder: 'Masukkan penerangan...',
    highlights_empty: 'Belum ada sorotan.',
    achievement_you_have: 'Anda telah membuka',
    achievement_progress_prefix: '{name}:',
    achievement_goal_total: 'Dapatkan {value} baddy kills',
    achievement_goal_kills_day: 'Bunuh {value} baddies dalam satu hari',
    achievement_goal_points_day: 'Capai {value} mata baddy dalam satu hari',
    achievement_goal_streak: 'Dapatkan streak baddy sebanyak {value}',
    achievement_goal_group_day: 'Lengkapkan sesi {group} dengan mendapatkan {value} baddy kills dalam satu hari',
    achievement_group_duo: 'duo',
    achievement_group_trio: 'trio',
    achievement_group_quad: 'quad'
};
I18N_BENCHMARK_MISSING_PATCH.no = {
    footer_site_made_by: 'Nettsted laget av',
    footer_disclaimer: 'Dette nettstedet er ikke tilknyttet, vedlikeholdt, godkjent eller sponset av GraalOnline. Alle ressurser Ã‚Â© 2026 GraalOnline',
    footer_terms: 'VilkÃƒÂ¥r og betingelser',
    footer_privacy: 'PersonvernerklÃƒÂ¦ring',
    footer_cookie: 'Informasjonskapselpolicy',
    footer_dmca: 'DMCA-policy',
    profile_picture: 'Profilbilde',
    upload_image: 'Last opp bilde',
    edit_image: 'Rediger bilde',
    remove_image: 'Fjern bilde',
    username_label: 'Brukernavn (1-20 tegn)',
    guilds_max: 'Guilds (Maks 6)',
    add_guild: 'Legg til guild',
    guild_name_placeholder: 'Guild-navn',
    country_flag: 'Landsflagg',
    remove_flag: 'Fjern flagg',
    account_details: 'Kontodetaljer',
    account_id: 'Konto-ID',
    email_address: 'E-postadresse',
    new_email_placeholder: 'Ny e-postadresse',
    verify_update: 'Bekreft og oppdater',
    change_email_address: 'Endre e-postadresse',
    change_password: 'Endre passord',
    delete_personal_account: 'Slett personlig konto',
    cannot_undo: 'Dette kan ikke angres.',
    delete_account: 'Slett konto',
    discard_changes: 'Forkast endringer',
    save_changes: 'Lagre endringer',
    your_account_id: 'Din konto-ID',
    friends_list_tab: 'Venneliste',
    friend_requests_tab: 'VenneforespÃƒÂ¸rsler',
    remove_friends_tab: 'Fjern venner',
    enter_account_id_placeholder: 'Skriv inn konto-ID',
    received_friend_requests: 'Mottatte venneforespÃƒÂ¸rsler',
    sent_friend_requests: 'Sendte venneforespÃƒÂ¸rsler',
    select_friends_remove: 'Velg venner som skal fjernes',
    highlight_title_required_label: 'Tittel (pÃƒÂ¥krevd)',
    highlight_desc_optional_label: 'Beskrivelse (valgfri)',
    highlight_title_placeholder: 'Skriv inn en tittel...',
    highlight_desc_placeholder: 'Skriv inn en beskrivelse...',
    highlights_empty: 'Ingen hÃƒÂ¸ydepunkter ennÃƒÂ¥.',
    achievement_you_have: 'Du har lÃƒÂ¥st opp',
    achievement_progress_prefix: '{name}:',
    achievement_goal_total: 'OppnÃƒÂ¥ {value} baddy-kills',
    achievement_goal_kills_day: 'Drep {value} baddies pÃƒÂ¥ ÃƒÂ©n dag',
    achievement_goal_points_day: 'NÃƒÂ¥ {value} baddy-poeng pÃƒÂ¥ ÃƒÂ©n dag',
    achievement_goal_streak: 'FÃƒÂ¥ en baddy-streak pÃƒÂ¥ {value}',
    achievement_goal_group_day: 'FullfÃƒÂ¸r en {group}-ÃƒÂ¸kt ved ÃƒÂ¥ fÃƒÂ¥ {value} baddy-kills pÃƒÂ¥ ÃƒÂ©n dag',
    achievement_group_duo: 'duo',
    achievement_group_trio: 'trio',
    achievement_group_quad: 'quad'
};
I18N_BENCHMARK_MISSING_PATCH.pl = {
    footer_site_made_by: 'Strona stworzona przez',
    footer_disclaimer: 'Ta strona nie jest powiÃ„â€¦zana, utrzymywana, wspierana ani sponsorowana przez GraalOnline. Wszystkie zasoby Ã‚Â© 2026 GraalOnline',
    footer_terms: 'Regulamin',
    footer_privacy: 'Polityka prywatnoÃ…â€ºci',
    footer_cookie: 'Polityka plikÃƒÂ³w cookie',
    footer_dmca: 'Polityka DMCA',
    profile_picture: 'ZdjÃ„â„¢cie profilowe',
    upload_image: 'PrzeÃ…â€ºlij obraz',
    edit_image: 'Edytuj obraz',
    remove_image: 'UsuÃ…â€ž obraz',
    username_label: 'Nazwa uÃ…Â¼ytkownika (1-20 znakÃƒÂ³w)',
    guilds_max: 'Gildie (Maks 6)',
    add_guild: 'Dodaj gildiÃ„â„¢',
    guild_name_placeholder: 'Nazwa gildii',
    country_flag: 'Flaga kraju',
    remove_flag: 'UsuÃ…â€ž flagÃ„â„¢',
    account_details: 'SzczegÃƒÂ³Ã…â€šy konta',
    account_id: 'ID konta',
    email_address: 'Adres e-mail',
    new_email_placeholder: 'Nowy adres e-mail',
    verify_update: 'Zweryfikuj i zaktualizuj',
    change_email_address: 'ZmieÃ…â€ž adres e-mail',
    change_password: 'ZmieÃ…â€ž hasÃ…â€šo',
    delete_personal_account: 'UsuÃ…â€ž konto osobiste',
    cannot_undo: 'Nie moÃ…Â¼na tego cofnÃ„â€¦Ã„â€¡.',
    delete_account: 'UsuÃ…â€ž konto',
    discard_changes: 'OdrzuÃ„â€¡ zmiany',
    save_changes: 'Zapisz zmiany',
    your_account_id: 'Twoje ID konta',
    friends_list_tab: 'Lista znajomych',
    friend_requests_tab: 'Zaproszenia do znajomych',
    remove_friends_tab: 'UsuÃ…â€ž znajomych',
    enter_account_id_placeholder: 'Wpisz ID konta',
    received_friend_requests: 'Otrzymane zaproszenia',
    sent_friend_requests: 'WysÃ…â€šane zaproszenia',
    select_friends_remove: 'Wybierz znajomych do usuniÃ„â„¢cia',
    highlight_title_required_label: 'TytuÃ…â€š (wymagany)',
    highlight_desc_optional_label: 'Opis (opcjonalny)',
    highlight_title_placeholder: 'Wpisz tytuÃ…â€š...',
    highlight_desc_placeholder: 'Wpisz opis...',
    highlights_empty: 'Brak wyrÃƒÂ³Ã…Â¼nieÃ…â€ž.',
    achievement_you_have: 'Odblokowano',
    achievement_progress_prefix: '{name}:',
    achievement_goal_total: 'ZdobÃ„â€¦dÃ…Âº {value} zabÃƒÂ³jstw baddy',
    achievement_goal_kills_day: 'Zabij {value} baddies w jeden dzieÃ…â€ž',
    achievement_goal_points_day: 'ZdobÃ„â€¦dÃ…Âº {value} punktÃƒÂ³w baddy w jeden dzieÃ…â€ž',
    achievement_goal_streak: 'ZdobÃ„â€¦dÃ…Âº seriÃ„â„¢ baddy: {value}',
    achievement_goal_group_day: 'UkoÃ…â€žcz sesjÃ„â„¢ {group}, zdobywajÃ„â€¦c {value} zabÃƒÂ³jstw baddy w jeden dzieÃ…â€ž',
    achievement_group_duo: 'duo',
    achievement_group_trio: 'trio',
    achievement_group_quad: 'quad'
};
I18N_BENCHMARK_MISSING_PATCH.fi = {
    footer_site_made_by: 'Sivuston teki',
    footer_disclaimer: 'TÃƒÂ¤mÃƒÂ¤ sivusto ei ole GraalOnlineen liittyvÃƒÂ¤, yllÃƒÂ¤pitÃƒÂ¤mÃƒÂ¤, hyvÃƒÂ¤ksymÃƒÂ¤ tai sponsoroima. Kaikki aineistot Ã‚Â© 2026 GraalOnline',
    footer_terms: 'KÃƒÂ¤yttÃƒÂ¶ehdot',
    footer_privacy: 'TietosuojakÃƒÂ¤ytÃƒÂ¤ntÃƒÂ¶',
    footer_cookie: 'EvÃƒÂ¤stekÃƒÂ¤ytÃƒÂ¤ntÃƒÂ¶',
    footer_dmca: 'DMCA-kÃƒÂ¤ytÃƒÂ¤ntÃƒÂ¶',
    profile_picture: 'Profiilikuva',
    upload_image: 'Lataa kuva',
    edit_image: 'Muokkaa kuvaa',
    remove_image: 'Poista kuva',
    username_label: 'KÃƒÂ¤yttÃƒÂ¤jÃƒÂ¤nimi (1-20 merkkiÃƒÂ¤)',
    guilds_max: 'Killat (Max 6)',
    add_guild: 'LisÃƒÂ¤ÃƒÂ¤ kilta',
    guild_name_placeholder: 'Killan nimi',
    country_flag: 'Maan lippu',
    remove_flag: 'Poista lippu',
    account_details: 'Tilin tiedot',
    account_id: 'Tilin tunnus',
    email_address: 'SÃƒÂ¤hkÃƒÂ¶postiosoite',
    new_email_placeholder: 'Uusi sÃƒÂ¤hkÃƒÂ¶postiosoite',
    verify_update: 'Vahvista ja pÃƒÂ¤ivitÃƒÂ¤',
    change_email_address: 'Vaihda sÃƒÂ¤hkÃƒÂ¶postiosoite',
    change_password: 'Vaihda salasana',
    delete_personal_account: 'Poista henkilÃƒÂ¶kohtainen tili',
    cannot_undo: 'TÃƒÂ¤tÃƒÂ¤ ei voi perua.',
    delete_account: 'Poista tili',
    discard_changes: 'HylkÃƒÂ¤ÃƒÂ¤ muutokset',
    save_changes: 'Tallenna muutokset',
    your_account_id: 'Tilisi tunnus',
    friends_list_tab: 'YstÃƒÂ¤vÃƒÂ¤lista',
    friend_requests_tab: 'KaveripyynnÃƒÂ¶t',
    remove_friends_tab: 'Poista ystÃƒÂ¤viÃƒÂ¤',
    enter_account_id_placeholder: 'SyÃƒÂ¶tÃƒÂ¤ tilin tunnus',
    received_friend_requests: 'Vastaanotetut kaveripyynnÃƒÂ¶t',
    sent_friend_requests: 'LÃƒÂ¤hetetyt kaveripyynnÃƒÂ¶t',
    select_friends_remove: 'Valitse poistettavat ystÃƒÂ¤vÃƒÂ¤t',
    highlight_title_required_label: 'Otsikko (pakollinen)',
    highlight_desc_optional_label: 'Kuvaus (valinnainen)',
    highlight_title_placeholder: 'Kirjoita otsikko...',
    highlight_desc_placeholder: 'Kirjoita kuvaus...',
    highlights_empty: 'Ei kohokohtia vielÃƒÂ¤.',
    achievement_you_have: 'Olet avannut',
    achievement_progress_prefix: '{name}:',
    achievement_goal_total: 'Saavuta {value} baddy-tappoa',
    achievement_goal_kills_day: 'Tapa {value} baddya yhden pÃƒÂ¤ivÃƒÂ¤n aikana',
    achievement_goal_points_day: 'Saavuta {value} baddy-pistettÃƒÂ¤ yhden pÃƒÂ¤ivÃƒÂ¤n aikana',
    achievement_goal_streak: 'Saa {value} baddy-putki',
    achievement_goal_group_day: 'Suorita {group}-sessio saamalla {value} baddy-tappoa yhden pÃƒÂ¤ivÃƒÂ¤n aikana',
    achievement_group_duo: 'duo',
    achievement_group_trio: 'trio',
    achievement_group_quad: 'quad'
};
I18N_BENCHMARK_MISSING_PATCH.sv = {
    footer_site_made_by: 'Sidan skapad av',
    footer_disclaimer: 'Denna sida ÃƒÂ¤r inte ansluten till, underhÃƒÂ¥llen av, godkÃƒÂ¤nd av eller sponsrad av GraalOnline. Alla tillgÃƒÂ¥ngar Ã‚Â© 2026 GraalOnline',
    footer_terms: 'Villkor',
    footer_privacy: 'Integritetspolicy',
    footer_cookie: 'Cookiepolicy',
    footer_dmca: 'DMCA-policy',
    profile_picture: 'Profilbild',
    upload_image: 'Ladda upp bild',
    edit_image: 'Redigera bild',
    remove_image: 'Ta bort bild',
    username_label: 'AnvÃƒÂ¤ndarnamn (1-20 tecken)',
    guilds_max: 'Guilds (Max 6)',
    add_guild: 'LÃƒÂ¤gg till guild',
    guild_name_placeholder: 'Guild-namn',
    country_flag: 'Landsflagga',
    remove_flag: 'Ta bort flagga',
    account_details: 'Kontouppgifter',
    account_id: 'Konto-ID',
    email_address: 'E-postadress',
    new_email_placeholder: 'Ny e-postadress',
    verify_update: 'Verifiera och uppdatera',
    change_email_address: 'Ãƒâ€žndra e-postadress',
    change_password: 'Ãƒâ€žndra lÃƒÂ¶senord',
    delete_personal_account: 'Ta bort personligt konto',
    cannot_undo: 'Detta kan inte ÃƒÂ¥ngras.',
    delete_account: 'Ta bort konto',
    discard_changes: 'FÃƒÂ¶rkasta ÃƒÂ¤ndringar',
    save_changes: 'Spara ÃƒÂ¤ndringar',
    your_account_id: 'Ditt konto-ID',
    friends_list_tab: 'VÃƒÂ¤nlista',
    friend_requests_tab: 'VÃƒÂ¤nfÃƒÂ¶rfrÃƒÂ¥gningar',
    remove_friends_tab: 'Ta bort vÃƒÂ¤nner',
    enter_account_id_placeholder: 'Ange konto-ID',
    received_friend_requests: 'Mottagna vÃƒÂ¤nfÃƒÂ¶rfrÃƒÂ¥gningar',
    sent_friend_requests: 'Skickade vÃƒÂ¤nfÃƒÂ¶rfrÃƒÂ¥gningar',
    select_friends_remove: 'VÃƒÂ¤lj vÃƒÂ¤nner att ta bort',
    highlight_title_required_label: 'Titel (obligatorisk)',
    highlight_desc_optional_label: 'Beskrivning (valfri)',
    highlight_title_placeholder: 'Ange en titel...',
    highlight_desc_placeholder: 'Ange en beskrivning...',
    highlights_empty: 'Inga hÃƒÂ¶jdpunkter ÃƒÂ¤nnu.',
    achievement_you_have: 'Du har lÃƒÂ¥st upp',
    achievement_progress_prefix: '{name}:',
    achievement_goal_total: 'UppnÃƒÂ¥ {value} baddy-kills',
    achievement_goal_kills_day: 'DÃƒÂ¶da {value} baddies pÃƒÂ¥ en dag',
    achievement_goal_points_day: 'NÃƒÂ¥ {value} baddy-poÃƒÂ¤ng pÃƒÂ¥ en dag',
    achievement_goal_streak: 'FÃƒÂ¥ en baddy-streak pÃƒÂ¥ {value}',
    achievement_goal_group_day: 'SlutfÃƒÂ¶r en {group}-session genom att fÃƒÂ¥ {value} baddy-kills pÃƒÂ¥ en dag',
    achievement_group_duo: 'duo',
    achievement_group_trio: 'trio',
    achievement_group_quad: 'quad'
};
I18N_BENCHMARK_MISSING_PATCH.hmn = {
    profile_picture: 'Profile Picture',
    upload_image: 'Upload Image',
    edit_image: 'Edit Image',
    remove_image: 'Remove Image',
    username_label: 'Username (1-20 characters)',
    guilds_max: 'Guilds (Max 6)',
    add_guild: 'Add Guild',
    guild_name_placeholder: 'Guild Name',
    country_flag: 'Country Flag',
    remove_flag: 'Remove Flag',
    account_details: 'Account Details',
    account_id: 'Account ID',
    email_address: 'Email Address',
    new_email_placeholder: 'New email address',
    verify_update: 'Verify & Update',
    change_email_address: 'Change Email Address',
    change_password: 'Change Password',
    delete_personal_account: 'Delete Personal Account',
    cannot_undo: 'This cannot be undone.',
    delete_account: 'Delete Account',
    discard_changes: 'Discard Changes',
    save_changes: 'Save Changes',
    your_account_id: 'Your Account ID',
    friends_list_tab: 'Friends List',
    friend_requests_tab: 'Friend Requests',
    remove_friends_tab: 'Remove Friends',
    enter_account_id_placeholder: 'Enter Account ID',
    received_friend_requests: 'Received Friend Requests',
    sent_friend_requests: 'Friend Requests Sent',
    select_friends_remove: 'Select friends to remove',
    highlight_title_required_label: 'Title (Required)',
    highlight_desc_optional_label: 'Description (Optional)',
    highlight_title_placeholder: 'Enter a title...',
    highlight_desc_placeholder: 'Enter a description...',
    highlights_empty: 'No highlights yet.',
    achievement_you_have: 'You have unlocked',
    achievement_progress_prefix: '{name}:',
    achievement_goal_total: 'Obtain {value} baddy kills',
    achievement_goal_kills_day: 'Kill {value} baddies in one day',
    achievement_goal_points_day: 'Reach {value} baddy points in one day',
    achievement_goal_streak: 'Get a {value} baddy streak',
    achievement_goal_group_day: 'Complete a {group} session by getting {value} baddy kills in one day',
    achievement_group_duo: 'duo',
    achievement_group_trio: 'trio',
    achievement_group_quad: 'quad'
};
Object.keys(I18N_BENCHMARK_MISSING_PATCH).forEach((lang) => {
    I18N[lang] = { ...(I18N[lang] || {}), ...I18N_BENCHMARK_MISSING_PATCH[lang] };
});

const I18N_ACHIEVEMENT_VIEWMODE_PATCH = {
    en: {
        achievement_friend_label: 'Friend {index}',
        achievement_session_incomplete: 'Session Incomplete'
    },
    ar: {
        achievement_friend_label: 'Ã˜Â§Ã™â€žÃ˜ÂµÃ˜Â¯Ã™Å Ã™â€š {index}',
        achievement_session_incomplete: 'Ã˜Â§Ã™â€žÃ˜Â¬Ã™â€žÃ˜Â³Ã˜Â© Ã˜ÂºÃ™Å Ã˜Â± Ã™â€¦Ã™Æ’Ã˜ÂªÃ™â€¦Ã™â€žÃ˜Â©'
    },
    bn: {
        achievement_friend_label: 'Ã Â¦Â¬Ã Â¦Â¨Ã Â§ÂÃ Â¦Â§Ã Â§Â {index}',
        achievement_session_incomplete: 'Ã Â¦Â¸Ã Â§â€¡Ã Â¦Â¶Ã Â¦Â¨ Ã Â¦â€¦Ã Â¦Â¸Ã Â¦Â®Ã Â§ÂÃ Â¦ÂªÃ Â§â€šÃ Â¦Â°Ã Â§ÂÃ Â¦Â£'
    },
    da: {
        achievement_friend_label: 'Ven {index}',
        achievement_session_incomplete: 'Session ikke fuldfÃƒÂ¸rt'
    },
    de: {
        achievement_friend_label: 'Freund {index}',
        achievement_session_incomplete: 'Sitzung unvollstÃƒÂ¤ndig'
    },
    es: {
        achievement_friend_label: 'Amigo {index}',
        achievement_session_incomplete: 'Sesión incompleta'
    },
    'pt-BR': {
        achievement_friend_label: 'Amigo {index}',
        achievement_session_incomplete: 'Sessão incompleta'
    },
    fil: {
        achievement_friend_label: 'Kaibigan {index}',
        achievement_session_incomplete: 'Hindi kumpleto ang session'
    },
    fr: {
        achievement_friend_label: 'Ami {index}',
        achievement_session_incomplete: 'Session incomplÃƒÂ¨te'
    },
    hmn: {
        achievement_friend_label: 'Phooj ywg {index}',
        achievement_session_incomplete: 'Session tsis tiav'
    },
    id: {
        achievement_friend_label: 'Teman {index}',
        achievement_session_incomplete: 'Sesi belum lengkap'
    },
    it: {
        achievement_friend_label: 'Amico {index}',
        achievement_session_incomplete: 'Sessione incompleta'
    },
    hu: {
        achievement_friend_label: 'BarÃƒÂ¡t {index}',
        achievement_session_incomplete: 'Munkamenet befejezetlen'
    },
    ms: {
        achievement_friend_label: 'Rakan {index}',
        achievement_session_incomplete: 'Sesi tidak lengkap'
    },
    nl: {
        achievement_friend_label: 'Vriend {index}',
        achievement_session_incomplete: 'Sessie onvolledig'
    },
    no: {
        achievement_friend_label: 'Venn {index}',
        achievement_session_incomplete: 'ÃƒËœkt ikke fullfÃƒÂ¸rt'
    },
    pl: {
        achievement_friend_label: 'Znajomy {index}',
        achievement_session_incomplete: 'Sesja nieukoÃ…â€žczona'
    },
    'pt-PT': {
        achievement_friend_label: 'Amigo {index}',
        achievement_session_incomplete: 'Sess\u00E3o incompleta'
    },
    fi: {
        achievement_friend_label: 'YstÃƒÂ¤vÃƒÂ¤ {index}',
        achievement_session_incomplete: 'Sessio keskenerÃƒÂ¤inen'
    },
    sv: {
        achievement_friend_label: 'VÃƒÂ¤n {index}',
        achievement_session_incomplete: 'Sessionen ÃƒÂ¤r ofullstÃƒÂ¤ndig'
    },
    vi: {
        achievement_friend_label: 'BÃ¡ÂºÂ¡n {index}',
        achievement_session_incomplete: 'PhiÃƒÂªn chÃ†Â°a hoÃƒÂ n tÃ¡ÂºÂ¥t'
    },
    tr: {
        achievement_friend_label: 'ArkadaÃ…Å¸ {index}',
        achievement_session_incomplete: 'Oturum tamamlanmadÃ„Â±'
    },
    zh: {
        achievement_friend_label: 'Ã¥Â¥Â½Ã¥Ââ€¹{index}',
        achievement_session_incomplete: 'Ã¥Â¯Â¹Ã¥Â±â‚¬Ã¦Å“ÂªÃ¥Â®Å’Ã¦Ë†Â'
    },
    ja: {
        achievement_friend_label: 'Ã£Æ’â€¢Ã£Æ’Â¬Ã£Æ’Â³Ã£Æ’â€°{index}',
        achievement_session_incomplete: 'Ã£â€šÂ»Ã£Æ’Æ’Ã£â€šÂ·Ã£Æ’Â§Ã£Æ’Â³Ã¦Å“ÂªÃ¥Â®Å’Ã¤Âºâ€ '
    },
    ko: {
        achievement_friend_label: 'Ã¬Â¹Å“ÃªÂµÂ¬ {index}',
        achievement_session_incomplete: 'Ã¬â€žÂ¸Ã¬â€¦Ëœ Ã«Â¯Â¸Ã¬â„¢â€žÃ«Â£Å’'
    }
};
Object.keys(I18N_ACHIEVEMENT_VIEWMODE_PATCH).forEach((lang) => {
    I18N[lang] = { ...(I18N[lang] || {}), ...I18N_ACHIEVEMENT_VIEWMODE_PATCH[lang] };
});

const I18N_ACHIEVEMENT_IMAGE_PATCH = {
    en: {
        achievement_no_image: 'No image',
        achievement_remove_image_title: 'Remove Image',
        achievement_remove_image_confirm: 'Remove this image?'
    },
    ar: {
        achievement_no_image: 'Ã™â€žÃ˜Â§ Ã˜ÂªÃ™Ë†Ã˜Â¬Ã˜Â¯ Ã˜ÂµÃ™Ë†Ã˜Â±Ã˜Â©',
        achievement_remove_image_title: 'Ã˜Â¥Ã˜Â²Ã˜Â§Ã™â€žÃ˜Â© Ã˜Â§Ã™â€žÃ˜ÂµÃ™Ë†Ã˜Â±Ã˜Â©',
        achievement_remove_image_confirm: 'Ã™â€¡Ã™â€ž Ã˜ÂªÃ˜Â±Ã™Å Ã˜Â¯ Ã˜Â¥Ã˜Â²Ã˜Â§Ã™â€žÃ˜Â© Ã™â€¡Ã˜Â°Ã™â€¡ Ã˜Â§Ã™â€žÃ˜ÂµÃ™Ë†Ã˜Â±Ã˜Â©Ã˜Å¸'
    },
    bn: {
        achievement_no_image: 'Ã Â¦â€¢Ã Â§â€¹Ã Â¦Â¨Ã Â§â€¹ Ã Â¦â€ºÃ Â¦Â¬Ã Â¦Â¿ Ã Â¦Â¨Ã Â§â€¡Ã Â¦â€¡',
        achievement_remove_image_title: 'Ã Â¦â€ºÃ Â¦Â¬Ã Â¦Â¿ Ã Â¦Â¸Ã Â¦Â°Ã Â¦Â¾Ã Â¦Â¨',
        achievement_remove_image_confirm: 'Ã Â¦ÂÃ Â¦â€¡ Ã Â¦â€ºÃ Â¦Â¬Ã Â¦Â¿Ã Â¦Å¸Ã Â¦Â¿ Ã Â¦Â¸Ã Â¦Â°Ã Â¦Â¾Ã Â¦Â¬Ã Â§â€¡Ã Â¦Â¨?'
    },
    da: {
        achievement_no_image: 'Intet billede',
        achievement_remove_image_title: 'Fjern billede',
        achievement_remove_image_confirm: 'Fjerne dette billede?'
    },
    de: {
        achievement_no_image: 'Kein Bild',
        achievement_remove_image_title: 'Bild entfernen',
        achievement_remove_image_confirm: 'Dieses Bild entfernen?'
    },
    es: {
        achievement_no_image: 'Sin imagen',
        achievement_remove_image_title: 'Eliminar imagen',
        achievement_remove_image_confirm: '¿Eliminar esta imagen?'
    },
    'pt-BR': {
        achievement_no_image: 'Sem imagem',
        achievement_remove_image_title: 'Remover imagem',
        achievement_remove_image_confirm: 'Remover esta imagem?'
    },
    fil: {
        achievement_no_image: 'Walang larawan',
        achievement_remove_image_title: 'Tanggalin ang larawan',
        achievement_remove_image_confirm: 'Alisin ang larawang ito?'
    },
    fr: {
        achievement_no_image: 'Aucune image',
        achievement_remove_image_title: 'Supprimer l\'image',
        achievement_remove_image_confirm: 'Supprimer cette image ?'
    },
    hmn: {
        achievement_no_image: 'Tsis muaj duab',
        achievement_remove_image_title: 'Tshem duab',
        achievement_remove_image_confirm: 'Tshem daim duab no?'
    },
    id: {
        achievement_no_image: 'Tidak ada gambar',
        achievement_remove_image_title: 'Hapus gambar',
        achievement_remove_image_confirm: 'Hapus gambar ini?'
    },
    it: {
        achievement_no_image: 'Nessuna immagine',
        achievement_remove_image_title: 'Rimuovi immagine',
        achievement_remove_image_confirm: 'Rimuovere questa immagine?'
    },
    hu: {
        achievement_no_image: 'Nincs kÃƒÂ©p',
        achievement_remove_image_title: 'KÃƒÂ©p eltÃƒÂ¡volÃƒÂ­tÃƒÂ¡sa',
        achievement_remove_image_confirm: 'EltÃƒÂ¡volÃƒÂ­tja ezt a kÃƒÂ©pet?'
    },
    ms: {
        achievement_no_image: 'Tiada imej',
        achievement_remove_image_title: 'Buang imej',
        achievement_remove_image_confirm: 'Buang imej ini?'
    },
    nl: {
        achievement_no_image: 'Geen afbeelding',
        achievement_remove_image_title: 'Afbeelding verwijderen',
        achievement_remove_image_confirm: 'Deze afbeelding verwijderen?'
    },
    no: {
        achievement_no_image: 'Ingen bilde',
        achievement_remove_image_title: 'Fjern bilde',
        achievement_remove_image_confirm: 'Fjerne dette bildet?'
    },
    pl: {
        achievement_no_image: 'Brak obrazu',
        achievement_remove_image_title: 'UsuÃ…â€ž obraz',
        achievement_remove_image_confirm: 'UsunÃ„â€¦Ã„â€¡ ten obraz?'
    },
    'pt-PT': {
        achievement_no_image: 'Sem imagem',
        achievement_remove_image_title: 'Remover imagem',
        achievement_remove_image_confirm: 'Remover esta imagem?'
    },
    fi: {
        achievement_no_image: 'Ei kuvaa',
        achievement_remove_image_title: 'Poista kuva',
        achievement_remove_image_confirm: 'Poistetaanko tÃƒÂ¤mÃƒÂ¤ kuva?'
    },
    sv: {
        achievement_no_image: 'Ingen bild',
        achievement_remove_image_title: 'Ta bort bild',
        achievement_remove_image_confirm: 'Ta bort den hÃƒÂ¤r bilden?'
    },
    vi: {
        achievement_no_image: 'KhÃƒÂ´ng cÃƒÂ³ Ã¡ÂºÂ£nh',
        achievement_remove_image_title: 'XÃƒÂ³a Ã¡ÂºÂ£nh',
        achievement_remove_image_confirm: 'XÃƒÂ³a Ã¡ÂºÂ£nh nÃƒÂ y?'
    },
    tr: {
        achievement_no_image: 'GÃƒÂ¶rsel yok',
        achievement_remove_image_title: 'GÃƒÂ¶rseli kaldÃ„Â±r',
        achievement_remove_image_confirm: 'Bu gÃƒÂ¶rsel kaldÃ„Â±rÃ„Â±lsÃ„Â±n mÃ„Â±?'
    },
    zh: {
        achievement_no_image: 'Ã¦â€”Â Ã¥â€ºÂ¾Ã§â€°â€¡',
        achievement_remove_image_title: 'Ã§Â§Â»Ã©â„¢Â¤Ã¥â€ºÂ¾Ã§â€°â€¡',
        achievement_remove_image_confirm: 'Ã§Â§Â»Ã©â„¢Â¤Ã¦Â­Â¤Ã¥â€ºÂ¾Ã§â€°â€¡Ã¯Â¼Å¸'
    },
    ja: {
        achievement_no_image: 'Ã§â€Â»Ã¥Æ’ÂÃ£ÂÂªÃ£Ââ€”',
        achievement_remove_image_title: 'Ã§â€Â»Ã¥Æ’ÂÃ£â€šâ€™Ã¥â€°Å Ã©â„¢Â¤',
        achievement_remove_image_confirm: 'Ã£Ââ€œÃ£ÂÂ®Ã§â€Â»Ã¥Æ’ÂÃ£â€šâ€™Ã¥â€°Å Ã©â„¢Â¤Ã£Ââ€”Ã£ÂÂ¾Ã£Ââ„¢Ã£Ââ€¹Ã¯Â¼Å¸'
    },
    ko: {
        achievement_no_image: 'Ã¬ÂÂ´Ã«Â¯Â¸Ã¬Â§â‚¬ Ã¬â€”â€ Ã¬ÂÅ’',
        achievement_remove_image_title: 'Ã¬ÂÂ´Ã«Â¯Â¸Ã¬Â§â‚¬ Ã¬Â Å“ÃªÂ±Â°',
        achievement_remove_image_confirm: 'Ã¬ÂÂ´ Ã¬ÂÂ´Ã«Â¯Â¸Ã¬Â§â‚¬Ã«Â¥Â¼ Ã¬Â Å“ÃªÂ±Â°Ã­â€¢ËœÃ¬â€¹Å“ÃªÂ²Â Ã¬Å ÂµÃ«â€¹Ë†ÃªÂ¹Å’?'
    }
};
Object.keys(I18N_ACHIEVEMENT_IMAGE_PATCH).forEach((lang) => {
    I18N[lang] = { ...(I18N[lang] || {}), ...I18N_ACHIEVEMENT_IMAGE_PATCH[lang] };
});

const I18N_CONFIRM_LABEL_PATCH = {
    en: { confirm: 'Confirm' },
    ar: { confirm: 'Ã˜ÂªÃ˜Â£Ã™Æ’Ã™Å Ã˜Â¯' },
    bn: { confirm: 'Ã Â¦Â¨Ã Â¦Â¿Ã Â¦Â¶Ã Â§ÂÃ Â¦Å¡Ã Â¦Â¿Ã Â¦Â¤ Ã Â¦â€¢Ã Â¦Â°Ã Â§ÂÃ Â¦Â¨' },
    da: { confirm: 'BekrÃƒÂ¦ft' },
    de: { confirm: 'BestÃƒÂ¤tigen' },
    fil: { confirm: 'Kumpirmahin' },
    fr: { confirm: 'Confirmer' },
    hmn: { confirm: 'Lees paub' },
    id: { confirm: 'Konfirmasi' },
    it: { confirm: 'Conferma' },
    hu: { confirm: 'MegerÃ…â€˜sÃƒÂ­tÃƒÂ©s' },
    ms: { confirm: 'Sahkan' },
    nl: { confirm: 'Bevestigen' },
    no: { confirm: 'Bekreft' },
    pl: { confirm: 'PotwierdÃ…Âº' },
    'pt-PT': { confirm: 'Confirmar' },
    fi: { confirm: 'Vahvista' },
    sv: { confirm: 'BekrÒ¤fta' },
    vi: { confirm: 'XÒ¡c nháº­n' },
    tr: { confirm: 'Onayla' },
    zh: { confirm: 'ç¡®è®¤' },
    ja: { confirm: 'ç¢ºèª' },
    ko: { confirm: 'Ã­â„¢â€¢Ã¬ÂÂ¸' }
};
Object.keys(I18N_CONFIRM_LABEL_PATCH).forEach((lang) => {
    I18N[lang] = { ...(I18N[lang] || {}), ...I18N_CONFIRM_LABEL_PATCH[lang] };
});

const I18N_ACHIEVEMENT_LABEL_PATCH = {
    en: {
        achievement_session_image: 'Session Image',
        achievement_cat_lifetime: 'Lifetime',
        achievement_cat_kills: 'Kills',
        achievement_cat_points: 'Points',
        achievement_cat_streak: 'Streak',
        achievement_cat_duo: 'Duo',
        achievement_cat_trio: 'Trio',
        achievement_cat_quad: 'Quad',
        achievement_cat_challenge: 'Challenge'
    },
    ar: {
        achievement_session_image: 'Ã˜ÂµÃ™Ë†Ã˜Â±Ã˜Â© Ã˜Â§Ã™â€žÃ˜Â¬Ã™â€žÃ˜Â³Ã˜Â©',
        achievement_cat_lifetime: 'Ã˜Â¥Ã˜Â¬Ã™â€¦Ã˜Â§Ã™â€žÃ™Å  Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â³Ã™Å Ã˜Â±Ã˜Â©',
        achievement_cat_kills: 'Ã˜Â§Ã™â€žÃ™â€šÃ˜ÂªÃ™â€žÃ˜Â§Ã˜Âª',
        achievement_cat_points: 'Ã˜Â§Ã™â€žÃ™â€ Ã™â€šÃ˜Â§Ã˜Â·',
        achievement_cat_streak: 'Ã˜Â³Ã™â€žÃ˜Â³Ã™â€žÃ˜Â©',
        achievement_cat_duo: 'Ã˜Â«Ã™â€ Ã˜Â§Ã˜Â¦Ã™Å ',
        achievement_cat_trio: 'Ã˜Â«Ã™â€žÃ˜Â§Ã˜Â«Ã™Å ',
        achievement_cat_quad: 'Ã˜Â±Ã˜Â¨Ã˜Â§Ã˜Â¹Ã™Å ',
        achievement_cat_challenge: 'Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â­Ã˜Â¯Ã™Å '
    },
    bn: {
        achievement_session_image: 'Ã Â¦Â¸Ã Â§â€¡Ã Â¦Â¶Ã Â¦Â¨ Ã Â¦â€ºÃ Â¦Â¬Ã Â¦Â¿',
        achievement_cat_lifetime: 'Ã Â¦Â²Ã Â¦Â¾Ã Â¦â€¡Ã Â¦Â«Ã Â¦Å¸Ã Â¦Â¾Ã Â¦â€¡Ã Â¦Â®',
        achievement_cat_kills: 'Ã Â¦â€¢Ã Â¦Â¿Ã Â¦Â²',
        achievement_cat_points: 'Ã Â¦ÂªÃ Â¦Â¯Ã Â¦Â¼Ã Â§â€¡Ã Â¦Â¨Ã Â§ÂÃ Â¦Å¸',
        achievement_cat_streak: 'Ã Â¦Â¸Ã Â§ÂÃ Â¦Å¸Ã Â§ÂÃ Â¦Â°Ã Â¦Â¿Ã Â¦â€¢',
        achievement_cat_duo: 'Ã Â¦Â¡Ã Â§ÂÃ Â¦Â¯Ã Â¦Â¼Ã Â§â€¹',
        achievement_cat_trio: 'Ã Â¦Å¸Ã Â§ÂÃ Â¦Â°Ã Â¦Â¿Ã Â¦â€œ',
        achievement_cat_quad: 'Ã Â¦â€¢Ã Â§â€¹Ã Â¦Â¯Ã Â¦Â¼Ã Â¦Â¾Ã Â¦Â¡',
        achievement_cat_challenge: 'Ã Â¦Å¡Ã Â§ÂÃ Â¦Â¯Ã Â¦Â¾Ã Â¦Â²Ã Â§â€¡Ã Â¦Å¾Ã Â§ÂÃ Â¦Å“'
    },
    da: {
        achievement_session_image: 'Sessionsbillede',
        achievement_cat_lifetime: 'Livstid',
        achievement_cat_kills: 'Drab',
        achievement_cat_points: 'Point',
        achievement_cat_streak: 'Stime',
        achievement_cat_duo: 'Duo',
        achievement_cat_trio: 'Trio',
        achievement_cat_quad: 'Quad',
        achievement_cat_challenge: 'Udfordring'
    },
    de: {
        achievement_session_image: 'Sitzungsbild',
        achievement_cat_lifetime: 'Gesamt',
        achievement_cat_kills: 'Kills',
        achievement_cat_points: 'Punkte',
        achievement_cat_streak: 'Serie',
        achievement_cat_duo: 'Duo',
        achievement_cat_trio: 'Trio',
        achievement_cat_quad: 'Quartett',
        achievement_cat_challenge: 'Herausforderung'
    },
    es: {
        achievement_session_image: 'Imagen de sesión',
        achievement_cat_lifetime: 'Total',
        achievement_cat_kills: 'Bajas',
        achievement_cat_points: 'Puntos',
        achievement_cat_streak: 'Racha',
        achievement_cat_duo: 'Dúo',
        achievement_cat_trio: 'Trío',
        achievement_cat_quad: 'Cuarteto',
        achievement_cat_challenge: 'Desafío'
    },
    'pt-BR': {
        achievement_session_image: 'Imagem da sessão',
        achievement_cat_lifetime: 'Total',
        achievement_cat_kills: 'Abates',
        achievement_cat_points: 'Pontos',
        achievement_cat_streak: 'Sequência',
        achievement_cat_duo: 'Dupla',
        achievement_cat_trio: 'Trio',
        achievement_cat_quad: 'Quarteto',
        achievement_cat_challenge: 'Desafio'
    },
    fil: {
        achievement_session_image: 'Larawan ng session',
        achievement_cat_lifetime: 'Kabuuan',
        achievement_cat_kills: 'Kills',
        achievement_cat_points: 'Puntos',
        achievement_cat_streak: 'Sunod-sunod',
        achievement_cat_duo: 'Duo',
        achievement_cat_trio: 'Trio',
        achievement_cat_quad: 'Quad',
        achievement_cat_challenge: 'Hamon'
    },
    fr: {
        achievement_session_image: 'Image de session',
        achievement_cat_lifetime: 'Total',
        achievement_cat_kills: 'Ãƒâ€°liminations',
        achievement_cat_points: 'Points',
        achievement_cat_streak: 'SÃƒÂ©rie',
        achievement_cat_duo: 'Duo',
        achievement_cat_trio: 'Trio',
        achievement_cat_quad: 'Quatuor',
        achievement_cat_challenge: 'DÃƒÂ©fi'
    },
    hmn: {
        achievement_session_image: 'Duab session',
        achievement_cat_lifetime: 'Tag nrho',
        achievement_cat_kills: 'Tua',
        achievement_cat_points: 'Points',
        achievement_cat_streak: 'Streak',
        achievement_cat_duo: 'Duo',
        achievement_cat_trio: 'Trio',
        achievement_cat_quad: 'Quad',
        achievement_cat_challenge: 'Kev sib tw'
    },
    id: {
        achievement_session_image: 'Gambar sesi',
        achievement_cat_lifetime: 'Seumur hidup',
        achievement_cat_kills: 'Kill',
        achievement_cat_points: 'Poin',
        achievement_cat_streak: 'Streak',
        achievement_cat_duo: 'Duo',
        achievement_cat_trio: 'Trio',
        achievement_cat_quad: 'Kuad',
        achievement_cat_challenge: 'Tantangan'
    },
    it: {
        achievement_session_image: 'Immagine sessione',
        achievement_cat_lifetime: 'Totale',
        achievement_cat_kills: 'Uccisioni',
        achievement_cat_points: 'Punti',
        achievement_cat_streak: 'Serie',
        achievement_cat_duo: 'Duo',
        achievement_cat_trio: 'Trio',
        achievement_cat_quad: 'Quad',
        achievement_cat_challenge: 'Sfida'
    },
    hu: {
        achievement_session_image: 'Munkamenet kÃƒÂ©pe',
        achievement_cat_lifetime: 'Ãƒâ€“sszes',
        achievement_cat_kills: 'Ãƒâ€“lÃƒÂ©sek',
        achievement_cat_points: 'Pontok',
        achievement_cat_streak: 'Sorozat',
        achievement_cat_duo: 'DuÃƒÂ³',
        achievement_cat_trio: 'TriÃƒÂ³',
        achievement_cat_quad: 'NÃƒÂ©gyes',
        achievement_cat_challenge: 'KihÃƒÂ­vÃƒÂ¡s'
    },
    ms: {
        achievement_session_image: 'Imej sesi',
        achievement_cat_lifetime: 'Sepanjang masa',
        achievement_cat_kills: 'Bunuhan',
        achievement_cat_points: 'Mata',
        achievement_cat_streak: 'Rentetan',
        achievement_cat_duo: 'Duo',
        achievement_cat_trio: 'Trio',
        achievement_cat_quad: 'Kuad',
        achievement_cat_challenge: 'Cabaran'
    },
    nl: {
        achievement_session_image: 'Sessie-afbeelding',
        achievement_cat_lifetime: 'Totaal',
        achievement_cat_kills: 'Kills',
        achievement_cat_points: 'Punten',
        achievement_cat_streak: 'Reeks',
        achievement_cat_duo: 'Duo',
        achievement_cat_trio: 'Trio',
        achievement_cat_quad: 'Kwartet',
        achievement_cat_challenge: 'Uitdaging'
    },
    no: {
        achievement_session_image: 'ÃƒËœktbilde',
        achievement_cat_lifetime: 'Totalt',
        achievement_cat_kills: 'Drap',
        achievement_cat_points: 'Poeng',
        achievement_cat_streak: 'Rekke',
        achievement_cat_duo: 'Duo',
        achievement_cat_trio: 'Trio',
        achievement_cat_quad: 'Kvartett',
        achievement_cat_challenge: 'Utfordring'
    },
    pl: {
        achievement_session_image: 'Obraz sesji',
        achievement_cat_lifetime: 'Ã…ÂÃ„â€¦cznie',
        achievement_cat_kills: 'ZabÃƒÂ³jstwa',
        achievement_cat_points: 'Punkty',
        achievement_cat_streak: 'Seria',
        achievement_cat_duo: 'Duo',
        achievement_cat_trio: 'Trio',
        achievement_cat_quad: 'Kwartet',
        achievement_cat_challenge: 'Wyzwanie'
    },
    'pt-PT': {
        achievement_session_image: 'Imagem da sess\u00E3o',
        achievement_cat_lifetime: 'Total',
        achievement_cat_kills: 'Abates',
        achievement_cat_points: 'Pontos',
        achievement_cat_streak: 'Sequ\u00EAncia',
        achievement_cat_duo: 'Dupla',
        achievement_cat_trio: 'Trio',
        achievement_cat_quad: 'Quarteto',
        achievement_cat_challenge: 'Desafio'
    },
    fi: {
        achievement_session_image: 'Istunnon kuva',
        achievement_cat_lifetime: 'YhteensÃƒÂ¤',
        achievement_cat_kills: 'Tapot',
        achievement_cat_points: 'Pisteet',
        achievement_cat_streak: 'Putki',
        achievement_cat_duo: 'Duo',
        achievement_cat_trio: 'Trio',
        achievement_cat_quad: 'Nelikko',
        achievement_cat_challenge: 'Haaste'
    },
    sv: {
        achievement_session_image: 'Sessionsbild',
        achievement_cat_lifetime: 'Totalt',
        achievement_cat_kills: 'Elimineringar',
        achievement_cat_points: 'PoÃƒÂ¤ng',
        achievement_cat_streak: 'Svit',
        achievement_cat_duo: 'Duo',
        achievement_cat_trio: 'Trio',
        achievement_cat_quad: 'Fyrtal',
        achievement_cat_challenge: 'Utmaning'
    },
    vi: {
        achievement_session_image: 'Ã¡ÂºÂ¢nh phiÃƒÂªn',
        achievement_cat_lifetime: 'TÃ¡Â»â€¢ng',
        achievement_cat_kills: 'HÃ¡ÂºÂ¡ gÃ¡Â»Â¥c',
        achievement_cat_points: 'Ã„ÂiÃ¡Â»Æ’m',
        achievement_cat_streak: 'ChuÃ¡Â»â€”i',
        achievement_cat_duo: 'Ã„ÂÃƒÂ´i',
        achievement_cat_trio: 'BÃ¡Â»â„¢ ba',
        achievement_cat_quad: 'BÃ¡Â»â„¢ bÃ¡Â»â€˜n',
        achievement_cat_challenge: 'ThÃ¡Â»Â­ thÃƒÂ¡ch'
    },
    tr: {
        achievement_session_image: 'Oturum gÃƒÂ¶rseli',
        achievement_cat_lifetime: 'Toplam',
        achievement_cat_kills: 'Ãƒâ€“ldÃƒÂ¼rme',
        achievement_cat_points: 'Puan',
        achievement_cat_streak: 'Seri',
        achievement_cat_duo: 'Ã„Â°kili',
        achievement_cat_trio: 'ÃƒÅ“ÃƒÂ§lÃƒÂ¼',
        achievement_cat_quad: 'DÃƒÂ¶rtlÃƒÂ¼',
        achievement_cat_challenge: 'Meydan okuma'
    },
    zh: {
        achievement_session_image: 'Ã¥Â¯Â¹Ã¥Â±â‚¬Ã¥â€ºÂ¾Ã§â€°â€¡',
        achievement_cat_lifetime: 'Ã§â€Å¸Ã¦Â¶Â¯',
        achievement_cat_kills: 'Ã¥â€¡Â»Ã¦Ââ‚¬',
        achievement_cat_points: 'Ã§Â§Â¯Ã¥Ë†â€ ',
        achievement_cat_streak: 'Ã¨Â¿Å¾Ã¦Ââ‚¬',
        achievement_cat_duo: 'Ã¥ÂÅ’Ã¤ÂºÂº',
        achievement_cat_trio: 'Ã¤Â¸â€°Ã¤ÂºÂº',
        achievement_cat_quad: 'Ã¥â€ºâ€ºÃ¤ÂºÂº',
        achievement_cat_challenge: 'Ã¦Å’â€˜Ã¦Ë†Ëœ'
    },
    ja: {
        achievement_session_image: 'Ã£â€šÂ»Ã£Æ’Æ’Ã£â€šÂ·Ã£Æ’Â§Ã£Æ’Â³Ã§â€Â»Ã¥Æ’Â',
        achievement_cat_lifetime: 'Ã§Â´Â¯Ã¨Â¨Ë†',
        achievement_cat_kills: 'Ã£â€šÂ­Ã£Æ’Â«',
        achievement_cat_points: 'Ã£Æ’ÂÃ£â€šÂ¤Ã£Æ’Â³Ã£Æ’Ë†',
        achievement_cat_streak: 'Ã©â‚¬Â£Ã§Â¶Å¡',
        achievement_cat_duo: 'Ã£Æ’â€¡Ã£Æ’Â¥Ã£â€šÂª',
        achievement_cat_trio: 'Ã£Æ’Ë†Ã£Æ’ÂªÃ£â€šÂª',
        achievement_cat_quad: 'Ã£â€šÂ¯Ã£â€šÂ¢Ã£Æ’Æ’Ã£Æ’â€°',
        achievement_cat_challenge: 'Ã£Æ’ÂÃ£Æ’Â£Ã£Æ’Â¬Ã£Æ’Â³Ã£â€šÂ¸'
    },
    ko: {
        achievement_session_image: 'Ã¬â€žÂ¸Ã¬â€¦Ëœ Ã¬ÂÂ´Ã«Â¯Â¸Ã¬Â§â‚¬',
        achievement_cat_lifetime: 'Ã«Ë†â€žÃ¬Â Â',
        achievement_cat_kills: 'Ã¬Â²ËœÃ¬Â¹Ëœ',
        achievement_cat_points: 'Ã­ÂÂ¬Ã¬ÂÂ¸Ã­Å Â¸',
        achievement_cat_streak: 'Ã¬â€”Â°Ã¬â€ Â',
        achievement_cat_duo: 'Ã«â€œâ‚¬Ã¬ËœÂ¤',
        achievement_cat_trio: 'Ã­Å Â¸Ã«Â¦Â¬Ã¬ËœÂ¤',
        achievement_cat_quad: 'Ã¬Â¿Â¼Ã«â€œÅ“',
        achievement_cat_challenge: 'Ã«Ââ€žÃ¬Â â€ž'
    }
};
Object.keys(I18N_ACHIEVEMENT_LABEL_PATCH).forEach((lang) => {
    I18N[lang] = { ...(I18N[lang] || {}), ...I18N_ACHIEVEMENT_LABEL_PATCH[lang] };
});

const I18N_REMOVE_FRIEND_PATCH = {
    en: {
        remove_friend_title: 'Remove Friend',
        remove_friend_confirm: 'Remove {name} from your friends list?',
        remove_friend_failed: 'Failed to remove friend.'
    },
    ar: {
        remove_friend_title: 'Ã˜Â¥Ã˜Â²Ã˜Â§Ã™â€žÃ˜Â© Ã˜ÂµÃ˜Â¯Ã™Å Ã™â€š',
        remove_friend_confirm: 'Ã™â€¡Ã™â€ž Ã˜ÂªÃ˜Â±Ã™Å Ã˜Â¯ Ã˜Â¥Ã˜Â²Ã˜Â§Ã™â€žÃ˜Â© {name} Ã™â€¦Ã™â€  Ã™â€šÃ˜Â§Ã˜Â¦Ã™â€¦Ã˜Â© Ã˜Â£Ã˜ÂµÃ˜Â¯Ã™â€šÃ˜Â§Ã˜Â¦Ã™Æ’Ã˜Å¸',
        remove_friend_failed: 'Ã™ÂÃ˜Â´Ã™â€ž Ã™ÂÃ™Å  Ã˜Â¥Ã˜Â²Ã˜Â§Ã™â€žÃ˜Â© Ã˜Â§Ã™â€žÃ˜ÂµÃ˜Â¯Ã™Å Ã™â€š.'
    },
    bn: {
        remove_friend_title: 'Ã Â¦Â¬Ã Â¦Â¨Ã Â§ÂÃ Â¦Â§Ã Â§Â Ã Â¦Â¸Ã Â¦Â°Ã Â¦Â¾Ã Â¦Â¨',
        remove_friend_confirm: 'Ã Â¦â€ Ã Â¦ÂªÃ Â¦Â¨Ã Â¦Â¾Ã Â¦Â° Ã Â¦Â¬Ã Â¦Â¨Ã Â§ÂÃ Â¦Â§Ã Â§Â Ã Â¦Â¤Ã Â¦Â¾Ã Â¦Â²Ã Â¦Â¿Ã Â¦â€¢Ã Â¦Â¾ Ã Â¦Â¥Ã Â§â€¡Ã Â¦â€¢Ã Â§â€¡ {name} Ã Â¦Â¸Ã Â¦Â°Ã Â¦Â¾Ã Â¦Â¬Ã Â§â€¡Ã Â¦Â¨?',
        remove_friend_failed: 'Ã Â¦Â¬Ã Â¦Â¨Ã Â§ÂÃ Â¦Â§Ã Â§Â Ã Â¦Â¸Ã Â¦Â°Ã Â¦Â¾Ã Â¦Â¤Ã Â§â€¡ Ã Â¦Â¬Ã Â§ÂÃ Â¦Â¯Ã Â¦Â°Ã Â§ÂÃ Â¦Â¥ Ã Â¦Â¹Ã Â¦Â¯Ã Â¦Â¼Ã Â§â€¡Ã Â¦â€ºÃ Â§â€¡Ã Â¥Â¤'
    },
    da: {
        remove_friend_title: 'Fjern ven',
        remove_friend_confirm: 'Fjern {name} fra din venneliste?',
        remove_friend_failed: 'Kunne ikke fjerne ven.'
    },
    de: {
        remove_friend_title: 'Freund entfernen',
        remove_friend_confirm: '{name} aus deiner Freundesliste entfernen?',
        remove_friend_failed: 'Freund konnte nicht entfernt werden.'
    },
    fil: {
        remove_friend_title: 'Alisin ang kaibigan',
        remove_friend_confirm: 'Alisin si {name} sa listahan ng iyong mga kaibigan?',
        remove_friend_failed: 'Hindi maalis ang kaibigan.'
    },
    fr: {
        remove_friend_title: 'Supprimer un ami',
        remove_friend_confirm: 'Supprimer {name} de votre liste d\'amis ?',
        remove_friend_failed: 'Ãƒâ€°chec de la suppression de l\'ami.'
    },
    hmn: {
        remove_friend_title: 'Tshem phooj ywg',
        remove_friend_confirm: 'Tshem {name} ntawm koj daim ntawv phooj ywg?',
        remove_friend_failed: 'Tshem phooj ywg tsis tiav.'
    },
    id: {
        remove_friend_title: 'Hapus teman',
        remove_friend_confirm: 'Hapus {name} dari daftar teman Anda?',
        remove_friend_failed: 'Gagal menghapus teman.'
    },
    it: {
        remove_friend_title: 'Rimuovi amico',
        remove_friend_confirm: 'Rimuovere {name} dalla tua lista amici?',
        remove_friend_failed: 'Impossibile rimuovere l\'amico.'
    },
    hu: {
        remove_friend_title: 'BarÃƒÂ¡t eltÃƒÂ¡volÃƒÂ­tÃƒÂ¡sa',
        remove_friend_confirm: 'EltÃƒÂ¡volÃƒÂ­tod ezt a barÃƒÂ¡tot a listÃƒÂ¡drÃƒÂ³l: {name}?',
        remove_friend_failed: 'A barÃƒÂ¡t eltÃƒÂ¡volÃƒÂ­tÃƒÂ¡sa nem sikerÃƒÂ¼lt.'
    },
    ms: {
        remove_friend_title: 'Buang rakan',
        remove_friend_confirm: 'Buang {name} daripada senarai rakan anda?',
        remove_friend_failed: 'Gagal membuang rakan.'
    },
    nl: {
        remove_friend_title: 'Vriend verwijderen',
        remove_friend_confirm: '{name} uit je vriendenlijst verwijderen?',
        remove_friend_failed: 'Vriend verwijderen is mislukt.'
    },
    no: {
        remove_friend_title: 'Fjern venn',
        remove_friend_confirm: 'Fjerne {name} fra vennelisten din?',
        remove_friend_failed: 'Kunne ikke fjerne venn.'
    },
    pl: {
        remove_friend_title: 'UsuÃ…â€ž znajomego',
        remove_friend_confirm: 'UsunÃ„â€¦Ã„â€¡ {name} z listy znajomych?',
        remove_friend_failed: 'Nie udaÃ…â€šo siÃ„â„¢ usunÃ„â€¦Ã„â€¡ znajomego.'
    },
    'pt-PT': {
        remove_friend_title: 'Remover amigo',
        remove_friend_confirm: 'Remover {name} da sua lista de amigos?',
        remove_friend_failed: 'Falha ao remover amigo.'
    },
    fi: {
        remove_friend_title: 'Poista ystÃƒÂ¤vÃƒÂ¤',
        remove_friend_confirm: 'Poistetaanko {name} ystÃƒÂ¤vÃƒÂ¤listaltasi?',
        remove_friend_failed: 'YstÃƒÂ¤vÃƒÂ¤n poistaminen epÃƒÂ¤onnistui.'
    },
    sv: {
        remove_friend_title: 'Ta bort vÃƒÂ¤n',
        remove_friend_confirm: 'Ta bort {name} frÃƒÂ¥n din vÃƒÂ¤nlista?',
        remove_friend_failed: 'Det gick inte att ta bort vÃƒÂ¤n.'
    },
    vi: {
        remove_friend_title: 'XÃƒÂ³a bÃ¡ÂºÂ¡n bÃƒÂ¨',
        remove_friend_confirm: 'XÃƒÂ³a {name} khÃ¡Â»Âi danh sÃƒÂ¡ch bÃ¡ÂºÂ¡n bÃƒÂ¨ cÃ¡Â»Â§a bÃ¡ÂºÂ¡n?',
        remove_friend_failed: 'KhÃƒÂ´ng thÃ¡Â»Æ’ xÃƒÂ³a bÃ¡ÂºÂ¡n bÃƒÂ¨.'
    },
    tr: {
        remove_friend_title: 'ArkadaÃ…Å¸Ã„Â± kaldÃ„Â±r',
        remove_friend_confirm: '{name} arkadaÃ…Å¸ listesinden kaldÃ„Â±rÃ„Â±lsÃ„Â±n mÃ„Â±?',
        remove_friend_failed: 'ArkadaÃ…Å¸ kaldÃ„Â±rÃ„Â±lamadÃ„Â±.'
    },
    zh: {
        remove_friend_title: 'Ã§Â§Â»Ã©â„¢Â¤Ã¥Â¥Â½Ã¥Ââ€¹',
        remove_friend_confirm: 'Ã¨Â¦ÂÃ¥Â°â€  {name} Ã¤Â»Å½Ã¤Â½Â Ã§Å¡â€žÃ¥Â¥Â½Ã¥Ââ€¹Ã¥Ë†â€”Ã¨Â¡Â¨Ã¤Â¸Â­Ã§Â§Â»Ã©â„¢Â¤Ã¥Ââ€”Ã¯Â¼Å¸',
        remove_friend_failed: 'Ã§Â§Â»Ã©â„¢Â¤Ã¥Â¥Â½Ã¥Ââ€¹Ã¥Â¤Â±Ã¨Â´Â¥Ã£â‚¬â€š'
    },
    ja: {
        remove_friend_title: 'Ã£Æ’â€¢Ã£Æ’Â¬Ã£Æ’Â³Ã£Æ’â€°Ã£â€šâ€™Ã¥â€°Å Ã©â„¢Â¤',
        remove_friend_confirm: '{name} Ã£â€šâ€™Ã£Æ’â€¢Ã£Æ’Â¬Ã£Æ’Â³Ã£Æ’â€°Ã£Æ’ÂªÃ£â€šÂ¹Ã£Æ’Ë†Ã£Ââ€¹Ã£â€šâ€°Ã¥â€°Å Ã©â„¢Â¤Ã£Ââ€”Ã£ÂÂ¾Ã£Ââ„¢Ã£Ââ€¹Ã¯Â¼Å¸',
        remove_friend_failed: 'Ã£Æ’â€¢Ã£Æ’Â¬Ã£Æ’Â³Ã£Æ’â€°Ã£ÂÂ®Ã¥â€°Å Ã©â„¢Â¤Ã£ÂÂ«Ã¥Â¤Â±Ã¦â€¢â€”Ã£Ââ€”Ã£ÂÂ¾Ã£Ââ€”Ã£ÂÅ¸Ã£â‚¬â€š'
    },
    ko: {
        remove_friend_title: 'Ã¬Â¹Å“ÃªÂµÂ¬ Ã¬Â Å“ÃªÂ±Â°',
        remove_friend_confirm: 'Ã¬Â¹Å“ÃªÂµÂ¬ Ã«ÂªÂ©Ã«Â¡ÂÃ¬â€”ÂÃ¬â€žÅ“ {name}Ã¬Ââ€ž(Ã«Â¥Â¼) Ã¬Â Å“ÃªÂ±Â°Ã­â€¢ËœÃ¬â€¹Å“ÃªÂ²Â Ã¬Å ÂµÃ«â€¹Ë†ÃªÂ¹Å’?',
        remove_friend_failed: 'Ã¬Â¹Å“ÃªÂµÂ¬Ã«Â¥Â¼ Ã¬Â Å“ÃªÂ±Â°Ã­â€¢ËœÃ¬Â§â‚¬ Ã«ÂªÂ»Ã­â€“Ë†Ã¬Å ÂµÃ«â€¹Ë†Ã«â€¹Â¤.'
    }
};
Object.keys(I18N_REMOVE_FRIEND_PATCH).forEach((lang) => {
    I18N[lang] = { ...(I18N[lang] || {}), ...I18N_REMOVE_FRIEND_PATCH[lang] };
});

const I18N_HIGHLIGHT_DELETE_PATCH = {
    en: {
        highlight_delete_title: 'Delete Highlight',
        highlight_delete_confirm: 'Are you sure you want to delete this highlight?'
    },
    ar: {
        highlight_delete_title: 'Ã˜Â­Ã˜Â°Ã™Â Ã™â€žÃ™â€šÃ˜Â·Ã˜Â© Ã˜Â¨Ã˜Â§Ã˜Â±Ã˜Â²Ã˜Â©',
        highlight_delete_confirm: 'Ã™â€¡Ã™â€ž Ã˜Â£Ã™â€ Ã˜Âª Ã™â€¦Ã˜ÂªÃ˜Â£Ã™Æ’Ã˜Â¯ Ã˜Â£Ã™â€ Ã™Æ’ Ã˜ÂªÃ˜Â±Ã™Å Ã˜Â¯ Ã˜Â­Ã˜Â°Ã™Â Ã™â€¡Ã˜Â°Ã™â€¡ Ã˜Â§Ã™â€žÃ™â€žÃ™â€šÃ˜Â·Ã˜Â© Ã˜Â§Ã™â€žÃ˜Â¨Ã˜Â§Ã˜Â±Ã˜Â²Ã˜Â©Ã˜Å¸'
    },
    bn: {
        highlight_delete_title: 'Ã Â¦Â¹Ã Â¦Â¾Ã Â¦â€¡Ã Â¦Â²Ã Â¦Â¾Ã Â¦â€¡Ã Â¦Å¸ Ã Â¦Â®Ã Â§ÂÃ Â¦â€ºÃ Â§ÂÃ Â¦Â¨',
        highlight_delete_confirm: 'Ã Â¦â€ Ã Â¦ÂªÃ Â¦Â¨Ã Â¦Â¿ Ã Â¦â€¢Ã Â¦Â¿ Ã Â¦Â¨Ã Â¦Â¿Ã Â¦Â¶Ã Â§ÂÃ Â¦Å¡Ã Â¦Â¿Ã Â¦Â¤ Ã Â¦Â¯Ã Â§â€¡ Ã Â¦ÂÃ Â¦â€¡ Ã Â¦Â¹Ã Â¦Â¾Ã Â¦â€¡Ã Â¦Â²Ã Â¦Â¾Ã Â¦â€¡Ã Â¦Å¸Ã Â¦Å¸Ã Â¦Â¿ Ã Â¦Â®Ã Â§ÂÃ Â¦â€ºÃ Â¦Â¤Ã Â§â€¡ Ã Â¦Å¡Ã Â¦Â¾Ã Â¦Â¨?'
    },
    da: {
        highlight_delete_title: 'Slet hÃƒÂ¸jdepunkt',
        highlight_delete_confirm: 'Er du sikker pÃƒÂ¥, at du vil slette dette hÃƒÂ¸jdepunkt?'
    },
    de: {
        highlight_delete_title: 'Highlight lÃƒÂ¶schen',
        highlight_delete_confirm: 'MÃƒÂ¶chtest du dieses Highlight wirklich lÃƒÂ¶schen?'
    },
    fil: {
        highlight_delete_title: 'Tanggalin ang highlight',
        highlight_delete_confirm: 'Sigurado ka bang gusto mong tanggalin ang highlight na ito?'
    },
    fr: {
        highlight_delete_title: 'Supprimer le moment fort',
        highlight_delete_confirm: 'Voulez-vous vraiment supprimer ce moment fort ?'
    },
    hmn: {
        highlight_delete_title: 'Rho tawm highlight',
        highlight_delete_confirm: 'Koj puas paub tseeb tias koj xav rho tawm highlight no?'
    },
    id: {
        highlight_delete_title: 'Hapus sorotan',
        highlight_delete_confirm: 'Apakah Anda yakin ingin menghapus sorotan ini?'
    },
    it: {
        highlight_delete_title: 'Elimina evidenza',
        highlight_delete_confirm: 'Sei sicuro di voler eliminare questa evidenza?'
    },
    hu: {
        highlight_delete_title: 'KiemelÃƒÂ©s tÃƒÂ¶rlÃƒÂ©se',
        highlight_delete_confirm: 'Biztosan tÃƒÂ¶rÃƒÂ¶lni szeretnÃƒÂ©d ezt a kiemelÃƒÂ©st?'
    },
    ms: {
        highlight_delete_title: 'Padam sorotan',
        highlight_delete_confirm: 'Adakah anda pasti mahu memadam sorotan ini?'
    },
    nl: {
        highlight_delete_title: 'Hoogtepunt verwijderen',
        highlight_delete_confirm: 'Weet je zeker dat je dit hoogtepunt wilt verwijderen?'
    },
    no: {
        highlight_delete_title: 'Slett hÃƒÂ¸ydepunkt',
        highlight_delete_confirm: 'Er du sikker pÃƒÂ¥ at du vil slette dette hÃƒÂ¸ydepunktet?'
    },
    pl: {
        highlight_delete_title: 'UsuÃ…â€ž wyrÃƒÂ³Ã…Â¼nienie',
        highlight_delete_confirm: 'Czy na pewno chcesz usunÃ„â€¦Ã„â€¡ to wyrÃƒÂ³Ã…Â¼nienie?'
    },
    'pt-PT': {
        highlight_delete_title: 'Eliminar destaque',
        highlight_delete_confirm: 'Tem a certeza de que pretende eliminar este destaque?'
    },
    fi: {
        highlight_delete_title: 'Poista kohokohta',
        highlight_delete_confirm: 'Haluatko varmasti poistaa tÃƒÂ¤mÃƒÂ¤n kohokohdan?'
    },
    sv: {
        highlight_delete_title: 'Ta bort hÃƒÂ¶jdpunkt',
        highlight_delete_confirm: 'Ãƒâ€žr du sÃƒÂ¤ker pÃƒÂ¥ att du vill ta bort denna hÃƒÂ¶jdpunkt?'
    },
    vi: {
        highlight_delete_title: 'XÃƒÂ³a Ã„â€˜iÃ¡Â»Æ’m nÃ¡Â»â€¢i bÃ¡ÂºÂ­t',
        highlight_delete_confirm: 'BÃ¡ÂºÂ¡n cÃƒÂ³ chÃ¡ÂºÂ¯c chÃ¡ÂºÂ¯n muÃ¡Â»â€˜n xÃƒÂ³a Ã„â€˜iÃ¡Â»Æ’m nÃ¡Â»â€¢i bÃ¡ÂºÂ­t nÃƒÂ y khÃƒÂ´ng?'
    },
    tr: {
        highlight_delete_title: 'Ãƒâ€“ne ÃƒÂ§Ã„Â±kanÃ„Â± sil',
        highlight_delete_confirm: 'Bu ÃƒÂ¶ne ÃƒÂ§Ã„Â±kanÃ„Â± silmek istediÃ„Å¸inizden emin misiniz?'
    },
    zh: {
        highlight_delete_title: 'Ã¥Ë†Â Ã©â„¢Â¤Ã§Â²Â¾Ã¥Â½Â©Ã¦â€”Â¶Ã¥Ë†Â»',
        highlight_delete_confirm: 'Ã§Â¡Â®Ã¥Â®Å¡Ã¨Â¦ÂÃ¥Ë†Â Ã©â„¢Â¤Ã¨Â¿â„¢Ã¤Â¸ÂªÃ§Â²Â¾Ã¥Â½Â©Ã¦â€”Â¶Ã¥Ë†Â»Ã¥Ââ€”Ã¯Â¼Å¸'
    },
    ja: {
        highlight_delete_title: 'Ã£Æ’ÂÃ£â€šÂ¤Ã£Æ’Â©Ã£â€šÂ¤Ã£Æ’Ë†Ã£â€šâ€™Ã¥â€°Å Ã©â„¢Â¤',
        highlight_delete_confirm: 'Ã£Ââ€œÃ£ÂÂ®Ã£Æ’ÂÃ£â€šÂ¤Ã£Æ’Â©Ã£â€šÂ¤Ã£Æ’Ë†Ã£â€šâ€™Ã¥â€°Å Ã©â„¢Â¤Ã£Ââ€”Ã£ÂÂ¦Ã£â€šâ€šÃ£â€šË†Ã£â€šÂÃ£Ââ€”Ã£Ââ€žÃ£ÂÂ§Ã£Ââ„¢Ã£Ââ€¹Ã¯Â¼Å¸'
    },
    ko: {
        highlight_delete_title: 'Ã­â€¢ËœÃ¬ÂÂ´Ã«ÂÂ¼Ã¬ÂÂ´Ã­Å Â¸ Ã¬â€šÂ­Ã¬Â Å“',
        highlight_delete_confirm: 'Ã¬ÂÂ´ Ã­â€¢ËœÃ¬ÂÂ´Ã«ÂÂ¼Ã¬ÂÂ´Ã­Å Â¸Ã«Â¥Â¼ Ã¬â€šÂ­Ã¬Â Å“Ã­â€¢ËœÃ¬â€¹Å“ÃªÂ²Â Ã¬Å ÂµÃ«â€¹Ë†ÃªÂ¹Å’?'
    }
};
Object.keys(I18N_HIGHLIGHT_DELETE_PATCH).forEach((lang) => {
    I18N[lang] = { ...(I18N[lang] || {}), ...I18N_HIGHLIGHT_DELETE_PATCH[lang] };
});

const I18N_ACHIEVEMENT_VIEW_PROGRESS_PATCH = {
    en: { achievement_progress_view_prefix: '{name} has unlocked' },
    ar: { achievement_progress_view_prefix: '{name} Ã™â€šÃ˜Â§Ã™â€¦ Ã˜Â¨Ã™ÂÃ˜ÂªÃ˜Â­' },
    bn: { achievement_progress_view_prefix: '{name} Ã Â¦â€ Ã Â¦Â¨Ã Â¦Â²Ã Â¦â€¢ Ã Â¦â€¢Ã Â¦Â°Ã Â§â€¡Ã Â¦â€ºÃ Â§â€¡' },
    da: { achievement_progress_view_prefix: '{name} har lÃƒÂ¥st op' },
    de: { achievement_progress_view_prefix: '{name} hat freigeschaltet' },
    fil: { achievement_progress_view_prefix: '{name} ay naka-unlock ng' },
    fr: { achievement_progress_view_prefix: '{name} a dÃƒÂ©bloquÃƒÂ©' },
    hmn: { achievement_progress_view_prefix: '{name} tau qhib tau' },
    id: { achievement_progress_view_prefix: '{name} telah membuka' },
    it: { achievement_progress_view_prefix: '{name} ha sbloccato' },
    hu: { achievement_progress_view_prefix: '{name} feloldotta' },
    ms: { achievement_progress_view_prefix: '{name} telah membuka' },
    nl: { achievement_progress_view_prefix: '{name} heeft ontgrendeld' },
    no: { achievement_progress_view_prefix: '{name} har lÃƒÂ¥st opp' },
    pl: { achievement_progress_view_prefix: '{name} odblokowaÃ…â€š' },
    'pt-PT': { achievement_progress_view_prefix: '{name} desbloqueou' },
    fi: { achievement_progress_view_prefix: '{name} on avannut' },
    sv: { achievement_progress_view_prefix: '{name} har lÒ¥st upp' },
    vi: { achievement_progress_view_prefix: '{name} Ã„â€˜ÃƒÂ£ mÃ¡Â»Å¸ khÃƒÂ³a' },
    tr: { achievement_progress_view_prefix: '{name} kilidini aÒ§t�±' },
    zh: { achievement_progress_view_prefix: '{name} å·²è§£é⬝' },
    ja: { achievement_progress_view_prefix: '{name} Ã£ÂÅ’Ã¨Â§Â£Ã©â„¢Â¤Ã¦Â¸Ë†Ã£ÂÂ¿' },
    ko: { achievement_progress_view_prefix: '{name} ë⬹�Sì´ í⬢´ê¸� í⬢¨' }
};
Object.keys(I18N_ACHIEVEMENT_VIEW_PROGRESS_PATCH).forEach((lang) => {
    I18N[lang] = { ...(I18N[lang] || {}), ...I18N_ACHIEVEMENT_VIEW_PROGRESS_PATCH[lang] };
});

const I18N_ACTION_LABEL_PATCH = {
    en: {
        replace_image: 'Replace Image',
        password: 'Password',
        sent_requests_none: 'No sent requests.',
        center: 'Center',
        save: 'Save',
        cancel: 'Cancel',
        add: 'Add',
        remove: 'Remove',
        edit: 'Edit',
        drag_to_reorder: 'Drag to reorder'
    },
    ar: {
        replace_image: 'Ã˜Â§Ã˜Â³Ã˜ÂªÃ˜Â¨Ã˜Â¯Ã˜Â§Ã™â€ž Ã˜Â§Ã™â€žÃ˜ÂµÃ™Ë†Ã˜Â±Ã˜Â©',
        password: 'Ã™Æ’Ã™â€žÃ™â€¦Ã˜Â© Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â±Ã™Ë†Ã˜Â±',
        sent_requests_none: 'Ã™â€žÃ˜Â§ Ã˜ÂªÃ™Ë†Ã˜Â¬Ã˜Â¯ Ã˜Â·Ã™â€žÃ˜Â¨Ã˜Â§Ã˜Âª Ã™â€¦Ã˜Â±Ã˜Â³Ã™â€žÃ˜Â©.',
        center: 'Ã˜ÂªÃ™Ë†Ã˜Â³Ã™Å Ã˜Â·',
        save: 'Ã˜Â­Ã™ÂÃ˜Â¸',
        cancel: 'Ã˜Â¥Ã™â€žÃ˜ÂºÃ˜Â§Ã˜Â¡',
        add: 'Ã˜Â¥Ã˜Â¶Ã˜Â§Ã™ÂÃ˜Â©',
        remove: 'Ã˜Â¥Ã˜Â²Ã˜Â§Ã™â€žÃ˜Â©',
        edit: 'Ã˜ÂªÃ˜Â¹Ã˜Â¯Ã™Å Ã™â€ž',
        drag_to_reorder: 'Ã˜Â§Ã˜Â³Ã˜Â­Ã˜Â¨ Ã™â€žÃ˜Â¥Ã˜Â¹Ã˜Â§Ã˜Â¯Ã˜Â© Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â±Ã˜ÂªÃ™Å Ã˜Â¨'
    },
    bn: {
        replace_image: 'Ã Â¦â€ºÃ Â¦Â¬Ã Â¦Â¿ Ã Â¦ÂªÃ Â¦Â°Ã Â¦Â¿Ã Â¦Â¬Ã Â¦Â°Ã Â§ÂÃ Â¦Â¤Ã Â¦Â¨ Ã Â¦â€¢Ã Â¦Â°Ã Â§ÂÃ Â¦Â¨',
        password: 'Ã Â¦ÂªÃ Â¦Â¾Ã Â¦Â¸Ã Â¦â€œÃ Â¦Â¯Ã Â¦Â¼Ã Â¦Â¾Ã Â¦Â°Ã Â§ÂÃ Â¦Â¡',
        sent_requests_none: 'Ã Â¦â€¢Ã Â§â€¹Ã Â¦Â¨Ã Â¦â€œ Ã Â¦ÂªÃ Â¦Â¾Ã Â¦Â Ã Â¦Â¾Ã Â¦Â¨Ã Â§â€¹ Ã Â¦â€¦Ã Â¦Â¨Ã Â§ÂÃ Â¦Â°Ã Â§â€¹Ã Â¦Â§ Ã Â¦Â¨Ã Â§â€¡Ã Â¦â€¡Ã Â¥Â¤',
        center: 'Ã Â¦Â®Ã Â¦Â¾Ã Â¦ÂÃ Â§â€¡ Ã Â¦â€ Ã Â¦Â¨Ã Â§ÂÃ Â¦Â¨',
        save: 'Ã Â¦Â¸Ã Â¦â€šÃ Â¦Â°Ã Â¦â€¢Ã Â§ÂÃ Â¦Â·Ã Â¦Â£ Ã Â¦â€¢Ã Â¦Â°Ã Â§ÂÃ Â¦Â¨',
        cancel: 'Ã Â¦Â¬Ã Â¦Â¾Ã Â¦Â¤Ã Â¦Â¿Ã Â¦Â²',
        add: 'Ã Â¦Â¯Ã Â§â€¹Ã Â¦â€” Ã Â¦â€¢Ã Â¦Â°Ã Â§ÂÃ Â¦Â¨',
        remove: 'Ã Â¦Â¸Ã Â¦Â°Ã Â¦Â¾Ã Â¦Â¨',
        edit: 'Ã Â¦Â¸Ã Â¦Â®Ã Â§ÂÃ Â¦ÂªÃ Â¦Â¾Ã Â¦Â¦Ã Â¦Â¨Ã Â¦Â¾',
        drag_to_reorder: 'Ã Â¦ÂªÃ Â§ÂÃ Â¦Â¨Ã Â¦Â°Ã Â§ÂÃ Â¦Â¬Ã Â¦Â¿Ã Â¦Â¨Ã Â§ÂÃ Â¦Â¯Ã Â¦Â¾Ã Â¦Â¸ Ã Â¦â€¢Ã Â¦Â°Ã Â¦Â¤Ã Â§â€¡ Ã Â¦Å¸Ã Â§â€¡Ã Â¦Â¨Ã Â§â€¡ Ã Â¦â€ Ã Â¦Â¨Ã Â§ÂÃ Â¦Â¨'
    },
    da: {
        replace_image: 'Udskift billede',
        password: 'Adgangskode',
        sent_requests_none: 'Ingen sendte anmodninger.',
        center: 'Centrer',
        save: 'Gem',
        cancel: 'Annuller',
        add: 'TilfÃƒÂ¸j',
        remove: 'Fjern',
        edit: 'Rediger',
        drag_to_reorder: 'TrÃƒÂ¦k for at omarrangere'
    },
    de: {
        replace_image: 'Bild ersetzen',
        password: 'Passwort',
        sent_requests_none: 'Keine gesendeten Anfragen.',
        center: 'Zentrieren',
        save: 'Speichern',
        cancel: 'Abbrechen',
        add: 'HinzufÃƒÂ¼gen',
        remove: 'Entfernen',
        edit: 'Bearbeiten',
        drag_to_reorder: 'Zum Neuanordnen ziehen'
    },
    fil: {
        replace_image: 'Palitan ang larawan',
        password: 'Password',
        sent_requests_none: 'Walang naipadalang request.',
        center: 'Igitna',
        save: 'I-save',
        cancel: 'Kanselahin',
        add: 'Idagdag',
        remove: 'Alisin',
        edit: 'I-edit',
        drag_to_reorder: 'I-drag para ayusin ang pagkakasunod-sunod'
    },
    fr: {
        replace_image: 'Remplacer l\'image',
        password: 'Mot de passe',
        sent_requests_none: 'Aucune demande envoyÃƒÂ©e.',
        center: 'Centrer',
        save: 'Enregistrer',
        cancel: 'Annuler',
        add: 'Ajouter',
        remove: 'Supprimer',
        edit: 'Modifier',
        drag_to_reorder: 'Faites glisser pour rÃƒÂ©organiser'
    },
    hmn: {
        replace_image: 'Hloov daim duab',
        password: 'Lo lus zais',
        sent_requests_none: 'Tsis muaj kev thov xa.',
        center: 'Nruab nrab',
        save: 'Txuag',
        cancel: 'Ncua tseg',
        add: 'Ntxiv',
        remove: 'Tshem',
        edit: 'Kho',
        drag_to_reorder: 'Luag los rov teem'
    },
    id: {
        replace_image: 'Ganti gambar',
        password: 'Kata sandi',
        sent_requests_none: 'Tidak ada permintaan terkirim.',
        center: 'Tengah',
        save: 'Simpan',
        cancel: 'Batal',
        add: 'Tambah',
        remove: 'Hapus',
        edit: 'Edit',
        drag_to_reorder: 'Seret untuk mengurutkan ulang'
    },
    it: {
        replace_image: 'Sostituisci immagine',
        password: 'Password',
        sent_requests_none: 'Nessuna richiesta inviata.',
        center: 'Centra',
        save: 'Salva',
        cancel: 'Annulla',
        add: 'Aggiungi',
        remove: 'Rimuovi',
        edit: 'Modifica',
        drag_to_reorder: 'Trascina per riordinare'
    },
    hu: {
        replace_image: 'KÃƒÂ©p cserÃƒÂ©je',
        password: 'JelszÃƒÂ³',
        sent_requests_none: 'Nincs elkÃƒÂ¼ldÃƒÂ¶tt kÃƒÂ©rÃƒÂ©s.',
        center: 'KÃƒÂ¶zÃƒÂ©pre',
        save: 'MentÃƒÂ©s',
        cancel: 'MÃƒÂ©gse',
        add: 'HozzÃƒÂ¡adÃƒÂ¡s',
        remove: 'EltÃƒÂ¡volÃƒÂ­tÃƒÂ¡s',
        edit: 'SzerkesztÃƒÂ©s',
        drag_to_reorder: 'HÃƒÂºzd az ÃƒÂ¡trendezÃƒÂ©shez'
    },
    ms: {
        replace_image: 'Gantikan imej',
        password: 'Kata laluan',
        sent_requests_none: 'Tiada permintaan dihantar.',
        center: 'Tengah',
        save: 'Simpan',
        cancel: 'Batal',
        add: 'Tambah',
        remove: 'Buang',
        edit: 'Edit',
        drag_to_reorder: 'Seret untuk susun semula'
    },
    nl: {
        replace_image: 'Afbeelding vervangen',
        password: 'Wachtwoord',
        sent_requests_none: 'Geen verzonden verzoeken.',
        center: 'Centreren',
        save: 'Opslaan',
        cancel: 'Annuleren',
        add: 'Toevoegen',
        remove: 'Verwijderen',
        edit: 'Bewerken',
        drag_to_reorder: 'Sleep om opnieuw te ordenen'
    },
    no: {
        replace_image: 'Bytt bilde',
        password: 'Passord',
        sent_requests_none: 'Ingen sendte forespÃƒÂ¸rsler.',
        center: 'Sentrer',
        save: 'Lagre',
        cancel: 'Avbryt',
        add: 'Legg til',
        remove: 'Fjern',
        edit: 'Rediger',
        drag_to_reorder: 'Dra for ÃƒÂ¥ omorganisere'
    },
    pl: {
        replace_image: 'ZastÃ„â€¦p obraz',
        password: 'HasÃ…â€šo',
        sent_requests_none: 'Brak wysÃ…â€šanych prÃƒÂ³Ã…â€ºb.',
        center: 'WyÃ…â€ºrodkuj',
        save: 'Zapisz',
        cancel: 'Anuluj',
        add: 'Dodaj',
        remove: 'UsuÃ…â€ž',
        edit: 'Edytuj',
        drag_to_reorder: 'PrzeciÃ„â€¦gnij, aby zmieniÃ„â€¡ kolejnoÃ…â€ºÃ„â€¡'
    },
    'pt-PT': {
        replace_image: 'Substituir imagem',
        password: 'Palavra-passe',
        sent_requests_none: 'Sem pedidos enviados.',
        center: 'Centrar',
        save: 'Guardar',
        cancel: 'Cancelar',
        add: 'Adicionar',
        remove: 'Remover',
        edit: 'Editar',
        drag_to_reorder: 'Arraste para reordenar'
    },
    fi: {
        replace_image: 'Vaihda kuva',
        password: 'Salasana',
        sent_requests_none: 'Ei lÃƒÂ¤hetettyjÃƒÂ¤ pyyntÃƒÂ¶jÃƒÂ¤.',
        center: 'KeskitÃƒÂ¤',
        save: 'Tallenna',
        cancel: 'Peruuta',
        add: 'LisÃƒÂ¤ÃƒÂ¤',
        remove: 'Poista',
        edit: 'Muokkaa',
        drag_to_reorder: 'VedÃƒÂ¤ jÃƒÂ¤rjestÃƒÂ¤ÃƒÂ¤ksesi uudelleen'
    },
    sv: {
        replace_image: 'Byt bild',
        password: 'LÃƒÂ¶senord',
        sent_requests_none: 'Inga skickade fÃƒÂ¶rfrÃƒÂ¥gningar.',
        center: 'Centrera',
        save: 'Spara',
        cancel: 'Avbryt',
        add: 'LÃƒÂ¤gg till',
        remove: 'Ta bort',
        edit: 'Redigera',
        drag_to_reorder: 'Dra fÃƒÂ¶r att ordna om'
    },
    vi: {
        replace_image: 'Thay Ã¡ÂºÂ£nh',
        password: 'MÃ¡ÂºÂ­t khÃ¡ÂºÂ©u',
        sent_requests_none: 'KhÃƒÂ´ng cÃƒÂ³ lÃ¡Â»Âi mÃ¡Â»Âi Ã„â€˜ÃƒÂ£ gÃ¡Â»Â­i.',
        center: 'CÃ„Æ’n giÃ¡Â»Â¯a',
        save: 'LÃ†Â°u',
        cancel: 'HÃ¡Â»Â§y',
        add: 'ThÃƒÂªm',
        remove: 'XÃƒÂ³a',
        edit: 'ChÃ¡Â»â€°nh sÃ¡Â»Â­a',
        drag_to_reorder: 'KÃƒÂ©o Ã„â€˜Ã¡Â»Æ’ sÃ¡ÂºÂ¯p xÃ¡ÂºÂ¿p lÃ¡ÂºÂ¡i'
    },
    tr: {
        replace_image: 'GÃƒÂ¶rseli deÃ„Å¸iÃ…Å¸tir',
        password: 'Ã…Å¾ifre',
        sent_requests_none: 'GÃƒÂ¶nderilen istek yok.',
        center: 'Ortala',
        save: 'Kaydet',
        cancel: 'Ã„Â°ptal',
        add: 'Ekle',
        remove: 'KaldÃ„Â±r',
        edit: 'DÃƒÂ¼zenle',
        drag_to_reorder: 'Yeniden sÃ„Â±ralamak iÃƒÂ§in sÃƒÂ¼rÃƒÂ¼kleyin'
    },
    zh: {
        replace_image: 'Ã¦â€ºÂ¿Ã¦ÂÂ¢Ã¥â€ºÂ¾Ã§â€°â€¡',
        password: 'Ã¥Â¯â€ Ã§Â Â',
        sent_requests_none: 'Ã¦Å¡â€šÃ¦â€”Â Ã¥Â·Â²Ã¥Ââ€˜Ã©â‚¬ÂÃ¨Â¯Â·Ã¦Â±â€šÃ£â‚¬â€š',
        center: 'Ã¥Â±â€¦Ã¤Â¸Â­',
        save: 'Ã¤Â¿ÂÃ¥Â­Ëœ',
        cancel: 'Ã¥Ââ€“Ã¦Â¶Ë†',
        add: 'Ã¦Â·Â»Ã¥Å Â ',
        remove: 'Ã§Â§Â»Ã©â„¢Â¤',
        edit: 'Ã§Â¼â€“Ã¨Â¾â€˜',
        drag_to_reorder: 'Ã¦â€¹â€“Ã¥Å Â¨Ã¤Â»Â¥Ã©â€¡ÂÃ¦â€“Â°Ã¦Å½â€™Ã¥ÂºÂ'
    },
    ja: {
        replace_image: 'Ã§â€Â»Ã¥Æ’ÂÃ£â€šâ€™Ã¥Â·Â®Ã£Ââ€”Ã¦â€ºÂ¿Ã£ÂË†',
        password: 'Ã£Æ’â€˜Ã£â€šÂ¹Ã£Æ’Â¯Ã£Æ’Â¼Ã£Æ’â€°',
        sent_requests_none: 'Ã©â‚¬ÂÃ¤Â¿Â¡Ã¦Â¸Ë†Ã£ÂÂ¿Ã£Æ’ÂªÃ£â€šÂ¯Ã£â€šÂ¨Ã£â€šÂ¹Ã£Æ’Ë†Ã£ÂÂ¯Ã£Ââ€šÃ£â€šÅ Ã£ÂÂ¾Ã£Ââ€ºÃ£â€šâ€œÃ£â‚¬â€š',
        center: 'Ã¤Â¸Â­Ã¥Â¤Â®Ã¦ÂÆ’Ã£ÂË†',
        save: 'Ã¤Â¿ÂÃ¥Â­Ëœ',
        cancel: 'Ã£â€šÂ­Ã£Æ’Â£Ã£Æ’Â³Ã£â€šÂ»Ã£Æ’Â«',
        add: 'Ã¨Â¿Â½Ã¥Å Â ',
        remove: 'Ã¥â€°Å Ã©â„¢Â¤',
        edit: 'Ã§Â·Â¨Ã©â€ºâ€ ',
        drag_to_reorder: 'Ã£Æ’â€°Ã£Æ’Â©Ã£Æ’Æ’Ã£â€šÂ°Ã£Ââ€”Ã£ÂÂ¦Ã¤Â¸Â¦Ã£ÂÂ¹Ã¦â€ºÂ¿Ã£ÂË†'
    },
    ko: {
        replace_image: 'Ã¬ÂÂ´Ã«Â¯Â¸Ã¬Â§â‚¬ ÃªÂµÂÃ¬Â²Â´',
        password: 'Ã«Â¹â€žÃ«Â°â‚¬Ã«Â²Ë†Ã­ËœÂ¸',
        sent_requests_none: 'Ã«Â³Â´Ã«â€šÂ¸ Ã¬Å¡â€Ã¬Â²Â­Ã¬ÂÂ´ Ã¬â€”â€ Ã¬Å ÂµÃ«â€¹Ë†Ã«â€¹Â¤.',
        center: 'ÃªÂ°â‚¬Ã¬Å¡Â´Ã«ÂÂ° Ã¬Â â€¢Ã«Â Â¬',
        save: 'Ã¬Â â‚¬Ã¬Å¾Â¥',
        cancel: 'Ã¬Â·Â¨Ã¬â€ Å’',
        add: 'Ã¬Â¶â€ÃªÂ°â‚¬',
        remove: 'Ã¬â€šÂ­Ã¬Â Å“',
        edit: 'Ã­Å½Â¸Ã¬Â§â€˜',
        drag_to_reorder: 'Ã«â€œÅ“Ã«Å¾ËœÃªÂ·Â¸Ã­â€¢ËœÃ¬â€”Â¬ Ã¬Ë†Å“Ã¬â€žÅ“ Ã«Â³â‚¬ÃªÂ²Â½'
    }
};
Object.keys(I18N_ACTION_LABEL_PATCH).forEach((lang) => {
    I18N[lang] = { ...(I18N[lang] || {}), ...I18N_ACTION_LABEL_PATCH[lang] };
});

const I18N_VIEWS_LABEL_PATCH = {
    en: { views_label: 'Views' },
    ar: { views_label: 'Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â´Ã˜Â§Ã™â€¡Ã˜Â¯Ã˜Â§Ã˜Âª' },
    bn: { views_label: 'Ã Â¦Â­Ã Â¦Â¿Ã Â¦â€°' },
    da: { views_label: 'Visninger' },
    de: { views_label: 'Aufrufe' },
    fil: { views_label: 'Mga view' },
    fr: { views_label: 'Vues' },
    hmn: { views_label: 'Kev saib' },
    id: { views_label: 'Tampilan' },
    it: { views_label: 'Visualizzazioni' },
    hu: { views_label: 'MegtekintÃƒÂ©sek' },
    ms: { views_label: 'Paparan' },
    nl: { views_label: 'Weergaven' },
    no: { views_label: 'Visninger' },
    pl: { views_label: 'WyÃ…â€ºwietlenia' },
    'pt-PT': { views_label: 'Visualiza\u00E7\u00F5es' },
    fi: { views_label: 'NÒ¤yttÒ¶kerrat' },
    sv: { views_label: 'Visningar' },
    vi: { views_label: 'L� °á»£t xem' },
    tr: { views_label: 'GÒ¶rÒ¼ntÒ¼lemeler' },
    zh: { views_label: 'æŸ¥ç�⬹é⬡' },
    ja: { views_label: 'é�²è¦§æ⬢°' },
    ko: { views_label: 'Ã¬Â¡Â°Ã­Å¡Å’Ã¬Ë†Ëœ' }
};
Object.keys(I18N_VIEWS_LABEL_PATCH).forEach((lang) => {
    I18N[lang] = { ...(I18N[lang] || {}), ...I18N_VIEWS_LABEL_PATCH[lang] };
});

const I18N_EMAIL_REAUTH_PATCH = {
    en: {
        profile_email_verification_sent: 'Verification email sent to {email}. Please check your inbox or spam folder.',
        verification_email_sent_to: 'Verification email sent to {email}',
        reauth_password_required: 'Password is required.',
        reauth_verifying: 'Verifying...',
        reauth_confirm: 'Confirm',
        reauth_title: 'Re-authentication Required',
        reauth_subtitle: 'Please enter your password to continue.',
        reauth_current_password: 'Current Password',
        reauth_failed_prefix: 'Re-authentication failed: '
    },
    ar: {
        profile_email_verification_sent: 'Ã˜ÂªÃ™â€¦ Ã˜Â¥Ã˜Â±Ã˜Â³Ã˜Â§Ã™â€ž Ã˜Â¨Ã˜Â±Ã™Å Ã˜Â¯ Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â­Ã™â€šÃ™â€š Ã˜Â¥Ã™â€žÃ™â€° {email}. Ã™Å Ã˜Â±Ã˜Â¬Ã™â€° Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â­Ã™â€šÃ™â€š Ã™â€¦Ã™â€  Ã˜ÂµÃ™â€ Ã˜Â¯Ã™Ë†Ã™â€š Ã˜Â§Ã™â€žÃ™Ë†Ã˜Â§Ã˜Â±Ã˜Â¯ Ã˜Â£Ã™Ë† Ã˜Â§Ã™â€žÃ˜Â¨Ã˜Â±Ã™Å Ã˜Â¯ Ã˜Â§Ã™â€žÃ˜Â¹Ã˜Â´Ã™Ë†Ã˜Â§Ã˜Â¦Ã™Å .',
        verification_email_sent_to: 'Ã˜ÂªÃ™â€¦ Ã˜Â¥Ã˜Â±Ã˜Â³Ã˜Â§Ã™â€ž Ã˜Â¨Ã˜Â±Ã™Å Ã˜Â¯ Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â­Ã™â€šÃ™â€š Ã˜Â¥Ã™â€žÃ™â€° {email}',
        reauth_password_required: 'Ã™Æ’Ã™â€žÃ™â€¦Ã˜Â© Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â±Ã™Ë†Ã˜Â± Ã™â€¦Ã˜Â·Ã™â€žÃ™Ë†Ã˜Â¨Ã˜Â©.',
        reauth_verifying: 'Ã˜Â¬Ã˜Â§Ã˜Â±Ã™Â Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â­Ã™â€šÃ™â€š...',
        reauth_confirm: 'Ã˜ÂªÃ˜Â£Ã™Æ’Ã™Å Ã˜Â¯',
        reauth_title: 'Ã˜Â¥Ã˜Â¹Ã˜Â§Ã˜Â¯Ã˜Â© Ã˜Â§Ã™â€žÃ™â€¦Ã˜ÂµÃ˜Â§Ã˜Â¯Ã™â€šÃ˜Â© Ã™â€¦Ã˜Â·Ã™â€žÃ™Ë†Ã˜Â¨Ã˜Â©',
        reauth_subtitle: 'Ã™Å Ã˜Â±Ã˜Â¬Ã™â€° Ã˜Â¥Ã˜Â¯Ã˜Â®Ã˜Â§Ã™â€ž Ã™Æ’Ã™â€žÃ™â€¦Ã˜Â© Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â±Ã™Ë†Ã˜Â± Ã™â€žÃ™â€žÃ™â€¦Ã˜ÂªÃ˜Â§Ã˜Â¨Ã˜Â¹Ã˜Â©.',
        reauth_current_password: 'Ã™Æ’Ã™â€žÃ™â€¦Ã˜Â© Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â±Ã™Ë†Ã˜Â± Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â§Ã™â€žÃ™Å Ã˜Â©',
        reauth_failed_prefix: 'Ã™ÂÃ˜Â´Ã™â€žÃ˜Âª Ã˜Â¥Ã˜Â¹Ã˜Â§Ã˜Â¯Ã˜Â© Ã˜Â§Ã™â€žÃ™â€¦Ã˜ÂµÃ˜Â§Ã˜Â¯Ã™â€šÃ˜Â©: '
    },
    bn: {
        profile_email_verification_sent: '{email} Ã Â¦Â Ã Â¦Â­Ã Â§â€¡Ã Â¦Â°Ã Â¦Â¿Ã Â¦Â«Ã Â¦Â¿Ã Â¦â€¢Ã Â§â€¡Ã Â¦Â¶Ã Â¦Â¨ Ã Â¦â€¡Ã Â¦Â®Ã Â§â€¡Ã Â¦â€¡Ã Â¦Â² Ã Â¦ÂªÃ Â¦Â¾Ã Â¦Â Ã Â¦Â¾Ã Â¦Â¨Ã Â§â€¹ Ã Â¦Â¹Ã Â¦Â¯Ã Â¦Â¼Ã Â§â€¡Ã Â¦â€ºÃ Â§â€¡Ã Â¥Â¤ Ã Â¦â€ Ã Â¦ÂªÃ Â¦Â¨Ã Â¦Â¾Ã Â¦Â° Ã Â¦â€¡Ã Â¦Â¨Ã Â¦Â¬Ã Â¦â€¢Ã Â§ÂÃ Â¦Â¸ Ã Â¦Â¬Ã Â¦Â¾ Ã Â¦Â¸Ã Â§ÂÃ Â¦ÂªÃ Â§ÂÃ Â¦Â¯Ã Â¦Â¾Ã Â¦Â® Ã Â¦Â«Ã Â§â€¹Ã Â¦Â²Ã Â§ÂÃ Â¦Â¡Ã Â¦Â¾Ã Â¦Â° Ã Â¦Â¦Ã Â§â€¡Ã Â¦â€“Ã Â§ÂÃ Â¦Â¨Ã Â¥Â¤',
        verification_email_sent_to: '{email} Ã Â¦Â Ã Â¦Â­Ã Â§â€¡Ã Â¦Â°Ã Â¦Â¿Ã Â¦Â«Ã Â¦Â¿Ã Â¦â€¢Ã Â§â€¡Ã Â¦Â¶Ã Â¦Â¨ Ã Â¦â€¡Ã Â¦Â®Ã Â§â€¡Ã Â¦â€¡Ã Â¦Â² Ã Â¦ÂªÃ Â¦Â¾Ã Â¦Â Ã Â¦Â¾Ã Â¦Â¨Ã Â§â€¹ Ã Â¦Â¹Ã Â¦Â¯Ã Â¦Â¼Ã Â§â€¡Ã Â¦â€ºÃ Â§â€¡',
        reauth_password_required: 'Ã Â¦ÂªÃ Â¦Â¾Ã Â¦Â¸Ã Â¦â€œÃ Â¦Â¯Ã Â¦Â¼Ã Â¦Â¾Ã Â¦Â°Ã Â§ÂÃ Â¦Â¡ Ã Â¦ÂªÃ Â§ÂÃ Â¦Â°Ã Â¦Â¯Ã Â¦Â¼Ã Â§â€¹Ã Â¦Å“Ã Â¦Â¨Ã Â¥Â¤',
        reauth_verifying: 'Ã Â¦Â¯Ã Â¦Â¾Ã Â¦Å¡Ã Â¦Â¾Ã Â¦â€¡ Ã Â¦â€¢Ã Â¦Â°Ã Â¦Â¾ Ã Â¦Â¹Ã Â¦Å¡Ã Â§ÂÃ Â¦â€ºÃ Â§â€¡...',
        reauth_confirm: 'Ã Â¦Â¨Ã Â¦Â¿Ã Â¦Â¶Ã Â§ÂÃ Â¦Å¡Ã Â¦Â¿Ã Â¦Â¤ Ã Â¦â€¢Ã Â¦Â°Ã Â§ÂÃ Â¦Â¨',
        reauth_title: 'Ã Â¦ÂªÃ Â§ÂÃ Â¦Â¨Ã Â¦Æ’Ã Â¦ÂªÃ Â§ÂÃ Â¦Â°Ã Â¦Â®Ã Â¦Â¾Ã Â¦Â£Ã Â§â‚¬Ã Â¦â€¢Ã Â¦Â°Ã Â¦Â£ Ã Â¦ÂªÃ Â§ÂÃ Â¦Â°Ã Â¦Â¯Ã Â¦Â¼Ã Â§â€¹Ã Â¦Å“Ã Â¦Â¨',
        reauth_subtitle: 'Ã Â¦Å¡Ã Â¦Â¾Ã Â¦Â²Ã Â¦Â¿Ã Â¦Â¯Ã Â¦Â¼Ã Â§â€¡ Ã Â¦Â¯Ã Â§â€¡Ã Â¦Â¤Ã Â§â€¡ Ã Â¦â€ Ã Â¦ÂªÃ Â¦Â¨Ã Â¦Â¾Ã Â¦Â° Ã Â¦ÂªÃ Â¦Â¾Ã Â¦Â¸Ã Â¦â€œÃ Â¦Â¯Ã Â¦Â¼Ã Â¦Â¾Ã Â¦Â°Ã Â§ÂÃ Â¦Â¡ Ã Â¦Â²Ã Â¦Â¿Ã Â¦â€“Ã Â§ÂÃ Â¦Â¨Ã Â¥Â¤',
        reauth_current_password: 'Ã Â¦Â¬Ã Â¦Â°Ã Â§ÂÃ Â¦Â¤Ã Â¦Â®Ã Â¦Â¾Ã Â¦Â¨ Ã Â¦ÂªÃ Â¦Â¾Ã Â¦Â¸Ã Â¦â€œÃ Â¦Â¯Ã Â¦Â¼Ã Â¦Â¾Ã Â¦Â°Ã Â§ÂÃ Â¦Â¡',
        reauth_failed_prefix: 'Ã Â¦ÂªÃ Â§ÂÃ Â¦Â¨Ã Â¦Æ’Ã Â¦ÂªÃ Â§ÂÃ Â¦Â°Ã Â¦Â®Ã Â¦Â¾Ã Â¦Â£Ã Â§â‚¬Ã Â¦â€¢Ã Â¦Â°Ã Â¦Â£ Ã Â¦Â¬Ã Â§ÂÃ Â¦Â¯Ã Â¦Â°Ã Â§ÂÃ Â¦Â¥: '
    },
    da: {
        profile_email_verification_sent: 'BekrÃƒÂ¦ftelsesmail sendt til {email}. Tjek din indbakke eller spammappe.',
        verification_email_sent_to: 'BekrÃƒÂ¦ftelsesmail sendt til {email}',
        reauth_password_required: 'Adgangskode er pÃƒÂ¥krÃƒÂ¦vet.',
        reauth_verifying: 'BekrÃƒÂ¦fter...',
        reauth_confirm: 'BekrÃƒÂ¦ft',
        reauth_title: 'GenbekrÃƒÂ¦ftelse pÃƒÂ¥krÃƒÂ¦vet',
        reauth_subtitle: 'Indtast din adgangskode for at fortsÃƒÂ¦tte.',
        reauth_current_password: 'NuvÃƒÂ¦rende adgangskode',
        reauth_failed_prefix: 'GenbekrÃƒÂ¦ftelse mislykkedes: '
    },
    de: {
        profile_email_verification_sent: 'BestÃƒÂ¤tigungs-E-Mail wurde an {email} gesendet. Bitte prÃƒÂ¼fe deinen Posteingang oder Spam-Ordner.',
        verification_email_sent_to: 'BestÃƒÂ¤tigungs-E-Mail wurde an {email} gesendet',
        reauth_password_required: 'Passwort ist erforderlich.',
        reauth_verifying: 'Wird ÃƒÂ¼berprÃƒÂ¼ft...',
        reauth_confirm: 'BestÃƒÂ¤tigen',
        reauth_title: 'Erneute Authentifizierung erforderlich',
        reauth_subtitle: 'Bitte gib dein Passwort ein, um fortzufahren.',
        reauth_current_password: 'Aktuelles Passwort',
        reauth_failed_prefix: 'Erneute Authentifizierung fehlgeschlagen: '
    },
    fil: {
        profile_email_verification_sent: 'Naipadala na ang verification email sa {email}. Pakitingnan ang iyong inbox o spam folder.',
        verification_email_sent_to: 'Naipadala na ang verification email sa {email}',
        reauth_password_required: 'Kailangan ang password.',
        reauth_verifying: 'Vini-verify...',
        reauth_confirm: 'Kumpirmahin',
        reauth_title: 'Kailangan ang re-authentication',
        reauth_subtitle: 'Ilagay ang password mo para magpatuloy.',
        reauth_current_password: 'Kasalukuyang password',
        reauth_failed_prefix: 'Nabigo ang re-authentication: '
    },
    fr: {
        profile_email_verification_sent: 'E-mail de vÃƒÂ©rification envoyÃƒÂ© ÃƒÂ  {email}. Veuillez vÃƒÂ©rifier votre boÃƒÂ®te de rÃƒÂ©ception ou vos spams.',
        verification_email_sent_to: 'E-mail de vÃƒÂ©rification envoyÃƒÂ© ÃƒÂ  {email}',
        reauth_password_required: 'Le mot de passe est requis.',
        reauth_verifying: 'VÃƒÂ©rification...',
        reauth_confirm: 'Confirmer',
        reauth_title: 'RÃƒÂ©authentification requise',
        reauth_subtitle: 'Veuillez saisir votre mot de passe pour continuer.',
        reauth_current_password: 'Mot de passe actuel',
        reauth_failed_prefix: 'Ãƒâ€°chec de la rÃƒÂ©authentification : '
    },
    hmn: {
        profile_email_verification_sent: 'Xa email txheeb xyuas rau {email}. Thov xyuas koj inbox lossis spam folder.',
        verification_email_sent_to: 'Xa email txheeb xyuas rau {email}',
        reauth_password_required: 'Yuav tsum muaj lo lus zais.',
        reauth_verifying: 'Tab tom txheeb xyuas...',
        reauth_confirm: 'Paub meej',
        reauth_title: 'Yuav tsum rov txheeb xyuas',
        reauth_subtitle: 'Thov sau koj lo lus zais kom txuas ntxiv.',
        reauth_current_password: 'Lo lus zais tam sim no',
        reauth_failed_prefix: 'Rov txheeb xyuas tsis ua tiav: '
    },
    id: {
        profile_email_verification_sent: 'Email verifikasi telah dikirim ke {email}. Silakan periksa kotak masuk atau folder spam Anda.',
        verification_email_sent_to: 'Email verifikasi telah dikirim ke {email}',
        reauth_password_required: 'Kata sandi diperlukan.',
        reauth_verifying: 'Memverifikasi...',
        reauth_confirm: 'Konfirmasi',
        reauth_title: 'Autentikasi ulang diperlukan',
        reauth_subtitle: 'Masukkan kata sandi Anda untuk melanjutkan.',
        reauth_current_password: 'Kata sandi saat ini',
        reauth_failed_prefix: 'Autentikasi ulang gagal: '
    },
    it: {
        profile_email_verification_sent: 'Email di verifica inviata a {email}. Controlla la posta in arrivo o la cartella spam.',
        verification_email_sent_to: 'Email di verifica inviata a {email}',
        reauth_password_required: 'La password ÃƒÂ¨ obbligatoria.',
        reauth_verifying: 'Verifica in corso...',
        reauth_confirm: 'Conferma',
        reauth_title: 'Ri-autenticazione richiesta',
        reauth_subtitle: 'Inserisci la tua password per continuare.',
        reauth_current_password: 'Password attuale',
        reauth_failed_prefix: 'Ri-autenticazione non riuscita: '
    },
    hu: {
        profile_email_verification_sent: 'EllenÃ…â€˜rzÃ…â€˜ e-mail elkÃƒÂ¼ldve ide: {email}. KÃƒÂ©rjÃƒÂ¼k, ellenÃ…â€˜rizd a beÃƒÂ©rkezett leveleket vagy a spam mappÃƒÂ¡t.',
        verification_email_sent_to: 'EllenÃ…â€˜rzÃ…â€˜ e-mail elkÃƒÂ¼ldve ide: {email}',
        reauth_password_required: 'JelszÃƒÂ³ szÃƒÂ¼ksÃƒÂ©ges.',
        reauth_verifying: 'EllenÃ…â€˜rzÃƒÂ©s...',
        reauth_confirm: 'MegerÃ…â€˜sÃƒÂ­tÃƒÂ©s',
        reauth_title: 'ÃƒÅ¡jrahitelesÃƒÂ­tÃƒÂ©s szÃƒÂ¼ksÃƒÂ©ges',
        reauth_subtitle: 'A folytatÃƒÂ¡shoz add meg a jelszavadat.',
        reauth_current_password: 'Jelenlegi jelszÃƒÂ³',
        reauth_failed_prefix: 'Az ÃƒÂºjrahitelesÃƒÂ­tÃƒÂ©s sikertelen: '
    },
    ms: {
        profile_email_verification_sent: 'E-mel pengesahan telah dihantar ke {email}. Sila semak peti masuk atau folder spam anda.',
        verification_email_sent_to: 'E-mel pengesahan telah dihantar ke {email}',
        reauth_password_required: 'Kata laluan diperlukan.',
        reauth_verifying: 'Mengesahkan...',
        reauth_confirm: 'Sahkan',
        reauth_title: 'Pengesahan semula diperlukan',
        reauth_subtitle: 'Sila masukkan kata laluan anda untuk meneruskan.',
        reauth_current_password: 'Kata laluan semasa',
        reauth_failed_prefix: 'Pengesahan semula gagal: '
    },
    nl: {
        profile_email_verification_sent: 'Verificatie-e-mail verzonden naar {email}. Controleer je inbox of spammap.',
        verification_email_sent_to: 'Verificatie-e-mail verzonden naar {email}',
        reauth_password_required: 'Wachtwoord is verplicht.',
        reauth_verifying: 'VerifiÃƒÂ«ren...',
        reauth_confirm: 'Bevestigen',
        reauth_title: 'Opnieuw aanmelden vereist',
        reauth_subtitle: 'Voer je wachtwoord in om door te gaan.',
        reauth_current_password: 'Huidig wachtwoord',
        reauth_failed_prefix: 'Opnieuw aanmelden mislukt: '
    },
    no: {
        profile_email_verification_sent: 'Bekreftelses-e-post sendt til {email}. Sjekk innboksen eller sÃƒÂ¸ppelpost.',
        verification_email_sent_to: 'Bekreftelses-e-post sendt til {email}',
        reauth_password_required: 'Passord er pÃƒÂ¥krevd.',
        reauth_verifying: 'Verifiserer...',
        reauth_confirm: 'Bekreft',
        reauth_title: 'Reautentisering kreves',
        reauth_subtitle: 'Skriv inn passordet ditt for ÃƒÂ¥ fortsette.',
        reauth_current_password: 'NÃƒÂ¥vÃƒÂ¦rende passord',
        reauth_failed_prefix: 'Reautentisering mislyktes: '
    },
    pl: {
        profile_email_verification_sent: 'WiadomoÃ…â€ºÃ„â€¡ weryfikacyjna zostaÃ…â€ša wysÃ…â€šana na adres {email}. SprawdÃ…Âº skrzynkÃ„â„¢ odbiorczÃ„â€¦ lub folder spam.',
        verification_email_sent_to: 'WiadomoÃ…â€ºÃ„â€¡ weryfikacyjna zostaÃ…â€ša wysÃ…â€šana na adres {email}',
        reauth_password_required: 'HasÃ…â€šo jest wymagane.',
        reauth_verifying: 'Weryfikowanie...',
        reauth_confirm: 'PotwierdÃ…Âº',
        reauth_title: 'Wymagana ponowna autoryzacja',
        reauth_subtitle: 'Wpisz hasÃ…â€šo, aby kontynuowaÃ„â€¡.',
        reauth_current_password: 'Obecne hasÃ…â€šo',
        reauth_failed_prefix: 'Ponowna autoryzacja nie powiodÃ…â€ša siÃ„â„¢: '
    },
    'pt-PT': {
        profile_email_verification_sent: 'E-mail de verifica\u00E7\u00E3o enviado para {email}. Verifique a sua caixa de entrada ou pasta de spam.',
        verification_email_sent_to: 'E-mail de verifica\u00E7\u00E3o enviado para {email}',
        reauth_password_required: 'A palavra-passe \u00E9 obrigat\u00F3ria.',
        reauth_verifying: 'A verificar...',
        reauth_confirm: 'Confirmar',
        reauth_title: 'Reautentica\u00E7\u00E3o necess\u00E1ria',
        reauth_subtitle: 'Introduza a sua palavra-passe para continuar.',
        reauth_current_password: 'Palavra-passe atual',
        reauth_failed_prefix: 'Falha na reautentica\u00E7\u00E3o: '
    },
    fi: {
        profile_email_verification_sent: 'VahvistussÃƒÂ¤hkÃƒÂ¶posti lÃƒÂ¤hetetty osoitteeseen {email}. Tarkista saapuneet-kansio tai roskaposti.',
        verification_email_sent_to: 'VahvistussÃƒÂ¤hkÃƒÂ¶posti lÃƒÂ¤hetetty osoitteeseen {email}',
        reauth_password_required: 'Salasana vaaditaan.',
        reauth_verifying: 'Vahvistetaan...',
        reauth_confirm: 'Vahvista',
        reauth_title: 'Uudelleentodennus vaaditaan',
        reauth_subtitle: 'Anna salasanasi jatkaaksesi.',
        reauth_current_password: 'Nykyinen salasana',
        reauth_failed_prefix: 'Uudelleentodennus epÃƒÂ¤onnistui: '
    },
    sv: {
        profile_email_verification_sent: 'Verifieringsmejl skickat till {email}. Kontrollera inkorgen eller skrÃƒÂ¤ppostmappen.',
        verification_email_sent_to: 'Verifieringsmejl skickat till {email}',
        reauth_password_required: 'LÃƒÂ¶senord krÃƒÂ¤vs.',
        reauth_verifying: 'Verifierar...',
        reauth_confirm: 'BekrÃƒÂ¤fta',
        reauth_title: 'Omautentisering krÃƒÂ¤vs',
        reauth_subtitle: 'Ange ditt lÃƒÂ¶senord fÃƒÂ¶r att fortsÃƒÂ¤tta.',
        reauth_current_password: 'Nuvarande lÃƒÂ¶senord',
        reauth_failed_prefix: 'Omautentisering misslyckades: '
    },
    vi: {
        profile_email_verification_sent: 'Email xÃƒÂ¡c minh Ã„â€˜ÃƒÂ£ Ã„â€˜Ã†Â°Ã¡Â»Â£c gÃ¡Â»Â­i tÃ¡Â»â€ºi {email}. Vui lÃƒÂ²ng kiÃ¡Â»Æ’m tra hÃ¡Â»â„¢p thÃ†Â° Ã„â€˜Ã¡ÂºÂ¿n hoÃ¡ÂºÂ·c thÃ†Â° rÃƒÂ¡c.',
        verification_email_sent_to: 'Email xÃƒÂ¡c minh Ã„â€˜ÃƒÂ£ Ã„â€˜Ã†Â°Ã¡Â»Â£c gÃ¡Â»Â­i tÃ¡Â»â€ºi {email}',
        reauth_password_required: 'CÃ¡ÂºÂ§n nhÃ¡ÂºÂ­p mÃ¡ÂºÂ­t khÃ¡ÂºÂ©u.',
        reauth_verifying: 'Ã„Âang xÃƒÂ¡c minh...',
        reauth_confirm: 'XÃƒÂ¡c nhÃ¡ÂºÂ­n',
        reauth_title: 'YÃƒÂªu cÃ¡ÂºÂ§u xÃƒÂ¡c thÃ¡Â»Â±c lÃ¡ÂºÂ¡i',
        reauth_subtitle: 'Vui lÃƒÂ²ng nhÃ¡ÂºÂ­p mÃ¡ÂºÂ­t khÃ¡ÂºÂ©u Ã„â€˜Ã¡Â»Æ’ tiÃ¡ÂºÂ¿p tÃ¡Â»Â¥c.',
        reauth_current_password: 'MÃ¡ÂºÂ­t khÃ¡ÂºÂ©u hiÃ¡Â»â€¡n tÃ¡ÂºÂ¡i',
        reauth_failed_prefix: 'XÃƒÂ¡c thÃ¡Â»Â±c lÃ¡ÂºÂ¡i thÃ¡ÂºÂ¥t bÃ¡ÂºÂ¡i: '
    },
    tr: {
        profile_email_verification_sent: 'DoÃ„Å¸rulama e-postasÃ„Â± {email} adresine gÃƒÂ¶nderildi. LÃƒÂ¼tfen gelen kutunuzu veya spam klasÃƒÂ¶rÃƒÂ¼nÃƒÂ¼ kontrol edin.',
        verification_email_sent_to: 'DoÃ„Å¸rulama e-postasÃ„Â± {email} adresine gÃƒÂ¶nderildi',
        reauth_password_required: 'Ã…Å¾ifre gerekli.',
        reauth_verifying: 'DoÃ„Å¸rulanÃ„Â±yor...',
        reauth_confirm: 'Onayla',
        reauth_title: 'Yeniden kimlik doÃ„Å¸rulama gerekli',
        reauth_subtitle: 'Devam etmek iÃƒÂ§in lÃƒÂ¼tfen Ã…Å¸ifrenizi girin.',
        reauth_current_password: 'Mevcut Ã…Å¸ifre',
        reauth_failed_prefix: 'Yeniden kimlik doÃ„Å¸rulama baÃ…Å¸arÃ„Â±sÃ„Â±z: '
    },
    zh: {
        profile_email_verification_sent: 'Ã©ÂªÅ’Ã¨Â¯ÂÃ©â€šÂ®Ã¤Â»Â¶Ã¥Â·Â²Ã¥Ââ€˜Ã©â‚¬ÂÃ¥Ë†Â° {email}Ã£â‚¬â€šÃ¨Â¯Â·Ã¦Â£â‚¬Ã¦Å¸Â¥Ã¦â€Â¶Ã¤Â»Â¶Ã§Â®Â±Ã¦Ë†â€“Ã¥Å¾Æ’Ã¥Å“Â¾Ã©â€šÂ®Ã¤Â»Â¶Ã¦â€“â€¡Ã¤Â»Â¶Ã¥Â¤Â¹Ã£â‚¬â€š',
        verification_email_sent_to: 'Ã©ÂªÅ’Ã¨Â¯ÂÃ©â€šÂ®Ã¤Â»Â¶Ã¥Â·Â²Ã¥Ââ€˜Ã©â‚¬ÂÃ¥Ë†Â° {email}',
        reauth_password_required: 'Ã©Å“â‚¬Ã¨Â¦ÂÃ¨Â¾â€œÃ¥â€¦Â¥Ã¥Â¯â€ Ã§Â ÂÃ£â‚¬â€š',
        reauth_verifying: 'Ã¦Â­Â£Ã¥Å“Â¨Ã©ÂªÅ’Ã¨Â¯Â...',
        reauth_confirm: 'Ã§Â¡Â®Ã¨Â®Â¤',
        reauth_title: 'Ã©Å“â‚¬Ã¨Â¦ÂÃ©â€¡ÂÃ¦â€“Â°Ã©ÂªÅ’Ã¨Â¯Â',
        reauth_subtitle: 'Ã¨Â¯Â·Ã¥â€¦Ë†Ã¨Â¾â€œÃ¥â€¦Â¥Ã¥Â¯â€ Ã§Â ÂÃ¤Â»Â¥Ã§Â»Â§Ã§Â»Â­Ã£â‚¬â€š',
        reauth_current_password: 'Ã¥Â½â€œÃ¥â€°ÂÃ¥Â¯â€ Ã§Â Â',
        reauth_failed_prefix: 'Ã©â€¡ÂÃ¦â€“Â°Ã©ÂªÅ’Ã¨Â¯ÂÃ¥Â¤Â±Ã¨Â´Â¥Ã¯Â¼Å¡'
    },
    ja: {
        profile_email_verification_sent: 'Ã§Â¢ÂºÃ¨ÂªÂÃ£Æ’Â¡Ã£Æ’Â¼Ã£Æ’Â«Ã£â€šâ€™ {email} Ã£ÂÂ«Ã©â‚¬ÂÃ¤Â¿Â¡Ã£Ââ€”Ã£ÂÂ¾Ã£Ââ€”Ã£ÂÅ¸Ã£â‚¬â€šÃ¥Ââ€”Ã¤Â¿Â¡Ã£Æ’Ë†Ã£Æ’Â¬Ã£â€šÂ¤Ã£ÂÂ¾Ã£ÂÅ¸Ã£ÂÂ¯Ã¨Â¿Â·Ã¦Æ’â€˜Ã£Æ’Â¡Ã£Æ’Â¼Ã£Æ’Â«Ã£Æ’â€¢Ã£â€šÂ©Ã£Æ’Â«Ã£Æ’â‚¬Ã£â€šâ€™Ã§Â¢ÂºÃ¨ÂªÂÃ£Ââ€”Ã£ÂÂ¦Ã£ÂÂÃ£ÂÂ Ã£Ââ€¢Ã£Ââ€žÃ£â‚¬â€š',
        verification_email_sent_to: 'Ã§Â¢ÂºÃ¨ÂªÂÃ£Æ’Â¡Ã£Æ’Â¼Ã£Æ’Â«Ã£â€šâ€™ {email} Ã£ÂÂ«Ã©â‚¬ÂÃ¤Â¿Â¡Ã£Ââ€”Ã£ÂÂ¾Ã£Ââ€”Ã£ÂÅ¸',
        reauth_password_required: 'Ã£Æ’â€˜Ã£â€šÂ¹Ã£Æ’Â¯Ã£Æ’Â¼Ã£Æ’â€°Ã£ÂÅ’Ã¥Â¿â€¦Ã¨Â¦ÂÃ£ÂÂ§Ã£Ââ„¢Ã£â‚¬â€š',
        reauth_verifying: 'Ã§Â¢ÂºÃ¨ÂªÂÃ¤Â¸Â­...',
        reauth_confirm: 'Ã§Â¢ÂºÃ¨ÂªÂ',
        reauth_title: 'Ã¥â€ ÂÃ¨ÂªÂÃ¨Â¨Â¼Ã£ÂÅ’Ã¥Â¿â€¦Ã¨Â¦ÂÃ£ÂÂ§Ã£Ââ„¢',
        reauth_subtitle: 'Ã§Â¶Å¡Ã¨Â¡Å’Ã£Ââ„¢Ã£â€šâ€¹Ã£ÂÂ«Ã£ÂÂ¯Ã£Æ’â€˜Ã£â€šÂ¹Ã£Æ’Â¯Ã£Æ’Â¼Ã£Æ’â€°Ã£â€šâ€™Ã¥â€¦Â¥Ã¥Å â€ºÃ£Ââ€”Ã£ÂÂ¦Ã£ÂÂÃ£ÂÂ Ã£Ââ€¢Ã£Ââ€žÃ£â‚¬â€š',
        reauth_current_password: 'Ã§ÂÂ¾Ã¥Å“Â¨Ã£ÂÂ®Ã£Æ’â€˜Ã£â€šÂ¹Ã£Æ’Â¯Ã£Æ’Â¼Ã£Æ’â€°',
        reauth_failed_prefix: 'Ã¥â€ ÂÃ¨ÂªÂÃ¨Â¨Â¼Ã£ÂÂ«Ã¥Â¤Â±Ã¦â€¢â€”Ã£Ââ€”Ã£ÂÂ¾Ã£Ââ€”Ã£ÂÅ¸: '
    },
    ko: {
        profile_email_verification_sent: 'Ã­â„¢â€¢Ã¬ÂÂ¸ Ã¬ÂÂ´Ã«Â©â€Ã¬ÂÂ¼Ã¬Ââ€ž {email}(Ã¬Å“Â¼)Ã«Â¡Å“ Ã«Â³Â´Ã«Æ’Ë†Ã¬Å ÂµÃ«â€¹Ë†Ã«â€¹Â¤. Ã«Â°â€ºÃ¬Ââ‚¬Ã­Å½Â¸Ã¬Â§â‚¬Ã­â€¢Â¨ Ã«ËœÂÃ«Å â€ Ã¬Å Â¤Ã­Å’Â¸Ã­â€¢Â¨Ã¬Ââ€ž Ã­â„¢â€¢Ã¬ÂÂ¸Ã­â€¢Â´ Ã¬Â£Â¼Ã¬â€žÂ¸Ã¬Å¡â€.',
        verification_email_sent_to: 'Ã­â„¢â€¢Ã¬ÂÂ¸ Ã¬ÂÂ´Ã«Â©â€Ã¬ÂÂ¼Ã¬Ââ€ž {email}(Ã¬Å“Â¼)Ã«Â¡Å“ Ã«Â³Â´Ã«Æ’Ë†Ã¬Å ÂµÃ«â€¹Ë†Ã«â€¹Â¤',
        reauth_password_required: 'Ã«Â¹â€žÃ«Â°â‚¬Ã«Â²Ë†Ã­ËœÂ¸ÃªÂ°â‚¬ Ã­â€¢â€žÃ¬Å¡â€Ã­â€¢Â©Ã«â€¹Ë†Ã«â€¹Â¤.',
        reauth_verifying: 'Ã­â„¢â€¢Ã¬ÂÂ¸ Ã¬Â¤â€˜...',
        reauth_confirm: 'Ã­â„¢â€¢Ã¬ÂÂ¸',
        reauth_title: 'Ã¬Å¾Â¬Ã¬ÂÂ¸Ã¬Â¦ÂÃ¬ÂÂ´ Ã­â€¢â€žÃ¬Å¡â€Ã­â€¢Â©Ã«â€¹Ë†Ã«â€¹Â¤',
        reauth_subtitle: 'ÃªÂ³â€žÃ¬â€ ÂÃ­â€¢ËœÃ«Â Â¤Ã«Â©Â´ Ã«Â¹â€žÃ«Â°â‚¬Ã«Â²Ë†Ã­ËœÂ¸Ã«Â¥Â¼ Ã¬Å¾â€¦Ã«Â Â¥Ã­â€¢Â´ Ã¬Â£Â¼Ã¬â€žÂ¸Ã¬Å¡â€.',
        reauth_current_password: 'Ã­Ëœâ€žÃ¬Å¾Â¬ Ã«Â¹â€žÃ«Â°â‚¬Ã«Â²Ë†Ã­ËœÂ¸',
        reauth_failed_prefix: 'Ã¬Å¾Â¬Ã¬ÂÂ¸Ã¬Â¦Â Ã¬â€¹Â¤Ã­Å’Â¨: '
    }
};
Object.keys(I18N_EMAIL_REAUTH_PATCH).forEach((lang) => {
    I18N[lang] = { ...(I18N[lang] || {}), ...I18N_EMAIL_REAUTH_PATCH[lang] };
});

const I18N_EMAIL_RELOGIN_MODAL_PATCH = {
    en: {
        email_update_relogin_title: 'Email Update Requested',
        back_to_login_page: 'Back to Login page'
    },
    ar: {
        email_update_relogin_title: 'Ã˜ÂªÃ™â€¦ Ã˜Â·Ã™â€žÃ˜Â¨ Ã˜ÂªÃ˜Â­Ã˜Â¯Ã™Å Ã˜Â« Ã˜Â§Ã™â€žÃ˜Â¨Ã˜Â±Ã™Å Ã˜Â¯ Ã˜Â§Ã™â€žÃ˜Â¥Ã™â€žÃ™Æ’Ã˜ÂªÃ˜Â±Ã™Ë†Ã™â€ Ã™Å ',
        back_to_login_page: 'Ã˜Â§Ã™â€žÃ˜Â¹Ã™Ë†Ã˜Â¯Ã˜Â© Ã˜Â¥Ã™â€žÃ™â€° Ã˜ÂµÃ™ÂÃ˜Â­Ã˜Â© Ã˜ÂªÃ˜Â³Ã˜Â¬Ã™Å Ã™â€ž Ã˜Â§Ã™â€žÃ˜Â¯Ã˜Â®Ã™Ë†Ã™â€ž'
    },
    bn: {
        email_update_relogin_title: 'Ã Â¦â€¡Ã Â¦Â®Ã Â§â€¡Ã Â¦â€¡Ã Â¦Â² Ã Â¦â€ Ã Â¦ÂªÃ Â¦Â¡Ã Â§â€¡Ã Â¦Å¸Ã Â§â€¡Ã Â¦Â° Ã Â¦â€¦Ã Â¦Â¨Ã Â§ÂÃ Â¦Â°Ã Â§â€¹Ã Â¦Â§ Ã Â¦â€¢Ã Â¦Â°Ã Â¦Â¾ Ã Â¦Â¹Ã Â¦Â¯Ã Â¦Â¼Ã Â§â€¡Ã Â¦â€ºÃ Â§â€¡',
        back_to_login_page: 'Ã Â¦Â²Ã Â¦â€”Ã Â¦â€¡Ã Â¦Â¨ Ã Â¦ÂªÃ Â§â€¡Ã Â¦Å“Ã Â§â€¡ Ã Â¦Â«Ã Â¦Â¿Ã Â¦Â°Ã Â§â€¡ Ã Â¦Â¯Ã Â¦Â¾Ã Â¦Â¨'
    },
    da: {
        email_update_relogin_title: 'E-mailopdatering anmodet',
        back_to_login_page: 'Tilbage til login-side'
    },
    de: {
        email_update_relogin_title: 'E-Mail-Update angefordert',
        back_to_login_page: 'ZurÃƒÂ¼ck zur Login-Seite'
    },
    fil: {
        email_update_relogin_title: 'Hiniling ang pag-update ng email',
        back_to_login_page: 'Bumalik sa Login page'
    },
    fr: {
        email_update_relogin_title: 'Mise ÃƒÂ  jour de lÃ¢â‚¬â„¢e-mail demandÃƒÂ©e',
        back_to_login_page: 'Retour ÃƒÂ  la page de connexion'
    },
    hmn: {
        email_update_relogin_title: 'Tau thov hloov email',
        back_to_login_page: 'Rov qab mus rau nplooj login'
    },
    id: {
        email_update_relogin_title: 'Permintaan pembaruan email',
        back_to_login_page: 'Kembali ke halaman login'
    },
    it: {
        email_update_relogin_title: 'Aggiornamento email richiesto',
        back_to_login_page: 'Torna alla pagina di accesso'
    },
    hu: {
        email_update_relogin_title: 'E-mail-frissÃƒÂ­tÃƒÂ©s kÃƒÂ©rve',
        back_to_login_page: 'Vissza a bejelentkezÃƒÂ©si oldalra'
    },
    ms: {
        email_update_relogin_title: 'Kemas kini e-mel diminta',
        back_to_login_page: 'Kembali ke halaman log masuk'
    },
    nl: {
        email_update_relogin_title: 'E-mailupdate aangevraagd',
        back_to_login_page: 'Terug naar de inlogpagina'
    },
    no: {
        email_update_relogin_title: 'E-postoppdatering forespurt',
        back_to_login_page: 'Tilbake til innloggingssiden'
    },
    pl: {
        email_update_relogin_title: 'ZaÃ…Â¼Ã„â€¦dano zmiany e-maila',
        back_to_login_page: 'WrÃƒÂ³Ã„â€¡ do strony logowania'
    },
    'pt-PT': {
        email_update_relogin_title: 'Atualiza\u00E7\u00E3o de e-mail solicitada',
        back_to_login_page: 'Voltar para a p\u00E1gina de login'
    },
    fi: {
        email_update_relogin_title: 'SÃƒÂ¤hkÃƒÂ¶postin pÃƒÂ¤ivitys pyydetty',
        back_to_login_page: 'Takaisin kirjautumissivulle'
    },
    sv: {
        email_update_relogin_title: 'Uppdatering av e-post begÃƒÂ¤rd',
        back_to_login_page: 'Tillbaka till inloggningssidan'
    },
    vi: {
        email_update_relogin_title: 'Ã„ÂÃƒÂ£ yÃƒÂªu cÃ¡ÂºÂ§u cÃ¡ÂºÂ­p nhÃ¡ÂºÂ­t email',
        back_to_login_page: 'Quay lÃ¡ÂºÂ¡i trang Ã„â€˜Ã„Æ’ng nhÃ¡ÂºÂ­p'
    },
    tr: {
        email_update_relogin_title: 'E-posta gÃƒÂ¼ncellemesi istendi',
        back_to_login_page: 'GiriÃ…Å¸ sayfasÃ„Â±na dÃƒÂ¶n'
    },
    zh: {
        email_update_relogin_title: 'Ã¥Â·Â²Ã¨Â¯Â·Ã¦Â±â€šÃ¦â€ºÂ´Ã¦â€“Â°Ã©â€šÂ®Ã§Â®Â±',
        back_to_login_page: 'Ã¨Â¿â€Ã¥â€ºÅ¾Ã§â„¢Â»Ã¥Â½â€¢Ã©Â¡ÂµÃ©ÂÂ¢'
    },
    ja: {
        email_update_relogin_title: 'Ã£Æ’Â¡Ã£Æ’Â¼Ã£Æ’Â«Ã£â€šÂ¢Ã£Æ’â€°Ã£Æ’Â¬Ã£â€šÂ¹Ã¦â€ºÂ´Ã¦â€“Â°Ã£â€šâ€™Ã£Æ’ÂªÃ£â€šÂ¯Ã£â€šÂ¨Ã£â€šÂ¹Ã£Æ’Ë†Ã£Ââ€”Ã£ÂÂ¾Ã£Ââ€”Ã£ÂÅ¸',
        back_to_login_page: 'Ã£Æ’Â­Ã£â€šÂ°Ã£â€šÂ¤Ã£Æ’Â³Ã£Æ’Å¡Ã£Æ’Â¼Ã£â€šÂ¸Ã£ÂÂ«Ã¦Ë†Â»Ã£â€šâ€¹'
    },
    ko: {
        email_update_relogin_title: 'Ã¬ÂÂ´Ã«Â©â€Ã¬ÂÂ¼ Ã«Â³â‚¬ÃªÂ²Â½ Ã¬Å¡â€Ã¬Â²Â­Ã«ÂÂ¨',
        back_to_login_page: 'Ã«Â¡Å“ÃªÂ·Â¸Ã¬ÂÂ¸ Ã­Å½ËœÃ¬ÂÂ´Ã¬Â§â‚¬Ã«Â¡Å“ Ã«ÂÅ’Ã¬â€¢â€žÃªÂ°â‚¬ÃªÂ¸Â°'
    }
};
Object.keys(I18N_EMAIL_RELOGIN_MODAL_PATCH).forEach((lang) => {
    I18N[lang] = { ...(I18N[lang] || {}), ...I18N_EMAIL_RELOGIN_MODAL_PATCH[lang] };
});

// Emergency translation reset: force all languages to a clean English baseline.
// This removes mojibake site-wide while we rebuild per-language dictionaries safely.
const FORCE_EN_TRANSLATIONS = false;
if (FORCE_EN_TRANSLATIONS && I18N && I18N.en) {
    const enBase = { ...I18N.en };
    Object.keys(I18N).forEach((lang) => {
        I18N[lang] = { ...enBase };
    });
    I18N.en = { ...enBase, settings_title: 'Options' };
}

let currentLanguage = 'en';
let currentTheme = 'default';
let customThemeHex = {};
let customThemeEnabled = false;
let customThemeName = 'Custom';
let savedCustomThemes = [];
let cavePlayInit = false;

const DEFAULT_MOUNT_CONFIG = 'mountspeed1';
const MOUNT_CONFIG_IMAGES = {
    mountspeed1: '../icons/mountspeed1.png',
    mountspeed2: '../icons/mountspeed2.png'
};
const MOUNT_CONFIG_I18N_KEYS = {
    mountspeed1: 'mount_speed_1',
    mountspeed2: 'mount_speed_2'
};

const CONFIG_OPTIONS = {
    platform: ['Mobile', 'PC'],
    time: ['5 Min', '10 Min', '60 Min'],
    stat: ['Baddy Kills', 'Baddy Points'],
    mount: [DEFAULT_MOUNT_CONFIG, 'mountspeed2']
};

function hasMojibakeHint(str) {
    if (typeof str !== 'string' || !str) return false;
    return /Ã.|Â.|â€|ï¿½|Ãƒ|Ã‚/.test(str);
}
function mojibakeScore(str) {
    if (typeof str !== 'string' || !str) return 0;
    const patterns = [/Ã./g, /Â./g, /â€/g, /ï¿½/g, /Ãƒ/g, /Ã‚/g];
    return patterns.reduce((score, pattern) => {
        const matches = str.match(pattern);
        return score + (matches ? matches.length : 0);
    }, 0);
}
function decodeOnceLatin1Utf8(str) {
    const bytes = Uint8Array.from([...str].map((ch) => ch.charCodeAt(0) & 0xff));
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}
function decodeMojibake(val) {
    if (typeof val !== 'string' || !val) return val;
    if (!hasMojibakeHint(val)) return val;
    let current = val;
    for (let i = 0; i < 6; i += 1) {
        try {
            const decoded = decodeOnceLatin1Utf8(current);
            if (!decoded || decoded === current) break;
            const before = mojibakeScore(current);
            const after = mojibakeScore(decoded);
            if (after <= before) {
                current = decoded;
                if (!hasMojibakeHint(current)) break;
                continue;
            }
            break;
        } catch {
            break;
        }
    }
    return current;
}

// Normalize all translations up front so previously garbled strings display correctly.
(function repairI18N() {
    Object.keys(I18N || {}).forEach(lang => {
        const map = I18N[lang];
        if (!map) return;
        Object.keys(map).forEach(key => {
            const val = map[key];
            const fixed = decodeMojibake(val);
            if (fixed !== val) map[key] = fixed;
        });
    });
    const enMap = I18N.en || {};
    Object.keys(I18N || {}).forEach(lang => {
        const map = I18N[lang];
        if (!map || lang === 'en') return;
        Object.keys(enMap).forEach(key => {
            if (!map[key]) {
                map[key] = enMap[key]; // default to English if missing
            }
        });
    });
})();

const SUPPORTED_BENCHMARK_LANGUAGES = ['en', 'es', 'pt-BR'];
const SUPPORTED_BENCHMARK_LANGUAGE_LABELS = {
    en: 'English',
    es: 'Espa\u00F1ol',
    'pt-BR': 'Portugu\u00EAs (Brasil)'
};

function enforceBenchmarkSupportedLanguages() {
    Object.keys(I18N || {}).forEach((lang) => {
        if (!SUPPORTED_BENCHMARK_LANGUAGES.includes(lang)) {
            delete I18N[lang];
        }
    });
    const storedLang = localStorage.getItem('benchmark_language');
    const safeLang = SUPPORTED_BENCHMARK_LANGUAGES.includes(storedLang) ? storedLang : 'en';
    if (storedLang !== safeLang) {
        localStorage.setItem('benchmark_language', safeLang);
    }
    const selects = new Set([
        ...Array.from(document.querySelectorAll('.auth-lang-select')),
        ...Array.from(document.querySelectorAll('#languageSelect'))
    ]);
    selects.forEach((selectEl) => {
        if (!selectEl) return;
        const selected = SUPPORTED_BENCHMARK_LANGUAGES.includes(selectEl.value) ? selectEl.value : safeLang;
        selectEl.innerHTML = '';
        SUPPORTED_BENCHMARK_LANGUAGES.forEach((lang) => {
            const option = document.createElement('option');
            option.value = lang;
            option.textContent = SUPPORTED_BENCHMARK_LANGUAGE_LABELS[lang] || lang;
            selectEl.appendChild(option);
        });
        selectEl.value = SUPPORTED_BENCHMARK_LANGUAGES.includes(selected) ? selected : 'en';
    });
}

enforceBenchmarkSupportedLanguages();

const I18N_ALLOWED_LOCALE_FIXES = {
    en: {
        onboarding_welcome_title: 'Welcome to the Benchmarks!',
        onboarding_welcome_subtitle: 'Please complete your profile setup. A username is required to proceed, while other details are optional and can be updated later in your settings.',
        onboarding_save_continue: 'Save & Continue',
        onboarding_saving: 'Saving...',
        onboarding_username_required: 'Username is required.',
        onboarding_error_prefix: 'Error saving profile: '
    },
    es: {
        share: 'Compartir',
        settings: 'Ajustes',
        settings_title: 'Ajustes',
        rating: 'Clasificaci\u00F3n',
        score: 'Puntuaci\u00F3n',
        progression: 'Umbral de puntuaci\u00F3n',
        cave: 'Cueva',
        edit: 'Editar',
        edit_hint: 'Clic derecho para editar',
        swords: 'Espadas',
        bombs: 'Bombas',
        radar_title: 'Gr\u00E1fico de Cueva',
        radar_strongest: 'Cuevas m\u00E1s fuertes',
        radar_weakest: 'Cuevas m\u00E1s d\u00E9biles',
        radar_tab_combined: 'Combinado',
        radar_tab_swords: 'Espadas',
        radar_tab_bombs: 'Bombas',
        rule_1: 'El benchmark est\u00E1 destinado exclusivamente para <span style="color: #fff;">uso personal</span>.',
        rule_2: 'Todos los enemigos en la cueva deben ser <span style="color: #fff;">restablecidos a salud completa</span> antes de comenzar.',
        rule_3: 'No se permiten <span style="color: #fff;">aumentos de velocidad</span> de los arbustos.',
        rule_4: 'Los umbrales de puntuaci\u00F3n deben alcanzarse <span style="color: #fff;">sin ninguna ayuda</span> de otros jugadores o da\u00F1o accidental causado por otros jugadores.',
        rule_5: 'La categor\u00EDa <span style="color: #fff;">Espadas</span> permite solo el uso de espadas, mientras que la categor\u00EDa <span style="color: #fff;">Bombas</span> permite el uso tanto de bombas como de espadas.',
        download_image: 'Descargar imagen',
        copy_link: 'Copiar enlace del benchmark',
        guidelines_title: 'Directrices',
        guidelines_subtitle: 'para una puntuaci\u00F3n precisa',
        settings_subtitle: 'Personaliza tu benchmark',
        settings_language: 'Idioma',
        settings_language_note: 'Se aplica al instante.',
        settings_display: 'Pantalla',
        settings_mount: 'Montura',
        mount_speed_1: 'Velocidad de montura 1',
        mount_speed_2: 'Velocidad de montura 2',
        settings_font_scale: 'Tama\u00F1o de fuente',
        settings_font_family: 'Fuente',
        settings_compact_mode: 'Modo compacto',
        settings_pacman: 'Pacman',
        settings_font_small: 'Peque\u00F1o',
        settings_font_normal: 'Normal',
        settings_font_large: 'Grande',
        settings_font_default: 'Predeterminado',
        settings_font_modern: 'Moderno',
        settings_font_classic: 'Cl\u00E1sico',
        settings_font_mono: 'Mono',
        settings_toggle_on: 'Encendido',
        settings_toggle_off: 'Apagado',
        settings_theme: 'Temas',
        settings_theme_note: 'Los temas de rango se desbloquean a medida que subes de rango.',
        settings_theme_auto: 'Aplicar autom\u00E1ticamente tu tema de rango actual al subir de rango',
        settings_custom_name: 'Personalizado',
        settings_save_name: 'Guardar',
        settings_remove_custom: 'Eliminar',
        settings_custom_create: 'Crear',
        settings_custom_locked_note: 'Haz clic en Crear para desbloquear colores personalizados.',
        settings_custom_select_note: 'Selecciona un tema personalizado.',
        settings_custom_theme: 'Colores personalizados',
        settings_custom_note: 'Elige colores para construir tu propio tema.',
        settings_preview: 'Vista previa',
        settings_preview_title: 'Vista previa del benchmark',
        settings_preview_note: 'Se actualiza a medida que cambias los colores.',
        settings_color_target: 'Objetivo de color',
        settings_color_background: 'Fondo',
        settings_color_accent1: 'Acento 1',
        settings_color_accent2: 'Acento 2',
        settings_color_panel: 'Fondo del panel',
        settings_color_border: 'Borde del panel',
        settings_color_text: 'Texto',
        settings_default_config: 'Configuraci\u00F3n',
        settings_default_config_startup: 'Configuraci\u00F3n de inicio',
        settings_visibility_title: 'Visibilidad',
        settings_visibility_note: 'Elige qui\u00E9n puede ver tu benchmark.',
        settings_visibility_label: 'Visibilidad',
        settings_visibility_everyone: 'Todos',
        settings_visibility_friends: 'Solo amigos/gremio',
        settings_platform: 'Plataforma',
        settings_time: 'Tiempo',
        settings_stat: 'Estad\u00EDstica',
        settings_save_default: 'Establecer predeterminado',
        settings_reset_scores: 'Restablecer valores de puntuaci\u00F3n',
        settings_reset_config: 'Configuraci\u00F3n',
        settings_current_config: 'Configuraci\u00F3n actual',
        settings_reset_selected: 'Restablecer seleccionados',
        settings_reset_all: 'Restablecer todas las configuraciones',
        settings_reset_note: 'No cambia los valores predeterminados.',
        generating_screenshot: 'Generando captura de pantalla...',
        reset_confirm: '\u00BFRestablecer todos los valores de puntuaci\u00F3n a 0?',
        reset_all_confirm: '\u00BFRestablecer todas las configuraciones y puntuaciones guardadas?',
        footer_site_made_by: 'Sitio creado por',
        footer_disclaimer: 'Este sitio no est\u00E1 afiliado, mantenido, respaldado ni patrocinado por GraalOnline. Todos los recursos \u00A9 2026 GraalOnline',
        footer_terms: 'T\u00E9rminos y condiciones',
        footer_privacy: 'Pol\u00EDtica de privacidad',
        footer_cookie: 'Pol\u00EDtica de cookies',
        footer_dmca: 'Pol\u00EDtica DMCA',
        menu_profile: 'Perfil',
        menu_friends: 'Amigos',
        menu_logout: 'Cerrar sesi\u00F3n',
        achievements_title: 'Logros',
        highlights_title: 'Destacados',
        profile_settings_title: 'Configuraci\u00F3n de perfil',
        profile_picture: 'Foto de perfil',
        upload_image: 'Subir imagen',
        edit_image: 'Editar imagen',
        remove_image: 'Eliminar imagen',
        username_label: 'Nombre de usuario (1-20 caracteres)',
        username_placeholder: 'Jugador',
        guilds_max: 'Gremios (m\u00E1x. 6)',
        guild_name_placeholder: 'Nombre del gremio',
        add_guild: 'Agregar gremio',
        country_flag: 'Bandera del pa\u00EDs',
        remove_flag: 'Quitar bandera',
        account_details: 'Detalles de la cuenta',
        account_id: 'ID de cuenta',
        email_address: 'Direcci\u00F3n de correo electr\u00F3nico',
        new_email_placeholder: 'Nueva direcci\u00F3n de correo',
        verify_update: 'Verificar y actualizar',
        change_email_address: 'Cambiar direcci\u00F3n de correo',
        change_password: 'Cambiar contrase\u00F1a',
        delete_personal_account: 'Eliminar cuenta personal',
        cannot_undo: 'Esto no se puede deshacer.',
        delete_account: 'Eliminar cuenta',
        friends_title: 'Amigos',
        friends_subtitle: 'Agrega y ve los benchmarks de tus amigos',
        add_highlight_btn: '+ Agregar destacado',
        add_friend: 'Agregar amigo',
        show: 'Mostrar',
        hide: 'Ocultar',
        seasonal_modal_title: 'Posiciones de temporada',
        seasonal_modal_subtitle: 'Agrega tus trofeos obtenidos',
        seasonal_current_total: 'Total actual de posiciones',
        seasonal_total_label: 'Total',
        seasonal_reset_values: 'Restablecer valores',
        seasonal_save_placements: 'Guardar posiciones',
        friends_none: 'A\u00FAn no tienes amigos.',
        friend_requests_none: 'No hay solicitudes de amistad.',
        remove_friends_none: 'No hay amigos para eliminar.',
        highlight_modal_title: 'Agregar destacado',
        highlight_label_image: 'Imagen',
        highlight_click_upload: 'Haz clic para subir una imagen',
        achievement_completed: 'Completado',
        achievement_incomplete: 'Incompleto',
        achievement_upload_image: 'Subir imagen',
        achievement_enter_friend_name: 'Ingresa el nombre de tu amigo',
        seasonal_place_1st: '#1 Trofeo',
        seasonal_place_2nd: '#2 Trofeo',
        seasonal_place_3rd: '#3 Trofeo',
        seasonal_place_plaque: 'Placa',
        achievement_friend_label: 'Amigo {index}',
        achievement_session_incomplete: 'Sesi\u00F3n incompleta',
        achievement_no_image: 'Sin imagen',
        achievement_remove_image_title: 'Eliminar imagen',
        achievement_remove_image_confirm: '\u00BFEliminar esta imagen?',
        achievement_session_image: 'Imagen de sesi\u00F3n',
        achievement_cat_lifetime: 'Acumulado',
        achievement_cat_kills: 'Bajas',
        achievement_cat_points: 'Puntos',
        achievement_cat_streak: 'Racha',
        achievement_cat_duo: 'D\u00FAo',
        achievement_cat_trio: 'Tr\u00EDo',
        achievement_cat_quad: 'Cuarteto',
        achievement_cat_challenge: 'Desaf\u00EDo',
        remove_friend_title: 'Eliminar amigo',
        remove_friend_confirm: '\u00BFEliminar a {name} de tu lista de amigos?',
        remove_friend_failed: 'No se pudo eliminar al amigo.',
        highlight_delete_title: 'Eliminar destacado',
        highlight_delete_confirm: '\u00BFSeguro que quieres eliminar este destacado?',
        achievement_progress_view_prefix: '{name} ha desbloqueado',
        replace_image: 'Reemplazar imagen',
        password: 'Contrase\u00F1a',
        sent_requests_none: 'No hay solicitudes enviadas.',
        center: 'Centrar',
        save: 'Guardar',
        cancel: 'Cancelar',
        add: 'Agregar',
        remove: 'Eliminar',
        drag_to_reorder: 'Arrastra para reordenar',
        profile_email_verification_sent: 'Se envi\u00F3 un correo de verificaci\u00F3n a {email}. Revisa tu bandeja de entrada o spam.',
        profile_email_valid_error: 'Ingresa una direcci\u00F3n de correo v\u00E1lida.',
        profile_email_different_error: 'Ingresa una direcci\u00F3n de correo diferente.',
        profile_email_sending_verification: 'Enviando verificaci\u00F3n...',
        profile_not_logged_in: 'No has iniciado sesi\u00F3n.',
        profile_password_sending_reset: 'Enviando correo para restablecer contrase\u00F1a...',
        profile_password_reset_sent: 'Se envi\u00F3 el correo para restablecer la contrase\u00F1a. Revisa tu bandeja de entrada o spam.',
        profile_email_not_exist: 'El correo no existe.',
        profile_change_password_sending: 'Enviando...',
        profile_delete_confirm_title: 'Eliminar cuenta personal',
        profile_delete_confirm_message: '\u00BFSeguro que quieres eliminar tu cuenta? Esta acci\u00F3n no se puede deshacer.',
        profile_delete_error_prefix: 'Error al eliminar la cuenta: ',
        profile_save_login_required: 'Debes iniciar sesi\u00F3n para guardar los cambios del perfil.',
        profile_saving: 'Guardando...',
        profile_save_failed: 'No se pudieron guardar los cambios del perfil. Int\u00E9ntalo de nuevo.',
        verification_email_sent_to: 'Correo de verificaci\u00F3n enviado a {email}',
        reauth_password_required: 'Se requiere contrase\u00F1a.',
        reauth_verifying: 'Verificando...',
        reauth_confirm: 'Confirmar',
        reauth_title: 'Se requiere reautenticaci\u00F3n',
        reauth_subtitle: 'Ingresa tu contrase\u00F1a para continuar.',
        reauth_current_password: 'Contrase\u00F1a actual',
        reauth_failed_prefix: 'La reautenticaci\u00F3n fall\u00F3: ',
        email_update_relogin_title: 'Actualizaci\u00F3n de correo solicitada',
        back_to_login_page: 'Volver a la p\u00E1gina de inicio de sesi\u00F3n',
        onboarding_welcome_title: '¡Bienvenido a Benchmarks!',
        onboarding_welcome_subtitle: 'Completa la configuración de tu perfil. Se requiere un nombre de usuario para continuar; los demás datos son opcionales y puedes actualizarlos más tarde en tus ajustes.',
        onboarding_save_continue: 'Guardar y continuar',
        onboarding_saving: 'Guardando...',
        onboarding_username_required: 'Se requiere nombre de usuario.',
        onboarding_error_prefix: 'Error al guardar el perfil: ',
        exit_view_mode: 'Salir del modo vista',
    },
    'pt-BR': {
        share: 'Compartilhar',
        settings: 'Configura\u00E7\u00F5es',
        settings_title: 'Configura\u00E7\u00F5es',
        settings_subtitle: 'Personalize seu benchmark',
        rating: 'Classifica\u00E7\u00E3o',
        score: 'Pontua\u00E7\u00E3o',
        progression: 'Limiar de pontua\u00E7\u00E3o',
        cave: 'Caverna',
        edit: 'Editar',
        edit_hint: 'Clique com o bot\u00E3o direito para editar',
        swords: 'Espadas',
        bombs: 'Bombas',
        radar_title: 'Gr\u00E1fico da Caverna',
        radar_strongest: 'Cavernas Mais Fortes',
        radar_weakest: 'Cavernas Mais Fracas',
        radar_tab_combined: 'Combinado',
        radar_tab_swords: 'Espadas',
        radar_tab_bombs: 'Bombas',
        rule_1: 'O benchmark destina-se exclusivamente para <span style="color: #fff;">uso pessoal</span>.',
        rule_2: 'Todos os inimigos na caverna devem ser <span style="color: #fff;">redefinidos para a sa\u00FAde total</span> antes de come\u00E7ar.',
        rule_3: 'N\u00E3o s\u00E3o permitidos <span style="color: #fff;">aumentos de velocidade</span> de arbustos.',
        rule_4: 'Os limites de pontua\u00E7\u00E3o devem ser alcan\u00E7ados <span style="color: #fff;">sem qualquer ajuda</span> de outros jogadores ou danos acidentais causados por outros jogadores.',
        rule_5: 'A categoria <span style="color: #fff;">Espadas</span> permite apenas o uso de espadas, enquanto a categoria <span style="color: #fff;">Bombas</span> permite o uso de bombas e espadas.',
        guidelines_title: 'Diretrizes',
        guidelines_subtitle: 'para pontua\u00E7\u00E3o precisa',
        settings_display: 'Tela',
        settings_font_scale: 'Tamanho da Fonte',
        settings_font_family: 'Fonte',
        settings_compact_mode: 'Modo Compacto',
        settings_theme: 'Temas',
        settings_default_config: 'Configura\u00E7\u00E3o',
        settings_default_config_startup: 'Configura\u00E7\u00E3o Inicial',
        settings_visibility_title: 'Visibilidade',
        settings_visibility_note: 'Escolha quem pode ver seu benchmark.',
        settings_visibility_label: 'Visibilidade',
        settings_save_default: 'Definir Padr\u00E3o',
        settings_reset_scores: 'Redefinir Valores de Pontua\u00E7\u00E3o',
        settings_reset_config: 'Configura\u00E7\u00E3o',
        settings_current_config: 'Configura\u00E7\u00E3o atual',
        settings_reset_selected: 'Redefinir Selecionado',
        settings_reset_all: 'Redefinir Todas as Configura\u00E7\u00F5es',
        settings_reset_note: 'N\u00E3o altera os padr\u00F5es.',
        copy_link: 'Copiar Link do Benchmark',
        download_image: 'Baixar Imagem',
        seasonal_modal_title: 'Classifica\u00E7\u00F5es Sazonais',
        seasonal_modal_subtitle: 'Adicione seus trof\u00E9us conquistados',
        seasonal_current_total: 'Total atual de classifica\u00E7\u00F5es',
        seasonal_total_label: 'Total',
        seasonal_reset_values: 'Redefinir valores',
        seasonal_save_placements: 'Salvar classifica\u00E7\u00F5es',
        seasonal_place_1st: '#1 Troféu',
        seasonal_place_2nd: '#2 Troféu',
        seasonal_place_3rd: '#3 Troféu',
        seasonal_place_plaque: 'Placa',
        profile_settings_title: 'Configura\u00E7\u00F5es do Perfil',
        profile_picture: 'Foto de perfil',
        upload_image: 'Carregar imagem',
        edit_image: 'Editar imagem',
        remove_image: 'Remover imagem',
        username_label: 'Nome de usu\u00E1rio (1-20 caracteres)',
        username_placeholder: 'Jogador',
        guilds_max: 'Guildas (m\u00E1x. 6)',
        guild_name_placeholder: 'Nome da guilda',
        add_guild: 'Adicionar guilda',
        country_flag: 'Bandeira do pa\u00EDs',
        remove_flag: 'Remover bandeira',
        account_details: 'Detalhes da conta',
        account_id: 'ID da conta',
        show: 'Mostrar',
        hide: 'Ocultar',
        email_address: 'Endere\u00E7o de e-mail',
        new_email_placeholder: 'Novo endere\u00E7o de e-mail',
        verify_update: 'Verificar e atualizar',
        change_email_address: 'Alterar endere\u00E7o de e-mail',
        password: 'Senha',
        change_password: 'Alterar senha',
        delete_personal_account: 'Excluir conta pessoal',
        cannot_undo: 'Isso n\u00E3o pode ser desfeito.',
        delete_account: 'Excluir conta',
        center: 'Centralizar',
        save: 'Salvar',
        cancel: 'Cancelar',
        add: 'Adicionar',
        remove: 'Remover',
        drag_to_reorder: 'Arraste para reordenar',
        replace_image: 'Substituir imagem',
        save_changes: 'Salvar altera\u00E7\u00F5es',
        discard_changes: 'Descartar altera\u00E7\u00F5es',
        friends_list_tab: 'Lista de Amigos',
        friend_requests_tab: 'Solicita\u00E7\u00F5es de Amizade',
        received_friend_requests: 'Solicita\u00E7\u00F5es recebidas',
        sent_friend_requests: 'Solicita\u00E7\u00F5es enviadas',
        remove_friends_tab: 'Remover Amigos',
        friends_none: 'Voc\u00EA ainda n\u00E3o tem amigos.',
        friend_requests_none: 'Nenhuma solicita\u00E7\u00E3o de amizade.',
        friends_error_loading: 'Erro ao carregar amigos.',
        friend_requests_error_loading: 'Erro ao carregar solicita\u00E7\u00F5es de amizade.',
        add_friend_user_not_found: 'Usu\u00E1rio n\u00E3o encontrado.',
        add_friend_self: 'Voc\u00EA n\u00E3o pode adicionar a si mesmo.',
        add_friend_already_friends: 'Voc\u00EAs j\u00E1 s\u00E3o amigos.',
        add_friend_already_sent: 'Solicita\u00E7\u00E3o j\u00E1 enviada.',
        add_friend_check_requests: 'Verifique suas solicita\u00E7\u00F5es de amizade.',
        add_friend_sent: 'Solicita\u00E7\u00E3o de amizade enviada.',
        add_friend_error: 'N\u00E3o foi poss\u00EDvel enviar a solicita\u00E7\u00E3o de amizade.',
        accept: 'Aceitar',
        decline: 'Recusar',
        remove_friend_title: 'Remover Amigo',
        remove_friend_confirm: 'Remover {name} da sua lista de amigos?',
        remove_friend_failed: 'N\u00E3o foi poss\u00EDvel remover o amigo.',
        remove_friends_none: 'Nenhum amigo para remover.',
        highlights_title: 'Destaques',
        add_highlight_btn: '+ Adicionar destaque',
        highlight_modal_title: 'Adicionar destaque',
        highlight_label_image: 'Imagem',
        highlight_click_upload: 'Clique para carregar uma imagem',
        highlight_title_required_label: 'T\u00EDtulo (obrigat\u00F3rio)',
        highlight_desc_optional_label: 'Descri\u00E7\u00E3o (opcional)',
        highlight_title_placeholder: 'Digite um t\u00EDtulo...',
        highlight_desc_placeholder: 'Digite uma descri\u00E7\u00E3o...',
        highlights_empty: 'Ainda n\u00E3o h\u00E1 destaques.',
        delete: 'Excluir',
        highlight_delete_title: 'Remover destaque',
        highlight_delete_confirm: 'Tem certeza de que deseja excluir este destaque?',
        highlight_title_required_error: 'O t\u00EDtulo \u00E9 obrigat\u00F3rio.',
        highlight_upload_required_error: 'A imagem \u00E9 obrigat\u00F3ria.',
        highlight_save_failed: 'N\u00E3o foi poss\u00EDvel salvar o destaque.',
        highlight_limit_reached: 'Voc\u00EA atingiu o limite de destaques.',
        achievement_you_have: 'Voc\u00EA desbloqueou',
        achievement_completed: 'Conclu\u00EDdo',
        achievement_incomplete: 'Incompleto',
        achievement_session_image: 'Imagem da sess\u00E3o',
        achievement_session_incomplete: 'Sess\u00E3o incompleta',
        achievement_no_image: 'Sem imagem',
        achievement_remove_image_title: 'Remover imagem',
        achievement_remove_image_confirm: 'Remover esta imagem?',
        achievement_progress_view_prefix: '{name} desbloqueou',
        achievement_cat_lifetime: 'Total',
        achievement_cat_kills: 'Abates',
        achievement_cat_points: 'Pontos',
        achievement_cat_streak: 'Sequ\u00EAncia',
        achievement_cat_duo: 'Dupla',
        achievement_cat_trio: 'Trio',
        achievement_cat_quad: 'Esquadr\u00E3o',
        achievement_cat_challenge: 'Desafio',
        profile_email_valid_error: 'Digite um endere\u00E7o de e-mail v\u00E1lido.',
        profile_email_different_error: 'Digite um endere\u00E7o de e-mail diferente.',
        profile_email_sending_verification: 'Enviando verifica\u00E7\u00E3o...',
        profile_email_verification_sent: 'E-mail de verifica\u00E7\u00E3o enviado para {email}. Verifique sua caixa de entrada ou pasta de spam.',
        profile_not_logged_in: 'Voc\u00EA n\u00E3o est\u00E1 conectado.',
        profile_password_sending_reset: 'Enviando e-mail de redefini\u00E7\u00E3o de senha...',
        profile_password_reset_sent: 'E-mail de redefini\u00E7\u00E3o de senha enviado. Verifique sua caixa de entrada ou pasta de spam.',
        profile_email_not_exist: 'O e-mail n\u00E3o existe.',
        profile_change_password_sending: 'Enviando...',
        profile_delete_confirm_title: 'Excluir conta pessoal',
        profile_delete_confirm_message: 'Tem certeza de que deseja excluir sua conta? Esta a\u00E7\u00E3o n\u00E3o pode ser desfeita.',
        profile_delete_error_prefix: 'Erro ao excluir conta: ',
        profile_save_login_required: 'Voc\u00EA precisa estar conectado para salvar as altera\u00E7\u00F5es do perfil.',
        profile_saving: 'Salvando...',
        profile_save_failed: 'N\u00E3o foi poss\u00EDvel salvar as altera\u00E7\u00F5es do perfil. Tente novamente.',
        reauth_password_required: 'A senha \u00E9 obrigat\u00F3ria.',
        reauth_verifying: 'Verificando...',
        reauth_confirm: 'Confirmar',
        reauth_title: 'Reautentica\u00E7\u00E3o necess\u00E1ria',
        reauth_subtitle: 'Digite sua senha para continuar.',
        reauth_current_password: 'Senha atual',
        reauth_failed_prefix: 'Falha na reautentica\u00E7\u00E3o: ',
        email_update_relogin_title: 'Atualiza\u00E7\u00E3o de e-mail solicitada',
        back_to_login_page: 'Voltar para a p\u00E1gina de login',
        onboarding_welcome_title: 'Bem-vindo ao Benchmarks!',
        onboarding_welcome_subtitle: 'Conclua a configuração do seu perfil. Um nome de usuário é obrigatório para continuar, enquanto os outros detalhes são opcionais e podem ser atualizados depois nas configurações.',
        onboarding_save_continue: 'Salvar e continuar',
        onboarding_saving: 'Salvando...',
        onboarding_username_required: 'Nome de usuário é obrigatório.',
        onboarding_error_prefix: 'Erro ao salvar perfil: ',
        footer_disclaimer: 'Este site n\u00E3o \u00E9 afiliado, mantido, apoiado ou patrocinado pela GraalOnline. Todos os recursos \u00A9 2026 GraalOnline',
        footer_terms: 'Termos e Condi\u00E7\u00F5es',
        footer_privacy: 'Pol\u00EDtica de Privacidade',
        footer_cookie: 'Pol\u00EDtica de Cookies',
        footer_dmca: 'Pol\u00EDtica DMCA',
        views_label: 'Visualiza\u00E7\u00F5es',
        exit_view_mode: 'Sair do modo de visualiza\u00E7\u00E3o'
    },
    'pt-PT': {
        profile_settings_title: 'Defini\u00E7\u00F5es do Perfil',
        profile_picture: 'Foto de perfil',
        upload_image: 'Carregar imagem',
        edit_image: 'Editar imagem',
        remove_image: 'Remover imagem',
        username_label: 'Nome de utilizador (1-20 caracteres)',
        username_placeholder: 'Jogador',
        guilds_max: 'Guildas (m\u00E1x. 6)',
        guild_name_placeholder: 'Nome da guilda',
        add_guild: 'Adicionar guilda',
        country_flag: 'Bandeira do pa\u00EDs',
        remove_flag: 'Remover bandeira',
        account_details: 'Detalhes da conta',
        account_id: 'ID da conta',
        show: 'Mostrar',
        hide: 'Ocultar',
        email_address: 'Endere\u00E7o de e-mail',
        new_email_placeholder: 'Novo endere\u00E7o de e-mail',
        verify_update: 'Verificar e atualizar',
        change_email_address: 'Alterar endere\u00E7o de e-mail',
        password: 'Palavra-passe',
        change_password: 'Alterar palavra-passe',
        delete_personal_account: 'Eliminar conta pessoal',
        cannot_undo: 'Isto n\u00E3o pode ser desfeito.',
        delete_account: 'Eliminar conta',
        discard_changes: 'Descartar altera\u00E7\u00F5es',
        save_changes: 'Guardar altera\u00E7\u00F5es',
        center: 'Centrar',
        save: 'Guardar',
        cancel: 'Cancelar',
        add: 'Adicionar',
        remove: 'Remover',
        drag_to_reorder: 'Arraste para reordenar',
        replace_image: 'Substituir imagem',
        profile_email_valid_error: 'Introduza um endere\u00E7o de e-mail v\u00E1lido.',
        profile_email_different_error: 'Introduza um endere\u00E7o de e-mail diferente.',
        profile_email_sending_verification: 'A enviar verifica\u00E7\u00E3o...',
        profile_email_verification_sent: 'E-mail de verifica\u00E7\u00E3o enviado para {email}. Verifique a sua caixa de entrada ou pasta de spam.',
        profile_not_logged_in: 'N\u00E3o iniciou sess\u00E3o.',
        profile_password_sending_reset: 'A enviar e-mail de reposi\u00E7\u00E3o da palavra-passe...',
        profile_password_reset_sent: 'E-mail de reposi\u00E7\u00E3o da palavra-passe enviado. Verifique a sua caixa de entrada ou pasta de spam.',
        profile_email_not_exist: 'O e-mail n\u00E3o existe.',
        profile_change_password_sending: 'A enviar...',
        profile_delete_confirm_title: 'Eliminar conta pessoal',
        profile_delete_confirm_message: 'Tem a certeza de que pretende eliminar a sua conta? Esta a\u00E7\u00E3o n\u00E3o pode ser desfeita.',
        profile_delete_error_prefix: 'Erro ao eliminar conta: ',
        profile_save_login_required: 'Tem de iniciar sess\u00E3o para guardar as altera\u00E7\u00F5es do perfil.',
        profile_saving: 'A guardar...',
        profile_save_failed: 'N\u00E3o foi poss\u00EDvel guardar as altera\u00E7\u00F5es do perfil. Tente novamente.',
        reauth_password_required: 'A palavra-passe \u00E9 obrigat\u00F3ria.',
        reauth_verifying: 'A verificar...',
        reauth_confirm: 'Confirmar',
        reauth_title: 'Reautentica\u00E7\u00E3o necess\u00E1ria',
        reauth_subtitle: 'Introduza a sua palavra-passe para continuar.',
        reauth_current_password: 'Palavra-passe atual',
        reauth_failed_prefix: 'Falha na reautentica\u00E7\u00E3o: ',
        email_update_relogin_title: 'Atualiza\u00E7\u00E3o de e-mail solicitada',
        back_to_login_page: 'Voltar \u00E0 p\u00E1gina de in\u00EDcio de sess\u00E3o',
        onboarding_welcome_title: 'Bem-vindo ao Benchmarks!',
        onboarding_welcome_subtitle: 'Conclua a configura\u00E7\u00E3o do seu perfil. Um nome de utilizador \u00E9 obrigat\u00F3rio para continuar, enquanto os restantes detalhes s\u00E3o opcionais e podem ser atualizados depois nas defini\u00E7\u00F5es.',
        onboarding_save_continue: 'Guardar e continuar',
        onboarding_saving: 'A guardar...',
        onboarding_username_required: 'O nome de utilizador \u00E9 obrigat\u00F3rio.',
        onboarding_error_prefix: 'Erro ao guardar perfil: ',
        seasonal_place_1st: '#1 Troféu',
        seasonal_place_2nd: '#2 Troféu',
        seasonal_place_3rd: '#3 Troféu',
        accept: 'Aceitar',
        decline: 'Recusar',
        friend_requests_tab: 'Pedidos de amizade',
        received_friend_requests: 'Pedidos de amizade recebidos',
        sent_friend_requests: 'Pedidos de amizade enviados',
        highlights_title: 'Destaques',
        add_highlight_btn: '+ Adicionar destaque',
        highlight_modal_title: 'Adicionar destaque',
        highlight_label_image: 'Imagem',
        highlight_click_upload: 'Clique para carregar uma imagem',
        highlight_title_required_label: 'T\u00EDtulo (obrigat\u00F3rio)',
        highlight_desc_optional_label: 'Descri\u00E7\u00E3o (opcional)',
        highlight_title_placeholder: 'Escreva um t\u00EDtulo...',
        highlight_desc_placeholder: 'Escreva uma descri\u00E7\u00E3o...',
        highlights_empty: 'Ainda n\u00E3o existem destaques.',
        delete: 'Eliminar',
        footer_disclaimer: 'Este site n\\u00E3o \\u00E9 afiliado, mantido, apoiado ou patrocinado pela GraalOnline. Todos os recursos \\u00A9 2026 GraalOnline',
        footer_terms: 'Termos e Condi\\u00E7\\u00F5es',
        footer_privacy: 'Pol\\u00EDtica de Privacidade',
        footer_cookie: 'Pol\\u00EDtica de Cookies',
        footer_dmca: 'Pol\\u00EDtica DMCA',
        views_label: 'Visualiza\\u00E7\\u00F5es',
        exit_view_mode: 'Sair do modo de visualização'
    }
};
Object.keys(I18N_ALLOWED_LOCALE_FIXES).forEach((lang) => {
    if (!I18N[lang]) return;
    I18N[lang] = { ...I18N[lang], ...I18N_ALLOWED_LOCALE_FIXES[lang] };
});

function tForLang(lang, key) {
    const langMap = I18N[lang];
    let candidate = langMap && langMap[key];
    candidate = decodeMojibake(candidate);
    if (typeof candidate === 'string') {
        const hasReplacementGlyph = candidate.includes('Ã¯Â¿Â½');
        const hasRepeatedQuestionMarks = (candidate.match(/\?/g) || []).length >= 2;
        const hasBrokenLatinWord = /[A-Za-z]\?[A-Za-z]/.test(candidate);
        if (hasReplacementGlyph || hasRepeatedQuestionMarks || hasBrokenLatinWord) {
            candidate = null;
        }
        if (key.startsWith('footer_') && candidate && candidate.includes('?')) {
            candidate = null;
        }
    }
    if (candidate) return candidate;
    const fallback = decodeMojibake(I18N.en && I18N.en[key]);
    return fallback || key;
}

function t(key) {
    return tForLang(currentLanguage, key);
}

function tf(key, vars = {}) {
    let out = t(key);
    Object.keys(vars).forEach((name) => {
        out = out.replace(new RegExp(`\\{${name}\\}`, 'g'), String(vars[name]));
    });
    return out;
}

function applyLanguage(lang, persist = true) {
    if (!I18N[lang]) lang = 'en';
    currentLanguage = lang;
    document.documentElement.setAttribute('data-benchmark-lang', lang);
    document.body.setAttribute('data-benchmark-lang', lang);
    if (persist) localStorage.setItem('benchmark_language', lang);
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const value = tForLang(lang, key);
        if (key.startsWith('rule_')) {
            el.innerHTML = value;
        } else {
            el.textContent = value;
        }
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        el.setAttribute('placeholder', tForLang(lang, key));
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        el.setAttribute('title', tForLang(lang, key));
    });
    document.querySelectorAll('.cave-play-edit').forEach(el => {
        el.textContent = t('edit_hint');
    });
    document.querySelectorAll('.radar-tab').forEach(el => {
        const mode = el.dataset.mode;
        if (mode === 'combined') el.textContent = t('radar_tab_combined');
        if (mode === 'swords') el.textContent = t('radar_tab_swords');
        if (mode === 'bombs') el.textContent = t('radar_tab_bombs');
    });
    const langSelect = document.getElementById('languageSelect');
    if (langSelect) langSelect.value = lang;
    if (typeof setupMobileSettingsDropdowns === 'function') {
        setupMobileSettingsDropdowns();
    }
    document.querySelectorAll('.auth-lang-select').forEach(sel => {
        sel.value = lang;
    });
    const confirmCancel = document.getElementById('confirmCancelBtn');
    const confirmOk = document.getElementById('confirmOkBtn');
    if (confirmCancel) confirmCancel.textContent = tForLang(lang, 'cancel');
    if (confirmOk) confirmOk.textContent = tForLang(lang, 'confirm');
    const reauthCancel = document.getElementById('cancelReauthBtn');
    const reauthConfirm = document.getElementById('confirmReauthBtn');
    if (reauthCancel) reauthCancel.textContent = tForLang(lang, 'cancel');
    if (reauthConfirm && !reauthConfirm.disabled) reauthConfirm.textContent = tForLang(lang, 'reauth_confirm');
    const exitViewBtn = document.getElementById('exitViewModeBtn');
    if (exitViewBtn) exitViewBtn.textContent = tForLang(lang, 'exit_view_mode');
    const mobileExitBtn = document.getElementById('mobileExitViewBtn');
    if (mobileExitBtn) mobileExitBtn.textContent = tForLang(lang, 'exit_view_mode');
    const hasProfilePic = Boolean(localStorage.getItem('benchmark_profile_pic'));
    const uploadBtn = document.getElementById('uploadProfilePicBtn');
    const onboardingUploadBtn = document.getElementById('onboardingUploadProfilePicBtn');
    const uploadKey = hasProfilePic ? 'replace_image' : 'upload_image';
    if (uploadBtn) uploadBtn.textContent = tForLang(lang, uploadKey);
    if (onboardingUploadBtn) onboardingUploadBtn.textContent = tForLang(lang, uploadKey);
    const accountMasked = '**************';
    const accountInput = document.getElementById('accountIdDisplay');
    const accountToggle = document.getElementById('toggleAccountIdView');
    if (accountInput && accountToggle) {
        accountToggle.textContent = accountInput.value === accountMasked ? tForLang(lang, 'show') : tForLang(lang, 'hide');
    }
    const friendAccountInput = document.getElementById('friendPageAccountIdDisplay');
    const friendAccountToggle = document.getElementById('friendPageToggleAccountIdView');
    if (friendAccountInput && friendAccountToggle) {
        friendAccountToggle.textContent = friendAccountInput.value === accountMasked ? tForLang(lang, 'show') : tForLang(lang, 'hide');
    }
    const cavePanelSaveBtn = document.querySelector('.cave-play-panel.floating button');
    if (cavePanelSaveBtn) {
        cavePanelSaveBtn.textContent = tForLang(lang, 'save');
    }
    const emailInput = document.getElementById('accountEmailDisplay');
    const emailToggle = document.getElementById('toggleEmailView');
    if (emailInput && emailToggle) {
        emailToggle.textContent = emailInput.value.includes('**************') ? tForLang(lang, 'show') : tForLang(lang, 'hide');
    }
    try {
        renderHighlights();
    } catch (e) {}
    try {
        updateAchievementsProgress();
    } catch (e) {}
    try {
        renderTrophies();
    } catch (e) {}
    try {
        const achievementsModalEl = document.getElementById('achievementsModal');
        if (achievementsModalEl && achievementsModalEl.classList.contains('show')) {
            renderAchievements();
        }
    } catch (e) {}
    try {
        const friendsModalEl = document.getElementById('friendsModal');
        if (friendsModalEl && friendsModalEl.classList.contains('show')) {
            loadFriendsList();
            loadFriendRequests();
            loadRemoveFriendsList();
            loadSentFriendRequests();
        }
    } catch (e) {}
    try {
        renderGuildsList();
    } catch (e) {}
    const current = getCurrentConfig();
    applyMountConfigVisual(current.mount);
    syncResetConfigUI();
    updateCustomSwatches();
    updateCustomThemeUI();
    if (persist) saveSettings();
}

function getRankThemeIndex(themeName) {
    if (!themeName || !themeName.startsWith('rank-')) return null;
    const raw = themeName.slice('rank-'.length);
    const value = Number(raw);
    if (!Number.isFinite(value)) return null;
    return Math.max(0, Math.min(FINAL_RANK_INDEX, Math.floor(value)));
}

function getThemeUnlockRankLimit(config = null) {
    if (isViewMode) return FINAL_RANK_INDEX;
    const targetConfig = config || getCurrentConfig();
    const keys = getConfigLookupKeys(targetConfig);
    const scopedScores = {};
    keys.forEach((key) => {
        if (Array.isArray(savedScores[key])) {
            scopedScores[key] = savedScores[key];
        }
    });
    return calculateRankFromData({ scores: scopedScores });
}

async function applyTheme(themeName, persist = true) {    const rankIndex = getRankThemeIndex(themeName);
    const unlockLimit = getThemeUnlockRankLimit();
    if (rankIndex !== null && rankIndex > unlockLimit) {
        themeName = 'default';
    }
    let resolvedTheme = themeName;
    if (themeName === 'custom') {
        resolvedTheme = 'default';
    }
    const finalTheme = resolvedTheme === 'custom' ? getCustomTheme() : (THEMES[resolvedTheme] || THEMES.default);
    currentTheme = resolvedTheme === 'custom' ? 'custom' : (THEMES[resolvedTheme] ? resolvedTheme : 'default');
    Object.keys(finalTheme).forEach(key => {
        document.documentElement.style.setProperty(key, finalTheme[key]);
    });
    const panelBg = finalTheme['--panel-bg'] || 'rgba(20, 20, 20, 0.6)';
    const panelBorder = finalTheme['--panel-border'] || 'rgba(255, 255, 255, 0.05)';
    const baseAppBg = finalTheme['--app-bg'] || '#050505';
    const themedAppBg = currentTheme === 'default'
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
    const legalAuthorColor = currentTheme === 'default' ? '#9a9a9a' : lightenColor(themeTextBase, 0.38);
    const legalLinkColor = currentTheme === 'default' ? '#9a9a9a' : lightenColor(themeTextBase, 0.32);
    const legalLinkHoverColor = currentTheme === 'default' ? '#bdbdbd' : lightenColor(themeTextBase, 0.5);
    document.documentElement.style.setProperty('--legal-author-color', legalAuthorColor);
    document.documentElement.style.setProperty('--legal-link-color', legalLinkColor);
    document.documentElement.style.setProperty('--legal-link-hover-color', legalLinkHoverColor);
    const caveSaveBtnBg = currentTheme === 'default'
        ? '#f5c645'
        : colorWithAlpha(finalTheme['--app-accent-2'] || panelBorder, 1);
    const caveSaveBtnParsed = parseColorToRgba(caveSaveBtnBg);
    const caveSaveBtnYiq = caveSaveBtnParsed
        ? ((caveSaveBtnParsed.r * 299) + (caveSaveBtnParsed.g * 587) + (caveSaveBtnParsed.b * 114)) / 1000
        : 200;
    const caveSaveBtnText = caveSaveBtnYiq >= 150 ? '#111' : '#f8f8f8';
    const caveSaveBtnBgDark = darkenColor(caveSaveBtnBg, 0.2);
    document.documentElement.style.setProperty('--cave-save-btn-bg', caveSaveBtnBg);
    document.documentElement.style.setProperty('--cave-save-btn-bg-dark', caveSaveBtnBgDark);
    document.documentElement.style.setProperty('--cave-save-btn-text', caveSaveBtnText);
    document.documentElement.style.setProperty('--cave-save-btn-border', currentTheme === 'default' ? '#f5c645' : colorWithAlpha(panelBorder, 0.9));
    const exitViewBtnBg = currentTheme === 'default' ? '#2d2d2d' : caveSaveBtnBg;
    const exitViewBtnBorder = currentTheme === 'default' ? '#3f3f3f' : colorWithAlpha(panelBorder, 0.9);
    const exitViewBtnText = currentTheme === 'default' ? '#f2f2f2' : '#f5f8ff';
    const exitViewBtnOutline = currentTheme === 'default'
        ? 'rgba(0, 0, 0, 0.65)'
        : colorWithAlpha(darkenColor(colorWithAlpha(panelBorder, 1), 0.55), 0.9);
    document.documentElement.style.setProperty('--exit-view-btn-bg', exitViewBtnBg);
    document.documentElement.style.setProperty('--exit-view-btn-border', exitViewBtnBorder);
    document.documentElement.style.setProperty('--exit-view-btn-text', exitViewBtnText);
    document.documentElement.style.setProperty('--exit-view-btn-outline', exitViewBtnOutline);
    const currentRankThemeIndex = getRankThemeIndex(currentTheme);
    let legalBaddyColor = '#9a9a9a';
    if (currentRankThemeIndex !== null && currentRankThemeIndex > 0) {
        legalBaddyColor = RANK_TEXT_COLORS[currentRankThemeIndex] || legalBaddyColor;
    } else if (currentTheme !== 'default') {
        legalBaddyColor = lightenColor(themeTextBase, 0.2);
    }
    document.documentElement.style.setProperty('--legal-baddy-base-color', legalBaddyColor);
    if (typeof window.updateLegalBaddyIcons === 'function') {
        window.updateLegalBaddyIcons(legalBaddyColor);
    }

    updateThemeButtons();
    updateCustomSwatches();
    updateCustomThemeUI();
    updateRadar();
    updateBarGraph();

    if (persist) {
        localStorage.setItem('benchmark_theme', currentTheme);
        
        const key = getConfigKey();
        savedConfigThemes[key] = currentTheme;
        saveSavedConfigThemes().catch(console.error);
        saveSettings().catch(console.error);
    }
    const preview = document.getElementById('settingsPreview');
    const source = document.getElementById('benchmark-content');
    const modal = document.getElementById('settingsModal');
    if (preview && source && modal && modal.classList.contains('show')) {
        const stage = preview.querySelector('.settings-preview-stage');
        if (stage) {
            updateSettingsPreviewLayout(preview, source, stage);
        } else {
            buildSettingsPreview();
        }
    }
}

function updateThemeButtons() {
    const unlockLimit = getThemeUnlockRankLimit();
    document.querySelectorAll('.theme-option').forEach(btn => {
        const theme = btn.getAttribute('data-theme') || '';
        const rankIndex = getRankThemeIndex(theme);
        const locked = rankIndex !== null && rankIndex > unlockLimit;
        btn.classList.toggle('locked', locked);
        btn.disabled = locked;
        btn.classList.toggle('active', theme === currentTheme);
    });
    renderCustomThemeList();
}

function loadCustomThemeState() {
    const storedEnabled = localStorage.getItem('benchmark_custom_theme_enabled');
    customThemeEnabled = storedEnabled === 'true';
    const storedName = localStorage.getItem('benchmark_custom_theme_name');
    if (storedName && storedName.trim()) {
        customThemeName = storedName.trim().slice(0, 16);
    }
}

function loadRankThemeUnlock() {
    const raw = localStorage.getItem(THEME_UNLOCK_STORAGE_KEY);
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) {
        maxUnlockedRankIndex = Math.max(0, Math.min(FINAL_RANK_INDEX, Math.floor(parsed)));
        return;
    }
    maxUnlockedRankIndex = 0;
}

function updateRankThemeUnlock(currentRankIndex) {
    if (isViewMode) return false;
    const rank = Math.max(0, Math.min(FINAL_RANK_INDEX, Math.floor(currentRankIndex)));
    if (rank <= maxUnlockedRankIndex) return false;
    maxUnlockedRankIndex = rank;
    localStorage.setItem(THEME_UNLOCK_STORAGE_KEY, String(maxUnlockedRankIndex));
    saveSettings();
    return true;
}

function validateRankUnlock() {
    if (isViewMode) return;
    const calculatedMax = calculateRankFromData({ scores: savedScores });
    if (maxUnlockedRankIndex !== calculatedMax) {
        maxUnlockedRankIndex = calculatedMax;
        localStorage.setItem(THEME_UNLOCK_STORAGE_KEY, String(maxUnlockedRankIndex));
        saveSettings();
        updateThemeButtons();
    }
}

function loadAutoRankThemeSetting() {
    autoRankThemeEnabled = localStorage.getItem(AUTO_RANK_THEME_STORAGE_KEY) === 'true';
}

function saveAutoRankThemeSetting() {
    if (isViewMode) return;
    localStorage.setItem(AUTO_RANK_THEME_STORAGE_KEY, autoRankThemeEnabled ? 'true' : 'false');
    saveSettings();
}

function syncAutoRankThemeUI() {
    const select = document.getElementById('autoRankThemeSelect');
    if (!select) return;
    select.value = autoRankThemeEnabled ? 'on' : 'off';
}

function saveCustomThemeState() {
    if (isViewMode) return;
    localStorage.setItem('benchmark_custom_theme_enabled', customThemeEnabled ? 'true' : 'false');
    localStorage.setItem('benchmark_custom_theme_name', customThemeName);
    saveSettings();
}

function updateCustomThemeUI() {
    const customCard = document.getElementById('customThemeCard');
    const nameInput = document.getElementById('customThemeName');
    const saveBtn = document.getElementById('saveCustomThemeNameBtn');
    const removeBtn = document.getElementById('removeCustomThemeBtn');
    const customLocked = currentTheme !== 'custom';
    const canRemove = savedCustomThemes.some(theme => theme.name === customThemeName);

    if (customCard) customCard.classList.toggle('is-disabled', customLocked);
    if (nameInput) {
        nameInput.value = (customThemeName && customThemeName !== 'Custom') ? customThemeName : '';
        nameInput.disabled = false;
    }
    if (saveBtn) saveBtn.disabled = false;
    if (removeBtn) removeBtn.disabled = !customThemeEnabled || !canRemove;
    renderCustomThemeList();
}

function updateSettingsPreviewLayout(preview, source, stage) {
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

function buildSettingsPreview() {
    const preview = document.getElementById('settingsPreview');
    const source = document.getElementById('benchmark-content');
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

function loadCustomThemeHex() {
    const raw = localStorage.getItem('benchmark_custom_theme_hex');
    if (!raw) {
        customThemeHex = { ...CUSTOM_THEME_HEX_DEFAULTS };
        return;
    }
    try {
        const parsed = JSON.parse(raw) || {};
        customThemeHex = { ...CUSTOM_THEME_HEX_DEFAULTS, ...parsed };
    } catch (e) {
        customThemeHex = { ...CUSTOM_THEME_HEX_DEFAULTS };
    }
}

function getCustomTheme() {
    if (!customThemeHex || !Object.keys(customThemeHex).length) {
        loadCustomThemeHex();
    }
    const theme = { ...CUSTOM_THEME_DEFAULT };
    Object.keys(CUSTOM_THEME_META).forEach(key => {
        const hex = customThemeHex[key] || CUSTOM_THEME_HEX_DEFAULTS[key];
        if (!hex) return;
        const baseHex = CUSTOM_THEME_HEX_DEFAULTS[key] || hex;
        const blendedHex = blendHex(baseHex, hex, CUSTOM_THEME_SUBTLE);
        const meta = CUSTOM_THEME_META[key];
        theme[key] = meta.alpha === null ? blendedHex : hexToRgba(blendedHex, meta.alpha);
    });
    return theme;
}

function saveCustomThemeHex() {
    if (isViewMode) return;
    localStorage.setItem('benchmark_custom_theme_hex', JSON.stringify(customThemeHex));
    saveSettings();
}

function loadSavedCustomThemes() {
    const raw = localStorage.getItem('benchmark_saved_custom_themes');
    if (!raw) {
        savedCustomThemes = [];
        return;
    }
    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            savedCustomThemes = parsed.filter(item => item && item.name && item.hex);
        } else {
            savedCustomThemes = [];
        }
    } catch (e) {
        savedCustomThemes = [];
    }
}

function saveSavedCustomThemes() {
    if (isViewMode) return;
    localStorage.setItem('benchmark_saved_custom_themes', JSON.stringify(savedCustomThemes));
    saveSettings();
}

function getCustomThemeHexSnapshot() {
    if (!customThemeHex || !Object.keys(customThemeHex).length) {
        loadCustomThemeHex();
    }
    return { ...CUSTOM_THEME_HEX_DEFAULTS, ...customThemeHex };
}

function renderCustomThemeList() {
    const list = document.getElementById('customThemeList');
    if (!list) return;
    list.innerHTML = '';
    if (!savedCustomThemes.length) return;
    savedCustomThemes.forEach(theme => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'custom-theme-chip';
        btn.textContent = theme.name;
        btn.classList.toggle('active', currentTheme === 'custom' && customThemeName === theme.name);
        btn.addEventListener('click', () => {
            customThemeEnabled = true;
            customThemeName = theme.name;
            customThemeHex = { ...CUSTOM_THEME_HEX_DEFAULTS, ...theme.hex };
            saveCustomThemeState();
            saveCustomThemeHex();
            localStorage.setItem('benchmark_theme_user_selected', 'true');
            applyTheme('custom');
            updateCustomSwatches();
            updateCustomThemeUI();
        });
        list.appendChild(btn);
    });
}

let pickerHue = 0;
let pickerSat = 1;
let pickerVal = 1;

function populateCustomTargetSelect() {
    const select = document.getElementById('customThemeTarget');
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

function updatePickerUI() {
    const svPicker = document.getElementById('svPicker');
    const svThumb = document.getElementById('svThumb');
    const hueSlider = document.getElementById('hueSlider');
    const hueThumb = document.getElementById('hueThumb');
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

function setPickerFromHex(hex) {
    const rgb = hexToRgb(hex);
    if (!rgb) return;
    const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
    pickerHue = hsv.h;
    pickerSat = hsv.s;
    pickerVal = hsv.v;
    updatePickerUI();
}

function updateCustomSwatches() {
    if (!customThemeHex || !Object.keys(customThemeHex).length) {
        loadCustomThemeHex();
    }
    populateCustomTargetSelect();
    const targetSelect = document.getElementById('customThemeTarget');
    const preview = document.getElementById('customColorPreview');
    const hexInput = document.getElementById('customHexInput');
    if (!targetSelect) return;
    const target = targetSelect.value;
    const hex = customThemeHex[target] || CUSTOM_THEME_HEX_DEFAULTS[target] || '#ffffff';
    if (preview) preview.style.backgroundColor = hex;
    if (hexInput) hexInput.value = hex.toUpperCase();
    setPickerFromHex(hex);
}

function initCustomThemePicker() {
    const targetSelect = document.getElementById('customThemeTarget');
    const svPicker = document.getElementById('svPicker');
    const hueSlider = document.getElementById('hueSlider');
    const hexInput = document.getElementById('customHexInput');
    const preview = document.getElementById('customColorPreview');
    if (!targetSelect || !svPicker || !hueSlider) return;

    populateCustomTargetSelect();
    updateCustomSwatches();

    targetSelect.addEventListener('change', () => {
        updateCustomSwatches();
    });

    const applyCurrentColor = () => {
        const target = targetSelect.value;
        const rgb = hsvToRgb(pickerHue, pickerSat, pickerVal);
        const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
        customThemeHex[target] = hex;
        saveCustomThemeHex();
        applyTheme('custom');
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
                updateCustomSwatches();
                return;
            }
            const target = targetSelect.value;
            customThemeHex[target] = value.toUpperCase();
            saveCustomThemeHex();
            applyTheme('custom');
            updateCustomSwatches();
        });
    }
}

async function handleProfileLink() {
    const params = new URLSearchParams(window.location.search);
    let profileId = params.get('id');
    const requestedSlug = getRequestedProfileSlugFromPath();
    let profileDocFromSlug = null;
    const currentUser = await waitForAuthInitialization();

    if (!profileId && requestedSlug) {
        // Fast-path: if the slug matches the signed-in user, skip heavy lookup work.
        if (currentUser) {
            try {
                const myDoc = await getDoc(doc(db, 'users', currentUser.uid));
                if (myDoc.exists()) {
                    const mine = myDoc.data() || {};
                    const mineProfile = (mine.profile && typeof mine.profile === 'object') ? mine.profile : {};
                    const mineUsername = mine.username || mineProfile.username || currentUser.displayName || 'player';
                    const mineAccountId = mine.accountId || getRuntimeAccountId();
                    const mySlug = buildProfileSlug(mineUsername, mineAccountId, currentUser.uid);
                    if (mySlug === requestedSlug) {
                        return;
                    }
                }
            } catch (ownResolveErr) {
                console.warn('Failed to resolve own slug fallback:', ownResolveErr);
            }
        }
        profileDocFromSlug = await resolveProfileDocBySlug(requestedSlug, { allowFallback: false });
        if (profileDocFromSlug) profileId = profileDocFromSlug.id;
    }
    if (!profileId) {
        if (requestedSlug && !currentUser) {
            showPrivateProfileOverlay();
            hidePageLoader();
        }
        return;
    }

    if (currentUser && currentUser.uid === profileId) {
        // Already viewing own profile route (slug or id). Do not redirect,
        // otherwise login auto-redirect and this branch can create a loop.
        return;
    }

    const loader = document.getElementById('pageLoader');
    if (loader) loader.style.display = 'flex';
    const loaderSafetyTimeout = setTimeout(() => {
        hidePageLoader({ immediate: true });
    }, 12000);

    try {
        const docSnap = profileDocFromSlug && profileDocFromSlug.id === profileId
            ? profileDocFromSlug
            : await getDoc(doc(db, 'users', profileId));
        if (!docSnap.exists()) {
            console.warn('Profile route did not resolve to a user document:', profileId);
            hidePageLoader();
            return;
        }

        const data = docSnap.data();
        const settings = data.settings || {};
        const visibility = settings.visibility || 'everyone';

        if (visibility === 'friends') {
            
            let isAllowed = false;
            if (currentUser) {
                if (currentUser.uid === profileId) {
                    isAllowed = true;
                } else {
                    // Check Friends
                    const friends = data.friends || [];
                    if (friends.includes(currentUser.uid)) {
                        isAllowed = true;
                    } else {
                        // Check Guilds
                        try {
                            const currentUserDoc = await getDoc(doc(db, 'users', currentUser.uid));
                            if (currentUserDoc.exists()) {
                                const myData = currentUserDoc.data();
                                const myGuilds = (myData.profile && myData.profile.guilds) || [];
                                const targetGuilds = (data.profile && data.profile.guilds) || [];
                                
                                const hasCommonGuild = myGuilds.some(g => targetGuilds.includes(g));
                                if (hasCommonGuild) isAllowed = true;
                            }
                        } catch (err) {
                            console.error("Error fetching viewer profile for guild check", err);
                        }
                    }
                }
            }

            if (!isAllowed) {
                showPrivateProfileOverlay();
                hidePageLoader();
                return;
            }
        }

        await enterViewMode(data, profileId);
        hidePageLoader();

    } catch (e) {
        console.error("Error loading profile from link:", e);
        hidePageLoader();
    } finally {
        clearTimeout(loaderSafetyTimeout);
    }
}

function hasRequestedProfileRoute() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('id')) return true;
    return !!getRequestedProfileSlugFromPath();
}

function getCurrentConfig() {
    const platformText = document.getElementById('platformText');
    const timeText = document.getElementById('timeText');
    const statText = document.getElementById('statText');
    const mountBox = document.getElementById('mountBox');
    const mountValue = mountBox ? mountBox.dataset.value : DEFAULT_MOUNT_CONFIG;
    return {
        platform: platformText ? platformText.textContent : 'Mobile',
        time: timeText ? timeText.textContent : '5 Min',
        stat: statText ? statText.textContent : 'Baddy Kills',
        mount: normalizeMountConfig(mountValue)
    };
}

function buildConfigKey(platform, time, stat, mount = DEFAULT_MOUNT_CONFIG) {
    return `${platform}|${time}|${stat}|${normalizeMountConfig(mount)}`;
}

function formatConfigLabel(platform, time, stat, mount = DEFAULT_MOUNT_CONFIG) {
    return `${platform} - ${time} - ${stat} - ${getMountConfigLabel(mount, currentLanguage)}`;
}

function getAllConfigKeys() {
    const keys = [];
    CONFIG_OPTIONS.platform.forEach(platform => {
        CONFIG_OPTIONS.time.forEach(time => {
            CONFIG_OPTIONS.stat.forEach(stat => {
                CONFIG_OPTIONS.mount.forEach(mount => {
                    keys.push({ platform, time, stat, mount, key: buildConfigKey(platform, time, stat, mount) });
                });
            });
        });
    });
    return keys;
}

function syncResetConfigUI() {
    const current = getCurrentConfig();
    const resetPlatform = document.getElementById('resetPlatform');
    const resetTime = document.getElementById('resetTime');
    const resetStat = document.getElementById('resetStat');
    if (resetPlatform) resetPlatform.value = current.platform;
    if (resetTime) resetTime.value = current.time;
    if (resetStat) resetStat.value = current.stat;
}

function applyConfig(config, options = {}) {
    const animateRowTransition = options.animateRowTransition === true;
    const platformText = document.getElementById('platformText');
    const timeText = document.getElementById('timeText');
    const statText = document.getElementById('statText');

    saveCurrentScores();

    if (platformText && config.platform) {
        platformText.textContent = config.platform;
        if (config.platform === 'Mobile') platformText.style.color = '#2196F3';
        if (config.platform === 'PC') platformText.style.color = '#F44336';
    }
    if (timeText && config.time) timeText.textContent = config.time;
    if (statText && config.stat) statText.textContent = config.stat;
    if (config.mount) applyMountConfigVisual(config.mount);

    const keyCandidates = getConfigLookupKeys();
    let themeForConfig = 'default';
    for (const key of keyCandidates) {
        if (savedConfigThemes[key]) {
            themeForConfig = savedConfigThemes[key];
            break;
        }
    }
    applyTheme(themeForConfig, false);

    lastMainRankIndex = -1;
    loadScores();
    updateScoreRequirements({ preserveRowFillStates: animateRowTransition });
    syncResetConfigUI();
    loadCaveLinks();
}

function readDefaultConfig() {
    const raw = localStorage.getItem('benchmark_default_config');
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

function getStartupConfigDefaults() {
    return {
        platform: CONFIG_OPTIONS.platform[0] || 'Mobile',
        time: CONFIG_OPTIONS.time[0] || '5 Min',
        stat: CONFIG_OPTIONS.stat[0] || 'Baddy Kills',
        mount: normalizeMountConfig((CONFIG_OPTIONS.mount && CONFIG_OPTIONS.mount[0]) || DEFAULT_MOUNT_CONFIG)
    };
}

function syncSettingsUI() {
    const stored = readDefaultConfig();
    const base = stored || getStartupConfigDefaults();
    const defaultPlatform = document.getElementById('defaultPlatform');
    const defaultTime = document.getElementById('defaultTime');
    const defaultStat = document.getElementById('defaultStat');
    const defaultMount = document.getElementById('defaultMount');
    if (defaultPlatform) defaultPlatform.value = base.platform;
    if (defaultTime) defaultTime.value = base.time;
    if (defaultStat) defaultStat.value = base.stat;
    if (defaultMount) defaultMount.value = normalizeMountConfig(base.mount || DEFAULT_MOUNT_CONFIG);
    updateThemeButtons();
    syncAutoRankThemeUI();
    syncResetConfigUI();
    updateCustomSwatches();
    updateCustomThemeUI();
}

function applyStoredSettings() {
    const storedLang = localStorage.getItem('benchmark_language') || 'en';
    const storedTheme = localStorage.getItem('benchmark_theme') || 'default';
    const userSelectedTheme = localStorage.getItem('benchmark_theme_user_selected') === 'true';
    const themeToApply = userSelectedTheme ? storedTheme : 'default';
    loadCustomThemeState();
    loadSavedCustomThemes();
    loadCustomThemeHex();
    loadRankThemeUnlock();
    loadSavedConfigThemes();
    loadAutoRankThemeSetting();
    loadPacmanSetting();
    applyLanguage(storedLang, false);

    const storedConfig = readDefaultConfig();
    if (storedConfig) {
        applyConfig(storedConfig);
    } else {
        const keyCandidates = getConfigLookupKeys();
        let theme = themeToApply;
        for (const key of keyCandidates) {
            if (savedConfigThemes[key]) {
                theme = savedConfigThemes[key];
                break;
            }
        }
        applyTheme(theme, false);
        loadScores();
        updateScoreRequirements();
        loadCaveLinks();
    }
    validateRankUnlock();

    syncSettingsUI();
    injectPacmanSettingUI();
}

function setupMountDropdown() {
    const mountBox = document.getElementById('mountBox');
    if (!mountBox) return;
    const menu = mountBox.querySelector('.dropdown-menu');
    if (!menu) return;
    
    menu.innerHTML = '';
    CONFIG_OPTIONS.mount.forEach(mount => {
        const item = document.createElement('div');
        item.className = 'dropdown-item';
        item.dataset.value = mount;
        const img = document.createElement('img');
        img.src = MOUNT_CONFIG_IMAGES[mount];
        img.className = 'mount-option-image';
        img.alt = getMountConfigLabel(mount, currentLanguage);
        item.appendChild(img);
        menu.appendChild(item);
    });
}

function setupConfigDropdowns() {
    const configs = [
        { boxId: 'platformBox', key: 'platform' },
        { boxId: 'timeBox', key: 'time' },
        { boxId: 'statBox', key: 'stat' },
        { boxId: 'mountBox', key: 'mount' },
        { boxId: 'userMenuBox', key: null }
    ];

    const closeAll = (exceptBox = null) => {
        configs.forEach(({ boxId }) => {
            const box = document.getElementById(boxId);
            if (!box || box === exceptBox) return;
            const menu = box.querySelector('.dropdown-menu');
            const arrow = box.querySelector('.arrow-icon');
            if (menu) menu.classList.remove('show');
            if (arrow) arrow.classList.remove('rotate');
        });
    };

    configs.forEach(({ boxId, key }) => {
        const box = document.getElementById(boxId);
        if (!box) return;
        const menu = box.querySelector('.dropdown-menu');
        const arrow = box.querySelector('.arrow-icon');
        if (!menu) return;

        menu.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (key) {
                    const value = item.getAttribute('data-value') || item.textContent.trim();
                    if (!value) return;
                    const current = getCurrentConfig();
                    const nextConfig = { ...current, [key]: value };
                    applyConfig(nextConfig, { animateRowTransition: true });
                }
                closeAll();
                menu.classList.remove('show');
                updateNotificationVisibility();
                if (arrow) arrow.classList.remove('rotate');
            });
        });

        box.addEventListener('click', (e) => {
            if (e.target && e.target.classList.contains('dropdown-item')) return;
            e.stopPropagation();
            const willOpen = !menu.classList.contains('show');
            closeAll(box);
            if (willOpen) {
                menu.classList.add('show');
                if (arrow) arrow.classList.add('rotate');
            } else {
                menu.classList.remove('show');
                if (arrow) arrow.classList.remove('rotate');
            }
            updateNotificationVisibility();
        });
    });

    document.addEventListener('click', (e) => {
        if (e.target.closest('.small-inner-box')) return;
        closeAll();
        updateNotificationVisibility();
    });
}

function updateNotificationVisibility() {
    const userMenuDot = document.getElementById('userMenuNotification');
    const friendsBtnDot = document.getElementById('friendsBtnNotification');
    const tabDot = document.getElementById('requestsTabNotification');
    
    if (!hasPendingRequests) {
        if (userMenuDot) userMenuDot.style.display = 'none';
        if (friendsBtnDot) friendsBtnDot.style.display = 'none';
        if (tabDot) tabDot.style.display = 'none';
        return;
    }

    const friendsModal = document.getElementById('friendsModal');
    const friendsModalOpen = friendsModal && friendsModal.classList.contains('show');
    const userMenuBox = document.getElementById('userMenuBox');
    const userMenuOpen = userMenuBox && userMenuBox.querySelector('.dropdown-menu').classList.contains('show');

    if (friendsModalOpen) {
        if (userMenuDot) userMenuDot.style.display = 'none';
        if (friendsBtnDot) friendsBtnDot.style.display = 'none';
        const requestsTabActive = tabFriendRequests && tabFriendRequests.classList.contains('active');
        if (tabDot) tabDot.style.display = requestsTabActive ? 'none' : 'block';
    } else {
        if (userMenuDot) userMenuDot.style.display = userMenuOpen ? 'none' : 'block';
        if (friendsBtnDot) friendsBtnDot.style.display = userMenuOpen ? 'block' : 'none';
        if (tabDot) tabDot.style.display = 'none';
    }
}

function performResetCurrentScores() {
    document.querySelectorAll('.score-input').forEach(input => {
        input.value = '0';
    });
    document.querySelectorAll('.score-text-overlay').forEach(overlay => {
        overlay.textContent = '0';
    });
    const key = getConfigKey();
    delete savedScores[key];
    saveSavedScores();
    updateAllRatings();
}

function resetSelectedScores() {
    const current = getCurrentConfig();
    const selection = {
        platform: document.getElementById('resetPlatform')?.value || current.platform,
        time: document.getElementById('resetTime')?.value || current.time,
        stat: document.getElementById('resetStat')?.value || current.stat,
        mount: current.mount
    };
    const selectedKey = buildConfigKey(selection.platform, selection.time, selection.stat, selection.mount);
    
    showConfirmModal(t('settings_reset_selected'), t('reset_confirm'), () => {
        if (selectedKey === getConfigKey()) {
            performResetCurrentScores();
        } else {
            delete savedScores[selectedKey];
            saveSavedScores();
        }
    });
}

function resetAllConfigurations() {
    showConfirmModal(t('settings_reset_all'), t('reset_all_confirm'), () => {
        Object.keys(savedScores).forEach(key => delete savedScores[key]);
        saveSavedScores();
        performResetCurrentScores();
    });
}

function calculateSingleRating(score, thresholds) {
    score = Number(score);
    if (!score || score <= 0 || thresholds.length < 13) return 0;

    const T = thresholds;

    if (score >= T[12]) {
        return 1300;
    }

    for (let i = 11; i >= 0; i--) {
        if (score >= T[i]) {
            const baseRating = (i + 1) * 100;
            const lowerBound = T[i];
            const upperBound = T[i + 1];
            const range = upperBound - lowerBound;
            
            const progress = (range > 0) ? (score - lowerBound) / range : 0;
            return Math.round(baseRating + (progress * 100));
        }
    }

    if (score < T[0]) {
        const progress = (T[0] > 0) ? score / T[0] : 0;
        return Math.round(progress * 100);
    }

    return 0;
}

function getRomanSubRank(progressPercent) {
    const value = Number.isFinite(progressPercent) ? progressPercent : 0;
    const clamped = Math.max(0, Math.min(100, value));
    if (clamped >= 80) return 'I';
    if (clamped >= 60) return 'II';
    if (clamped >= 40) return 'III';
    if (clamped >= 20) return 'IV';
    return 'V';
}

function getRowProgressTarget(score, thresholds) {
    if (!Array.isArray(thresholds) || thresholds.length === 0) return 0;
    let tierIndex = thresholds.length;
    for (let i = 0; i < thresholds.length; i++) {
        if (score < thresholds[i]) {
            tierIndex = i;
            break;
        }
    }
    if (tierIndex >= thresholds.length) return thresholds.length;
    const lowerBound = tierIndex > 0 ? thresholds[tierIndex - 1] : 0;
    const upperBound = thresholds[tierIndex];
    const range = upperBound - lowerBound;
    let pct = 0;
    if (range > 0) {
        pct = (score - lowerBound) / range;
    }
    pct = Math.max(0, Math.min(1, pct));
    return tierIndex + pct;
}

function getRowFillColorForProgress(progressValue, thresholdCount) {
    const maxTier = Math.max(0, thresholdCount);
    const tier = Math.max(0, Math.min(maxTier, Math.floor(progressValue)));
    let colorIndex = tier;
    if (colorIndex === 0) colorIndex = 1; // Keep unranked visible.
    return RANK_COLORS[colorIndex] || RANK_COLORS[RANK_COLORS.length - 1];
}

function renderRowBarProgress(bars, progressValue, fillColor) {
    bars.forEach((bar, i) => {
        if (i < 2) return;
        const tierIndex = i - 2;
        const pct = Math.max(0, Math.min(100, (progressValue - tierIndex) * 100));
        bar.style.setProperty('--fill-percent', `${pct}%`);
        bar.style.setProperty('--fill-color', fillColor);
        bar.style.setProperty('--fill-duration', '0ms');
    });
}

async function updateMainProgressBarAndRanks() {
    const totalRating = individualRatings.reduce((sum, rating) => sum + rating, 0);
    const maxRating = 18200;
    const progressBar = document.querySelector('.progress-bar');

    // Find current rank index
    let currentRankIndex = 0;
    for (let i = RANK_THRESHOLDS.length - 1; i > 0; i--) {
        if (totalRating >= RANK_THRESHOLDS[i]) {
            currentRankIndex = i;
            break;
        }
    }

    const rankChanged = lastMainRankIndex !== null && currentRankIndex !== lastMainRankIndex;
    const shouldAnimateRankUp = rankChanged && currentRankIndex > 0;

    // Calculate progress within the current rank tier
    const lowerBound = RANK_THRESHOLDS[currentRankIndex];
    const upperBound = (currentRankIndex + 1 < RANK_THRESHOLDS.length) ? RANK_THRESHOLDS[currentRankIndex + 1] : maxRating;

    const range = upperBound - lowerBound;
    const progressInRank = (range > 0) ? Math.min(100, ((totalRating - lowerBound) / range) * 100) : (totalRating >= upperBound ? 100 : 0);
    const progressDelta = Math.abs(progressInRank - lastProgressInRank);
    const progressTierDelta = (progressDelta / 100) * 13;
    const mainFillDuration = (progressDelta <= 0.001)
        ? 0
        : Math.min(1000, Math.max(260, progressTierDelta * 300));

    // --- Update Main Progress Bar ---
    if (progressBar) {
        // Update text content and style
        const span = progressBar.querySelector('span');
        const fill = progressBar.querySelector('.progress-fill');
        if (span) {
            span.textContent = `${totalRating}/${upperBound}`;
        }

        // Update background style
        if (totalRating > 0) {
            let colorIndex = currentRankIndex;
            if (colorIndex === 0) colorIndex = 1; // Use Iron color for Unranked so progress is visible
            const startColor = RANK_COLORS[colorIndex];
            if (fill) {
                fill.style.setProperty('--main-fill-duration', `${mainFillDuration}ms`);
                const innerWidth = Math.max(0, progressBar.clientWidth);
                const rawWidth = (progressInRank / 100) * innerWidth;
                const visualWidth = Math.min(innerWidth, Math.max(rawWidth, 0));
                fill.style.width = `${visualWidth}px`;
                fill.style.backgroundColor = startColor;
            }
        } else {
            if (fill) {
                fill.style.setProperty('--main-fill-duration', '0ms');
                fill.style.width = '0px';
            }
        }

        // Update Rank Lines Color
        const rankLines = progressBar.querySelectorAll('.rank-line');
        const originalColor = currentRankIndex === 0 ? '#444' : RANK_COLORS[currentRankIndex];
        const activeColor = RANK_LINE_COLORS[currentRankIndex] || '#444';
        const linePositions = [21.5, 41.5, 61.5, 81.5];
        const totalDuration = 600; // ms, matches CSS transition duration

        rankLines.forEach((line, index) => {
            const threshold = linePositions[index];
            const isActive = progressInRank > threshold;
            let delay = 0;

            if (isActive && lastProgressInRank <= threshold && progressInRank > lastProgressInRank) {
                const totalDist = progressInRank - lastProgressInRank;
                const distToThreshold = threshold - lastProgressInRank;
                delay = (distToThreshold / totalDist) * totalDuration;
            } else if (!isActive && lastProgressInRank > threshold && progressInRank < lastProgressInRank) {
                const totalDist = lastProgressInRank - progressInRank;
                const distToThreshold = lastProgressInRank - threshold;
                delay = (distToThreshold / totalDist) * totalDuration;
            }

            line.style.transitionDelay = `${Math.max(0, delay)}ms`;
            const lineColor = isActive ? activeColor : originalColor;
            line.style.background = `linear-gradient(to bottom, transparent, ${lineColor} 15%, ${lineColor} 85%, transparent)`;
        });
    }

    // --- Update Rank Display Box ---
    const rankBox = document.querySelector('.rounded-inner-box');
    if (rankBox) {
        const romanContainer = document.querySelector('.roman-numerals-container');
        let name;
        const rankColor = RANK_TEXT_COLORS[currentRankIndex] || '#ffffff';
        rankBox.style.setProperty('--rank-up-color', hexToRgba(rankColor, 0.55));
        rankBox.style.setProperty('--rank-up-color-soft', hexToRgba(rankColor, 0.25));

        if (totalRating >= 18200) {
            name = "Aeternus Complete";
        } else {
            const subRank = getRomanSubRank(progressInRank);
            name = `${RANK_NAMES[currentRankIndex]}&nbsp;<span style="font-family: 'Times New Roman', Times, serif;">${subRank}</span>`;
        }
        
        if (romanContainer) {
            romanContainer.style.visibility = 'visible';
            romanContainer.style.opacity = '1';
        }

        if (currentRankIndex === 0) {
            rankBox.innerHTML = name;
            rankBox.style.color = '';
            const oldStyle = document.getElementById('dynamic-honeycomb-style');
            if (oldStyle) oldStyle.remove();
            rankBox.classList.remove('rank-up');
        } else {
            let filter = '';
            let eternalLayerStyle = '';
            let glowStyle = '';
            let textStyle = `color: ${RANK_TEXT_COLORS[currentRankIndex]};`;

            switch(currentRankIndex) {
                case 1: filter = 'grayscale(100%)'; break;
                case 2: filter = 'sepia(1) hue-rotate(-35deg) saturate(3) brightness(0.65)'; break;
                case 3: filter = 'grayscale(100%) brightness(1.3)'; break;
                case 4: filter = 'sepia(1) hue-rotate(5deg) saturate(2.5) brightness(0.9)'; break;
                case 5: filter = 'sepia(1) hue-rotate(130deg) saturate(1.5) brightness(1.1)'; break;
                case 6: filter = 'sepia(1) hue-rotate(170deg) saturate(3) brightness(1.0)'; break;
                case 7: filter = 'sepia(1) hue-rotate(220deg) saturate(3) brightness(0.9)'; break;
                case 8: filter = 'sepia(1) hue-rotate(10deg) saturate(5) brightness(1.2)'; break;
                case 9: filter = 'sepia(1) hue-rotate(330deg) saturate(5) brightness(0.8)'; break;
                case 10: filter = 'sepia(1) hue-rotate(120deg) saturate(2) brightness(0.9)'; break;
                case 11: 
                    filter = STELLAR_TROPHY_FILTER; 
                    eternalLayerStyle = `background: linear-gradient(110deg, #FF6F00 20%, #FF8F00 40%, #FFA000 48%, #FFB300 50%, #FFA000 52%, #FF8F00 60%, #FF6F00 80%); background-size: 200% auto; animation: eternalTrophyShimmer 2.5s linear infinite;`;
                    textStyle = `background: linear-gradient(110deg, #FF6F00 20%, #FF8F00 40%, #FFA000 48%, #FFB300 50%, #FFA000 52%, #FF8F00 60%, #FF6F00 80%); background-size: 200% auto; -webkit-background-clip: text; background-clip: text; color: transparent; animation: eternalShimmer 2.5s linear infinite;`;
                    break;
                case 12: 
                    filter = 'grayscale(100%)'; 
                    eternalLayerStyle = `background: linear-gradient(110deg, #D8007F 20%, #E91E63 35%, #F06292 45%, #FF80AB 50%, #F06292 55%, #E91E63 65%, #D8007F 80%); background-size: 300% auto; animation: eternalTrophyShimmer 2.5s linear infinite;`;
                    textStyle = `background: linear-gradient(110deg, #D8007F 20%, #E91E63 35%, #F06292 45%, #FF80AB 50%, #F06292 55%, #E91E63 65%, #D8007F 80%); background-size: 200% auto; -webkit-background-clip: text; background-clip: text; color: transparent; animation: eternalShimmer 2.5s linear infinite;`;
                    break;
                case 13: 
                    filter = 'sepia(1) hue-rotate(310deg) saturate(1.8) brightness(0.8)'; 
                    eternalLayerStyle = `background: linear-gradient(110deg, #763232 20%, #a64747 35%, #d67c7c 45%, #ffffff 50%, #d67c7c 55%, #a64747 65%, #763232 80%); background-size: 200% auto; animation: eternalTrophyShimmer 2.5s linear infinite;`;
                    textStyle = `background: linear-gradient(110deg, #763232 20%, #a64747 35%, #d67c7c 45%, #ffffff 50%, #d67c7c 55%, #a64747 65%, #763232 80%); background-size: 200% auto; -webkit-background-clip: text; background-clip: text; color: transparent; animation: eternalShimmer 2.5s linear infinite;`;
                    break;
            }

            // --- Honeycomb Background ---
            if (currentRankIndex !== lastMainRankIndex) {
                const rankColor = RANK_TEXT_COLORS[currentRankIndex] || '#ffffff';
                const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='49'><path d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5z' fill='none' stroke='${rankColor}' stroke-width='2' opacity='0.4'/></svg>`;
                const encodedSvg = btoa(svg);
                const bgImage = `url("data:image/svg+xml;base64,${encodedSvg}")`;
                const isMobileMask = window.innerWidth <= 900;
                const mobileMaskY = isMobileMask ? '170px' : 'var(--honeycomb-mask-y)';
                const baseMask = isMobileMask
                    ? `radial-gradient(ellipse 114px 80px at var(--rank-center-x) 50%, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.96) 30%, rgba(0, 0, 0, 0.78) 50%, rgba(0, 0, 0, 0.42) 66%, transparent 82%)`
                    : `radial-gradient(ellipse var(--honeycomb-mask-x) ${mobileMaskY} at var(--rank-center-x) 46%, rgba(0, 0, 0, 0.95) 0%, rgba(0, 0, 0, 0.85) 45%, rgba(0, 0, 0, 0.35) 70%, transparent 88%)`;
                const blendMask = `linear-gradient(to bottom, transparent 0%, rgba(0, 0, 0, 0.85) 18%, rgba(0, 0, 0, 0.85) 82%, transparent 100%)`;
                const combinedMask = isMobileMask ? baseMask : `${baseMask}, ${blendMask}`;
                const maskRepeat = isMobileMask ? 'no-repeat' : 'no-repeat, no-repeat';
                const webkitComposite = isMobileMask ? 'source-over' : 'source-in';
                const stdComposite = isMobileMask ? 'add' : 'intersect';

                const oldStyle = document.getElementById('dynamic-honeycomb-style');
                if (oldStyle) oldStyle.remove();

                const style = document.createElement('style');
                style.id = 'dynamic-honeycomb-style';
                style.innerHTML = `
                    .rounded-inner-box::before {
                        content: '';
                        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                        background-image: ${bgImage}, ${bgImage};
                        background-size: 14px 24.5px;
                        background-position: 0 0, 7px 12.25px;
                        background-repeat: repeat;
                        -webkit-mask-image: ${combinedMask};
                        mask-image: ${combinedMask};
                        -webkit-mask-repeat: ${maskRepeat};
                        mask-repeat: ${maskRepeat};
                        -webkit-mask-composite: ${webkitComposite};
                        mask-composite: ${stdComposite};
                        z-index: -1;
                        pointer-events: none;
                    }
                `;
                document.head.appendChild(style);
            }

            const existingText = rankBox.querySelector('.rank-up-text');
            if (currentRankIndex === lastMainRankIndex && existingText) {
                if (existingText.innerHTML !== name) {
                    existingText.innerHTML = name;
                }
            } else {
                rankBox.innerHTML = `
                    <div class="rank-up-content" style="display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; z-index: 1;">
                        <div style="position: relative; height: 50px; display: inline-block;">
                            <img src="../icons/trophy.png" class="rank-up-trophy" style="height: 100%; width: auto; filter: ${filter}; position: relative; z-index: 2; display: block;">
                            ${eternalLayerStyle ? `<div class="eternal-layer-main" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; -webkit-mask: url(#trophy-mask); mask: url(#trophy-mask); mix-blend-mode: overlay; z-index: 3; ${eternalLayerStyle}"></div>` : ''}
                            
                        </div>
                        <span class="rank-up-text" style="${textStyle} margin-top: 5px; display: block; line-height: 1.2;">${name}</span>
                    </div>
                `;
            }
        }

        if (shouldAnimateRankUp) {
            rankBox.classList.remove('rank-up');
        }
    }

    const unlockedNow = updateRankThemeUnlock(currentRankIndex);
    if (unlockedNow) updateThemeButtons();
    if (autoRankThemeEnabled && rankChanged && currentRankIndex > lastMainRankIndex && currentRankIndex > 0) {
    if (!isViewMode) localStorage.setItem('benchmark_theme_user_selected', 'true');
    await applyTheme(`rank-${currentRankIndex}`, !isViewMode);
}
const currentThemeRank = getRankThemeIndex(currentTheme);
    if (autoRankThemeEnabled && currentThemeRank !== null && currentThemeRank > currentRankIndex) {
    const fallbackTheme = currentRankIndex > 0 ? `rank-${currentRankIndex}` : 'default';
    if (!isViewMode) localStorage.setItem('benchmark_theme_user_selected', 'true');
    await applyTheme(fallbackTheme, !isViewMode);
}

    lastProgressInRank = progressInRank;
    lastMainRankIndex = currentRankIndex;

    // --- Update Slanted Boxes (All rows) ---
    const rows = document.querySelectorAll('.ranks-bars');
    const inputs = document.querySelectorAll('.score-input');

    rows.forEach((row, rowIndex) => {
        const bars = row.querySelectorAll('.rank-bar');
        const input = inputs[rowIndex];
        if (!input) return;

        const currentScore = Number(input.value);

        const thresholds = allRowThresholds[rowIndex] || allRowThresholds[0] || [];
        const targetProgress = getRowProgressTarget(currentScore, thresholds);
        const targetFillColor = getRowFillColorForProgress(targetProgress, thresholds.length);
        if (!rowFillAnimationStates[rowIndex]) {
            rowFillAnimationStates[rowIndex] = { value: targetProgress, rafId: null };
        }
        const state = rowFillAnimationStates[rowIndex];
        if (!Number.isFinite(state.value)) state.value = targetProgress;
        if (state.rafId) {
            cancelAnimationFrame(state.rafId);
            state.rafId = null;
        }

        const paint = (progressValue) => {
            renderRowBarProgress(bars, progressValue, targetFillColor);
        };

        const delta = targetProgress - state.value;
        if (Math.abs(delta) <= 0.0001) {
            row.classList.add('instant-update');
            state.value = targetProgress;
            paint(state.value);
            return;
        }

        row.classList.remove('instant-update');
        const startValue = state.value;
        const duration = Math.min(1000, Math.max(260, Math.abs(delta) * 300));
        const startTime = performance.now();

        const step = (now) => {
            const t = Math.min(1, (now - startTime) / duration);
            const eased = 1 - Math.pow(1 - t, 3);
            state.value = startValue + (delta * eased);
            paint(state.value);
            if (t < 1) {
                state.rafId = requestAnimationFrame(step);
            } else {
                state.value = targetProgress;
                paint(state.value);
                state.rafId = null;
            }
        };

        state.rafId = requestAnimationFrame(step);
    });
}

function updateAllRatings() {
    syncMobileHoneycombMask();
    const scoreInputs = document.querySelectorAll('.score-input');
    const ratingValueDivs = document.querySelectorAll('.rating-value');

    scoreInputs.forEach((input, index) => {
        const score = Number(input.value);
        const thresholds = allRowThresholds[index] || allRowThresholds[0] || [];
        individualRatings[index] = calculateSingleRating(score, thresholds);
    });

    const groups = [
        [0, 1],
        [2, 3],
        [4, 5],
        [6],
        [7, 8],
        [9, 10],
        [11, 12],
        [13]
    ];

    ratingValueDivs.forEach((div, index) => {
        if (index < groups.length) {
            const groupIndices = groups[index];
            const combinedRating = groupIndices.reduce((sum, i) => sum + individualRatings[i], 0);
            div.textContent = combinedRating;

            let maxRank = 0;
            groupIndices.forEach(i => {
                const rating = individualRatings[i];
                const rank = rating >= 100 ? Math.min(13, Math.floor(rating / 100)) : 0;
                if (rank > maxRank) maxRank = rank;
            });

            div.style.background = '';
            div.style.webkitBackgroundClip = '';
            div.style.backgroundClip = '';
            div.style.color = 'white';
            div.style.animation = '';
            div.style.backgroundSize = '';

            if (combinedRating > 0) {
                div.style.color = SCORE_TEXT_COLORS[maxRank];
            } else {
                div.style.color = 'white';
            }
        }
    });

    if (ratingUpdateRafId) cancelAnimationFrame(ratingUpdateRafId);
    ratingUpdateRafId = requestAnimationFrame(() => {
        updateMainProgressBarAndRanks();
        updateRowColors();
        updateRadar();
        updateBarGraph();
        ratingUpdateRafId = null;
    });
}

let radarMode = 'combined';
const RADAR_MODE_STORAGE_KEY = 'benchmark_radar_mode';
const RADAR_MODE_ORDER = ['combined', 'swords', 'bombs'];
let radarLabelsCache = [];

function getRadarPalette(mode) {
    if (mode === 'combined') return { type: 'dual', swords: '#ef4444', bombs: '#3b82f6' };
    if (mode === 'bombs') return { type: 'single', color: '#3b82f6' };
    return { type: 'single', color: '#ef4444' };
}

function getCaveLabels() {
    const rows = document.querySelectorAll('.ranks-bars');
    if (!rows.length) return [];
    return Array.from(rows).map(row => {
        const cells = row.querySelectorAll('.rank-bar');
        const labelCell = cells[1];
        if (!labelCell) return 'Cave';
        const text = (labelCell.textContent || '').replace(/\s+/g, ' ').trim();
        return text || 'Cave';
    });
}

function getRadarRatings() {
    return Array.from(document.querySelectorAll('.score-input')).map((input, index) => {
        const score = Number(input.value);
        if (!Number.isFinite(score) || score <= 0) return 0;
        const thresholds = allRowThresholds[index] || allRowThresholds[0] || [];
        let rating = calculateSingleRating(score, thresholds);
        const topThreshold = thresholds[12];
        if (Number.isFinite(topThreshold) && topThreshold > 0 && score > topThreshold) {
            const bonus = Math.round(((score - topThreshold) / topThreshold) * 100);
            rating = 1300 + bonus;
        }
        return rating;
    });
}

function getRadarData() {
    if (!radarLabelsCache.length) {
        radarLabelsCache = getCaveLabels();
    }
    const rawScores = getRadarRatings();
    const total = rawScores.length;
    if (!total) return { labels: [], values: [], rawValues: [] };
    const half = Math.floor(total / 2);
    const swords = rawScores.slice(0, half);
    const bombs = rawScores.slice(half);

    if (radarMode === 'bombs') {
        const maxValue = Math.max(1, ...bombs);
        return {
            labels: radarLabelsCache.slice(half, half + bombs.length),
            values: bombs.map(val => Math.max(0, Math.min(1, val / maxValue))),
            rawValues: bombs,
            maxValue,
            splitIndex: half
        };
    }

    if (radarMode === 'combined') {
        const labels = radarLabelsCache.slice(0, total);
        const maxValue = Math.max(1, ...rawScores);
        const swordsValues = new Array(total).fill(0);
        const bombsValues = new Array(total).fill(0);
        for (let i = 0; i < total; i++) {
            const value = Math.max(0, Math.min(1, rawScores[i] / maxValue));
            if (i < half) swordsValues[i] = value;
            else bombsValues[i] = value;
        }
        return {
            labels,
            values: rawScores.map(val => Math.max(0, Math.min(1, val / maxValue))),
            rawValues: rawScores,
            maxValue,
            splitIndex: half,
            swordsValues,
            bombsValues
        };
    }

    const maxValue = Math.max(1, ...swords);
    return {
        labels: radarLabelsCache.slice(0, swords.length),
        values: swords.map(val => Math.max(0, Math.min(1, val / maxValue))),
        rawValues: swords,
        maxValue,
        splitIndex: half
    };
}

function resizeRadarCanvas(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const ratio = dpr > 1 ? Math.min(3, Math.ceil(dpr)) : 1;
    const width = Math.max(canvas.clientWidth, 1);
    const height = Math.max(canvas.clientHeight, 1);
    const nextWidth = Math.floor(width * ratio);
    const nextHeight = Math.floor(height * ratio);
    if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
        canvas.width = nextWidth;
        canvas.height = nextHeight;
    }
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    return ctx;
}

function drawRadarChart(canvas, labels, datasets) {
    if (!canvas || !labels.length || !datasets || !datasets.length) return;
    const ctx = resizeRadarCanvas(canvas);
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    ctx.clearRect(0, 0, width, height);

    const computed = getComputedStyle(document.documentElement);
    const gridColor = computed.getPropertyValue('--panel-border').trim() || 'rgba(255,255,255,0.12)';
    const textColor = computed.getPropertyValue('--app-text').trim() || '#e0e0e0';

    const centerX = width / 2;
    const centerY = height / 2;
    const isMobile = window.innerWidth <= 900;
    const isSmallMobile = window.innerWidth <= 400;
    const is412x915 =
        isMobile &&
        window.innerWidth >= 400 &&
        window.innerWidth <= 430 &&
        window.innerHeight >= 880 &&
        window.innerHeight <= 940;
    const radius = Math.min(width, height) * (isMobile ? (isSmallMobile ? 0.29 : 0.38) : 0.34);
    const rings = 4;

    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.6;
    for (let i = 1; i <= rings; i++) {
        const r = radius * (i / rings);
        ctx.beginPath();
        ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
        ctx.stroke();
    }

    const count = labels.length;
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count - Math.PI / 2;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(x, y);
        ctx.stroke();
    }

    ctx.globalAlpha = 1;
    ctx.lineWidth = 2;
    datasets.forEach(dataset => {
        if (!dataset || !dataset.values || !dataset.values.length) return;
        const color = dataset.color || '#ffffff';
        ctx.strokeStyle = color;
        ctx.fillStyle = hexToRgba(color, 0.2);
        ctx.beginPath();
        dataset.values.forEach((value, i) => {
            const angle = (Math.PI * 2 * i) / count - Math.PI / 2;
            const r = radius * value;
            const x = centerX + Math.cos(angle) * r;
            const y = centerY + Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    });

    ctx.fillStyle = textColor;
    ctx.font = isMobile ? '8px Arial, sans-serif' : '7px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    const labelRadius = radius + (isSmallMobile ? 12 : 18);
    const crisp = (value) => Math.round(value);
    labels.forEach((label, i) => {
        const angle = (Math.PI * 2 * i) / count - Math.PI / 2;
        let x = centerX + Math.cos(angle) * labelRadius;
        const y = centerY + Math.sin(angle) * labelRadius;
        if (is412x915 && Math.abs(Math.cos(angle)) > 0.6) {
            // Only nudge left/right labels inward on 412x915-like viewports.
            x += (centerX - x) * 0.12;
        }
        ctx.fillText(label, crisp(x), crisp(y));
    });
}

function drawPieChart(canvas, swordsTotal, bombsTotal) {
    if (!canvas) return;
    const ctx = resizeRadarCanvas(canvas);
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    ctx.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;
    const total = swordsTotal + bombsTotal;
    
    // Pacman Mode Logic
    const isPacman = pacmanModeEnabled;
    const shouldRenderPacman = isPacman && total > 0 && swordsTotal !== bombsTotal && swordsTotal > 0 && bombsTotal > 0;
    
    const isMobile = window.innerWidth <= 900;
    const isSmallMobile = window.innerWidth <= 400;
    const baseRadius = Math.min(width, height) * (isMobile ? (isSmallMobile ? 0.30 : 0.36) : 0.44);

    const slices = [
        { label: 'Swords', value: swordsTotal, color: '#ef4444' },
        { label: 'Bombs', value: bombsTotal, color: '#3b82f6' }
    ].map(slice => ({
        ...slice,
        angle: total > 0 ? (slice.value / total) * Math.PI * 2 : 0
    }));

    if (shouldRenderPacman) {
        // Determine big and small slices
        const sorted = [...slices].sort((a, b) => b.value - a.value);
        const big = sorted[0];
        const small = sorted[1]; // might be undefined if only 1 slice, but logic holds
        
        if (big) {
            big.color = '#FFEB3B'; // Yellow
        }
        if (small) {
            small.color = '#ffffff'; // White
        }
    }

    if (total <= 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2);
        ctx.fill();
        return;
    }

    const maxIndex = slices.reduce((maxIdx, slice, idx) => {
        if (slice.value > slices[maxIdx].value) return idx;
        return maxIdx;
    }, 0);

    const minVisualAngle = 0.18;
    const totalAngle = Math.PI * 2;
    let displayAngles = slices.map(slice => slice.angle);
    if (slices[0].angle > 0 && slices[1].angle > 0) {
        const smallIndex = slices[0].angle < slices[1].angle ? 0 : 1;
        if (slices[smallIndex].angle < minVisualAngle) {
            displayAngles[smallIndex] = minVisualAngle;
            displayAngles[1 - smallIndex] = totalAngle - minVisualAngle;
        }
    }
    slices.forEach((slice, idx) => {
        slice.displayAngle = displayAngles[idx];
    });

    const hasTwoSlices = slices[0].value > 0 && slices[1].value > 0;
    const shouldExplode = hasTwoSlices;
    const popOut = shouldExplode ? 10 : 0;
    const gapWidth = 6;
    const fixedLabelGap = 32;
    const edgePadding = isMobile ? 14 : 8;
    const iconSize = isMobile ? 16 : 20;
    const iconTextGap = isMobile ? 8 : 12;
    const labelGap = 6;
    const blockHeight = iconSize + iconTextGap + 12 + labelGap + 12;
    const blockHalfHeight = blockHeight / 2;

    ctx.font = '10px Arial, sans-serif';
    const getIconDrawSize = (img, targetArea = null) => {
        if (!img || !img.naturalWidth || !img.naturalHeight) {
            return { width: iconSize, height: iconSize };
        }
        let scale = iconSize / Math.max(img.naturalWidth, img.naturalHeight);
        if (targetArea && targetArea > 0) {
            const areaScale = Math.sqrt(targetArea / (img.naturalWidth * img.naturalHeight));
            scale = Math.min(scale, areaScale);
        }
        return {
            width: img.naturalWidth * scale,
            height: img.naturalHeight * scale
        };
    };
    const swordImgRef = document.getElementById('radarSwordIcon');
    const swordDrawRef = getIconDrawSize(swordImgRef);
    const swordAreaRef = swordDrawRef.width * swordDrawRef.height;

    let start = -Math.PI / 2;
    slices.forEach((slice, index) => {
        if (slice.displayAngle <= 0) {
            start += slice.displayAngle;
            return;
        }
        const isMax = index === maxIndex && popOut > 0;
        const radius = baseRadius + (isMax ? popOut : 0);
        ctx.save();
        if (isMax) {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
            ctx.shadowBlur = 8;
            ctx.shadowOffsetY = 2;
        }
        ctx.fillStyle = slice.color;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, start, start + slice.displayAngle);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();
        start += slice.displayAngle;

        // Draw Pacman Eye
        if (shouldRenderPacman && index === maxIndex) {
            let eyeAngle;
            if (index === 0) {
                eyeAngle = (start - slice.displayAngle) + (slice.displayAngle * 0.15);
            } else {
                eyeAngle = start - (slice.displayAngle * 0.15);
            }
            const eyeDist = radius * 0.70;
            const eyeX = centerX + Math.cos(eyeAngle) * eyeDist;
            const eyeY = centerY + Math.sin(eyeAngle) * eyeDist;
            const eyeRadius = radius * 0.085;
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(eyeX, eyeY, eyeRadius, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    if (shouldExplode) {
        const dividerAngles = [
            -Math.PI / 2,
            -Math.PI / 2 + slices[0].displayAngle
        ];
        const cutRadius = baseRadius + popOut + 4;
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineCap = 'round';
        dividerAngles.forEach(angle => {
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineWidth = gapWidth;
            ctx.lineTo(centerX + Math.cos(angle) * cutRadius, centerY + Math.sin(angle) * cutRadius);
            ctx.stroke();
        });
        ctx.restore();
    }

    start = -Math.PI / 2;
    ctx.textBaseline = 'middle';
    slices.forEach((slice, index) => {
        if (slice.displayAngle <= 0) {
            start += slice.displayAngle;
            return;
        }
        const mid = start + slice.displayAngle / 2;
        const isMax = index === maxIndex && popOut > 0;

        ctx.fillStyle = slice.color;
        const percent = Math.round((slice.value / total) * 100);
        const label = slice.label;
        const percentLabel = percent === 0 && slice.value > 0 ? '<1%' : `${percent}%`;
        const labelWidth = ctx.measureText(label).width;
        const percentWidth = ctx.measureText(percentLabel).width;
        const iconIdForSize = label.toLowerCase() === 'swords' ? 'radarSwordIcon' : 'radarBombIcon';
        const iconImgForSize = document.getElementById(iconIdForSize);
        const iconDraw = iconIdForSize === 'radarBombIcon'
            ? getIconDrawSize(iconImgForSize, swordAreaRef)
            : getIconDrawSize(iconImgForSize);
        const textWidth = Math.max(labelWidth, percentWidth, iconDraw.width);
        const blockHalfWidth = textWidth / 2;
        const labelRadius = baseRadius + fixedLabelGap + (isMax ? popOut : 0);
        const bounds = {
            minX: edgePadding + blockHalfWidth,
            maxX: width - edgePadding - blockHalfWidth,
            minY: edgePadding + blockHalfHeight,
            maxY: height - edgePadding - blockHalfHeight
        };
        const iconKey = label.toLowerCase() === 'swords' ? 'sword' : 'bomb';
        let centerLabelX;
        let centerLabelY;
        const cosMid = Math.cos(mid);
        const sinMid = Math.sin(mid);
        const outwardExtra = isMobile ? (isSmallMobile ? 8 : 12) : 8;
        const desiredRadius = labelRadius + outwardExtra;
        const minOutsideRadius = baseRadius + (isMax ? popOut : 0) + 8;
        const inBounds = (x, y) =>
            x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY;
        let chosen = null;
        for (let r = desiredRadius; r >= minOutsideRadius; r -= 2) {
            const maxDelta = Math.PI * 0.75;
            const step = 0.04;
            for (let delta = 0; delta <= maxDelta; delta += step) {
                const candidates = delta === 0 ? [mid] : [mid + delta, mid - delta];
                let found = false;
                for (const ang of candidates) {
                    const x = centerX + Math.cos(ang) * r;
                    const y = centerY + Math.sin(ang) * r;
                    if (inBounds(x, y)) {
                        chosen = { x, y };
                        found = true;
                        break;
                    }
                }
                if (found) break;
            }
            if (chosen) break;
        }
        if (chosen) {
            centerLabelX = chosen.x;
            centerLabelY = chosen.y;
        } else {
            // Last resort: keep visible even if we can't keep full outside distance.
            centerLabelX = Math.max(bounds.minX, Math.min(bounds.maxX, centerX + cosMid * desiredRadius));
            centerLabelY = Math.max(bounds.minY, Math.min(bounds.maxY, centerY + sinMid * desiredRadius));
        }

    const labelY = Math.round(centerLabelY);
    const percentY = Math.round(centerLabelY + 12);
    const iconCenterY = Math.round(centerLabelY - (iconDraw.height / 2 + iconTextGap));

        const iconId = iconKey === 'sword' ? 'radarSwordIcon' : 'radarBombIcon';
        const iconImg = document.getElementById(iconId);
    const labelCenterAlignedX = Math.round(centerLabelX);
    if (iconImg && iconImg.complete) {
        const rotation = -Math.PI * 1.5;
        ctx.save();
            ctx.translate(labelCenterAlignedX, iconCenterY);
            ctx.rotate(rotation);
            const drawSize = iconId === 'radarBombIcon'
                ? getIconDrawSize(iconImg, swordAreaRef)
                : getIconDrawSize(iconImg);
            ctx.drawImage(iconImg, -drawSize.width / 2, -drawSize.height / 2, drawSize.width, drawSize.height);
            ctx.restore();
        }
        ctx.textAlign = 'center';
        ctx.globalAlpha = 0.95;
        ctx.fillText(label, centerLabelX, labelY);
        ctx.globalAlpha = 0.7;
        ctx.fillText(percentLabel, centerLabelX, percentY);
        ctx.textAlign = 'center';
        ctx.globalAlpha = 1;
        start += slice.displayAngle;
    });

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2);
    ctx.stroke();
}

function drawBarGraph(canvas, data) {
    if (!canvas || !data || !data.length) return;
    const ctx = resizeRadarCanvas(canvas);
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    ctx.clearRect(0, 0, width, height);

    const computed = getComputedStyle(document.documentElement);
    const textColor = computed.getPropertyValue('--app-text').trim() || '#e0e0e0';
    const gridColor = computed.getPropertyValue('--panel-border').trim() || 'rgba(255,255,255,0.12)';

    const isMobile = window.innerWidth <= 900;
    const isSmallMobile = window.innerWidth <= 400;
    const padding = isMobile ? { top: 20, bottom: 30, left: 25, right: 5 } : { top: 20, bottom: 30, left: 45, right: 10 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const count = data.length;
    const barWidth = (chartWidth / count) * 0.4; 
    const spacing = (chartWidth / count) * 0.6; 
    
    // Find max value for scaling
    let maxVal = 0;
    data.forEach(d => { if(d.value > maxVal) maxVal = d.value; });
    if (maxVal < 1300) maxVal = 1300;
    maxVal = Math.ceil(maxVal / 100) * 100;

    const barColors = {
        'Rats': '#9D8F84',
        'Bats': '#41384B',
        'Lizardrons': '#1A361B',
        'Pyrats': '#A0140E',
        'Rebels': '#008000',
        'Dark Blobs': '#58554E',
        'Spiders': '#BD6B29'
    };

    // Draw L-shaped axis
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, height - padding.bottom);
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.stroke();

    // Draw Y-axis numbers
    ctx.fillStyle = textColor;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.font = isMobile ? (isSmallMobile ? '8px Arial, sans-serif' : '10px Arial, sans-serif') : '9px Arial, sans-serif';
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
        const val = (maxVal / steps) * i;
        const y = (height - padding.bottom) - ((val / maxVal) * chartHeight);
        ctx.fillText(Math.round(val), padding.left - 6, y);
        
        // Small tick mark
        if (val > 0 && i < steps) {
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(padding.left - 3, y);
            ctx.stroke();
        }
    }

    ctx.font = isMobile ? (isSmallMobile ? '7px Arial, sans-serif' : '9px Arial, sans-serif') : '9px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    data.forEach((item, i) => {
        const x = padding.left + (i * (barWidth + spacing)) + spacing / 2;
        const barHeight = (item.value / maxVal) * chartHeight;
        const y = padding.top + (chartHeight - barHeight);

        // Get color for the bar
        const barColor = barColors[item.label] || 'rgba(255, 255, 255, 0.15)';

        // Draw a full-width colored guide line at each bar peak.
        if (item.value > 0) {
            ctx.strokeStyle = barColor;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();
        }

        // Draw bar
        ctx.fillStyle = barColor;
        ctx.fillRect(x, y, barWidth, barHeight);
        
        // Draw border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, barWidth, barHeight);

        // Draw label
        ctx.fillStyle = textColor;
        ctx.fillText(item.label, x + barWidth / 2, padding.top + chartHeight + 8); // Adjusted label position

        // Draw value on top
        if (item.value > 0) {
            ctx.font = isMobile ? (isSmallMobile ? '7px Arial, sans-serif' : '9px Arial, sans-serif') : '9px Arial, sans-serif';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.fillText(Math.round(item.value), x + barWidth / 2, y - 14); // Adjusted value position
        }
    });

}

function updateBarGraph() {
    const canvas = document.getElementById('radarBar');
    if (!canvas) return;

    const ratings = getRadarRatings();
    // Indices: 0:Mercy, 1:Ruin, 2:Rats1, 3:Rats2, 4:Bats1, 5:Bats2, 6:Liz4, 7:Pyrats1, 8:PCS1, 9:Rebels4, 10:RCS4, 11:DB2, 12:DBCS2, 13:Spiders1
    
    const categories = [
        { name: 'Rats',       weights: [[2,1], [3,1], [0,0.5], [1,0.5], [9,0.25], [10,0.05], [11,0.05], [12,0.05]] },
        { name: 'Bats',       weights: [[0,0.5], [1,0.5], [4,1], [5,1]] },
        { name: 'Lizardrons', weights: [[6,1]] },
        { name: 'Pyrats',     weights: [[7,1], [8,1]] },
        { name: 'Rebels',     weights: [[9,0.75], [10,0.95]] },
        { name: 'Dark Blobs', weights: [[11,0.95], [12,0.95]] },
        { name: 'Spiders',    weights: [[13,1]] }
    ];

    let filteredCategories = categories;
    if (radarMode === 'swords') {
        filteredCategories = categories.filter(c => ['Rats', 'Bats', 'Lizardrons'].includes(c.name));
    } else if (radarMode === 'bombs') {
        filteredCategories = categories.filter(c => !['Rats', 'Bats', 'Lizardrons'].includes(c.name));
    }

    const data = filteredCategories.map(cat => {
        let sum = 0;
        let totalWeight = 0;
        cat.weights.forEach(w => {
            const idx = w[0];
            const weight = w[1];
            sum += (ratings[idx] || 0) * weight;
            totalWeight += weight;
        });
        const avg = totalWeight > 0 ? sum / totalWeight : 0;
        return { label: cat.name, value: avg };
    });

    drawBarGraph(canvas, data);
}

function updateRadarLists(items, palette, mode, splitIndex = 0) {
    const strongList = document.getElementById('radarStrongList');
    const weakList = document.getElementById('radarWeakList');
    if (!strongList || !weakList) return;
    const getItemColor = (itemIndex) => {
        if (palette && palette.type === 'dual') {
            return itemIndex < splitIndex ? palette.swords : palette.bombs;
        }
        return palette ? palette.color : '#ffffff';
    };

    const filtered = items.filter(item => item.value > 0);
    const baseStrong = items.slice(0, 3);
    const baseWeak = items.slice(-3).reverse();
    let strongest = [];
    let weakest = [];

    const sortedStrong = filtered.slice().sort((a, b) => {
        if (b.value !== a.value) return b.value - a.value;
        return a.index - b.index;
    });
    const sortedWeak = filtered.slice().sort((a, b) => {
        if (a.value !== b.value) return a.value - b.value;
        return a.index - b.index;
    });

    const padList = (list, fallback) => {
        const result = [...list];
        fallback.forEach(item => {
            if (result.length >= 3) return;
            if (!result.some(entry => entry.index === item.index)) {
                result.push(item);
            }
        });
        return result.slice(0, 3);
    };

    if (mode === 'swords' || mode === 'bombs') {
        if (filtered.length === 0) {
            strongest = baseStrong;
            weakest = baseWeak;
        } else if (filtered.length < 3) {
            strongest = padList(sortedStrong, baseStrong);
            weakest = padList(sortedWeak, baseWeak);
        } else {
            strongest = sortedStrong.slice(0, 3);
            weakest = sortedWeak.slice(0, 3);
        }
    } else {
        if (filtered.length === 0) {
            strongest = baseStrong;
            weakest = baseWeak;
        } else if (filtered.length < 3) {
            strongest = padList(sortedStrong, baseStrong);
            weakest = padList(sortedWeak, baseWeak);
        } else {
            strongest = sortedStrong.slice(0, 3);
            weakest = sortedWeak.slice(0, 3);
        }
    }

    const renderList = (list, data) => {
        list.innerHTML = '';
        data.forEach(item => {
            const row = document.createElement('div');
            row.className = 'radar-stat-item';
            row.style.setProperty('--radar-color', getItemColor(item.index));
            row.innerHTML = `
                <span>${item.label}</span>
                <span class="radar-stat-value">${item.percent}%</span>
                <div class="radar-bar"><span style="width:${item.percent}%;"></span></div>
            `;
            list.appendChild(row);
        });
    };

    renderList(strongList, strongest);
    renderList(weakList, weakest);
}

function updateRadar() {
    const canvas = document.getElementById('radarCanvas');
    if (!canvas) return;
    const data = getRadarData();
    if (!data.labels.length) return;
    const swordIcon = document.getElementById('radarSwordIcon');
    const bombIcon = document.getElementById('radarBombIcon');
    const palette = getRadarPalette(radarMode);
    let datasets = [];
    if (palette && palette.type === 'dual') {
        datasets = [
            { values: data.bombsValues || [], color: palette.bombs },
            { values: data.swordsValues || [], color: palette.swords }
        ];
    } else {
        datasets = [{ values: data.values, color: palette ? palette.color : '#ffffff' }];
    }
    drawRadarChart(canvas, data.labels, datasets);

    const maxValue = data.maxValue || Math.max(1, ...data.rawValues);
    const items = data.labels.map((label, index) => {
        const raw = data.rawValues[index] || 0;
        const percent = Math.round(Math.max(0, Math.min(1, raw / maxValue)) * 100);
        return { label, value: raw, percent, index };
    });
    updateRadarLists(items, palette, radarMode, data.splitIndex || 0);

    const donutCanvas = document.getElementById('radarDonut');
    const rawScores = getRadarRatings();
    const half = Math.floor(rawScores.length / 2);
    const swordsTotal = rawScores.slice(0, half).reduce((sum, val) => sum + val, 0);
    const bombsTotal = rawScores.slice(half).reduce((sum, val) => sum + val, 0);
    const iconsReady = (!swordIcon || swordIcon.complete) && (!bombIcon || bombIcon.complete);
    if (iconsReady) {
        drawPieChart(donutCanvas, swordsTotal, bombsTotal);
    } else {
        let remaining = 0;
        const refresh = () => {
            remaining -= 1;
            if (remaining <= 0) {
                updateRadar();
            }
        };
        if (swordIcon && !swordIcon.complete) {
            remaining += 1;
            swordIcon.addEventListener('load', refresh, { once: true });
        }
        if (bombIcon && !bombIcon.complete) {
            remaining += 1;
            bombIcon.addEventListener('load', refresh, { once: true });
        }
        drawPieChart(donutCanvas, swordsTotal, bombsTotal);
    }
}

function setRadarMode(nextMode, persist = true) {
    const mode = RADAR_MODE_ORDER.includes(nextMode) ? nextMode : 'combined';
    radarMode = mode;
    document.querySelectorAll('.radar-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.mode === mode);
    });
    // Persistence removed as per request
    updateRadar();
    updateBarGraph();
}

function cycleRadarMode() {
    const next = radarMode === 'bombs' ? 'combined' : 'bombs';
    setRadarMode(next);
}

function setupRadarTabs() {
    const tabs = document.querySelectorAll('.radar-tab');
    if (!tabs.length) return;
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            setRadarMode(tab.dataset.mode || 'swords');
        });
    });
}

document.querySelectorAll('.score-input').forEach((input, index) => {
    input.addEventListener('focus', function() {
        if (isViewMode) return;
        if (!auth.currentUser) {
            window.location.href = getBenchmarkLoginUrl();
            return;
        }

        focusedInputIndex = index;
        updateRowColors();

        if (this.value === '0') {
            this.value = '';
            const overlay = this.parentElement ? this.parentElement.querySelector('.score-text-overlay') : null;
            if (overlay) overlay.textContent = '';
        } else {
            setTimeout(() => {
                this.setSelectionRange(this.value.length, this.value.length);
            }, 0);
        }
    });

    input.addEventListener('input', function() {
        if (isViewMode) return;
        this.value = this.value.replace(/[^0-9]/g, '');
        const overlay = this.parentElement.querySelector('.score-text-overlay');
        if (overlay) {
            overlay.textContent = this.value;
        }
        updateAllRatings();
        saveCurrentScores();
    });

    input.addEventListener('blur', function() {
        if (isViewMode) return;
        focusedInputIndex = -1;

        if (this.value === '') {
            this.value = '0';
        }
        const overlay = this.parentElement.querySelector('.score-text-overlay');
        if (overlay) {
            overlay.textContent = this.value;
        }
        updateAllRatings();
        saveCurrentScores();
    });
});

setupRadarTabs();
setRadarMode('combined', false);
const radarCanvas = document.getElementById('radarCanvas');
const radarDonut = document.getElementById('radarDonut');
// Removed 1/2/3 keyboard shortcuts for radar modes.

function updateScoreRequirements(options = {}) {
    const preserveRowFillStates = options.preserveRowFillStates === true;
    const rows = document.querySelectorAll('.ranks-bars');
    const baseScores = getBaseScoresForConfig();
    allRowThresholds = [];
    individualRatings = new Array(rows.length).fill(0);
    rowFillAnimationStates.forEach(state => {
        if (state && state.rafId) cancelAnimationFrame(state.rafId);
    });
    if (!preserveRowFillStates) {
        rowFillAnimationStates = [];
    }

    rows.forEach((row, rowIndex) => {
        const bars = row.querySelectorAll('.rank-bar');
        if (!bars.length) return;
        const base = Number(baseScores[rowIndex] ?? baseScores[0] ?? 0);
        const values = new Array(15);
        values[14] = base;

        for (let i = 13; i >= 2; i--) {
            const steps = 14 - i;
            const decrease = steps * 0.05;
            values[i] = Math.max(0, Math.round(base * (1 - decrease)));
        }

        allRowThresholds[rowIndex] = values.slice(2);

        for (let i = 14; i >= 2; i--) {
            const box = bars[i];
            if (!box) continue;
            box.innerHTML = `<span style="transform: skewX(40deg); display: inline-block; color: #fff; font-size: 12px; font-weight: bold; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">${values[i]}</span>`;
            box.style.display = 'flex';
            box.style.alignItems = 'center';
            box.style.justifyContent = 'center';
        }
    });

    updateAllRatings();
}

function setupCavePlayEditors() {
    if (isViewMode) return;
    if (cavePlayInit) return;
    cavePlayInit = true;

    const icons = document.querySelectorAll('.cave-play-icon');
    if (!icons.length) return;

    let activeWrapper = null;
    let closeTimer = null;
    const floatingPanel = document.createElement('div');
    floatingPanel.className = 'cave-play-panel floating';
    floatingPanel.innerHTML = `
        <div class="cave-play-panel-body">
            <input type="url" placeholder="https://youtu.be/..." />
            <div class="cave-play-error" style="display: none; color: #ff6666; font-size: 11px; margin-top: 4px;"></div>
            <button type="button">${escapeHtml(t('save'))}</button>
        </div>
    `;
    document.body.appendChild(floatingPanel);

    const floatingInput = floatingPanel.querySelector('input');
    const floatingSave = floatingPanel.querySelector('button');
    const floatingError = floatingPanel.querySelector('.cave-play-error');

    const closeFloating = (instant = false) => {
        if (closeTimer) {
            clearTimeout(closeTimer);
            closeTimer = null;
        }
        if (instant) {
            floatingPanel.classList.remove('open', 'closing');
            floatingPanel.style.display = 'none';
        } else if (floatingPanel.classList.contains('open')) {
            floatingPanel.classList.remove('open');
            floatingPanel.classList.add('closing');
            closeTimer = setTimeout(() => {
                floatingPanel.classList.remove('closing');
                floatingPanel.style.display = 'none';
            }, 190);
        } else {
            floatingPanel.classList.remove('closing');
            floatingPanel.style.display = 'none';
        }
        if (activeWrapper) {
            activeWrapper.classList.remove('panel-open');
            activeWrapper = null;
        }
        document.querySelectorAll('.cave-play-wrapper.panel-open').forEach(el => {
            el.classList.remove('panel-open');
        });
        document.querySelectorAll('.container.cave-panel-open').forEach(container => {
            container.classList.remove('cave-panel-open');
        });
    };

    const positionFloating = () => {
        if (!activeWrapper) return;
        const anchor = activeWrapper.querySelector('.cave-play-icon') || activeWrapper;
        const rect = anchor.getBoundingClientRect();
        const panelWidth = floatingPanel.offsetWidth || floatingPanel.getBoundingClientRect().width;
        const panelHeight = floatingPanel.offsetHeight || floatingPanel.getBoundingClientRect().height;
        const pageX = window.pageXOffset || document.documentElement.scrollLeft || 0;
        const pageY = window.pageYOffset || document.documentElement.scrollTop || 0;
        let left = (rect.left + (rect.width / 2) - (panelWidth / 2)) + pageX;
        left = Math.max(pageX + 8, Math.min(left, pageX + window.innerWidth - panelWidth - 8));
        let top = rect.bottom + 8 + pageY;
        const maxTop = pageY + window.innerHeight - panelHeight - 8;
        if (top > maxTop) {
            top = Math.max(pageY + 8, rect.top - panelHeight - 8 + pageY);
        }
        floatingPanel.style.left = `${left}px`;
        floatingPanel.style.top = `${top}px`;
    };

    const openFloating = (wrapper) => {
        closeFloating(true);
        activeWrapper = wrapper;
        floatingInput.value = wrapper.dataset.youtube || '';
        floatingPanel.style.display = 'block';
        floatingPanel.classList.remove('closing');
        floatingPanel.classList.add('open');
        wrapper.classList.add('panel-open');
        const container = wrapper.closest('.container');
        if (container) container.classList.add('cave-panel-open');
        requestAnimationFrame(() => {
            positionFloating();
            floatingInput.focus();
            floatingInput.select();
        });
    };

    window.addEventListener('resize', () => {
        if (activeWrapper) requestAnimationFrame(positionFloating);
    });
    window.addEventListener('scroll', () => {
        if (activeWrapper) requestAnimationFrame(positionFloating);
    }, true);

    floatingSave.addEventListener('click', (e) => {
        e.preventDefault();
        if (!activeWrapper) return;
        const url = floatingInput.value.trim();

        const isYoutubeLink = (url) => {
            if (!url) return true; // Allow empty to clear
            const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
            return youtubeRegex.test(url);
        };

        if (!isYoutubeLink(url)) {
            if (floatingError) {
                floatingError.textContent = 'Please enter a valid YouTube link.';
                floatingError.style.display = 'block';
            }
            return;
        }

        if (floatingError) floatingError.style.display = 'none';

        const configKey = getConfigKey();
        const index = activeWrapper.dataset.index;

        if (url) {
            activeWrapper.dataset.youtube = url;
            activeWrapper.classList.add('has-link');
            if (!savedCaveLinks[configKey]) savedCaveLinks[configKey] = {};
            savedCaveLinks[configKey][index] = url;
        } else {
            activeWrapper.dataset.youtube = '';
            activeWrapper.classList.remove('has-link');
            if (savedCaveLinks[configKey]) delete savedCaveLinks[configKey][index];
        }
        saveSavedCaveLinks();
        closeFloating();
    });

    floatingInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            floatingSave.click();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            closeFloating();
        }
    });

    const caveWrappers = [];
    const caveOverlayMap = new Map();
    const getHitboxPad = () => (
        window.innerWidth <= 900
            ? { top: 0, bottom: 28, side: 6 }
            : { top: 0, bottom: 2, side: 3 }
    );

    const positionOverlay = (wrapper) => {
        const icon = wrapper.querySelector('.cave-play-icon');
        const overlay = caveOverlayMap.get(wrapper);
        if (!icon || !overlay) return;
        const pad = getHitboxPad();
        // Disable legacy fixed overlay hitbox; it can block cave image hover/click.
        overlay.style.display = 'none';
        overlay.style.pointerEvents = 'none';
        return;
        const rect = icon.getBoundingClientRect();
        const left = rect.left - pad.side + window.pageXOffset;
        const top = rect.top - pad.top + window.pageYOffset;
        const width = rect.width + (pad.side * 2);
        const height = rect.height + pad.top + pad.bottom;
        overlay.style.left = `${left}px`;
        overlay.style.top = `${top}px`;
        overlay.style.width = `${width}px`;
        overlay.style.height = `${height}px`;
        overlay.style.pointerEvents = 'auto';
    };

    const refreshOverlays = () => {
        caveWrappers.forEach(wrapper => positionOverlay(wrapper));
    };

    const handleWrapperClick = (wrapper) => {
        const url = wrapper.dataset.youtube;
        if (url) {
            window.open(url, '_blank');
        }
    };

    icons.forEach((icon, index) => {
        if (icon.closest('.cave-play-wrapper')) return;

        const wrapper = document.createElement('span');
        wrapper.className = 'cave-play-wrapper';
        wrapper.dataset.index = String(index);
        const anchor = document.createElement('span');
        anchor.className = 'cave-play-anchor';
        const parent = icon.parentElement;
        parent.replaceChild(wrapper, icon);
        wrapper.appendChild(anchor);
        anchor.appendChild(icon);

        const bar = wrapper.closest('.rank-bar');
        if (bar) bar.classList.add('has-cave');

        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'cave-play-edit';
        // Clarify interaction: right-click (or long-press) opens the editor.
        editBtn.textContent = t('edit_hint');

        anchor.appendChild(editBtn);

        let hoverTimer = null;
        const clearOtherEdits = () => {
            document.querySelectorAll('.cave-play-wrapper.edit-keep').forEach(el => {
                if (el !== wrapper) el.classList.remove('edit-keep');
            });
        };
        const keepEditVisible = () => {
            if (hoverTimer) {
                clearTimeout(hoverTimer);
                hoverTimer = null;
            }
            clearOtherEdits();
            wrapper.classList.add('edit-keep');
        };
        const scheduleEditHide = () => {
            if (hoverTimer) clearTimeout(hoverTimer);
            hoverTimer = setTimeout(() => {
                wrapper.classList.remove('edit-keep');
            }, 0); // hide tooltip immediately on leave
        };

        wrapper.addEventListener('mouseenter', keepEditVisible);
        wrapper.addEventListener('mouseleave', scheduleEditHide);
        editBtn.addEventListener('mouseenter', keepEditVisible);
        editBtn.addEventListener('mouseleave', scheduleEditHide);

        let longPressTimer = null;
        let longPressTriggered = false;

        const startLongPress = () => {
            if (isViewMode) return;
            longPressTriggered = false;
            longPressTimer = setTimeout(() => {
                longPressTriggered = true;
                openFloating(wrapper);
                if (navigator.vibrate) navigator.vibrate(50);
                setTimeout(() => { longPressTriggered = false; }, 1000);
            }, 500);
        };

        const cancelLongPress = () => {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
        };

        wrapper.addEventListener('touchstart', startLongPress, { passive: true });
        wrapper.addEventListener('touchend', cancelLongPress);
        wrapper.addEventListener('touchmove', cancelLongPress);

        wrapper.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (isViewMode) return;
            if (!longPressTriggered) {
                openFloating(wrapper);
            }
        });

        wrapper.addEventListener('click', (e) => {
            if (longPressTriggered) {
                e.preventDefault();
                e.stopPropagation();
                longPressTriggered = false;
                return;
            }
            if (e.target.closest('.cave-play-edit')) return;
            handleWrapperClick(wrapper);
        });

        const configKey = getConfigKey();
        const savedUrl = savedCaveLinks[configKey] && savedCaveLinks[configKey][index];
        if (savedUrl) {
            wrapper.dataset.youtube = savedUrl;
            wrapper.classList.add('has-link');
        }

        editBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (isViewMode) return;
            if (activeWrapper === wrapper) {
                closeFloating();
            } else {
                openFloating(wrapper);
            }
        });

        const overlay = document.createElement('div');
        overlay.className = 'cave-play-overlay';
        overlay.addEventListener('mouseenter', () => wrapper.classList.add('is-hot'));
        overlay.addEventListener('mouseleave', () => wrapper.classList.remove('is-hot'));
        overlay.addEventListener('mouseenter', keepEditVisible);
        overlay.addEventListener('mouseleave', scheduleEditHide);
        overlay.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (isViewMode) return;
            openFloating(wrapper);
        });
        overlay.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            handleWrapperClick(wrapper);
        });
        document.body.appendChild(overlay);
        caveOverlayMap.set(wrapper, overlay);
        caveWrappers.push(wrapper);
        positionOverlay(wrapper);
    });

    window.addEventListener('resize', refreshOverlays);
    window.addEventListener('scroll', refreshOverlays, true);

    document.addEventListener('click', (e) => {
        if (e.target.closest('.cave-play-wrapper')) return;
        if (e.target.closest('.cave-play-panel')) return;
        closeFloating();
    });

    document.addEventListener('focusin', (e) => {
        if (window.innerWidth > 900) return;
        if (!activeWrapper) return;
        if (!e.target || !e.target.closest) return;
        if (e.target.closest('.score-input-wrapper')) {
            closeFloating(true);
        }
    }, true);
}

function darkenColor(color, amount) {
    let r, g, b, a = 1;
    if (color.startsWith('#')) {
        const hex = color.slice(1);
        if (hex.length === 3) {
            r = parseInt(hex[0] + hex[0], 16);
            g = parseInt(hex[1] + hex[1], 16);
            b = parseInt(hex[2] + hex[2], 16);
        } else {
            r = parseInt(hex.substring(0, 2), 16);
            g = parseInt(hex.substring(2, 4), 16);
            b = parseInt(hex.substring(4, 6), 16);
        }
    } else if (color.startsWith('rgba')) {
        const parts = color.match(/[\d.]+/g);
        r = parseFloat(parts[0]);
        g = parseFloat(parts[1]);
        b = parseFloat(parts[2]);
        a = parseFloat(parts[3]);
    } else if (color.startsWith('rgb')) {
        const parts = color.match(/[\d.]+/g);
        r = parseFloat(parts[0]);
        g = parseFloat(parts[1]);
        b = parseFloat(parts[2]);
    } else {
        return color;
    }
    r = Math.max(0, Math.floor(r * (1 - amount)));
    g = Math.max(0, Math.floor(g * (1 - amount)));
    b = Math.max(0, Math.floor(b * (1 - amount)));
    return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function getContrastColor(color) {
    let r, g, b;
    if (color.startsWith('#')) {
        const hex = color.slice(1);
        if (hex.length === 3) {
            r = parseInt(hex[0] + hex[0], 16);
            g = parseInt(hex[1] + hex[1], 16);
            b = parseInt(hex[2] + hex[2], 16);
        } else {
            r = parseInt(hex.substring(0, 2), 16);
            g = parseInt(hex.substring(2, 4), 16);
            b = parseInt(hex.substring(4, 6), 16);
        }
    } else if (color.startsWith('rgb')) {
        const parts = color.match(/[\d.]+/g);
        if (parts) { r = parseFloat(parts[0]); g = parseFloat(parts[1]); b = parseFloat(parts[2]); }
    } else { return 'rgba(255, 255, 255, 0.8)'; }
    
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    
    if (yiq >= 128) {
        const factor = 0.3;
        return `rgba(${Math.round(r * factor)}, ${Math.round(g * factor)}, ${Math.round(b * factor)}, 1)`;
    } else {
        const factor = 3.0;
        const nr = Math.min(255, Math.round(r * factor));
        const ng = Math.min(255, Math.round(g * factor));
        const nb = Math.min(255, Math.round(b * factor));
        return `rgba(${nr}, ${ng}, ${nb}, 1)`;
    }
}

function hexToRgba(hex, alpha) {
    let r = 0, g = 0, b = 0;
    if (hex.startsWith('#')) {
        hex = hex.slice(1);
        if (hex.length === 3) {
            r = parseInt(hex[0] + hex[0], 16);
            g = parseInt(hex[1] + hex[1], 16);
            b = parseInt(hex[2] + hex[2], 16);
        } else if (hex.length === 6) {
            r = parseInt(hex.substring(0, 2), 16);
            g = parseInt(hex.substring(2, 4), 16);
            b = parseInt(hex.substring(4, 6), 16);
        }
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function hexToRgb(hex) {
    if (!hex) return null;
    let clean = hex.trim();
    if (clean.startsWith('#')) clean = clean.slice(1);
    if (clean.length !== 6) return null;
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
    return { r, g, b };
}

function rgbToHex(r, g, b) {
    const toHex = (val) => val.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function blendHex(baseHex, overlayHex, strength) {
    const base = hexToRgb(baseHex);
    const overlay = hexToRgb(overlayHex);
    if (!base || !overlay) return overlayHex;
    const clamped = Math.max(0, Math.min(1, strength));
    const mix = (a, b) => Math.round(a + (b - a) * clamped);
    return rgbToHex(
        mix(base.r, overlay.r),
        mix(base.g, overlay.g),
        mix(base.b, overlay.b)
    );
}

function parseColorToRgba(color) {
    if (!color) return null;
    const trimmed = color.trim();
    if (trimmed.startsWith('#')) {
        const rgb = hexToRgb(trimmed);
        if (!rgb) return null;
        return { ...rgb, a: 1 };
    }
    if (trimmed.startsWith('rgba')) {
        const parts = trimmed.match(/[\d.]+/g);
        if (!parts || parts.length < 4) return null;
        return {
            r: parseFloat(parts[0]),
            g: parseFloat(parts[1]),
            b: parseFloat(parts[2]),
            a: parseFloat(parts[3])
        };
    }
    if (trimmed.startsWith('rgb')) {
        const parts = trimmed.match(/[\d.]+/g);
        if (!parts || parts.length < 3) return null;
        return {
            r: parseFloat(parts[0]),
            g: parseFloat(parts[1]),
            b: parseFloat(parts[2]),
            a: 1
        };
    }
    return null;
}

function colorWithAlpha(color, alpha) {
    const parsed = parseColorToRgba(color);
    if (!parsed) return color;
    const clamped = Math.max(0, Math.min(1, alpha));
    return `rgba(${Math.round(parsed.r)}, ${Math.round(parsed.g)}, ${Math.round(parsed.b)}, ${clamped})`;
}

function lightenColor(color, amount) {
    const parsed = parseColorToRgba(color);
    if (!parsed) return color;
    const clamped = Math.max(0, Math.min(1, amount));
    const mix = (channel) => Math.round(channel + ((255 - channel) * clamped));
    return `rgba(${mix(parsed.r)}, ${mix(parsed.g)}, ${mix(parsed.b)}, 1)`;
}

function rgbToHsv(r, g, b) {
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const delta = max - min;
    let h = 0;
    if (delta !== 0) {
        if (max === rn) h = ((gn - bn) / delta) % 6;
        else if (max === gn) h = (bn - rn) / delta + 2;
        else h = (rn - gn) / delta + 4;
        h = Math.round(h * 60);
        if (h < 0) h += 360;
    }
    const s = max === 0 ? 0 : delta / max;
    const v = max;
    return { h, s, v };
}

function hsvToRgb(h, s, v) {
    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;
    let r1 = 0, g1 = 0, b1 = 0;
    if (h >= 0 && h < 60) { r1 = c; g1 = x; b1 = 0; }
    else if (h < 120) { r1 = x; g1 = c; b1 = 0; }
    else if (h < 180) { r1 = 0; g1 = c; b1 = x; }
    else if (h < 240) { r1 = 0; g1 = x; b1 = c; }
    else if (h < 300) { r1 = x; g1 = 0; b1 = c; }
    else { r1 = c; g1 = 0; b1 = x; }
    return {
        r: Math.round((r1 + m) * 255),
        g: Math.round((g1 + m) * 255),
        b: Math.round((b1 + m) * 255)
    };
}

function updateRowColors() {
    const scoreInputs = document.querySelectorAll('.score-input');
    const stripes = document.querySelectorAll('.bg-stripe');
    
    scoreInputs.forEach((input, idx) => {
        const wrapper = input.parentElement;
        const overlay = wrapper.querySelector('.score-text-overlay');
        if (!wrapper || !overlay) return;

        let rankIndex = 0;
        const rating = individualRatings[idx];
        if (rating > 0) {
            rankIndex = Math.min(13, Math.floor(rating / 100));
        }

        wrapper.style.background = '';
        overlay.style.background = '';
        overlay.style.webkitBackgroundClip = '';
        overlay.style.backgroundClip = '';
        overlay.style.color = 'white';
        overlay.style.animation = '';
        overlay.style.backgroundSize = '';

        if (rankIndex > 0) {
            overlay.style.color = SCORE_TEXT_COLORS[rankIndex];
            wrapper.style.background = darkenColor(RANK_COLORS[rankIndex], 0.6);
        }
    });

    const groups = [
        [0, 1],
        [2, 3],
        [4, 5],
        [6],
        [7, 8],
        [9, 10],
        [11, 12],
        [13]
    ];

    stripes.forEach((stripe, index) => {
        if (index < groups.length) {
            const groupIndices = groups[index];
            let maxRank = 0;
            groupIndices.forEach(i => {
                const rating = individualRatings[i];
                const rank = rating >= 100 ? Math.min(13, Math.floor(rating / 100)) : 0;
                if (rank > maxRank) maxRank = rank;
            });

            const isFocused = groupIndices.includes(focusedInputIndex);

            if (isFocused && maxRank === 0) {
                stripe.style.background = 'none';
                stripe.style.display = 'none';
            } else if (isFocused && maxRank > 1) {
                stripe.style.background = `linear-gradient(to right, transparent, ${hexToRgba(RANK_COLORS[maxRank], 0.25)})`;
                stripe.style.display = 'block';
            } else if (isFocused && maxRank === 1) {
                stripe.style.background = 'linear-gradient(to right, transparent, rgba(255, 255, 255, 0.08))';
                stripe.style.display = 'block';
            } else if (maxRank > 1) {
                stripe.style.background = `linear-gradient(to right, transparent, ${hexToRgba(RANK_COLORS[maxRank], 0.25)})`;
                stripe.style.display = 'block';
            } else if (maxRank === 1) {
                stripe.style.background = 'linear-gradient(to right, transparent, rgba(255, 255, 255, 0.08))';
                stripe.style.display = 'block';
            } else {
                stripe.style.background = 'none';
                stripe.style.display = 'none';
            }
        }
    });
}

// Share Functionality
const shareBtn = document.getElementById('shareBtn');
const shareModal = document.getElementById('shareModal');
const closeShareModal = document.getElementById('closeShareModal');
const screenshotContainer = document.getElementById('screenshotContainer');
const downloadImageBtn = document.getElementById('downloadImageBtn');
const copyLinkBtn = document.getElementById('copyLinkBtn');
const mobileCopyLinkBtn = document.getElementById('mobileCopyLinkBtn');
let currentScreenshotCanvas = null;

function apply412MobileCompaction() {
    const vw = window.innerWidth || document.documentElement.clientWidth || 0;
    const is412Class = vw >= 390 && vw <= 430;

    const addBtn = document.getElementById('addHighlightBtn');
    if (addBtn) {
        if (is412Class) {
            addBtn.style.setProperty('padding', '4px 8px', 'important');
            addBtn.style.setProperty('height', '24px', 'important');
            addBtn.style.setProperty('line-height', '1', 'important');
            addBtn.style.setProperty('font-size', '9px', 'important');
            addBtn.style.setProperty('border-radius', '6px', 'important');
        } else {
            addBtn.style.removeProperty('padding');
            addBtn.style.removeProperty('height');
            addBtn.style.removeProperty('line-height');
            addBtn.style.removeProperty('font-size');
            addBtn.style.removeProperty('border-radius');
        }
    }

    const compactTargets = [
        ...Array.from(document.querySelectorAll('.mobile-top-links .mobile-link > span')),
        document.querySelector('#mobileCopyLinkBtn > span'),
        document.querySelector('#mobileOptionsLink > span')
    ].filter(Boolean);

    compactTargets.forEach((el) => {
        if (is412Class) {
            el.style.setProperty('font-size', '9px', 'important');
            el.style.setProperty('line-height', '1', 'important');
        } else {
            el.style.removeProperty('font-size');
            el.style.removeProperty('line-height');
        }
    });
}

window.addEventListener('resize', apply412MobileCompaction, { passive: true });
window.addEventListener('orientationchange', apply412MobileCompaction, { passive: true });
setTimeout(apply412MobileCompaction, 0);

if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
        updateAllRatings();

        shareModal.classList.add('show');
        screenshotContainer.innerHTML = `
            <div style="color: #ccc; padding: 40px; display: flex; flex-direction: column; align-items: center; gap: 15px;">
                <div style="width: 30px; height: 30px; border: 3px solid rgba(255,255,255,0.3); border-radius: 50%; border-top-color: #fff; animation: spin 1s ease-in-out infinite;"></div>
                <div>${t('generating_screenshot')}</div>
            </div>
            <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
        `;
        
        setTimeout(async () => {
            try {
                const element = document.getElementById('benchmark-content')
                    || document.getElementById('responsive-wrapper')
                    || document.body;
                const isMobileViewport = window.innerWidth <= 900;
                const screenshotScale = 1;
                const liveBodyStyle = getComputedStyle(document.body);
                const fallbackThemeBg = getComputedStyle(document.documentElement).getPropertyValue('--app-bg').trim();
                const screenshotBgColor = liveBodyStyle.backgroundColor || fallbackThemeBg || '#050505';
                const rootThemeVars = {};
                for (const propName of Array.from(document.documentElement.style)) {
                    if (typeof propName === 'string' && propName.startsWith('--')) {
                        rootThemeVars[propName] = document.documentElement.style.getPropertyValue(propName);
                    }
                }
                const DESKTOP_SCREENSHOT_WIDTH_PX = 1600;
                const DESKTOP_CAPTURE_OVERRIDE_CSS = `
                    .container { padding: 0 !important; overflow: visible !important; border-radius: 24px !important; }
                    .middle-box { padding: 20px !important; min-height: 150px !important; }
                    .top-box { display: flex !important; height: 72px !important; padding: 0 20px !important; gap: 0 !important; grid-template-columns: none !important; grid-template-rows: none !important; align-items: center !important; }
                    .profile-circle { width: 60px !important; height: 60px !important; margin-right: 15px !important; margin-bottom: 0 !important; grid-column: auto !important; grid-row: auto !important; display: block !important; }
                    .profile-details { display: flex !important; gap: 0 !important; margin-top: 0 !important; }
                    .profile-identity { display: flex !important; margin-top: 0 !important; }
                    .profile-text-block { grid-column: auto !important; grid-row: auto !important; display: flex !important; flex-direction: row !important; align-items: baseline !important; gap: 8px !important; }
                    .profile-views { position: absolute !important; top: 0 !important; grid-column: auto !important; grid-row: auto !important; margin-bottom: 0 !important; }
                    .trophies-section { position: relative !important; width: auto !important; margin: 0 !important; left: 10px !important; grid-column: auto !important; grid-row: auto !important; display: flex !important; flex-direction: column !important; align-items: stretch !important; }
                    .achievements-section { width: auto !important; margin: 0 30px !important; grid-column: auto !important; grid-row: auto !important; display: flex !important; justify-content: center !important; }
                    .top-right { display: flex !important; }
                    .controls-container { margin-top: 0 !important; }
                    .ranks-wrapper { width: 540px !important; overflow: visible !important; padding: 0 !important; margin-right: 0 !important; }
                    .ranks-labels { width: 1014px !important; margin-left: -474px !important; }
                    .progress-bar { width: 1014px !important; margin-left: -474px !important; }
                    .container > div[style*="margin-right: 70px"] { width: auto !important; overflow: visible !important; padding: 40px 20px 15px 20px !important; margin-right: 70px !important; pointer-events: none !important; }
                    .ranks-bars { margin: 0 !important; padding: 0 !important; background: transparent !important; }
                    .rank-bar { width: 76.2px !important; height: 25px !important; transform: skewX(-40deg) !important; margin: 0 1px !important; }
                    .rank-bar:nth-child(2) { position: absolute !important; right: calc(100% + 124px) !important; top: -6.5px !important; height: 38px !important; transform: none !important; width: 300px !important; margin-right: 2px !important; border: none !important; }
                    .vertical-box { display: flex !important; width: 40px !important; left: 0 !important; border-radius: 0 12px 12px 0 !important; }
                    .bg-stripe { display: block !important; width: calc(1014px + 70px) !important; }
                    .score-input-wrapper { position: absolute !important; left: 360px !important; right: auto !important; width: 100px !important; margin: 0 !important; transform: none !important; display: block !important; }
                    .rating-value { position: absolute !important; left: auto !important; right: 0 !important; width: 90px !important; display: flex !important; transform: none !important; margin: 0 !important; }
                    .radar-header { flex-direction: row !important; gap: 12px !important; }
                    .radar-tabs { width: auto !important; justify-content: flex-start !important; }
                    .radar-content { display: grid !important; grid-template-columns: 1.4fr 1fr !important; gap: 18px !important; }
                    .radar-canvas-wrap { height: 340px !important; padding: 12px !important; }
                    .radar-chart-grid { display: grid !important; grid-template-columns: 1.35fr 0.8fr 1.35fr !important; grid-template-rows: none !important; }
                    .radar-chart-panel, .radar-donut-wrap, .radar-bar-wrap { width: 100% !important; height: 100% !important; }
                    .radar-side { width: auto !important; }
                    .mobile-top-links, .mobile-exit-view-btn, .share-modal-overlay { display: none !important; }
                    .highlights-box, .benchmark-footer { display: none !important; }
                `;
                const radarBoxEl = document.querySelector('.radar-box');
                let cropToRadarPx = null;
                let captureSourceWidthPx = null;
                if (element && radarBoxEl && typeof element.getBoundingClientRect === 'function') {
                    const elementRect = element.getBoundingClientRect();
                    captureSourceWidthPx = Math.max(1, elementRect.width || 0);
                    const radarRect = radarBoxEl.getBoundingClientRect();
                    const rawHeight = (radarRect.bottom - elementRect.top) * screenshotScale;
                    if (Number.isFinite(rawHeight) && rawHeight > 0) {
                        cropToRadarPx = Math.ceil(rawHeight);
                    }
                }

                const overrideStyle = document.createElement('style');
                overrideStyle.id = 'screenshot-trophy-override';
                overrideStyle.innerHTML = `
                    .eternal-layer, .eternal-layer-main, .rank-name::before, .rounded-inner-box span::before {
                        display: none !important;
                        animation: none !important;
                    }
                    .ranks-labels .rank-item:nth-child(11) .trophy-layer { filter: ${STELLAR_TROPHY_FILTER} !important; -webkit-filter: ${STELLAR_TROPHY_FILTER} !important; }
                    .ranks-labels .rank-item:nth-child(11) span { color: #FF6F00 !important; background: none !important; -webkit-text-fill-color: #FF6F00 !important; -webkit-background-clip: initial !important; background-clip: initial !important; animation: none !important; }
                    .ranks-labels .rank-item:nth-child(12) .trophy-layer { filter: sepia(1) hue-rotate(290deg) saturate(3) brightness(0.9) !important; -webkit-filter: sepia(1) hue-rotate(290deg) saturate(3) brightness(0.9) !important; }
                    .ranks-labels .rank-item:nth-child(12) span { color: #D8007F !important; background: none !important; -webkit-text-fill-color: #D8007F !important; -webkit-background-clip: initial !important; background-clip: initial !important; animation: none !important; }
                    .ranks-labels .rank-item:nth-child(13) .trophy-layer { filter: sepia(1) hue-rotate(310deg) saturate(3) brightness(0.8) !important; -webkit-filter: sepia(1) hue-rotate(310deg) saturate(3) brightness(0.8) !important; }
                    .ranks-labels .rank-item:nth-child(13) span { color: #a64747 !important; background: none !important; -webkit-text-fill-color: #a64747 !important; -webkit-background-clip: initial !important; background-clip: initial !important; animation: none !important; }
                `;
                document.head.appendChild(overrideStyle);

                const mainRankImg = document.querySelector('.rounded-inner-box img');
                const mainRankSpan = document.querySelector('.rounded-inner-box span');
                let savedMainImgFilter = null;
                let savedMainSpanStyle = null;
                if (mainRankImg) {
                    savedMainImgFilter = mainRankImg.style.filter;
                    const mainText = document.querySelector('.rounded-inner-box').textContent || '';
                    if (mainText.includes('Stellar')) {
                        mainRankImg.style.filter = STELLAR_TROPHY_FILTER;
                    } else if (mainText.includes('Celestium')) {
                        mainRankImg.style.filter = 'sepia(1) hue-rotate(290deg) saturate(3) brightness(0.9)';
                    } else if (mainText.includes('Aeternus')) {
                        mainRankImg.style.filter = 'sepia(1) hue-rotate(310deg) saturate(3) brightness(0.8)';
                    }
                }
                if (mainRankSpan) {
                    savedMainSpanStyle = mainRankSpan.style.cssText;
                    const mainText = document.querySelector('.rounded-inner-box').textContent || '';
                    if (mainText.includes('Stellar')) {
                        mainRankSpan.style.cssText = savedMainSpanStyle.replace(/background[^;]*;/g, '').replace(/-webkit-background-clip[^;]*;/g, '').replace(/background-clip[^;]*;/g, '').replace(/color: transparent[^;]*/g, 'color: #FF6F00') + ' color: #FF6F00 !important; -webkit-text-fill-color: #FF6F00 !important; background: none !important; animation: none !important;';
                    } else if (mainText.includes('Celestium')) {
                        mainRankSpan.style.cssText = savedMainSpanStyle.replace(/background[^;]*;/g, '').replace(/-webkit-background-clip[^;]*;/g, '').replace(/background-clip[^;]*;/g, '').replace(/color: transparent[^;]*/g, 'color: #D8007F') + ' color: #D8007F !important; -webkit-text-fill-color: #D8007F !important; background: none !important; animation: none !important;';
                    } else if (mainText.includes('Aeternus')) {
                        mainRankSpan.style.cssText = savedMainSpanStyle.replace(/background[^;]*;/g, '').replace(/-webkit-background-clip[^;]*;/g, '').replace(/background-clip[^;]*;/g, '').replace(/color: transparent[^;]*/g, 'color: #a64747') + ' color: #a64747 !important; -webkit-text-fill-color: #a64747 !important; background: none !important; animation: none !important;';
                    }
                }

                const runDesktopCapture = async (captureTarget, captureWidthPx, captureQuality, timeoutMs) => {
                    const screenshotPromise = modernScreenshot.domToJpeg(captureTarget, {
                        scale: screenshotScale,
                        width: captureWidthPx,
                        quality: captureQuality,
                        pixelRatio: 1,
                        fontEmbedCSS: '',
                        style: { margin: '0', padding: '0', backgroundColor: screenshotBgColor, width: `${captureWidthPx}px`, minWidth: `${captureWidthPx}px`, height: 'auto', transform: 'none' },
                        filter: (node) => {
                            const nodeId = typeof node.id === 'string' ? node.id : '';
                            if (nodeId === 'shareModal' || nodeId === 'rulesModal' || nodeId === 'settingsModal' || nodeId === 'trophyModal') return false;
                            if (nodeId.endsWith('Modal')) return false;
                            if (node.classList && node.classList.contains('share-modal-overlay')) return false;
                            if (node.classList && node.classList.contains('benchmark-footer')) return false;
                            if (node.classList && node.classList.contains('highlights-box')) return false;
                            if (node.classList && node.classList.contains('trophy-placeholder')) return false;
                            if (node.nodeType === 1 && node.tagName === 'STYLE' && node.id === 'screenshot-trophy-override') return true;
                            return true;
                        },
                        onClone: (doc) => {
                            Object.keys(rootThemeVars).forEach((key) => {
                                doc.documentElement.style.setProperty(key, rootThemeVars[key]);
                            });
                            const style = doc.createElement('style');
                            style.innerHTML = `
                                * { animation: none !important; transition: none !important; backdrop-filter: none !important; -webkit-backdrop-filter: none !important; transform-style: flat !important; }
                                .rank-name::before { display: none !important; }
                                .rounded-inner-box span::before { display: none !important; }
                                .highlights-box { display: none !important; margin: 0 !important; padding: 0 !important; min-height: 0 !important; }
                            `;
                            doc.head.appendChild(style);
                            if (doc.body) {
                                doc.body.style.backgroundColor = screenshotBgColor;
                                doc.body.style.backgroundImage = 'none';
                            }
                            
                            // Force Desktop Width and Layout
                            doc.documentElement.style.width = `${captureWidthPx}px`;
                            doc.body.style.width = `${captureWidthPx}px`;
                            doc.body.style.minWidth = `${captureWidthPx}px`;
                            doc.body.style.overflow = 'visible';

                            const respWrapper = doc.getElementById('responsive-wrapper');
                            if (respWrapper) {
                                respWrapper.style.setProperty('width', `${captureWidthPx}px`, 'important');
                                respWrapper.style.setProperty('min-width', `${captureWidthPx}px`, 'important');
                                respWrapper.style.setProperty('max-width', 'none', 'important');
                                respWrapper.style.setProperty('padding', '20px', 'important');
                            }

                            const desktopOverrideStyle = doc.createElement('style');
                            desktopOverrideStyle.innerHTML = DESKTOP_CAPTURE_OVERRIDE_CSS;
                            doc.head.appendChild(desktopOverrideStyle);

                            const clonedContent = doc.getElementById('benchmark-content');
                            if (clonedContent) {
                                clonedContent.style.backgroundColor = screenshotBgColor;
                            }

                            // Force Desktop Layout Restoration
                            const container = doc.querySelector('.container');
                            const middleBox = doc.querySelector('.middle-box');
                            
                            if (container) {
                                // Restore Score Inputs
                                doc.querySelectorAll('.score-input-wrapper').forEach(el => {
                                    if (el.dataset.desktopTop) {
                                        container.appendChild(el);
                                        el.style.setProperty('position', 'absolute', 'important');
                                        el.style.setProperty('top', el.dataset.desktopTop, 'important');
                                        el.style.setProperty('left', '360px', 'important');
                                        el.style.setProperty('transform', 'none', 'important');
                                        el.style.setProperty('margin', '0', 'important');
                                        el.style.setProperty('display', 'block', 'important');
                                    }
                                });

                                // Restore Rating Values
                                doc.querySelectorAll('.rating-value').forEach(el => {
                                    if (el.dataset.desktopTop) {
                                        container.appendChild(el);
                                        el.style.setProperty('position', 'absolute', 'important');
                                        el.style.setProperty('top', el.dataset.desktopTop, 'important');
                                        el.style.setProperty('height', el.dataset.desktopHeight || '78px', 'important');
                                        el.style.setProperty('left', 'auto', 'important');
                                        el.style.setProperty('right', '0', 'important');
                                        el.style.setProperty('transform', 'none', 'important');
                                        el.style.setProperty('margin', '0', 'important');
                                        el.style.setProperty('display', 'flex', 'important');
                                    }
                                });
                            }

                            // Restore Rank Box
                            const rankBox = doc.querySelector('.rounded-inner-box');
                            if (rankBox && middleBox) {
                                middleBox.insertBefore(rankBox, middleBox.firstChild);
                                rankBox.style.setProperty('position', 'absolute', 'important');
                                rankBox.style.setProperty('top', '20px', 'important');
                                rankBox.style.setProperty('left', '20px', 'important');
                                rankBox.style.setProperty('right', '20px', 'important');
                                rankBox.style.setProperty('bottom', '20px', 'important');
                                rankBox.style.setProperty('transform', 'none', 'important');
                                rankBox.style.setProperty('width', 'auto', 'important');
                                rankBox.style.setProperty('height', 'auto', 'important');
                                rankBox.style.setProperty('margin', '0', 'important');
                            }

                            // Reset Header Transforms
                            ['.cave-text', '.score-text', '.progression-text', '.rating-text', '.bg-stripe'].forEach(sel => {
                                doc.querySelectorAll(sel).forEach(el => {
                                    el.style.transform = '';
                                    el.style.left = '';
                                    el.style.right = '';
                                    el.style.top = '';
                                });
                            });

                            // Hide Mobile Elements
                            doc.querySelectorAll('.mobile-exit-view-btn, .mobile-top-links').forEach(el => el.style.display = 'none');
                            doc.querySelectorAll('.highlights-box, .benchmark-footer').forEach(el => el.remove());
                            doc.querySelectorAll('.ranks-wrapper, #ranksBarsContainer, .container > div[style*="margin-right: 70px"]').forEach((el) => {
                                if (typeof el.scrollLeft === 'number') el.scrollLeft = 0;
                            });

                            const origHoneycomb = document.getElementById('dynamic-honeycomb-style');
                            if (origHoneycomb) {
                                const clonedHoneycomb = doc.createElement('style');
                                clonedHoneycomb.id = 'dynamic-honeycomb-style';
                                clonedHoneycomb.innerHTML = origHoneycomb.innerHTML;
                                doc.head.appendChild(clonedHoneycomb);
                            }
                        }
                    });

                    if (!timeoutMs || timeoutMs <= 0) {
                        return screenshotPromise;
                    }
                    const timeoutPromise = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Screenshot generation timed out.')), timeoutMs)
                    );
                    return Promise.race([screenshotPromise, timeoutPromise]);
                };

                let dataUrl = null;
                try {
                    if (isMobileViewport) {
                        const mobileDesktopAttempts = [
                            { width: 1366, quality: 0.76, timeoutMs: 0 },
                            { width: 1280, quality: 0.72, timeoutMs: 0 },
                            { width: 1200, quality: 0.68, timeoutMs: 0 }
                        ];
                        let mobileCaptureError = null;
                        for (const attempt of mobileDesktopAttempts) {
                            try {
                                dataUrl = await runDesktopCapture(element, attempt.width, attempt.quality, attempt.timeoutMs);
                                mobileCaptureError = null;
                                break;
                            } catch (captureErr) {
                                mobileCaptureError = captureErr;
                            }
                        }
                        if (mobileCaptureError || !dataUrl) throw mobileCaptureError || new Error('Screenshot capture failed.');
                    } else {
                        dataUrl = await runDesktopCapture(element, DESKTOP_SCREENSHOT_WIDTH_PX, 0.8, 14000);
                    }
                } catch (primaryErr) {
                    if (isMobileViewport) throw primaryErr;
                    const timedOutPrimary = primaryErr && typeof primaryErr.message === 'string' && /timed out/i.test(primaryErr.message);
                    if (!timedOutPrimary) throw primaryErr;
                    dataUrl = await runDesktopCapture(element, 1366, 0.72, 7000);
                } finally {
                    const injectedOverride = document.getElementById('screenshot-trophy-override');
                    if (injectedOverride) injectedOverride.remove();
                    if (mainRankImg && savedMainImgFilter !== null) {
                        mainRankImg.style.filter = savedMainImgFilter;
                    }
                    if (mainRankSpan && savedMainSpanStyle !== null) {
                        mainRankSpan.style.cssText = savedMainSpanStyle;
                    }
                }
                
                const img = new Image();
                img.onload = () => {
                    const cropScale = captureSourceWidthPx && captureSourceWidthPx > 0
                        ? (img.width / captureSourceWidthPx)
                        : 1;
                    const scaledCropToRadarPx = cropToRadarPx
                        ? Math.max(1, Math.ceil(cropToRadarPx * cropScale))
                        : null;
                    const croppedHeight = cropToRadarPx
                        ? Math.max(1, Math.min(img.height, scaledCropToRadarPx))
                        : img.height;
                    const screenshotFrameGapPx = 34;
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width + (screenshotFrameGapPx * 2);
                    canvas.height = croppedHeight + (screenshotFrameGapPx * 2);
                    const ctx = canvas.getContext('2d');
                    if (!ctx) throw new Error('Canvas context unavailable');
                    ctx.fillStyle = screenshotBgColor;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(
                        img,
                        0,
                        0,
                        img.width,
                        croppedHeight,
                        screenshotFrameGapPx,
                        screenshotFrameGapPx,
                        img.width,
                        croppedHeight
                    );
                    currentScreenshotCanvas = canvas;
                    
                    const displayImg = document.createElement('img');
                    displayImg.src = canvas.toDataURL('image/png');
                    screenshotContainer.innerHTML = '';
                    screenshotContainer.appendChild(displayImg);
                };
                img.src = dataUrl;
                
            } catch (err) {
                console.error('Screenshot error:', err);
                screenshotContainer.innerHTML = `<div style="color: #ff4444; padding: 20px;">Error: ${err.message}</div>`;
            }
        }, 100);
    });
}

const MODAL_OUTSIDE_CLICK_MAX_MS = 220;
function isVisibleOverlayElement(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    if (Number(style.opacity || '1') <= 0.01) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
}

function syncGlobalModalScrollLock() {
    const hasOpenOverlay = Array.from(document.querySelectorAll('.share-modal-overlay.show'))
        .some((el) => isVisibleOverlayElement(el));
    const isMobileViewport = window.matchMedia('(max-width: 900px)').matches;
    const shouldLockPageScroll = hasOpenOverlay && !isMobileViewport;
    document.documentElement.classList.toggle('modal-open', shouldLockPageScroll);
    document.body.classList.toggle('modal-open', shouldLockPageScroll);
    if (shouldLockPageScroll) {
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
    }
}

const globalModalObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        const target = mutation.target;
        if (target && target.classList && target.classList.contains('share-modal-overlay')) {
            syncGlobalModalScrollLock();
            return;
        }
    }
});

if (document.body) {
    globalModalObserver.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });
    syncGlobalModalScrollLock();
}

function bindModalOverlayQuickClose(modalEl, onQuickOverlayClick) {
    if (!modalEl || typeof onQuickOverlayClick !== 'function') return;

    let outsidePressStartedAt = 0;
    let outsidePressStartedOnOverlay = false;

    modalEl.addEventListener('pointerdown', (e) => {
        if (e.target === modalEl) {
            outsidePressStartedOnOverlay = true;
            outsidePressStartedAt = performance.now();
        } else {
            outsidePressStartedOnOverlay = false;
            outsidePressStartedAt = 0;
        }
    });

    modalEl.addEventListener('click', (e) => {
        if (e.target !== modalEl) return;
        if (!outsidePressStartedOnOverlay || outsidePressStartedAt <= 0) return;

        const pressDuration = performance.now() - outsidePressStartedAt;
        outsidePressStartedOnOverlay = false;
        outsidePressStartedAt = 0;
        if (pressDuration > MODAL_OUTSIDE_CLICK_MAX_MS) return;

        onQuickOverlayClick();
    });
}

function closeShareModalQuick() {
    if (!shareModal) return;
    shareModal.classList.remove('show');
    shareModal.style.display = '';
}

if (closeShareModal) closeShareModal.addEventListener('click', closeShareModalQuick);
bindModalOverlayQuickClose(shareModal, closeShareModalQuick);

if (downloadImageBtn) {
    downloadImageBtn.addEventListener('click', () => {
        if (currentScreenshotCanvas) {
            const link = document.createElement('a');
            link.download = 'benchmark-result.jpg';
            link.href = currentScreenshotCanvas.toDataURL('image/jpeg', 0.9);
            link.click();
        }
    });
}

if (copyLinkBtn) {
    const COPY_SUCCESS_LABELS = {
        en: 'Copied',
        ar: 'Ã˜ÂªÃ™â€¦ Ã˜Â§Ã™â€žÃ™â€ Ã˜Â³Ã˜Â®',
        bn: 'Ã Â¦â€¢Ã Â¦ÂªÃ Â¦Â¿ Ã Â¦Â¹Ã Â¦Â¯Ã Â¦Â¼Ã Â§â€¡Ã Â¦â€ºÃ Â§â€¡',
        da: 'Kopieret',
        de: 'Kopiert',
        nl: 'Gekopieerd',
        es: 'Copiado',
        fil: 'Nakopya',
        fr: 'Copie',
        hmn: 'Luam lawm',
        id: 'Tersalin',
        it: 'Copiato',
        hu: 'Masolva',
        ms: 'Disalin',
        no: 'Kopiert',
        pl: 'Skopiowano',
        pt: 'Copiado',
        'pt-br': 'Copiado',
        fi: 'Kopioitu',
        sv: 'Kopierad',
        tr: 'Kopyalandi',
        vi: 'Da sao chep',
        ja: 'Ã£â€šÂ³Ã£Æ’â€Ã£Æ’Â¼Ã£Ââ€”Ã£ÂÂ¾Ã£Ââ€”Ã£ÂÅ¸',
        ko: 'Ã«Â³ÂµÃ¬â€šÂ¬Ã«ÂÂ¨',
        zh: 'Ã¥Â·Â²Ã¥Â¤ÂÃ¥Ë†Â¶'
    };
    const copyFeedbackTimers = new WeakMap();
    const renderCopyLinkLabel = (el, labelText) => {
        if (!el) return;
        if (el === mobileCopyLinkBtn) {
            el.innerHTML = '<svg class="nav-icon" viewBox="0 0 24 24" width="14" height="14" style="margin-right: 4px; fill: #fff;"><path d="M16 1H4c-1.1 0-2 .9-2 2v12h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg><span>' + labelText + '</span>';
        } else {
            el.textContent = labelText;
        }
    };
    const restoreCopyLabel = (el) => {
        if (!el) return;
        el.classList.remove('copy-success');
        renderCopyLinkLabel(el, t('copy_link'));
        apply412MobileCompaction();
    };
    const showCopySuccessState = (el) => {
        if (!el) return;
        const langKey = String(currentLanguage || 'en').toLowerCase();
        const successLabel = COPY_SUCCESS_LABELS[langKey] || COPY_SUCCESS_LABELS.en;
        const existingTimer = copyFeedbackTimers.get(el);
        if (existingTimer) clearTimeout(existingTimer);
        el.classList.add('copy-success');
        el.innerHTML = '<span style="color:#22c55e;font-weight:700;margin-right:3px;">&#10003;</span>' + successLabel;
        apply412MobileCompaction();
        const nextTimer = setTimeout(() => restoreCopyLabel(el), 1400);
        copyFeedbackTimers.set(el, nextTimer);
    };
    const copyBenchmarkLinkToClipboard = async () => {
        const link = buildCopyLinkUrl();
        try {
            const user = auth.currentUser;
            if (user) {
                const parts = new URL(link).pathname.split('/').filter(Boolean);
                const slug = parts.length ? parts[parts.length - 1] : '';
                if (slug) await saveUserData({ publicSlug: slug });
            }
        } catch (slugSaveErr) {
            console.warn('Unable to sync public slug before copy:', slugSaveErr);
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(link);
        } else {
            const temp = document.createElement('textarea');
            temp.value = link;
            temp.setAttribute('readonly', 'true');
            temp.style.position = 'absolute';
            temp.style.left = '-9999px';
            document.body.appendChild(temp);
            temp.select();
            document.execCommand('copy');
            document.body.removeChild(temp);
        }
    };
    copyLinkBtn.addEventListener('click', async () => {
        try {
            await copyBenchmarkLinkToClipboard();
            if (window.matchMedia('(min-width: 901px)').matches) {
                showCopySuccessState(copyLinkBtn);
            }
        } catch (err) {
            console.error('Copy link failed:', err);
            if (window.matchMedia('(min-width: 901px)').matches) {
                restoreCopyLabel(copyLinkBtn);
            }
        }
    });
    if (mobileCopyLinkBtn) {
        mobileCopyLinkBtn.addEventListener('click', async () => {
            try {
                await copyBenchmarkLinkToClipboard();
                showCopySuccessState(mobileCopyLinkBtn);
            } catch (err) {
                console.error('Mobile copy link failed:', err);
                restoreCopyLabel(mobileCopyLinkBtn);
            }
        });
    }
}

// Rules Modal Functionality
const rulesBtn = document.getElementById('rulesBtn');
const rulesModal = document.getElementById('rulesModal');
const closeRulesModal = document.getElementById('closeRulesModal');

function closeRules() {
    rulesModal.classList.add('closing');
    setTimeout(() => {
        rulesModal.classList.remove('show');
        rulesModal.classList.remove('closing');
    }, 200);
}

if (rulesBtn) {
    rulesBtn.addEventListener('click', () => {
        rulesModal.classList.add('show');
    });
}

if (closeRulesModal) {
    closeRulesModal.addEventListener('click', closeRules);
}

bindModalOverlayQuickClose(rulesModal, closeRules);

// Settings Modal Functionality
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettingsModal = document.getElementById('closeSettingsModal');
const settingsContentBox = document.querySelector('#settingsModal .settings-content-box');
const resetSelectedScoresBtn = document.getElementById('resetSelectedScoresBtn');
const resetAllScoresBtn = document.getElementById('resetAllScoresBtn');
const MOBILE_SETTINGS_SELECT_SELECTOR = '#settingsModal select.settings-select';
let mobileSettingsDropdownDocBound = false;
const CLEAN_LANGUAGE_LABELS = {
    en: 'English',
    ar: 'Ø§Ù„Ø¹Ø±Ø¨ÙŠØ© (Arabic)',
    bn: 'à¦¬à¦¾à¦‚à¦²à¦¾ (Bangla)',
    da: 'Dansk (Danish)',
    de: 'Deutsch (German)',
    es: 'Espa\u00F1ol (Spanish)',
    fil: 'Filipino (Tagalog)',
    fr: 'FranÃ§ais (French)',
    hmn: 'Hmoob (Hmong)',
    id: 'Indonesia (Indonesian)',
    it: 'Italiano (Italian)',
    hu: 'Magyar (Hungarian)',
    ms: 'Melayu (Malay)',
    nl: 'Nederlands (Dutch)',
    no: 'Norsk (Norwegian)',
    pl: 'Polski (Polish)',
    'pt-BR': 'Portugu\u00EAs (Brasil)',
    'pt-PT': 'Portugu\u00EAs (Portugal)',
    fi: 'Suomi (Finnish)',
    sv: 'Svenska (Swedish)',
    vi: 'Tiáº¿ng Viá»‡t (Vietnamese)',
    tr: 'TÃ¼rkÃ§e (Turkish)',
    zh: 'ä¸­æ–‡ (Chinese)',
    ja: 'æ—¥æœ¬èªž (Japanese)',
    ko: 'í•œêµ­ì–´ (Korean)'
};

function normalizeSettingsLanguageDropdownLabels() {
    const langSelect = document.getElementById('languageSelect');
    if (!langSelect) return;
    Array.from(langSelect.options).forEach((opt) => {
        const clean = CLEAN_LANGUAGE_LABELS[opt.value];
        if (clean) opt.textContent = clean;
    });
}

function setupMobileSettingsDropdowns() {
    normalizeSettingsLanguageDropdownLabels();
    const selects = Array.from(document.querySelectorAll(MOBILE_SETTINGS_SELECT_SELECTOR));
    if (!selects.length) return;

    const isMobile = window.matchMedia('(max-width: 900px)').matches;
    selects.forEach((selectEl) => {
        const existing = selectEl.nextElementSibling;
        const hasCustom = existing && existing.classList && existing.classList.contains('settings-custom-select');

        if (!isMobile) {
            selectEl.classList.remove('settings-select-native-hidden');
            if (hasCustom) existing.remove();
            return;
        }

        selectEl.classList.add('settings-select-native-hidden');
        const wrapper = hasCustom ? existing : document.createElement('div');
        if (!hasCustom) {
            wrapper.className = 'settings-custom-select';
            wrapper.innerHTML = `
                <button type="button" class="settings-custom-trigger" aria-expanded="false"></button>
                <div class="settings-custom-menu"></div>
            `;
            selectEl.insertAdjacentElement('afterend', wrapper);
        }

        const trigger = wrapper.querySelector('.settings-custom-trigger');
        const menu = wrapper.querySelector('.settings-custom-menu');
        if (!trigger || !menu) return;

        const syncLabel = () => {
            const selected = selectEl.options[selectEl.selectedIndex];
            trigger.textContent = selected ? selected.textContent : '';
        };

        menu.innerHTML = '';
        Array.from(selectEl.options).forEach((opt) => {
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'settings-custom-item';
            item.textContent = opt.textContent;
            item.dataset.value = opt.value;
            item.addEventListener('click', () => {
                selectEl.value = opt.value;
                selectEl.dispatchEvent(new Event('change', { bubbles: true }));
                wrapper.classList.remove('open');
                trigger.setAttribute('aria-expanded', 'false');
                syncLabel();
            });
            menu.appendChild(item);
        });

        if (wrapper.dataset.bound !== '1') {
            trigger.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const willOpen = !wrapper.classList.contains('open');
                document.querySelectorAll('#settingsModal .settings-custom-select.open').forEach((el) => {
                    el.classList.remove('open');
                    const btn = el.querySelector('.settings-custom-trigger');
                    if (btn) btn.setAttribute('aria-expanded', 'false');
                });
                wrapper.classList.toggle('open', willOpen);
                trigger.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
            });
            selectEl.addEventListener('change', syncLabel);
            wrapper.dataset.bound = '1';
        }

        syncLabel();
    });

    if (!mobileSettingsDropdownDocBound) {
        document.addEventListener('click', (e) => {
            if (e.target && e.target.closest && e.target.closest('#settingsModal .settings-custom-select')) return;
            document.querySelectorAll('#settingsModal .settings-custom-select.open').forEach((el) => {
                el.classList.remove('open');
                const btn = el.querySelector('.settings-custom-trigger');
                if (btn) btn.setAttribute('aria-expanded', 'false');
            });
        });
        mobileSettingsDropdownDocBound = true;
    }
}

function closeSettings() {
    if (!settingsModal) return;
    settingsModal.classList.add('closing');
    setTimeout(() => {
        settingsModal.classList.remove('show');
        settingsModal.classList.remove('closing');
    }, 200);
}

if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
        syncSettingsUI();
        setupMobileSettingsDropdowns();
        if (settingsModal) {
            settingsModal.classList.add('show');
        }
        requestAnimationFrame(() => {
            updateCustomSwatches();
            buildSettingsPreview();
        });
    });
}

window.addEventListener('resize', setupMobileSettingsDropdowns);
requestAnimationFrame(setupMobileSettingsDropdowns);

if (closeSettingsModal) {
    closeSettingsModal.addEventListener('click', closeSettings);
}

bindModalOverlayQuickClose(settingsModal, closeSettings);

document.querySelectorAll('.theme-option').forEach(btn => {
    btn.addEventListener('click', async () => {
        const theme = btn.getAttribute('data-theme');
        const rankIndex = getRankThemeIndex(theme);
        const unlockLimit = getThemeUnlockRankLimit();
        if (rankIndex !== null && rankIndex > unlockLimit) return;
        localStorage.setItem('benchmark_theme_user_selected', 'true');
        await applyTheme(theme);
    });
});

const autoRankThemeSelect = document.getElementById('autoRankThemeSelect');
if (autoRankThemeSelect) {
    autoRankThemeSelect.addEventListener('change', (e) => {
        autoRankThemeEnabled = e.target.value === 'on';
        saveAutoRankThemeSetting();
        if (autoRankThemeEnabled && Number.isFinite(lastMainRankIndex) && lastMainRankIndex > 0) {
            const applyIndex = Math.min(lastMainRankIndex, getThemeUnlockRankLimit());
            localStorage.setItem('benchmark_theme_user_selected', 'true');
            applyTheme(`rank-${applyIndex}`);
        }
    });
}

const languageSelect = document.getElementById('languageSelect');
if (languageSelect) {
    languageSelect.addEventListener('change', (e) => {
        applyLanguage(e.target.value);
    });
}

document.querySelectorAll('.auth-lang-select').forEach(sel => {
    sel.addEventListener('change', (e) => {
        applyLanguage(e.target.value);
    });
});

const visibilitySelect = document.getElementById('visibilitySelect');
if (visibilitySelect) {
    const savedVisibility = localStorage.getItem(VISIBILITY_STORAGE_KEY);
    if (savedVisibility) {
        visibilitySelect.value = savedVisibility;
    }
    visibilitySelect.addEventListener('change', (e) => {
        localStorage.setItem(VISIBILITY_STORAGE_KEY, e.target.value);
        saveSettings();
    });
}

const saveCustomThemeNameBtn = document.getElementById('saveCustomThemeNameBtn');
const removeCustomThemeBtn = document.getElementById('removeCustomThemeBtn');
const customThemeNameInput = document.getElementById('customThemeName');

if (saveCustomThemeNameBtn) {
    saveCustomThemeNameBtn.addEventListener('click', () => {
        const nextName = (customThemeNameInput?.value || '').trim();
        if (!nextName) return;
        customThemeName = nextName.slice(0, 16);
        const existingIndex = savedCustomThemes.findIndex(theme => theme.name === customThemeName);
        const isNew = existingIndex < 0;
        if (isNew) {
            customThemeHex = { ...CUSTOM_THEME_HEX_DEFAULTS };
            saveCustomThemeHex();
        }
        const snapshot = isNew ? { ...CUSTOM_THEME_HEX_DEFAULTS } : getCustomThemeHexSnapshot();
        if (existingIndex >= 0) {
            savedCustomThemes[existingIndex] = { name: customThemeName, hex: snapshot };
        } else {
            savedCustomThemes.push({ name: customThemeName, hex: snapshot });
        }
        customThemeEnabled = true;
        saveCustomThemeState();
        saveSavedCustomThemes();

        if (currentTheme === 'custom' || isNew) {
            applyTheme('custom');
        }
        updateCustomSwatches();
        updateCustomThemeUI();
    });
}

if (customThemeNameInput) {
    customThemeNameInput.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        if (saveCustomThemeNameBtn) saveCustomThemeNameBtn.click();
    });
}

if (removeCustomThemeBtn) {
    removeCustomThemeBtn.addEventListener('click', () => {
        if (!customThemeEnabled) return;
        const targetName = (customThemeNameInput?.value || customThemeName || '').trim();
        if (!targetName) return;
        const nextList = savedCustomThemes.filter(theme => theme.name !== targetName);
        if (nextList.length === savedCustomThemes.length) return;
        savedCustomThemes = nextList;
        if (customThemeName === targetName) {
            customThemeName = 'Custom';
        }
        saveCustomThemeState();
        saveSavedCustomThemes();
        updateCustomThemeUI();
    });
}

if (resetSelectedScoresBtn) {
    resetSelectedScoresBtn.addEventListener('click', resetSelectedScores);
}

if (resetAllScoresBtn) {
    resetAllScoresBtn.addEventListener('click', resetAllConfigurations);
}

const handleDefaultConfigChange = () => {
    const startupDefaults = getStartupConfigDefaults();
    const platform = document.getElementById('defaultPlatform')?.value || startupDefaults.platform;
    const time = document.getElementById('defaultTime')?.value || startupDefaults.time;
    const stat = document.getElementById('defaultStat')?.value || startupDefaults.stat;
    const mount = normalizeMountConfig(document.getElementById('defaultMount')?.value || startupDefaults.mount);
    const config = { platform, time, stat, mount };
    if (isViewMode) return;
    localStorage.setItem('benchmark_default_config', JSON.stringify(config));
    saveSettings();
};
['defaultPlatform', 'defaultTime', 'defaultStat', 'defaultMount'].forEach(id => {
    const select = document.getElementById(id);
    if (select) select.addEventListener('change', handleDefaultConfigChange);
});

initCustomThemePicker();
loadSavedCaveLinks();
loadSavedScores();
applyStoredSettings();
setupMountDropdown();
setupConfigDropdowns();
syncUserMenuDropdownWidth();
setupCavePlayEditors();
applyShareFromUrl();
handleProfileLink();

const privateHomeBtn = document.getElementById('privateProfileHomeBtn');
if (privateHomeBtn) {
    privateHomeBtn.addEventListener('click', () => {
        window.location.href = getBenchmarkAppEntryUrl();
    });
}

// Friends Logic
const friendsMenuBtn = document.getElementById('friendsMenuBtn');
const friendsModal = document.getElementById('friendsModal');
const closeFriendsModal = document.getElementById('closeFriendsModal');
const friendIdInput = document.getElementById('friendIdInput');
const addFriendBtn = document.getElementById('addFriendBtn');
const addFriendMessage = document.getElementById('addFriendMessage');
const friendList = document.getElementById('friendList');
const sentRequestsList = document.getElementById('sentRequestsList');
const friendRequestsList = document.getElementById('friendRequestsList');
const exitViewModeBtn = document.getElementById('exitViewModeBtn');
const exitViewModeContainer = document.getElementById('exitViewModeContainer');
const tabFriendsList = document.getElementById('tabFriendsList');
const tabFriendRequests = document.getElementById('tabFriendRequests');
const tabRemoveFriends = document.getElementById('tabRemoveFriends');
const friendsListContent = document.getElementById('friendsListContent');
const friendRequestsContent = document.getElementById('friendRequestsContent');
const removeFriendsContent = document.getElementById('removeFriendsContent');
const friendPageAccountIdDisplay = document.getElementById('friendPageAccountIdDisplay');
const removeFriendsList = document.getElementById('removeFriendsList');
let addFriendTimeout;

function resetFriendPageAccountIdVisibility() {
    if (!friendPageAccountIdDisplay) return;
    friendPageAccountIdDisplay.value = '**************';
    const toggleBtn = document.getElementById('friendPageToggleAccountIdView');
    if (toggleBtn) toggleBtn.textContent = t('show');
}

function closeFriendsModalUI() {
    if (friendsModal) friendsModal.classList.remove('show');
    if (addFriendTimeout) {
        clearTimeout(addFriendTimeout);
        addFriendTimeout = undefined;
    }
    if (addFriendMessage) {
        addFriendMessage.style.display = 'none';
        addFriendMessage.textContent = '';
        addFriendMessage.style.color = '#ccc';
    }
    resetFriendPageAccountIdVisibility();
    updateNotificationVisibility();
}

if (friendsMenuBtn) {
    friendsMenuBtn.addEventListener('click', () => {
        resetFriendPageAccountIdVisibility();
        if (addFriendTimeout) {
            clearTimeout(addFriendTimeout);
            addFriendTimeout = undefined;
        }
        if (addFriendMessage) {
            addFriendMessage.style.display = 'none';
            addFriendMessage.textContent = '';
            addFriendMessage.style.color = '#ccc';
        }
        friendsModal.classList.add('show');
        updateNotificationVisibility();
        // Reset to first tab
        if (tabFriendsList) tabFriendsList.click();
    });
}

if (tabFriendsList && tabFriendRequests && tabRemoveFriends) {
    tabFriendsList.addEventListener('click', () => {
        tabFriendsList.classList.add('active');
        tabFriendRequests.classList.remove('active');
        tabRemoveFriends.classList.remove('active');
        friendsListContent.style.display = 'flex';
        friendRequestsContent.style.display = 'none';
        removeFriendsContent.style.display = 'none';
        loadFriendsList();
        updateNotificationVisibility();
    });

    tabFriendRequests.addEventListener('click', () => {
        tabFriendRequests.classList.add('active');
        tabFriendsList.classList.remove('active');
        tabRemoveFriends.classList.remove('active');
        friendRequestsContent.style.display = 'flex';
        friendsListContent.style.display = 'none';
        removeFriendsContent.style.display = 'none';
        markCurrentFriendRequestsViewed();
        loadFriendRequests();
        loadSentFriendRequests();
        updateNotificationVisibility();
    });

    tabRemoveFriends.addEventListener('click', () => {
        tabRemoveFriends.classList.add('active');
        tabFriendsList.classList.remove('active');
        tabFriendRequests.classList.remove('active');
        removeFriendsContent.style.display = 'flex';
        friendsListContent.style.display = 'none';
        friendRequestsContent.style.display = 'none';
        loadRemoveFriendsList();
        updateNotificationVisibility();
    });
}

if (closeFriendsModal) {
    closeFriendsModal.addEventListener('click', closeFriendsModalUI);
}

bindModalOverlayQuickClose(friendsModal, closeFriendsModalUI);

function calculateRankFromData(data) {
    const scores = data.scores || {};
    let maxRankIndex = 0;

    if (scores) {
        Object.entries(scores).forEach(([key, scoreArray]) => {
            if (Array.isArray(scoreArray)) {
                let configTotalRating = 0;
                const baseScores = SCORE_BASES_BY_CONFIG[key] || SCORE_BASES_BY_CONFIG.default;
                scoreArray.forEach((score, idx) => {
                    const base = Number(baseScores[idx] ?? baseScores[0] ?? 0);
                    const values = new Array(15);
                    values[14] = base;
                    for (let k = 13; k >= 2; k--) {
                        values[k] = Math.max(0, Math.round(base * (1 - (14 - k) * 0.05)));
                    }
                    configTotalRating += calculateSingleRating(score, values.slice(2));
                });

                for (let i = RANK_THRESHOLDS.length - 1; i > 0; i--) {
                    if (configTotalRating >= RANK_THRESHOLDS[i]) {
                        if (i > maxRankIndex) maxRankIndex = i;
                        break;
                    }
                }
            }
        });
    }
    return maxRankIndex;
}

function getRankFilter(maxRankIndex) {
    let filter = 'grayscale(100%)';
    if (maxRankIndex === 2) filter = 'sepia(1) hue-rotate(-35deg) saturate(3) brightness(0.65)';
    else if (maxRankIndex === 3) filter = 'grayscale(100%) brightness(1.3)';
    else if (maxRankIndex === 4) filter = 'sepia(1) hue-rotate(5deg) saturate(2.5) brightness(0.9)';
    else if (maxRankIndex === 5) filter = 'sepia(1) hue-rotate(130deg) saturate(1.5) brightness(1.1)';
    else if (maxRankIndex === 6) filter = 'sepia(1) hue-rotate(170deg) saturate(3) brightness(1.0)';
    else if (maxRankIndex === 7) filter = 'sepia(1) hue-rotate(220deg) saturate(3) brightness(0.9)';
    else if (maxRankIndex === 8) filter = 'sepia(1) hue-rotate(10deg) saturate(5) brightness(1.2)';
    else if (maxRankIndex === 9) filter = 'sepia(1) hue-rotate(330deg) saturate(5) brightness(0.8)';
    else if (maxRankIndex === 10) filter = 'sepia(1) hue-rotate(120deg) saturate(2) brightness(0.9)';
    else if (maxRankIndex === 11) filter = STELLAR_TROPHY_FILTER;
    else if (maxRankIndex === 12) filter = 'sepia(1) hue-rotate(290deg) saturate(3) brightness(0.9)';
    else if (maxRankIndex >= 13) filter = 'sepia(1) hue-rotate(310deg) saturate(3) brightness(0.8)';
    return filter;
}

function getRankTextStyle(maxRankIndex) {
    if (maxRankIndex === 11) return 'background: linear-gradient(110deg, #FF6F00 20%, #FF8F00 40%, #FFA000 48%, #FFB300 50%, #FFA000 52%, #FF8F00 60%, #FF6F00 80%); background-size: 200% auto; -webkit-background-clip: text; background-clip: text; color: transparent; animation: eternalShimmer 2.5s linear infinite; font-weight: bold;';
    if (maxRankIndex === 12) return 'background: linear-gradient(110deg, #D8007F 20%, #E91E63 35%, #F06292 45%, #FF80AB 50%, #F06292 55%, #E91E63 65%, #D8007F 80%); background-size: 200% auto; -webkit-background-clip: text; background-clip: text; color: transparent; animation: eternalShimmer 2.5s linear infinite; font-weight: bold;';
    if (maxRankIndex >= 13) return 'background: linear-gradient(110deg, #763232 20%, #a64747 35%, #d67c7c 45%, #ffffff 50%, #d67c7c 55%, #a64747 65%, #763232 80%); background-size: 200% auto; -webkit-background-clip: text; background-clip: text; color: transparent; animation: eternalShimmer 2.5s linear infinite; font-weight: bold;';
    return `color: ${RANK_TEXT_COLORS[maxRankIndex] || '#888'};`;
}

function buildFriendProfilePicHtml(profile) {
    const pic = typeof profile?.pic === 'string' ? profile.pic.trim() : '';
    if (!pic) return '';
    const safePic = pic.replace(/'/g, "\\'");
    return `<div class="friend-profile-pic" style="background-image: url('${safePic}');"></div>`;
}

async function loadFriendsList() {
    const user = auth.currentUser;
    if (!user) return;
    
    friendList.innerHTML = '<div style="display: flex; justify-content: center; padding: 20px;"><div style="width: 24px; height: 24px; border: 2px solid rgba(255,255,255,0.1); border-radius: 50%; border-top-color: #f5c645; animation: spin 0.8s linear infinite;"></div></div>';

    try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.exists() ? (userDoc.data() || {}) : {};
        const friends = normalizeFriendRequestIds(userData.friends).filter((uid) => typeof uid === 'string' && uid.trim() !== '');
        
        if (friends.length === 0) {
            friendList.innerHTML = `<div style="color:#888; text-align:center; padding:20px;">${t('friends_none')}</div>`;
            return;
        }

        const friendDocResults = await Promise.allSettled(
            friends.map(async (identifier) => ({ identifier, snap: await resolveUserDocByIdentifier(identifier) }))
        );

        friendList.innerHTML = '';
        
        friendDocResults.forEach((result) => {
            if (result.status !== 'fulfilled') return;
            const friendDoc = result.value.snap;
            if (!friendDoc || !friendDoc.exists()) return;
            try {
                const data = friendDoc.data() || {};
                const profile = (data && typeof data.profile === 'object' && data.profile) ? data.profile : {};
                const name = data.username || profile.username || (data.accountId ? `ID: ${data.accountId}` : t('unknown_player'));
                
                const computedRankIndex = calculateRankFromData(data);
                const maxRankIndex = Number.isFinite(computedRankIndex) ? computedRankIndex : 0;
                const rankName = RANK_NAMES[maxRankIndex] || RANK_NAMES[0];
                const filter = getRankFilter(maxRankIndex);
                const rankStyle = getRankTextStyle(maxRankIndex);
                const rankIconSrc = '../icons/trophy.png';
                const picHtml = buildFriendProfilePicHtml(profile);

                const flag = profile.flag;
                let flagHtml = '';
                if (flag) {
                    flagHtml = `<div style="width: 20px; height: 13px; background-image: url('${getFlagUrl(flag)}'); background-size: cover; background-position: center; border-radius: 2px; margin-left: 6px; flex-shrink: 0;"></div>`;
                }

                const item = document.createElement('div');
                item.className = 'friend-item';
                item.innerHTML = `
                    ${picHtml}
                    <div class="friend-info">
                        <div style="display: flex; align-items: center; margin-bottom: 2px;">
                            <div class="friend-name" style="line-height: 1;">${name}</div>
                            ${flagHtml}
                        </div>
                        <div class="friend-status" style="${rankStyle}">${rankName}</div>
                    </div>
                    <img src="${rankIconSrc}" class="friend-rank-icon" style="filter: ${filter}; margin-left: auto;">
                `;

                item.addEventListener('click', (e) => {
                    enterViewMode(data, friendDoc.id);
                    closeFriendsModalUI();
                });

                friendList.appendChild(item);
            } catch (renderErr) {
                console.warn('Skipping invalid friend entry:', renderErr);
            }
        });
        if (!friendList.children.length) {
            friendList.innerHTML = `<div style="color:#888; text-align:center; padding:20px;">${t('friends_none')}</div>`;
        }
    } catch (e) {
        console.error("Error loading friends list", e);
        friendList.innerHTML = `<div style="color:#ff6666; text-align:center; padding:20px;">${t('friends_error_loading')}</div>`;
    }
}

async function loadFriendRequests() {
    const user = auth.currentUser;
    if (!user) return;

    friendRequestsList.innerHTML = '<div style="display: flex; justify-content: center; padding: 20px;"><div style="width: 24px; height: 24px; border: 2px solid rgba(255,255,255,0.1); border-radius: 50%; border-top-color: #f5c645; animation: spin 0.8s linear infinite;"></div></div>';

    try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const requestsRaw = userDoc.data().friendRequests || [];
        const requests = normalizeFriendRequestIds(requestsRaw);
        currentFriendRequests = requests;
        const requestsTabActive = tabFriendRequests && tabFriendRequests.classList.contains('active');
        if (requestsTabActive) {
            writeViewedFriendRequests(user.uid, requests);
            hasPendingRequests = false;
        } else {
            refreshPendingRequestState(user.uid, requests);
        }
        updateNotificationVisibility();

        if (requests.length === 0) {
            friendRequestsList.innerHTML = `<div style="color:#888; text-align:center; padding:20px;">${t('friend_requests_none')}</div>`;
            return;
        }

        const requesterDocs = await Promise.all(requests.map(uid => getDoc(doc(db, 'users', uid))));

        friendRequestsList.innerHTML = '';

        requesterDocs.forEach(requesterDoc => {
                if (requesterDoc.exists()) {
                const requesterUid = requesterDoc.id;
                    const data = requesterDoc.data();
                    const profile = data.profile || {};
                    const name = data.username || profile.username || (data.accountId ? `ID: ${data.accountId}` : t('unknown_player'));
                    
                    const maxRankIndex = calculateRankFromData(data);
                    const rankName = RANK_NAMES[maxRankIndex];
                    const filter = getRankFilter(maxRankIndex);
                    const rankStyle = getRankTextStyle(maxRankIndex);
                    const rankIconSrc = '../icons/trophy.png';
                    const picHtml = buildFriendProfilePicHtml(profile);

                    const item = document.createElement('div');
                    item.className = 'friend-item';
                    item.style.cursor = 'default';
                    item.innerHTML = `
                        ${picHtml}
                        <div class="friend-info">
                            <div class="friend-name">${name}</div>
                            <div class="friend-status" style="${rankStyle}">${rankName}</div>
                        </div>
                        <img src="${rankIconSrc}" class="friend-rank-icon" style="filter: ${filter};">
                        <div class="friend-actions">
                            <button class="friend-request-btn accept">${t('accept')}</button>
                            <button class="friend-request-btn decline">${t('decline')}</button>
                        </div>
                    `;

                    // Prevent item click from doing anything (like view mode)
                    item.addEventListener('click', (e) => e.stopPropagation());

                    item.querySelector('.accept').addEventListener('click', async () => {
                        try {
                            // Add to my friends, remove from my requests
                            const userUpdate = updateDoc(doc(db, 'users', user.uid), {
                                friends: arrayUnion(requesterUid),
                                friendRequests: arrayRemove(requesterUid)
                            });
                            // Add me to their friends and remove from their sent requests
                            const requesterUpdate = updateDoc(doc(db, 'users', requesterUid), {
                                friends: arrayUnion(user.uid),
                                sentFriendRequests: arrayRemove(user.uid)
                            });
                            await Promise.all([userUpdate, requesterUpdate]);
                            loadFriendRequests();
                        } catch (e) {
                            console.error("Error accepting friend", e);
                        }
                    });

                    item.querySelector('.decline').addEventListener('click', async () => {
                        try {
                            // Remove from my requests
                            const userUpdate = updateDoc(doc(db, 'users', user.uid), {
                                friendRequests: arrayRemove(requesterUid)
                            });
                            const requesterUpdate = updateDoc(doc(db, 'users', requesterUid), {
                                sentFriendRequests: arrayRemove(user.uid)
                            });
                            await Promise.all([userUpdate, requesterUpdate]);
                            loadFriendRequests();
                        } catch (e) {
                            console.error("Error declining friend", e);
                        }
                    });

                    friendRequestsList.appendChild(item);
                }
        });
    } catch (e) {
        console.error("Error loading requests", e);
        friendRequestsList.innerHTML = `<div style="color:#ff6666; text-align:center; padding:20px;">${t('friend_requests_error_loading')}</div>`;
    }
}

async function loadRemoveFriendsList() {
    const user = auth.currentUser;
    if (!user) return;
    
    removeFriendsList.innerHTML = '<div style="display: flex; justify-content: center; padding: 20px;"><div style="width: 24px; height: 24px; border: 2px solid rgba(255,255,255,0.1); border-radius: 50%; border-top-color: #f5c645; animation: spin 0.8s linear infinite;"></div></div>';

    try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.exists() ? (userDoc.data() || {}) : {};
        const friends = normalizeFriendRequestIds(userData.friends).filter((uid) => typeof uid === 'string' && uid.trim() !== '');
        
        if (friends.length === 0) {
            removeFriendsList.innerHTML = `<div style="color:#888; text-align:center; padding:20px;">${t('remove_friends_none')}</div>`;
            return;
        }

        const friendDocResults = await Promise.allSettled(
            friends.map(async (identifier) => ({ identifier, snap: await resolveUserDocByIdentifier(identifier) }))
        );
        
        removeFriendsList.innerHTML = '';
        
        friendDocResults.forEach((result) => {
            if (result.status !== 'fulfilled') return;
            const friendDoc = result.value.snap;
            if (friendDoc && friendDoc.exists()) {
                const friendUid = friendDoc.id;
                const data = friendDoc.data();
                const profile = data.profile || {};
                const name = data.username || profile.username || (data.accountId ? `ID: ${data.accountId}` : t('unknown_player'));
                
                const maxRankIndex = calculateRankFromData(data);
                const rankName = RANK_NAMES[maxRankIndex];
                const filter = getRankFilter(maxRankIndex);
                const rankStyle = getRankTextStyle(maxRankIndex);
                const rankIconSrc = '../icons/trophy.png';
                const picHtml = buildFriendProfilePicHtml(profile);

                const flag = profile.flag;
                let flagHtml = '';
                if (flag) {
                    flagHtml = `<div style="width: 20px; height: 13px; background-image: url('${getFlagUrl(flag)}'); background-size: cover; background-position: center; border-radius: 2px; margin-left: 6px; flex-shrink: 0;"></div>`;
                }

                const item = document.createElement('div');
                item.className = 'friend-item';
                item.style.cursor = 'default';
                item.innerHTML = `
                    ${picHtml}
                    <div class="friend-info">
                        <div style="display: flex; align-items: center; margin-bottom: 2px;">
                            <div class="friend-name" style="line-height: 1;">${name}</div>
                            ${flagHtml}
                        </div>
                        <div class="friend-status" style="${rankStyle}">${rankName}</div>
                    </div>
                    <div class="friend-actions">
                        <button class="friend-request-btn decline" style="padding: 6px 12px;">${t('remove')}</button>
                    </div>
                `;

                item.querySelector('.decline').addEventListener('click', async (e) => {
                    e.stopPropagation();
                    showConfirmModal(t('remove_friend_title'), tf('remove_friend_confirm', { name }), async () => {
                        try {
                            const currentUserUpdate = updateDoc(doc(db, 'users', user.uid), {
                                friends: arrayRemove(friendUid)
                            });
                            const friendUserUpdate = updateDoc(doc(db, 'users', friendUid), {
                                friends: arrayRemove(user.uid)
                            });
                            await Promise.all([currentUserUpdate, friendUserUpdate]);
                            loadRemoveFriendsList();
                        } catch (err) {
                            console.error("Error removing friend:", err);
                            alert(t('remove_friend_failed'));
                        }
                    });
                });

                removeFriendsList.appendChild(item);
            }
        });
        if (!removeFriendsList.children.length) {
            removeFriendsList.innerHTML = `<div style="color:#888; text-align:center; padding:20px;">${t('remove_friends_none')}</div>`;
        }
    } catch (e) {
        console.error("Error loading remove friends list", e);
        removeFriendsList.innerHTML = `<div style="color:#ff6666; text-align:center; padding:20px;">${t('friends_error_loading')}</div>`;
    }
}

async function loadSentFriendRequests() {
    const user = auth.currentUser;
    if (!user || !sentRequestsList) return;

    sentRequestsList.innerHTML = '<div style="display: flex; justify-content: center; padding: 20px;"><div style="width: 24px; height: 24px; border: 2px solid rgba(255,255,255,0.1); border-radius: 50%; border-top-color: #f5c645; animation: spin 0.8s linear infinite;"></div></div>';

    try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const sentRequests = userDoc.data().sentFriendRequests || [];

        if (sentRequests.length === 0) {
            sentRequestsList.innerHTML = `<div style="color:#888; text-align:center; padding:10px 20px;">${t('sent_requests_none')}</div>`;
            return;
        }

        const targetDocs = await Promise.all(sentRequests.map(uid => getDoc(doc(db, 'users', uid))));

        sentRequestsList.innerHTML = '';

        targetDocs.forEach(targetDoc => {
                if (targetDoc.exists()) {
                const targetUid = targetDoc.id;
                    const data = targetDoc.data();
                    const profile = data.profile || {};
                    const name = data.username || profile.username || (data.accountId ? `ID: ${data.accountId}` : t('unknown_player'));
                    
                    const maxRankIndex = calculateRankFromData(data);
                    const rankName = RANK_NAMES[maxRankIndex];
                    const filter = getRankFilter(maxRankIndex);
                    const rankStyle = getRankTextStyle(maxRankIndex);
                    const rankIconSrc = '../icons/trophy.png';
                    const picHtml = buildFriendProfilePicHtml(profile);

                    const flag = profile.flag;
                    let flagHtml = '';
                    if (flag) {
                        flagHtml = `<div style="width: 20px; height: 13px; background-image: url('${getFlagUrl(flag)}'); background-size: cover; background-position: center; border-radius: 2px; margin-left: 6px; flex-shrink: 0;"></div>`;
                    }

                    const item = document.createElement('div');
                    item.className = 'friend-item';
                    item.style.cursor = 'default';
                    item.innerHTML = `
                        ${picHtml}
                        <div class="friend-info">
                            <div style="display: flex; align-items: center; margin-bottom: 2px;">
                                <div class="friend-name" style="line-height: 1;">${name}</div>
                                ${flagHtml}
                            </div>
                            <div class="friend-status" style="${rankStyle}">${rankName}</div>
                        </div>
                        <img src="${rankIconSrc}" class="friend-rank-icon" style="filter: ${filter};">
                        <div class="friend-actions">
                            <button class="friend-request-btn decline">${t('cancel')}</button>
                        </div>
                    `;

                    item.querySelector('.decline').addEventListener('click', async () => {
                        try {
                            // Remove from my sent requests
                            const myUpdate = updateDoc(doc(db, 'users', user.uid), {
                                sentFriendRequests: arrayRemove(targetUid)
                            });
                            // Remove from their received requests
                            const targetUpdate = updateDoc(doc(db, 'users', targetUid), {
                                friendRequests: arrayRemove(user.uid)
                            });
                            await Promise.all([myUpdate, targetUpdate]);
                            loadSentFriendRequests();
                        } catch (e) {
                            console.error("Error cancelling request", e);
                        }
                    });

                    sentRequestsList.appendChild(item);
                }
        });
    } catch (e) {
        console.error("Error loading sent requests", e);
        sentRequestsList.innerHTML = `<div style="color:#ff6666; text-align:center; padding:20px;">${t('sent_requests_error_loading')}</div>`;
    }
}

if (addFriendBtn) {
    addFriendBtn.addEventListener('click', async () => {
        const user = auth.currentUser;
        if (!user) return;
        
        const id = friendIdInput.value.trim().toUpperCase();
        if (!id) return;
        
        addFriendBtn.disabled = true;
        addFriendMessage.style.display = 'none';
        
        try {
            const currentUserDoc = await getDoc(doc(db, 'users', user.uid));
            const currentFriends = currentUserDoc.exists() ? (currentUserDoc.data().friends || []) : [];
            const sentRequests = currentUserDoc.exists() ? (currentUserDoc.data().sentFriendRequests || []) : [];
            const receivedRequests = currentUserDoc.exists() ? (currentUserDoc.data().friendRequests || []) : [];

            const q = query(collection(db, 'users'), where('accountId', '==', id));
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                addFriendMessage.textContent = t('add_friend_user_not_found');
                addFriendMessage.style.color = '#ff6666';
                addFriendMessage.style.display = 'block';
            } else {
                const friendDoc = querySnapshot.docs[0];
                const friendUid = friendDoc.id;
                
                if (friendUid === user.uid) {
                    addFriendMessage.textContent = t('add_friend_self');
                    addFriendMessage.style.color = '#ff6666';
                    addFriendMessage.style.display = 'block';
                } else if (currentFriends.includes(friendUid)) {
                    addFriendMessage.textContent = t('add_friend_already_friends');
                    addFriendMessage.style.color = '#ff6666';
                    addFriendMessage.style.display = 'block';
                } else if (sentRequests.includes(friendUid)) {
                    addFriendMessage.textContent = t('add_friend_already_sent');
                    addFriendMessage.style.color = '#ffcc00';
                    addFriendMessage.style.display = 'block';
                } else if (receivedRequests.includes(friendUid)) {
                    addFriendMessage.textContent = t('add_friend_check_requests');
                    addFriendMessage.style.color = '#ffcc00';
                    addFriendMessage.style.display = 'block';
                } else {
                    // Send request to the other user
                    const targetUpdate = updateDoc(doc(db, 'users', friendUid), {
                        friendRequests: arrayUnion(user.uid)
                    });
                    // Add to my sent requests
                    const myUpdate = updateDoc(doc(db, 'users', user.uid), {
                        sentFriendRequests: arrayUnion(friendUid)
                    });
                    await Promise.all([targetUpdate, myUpdate]);
                    
                    addFriendMessage.textContent = t('add_friend_sent');
                    addFriendMessage.style.color = '#4caf50';
                    addFriendMessage.style.display = 'block';
                    friendIdInput.value = '';
                    // We don't reload friends list immediately because it's just a request
                    if (addFriendTimeout) clearTimeout(addFriendTimeout);
                    addFriendTimeout = setTimeout(() => {
                        addFriendMessage.style.display = 'none';
                    }, 5000);
                }
            }
        } catch (e) {
            console.error("Error adding friend:", e);
            addFriendMessage.textContent = t('add_friend_error');
            addFriendMessage.style.color = '#ff6666';
            addFriendMessage.style.display = 'block';
        } finally {
            addFriendBtn.disabled = false;
        }
    });
}

async function enterViewMode(data, uid) {
    const user = auth.currentUser;

    // Security Check for Friends Only
    if (uid && user && uid !== user.uid) {
        const settings = data.settings || {};
        const visibility = settings.visibility || 'everyone';
        
        if (visibility === 'friends') {
            let isAllowed = false;
            const friends = data.friends || [];
            if (friends.includes(user.uid)) {
                isAllowed = true;
            } else {
                // Check Guilds
                let myGuilds = [];
                try {
                    const storedGuilds = localStorage.getItem('benchmark_guilds');
                    if (storedGuilds) {
                        myGuilds = JSON.parse(storedGuilds);
                    } else {
                        const myDoc = await getDoc(doc(db, 'users', user.uid));
                        if (myDoc.exists()) {
                            myGuilds = (myDoc.data().profile && myDoc.data().profile.guilds) || [];
                        }
                    }
                } catch(e) { console.error("Guild check error", e); }

                const targetGuilds = (data.profile && data.profile.guilds) || [];
                if (myGuilds.some(g => targetGuilds.includes(g))) {
                    isAllowed = true;
                }
            }

            if (!isAllowed) {
                showPrivateProfileOverlay();
                return;
            }
        }
    }

    saveCurrentScores();
    updateViewProfileUrl(data, uid);
    {
        const profile = (data && typeof data.profile === 'object' && data.profile) ? data.profile : {};
        activeViewProfileContext = {
            uid: uid || '',
            username: (data && data.username) || profile.username || 'player',
            accountId: (data && data.accountId) || ''
        };
    }
    isViewMode = true;
    document.body.classList.add('view-mode');
    
    // Hide User Menu and Settings
    const userMenuBox = document.getElementById('userMenuBox');
    const settingsBtn = document.getElementById('settingsBtn');
    if (userMenuBox) userMenuBox.style.display = 'none';
    if (settingsBtn) settingsBtn.style.display = 'none';
    
    // Show Exit Button
    if (exitViewModeContainer) exitViewModeContainer.style.display = 'flex';

    let mobileExitBtn = document.getElementById('mobileExitViewBtn');
    if (!mobileExitBtn) {
        mobileExitBtn = document.createElement('button');
        mobileExitBtn.id = 'mobileExitViewBtn';
        mobileExitBtn.className = 'mobile-exit-view-btn';
        mobileExitBtn.textContent = t('exit_view_mode');
        document.body.appendChild(mobileExitBtn);
        mobileExitBtn.addEventListener('click', () => {
             if (exitViewModeBtn) exitViewModeBtn.click();
        });
    }
    mobileExitBtn.style.display = 'block';

    // Load Friend Data
    savedScores = data.scores || {};
    savedCaveLinks = data.caveLinks || {};
    savedConfigThemes = data.configThemes || {};
    
    // Apply friend's theme settings
    if (data.settings) {
        if (data.settings.rankThemeUnlock) {
            maxUnlockedRankIndex = Number(data.settings.rankThemeUnlock) || 0;
        }
        if (data.settings.autoRankTheme) {
            autoRankThemeEnabled = data.settings.autoRankTheme === 'true';
        } else {
            autoRankThemeEnabled = false;
        }
        if (data.settings.customTheme && data.settings.customTheme.hex) {
            customThemeHex = data.settings.customTheme.hex;
        }
        if (data.settings.pacmanMode) {
            pacmanModeEnabled = data.settings.pacmanMode === 'true';
        }
    }

    if (data.highlights) {
        userHighlights = data.highlights;
    } else {
        userHighlights = [];
    }
    renderHighlights();

    // Determine best config based on highest rank
    let bestConfig = null;
    if (data.scores) {
        let maxTotalRating = -1;
        Object.entries(data.scores).forEach(([key, scores]) => {
            if (!Array.isArray(scores)) return;
            
            const baseScores = SCORE_BASES_BY_CONFIG[key] || SCORE_BASES_BY_CONFIG.default;
            let totalRating = 0;
            scores.forEach((score, idx) => {
                const base = Number(baseScores[idx] ?? baseScores[0] ?? 0);
                const values = new Array(15);
                values[14] = base;
                for (let k = 13; k >= 2; k--) {
                    values[k] = Math.max(0, Math.round(base * (1 - (14 - k) * 0.05)));
                }
                totalRating += calculateSingleRating(score, values.slice(2));
            });

            if (totalRating > maxTotalRating) {
                maxTotalRating = totalRating;
                const parts = key.split('|');
                if (parts.length >= 3) {
                    bestConfig = {
                        platform: parts[0],
                        time: parts[1],
                        stat: parts[2],
                        mount: normalizeMountConfig(parts[3] || DEFAULT_MOUNT_CONFIG)
                    };
                }
            }
        });
    }

    const configToUse = bestConfig || (data.settings && data.settings.defaultConfig) || { platform: 'Mobile', time: '5 Min', stat: 'Baddy Kills', mount: DEFAULT_MOUNT_CONFIG };

    const platformText = document.getElementById('platformText');
    const timeText = document.getElementById('timeText');
    const statText = document.getElementById('statText');

    if (platformText && configToUse.platform) {
        platformText.textContent = configToUse.platform;
        if (configToUse.platform === 'Mobile') platformText.style.color = '#2196F3';
        if (configToUse.platform === 'PC') platformText.style.color = '#F44336';
    }
    if (timeText && configToUse.time) timeText.textContent = configToUse.time;
    if (statText && configToUse.stat) statText.textContent = configToUse.stat;
    applyMountConfigVisual(configToUse.mount || DEFAULT_MOUNT_CONFIG);

    const themeFallback = (data.settings && data.settings.theme) || 'default';
    const keyCandidates = getConfigLookupKeys();
    let themeToApply = themeFallback;
    for (const key of keyCandidates) {
        if (savedConfigThemes[key]) {
            themeToApply = savedConfigThemes[key];
            break;
        }
    }
    applyTheme(themeToApply, false);

    // Update Profile Header
    const profile = data.profile || {};
    document.querySelector('.profile-name').textContent = data.username || profile.username || 'Unknown';
    
    const circle = document.querySelector('.profile-circle');
    const flagEl = document.querySelector('.nationality-flag');
    
    if (profile.pic) {
        circle.style.backgroundImage = `url(${profile.pic})`;
        circle.style.backgroundSize = 'cover';
        circle.style.backgroundColor = 'transparent';
        circle.style.display = 'block';
        circle.classList.remove('no-pic-has-flag');
    } else {
        circle.style.backgroundImage = '';
        circle.style.backgroundColor = 'transparent';
        if (profile.flag) {
            circle.classList.add('no-pic-has-flag');
            circle.style.display = 'block';
        } else {
            circle.style.display = 'none';
        }
    }

    if (profile.flag) {
        flagEl.textContent = '';
        flagEl.style.backgroundImage = `url(${getFlagUrl(profile.flag)})`;
        flagEl.style.display = 'flex';
    } else {
        flagEl.style.display = 'none';
    }

    // Update Guild
    const guildNameEl = document.querySelector('.guild-name');
    if (guildNameEl) {
        if (profile.guilds && profile.guilds.length > 0) {
            guildNameEl.textContent = profile.guilds.map(g => `(${g})`).join(' ');
            guildNameEl.style.display = 'block';
        } else {
            guildNameEl.style.display = 'none';
        }
    }

    // Update Trophies
    const trophyList = document.getElementById('trophyList');
    const trophyPlaceholder = document.getElementById('trophyPlaceholder');
    if (trophyPlaceholder) trophyPlaceholder.style.display = 'none'; // Hide add button in view mode
    
    if (trophyList) {
        renderSeasonalTrophyList(trophyList, profile.trophies || {});
        trophyList.style.display = 'flex';
    }

    if (data.achievements) {
        userAchievements = data.achievements;
    } else {
        userAchievements = {};
    }
    renderAchievements();

    // Update View Count
    const viewCountEl = document.getElementById('viewCount');
    if (viewCountEl) {
        const views = (data.profile && data.profile.views) || 0;
        viewCountEl.textContent = views.toLocaleString();
    }
    if (uid) {
        incrementViewCount(uid);
    }

    setRadarMode('combined', false);
    updateRadar(); // Refresh for Pacman mode

    // Refresh Scores & UI
    loadScores();
    updateScoreRequirements();
    loadCaveLinks();
    
    // Disable Inputs
    document.querySelectorAll('.score-input').forEach(input => {
        input.disabled = true;
        input.style.pointerEvents = 'none';
    });
    // Keep cave link icons clickable in view mode (editing is already blocked by isViewMode checks).
    document.querySelectorAll('.cave-play-wrapper').forEach(wrapper => {
        wrapper.style.pointerEvents = 'auto';
    });
}

if (exitViewModeBtn) {
    exitViewModeBtn.addEventListener('click', async () => {
        const user = auth.currentUser;
        if (!user) {
            window.location.href = getBenchmarkLoginUrl();
            return;
        }

        isViewMode = false;
        activeViewProfileContext = null;
        document.body.classList.remove('view-mode');
        
        const userMenuBox = document.getElementById('userMenuBox');
        const settingsBtn = document.getElementById('settingsBtn');
        if (userMenuBox) userMenuBox.style.display = 'flex';
        if (settingsBtn) settingsBtn.style.display = 'flex';
        
        if (exitViewModeContainer) exitViewModeContainer.style.display = 'none';
        
        const mobileExitBtn = document.getElementById('mobileExitViewBtn');
        if (mobileExitBtn) mobileExitBtn.style.display = 'none';
        
        const trophyPlaceholder = document.getElementById('trophyPlaceholder');
        if (trophyPlaceholder) trophyPlaceholder.style.display = 'block';

        document.querySelectorAll('.score-input').forEach(input => {
            input.disabled = false;
            input.style.pointerEvents = 'auto';
        });
        document.querySelectorAll('.cave-play-wrapper').forEach(wrapper => {
            wrapper.style.pointerEvents = 'auto';
        });

        const url = new URL(window.location);
        if (url.searchParams.has('id')) {
            url.searchParams.delete('id');
            window.history.pushState({}, '', url);
        }

        loadSavedScores();
        loadSavedCaveLinks();
        loadSavedConfigThemes();
        
        loadCustomThemeState();
        loadSavedCustomThemes();
        loadCustomThemeHex();
        loadRankThemeUnlock();
        loadAutoRankThemeSetting();
        loadPacmanSetting();

        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        const ranksBarsContainer = document.getElementById('ranksBarsContainer');
        if (ranksBarsContainer) ranksBarsContainer.scrollLeft = 0;
        const ranksWrapper = document.querySelector('.ranks-wrapper');
        if (ranksWrapper) ranksWrapper.scrollLeft = 0;
        
        updateMainHeaderLayout();
        updateMainPageGuildDisplay();
        
        if (user.displayName) {
             document.querySelector('.profile-name').textContent = user.displayName;
             const userMenuName = document.getElementById('userMenuUsername');
             if (userMenuName) userMenuName.textContent = user.displayName;
        }
        updateOwnProfileUrl(user, {
            username: user.displayName || (document.querySelector('.profile-name') ? document.querySelector('.profile-name').textContent : 'player'),
            accountId: getRuntimeAccountId(),
            profile: {}
        });

        const cachedViews = localStorage.getItem('benchmark_cached_views');
        const viewCountEl = document.getElementById('viewCount');
        if (viewCountEl) {
             viewCountEl.textContent = cachedViews ? Number(cachedViews).toLocaleString() : '0';
        }

        renderTrophies();

        try {
            const saved = localStorage.getItem('benchmark_achievements');
            if (saved) userAchievements = JSON.parse(saved);
            else userAchievements = {};
        } catch (e) { userAchievements = {}; }
        updateAchievementsProgress();
        
        userHighlights = [];
        renderHighlights();
        
        await loadUserProfile(user);
        
        applyStoredSettings(); 
        
        loadScores();
        updateScoreRequirements();
        loadCaveLinks();
        
        setRadarMode('combined', false);
        updateRadar();
    });
}

async function incrementViewCount(targetUid) {
    if (!targetUid) return;

    const user = auth.currentUser;
    if (user && user.uid === targetUid) return;
    const viewerId = user ? user.uid : 'anon';

    const VIEW_COOLDOWN = 10 * 60 * 1000; // 10 minutes cooldown per user per profile
    const storageKey = `benchmark_view_cooldown_${viewerId}_${targetUid}`;
    const lastView = parseInt(localStorage.getItem(storageKey) || '0', 10);
    const now = Date.now();

    if (now - lastView < VIEW_COOLDOWN) {
        return;
    }

    try {
        const userRef = doc(db, 'users', targetUid);
        await updateDoc(userRef, {
            'profile.views': increment(1)
        });
        localStorage.setItem(storageKey, now.toString());
        
        // Update UI if we are currently viewing this user
        const viewCountEl = document.getElementById('viewCount');
        if (viewCountEl) {
            let current = parseInt(viewCountEl.textContent.replace(/,/g, '') || '0', 10);
            viewCountEl.textContent = (current + 1).toLocaleString();
        }
    } catch (e) {
        console.error("Error incrementing view count:", e);
    }
}

const SEASONAL_TROPHY_META = [
    { key: '1st', labelKey: 'seasonal_place_1st', shortKey: 'seasonal_place_1st', image: '../icons/1sttrophy.png', tier: 'first' },
    { key: '2nd', labelKey: 'seasonal_place_2nd', shortKey: 'seasonal_place_2nd', image: '../icons/2ndtrophy.png', tier: 'second' },
    { key: '3rd', labelKey: 'seasonal_place_3rd', shortKey: 'seasonal_place_3rd', image: '../icons/3rdtrophy.png', tier: 'third' },
    { key: 'plaque', labelKey: 'seasonal_place_plaque', shortKey: 'seasonal_place_plaque', image: '../icons/plaque.png', tier: 'plaque' }
];

function normalizeTrophyCount(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) return 0;
    return Math.min(50, Math.floor(parsed));
}

function renderSeasonalTrophyList(list, trophyData) {
    if (!list) return 0;
    list.innerHTML = '';

    const counts = {};
    let total = 0;
    SEASONAL_TROPHY_META.forEach(meta => {
        const count = normalizeTrophyCount(trophyData ? trophyData[meta.key] : 0);
        counts[meta.key] = count;
        total += count;
    });

    const header = document.createElement('div');
    header.className = 'trophy-list-header';
    header.innerHTML = `
        <div class="seasonal-label">${t('seasonal_modal_title')}</div>
        <div class="seasonal-total"><span>${total}</span> ${t('seasonal_total_label')}</div>
    `;
    list.appendChild(header);

    const row = document.createElement('div');
    row.className = 'trophy-row';
    SEASONAL_TROPHY_META.forEach(meta => {
        const card = document.createElement('div');
        card.className = `trophy-card trophy-card-${meta.tier}`;

        const img = document.createElement('img');
        img.src = meta.image;
        img.className = 'trophy-img';
        img.alt = t(meta.labelKey);

        const info = document.createElement('div');
        info.className = 'trophy-card-info';

        const label = document.createElement('div');
        label.className = 'trophy-card-label';
        label.textContent = t(meta.shortKey);

        const count = document.createElement('div');
        count.className = 'trophy-card-count';
        count.textContent = String(counts[meta.key]);

        info.appendChild(label);
        info.appendChild(count);
        card.appendChild(img);
        card.appendChild(info);
        row.appendChild(card);
    });

    list.appendChild(row);
    list.style.display = 'flex';
    return total;
}

function renderTrophies() {
    const storageKey = 'benchmark_seasonal_trophies';
    let trophyData = { '1st': 0, '2nd': 0, '3rd': 0, 'plaque': 0 };
    try {
        const saved = localStorage.getItem(storageKey);
        if (saved) trophyData = JSON.parse(saved);
    } catch (e) {}

    const list = document.getElementById('trophyList');
    const placeholder = document.getElementById('trophyPlaceholder');
    if (!list || !placeholder) return;

    renderSeasonalTrophyList(list, trophyData);
    placeholder.style.display = 'none';
    list.style.display = 'flex';
}

function initTrophySystem() {
    if (isViewMode) return;
    const placeholder = document.getElementById('trophyPlaceholder');
    const list = document.getElementById('trophyList');
    const modal = document.getElementById('trophyModal');
    const closeBtn = document.getElementById('closeTrophyModal');
    const saveBtn = document.getElementById('saveTrophiesBtn');
    const resetBtn = document.getElementById('resetTrophiesBtn');
    
    const inputs = {
        '1st': document.getElementById('trophyInput1st'),
        '2nd': document.getElementById('trophyInput2nd'),
        '3rd': document.getElementById('trophyInput3rd'),
        'plaque': document.getElementById('trophyInputPlaque')
    };
    const totalEl = document.getElementById('trophyModalTotal');

    function updateTrophyModalTotal() {
        if (!totalEl) return;
        let total = 0;
        Object.values(inputs).forEach(input => {
            if (!input) return;
            const parsed = parseInt(input.value, 10);
            if (!isNaN(parsed) && parsed > 0) total += Math.min(parsed, 50);
        });
        totalEl.textContent = total.toLocaleString();
    }

    Object.values(inputs).forEach(input => {
        if (input) {
            input.addEventListener('focus', function() {
                this.select();
            });
            input.addEventListener('input', function() {
                if (this.value > 50) this.value = 50;
                if (this.value < 0) this.value = 0;
                updateTrophyModalTotal();
            });
        }
    });

    const storageKey = 'benchmark_seasonal_trophies';

    function openModal() {
        let trophyData = { '1st': 0, '2nd': 0, '3rd': 0, 'plaque': 0 };
        try { const saved = localStorage.getItem(storageKey); if (saved) trophyData = JSON.parse(saved); } catch (e) {}
        Object.keys(inputs).forEach(key => {
            inputs[key].value = trophyData[key] || 0;
        });
        updateTrophyModalTotal();
        modal.classList.add('show');
    }

    function closeModal() {
        modal.classList.add('closing');
        setTimeout(() => {
            modal.classList.remove('show');
            modal.classList.remove('closing');
        }, 200);
    }

    async function save() {
        if (isViewMode) return;
        let trophyData = { '1st': 0, '2nd': 0, '3rd': 0, 'plaque': 0 };
        Object.keys(inputs).forEach(key => {
            let val = parseInt(inputs[key].value, 10);
            if (isNaN(val) || val < 0) val = 0;
            trophyData[key] = Math.min(val, 50);
        });
        localStorage.setItem(storageKey, JSON.stringify(trophyData));
        await saveUserData({ profile: { trophies: trophyData } });
        renderTrophies();
        closeModal();
    }

    function resetInputs() {
        Object.values(inputs).forEach(input => {
            if (input) input.value = 0;
        });
        updateTrophyModalTotal();
    }

    placeholder.addEventListener('click', () => {
        if (!isViewMode) openModal();
    });
    list.addEventListener('click', () => {
        if (!isViewMode) openModal();
    });
    closeBtn.addEventListener('click', closeModal);
    saveBtn.addEventListener('click', save);
    if (resetBtn) {
        resetBtn.addEventListener('click', resetInputs);
    }
    bindModalOverlayQuickClose(modal, closeModal);

    renderTrophies();
}
initTrophySystem();

const addHighlightBtn = document.getElementById('addHighlightBtn');
const highlightsGrid = document.getElementById('highlightsGrid');
const highlightModal = document.getElementById('highlightModal');
const closeHighlightModalBtn = document.getElementById('closeHighlightModal');
const cancelHighlightBtn = document.getElementById('cancelHighlightBtn');
const saveHighlightBtn = document.getElementById('saveHighlightBtn');
const highlightUploadArea = document.getElementById('highlightUploadArea');
const highlightUploadText = document.getElementById('highlightUploadText');
const highlightPreviewImg = document.getElementById('highlightPreviewImg');
const highlightFileInput = document.getElementById('highlightFileInput');
const highlightTitleInput = document.getElementById('highlightTitleInput');
const highlightDescInput = document.getElementById('highlightDescInput');
const highlightErrorMessage = document.getElementById('highlightErrorMessage');
const imageViewerModal = document.getElementById('imageViewerModal');
const imageViewerImg = document.getElementById('imageViewerImg');
const imageViewerTitle = document.getElementById('imageViewerTitle');
const closeImageViewerModalBtn = document.getElementById('closeImageViewerModal');

let highlightDraftImage = '';
let editingHighlightIndex = -1;
let activeHighlightPreviewCard = null;

function resetHighlightModal() {
    highlightDraftImage = '';
    editingHighlightIndex = -1;
    if (highlightTitleInput) highlightTitleInput.value = '';
    if (highlightDescInput) highlightDescInput.value = '';
    if (highlightPreviewImg) {
        highlightPreviewImg.removeAttribute('src');
        highlightPreviewImg.style.display = 'none';
    }
    if (highlightUploadText) highlightUploadText.style.display = 'inline';
    if (highlightFileInput) highlightFileInput.value = '';
    if (highlightErrorMessage) {
        highlightErrorMessage.textContent = '';
        highlightErrorMessage.style.display = 'none';
    }
}

function showHighlightError(message) {
    if (!highlightErrorMessage) return;
    highlightErrorMessage.textContent = message;
    highlightErrorMessage.style.display = 'block';
}

function closeHighlightModalUI() {
    if (!highlightModal) return;
    highlightModal.classList.remove('show');
}

function openHighlightModal(index = -1) {
    if (!highlightModal || isViewMode) return;
    resetHighlightModal();
    editingHighlightIndex = Number.isInteger(index) ? index : -1;
    if (editingHighlightIndex >= 0 && userHighlights[editingHighlightIndex]) {
        const existing = userHighlights[editingHighlightIndex];
        highlightDraftImage = existing.image || '';
        if (highlightTitleInput) highlightTitleInput.value = existing.title || '';
        if (highlightDescInput) highlightDescInput.value = existing.description || '';
        if (highlightPreviewImg && highlightDraftImage) {
            highlightPreviewImg.src = highlightDraftImage;
            highlightPreviewImg.style.display = 'block';
        }
        if (highlightUploadText) {
            highlightUploadText.style.display = highlightDraftImage ? 'none' : 'inline';
        }
    }
    highlightModal.classList.add('show');
}

async function persistHighlights() {
    if (isViewMode) return;
    await saveUserData({ highlights: userHighlights });
}

function openImageViewer(src, title = '') {
    if (!imageViewerModal || !imageViewerImg) return;
    imageViewerImg.src = src;
    if (imageViewerTitle) imageViewerTitle.textContent = '';
    imageViewerModal.classList.add('show');
}

function bindCaveImageViewer() {
    const caveRows = document.querySelectorAll('.rank-bar:nth-child(2)');
    caveRows.forEach((row) => {
        if (!row) return;
        const img = row.querySelector('img');
        if (img) img.classList.add('cave-cell-image');
    });

    if (bindCaveImageViewer._bound) return;
    bindCaveImageViewer._bound = true;
    let activeHoverImg = null;

    const findImageAtPoint = (clientX, clientY) => {
        const images = document.querySelectorAll('.rank-bar:nth-child(2) img.cave-cell-image');
        for (const img of images) {
            if (!img || !img.getBoundingClientRect) continue;
            const rect = img.getBoundingClientRect();
            if (rect.width <= 0 || rect.height <= 0) continue;
            if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
                return img;
            }
        }
        return null;
    };

    document.addEventListener('click', (e) => {
        if (!e) return;
        if (imageViewerModal && imageViewerModal.classList.contains('show')) return;
        if (e.target && e.target.closest && e.target.closest('.cave-play-wrapper, .cave-play-icon, .cave-play-edit, .cave-play-panel')) return;
        const img = findImageAtPoint(e.clientX, e.clientY);
        if (!img) return;
        const src = img.getAttribute('src');
        if (!src) return;
        e.preventDefault();
        e.stopPropagation();
        const row = img.closest('.rank-bar:nth-child(2)');
        const title = row ? (row.textContent || '').trim() : '';
        openImageViewer(src, title);
    }, true);

    document.addEventListener('mousemove', (e) => {
        if (!e || window.innerWidth <= 900) return;
        const img = findImageAtPoint(e.clientX, e.clientY);
        if (img === activeHoverImg) return;
        if (activeHoverImg && activeHoverImg.classList) activeHoverImg.classList.remove('cave-img-hover');
        activeHoverImg = img || null;
        if (activeHoverImg && activeHoverImg.classList) activeHoverImg.classList.add('cave-img-hover');
    }, true);

    document.addEventListener('mouseleave', () => {
        if (activeHoverImg && activeHoverImg.classList) activeHoverImg.classList.remove('cave-img-hover');
        activeHoverImg = null;
    }, true);
}

function closeImageViewerModalUI() {
    if (!imageViewerModal) return;
    imageViewerModal.classList.remove('show');
    if (activeHighlightPreviewCard && activeHighlightPreviewCard.classList) {
        activeHighlightPreviewCard.classList.remove('preview-opening');
    }
    activeHighlightPreviewCard = null;
}

function normalizeCellImagePaths() {
    const imgs = document.querySelectorAll('.rank-bar:nth-child(2) img');
    imgs.forEach((img) => {
        if (!img) return;
        const raw = img.getAttribute('src') || '';
        const match = raw.match(/cellimage_[0-9]+_[0-9]+\.jpg/i) || raw.match(/cellImage_[0-9]+_[0-9]+\.jpg/i);
        if (!match) return;
        const properCaseName = match[0].replace(/^cellimage_/i, 'cellImage_');
        const lowerCaseName = properCaseName.replace(/^cellImage_/, 'cellimage_');
        const candidates = [
            `/icons/${properCaseName}`,
            `${getBenchmarkBasePath()}/icons/${properCaseName}`,
            `/icons/${lowerCaseName}`,
            `${getBenchmarkBasePath()}/icons/${lowerCaseName}`
        ];
        let candidateIndex = 0;
        const applyCandidate = (index) => {
            if (index >= candidates.length) return;
            candidateIndex = index;
            const nextSrc = candidates[index];
            if (img.getAttribute('src') !== nextSrc) {
                img.setAttribute('src', nextSrc);
            }
        };
        applyCandidate(0);
        if (img.dataset.cellFallbackBound === '1') return;
        img.dataset.cellFallbackBound = '1';
        img.addEventListener('error', () => {
            applyCandidate(candidateIndex + 1);
        });
        if (img.complete && img.naturalWidth === 0) {
            applyCandidate(candidateIndex + 1);
        }
    });
}

normalizeCellImagePaths();
bindCaveImageViewer();

function renderHighlights() {
    if (!highlightsGrid) return;
    if (addHighlightBtn) addHighlightBtn.disabled = isViewMode;
    highlightsGrid.innerHTML = '';

    if (!Array.isArray(userHighlights) || userHighlights.length === 0) {
        highlightsGrid.classList.add('empty');
        const empty = document.createElement('div');
        empty.className = 'highlights-empty-state';
        empty.textContent = t('highlights_empty');
        highlightsGrid.appendChild(empty);
        return;
    }

    highlightsGrid.classList.remove('empty');
    userHighlights.forEach((item, index) => {
        if (!item || !item.image) return;
        const card = document.createElement('div');
        card.className = 'highlight-item';

        const imageWrap = document.createElement('div');
        imageWrap.className = 'highlight-img-container';
        imageWrap.innerHTML = `<img class="highlight-img" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title || 'Highlight')}">`;
        let touchHoldTimer = null;
        let suppressClickUntil = 0;
        const HOLD_MS = 420;
        const clearTouchHoldTimer = () => {
            if (!touchHoldTimer) return;
            clearTimeout(touchHoldTimer);
            touchHoldTimer = null;
        };
        imageWrap.addEventListener('touchstart', () => {
            clearTouchHoldTimer();
            touchHoldTimer = setTimeout(() => {
                // Prevent the synthetic click after a long-press from opening the viewer.
                suppressClickUntil = Date.now() + 900;
            }, HOLD_MS);
        }, { passive: true });
        imageWrap.addEventListener('touchmove', clearTouchHoldTimer, { passive: true });
        imageWrap.addEventListener('touchend', clearTouchHoldTimer, { passive: true });
        imageWrap.addEventListener('touchcancel', clearTouchHoldTimer, { passive: true });
        imageWrap.addEventListener('click', (e) => {
            if (Date.now() < suppressClickUntil) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            if (activeHighlightPreviewCard && activeHighlightPreviewCard !== card && activeHighlightPreviewCard.classList) {
                activeHighlightPreviewCard.classList.remove('preview-opening');
            }
            card.classList.add('preview-opening');
            activeHighlightPreviewCard = card;
            openImageViewer(item.image, item.title || '');
        });
        card.appendChild(imageWrap);

        if (!isViewMode) {
            const editBtn = document.createElement('button');
            editBtn.className = 'highlight-edit-btn';
            editBtn.type = 'button';
            editBtn.innerHTML = '&#9998;';
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const style = window.getComputedStyle(editBtn);
                if (style.visibility === 'hidden' || Number.parseFloat(style.opacity || '0') < 0.5 || style.pointerEvents === 'none') return;
                openHighlightModal(index);
            });
            card.appendChild(editBtn);

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'highlight-delete-btn';
            deleteBtn.type = 'button';
            deleteBtn.innerHTML = '&times;';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const style = window.getComputedStyle(deleteBtn);
                if (style.visibility === 'hidden' || Number.parseFloat(style.opacity || '0') < 0.5 || style.pointerEvents === 'none') return;
                showConfirmModal(
                    t('highlight_delete_title'),
                    t('highlight_delete_confirm'),
                    async () => {
                        userHighlights.splice(index, 1);
                        renderHighlights();
                        try {
                            await persistHighlights();
                        } catch (err) {
                            console.error('Error deleting highlight:', err);
                        }
                    }
                );
            });
            card.appendChild(deleteBtn);
        }

        const info = document.createElement('div');
        info.className = 'highlight-info';
        const title = document.createElement('div');
        title.className = 'highlight-title';
        title.textContent = item.title || '';
        info.appendChild(title);
        if (item.description) {
            const desc = document.createElement('div');
            desc.className = 'highlight-desc';
            desc.textContent = item.description;
            info.appendChild(desc);
        }
        card.appendChild(info);
        highlightsGrid.appendChild(card);
    });
}

if (addHighlightBtn) {
    addHighlightBtn.addEventListener('click', () => {
        if (isViewMode) return;
        if (!auth.currentUser) {
            window.location.href = getBenchmarkLoginUrl();
            return;
        }
        if ((userHighlights || []).length >= 6) {
            alert(t('highlight_limit_reached'));
            return;
        }
        openHighlightModal(-1);
    });
}

if (highlightUploadArea && highlightFileInput) {
    highlightUploadArea.addEventListener('click', () => {
        if (isViewMode) return;
        highlightFileInput.click();
    });

    highlightFileInput.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        try {
            const dataUrl = await compressImageFileToDataUrl(file, 1280, 0.82);
            highlightDraftImage = dataUrl || '';
            if (highlightPreviewImg && highlightDraftImage) {
                highlightPreviewImg.src = highlightDraftImage;
                highlightPreviewImg.style.display = 'block';
            }
            if (highlightUploadText) highlightUploadText.style.display = highlightDraftImage ? 'none' : 'inline';
            if (highlightErrorMessage) {
                highlightErrorMessage.textContent = '';
                highlightErrorMessage.style.display = 'none';
            }
        } catch (err) {
            console.error('Error preparing highlight image:', err);
            showHighlightError(t('highlight_upload_required_error'));
        }
    });
}

if (closeHighlightModalBtn) {
    closeHighlightModalBtn.addEventListener('click', closeHighlightModalUI);
}
if (cancelHighlightBtn) {
    cancelHighlightBtn.addEventListener('click', closeHighlightModalUI);
}
if (highlightModal) {
    bindModalOverlayQuickClose(highlightModal, closeHighlightModalUI);
}

if (saveHighlightBtn) {
    saveHighlightBtn.addEventListener('click', async () => {
        if (isViewMode) return;
        const title = (highlightTitleInput ? highlightTitleInput.value : '').trim();
        const description = (highlightDescInput ? highlightDescInput.value : '').trim();
        const image = highlightDraftImage || '';

        if (!title) {
            showHighlightError(t('highlight_title_required_error'));
            return;
        }
        if (!image) {
            showHighlightError(t('highlight_upload_required_error'));
            return;
        }

        const payload = {
            title,
            description,
            image,
            updatedAt: Date.now()
        };

        if (editingHighlightIndex >= 0 && userHighlights[editingHighlightIndex]) {
            const existing = userHighlights[editingHighlightIndex];
            userHighlights[editingHighlightIndex] = {
                ...existing,
                ...payload
            };
        } else {
            userHighlights.push({
                ...payload,
                createdAt: Date.now()
            });
        }

        renderHighlights();
        closeHighlightModalUI();
        try {
            await persistHighlights();
        } catch (err) {
            console.error('Error saving highlight:', err);
            showHighlightError(t('highlight_save_failed'));
        }
    });
}

if (closeImageViewerModalBtn) {
    closeImageViewerModalBtn.addEventListener('click', closeImageViewerModalUI);
}
if (imageViewerImg) {
    imageViewerImg.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeImageViewerModalUI();
    });
}
if (imageViewerModal) {
    bindModalOverlayQuickClose(imageViewerModal, closeImageViewerModalUI);
}

window.addEventListener('resize', syncUserMenuDropdownWidth);

function updateMainHeaderLayout() {
    const pic = localStorage.getItem('benchmark_profile_pic');
    const flag = localStorage.getItem('benchmark_country_flag');
    
    const circle = document.querySelector('.profile-circle');
    const flagEl = document.querySelector('.nationality-flag');
    const userMenuBoxIcon = document.querySelector('#userMenuBox div:first-child');
    const userMenuBox = document.getElementById('userMenuBox');

    if (!circle || !flagEl) return;

    // Reset classes
    circle.className = 'profile-circle';
    circle.style.backgroundImage = '';
    circle.style.display = 'block';
    flagEl.style.display = 'flex';

    if (pic) {
        // Has Picture
        circle.style.backgroundImage = `url(${pic})`;
        circle.style.backgroundSize = 'cover';
        circle.style.backgroundColor = 'transparent';
        if (userMenuBoxIcon) {
            userMenuBoxIcon.style.display = 'block';
            userMenuBoxIcon.style.backgroundImage = `url(${pic})`;
            userMenuBoxIcon.style.backgroundSize = 'cover';
            userMenuBoxIcon.style.backgroundColor = 'transparent';
        }
        if (userMenuBox) userMenuBox.style.paddingLeft = '5px';
    } else {
        // No Picture
        circle.style.backgroundColor = 'transparent';
        circle.style.border = 'none';
        if (userMenuBoxIcon) {
            userMenuBoxIcon.style.display = 'none';
            userMenuBoxIcon.style.backgroundImage = '';
            userMenuBoxIcon.style.backgroundColor = '#0a0a0a';
        }
        if (userMenuBox) userMenuBox.style.paddingLeft = '15px';
        
        if (flag) {
            // No Picture, Has Flag -> Flag centered left of name
            circle.classList.add('no-pic-has-flag');
        } else {
            // No Picture, No Flag -> Hide circle area entirely
            circle.style.display = 'none';
        }
    }

    if (flag) {
        flagEl.textContent = '';
        flagEl.style.backgroundImage = `url(${getFlagUrl(flag)})`;
    } else {
        flagEl.style.display = 'none';
    }
    syncUserMenuDropdownWidth();
}

function syncUserMenuDropdownWidth() {
    const box = document.getElementById('userMenuBox');
    if (!box) return;
    const menu = box.querySelector('.dropdown-menu');
    if (!menu) return;
    const boxWidth = Math.ceil(box.getBoundingClientRect().width || box.offsetWidth || 0);
    const target = Math.max(1, boxWidth);
    menu.style.width = `${target}px`;
    menu.style.minWidth = `${target}px`;
    menu.style.maxWidth = `${target}px`;
}

function generateAccountId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 12; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function updateAccountIdUI(accountId) {
    const input = document.getElementById('accountIdDisplay');
    const toggleBtn = document.getElementById('toggleAccountIdView');
    if (input) {
        input.dataset.realValue = accountId;
        if (toggleBtn && toggleBtn.textContent === t('hide')) {
            input.value = accountId;
        } else {
            input.value = '**************';
        }
    }
}

function initAccountId() {
    let accountId = getRuntimeAccountId();
    if (!accountId) {
        accountId = generateAccountId();
        setRuntimeAccountId(accountId);
    }
    updateAccountIdUI(accountId);
}
initAccountId();

function updateFriendPageAccountId(accountId) {
    if (friendPageAccountIdDisplay) {
        friendPageAccountIdDisplay.dataset.realValue = accountId;
        friendPageAccountIdDisplay.value = '**************';
        const toggleBtn = document.getElementById('friendPageToggleAccountIdView');
        if (toggleBtn) toggleBtn.textContent = t('show');
    }
}

const friendPageToggleAccountIdView = document.getElementById('friendPageToggleAccountIdView');
if (friendPageToggleAccountIdView && friendPageAccountIdDisplay) {
    friendPageToggleAccountIdView.addEventListener('click', () => {
        const realId = friendPageAccountIdDisplay.dataset.realValue || '';
        const maskedId = '**************';
        if (friendPageAccountIdDisplay.value === maskedId) {
            friendPageAccountIdDisplay.value = realId;
            friendPageToggleAccountIdView.textContent = t('hide');
        } else {
            friendPageAccountIdDisplay.value = maskedId;
            friendPageToggleAccountIdView.textContent = t('show');
        }
    });
}

const friendPageCopyAccountIdBtn = document.getElementById('friendPageCopyAccountIdBtn');
if (friendPageCopyAccountIdBtn) {
    friendPageCopyAccountIdBtn.addEventListener('click', async () => {
        const accountId = friendPageAccountIdDisplay ? friendPageAccountIdDisplay.dataset.realValue : '';
        if (!accountId) return;

        let success = false;
        try {
            await navigator.clipboard.writeText(accountId);
            success = true;
        } catch (err) {
            const textArea = document.createElement("textarea");
            textArea.value = accountId;
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            success = document.execCommand('copy');
            document.body.removeChild(textArea);
        }

        if (success) {
            const originalHTML = friendPageCopyAccountIdBtn.innerHTML;
            friendPageCopyAccountIdBtn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="#4caf50"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
            setTimeout(() => {
                friendPageCopyAccountIdBtn.innerHTML = originalHTML;
            }, 1500);
        }
    });
}

const copyAccountIdBtn = document.getElementById('copyAccountIdBtn');
if (copyAccountIdBtn) {
    copyAccountIdBtn.addEventListener('click', async () => {
        const input = document.getElementById('accountIdDisplay');
        const accountId = input ? input.dataset.realValue : '';
        if (!accountId) return;

        let success = false;
        try {
            await navigator.clipboard.writeText(accountId);
            success = true;
        } catch (err) {
            const textArea = document.createElement("textarea");
            textArea.value = accountId;
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            success = document.execCommand('copy');
            document.body.removeChild(textArea);
        }

        if (success) {
            const originalHTML = copyAccountIdBtn.innerHTML;
            copyAccountIdBtn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="#4caf50"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
            setTimeout(() => {
                copyAccountIdBtn.innerHTML = originalHTML;
            }, 1500);
        }
    });
}

// Profile Modal Logic
const profileModal = document.getElementById('profileModal');
const closeProfileModal = document.getElementById('closeProfileModal');
const userProfileBtn = document.getElementById('userProfileBtn');
const accountPasswordDisplay = document.getElementById('accountPasswordDisplay');
const toggleEmailView = document.getElementById('toggleEmailView');
const accountEmailDisplay = document.getElementById('accountEmailDisplay');
const toggleAccountIdView = document.getElementById('toggleAccountIdView');
const accountIdDisplay = document.getElementById('accountIdDisplay');

function resetProfileSensitiveVisibility() {
    if (accountIdDisplay) accountIdDisplay.value = '**************';
    if (toggleAccountIdView) toggleAccountIdView.textContent = t('show');

    if (accountEmailDisplay) {
        const parts = (currentUserEmail || '').split('@');
        accountEmailDisplay.value = `**************@${parts[1] || 'gmail.com'}`;
    }
    if (toggleEmailView) toggleEmailView.textContent = t('show');
}

function closeProfileModalUI() {
    if (profileModal) profileModal.classList.remove('show');
    resetProfileSensitiveVisibility();
}

if (userProfileBtn) {
    userProfileBtn.addEventListener('click', () => {
        if (isViewMode) return;
        resetProfileSensitiveVisibility();
        initProfileModalState();
    });
}

if (closeProfileModal) {
    closeProfileModal.addEventListener('click', closeProfileModalUI);
}

bindModalOverlayQuickClose(profileModal, closeProfileModalUI);


let currentUserEmail = 'Player@gmail.com';

if (toggleEmailView && accountEmailDisplay) {
    const getMaskedEmail = (email) => {
        const parts = email.split('@');
        return `**************@${parts[1] || 'gmail.com'}`;
    };
    
    toggleEmailView.addEventListener('click', () => {
        const maskedEmail = getMaskedEmail(currentUserEmail);
        if (accountEmailDisplay.value === maskedEmail) {
            accountEmailDisplay.value = currentUserEmail;
            toggleEmailView.textContent = t('hide');
        } else {
            accountEmailDisplay.value = maskedEmail;
            toggleEmailView.textContent = t('show');
        }
    });
}

if (toggleAccountIdView && accountIdDisplay) {
    toggleAccountIdView.addEventListener('click', () => {
        const realId = accountIdDisplay.dataset.realValue || '';
        const maskedId = '**************';
        
        if (accountIdDisplay.value === maskedId) {
            accountIdDisplay.value = realId;
            toggleAccountIdView.textContent = t('hide');
        } else {
            accountIdDisplay.value = maskedId;
            toggleAccountIdView.textContent = t('show');
        }
    });
}

function reauthAndAction(user, actionCallback) {
    showReauthModal(actionCallback);
}

const reauthModal = document.getElementById('reauthModal');
const closeReauthModalBtn = document.getElementById('closeReauthModal');
const reauthPasswordInput = document.getElementById('reauthPasswordInput');
const reauthMessage = document.getElementById('reauthMessage');
const confirmReauthBtn = document.getElementById('confirmReauthBtn');
const cancelReauthBtn = document.getElementById('cancelReauthBtn');
const emailReloginModal = document.getElementById('emailReloginModal');
const emailReloginMessage = document.getElementById('emailReloginMessage');
const emailReloginBtn = document.getElementById('emailReloginBtn');
let reauthActionCallback = null;

function showReauthModal(actionCallback) {
    if (!reauthModal) return;
    reauthActionCallback = actionCallback;
    reauthPasswordInput.value = '';
    reauthMessage.style.display = 'none';
    reauthModal.classList.add('show');
    reauthPasswordInput.focus();
}

function closeReauthModalFunc() {
    if (!reauthModal) return;
    reauthModal.classList.remove('show');
    reauthActionCallback = null;
}

function showEmailReloginModal(targetEmail) {
    if (!emailReloginModal || !emailReloginMessage) return;
    emailReloginMessage.textContent = tf('profile_email_verification_sent', { email: targetEmail });
    emailReloginModal.classList.add('show');
}

if (emailReloginBtn) {
    emailReloginBtn.addEventListener('click', async () => {
        emailReloginBtn.disabled = true;
        try {
            await signOut(auth);
        } catch (err) {
            console.error('Error signing out after email update:', err);
        } finally {
            window.location.href = getBenchmarkLoginUrl();
        }
    });
}

if (closeReauthModalBtn) closeReauthModalBtn.addEventListener('click', closeReauthModalFunc);
if (cancelReauthBtn) cancelReauthBtn.addEventListener('click', closeReauthModalFunc);
bindModalOverlayQuickClose(reauthModal, closeReauthModalFunc);

if (confirmReauthBtn && reauthPasswordInput) {
    const handleReauth = () => {
        const user = auth.currentUser;
        const password = reauthPasswordInput.value;
        if (!user || !password) {
            reauthMessage.textContent = t('reauth_password_required');
            reauthMessage.style.color = '#ff6666';
            reauthMessage.style.display = 'block';
            return;
        }

        reauthMessage.style.display = 'none';
        confirmReauthBtn.disabled = true;
        confirmReauthBtn.textContent = t('reauth_verifying');

        const credential = EmailAuthProvider.credential(user.email, password);
        reauthenticateWithCredential(user, credential).then(() => {
            const pendingAction = reauthActionCallback;
            closeReauthModalFunc();
            if (pendingAction) {
                Promise.resolve(pendingAction()).catch((error) => {
                    alert(t('profile_delete_error_prefix') + (error && error.message ? error.message : String(error)));
                });
            }
        }).catch(err => {
            reauthMessage.textContent = t('reauth_failed_prefix') + err.message;
            reauthMessage.style.color = '#ff6666';
            reauthMessage.style.display = 'block';
        }).finally(() => {
            confirmReauthBtn.disabled = false;
            confirmReauthBtn.textContent = t('reauth_confirm');
        });
    };

    confirmReauthBtn.addEventListener('click', handleReauth);
    reauthPasswordInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleReauth();
    });
}
const changeEmailBtn = document.getElementById('changeEmailBtn');
const emailChangeContainer = document.getElementById('emailChangeContainer');
const newEmailInput = document.getElementById('newEmailInput');
const confirmEmailChangeBtn = document.getElementById('confirmEmailChangeBtn');
const cancelEmailChangeBtn = document.getElementById('cancelEmailChangeBtn');
const emailChangeMessage = document.getElementById('emailChangeMessage');

if (changeEmailBtn && emailChangeContainer) {
    changeEmailBtn.addEventListener('click', () => {
        changeEmailBtn.style.display = 'none';
        emailChangeContainer.style.display = 'block';
        if (emailChangeMessage) {
            emailChangeMessage.style.display = 'none';
            emailChangeMessage.textContent = '';
            emailChangeMessage.style.color = '#ccc';
        }
        if (newEmailInput) newEmailInput.focus();
    });
}

if (cancelEmailChangeBtn) {
    cancelEmailChangeBtn.addEventListener('click', () => {
        if (emailChangeContainer) emailChangeContainer.style.display = 'none';
        if (changeEmailBtn) changeEmailBtn.style.display = 'block';
        if (newEmailInput) newEmailInput.value = '';
        if (emailChangeMessage) emailChangeMessage.style.display = 'none';
    });
}

if (confirmEmailChangeBtn) {
    confirmEmailChangeBtn.addEventListener('click', () => {
        const user = auth.currentUser;
        if (!user) return;
        
        const newEmail = newEmailInput.value.trim();
        if (!newEmail) {
            if (emailChangeMessage) {
                emailChangeMessage.textContent = t('profile_email_valid_error');
                emailChangeMessage.style.color = '#ff6666';
                emailChangeMessage.style.display = 'block';
            }
            return;
        }
        if (newEmail === user.email) {
             if (emailChangeMessage) {
                emailChangeMessage.textContent = t('profile_email_different_error');
                emailChangeMessage.style.color = '#ff6666';
                emailChangeMessage.style.display = 'block';
            }
            return;
        }

        if (emailChangeMessage) {
            emailChangeMessage.textContent = t('profile_email_sending_verification');
            emailChangeMessage.style.color = '#ccc';
            emailChangeMessage.style.display = 'block';
        }

        const action = () => {
            verifyBeforeUpdateEmail(user, newEmail).then(() => {
                if (emailChangeMessage) {
                    emailChangeMessage.textContent = tf('profile_email_verification_sent', { email: newEmail });
                    emailChangeMessage.style.color = '#4caf50';
                    emailChangeMessage.style.display = 'block';
                }
                if (emailChangeContainer) emailChangeContainer.style.display = 'none';
                if (changeEmailBtn) changeEmailBtn.style.display = 'block';
                if (newEmailInput) newEmailInput.value = '';
                showEmailReloginModal(newEmail);
            }).catch((error) => {
                if (error.code === 'auth/requires-recent-login') {
                    reauthAndAction(user, action);
                } else {
                    if (emailChangeMessage) {
                        emailChangeMessage.textContent = error.message;
                        emailChangeMessage.style.color = '#ff6666';
                        emailChangeMessage.style.display = 'block';
                    }
                }
            });
        };
        
        action();
    });
}

const changePasswordBtn = document.getElementById('changePasswordBtn');
const passwordChangeMessage = document.getElementById('passwordChangeMessage');
if (changePasswordBtn) {
    changePasswordBtn.addEventListener('click', () => {
        const user = auth.currentUser;
        if (!user) {
            if (passwordChangeMessage) {
                passwordChangeMessage.textContent = t('profile_not_logged_in');
                passwordChangeMessage.style.color = '#ff6666';
                passwordChangeMessage.style.display = 'block';
            }
            return;
        }

        if (passwordChangeMessage) {
            passwordChangeMessage.textContent = t('profile_password_sending_reset');
            passwordChangeMessage.style.color = '#ccc';
            passwordChangeMessage.style.display = 'block';
        }
        changePasswordBtn.disabled = true;
        changePasswordBtn.textContent = t('profile_change_password_sending');

        sendPasswordResetEmail(auth, user.email).then(() => {
            if (passwordChangeMessage) {
                passwordChangeMessage.textContent = t('profile_password_reset_sent');
                passwordChangeMessage.style.color = '#4caf50';
            }
        }).catch((error) => {
            if (passwordChangeMessage) {
                if (error.code === 'auth/user-not-found') {
                    passwordChangeMessage.textContent = t('profile_email_not_exist');
                } else {
                    passwordChangeMessage.textContent = error.message;
                }
                passwordChangeMessage.style.color = '#ff6666';
            }
        }).finally(() => {
            changePasswordBtn.disabled = false;
            changePasswordBtn.textContent = t('change_password');
        });
    });
}

const deleteAccountBtn = document.getElementById('deleteAccountBtn');
if (deleteAccountBtn) {
    deleteAccountBtn.addEventListener('click', () => {
        showConfirmModal(t('profile_delete_confirm_title'), t('profile_delete_confirm_message'), async () => {
            const user = auth.currentUser;
            if (user) {
                const performDelete = async () => {
                    // Delete Firestore data FIRST
                    await deleteDoc(doc(db, 'users', user.uid));
                    // Then delete the auth account
                    await deleteUser(user);
                    // Clear local storage
                    localStorage.clear();
                    // Redirect to login
                    window.location.href = getBenchmarkLoginUrl();
                };

                try {
                    await performDelete();
                } catch (error) {
                    if (error.code === 'auth/requires-recent-login') {
                        reauthAndAction(user, performDelete);
                    } else {
                        alert(t('profile_delete_error_prefix') + error.message);
                    }
                }
            } else {
                localStorage.clear();
                window.location.href = getBenchmarkLoginUrl();
            }
        });
    });
}

const signOutBtn = document.getElementById('signOutBtn');
if (signOutBtn) {
    signOutBtn.addEventListener('click', async () => {
        if (saveScoresDebounceTimer) {
            clearTimeout(saveScoresDebounceTimer);
            saveScoresDebounceTimer = null;
        }
        await saveSavedScores();

        signOut(auth).then(() => {
            const keysToRemove = [
                'benchmark_account_id',
                'benchmark_saved_scores',
                'benchmark_saved_cave_links',
                'benchmark_language',
                'benchmark_theme',
                'benchmark_theme_user_selected',
                'benchmark_custom_theme_enabled',
                'benchmark_custom_theme_name',
                'benchmark_custom_theme_hex',
                'benchmark_saved_custom_themes',
                'benchmark_rank_theme_unlock_level',
                'benchmark_saved_config_themes',
                'benchmark_auto_rank_theme',
                'benchmark_default_config',
                'benchmark_visibility_setting',
                'benchmark_radar_mode',
                'benchmark_profile_pic',
                'benchmark_country_flag',
                'benchmark_profile_pic_original',
                'benchmark_profile_pic_state',
                'benchmark_guilds',
                'benchmark_seasonal_trophies',
                'benchmark_profile_views',
                'benchmark_last_view_time',
                'benchmark_last_view_ip',
                'benchmark_pacman_mode'
            ];
            keysToRemove.forEach(key => localStorage.removeItem(key));
            window.location.href = getBenchmarkLoginUrl();
        }).catch((error) => {
            console.error('Sign out error:', error);
        });
    });
}

// Profile Picture Logic
const uploadProfilePicBtn = document.getElementById('uploadProfilePicBtn');
const profilePicInput = document.getElementById('profilePicInput');
const cropperContainer = document.getElementById('cropperContainer');
const cropperImage = document.getElementById('cropperImage');
const cropperArea = document.getElementById('cropperArea');
const cropperZoom = document.getElementById('cropperZoom');
const profilePreviewCircle = document.getElementById('profilePreviewCircle');
const profilePreviewBox = document.getElementById('profilePreviewBox');
const onboardingProfilePreviewCircle = document.getElementById('onboardingProfilePreviewCircle');
const saveProfileBtn = document.getElementById('saveProfileBtn');
const discardProfileBtn = document.getElementById('discardProfileBtn');
const editProfilePicBtn = document.getElementById('editProfilePicBtn');
const centerImageBtn = document.getElementById('centerImageBtn');
const saveImageBtn = document.getElementById('saveImageBtn');
const cancelImageBtn = document.getElementById('cancelImageBtn');
const removeProfilePicBtn = document.getElementById('removeProfilePicBtn');
const removeFlagBtn = document.getElementById('removeFlagBtn');

let currentProfileImage = null;
let cropperState = { x: 0, y: 0, scale: 1 };
let isDragging = false;
let startX, startY;

if (uploadProfilePicBtn && profilePicInput) {
    uploadProfilePicBtn.addEventListener('click', () => profilePicInput.click());
    
    profilePicInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (evt) => {
                cropperImage.onload = () => {
                    cropperContainer.style.display = 'block';
                    cropperState = { x: 0, y: 0, scale: 1 };
                    cropperZoom.value = 1;
                    updateCropperTransform();
                    if (editProfilePicBtn) editProfilePicBtn.style.display = 'block';
                };
                cropperImage.src = evt.target.result;
                cropperImage.dataset.originalSrc = evt.target.result;
            };
            reader.readAsDataURL(file);
        }
    });
}

if (cropperArea) {
    cropperArea.addEventListener('mousedown', (e) => {
        if (!cropperImage || !cropperImage.getAttribute('src')) return;
        isDragging = true;
        startX = e.clientX - cropperState.x;
        startY = e.clientY - cropperState.y;
        e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        cropperState.x = e.clientX - startX;
        cropperState.y = e.clientY - startY;
        updateCropperTransform();
    });

    window.addEventListener('mouseup', () => isDragging = false);

    cropperArea.addEventListener('touchstart', (e) => {
        if (!cropperImage || !cropperImage.getAttribute('src')) return;
        const touch = e.touches && e.touches[0];
        if (!touch) return;
        isDragging = true;
        startX = touch.clientX - cropperState.x;
        startY = touch.clientY - cropperState.y;
    }, { passive: false });

    cropperArea.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        const touch = e.touches && e.touches[0];
        if (!touch) return;
        if (e.cancelable) e.preventDefault();
        cropperState.x = touch.clientX - startX;
        cropperState.y = touch.clientY - startY;
        updateCropperTransform();
    }, { passive: false });

    window.addEventListener('touchend', () => { isDragging = false; }, { passive: true });
    window.addEventListener('touchcancel', () => { isDragging = false; }, { passive: true });

    cropperArea.addEventListener('wheel', (e) => {
        if (!cropperImage || !cropperImage.getAttribute('src')) return;
        e.preventDefault();
        
        const zoomFactor = 0.15;
        let newScale = cropperState.scale;
        
        if (e.deltaY < 0) newScale *= (1 + zoomFactor);
        else newScale /= (1 + zoomFactor);

        newScale = Math.max(parseFloat(cropperZoom.min), Math.min(parseFloat(cropperZoom.max), newScale));
        
        if (cropperState.scale > 0) {
            const ratio = newScale / cropperState.scale;
            cropperState.x *= ratio;
            cropperState.y *= ratio;
        }
        cropperState.scale = newScale;
        cropperZoom.value = newScale;
        updateCropperTransform();
    }, { passive: false });
}

if (cropperZoom) {
    cropperZoom.addEventListener('input', (e) => {
        const newScale = parseFloat(e.target.value);
        if (cropperState.scale > 0) {
            const ratio = newScale / cropperState.scale;
            cropperState.x *= ratio;
            cropperState.y *= ratio;
        }
        cropperState.scale = newScale;
        updateCropperTransform();
    });
}

if (editProfilePicBtn) {
    editProfilePicBtn.addEventListener('click', () => {
        let srcToLoad = cropperImage.getAttribute('src');
        
        if (!srcToLoad) {
            const storedOriginal = localStorage.getItem('benchmark_profile_pic_original');
            if (storedOriginal) {
                srcToLoad = storedOriginal;
            } else if (draftProfileState && draftProfileState.pic) {
                srcToLoad = draftProfileState.pic;
            }
        }

        if (srcToLoad) {
            cropperImage.onload = () => {
                cropperContainer.style.display = 'block';
                if (draftProfileState && draftProfileState.cropState && draftProfileState.cropState.scale) {
                    cropperState = { ...draftProfileState.cropState };
                } else {
                    cropperState = { x: 0, y: 0, scale: 1 };
                }
                // Ensure slider matches state
                cropperZoom.value = cropperState.scale;
                updateCropperTransform();
                editProfilePicBtn.style.display = 'block';
                cropperImage.onload = null;
            };
            cropperImage.src = srcToLoad;
            cropperImage.dataset.originalSrc = srcToLoad;
        }
    });
}

if (removeProfilePicBtn) {
    removeProfilePicBtn.addEventListener('click', () => {
        draftProfileState.pic = null;
        draftProfileState.originalPic = null;
        draftProfileState.cropState = null;
        updateProfilePicPreview(null);
        updateProfileButtons();
    });
}

if (removeFlagBtn) {
    removeFlagBtn.addEventListener('click', () => {
        handleFlagSelection(null);
    });
}

function updateCropperTransform() {
    if (!cropperImage) return;
    cropperImage.style.transform = `translate(${cropperState.x}px, ${cropperState.y}px) scale(${cropperState.scale})`;
}

async function loadUserProfile(user) {
    try {
        const docSnap = await getDoc(doc(db, 'users', user.uid));
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.isNewUser) {
                initOnboarding();
            }
            
            if (!data.username && user.displayName) {
                await setDoc(doc(db, 'users', user.uid), { 
                    username: user.displayName
                }, { merge: true });
            }
            
            let username = data.username || user.displayName;
            if (username) {
                const usernameInput = document.getElementById('profileUsernameInput');
                if (usernameInput) usernameInput.value = username;
                document.querySelector('.profile-name').textContent = username;
                const userMenuName = document.getElementById('userMenuUsername');
                if (userMenuName) userMenuName.textContent = username;
                syncUserMenuDropdownWidth();
            }
            
            if (data.profile) {
                if (data.profile.guilds) localStorage.setItem('benchmark_guilds', JSON.stringify(data.profile.guilds));
                if (data.profile.flag) localStorage.setItem('benchmark_country_flag', data.profile.flag);
                else localStorage.removeItem('benchmark_country_flag');
                
                if (data.profile.pic) localStorage.setItem('benchmark_profile_pic', data.profile.pic);
                else localStorage.removeItem('benchmark_profile_pic');

                if (data.profile.originalPic) localStorage.setItem('benchmark_profile_pic_original', data.profile.originalPic);
                else localStorage.removeItem('benchmark_profile_pic_original');

                if (data.profile.cropState) localStorage.setItem('benchmark_profile_pic_state', JSON.stringify(data.profile.cropState));
                else localStorage.removeItem('benchmark_profile_pic_state');
                
                updateMainPageGuildDisplay();
                updateMainHeaderLayout();

                const viewCountEl = document.getElementById('viewCount');
                if (viewCountEl) {
                    const views = data.profile.views || 0;
                    viewCountEl.textContent = views.toLocaleString();
                    localStorage.setItem('benchmark_cached_views', views);
                }

                if (data.profile.trophies) {
                    localStorage.setItem('benchmark_seasonal_trophies', JSON.stringify(data.profile.trophies));
                } else {
                    localStorage.removeItem('benchmark_seasonal_trophies');
                }
                renderTrophies();

                if (data.achievements) {
                    userAchievements = data.achievements;
                    localStorage.setItem('benchmark_achievements', JSON.stringify(userAchievements));
                } else {
                    userAchievements = {};
                    localStorage.removeItem('benchmark_achievements');
                }
                updateAchievementsProgress();
            }

            if (data.highlights) {
                userHighlights = data.highlights;
                renderHighlights();
            } else {
                userHighlights = [];
                renderHighlights();
            }
            
            if (data.accountId) {
                setRuntimeAccountId(data.accountId);
                updateAccountIdUI(data.accountId);
                updateFriendPageAccountId(data.accountId);
            } else {
                const newId = generateAccountId();
                await saveUserData({ accountId: newId });
                setRuntimeAccountId(newId);
                updateAccountIdUI(newId);
                updateFriendPageAccountId(newId);
            }
            {
                const effectiveAccountId = data.accountId || getRuntimeAccountId();
                const effectiveUsername = data.username || user.displayName || '';
                if (effectiveUsername && effectiveAccountId) {
                    const desiredSlug = buildProfileSlug(effectiveUsername, effectiveAccountId, user.uid);
                    if (data.publicSlug !== desiredSlug) {
                        await saveUserData({ publicSlug: desiredSlug });
                    }
                }
            }

            if (data.settings) {
                if (data.settings.language) {
                    localStorage.setItem('benchmark_language', data.settings.language);
                    applyLanguage(data.settings.language, false);
                }
                if (data.settings.theme) {
                    localStorage.setItem('benchmark_theme', data.settings.theme);
                    if (data.settings.theme !== 'default') localStorage.setItem('benchmark_theme_user_selected', 'true');
                    await applyTheme(data.settings.theme, false);
                }
                if (data.settings.autoRankTheme) {
                    localStorage.setItem(AUTO_RANK_THEME_STORAGE_KEY, data.settings.autoRankTheme);
                    loadAutoRankThemeSetting();
                    syncAutoRankThemeUI();
                }
                if (data.settings.visibility) {
                    localStorage.setItem(VISIBILITY_STORAGE_KEY, data.settings.visibility);
                    if (visibilitySelect) visibilitySelect.value = data.settings.visibility;
                }
                if (data.settings.defaultConfig) {
                    localStorage.setItem('benchmark_default_config', JSON.stringify(data.settings.defaultConfig));
                    applyConfig(data.settings.defaultConfig);
                    syncSettingsUI();
                }
                if (data.settings.rankThemeUnlock) {
                    localStorage.setItem(THEME_UNLOCK_STORAGE_KEY, data.settings.rankThemeUnlock);
                    loadRankThemeUnlock();
                    updateThemeButtons();
                }
                
                if (data.settings.customTheme) {
                    const ct = data.settings.customTheme;
                    if (ct.enabled) localStorage.setItem('benchmark_custom_theme_enabled', ct.enabled);
                    if (ct.name) localStorage.setItem('benchmark_custom_theme_name', ct.name);
                    if (ct.hex) localStorage.setItem('benchmark_custom_theme_hex', JSON.stringify(ct.hex));
                    if (ct.saved) localStorage.setItem('benchmark_saved_custom_themes', JSON.stringify(ct.saved));
                    
                    loadCustomThemeState();
                    loadSavedCustomThemes();
                    loadCustomThemeHex();
                    updateCustomSwatches();
                    updateCustomThemeUI();
                    if (currentTheme === 'custom') await applyTheme('custom', false);
                }
                if (data.settings.pacmanMode) {
                    pacmanModeEnabled = data.settings.pacmanMode === 'true';
                } else {
                    pacmanModeEnabled = false;
                }
                syncPacmanUI();
            }
            if (data.scores && typeof data.scores === 'object') {
                const localScoresUpdatedAt = Number(localStorage.getItem(SCORE_UPDATED_AT_STORAGE_KEY) || 0);
                const remoteScoresUpdatedAt = Number(data.scoresUpdatedAt || 0);
                const localHasScores = savedScores && Object.keys(savedScores).length > 0;
                let useRemoteScores = false;
                if (!localHasScores) {
                    useRemoteScores = true;
                } else if (localScoresUpdatedAt > 0 && remoteScoresUpdatedAt > 0) {
                    useRemoteScores = remoteScoresUpdatedAt > localScoresUpdatedAt;
                } else if (localScoresUpdatedAt <= 0 && remoteScoresUpdatedAt <= 0) {
                    useRemoteScores = false;
                } else if (localScoresUpdatedAt > 0 && remoteScoresUpdatedAt <= 0) {
                    useRemoteScores = false;
                } else {
                    // Backward compatibility: keep existing local values when local timestamp is missing.
                    useRemoteScores = false;
                }

                if (useRemoteScores) {
                    savedScores = data.scores;
                    localStorage.setItem(SCORE_STORAGE_KEY, JSON.stringify(savedScores));
                    if (remoteScoresUpdatedAt > 0) {
                        localStorage.setItem(SCORE_UPDATED_AT_STORAGE_KEY, String(remoteScoresUpdatedAt));
                    }
                } else if (localScoresUpdatedAt > remoteScoresUpdatedAt && !isViewMode) {
                    // Local edits are newer than cloud snapshot; push cloud update in background.
                    clearTimeout(saveScoresDebounceTimer);
                    saveScoresDebounceTimer = setTimeout(() => {
                        saveSavedScores();
                    }, 50);
                }
                loadScores();
                validateRankUnlock();
            }
            if (data.configThemes) {
                savedConfigThemes = data.configThemes;
                localStorage.setItem(CONFIG_THEMES_STORAGE_KEY, JSON.stringify(savedConfigThemes));
            }

            if (data.caveLinks) {
                savedCaveLinks = data.caveLinks;
                localStorage.setItem(CAVE_LINKS_STORAGE_KEY, JSON.stringify(savedCaveLinks));
                loadCaveLinks();
            }
        }
    } catch (e) {
        console.error("Error loading user data:", e);
    }
}

onAuthStateChanged(auth, async (user) => {
    const params = new URLSearchParams(window.location.search);
    const profileId = params.get('id');
    const requestedSlug = getRequestedProfileSlugFromPath();

    // Keep shared-profile links in view-mode flow, but allow own slug route to load normally.
    if (requestedSlug) {
        if (!user) {
            hidePageLoader();
            return;
        }
        try {
            // Use exact slug lookup only here; fallback scans can misclassify and block own data loading.
            const requestedDoc = await resolveProfileDocBySlug(requestedSlug, { allowFallback: false });
            if (requestedDoc && requestedDoc.id !== user.uid) {
                hidePageLoader();
                return;
            }
        } catch (slugErr) {
            console.warn('Slug ownership check failed in auth handler:', slugErr);
        }
    }

    if (user) {
    if (profileId && profileId !== user.uid) {
        hidePageLoader();
        return;
    }
        if (!user.emailVerified) {
            const modal = document.getElementById('verificationModal');
            if (modal) {
                modal.classList.add('show');
                
                const resendBtn = document.getElementById('resendVerificationBtn');
                const reloadBtn = document.getElementById('reloadPageBtn');
                const signOutBtn = document.getElementById('verificationSignOutBtn');
                const msgDiv = document.getElementById('verificationMessage');

                if (resendBtn) {
                    resendBtn.onclick = async () => {
                        try {
                            await sendEmailVerification(user);
                            if (msgDiv) {
                                msgDiv.textContent = tf('verification_email_sent_to', { email: user.email });
                                msgDiv.style.display = 'block';
                                msgDiv.style.color = '#4caf50';
                            }
                            resendBtn.disabled = true;
                            setTimeout(() => resendBtn.disabled = false, 60000);
                        } catch (e) {
                            if (msgDiv) {
                                msgDiv.textContent = e.message;
                                msgDiv.style.display = 'block';
                                msgDiv.style.color = '#ff6666';
                            }
                        }
                    };
                }
                if (reloadBtn) reloadBtn.onclick = () => window.location.reload();
                if (signOutBtn) signOutBtn.onclick = () => signOut(auth).then(() => window.location.href = getBenchmarkLoginUrl());
            }
            hidePageLoader();
            return;
        }
        currentUserEmail = user.email;
        forceOwnSlugUrlFromAvailableData(user);
        if (accountEmailDisplay) {
            const parts = user.email.split('@');
            accountEmailDisplay.value = `**************@${parts[1] || 'gmail.com'}`;
        }

        // Real-time listener for friend requests
        onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
            const data = docSnap.data();
            currentFriendRequests = normalizeFriendRequestIds(data && data.friendRequests);
            const requestsTabActive = tabFriendRequests && tabFriendRequests.classList.contains('active');
            if (requestsTabActive) {
                writeViewedFriendRequests(user.uid, currentFriendRequests);
                hasPendingRequests = false;
            } else {
                refreshPendingRequestState(user.uid, currentFriendRequests);
            }
            updateNotificationVisibility();
        });

        await loadUserProfile(user);
        try {
            const myDocSnap = await getDoc(doc(db, 'users', user.uid));
            const myData = myDocSnap.exists() ? (myDocSnap.data() || {}) : {};
            forceOwnSlugUrlFromAvailableData(user, myData);
            updateOwnProfileUrl(user, myData);
        } catch (urlErr) {
            console.warn('Failed to update profile URL slug:', urlErr);
            updateOwnProfileUrl(user, {
                username: user.displayName || (document.querySelector('.profile-name') ? document.querySelector('.profile-name').textContent : 'player'),
                accountId: getRuntimeAccountId(),
                profile: {}
            });
        }
        setRadarMode('combined', false);
        syncUserMenuDropdownWidth();
        hidePageLoader();
    } else {
        if (profileId) {
            hidePageLoader();
            return;
        }
        hidePageLoader();
    }
});

window.addEventListener('pagehide', () => {
    if (isViewMode) return;
    saveCurrentScores();
    saveSavedScores();
});

function getCroppedImage() {
    if (!cropperImage || !cropperImage.src) return null;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 120;
    canvas.height = 120;
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.translate(60, 60);
    ctx.translate(cropperState.x, cropperState.y);
    ctx.scale(cropperState.scale, cropperState.scale);
    ctx.drawImage(cropperImage, -cropperImage.naturalWidth / 2, -cropperImage.naturalHeight / 2);
    return canvas.toDataURL('image/png');
}

if (saveImageBtn) {
    saveImageBtn.addEventListener('click', () => {
        const croppedDataUrl = getCroppedImage();
        if (croppedDataUrl) {
            draftProfileState.pic = croppedDataUrl;
            draftProfileState.cropState = { ...cropperState };
            if (cropperImage.dataset.originalSrc) {
                draftProfileState.originalPic = cropperImage.dataset.originalSrc;
            }
            updateProfilePicPreview(croppedDataUrl);
            cropperContainer.style.display = 'none';
            if (profilePicInput) profilePicInput.value = '';
            if (uploadProfilePicBtn) uploadProfilePicBtn.textContent = t('replace_image');
            if (editProfilePicBtn) editProfilePicBtn.style.display = 'block';
            updateProfileButtons();
        }
    });
}

if (centerImageBtn) {
    centerImageBtn.addEventListener('click', () => {
        cropperState.x = 0;
        cropperState.y = 0;
        updateCropperTransform();
    });
}

if (cancelImageBtn) {
    cancelImageBtn.addEventListener('click', () => {
        if (cropperContainer) cropperContainer.style.display = 'none';
        isDragging = false;
        cropperState = { x: 0, y: 0, scale: 1 };
        if (cropperZoom) cropperZoom.value = 1;
        if (cropperImage) {
            cropperImage.removeAttribute('src');
            delete cropperImage.dataset.originalSrc;
            updateCropperTransform();
        }
        if (profilePicInput) profilePicInput.value = '';
        if (editProfilePicBtn) {
            const hasExistingImage = !!(draftProfileState && (draftProfileState.pic || draftProfileState.originalPic));
            editProfilePicBtn.style.display = hasExistingImage ? 'block' : 'none';
        }
    });
}

if (saveProfileBtn) {
    saveProfileBtn.addEventListener('click', async () => {
        const user = auth.currentUser;
        if (!user) {
            alert(t('profile_save_login_required'));
            return;
        }

        saveProfileBtn.disabled = true;
        saveProfileBtn.textContent = t('profile_saving');

        try {
            const username = draftProfileState.username;
            const usernameChanged = username && username !== originalProfileState.username;

            if (usernameChanged) {
                await updateProfile(user, { displayName: username });
            }

            if (username) {
                document.querySelector('.profile-name').textContent = username;
                const userMenuName = document.getElementById('userMenuUsername');
                if (userMenuName) userMenuName.textContent = username;
                syncUserMenuDropdownWidth();
            }
            
            if (draftProfileState.pic) {
                localStorage.setItem('benchmark_profile_pic', draftProfileState.pic);
            } else {
                localStorage.removeItem('benchmark_profile_pic');
            }

            if (draftProfileState.flag) {
                localStorage.setItem('benchmark_country_flag', draftProfileState.flag);
            } else {
                localStorage.removeItem('benchmark_country_flag');
            }

            if (draftProfileState.originalPic) {
                try {
                    localStorage.setItem('benchmark_profile_pic_original', draftProfileState.originalPic);
                } catch (e) {
                    console.warn('Failed to save original profile picture:', e);
                }
            } else {
                localStorage.removeItem('benchmark_profile_pic_original');
            }

            if (draftProfileState.cropState) {
                localStorage.setItem('benchmark_profile_pic_state', JSON.stringify(draftProfileState.cropState));
            } else {
                localStorage.removeItem('benchmark_profile_pic_state');
            }

            localStorage.setItem('benchmark_guilds', JSON.stringify(editingGuilds));
            updateMainPageGuildDisplay();
            updateMainHeaderLayout();

            const profileData = cleanProfileData(draftProfileState, editingGuilds);
            const accountIdForSlug = getRuntimeAccountId();
            const publicSlug = buildProfileSlug(username, accountIdForSlug, user.uid);
            // Save username and profile data to Firestore
            await setDoc(doc(db, 'users', user.uid), {
                username: username,
                profile: profileData,
                publicSlug
            }, { merge: true });
            
            originalProfileState = {
                username: username,
                pic: draftProfileState.pic,
                flag: draftProfileState.flag,
                originalPic: draftProfileState.originalPic,
                guilds: [...editingGuilds],
                cropState: draftProfileState.cropState ? { ...draftProfileState.cropState } : null
            };
            updateProfileButtons();

        } catch (error) {
            console.error("Error saving profile:", error);
            alert(t('profile_save_failed'));
        } finally {
            saveProfileBtn.disabled = false;
            saveProfileBtn.textContent = t('save_changes');
        }
    });
}

// Confirmation Modal Logic
const confirmModal = document.getElementById('confirmModal');
const confirmTitle = document.getElementById('confirmTitle');
const confirmMessage = document.getElementById('confirmMessage');
const confirmOkBtn = document.getElementById('confirmOkBtn');
const confirmCancelBtn = document.getElementById('confirmCancelBtn');
let currentConfirmCallback = null;

function showConfirmModal(title, message, callback) {
    if (confirmTitle) confirmTitle.textContent = title;
    if (confirmMessage) confirmMessage.textContent = message;
    currentConfirmCallback = callback;
    if (confirmModal) confirmModal.classList.add('show');
}

function closeConfirmModal() {
    if (confirmModal) {
        confirmModal.classList.remove('show');
        confirmModal.classList.add('closing');
        setTimeout(() => {
             confirmModal.classList.remove('closing');
        }, 200);
    }
    currentConfirmCallback = null;
}

if (confirmOkBtn) {
    confirmOkBtn.addEventListener('click', () => {
        if (currentConfirmCallback) currentConfirmCallback();
        closeConfirmModal();
    });
}

if (confirmCancelBtn) {
    confirmCancelBtn.addEventListener('click', () => {
        closeConfirmModal();
    });
}

bindModalOverlayQuickClose(confirmModal, closeConfirmModal);

if (discardProfileBtn) {
    discardProfileBtn.addEventListener('click', () => {
        // Revert to original
        draftProfileState = {
            username: originalProfileState.username,
            pic: originalProfileState.pic,
            flag: originalProfileState.flag,
            originalPic: originalProfileState.originalPic,
            cropState: originalProfileState.cropState ? { ...originalProfileState.cropState } : null
        };
        editingGuilds = [...originalProfileState.guilds];

        // Update UI
        const usernameInput = document.getElementById('profileUsernameInput');
        if (usernameInput) usernameInput.value = draftProfileState.username;
        
        updateProfilePicPreview(draftProfileState.pic);
        updateFlagPreview(draftProfileState.flag);
        renderGuildsList();
        
        if (cropperContainer) cropperContainer.style.display = 'none';
        if (cropperImage) cropperImage.removeAttribute('src');
        if (cropperImage) delete cropperImage.dataset.originalSrc;
        if (profilePicInput) profilePicInput.value = '';

        updateProfileButtons();
    });
}

// Achievements Modal
const achievementsSection = document.querySelector('.achievements-section');
const achievementsModal = document.getElementById('achievementsModal');
const closeAchievementsModal = document.getElementById('closeAchievementsModal');

const ACHIEVEMENTS_LIST = [
    { id: 'total_300k', name: 'Rising Star', title: 'Obtain 300,000 baddy kills' },
    { id: 'total_500k', name: 'Half Million', title: 'Obtain 500,000 baddy kills' },
    { id: 'total_700k', name: 'Serious Business', title: 'Obtain 700,000 baddy kills' },
    { id: 'total_1m', name: 'Millionaire', title: 'Obtain 1,000,000 baddy kills' },
    { id: 'kill_5k_day', name: 'Busy Day', title: 'Kill 5,000 baddies in one day' },
    { id: 'kill_7.5k_day', name: 'Hard Work', title: 'Kill 7,500 baddies in one day' },
    { id: 'kill_10k_day', name: 'Overtime', title: 'Kill 10,000 baddies in one day' },
    { id: 'kill_12k_day', name: 'No Life', title: 'Kill 12,000 baddies in one day' },
    { id: 'points_4k_day', name: 'Point Earner', title: 'Reach 4,000 baddy points in one day' },
    { id: 'points_6k_day', name: 'Point Hoarder', title: 'Reach 6,000 baddy points in one day' },
    { id: 'points_8k_day', name: 'Point Tycoon', title: 'Reach 8,000 baddy points in one day' },
    { id: 'streak_1k', name: 'Warming Up', title: 'Get a 1,000 baddy streak' },
    { id: 'streak_3.5k', name: 'On Fire', title: 'Get a 3,500 baddy streak' },
    { id: 'streak_5k', name: 'Untouchable', title: 'Get a 5,000 Baddy Streak' },
    { id: 'streak_7.5k', name: 'Invincible', title: 'Get a 7,500 baddy streak' },
    { id: 'streak_10k', name: 'God Mode', title: 'Get a 10,000 baddy streak' },
    { id: 'duo_2.5k', name: 'Partner Up', title: 'Complete a duo session by getting 2,500 baddy kills in one day', friendSlots: 2 },
    { id: 'duo_5k', name: 'Best Buds', title: 'Complete a duo session by getting 5,000 baddy kills in one day', friendSlots: 2 },
    { id: 'duo_7.5k', name: 'Sync Souls', title: 'Complete a duo session by getting 7,500 baddy kills in one day', friendSlots: 2 },
    { id: 'duo_10k', name: 'Perfect Pair', title: 'Complete a duo session by getting 10,000 baddy kills in one day', friendSlots: 2 },
    { id: 'trio_2.5k', name: 'Triple Threat', title: 'Complete a trio session by getting 2,500 baddy kills in one day', friendSlots: 2 },
    { id: 'trio_5k', name: 'Three of a Kind', title: 'Complete a trio session by getting 5,000 baddy kills in one day', friendSlots: 2 },
    { id: 'trio_7.5k', name: 'Tri Force', title: 'Complete a trio session by getting 7,500 baddy kills in one day', friendSlots: 2 },
    { id: 'trio_10k', name: 'Trinity Run', title: 'Complete a trio session by getting 10,000 baddy kills in one day', friendSlots: 2 },
    { id: 'quad_2.5k', name: 'Party of Four', title: 'Complete a quad session by getting 2,500 baddy kills in one day', friendSlots: 3 },
    { id: 'quad_5k', name: 'Full Stack', title: 'Complete a quad session by getting 5,000 baddy kills in one day', friendSlots: 3 },
    { id: 'quad_7.5k', name: 'Fourfront', title: 'Complete a quad session by getting 7,500 baddy kills in one day', friendSlots: 3 },
    { id: 'quad_10k', name: 'Quad Core', title: 'Complete a quad session by getting 10,000 baddy kills in one day', friendSlots: 3 }
];

function getAchievementCategory(id) {
    if (id.startsWith('total_')) return { key: 'total', label: t('achievement_cat_lifetime') };
    if (id.startsWith('kill_')) return { key: 'kills', label: t('achievement_cat_kills') };
    if (id.startsWith('points_')) return { key: 'points', label: t('achievement_cat_points') };
    if (id.startsWith('streak_')) return { key: 'streak', label: t('achievement_cat_streak') };
    if (id.startsWith('duo_')) return { key: 'duo', label: t('achievement_cat_duo') };
    if (id.startsWith('trio_')) return { key: 'trio', label: t('achievement_cat_trio') };
    if (id.startsWith('quad_')) return { key: 'quad', label: t('achievement_cat_quad') };
    return { key: 'general', label: t('achievement_cat_challenge') };
}

function parseAchievementValueToken(token) {
    if (!token) return '';
    const normalized = String(token).toLowerCase();
    if (normalized.endsWith('m')) {
        const n = Number(normalized.slice(0, -1));
        return Number.isFinite(n) ? Math.round(n * 1000000).toLocaleString() : token;
    }
    if (normalized.endsWith('k')) {
        const n = Number(normalized.slice(0, -1));
        return Number.isFinite(n) ? Math.round(n * 1000).toLocaleString() : token;
    }
    const n = Number(normalized);
    return Number.isFinite(n) ? n.toLocaleString() : token;
}

function getLocalizedAchievementGoal(achievement) {
    const id = achievement && achievement.id ? String(achievement.id) : '';
    if (!id) return achievement && achievement.title ? achievement.title : '';
    if (id.startsWith('total_')) {
        return tf('achievement_goal_total', { value: parseAchievementValueToken(id.slice('total_'.length)) });
    }
    if (id.startsWith('kill_') && id.endsWith('_day')) {
        return tf('achievement_goal_kills_day', { value: parseAchievementValueToken(id.slice('kill_'.length, -'_day'.length)) });
    }
    if (id.startsWith('points_') && id.endsWith('_day')) {
        return tf('achievement_goal_points_day', { value: parseAchievementValueToken(id.slice('points_'.length, -'_day'.length)) });
    }
    if (id.startsWith('streak_')) {
        return tf('achievement_goal_streak', { value: parseAchievementValueToken(id.slice('streak_'.length)) });
    }
    if (id.startsWith('duo_')) {
        return tf('achievement_goal_group_day', {
            group: t('achievement_group_duo'),
            value: parseAchievementValueToken(id.slice('duo_'.length))
        });
    }
    if (id.startsWith('trio_')) {
        return tf('achievement_goal_group_day', {
            group: t('achievement_group_trio'),
            value: parseAchievementValueToken(id.slice('trio_'.length))
        });
    }
    if (id.startsWith('quad_')) {
        return tf('achievement_goal_group_day', {
            group: t('achievement_group_quad'),
            value: parseAchievementValueToken(id.slice('quad_'.length))
        });
    }
    return achievement.title || '';
}

function getAchievementFriendSlots(achievement) {
    const slots = Number(achievement.friendSlots);
    if (Number.isFinite(slots) && slots > 0) return Math.max(1, Math.floor(slots));
    if (achievement.hasInput) return 1;
    return 0;
}

function getAchievementFriendNames(data, slots) {
    const names = new Array(slots).fill('');
    if (Array.isArray(data.friends)) {
        for (let i = 0; i < slots; i++) {
            const value = data.friends[i];
            if (typeof value === 'string') names[i] = value;
        }
    }
    // Backward compatibility with older single-note achievements data.
    if (!names[0] && typeof data.note === 'string') {
        names[0] = data.note;
    }
    return names;
}

function compressImageFileToDataUrl(file, maxDimension = 640, quality = 0.72) {
    return new Promise((resolve, reject) => {
        if (!file || !file.type || !file.type.startsWith('image/')) {
            reject(new Error('Invalid image file'));
            return;
        }
        const reader = new FileReader();
        reader.onload = (evt) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Canvas unsupported'));
                    return;
                }

                let { width, height } = img;
                const aspectRatio = width / height;
                if (width > maxDimension || height > maxDimension) {
                    if (aspectRatio > 1) {
                        width = maxDimension;
                        height = Math.round(maxDimension / aspectRatio);
                    } else {
                        height = maxDimension;
                        width = Math.round(maxDimension * aspectRatio);
                    }
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = () => reject(new Error('Image decode failed'));
            img.src = evt.target.result;
        };
        reader.onerror = () => reject(new Error('File read failed'));
        reader.readAsDataURL(file);
    });
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function renderAchievements() {
    const container = document.getElementById('achievementList');
    if (!container) return;
    container.innerHTML = '';

    ACHIEVEMENTS_LIST.forEach((ach, index) => {
        const data = userAchievements[ach.id] || {};
        const isCompleted = !!data.completed;
        const friendSlots = getAchievementFriendSlots(ach);
        const friendNames = getAchievementFriendNames(data, friendSlots);
        const proofImage = typeof data.image === 'string' ? data.image : '';
        const category = getAchievementCategory(ach.id);
        const goalText = getLocalizedAchievementGoal(ach);
        const indexLabel = String(index + 1).padStart(2, '0');

        const item = document.createElement('div');
        item.className = 'achievement-item';
        if (isCompleted) item.classList.add('completed');

        let inputHtml = '';
        if (friendSlots > 0) {
            const placeholder = isViewMode ? '' : t('achievement_enter_friend_name');
            const inputFields = friendNames.map((name, friendIndex) => {
                const normalizedName = typeof name === 'string' ? name : '';
                const displayValue = (isViewMode && !normalizedName.trim())
                    ? t('achievement_session_incomplete')
                    : normalizedName;
                const label = tf('achievement_friend_label', { index: friendIndex + 1 });
                return `
                    <div class="achievement-note-wrap">
                        <div class="achievement-note-label">${escapeHtml(label)}</div>
                        <input type="text" class="achievement-input" data-friend-index="${friendIndex}" placeholder="${escapeHtml(placeholder)}" value="${escapeHtml(displayValue)}" ${isViewMode ? 'disabled' : ''}>
                    </div>
                `;
            }).join('');
            const noteLayoutClass = friendSlots > 1 ? 'achievement-note-fields-multi' : '';
            const friendCountClass = friendSlots === 3 ? 'achievement-note-fields-triple' : '';
            inputHtml = `
                <div class="achievement-note-fields ${noteLayoutClass} ${friendCountClass}">
                    ${inputFields}
                </div>
            `;
        }

        let proofHtml = '';
        if (friendSlots > 0) {
            const proofPlaceholder = isViewMode ? t('achievement_no_image') : t('achievement_upload_image');
            const removeImageBtn = (!isViewMode && proofImage)
                ? `<button type="button" class="achievement-proof-remove" aria-label="${escapeHtml(t('remove_image'))}">&times;</button>`
                : '';
            proofHtml = `
                <div class="achievement-proof-wrap">
                    <div class="achievement-note-label">${t('achievement_session_image')}</div>
                    <div class="achievement-proof-upload ${proofImage ? 'has-image' : ''}" ${isViewMode ? '' : 'tabindex="0"'}>
                        ${proofImage
                            ? `<img src="${escapeHtml(proofImage)}" class="achievement-proof-preview" alt="Achievement proof image">`
                            : `<span class="achievement-proof-placeholder">${proofPlaceholder}</span>`
                        }
                        ${removeImageBtn}
                    </div>
                    <input type="file" class="achievement-proof-input" accept="image/*" ${isViewMode ? 'disabled' : ''}>
                </div>
            `;
        }

        item.innerHTML = `
            <div class="achievement-header">
                <div class="achievement-index">${indexLabel}</div>
                <div class="achievement-info">
                    <div class="achievement-meta-row">
                        <span class="achievement-category achievement-category-${category.key}">${category.label}</span>
                        <span class="achievement-state ${isCompleted ? 'done' : 'incomplete'}">${isCompleted ? t('achievement_completed') : t('achievement_incomplete')}</span>
                    </div>
                    <div class="achievement-goal">${goalText}</div>
                </div>
                <input type="checkbox" class="achievement-checkbox" ${isCompleted ? 'checked' : ''} ${isViewMode ? 'onclick="return false;" style="cursor: default;"' : ''}>
            </div>
            ${inputHtml}
            ${proofHtml}
        `;

        const checkbox = item.querySelector('.achievement-checkbox');
        const stateBadge = item.querySelector('.achievement-state');
        checkbox.addEventListener('change', (e) => {
            const isNowCompleted = !!e.target.checked;
            if (!userAchievements[ach.id]) userAchievements[ach.id] = {};
            userAchievements[ach.id].completed = isNowCompleted;

            if (isNowCompleted) item.classList.add('completed');
            else item.classList.remove('completed');

            if (stateBadge) {
                stateBadge.textContent = isNowCompleted ? t('achievement_completed') : t('achievement_incomplete');
                stateBadge.classList.remove('done', 'incomplete');
                stateBadge.classList.add(isNowCompleted ? 'done' : 'incomplete');
            }

            saveAchievements();
            updateAchievementsProgress();
        });

        item.addEventListener('click', (e) => {
            if (isViewMode) return;
            if (e.target.classList.contains('achievement-checkbox')) return;
            if (e.target.closest('.achievement-note-wrap')) return;
            if (e.target.closest('.achievement-proof-wrap')) return;
            checkbox.checked = !checkbox.checked;
            checkbox.dispatchEvent(new Event('change'));
        });

        if (friendSlots > 0) {
            const inputs = item.querySelectorAll('.achievement-input');
            const saveFriendNames = () => {
                if (!userAchievements[ach.id]) userAchievements[ach.id] = {};
                const names = Array.from(inputs).map(input => input.value || '');
                userAchievements[ach.id].friends = names;
                // Keep first note for backward compatibility with older data shape.
                userAchievements[ach.id].note = names[0] || '';
                saveAchievements();
            };
            inputs.forEach(input => {
                input.addEventListener('input', saveFriendNames);
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        e.currentTarget.blur();
                    }
                });
            });

            const proofUpload = item.querySelector('.achievement-proof-upload');
            const proofInput = item.querySelector('.achievement-proof-input');
            const getCurrentProofImage = () => {
                const stored = userAchievements[ach.id] && typeof userAchievements[ach.id].image === 'string'
                    ? userAchievements[ach.id].image
                    : '';
                if (stored) return stored;
                const preview = proofUpload ? proofUpload.querySelector('.achievement-proof-preview') : null;
                return preview && typeof preview.getAttribute === 'function'
                    ? (preview.getAttribute('src') || '')
                    : '';
            };
            if (proofUpload && proofInput && !proofInput.disabled) {
                const emptyProofText = t('achievement_upload_image');
                const renderProofState = (imageData) => {
                    if (imageData) {
                        const safeUrl = escapeHtml(imageData);
                        proofUpload.classList.add('has-image');
                        proofUpload.innerHTML = `
                            <img src="${safeUrl}" class="achievement-proof-preview" alt="Achievement proof image">
                            <button type="button" class="achievement-proof-remove" aria-label="Remove image">&times;</button>
                        `;
                        const removeBtn = proofUpload.querySelector('.achievement-proof-remove');
                        if (removeBtn) {
                            removeBtn.addEventListener('click', (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                showConfirmModal(
                                    t('achievement_remove_image_title'),
                                    t('achievement_remove_image_confirm'),
                                    () => {
                                        if (!userAchievements[ach.id]) userAchievements[ach.id] = {};
                                        delete userAchievements[ach.id].image;
                                        saveAchievements();
                                        renderProofState('');
                                    }
                                );
                            });
                        }
                    } else {
                        proofUpload.classList.remove('has-image');
                        proofUpload.innerHTML = `<span class="achievement-proof-placeholder">${emptyProofText}</span>`;
                    }
                };

                const openProofPicker = () => proofInput.click();

                const handleClickOrKey = (e) => {
                    if (e.target.closest('.achievement-proof-remove')) return;
                    const currentImage = getCurrentProofImage();
                    if (currentImage) {
                        openImageViewer(currentImage, '');
                    } else {
                        openProofPicker();
                    }
                };

                proofUpload.addEventListener('click', handleClickOrKey);
                proofUpload.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleClickOrKey(e);
                    }
                });

                proofInput.addEventListener('change', async (e) => {
                    const file = e.target.files && e.target.files[0];
                    if (!file) return;
                    try {
                        const dataUrl = await compressImageFileToDataUrl(file);
                        if (!userAchievements[ach.id]) userAchievements[ach.id] = {};
                        userAchievements[ach.id].image = dataUrl;
                        saveAchievements();
                        renderProofState(dataUrl);
                    } catch (err) {
                        console.error('Failed to process achievement image:', err);
                    } finally {
                        proofInput.value = '';
                    }
                });

                renderProofState(proofImage);
            } else if (proofUpload && isViewMode) {
                proofUpload.addEventListener('click', () => {
                    const currentImage = getCurrentProofImage();
                    if (currentImage) openImageViewer(currentImage, '');
                });
                const proofPreview = proofUpload.querySelector('.achievement-proof-preview');
                if (proofPreview) {
                    proofPreview.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const currentImage = getCurrentProofImage();
                        if (currentImage) openImageViewer(currentImage, '');
                    });
                }
                proofUpload.addEventListener('keydown', (e) => {
                    if (e.key !== 'Enter' && e.key !== ' ') return;
                    e.preventDefault();
                    const currentImage = getCurrentProofImage();
                    if (currentImage) openImageViewer(currentImage, '');
                });
            }
        }

        container.appendChild(item);
    });
    updateAchievementsProgress();
}

async function saveAchievements() {
    if (isViewMode) return;
    const user = auth.currentUser;
    if (user) {
        await updateDoc(doc(db, 'users', user.uid), {
            achievements: userAchievements
        });
    }
    localStorage.setItem('benchmark_achievements', JSON.stringify(userAchievements));
}

function updateAchievementsProgress() {
    const total = ACHIEVEMENTS_LIST.length;
    const completed = Object.values(userAchievements).filter(a => a.completed).length;
    const percent = Math.round((completed / total) * 100);

    let viewerName = '';
    if (isViewMode) {
        const nameEl = document.querySelector('.profile-name');
        viewerName = (nameEl && nameEl.textContent ? nameEl.textContent.trim() : '') || t('unknown_player');
    }

    let progressLead = `${t('achievement_you_have')}:`;
    if (isViewMode) {
        const localizedViewPrefix = tf('achievement_progress_view_prefix', { name: viewerName });
        const safePrefix = typeof localizedViewPrefix === 'string' ? localizedViewPrefix.trim() : '';
        if (!safePrefix) {
            progressLead = viewerName;
        } else if (safePrefix.includes(viewerName)) {
            progressLead = safePrefix;
        } else {
            progressLead = `${viewerName} ${safePrefix}`;
        }
    }
    const percentLabel = `(${percent}%)`;

    const fills = document.querySelectorAll('.achievements-fill');
    const texts = document.querySelectorAll('.achievements-text');
    
    fills.forEach(fill => {
        if (fill) fill.style.width = `${percent}%`;
    });
    texts.forEach(text => {
        if (text) {
            text.innerHTML = '';
            const textNode = document.createTextNode(`${progressLead} ${completed}/${total} `);
            const span = document.createElement('span');
            span.className = 'achievements-percent';
            span.textContent = percentLabel;
            text.appendChild(textNode);
            text.appendChild(span);
        }
    });

}

function closeAchievements() {
    if (!achievementsModal) return;
    achievementsModal.classList.add('closing');
    setTimeout(() => {
        achievementsModal.classList.remove('show');
        achievementsModal.classList.remove('closing');
    }, 200);
}

if (achievementsSection && achievementsModal) {
    achievementsSection.addEventListener('click', () => {
        renderAchievements();
        achievementsModal.classList.add('show');
        const scrollBox = achievementsModal.querySelector('.settings-content-box');
        if (scrollBox) scrollBox.scrollTop = 0;
    });
}

// Init Main Page Layout
updateMainHeaderLayout();

if (closeAchievementsModal) {
    closeAchievementsModal.addEventListener('click', closeAchievements);
}

bindModalOverlayQuickClose(achievementsModal, closeAchievements);

// Flag Picker Logic
const flagSelectorBox = document.getElementById('flagSelectorBox');
const onboardingFlagSelectorBox = document.getElementById('onboardingFlagSelectorBox');
const flagModal = document.getElementById('flagModal');
const closeFlagModal = document.getElementById('closeFlagModal');
const flagGrid = document.getElementById('flagGrid');

const FLAGS = [
    { code: 'us', label: 'English' },
    { code: 'sa', label: 'Arabic' },
    { code: 'bd', label: 'Bangla' },
    { code: 'dk', label: 'Danish' },
    { code: 'de', label: 'German' },
    { code: 'es', label: 'Spanish' },
    { code: 'ph', label: 'Filipino' },
    { code: 'fr', label: 'French' },
    { code: 'hmn', label: 'Hmong' },
    { code: 'id', label: 'Indonesian' },
    { code: 'it', label: 'Italian' },
    { code: 'hu', label: 'Hungarian' },
    { code: 'my', label: 'Malay' },
    { code: 'nl', label: 'Dutch' },
    { code: 'no', label: 'Norwegian' },
    { code: 'pl', label: 'Polish' },
    { code: 'br', label: 'Portuguese (BR)' },
    { code: 'pt', label: 'Portuguese (PT)' },
    { code: 'fi', label: 'Finnish' },
    { code: 'se', label: 'Swedish' },
    { code: 'vn', label: 'Vietnamese' },
    { code: 'tr', label: 'Turkish' },
    { code: 'cn', label: 'Chinese' },
    { code: 'jp', label: 'Japanese' },
    { code: 'kr', label: 'Korean' }
];

function getFlagUrl(code) {
    if (code === 'hmn') return 'https://upload.wikimedia.org/wikipedia/commons/2/27/Hmong_flag.svg';
    return `https://flagcdn.com/w80/${code.toLowerCase()}.png`;
}

function renderFlags() {
    if (!flagGrid) return;
    flagGrid.innerHTML = '';
    FLAGS.forEach(flag => {
        const div = document.createElement('div');
        div.className = 'flag-option';
        div.style.backgroundImage = `url(${getFlagUrl(flag.code)})`;
        div.title = flag.label;
        div.addEventListener('click', () => {
            handleFlagSelection(flag.code);
            closeFlagPicker();
        });
        flagGrid.appendChild(div);
    });
}

function setFlag(code) {
    // This function is for initialization/main page update
    // Logic moved to updateMainHeaderLayout, but we keep this for legacy calls if any
    if (code) localStorage.setItem('benchmark_country_flag', code);
    else localStorage.removeItem('benchmark_country_flag');
    updateMainHeaderLayout();
}

function handleFlagSelection(code) {
    draftProfileState.flag = code;
    updateFlagPreview(code);
    updateProfileButtons();
}

function closeFlagPicker() {
    if (!flagModal) return;
    flagModal.classList.add('closing');
    setTimeout(() => {
        flagModal.classList.remove('show');
        flagModal.classList.remove('closing');
    }, 200);
}

if (flagSelectorBox) {
    flagSelectorBox.addEventListener('click', () => {
        renderFlags();
        flagModal.classList.add('show');
    });
}

if (onboardingFlagSelectorBox) {
    onboardingFlagSelectorBox.addEventListener('click', () => {
        renderFlags();
        flagModal.classList.add('show');
    });
}

if (closeFlagModal) {
    closeFlagModal.addEventListener('click', closeFlagPicker);
}

bindModalOverlayQuickClose(flagModal, closeFlagPicker);

// Guild Logic
let editingGuilds = [];
let editingGuildIndex = -1;
const guildListContainer = document.getElementById('guildListContainer');
const addGuildBtn = document.getElementById('addGuildBtn');
const newGuildInputBox = document.getElementById('newGuildInputBox');
const newGuildInput = document.getElementById('newGuildInput');
const confirmAddGuildBtn = document.getElementById('confirmAddGuildBtn');
const cancelAddGuildBtn = document.getElementById('cancelAddGuildBtn');
const onboardingGuildListContainer = document.getElementById('onboardingGuildListContainer');

function renderGuildsList() {
    const containers = [guildListContainer, onboardingGuildListContainer];
    
    containers.forEach(container => {
        if (!container) return;
        container.innerHTML = '';
        container.style.display = editingGuilds.length > 0 ? 'flex' : 'none';
        
    editingGuilds.forEach((guild, index) => {
        const div = document.createElement('div');
        div.className = 'guild-item';
        
        const dragHandleHtml = `
            <div class="guild-drag-handle" title="${escapeHtml(t('drag_to_reorder'))}">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 5.83L15.17 9l1.41-1.41L12 3 7.41 7.59 8.83 9 12 5.83zm0 12.34L8.83 15l-1.41 1.41L12 21l4.59-4.59L15.17 15 12 18.17z"/></svg>
            </div>
        `;
        
        if (index === editingGuildIndex) {
            div.classList.add('editing');
            div.innerHTML = `
                <div class="guild-left-content">
                    ${dragHandleHtml}
                    <input type="text" class="settings-select guild-edit-input" value="${guild}" maxlength="20">
                </div>
                <div class="guild-item-actions">
                    <button class="guild-action-btn save">${escapeHtml(t('save'))}</button>
                    <button class="guild-action-btn cancel">${escapeHtml(t('cancel'))}</button>
                </div>
            `;
            const input = div.querySelector('input');
            const saveBtn = div.querySelector('.save');
            const cancelBtn = div.querySelector('.cancel');

            const save = () => {
                const val = input.value.trim();
                if (val) {
                    editingGuilds[index] = val;
                    editingGuildIndex = -1;
                    renderGuildsList();
                    updateProfileButtons();
                }
            };

            saveBtn.addEventListener('click', save);
            cancelBtn.addEventListener('click', () => {
                editingGuildIndex = -1;
                renderGuildsList();
            });
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') save();
                if (e.key === 'Escape') {
                    editingGuildIndex = -1;
                    renderGuildsList();
                }
            });
            
            setTimeout(() => {
                input.focus();
                const end = input.value.length;
                try {
                    input.setSelectionRange(end, end);
                } catch (e) {}
            }, 0);
        } else {
            div.innerHTML = `
                <div class="guild-left-content">
                    ${dragHandleHtml}
                    <span class="guild-item-name">${guild}</span>
                </div>
                <div class="guild-item-actions">
                    <button class="guild-action-btn edit">${escapeHtml(t('edit'))}</button>
                    <button class="guild-action-btn remove">${escapeHtml(t('remove'))}</button>
                </div>
            `;
            div.querySelector('.edit').addEventListener('click', () => {
                editingGuildIndex = index;
                renderGuildsList();
            });
            div.querySelector('.remove').addEventListener('click', () => {
                editingGuilds.splice(index, 1);
                if (editingGuildIndex === index) editingGuildIndex = -1;
                else if (editingGuildIndex > index) editingGuildIndex--;
                renderGuildsList();
                updateProfileButtons();
                if (addGuildBtn) addGuildBtn.style.display = 'block';
            });
        }
        
        const handle = div.querySelector('.guild-drag-handle');
        if (handle) {
            handle.addEventListener('pointerdown', (e) => {
                handleGuildDragStart(e, div);
            });
        }
        
        container.appendChild(div);
    });
    });
}

let dragAvatar = null;
let dragPlaceholder = null;
let dragOffsetY = 0;
let dragOffsetX = 0;
let isPointerDragging = false;

function handleGuildDragStart(e, item) {
    if (e.button !== 0) return;
    e.preventDefault();
    
    const rect = item.getBoundingClientRect();
    dragOffsetY = e.clientY - rect.top;
    dragOffsetX = e.clientX - rect.left;
    
    item.style.setProperty('--drag-width', `${rect.width}px`);
    
    dragAvatar = item.cloneNode(true);
    dragAvatar.classList.add('sortable-drag');
    // Copy input value if editing
    const origInput = item.querySelector('input');
    const avatarInput = dragAvatar.querySelector('input');
    if (origInput && avatarInput) avatarInput.value = origInput.value;
    
    dragAvatar.style.left = `${rect.left}px`;
    dragAvatar.style.top = `${rect.top}px`;
    document.body.appendChild(dragAvatar);
    
    item.classList.add('sortable-ghost');
    dragPlaceholder = item;
    
    isPointerDragging = true;
    
    document.addEventListener('pointermove', handleGuildDragMove);
    document.addEventListener('pointerup', handleGuildDragEnd);
    document.addEventListener('pointercancel', handleGuildDragEnd);
}

function handleGuildDragMove(e) {
    if (!isPointerDragging || !dragAvatar) return;
    e.preventDefault();
    
    const x = e.clientX - dragOffsetX;
    const y = e.clientY - dragOffsetY;
    
    dragAvatar.style.left = `${x}px`;
    dragAvatar.style.top = `${y}px`;
    
    const container = guildListContainer;
    const siblings = [...container.querySelectorAll('.guild-item:not(.sortable-drag)')];
    const afterElement = getDragAfterElement(container, e.clientY);
    
    if (afterElement !== dragPlaceholder.nextElementSibling && afterElement !== dragPlaceholder) {
        const positions = new Map();
        siblings.forEach(el => positions.set(el, el.getBoundingClientRect().top));
        
        if (afterElement == null) {
            container.appendChild(dragPlaceholder);
        } else {
            container.insertBefore(dragPlaceholder, afterElement);
        }
        
        siblings.forEach(el => {
            const newTop = el.getBoundingClientRect().top;
            const oldTop = positions.get(el);
            if (oldTop === undefined) return;
            const delta = oldTop - newTop;
            if (delta !== 0) {
                el.style.transition = 'none';
                el.style.transform = `translateY(${delta}px)`;
                void el.offsetHeight;
                el.style.transition = 'transform 0.3s cubic-bezier(0.2, 1, 0.3, 1)';
                el.style.transform = '';
            }
        });
    }
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.guild-item:not(.sortable-ghost):not(.sortable-drag)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function handleGuildDragEnd(e) {
    if (!isPointerDragging) return;
    isPointerDragging = false;
    
    document.removeEventListener('pointermove', handleGuildDragMove);
    document.removeEventListener('pointerup', handleGuildDragEnd);
    document.removeEventListener('pointercancel', handleGuildDragEnd);
    
    if (dragAvatar) {
        dragAvatar.remove();
        dragAvatar = null;
    }
    
    if (dragPlaceholder) {
        dragPlaceholder.classList.remove('sortable-ghost');
        dragPlaceholder = null;
    }
    
    const newGuilds = [];
    const items = guildListContainer.querySelectorAll('.guild-item');
    items.forEach(item => {
        const input = item.querySelector('input');
        const span = item.querySelector('.guild-item-name');
        if (input) newGuilds.push(input.value.trim());
        else if (span) newGuilds.push(span.textContent.trim());
    });
    
    editingGuilds = newGuilds.filter(g => g);
    editingGuildIndex = -1;
    
    renderGuildsList();
    updateProfileButtons();
}

function updateMainPageGuildDisplay() {
    const guildNameEl = document.querySelector('.guild-name');
    if (!guildNameEl) return;
    
    let guilds = [];
    try {
        const saved = localStorage.getItem('benchmark_guilds');
        guilds = saved ? JSON.parse(saved) : [];
    } catch (e) {}

    if (guilds.length > 0) {
        guildNameEl.textContent = guilds.map(g => `(${g})`).join(' ');
        guildNameEl.style.display = 'block';
    } else {
        guildNameEl.style.display = 'none';
    }
}

if (addGuildBtn) {
    addGuildBtn.addEventListener('click', () => {
        if (editingGuilds.length >= 6) return;
        addGuildBtn.style.display = 'none';
        newGuildInputBox.style.display = 'flex';
        if (newGuildInput) {
            newGuildInput.value = '';
            newGuildInput.focus();
        }
    });
}

if (cancelAddGuildBtn) {
    cancelAddGuildBtn.addEventListener('click', () => {
        newGuildInputBox.style.display = 'none';
        addGuildBtn.style.display = editingGuilds.length >= 6 ? 'none' : 'block';
    });
}

if (confirmAddGuildBtn) {
    confirmAddGuildBtn.addEventListener('click', () => {
        const val = newGuildInput.value.trim();
        if (val) {
            editingGuilds.push(val);
            renderGuildsList();
            updateProfileButtons();
        }
        newGuildInputBox.style.display = 'none';
        addGuildBtn.style.display = editingGuilds.length >= 6 ? 'none' : 'block';
    });
}

if (newGuildInput) {
    newGuildInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (confirmAddGuildBtn) confirmAddGuildBtn.click();
        }
    });
}

// Init Guild Display
updateMainPageGuildDisplay();

// Profile State Management
let originalProfileState = {};
let draftProfileState = {};

async function initProfileModalState() {
    const user = auth.currentUser;
    if (user) {
        try {
            await user.reload();
            currentUserEmail = user.email;
            
            if (accountEmailDisplay) {
                const parts = user.email.split('@');
                const masked = `**************@${parts[1] || 'gmail.com'}`;
                if (toggleEmailView && toggleEmailView.textContent === t('hide')) {
                    accountEmailDisplay.value = currentUserEmail;
                } else {
                    accountEmailDisplay.value = masked;
                }
            }

            if (user.displayName) {
                 document.querySelector('.profile-name').textContent = user.displayName;
                 const userMenuName = document.getElementById('userMenuUsername');
                 if (userMenuName) userMenuName.textContent = user.displayName;
            }
        } catch (e) {
            console.error("Error reloading user:", e);
        }
    }

    const savedUsername = document.querySelector('.profile-name').textContent;
    const savedPic = localStorage.getItem('benchmark_profile_pic');
    const savedFlag = localStorage.getItem('benchmark_country_flag');
    const savedOriginalPic = localStorage.getItem('benchmark_profile_pic_original');
    let savedGuilds = [];
    try {
        savedGuilds = JSON.parse(localStorage.getItem('benchmark_guilds') || '[]');
    } catch (e) {}

    let savedCropState = null;
    try {
        const rawState = localStorage.getItem('benchmark_profile_pic_state');
        if (rawState) savedCropState = JSON.parse(rawState);
    } catch (e) {}

    originalProfileState = {
        username: savedUsername,
        pic: savedPic,
        flag: savedFlag,
        originalPic: savedOriginalPic,
        guilds: [...savedGuilds],
        cropState: savedCropState
    };

    draftProfileState = {
        username: savedUsername,
        pic: savedPic,
        flag: savedFlag,
        originalPic: savedOriginalPic,
        cropState: savedCropState ? { ...savedCropState } : null
    };
    editingGuilds = [...savedGuilds];
    editingGuildIndex = -1;

    // Update UI
    const usernameInput = document.getElementById('profileUsernameInput');
    if (usernameInput) usernameInput.value = draftProfileState.username;

    updateProfilePicPreview(draftProfileState.pic);
    updateFlagPreview(draftProfileState.flag);
    renderGuildsList();
    
    if (newGuildInputBox) newGuildInputBox.style.display = 'none';
    if (addGuildBtn) addGuildBtn.style.display = editingGuilds.length >= 6 ? 'none' : 'block';

    if (cropperContainer) cropperContainer.style.display = 'none';
    if (profilePicInput) profilePicInput.value = '';
    if (cropperImage) {
        cropperImage.removeAttribute('src');
        delete cropperImage.dataset.originalSrc;
    }

    updateProfileButtons();
    profileModal.classList.add('show');

    // Reset Scroll Position
    const content = document.querySelector('.profile-content');
    if (content) content.scrollTop = 0;
}

function cleanProfileData(draft, guilds) {
    const cleanGuilds = Array.isArray(guilds) ? guilds.filter(g => g && typeof g === 'string') : [];
    
    const profileData = {};
    
    // Only add fields that have actual values (not null/undefined)
    if (cleanGuilds.length > 0) {
        profileData.guilds = cleanGuilds;
    }
    
    if (draft.flag) {
        profileData.flag = draft.flag;
    }
    
    if (draft.pic) {
        profileData.pic = draft.pic;
    }
    
    if (draft.originalPic) {
        profileData.originalPic = draft.originalPic;
    }
    
    if (draft.cropState && typeof draft.cropState === 'object') {
        profileData.cropState = {
            x: Number(draft.cropState.x) || 0,
            y: Number(draft.cropState.y) || 0,
            scale: Number(draft.cropState.scale) || 1
        };
    }

    return profileData;
}

function updateProfilePicPreview(picUrl) {
    if (picUrl) {
        if (profilePreviewCircle) profilePreviewCircle.style.backgroundImage = `url(${picUrl})`;
        if (profilePreviewBox) profilePreviewBox.style.backgroundImage = `url(${picUrl})`;
        if (onboardingProfilePreviewCircle) onboardingProfilePreviewCircle.style.backgroundImage = `url(${picUrl})`;
        if (uploadProfilePicBtn) uploadProfilePicBtn.textContent = t('replace_image');
        if (onboardingUploadProfilePicBtn) onboardingUploadProfilePicBtn.textContent = t('replace_image');
        if (editProfilePicBtn) editProfilePicBtn.style.display = 'block';
        if (removeProfilePicBtn) removeProfilePicBtn.style.display = 'block';
        if (onboardingEditProfilePicBtn) onboardingEditProfilePicBtn.style.display = 'block';
        if (onboardingRemoveProfilePicBtn) onboardingRemoveProfilePicBtn.style.display = 'block';
    } else {
        if (profilePreviewCircle) profilePreviewCircle.style.backgroundImage = '';
        if (profilePreviewBox) profilePreviewBox.style.backgroundImage = '';
        if (onboardingProfilePreviewCircle) onboardingProfilePreviewCircle.style.backgroundImage = '';
        if (uploadProfilePicBtn) uploadProfilePicBtn.textContent = t('upload_image');
        if (onboardingUploadProfilePicBtn) onboardingUploadProfilePicBtn.textContent = t('upload_image');
        if (editProfilePicBtn) editProfilePicBtn.style.display = 'none';
        if (removeProfilePicBtn) removeProfilePicBtn.style.display = 'none';
        if (onboardingEditProfilePicBtn) onboardingEditProfilePicBtn.style.display = 'none';
        if (onboardingRemoveProfilePicBtn) onboardingRemoveProfilePicBtn.style.display = 'none';
    }
}

function updateFlagPreview(code) {
    if (flagSelectorBox) {
        if (code) {
            flagSelectorBox.textContent = '';
            flagSelectorBox.style.backgroundImage = `url(${getFlagUrl(code)})`;
            if (removeFlagBtn) removeFlagBtn.style.display = 'block';
            if (onboardingFlagSelectorBox) onboardingFlagSelectorBox.style.backgroundImage = `url(${getFlagUrl(code)})`;
        } else {
            flagSelectorBox.style.backgroundImage = '';
            if (removeFlagBtn) removeFlagBtn.style.display = 'none';
            if (onboardingFlagSelectorBox) onboardingFlagSelectorBox.style.backgroundImage = '';
        }
    }
}

function updateProfileButtons() {
    const saveBtn = document.getElementById('saveProfileBtn');
    const discardBtn = document.getElementById('discardProfileBtn');
    
    const guildsChanged = JSON.stringify(editingGuilds) !== JSON.stringify(originalProfileState.guilds);
    const usernameChanged = draftProfileState.username !== originalProfileState.username;
    const picChanged = draftProfileState.pic !== originalProfileState.pic;
    const flagChanged = draftProfileState.flag !== originalProfileState.flag;

    const hasChanges = guildsChanged || usernameChanged || picChanged || flagChanged;

    if (saveBtn) saveBtn.style.display = hasChanges ? 'block' : 'none';
    if (discardBtn) discardBtn.style.display = hasChanges ? 'block' : 'none';
}

const profileUsernameInput = document.getElementById('profileUsernameInput');
if (profileUsernameInput) {
    profileUsernameInput.addEventListener('input', (e) => {
        draftProfileState.username = e.target.value;
        updateProfileButtons();
    });
}

requestAnimationFrame(syncUserMenuDropdownWidth);

function hidePageLoader(options = {}) {
    const loader = document.getElementById('pageLoader');
    if (!loader) return;
    if (loader.style.display === 'none') return;

    const immediate = !!options.immediate;
    const minVisibleMs = Number.isFinite(options.minVisibleMs) ? Math.max(0, options.minVisibleMs) : PAGE_LOADER_MIN_VISIBLE_MS;
    const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    const elapsed = now - pageLoaderStartedAt;
    const delay = immediate ? 0 : Math.max(0, minVisibleMs - elapsed);

    if (pageLoaderHideTimeout) clearTimeout(pageLoaderHideTimeout);
    pageLoaderHideTimeout = setTimeout(() => {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                loader.style.opacity = '0';
                setTimeout(() => {
                    loader.style.display = 'none';
                }, 520);
            });
        });
    }, delay);
}

// Onboarding Logic
const onboardingModal = document.getElementById('onboardingModal');
const onboardingUsernameInput = document.getElementById('onboardingUsernameInput');
const onboardingUploadProfilePicBtn = document.getElementById('onboardingUploadProfilePicBtn');
const onboardingEditProfilePicBtn = document.getElementById('onboardingEditProfilePicBtn');
const onboardingRemoveProfilePicBtn = document.getElementById('onboardingRemoveProfilePicBtn');
const onboardingNewGuildInput = document.getElementById('onboardingNewGuildInput');
const onboardingAddGuildBtn = document.getElementById('onboardingAddGuildBtn');
const saveOnboardingBtn = document.getElementById('saveOnboardingBtn');

function initOnboarding() {
    if (!onboardingModal) return;
    
    // Initialize state
    draftProfileState = {
        username: '',
        pic: null,
        flag: null,
        originalPic: null,
        cropState: null
    };
    editingGuilds = [];
    
    // Update UI
    if (onboardingUsernameInput) onboardingUsernameInput.value = '';
    updateProfilePicPreview(null);
    updateFlagPreview(null);
    renderGuildsList();
    
    onboardingModal.classList.add('show');
}

if (onboardingUploadProfilePicBtn && profilePicInput) {
    onboardingUploadProfilePicBtn.addEventListener('click', () => profilePicInput.click());
}

if (onboardingEditProfilePicBtn) {
    onboardingEditProfilePicBtn.addEventListener('click', () => {
        let srcToLoad = cropperImage.getAttribute('src');
        
        if (!srcToLoad) {
            const storedOriginal = localStorage.getItem('benchmark_profile_pic_original');
            if (storedOriginal) {
                srcToLoad = storedOriginal;
            } else if (draftProfileState && draftProfileState.pic) {
                srcToLoad = draftProfileState.pic;
            }
        }

        if (srcToLoad) {
            cropperImage.onload = () => {
                cropperContainer.style.display = 'block';
                if (draftProfileState && draftProfileState.cropState && draftProfileState.cropState.scale) {
                    cropperState = { ...draftProfileState.cropState };
                } else {
                    cropperState = { x: 0, y: 0, scale: 1 };
                }
                cropperZoom.value = cropperState.scale;
                updateCropperTransform();
                cropperImage.onload = null;
            };
            cropperImage.src = srcToLoad;
            cropperImage.dataset.originalSrc = srcToLoad;
        }
    });
}

if (onboardingRemoveProfilePicBtn) {
    onboardingRemoveProfilePicBtn.addEventListener('click', () => {
        draftProfileState.pic = null;
        draftProfileState.originalPic = null;
        draftProfileState.cropState = null;
        updateProfilePicPreview(null);
    });
}

if (onboardingUsernameInput) {
    onboardingUsernameInput.addEventListener('input', (e) => {
        draftProfileState.username = e.target.value;
    });
}

if (onboardingAddGuildBtn && onboardingNewGuildInput) {
    onboardingAddGuildBtn.addEventListener('click', () => {
        const val = onboardingNewGuildInput.value.trim();
        if (val && editingGuilds.length < 6) {
            editingGuilds.push(val);
            onboardingNewGuildInput.value = '';
            renderGuildsList();
        }
    });
    onboardingNewGuildInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') onboardingAddGuildBtn.click();
    });
}

if (saveOnboardingBtn) {
    saveOnboardingBtn.addEventListener('click', async () => {
        const username = onboardingUsernameInput.value.trim();
        if (!username) {
            alert(t('onboarding_username_required'));
            return;
        }
        
        const user = auth.currentUser;
        if (!user) return;

        saveOnboardingBtn.disabled = true;
        saveOnboardingBtn.textContent = t('onboarding_saving');

        try {
            await updateProfile(user, { displayName: username });
            document.querySelector('.profile-name').textContent = username;
            const userMenuName = document.getElementById('userMenuUsername');
            if (userMenuName) userMenuName.textContent = username;

            try {
                if (draftProfileState.pic) localStorage.setItem('benchmark_profile_pic', draftProfileState.pic);
                if (draftProfileState.flag) localStorage.setItem('benchmark_country_flag', draftProfileState.flag);
                if (draftProfileState.originalPic) localStorage.setItem('benchmark_profile_pic_original', draftProfileState.originalPic);
                if (draftProfileState.cropState) localStorage.setItem('benchmark_profile_pic_state', JSON.stringify(draftProfileState.cropState));
                localStorage.setItem('benchmark_guilds', JSON.stringify(editingGuilds));
            } catch (storageError) {
                console.warn("Failed to save to localStorage:", storageError);
            }

            updateMainPageGuildDisplay();
            updateMainHeaderLayout();

            const profileData = cleanProfileData(draftProfileState, editingGuilds);
            const accountIdForSlug = getRuntimeAccountId();
            const publicSlug = buildProfileSlug(username, accountIdForSlug, user.uid);

            await setDoc(doc(db, 'users', user.uid), {
                username: username,
                profile: profileData,
                publicSlug,
                isNewUser: false // Mark as done
            }, { merge: true });

            onboardingModal.classList.remove('show');
            
            // Sync original state
            originalProfileState = {
                username: username,
                pic: draftProfileState.pic,
                flag: draftProfileState.flag,
                originalPic: draftProfileState.originalPic,
                guilds: [...editingGuilds],
                cropState: draftProfileState.cropState
            };

        } catch (e) {
            console.error("Error saving onboarding:", e);
            alert(t('onboarding_error_prefix') + e.message);
        } finally {
            saveOnboardingBtn.disabled = false;
            saveOnboardingBtn.textContent = t('onboarding_save_continue');
        }
    });
}

function loadPacmanSetting() {
    pacmanModeEnabled = localStorage.getItem(PACMAN_STORAGE_KEY) === 'true';
}

async function savePacmanSetting() {
    if (isViewMode) return;
    localStorage.setItem(PACMAN_STORAGE_KEY, pacmanModeEnabled ? 'true' : 'false');
    await saveSettings();
}

function syncPacmanUI() {
    const select = document.getElementById('pacmanModeSelect');
    if (select) {
        select.value = pacmanModeEnabled ? 'on' : 'off';
    }
    updateRadar();
}

function injectPacmanSettingUI() {
    const settingsGrid = document.querySelector('#settingsModal .settings-grid');
    if (!settingsGrid || document.getElementById('pacmanModeCard')) return;

    const card = document.createElement('div');
    card.className = 'settings-card';
    card.id = 'pacmanModeCard';
    card.innerHTML = `
        <div class="settings-card-title" data-i18n="settings_pacman">Pacman</div>
        <div class="settings-field">
            <select id="pacmanModeSelect" class="settings-select">
                <option value="off" data-i18n="settings_toggle_off">Off</option>
                <option value="on" data-i18n="settings_toggle_on">On</option>
            </select>
        </div>
    `;

    // Insert before the last card or append
    settingsGrid.appendChild(card);

    const select = card.querySelector('#pacmanModeSelect');
    select.value = pacmanModeEnabled ? 'on' : 'off';
    select.addEventListener('change', (e) => {
        pacmanModeEnabled = e.target.value === 'on';
        savePacmanSetting();
        updateRadar();
    });
    
    // Re-apply language to new elements
    applyLanguage(currentLanguage, false);
}

function restructureHighlightsLayout() {
    const box = document.querySelector('.highlights-box');
    if (!box) return;
    const header = box.querySelector('.highlights-header');
    const grid = document.getElementById('highlightsGrid');
    
    // If already restructured or missing elements, skip
    if (!header || !grid || box.querySelector('.highlights-inner')) return;

    const inner = document.createElement('div');
    inner.className = 'highlights-inner';
    
    // Move header and grid into inner
    // We use appendChild which moves the element if it's already in DOM
    inner.appendChild(header);
    inner.appendChild(grid);
    
    // Append inner to box
    box.appendChild(inner);
}

function setupVerticalBoxClasses() {
    const boxes = document.querySelectorAll('.vertical-box');
    if (boxes.length > 0) boxes[0].classList.add('vbox-1');
    if (boxes.length > 1) boxes[1].classList.add('vbox-2');
}

function setupRatingValueClasses() {
    const divs = document.querySelectorAll('.rating-value');
    divs.forEach((div, index) => {
        div.classList.add(`rating-value-${index}`);
    });
}

function restructureRatingsLayout() {
    if (window.innerWidth > 900) return;
    const rows = document.querySelectorAll('.ranks-bars');
    const ratings = document.querySelectorAll('.rating-value');
    
    const groups = [
        [0, 1], [2, 3], [4, 5], [6], [7, 8], [9, 10], [11, 12], [13]
    ];
    
    groups.forEach((group, index) => {
        const ratingEl = ratings[index];
        const firstRowIndex = group[0];
        const row = rows[firstRowIndex];
        if (ratingEl && row) {
            row.appendChild(ratingEl);
        }
    });
}

// Call restructure on init
document.addEventListener('DOMContentLoaded', () => {
    restructureHighlightsLayout();
    
    try {
        const saved = localStorage.getItem('benchmark_achievements');
        if (saved) userAchievements = JSON.parse(saved);
    } catch (e) {}
    updateAchievementsProgress();
    setupVerticalBoxClasses();
    setupRatingValueClasses();
    restructureRatingsLayout();
});
