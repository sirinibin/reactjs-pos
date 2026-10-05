import React from 'react';
import { Loader2 } from 'lucide-react';

function cx(...parts) {
    return parts.filter(Boolean).join(' ');
}

export { cx };

/**
 * Button with ERP variants: default, primary, danger, danger-solid, ghost, link.
 * `loading` disables the button and shows a spinner in place of the icon.
 */
export const Button = React.forwardRef(function Button(
    { variant = 'default', size, block, icon, loading, disabled, className, children, type = 'button', ...rest },
    ref
) {
    const Icon = icon;
    return (
        <button
            ref={ref}
            type={type}
            className={cx(
                'erp-btn',
                variant !== 'default' && `erp-btn--${variant}`,
                size === 'sm' && 'erp-btn--sm',
                block && 'erp-btn--block',
                className
            )}
            disabled={disabled || loading}
            aria-busy={loading ? 'true' : undefined}
            {...rest}
        >
            {loading ? <Loader2 size={14} className="erp-spin" aria-hidden="true" /> : Icon ? <Icon size={15} aria-hidden="true" /> : null}
            {children}
        </button>
    );
});

/** Square icon-only button. `label` is required for screen readers and the tooltip. */
export const IconButton = React.forwardRef(function IconButton(
    { icon: Icon, label, size, bordered, className, type = 'button', ...rest },
    ref
) {
    return (
        <button
            ref={ref}
            type={type}
            className={cx('erp-icon-btn', size === 'sm' && 'erp-icon-btn--sm', bordered && 'erp-icon-btn--bordered', className)}
            aria-label={label}
            title={label}
            {...rest}
        >
            <Icon size={size === 'sm' ? 14 : 16} aria-hidden="true" />
        </button>
    );
});
