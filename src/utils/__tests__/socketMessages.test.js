import { takeNewMessage, messageEvent, DOCUMENT_UPDATE_EVENTS } from '../socketMessages';

const msg = (event) => ({ data: JSON.stringify({ event }) });

describe('takeNewMessage', () => {
    test('a new message is taken once; the same message again is ignored', () => {
        const ref = { current: null };
        const m = msg('sales_updated');
        expect(takeNewMessage(m, ref)).toBe(m);
        // The effect re-runs because list() changed (a filter): no second reload.
        expect(takeNewMessage(m, ref)).toBeNull();
        expect(takeNewMessage(m, ref)).toBeNull();
    });

    test('the message current when the screen mounted is not acted on', () => {
        const before = msg('sales_updated');
        const ref = { current: before }; // useRef(lastMessage)
        expect(takeNewMessage(before, ref)).toBeNull();
        const next = msg('sales_updated');
        expect(takeNewMessage(next, ref)).toBe(next);
    });

    test('no message, nothing taken', () => {
        const ref = { current: null };
        expect(takeNewMessage(null, ref)).toBeNull();
        expect(takeNewMessage(undefined, ref)).toBeNull();
    });

    test('identical text in a new push is a new message', () => {
        const ref = { current: null };
        expect(takeNewMessage(msg('sales_updated'), ref)).not.toBeNull();
        expect(takeNewMessage(msg('sales_updated'), ref)).not.toBeNull();
    });
});

describe('messageEvent', () => {
    test('reads the event name', () => {
        expect(messageEvent(msg('purchase_updated'))).toBe('purchase_updated');
    });
    test('bad or empty data gives null', () => {
        expect(messageEvent({ data: 'not json' })).toBeNull();
        expect(messageEvent({ data: '{}' })).toBeNull();
    });
});

test('heartbeats and presence pushes are not document updates', () => {
    ['pong', 'user_status_change', 'user_device_count_change', 'wa_unread_changed', 'email_unread_changed']
        .forEach((e) => expect(DOCUMENT_UPDATE_EVENTS).not.toContain(e));
    ['sales_updated', 'purchase_updated', 'expense_updated', 'receivable_updated', 'payable_updated']
        .forEach((e) => expect(DOCUMENT_UPDATE_EVENTS).toContain(e));
});

describe('every screen that reacts to pushes uses takeNewMessage', () => {
    const fs = require('fs');
    const path = require('path');
    const SCREENS = ['user', 'posting', 'stats', 'quotation_sales_return', 'quotation', 'order', 'purchase_return', 'purchase', 'stock_transfer', 'sales_return'];
    test.each(SCREENS)('%s/index.js', (dir) => {
        const src = fs.readFileSync(path.join(__dirname, '../../', dir, 'index.js'), 'utf8');
        expect(src).not.toMatch(/if \(lastMessage\) \{/);
        expect(src).toMatch(/const handledMessageRef = useRef\(lastMessage\);/);
        expect(src).toMatch(/takeNewMessage\(lastMessage, handledMessageRef\)/);
    });
    test('the Statistics screen reloads only on document updates', () => {
        const src = fs.readFileSync(path.join(__dirname, '../../stats/index.js'), 'utf8');
        expect(src).toMatch(/DOCUMENT_UPDATE_EVENTS\.includes\(messageEvent\(message\)\)/);
    });
});
