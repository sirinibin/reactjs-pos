import React, { useState, useEffect, useRef, forwardRef, useMemo, useImperativeHandle, useCallback } from "react";
import { Modal } from "react-bootstrap";
import VendorCreate from "./../vendor/create.js";
import ProductCreate from "./../product/create.js";
import { Typeahead, Menu, MenuItem } from "react-bootstrap-typeahead";
import NumberFormat from "react-number-format";
import DatePicker from "react-datepicker";
import { format } from "date-fns";
import { Spinner } from "react-bootstrap";
import ProductView from "./../product/view.js";
import { trimTo2Decimals } from "../utils/numberUtils";
import Vendors from "./../utils/vendors.js";
import Products from "../utils/products.js";
import Amount from "../utils/amount.js";
import { highlightWords } from "../utils/search.js";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { useTranslation } from 'react-i18next';
import { getDateLocale } from "../i18n/dateLocales";
import { ObjectToSearchQueryParams } from '../utils/queryUtils.js';
import SuccessModal from '../utils/SuccessModal.js';
import Preview from '../order/preview.js';
import SourceDocumentPicker from './SourceDocumentPicker.js';
import TableSettingsModal from '../utils/TableSettingsModal.js';
import VendorPending from './../utils/vendor_pending.js';

const DEFAULT_PS_COLUMNS = [
    { key: 'select',      label: 'Select',        width: 3,  visible: true },
    { key: 'part_number', label: 'Part No.',      width: 15, visible: true },
    { key: 'name',        label: 'Name',          width: 37, visible: true },
    { key: 'price',       label: 'P. Unit Price', width: 18, visible: true },
    { key: 'stock',       label: 'Stock',         width: 6,  visible: true },
    { key: 'brand',       label: 'Brand',         width: 16, visible: true },
    { key: 'country',     label: 'Country',       width: 8,  visible: true },
];
const PS_COLS_KEY = 'po_product_search_columns';

const DEFAULT_VENDOR_SEARCH_COLS = [
    { key: 'code',           label: 'Code',          width: 8,  visible: true },
    { key: 'name',           label: 'Name',          width: 37, visible: true },
    { key: 'phone',          label: 'Phone',         width: 13, visible: true },
    { key: 'phone2',         label: 'Phone 2',       width: 13, visible: true },
    { key: 'vat_no',         label: 'VAT No.',       width: 17, visible: true },
    { key: 'credit_balance', label: 'Credit Balance',width: 12, visible: true },
];
const PO_VENDOR_COLS_KEY = 'po_vendor_search_columns';

// eslint-disable-next-line no-unused-vars
const columnStyle = {
    width: '20%',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    paddingRight: '8px',
};

const PurchaseOrderCreate = forwardRef((props, ref) => {
    const { t, i18n } = useTranslation('common');
    const dateLocale = useMemo(() => getDateLocale(i18n.language), [i18n.language]);

    useImperativeHandle(ref, () => ({
        open(id) {
            errors = {};
            setErrors({ ...errors });
            selectedProducts = [];
            setSelectedProducts([]);
            if (!id) {
                setTimeout(() => {
                    selectedProducts = [];
                    setSelectedProducts([]);
                    formData.products = [];
                }, 50);
            }
            selectedVendors = [];
            setSelectedVendors([]);

            formData = {
                vat_percent: 15.0,
                discount: 0.0,
                discount_percent: 0.0,
                shipping_handling_fees: 0.00,
                rounding_amount: 0.00,
                auto_rounding_amount: true,
                date_str: new Date(),
                status: "draft",
            };

            if (localStorage.getItem('store_id')) {
                formData.store_id = localStorage.getItem('store_id');
                formData.store_name = localStorage.getItem('store_name');
            }

            setFormData({ ...formData });
            pendingIdRef.current = id || null;
            if (id) {
                getPurchaseOrder(id);
            }
            setShow(true);
        },
    }));

    const pendingIdRef = useRef(null);
    const PreviewRef = useRef();
    const [showOrderPreview, setShowOrderPreview] = useState(false);
    const SourceDocumentPickerRef = useRef();
    const [importDropdownOpen, setImportDropdownOpen] = useState(false);
    const importDropdownRef = useRef();

    const [showProductSearchSettings, setShowProductSearchSettings] = useState(false);
    const [searchProductsColumns, setSearchProductsColumns] = useState(() => {
        try {
            const saved = localStorage.getItem(PS_COLS_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                const keyMap = {};
                parsed.forEach(c => { keyMap[c.key] = c; });
                return DEFAULT_PS_COLUMNS.map(d => keyMap[d.key] ? { ...d, ...keyMap[d.key] } : d);
            }
        } catch {}
        return DEFAULT_PS_COLUMNS.map(c => ({ ...c }));
    });
    const [showVendorSearchSettings, setShowVendorSearchSettings] = useState(false);
    const [vendorSearchColumns, setVendorSearchColumns] = useState(() => {
        try {
            const saved = localStorage.getItem(PO_VENDOR_COLS_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                const keyMap = {};
                parsed.forEach(c => { keyMap[c.key] = c; });
                return DEFAULT_VENDOR_SEARCH_COLS.map(d => keyMap[d.key] ? { ...d, ...keyMap[d.key] } : d);
            }
        } catch {}
        return DEFAULT_VENDOR_SEARCH_COLS.map(c => ({ ...c }));
    });
    // eslint-disable-next-line no-unused-vars
    const psColResizeRef = useRef(null);

    const _defaultSelVendorFieldsOrder = ['name', 'code', 'name_arabic', 'credit_limit', 'vat_no', 'credit_balance', 'phone1', 'phone2'];
    const _selVendorFieldLabels = { name: 'Name', code: 'Vendor ID', name_arabic: 'Name (Arabic)', credit_balance: 'Credit Balance', credit_limit: 'Credit Limit', vat_no: 'VAT NO.', phone1: 'Phone 1', phone2: 'Phone 2' };
    const [selVendorFieldsVisible, setSelVendorFieldsVisible] = useState(() => {
        const defaults = Object.fromEntries(_defaultSelVendorFieldsOrder.map(k => [k, true]));
        try { const s = localStorage.getItem('po_sel_vendor_fields_visible'); if (s) return { ...defaults, ...JSON.parse(s) }; } catch {}
        return defaults;
    });
    const [selVendorFieldsOrder, setSelVendorFieldsOrder] = useState(() => {
        try {
            const s = localStorage.getItem('po_sel_vendor_fields_order');
            if (s) { const saved = JSON.parse(s); const newKeys = _defaultSelVendorFieldsOrder.filter(k => !saved.includes(k)); return [...saved, ...newKeys]; }
        } catch {}
        return [..._defaultSelVendorFieldsOrder];
    });
    const [showSelVendorSettings, setShowSelVendorSettings] = useState(false);
    const selVendorFieldsDragRef = useRef(null);
    const updateSelVendorFieldVisible = (key, val) => {
        const next = { ...selVendorFieldsVisible, [key]: val };
        setSelVendorFieldsVisible(next);
        localStorage.setItem('po_sel_vendor_fields_visible', JSON.stringify(next));
    };
    const [showVendorPending, setShowVendorPending] = useState(false);
    const VendorPendingRef = useRef();
    function openVendorPending(vendor) {
        setShowVendorPending(true);
        setTimeout(() => { VendorPendingRef.current?.open(false, vendor); }, 100);
    }


    let [errors, setErrors] = useState({});
    const [isProcessing, setProcessing] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    let [disablePreviousButton, setDisablePreviousButton] = useState(false);

    let [formData, setFormData] = useState({
        vat_percent: 15.0,
        discount: 0.0,
        discount_percent: 0.0,
        status: "draft",
    });

    // Vendor
    const [vendorOptions, setVendorOptions] = useState([]);
    let [selectedVendors, setSelectedVendors] = useState([]);
    const vendorSearchRef = useRef();
    const [openVendorSearchResult, setOpenVendorSearchResult] = useState(false);

    // Product
    const [productOptions, setProductOptions] = useState([]);
    let selectedProduct = [];
    let [selectedProducts, setSelectedProducts] = useState([]);
    const productSearchRef = useRef();
    const [openProductSearchResult, setOpenProductSearchResult] = useState(false);

    // Refs
    const timerRef = useRef(null);
    const VendorsRef = useRef();
    const VendorCreateFormRef = useRef();
    const ProductCreateFormRef = useRef();
    const ProductDetailsViewRef = useRef();
    const ProductsRef = useRef();
    const latestRequestRef = useRef(null);
    const onChangeTriggeredRef = useRef(false);
    const inputRefs = useRef([]);

    // Discount / shipping / rounding state
    let [discount, setDiscount] = useState(0.00);
    let [discountWithVAT, setDiscountWithVAT] = useState(0.00);
    let [discountPercent, setDiscountPercent] = useState(0.00);
    let [discountPercentWithVAT, setDiscountPercentWithVAT] = useState(0.00);
    let [shipping, setShipping] = useState(0.00);
    let [roundingAmount, setRoundingAmount] = useState(0.00);
    const discountRef = useRef();
    const [activeInput, setActiveInput] = useState({ key: null, value: '' });

    const [show, setShow] = useState(false);

    function handleClose() {
        selectedProducts = [];
        setSelectedProducts([]);
        setShow(false);
    }

    function openPreview() {
        if (!formData.id) return;
        setShowOrderPreview(true);
        setTimeout(() => {
            PreviewRef.current?.open(formData, undefined, "purchase_order");
        }, 100);
    }

    function sendWhatsAppMessage() {
        if (!formData.id) return;
        setShowOrderPreview(true);
        setTimeout(() => {
            PreviewRef.current?.open(formData, "whatsapp", "whatsapp_purchase_order");
        }, 100);
    }

    const visiblePsCols = searchProductsColumns.filter(c => c.visible);
    const totalPsWidth = visiblePsCols.reduce((s, c) => s + c.width, 0);
    // eslint-disable-next-line no-unused-vars
    const getPsColWidth = (col) => `${(col.width / totalPsWidth) * 100}%`;

    function handleTogglePsColumn(index) {
        const updated = searchProductsColumns.map((c, i) => i === index ? { ...c, visible: !c.visible } : c);
        setSearchProductsColumns(updated);
        localStorage.setItem(PS_COLS_KEY, JSON.stringify(updated));
    }

    function handlePsColumnDragEnd(result) {
        if (!result.destination) return;
        const reordered = Array.from(searchProductsColumns);
        const [moved] = reordered.splice(result.source.index, 1);
        reordered.splice(result.destination.index, 0, moved);
        setSearchProductsColumns(reordered);
        localStorage.setItem(PS_COLS_KEY, JSON.stringify(reordered));
    }

    function restorePsDefaults() {
        const cloned = DEFAULT_PS_COLUMNS.map(c => ({ ...c }));
        setSearchProductsColumns(cloned);
        localStorage.setItem(PS_COLS_KEY, JSON.stringify(cloned));
    }

    const startPsColResize = useCallback((e, colKey) => {
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        let currentCols = null;
        setSearchProductsColumns(prev => { currentCols = prev; return prev; });
        setTimeout(() => {
            const cols = currentCols || DEFAULT_PS_COLUMNS;
            const col = cols.find(c => c.key === colKey);
            if (!col) return;
            const startWidth = col.width;
            // eslint-disable-next-line no-unused-vars
            const visibleCount = cols.filter(c => c.visible).length;
            const totalW = cols.filter(c => c.visible).reduce((s, c) => s + c.width, 0);
            const menuVw = 80;
            const pxPerUnit = (window.innerWidth * menuVw / 100) / totalW;

            function onMouseMove(ev) {
                const diffPx = ev.clientX - startX;
                const diffUnits = diffPx / pxPerUnit;
                const newWidth = Math.max(3, startWidth + diffUnits);
                setSearchProductsColumns(prev => {
                    const updated = prev.map(c => c.key === colKey ? { ...c, width: parseFloat(newWidth.toFixed(1)) } : c);
                    localStorage.setItem(PS_COLS_KEY, JSON.stringify(updated));
                    return updated;
                });
            }
            function onMouseUp() {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                document.body.style.cursor = '';
            }
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            document.body.style.cursor = 'col-resize';
        }, 0);
    }, []);

    function handleToggleVendorCol(index) {
        const updated = vendorSearchColumns.map((c, i) => i === index ? { ...c, visible: !c.visible } : c);
        setVendorSearchColumns(updated);
        localStorage.setItem(PO_VENDOR_COLS_KEY, JSON.stringify(updated));
    }
    function handleVendorColDragEnd(result) {
        if (!result.destination) return;
        const reordered = Array.from(vendorSearchColumns);
        const [moved] = reordered.splice(result.source.index, 1);
        reordered.splice(result.destination.index, 0, moved);
        setVendorSearchColumns(reordered);
        localStorage.setItem(PO_VENDOR_COLS_KEY, JSON.stringify(reordered));
    }
    function restoreVendorColDefaults() {
        const cloned = DEFAULT_VENDOR_SEARCH_COLS.map(c => ({ ...c }));
        setVendorSearchColumns(cloned);
        localStorage.setItem(PO_VENDOR_COLS_KEY, JSON.stringify(cloned));
    }
    const startVendorColResize = useCallback((e, colKey) => {
        e.preventDefault(); e.stopPropagation();
        const startX = e.clientX;
        let currentCols = null;
        setVendorSearchColumns(prev => { currentCols = prev; return prev; });
        setTimeout(() => {
            const cols = currentCols || DEFAULT_VENDOR_SEARCH_COLS;
            const col = cols.find(c => c.key === colKey);
            if (!col) return;
            const startWidth = col.width;
            const totalW = cols.filter(c => c.visible).reduce((s, c) => s + c.width, 0);
            const pxPerUnit = (window.innerWidth * 0.95) / totalW;
            function onMouseMove(ev) {
                const newWidth = Math.max(3, startWidth + (ev.clientX - startX) / pxPerUnit);
                setVendorSearchColumns(prev => {
                    const updated = prev.map(c => c.key === colKey ? { ...c, width: parseFloat(newWidth.toFixed(1)) } : c);
                    localStorage.setItem(PO_VENDOR_COLS_KEY, JSON.stringify(updated));
                    return updated;
                });
            }
            function onMouseUp() {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                document.body.style.cursor = '';
            }
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            document.body.style.cursor = 'col-resize';
        }, 0);
    }, []);

    function handleImportFromSource(doc, docType) {
        if (!doc || !doc.products || doc.products.length === 0) return;
        const isPurchaseType = docType === "purchase" || docType === "purchase_return";
        const vatPercent = formData.vat_percent || 0;
        doc.products.forEach(p => {
            const purchaseUnitPrice = isPurchaseType
                ? (p.purchase_unit_price || 0)
                : (p.unit_price || 0);
            const purchaseUnitPriceWithVAT = isPurchaseType
                ? (p.purchase_unit_price_with_vat || (purchaseUnitPrice * (1 + vatPercent / 100)))
                : (p.unit_price_with_vat || (purchaseUnitPrice * (1 + vatPercent / 100)));
            const unitDiscountWithVAT = parseFloat(trimTo2Decimals((p.unit_discount || 0) * (1 + vatPercent / 100)));
            selectedProducts = [...selectedProducts, {
                product_id: p.product_id || "",
                name: p.name || "",
                name_in_arabic: p.name_in_arabic || "",
                part_number: p.part_number || "",
                item_code: p.item_code || "",
                unit: p.unit || "",
                quantity: p.quantity || 1,
                purchase_unit_price: purchaseUnitPrice,
                purchase_unit_price_with_vat: purchaseUnitPriceWithVAT,
                unit_discount: p.unit_discount || 0,
                unit_discount_with_vat: unitDiscountWithVAT,
                unit_discount_percent: purchaseUnitPrice > 0 ? parseFloat(trimTo2Decimals(((p.unit_discount || 0) / purchaseUnitPrice) * 100)) : 0,
                unit_discount_percent_with_vat: 0,
                is_service: p.is_service || false,
            }];
        });
        setSelectedProducts([...selectedProducts]);
        formData.products = selectedProducts;
        reCalculate();
    }

    useEffect(() => {
        let at = localStorage.getItem("access_token");
        if (!at) {
            window.location = "/";
        }
    });

    useEffect(() => {
        if (!importDropdownOpen) return;
        function handleClickOutside(e) {
            if (importDropdownRef.current && !importDropdownRef.current.contains(e.target)) {
                setImportDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [importDropdownOpen]);

    async function getPurchaseOrder(id) {
        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': localStorage.getItem('access_token'),
            },
        };
        let queryParams = ObjectToSearchQueryParams({ store_id: localStorage.getItem("store_id") });

        fetch('/v1/purchase-order/' + id + "?" + queryParams, requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();
                if (!response.ok) return Promise.reject(data.errors);
                setErrors({});

                const po = data.result;

                discount = po.discount || 0;
                setDiscount(discount);
                discountWithVAT = po.discount_with_vat || 0;
                setDiscountWithVAT(discountWithVAT);
                discountPercent = po.discount_percent || 0;
                setDiscountPercent(discountPercent);
                discountPercentWithVAT = po.discount_percent_with_vat || 0;
                setDiscountPercentWithVAT(discountPercentWithVAT);
                shipping = po.shipping_handling_fees || 0;
                setShipping(shipping);
                roundingAmount = po.rounding_amount || 0;
                setRoundingAmount(roundingAmount);

                formData = {
                    ...po,
                    date_str: po.date ? new Date(po.date) : new Date(),
                    expected_date_str: po.expected_date ? new Date(po.expected_date) : null,
                    vat_percent: po.vat_percent ?? 15.0,
                };
                setFormData({ ...formData });

                if (po.vendor_id && po.vendor_name) {
                    selectedVendors = [{ id: po.vendor_id, name: po.vendor_name, search_label: po.vendor_name }];
                    setSelectedVendors([...selectedVendors]);
                }

                if (po.products && po.products.length > 0) {
                    selectedProducts = po.products.map((p, i) => ({
                        ...p,
                        index: i,
                        purchase_unit_price: p.purchase_unit_price,
                        purchase_unit_price_with_vat: p.purchase_unit_price_with_vat,
                        unit_discount: p.unit_discount || 0,
                        unit_discount_with_vat: p.unit_discount_with_vat || 0,
                        unit_discount_percent: p.unit_discount_percent || 0,
                    }));
                    setSelectedProducts([...selectedProducts]);
                }
            })
            .catch(error => setErrors({ ...error }));
    }

    function suggestVendors(searchTerm) {
        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: localStorage.getItem("access_token"),
            },
        };
        let searchParams = { store_id: localStorage.getItem("store_id"), search: searchTerm, limit: 20 };
        let queryParams = ObjectToSearchQueryParams(searchParams);
        fetch("/v1/vendor?" + queryParams + "&select=id,code,name,name_in_arabic,phone,phone2,vat_no,credit_balance,credit_limit", requestOptions)
            .then(async response => {
                const data = await response.json();
                if (!response.ok) return Promise.reject(data.errors);
                setVendorOptions(data.result.map(v => ({ ...v, search_label: v.name })));
                setOpenVendorSearchResult(true);
            })
            .catch(e => console.log(e));
    }

    async function getLastPurchaseOrder() {
        const storeId = localStorage.getItem("store_id");
        const requestOptions = { method: 'GET', headers: { 'Content-Type': 'application/json', Authorization: localStorage.getItem('access_token') } };
        const response = await fetch(`/v1/purchase-order?search[store_id]=${storeId}&sort=-created_at&limit=1`, requestOptions);
        const data = await response.json();
        if (!data.result || data.result.length === 0) return;
        disablePreviousButton = false;
        setDisablePreviousButton(false);
        getPurchaseOrder(data.result[0].id);
    }

    async function getPreviousPurchaseOrder(id) {
        const queryParams = ObjectToSearchQueryParams({ store_id: localStorage.getItem("store_id") });
        const requestOptions = { method: 'GET', headers: { 'Content-Type': 'application/json', Authorization: localStorage.getItem('access_token') } };
        const response = await fetch('/v1/previous-purchase-order/' + id + "?" + queryParams, requestOptions);
        const data = await response.json();
        if (!data.result) {
            disablePreviousButton = true;
            setDisablePreviousButton(true);
            return;
        }
        disablePreviousButton = false;
        setDisablePreviousButton(false);
        getPurchaseOrder(data.result.id);
    }

    async function getNextPurchaseOrder(id) {
        const queryParams = ObjectToSearchQueryParams({ store_id: localStorage.getItem("store_id") });
        const requestOptions = { method: 'GET', headers: { 'Content-Type': 'application/json', Authorization: localStorage.getItem('access_token') } };
        const response = await fetch('/v1/next-purchase-order/' + id + "?" + queryParams, requestOptions);
        const data = await response.json();
        if (!data.result) {
            // No next record — open blank create form
            selectedProducts = [];
            setSelectedProducts([]);
            formData = {
                vat_percent: 15.0, discount: 0.0, discount_percent: 0.0,
                shipping_handling_fees: 0.00, rounding_amount: 0.00,
                auto_rounding_amount: true, date_str: new Date(), status: "draft",
                store_id: localStorage.getItem('store_id'),
                store_name: localStorage.getItem('store_name'),
            };
            setFormData({ ...formData });
            selectedVendors = [];
            setSelectedVendors([]);
            return;
        }
        disablePreviousButton = false;
        setDisablePreviousButton(false);
        getPurchaseOrder(data.result.id);
    }

    function openVendorCreateForm() { VendorCreateFormRef.current.open(); }
    function openVendors() {
        VendorsRef.current.open(false, []);
    }
    function handleSelectedVendor(vendor) {
        if (!vendor || !vendor.id) return;
        selectedVendors = [{ ...vendor, search_label: vendor.name }];
        setSelectedVendors([...selectedVendors]);
        formData.vendor_id = vendor.id;
        formData.vendor_name = vendor.name;
        setFormData({ ...formData });
    }
    function openVendorUpdateForm(id) { VendorCreateFormRef.current.open(id); }
    const handleVendorUpdated = (updatedVendor) => {
        if (updatedVendor?.name && updatedVendor?.id) {
            selectedVendors = [{ id: updatedVendor.id, name: updatedVendor.name, search_label: updatedVendor.name }];
            setSelectedVendors([...selectedVendors]);
            formData.vendor_id = updatedVendor.id;
            setFormData({ ...formData });
        }
    };

    const customFilter = useCallback((option, query) => {
        const normalize = (str) => str?.toLowerCase().replace(/\s+/g, " ").trim() || "";
        const q = normalize(query);
        const qWords = q.split(" ");
        const prefixPart = option.prefix_part_number || "";
        const partNo = option.part_number || "";
        const partNoLabel = prefixPart && partNo ? prefixPart + "-" + partNo : (prefixPart || partNo);
        const fields = [
            partNoLabel, prefixPart, partNo,
            option.name || "", option.name_in_arabic || "",
            option.country_name || "", option.brand_name || "",
            option.search_label || "", option.item_code || "",
            ...(Array.isArray(option.additional_keywords) ? option.additional_keywords : []),
        ];
        const searchable = normalize(fields.join(" "));
        const searchableCompact = fields.join(" ").toLowerCase()
            .replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ").trim();
        if (qWords.every((word) => {
            if (searchable.includes(word)) return true;
            const wordCompact = word.replace(/[^\p{L}\p{N}]/gu, "");
            if (!wordCompact || /^[^\p{L}\p{N}]/u.test(word)) return false;
            return searchableCompact.includes(wordCompact);
        })) return true;
        const qNoSpace = q.replace(/\s+/g, "");
        const searchableNoSpace = searchable.replace(/\s+/g, "");
        return qNoSpace.length >= 2 && searchableNoSpace.includes(qNoSpace);
    }, []);

    const percentOccurrence = (words, product) => {
        const partNoLabel = product.prefix_part_number ? product.prefix_part_number + "-" + product.part_number : "";
        const fields = [partNoLabel, product.prefix_part_number, product.part_number,
            product.name, product.name_in_arabic, product.country_name, product.brand_name,
            ...(Array.isArray(product.additional_keywords) ? product.additional_keywords : [])];
        const searchable = fields.join(" ").toLowerCase();
        const searchableWords = searchable.split(/\s+/).filter(Boolean);
        let totalMatches = 0;
        words.forEach(word => {
            if (word) {
                const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
                const matches = searchable.match(regex);
                totalMatches += matches ? matches.length : 0;
            }
        });
        return searchableWords.length > 0 ? (totalMatches / searchableWords.length) : 0;
    };

    const suggestProducts = useCallback(async (searchTerm) => {
        const requestId = Date.now();
        latestRequestRef.current = requestId;
        setProductOptions([]);
        searchTerm = searchTerm.replace(/\s+/g, " ").trim();
        if (!searchTerm) { setTimeout(() => setOpenProductSearchResult(false), 300); return; }

        const apiSearchTerm = searchTerm
            .replace(/([a-zA-Z؀-ۿ]{2,})(\d{2,})/g, "$1 $2")
            .replace(/(\d{2,})([a-zA-Z؀-ۿ]{2,})/g, "$1 $2")
            .split(/\s+/).map(w => w.replace(/^-+/, "")).filter(Boolean).join(" ");

        const storeId = localStorage.getItem("store_id");
        const params = { search_text: apiSearchTerm || searchTerm, store_id: storeId };
        const queryString = ObjectToSearchQueryParams(params);
        const Select = `select=id,rack,allow_duplicates,additional_keywords,search_label,set.name,item_code,prefix_part_number,country_name,brand_name,part_number,name,unit,name_in_arabic,is_service,product_stores.${storeId}.purchase_unit_price,product_stores.${storeId}.purchase_unit_price_with_vat,product_stores.${storeId}.stock,product_stores.${storeId}.warehouse_stocks`;

        const result = await fetch(`/v1/product?${Select}&${queryString}&limit=100&sort=-country_name`, {
            method: "GET",
            headers: { "Content-Type": "application/json", Authorization: localStorage.getItem("access_token") },
        });
        const data = await result.json();
        if (latestRequestRef.current !== requestId) return;

        const products = data.result || [];
        if (!products.length) { setOpenProductSearchResult(false); return; }

        const filtered = products.filter(opt => customFilter(opt, searchTerm));

        const sorted = filtered.sort((a, b) => {
            const aHasCountry = !!(a.country_name && a.country_name.trim());
            const bHasCountry = !!(b.country_name && b.country_name.trim());
            if (aHasCountry && bHasCountry) return a.country_name.localeCompare(b.country_name);
            if (aHasCountry && !bHasCountry) return -1;
            if (!aHasCountry && bHasCountry) return 1;
            const getSearchable = (item) => {
                const pnLabel = item.prefix_part_number ? item.prefix_part_number + "-" + item.part_number : "";
                return [pnLabel, item.name, item.name_in_arabic, item.country_name, item.brand_name,
                    ...(Array.isArray(item.additional_keywords) ? item.additional_keywords : [])]
                    .join(" ").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
            };
            const searchPhrase = searchTerm.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
            const aIdx = getSearchable(a).indexOf(searchPhrase);
            const bIdx = getSearchable(b).indexOf(searchPhrase);
            if (aIdx === 0 && bIdx !== 0) return -1;
            if (bIdx === 0 && aIdx !== 0) return 1;
            if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
            if (aIdx !== -1) return -1;
            if (bIdx !== -1) return 1;
            const words = searchTerm.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);
            return percentOccurrence(words, b) - percentOccurrence(words, a);
        });

        setProductOptions(sorted);
        setOpenProductSearchResult(true);
    }, [customFilter]);

    function isProductAdded(productID) {
        for (let i = 0; i < selectedProducts.length; i++) {
            if (selectedProducts[i].product_id === productID) return true;
        }
        return false;
    }

    function removeProductByObject(product) {
        const idx = selectedProducts.findIndex(p => p.product_id === product.id);
        if (idx > -1) removeProduct(idx);
    }

    function addProduct(product, keepOpen = false) {
        const vatPercent = formData.vat_percent || 0;
        const storeId = localStorage.getItem("store_id");
        const storeData = product.product_stores?.[storeId];
        const purchaseUnitPrice = storeData?.purchase_unit_price || product.purchase_unit_price || 0;
        const purchaseUnitPriceWithVAT = storeData?.purchase_unit_price_with_vat || product.purchase_unit_price_with_vat || (purchaseUnitPrice * (1 + vatPercent / 100));

        const newProduct = {
            product_id: product.id,
            name: product.name,
            name_in_arabic: product.name_in_arabic || "",
            part_number: product.part_number || "",
            item_code: product.item_code || "",
            unit: product.unit || "",
            stock: storeData?.stock ?? product.stock ?? 0,
            quantity: 1,
            purchase_unit_price: purchaseUnitPrice,
            purchase_unit_price_with_vat: purchaseUnitPriceWithVAT,
            unit_discount: 0,
            unit_discount_with_vat: 0,
            unit_discount_percent: 0,
            unit_discount_percent_with_vat: 0,
            is_service: product.is_service || false,
        };

        selectedProducts = [...selectedProducts, newProduct];
        setSelectedProducts([...selectedProducts]);
        formData.products = selectedProducts;
        reCalculate();

        // focus on quantity of last row
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            const lastIdx = selectedProducts.length - 1;
            if (inputRefs.current[lastIdx]) {
                const qtyKey = `purchase_order_product_quantity_${lastIdx}`;
                inputRefs.current[lastIdx][qtyKey]?.select();
            }
        }, 100);

        if (!keepOpen) {
            productSearchRef.current?.clear();
            setProductOptions([]);
            setOpenProductSearchResult(false);
        }
    }

    function handleSelectedProducts(products) {
        if (!products || products.length === 0) return;
        products.forEach(p => addProduct(p));
    }

    function removeProduct(index) {
        selectedProducts.splice(index, 1);
        setSelectedProducts([...selectedProducts]);
        formData.products = selectedProducts;
        reCalculate();
    }

    function reCalculate() {
        const vatPercent = formData.vat_percent || 0;
        let total = 0, totalWithVAT = 0;
        for (const p of selectedProducts) {
            total += (p.quantity || 0) * ((p.purchase_unit_price || 0) - (p.unit_discount || 0));
            totalWithVAT += (p.quantity || 0) * ((p.purchase_unit_price_with_vat || 0) - (p.unit_discount_with_vat || 0));
        }
        total = parseFloat(trimTo2Decimals(total));
        totalWithVAT = parseFloat(trimTo2Decimals(totalWithVAT));
        const d = parseFloat(discount) || 0;
        const s = parseFloat(shipping) || 0;
        const base = total + s - d;
        const vatPrice = parseFloat(trimTo2Decimals(base * (vatPercent / 100)));
        let netTotal = parseFloat(trimTo2Decimals(base + vatPrice));
        const rounding = parseFloat(roundingAmount) || 0;
        netTotal = parseFloat(trimTo2Decimals(netTotal + rounding));

        formData.total = total;
        formData.total_with_vat = totalWithVAT;
        formData.vat_price = vatPrice;
        formData.net_total = netTotal;
        formData.discount = d;
        formData.discount_with_vat = parseFloat(trimTo2Decimals(d * (1 + vatPercent / 100)));
        formData.shipping_handling_fees = s;
        formData.rounding_amount = rounding;
        setFormData({ ...formData });
    }

    function CalCulateLineTotals(index) {
        const p = selectedProducts[index];
        if (!p) return;
        const vatPercent = formData.vat_percent || 0;
        p.purchase_unit_price_with_vat = parseFloat(trimTo2Decimals(p.purchase_unit_price * (1 + vatPercent / 100)));
        p.unit_discount_with_vat = parseFloat(trimTo2Decimals(p.unit_discount * (1 + vatPercent / 100)));
        p.unit_discount_percent = p.purchase_unit_price > 0 ? parseFloat(trimTo2Decimals((p.unit_discount / p.purchase_unit_price) * 100)) : 0;
        selectedProducts[index] = p;
        setSelectedProducts([...selectedProducts]);
        formData.products = selectedProducts;
        reCalculate();
    }

    function onDragEnd(result) {
        if (!result.destination) return;
        const items = Array.from(selectedProducts);
        const [reordered] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reordered);
        selectedProducts = items;
        setSelectedProducts([...selectedProducts]);
        formData.products = selectedProducts;
    }

    function openProductCreateForm() { ProductCreateFormRef.current.open(); }
    function openProductUpdateForm(id) { ProductCreateFormRef.current.open(id); }
    function openProductDetails(product) { ProductDetailsViewRef.current.open(product.product_id || product.id); }
    function openProductsModal() { ProductsRef.current.open(false, []); }

    async function handleCreate(e) {
        e.preventDefault();
        if (isProcessing) return;
        setProcessing(true);

        const method = formData.id ? "PUT" : "POST";
        const endpoint = formData.id ? `/v1/purchase-order/${formData.id}` : "/v1/purchase-order";

        const payload = {
            ...formData,
            products: selectedProducts,
            vendor_id: formData.vendor_id || (selectedVendors[0]?.id) || null,
            vendor_name: selectedVendors[0]?.name || formData.vendor_name || "",
            discount: parseFloat(discount) || 0,
            discount_with_vat: parseFloat(discountWithVAT) || 0,
            discount_percent: parseFloat(discountPercent) || 0,
            discount_percent_with_vat: parseFloat(discountPercentWithVAT) || 0,
            shipping_handling_fees: parseFloat(shipping) || 0,
            rounding_amount: parseFloat(roundingAmount) || 0,
            date_str: formData.date_str ? (typeof formData.date_str === 'string' ? formData.date_str : formData.date_str.toISOString()) : new Date().toISOString(),
            expected_date_str: formData.expected_date_str ? (typeof formData.expected_date_str === 'string' ? formData.expected_date_str : formData.expected_date_str.toISOString()) : "",
        };

        const requestOptions = {
            method,
            headers: {
                "Content-Type": "application/json",
                Authorization: localStorage.getItem("access_token"),
            },
            body: JSON.stringify(payload),
        };

        let queryParams = ObjectToSearchQueryParams({ store_id: localStorage.getItem("store_id") });

        fetch(endpoint + "?" + queryParams, requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();
                if (!response.ok) return Promise.reject(data.errors);
                setErrors({});
                setProcessing(false);
                const isNew = !formData.id;
                formData = { ...formData, id: data.result?.id, code: data.result?.code };
                setFormData({ ...formData });
                setShow(false);
                setShowOrderPreview(true);
                setTimeout(() => {
                    PreviewRef.current?.open(formData, undefined, "purchase_order");
                }, 150);
                if (isNew && props.onCreated) props.onCreated(data.result);
            })
            .catch(error => {
                setErrors({ ...(error || { general: "An error occurred" }) });
                setProcessing(false);
            });
    }

    async function handleConvertToPurchase() {
        if (!formData.id) return;
        if (!window.confirm(t("This will create a Purchase from this Purchase Order. Continue?"))) return;

        const requestOptions = {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: localStorage.getItem("access_token"),
            },
            body: JSON.stringify({ ...formData, status: "received", products: selectedProducts }),
        };
        let queryParams = ObjectToSearchQueryParams({ store_id: localStorage.getItem("store_id") });
        // Update status to received first
        fetch(`/v1/purchase-order/${formData.id}?` + queryParams, requestOptions)
            .then(async r => {
                const data = await r.json();
                if (!r.ok) return Promise.reject(data.errors);
                // Now navigate to create purchase with pre-filled data
                if (props.onConvertToPurchase) {
                    props.onConvertToPurchase(data.result);
                } else {
                    setSuccessMessage(t("Status updated to Received. Please create a Purchase manually."));
                    setShowSuccess(true);
                    formData.status = "received";
                    setFormData({ ...formData });
                }
            })
            .catch(error => setErrors({ ...(error || {}) }));
    }

    const statusOptions = [
        { value: "draft", label: t("Draft") },
        { value: "sent", label: t("Sent") },
        { value: "confirmed", label: t("Confirmed") },
        { value: "partially_received", label: t("Partially Received") },
        { value: "received", label: t("Received") },
        { value: "cancelled", label: t("Cancelled") },
    ];

    const statusColors = {
        draft: "#6b7280",
        sent: "#2563eb",
        confirmed: "#7c3aed",
        partially_received: "#d97706",
        received: "#16a34a",
        cancelled: "#dc2626",
    };


    // Build product table rows
    const productRows = selectedProducts.map((product, index) => {
        if (!inputRefs.current[index]) inputRefs.current[index] = {};
        return (
            <Draggable key={index} draggableId={"product-row-" + index} index={index}>
                {(provided) => (
                    <tr ref={provided.innerRef} {...provided.draggableProps} style={{ ...provided.draggableProps.style, verticalAlign: 'middle' }}>
                        <td style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center', cursor: 'grab' }} {...provided.dragHandleProps}>
                            <i className="bi bi-grip-vertical" />
                        </td>
                        <td style={{ textAlign: 'center', fontSize: '12px' }}>{index + 1}</td>
                        <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <button type="button" onClick={() => openProductDetails(product)}
                                    style={{ background: 'none', border: 'none', color: '#004ac6', cursor: 'pointer', padding: 0, fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px', textAlign: 'left' }}
                                    title={product.name || ""}>
                                    {product.part_number && <span style={{ color: '#6b7280', marginRight: '4px' }}>{product.part_number}</span>}
                                    {product.name}
                                    {product.name_in_arabic && <span style={{ direction: 'rtl', color: '#374151', marginLeft: '4px', fontSize: '11px' }}> — {product.name_in_arabic}</span>}
                                </button>
                                <i className="bi bi-pencil" style={{ color: '#004ac6', cursor: 'pointer', fontSize: '11px', flexShrink: 0 }}
                                    onClick={() => openProductUpdateForm(product.product_id)} />
                            </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    ref={el => { if (el) inputRefs.current[index][`purchase_order_product_quantity_${index}`] = el; }}
                                    value={activeInput.key === `qty_${index}` ? activeInput.value : String(product.quantity)}
                                    onFocus={e => { const v = String(product.quantity); setActiveInput({ key: `qty_${index}`, value: v }); setTimeout(() => e.target.select(), 0); }}
                                    onWheel={e => e.target.blur()}
                                    style={{ width: '60px', textAlign: 'right', padding: '2px 4px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '13px' }}
                                    onChange={e => {
                                        const raw = e.target.value;
                                        setActiveInput({ key: `qty_${index}`, value: raw });
                                        const num = parseFloat(raw);
                                        if (!isNaN(num)) {
                                            selectedProducts[index].quantity = num;
                                            setSelectedProducts([...selectedProducts]);
                                            formData.products = selectedProducts;
                                            if (timerRef.current) clearTimeout(timerRef.current);
                                            timerRef.current = setTimeout(() => reCalculate(), 200);
                                        }
                                    }}
                                    onBlur={() => {
                                        if (activeInput.key === `qty_${index}`) {
                                            selectedProducts[index].quantity = parseFloat(activeInput.value) || 0;
                                            setSelectedProducts([...selectedProducts]);
                                            formData.products = selectedProducts;
                                            setActiveInput({ key: null, value: '' });
                                            if (timerRef.current) clearTimeout(timerRef.current);
                                            timerRef.current = setTimeout(() => reCalculate(), 50);
                                        }
                                    }}
                                />
                                {product.unit && <span style={{ background: '#e8edf5', borderRadius: '4px', padding: '2px 5px', fontSize: '11px', fontWeight: 600, color: '#434655', whiteSpace: 'nowrap' }}>{product.unit}</span>}
                            </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                            <input
                                type="text"
                                inputMode="decimal"
                                value={activeInput.key === `price_${index}` ? activeInput.value : String(trimTo2Decimals(product.purchase_unit_price))}
                                onFocus={e => { const v = String(trimTo2Decimals(product.purchase_unit_price)); setActiveInput({ key: `price_${index}`, value: v }); setTimeout(() => e.target.select(), 0); }}
                                onWheel={e => e.target.blur()}
                                style={{ width: '110px', textAlign: 'right', padding: '2px 4px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '13px' }}
                                onChange={e => {
                                    const raw = e.target.value;
                                    setActiveInput({ key: `price_${index}`, value: raw });
                                    const num = parseFloat(raw);
                                    if (!isNaN(num)) {
                                        selectedProducts[index].purchase_unit_price = num;
                                        setSelectedProducts([...selectedProducts]);
                                        if (timerRef.current) clearTimeout(timerRef.current);
                                        timerRef.current = setTimeout(() => CalCulateLineTotals(index), 200);
                                    }
                                }}
                                onBlur={() => {
                                    if (activeInput.key === `price_${index}`) {
                                        selectedProducts[index].purchase_unit_price = parseFloat(activeInput.value) || 0;
                                        setSelectedProducts([...selectedProducts]);
                                        setActiveInput({ key: null, value: '' });
                                        if (timerRef.current) clearTimeout(timerRef.current);
                                        timerRef.current = setTimeout(() => CalCulateLineTotals(index), 50);
                                    }
                                }}
                            />
                        </td>
                        <td style={{ textAlign: 'right' }}>
                            <input
                                type="text"
                                inputMode="decimal"
                                value={activeInput.key === `price_vat_${index}` ? activeInput.value : String(trimTo2Decimals(product.purchase_unit_price_with_vat))}
                                onFocus={e => { const v = String(trimTo2Decimals(product.purchase_unit_price_with_vat)); setActiveInput({ key: `price_vat_${index}`, value: v }); setTimeout(() => e.target.select(), 0); }}
                                onWheel={e => e.target.blur()}
                                style={{ width: '110px', textAlign: 'right', padding: '2px 4px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '13px' }}
                                onChange={e => {
                                    const raw = e.target.value;
                                    setActiveInput({ key: `price_vat_${index}`, value: raw });
                                    const val = parseFloat(raw);
                                    if (!isNaN(val)) {
                                        const vatPercent = formData.vat_percent || 0;
                                        selectedProducts[index].purchase_unit_price_with_vat = val;
                                        selectedProducts[index].purchase_unit_price = parseFloat(trimTo2Decimals(val / (1 + vatPercent / 100)));
                                        setSelectedProducts([...selectedProducts]);
                                        if (timerRef.current) clearTimeout(timerRef.current);
                                        timerRef.current = setTimeout(() => reCalculate(), 200);
                                    }
                                }}
                                onBlur={() => {
                                    if (activeInput.key === `price_vat_${index}`) {
                                        const val = parseFloat(activeInput.value) || 0;
                                        const vatPercent = formData.vat_percent || 0;
                                        selectedProducts[index].purchase_unit_price_with_vat = val;
                                        selectedProducts[index].purchase_unit_price = parseFloat(trimTo2Decimals(val / (1 + vatPercent / 100)));
                                        setSelectedProducts([...selectedProducts]);
                                        setActiveInput({ key: null, value: '' });
                                        if (timerRef.current) clearTimeout(timerRef.current);
                                        timerRef.current = setTimeout(() => reCalculate(), 50);
                                    }
                                }}
                            />
                        </td>
                        <td style={{ textAlign: 'right' }}>
                            <input
                                type="text"
                                inputMode="decimal"
                                value={activeInput.key === `disc_${index}` ? activeInput.value : String(trimTo2Decimals(product.unit_discount || 0))}
                                onFocus={e => { const v = String(trimTo2Decimals(product.unit_discount || 0)); setActiveInput({ key: `disc_${index}`, value: v }); setTimeout(() => e.target.select(), 0); }}
                                onWheel={e => e.target.blur()}
                                style={{ width: '90px', textAlign: 'right', padding: '2px 4px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '13px' }}
                                onChange={e => {
                                    const raw = e.target.value;
                                    setActiveInput({ key: `disc_${index}`, value: raw });
                                    const num = parseFloat(raw);
                                    if (!isNaN(num)) {
                                        selectedProducts[index].unit_discount = num;
                                        setSelectedProducts([...selectedProducts]);
                                        if (timerRef.current) clearTimeout(timerRef.current);
                                        timerRef.current = setTimeout(() => CalCulateLineTotals(index), 200);
                                    }
                                }}
                                onBlur={() => {
                                    if (activeInput.key === `disc_${index}`) {
                                        selectedProducts[index].unit_discount = parseFloat(activeInput.value) || 0;
                                        setSelectedProducts([...selectedProducts]);
                                        setActiveInput({ key: null, value: '' });
                                        if (timerRef.current) clearTimeout(timerRef.current);
                                        timerRef.current = setTimeout(() => CalCulateLineTotals(index), 50);
                                    }
                                }}
                            />
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap', fontSize: '13px' }}>
                            <NumberFormat
                                value={trimTo2Decimals(product.quantity * (product.purchase_unit_price - (product.unit_discount || 0)))}
                                displayType="text"
                                thousandSeparator={true}
                                renderText={v => v}
                            />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                            <button type="button" onClick={() => removeProduct(index)}
                                style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '2px 6px', fontSize: '16px' }}>
                                <i className="bi bi-x-lg" />
                            </button>
                        </td>
                    </tr>
                )}
            </Draggable>
        );
    });

    return (
        <>
            <SuccessModal show={showSuccess} message={successMessage} onClose={() => setShowSuccess(false)} />
            <Products ref={ProductsRef} onSelectProducts={handleSelectedProducts} showToastMessage={props.showToastMessage} />
            <ProductView ref={ProductDetailsViewRef} openUpdateForm={openProductUpdateForm} openCreateForm={openProductCreateForm} />
            <ProductCreate ref={ProductCreateFormRef} showToastMessage={props.showToastMessage} />
            {showVendorPending && <VendorPending ref={VendorPendingRef} />}
            <Vendors ref={VendorsRef} onSelectVendor={handleSelectedVendor} showToastMessage={props.showToastMessage} />
            <VendorCreate ref={VendorCreateFormRef} onUpdated={handleVendorUpdated} />
            {showOrderPreview && <Preview ref={PreviewRef} showToastMessage={props.showToastMessage} />}
            <SourceDocumentPicker ref={SourceDocumentPickerRef} />
            <TableSettingsModal
                show={showProductSearchSettings}
                onHide={() => setShowProductSearchSettings(false)}
                title={t('Product Search Settings')}
                columns={searchProductsColumns}
                onToggleColumn={handleTogglePsColumn}
                onDragEnd={handlePsColumnDragEnd}
                onRestoreDefaults={restorePsDefaults}
            />
            <TableSettingsModal
                show={showVendorSearchSettings}
                onHide={() => setShowVendorSearchSettings(false)}
                title={t('Vendor Search Settings')}
                columns={vendorSearchColumns}
                onToggleColumn={handleToggleVendorCol}
                onDragEnd={handleVendorColDragEnd}
                onRestoreDefaults={restoreVendorColDefaults}
            />

            <Modal show={show} size="xl" fullscreen onHide={handleClose} animation={false} backdrop="static" scrollable={true}>
                {/* Compact Type2 Header */}
                <Modal.Header style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #c3c6d7', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <div className="sc-header-title">
                        <h1 style={{ margin: 0, fontSize: '20px', lineHeight: '28px', fontWeight: 700, letterSpacing: '-0.01em', fontFamily: "'Hanken Grotesk', sans-serif", color: '#191c1e', whiteSpace: 'nowrap' }}>
                            {formData.id ? t('Update Purchase Order') + " #" + formData.code : t('Create Purchase Order')}
                        </h1>
                        {formData.id && (
                            <span style={{
                                background: formData.status ? `${statusColors[formData.status]}18` : '#f3f4f6',
                                color: statusColors[formData.status] || '#6b7280',
                                borderRadius: '12px',
                                padding: '2px 10px',
                                fontSize: '12px',
                                fontWeight: 600,
                                border: `1px solid ${statusColors[formData.status] || '#d1d5db'}40`,
                            }}>
                                {statusOptions.find(s => s.value === formData.status)?.label || formData.status}
                            </span>
                        )}
                    </div>
                    <div className="sc-header-actions">
                        <button type="button" disabled={disablePreviousButton} onClick={e => { e.preventDefault(); if (formData.id) getPreviousPurchaseOrder(formData.id); else getLastPurchaseOrder(); }}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #c3c6d7', backgroundColor: '#f7f9fb', color: '#434655', padding: '6px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', opacity: disablePreviousButton ? 0.5 : 1 }}>
                            <i className="bi-chevron-double-left" style={{ fontSize: '13px' }} /> {t('Previous')}
                        </button>
                        <button type="button" disabled={!formData.id} onClick={e => { e.preventDefault(); if (formData.id) getNextPurchaseOrder(formData.id); }}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #c3c6d7', backgroundColor: '#f7f9fb', color: '#434655', padding: '6px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', opacity: !formData.id ? 0.5 : 1 }}>
                            {t('Next')} <i className="bi-chevron-double-right" style={{ fontSize: '13px' }} />
                        </button>
                        {formData.id && (formData.status === 'confirmed' || formData.status === 'partially_received') && (
                            <button type="button" onClick={handleConvertToPurchase}
                                style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#16a34a', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                                <i className="bi bi-box-arrow-in-down" style={{ fontSize: '14px' }}></i> {t('Convert to Purchase')}
                            </button>
                        )}
                        {formData.id && <>
                            <button type="button" title={t('Print / Preview')} onClick={openPreview}
                                style={{ background: '#fff', border: '1px solid #c3c6d7', borderRadius: '4px', padding: '7px 10px', fontSize: '13px', cursor: 'pointer', color: '#434655', display: 'flex', alignItems: 'center', gap: '4px' }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor='#004ac6'; e.currentTarget.style.color='#004ac6'; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor='#c3c6d7'; e.currentTarget.style.color='#434655'; }}>
                                <i className="bi bi-printer" />
                            </button>
                            <button type="button" title={t('Share via WhatsApp')} onClick={sendWhatsAppMessage}
                                style={{ background: '#25d366', border: 'none', borderRadius: '4px', padding: '7px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="white" viewBox="0 0 16 16"><path d="M13.601 2.326A7.875 7.875 0 0 0 8.036 0C3.596 0 0 3.597 0 8.036c0 1.417.37 2.805 1.07 4.03L0 16l3.993-1.05a7.968 7.968 0 0 0 4.043 1.085h.003c4.44 0 8.036-3.596 8.036-8.036 0-2.147-.836-4.166-2.37-5.673ZM8.036 14.6a6.584 6.584 0 0 1-3.35-.92l-.24-.142-2.37.622.63-2.31-.155-.238a6.587 6.587 0 0 1-1.018-3.513c0-3.637 2.96-6.6 6.6-6.6 1.764 0 3.42.69 4.67 1.94a6.56 6.56 0 0 1 1.93 4.668c0 3.637-2.96 6.6-6.6 6.6Zm3.61-4.885c-.198-.1-1.17-.578-1.352-.644-.18-.066-.312-.1-.444.1-.13.197-.51.644-.626.775-.115.13-.23.15-.428.05-.198-.1-.837-.308-1.594-.983-.59-.525-.99-1.174-1.11-1.372-.116-.198-.012-.305.088-.403.09-.09.198-.23.298-.345.1-.115.132-.197.2-.33.065-.13.032-.247-.017-.345-.05-.1-.444-1.07-.61-1.46-.16-.384-.323-.332-.444-.338l-.378-.007c-.13 0-.344.048-.525.23s-.688.672-.688 1.64c0 .967.704 1.9.802 2.03.1.13 1.386 2.116 3.365 2.963.47.203.837.324 1.122.414.472.15.902.13 1.24.08.378-.057 1.17-.48 1.336-.942.165-.462.165-.858.116-.943-.048-.084-.18-.132-.378-.23Z"/></svg>
                            </button>
                        </>}
                        <button type="button" onClick={handleCreate}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#004ac6', color: '#ffffff', border: 'none', padding: '6px 16px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', minWidth: '70px', justifyContent: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                            {isProcessing ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden={true} /> : <><i className="bi bi-check2" style={{ fontSize: '14px' }}></i> {formData.id ? t('Update') : t('Create')}</>}
                        </button>
                        <button type="button" className="btn-close" onClick={handleClose} aria-label="Close" style={{ marginLeft: '4px' }}></button>
                    </div>
                </Modal.Header>

                <Modal.Body>
                    {/* Error banner */}
                    {errors && Object.keys(errors).some(k => { const m = Array.isArray(errors[k]) ? errors[k][0] : errors[k]; return !!m; }) && (
                        <div style={{ maxHeight: '120px', overflowY: 'auto', padding: '8px 12px', backgroundColor: '#fff0f0', borderLeft: '1px solid #f5c6cb', borderBottom: '1px solid #f5c6cb', boxShadow: '-2px 2px 8px rgba(186,26,26,0.12)', position: 'fixed', top: '56px', right: 0, width: '380px', zIndex: 9999 }}>
                            <ul style={{ marginBottom: 0, paddingLeft: 16 }}>
                                {Object.keys(errors).map((key, index) => {
                                    const message = Array.isArray(errors[key]) ? errors[key][0] : errors[key];
                                    return message ? <li key={index} style={{ color: '#dc2626', fontSize: '12px' }}>{t(message)}</li> : null;
                                })}
                            </ul>
                        </div>
                    )}

                    <form className="row g-3 needs-validation" onSubmit={handleCreate}>

                        {/* ── Vendor + Selected Vendor cards ── */}
                        <div className="col-12">
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'stretch', paddingTop: '8px', marginBottom: '8px' }}>

                                {/* Vendor search card */}
                                <div style={{ flex: 3, minWidth: 0, background: '#fff', border: '1px solid #c3c6d7', borderRadius: '8px', padding: '10px 14px', position: 'relative' }}>
                                    <span style={{ position: 'absolute', top: '-8px', left: '14px', fontSize: '10px', fontWeight: 600, color: '#6b7280', background: '#fff', padding: '0 4px', lineHeight: 1, zIndex: 1, pointerEvents: 'none' }}>{t('Vendor')}</span>
                                    <div>
                                        {/* Vendor Typeahead */}
                                        <div style={{ flex: '0 0 100%', display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '12px' }}>
                                            <div style={{ flex: '0 0 320px', maxWidth: '320px' }}>
                                                <Typeahead
                                                    id="vendor_search_po"
                                                    positionFixed={true}
                                                    filterBy={() => true}
                                                    labelKey="search_label"
                                                    size="lg"
                                                    open={openVendorSearchResult}
                                                    isLoading={false}
                                                    onChange={(selectedItems) => {
                                                        delete errors.vendor_id;
                                                        setErrors(errors);
                                                        if (selectedItems.length === 0) {
                                                            formData.vendor_id = "";
                                                            setFormData({ ...formData });
                                                            setSelectedVendors([]);
                                                            return;
                                                        }
                                                        formData.vendor_id = selectedItems[0].id;
                                                        if (selectedItems[0].phone && !formData.phone) formData.phone = selectedItems[0].phone;
                                                        if (selectedItems[0].vat_no && !formData.vat_no) formData.vat_no = selectedItems[0].vat_no;
                                                        if (selectedItems[0].address && !formData.address) formData.address = selectedItems[0].address;
                                                        setOpenVendorSearchResult(false);
                                                        setFormData({ ...formData });
                                                        setSelectedVendors(selectedItems);
                                                    }}
                                                    options={vendorOptions}
                                                    placeholder={t('Vendor Name / Mob / VAT # / ID')}
                                                    selected={selectedVendors}
                                                    highlightOnlyResult={true}
                                                    ref={vendorSearchRef}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Escape") {
                                                            setOpenVendorSearchResult(false);
                                                            formData.vendor_id = "";
                                                            formData.vendor_name = "";
                                                            setFormData({ ...formData });
                                                            setSelectedVendors([]);
                                                            setVendorOptions([]);
                                                            vendorSearchRef.current?.clear();
                                                        }
                                                    }}
                                                    onInputChange={(searchTerm) => {
                                                        if (searchTerm) formData.vendor_name = searchTerm;
                                                        setFormData({ ...formData });
                                                        if (timerRef.current) clearTimeout(timerRef.current);
                                                        timerRef.current = setTimeout(() => suggestVendors(searchTerm), 350);
                                                    }}
                                                    renderMenu={(results, menuProps, state) => {
                                                        const searchWords = state.text.toLowerCase().split(' ').filter(Boolean);
                                                        const visCols = vendorSearchColumns.filter(c => c.visible);
                                                        const totW = visCols.reduce((s, c) => s + c.width, 0);
                                                        const cw = (col) => `${(col.width / totW) * 100}%`;
                                                        const resizeHandle = (colKey) => (
                                                            <div onMouseDown={e => startVendorColResize(e, colKey)}
                                                                style={{ position: 'absolute', right: 0, top: '10%', bottom: '10%', width: '5px', cursor: 'col-resize', zIndex: 2 }} />
                                                        );
                                                        return (
                                                            <Menu {...menuProps} style={{ ...(menuProps.style || {}), width: '95vw', maxWidth: '95vw', minWidth: '400px', zIndex: 9999 }}>
                                                                <MenuItem disabled style={{ position: 'sticky', top: 0, padding: 0, margin: 0 }}>
                                                                    <div style={{ display: 'flex', fontWeight: 700, color: '#374151', padding: '4px 8px', background: '#f8f9fa', borderBottom: '1px solid #e2e8f0', pointerEvents: 'auto', fontSize: '12px', position: 'relative' }}>
                                                                        {visCols.map(col => (
                                                                            <div key={col.key} style={{ width: cw(col), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', position: 'relative' }}>
                                                                                {col.key === 'code' && t('Code')}
                                                                                {col.key === 'name' && t('Name')}
                                                                                {col.key === 'phone' && t('Phone')}
                                                                                {col.key === 'phone2' && t('Phone 2')}
                                                                                {col.key === 'vat_no' && t('VAT No.')}
                                                                                {col.key === 'credit_balance' && t('Credit Balance')}
                                                                                {resizeHandle(col.key)}
                                                                            </div>
                                                                        ))}
                                                                        <div style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer' }}
                                                                            onClick={e => { e.stopPropagation(); setShowVendorSearchSettings(true); }}>
                                                                            <i className="bi bi-gear-fill" style={{ fontSize: '13px', color: '#6b7280' }} />
                                                                        </div>
                                                                    </div>
                                                                </MenuItem>
                                                                {results.map((option, idx) => {
                                                                    const isActive = state.activeIndex === idx || results.length === 1;
                                                                    const rowBg = isActive ? '#e8f0fe' : 'transparent';
                                                                    return (
                                                                        <MenuItem option={option} position={idx} key={idx} style={{ padding: 0 }}>
                                                                            <div style={{ display: 'flex', padding: '5px 8px', alignItems: 'center', background: rowBg, fontSize: '13px' }}>
                                                                                {visCols.map(col => (
                                                                                    <div key={col.key} style={{ width: cw(col), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                                        {col.key === 'code' && <span style={{ fontFamily: 'monospace', color: isActive ? '#004ac6' : '#374151', fontWeight: isActive ? 600 : 400 }}>{highlightWords(option.code, searchWords, isActive)}</span>}
                                                                                        {col.key === 'name' && <span style={{ color: isActive ? '#191c1e' : '#374151', fontWeight: isActive ? 600 : 400 }}>{highlightWords(option.name + (option.name_in_arabic ? ' - ' + option.name_in_arabic : ''), searchWords, isActive)}</span>}
                                                                                        {col.key === 'phone' && <span style={{ color: '#6b7280' }}>{highlightWords(option.phone || '–', searchWords, isActive)}</span>}
                                                                                        {col.key === 'phone2' && <span style={{ color: '#6b7280' }}>{highlightWords(option.phone2 || '–', searchWords, isActive)}</span>}
                                                                                        {col.key === 'vat_no' && <span style={{ color: '#6b7280' }}>{highlightWords(option.vat_no || '–', searchWords, isActive)}</span>}
                                                                                        {col.key === 'credit_balance' && <span style={{ color: option.credit_balance != null && option.credit_balance > 0 ? '#dc2626' : option.credit_balance != null && option.credit_balance < 0 ? '#2563eb' : '#6b7280', fontWeight: 600 }}>{option.credit_balance != null ? option.credit_balance : '–'}</span>}
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </MenuItem>
                                                                    );
                                                                })}
                                                            </Menu>
                                                        );
                                                    }}
                                                />
                                            </div>
                                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                <button type="button" title={t('New Vendor')} onClick={openVendorCreateForm}
                                                    style={{ background: '#fff', border: '1px solid #c3c6d7', borderRadius: '4px', padding: '7px 12px', fontSize: '13px', cursor: 'pointer', color: '#434655', flexShrink: 0 }}>
                                                    <i className="bi bi-plus-lg" />
                                                </button>
                                                {formData.vendor_id && (
                                                    <button type="button" title={t('Edit Vendor')} onClick={() => openVendorUpdateForm(formData.vendor_id)}
                                                        style={{ background: '#fff', border: '1px solid #c3c6d7', borderRadius: '4px', padding: '7px 12px', fontSize: '13px', cursor: 'pointer', color: '#434655', flexShrink: 0 }}>
                                                        <i className="bi bi-pencil" />
                                                    </button>
                                                )}
                                                <button type="button" title={t('Vendor List')} onClick={openVendors}
                                                    style={{ background: '#004ac6', color: '#fff', border: '1px solid transparent', borderRadius: '4px', padding: '7px 12px', fontSize: '13px', cursor: 'pointer', flexShrink: 0 }}>
                                                    <i className="bi bi-list" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Fields grid */}
                                        <div style={{ display: 'flex', columnGap: '16px', rowGap: '14px', alignItems: 'flex-start', flexWrap: 'wrap' }}>

                                            {/* Date */}
                                            <div style={{ flex: '0 0 185px', position: 'relative' }}>
                                                <span style={{ position: 'absolute', top: '-8px', left: '8px', fontSize: '10px', fontWeight: 600, color: '#6b7280', background: '#fff', padding: '0 4px', lineHeight: 1, zIndex: 1, pointerEvents: 'none' }}>{t('Date')} *</span>
                                                <DatePicker
                                                    id="po_date_str"
                                                    selected={formData.date_str ? new Date(formData.date_str) : null}
                                                    value={formData.date_str ? format(new Date(formData.date_str), "MMMM d, yyyy h:mm aa", { locale: dateLocale }) : null}
                                                    className="form-control"
                                                    dateFormat="MMMM d, yyyy h:mm aa"
                                                    locale={dateLocale}
                                                    showTimeSelect
                                                    timeIntervals="1"
                                                    popperProps={{ strategy: 'fixed' }}
                                                    onChange={(value) => { formData.date_str = value; setFormData({ ...formData }); }}
                                                />
                                                {errors.date_str && <div style={{ color: '#dc2626', fontSize: '11px' }}>{errors.date_str}</div>}
                                            </div>

                                            {/* Expected Date */}
                                            <div style={{ flex: '0 0 185px', position: 'relative' }}>
                                                <span style={{ position: 'absolute', top: '-8px', left: '8px', fontSize: '10px', fontWeight: 600, color: '#6b7280', background: '#fff', padding: '0 4px', lineHeight: 1, zIndex: 1, pointerEvents: 'none' }}>{t('Expected Date')}</span>
                                                <DatePicker
                                                    id="po_expected_date_str"
                                                    selected={formData.expected_date_str ? new Date(formData.expected_date_str) : null}
                                                    value={formData.expected_date_str ? format(new Date(formData.expected_date_str), "MMMM d, yyyy", { locale: dateLocale }) : null}
                                                    className="form-control"
                                                    dateFormat="MMMM d, yyyy"
                                                    locale={dateLocale}
                                                    isClearable
                                                    popperProps={{ strategy: 'fixed' }}
                                                    onChange={(value) => { formData.expected_date_str = value || null; setFormData({ ...formData }); }}
                                                />
                                            </div>

                                            {/* Status */}
                                            <div style={{ flex: '0 0 160px', position: 'relative' }}>
                                                <span style={{ position: 'absolute', top: '-8px', left: '8px', fontSize: '10px', fontWeight: 600, color: '#6b7280', background: '#fff', padding: '0 4px', lineHeight: 1, zIndex: 1, pointerEvents: 'none' }}>{t('Status')}</span>
                                                <select
                                                    value={formData.status || "draft"}
                                                    onChange={e => { formData.status = e.target.value; setFormData({ ...formData }); }}
                                                    className="form-control"
                                                    style={{ color: statusColors[formData.status] || '#191c1e', fontWeight: 600, fontSize: '13px' }}>
                                                    {statusOptions.map(opt => (
                                                        <option key={opt.value} value={opt.value} style={{ color: statusColors[opt.value] }}>{opt.label}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Vendor Invoice No */}
                                            <div style={{ flex: '0 0 185px', position: 'relative' }}>
                                                <span style={{ position: 'absolute', top: '-8px', left: '8px', fontSize: '10px', fontWeight: 600, color: '#6b7280', background: '#fff', padding: '0 4px', lineHeight: 1, zIndex: 1, pointerEvents: 'none' }}>{t('Vendor Invoice No.')}</span>
                                                <input
                                                    value={formData.vendor_invoice_no || ''}
                                                    type="text"
                                                    onChange={e => { formData.vendor_invoice_no = e.target.value; setFormData({ ...formData }); }}
                                                    className="form-control"
                                                    placeholder={t('Optional')}
                                                />
                                            </div>

                                            {/* Phone */}
                                            <div style={{ flex: '0 0 195px', position: 'relative' }}>
                                                <span style={{ position: 'absolute', top: '-8px', left: '8px', fontSize: '10px', fontWeight: 600, color: '#6b7280', background: '#fff', padding: '0 4px', lineHeight: 1, zIndex: 1, pointerEvents: 'none' }}>{t('Phone')}</span>
                                                <input
                                                    value={formData.phone || ''}
                                                    type="text"
                                                    onChange={e => { formData.phone = e.target.value; setFormData({ ...formData }); }}
                                                    className="form-control"
                                                    placeholder={t('Phone')}
                                                />
                                            </div>

                                            {/* VAT No */}
                                            <div style={{ flex: '0 0 187px', position: 'relative' }}>
                                                <span style={{ position: 'absolute', top: '-8px', left: '8px', fontSize: '10px', fontWeight: 600, color: '#6b7280', background: '#fff', padding: '0 4px', lineHeight: 1, zIndex: 1, pointerEvents: 'none' }}>{t('VAT NO.')}</span>
                                                <input
                                                    value={formData.vat_no || ''}
                                                    type="text"
                                                    onChange={e => { formData.vat_no = e.target.value; setFormData({ ...formData }); }}
                                                    className="form-control"
                                                    placeholder={t('VAT NO.')}
                                                />
                                            </div>

                                            {/* Address + Remarks */}
                                            <div style={{ flex: '0 0 100%', display: 'flex', gap: '16px' }}>
                                                <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
                                                    <span style={{ position: 'absolute', top: '-8px', left: '8px', fontSize: '10px', fontWeight: 600, color: '#6b7280', background: '#fff', padding: '0 4px', lineHeight: 1, zIndex: 1, pointerEvents: 'none' }}>{t('Address')}</span>
                                                    <textarea value={formData.address || ''} onChange={e => { formData.address = e.target.value; setFormData({ ...formData }); }} onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); } }} className="form-control" placeholder={t('Address')} rows={2} style={{ resize: 'none', fontSize: '13px', width: '100%' }} />
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
                                                    <span style={{ position: 'absolute', top: '-8px', left: '8px', fontSize: '10px', fontWeight: 600, color: '#6b7280', background: '#fff', padding: '0 4px', lineHeight: 1, zIndex: 1, pointerEvents: 'none' }}>{t('Remarks')}</span>
                                                    <textarea value={formData.remarks || ''} onChange={e => { formData.remarks = e.target.value; setFormData({ ...formData }); }} onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); } }} className="form-control" placeholder={t('Remarks')} rows={2} style={{ resize: 'none', fontSize: '13px', width: '100%' }} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Selected Vendor card */}
                                <div style={{ flex: 2, minWidth: 0 }}>
                                {formData.vendor_id && selectedVendors.slice(0, 1).map(v => {
                                    const phone = v.phone || formData.phone;
                                    const phone2 = v.phone2;
                                    const vatNo = v.vat_no || formData.vat_no;
                                    const creditBalance = v.credit_balance;
                                    return (
                                        <div key={v.id || 'sel-vendor'} style={{ position: 'relative' }}>
                                            <span style={{ position: 'absolute', top: '-8px', left: '14px', fontSize: '10px', fontWeight: 600, color: '#6b7280', background: '#fff', padding: '0 4px', lineHeight: 1, zIndex: 1, pointerEvents: 'none' }}>{t('Selected Vendor')}</span>
                                            <button type="button" onClick={() => setShowSelVendorSettings(s => !s)} title={t('Customize Selected Vendor Fields')}
                                                style={{ position: 'absolute', top: '-9px', right: '14px', background: '#fff', border: '1px solid #c3c6d7', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2, padding: 0 }}>
                                                <i className="bi bi-gear-fill" style={{ fontSize: '10px', color: '#6b7280' }} />
                                            </button>
                                            {showSelVendorSettings && (
                                                <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1060, background: '#fff', border: '1px solid #c3c6d7', borderRadius: '10px', boxShadow: '0 8px 32px rgba(0,0,0,0.18)', width: '360px', padding: '20px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                                                        <span style={{ fontWeight: 700, fontSize: '14px', color: '#191c1e' }}>{t('Selected Vendor Fields')}</span>
                                                        <button type="button" onClick={() => setShowSelVendorSettings(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#6b7280', lineHeight: 1, padding: 0 }}>×</button>
                                                    </div>
                                                    <div style={{ fontSize: '10px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{t('Fixed Position')}</div>
                                                    {['name', 'code', 'name_arabic'].map(key => (
                                                        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '6px', marginBottom: '4px', background: '#f9fafb', border: '1px solid #e5e7eb', userSelect: 'none' }}>
                                                            <i className="bi bi-grip-vertical" style={{ color: '#d1d5db', fontSize: '18px', flexShrink: 0 }} />
                                                            <input type="checkbox" checked={!!selVendorFieldsVisible[key]} onChange={e => updateSelVendorFieldVisible(key, e.target.checked)} style={{ cursor: 'pointer', width: '16px', height: '16px', flexShrink: 0 }} />
                                                            <span style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: '#374151' }}>{t(_selVendorFieldLabels[key])}</span>
                                                        </div>
                                                    ))}
                                                    <div style={{ height: '1px', background: '#e5e7eb', margin: '6px 0' }} />
                                                    <div style={{ fontSize: '10px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{t('Orderable')}</div>
                                                    {(() => {
                                                        const fixedKeys = ['name', 'code', 'name_arabic'];
                                                        const orderable = selVendorFieldsOrder.filter(k => !fixedKeys.includes(k));
                                                        return orderable.map((key, localIdx) => (
                                                            <div key={key} draggable
                                                                onDragStart={() => { selVendorFieldsDragRef.current = localIdx; }}
                                                                onDragOver={e => e.preventDefault()}
                                                                onDrop={() => {
                                                                    const from = selVendorFieldsDragRef.current;
                                                                    const to = localIdx;
                                                                    selVendorFieldsDragRef.current = null;
                                                                    if (from === to) return;
                                                                    const fixed = selVendorFieldsOrder.filter(k => fixedKeys.includes(k));
                                                                    const ord = selVendorFieldsOrder.filter(k => !fixedKeys.includes(k));
                                                                    const [item] = ord.splice(from, 1);
                                                                    ord.splice(to, 0, item);
                                                                    const newOrder = [...fixed, ...ord];
                                                                    setSelVendorFieldsOrder(newOrder);
                                                                    localStorage.setItem('po_sel_vendor_fields_order', JSON.stringify(newOrder));
                                                                }}
                                                                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '6px', marginBottom: '4px', background: '#f3f4f6', cursor: 'grab', border: '1px solid #e5e7eb', userSelect: 'none' }}>
                                                                <i className="bi bi-grip-vertical" style={{ color: '#9ca3af', fontSize: '18px', flexShrink: 0 }} />
                                                                <input type="checkbox" checked={!!selVendorFieldsVisible[key]} onChange={e => updateSelVendorFieldVisible(key, e.target.checked)} style={{ cursor: 'pointer', width: '16px', height: '16px', flexShrink: 0 }} />
                                                                <span style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: '#374151' }}>{t(_selVendorFieldLabels[key])}</span>
                                                            </div>
                                                        ));
                                                    })()}
                                                    <button type="button" onClick={() => {
                                                        setSelVendorFieldsOrder([..._defaultSelVendorFieldsOrder]);
                                                        setSelVendorFieldsVisible(Object.fromEntries(_defaultSelVendorFieldsOrder.map(k => [k, true])));
                                                        localStorage.removeItem('po_sel_vendor_fields_visible');
                                                        localStorage.removeItem('po_sel_vendor_fields_order');
                                                    }} style={{ marginTop: '14px', width: '100%', background: '#f9fafb', border: '1px solid #d1d5db', borderRadius: '6px', padding: '7px 0', fontSize: '13px', cursor: 'pointer', color: '#6b7280', fontWeight: 500 }}>
                                                        {t('Reset to Default')}
                                                    </button>
                                                </div>
                                            )}
                                            <div style={{ background: 'rgba(0,74,198,0.05)', border: '1px solid rgba(0,74,198,0.2)', borderRadius: '8px', padding: '12px', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        {selVendorFieldsVisible['name'] && <div style={{ fontSize: '14px', fontWeight: 700, color: '#191c1e', lineHeight: 1.3, wordBreak: 'break-word' }}>{v.name}</div>}
                                                        {selVendorFieldsVisible['name_arabic'] && v.name_in_arabic && <div style={{ fontSize: '14px', fontWeight: 700, color: '#191c1e', direction: 'rtl', lineHeight: 1.3, wordBreak: 'break-word', WebkitTextStroke: '0.4px #191c1e' }}>{v.name_in_arabic}</div>}
                                                    </div>
                                                    {selVendorFieldsVisible['code'] && v.code && <span style={{ flexShrink: 0, background: 'rgba(0,74,198,0.1)', color: '#004ac6', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, fontFamily: 'monospace' }}>{v.code}</span>}
                                                </div>
                                                {selVendorFieldsOrder.some(k => !['name', 'name_arabic', 'code'].includes(k) && selVendorFieldsVisible[k]) && (
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', paddingTop: '8px', borderTop: '1px solid rgba(0,74,198,0.15)', marginTop: '2px' }}>
                                                        {selVendorFieldsOrder.filter(k => !['name', 'name_arabic', 'code'].includes(k) && selVendorFieldsVisible[k]).map(key => {
                                                            if (key === 'credit_balance' && creditBalance != null) return (
                                                                <div key="credit_balance" onClick={() => openVendorPending(selectedVendors[0])} style={{ cursor: 'pointer' }}>
                                                                    <span style={{ display: 'block', fontSize: '9px', fontWeight: 600, color: '#8b8fa8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>{t('Credit Balance')}</span>
                                                                    <span style={{ fontSize: '15px', fontWeight: 700, color: creditBalance > 0 ? '#dc2626' : creditBalance < 0 ? '#2563eb' : '#16a34a', letterSpacing: '-0.01em' }}>
                                                                        <NumberFormat value={trimTo2Decimals(creditBalance)} displayType="text" thousandSeparator={true} renderText={val => val} />
                                                                    </span>
                                                                </div>
                                                            );
                                                            if (key === 'credit_limit' && v.credit_limit != null) return (
                                                                <div key="credit_limit">
                                                                    <span style={{ display: 'block', fontSize: '9px', fontWeight: 600, color: '#8b8fa8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>{t('Credit Limit')}</span>
                                                                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#191c1e', fontFamily: 'monospace' }}><Amount amount={trimTo2Decimals(v.credit_limit)} /></span>
                                                                </div>
                                                            );
                                                            if (key === 'vat_no' && vatNo) return (
                                                                <div key="vat_no">
                                                                    <span style={{ display: 'block', fontSize: '9px', fontWeight: 600, color: '#8b8fa8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>{t('VAT NO.')}</span>
                                                                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#191c1e', fontFamily: 'monospace' }}>{vatNo}</span>
                                                                </div>
                                                            );
                                                            if (key === 'phone1' && phone) return (
                                                                <div key="phone1">
                                                                    <span style={{ display: 'block', fontSize: '9px', fontWeight: 600, color: '#8b8fa8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>{t('Phone 1')}</span>
                                                                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#191c1e', fontFamily: 'monospace' }}>{phone}</span>
                                                                </div>
                                                            );
                                                            if (key === 'phone2' && phone2) return (
                                                                <div key="phone2">
                                                                    <span style={{ display: 'block', fontSize: '9px', fontWeight: 600, color: '#8b8fa8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>{t('Phone 2')}</span>
                                                                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#191c1e', fontFamily: 'monospace' }}>{phone2}</span>
                                                                </div>
                                                            );
                                                            return null;
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                                </div>
                            </div>
                        </div>

                        {/* ── Product Search ── */}
                        <div className="col-12">
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', top: '-8px', left: '8px', fontSize: '10px', fontWeight: 600, color: '#6b7280', background: '#fff', padding: '0 4px', lineHeight: 1, zIndex: 1, pointerEvents: 'none' }}>{t('Add Product')}</span>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                    <div style={{ flex: '0 0 320px', maxWidth: '320px' }}>
                                        <Typeahead
                                            id="po_product_id"
                                            filterBy={() => true}
                                            size="lg"
                                            ref={productSearchRef}
                                            labelKey="search_label"
                                            emptyLabel=""
                                            clearButton={false}
                                            open={openProductSearchResult}
                                            isLoading={false}
                                            onChange={(selectedItems) => {
                                                if (onChangeTriggeredRef.current) return;
                                                onChangeTriggeredRef.current = true;
                                                setTimeout(() => { onChangeTriggeredRef.current = false; }, 300);
                                                if (selectedItems.length === 0) return;
                                                addProduct(selectedItems[0]);
                                            }}
                                            options={productOptions}
                                            selected={selectedProduct}
                                            onKeyDown={(e) => {
                                                if (e.key === "Escape") {
                                                    setProductOptions([]);
                                                    setOpenProductSearchResult(false);
                                                    productSearchRef.current?.clear();
                                                }
                                            }}
                                            placeholder={t('Part No. | Name | Name in Arabic | Brand | Country')}
                                            highlightOnlyResult={true}
                                            onInputChange={(searchTerm) => {
                                                const requestId = Date.now();
                                                latestRequestRef.current = requestId;
                                                if (timerRef.current) clearTimeout(timerRef.current);
                                                timerRef.current = setTimeout(() => {
                                                    if (latestRequestRef.current !== requestId) return;
                                                    suggestProducts(searchTerm);
                                                }, 350);
                                            }}
                                            renderMenu={(results, menuProps, state) => {
                                                const searchWords = state.text.toLowerCase().split(" ").filter(Boolean);
                                                const storeId = localStorage.getItem("store_id");
                                                const visCols = searchProductsColumns.filter(c => c.visible);
                                                const totW = visCols.reduce((s, c) => s + c.width, 0);
                                                const cw = (col) => `${(col.width / totW) * 100}%`;
                                                const resizeHandle = (colKey) => (
                                                    <div
                                                        onMouseDown={e => startPsColResize(e, colKey)}
                                                        style={{ position: 'absolute', right: 0, top: '10%', bottom: '10%', width: '5px', cursor: 'col-resize', zIndex: 2 }}
                                                    />
                                                );
                                                return (
                                                    <Menu {...menuProps} style={{ ...(menuProps.style || {}), width: '90vw', maxWidth: '90vw', minWidth: '300px', zIndex: 9999 }}>
                                                        <MenuItem disabled style={{ position: 'sticky', top: 0, padding: 0, margin: 0 }}>
                                                            <div style={{ display: 'flex', fontWeight: 700, color: '#374151', padding: '4px 8px', background: '#f8f9fa', borderBottom: '1px solid #e2e8f0', pointerEvents: 'auto', fontSize: '12px', position: 'relative' }}>
                                                                {visCols.map(col => (
                                                                    <div key={col.key} style={{ width: cw(col), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', position: 'relative' }}>
                                                                        {col.key === 'select' && ''}
                                                                        {col.key === 'part_number' && t('Part No.')}
                                                                        {col.key === 'name' && t('Name')}
                                                                        {col.key === 'price' && t('P. Unit Price')}
                                                                        {col.key === 'stock' && t('Stock')}
                                                                        {col.key === 'brand' && t('Brand')}
                                                                        {col.key === 'country' && t('Country')}
                                                                        {resizeHandle(col.key)}
                                                                    </div>
                                                                ))}
                                                                <div style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer' }}
                                                                    onClick={e => { e.stopPropagation(); setShowProductSearchSettings(true); }}>
                                                                    <i className="bi bi-gear-fill" style={{ fontSize: '13px', color: '#6b7280' }} />
                                                                </div>
                                                            </div>
                                                        </MenuItem>
                                                        {results.map((option, idx) => {
                                                            const isActive = state.activeIndex === idx || results.length === 1;
                                                            const pup = option.product_stores?.[storeId]?.purchase_unit_price;
                                                            const pupVat = option.product_stores?.[storeId]?.purchase_unit_price_with_vat;
                                                            const stock = option.product_stores?.[storeId]?.stock;
                                                            const partNo = option.prefix_part_number ? `${option.prefix_part_number}-${option.part_number}` : option.part_number;
                                                            const displayName = option.name_in_arabic ? `${option.name} - ${option.name_in_arabic}` : option.name;
                                                            const rowBg = isActive ? '#e8f0fe' : 'transparent';
                                                            let checked = isProductAdded(option.id);
                                                            return (
                                                                <MenuItem option={option} position={idx} key={idx} style={{ padding: '0px' }}>
                                                                    <div style={{ display: 'flex', padding: '5px 8px', alignItems: 'center', background: rowBg, fontSize: '13px' }}>
                                                                        {visCols.map(col => (
                                                                            <div key={col.key} style={{ width: cw(col), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                                {col.key === 'select' &&
                                                                                    <div
                                                                                        className="form-check"
                                                                                        style={{ width: cw(col) }}
                                                                                        onClick={e => {
                                                                                            e.stopPropagation();
                                                                                            checked = !checked;
                                                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                                                            timerRef.current = setTimeout(() => {
                                                                                                if (checked) { addProduct(option, true); } else { removeProductByObject(option); }
                                                                                            }, 100);
                                                                                        }}
                                                                                    >
                                                                                        <input
                                                                                            className="form-check-input"
                                                                                            type="checkbox"
                                                                                            value={checked}
                                                                                            checked={checked}
                                                                                            onClick={e => { e.stopPropagation(); }}
                                                                                            onChange={e => {
                                                                                                e.preventDefault();
                                                                                                e.stopPropagation();
                                                                                                checked = !checked;
                                                                                                if (timerRef.current) clearTimeout(timerRef.current);
                                                                                                timerRef.current = setTimeout(() => {
                                                                                                    if (checked) { addProduct(option, true); } else { removeProductByObject(option); }
                                                                                                }, 100);
                                                                                            }}
                                                                                        />
                                                                                    </div>
                                                                                }
                                                                                {col.key === 'part_number' && <span style={{ fontFamily: 'monospace', color: isActive ? '#004ac6' : '#374151', fontWeight: isActive ? 600 : 400 }}>{highlightWords(partNo, searchWords, isActive)}</span>}
                                                                                {col.key === 'name' && <span style={{ paddingRight: '8px', color: isActive ? '#191c1e' : '#374151', fontWeight: isActive ? 600 : 400 }}>{highlightWords(displayName, searchWords, isActive)}</span>}
                                                                                {col.key === 'price' && <span style={{ fontFamily: 'monospace', color: '#059669' }}>{pup != null && pup !== 0 && <><Amount amount={trimTo2Decimals(pup)} />{pupVat != null && pupVat !== 0 && <span style={{ color: '#6b7280', fontSize: '11px' }}> +<Amount amount={trimTo2Decimals(pupVat)} /></span>}</>}</span>}
                                                                                {col.key === 'stock' && <span style={{ color: '#6b7280' }}>{stock != null ? stock : '–'}</span>}
                                                                                {col.key === 'brand' && <span style={{ color: '#6b7280' }}>{highlightWords(option.brand_name || '–', searchWords, isActive)}</span>}
                                                                                {col.key === 'country' && <span style={{ color: '#6b7280' }}>{highlightWords(option.country_name || '–', searchWords, isActive)}</span>}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </MenuItem>
                                                            );
                                                        })}
                                                    </Menu>
                                                );
                                            }}
                                        />
                                    </div>
                                    <button type="button" title={t('Browse Products')} onClick={openProductsModal}
                                        style={{ background: '#004ac6', color: '#fff', border: 'none', borderRadius: '4px', padding: '9px 14px', fontSize: '13px', cursor: 'pointer', flexShrink: 0 }}>
                                        <i className="bi bi-list" />
                                    </button>
                                    <div ref={importDropdownRef} style={{ position: 'relative', flexShrink: 0 }}>
                                        <button type="button" onClick={() => setImportDropdownOpen(v => !v)}
                                            style={{ background: '#fff', border: '1px solid #c3c6d7', borderRadius: '4px', padding: '8px 10px', fontSize: '12px', cursor: 'pointer', color: '#374151', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', fontWeight: 600 }}>
                                            <i className="bi bi-box-arrow-in-down" style={{ fontSize: '13px' }} /> {t('Import From')} <i className="bi bi-chevron-down" style={{ fontSize: '10px' }} />
                                        </button>
                                        {importDropdownOpen && (
                                            <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: 9999, background: '#fff', border: '1px solid #d1d5db', borderRadius: '6px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: '180px', overflow: 'hidden', marginTop: '2px' }}>
                                                {[
                                                    { key: 'quotation',       label: 'Quotation' },
                                                    { key: 'sales',           label: 'Sales' },
                                                    { key: 'sales_return',    label: 'Sales Return' },
                                                    { key: 'purchase',        label: 'Purchase' },
                                                    { key: 'purchase_return', label: 'Purchase Return' },
                                                    { key: 'delivery_note',   label: 'Delivery Note' },
                                                ].map(item => (
                                                    <button key={item.key} type="button"
                                                        onClick={() => {
                                                            setImportDropdownOpen(false);
                                                            const defaultParties = (item.key === 'purchase' || item.key === 'purchase_return') && selectedVendors.length > 0
                                                                ? selectedVendors
                                                                : [];
                                                            SourceDocumentPickerRef.current?.open(handleImportFromSource, item.key, defaultParties);
                                                        }}
                                                        style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 14px', fontSize: '13px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#374151' }}
                                                        onMouseEnter={e => { e.currentTarget.style.background = '#f0f4ff'; e.currentTarget.style.color = '#004ac6'; }}
                                                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#374151'; }}>
                                                        {t(item.label)}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {errors.product_id && <div style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px' }}>{errors.product_id}</div>}
                        </div>

                        {/* ── Product Table + Bill Summary (75/25) ── */}
                        <div className="col-12">
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                {/* Left 75%: Product table */}
                                <div style={{ flex: '0 0 75%', minWidth: 0 }}>
                                    <div style={{ position: 'relative', marginTop: '8px' }}>
                                        <div className="table-responsive" style={{ overflowX: 'auto', maxHeight: '480px', overflowY: 'auto' }}>
                                            <DragDropContext onDragEnd={onDragEnd}>
                                                <table className="table table-striped table-sm table-bordered" style={{ fontSize: '12px' }}>
                                                    <thead>
                                                        <tr className="text-center" style={{ position: 'sticky', top: 0, background: '#f8f9fa', zIndex: 2 }}>
                                                            <th style={{ width: '30px' }}></th>
                                                            <th style={{ width: '35px' }}>{t('SI')}</th>
                                                            <th className="text-start" style={{ minWidth: '220px' }}>{t('Product')}</th>
                                                                            <th style={{ width: '100px' }}>{t('Qty')}</th>
                                                            <th style={{ width: '120px' }}>{t('Unit Price (ex.VAT)')}</th>
                                                            <th style={{ width: '120px' }}>{t('Unit Price (inc.VAT)')}</th>
                                                            <th style={{ width: '100px' }}>{t('U.Disc.(ex.VAT)')}</th>
                                                            <th style={{ width: '110px' }}>{t('Total (ex.VAT)')}</th>
                                                            <th style={{ width: '40px' }}></th>
                                                        </tr>
                                                    </thead>
                                                    <Droppable droppableId="purchase-order-products">
                                                        {(provided) => (
                                                            <tbody ref={provided.innerRef} {...provided.droppableProps}>
                                                                {productRows}
                                                                {provided.placeholder}
                                                                {selectedProducts.length === 0 && (
                                                                    <tr>
                                                                        <td colSpan={11} style={{ textAlign: 'center', color: '#9ca3af', padding: '24px', fontStyle: 'italic', fontSize: '13px' }}>
                                                                            {t('No products added yet. Search above to add products.')}
                                                                        </td>
                                                                    </tr>
                                                                )}
                                                            </tbody>
                                                        )}
                                                    </Droppable>
                                                </table>
                                            </DragDropContext>
                                        </div>
                                    </div>
                                </div>
                                {/* Right 25%: Bill Summary */}
                                <div style={{ flex: '0 0 calc(25% - 12px)', minWidth: '220px' }}>
                                    <div style={{ position: 'relative', marginTop: '8px' }}>
                                        <span style={{ position: 'absolute', top: '-8px', left: '14px', fontSize: '10px', fontWeight: 600, color: '#6b7280', background: '#fff', padding: '0 4px', lineHeight: 1, zIndex: 1, pointerEvents: 'none' }}>{t('Bill Summary')}</span>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                            <div style={{ padding: '6px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>

                                                {/* Total ex VAT */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', lineHeight: '20px' }}>
                                                    <span style={{ color: '#434655' }}>{t("Total (ex. VAT)")}</span>
                                                    <span style={{ fontWeight: 500 }}><NumberFormat value={trimTo2Decimals(formData.total || 0)} displayType="text" thousandSeparator={true} suffix={" "} renderText={v => v} /></span>
                                                </div>

                                                {/* Shipping */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', lineHeight: '20px' }}>
                                                    <span style={{ color: '#434655' }}>{t("Shipping & Handling")}</span>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', position: 'relative' }}>
                                                        <input type="number" onWheel={e => e.target.blur()} style={{ width: '110px' }} className="form-control form-control-sm text-end" value={shipping}
                                                            onChange={e => {
                                                                if (timerRef.current) clearTimeout(timerRef.current);
                                                                shipping = parseFloat(e.target.value) || 0;
                                                                setShipping(shipping);
                                                                timerRef.current = setTimeout(() => reCalculate(), 100);
                                                            }} />
                                                    </div>
                                                </div>

                                                {/* Discount */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', lineHeight: '20px' }}>
                                                    <span style={{ color: '#434655' }}>{t("Discount (ex. VAT)")}</span>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', position: 'relative' }}>
                                                        <input type="number" onWheel={e => e.target.blur()} style={{ width: '110px' }} className="form-control form-control-sm text-end" value={discount} ref={discountRef}
                                                            onFocus={() => { if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = setTimeout(() => discountRef.current?.select(), 20); }}
                                                            onChange={e => {
                                                                if (timerRef.current) clearTimeout(timerRef.current);
                                                                discount = parseFloat(e.target.value) || 0;
                                                                setDiscount(discount);
                                                                discountWithVAT = parseFloat(trimTo2Decimals(discount * (1 + (formData.vat_percent / 100))));
                                                                setDiscountWithVAT(discountWithVAT);
                                                                timerRef.current = setTimeout(() => reCalculate(), 100);
                                                            }} />
                                                    </div>
                                                </div>

                                                {/* Taxable amount */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', lineHeight: '20px' }}>
                                                    <span style={{ color: '#434655' }}>{t("Taxable Amount (ex. VAT)")}</span>
                                                    <span style={{ fontWeight: 500 }}><NumberFormat value={trimTo2Decimals((formData.total || 0) + (parseFloat(shipping) || 0) - (parseFloat(discount) || 0))} displayType="text" thousandSeparator={true} suffix={" "} renderText={v => v} /></span>
                                                </div>

                                                {/* VAT */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', lineHeight: '20px' }}>
                                                    <span style={{ color: '#434655', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        {t("VAT")}
                                                        <input type="number" onWheel={e => e.target.blur()} disabled={true} className="form-control form-control-sm text-center" style={{ width: '54px', display: 'inline-block' }} value={formData.vat_percent || 0}
                                                            onChange={e => { formData.vat_percent = parseFloat(e.target.value) || 0; reCalculate(); setFormData({ ...formData }); }} />
                                                        %
                                                    </span>
                                                    <span style={{ fontWeight: 500 }}><NumberFormat value={trimTo2Decimals(formData.vat_price || 0)} displayType="text" thousandSeparator={true} suffix={" "} renderText={v => v} /></span>
                                                </div>

                                                {/* Rounding */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', lineHeight: '20px' }}>
                                                    <span style={{ color: '#434655', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        {t("Rounding")}
                                                        <label style={{ fontSize: '11px', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', marginBottom: 0 }}>
                                                            <input type="checkbox" className="form-check-input" style={{ width: '14px', height: '14px', verticalAlign: 'middle' }}
                                                                checked={!!formData.auto_rounding_amount}
                                                                onChange={() => { formData.auto_rounding_amount = !formData.auto_rounding_amount; setFormData({ ...formData }); reCalculate(); }} />
                                                            Auto
                                                        </label>
                                                    </span>
                                                    <div>
                                                        <input type="number" disabled={!!formData.auto_rounding_amount} onWheel={e => e.target.blur()} style={{ width: '110px' }} className="form-control form-control-sm text-end" value={roundingAmount}
                                                            onChange={e => {
                                                                if (timerRef.current) clearTimeout(timerRef.current);
                                                                roundingAmount = parseFloat(e.target.value) || 0;
                                                                setRoundingAmount(roundingAmount);
                                                                timerRef.current = setTimeout(() => reCalculate(), 100);
                                                            }} />
                                                    </div>
                                                </div>

                                                {/* Net Total */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '15px', fontWeight: 700, paddingTop: '10px', borderTop: '1px solid #c3c6d7', color: '#191c1e', marginTop: '2px' }}>
                                                    <span>{t("Net Total (inc. VAT)")}</span>
                                                    <span style={{ color: '#004ac6' }}><NumberFormat value={trimTo2Decimals(formData.net_total || 0)} displayType="text" thousandSeparator={true} suffix={" "} renderText={v => v} /></span>
                                                </div>

                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </form>
                </Modal.Body>
            </Modal>
        </>
    );
});

export default PurchaseOrderCreate;
