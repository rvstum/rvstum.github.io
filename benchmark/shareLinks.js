import { auth } from "./client.js";
import { state, getRuntimeAccountId } from "./appState.js";
import { getBenchmarkBasePath } from "./utils.js";
import { getCurrentConfig } from "./configManager.js";
import * as ScoreManager from "./scoreManager.js?v=20260310-score-load-fix-17";
import * as Slugs from "./slugs.js?v=20260310-public-slug-directory-1";
import * as UserService from "./userService.js?v=20260310-public-slug-directory-1";

const shareLinkDeps = {
    applyConfig: null
};

function readCurrentPageAccountId() {
    const accountInput = document.getElementById("accountIdDisplay");
    const fromDataset = accountInput && accountInput.dataset
        ? (accountInput.dataset.realValue || "").trim()
        : "";
    return fromDataset || getRuntimeAccountId();
}

export function configureShareLinks(deps = {}) {
    if (!deps || typeof deps !== "object") return;
    if (Object.prototype.hasOwnProperty.call(deps, "applyConfig")) {
        shareLinkDeps.applyConfig = typeof deps.applyConfig === "function" ? deps.applyConfig : null;
    }
}

export function buildShareUrl() {
    const current = getCurrentConfig();
    const scores = ScoreManager.getScoresArray();
    const params = new URLSearchParams();
    params.set("platform", current.platform);
    params.set("time", current.time);
    params.set("stat", current.stat);
    params.set("mount", current.mount);
    params.set("scores", scores.join(","));
    const url = new URL(window.location.href);
    url.hash = params.toString();
    return url.toString();
}

export function buildCopyLinkUrl() {
    const user = auth.currentUser;
    const context = state.isViewMode && state.activeViewProfileContext ? state.activeViewProfileContext : null;
    const usernameEl = document.querySelector(".profile-name");
    const username = context
        ? (context.username || "player")
        : (usernameEl ? usernameEl.textContent : "player");
    const accountId = context
        ? (context.accountId || "")
        : readCurrentPageAccountId();
    const fallbackId = context
        ? (context.uid || "")
        : (user ? user.uid : "");
    const slug = context && context.publicSlug
        ? context.publicSlug
        : Slugs.buildProfileSlug(username, accountId, fallbackId);
    const url = new URL(window.location.href);
    if (Slugs.isLocalDevRoutingEnv()) {
        url.pathname = `${getBenchmarkBasePath()}/benchmark.html`;
        url.search = "";
        const targetId = context ? (context.uid || "") : (user ? user.uid : "");
        if (targetId) {
            url.searchParams.set("id", targetId);
        } else {
            url.searchParams.delete("id");
        }
    } else {
        url.pathname = Slugs.buildViewModePathFromSlug(slug);
        url.search = "";
    }
    url.hash = "";
    return url.toString();
}

export function applyShareFromUrl() {
    if (!window.location.hash || window.location.hash.length < 2) return;
    const params = new URLSearchParams(window.location.hash.slice(1));
    if (![...params.keys()].length) return;
    const platform = params.get("platform");
    const time = params.get("time");
    const stat = params.get("stat");
    const mount = params.get("mount");
    const scoresRaw = params.get("scores");
    const current = getCurrentConfig();
    const nextConfig = {
        platform: platform || current.platform,
        time: time || current.time,
        stat: stat || current.stat,
        mount: mount || current.mount
    };
    if (typeof shareLinkDeps.applyConfig === "function") {
        shareLinkDeps.applyConfig(nextConfig, { animateRowTransition: true });
    }
    if (scoresRaw) {
        const scores = scoresRaw.split(",").map((val) => {
            const num = Number(val);
            return Number.isFinite(num) && num >= 0 ? Math.round(num) : 0;
        });
        ScoreManager.setScoresFromArray(scores);
    }
}

async function syncCurrentUserPublicSlug(link) {
    const user = auth.currentUser;
    if (!user) return;
    const context = state.isViewMode && state.activeViewProfileContext ? state.activeViewProfileContext : null;
    if (context && context.uid && context.uid !== user.uid) return;
    const parts = new URL(link).pathname.split("/").filter(Boolean);
    const slug = parts.length
        ? (parts[parts.length - 1].toLowerCase() === "view-mode"
            ? (parts[parts.length - 2] || "")
            : parts[parts.length - 1])
        : "";
    if (!slug) return;
    const lower = slug.toLowerCase();
    if (lower === "benchmark.html" || lower === "index.html") return;
    await UserService.updateUserData(user.uid, { publicSlug: slug });
}

export async function copyBenchmarkLinkToClipboard() {
    const link = buildCopyLinkUrl();
    try {
        await syncCurrentUserPublicSlug(link);
    } catch (slugSaveErr) {
        console.warn("Unable to sync public slug before copy:", slugSaveErr);
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(link);
    } else {
        const temp = document.createElement("textarea");
        temp.value = link;
        temp.setAttribute("readonly", "true");
        temp.style.position = "absolute";
        temp.style.left = "-9999px";
        document.body.appendChild(temp);
        temp.select();
        document.execCommand("copy");
        document.body.removeChild(temp);
    }
    return link;
}
