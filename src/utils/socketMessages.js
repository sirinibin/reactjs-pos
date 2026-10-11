// Helpers for screens that react to WebSocket pushes (WebSocketContext.lastMessage).
//
// An effect like `useEffect(() => { if (lastMessage) list(); }, [lastMessage, list])`
// also re-runs when `list` changes (a filter, the page, the sort), and then acts on
// the same old message again: one push turned into an extra reload on every later
// filter change. takeNewMessage returns a message only the first time a screen sees
// it. Start the ref with the message current at mount (useRef(lastMessage)) so a
// push that arrived before the screen opened does not reload what it just loaded.

export function takeNewMessage(lastMessage, handledRef) {
    if (!lastMessage || lastMessage === handledRef.current) return null;
    handledRef.current = lastMessage;
    return lastMessage;
}

export function messageEvent(message) {
    try {
        return JSON.parse(message.data)?.event || null;
    } catch (_) {
        return null;
    }
}

// Pushes that change the figures on the Statistics and ledger screens.
export const DOCUMENT_UPDATE_EVENTS = [
    "sales_updated",
    "sales_return_updated",
    "purchase_updated",
    "purchase_return_updated",
    "quotation_updated",
    "quotationsales_return_updated",
    "expense_updated",
    "receivable_updated",
    "payable_updated",
];
