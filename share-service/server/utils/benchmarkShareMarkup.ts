import type { BenchmarkShareAssets } from "./benchmarkShareAssets";
import { escapeHtml, type ShareThemeColors } from "./benchmarkShareTheme";
import type { ShareRow, ShareSnapshot, ShareTrophyItem } from "./shareSnapshot";

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
const CAVE_GROUPS = [[0, 1], [2, 3], [4, 5], [6], [7, 8], [9, 10], [11, 12], [13]];
const RANK_COLORS = ["transparent", "#505050", "#A05A2C", "#A0A0A0", "#967A00", "#40B0B0", "#1976D2", "#5E35B1", "#FFC400", "#FF3B30", "#00796B", "#FF9100", "#AD1457", "#d1bf8f"];
const SCORE_TEXT_COLORS = ["#ffffff", "#b0b0b0", "#e6a060", "#e0e0e0", "#ffd700", "#80ffff", "#64b5f6", "#b388ff", "#ffff00", "#ff8585", "#4db6ac", "#ffa726", "#f48fb1", "#f2e9cf"];
const RANK_LINE_COLORS = ["rgba(255,255,255,0.4)", "#909090", "#8B4513", "#333333", "#FFF59D", "#00fcff", "#19c1d2", "#aa00ff", "#fff122", "#8d0000", "#00e2b1", "#ffb700", "#FFB2DD", "#fff7e5"];
const STELLAR_TROPHY_FILTER = "sepia(1) hue-rotate(-18deg) saturate(4.8) brightness(1.05)";
const PLAY_ICON_PATH = "M21.582,6.186c-0.23-0.86-0.908-1.538-1.768-1.768C18.254,4,12,4,12,4S5.746,4,4.186,4.418 c-0.86,0.23-1.538,0.908-1.768,1.768C2,7.746,2,12,2,12s0,4.254,0.418,5.814c0.23,0.86,0.908,1.538,1.768,1.768 C5.746,20,12,20,12,20s6.254,0,7.814-0.418c0.861-0.23,1.538-0.908,1.768-1.768C22,16.254,22,12,22,12S22,7.746,21.582,6.186z M10,15.464V8.536L16,12L10,15.464z";
const RADAR_SWORDS_COLOR = "#ef4444";
const RADAR_BOMBS_COLOR = "#3b82f6";
const RADAR_BAR_COLORS_BY_LABEL: Record<string, string> = {
  Rats: "#9D8F84",
  Bats: "#41384B",
  Lizardrons: "#1A361B",
  Pyrats: "#A0140E",
  Rebels: "#008000",
  "Dark Blobs": "#58554E",
  Spiders: "#BD6B29"
};

function getNumericValue(value: unknown) {
  const normalized = String(value ?? "").replace(/[^\d.-]/g, "");
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : 0;
}

function getProgressLabelNumbers(value: string) {
  const matches = String(value || "").match(/-?\d+(\.\d+)?/g) || [];
  const current = Number(matches[0] || 0);
  const total = Number(matches[1] || 0);
  return {
    current: Number.isFinite(current) ? current : 0,
    total: Number.isFinite(total) ? total : 0
  };
}

function getAchievementPercent(value: string) {
  const match = String(value || "").match(/-?\d+(\.\d+)?/);
  const numeric = match ? Number(match[0]) : 0;
  return Math.max(0, Math.min(100, Number.isFinite(numeric) ? numeric : 0));
}

function truncateLabel(value: string, maxLength = 18) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}...`;
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = String(hex || "").trim().replace("#", "");
  if (!normalized) return `rgba(255,255,255,${alpha})`;
  const hexValue = normalized.length === 3
    ? normalized.split("").map((char) => char + char).join("")
    : normalized.slice(0, 6);
  const r = Number.parseInt(hexValue.slice(0, 2), 16);
  const g = Number.parseInt(hexValue.slice(2, 4), 16);
  const b = Number.parseInt(hexValue.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getTotalRating(snapshot: ShareSnapshot) {
  const progress = getProgressLabelNumbers(snapshot.profile?.progressLabel || "");
  if (progress.current > 0) return progress.current;
  return (snapshot.rows || []).reduce((sum, row) => sum + getNumericValue(row.rating), 0);
}

function getMaxRating(snapshot: ShareSnapshot) {
  const progress = getProgressLabelNumbers(snapshot.profile?.progressLabel || "");
  if (progress.total > 0) return progress.total;
  const rowCount = Math.max(1, snapshot.rows?.length || 14);
  return rowCount * 13 * 100;
}

function getRankThresholdNumbers(snapshot: ShareSnapshot) {
  return (snapshot.ranks || []).map((rank) => getNumericValue(rank.threshold)).filter((value) => value > 0);
}

function getCurrentRankIndex(totalRating: number, thresholds: number[]) {
  let rankIndex = 0;
  thresholds.forEach((threshold, index) => {
    if (totalRating >= threshold) {
      rankIndex = index + 1;
    }
  });
  return Math.max(0, Math.min(thresholds.length, rankIndex));
}

function getProgressInRank(totalRating: number, thresholds: number[], maxRating: number) {
  if (!(totalRating > 0)) return 0;

  const currentRankIndex = getCurrentRankIndex(totalRating, thresholds);
  const lowerBound = currentRankIndex > 0 ? thresholds[currentRankIndex - 1] : 0;
  const upperBound = currentRankIndex < thresholds.length
    ? thresholds[currentRankIndex]
    : maxRating;
  const range = Math.max(1, upperBound - lowerBound);
  return Math.max(0, Math.min(100, ((totalRating - lowerBound) / range) * 100));
}

function getRomanSubRank(progressPercent: number) {
  if (progressPercent >= 80) return "I";
  if (progressPercent >= 60) return "II";
  if (progressPercent >= 40) return "III";
  if (progressPercent >= 20) return "IV";
  return "V";
}

function getRankVisual(rankIndex: number) {
  const textColor = SCORE_TEXT_COLORS[rankIndex] || "#ffffff";
  switch (rankIndex) {
    case 1:
      return { filter: "grayscale(100%)", textColor };
    case 2:
      return { filter: "sepia(1) hue-rotate(-35deg) saturate(3) brightness(0.65)", textColor };
    case 3:
      return { filter: "grayscale(100%) brightness(1.3)", textColor };
    case 4:
      return { filter: "sepia(1) hue-rotate(5deg) saturate(2.5) brightness(0.9)", textColor };
    case 5:
      return { filter: "sepia(1) hue-rotate(130deg) saturate(1.5) brightness(1.1)", textColor };
    case 6:
      return { filter: "sepia(1) hue-rotate(170deg) saturate(3) brightness(1)", textColor };
    case 7:
      return { filter: "sepia(1) hue-rotate(220deg) saturate(3) brightness(0.9)", textColor };
    case 8:
      return { filter: "sepia(1) hue-rotate(10deg) saturate(5) brightness(1.2)", textColor };
    case 9:
      return { filter: "sepia(1) hue-rotate(330deg) saturate(5) brightness(0.8)", textColor };
    case 10:
      return { filter: "sepia(1) hue-rotate(120deg) saturate(2) brightness(0.9)", textColor };
    case 11:
      return { filter: STELLAR_TROPHY_FILTER, textColor: "#ff9100" };
    case 12:
      return { filter: "sepia(1) hue-rotate(290deg) saturate(3) brightness(0.9)", textColor: "#f48fb1" };
    case 13:
      return { filter: "sepia(1) hue-rotate(2deg) saturate(0.74) brightness(1.16)", textColor: "#e5d9b6" };
    default:
      return { filter: "", textColor: "#ffffff" };
  }
}

function buildArrowIcon() {
  return `
    <svg class="arrow-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 10l5 5 5-5z"></path>
    </svg>
  `;
}

function buildShareIcon() {
  return `
    <svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"></path>
    </svg>
  `;
}

function buildSettingsIcon() {
  return `
    <svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L4.04 9.81c-.11.2-.06.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.58 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.11-.22.06-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"></path>
    </svg>
  `;
}

function buildViewsIcon() {
  return `
    <svg class="views-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5c-5.5 0-9.8 4.3-10.8 6 .99 1.7 5.3 6 10.8 6s9.8-4.3 10.8-6c-.99-1.7-5.3-6-10.8-6zm0 10a4 4 0 110-8 4 4 0 010 8zm0-2.2a1.8 1.8 0 100-3.6 1.8 1.8 0 000 3.6z"></path>
    </svg>
  `;
}

function buildPlayIcon() {
  return `
    <svg class="cave-play-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="${PLAY_ICON_PATH}"></path>
    </svg>
  `;
}

function buildControls(snapshot: ShareSnapshot) {
  const mountImageUrl = snapshot.config?.mountImageUrl
    ? `<img id="mountConfigImage" class="mount-config-image" src="${escapeHtml(snapshot.config.mountImageUrl)}" alt="${escapeHtml(snapshot.config.mountLabel || snapshot.config.mount || "Mount")}">`
    : "";

  const avatarStyle = snapshot.profile?.profileImageUrl
    ? ` style="background-image:url('${escapeHtml(snapshot.profile.profileImageUrl)}')"`
    : "";

  return `
    <div class="controls-container">
      <div class="small-inner-box">
        <span class="platform-label">${escapeHtml(snapshot.config?.platform || "Mobile")}</span>
        ${buildArrowIcon()}
      </div>
      <div class="small-inner-box">
        <span>${escapeHtml(snapshot.config?.time || "5 Min")}</span>
        ${buildArrowIcon()}
      </div>
      <div class="small-inner-box">
        <span>${escapeHtml(snapshot.config?.stat || "Baddy Kills")}</span>
        ${buildArrowIcon()}
      </div>
      <div class="small-inner-box" id="mountBox">
        ${mountImageUrl}
        <span>${escapeHtml(snapshot.config?.mountLabel || snapshot.config?.mount || "Mountspeed 1")}</span>
        ${buildArrowIcon()}
      </div>
      <div class="user-menu-wrapper">
        <div class="small-inner-box${snapshot.profile?.profileImageUrl ? "" : " user-menu-box--no-avatar"}" id="userMenuBox">
          <span class="user-menu-avatar-placeholder"${avatarStyle}></span>
          <span id="userMenuUsername">${escapeHtml(snapshot.profile?.userMenuName || snapshot.profile?.name || "Player")}</span>
          ${buildArrowIcon()}
        </div>
      </div>
    </div>
  `;
}

function buildTrophies(trophies: ShareTrophyItem[]) {
  if (!trophies.length) {
    return `
      <div class="trophy-placeholder" id="trophyPlaceholder">
        <span>+ Add Seasonal Placements</span>
      </div>
    `;
  }

  return `
    <div class="trophy-list" id="trophyList">
      <div class="trophy-list-header">
        <span class="seasonal-label">Seasonal Placements</span>
      </div>
      <div class="trophy-row">
        ${trophies.map((item) => `
          <div class="trophy-card">
            ${item.imageUrl ? `<img class="trophy-img" src="${escapeHtml(item.imageUrl)}" alt="">` : ""}
            <div class="trophy-card-info">
              <div class="trophy-card-label">${escapeHtml(item.label || "")}</div>
              <div class="trophy-card-count">${escapeHtml(item.count || "")}</div>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function buildTopBox(snapshot: ShareSnapshot) {
  const profileCircleStyle = snapshot.profile?.profileImageUrl
    ? ` style="background-image:url('${escapeHtml(snapshot.profile.profileImageUrl)}');"`
    : "";
  const flagMarkup = snapshot.profile?.flagUrl
    ? `
        <span class="share-flag-shell">
          <img class="share-flag-image" src="${escapeHtml(snapshot.profile.flagUrl)}" alt="">
        </span>
      `
    : "";
  const achievementsPercent = getAchievementPercent(snapshot.profile?.achievementsPercent || "");

  return `
    <div class="top-box">
      <div class="profile-circle${snapshot.profile?.noPicHasFlag ? " no-pic-has-flag" : ""}"${profileCircleStyle}>
        ${flagMarkup}
      </div>
      <div class="profile-details">
        <div class="profile-views">
          ${buildViewsIcon()}
          <span id="viewCount">${escapeHtml(snapshot.profile?.views || "0")}</span>
        </div>
        <div class="profile-identity">
          <div class="profile-text-block">
            <div class="profile-name">${escapeHtml(snapshot.profile?.name || "Player")}</div>
            <div class="guild-name">${escapeHtml(snapshot.profile?.guild || "(Guild)")}</div>
          </div>
          <div class="trophies-section" id="trophiesSection">
            ${buildTrophies(snapshot.profile?.trophies || [])}
          </div>
        </div>
      </div>
      <div class="achievements-section">
        <div class="achievements-title">Achievements</div>
        <div class="achievements-bar">
          <div class="achievements-fill${achievementsPercent <= 0 ? " achievements-fill--zero" : ""}" style="width:${achievementsPercent}%;"></div>
        </div>
        <div class="achievements-text">
          ${escapeHtml(snapshot.profile?.achievements || "You've unlocked 0/0")}
          <span class="achievements-percent">${escapeHtml(snapshot.profile?.achievementsPercent || "(0%)")}</span>
        </div>
      </div>
      <div class="top-right">
        <div class="nav-item">
          ${buildShareIcon()}
          <span>Share</span>
        </div>
        <div class="nav-divider"></div>
        <div class="nav-item">
          ${buildSettingsIcon()}
          <span>Settings</span>
        </div>
      </div>
    </div>
  `;
}

function buildCurrentRankBox(snapshot: ShareSnapshot, assets: BenchmarkShareAssets, totalRating: number, maxRating: number, thresholds: number[]) {
  const currentRankIndex = getCurrentRankIndex(totalRating, thresholds);
  const progressInRank = getProgressInRank(totalRating, thresholds, maxRating);

  if (currentRankIndex <= 0) {
    return `<div class="rounded-inner-box">Unranked</div>`;
  }

  const rank = snapshot.ranks?.[currentRankIndex - 1];
  const rankName = rank?.name || "Rank";
  const rankVisual = getRankVisual(currentRankIndex);
  const glowStyle = [
    `--rank-glow-core:${hexToRgba(rankVisual.textColor, 0.34)}`,
    `--rank-glow-mid:${hexToRgba(rankVisual.textColor, 0.18)}`,
    `--rank-glow-soft:${hexToRgba(rankVisual.textColor, 0.08)}`,
    `--rank-glow-halo:${hexToRgba(rankVisual.textColor, 0.24)}`
  ].join(";");
  const label = totalRating >= maxRating
    ? `${escapeHtml(rankName)} Complete`
    : `${escapeHtml(rankName)}&nbsp;<span class="rank-sub-rn">${getRomanSubRank(progressInRank)}</span>`;

  return `
    <div class="rounded-inner-box rank-box-glow" style="${glowStyle}">
      <div class="rank-up-content">
        <div class="rank-up-icon-wrap">
          <img src="${assets.trophy}" class="rank-up-trophy" alt="Trophy" style="filter:${rankVisual.filter};">
        </div>
        <span class="rank-up-text rank-up-text-base" style="color:${rankVisual.textColor};">${label}</span>
      </div>
    </div>
  `;
}

function buildRanks(snapshot: ShareSnapshot, assets: BenchmarkShareAssets, totalRating: number, maxRating: number) {
  const thresholds = getRankThresholdNumbers(snapshot);
  const currentRankIndex = getCurrentRankIndex(totalRating, thresholds);
  const progressInRank = getProgressInRank(totalRating, thresholds, maxRating);
  const activeRankColor = currentRankIndex > 0 ? (RANK_COLORS[currentRankIndex] || "#505050") : "#505050";
  const activeLineColor = RANK_LINE_COLORS[currentRankIndex] || "#444";
  const progressText = escapeHtml(snapshot.profile?.progressLabel || `${totalRating} / ${maxRating}`);

  return `
    <div class="ranks-wrapper">
      <div class="ranks-labels">
        ${(snapshot.ranks || []).map((rank, index) => {
          const rankNumber = index + 1;
          const visual = getRankVisual(rankNumber);
          const isUnlocked = currentRankIndex >= rankNumber;
          return `
            <div class="rank-item">
              <span class="rank-number" style="color:${isUnlocked ? visual.textColor : "#9a9a9a"};">${escapeHtml(rank.threshold || "")}</span>
              <div class="trophy-container">
                <img src="${assets.trophy}" class="trophy-base" alt="Trophy">
                <img src="${assets.trophy}" class="trophy-layer" alt="Trophy" style="filter:${visual.filter};opacity:${isUnlocked ? 1 : 0.55};">
              </div>
              <span class="rank-name" style="color:${isUnlocked ? visual.textColor : "#ffffff"};">${escapeHtml(rank.name || "")}</span>
            </div>
          `;
        }).join("")}
      </div>
      <div class="progress-stack">
        <div class="progress-bar">
          <div class="progress-fill" style="width:${progressInRank}%;background:${activeRankColor};"></div>
          <span class="progress-value-label">${progressText}</span>
          <div class="rank-line rank-line-1" style="background:${progressInRank > 21.5 ? activeLineColor : "#444"};"></div>
          <div class="rank-line rank-line-2" style="background:${progressInRank > 41.5 ? activeLineColor : "#444"};"></div>
          <div class="rank-line rank-line-3" style="background:${progressInRank > 61.5 ? activeLineColor : "#444"};"></div>
          <div class="rank-line rank-line-4" style="background:${progressInRank > 81.5 ? activeLineColor : "#444"};"></div>
        </div>
        <div class="roman-numerals-container">
          <span class="roman-pos-0">V</span>
          <span class="roman-pos-1">IV</span>
          <span class="roman-pos-2">III</span>
          <span class="roman-pos-3">II</span>
          <span class="roman-pos-4">I</span>
        </div>
      </div>
    </div>
  `;
}

function buildMiddleBox(snapshot: ShareSnapshot, assets: BenchmarkShareAssets) {
  const totalRating = getTotalRating(snapshot);
  const maxRating = getMaxRating(snapshot);
  const thresholds = getRankThresholdNumbers(snapshot);

  return `
    <div class="middle-box">
      ${buildCurrentRankBox(snapshot, assets, totalRating, maxRating, thresholds)}
      ${buildRanks(snapshot, assets, totalRating, maxRating)}
      <div class="info-icon">!</div>
    </div>
  `;
}

function getRowFillPercent(progressValue: number, tierIndex: number) {
  return Math.max(0, Math.min(100, (progressValue - tierIndex) * 100));
}

function getRowRankIndex(row: ShareRow) {
  if (row.rankIndex && row.rankIndex > 0) return row.rankIndex;
  if (row.progressValue && row.progressValue > 0) {
    return Math.max(1, Math.min(13, Math.floor(row.progressValue)));
  }
  return 0;
}

function buildStripeBackground(maxRank: number) {
  if (maxRank > 1) {
    return `linear-gradient(to right, transparent, ${hexToRgba(RANK_COLORS[maxRank], 0.25)})`;
  }
  if (maxRank === 1) {
    return "linear-gradient(to right, transparent, rgba(255,255,255,0.08))";
  }
  return "none";
}

function buildCaveRow(row: ShareRow, index: number) {
  const rankIndex = getRowRankIndex(row);
  const fillColor = row.fillColor || (rankIndex > 0 ? RANK_COLORS[rankIndex] : "transparent");
  const thresholds = row.thresholds || [];
  const thresholdBars = new Array(13).fill(0).map((_, thresholdIndex) => {
    const fillPercent = getRowFillPercent(Number(row.progressValue) || 0, thresholdIndex);
    return `
      <div class="rank-bar rank-threshold-cell" style="--fill-percent:${fillPercent}%;--fill-color:${fillColor};${thresholdIndex === 0 ? "margin-left:22px;" : ""}">
        <span class="rank-threshold-value">${escapeHtml(thresholds[thresholdIndex] || "")}</span>
      </div>
    `;
  }).join("");

  return `
    <div class="ranks-bars">
      <div class="rank-bar"></div>
      <div class="rank-bar cave-cell-label has-cave">
        <span class="cave-cell-content">
          ${row.imageUrl ? `<img src="${escapeHtml(row.imageUrl)}" alt="${escapeHtml(row.cave || `Cave ${index + 1}`)}">` : ""}
          <span class="cave-cell-name">${escapeHtml(row.cave || `Cave ${index + 1}`)}</span>
        </span>
        <span class="cave-play-wrapper${row.hasYoutube ? " has-link" : ""}">
          <span class="cave-play-anchor">
            ${buildPlayIcon()}
          </span>
        </span>
      </div>
      ${thresholdBars}
    </div>
  `;
}

function buildScoreBoxes(snapshot: ShareSnapshot, theme: ShareThemeColors) {
  return SCORE_ROW_TOPS.map((top, index) => {
    const row = snapshot.rows?.[index] || {};
    const score = getNumericValue(row.score);
    const hasValue = score > 0;
    const scoreBg = hasValue ? (row.scoreBg || theme.configBoxBg) : theme.configBoxBg;
    const scoreAccent = hasValue ? (row.scoreAccent || row.fillColor || "transparent") : "transparent";
    const textColor = hasValue ? (row.scoreTextColor || "#ffffff") : "#ffffff";

    return `
      <div class="score-input-wrapper" style="top:${top}px;height:38px;background:${scoreBg};--score-box-accent-inline:${scoreAccent};">
        <input class="score-input" type="text" value="${escapeHtml(String(score || 0))}" readonly>
        <div class="score-text-overlay" style="color:${textColor};">${escapeHtml(String(score || 0))}</div>
      </div>
    `;
  }).join("");
}

function buildRatingValues(snapshot: ShareSnapshot) {
  return STRIPE_LAYOUT.map((spec, index) => {
    const group = CAVE_GROUPS[index] || [];
    const total = group.reduce((sum, rowIndex) => sum + getNumericValue(snapshot.rows?.[rowIndex]?.rating), 0);
    const maxRank = group.reduce((best, rowIndex) => Math.max(best, getRowRankIndex(snapshot.rows?.[rowIndex] || {})), 0);
    const color = total > 0 ? (SCORE_TEXT_COLORS[maxRank] || "#ffffff") : "#ffffff";
    return `
      <div class="rating-value" style="top:${spec.top}px;height:${spec.height}px;color:${color};">
        ${escapeHtml(String(total))}
      </div>
    `;
  }).join("");
}

function buildStripes(snapshot: ShareSnapshot) {
  return STRIPE_LAYOUT.map((spec, index) => {
    const group = CAVE_GROUPS[index] || [];
    const maxRank = group.reduce((best, rowIndex) => Math.max(best, getRowRankIndex(snapshot.rows?.[rowIndex] || {})), 0);
    return `
      <div class="bg-stripe" style="top:${spec.top}px;height:${spec.height}px;background:${buildStripeBackground(maxRank)};"></div>
    `;
  }).join("");
}

function buildBenchmarkGrid(snapshot: ShareSnapshot, assets: BenchmarkShareAssets, theme: ShareThemeColors) {
  const rows = (snapshot.rows || []).slice(0, 14);

  return `
    <div class="container" id="benchmarkGridContainer">
      ${buildStripes(snapshot)}
      <div class="ranks-bars-stack" id="ranksBarsContainer">
        <div class="rating-text">Rating</div>
        <div class="score-text">Score</div>
        <div class="progression-text">Score Threshold</div>
        <div class="cave-text">Cave</div>
        <div class="vertical-box vbox-1">
          <div class="vertical-box-label-wrap">
            <img class="vertical-box-icon vertical-box-icon-swords" src="${assets.sword}" alt="">
            <span class="vertical-box-label">Swords</span>
          </div>
        </div>
        <div class="vertical-box vbox-2">
          <div class="vertical-box-label-wrap">
            <img class="vertical-box-icon vertical-box-icon-bombs" src="${assets.bomb}" alt="">
            <span class="vertical-box-label">Bombs</span>
          </div>
        </div>
        ${rows.map((row, index) => buildCaveRow(row, index)).join("")}
      </div>
      ${buildScoreBoxes(snapshot, theme)}
      ${buildRatingValues(snapshot)}
    </div>
  `;
}

function polarPoint(centerX: number, centerY: number, radius: number, angle: number) {
  return {
    x: centerX + (radius * Math.cos(angle)),
    y: centerY + (radius * Math.sin(angle))
  };
}

function describePieSlice(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarPoint(cx, cy, radius, startAngle);
  const end = polarPoint(cx, cy, radius, endAngle);
  const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)} Z`;
}

function getRowRatingValue(row: ShareRow) {
  const rating = getNumericValue(row.rating);
  if (rating > 0) return rating;
  const progress = Number(row.progressValue) || 0;
  if (progress > 0) return Math.round(progress * 100);
  return 0;
}

function buildRadarStatList(
  items: Array<{ label?: string; value?: string }>,
  resolveColor: (label: string) => string
) {
  return `
    <div class="radar-stat-list">
      ${items.map((item) => `
        <div class="radar-stat-item" style="--radar-color:${resolveColor(item.label || "")};">
          <span>${escapeHtml(item.label || "")}</span>
          <span class="radar-stat-value">${escapeHtml(item.value || "")}</span>
          <div class="radar-bar">
            <span style="width:${Math.max(0, Math.min(100, getNumericValue(item.value)))}%;"></span>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function buildRadarChartMarkup(snapshot: ShareSnapshot) {
  if (snapshot.radarImages?.main) {
    return `<img class="share-radar-canvas-image" src="${escapeHtml(snapshot.radarImages.main)}" alt="">`;
  }

  const mode = snapshot.radarMode || "combined";
  const allRows = (snapshot.rows || []).slice(0, 14);
  const half = Math.floor(allRows.length / 2);
  const selectedRows = mode === "swords"
    ? allRows.slice(0, half)
    : mode === "bombs"
      ? allRows.slice(half)
      : allRows;
  const safeRows = selectedRows.length ? selectedRows : [{ cave: "No Data", rating: "0" }];
  const rawValues = safeRows.map((row) => getRowRatingValue(row as ShareRow));
  const maxValue = Math.max(1, ...rawValues);
  const labels = safeRows.map((row, index) => row.cave || `Cave ${index + 1}`);

  const datasets = mode === "combined"
    ? (() => {
        const swordsValues = new Array(safeRows.length).fill(0);
        const bombsValues = new Array(safeRows.length).fill(0);
        rawValues.forEach((value, index) => {
          const normalized = Math.max(0, Math.min(1, value / maxValue));
          if (index < half) {
            swordsValues[index] = normalized;
          } else {
            bombsValues[index] = normalized;
          }
        });
        return [
          { values: bombsValues, color: RADAR_BOMBS_COLOR },
          { values: swordsValues, color: RADAR_SWORDS_COLOR }
        ];
      })()
    : [
        {
          values: rawValues.map((value) => Math.max(0, Math.min(1, value / maxValue))),
          color: mode === "bombs" ? RADAR_BOMBS_COLOR : RADAR_SWORDS_COLOR
        }
      ];

  const center = 180;
  const radius = 122;
  const count = Math.max(1, labels.length);
  const rings = [0.25, 0.5, 0.75, 1].map((step) => (
    `<circle class="share-radar-ring" cx="${center}" cy="${center}" r="${(radius * step).toFixed(2)}"></circle>`
  )).join("");
  const axes = labels.map((_, index) => {
    const angle = (-Math.PI / 2) + ((Math.PI * 2 * index) / count);
    const point = polarPoint(center, center, radius, angle);
    return `<line class="share-radar-axis" x1="${center}" y1="${center}" x2="${point.x.toFixed(2)}" y2="${point.y.toFixed(2)}"></line>`;
  }).join("");
  const labelNodes = labels.map((label, index) => {
    const angle = (-Math.PI / 2) + ((Math.PI * 2 * index) / count);
    const point = polarPoint(center, center, radius + 18, angle);
    return `<text class="share-radar-label" x="${point.x.toFixed(2)}" y="${point.y.toFixed(2)}" text-anchor="middle">${escapeHtml(truncateLabel(label, 11))}</text>`;
  }).join("");

  const polygons = datasets.map((dataset) => {
    const points = dataset.values.map((value, index) => {
      const angle = (-Math.PI / 2) + ((Math.PI * 2 * index) / count);
      const point = polarPoint(center, center, radius * value, angle);
      return `${point.x.toFixed(2)},${point.y.toFixed(2)}`;
    }).join(" ");
    const pointDots = dataset.values.map((value, index) => {
      const angle = (-Math.PI / 2) + ((Math.PI * 2 * index) / count);
      const point = polarPoint(center, center, radius * value, angle);
      return `<circle class="share-radar-point" cx="${point.x.toFixed(2)}" cy="${point.y.toFixed(2)}" r="3.4" style="fill:${dataset.color};"></circle>`;
    }).join("");
    return `
      <polygon class="share-radar-shape" points="${points}" style="fill:${hexToRgba(dataset.color, 0.2)};stroke:${dataset.color};"></polygon>
      ${pointDots}
    `;
  }).join("");

  return `
    <svg class="share-radar-svg" viewBox="0 0 360 360" preserveAspectRatio="xMidYMid meet">
      ${rings}
      ${axes}
      ${polygons}
      ${labelNodes}
    </svg>
  `;
}

function buildRadarPieMarkup(snapshot: ShareSnapshot, assets: BenchmarkShareAssets) {
  if (snapshot.radarImages?.donut) {
    return `<img class="share-radar-canvas-image" src="${escapeHtml(snapshot.radarImages.donut)}" alt="">`;
  }

  const rows = (snapshot.rows || []).slice(0, 14);
  const half = Math.floor(rows.length / 2);
  const swordsTotal = rows.slice(0, half).reduce((sum, row) => sum + getRowRatingValue(row), 0);
  const bombsTotal = rows.slice(half).reduce((sum, row) => sum + getRowRatingValue(row), 0);
  const total = Math.max(1, swordsTotal + bombsTotal);
  const swordsPercent = Math.round((swordsTotal / total) * 100);
  const bombsPercent = Math.round((bombsTotal / total) * 100);
  const center = 120;
  const radius = 76;
  const swordsEnd = (-Math.PI / 2) + ((Math.PI * 2 * swordsTotal) / total);

  const pieShapes = (swordsTotal + bombsTotal) > 0
    ? `
        <path d="${describePieSlice(center, center, radius, -Math.PI / 2, swordsEnd)}" fill="${RADAR_SWORDS_COLOR}"></path>
        <path d="${describePieSlice(center, center, radius, swordsEnd, (-Math.PI / 2) + (Math.PI * 2))}" fill="${RADAR_BOMBS_COLOR}"></path>
        <circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1.2"></circle>
      `
    : `<circle cx="${center}" cy="${center}" r="${radius}" fill="rgba(255,255,255,0.08)"></circle>`;

  return `
    <div class="share-pie-fallback">
      <svg class="share-pie-svg" viewBox="0 0 240 240" preserveAspectRatio="xMidYMid meet">
        ${pieShapes}
      </svg>
      <div class="share-pie-legend">
        <div class="share-pie-legend-row">
          <span class="share-pie-legend-icon"><img src="${assets.sword}" alt=""></span>
          <span>Swords</span>
          <span class="share-pie-legend-value" style="color:${RADAR_SWORDS_COLOR};">${swordsPercent}%</span>
        </div>
        <div class="share-pie-legend-row">
          <span class="share-pie-legend-icon"><img src="${assets.bomb}" alt=""></span>
          <span>Bombs</span>
          <span class="share-pie-legend-value" style="color:${RADAR_BOMBS_COLOR};">${bombsPercent}%</span>
        </div>
      </div>
    </div>
  `;
}

function buildRadarBarMarkup(snapshot: ShareSnapshot) {
  if (snapshot.radarImages?.bar) {
    return `<img class="share-radar-canvas-image" src="${escapeHtml(snapshot.radarImages.bar)}" alt="">`;
  }

  const items = (snapshot.radarCategories || []).slice(0, 7);
  const safeItems = items.length ? items : [{ label: "No Data", value: 0 }];
  const maxRaw = Math.max(1300, ...safeItems.map((item) => Number(item.value) || 0));
  const maxValue = Math.ceil(maxRaw / 100) * 100;

  const width = 400;
  const height = 260;
  const padding = { top: 20, right: 14, bottom: 42, left: 48 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const slotWidth = chartWidth / Math.max(1, safeItems.length);
  const barWidth = slotWidth * 0.4;

  const yTicks = new Array(6).fill(0).map((_, index) => {
    const value = Math.round((maxValue / 5) * index);
    const y = (height - padding.bottom) - ((value / maxValue) * chartHeight);
    return `
      <text class="share-bar-y-label" x="${padding.left - 8}" y="${y.toFixed(2)}">${value}</text>
      ${index > 0 && index < 5
        ? `<line class="share-bar-y-tick" x1="${padding.left}" y1="${y.toFixed(2)}" x2="${padding.left - 3}" y2="${y.toFixed(2)}"></line>`
        : ""}
    `;
  }).join("");

  const bars = safeItems.map((item, index) => {
    const value = Math.max(0, Number(item.value) || 0);
    const barHeight = (value / maxValue) * chartHeight;
    const x = padding.left + (index * slotWidth) + ((slotWidth - barWidth) / 2);
    const y = padding.top + (chartHeight - barHeight);
    const color = RADAR_BAR_COLORS_BY_LABEL[item.label || ""] || "rgba(255,255,255,0.2)";
    return `
      ${value > 0
        ? `<line class="share-bar-h-line" x1="${padding.left}" y1="${y.toFixed(2)}" x2="${(width - padding.right).toFixed(2)}" y2="${y.toFixed(2)}"></line>`
        : ""}
      <rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${barWidth.toFixed(2)}" height="${barHeight.toFixed(2)}" fill="${color}" stroke="rgba(255,255,255,0.4)" stroke-width="1"></rect>
      <text class="share-bar-x-label" x="${(x + (barWidth / 2)).toFixed(2)}" y="${(height - padding.bottom + 10).toFixed(2)}">${escapeHtml(truncateLabel(item.label || "", 11))}</text>
      ${value > 0
        ? `<text class="share-bar-value-label" x="${(x + (barWidth / 2)).toFixed(2)}" y="${(Math.max(y - 12, padding.top + 8)).toFixed(2)}">${Math.round(value)}</text>`
        : ""}
    `;
  }).join("");

  return `
    <svg class="share-bar-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">
      <line class="share-bar-axis" x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${height - padding.bottom}"></line>
      <line class="share-bar-axis" x1="${padding.left}" y1="${height - padding.bottom}" x2="${width - padding.right}" y2="${height - padding.bottom}"></line>
      ${yTicks}
      ${bars}
    </svg>
  `;
}

function buildRadarMarkup(snapshot: ShareSnapshot, assets: BenchmarkShareAssets) {
  const mode = snapshot.radarMode || "combined";
  const rows = (snapshot.rows || []).slice(0, 14);
  const splitIndex = Math.floor(rows.length / 2);
  const rowIndexByLabel = new Map<string, number>();
  rows.forEach((row, index) => {
    const label = (row.cave || "").trim().toLowerCase();
    if (label) rowIndexByLabel.set(label, index);
  });
  const resolveListColor = (label: string) => {
    if (mode === "swords") return RADAR_SWORDS_COLOR;
    if (mode === "bombs") return RADAR_BOMBS_COLOR;
    const index = rowIndexByLabel.get(String(label || "").trim().toLowerCase());
    if (typeof index !== "number") return "#ffffff";
    return index < splitIndex ? RADAR_SWORDS_COLOR : RADAR_BOMBS_COLOR;
  };

  return `
    <div class="radar-box">
      <div class="radar-header">
        <div>
          <div class="radar-title">Cave Graph</div>
        </div>
        <div class="radar-tabs">
          <button class="radar-tab${mode === "combined" ? " active" : ""}" type="button">Combined</button>
          <button class="radar-tab${mode === "swords" ? " active" : ""}" type="button">Swords</button>
          <button class="radar-tab${mode === "bombs" ? " active" : ""}" type="button">Bombs</button>
        </div>
        </div>
        <div class="radar-content">
          <div class="radar-canvas-wrap">
            <div class="radar-chart-grid">
              <div class="radar-chart-panel">
                ${buildRadarChartMarkup(snapshot)}
              </div>
              <div class="radar-donut-wrap">
                ${buildRadarPieMarkup(snapshot, assets)}
              </div>
              <div class="radar-bar-wrap">
                ${buildRadarBarMarkup(snapshot)}
              </div>
            </div>
          </div>
          <div class="radar-side">
            <div class="radar-stat">
              <div class="radar-stat-title">Strongest Caves</div>
              ${buildRadarStatList(snapshot.strongest || [], resolveListColor)}
            </div>
            <div class="radar-stat">
              <div class="radar-stat-title">Weakest Caves</div>
              ${buildRadarStatList(snapshot.weakest || [], resolveListColor)}
            </div>
          </div>
        </div>
    </div>
  `;
}

export function buildBenchmarkShareMarkup(
  snapshot: ShareSnapshot,
  assets: BenchmarkShareAssets,
  theme: ShareThemeColors
) {
  return `
    <div id="share-root">
      <div id="responsive-wrapper">
        <div id="benchmark-content">
          ${buildControls(snapshot)}
          ${buildTopBox(snapshot)}
          ${buildMiddleBox(snapshot, assets)}
          ${buildBenchmarkGrid(snapshot, assets, theme)}
          ${buildRadarMarkup(snapshot, assets)}
        </div>
      </div>
    </div>
  `;
}
