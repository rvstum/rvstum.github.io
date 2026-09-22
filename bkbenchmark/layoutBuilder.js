const CAVE_ROWS = [
    { name: "Mercy", image: "/icons/cellImage_0_0.jpg" },
    { name: "Ruin", image: "/icons/cellImage_0_1.jpg" },
    { name: "Rats_01", image: "/icons/cellImage_0_2.jpg" },
    { name: "Rats_02", image: "/icons/cellImage_0_3.jpg" },
    { name: "Bats_01", image: "/icons/cellImage_0_4.jpg" },
    { name: "Bats_02", image: "/icons/cellImage_0_5.jpg" },
    { name: "Lizardron_04", image: "/icons/cellImage_0_6.jpg" },
    { name: "Pyrats_01", image: "/icons/cellImage_0_7.jpg" },
    { name: "PCS_01 (Cave Switch)", image: "/icons/cellImage_0_8.jpg" },
    { name: "Rebels_04", image: "/icons/cellImage_0_9.jpg" },
    { name: "RCS_04 (Cave Switch)", image: "/icons/cellImage_0_10.jpg" },
    { name: "Dark Blobs_02", image: "/icons/cellImage_0_11.jpg" },
    { name: "DBCS_02 (Cave Switch)", image: "/icons/cellImage_0_12.jpg" },
    { name: "Spiders_01", image: "/icons/cellImage_0_13.jpg" }
];

const STRIPE_LAYOUT = [
    { top: 33.5, height: 78 },
    { top: 113.5, height: 78 },
    { top: 193.5, height: 78 },
    { top: 273.5, height: 38 },
    { top: 313.5, height: 78 },
    { top: 393.5, height: 78 },
    { top: 473.5, height: 78 },
    { top: 553.5, height: 38 }
];

const SCORE_ROW_TOPS = [33.5, 73.5, 113.5, 153.5, 193.5, 233.5, 273.5, 313.5, 353.5, 393.5, 433.5, 473.5, 513.5, 553.5];

const PLAY_ICON_PATH = "M21.582,6.186c-0.23-0.86-0.908-1.538-1.768-1.768C18.254,4,12,4,12,4S5.746,4,4.186,4.418 c-0.86,0.23-1.538,0.908-1.768,1.768C2,7.746,2,12,2,12s0,4.254,0.418,5.814c0.23,0.86,0.908,1.538,1.768,1.768 C5.746,20,12,20,12,20s6.254,0,7.814-0.418c0.861-0.23,1.538-0.908,1.768-1.768C22,16.254,22,12,22,12S22,7.746,21.582,6.186z M10,15.464V8.536L16,12L10,15.464z";

function createElement(tag, className, textContent) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (typeof textContent === "string") el.textContent = textContent;
    return el;
}

function createPlayIcon() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "cave-play-icon");
    svg.setAttribute("viewBox", "0 0 24 24");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", PLAY_ICON_PATH);
    svg.appendChild(path);
    return svg;
}

function createLinkIcon() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "score-link-icon");
    svg.setAttribute("viewBox", "0 0 24 24");

    const firstPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    firstPath.setAttribute("d", "M10 13a5 5 0 0 0 7.07 0l3.54-3.54a5 5 0 1 0-7.07-7.07L11 3");

    const secondPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    secondPath.setAttribute("d", "M14 11a5 5 0 0 0-7.07 0L3.39 14.54a5 5 0 0 0 7.07 7.07L13 21");

    const linkLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    linkLine.setAttribute("x1", "8");
    linkLine.setAttribute("y1", "16");
    linkLine.setAttribute("x2", "16");
    linkLine.setAttribute("y2", "8");

    svg.appendChild(firstPath);
    svg.appendChild(secondPath);
    svg.appendChild(linkLine);
    return svg;
}

function createCavePlayControl(index, caveName) {
    const wrapper = createElement("span", "cave-play-wrapper");
    wrapper.dataset.index = String(index);
    wrapper.dataset.caveName = caveName;

    const anchor = createElement("button", "cave-play-anchor");
    anchor.type = "button";
    anchor.setAttribute("aria-label", `${caveName} YouTube`);
    anchor.appendChild(createPlayIcon());

    const editBtn = createElement("button", "cave-play-edit", "Edit");
    editBtn.type = "button";

    wrapper.appendChild(anchor);
    wrapper.appendChild(editBtn);
    return wrapper;
}

function createRankRow(cave, index) {
    const row = createElement("div", "ranks-bars");
    for (let i = 0; i < 15; i += 1) {
        const bar = createElement("div", "rank-bar");
        if (i === 1) {
            bar.classList.add("cave-cell-label", "has-cave");
            const content = createElement("span", "cave-cell-content");
            const img = createElement("img");
            img.src = cave.image;
            // Display only: "Rats_01" is shown as "Rats1" (the underlying cave name/key is unchanged).
            const displayName = cave.name.replace(/_0(\d)/, "$1");
            img.alt = displayName;
            const name = createElement("span", "cave-cell-name", displayName);
            content.appendChild(img);
            content.appendChild(name);
            bar.appendChild(content);
            bar.appendChild(createCavePlayControl(index, cave.name));
        }
        row.appendChild(bar);
    }
    // Background strip behind the whole row (a real element, so the mobile layout's own
    // ::before/::after on rows stay free). Styled in benchmark.css.
    row.appendChild(createElement("div", "row-strip"));
    return row;
}

function createVerticalLabel({ title, titleKey, iconSrc, iconClass, boxClass }) {
    const box = createElement("div", `vertical-box ${boxClass}`);
    const wrap = createElement("div", "vertical-box-label-wrap");
    const label = createElement("span", "vertical-box-label", title);
    label.setAttribute("data-i18n", titleKey);
    const icon = createElement("img", `vertical-box-icon ${iconClass}`);
    icon.src = iconSrc;
    icon.alt = "";
    wrap.appendChild(icon);
    wrap.appendChild(label);
    box.appendChild(wrap);
    return box;
}

function createScoreLinkToggle() {
    const button = createElement("button", "score-link-toggle");
    button.type = "button";
    button.setAttribute("aria-label", "Sub-Input for Points");
    button.appendChild(createLinkIcon());
    return button;
}

function createSubScorePopout() {
    const popout = createElement("div", "sub-score-popout");
    const input = createElement("input", "sub-score-input");
    input.type = "text";
    input.setAttribute("inputmode", "numeric");
    input.setAttribute("pattern", "[0-9]*");
    input.value = "0";
    input.maxLength = 4;
    const overlay = createElement("div", "sub-score-text-overlay", "0");
    const statTag = createElement("div", "sub-score-stat-tag", "pts");
    popout.appendChild(input);
    popout.appendChild(overlay);
    popout.appendChild(statTag);
    return popout;
}

function createCompareScorePopout() {
    const popout = createElement("div", "compare-score-popout");
    const overlay = createElement("div", "compare-score-text-overlay", "0");
    popout.appendChild(overlay);
    return popout;
}

export function buildBenchmarkLayout() {
    const container = document.getElementById("benchmarkGridContainer") || document.querySelector(".container");
    if (!container) return;
    if (container.querySelector(".ranks-bars") && container.querySelector(".score-input-wrapper")) return;

    container.innerHTML = "";

    STRIPE_LAYOUT.forEach((spec) => {
        const stripe = createElement("div", "bg-stripe");
        stripe.style.top = `${spec.top}px`;
        stripe.style.height = `${spec.height}px`;
        container.appendChild(stripe);
    });

    const stack = createElement("div", "ranks-bars-stack");
    stack.id = "ranksBarsContainer";

    const ratingText = createElement("div", "rating-text");
    const ratingLabel = createElement("span", "header-label header-label-rating", "Rating");
    ratingLabel.setAttribute("data-i18n", "rating");
    ratingText.appendChild(ratingLabel);
    const scoreText = createElement("div", "score-text");
    const scoreLabel = createElement("span", "score-text-label header-label header-label-score", "Score");
    scoreLabel.setAttribute("data-i18n", "score");
    scoreText.appendChild(scoreLabel);
    scoreText.appendChild(createScoreLinkToggle());
    const progressionText = createElement("div", "progression-text");
    const progressionLabel = createElement("span", "header-label header-label-threshold", "Score Threshold");
    progressionLabel.setAttribute("data-i18n", "progression");
    progressionText.appendChild(progressionLabel);
    const caveText = createElement("div", "cave-text");
    const caveLabel = createElement("span", "header-label header-label-cave", "Cave");
    caveLabel.setAttribute("data-i18n", "cave");
    caveText.appendChild(caveLabel);

    // One connected header bar behind Cave / Score / Score Threshold / Rating, with divider lines at each
    // column boundary, so the four floating labels read as a single table header instead of separate text.
    const headerBar = createElement("div", "ranks-header-bar");
    const headerDividerCave = createElement("div", "ranks-header-divider ranks-header-divider--cave");
    const headerDividerScore = createElement("div", "ranks-header-divider ranks-header-divider--score");
    const headerDividerProgression = createElement("div", "ranks-header-divider ranks-header-divider--progression");
    const headerDividerRating = createElement("div", "ranks-header-divider ranks-header-divider--rating");

    stack.appendChild(headerBar);
    stack.appendChild(headerDividerCave);
    stack.appendChild(headerDividerScore);
    stack.appendChild(headerDividerProgression);
    stack.appendChild(headerDividerRating);
    stack.appendChild(ratingText);
    stack.appendChild(scoreText);
    stack.appendChild(progressionText);
    stack.appendChild(caveText);

    stack.appendChild(createVerticalLabel({
        title: "Swords",
        titleKey: "swords",
        iconSrc: "../icons/benchmarksword.jpg",
        iconClass: "vertical-box-icon-swords",
        boxClass: "vbox-1"
    }));

    stack.appendChild(createVerticalLabel({
        title: "Bombs",
        titleKey: "bombs",
        iconSrc: "../icons/benchmarkbomb.jpg",
        iconClass: "vertical-box-icon-bombs",
        boxClass: "vbox-2"
    }));

    CAVE_ROWS.forEach((cave, index) => {
        stack.appendChild(createRankRow(cave, index));
    });
    container.appendChild(stack);

    SCORE_ROW_TOPS.forEach((top, index) => {
        const wrapper = createElement("div", "score-input-wrapper");
        wrapper.dataset.rowIndex = String(index);
        wrapper.style.top = `${top}px`;
        wrapper.style.height = "38px";
        const input = createElement("input", "score-input");
        input.type = "text";
        input.setAttribute("inputmode", "numeric");
        input.setAttribute("pattern", "[0-9]*");
        input.value = "0";
        input.maxLength = 4;
        const overlay = createElement("div", "score-text-overlay", "0");
        wrapper.appendChild(input);
        wrapper.appendChild(overlay);
        wrapper.appendChild(createSubScorePopout());
        wrapper.appendChild(createCompareScorePopout());
        container.appendChild(wrapper);
    });

    // One rating per row (desktop): the grouped rating-value cells span two rows, so each row gets
    // its own, in the same column as its score box.
    SCORE_ROW_TOPS.forEach((top, index) => {
        const rowRating = createElement("div", "row-rating-value", "0");
        rowRating.dataset.rowIndex = String(index);
        rowRating.style.top = `${top}px`;
        rowRating.style.height = "38px";
        container.appendChild(rowRating);
    });

    STRIPE_LAYOUT.forEach((spec) => {
        const rating = createElement("div", "rating-value", "0");
        rating.style.top = `${spec.top}px`;
        rating.style.height = `${spec.height}px`;
        container.appendChild(rating);
    });
}

buildBenchmarkLayout();
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildBenchmarkLayout, { once: true });
}
