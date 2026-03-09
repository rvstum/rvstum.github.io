import type { ShareSnapshot } from "./shareSnapshot";

export const DESKTOP_PROGRESSION_WIDTH = "1014px";
export const DESKTOP_PROGRESSION_RIGHT = "70px";
export const DESKTOP_RANKS_WRAPPER_WIDTH = "540px";
export const DESKTOP_CAVE_BOX_WIDTH = "300px";
export const DESKTOP_CAVE_BOX_OFFSET = "124px";
const DEFAULT_PROGRESS_EXTEND = "474px";

type ParsedColor = {
  r: number;
  g: number;
  b: number;
  a: number;
};

export type ShareThemeColors = {
  appBg: string;
  panelBg: string;
  panelBorder: string;
  accent: string;
  textPrimary: string;
  textSecondary: string;
  configBoxBg: string;
  configBoxBorder: string;
  slantedBarBase: string;
  caveBoxBase: string;
  progressSpan: string;
  progressionWidth: string;
  progressionRight: string;
  ranksWrapperWidth: string;
  caveBoxWidth: string;
  caveBoxOffset: string;
  progressExtend: string;
};

export function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function clampChannel(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function clampAlpha(value: number) {
  return Math.max(0, Math.min(1, value));
}

function parseHexColor(value: string) {
  const hex = value.replace("#", "").trim();
  if (hex.length === 3) {
    return {
      r: parseInt(hex[0] + hex[0], 16),
      g: parseInt(hex[1] + hex[1], 16),
      b: parseInt(hex[2] + hex[2], 16),
      a: 1
    };
  }

  if (hex.length === 4) {
    return {
      r: parseInt(hex[0] + hex[0], 16),
      g: parseInt(hex[1] + hex[1], 16),
      b: parseInt(hex[2] + hex[2], 16),
      a: parseInt(hex[3] + hex[3], 16) / 255
    };
  }

  if (hex.length === 6) {
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      a: 1
    };
  }

  if (hex.length === 8) {
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      a: parseInt(hex.slice(6, 8), 16) / 255
    };
  }

  return null;
}

function parseRgbColor(value: string) {
  const match = value.match(/rgba?\(([^)]+)\)/i);
  if (!match) return null;

  const parts = match[1]
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 3) return null;

  const r = Number(parts[0]);
  const g = Number(parts[1]);
  const b = Number(parts[2]);
  const a = parts.length > 3 ? Number(parts[3]) : 1;

  if (![r, g, b, a].every((item) => Number.isFinite(item))) return null;

  return { r, g, b, a: clampAlpha(a) };
}

function parseCssColor(value: string, fallback: ParsedColor) {
  const normalized = String(value || "").trim();
  if (!normalized) return fallback;

  if (normalized.startsWith("#")) {
    return parseHexColor(normalized) || fallback;
  }

  if (/^rgba?\(/i.test(normalized)) {
    return parseRgbColor(normalized) || fallback;
  }

  return fallback;
}

function compositeColors(foreground: ParsedColor, background: ParsedColor): ParsedColor {
  const alpha = clampAlpha(foreground.a);
  const inverse = 1 - alpha;
  return {
    r: clampChannel((foreground.r * alpha) + (background.r * inverse)),
    g: clampChannel((foreground.g * alpha) + (background.g * inverse)),
    b: clampChannel((foreground.b * alpha) + (background.b * inverse)),
    a: 1
  };
}

function toCssColor(color: ParsedColor) {
  return `rgb(${clampChannel(color.r)}, ${clampChannel(color.g)}, ${clampChannel(color.b)})`;
}

function numericPx(value: string, fallback: number) {
  const match = String(value || "").match(/-?\d+(\.\d+)?/);
  const numeric = match ? Number(match[0]) : NaN;
  return Number.isFinite(numeric) ? numeric : fallback;
}

function buildProgressExtend(progressionWidth: string, ranksWrapperWidth: string) {
  const progression = numericPx(progressionWidth, 1014);
  const wrapper = numericPx(ranksWrapperWidth, 540);
  const progressionRight = numericPx(DESKTOP_PROGRESSION_RIGHT, 70);
  const extend = progression - wrapper + progressionRight;
  if (!(extend > 0)) return DEFAULT_PROGRESS_EXTEND;
  return `${Math.round(extend)}px`;
}

export function resolveShareThemeColors(snapshot: ShareSnapshot): ShareThemeColors {
  const baseAppBg = parseCssColor(snapshot.theme?.appBg || "#050505", {
    r: 5,
    g: 5,
    b: 5,
    a: 1
  });

  const panelBg = compositeColors(
    parseCssColor(snapshot.theme?.panelBg || "#180800", {
      r: 24,
      g: 8,
      b: 0,
      a: 1
    }),
    baseAppBg
  );
  const configBoxBg = compositeColors(
    parseCssColor(snapshot.theme?.configBoxBg || "rgba(255,255,255,0.03)", {
      r: 255,
      g: 255,
      b: 255,
      a: 0.03
    }),
    panelBg
  );

  return {
    appBg: toCssColor(baseAppBg),
    panelBg: toCssColor(panelBg),
    panelBorder: snapshot.theme?.panelBorder || "rgba(255,255,255,0.14)",
    accent: snapshot.theme?.accent || "#f5c645",
    textPrimary: snapshot.theme?.text || "#f6eee7",
    textSecondary: snapshot.theme?.muted || "#c9b2a0",
    configBoxBg: toCssColor(configBoxBg),
    configBoxBorder: snapshot.theme?.configBoxBorder || "rgba(255,255,255,0.05)",
    slantedBarBase: toCssColor(
      compositeColors(
        parseCssColor(snapshot.theme?.slantedBarBase || "rgba(0,0,0,0.55)", {
          r: 0,
          g: 0,
          b: 0,
          a: 0.55
        }),
        panelBg
      )
    ),
    caveBoxBase: toCssColor(
      compositeColors(
        parseCssColor(snapshot.theme?.caveBoxBase || "rgba(255,255,255,0.02)", {
          r: 255,
          g: 255,
          b: 255,
          a: 0.02
        }),
        panelBg
      )
    ),
    progressSpan: snapshot.theme?.progressSpan || DESKTOP_PROGRESSION_WIDTH,
    progressionWidth: snapshot.theme?.progressionWidth || DESKTOP_PROGRESSION_WIDTH,
    progressionRight: snapshot.theme?.progressionRight || DESKTOP_PROGRESSION_RIGHT,
    ranksWrapperWidth: snapshot.theme?.ranksWrapperWidth || DESKTOP_RANKS_WRAPPER_WIDTH,
    caveBoxWidth: snapshot.theme?.caveBoxWidth || DESKTOP_CAVE_BOX_WIDTH,
    caveBoxOffset: snapshot.theme?.caveBoxOffset || DESKTOP_CAVE_BOX_OFFSET,
    progressExtend: buildProgressExtend(
      snapshot.theme?.progressionWidth || DESKTOP_PROGRESSION_WIDTH,
      snapshot.theme?.ranksWrapperWidth || DESKTOP_RANKS_WRAPPER_WIDTH
    )
  };
}

export function buildShareThemeCss(theme: ShareThemeColors) {
  return `
    :root {
      --app-bg: ${theme.appBg};
      --panel-bg: ${theme.panelBg};
      --panel-border: ${theme.panelBorder};
      --accent-color: ${theme.accent};
      --text-primary: ${theme.textPrimary};
      --text-secondary: ${theme.textSecondary};
      --config-box-bg: ${theme.configBoxBg};
      --config-box-border: ${theme.configBoxBorder};
      --slanted-bar-base: ${theme.slantedBarBase};
      --cave-box-base: ${theme.caveBoxBase};
      --progress-span: ${theme.progressSpan};
      --progression-width: ${theme.progressionWidth};
      --progression-right: ${theme.progressionRight};
      --ranks-wrapper-width: ${theme.ranksWrapperWidth};
      --cave-box-width: ${theme.caveBoxWidth};
      --cave-box-offset: ${theme.caveBoxOffset};
      --progress-extend: ${theme.progressExtend};
    }

    body.share-render-static {
      background: ${theme.appBg};
      color: ${theme.textPrimary};
    }
  `;
}
