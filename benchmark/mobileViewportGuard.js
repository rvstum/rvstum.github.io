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
            "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
        );
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

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", applyClasses, { once: true });
    }

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
