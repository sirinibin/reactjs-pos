/**
 * Phone layout of the Quotation Create form. On a 390px screen the error/warning
 * list (.sc-error-banner, position: fixed; top: 56px; width: 380px inline) was
 * drawn over the modal header and covered its Create button, the header's title
 * and buttons were squeezed side by side, and the product search was sized
 * calc(100% - 360px), i.e. ~30px wide. The fix lives in one phone-only media
 * query in App.css, scoped to .quotation-create-wrap, so desktop is unchanged.
 */
const fs = require('fs');
const path = require('path');

const APP_CSS = fs.readFileSync(path.join(__dirname, '../../App.css'), 'utf8');
const SRC = fs.readFileSync(path.join(__dirname, '../create.js'), 'utf8');

/** Body of every `@media (max-width: 575.98px) { ... }` block (brace-matched). */
function phoneBlocks(css) {
    const out = [];
    const re = /@media\s*\(max-width:\s*575\.98px\)\s*\{/g;
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

const PHONE = phoneBlocks(APP_CSS);
const rule = (selector) => {
    const esc = selector.replace(/[.*+?^${}()|[\]\\>]/g, '\\$&').replace(/\s+/g, '\\s*');
    const m = PHONE.match(new RegExp(esc + '\\s*\\{([^}]*)\\}'));
    return m ? m[1] : null;
};

describe('Quotation Create form on phones', () => {
    test('the error/warning list no longer floats over the header', () => {
        const r = rule('.quotation-create-wrap .sc-error-banner');
        expect(r).not.toBeNull();
        expect(r).toMatch(/position\s*:\s*sticky\s*!important/);
        expect(r).toMatch(/top\s*:\s*0\s*!important/);
        expect(r).toMatch(/width\s*:\s*auto\s*!important/);
    });

    test('the header wraps so title and buttons do not overlap', () => {
        expect(rule('.quotation-create-wrap .modal-header')).toMatch(/flex-wrap\s*:\s*wrap/);
        expect(rule('.quotation-create-wrap .modal-header > .modal-title')).toMatch(/flex\s*:\s*1 1 100%/);
        expect(rule('.quotation-create-wrap .modal-header > .col')).toMatch(/flex-wrap\s*:\s*wrap/);
    });

    test('the product search takes the full row', () => {
        expect(SRC).toMatch(/className="qc-product-search-row"/);
        expect(SRC).toMatch(/className="qc-product-search-box"[^>]*calc\(100% - 360px\)/);
        expect(rule('.quotation-create-wrap .qc-product-search-row')).toMatch(/flex-wrap\s*:\s*wrap/);
        expect(rule('.quotation-create-wrap .qc-product-search-box')).toMatch(/flex\s*:\s*1 1 100%\s*!important/);
    });

    test('nothing of this is applied outside the phone media query', () => {
        const outside = APP_CSS.replace(/@media\s*\(max-width:\s*575\.98px\)\s*\{[\s\S]*?\n\}/g, '');
        expect(outside).not.toMatch(/\.quotation-create-wrap \.sc-error-banner/);
        expect(outside).not.toMatch(/\.qc-product-search-(row|box)/);
    });
});
