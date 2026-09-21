import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { auth } from "../client.js";
import { getBenchmarkBasePath } from "../utils.js";
import { alignMobileTitleBetweenTopAndBox } from "../authLayout.js";

const currentPath = (window.location.pathname || "").toLowerCase();
if (currentPath.endsWith("/forgot-password.html") || currentPath.endsWith("/forgot-password/index.html")) {
    window.history.replaceState({}, "", `${getBenchmarkBasePath()}/forgot-password`);
}

const emailInput = document.getElementById("email");
const resetBtn = document.getElementById("resetBtn");
const message = document.getElementById("message");
const errorMessage = document.getElementById("error-message");
const tAuth = (key) => (window.authT ? window.authT(key) : key);

if (resetBtn) {
    resetBtn.addEventListener("click", () => {
        const email = emailInput.value;
        message.textContent = "";
        errorMessage.textContent = "";

        if (!email) {
            errorMessage.textContent = tAuth("err_forgot_missing");
            return;
        }

        sendPasswordResetEmail(auth, email)
            .then(() => {
                message.textContent = tAuth("msg_forgot_success");
            })
            .catch((error) => {
                errorMessage.textContent = window.resolveAuthError ? window.resolveAuthError(error) : error.message;
            });
    });
}

if (window.initAuthLanguage) window.initAuthLanguage("forgot");

window.addEventListener("resize", alignMobileTitleBetweenTopAndBox);
window.addEventListener("orientationchange", alignMobileTitleBetweenTopAndBox);
requestAnimationFrame(() => {
    alignMobileTitleBetweenTopAndBox();
});

