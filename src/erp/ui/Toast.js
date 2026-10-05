import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { X } from 'lucide-react';
import { IconButton } from './Button';

const ToastContext = createContext(null);
let nextId = 1;

export function ToastProvider({ children, duration = 5000 }) {
    const [toasts, setToasts] = useState([]);
    const timers = useRef({});

    const dismiss = useCallback(id => {
        setToasts(list => list.filter(t => t.id !== id));
        clearTimeout(timers.current[id]);
        delete timers.current[id];
    }, []);

    const push = useCallback((message, variant = 'info', opts = {}) => {
        const id = nextId++;
        setToasts(list => [...list, { id, message, variant }]);
        const ms = opts.duration === undefined ? duration : opts.duration;
        if (ms > 0) timers.current[id] = setTimeout(() => dismiss(id), ms);
        return id;
    }, [duration, dismiss]);

    useEffect(() => {
        const t = timers.current;
        return () => Object.values(t).forEach(clearTimeout);
    }, []);

    const api = useMemo(() => ({
        show: push,
        success: (m, o) => push(m, 'success', o),
        error: (m, o) => push(m, 'danger', o),
        warning: (m, o) => push(m, 'warning', o),
        info: (m, o) => push(m, 'info', o),
        dismiss,
    }), [push, dismiss]);

    return (
        <ToastContext.Provider value={api}>
            {children}
            {ReactDOM.createPortal(
                <div className="erp-toasts" aria-live="polite" aria-relevant="additions">
                    {toasts.map(t => (
                        <div key={t.id} className={'erp-toast erp-toast--' + t.variant} role={t.variant === 'danger' ? 'alert' : 'status'}>
                            <div className="erp-toast__body">{t.message}</div>
                            <IconButton icon={X} size="sm" label="Dismiss" onClick={() => dismiss(t.id)} />
                        </div>
                    ))}
                </div>,
                document.body
            )}
        </ToastContext.Provider>
    );
}

const noop = () => 0;
const fallback = { show: noop, success: noop, error: noop, warning: noop, info: noop, dismiss: noop };

/** Returns the toast API. Outside a provider the calls are silently ignored. */
export function useToast() {
    return useContext(ToastContext) || fallback;
}
