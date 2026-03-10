import { state } from "./appState.js";
import { RANK_THRESHOLDS, RANK_COLORS, RANK_NAMES, RANK_TEXT_COLORS, RANK_LINE_COLORS, SCORE_TEXT_COLORS, STELLAR_TROPHY_FILTER, FINAL_RANK_INDEX, CAVE_GROUPS } from "./constants.js";
import { isMobileViewport } from "./utils.js";
import { calculateSingleRating, buildThresholdsFromBase } from "./scoring.js";
import { hexToRgba, darkenColor } from "./utils/colorUtils.js";
import * as Slugs from "./slugs.js?v=20260310-public-slug-directory-1";

const SCORE_PER_RANK = 100;

function resolveRankTrophyAssetUrl(assetPath) {
    const raw = typeof assetPath === "string" ? assetPath.trim() : "";
    if (!raw || typeof window === "undefined") return raw;
    try {
        return new URL(raw, new URL(Slugs.getBenchmarkAppEntryUrl(), window.location.origin)).toString();
    } catch (e) {
        return raw;
    }
}

function getRomanSubRank(progressPercent) {
    const value = Number.isFinite(progressPercent) ? progressPercent : 0;
    const clamped = Math.max(0, Math.min(100, value));
    if (clamped >= 80) return 'I';
    if (clamped >= 60) return 'II';
    if (clamped >= 40) return 'III';
    if (clamped >= 20) return 'IV';
    return 'V';
}

function getRowProgressTarget(score, thresholds) {
    if (!Array.isArray(thresholds) || thresholds.length === 0) return 0;
    let tierIndex = thresholds.length;
    for (let i = 0; i < thresholds.length; i++) {
        if (score < thresholds[i]) {
            tierIndex = i;
            break;
        }
    }
    if (tierIndex >= thresholds.length) return thresholds.length;
    const lowerBound = tierIndex > 0 ? thresholds[tierIndex - 1] : 0;
    const upperBound = thresholds[tierIndex];
    const range = upperBound - lowerBound;
    let pct = 0;
    if (range > 0) {
        pct = (score - lowerBound) / range;
    }
    pct = Math.max(0, Math.min(1, pct));
    return tierIndex + pct;
}

function getRowFillColorForProgress(progressValue, thresholdCount) {
    const maxTier = Math.max(0, thresholdCount);
    const tier = Math.max(0, Math.min(maxTier, Math.floor(progressValue)));
    let colorIndex = tier;
    if (colorIndex === 0) colorIndex = 1; 
    return RANK_COLORS[colorIndex] || RANK_COLORS[RANK_COLORS.length - 1];
}

function renderRowBarProgress(bars, progressValue, fillColor) {
    bars.forEach((bar, i) => {
        if (i < 2) return;
        const tierIndex = i - 2;
        const pct = Math.max(0, Math.min(100, (progressValue - tierIndex) * 100));
        bar.style.setProperty('--fill-percent', `${pct}%`);
        bar.style.setProperty('--fill-color', fillColor);
        bar.style.setProperty('--fill-duration', '0ms');
    });
}

export function updateMainProgressBarAndRanks() {
    const totalRating = state.individualRatings.reduce((sum, rating) => sum + rating, 0);
    const caveCount = Math.max(1, state.individualRatings.length || document.querySelectorAll('.score-input').length || 14);
    const maxRating = caveCount * FINAL_RANK_INDEX * SCORE_PER_RANK;
    const progressBar = document.querySelector('.progress-bar');

    let currentRankIndex = 0;
    for (let i = RANK_THRESHOLDS.length - 1; i > 0; i--) {
        if (totalRating >= RANK_THRESHOLDS[i]) {
            currentRankIndex = i;
            break;
        }
    }

    const rankChanged = state.lastMainRankIndex !== null && currentRankIndex !== state.lastMainRankIndex;
    const shouldAnimateRankUp = rankChanged && currentRankIndex > 0;

    const lowerBound = RANK_THRESHOLDS[currentRankIndex];
    const upperBound = (currentRankIndex + 1 < RANK_THRESHOLDS.length) ? RANK_THRESHOLDS[currentRankIndex + 1] : maxRating;

    const range = upperBound - lowerBound;
    const progressInRank = (range > 0) ? Math.min(100, ((totalRating - lowerBound) / range) * 100) : (totalRating >= upperBound ? 100 : 0);
    const progressDelta = Math.abs(progressInRank - state.lastProgressInRank);
    const progressTierDelta = (progressDelta / 100) * FINAL_RANK_INDEX;
    const mainFillDuration = (progressDelta <= 0.001)
        ? 0
        : Math.min(1000, Math.max(260, progressTierDelta * 300));

    if (progressBar) {
        const span = progressBar.querySelector('span');
        const fill = progressBar.querySelector('.progress-fill');
        if (span) {
            span.textContent = `${totalRating} / ${maxRating}`;
        }

        if (totalRating > 0) {
            let colorIndex = currentRankIndex;
            if (colorIndex === 0) colorIndex = 1;
            const startColor = RANK_COLORS[colorIndex];
            if (fill) {
                fill.style.setProperty('--main-fill-duration', `${mainFillDuration}ms`);
                const innerWidth = Math.max(0, progressBar.clientWidth);
                const rawWidth = (progressInRank / 100) * innerWidth;
                const visualWidth = Math.min(innerWidth, Math.max(rawWidth, 0));
                fill.style.width = `${visualWidth}px`;
                fill.style.backgroundColor = startColor;
            }
        } else {
            if (fill) {
                fill.style.setProperty('--main-fill-duration', '0ms');
                fill.style.width = '0px';
            }
        }

        const rankLines = progressBar.querySelectorAll('.rank-line');
        const originalColor = currentRankIndex === 0 ? '#444' : RANK_COLORS[currentRankIndex];
        const activeColor = RANK_LINE_COLORS[currentRankIndex] || '#444';
        const linePositions = [21.5, 41.5, 61.5, 81.5];
        const totalDuration = 600;

        rankLines.forEach((line, index) => {
            const threshold = linePositions[index];
            const isActive = progressInRank > threshold;
            let delay = 0;

            if (isActive && state.lastProgressInRank <= threshold && progressInRank > state.lastProgressInRank) {
                const totalDist = progressInRank - state.lastProgressInRank;
                const distToThreshold = threshold - state.lastProgressInRank;
                delay = (distToThreshold / totalDist) * totalDuration;
            } else if (!isActive && state.lastProgressInRank > threshold && progressInRank < state.lastProgressInRank) {
                const totalDist = state.lastProgressInRank - progressInRank;
                const distToThreshold = state.lastProgressInRank - threshold;
                delay = (distToThreshold / totalDist) * totalDuration;
            }

            line.style.transitionDelay = `${Math.max(0, delay)}ms`;
            const lineColor = isActive ? activeColor : originalColor;
            line.style.background = `linear-gradient(to bottom, transparent, ${lineColor} 15%, ${lineColor} 85%, transparent)`;
        });
    }

    const rankBox = document.querySelector('.rounded-inner-box');
    if (rankBox) {
        const romanContainer = document.querySelector('.roman-numerals-container');
        let name;
        const rankColor = RANK_TEXT_COLORS[currentRankIndex] || '#ffffff';
        rankBox.style.setProperty('--rank-up-color', hexToRgba(rankColor, 0.55));
        rankBox.style.setProperty('--rank-up-color-soft', hexToRgba(rankColor, 0.25));
        rankBox.style.setProperty('--rank-glow-core', hexToRgba(rankColor, 0.34));
        rankBox.style.setProperty('--rank-glow-mid', hexToRgba(rankColor, 0.18));
        rankBox.style.setProperty('--rank-glow-soft', hexToRgba(rankColor, 0.08));
        rankBox.style.setProperty('--rank-glow-halo', hexToRgba(rankColor, 0.24));
        rankBox.classList.toggle('rank-box-glow', currentRankIndex > 0);

        if (totalRating >= maxRating) {
            name = "Aeternus Complete";
        } else {
            const subRank = getRomanSubRank(progressInRank);
            name = `${RANK_NAMES[currentRankIndex]}&nbsp;<span class="rank-sub-rn">${subRank}</span>`;
        }
        
        if (romanContainer) {
            romanContainer.style.visibility = 'visible';
            romanContainer.style.opacity = '1';
        }

        if (currentRankIndex === 0) {
            rankBox.innerHTML = name;
            rankBox.style.color = '';
            rankBox.classList.remove('rank-up');
            rankBox.classList.remove('rank-box-glow');
        } else {
            let filter = '';
            let eternalLayerStyle = '';
            let textStyle = `color: ${RANK_TEXT_COLORS[currentRankIndex]};`;

            switch(currentRankIndex) {
                case 1: filter = 'grayscale(100%)'; break;
                case 2: filter = 'sepia(1) hue-rotate(-35deg) saturate(3) brightness(0.65)'; break;
                case 3: filter = 'grayscale(100%) brightness(1.3)'; break;
                case 4: filter = 'sepia(1) hue-rotate(5deg) saturate(2.5) brightness(0.9)'; break;
                case 5: filter = 'sepia(1) hue-rotate(130deg) saturate(1.5) brightness(1.1)'; break;
                case 6: filter = 'sepia(1) hue-rotate(170deg) saturate(3) brightness(1.0)'; break;
                case 7: filter = 'sepia(1) hue-rotate(220deg) saturate(3) brightness(0.9)'; break;
                case 8: filter = 'sepia(1) hue-rotate(10deg) saturate(5) brightness(1.2)'; break;
                case 9: filter = 'sepia(1) hue-rotate(330deg) saturate(5) brightness(0.8)'; break;
                case 10: filter = 'sepia(1) hue-rotate(120deg) saturate(2) brightness(0.9)'; break;
                case 11: 
                    filter = STELLAR_TROPHY_FILTER; 
                    eternalLayerStyle = `background: linear-gradient(110deg, #FF6F00 20%, #FF8F00 40%, #FFA000 48%, #FFB300 50%, #FFA000 52%, #FF8F00 60%, #FF6F00 80%); background-size: 200% auto; animation: eternalTrophyShimmer 2.5s linear infinite;`;
                    textStyle = `background: linear-gradient(110deg, #FF6F00 20%, #FF8F00 40%, #FFA000 48%, #FFB300 50%, #FFA000 52%, #FF8F00 60%, #FF6F00 80%); background-size: 200% auto; -webkit-background-clip: text; background-clip: text; color: transparent; animation: eternalShimmer 2.5s linear infinite;`;
                    break;
                case 12: 
                    filter = 'sepia(1) hue-rotate(290deg) saturate(3) brightness(0.9)'; 
                    eternalLayerStyle = `background: linear-gradient(110deg, #D8007F 20%, #E91E63 35%, #F06292 45%, #FF80AB 50%, #F06292 55%, #E91E63 65%, #D8007F 80%); background-size: 300% auto; animation: eternalTrophyShimmer 2.5s linear infinite;`;
                    textStyle = `background: linear-gradient(110deg, #D8007F 20%, #E91E63 35%, #F06292 45%, #FF80AB 50%, #F06292 55%, #E91E63 65%, #D8007F 80%); background-size: 200% auto; -webkit-background-clip: text; background-clip: text; color: transparent; animation: eternalShimmer 2.5s linear infinite;`;
                    break;
                case 13: 
                    filter = 'sepia(1) hue-rotate(2deg) saturate(0.74) brightness(1.16)'; 
                    eternalLayerStyle = `background: linear-gradient(110deg, #b6a26a 20%, #d4c18a 35%, #ead9a6 48%, #f8ecc0 50%, #ead9a6 52%, #d4c18a 65%, #b6a26a 80%); background-size: 200% auto; animation: eternalTrophyShimmer 2.5s linear infinite;`;
                    textStyle = `background: linear-gradient(110deg, #cab98a 20%, #e5d9b6 35%, #f2e9cf 48%, #fff7e5 50%, #f2e9cf 52%, #e5d9b6 65%, #cab98a 80%); background-size: 200% auto; -webkit-background-clip: text; background-clip: text; color: transparent; animation: eternalShimmer 2.5s linear infinite;`;
                    break;
            }

            const existingText = rankBox.querySelector('.rank-up-text');
            if (currentRankIndex === state.lastMainRankIndex && existingText) {
                if (existingText.innerHTML !== name) {
                    existingText.innerHTML = name;
                }
            } else {
                rankBox.innerHTML = `
                    <div class="rank-up-content">
                        <div class="rank-up-icon-wrap">
                            <img src="${resolveRankTrophyAssetUrl("../icons/trophy.png")}" class="rank-up-trophy" style="filter: ${filter};">
                            ${eternalLayerStyle ? `<div class="eternal-layer-main rank-up-trophy-layer" style="${eternalLayerStyle}"></div>` : ''}
                            
                        </div>
                        <span class="rank-up-text rank-up-text-base" style="${textStyle}">${name}</span>
                    </div>
                `;
            }
        }

        if (shouldAnimateRankUp) {
            rankBox.classList.remove('rank-up');
        }
    }

    state.lastProgressInRank = progressInRank;
    state.lastMainRankIndex = currentRankIndex;

    const rows = document.querySelectorAll('.ranks-bars');
    const inputs = document.querySelectorAll('.score-input');

    rows.forEach((row, rowIndex) => {
        const bars = row.querySelectorAll('.rank-bar');
        const input = inputs[rowIndex];
        if (!input) return;

        const currentScore = Number(input.value);

        const thresholds = state.allRowThresholds[rowIndex] || state.allRowThresholds[0] || [];
        const targetProgress = getRowProgressTarget(currentScore, thresholds);
        const targetFillColor = getRowFillColorForProgress(targetProgress, thresholds.length);
        if (!state.rowFillAnimationStates[rowIndex]) {
            state.rowFillAnimationStates[rowIndex] = { value: targetProgress, rafId: null };
        }
        const rowState = state.rowFillAnimationStates[rowIndex];
        if (!Number.isFinite(rowState.value)) rowState.value = targetProgress;
        if (rowState.rafId) {
            cancelAnimationFrame(rowState.rafId);
            rowState.rafId = null;
        }

        const paint = (progressValue) => {
            renderRowBarProgress(bars, progressValue, targetFillColor);
        };

        const delta = targetProgress - rowState.value;
        if (Math.abs(delta) <= 0.0001) {
            row.classList.add('instant-update');
            rowState.value = targetProgress;
            paint(rowState.value);
            return;
        }

        row.classList.remove('instant-update');
        const startValue = rowState.value;
        const duration = Math.min(1000, Math.max(260, Math.abs(delta) * 300));
        const startTime = performance.now();

        const step = (now) => {
            const t = Math.min(1, (now - startTime) / duration);
            const eased = 1 - Math.pow(1 - t, 3);
            rowState.value = startValue + (delta * eased);
            paint(rowState.value);
            if (t < 1) {
                rowState.rafId = requestAnimationFrame(step);
            } else {
                rowState.value = targetProgress;
                paint(rowState.value);
                rowState.rafId = null;
            }
        };

        rowState.rafId = requestAnimationFrame(step);
    });
}

export function updateRowColors() {
    const scoreInputs = document.querySelectorAll('.score-input');
    const stripes = document.querySelectorAll('.bg-stripe');
    const isMobile = isMobileViewport();
    
    scoreInputs.forEach((input, idx) => {
        const wrapper = input.parentElement;
        const overlay = wrapper.querySelector('.score-text-overlay');
        if (!wrapper || !overlay) return;

        let rankIndex = 0;
        const rating = state.individualRatings[idx];
        if (rating > 0) {
            rankIndex = Math.min(FINAL_RANK_INDEX, Math.floor(rating / 100));
        }

        wrapper.style.background = '';
        wrapper.style.setProperty('--score-box-accent-inline', 'transparent');
        wrapper.style.setProperty('--score-content-offset-inline', isMobile ? '0px' : '4px');
        wrapper.style.setProperty('--score-input-active-color', 'white');
        wrapper.style.setProperty('--sub-score-box-bg', '#242424');
        wrapper.style.setProperty('--sub-score-box-accent', 'transparent');
        wrapper.style.setProperty('--sub-score-text-color', 'white');
        wrapper.style.setProperty('--sub-score-input-active-color', 'white');
        overlay.style.background = '';
        overlay.style.webkitBackgroundClip = '';
        overlay.style.backgroundClip = '';
        overlay.style.color = 'white';
        overlay.style.animation = '';
        overlay.style.backgroundSize = '';

        if (rankIndex > 0) {
            overlay.style.color = SCORE_TEXT_COLORS[rankIndex];
            wrapper.style.setProperty('--score-input-active-color', SCORE_TEXT_COLORS[rankIndex]);
            wrapper.style.background = darkenColor(RANK_COLORS[rankIndex], 0.6);
            wrapper.style.setProperty('--score-box-accent-inline', darkenColor(RANK_COLORS[rankIndex], 0.28));
            wrapper.style.setProperty('--sub-score-box-bg', darkenColor(RANK_COLORS[rankIndex], 0.76));
            wrapper.style.setProperty('--sub-score-box-accent', darkenColor(RANK_COLORS[rankIndex], 0.44));
            wrapper.style.setProperty('--sub-score-text-color', SCORE_TEXT_COLORS[rankIndex]);
            wrapper.style.setProperty('--sub-score-input-active-color', SCORE_TEXT_COLORS[rankIndex]);
        }
    });

    stripes.forEach((stripe, index) => {
        if (index < CAVE_GROUPS.length) {
            const groupIndices = CAVE_GROUPS[index];
            let maxRank = 0;
            groupIndices.forEach(i => {
                const rating = state.individualRatings[i];
                const rank = rating >= 100 ? Math.min(FINAL_RANK_INDEX, Math.floor(rating / 100)) : 0;
                if (rank > maxRank) maxRank = rank;
            });

            const isFocused = !isMobile && groupIndices.includes(state.focusedInputIndex);

            if (isFocused && maxRank === 0) {
                stripe.style.background = 'none';
                stripe.classList.remove('stripe-active');
            } else if (isFocused && maxRank > 1) {
                stripe.style.background = `linear-gradient(to right, transparent, ${hexToRgba(RANK_COLORS[maxRank], 0.25)})`;
                stripe.classList.add('stripe-active');
            } else if (isFocused && maxRank === 1) {
                stripe.style.background = 'linear-gradient(to right, transparent, rgba(255, 255, 255, 0.08))';
                stripe.classList.add('stripe-active');
            } else if (maxRank > 1) {
                stripe.style.background = `linear-gradient(to right, transparent, ${hexToRgba(RANK_COLORS[maxRank], 0.25)})`;
                stripe.classList.add('stripe-active');
            } else if (maxRank === 1) {
                stripe.style.background = 'linear-gradient(to right, transparent, rgba(255, 255, 255, 0.08))';
                stripe.classList.add('stripe-active');
            } else {
                stripe.style.background = 'none';
                stripe.classList.remove('stripe-active');
            }
        }
    });
}

function recomputeIndividualRatings(scoreInputs) {
    scoreInputs.forEach((input, index) => {
        const score = Number(input.value);
        const thresholds = state.allRowThresholds[index] || state.allRowThresholds[0] || [];
        state.individualRatings[index] = calculateSingleRating(score, thresholds);
    });
}

function renderGroupRatingValues() {
    const ratingValueDivs = document.querySelectorAll('.rating-value');
    ratingValueDivs.forEach((div, index) => {
        if (index >= CAVE_GROUPS.length) return;

        const groupIndices = CAVE_GROUPS[index];
        const combinedRating = groupIndices.reduce((sum, i) => sum + state.individualRatings[i], 0);
        div.textContent = combinedRating;

        let maxRank = 0;
        groupIndices.forEach((i) => {
            const rating = state.individualRatings[i];
            const rank = rating >= 100 ? Math.min(FINAL_RANK_INDEX, Math.floor(rating / 100)) : 0;
            if (rank > maxRank) maxRank = rank;
        });

        div.style.background = '';
        div.style.webkitBackgroundClip = '';
        div.style.backgroundClip = '';
        div.style.color = combinedRating > 0 ? SCORE_TEXT_COLORS[maxRank] : 'white';
        div.style.animation = '';
        div.style.backgroundSize = '';
    });
}

export function updateAllRatings(callback) {
    const scoreInputs = document.querySelectorAll('.score-input');
    recomputeIndividualRatings(scoreInputs);

    if (state.ratingUpdateRafId) cancelAnimationFrame(state.ratingUpdateRafId);
    state.ratingUpdateRafId = requestAnimationFrame(() => {
        renderGroupRatingValues();
        updateMainProgressBarAndRanks();
        updateRowColors();
        document.dispatchEvent(new Event('benchmark:row-ranks-updated'));
        if (callback) callback();
        state.ratingUpdateRafId = null;
    });
}

export function updateScoreRequirements(baseScores, preserveRowFillStates = false) {
    const rows = document.querySelectorAll('.ranks-bars');
    state.allRowThresholds = [];
    state.individualRatings = new Array(rows.length).fill(0);
    state.rowFillAnimationStates.forEach(s => {
        if (s && s.rafId) cancelAnimationFrame(s.rafId);
    });
    if (!preserveRowFillStates) {
        state.rowFillAnimationStates = [];
    }

    rows.forEach((row, rowIndex) => {
        const bars = row.querySelectorAll('.rank-bar');
        if (!bars.length) return;
        const base = Number(baseScores[rowIndex] ?? baseScores[0] ?? 0);
        const thresholds = buildThresholdsFromBase(base);
        state.allRowThresholds[rowIndex] = thresholds;

        for (let rankIndex = FINAL_RANK_INDEX; rankIndex >= 1; rankIndex--) {
            const box = bars[rankIndex + 1];
            if (!box) continue;
            box.innerHTML = `<span class="rank-threshold-value">${thresholds[rankIndex - 1]}</span>`;
            box.classList.add('rank-threshold-cell');
        }
    });

    updateAllRatings();
}
