/**
 * Purchase Create form on phones: the product search wrapper is
 * `flex: 0 0 calc(100% - 366px)`, i.e. 0px on a 320/360px screen (the search
 * box was 34px). A phone-only rule in App.css gives it a full row.
 */
const fs = require('fs');
const path = require('path');

const APP_CSS = fs.readFileSync(path.join(__dirname, '../../App.css'), 'utf8');
const SRC = fs.readFileSync(path.join(__dirname, '../create.js'), 'utf8');

function phoneBlocks(css) {
    const out = [];
    const re = /@media\s*\(max-width:\s*767\.98px\)\s*\{/g;
    let m;
    while ((m = re.exec(css))) {
        let depth = 1;
        let i = re.lastIndex;
        for (; i < css.length && depth; i++) {
            if (css[i] === '{') depth++;
            else if (css[i] === '}') depth--;
        }
        out.push(css.slice(re.lastIndex, i - 1));
    }
    return out.join('\n');
}

test('the product search wrapper has class hooks', () => {
    expect(SRC).toMatch(/className="pc-product-search-row"/);
    expect(SRC).toMatch(/className="pc-product-search-box"[^>]*calc\(100% - 366px\)/);
});

test('on phones the product search takes the full row', () => {
    const PHONE = phoneBlocks(APP_CSS);
    expect(PHONE).toMatch(/\.purchase-create-wrap \.pc-product-search-row\s*\{[^}]*flex-wrap\s*:\s*wrap/);
    expect(PHONE).toMatch(/\.purchase-create-wrap \.pc-product-search-box\s*\{[^}]*flex\s*:\s*1 1 100%\s*!important/);
});

test('nothing of this applies on wider screens', () => {
    const outside = APP_CSS.replace(/@media[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '');
    expect(outside).not.toMatch(/pc-product-search-(row|box)/);
});
