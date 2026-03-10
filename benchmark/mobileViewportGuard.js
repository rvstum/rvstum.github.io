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

    function syncViewportCssVars() {
        var root = document.documentElement;
        if (!root) return;
        var vv = window.visualViewport || null;
        var width = vv && vv.width ? vv.width : (window.innerWidth || root.clientWidth || 0);
        var height = vv && vv.height ? vv.height : (window.innerHeight || root.clientHeight || 0);
        if (!width || !height) return;
        var currentBaseHeight = parseFloat(root.style.getPropertyValue("--mobile-safe-vh-base")) || 0;
        var nextBaseHeight = height > currentBaseHeight ? height : currentBaseHeight;
        root.style.setProperty("--mobile-safe-vw", width + "px");
        root.style.setProperty("--mobile-safe-vh", height + "px");
        root.style.setProperty("--mobile-safe-vh-base", nextBaseHeight + "px");
        var keyboardLikelyOpen = currentKeyboardFocus && nextBaseHeight > 0 && (nextBaseHeight - height) > 120;
        root.classList.toggle("mobile-keyboard-open", keyboardLikelyOpen);
        if (document.body) {
            document.body.classList.toggle("mobile-keyboard-open", keyboardLikelyOpen);
        }
        if (keyboardLikelyOpen) {
            window.scrollTo(0, 0);
        }
    }

    function applyClasses() {
        document.documentElement.classList.add("mobile-viewport-guard");
        if (document.body) {
            document.body.classList.add("mobile-viewport-guard");
        }
    }

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

    function isKeyboardFocusableTarget(target) {
        if (!(target instanceof Element)) return false;
        if (target.matches("input, textarea, select")) return true;
        return target.hasAttribute("contenteditable");
    }

    document.addEventListener("focusin", function (event) {
        currentKeyboardFocus = isKeyboardFocusableTarget(event.target);
        syncViewportCssVars();
    }, true);

    document.addEventListener("focusout", function () {
        setTimeout(function () {
            var active = document.activeElement;
            currentKeyboardFocus = isKeyboardFocusableTarget(active);
            syncViewportCssVars();
        }, 50);
    }, true);

    var lastTouchEndAt = 0;

    document.addEventListener("touchmove", function (event) {
        if (event.touches && event.touches.length > 1) {
            event.preventDefault();
        }
    }, { passive: false });

    ["gesturestart", "gesturechange", "gestureend"].forEach(function (eventName) {
        document.addEventListener(eventName, function (event) {
            event.preventDefault();
        }, { passive: false });
    });

    document.addEventListener("touchend", function (event) {
        var now = Date.now();
        if (now - lastTouchEndAt <= 300) {
            event.preventDefault();
        }
        lastTouchEndAt = now;
    }, { passive: false });
})();
