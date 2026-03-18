import { onAuthStateChanged, sendEmailVerification, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db } from "./client.js";
import { state, getRuntimeAccountId } from "./appState.js";
import { getCachedElementById, getCachedQuery, setHidden } from "./utils/domUtils.js";
import { getBenchmarkBasePath, normalizeFriendRequestIds, isMobileViewport } from "./utils.js";
import * as Slugs from "./slugs.js?v=20260310-public-slug-directory-1";
import * as AuthManager from "./authManager.js?v=20260317-profile-views-bootstrap-2";
import * as RadarUI from "./radarUI.js";
import * as ProfileUI from "./profileUI.js?v=20260311-profile-original-sync-1";
import * as ViewModeManager from "./viewModeManager.js?v=20260317-profile-view-cooldown-2";
import { getRememberedAccountIdForUid, applyActiveAccountId } from "./accountId.js";
import { tf, currentLanguage } from "./i18n.js";
import { readString, LANGUAGE_STORAGE_KEY } from "./storage.js?v=20260310-sub-score-input-3";
import { showPageLoader } from "./pageLoaderUI.js?v=20260316-remembered-handoff-lock-1";

const AUTH_REFERRER_BLOCK_HINT = "The request is blocked by Firebase API key restrictions (check authorized domains / API key HTTP referrers).";
const MOBILE_RESTORE_NEXT_LOADER_SUPPRESS_SESSION_KEY = "__benchmark_mobile_restore_suppress_next_loader__";
const MOBILE_RESTORE_NEXT_LOADER_SUPPRESS_WINDOW_MS = 15000;
const MOBILE_REMEMBERED_RESTORE_FALLBACK_HIDE_MS = 6000;

let unsubscribeUserSnapshot = null;
let lastAuthUid = null;
let pendingInitialSignedOutHideTimer = null;

function armNextMobileRestoreLoaderSuppression() {
    if (typeof window === "undefined" || !isMobileViewport()) return;
    try {
        window.sessionStorage.setItem(MOBILE_RESTORE_NEXT_LOADER_SUPPRESS_SESSION_KEY, JSON.stringify({
            expiresAt: Date.now() + MOBILE_RESTORE_NEXT_LOADER_SUPPRESS_WINDOW_MS
        }));
    } catch (_) {}
}

function clearPendingInitialSignedOutHideTimer() {
    if (!pendingInitialSignedOutHideTimer) return;
    clearTimeout(pendingInitialSignedOutHideTimer);
    pendingInitialSignedOutHideTimer = null;
}

function waitForWindowLoad(timeoutMs = 8000) {
    if (typeof window === "undefined" || typeof document === "undefined") {
        return Promise.resolve();
    }
    if (document.readyState === "complete") {
        return Promise.resolve();
    }
    return new Promise((resolve) => {
        let finished = false;
        let timeoutId = null;
        const finish = () => {
            if (finished) return;
            finished = true;
            if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }
            resolve();
        };
        timeoutId = setTimeout(finish, Math.max(0, Number(timeoutMs) || 0));
        window.addEventListener("load", finish, { once: true });
    });
}

function waitForNextPaint() {
    if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") {
        return Promise.resolve();
    }
    return new Promise((resolve) => {
        window.requestAnimationFrame(() => {
            window.requestAnimationFrame(resolve);
        });
    });
}

function releaseLoginHandoffBootHold() {
    if (typeof window === "undefined") return;
    AuthManager.clearLoginHandoffPending();
    try {
        delete window.__BENCHMARK_FORCE_BOOT_HOLD__;
    } catch (_) {
        window.__BENCHMARK_FORCE_BOOT_HOLD__ = false;
    }
}

export function initAuthLifecycle(options = {}) {
    const {
        loadUserProfile,
        hidePageLoader,
        hidePrivateProfileOverlay = null,
        syncAuthenticatedBackNavigationGuard = null,
        updateNotificationVisibility,
        onAuthSessionChange = null,
        setAuthGateActive = null,
        applyLanguage = null
    } = options;

    if (typeof loadUserProfile !== "function") {
        throw new Error("initAuthLifecycle requires loadUserProfile()");
    }
    if (typeof hidePageLoader !== "function") {
        throw new Error("initAuthLifecycle requires hidePageLoader()");
    }
    if (typeof updateNotificationVisibility !== "function") {
        throw new Error("initAuthLifecycle requires updateNotificationVisibility()");
    }

    const applyStoredLanguageForLinkedView = () => {
        if (typeof applyLanguage !== "function") return;
        const appliedLang = typeof currentLanguage === "string" ? currentLanguage.trim() : "";
        const storedLang = readString(LANGUAGE_STORAGE_KEY, "en") || "en";
        applyLanguage(appliedLang || storedLang, false);
    };

    onAuthStateChanged(auth, async (user) => {
        const previousAuthUid = lastAuthUid;
        clearPendingInitialSignedOutHideTimer();
        if (typeof setAuthGateActive === "function") {
            setAuthGateActive(false);
        }
        if (typeof unsubscribeUserSnapshot === "function") {
            unsubscribeUserSnapshot();
            unsubscribeUserSnapshot = null;
        }
        state.currentFriendRequests = [];
        state.hasPendingRequests = false;
        updateNotificationVisibility();

        const nextUid = user && user.uid ? user.uid : "";
        if (typeof onAuthSessionChange === "function" && nextUid !== lastAuthUid) {
            onAuthSessionChange({
                previousUid: lastAuthUid,
                currentUid: nextUid || null,
                user
            });
        }
        lastAuthUid = nextUid;

        const params = new URLSearchParams(window.location.search);
        const profileId = params.get("id");
        const requestedSlug = Slugs.getRequestedProfileSlugFromPath();

        if (requestedSlug) {
            if (!user) {
                return;
            }
            try {
                const requestedDoc = await Slugs.resolveProfileDocBySlug(requestedSlug, !!user);
                if (requestedDoc && requestedDoc.id !== user.uid) {
                    applyStoredLanguageForLinkedView();
                    if (typeof syncAuthenticatedBackNavigationGuard === "function") {
                        syncAuthenticatedBackNavigationGuard({ enabled: true });
                    }
                    return;
                }
            } catch (slugErr) {
                console.warn("Slug ownership check failed in auth handler:", slugErr);
            }
        }

        if (user) {
            const loginAuthBootstrapSource = AuthManager.getLoginAuthBootstrapSource();
            const shouldHoldLoaderThroughRememberedRestore = isMobileViewport() && loginAuthBootstrapSource === "remembered-session";
            const shouldHoldLoaderUntilWindowLoad = shouldHoldLoaderThroughRememberedRestore;
            const rememberedId = getRememberedAccountIdForUid(user.uid);
            if (rememberedId) {
                applyActiveAccountId(rememberedId);
            }

            if (profileId && profileId !== user.uid) {
                applyStoredLanguageForLinkedView();
                if (typeof syncAuthenticatedBackNavigationGuard === "function") {
                    syncAuthenticatedBackNavigationGuard({ enabled: true });
                }
                return;
            }
            if (typeof hidePrivateProfileOverlay === "function") {
                hidePrivateProfileOverlay();
            }
            ViewModeManager.clearViewModeChrome();

            if (!user.emailVerified) {
                if (AuthManager.isLoginHandoffPending()) {
                    releaseLoginHandoffBootHold();
                }
                if (typeof setAuthGateActive === "function") {
                    setAuthGateActive(true);
                }
                if (typeof onAuthSessionChange === "function") {
                    onAuthSessionChange({
                        previousUid: lastAuthUid,
                        currentUid: nextUid || null,
                        user,
                        reason: "unverified",
                        force: true
                    });
                }

                const modal = getCachedElementById("verificationModal");
                if (modal) {
                    modal.classList.add("show");

                    const resendBtn = getCachedElementById("resendVerificationBtn");
                    const reloadBtn = getCachedElementById("reloadPageBtn");
                    const signOutBtn = getCachedElementById("verificationSignOutBtn");
                    const msgDiv = getCachedElementById("verificationMessage");

                    if (msgDiv) {
                        msgDiv.textContent = "";
                        msgDiv.classList.remove("message-error");
                        msgDiv.classList.add("message-success");
                        setHidden(msgDiv, true);
                    }

                    if (resendBtn) {
                        resendBtn.onclick = async () => {
                            try {
                                await sendEmailVerification(user, {
                                    url: `${window.location.origin}${getBenchmarkBasePath()}/verification-sent?mode=verifyEmail`,
                                    handleCodeInApp: true
                                });
                                if (msgDiv) {
                                    msgDiv.textContent = tf("verification_email_sent_to", { email: user.email });
                                    msgDiv.classList.remove("message-error");
                                    msgDiv.classList.add("message-success");
                                    setHidden(msgDiv, false);
                                }
                                resendBtn.disabled = true;
                                setTimeout(() => {
                                    resendBtn.disabled = false;
                                }, 60000);
                            } catch (e) {
                                const message = e && typeof e.message === "string" ? e.message : "";
                                if (msgDiv) {
                                    msgDiv.textContent = message.toLowerCase().includes("api_key_http_referrer_blocked")
                                        ? AUTH_REFERRER_BLOCK_HINT
                                        : message;
                                    msgDiv.classList.remove("message-success");
                                    msgDiv.classList.add("message-error");
                                    setHidden(msgDiv, false);
                                }
                            }
                        };
                    }
                    if (reloadBtn) reloadBtn.onclick = () => window.location.reload();
                    if (signOutBtn) {
                        signOutBtn.onclick = () => {
                            showPageLoader();
                            signOut(auth)
                                .then(() => {
                                    window.location.replace(Slugs.getBenchmarkLoginUrl());
                                })
                                .catch((signOutErr) => {
                                    console.error("Error signing out from verification modal:", signOutErr);
                                    hidePageLoader({ immediate: true });
                                });
                        };
                    }
                }
                hidePageLoader({ forceReleaseBootHold: true });
                return;
            }
            const verificationModal = getCachedElementById("verificationModal");
            if (verificationModal) {
                verificationModal.classList.remove("show");
            }
            if (typeof setAuthGateActive === "function") {
                setAuthGateActive(false);
            }

            const accountEmailDisplay = getCachedElementById("accountEmailDisplay");
            if (accountEmailDisplay) {
                const parts = user.email.split("@");
                accountEmailDisplay.value = `**************@${parts[1] || "gmail.com"}`;
            }

            unsubscribeUserSnapshot = onSnapshot(
                doc(db, "users", user.uid),
                (docSnap) => {
                    const data = docSnap.data();
                    const latestUserDocRequests = normalizeFriendRequestIds(data && data.friendRequests);
                    const tabFriendRequests = getCachedElementById("tabFriendRequests");
                    const requestsTabActive = tabFriendRequests && tabFriendRequests.classList.contains("active");
                    AuthManager.syncFriendRequestState(user.uid, latestUserDocRequests, requestsTabActive);
                    updateNotificationVisibility();
                },
                (userSnapshotErr) => {
                    console.warn("User friend request snapshot unavailable:", userSnapshotErr);
                    updateNotificationVisibility();
                }
            );

            const loadedProfileData = await loadUserProfile(user);
            const activeUidAfterLoad = auth.currentUser && auth.currentUser.uid ? auth.currentUser.uid : "";
            if (activeUidAfterLoad !== user.uid) {
                hidePageLoader();
                return;
            }
            try {
                const tabFriendRequests = getCachedElementById("tabFriendRequests");
                const requestsTabActive = !!(tabFriendRequests && tabFriendRequests.classList.contains("active"));
                if (requestsTabActive && Array.isArray(state.currentFriendRequests)) {
                    AuthManager.syncFriendRequestState(user.uid, state.currentFriendRequests, true);
                }
                Slugs.updateOwnProfileUrl(user, loadedProfileData || {});
            } catch (urlErr) {
                console.warn("Failed to update profile URL slug:", urlErr);
                const profileName = getCachedQuery("profileName", () => document.querySelector(".profile-name"));
                Slugs.updateOwnProfileUrl(user, {
                    username: user.displayName || (profileName ? profileName.textContent : "player"),
                    accountId: getRuntimeAccountId(),
                    profile: {}
                });
            }
            RadarUI.setRadarMode("combined", false);
            ProfileUI.syncUserMenuDropdownWidth();
            if (typeof syncAuthenticatedBackNavigationGuard === "function") {
                syncAuthenticatedBackNavigationGuard({ enabled: true });
            }
            if (shouldHoldLoaderUntilWindowLoad) {
                await waitForWindowLoad();
                await waitForNextPaint();
            }
            if (!shouldHoldLoaderThroughRememberedRestore && AuthManager.isLoginAuthBootstrapPending()) {
                armNextMobileRestoreLoaderSuppression();
            }
            if (AuthManager.isLoginHandoffPending()) {
                releaseLoginHandoffBootHold();
                hidePageLoader({ forceReleaseBootHold: true });
                AuthManager.clearLoginAuthBootstrapPending();
                AuthManager.clearLoginRestoreBootstrapPending();
                return;
            }
            AuthManager.clearLoginAuthBootstrapPending();
            AuthManager.clearLoginRestoreBootstrapPending();
            hidePageLoader();
            return;
        }

        if (typeof syncAuthenticatedBackNavigationGuard === "function") {
            syncAuthenticatedBackNavigationGuard({ enabled: false });
        }
        if (AuthManager.isLoginHandoffPending()) {
            pendingInitialSignedOutHideTimer = setTimeout(() => {
                pendingInitialSignedOutHideTimer = null;
                if (auth.currentUser) return;
                releaseLoginHandoffBootHold();
                AuthManager.clearLoginAuthBootstrapPending();
                AuthManager.clearLoginRestoreBootstrapPending();
                hidePageLoader({ forceReleaseBootHold: true });
            }, MOBILE_REMEMBERED_RESTORE_FALLBACK_HIDE_MS);
            return;
        }
        if (AuthManager.isLoginAuthBootstrapPending()) {
            const loginAuthBootstrapSource = AuthManager.getLoginAuthBootstrapSource();
            const shouldHoldLoaderThroughRememberedRestore = isMobileViewport() && loginAuthBootstrapSource === "remembered-session";
            if (shouldHoldLoaderThroughRememberedRestore) {
                pendingInitialSignedOutHideTimer = setTimeout(() => {
                    pendingInitialSignedOutHideTimer = null;
                    if (auth.currentUser) return;
                    releaseLoginHandoffBootHold();
                    AuthManager.clearLoginAuthBootstrapPending();
                    AuthManager.clearLoginRestoreBootstrapPending();
                    hidePageLoader({ forceReleaseBootHold: true });
                }, MOBILE_REMEMBERED_RESTORE_FALLBACK_HIDE_MS);
                return;
            }
            AuthManager.clearLoginAuthBootstrapPending();
            hidePageLoader();
            return;
        }
        if (previousAuthUid === null) {
            pendingInitialSignedOutHideTimer = setTimeout(() => {
                pendingInitialSignedOutHideTimer = null;
                if (auth.currentUser) return;
                hidePageLoader();
            }, 1600);
            return;
        }
        if (profileId) {
            hidePageLoader();
            return;
        }
        hidePageLoader();
    });
}
