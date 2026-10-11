/**
 * order/index.js mounts the repair job card view on first use, not with every
 * sales list. Mounted eagerly it brought in the customer history modal and a
 * second sales form, which fetched the store and delivery-note reminders each
 * time a sales list mounted (every open of the customer pendings modal).
 */
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '../index.js'), 'utf8');

describe('order/index.js: job card view source', () => {
    test('RepairJobCardView renders only once showJobCardView is set', () => {
        expect(SRC).toMatch(/\{showJobCardView && <RepairJobCardView ref=\{jobCardViewCallbackRef\}/);
        expect(SRC).not.toMatch(/^\s*<RepairJobCardView /m);
    });

    test('the sales form opens job cards through openJobCard', () => {
        expect(SRC).toMatch(/openJobCard=\{\(jobId\) => openJobCard\(jobId, 1200\)\}/);
        expect(SRC).not.toMatch(/jobCardViewRef\.current\?\.open\(/);
    });
});

// Mirrors openJobCard and jobCardViewCallbackRef in order/index.js.
function makeOpener() {
    const state = { ref: null, pending: null, shown: false };
    const callbackRef = (instance) => {
        state.ref = instance;
        if (instance && state.pending) {
            const [jobId, zIdx] = state.pending;
            state.pending = null;
            instance.open(jobId, zIdx);
        }
    };
    const openJobCard = (jobId, zIdx) => {
        if (state.ref) state.ref.open(jobId, zIdx);
        else { state.pending = [jobId, zIdx]; state.shown = true; }
    };
    return { state, callbackRef, openJobCard };
}

describe('openJobCard', () => {
    test('first open mounts the view and opens the job once it is mounted', () => {
        const { state, callbackRef, openJobCard } = makeOpener();
        const open = jest.fn();
        openJobCard('job1', 1200);
        expect(state.shown).toBe(true);
        expect(open).not.toHaveBeenCalled();
        callbackRef({ open });
        expect(open).toHaveBeenCalledTimes(1);
        expect(open).toHaveBeenCalledWith('job1', 1200);
        expect(state.pending).toBeNull();
    });

    test('later opens go straight to the mounted view', () => {
        const { callbackRef, openJobCard } = makeOpener();
        const open = jest.fn();
        callbackRef({ open });
        openJobCard('job2', 1200);
        expect(open).toHaveBeenCalledWith('job2', 1200);
    });

    test('the last job asked for before mounting wins; nothing opens on unmount', () => {
        const { callbackRef, openJobCard } = makeOpener();
        const open = jest.fn();
        openJobCard('a', 1);
        openJobCard('b', 2);
        callbackRef(null);
        expect(open).not.toHaveBeenCalled();
        callbackRef({ open });
        expect(open).toHaveBeenCalledTimes(1);
        expect(open).toHaveBeenCalledWith('b', 2);
    });
});
