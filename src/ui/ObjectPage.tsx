import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon, type IconName } from './Icon';

export interface Crumb { label: ReactNode; to?: string }
export interface Facet { label: ReactNode; value: ReactNode; tone?: 'good' | 'warn' | 'crit'; hideOnMobile?: boolean }

/** Fiori-style object header: breadcrumbs, identity, status, actions, key facts, tabs. */
export function ObjectHeader({ crumbs, icon, avatar, title, pills, subtitle, actions, facets, tabs }: {
  crumbs?: Crumb[]; icon?: IconName; avatar?: ReactNode; title: ReactNode; pills?: ReactNode; subtitle?: ReactNode;
  actions?: ReactNode; facets?: Facet[]; tabs?: ReactNode;
}) {
  return (
    <div className="obj">
      <div className="obj-in" style={tabs ? undefined : { paddingBottom: facets?.length ? 0 : 16 }}>
        {crumbs && (
          <nav className="crumb" aria-label="Breadcrumb">
            {crumbs.map((c, i) => (
              <Fragment key={i}>
                {i > 0 && <Icon name="chevr" size="xs" flip />}
                {c.to ? <Link to={c.to}>{c.label}</Link> : <span aria-current="page">{c.label}</span>}
              </Fragment>
            ))}
          </nav>
        )}
        <div className="obj-title">
          {avatar || (icon && <div className="obj-ic"><Icon name={icon} /></div>)}
          <div className="obj-name">
            <h1>{title}{pills}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {actions && <div className="obj-acts">{actions}</div>}
        </div>
        {facets && facets.length > 0 && (
          <div className="facets">
            {facets.map((f, i) => (
              <div className={`facet${f.hideOnMobile ? ' hide-sm' : ''}`} key={i}>
                <span>{f.label}</span>
                <b className="num" style={f.tone ? { color: `var(--${f.tone})` } : undefined}>{f.value}</b>
              </div>
            ))}
          </div>
        )}
        {tabs}
      </div>
    </div>
  );
}

export function ObjectBody({ children, side }: { children: ReactNode; side?: ReactNode }) {
  return (
    <div className="obj-body" style={side ? undefined : { gridTemplateColumns: 'minmax(0,1fr)' }}>
      <div className="stack">{children}</div>
      {side}
    </div>
  );
}

export function SidePanel({ sections }: { sections: { title: ReactNode; body: ReactNode }[] }) {
  return (
    <aside className="card side">
      {sections.map((s, i) => (
        <div className="sec" key={i}><h4>{s.title}</h4>{s.body}</div>
      ))}
    </aside>
  );
}

export function KeyValues({ items }: { items: { k: ReactNode; v: ReactNode }[] }) {
  return (
    <dl className="kv" style={{ margin: 0 }}>
      {items.map((x, i) => (
        <Fragment key={i}><dt>{x.k}</dt><dd>{x.v}</dd></Fragment>
      ))}
    </dl>
  );
}

export function Stepper({ steps, current }: { steps: ReactNode[]; current: number }) {
  return (
    <div className="stepper" role="list">
      {steps.map((s, i) => (
        <Fragment key={i}>
          {i > 0 && <div className={`step-line${i <= current ? ' done' : ''}`} />}
          <div className={`step${i < current ? ' done' : i === current ? ' cur' : ''}`} role="listitem" aria-current={i === current ? 'step' : undefined}>
            <span className="b">{i < current ? <Icon name="check" size="xs" /> : i + 1}</span><span>{s}</span>
          </div>
        </Fragment>
      ))}
    </div>
  );
}

export interface FlowNode { kind: ReactNode; icon: IconName; code?: ReactNode; status?: ReactNode; to?: string; current?: boolean; ghost?: boolean; onClick?: () => void }
export function DocFlow({ nodes }: { nodes: FlowNode[] }) {
  return (
    <div className="flow">
      {nodes.map((n, i) => {
        const inner = (
          <>
            <span className="k"><Icon name={n.icon} size="xs" /><span>{n.kind}</span></span>
            {n.code && <span className="v">{n.code}</span>}
            {n.status && <span style={{ alignSelf: 'flex-start' }}>{n.status}</span>}
          </>
        );
        const cls = `fnode${n.current ? ' cur' : ''}${n.ghost ? ' ghost' : ''}`;
        return (
          <Fragment key={i}>
            {i > 0 && <span className="farrow" aria-hidden><Icon name="arrowr" size="s" flip /></span>}
            {n.to ? <Link to={n.to} className={cls}>{inner}</Link> : <button type="button" className={cls} onClick={n.onClick} disabled={!n.onClick && !n.current}>{inner}</button>}
          </Fragment>
        );
      })}
    </div>
  );
}
