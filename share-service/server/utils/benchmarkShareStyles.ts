export const BENCHMARK_SHARE_DESKTOP_CSS = `
  html, body {
    margin: 0;
    padding: 0;
    background: var(--app-bg);
  }

  body.share-render-static {
    font-family: Arial, sans-serif;
    color: var(--text-primary);
  }

  body.share-render-static * {
    box-sizing: border-box;
  }

  body.share-render-static #share-root,
  body.share-render-static #responsive-wrapper {
    width: 1600px;
    min-width: 1600px;
    max-width: 1600px;
    margin: 0 auto;
    padding: 28px;
    background: var(--app-bg);
  }

  body.share-render-static #benchmark-content {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 6px;
    background: var(--app-bg);
  }

  body.share-render-static .controls-container,
  body.share-render-static .top-box,
  body.share-render-static .middle-box,
  body.share-render-static .container,
  body.share-render-static .radar-box {
    width: 100%;
    border: 1px solid var(--panel-border);
    background: var(--panel-bg);
    background-image: none;
  }

  body.share-render-static .controls-container {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 0;
    position: relative;
    z-index: 10;
  }

  body.share-render-static .small-inner-box {
    height: 35px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    padding: 0 10px 0 15px;
    border-radius: 12px;
    background: var(--config-box-bg);
    border: 1px solid var(--config-box-border);
    color: var(--text-primary);
    font-size: 13px;
    font-weight: 700;
    white-space: nowrap;
    min-width: 0;
  }

  body.share-render-static .platform-label {
    color: var(--text-primary);
  }

  body.share-render-static .arrow-icon,
  body.share-render-static .dropdown-menu,
  body.share-render-static footer,
  body.share-render-static .highlights-box,
  body.share-render-static .mobile-top-links,
  body.share-render-static .notification-dot,
  body.share-render-static .share-modal-overlay,
  body.share-render-static .mobile-exit-view-btn,
  body.share-render-static .cave-play-edit,
  body.share-render-static .cave-play-panel,
  body.share-render-static .cave-play-overlay {
    display: none !important;
  }

  body.share-render-static .arrow-icon {
    fill: #666;
    flex-shrink: 0;
  }

  body.share-render-static #mountBox,
  body.share-render-static #userMenuBox {
    gap: 6px;
  }

  body.share-render-static #mountConfigImage,
  body.share-render-static .mount-config-image {
    width: 22px;
    height: 22px;
    object-fit: contain;
    flex-shrink: 0;
  }

  body.share-render-static .user-menu-wrapper {
    margin-left: auto;
  }

  body.share-render-static .user-menu-avatar-placeholder {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: #0a0a0a;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    flex-shrink: 0;
  }

  body.share-render-static #userMenuBox.user-menu-box--no-avatar .user-menu-avatar-placeholder {
    display: none;
  }

  body.share-render-static #userMenuUsername {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  body.share-render-static .top-box {
    height: 72px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    padding: 0 20px;
    position: relative;
    overflow: hidden;
  }

  body.share-render-static .profile-circle {
    width: 60px;
    height: 60px;
    margin-right: 15px;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: var(--config-box-bg);
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    position: relative;
    flex-shrink: 0;
  }

  body.share-render-static .profile-circle.no-pic-has-flag {
    width: auto;
    height: auto;
    margin-right: 10px;
    border: none;
    border-radius: 0;
    background: none;
  }

  body.share-render-static .share-flag-shell,
  body.share-render-static .nationality-flag {
    position: absolute;
    width: 28px;
    height: 18px;
    bottom: 3px;
    left: calc(100% - 19.5px);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border: 1px solid #111;
    background: #444;
  }

  body.share-render-static .profile-circle.no-pic-has-flag .share-flag-shell {
    position: static;
    width: 40px;
    height: 26px;
    left: auto;
    bottom: auto;
    border-color: #666;
  }

  body.share-render-static .share-flag-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  body.share-render-static .share-flag-fallback {
    font-size: 12px;
    color: var(--text-secondary);
  }

  body.share-render-static .profile-details {
    display: flex;
    flex-direction: column;
    justify-content: center;
    position: relative;
    min-width: 0;
    flex: 0 1 auto;
    padding-top: 2px;
    padding-bottom: 2px;
  }

  body.share-render-static .profile-views {
    position: absolute;
    top: 0;
    left: 0;
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 10px;
    font-weight: 700;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  body.share-render-static .views-icon {
    width: 12px;
    height: 12px;
    fill: #888;
    flex-shrink: 0;
  }

  body.share-render-static .profile-identity {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  body.share-render-static .profile-text-block {
    display: flex;
    align-items: baseline;
    gap: 8px;
    min-width: 110px;
  }

  body.share-render-static .profile-name,
  body.share-render-static .guild-name {
    font-size: 20px;
    font-weight: 700;
    line-height: 1;
    white-space: nowrap;
  }

  body.share-render-static .guild-name {
    color: #ffd700;
  }

  body.share-render-static .trophies-section {
    position: relative;
    left: 10px;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: center;
    min-width: 120px;
    max-width: 320px;
    flex: 0 1 320px;
    align-self: center;
  }

  body.share-render-static .trophy-placeholder,
  body.share-render-static .trophy-list,
  body.share-render-static .trophy-card {
    background: var(--config-box-bg);
    border: 1px solid var(--config-box-border);
    background-image: none;
  }

  body.share-render-static .trophy-placeholder {
    border-style: dashed;
    border-radius: 12px;
    padding: 11px 14px;
    color: rgba(255, 255, 255, 0.48);
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    text-align: center;
  }

  body.share-render-static .trophy-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    border-radius: 12px;
    padding: 6px 9px;
  }

  body.share-render-static .trophy-list-header {
    display: none;
  }

  body.share-render-static .seasonal-label {
    font-size: 11px;
    color: #fff;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  body.share-render-static .seasonal-total {
    font-size: 10px;
    color: #8f8f8f;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  body.share-render-static .trophy-row {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 6px;
  }

  body.share-render-static .trophy-card {
    display: flex;
    align-items: center;
    gap: 5px;
    border-radius: 12px;
    padding: 5px 7px;
    min-height: 31px;
  }

  body.share-render-static .trophy-img {
    width: 18px;
    height: 18px;
    object-fit: contain;
    flex-shrink: 0;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.45));
  }

  body.share-render-static .trophy-card-info {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  body.share-render-static .trophy-card-label {
    color: #fff;
    font-size: 9px;
    font-weight: 700;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  body.share-render-static .trophy-card-count {
    color: #c8c8c8;
    font-size: 8px;
    font-weight: 700;
  }

  body.share-render-static .achievements-section {
    width: auto;
    margin: 0 30px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 5px;
  }

  body.share-render-static .achievements-title {
    color: #fff;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  body.share-render-static .achievements-bar,
  body.share-render-static .progress-bar {
    background: var(--config-box-bg);
    border: 1px solid var(--config-box-border);
    background-image: none;
  }

  body.share-render-static .achievements-bar {
    width: 200px;
    height: 12px;
    border-radius: 999px;
    overflow: hidden;
    position: relative;
  }

  body.share-render-static .achievements-fill {
    position: absolute;
    inset: 0 auto 0 0;
    height: 100%;
    background: linear-gradient(90deg, var(--accent-color), #fff0b8);
  }

  body.share-render-static .achievements-fill--zero {
    background: transparent;
  }

  body.share-render-static .achievements-text {
    color: #fff;
    font-size: 12px;
    font-weight: 700;
  }

  body.share-render-static .achievements-percent {
    color: var(--text-secondary);
    margin-left: 4px;
  }

  body.share-render-static .top-right {
    margin-left: auto;
    display: flex;
    align-items: center;
  }

  body.share-render-static .nav-item {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: #fff;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
  }

  body.share-render-static .nav-icon {
    width: 16px;
    height: 16px;
    fill: currentColor;
  }

  body.share-render-static .nav-divider {
    width: 2px;
    height: 25px;
    background: #333;
    margin: 0 20px;
  }

  body.share-render-static .middle-box {
    min-height: 150px;
    padding: 20px;
    border-radius: 24px;
    display: flex;
    position: relative;
    overflow: visible;
  }

  body.share-render-static .rounded-inner-box {
    position: absolute;
    top: 20px;
    left: 20px;
    right: 20px;
    bottom: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding-right: calc(var(--progress-span) + var(--progression-right));
    overflow: visible;
    --rank-glow-core: transparent;
    --rank-glow-mid: transparent;
    --rank-glow-soft: transparent;
    --rank-glow-halo: transparent;
    z-index: 0;
  }

  body.share-render-static .rank-up-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: visible;
    isolation: isolate;
    z-index: 1;
  }

  body.share-render-static .rounded-inner-box.rank-box-glow .rank-up-content::before {
    content: "";
    position: absolute;
    left: 50%;
    top: 52%;
    width: 158px;
    height: 64px;
    transform: translate(-50%, -50%);
    border-radius: 999px;
    pointer-events: none;
    z-index: -2;
    opacity: 0.68;
    background: radial-gradient(
      ellipse at center,
      var(--rank-glow-core) 0%,
      var(--rank-glow-mid) 38%,
      var(--rank-glow-soft) 70%,
      transparent 100%
    );
    filter: blur(24px);
  }

  body.share-render-static .rounded-inner-box.rank-box-glow .rank-up-content::after {
    content: "";
    position: absolute;
    left: 50%;
    top: 44%;
    width: 78px;
    height: 38px;
    transform: translate(-50%, -50%);
    border-radius: 999px;
    pointer-events: none;
    z-index: -1;
    opacity: 0.56;
    background: radial-gradient(
      ellipse at center,
      var(--rank-glow-halo) 0%,
      var(--rank-glow-soft) 55%,
      transparent 100%
    );
    filter: blur(16px);
  }

  body.share-render-static .rank-up-icon-wrap {
    position: relative;
    height: 50px;
    display: inline-block;
  }

  body.share-render-static .rank-up-trophy {
    height: 100%;
    width: auto;
    display: block;
  }

  body.share-render-static .rank-up-trophy-layer,
  body.share-render-static .eternal-layer,
  body.share-render-static .eternal-layer-main,
  body.share-render-static .rank-name::before,
  body.share-render-static .rounded-inner-box span::before {
    display: none !important;
  }

  body.share-render-static .rank-up-text-base {
    margin-top: 5px;
    display: block;
    line-height: 1.2;
    font-size: 25px;
    font-weight: 700;
    font-family: "Times New Roman", Times, serif;
    color: #fff;
  }

  body.share-render-static .ranks-wrapper {
    margin-left: auto;
    width: var(--ranks-wrapper-width);
    display: flex;
    flex-direction: column;
    gap: 8px;
    justify-content: center;
    position: relative;
    z-index: 1;
    padding-bottom: 10px;
  }

  body.share-render-static .ranks-labels {
    display: flex;
    width: var(--progress-span);
    margin-left: calc(-1 * var(--progress-extend));
    font-size: 12.5px;
    font-weight: 700;
    color: #666;
  }

  body.share-render-static .rank-item {
    width: 78.2px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  body.share-render-static .rank-number {
    font-size: 11px;
    font-weight: 700;
    margin-bottom: 2px;
    position: relative;
    bottom: 4px;
  }

  body.share-render-static .trophy-container {
    position: relative;
    height: 27px;
    margin-bottom: 5px;
    display: inline-block;
  }

  body.share-render-static .trophy-base {
    display: none;
  }

  body.share-render-static .trophy-layer {
    position: relative;
    height: 100%;
    width: auto;
    display: block;
  }

  body.share-render-static .rank-name {
    font-size: 11px;
    font-weight: 700;
    color: #fff;
    text-align: center;
    line-height: 1;
  }

  body.share-render-static .progress-stack {
    position: relative;
    height: 32px;
  }

  body.share-render-static .progress-bar {
    width: var(--progress-span);
    margin-left: calc(-1 * var(--progress-extend));
    height: 32px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(0, 0, 0, 0.4);
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 700;
    color: #fff;
    overflow: visible;
  }

  body.share-render-static .progress-fill {
    position: absolute;
    inset: 0 auto 0 0;
    width: 0;
    z-index: 0;
  }

  body.share-render-static .progress-value-label,
  body.share-render-static .rank-line {
    position: relative;
    z-index: 1;
  }

  body.share-render-static .progress-value-label {
    color: #fff;
  }

  body.share-render-static .rank-line {
    position: absolute;
    top: 50%;
    width: 2px;
    height: 60%;
    transform: translate(-50%, -50%);
    background: #444;
  }

  body.share-render-static .rank-line-1 { left: 21.5%; }
  body.share-render-static .rank-line-2 { left: 41.5%; }
  body.share-render-static .rank-line-3 { left: 61.5%; }
  body.share-render-static .rank-line-4 { left: 81.5%; }

  body.share-render-static .roman-numerals-container {
    width: var(--progress-span);
    margin-left: calc(-1 * var(--progress-extend));
    position: relative;
    height: 18px;
    color: #666;
    font-size: 10px;
    font-weight: 700;
  }

  body.share-render-static .roman-numerals-container span {
    position: absolute;
    top: 0;
    transform: translateX(-50%);
  }

  body.share-render-static .roman-pos-0 { left: 10%; }
  body.share-render-static .roman-pos-1 { left: 30%; }
  body.share-render-static .roman-pos-2 { left: 50%; }
  body.share-render-static .roman-pos-3 { left: 70%; }
  body.share-render-static .roman-pos-4 { left: 90%; }

  body.share-render-static .info-icon {
    position: absolute;
    right: 18px;
    top: 18px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 1px solid var(--config-box-border);
    color: #999;
    font-size: 11px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
  }

  body.share-render-static .container {
    min-height: 640px;
    border-radius: 24px;
    position: relative;
    overflow: hidden;
    padding: 0;
  }

  body.share-render-static .bg-stripe {
    position: absolute;
    right: 0;
    width: calc(var(--progression-width) + var(--progression-right));
    z-index: 0;
    pointer-events: none;
  }

  body.share-render-static .ranks-bars-stack {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    position: relative;
    width: auto;
    padding: 40px 20px 15px 20px;
    margin-right: var(--progression-right);
    z-index: 202;
    pointer-events: none;
  }

  body.share-render-static .container > .ranks-bars-stack > .ranks-bars {
    margin-bottom: 15px;
  }

  body.share-render-static .container > .ranks-bars-stack > .ranks-bars:last-child {
    margin-bottom: 0;
  }

  body.share-render-static .rating-text,
  body.share-render-static .score-text,
  body.share-render-static .progression-text,
  body.share-render-static .cave-text {
    position: absolute;
    top: 0;
    height: 33.5px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 12px;
    font-weight: 700;
    z-index: 2;
  }

  body.share-render-static .rating-text {
    right: calc(-1 * var(--progression-right));
    width: 90px;
  }

  body.share-render-static .score-text {
    left: 360px;
    width: 100px;
  }

  body.share-render-static .cave-text {
    left: 50px;
    width: var(--cave-box-width);
  }

  body.share-render-static .progression-text {
    left: calc(20px + var(--cave-box-width) + var(--cave-box-offset) + 100px + 10px);
    width: var(--progression-width);
    justify-content: flex-start;
  }

  body.share-render-static .vertical-box {
    position: absolute;
    left: 0;
    width: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 0 12px 12px 0;
    background: rgba(0, 0, 0, 0.3);
    overflow: visible;
    z-index: 1;
  }

  body.share-render-static .vertical-box.vbox-1 {
    top: 33.5px;
    height: 278px;
  }

  body.share-render-static .vertical-box.vbox-2 {
    top: 313.5px;
    height: 278px;
  }

  body.share-render-static .vertical-box-label-wrap {
    transform: rotate(-90deg);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    position: relative;
    gap: 0;
  }

  body.share-render-static .vertical-box-label {
    color: #fff;
    font-size: 15px;
    font-weight: 700;
    white-space: nowrap;
  }

  body.share-render-static .vertical-box-icon {
    position: absolute;
    top: 50%;
    right: calc(100% + 6px);
    height: 20px;
    width: auto;
    transform: translateY(-50%) rotate(90deg);
  }

  body.share-render-static .ranks-bars {
    position: relative;
    display: flex;
    gap: 0;
    margin: 0;
    padding: 0;
    background: transparent;
    z-index: 2;
  }

  body.share-render-static .rank-bar {
    width: 76.2px;
    height: 25px;
    margin: 0 1px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    transform: skewX(-40deg);
    overflow: hidden;
    position: relative;
    background: var(--slanted-bar-base);
    pointer-events: auto;
  }

  body.share-render-static .rank-bar > * {
    position: relative;
    z-index: 1;
  }

  body.share-render-static .rank-bar::before {
    content: "";
    position: absolute;
    inset: 0 auto 0 0;
    width: var(--fill-percent, 0%);
    max-width: calc(100% - 1px);
    background: var(--fill-color, transparent);
    z-index: 0;
  }

  body.share-render-static .rank-bar.rank-threshold-cell {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  body.share-render-static .rank-threshold-value {
    display: inline-block;
    transform: skewX(40deg);
    color: #fff;
    font-size: 12px;
    font-weight: 700;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
  }

  body.share-render-static .rank-bar.cave-cell-label {
    position: absolute;
    right: calc(100% + var(--cave-box-offset));
    top: -6.5px;
    width: var(--cave-box-width);
    height: 38px;
    margin-right: 2px;
    border: none;
    transform: none;
    display: flex;
    align-items: center;
    padding: 0 10px;
    background: transparent;
    overflow: visible;
  }

  body.share-render-static .rank-bar.cave-cell-label::before {
    width: 100%;
    max-width: none;
    background: var(--cave-box-base);
  }

  body.share-render-static .cave-cell-content {
    display: inline-flex;
    align-items: center;
    min-width: 0;
    flex: 1 1 auto;
    overflow: hidden;
  }

  body.share-render-static .cave-cell-content img {
    width: 30px;
    height: 30px;
    object-fit: fill;
    margin-right: 5px;
    border-radius: 2px;
    flex-shrink: 0;
  }

  body.share-render-static .cave-cell-name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #fff;
    font-size: 12px;
    font-weight: 700;
  }

  body.share-render-static .cave-play-wrapper {
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    flex: 0 0 auto;
  }

  body.share-render-static .cave-play-anchor {
    width: 30px;
    height: 30px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: none;
    background: transparent;
  }

  body.share-render-static .cave-play-icon {
    width: 18px;
    height: 18px;
    fill: #777;
    display: block;
  }

  body.share-render-static .cave-play-wrapper.has-link .cave-play-icon {
    fill: var(--accent-color);
  }

  body.share-render-static .score-input-wrapper {
    position: absolute;
    left: 360px;
    width: 100px;
    border-radius: 4px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    background: rgba(255, 255, 255, 0.02);
    box-shadow: inset 4px 0 0 var(--score-box-accent-inline, rgba(255, 255, 255, 0.05));
    overflow: hidden;
    z-index: 2;
  }

  body.share-render-static .score-input {
    width: 100%;
    height: 100%;
    border: none;
    outline: none;
    padding: 0;
    background: var(--active-outline-fill, transparent);
    color: transparent;
    caret-color: transparent;
  }

  body.share-render-static .score-text-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    pointer-events: none;
  }

  body.share-render-static .rating-value {
    position: absolute;
    right: 0;
    width: 90px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    background: var(--active-outline-fill, transparent);
    color: #fff;
    z-index: 2;
  }

  body.share-render-static .radar-box {
    border-radius: 24px;
    padding: 18px 22px 22px;
    overflow: hidden;
  }

  body.share-render-static .radar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 16px;
  }

  body.share-render-static .radar-title {
    color: #fff;
    font-size: 16px;
    font-weight: 700;
    letter-spacing: 0.04em;
  }

  body.share-render-static .radar-tabs {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px;
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.35);
    border: 1px solid var(--panel-border);
  }

  body.share-render-static .radar-tab {
    border: none;
    padding: 6px 14px;
    border-radius: 999px;
    background: transparent;
    color: #bbb;
    font-size: 11px;
    font-weight: 600;
  }

  body.share-render-static .radar-tab.active {
    background: rgba(255, 255, 255, 0.12);
    color: #fff;
  }

  body.share-render-static .radar-content {
    display: grid;
    grid-template-columns: 1.4fr 1fr;
    gap: 18px;
    align-items: center;
  }

  body.share-render-static .radar-canvas-wrap {
    height: 380px;
    padding: 12px;
    border-radius: 18px;
    background: rgba(0, 0, 0, 0.35);
    border: 1px solid var(--panel-border);
  }

  body.share-render-static .radar-chart-grid {
    width: 100%;
    height: 100%;
    display: grid;
    grid-template-columns: 1.35fr 0.8fr 1.35fr;
    gap: 0;
    align-items: center;
  }

  body.share-render-static .radar-chart-panel,
  body.share-render-static .radar-donut-wrap,
  body.share-render-static .radar-bar-wrap {
    width: 100%;
    height: 100%;
  }

  body.share-render-static .radar-donut-wrap,
  body.share-render-static .radar-bar-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  body.share-render-static .radar-side {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  body.share-render-static .radar-stat {
    border-radius: 16px;
    padding: 12px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  body.share-render-static .radar-stat-title {
    color: #888;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  body.share-render-static .radar-stat-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 10px;
  }

  body.share-render-static .radar-stat-item {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 8px;
    align-items: center;
    color: #f2f2f2;
    font-size: 12px;
    --radar-color: rgba(255, 255, 255, 0.4);
  }

  body.share-render-static .radar-stat-value {
    color: var(--radar-color);
    font-size: 11px;
  }

  body.share-render-static .radar-bar {
    grid-column: 1 / -1;
    height: 6px;
    margin-top: 6px;
    border-radius: 999px;
    overflow: hidden;
    background: rgba(255, 255, 255, 0.08);
  }

  body.share-render-static .radar-bar span {
    display: block;
    height: 100%;
    border-radius: 999px;
    background: var(--radar-color);
  }

  body.share-render-static .share-radar-svg {
    width: 100%;
    height: 100%;
    display: block;
  }

  body.share-render-static .share-radar-ring {
    fill: none;
    stroke: rgba(255, 255, 255, 0.08);
    stroke-width: 1.2;
  }

  body.share-render-static .share-radar-axis {
    stroke: rgba(255, 255, 255, 0.12);
    stroke-width: 1;
  }

  body.share-render-static .share-radar-shape {
    stroke-width: 2;
  }

  body.share-render-static .share-radar-point {
    stroke: rgba(0, 0, 0, 0.45);
    stroke-width: 0.6;
  }

  body.share-render-static .share-radar-label {
    fill: #d8d8d8;
    font-size: 7px;
    font-weight: 700;
    dominant-baseline: middle;
  }

  body.share-render-static .share-radar-canvas-image {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
  }

  body.share-render-static .share-pie-fallback {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    width: 100%;
    height: 100%;
  }

  body.share-render-static .share-pie-svg {
    width: 100%;
    height: 68%;
    display: block;
  }

  body.share-render-static .share-pie-legend {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 0 8px;
  }

  body.share-render-static .share-pie-legend-row {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 7px;
    color: #f0f0f0;
    font-size: 11px;
    font-weight: 700;
  }

  body.share-render-static .share-pie-legend-icon {
    width: 14px;
    height: 14px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  body.share-render-static .share-pie-legend-icon img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
  }

  body.share-render-static .share-pie-legend-value {
    margin-left: auto;
    font-size: 11px;
  }

  body.share-render-static .share-bar-svg {
    width: 100%;
    height: 100%;
    display: block;
  }

  body.share-render-static .share-bar-axis {
    stroke: #ffffff;
    stroke-width: 1;
  }

  body.share-render-static .share-bar-y-label {
    fill: #d8d8d8;
    font-size: 10px;
    text-anchor: end;
    dominant-baseline: middle;
  }

  body.share-render-static .share-bar-y-tick {
    stroke: #ffffff;
    stroke-width: 1;
  }

  body.share-render-static .share-bar-h-line {
    stroke: rgba(255, 255, 255, 0.28);
    stroke-width: 1;
  }

  body.share-render-static .share-bar-x-label {
    fill: #d8d8d8;
    font-size: 10px;
    text-anchor: middle;
    dominant-baseline: hanging;
  }

  body.share-render-static .share-bar-value-label {
    fill: rgba(255, 255, 255, 0.75);
    font-size: 10px;
    text-anchor: middle;
    dominant-baseline: middle;
  }

  body.share-render-static .share-bar-item,
  body.share-render-static .share-bar-track,
  body.share-render-static .share-bar-fill,
  body.share-render-static .share-bar-value,
  body.share-render-static .share-bar-label,
  body.share-render-static .share-donut-panel,
  body.share-render-static .share-donut,
  body.share-render-static .share-donut-hole,
  body.share-render-static .share-donut-legend,
  body.share-render-static .share-donut-row,
  body.share-render-static .share-donut-dot {
    display: none !important;
  }

  body.share-render-static .share-pie-legend-icon,
  body.share-render-static .share-pie-legend-row,
  body.share-render-static .share-pie-legend,
  body.share-render-static .share-pie-legend-value {
    flex-shrink: 0;
  }

  body.share-render-static .share-pie-legend-row span {
    line-height: 1;
  }

  body.share-render-static .share-pie-legend-row span:first-of-type {
    flex-shrink: 0;
  }
`;
