import { state } from "./appState.js";
import { t } from "./i18n.js";
import { readJson, writeJson, SEASONAL_TROPHIES_STORAGE_KEY } from "./storage.js";
import { getCachedElementById, setHidden, setFlexVisible } from "./utils/domUtils.js";
import * as Slugs from "./slugs.js?v=20260310-public-slug-directory-1";

const SEASONAL_TROPHY_META = [
    { key: "1st", labelKey: "seasonal_place_1st", shortKey: "seasonal_place_1st", image: "../icons/1sttrophy.png", tier: "first" },
    { key: "2nd", labelKey: "seasonal_place_2nd", shortKey: "seasonal_place_2nd", image: "../icons/2ndtrophy.png", tier: "second" },
    { key: "3rd", labelKey: "seasonal_place_3rd", shortKey: "seasonal_place_3rd", image: "../icons/3rdtrophy.png", tier: "third" },
    { key: "plaque", labelKey: "seasonal_place_plaque", shortKey: "seasonal_place_plaque", image: "../icons/plaque.png", tier: "plaque" }
];
const TROPHY_DRAG_SELECTOR = ".trophy-img, .trophy-input-icon, .trophy-base, .trophy-layer, .rank-up-trophy, .friend-rank-icon";
let trophyDragPreventionBound = false;

function resolveTrophyAssetUrl(assetPath) {
    const raw = typeof assetPath === "string" ? assetPath.trim() : "";
    if (!raw || typeof window === "undefined") return raw;
    try {
        return new URL(raw, new URL(Slugs.getBenchmarkAppEntryUrl(), window.location.origin)).toString();
    } catch (e) {
        return raw;
    }
}

function disableTrophyImageDragging(root = document) {
    const targetRoot = root && typeof root.querySelectorAll === "function" ? root : document;
    targetRoot.querySelectorAll(TROPHY_DRAG_SELECTOR).forEach((el) => {
        el.setAttribute("draggable", "false");
        el.draggable = false;
    });
}

function bindTrophyGhostDragPrevention(doc = document) {
    if (!doc || trophyDragPreventionBound) return;
    doc.addEventListener("dragstart", (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        if (!target.matches(TROPHY_DRAG_SELECTOR) && !target.closest(TROPHY_DRAG_SELECTOR)) return;
        event.preventDefault();
    }, true);
    trophyDragPreventionBound = true;
}

function normalizeTrophyCount(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) return 0;
    return Math.min(50, Math.floor(parsed));
}

function readTrophyData() {
    let trophyData = { "1st": 0, "2nd": 0, "3rd": 0, "plaque": 0 };
    const saved = readJson(SEASONAL_TROPHIES_STORAGE_KEY, null);
    if (saved && typeof saved === "object" && !Array.isArray(saved)) {
        trophyData = saved;
    }
    return trophyData;
}

export function renderSeasonalTrophyList(list, trophyData) {
    if (!list) return 0;
    list.innerHTML = "";

    const counts = {};
    let total = 0;
    SEASONAL_TROPHY_META.forEach((meta) => {
        const count = normalizeTrophyCount(trophyData ? trophyData[meta.key] : 0);
        counts[meta.key] = count;
        total += count;
    });

    const header = document.createElement("div");
    header.className = "trophy-list-header";
    header.innerHTML = `
        <div class="seasonal-label">${t("seasonal_modal_title")}</div>
        <div class="seasonal-total"><span>${total}</span> ${t("seasonal_total_label")}</div>
    `;
    list.appendChild(header);

    const row = document.createElement("div");
    row.className = "trophy-row";
    SEASONAL_TROPHY_META.forEach((meta) => {
        const card = document.createElement("div");
        card.className = `trophy-card trophy-card-${meta.tier}`;

        const img = document.createElement("img");
        img.src = resolveTrophyAssetUrl(meta.image);
        img.className = "trophy-img";
        img.alt = t(meta.labelKey);
        img.setAttribute("draggable", "false");
        img.draggable = false;

        const info = document.createElement("div");
        info.className = "trophy-card-info";

        const label = document.createElement("div");
        label.className = "trophy-card-label";
        label.textContent = t(meta.shortKey);

        const count = document.createElement("div");
        count.className = "trophy-card-count";
        count.textContent = String(counts[meta.key]);

        info.appendChild(label);
        info.appendChild(count);
        card.appendChild(img);
        card.appendChild(info);
        row.appendChild(card);
    });

    list.appendChild(row);
    disableTrophyImageDragging(list);
    setFlexVisible(list, true);
    return total;
}

export function renderTrophies() {
    const list = getCachedElementById("trophyList");
    const placeholder = getCachedElementById("trophyPlaceholder");
    if (!list || !placeholder) return;

    renderSeasonalTrophyList(list, readTrophyData());
    disableTrophyImageDragging(document);
    setHidden(placeholder, true);
    setFlexVisible(list, true);
}

export function initTrophySystem(options = {}) {
    const saveUserData = typeof options.saveUserData === "function" ? options.saveUserData : null;
    const bindModalOverlayQuickClose = typeof options.bindModalOverlayQuickClose === "function"
        ? options.bindModalOverlayQuickClose
        : null;

    bindTrophyGhostDragPrevention(document);
    disableTrophyImageDragging(document);
    if (state.isViewMode) return;
    const placeholder = getCachedElementById("trophyPlaceholder");
    const list = getCachedElementById("trophyList");
    const modal = getCachedElementById("trophyModal");
    const closeBtn = getCachedElementById("closeTrophyModal");
    const saveBtn = getCachedElementById("saveTrophiesBtn");
    const resetBtn = getCachedElementById("resetTrophiesBtn");
    const inputs = {
        "1st": getCachedElementById("trophyInput1st"),
        "2nd": getCachedElementById("trophyInput2nd"),
        "3rd": getCachedElementById("trophyInput3rd"),
        plaque: getCachedElementById("trophyInputPlaque")
    };
    const totalEl = getCachedElementById("trophyModalTotal");
    let mobileFocusShell = null;
    let mobileFocusLabel = null;
    let mobileFocusInput = null;
    let activeMobileFocusSourceInput = null;

    if (!placeholder || !list || !modal || !closeBtn || !saveBtn) {
        return;
    }

    const isMobileTrophyViewport = () => (
        typeof window !== "undefined"
        && (
            window.innerWidth <= 900
            || document.body.classList.contains("mobile-layout-active")
        )
    );

    const clampTrophyInputValue = (rawValue) => {
        const normalized = String(rawValue == null ? "" : rawValue).replace(/[^0-9]/g, "");
        if (normalized === "") return "";
        return String(Math.min(50, Math.max(0, Number(normalized) || 0)));
    };

    const updateMobileFocusPosition = () => {
        if (!mobileFocusShell || !mobileFocusShell.classList.contains("show")) return;
        const root = document.documentElement;
        const baseHeight = parseFloat(root.style.getPropertyValue("--mobile-safe-vh-base"))
            || parseFloat(root.style.getPropertyValue("--mobile-safe-vh"))
            || window.innerHeight
            || root.clientHeight
            || 0;
        const centerY = baseHeight / 2;
        mobileFocusShell.style.setProperty("--trophy-mobile-focus-top", `${Math.round(centerY)}px`);
    };

    const closeMobileTrophyFocusEditor = () => {
        activeMobileFocusSourceInput = null;
        document.body.classList.remove("trophy-mobile-focus-open");
        if (!mobileFocusShell) return;
        mobileFocusShell.classList.remove("show");
        mobileFocusShell.removeAttribute("data-tier");
    };

    const ensureMobileTrophyFocusEditor = () => {
        if (mobileFocusShell) return;
        mobileFocusShell = document.createElement("div");
        mobileFocusShell.className = "trophy-mobile-focus-shell";
        mobileFocusShell.innerHTML = `
            <div class="trophy-mobile-focus-card">
                <div class="trophy-mobile-focus-top">
                    <div class="trophy-mobile-focus-label"></div>
                    <button type="button" class="trophy-mobile-focus-close" aria-label="Close">&times;</button>
                </div>
                <input type="number" class="trophy-mobile-focus-input" min="0" max="50" inputmode="numeric" placeholder="0">
            </div>
        `;
        document.body.appendChild(mobileFocusShell);
        mobileFocusLabel = mobileFocusShell.querySelector(".trophy-mobile-focus-label");
        mobileFocusInput = mobileFocusShell.querySelector(".trophy-mobile-focus-input");
        const closeBtnEl = mobileFocusShell.querySelector(".trophy-mobile-focus-close");

        if (closeBtnEl) {
            const handleCloseMobileFocus = (event) => {
                if (event) {
                    event.preventDefault();
                    event.stopPropagation();
                }
                closeMobileTrophyFocusEditor();
                if (mobileFocusInput && typeof mobileFocusInput.blur === "function") {
                    mobileFocusInput.blur();
                }
            };
            closeBtnEl.addEventListener("pointerdown", handleCloseMobileFocus);
            closeBtnEl.addEventListener("click", handleCloseMobileFocus);
        }

        if (mobileFocusInput) {
            mobileFocusInput.addEventListener("input", function () {
                if (!activeMobileFocusSourceInput) return;
                const nextValue = clampTrophyInputValue(this.value);
                this.value = nextValue;
                activeMobileFocusSourceInput.value = nextValue;
                updateTrophyModalTotal();
            });
            mobileFocusInput.addEventListener("keydown", (event) => {
                if (event.key === "Enter" || event.key === "Escape") {
                    event.preventDefault();
                    mobileFocusInput.blur();
                }
            });
            mobileFocusInput.addEventListener("blur", () => {
                setTimeout(() => {
                    if (mobileFocusShell && mobileFocusShell.contains(document.activeElement)) return;
                    closeMobileTrophyFocusEditor();
                }, 0);
            });
        }

        if (window.visualViewport) {
            window.visualViewport.addEventListener("resize", updateMobileFocusPosition, { passive: true });
            window.visualViewport.addEventListener("scroll", updateMobileFocusPosition, { passive: true });
        } else {
            window.addEventListener("resize", updateMobileFocusPosition, { passive: true });
        }
    };

    const openMobileTrophyFocusEditor = (sourceInput) => {
        if (!isMobileTrophyViewport() || !sourceInput) return false;
        ensureMobileTrophyFocusEditor();
        if (!mobileFocusShell || !mobileFocusInput || !mobileFocusLabel) return false;

        activeMobileFocusSourceInput = sourceInput;
        const row = sourceInput.closest(".trophy-input-row");
        const label = row ? row.querySelector(".trophy-input-label") : null;
        const tier = row && row.classList.contains("trophy-tier-first")
            ? "first"
            : row && row.classList.contains("trophy-tier-second")
                ? "second"
                : row && row.classList.contains("trophy-tier-third")
                    ? "third"
                    : "plaque";

        mobileFocusLabel.textContent = label ? (label.textContent || "").trim() : t("seasonal_modal_title");
        mobileFocusInput.value = sourceInput.value || "";
        mobileFocusShell.dataset.tier = tier;
        mobileFocusShell.classList.add("show");
        document.body.classList.add("trophy-mobile-focus-open");
        updateMobileFocusPosition();

        if (document.activeElement === sourceInput && typeof sourceInput.blur === "function") {
            sourceInput.blur();
        }
        mobileFocusInput.focus();
        try {
            mobileFocusInput.select();
        } catch (_) {}
        return true;
    };

    function updateTrophyModalTotal() {
        if (!totalEl) return;
        let total = 0;
        Object.values(inputs).forEach((input) => {
            if (!input) return;
            const parsed = parseInt(input.value, 10);
            if (!Number.isNaN(parsed) && parsed > 0) total += Math.min(parsed, 50);
        });
        totalEl.textContent = total.toLocaleString();
    }

    Object.values(inputs).forEach((input) => {
        if (!input) return;
        input.setAttribute("inputmode", "numeric");
        input.addEventListener("pointerdown", (event) => {
            if (!isMobileTrophyViewport()) return;
            if (event.pointerType === "mouse") return;
            event.preventDefault();
            openMobileTrophyFocusEditor(input);
        });
        input.addEventListener("focus", function () {
            if (isMobileTrophyViewport()) {
                openMobileTrophyFocusEditor(this);
                return;
            }
            this.select();
        });
        input.addEventListener("input", function () {
            this.value = clampTrophyInputValue(this.value);
            updateTrophyModalTotal();
        });
    });

    function openModal() {
        closeMobileTrophyFocusEditor();
        const trophyData = readTrophyData();
        Object.keys(inputs).forEach((key) => {
            if (inputs[key]) {
                inputs[key].value = trophyData[key] || 0;
            }
        });
        updateTrophyModalTotal();
        modal.classList.add("show");
    }

    function closeModal() {
        closeMobileTrophyFocusEditor();
        modal.classList.add("closing");
        setTimeout(() => {
            modal.classList.remove("show");
            modal.classList.remove("closing");
        }, 200);
    }

    async function save() {
        if (state.isViewMode) return;
        const trophyData = { "1st": 0, "2nd": 0, "3rd": 0, plaque: 0 };
        Object.keys(inputs).forEach((key) => {
            const input = inputs[key];
            if (!input) return;
            let val = parseInt(input.value, 10);
            if (Number.isNaN(val) || val < 0) val = 0;
            trophyData[key] = Math.min(val, 50);
        });

        writeJson(SEASONAL_TROPHIES_STORAGE_KEY, trophyData);
        if (saveUserData) {
            await saveUserData({ profile: { trophies: trophyData } });
        }
        renderTrophies();
        closeModal();
    }

    function resetInputs() {
        closeMobileTrophyFocusEditor();
        Object.values(inputs).forEach((input) => {
            if (input) input.value = 0;
        });
        updateTrophyModalTotal();
    }

    placeholder.addEventListener("click", () => {
        if (!state.isViewMode) openModal();
    });
    list.addEventListener("click", () => {
        if (!state.isViewMode) openModal();
    });
    closeBtn.addEventListener("click", closeModal);
    saveBtn.addEventListener("click", save);
    if (resetBtn) resetBtn.addEventListener("click", resetInputs);
    if (bindModalOverlayQuickClose) {
        bindModalOverlayQuickClose(modal, closeModal);
    }

    renderTrophies();
}
