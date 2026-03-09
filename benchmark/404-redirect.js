(function () {
    const path = window.location.pathname || "";
    const search = window.location.search || "";
    const hash = window.location.hash || "";
    const lower = path.toLowerCase();
    const isKnownBenchmarkPath =
        lower === "/benchmark" ||
        lower === "/benchmark/" ||
        lower === "/benchmark/sign-up" ||
        lower === "/benchmark/sign-up/" ||
        lower === "/benchmark/forgot-password" ||
        lower === "/benchmark/forgot-password/" ||
        lower === "/benchmark/verification-sent" ||
        lower === "/benchmark/verification-sent/" ||
        lower === "/benchmark/benchmark.html" ||
        lower === "/benchmark/index.html";

    const hasFileExtension = /\.[a-z0-9]+$/i.test(path);
    if (!isKnownBenchmarkPath && !hasFileExtension) {
        const restoreTarget = path + search + hash;
        window.location.replace("/benchmark/benchmark.html?__restore=" + encodeURIComponent(restoreTarget));
        return;
    }

    window.location.replace("/benchmark/");
})();

