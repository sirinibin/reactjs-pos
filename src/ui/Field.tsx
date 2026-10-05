import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { Icon } from './Icon';

interface FieldProps {
  label?: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  error?: string;
  className?: string;
  children: (id: string, describedBy?: string) => ReactNode;
}

/** Label + control + hint/error wiring with proper aria attributes. */
export function Field({ label, required, hint, error, className, children }: FieldProps) {
  const id = useId();
  const descId = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  return (
    <div className={['field', className].filter(Boolean).join(' ')}>
      {label && (
        <label htmlFor={id}>
          <span>{label}</span>
          {required && <span className="req" aria-hidden>*</span>}
        </label>
      )}
      {children(id, descId)}
      {error ? (
        <div className="errmsg" id={descId} role="alert">
          <Icon name="alert" size="xs" />
          <span>{error}</span>
        </div>
      ) : (
        hint && <div className="hint" id={descId}>{hint}</div>
      )}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean };
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ invalid, className, ...rest }, ref) {
  return <input ref={ref} className={['inp', invalid && 'err', className].filter(Boolean).join(' ')} aria-invalid={invalid || undefined} {...rest} />;
});

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean; options?: { value: string; label: string }[]; placeholder?: string };
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ invalid, className, options, placeholder, children, ...rest }, ref) {
  return (
    <select ref={ref} className={['inp', invalid && 'err', className].filter(Boolean).join(' ')} aria-invalid={invalid || undefined} {...rest}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options?.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
      {children}
    </select>
  );
});

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean };
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ invalid, className, ...rest }, ref) {
  return <textarea ref={ref} className={['inp', 'ta-inp', invalid && 'err', className].filter(Boolean).join(' ')} aria-invalid={invalid || undefined} {...rest} />;
});

export function Checkbox({ label, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) {
  return (
    <label className="checkline">
      <input type="checkbox" className="chk" {...rest} />
      <span>{label}</span>
    </label>
  );
}

export function SearchInput({ value, onChange, placeholder, ...rest }: Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> & { value: string; onChange: (v: string) => void }) {
  return (
    <div className="inpw">
      <Icon name="search" size="s" />
      <input className="inp" type="search" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} {...rest} />
    </div>
  );
}
