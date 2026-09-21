export function getBenchmarkBasePath() {
    const pathname = window.location.pathname || '';
    const lower = pathname.toLowerCase();
    const marker = '/bkbenchmark';
    const markerIndex = lower.indexOf(marker);
    if (markerIndex >= 0) {
        return pathname.slice(0, markerIndex + marker.length) || '/bkbenchmark';
    }
    const fallback = pathname.replace(/\/[^/]*$/, '');
    return fallback || '/bkbenchmark';
}

export function normalizeFriendRequestIds(rawRequests) {
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
        }
    };

    if (Array.isArray(rawRequests)) {
        rawRequests.forEach(pushId);
    } else if (rawRequests && typeof rawRequests === 'object') {
        Object.keys(rawRequests).forEach(pushId);
    }

    return normalized;
}

export function isMobileViewport() {
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
    const screenObj = window.screen || {};
    if (viewportWidth <= 900) return true;
    if (viewportWidth >= 1000) return false;
    const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches || Number(navigator.maxTouchPoints || 0) > 0;
    const screenWidth = Math.min(screenObj.width || 0, screenObj.height || 0);
    return !!(isCoarsePointer && screenWidth > 0 && screenWidth <= 900);
}

export function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function getFlagUrl(code) {
    const normalized = String(code || "").toLowerCase();
    if (normalized === "hmn") {
        return "https://upload.wikimedia.org/wikipedia/commons/2/27/Hmong_flag.svg";
    }
    return `https://flagcdn.com/w80/${normalized}.png`;
}
