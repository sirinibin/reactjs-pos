/**
 * Tests that ImageViewerModal's Bootstrap Modal element carries the correct CSS
 * classes after the image-viewer-modal-wrap class was added.
 *
 * Background:
 *   When ImageViewerModal is opened from inside a quotation form that was itself
 *   opened from the balance sheet, the body has both balance-sheet-open and
 *   quotation-form-open classes.  App.css contains:
 *
 *     body.balance-sheet-open.quotation-form-open .image-viewer-modal-wrap { z-index: 1083 }
 *
 *   Without image-viewer-modal-wrap on the Modal element, that rule has nothing
 *   to select and the image modal ends up behind the quotation form (at z-index 1082).
 *   Adding the class makes the CSS rule fire and lifts the modal above the form.
 *
 * The existing ImageViewerModal.test.jsx mock discards className, so this file
 * uses a separate mock that captures it.
 */

import React, { createRef } from 'react';
import { render, screen, act } from '@testing-library/react';
import ImageViewerModal from '../ImageViewerModal';

// Modal mock that forwards className to the DOM so tests can assert it.
jest.mock('react-bootstrap', () => {
    const React = require('react');
    const MockModal = ({ show, className, children }) => {
        if (!show) return null;
        return <div data-testid="bs-modal" className={className}>{children}</div>;
    };
    MockModal.Header = () => null;
    MockModal.Body = ({ children, ...rest }) => (
        <div data-testid="modal-body" {...rest}>{children}</div>
    );
    return { Modal: MockModal };
});

const IMAGES = ['https://example.com/a.jpg', 'https://example.com/b.jpg'];

function setup(images = IMAGES, modalClassName) {
    const ref = createRef();
    const props = { ref, images };
    if (modalClassName !== undefined) props.modalClassName = modalClassName;
    render(<ImageViewerModal {...props} />);
    return ref;
}

function open(ref) {
    act(() => { ref.current.open(0); });
}

function modal() { return screen.getByTestId('bs-modal'); }

// ── 1. image-viewer-modal-wrap class is always present ───────────────────────

describe('1. image-viewer-modal-wrap class', () => {
    test('1.1  modal has image-viewer-modal-wrap when no modalClassName prop is given', () => {
        const ref = setup();
        open(ref);
        expect(modal()).toHaveClass('image-viewer-modal-wrap');
    });

    test('1.2  modal has image-viewer-modal-wrap when modalClassName is a non-empty string', () => {
        const ref = setup(IMAGES, 'my-custom-class');
        open(ref);
        expect(modal()).toHaveClass('image-viewer-modal-wrap');
    });

    test('1.3  modal has image-viewer-modal-wrap when modalClassName is undefined', () => {
        const ref = setup(IMAGES, undefined);
        open(ref);
        expect(modal()).toHaveClass('image-viewer-modal-wrap');
    });

    test('1.4  modal has image-viewer-modal-wrap when modalClassName is an empty string', () => {
        const ref = setup(IMAGES, '');
        open(ref);
        expect(modal()).toHaveClass('image-viewer-modal-wrap');
    });

    test('1.5  image-viewer-modal-wrap is not duplicated in className', () => {
        const ref = setup();
        open(ref);
        const count = (modal().className.match(/image-viewer-modal-wrap/g) || []).length;
        expect(count).toBe(1);
    });

    test('1.6  modal is not shown before open() — class assertion would be on null element', () => {
        setup();
        expect(screen.queryByTestId('bs-modal')).not.toBeInTheDocument();
    });
});

// ── 2. above-sales-modal class is still present (regression guard) ────────────

describe('2. above-sales-modal class (base class must not have been removed)', () => {
    test('2.1  modal has above-sales-modal when no modalClassName prop is given', () => {
        const ref = setup();
        open(ref);
        expect(modal()).toHaveClass('above-sales-modal');
    });

    test('2.2  modal has above-sales-modal when modalClassName is provided', () => {
        const ref = setup(IMAGES, 'extra-class');
        open(ref);
        expect(modal()).toHaveClass('above-sales-modal');
    });

    test('2.3  above-sales-modal is not duplicated in className', () => {
        const ref = setup();
        open(ref);
        const count = (modal().className.match(/above-sales-modal/g) || []).length;
        expect(count).toBe(1);
    });
});

// ── 3. Both classes are present simultaneously ────────────────────────────────

describe('3. Both classes present simultaneously', () => {
    test('3.1  modal has both above-sales-modal and image-viewer-modal-wrap', () => {
        const ref = setup();
        open(ref);
        expect(modal()).toHaveClass('above-sales-modal');
        expect(modal()).toHaveClass('image-viewer-modal-wrap');
    });

    test('3.2  above-sales-modal appears before image-viewer-modal-wrap in className', () => {
        // Class order matters for readability and matches the template literal order.
        const ref = setup();
        open(ref);
        const parts = modal().className.split(' ');
        const asmIdx = parts.indexOf('above-sales-modal');
        const ivmIdx = parts.indexOf('image-viewer-modal-wrap');
        expect(asmIdx).toBeGreaterThanOrEqual(0);
        expect(ivmIdx).toBeGreaterThanOrEqual(0);
        expect(asmIdx).toBeLessThan(ivmIdx);
    });

    test('3.3  both classes are adjacent with no extra tokens between them (no modalClassName)', () => {
        const ref = setup(IMAGES, undefined);
        open(ref);
        expect(modal().className).toBe('above-sales-modal image-viewer-modal-wrap');
    });
});

// ── 4. modalClassName prop forwarding ─────────────────────────────────────────

describe('4. modalClassName prop forwarding', () => {
    test('4.1  no modalClassName → className is "above-sales-modal image-viewer-modal-wrap" (exact)', () => {
        const ref = setup(IMAGES, undefined);
        open(ref);
        expect(modal().className).toBe('above-sales-modal image-viewer-modal-wrap');
    });

    test('4.2  empty-string modalClassName → className unchanged (no trailing space)', () => {
        // '' is falsy — the ternary `props.modalClassName ? ...` produces '' → appends nothing.
        const ref = setup(IMAGES, '');
        open(ref);
        expect(modal().className).toBe('above-sales-modal image-viewer-modal-wrap');
    });

    test('4.3  modalClassName="my-class" is appended after image-viewer-modal-wrap', () => {
        const ref = setup(IMAGES, 'my-class');
        open(ref);
        expect(modal().className).toBe('above-sales-modal image-viewer-modal-wrap my-class');
    });

    test('4.4  multi-word modalClassName is appended as a single string', () => {
        const ref = setup(IMAGES, 'foo-modal bar-overlay');
        open(ref);
        expect(modal().className).toBe('above-sales-modal image-viewer-modal-wrap foo-modal bar-overlay');
    });

    test('4.5  modalClassName="above-pending-modal" is appended (pendingView use case)', () => {
        const ref = setup(IMAGES, 'above-pending-modal');
        open(ref);
        expect(modal()).toHaveClass('above-pending-modal');
        expect(modal().className).toBe('above-sales-modal image-viewer-modal-wrap above-pending-modal');
    });

    test('4.6  custom modalClassName is queryable via toHaveClass', () => {
        const ref = setup(IMAGES, 'custom-selector-class');
        open(ref);
        expect(modal()).toHaveClass('custom-selector-class');
    });
});

// ── 5. Source-level: template literal in ImageViewerModal.js ─────────────────

describe('5. Source-level template literal checks', () => {
    const fs   = require('fs');
    const path = require('path');
    const SRC  = fs.readFileSync(path.join(__dirname, '../ImageViewerModal.js'), 'utf8');

    test('5.1  source contains the literal string "above-sales-modal image-viewer-modal-wrap"', () => {
        expect(SRC).toContain('above-sales-modal image-viewer-modal-wrap');
    });

    test('5.2  className starts with "above-sales-modal image-viewer-modal-wrap" in the template literal', () => {
        expect(SRC).toMatch(/`above-sales-modal image-viewer-modal-wrap/);
    });

    test('5.3  template literal conditionally appends modalClassName with a space prefix', () => {
        // Pattern: `...wrap${props.modalClassName ? ' ' + props.modalClassName : ''}`
        expect(SRC).toMatch(/image-viewer-modal-wrap\$\{props\.modalClassName\s*\?\s*' '\s*\+\s*props\.modalClassName/);
    });

    test('5.4  image-viewer-modal-wrap appears before any modalClassName reference in the JSX', () => {
        const wrapPos = SRC.indexOf('image-viewer-modal-wrap');
        const propPos = SRC.indexOf('props.modalClassName');
        expect(wrapPos).toBeGreaterThan(-1);
        expect(propPos).toBeGreaterThan(-1);
        expect(wrapPos).toBeLessThan(propPos);
    });

    test('5.5  above-sales-modal is the first class in the template literal (unchanged base)', () => {
        // The full class string starts with above-sales-modal.
        expect(SRC).toMatch(/className=\{`above-sales-modal/);
    });

    test('5.6  image-viewer-modal-wrap is not behind a conditional (always present)', () => {
        // Ensure image-viewer-modal-wrap is in the unconditional prefix of the template,
        // not inside a ternary that could omit it.
        const templateMatch = SRC.match(/`(above-sales-modal[^`]*)`/);
        expect(templateMatch).not.toBeNull();
        const templateContent = templateMatch[1];
        // image-viewer-modal-wrap should appear before any ${...} interpolation.
        const wrapPos = templateContent.indexOf('image-viewer-modal-wrap');
        const interpPos = templateContent.indexOf('${');
        expect(wrapPos).toBeGreaterThan(-1);
        expect(wrapPos).toBeLessThan(interpPos);
    });
});

// ── 6. z-index CSS rule presence cross-check ──────────────────────────────────

describe('6. Matching CSS rules exist in App.css (CSS side of the fix)', () => {
    const fs   = require('fs');
    const path = require('path');
    const CSS  = fs.readFileSync(path.join(__dirname, '../../App.css'), 'utf8');

    test('6.1  body.balance-sheet-open.quotation-form-open .image-viewer-modal-wrap exists at z-index 1083', () => {
        expect(CSS).toMatch(
            /body\.balance-sheet-open\.quotation-form-open\s+\.image-viewer-modal-wrap\s*\{[^}]*z-index\s*:\s*1083\s*!important/
        );
    });

    test('6.2  body.balance-sheet-open.quotation-sales-return-form-open .image-viewer-modal-wrap exists at z-index 1083', () => {
        expect(CSS).toMatch(
            /body\.balance-sheet-open\.quotation-sales-return-form-open\s+\.image-viewer-modal-wrap\s*\{[^}]*z-index\s*:\s*1083\s*!important/
        );
    });

    test('6.3  image-viewer-modal-wrap rule in CSS requires the image-viewer-modal-wrap class to exist on the element', () => {
        // This test documents the contract: the CSS selector and the JS class must match.
        const cssClass = 'image-viewer-modal-wrap';
        expect(CSS).toContain(cssClass);
        expect(SRC_ALIAS()).toContain(cssClass);

        function SRC_ALIAS() {
            return fs.readFileSync(path.join(__dirname, '../ImageViewerModal.js'), 'utf8');
        }
    });
});
