export function loadKanbanLists() {
    try { const s = localStorage.getItem('repair_job_kanban_lists'); if (s) return JSON.parse(s); } catch (e) { }
    return [
        { id: 'todo', name: 'ToDo', color: '#0052cc' },
        { id: 'in_progress', name: 'In Progress', color: '#ff8b00' },
        { id: 'done', name: 'DONE', color: '#00875a' },
    ];
}
export function loadCardMap() {
    try { const s = localStorage.getItem('repair_job_kanban_card_map'); if (s) return JSON.parse(s); } catch (e) { }
    return {};
}
export function saveCardMap(map) { localStorage.setItem('repair_job_kanban_card_map', JSON.stringify(map)); }
export function statusToDefaultListId(status) {
    if (status === 'in_progress') return 'in_progress';
    if (status === 'completed' || status === 'delivered') return 'done';
    return 'todo';
}
