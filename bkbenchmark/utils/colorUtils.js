export function clampByte(value) {
    return Math.max(0, Math.min(255, Math.round(value)));
}

export function hexToRgba(hex, alpha) {
    let r = 0;
    let g = 0;
    let b = 0;
    if (hex.startsWith('#')) {
        hex = hex.slice(1);
        if (hex.length === 3) {
            r = parseInt(hex[0] + hex[0], 16);
            g = parseInt(hex[1] + hex[1], 16);
            b = parseInt(hex[2] + hex[2], 16);
        } else if (hex.length === 6) {
            r = parseInt(hex.substring(0, 2), 16);
            g = parseInt(hex.substring(2, 4), 16);
            b = parseInt(hex.substring(4, 6), 16);
        }
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function hexToRgb(hex) {
    if (!hex) return null;
    let clean = hex.trim();
    if (clean.startsWith('#')) clean = clean.slice(1);
    if (clean.length === 3) {
        clean = `${clean[0]}${clean[0]}${clean[1]}${clean[1]}${clean[2]}${clean[2]}`;
    }
    if (clean.length !== 6) return null;
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
    return { r, g, b };
}

export function rgbToHex(r, g, b) {
    const toHex = (val) => clampByte(val).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

export function blendHex(baseHex, overlayHex, strength) {
    const base = hexToRgb(baseHex);
    const overlay = hexToRgb(overlayHex);
    if (!base || !overlay) return overlayHex;
    const clamped = Math.max(0, Math.min(1, strength));
    const mix = (a, b) => Math.round(a + (b - a) * clamped);
    return rgbToHex(
        mix(base.r, overlay.r),
        mix(base.g, overlay.g),
        mix(base.b, overlay.b)
    );
}

export function parseColorToRgba(color) {
    if (!color) return null;
    const trimmed = color.trim();
    if (trimmed.startsWith('#')) {
        const rgb = hexToRgb(trimmed);
        if (!rgb) return null;
        return { ...rgb, a: 1 };
    }
    if (trimmed.startsWith('rgba')) {
        const parts = trimmed.match(/[\d.]+/g);
        if (!parts || parts.length < 4) return null;
        return {
            r: parseFloat(parts[0]),
            g: parseFloat(parts[1]),
            b: parseFloat(parts[2]),
            a: parseFloat(parts[3])
        };
    }
    if (trimmed.startsWith('rgb')) {
        const parts = trimmed.match(/[\d.]+/g);
        if (!parts || parts.length < 3) return null;
        return {
            r: parseFloat(parts[0]),
            g: parseFloat(parts[1]),
            b: parseFloat(parts[2]),
            a: 1
        };
    }
    return null;
}

export function parseColorToRgb(color, options = {}) {
    const { fallback = '#d4a017', parserCtx = null } = options;
    const parsedRgba = parseColorToRgba(color || '');
    if (parsedRgba) {
        return {
            r: clampByte(parsedRgba.r),
            g: clampByte(parsedRgba.g),
            b: clampByte(parsedRgba.b)
        };
    }

    const ctx = parserCtx || createColorParserContext();
    if (!ctx) {
        return hexToRgb(fallback) || { r: 212, g: 160, b: 23 };
    }

    ctx.fillStyle = '#000000';
    try {
        ctx.fillStyle = color || fallback;
    } catch (e) {
        ctx.fillStyle = fallback;
    }

    const normalized = ctx.fillStyle || fallback;
    const normalizedRgba = parseColorToRgba(normalized);
    if (normalizedRgba) {
        return {
            r: clampByte(normalizedRgba.r),
            g: clampByte(normalizedRgba.g),
            b: clampByte(normalizedRgba.b)
        };
    }

    return hexToRgb(fallback) || { r: 212, g: 160, b: 23 };
}

export function createColorParserContext() {
    if (typeof document === 'undefined') return null;
    const parserCanvas = document.createElement('canvas');
    parserCanvas.width = 1;
    parserCanvas.height = 1;
    return parserCanvas.getContext('2d');
}

export function darkenColor(color, amount) {
    const parsed = parseColorToRgba(color);
    if (!parsed) return color;
    const clampedAmount = Math.max(0, Math.min(1, Number(amount) || 0));
    const factor = 1 - clampedAmount;
    const r = Math.max(0, Math.floor(parsed.r * factor));
    const g = Math.max(0, Math.floor(parsed.g * factor));
    const b = Math.max(0, Math.floor(parsed.b * factor));
    const a = Number.isFinite(parsed.a) ? parsed.a : 1;
    return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export function colorWithAlpha(color, alpha) {
    const parsed = parseColorToRgba(color);
    if (!parsed) return color;
    const clamped = Math.max(0, Math.min(1, alpha));
    return `rgba(${Math.round(parsed.r)}, ${Math.round(parsed.g)}, ${Math.round(parsed.b)}, ${clamped})`;
}

export function lightenColor(color, amount) {
    const parsed = parseColorToRgba(color);
    if (!parsed) return color;
    const clamped = Math.max(0, Math.min(1, amount));
    const mix = (channel) => Math.round(channel + ((255 - channel) * clamped));
    return `rgba(${mix(parsed.r)}, ${mix(parsed.g)}, ${mix(parsed.b)}, 1)`;
}

export function rgbToHsv(r, g, b) {
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const delta = max - min;
    let h = 0;
    if (delta !== 0) {
        if (max === rn) h = ((gn - bn) / delta) % 6;
        else if (max === gn) h = (bn - rn) / delta + 2;
        else h = (rn - gn) / delta + 4;
        h = Math.round(h * 60);
        if (h < 0) h += 360;
    }
    const s = max === 0 ? 0 : delta / max;
    const v = max;
    return { h, s, v };
}

export function hsvToRgb(h, s, v) {
    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;
    let r1 = 0;
    let g1 = 0;
    let b1 = 0;
    if (h >= 0 && h < 60) {
        r1 = c;
        g1 = x;
    } else if (h < 120) {
        r1 = x;
        g1 = c;
    } else if (h < 180) {
        g1 = c;
        b1 = x;
    } else if (h < 240) {
        g1 = x;
        b1 = c;
    } else if (h < 300) {
        r1 = x;
        b1 = c;
    } else {
        r1 = c;
        b1 = x;
    }
    return {
        r: Math.round((r1 + m) * 255),
        g: Math.round((g1 + m) * 255),
        b: Math.round((b1 + m) * 255)
    };
}

export function getContrastColor(color) {
    const parsed = parseColorToRgba(color);
    if (!parsed) return 'rgba(255, 255, 255, 0.8)';
    const r = clampByte(parsed.r);
    const g = clampByte(parsed.g);
    const b = clampByte(parsed.b);

    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    if (yiq >= 128) {
        const factor = 0.3;
        return `rgba(${Math.round(r * factor)}, ${Math.round(g * factor)}, ${Math.round(b * factor)}, 1)`;
    }
    const factor = 3.0;
    const nr = Math.min(255, Math.round(r * factor));
    const ng = Math.min(255, Math.round(g * factor));
    const nb = Math.min(255, Math.round(b * factor));
    return `rgba(${nr}, ${ng}, ${nb}, 1)`;
}

export function multiplyRgb(color, factor) {
    return {
        r: clampByte(color.r * factor),
        g: clampByte(color.g * factor),
        b: clampByte(color.b * factor)
    };
}

export function blendRgb(a, b, t) {
    const f = Math.max(0, Math.min(1, t));
    return {
        r: clampByte(a.r + ((b.r - a.r) * f)),
        g: clampByte(a.g + ((b.g - a.g) * f)),
        b: clampByte(a.b + ((b.b - a.b) * f))
    };
}

export function buildShadeSet(base) {
    const dark = multiplyRgb(base, 0.5);
    const mid = multiplyRgb(base, 0.82);
    const light = blendRgb(multiplyRgb(base, 1.08), { r: 255, g: 242, b: 186 }, 0.34);
    return { dark, mid, light };
}

export function isTargetGreen(r, g, b, a) {
    if (a < 8) return false;
    return g >= 45 && g > r + 12 && g > b + 8;
}

export function recolorPixels(sourcePixels, shades) {
    const out = new Uint8ClampedArray(sourcePixels);
    for (let i = 0; i < out.length; i += 4) {
        const r = out[i];
        const g = out[i + 1];
        const b = out[i + 2];
        const a = out[i + 3];
        if (!isTargetGreen(r, g, b, a)) continue;

        const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        const mapped = luminance < 0.5
            ? blendRgb(shades.dark, shades.mid, luminance / 0.5)
            : blendRgb(shades.mid, shades.light, (luminance - 0.5) / 0.5);

        out[i] = mapped.r;
        out[i + 1] = mapped.g;
        out[i + 2] = mapped.b;
    }
    return out;
}
