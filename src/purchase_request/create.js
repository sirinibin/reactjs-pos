import React, { useState, useEffect, useRef, forwardRef, useMemo, useImperativeHandle, useCallback } from "react";
import { Modal, Spinner } from "react-bootstrap";
import ProductCreate from "./../product/create.js";
import { Typeahead, Menu, MenuItem } from "react-bootstrap-typeahead";
import NumberFormat from "react-number-format";
import DatePicker from "react-datepicker";
import { format } from "date-fns";
import ProductView from "./../product/view.js";
import { trimTo2Decimals } from "../utils/numberUtils";
import Products from "../utils/products.js";
import { highlightWords } from "../utils/search.js";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { useTranslation } from 'react-i18next';
import { getDateLocale } from "../i18n/dateLocales";
import { ObjectToSearchQueryParams } from '../utils/queryUtils.js';
import TableSettingsModal from '../utils/TableSettingsModal.js';
import Preview from '../order/preview.js';

const DEFAULT_PS_COLUMNS = [
    { key: 'select',      label: 'Select',        width: 3,  visible: true },
    { key: 'part_number', label: 'Part No.',      width: 15, visible: true },
    { key: 'name',        label: 'Name',          width: 37, visible: true },
    { key: 'price',       label: 'P. Unit Price', width: 18, visible: true },
    { key: 'stock',       label: 'Stock',         width: 6,  visible: true },
    { key: 'brand',       label: 'Brand',         width: 16, visible: true },
    { key: 'country',     label: 'Country',       width: 8,  visible: true },
];
const PR_PS_COLS_KEY = 'pr_product_search_columns';

const statusColors = {
    pending:           "#6b7280",
    accepted:          "#16a34a",
    partially_accepted:"#d97706",
    rejected:          "#dc2626",
};

const PurchaseRequestCreate = forwardRef((props, ref) => {
    const { t, i18n } = useTranslation('common');
    const dateLocale = useMemo(() => getDateLocale(i18n.language), [i18n.language]);

    useImperativeHandle(ref, () => ({
        open(id) {
            errors = {};
            setErrors({ ...errors });
            selectedProducts = [];
            setSelectedProducts([]);
            selectedUsers = [];
            setSelectedUsers([]);

            formData = {
                vat_percent: 15.0,
                discount: 0.0,
                shipping_handling_fees: 0.00,
                rounding_amount: 0.00,
                auto_rounding_amount: true,
                date_str: new Date(),
                status: "pending",
                notes: "",
            };

            if (localStorage.getItem('store_id')) {
                formData.store_id = localStorage.getItem('store_id');
                formData.store_name = localStorage.getItem('store_name');
            }

            discount = 0;
            setDiscount(0);
            shipping = 0;
            setShipping(0);
            roundingAmount = 0;
            setRoundingAmount(0);

            setFormData({ ...formData });
            if (id) {
                getPurchaseRequest(id);
            }
            setShow(true);
        },
    }));

    let [errors, setErrors] = useState({});
    const [isProcessing, setProcessing] = useState(false);
    let [formData, setFormData] = useState({
        vat_percent: 15.0,
        discount: 0.0,
        status: "pending",
        notes: "",
    });

    // Assigned To user
    const [userOptions, setUserOptions] = useState([]);
    let [selectedUsers, setSelectedUsers] = useState([]);
    const userSearchRef = useRef();
    const [openUserSearchResult, setOpenUserSearchResult] = useState(false);

    // Product
    const [productOptions, setProductOptions] = useState([]);
    let selectedProduct = [];
    let [selectedProducts, setSelectedProducts] = useState([]);
    const productSearchRef = useRef();
    const [openProductSearchResult, setOpenProductSearchResult] = useState(false);

    const [showProductSearchSettings, setShowProductSearchSettings] = useState(false);
    const [searchProductsColumns, setSearchProductsColumns] = useState(() => {
        try {
            const saved = localStorage.getItem(PR_PS_COLS_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                const keyMap = {};
                parsed.forEach(c => { keyMap[c.key] = c; });
                return DEFAULT_PS_COLUMNS.map(d => keyMap[d.key] ? { ...d, ...keyMap[d.key] } : d);
            }
        } catch {}
        return DEFAULT_PS_COLUMNS.map(c => ({ ...c }));
    });

    // Refs
    const timerRef = useRef(null);
    const ProductCreateFormRef = useRef();
    const ProductDetailsViewRef = useRef();
    const ProductsRef = useRef();
    const latestRequestRef = useRef(null);
    const onChangeTriggeredRef = useRef(false);
    const inputRefs = useRef([]);

    let [discount, setDiscount] = useState(0.00);
    let [shipping, setShipping] = useState(0.00);
    let [roundingAmount, setRoundingAmount] = useState(0.00);
    const [activeInput, setActiveInput] = useState({ key: null, value: '' });

    const [show, setShow] = useState(false);
    const PreviewRef = useRef();
    const [showOrderPreview, setShowOrderPreview] = useState(false);

    function openPreview() {
        if (!formData.id) return;
        setShowOrderPreview(true);
        setTimeout(() => {
            PreviewRef.current?.open(formData, undefined, "purchase_request");
        }, 100);
    }

    function sendWhatsAppMessage() {
        if (!formData.id) return;
        setShowOrderPreview(true);
        setTimeout(() => {
            PreviewRef.current?.open(formData, "whatsapp", "whatsapp_purchase_request");
        }, 100);
    }

    function handleClose() {
        selectedProducts = [];
        setSelectedProducts([]);
        setShow(false);
    }

    useEffect(() => {
        const at = localStorage.getItem("access_token");
        if (!at) window.location = "/";
    });

    async function getPurchaseRequest(id) {
        const storeId = localStorage.getItem("store_id");
        const res = await fetch(`/v1/purchase-request/${id}?search[store_id]=${storeId}`, {
            headers: { Authorization: localStorage.getItem("access_token") },
        });
        const data = await res.json();
        if (!data.result) return;
        const pr = data.result;

        discount = pr.discount || 0;
        setDiscount(discount);
        shipping = pr.shipping_handling_fees || 0;
        setShipping(shipping);
        roundingAmount = pr.rounding_amount || 0;
        setRoundingAmount(roundingAmount);

        formData = {
            ...pr,
            date_str: pr.date ? new Date(pr.date) : new Date(),
            vat_percent: pr.vat_percent ?? 15.0,
        };
        setFormData({ ...formData });

        if (pr.assigned_to && pr.assigned_to_name) {
            selectedUsers = [{ id: pr.assigned_to, name: pr.assigned_to_name, search_label: pr.assigned_to_name }];
            setSelectedUsers([...selectedUsers]);
        }

        if (pr.products && pr.products.length > 0) {
            const vatPercent = pr.vat_percent ?? 15.0;
            selectedProducts = pr.products.map((p, i) => {
                const pup = p.purchase_unit_price || 0;
                const pupVat = p.purchase_unit_price_with_vat || parseFloat(trimTo2Decimals(pup * (1 + vatPercent / 100)));
                const disc = p.unit_discount || 0;
                const discVat = p.unit_discount_with_vat || parseFloat(trimTo2Decimals(disc * (1 + vatPercent / 100)));
                return {
                    ...p,
                    index: i,
                    purchase_unit_price: pup,
                    purchase_unit_price_with_vat: pupVat,
                    unit_discount: disc,
                    unit_discount_with_vat: discVat,
                    unit_discount_percent: p.unit_discount_percent || 0,
                };
            });
            setSelectedProducts([...selectedProducts]);
        }
    }

    async function suggestUsers(searchTerm) {
        const storeId = localStorage.getItem("store_id");
        let url = `/v1/user?select=id,name,user_role&search[store_id]=${storeId}&limit=20`;
        if (searchTerm) url += `&search[name]=${encodeURIComponent(searchTerm)}`;
        const res = await fetch(url, { headers: { Authorization: localStorage.getItem("access_token") } });
        const data = await res.json();
        let users = (data.result || []).map(u => ({ ...u, search_label: u.name }));

        // Always allow self-assign — prepend current user if not already in the list
        const selfId = localStorage.getItem("user_id");
        const selfName = localStorage.getItem("user_name");
        const selfRole = localStorage.getItem("user_role") || "";
        if (selfId && selfName && !users.some(u => u.id === selfId)) {
            if (!searchTerm || selfName.toLowerCase().includes(searchTerm.toLowerCase())) {
                users = [{ id: selfId, name: selfName, user_role: selfRole, search_label: selfName }, ...users];
            }
        }

        setUserOptions(users);
        setOpenUserSearchResult(true);
    }

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
        if (qWords.every(word => {
            if (searchable.includes(word)) return true;
            const wordCompact = word.replace(/[^\p{L}\p{N}]/gu, "");
            if (!wordCompact || /^[^\p{L}\p{N}]/u.test(word)) return false;
            return searchableCompact.includes(wordCompact);
        })) return true;
        const qNoSpace = q.replace(/\s+/g, "");
        const searchableNoSpace = searchable.replace(/\s+/g, "");
        return qNoSpace.length >= 2 && searchableNoSpace.includes(qNoSpace);
    }, []);

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
        const Select = `select=id,rack,allow_duplicates,additional_keywords,search_label,set.name,item_code,prefix_part_number,country_name,brand_name,part_number,name,unit,name_in_arabic,is_service,product_stores.${storeId}.purchase_unit_price,product_stores.${storeId}.purchase_unit_price_with_vat,product_stores.${storeId}.stock`;

        const result = await fetch(`/v1/product?${Select}&${queryString}&limit=100`, {
            method: "GET",
            headers: { "Content-Type": "application/json", Authorization: localStorage.getItem("access_token") },
        });
        const data = await result.json();
        if (latestRequestRef.current !== requestId) return;

        const products = data.result || [];
        if (!products.length) { setOpenProductSearchResult(false); return; }

        setProductOptions(products.filter(opt => customFilter(opt, searchTerm)));
        setOpenProductSearchResult(true);
    }, [customFilter]);

    function isProductAdded(productID) {
        return selectedProducts.some(p => p.product_id === productID);
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
        const purchaseUnitPriceWithVAT = storeData?.purchase_unit_price_with_vat || (purchaseUnitPrice * (1 + vatPercent / 100));

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
        };

        selectedProducts = [...selectedProducts, newProduct];
        setSelectedProducts([...selectedProducts]);
        formData.products = selectedProducts;
        reCalculate();

        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            const lastIdx = selectedProducts.length - 1;
            if (inputRefs.current[lastIdx]) {
                inputRefs.current[lastIdx][`pr_product_qty_${lastIdx}`]?.select();
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
        let total = 0;
        for (const p of selectedProducts) {
            total += (p.quantity || 0) * ((p.purchase_unit_price || 0) - (p.unit_discount || 0));
        }
        total = parseFloat(trimTo2Decimals(total));
        const d = parseFloat(discount) || 0;
        const s = parseFloat(shipping) || 0;
        const base = total + s - d;
        const vatPrice = parseFloat(trimTo2Decimals(base * (vatPercent / 100)));
        let netTotal = parseFloat(trimTo2Decimals(base + vatPrice));
        const rounding = parseFloat(roundingAmount) || 0;
        netTotal = parseFloat(trimTo2Decimals(netTotal + rounding));

        formData.total = total;
        formData.vat_price = vatPrice;
        formData.net_total = netTotal;
        formData.discount = d;
        formData.shipping_handling_fees = s;
        formData.rounding_amount = rounding;
        setFormData({ ...formData });
    }

    function CalCulateLineTotals(index) {
        const vatPercent = formData.vat_percent || 0;
        setSelectedProducts(prev => {
            if (index >= prev.length) return prev;
            const updated = [...prev];
            const sp = { ...updated[index] };
            sp.purchase_unit_price_with_vat = parseFloat(trimTo2Decimals(sp.purchase_unit_price * (1 + vatPercent / 100)));
            sp.unit_discount_with_vat = parseFloat(trimTo2Decimals(sp.unit_discount * (1 + vatPercent / 100)));
            sp.unit_discount_percent = sp.purchase_unit_price > 0 ? parseFloat(trimTo2Decimals((sp.unit_discount / sp.purchase_unit_price) * 100)) : 0;
            updated[index] = sp;
            formData.products = updated;
            return updated;
        });
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

    function handleTogglePsColumn(index) {
        const updated = searchProductsColumns.map((c, i) => i === index ? { ...c, visible: !c.visible } : c);
        setSearchProductsColumns(updated);
        localStorage.setItem(PR_PS_COLS_KEY, JSON.stringify(updated));
    }

    function handlePsColumnDragEnd(result) {
        if (!result.destination) return;
        const reordered = Array.from(searchProductsColumns);
        const [moved] = reordered.splice(result.source.index, 1);
        reordered.splice(result.destination.index, 0, moved);
        setSearchProductsColumns(reordered);
        localStorage.setItem(PR_PS_COLS_KEY, JSON.stringify(reordered));
    }

    function restorePsDefaults() {
        const cloned = DEFAULT_PS_COLUMNS.map(c => ({ ...c }));
        setSearchProductsColumns(cloned);
        localStorage.setItem(PR_PS_COLS_KEY, JSON.stringify(cloned));
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
            const totalW = cols.filter(c => c.visible).reduce((s, c) => s + c.width, 0);
            const menuVw = 80;
            const pxPerUnit = (window.innerWidth * menuVw / 100) / totalW;

            function onMouseMove(ev) {
                const diffPx = ev.clientX - startX;
                const diffUnits = diffPx / pxPerUnit;
                const newWidth = Math.max(3, startWidth + diffUnits);
                setSearchProductsColumns(prev => {
                    const updated = prev.map(c => c.key === colKey ? { ...c, width: parseFloat(newWidth.toFixed(1)) } : c);
                    localStorage.setItem(PR_PS_COLS_KEY, JSON.stringify(updated));
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

    function openProductCreateForm() { ProductCreateFormRef.current.open(); }
    function openProductUpdateForm(id) { ProductCreateFormRef.current.open(id); }
    function openProductDetails(product) { ProductDetailsViewRef.current.open(product.product_id || product.id); }
    function openProductsModal() { ProductsRef.current.open(false, []); }

    async function handleCreate(e) {
        if (e && e.preventDefault) e.preventDefault();
        if (isProcessing) return;
        setProcessing(true);

        const storeId = localStorage.getItem("store_id");
        const method = formData.id ? "PUT" : "POST";
        const endpoint = formData.id ? `/v1/purchase-request/${formData.id}` : "/v1/purchase-request";
        const queryParams = ObjectToSearchQueryParams({ store_id: storeId });

        const payload = {
            ...formData,
            products: selectedProducts,
            assigned_to: selectedUsers[0]?.id || formData.assigned_to || null,
            assigned_to_name: selectedUsers[0]?.name || formData.assigned_to_name || "",
            discount: parseFloat(discount) || 0,
            shipping_handling_fees: parseFloat(shipping) || 0,
            rounding_amount: parseFloat(roundingAmount) || 0,
            date_str: formData.date_str
                ? (typeof formData.date_str === 'string' ? formData.date_str : formData.date_str.toISOString())
                : new Date().toISOString(),
        };

        fetch(endpoint + "?" + queryParams, {
            method,
            headers: {
                "Content-Type": "application/json",
                Authorization: localStorage.getItem("access_token"),
            },
            body: JSON.stringify(payload),
        })
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();
                if (!response.ok) return Promise.reject(data.errors);
                setErrors({});
                setProcessing(false);
                formData = { ...formData, id: data.result?.id, code: data.result?.code };
                setFormData({ ...formData });
                setShow(false);
                if (props.onSave) props.onSave(data.result);
            })
            .catch(error => {
                setErrors({ ...(error || { general: "An error occurred" }) });
                setProcessing(false);
            });
    }

    // Product table rows
    const productRows = selectedProducts.map((product, index) => {
        if (!inputRefs.current[index]) inputRefs.current[index] = {};
        return (
            <Draggable key={index} draggableId={"pr-product-row-" + index} index={index}>
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
                                    ref={el => { if (el) inputRefs.current[index][`pr_product_qty_${index}`] = el; }}
                                    value={activeInput.key === `qty_${index}` ? activeInput.value : String(product.quantity)}
                                    onFocus={e => { setActiveInput({ key: `qty_${index}`, value: String(product.quantity) }); setTimeout(() => e.target.select(), 0); }}
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
                                onFocus={e => { setActiveInput({ key: `price_${index}`, value: String(trimTo2Decimals(product.purchase_unit_price)) }); setTimeout(() => e.target.select(), 0); }}
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
                                onFocus={e => { setActiveInput({ key: `price_vat_${index}`, value: String(trimTo2Decimals(product.purchase_unit_price_with_vat)) }); setTimeout(() => e.target.select(), 0); }}
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
                                onFocus={e => { setActiveInput({ key: `disc_${index}`, value: String(trimTo2Decimals(product.unit_discount || 0)) }); setTimeout(() => e.target.select(), 0); }}
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

    const statusLabel = {
        pending: t('Pending'),
        accepted: t('Accepted'),
        partially_accepted: t('Partially Accepted'),
        rejected: t('Rejected'),
    };

    return (
        <>
            <Products ref={ProductsRef} onSelectProducts={handleSelectedProducts} showToastMessage={props.showToastMessage} />
            <ProductView ref={ProductDetailsViewRef} openUpdateForm={openProductUpdateForm} openCreateForm={openProductCreateForm} />
            <ProductCreate ref={ProductCreateFormRef} showToastMessage={props.showToastMessage} />
            <TableSettingsModal
                show={showProductSearchSettings}
                onHide={() => setShowProductSearchSettings(false)}
                title={t('Product Search Settings')}
                columns={searchProductsColumns}
                onToggleColumn={handleTogglePsColumn}
                onDragEnd={handlePsColumnDragEnd}
                onRestoreDefaults={restorePsDefaults}
            />
            {showOrderPreview && <Preview ref={PreviewRef} showToastMessage={props.showToastMessage} />}

            <Modal show={show} size="xl" fullscreen onHide={handleClose} animation={false} backdrop="static" scrollable={true}>
                {/* Compact header — same style as Purchase Order */}
                <Modal.Header style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #c3c6d7', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <div className="sc-header-title">
                        <h1 style={{ margin: 0, fontSize: '20px', lineHeight: '28px', fontWeight: 700, letterSpacing: '-0.01em', fontFamily: "'Hanken Grotesk', sans-serif", color: '#191c1e', whiteSpace: 'nowrap' }}>
                            {formData.id ? t('Update Purchase Request') + " #" + formData.code : t('Create Purchase Request')}
                        </h1>
                        {formData.id && (
                            <span style={{
                                background: `${statusColors[formData.status] || '#6b7280'}18`,
                                color: statusColors[formData.status] || '#6b7280',
                                borderRadius: '12px',
                                padding: '2px 10px',
                                fontSize: '12px',
                                fontWeight: 600,
                                border: `1px solid ${statusColors[formData.status] || '#d1d5db'}40`,
                            }}>
                                {statusLabel[formData.status] || formData.status}
                            </span>
                        )}
                    </div>
                    <div className="sc-header-actions">
                        {formData.id && <>
                            <button type="button" title={t('Print / Preview')} onClick={openPreview}
                                style={{ background: '#fff', border: '1px solid #c3c6d7', borderRadius: '4px', padding: '7px 10px', fontSize: '13px', cursor: 'pointer', color: '#434655', display: 'flex', alignItems: 'center', gap: '4px' }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = '#004ac6'; e.currentTarget.style.color = '#004ac6'; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = '#c3c6d7'; e.currentTarget.style.color = '#434655'; }}>
                                <i className="bi bi-printer" />
                            </button>
                            <button type="button" title={t('Share via WhatsApp')} onClick={sendWhatsAppMessage}
                                style={{ background: '#25d366', border: 'none', borderRadius: '4px', padding: '7px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="white" viewBox="0 0 16 16"><path d="M13.601 2.326A7.875 7.875 0 0 0 8.036 0C3.596 0 0 3.597 0 8.036c0 1.417.37 2.805 1.07 4.03L0 16l3.993-1.05a7.968 7.968 0 0 0 4.043 1.085h.003c4.44 0 8.036-3.596 8.036-8.036 0-2.147-.836-4.166-2.37-5.673ZM8.036 14.6a6.584 6.584 0 0 1-3.35-.92l-.24-.142-2.37.622.63-2.31-.155-.238a6.587 6.587 0 0 1-1.018-3.513c0-3.637 2.96-6.6 6.6-6.6 1.764 0 3.42.69 4.67 1.94a6.56 6.56 0 0 1 1.93 4.668c0 3.637-2.96 6.6-6.6 6.6Zm3.61-4.885c-.198-.1-1.17-.578-1.352-.644-.18-.066-.312-.1-.444.1-.13.197-.51.644-.626.775-.115.13-.23.15-.428.05-.198-.1-.837-.308-1.594-.983-.59-.525-.99-1.174-1.11-1.372-.116-.198-.012-.305.088-.403.09-.09.198-.23.298-.345.1-.115.132-.197.2-.33.065-.13.032-.247-.017-.345-.05-.1-.444-1.07-.61-1.46-.16-.384-.323-.332-.444-.338l-.378-.007c-.13 0-.344.048-.525.23s-.688.672-.688 1.64c0 .967.704 1.9.802 2.03.1.13 1.386 2.116 3.365 2.963.47.203.837.324 1.122.414.472.15.902.13 1.24.08.378-.057 1.17-.48 1.336-.942.165-.462.165-.858.116-.943-.048-.084-.18-.132-.378-.23Z"/></svg>
                            </button>
                        </>}
                        <button type="button" onClick={handleCreate}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#004ac6', color: '#ffffff', border: 'none', padding: '6px 16px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', minWidth: '70px', justifyContent: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                            {isProcessing
                                ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden={true} />
                                : <><i className="bi bi-send" style={{ fontSize: '14px' }}></i>&nbsp;{formData.id ? t('Update') : t('Send P.R')}</>
                            }
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

                        {/* ── Assign To + Selected User ── */}
                        <div className="col-12">
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'stretch', paddingTop: '8px', marginBottom: '8px' }}>

                                {/* Left card: user search + date + notes */}
                                <div style={{ flex: 3, minWidth: 0, background: '#fff', border: '1px solid #c3c6d7', borderRadius: '8px', padding: '10px 14px', position: 'relative' }}>
                                    <span style={{ position: 'absolute', top: '-8px', left: '14px', fontSize: '10px', fontWeight: 600, color: '#6b7280', background: '#fff', padding: '0 4px', lineHeight: 1, zIndex: 1, pointerEvents: 'none' }}>{t('Assign To')}</span>

                                    {/* User Typeahead row */}
                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '12px' }}>
                                        <div style={{ flex: '0 0 320px', maxWidth: '320px' }}>
                                            <Typeahead
                                                id="pr_assign_to"
                                                positionFixed={true}
                                                filterBy={() => true}
                                                labelKey="search_label"
                                                size="lg"
                                                open={openUserSearchResult}
                                                isLoading={false}
                                                onChange={(selectedItems) => {
                                                    delete errors.assigned_to;
                                                    setErrors({ ...errors });
                                                    if (selectedItems.length === 0) {
                                                        formData.assigned_to = "";
                                                        setFormData({ ...formData });
                                                        setSelectedUsers([]);
                                                        return;
                                                    }
                                                    formData.assigned_to = selectedItems[0].id;
                                                    setOpenUserSearchResult(false);
                                                    setFormData({ ...formData });
                                                    setSelectedUsers(selectedItems);
                                                }}
                                                options={userOptions}
                                                placeholder={t('Search user by name...')}
                                                selected={selectedUsers}
                                                highlightOnlyResult={true}
                                                ref={userSearchRef}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Escape") {
                                                        setOpenUserSearchResult(false);
                                                        formData.assigned_to = "";
                                                        setFormData({ ...formData });
                                                        setSelectedUsers([]);
                                                        setUserOptions([]);
                                                        userSearchRef.current?.clear();
                                                    }
                                                }}
                                                onInputChange={(searchTerm) => {
                                                    if (timerRef.current) clearTimeout(timerRef.current);
                                                    timerRef.current = setTimeout(() => suggestUsers(searchTerm), 300);
                                                }}
                                                inputProps={{
                                                    onFocus: () => {
                                                        if (timerRef.current) clearTimeout(timerRef.current);
                                                        timerRef.current = setTimeout(() => suggestUsers(""), 150);
                                                    },
                                                }}
                                                renderMenu={(results, menuProps) => (
                                                    <Menu {...menuProps} style={{ ...(menuProps.style || {}), width: '380px', zIndex: 9999 }}>
                                                        {results.map((option, idx) => (
                                                            <MenuItem option={option} position={idx} key={idx} style={{ padding: 0 }}>
                                                                <div style={{ display: 'flex', padding: '7px 12px', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                                                                    <i className="bi bi-person-circle" style={{ fontSize: '20px', color: '#6b7280', flexShrink: 0 }} />
                                                                    <div>
                                                                        <div style={{ fontWeight: 600, color: '#191c1e' }}>{option.name}</div>
                                                                        {option.user_role && <div style={{ fontSize: '11px', color: '#6b7280' }}>{option.user_role}</div>}
                                                                    </div>
                                                                </div>
                                                            </MenuItem>
                                                        ))}
                                                    </Menu>
                                                )}
                                            />
                                        </div>
                                    </div>
                                    {errors.assigned_to && <div style={{ color: '#dc2626', fontSize: '11px', marginBottom: '8px' }}>{errors.assigned_to}</div>}

                                    {/* Fields: Date + Notes */}
                                    <div style={{ display: 'flex', columnGap: '16px', rowGap: '14px', alignItems: 'flex-start', flexWrap: 'wrap' }}>

                                        {/* Date */}
                                        <div style={{ flex: '0 0 185px', position: 'relative' }}>
                                            <span style={{ position: 'absolute', top: '-8px', left: '8px', fontSize: '10px', fontWeight: 600, color: '#6b7280', background: '#fff', padding: '0 4px', lineHeight: 1, zIndex: 1, pointerEvents: 'none' }}>{t('Date')} *</span>
                                            <DatePicker
                                                id="pr_date_str"
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

                                        {/* Notes */}
                                        <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
                                            <span style={{ position: 'absolute', top: '-8px', left: '8px', fontSize: '10px', fontWeight: 600, color: '#6b7280', background: '#fff', padding: '0 4px', lineHeight: 1, zIndex: 1, pointerEvents: 'none' }}>{t('Notes')}</span>
                                            <textarea
                                                value={formData.notes || ''}
                                                onChange={e => { formData.notes = e.target.value; setFormData({ ...formData }); }}
                                                onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); } }}
                                                className="form-control"
                                                placeholder={t('Optional notes...')}
                                                rows={2}
                                                style={{ resize: 'none', fontSize: '13px', width: '100%' }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Right card: selected user info */}
                                <div style={{ flex: 2, minWidth: 0 }}>
                                    {formData.assigned_to && selectedUsers.length > 0 && (() => {
                                        const u = selectedUsers[0];
                                        return (
                                            <div style={{ position: 'relative', height: '100%' }}>
                                                <span style={{ position: 'absolute', top: '-8px', left: '14px', fontSize: '10px', fontWeight: 600, color: '#6b7280', background: '#fff', padding: '0 4px', lineHeight: 1, zIndex: 1, pointerEvents: 'none' }}>{t('Assigned To')}</span>
                                                <div style={{ background: 'rgba(0,74,198,0.05)', border: '1px solid rgba(0,74,198,0.2)', borderRadius: '8px', padding: '16px', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <i className="bi bi-person-circle" style={{ fontSize: '32px', color: '#004ac6', flexShrink: 0 }} />
                                                        <div>
                                                            <div style={{ fontSize: '15px', fontWeight: 700, color: '#191c1e', lineHeight: 1.3 }}>{u.name}</div>
                                                            {u.user_role && <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{u.user_role}</div>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}
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
                                            id="pr_product_search"
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
                                                    <Menu {...menuProps} style={{ ...(menuProps.style || {}), width: '80vw', maxWidth: '80vw', minWidth: '300px', zIndex: 9999 }}>
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
                                                            const storeData = option.product_stores?.[storeId];
                                                            const pup = storeData?.purchase_unit_price;
                                                            const pupVat = storeData?.purchase_unit_price_with_vat;
                                                            const stock = storeData?.stock;
                                                            const partNo = option.prefix_part_number ? `${option.prefix_part_number}-${option.part_number}` : option.part_number;
                                                            const displayName = option.name_in_arabic ? `${option.name} - ${option.name_in_arabic}` : option.name;
                                                            let checked = isProductAdded(option.id);
                                                            return (
                                                                <MenuItem option={option} position={idx} key={idx} style={{ padding: 0 }}>
                                                                    <div style={{ display: 'flex', padding: '5px 8px', alignItems: 'center', background: isActive ? '#e8f0fe' : 'transparent', fontSize: '13px' }}>
                                                                        {visCols.map(col => (
                                                                            <div key={col.key} style={{ width: cw(col), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                                {col.key === 'select' &&
                                                                                    <div className="form-check" style={{ width: cw(col) }}
                                                                                        onClick={e => {
                                                                                            e.stopPropagation();
                                                                                            checked = !checked;
                                                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                                                            timerRef.current = setTimeout(() => {
                                                                                                if (checked) { addProduct(option, true); } else { removeProductByObject(option); }
                                                                                            }, 100);
                                                                                        }}>
                                                                                        <input className="form-check-input" type="checkbox" value={checked} checked={checked}
                                                                                            onClick={e => { e.stopPropagation(); }}
                                                                                            onChange={e => {
                                                                                                e.preventDefault(); e.stopPropagation();
                                                                                                checked = !checked;
                                                                                                if (timerRef.current) clearTimeout(timerRef.current);
                                                                                                timerRef.current = setTimeout(() => {
                                                                                                    if (checked) { addProduct(option, true); } else { removeProductByObject(option); }
                                                                                                }, 100);
                                                                                            }} />
                                                                                    </div>
                                                                                }
                                                                                {col.key === 'part_number' && <span style={{ fontFamily: 'monospace', color: isActive ? '#004ac6' : '#374151', fontWeight: isActive ? 600 : 400 }}>{highlightWords(partNo, searchWords, isActive)}</span>}
                                                                                {col.key === 'name' && <span style={{ paddingRight: '8px', color: isActive ? '#191c1e' : '#374151', fontWeight: isActive ? 600 : 400 }}>{highlightWords(displayName, searchWords, isActive)}</span>}
                                                                                {col.key === 'price' && <span style={{ fontFamily: 'monospace', color: '#059669' }}>{pup != null && pup !== 0 && <>{trimTo2Decimals(pup)}{pupVat != null && pupVat !== 0 && <span style={{ color: '#6b7280', fontSize: '11px' }}> +{trimTo2Decimals(pupVat)}</span>}</>}</span>}
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
                                    <button type="button" title={t('New Product')} onClick={openProductCreateForm}
                                        style={{ background: '#fff', border: '1px solid #c3c6d7', borderRadius: '4px', padding: '7px 12px', fontSize: '13px', cursor: 'pointer', color: '#434655', flexShrink: 0 }}>
                                        <i className="bi bi-plus-lg" />
                                    </button>
                                    <button type="button" title={t('Browse Products')} onClick={openProductsModal}
                                        style={{ background: '#004ac6', color: '#fff', border: 'none', borderRadius: '4px', padding: '9px 14px', fontSize: '13px', cursor: 'pointer', flexShrink: 0 }}>
                                        <i className="bi bi-list" />
                                    </button>
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
                                                    <Droppable droppableId="purchase-request-products">
                                                        {(provided) => (
                                                            <tbody ref={provided.innerRef} {...provided.droppableProps}>
                                                                {productRows}
                                                                {provided.placeholder}
                                                                {selectedProducts.length === 0 && (
                                                                    <tr>
                                                                        <td colSpan={9} style={{ textAlign: 'center', color: '#9ca3af', padding: '24px', fontStyle: 'italic', fontSize: '13px' }}>
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
                                                    <input type="number" onWheel={e => e.target.blur()} style={{ width: '110px' }} className="form-control form-control-sm text-end" value={shipping}
                                                        onChange={e => {
                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                            shipping = parseFloat(e.target.value) || 0;
                                                            setShipping(shipping);
                                                            timerRef.current = setTimeout(() => reCalculate(), 100);
                                                        }} />
                                                </div>

                                                {/* Discount */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', lineHeight: '20px' }}>
                                                    <span style={{ color: '#434655' }}>{t("Discount (ex. VAT)")}</span>
                                                    <input type="number" onWheel={e => e.target.blur()} style={{ width: '110px' }} className="form-control form-control-sm text-end" value={discount}
                                                        onChange={e => {
                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                            discount = parseFloat(e.target.value) || 0;
                                                            setDiscount(discount);
                                                            timerRef.current = setTimeout(() => reCalculate(), 100);
                                                        }} />
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
                                                    <input type="number" disabled={!!formData.auto_rounding_amount} onWheel={e => e.target.blur()} style={{ width: '110px' }} className="form-control form-control-sm text-end" value={roundingAmount}
                                                        onChange={e => {
                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                            roundingAmount = parseFloat(e.target.value) || 0;
                                                            setRoundingAmount(roundingAmount);
                                                            timerRef.current = setTimeout(() => reCalculate(), 100);
                                                        }} />
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

export default PurchaseRequestCreate;
