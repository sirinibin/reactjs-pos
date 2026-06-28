import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from "react";
import { Modal } from "react-bootstrap";

import { Spinner } from "react-bootstrap";
import { Typeahead, Menu, MenuItem } from "react-bootstrap-typeahead";
import ExpenseCategoryCreate from "../expense_category/create.js";
import ExpenseCategoryView from "../expense_category/view.js";
//import Resizer from "react-image-file-resizer";
import DatePicker from "react-datepicker";
import { format } from "date-fns";
import { highlightWords } from "../utils/search.js";
import Amount from "../utils/amount.js";
import { trimTo2Decimals } from "../utils/numberUtils";
import VendorCreate from "./../vendor/create.js";
import Vendors from "./../utils/vendors.js";

const columnStyle = {
    width: '20%',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    paddingRight: '8px',
};

const ExpenseCreate = forwardRef((props, ref) => {

    useImperativeHandle(ref, () => ({
        open(id) {

            selectedVendors = [];
            setSelectedVendors(selectedVendors);


            selectedCategories = [];
            setSelectedCategories(selectedCategories);


            formData = {
                images_content: [],
            };
            formData.date_str = new Date();
            setFormData({ ...formData });
            setPendingAttachments([]);

            if (id) {
                getExpense(id);
            }

            getStore(localStorage.getItem("store_id"));
            SetShow(true);
        },

    }));

    let [store, setStore] = useState({});

    async function getStore(id) {
        console.log("inside get Store");
        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': localStorage.getItem('access_token'),
            },
        };

        await fetch('/v1/store/' + id, requestOptions)
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
                store = data.result;
                setStore(store);
            })
            .catch(error => {

            });
    }

    useEffect(() => {
        const listener = event => {
            if (event.code === "Enter" || event.code === "NumpadEnter") {
                console.log("Enter key was pressed. Run your function-expense.");
                // event.preventDefault();

                var form = event.target.form;
                if (form && event.target) {
                    var index = Array.prototype.indexOf.call(form, event.target);
                    if (form && form.elements[index + 1]) {
                        if ((event.target.getAttribute("class") || "").includes("description")) {
                            form.elements[index].focus();
                            form.elements[index].value += '\r\n';
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


    /* function resizeFIle(file, w, h, cb) {
         Resizer.imageFileResizer(
             file,
             w,
             h,
             "JPEG",
             100,
             0,
             (uri) => {
                 cb(uri);
             },
             "base64"
         );
     }

     let [selectedImage, setSelectedImage] = useState("");*/


    let [selectedCategories, setSelectedCategories] = useState([]);
    let [categoryOptions, setCategoryOptions] = useState([]);

    let [errors, setErrors] = useState({});
    const [isProcessing, setProcessing] = useState(false);

    // Attachments: pending = newly added files not yet saved; existing = filenames from server
    const [pendingAttachments, setPendingAttachments] = useState([]);

    // Lightbox state
    const [lightbox, setLightbox] = useState(null); // { items: [{url, isImg, name}], index: 0 }
    function openLightbox(items, index) { setLightbox({ items, index }); }
    function closeLightbox() { setLightbox(null); }
    function lightboxPrev() { setLightbox(lb => ({ ...lb, index: lb.index === 0 ? lb.items.length - 1 : lb.index - 1 })); }
    function lightboxNext() { setLightbox(lb => ({ ...lb, index: lb.index === lb.items.length - 1 ? 0 : lb.index + 1 })); }

    function addAttachments(files) {
        const newItems = [];
        let remaining = files.length;
        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                newItems.push({ name: file.name, type: file.type, size: file.size, dataUrl: e.target.result });
                remaining--;
                if (remaining === 0) {
                    setPendingAttachments(prev => [...prev, ...newItems]);
                }
            };
            reader.readAsDataURL(file);
        });
    }

    function removePendingAttachment(idx) {
        if (!window.confirm('Remove this attachment? Unsaved files will be discarded.')) return;
        setPendingAttachments(prev => prev.filter((_, i) => i !== idx));
    }

    function removeExistingAttachment(filename) {
        if (!window.confirm('Delete this attachment permanently? This cannot be undone.')) return;
        formData.images = (formData.images || []).filter(f => f !== filename);
        setFormData({ ...formData });
    }

    function downloadDataUrl(dataUrl, name) {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    async function downloadServerFile(url, filename) {
        try {
            const response = await fetch(url, {
                headers: { 'Authorization': localStorage.getItem('access_token') },
            });
            if (!response.ok) throw new Error('Failed to fetch file');
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        } catch (e) {
            window.open(url, '_blank');
        }
    }

    function getFileIcon(type, name) {
        const ext = (name || '').toLowerCase().split('.').pop();
        if (type && (type.startsWith('image/') || ['jpg','jpeg','png','gif','webp','bmp','pjpeg'].includes(ext))) return 'bi-file-image';
        if (type === 'application/pdf' || ext === 'pdf') return 'bi-file-earmark-pdf';
        if (['xlsx','xls','csv'].includes(ext)) return 'bi-file-earmark-spreadsheet';
        if (['docx','doc'].includes(ext)) return 'bi-file-earmark-word';
        if (['txt','rtf'].includes(ext)) return 'bi-file-earmark-text';
        if (['zip','rar','7z','tar','gz'].includes(ext)) return 'bi-file-earmark-zip';
        return 'bi-file-earmark';
    }

    function getFileLabel(filename) {
        const ext = (filename || '').toLowerCase().split('.').pop();
        if (['jpg','jpeg','png','gif','webp','bmp','pjpeg'].includes(ext)) return 'Image';
        if (ext === 'pdf') return 'PDF Document';
        if (['xlsx','xls'].includes(ext)) return 'Spreadsheet';
        if (['docx','doc'].includes(ext)) return 'Word Document';
        if (['txt','rtf'].includes(ext)) return 'Text File';
        if (['zip','rar','7z'].includes(ext)) return 'Archive';
        if (ext) return ext.toUpperCase() + ' File';
        return 'File';
    }

    function isImageFile(filename, type) {
        const ext = (filename || '').toLowerCase().split('.').pop();
        return (type && type.startsWith('image/')) || ['jpg','jpeg','png','gif','webp','bmp','pjpeg'].includes(ext);
    }

    function formatBytes(bytes) {
        if (!bytes) return '';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }


    //fields
    let [formData, setFormData] = useState({
        images_content: [],
        date_str: new Date(),
    });

    const [show, SetShow] = useState(false);

    function handleClose() {
        SetShow(false);
    }


    function getExpense(id) {
        console.log("inside get Expense");
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


        fetch('/v1/expense/' + id + "?" + queryParams, requestOptions)
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
                let categoryIds = data.result.category_id;
                let categoryNames = data.result.category_name;

                selectedCategories = [];
                if (categoryIds && categoryNames) {
                    for (var i = 0; i < categoryIds.length; i++) {
                        selectedCategories.push({
                            id: categoryIds[i],
                            name: categoryNames[i],
                        });
                    }
                }

                setSelectedCategories(selectedCategories);

                formData = data.result;
                formData.date_str = formData.date;

                formData.images_content = [];

                setSelectedVendors([]);
                if (formData.vendor_id && formData.vendor_name) {
                    let selectedVendors = [
                        {
                            id: formData.vendor_id,
                            name: formData.vendor_name,
                            search_label: formData.vendor.search_label,
                        }
                    ];
                    setSelectedVendors([...selectedVendors]);
                }

                setFormData({ ...formData });
            })
            .catch(error => {
                setProcessing(false);
                setErrors(error);
            });
    }


    async function suggestCategories(searchTerm) {
        console.log("Inside handle suggest Categories");

        console.log("searchTerm:" + searchTerm);
        if (!searchTerm) {
            return;
        }

        var params = {
            name: searchTerm,
        };

        if (localStorage.getItem("store_id")) {
            params.store_id = localStorage.getItem("store_id");
        }


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

        let Select = "select=id,name";
        let result = await fetch(
            "/v1/expense-category?" + Select + queryString,
            requestOptions
        );
        let data = await result.json();

        setCategoryOptions(data.result);
    }



    useEffect(() => {
        let at = localStorage.getItem("access_token");
        if (!at) {
            window.location = "/";
        }
    });


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

        // Attach pending files as base64 content (strip data URL prefix)
        formData.images_content = pendingAttachments.map(a => a.dataUrl.split(',')[1] || a.dataUrl);

        formData.category_id = [];
        for (var i = 0; i < selectedCategories.length; i++) {
            formData.category_id.push(selectedCategories[i].id);
        }


        console.log("category_id:", formData.category_id);

        if (localStorage.getItem("store_id")) {
            formData.store_id = localStorage.getItem("store_id");
        }


        let endPoint = "/v1/expense";
        let method = "POST";
        if (formData.id) {
            endPoint = "/v1/expense/" + formData.id;
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
                setProcessing(false);

                console.log("Response:");
                console.log(data);
                if (formData.id) {
                    if (props.showToastMessage) props.showToastMessage("Expense updated successfully!", "success");
                } else {
                    if (props.showToastMessage) props.showToastMessage("Expense created successfully!", "success");
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
                if (props.showToastMessage) props.showToastMessage("Failed to process expense!", "danger");
            });
    }




    /*
    function getTargetDimension(originaleWidth, originalHeight, targetWidth, targetHeight) {

        let ratio = parseFloat(originaleWidth / originalHeight);

        targetWidth = parseInt(targetHeight * ratio);
        targetHeight = parseInt(targetWidth * ratio);

        return { targetWidth: targetWidth, targetHeight: targetHeight };
    }*/

    /*
    const DetailsViewRef = useRef();
    function openDetailsView(id) {
        console.log("id:", id);
        DetailsViewRef.current.open(id);
    }
    */


    const ExpenseCategoryCreateFormRef = useRef();
    function openExpenseCategoryCreateForm() {
        ExpenseCategoryCreateFormRef.current.open();
    }

    const ExpenseCategoryDetailsViewRef = useRef();
    function openExpenseCategoryDetailsView(id) {
        ExpenseCategoryDetailsViewRef.current.open(id);
    }


    function openExpenseCategoryUpdateForm(id) {
        ExpenseCategoryCreateFormRef.current.open(id);
    }

    const categorySearchRef = useRef();

    //Vendor
    const VendorCreateFormRef = useRef();
    const [openVendorCreateForm, setOpenVendorCreateForm] = useState(false);
    useEffect(() => {
        if (openVendorCreateForm) {
            VendorCreateFormRef.current.open();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [openVendorCreateForm]);

    function handleVendorCreateFormClose() {
        setOpenVendorCreateForm(false);
    }


    const VendorsRef = useRef();
    const [openVendors, setOpenVendors] = useState(false);
    useEffect(() => {
        if (openVendors) {
            VendorsRef.current.open();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [openVendors]);

    function handleVendorsClose() {
        setOpenVendors(false);
    }


    const handleSelectedVendor = (selectedVendor) => {
        console.log("selectedVendor:", selectedVendor);
        setSelectedVendors([selectedVendor])
        formData.vendor_id = selectedVendor.id;
        setFormData({ ...formData });
    };

    const timerRef = useRef(null);
    const vendorSearchRef = useRef();
    const customVendorFilter = useCallback((option, query) => {
        const normalize = (str) => str?.toLowerCase().replace(/\s+/g, " ").trim() || "";

        const q = normalize(query);
        const qWords = q.split(" ");

        const fields = [
            option.code,
            option.vat_no,
            option.name,
            option.name_in_arabic,
            option.phone,
            option.search_label,
            option.phone_in_arabic,
            ...(Array.isArray(option.additional_keywords) ? option.additional_keywords : []),
        ];

        const searchable = normalize(fields.join(" "));

        return qWords.every((word) => searchable.includes(word));
    }, []);

    let [openVendorSearchResult, setOpenVendorSearchResult] = useState(false);
    const [vendorOptions, setVendorOptions] = useState([]);
    let [selectedVendors, setSelectedVendors] = useState([]);

    async function suggestVendors(searchTerm) {
        console.log("Inside handle suggestVendors");
        setVendorOptions([]);

        console.log("searchTerm:" + searchTerm);
        if (!searchTerm) {
            setTimeout(() => {
                setOpenVendorSearchResult(false);
            }, 100);

            return;
        }

        var params = {
            query: searchTerm,
        };

        if (localStorage.getItem("store_id")) {
            params.store_id = localStorage.getItem("store_id");
        }


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

        let Select = "select=id,credit_balance,credit_limit,additional_keywords,code,use_remarks_in_purchases,remarks,vat_no,name,phone,name_in_arabic,phone_in_arabic,search_label";
        // setIsVendorsLoading(true);
        let result = await fetch(
            "/v1/vendor?" + Select + queryString,
            requestOptions
        );
        let data = await result.json();
        if (!data.result || data.result.length === 0) {
            openVendorSearchResult = false;
            setOpenVendorSearchResult(false);
            return;
        }

        openVendorSearchResult = true;
        setOpenVendorSearchResult(true);




        if (data.result) {
            const filtered = data.result.filter((opt) => customVendorFilter(opt, searchTerm));
            setVendorOptions(filtered);
        } else {
            setVendorOptions([]);
        }
        // setIsVendorsLoading(false);
    }


    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, []);

    // ── Design tokens ──────────────────────────────────────────────────────
    const CARD = { background: '#ffffff', border: '1px solid #c3c6d7', borderRadius: '8px', padding: '24px', marginBottom: '20px' };
    const INPUT = { border: '1px solid #c3c6d7', borderRadius: '4px', padding: '7px 12px', fontSize: '13px', fontFamily: '"Inter", sans-serif', width: '100%', outline: 'none', color: '#191c1e', background: '#fff' };
    const ICON_BTN = { background: '#004ac6', color: '#ffffff', border: 'none', borderRadius: '4px', padding: '7px 10px', fontSize: '13px', cursor: 'pointer', flexShrink: 0, display: 'inline-flex', alignItems: 'center' };

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
        { id: 'details', label: 'Details', icon: 'bi-receipt' },
        { id: 'attachments', label: 'Attachments', icon: 'bi-paperclip' },
    ];

    const [activeTab, setActiveTab] = useState("details");
    // ───────────────────────────────────────────────────────────────────────

    function getErrorTab(key) {
        const k = key.toLowerCase();
        if (['image','photo','attachment'].some(f => k.includes(f))) return 'attachments';
        return 'details';
    }

    const allErrors = Object.entries(errors).filter(([, v]) => v);
    const totalErrors = allErrors.length;

    const tabIds = NAV_TABS.map(t => t.id);
    const currentTabIndex = tabIds.indexOf(activeTab);
    const prevTab = tabIds[currentTabIndex - 1];
    const nextTab = tabIds[currentTabIndex + 1];

    return (
        <>
            {/* Attachment lightbox */}
            {lightbox && (
                <div onClick={closeLightbox} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <button onClick={e => { e.stopPropagation(); closeLightbox(); }} style={{ position: 'absolute', top: 16, right: 20, background: 'none', border: 'none', color: '#fff', fontSize: 28, cursor: 'pointer', zIndex: 2 }}>×</button>
                    {lightbox.items.length > 1 && (
                        <>
                            <button onClick={e => { e.stopPropagation(); lightboxPrev(); }} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: 28, width: 44, height: 44, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
                            <button onClick={e => { e.stopPropagation(); lightboxNext(); }} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: 28, width: 44, height: 44, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
                        </>
                    )}
                    <div onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '90vh', position: 'relative' }}>
                        {lightbox.items[lightbox.index]?.isImg
                            ? <img src={lightbox.items[lightbox.index].url} alt="" style={{ maxWidth: '88vw', maxHeight: '86vh', objectFit: 'contain', borderRadius: 4 }} />
                            : <iframe src={lightbox.items[lightbox.index]?.url} title="attachment" style={{ width: '80vw', height: '80vh', border: 'none', borderRadius: 4, background: '#fff' }} />
                        }
                        {lightbox.items.length > 1 && (
                            <div style={{ textAlign: 'center', color: '#ccc', fontSize: 13, marginTop: 8 }}>
                                {lightbox.index + 1} / {lightbox.items.length}
                            </div>
                        )}
                    </div>
                </div>
            )}
            {openVendors && <Vendors ref={VendorsRef} onSelectVendor={handleSelectedVendor} handleVendorsClose={handleVendorsClose} />}
            {openVendorCreateForm && <VendorCreate ref={VendorCreateFormRef} handleVendorCreateFormClose={handleVendorCreateFormClose} />}
            {/*
            <ExpenseView ref={DetailsViewRef} />
            */}
            <ExpenseCategoryCreate ref={ExpenseCategoryCreateFormRef} openDetailsView={openExpenseCategoryDetailsView} showToastMessage={props.showToastMessage} />

            <ExpenseCategoryView ref={ExpenseCategoryDetailsViewRef} openUpdateForm={openExpenseCategoryUpdateForm} openCreateForm={openExpenseCategoryCreateForm} />


            <Modal show={show} fullscreen onHide={handleClose} animation={false} backdrop="static" dialogClassName="pw-modal">
                <Modal.Header style={{ background: '#ffffff', borderBottom: '1px solid #c3c6d7', padding: '10px 20px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button type="button" onClick={handleClose}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#434655', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 600, fontFamily: 'Inter, sans-serif', padding: '4px 8px', borderRadius: '4px', flexShrink: 0 }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f0f2f4'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                        <i className="bi bi-arrow-left" style={{ fontSize: '16px' }}></i> Back
                    </button>
                    <Modal.Title style={{ fontFamily: '"Hanken Grotesk", sans-serif', fontSize: '17px', fontWeight: 700, color: '#191c1e', letterSpacing: '-0.01em', flex: 1 }}>
                        {formData.id ? `Update Expense — ${formData.description || ''}` : 'Create New Expense'}
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
                                    {formData.id ? 'Edit Expense' : 'New Expense'}
                                </div>
                                <div style={{ fontFamily: '"Inter", sans-serif', fontSize: '11px', color: '#434655' }}>Expense Wizard</div>
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
                            <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px", paddingBottom: "8px" }}>
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

                                {/* ===== TAB 1: DETAILS ===== */}
                                {activeTab === 'details' && (
                                    <>
                                        {/* Vendor */}
                                        <div className="pw-card" style={CARD}>
                                            <SectionTitle icon="bi-shop">Vendor</SectionTitle>
                                            <div className="row g-3">
                                                <div className="col-md-10">
                                                    <Label>Vendor</Label>
                                                    <div className="d-flex gap-1">
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <Typeahead
                                                                id="vendor_search"
                                                                filterBy={() => true}
                                                                labelKey="search_label"
                                                                open={openVendorSearchResult}
                                                                isLoading={false}
                                                                onChange={(selectedItems) => {
                                                                    delete errors.vendor_id;
                                                                    setErrors(errors);
                                                                    if (selectedItems.length === 0) {
                                                                        delete errors.vendor_id;
                                                                        formData.vendor_id = "";
                                                                        setFormData({ ...formData });
                                                                        setSelectedVendors([]);
                                                                        return;
                                                                    }
                                                                    formData.vendor_id = selectedItems[0].id;
                                                                    if (selectedItems[0].use_remarks_in_purchases && selectedItems[0].remarks) {
                                                                        formData.remarks = selectedItems[0].remarks;
                                                                    }

                                                                    setOpenVendorSearchResult(false);
                                                                    setFormData({ ...formData });
                                                                    setSelectedVendors(selectedItems);
                                                                }}
                                                                options={vendorOptions}
                                                                placeholder="Vendor Name / Mob / VAT # / ID"
                                                                selected={selectedVendors}
                                                                highlightOnlyResult={true}
                                                                ref={vendorSearchRef}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === "Escape") {
                                                                        delete errors.vendor_id;
                                                                        setOpenVendorSearchResult(false);
                                                                        formData.vendor_id = "";
                                                                        formData.vendor_name = "";

                                                                        setFormData({ ...formData });
                                                                        setSelectedVendors([]);
                                                                        setVendorOptions([]);
                                                                        vendorSearchRef.current?.clear();
                                                                    }
                                                                }}
                                                                onInputChange={(searchTerm, e) => {
                                                                    if (searchTerm) {
                                                                        formData.vendor_name = searchTerm;
                                                                    }
                                                                    setFormData({ ...formData });
                                                                    if (timerRef.current) clearTimeout(timerRef.current);
                                                                    timerRef.current = setTimeout(() => {
                                                                        suggestVendors(searchTerm);
                                                                    }, 100);
                                                                }}

                                                                renderMenu={(results, menuProps, state) => {
                                                                    const searchWords = state.text.toLowerCase().split(" ").filter(Boolean);

                                                                    return (
                                                                        <Menu {...menuProps}>
                                                                            {/* Header */}
                                                                            <MenuItem disabled>
                                                                                <div style={{ display: 'flex', fontWeight: 'bold', padding: '4px 8px', borderBottom: '1px solid #ddd' }}>
                                                                                    <div style={{ width: '10%' }}>ID</div>
                                                                                    <div style={{ width: '47%' }}>Name</div>
                                                                                    <div style={{ width: '10%' }}>Phone</div>
                                                                                    <div style={{ width: '13%' }}>VAT</div>
                                                                                    <div style={{ width: '10%' }}>Credit Balance</div>
                                                                                    <div style={{ width: '10%' }}>Credit Limit</div>
                                                                                </div>
                                                                            </MenuItem>

                                                                            {/* Rows */}
                                                                            {results.map((option, index) => {
                                                                                const onlyOneResult = results.length === 1;
                                                                                const isActive = state.activeIndex === index || onlyOneResult;
                                                                                return (
                                                                                    <MenuItem option={option} position={index} key={index}>
                                                                                        <div style={{ display: 'flex', padding: '4px 8px' }}>
                                                                                            <div style={{ ...columnStyle, width: '10%' }}>
                                                                                                {highlightWords(
                                                                                                    option.code,
                                                                                                    searchWords,
                                                                                                    isActive
                                                                                                )}
                                                                                            </div>
                                                                                            <div style={{ ...columnStyle, width: '47%' }}>
                                                                                                {highlightWords(
                                                                                                    option.name_in_arabic
                                                                                                        ? `${option.name} - ${option.name_in_arabic}`
                                                                                                        : option.name,
                                                                                                    searchWords,
                                                                                                    isActive
                                                                                                )}
                                                                                            </div>
                                                                                            <div style={{ ...columnStyle, width: '10%' }}>
                                                                                                {highlightWords(option.phone, searchWords, isActive)}
                                                                                            </div>
                                                                                            <div style={{ ...columnStyle, width: '13%' }}>
                                                                                                {highlightWords(option.vat_no, searchWords, isActive)}
                                                                                            </div>
                                                                                            <div style={{ ...columnStyle, width: '10%' }}>
                                                                                                {option.credit_balance && (
                                                                                                    <Amount amount={trimTo2Decimals(option.credit_balance)} />
                                                                                                )}
                                                                                            </div>
                                                                                            <div style={{ ...columnStyle, width: '10%' }}>
                                                                                                {option.credit_limit && (
                                                                                                    <Amount amount={trimTo2Decimals(option.credit_limit)} />
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                    </MenuItem>
                                                                                );
                                                                            })}
                                                                        </Menu>
                                                                    );
                                                                }}
                                                            />
                                                        </div>
                                                        <button type="button" style={ICON_BTN} onClick={() => { setOpenVendorCreateForm(true); }} title="New Vendor">
                                                            <i className="bi bi-plus-lg"></i>
                                                        </button>
                                                        <button type="button" style={ICON_BTN} onClick={() => { setOpenVendors(true); }} title="Browse Vendors">
                                                            <i className="bi bi-list"></i>
                                                        </button>
                                                    </div>
                                                    {errors.vendor_id && <ErrMsg>{errors.vendor_id}</ErrMsg>}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Date & Amount */}
                                        <div className="pw-card" style={CARD}>
                                            <SectionTitle icon="bi-calendar-event">Date & Amount</SectionTitle>
                                            <div className="row g-3">
                                                <div className="col-md-4">
                                                    <Label required>Date</Label>
                                                    <DatePicker
                                                        id="date_str"
                                                        selected={formData.date_str ? new Date(formData.date_str) : null}
                                                        value={formData.date_str ? format(
                                                            new Date(formData.date_str),
                                                            "MMMM d, yyyy h:mm aa"
                                                        ) : null}
                                                        className="form-control"
                                                        dateFormat="MMMM d, yyyy h:mm aa"
                                                        showTimeSelect
                                                        timeIntervals="1"
                                                        onChange={(value) => {
                                                            console.log("Value", value);
                                                            formData.date_str = value;
                                                            setFormData({ ...formData });
                                                        }}
                                                    />
                                                    {errors.date_str && <ErrMsg>{errors.date_str}</ErrMsg>}
                                                </div>
                                                <div className="col-md-3">
                                                    <Label required>Amount</Label>
                                                    <input
                                                        value={formData.amount}
                                                        type='number'
                                                        onChange={(e) => {
                                                            errors["amount"] = "";
                                                            setErrors({ ...errors });

                                                            if (parseFloat(e.target.value) === 0) {
                                                                formData.amount = 0;
                                                                setFormData({ ...formData });
                                                                return;
                                                            }

                                                            if (!e.target.value) {
                                                                formData.amount = "";
                                                                setFormData({ ...formData });
                                                                return;
                                                            }

                                                            if (e.target.value) {
                                                                formData.amount = parseFloat(e.target.value);
                                                            }

                                                            setFormData({ ...formData });
                                                            console.log(formData);
                                                        }}
                                                        style={INPUT}
                                                        id="amount"
                                                        placeholder="Amount"
                                                    />
                                                    {errors.amount && <ErrMsg>{errors.amount}</ErrMsg>}
                                                </div>
                                                <div className="col-md-4">
                                                    <Label>Vendor Invoice No.</Label>
                                                    <input
                                                        id="purchase_vendor_invoice_no"
                                                        name="purchase_vendor_invoice_no"
                                                        value={formData.vendor_invoice_no ? formData.vendor_invoice_no : ""}
                                                        type='text'
                                                        onChange={(e) => {
                                                            delete errors["vendor_invoice_no"];
                                                            setErrors({ ...errors });
                                                            formData.vendor_invoice_no = e.target.value;
                                                            setFormData({ ...formData });
                                                            console.log(formData);
                                                        }}
                                                        style={INPUT}
                                                        placeholder="Vendor Invoice No."
                                                    />
                                                    {errors.vendor_invoice_no && <ErrMsg>{errors.vendor_invoice_no}</ErrMsg>}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Description & Payment */}
                                        <div className="pw-card" style={CARD}>
                                            <SectionTitle icon="bi-card-text">Description & Payment</SectionTitle>
                                            <div className="row g-3">
                                                <div className="col-md-6">
                                                    <Label required>Description</Label>
                                                    <textarea
                                                        value={formData.description ? formData.description : ""}
                                                        onChange={(e) => {
                                                            errors["description"] = "";
                                                            setErrors({ ...errors });
                                                            formData.description = e.target.value;
                                                            setFormData({ ...formData });
                                                            console.log(formData);
                                                        }}
                                                        style={{ ...INPUT, minHeight: '80px', resize: 'vertical' }}
                                                        className="description"
                                                        id="description"
                                                        placeholder="Description"
                                                    />
                                                    {errors.description && <ErrMsg>{errors.description}</ErrMsg>}
                                                </div>
                                                <div className="col-md-4">
                                                    <Label required>Payment Method</Label>
                                                    <select
                                                        value={formData.payment_method}
                                                        onChange={(e) => {
                                                            console.log("Inside onchange payment method");
                                                            if (!e.target.value) {
                                                                formData.payment_method = "";
                                                                errors["status"] = "Invalid Payment Method";
                                                                setErrors({ ...errors });
                                                                return;
                                                            }

                                                            errors["payment_method"] = "";
                                                            setErrors({ ...errors });

                                                            formData.payment_method = e.target.value;
                                                            setFormData({ ...formData });
                                                            console.log(formData);
                                                        }}
                                                        style={INPUT}
                                                    >
                                                        <option value="" SELECTED>Select</option>
                                                        <option value="cash">Cash</option>
                                                        <option value="debit_card">Debit Card</option>
                                                        <option value="credit_card">Credit Card</option>
                                                        <option value="bank_card">Bank Card</option>
                                                        <option value="bank_transfer">Bank Transfer</option>
                                                        <option value="bank_cheque">Bank Cheque</option>
                                                        <option value="purchase_fund">Purchase Fund A/c</option>
                                                    </select>
                                                    {errors.payment_method && <ErrMsg>{errors.payment_method}</ErrMsg>}
                                                </div>
                                            </div>
                                        </div>
                                        {/* Categories */}
                                        <div className="pw-card" style={CARD}>
                                            <SectionTitle icon="bi-folder2-open">Expense Categories</SectionTitle>
                                            <div className="row g-3">
                                                <div className="col-md-8">
                                                    <Label required>Categories</Label>
                                                    <div className="d-flex gap-1">
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <Typeahead
                                                                id="category_id"
                                                                labelKey="name"
                                                                isInvalid={errors.category_id ? true : false}
                                                                onChange={(selectedItems) => {
                                                                    errors.category_id = "";
                                                                    setErrors(errors);
                                                                    if (selectedItems.length === 0) {
                                                                        errors.category_id = "Invalid Category selected";
                                                                        setErrors(errors);
                                                                        setFormData({ ...formData });
                                                                        setSelectedCategories([]);
                                                                        return;
                                                                    }
                                                                    setFormData({ ...formData });
                                                                    setSelectedCategories(selectedItems);
                                                                }}
                                                                options={categoryOptions}
                                                                placeholder="Select Categories"
                                                                selected={selectedCategories}
                                                                highlightOnlyResult={true}
                                                                onInputChange={(searchTerm, e) => {
                                                                    suggestCategories(searchTerm);
                                                                }}
                                                                ref={categorySearchRef}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === "Escape") {
                                                                        setCategoryOptions([]);
                                                                        categorySearchRef.current?.clear();
                                                                    }
                                                                }}
                                                            />
                                                        </div>
                                                        <button type="button" style={ICON_BTN} onClick={openExpenseCategoryCreateForm} title="New Category">
                                                            <i className="bi bi-plus-lg"></i>
                                                        </button>
                                                    </div>
                                                    {errors.category_id && <ErrMsg>{errors.category_id}</ErrMsg>}
                                                </div>
                                            </div>

                                            {selectedCategories && selectedCategories.length > 0 && (
                                                <div style={{ marginTop: '20px', overflowX: 'auto' }}>
                                                    <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                                                        <thead>
                                                            <tr style={{ background: '#eceef0' }}>
                                                                <th style={{ padding: '8px 12px', textAlign: 'left', fontFamily: '"Inter", sans-serif', fontSize: '12px', fontWeight: 600, color: '#434655', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Category</th>
                                                                <th style={{ padding: '8px 12px', textAlign: 'left', fontFamily: '"Inter", sans-serif', fontSize: '12px', fontWeight: 600, color: '#434655', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Action</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {selectedCategories.map((cat, index) => (
                                                                <tr key={cat.id || index} style={{ borderBottom: '1px solid #c3c6d7' }}>
                                                                    <td style={{ padding: '8px 12px', fontFamily: '"Inter", sans-serif', fontSize: '13px', color: '#191c1e', verticalAlign: 'middle' }}>
                                                                        {cat.name}
                                                                    </td>
                                                                    <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                                                                        <button
                                                                            type="button"
                                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ba1a1a', fontSize: '14px', padding: '2px 6px' }}
                                                                            onClick={() => {
                                                                                const updated = selectedCategories.filter((_, i) => i !== index);
                                                                                setSelectedCategories(updated);
                                                                            }}
                                                                            title="Remove"
                                                                        >
                                                                            <i className="bi bi-x-lg"></i>
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}

                                {/* ===== TAB 2: ATTACHMENTS ===== */}
                                {activeTab === 'attachments' && (
                                    <>
                                        <div className="pw-card" style={CARD}>
                                            <SectionTitle icon="bi-paperclip">Attachments</SectionTitle>

                                            {/* Upload area */}
                                            <label style={{
                                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                                border: '2px dashed #c3c6d7', borderRadius: '8px', padding: '32px 20px',
                                                cursor: 'pointer', background: '#f7f9fb', marginBottom: '20px', gap: '8px',
                                            }}
                                                onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#004ac6'; }}
                                                onDragLeave={e => { e.currentTarget.style.borderColor = '#c3c6d7'; }}
                                                onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#c3c6d7'; addAttachments(e.dataTransfer.files); }}
                                            >
                                                <i className="bi bi-cloud-upload" style={{ fontSize: '32px', color: '#004ac6' }}></i>
                                                <span style={{ fontFamily: '"Inter", sans-serif', fontSize: '14px', fontWeight: 600, color: '#191c1e' }}>
                                                    Click or drag files here
                                                </span>
                                                <span style={{ fontFamily: '"Inter", sans-serif', fontSize: '12px', color: '#737686' }}>
                                                    Images, PDFs, Word, Excel — any file type
                                                </span>
                                                <input type="file" multiple accept="*/*" style={{ display: 'none' }}
                                                    onChange={e => { addAttachments(e.target.files); e.target.value = ''; }} />
                                            </label>

                                            {/* Existing server-saved files */}
                                            {formData.images && formData.images.length > 0 && (
                                                <div style={{ marginBottom: '16px' }}>
                                                    <div style={{ fontFamily: '"Inter", sans-serif', fontSize: '12px', fontWeight: 600, color: '#434655', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                                                        Saved Files ({formData.images.length})
                                                    </div>
                                                    {formData.images.map((filename, idx) => {
                                                        const storeId = localStorage.getItem('store_id');
                                                        const basename = filename.includes('/') ? filename.split('/').pop() : filename;
                                                        const url = `/images/${storeId}/expenses/${basename}`;
                                                        const isImg = isImageFile(basename, '');
                                                        const label = getFileLabel(basename);
                                                        const allSaved = (formData.images || []).map((fn, i) => { const bn = fn.includes('/') ? fn.split('/').pop() : fn; return { url: `/images/${localStorage.getItem('store_id')}/expenses/${bn}`, isImg: isImageFile(bn, ''), name: getFileLabel(bn) + ' ' + (i+1) }; });
                                                        return (
                                                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: '#f7f9fb', border: '1px solid #c3c6d7', borderRadius: '6px', marginBottom: '8px' }}>
                                                                {isImg
                                                                    ? <img src={url} alt={label} onClick={() => openLightbox(allSaved, idx)} style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '4px', flexShrink: 0, cursor: 'pointer' }} onError={e => { e.target.style.display = 'none'; }} />
                                                                    : <i className={`bi ${getFileIcon('', filename)}`} style={{ fontSize: '22px', color: '#004ac6', flexShrink: 0 }}></i>
                                                                }
                                                                <span style={{ flex: 1, fontFamily: '"Inter", sans-serif', fontSize: '13px', color: '#191c1e', fontWeight: 500 }}>
                                                                    {label} {idx + 1}
                                                                </span>
                                                                <button type="button" onClick={() => isImg ? openLightbox(allSaved, idx) : window.open(url, '_blank')}
                                                                    style={{ background: '#e8f0fe', color: '#004ac6', border: 'none', borderRadius: '4px', padding: '5px 10px', fontSize: '12px', fontWeight: 600, fontFamily: '"Inter", sans-serif', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                                    <i className="bi bi-eye"></i> View
                                                                </button>
                                                                <button type="button" onClick={() => downloadServerFile(url, `attachment-${idx + 1}.${filename.split('.').pop()}`)}
                                                                    style={{ background: '#d0e1fb', color: '#54647a', border: 'none', borderRadius: '4px', padding: '5px 10px', fontSize: '12px', fontWeight: 600, fontFamily: '"Inter", sans-serif', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                                    <i className="bi bi-download"></i> Download
                                                                </button>
                                                                <button type="button" onClick={() => removeExistingAttachment(filename)}
                                                                    style={{ background: 'none', border: 'none', color: '#ba1a1a', cursor: 'pointer', padding: '4px', fontSize: '16px' }}>
                                                                    <i className="bi bi-trash"></i>
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Pending (newly added) files */}
                                            {pendingAttachments.length > 0 && (
                                                <div>
                                                    <div style={{ fontFamily: '"Inter", sans-serif', fontSize: '12px', fontWeight: 600, color: '#434655', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                                                        New Files ({pendingAttachments.length}) — will save on Create/Update
                                                    </div>
                                                    {pendingAttachments.map((file, idx) => {
                                                        const isImg = isImageFile(file.name, file.type);
                                                        return (
                                                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: '#f0faf0', border: '1px solid #86efac', borderRadius: '6px', marginBottom: '8px' }}>
                                                                {isImg
                                                                    ? <img src={file.dataUrl} alt={file.name} style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '4px', flexShrink: 0 }} />
                                                                    : <i className={`bi ${getFileIcon(file.type, file.name)}`} style={{ fontSize: '22px', color: '#004ac6', flexShrink: 0 }}></i>
                                                                }
                                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                                    <div style={{ fontFamily: '"Inter", sans-serif', fontSize: '13px', color: '#191c1e', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
                                                                    <div style={{ fontFamily: '"Inter", sans-serif', fontSize: '11px', color: '#737686' }}>{formatBytes(file.size)}</div>
                                                                </div>
                                                                {isImg && (
                                                                    <button type="button" onClick={() => { const pendingImgItems = pendingAttachments.map(f => ({ url: f.dataUrl, isImg: isImageFile(f.name, f.type), name: f.name })); openLightbox(pendingImgItems, idx); }}
                                                                        style={{ background: '#e8f0fe', color: '#004ac6', border: 'none', borderRadius: '4px', padding: '5px 10px', fontSize: '12px', fontWeight: 600, fontFamily: '"Inter", sans-serif', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                                        <i className="bi bi-eye"></i>
                                                                    </button>
                                                                )}
                                                                <button type="button" onClick={() => downloadDataUrl(file.dataUrl, file.name)}
                                                                    style={{ background: '#d0e1fb', color: '#54647a', border: 'none', borderRadius: '4px', padding: '5px 10px', fontSize: '12px', fontWeight: 600, fontFamily: '"Inter", sans-serif', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                                    <i className="bi bi-download"></i>
                                                                </button>
                                                                <button type="button" onClick={() => removePendingAttachment(idx)}
                                                                    style={{ background: 'none', border: 'none', color: '#ba1a1a', cursor: 'pointer', padding: '4px', fontSize: '16px' }}>
                                                                    <i className="bi bi-trash"></i>
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {(!formData.images || formData.images.length === 0) && pendingAttachments.length === 0 && (
                                                <div style={{ fontFamily: '"Inter", sans-serif', fontSize: '13px', color: '#737686', textAlign: 'center', paddingTop: '8px' }}>
                                                    No attachments yet.
                                                </div>
                                            )}
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

export default ExpenseCreate;
