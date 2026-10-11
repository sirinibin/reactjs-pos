/**
 * Selects a box's text on the next tick, but only if it still has focus.
 *
 * Selecting an input focuses it in Chrome, so an unconditional deferred select()
 * could pull focus back from a box the user has moved to; two such boxes focused
 * within one tick then kept stealing focus from each other forever.
 */
export function selectIfStillFocused(el) {
    setTimeout(() => {
        if (el && el.ownerDocument && el.ownerDocument.activeElement === el) el.select();
    }, 0);
}

/**
 * Focuses and selects a newly added line's box, unless the user is already
 * typing in another box of the table (their focus wins).
 */
export function focusNewLineInput(el) {
    if (!el || !el.ownerDocument) return;
    const active = el.ownerDocument.activeElement;
    if (active && active !== el && active.tagName === 'INPUT' && active.closest && active.closest('tbody')) return;
    el.select();
}
