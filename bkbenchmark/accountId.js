import { getRuntimeAccountId, setRuntimeAccountId } from "./appState.js";
import { t } from "./i18n.js";
import { readJson, writeJson, ACCOUNT_ID_MAP_STORAGE_KEY } from "./storage.js";

export const MASKED_ACCOUNT_ID = "**************";
const COPY_SUCCESS_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="#4caf50"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';

const DOM_ID_CACHE = new Map();
let accountIdUiBound = false;

function getCachedElementById(id) {
    const cached = DOM_ID_CACHE.get(id);
    if (cached && cached.isConnected) return cached;
    const resolved = document.getElementById(id);
    if (resolved) DOM_ID_CACHE.set(id, resolved);
    return resolved;
}

function readAccountIdMap() {
    const parsed = readJson(ACCOUNT_ID_MAP_STORAGE_KEY, {});
    return parsed && typeof parsed === "object" ? parsed : {};
}

function writeAccountIdMap(map) {
    writeJson(ACCOUNT_ID_MAP_STORAGE_KEY, map || {});
}

export function getRememberedAccountIdForUid(uid) {
    const key = (uid || "").toString().trim();
    if (!key) return "";
    const map = readAccountIdMap();
    const value = map[key];
    return typeof value === "string" ? value.trim() : "";
}

export function rememberAccountIdForUid(uid, accountId) {
    const key = (uid || "").toString().trim();
    const value = (accountId || "").toString().trim();
    if (!key || !value) return;
    const map = readAccountIdMap();
    if (map[key] === value) return;
    map[key] = value;
    writeAccountIdMap(map);
}

export function generateAccountId() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 12; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

export function updateAccountIdUI(accountId) {
    const input = getCachedElementById("accountIdDisplay");
    const toggleBtn = getCachedElementById("toggleAccountIdView");
    if (!input) return;
    input.dataset.realValue = accountId || "";
    input.value = toggleBtn && toggleBtn.textContent === t("hide")
        ? (accountId || "")
        : MASKED_ACCOUNT_ID;
}

export function updateFriendPageAccountId(accountId) {
    const input = getCachedElementById("friendPageAccountIdDisplay");
    if (!input) return;
    input.dataset.realValue = accountId || "";
    input.value = MASKED_ACCOUNT_ID;
    const toggleBtn = getCachedElementById("friendPageToggleAccountIdView");
    if (toggleBtn) toggleBtn.textContent = t("show");
}

export function applyActiveAccountId(accountId) {
    const resolved = (accountId || "").toString().trim();
    if (!resolved) return "";
    setRuntimeAccountId(resolved);
    updateAccountIdUI(resolved);
    updateFriendPageAccountId(resolved);
    return resolved;
}

export function resetAccountIdVisibility() {
    const input = getCachedElementById("accountIdDisplay");
    if (input) input.value = MASKED_ACCOUNT_ID;
    const toggleBtn = getCachedElementById("toggleAccountIdView");
    if (toggleBtn) toggleBtn.textContent = t("show");
}

export function resetFriendAccountIdVisibility() {
    const input = getCachedElementById("friendPageAccountIdDisplay");
    if (input) input.value = MASKED_ACCOUNT_ID;
    const toggleBtn = getCachedElementById("friendPageToggleAccountIdView");
    if (toggleBtn) toggleBtn.textContent = t("show");
}

function toggleMaskedField(input, toggleBtn) {
    if (!input || !toggleBtn) return;
    const realId = input.dataset.realValue || "";
    if (!realId) return;
    const isMasked = input.value === MASKED_ACCOUNT_ID;
    input.value = isMasked ? realId : MASKED_ACCOUNT_ID;
    toggleBtn.textContent = isMasked ? t("hide") : t("show");
}

async function copyText(text) {
    if (!text) return false;
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const copied = document.execCommand("copy");
        document.body.removeChild(textArea);
        return copied;
    }
}

async function copyFromDataset(input, button) {
    if (!input || !button) return;
    const accountId = input.dataset.realValue || "";
    if (!accountId) return;
    const success = await copyText(accountId);
    if (!success) return;
    const originalHTML = button.innerHTML;
    button.innerHTML = COPY_SUCCESS_ICON;
    setTimeout(() => {
        button.innerHTML = originalHTML;
    }, 1500);
}

export function setupAccountIdUI() {
    if (accountIdUiBound) return;

    const bind = () => {
        if (accountIdUiBound) return;
        accountIdUiBound = true;

        const accountInput = getCachedElementById("accountIdDisplay");
        const accountToggle = getCachedElementById("toggleAccountIdView");
        if (accountInput && accountToggle) {
            accountToggle.addEventListener("click", () => {
                toggleMaskedField(accountInput, accountToggle);
            });
        }

        const friendInput = getCachedElementById("friendPageAccountIdDisplay");
        const friendToggle = getCachedElementById("friendPageToggleAccountIdView");
        if (friendInput && friendToggle) {
            friendToggle.addEventListener("click", () => {
                toggleMaskedField(friendInput, friendToggle);
            });
        }

        const copyAccountIdBtn = getCachedElementById("copyAccountIdBtn");
        if (copyAccountIdBtn) {
            copyAccountIdBtn.addEventListener("click", async () => {
                await copyFromDataset(accountInput, copyAccountIdBtn);
            });
        }

        const friendCopyBtn = getCachedElementById("friendPageCopyAccountIdBtn");
        if (friendCopyBtn) {
            friendCopyBtn.addEventListener("click", async () => {
                await copyFromDataset(friendInput, friendCopyBtn);
            });
        }
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", bind, { once: true });
        return;
    }
    bind();
}

export function initAccountId() {
    const existing = getRuntimeAccountId();
    if (existing) {
        updateAccountIdUI(existing);
        return existing;
    }
    const generated = generateAccountId();
    setRuntimeAccountId(generated);
    updateAccountIdUI(generated);
    return generated;
}
