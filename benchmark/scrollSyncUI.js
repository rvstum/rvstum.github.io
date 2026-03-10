import { state } from "./appState.js";
import { FINAL_RANK_INDEX, RANK_TEXT_COLORS } from "./constants.js";
import { colorWithAlpha, darkenColor } from "./utils/colorUtils.js";

function toWholePx(value) {
    return Math.round(Number(value) || 0);
}

function getElementMaxScrollX(el) {
    if (!el) return 0;
    return Math.max(0, (el.scrollWidth || 0) - (el.clientWidth || 0));
}

export function initScoreInputsScrollSync() {
    const scrollEl = document.getElementById("ranksBarsContainer")
        || document.querySelector(".ranks-bars-stack");
    const benchmarkContainer = document.getElementById("benchmarkGridContainer")
        || document.querySelector(".container");
    const panelsScrollEl = document.getElementById("benchmarkPanelsScroll")
        || document.querySelector(".benchmark-panels-scroll");
    if (!scrollEl) return;

    const scoreWrappers = Array.from(document.querySelectorAll(".score-input-wrapper"));
    const ratingValues = Array.from(document.querySelectorAll(".rating-value"));
    const originalScoreWrapperStyles = scoreWrappers.map((w) => ({
        parent: w.parentNode,
        position: w.style.position,
        top: w.style.top,
        left: w.style.left,
        right: w.style.right,
        width: w.style.width,
        height: w.style.height,
        margin: w.style.margin,
        zIndex: w.style.zIndex,
        transform: w.style.transform,
        display: w.style.display,
        alignItems: w.style.alignItems,
        justifyContent: w.style.justifyContent
    }));
    ratingValues.forEach((v) => {
        v.dataset.desktopTop = v.style.top;
        v.dataset.desktopHeight = v.style.height;
    });
    const ratingOriginalStyles = ratingValues.map((v) => ({ position: v.style.position, top: v.style.top }));

    let mobileMode = false;

    function enterMobileMode() {
        if (mobileMode) return;
        mobileMode = true;
        const rows = scrollEl.querySelectorAll(".ranks-bars");
        scoreWrappers.forEach((w, i) => {
            if (!rows[i]) return;
            rows[i].style.position = "relative";
            rows[i].appendChild(w);
            w.style.position = "absolute";
            w.style.top = "50%";
            w.style.left = "calc(var(--mobile-cave-start, 36px) + 245px)";
            w.style.right = "auto";
            w.style.width = "70px";
            w.style.height = "var(--mobile-cave-row-height, 36px)";
            w.style.margin = "0";
            w.style.zIndex = "20";
            w.style.transform = "translateY(-50%)";
        });
    }

    function exitMobileMode() {
        if (!mobileMode) return;
        mobileMode = false;
        scoreWrappers.forEach((w, i) => {
            const original = originalScoreWrapperStyles[i];
            if (!original || !original.parent) return;
            original.parent.appendChild(w);
            w.style.position = original.position;
            w.style.top = original.top;
            w.style.left = original.left;
            w.style.right = original.right;
            w.style.width = original.width;
            w.style.height = original.height;
            w.style.margin = original.margin;
            w.style.zIndex = original.zIndex;
            w.style.transform = original.transform;
            w.style.display = original.display;
            w.style.alignItems = original.alignItems;
            w.style.justifyContent = original.justifyContent;
        });
    }

    function repositionScoreInputs() {
        if (window.innerWidth > 900) {
            exitMobileMode();
            return;
        }
        enterMobileMode();
    }

    const caveText = document.querySelector(".cave-text");
    const scoreText = document.querySelector(".score-text");
    const progressionText = document.querySelector(".progression-text");
    const ratingText = document.querySelector(".rating-text");

    function repositionRatingValues() {
        if (window.innerWidth > 900) return;
        const container = document.querySelector(".container");
        if (!container) return;
        const stripes = Array.from(container.querySelectorAll(".bg-stripe"));
        ratingValues.forEach((v, i) => {
            const stripe = stripes[i];
            if (!stripe) return;
            const stripeTop = parseFloat(stripe.style.top) || 0;
            const stripeHeight = parseFloat(stripe.style.height) || 0;
            const isSingleRow = stripeHeight <= 40;
            const midY = stripeTop + stripeHeight / 2;
            v.style.position = "absolute";
            v.style.top = `${toWholePx(midY - (isSingleRow ? 19 : 9))}px`;
        });
    }

    const ranksWrapper = document.querySelector(".ranks-wrapper");
    const ranksScroll = document.querySelector(".ranks-scroll");
    const ranksScrollEl = ranksScroll || ranksWrapper;
    const rankBox = document.querySelector(".rounded-inner-box");
    const infoIcon = document.querySelector(".info-icon");
    const isUnifiedMobileScrollMode = () => window.innerWidth <= 900 && !!panelsScrollEl;
    const clearMobileFloatingOffsets = () => {
        if (rankBox) rankBox.style.removeProperty("--mobile-rank-scroll-offset");
        if (infoIcon) infoIcon.style.removeProperty("--mobile-info-scroll-offset");
    };

    if (scrollEl) scrollEl.style.scrollBehavior = "auto";
    if (ranksScrollEl) ranksScrollEl.style.scrollBehavior = "auto";

    const syncOffset = 0;
    let syncSource = null;
    let syncReleaseRaf = 0;

    const getSharedMaxScrollX = () => {
        if (isUnifiedMobileScrollMode()) return getElementMaxScrollX(panelsScrollEl);
        if (!ranksScrollEl) return getElementMaxScrollX(scrollEl);
        return Math.min(getElementMaxScrollX(scrollEl), getElementMaxScrollX(ranksScrollEl));
    };

    const clampSharedScrollX = (value) => {
        const max = getSharedMaxScrollX();
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) return 0;
        return Math.max(0, Math.min(max, numeric));
    };

    const syncMobileFloatingOffsets = (value) => {
        if (window.innerWidth > 900 || isUnifiedMobileScrollMode()) {
            clearMobileFloatingOffsets();
            return;
        }
        const offsetValue = `${toWholePx(-value)}px`;
        if (rankBox) rankBox.style.setProperty("--mobile-rank-scroll-offset", offsetValue);
        if (infoIcon) infoIcon.style.setProperty("--mobile-info-scroll-offset", offsetValue);
    };

    const syncBothToSharedX = (value, sourceEl = null) => {
        if (isUnifiedMobileScrollMode()) {
            if (scrollEl.scrollLeft !== 0) scrollEl.scrollLeft = 0;
            if (ranksScrollEl && ranksScrollEl.scrollLeft !== 0) ranksScrollEl.scrollLeft = 0;
            syncMobileFloatingOffsets(0);
            return panelsScrollEl ? panelsScrollEl.scrollLeft || 0 : 0;
        }
        if (sourceEl) markSyncSource(sourceEl);
        const clamped = clampSharedScrollX(value);
        if (Math.abs(scrollEl.scrollLeft - clamped) > 0.25) {
            scrollEl.scrollLeft = clamped;
        }
        if (ranksScrollEl && Math.abs(ranksScrollEl.scrollLeft - clamped) > 0.25) {
            ranksScrollEl.scrollLeft = clamped;
        }
        syncMobileFloatingOffsets(clamped);
        return clamped;
    };

    const markSyncSource = (sourceEl) => {
        syncSource = sourceEl;
        if (syncReleaseRaf) cancelAnimationFrame(syncReleaseRaf);
        syncReleaseRaf = requestAnimationFrame(() => {
            syncSource = null;
            syncReleaseRaf = 0;
        });
    };

    const syncFromSourceToTarget = (sourceEl, targetEl, rawLeft) => {
        if (!sourceEl) return;
        if (syncSource && syncSource !== sourceEl) return;

        const clamped = clampSharedScrollX(rawLeft);
        syncMobileFloatingOffsets(clamped);
        const sourceNeedsClamp = Math.abs(sourceEl.scrollLeft - clamped) > 0.25;
        const targetNeedsSync = targetEl && Math.abs(targetEl.scrollLeft - clamped) > 0.25;
        if (!sourceNeedsClamp && !targetNeedsSync) return;

        markSyncSource(sourceEl);
        if (sourceNeedsClamp) sourceEl.scrollLeft = clamped;
        if (targetNeedsSync) targetEl.scrollLeft = clamped;
    };

    if (ranksScrollEl) {
        let touchStartX = 0;
        let touchStartY = 0;
        let touchStartSharedX = 0;
        let dragAxis = null;
        let queuedSharedX = null;
        let queuedSharedRaf = 0;
        let momentumRaf = 0;
        let momentumVelocity = 0;
        let lastTouchX = 0;
        let lastTouchTime = 0;
        let lastWheelTime = 0;
        let wheelMomentumTimeout = 0;

        const cancelMomentum = (resetVelocity = false) => {
            if (momentumRaf) {
                cancelAnimationFrame(momentumRaf);
                momentumRaf = 0;
            }
            if (resetVelocity) momentumVelocity = 0;
        };

        const queueSharedSync = (nextSharedX) => {
            queuedSharedX = clampSharedScrollX(nextSharedX);
            if (queuedSharedRaf) return;
            queuedSharedRaf = requestAnimationFrame(() => {
                queuedSharedRaf = 0;
                if (queuedSharedX === null) return;
                syncBothToSharedX(queuedSharedX, ranksScrollEl);
                queuedSharedX = null;
            });
        };

        const startMomentum = () => {
            if (Math.abs(momentumVelocity) < 0.02) {
                momentumVelocity = 0;
                return;
            }
            cancelMomentum(false);
            let previousTs = performance.now();
            const step = (ts) => {
                const dt = Math.max(1, ts - previousTs);
                previousTs = ts;
                const base = queuedSharedX === null
                    ? clampSharedScrollX(ranksScrollEl.scrollLeft)
                    : queuedSharedX;
                const next = base + (momentumVelocity * dt);
                const clamped = clampSharedScrollX(next);
                queueSharedSync(clamped);
                const sharedMax = getSharedMaxScrollX();
                const atEdge = clamped <= 0.5 || clamped >= sharedMax - 0.5;
                const decay = Math.exp(-dt * 0.01);
                momentumVelocity *= decay;
                if (atEdge || Math.abs(momentumVelocity) < 0.02) {
                    momentumVelocity = 0;
                    momentumRaf = 0;
                    return;
                }
                momentumRaf = requestAnimationFrame(step);
            };
            momentumRaf = requestAnimationFrame(step);
        };

        const scheduleWheelMomentum = () => {
            if (wheelMomentumTimeout) clearTimeout(wheelMomentumTimeout);
            wheelMomentumTimeout = setTimeout(() => {
                wheelMomentumTimeout = 0;
                startMomentum();
            }, 28);
        };

        const horizontalDragSurfaces = Array.from(new Set(
            [ranksScrollEl, rankBox, infoIcon].filter((el) => Boolean(el))
        ));

        const handleHorizontalTouchStart = (e) => {
            if (isUnifiedMobileScrollMode()) return;
            if (!e.touches || !e.touches.length) return;
            cancelMomentum(true);
            if (wheelMomentumTimeout) {
                clearTimeout(wheelMomentumTimeout);
                wheelMomentumTimeout = 0;
            }
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            touchStartSharedX = clampSharedScrollX(ranksScrollEl.scrollLeft);
            lastTouchX = touchStartX;
            lastTouchTime = performance.now();
            dragAxis = null;
        };

        const handleHorizontalTouchMove = (e) => {
            if (isUnifiedMobileScrollMode()) return;
            if (!e.touches || !e.touches.length) return;
            const touch = e.touches[0];
            const dx = touch.clientX - touchStartX;
            const dy = touch.clientY - touchStartY;
            if (dragAxis === null) {
                if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
                dragAxis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
            }
            if (dragAxis !== "x") return;
            markRecentMobileHorizontalScroll();
            e.preventDefault();
            const now = performance.now();
            const dt = Math.max(1, now - lastTouchTime);
            const pointerDeltaX = touch.clientX - lastTouchX;
            const instantaneousVelocity = (-pointerDeltaX) / dt;
            momentumVelocity = (momentumVelocity * 0.72) + (instantaneousVelocity * 0.28);
            lastTouchX = touch.clientX;
            lastTouchTime = now;
            const deltaX = touchStartX - touch.clientX;
            queueSharedSync(touchStartSharedX + deltaX);
        };

        const handleHorizontalWheel = (e) => {
            if (isUnifiedMobileScrollMode()) return;
            const hasDeltaX = Math.abs(e.deltaX || 0) > 0.01;
            const hasShiftedY = !hasDeltaX && e.shiftKey && Math.abs(e.deltaY || 0) > 0.01;
            if (!hasDeltaX && !hasShiftedY) return;
            const horizontalDelta = hasDeltaX ? e.deltaX : e.deltaY;
            cancelMomentum(false);
            e.preventDefault();
            const base = queuedSharedX === null
                ? clampSharedScrollX(ranksScrollEl.scrollLeft)
                : queuedSharedX;
            queueSharedSync(base + horizontalDelta);
            const now = performance.now();
            const dt = lastWheelTime > 0 ? Math.max(1, now - lastWheelTime) : 16;
            lastWheelTime = now;
            const instantaneousVelocity = horizontalDelta / dt;
            momentumVelocity = (momentumVelocity * 0.75) + (instantaneousVelocity * 0.25);
            if (e.deltaMode !== 0 || hasShiftedY) {
                scheduleWheelMomentum();
            } else if (wheelMomentumTimeout) {
                clearTimeout(wheelMomentumTimeout);
                wheelMomentumTimeout = 0;
            }
        };

        const handleHorizontalTouchEnd = () => {
            if (isUnifiedMobileScrollMode()) return;
            if (dragAxis === "x") {
                markRecentMobileHorizontalScroll(220);
                startMomentum();
            }
            dragAxis = null;
        };

        const handleHorizontalTouchCancel = () => {
            if (isUnifiedMobileScrollMode()) return;
            if (dragAxis === "x") {
                markRecentMobileHorizontalScroll(220);
            }
            cancelMomentum(true);
            dragAxis = null;
        };

        horizontalDragSurfaces.forEach((surfaceEl) => {
            surfaceEl.addEventListener("touchstart", handleHorizontalTouchStart, { passive: true });
            surfaceEl.addEventListener("touchmove", handleHorizontalTouchMove, { passive: false });
            surfaceEl.addEventListener("wheel", handleHorizontalWheel, { passive: false });
            surfaceEl.addEventListener("touchend", handleHorizontalTouchEnd, { passive: true });
            surfaceEl.addEventListener("touchcancel", handleHorizontalTouchCancel, { passive: true });
        });

        ranksScrollEl.addEventListener("scroll", () => {
            if (isUnifiedMobileScrollMode()) return;
            markRecentMobileHorizontalScroll(220);
            const targetLeft = ranksScrollEl.scrollLeft + syncOffset;
            syncFromSourceToTarget(ranksScrollEl, scrollEl, targetLeft);
        }, { passive: true });
    }

    scrollEl.addEventListener("scroll", () => {
        if (isUnifiedMobileScrollMode()) return;
        markRecentMobileHorizontalScroll(220);
        const targetLeft = scrollEl.scrollLeft - syncOffset;
        syncFromSourceToTarget(scrollEl, ranksScrollEl, targetLeft);
    }, { passive: true });

    window.addEventListener("scroll", () => {
        if (window.innerWidth <= 900) return;
        const snapped = toWholePx(-scrollEl.scrollLeft);
        ratingValues.forEach((v) => {
            v.style.transform = `translate3d(${snapped}px, 0, 0)`;
        });
        scoreWrappers.forEach((w) => {
            w.style.transform = `translate3d(${snapped}px, 0, 0)`;
        });
    }, { passive: true });

    repositionScoreInputs();
    repositionRatingValues();
    syncBothToSharedX(scrollEl.scrollLeft || (ranksScrollEl ? ranksScrollEl.scrollLeft : 0));

    let isResetting = false;
    window.addEventListener("resize", () => {
        if (isResetting) return;
        repositionRatingValues();
        repositionScoreInputs();
        syncBothToSharedX(scrollEl.scrollLeft || (ranksScrollEl ? ranksScrollEl.scrollLeft : 0));
        if (window.innerWidth > 900) {
            const currentOffset = toWholePx(-scrollEl.scrollLeft);
            ratingValues.forEach((v, i) => {
                v.style.position = ratingOriginalStyles[i].position;
                v.style.left = "";
                v.style.top = ratingOriginalStyles[i].top;
                v.style.transform = `translate3d(${currentOffset}px, 0, 0)`;
            });
            scoreWrappers.forEach((w) => {
                w.style.transform = `translate3d(${currentOffset}px, 0, 0)`;
            });
            if (caveText) caveText.style.transform = "";
            if (scoreText) scoreText.style.transform = "";
            if (progressionText) progressionText.style.transform = "";
            if (ratingText) ratingText.style.transform = "";
            const radarWrap = document.querySelector(".radar-canvas-wrap");
            const chartGrid = document.querySelector(".radar-chart-grid");
            const chartPanels = document.querySelectorAll(".radar-chart-panel, .radar-donut-wrap, .radar-bar-wrap");
            if (radarWrap) radarWrap.style.height = "";
            if (chartGrid) {
                chartGrid.style.width = "";
                chartGrid.style.height = "";
            }
            chartPanels.forEach((p) => {
                p.style.width = "";
                p.style.height = "";
            });
            isResetting = true;
            setTimeout(() => {
                if (typeof Chart !== "undefined") {
                    Object.values(Chart.instances).forEach((chart) => {
                        chart.canvas.style.width = "";
                        chart.canvas.style.height = "";
                        chart.resize();
                    });
                }
                isResetting = false;
            }, 200);
        }
    });

    const ranksBars = Array.from(document.querySelectorAll(".ranks-bars"));
    const ranksBarsStack = document.getElementById("ranksBarsContainer")
        || document.querySelector(".ranks-bars-stack");
    const stripeGroups = [[0, 1], [2, 3], [4, 5], [6], [7, 8], [9, 10], [11, 12], [13]];
    let scoreInputFocused = false;
    let scoreBlurResetTimer = 0;
    let pendingBlurDismissSelection = false;
    let suppressNextSelectionClick = false;
    let suppressNextSelectionClickTimer = 0;
    let suppressDesktopDismissReleaseClick = false;
    let skipNextDesktopRowActivation = false;
    let desktopDismissGestureActive = false;
    let desktopPointerEventsReleaseTimer = 0;
    let lastSelectionInteractionStamp = -1;
    let suppressDesktopInputRefocusUntilMouseUp = false;
    let desktopDismissLatchUntil = 0;
    let desktopSelectionTransferUntil = 0;
    let mobileHorizontalScrollHintUntil = 0;
    let mobileBlurClearTimer = 0;
    let recentMobileSelectionGroupKey = "";
    let recentMobileSelectionUntil = 0;
    let pendingMobileRowTap = null;
    let ignoreMobileTapClicksUntil = 0;
    const getNowTs = () => (
        typeof performance !== "undefined" && typeof performance.now === "function"
            ? performance.now()
            : Date.now()
    );
    const markRecentMobileHorizontalScroll = (durationMs = 320) => {
        if (window.innerWidth > 900) return;
        mobileHorizontalScrollHintUntil = Math.max(mobileHorizontalScrollHintUntil, getNowTs() + durationMs);
    };
    const hasRecentMobileHorizontalScroll = () => (
        window.innerWidth <= 900
        && getNowTs() <= mobileHorizontalScrollHintUntil
    );
    const clearPendingMobileBlurClear = () => {
        if (!mobileBlurClearTimer) return;
        clearTimeout(mobileBlurClearTimer);
        mobileBlurClearTimer = 0;
    };
    const getGroupKey = (group) => (
        Array.isArray(group) && group.length
            ? group.join(",")
            : ""
    );
    const clearRecentMobileSelectionGroup = () => {
        recentMobileSelectionGroupKey = "";
        recentMobileSelectionUntil = 0;
    };
    const markRecentMobileSelectionGroup = (group, durationMs = 280) => {
        if (window.innerWidth > 900) return;
        const key = getGroupKey(group);
        if (!key) {
            clearRecentMobileSelectionGroup();
            return;
        }
        recentMobileSelectionGroupKey = key;
        recentMobileSelectionUntil = getNowTs() + durationMs;
    };
    const shouldPreserveRecentMobileSelection = (group) => (
        window.innerWidth <= 900
        && !!group
        && getNowTs() <= recentMobileSelectionUntil
        && getGroupKey(group) === recentMobileSelectionGroupKey
    );
    const clearPendingMobileRowTap = () => {
        pendingMobileRowTap = null;
    };
    const armIgnoreMobileTapClicks = (durationMs = 420) => {
        if (window.innerWidth > 900) return;
        ignoreMobileTapClicksUntil = getNowTs() + durationMs;
    };
    const shouldIgnoreRecentMobileTapClick = () => (
        window.innerWidth <= 900
        && getNowTs() <= ignoreMobileTapClicksUntil
    );
    let lastPanelsScrollLeft = panelsScrollEl ? (panelsScrollEl.scrollLeft || 0) : 0;
    if (panelsScrollEl) {
        panelsScrollEl.addEventListener("scroll", () => {
            if (!isUnifiedMobileScrollMode()) return;
            const nextLeft = panelsScrollEl.scrollLeft || 0;
            if (Math.abs(nextLeft - lastPanelsScrollLeft) > 1.5) {
                markRecentMobileHorizontalScroll(220);
            }
            lastPanelsScrollLeft = nextLeft;
            syncMobileFloatingOffsets(0);
        }, { passive: true });
    }
    const isViewModeActive = () => document.body.classList.contains("view-mode");
    const armDesktopSelectionTransfer = (duration = 220) => {
        if (window.innerWidth <= 900) return;
        desktopSelectionTransferUntil = getNowTs() + duration;
    };
    const hasPendingDesktopSelectionTransfer = () => (
        window.innerWidth > 900
        && getNowTs() <= desktopSelectionTransferUntil
    );
    const clearDesktopSelectionTransfer = () => {
        desktopSelectionTransferUntil = 0;
    };
    const armSelectionClickSuppression = () => {
        suppressNextSelectionClick = true;
        if (suppressNextSelectionClickTimer) {
            clearTimeout(suppressNextSelectionClickTimer);
        }
        suppressNextSelectionClickTimer = setTimeout(() => {
            suppressNextSelectionClick = false;
            suppressNextSelectionClickTimer = 0;
        }, 1500);
    };
    const clearSelectionClickSuppression = () => {
        suppressNextSelectionClick = false;
        if (suppressNextSelectionClickTimer) {
            clearTimeout(suppressNextSelectionClickTimer);
            suppressNextSelectionClickTimer = 0;
        }
    };
    const consumeSelectionClickSuppression = () => {
        if (!suppressNextSelectionClick) return false;
        clearSelectionClickSuppression();
        return true;
    };
    const clearPendingBlurDismissSelection = () => {
        pendingBlurDismissSelection = false;
    };
    const consumePendingBlurDismissSelection = () => {
        if (!pendingBlurDismissSelection) return false;
        pendingBlurDismissSelection = false;
        return true;
    };
    const consumeDesktopRowActivationSkip = () => {
        if (!skipNextDesktopRowActivation) return false;
        skipNextDesktopRowActivation = false;
        return true;
    };
    const beginDesktopDismissGesture = () => {
        clearDesktopSelectionTransfer();
        desktopDismissGestureActive = true;
        skipNextDesktopRowActivation = true;
        suppressDesktopDismissReleaseClick = true;
        suppressDesktopInputRefocusUntilMouseUp = true;
        armSelectionClickSuppression();
        clearRowSelection();
        scoreInputFocused = false;
        const activeElement = document.activeElement;
        if (isAnyScoreInputElement(activeElement) && typeof activeElement.blur === "function") {
            activeElement.blur();
        }
        setDesktopPointerEventsSuspended(true);
    };
    const endDesktopDismissGesture = () => {
        desktopDismissGestureActive = false;
    };
    const armDesktopDismissLatch = (duration = 260) => {
        if (window.innerWidth <= 900) return;
        const now = typeof performance !== "undefined" ? performance.now() : Date.now();
        desktopDismissLatchUntil = now + duration;
        const reinforceDismiss = () => {
            const current = typeof performance !== "undefined" ? performance.now() : Date.now();
            if (current > desktopDismissLatchUntil) return;
            clearRowSelection();
            scoreInputFocused = false;
            const activeElement = document.activeElement;
            if (isAnyScoreInputElement(activeElement) && typeof activeElement.blur === "function") {
                activeElement.blur();
            }
        };
        setTimeout(reinforceDismiss, 0);
        setTimeout(reinforceDismiss, 40);
        setTimeout(reinforceDismiss, 110);
        setTimeout(reinforceDismiss, duration);
    };
    const isDesktopDismissLatched = () => {
        if (window.innerWidth <= 900) return false;
        const now = typeof performance !== "undefined" ? performance.now() : Date.now();
        return now <= desktopDismissLatchUntil;
    };
    const isDesktopDismissBlocked = () => (
        window.innerWidth > 900
        && (
            desktopDismissGestureActive
            || suppressDesktopDismissReleaseClick
            || suppressDesktopInputRefocusUntilMouseUp
            || isDesktopDismissLatched()
        )
    );
    const releaseDesktopGestureGuards = () => {
        suppressDesktopDismissReleaseClick = false;
        skipNextDesktopRowActivation = false;
        endDesktopDismissGesture();
        releaseDesktopPointerEventsAfterGesture();
    };
    const setDesktopPointerEventsSuspended = (suspended) => {
        if (window.innerWidth <= 900) return;
        const pointerValue = suspended ? "none" : "";
        if (scrollEl) scrollEl.style.pointerEvents = pointerValue;
        if (benchmarkContainer) benchmarkContainer.style.pointerEvents = pointerValue;
    };
    const releaseDesktopPointerEventsAfterGesture = () => {
        if (desktopPointerEventsReleaseTimer) {
            clearTimeout(desktopPointerEventsReleaseTimer);
        }
        desktopPointerEventsReleaseTimer = setTimeout(() => {
            desktopPointerEventsReleaseTimer = 0;
            setDesktopPointerEventsSuspended(false);
        }, 0);
    };
    const hasActiveScoreFocus = () => {
        const activeElement = document.activeElement;
        return !!(
            scoreInputFocused
            || scoreBlurResetTimer
            || isAnyScoreInputElement(activeElement)
        );
    };
    const blurActiveScoreInput = () => {
        const activeElement = document.activeElement;
        if (
            isAnyScoreInputElement(activeElement)
            && typeof activeElement.blur === "function"
        ) {
            activeElement.blur();
        }
    };
    const shouldHandleSelectionInteraction = (event) => {
        if (!event) return true;
        const stamp = Number(event.timeStamp);
        if (!Number.isFinite(stamp)) return true;
        if (lastSelectionInteractionStamp === stamp) return false;
        lastSelectionInteractionStamp = stamp;
        return true;
    };
    const isDesktopRowDismissTarget = (target, clientX, clientY) => {
        if (!target || typeof target.closest !== "function") return false;
        if (target.closest(".score-input-wrapper")) return false;
        if (target.closest(".cave-play-wrapper, .cave-play-icon, .cave-play-edit, .cave-play-overlay, .cave-play-anchor")) {
            return false;
        }
        if (target.closest(".ranks-bars")) return true;
        return findPairGroupIndexByPoint(clientX, clientY) >= 0;
    };
    const getRowRankIndex = (rowIndex) => {
        const rating = Number(state.individualRatings[rowIndex]) || 0;
        if (rating <= 0) return 0;
        return Math.min(FINAL_RANK_INDEX, Math.floor(rating / 100));
    };
    const clearOutlineVars = (row) => {
        if (!row || !row.style) return;
        row.style.removeProperty("--row-active-outline-color");
        row.style.removeProperty("--row-active-outline-shadow");
    };
    const isAnyScoreInputElement = (element) => !!(
        element
        && element.classList
        && (
            element.classList.contains("score-input")
            || element.classList.contains("sub-score-input")
        )
    );
    const applyGroupOutlineVars = (group) => {
        if (!group || !group.length) return;
        if (window.innerWidth <= 900) {
            group.forEach((idx) => {
                clearOutlineVars(ranksBars[idx]);
            });
            return;
        }
        const highestRank = group.reduce((maxRank, idx) => Math.max(maxRank, getRowRankIndex(idx)), 0);
        const outlineColor = highestRank > 0
            ? (RANK_TEXT_COLORS[highestRank] || "")
            : "";
        const outlineShadow = outlineColor
            ? colorWithAlpha(darkenColor(outlineColor, 0.72), 0.95)
            : "";
        group.forEach((idx) => {
            const row = ranksBars[idx];
            if (!row) return;
            if (outlineColor) {
                row.style.setProperty("--row-active-outline-color", outlineColor);
                row.style.setProperty("--row-active-outline-shadow", outlineShadow);
            } else {
                clearOutlineVars(row);
            }
        });
    };
    const clearRowSelection = () => {
        ranksBars.forEach((r) => {
            r.classList.remove("row-active-first", "row-active-second", "row-active-single");
            clearOutlineVars(r);
        });
    };
    const groupIsSelected = (group) => group && group.some((idx) => (
        ranksBars[idx]
        && (
            ranksBars[idx].classList.contains("row-active-first")
            || ranksBars[idx].classList.contains("row-active-second")
            || ranksBars[idx].classList.contains("row-active-single")
        )
    ));
    const hasAnySelectedRows = () => stripeGroups.some((group) => groupIsSelected(group));
    const applyGroupSelection = (group) => {
        if (isDesktopDismissBlocked()) return;
        if (!group) return;
        if (group.length === 2) {
            if (ranksBars[group[0]]) ranksBars[group[0]].classList.add("row-active-first");
            if (ranksBars[group[1]]) ranksBars[group[1]].classList.add("row-active-second");
            applyGroupOutlineVars(group);
            return;
        }
        if (group.length === 1 && ranksBars[group[0]]) {
            ranksBars[group[0]].classList.add("row-active-single");
            applyGroupOutlineVars(group);
        }
    };
    const getGroupForRowIndex = (rowIndex) => stripeGroups.find((g) => g.includes(rowIndex));
    const selectGroupForRowIndex = (rowIndex) => {
        if (isDesktopDismissBlocked()) return;
        const group = getGroupForRowIndex(rowIndex);
        clearRowSelection();
        applyGroupSelection(group);
        markRecentMobileSelectionGroup(group);
    };
    const prepareDesktopSelectionTransfer = () => {
        if (window.innerWidth <= 900) return;
        suppressDesktopInputRefocusUntilMouseUp = false;
        if (hasActiveScoreFocus()) {
            armDesktopSelectionTransfer();
        } else {
            clearDesktopSelectionTransfer();
        }
        clearPendingBlurDismissSelection();
        clearSelectionClickSuppression();
        releaseDesktopGestureGuards();
    };
    const handleRowSelectionToggle = (rowIndex) => {
        if (isDesktopDismissBlocked()) return;
        const group = getGroupForRowIndex(rowIndex);
        const isActive = groupIsSelected(group);
        const preserveRecentMobileSelection = isActive && shouldPreserveRecentMobileSelection(group);
        clearRowSelection();
        if (!isActive || preserveRecentMobileSelection) {
            applyGroupSelection(group);
            markRecentMobileSelectionGroup(group);
            return;
        }
        clearRecentMobileSelectionGroup();
    };
    const isMobileRowSelectionBlockedTarget = (target) => !!(
        target
        && target.closest
        && (
            target.closest(".score-input-wrapper")
            || target.closest(".cave-play-wrapper, .cave-play-icon, .cave-play-edit, .cave-play-overlay, .cave-play-anchor")
        )
    );
    const handleMobileRowSelectionRequest = (rowIndex, event) => {
        clearPendingMobileBlurClear();
        if (hasRecentMobileHorizontalScroll()) return false;
        if (consumePendingBlurDismissSelection()) return false;
        if (event && !shouldHandleSelectionInteraction(event)) return false;
        if (consumeDesktopRowActivationSkip()) return false;
        if (consumeSelectionClickSuppression()) return false;
        if (scoreInputFocused) {
            scoreInputFocused = false;
            clearRowSelection();
            clearRecentMobileSelectionGroup();
            return true;
        }
        handleRowSelectionToggle(rowIndex);
        return true;
    };
    const findPairGroupIndexByPoint = (clientX, clientY) => {
        for (const group of stripeGroups) {
            if (!group || group.length !== 2) continue;
            const firstRow = ranksBars[group[0]];
            const secondRow = ranksBars[group[1]];
            if (!firstRow || !secondRow) continue;
            const firstRect = firstRow.getBoundingClientRect();
            const secondRect = secondRow.getBoundingClientRect();
            const left = Math.min(firstRect.left, secondRect.left);
            const right = Math.max(firstRect.right, secondRect.right);
            const top = Math.min(firstRect.top, secondRect.top);
            const bottom = Math.max(firstRect.bottom, secondRect.bottom);
            if (clientX >= left && clientX <= right && clientY >= top && clientY <= bottom) {
                return group[0];
            }
        }
        return -1;
    };

    ranksBars.forEach((row, i) => {
        row.addEventListener("pointerdown", (e) => {
            if (window.innerWidth > 900) return;
            if (e.pointerType === "mouse") return;
            if (isMobileRowSelectionBlockedTarget(e.target)) return;
            pendingMobileRowTap = {
                rowIndex: i,
                pointerId: e.pointerId,
                startX: e.clientX,
                startY: e.clientY
            };
        });
        row.addEventListener("pointermove", (e) => {
            if (!pendingMobileRowTap) return;
            if (pendingMobileRowTap.pointerId !== e.pointerId) return;
            const deltaX = e.clientX - pendingMobileRowTap.startX;
            const deltaY = e.clientY - pendingMobileRowTap.startY;
            if ((deltaX * deltaX) + (deltaY * deltaY) > 100) {
                clearPendingMobileRowTap();
            }
        });
        row.addEventListener("pointercancel", clearPendingMobileRowTap);
        row.addEventListener("pointerup", (e) => {
            if (window.innerWidth > 900) return;
            if (e.pointerType === "mouse") return;
            if (!pendingMobileRowTap) return;
            if (pendingMobileRowTap.pointerId !== e.pointerId || pendingMobileRowTap.rowIndex !== i) return;
            const deltaX = e.clientX - pendingMobileRowTap.startX;
            const deltaY = e.clientY - pendingMobileRowTap.startY;
            clearPendingMobileRowTap();
            if ((deltaX * deltaX) + (deltaY * deltaY) > 100) return;
            if (isMobileRowSelectionBlockedTarget(e.target)) return;
            if (!handleMobileRowSelectionRequest(i, e)) return;
            armIgnoreMobileTapClicks();
            e.preventDefault();
            e.stopPropagation();
            if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
        });
        row.addEventListener("mousedown", (e) => {
            if (window.innerWidth <= 900) return;
            if (e.target.closest(".score-input-wrapper")) return;
            if (e.target.closest(".cave-play-wrapper, .cave-play-icon, .cave-play-edit, .cave-play-overlay, .cave-play-anchor")) return;
            prepareDesktopSelectionTransfer();
            blurActiveScoreInput();
            scoreInputFocused = false;
            handleRowSelectionToggle(i);
            e.preventDefault();
            e.stopPropagation();
            if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
        }, true);
        row.addEventListener("click", (e) => {
            if (e.target.closest(".cave-play-wrapper, .cave-play-icon, .cave-play-edit, .cave-play-overlay, .cave-play-anchor")) {
                e.stopPropagation();
                return;
            }
            if (e.target.closest(".score-input-wrapper")) {
                e.stopPropagation();
                return;
            }
            if (window.innerWidth > 900) {
                e.stopPropagation();
                return;
            }
            if (shouldIgnoreRecentMobileTapClick()) {
                e.stopPropagation();
                return;
            }
            if (!handleMobileRowSelectionRequest(i, e)) {
                e.stopPropagation();
                return;
            }
        });
    });

    const handlePairGapClick = (e) => {
        if (window.innerWidth > 900) return;
        if (!benchmarkContainer || !benchmarkContainer.contains(e.target)) return;
        if (e.target.closest(".ranks-bars")) return;
        if (e.target.closest(".score-input-wrapper")) return;
        if (e.target.closest(".cave-play-wrapper, .cave-play-icon, .cave-play-edit, .cave-play-overlay, .cave-play-anchor")) return;
        clearPendingMobileBlurClear();
        if (hasRecentMobileHorizontalScroll()) return;
        if (consumePendingBlurDismissSelection()) return;
        if (!shouldHandleSelectionInteraction(e)) return;
        if (consumeDesktopRowActivationSkip()) return;
        if (consumeSelectionClickSuppression()) return;
        const rowIndex = findPairGroupIndexByPoint(e.clientX, e.clientY);
        if (rowIndex < 0) return;
        if (scoreInputFocused) {
            scoreInputFocused = false;
            clearRowSelection();
            clearRecentMobileSelectionGroup();
            return;
        }
        handleRowSelectionToggle(rowIndex);
    };

    if (benchmarkContainer) {
        benchmarkContainer.addEventListener("mousedown", (e) => {
            if (window.innerWidth <= 900) return;
            if (e.target.closest(".ranks-bars")) return;
            if (e.target.closest(".score-input-wrapper")) return;
            if (e.target.closest(".cave-play-wrapper, .cave-play-icon, .cave-play-edit, .cave-play-overlay, .cave-play-anchor")) return;
            const rowIndex = findPairGroupIndexByPoint(e.clientX, e.clientY);
            if (rowIndex < 0) return;
            prepareDesktopSelectionTransfer();
            blurActiveScoreInput();
            scoreInputFocused = false;
            handleRowSelectionToggle(rowIndex);
            e.preventDefault();
            e.stopPropagation();
            if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
        }, true);
        benchmarkContainer.addEventListener("click", (e) => {
            handlePairGapClick(e);
        });
    }

    document.addEventListener("benchmark:row-ranks-updated", () => {
        const activeGroup = stripeGroups.find((group) => groupIsSelected(group));
        if (!activeGroup) return;
        applyGroupOutlineVars(activeGroup);
    });

    document.addEventListener("benchmark:clear-row-selection", () => {
        clearRowSelection();
        scoreInputFocused = false;
        clearDesktopSelectionTransfer();
        clearRecentMobileSelectionGroup();
        clearPendingMobileRowTap();
    });

    document.querySelectorAll(".score-input").forEach((input, i) => {
        input.addEventListener("mousedown", (e) => {
            if (window.innerWidth <= 900) return;
            if (state.isViewMode) return;
            e.stopPropagation();
            prepareDesktopSelectionTransfer();
            suppressDesktopInputRefocusUntilMouseUp = false;
            selectGroupForRowIndex(i);
        });
        input.addEventListener("click", (e) => {
            e.stopPropagation();
        });
        const wrapper = input.closest(".score-input-wrapper");
        if (wrapper) {
            wrapper.addEventListener("mousedown", (e) => {
                if (window.innerWidth <= 900) return;
                e.stopPropagation();
                if (!isViewModeActive()) {
                    prepareDesktopSelectionTransfer();
                    suppressDesktopInputRefocusUntilMouseUp = false;
                    selectGroupForRowIndex(i);
                    return;
                }
                prepareDesktopSelectionTransfer();
                suppressDesktopInputRefocusUntilMouseUp = false;
                suppressDesktopDismissReleaseClick = true;
                setDesktopPointerEventsSuspended(true);
                handleRowSelectionToggle(i);
                e.preventDefault();
            });
            wrapper.addEventListener("click", (e) => {
                e.stopPropagation();
                if (!isViewModeActive()) return;
                if (window.innerWidth > 900) return;
                clearPendingBlurDismissSelection();
                if (hasRecentMobileHorizontalScroll()) return;
                if (!shouldHandleSelectionInteraction(e)) return;
                handleRowSelectionToggle(i);
            });
        }
        input.addEventListener("focus", () => {
            if (window.innerWidth > 900 && suppressDesktopInputRefocusUntilMouseUp) {
                scoreInputFocused = false;
                clearRowSelection();
                setTimeout(() => {
                    if (document.activeElement === input && typeof input.blur === "function") {
                        input.blur();
                    }
                }, 0);
                return;
            }
            if (isDesktopDismissBlocked()) {
                scoreInputFocused = false;
                clearRowSelection();
                return;
            }
            if (scoreBlurResetTimer) {
                clearTimeout(scoreBlurResetTimer);
                scoreBlurResetTimer = 0;
            }
            clearPendingMobileBlurClear();
            clearPendingBlurDismissSelection();
            clearSelectionClickSuppression();
            scoreInputFocused = true;
            document.body.classList.add("score-input-focused");
            if (window.innerWidth > 900) return;
            clearRowSelection();
            clearRecentMobileSelectionGroup();
        });
        input.addEventListener("blur", (e) => {
            document.body.classList.remove("score-input-focused");
            if (scoreBlurResetTimer) {
                clearTimeout(scoreBlurResetTimer);
            }
            scoreBlurResetTimer = 0;
            scoreInputFocused = false;
            clearPendingMobileBlurClear();
            if (window.innerWidth <= 900) {
                pendingBlurDismissSelection = false;
                clearSelectionClickSuppression();
                if (hasRecentMobileHorizontalScroll()) return;
                mobileBlurClearTimer = setTimeout(() => {
                    mobileBlurClearTimer = 0;
                    if (hasRecentMobileHorizontalScroll()) return;
                    clearRowSelection();
                    clearRecentMobileSelectionGroup();
                }, 120);
                return;
            }
            const nextTarget = e && e.relatedTarget;
            const movingToAnotherScoreInput = !!(
                nextTarget
                && nextTarget.classList
                && isAnyScoreInputElement(nextTarget)
            );
            if (movingToAnotherScoreInput || hasPendingDesktopSelectionTransfer()) {
                clearDesktopSelectionTransfer();
                pendingBlurDismissSelection = false;
                clearSelectionClickSuppression();
                return;
            }
            pendingBlurDismissSelection = true;
            clearRowSelection();
            clearRecentMobileSelectionGroup();
            armSelectionClickSuppression();
        });
    });

    ratingValues.forEach((valueEl, groupIndex) => {
        const group = stripeGroups[groupIndex];
        if (!valueEl || !group || !group.length) return;
        const rowIndex = group[0];
        valueEl.addEventListener("mousedown", (e) => {
            if (window.innerWidth <= 900) return;
            prepareDesktopSelectionTransfer();
            blurActiveScoreInput();
            scoreInputFocused = false;
            handleRowSelectionToggle(rowIndex);
            e.preventDefault();
            e.stopPropagation();
            if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
        }, true);
        valueEl.addEventListener("click", (e) => {
            if (window.innerWidth > 900) {
                e.stopPropagation();
            }
        });
    });

    document.addEventListener("click", (e) => {
        if (window.innerWidth <= 900) return;
        if (e.target.closest && e.target.closest(".score-input-wrapper")) {
            releaseDesktopGestureGuards();
            clearPendingBlurDismissSelection();
            clearSelectionClickSuppression();
            return;
        }
        if (desktopDismissGestureActive || suppressDesktopDismissReleaseClick) {
            clearRowSelection();
            scoreInputFocused = false;
            clearSelectionClickSuppression();
            armDesktopDismissLatch();
            releaseDesktopGestureGuards();
            e.preventDefault();
            e.stopPropagation();
            if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
            return;
        }
        if (!suppressNextSelectionClick) return;
        if (!isDesktopRowDismissTarget(e.target, e.clientX, e.clientY)) return;
        clearSelectionClickSuppression();
        e.preventDefault();
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
    }, true);

    document.addEventListener("mouseup", (e) => {
        if (window.innerWidth <= 900) return;
        const releasedInsideScoreWrapper = !!(e.target && e.target.closest && e.target.closest(".score-input-wrapper"));
        const releasedInsideRowArea = !!(e.target && e.target.closest && e.target.closest(".ranks-bars"));
        const releasedInsideRatingValue = !!(e.target && e.target.closest && e.target.closest(".rating-value"));
        const releasedInsidePairGap = findPairGroupIndexByPoint(e.clientX, e.clientY) >= 0;
        if (!releasedInsideScoreWrapper && !releasedInsideRowArea && !releasedInsideRatingValue && !releasedInsidePairGap) {
            clearRowSelection();
            scoreInputFocused = false;
            suppressDesktopInputRefocusUntilMouseUp = true;
            const activeElement = document.activeElement;
            if (isAnyScoreInputElement(activeElement) && typeof activeElement.blur === "function") {
                activeElement.blur();
            }
        }
        if (!(desktopDismissGestureActive || suppressDesktopDismissReleaseClick)) return;
        clearRowSelection();
        scoreInputFocused = false;
        armDesktopDismissLatch();
        releaseDesktopGestureGuards();
        e.preventDefault();
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
    }, true);

    document.addEventListener("mousedown", (e) => {
        if (window.innerWidth <= 900) return;
        const isScoreWrapper = !!e.target.closest(".score-input-wrapper");
        const isRowArea = !!e.target.closest(".ranks-bars");
        const isRatingValue = !!e.target.closest(".rating-value");
        const isPairGapArea = findPairGroupIndexByPoint(e.clientX, e.clientY) >= 0;
        const activeElement = document.activeElement;
        const activeScoreInput = isAnyScoreInputElement(activeElement);
        if ((scoreInputFocused || activeScoreInput || scoreBlurResetTimer) && !isScoreWrapper && !isRowArea && !isRatingValue && isPairGapArea) {
            return;
        }
    }, true);

    document.addEventListener("pointerdown", (e) => {
        const isScoreWrapper = !!e.target.closest(".score-input-wrapper");
        const isRowArea = !!e.target.closest(".ranks-bars");
        const isRatingValue = !!e.target.closest(".rating-value");
        const isPairGapArea = findPairGroupIndexByPoint(e.clientX, e.clientY) >= 0;
        const activeElement = document.activeElement;
        const activeScoreInput = isAnyScoreInputElement(activeElement);
        if ((scoreInputFocused || activeScoreInput || scoreBlurResetTimer) && !isScoreWrapper && !isRowArea && !isRatingValue && isPairGapArea) {
            return;
        }
        if (isScoreWrapper || isRowArea || isRatingValue) {
            suppressDesktopInputRefocusUntilMouseUp = false;
        }
        if (e.target.closest(".ranks-bars")) return;
        if (e.target.closest(".rating-value")) return;
        if (e.target.closest(".score-input-wrapper")) return;
        if (findPairGroupIndexByPoint(e.clientX, e.clientY) >= 0) return;
        clearPendingBlurDismissSelection();
        clearSelectionClickSuppression();
        releaseDesktopGestureGuards();
        clearRowSelection();
        scoreInputFocused = false;
        clearDesktopSelectionTransfer();
    }, true);
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initScoreInputsScrollSync, { once: true });
} else {
    initScoreInputsScrollSync();
}
