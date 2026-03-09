import {
    createColorParserContext,
    parseColorToRgb,
    buildShadeSet,
    recolorPixels
} from "./utils/colorUtils.js";

const DEFAULT_FALLBACK = '#d4a017';
const AUTH_FIXED_COLOR = '#d4a017';
const sourcePixelsCache = new Map();
const recoloredSrcCache = new Map();
const parserCtx = createColorParserContext();

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
        const target = parseColorToRgb(baseColor, { fallback: DEFAULT_FALLBACK, parserCtx });
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

window.updateLegalBaddyIcons = function updateLegalBaddyIconsPublic(colorOverride) {
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
