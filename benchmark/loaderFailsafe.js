(function loaderFailsafe() {
    let released = false;
    const showBootError = function (message) {
        const existing = document.getElementById("bootErrorBanner");
        if (existing) return;
        const banner = document.createElement("div");
        banner.id = "bootErrorBanner";
        banner.textContent = message || "Benchmark startup error detected.";
        banner.style.cssText = "position:fixed;left:10px;right:10px;bottom:10px;z-index:100000;background:#2a0f0f;border:1px solid #7a2b2b;color:#ffd4d4;padding:8px 10px;font-size:12px;border-radius:8px;";
        document.body.appendChild(banner);
    };
    const releaseLoader = function () {
        if (released) return;
        const loader = document.getElementById("pageLoader");
        if (!loader) {
            released = true;
            return;
        }
        loader.style.setProperty("display", "none", "important");
        loader.style.setProperty("opacity", "0", "important");
        if (loader.parentNode) loader.parentNode.removeChild(loader);
        released = true;
    };

    window.addEventListener("error", function (e) {
        releaseLoader();
        const msg = (e && e.message ? e.message : "Unknown error");
        const src = (e && e.filename ? e.filename.split("/").pop() : "");
        const line = (e && e.lineno ? ":" + e.lineno : "");
        const col = (e && e.colno ? ":" + e.colno : "");
        const at = src ? (" [" + src + line + col + "]") : "";
        showBootError("Startup error: " + msg + at);
    });

    window.addEventListener("unhandledrejection", function (e) {
        releaseLoader();
        const reason = e && e.reason ? String(e.reason) : "Promise rejection";
        showBootError("Startup error: " + reason);
    });

    if (document.readyState === "complete") {
        setTimeout(releaseLoader, 12000);
    } else {
        window.addEventListener("load", function () {
            setTimeout(releaseLoader, 12000);
        });
    }

    window.__releaseBenchmarkLoader = releaseLoader;
})();

