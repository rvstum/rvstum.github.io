import { onAuthStateChanged, sendEmailVerification, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, onSnapshot, collection, query, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db } from "./client.js";
import { state, getRuntimeAccountId } from "./appState.js";
import { getCachedElementById, getCachedQuery, setHidden } from "./utils/domUtils.js";
import { getBenchmarkBasePath, normalizeFriendRequestIds } from "./utils.js";
import * as Slugs from "./slugs.js?v=20260310-public-slug-directory-1";
import * as UserService from "./userService.js?v=20260310-public-slug-directory-1";
import * as AuthManager from "./authManager.js?v=20260311-profile-original-sync-1";
import * as RadarUI from "./radarUI.js";
import * as ProfileUI from "./profileUI.js?v=20260311-profile-original-sync-1";
import * as ViewModeManager from "./viewModeManager.js?v=20260311-exit-view-text-1";
import { getRememberedAccountIdForUid, applyActiveAccountId } from "./accountId.js";
import { tf } from "./i18n.js";
import { showPageLoader } from "./pageLoaderUI.js?v=20260309-logout-loader-cover-1";

const AUTH_REFERRER_BLOCK_HINT = "The request is blocked by Firebase API key restrictions (check authorized domains / API key HTTP referrers).";

let unsubscribeUserSnapshot = null;
let unsubscribeIncomingRequestSnapshot = null;
let lastAuthUid = null;

export function initAuthLifecycle(options = {}) {
    const {
        loadUserProfile,
        hidePageLoader,
        hidePrivateProfileOverlay = null,
        syncAuthenticatedBackNavigationGuard = null,
        updateNotificationVisibility,
        onAuthSessionChange = null,
        setAuthGateActive = null
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

    onAuthStateChanged(auth, async (user) => {
        if (typeof setAuthGateActive === "function") {
            setAuthGateActive(false);
        }
        if (typeof unsubscribeUserSnapshot === "function") {
            unsubscribeUserSnapshot();
            unsubscribeUserSnapshot = null;
        }
        if (typeof unsubscribeIncomingRequestSnapshot === "function") {
            unsubscribeIncomingRequestSnapshot();
            unsubscribeIncomingRequestSnapshot = null;
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
                hidePageLoader();
                return;
            }
            try {
                const requestedDoc = await Slugs.resolveProfileDocBySlug(requestedSlug, !!user);
                if (requestedDoc && requestedDoc.id !== user.uid) {
                    if (typeof syncAuthenticatedBackNavigationGuard === "function") {
                        syncAuthenticatedBackNavigationGuard({ enabled: true });
                    }
                    hidePageLoader();
                    return;
                }
            } catch (slugErr) {
                console.warn("Slug ownership check failed in auth handler:", slugErr);
            }
        }

        if (user) {
            const rememberedId = getRememberedAccountIdForUid(user.uid);
            if (rememberedId) {
                applyActiveAccountId(rememberedId);
            }

            if (profileId && profileId !== user.uid) {
                if (typeof syncAuthenticatedBackNavigationGuard === "function") {
                    syncAuthenticatedBackNavigationGuard({ enabled: true });
                }
                hidePageLoader();
                return;
            }
            if (typeof hidePrivateProfileOverlay === "function") {
                hidePrivateProfileOverlay();
            }
            ViewModeManager.clearViewModeChrome();

            if (!user.emailVerified) {
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
                hidePageLoader();
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

            let latestUserDocRequests = [];
            let latestIncomingEdgeRequests = [];
            let hasUserRequestsSnapshot = false;
            let hasIncomingEdgeSnapshot = false;
            const applyCombinedFriendRequestState = (userDocData = null) => {
                if (!hasUserRequestsSnapshot || !hasIncomingEdgeSnapshot) {
                    updateNotificationVisibility();
                    return;
                }

                const tabFriendRequests = getCachedElementById("tabFriendRequests");
                const requestsTabActive = tabFriendRequests && tabFriendRequests.classList.contains("active");
                const combinedRequests = [...new Set([
                    ...latestUserDocRequests,
                    ...latestIncomingEdgeRequests
                ])];
                AuthManager.syncFriendRequestState(user.uid, combinedRequests, requestsTabActive);
                updateNotificationVisibility();
            };

            unsubscribeUserSnapshot = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
                const data = docSnap.data();
                latestUserDocRequests = normalizeFriendRequestIds(data && data.friendRequests);
                hasUserRequestsSnapshot = true;
                applyCombinedFriendRequestState(data);
            });

            const incomingQuery = query(collection(db, "friendRequests"), where("toUid", "==", user.uid));
            unsubscribeIncomingRequestSnapshot = onSnapshot(
                incomingQuery,
                (querySnap) => {
                    latestIncomingEdgeRequests = querySnap.docs
                        .map((snap) => {
                            const data = snap.data() || {};
                            return typeof data.fromUid === "string" ? data.fromUid.trim() : "";
                        })
                        .filter((value) => value !== "");
                    hasIncomingEdgeSnapshot = true;
                    applyCombinedFriendRequestState();
                },
                (requestSnapshotErr) => {
                    console.warn("Incoming friend request snapshot unavailable:", requestSnapshotErr);
                    latestIncomingEdgeRequests = [];
                    hasIncomingEdgeSnapshot = true;
                    applyCombinedFriendRequestState();
                }
            );

            await loadUserProfile(user);
            const activeUidAfterLoad = auth.currentUser && auth.currentUser.uid ? auth.currentUser.uid : "";
            if (activeUidAfterLoad !== user.uid) {
                hidePageLoader();
                return;
            }
            try {
                const myDocSnap = await UserService.getUserDocument(user.uid);
                const activeUidAfterDocRead = auth.currentUser && auth.currentUser.uid ? auth.currentUser.uid : "";
                if (activeUidAfterDocRead !== user.uid) {
                    hidePageLoader();
                    return;
                }
                const myData = myDocSnap.exists() ? (myDocSnap.data() || {}) : {};
                Slugs.updateOwnProfileUrl(user, myData);
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
            hidePageLoader();
            return;
        }

        if (typeof syncAuthenticatedBackNavigationGuard === "function") {
            syncAuthenticatedBackNavigationGuard({ enabled: false });
        }
        if (profileId) {
            hidePageLoader();
            return;
        }
        hidePageLoader();
    });
}
