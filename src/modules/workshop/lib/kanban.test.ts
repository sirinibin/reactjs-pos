import { describe, expect, it } from 'vitest';
import {
  addList, BOARD_KEYS, columnOf, DEFAULT_LISTS, deleteList, groupJobs, initials, isDueToday, isOverdue, loadBoard, moveCard, renameList, reorderLists,
  saveBoard, stageProgress, statusLabel, statusToListId, statusWriteFor, type BoardState,
} from './kanban';

const empty = (): BoardState => ({ lists: DEFAULT_LISTS, cardMap: {}, cardOrder: {} });

describe('kanban storage', () => {
  it('falls back to default lists and survives corrupt storage', () => {
    localStorage.setItem(BOARD_KEYS.lists, '{not json');
    expect(loadBoard()).toEqual(empty());
  });
  it('round-trips through the legacy localStorage keys', () => {
    const s: BoardState = { lists: [...DEFAULT_LISTS, { id: 'list_1', name: 'QC', color: '#5e6c84' }], cardMap: { a: 'list_1' }, cardOrder: { list_1: ['a'] } };
    saveBoard(s);
    expect(JSON.parse(localStorage.getItem('repair_job_kanban_card_map')!)).toEqual({ a: 'list_1' });
    expect(loadBoard()).toEqual(s);
  });
});

describe('column placement', () => {
  it('maps statuses like the legacy board', () => {
    expect(statusToListId('in_progress', DEFAULT_LISTS)).toBe('in_progress');
    expect(statusToListId('completed', DEFAULT_LISTS)).toBe('done');
    expect(statusToListId('delivered', DEFAULT_LISTS)).toBe('done');
    expect(statusToListId('closed', DEFAULT_LISTS)).toBe('todo');
    expect(statusToListId('open', DEFAULT_LISTS)).toBe('todo');
    expect(statusToListId(undefined, DEFAULT_LISTS)).toBe('todo');
  });
  it('uses a list id written as status, and falls back to the first list when the target list was deleted', () => {
    expect(statusToListId('done', DEFAULT_LISTS)).toBe('done');
    const lists = [{ id: 'list_9', name: 'X', color: '#000' }];
    expect(statusToListId('in_progress', lists)).toBe('list_9');
  });
  it('card map wins over status unless it points at a deleted list', () => {
    const s = { ...empty(), cardMap: { j1: 'done', j2: 'gone' } };
    expect(columnOf({ id: 'j1', status: 'open' }, s)).toBe('done');
    expect(columnOf({ id: 'j2', status: 'in_progress' }, s)).toBe('in_progress');
  });
  it('groups and orders by cardOrder, unknown cards keep incoming order after known ones', () => {
    const s = { ...empty(), cardOrder: { todo: ['c', 'a'] } };
    const g = groupJobs([{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd', status: 'in_progress' }, { id: 'e' }], s);
    expect(g.todo.map((j) => j.id)).toEqual(['c', 'a', 'b', 'e']);
    expect(g.in_progress.map((j) => j.id)).toEqual(['d']);
    expect(g.done).toEqual([]);
  });
});

describe('moving cards', () => {
  it('inserts before a target and removes from the source order', () => {
    const s = { ...empty(), cardOrder: { todo: ['a', 'b'], done: ['x', 'y'] } };
    const n = moveCard(s, 'a', 'done', 'y', ['x', 'y']);
    expect(n.cardOrder.todo).toEqual(['b']);
    expect(n.cardOrder.done).toEqual(['x', 'a', 'y']);
    expect(n.cardMap.a).toBe('done');
  });
  it('appends at the end and keeps never-ordered visible cards in place', () => {
    const n = moveCard(empty(), 'a', 'done', null, ['p', 'q']);
    expect(n.cardOrder.done).toEqual(['p', 'q', 'a']);
  });
  it('reorders within the same list', () => {
    const s = { ...empty(), cardOrder: { todo: ['a', 'b', 'c'] } };
    expect(moveCard(s, 'c', 'todo', 'a', ['a', 'b', 'c']).cardOrder.todo).toEqual(['c', 'a', 'b']);
  });
  it('only closed/open status writes are produced (drag rule 2)', () => {
    expect(statusWriteFor('open', 'done', DEFAULT_LISTS)).toBe('closed');
    expect(statusWriteFor('completed', 'done', DEFAULT_LISTS)).toBe('closed');
    expect(statusWriteFor('closed', 'done', DEFAULT_LISTS)).toBeNull();
    expect(statusWriteFor('closed', 'todo', DEFAULT_LISTS)).toBe('open');
    expect(statusWriteFor('in_progress', 'todo', DEFAULT_LISTS)).toBeNull();
  });
});

describe('list management', () => {
  it('adds, renames (ignoring blank names) and reorders lists', () => {
    let s = addList(empty(), '  QC  ', 42);
    expect(s.lists.at(-1)).toEqual({ id: 'list_42', name: 'QC', color: '#5e6c84' });
    expect(addList(s, '   ')).toBe(s);
    s = renameList(s, 'list_42', 'Quality');
    expect(s.lists.at(-1)!.name).toBe('Quality');
    expect(renameList(s, 'list_42', '')).toBe(s);
    s = reorderLists(s, 'list_42', 'todo');
    expect(s.lists.map((l) => l.id)).toEqual(['list_42', 'todo', 'in_progress', 'done']);
  });
  it('deleting a list moves its cards to the first remaining list; the last list cannot be deleted', () => {
    const s = { ...empty(), cardMap: { a: 'in_progress', b: 'done' }, cardOrder: { todo: ['z'], in_progress: ['a'] } };
    const n = deleteList(s, 'in_progress');
    expect(n.lists.map((l) => l.id)).toEqual(['todo', 'done']);
    expect(n.cardMap).toEqual({ a: 'todo', b: 'done' });
    expect(n.cardOrder.todo).toEqual(['z', 'a']);
    const one = { lists: [DEFAULT_LISTS[0]], cardMap: {}, cardOrder: {} };
    expect(deleteList(one, 'todo')).toBe(one);
  });
});

describe('due dates and labels', () => {
  const now = new Date(2026, 9, 5, 15, 0);
  it('flags overdue only for unfinished jobs due before today', () => {
    expect(isOverdue({ estimated_delivery: new Date(2026, 9, 4, 23).toISOString(), status: 'open' }, now)).toBe(true);
    expect(isOverdue({ estimated_delivery: new Date(2026, 9, 5, 1).toISOString(), status: 'open' }, now)).toBe(false);
    expect(isOverdue({ estimated_delivery: new Date(2026, 9, 1).toISOString(), status: 'closed' }, now)).toBe(false);
    expect(isOverdue({ estimated_delivery: null, status: 'open' }, now)).toBe(false);
  });
  it('flags due today by calendar day', () => {
    expect(isDueToday({ estimated_delivery: new Date(2026, 9, 5, 23, 59).toISOString(), status: 'in_progress' }, now)).toBe(true);
    expect(isDueToday({ estimated_delivery: new Date(2026, 9, 6, 0, 1).toISOString(), status: 'in_progress' }, now)).toBe(false);
    expect(isDueToday({ estimated_delivery: new Date(2026, 9, 5).toISOString(), status: 'delivered' }, now)).toBe(false);
  });
  it('initials, labels and stage progress', () => {
    expect(initials('Ramesh Kumar')).toBe('RK');
    expect(initials('Omar')).toBe('OM');
    expect(initials('  ')).toBe('');
    expect(statusLabel('in_progress')).toBe('In progress');
    expect(statusLabel('done', DEFAULT_LISTS)).toBe('DONE');
    expect(statusLabel(undefined)).toBe('Open');
    expect(stageProgress('todo', DEFAULT_LISTS)).toBe(0);
    expect(stageProgress('in_progress', DEFAULT_LISTS)).toBe(50);
    expect(stageProgress('done', DEFAULT_LISTS)).toBe(100);
  });
});
