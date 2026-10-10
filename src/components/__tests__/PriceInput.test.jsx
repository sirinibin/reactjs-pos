import React, { useState } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import PriceInput from '../PriceInput';
import { counterpartPrice } from '../../utils/priceInput';

// A with/without VAT pair wired the way the POS forms wire theirs: the form
// stores numbers, reads e.target.value, and fills in the other price at once.
function PricePair({ vatPercent = 15, initial = { unit_price: 100, unit_price_with_vat: 115 }, onKey = () => { } }) {
    const [p, setP] = useState(initial);
    const edit = (field, other, direction) => (e) => {
        const v = e.target.value === '' ? '' : parseFloat(e.target.value);
        setP({ [field]: v, [other]: counterpartPrice(v, vatPercent, direction) });
    };
    return (
        <>
            <PriceInput data-testid="ex" value={p.unit_price} onKeyDown={onKey}
                onChange={edit('unit_price', 'unit_price_with_vat', 'toWithVat')} />
            <PriceInput data-testid="inc" value={p.unit_price_with_vat} onKeyDown={onKey}
                onChange={edit('unit_price_with_vat', 'unit_price', 'toWithoutVat')} />
            <output data-testid="state">{JSON.stringify(p)}</output>
        </>
    );
}

const state = () => JSON.parse(screen.getByTestId('state').textContent);

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

function focus(el) {
    act(() => { el.focus(); });
    act(() => { jest.runOnlyPendingTimers(); });
}

describe('PriceInput', () => {
    test('is a text box with the decimal keypad, never a number spinner', () => {
        render(<PricePair />);
        const ex = screen.getByTestId('ex');
        expect(ex).toHaveAttribute('type', 'text');
        expect(ex).toHaveAttribute('inputmode', 'decimal');
        expect(ex).toHaveAttribute('autocomplete', 'off');
        expect(ex).toHaveAttribute('dir', 'ltr');
        expect(ex).toHaveClass('price-input');
    });

    test('shows prices with 2 decimals when not editing', () => {
        render(<PricePair />);
        expect(screen.getByTestId('ex')).toHaveValue('100.00');
        expect(screen.getByTestId('inc')).toHaveValue('115.00');
    });

    test('focusing shows the full price and selects it so typing replaces it', () => {
        render(<PricePair initial={{ unit_price: 8.69565217, unit_price_with_vat: 10 }} />);
        const ex = screen.getByTestId('ex');
        expect(ex).toHaveValue('8.6957');
        expect(ex).toHaveAttribute('title', '8.69565217');
        focus(ex);
        expect(ex).toHaveValue('8.69565217');
        expect(ex.selectionStart).toBe(0);
        expect(ex.selectionEnd).toBe('8.69565217'.length);
    });

    test('selects the whole price on focus synchronously, without waiting for a timer', () => {
        render(<PricePair />);
        const inc = screen.getByTestId('inc');
        act(() => { inc.focus(); });
        expect(inc).toHaveValue('115');
        expect(inc.selectionStart).toBe(0);
        expect(inc.selectionEnd).toBe(3);
    });

    test('the click that focuses the box keeps the selection on mouseup', () => {
        render(<PricePair />);
        const inc = screen.getByTestId('inc');
        fireEvent.mouseDown(inc);
        act(() => { inc.focus(); });
        inc.setSelectionRange(1, 1); // what the browser does on mouseup
        const notCancelled = fireEvent.mouseUp(inc);
        expect(notCancelled).toBe(false); // default caret placement prevented
        expect(inc.selectionStart).toBe(0);
        expect(inc.selectionEnd).toBe(3);
    });

    test('clicking inside an already focused box places the caret normally', () => {
        render(<PricePair />);
        const inc = screen.getByTestId('inc');
        focus(inc);
        fireEvent.mouseDown(inc);
        expect(fireEvent.mouseUp(inc)).toBe(true);
    });

    test('typing a with-VAT price fills the without-VAT price immediately', () => {
        render(<PricePair />);
        const inc = screen.getByTestId('inc');
        focus(inc);
        fireEvent.change(inc, { target: { value: '230' } });
        expect(state()).toEqual({ unit_price_with_vat: 230, unit_price: 200 });
        expect(screen.getByTestId('ex')).toHaveValue('200.00');
    });

    test('typing a without-VAT price fills the with-VAT price immediately', () => {
        render(<PricePair />);
        const ex = screen.getByTestId('ex');
        focus(ex);
        fireEvent.change(ex, { target: { value: '8.7' } });
        expect(state()).toEqual({ unit_price: 8.7, unit_price_with_vat: 10.005 });
        expect(screen.getByTestId('inc')).toHaveValue('10.005');
    });

    test('keeps a trailing dot and trailing zeros while typing', () => {
        render(<PricePair />);
        const inc = screen.getByTestId('inc');
        focus(inc);
        fireEvent.change(inc, { target: { value: '12.' } });
        expect(inc).toHaveValue('12.');
        fireEvent.change(inc, { target: { value: '12.50' } });
        expect(inc).toHaveValue('12.50');
        fireEvent.change(inc, { target: { value: '0.0' } });
        expect(inc).toHaveValue('0.0');
        expect(state().unit_price_with_vat).toBe(0);
    });

    test('Backspace deletes one digit, not the whole price', () => {
        render(<PricePair initial={{ unit_price: 100, unit_price_with_vat: 115 }} />);
        const inc = screen.getByTestId('inc');
        focus(inc);
        inc.setSelectionRange(3, 3); // caret after "115"
        // The browser's own Backspace: keydown, then the text loses one character.
        fireEvent.keyDown(inc, { key: 'Backspace' });
        expect(inc).toHaveValue('115');
        fireEvent.change(inc, { target: { value: '11' } });
        expect(inc).toHaveValue('11');
        expect(state()).toEqual({ unit_price_with_vat: 11, unit_price: 9.56521739 });
    });

    test('Backspace and typing never reach the form\'s own key handler', () => {
        const onKey = jest.fn();
        render(<PricePair onKey={onKey} />);
        const inc = screen.getByTestId('inc');
        focus(inc);
        fireEvent.keyDown(inc, { key: 'Backspace' });
        fireEvent.keyDown(inc, { key: '7' });
        fireEvent.keyDown(inc, { key: 'Delete' });
        expect(onKey).not.toHaveBeenCalled();
        fireEvent.keyDown(inc, { key: 'Enter' });
        fireEvent.keyDown(inc, { key: 'F4' });
        fireEvent.keyDown(inc, { key: 'b', ctrlKey: true, shiftKey: true });
        expect(onKey.mock.calls.map(c => c[0].key)).toEqual(['Enter', 'F4', 'b']);
    });

    test('arrows move the caret inside the price and leave only from its edge', () => {
        const onKey = jest.fn();
        render(<PricePair onKey={onKey} />);
        const inc = screen.getByTestId('inc');
        focus(inc);
        inc.setSelectionRange(1, 1);
        fireEvent.keyDown(inc, { key: 'ArrowLeft' });
        expect(onKey).not.toHaveBeenCalled();
        inc.setSelectionRange(0, 0);
        fireEvent.keyDown(inc, { key: 'ArrowLeft' });
        expect(onKey).toHaveBeenCalledTimes(1);
    });

    test('rejects letters, minus signs and exponent notation', () => {
        render(<PricePair />);
        const inc = screen.getByTestId('inc');
        focus(inc);
        fireEvent.change(inc, { target: { value: '-12e3abc' } });
        expect(inc).toHaveValue('123');
        expect(state().unit_price_with_vat).toBe(123);
    });

    test('a rejected character does not trigger another change', () => {
        const onChange = jest.fn();
        render(<PriceInput data-testid="p" value={5} onChange={onChange} />);
        const p = screen.getByTestId('p');
        focus(p);
        fireEvent.change(p, { target: { value: '5a' } });
        expect(onChange).not.toHaveBeenCalled();
        expect(p).toHaveValue('5');
    });

    test('accepts Arabic digits and a decimal comma', () => {
        render(<PricePair />);
        const inc = screen.getByTestId('inc');
        focus(inc);
        fireEvent.change(inc, { target: { value: '٢٣٠٫٥' } });
        expect(inc).toHaveValue('230.5');
        fireEvent.change(inc, { target: { value: '230,75' } });
        expect(inc).toHaveValue('230.75');
        expect(state().unit_price_with_vat).toBe(230.75);
    });

    test('limits the price to 8 decimals', () => {
        render(<PricePair />);
        const ex = screen.getByTestId('ex');
        focus(ex);
        fireEvent.change(ex, { target: { value: '1.1234567891' } });
        expect(ex).toHaveValue('1.12345678');
    });

    test('clearing one price clears the other', () => {
        render(<PricePair />);
        const inc = screen.getByTestId('inc');
        focus(inc);
        fireEvent.change(inc, { target: { value: '' } });
        expect(state()).toEqual({ unit_price_with_vat: '', unit_price: '' });
        expect(screen.getByTestId('ex')).toHaveValue('');
    });

    test('Escape restores the price from before the edit and keeps the modal open', () => {
        const onKey = jest.fn();
        const outer = jest.fn();
        render(<div onKeyDown={outer}><PricePair onKey={onKey} /></div>);
        const inc = screen.getByTestId('inc');
        focus(inc);
        fireEvent.change(inc, { target: { value: '999' } });
        expect(state().unit_price).toBeCloseTo(868.69565217, 6);
        fireEvent.keyDown(inc, { key: 'Escape' });
        expect(inc).toHaveValue('115');
        expect(state()).toEqual({ unit_price_with_vat: 115, unit_price: 100 });
        expect(onKey).not.toHaveBeenCalled();
        expect(outer).not.toHaveBeenCalled();
    });

    test('Escape with nothing changed is left to the form (e.g. to close the modal)', () => {
        const onKey = jest.fn();
        render(<PricePair onKey={onKey} />);
        const inc = screen.getByTestId('inc');
        focus(inc);
        fireEvent.keyDown(inc, { key: 'Escape' });
        expect(onKey).toHaveBeenCalledTimes(1);
    });

    test('blurring formats the price again and calls the form\'s onBlur', () => {
        const onBlur = jest.fn();
        render(<PriceInput data-testid="p" value={12.5} onBlur={onBlur} onChange={() => { }} />);
        const p = screen.getByTestId('p');
        focus(p);
        expect(p).toHaveValue('12.5');
        act(() => { p.blur(); });
        expect(p).toHaveValue('12.50');
        expect(onBlur).toHaveBeenCalledTimes(1);
    });

    test('passes id, name and the real element to the form handlers and refs', () => {
        const onChange = jest.fn();
        const onFocus = jest.fn();
        const ref = React.createRef();
        let callbackEl = null;
        const { rerender } = render(<PriceInput id="sales_product_unit_price_0" name="n0" ref={ref} value="" onChange={onChange} onFocus={onFocus} />);
        const el = document.getElementById('sales_product_unit_price_0');
        expect(ref.current).toBe(el);
        rerender(<PriceInput id="sales_product_unit_price_0" name="n0" ref={(e) => { callbackEl = e; }} value="" onChange={onChange} onFocus={onFocus} />);
        expect(callbackEl).toBe(el);
        focus(el);
        expect(onFocus).toHaveBeenCalledTimes(1);
        fireEvent.change(el, { target: { value: '7' } });
        expect(onChange).toHaveBeenCalledTimes(1);
        const evt = onChange.mock.calls[0][0];
        expect(evt.target).toEqual({ value: '7', id: 'sales_product_unit_price_0', name: 'n0' });
        expect(evt.currentTarget).toBe(el);
    });

    test('ignores the mouse wheel instead of blurring', () => {
        const onWheel = jest.fn();
        render(<PriceInput data-testid="p" value={1} onChange={() => { }} onWheel={onWheel} />);
        const p = screen.getByTestId('p');
        focus(p);
        fireEvent.wheel(p);
        expect(onWheel).not.toHaveBeenCalled();
        expect(document.activeElement).toBe(p);
    });

    test('respects disabled (ZATCA-reported documents)', () => {
        render(<PriceInput data-testid="p" value={1} onChange={() => { }} disabled />);
        expect(screen.getByTestId('p')).toBeDisabled();
    });

    test('shows an empty box for an empty, null or undefined price', () => {
        const { rerender } = render(<PriceInput data-testid="p" value="" onChange={() => { }} />);
        expect(screen.getByTestId('p')).toHaveValue('');
        rerender(<PriceInput data-testid="p" value={null} onChange={() => { }} />);
        expect(screen.getByTestId('p')).toHaveValue('');
        rerender(<PriceInput data-testid="p" value={undefined} onChange={() => { }} />);
        expect(screen.getByTestId('p')).toHaveValue('');
    });

    test('keeps the caller\'s classes', () => {
        render(<PriceInput data-testid="p" value={1} onChange={() => { }} className="form-control text-end is-invalid" />);
        expect(screen.getByTestId('p')).toHaveClass('form-control', 'text-end', 'is-invalid', 'price-input');
    });
});
