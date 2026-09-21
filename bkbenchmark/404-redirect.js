(function () {
    const path = window.location.pathname || "";
    const search = window.location.search || "";
    const hash = window.location.hash || "";
    const lower = path.toLowerCase();
    const isKnownBenchmarkPath =
        lower === "/bkbenchmark" ||
        lower === "/bkbenchmark/" ||
        lower === "/bkbenchmark/sign-up" ||
        lower === "/bkbenchmark/sign-up/" ||
        lower === "/bkbenchmark/forgot-password" ||
        lower === "/bkbenchmark/forgot-password/" ||
        lower === "/bkbenchmark/verification-sent" ||
        lower === "/bkbenchmark/verification-sent/" ||
        lower === "/bkbenchmark/benchmark.html" ||
        lower === "/bkbenchmark/index.html";

    const hasFileExtension = /\.[a-z0-9]+$/i.test(path);
    if (!isKnownBenchmarkPath && !hasFileExtension) {
        const restoreTarget = path + search + hash;
        window.location.replace("/bkbenchmark/benchmark.html?__restore=" + encodeURIComponent(restoreTarget));
        return;
    }

    window.location.replace("/bkbenchmark/");
})();

