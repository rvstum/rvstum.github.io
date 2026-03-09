import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./client.js";
import { getBenchmarkBasePath } from "./utils.js";
import { getRuntimeAccountId } from "./appState.js";

export function slugifyProfileSegment(value) {
    const raw = (value || '').toString().trim().toLowerCase();
    const slug = raw
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return slug || 'player';
}

export function getAccountIdTail(accountId) {
    const clean = (accountId || '')
        .toString()
        .trim()
        .replace(/[^a-zA-Z0-9]/g, '');
    if (!clean) return '0000';
    return clean.slice(-4).toLowerCase();
}

export function buildProfileSlug(username, accountId, fallbackId = '') {
    const namePart = slugifyProfileSegment(username || 'player');
    const tailSource = accountId || fallbackId || '';
    const tail = getAccountIdTail(tailSource);
    return `${namePart}-${tail}`;
}

export function isLocalDevRoutingEnv() {
    const host = (window.location.hostname || '').toLowerCase();
    if (window.location.protocol === 'file:') return true;
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '0.0.0.0') return true;
    if (host.endsWith('.local') || host.endsWith('.lan')) return true;
    const privateV4 = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/;
    if (privateV4.test(host)) return true;
    return false;
}

export function restorePathFromFallback() {
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
        // Ignore malformed restore parameters
    }
}

export function getBenchmarkLoginUrl() {
    return `${getBenchmarkBasePath()}/`;
}

export function getBenchmarkAppEntryUrl() {
    if (isLocalDevRoutingEnv()) return `${getBenchmarkBasePath()}/benchmark.html`;
    return `${getBenchmarkBasePath()}/`;
}

export function getRequestedProfileSlugFromPath() {
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

export function updateOwnProfileUrl(user, data) {
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
    const targetPath = `${getBenchmarkBasePath()}/`;
    const currentPath = (window.location.pathname || '').replace(/\/+$/, '');
    if (currentPath !== targetPath) {
        window.history.replaceState({}, '', `${window.location.search}${window.location.hash}`);
    }
}

export function forceOwnSlugUrlFromAvailableData(user, data = null) {
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

export function updateViewProfileUrl(data, uid) {
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
    const targetPath = `${getBenchmarkBasePath()}/`;
    const currentPath = (window.location.pathname || '').replace(/\/+$/, '');
    if (currentPath !== targetPath) {
        window.history.replaceState({}, '', targetPath);
    }
}

export function hasRequestedProfileRoute() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('id')) return true;
    return !!getRequestedProfileSlugFromPath();
}

export async function resolveProfileDocBySlug(slug, signedInViewer) {
    if (!slug) return null;
    const trimmedSlug = String(slug).trim();
    if (!trimmedSlug) return null;

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
    } catch (e) {
        console.warn('publicSlug query failed:', e);
    }

    if (!signedInViewer) return null;
    return null;
}
