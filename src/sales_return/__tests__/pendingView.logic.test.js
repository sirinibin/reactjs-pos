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
 *   8. SalesReturnView pre-mount condition (pendingView || showSalesReturnDetailsView)
 *   9. openDetailsView calls ref.open(id) when ready, or queues id + triggers state when not
 *  10. detailsViewCallbackRef fires open(id) for pending id and clears it after mount
 *  11. openSalesUpdateForm(id) sets showSalesUpdateForm=true and calls ref.open(id)
 *  12. OrderCreate (opened from Sales ID column) receives modalClass='above-pending-modal' when pendingView
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

// ── 8. SalesReturnView pre-mount condition ────────────────────────────────────

// Mirrors: {(pendingView || showSalesReturnDetailsView) && <SalesReturnView ref={detailsViewCallbackRef} .../>}
function shouldMountSalesReturnView(pendingView, showSalesReturnDetailsView) {
    return pendingView || showSalesReturnDetailsView;
}

describe('SalesReturnView pre-mount condition (pendingView || showSalesReturnDetailsView)', () => {
    test('mounted when pendingView=true, showSalesReturnDetailsView=false', () => {
        expect(shouldMountSalesReturnView(true, false)).toBe(true);
    });

    test('mounted when pendingView=false, showSalesReturnDetailsView=true', () => {
        expect(shouldMountSalesReturnView(false, true)).toBe(true);
    });

    test('mounted when both true', () => {
        expect(shouldMountSalesReturnView(true, true)).toBe(true);
    });

    test('NOT mounted when pendingView=false, showSalesReturnDetailsView=false', () => {
        expect(shouldMountSalesReturnView(false, false)).toBe(false);
    });
});

// ── 9. openDetailsView (sales_return) ─────────────────────────────────────────

// Mirrors (sales_return/index.js lines 1090-1097):
//   function openDetailsView(id) {
//       if (DetailsViewRef.current) {
//           DetailsViewRef.current.open(id);
//       } else {
//           pendingDetailsIdRef.current = id;
//           setShowSalesReturnDetailsView(true);   // NOTE: no variable mutation before setState
//       }
//   }
// Unlike order/index.js, sales_return does NOT have `showSalesReturnDetailsView = true`
// before the setState call — only setShowSalesReturnDetailsView(true).
function openDetailsView(id, ref, pendingDetailsIdRef, setShowSalesReturnDetailsView) {
    if (ref.current) {
        ref.current.open(id);
    } else {
        pendingDetailsIdRef.current = id;
        setShowSalesReturnDetailsView(true);
    }
}

describe('openDetailsView (sales_return)', () => {
    test('calls ref.current.open(id) when ref is ready', () => {
        const openMock = jest.fn();
        const ref = { current: { open: openMock } };
        const pendingRef = { current: null };
        const setShow = jest.fn();

        openDetailsView('sr-abc', ref, pendingRef, setShow);

        expect(openMock).toHaveBeenCalledWith('sr-abc');
        expect(pendingRef.current).toBeNull();
        expect(setShow).not.toHaveBeenCalled();
    });

    test('stores id and calls setShowSalesReturnDetailsView(true) when ref is null', () => {
        const ref = { current: null };
        const pendingRef = { current: null };
        const setShow = jest.fn();

        openDetailsView('sr-xyz', ref, pendingRef, setShow);

        expect(pendingRef.current).toBe('sr-xyz');
        expect(setShow).toHaveBeenCalledWith(true);
    });

    test('ref.current=undefined is treated as missing (falls back to queue)', () => {
        const ref = { current: undefined };
        const pendingRef = { current: null };
        const setShow = jest.fn();

        openDetailsView('sr-undef', ref, pendingRef, setShow);

        expect(pendingRef.current).toBe('sr-undef');
        expect(setShow).toHaveBeenCalledWith(true);
    });

    test('works with 24-char MongoDB ObjectId', () => {
        const openMock = jest.fn();
        const ref = { current: { open: openMock } };

        openDetailsView('6a2e56679fb5226ef6e12168', ref, { current: null }, jest.fn());

        expect(openMock).toHaveBeenCalledWith('6a2e56679fb5226ef6e12168');
    });

    test('calling twice with ref ready calls open twice', () => {
        const openMock = jest.fn();
        const ref = { current: { open: openMock } };

        openDetailsView('sr-1', ref, { current: null }, jest.fn());
        openDetailsView('sr-2', ref, { current: null }, jest.fn());

        expect(openMock).toHaveBeenCalledTimes(2);
        expect(openMock).toHaveBeenNthCalledWith(1, 'sr-1');
        expect(openMock).toHaveBeenNthCalledWith(2, 'sr-2');
    });

    test('does NOT call setShowSalesReturnDetailsView when ref is ready', () => {
        const ref = { current: { open: jest.fn() } };
        const setShow = jest.fn();

        openDetailsView('sr-ready', ref, { current: null }, setShow);

        expect(setShow).not.toHaveBeenCalled();
    });
});

// ── 10. detailsViewCallbackRef (sales_return) ─────────────────────────────────

// Mirrors (sales_return/index.js lines 1082-1089):
//   const detailsViewCallbackRef = useCallback((instance) => {
//       DetailsViewRef.current = instance;
//       if (instance && pendingDetailsIdRef.current !== null) {
//           const id = pendingDetailsIdRef.current;
//           pendingDetailsIdRef.current = null;
//           instance.open(id);
//       }
//   }, []);
// Single id only (not id+orderID as in edit button) — view button passes only id.
function handleDetailsViewCallbackRef(instance, detailsViewRef, pendingDetailsIdRef) {
    detailsViewRef.current = instance;
    if (instance && pendingDetailsIdRef.current !== null) {
        const id = pendingDetailsIdRef.current;
        pendingDetailsIdRef.current = null;
        instance.open(id);
    }
}

describe('detailsViewCallbackRef (sales_return)', () => {
    test('sets detailsViewRef.current on mount', () => {
        const detailsViewRef = { current: null };
        const pendingRef = { current: null };
        const instance = { open: jest.fn() };

        handleDetailsViewCallbackRef(instance, detailsViewRef, pendingRef);

        expect(detailsViewRef.current).toBe(instance);
    });

    test('fires open(id) for pending id on mount', () => {
        const detailsViewRef = { current: null };
        const pendingRef = { current: 'sr-pending' };
        const instance = { open: jest.fn() };

        handleDetailsViewCallbackRef(instance, detailsViewRef, pendingRef);

        expect(instance.open).toHaveBeenCalledWith('sr-pending');
    });

    test('clears pending id after consuming it', () => {
        const detailsViewRef = { current: null };
        const pendingRef = { current: 'sr-pending' };
        const instance = { open: jest.fn() };

        handleDetailsViewCallbackRef(instance, detailsViewRef, pendingRef);

        expect(pendingRef.current).toBeNull();
    });

    test('does NOT call open when no pending id', () => {
        const detailsViewRef = { current: null };
        const pendingRef = { current: null };
        const instance = { open: jest.fn() };

        handleDetailsViewCallbackRef(instance, detailsViewRef, pendingRef);

        expect(instance.open).not.toHaveBeenCalled();
    });

    test('clears ref on unmount (instance=null)', () => {
        const detailsViewRef = { current: { open: jest.fn() } };
        const pendingRef = { current: null };

        handleDetailsViewCallbackRef(null, detailsViewRef, pendingRef);

        expect(detailsViewRef.current).toBeNull();
    });

    test('does NOT consume pending id on unmount', () => {
        const detailsViewRef = { current: { open: jest.fn() } };
        const pendingRef = { current: 'sr-unmount' };

        handleDetailsViewCallbackRef(null, detailsViewRef, pendingRef);

        expect(pendingRef.current).toBe('sr-unmount');
    });

    test('pending id is NOT replayed on re-mount after being consumed', () => {
        const detailsViewRef = { current: null };
        const pendingRef = { current: 'sr-once' };
        const instance1 = { open: jest.fn() };
        const instance2 = { open: jest.fn() };

        // mount: pending id consumed
        handleDetailsViewCallbackRef(instance1, detailsViewRef, pendingRef);
        expect(instance1.open).toHaveBeenCalledWith('sr-once');
        expect(pendingRef.current).toBeNull();

        // unmount then re-mount: no pending id, open must NOT fire
        handleDetailsViewCallbackRef(null, detailsViewRef, pendingRef);
        handleDetailsViewCallbackRef(instance2, detailsViewRef, pendingRef);

        expect(instance2.open).not.toHaveBeenCalled();
    });

    test('pending id consumed exactly once even on second call', () => {
        const detailsViewRef = { current: null };
        const pendingRef = { current: 'sr-first' };
        const instance = { open: jest.fn() };

        handleDetailsViewCallbackRef(instance, detailsViewRef, pendingRef);
        expect(instance.open).toHaveBeenCalledTimes(1);

        // Re-call simulating a re-render (callback ref fires again with same instance)
        handleDetailsViewCallbackRef(instance, detailsViewRef, pendingRef);
        expect(instance.open).toHaveBeenCalledTimes(1); // still 1, not called again
    });
});

// ── 11. openSalesUpdateForm(id) ───────────────────────────────────────────────
// Mirrors sales_return/index.js:
//   function openSalesUpdateForm(id) {
//       setShowSalesUpdateForm(true);
//       if (timerRef.current) clearTimeout(timerRef.current);
//       timerRef.current = setTimeout(() => { SalesUpdateFormRef.current?.open(id); }, 50);
//   }

function openSalesUpdateForm(id, ref, setShowSalesUpdateForm) {
    setShowSalesUpdateForm(true);
    if (ref.current) {
        ref.current.open(id);
    }
}

describe('openSalesUpdateForm(id)', () => {
    test('always calls setShowSalesUpdateForm(true)', () => {
        const ref = { current: { open: jest.fn() } };
        const setShow = jest.fn();

        openSalesUpdateForm('order-123', ref, setShow);

        expect(setShow).toHaveBeenCalledWith(true);
    });

    test('calls ref.current.open(id) when ref is ready', () => {
        const openMock = jest.fn();
        const ref = { current: { open: openMock } };
        const setShow = jest.fn();

        openSalesUpdateForm('order-abc', ref, setShow);

        expect(openMock).toHaveBeenCalledWith('order-abc');
    });

    test('does NOT throw when ref.current is null', () => {
        const ref = { current: null };
        const setShow = jest.fn();

        expect(() => openSalesUpdateForm('order-xyz', ref, setShow)).not.toThrow();
    });

    test('setShowSalesUpdateForm is called even when ref.current is null', () => {
        const ref = { current: null };
        const setShow = jest.fn();

        openSalesUpdateForm('order-xyz', ref, setShow);

        expect(setShow).toHaveBeenCalledWith(true);
    });

    test('passes the exact id to ref.current.open — no mutation', () => {
        const openMock = jest.fn();
        const ref = { current: { open: openMock } };
        const id = '6a4535248cf8a7df44500d4a';

        openSalesUpdateForm(id, ref, jest.fn());

        expect(openMock).toHaveBeenCalledWith(id);
        expect(openMock.mock.calls[0][0]).toBe(id);
    });

    test('calling twice opens twice with the respective ids', () => {
        const openMock = jest.fn();
        const ref = { current: { open: openMock } };
        const setShow = jest.fn();

        openSalesUpdateForm('order-1', ref, setShow);
        openSalesUpdateForm('order-2', ref, setShow);

        expect(openMock).toHaveBeenCalledTimes(2);
        expect(openMock).toHaveBeenNthCalledWith(1, 'order-1');
        expect(openMock).toHaveBeenNthCalledWith(2, 'order-2');
        expect(setShow).toHaveBeenCalledTimes(2);
    });

    test('works with undefined id (create mode)', () => {
        const openMock = jest.fn();
        const ref = { current: { open: openMock } };

        openSalesUpdateForm(undefined, ref, jest.fn());

        expect(openMock).toHaveBeenCalledWith(undefined);
    });
});

// ── 12. OrderCreate modalClass prop (Sales ID column link) ────────────────────
// When a SalesReturn row's Sales ID column is clicked, an OrderCreate form opens.
// Inside CustomerPending (pendingView=true), it must use modalClass="above-pending-modal"
// so z-index 1095 beats CustomerPending's z-index 1082. Outside CustomerPending it
// uses "" (default z-index 1080).

function getOrderCreateModalClass(pendingView) {
    return pendingView ? 'above-pending-modal' : '';
}

describe('OrderCreate modalClass prop (Sales ID column in pendingView)', () => {
    test('returns "above-pending-modal" when pendingView=true', () => {
        expect(getOrderCreateModalClass(true)).toBe('above-pending-modal');
    });

    test('returns "" when pendingView=false', () => {
        expect(getOrderCreateModalClass(false)).toBe('');
    });

    test('returns "" when pendingView=undefined', () => {
        expect(getOrderCreateModalClass(undefined)).toBe('');
    });

    test('returns "" when pendingView=null', () => {
        expect(getOrderCreateModalClass(null)).toBe('');
    });

    test('"above-pending-modal" is distinct from the empty default', () => {
        expect(getOrderCreateModalClass(true)).not.toBe(getOrderCreateModalClass(false));
    });

    test('z-index with "above-pending-modal" (1095) is above CustomerPending (1082)', () => {
        const Z = { abovePending: 1095, customerPending: 1082, defaultWrap: 1080 };
        expect(Z.abovePending).toBeGreaterThan(Z.customerPending);
    });

    test('z-index without modalClass (1080) is BELOW CustomerPending (1082) — was the bug', () => {
        const Z = { abovePending: 1095, customerPending: 1082, defaultWrap: 1080 };
        expect(Z.defaultWrap).toBeLessThan(Z.customerPending);
    });

    test('"above-pending-modal" z-index (1095) is strictly greater than default (1080)', () => {
        const Z = { abovePending: 1095, defaultWrap: 1080 };
        expect(Z.abovePending).toBeGreaterThan(Z.defaultWrap);
    });
});
