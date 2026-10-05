import React from 'react';
import { Search, X } from 'lucide-react';
import { cx, IconButton } from './Button';

let idCounter = 0;
// React 17 has no useId, so each instance takes the next value of a counter once.
function useFieldId(explicit) {
    const ref = React.useRef(null);
    if (explicit) return explicit;
    if (ref.current === null) {
        idCounter += 1;
        ref.current = 'erp-f-' + idCounter;
    }
    return ref.current;
}

export { useFieldId };

/** Label + control + hint/error wrapper. The child receives id / aria wiring. */
export function Field({ label, required, error, hint, id, className, children }) {
    const fieldId = useFieldId(id);
    const describedBy = error ? fieldId + '-err' : hint ? fieldId + '-hint' : undefined;
    const child = React.isValidElement(children)
        ? React.cloneElement(children, {
            id: children.props.id || fieldId,
            'aria-invalid': error ? 'true' : undefined,
            'aria-describedby': describedBy,
            'aria-required': required ? 'true' : undefined,
            invalid: error ? true : children.props.invalid,
        })
        : children;
    return (
        <div className={cx('erp-field', className)}>
            {label && (
                <label className="erp-field__label" htmlFor={fieldId}>
                    {label}
                    {required && <span className="erp-field__req" aria-hidden="true">*</span>}
                </label>
            )}
            {child}
            {error ? (
                <div className="erp-field__error" id={fieldId + '-err'} role="alert">{error}</div>
            ) : hint ? (
                <div className="erp-field__hint" id={fieldId + '-hint'}>{hint}</div>
            ) : null}
        </div>
    );
}

export const Input = React.forwardRef(function Input({ invalid, size, className, ...rest }, ref) {
    return <input ref={ref} className={cx('erp-input', size === 'lg' && 'erp-input--lg', invalid && 'is-invalid', className)} {...rest} />;
});

export const Textarea = React.forwardRef(function Textarea({ invalid, className, ...rest }, ref) {
    return <textarea ref={ref} className={cx('erp-textarea', invalid && 'is-invalid', className)} {...rest} />;
});

/** Native select. `options` is [{value,label}] or plain strings. */
export const Select = React.forwardRef(function Select({ invalid, options, placeholder, className, children, ...rest }, ref) {
    return (
        <select ref={ref} className={cx('erp-select', invalid && 'is-invalid', className)} {...rest}>
            {placeholder !== undefined && <option value="">{placeholder}</option>}
            {options
                ? options.map(o => {
                    const opt = typeof o === 'object' ? o : { value: o, label: o };
                    return <option key={String(opt.value)} value={opt.value}>{opt.label}</option>;
                })
                : children}
        </select>
    );
});

export function Checkbox({ label, className, invalid, ...rest }) {
    return (
        <label className={cx('erp-check', className)}>
            <input type="checkbox" {...rest} />
            <span>{label}</span>
        </label>
    );
}

/** Search box with a clear button. Calls onChange with the string value. */
export function SearchInput({ value, onChange, placeholder, label, autoFocus, className, inputRef }) {
    return (
        <div className={cx('erp-input-group', className)}>
            <Search size={14} aria-hidden="true" />
            <input
                ref={inputRef}
                className="erp-input"
                type="search"
                value={value}
                placeholder={placeholder}
                aria-label={label || placeholder}
                autoFocus={autoFocus}
                onChange={e => onChange(e.target.value)}
            />
            {value ? (
                <IconButton
                    className="erp-input-group__clear"
                    size="sm"
                    icon={X}
                    label="Clear search"
                    onClick={() => onChange('')}
                />
            ) : null}
        </div>
    );
}
