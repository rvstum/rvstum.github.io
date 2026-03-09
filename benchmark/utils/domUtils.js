const DOM_ID_CACHE = new Map();
const DOM_QUERY_CACHE = new Map();

export function getCachedElementById(id) {
    const cached = DOM_ID_CACHE.get(id);
    if (cached && cached.isConnected) return cached;
    const resolved = document.getElementById(id);
    if (resolved) DOM_ID_CACHE.set(id, resolved);
    return resolved;
}

export function getCachedQuery(key, resolver) {
    const cached = DOM_QUERY_CACHE.get(key);
    if (cached && cached.isConnected) return cached;
    const resolved = typeof resolver === "function" ? resolver() : null;
    if (resolved) DOM_QUERY_CACHE.set(key, resolved);
    return resolved;
}

export function clearDomCaches() {
    DOM_ID_CACHE.clear();
    DOM_QUERY_CACHE.clear();
}

export function setHidden(el, hidden) {
    if (!el) return;
    const shouldHide = !!hidden;
    el.classList.toggle("is-hidden", shouldHide);
    if (!shouldHide) {
        // Many elements start with static hidden classes in HTML. Remove them when explicitly shown.
        el.classList.remove("hidden-default");
        el.classList.remove("initially-hidden");
    }
}

export function setFlexVisible(el, visible) {
    if (!el) return;
    setHidden(el, !visible);
    el.classList.toggle("is-flex", !!visible);
}
