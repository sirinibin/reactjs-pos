import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  icon?: IconName;
  iconEnd?: IconName;
  loading?: boolean;
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'default', size = 'md', icon, iconEnd, loading, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  const cls = ['btn', variant === 'primary' && 'pri', variant === 'ghost' && 'gh', variant === 'danger' && 'danger', size === 'sm' && 'sm', className]
    .filter(Boolean)
    .join(' ');
  return (
    <button ref={ref} type={type} className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <span className="spin" aria-hidden /> : icon && <Icon name={icon} size="s" />}
      {children}
      {iconEnd && <Icon name={iconEnd} size="s" />}
    </button>
  );
});

export const IconButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { icon: IconName; label: string; badge?: boolean; flip?: boolean; loading?: boolean }>(
  function IconButton({ icon, label, badge, flip, loading, className, type = 'button', disabled, ...rest }, ref) {
    return (
      <button ref={ref} type={type} className={['ib', className].filter(Boolean).join(' ')} aria-label={label} title={label} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
        {loading ? <span className="spin" aria-hidden /> : <Icon name={icon} flip={flip} />}
        {badge && <span className="dot" />}
      </button>
    );
  },
);
