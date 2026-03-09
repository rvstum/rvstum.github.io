import { createUserWithEmailAndPassword, sendEmailVerification, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db } from "../client.js";
import { getBenchmarkBasePath } from "../utils.js";
import { alignMobileTitleBetweenTopAndBox } from "../authLayout.js";
import { readString, LANGUAGE_STORAGE_KEY } from "../storage.js";

const currentPath = (window.location.pathname || "").toLowerCase();
if (currentPath.endsWith("/signup.html") || currentPath.endsWith("/sign-up/index.html")) {
    window.history.replaceState({}, "", `${getBenchmarkBasePath()}/sign-up`);
}

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirmPassword");
const signupBtn = document.getElementById("signupBtn");
const goToLoginLink = document.getElementById("goToLoginLink");
const errorMessage = document.getElementById("error-message");
const tAuth = (key) => (window.authT ? window.authT(key) : key);

const animatePress = (element) => {
    if (!element) return;
    element.classList.remove("is-clicking");
    void element.offsetWidth;
    element.classList.add("is-clicking");
    setTimeout(() => element.classList.remove("is-clicking"), 220);
};

const handleSignup = () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    errorMessage.textContent = "";

    if (!email || !password || !confirmPassword) {
        errorMessage.textContent = tAuth("err_signup_fill");
        return;
    }
    if (password !== confirmPassword) {
        errorMessage.textContent = tAuth("err_signup_mismatch");
        return;
    }

    createUserWithEmailAndPassword(auth, email, password)
        .then(async (userCredential) => {
            try {
                const savedLang = readString(LANGUAGE_STORAGE_KEY, "en");
                await setDoc(doc(db, "users", userCredential.user.uid), {
                    settings: { language: savedLang },
                    isNewUser: true
                }, { merge: true });

                const actionCodeSettings = {
                    url: `${window.location.origin}${getBenchmarkBasePath()}/verification-sent?mode=verifyEmail`,
                    handleCodeInApp: true
                };
                await sendEmailVerification(userCredential.user, actionCodeSettings);
                await signOut(auth);
                window.location.href = "../verification-sent";
            } catch (error) {
                errorMessage.textContent = tAuth("err_signup_verify_send");
            }
        })
        .catch((error) => {
            errorMessage.textContent = window.resolveAuthError ? window.resolveAuthError(error) : error.message;
        });
};

[signupBtn, goToLoginLink].forEach((element) => {
    if (!element) return;
    element.addEventListener("pointerdown", () => animatePress(element));
    element.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        animatePress(element);
    });
});

if (signupBtn) {
    signupBtn.addEventListener("click", () => {
        animatePress(signupBtn);
        handleSignup();
    });
}

[emailInput, passwordInput, confirmPasswordInput].forEach((inputEl) => {
    if (!inputEl) return;
    inputEl.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        animatePress(signupBtn);
        handleSignup();
    });
});

if (window.initAuthLanguage) window.initAuthLanguage("signup");

window.addEventListener("resize", alignMobileTitleBetweenTopAndBox);
window.addEventListener("orientationchange", alignMobileTitleBetweenTopAndBox);
requestAnimationFrame(() => {
    alignMobileTitleBetweenTopAndBox();
});
