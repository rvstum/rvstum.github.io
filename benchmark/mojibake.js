export function decodeMojibake(val) {
    if (typeof val !== 'string' || !val) return val;
    if (!hasMojibakeHint(val)) return val;

    let current = val;
    for (let i = 0; i < 6; i += 1) {
        try {
            const decoded = decodeOnceLatin1Utf8(current);
            if (!decoded || decoded === current) break;

            const before = mojibakeScore(current);
            const after = mojibakeScore(decoded);
            if (after <= before) {
                current = decoded;
                if (!hasMojibakeHint(current)) break;
                continue;
            }
            break;
        } catch {
            break;
        }
    }

    return current;
}

export function hasMojibakeHint(str) {
    if (typeof str !== 'string' || !str) return false;
    return /Ãƒ.|Ã‚.|Ã¢â‚¬|Ã¯Â¿Â½|ÃƒÆ’|Ãƒâ€š/.test(str);
}

export function mojibakeScore(str) {
    if (typeof str !== 'string' || !str) return 0;
    const patterns = [/Ãƒ./g, /Ã‚./g, /Ã¢â‚¬/g, /Ã¯Â¿Â½/g, /ÃƒÆ’/g, /Ãƒâ€š/g];
    return patterns.reduce((score, pattern) => {
        const matches = str.match(pattern);
        return score + (matches ? matches.length : 0);
    }, 0);
}

export function decodeOnceLatin1Utf8(str) {
    const bytes = Uint8Array.from([...str].map((ch) => ch.charCodeAt(0) & 0xff));
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}
