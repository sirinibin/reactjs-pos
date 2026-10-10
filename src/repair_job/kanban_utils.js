export function loadKanbanLists() {
    try { const s = localStorage.getItem('repair_job_kanban_lists'); if (s) return JSON.parse(s); } catch (e) { }
    return [
        { id: 'todo', name: 'TO DO', color: '#0052cc' },
        { id: 'in_progress', name: 'IN PROGRESS', color: '#ff8b00' },
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
    // A drop on the last column (DONE) saves "closed", so closed jobs belong there too.
    if (status === 'completed' || status === 'delivered' || status === 'closed') return 'done';
    return 'todo';
}

/**
 * The status to save when a card is dropped on a board column, or null when the
 * job's status already fits that column. The last column closes the job, the
 * IN PROGRESS column puts it in progress (both kept by the API, so every user
 * and device sees the move), and any other column reopens a closed or
 * in-progress job.
 */
export function statusForListDrop(listId, isLastList, currentStatus) {
    if (isLastList) return currentStatus !== 'closed' ? 'closed' : null;
    if (listId === 'in_progress') return currentStatus !== 'in_progress' ? 'in_progress' : null;
    if (currentStatus === 'closed' || currentStatus === 'in_progress') return 'open';
    return null;
}
