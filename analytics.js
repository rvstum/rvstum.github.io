(function initializeGoogleAnalytics(window, document) {
  "use strict";

  if (window.__kdassistGoogleAnalyticsLoaded) return;
  window.__kdassistGoogleAnalyticsLoaded = true;

  var measurementId = "G-60DVCGD21Q";
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() {
    window.dataLayer.push(arguments);
  };

  window.gtag("js", new Date());
  window.gtag("config", measurementId);

  var script = document.createElement("script");
  script.async = true;
  script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(measurementId);
  document.head.appendChild(script);
})(window, document);
