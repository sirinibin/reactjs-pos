import React, { useState, useEffect, forwardRef, useImperativeHandle, useMemo, useRef, useCallback } from "react";
import { Modal } from "react-bootstrap";

import { Spinner } from "react-bootstrap";

import countryList from 'react-select-country-list';
import { Typeahead } from "react-bootstrap-typeahead";
import ImageGallery from '../utils/ImageGallery.js';

const VendorCreate = forwardRef((props, ref) => {
    const timerRef = useRef(null);
    const ImageGalleryRef = useRef();

    useImperativeHandle(ref, () => ({
        async open(id) {

            formData = {
                national_address: {},
                vat_percent: 15.00,
            };
            setFormData({ ...formData });

            if (id) {
                await getVendor(id);

                if (timerRef.current) clearTimeout(timerRef.current);
                timerRef.current = setTimeout(() => {
                    ImageGalleryRef.current.open();
                }, 300);
            }
            setShow(true);

            if (localStorage.getItem('store_id')) {
                getStore(localStorage.getItem('store_id'));
            }
        },

    }));

    useEffect(() => {
        const listener = event => {
            if (event.code === "Enter" || event.code === "NumpadEnter") {
                console.log("Enter key was pressed. Run your function.");
                // event.preventDefault();

                var form = event.target.form;
                if (form && event.target) {
                    var index = Array.prototype.indexOf.call(form, event.target);
                    if (form && form.elements[index + 1]) {
                        if ((event.target.getAttribute("class") || "").includes("barcode")) {
                            form.elements[index].focus();
                        } else {
                            form.elements[index + 1].focus();
                        }
                        event.preventDefault();
                    }
                }
            }
        };
        document.addEventListener("keydown", listener);
        return () => {
            document.removeEventListener("keydown", listener);
        };
    }, []);


    let [errors, setErrors] = useState({});
    const [isProcessing, setProcessing] = useState(false);

    let [store, setStore] = useState({});

    function getStore(id) {
        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': localStorage.getItem('access_token'),
            },
        };
        fetch('/v1/store/' + id, requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();
                if (!response.ok) {
                    return Promise.reject(data && data.errors);
                }
                store = data.result;
                setStore({ ...store });
            })
            .catch(() => { });
    }

    const translateText = useCallback(async (text, setter) => {
        if (store.settings?.enable_auto_translation_to_arabic !== true) {
            return;
        }
        try {
            const response = await fetch('/v1/translate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: localStorage.getItem('access_token'),
                },
                body: JSON.stringify({ text }),
            });
            if (!response.ok) {
                throw new Error('Failed to fetch translation');
            }
            const data = await response.json();
            setter(data.translatedText);
        } catch (error) {
            console.error('Translation error:', error);
        }
    }, [store]);


    //fields
    let [formData, setFormData] = useState({
        national_address: {},
        vat_percent: 15.00,
    });

    const [show, setShow] = useState(false);

    function handleClose() {
        setShow(false);
        if (props.handleVendorCreateFormClose) {
            props.handleVendorCreateFormClose();
        }
    }

    useEffect(() => {
        let at = localStorage.getItem("access_token");
        if (!at) {
            window.location = "/";
        }
    });


    async function getVendor(id) {
        console.log("inside get Order");
        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': localStorage.getItem('access_token'),
            },
        };

        let searchParams = {};
        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
        }
        let queryParams = ObjectToSearchQueryParams(searchParams);

        await fetch('/v1/vendor/' + id + "?" + queryParams, requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();

                // check for error response
                if (!response.ok) {
                    const error = (data && data.errors);
                    return Promise.reject(error);
                }

                setErrors({});

                console.log("Response:");
                console.log(data);
                let vendor = data.result;
                formData = vendor;

                if (!formData.national_address) {
                    formData.national_address = {};
                }

                if (!formData.vat_percent) {
                    formData.vat_percent = 15.00;
                }

                selectedCountries = [];
                if (data.result.country_code && data.result.country_name) {
                    selectedCountries.push({
                        value: data.result.country_code,
                        label: data.result.country_name,
                    });
                }
                setSelectedCountries(selectedCountries);

                setFormData({ ...formData });
            })
            .catch(error => {
                setProcessing(false);
                setErrors(error);
            });
    }


    function ObjectToSearchQueryParams(object) {
        return Object.keys(object)
            .map(function (key) {
                return `search[${key}]=${object[key]}`;
            })
            .join("&");
    }

    function handleCreate(event) {
        event.preventDefault();
        console.log("Inside handle Create");


        formData.vat_percent = parseFloat(formData.vat_percent);

        if (formData.phone) {
            formData.phone_in_arabic = convertToArabicNumber(formData.phone.toString());
        }

        if (formData.vat_no) {
            formData.vat_no_in_arabic = convertToArabicNumber(formData.vat_no.toString());
        }

        if (formData.registration_number) {
            formData.registration_number_in_arabic = convertToArabicNumber(formData.registration_number.toString());
        }

        if (formData.national_address.application_no) {
            formData.national_address.application_no_arabic = convertToArabicNumber(formData.national_address.application_no.toString());
        }

        if (formData.national_address.service_no) {
            formData.national_address.service_no_arabic = convertToArabicNumber(formData.national_address.service_no.toString());
        }

        if (formData.national_address.customer_account_no) {
            formData.national_address.customer_account_no_arabic = convertToArabicNumber(formData.national_address.customer_account_no.toString());
        }

        if (formData.national_address.building_no) {
            formData.national_address.building_no_arabic = convertToArabicNumber(formData.national_address.building_no.toString());
        }

        if (formData.national_address.zipcode) {
            formData.national_address.zipcode_arabic = convertToArabicNumber(formData.national_address.zipcode.toString());
        }

        if (formData.national_address.additional_no) {
            formData.national_address.additional_no_arabic = convertToArabicNumber(formData.national_address.additional_no.toString());
        }

        if (formData.national_address.unit_no) {
            formData.national_address.unit_no_arabic = convertToArabicNumber(formData.national_address.unit_no.toString());
        }

        if (localStorage.getItem("store_id")) {
            formData.store_id = localStorage.getItem("store_id");
        }


        let endPoint = "/v1/vendor";
        let method = "POST";
        if (formData.id) {
            endPoint = "/v1/vendor/" + formData.id;
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

        console.log("formData:", formData);

        let searchParams = {};
        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
        }
        let queryParams = ObjectToSearchQueryParams(searchParams);

        setProcessing(true);
        fetch(endPoint + "?" + queryParams, requestOptions)
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


                console.log("Response:");
                console.log(data);

                formData.id = data.result?.id;
                setFormData({ ...formData });

                await ImageGalleryRef.current.uploadAllImages();

                if (timerRef.current) clearTimeout(timerRef.current);
                timerRef.current = setTimeout(() => {
                    setProcessing(false);

                    if (formData.id) {
                        if (props.showToastMessage) props.showToastMessage("Vendor updated successfully!", "success");
                    } else {
                        if (props.showToastMessage) props.showToastMessage("Vendor created successfully!", "success");
                    }

                    if (props.refreshList) {
                        props.refreshList();
                    }

                    if (props.onUpdated) {
                        props.onUpdated(data.result);
                    }

                    handleClose();
                    if (props.openDetailsView)
                        props.openDetailsView(data.result.id);

                    if (props.handleUpdated) {
                        props.handleUpdated();
                    }

                }, 300);


            })
            .catch((error) => {
                setProcessing(false);
                console.log("Inside catch");
                console.log(error);
                setErrors({ ...error });
                console.error("There was an error!", error);
                if (props.showToastMessage) props.showToastMessage("Failed to process vendor!", "danger");
            });
    }

    let persianDigits = "۰۱۲۳٤۵٦۷۸۹";
    let persianMap = persianDigits.split("");


    function convertToArabicNumber(input) {
        return input.replace(/\d/g, function (m) {
            return persianMap[parseInt(m)];
        });
    }

    //country
    const countryOptions = useMemo(() => countryList().getData(), [])
    let [selectedCountries, setSelectedCountries] = useState([]);

    const countrySearchRef = useRef();

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
        { id: 'basic', label: 'Basic Info', icon: 'bi-building' },
        { id: 'address', label: 'Address', icon: 'bi-geo-alt' },
    ];

    const [activeTab, setActiveTab] = useState("basic");
    // ───────────────────────────────────────────────────────────────────────

    function getErrorTab(key) {
        const k = key.toLowerCase();
        if (['country','city','state','postal','address','national','building','street','district','zipcode'].some(f => k.includes(f))) return 'address';
        return 'basic';
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
                        {formData.id ? `Update Vendor — ${formData.name}` : 'Create New Vendor'}
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
                                    {formData.id ? 'Edit Vendor' : 'New Vendor'}
                                </div>
                                <div style={{ fontFamily: '"Inter", sans-serif', fontSize: '11px', color: '#434655' }}>Vendor Wizard</div>
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
                            <div className="pw-content-scroll" style={{ flex: 1, overflowY: "auto", padding: "20px 28px", paddingBottom: "8px" }}>
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

                                {/* ===== TAB 1: BASIC INFO ===== */}
                                {activeTab === 'basic' && (
                                    <>
                                        {/* Identity Card */}
                                        <div className="pw-card" style={CARD}>
                                            <SectionTitle icon="bi-building">Vendor Identity</SectionTitle>
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
                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                            timerRef.current = setTimeout(() => {
                                                                translateText(e.target.value, (translated) =>
                                                                    setFormData(prev => ({ ...prev, name_in_arabic: translated }))
                                                                );
                                                            }, 500);
                                                        }}
                                                        style={INPUT}
                                                        id="vendor_name"
                                                        name="vendor_name"
                                                        placeholder="Name"
                                                    />
                                                    {errors.name && <ErrMsg>{errors.name}</ErrMsg>}
                                                </div>

                                                <div className="col-md-6">
                                                    <Label>Name In Arabic</Label>
                                                    <input
                                                        id="vendor_name_arabic"
                                                        name="vendor_name_arabic"
                                                        value={formData.name_in_arabic ? formData.name_in_arabic : ""}
                                                        type="text"
                                                        onChange={(e) => {
                                                            errors["name_in_arabic"] = "";
                                                            setErrors({ ...errors });
                                                            formData.name_in_arabic = e.target.value;
                                                            setFormData({ ...formData });
                                                            console.log(formData);
                                                        }}
                                                        style={{ ...INPUT, direction: 'rtl' }}
                                                        placeholder="Name In Arabic"
                                                    />
                                                    {errors.name_in_arabic && <ErrMsg>{errors.name_in_arabic}</ErrMsg>}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Contact Card */}
                                        <div className="pw-card" style={CARD}>
                                            <SectionTitle icon="bi-person-lines-fill">Contact Details</SectionTitle>
                                            <div className="row g-3">
                                                <div className="col-md-4">
                                                    <Label>Email</Label>
                                                    <input
                                                        id="vendor_email"
                                                        name="vendor_email"
                                                        value={formData.email ? formData.email : ""}
                                                        type="email"
                                                        onChange={(e) => {
                                                            errors["email"] = "";
                                                            formData.email = e.target.value;
                                                            setFormData({ ...formData });
                                                            console.log(formData);
                                                        }}
                                                        style={INPUT}
                                                        placeholder="Email"
                                                    />
                                                    {errors.email && <ErrMsg>{errors.email}</ErrMsg>}
                                                </div>

                                                <div className="col-md-4">
                                                    <Label>Phone</Label>
                                                    <input
                                                        id="vendor_phone"
                                                        name="vendor_phone"
                                                        value={formData.phone ? formData.phone : ""}
                                                        type="text"
                                                        onChange={(e) => {
                                                            errors["phone"] = "";
                                                            setErrors({ ...errors });
                                                            formData.phone = e.target.value;
                                                            setFormData({ ...formData });
                                                            console.log(formData);
                                                        }}
                                                        style={INPUT}
                                                        placeholder="Phone"
                                                    />
                                                    {errors.phone && <ErrMsg>{errors.phone}</ErrMsg>}
                                                </div>

                                                <div className="col-md-4">
                                                    <Label>Contact Person</Label>
                                                    <input
                                                        id="vendor_contact_person"
                                                        name="vendor_contact_person"
                                                        value={formData.contact_person ? formData.contact_person : ""}
                                                        type="text"
                                                        onChange={(e) => {
                                                            errors["contact_person"] = "";
                                                            formData.contact_person = e.target.value;
                                                            setFormData({ ...formData });
                                                            console.log(formData);
                                                        }}
                                                        style={INPUT}
                                                        placeholder="Contact Person"
                                                    />
                                                    {errors.contact_person && <ErrMsg>{errors.contact_person}</ErrMsg>}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Registration & VAT Card */}
                                        <div className="pw-card" style={CARD}>
                                            <SectionTitle icon="bi-file-earmark-text">Registration & VAT</SectionTitle>
                                            <div className="row g-3">
                                                <div className="col-md-4">
                                                    <Label>VAT NO.</Label>
                                                    <input
                                                        id="vendor_vat_no"
                                                        name="vendor_vat_no"
                                                        value={formData.vat_no ? formData.vat_no : ""}
                                                        type="text"
                                                        onChange={(e) => {
                                                            errors["vat_no"] = "";
                                                            setErrors({ ...errors });
                                                            formData.vat_no = e.target.value;
                                                            setFormData({ ...formData });
                                                            console.log(formData);
                                                        }}
                                                        style={INPUT}
                                                        placeholder="VAT NO."
                                                    />
                                                    {errors.vat_no && <ErrMsg>{errors.vat_no}</ErrMsg>}
                                                </div>

                                                <div className="col-md-4">
                                                    <Label>Registration Number (C.R NO.)</Label>
                                                    <input
                                                        id="vendor_reg_no"
                                                        name="vendor_reg_no"
                                                        value={formData.registration_number ? formData.registration_number : ""}
                                                        type="number"
                                                        onChange={(e) => {
                                                            errors["registration_number"] = "";
                                                            setErrors({ ...errors });
                                                            formData.registration_number = e.target.value;
                                                            setFormData({ ...formData });
                                                            console.log(formData);
                                                        }}
                                                        style={INPUT}
                                                        placeholder="Registration Number (C.R NO.)"
                                                    />
                                                    {errors.registration_number && <ErrMsg>{errors.registration_number}</ErrMsg>}
                                                </div>

                                                <div className="col-md-4">
                                                    <Label>VAT %</Label>
                                                    <input
                                                        id="vendor_vat_percent"
                                                        name="vendor_vat_percent"
                                                        value={formData.vat_percent !== undefined ? formData.vat_percent : ""}
                                                        type="number"
                                                        onChange={(e) => {
                                                            errors["vat_percent"] = "";
                                                            setErrors({ ...errors });
                                                            formData.vat_percent = e.target.value;
                                                            setFormData({ ...formData });
                                                        }}
                                                        style={INPUT}
                                                        placeholder="VAT %"
                                                    />
                                                    {errors.vat_percent && <ErrMsg>{errors.vat_percent}</ErrMsg>}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Credit & Remarks Card */}
                                        <div className="pw-card" style={CARD}>
                                            <SectionTitle icon="bi-credit-card">Credit & Remarks</SectionTitle>
                                            <div className="row g-3">
                                                <div className="col-md-3">
                                                    <Label>Credit Limit</Label>
                                                    <input
                                                        id="vendor_credit_limit"
                                                        name="vendor_credit_limit"
                                                        type="number"
                                                        value={formData.credit_limit !== undefined ? formData.credit_limit : ""}
                                                        style={INPUT}
                                                        onChange={(e) => {
                                                            errors["credit_limit"] = "";
                                                            setErrors({ ...errors });
                                                            if (!e.target.value) {
                                                                formData.credit_limit = e.target.value;
                                                                setFormData({ ...formData });
                                                                return;
                                                            }
                                                            formData.credit_limit = parseFloat(e.target.value);
                                                            setFormData({ ...formData });
                                                            console.log(formData);
                                                        }}
                                                    />
                                                    {errors.credit_limit && <ErrMsg>{errors.credit_limit}</ErrMsg>}
                                                </div>

                                                <div className="col-md-3">
                                                    <Label>Credit Balance</Label>
                                                    <input
                                                        type="text"
                                                        disabled={true}
                                                        value={formData.credit_balance !== undefined ? formData.credit_balance : ""}
                                                        style={{ ...INPUT, background: '#f2f4f6', color: '#737686' }}
                                                        onChange={(e) => { }}
                                                    />
                                                    {errors.credit_balance && <ErrMsg>{errors.credit_balance}</ErrMsg>}
                                                </div>

                                                <div className="col-md-6">
                                                    <Label>
                                                        Remarks&nbsp;|&nbsp;
                                                        <input
                                                            type="checkbox"
                                                            style={{ marginLeft: "3px" }}
                                                            value={formData.use_remarks_in_purchases}
                                                            checked={formData.use_remarks_in_purchases}
                                                            onChange={(e) => {
                                                                errors["formData.show_address_in_invoice_footer"] = "";
                                                                formData.use_remarks_in_purchases = !formData.use_remarks_in_purchases;
                                                                setFormData({ ...formData });
                                                                console.log(formData);
                                                            }}
                                                            id="formData.use_remarks_in_sales"
                                                        /> Use in Purchase / Purchase Return
                                                    </Label>
                                                    <textarea
                                                        value={formData.remarks !== undefined ? formData.remarks : ""}
                                                        onChange={(e) => {
                                                            errors["address"] = "";
                                                            setErrors({ ...errors });
                                                            formData.remarks = e.target.value;
                                                            setFormData({ ...formData });
                                                            console.log(formData);
                                                        }}
                                                        style={{ ...INPUT, resize: 'vertical', minHeight: '72px' }}
                                                        id="remarks"
                                                        placeholder="Remarks"
                                                    />
                                                    {errors.remarks && <ErrMsg>{errors.remarks}</ErrMsg>}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Vendor Photos */}
                                        <div className="pw-card" style={CARD}>
                                            <SectionTitle icon="bi-images">Vendor Photos</SectionTitle>
                                            <ImageGallery ref={ImageGalleryRef} id={formData.id} storeID={formData.store_id} storedImages={formData.images} modelName={"vendor"} />
                                        </div>
                                    </>
                                )}

                                {/* ===== TAB 2: ADDRESS ===== */}
                                {activeTab === 'address' && (
                                    <>
                                        {/* Country & City Card */}
                                        <div className="pw-card" style={CARD}>
                                            <SectionTitle icon="bi-geo-alt">Country & City</SectionTitle>
                                            <div className="row g-3">
                                                <div className="col-md-6">
                                                    <Label>Country</Label>
                                                    <Typeahead
                                                        id="country_code"
                                                        labelKey="label"
                                                        onChange={(selectedItems) => {
                                                            errors.country_code = "";
                                                            setErrors(errors);
                                                            if (selectedItems.length === 0) {
                                                                errors.country_code = "Invalid country selected";
                                                                setErrors(errors);
                                                                formData.country_code = "";
                                                                formData.country_name = "";
                                                                setFormData({ ...formData });
                                                                setSelectedCountries([]);
                                                                return;
                                                            }
                                                            formData.country_code = selectedItems[0].value;
                                                            formData.country_name = selectedItems[0].label;
                                                            setFormData({ ...formData });
                                                            setSelectedCountries(selectedItems);
                                                        }}
                                                        options={countryOptions}
                                                        placeholder="Country name"
                                                        selected={selectedCountries}
                                                        highlightOnlyResult={true}
                                                        onInputChange={(searchTerm, e) => {
                                                            //suggestBrands(searchTerm);
                                                        }}
                                                        ref={countrySearchRef}
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Escape") {
                                                                countrySearchRef.current?.clear();
                                                            }
                                                        }}
                                                    />
                                                    {errors.country_code && <ErrMsg>{errors.country_code}</ErrMsg>}
                                                </div>

                                                <div className="col-md-6">
                                                    <Label>City Name</Label>
                                                    <input
                                                        id="vendor_national_address_city_name"
                                                        name="vendor_national_address_city_name"
                                                        value={formData.national_address.city_name ? formData.national_address.city_name : ""}
                                                        type="text"
                                                        onChange={(e) => {
                                                            errors["national_address_city_name"] = "";
                                                            formData.national_address.city_name = e.target.value;
                                                            setFormData({ ...formData });
                                                            console.log(formData);
                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                            timerRef.current = setTimeout(() => {
                                                                translateText(e.target.value, (translated) =>
                                                                    setFormData(prev => ({ ...prev, national_address: { ...prev.national_address, city_name_arabic: translated } }))
                                                                );
                                                            }, 500);
                                                        }}
                                                        style={INPUT}
                                                        placeholder="City Name"
                                                    />
                                                    {errors.national_address_city_name && <ErrMsg>{errors.national_address_city_name}</ErrMsg>}
                                                </div>

                                                <div className="col-md-6">
                                                    <Label>City Name (Arabic)</Label>
                                                    <input
                                                        id="vendor_national_address_city_name_arabic"
                                                        name="vendor_national_address_city_name_arabic"
                                                        value={formData.national_address.city_name_arabic ? formData.national_address.city_name_arabic : ""}
                                                        type="text"
                                                        onChange={(e) => {
                                                            errors["national_address_city_name_arabic"] = "";
                                                            formData.national_address.city_name_arabic = e.target.value;
                                                            setFormData({ ...formData });
                                                            console.log(formData);
                                                        }}
                                                        style={{ ...INPUT, direction: 'rtl' }}
                                                        placeholder="City Name (Arabic)"
                                                    />
                                                    {errors.national_address_city_name_arabic && <ErrMsg>{errors.national_address_city_name_arabic}</ErrMsg>}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Address Card */}
                                        <div className="pw-card" style={CARD}>
                                            <SectionTitle icon="bi-signpost-split">Address Details</SectionTitle>
                                            <div className="row g-3">
                                                <div className="col-md-6">
                                                    <Label>Street Name</Label>
                                                    <input
                                                        id="vendor_national_address_street_name"
                                                        name="vendor_national_address_street_name"
                                                        value={formData.national_address.street_name ? formData.national_address.street_name : ""}
                                                        type="text"
                                                        onChange={(e) => {
                                                            errors["national_address_street_name"] = "";
                                                            formData.national_address.street_name = e.target.value;
                                                            setFormData({ ...formData });
                                                            console.log(formData);
                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                            timerRef.current = setTimeout(() => {
                                                                translateText(e.target.value, (translated) =>
                                                                    setFormData(prev => ({ ...prev, national_address: { ...prev.national_address, street_name_arabic: translated } }))
                                                                );
                                                            }, 500);
                                                        }}
                                                        style={INPUT}
                                                        placeholder="Street Name"
                                                    />
                                                    {errors.national_address_street_name && <ErrMsg>{errors.national_address_street_name}</ErrMsg>}
                                                </div>

                                                <div className="col-md-6">
                                                    <Label>Street Name (Arabic)</Label>
                                                    <input
                                                        id="vendor_national_address_street_name_arabic"
                                                        name="vendor_national_address_street_name_arabic"
                                                        value={formData.national_address.street_name_arabic ? formData.national_address.street_name_arabic : ""}
                                                        type="text"
                                                        onChange={(e) => {
                                                            errors["national_address_street_name_arabic"] = "";
                                                            formData.national_address.street_name_arabic = e.target.value;
                                                            setFormData({ ...formData });
                                                            console.log(formData);
                                                        }}
                                                        style={{ ...INPUT, direction: 'rtl' }}
                                                        placeholder="Street Name (Arabic)"
                                                    />
                                                    {errors.national_address_street_name_arabic && <ErrMsg>{errors.national_address_street_name_arabic}</ErrMsg>}
                                                </div>

                                                <div className="col-md-6">
                                                    <Label>District Name</Label>
                                                    <input
                                                        id="vendor_national_address_district_name"
                                                        name="vendor_national_address_district_name"
                                                        value={formData.national_address.district_name ? formData.national_address.district_name : ""}
                                                        type="text"
                                                        onChange={(e) => {
                                                            errors["national_address_district_name"] = "";
                                                            formData.national_address.district_name = e.target.value;
                                                            setFormData({ ...formData });
                                                            console.log(formData);
                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                            timerRef.current = setTimeout(() => {
                                                                translateText(e.target.value, (translated) =>
                                                                    setFormData(prev => ({ ...prev, national_address: { ...prev.national_address, district_name_arabic: translated } }))
                                                                );
                                                            }, 500);
                                                        }}
                                                        style={INPUT}
                                                        placeholder="District Name"
                                                    />
                                                    {errors.national_address_district_name && <ErrMsg>{errors.national_address_district_name}</ErrMsg>}
                                                </div>

                                                <div className="col-md-6">
                                                    <Label>District Name (Arabic)</Label>
                                                    <input
                                                        id="vendor_national_address_district_name_arabic"
                                                        name="vendor_national_address_district_name_arabic"
                                                        value={formData.national_address.district_name_arabic ? formData.national_address.district_name_arabic : ""}
                                                        type="text"
                                                        onChange={(e) => {
                                                            errors["national_address_district_name_arabic"] = "";
                                                            formData.national_address.district_name_arabic = e.target.value;
                                                            setFormData({ ...formData });
                                                            console.log(formData);
                                                        }}
                                                        style={{ ...INPUT, direction: 'rtl' }}
                                                        placeholder="District Name (Arabic)"
                                                    />
                                                    {errors.national_address_district_name_arabic && <ErrMsg>{errors.national_address_district_name_arabic}</ErrMsg>}
                                                </div>
                                            </div>
                                        </div>

                                        {/* National Address Card */}
                                        <div className="pw-card" style={CARD}>
                                            <SectionTitle icon="bi-house-door">National Address</SectionTitle>
                                            <div className="row g-3">
                                                <div className="col-md-3">
                                                    <Label>Building Number</Label>
                                                    <input
                                                        id="vendor_national_address_building_no"
                                                        name="vendor_national_address_building_no"
                                                        value={formData.national_address.building_no ? formData.national_address.building_no : ""}
                                                        type="text"
                                                        onChange={(e) => {
                                                            errors["national_address_building_no"] = "";
                                                            formData.national_address.building_no = e.target.value;
                                                            setFormData({ ...formData });
                                                            console.log(formData);
                                                        }}
                                                        style={INPUT}
                                                        placeholder="Building Number"
                                                    />
                                                    {errors.national_address_building_no && <ErrMsg>{errors.national_address_building_no}</ErrMsg>}
                                                </div>

                                                <div className="col-md-3">
                                                    <Label>Unit Number</Label>
                                                    <input
                                                        id="vendor_national_address_unit_no"
                                                        name="vendor_national_address_unit_no"
                                                        value={formData.national_address.unit_no ? formData.national_address.unit_no : ""}
                                                        type="text"
                                                        onChange={(e) => {
                                                            errors["national_address_unit_no"] = "";
                                                            formData.national_address.unit_no = e.target.value;
                                                            setFormData({ ...formData });
                                                            console.log(formData);
                                                        }}
                                                        style={INPUT}
                                                        placeholder="Unit Number"
                                                    />
                                                    {errors.national_address_unit_no && <ErrMsg>{errors.national_address_unit_no}</ErrMsg>}
                                                </div>

                                                <div className="col-md-3">
                                                    <Label>Zipcode</Label>
                                                    <input
                                                        id="vendor_national_address_zipcode"
                                                        name="vendor_national_address_zipcode"
                                                        value={formData.national_address.zipcode ? formData.national_address.zipcode : ""}
                                                        type="text"
                                                        onChange={(e) => {
                                                            errors["national_address_zipcode"] = "";
                                                            formData.national_address.zipcode = e.target.value;
                                                            setFormData({ ...formData });
                                                            console.log(formData);
                                                        }}
                                                        style={INPUT}
                                                        placeholder="Zipcode"
                                                    />
                                                    {errors.national_address_zipcode && <ErrMsg>{errors.national_address_zipcode}</ErrMsg>}
                                                </div>

                                                <div className="col-md-3">
                                                    <Label>Additional Number</Label>
                                                    <input
                                                        id="vendor_national_address_additional_no"
                                                        name="vendor_national_address_additional_no"
                                                        value={formData.national_address.additional_no ? formData.national_address.additional_no : ""}
                                                        type="text"
                                                        onChange={(e) => {
                                                            errors["national_address_additional_no"] = "";
                                                            formData.national_address.additional_no = e.target.value;
                                                            setFormData({ ...formData });
                                                            console.log(formData);
                                                        }}
                                                        style={INPUT}
                                                        placeholder="Additional Number"
                                                    />
                                                    {errors.national_address_additional_no && <ErrMsg>{errors.national_address_additional_no}</ErrMsg>}
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}

                            </div>
                            </div>{/* end pw-content-scroll */}

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

export default VendorCreate;
