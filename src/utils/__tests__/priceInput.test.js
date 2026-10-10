import {
    PRICE_MAX_DECIMALS,
    counterpartPrice,
    formatPriceDisplay,
    formatPriceForEditing,
    parsePriceDraft,
    sanitizePriceInput,
    shouldForwardPriceKey,
} from '../priceInput';

describe('sanitizePriceInput', () => {
    test.each([
        ['', ''],
        [null, ''],
        [undefined, ''],
        ['12', '12'],
        ['12.', '12.'],
        ['.5', '.5'],
        ['0', '0'],
        ['0.0', '0.0'],
        ['0.05', '0.05'],
        ['115.00', '115.00'],
        [115, '115'],
    ])('keeps a valid price in progress: %p -> %p', (raw, expected) => {
        expect(sanitizePriceInput(raw)).toBe(expected);
    });

    test.each([
        ['-5', '5'],
        ['+5', '5'],
        ['1e5', '15'],
        ['12abc', '12'],
        ['SAR 12.50', '12.50'],
        [' 12 ', '12'],
        ['1.2.3', '1.23'],
        ['..5', '.5'],
    ])('drops what a price cannot contain: %p -> %p', (raw, expected) => {
        expect(sanitizePriceInput(raw)).toBe(expected);
    });

    test('accepts a decimal comma', () => {
        expect(sanitizePriceInput('12,5')).toBe('12.5');
    });

    test('treats commas as thousands separators when a dot is present or there are several', () => {
        expect(sanitizePriceInput('1,234.50')).toBe('1234.50');
        expect(sanitizePriceInput('1,234,567')).toBe('1234567');
    });

    test('converts Arabic-Indic and Persian digits and the Arabic decimal mark', () => {
        expect(sanitizePriceInput('١٢٣٫٤٥')).toBe('123.45');
        expect(sanitizePriceInput('۱۲۳.۴۵')).toBe('123.45');
        expect(sanitizePriceInput('١٬٢٣٤٫٥')).toBe('1234.5');
    });

    test('stops at the maximum number of decimals instead of erroring', () => {
        expect(sanitizePriceInput('1.123456789')).toBe('1.12345678');
        expect(sanitizePriceInput('1.123456789', 2)).toBe('1.12');
        expect(PRICE_MAX_DECIMALS).toBe(8);
    });

    test('maxDecimals 0 allows whole numbers only', () => {
        expect(sanitizePriceInput('12.75', 0)).toBe('12');
    });
});

describe('parsePriceDraft', () => {
    test.each([
        ['', ''],
        ['.', ''],
        [null, ''],
        ['12.', 12],
        ['.5', 0.5],
        ['0', 0],
        ['0.05', 0.05],
    ])('%p -> %p', (draft, expected) => {
        expect(parsePriceDraft(draft)).toBe(expected);
    });
});

describe('formatPriceDisplay', () => {
    test.each([
        [115, '115.00'],
        ['115', '115.00'],
        [0, '0.00'],
        [10.005, '10.005'],
        [8.69565217, '8.6957'],
        [1.5, '1.50'],
        [1234567.891, '1234567.891'],
        ['', ''],
        [null, ''],
        [undefined, ''],
        ['abc', ''],
        [NaN, ''],
        [Infinity, ''],
    ])('%p -> %p', (value, expected) => {
        expect(formatPriceDisplay(value)).toBe(expected);
    });

    test('honours a custom number of display decimals', () => {
        expect(formatPriceDisplay(8.69565217, 2)).toBe('8.70');
        expect(formatPriceDisplay(8.69565217, 8)).toBe('8.69565217');
    });
});

describe('formatPriceForEditing', () => {
    test.each([
        [115, '115'],
        [8.69565217, '8.69565217'],
        [0.1 + 0.2, '0.3'],
        [0, '0'],
        ['10.50', '10.5'],
        ['', ''],
        [null, ''],
    ])('%p -> %p', (value, expected) => {
        expect(formatPriceForEditing(value)).toBe(expected);
    });
});

describe('shouldForwardPriceKey', () => {
    const caret = (selectionStart, selectionEnd, length) => ({ selectionStart, selectionEnd, length });

    test('editing keys stay in the box', () => {
        expect(shouldForwardPriceKey({ key: 'Backspace' }, caret(3, 3, 3))).toBe(false);
        expect(shouldForwardPriceKey({ key: 'Delete' }, caret(0, 0, 3))).toBe(false);
        expect(shouldForwardPriceKey({ key: '5' }, caret(3, 3, 3))).toBe(false);
        expect(shouldForwardPriceKey({ key: '.' }, caret(3, 3, 3))).toBe(false);
    });

    test('shortcuts, navigation and function keys reach the form', () => {
        expect(shouldForwardPriceKey({ key: 'Enter' }, caret(1, 1, 3))).toBe(true);
        expect(shouldForwardPriceKey({ key: 'Tab' }, caret(1, 1, 3))).toBe(true);
        expect(shouldForwardPriceKey({ key: 'F4' }, caret(1, 1, 3))).toBe(true);
        expect(shouldForwardPriceKey({ key: 'ArrowUp' }, caret(1, 1, 3))).toBe(true);
        expect(shouldForwardPriceKey({ key: 'b', ctrlKey: true }, caret(1, 1, 3))).toBe(true);
        expect(shouldForwardPriceKey({ key: 'B', metaKey: true }, caret(1, 1, 3))).toBe(true);
    });

    test('ArrowLeft/Home move the caret until it reaches the start', () => {
        expect(shouldForwardPriceKey({ key: 'ArrowLeft' }, caret(2, 2, 3))).toBe(false);
        expect(shouldForwardPriceKey({ key: 'Home' }, caret(2, 2, 3))).toBe(false);
        expect(shouldForwardPriceKey({ key: 'ArrowLeft' }, caret(0, 0, 3))).toBe(true);
        expect(shouldForwardPriceKey({ key: 'ArrowLeft' }, caret(0, 3, 3))).toBe(true); // all selected
        expect(shouldForwardPriceKey({ key: 'ArrowLeft' }, caret(1, 2, 3))).toBe(false); // partial selection
    });

    test('ArrowRight/End move the caret until it reaches the end', () => {
        expect(shouldForwardPriceKey({ key: 'ArrowRight' }, caret(1, 1, 3))).toBe(false);
        expect(shouldForwardPriceKey({ key: 'End' }, caret(1, 1, 3))).toBe(false);
        expect(shouldForwardPriceKey({ key: 'ArrowRight' }, caret(3, 3, 3))).toBe(true);
        expect(shouldForwardPriceKey({ key: 'ArrowRight' }, caret(0, 3, 3))).toBe(true);
    });

    test('an empty box forwards arrows straight away', () => {
        expect(shouldForwardPriceKey({ key: 'ArrowLeft' }, caret(0, 0, 0))).toBe(true);
        expect(shouldForwardPriceKey({ key: 'ArrowRight' }, caret(0, 0, 0))).toBe(true);
    });
});

describe('counterpartPrice', () => {
    test('adds and removes VAT at 8 decimals', () => {
        expect(counterpartPrice(100, 15, 'toWithVat')).toBe(115);
        expect(counterpartPrice(115, 15, 'toWithoutVat')).toBe(100);
        expect(counterpartPrice(10, 15, 'toWithoutVat')).toBe(8.69565217);
        expect(counterpartPrice(8.7, 15, 'toWithVat')).toBe(10.005);
    });

    test('works with a string price and a string VAT percent', () => {
        expect(counterpartPrice('100', '5', 'toWithVat')).toBe(105);
    });

    test('a store without VAT keeps both prices equal', () => {
        expect(counterpartPrice(42.5, 0, 'toWithVat')).toBe(42.5);
        expect(counterpartPrice(42.5, undefined, 'toWithoutVat')).toBe(42.5);
        expect(counterpartPrice(42.5, '', 'toWithoutVat')).toBe(42.5);
    });

    test('zero stays zero and empty clears the other price too', () => {
        expect(counterpartPrice(0, 15, 'toWithVat')).toBe(0);
        expect(counterpartPrice('', 15, 'toWithVat')).toBe('');
        expect(counterpartPrice(null, 15, 'toWithoutVat')).toBe('');
        expect(counterpartPrice('abc', 15, 'toWithoutVat')).toBe('');
    });

    test('round trip through VAT returns the typed price for 2-decimal prices', () => {
        for (const price of [0.01, 0.99, 1, 9.99, 10.5, 99.95, 1234.56, 99999.99]) {
            const withVat = counterpartPrice(price, 15, 'toWithVat');
            const back = counterpartPrice(withVat, 15, 'toWithoutVat');
            expect(Math.abs(back - price)).toBeLessThan(1e-7);
        }
    });
});
