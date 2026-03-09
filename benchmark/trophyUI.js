import { state } from "./appState.js";
import { t } from "./i18n.js";
import { readJson, writeJson, SEASONAL_TROPHIES_STORAGE_KEY } from "./storage.js";
import { getCachedElementById, setHidden, setFlexVisible } from "./utils/domUtils.js";

const SEASONAL_TROPHY_META = [
    { key: "1st", labelKey: "seasonal_place_1st", shortKey: "seasonal_place_1st", image: "../icons/1sttrophy.png", tier: "first" },
    { key: "2nd", labelKey: "seasonal_place_2nd", shortKey: "seasonal_place_2nd", image: "../icons/2ndtrophy.png", tier: "second" },
    { key: "3rd", labelKey: "seasonal_place_3rd", shortKey: "seasonal_place_3rd", image: "../icons/3rdtrophy.png", tier: "third" },
    { key: "plaque", labelKey: "seasonal_place_plaque", shortKey: "seasonal_place_plaque", image: "../icons/plaque.png", tier: "plaque" }
];
const TROPHY_DRAG_SELECTOR = ".trophy-img, .trophy-input-icon, .trophy-base, .trophy-layer, .rank-up-trophy, .friend-rank-icon";
let trophyDragPreventionBound = false;

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
        img.src = meta.image;
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

    if (!placeholder || !list || !modal || !closeBtn || !saveBtn) {
        return;
    }

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
        input.addEventListener("focus", function () {
            this.select();
        });
        input.addEventListener("input", function () {
            if (this.value > 50) this.value = 50;
            if (this.value < 0) this.value = 0;
            updateTrophyModalTotal();
        });
    });

    function openModal() {
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
