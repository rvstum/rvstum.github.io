import { STELLAR_TROPHY_FILTER } from "./constants.js";

export const DESKTOP_SCREENSHOT_WIDTH_PX = 1600;

export const DESKTOP_CAPTURE_OVERRIDE_CSS = `
    .container { padding: 0 !important; overflow: visible !important; border-radius: 24px !important; }
    .middle-box { padding: 20px !important; min-height: 150px !important; }
    .top-box { display: flex !important; height: 72px !important; padding: 0 20px !important; gap: 0 !important; grid-template-columns: none !important; grid-template-rows: none !important; align-items: center !important; }
    .profile-circle { width: 60px !important; height: 60px !important; margin-right: 15px !important; margin-bottom: 0 !important; grid-column: auto !important; grid-row: auto !important; display: block !important; }
    .profile-details { display: flex !important; gap: 0 !important; margin-top: 0 !important; }
    .profile-identity { display: flex !important; margin-top: 0 !important; }
    .profile-text-block { grid-column: auto !important; grid-row: auto !important; display: flex !important; flex-direction: row !important; align-items: baseline !important; gap: 8px !important; }
    .profile-views { position: absolute !important; top: 0 !important; grid-column: auto !important; grid-row: auto !important; margin-bottom: 0 !important; }
    .trophies-section { position: relative !important; width: auto !important; margin: 0 !important; left: 10px !important; grid-column: auto !important; grid-row: auto !important; display: flex !important; flex-direction: column !important; align-items: stretch !important; }
    .achievements-section { width: auto !important; margin: 0 30px !important; grid-column: auto !important; grid-row: auto !important; display: flex !important; justify-content: center !important; }
    .top-right { display: flex !important; }
    .controls-container { margin-top: 0 !important; }
    .ranks-wrapper { width: 540px !important; overflow: visible !important; padding: 0 !important; margin-right: 0 !important; }
    .ranks-labels { width: 1014px !important; margin-left: -474px !important; }
    .progress-bar { width: 1014px !important; margin-left: -474px !important; }
    .container > .ranks-bars-stack { width: auto !important; overflow: visible !important; padding: 40px 20px 15px 20px !important; margin-right: 70px !important; pointer-events: none !important; }
    .ranks-bars { margin: 0 !important; padding: 0 !important; background: transparent !important; }
    .rank-bar { width: 76.2px !important; height: 25px !important; transform: skewX(-40deg) !important; margin: 0 1px !important; }
    .ranks-bars { position: relative !important; }
    .rank-bar.cave-cell-label {
        position: absolute !important;
        right: calc(100% + 124px) !important;
        top: -6.5px !important;
        height: 38px !important;
        transform: none !important;
        width: 300px !important;
        margin-right: 2px !important;
        border: none !important;
        display: flex !important;
        align-items: center !important;
        padding-left: 10px !important;
        padding-right: 10px !important;
        gap: 0 !important;
        overflow: visible !important;
    }
    .vertical-box { display: flex !important; width: 40px !important; left: 0 !important; border-radius: 0 12px 12px 0 !important; }
    .bg-stripe { display: block !important; width: calc(1014px + 70px) !important; }
    .score-input-wrapper { position: absolute !important; left: 360px !important; right: auto !important; width: 100px !important; margin: 0 !important; transform: none !important; display: block !important; }
    .rating-value { position: absolute !important; left: auto !important; right: 0 !important; width: 90px !important; display: flex !important; transform: none !important; margin: 0 !important; }
    .radar-header { flex-direction: row !important; gap: 12px !important; }
    .radar-tabs { width: auto !important; justify-content: flex-start !important; }
    .radar-content { display: grid !important; grid-template-columns: 1.4fr 1fr !important; gap: 18px !important; }
    .radar-canvas-wrap { height: 340px !important; padding: 12px !important; }
    .radar-chart-grid { display: grid !important; grid-template-columns: 1.35fr 0.8fr 1.35fr !important; grid-template-rows: none !important; }
    .radar-chart-panel, .radar-donut-wrap, .radar-bar-wrap { width: 100% !important; height: 100% !important; }
    .radar-side { width: auto !important; }
    .cave-play-wrapper { padding: 0 !important; margin: 0 !important; }
    .rank-bar.cave-cell-label .cave-cell-content {
        display: inline-flex !important;
        align-items: center !important;
        min-width: 0 !important;
        overflow: hidden !important;
        flex: 1 1 auto !important;
    }
    .rank-bar.cave-cell-label .cave-cell-name {
        min-width: 0 !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
    }
    .rank-bar.cave-cell-label .screenshot-cave-label-content {
        display: flex !important;
        align-items: center !important;
        gap: 5px !important;
        min-width: 0 !important;
        width: 100% !important;
        max-width: none !important;
        overflow: hidden !important;
        white-space: nowrap !important;
        text-overflow: ellipsis !important;
        padding-right: 0 !important;
    }
    .rank-bar.cave-cell-label .screenshot-cave-play-lock {
        position: static !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        margin: 0 !important;
        width: 18px !important;
        height: 18px !important;
        justify-self: end !important;
        pointer-events: none !important;
        z-index: 4 !important;
    }
    .rank-bar.cave-cell-label .cave-play-wrapper {
        position: static !important;
        display: inline-flex !important;
        align-items: center !important;
        margin-left: auto !important;
        margin-right: 0 !important;
        padding: 0 !important;
        flex: 0 0 auto !important;
        z-index: 4 !important;
    }
    .rank-bar.cave-cell-label .cave-play-anchor {
        position: static !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 30px !important;
        height: 30px !important;
        padding: 0 !important;
        margin: 0 !important;
        border: none !important;
        background: transparent !important;
    }
    .rank-bar.cave-cell-label .cave-play-icon {
        display: block !important;
        width: 18px !important;
        height: 18px !important;
        margin: 0 !important;
        position: static !important;
        transform: none !important;
    }
    .cave-play-overlay, .cave-play-edit, .cave-play-panel { display: none !important; }
    .mobile-top-links, .mobile-exit-view-btn, .share-modal-overlay { display: none !important; }
    .benchmark-footer { display: none !important; }
`;

export function createScreenshotOverrideStyle() {
    const overrideStyle = document.createElement("style");
    overrideStyle.id = "screenshot-trophy-override";
    overrideStyle.innerHTML = `
        .eternal-layer, .eternal-layer-main, .rank-name::before, .rounded-inner-box span::before {
            display: none !important;
            animation: none !important;
        }
        .ranks-labels .rank-item:nth-child(11) .trophy-layer { filter: ${STELLAR_TROPHY_FILTER} !important; -webkit-filter: ${STELLAR_TROPHY_FILTER} !important; }
        .ranks-labels .rank-item:nth-child(11) span { color: #FF6F00 !important; background: none !important; -webkit-text-fill-color: #FF6F00 !important; -webkit-background-clip: initial !important; background-clip: initial !important; animation: none !important; }
        .ranks-labels .rank-item:nth-child(12) .trophy-layer { filter: sepia(1) hue-rotate(290deg) saturate(3) brightness(0.9) !important; -webkit-filter: sepia(1) hue-rotate(290deg) saturate(3) brightness(0.9) !important; }
        .ranks-labels .rank-item:nth-child(12) span { color: #D8007F !important; background: none !important; -webkit-text-fill-color: #D8007F !important; -webkit-background-clip: initial !important; background-clip: initial !important; animation: none !important; }
        .ranks-labels .rank-item:nth-child(13) .trophy-layer { filter: sepia(1) hue-rotate(2deg) saturate(0.74) brightness(1.16) !important; -webkit-filter: sepia(1) hue-rotate(2deg) saturate(0.74) brightness(1.16) !important; }
        .ranks-labels .rank-item:nth-child(13) span { color: #e5d9b6 !important; background: none !important; -webkit-text-fill-color: #e5d9b6 !important; -webkit-background-clip: initial !important; background-clip: initial !important; animation: none !important; }
    `;
    return overrideStyle;
}
