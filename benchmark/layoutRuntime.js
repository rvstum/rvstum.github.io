import { CAVE_GROUPS } from "./constants.js";
import { isMobileViewport } from "./utils.js";

export function setupRatingValueClasses() {
    const divs = document.querySelectorAll(".rating-value");
    divs.forEach((div, index) => {
        div.classList.add(`rating-value-${index}`);
    });
}

export function restructureRatingsLayout() {
    if (!isMobileViewport()) return;
    const rows = document.querySelectorAll(".ranks-bars");
    const ratings = document.querySelectorAll(".rating-value");

    CAVE_GROUPS.forEach((group, index) => {
        const ratingEl = ratings[index];
        const firstRowIndex = group[0];
        const row = rows[firstRowIndex];
        if (ratingEl && row) {
            row.appendChild(ratingEl);
        }
    });
}

function restructureRankBox() {
    const rankBox = document.querySelector(".rounded-inner-box");
    const ranksWrapper = document.querySelector(".ranks-wrapper");
    const middleBox = document.querySelector(".middle-box");
    const infoIcon = document.querySelector(".info-icon");

    if (!rankBox || !ranksWrapper || !middleBox) return;

    const isMobile = isMobileViewport();
    const clearPlacement = (el) => {
        if (!el || !el.style) return;
        ["position", "top", "left", "right", "bottom", "width", "height", "min-height", "transform", "margin", "z-index"].forEach((prop) => {
            el.style.removeProperty(prop);
        });
    };

    if (isMobile) {
        if (rankBox.parentElement !== ranksWrapper) {
            ranksWrapper.insertBefore(rankBox, ranksWrapper.firstChild);
        }
        if (infoIcon && infoIcon.parentElement !== ranksWrapper) {
            ranksWrapper.appendChild(infoIcon);
        }
    } else {
        if (rankBox.parentElement !== middleBox) {
            middleBox.insertBefore(rankBox, middleBox.firstChild);
        }
        if (infoIcon && infoIcon.parentElement !== middleBox) {
            middleBox.appendChild(infoIcon);
        }
        clearPlacement(rankBox);
        clearPlacement(infoIcon);
    }
}

let restructureRankBoxRafId = null;

export function scheduleRestructureRankBox() {
    if (restructureRankBoxRafId !== null) return;
    restructureRankBoxRafId = requestAnimationFrame(() => {
        restructureRankBoxRafId = null;
        restructureRankBox();
    });
}

export function initRankBoxResponsive() {
    window.addEventListener("resize", scheduleRestructureRankBox, { passive: true });
    window.addEventListener("orientationchange", scheduleRestructureRankBox, { passive: true });
    window.addEventListener("load", scheduleRestructureRankBox);
    window.matchMedia("(max-width: 900px)").addEventListener("change", scheduleRestructureRankBox);
}
