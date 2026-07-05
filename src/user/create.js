import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { Modal } from "react-bootstrap";

import { Spinner } from "react-bootstrap";
import { Typeahead } from "react-bootstrap-typeahead";
import { ObjectToSearchQueryParams } from '../utils/queryUtils.js';
import { fetchStore } from '../utils/storeUtils.js';
import { useEnterKeyNavigation } from '../utils/useEnterKeyNavigation.js';


const UserCreate = forwardRef((props, ref) => {

    useImperativeHandle(ref, () => ({
        open(id) {
            formData = {};
            setFormData({});
            if (id) {
                getUser(id);
            }

            getStore(localStorage.getItem("store_id"));
            SetShow(true);
        },

    }));


    async function getStore(id) {
        try {
            await fetchStore(id);
        } catch (error) { }
    }

    useEnterKeyNavigation();


    let [errors, setErrors] = useState({});
    const [isProcessing, setProcessing] = useState(false);


    //fields
    let [formData, setFormData] = useState({
        admin: false,
    });

    const [show, SetShow] = useState(false);

    function handleClose() {
        SetShow(false);
    }

    useEffect(() => {
        let at = localStorage.getItem("access_token");
        if (!at) {
            window.location = "/";
        }
    });


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

                setErrors({});


                let userData = data.result;
                console.log("Response:");
                console.log(userData);


                let storeIds = data.result.store_ids;
                let storeNames = data.result.store_names;


                selectedStores = [];
                if (storeIds && storeNames) {
                    for (var i = 0; i < storeIds.length; i++) {
                        selectedStores.push({
                            id: storeIds[i],
                            name: storeNames[i],
                        });
                    }
                }
                setSelectedStores(selectedStores);



                formData = {
                    id: userData.id,
                    name: userData.name,
                    email: userData.email,
                    mob: userData.mob,
                    role: userData.role,
                    log: "",
                };

                if (userData.admin === true) {
                    formData.admin = true;
                } else {
                    formData.admin = false;
                }
                console.log("From Server:", formData);
                setFormData({ ...formData });
            })
            .catch(error => {
                setProcessing(false);
                setErrors(error);
            });
    }

    function handleCreate(event) {
        event.preventDefault();
        console.log("Inside handle Create");


        formData.store_ids = [];

        for (var i = 0; i < selectedStores.length; i++) {
            formData.store_ids.push(selectedStores[i].id);
        }



        let endPoint = "/v1/user";
        let method = "POST";
        if (formData.id) {
            endPoint = "/v1/user/" + formData.id;
            method = "PUT";
        }


        const requestOptions = {
            method: method,
            headers: {
                'Accept': 'application/json',
                "Content-Type": "application/json",
                Authorization: localStorage.getItem("access_token"),
            },
            body: JSON.stringify(formData),
        };

        console.log("sending formData:", formData);

        setProcessing(true);
        fetch(endPoint, requestOptions)
            .then(async (response) => {
                const isJson = response.headers
                    .get("content-type")
                    ?.includes("application/json");
                const data = isJson && (await response.json());

                // check for error response
                if (!response.ok) {
                    // get error message from body or default to response status
                    const error = data && data.errors;
                    //const error = data.errors
                    return Promise.reject(error);
                }

                setErrors({});
                setProcessing(false);

                console.log("Response:");
                console.log(data);
                if (formData.id) {
                    if (props.showToastMessage) props.showToastMessage("User updated successfully!", "success");
                } else {
                    if (props.showToastMessage) props.showToastMessage("User created successfully!", "success");
                }
                if (props.refreshList) {
                    props.refreshList();
                }
                handleClose();


                if (props.openDetailsView)
                    props.openDetailsView(data.result.id);
            })
            .catch((error) => {
                setProcessing(false);
                console.log("Inside catch");
                console.log(error);
                setErrors({ ...error });
                console.error("There was an error!", error);
                if (props.showToastMessage) props.showToastMessage("Failed to process user!", "danger");
            });
    }


    let [selectedStores, setSelectedStores] = useState([]);
    let [storeOptions, setStoreOptions] = useState([]);

    async function suggestStores(searchTerm) {
        console.log("Inside handle suggest stores");

        console.log("searchTerm:" + searchTerm);
        if (!searchTerm) {
            return;
        }

        var params = {
            name: searchTerm,
        };
        var queryString = ObjectToSearchQueryParams(params);
        if (queryString !== "") {
            queryString = "&" + queryString;
        }

        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: localStorage.getItem("access_token"),
            },
        };

        let Select = "select=id,name,branch_name";
        let result = await fetch(
            "/v1/store?" + Select + queryString,
            requestOptions
        );
        let data = await result.json();
        console.log("data:", data);
        if (data.result) {
            for (var i = 0; i < data.result.length; i++) {
                data.result[i].name = data.result[i].name + " - " + data.result[i].branch_name;
            }
        }

        if (formData.id) {
            // data.result = data.result.filter(store => store.id !== formData.id);
        }

        let newStoreOptions = [];
        for (let i = 0; i < data.result.length; i++) {
            let storeSelected = false;
            for (var j = 0; j < selectedStores.length; j++) {
                if (data.result[i].id === selectedStores[j].id) {
                    storeSelected = true;
                    break
                }
            }
            if (!storeSelected) {
                newStoreOptions.push(data.result[i]);
            }
        }
        // data.result = data.result.filter(store => store.id !== selectedStores.id);
        setStoreOptions(newStoreOptions);
    }

    // ── Design tokens ──────────────────────────────────────────────────────
    const CARD = { background: '#ffffff', border: '1px solid #c3c6d7', borderRadius: '8px', padding: '24px', marginBottom: '20px' };
    const INPUT = { border: '1px solid #c3c6d7', borderRadius: '4px', padding: '7px 12px', fontSize: '13px', fontFamily: '"Inter", sans-serif', width: '100%', outline: 'none', color: '#191c1e', background: '#fff' };

    const Label = ({ children, required }) => (
        <label style={{ display: 'block', fontFamily: '"Inter", sans-serif', fontSize: '13px', fontWeight: 600, color: '#191c1e', marginBottom: '4px' }}>
            {children}{required && <span style={{ color: '#ba1a1a', marginLeft: '2px' }}>*</span>}
        </label>
    );
    const ErrMsg = ({ children }) => (
        <div style={{ color: '#ba1a1a', fontSize: '12px', fontFamily: '"Inter", sans-serif', marginTop: '3px' }}>{children}</div>
    );
    const SectionTitle = ({ children, icon }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            {icon && <i className={`bi ${icon}`} style={{ fontSize: '18px', color: '#004ac6' }}></i>}
            <h3 style={{ fontFamily: '"Hanken Grotesk", sans-serif', fontSize: '16px', fontWeight: 600, color: '#191c1e', margin: 0 }}>{children}</h3>
        </div>
    );

    const NAV_TABS = [
        { id: 'account',     label: 'Account',     icon: 'bi-person-circle' },
        { id: 'permissions', label: 'Permissions',  icon: 'bi-shield-check'  },
    ];

    const [activeTab, setActiveTab] = useState("account");
    // ───────────────────────────────────────────────────────────────────────

    // eslint-disable-next-line no-unused-vars
    function getErrorTab(key) {
        const k = key.toLowerCase();
        if (['store','role','admin','permission'].some(f => k.includes(f))) return 'permissions';
        return 'account';
    }

    const allErrors = Object.entries(errors).filter(([, v]) => v);
    const totalErrors = allErrors.length;

    const tabIds = NAV_TABS.map(t => t.id);
    const currentTabIndex = tabIds.indexOf(activeTab);
    const prevTab = tabIds[currentTabIndex - 1];
    const nextTab = tabIds[currentTabIndex + 1];

    return (
        <>
            <Modal show={show} fullscreen onHide={handleClose} animation={false} backdrop="static" dialogClassName="pw-modal">
                <Modal.Header style={{ background: '#ffffff', borderBottom: '1px solid #c3c6d7', padding: '10px 20px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button type="button" onClick={handleClose}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#434655', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 600, fontFamily: 'Inter, sans-serif', padding: '4px 8px', borderRadius: '4px', flexShrink: 0 }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f0f2f4'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                        <i className="bi bi-arrow-left" style={{ fontSize: '16px' }}></i> Back
                    </button>
                    <Modal.Title style={{ fontFamily: '"Hanken Grotesk", sans-serif', fontSize: '17px', fontWeight: 700, color: '#191c1e', letterSpacing: '-0.01em', flex: 1 }}>
                        {formData.id ? `Update User — ${formData.name}` : 'Create New User'}
                    </Modal.Title>
                    <div className="d-flex align-items-center gap-2">
                        {formData.id && (
                            <button type="button"
                                style={{ background: '#d0e1fb', color: '#54647a', border: 'none', borderRadius: '4px', padding: '6px 14px', fontSize: '13px', fontWeight: 600, fontFamily: '"Inter", sans-serif', cursor: 'pointer' }}
                                onClick={() => { handleClose(); if (props.openDetailsView) props.openDetailsView(formData.id); }}>
                                <i className="bi bi-eye me-1"></i>View Detail
                            </button>
                        )}
                        <button type="button"
                            style={{ background: '#004ac6', color: '#ffffff', border: 'none', borderRadius: '4px', padding: '6px 18px', fontSize: '13px', fontWeight: 600, fontFamily: '"Inter", sans-serif', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            onClick={handleCreate} disabled={isProcessing}>
                            {isProcessing && <Spinner as="span" animation="border" size="sm" role="status" aria-hidden={true} />}
                            {formData.id ? 'Update' : 'Create'}
                        </button>
                        <button type="button" className="btn-close ms-1" onClick={handleClose} aria-label="Close" />
                    </div>
                </Modal.Header>
                <style>{`
                  @keyframes fadeInDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
                  input[type="number"]::-webkit-outer-spin-button,
                  input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
                  input[type="number"] { -moz-appearance: textfield; }
                  .pw-modal .modal-content { display: flex; flex-direction: column; height: 100%; }
                  .pw-body { padding: 0 !important; overflow: hidden !important; display: flex !important; flex-direction: column !important; flex: 1 !important; min-height: 0 !important; }
                  .pw-form { display: flex; width: 100%; flex: 1; min-height: 0; }
                  .pw-sidebar { width: 200px; background: #f2f4f6; border-right: 1px solid #c3c6d7; padding: 16px 10px; flex-shrink: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; }
                  .pw-sidebar-header { margin-bottom: 16px; }
                  .pw-content { flex: 1; display: flex; flex-direction: column; background: #f7f9fb; min-width: 0; overflow: hidden; }
                  .pw-tab-wrap { max-width: 900px; }
                  .pw-price-cards .col-md-4 { margin-bottom: 16px; }
                  @media (max-width: 767px) {
                    .pw-form { flex-direction: column; }
                    .pw-sidebar { width: 100%; height: auto; flex-direction: row; overflow-x: auto; overflow-y: hidden; border-right: none; border-bottom: 1px solid #c3c6d7; padding: 6px 8px; gap: 4px; }
                    .pw-sidebar-header { display: none; }
                    .pw-sidebar button { flex-shrink: 0; white-space: nowrap; padding: 8px 12px !important; }
                    .pw-content-scroll { padding: 14px 16px !important; }
                    .pw-tab-wrap { max-width: 100%; }
                  }
                  @media (min-width: 768px) and (max-width: 1100px) {
                    .pw-sidebar { width: 170px; }
                    .pw-content-scroll { padding: 16px 20px; }
                    .pw-tab-wrap { max-width: 100%; }
                  }
                  @media (min-height: 600px) and (max-height: 800px) {
                    .pw-content-scroll { padding: 14px 24px; }
                  }
                  @media (max-width: 767px) {
                    .pw-card { padding: 14px !important; margin-bottom: 12px !important; }
                  }
                  @media (min-width: 768px) and (max-width: 1100px) {
                    .pw-card { padding: 16px !important; margin-bottom: 14px !important; }
                  }
                `}</style>
                <Modal.Body className="pw-body">
                    <form onSubmit={handleCreate} className="pw-form">

                        {/* Left Nav Sidebar */}
                        <aside className="pw-sidebar">
                            <div className="pw-sidebar-header">
                                <div style={{ fontFamily: '"Hanken Grotesk", sans-serif', fontSize: '15px', fontWeight: 700, color: '#191c1e', marginBottom: '2px' }}>
                                    {formData.id ? 'Edit User' : 'New User'}
                                </div>
                                <div style={{ fontFamily: '"Inter", sans-serif', fontSize: '11px', color: '#434655' }}>User Wizard</div>
                            </div>
                            {NAV_TABS.map((tab) => (
                                <button key={tab.id} type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '8px',
                                        padding: '9px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%',
                                        background: activeTab === tab.id ? '#2563eb' : 'transparent',
                                        color: activeTab === tab.id ? '#eeefff' : '#434655',
                                        fontFamily: '"Inter", sans-serif', fontSize: '13px', fontWeight: activeTab === tab.id ? 700 : 500,
                                    }}
                                    onMouseEnter={(e) => { if (activeTab !== tab.id) e.currentTarget.style.background = '#e0e3e5'; }}
                                    onMouseLeave={(e) => { if (activeTab !== tab.id) e.currentTarget.style.background = 'transparent'; }}
                                >
                                    <i className={`bi ${tab.icon}`} style={{ fontSize: '15px', flexShrink: 0 }}></i>
                                    <span style={{ flex: 1 }}>{tab.label}</span>
                                </button>
                            ))}
                        </aside>

                        {/* Main Content Area */}
                        <div className="pw-content" style={{ display: "flex", flexDirection: "column" }}>
                            <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px", paddingBottom: "8px" }} className="pw-content-scroll">
                                <div style={{ overflow: "hidden", maxHeight: totalErrors > 0 ? "500px" : "0", marginBottom: totalErrors > 0 ? "16px" : "0", transition: "max-height 0.25s ease, margin-bottom 0.2s ease" }}>
                                  <div style={{ background: "#ffdad6", border: "1px solid #f4adaa", borderRadius: "8px", padding: "12px 16px" }}>
                                    <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, color: "#93000a", marginBottom: "8px", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}>
                                      <i className="bi bi-exclamation-circle-fill" style={{ fontSize: "14px" }}></i>
                                      {totalErrors} error{totalErrors > 1 ? "s" : ""} — please fix before saving:
                                    </div>
                                    {NAV_TABS.map((tab) => {
                                      const tabErrs = allErrors.filter(([k]) => getErrorTab(k) === tab.id);
                                      if (!tabErrs.length) return null;
                                      return (
                                        <div key={tab.id} style={{ marginBottom: "6px" }}>
                                          <button type="button" onClick={() => setActiveTab(tab.id)}
                                            style={{ background: "none", border: "none", padding: 0, fontFamily: "Inter, sans-serif", fontWeight: 700, color: "#004ac6", cursor: "pointer", fontSize: "12px", textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: "4px", marginBottom: "2px" }}>
                                            <i className={`bi ${tab.icon}`} style={{ fontSize: "11px" }}></i> {tab.label}:
                                          </button>
                                          {tabErrs.map(([k, v]) => (
                                            <div key={k} style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#93000a", paddingLeft: "14px" }}>• {v}</div>
                                          ))}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                                <div className="pw-tab-wrap">

                                    {/* ── Account Tab ── */}
                                    {activeTab === 'account' && (
                                        <>
                                            <div style={CARD} className="pw-card">
                                                <SectionTitle icon="bi-person-circle">Account Information</SectionTitle>
                                                <div className="row g-3">

                                                    <div className="col-md-6">
                                                        <Label required>Name</Label>
                                                        <input
                                                            value={formData.name ? formData.name : ""}
                                                            type="text"
                                                            onChange={(e) => {
                                                                errors["name"] = "";
                                                                setErrors({ ...errors });
                                                                formData.name = e.target.value;
                                                                setFormData({ ...formData });
                                                                console.log(formData);
                                                            }}
                                                            style={INPUT}
                                                            id="name1"
                                                            placeholder="Name"
                                                        />
                                                        {errors.name && <ErrMsg><i className="bi bi-x-lg me-1"></i>{errors.name}</ErrMsg>}
                                                    </div>

                                                    <div className="col-md-6">
                                                        <Label required>Email</Label>
                                                        <input
                                                            value={formData.email ? formData.email : ""}
                                                            type="text"
                                                            onChange={(e) => {
                                                                errors["email"] = "";
                                                                setErrors({ ...errors });
                                                                formData.email = e.target.value;
                                                                setFormData({ ...formData });
                                                                console.log(formData);
                                                            }}
                                                            style={INPUT}
                                                            id="email1"
                                                            placeholder="Email"
                                                        />
                                                        {errors.email && <ErrMsg><i className="bi bi-x-lg me-1"></i>{errors.email}</ErrMsg>}
                                                    </div>

                                                    <div className="col-md-6">
                                                        <Label required={!formData.id}>Password</Label>
                                                        <input
                                                            value={formData.password ? formData.password : ""}
                                                            type="password"
                                                            onChange={(e) => {
                                                                errors["password"] = "";
                                                                setErrors({ ...errors });
                                                                formData.password = e.target.value;
                                                                setFormData({ ...formData });
                                                                console.log(formData);
                                                            }}
                                                            style={INPUT}
                                                            id="password1"
                                                            placeholder={formData.id ? "Change password" : "Password"}
                                                        />
                                                        {errors.password && <ErrMsg><i className="bi bi-x-lg me-1"></i>{errors.password}</ErrMsg>}
                                                    </div>

                                                    <div className="col-md-6">
                                                        <Label required>Phone</Label>
                                                        <input
                                                            value={formData.mob ? formData.mob : ""}
                                                            type="text"
                                                            onChange={(e) => {
                                                                errors["mob"] = "";
                                                                setErrors({ ...errors });
                                                                formData.mob = e.target.value;
                                                                setFormData({ ...formData });
                                                                console.log(formData);
                                                            }}
                                                            style={INPUT}
                                                            id="mob1"
                                                            placeholder="Mobile number"
                                                        />
                                                        {errors.mob && <ErrMsg><i className="bi bi-x-lg me-1"></i>{errors.mob}</ErrMsg>}
                                                    </div>

                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {/* ── Permissions Tab ── */}
                                    {activeTab === 'permissions' && (
                                        <>
                                            <div style={CARD} className="pw-card">
                                                <SectionTitle icon="bi-shield-check">Role & Store Access</SectionTitle>
                                                <div className="row g-3">

                                                    <div className="col-md-4">
                                                        <Label required>Role</Label>
                                                        <select
                                                            value={formData.role}
                                                            onChange={(e) => {
                                                                if (!e.target.value) {
                                                                    formData.role = "";
                                                                    errors["role"] = "Invalid role";
                                                                    setErrors({ ...errors });
                                                                    return;
                                                                }
                                                                errors["role"] = "";
                                                                setErrors({ ...errors });
                                                                formData.role = e.target.value;
                                                                setFormData({ ...formData });
                                                                console.log(formData);
                                                            }}
                                                            style={{ ...INPUT, appearance: 'auto' }}
                                                        >
                                                            <option value="Manager" selected>Manager</option>
                                                            <option value="SalesMan">Sales Man</option>
                                                            <option value="Admin">Admin</option>
                                                        </select>
                                                        {errors.role && <ErrMsg>{errors.role}</ErrMsg>}
                                                    </div>

                                                    <div className="col-md-8">
                                                        <Label>Stores</Label>
                                                        <Typeahead
                                                            id="store_ids"
                                                            labelKey="name"
                                                            isInvalid={errors.store_ids ? true : false}
                                                            onChange={(selectedItems) => {
                                                                errors.store_ids = "";
                                                                setErrors(errors);
                                                                if (selectedItems.length === 0) {
                                                                    setSelectedStores([]);
                                                                    return;
                                                                }
                                                                console.log("selectedItems", selectedItems);
                                                                setSelectedStores(selectedItems);
                                                            }}
                                                            options={storeOptions}
                                                            placeholder="Select Stores"
                                                            selected={selectedStores}
                                                            highlightOnlyResult={true}
                                                            onInputChange={(searchTerm, e) => {
                                                                suggestStores(searchTerm);
                                                            }}
                                                            multiple
                                                        />
                                                        {errors.store_ids && <ErrMsg>{errors.store_ids}</ErrMsg>}
                                                    </div>

                                                </div>
                                            </div>
                                        </>
                                    )}

                                </div>
                            </div>
                            <div style={{ flexShrink: 0, padding: "12px 28px", borderTop: "1px solid #c3c6d7", background: "#ffffff" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <button type="button" disabled={!prevTab} onClick={() => prevTab && setActiveTab(prevTab)} style={{ background: prevTab ? "#d0e1fb" : "#f0f2f4", color: prevTab ? "#54647a" : "#9aa0b0", border: "none", borderRadius: "4px", padding: "7px 16px", fontSize: "13px", fontWeight: 600, fontFamily: "Inter, sans-serif", cursor: prevTab ? "pointer" : "default", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                                        <i className="bi bi-arrow-left"></i>
                                        {prevTab ? NAV_TABS.find(t => t.id === prevTab)?.label : "Previous"}
                                    </button>
                                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#737686" }}>{currentTabIndex + 1} / {tabIds.length}</span>
                                    <button type="button" disabled={!nextTab} onClick={() => nextTab && setActiveTab(nextTab)} style={{ background: nextTab ? "#004ac6" : "#f0f2f4", color: nextTab ? "#ffffff" : "#9aa0b0", border: "none", borderRadius: "4px", padding: "7px 16px", fontSize: "13px", fontWeight: 600, fontFamily: "Inter, sans-serif", cursor: nextTab ? "pointer" : "default", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                                        {nextTab ? NAV_TABS.find(t => t.id === nextTab)?.label : "Next"}
                                        <i className="bi bi-arrow-right"></i>
                                    </button>
                                </div>
                            </div>
                        </div>

                    </form>
                </Modal.Body>

            </Modal>


        </>
    );
});

export default UserCreate;
