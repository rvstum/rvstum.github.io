import { auth } from "./client.js";
import { state } from "./appState.js";
import { t } from "./i18n.js";
import { SUB_INPUT_MODE_STORAGE_KEY, writeString } from "./storage.js?v=20260310-sub-score-input-3";
import * as RankingUI from "./rankingUI.js?v=20260310-sub-score-input-14";
import * as ScoreManager from "./scoreManager.js?v=20260310-score-save-fix-18";

function getSubInputTooltipText() {
    const alternateStat = ScoreManager.getAlternateConfig().stat;
    const key = alternateStat === "Baddy Points" ? "sub_input_for_points" : "sub_input_for_kills";
    const fallback = alternateStat === "Baddy Points" ? "Sub-Input for Points" : "Sub-Input for Kills";
    const translated = t(key);
    return translated && translated !== key ? translated : fallback;
}

function getSubInputStatTagText() {
    return ScoreManager.getAlternateConfig().stat === "Baddy Points" ? "pts" : "bks";
}

const SCORE_LINK_TOOLTIP_ID = "scoreLinkFloatingTooltip";
let activeScoreLinkTooltipTarget = null;
let scoreLinkTooltipListenersBound = false;

function getScoreLinkTooltipElement() {
    if (typeof document === "undefined" || !document.body) return null;
    let tooltip = document.getElementById(SCORE_LINK_TOOLTIP_ID);
    if (tooltip) return tooltip;
    tooltip = document.createElement("div");
    tooltip.id = SCORE_LINK_TOOLTIP_ID;
    tooltip.className = "score-link-tooltip-floating";
    tooltip.setAttribute("aria-hidden", "true");
    document.body.appendChild(tooltip);
    return tooltip;
}

function hideScoreLinkTooltip(target = null) {
    if (target && activeScoreLinkTooltipTarget !== target) return;
    activeScoreLinkTooltipTarget = null;
    const tooltip = getScoreLinkTooltipElement();
    if (!tooltip) return;
    tooltip.classList.remove("show");
    tooltip.setAttribute("aria-hidden", "true");
}

function updateScoreLinkTooltipPosition() {
    if (!activeScoreLinkTooltipTarget || !activeScoreLinkTooltipTarget.isConnected) {
        hideScoreLinkTooltip();
        return;
    }

    const tooltip = getScoreLinkTooltipElement();
    if (!tooltip) return;

    const anchorRect = activeScoreLinkTooltipTarget.getBoundingClientRect();
    const viewportPadding = 8;
    const anchorGap = 4;

    tooltip.style.left = `${Math.round(anchorRect.left + (anchorRect.width / 2))}px`;
    tooltip.style.top = `${Math.round(anchorRect.top - anchorGap)}px`;

    const tooltipRect = tooltip.getBoundingClientRect();
    const halfTooltipWidth = tooltipRect.width / 2;
    const minCenterX = viewportPadding + halfTooltipWidth;
    const maxCenterX = window.innerWidth - viewportPadding - halfTooltipWidth;
    const centeredX = anchorRect.left + (anchorRect.width / 2);
    const clampedCenterX = Math.max(minCenterX, Math.min(maxCenterX, centeredX));
    const minTop = viewportPadding + tooltipRect.height;
    const clampedTop = Math.max(minTop, anchorRect.top - anchorGap);

    tooltip.style.left = `${Math.round(clampedCenterX)}px`;
    tooltip.style.top = `${Math.round(clampedTop)}px`;
}

function showScoreLinkTooltip(target, text) {
    if (!target) return;
    const tooltip = getScoreLinkTooltipElement();
    if (!tooltip) return;
    activeScoreLinkTooltipTarget = target;
    tooltip.textContent = text || "";
    tooltip.classList.add("show");
    tooltip.setAttribute("aria-hidden", "false");
    updateScoreLinkTooltipPosition();
}

function bindScoreLinkTooltipViewportListeners() {
    if (scoreLinkTooltipListenersBound || typeof window === "undefined") return;
    scoreLinkTooltipListenersBound = true;

    window.addEventListener("resize", updateScoreLinkTooltipPosition, { passive: true });
    window.addEventListener("scroll", updateScoreLinkTooltipPosition, { passive: true, capture: true });
    document.addEventListener("pointerdown", (event) => {
        if (activeScoreLinkTooltipTarget && activeScoreLinkTooltipTarget.contains(event.target)) return;
        hideScoreLinkTooltip();
    }, { capture: true, passive: true });
}

export function setupScoreInputHandlers(options = {}) {
    const getLoginUrl = typeof options.getLoginUrl === "function"
        ? options.getLoginUrl
        : () => "/";
    const onRatingsUpdated = typeof options.onRatingsUpdated === "function"
        ? options.onRatingsUpdated
        : null;
    const onSubInputModeChanged = typeof options.onSubInputModeChanged === "function"
        ? options.onSubInputModeChanged
        : null;

    const scoreWrappers = Array.from(document.querySelectorAll(".score-input-wrapper"));
    const scoreLinkToggle = document.querySelector(".score-link-toggle");
    const scoreText = document.querySelector(".score-text");
    const isLocalDebugHost = (() => {
        try {
            const host = window.location && window.location.hostname ? window.location.hostname : "";
            return host === "localhost" || host === "127.0.0.1";
        } catch (_) {
            return false;
        }
    })();

    const redirectToLoginIfNeeded = () => {
        if (state.isViewMode) return true;
        if (auth.currentUser) return false;
        window.location.href = getLoginUrl();
        return true;
    };

    const updateScoreLinkToggleText = () => {
        if (!scoreLinkToggle) return;
        const tooltip = getSubInputTooltipText();
        scoreLinkToggle.dataset.tooltip = tooltip;
        scoreLinkToggle.setAttribute("aria-label", tooltip);
        scoreLinkToggle.removeAttribute("title");
        if (activeScoreLinkTooltipTarget === scoreLinkToggle) {
            showScoreLinkTooltip(scoreLinkToggle, tooltip);
        }
    };

    const syncScoreLinkToggleState = () => {
        if (!scoreLinkToggle) return;
        scoreLinkToggle.classList.toggle("score-link-toggle--active", !!state.subInputModeEnabled);
    };

    const syncScoreLinkTogglePosition = () => {
        if (!scoreText) return;
        const scoreLabel = scoreText.querySelector(".score-text-label");
        if (!scoreLabel) return;
        let labelWidth = 0;
        try {
            const labelRange = document.createRange();
            labelRange.selectNodeContents(scoreLabel);
            labelWidth = Math.ceil(labelRange.getBoundingClientRect().width || 0);
        } catch (error) {
            labelWidth = 0;
        }
        if (!labelWidth) {
            labelWidth = Math.max(0, Math.ceil(scoreLabel.scrollWidth || scoreLabel.offsetWidth || 0));
        }
        const isMobile = window.innerWidth <= 900 || document.body.classList.contains("mobile-layout-active");
        const extraGap = isMobile ? 8 : 7;
        const fallbackOffset = isMobile ? 23 : 22;
        const nextOffset = Math.max(fallbackOffset, Math.round((labelWidth / 2) + extraGap));
        scoreText.style.setProperty("--score-link-inline-offset", `${nextOffset}px`);
    };

    const scheduleScoreLinkTogglePositionSync = () => {
        requestAnimationFrame(() => {
            requestAnimationFrame(syncScoreLinkTogglePosition);
        });
    };

    const syncSubInputValue = (rowIndex) => {
        const wrapper = scoreWrappers[rowIndex];
        if (!wrapper) return;
        const subInput = wrapper.querySelector(".sub-score-input");
        const subOverlay = wrapper.querySelector(".sub-score-text-overlay");
        if (!subInput || !subOverlay) return;
        const value = ScoreManager.getAlternateScoreValueForRow(rowIndex);
        subInput.value = String(value);
        subOverlay.textContent = String(value);
    };

    const updateSubInputStatTags = () => {
        const nextTag = getSubInputStatTagText();
        scoreWrappers.forEach((wrapper) => {
            const statTag = wrapper.querySelector(".sub-score-stat-tag");
            if (!statTag) return;
            statTag.textContent = nextTag;
        });
    };

    const syncSubInputAccessibility = (wrapper, options = {}) => {
        if (!wrapper) return;
        const subInput = wrapper.querySelector(".sub-score-input");
        if (!subInput) return;
        const expanded = !!options.expanded;
        const enabled = !!state.subInputModeEnabled && !state.isViewMode && expanded;
        if (!enabled && document.activeElement === subInput && typeof subInput.blur === "function") {
            subInput.blur();
        }
        subInput.disabled = !enabled;
        subInput.tabIndex = enabled ? 0 : -1;
        wrapper.classList.toggle("sub-input-keyboard-enabled", enabled);
    };

    const syncAllSubInputAccessibility = () => {
        scoreWrappers.forEach((wrapper, rowIndex) => {
            syncSubInputAccessibility(wrapper, {
                expanded: rowIndex === state.activeSubInputRowIndex
            });
        });
    };

    const collapseSubInputs = (options = {}) => {
        const keepRowIndex = Number.isInteger(options.keepRowIndex) ? options.keepRowIndex : -1;
        scoreWrappers.forEach((wrapper, rowIndex) => {
            if (!wrapper) return;
            const shouldKeep = rowIndex === keepRowIndex;
            if (!shouldKeep) {
                const subInput = wrapper.querySelector(".sub-score-input");
                if (subInput && document.activeElement === subInput && typeof subInput.blur === "function") {
                    subInput.blur();
                }
                wrapper.classList.remove("sub-input-expanded");
            }
            syncSubInputAccessibility(wrapper, { expanded: shouldKeep });
        });
        state.activeSubInputRowIndex = keepRowIndex;
    };

    const expandSubInputForRow = (rowIndex) => {
        if (!state.subInputModeEnabled || state.isViewMode) return;
        const wrapper = scoreWrappers[rowIndex];
        if (!wrapper) return;
        collapseSubInputs({ keepRowIndex: rowIndex });
        syncSubInputValue(rowIndex);
        wrapper.classList.add("sub-input-expanded");
        state.activeSubInputRowIndex = rowIndex;
        syncSubInputAccessibility(wrapper, { expanded: true });
    };

    const setSubInputModeEnabled = (enabled) => {
        state.subInputModeEnabled = !!enabled && !state.isViewMode;
        writeString(SUB_INPUT_MODE_STORAGE_KEY, state.subInputModeEnabled ? "true" : "false");
        syncScoreLinkToggleState();
        updateScoreLinkToggleText();
        if (!state.subInputModeEnabled) {
            collapseSubInputs();
        } else if (state.activeSubInputRowIndex >= 0) {
            expandSubInputForRow(state.activeSubInputRowIndex);
        }
        document.dispatchEvent(new CustomEvent("benchmark:sub-input-mode-updated", {
            detail: { enabled: state.subInputModeEnabled }
        }));
        if (onSubInputModeChanged) {
            Promise.resolve(onSubInputModeChanged()).catch((error) => {
                console.error("Error saving sub-input mode setting:", error);
            });
        }
    };

    const shouldRevealSubInputForRow = (rowIndex) => (
        !!state.subInputModeEnabled
        && !state.isViewMode
        && state.activeSubInputRowIndex !== rowIndex
    );

    const ensureSubInputVisibleForRow = (rowIndex) => {
        if (redirectToLoginIfNeeded()) return false;
        if (!state.subInputModeEnabled || state.isViewMode) return false;
        expandSubInputForRow(rowIndex);
        return true;
    };

    if (scoreLinkToggle) {
        bindScoreLinkTooltipViewportListeners();
        const refreshToggleTooltip = () => {
            updateScoreLinkToggleText();
            showScoreLinkTooltip(scoreLinkToggle, scoreLinkToggle.dataset.tooltip || getSubInputTooltipText());
        };
        scoreLinkToggle.addEventListener("pointerenter", refreshToggleTooltip);
        scoreLinkToggle.addEventListener("focus", refreshToggleTooltip);
        scoreLinkToggle.addEventListener("pointerleave", () => {
            hideScoreLinkTooltip(scoreLinkToggle);
        });
        scoreLinkToggle.addEventListener("blur", () => {
            hideScoreLinkTooltip(scoreLinkToggle);
        });
        scoreLinkToggle.addEventListener("click", (event) => {
            updateScoreLinkToggleText();
            if (redirectToLoginIfNeeded()) return;
            event.preventDefault();
            event.stopPropagation();
            setSubInputModeEnabled(!state.subInputModeEnabled);
        });
    }

    scoreWrappers.forEach((wrapper, index) => {
        const input = wrapper.querySelector(".score-input");
        const subInput = wrapper.querySelector(".sub-score-input");
        if (!input || !subInput) return;

        const focusMainInput = () => {
            requestAnimationFrame(() => {
                if (state.isViewMode || !auth.currentUser) return;
                if (document.activeElement === input) return;
                input.focus({ preventScroll: true });
            });
        };

        wrapper.addEventListener("click", (event) => {
            if (event.target.closest(".sub-score-popout")) return;
            if (!shouldRevealSubInputForRow(index)) return;
            ensureSubInputVisibleForRow(index);
            focusMainInput();
            event.stopPropagation();
        });

        input.addEventListener("focus", function () {
            if (state.isViewMode) return;
            if (!auth.currentUser) {
                window.location.href = getLoginUrl();
                return;
            }

             if (state.subInputModeEnabled) {
                expandSubInputForRow(index);
            }

            state.focusedInputIndex = index;
            if (window.innerWidth > 900) {
                RankingUI.updateRowColors();
            }

            if (this.value === "0") {
                this.value = "";
                const overlay = this.parentElement ? this.parentElement.querySelector(".score-text-overlay") : null;
                if (overlay) overlay.textContent = "";
            } else {
                setTimeout(() => {
                    this.setSelectionRange(this.value.length, this.value.length);
                }, 0);
            }
        });

        input.addEventListener("input", function () {
            if (state.isViewMode) return;
            this.value = this.value.replace(/[^0-9]/g, "");
            const overlay = this.parentElement.querySelector(".score-text-overlay");
            if (overlay) {
                overlay.textContent = this.value;
            }
            RankingUI.updateAllRatings(onRatingsUpdated);
            ScoreManager.saveCurrentScores();
        });

        input.addEventListener("blur", function () {
            if (state.isViewMode) return;
            state.focusedInputIndex = -1;

            if (this.value === "") {
                this.value = "0";
            }
            const overlay = this.parentElement.querySelector(".score-text-overlay");
            if (overlay) {
                overlay.textContent = this.value;
            }
            RankingUI.updateAllRatings(onRatingsUpdated);
            ScoreManager.saveCurrentScores();
            if (isLocalDebugHost && auth.currentUser) {
                ScoreManager.saveSavedScores().catch(console.error);
            }
        });

        subInput.addEventListener("focus", function () {
            if (state.isViewMode) return;
            if (!auth.currentUser) {
                window.location.href = getLoginUrl();
                return;
            }

            state.focusedInputIndex = index;
            document.body.classList.add("score-input-focused");
            if (this.value === "0") {
                this.value = "";
                const overlay = wrapper.querySelector(".sub-score-text-overlay");
                if (overlay) overlay.textContent = "";
            } else {
                setTimeout(() => {
                    this.setSelectionRange(this.value.length, this.value.length);
                }, 0);
            }
        });

        subInput.addEventListener("input", function () {
            if (state.isViewMode) return;
            this.value = this.value.replace(/[^0-9]/g, "");
            const overlay = wrapper.querySelector(".sub-score-text-overlay");
            if (overlay) overlay.textContent = this.value;
            ScoreManager.setAlternateScoreValueForRow(index, this.value);
        });

        subInput.addEventListener("blur", function () {
            if (state.isViewMode) return;
            document.body.classList.remove("score-input-focused");
            state.focusedInputIndex = -1;
            if (this.value === "") {
                this.value = "0";
            }
            const overlay = wrapper.querySelector(".sub-score-text-overlay");
            if (overlay) overlay.textContent = this.value;
            ScoreManager.setAlternateScoreValueForRow(index, this.value);
            if (isLocalDebugHost && auth.currentUser) {
                ScoreManager.saveSavedScores().catch(console.error);
            }
        });
    });

    document.addEventListener("benchmark:scores-loaded", () => {
        updateScoreLinkToggleText();
        updateSubInputStatTags();
        scheduleScoreLinkTogglePositionSync();
        if (state.activeSubInputRowIndex >= 0) {
            syncSubInputValue(state.activeSubInputRowIndex);
        }
    });

    document.addEventListener("benchmark:clear-row-selection", () => {
        collapseSubInputs();
    });

    document.addEventListener("benchmark:collapse-sub-inputs", () => {
        collapseSubInputs();
    });

    document.addEventListener("benchmark:sub-input-mode-updated", (event) => {
        const nextEnabled = !!(event && event.detail && event.detail.enabled);
        state.subInputModeEnabled = nextEnabled && !state.isViewMode;
        syncScoreLinkToggleState();
        updateScoreLinkToggleText();
        scheduleScoreLinkTogglePositionSync();
        if (!state.subInputModeEnabled) {
            collapseSubInputs();
        } else if (state.activeSubInputRowIndex >= 0) {
            expandSubInputForRow(state.activeSubInputRowIndex);
        }
        syncAllSubInputAccessibility();
    });

    document.addEventListener("benchmark:language-applied", () => {
        scheduleScoreLinkTogglePositionSync();
    });

    window.addEventListener("resize", syncScoreLinkTogglePosition);

    document.addEventListener("pointerdown", (event) => {
        if (state.activeSubInputRowIndex < 0) return;
        const activeWrapper = scoreWrappers[state.activeSubInputRowIndex];
        if (!activeWrapper) return;
        if (activeWrapper.contains(event.target)) return;
        if (scoreLinkToggle && scoreLinkToggle.contains(event.target)) return;
        collapseSubInputs();
    }, true);

    updateScoreLinkToggleText();
    updateSubInputStatTags();
    syncScoreLinkToggleState();
    scheduleScoreLinkTogglePositionSync();
    syncAllSubInputAccessibility();
}
