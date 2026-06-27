import React, { useState, forwardRef, useImperativeHandle } from "react";
import { Modal } from 'react-bootstrap';


const UserView = forwardRef((props, ref) => {

    useImperativeHandle(ref, () => ({
        open(id) {
            if (id) {
                getUser(id);
                SetShow(true);
            }
        },
    }));

    let [model, setModel] = useState({});


    const [show, SetShow] = useState(false);

    function handleClose() {
        SetShow(false);
    };

    function getUser(id) {
        console.log("inside get User");
        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': localStorage.getItem('access_token'),
            },
        };

        fetch('/v1/user/' + id, requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();

                // check for error response
                if (!response.ok) {
                    const error = (data && data.errors);
                    return Promise.reject(error);
                }

                console.log("Response:");
                console.log(data);

                model = data.result;
                setModel({ ...model });
            })
            .catch(error => {
                // handle error
            });
    }

    // Function to format battery level as a percentage
    const formatBattery = (battery) => {
        return battery !== 'N/A' ? `${(parseFloat(battery) * 100).toFixed(0)}%` : 'Unknown';
    };

    const countryTimezoneMap = {
        'SA': 'Asia/Riyadh', 'AE': 'Asia/Dubai', 'KW': 'Asia/Kuwait',
        'QA': 'Asia/Qatar', 'BH': 'Asia/Bahrain', 'OM': 'Asia/Muscat',
        'IN': 'Asia/Kolkata', 'PK': 'Asia/Karachi', 'BD': 'Asia/Dhaka',
        'LK': 'Asia/Colombo', 'NP': 'Asia/Kathmandu', 'MY': 'Asia/Kuala_Lumpur',
        'SG': 'Asia/Singapore', 'PH': 'Asia/Manila', 'ID': 'Asia/Jakarta',
        'EG': 'Africa/Cairo', 'JO': 'Asia/Amman', 'LB': 'Asia/Beirut',
        'IQ': 'Asia/Baghdad', 'IR': 'Asia/Tehran', 'TR': 'Europe/Istanbul',
        'GB': 'Europe/London', 'DE': 'Europe/Berlin', 'FR': 'Europe/Paris',
        'US': 'America/New_York', 'CA': 'America/Toronto', 'AU': 'Australia/Sydney',
    };

    function formatInStoreTimezone(dateStr) {
        if (!dateStr) return '';
        const tz = countryTimezoneMap[localStorage.getItem('store_country_code')] || 'UTC';
        const tzLabel = tz.replace(/_/g, ' ');
        try {
            const d = new Date(dateStr);
            const formatted = d.toLocaleString('en-US', {
                timeZone: tz,
                year: 'numeric', month: 'short', day: '2-digit',
                hour: '2-digit', minute: '2-digit', second: '2-digit',
                hour12: true,
            });
            return `${formatted} (${tzLabel})`;
        } catch {
            return dateStr;
        }
    }

    const infoCard = (label, value, icon) => (
        <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#434655', lineHeight: '16px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {icon && <i className={`bi ${icon}`} style={{ marginRight: '6px', color: '#505f76' }}></i>}
                {label}
            </span>
            <span style={{ fontSize: '15px', fontWeight: 500, lineHeight: '22px', color: '#191c1e', wordBreak: 'break-word' }}>
                {value || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>—</span>}
            </span>
        </div>
    );

    return (
        <>
            <Modal show={show} size="xl" onHide={handleClose} animation={false} scrollable={true}>
                <Modal.Body className="p-0" style={{ backgroundColor: '#f7f9fb', fontFamily: "'Inter', sans-serif", position: 'relative' }}>

                    {/* Close button - always top right */}
                    <button
                        type="button"
                        className="btn-close"
                        onClick={handleClose}
                        aria-label="Close"
                        style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 10 }}
                    ></button>

                    {/* Page Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center flex-wrap" style={{ padding: '24px 32px 20px', gap: '16px', borderBottom: '1px solid #c3c6d7' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
<button onClick={handleClose} style={{ display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #c3c6d7', backgroundColor: '#ffffff', color: '#434655', padding: '6px 12px', borderRadius: '4px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
                                    <i className="bi bi-arrow-left" style={{ fontSize: '14px' }}></i>
                                    Back
                                </button>
                                <h1 style={{ margin: 0, fontSize: '30px', lineHeight: '38px', fontWeight: 700, letterSpacing: '-0.02em', fontFamily: "'Hanken Grotesk', sans-serif", color: '#191c1e' }}>
                                    {model.name || 'Details of User'}
                                </h1>
                                {model.role && (
                                    <span style={{ backgroundColor: '#dbeafe', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '2px 8px', borderRadius: '2px', fontSize: '12px', fontWeight: 500, lineHeight: '14px' }}>
                                        {model.role}
                                    </span>
                                )}
                                {model.admin && (
                                    <span style={{ backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', padding: '2px 8px', borderRadius: '2px', fontSize: '12px', fontWeight: 500, lineHeight: '14px' }}>
                                        Admin
                                    </span>
                                )}
                            </div>
                            {model.email && (
                                <p style={{ margin: 0, fontSize: '14px', lineHeight: '20px', color: '#434655', fontWeight: 400 }}>
                                    {model.email}
                                </p>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center" style={{ gap: '8px', paddingRight: '32px' }}>
                            {props.openUpdateForm && (
                                <button onClick={() => { handleClose(); props.openUpdateForm(model.id); }} style={{ display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #c3c6d7', backgroundColor: '#f7f9fb', color: '#191c1e', padding: '8px 24px', borderRadius: '4px', fontSize: '13px', fontWeight: 600, lineHeight: '16px', cursor: 'pointer' }}>
                                    <i className="bi bi-pencil" style={{ fontSize: '16px' }}></i>
                                    Edit
                                </button>
                            )}
                            {props.openCreateForm && (
                                <button onClick={() => { handleClose(); props.openCreateForm(); }} style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#004ac6', color: '#ffffff', border: 'none', padding: '8px 24px', borderRadius: '4px', fontSize: '13px', fontWeight: 600, lineHeight: '16px', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                                    <i className="bi bi-plus" style={{ fontSize: '16px' }}></i>
                                    Create
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Main scrollable content */}
                    <div className="p-md md:p-xl" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

                        {/* Profile Info Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-lg">
                            {infoCard('Name', model.name, 'bi-person')}
                            {infoCard('Email', model.email, 'bi-envelope')}
                            {infoCard('Mobile', model.mob, 'bi-phone')}
                            {infoCard('Role', model.role, 'bi-shield')}
                            {infoCard('Admin', model.admin ? 'Yes' : 'No', 'bi-person-check')}
                            {infoCard('Password', '***********', 'bi-lock')}
                        </div>

                        {/* Audit Info Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-lg">
                            {infoCard('Created At', formatInStoreTimezone(model.created_at), 'bi-calendar-plus')}
                            {infoCard('Updated At', formatInStoreTimezone(model.updated_at), 'bi-calendar-check')}
                            {infoCard('Created By', model.created_by_name, 'bi-person-plus')}
                            {infoCard('Updated By', model.updated_by_name, 'bi-person-gear')}
                        </div>

                        {/* Devices Section */}
                        <section style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                            <div style={{ padding: '12px 24px', borderBottom: '1px solid #c3c6d7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f2f4f6' }}>
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, lineHeight: '26px', fontFamily: "'Hanken Grotesk', sans-serif", color: '#191c1e' }}>
                                    <i className="bi bi-laptop" style={{ marginRight: '8px', color: '#505f76' }}></i>
                                    User Devices
                                </h3>
                                {model.devices && (
                                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#434655' }}>
                                        {Object.keys(model.devices).length} Device(s)
                                    </span>
                                )}
                            </div>

                            {model.devices && Object.keys(model.devices).length > 0 ? (
                                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {Object.keys(model.devices).map((deviceKey) => {
                                        const device = model.devices[deviceKey];
                                        return (
                                            <div key={device.device_id} style={{ padding: '20px', backgroundColor: '#f2f4f6', borderRadius: '6px', border: '1px solid #c3c6d7' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                                    <i className="bi bi-display" style={{ fontSize: '18px', color: '#505f76' }}></i>
                                                    <span style={{ fontSize: '15px', fontWeight: 600, color: '#191c1e', fontFamily: "'Hanken Grotesk', sans-serif" }}>
                                                        {device.device_id}
                                                    </span>
                                                    <span style={{
                                                        backgroundColor: device.connected ? '#dcfce7' : '#fee2e2',
                                                        color: device.connected ? '#15803d' : '#991b1b',
                                                        border: `1px solid ${device.connected ? '#bbf7d0' : '#fecaca'}`,
                                                        padding: '2px 8px', borderRadius: '2px', fontSize: '11px', fontWeight: 500
                                                    }}>
                                                        {device.connected ? 'Online' : 'Offline'}
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-lg" style={{ gap: '16px' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                        <span style={{ fontSize: '12px', fontWeight: 500, color: '#434655', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Device Type</span>
                                                        <span style={{ fontSize: '14px', color: '#191c1e' }}>{device.device_type || '—'}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                        <span style={{ fontSize: '12px', fontWeight: 500, color: '#434655', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Platform</span>
                                                        <span style={{ fontSize: '14px', color: '#191c1e' }}>{device.platform || '—'}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                        <span style={{ fontSize: '12px', fontWeight: 500, color: '#434655', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Screen Resolution</span>
                                                        <span style={{ fontSize: '14px', color: '#191c1e' }}>{device.screen_width} x {device.screen_height}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                        <span style={{ fontSize: '12px', fontWeight: 500, color: '#434655', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Touch</span>
                                                        <span style={{ fontSize: '14px', color: '#191c1e' }}>{device.touch ? 'Yes' : 'No'}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                        <span style={{ fontSize: '12px', fontWeight: 500, color: '#434655', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Battery Level</span>
                                                        <span style={{ fontSize: '14px', color: '#191c1e' }}>{formatBattery(device.battery)}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                        <span style={{ fontSize: '12px', fontWeight: 500, color: '#434655', textTransform: 'uppercase', letterSpacing: '0.05em' }}>IP Address</span>
                                                        <span style={{ fontSize: '14px', color: '#191c1e', fontFamily: 'monospace' }}>{device.ip_address || '—'}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                        <span style={{ fontSize: '12px', fontWeight: 500, color: '#434655', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Last Connected</span>
                                                        <span style={{ fontSize: '14px', color: '#191c1e' }}>
                                                            {device.last_connected_at ? formatInStoreTimezone(device.last_connected_at) : '—'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div style={{ padding: '40px 24px', textAlign: 'center', color: '#6b7280' }}>
                                    <i className="bi bi-laptop" style={{ fontSize: '32px', display: 'block', marginBottom: '8px', opacity: 0.4 }}></i>
                                    <span style={{ fontSize: '14px' }}>No devices available for this user.</span>
                                </div>
                            )}
                        </section>

                    </div>

                    {/* Modal Footer */}
                    <div style={{ padding: '16px 32px', borderTop: '1px solid #c3c6d7', display: 'flex', justifyContent: 'flex-end', backgroundColor: '#f7f9fb' }}>
                        <button onClick={handleClose} style={{ border: '1px solid #c3c6d7', backgroundColor: '#ffffff', color: '#191c1e', padding: '8px 24px', borderRadius: '4px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                            Close
                        </button>
                    </div>

                </Modal.Body>
            </Modal>
        </>
    );
});

export default UserView;
