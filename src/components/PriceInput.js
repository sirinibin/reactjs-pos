import React, { useCallback, useRef, useState } from "react";
import {
    PRICE_MAX_DECIMALS,
    formatPriceDisplay,
    formatPriceForEditing,
    sanitizePriceInput,
    shouldForwardPriceKey,
} from "../utils/priceInput";

/**
 * Unit price box for the selected-products tables of every POS form.
 *
 * A drop-in replacement for `<input type="number">`: the form keeps its own
 * onChange/onBlur/onKeyDown handlers and still reads `e.target.value`, but
 *  - while focused the box keeps exactly what is being typed ("12.", "0.05"),
 *    so the stored number never rewrites the text under the cursor;
 *  - only a valid price can be typed (Arabic digits and a decimal comma are
 *    accepted, at most 8 decimals); no spinner, the mouse wheel does nothing,
 *    and phones and tablets show the decimal keypad;
 *  - focusing selects the whole price, so typing replaces it;
 *  - Backspace and Delete edit the text normally and arrows move the caret,
 *    leaving the box only at its edges (see shouldForwardPriceKey);
 *  - Escape restores the price from before this edit;
 *  - when not focused the price reads with 2-4 decimals; editing shows the
 *    full stored precision.
 */
const PriceInput = React.forwardRef(function PriceInput(
    {
        value,
        onChange,
        onFocus,
        onBlur,
        onKeyDown,
        className = "",
        maxDecimals = PRICE_MAX_DECIMALS,
        displayDecimals = 4,
        title,
        onWheel, // ignored: a text box has nothing to scroll, and blurring on scroll loses the edit
        ...rest
    },
    ref
) {
    const [draft, setDraft] = useState(null); // null = not editing
    const startValueRef = useRef("");
    const inputRef = useRef(null);

    const setRefs = useCallback((el) => {
        inputRef.current = el;
        if (typeof ref === "function") ref(el);
        else if (ref) ref.current = el;
    }, [ref]);

    const emit = (clean, event) => {
        if (!onChange) return;
        const el = inputRef.current;
        onChange({
            target: { value: clean, id: el?.id, name: el?.name },
            currentTarget: el,
            nativeEvent: event?.nativeEvent,
            preventDefault: () => event?.preventDefault?.(),
            stopPropagation: () => event?.stopPropagation?.(),
        });
    };

    // Puts `text` in the box and selects all of it right now, not on a timer:
    // a timer can fire after the first digit was typed (slow devices, fast
    // Tab + typing) and the next digit would then replace it. React sees the
    // DOM already holds the draft and leaves the selection alone.
    const showAndSelect = (el, text) => {
        if (!el) return;
        el.value = text;
        try { el.select(); } catch (err) { /* detached element */ }
    };

    // A mouse click focuses on mousedown and then places the caret on mouseup,
    // undoing the selection. Keep it for the click that focused the box.
    const focusedByMouseRef = useRef(false);

    const handleMouseDown = (e) => {
        focusedByMouseRef.current = document.activeElement !== e.currentTarget;
        if (rest.onMouseDown) rest.onMouseDown(e);
    };

    const handleMouseUp = (e) => {
        if (focusedByMouseRef.current) {
            focusedByMouseRef.current = false;
            e.preventDefault();
            showAndSelect(e.currentTarget, e.currentTarget.value);
        }
        if (rest.onMouseUp) rest.onMouseUp(e);
    };

    const handleFocus = (e) => {
        const start = formatPriceForEditing(value, maxDecimals);
        startValueRef.current = start;
        showAndSelect(e.currentTarget, start);
        setDraft(start);
        if (onFocus) onFocus(e);
    };

    const handleChange = (e) => {
        const clean = sanitizePriceInput(e.target.value, maxDecimals);
        if (clean === draft) {
            // Only rejected characters were typed: keep the text as it was.
            setDraft(clean);
            return;
        }
        setDraft(clean);
        emit(clean, e);
    };

    const handleBlur = (e) => {
        setDraft(null);
        if (onBlur) onBlur(e);
    };

    const handleKeyDown = (e) => {
        if (e.key === "Escape" && draft !== null && draft !== startValueRef.current) {
            // Undo this edit instead of closing the surrounding modal.
            e.preventDefault();
            e.stopPropagation();
            showAndSelect(e.currentTarget, startValueRef.current);
            setDraft(startValueRef.current);
            emit(startValueRef.current, e);
            return;
        }
        const el = e.currentTarget;
        const caret = {
            selectionStart: el.selectionStart ?? 0,
            selectionEnd: el.selectionEnd ?? 0,
            length: (el.value || "").length,
        };
        if (onKeyDown && shouldForwardPriceKey(e, caret)) onKeyDown(e);
    };

    const display = formatPriceDisplay(value, displayDecimals);
    const full = formatPriceForEditing(value, maxDecimals);

    return (
        <input
            {...rest}
            ref={setRefs}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            dir="ltr"
            className={`${className} price-input`.trim()}
            title={title !== undefined ? title : (draft === null && full && display !== formatPriceDisplay(full, maxDecimals) ? full : undefined)}
            value={draft !== null ? draft : display}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onFocus={handleFocus}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
        />
    );
});

export default PriceInput;
