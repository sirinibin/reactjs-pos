import { selectIfStillFocused, focusNewLineInput } from '../focusSelect';

function table(n) {
    document.body.innerHTML = '<input id="search"><table><tbody>' +
        Array.from({ length: n }, (_, i) => `<tr><td><input id="q${i}" value="${i + 1}"></td></tr>`).join('') +
        '</tbody></table>';
    return Array.from({ length: n }, (_, i) => document.getElementById(`q${i}`));
}

describe('selectIfStillFocused', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    test('selects the box on the next tick when it still has focus', () => {
        const [a] = table(1);
        a.focus();
        const spy = jest.spyOn(a, 'select');
        selectIfStillFocused(a);
        expect(spy).not.toHaveBeenCalled();
        jest.runOnlyPendingTimers();
        expect(spy).toHaveBeenCalledTimes(1);
    });

    test('does not pull focus back when the user moved to another box meanwhile', () => {
        const [a, b] = table(2);
        a.focus();
        const spyA = jest.spyOn(a, 'select');
        selectIfStillFocused(a);
        b.focus();
        jest.runOnlyPendingTimers();
        expect(spyA).not.toHaveBeenCalled();
        expect(document.activeElement).toBe(b);
    });

    test('two boxes focused in the same tick do not fight over focus', () => {
        const [a, b] = table(2);
        // Each focus schedules its own select, like the quantity boxes' onFocus.
        const onFocus = (e) => selectIfStillFocused(e.target);
        a.addEventListener('focus', onFocus);
        b.addEventListener('focus', onFocus);
        a.focus();
        b.focus();
        for (let i = 0; i < 10; i++) jest.runOnlyPendingTimers();
        expect(document.activeElement).toBe(b);
        expect(jest.getTimerCount()).toBe(0);
    });

    test('ignores a missing element', () => {
        expect(() => { selectIfStillFocused(null); jest.runOnlyPendingTimers(); }).not.toThrow();
    });
});

describe('focusNewLineInput', () => {
    test('focuses the new line from the product search box', () => {
        const [, b] = table(2);
        document.getElementById('search').focus();
        const spy = jest.spyOn(b, 'select');
        focusNewLineInput(b);
        expect(spy).toHaveBeenCalledTimes(1);
    });

    test('leaves focus alone while the user is typing in another line', () => {
        const [a, b] = table(2);
        a.focus();
        const spy = jest.spyOn(b, 'select');
        focusNewLineInput(b);
        expect(spy).not.toHaveBeenCalled();
        expect(document.activeElement).toBe(a);
    });

    test('selects again when the new line already has focus', () => {
        const [, b] = table(2);
        b.focus();
        const spy = jest.spyOn(b, 'select');
        focusNewLineInput(b);
        expect(spy).toHaveBeenCalledTimes(1);
    });

    test('focuses when nothing has focus, and ignores a missing element', () => {
        const [a] = table(1);
        const spy = jest.spyOn(a, 'select');
        focusNewLineInput(a);
        expect(spy).toHaveBeenCalledTimes(1);
        expect(() => focusNewLineInput(undefined)).not.toThrow();
    });
});
