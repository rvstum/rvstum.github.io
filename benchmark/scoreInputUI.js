import { auth } from "./client.js";
import { state } from "./appState.js";
import * as RankingUI from "./rankingUI.js?v=20260310-mobile-score-caret-fix-1";
import * as ScoreManager from "./scoreManager.js?v=20260309-view-mode-rank-trophy-fix-2";

export function setupScoreInputHandlers(options = {}) {
    const getLoginUrl = typeof options.getLoginUrl === "function"
        ? options.getLoginUrl
        : () => "/";
    const onRatingsUpdated = typeof options.onRatingsUpdated === "function"
        ? options.onRatingsUpdated
        : null;

    document.querySelectorAll(".score-input").forEach((input, index) => {
        input.addEventListener("focus", function () {
            if (state.isViewMode) return;
            if (!auth.currentUser) {
                window.location.href = getLoginUrl();
                return;
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
        });
    });
}
