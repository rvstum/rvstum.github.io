export type ShareRow = {
  index?: number
  cave?: string
  score?: number
  rating?: string
  imageUrl?: string
  hasYoutube?: boolean
  thresholds?: string[]
  rankIndex?: number
  progressValue?: number
  fillColor?: string
  scoreTextColor?: string
  scoreBg?: string
  scoreAccent?: string
}

export type ShareTrophyItem = {
  imageUrl?: string
  label?: string
  count?: string
}

export type ShareSnapshot = {
  version?: number
  generatedAt?: number
  htmlMarkup?: string
  profile?: {
    name?: string
    guild?: string
    views?: string
    achievements?: string
    achievementsPercent?: string
    currentRank?: string
    progressLabel?: string
    flagUrl?: string
    profileImageUrl?: string
    noPicHasFlag?: boolean
    userMenuName?: string
    trophiesTitle?: string
    trophiesTotal?: string
    trophiesEmptyLabel?: string
    trophies?: ShareTrophyItem[]
  }
  config?: {
    platform?: string
    time?: string
    stat?: string
    mount?: string
    mountLabel?: string
    mountImageUrl?: string
  }
  theme?: {
    panelBg?: string
    panelBorder?: string
    accent?: string
    text?: string
    muted?: string
    appBg?: string
    configBoxBg?: string
    configBoxBorder?: string
    slantedBarBase?: string
    caveBoxBase?: string
    progressSpan?: string
    progressionWidth?: string
    progressionRight?: string
    ranksWrapperWidth?: string
    caveBoxWidth?: string
    caveBoxOffset?: string
  }
  ranks?: Array<{ name?: string; threshold?: string }>
  rows?: ShareRow[]
  strongest?: Array<{ label?: string; value?: string }>
  weakest?: Array<{ label?: string; value?: string }>
  radarMode?: string
  radarCategories?: Array<{ label?: string; value?: number }>
  radarImages?: {
    main?: string
    donut?: string
    bar?: string
  }
}

function decodeBase64Url(data: string) {
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = Buffer.from(padded, "base64").toString("utf8");
  return JSON.parse(binary);
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  return Number.isFinite(value) ? Number(value) : fallback;
}

function normalizeRank(value: unknown) {
  if (!value || typeof value !== "object") return { name: "", threshold: "" };
  const rank = value as { name?: unknown; threshold?: unknown };
  return {
    name: asString(rank.name),
    threshold: asString(rank.threshold)
  };
}

function normalizeStatItem(value: unknown) {
  if (!value || typeof value !== "object") return { label: "", value: "" };
  const item = value as { label?: unknown; value?: unknown };
  return {
    label: asString(item.label),
    value: asString(item.value)
  };
}

function normalizeCategory(value: unknown) {
  if (!value || typeof value !== "object") return { label: "", value: 0 };
  const item = value as { label?: unknown; value?: unknown };
  return {
    label: asString(item.label),
    value: asNumber(item.value, 0)
  };
}

function sanitizeImageDataUrl(value: unknown, maxChars = 1_200_000) {
  const normalized = asString(value);
  if (!normalized.startsWith("data:image/")) return "";
  if (!/;base64,/i.test(normalized)) return "";
  if (normalized.length > maxChars) return "";
  return normalized;
}

function normalizeRadarImages(value: unknown) {
  if (!value || typeof value !== "object") {
    return { main: "", donut: "", bar: "" };
  }

  const images = value as { main?: unknown; donut?: unknown; bar?: unknown };
  return {
    main: sanitizeImageDataUrl(images.main),
    donut: sanitizeImageDataUrl(images.donut),
    bar: sanitizeImageDataUrl(images.bar)
  };
}

function normalizeTrophyItem(value: unknown): ShareTrophyItem {
  if (!value || typeof value !== "object") return { imageUrl: "", label: "", count: "" }
  const item = value as ShareTrophyItem
  return {
    imageUrl: asString(item.imageUrl),
    label: asString(item.label),
    count: asString(item.count)
  }
}

function normalizeRow(value: unknown, index: number): ShareRow {
  if (!value || typeof value !== "object") {
    return {
      index,
      cave: `Cave ${index + 1}`,
      score: 0,
      rating: "",
      imageUrl: "",
      hasYoutube: false,
      thresholds: [],
      rankIndex: 0,
      progressValue: 0,
      fillColor: "",
      scoreTextColor: "",
      scoreBg: "",
      scoreAccent: ""
    };
  }

  const row = value as ShareRow;
  return {
    index: asNumber(row.index, index),
    cave: asString(row.cave, `Cave ${index + 1}`),
    score: asNumber(row.score, 0),
    rating: asString(row.rating),
    imageUrl: asString(row.imageUrl),
    hasYoutube: !!row.hasYoutube,
    thresholds: Array.isArray(row.thresholds)
      ? row.thresholds.slice(0, 13).map((threshold) => asString(threshold)).filter(Boolean)
      : [],
    rankIndex: asNumber(row.rankIndex, 0),
    progressValue: asNumber(row.progressValue, 0),
    fillColor: asString(row.fillColor),
    scoreTextColor: asString(row.scoreTextColor),
    scoreBg: asString(row.scoreBg),
    scoreAccent: asString(row.scoreAccent)
  };
}

export function normalizeShareSnapshot(value: unknown): ShareSnapshot {
  const parsed = (value && typeof value === "object") ? value as ShareSnapshot : {};
  return {
    version: asNumber(parsed?.version, 1),
    generatedAt: asNumber(parsed?.generatedAt, Date.now()),
    htmlMarkup: asString(parsed?.htmlMarkup),
    profile: {
      name: asString(parsed?.profile?.name, "Player"),
      guild: asString(parsed?.profile?.guild),
      views: asString(parsed?.profile?.views),
      achievements: asString(parsed?.profile?.achievements),
      achievementsPercent: asString(parsed?.profile?.achievementsPercent),
      currentRank: asString(parsed?.profile?.currentRank, "Unranked"),
      progressLabel: asString(parsed?.profile?.progressLabel),
      flagUrl: asString(parsed?.profile?.flagUrl),
      profileImageUrl: asString(parsed?.profile?.profileImageUrl),
      noPicHasFlag: !!parsed?.profile?.noPicHasFlag,
      userMenuName: asString(parsed?.profile?.userMenuName, "Player"),
      trophiesTitle: asString(parsed?.profile?.trophiesTitle),
      trophiesTotal: asString(parsed?.profile?.trophiesTotal),
      trophiesEmptyLabel: asString(parsed?.profile?.trophiesEmptyLabel, "+ Add Seasonal Placements"),
      trophies: Array.isArray(parsed?.profile?.trophies)
        ? parsed.profile.trophies.slice(0, 4).map((item) => normalizeTrophyItem(item))
        : []
    },
    config: {
      platform: asString(parsed?.config?.platform, "Mobile"),
      time: asString(parsed?.config?.time, "5 Min"),
      stat: asString(parsed?.config?.stat, "Baddy Kills"),
      mount: asString(parsed?.config?.mount, "mountspeed1"),
      mountLabel: asString(parsed?.config?.mountLabel),
      mountImageUrl: asString(parsed?.config?.mountImageUrl)
    },
    theme: {
      panelBg: asString(parsed?.theme?.panelBg, "#180800"),
      panelBorder: asString(parsed?.theme?.panelBorder, "rgba(255,255,255,0.14)"),
      accent: asString(parsed?.theme?.accent, "#f5c645"),
      text: asString(parsed?.theme?.text, "#f6eee7"),
      muted: asString(parsed?.theme?.muted, "#c9b2a0"),
      appBg: asString(parsed?.theme?.appBg, "#050505"),
      configBoxBg: asString(parsed?.theme?.configBoxBg, "rgba(255,255,255,0.03)"),
      configBoxBorder: asString(parsed?.theme?.configBoxBorder, "rgba(255,255,255,0.05)"),
      slantedBarBase: asString(parsed?.theme?.slantedBarBase, "rgba(0,0,0,0.55)"),
      caveBoxBase: asString(parsed?.theme?.caveBoxBase, "rgba(255,255,255,0.02)"),
      progressSpan: asString(parsed?.theme?.progressSpan, "1014px"),
      progressionWidth: asString(parsed?.theme?.progressionWidth, "1014px"),
      progressionRight: asString(parsed?.theme?.progressionRight, "70px"),
      ranksWrapperWidth: asString(parsed?.theme?.ranksWrapperWidth, "540px"),
      caveBoxWidth: asString(parsed?.theme?.caveBoxWidth, "300px"),
      caveBoxOffset: asString(parsed?.theme?.caveBoxOffset, "124px")
    },
    ranks: Array.isArray(parsed?.ranks)
      ? parsed.ranks.slice(0, 13).map((rank) => normalizeRank(rank))
      : [],
    rows: Array.isArray(parsed?.rows)
      ? parsed.rows.slice(0, 24).map((row, index) => normalizeRow(row, index))
      : [],
    strongest: Array.isArray(parsed?.strongest)
      ? parsed.strongest.slice(0, 4).map((item) => normalizeStatItem(item))
      : [],
    weakest: Array.isArray(parsed?.weakest)
      ? parsed.weakest.slice(0, 4).map((item) => normalizeStatItem(item))
      : [],
    radarMode: asString(parsed?.radarMode, "combined"),
    radarCategories: Array.isArray(parsed?.radarCategories)
      ? parsed.radarCategories.slice(0, 12).map((item) => normalizeCategory(item))
      : [],
    radarImages: normalizeRadarImages(parsed?.radarImages)
  };
}

export function decodeShareSnapshot(rawData: unknown): ShareSnapshot {
  if (typeof rawData !== "string" || !rawData.trim()) {
    return normalizeShareSnapshot({});
  }

  try {
    return normalizeShareSnapshot(decodeBase64Url(rawData.trim()) as ShareSnapshot);
  } catch {
    return normalizeShareSnapshot({});
  }
}
