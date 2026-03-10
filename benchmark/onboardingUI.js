import { auth } from "./client.js";
import * as ProfileUI from "./profileUI.js?v=20260310-profile-mobile-ui-fix-3";
import { getCachedElementById } from "./utils/domUtils.js";

export function initOnboardingUI(options = {}) {
    const { t, onOnboardingVisibilityChange = null } = options;

    const onboardingModal = getCachedElementById("onboardingModal");
    const onboardingUsernameInput = getCachedElementById("onboardingUsernameInput");
    const onboardingNewGuildInput = getCachedElementById("onboardingNewGuildInput");
    const onboardingAddGuildBtn = getCachedElementById("onboardingAddGuildBtn");
    const saveOnboardingBtn = getCachedElementById("saveOnboardingBtn");
    const onboardingWelcomeTitle = onboardingModal
        ? onboardingModal.querySelector('[data-i18n="onboarding_welcome_title"]')
        : null;
    const onboardingWelcomeSubtitle = onboardingModal
        ? onboardingModal.querySelector('[data-i18n="onboarding_welcome_subtitle"]')
        : null;

    function initOnboarding() {
        if (onboardingWelcomeTitle) onboardingWelcomeTitle.textContent = t("onboarding_welcome_title");
        if (onboardingWelcomeSubtitle) onboardingWelcomeSubtitle.textContent = t("onboarding_welcome_subtitle");
        if (saveOnboardingBtn && !saveOnboardingBtn.disabled) {
            saveOnboardingBtn.textContent = t("onboarding_save_continue");
        }
        ProfileUI.initOnboarding(onboardingModal, onboardingUsernameInput, onboardingAddGuildBtn);
        if (typeof onOnboardingVisibilityChange === "function") {
            onOnboardingVisibilityChange(true);
        }
    }

    if (onboardingAddGuildBtn && onboardingNewGuildInput) {
        onboardingAddGuildBtn.addEventListener("click", () => {
            const val = onboardingNewGuildInput.value.trim();
            if (ProfileUI.addEditingGuild(val, onboardingAddGuildBtn)) {
                onboardingNewGuildInput.value = "";
            }
        });
        onboardingNewGuildInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") onboardingAddGuildBtn.click();
        });
    }

    if (saveOnboardingBtn) {
        saveOnboardingBtn.addEventListener("click", async () => {
            const username = onboardingUsernameInput.value.trim();
            if (!username) {
                alert(t("onboarding_username_required"));
                return;
            }

            const user = auth.currentUser;
            if (!user) return;

            saveOnboardingBtn.disabled = true;
            saveOnboardingBtn.textContent = t("onboarding_saving");

            try {
                await ProfileUI.saveOnboardingProfile(username);
                onboardingModal.classList.remove("show");
                if (typeof onOnboardingVisibilityChange === "function") {
                    onOnboardingVisibilityChange(false);
                }
            } catch (e) {
                console.error("Error saving onboarding:", e);
                alert(t("onboarding_error_prefix") + e.message);
            } finally {
                saveOnboardingBtn.disabled = false;
                saveOnboardingBtn.textContent = t("onboarding_save_continue");
            }
        });
    }

    return {
        initOnboarding
    };
}
