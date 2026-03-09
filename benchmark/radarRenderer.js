import { state } from "./appState.js";
import { isMobileViewport } from "./utils.js";
import { hexToRgba } from "./utils/colorUtils.js";
import { RADAR_BAR_COLORS } from "./constants.js";

function resizeRadarCanvas(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const ratio = dpr > 1 ? Math.min(3, Math.ceil(dpr)) : 1;
    const width = Math.max(canvas.clientWidth, 1);
    const height = Math.max(canvas.clientHeight, 1);
    const nextWidth = Math.floor(width * ratio);
    const nextHeight = Math.floor(height * ratio);
    if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
        canvas.width = nextWidth;
        canvas.height = nextHeight;
    }
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
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
    datasets.forEach((dataset) => {
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
    ctx.font = isMobile ? "8px Arial, sans-serif" : "7px Arial, sans-serif";
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

export function drawPieChart(canvas, swordsTotal, bombsTotal) {
    if (!canvas) return;
    const ctx = resizeRadarCanvas(canvas);
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    ctx.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;
    const total = swordsTotal + bombsTotal;

    const isPacman = state.pacmanModeEnabled;
    const shouldRenderPacman = isPacman
        && total > 0
        && swordsTotal !== bombsTotal
        && swordsTotal > 0
        && bombsTotal > 0;

    const isMobile = isMobileViewport();
    const isSmallMobile = window.innerWidth <= 400;
    const baseRadius = Math.min(width, height) * (isMobile ? (isSmallMobile ? 0.30 : 0.36) : 0.44);

    const slices = [
        { label: "Swords", value: swordsTotal, color: "#ef4444" },
        { label: "Bombs", value: bombsTotal, color: "#3b82f6" }
    ].map((slice) => ({
        ...slice,
        angle: total > 0 ? (slice.value / total) * Math.PI * 2 : 0
    }));

    if (shouldRenderPacman) {
        const sorted = [...slices].sort((a, b) => b.value - a.value);
        const big = sorted[0];
        const small = sorted[1];
        if (big) big.color = "#FFEB3B";
        if (small) small.color = "#ffffff";
    }

    if (total <= 0) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2);
        ctx.fill();
        return;
    }

    const maxIndex = slices.reduce((maxIdx, slice, idx) => (
        slice.value > slices[maxIdx].value ? idx : maxIdx
    ), 0);

    const minVisualAngle = 0.18;
    const totalAngle = Math.PI * 2;
    const displayAngles = slices.map((slice) => slice.angle);
    if (slices[0].angle > 0 && slices[1].angle > 0) {
        const smallIndex = slices[0].angle < slices[1].angle ? 0 : 1;
        if (slices[smallIndex].angle < minVisualAngle) {
            displayAngles[smallIndex] = minVisualAngle;
            displayAngles[1 - smallIndex] = totalAngle - minVisualAngle;
        }
    }
    slices.forEach((slice, idx) => {
        slice.displayAngle = displayAngles[idx];
    });

    const hasTwoSlices = slices[0].value > 0 && slices[1].value > 0;
    const explodedIndex = hasTwoSlices && slices[0].value !== slices[1].value
        ? (slices[0].value < slices[1].value ? 0 : 1)
        : -1;
    const shouldExplode = explodedIndex !== -1;
    const popOut = shouldExplode ? (isMobile ? 9 : 12) : 0;
    const shrinkAmount = shouldExplode ? (isMobile ? 13 : 16) : 0;
    const gapWidth = 6;
    const fixedLabelGap = 32;
    const edgePadding = isMobile ? 18 : 10;
    const iconSize = isMobile ? 16 : 20;
    const iconTextGap = isMobile ? 8 : 12;
    const percentOffsetY = 12;
    const textHalfHeight = 6;

    ctx.font = "10px Arial, sans-serif";
    const getIconDrawSize = (img, targetArea = null) => {
        if (!img || !img.naturalWidth || !img.naturalHeight) {
            return { width: iconSize, height: iconSize };
        }
        let scale = iconSize / Math.max(img.naturalWidth, img.naturalHeight);
        if (targetArea && targetArea > 0) {
            const areaScale = Math.sqrt(targetArea / (img.naturalWidth * img.naturalHeight));
            scale = Math.min(scale, areaScale);
        }
        return {
            width: img.naturalWidth * scale,
            height: img.naturalHeight * scale
        };
    };

    const swordImgRef = document.getElementById("radarSwordIcon");
    const swordDrawRef = getIconDrawSize(swordImgRef);
    const swordAreaRef = swordDrawRef.width * swordDrawRef.height;

    let start = -Math.PI / 2;
    slices.forEach((slice, index) => {
        if (slice.displayAngle <= 0) {
            start += slice.displayAngle;
            return;
        }
        const sliceStart = start;
        const sliceEnd = sliceStart + slice.displayAngle;
        const isExploded = index === explodedIndex && popOut > 0;
        const radius = isExploded ? Math.max(baseRadius - shrinkAmount, baseRadius * 0.72) : baseRadius;
        const mid = sliceStart + slice.displayAngle / 2;
        const offsetX = isExploded ? Math.cos(mid) * popOut : 0;
        const offsetY = isExploded ? Math.sin(mid) * popOut : 0;
        const sliceCenterX = centerX + offsetX;
        const sliceCenterY = centerY + offsetY;
        slice.startAngle = sliceStart;
        slice.endAngle = sliceEnd;
        slice.midAngle = mid;
        slice.renderCenterX = sliceCenterX;
        slice.renderCenterY = sliceCenterY;
        slice.renderRadius = radius;
        slice.isExploded = isExploded;
        ctx.save();
        ctx.fillStyle = slice.color;
        ctx.beginPath();
        ctx.moveTo(sliceCenterX, sliceCenterY);
        ctx.arc(sliceCenterX, sliceCenterY, radius, sliceStart, sliceEnd);
        ctx.closePath();
        ctx.fill();
        if (shouldExplode) {
            ctx.lineJoin = "round";
            ctx.lineCap = "round";
            ctx.lineWidth = 1.25;
            ctx.strokeStyle = slice.color;
            ctx.stroke();
        }
        ctx.restore();
        start = sliceEnd;

        if (shouldRenderPacman && index === maxIndex) {
            const eyeAngle = index === 0
                ? (start - slice.displayAngle) + (slice.displayAngle * 0.15)
                : start - (slice.displayAngle * 0.15);
            const eyeDist = radius * 0.70;
            const eyeX = sliceCenterX + Math.cos(eyeAngle) * eyeDist;
            const eyeY = sliceCenterY + Math.sin(eyeAngle) * eyeDist;
            const eyeRadius = radius * 0.085;
            ctx.fillStyle = "#000000";
            ctx.beginPath();
            ctx.arc(eyeX, eyeY, eyeRadius, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    if (shouldExplode && explodedIndex >= 0) {
        const explodedSlice = slices[explodedIndex];
        const explodedCenterX = Number.isFinite(explodedSlice.renderCenterX) ? explodedSlice.renderCenterX : centerX;
        const explodedCenterY = Number.isFinite(explodedSlice.renderCenterY) ? explodedSlice.renderCenterY : centerY;
        const explodedRadius = Number.isFinite(explodedSlice.renderRadius) ? explodedSlice.renderRadius : baseRadius;
        const explodedGapWidth = Math.max(3.5, gapWidth - 1.5);
        const cutRadius = explodedRadius + 4;
        ctx.save();
        ctx.globalCompositeOperation = "destination-out";
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.lineWidth = explodedGapWidth;
        [explodedSlice.startAngle, explodedSlice.endAngle].forEach((angle) => {
            if (!Number.isFinite(angle)) return;
            ctx.beginPath();
            ctx.moveTo(explodedCenterX, explodedCenterY);
            ctx.lineTo(
                explodedCenterX + Math.cos(angle) * cutRadius,
                explodedCenterY + Math.sin(angle) * cutRadius
            );
            ctx.stroke();
        });
        ctx.restore();
    } else if (hasTwoSlices && !shouldExplode) {
        const dividerAngles = [
            -Math.PI / 2,
            -Math.PI / 2 + slices[0].displayAngle
        ];
        const cutRadius = baseRadius + 4;
        ctx.save();
        ctx.globalCompositeOperation = "destination-out";
        ctx.lineCap = "round";
        dividerAngles.forEach((angle) => {
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineWidth = gapWidth;
            ctx.lineTo(centerX + Math.cos(angle) * cutRadius, centerY + Math.sin(angle) * cutRadius);
            ctx.stroke();
        });
        ctx.restore();
    }

    start = -Math.PI / 2;
    ctx.textBaseline = "middle";
    slices.forEach((slice, index) => {
        if (slice.displayAngle <= 0) {
            start += slice.displayAngle;
            return;
        }
        const mid = Number.isFinite(slice.midAngle) ? slice.midAngle : (start + slice.displayAngle / 2);
        const isExploded = !!slice.isExploded;
        const sliceCenterX = Number.isFinite(slice.renderCenterX) ? slice.renderCenterX : centerX;
        const sliceCenterY = Number.isFinite(slice.renderCenterY) ? slice.renderCenterY : centerY;
        const sliceRadius = Number.isFinite(slice.renderRadius) ? slice.renderRadius : baseRadius;

        ctx.fillStyle = slice.color;
        const percent = Math.round((slice.value / total) * 100);
        const label = slice.label;
        const percentLabel = percent === 0 && slice.value > 0 ? "<1%" : `${percent}%`;
        const labelWidth = ctx.measureText(label).width;
        const percentWidth = ctx.measureText(percentLabel).width;
        const iconIdForSize = label.toLowerCase() === "swords" ? "radarSwordIcon" : "radarBombIcon";
        const iconImgForSize = document.getElementById(iconIdForSize);
        const iconDraw = iconIdForSize === "radarBombIcon"
            ? getIconDrawSize(iconImgForSize, swordAreaRef)
            : getIconDrawSize(iconImgForSize);
        const textWidth = Math.max(labelWidth, percentWidth, iconDraw.width);
        const blockHalfWidth = textWidth / 2;
        const labelRadius = sliceRadius + fixedLabelGap + (isExploded ? 2 : 0);
        const topSpan = iconDraw.height + iconTextGap + 2;
        const bottomSpan = percentOffsetY + textHalfHeight + 2;
        const sideSpan = blockHalfWidth + 2;
        const bounds = {
            minX: edgePadding + sideSpan,
            maxX: width - edgePadding - sideSpan,
            minY: edgePadding + topSpan,
            maxY: height - edgePadding - bottomSpan
        };
        const iconKey = label.toLowerCase() === "swords" ? "sword" : "bomb";
        let centerLabelX;
        let centerLabelY;
        const cosMid = Math.cos(mid);
        const sinMid = Math.sin(mid);
        const outwardExtra = isMobile ? (isSmallMobile ? 4 : 8) : 8;
        const desiredRadius = labelRadius + outwardExtra;
        const minOutsideRadius = sliceRadius + 4;
        const inBounds = (x, y) => (
            x >= bounds.minX
            && x <= bounds.maxX
            && y >= bounds.minY
            && y <= bounds.maxY
        );
        let chosen = null;
        for (let r = desiredRadius; r >= minOutsideRadius; r -= 2) {
            const maxDelta = Math.PI * 0.75;
            const step = 0.04;
            for (let delta = 0; delta <= maxDelta; delta += step) {
                const candidates = delta === 0 ? [mid] : [mid + delta, mid - delta];
                let found = false;
                for (const ang of candidates) {
                    const x = sliceCenterX + Math.cos(ang) * r;
                    const y = sliceCenterY + Math.sin(ang) * r;
                    if (inBounds(x, y)) {
                        chosen = { x, y };
                        found = true;
                        break;
                    }
                }
                if (found) break;
            }
            if (chosen) break;
        }
        if (chosen) {
            centerLabelX = chosen.x;
            centerLabelY = chosen.y;
        } else {
            centerLabelX = Math.max(bounds.minX, Math.min(bounds.maxX, sliceCenterX + cosMid * desiredRadius));
            centerLabelY = Math.max(bounds.minY, Math.min(bounds.maxY, sliceCenterY + sinMid * desiredRadius));
        }
        centerLabelX = Math.max(bounds.minX, Math.min(bounds.maxX, centerLabelX));
        centerLabelY = Math.max(bounds.minY, Math.min(bounds.maxY, centerLabelY));

        const labelY = Math.round(centerLabelY);
        const percentY = Math.round(centerLabelY + percentOffsetY);
        const iconCenterY = Math.round(centerLabelY - (iconDraw.height / 2 + iconTextGap));
        const iconId = iconKey === "sword" ? "radarSwordIcon" : "radarBombIcon";
        const iconImg = document.getElementById(iconId);
        const labelCenterAlignedX = Math.round(centerLabelX);
        if (iconImg && iconImg.complete) {
            const rotation = -Math.PI * 1.5;
            ctx.save();
            ctx.translate(labelCenterAlignedX, iconCenterY);
            ctx.rotate(rotation);
            const drawSize = iconId === "radarBombIcon"
                ? getIconDrawSize(iconImg, swordAreaRef)
                : getIconDrawSize(iconImg);
            ctx.drawImage(iconImg, -drawSize.width / 2, -drawSize.height / 2, drawSize.width, drawSize.height);
            ctx.restore();
        }
        ctx.textAlign = "center";
        ctx.globalAlpha = 0.95;
        ctx.fillText(label, centerLabelX, labelY);
        ctx.globalAlpha = 0.7;
        ctx.fillText(percentLabel, centerLabelX, percentY);
        ctx.textAlign = "center";
        ctx.globalAlpha = 1;
        start += slice.displayAngle;
    });

    if (!shouldExplode) {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2);
        ctx.stroke();
    }
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
    const padding = isMobile
        ? { top: 20, bottom: 30, left: 25, right: 5 }
        : { top: 20, bottom: 30, left: 45, right: 10 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const count = data.length;
    const barWidth = (chartWidth / count) * 0.4;
    const spacing = (chartWidth / count) * 0.6;

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
    ctx.lineTo(padding.left, height - padding.bottom);
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.font = isMobile ? (isSmallMobile ? "8px Arial, sans-serif" : "10px Arial, sans-serif") : "9px Arial, sans-serif";
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
        const val = (maxVal / steps) * i;
        const y = (height - padding.bottom) - ((val / maxVal) * chartHeight);
        ctx.fillText(Math.round(val), padding.left - 6, y);
        if (val > 0 && i < steps) {
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(padding.left - 3, y);
            ctx.stroke();
        }
    }

    ctx.font = isMobile ? (isSmallMobile ? "7px Arial, sans-serif" : "9px Arial, sans-serif") : "9px Arial, sans-serif";
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

        ctx.fillStyle = textColor;
        ctx.fillText(item.label, x + barWidth / 2, padding.top + chartHeight + 8);

        if (item.value > 0) {
            ctx.font = isMobile ? (isSmallMobile ? "7px Arial, sans-serif" : "9px Arial, sans-serif") : "9px Arial, sans-serif";
            ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
            ctx.fillText(Math.round(item.value), x + barWidth / 2, y - 14);
        }
    });
}
