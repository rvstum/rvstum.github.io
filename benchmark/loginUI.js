import {
    signInWithEmailAndPassword,
    setPersistence,
    browserSessionPersistence,
    browserLocalPersistence,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db } from "./client.js";
import { getBenchmarkBasePath } from "./utils.js";
import { alignMobileTitleBetweenTopAndBox } from "./authLayout.js?v=20260310-auth-mobile-stability-1";
import * as Slugs from "./slugs.js";
import { getRememberedAccountIdForUid } from "./accountId.js";
import {
    readString,
    LANGUAGE_STORAGE_KEY,
    REDIRECT_GUARD_FLAG_KEY,
    REDIRECT_LOAD_GUARD_KEY,
    LOGIN_REDIRECT_LOOP_COUNT_KEY,
    LOGIN_REDIRECT_LOOP_AT_KEY,
    LOGIN_REDIRECT_TARGET_KEY,
    LOGIN_REDIRECT_AT_KEY
} from "./storage.js";

function normalizeLoginPath() {
    const lowerPath = (window.location.pathname || "").toLowerCase();
    if (lowerPath.endsWith("/login.html") || lowerPath.endsWith("/benchmark/index.html")) {
        window.history.replaceState({}, "", `${getBenchmarkBasePath()}/`);
    }
}

async function resolveSignedInUrl(user) {
    if (!user) return `${getBenchmarkBasePath()}/`;
    const rememberedAccountId = getRememberedAccountIdForUid(user.uid);
    let userData = null;
    try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            userData = userDoc.data() || {};
        }
    } catch (e) {
        console.warn("Failed to resolve signed-in profile URL, using fallback.", e);
    }
    if (Slugs.isLocalDevRoutingEnv()) {
        return `${getBenchmarkBasePath()}/benchmark.html`;
    }
    const explicitSlug = userData && typeof userData.publicSlug === "string"
        ? userData.publicSlug.trim()
        : "";
    const resolvedAccountId = Slugs.resolveProfileAccountId(userData || {}, rememberedAccountId);
    if (!explicitSlug && !resolvedAccountId) {
        return `${getBenchmarkBasePath()}/benchmark.html`;
    }
    const slug = explicitSlug || Slugs.resolveProfileSlug(userData || {}, {
        usernameFallback: user.displayName || "player",
        accountIdFallback: resolvedAccountId,
        uid: user.uid
    });
    const restoreTarget = `${getBenchmarkBasePath()}/${slug}`;
    return `${getBenchmarkBasePath()}/benchmark.html?__restore=${encodeURIComponent(restoreTarget)}`;
}

function getCurrentPathWithSearch() {
    return `${window.location.pathname}${window.location.search}`;
}

function shouldDisableAutoNav() {
    try {
        const params = new URLSearchParams(window.location.search || "");
        if (params.get("pause_nav") === "1") return true;
        return sessionStorage.getItem(REDIRECT_GUARD_FLAG_KEY) === "1";
    } catch (e) {
        return false;
    }
}

function registerAutoNavLoad() {
    try {
        const now = Date.now();
        const raw = sessionStorage.getItem(REDIRECT_LOAD_GUARD_KEY);
        let state = raw ? JSON.parse(raw) : { count: 0, ts: 0 };
        if (!state || typeof state !== "object") state = { count: 0, ts: 0 };
        if (now - Number(state.ts || 0) <= 12000) {
            state.count = Number(state.count || 0) + 1;
        } else {
            state.count = 1;
        }
        state.ts = now;
        sessionStorage.setItem(REDIRECT_LOAD_GUARD_KEY, JSON.stringify(state));
        if (state.count >= 4) {
            sessionStorage.setItem(REDIRECT_GUARD_FLAG_KEY, "1");
        }
    } catch (e) {
        // ignore guard storage errors
    }
}

function isCanonicalLoginPath(pathValue) {
    const lower = (pathValue || "").toLowerCase();
    const base = getBenchmarkBasePath().toLowerCase();
    return (
        lower === base
        || lower === `${base}/`
        || lower === `${base}/index.html`
        || lower === `${base}/login.html`
    );
}

function normalizePath(path) {
    return (path || "").replace(/\/+$/, "") || "/";
}

async function navigateAfterLogin(user) {
    if (shouldDisableAutoNav()) return;
    const now = Date.now();
    const loopWindowMs = 15000;
    const prevAt = Number(sessionStorage.getItem(LOGIN_REDIRECT_LOOP_AT_KEY) || "0");
    const prevCount = Number(sessionStorage.getItem(LOGIN_REDIRECT_LOOP_COUNT_KEY) || "0");
    const count = (now - prevAt <= loopWindowMs) ? (prevCount + 1) : 1;
    sessionStorage.setItem(LOGIN_REDIRECT_LOOP_COUNT_KEY, String(count));
    sessionStorage.setItem(LOGIN_REDIRECT_LOOP_AT_KEY, String(now));
    if (count > 2) return;

    const target = await resolveSignedInUrl(user);
    const targetUrl = new URL(target, window.location.origin);
    const currentPathname = window.location.pathname || "";
    const currentPath = normalizePath(getCurrentPathWithSearch());
    const targetPath = normalizePath(`${targetUrl.pathname}${targetUrl.search}`);

    // If login HTML is being served on a slug/non-login path, force boot via benchmark.html.
    // This prevents auth redirect loops when hosting fallback serves the wrong document.
    if (!isCanonicalLoginPath(currentPathname)) {
        const directTargetPath = normalizePath(`${targetUrl.pathname}${targetUrl.search}`);
        if (currentPath !== directTargetPath) {
            window.location.replace(targetUrl.toString());
        }
        return;
    }

    if (currentPath === targetPath) return;

    const lastTarget = sessionStorage.getItem(LOGIN_REDIRECT_TARGET_KEY) || "";
    const lastAt = Number(sessionStorage.getItem(LOGIN_REDIRECT_AT_KEY) || "0");
    if (lastTarget === targetPath && now - lastAt < 4000) return;
    sessionStorage.setItem(LOGIN_REDIRECT_TARGET_KEY, targetPath);
    sessionStorage.setItem(LOGIN_REDIRECT_AT_KEY, String(now));
    window.location.replace(targetUrl.toString());
}

function animatePress(element) {
    if (!element) return;
    element.classList.remove("is-clicking");
    void element.offsetWidth;
    element.classList.add("is-clicking");
    setTimeout(() => element.classList.remove("is-clicking"), 220);
}

function tAuth(key) {
    return window.authT ? window.authT(key) : key;
}

function clearLoginRedirectGuards() {
    try {
        sessionStorage.removeItem(REDIRECT_GUARD_FLAG_KEY);
        sessionStorage.removeItem(REDIRECT_LOAD_GUARD_KEY);
        sessionStorage.removeItem(LOGIN_REDIRECT_LOOP_COUNT_KEY);
        sessionStorage.removeItem(LOGIN_REDIRECT_LOOP_AT_KEY);
        sessionStorage.removeItem(LOGIN_REDIRECT_TARGET_KEY);
        sessionStorage.removeItem(LOGIN_REDIRECT_AT_KEY);
    } catch (e) {
        // ignore storage availability errors
    }
}

export function initLoginUI() {
    normalizeLoginPath();
    registerAutoNavLoad();

    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const rememberMeCheckbox = document.getElementById("rememberMe");
    const loginBtn = document.getElementById("loginBtn");
    const forgotPasswordLink = document.getElementById("forgotPasswordLink");
    const signUpLink = document.getElementById("signUpLink");
    const errorMessage = document.getElementById("error-message");

    if (!emailInput || !passwordInput || !rememberMeCheckbox || !loginBtn || !errorMessage) return;

    const handleLogin = () => {
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const rememberMe = rememberMeCheckbox.checked;
        errorMessage.textContent = "";

        if (!email || !password) {
            errorMessage.textContent = tAuth("err_login_missing");
            return;
        }

        clearLoginRedirectGuards();
        const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;

        setPersistence(auth, persistence)
            .then(() => signInWithEmailAndPassword(auth, email, password))
            .then(async (userCredential) => {
                if (!userCredential.user.emailVerified) {
                    await navigateAfterLogin(userCredential.user);
                    return;
                }

                const savedLang = readString(LANGUAGE_STORAGE_KEY, "en");
                setDoc(doc(db, "users", userCredential.user.uid), {
                    settings: { language: savedLang }
                }, { merge: true }).catch((e) => {
                    console.error("Error saving language preference:", e);
                });
                await navigateAfterLogin(userCredential.user);
            })
            .catch((error) => {
                const code = (error && error.code) ? String(error.code) : "";
                console.error("Login failed:", error);
                if (error && error.code === "auth/invalid-email") {
                    errorMessage.textContent = tAuth("err_invalid_email");
                } else if (error && error.code === "auth/too-many-requests") {
                    errorMessage.textContent = tAuth("err_too_many_requests");
                } else if (
                    code === "auth/invalid-credential"
                    || code === "auth/wrong-password"
                    || code === "auth/user-not-found"
                ) {
                    errorMessage.textContent = tAuth("err_login_invalid");
                } else {
                    errorMessage.textContent = `${tAuth("err_unknown")} (${code || "no-code"})`;
                }
            });
    };

    [loginBtn, forgotPasswordLink, signUpLink].forEach((element) => {
        if (!element) return;
        element.addEventListener("pointerdown", () => animatePress(element));
        element.addEventListener("keydown", (event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            animatePress(element);
        });
    });

    loginBtn.addEventListener("click", () => {
        handleLogin();
    });
    [emailInput, passwordInput].forEach((inputEl) => {
        if (!inputEl) return;
        inputEl.addEventListener("keydown", (event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            animatePress(loginBtn);
            handleLogin();
        });
    });

    if (window.initAuthLanguage) window.initAuthLanguage("login");

    window.addEventListener("resize", alignMobileTitleBetweenTopAndBox);
    window.addEventListener("orientationchange", alignMobileTitleBetweenTopAndBox);
    requestAnimationFrame(() => {
        alignMobileTitleBetweenTopAndBox();
    });

    onAuthStateChanged(auth, async (user) => {
        if (!user) return;
        if (!user.emailVerified) return;
        if (!isCanonicalLoginPath(window.location.pathname || "")) return;
        await navigateAfterLogin(user);
    });
}

initLoginUI();
