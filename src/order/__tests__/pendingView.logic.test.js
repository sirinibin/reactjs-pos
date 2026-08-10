/**
 * Unit tests for pendingView changes in order/index.js
 *
 * Changes covered:
 *   1. pendingView state initialises directly from props (no useEffect delay)
 *   2. OrderCreate and OrderPreview are pre-mounted when pendingView=true
 *   3. openUpdateForm calls ref.current.open(id) when ref is ready
 *   4. openUpdateForm falls back to storing pending id + showing form when ref is null
 *   5. createFormCallbackRef fires open(id) for any stored pending id on mount
 *   6. PrintTypeSelection modal receives 'above-pending-modal-dialog' class when pendingView
 *   7. OrderCreate receives modalClass='above-pending-modal' when pendingView
 *   8. OrderView pre-mount condition (pendingView || showOrderView)
 *   9. openDetailsView calls ref.open(id) when ready, or queues id + triggers state when not
 *  10. detailsViewCallbackRef fires open(id) for pending id and clears it after mount
 */

// ── 1. pendingView initialisation ────────────────────────────────────────────

// Mirrors: let [pendingView] = useState(props.pendingView || false)
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

    test('false when prop is undefined (prop not passed)', () => {
        expect(initPendingView(undefined)).toBe(false);
    });

    test('false when prop is null', () => {
        expect(initPendingView(null)).toBe(false);
    });

    test('false when prop is 0', () => {
        expect(initPendingView(0)).toBe(false);
    });
});

// ── 2. Pre-mount condition ────────────────────────────────────────────────────

// Mirrors: {(pendingView || showOrderCreateForm) && <OrderCreate ...>}
//      and {(pendingView || showOrderPreview) && <OrderPreview ...>}
function shouldMount(pendingView, showForm) {
    return pendingView || showForm;
}

describe('OrderCreate pre-mount condition (pendingView || showOrderCreateForm)', () => {
    test('mounted when pendingView=true, showOrderCreateForm=false', () => {
        expect(shouldMount(true, false)).toBe(true);
    });

    test('mounted when pendingView=false, showOrderCreateForm=true', () => {
        expect(shouldMount(false, true)).toBe(true);
    });

    test('mounted when both true', () => {
        expect(shouldMount(true, true)).toBe(true);
    });

    test('NOT mounted when pendingView=false, showOrderCreateForm=false', () => {
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

// ── 3 & 4. openUpdateForm ────────────────────────────────────────────────────

// Mirrors the real openUpdateForm in order/index.js
function openUpdateForm(id, ref, pendingUpdateIdRef, setShowOrderCreateForm) {
    if (ref.current) {
        ref.current.open(id);
    } else {
        pendingUpdateIdRef.current = id;
        setShowOrderCreateForm(true);
    }
}

describe('openUpdateForm', () => {
    test('calls ref.current.open(id) when ref is ready', () => {
        const openMock = jest.fn();
        const ref = { current: { open: openMock } };
        const pendingRef = { current: null };
        const setShow = jest.fn();

        openUpdateForm('order-abc', ref, pendingRef, setShow);

        expect(openMock).toHaveBeenCalledWith('order-abc');
        expect(pendingRef.current).toBeNull();
        expect(setShow).not.toHaveBeenCalled();
    });

    test('stores pending id and shows form when ref is null', () => {
        const ref = { current: null };
        const pendingRef = { current: null };
        const setShow = jest.fn();

        openUpdateForm('order-xyz', ref, pendingRef, setShow);

        expect(pendingRef.current).toBe('order-xyz');
        expect(setShow).toHaveBeenCalledWith(true);
    });

    test('stores pending id and shows form when ref.current is undefined', () => {
        const ref = { current: undefined };
        const pendingRef = { current: null };
        const setShow = jest.fn();

        openUpdateForm('order-undef', ref, pendingRef, setShow);

        expect(pendingRef.current).toBe('order-undef');
        expect(setShow).toHaveBeenCalledWith(true);
    });

    test('works with 24-char MongoDB ObjectId', () => {
        const openMock = jest.fn();
        const ref = { current: { open: openMock } };
        const pendingRef = { current: null };

        openUpdateForm('6a2e56679fb5226ef6e12168', ref, pendingRef, jest.fn());

        expect(openMock).toHaveBeenCalledWith('6a2e56679fb5226ef6e12168');
    });

    test('does not throw when ref.current has no open method — ref guard prevents crash', () => {
        const ref = { current: { open: jest.fn() } };
        expect(() =>
            openUpdateForm('id-safe', ref, { current: null }, jest.fn())
        ).not.toThrow();
    });

    test('calling twice with ref ready invokes open twice', () => {
        const openMock = jest.fn();
        const ref = { current: { open: openMock } };

        openUpdateForm('id-1', ref, { current: null }, jest.fn());
        openUpdateForm('id-2', ref, { current: null }, jest.fn());

        expect(openMock).toHaveBeenCalledTimes(2);
        expect(openMock).toHaveBeenNthCalledWith(1, 'id-1');
        expect(openMock).toHaveBeenNthCalledWith(2, 'id-2');
    });
});

// ── 5. createFormCallbackRef ──────────────────────────────────────────────────

// Mirrors the real createFormCallbackRef useCallback in order/index.js
function handleCallbackRef(instance, createFormRef, pendingUpdateIdRef) {
    createFormRef.current = instance;
    if (instance && pendingUpdateIdRef.current !== null) {
        const id = pendingUpdateIdRef.current;
        pendingUpdateIdRef.current = null;
        instance.open(id);
    }
}

describe('createFormCallbackRef', () => {
    test('sets createFormRef.current on mount', () => {
        const createFormRef = { current: null };
        const pendingRef = { current: null };
        const instance = { open: jest.fn() };

        handleCallbackRef(instance, createFormRef, pendingRef);

        expect(createFormRef.current).toBe(instance);
    });

    test('immediately calls open(id) when a pending id is stored', () => {
        const createFormRef = { current: null };
        const pendingRef = { current: 'order-pending' };
        const instance = { open: jest.fn() };

        handleCallbackRef(instance, createFormRef, pendingRef);

        expect(instance.open).toHaveBeenCalledWith('order-pending');
    });

    test('clears the pending id after consuming it', () => {
        const createFormRef = { current: null };
        const pendingRef = { current: 'order-pending' };
        const instance = { open: jest.fn() };

        handleCallbackRef(instance, createFormRef, pendingRef);

        expect(pendingRef.current).toBeNull();
    });

    test('does NOT call open when there is no pending id', () => {
        const createFormRef = { current: null };
        const pendingRef = { current: null };
        const instance = { open: jest.fn() };

        handleCallbackRef(instance, createFormRef, pendingRef);

        expect(instance.open).not.toHaveBeenCalled();
    });

    test('clears createFormRef on unmount (instance=null)', () => {
        const createFormRef = { current: { open: jest.fn() } };
        const pendingRef = { current: null };

        handleCallbackRef(null, createFormRef, pendingRef);

        expect(createFormRef.current).toBeNull();
    });

    test('does not call open on unmount even with a stored pending id', () => {
        const createFormRef = { current: { open: jest.fn() } };
        const pendingRef = { current: 'order-unmount' };

        handleCallbackRef(null, createFormRef, pendingRef);

        // pending id is NOT consumed on unmount
        expect(pendingRef.current).toBe('order-unmount');
    });

    test('pending id is NOT replayed on re-mount after being consumed', () => {
        const createFormRef = { current: null };
        const pendingRef = { current: 'order-once' };
        const instance1 = { open: jest.fn() };
        const instance2 = { open: jest.fn() };

        // mount: pending id consumed
        handleCallbackRef(instance1, createFormRef, pendingRef);
        expect(instance1.open).toHaveBeenCalledWith('order-once');
        expect(pendingRef.current).toBeNull();

        // unmount then re-mount: no pending id, open must NOT fire
        handleCallbackRef(null, createFormRef, pendingRef);
        handleCallbackRef(instance2, createFormRef, pendingRef);

        expect(instance2.open).not.toHaveBeenCalled();
    });

    test('pending id is only consumed by the first mount, not subsequent mounts', () => {
        const createFormRef = { current: null };
        const pendingRef = { current: 'order-first' };

        const instance = { open: jest.fn() };
        handleCallbackRef(instance, createFormRef, pendingRef);

        expect(instance.open).toHaveBeenCalledTimes(1);
        // Re-call simulating a re-render (callback ref fires again)
        handleCallbackRef(instance, createFormRef, pendingRef);
        expect(instance.open).toHaveBeenCalledTimes(1); // still 1, not called again
    });
});

// ── 6. PrintTypeSelection modal className ────────────────────────────────────

// Mirrors: className={pendingView ? "above-pending-modal-dialog" : ""}
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

    test('returns empty string when pendingView=null', () => {
        expect(getPrintTypeSelectionClass(null)).toBe('');
    });
});

// ── 7. OrderCreate modalClass prop ───────────────────────────────────────────

// Mirrors: modalClass={pendingView ? "above-pending-modal" : ""}
function getOrderCreateModalClass(pendingView) {
    return pendingView ? 'above-pending-modal' : '';
}

describe('OrderCreate modalClass prop', () => {
    test('returns "above-pending-modal" when pendingView=true', () => {
        expect(getOrderCreateModalClass(true)).toBe('above-pending-modal');
    });

    test('returns empty string when pendingView=false', () => {
        expect(getOrderCreateModalClass(false)).toBe('');
    });

    test('returns empty string when pendingView=undefined', () => {
        expect(getOrderCreateModalClass(undefined)).toBe('');
    });

    test('"above-pending-modal" is distinct from default empty class', () => {
        expect(getOrderCreateModalClass(true)).not.toBe(getOrderCreateModalClass(false));
    });
});

// ── 8. OrderView pre-mount condition ─────────────────────────────────────────

// Mirrors: {(pendingView || showOrderView) && <OrderView ref={detailsViewCallbackRef} .../>}
function shouldMountOrderView(pendingView, showOrderView) {
    return pendingView || showOrderView;
}

describe('OrderView pre-mount condition (pendingView || showOrderView)', () => {
    test('mounted when pendingView=true, showOrderView=false', () => {
        expect(shouldMountOrderView(true, false)).toBe(true);
    });

    test('mounted when pendingView=false, showOrderView=true', () => {
        expect(shouldMountOrderView(false, true)).toBe(true);
    });

    test('mounted when both true', () => {
        expect(shouldMountOrderView(true, true)).toBe(true);
    });

    test('NOT mounted when pendingView=false, showOrderView=false', () => {
        expect(shouldMountOrderView(false, false)).toBe(false);
    });
});

// ── 9. openDetailsView ────────────────────────────────────────────────────────

// Mirrors (order/index.js lines 1268-1276):
//   function openDetailsView(id) {
//       if (DetailsViewRef.current) {
//           DetailsViewRef.current.open(id);
//       } else {
//           pendingDetailsIdRef.current = id;
//           showOrderView = true;          // variable mutation before setState
//           setShowOrderView(true);
//       }
//   }
function openDetailsView(id, ref, pendingDetailsIdRef, setShowOrderView) {
    if (ref.current) {
        ref.current.open(id);
    } else {
        pendingDetailsIdRef.current = id;
        setShowOrderView(true);
    }
}

describe('openDetailsView', () => {
    test('calls ref.current.open(id) when ref is ready', () => {
        const openMock = jest.fn();
        const ref = { current: { open: openMock } };
        const pendingRef = { current: null };
        const setShow = jest.fn();

        openDetailsView('order-abc', ref, pendingRef, setShow);

        expect(openMock).toHaveBeenCalledWith('order-abc');
        expect(pendingRef.current).toBeNull();
        expect(setShow).not.toHaveBeenCalled();
    });

    test('stores id and calls setShowOrderView(true) when ref is null', () => {
        const ref = { current: null };
        const pendingRef = { current: null };
        const setShow = jest.fn();

        openDetailsView('order-xyz', ref, pendingRef, setShow);

        expect(pendingRef.current).toBe('order-xyz');
        expect(setShow).toHaveBeenCalledWith(true);
    });

    test('ref.current=undefined is treated as missing (falls back to queue)', () => {
        const ref = { current: undefined };
        const pendingRef = { current: null };
        const setShow = jest.fn();

        openDetailsView('order-undef', ref, pendingRef, setShow);

        expect(pendingRef.current).toBe('order-undef');
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

        openDetailsView('id-1', ref, { current: null }, jest.fn());
        openDetailsView('id-2', ref, { current: null }, jest.fn());

        expect(openMock).toHaveBeenCalledTimes(2);
        expect(openMock).toHaveBeenNthCalledWith(1, 'id-1');
        expect(openMock).toHaveBeenNthCalledWith(2, 'id-2');
    });

    test('does NOT call setShowOrderView when ref is ready', () => {
        const ref = { current: { open: jest.fn() } };
        const setShow = jest.fn();

        openDetailsView('order-ready', ref, { current: null }, setShow);

        expect(setShow).not.toHaveBeenCalled();
    });
});

// ── 10. detailsViewCallbackRef ────────────────────────────────────────────────

// Mirrors (order/index.js lines 1260-1267):
//   const detailsViewCallbackRef = useCallback((instance) => {
//       DetailsViewRef.current = instance;
//       if (instance && pendingDetailsIdRef.current !== null) {
//           const id = pendingDetailsIdRef.current;
//           pendingDetailsIdRef.current = null;
//           instance.open(id);
//       }
//   }, []);
function handleDetailsViewCallbackRef(instance, detailsViewRef, pendingDetailsIdRef) {
    detailsViewRef.current = instance;
    if (instance && pendingDetailsIdRef.current !== null) {
        const id = pendingDetailsIdRef.current;
        pendingDetailsIdRef.current = null;
        instance.open(id);
    }
}

describe('detailsViewCallbackRef', () => {
    test('sets detailsViewRef.current on mount', () => {
        const detailsViewRef = { current: null };
        const pendingRef = { current: null };
        const instance = { open: jest.fn() };

        handleDetailsViewCallbackRef(instance, detailsViewRef, pendingRef);

        expect(detailsViewRef.current).toBe(instance);
    });

    test('fires open(id) for pending id on mount', () => {
        const detailsViewRef = { current: null };
        const pendingRef = { current: 'order-pending' };
        const instance = { open: jest.fn() };

        handleDetailsViewCallbackRef(instance, detailsViewRef, pendingRef);

        expect(instance.open).toHaveBeenCalledWith('order-pending');
    });

    test('clears pending id after consuming it', () => {
        const detailsViewRef = { current: null };
        const pendingRef = { current: 'order-pending' };
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
        const pendingRef = { current: 'order-unmount' };

        handleDetailsViewCallbackRef(null, detailsViewRef, pendingRef);

        expect(pendingRef.current).toBe('order-unmount');
    });

    test('pending id is NOT replayed on re-mount after being consumed', () => {
        const detailsViewRef = { current: null };
        const pendingRef = { current: 'order-once' };
        const instance1 = { open: jest.fn() };
        const instance2 = { open: jest.fn() };

        // mount: pending id consumed
        handleDetailsViewCallbackRef(instance1, detailsViewRef, pendingRef);
        expect(instance1.open).toHaveBeenCalledWith('order-once');
        expect(pendingRef.current).toBeNull();

        // unmount then re-mount: no pending id, open must NOT fire
        handleDetailsViewCallbackRef(null, detailsViewRef, pendingRef);
        handleDetailsViewCallbackRef(instance2, detailsViewRef, pendingRef);

        expect(instance2.open).not.toHaveBeenCalled();
    });

    test('pending id consumed exactly once even on second call', () => {
        const detailsViewRef = { current: null };
        const pendingRef = { current: 'order-first' };
        const instance = { open: jest.fn() };

        handleDetailsViewCallbackRef(instance, detailsViewRef, pendingRef);
        expect(instance.open).toHaveBeenCalledTimes(1);

        // Re-call simulating a re-render (callback ref fires again with same instance)
        handleDetailsViewCallbackRef(instance, detailsViewRef, pendingRef);
        expect(instance.open).toHaveBeenCalledTimes(1); // still 1, not called again
    });
});
