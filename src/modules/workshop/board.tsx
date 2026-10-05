import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type PointerEvent as RPointerEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/api/client';
import { useList } from '@/api/hooks';
import { useAuth, useStoreId } from '@/auth/AuthContext';
import { searchParties, partyToOption, type Party } from '@/framework/doc/lookups';
import { AsyncPicker, type PickerOption } from '@/ui/AsyncPicker';
import { Button, IconButton } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { Field, Input, Select, Textarea } from '@/ui/Field';
import { Modal } from '@/ui/Overlay';
import { ErrorState, Skeleton, useConfirm } from '@/ui/Misc';
import { useToast } from '@/ui/Toast';
import { usePageMeta } from '@/shell/Workspace';
import { fmtDate, fmtMoney } from '@/lib/format';
import { JOB, searchVehicles, vehicleToOption, type Vehicle } from './lib/api';
import {
  accentFor, addList, deleteList, groupJobs, initials, isDueToday, isOverdue, loadBoard, moveCard, renameList, reorderLists, saveBoard,
  stageProgress, statusWriteFor, type BoardState, type KList,
} from './lib/kanban';
import { DocChips, Plate } from './components/bits';
import { SelectJobsModal, useCreateInvoice } from './components/invoice';
import type { RepairJob } from './jobs';
import './workshop.css';

const PAGE = 5;
const SELECT = 'id,job_number,title,vehicle_number,brand,model,technician_name,technician_names,customer_name,total,total_with_vat,status,customer_id,vehicle_id,archived,order_id,order_code,order_net_total,quotation_id,quotation_code,quotation_net_total,quotation_type,non_vat_sales_id,non_vat_sales_code,non_vat_sales_net_total,date,estimated_delivery';

type Drop = { list: string; before: string | null } | null;

/** Where in a column body a pointer at clientY lands: before which card id (null = end). */
function dropBefore(body: HTMLElement, clientY: number, dragId: string | null): string | null {
  const cards = Array.from(body.querySelectorAll<HTMLElement>('[data-card]')).filter((c) => c.dataset.card !== dragId);
  for (const c of cards) {
    const r = c.getBoundingClientRect();
    if (clientY < r.top + r.height / 2) return c.dataset.card!;
  }
  return null;
}

export function BoardPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const storeId = useStoreId();
  const { can } = useAuth();
  usePageMeta(t('Repair Jobs Board'), 'kanban');
  const [sp, setSp] = useSearchParams();
  const [board, setBoardRaw] = useState<BoardState>(() => loadBoard());
  const setBoard = useCallback((b: BoardState) => { setBoardRaw(b); saveBoard(b); }, []);
  const [archived, setArchived] = useState(false);
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [onlyToday, setOnlyToday] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [visible, setVisible] = useState<Record<string, number>>({});
  const [dragId, setDragId] = useState<string | null>(null);
  const [drop, setDrop] = useState<Drop>(null);
  const [listDrag, setListDrag] = useState<string | null>(null);
  const [listOver, setListOver] = useState<string | null>(null);
  const [newJob, setNewJob] = useState<{ title: string; list: string } | null>(null);
  const [adding, setAdding] = useState<{ list: string; top: boolean; text: string } | null>(null);
  const [addingList, setAddingList] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [createMenu, setCreateMenu] = useState(false);
  const [needCustomer, setNeedCustomer] = useState(false);
  const [picking, setPicking] = useState(false);
  const [confirmEl, ask] = useConfirm();
  const inv = useCreateInvoice();
  const kbRef = useRef<HTMLDivElement>(null);
  const suppressClick = useRef(false);

  const customer: PickerOption<Party> | null = sp.get('customer_id') ? { id: sp.get('customer_id')!, label: sp.get('customer_name') || '', data: { id: sp.get('customer_id')!, name: sp.get('customer_name') || '' } } : null;
  const vehicle: PickerOption<Vehicle> | null = sp.get('vehicle_id') ? { id: sp.get('vehicle_id')!, label: sp.get('vehicle_label') || '', data: { id: sp.get('vehicle_id')! } } : null;
  const setFilters = (c: PickerOption<any> | null, v: PickerOption<any> | null) => setSp((p) => {
    const n = new URLSearchParams(p);
    ['customer_id', 'customer_name', 'vehicle_id', 'vehicle_label'].forEach((k) => n.delete(k));
    if (c) { n.set('customer_id', c.id); n.set('customer_name', c.data?.name || c.label); }
    if (v) { n.set('vehicle_id', v.id); n.set('vehicle_label', v.label); }
    return n;
  }, { replace: true });

  // Close card / create menus on outside click.
  useEffect(() => {
    if (!menu && !createMenu) return;
    const h = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest('.ws-menu') || el.closest('[aria-haspopup="menu"]')) return;
      setMenu(null); setCreateMenu(false);
    };
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { setMenu(null); setCreateMenu(false); } };
    document.addEventListener('mousedown', h);
    document.addEventListener('keydown', k);
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('keydown', k); };
  }, [menu, createMenu]);

  const q = useList<RepairJob>(JOB, { search: { customer_id: customer?.id, vehicle_id: vehicle?.id, archived: archived ? 1 : undefined }, limit: 500, select: SELECT });
  const rows = useMemo(() => (q.data?.rows || []).map((j) => (overrides[j.id] ? { ...j, status: overrides[j.id] } : j)), [q.data, overrides]);
  const overdueCount = rows.filter((j) => isOverdue(j)).length;
  const todayCount = rows.filter((j) => isDueToday(j)).length;
  const shown = rows.filter((j) => (!onlyOverdue || isOverdue(j)) && (!onlyToday || isDueToday(j)));
  const groups = useMemo(() => groupJobs(shown, board), [shown, board]);
  const canEdit = can('repair_jobs', 'update');
  const canCreate = can('repair_jobs', 'create');

  // ---- moves -------------------------------------------------------------
  const moveTo = useCallback(async (jobId: string, list: string, before: string | null) => {
    const job = rows.find((j) => j.id === jobId);
    if (!job) return;
    const order = (groups[list] || []).map((j) => j.id);
    const next = moveCard(board, jobId, list, before, order);
    setBoard(next);
    const pos = next.cardOrder[list].indexOf(jobId);
    setVisible((v) => ({ ...v, [list]: Math.max(v[list] || PAGE, pos + 1) }));
    const listName = board.lists.find((l) => l.id === list)?.name || '';
    const write = statusWriteFor(job.status, list, board.lists);
    if (!write) { toast.info(`${job.job_number} → ${t(listName)}`); return; }
    setOverrides((o) => ({ ...o, [jobId]: write }));
    try {
      await api.put(`${JOB}/${jobId}`, { status: write }, { search: { store_id: storeId } });
      toast.success(`${job.job_number} → ${t(listName)} · ${t(write === 'closed' ? 'Closed' : 'Open')}`);
      qc.invalidateQueries({ queryKey: [JOB] });
    } catch (e) {
      setOverrides((o) => { const n = { ...o }; delete n[jobId]; return n; });
      toast.error(e instanceof ApiError ? e.message : (e as Error).message);
    }
  }, [rows, groups, board, setBoard, storeId, qc, toast, t]);

  // ---- desktop HTML5 drag -------------------------------------------------
  const onCardDragStart = (e: DragEvent, id: string) => {
    if (!canEdit) { e.preventDefault(); return; }
    e.dataTransfer.setData('text/x-job', id);
    e.dataTransfer.effectAllowed = 'move';
    setDragId(id);
  };
  const onBodyDragOver = (e: DragEvent<HTMLDivElement>, list: string) => {
    if (!e.dataTransfer.types.includes('text/x-job')) return;
    e.preventDefault();
    const before = dropBefore(e.currentTarget, e.clientY, dragId);
    if (drop?.list !== list || drop.before !== before) setDrop({ list, before });
    // auto-scroll the column near its edges
    const r = e.currentTarget.getBoundingClientRect();
    if (e.clientY < r.top + 60) e.currentTarget.scrollTop -= 12;
    else if (e.clientY > r.bottom - 60) e.currentTarget.scrollTop += 12;
  };
  const onBodyDrop = (e: DragEvent<HTMLDivElement>, list: string) => {
    const id = e.dataTransfer.getData('text/x-job');
    if (!id) return;
    e.preventDefault();
    const before = dropBefore(e.currentTarget, e.clientY, id);
    setDragId(null); setDrop(null);
    moveTo(id, list, before);
  };

  // ---- touch: long-press 150 ms then drag with a tilted ghost -------------
  const touch = useRef<{ id: string; x: number; y: number; timer: number; active: boolean } | null>(null);
  const [ghost, setGhost] = useState<{ id: string; x: number; y: number } | null>(null);
  const endTouch = useCallback(() => {
    if (touch.current) clearTimeout(touch.current.timer);
    touch.current = null;
    setGhost(null); setDragId(null); setDrop(null);
  }, []);
  const onCardPointerDown = (e: RPointerEvent, id: string) => {
    if (e.pointerType !== 'touch' || !canEdit) return;
    const st = { id, x: e.clientX, y: e.clientY, active: false, timer: 0 };
    st.timer = window.setTimeout(() => {
      st.active = true;
      suppressClick.current = true;
      setDragId(id);
      setGhost({ id, x: st.x, y: st.y });
      navigator.vibrate?.(15);
    }, 150);
    touch.current = st;
  };
  useEffect(() => {
    const locate = (x: number, y: number) => {
      const el = document.elementFromPoint(x, y) as HTMLElement | null;
      const body = el?.closest<HTMLElement>('[data-list-body]');
      if (!body) return null;
      return { list: body.dataset.listBody!, before: dropBefore(body, y, touch.current?.id || null), body };
    };
    const move = (e: PointerEvent) => {
      const st = touch.current;
      if (!st) return;
      if (!st.active) {
        if (Math.hypot(e.clientX - st.x, e.clientY - st.y) > 10) { clearTimeout(st.timer); touch.current = null; }
        return;
      }
      st.x = e.clientX; st.y = e.clientY;
      setGhost({ id: st.id, x: e.clientX, y: e.clientY });
      const hit = locate(e.clientX, e.clientY);
      setDrop(hit ? { list: hit.list, before: hit.before } : null);
      const kb = kbRef.current;
      if (kb) {
        const r = kb.getBoundingClientRect();
        if (e.clientX < r.left + 60) kb.scrollLeft -= 12;
        else if (e.clientX > r.right - 60) kb.scrollLeft += 12;
      }
      if (hit) {
        const r = hit.body.getBoundingClientRect();
        if (e.clientY < r.top + 60) hit.body.scrollTop -= 12;
        else if (e.clientY > r.bottom - 60) hit.body.scrollTop += 12;
      }
    };
    const up = (e: PointerEvent) => {
      const st = touch.current;
      if (!st) return;
      if (st.active) {
        const hit = locate(e.clientX, e.clientY);
        if (hit) moveTo(st.id, hit.list, hit.before);
        setTimeout(() => { suppressClick.current = false; }, 50);
      }
      endTouch();
    };
    const block = (e: TouchEvent) => { if (touch.current?.active) e.preventDefault(); };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', endTouch);
    document.addEventListener('touchmove', block, { passive: false });
    return () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', endTouch);
      document.removeEventListener('touchmove', block);
    };
  }, [moveTo, endTouch]);

  // ---- lists ---------------------------------------------------------------
  const commitRename = () => {
    if (renaming) setBoard(renameList(board, renaming.id, renaming.name));
    setRenaming(null);
  };
  const removeList = async (l: KList) => {
    const n = (groups[l.id] || []).length;
    const ok = await ask(t('Delete list'), { body: n ? t('This list has {{n}} card(s). Cards will be moved to the first list. Continue?', { n }) : <bdi>{t(l.name)}</bdi>, danger: true, confirmLabel: t('Delete') });
    if (ok) setBoard(deleteList(board, l.id));
  };

  // ---- create / archive -----------------------------------------------------
  const createJob = async (title: string, list: string, top: boolean) => {
    const tt = title.trim();
    if (!tt) return false;
    const vdata = vehicle ? rows.find((j) => j.vehicle_id === vehicle.id) : undefined;
    const lastList = board.lists[board.lists.length - 1]?.id === list;
    try {
      const r = await api.post<RepairJob>(JOB, {
        title: tt, store_id: storeId, date: new Date().toISOString(), status: lastList ? 'closed' : 'open',
        ...(customer ? { customer_id: customer.id, customer_name: customer.data?.name || customer.label } : {}),
        ...(vehicle ? { vehicle_id: vehicle.id, vehicle_number: vdata?.vehicle_number || '', brand: vdata?.brand || '', model: vdata?.model || '' } : {}),
      }, { search: { store_id: storeId } });
      const id = r.result?.id;
      if (id) {
        const order = (groups[list] || []).map((j) => j.id);
        const b = moveCard(board, id, list, top ? order[0] || null : null, order);
        setBoard(b);
        if (!top) setVisible((v) => ({ ...v, [list]: Math.max(v[list] || PAGE, order.length + 1) }));
      }
      toast.success(`${r.result?.job_number || ''} ${t('Repair job created successfully!')}`.trim());
      qc.invalidateQueries({ queryKey: [JOB] });
      return true;
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : (e as Error).message);
      return false;
    }
  };
  const setArchivedFlag = async (job: RepairJob, flag: boolean) => {
    setMenu(null);
    if (flag && !(await ask(t('Archive this repair job?'), { confirmLabel: t('Archive') }))) return;
    try {
      await api.put(`${JOB}/${job.id}`, { archived: flag }, { search: { store_id: storeId } });
      toast.success(`${job.job_number} · ${t(flag ? 'Archived' : 'Unarchived')}`);
      qc.invalidateQueries({ queryKey: [JOB] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  const startInvoice = () => {
    setCreateMenu(false);
    if (!customer) setNeedCustomer(true);
    else setPicking(true);
  };

  const openCard = (id: string) => { if (!suppressClick.current) nav(`/workshop/jobs/${id}`); };
  const ghostJob = ghost ? rows.find((j) => j.id === ghost.id) : null;
  const activeCount = rows.filter((j) => j.status !== 'closed').length;

  return (
    <section style={{ paddingBottom: 0 }}>
      <div className="pad" style={{ paddingBottom: 8 }}>
        <div className="ph" style={{ marginBottom: 10 }}>
          <div>
            <h1>{t('Repair Jobs Board')}</h1>
            <p>{t('Drag cards between lists · {{n}} active jobs', { n: activeCount })}</p>
          </div>
          <div className="acts">
            <Button icon="cols" onClick={() => nav('/workshop/jobs')}>{t('Table')}</Button>
            {(canCreate || can('sales', 'create')) && (
              <div style={{ position: 'relative' }}>
                <Button variant="primary" icon="plus" iconEnd="chev" aria-expanded={createMenu} aria-haspopup="menu" onClick={() => setCreateMenu((x) => !x)}>{t('Create')}</Button>
                {createMenu && (
                  <div className="ws-menu" role="menu" onKeyDown={(e) => e.key === 'Escape' && setCreateMenu(false)}>
                    {canCreate && <button role="menuitem" type="button" onClick={() => { setCreateMenu(false); setNewJob({ title: '', list: board.lists[0]?.id || 'todo' }); }}><Icon name="wrench" size="s" />{t('New Job')}</button>}
                    {canCreate && <button role="menuitem" type="button" onClick={() => nav('/workshop/jobs/new')}><Icon name="file" size="s" />{t('New Repair Job')} ({t('full form')})</button>}
                    {can('sales', 'create') && <button role="menuitem" type="button" onClick={startInvoice}><Icon name="receipt" size="s" />{t('Sales Invoice')}</button>}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="ws-board-bar" role="toolbar" aria-label={t('Filters')}>
        <AsyncPicker<Party> value={customer} clearable eager aria-label={t('Filter by customer...')} placeholder={t('Filter by customer...')}
          onChange={(o) => setFilters(o, null)} load={async (s, sig) => (await searchParties('customer', storeId, s, sig)).map(partyToOption)} />
        <AsyncPicker<Vehicle> value={vehicle} clearable eager aria-label={t('Search vehicle...')} placeholder={t('Search vehicle...')}
          onChange={(o) => {
            if (!o) return setFilters(customer, null);
            const v = o.data;
            setFilters(v?.customer_id ? { id: v.customer_id, label: v.customer_name || '', data: { name: v.customer_name } } : customer, o);
          }}
          load={async (s, sig) => (await searchVehicles(storeId, s, sig, customer?.id, 15)).map(vehicleToOption)} />
        <button type="button" className="btn sm ws-toggle crit" aria-pressed={onlyOverdue} onClick={() => setOnlyOverdue((x) => !x)}><Icon name="alert" size="s" />{t('Overdue')}<span className="c num">{overdueCount}</span></button>
        <button type="button" className="btn sm ws-toggle" aria-pressed={onlyToday} onClick={() => setOnlyToday((x) => !x)}><Icon name="clock" size="s" />{t('Due Today')}<span className="c num">{todayCount}</span></button>
        <button type="button" className="btn sm ws-toggle" aria-pressed={archived} onClick={() => setArchived((x) => !x)}><Icon name="inbox" size="s" />{t(archived ? 'Hide Archived' : 'Show Archived')}</button>
        <IconButton icon="refresh" label={t('Refresh')} onClick={() => q.refetch()} />
      </div>
      {q.isError ? <div className="pad"><ErrorState error={q.error} onRetry={() => q.refetch()} /></div> : (
        <div className="kb ws-kb" ref={kbRef} aria-busy={q.isLoading || undefined}>
          {board.lists.map((l) => {
            const jobs = groups[l.id] || [];
            const lim = visible[l.id] || PAGE;
            const more = jobs.length - lim;
            return (
              <section className="kcol ws-col" key={l.id} aria-label={t(l.name)} data-list={l.id}>
                <div className={`kcol-h${listOver === l.id && listDrag !== l.id ? ' over' : ''}`} draggable={!renaming} title={t('Double-click to rename • Drag to reorder')}
                  onDragStart={(e) => { e.dataTransfer.setData('text/x-list', l.id); setListDrag(l.id); }}
                  onDragOver={(e) => { if (e.dataTransfer.types.includes('text/x-list')) { e.preventDefault(); setListOver(l.id); } }}
                  onDragLeave={() => setListOver(null)}
                  onDrop={(e) => { const from = e.dataTransfer.getData('text/x-list'); if (from) { e.preventDefault(); setBoard(reorderLists(board, from, l.id)); } setListDrag(null); setListOver(null); }}
                  onDragEnd={() => { setListDrag(null); setListOver(null); }}>
                  <i style={{ background: l.color }} aria-hidden />
                  {renaming?.id === l.id ? (
                    <input className="inp ws-name-in" autoFocus aria-label={t('List name')} value={renaming.name} onChange={(e) => setRenaming({ id: l.id, name: e.target.value })}
                      onBlur={commitRename} onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenaming(null); }} />
                  ) : (
                    <span className="ws-name" onDoubleClick={() => setRenaming({ id: l.id, name: l.name })}>{t(l.name)}</span>
                  )}
                  <span className="c num" aria-label={t('{{n}} cards', { n: jobs.length })}>{jobs.length}</span>
                  {canCreate && !archived && <button type="button" className="ib" style={{ width: 26, height: 26 }} aria-label={`${t('Add a card')} · ${t(l.name)}`} onClick={() => setAdding({ list: l.id, top: true, text: '' })}><Icon name="plus" size="xs" /></button>}
                  {board.lists.length > 1 && <button type="button" className="ib hide-sm" style={{ width: 26, height: 26 }} aria-label={`${t('Delete list')} · ${t(l.name)}`} onClick={() => removeList(l)}><Icon name="trash" size="xs" /></button>}
                </div>
                {adding?.list === l.id && adding.top && <AddCard t={t} value={adding.text} onChange={(text) => setAdding({ ...adding, text })} onCancel={() => setAdding(null)} onSubmit={async () => { if (await createJob(adding.text, l.id, true)) setAdding(null); }} />}
                <div className={`kcol-b${drop?.list === l.id ? ' over' : ''}`} data-list-body={l.id}
                  onDragOver={(e) => onBodyDragOver(e, l.id)} onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDrop(null); }} onDrop={(e) => onBodyDrop(e, l.id)}
                  onScroll={(e) => { const el = e.currentTarget; if (more > 0 && el.scrollHeight - el.scrollTop - el.clientHeight < 60) setVisible((v) => ({ ...v, [l.id]: lim + PAGE })); }}>
                  {q.isLoading && <><Skeleton height={90} /><Skeleton height={90} /></>}
                  {jobs.slice(0, lim).map((j) => (
                    <JobCard key={j.id} job={j} lists={board.lists} listId={l.id} dragging={dragId === j.id} canEdit={canEdit} archivedView={archived}
                      dropMark={drop?.list === l.id && drop.before === j.id ? 'before' : undefined}
                      menuOpen={menu === j.id} onMenu={(o) => setMenu(o ? j.id : null)}
                      onOpen={() => openCard(j.id)} onDragStart={(e) => onCardDragStart(e, j.id)} onDragEnd={() => { setDragId(null); setDrop(null); }}
                      onPointerDown={(e) => onCardPointerDown(e, j.id)}
                      onMove={(to) => { setMenu(null); moveTo(j.id, to, null); }} onArchive={(flag) => setArchivedFlag(j, flag)} t={t} />
                  ))}
                  {more > 0 && <button type="button" className="ws-more" onClick={() => setVisible((v) => ({ ...v, [l.id]: lim + PAGE }))}>{more} {t('more')} — {t('scroll or click to load')}</button>}
                </div>
                {canCreate && !archived && (adding?.list === l.id && !adding.top
                  ? <AddCard t={t} value={adding.text} onChange={(text) => setAdding({ ...adding, text })} onCancel={() => setAdding(null)} onSubmit={async () => { if (await createJob(adding.text, l.id, false)) setAdding({ list: l.id, top: false, text: '' }); }} />
                  : <div style={{ padding: '0 8px 8px' }}><Button variant="ghost" size="sm" icon="plus" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => setAdding({ list: l.id, top: false, text: '' })}>{t('Add a card')}</Button></div>)}
              </section>
            );
          })}
          <div className="ws-addlist">
            {addingList === null ? <Button variant="ghost" icon="plus" onClick={() => setAddingList('')}>{t('Add another list')}</Button> : (
              <form onSubmit={(e) => { e.preventDefault(); if (addingList.trim()) setBoard(addList(board, addingList)); setAddingList(null); }} className="stack" style={{ gap: 8 }}>
                <input className="inp" autoFocus aria-label={t('Enter list name...')} placeholder={t('Enter list name...')} value={addingList} onChange={(e) => setAddingList(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && setAddingList(null)} />
                <div className="row"><Button type="submit" variant="primary" size="sm">{t('Add list')}</Button><Button size="sm" variant="ghost" onClick={() => setAddingList(null)}>{t('Cancel')}</Button></div>
              </form>
            )}
          </div>
        </div>
      )}
      {ghost && ghostJob && (
        <div className="kc ws-card ws-ghost" style={{ left: ghost.x - 120, top: ghost.y - 30, ['--accent' as any]: accentFor(ghostJob.status) }} aria-hidden>
          <div className="top1"><span className="jn">{ghostJob.job_number}</span></div><h5>{ghostJob.title}</h5>
        </div>
      )}
      <Modal open={!!newJob} onClose={() => setNewJob(null)} title={t('New Job')} width={460}
        footer={<><Button variant="ghost" onClick={() => setNewJob(null)}>{t('Cancel')}</Button><Button variant="primary" disabled={!newJob?.title.trim()} onClick={async () => { if (newJob && await createJob(newJob.title, newJob.list, true)) setNewJob(null); }}>{t('Create Card')}</Button></>}>
        {newJob && (
          <form className="stack" style={{ gap: 12 }} onSubmit={async (e) => { e.preventDefault(); if (await createJob(newJob.title, newJob.list, true)) setNewJob(null); }}>
            <Field label={t('Title')} required>{(fid) => <Input id={fid} data-autofocus value={newJob.title} placeholder={t('e.g. Engine overhaul, AC repair...')} onChange={(e) => setNewJob({ ...newJob, title: e.target.value })} />}</Field>
            <Field label={t('Add to List')}>{(fid) => <Select id={fid} value={newJob.list} onChange={(e) => setNewJob({ ...newJob, list: e.target.value })} options={board.lists.map((l) => ({ value: l.id, label: t(l.name) }))} />}</Field>
            {(customer || vehicle) && <p className="muted" style={{ margin: 0 }}>{[customer?.label, vehicle?.label].filter(Boolean).join(' · ')}</p>}
          </form>
        )}
      </Modal>
      <Modal open={needCustomer} onClose={() => setNeedCustomer(false)} title={t('Customer Required')} width={420} footer={<Button variant="primary" onClick={() => setNeedCustomer(false)}>{t('OK')}</Button>}>
        <p style={{ margin: 0 }}>{t('Please select a customer from the filter bar before creating a sales invoice or quotation.')}</p>
      </Modal>
      {picking && <SelectJobsModal open onClose={() => setPicking(false)} jobs={rows.filter((j) => !j.archived)} busy={inv.busy}
        onConfirm={(ids) => {
          const single = ids.length === 1 ? rows.find((j) => j.id === ids[0]) : null;
          inv.run(ids, single?.customer_id ? { id: single.customer_id, name: single.customer_name || '' } : customer ? { id: customer.id, name: customer.data?.name || customer.label } : null);
        }} />}
      {confirmEl}
    </section>
  );
}

function AddCard({ value, onChange, onSubmit, onCancel, t }: { value: string; onChange: (v: string) => void; onSubmit: () => void; onCancel: () => void; t: (k: string) => string }) {
  return (
    <div className="ws-addcard">
      <Textarea autoFocus aria-label={t('Enter a title for this card...')} placeholder={t('Enter a title for this card...')} value={value} onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSubmit(); } if (e.key === 'Escape') onCancel(); }} />
      <div className="row"><Button variant="primary" size="sm" disabled={!value.trim()} onClick={onSubmit}>{t('Add card')}</Button><IconButton icon="x" label={t('Cancel')} onClick={onCancel} /></div>
    </div>
  );
}

interface CardProps {
  job: RepairJob; lists: KList[]; listId: string; dragging: boolean; canEdit: boolean; archivedView: boolean; dropMark?: 'before'; menuOpen: boolean;
  onMenu: (open: boolean) => void; onOpen: () => void; onDragStart: (e: DragEvent) => void; onDragEnd: () => void; onPointerDown: (e: RPointerEvent) => void;
  onMove: (list: string) => void; onArchive: (flag: boolean) => void; t: (k: string, o?: any) => string;
}

function JobCard({ job: j, lists, listId, dragging, canEdit, archivedView, dropMark, menuOpen, onMenu, onOpen, onDragStart, onDragEnd, onPointerDown, onMove, onArchive, t }: CardProps) {
  const overdue = isOverdue(j);
  const today = isDueToday(j);
  const techs = j.technician_names?.length ? j.technician_names : j.technician_name ? [j.technician_name] : [];
  const amount = j.total_with_vat || j.total || 0;
  const prog = stageProgress(listId, lists);
  const prio = overdue ? 'var(--crit)' : today ? 'var(--warn)' : 'var(--text-4)';
  return (
    <article className={`kc ws-card${dragging ? ' drag' : ''}${dropMark ? ' drop-before' : ''}`} data-card={j.id} draggable={canEdit && !archivedView}
      style={{ ['--accent' as any]: lists.length && j.status ? accentFor(j.status) : '#94a3b8' }}
      tabIndex={0} aria-label={`${j.job_number} ${j.title || ''}`}
      onDragStart={onDragStart} onDragEnd={onDragEnd} onPointerDown={onPointerDown}
      onClick={(e) => { if ((e.target as HTMLElement).closest('.ws-card-menu')) return; onOpen(); }}
      onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) onOpen(); }}
      onContextMenu={(e) => { if (dragging) e.preventDefault(); }}>
      <div className="top1">
        <span className="prio" style={{ background: prio }} title={overdue ? t('Overdue') : today ? t('Due Today') : undefined} />
        <span className="jn">{j.job_number}</span>
        <span className="spacer" />
        {j.vehicle_number && <Plate value={j.vehicle_number} />}
        <span style={{ width: 24 }} aria-hidden />
      </div>
      <h5>{j.title || t('No title')}</h5>
      {(j.brand || j.model) && <div className="meta"><Icon name="car" size="xs" /><span>{[j.brand, j.model].filter(Boolean).join(' ')}</span></div>}
      {j.customer_name && <div className="meta"><Icon name="user" size="xs" /><span><bdi>{j.customer_name}</bdi></span></div>}
      {prog > 0 && <div className="progress" role="progressbar" aria-label={t('Stage progress')} aria-valuenow={prog} aria-valuemin={0} aria-valuemax={100}><div style={{ width: `${prog}%` }} /></div>}
      {(amount > 0 || j.order_id || j.quotation_id || j.non_vat_sales_id) && (
        <div className="meta"><DocChips job={j} amounts /><span className="spacer" />{amount > 0 && <span className="amt num">{fmtMoney(amount)}</span>}</div>
      )}
      <div className="meta">
        {j.estimated_delivery ? <span className={overdue ? 'due-over' : today ? 'due-today' : undefined} style={{ display: 'flex', gap: 4, alignItems: 'center' }}><Icon name="clock" size="xs" />{t('Due')} {fmtDate(j.estimated_delivery)}</span>
          : j.date ? <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}><Icon name="clock" size="xs" />{fmtDate(j.date)}</span> : null}
        <span className="spacer" />
        {techs.length ? (
          <span className="ws-avs" title={techs.join(', ')}>{techs.slice(0, 3).map((n, i) => <span key={i} className={`av sm${i === 1 ? ' a2' : i === 2 ? ' a3' : ''}`}>{initials(n)}</span>)}</span>
        ) : <span className="tag">{t('Unassigned')}</span>}
      </div>
      <div className="ws-card-menu">
        <button type="button" className="ib" style={{ width: 26, height: 26 }} aria-label={`${t('Actions')} ${j.job_number}`} aria-expanded={menuOpen} aria-haspopup="menu"
          onClick={(e) => { e.stopPropagation(); onMenu(!menuOpen); }} onPointerDown={(e) => e.stopPropagation()}><Icon name="more" size="s" /></button>
        {menuOpen && (
          <div className="ws-menu" role="menu" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.key === 'Escape' && onMenu(false)}>
            <button role="menuitem" type="button" onClick={onOpen}><Icon name="eye" size="s" />{t('Open Card')}</button>
            {canEdit && !archivedView && <>
              <div className="sep" /><div className="h">{t('Move to')}</div>
              {lists.filter((l) => l.id !== listId).map((l) => <button key={l.id} role="menuitem" type="button" onClick={() => onMove(l.id)}><i style={{ width: 8, height: 8, borderRadius: '50%', background: l.color }} />{t(l.name)}</button>)}
            </>}
            {canEdit && <><div className="sep" /><button role="menuitem" type="button" onClick={() => onArchive(!archivedView)}><Icon name={archivedView ? 'undo' : 'inbox'} size="s" />{t(archivedView ? 'Unarchive' : 'Archive')}</button></>}
          </div>
        )}
      </div>
    </article>
  );
}
