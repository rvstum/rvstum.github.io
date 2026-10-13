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

  const fastTapStyle = document.createElement("style");
  fastTapStyle.textContent = "@media (hover: none) { button, a, input, select, [role='button'] { touch-action: manipulation; } }";
  document.head.appendChild(fastTapStyle);

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

})();
