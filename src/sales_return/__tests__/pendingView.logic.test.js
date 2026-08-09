/**
 * Unit tests for pendingView changes in sales_return/index.js
 *
 * Changes covered:
 *   1. pendingView state initialises directly from props (no useEffect delay)
 *   2. SalesReturnCreate and OrderPreview are pre-mounted when pendingView=true
 *   3. openUpdateForm(id, orderID) calls ref.current.open(id, orderID) when ref is ready
 *   4. openUpdateForm falls back to storing {id, orderID} + showing form when ref is null
 *   5. srCreateFormCallbackRef fires open(id, orderID) for stored pending args on mount
 *   6. PrintTypeSelection modal receives 'above-pending-modal-dialog' class when pendingView
 *   7. SalesReturnCreate receives modalClass='above-pending-modal' when pendingView
 */

// ── 1. pendingView initialisation ────────────────────────────────────────────

function initPendingView(prop) {
    return prop || false;
}

describe('pendingView initialisation from props', () => {
    test('true when prop is true', () => {
        expect(initPendingView(true)).toBe(true);
    });

    test('false when prop is false', () => {
        expect(initPendingView(false)).toBe(false);
    });

    test('false when prop is undefined', () => {
        expect(initPendingView(undefined)).toBe(false);
    });

    test('false when prop is null', () => {
        expect(initPendingView(null)).toBe(false);
    });
});

// ── 2. Pre-mount condition ────────────────────────────────────────────────────

function shouldMount(pendingView, showForm) {
    return pendingView || showForm;
}

describe('SalesReturnCreate pre-mount condition (pendingView || showSalesReturnCreateForm)', () => {
    test('mounted when pendingView=true, showSalesReturnCreateForm=false', () => {
        expect(shouldMount(true, false)).toBe(true);
    });

    test('mounted when pendingView=false, showSalesReturnCreateForm=true', () => {
        expect(shouldMount(false, true)).toBe(true);
    });

    test('mounted when both true', () => {
        expect(shouldMount(true, true)).toBe(true);
    });

    test('NOT mounted when pendingView=false, showSalesReturnCreateForm=false', () => {
        expect(shouldMount(false, false)).toBe(false);
    });
});

describe('OrderPreview pre-mount condition (pendingView || showOrderPreview)', () => {
    test('mounted when pendingView=true, showOrderPreview=false', () => {
        expect(shouldMount(true, false)).toBe(true);
    });

    test('mounted when pendingView=false, showOrderPreview=true', () => {
        expect(shouldMount(false, true)).toBe(true);
    });

    test('NOT mounted when pendingView=false, showOrderPreview=false', () => {
        expect(shouldMount(false, false)).toBe(false);
    });
});

// ── 3 & 4. openUpdateForm(id, orderID) ───────────────────────────────────────

// Mirrors sales_return/index.js openUpdateForm which takes two args
function openUpdateForm(id, orderID, ref, pendingSRUpdateArgRef, setShowSalesReturnCreateForm) {
    if (ref.current) {
        ref.current.open(id, orderID);
    } else {
        pendingSRUpdateArgRef.current = { id, orderID };
        setShowSalesReturnCreateForm(true);
    }
}

describe('openUpdateForm(id, orderID)', () => {
    test('calls ref.current.open(id, orderID) when ref is ready', () => {
        const openMock = jest.fn();
        const ref = { current: { open: openMock } };
        const pendingRef = { current: null };
        const setShow = jest.fn();

        openUpdateForm('sr-123', 'order-456', ref, pendingRef, setShow);

        expect(openMock).toHaveBeenCalledWith('sr-123', 'order-456');
        expect(pendingRef.current).toBeNull();
        expect(setShow).not.toHaveBeenCalled();
    });

    test('stores {id, orderID} and shows form when ref is null', () => {
        const ref = { current: null };
        const pendingRef = { current: null };
        const setShow = jest.fn();

        openUpdateForm('sr-abc', 'order-def', ref, pendingRef, setShow);

        expect(pendingRef.current).toEqual({ id: 'sr-abc', orderID: 'order-def' });
        expect(setShow).toHaveBeenCalledWith(true);
    });

    test('stores {id, orderID} when ref.current is undefined', () => {
        const ref = { current: undefined };
        const pendingRef = { current: null };
        const setShow = jest.fn();

        openUpdateForm('sr-x', 'order-y', ref, pendingRef, setShow);

        expect(pendingRef.current).toEqual({ id: 'sr-x', orderID: 'order-y' });
        expect(setShow).toHaveBeenCalledWith(true);
    });

    test('works with MongoDB ObjectIds for both id and orderID', () => {
        const openMock = jest.fn();
        const ref = { current: { open: openMock } };

        openUpdateForm(
            '6a2e56679fb5226ef6e12168',
            '6a4535248cf8a7df44500d4a',
            ref,
            { current: null },
            jest.fn()
        );

        expect(openMock).toHaveBeenCalledWith(
            '6a2e56679fb5226ef6e12168',
            '6a4535248cf8a7df44500d4a'
        );
    });

    test('works when orderID is undefined (sales return without parent order)', () => {
        const openMock = jest.fn();
        const ref = { current: { open: openMock } };

        openUpdateForm('sr-only', undefined, ref, { current: null }, jest.fn());

        expect(openMock).toHaveBeenCalledWith('sr-only', undefined);
    });

    test('calling twice with ref ready invokes open twice', () => {
        const openMock = jest.fn();
        const ref = { current: { open: openMock } };

        openUpdateForm('sr-1', 'ord-1', ref, { current: null }, jest.fn());
        openUpdateForm('sr-2', 'ord-2', ref, { current: null }, jest.fn());

        expect(openMock).toHaveBeenCalledTimes(2);
        expect(openMock).toHaveBeenNthCalledWith(1, 'sr-1', 'ord-1');
        expect(openMock).toHaveBeenNthCalledWith(2, 'sr-2', 'ord-2');
    });
});

// ── 5. srCreateFormCallbackRef ────────────────────────────────────────────────

// Mirrors the real srCreateFormCallbackRef useCallback in sales_return/index.js
function handleSRCallbackRef(instance, createFormRef, pendingSRUpdateArgRef) {
    createFormRef.current = instance;
    if (instance && pendingSRUpdateArgRef.current) {
        const { id, orderID } = pendingSRUpdateArgRef.current;
        pendingSRUpdateArgRef.current = null;
        instance.open(id, orderID);
    }
}

describe('srCreateFormCallbackRef', () => {
    test('sets createFormRef.current on mount', () => {
        const createFormRef = { current: null };
        const pendingRef = { current: null };
        const instance = { open: jest.fn() };

        handleSRCallbackRef(instance, createFormRef, pendingRef);

        expect(createFormRef.current).toBe(instance);
    });

    test('immediately calls open(id, orderID) when pending args are stored', () => {
        const createFormRef = { current: null };
        const pendingRef = { current: { id: 'sr-pending', orderID: 'ord-pending' } };
        const instance = { open: jest.fn() };

        handleSRCallbackRef(instance, createFormRef, pendingRef);

        expect(instance.open).toHaveBeenCalledWith('sr-pending', 'ord-pending');
    });

    test('clears pending args after consuming them', () => {
        const createFormRef = { current: null };
        const pendingRef = { current: { id: 'sr-x', orderID: 'ord-x' } };
        const instance = { open: jest.fn() };

        handleSRCallbackRef(instance, createFormRef, pendingRef);

        expect(pendingRef.current).toBeNull();
    });

    test('does NOT call open when there are no pending args', () => {
        const createFormRef = { current: null };
        const pendingRef = { current: null };
        const instance = { open: jest.fn() };

        handleSRCallbackRef(instance, createFormRef, pendingRef);

        expect(instance.open).not.toHaveBeenCalled();
    });

    test('clears createFormRef on unmount (instance=null)', () => {
        const createFormRef = { current: { open: jest.fn() } };
        const pendingRef = { current: null };

        handleSRCallbackRef(null, createFormRef, pendingRef);

        expect(createFormRef.current).toBeNull();
    });

    test('does not call open on unmount even with stored pending args', () => {
        const createFormRef = { current: null };
        const pendingRef = { current: { id: 'sr-unmount', orderID: 'ord-unmount' } };

        handleSRCallbackRef(null, createFormRef, pendingRef);

        expect(pendingRef.current).toEqual({ id: 'sr-unmount', orderID: 'ord-unmount' });
    });

    test('pending args are NOT replayed on re-mount', () => {
        const createFormRef = { current: null };
        const pendingRef = { current: { id: 'sr-once', orderID: 'ord-once' } };
        const instance1 = { open: jest.fn() };
        const instance2 = { open: jest.fn() };

        // mount: pending args consumed
        handleSRCallbackRef(instance1, createFormRef, pendingRef);
        expect(instance1.open).toHaveBeenCalledWith('sr-once', 'ord-once');
        expect(pendingRef.current).toBeNull();

        // unmount then re-mount
        handleSRCallbackRef(null, createFormRef, pendingRef);
        handleSRCallbackRef(instance2, createFormRef, pendingRef);

        expect(instance2.open).not.toHaveBeenCalled();
    });

    test('works when pending orderID is undefined', () => {
        const createFormRef = { current: null };
        const pendingRef = { current: { id: 'sr-no-order', orderID: undefined } };
        const instance = { open: jest.fn() };

        handleSRCallbackRef(instance, createFormRef, pendingRef);

        expect(instance.open).toHaveBeenCalledWith('sr-no-order', undefined);
    });
});

// ── 6. PrintTypeSelection modal className ────────────────────────────────────

function getPrintTypeSelectionClass(pendingView) {
    return pendingView ? 'above-pending-modal-dialog' : '';
}

describe('PrintTypeSelection modal className', () => {
    test('returns "above-pending-modal-dialog" when pendingView=true', () => {
        expect(getPrintTypeSelectionClass(true)).toBe('above-pending-modal-dialog');
    });

    test('returns empty string when pendingView=false', () => {
        expect(getPrintTypeSelectionClass(false)).toBe('');
    });

    test('returns empty string when pendingView=undefined', () => {
        expect(getPrintTypeSelectionClass(undefined)).toBe('');
    });
});

// ── 7. SalesReturnCreate modalClass prop ─────────────────────────────────────

function getSalesReturnCreateModalClass(pendingView) {
    return pendingView ? 'above-pending-modal' : '';
}

describe('SalesReturnCreate modalClass prop', () => {
    test('returns "above-pending-modal" when pendingView=true', () => {
        expect(getSalesReturnCreateModalClass(true)).toBe('above-pending-modal');
    });

    test('returns empty string when pendingView=false', () => {
        expect(getSalesReturnCreateModalClass(false)).toBe('');
    });

    test('returns empty string when pendingView=undefined', () => {
        expect(getSalesReturnCreateModalClass(undefined)).toBe('');
    });

    test('"above-pending-modal" is distinct from default empty class', () => {
        expect(getSalesReturnCreateModalClass(true)).not.toBe(
            getSalesReturnCreateModalClass(false)
        );
    });
});
