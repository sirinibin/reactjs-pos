import React, { useState, forwardRef, useImperativeHandle, useRef } from "react";
import { Modal } from 'react-bootstrap';

import NumberFormat from "react-number-format";

import SalesHistory from "../utils/product_sales_history.js";
import SalesReturnHistory from "./../utils/product_sales_return_history.js";

import PurchaseHistory from "./../utils/product_purchase_history.js";
import PurchaseReturnHistory from "./../utils/product_purchase_return_history.js";

import QuotationHistory from "./../utils/product_quotation_history.js";

import DeliveryNoteHistory from "./../utils/product_delivery_note_history.js";
import Dropdown from 'react-bootstrap/Dropdown';

import ImageGallery from '../utils/ImageGallery.js';
import { ObjectToSearchQueryParams } from '../utils/queryUtils.js';
import { formatInStoreTimezone } from '../utils/dateUtils.js';

const ProductView = forwardRef((props, ref) => {

    const timerRef = useRef(null);
    const ImageGalleryRef = useRef();
    useImperativeHandle(ref, () => ({
        open(id) {
            if (id) {
                getProduct(id);
                if (timerRef.current) clearTimeout(timerRef.current);
                timerRef.current = setTimeout(() => {
                    ImageGalleryRef.current.open();
                }, 300);
                SetShow(true);
            }

        },

    }));


    let [model, setModel] = useState({});


    const [show, SetShow] = useState(false);

    function handleClose() {
        SetShow(false);
    };


    function getProduct(id) {
        console.log("inside get Product");
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

        fetch('/v1/product/' + id + "?" + queryParams, requestOptions)
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
                // setErrors(error);
            });
    }



    /*
    function printBarCode(event) {
        console.log("Clicked:");

        console.log(event.target.getAttribute("src"));

        let encoder = new ThermalPrinterEncoder({
            language: 'esc-pos'
        });

        let img = new Image();
        img.src = event.target.getAttribute("src");

        img.onload = function () {
            console.log("Inside onload")
            let result = encoder
                .image(img, 320, 320, 'atkinson')
                .encode();
            console.log("result:", result);

        }


        /*
        const opt = {
            scale: 4
        }
        const elem = barcodeRef.current;
        html2canvas(elem, opt).then(canvas => {
            const iframe = document.createElement('iframe')
            iframe.name = 'printf'
            iframe.id = 'printf'
            iframe.height = 0;
            iframe.width = 0;
            document.body.appendChild(iframe)

            const imgUrl = canvas.toDataURL({
                format: 'jpeg',
                quality: '1.0'
            })

            const style = `
                height:15vh;
                width:35vw;
                position:relative;
                left:0:
                top:0;
                margin-left:250;
                margin-top:3%;
                margin-bottom:50%;
            `;

            const url = `<img style="${style}" src="${imgUrl}"/>`;
            var newWin = window.frames["printf"];
            newWin.document.write(`<body onload="window.print()" >${url}</body>`);
            newWin.document.close();

        });
        */

    //}

    const SalesHistoryRef = useRef();
    function openSalesHistory(model) {
        SalesHistoryRef.current.open(model);
    }

    const SalesReturnHistoryRef = useRef();
    function openSalesReturnHistory(model) {
        SalesReturnHistoryRef.current.open(model);
    }


    const PurchaseHistoryRef = useRef();
    function openPurchaseHistory(model) {
        PurchaseHistoryRef.current.open(model);
    }

    const PurchaseReturnHistoryRef = useRef();
    function openPurchaseReturnHistory(model) {
        PurchaseReturnHistoryRef.current.open(model);
    }


    const QuotationHistoryRef = useRef();
    function openQuotationHistory(model) {
        QuotationHistoryRef.current.open(model);
    }

    const DeliveryNoteHistoryRef = useRef();
    function openDeliveryNoteHistory(model) {
        DeliveryNoteHistoryRef.current.open(model);
    }


    const PrintBarcode = ({ base64Barcode, productName }) => {
        const handlePrint = () => {
            const printWindow = window.open("", "_blank");
            printWindow.document.write(`
            <html>
              <head>
              <title>${productName}</title>
                <style>
                  @media print {
                    @page {
                      size: 35mm 25mm; /* Label size */
                      margin: 0; /* No extra margins */
                    }
                    body {
                      margin: 0;
                      padding: 0;
                      display: flex;
                      justify-content: center;
                      align-items: center;
                      height: 25mm;
                    }
                    img {
                      width: 35mm;
                      height: 25mm;
                      object-fit: contain; /* Ensures it fits perfectly */
                    }
                  }
                </style>
              </head>
              <body>
                <img src="${base64Barcode}" />
                <script>window.print(); window.close();</script>
              </body>
            </html>
          `);
            printWindow.document.close();
        };

        return (
            <button
                onClick={handlePrint}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #c3c6d7', backgroundColor: '#f7f9fb', color: '#191c1e', padding: '8px 16px', borderRadius: '4px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
            >
                <i className="bi bi-printer" style={{ fontSize: '16px' }}></i>
                Print Barcode
            </button>
        );
    };

    // Determine active store data
    const activeStoreKey = model.product_stores
        ? Object.keys(model.product_stores).find(k =>
            !localStorage.getItem('store_id') || localStorage.getItem('store_id') === model.product_stores[k].store_id
          )
        : null;
    const activeStore = activeStoreKey ? model.product_stores[activeStoreKey] : null;

    return (<>
        <SalesHistory ref={SalesHistoryRef} showToastMessage={props.showToastMessage} />
        <SalesReturnHistory ref={SalesReturnHistoryRef} showToastMessage={props.showToastMessage} />

        <PurchaseHistory ref={PurchaseHistoryRef} showToastMessage={props.showToastMessage} />
        <PurchaseReturnHistory ref={PurchaseReturnHistoryRef} showToastMessage={props.showToastMessage} />

        <QuotationHistory ref={QuotationHistoryRef} showToastMessage={props.showToastMessage} />

        <DeliveryNoteHistory ref={DeliveryNoteHistoryRef} showToastMessage={props.showToastMessage} />

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
                                {model.name}{model.name_in_arabic ? " / " + model.name_in_arabic : ""}
                            </h1>
                            {model.brand_name && (
                                <span style={{ backgroundColor: '#dbeafe', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '2px 8px', borderRadius: '2px', fontSize: '12px', fontWeight: 500, lineHeight: '14px' }}>
                                    {model.brand_name}
                                </span>
                            )}
                            {model.country_name && (
                                <span style={{ backgroundColor: '#f3e8ff', color: '#7e22ce', border: '1px solid #e9d5ff', padding: '2px 8px', borderRadius: '2px', fontSize: '12px', fontWeight: 500, lineHeight: '14px' }}>
                                    {model.country_name}
                                </span>
                            )}
                        </div>
                        {model.part_number && (
                            <p style={{ margin: 0, fontSize: '14px', lineHeight: '20px', color: '#434655', fontWeight: 400 }}>
                                Part No: <span style={{ fontFamily: 'monospace', color: '#004ac6' }}>{model.part_number}</span>
                            </p>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center" style={{ gap: '8px', paddingRight: '32px' }}>
                        <Dropdown>
                            <Dropdown.Toggle style={{ display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #c3c6d7', backgroundColor: '#f7f9fb', color: '#191c1e', padding: '8px 16px', borderRadius: '4px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }} id="dropdown-history">
                                <i className="bi bi-clock-history" style={{ fontSize: '16px' }}></i>
                                History
                            </Dropdown.Toggle>
                            <Dropdown.Menu>
                                <Dropdown.Item onClick={() => openSalesHistory(model)}>
                                    <i className="bi bi-clock-history"></i>&nbsp;Sales History
                                </Dropdown.Item>
                                <Dropdown.Item onClick={() => openSalesReturnHistory(model)}>
                                    <i className="bi bi-clock-history"></i>&nbsp;Sales Return History
                                </Dropdown.Item>
                                <Dropdown.Item onClick={() => openPurchaseHistory(model)}>
                                    <i className="bi bi-clock-history"></i>&nbsp;Purchase History
                                </Dropdown.Item>
                                <Dropdown.Item onClick={() => openPurchaseReturnHistory(model)}>
                                    <i className="bi bi-clock-history"></i>&nbsp;Purchase Return History
                                </Dropdown.Item>
                                <Dropdown.Item onClick={() => openDeliveryNoteHistory(model)}>
                                    <i className="bi bi-clock-history"></i>&nbsp;Delivery Note History
                                </Dropdown.Item>
                                <Dropdown.Item onClick={() => openQuotationHistory(model)}>
                                    <i className="bi bi-clock-history"></i>&nbsp;Quotation History
                                </Dropdown.Item>
                            </Dropdown.Menu>
                        </Dropdown>
                        {props.openCreateForm && (
                            <button onClick={() => { handleClose(); props.openCreateForm(); }} style={{ display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #c3c6d7', backgroundColor: '#f7f9fb', color: '#191c1e', padding: '8px 16px', borderRadius: '4px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                                <i className="bi bi-plus" style={{ fontSize: '18px' }}></i>
                                Create
                            </button>
                        )}
                        {props.openUpdateForm && (
                            <button onClick={() => { handleClose(); props.openUpdateForm(model.id); }} style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#004ac6', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '4px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                                <i className="bi bi-pencil" style={{ fontSize: '16px' }}></i>
                                Edit
                            </button>
                        )}
                    </div>
                </div>

                {/* Main scrollable content */}
                <div className="p-md md:p-xl" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

                    {/* Summary Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-lg">

                        {/* Stock */}
                        <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#434655', lineHeight: '16px' }}>Stock</span>
                            <span style={{ fontSize: '24px', fontWeight: 600, lineHeight: '32px', letterSpacing: '-0.01em', color: '#191c1e', fontFamily: "'Hanken Grotesk', sans-serif" }}>
                                {activeStore ? activeStore.stock : (model.stock ?? '—')} {model.unit || 'Unit(s)'}
                            </span>
                            {activeStore && activeStore.damaged_stock > 0 && (
                                <div style={{ marginTop: '4px', fontSize: '12px', color: '#ba1a1a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <i className="bi bi-exclamation-triangle" style={{ fontSize: '14px' }}></i>
                                    {activeStore.damaged_stock} Damaged/Missing
                                </div>
                            )}
                        </div>

                        {/* Retail Unit Price */}
                        <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#434655', lineHeight: '16px' }}>Retail Unit Price</span>
                            <span style={{ fontSize: '24px', fontWeight: 600, lineHeight: '32px', letterSpacing: '-0.01em', color: '#004ac6', fontFamily: "'Hanken Grotesk', sans-serif" }}>
                                <NumberFormat
                                    value={activeStore ? activeStore.retail_unit_price : ''}
                                    displayType={"text"}
                                    thousandSeparator={true}
                                    renderText={(v) => v || '—'}
                                />
                            </span>
                            {activeStore && activeStore.wholesale_unit_price > 0 && (
                                <div style={{ marginTop: '4px', fontSize: '12px', color: '#434655' }}>
                                    Wholesale: <NumberFormat value={activeStore.wholesale_unit_price} displayType={"text"} thousandSeparator={true} renderText={(v) => v} />
                                </div>
                            )}
                        </div>

                        {/* Purchase Price */}
                        <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#434655', lineHeight: '16px' }}>Purchase Unit Price</span>
                            <span style={{ fontSize: '24px', fontWeight: 600, lineHeight: '32px', letterSpacing: '-0.01em', color: '#191c1e', fontFamily: "'Hanken Grotesk', sans-serif" }}>
                                <NumberFormat
                                    value={activeStore ? activeStore.purchase_unit_price : ''}
                                    displayType={"text"}
                                    thousandSeparator={true}
                                    renderText={(v) => v || '—'}
                                />
                            </span>
                        </div>

                        {/* Category */}
                        <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#434655', lineHeight: '16px' }}>Category</span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                                {model.category_name && model.category_name.length > 0
                                    ? model.category_name.map((name) => (
                                        <span key={name} style={{ backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', padding: '2px 8px', borderRadius: '2px', fontSize: '12px', fontWeight: 500 }}>
                                            {name}
                                        </span>
                                    ))
                                    : <span style={{ fontSize: '18px', fontWeight: 600, color: '#191c1e', fontFamily: "'Hanken Grotesk', sans-serif" }}>—</span>
                                }
                            </div>
                        </div>
                    </div>

                    {/* Main Body Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 items-start" style={{ gap: '32px' }}>

                        {/* Left Column: Product Details & Store Stock Table */}
                        <div className="lg:col-span-8" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

                            {/* Product Details Section */}
                            <section style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                <div style={{ padding: '12px 24px', borderBottom: '1px solid #c3c6d7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f2f4f6' }}>
                                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, lineHeight: '26px', fontFamily: "'Hanken Grotesk', sans-serif", color: '#191c1e' }}>Product Details</h3>
                                </div>
                                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '0' }}>

                                    {/* Barcode row */}
                                    {model.barcode_base64 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '16px', marginBottom: '16px', borderBottom: '1px solid #c3c6d7', gap: '16px', flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: '14px', color: '#434655', flexShrink: 0 }}>Barcode</span>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                                                <img alt="Barcode" src={model.barcode_base64} style={{ width: '200px', height: '100px', objectFit: 'contain' }} />
                                                <PrintBarcode base64Barcode={model.barcode_base64} productName={model.name} />
                                            </div>
                                        </div>
                                    )}

                                    {[
                                        { label: 'Name', value: model.name },
                                        { label: 'Name (Arabic)', value: model.name_in_arabic },
                                        { label: 'Part Number', value: model.part_number ? <span style={{ fontFamily: 'monospace', color: '#004ac6' }}>{model.part_number}</span> : null },
                                        { label: 'Item Code', value: model.item_code },
                                        { label: 'Bar Code', value: model.bar_code },
                                        { label: 'EAN 12', value: model.ean_12 },
                                        { label: 'Store Code', value: model.store_code },
                                        { label: 'Rack / Location', value: model.rack },
                                        { label: 'Brand', value: model.brand_name },
                                        { label: 'Country', value: model.country_name },
                                        { label: 'Unit', value: model.unit || 'Unit(s)' },
                                    ].filter(row => row.value).map((row, idx, arr) => (
                                        <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: idx < arr.length - 1 ? '12px' : '0', marginBottom: idx < arr.length - 1 ? '12px' : '0', borderBottom: idx < arr.length - 1 ? '1px solid #c3c6d7' : 'none' }}>
                                            <span style={{ fontSize: '14px', color: '#434655' }}>{row.label}</span>
                                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e', textAlign: 'right' }}>{row.value}</span>
                                        </div>
                                    ))}

                                    {/* Categories */}
                                    {model.category_name && model.category_name.length > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: '12px', marginTop: '12px', borderTop: '1px solid #c3c6d7', gap: '16px' }}>
                                            <span style={{ fontSize: '14px', color: '#434655', flexShrink: 0 }}>Categories</span>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'flex-end' }}>
                                                {model.category_name.map((name) => (
                                                    <span key={name} style={{ backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', padding: '2px 8px', borderRadius: '2px', fontSize: '12px', fontWeight: 500 }}>
                                                        {name}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* Store-level Stock & Pricing Table */}
                            {model.product_stores && Object.keys(model.product_stores).length > 0 && (
                                <section style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                    <div style={{ padding: '12px 24px', borderBottom: '1px solid #c3c6d7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f2f4f6' }}>
                                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, lineHeight: '26px', fontFamily: "'Hanken Grotesk', sans-serif", color: '#191c1e' }}>Unit Prices & Stock</h3>
                                        <span style={{ fontSize: '12px', fontWeight: 500, color: '#434655' }}>
                                            {Object.keys(model.product_stores).filter(k => !localStorage.getItem('store_id') || localStorage.getItem('store_id') === model.product_stores[k].store_id).length} Store(s)
                                        </span>
                                    </div>
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                                            <thead style={{ backgroundColor: '#f1f5f9' }}>
                                                <tr style={{ fontSize: '13px', fontWeight: 600, color: '#434655', textTransform: 'uppercase', lineHeight: '16px' }}>
                                                    {!localStorage.getItem('store_id') && <th style={{ padding: '12px 24px', fontWeight: 600 }}>Store Name</th>}
                                                    <th style={{ padding: '12px 24px', textAlign: 'right', fontWeight: 600 }}>Purchase Price</th>
                                                    <th style={{ padding: '12px 24px', textAlign: 'right', fontWeight: 600 }}>Wholesale Price</th>
                                                    <th style={{ padding: '12px 24px', textAlign: 'right', fontWeight: 600 }}>Retail Price</th>
                                                    <th style={{ padding: '12px 24px', textAlign: 'center', fontWeight: 600 }}>Damaged/Missing</th>
                                                    <th style={{ padding: '12px 24px', textAlign: 'center', fontWeight: 600 }}>Stock</th>
                                                </tr>
                                            </thead>
                                            <tbody style={{ fontSize: '14px', lineHeight: '20px', color: '#191c1e' }}>
                                                {Object.keys(model.product_stores).map((key, index) => {
                                                    const store = model.product_stores[key];
                                                    if (localStorage.getItem('store_id') && localStorage.getItem('store_id') !== store.store_id) return null;
                                                    return (
                                                        <tr key={index} style={{ borderBottom: '1px solid #c3c6d7' }}
                                                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#f2f4f6'; }}
                                                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; }}
                                                        >
                                                            {!localStorage.getItem('store_id') && <td style={{ padding: '12px 24px', fontWeight: 500 }}>{store.store_name}</td>}
                                                            <td style={{ padding: '12px 24px', textAlign: 'right' }}>
                                                                <NumberFormat value={store.purchase_unit_price} displayType={"text"} thousandSeparator={true} renderText={(v) => v} suffix={" "} />
                                                            </td>
                                                            <td style={{ padding: '12px 24px', textAlign: 'right' }}>
                                                                <NumberFormat value={store.wholesale_unit_price} displayType={"text"} thousandSeparator={true} renderText={(v) => v} suffix={" "} />
                                                            </td>
                                                            <td style={{ padding: '12px 24px', textAlign: 'right', fontWeight: 700, color: '#004ac6' }}>
                                                                <NumberFormat value={store.retail_unit_price} displayType={"text"} thousandSeparator={true} renderText={(v) => v} suffix={" "} />
                                                            </td>
                                                            <td style={{ padding: '12px 24px', textAlign: 'center', color: store.damaged_stock > 0 ? '#ba1a1a' : '#191c1e' }}>
                                                                {store.damaged_stock}
                                                            </td>
                                                            <td style={{ padding: '12px 24px', textAlign: 'center', fontWeight: 700 }}>
                                                                {store.stock}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </section>
                            )}

                            {/* Product Photos */}
                            <section style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                <div style={{ padding: '12px 24px', borderBottom: '1px solid #c3c6d7', backgroundColor: '#f2f4f6' }}>
                                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, lineHeight: '26px', fontFamily: "'Hanken Grotesk', sans-serif", color: '#191c1e' }}>Product Photos</h3>
                                </div>
                                <div style={{ padding: '24px' }}>
                                    <ImageGallery ref={ImageGalleryRef} id={model.id} storeID={model.store_id} storedImages={model.images} modelName={"product"} />
                                </div>
                            </section>
                        </div>

                        {/* Right Column: Sidebar */}
                        <div className="lg:col-span-4" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

                            {/* Pricing Card */}
                            {activeStore && (
                                <section style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                    <div style={{ padding: '12px 24px', borderBottom: '1px solid #c3c6d7', backgroundColor: '#f2f4f6' }}>
                                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, lineHeight: '26px', fontFamily: "'Hanken Grotesk', sans-serif", color: '#191c1e' }}>Pricing & Inventory</h3>
                                    </div>
                                    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '0' }}>
                                        {[
                                            { label: 'Retail Unit Price', value: activeStore.retail_unit_price, highlight: true },
                                            { label: 'Wholesale Unit Price', value: activeStore.wholesale_unit_price },
                                            { label: 'Purchase Unit Price', value: activeStore.purchase_unit_price },
                                            { label: 'Stock', value: `${activeStore.stock} ${model.unit || 'Unit(s)'}`, isText: true },
                                            { label: 'Damaged / Missing', value: `${activeStore.damaged_stock || 0} ${model.unit || 'Unit(s)'}`, isText: true },
                                        ].map((row, idx, arr) => (
                                            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: idx < arr.length - 1 ? '12px' : '0', marginBottom: idx < arr.length - 1 ? '12px' : '0', borderBottom: idx < arr.length - 1 ? '1px solid #c3c6d7' : 'none' }}>
                                                <span style={{ fontSize: '14px', color: '#434655' }}>{row.label}</span>
                                                <span style={{ fontSize: '14px', fontWeight: row.highlight ? 700 : 500, color: row.highlight ? '#004ac6' : '#191c1e' }}>
                                                    {row.isText
                                                        ? row.value
                                                        : <NumberFormat value={row.value} displayType={"text"} thousandSeparator={true} renderText={(v) => v} />
                                                    }
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Metadata */}
                            <section style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                <div style={{ padding: '12px 24px', borderBottom: '1px solid #c3c6d7', backgroundColor: '#f2f4f6' }}>
                                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, lineHeight: '26px', fontFamily: "'Hanken Grotesk', sans-serif", color: '#191c1e' }}>Metadata</h3>
                                </div>
                                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #c3c6d7' }}>
                                        <span style={{ fontSize: '14px', color: '#434655' }}>Created By</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#2563eb', color: '#eeefff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700 }}>
                                                {model.created_by_name ? model.created_by_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : ''}
                                            </div>
                                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e' }}>{model.created_by_name}</span>
                                        </div>
                                    </div>
                                    {model.updated_by_name && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #c3c6d7' }}>
                                            <span style={{ fontSize: '14px', color: '#434655' }}>Updated By</span>
                                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e' }}>{model.updated_by_name}</span>
                                        </div>
                                    )}
                                    {model.created_at && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #c3c6d7' }}>
                                            <span style={{ fontSize: '14px', color: '#434655' }}>Created At</span>
                                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e' }}>{formatInStoreTimezone(model.created_at)}</span>
                                        </div>
                                    )}
                                    {model.updated_at && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                            <span style={{ fontSize: '14px', color: '#434655', flexShrink: 0 }}>Updated At</span>
                                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#191c1e', textAlign: 'right' }}>{formatInStoreTimezone(model.updated_at)}</span>
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            </Modal.Body>
            <Modal.Footer style={{ backgroundColor: '#ffffff', borderTop: '1px solid #c3c6d7', padding: '12px 32px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button onClick={handleClose} style={{ backgroundColor: '#d0e1fb', color: '#54647a', border: 'none', padding: '8px 24px', borderRadius: '4px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                    Cancel
                </button>
                <button onClick={handleClose} style={{ backgroundColor: '#004ac6', color: '#ffffff', border: 'none', padding: '8px 24px', borderRadius: '4px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                    Close
                </button>
            </Modal.Footer>
        </Modal>
    </>);

});

export default ProductView;
