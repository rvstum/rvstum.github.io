import { getCachedElementById } from "./utils/domUtils.js";

export function setupMountDropdownUI(options = {}) {
    const {
        mountOptions = [],
        mountConfigImages = {},
        getMountConfigLabel,
        getLanguage
    } = options;

    const mountBox = getCachedElementById("mountBox");
    if (!mountBox) return;
    const menu = mountBox.querySelector(".dropdown-menu");
    if (!menu) return;

    menu.innerHTML = "";
    mountOptions.forEach((mount) => {
        const item = document.createElement("div");
        item.className = "dropdown-item";
        item.dataset.value = mount;
        const img = document.createElement("img");
        img.src = mountConfigImages[mount];
        img.className = "mount-option-image";
        img.alt = typeof getMountConfigLabel === "function"
            ? getMountConfigLabel(mount, typeof getLanguage === "function" ? getLanguage() : "en")
            : mount;
        item.appendChild(img);
        menu.appendChild(item);
    });
}

export function setupConfigDropdownsUI(options = {}) {
    const {
        getCurrentConfig,
        applyConfig,
        updateNotificationVisibility
    } = options;

    const configs = [
        { boxId: "platformBox", key: "platform" },
        { boxId: "timeBox", key: "time" },
        { boxId: "statBox", key: "stat" },
        { boxId: "mountBox", key: "mount" },
        { boxId: "userMenuBox", key: null }
    ];

    const closeAll = (exceptBox = null) => {
        configs.forEach(({ boxId }) => {
            const box = getCachedElementById(boxId);
            if (!box || box === exceptBox) return;
            const menu = box.querySelector(".dropdown-menu");
            const arrow = box.querySelector(".arrow-icon");
            if (menu) menu.classList.remove("show");
            if (arrow) arrow.classList.remove("rotate");
        });
    };

    configs.forEach(({ boxId, key }) => {
        const box = getCachedElementById(boxId);
        if (!box) return;
        const menu = box.querySelector(".dropdown-menu");
        const arrow = box.querySelector(".arrow-icon");
        if (!menu) return;

        menu.querySelectorAll(".dropdown-item").forEach((item) => {
            item.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (key && typeof getCurrentConfig === "function" && typeof applyConfig === "function") {
                    const value = item.getAttribute("data-value") || item.textContent.trim();
                    if (value) {
                        const current = getCurrentConfig();
                        const nextConfig = { ...current, [key]: value };
                        applyConfig(nextConfig, { animateRowTransition: true });
                    }
                }
                closeAll();
                menu.classList.remove("show");
                if (typeof updateNotificationVisibility === "function") updateNotificationVisibility();
                if (arrow) arrow.classList.remove("rotate");
            });
        });

        box.addEventListener("click", (e) => {
            if (e.target && e.target.classList.contains("dropdown-item")) return;
            e.stopPropagation();
            const willOpen = !menu.classList.contains("show");
            closeAll(box);
            if (willOpen) {
                menu.classList.add("show");
                if (arrow) arrow.classList.add("rotate");
            } else {
                menu.classList.remove("show");
                if (arrow) arrow.classList.remove("rotate");
            }
            if (typeof updateNotificationVisibility === "function") updateNotificationVisibility();
        });
    });

    document.addEventListener("click", (e) => {
        if (e.target.closest(".small-inner-box")) return;
        closeAll();
        if (typeof updateNotificationVisibility === "function") updateNotificationVisibility();
    });
}
