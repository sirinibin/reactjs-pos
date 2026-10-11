// GET /v1/delivery-note/reminders, shared by the top bar and every sales form.
// Several of them mount together (the top bar, the sales form, and the forms the
// Quotations, Vehicles and Repair Jobs screens keep ready), and each fetched the
// same reminders on mount: up to six identical requests per page. Callers within
// a few seconds of each other now share one request and its answer.

export const REMINDERS_SHARE_MS = 5000;

let shared = null; // { storeId, at, promise }

export function fetchDeliveryNoteReminders(storeId, token, now = Date.now()) {
    if (shared && shared.storeId === storeId && now - shared.at < REMINDERS_SHARE_MS) {
        return shared.promise;
    }
    const promise = fetch(`/v1/delivery-note/reminders?search[store_id]=${storeId}`, {
        headers: { Authorization: "Bearer " + token },
    }).then((res) => res.json());
    const entry = { storeId, at: now, promise };
    shared = entry;
    // A failed request is not shared with later callers.
    promise.catch(() => { if (shared === entry) shared = null; });
    return promise;
}

export function _resetDeliveryNoteReminders() {
    shared = null;
}
