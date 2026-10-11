import { fetchDeliveryNoteReminders, _resetDeliveryNoteReminders, REMINDERS_SHARE_MS } from '../deliveryNoteReminders';

const answer = (body) => Promise.resolve({ json: () => Promise.resolve(body) });

beforeEach(() => {
    _resetDeliveryNoteReminders();
    global.fetch = jest.fn(() => answer({ status: true, result: [{ id: 'd1', code: 'DN-1' }] }));
});

test('callers mounting together share one request', async () => {
    const t = 1000;
    const results = await Promise.all([
        fetchDeliveryNoteReminders('s1', 'tok', t),
        fetchDeliveryNoteReminders('s1', 'tok', t + 10),
        fetchDeliveryNoteReminders('s1', 'tok', t + 100),
    ]);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith('/v1/delivery-note/reminders?search[store_id]=s1', { headers: { Authorization: 'Bearer tok' } });
    results.forEach((r) => expect(r.result[0].code).toBe('DN-1'));
});

test('after the share window a new request is sent', async () => {
    await fetchDeliveryNoteReminders('s1', 'tok', 0);
    await fetchDeliveryNoteReminders('s1', 'tok', REMINDERS_SHARE_MS - 1);
    expect(fetch).toHaveBeenCalledTimes(1);
    await fetchDeliveryNoteReminders('s1', 'tok', REMINDERS_SHARE_MS);
    expect(fetch).toHaveBeenCalledTimes(2);
});

test('another store is fetched on its own', async () => {
    await fetchDeliveryNoteReminders('s1', 'tok', 0);
    await fetchDeliveryNoteReminders('s2', 'tok', 1);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[1][0]).toContain('search[store_id]=s2');
});

test('a failed request is not shared with the next caller', async () => {
    fetch.mockImplementationOnce(() => Promise.reject(new Error('offline')));
    await expect(fetchDeliveryNoteReminders('s1', 'tok', 0)).rejects.toThrow('offline');
    await expect(fetchDeliveryNoteReminders('s1', 'tok', 1)).resolves.toMatchObject({ status: true });
    expect(fetch).toHaveBeenCalledTimes(2);
});
