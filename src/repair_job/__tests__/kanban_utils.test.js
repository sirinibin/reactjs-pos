import {
    loadKanbanLists,
    loadCardMap,
    saveCardMap,
    statusToDefaultListId,
} from '../kanban_utils';

const LISTS_KEY = 'repair_job_kanban_lists';
const CARD_MAP_KEY = 'repair_job_kanban_card_map';

const DEFAULT_LISTS = [
    { id: 'todo', name: 'ToDo', color: '#0052cc' },
    { id: 'in_progress', name: 'In Progress', color: '#ff8b00' },
    { id: 'done', name: 'DONE', color: '#00875a' },
];

beforeEach(() => {
    localStorage.clear();
});

// ---------------------------------------------------------------------------
// loadKanbanLists
// ---------------------------------------------------------------------------

describe('loadKanbanLists()', () => {
    test('1. returns default list structure when localStorage is empty', () => {
        const result = loadKanbanLists();
        expect(result).toEqual(DEFAULT_LISTS);
    });

    test('2. returns saved lists when localStorage has valid JSON', () => {
        const custom = [{ id: 'custom', name: 'Custom', color: '#123456' }];
        localStorage.setItem(LISTS_KEY, JSON.stringify(custom));
        const result = loadKanbanLists();
        expect(result).toEqual(custom);
    });

    test('3. returns defaults when localStorage has invalid JSON', () => {
        localStorage.setItem(LISTS_KEY, 'not-valid-json{{{');
        const result = loadKanbanLists();
        expect(result).toEqual(DEFAULT_LISTS);
    });

    test('15. returns an array (not null)', () => {
        const result = loadKanbanLists();
        expect(Array.isArray(result)).toBe(true);
        expect(result).not.toBeNull();
    });
});

// ---------------------------------------------------------------------------
// loadCardMap
// ---------------------------------------------------------------------------

describe('loadCardMap()', () => {
    test('4. returns empty object when localStorage is empty', () => {
        const result = loadCardMap();
        expect(result).toEqual({});
    });

    test('5. returns saved map when localStorage has valid JSON', () => {
        const map = { 'job-1': 'in_progress', 'job-2': 'done' };
        localStorage.setItem(CARD_MAP_KEY, JSON.stringify(map));
        const result = loadCardMap();
        expect(result).toEqual(map);
    });

    test('6. returns empty object when localStorage has invalid JSON', () => {
        localStorage.setItem(CARD_MAP_KEY, '}}bad json{{');
        const result = loadCardMap();
        expect(result).toEqual({});
    });
});

// ---------------------------------------------------------------------------
// saveCardMap
// ---------------------------------------------------------------------------

describe('saveCardMap(map)', () => {
    test('7. stores map in localStorage as JSON', () => {
        const map = { 'job-10': 'todo', 'job-20': 'done' };
        saveCardMap(map);
        const raw = localStorage.getItem(CARD_MAP_KEY);
        expect(JSON.parse(raw)).toEqual(map);
    });

    test('8. stores empty object', () => {
        saveCardMap({});
        const raw = localStorage.getItem(CARD_MAP_KEY);
        expect(JSON.parse(raw)).toEqual({});
    });

    test('9. roundtrip: after saveCardMap(map), loadCardMap() returns the same map', () => {
        const map = { 'job-abc': 'in_progress', 'job-xyz': 'todo' };
        saveCardMap(map);
        const result = loadCardMap();
        expect(result).toEqual(map);
    });
});

// ---------------------------------------------------------------------------
// statusToDefaultListId
// ---------------------------------------------------------------------------

describe('statusToDefaultListId(status)', () => {
    test('10. "pending" returns "todo" (default/fallback)', () => {
        expect(statusToDefaultListId('pending')).toBe('todo');
    });

    test('11. "in_progress" returns "in_progress"', () => {
        expect(statusToDefaultListId('in_progress')).toBe('in_progress');
    });

    test('12. "completed" returns "done"', () => {
        expect(statusToDefaultListId('completed')).toBe('done');
    });

    test('12b. "delivered" also returns "done"', () => {
        expect(statusToDefaultListId('delivered')).toBe('done');
    });

    test('13. unknown status returns fallback "todo"', () => {
        expect(statusToDefaultListId('unknown_status')).toBe('todo');
    });

    test('14. null does not crash and returns fallback "todo"', () => {
        expect(() => statusToDefaultListId(null)).not.toThrow();
        expect(statusToDefaultListId(null)).toBe('todo');
    });
});
