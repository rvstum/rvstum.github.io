import {
    signInWithEmailAndPassword,
    setPersistence,
    browserSessionPersistence,
    browserLocalPersistence,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db } from "./client.js";
import { getBenchmarkBasePath } from "./utils.js";
import { alignMobileTitleBetweenTopAndBox } from "./authLayout.js?v=20260310-auth-mobile-stability-1";
import {
    readString,
    LANGUAGE_STORAGE_KEY
} from "./storage.js";

const LOGIN_AUTO_RESTORE_TARGET_SESSION_KEY = "__benchmark_login_auto_restore_target__";
const LOGIN_AUTH_BOOTSTRAP_SESSION_KEY = "__benchmark_login_auth_boot__";
const LOGIN_AUTH_BOOTSTRAP_WINDOW_MS = 15000;
const LOGIN_BOOT_WINDOW_SESSION_KEY = "__benchmark_login_boot_window__";
const LOGIN_BOOT_WINDOW_MS = 45000;
let authNavigationInFlight = false;

function normalizeLoginPath() {
    const lowerPath = (window.location.pathname || "").toLowerCase();
    if (lowerPath.endsWith("/login.html") || lowerPath.endsWith("/benchmark/index.html")) {
        window.history.replaceState({}, "", `${getBenchmarkBasePath()}/`);
    }
}

function shouldUseDelayedHardBoot(source = "") {
    const normalizedSource = typeof source === "string" ? source.trim().toLowerCase() : "";
    if (normalizedSource !== "remembered-session") return false;
    try {
        if (window.matchMedia && window.matchMedia("(max-width: 980px)").matches) {
            return true;
        }
    } catch (e) {
        // ignore viewport detection issues and fall back to user agent detection
    }
    const userAgent = typeof navigator !== "undefined" ? String(navigator.userAgent || "") : "";
    return /android|iphone|ipad|ipod|mobile/i.test(userAgent);
}

function resolveSignedInUrl(options = {}) {
    const url = new URL(`${getBenchmarkBasePath()}/benchmark.html`, window.location.origin);
    if (shouldUseDelayedHardBoot(options.source)) {
        url.searchParams.set("__delayed_hard_boot", "1");
    }
    return url.toString();
}

function getCurrentPathWithSearch() {
    return `${window.location.pathname}${window.location.search}`;
}

function normalizePath(path) {
    return (path || "").replace(/\/+$/, "") || "/";
}

function armLoginAuthBootstrap(source = "login") {
    try {
        sessionStorage.setItem(LOGIN_AUTH_BOOTSTRAP_SESSION_KEY, JSON.stringify({
            source,
            startedAt: Date.now(),
            expiresAt: Date.now() + LOGIN_AUTH_BOOTSTRAP_WINDOW_MS
        }));
        sessionStorage.setItem(LOGIN_BOOT_WINDOW_SESSION_KEY, JSON.stringify({
            source,
            startedAt: Date.now(),
            expiresAt: Date.now() + LOGIN_BOOT_WINDOW_MS,
            count: 0
        }));
        return true;
    } catch (e) {
        return false;
    }
}

function clearLegacyAutoRestoreBootstrap() {
    try {
        sessionStorage.removeItem(LOGIN_AUTO_RESTORE_TARGET_SESSION_KEY);
    } catch (e) {
        // ignore storage availability errors
    }
}

async function navigateAfterLogin(user, options = {}) {
    if (!user || authNavigationInFlight) return;
    authNavigationInFlight = true;

    const source = typeof options.source === "string" && options.source.trim()
        ? options.source.trim()
        : "login";
    const target = resolveSignedInUrl({ source });
    const targetUrl = new URL(target, window.location.origin);
    const currentPath = normalizePath(getCurrentPathWithSearch());
    const targetPath = normalizePath(`${targetUrl.pathname}${targetUrl.search}`);

    clearLegacyAutoRestoreBootstrap();
    armLoginAuthBootstrap(source);
    if (currentPath === targetPath) {
        authNavigationInFlight = false;
        return;
    }
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
        sessionStorage.removeItem(LOGIN_AUTH_BOOTSTRAP_SESSION_KEY);
        sessionStorage.removeItem(LOGIN_BOOT_WINDOW_SESSION_KEY);
        sessionStorage.removeItem(LOGIN_AUTO_RESTORE_TARGET_SESSION_KEY);
    } catch (e) {
        // ignore storage availability errors
    }
}

export function initLoginUI() {
    normalizeLoginPath();

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
                    await navigateAfterLogin(userCredential.user, { source: rememberMe ? "remember-me-login" : "session-login" });
                    return;
                }

                const savedLang = readString(LANGUAGE_STORAGE_KEY, "en");
                setDoc(doc(db, "users", userCredential.user.uid), {
                    settings: { language: savedLang }
                }, { merge: true }).catch((e) => {
                    console.error("Error saving language preference:", e);
                });
                await navigateAfterLogin(userCredential.user, { source: rememberMe ? "remember-me-login" : "session-login" });
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
        await navigateAfterLogin(user, { source: "remembered-session" });
    });
}

initLoginUI();
