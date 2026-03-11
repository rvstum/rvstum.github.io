import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./client.js";
import { getRuntimeAccountId } from "./appState.js";
import { getRememberedAccountIdForUid } from "./accountId.js";
import * as Slugs from "./slugs.js?v=20260310-public-slug-directory-1";
import * as UserService from "./userService.js?v=20260310-public-slug-directory-1";
import * as ViewModeManager from "./viewModeManager.js?v=20260311-view-mode-compare-2";
import * as AuthManager from "./authManager.js?v=20260311-profile-original-sync-1";
import { showPageLoader } from "./pageLoaderUI.js";

export async function handleProfileLink(options = {}) {
    const { showPrivateProfileOverlay, hidePrivateProfileOverlay, hidePageLoader } = options;
    if (typeof showPrivateProfileOverlay !== "function") {
        throw new Error("handleProfileLink requires showPrivateProfileOverlay()");
    }
    if (typeof hidePrivateProfileOverlay !== "function") {
        throw new Error("handleProfileLink requires hidePrivateProfileOverlay()");
    }
    if (typeof hidePageLoader !== "function") {
        throw new Error("handleProfileLink requires hidePageLoader()");
    }

    hidePrivateProfileOverlay();

    const params = new URLSearchParams(window.location.search);
    let profileId = params.get("id");
    const requestedSlug = Slugs.getRequestedProfileSlugFromPath();
    let profileDocFromSlug = null;
    const currentUser = await AuthManager.waitForAuthInitialization();

    if (!profileId && requestedSlug) {
        if (currentUser) {
            try {
                const myDoc = await getDoc(doc(db, "users", currentUser.uid));
                if (myDoc.exists()) {
                    const mine = myDoc.data() || {};
                    const rememberedAccountId = getRememberedAccountIdForUid(currentUser.uid);
                    const slugCandidates = new Set([
                        Slugs.resolveProfileSlug(mine, {
                            usernameFallback: currentUser.displayName || "player",
                            accountIdFallback: rememberedAccountId || getRuntimeAccountId(),
                            uid: currentUser.uid
                        }),
                        Slugs.resolveProfileSlug({
                            ...mine,
                            accountId: rememberedAccountId || mine.accountId,
                            profile: {
                                ...(mine.profile && typeof mine.profile === "object" ? mine.profile : {}),
                                accountId: rememberedAccountId || (mine.profile && mine.profile.accountId) || ""
                            }
                        }, {
                            usernameFallback: currentUser.displayName || "player",
                            accountIdFallback: rememberedAccountId || getRuntimeAccountId(),
                            uid: currentUser.uid
                        })
                    ]);
                    if (slugCandidates.has(requestedSlug)) {
                        hidePrivateProfileOverlay();
                        return;
                    }
                }
            } catch (ownResolveErr) {
                console.warn("Failed to resolve own slug fallback:", ownResolveErr);
            }
        }
        profileDocFromSlug = await Slugs.resolveProfileDocBySlug(requestedSlug, !!currentUser);
        if (profileDocFromSlug) profileId = profileDocFromSlug.id;
    }
    if (!profileId) {
        if (requestedSlug) {
            showPrivateProfileOverlay();
            hidePageLoader();
        }
        return;
    }

    if (currentUser && currentUser.uid === profileId) {
        hidePrivateProfileOverlay();
        return;
    }

    showPageLoader();
    const loaderSafetyTimeout = setTimeout(() => {
        hidePageLoader({ immediate: true });
    }, 12000);

    try {
        const docSnap = profileDocFromSlug && profileDocFromSlug.id === profileId
            ? profileDocFromSlug
            : await UserService.getUserDocument(profileId);
        if (!docSnap.exists()) {
            console.warn("Profile route did not resolve to a user document:", profileId);
            hidePageLoader();
            return;
        }

        const data = docSnap.data();
        const allowed = await ViewModeManager.canViewProfile(profileId, data, currentUser);
        if (!allowed) {
            showPrivateProfileOverlay();
            hidePageLoader();
            return;
        }

        await ViewModeManager.enterViewMode(data, profileId);
        hidePageLoader();
    } catch (e) {
        console.error("Error loading profile from link:", e);
        hidePageLoader();
    } finally {
        clearTimeout(loaderSafetyTimeout);
    }
}
