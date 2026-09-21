import { getBenchmarkBasePath } from "../utils.js";
import { auth } from "../client.js";
import { applyActionCode } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const loginRedirectBtn = document.getElementById("loginRedirectBtn");
if (loginRedirectBtn) {
    loginRedirectBtn.addEventListener("click", () => {
        window.location.href = "../";
    });
}

const currentPath = (window.location.pathname || "").toLowerCase();
const verificationMessage = document.querySelector(".verification-message");

const setVerificationMessage = (message, isError = false) => {
    if (!verificationMessage) return;
    verificationMessage.textContent = message;
    verificationMessage.classList.toggle("message-error", isError);
    verificationMessage.classList.toggle("message-success", !isError);
};

const getVerificationErrorMessage = (error) => {
    const rawMessage = error && typeof error.message === "string" ? error.message.toLowerCase() : "";
    const code = error && error.code ? String(error.code) : "";
    if (rawMessage.includes("api_key_http_referrer_blocked") || rawMessage.includes("requests from referer")) {
        return "This environment is blocked by Firebase API key restrictions. Please add the current domain to the API key and Authentication authorized domains, then request a new verification email.";
    }
    if (code === "auth/invalid-action-code" || code === "auth/expired-action-code") {
        return "This verification link has expired or has already been used. Send a new one from the login screen.";
    }
    return error && error.message ? error.message : "Unable to verify your email right now. Please try again.";
};

const handleVerificationCode = async () => {
    const params = new URLSearchParams(window.location.search || "");
    const mode = params.get("mode");
    const oobCode = params.get("oobCode");

    if (mode !== "verifyEmail" || !oobCode) return;

    try {
        setVerificationMessage("Verifying your email...");
        await applyActionCode(auth, oobCode);
        setVerificationMessage("Your email is verified. You can now log in.");
        window.history.replaceState({}, "", `${getBenchmarkBasePath()}/verification-sent`);
    } catch (error) {
        const code = error && error.code ? String(error.code) : "";
        if (code === "auth/expired-action-code" || code === "auth/invalid-action-code") {
            setVerificationMessage("This verification link has expired or has already been used. Click the button below to send a new one.", true);
        } else {
            setVerificationMessage(getVerificationErrorMessage(error), true);
        }
        window.history.replaceState({}, "", `${getBenchmarkBasePath()}/verification-sent`);
    }
};

if (currentPath.endsWith("/verification-sent.html") || currentPath.endsWith("/verification-sent/index.html")) {
    window.history.replaceState({}, "", `${getBenchmarkBasePath()}/verification-sent`);
}

if (window.initAuthLanguage) window.initAuthLanguage("verification");

handleVerificationCode();
