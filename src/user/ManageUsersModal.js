import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Modal, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import UserCreate from './create.js';
import ChangePasswordModal from './ChangePasswordModal.js';
import PaginationControls from '../utils/PaginationControls.js';

const ACCENT = '#004ac6';
const isManager = () => localStorage.getItem('user_role') === 'Manager';
const isAdmin = () =>
    localStorage.getItem('user_role') === 'Admin' ||
    localStorage.getItem('admin') === 'true';

// Allowed roles that a Manager can create/manage
const MANAGER_ALLOWED_ROLES = ['Manager', 'SalesMan'];

const BADGE = {
    Manager: { bg: '#dbeafe', color: '#1d4ed8' },
    SalesMan: { bg: '#dcfce7', color: '#15803d' },
    Admin: { bg: '#fef3c7', color: '#92400e' },
};

function RoleBadge({ role }) {
    const s = BADGE[role] || { bg: '#f3f4f6', color: '#374151' };
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            padding: '2px 8px', borderRadius: '12px',
            background: s.bg, color: s.color, fontSize: '11px', fontWeight: 700,
            fontFamily: '"Inter", sans-serif', letterSpacing: '0.02em',
        }}>
            {role}
        </span>
    );
}

function StatusBadge({ active }) {
    const { t } = useTranslation('common');
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            padding: '2px 8px', borderRadius: '12px',
            background: active ? '#dcfce7' : '#fee2e2',
            color: active ? '#15803d' : '#dc2626',
            fontSize: '11px', fontWeight: 700, fontFamily: '"Inter", sans-serif',
        }}>
            <span style={{
                width: '6px', height: '6px', borderRadius: '50%',
                background: active ? '#16a34a' : '#dc2626', display: 'inline-block',
            }} />
            {active ? t('Active') : t('Inactive')}
        </span>
    );
}

function ActionBtn({ icon, title, color, onClick, disabled }) {
    return (
        <button
            type="button"
            title={title}
            onClick={onClick}
            disabled={disabled}
            style={{
                width: '30px', height: '30px', borderRadius: '6px',
                border: `1px solid ${color}20`, background: `${color}12`,
                color, cursor: disabled ? 'not-allowed' : 'pointer',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '13px', opacity: disabled ? 0.5 : 1,
            }}
        >
            <i className={`bi ${icon}`}></i>
        </button>
    );
}

const ManageUsersModal = forwardRef((props, ref) => {
    const [show, setShow] = useState(false);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchName, setSearchName] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [togglingId, setTogglingId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [showInactive, setShowInactive] = useState(false);

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);

    const { t } = useTranslation('common');

    const userCreateRef = useRef(null);
    const changePwRef = useRef(null);

    useImperativeHandle(ref, () => ({
        open() {
            setSearchName('');
            setRoleFilter('');
            setShowInactive(false);
            setPage(1);
            setShow(true);
            // list() called in useEffect on show change
        },
    }));

    // Initial load + page/pageSize changes
    useEffect(() => {
        if (!show) return;
        list();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show, page, pageSize]);

    // Role / inactive filter changes: reset to page 1 and reload
    useEffect(() => {
        if (!show) return;
        setPage(1);
        fetchUsers(true, 1, pageSize);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roleFilter, showInactive]);

    // Poll online status silently every 15 s while the modal is open.
    useEffect(() => {
        if (!show) return;
        const interval = setInterval(() => silentRefresh(), 15000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show, roleFilter, showInactive, searchName]);

    useEffect(() => {
        if (!show) return;
        const timer = setTimeout(() => {
            setPage(1);
            fetchUsers(true, 1, pageSize);
        }, 300);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchName]);

    function buildQuery(currentPage, currentPageSize) {
        const params = new URLSearchParams();
        if (searchName) params.set('search[name]', searchName);
        if (roleFilter) params.set('search[role]', roleFilter);
        if (showInactive) params.set('search[deleted]', '1');
        params.set('limit', String(currentPageSize));
        params.set('page', String(currentPage));
        return params.toString();
    }

    function fetchUsers(showSpinner, currentPage, currentPageSize) {
        if (showSpinner) setLoading(true);
        fetch(`/v1/user?${buildQuery(currentPage, currentPageSize)}`, {
            headers: { Authorization: localStorage.getItem('access_token') },
        })
            .then(r => r.json())
            .then(data => {
                if (showSpinner) setLoading(false);
                if (data.status && data.result) {
                    let result = data.result;
                    if (!isAdmin()) {
                        result = result.filter(u => u.role !== 'Admin' && !u.admin);
                    }
                    setUsers(result);
                    setTotalCount(data.total_count || 0);
                } else if (showSpinner) {
                    setUsers([]);
                    setTotalCount(0);
                }
            })
            .catch(() => { if (showSpinner) { setLoading(false); setUsers([]); setTotalCount(0); } });
    }

    function list() { fetchUsers(true, page, pageSize); }
    function silentRefresh() { fetchUsers(false, page, pageSize); }

    function openCreate() {
        if (userCreateRef.current) userCreateRef.current.open();
    }

    function openEdit(user) {
        if (userCreateRef.current) userCreateRef.current.open(user.id);
    }

    function openChangePassword(user) {
        if (changePwRef.current) {
            changePwRef.current.open(user.id, user.name, true);
        }
    }

    function toggleStatus(user) {
        if (!window.confirm(
            user.deleted
                ? t('Activate user confirm', { name: user.name })
                : t('Deactivate user confirm', { name: user.name })
        )) return;

        setTogglingId(user.id);
        fetch(`/v1/user/${user.id}/toggle-status`, {
            method: 'PATCH',
            headers: { Authorization: localStorage.getItem('access_token') },
        })
            .then(r => r.json())
            .then(data => {
                setTogglingId(null);
                if (data.status) {
                    list();
                    if (props.showToastMessage) props.showToastMessage(data.result, 'success');
                } else {
                    const msg = data.errors ? Object.values(data.errors).join('; ') : t('Failed to toggle status');
                    if (props.showToastMessage) props.showToastMessage(msg, 'danger');
                }
            })
            .catch(() => {
                setTogglingId(null);
                if (props.showToastMessage) props.showToastMessage(t('Network error'), 'danger');
            });
    }

    function deleteUser(user) {
        if (!window.confirm(t('Delete user confirm', { name: user.name }))) return;
        setDeletingId(user.id);
        fetch(`/v1/user/${user.id}`, {
            method: 'DELETE',
            headers: { Authorization: localStorage.getItem('access_token') },
        })
            .then(r => r.json())
            .then(data => {
                setDeletingId(null);
                if (data.status) {
                    list();
                    if (props.showToastMessage) props.showToastMessage(t('User deleted'), 'success');
                } else {
                    const msg = data.errors ? Object.values(data.errors).join('; ') : t('Failed to delete user');
                    if (props.showToastMessage) props.showToastMessage(msg, 'danger');
                }
            })
            .catch(() => {
                setDeletingId(null);
                if (props.showToastMessage) props.showToastMessage(t('Network error'), 'danger');
            });
    }

    const roleOptions = isAdmin()
        ? ['Manager', 'SalesMan', 'Admin']
        : MANAGER_ALLOWED_ROLES;

    const canDelete = (u) => isAdmin();

    return (
        <>
            <Modal
                show={show}
                fullscreen
                onHide={() => setShow(false)}
                animation={false}
                backdrop="static"
                dialogClassName="mum-modal"
            >
                <style>{`
                  .mum-modal .modal-content { display: flex; flex-direction: column; height: 100%; background: #f4f6fb; }
                  .mum-table th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #6b7280; font-weight: 700; border-bottom: 2px solid #e5e7eb; padding: 10px 14px; white-space: nowrap; background: #fff; }
                  .mum-table td { padding: 12px 14px; border-bottom: 1px solid #f0f2f5; vertical-align: middle; font-size: 13px; color: #374151; }
                  .mum-table tr:hover td { background: #f8faff; }
                  .mum-row-inactive td { opacity: 0.6; }
                  .mum-search-input { border: 1px solid #d1d5db; border-radius: 8px; padding: 8px 14px; font-size: 13px; outline: none; font-family: "Inter", sans-serif; color: #374151; background: #fff; }
                  .mum-search-input:focus { border-color: #004ac6; box-shadow: 0 0 0 3px #004ac620; }
                `}</style>

                {/* ── Header ── */}
                <div style={{
                    background: '#fff', borderBottom: '1px solid #e5e7eb',
                    padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0,
                }}>
                    <button
                        type="button"
                        onClick={() => setShow(false)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600 }}
                        onMouseEnter={e => e.currentTarget.style.color = '#111'}
                        onMouseLeave={e => e.currentTarget.style.color = '#6b7280'}
                    >
                        <i className="bi bi-arrow-left" style={{ fontSize: '16px' }}></i> {t('Back')}
                    </button>

                    <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: '"Hanken Grotesk", sans-serif', fontSize: '18px', fontWeight: 700, color: '#111827' }}>
                            <i className="bi bi-people-fill me-2" style={{ color: ACCENT }}></i>
                            {t('Manage Users')}
                        </div>
                        <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px', fontFamily: '"Inter", sans-serif' }}>
                            {isManager() ? t('Create and manage Manager & SalesMan accounts for your stores') : t('Full user management')}
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={openCreate}
                        style={{
                            background: ACCENT, color: '#fff', border: 'none', borderRadius: '8px',
                            padding: '9px 18px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                            display: 'inline-flex', alignItems: 'center', gap: '7px', fontFamily: '"Inter", sans-serif',
                        }}
                    >
                        <i className="bi bi-person-plus-fill"></i>
                        {t('New User')}
                    </button>
                    <button
                        type="button"
                        onClick={() => setShow(false)}
                        aria-label="Close"
                        style={{
                            width: '34px', height: '34px', borderRadius: '8px',
                            background: '#f3f4f6', border: '1px solid #e5e7eb',
                            cursor: 'pointer', color: '#6b7280', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#dc2626'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.color = '#6b7280'; }}
                    >
                        <i className="bi bi-x-lg" style={{ fontSize: '15px' }}></i>
                    </button>
                </div>

                {/* ── Toolbar / Filter bar ── */}
                <div style={{
                    background: '#fff', borderBottom: '1px solid #e5e7eb',
                    padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flexShrink: 0,
                }}>
                    <div style={{ display: 'flex', gap: '10px', flex: 1, flexWrap: 'wrap' }}>
                        <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: '320px' }}>
                            <i className="bi bi-search" style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: '13px' }}></i>
                            <input
                                className="mum-search-input"
                                style={{ width: '100%', paddingLeft: '32px' }}
                                placeholder={t('Search by name…')}
                                value={searchName}
                                onChange={e => setSearchName(e.target.value)}
                            />
                        </div>

                        <select
                            className="mum-search-input"
                            value={roleFilter}
                            onChange={e => setRoleFilter(e.target.value)}
                            style={{ minWidth: '140px' }}
                        >
                            <option value="">{t('All Roles')}</option>
                            {roleOptions.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>

                    {/* Show Inactive toggle */}
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#374151', fontFamily: '"Inter", sans-serif', userSelect: 'none' }}>
                        <div
                            onClick={() => setShowInactive(v => !v)}
                            style={{
                                width: '38px', height: '20px', borderRadius: '10px',
                                background: showInactive ? ACCENT : '#d1d5db', cursor: 'pointer',
                                position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                            }}
                        >
                            <div style={{
                                position: 'absolute', top: '2px', left: showInactive ? '19px' : '2px',
                                width: '16px', height: '16px', borderRadius: '50%', background: '#fff',
                                transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                            }} />
                        </div>
                        {t('Show Inactive')}
                    </label>
                </div>

                {/* ── Table ── */}
                <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af' }}>
                            <Spinner animation="border" style={{ color: ACCENT }} />
                            <div style={{ marginTop: '12px', fontSize: '14px' }}>{t('Loading users…')}</div>
                        </div>
                    ) : users.length === 0 ? (
                        <div style={{
                            textAlign: 'center', padding: '60px', color: '#9ca3af',
                            background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb',
                        }}>
                            <i className="bi bi-people" style={{ fontSize: '48px', color: '#d1d5db' }}></i>
                            <div style={{ marginTop: '12px', fontSize: '15px', fontWeight: 600, color: '#6b7280' }}>{t('No users found')}</div>
                            <div style={{ marginTop: '6px', fontSize: '13px' }}>{t('Try adjusting your filters or create a new user.')}</div>
                        </div>
                    ) : (
                        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                            <div style={{ padding: '10px 14px', borderBottom: '1px solid #f0f2f5', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                <PaginationControls
                                    showSizePicker={true}
                                    totalPages={Math.ceil(totalCount / pageSize) || 1}
                                    page={page}
                                    totalItems={totalCount}
                                    offset={(page - 1) * pageSize}
                                    currentPageItemsCount={users.length}
                                    pageSize={pageSize}
                                    onPageChange={(newPage) => setPage(newPage)}
                                    onPageSizeChange={(size) => { setPageSize(parseInt(size)); setPage(1); }}
                                    pageSizes={[10, 20, 50, 100]}
                                />
                            </div>
                            <table className="mum-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr>
                                        <th>{t('Name')}</th>
                                        <th>{t('Email / Phone')}</th>
                                        <th>{t('Role')}</th>
                                        <th>{t('Stores')}</th>
                                        <th>{t('Status')}</th>
                                        <th style={{ textAlign: 'right' }}>{t('Actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(u => (
                                        <tr key={u.id} className={u.deleted ? 'mum-row-inactive' : ''}>
                                            {/* Name */}
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div style={{
                                                        width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
                                                        background: ACCENT, color: '#fff',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontSize: '14px', fontWeight: 700,
                                                    }}>
                                                        {(u.name || '?').charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 600, color: '#111827' }}>{u.name}</div>
                                                        {u.online && (
                                                            <div style={{ fontSize: '11px', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
                                                                {t('Online')}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Email / Phone */}
                                            <td>
                                                <div style={{ fontSize: '13px', color: '#374151' }}>{u.email}</div>
                                                {u.mob && <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>{u.mob}</div>}
                                            </td>

                                            {/* Role */}
                                            <td><RoleBadge role={u.role || '—'} /></td>

                                            {/* Stores */}
                                            <td>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '200px' }}>
                                                    {(u.store_names || []).slice(0, 3).map((s, i) => (
                                                        <span key={i} style={{
                                                            padding: '1px 7px', borderRadius: '10px',
                                                            background: '#f0f4ff', color: '#3b5fc4',
                                                            fontSize: '11px', fontWeight: 600,
                                                        }}>{s}</span>
                                                    ))}
                                                    {(u.store_names || []).length > 3 && (
                                                        <span style={{ fontSize: '11px', color: '#9ca3af' }}>+{u.store_names.length - 3} {t('more')}</span>
                                                    )}
                                                    {!(u.store_names || []).length && (
                                                        <span style={{ fontSize: '12px', color: '#d1d5db' }}>—</span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Status */}
                                            <td><StatusBadge active={!u.deleted} /></td>

                                            {/* Actions */}
                                            <td>
                                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                                                    <ActionBtn
                                                        icon="bi-pencil"
                                                        title={t('Edit user')}
                                                        color="#3b82f6"
                                                        onClick={() => openEdit(u)}
                                                    />
                                                    <ActionBtn
                                                        icon="bi-key"
                                                        title={t('Change password')}
                                                        color="#8b5cf6"
                                                        onClick={() => openChangePassword(u)}
                                                    />
                                                    <ActionBtn
                                                        icon={u.deleted ? 'bi-person-check' : 'bi-person-slash'}
                                                        title={u.deleted ? t('Activate user') : t('Deactivate user')}
                                                        color={u.deleted ? '#16a34a' : '#f59e0b'}
                                                        onClick={() => toggleStatus(u)}
                                                        disabled={togglingId === u.id}
                                                    />
                                                    {canDelete(u) && (
                                                        <ActionBtn
                                                            icon="bi-trash3"
                                                            title={t('Delete user permanently')}
                                                            color="#dc2626"
                                                            onClick={() => deleteUser(u)}
                                                            disabled={deletingId === u.id}
                                                        />
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </Modal>

            {/* Sub-modals */}
            <UserCreate
                ref={userCreateRef}
                showToastMessage={props.showToastMessage}
                refreshList={list}
                managerMode={isManager()}
            />
            <ChangePasswordModal
                ref={changePwRef}
                showToastMessage={props.showToastMessage}
            />
        </>
    );
});

export default ManageUsersModal;
