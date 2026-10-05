import type { HTMLAttributes, ReactNode } from 'react';

export function Card({ title, sub, actions, children, className, bodyClass, ...rest }: {
  title?: ReactNode; sub?: ReactNode; actions?: ReactNode; children?: ReactNode; bodyClass?: string;
} & Omit<HTMLAttributes<HTMLDivElement>, 'title'>) {
  return (
    <section className={['card', className].filter(Boolean).join(' ')} {...rest}>
      {(title || actions) && (
        <div className="card-h">
          <div style={{ minWidth: 0 }}>
            {title && <h3>{title}</h3>}
            {sub && <div className="sub">{sub}</div>}
          </div>
          <span className="spacer" />
          {actions}
        </div>
      )}
      {children !== undefined && <div className={['card-b', bodyClass].filter(Boolean).join(' ')}>{children}</div>}
    </section>
  );
}
