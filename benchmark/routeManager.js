import { getRuntimeAccountId } from "./appState.js";
import { getRememberedAccountIdForUid } from "./accountId.js";
import * as Slugs from "./slugs.js?v=20260310-public-slug-directory-1";
import * as UserService from "./userService.js?v=20260310-public-slug-directory-1";
import * as ViewModeManager from "./viewModeManager.js?v=20260311-view-mode-compare-2";
import * as AuthManager from "./authManager.js?v=20260311-profile-original-sync-1";
import { readString, LANGUAGE_STORAGE_KEY } from "./storage.js?v=20260310-sub-score-input-3";
import { showPageLoader } from "./pageLoaderUI.js";

async function resolveViewerDocData(currentUser) {
    if (!currentUser || !currentUser.uid) return null;
    try {
        const viewerDoc = await UserService.getUserDocument(currentUser.uid);
        if (!viewerDoc.exists()) return null;
        return viewerDoc.data() || {};
    } catch (error) {
        console.warn("Failed to resolve viewer document for profile route:", error);
        return null;
    }
}

function safeObject(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function isPermissionLikeError(error) {
    const code = typeof error?.code === "string" ? error.code : "";
    return code === "permission-denied" || code === "not-found";
}

function resolvePreferredLanguage(viewerData = null) {
    const candidate = viewerData
        && viewerData.settings
        && typeof viewerData.settings === "object"
        ? viewerData.settings.language
        : "";
    if (typeof candidate === "string" && candidate.trim()) {
        return candidate.trim();
    }
    return readString(LANGUAGE_STORAGE_KEY, "en") || "en";
}

function doesDocMatchRequestedSlug(profileId, data, requestedSlug) {
    const targetSlug = typeof requestedSlug === "string" ? requestedSlug.trim().toLowerCase() : "";
    if (!targetSlug) return true;
    const resolvedSlug = Slugs.resolveProfileSlug(data || {}, {
        usernameFallback: "player",
        accountIdFallback: "",
        uid: profileId || ""
    });
    return typeof resolvedSlug === "string" && resolvedSlug.trim().toLowerCase() === targetSlug;
}

function mergeDirectoryPreviewData(data = {}, directoryData = null) {
    const safeData = safeObject(data);
    const safeDirectoryData = safeObject(directoryData);
    if (!Object.keys(safeDirectoryData).length) return safeData;

    const settings = safeObject(safeData.settings);
    const profile = safeObject(safeData.profile);
    const resolvedUsername = typeof safeData.username === "string" && safeData.username.trim()
        ? safeData.username.trim()
        : (typeof safeDirectoryData.username === "string" ? safeDirectoryData.username.trim() : "");
    const resolvedAccountId = typeof safeData.accountId === "string" && safeData.accountId.trim()
        ? safeData.accountId.trim()
        : (typeof safeDirectoryData.accountId === "string" ? safeDirectoryData.accountId.trim() : "");
    const resolvedPublicSlug = typeof safeData.publicSlug === "string" && safeData.publicSlug.trim()
        ? safeData.publicSlug.trim()
        : (typeof safeDirectoryData.publicSlug === "string" ? safeDirectoryData.publicSlug.trim() : "");
    const resolvedRankIndex = Number.isFinite(Number(safeData.rankIndex))
        ? Number(safeData.rankIndex)
        : (Number.isFinite(Number(safeDirectoryData.rankIndex)) ? Number(safeDirectoryData.rankIndex) : undefined);

    return {
        ...safeData,
        ...(resolvedUsername ? { username: resolvedUsername } : {}),
        ...(resolvedAccountId ? { accountId: resolvedAccountId } : {}),
        ...(resolvedPublicSlug ? { publicSlug: resolvedPublicSlug } : {}),
        ...(resolvedRankIndex !== undefined ? { rankIndex: resolvedRankIndex } : {}),
        settings: {
            ...settings,
            ...(settings.visibility ? {} : {
                visibility: typeof safeDirectoryData.visibility === "string" && safeDirectoryData.visibility.trim()
                    ? safeDirectoryData.visibility.trim()
                    : "everyone"
            })
        },
        profile: {
            ...profile,
            ...(profile.username ? {} : (resolvedUsername ? { username: resolvedUsername } : {})),
            ...(profile.flag ? {} : (typeof safeDirectoryData.flag === "string" && safeDirectoryData.flag.trim()
                ? { flag: safeDirectoryData.flag.trim() }
                : {})),
            ...(profile.pic ? {} : (typeof safeDirectoryData.pic === "string" && safeDirectoryData.pic.trim()
                ? { pic: safeDirectoryData.pic.trim() }
                : {}))
        }
    };
}

export async function handleProfileLink(options = {}) {
    const {
        showPrivateProfileOverlay,
        hidePrivateProfileOverlay,
        hidePageLoader,
        applyLanguage = null
    } = options;
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
    let directoryPreview = null;
    const currentUser = await AuthManager.waitForAuthInitialization();
    const viewerData = await resolveViewerDocData(currentUser);
    if (typeof applyLanguage === "function") {
        applyLanguage(resolvePreferredLanguage(viewerData), false);
    }

    if (requestedSlug) {
        if (currentUser) {
            try {
                const mine = viewerData && typeof viewerData === "object" ? viewerData : {};
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
            } catch (ownResolveErr) {
                console.warn("Failed to resolve own slug fallback:", ownResolveErr);
            }
        }
        if (!profileId) {
            profileDocFromSlug = await Slugs.resolveProfileDocBySlug(requestedSlug, !!currentUser);
            if (profileDocFromSlug) {
                profileId = profileDocFromSlug.id;
            } else {
                directoryPreview = await UserService.resolveAccountDirectoryEntryByPublicSlug(requestedSlug);
                const directoryUid = directoryPreview && typeof directoryPreview.uid === "string"
                    ? directoryPreview.uid.trim()
                    : "";
                if (directoryUid) profileId = directoryUid;
            }
        }
    }
    if (!profileId) {
        if (requestedSlug) {
            showPrivateProfileOverlay();
            hidePageLoader();
        }
        return;
    }

    showPageLoader();
    const loaderSafetyTimeout = setTimeout(() => {
        hidePageLoader({ immediate: true });
    }, 12000);

    try {
        const resolveDirectoryPreview = async () => {
            if (directoryPreview) return directoryPreview;
            if (profileId) {
                directoryPreview = await UserService.resolveAccountDirectoryEntryByUid(profileId);
            }
            if (!directoryPreview && requestedSlug) {
                directoryPreview = await UserService.resolveAccountDirectoryEntryByPublicSlug(requestedSlug);
            }
            return directoryPreview;
        };

        let docSnap = profileDocFromSlug && profileDocFromSlug.id === profileId
            ? profileDocFromSlug
            : null;
        if (!docSnap) {
            try {
                docSnap = await UserService.getUserDocument(profileId);
            } catch (error) {
                if (!isPermissionLikeError(error)) throw error;
                console.warn("Profile route could not read user document directly; falling back to directory preview.", error);
                docSnap = null;
            }
        }
        if (!(docSnap && docSnap.exists && docSnap.exists())) {
            if (requestedSlug) {
                profileDocFromSlug = profileDocFromSlug || await Slugs.resolveProfileDocBySlug(requestedSlug, !!currentUser);
                if (profileDocFromSlug && profileDocFromSlug.exists()) {
                    docSnap = profileDocFromSlug;
                    profileId = profileDocFromSlug.id;
                }
            }
        }

        let data = docSnap && docSnap.exists && docSnap.exists()
            ? (docSnap.data() || {})
            : {};
        data = mergeDirectoryPreviewData(data, await resolveDirectoryPreview());
        if (requestedSlug && !doesDocMatchRequestedSlug(profileId, data, requestedSlug)) {
            profileDocFromSlug = profileDocFromSlug || await Slugs.resolveProfileDocBySlug(requestedSlug, !!currentUser);
            if (profileDocFromSlug && profileDocFromSlug.exists() && profileDocFromSlug.id !== profileId) {
                console.warn("Profile route id fallback did not match requested slug; preferring slug document.", {
                    requestedSlug,
                    fallbackId: profileId,
                    resolvedId: profileDocFromSlug.id
                });
                docSnap = profileDocFromSlug;
                profileId = profileDocFromSlug.id;
                data = mergeDirectoryPreviewData(docSnap.data() || {}, await resolveDirectoryPreview());
            }
        }

        if (!(docSnap && docSnap.exists && docSnap.exists()) && !Object.keys(safeObject(data)).length) {
            console.warn("Profile route did not resolve to a user document or directory preview:", profileId);
            hidePageLoader();
            return;
        }

        if (currentUser && currentUser.uid === profileId) {
            hidePrivateProfileOverlay();
            hidePageLoader();
            return;
        }
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
