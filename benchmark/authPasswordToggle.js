const EYE_ICON = `
    <svg class="password-visibility-icon icon-eye" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M1.5 12s3.75-6 10.5-6s10.5 6 10.5 6s-3.75 6-10.5 6S1.5 12 1.5 12Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path>
        <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.7"></circle>
    </svg>
`;

const EYE_OFF_ICON = `
    <svg class="password-visibility-icon icon-eye-off" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M3 4.5L21 19.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path>
        <path d="M10.7 6.3A12.6 12.6 0 0 1 12 6c6.75 0 10.5 6 10.5 6a18.5 18.5 0 0 1-3.05 3.46" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path>
        <path d="M6.02 8.21A18.7 18.7 0 0 0 1.5 12S5.25 18 12 18c1.4 0 2.67-.26 3.82-.7" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path>
        <path d="M9.88 9.88A3 3 0 0 0 14.12 14.12" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path>
    </svg>
`;

function syncPasswordToggleState(input, shell, button) {
    const isVisible = input.type === "text";
    shell.classList.toggle("is-password-visible", isVisible);
    button.setAttribute("aria-pressed", isVisible ? "true" : "false");
}

function moveCaretToEnd(input) {
    try {
        const position = input.value.length;
        input.setSelectionRange(position, position);
    } catch (_) {
        // Some browsers block setSelectionRange for password-like fields.
    }
}

export function initPasswordVisibilityToggles(root = document) {
    if (!root || typeof root.querySelectorAll !== "function") return;

    root.querySelectorAll('input[type="password"]').forEach((input) => {
        if (!(input instanceof HTMLInputElement)) return;
        if (input.dataset.passwordToggleReady === "true") return;
        const parent = input.parentNode;
        if (!parent) return;

        input.dataset.passwordToggleReady = "true";

        const shell = document.createElement("div");
        shell.className = "password-input-shell";
        parent.insertBefore(shell, input);
        shell.appendChild(input);

        const toggleButton = document.createElement("button");
        toggleButton.type = "button";
        toggleButton.className = "password-visibility-toggle";
        toggleButton.setAttribute("aria-label", "Toggle password visibility");
        toggleButton.setAttribute("aria-pressed", "false");
        toggleButton.innerHTML = `${EYE_ICON}${EYE_OFF_ICON}`;
        shell.appendChild(toggleButton);

        const handleToggle = () => {
            input.type = input.type === "password" ? "text" : "password";
            syncPasswordToggleState(input, shell, toggleButton);
            input.focus({ preventScroll: true });
            moveCaretToEnd(input);
        };

        toggleButton.addEventListener("mousedown", (event) => {
            event.preventDefault();
        });
        toggleButton.addEventListener("click", handleToggle);

        syncPasswordToggleState(input, shell, toggleButton);
    });
}
