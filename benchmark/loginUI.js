import {
    signInWithEmailAndPassword,
    setPersistence,
    browserSessionPersistence,
    browserLocalPersistence,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db } from "./client.js";
import { getBenchmarkBasePath } from "./utils.js";
import { alignMobileTitleBetweenTopAndBox } from "./authLayout.js?v=20260310-auth-mobile-stability-1";
import { initPasswordVisibilityToggles } from "./authPasswordToggle.js?v=20260322-password-toggle-1";
import {
    readString,
    LANGUAGE_STORAGE_KEY
} from "./storage.js";

const LOGIN_AUTO_RESTORE_TARGET_SESSION_KEY = "__benchmark_login_auto_restore_target__";
const LOGIN_AUTH_BOOTSTRAP_SESSION_KEY = "__benchmark_login_auth_boot__";
const LOGIN_AUTH_BOOTSTRAP_WINDOW_MS = 15000;
const LOGIN_BOOT_WINDOW_SESSION_KEY = "__benchmark_login_boot_window__";
const LOGIN_BOOT_WINDOW_MS = 45000;
const LOGIN_HANDOFF_SESSION_KEY = "__benchmark_login_handoff__";
const LOGIN_HANDOFF_WINDOW_MS = 30000;
const MOBILE_SW_CLEANUP_SESSION_KEY = "__benchmark_mobile_sw_cleanup_done__";
let authNavigationInFlight = !!(typeof window !== "undefined" && window.__BENCHMARK_LOGIN_REDIRECT_STARTED__);
let mobileServiceWorkerCleanupPromise = null;

function isLoginRedirectStarted() {
    return !!(typeof window !== "undefined" && window.__BENCHMARK_LOGIN_REDIRECT_STARTED__);
}

function normalizeLoginPath() {
    const lowerPath = (window.location.pathname || "").toLowerCase();
    if (lowerPath.endsWith("/login.html") || lowerPath.endsWith("/benchmark/index.html")) {
        window.history.replaceState({}, "", `${getBenchmarkBasePath()}/`);
    }
}

function resolveSignedInUrl() {
    return `${getBenchmarkBasePath()}/benchmark.html`;
}

function isLikelyMobileClient() {
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

function cleanupMobileServiceWorkerControl() {
    if (typeof window === "undefined") return Promise.resolve(false);
    if (!isLikelyMobileClient()) return Promise.resolve(false);
    if (!("serviceWorker" in navigator) && !("caches" in window)) return Promise.resolve(false);
    try {
        const cleanupState = window.sessionStorage.getItem(MOBILE_SW_CLEANUP_SESSION_KEY);
        if (cleanupState === "done" || cleanupState === "running") {
            return Promise.resolve(false);
        }
        window.sessionStorage.setItem(MOBILE_SW_CLEANUP_SESSION_KEY, "running");
    } catch (e) {
        // ignore storage availability errors
    }
    const unregisterPromise = "serviceWorker" in navigator
        ? navigator.serviceWorker.getRegistrations()
            .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
            .catch(() => [])
        : Promise.resolve([]);
    const cacheCleanupPromise = "caches" in window
        ? caches.keys()
            .then((cacheNames) => Promise.all(
                cacheNames
                    .filter((cacheName) => /^kdassist-/i.test(String(cacheName || "")))
                    .map((cacheName) => caches.delete(cacheName))
            ))
            .catch(() => [])
        : Promise.resolve([]);
    return Promise.all([unregisterPromise, cacheCleanupPromise])
        .then(() => {
            try {
                window.sessionStorage.setItem(MOBILE_SW_CLEANUP_SESSION_KEY, "done");
            } catch (e) {}
            return true;
        })
        .catch(() => {
            try {
                window.sessionStorage.removeItem(MOBILE_SW_CLEANUP_SESSION_KEY);
            } catch (e) {}
            return false;
        });
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

function armLoginHandoff(source = "login") {
    try {
        if (source !== "remembered-session") {
            sessionStorage.removeItem(LOGIN_HANDOFF_SESSION_KEY);
            return false;
        }
        const now = Date.now();
        sessionStorage.setItem(LOGIN_HANDOFF_SESSION_KEY, JSON.stringify({
            source,
            startedAt: now,
            expiresAt: now + LOGIN_HANDOFF_WINDOW_MS
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
    if (!user || authNavigationInFlight || isLoginRedirectStarted()) return;
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
    armLoginHandoff(source);
    if (mobileServiceWorkerCleanupPromise) {
        await Promise.race([
            mobileServiceWorkerCleanupPromise.catch(() => false),
            new Promise((resolve) => setTimeout(resolve, 900))
        ]);
    }
    if (currentPath === targetPath) {
        authNavigationInFlight = false;
        return;
    }
    if (typeof window !== "undefined") {
        window.__BENCHMARK_LOGIN_REDIRECT_STARTED__ = true;
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
    authNavigationInFlight = false;
    try {
        if (typeof window !== "undefined") {
            window.__BENCHMARK_LOGIN_REDIRECT_STARTED__ = false;
        }
        sessionStorage.removeItem(LOGIN_AUTH_BOOTSTRAP_SESSION_KEY);
        sessionStorage.removeItem(LOGIN_BOOT_WINDOW_SESSION_KEY);
        sessionStorage.removeItem(LOGIN_AUTO_RESTORE_TARGET_SESSION_KEY);
        sessionStorage.removeItem(LOGIN_HANDOFF_SESSION_KEY);
    } catch (e) {
        // ignore storage availability errors
    }
}

export function initLoginUI() {
    if (isLoginRedirectStarted()) return;
    normalizeLoginPath();
    mobileServiceWorkerCleanupPromise = cleanupMobileServiceWorkerControl();
    initPasswordVisibilityToggles();

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
                const userRef = doc(db, "users", userCredential.user.uid);
                const userSnap = await getDoc(userRef);
                const existingData = userSnap.exists() ? (userSnap.data() || {}) : {};
                const existingProfile = existingData.profile && typeof existingData.profile === "object"
                    ? existingData.profile
                    : {};
                const userPayload = {
                    settings: { language: savedLang }
                };
                if (!userSnap.exists()) {
                    userPayload.profile = {
                        views: 0
                    };
                    userPayload.isNewUser = true;
                } else if (!Number.isFinite(Number(existingProfile.views))) {
                    userPayload.profile = {
                        views: 0
                    };
                }
                await setDoc(userRef, userPayload, { merge: true }).catch((e) => {
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
        if (isLoginRedirectStarted()) return;
        if (!user) return;
        if (!user.emailVerified) return;
        await navigateAfterLogin(user, { source: "remembered-session" });
    });
}

initLoginUI();
