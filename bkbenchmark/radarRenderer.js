import { isMobileViewport } from "./utils.js";
import { hexToRgba } from "./utils/colorUtils.js";
import { RADAR_BAR_COLORS } from "./constants.js";

function resizeRadarCanvas(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const ratio = dpr > 1 ? Math.min(3, Math.ceil(dpr)) : 1;
    // Never pin the canvas to a fixed pixel size: an inline width measured on desktop stayed on the canvas after
    // switching to a mobile width, so the charts kept their desktop size and ran off the screen. The CSS (100% of
    // its wrapper) decides the display size; here we only match the backing store to it.
    canvas.style.removeProperty("width");
    canvas.style.removeProperty("height");
    const width = Math.max(canvas.clientWidth, 1);
    const height = Math.max(canvas.clientHeight, 1);
    const nextWidth = Math.floor(width * ratio);
    const nextHeight = Math.floor(height * ratio);
    if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
        canvas.width = nextWidth;
        canvas.height = nextHeight;
    }
    const ctx = canvas.getContext("2d");
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    return ctx;
}

export function drawRadarChart(canvas, labels, datasets) {
    if (!canvas || !labels.length || !datasets || !datasets.length) return;
    const ctx = resizeRadarCanvas(canvas);
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    ctx.clearRect(0, 0, width, height);

    const computed = getComputedStyle(document.documentElement);
    const gridColor = computed.getPropertyValue("--panel-border").trim() || "rgba(255,255,255,0.12)";
    const textColor = computed.getPropertyValue("--app-text").trim() || "#e0e0e0";

    const centerX = width / 2;
    const centerY = height / 2;
    const isMobile = isMobileViewport();
    const isSmallMobile = window.innerWidth <= 400;
    const is412x915 = isMobile
        && window.innerWidth >= 400
        && window.innerWidth <= 430
        && window.innerHeight >= 880
        && window.innerHeight <= 940;
    const radius = Math.min(width, height) * (isMobile ? (isSmallMobile ? 0.29 : 0.38) : 0.34);
    const rings = 4;

    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.6;
    for (let i = 1; i <= rings; i++) {
        const r = radius * (i / rings);
        ctx.beginPath();
        ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
        ctx.stroke();
    }

    const count = labels.length;
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count - Math.PI / 2;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(x, y);
        ctx.stroke();
    }

    ctx.globalAlpha = 1;
    ctx.lineWidth = 2;

    // Combined view: Swords and Bombs are two datasets that are each zero on the other half of the axes. Drawn as two
    // separate polygons they leave an empty wedge between the red and the blue at both seams. Instead, split the one
    // merged outline at the midpoint of each seam edge so the red and blue halves meet exactly, with no gap.
    const isSplitDual = datasets.length === 2
        && datasets.every((d) => d && d.values && d.values.length === count)
        && datasets[0].values.every((v, i) => !(v > 0 && datasets[1].values[i] > 0));
    if (isSplitDual) {
        const merged = datasets[0].values.map((v, i) => Math.max(v || 0, datasets[1].values[i] || 0));
        const point = (i, r = merged[i]) => {
            const angle = (Math.PI * 2 * i) / count - Math.PI / 2;
            return { x: centerX + Math.cos(angle) * radius * r, y: centerY + Math.sin(angle) * radius * r };
        };
        const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
        const owner = (i) => (datasets[0].values[i] > 0 ? 0 : (datasets[1].values[i] > 0 ? 1 : (i < Math.floor(count / 2) ? 1 : 0)));
        // Owner per vertex: the first dataset that has a value there (zero values fall back to the half they sit in).
        const groups = [[], []];
        for (let i = 0; i < count; i++) groups[owner(i)].push(i);
        groups.forEach((indices, g) => {
            if (!indices.length) return;
            const dataset = datasets[g];
            const color = dataset.color || "#ffffff";
            const first = indices[0];
            const last = indices[indices.length - 1];
            const before = mid(point((first - 1 + count) % count), point(first));
            const after = mid(point(last), point((last + 1) % count));
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(before.x, before.y);
            indices.forEach((i) => {
                const p = point(i);
                ctx.lineTo(p.x, p.y);
            });
            ctx.lineTo(after.x, after.y);
            ctx.closePath();
            ctx.fillStyle = hexToRgba(color, 0.2);
            ctx.fill();
            // Outline only the outer edge (not the edges through the center where the two halves meet).
            ctx.beginPath();
            ctx.moveTo(before.x, before.y);
            indices.forEach((i) => {
                const p = point(i);
                ctx.lineTo(p.x, p.y);
            });
            ctx.lineTo(after.x, after.y);
            ctx.strokeStyle = color;
            ctx.lineJoin = "round";
            ctx.stroke();
        });
    }

    datasets.forEach((dataset) => {
        if (isSplitDual) return;
        if (!dataset || !dataset.values || !dataset.values.length) return;
        const color = dataset.color || "#ffffff";
        ctx.strokeStyle = color;
        ctx.fillStyle = hexToRgba(color, 0.2);
        ctx.beginPath();
        dataset.values.forEach((value, i) => {
            const angle = (Math.PI * 2 * i) / count - Math.PI / 2;
            const r = radius * value;
            const x = centerX + Math.cos(angle) * r;
            const y = centerY + Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    });

    ctx.fillStyle = textColor;
    ctx.font = isMobile ? "700 8px Arial, sans-serif" : "700 7px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    const labelRadius = radius + (isSmallMobile ? 12 : 18);
    const crisp = (value) => Math.round(value);
    labels.forEach((label, i) => {
        const angle = (Math.PI * 2 * i) / count - Math.PI / 2;
        let x = centerX + Math.cos(angle) * labelRadius;
        const y = centerY + Math.sin(angle) * labelRadius;
        if (is412x915 && Math.abs(Math.cos(angle)) > 0.6) {
            x += (centerX - x) * 0.12;
        }
        ctx.fillText(label, crisp(x), crisp(y));
    });
}

// Swords vs Bombs chart: a thick ring split into the two totals, with the percentages stacked in the center.
// The Bombs/Swords legend with matching percentages lives in the DOM beneath the canvas.
export function drawPieChart(canvas, swordsTotal, bombsTotal) {
    if (!canvas) return;
    const ctx = resizeRadarCanvas(canvas);
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    ctx.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;
    const total = swordsTotal + bombsTotal;
    const isMobile = isMobileViewport();
    const isSmallMobile = window.innerWidth <= 400;
    const baseRadius = Math.min(width, height) * (isMobile ? (isSmallMobile ? 0.34 : 0.38) : 0.42);
    const ringWidth = baseRadius * (isMobile ? 0.34 : 0.32);
    const ringMidRadius = baseRadius - ringWidth / 2;

    if (total <= 0) {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
        ctx.lineWidth = ringWidth;
        ctx.beginPath();
        ctx.arc(centerX, centerY, ringMidRadius, 0, Math.PI * 2);
        ctx.stroke();
        return;
    }

    const slices = [
        { value: swordsTotal, color: "#ef4444" },
        { value: bombsTotal, color: "#3b82f6" }
    ].map((slice) => ({ ...slice, angle: (slice.value / total) * Math.PI * 2 }));

    const hasTwoSlices = slices[0].value > 0 && slices[1].value > 0;
    const gapAngle = hasTwoSlices ? 0.05 : 0;

    ctx.lineCap = "round";
    let start = -Math.PI / 2;
    slices.forEach((slice) => {
        if (slice.angle <= 0) {
            start += slice.angle;
            return;
        }
        const half = gapAngle / 2;
        const sliceStart = start + half;
        const sliceEnd = start + slice.angle - half;
        if (sliceEnd > sliceStart) {
            ctx.strokeStyle = slice.color;
            ctx.lineWidth = ringWidth;
            ctx.beginPath();
            ctx.arc(centerX, centerY, ringMidRadius, sliceStart, sliceEnd);
            ctx.stroke();
        }
        start += slice.angle;
    });

    const bombsPercent = Math.round((bombsTotal / total) * 100);
    const swordsPercent = Math.round((swordsTotal / total) * 100);
    const centerFontSize = isMobile ? (isSmallMobile ? 14 : 16) : 18;
    const lineGap = centerFontSize * 0.95;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 ${centerFontSize}px Arial, sans-serif`;
    ctx.fillStyle = "#3b82f6";
    ctx.fillText(`${bombsPercent}%`, centerX, centerY - lineGap / 2);
    ctx.fillStyle = "#ef4444";
    ctx.fillText(`${swordsPercent}%`, centerX, centerY + lineGap / 2);
}

export function drawBarGraph(canvas, data) {
    if (!canvas || !data || !data.length) return;
    const ctx = resizeRadarCanvas(canvas);
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    ctx.clearRect(0, 0, width, height);

    const computed = getComputedStyle(document.documentElement);
    const textColor = computed.getPropertyValue("--app-text").trim() || "#e0e0e0";

    const isMobile = isMobileViewport();
    const isSmallMobile = window.innerWidth <= 400;
    const barLabelFont = isMobile
        ? (isSmallMobile ? "9px Arial, sans-serif" : "11px Arial, sans-serif")
        : "8px Arial, sans-serif";
    const barValueFont = isMobile
        ? (isSmallMobile ? "9px Arial, sans-serif" : "11px Arial, sans-serif")
        : "11px Arial, sans-serif";
    let mobileBottomPadding = 54;
    if (isMobile) {
        ctx.save();
        ctx.font = barLabelFont;
        const maxLabelWidth = data.reduce((maxWidth, item) => {
            const label = String(item && item.label ? item.label : "");
            return Math.max(maxWidth, Math.ceil(ctx.measureText(label).width));
        }, 0);
        ctx.restore();
        mobileBottomPadding = Math.max(54, Math.min(92, maxLabelWidth + 14));
    }
    const padding = isMobile
        ? { top: 20, bottom: mobileBottomPadding, left: 25, right: 5 }
        : { top: 20, bottom: 30, left: 45, right: 10 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const axisBottomY = height - padding.bottom;

    const count = data.length;
    const barWidth = (chartWidth / count) * 0.62;
    const spacing = (chartWidth / count) * 0.38;

    let maxVal = 0;
    data.forEach((d) => {
        if (d.value > maxVal) maxVal = d.value;
    });
    if (maxVal < 1300) maxVal = 1300;
    maxVal = Math.ceil(maxVal / 100) * 100;

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, axisBottomY);
    ctx.lineTo(width - padding.right, axisBottomY);
    ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.font = isMobile ? (isSmallMobile ? "10px Arial, sans-serif" : "12px Arial, sans-serif") : "11px Arial, sans-serif";
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
        const val = (maxVal / steps) * i;
        const y = axisBottomY - ((val / maxVal) * chartHeight);
        ctx.fillText(Math.round(val), padding.left - 6, y);
        if (val > 0 && i < steps) {
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(padding.left - 3, y);
            ctx.stroke();
        }
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    data.forEach((item, i) => {
        const x = padding.left + (i * (barWidth + spacing)) + spacing / 2;
        const barHeight = (item.value / maxVal) * chartHeight;
        const y = padding.top + (chartHeight - barHeight);
        const barColor = RADAR_BAR_COLORS[item.label] || "rgba(255, 255, 255, 0.15)";

        if (item.value > 0) {
            ctx.strokeStyle = barColor;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();
        }

        ctx.fillStyle = barColor;
        ctx.fillRect(x, y, barWidth, barHeight);

        ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, barWidth, barHeight);

        ctx.font = barLabelFont;
        ctx.fillStyle = textColor;
        if (isMobile) {
            ctx.save();
            ctx.translate(x + barWidth / 2, padding.top + chartHeight + 6);
            ctx.rotate(-Math.PI / 2);
            ctx.textAlign = "right";
            ctx.textBaseline = "middle";
            ctx.fillText(item.label, 0, 0);
            ctx.restore();
        } else {
            ctx.fillText(item.label, x + barWidth / 2, padding.top + chartHeight + 8);
        }

        if (item.value > 0) {
            ctx.font = barValueFont;
            ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
            ctx.fillText(Math.round(item.value), x + barWidth / 2, y - 14);
        }
    });

    if (isMobile) {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding.left, axisBottomY);
        ctx.lineTo(width - padding.right, axisBottomY);
        ctx.stroke();
    }
}
