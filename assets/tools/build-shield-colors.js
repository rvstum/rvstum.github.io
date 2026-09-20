// Keeps the file lists in assets/Shields, Hats, Accessories and Mounts (shields.json, hats.json, ...)
// in sync with what is actually in those folders, and builds assets/Shields/colors.json (the majority
// color of each shield, counted across ALL frames of animated GIFs).
//
// Usage (needs `sharp` installed):
//   node assets/tools/build-shield-colors.js           update once
//   node assets/tools/build-shield-colors.js --watch   keep running and update on every add/delete
// Keep the classifier in sync with assets/index.html.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const DIR = path.join(__dirname, '..', 'Shields');
const SIZE = 48;
const NEUTRAL = ['black', 'white', 'gray'];

// Colored pixels decide the shield. Black/white/gray (outlines, shading) only decide it when the
// shield has almost no color. "Mixed" is only for shields whose colors are genuinely split.
const CHROMA_MIN = 0.12;   // share of pixels that must be colored for hues to decide
const HUE_MAJORITY = 0.45; // top hue's share of the colored pixels
const NEUTRAL_MAJORITY = 0.4;
function pickColor(votes) {
    const keys = Object.keys(votes);
    if (!keys.length) return null;
    let total = 0, chroma = 0;
    keys.forEach((k) => { total += votes[k]; if (!NEUTRAL.includes(k)) chroma += votes[k]; });
    const top = (list) => list.reduce((a, k) => (votes[k] > votes[a] ? k : a));
    const hues = keys.filter((k) => !NEUTRAL.includes(k));
    if (hues.length && chroma / total >= CHROMA_MIN) {
        const best = top(hues);
        return votes[best] / chroma >= HUE_MAJORITY ? best : 'mixed';
    }
    const best = top(keys);
    return votes[best] / total >= NEUTRAL_MAJORITY ? best : 'mixed';
}

function classifyPixel(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    const d = max - min;
    const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
    if (l < 0.18) return 'black';
    if (l > 0.85) return 'white';
    if (s < 0.2) return 'gray';
    let h;
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
    if (h < 15 || h >= 345) return l < 0.3 ? 'brown' : 'red';
    if (h < 45) return l < 0.4 ? 'brown' : 'orange';
    if (h < 70) return 'yellow';
    if (h < 165) return 'green';
    if (h < 200) return 'cyan';
    if (h < 260) return 'blue';
    if (h < 300) return 'purple';
    return 'pink';
}

// A shield with no visible pixel in ANY frame (every frame of a GIF is checked) is deleted by update().
const KEEP_EVEN_IF_BLANK = ['no-shield.png'];
async function isInvisible(file) {
    const meta = await sharp(file, { pages: -1 }).metadata();
    const frames = meta.pages || 1;
    for (let f = 0; f < frames; f++) {
        const { data } = await sharp(file, { page: f }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        for (let i = 3; i < data.length; i += 4) if (data[i] > 0) return false;
    }
    return true;
}

async function colorOf(file) {
    const meta = await sharp(file, { pages: -1 }).metadata();
    const frames = meta.pages || 1;
    const votes = {};
    for (let f = 0; f < frames; f++) {
        const { data } = await sharp(file, { page: f })
            .resize(SIZE, SIZE, { fit: 'fill' })
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });
        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] < 128) continue;
            const key = classifyPixel(data[i], data[i + 1], data[i + 2]);
            votes[key] = (votes[key] || 0) + 1;
        }
    }
    return pickColor(votes);
}

const IMAGE_RE = /\.(png|gif|jpe?g|webp)$/i;
const LIST_FILE = path.join(DIR, 'shields.json');
const COLORS_FILE = path.join(DIR, 'colors.json');

// Other categories only need a file list (no colors). Each folder is listed in <folder>.json.
const OTHER_CATEGORIES = [
    { dir: 'Hats', list: 'hats.json', colors: true },
    { dir: 'Accessories', list: 'accessories.json', colors: true },
    { dir: 'Mounts', list: 'mounts.json' }
];
const ASSETS = path.join(__dirname, '..');

function updateLists() {
    for (const cat of OTHER_CATEGORIES) {
        const dir = path.join(ASSETS, cat.dir);
        if (!fs.existsSync(dir)) continue;
        const names = fs.readdirSync(dir)
            .filter((n) => IMAGE_RE.test(n))
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
        fs.writeFileSync(path.join(dir, cat.list), JSON.stringify(names));
        console.log('  ' + cat.dir + ': ' + names.length + ' files');
    }
}

// Writes <dir>/colors.json for the given files. Only new or modified images are re-read; removed ones drop out.
async function buildColors(dir, names, label) {
    const colorsFile = path.join(dir, 'colors.json');
    let old = {};
    let lastBuild = 0;
    try {
        old = JSON.parse(fs.readFileSync(colorsFile, 'utf8'));
        lastBuild = fs.statSync(colorsFile).mtimeMs;
    } catch (e) { /* first run */ }

    const out = {};
    let added = 0;
    for (const name of names) {
        const f = path.join(dir, name);
        if (old[name] && fs.statSync(f).mtimeMs <= lastBuild) {
            out[name] = old[name];
            continue;
        }
        try {
            const c = await colorOf(f);
            if (c) out[name] = c;
            added++;
        } catch (e) {
            console.warn('skipped', name, e.message);
        }
    }
    const removed = Object.keys(old).filter((n) => !names.includes(n)).length;
    fs.writeFileSync(colorsFile, JSON.stringify(out));
    console.log(new Date().toLocaleTimeString() + ' - ' + label + ' colors: ' + names.length + ' (' + added + ' read, ' + removed + ' removed)');
}

async function update() {
    let names = fs.readdirSync(DIR).filter((n) => IMAGE_RE.test(n)).sort();
    for (const name of names.slice()) {
        if (KEEP_EVEN_IF_BLANK.includes(name)) continue;
        const f = path.join(DIR, name);
        try {
            if (await isInvisible(f)) {
                // --no-delete (used by the automatic GitHub run) only hides it from the list.
                if (!process.argv.includes('--no-delete')) {
                    fs.unlinkSync(f);
                    console.log('  removed invisible shield: ' + name);
                } else {
                    console.log('  hidden invisible shield (file kept): ' + name);
                }
                names = names.filter((n) => n !== name);
            }
        } catch (e) { /* unreadable image: leave it alone */ }
    }
    fs.writeFileSync(LIST_FILE, JSON.stringify(names));
    await buildColors(DIR, names, 'Shields');
    updateLists();
    for (const cat of OTHER_CATEGORIES.filter((c) => c.colors)) {
        const dir = path.join(ASSETS, cat.dir);
        if (!fs.existsSync(dir)) continue;
        await buildColors(dir, fs.readdirSync(dir).filter((n) => IMAGE_RE.test(n)), cat.dir);
    }
}

(async () => {
    await update();
    if (!process.argv.includes('--watch')) return;
    const dirs = [DIR].concat(OTHER_CATEGORIES.map((c) => path.join(ASSETS, c.dir)).filter((d) => fs.existsSync(d)));
    console.log('Watching ' + dirs.length + ' folders for added/removed files. Press Ctrl+C to stop.');
    let timer;
    let running = false;
    for (const dir of dirs) {
        fs.watch(dir, (event, changed) => {
            if (/\.json$/i.test(changed || '')) return;
            clearTimeout(timer);
            timer = setTimeout(async () => {
                if (running) return;
                running = true;
                try { await update(); } finally { running = false; }
            }, 600);
        });
    }
})();
