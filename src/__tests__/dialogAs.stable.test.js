/**
 * Guard for the whole frontend: a react-bootstrap Modal must not get an inline
 * arrow as dialogAs. An inline arrow is a new component type on every render, so
 * React rebuilds the modal body each time the parent re-renders: lists inside it
 * are fetched again, the open tab and typed text are lost. Use a component defined
 * at module level (see src/utils/DraggableFullscreenDialog.js) or useCallback.
 * Commented-out JSX is ignored.
 */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..');

function jsFiles(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) return e.name === '__tests__' ? [] : jsFiles(p);
        return /\.jsx?$/.test(e.name) && !/\.test\.jsx?$/.test(e.name) ? [p] : [];
    });
}

// Removes JSX comments ({/* ... */}), block comments and line comments.
function stripComments(code) {
    return code
        .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');
}

const INLINE_DIALOG_AS = /dialogAs=\{\s*(\(|function\b|[^}]*\?\s*undefined\s*:\s*\()/;

test('no Modal gets an inline arrow as dialogAs', () => {
    const offenders = jsFiles(SRC)
        .filter((f) => INLINE_DIALOG_AS.test(stripComments(fs.readFileSync(f, 'utf8'))))
        .map((f) => path.relative(SRC, f));
    expect(offenders).toEqual([]);
});

test('the check catches the inline form and ignores commented-out modals', () => {
    expect(INLINE_DIALOG_AS.test('dialogAs={({ children, ...props }) => (')).toBe(true);
    expect(INLINE_DIALOG_AS.test('dialogAs={props.size ? undefined : ({ children }) => (')).toBe(true);
    expect(INLINE_DIALOG_AS.test('dialogAs={PickerDialog}')).toBe(false);
    expect(INLINE_DIALOG_AS.test('dialogAs={props.size ? undefined : DraggableFullscreenDialog}')).toBe(false);
    expect(INLINE_DIALOG_AS.test(stripComments('{/*<Modal dialogAs={({ children }) => (<div/>)} />*/}'))).toBe(false);
});
