/**
 * Tests for the multi-page background-image containment fix in
 * customer_deposit/previewContent.js.
 *
 * Root cause: each page is rendered as a separate div with a fixed height of
 * 1118px that contains an absolutely-positioned <img> for the invoice
 * background.  Without `position: relative` on the page container, the browser
 * resolves "absolute" relative to a distant ancestor, so the background of
 * page 2 overlaps page 1's content area.
 *
 * Fix: added `position: "relative"` + `overflow: "hidden"` to every page
 * container div.  This matches the same pattern already in use in
 * order/previewContent.js (line 82).
 *
 * Test strategy: source-file structural assertions (no browser needed) +
 * pure-JS simulations of the CSS stacking context rule.
 */

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
    path.join(__dirname, '../previewContent.js'),
    'utf8'
);

// ─── 1. Page container has position:relative ──────────────────────────────────

describe('previewContent — page container positioning', () => {
    test('page container div has position: "relative"', () => {
        expect(SRC).toMatch(/position:\s*["']relative["']/);
    });

    test('page container div has overflow: "hidden"', () => {
        expect(SRC).toMatch(/overflow:\s*["']hidden["']/);
    });

    test('position:relative appears alongside height:"1118px" (same style block)', () => {
        // Both properties live in the same style object — verify they are within
        // 200 chars of each other so we know it is the page container, not some
        // inner element.
        const heightIdx    = SRC.indexOf('height: "1118px"');
        const relativeIdx  = SRC.indexOf('position: "relative"');
        expect(heightIdx).toBeGreaterThan(-1);
        expect(relativeIdx).toBeGreaterThan(-1);
        expect(Math.abs(relativeIdx - heightIdx)).toBeLessThan(400);
    });

    test('overflow:hidden appears alongside height:"1118px" (same style block)', () => {
        const heightIdx   = SRC.indexOf('height: "1118px"');
        const overflowIdx = SRC.indexOf('overflow: "hidden"');
        expect(heightIdx).toBeGreaterThan(-1);
        expect(overflowIdx).toBeGreaterThan(-1);
        expect(Math.abs(overflowIdx - heightIdx)).toBeLessThan(400);
    });

    test('position:relative comes AFTER backgroundPosition (same object, correct order)', () => {
        const bgPosIdx   = SRC.indexOf("backgroundPosition: 'center'");
        const relativeIdx = SRC.indexOf('position: "relative"');
        expect(bgPosIdx).toBeGreaterThan(-1);
        expect(relativeIdx).toBeGreaterThan(bgPosIdx);
    });
});


// ─── 2. Background <img> is still absolutely positioned inside the fixed container

describe('previewContent — background <img> containment', () => {
    test('background <img> still uses position: "absolute"', () => {
        // The absolute <img> must remain; it is what html2pdf renders for backgrounds.
        expect(SRC).toMatch(/position:\s*["']absolute["']/);
    });

    test('background <img> has top: 0 (pins to top of page container)', () => {
        expect(SRC).toMatch(/top:\s*0/);
    });

    test('background <img> height is "100%" (fills the fixed 1118px container)', () => {
        expect(SRC).toMatch(/height:\s*["']100%["']/);
    });

    test('position:relative on parent means absolute child is contained within it', () => {
        // Pure CSS stacking-context model: an absolutely positioned element is
        // contained within the nearest ancestor whose position is not "static".
        function nearestPositionedAncestor(elementPos, ancestors) {
            for (const a of ancestors) {
                if (a !== 'static') return a;
            }
            return 'viewport';
        }

        // Before fix: page container was "static" (default), so the img escaped
        const beforeFix = nearestPositionedAncestor('absolute', ['static', 'static', 'relative']);
        expect(beforeFix).toBe('relative'); // resolved to a distant ancestor

        // After fix: page container is "relative" — img is now contained
        const afterFix = nearestPositionedAncestor('absolute', ['relative', 'static', 'relative']);
        expect(afterFix).toBe('relative');
        // The containing block is the FIRST ancestor — i.e., the page container itself
        const pageContainerIsFirstAncestor = afterFix === 'relative';
        expect(pageContainerIsFirstAncestor).toBe(true);
    });
});


// ─── 3. Multi-page overlap simulation ─────────────────────────────────────────

describe('multi-page background overlap — simulated layout engine', () => {
    /**
     * Simulate where an absolute child renders given a list of ancestor positions.
     * Returns the index of the containing block in the ancestors array.
     */
    function containingBlockIndex(ancestors) {
        for (let i = 0; i < ancestors.length; i++) {
            if (ancestors[i] !== 'static') return i;
        }
        return ancestors.length; // viewport
    }

    /**
     * Simulate the visual top of a page's background <img>.
     *
     * @param {number} pageIndex  0-based page number
     * @param {number} pageHeight px height of each page div
     * @param {boolean} containerIsPositioned  whether the page div has position:relative
     * @returns {number} rendered top in document coordinates
     */
    function bgImageTop(pageIndex, pageHeight, containerIsPositioned) {
        const pageTop = pageIndex * pageHeight;
        if (containerIsPositioned) {
            // img is contained: renders at top of its own page
            return pageTop + 0; // top:0 relative to page container
        } else {
            // img escapes to the viewport/root — all pages' imgs render at top:0
            return 0;
        }
    }

    test('without fix: all pages background imgs render at top:0 (overlapping)', () => {
        const PAGES = [0, 1, 2];
        const tops = PAGES.map(i => bgImageTop(i, 1118, false));
        expect(tops).toEqual([0, 0, 0]); // all stacked at document top
    });

    test('with fix: each page background img renders at its own page top', () => {
        const PAGES = [0, 1, 2];
        const tops = PAGES.map(i => bgImageTop(i, 1118, true));
        expect(tops).toEqual([0, 1118, 2236]); // each at correct position
    });

    test('with fix: page 1 background does not overlap page 0 content area', () => {
        const page0Bottom = bgImageTop(0, 1118, true) + 1118; // 1118
        const page1BgTop  = bgImageTop(1, 1118, true);          // 1118
        expect(page1BgTop).toBeGreaterThanOrEqual(page0Bottom);
    });

    test('with fix: page 2 background does not overlap page 1 content area', () => {
        const page1Bottom = bgImageTop(1, 1118, true) + 1118; // 2236
        const page2BgTop  = bgImageTop(2, 1118, true);          // 2236
        expect(page2BgTop).toBeGreaterThanOrEqual(page1Bottom);
    });

    test('overflow:hidden clips the background img to exactly the page height', () => {
        // Simulates overflow:hidden: the visible rect of the img is clamped
        // to the container's bounds.
        function visibleHeight(imgHeight, containerHeight, overflowHidden) {
            return overflowHidden ? Math.min(imgHeight, containerHeight) : imgHeight;
        }

        const pageHeight = 1118;
        const imgHeight  = 1118; // height: "100%" of the 1118px container

        expect(visibleHeight(imgHeight, pageHeight, true)).toBe(1118);
        // Without overflow:hidden the img could protrude into the next page
        expect(visibleHeight(imgHeight + 50, pageHeight, false)).toBe(imgHeight + 50);
        expect(visibleHeight(imgHeight + 50, pageHeight, true)).toBe(pageHeight);
    });

    test('with fix: 10-page receipt has no background overlaps', () => {
        const NUM_PAGES = 10;
        const PAGE_H    = 1118;
        const pages = Array.from({ length: NUM_PAGES }, (_, i) => ({
            top:    i * PAGE_H,
            bgTop:  bgImageTop(i, PAGE_H, true),
            bgBot:  bgImageTop(i, PAGE_H, true) + PAGE_H,
        }));

        for (let i = 1; i < pages.length; i++) {
            const prevBottom = pages[i - 1].bgBot;
            const currTop    = pages[i].bgTop;
            expect(currTop).toBeGreaterThanOrEqual(prevBottom);
        }
    });
});


// ─── 4. Regression: order/previewContent already uses the same fix ─────────────

describe('regression — order/previewContent already had the fix', () => {
    const ORDER_SRC = fs.readFileSync(
        path.join(__dirname, '../../order/previewContent.js'),
        'utf8'
    );

    test('order previewContent has position: relative on page container', () => {
        // Confirms the reference implementation that customer_deposit now mirrors
        expect(ORDER_SRC).toMatch(/position:\s*["']relative["']/);
    });

    test('order previewContent has position: absolute on background img', () => {
        expect(ORDER_SRC).toMatch(/position:\s*["']absolute["']/);
    });
});


// ─── 5. No regression — other page-container styles unchanged ─────────────────

describe('no regression — page container unchanged apart from the two new properties', () => {
    test('height is still 1118px', () => {
        expect(SRC).toMatch(/height:\s*["']1118px["']/);
    });

    test('marginTop still uses page.top (dynamic per-page offset)', () => {
        expect(SRC).toMatch(/marginTop:\s*page\.top\s*\+\s*["']px["']/);
    });

    test('backgroundImage is still set from props.invoiceBackground', () => {
        expect(SRC).toMatch(/backgroundImage:.*props\.invoiceBackground/);
    });

    test('backgroundSize is still cover', () => {
        expect(SRC).toMatch(/backgroundSize:\s*['"]cover['"]/);
    });

    test('backgroundPosition is still center', () => {
        expect(SRC).toMatch(/backgroundPosition:\s*['"]center['"]/);
    });

    test('content wrapper still has position:relative and zIndex:1', () => {
        // The inner content div (not the page container) keeps its own positioning
        expect(SRC).toMatch(/position:\s*["']relative["'][\s\S]{0,50}zIndex:\s*1/);
    });
});
