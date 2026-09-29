import React, { useState, useImperativeHandle, forwardRef, useRef, useCallback, useEffect } from "react";
import * as XLSX from "xlsx";
import { Modal, Button, Spinner } from "react-bootstrap";
import { Typeahead, Menu, MenuItem } from "react-bootstrap-typeahead";
import { highlightWords } from "../utils/search.js";
import { ObjectToSearchQueryParams } from "../utils/queryUtils.js";
import CustomerCreate from "../customer/create.js";
import ProductCreate from "../product/create.js";
import { AI_PROVIDERS, modelsForProvider, fileCapabilityLabel } from "../utils/aiProviders.js";
import EmailDetailModal from "../store/EmailDetailModal.js";

const ACCEPTED_TYPES = ".jpg,.jpeg,.png,.gif,.webp,.pdf,.xlsx,.xls,.csv,.txt";
const FILE_ICONS = {
    pdf:  { icon: "bi-file-earmark-pdf",    color: "#dc2626" },
    xlsx: { icon: "bi-file-earmark-excel",  color: "#16a34a" },
    xls:  { icon: "bi-file-earmark-excel",  color: "#16a34a" },
    csv:  { icon: "bi-file-earmark-text",   color: "#2563eb" },
    txt:  { icon: "bi-file-earmark-text",   color: "#6b7280" },
    jpg:  { icon: "bi-file-earmark-image",  color: "#7c3aed" },
    jpeg: { icon: "bi-file-earmark-image",  color: "#7c3aed" },
    png:  { icon: "bi-file-earmark-image",  color: "#7c3aed" },
    gif:  { icon: "bi-file-earmark-image",  color: "#7c3aed" },
    webp: { icon: "bi-file-earmark-image",  color: "#7c3aed" },
};
function fileIcon(name) {
    const ext = name.split(".").pop().toLowerCase();
    return FILE_ICONS[ext] || { icon: "bi-file-earmark", color: "#6b7280" };
}
function fmtSize(b) {
    if (b < 1024) return b + " B";
    if (b < 1048576) return (b / 1024).toFixed(1) + " KB";
    return (b / 1048576).toFixed(1) + " MB";
}

const EMPTY_FORM = () => ({ customer_id: "", customer_name: "", customer_rfq_id: "", customer_email: "", customer_phone: "", customer_city: "", text_content: "", general_instructions: "" });

const RFQCreate = forwardRef(function RFQCreate({ showToastMessage, onCreated }, ref) {
    const [show, setShow] = useState(false);
    useEffect(() => {
        if (!show) return;
        const apply = () => {
            const el = document.querySelector('.modal.rfq-create-form-modal');
            if (el) el.style.setProperty('z-index', '1600', 'important');
        };
        apply();
        const t = setTimeout(apply, 80);
        return () => clearTimeout(t);
    }, [show]);
    const [editId, setEditId] = useState(null);
    const [editRfqCode, setEditRfqCode] = useState(null);
    const [editLinkedMsgId, setEditLinkedMsgId] = useState(null);
    const [editLinkedMsgCode, setEditLinkedMsgCode] = useState(null);
    const [editLinkedMsgObj, setEditLinkedMsgObj] = useState(null);
    const [showLinkedEmail, setShowLinkedEmail] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM());
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});
    const [sourceMsgId, setSourceMsgId] = useState(null);
    const [sourceMsgCode, setSourceMsgCode] = useState(null);

    // Customer
    const [customerOptions, setCustomerOptions]   = useState([]);
    const [selectedCustomers, setSelectedCustomers] = useState([]);
    const [openCustomerSearch, setOpenCustomerSearch] = useState(false);
    const customerRef = useRef(null);

    // Product search
    const [productOptions, setProductOptions]   = useState([]);
    const [openProductSearch, setOpenProductSearch] = useState(false);
    const [productSearchTotal, setProductSearchTotal] = useState(0);
    const [productSearchPage, setProductSearchPage]   = useState(1);
    const [loadingMore, setLoadingMore]           = useState(false);
    const productRef    = useRef(null);
    const latestReqRef  = useRef(0);
    const loadMoreReqRef = useRef(0);
    const productTermRef = useRef("");

    // Selected products list
    const [products, setProducts] = useState([]);

    // File upload — two separate sections
    const [productFiles, setProductFiles]         = useState([]);  // shown in place of products table
    const [additionalFiles, setAdditionalFiles]   = useState([]);  // shown below products table
    const [existingAdditionalDataURIs, setExistingAdditionalDataURIs] = useState([]);  // already-saved URIs from DB
    const [existingAdditionalFilenames, setExistingAdditionalFilenames] = useState([]);
    const [isDragOverProduct, setIsDragOverProduct]     = useState(false);
    const [isDragOverAdditional, setIsDragOverAdditional] = useState(false);
    const [extracting, setExtracting]           = useState(false);
    const [extractionModel, setExtractionModel] = useState("");
    const [extractedCategories, setExtractedCategories] = useState([]);
    const [syncingProducts, setSyncingProducts] = useState(false);
    const [syncProgress, setSyncProgress] = useState({ done: 0, total: 0 });
    const productFileInputRef    = useRef(null);
    const additionalFileInputRef = useRef(null);
    const productDropZoneRef     = useRef(null);
    const additionalDropZoneRef  = useRef(null);

    // AI File Extraction section
    const storeSettings = (() => { try { return JSON.parse(localStorage.getItem('_store_settings_cache') || 'null'); } catch (_) { return null; } })();
    const defaultAIProvider = AI_PROVIDERS.find(p => storeSettings?.[p.apiKeyField]) || AI_PROVIDERS[0];
    const [aiProvider, setAIProvider] = useState(defaultAIProvider.value);
    const [aiModel, setAIModel]       = useState(modelsForProvider(defaultAIProvider.value)[0]?.value || '');
    const [aiFiles, setAIFiles]       = useState([]);
    const [isDragOverAI, setIsDragOverAI] = useState(false);
    const [aiExtracting, setAIExtracting] = useState(false);
    const aiFileInputRef = useRef(null);
    const aiDropZoneRef  = useRef(null);

    // Text extraction LLM selector
    const [textProvider, setTextProvider] = useState(defaultAIProvider.value);
    const [textModel, setTextModel]       = useState(modelsForProvider(defaultAIProvider.value)[0]?.value || '');


    // Sub-form refs
    const CustomerUpdateRef = useRef(null);
    const CustomerCreateRef = useRef(null);
    const ProductCreateRef  = useRef(null);
    const lastEditedProductId = useRef(null);

    const timerRef = useRef(null);

    useImperativeHandle(ref, () => ({
        open() {
            setEditId(null);
            setEditRfqCode(null);
            setEditLinkedMsgId(null);
            setEditLinkedMsgCode(null);
            setEditLinkedMsgObj(null);
            setShowLinkedEmail(false);
            setSourceMsgId(null);
            setSourceMsgCode(null);
            setForm(EMPTY_FORM());
            setErrors({});
            setSelectedCustomers([]);
            setCustomerOptions([]);
            setOpenCustomerSearch(false);
            setProducts([]);
            setProductOptions([]);
            setOpenProductSearch(false);
            setProductFiles([]);
            setAdditionalFiles([]);
            setExistingAdditionalDataURIs([]);
            setExistingAdditionalFilenames([]);
            setExtractionModel("");
            setExtractedCategories([]);
            setAIFiles([]);
            setShow(true);
        },
        edit(rfq) {
            setEditId(rfq.id || rfq._id);
            setEditRfqCode(rfq.code || null);
            setEditLinkedMsgId(rfq.procurement_message_id || null);
            setEditLinkedMsgCode(rfq.procurement_message_code || null);
            setEditLinkedMsgObj(null);
            setShowLinkedEmail(false);
            setSourceMsgId(null);
            setSourceMsgCode(null);
            setForm({
                customer_id:          rfq.customer_id || "",
                customer_name:        rfq.customer_name || "",
                customer_rfq_id:      rfq.customer_rfq_id || "",
                customer_email:       rfq.customer_email || "",
                customer_phone:       rfq.customer_phone || "",
                text_content:         rfq.text_content || "",
                general_instructions: rfq.general_instructions || "",
            });
            setErrors({});
            setCustomerOptions([]);
            setOpenCustomerSearch(false);
            if (rfq.customer_id && rfq.customer_name) {
                setSelectedCustomers([{
                    id:           rfq.customer_id,
                    search_label: rfq.customer_name,
                    name:         rfq.customer_name,
                    phone:        rfq.customer_phone || "",
                    email:        rfq.customer_email || "",
                    company:      rfq.customer_company || "",
                }]);
            } else {
                setSelectedCustomers([]);
            }
            const mappedProducts = Array.isArray(rfq.products)
                ? rfq.products.map(p => ({
                    product_id: p.product_id || "",
                    part_no:    p.part_no || "",
                    name:       p.name || "",
                    quantity:   p.quantity || 1,
                    unit:       p.unit || "PCE",
                    notes:      p.notes || "",
                }))
                : [];
            setProducts(mappedProducts);
            // Auto-create/link products that have no product_id yet
            if (mappedProducts.some(p => !p.product_id && p.name)) {
                autoSyncProducts(mappedProducts);
            }
            setProductOptions([]);
            setOpenProductSearch(false);
            setProductFiles([]);
            setAdditionalFiles([]);
            setExistingAdditionalDataURIs(rfq.additional_attachment_urls || []);
            setExistingAdditionalFilenames(rfq.additional_attachment_filenames || []);
            setExtractionModel("");
            setShow(true);
        },
        openFromExtraction(data, msgId, msgCode) {
            setEditId(null);
            setSourceMsgId(msgId || null);
            setSourceMsgCode(msgCode || null);
            setEditLinkedMsgObj(null);
            setShowLinkedEmail(false);
            setForm({
                customer_id:          "",
                customer_name:        data.customer_name || "",
                customer_rfq_id:      "",
                customer_email:       data.customer_email || "",
                customer_phone:       data.customer_phone || "",
                customer_city:        data.customer_city || "",
                text_content:         "",
                general_instructions: data.general_instructions || "",
            });
            setErrors({});
            // Show extracted customer name immediately; autoCreateOrFindCustomer will replace with DB record
            if (data.customer_name) {
                setSelectedCustomers([{ id: "", name: data.customer_name, search_label: data.customer_name, phone: data.customer_phone || "", email: data.customer_email || "" }]);
            } else {
                setSelectedCustomers([]);
            }
            setCustomerOptions([]);
            setOpenCustomerSearch(false);
            const mappedProducts = (data.products || []).map(p => ({
                product_id: "",
                part_no:    p.part_no || "",
                name:       p.name || "",
                quantity:   p.quantity || 1,
                unit:       p.unit || "PCE",
                notes:      p.notes || "",
            }));
            setProducts(mappedProducts);
            setProductOptions([]);
            setOpenProductSearch(false);
            setProductFiles([]);
            setAdditionalFiles([]);
            setExistingAdditionalDataURIs([]);
            setExistingAdditionalFilenames([]);
            setExtractionModel(data.llm_model || "");
            setExtractedCategories(data.product_categories || []);
            setAIFiles([]);
            setShow(true);
            // Auto-find or create customer (will update selectedCustomers with DB record).
            // When company is present use it as the primary name; individual name becomes contact_person.
            {
                const custName = data.customer_company || data.customer_name || "";
                const custContact = data.customer_company
                    ? (data.customer_contact_person || data.customer_name || "")
                    : (data.customer_contact_person || "");
                autoCreateOrFindCustomer(
                    custName, data.customer_phone,
                    data.customer_email, data.customer_company, custContact, data.customer_city || ""
                );
            }
            if (mappedProducts.some(p => p.name)) {
                autoSyncProducts(mappedProducts, mappedProducts.length);
            }
        },
    }));

    // ── Customer helpers ─────────────────────────────────────────────────────
    const customerFilter = useCallback((opt, q) => {
        const norm = s => s?.toLowerCase().replace(/\s+/g, " ").trim() || "";
        const words = norm(q).split(" ");
        const fields = [opt.code, opt.vat_no, opt.name, opt.name_in_arabic,
            opt.phone, opt.phone2, opt.email, opt.search_label,
            ...(Array.isArray(opt.additional_keywords) ? opt.additional_keywords : [])];
        const s = norm(fields.join(" "));
        const c = fields.join(" ").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ").trim();
        return words.every(w => {
            const wc = w.replace(/[^\p{L}\p{N}]/gu, "");
            return s.includes(w) || (wc && c.includes(wc));
        });
    }, []);

    async function suggestCustomers(term) {
        setCustomerOptions([]);
        term = term.replace(/\s+/g, " ").trim();
        if (!term) { setTimeout(() => setOpenCustomerSearch(false), 300); return; }
        const storeId = localStorage.getItem("store_id");
        const params = { query: term };
        if (storeId) params.store_id = storeId;
        let qs = ObjectToSearchQueryParams(params);
        if (qs) qs = "&" + qs;
        const headers = { "Content-Type": "application/json", Authorization: localStorage.getItem("access_token") };
        const select = "select=id,code,credit_limit,credit_balance,additional_keywords,vat_no,name,phone,phone2,email,name_in_arabic,phone_in_arabic,search_label,stores";
        const res = await fetch(`/v1/customer?limit=100&${select}${qs}`, { headers });
        const data = await res.json();
        if (!data.result?.length) { setOpenCustomerSearch(false); return; }
        const filtered = data.result.filter(o => customerFilter(o, term));
        const phrase = term.toLowerCase();
        const sorted = filtered.sort((a, b) => {
            const as = [a.code, a.name, a.phone].join(" ").toLowerCase();
            const bs = [b.code, b.name, b.phone].join(" ").toLowerCase();
            const ai = as.indexOf(phrase), bi = bs.indexOf(phrase);
            if (ai === 0 && bi !== 0) return -1;
            if (bi === 0 && ai !== 0) return 1;
            if (ai !== -1 && bi === -1) return -1;
            if (bi !== -1 && ai === -1) return 1;
            return 0;
        });
        setCustomerOptions(sorted);
        setOpenCustomerSearch(sorted.length > 0);
    }

    function selectCustomer(c) {
        setSelectedCustomers([c]);
        setForm(f => ({
            ...f,
            customer_id:   c.id || "",
            customer_name: c.name || "",
        }));
        setOpenCustomerSearch(false);
    }

    function clearCustomer() {
        setSelectedCustomers([]);
        setForm(f => ({ ...f, customer_id: "", customer_name: "" }));
        customerRef.current?.clear();
        setOpenCustomerSearch(false);
    }

    // ── Product helpers ──────────────────────────────────────────────────────
    const productFilter = useCallback((opt, q) => {
        const norm = s => s?.toLowerCase().replace(/\s+/g, " ").trim() || "";
        const words = norm(q).split(" ");
        const pfx = opt.prefix_part_number || "";
        const pno = opt.part_number || "";
        const pl  = pfx && pno ? `${pfx}-${pno}` : pfx || pno;
        const fields = [pl, pfx, pno, opt.name, opt.name_in_arabic,
            opt.country_name, opt.brand_name, opt.search_label, opt.item_code,
            ...(Array.isArray(opt.additional_keywords) ? opt.additional_keywords : [])];
        const s  = norm(fields.join(" "));
        const cp = fields.join(" ").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ").trim();
        if (words.every(w => {
            const wc = w.replace(/[^\p{L}\p{N}]/gu, "");
            return s.includes(w) || (wc && !/^[^\p{L}\p{N}]/u.test(w) && cp.includes(wc));
        })) return true;
        const qns = q.replace(/\s+/g, "");
        return qns.length >= 2 && s.replace(/\s+/g, "").includes(qns);
    }, []);

    const suggestProducts = useCallback(async (term, page = 1) => {
        const reqId = Date.now();
        if (page === 1) {
            latestReqRef.current = reqId; loadMoreReqRef.current = 0;
            setProductOptions([]); productTermRef.current = term;
        } else {
            loadMoreReqRef.current = reqId;
        }
        term = term.replace(/\s+/g, " ").trim();
        if (!term) { setTimeout(() => setOpenProductSearch(false), 300); return; }

        const apiTerm = term
            .replace(/([a-zA-Z؀-ۿ]{2,})(\d{2,})/g, "$1 $2")
            .replace(/(\d{2,})([a-zA-Z؀-ۿ]{2,})/g, "$1 $2")
            .split(/\s+/).map(w => w.replace(/^-+/, "")).filter(Boolean).join(" ");

        const storeId = localStorage.getItem("store_id");
        const params = { search_text: apiTerm || term };
        if (storeId) params.store_id = storeId;
        let qs = ObjectToSearchQueryParams(params);
        if (qs) qs = "&" + qs;
        const headers = { "Content-Type": "application/json", Authorization: localStorage.getItem("access_token") };
        const select = "select=id,allow_duplicates,additional_keywords,search_label,item_code,prefix_part_number,country_name,brand_name,part_number,name,unit,name_in_arabic,is_service";
        const res = await fetch(`/v1/product?${select}${qs}&limit=100&page=${page}&sort=-country_name`, { headers });
        const data = await res.json();

        if (page === 1 && latestReqRef.current !== reqId) return;
        if (page > 1 && loadMoreReqRef.current !== reqId) return;
        const list = data.result || [];
        if (page === 1 && !list.length) { setOpenProductSearch(false); return; }
        const filtered = page === 1 ? list.filter(o => productFilter(o, term)) : list;
        if (page === 1) setProductOptions(filtered); else setProductOptions(prev => [...prev, ...filtered]);
        setOpenProductSearch(true);
        setProductSearchTotal(data.total_count || 0);
        setProductSearchPage(page);
    }, [productFilter]);

    const loadMoreProducts = useCallback(async () => {
        setLoadingMore(true);
        await suggestProducts(productTermRef.current, productSearchPage + 1);
        setLoadingMore(false);
    }, [suggestProducts, productSearchPage]);

    function isProductAdded(id) { return products.some(p => p.product_id === id); }

    // Product form stores "Piece" as empty string; resolve to display code for RFQ.
    const resolveUnit = (u) => (u === "" || u == null) ? "PCE" : u;

    function addProduct(product) {
        const id = product.id;
        const partLabel = product.prefix_part_number && product.part_number
            ? `${product.prefix_part_number}-${product.part_number}` : product.part_number || "";
        const idx = products.findIndex(p => p.product_id === id);
        if (idx !== -1 && !product.allow_duplicates) {
            setProducts(prev => prev.map((p, i) => i === idx ? { ...p, quantity: parseFloat(p.quantity || 0) + 1 } : p));
        } else {
            setProducts(prev => [...prev, {
                product_id: id,
                part_no:    partLabel,
                name:       product.name || "",
                quantity:   1,
                unit:       resolveUnit(product.unit),
                notes:      "",
                is_service: product.is_service || false,
            }]);
        }
    }

    function removeProduct(product) {
        const id = product.id || product.product_id;
        setProducts(prev => {
            const idx = prev.findIndex(p => p.product_id === id);
            if (idx === -1) return prev;
            return prev.filter((_, i) => i !== idx);
        });
    }

    function removeProductRow(idx) { setProducts(prev => prev.filter((_, i) => i !== idx)); }
    function updateProductField(idx, field, value) {
        setProducts(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
    }

    // Called after product is edited in the ProductCreate form
    function refreshEditedProduct() {
        const id = lastEditedProductId.current;
        if (!id) return;
        const storeId = localStorage.getItem("store_id");
        fetch(`/v1/product/${id}?select=id,item_code,part_number,prefix_part_number,name,name_in_arabic,unit,product_stores.${storeId}`, {
            headers: { Authorization: localStorage.getItem("access_token") },
        }).then(r => r.json()).then(data => {
            if (!data.result) return;
            const p = data.result;
            const partLabel = p.prefix_part_number && p.part_number
                ? `${p.prefix_part_number}-${p.part_number}` : p.part_number || "";
            setProducts(prev => prev.map(row =>
                row.product_id === id
                    ? { ...row, part_no: partLabel || row.part_no, name: p.name || row.name, unit: resolveUnit(p.unit) || row.unit }
                    : row
            ));
        }).catch(() => {});
    }

    // ── File drag & drop — Products section ──────────────────────────────────
    // Excel files → LLM extract → products table; other files → stored as-is

    const extractExcelText = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const wb = XLSX.read(new Uint8Array(e.target.result), { type: "array" });
                const parts = wb.SheetNames.map(name => {
                    const csv = XLSX.utils.sheet_to_csv(wb.Sheets[name], { skipHidden: true });
                    return `=== Sheet: ${name} ===\n${csv}`;
                });
                resolve(parts.join("\n\n"));
            } catch (err) { reject(err); }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });

    // eslint-disable-next-line no-unused-vars
    const extractFromExcel = async (files) => {
        setExtracting(true);
        try {
            const texts = [];
            for (const file of files) {
                const text = await extractExcelText(file).catch(() => null);
                if (text) texts.push(`=== ${file.name} ===\n${text}`);
            }
            if (!texts.length) { showToastMessage && showToastMessage("Could not read Excel file", "danger"); return; }
            const storeId = localStorage.getItem("store_id");
            const token   = localStorage.getItem("access_token");
            const fd = new FormData();
            fd.append("text_content", texts.join("\n\n").slice(0, 12000));
            const resp = await fetch(`/v1/rfq-received/extract?store_id=${storeId}`, {
                method: "POST", headers: { Authorization: token }, body: fd,
            });
            const data = await resp.json();
            if (!resp.ok || data.error) { showToastMessage && showToastMessage(data.error || "Excel extraction failed", "danger"); return; }
            if (Array.isArray(data.products) && data.products.length > 0) {
                const extracted = data.products.map(p => ({
                    product_id: "", part_no: p.part_no || "", name: p.name || "",
                    quantity: p.quantity || 1, unit: p.unit || "PCE",
                }));
                setProducts(extracted);
                await autoSyncProducts(extracted);
            }
            if (data.llm_model) setExtractionModel(data.llm_model);
            showToastMessage && showToastMessage("Products extracted from Excel — review and adjust.", "success");
        } catch (err) {
            showToastMessage && showToastMessage("Excel extraction error: " + err.message, "danger");
        } finally { setExtracting(false); }
    };

    const addProductFiles = (incoming) => {
        const allowed = Array.from(incoming).filter(f => {
            const ext = f.name.split(".").pop().toLowerCase();
            return ["jpg","jpeg","png","gif","webp","pdf","xlsx","xls","csv"].includes(ext);
        });
        if (!allowed.length) return;
        setProductFiles(prev => {
            const seen = new Set(prev.map(f => f.name + f.size));
            return [...prev, ...allowed.filter(f => !seen.has(f.name + f.size))];
        });
    };

    const onProductDragOver  = e => { e.preventDefault(); setIsDragOverProduct(true); };
    const onProductDragLeave = e => { if (!productDropZoneRef.current?.contains(e.relatedTarget)) setIsDragOverProduct(false); };
    const onProductDrop      = e => { e.preventDefault(); setIsDragOverProduct(false); addProductFiles(e.dataTransfer.files); };
    const removeProductFile  = i => setProductFiles(prev => prev.filter((_, idx) => idx !== i));

    // ── File drag & drop — Additional Details section ─────────────────────────
    const addAdditionalFiles = (incoming) => {
        const ok = Array.from(incoming).filter(f => {
            const ext = f.name.split(".").pop().toLowerCase();
            return ["jpg","jpeg","png","gif","webp","pdf","xlsx","xls","csv","txt"].includes(ext);
        });
        if (!ok.length) return;
        setAdditionalFiles(prev => {
            const seen = new Set(prev.map(f => f.name + f.size));
            return [...prev, ...ok.filter(f => !seen.has(f.name + f.size))];
        });
    };

    const onAdditionalDragOver  = e => { e.preventDefault(); setIsDragOverAdditional(true); };
    const onAdditionalDragLeave = e => { if (!additionalDropZoneRef.current?.contains(e.relatedTarget)) setIsDragOverAdditional(false); };
    const onAdditionalDrop      = e => { e.preventDefault(); setIsDragOverAdditional(false); addAdditionalFiles(e.dataTransfer.files); };
    const removeAdditionalFile  = i => setAdditionalFiles(prev => prev.filter((_, idx) => idx !== i));

    // ── Core product DB sync (pure helper, no state side-effects) ───────────
    // For each product: find by part_no → find by name → create new.
    // Returns same-length array as input with product_ids filled in (never drops products).
    // Caches part_no lookups to avoid redundant API calls for duplicate part_nos.
    const syncProductListToDB = async (productList, storeId, token, showErr, onProgress) => {
        const headers = { Authorization: token };
        // Cache: part_no → Promise<found product | null>
        // Storing promises (not results) prevents duplicate concurrent lookups for the same part_no
        const partNoPromiseCache = new Map();
        const total = productList.length;
        let done = 0;

        // Semaphore: max 5 concurrent products processed at once
        let active = 0;
        const waiters = [];
        const acquire = () => new Promise(res => {
            if (active < 5) { active++; res(); } else waiters.push(res);
        });
        const release = () => {
            if (waiters.length) { waiters.shift()(); } else active--;
        };

        return Promise.all(productList.map(async (ep) => {
            const base = { part_no: ep.part_no || "", name: ep.name || "", quantity: ep.quantity || 1, unit: ep.unit || "", notes: ep.notes || "" };
            if (ep.product_id) {
                done++; onProgress && onProgress(done, total);
                return { ...base, product_id: ep.product_id };
            }
            if (!ep.name || !ep.name.trim()) {
                done++; onProgress && onProgress(done, total);
                return { ...base, product_id: "" };
            }

            await acquire();
            try {
                let found = null;
                const partNoKey = ep.part_no?.trim() || "";
                // 1. Search by part_no (cache promise to avoid concurrent duplicate lookups)
                if (partNoKey) {
                    if (!partNoPromiseCache.has(partNoKey)) {
                        partNoPromiseCache.set(partNoKey, (async () => {
                            try {
                                const qs = new URLSearchParams({ 'search[part_number]': partNoKey, 'search[store_id]': storeId, limit: 1 });
                                const r = await fetch(`/v1/product?${qs}`, { headers });
                                const d = await r.json();
                                return (d.result && d.result.length > 0) ? d.result[0] : null;
                            } catch (_) { return null; }
                        })());
                    }
                    found = await partNoPromiseCache.get(partNoKey);
                }
                // 2. Search by name only when no part_no was supplied.
                // If a part_no was given but not found, skip to avoid matching a different product.
                if (!found && !partNoKey) {
                    try {
                        const qs = new URLSearchParams({ 'search[name]': ep.name.trim(), 'search[store_id]': storeId, limit: 5 });
                        const r = await fetch(`/v1/product?${qs}`, { headers });
                        const d = await r.json();
                        if (d.result && d.result.length > 0)
                            found = d.result.find(p => p.name && p.name.trim().toLowerCase() === ep.name.trim().toLowerCase()) || null;
                    } catch (_) {}
                }
                // 3. Create new product
                if (!found) {
                    try {
                        const body = { name: ep.name.trim() };
                        if (partNoKey) body.part_number = partNoKey;
                        if (ep.unit && ep.unit.trim()) body.unit = ep.unit.trim();
                        const r = await fetch(`/v1/product?search[store_id]=${storeId}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', Authorization: token },
                            body: JSON.stringify(body),
                        });
                        const d = await r.json();
                        if (r.ok && d.result && d.result.id) {
                            found = d.result;
                            if (partNoKey) partNoPromiseCache.set(partNoKey, Promise.resolve(found));
                        } else {
                            const errMsg = Object.values(d.errors || {}).join('; ') || JSON.stringify(d);
                            console.error('Product create failed:', d.errors || d);
                            showErr && showErr(`Failed to create product "${ep.name}": ${errMsg}`);
                        }
                    } catch (e) {
                        console.error('Product create exception:', e);
                        showErr && showErr(`Error creating product "${ep.name}": ${e.message}`);
                    }
                }

                done++; onProgress && onProgress(done, total);
                return {
                    ...base,
                    product_id: found?.id || "",
                    name:    found?.name        || base.name,
                    part_no: found?.part_number || found?.part_no || base.part_no,
                    unit:    found ? resolveUnit(found.unit) : (base.unit || "PCE"),
                };
            } finally {
                release();
            }
        }));
    };

    // ── Auto-create or find customer from extracted data ─────────────────────
    const autoCreateOrFindCustomer = useCallback(async (name, phone, email, company, contactPerson, cityName) => {
        if (!name && !phone) return;
        const storeId = localStorage.getItem("store_id");
        const token   = localStorage.getItem("access_token");
        try {
            const res = await fetch(`/v1/customer/find-or-create?store_id=${storeId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: token },
                body: JSON.stringify({ name: name?.trim(), phone: phone?.trim(), email: email?.trim(), company: company?.trim(), contact_person: contactPerson?.trim(), city_name: cityName?.trim() || undefined }),
            });
            const d = await res.json();
            if (res.ok && d.result?.id) {
                const c = d.result;
                setSelectedCustomers([{ ...c, search_label: c.name }]);
                setForm(f => ({ ...f, customer_id: c.id, customer_name: c.name || name }));
                if (d.created) {
                    showToastMessage && showToastMessage(`Customer "${c.name}" created`, "success");
                }
            } else {
                showToastMessage && showToastMessage(`Could not find/create customer: ${JSON.stringify(d.error || d)}`, "danger");
            }
        } catch (e) {
            showToastMessage && showToastMessage("Customer error: " + e.message, "danger");
        }
    }, [showToastMessage]);

    // ── Auto-create/link products (called from Extract button, edit mode) ────
    const autoSyncProducts = useCallback(async (productList, expectedCount) => {
        const storeId = localStorage.getItem("store_id");
        const token   = localStorage.getItem("access_token");
        setSyncingProducts(true);
        setSyncProgress({ done: 0, total: productList.length });
        const before = productList.filter(p => p.product_id).length;
        const synced = await syncProductListToDB(
            productList, storeId, token,
            msg => showToastMessage && showToastMessage(msg, "danger"),
            (done, total) => setSyncProgress({ done, total }),
        );
        setSyncingProducts(false);
        setSyncProgress({ done: 0, total: 0 });
        // Update products in-place by index so that all originally extracted rows are preserved.
        // syncProductListToDB may return fewer rows when it deduplicates by product_id;
        // we keep the full extracted list and just fill in product_id where found.
        setProducts(prev => {
            const base = (prev && prev.length > 0) ? prev : productList;
            return base.map((p, i) => ({
                ...p,
                product_id: synced[i]?.product_id || p.product_id || "",
                name:       synced[i]?.name || p.name,
                part_no:    synced[i]?.part_no || p.part_no || "",
                unit:       synced[i]?.unit || p.unit || "",
            }));
        });
        const created = synced.filter(p => p.product_id).length - before;
        const msgs = [];
        if (created > 0) msgs.push(`${created} new product${created > 1 ? "s" : ""} created`);
        if (msgs.length > 0 && showToastMessage) showToastMessage("Products synced — " + msgs.join(", "), "success");
    }, [showToastMessage]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── LLM extraction from text only ────────────────────────────────────────
    const handleExtractFromText = async () => {
        const text = form.text_content.trim();
        if (!text) return;
        const storeId = localStorage.getItem("store_id");
        const token   = localStorage.getItem("access_token");
        setExtracting(true);
        try {
            const fd = new FormData();
            fd.append("text_content", text);
            if (textProvider) fd.append("llm_provider", textProvider);
            if (textModel)    fd.append("llm_model", textModel);
            const resp = await fetch(`/v1/rfq-received/extract?store_id=${storeId}`, {
                method: "POST", headers: { Authorization: token }, body: fd,
            });
            const data = await resp.json();
            if (!resp.ok || data.error) {
                showToastMessage && showToastMessage(data.error || "Extraction failed", "danger");
                return;
            }
            if (data.customer_name) {
                setSelectedCustomers([{ id: "", search_label: data.customer_name, name: data.customer_name, phone: data.customer_phone || "" }]);
                setForm(f => ({ ...f, customer_id: "", customer_name: data.customer_name }));
            }
            if (Array.isArray(data.products) && data.products.length > 0) {
                const extracted = data.products.map(p => ({
                    product_id: "", part_no: p.part_no || "", name: p.name || "",
                    quantity: p.quantity || 1, unit: p.unit || "PCE",
                }));
                setProducts(extracted);
                await autoSyncProducts(extracted);
            }
            if (data.llm_model) setExtractionModel(data.llm_model);
            showToastMessage && showToastMessage("Products extracted from text — review and adjust.", "success");
        } catch (err) {
            showToastMessage && showToastMessage("Network error: " + err.message, "danger");
        } finally {
            setExtracting(false);
        }
    };

    // ── AI File Extraction section handlers ───────────────────────────────────
    const addAIFiles = (incoming) => {
        const allowed = Array.from(incoming).filter(f => {
            const ext = f.name.split(".").pop().toLowerCase();
            return ["jpg","jpeg","png","gif","webp","pdf","xlsx","xls","csv","txt"].includes(ext);
        });
        if (!allowed.length) return;
        setAIFiles(prev => {
            const seen = new Set(prev.map(f => f.name + f.size));
            return [...prev, ...allowed.filter(f => !seen.has(f.name + f.size))];
        });
    };
    const onAIDragOver  = e => { e.preventDefault(); setIsDragOverAI(true); };
    const onAIDragLeave = e => { if (!aiDropZoneRef.current?.contains(e.relatedTarget)) setIsDragOverAI(false); };
    const onAIDrop      = e => { e.preventDefault(); setIsDragOverAI(false); addAIFiles(e.dataTransfer.files); };
    const removeAIFile  = i => setAIFiles(prev => prev.filter((_, idx) => idx !== i));

    const handleAIExtract = async () => {
        if (!aiFiles.length) { showToastMessage && showToastMessage("Please upload at least one file for AI extraction.", "danger"); return; }
        const storeId = localStorage.getItem("store_id");
        const token   = localStorage.getItem("access_token");
        setAIExtracting(true);
        try {
            const fd = new FormData();
            fd.append("llm_provider", aiProvider);
            fd.append("llm_model", aiModel);
            aiFiles.forEach(f => fd.append("files", f));
            const resp = await fetch(`/v1/rfq-received/extract?store_id=${storeId}`, {
                method: "POST", headers: { Authorization: token }, body: fd,
            });
            const data = await resp.json();
            if (!resp.ok || data.error) { showToastMessage && showToastMessage(data.error || "AI extraction failed", "danger"); return; }
            if (data.customer_name) {
                setSelectedCustomers([{ id: "", search_label: data.customer_name, name: data.customer_name, phone: data.customer_phone || "" }]);
                setForm(f => ({ ...f, customer_id: "", customer_name: data.customer_name }));
            }
            if (Array.isArray(data.products) && data.products.length > 0) {
                const extracted = data.products.map(p => ({
                    product_id: "", part_no: p.part_no || "", name: p.name || "",
                    quantity: p.quantity || 1, unit: p.unit || "PCE",
                }));
                setProducts(extracted);
                await autoSyncProducts(extracted);
            }
            if (data.llm_model) setExtractionModel(data.llm_model);
            showToastMessage && showToastMessage("Products extracted — review and adjust.", "success");
        } catch (err) {
            showToastMessage && showToastMessage("AI extraction error: " + err.message, "danger");
        } finally { setAIExtracting(false); }
    };

    // Convert File objects to base64 data URIs
    const filesToDataURIs = async (files) => {
        return Promise.all(files.map(file => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        })));
    };

    // ── Submit ───────────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        const storeId = localStorage.getItem("store_id");
        const token   = localStorage.getItem("access_token");

        let currentProducts = [...products];
        let currentForm     = form;

        // Validate: need product-files, products, or text
        const errs = {};
        const hasProducts     = currentProducts.some(p => p.name && p.name.trim() !== "");
        const hasProductFiles = productFiles.length > 0;
        if (!hasProducts && !hasProductFiles && !currentForm.text_content.trim()) {
            errs.text_content = "Add products, upload a file, or enter a description.";
        }
        setErrors(errs);
        if (Object.keys(errs).length > 0) return;

        setSaving(true);

        // Convert both file arrays to base64 data URIs
        let attachmentDataURIs = [];
        let additionalAttachmentDataURIs = [];
        let additionalAttachmentFilenames = [...existingAdditionalFilenames];
        if (hasProductFiles) {
            try { attachmentDataURIs = await filesToDataURIs(productFiles); } catch (e) { console.error('File encode error:', e); }
        }
        if (additionalFiles.length > 0) {
            try { additionalAttachmentDataURIs = await filesToDataURIs(additionalFiles); } catch (e) { console.error('Additional file encode error:', e); }
            additionalAttachmentFilenames = [...existingAdditionalFilenames, ...additionalFiles.map(f => f.name)];
        }
        // Prepend any existing (already-saved) data URIs so they are preserved on update
        additionalAttachmentDataURIs = [...existingAdditionalDataURIs, ...additionalAttachmentDataURIs];

        // Sync products to DB if no product-files are attached (files replace products table)
        if (!hasProductFiles) {
            const needsSync = currentProducts.some(p => p.name && p.name.trim() && !p.product_id);
            if (needsSync) {
                showToastMessage && showToastMessage(`Saving ${currentProducts.filter(p => p.name && p.name.trim() && !p.product_id).length} product(s) to DB…`, "info");
                try {
                    setSyncingProducts(true);
                    setSyncProgress({ done: 0, total: currentProducts.length });
                    currentProducts = await syncProductListToDB(
                        currentProducts, storeId, token,
                        msg => showToastMessage && showToastMessage(msg, "danger"),
                        (done, total) => setSyncProgress({ done, total }),
                    );
                    setSyncingProducts(false);
                    setSyncProgress({ done: 0, total: 0 });
                    setProducts(currentProducts);
                    const created = currentProducts.filter(p => p.product_id).length;
                    showToastMessage && showToastMessage(`${created} product(s) saved to DB ✓`, "success");
                } catch (e) {
                    setSyncingProducts(false);
                    console.error('Pre-save sync error:', e);
                    showToastMessage && showToastMessage("Product sync error: " + e.message, "danger");
                }
            }
        }

        try {
            const customerName = currentForm.customer_name || (selectedCustomers[0]?.name) || "UNKNOWN";
            const payload = {
                customer_id:           currentForm.customer_id || undefined,
                customer_name:         customerName,
                customer_phone:        currentForm.customer_phone || selectedCustomers[0]?.phone || "",
                customer_email:        currentForm.customer_email || selectedCustomers[0]?.email || "",
                customer_company:      selectedCustomers[0]?.company || "",
                customer_city:         currentForm.customer_city || undefined,
                customer_rfq_id:       currentForm.customer_rfq_id || undefined,
                text_content:          currentForm.text_content,
                extraction_model:      extractionModel || undefined,
                product_categories:    extractedCategories.length > 0 ? extractedCategories : undefined,
                attachment_data_uris:             attachmentDataURIs.length > 0 ? attachmentDataURIs : undefined,
                additional_attachment_data_uris: additionalAttachmentDataURIs.length > 0 ? additionalAttachmentDataURIs : (editId ? [] : undefined),
                additional_attachment_filenames: additionalAttachmentFilenames.length > 0 ? additionalAttachmentFilenames : (editId ? [] : undefined),
                // When product-files are uploaded, skip products table — files shown in preview instead
                general_instructions:      currentForm.general_instructions || undefined,
                procurement_message_id:    sourceMsgId || undefined,
                procurement_message_code:  sourceMsgCode || undefined,
                products: hasProductFiles ? [] : currentProducts.map(p => ({
                    product_id: p.product_id || undefined,
                    part_no:    p.part_no,
                    name:       p.name,
                    quantity:   parseFloat(p.quantity) || 1,
                    unit:       p.unit,
                    notes:      p.notes || undefined,
                })),
            };
            const url = editId
                ? `/v1/rfq-received/${editId}?store_id=${storeId}`
                : `/v1/rfq-received?store_id=${storeId}`;
            const resp = await fetch(url, {
                method: editId ? "PUT" : "POST",
                headers: { "Content-Type": "application/json", Authorization: token },
                body: JSON.stringify(payload),
            });
            const data = await resp.json();
            if (!resp.ok || data.error) {
                showToastMessage && showToastMessage(data.error || (editId ? "Failed to update RFQ" : "Failed to create RFQ"), "danger");
                return;
            }
            showToastMessage && showToastMessage(editId ? "RFQ updated" : `RFQ created: ${data.code || data.id}`, "success");
            setShow(false);
            onCreated && onCreated(editId ? null : data);
        } catch (err) {
            console.error("RFQ create error:", err);
            showToastMessage && showToastMessage(err.message, "danger");
        } finally {
            setSaving(false);
        }
    };

    // ── Render ───────────────────────────────────────────────────────────────
    const cust = selectedCustomers[0];

    return (
        <>
        <Modal show={show} onHide={() => setShow(false)} size="xl" fullscreen centered scrollable backdrop="static" animation={false} className="rfq-create-form-modal">
            <Modal.Header closeButton style={{ padding: "10px 16px" }}>
                <Modal.Title style={{ fontSize: "15px", fontWeight: 600, display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <span>
                        <i className={`bi ${editId ? "bi-pencil-square" : "bi-file-earmark-plus"} me-2 text-primary`}></i>
                        {editId ? "Edit RFQ" : "New RFQ"}
                        {editId && editRfqCode && (
                            <span style={{ marginLeft: '8px', fontSize: '13px', fontWeight: 700, color: '#0d6efd', background: '#e8f0fe', borderRadius: '6px', padding: '2px 8px' }}>{editRfqCode}</span>
                        )}
                    </span>
                    {(() => {
                        const code = sourceMsgCode || editLinkedMsgCode;
                        const msgId = sourceMsgId || editLinkedMsgId;
                        if (!code) return null;
                        const isWA = (code || '').startsWith('WA-');
                        return (
                            <span
                                role="button"
                                tabIndex={0}
                                style={{ fontSize: '12px', fontWeight: 500, color: isWA ? '#128C7E' : '#6c757d', background: isWA ? '#e8f5e9' : '#f1f3f5', border: `1px solid ${isWA ? '#a5d6a7' : '#dee2e6'}`, borderRadius: '6px', padding: '2px 10px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                                title={isWA ? 'Open linked WhatsApp message' : 'Open linked email'}
                                onClick={async () => {
                                    if (editLinkedMsgObj) { setShowLinkedEmail(true); return; }
                                    if (!msgId) return;
                                    const _storeId = localStorage.getItem('store_id');
                                    const _token = localStorage.getItem('access_token');
                                    try {
                                        const res = await fetch(`/v1/procurement-messages/${msgId}?store_id=${_storeId}`, { headers: { Authorization: _token } });
                                        const data = await res.json();
                                        if (data && data.id) { setEditLinkedMsgObj(data); setShowLinkedEmail(true); }
                                    } catch (_) {}
                                }}
                                onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.click(); }}
                            >
                                <i className={`bi ${isWA ? 'bi-whatsapp' : 'bi-envelope'}`} style={{ fontSize: '11px' }}></i>
                                {code}
                            </span>
                        );
                    })()}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body style={{ padding: "12px 16px" }}>

                {errors.text_content && (
                    <div className="alert alert-danger py-2 mb-3" style={{ fontSize: "13px" }}>
                        <i className="bi bi-exclamation-triangle me-2"></i>
                        {errors.text_content}
                    </div>
                )}

                {/* ── Customer row ─────────────────────────────────────────── */}
                <div className="mb-3" style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: "12px", alignItems: "start" }}>
                    {/* Customer search */}
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                            <label className="form-label mb-0">Customer</label>
                            {form.customer_id && (
                                <button type="button" className="btn btn-default btn-sm"
                                    onClick={() => CustomerUpdateRef.current?.open(form.customer_id)}>
                                    <i className="bi bi-pencil"></i>
                                </button>
                            )}
                        </div>
                        <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                            <div style={{ flex: 1 }}>
                                <Typeahead
                                    id="rfq-customer-search"
                                    filterBy={() => true}
                                    labelKey="search_label"
                                    open={openCustomerSearch}
                                    emptyLabel=""
                                    clearButton={false}
                                    ref={customerRef}
                                    options={customerOptions}
                                    selected={selectedCustomers}
                                    highlightOnlyResult={true}
                                    placeholder="Customer Name / Mob / VAT # / ID"
                                    onInputChange={(term) => {
                                        if (timerRef.current) clearTimeout(timerRef.current);
                                        timerRef.current = setTimeout(() => suggestCustomers(term), 350);
                                    }}
                                    onChange={(items) => {
                                        if (!items.length) { clearCustomer(); return; }
                                        selectCustomer(items[0]);
                                    }}
                                    onKeyDown={e => {
                                        if (e.key === "Escape") { clearCustomer(); }
                                    }}
                                    renderMenu={(results, menuProps, state) => {
                                        const words = state.text.toLowerCase().split(" ").filter(Boolean);
                                        return (
                                            <Menu {...menuProps} style={{ ...(menuProps.style || {}), width: "700px", maxWidth: "95vw", zIndex: 9999 }}>
                                                <MenuItem disabled style={{ padding: 0 }}>
                                                    <div style={{ display: "flex", fontWeight: 700, padding: "4px 8px", background: "#f8f9fa", borderBottom: "1px solid #e2e8f0" }}>
                                                        <div style={{ width: "12%" }}>Code</div>
                                                        <div style={{ width: "38%" }}>Name</div>
                                                        <div style={{ width: "20%" }}>Phone</div>
                                                        <div style={{ width: "18%" }}>VAT No.</div>
                                                        <div style={{ width: "12%", textAlign: "right" }}>Balance</div>
                                                    </div>
                                                </MenuItem>
                                                {results.map((opt, i) => {
                                                    const active = state.activeIndex === i || results.length === 1;
                                                    return (
                                                        <MenuItem option={opt} position={i} key={i} style={{ padding: 0 }}>
                                                            <div style={{ display: "flex", padding: "5px 8px", background: active ? "#e8f0fe" : "transparent", alignItems: "center" }}>
                                                                <div style={{ width: "12%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                                    <span style={{ fontWeight: active ? 600 : 400 }}>{highlightWords(opt.code, words, active)}</span>
                                                                </div>
                                                                <div style={{ width: "38%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                                    <span style={{ fontWeight: active ? 600 : 400 }}>{highlightWords(opt.name + (opt.name_in_arabic ? " — " + opt.name_in_arabic : ""), words, active)}</span>
                                                                </div>
                                                                <div style={{ width: "20%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                                    <span style={{ fontWeight: active ? 600 : 400 }}>{highlightWords(opt.phone || "–", words, active)}</span>
                                                                </div>
                                                                <div style={{ width: "18%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                                    <span style={{ fontWeight: active ? 600 : 400 }}>{highlightWords(opt.vat_no || "–", words, active)}</span>
                                                                </div>
                                                                <div style={{ width: "12%", textAlign: "right", fontWeight: active ? 600 : 400, color: opt.credit_balance > 0 ? "#dc2626" : opt.credit_balance < 0 ? "#2563eb" : undefined }}>
                                                                    {opt.credit_balance != null ? opt.credit_balance : "–"}
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
                            <button type="button" className="btn btn-outline-secondary btn-sm"
                                onClick={() => CustomerCreateRef.current?.open()}>
                                <i className="bi bi-plus-lg"></i> New
                            </button>
                        </div>
                    </div>

                    {/* Selected customer details */}
                    <div style={{ alignSelf: "stretch" }}>
                        {cust ? (
                            <div style={{ padding: "10px 14px", background: "rgba(0,74,198,0.04)", border: "1px solid #c7d7f5", borderRadius: "8px", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", gap: "5px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                    {cust.code && <span style={{ background: "#dbeafe", color: "#1e40af", borderRadius: "4px", padding: "1px 7px", fontSize: "11px", fontWeight: 700 }}>{cust.code}</span>}
                                    <span style={{ fontWeight: 700, fontSize: "14px", color: "#191c1e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "240px" }}>{cust.name}</span>
                                    {cust.name_in_arabic && <span style={{ fontSize: "12px", color: "#64748b" }}>{cust.name_in_arabic}</span>}
                                </div>
                                {(cust.phone || cust.vat_no) && (
                                    <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                                        {cust.phone && <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "13px", color: "#374151" }}><i className="bi bi-telephone" style={{ color: "#6b7280", fontSize: "12px" }} />{cust.phone}</span>}
                                        {cust.phone2 && <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "13px", color: "#374151" }}><i className="bi bi-telephone" style={{ color: "#6b7280", fontSize: "12px" }} />{cust.phone2}</span>}
                                        {cust.vat_no && <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "13px", color: "#374151" }}><i className="bi bi-receipt" style={{ color: "#6b7280", fontSize: "12px" }} /><span style={{ color: "#6b7280" }}>VAT:</span> <strong>{cust.vat_no}</strong></span>}
                                    </div>
                                )}
                                {cust.credit_balance != null && (
                                    <div style={{ display: "flex", alignItems: "center", gap: "16px", borderTop: "1px solid #e2e8f0", paddingTop: "4px", marginTop: "2px" }}>
                                        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                                            <i className="bi bi-wallet2" style={{ color: "#004ac6", fontSize: "13px" }} />
                                            <span style={{ fontSize: "12px", color: "#6b7280", fontWeight: 500 }}>Cr. Balance:</span>
                                            <strong style={{ fontSize: "16px", fontWeight: 700, color: cust.credit_balance > 0 ? "#dc2626" : "#16a34a" }}>{cust.credit_balance}</strong>
                                        </span>
                                        {cust.credit_limit > 0 && (
                                            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                                                <i className="bi bi-shield-check" style={{ color: "#6b7280", fontSize: "13px" }} />
                                                <span style={{ fontSize: "12px", color: "#6b7280", fontWeight: 500 }}>Limit:</span>
                                                <strong style={{ fontSize: "14px", color: "#374151" }}>{cust.credit_limit}</strong>
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div style={{ padding: "10px 14px", background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: "8px", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <span style={{ fontSize: "13px", color: "#94a3b8" }}>
                                    <i className="bi bi-person me-2"></i>No customer selected — will be saved as <strong>UNKNOWN</strong>
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Customer RFQ ID / Email / Mobile ────────────────────── */}
                <div className="mb-3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", alignItems: "start" }}>
                    <div>
                        <label className="form-label mb-1" style={{ fontSize: "13px", fontWeight: 500 }}>
                            Customer RFQ ID
                            <span className="text-muted ms-1" style={{ fontSize: "11px", fontWeight: 400 }}>— from customer doc</span>
                        </label>
                        <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="e.g. PO-2025-001"
                            value={form.customer_rfq_id}
                            onChange={e => setForm(f => ({ ...f, customer_rfq_id: e.target.value }))}
                        />
                    </div>
                    <div>
                        <label className="form-label mb-1" style={{ fontSize: "13px", fontWeight: 500 }}>Customer Email</label>
                        <input
                            type="email"
                            className="form-control form-control-sm"
                            placeholder="customer@example.com"
                            value={form.customer_email}
                            onChange={e => setForm(f => ({ ...f, customer_email: e.target.value }))}
                        />
                    </div>
                    <div>
                        <label className="form-label mb-1" style={{ fontSize: "13px", fontWeight: 500 }}>Customer Mobile</label>
                        <input
                            type="tel"
                            className="form-control form-control-sm"
                            placeholder="+966 5x xxx xxxx"
                            value={form.customer_phone}
                            onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))}
                        />
                    </div>
                </div>

                {/* ── Product search ────────────────────────────────────────── */}
                <div className="mb-2">
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                        <label className="form-label mb-0">Products Required</label>
                        {syncingProducts && (
                            <span className="text-muted small d-flex align-items-center gap-1">
                                <Spinner animation="border" size="sm" />
                                Syncing products…
                                {syncProgress.total > 0 && (
                                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                                        {syncProgress.done}/{syncProgress.total}
                                        {' '}({Math.round(syncProgress.done / syncProgress.total * 100)}%)
                                    </span>
                                )}
                            </span>
                        )}
                        {openProductSearch && (
                            <Button variant="success" size="sm" style={{ marginLeft: "auto", marginRight: "4px" }}
                                onMouseDown={e => e.preventDefault()}
                                onClick={() => { setOpenProductSearch(false); productRef.current?.clear(); }}>
                                <i className="bi bi-check2 me-1"></i>Done
                            </Button>
                        )}
                        {!openProductSearch && (
                            <button type="button" className="btn btn-outline-secondary btn-sm ms-auto"
                                onClick={() => ProductCreateRef.current?.open()}>
                                <i className="bi bi-plus-lg"></i> New Product
                            </button>
                        )}
                    </div>
                    <Typeahead
                        id="rfq-product-search"
                        filterBy={() => true}
                        labelKey="search_label"
                        open={openProductSearch}
                        emptyLabel=""
                        clearButton={false}
                        ref={productRef}
                        options={productOptions}
                        selected={[]}
                        highlightOnlyResult={false}
                        placeholder="Part No. | Name | Brand | Country…"
                        onInputChange={(term) => {
                            const reqId = Date.now();
                            latestReqRef.current = reqId;
                            if (timerRef.current) clearTimeout(timerRef.current);
                            timerRef.current = setTimeout(() => {
                                if (latestReqRef.current !== reqId) return;
                                suggestProducts(term);
                            }, 350);
                        }}
                        onChange={() => {}} // controlled via checkboxes only
                        onKeyDown={e => {
                            if (e.key === "Escape") {
                                setProductOptions([]); setOpenProductSearch(false);
                                productRef.current?.clear();
                            }
                        }}
                        renderMenu={(results, menuProps, state) => {
                            const words = state.text.toLowerCase().split(" ").filter(Boolean);
                            return (
                                <Menu {...menuProps} style={{ ...(menuProps.style || {}), width: "95vw", maxWidth: "95vw", minWidth: "500px", zIndex: 9999 }}>
                                    <MenuItem disabled style={{ padding: 0 }}>
                                        <div style={{ display: "flex", fontWeight: 700, padding: "4px 8px", background: "#f8f9fa", borderBottom: "1px solid #e2e8f0" }}>
                                            <div style={{ width: "36px" }}></div>
                                            <div style={{ width: "18%" }}>Part No.</div>
                                            <div style={{ flex: 1 }}>Name</div>
                                            <div style={{ width: "16%" }}>Brand</div>
                                            <div style={{ width: "16%" }}>Country</div>
                                        </div>
                                    </MenuItem>
                                    {results.map((opt, i) => {
                                        const active = state.activeIndex === i;
                                        const partLabel = opt.prefix_part_number && opt.part_number
                                            ? `${opt.prefix_part_number}-${opt.part_number}` : opt.part_number || "";
                                        let checked = isProductAdded(opt.id);
                                        return (
                                            <MenuItem option={opt} position={i} key={opt.id || i} style={{ padding: 0 }}>
                                                <div style={{ display: "flex", padding: "5px 8px", background: active ? "#e8f0fe" : checked ? "#f0fdf4" : "transparent", alignItems: "center" }}>
                                                    {/* Checkbox — stops propagation so dropdown stays open */}
                                                    <div className="form-check"
                                                        style={{ width: "36px", margin: 0 }}
                                                        onClick={e => {
                                                            e.stopPropagation();
                                                            checked = !checked;
                                                            if (timerRef.current) clearTimeout(timerRef.current);
                                                            timerRef.current = setTimeout(() => {
                                                                if (checked) addProduct(opt); else removeProduct(opt);
                                                            }, 100);
                                                        }}>
                                                        <input className="form-check-input" type="checkbox"
                                                            checked={checked}
                                                            value={checked}
                                                            onClick={e => e.stopPropagation()}
                                                            onChange={e => {
                                                                e.preventDefault(); e.stopPropagation();
                                                                checked = !checked;
                                                                if (timerRef.current) clearTimeout(timerRef.current);
                                                                timerRef.current = setTimeout(() => {
                                                                    if (checked) addProduct(opt); else removeProduct(opt);
                                                                }, 100);
                                                            }} />
                                                    </div>
                                                    <div style={{ width: "18%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                        <span style={{ fontWeight: active ? 600 : 400 }}>{highlightWords(partLabel, words, active)}</span>
                                                    </div>
                                                    <div style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                        <span style={{ fontWeight: active ? 600 : 400 }}>
                                                            {highlightWords(opt.name + (opt.name_in_arabic ? " — " + opt.name_in_arabic : ""), words, active)}
                                                        </span>
                                                    </div>
                                                    <div style={{ width: "16%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#6b7280" }}>
                                                        {highlightWords(opt.brand_name || "–", words, active)}
                                                    </div>
                                                    <div style={{ width: "16%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#6b7280" }}>
                                                        {highlightWords(opt.country_name || "–", words, active)}
                                                    </div>
                                                </div>
                                            </MenuItem>
                                        );
                                    })}
                                    {results.length < productSearchTotal && (
                                        <MenuItem disabled style={{ padding: 0 }}>
                                            <div style={{ display: "flex", justifyContent: "center", padding: "6px", borderTop: "1px solid #e2e8f0", pointerEvents: "auto" }}
                                                onMouseDown={e => { e.preventDefault(); e.stopPropagation(); }}
                                                onClick={e => { e.preventDefault(); e.stopPropagation(); }}>
                                                <button type="button" className="btn btn-outline-secondary btn-sm"
                                                    disabled={loadingMore}
                                                    onMouseDown={e => { e.preventDefault(); e.stopPropagation(); }}
                                                    onClick={e => { e.preventDefault(); e.stopPropagation(); loadMoreProducts(); }}>
                                                    {loadingMore
                                                        ? <><span className="spinner-border spinner-border-sm me-1" />Loading…</>
                                                        : <>Load {productSearchTotal - results.length} more</>}
                                                </button>
                                            </div>
                                        </MenuItem>
                                    )}
                                </Menu>
                            );
                        }}
                    />
                </div>

                {/* ── Selected products table ───────────────────────────────── */}
                {products.length > 0 ? (
                    <table className="table table-sm table-bordered align-middle mb-3">
                        <thead className="table-light">
                            <tr>
                                <th style={{ width: "32px" }}>#</th>
                                <th style={{ width: "120px" }}>Part No.</th>
                                <th>Product Name</th>
                                <th style={{ width: "80px" }}>Qty</th>
                                <th style={{ width: "60px" }}>Unit</th>
                                <th>Notes <span className="text-muted fw-normal" style={{ fontSize: "11px" }}>(product-specific specs)</span></th>
                                <th style={{ width: "36px" }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map((p, i) => (
                                <tr key={i}>
                                    <td className="text-center text-muted" style={{ fontSize: "12px" }}>{i + 1}</td>
                                    <td><input type="text" className="form-control form-control-sm" value={p.part_no} onChange={e => updateProductField(i, "part_no", e.target.value)} /></td>
                                    <td>
                                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                            <input type="text" className="form-control form-control-sm" value={p.name} onChange={e => updateProductField(i, "name", e.target.value)} />
                                            {p.product_id && (
                                                <div style={{ color: "#2563eb", cursor: "pointer", flexShrink: 0 }}
                                                    onClick={() => { lastEditedProductId.current = p.product_id; ProductCreateRef.current?.open(p.product_id); }}>
                                                    <i className="bi bi-pencil"></i>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td><input type="number" min="0" step="any" className="form-control form-control-sm text-end" value={p.quantity} onWheel={e => e.target.blur()} onChange={e => updateProductField(i, "quantity", e.target.value)} /></td>
                                    <td><input type="text" className="form-control form-control-sm" value={p.unit} onChange={e => updateProductField(i, "unit", e.target.value)} placeholder="EA" /></td>
                                    <td><textarea rows={2} className="form-control form-control-sm" style={{ fontSize: "12px", resize: "vertical", minHeight: "40px" }} value={p.notes || ""} onChange={e => updateProductField(i, "notes", e.target.value)} placeholder="e.g. Power Supply: 220V, 60Hz, 7.5kW…" /></td>
                                    <td className="text-center">
                                        <div style={{ color: "red", cursor: "pointer" }} onClick={() => removeProductRow(i)}>
                                            <i className="bi bi-trash"></i>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="text-center text-muted py-2 mb-3" style={{ fontSize: "13px", border: "1px dashed #dee2e6", borderRadius: "4px" }}>
                        Search and select products above, or describe the requirement in the text field below and click "Extract from Text".
                    </div>
                )}

                {/* ── General Instructions ──────────────────────────────────── */}
                <div className="mb-3">
                    <label className="form-label mb-1" style={{ fontSize: "13px", fontWeight: 600 }}>
                        <i className="bi bi-info-circle me-1 text-primary"></i>General Instructions
                        <span className="text-muted ms-2" style={{ fontSize: "11px", fontWeight: 400 }}>
                            — applies to the whole RFQ (delivery terms, datasheet requests, etc.)
                        </span>
                    </label>
                    <textarea
                        className="form-control"
                        rows={3}
                        value={form.general_instructions}
                        onChange={e => setForm(f => ({ ...f, general_instructions: e.target.value }))}
                        placeholder="e.g. Provide technical datasheet, unit price, warranty, delivery lead time. If exact model unavailable propose nearest equivalent."
                        style={{ fontSize: "13px" }}
                    />
                </div>

                {/* ── Additional description ────────────────────────────────── */}
                <div className="mb-3">
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px", flexWrap: "wrap" }}>
                        <label className="form-label fw-semibold mb-0">Additional Description / Enquiry Text</label>
                        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "5px", flexWrap: "wrap" }}>
                            <select
                                className="form-select form-select-sm"
                                style={{ width: "140px", fontSize: "12px" }}
                                value={textProvider}
                                onChange={e => { setTextProvider(e.target.value); setTextModel(modelsForProvider(e.target.value)[0]?.value || ''); }}
                            >
                                {AI_PROVIDERS.map(p => (
                                    <option key={p.value} value={p.value}>{p.label}{storeSettings?.[p.apiKeyField] ? ' ✅' : ''}</option>
                                ))}
                            </select>
                            <select
                                className="form-select form-select-sm"
                                style={{ width: "180px", fontSize: "12px" }}
                                value={textModel}
                                onChange={e => setTextModel(e.target.value)}
                            >
                                {modelsForProvider(textProvider).map(m => (
                                    <option key={m.value} value={m.value}>{m.label} — {m.costLabel}{m.badge ? ` (${m.badge})` : ''}{fileCapabilityLabel(m)}</option>
                                ))}
                            </select>
                            <Button variant="outline-primary" size="sm"
                                disabled={!form.text_content.trim() || extracting}
                                onClick={handleExtractFromText}>
                                {extracting
                                    ? <><Spinner animation="border" size="sm" className="me-1" />Extracting…</>
                                    : <><i className="bi bi-magic me-1"></i>Extract from Text</>}
                            </Button>
                        </div>
                    </div>
                    <textarea
                        className={`form-control ${errors.text_content ? "is-invalid" : ""}`}
                        rows={3}
                        value={form.text_content}
                        onChange={e => { setForm(f => ({ ...f, text_content: e.target.value })); setErrors(er => ({ ...er, text_content: "" })); }}
                        placeholder="Paste the original enquiry text — click 'Extract Products from Text' to auto-populate the products table…"
                    />
                    {errors.text_content && <div className="invalid-feedback">{errors.text_content}</div>}
                </div>

                {/* ── Products file upload (shown in place of products table) ── */}
                <div className="mb-2">
                    <label className="form-label mb-1" style={{ fontSize: "13px", fontWeight: 600 }}>
                        <i className="bi bi-file-earmark-arrow-up me-1 text-primary"></i>Products File
                        <span className="text-muted ms-2" style={{ fontSize: "11px", fontWeight: 400 }}>
                            PDF / Image / CSV / Excel — shown as-is in place of products table
                        </span>
                    </label>
                    <div
                        ref={productDropZoneRef}
                        onDragOver={onProductDragOver} onDragLeave={onProductDragLeave} onDrop={onProductDrop}
                        style={{
                            border: `2px dashed ${isDragOverProduct ? "#2563eb" : "#94a3b8"}`,
                            borderRadius: "8px", padding: "10px 14px",
                            background: isDragOverProduct ? "#eff6ff" : "#f8fafc",
                            transition: "all 0.15s",
                        }}>
                        {productFiles.length === 0 ? (
                            <div className="text-center text-muted" style={{ padding: "4px 0" }}>
                                <i className="bi bi-table" style={{ fontSize: "20px", color: "#94a3b8", display: "block", marginBottom: "3px" }}></i>
                                <span style={{ fontSize: "12px" }}>
                                    Drop PDF, image, CSV, or Excel here, or{" "}
                                    <span style={{ color: "#2563eb", cursor: "pointer", textDecoration: "underline" }} onClick={() => productFileInputRef.current?.click()}>browse</span>
                                </span>
                            </div>
                        ) : (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", alignItems: "center" }}>
                                {productFiles.map((f, i) => {
                                    const { icon, color } = fileIcon(f.name);
                                    return (
                                        <div key={i} style={{ display: "flex", alignItems: "center", gap: "4px", background: "white", border: "1px solid #e2e8f0", borderRadius: "5px", padding: "3px 7px", fontSize: "12px" }}>
                                            <i className={`bi ${icon}`} style={{ color, fontSize: "14px" }}></i>
                                            <span style={{ maxWidth: "140px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={f.name}>{f.name}</span>
                                            <span style={{ color: "#94a3b8" }}>({fmtSize(f.size)})</span>
                                            <button type="button" style={{ border: "none", background: "none", color: "#94a3b8", cursor: "pointer", padding: 0 }} onClick={() => removeProductFile(i)}>
                                                <i className="bi bi-x"></i>
                                            </button>
                                        </div>
                                    );
                                })}
                                <button type="button"
                                    style={{ border: "1px dashed #94a3b8", background: "none", borderRadius: "5px", padding: "3px 8px", fontSize: "12px", color: "#64748b", cursor: "pointer" }}
                                    onClick={() => productFileInputRef.current?.click()}>
                                    <i className="bi bi-plus me-1"></i>Add more
                                </button>
                            </div>
                        )}
                    </div>
                    <input ref={productFileInputRef} type="file" accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.xlsx,.xls,.csv" multiple style={{ display: "none" }}
                        onChange={e => { addProductFiles(e.target.files); e.target.value = ""; }} />
                </div>

                {/* ── AI File Extraction section ─────────────────────────────── */}
                <div className="mb-3" style={{ border: "1px solid #c7d2fe", borderRadius: "8px", padding: "12px 14px", background: "#f5f3ff" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px", flexWrap: "wrap" }}>
                        <i className="bi bi-cpu text-primary" style={{ fontSize: "15px" }}></i>
                        <span style={{ fontWeight: 600, fontSize: "13px" }}>AI File Extraction</span>
                        <span style={{ fontSize: "11px", color: "#6c757d", marginLeft: "4px" }}>
                            Upload Excel / CSV / PDF / Image / TXT → AI extracts products
                        </span>
                        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "5px", flexWrap: "wrap" }}>
                            <select
                                className="form-select form-select-sm"
                                style={{ width: "140px", fontSize: "12px" }}
                                value={aiProvider}
                                onChange={e => { setAIProvider(e.target.value); setAIModel(modelsForProvider(e.target.value)[0]?.value || ''); }}
                            >
                                {AI_PROVIDERS.map(p => (
                                    <option key={p.value} value={p.value}>{p.label}{storeSettings?.[p.apiKeyField] ? ' ✅' : ''}</option>
                                ))}
                            </select>
                            <select
                                className="form-select form-select-sm"
                                style={{ width: "190px", fontSize: "12px" }}
                                value={aiModel}
                                onChange={e => setAIModel(e.target.value)}
                            >
                                {modelsForProvider(aiProvider).map(m => (
                                    <option key={m.value} value={m.value}>{m.label} — {m.costLabel}{m.badge ? ` (${m.badge})` : ''}{fileCapabilityLabel(m)}</option>
                                ))}
                            </select>
                            <Button variant="primary" size="sm"
                                disabled={!aiFiles.length || aiExtracting}
                                onClick={handleAIExtract}>
                                {aiExtracting
                                    ? <><Spinner animation="border" size="sm" className="me-1" />Extracting…</>
                                    : <><i className="bi bi-magic me-1"></i>Extract</>}
                            </Button>
                        </div>
                    </div>
                    <div
                        ref={aiDropZoneRef}
                        onDragOver={onAIDragOver} onDragLeave={onAIDragLeave} onDrop={onAIDrop}
                        style={{
                            border: `2px dashed ${isDragOverAI ? "#4f46e5" : "#a5b4fc"}`,
                            borderRadius: "8px", padding: "10px 14px",
                            background: isDragOverAI ? "#ede9fe" : "#fff",
                            transition: "all 0.15s",
                        }}>
                        {aiFiles.length === 0 ? (
                            <div className="text-center text-muted" style={{ padding: "4px 0" }}>
                                <i className="bi bi-file-earmark-arrow-up" style={{ fontSize: "20px", color: "#a5b4fc", display: "block", marginBottom: "3px" }}></i>
                                <span style={{ fontSize: "12px" }}>
                                    Drop Excel, CSV, PDF, image, or TXT here, or{" "}
                                    <span style={{ color: "#4f46e5", cursor: "pointer", textDecoration: "underline" }} onClick={() => aiFileInputRef.current?.click()}>browse</span>
                                </span>
                            </div>
                        ) : (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", alignItems: "center" }}>
                                {aiFiles.map((f, i) => {
                                    const { icon, color } = fileIcon(f.name);
                                    return (
                                        <div key={i} style={{ display: "flex", alignItems: "center", gap: "4px", background: "white", border: "1px solid #e0e7ff", borderRadius: "5px", padding: "3px 7px", fontSize: "12px" }}>
                                            <i className={`bi ${icon}`} style={{ color, fontSize: "14px" }}></i>
                                            <span style={{ maxWidth: "140px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={f.name}>{f.name}</span>
                                            <span style={{ color: "#94a3b8" }}>({fmtSize(f.size)})</span>
                                            <button type="button" style={{ border: "none", background: "none", color: "#94a3b8", cursor: "pointer", padding: 0 }} onClick={() => removeAIFile(i)}>
                                                <i className="bi bi-x"></i>
                                            </button>
                                        </div>
                                    );
                                })}
                                <button type="button"
                                    style={{ border: "1px dashed #a5b4fc", background: "none", borderRadius: "5px", padding: "3px 8px", fontSize: "12px", color: "#4f46e5", cursor: "pointer" }}
                                    onClick={() => aiFileInputRef.current?.click()}>
                                    <i className="bi bi-plus me-1"></i>Add more
                                </button>
                            </div>
                        )}
                    </div>
                    <input ref={aiFileInputRef} type="file" accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.xlsx,.xls,.csv,.txt" multiple style={{ display: "none" }}
                        onChange={e => { addAIFiles(e.target.files); e.target.value = ""; }} />
                </div>

                {/* ── Additional Details file upload (shown below products table) ── */}
                <div>
                    <label className="form-label mb-1" style={{ fontSize: "13px", fontWeight: 600 }}>
                        <i className="bi bi-paperclip me-1 text-secondary"></i>Additional Details
                        <span className="text-muted ms-2" style={{ fontSize: "11px", fontWeight: 400 }}>
                            Any files — shown below the products table in the RFQ preview &amp; PDF
                        </span>
                    </label>
                    <div
                        ref={additionalDropZoneRef}
                        onDragOver={onAdditionalDragOver} onDragLeave={onAdditionalDragLeave} onDrop={onAdditionalDrop}
                        style={{
                            border: `2px dashed ${isDragOverAdditional ? "#2563eb" : "#94a3b8"}`,
                            borderRadius: "8px", padding: "10px 14px",
                            background: isDragOverAdditional ? "#eff6ff" : "#f8fafc",
                            transition: "all 0.15s",
                        }}>
                        {additionalFiles.length === 0 && existingAdditionalDataURIs.length === 0 ? (
                            <div className="text-center text-muted" style={{ padding: "4px 0" }}>
                                <i className="bi bi-paperclip" style={{ fontSize: "20px", color: "#94a3b8", display: "block", marginBottom: "3px" }}></i>
                                <span style={{ fontSize: "12px" }}>
                                    Drop files here, or{" "}
                                    <span style={{ color: "#2563eb", cursor: "pointer", textDecoration: "underline" }} onClick={() => additionalFileInputRef.current?.click()}>browse</span>
                                </span>
                            </div>
                        ) : (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", alignItems: "center" }}>
                                {existingAdditionalDataURIs.map((uri, i) => {
                                    const isImg = /^data:image\//i.test(uri);
                                    const isPDF = uri.startsWith('data:application/pdf');
                                    return (
                                        <div key={`ex-${i}`} style={{ position: "relative", display: "flex", alignItems: "center", gap: "4px", background: "white", border: "1px solid #bfdbfe", borderRadius: "5px", padding: isImg ? "2px" : "3px 7px", fontSize: "12px" }}>
                                            {isImg
                                                ? <img src={uri} alt={`attachment ${i+1}`} style={{ height: "40px", width: "40px", objectFit: "cover", borderRadius: "3px" }} />
                                                : <><i className={`bi ${isPDF ? 'bi-file-pdf' : 'bi-paperclip'}`} style={{ color: isPDF ? "#dc2626" : "#64748b", fontSize: "14px" }}></i>
                                                    <span style={{ maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={existingAdditionalFilenames[i] || undefined}>{existingAdditionalFilenames[i] || (isPDF ? `PDF ${i+1}` : `File ${i+1}`)}</span></>
                                            }
                                            <button type="button" style={{ border: "none", background: "none", color: "#94a3b8", cursor: "pointer", padding: "0 2px" }} title="Remove" onClick={() => { setExistingAdditionalDataURIs(prev => prev.filter((_, idx) => idx !== i)); setExistingAdditionalFilenames(prev => prev.filter((_, idx) => idx !== i)); }}>
                                                <i className="bi bi-x"></i>
                                            </button>
                                        </div>
                                    );
                                })}
                                {additionalFiles.map((f, i) => {
                                    const { icon, color } = fileIcon(f.name);
                                    return (
                                        <div key={`new-${i}`} style={{ display: "flex", alignItems: "center", gap: "4px", background: "white", border: "1px solid #e2e8f0", borderRadius: "5px", padding: "3px 7px", fontSize: "12px" }}>
                                            <i className={`bi ${icon}`} style={{ color, fontSize: "14px" }}></i>
                                            <span style={{ maxWidth: "140px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={f.name}>{f.name}</span>
                                            <span style={{ color: "#94a3b8" }}>({fmtSize(f.size)})</span>
                                            <button type="button" style={{ border: "none", background: "none", color: "#94a3b8", cursor: "pointer", padding: 0 }} onClick={() => removeAdditionalFile(i)}>
                                                <i className="bi bi-x"></i>
                                            </button>
                                        </div>
                                    );
                                })}
                                <button type="button"
                                    style={{ border: "1px dashed #94a3b8", background: "none", borderRadius: "5px", padding: "3px 8px", fontSize: "12px", color: "#64748b", cursor: "pointer" }}
                                    onClick={() => additionalFileInputRef.current?.click()}>
                                    <i className="bi bi-plus me-1"></i>Add more
                                </button>
                            </div>
                        )}
                    </div>
                    <input ref={additionalFileInputRef} type="file" accept={ACCEPTED_TYPES} multiple style={{ display: "none" }}
                        onChange={e => { addAdditionalFiles(e.target.files); e.target.value = ""; }} />
                </div>

            </Modal.Body>
            <Modal.Footer style={{ padding: "8px 16px" }}>
                <Button variant="secondary" onClick={() => setShow(false)} disabled={saving}>Cancel</Button>
                <Button variant="primary" onClick={handleSubmit} disabled={saving}>
                    {saving
                        ? <><Spinner animation="border" size="sm" className="me-2" />{editId ? "Saving…" : "Creating…"}</>
                        : <><i className="bi bi-check2 me-2"></i>{editId ? "Save Changes" : "Create RFQ"}</>
                    }
                </Button>
            </Modal.Footer>
        </Modal>

        {/* Sub-forms rendered outside main modal */}
        <CustomerCreate ref={CustomerUpdateRef} showToastMessage={showToastMessage}
            onUpdated={c => { if (c?.id) { setSelectedCustomers([{ ...c }]); setForm(f => ({ ...f, customer_id: c.id, customer_name: c.name || "" })); } }} />
        <CustomerCreate ref={CustomerCreateRef} showToastMessage={showToastMessage}
            onUpdated={c => { if (c?.id) selectCustomer(c); }} />
        <ProductCreate ref={ProductCreateRef} showToastMessage={showToastMessage} refreshList={refreshEditedProduct} />
        {editLinkedMsgObj && editLinkedMsgObj.type !== 'whatsapp' && (
            <EmailDetailModal
                msg={editLinkedMsgObj}
                show={showLinkedEmail}
                onClose={() => setShowLinkedEmail(false)}
                storeId={localStorage.getItem('store_id')}
                token={localStorage.getItem('access_token')}
            />
        )}
        {editLinkedMsgObj && editLinkedMsgObj.type === 'whatsapp' && (
            <Modal show={showLinkedEmail} onHide={() => setShowLinkedEmail(false)} centered size="md">
                <Modal.Header closeButton style={{ padding: '8px 16px' }}>
                    <Modal.Title style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i className="bi bi-whatsapp" style={{ color: '#128C7E' }}></i>
                        {editLinkedMsgObj.code || 'WhatsApp Message'}
                        <span className={`badge ${editLinkedMsgObj.direction === 'in' ? 'bg-success' : 'bg-primary'}`} style={{ fontSize: '10px' }}>
                            {editLinkedMsgObj.direction === 'in' ? '↓ Received' : '↑ Sent'}
                        </span>
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ fontSize: '13px', padding: '12px 16px' }}>
                    <div className="mb-2">
                        <strong>{editLinkedMsgObj.direction === 'in' ? 'From:' : 'To:'}</strong>{' '}
                        {editLinkedMsgObj.sender_name ? `${editLinkedMsgObj.sender_name} (${editLinkedMsgObj.from || (editLinkedMsgObj.to || []).join(', ')})` : (editLinkedMsgObj.from || (editLinkedMsgObj.to || []).join(', '))}
                    </div>
                    {editLinkedMsgObj.message_date && (
                        <div className="mb-2 text-muted" style={{ fontSize: '11px' }}>
                            {new Date(editLinkedMsgObj.message_date).toLocaleString()}
                        </div>
                    )}
                    {editLinkedMsgObj.body_text && (
                        <div style={{ background: '#f8f9fa', borderRadius: '6px', padding: '10px', whiteSpace: 'pre-wrap', fontSize: '13px', maxHeight: '300px', overflowY: 'auto' }}>
                            {editLinkedMsgObj.body_text}
                        </div>
                    )}
                    {(editLinkedMsgObj.attachments || []).length > 0 && (
                        <div className="mt-3">
                            <strong style={{ fontSize: '12px' }}>Attachments ({editLinkedMsgObj.attachments.length}):</strong>
                            <ul className="mb-0 mt-1" style={{ fontSize: '12px', paddingLeft: '18px' }}>
                                {editLinkedMsgObj.attachments.map((a, i) => (
                                    <li key={i}>{a.file_name || a.url || `Attachment ${i + 1}`}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer style={{ padding: '8px 16px' }}>
                    <Button variant="secondary" size="sm" onClick={() => setShowLinkedEmail(false)}>Close</Button>
                </Modal.Footer>
            </Modal>
        )}
        </>
    );
});

export default RFQCreate;
