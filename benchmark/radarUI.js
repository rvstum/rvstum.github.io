import { state } from "./appState.js";
import { getRadarData, getRadarRatings, getRadarCategoryValues, getFullCaveLabels } from "./radarData.js";
import { drawRadarChart, drawPieChart, drawBarGraph } from "./radarRenderer.js";

const RADAR_MODE_ORDER = ["combined", "swords", "bombs"];

export { getRadarData, getRadarRatings };
export { drawRadarChart, drawPieChart, drawBarGraph };

export function getRadarPalette(mode) {
    if (mode === "combined") return { type: "dual", swords: "#ef4444", bombs: "#3b82f6" };
    if (mode === "bombs") return { type: "single", color: "#3b82f6" };
    return { type: "single", color: "#ef4444" };
}

export function updateBarGraph() {
    const canvas = document.getElementById("radarBar");
    if (!canvas) return;
    drawBarGraph(canvas, getRadarCategoryValues(state.radarMode));
}

function updateRadarLists(items, palette, mode, splitIndex = 0) {
    const strongList = document.getElementById("radarStrongList");
    const weakList = document.getElementById("radarWeakList");
    if (!strongList || !weakList) return;
    const getItemColor = (itemIndex) => {
        if (palette && palette.type === "dual") {
            return itemIndex < splitIndex ? palette.swords : palette.bombs;
        }
        return palette ? palette.color : "#ffffff";
    };

    const filtered = items.filter((item) => item.value > 0);
    const baseStrong = items.slice(0, 3);
    const baseWeak = items.slice(-3).reverse();
    let strongest = [];
    let weakest = [];

    const sortedStrong = filtered.slice().sort((a, b) => {
        if (b.value !== a.value) return b.value - a.value;
        return a.index - b.index;
    });
    const sortedWeak = filtered.slice().sort((a, b) => {
        if (a.value !== b.value) return a.value - b.value;
        return a.index - b.index;
    });

    const padList = (list, fallback) => {
        const result = [...list];
        fallback.forEach((item) => {
            if (result.length >= 3) return;
            if (!result.some((entry) => entry.index === item.index)) {
                result.push(item);
            }
        });
        return result.slice(0, 3);
    };

    if (mode === "swords" || mode === "bombs") {
        if (filtered.length === 0) {
            strongest = baseStrong;
            weakest = baseWeak;
        } else if (filtered.length < 3) {
            strongest = padList(sortedStrong, baseStrong);
            weakest = padList(sortedWeak, baseWeak);
        } else {
            strongest = sortedStrong.slice(0, 3);
            weakest = sortedWeak.slice(0, 3);
        }
    } else {
        if (filtered.length === 0) {
            strongest = baseStrong;
            weakest = baseWeak;
        } else if (filtered.length < 3) {
            strongest = padList(sortedStrong, baseStrong);
            weakest = padList(sortedWeak, baseWeak);
        } else {
            strongest = sortedStrong.slice(0, 3);
            weakest = sortedWeak.slice(0, 3);
        }
    }

    const renderList = (list, data) => {
        list.innerHTML = "";
        data.forEach((item) => {
            const row = document.createElement("div");
            row.className = "radar-stat-item";
            row.style.setProperty("--radar-color", getItemColor(item.index));
            row.innerHTML = `
                <span>${item.label}</span>
                <span class="radar-stat-value">${item.percent}%</span>
                <div class="radar-bar"><span style="width:${item.percent}%;"></span></div>
            `;
            list.appendChild(row);
        });
    };

    renderList(strongList, strongest);
    renderList(weakList, weakest);
}

export function updateRadar() {
    const canvas = document.getElementById("radarCanvas");
    if (!canvas) return;
    const data = getRadarData();
    if (!data.labels.length) return;
    const fullLabels = getFullCaveLabels();
    const swordIcon = document.getElementById("radarSwordIcon");
    const bombIcon = document.getElementById("radarBombIcon");
    const palette = getRadarPalette(state.radarMode);
    let datasets = [];
    if (palette && palette.type === "dual") {
        datasets = [
            { values: data.bombsValues || [], color: palette.bombs },
            { values: data.swordsValues || [], color: palette.swords }
        ];
    } else {
        datasets = [{ values: data.values, color: palette ? palette.color : "#ffffff" }];
    }
    drawRadarChart(canvas, data.labels, datasets);

    const maxValue = data.maxValue || Math.max(1, ...data.rawValues);
    const items = data.labels.map((label, index) => {
        const raw = data.rawValues[index] || 0;
        const percent = Math.round(Math.max(0, Math.min(1, raw / maxValue)) * 100);
        const fullLabelIndex = state.radarMode === "bombs"
            ? ((data.splitIndex || 0) + index)
            : index;
        return {
            label: fullLabels[fullLabelIndex] || label,
            value: raw,
            percent,
            index
        };
    });
    updateRadarLists(items, palette, state.radarMode, data.splitIndex || 0);

    const donutCanvas = document.getElementById("radarDonut");
    const rawScores = getRadarRatings();
    const half = Math.floor(rawScores.length / 2);
    const swordsTotal = rawScores.slice(0, half).reduce((sum, val) => sum + val, 0);
    const bombsTotal = rawScores.slice(half).reduce((sum, val) => sum + val, 0);
    const iconsReady = (!swordIcon || swordIcon.complete) && (!bombIcon || bombIcon.complete);
    if (iconsReady) {
        drawPieChart(donutCanvas, swordsTotal, bombsTotal);
    } else {
        let remaining = 0;
        const refresh = () => {
            remaining -= 1;
            if (remaining <= 0) updateRadar();
        };
        if (swordIcon && !swordIcon.complete) {
            remaining += 1;
            swordIcon.addEventListener("load", refresh, { once: true });
        }
        if (bombIcon && !bombIcon.complete) {
            remaining += 1;
            bombIcon.addEventListener("load", refresh, { once: true });
        }
        drawPieChart(donutCanvas, swordsTotal, bombsTotal);
    }
}

export function setRadarMode(nextMode, persist = true) {
    const mode = RADAR_MODE_ORDER.includes(nextMode) ? nextMode : "combined";
    state.radarMode = mode;
    document.querySelectorAll(".radar-tab").forEach((tab) => {
        if (!tab.dataset || !tab.dataset.mode) return;
        tab.classList.toggle("active", tab.dataset.mode === mode);
    });
    updateRadar();
    updateBarGraph();
}

export function cycleRadarMode() {
    const next = state.radarMode === "bombs" ? "combined" : "bombs";
    setRadarMode(next);
}

export function setupRadarTabs() {
    const tabs = document.querySelectorAll(".radar-tab");
    if (!tabs.length) return;
    tabs.forEach((tab) => {
        if (!tab.dataset || !tab.dataset.mode) return;
        tab.addEventListener("click", () => {
            setRadarMode(tab.dataset.mode || "swords");
        });
    });
}
