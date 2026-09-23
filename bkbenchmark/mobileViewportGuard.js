(function initBenchmarkMobileViewportGuard() {
    function isMobileViewport() {
        try {
            var mediaMobile = window.matchMedia("(max-width: 900px), (max-device-width: 900px)").matches;
            var coarsePointer = window.matchMedia("(pointer: coarse)").matches;
            var screenObj = window.screen || {};
            var shortSide = Math.min(screenObj.width || 0, screenObj.height || 0);
            return mediaMobile || (coarsePointer && shortSide > 0 && shortSide <= 900);
        } catch (e) {
            return false;
        }
    }

    function applyViewportMeta() {
        var viewportMeta = document.querySelector('meta[name="viewport"]');
        if (!viewportMeta) return;
        viewportMeta.setAttribute(
            "content",
            "width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover, shrink-to-fit=no"
        );
    }

    function isScoreInputTarget(target) {
        return target instanceof Element
            && target.classList
            && (
                target.classList.contains("score-input")
                || target.classList.contains("sub-score-input")
            );
    }

    function isScoreInputShellTarget(target) {
        return target instanceof Element
            && !!(
                target.closest
                && target.closest(".score-input-wrapper, .sub-score-popout, .compare-score-popout")
            );
    }

    function isBenchmarkManagedTarget(target) {
        return target instanceof Element
            && !!(
                isScoreInputTarget(target)
                || isScoreInputShellTarget(target)
                || (
                    target.closest
                    && target.closest(
                        "#settingsModal, #profileModal, #friendsModal, #trophyModal, #onboardingModal, #reauthModal, #flagModal, #verificationModal"
                    )
                )
            );
    }

    function isCropperTarget(target) {
        return target instanceof Element
            && !!(target.closest && target.closest("#cropperContainer"));
    }

    function shouldLockKeyboardScroll() {
        if (!currentKeyboardFocus) return false;
        if (currentKeyboardFocusType === "benchmark-score" || currentKeyboardFocusType === "benchmark-panel") return false;
        return true;
    }

    function clearBenchmarkScoreBlurTimer() {
        if (!benchmarkScoreBlurTimer) return;
        clearTimeout(benchmarkScoreBlurTimer);
        benchmarkScoreBlurTimer = 0;
    }

    function resetBenchmarkScoreKeyboardState() {
        benchmarkScoreKeyboardWasVisible = false;
        clearBenchmarkScoreBlurTimer();
    }

    function maybeReleaseBenchmarkScoreFocus(viewportHeight, baseHeight) {
        if (currentKeyboardFocusType !== "benchmark-score" && currentKeyboardFocusType !== "benchmark-panel") {
            resetBenchmarkScoreKeyboardState();
            return;
        }

        var active = document.activeElement;
        if (!isBenchmarkManagedTarget(active) || typeof active.blur !== "function") {
            resetBenchmarkScoreKeyboardState();
            return;
        }

        var keyboardDelta = Math.max(0, (baseHeight || 0) - (viewportHeight || 0));
        if (keyboardDelta > 120) {
            benchmarkScoreKeyboardWasVisible = true;
            clearBenchmarkScoreBlurTimer();
            return;
        }

        if (!benchmarkScoreKeyboardWasVisible || keyboardDelta > 60 || benchmarkScoreBlurTimer) {
            return;
        }

        benchmarkScoreBlurTimer = setTimeout(function () {
            benchmarkScoreBlurTimer = 0;
            if (currentKeyboardFocusType !== "benchmark-score" && currentKeyboardFocusType !== "benchmark-panel") {
                benchmarkScoreKeyboardWasVisible = false;
                return;
            }

            var liveActive = document.activeElement;
            if (!isBenchmarkManagedTarget(liveActive) || typeof liveActive.blur !== "function") {
                benchmarkScoreKeyboardWasVisible = false;
                return;
            }

            var root = document.documentElement;
            var vv = window.visualViewport || null;
            var liveHeight = vv && vv.height ? vv.height : (window.innerHeight || root.clientHeight || viewportHeight || 0);
            var liveBaseHeight = parseFloat(root.style.getPropertyValue("--mobile-safe-vh-base")) || baseHeight || liveHeight;
            var liveKeyboardDelta = Math.max(0, liveBaseHeight - liveHeight);
            if (liveKeyboardDelta > 60) return;

            benchmarkScoreKeyboardWasVisible = false;
            liveActive.blur();
        }, 90);
    }

    function syncViewportCssVars() {
        var root = document.documentElement;
        if (!root) return;
        var vv = window.visualViewport || null;
        var width = vv && vv.width ? vv.width : (window.innerWidth || root.clientWidth || 0);
        var height = vv && vv.height ? vv.height : (window.innerHeight || root.clientHeight || 0);
        if (!width || !height) return;
        var keyboardLockActive = shouldLockKeyboardScroll();
        var existingWidth = parseFloat(root.style.getPropertyValue("--mobile-safe-vw")) || 0;
        var currentBaseHeight = parseFloat(root.style.getPropertyValue("--mobile-safe-vh-base")) || 0;
        var nextBaseHeight = height > currentBaseHeight ? height : currentBaseHeight;
        if (!keyboardLockActive || existingWidth <= 0) {
            root.style.setProperty("--mobile-safe-vw", width + "px");
        }
        if (!keyboardLockActive || currentBaseHeight <= 0) {
            root.style.setProperty("--mobile-safe-vh", height + "px");
            root.style.setProperty("--mobile-safe-vh-base", nextBaseHeight + "px");
        }
        var keyboardDelta = Math.max(0, nextBaseHeight - height);
        var benchmarkKeyboardOpen = !!currentKeyboardFocus
            && (currentKeyboardFocusType === "benchmark-score" || currentKeyboardFocusType === "benchmark-panel")
            && keyboardDelta > 80;
        root.classList.toggle("mobile-keyboard-open", keyboardLockActive);
        if (document.body) {
            document.body.classList.toggle("mobile-keyboard-open", keyboardLockActive);
            document.body.classList.toggle(
                "benchmark-keyboard-open",
                benchmarkKeyboardOpen
            );
        }
        maybeReleaseBenchmarkScoreFocus(height, nextBaseHeight);
    }

    function applyClasses() {
        document.documentElement.classList.add("mobile-viewport-guard");
        if (document.body) {
            document.body.classList.add("mobile-viewport-guard");
        }
    }

    // The guard classes lock html/body to overflow:hidden and make #responsive-wrapper exactly one screen tall. They used
    // to be added once at load and never removed, so switching from a mobile to a desktop width kept the page locked
    // (cut-off Cave Graph box, no scrolling, a stray line under the filter buttons) until a refresh. Keep them in sync.
    function syncGuardClasses() {
        var mobile = isMobileViewport();
        document.documentElement.classList.toggle("mobile-viewport-guard", mobile);
        if (document.body) document.body.classList.toggle("mobile-viewport-guard", mobile);
        if (!mobile) {
            document.documentElement.classList.remove("mobile-keyboard-open");
            if (document.body) document.body.classList.remove("mobile-keyboard-open", "benchmark-keyboard-open");
        }
    }
    window.addEventListener("resize", syncGuardClasses, { passive: true });
    window.addEventListener("orientationchange", syncGuardClasses, { passive: true });

    if (!isMobileViewport()) return;

    applyViewportMeta();
    applyClasses();
    syncViewportCssVars();

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function () {
            applyClasses();
            syncViewportCssVars();
        }, { once: true });
    }

    window.addEventListener("resize", syncViewportCssVars, { passive: true });
    window.addEventListener("orientationchange", syncViewportCssVars, { passive: true });
    window.addEventListener("pageshow", syncViewportCssVars, { passive: true });
    if (window.visualViewport) {
        window.visualViewport.addEventListener("resize", syncViewportCssVars, { passive: true });
        window.visualViewport.addEventListener("scroll", syncViewportCssVars, { passive: true });
    }

    var currentKeyboardFocus = false;
    var currentKeyboardFocusType = "";
    var benchmarkScoreKeyboardWasVisible = false;
    var benchmarkScoreBlurTimer = 0;

    function isKeyboardFocusableTarget(target) {
        if (!(target instanceof Element)) return false;
        if (target.matches("input, textarea, select")) return true;
        return target.hasAttribute("contenteditable");
    }

    document.addEventListener("focusin", function (event) {
        currentKeyboardFocus = isKeyboardFocusableTarget(event.target);
        currentKeyboardFocusType = isScoreInputTarget(event.target)
            ? "benchmark-score"
            : (isBenchmarkManagedTarget(event.target) ? "benchmark-panel" : (currentKeyboardFocus ? "generic" : ""));
        if (currentKeyboardFocusType !== "benchmark-score" && currentKeyboardFocusType !== "benchmark-panel") {
            resetBenchmarkScoreKeyboardState();
        }
        syncViewportCssVars();
    }, true);

    document.addEventListener("focusout", function () {
        setTimeout(function () {
            var active = document.activeElement;
            currentKeyboardFocus = isKeyboardFocusableTarget(active);
            currentKeyboardFocusType = isScoreInputTarget(active)
                ? "benchmark-score"
                : (isBenchmarkManagedTarget(active) ? "benchmark-panel" : (currentKeyboardFocus ? "generic" : ""));
            if (currentKeyboardFocusType !== "benchmark-score" && currentKeyboardFocusType !== "benchmark-panel") {
                resetBenchmarkScoreKeyboardState();
            }
            syncViewportCssVars();
        }, 50);
    }, true);

    var lastTouchEndAt = 0;
    var lastTouchEndTarget = null;

    document.addEventListener("touchmove", function (event) {
        if (isCropperTarget(event.target)) {
            return;
        }
        var keyboardLocked = document.documentElement.classList.contains("mobile-keyboard-open")
            || (document.body && document.body.classList.contains("mobile-keyboard-open"));
        if (keyboardLocked) {
            event.preventDefault();
            return;
        }
        if (event.touches && event.touches.length > 1) {
            event.preventDefault();
        }
    }, { passive: false });

    ["gesturestart", "gesturechange", "gestureend"].forEach(function (eventName) {
        document.addEventListener(eventName, function (event) {
            if (isCropperTarget(event.target)) {
                return;
            }
            event.preventDefault();
        }, { passive: false });
    });

    document.addEventListener("touchend", function (event) {
        var now = Date.now();
        if (isCropperTarget(event.target) || isScoreInputShellTarget(event.target)) {
            lastTouchEndAt = 0;
            lastTouchEndTarget = null;
            return;
        }
        // Only swallow the synthesized click when both taps land on the same element within the window - that's
        // the actual double-tap-zoom gesture. Scoping this by time alone also caught two quick taps on different
        // buttons (e.g. switching the Combined/Swords/Bombs radar tabs), which are legitimate sequential taps, and
        // once the user's tapping rhythm stayed under 300ms every later tap kept getting its click cancelled.
        if (now - lastTouchEndAt <= 300 && event.target === lastTouchEndTarget) {
            event.preventDefault();
        }
        lastTouchEndAt = now;
        lastTouchEndTarget = event.target;
    }, { passive: false });
})();
