/**
 * Sales Create form (#sales_create_form) between phone and desktop. The search
 * rows share a 2-column grid (`1fr auto`) whose second column (date + phone /
 * barcode + VAT) has a fixed ~393–440px width, so on an 820px tablet the product
 * search was 58px wide and on a 1180px tablet in landscape 22px (role audit
 * F035). And the error list (.sc-error-banner, position: fixed; top: 56px)
 * covered the header and the customer box until dismissed (F030).
 * The fix is CSS in App.css, scoped to #sales_create_form; 1200px+ is untouched.
 */
const fs = require('fs');
const path = require('path');

const APP_CSS = fs.readFileSync(path.join(__dirname, '../../App.css'), 'utf8');

/** Bodies of every @media block whose query matches `query` exactly (brace-matched). */
function mediaBlocks(css, query) {
    const out = [];
    const esc = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s*');
    const re = new RegExp('@media\\s*' + esc + '\\s*\\{', 'g');
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
const ruleIn = (block, selector) => {
    const esc = selector.replace(/[.*+?^${}()|[\]\\>#]/g, '\\$&').replace(/\s+/g, '\\s*');
    const m = block.match(new RegExp('(?:^|[}\\s,])' + esc + '\\s*(?:,[^{]*)?\\{([^}]*)\\}'));
    return m ? m[1] : null;
};

describe('Sales Create form on tablets (768–1199px)', () => {
    const TABLET = mediaBlocks(APP_CSS, '(min-width: 768px) and (max-width: 1199.98px)');

    test('the search rows stop sharing the fixed-width grid', () => {
        expect(ruleIn(TABLET, '#sales_create_form .sc-search-rows-grid')).toMatch(/display\s*:\s*flex\s*!important/);
        expect(TABLET).toMatch(/#sales_create_form \.sc-search-rows-grid \.sc-product-row\s*\{[^}]*display\s*:\s*flex\s*!important/);
    });

    test('customer and product searches take the full row', () => {
        expect(TABLET).toMatch(/#sales_create_form \.sc-product-search-group\s*\{[^}]*flex\s*:\s*1 1 100%\s*!important/);
        expect(TABLET).toMatch(/#sales_create_form \.sc-customer-search-group,/);
    });
});

describe('Sales Create form error list below desktop', () => {
    const BELOW = mediaBlocks(APP_CSS, '(max-width: 1199.98px)');
    test('flows at the top of the body instead of floating over the header', () => {
        const r = ruleIn(BELOW, '#sales_create_form .sc-error-banner');
        expect(r).not.toBeNull();
        expect(r).toMatch(/position\s*:\s*sticky\s*!important/);
        expect(r).toMatch(/top\s*:\s*0\s*!important/);
        expect(r).toMatch(/width\s*:\s*auto\s*!important/);
    });
});

describe('desktop (1200px and wider) is untouched', () => {
    test('no new rule for these selectors outside the media queries', () => {
        const outside = APP_CSS.replace(/@media[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '');
        expect(outside).not.toMatch(/#sales_create_form \.sc-(search-rows-grid|error-banner|product-search-group)/);
    });
});
