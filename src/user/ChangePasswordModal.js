import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { Modal, Spinner } from 'react-bootstrap';

const ACCENT = '#004ac6';

function passwordStrength(pw) {
    if (!pw) return { score: 0, label: '', color: '#e0e0e0' };
    let score = 0;
    if (pw.length >= 6) score++;
    if (pw.length >= 10) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 1) return { score, label: 'Weak', color: '#e53935' };
    if (score === 2) return { score, label: 'Fair', color: '#fb8c00' };
    if (score === 3) return { score, label: 'Good', color: '#f9a825' };
    return { score, label: 'Strong', color: '#43a047' };
}

const EyeToggle = ({ show, onToggle }) => (
    <button
        type="button"
        onClick={onToggle}
        tabIndex={-1}
        style={{
            position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer', color: '#666', padding: '2px',
            display: 'flex', alignItems: 'center',
        }}
    >
        <i className={`bi ${show ? 'bi-eye-slash' : 'bi-eye'}`} style={{ fontSize: '15px' }}></i>
    </button>
);

const INPUT = {
    border: '1px solid #c3c6d7', borderRadius: '6px', padding: '9px 36px 9px 12px',
    fontSize: '14px', width: '100%', outline: 'none', color: '#191c1e', background: '#fff',
    fontFamily: '"Inter", sans-serif',
};

const ChangePasswordModal = forwardRef((props, ref) => {
    const [show, setShow] = useState(false);
    const [targetUserId, setTargetUserId] = useState(null);
    const [targetUserName, setTargetUserName] = useState('');
    const [skipCurrentPassword, setSkipCurrentPassword] = useState(false);

    const [currentPw, setCurrentPw] = useState('');
    const [newPw, setNewPw] = useState('');
    const [confirmPw, setConfirmPw] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

    useImperativeHandle(ref, () => ({
        // open(userId, userName, skipCurrent)
        // skipCurrent=true: Manager changing another user's password (no old pw needed)
        open(userId, userName, skipCurrent) {
            setTargetUserId(userId);
            setTargetUserName(userName || '');
            setSkipCurrentPassword(!!skipCurrent);
            setCurrentPw('');
            setNewPw('');
            setConfirmPw('');
            setErrors({});
            setSuccessMsg('');
            setShow(true);
        },
    }));

    function handleClose() {
        setShow(false);
    }

    const strength = passwordStrength(newPw);

    function validate() {
        const errs = {};
        if (!skipCurrentPassword && !currentPw) {
            errs.current_password = 'Current password is required';
        }
        if (!newPw) {
            errs.new_password = 'New password is required';
        } else if (newPw.length < 6) {
            errs.new_password = 'Must be at least 6 characters';
        }
        if (!confirmPw) {
            errs.confirm_password = 'Please confirm your new password';
        } else if (newPw !== confirmPw) {
            errs.confirm_password = 'Passwords do not match';
        }
        return errs;
    }

    function handleSubmit(e) {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length) { setErrors(errs); return; }

        setSaving(true);
        setErrors({});

        const uid = targetUserId || localStorage.getItem('user_id');
        const body = { new_password: newPw };
        if (!skipCurrentPassword) body.current_password = currentPw;

        fetch(`/v1/user/${uid}/change-password`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: localStorage.getItem('access_token'),
            },
            body: JSON.stringify(body),
        })
            .then(async res => {
                const data = await res.json();
                setSaving(false);
                if (!res.ok || !data.status) {
                    setErrors(data.errors || { new_password: 'Failed to change password' });
                    return;
                }
                setSuccessMsg('Password changed successfully!');
                setTimeout(() => setShow(false), 1500);
                if (props.showToastMessage) props.showToastMessage('Password changed successfully!', 'success');
            })
            .catch(() => {
                setSaving(false);
                setErrors({ new_password: 'Network error — please try again' });
            });
    }

    const isSelf = !targetUserId || targetUserId === localStorage.getItem('user_id');
    const title = isSelf
        ? 'Change Your Password'
        : `Change Password — ${targetUserName}`;

    return (
        <Modal show={show} onHide={handleClose} centered animation={false} backdrop="static" size="sm">
            <style>{`
              .cpw-modal .modal-content {
                border-radius: 16px;
                border: none;
                box-shadow: 0 20px 60px rgba(0,0,0,0.18);
                overflow: hidden;
              }
            `}</style>

            {/* Header */}
            <div style={{
                background: 'linear-gradient(135deg, #004ac6 0%, #1565c0 100%)',
                padding: '24px 24px 20px',
                color: '#fff',
            }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                            <div style={{
                                width: '36px', height: '36px', borderRadius: '50%',
                                background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <i className="bi bi-shield-lock-fill" style={{ fontSize: '18px' }}></i>
                            </div>
                            <div style={{ fontFamily: '"Hanken Grotesk", sans-serif', fontSize: '17px', fontWeight: 700 }}>
                                {title}
                            </div>
                        </div>
                        {!isSelf && (
                            <div style={{ fontSize: '12px', opacity: 0.8, marginLeft: '46px' }}>
                                No current password required
                            </div>
                        )}
                    </div>
                    <button onClick={handleClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className="bi bi-x" style={{ fontSize: '18px' }}></i>
                    </button>
                </div>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit}>
                <div style={{ padding: '24px', background: '#fff' }}>

                    {successMsg && (
                        <div style={{
                            background: '#d1fae5', border: '1px solid #a7f3d0', borderRadius: '8px',
                            padding: '12px 16px', marginBottom: '16px', color: '#065f46',
                            display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '14px',
                        }}>
                            <i className="bi bi-check-circle-fill" style={{ fontSize: '16px' }}></i>
                            {successMsg}
                        </div>
                    )}

                    {Object.keys(errors).filter(k => !['current_password', 'new_password', 'confirm_password'].includes(k)).map(k => (
                        <div key={k} style={{
                            background: '#fde8e8', border: '1px solid #f5c6c6', borderRadius: '8px',
                            padding: '10px 14px', marginBottom: '14px', color: '#c62828', fontSize: '13px',
                        }}>
                            <i className="bi bi-exclamation-circle-fill me-2"></i>{errors[k]}
                        </div>
                    ))}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

                        {/* Current Password */}
                        {!skipCurrentPassword && (
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                                    Current Password <span style={{ color: '#dc2626' }}>*</span>
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showCurrent ? 'text' : 'password'}
                                        value={currentPw}
                                        onChange={e => { setCurrentPw(e.target.value); setErrors(p => ({ ...p, current_password: '' })); }}
                                        style={{ ...INPUT, borderColor: errors.current_password ? '#dc2626' : '#c3c6d7' }}
                                        placeholder="Enter current password"
                                        autoFocus
                                    />
                                    <EyeToggle show={showCurrent} onToggle={() => setShowCurrent(v => !v)} />
                                </div>
                                {errors.current_password && (
                                    <div style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px' }}>
                                        <i className="bi bi-x-circle me-1"></i>{errors.current_password}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* New Password */}
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                                New Password <span style={{ color: '#dc2626' }}>*</span>
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showNew ? 'text' : 'password'}
                                    value={newPw}
                                    onChange={e => { setNewPw(e.target.value); setErrors(p => ({ ...p, new_password: '' })); }}
                                    style={{ ...INPUT, borderColor: errors.new_password ? '#dc2626' : '#c3c6d7' }}
                                    placeholder="Enter new password"
                                    autoFocus={!!skipCurrentPassword}
                                />
                                <EyeToggle show={showNew} onToggle={() => setShowNew(v => !v)} />
                            </div>
                            {/* Strength meter */}
                            {newPw && (
                                <div style={{ marginTop: '8px' }}>
                                    <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                                        {[1, 2, 3, 4].map(i => (
                                            <div key={i} style={{
                                                flex: 1, height: '4px', borderRadius: '2px',
                                                background: strength.score >= i ? strength.color : '#e5e7eb',
                                                transition: 'background 0.2s',
                                            }} />
                                        ))}
                                    </div>
                                    <div style={{ fontSize: '11px', color: strength.color, fontWeight: 600 }}>
                                        {strength.label}
                                    </div>
                                </div>
                            )}
                            {errors.new_password && (
                                <div style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px' }}>
                                    <i className="bi bi-x-circle me-1"></i>{errors.new_password}
                                </div>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                                Confirm New Password <span style={{ color: '#dc2626' }}>*</span>
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showConfirm ? 'text' : 'password'}
                                    value={confirmPw}
                                    onChange={e => { setConfirmPw(e.target.value); setErrors(p => ({ ...p, confirm_password: '' })); }}
                                    style={{
                                        ...INPUT,
                                        borderColor: errors.confirm_password ? '#dc2626'
                                            : (confirmPw && confirmPw === newPw) ? '#16a34a' : '#c3c6d7',
                                    }}
                                    placeholder="Repeat new password"
                                />
                                <EyeToggle show={showConfirm} onToggle={() => setShowConfirm(v => !v)} />
                            </div>
                            {confirmPw && confirmPw === newPw && !errors.confirm_password && (
                                <div style={{ color: '#16a34a', fontSize: '12px', marginTop: '4px' }}>
                                    <i className="bi bi-check-circle me-1"></i>Passwords match
                                </div>
                            )}
                            {errors.confirm_password && (
                                <div style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px' }}>
                                    <i className="bi bi-x-circle me-1"></i>{errors.confirm_password}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    padding: '16px 24px', background: '#f8fafc',
                    borderTop: '1px solid #e5e7eb',
                    display: 'flex', gap: '10px', justifyContent: 'flex-end',
                }}>
                    <button type="button" onClick={handleClose}
                        style={{
                            padding: '9px 20px', borderRadius: '8px', border: '1px solid #d1d5db',
                            background: '#fff', color: '#374151', cursor: 'pointer',
                            fontSize: '14px', fontWeight: 600, fontFamily: '"Inter", sans-serif',
                        }}>
                        Cancel
                    </button>
                    <button type="submit" disabled={saving}
                        style={{
                            padding: '9px 24px', borderRadius: '8px', border: 'none',
                            background: saving ? '#93c5fd' : ACCENT, color: '#fff',
                            cursor: saving ? 'not-allowed' : 'pointer',
                            fontSize: '14px', fontWeight: 600, fontFamily: '"Inter", sans-serif',
                            display: 'inline-flex', alignItems: 'center', gap: '8px',
                        }}>
                        {saving && <Spinner animation="border" size="sm" />}
                        {saving ? 'Changing…' : 'Change Password'}
                    </button>
                </div>
            </form>
        </Modal>
    );
});

export default ChangePasswordModal;
