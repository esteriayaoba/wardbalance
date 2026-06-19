const fs = require('fs');

const colorJson = JSON.parse(fs.readFileSync('colour-tokens.json', 'utf8'));
const typographyCss = fs.readFileSync('typography-tokens.css', 'utf8');

const rootMatch = typographyCss.match(/:root\s*{([\s\S]*?)}/);
const rootContent = rootMatch ? rootMatch[1] : '';

const typoVars = rootContent
    .replace('/* Font Weights *', '/* Font Weights */')
    .trim();

function resolveRef(pathStr, data) {
    const parts = pathStr.replace(/[{}]/g, '').split('.');
    let current = data;
    for (const p of parts) {
        if (current == null) return null;
        if (current[p] !== undefined) {
            current = current[p];
        } else {
            const lower = Object.keys(current).find(k => k.toLowerCase() === p.toLowerCase());
            if (lower) current = current[lower];
            else return null;
        }
    }
    return current;
}

function parseHSL(str) {
    const m = str.match(/hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)/);
    return m ? { h: +m[1], s: +m[2], l: +m[3] } : null;
}

function toHSL(h, s, l) {
    return `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`;
}

function interpolatePalette(palette, target) {
    const keys = Object.keys(palette).map(Number).sort((a, b) => a - b);
    const t = Number(target);
    if (palette[String(t)]) return palette[String(t)];

    let lo = null, hi = null;
    for (const k of keys) {
        if (k <= t) lo = k;
        if (k >= t && hi === null) hi = k;
    }
    if (lo === null) lo = hi;
    if (hi === null) hi = lo;
    if (lo === hi) return palette[String(lo)];

    const frac = (t - lo) / (hi - lo);
    const a = parseHSL(palette[String(lo)]);
    const b = parseHSL(palette[String(hi)]);
    if (!a || !b) return null;
    return toHSL(a.h + (b.h - a.h) * frac, a.s + (b.s - a.s) * frac, a.l + (b.l - a.l) * frac);
}

function resolveValue(val, data) {
    const m = val.match(/^\{(.+)\}$/);
    if (!m) return val;
    const resolved = resolveRef(m[1], data);
    if (resolved) return resolved;
    const parts = m[1].split('.');
    if (parts[0] === 'color' && parts[1] === 'palette' && parts.length === 4) {
        const p = parts[2], k = parts[3];
        const paletteKey = Object.keys(data.color.palette)
            .find(key => key.toLowerCase() === p.toLowerCase());
        if (paletteKey) {
            return interpolatePalette(data.color.palette[paletteKey], k) || val;
        }
    }
    return val;
}

function camelToKebab(s) {
    return s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

function rolesToCSS(roles, data) {
    return Object.entries(roles)
        .map(([k, v]) => `    --color-${camelToKebab(k)}: ${resolveValue(v, data)};`)
        .join('\n');
}

const lightCSS = rolesToCSS(colorJson.color.role.light, colorJson);
const darkCSS = rolesToCSS(colorJson.color.role.dark, colorJson);

const output = `/* ================================
   WardBalance Design Tokens
   Auto-generated - do not edit directly
   ================================ */

:root {
${typoVars}
}

:root {
    /* Color - Light Theme */
${lightCSS}
}

[data-theme="dark"] {
    /* Color - Dark Theme */
${darkCSS}
}
`;

fs.writeFileSync('tokens.css', output);
console.log('tokens.css generated');
