(() => {
  "use strict";

  const customZoomSelector = [
    "[data-allow-custom-zoom]",
    ".map-shell",
    ".map-viewport",
    "#viewerStage",
    ".viewer-stage",
    "[id*='CropperArea']",
    "[class*='cropper-area']",
  ].join(",");

  function allowsCustomZoom(target) {
    return target instanceof Element && Boolean(target.closest(customZoomSelector));
  }

  document.documentElement.style.touchAction = "manipulation";

  document.addEventListener("touchmove", (event) => {
    if (event.touches?.length > 1 && !allowsCustomZoom(event.target)) {
      event.preventDefault();
    }
  }, { passive: false, capture: true });

  ["gesturestart", "gesturechange", "gestureend"].forEach((eventName) => {
    document.addEventListener(eventName, (event) => {
      if (!allowsCustomZoom(event.target)) event.preventDefault();
    }, { passive: false, capture: true });
  });

  let lastTouchEndAt = 0;
  document.addEventListener("touchend", (event) => {
    if (allowsCustomZoom(event.target)) {
      lastTouchEndAt = 0;
      return;
    }

    const now = Date.now();
    if (now - lastTouchEndAt <= 300) event.preventDefault();
    lastTouchEndAt = now;
  }, { passive: false, capture: true });
})();
