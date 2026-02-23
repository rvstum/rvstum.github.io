(function () {
    const DEFAULT_FALLBACK = '#d4a017';
    const AUTH_FIXED_COLOR = '#d4a017';
    const sourcePixelsCache = new Map();
    const recoloredSrcCache = new Map();

    const parserCanvas = document.createElement('canvas');
    parserCanvas.width = 1;
    parserCanvas.height = 1;
    const parserCtx = parserCanvas.getContext('2d');

    function clampByte(value) {
        return Math.max(0, Math.min(255, Math.round(value)));
    }

    function parseColorToRgb(color) {
        if (!parserCtx) return { r: 212, g: 160, b: 23 };
        parserCtx.fillStyle = '#000000';
        try {
            parserCtx.fillStyle = color || DEFAULT_FALLBACK;
        } catch (e) {
            parserCtx.fillStyle = DEFAULT_FALLBACK;
        }
        const normalized = parserCtx.fillStyle || DEFAULT_FALLBACK;
        if (normalized.startsWith('#')) {
            const hex = normalized.slice(1);
            if (hex.length === 3) {
                return {
                    r: parseInt(hex[0] + hex[0], 16),
                    g: parseInt(hex[1] + hex[1], 16),
                    b: parseInt(hex[2] + hex[2], 16)
                };
            }
            if (hex.length >= 6) {
                return {
                    r: parseInt(hex.slice(0, 2), 16),
                    g: parseInt(hex.slice(2, 4), 16),
                    b: parseInt(hex.slice(4, 6), 16)
                };
            }
        }
        const rgbMatch = normalized.match(/rgba?\(([^)]+)\)/);
        if (rgbMatch) {
            const parts = rgbMatch[1].split(',').map(part => parseFloat(part.trim()));
            if (parts.length >= 3) {
                return {
                    r: clampByte(parts[0]),
                    g: clampByte(parts[1]),
                    b: clampByte(parts[2])
                };
            }
        }
        return { r: 212, g: 160, b: 23 };
    }

    function multiplyRgb(color, factor) {
        return {
            r: clampByte(color.r * factor),
            g: clampByte(color.g * factor),
            b: clampByte(color.b * factor)
        };
    }

    function blendRgb(a, b, t) {
        const f = Math.max(0, Math.min(1, t));
        return {
            r: clampByte(a.r + ((b.r - a.r) * f)),
            g: clampByte(a.g + ((b.g - a.g) * f)),
            b: clampByte(a.b + ((b.b - a.b) * f))
        };
    }

    function isTargetGreen(r, g, b, a) {
        if (a < 8) return false;
        return g >= 45 && g > r + 12 && g > b + 8;
    }

    function buildShadeSet(base) {
        const dark = multiplyRgb(base, 0.5);
        const mid = multiplyRgb(base, 0.82);
        const light = blendRgb(multiplyRgb(base, 1.08), { r: 255, g: 242, b: 186 }, 0.34);
        return { dark, mid, light };
    }

    function recolorPixels(sourcePixels, shades) {
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

    function loadSourcePixels(src) {
        if (sourcePixelsCache.has(src)) return sourcePixelsCache.get(src);
        const promise = new Promise((resolve, reject) => {
            const img = new Image();
            img.decoding = 'async';
            img.onload = () => {
                const width = img.naturalWidth || img.width;
                const height = img.naturalHeight || img.height;
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Canvas not supported'));
                    return;
                }
                ctx.drawImage(img, 0, 0, width, height);
                const imageData = ctx.getImageData(0, 0, width, height);
                resolve({ width, height, pixels: imageData.data });
            };
            img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
            img.src = src;
        });
        sourcePixelsCache.set(src, promise);
        return promise;
    }

    function createRecoloredSrc(src, baseColor) {
        const key = `${src}|${baseColor}`;
        if (recoloredSrcCache.has(key)) {
            return Promise.resolve(recoloredSrcCache.get(key));
        }
        return loadSourcePixels(src).then((source) => {
            const target = parseColorToRgb(baseColor);
            const shades = buildShadeSet(target);
            const recolored = recolorPixels(source.pixels, shades);
            const canvas = document.createElement('canvas');
            canvas.width = source.width;
            canvas.height = source.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Canvas not supported');
            const imageData = ctx.createImageData(source.width, source.height);
            imageData.data.set(recolored);
            ctx.putImageData(imageData, 0, 0);
            const dataUrl = canvas.toDataURL('image/png');
            recoloredSrcCache.set(key, dataUrl);
            return dataUrl;
        });
    }

    function updateLegalBaddyIcons(colorOverride) {
        const icons = Array.from(document.querySelectorAll('.legal-baddy-icon'));
        if (!icons.length) return Promise.resolve();

        icons.forEach((icon) => {
            if (!icon.dataset.originalSrc) {
                icon.dataset.originalSrc = icon.getAttribute('src') || '../icons/baddy.png';
            }
        });
        const source = icons[0].dataset.originalSrc || '../icons/baddy.png';
        const isAuthPage = !!document.querySelector('.auth-footer');
        const cssColor = getComputedStyle(document.documentElement)
            .getPropertyValue('--legal-baddy-base-color')
            .trim();
        const targetColor = (
            colorOverride
            || (isAuthPage ? AUTH_FIXED_COLOR : cssColor)
            || DEFAULT_FALLBACK
        ).trim();

        return createRecoloredSrc(source, targetColor)
            .then((dataUrl) => {
                icons.forEach((icon) => {
                    icon.src = dataUrl;
                });
            });
    }

    window.updateLegalBaddyIcons = function (colorOverride) {
        return updateLegalBaddyIcons(colorOverride).catch(() => {});
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.updateLegalBaddyIcons();
        });
    } else {
        window.updateLegalBaddyIcons();
    }

    window.addEventListener('pageshow', () => {
        window.updateLegalBaddyIcons();
    });
})();
