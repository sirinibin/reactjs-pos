import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { X } from 'lucide-react';
import { cx, IconButton, Button } from './Button';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

let openCount = 0;

/**
 * Shared behaviour for modal and drawer: portal, Esc to close, focus trap,
 * focus restore and body scroll lock.
 */
function useDialog(open, onClose, panelRef, closeOnEsc) {
    useEffect(() => {
        if (!open) return undefined;
        const previouslyFocused = document.activeElement;
        openCount += 1;
        document.body.style.overflow = 'hidden';

        const panel = panelRef.current;
        if (panel) {
            const first = panel.querySelector('[data-autofocus]') || panel.querySelector(FOCUSABLE);
            (first || panel).focus();
        }

        function onKey(e) {
            if (e.key === 'Escape' && closeOnEsc) {
                e.stopPropagation();
                onClose && onClose();
                return;
            }
            if (e.key !== 'Tab' || !panelRef.current) return;
            const items = Array.from(panelRef.current.querySelectorAll(FOCUSABLE));
            if (items.length === 0) return;
            const firstEl = items[0];
            const lastEl = items[items.length - 1];
            if (e.shiftKey && document.activeElement === firstEl) {
                e.preventDefault();
                lastEl.focus();
            } else if (!e.shiftKey && document.activeElement === lastEl) {
                e.preventDefault();
                firstEl.focus();
            }
        }
        document.addEventListener('keydown', onKey, true);
        return () => {
            document.removeEventListener('keydown', onKey, true);
            openCount -= 1;
            if (openCount <= 0) {
                openCount = 0;
                document.body.style.overflow = '';
            }
            if (previouslyFocused && previouslyFocused.focus) previouslyFocused.focus();
        };
    }, [open, onClose, panelRef, closeOnEsc]);
}

export function Modal({ open, onClose, title, size, footer, children, closeOnBackdrop = true, closeOnEsc = true, className }) {
    const panelRef = useRef(null);
    useDialog(open, onClose, panelRef, closeOnEsc);
    if (!open) return null;
    const titleId = 'erp-modal-title';
    return ReactDOM.createPortal(
        <div
            className="erp-overlay"
            onMouseDown={e => { if (closeOnBackdrop && e.target === e.currentTarget) onClose && onClose(); }}
        >
            <div
                ref={panelRef}
                className={cx('erp-modal', size && `erp-modal--${size}`, className)}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
            >
                <div className="erp-modal__head">
                    <h2 className="erp-modal__title" id={titleId}>{title}</h2>
                    {onClose && <IconButton icon={X} label="Close" onClick={onClose} />}
                </div>
                <div className="erp-modal__body">{children}</div>
                {footer && <div className="erp-modal__foot">{footer}</div>}
            </div>
        </div>,
        document.body
    );
}

export function Drawer({ open, onClose, title, size, footer, children, closeOnEsc = true }) {
    const panelRef = useRef(null);
    useDialog(open, onClose, panelRef, closeOnEsc);
    if (!open) return null;
    return ReactDOM.createPortal(
        <div className="erp-overlay erp-drawer-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose && onClose(); }}>
            <div
                ref={panelRef}
                className={cx('erp-drawer', size && `erp-drawer--${size}`)}
                role="dialog"
                aria-modal="true"
                aria-label={typeof title === 'string' ? title : undefined}
                tabIndex={-1}
            >
                <div className="erp-modal__head">
                    <h2 className="erp-modal__title">{title}</h2>
                    {onClose && <IconButton icon={X} label="Close" onClick={onClose} />}
                </div>
                <div className="erp-modal__body">{children}</div>
                {footer && <div className="erp-modal__foot">{footer}</div>}
            </div>
        </div>,
        document.body
    );
}

/** Small confirm dialog. Resolve with onConfirm / onCancel. */
export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger, busy, onConfirm, onCancel }) {
    return (
        <Modal
            open={open}
            onClose={busy ? undefined : onCancel}
            title={title}
            size="sm"
            footer={
                <>
                    <Button onClick={onCancel} disabled={busy}>{cancelLabel}</Button>
                    <Button variant={danger ? 'danger-solid' : 'primary'} onClick={onConfirm} loading={busy} data-autofocus>
                        {confirmLabel}
                    </Button>
                </>
            }
        >
            <p style={{ margin: 0 }}>{message}</p>
        </Modal>
    );
}
