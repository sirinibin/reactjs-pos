import React, { useState, useEffect, useRef, useMemo, forwardRef, useImperativeHandle, useCallback } from "react";
import Preview from "./../order/preview.js";
import { Modal, Button, OverlayTrigger, Popover } from "react-bootstrap";
import CustomerCreate from "../customer/create.js";
import ProductCreate from "../product/create.js";
import UserCreate from "../user/create.js";
import SignatureCreate from "../signature/create.js";
import { Typeahead, Menu, MenuItem } from "react-bootstrap-typeahead";
import { format } from "date-fns";
import { Spinner } from "react-bootstrap";
import ProductView from "../product/view.js";
import { DebounceInput } from 'react-debounce-input';
import DatePicker from "react-datepicker";
import { Dropdown } from 'react-bootstrap';

import SalesReturnHistory from "./../utils/product_sales_return_history.js";
import PurchaseHistory from "./../utils/product_purchase_history.js";
import PurchaseReturnHistory from "./../utils/product_purchase_return_history.js";
import QuotationHistory from "./../utils/product_quotation_history.js";
import QuotationSalesReturnHistory from "./../utils/product_quotation_sales_return_history.js";
import DeliveryNoteHistory from "./../utils/product_delivery_note_history.js";
import Products from "../utils/products.js";
import Customers from "./../utils/customers.js";
import ImageViewerModal from './../utils/ImageViewerModal';
import * as bootstrap from 'bootstrap';
//import OverflowTooltip from "../utils/OverflowTooltip.js";
import Amount from "../utils/amount.js";
import { trimTo2Decimals, trimTo8Decimals } from "../utils/numberUtils";
import { highlightWords } from "../utils/search.js";
//import ProductHistory from "./../product/product_history.js";
import ProductHistory from "../utils/product_history.js";
import SalesHistory from "../utils/product_sales_history.js";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { ObjectToSearchQueryParams } from '../utils/queryUtils.js';
import { fetchStore } from '../utils/storeUtils.js';
import SuccessModal from '../utils/SuccessModal.js';
import TableSettingsModal from '../utils/TableSettingsModal.js';
import PurchaseOrderPicker from '../purchase_order/PurchaseOrderPicker.js';

const DEFAULT_DN_CUSTOMER_COLS = [
    { key: 'code',           label: 'Code',          width: 15, visible: true },
    { key: 'name',           label: 'Name',          width: 45, visible: true },
    { key: 'phone',          label: 'Phone',         width: 10, visible: true },
    { key: 'vat_no',         label: 'VAT No.',       width: 13, visible: true },
    { key: 'credit_balance', label: 'Credit Balance',width: 10, visible: true },
    { key: 'credit_limit',   label: 'Credit Limit',  width: 7,  visible: true },
];
const DN_CUSTOMER_COLS_KEY = 'delivery_note_customer_search_columns';

const columnStyle = {
  width: '20%',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
  paddingRight: '8px',
};

const DeliveryNoteCreate = forwardRef((props, ref) => {
  const [enableProductSelection, setEnableProductSelection] = useState(false);
  useImperativeHandle(ref, () => ({
    open(id, operationType) {

      if (operationType && operationType === "product_selection") {
        setEnableProductSelection(true);
      }

      formData = {
        vat_percent: 15.0,
        discount: 0.0,
        discount_with_vat: 0.0,
        discountValue: 0.0,
        discount_percent: 0.0,
        discount_percent_with_vat: 0.0,
        shipping_handling_fees: 0.00,
        rounding_amount: 0.00,
        auto_rounding_amount: true,
        total: 0.0,
        total_with_vat: 0.0,
        vat_price: 0.0,
        net_total: 0.0,
        is_discount_percent: false,
        date_str: format(new Date(), "MMM dd yyyy"),
        signature_date_str: format(new Date(), "MMM dd yyyy"),
        status: "delivered",
        remarks: "",
        price_type: "retail",
        notify_at: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000),
      };

      formData.date_str = new Date();

      selectedProducts = [];
      setSelectedProducts([]);

      selectedCustomers = [];
      setSelectedCustomers([]);

      selectedDeliveredByUsers = [];
      setSelectedDeliveredByUsers([]);

      reCalculate();

      if (localStorage.getItem("user_id")) {
        selectedDeliveredByUsers = [{
          id: localStorage.getItem("user_id"),
          name: localStorage.getItem("user_name"),
        }];
        formData.delivered_by = localStorage.getItem("user_id");
        setFormData({ ...formData });
        setSelectedDeliveredByUsers([...selectedDeliveredByUsers]);
      }
      if (localStorage.getItem('store_id')) {
        formData.store_id = localStorage.getItem('store_id');
        formData.store_name = localStorage.getItem('store_name');
      }

      setFormData({ ...formData });
      if (id) {
        getDeliveryNote(id);
      }

      getStore(localStorage.getItem("store_id"));
      SetShow(true);
    },


  }));

  let [warnings, setWarnings] = useState({});

  const lastEditedProductIdRef = useRef(null);

  function openUpdateProductForm(id) {
    lastEditedProductIdRef.current = id;
    ProductCreateFormRef.current.open(id);
  }

  function openProductDetails(id) {
    ProductDetailsViewRef.current.open(id);
  }


  function removeWarningAndError(i) {
    delete warnings["quantity_" + i];
    delete errors["quantity_" + i];
    setErrors({ ...errors });
    setWarnings({ ...warnings });
  }

  async function checkErrors(index) {
    if (priceValidationTimer.current) clearTimeout(priceValidationTimer.current);
    priceValidationTimer.current = setTimeout(() => {
      if (index) {
        checkError(index);
      } else {
        for (let i = 0; i < selectedProducts.length; i++) {
          checkError(i);
        }
      }
    }, 3000);
  }

  function checkError(i) {
    if (selectedProducts[i].quantity && selectedProducts[i].quantity <= 0) {
      errors["quantity_" + i] = "Quantity should be > 0";
    } else if (!selectedProducts[i].quantity) {
      errors["quantity_" + i] = "Quantity is required";
    } else {
      delete errors["quantity_" + i];
    }

    setErrors({ ...errors });
  }


  const priceValidationTimer = useRef(null);
  const warningValidationTimer = useRef(null);
  async function checkWarnings(index) {
    if (warningValidationTimer.current) clearTimeout(warningValidationTimer.current);
    warningValidationTimer.current = setTimeout(async () => {
      if (index) {
        checkWarning(index);
      } else {
        for (let i = 0; i < selectedProducts.length; i++) {
          checkWarning(i);
        }
      }
    }, 3000);
  }

  let [oldProducts, setOldProducts] = useState([]);

  async function checkWarning(i) {
    let product = await getProduct(selectedProducts[i].product_id);
    let stock = 0;

    if (!product) {
      return;
    }

    if (product.product_stores && product.product_stores[localStorage.getItem("store_id")]?.stock) {
      stock = product.product_stores[localStorage.getItem("store_id")].stock;
      selectedProducts[i].stock = stock;
      setSelectedProducts([...selectedProducts]);
    }

    let oldQty = 0;
    for (let j = 0; j < oldProducts?.length; j++) {
      if (oldProducts[j].product_id === selectedProducts[i].product_id) {
        if (formData.id) {
          oldQty = oldProducts[j].quantity;
        }
        break;
      }
    }



    if (product.product_stores && (stock + oldQty) < selectedProducts[i].quantity) {
      if (!formData.id) {
        warnings["quantity_" + i] = "Warning: Available stock is " + (stock);
      }
    } else {
      delete warnings["quantity_" + i];
    }
    setWarnings({ ...warnings });
  }

  let [errors, setErrors] = useState({});

  useEffect(() => {
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltipTriggerList.forEach((el) => {
      // Dispose existing
      const existing = bootstrap.Tooltip.getInstance(el);
      if (existing) existing.dispose();

      // Read new values from attributes
      const errMsg = el.getAttribute('data-error');
      const warnMsg = el.getAttribute('data-warning');
      const tooltipMsg = errMsg || warnMsg || '';

      // Update title
      el.setAttribute('title', tooltipMsg);

      // Create new tooltip instance
      new bootstrap.Tooltip(el);
    });
  }, [errors, warnings]);

  let [store, setStore] = useState({});

  async function getStore(id) {
      try {
          const data = await fetchStore(id);
          store = data;
          setStore({ ...data });
      } catch (error) { }
  }

  useEffect(() => {
    const listener = event => {
      if (event.target.tagName === "TEXTAREA") return;
      if (event.code === "Enter" || event.code === "NumpadEnter") {
        console.log("Enter key was pressed. Run your function.");
        // event.preventDefault();

        var form = event.target.form;
        if (form && event.target) {
          var index = Array.prototype.indexOf.call(form, event.target);
          if (form && form.elements[index + 1]) {
            if ((event.target.getAttribute("class") || "").includes("barcode")) {
              form.elements[index].focus();
            } else if ((event.target.getAttribute("class") || "").includes("productSearch")) {
              //  moveToProductSearch();
              //productSearchRef.current?.focus();
            } else if ((event.target.getAttribute("class") || "").includes("delivery_note_quantity")) {
              //console.log("OKKK");
              moveToProductSearch();
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



  //const history = useHistory();

  const [isProcessing, setProcessing] = useState(false);
  const recalcRequestRef = useRef(0);

  //fields
  let [formData, setFormData] = useState({
    vat_percent: 15.0,
    discount: 0.0,
    discount_with_vat: 0.0,
    discountValue: 0.0,
    discount_percent: 0.0,
    discount_percent_with_vat: 0.0,
    shipping_handling_fees: 0.00,
    rounding_amount: 0.00,
    auto_rounding_amount: true,
    total: 0.0,
    total_with_vat: 0.0,
    vat_price: 0.0,
    net_total: 0.0,
    date_str: format(new Date(), "MMM dd yyyy"),
    signature_date_str: format(new Date(), "MMM dd yyyy"),
    status: "created",
    price_type: "retail",
    is_discount_percent: false,
    notify_at: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000),
  });

  //Customer Auto Suggestion
  const [customerOptions, setCustomerOptions] = useState([]);
  let [selectedCustomers, setSelectedCustomers] = useState([]);
  //const [isCustomersLoading, setIsCustomersLoading] = useState(false);

  //Product Auto Suggestion
  let [productOptions, setProductOptions] = useState([]);
  let selectedProduct = [];
  let [selectedProducts, setSelectedProducts] = useState([]);
  //const [isProductsLoading, setIsProductsLoading] = useState(false);

  //Delivered By Auto Suggestion
  let [selectedDeliveredByUsers, setSelectedDeliveredByUsers] = useState([]);


  const [show, SetShow] = useState(false);

  function handleClose() {
    selectedProducts = [];
    setSelectedProducts([]);
    SetShow(false);
  }


  useEffect(() => {
    let at = localStorage.getItem("access_token");
    if (!at) {
      // history.push("/dashboard/deliverynotes");
      window.location = "/";
    }
  });


  function getDeliveryNote(id) {
    console.log("inside get DeliveryNote");
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


    fetch('/v1/delivery-note/' + id + "?" + queryParams, requestOptions)
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

        let deliverynote = data.result;
        oldProducts = deliverynote.products.map(obj => ({ ...obj }));
        setOldProducts([...oldProducts]);

        formData = {
          id: deliverynote.id,
          code: deliverynote.code,
          store_id: deliverynote.store_id,
          customer_id: deliverynote.customer_id,
          date_str: deliverynote.date_str,
          date: deliverynote.date,
          vat_percent: deliverynote.vat_percent,
          discount: deliverynote.discount || 0,
          discount_with_vat: deliverynote.discount_with_vat || 0,
          discount_percent: deliverynote.discount_percent || 0,
          discount_percent_with_vat: deliverynote.discount_percent_with_vat || 0,
          status: deliverynote.status,
          delivered_by: deliverynote.delivered_by,
          delivered_by_signature_id: deliverynote.delivered_by_signature_id,
          is_discount_percent: deliverynote.is_discount_percent,
          shipping_handling_fees: deliverynote.shipping_handling_fees || 0,
          rounding_amount: deliverynote.rounding_amount || 0,
          auto_rounding_amount: deliverynote.auto_rounding_amount || false,
          total: deliverynote.total || 0,
          total_with_vat: deliverynote.total_with_vat || 0,
          vat_price: deliverynote.vat_price || 0,
          net_total: deliverynote.net_total || 0,
          customer: deliverynote.customer,
          remarks: deliverynote.remarks,
          notify_at: deliverynote.notify_at ? new Date(deliverynote.notify_at) : new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000),
        };

        formData.date_str = data.result.date;

        if (formData.is_discount_percent) {
          formData.discountValue = formData.discount_percent;
        } else {
          formData.discountValue = formData.discount;
        }

        selectedProducts = deliverynote.products;
        setSelectedProducts([...selectedProducts]);

        if (deliverynote.customer_id && deliverynote.customer?.name) {
          setSelectedCustomers([deliverynote.customer]);
        }


        let selectedDeliveredByUsers = [
          {
            id: deliverynote.delivered_by,
            name: deliverynote.delivered_by_name
          }
        ];

        setSelectedDeliveredByUsers([...selectedDeliveredByUsers]);

        setFormData({ ...formData });

        checkErrors();
        checkWarnings();
        reCalculate();
      })
      .catch(error => {
        setProcessing(false);
        setErrors(error);
      });
  }



  const customCustomerFilter = useCallback((option, query) => {
    const normalize = (str) => str?.toLowerCase().replace(/\s+/g, " ").trim() || "";

    const q = normalize(query);
    const qWords = q.split(" ");

    const fields = [
      option.code            || "",
      option.vat_no          || "",
      option.name            || "",
      option.name_in_arabic  || "",
      option.phone           || "",
      option.phone2          || "",
      option.email           || "",
      option.search_label    || "",
      option.phone_in_arabic || "",
      ...(Array.isArray(option.additional_keywords) ? option.additional_keywords : []),
    ];

    const searchable = normalize(fields.join(" "));
    const searchableCompact = fields.join(" ").toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, "")
      .replace(/\s+/g, " ").trim();

    return qWords.every((word) => {
      if (searchable.includes(word)) return true;
      const wordCompact = word.replace(/[^\p{L}\p{N}]/gu, "");
      if (!wordCompact || /^[^\p{L}\p{N}]/u.test(word)) return false;
      return searchableCompact.includes(wordCompact);
    });
  }, []);


  let [openCustomerSearchResult, setOpenCustomerSearchResult] = useState(false);

  async function suggestCustomers(searchTerm) {
    console.log("Inside handle suggestCustomers");
    setCustomerOptions([]);

    console.log("searchTerm:" + searchTerm);
    if (!searchTerm) {
      setTimeout(() => {
        openCustomerSearchResult = false;
        setOpenCustomerSearchResult(false);
      }, 300);
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

    searchTerm = searchTerm.replace(/\s+/g, " ").trim();
    if (!searchTerm) return;

    let Select = "select=id,credit_balance,credit_limit,code,vat_no,remarks,name,phone,phone2,email,name_in_arabic,phone_in_arabic,contact_person,search_label";
    let result = await fetch(
      "/v1/customer?limit=100&" + Select + queryString,
      requestOptions
    );
    let data = await result.json();

    if (!data.result || data.result.length === 0) {
      openCustomerSearchResult = false;
      setOpenCustomerSearchResult(false);
      return;
    }

    const filtered = data.result.filter((opt) => customCustomerFilter(opt, searchTerm));

    setCustomerOptions(filtered);
    setOpenCustomerSearchResult(filtered.length > 0);
    // setIsCustomersLoading(false);
  }

  // eslint-disable-next-line no-unused-vars
  function GetProductUnitPriceInStore(storeId, productStores) {
    if (!productStores) {
      return "";
    }

    for (var i = 0; i < productStores.length; i++) {
      console.log("productStores[i]:", productStores[i]);
      console.log("store_id:", storeId);

      if (productStores[i].store_id === storeId) {
        console.log("macthed");
        console.log(
          "productStores[i].retail_unit_price:",
          productStores[i].retail_unit_price
        );
        return productStores[i];
      }
    }
    console.log("not matched");
    return "";
  }


  function openQuotationSalesHistory(model) {
    QuotationHistoryRef.current.open(model, selectedCustomers, "invoice");
  }

  const QuotationSalesReturnHistoryRef = useRef();
  function openQuotationSalesReturnHistory(model) {
    QuotationSalesReturnHistoryRef.current.open(model, selectedCustomers);
  }

  const SHORTCUTS = {
    DEFAULT: {
      linkedProducts: "Ctrl + Shift + 1",
      productHistory: "Ctrl + Shift + 2",
      salesHistory: "Ctrl + Shift + 3",
      salesReturnHistory: "Ctrl + Shift + 4",
      purchaseHistory: "Ctrl + Shift + 5",
      purchaseReturnHistory: "Ctrl + Shift + 6",
      deliveryNoteHistory: "Ctrl + Shift + 7",
      quotationHistory: "Ctrl + Shift + 8",
      quotationSalesHistory: "Ctrl + Shift + 9",
      quotationSalesReturnHistory: "Ctrl + Shift + Z",
      images: "Ctrl + Shift + F",
    },
    LGK: {
      linkedProducts: "F10",
      productHistory: "Ctrl + Shift + B",
      salesHistory: "F4",
      salesReturnHistory: "F9",
      purchaseHistory: "F6",
      purchaseReturnHistory: "F8",
      deliveryNoteHistory: "Ctrl + Shift + P",
      quotationHistory: "F2",
      quotationSalesHistory: "F3",
      quotationSalesReturnHistory: "Ctrl + Shift + Z",
      images: "Ctrl + Shift + F",
    },
    MBDI: {
      linkedProducts: "F10",
      productHistory: "Ctrl + Shift + 6",
      salesHistory: "F4",
      salesReturnHistory: "F9",
      purchaseHistory: "F6",
      purchaseReturnHistory: "F8",
      deliveryNoteHistory: "Ctrl + Shift + 7",
      quotationHistory: "F2",
      quotationSalesHistory: "F3",
      quotationSalesReturnHistory: "Ctrl + Shift + 8",
      images: "Ctrl + Shift + 9",
    },
    "MBDI-SIMULATION": {
      linkedProducts: "F10",
      productHistory: "Ctrl + Shift + 6",
      salesHistory: "F4",
      salesReturnHistory: "F9",
      purchaseHistory: "F6",
      purchaseReturnHistory: "F8",
      deliveryNoteHistory: "Ctrl + Shift + 7",
      quotationHistory: "F2",
      quotationSalesHistory: "F3",
      quotationSalesReturnHistory: "Ctrl + Shift + 8",
      images: "Ctrl + Shift + 9",
    },
    YNB: {
      linkedProducts: "F10",
      productHistory: "Ctrl + Shift + 6",
      salesHistory: "F4",
      salesReturnHistory: "F9",
      purchaseHistory: "F6",
      purchaseReturnHistory: "F8",
      deliveryNoteHistory: "Ctrl + Shift + 7",
      quotationHistory: "F2",
      quotationSalesHistory: "F3",
      quotationSalesReturnHistory: "Ctrl + Shift + 8",
      images: "Ctrl + Shift + 9",
    },
    MDNA: {
      linkedProducts: "F10",
      productHistory: "Ctrl + Shift + 6",
      salesHistory: "F4",
      salesReturnHistory: "F9",
      purchaseHistory: "F6",
      purchaseReturnHistory: "F8",
      deliveryNoteHistory: "Ctrl + Shift + 7",
      quotationHistory: "F2",
      quotationSalesHistory: "F3",
      quotationSalesReturnHistory: "Ctrl + Shift + 8",
      images: "Ctrl + Shift + 9",
    },
    "MDNA-SIMULATION": {
      linkedProducts: "F10",
      productHistory: "Ctrl + Shift + 6",
      salesHistory: "F4",
      salesReturnHistory: "F9",
      purchaseHistory: "F6",
      purchaseReturnHistory: "F8",
      deliveryNoteHistory: "Ctrl + Shift + 7",
      quotationHistory: "F2",
      quotationSalesHistory: "F3",
      quotationSalesReturnHistory: "Ctrl + Shift + 8",
      images: "Ctrl + Shift + 9",
    },
  };

  function getShortcut(key) {
    const code = (store && store.code) ? store.code : "DEFAULT";
    return (SHORTCUTS[code] && SHORTCUTS[code][key]) || SHORTCUTS.DEFAULT[key] || "";
  }


  function RunKeyActions(event, product) {
    // detect mac
    const isMac = (typeof navigator !== "undefined") && (
      (navigator.userAgentData && navigator.userAgentData.platform === "macOS") ||
      (navigator.platform && /mac/i.test(navigator.platform)) ||
      /Mac/i.test(navigator.userAgent)
    );
    const isCmdOrCtrl = isMac ? event.metaKey : event.ctrlKey;

    // LGK store uses original simple mapping
    if (store?.code === "LGK") {
      if (event.key === "F10") {
        openLinkedProducts(product);
      } else if (isCmdOrCtrl && event.shiftKey && event.key.toLowerCase() === 'b') {
        openProductHistory(product);
      } else if (event.key === "F4") {
        openSalesHistory(product);
      } else if (event.key === "F9") {
        openSalesReturnHistory(product);
      } else if (event.key === "F6") {
        openPurchaseHistory(product);
      } else if (event.key === "F8") {
        openPurchaseReturnHistory(product);
      } else if (event.key === "F3") {
        openQuotationSalesHistory(product);
      } else if (event.key === "F2") {
        openQuotationHistory(product);
      } else if (isCmdOrCtrl && event.shiftKey && event.key.toLowerCase() === 'p') {
        openDeliveryNoteHistory(product);
      } else if (isCmdOrCtrl && event.shiftKey && event.key.toLowerCase() === 'z') {
        openQuotationSalesReturnHistory(product);
      } else if (isCmdOrCtrl && event.shiftKey && event.key.toLowerCase() === 'f') {
        openProductImages(product.product_id);
      }
      return;
    } else if (store?.code === "MBDI" || store?.code === "MBDI-SIMULATION" || store?.code === "YNB" || store?.code === "MDNA" || store?.code === "MDNA-SIMULATION") {
      if (event.key === "F10") {
        openLinkedProducts(product);
      } else if (isCmdOrCtrl && event.shiftKey && event.key.toLowerCase() === '6') {
        openProductHistory(product);
      } else if (event.key === "F4") {
        openSalesHistory(product);
      } else if (event.key === "F9") {
        openSalesReturnHistory(product);
      } else if (event.key === "F6") {
        openPurchaseHistory(product);
      } else if (event.key === "F8") {
        openPurchaseReturnHistory(product);
      } else if (event.key === "F3") {
        openQuotationSalesHistory(product);
      } else if (event.key === "F2") {
        openQuotationHistory(product, "quotation");
      } else if (isCmdOrCtrl && event.shiftKey && event.key.toLowerCase() === '7') {
        openDeliveryNoteHistory(product);
      } else if (isCmdOrCtrl && event.shiftKey && event.key.toLowerCase() === '8') {
        openQuotationSalesReturnHistory(product);
      } else if (isCmdOrCtrl && event.shiftKey && event.key.toLowerCase() === '9') {
        openProductImages(product.product_id);
      }
      return;
    }

    // Default: require Ctrl/Cmd + Shift for letter shortcuts and numeric mapping
    if (!isCmdOrCtrl || !event.shiftKey) return;

    const rawKey = event.key || "";
    const key = rawKey.toString().toLowerCase();
    const code = event.code || "";
    const keyCode = event.which || event.keyCode || 0;
    const location = event.location || 0; // 3 === Numpad

    // handle letter shortcuts first (Ctrl/Cmd + Shift + <letter>)
    if (key === "b") {
      try { event.preventDefault(); } catch (e) { }
      openProductHistory(product);
      return;
    }
    if (key === "p") {
      try { event.preventDefault(); } catch (e) { }
      openQuotationSalesHistory(product);
      return;
    }
    if (key === "z") {
      try { event.preventDefault(); } catch (e) { }
      openQuotationSalesReturnHistory(product);
      return;
    }
    if (key === "f") {
      try { event.preventDefault(); } catch (e) { }
      openProductImages(product.product_id);
      return;
    }

    // numeric mapping (supports top-row, numpad, shifted symbols and keyCode fallbacks)
    const codeToDigit = {
      Digit1: "1", Digit2: "2", Digit3: "3", Digit4: "4", Digit5: "5",
      Digit6: "6", Digit7: "7", Digit8: "8", Digit9: "9", Digit0: "0",
      Numpad1: "1", Numpad2: "2", Numpad3: "3", Numpad4: "4", Numpad5: "5",
      Numpad6: "6", Numpad7: "7", Numpad8: "8", Numpad9: "9", Numpad0: "0"
    };

    const symbolToDigit = {
      "!": "1", "@": "2", "#": "3", "$": "4", "%": "5",
      "^": "6", "&": "7", "*": "8", "(": "9", ")": "0"
    };

    let digit = null;

    if (code && codeToDigit[code]) {
      digit = codeToDigit[code];
    } else if (rawKey && symbolToDigit[rawKey]) {
      digit = symbolToDigit[rawKey];
    } else if (/^[0-9]$/.test(key)) {
      digit = key;
    } else if (keyCode >= 48 && keyCode <= 57) {
      digit = String(keyCode - 48);
    } else if (keyCode >= 96 && keyCode <= 105) {
      digit = String(keyCode - 96);
    } else if (location === 3 && /^[0-9]$/.test(key)) {
      digit = key;
    }

    if (digit) {
      try { event.preventDefault(); } catch (e) { /* ignore */ }

      switch (digit) {
        case "1": openLinkedProducts(product); return;
        case "2": openProductHistory(product); return;
        case "3": openSalesHistory(product); return;
        case "4": openSalesReturnHistory(product); return;
        case "5": openPurchaseHistory(product); return;
        case "6": openPurchaseReturnHistory(product); return;
        case "7": openDeliveryNoteHistory(product); return;
        case "8": openQuotationHistory(product); return;
        case "9": openQuotationSalesHistory(product); return;
        case "0": openQuotationSalesReturnHistory(product); return;
        default: break;
      }
    }

    return;
  }

  const imageViewerRef = useRef();
  let [productImages, setProductImages] = useState([]);

  async function openProductImages(id) {
    let product = await getProduct(id);
    productImages = product?.images;
    setProductImages(productImages);
    imageViewerRef.current.open(0);
  }

  async function getProduct(id) {
    console.log("inside get Product");
    const requestOptions = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: localStorage.getItem("access_token"),
      },
    };

    let searchParams = {};
    if (localStorage.getItem("store_id")) {
      searchParams.store_id = localStorage.getItem("store_id");
    }
    let queryParams = ObjectToSearchQueryParams(searchParams);

    try {
      const response = await fetch(`/v1/product/${id}?${queryParams}`, requestOptions);
      const isJson = response.headers.get("content-type")?.includes("application/json");
      const data = isJson ? await response.json() : null;

      if (!response.ok) {
        const error = data?.errors || "Unknown error";
        throw error;
      }

      return data.result;  // ✅ return the result here
    } catch (error) {
      setProcessing(false);
      setErrors(error);
      return null;  // ✅ explicitly return null or a fallback if there's an error
    }
  }


  let [openProductSearchResult, setOpenProductSearchResult] = useState(false);


  const customFilter = useCallback((option, query) => {
    const normalize = (str) => str?.toLowerCase().replace(/\s+/g, " ").trim() || "";

    const q = normalize(query);
    const qWords = q.split(" ");

    const prefixPart = option.prefix_part_number || "";
    const partNo = option.part_number || "";
    const partNoLabel = prefixPart && partNo ? prefixPart + "-" + partNo : (prefixPart || partNo);

    const fields = [
      partNoLabel,
      prefixPart,
      partNo,
      option.name           || "",
      option.name_in_arabic || "",
      option.country_name   || "",
      option.brand_name     || "",
      option.search_label   || "",
      option.item_code      || "",
      ...(Array.isArray(option.additional_keywords) ? option.additional_keywords : []),
    ];

    const searchable = normalize(fields.join(" "));
    const searchableCompact = fields.join(" ").toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, "")
      .replace(/\s+/g, " ").trim();

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

  // Helper to calculate percentage of occurrence of search words
  const percentOccurrence = (words, product) => {
    let partNoLabel = product.prefix_part_number ? product.prefix_part_number + "-" + product.part_number : "";
    const fields = [
      partNoLabel,
      product.prefix_part_number,
      product.part_number,
      product.name,
      product.name_in_arabic,
      product.country_name,
      product.brand_name,
      ...(Array.isArray(product.additional_keywords) ? product.additional_keywords : []),
    ];
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
    // Percentage: matches / total words in searchable fields
    return searchableWords.length > 0 ? (totalMatches / searchableWords.length) : 0;
  };

  const latestRequestRef = useRef(0);

  async function suggestProducts(searchTerm) {
    const requestId = Date.now();
    latestRequestRef.current = requestId;

    setProductOptions([]);

    if (!searchTerm) {
      setTimeout(() => {
        openProductSearchResult = false;
        setOpenProductSearchResult(false);
      }, 300);
      return;
    }

    const apiSearchTerm = searchTerm
      .replace(/([a-zA-Z؀-ۿ]{2,})(\d{2,})/g, "$1 $2")
      .replace(/(\d{2,})([a-zA-Z؀-ۿ]{2,})/g, "$1 $2")
      .split(/\s+/)
      .map(w => w.replace(/^-+/, ""))
      .filter(Boolean)
      .join(" ");
    var params = {
      search_text: apiSearchTerm || searchTerm,
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

    let Select = `select=id,rack,allow_duplicates,additional_keywords,search_label,set.name,item_code,prefix_part_number,country_name,brand_name,part_number,name,unit,name_in_arabic,product_stores.${localStorage.getItem('store_id')}.purchase_unit_price,product_stores.${localStorage.getItem('store_id')}.purchase_unit_price_with_vat,product_stores.${localStorage.getItem('store_id')}.retail_unit_price,product_stores.${localStorage.getItem('store_id')}.retail_unit_price_with_vat,product_stores.${localStorage.getItem('store_id')}.stock,product_stores.${localStorage.getItem('store_id')}.warehouse_stocks,product_stores.${localStorage.getItem('store_id')}.warehouse_racks`;

    const result = await fetch("/v1/product?" + Select + queryString + "&limit=100&sort=-country_name", requestOptions);
    const data = await result.json();
    // Only update if this is the latest request
    if (latestRequestRef.current !== requestId) return;

    let products = data.result || [];

    if (!products || products.length === 0) {
      openProductSearchResult = false;
      setOpenProductSearchResult(false);
      return;
    }

    openProductSearchResult = true;
    setOpenProductSearchResult(true);

    const filtered = products.filter((opt) => customFilter(opt, searchTerm));

    const sorted = filtered.sort((a, b) => {
      const aHasCountry = a.country_name && a.country_name.trim() !== "";
      const bHasCountry = b.country_name && b.country_name.trim() !== "";

      if (aHasCountry && bHasCountry) {
        return a.country_name.localeCompare(b.country_name);
      }
      if (aHasCountry && !bHasCountry) {
        return -1;
      }
      if (!aHasCountry && bHasCountry) {
        return 1;
      }


      const searchPhrase = searchTerm.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();

      const getSearchable = (item) => {
        let partNoLabel = item.prefix_part_number ? item.prefix_part_number + "-" + item.part_number : "";
        const fields = [
          partNoLabel,
          // item.prefix_part_number,
          // item.part_number,
          item.name,
          item.name_in_arabic,
          item.country_name,
          item.brand_name,
          ...(Array.isArray(item.additional_keywords) ? item.additional_keywords : []),
        ];
        // Use \p{L}\p{N} (Unicode-aware) so Arabic letters are preserved
        return fields.join(" ").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
      };

      const aSearchable = getSearchable(a);
      const bSearchable = getSearchable(b);

      // Find index of the phrase in each string
      const aIndex = aSearchable.indexOf(searchPhrase);
      const bIndex = bSearchable.indexOf(searchPhrase);

      if (aIndex === 0 && bIndex !== 0) return -1;
      if (bIndex === 0 && aIndex !== 0) return 1;

      // If both contain the phrase, sort by earliest occurrence
      if (aIndex !== -1 && bIndex !== -1) {
        if (aIndex < bIndex) return -1;
        if (bIndex < aIndex) return 1;
      } else if (aIndex !== -1) {
        return -1; // a contains phrase, b does not
      } else if (bIndex !== -1) {
        return 1; // b contains phrase, a does not
      }

      const words = searchTerm.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);
      const aPercent = percentOccurrence(words, a);
      const bPercent = percentOccurrence(words, b);

      if (aPercent !== bPercent) {
        return bPercent - aPercent;
      }
      return 0;
    });

    setProductOptions(sorted);
  }

  async function getProductByBarCode(barcode) {
    formData.barcode = barcode;
    setFormData({ ...formData });
    console.log("Inside getProductByBarCode");
    delete errors["bar_code"];
    setErrors({ ...errors });

    console.log("barcode:" + formData.barcode);
    if (!formData.barcode) {
      return;
    }

    if (formData.barcode.length === 13) {
      formData.barcode = formData.barcode.slice(0, -1);
    }

    const requestOptions = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: localStorage.getItem("access_token"),
      },
    };


    let Select = "select=id,item_code,bar_code,ean_12,part_number,name,product_stores,unit,part_number,name_in_arabic";

    let searchParams = {};
    if (localStorage.getItem("store_id")) {
      searchParams.store_id = localStorage.getItem("store_id");
    }
    let queryParams = ObjectToSearchQueryParams(searchParams);

    if (queryParams !== "") {
      queryParams = "&" + queryParams;
    }

    let result = await fetch(
      "/v1/product/barcode/" + formData.barcode + "?" + Select + queryParams,
      requestOptions
    );
    let data = await result.json();


    let product = data.result;
    if (product) {
      addProduct(product);
    } else {
      errors["bar_code"] = "Invalid Barcode:" + formData.barcode
      setErrors({ ...errors });
    }

    formData.barcode = "";
    setFormData({ ...formData });

  }


  function handleCreate(event) {
    event.preventDefault();
    console.log("Inside handle Create");
    console.log("selectedProducts:", selectedProducts);

    formData.products = [];
    for (var i = 0; i < selectedProducts.length; i++) {
      formData.products.push({
        product_id: selectedProducts[i].product_id,
        name: selectedProducts[i].name,
        name_in_arabic: selectedProducts[i].name_in_arabic,
        quantity: parseFloat(selectedProducts[i].quantity),
        unit_price: parseFloat(selectedProducts[i].unit_price) || 0,
        unit_price_with_vat: parseFloat(selectedProducts[i].unit_price_with_vat) || 0,
        purchase_unit_price: parseFloat(selectedProducts[i].purchase_unit_price) || 0,
        purchase_unit_price_with_vat: parseFloat(selectedProducts[i].purchase_unit_price_with_vat) || 0,
        unit_discount: parseFloat(selectedProducts[i].unit_discount) || 0,
        unit_discount_with_vat: parseFloat(selectedProducts[i].unit_discount_with_vat) || 0,
        unit_discount_percent: parseFloat(selectedProducts[i].unit_discount_percent) || 0,
        unit_discount_percent_with_vat: parseFloat(selectedProducts[i].unit_discount_percent_with_vat) || 0,
        unit: selectedProducts[i].unit,
      });
    }

    formData.discount = parseFloat(formData.discount) || 0;
    formData.discount_with_vat = parseFloat(formData.discount_with_vat) || 0;
    formData.discount_percent = parseFloat(formData.discount_percent) || 0;
    formData.discount_percent_with_vat = parseFloat(formData.discount_percent_with_vat) || 0;
    formData.vat_percent = parseFloat(formData.vat_percent);
    formData.shipping_handling_fees = parseFloat(formData.shipping_handling_fees) || 0;
    formData.rounding_amount = parseFloat(formData.rounding_amount) || 0;
    formData.auto_rounding_amount = formData.auto_rounding_amount || false;

    if (localStorage.getItem('store_id')) {
      formData.store_id = localStorage.getItem('store_id');
    }

    console.log("formData.discount:", formData.discount);

    let endPoint = "/v1/delivery-note";
    let method = "POST";
    if (formData.id) {
      endPoint = "/v1/delivery-note/" + formData.id;
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
          if (props.showToastMessage) props.showToastMessage("Delivery note updated successfully!", "success");
        } else {
          if (props.showToastMessage) props.showToastMessage("Delivery note created successfully!", "success");
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
        if (props.showToastMessage) props.showToastMessage("Failed to process delivery note!", "danger");
      });
  }

  function isProductAdded(productID) {
    for (var i = 0; i < selectedProducts.length; i++) {
      if (selectedProducts[i].product_id === productID) {
        return true;
      }
    }
    return false;
  }

  // eslint-disable-next-line no-unused-vars
  function handleImportFromPO(po) {
    if (!po || !po.products || po.products.length === 0) return;
    po.products.forEach(p => {
      const already = selectedProducts.findIndex(s => s.product_id === p.product_id);
      if (already >= 0) {
        selectedProducts[already].quantity = parseFloat(selectedProducts[already].quantity || 0) + parseFloat(p.quantity || 1);
      } else {
        const qty = parseFloat(p.quantity) || 1;
        selectedProducts.push({
          product_id: p.product_id,
          code: p.item_code || "",
          part_number: p.part_number || "",
          name: p.name || "",
          name_in_arabic: p.name_in_arabic || "",
          quantity: qty,
          unit: p.unit || "",
          stock: 0,
          unit_price: 0,
          unit_price_with_vat: 0,
          purchase_unit_price: parseFloat(p.purchase_unit_price) || 0,
          purchase_unit_price_with_vat: parseFloat(p.purchase_unit_price_with_vat) || 0,
          unit_discount: 0,
          unit_discount_with_vat: 0,
          line_total: 0,
          line_total_with_vat: 0,
        });
      }
    });
    setSelectedProducts([...selectedProducts]);
    reCalculate();
  }

  function addProduct(product) {
    console.log("Inside Add product");
    if (!formData.store_id) {
      errors.product_id = "Please Select a Store and try again";
      setErrors({ ...errors });
      return false;
    }


    delete errors["product_id"];

    if (!product) {
      errors.product_id = "Invalid Product";
      setErrors({ ...errors });
      return false;
    }

    const productStore = product.product_stores?.[formData.store_id] || {};
    product.unit_price = productStore.retail_unit_price || 0.00;
    product.unit_price_with_vat = productStore.retail_unit_price_with_vat ||
      (product.unit_price ? parseFloat(trimTo2Decimals(product.unit_price * (1 + (parseFloat(formData.vat_percent || 0) / 100)))) : 0.00);
    product.purchase_unit_price = productStore.purchase_unit_price || 0.00;
    product.purchase_unit_price_with_vat = productStore.purchase_unit_price_with_vat ||
      (product.purchase_unit_price ? parseFloat(trimTo2Decimals(product.purchase_unit_price * (1 + (parseFloat(formData.vat_percent || 0) / 100)))) : 0.00);

    let alreadyAdded = false;
    let index = -1;
    let quantity = 0.00;
    product.quantity = 1.00;

    if (isProductAdded(product.id) && !product.allow_duplicates) {
      alreadyAdded = true;
      index = getProductIndex(product.id);
      quantity = parseFloat(selectedProducts[index].quantity) + parseFloat(product.quantity);
    } else {
      quantity = parseFloat(product.quantity);
    }

    console.log("quantity:", quantity);

    delete errors["quantity"];

    if (alreadyAdded) {
      selectedProducts[index].quantity = parseFloat(quantity);
    }

    //alert("Adding product: " + product.part_number + " with quantity: " + quantity);

    if (!alreadyAdded) {
      let item = {
        product_id: product.id,
        code: product.item_code,
        part_number: product.part_number,
        name: product.name,
        name_in_arabic: product.name_in_arabic || "",
        quantity: product.quantity,
        stores: product.stores,
        unit: product.unit,
        stock: product.product_stores?.[localStorage.getItem("store_id")]?.stock || 0,
      };

      item.unit_price = parseFloat(product.unit_price) || 0;
      item.unit_price_with_vat = parseFloat(product.unit_price_with_vat) || 0;
      item.purchase_unit_price = parseFloat(product.purchase_unit_price) || 0;
      item.purchase_unit_price_with_vat = parseFloat(product.purchase_unit_price_with_vat) || 0;
      item.unit_discount = 0;
      item.unit_discount_with_vat = 0;
      item.line_total = parseFloat(trimTo2Decimals(item.unit_price * (product.quantity || 1)));
      item.line_total_with_vat = parseFloat(trimTo2Decimals(item.unit_price_with_vat * (product.quantity || 1)));

      selectedProducts.push(item);

    }
    console.log("selectedProducts:", selectedProducts);
    setSelectedProducts([...selectedProducts]);
    reCalculate();
    return true;
  }

  function getProductIndex(productID) {
    for (var i = 0; i < selectedProducts.length; i++) {
      if (selectedProducts[i].product_id === productID) {
        return i;
      }
    }
    return false;
  }

  function removeProduct(product) {
    let index = selectedProducts.indexOf(product);
    if (index === -1) {
      index = getProductIndex(product.id);
    }

    if (index > -1) {
      selectedProducts.splice(index, 1);
      removeWarningAndError(index);
    }
    setSelectedProducts([...selectedProducts]);

    reCalculate();
  }

  let [totalPrice, setTotalPrice] = useState(0.0);

  function CalCulateLineTotals(index) {
    selectedProducts[index].line_total = parseFloat(trimTo2Decimals(
      (selectedProducts[index]?.unit_price - (selectedProducts[index]?.unit_discount || 0)) * selectedProducts[index]?.quantity
    ));
    selectedProducts[index].line_total_with_vat = parseFloat(trimTo2Decimals(
      ((selectedProducts[index]?.unit_price_with_vat || 0) - (selectedProducts[index]?.unit_discount_with_vat || 0)) * selectedProducts[index]?.quantity
    ));
    setSelectedProducts([...selectedProducts]);
  }

  let [discountPercent, setDiscountPercent] = useState(0.00);
  let [discountPercentWithVAT, setDiscountPercentWithVAT] = useState(0.00);

  async function reCalculate() {
    const requestId = Date.now();
    recalcRequestRef.current = requestId;

    if (!formData.discount) formData.discount = 0;
    if (!formData.discount_with_vat) formData.discount_with_vat = 0;
    if (!formData.rounding_amount) formData.rounding_amount = 0;
    if (!formData.shipping_handling_fees) formData.shipping_handling_fees = 0;

    formData.products = [];
    for (var i = 0; i < selectedProducts.length; i++) {
      formData.products.push({
        product_id: selectedProducts[i].product_id,
        quantity: parseFloat(selectedProducts[i].quantity) || 0,
        unit_price: parseFloat(selectedProducts[i].unit_price) || 0,
        unit_price_with_vat: parseFloat(selectedProducts[i].unit_price_with_vat) || 0,
        purchase_unit_price: parseFloat(selectedProducts[i].purchase_unit_price) || 0,
        purchase_unit_price_with_vat: parseFloat(selectedProducts[i].purchase_unit_price_with_vat) || 0,
        unit_discount: parseFloat(selectedProducts[i].unit_discount) || 0,
        unit_discount_with_vat: parseFloat(selectedProducts[i].unit_discount_with_vat) || 0,
        unit: selectedProducts[i].unit,
      });
    }

    const requestOptions = {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: localStorage.getItem("access_token"),
      },
      body: JSON.stringify(formData),
    };

    try {
      const result = await fetch("/v1/delivery-note/calculate-net-total", requestOptions);
      if (!result.ok) return;
      if (recalcRequestRef.current !== requestId) return;
      const res = await result.json();
      if (res.result) {
        formData.total = res.result.total || 0;
        formData.total_with_vat = res.result.total_with_vat || 0;
        formData.vat_price = res.result.vat_price || 0;
        formData.net_total = res.result.net_total || 0;
        if (res.result.discount_percent !== undefined) {
          discountPercent = res.result.discount_percent;
          setDiscountPercent(discountPercent);
        }
        if (res.result.discount_percent_with_vat !== undefined) {
          discountPercentWithVAT = res.result.discount_percent_with_vat;
          setDiscountPercentWithVAT(discountPercentWithVAT);
        }
        if (formData.auto_rounding_amount && res.result.rounding_amount !== undefined) {
          formData.rounding_amount = res.result.rounding_amount;
        }
        totalPrice = formData.total;
        setTotalPrice(totalPrice);
        setFormData({ ...formData });
      }
    } catch (e) {
      console.error("reCalculate error:", e);
    }
  }

  const CustomerCreateFormRef = useRef();
  function openCustomerCreateForm() {
    CustomerCreateFormRef.current.open();
  }


  const ProductCreateFormRef = useRef();
  const PurchaseOrderPickerRef = useRef();
  function openProductCreateForm() {
    ProductCreateFormRef.current.open();
  }

  function openProductUpdateForm(id) {
    lastEditedProductIdRef.current = id;
    ProductCreateFormRef.current.open(id);
  }

  async function refreshEditedProduct() {
    const id = lastEditedProductIdRef.current;
    if (!id) return;
    const product = await getProduct(id);
    if (!product) return;
    const productStore = product.product_stores?.[formData.store_id] || {};
    setSelectedProducts(prev => prev.map(item => {
      if (item.product_id !== id) return item;
      return {
        ...item,
        code: product.item_code,
        part_number: product.part_number,
        name: product.name,
        name_in_arabic: product.name_in_arabic || "",
        unit: product.unit,
        stock: product.product_stores?.[localStorage.getItem("store_id")]?.stock ?? item.stock,
        unit_price: productStore.retail_unit_price ?? item.unit_price,
        unit_price_with_vat: productStore.retail_unit_price_with_vat ?? item.unit_price_with_vat,
        purchase_unit_price: productStore.purchase_unit_price ?? item.purchase_unit_price,
        purchase_unit_price_with_vat: productStore.purchase_unit_price_with_vat ?? item.purchase_unit_price_with_vat,
      };
    }));
  }

  const UserCreateFormRef = useRef();



  const SignatureCreateFormRef = useRef();



  const ProductDetailsViewRef = useRef();
  function openProductDetailsView(id) {
    ProductDetailsViewRef.current.open(id);
  }

  const PreviewRef = useRef();
  function openPreview() {
    let model = {};
    model = JSON.parse(JSON.stringify(formData));
    model.products = selectedProducts;

    //setFormData({ ...formData });
    PreviewRef.current.open(model, undefined, "delivery_note");
  }

  const ProductsRef = useRef();
  function openLinkedProducts(model) {
    ProductsRef.current.open(true, "linked_products", model);
  }


  const SalesHistoryRef = useRef();
  function openSalesHistory(model) {
    SalesHistoryRef.current.open(model, selectedCustomers);
  }

  const SalesReturnHistoryRef = useRef();
  function openSalesReturnHistory(model) {
    SalesReturnHistoryRef.current.open(model, selectedCustomers);
  }


  const PurchaseHistoryRef = useRef();
  function openPurchaseHistory(model) {
    PurchaseHistoryRef.current.open(model);
  }

  const PurchaseReturnHistoryRef = useRef();
  function openPurchaseReturnHistory(model) {
    PurchaseReturnHistoryRef.current.open(model);
  }


  const DeliveryNoteHistoryRef = useRef();
  function openDeliveryNoteHistory(model) {
    DeliveryNoteHistoryRef.current.open(model, selectedCustomers);
  }


  const QuotationHistoryRef = useRef();
  function openQuotationHistory(model, type) {
    QuotationHistoryRef.current.open(model, selectedCustomers, type);
  }

  /*

  const handleSelectedProducts = (selected) => {
    console.log("Selected Products:", selected);
    let addedCount = 0;
    for (var i = 0; i < selected.length; i++) {
      if (addProduct(selected[i])) {
        addedCount++;
      }
    }
    setToastMessage(`${addedCount} product${addedCount !== 1 ? "s" : ""} added ✅`);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);

    // if(props.showToastMessage) props.showToastMessage("Successfully Added " + selected.length + " products", "success");
  };
  */


  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const CustomersRef = useRef();
  function openCustomers(model) {
    CustomersRef.current.open();
  }

  const handleSelectedCustomer = (selectedCustomer) => {
    console.log("selectedCustomer:", selectedCustomer);
    setSelectedCustomers([selectedCustomer])
    formData.customer_id = selectedCustomer.id;
    setFormData({ ...formData });
  };


  //Select Products
  const [selectedIds, setSelectedIds] = useState([]);

  // Handle all select
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(selectedProducts.map((p) => p.product_id));
    } else {
      setSelectedIds([]);
    }
  };

  // Handle individual selection
  const handleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const isAllSelected = selectedIds?.length === selectedProducts?.length;

  const handleSendSelected = () => {
    const newlySelectedProducts = selectedProducts.filter((p) => selectedIds.includes(p.product_id));
    if (props.onSelectProducts) {
      const dnModel = store?.settings?.add_price_details_in_delivery_note ? formData : undefined;
      props.onSelectProducts(newlySelectedProducts, selectedCustomers, "delivery_note", formData.id, formData.code, formData.remarks, dnModel); // Send to parent
    }

    handleClose();
  };

  function openProducts() {
    ProductsRef.current.open(true);
  }


  const handleSelectedProductsToDeliveryNote = (selected) => {
    console.log("Selected Products:", selected);
    let addedCount = 0;
    for (var i = 0; i < selected.length; i++) {
      if (addProduct(selected[i])) {
        addedCount++;
      }
    }
    setToastMessage(`${addedCount} product${addedCount !== 1 ? "s" : ""} added ✅`);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const productSearchRef = useRef();



  const inputRefs = useRef({});
  const handleFocus = (rowIdx, field) => {
    const ref = inputRefs.current?.[rowIdx]?.[field];
    if (ref && ref.select) {
      ref.select();
    }
  };

  function moveToProductSearch() {
    setTimeout(() => {
      productSearchRef.current?.focus();
    }, 300);
  }



  function moveToProductQuantityInputBox() {
    setTimeout(() => {
      let index = (selectedProducts.length - 1);
      const input = document.getElementById('delivery_note_quantity_' + index);
      console.log("Moving to qty field");
      input?.focus();
      //  input

    }, 300);
  }

  const customerSearchRef = useRef();
  const timerRef = useRef(null);

  const [openSummaryTooltip, setOpenSummaryTooltip] = useState(null);

  const _dnPopoverStyle = { maxWidth: '340px', minWidth: '240px', background: '#212529', border: '1px solid #495057', boxShadow: '0 4px 14px rgba(0,0,0,.45)', borderRadius: '6px', color: '#f8f9fa' };
  const _dnPopoverHeaderStyle = { background: '#212529', borderBottom: '1px solid #495057', color: '#f8f9fa', fontSize: '0.78rem', fontWeight: 700, padding: '6px 10px 6px 12px', borderRadius: '6px 6px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
  const _dnPopoverBodyStyle = { padding: 0, background: '#212529', borderRadius: '0 0 6px 6px' };
  const _dnCloseBtn = (id) => (
    <button type="button" onClick={(e) => { e.stopPropagation(); setOpenSummaryTooltip(null); }}
      style={{ background: 'none', border: 'none', color: '#adb5bd', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1, padding: '0 0 0 8px' }}>×</button>
  );
  const _dnRow = (label, value, divider = false, bold = false, color = null) => (
    <tr style={{ lineHeight: 1.7, borderTop: divider ? '1px solid #495057' : 'none' }}>
      <td style={{ padding: divider ? '5px 6px 2px 12px' : '1px 6px 1px 12px', color: '#adb5bd', whiteSpace: 'nowrap', verticalAlign: 'top', width: '1%', fontSize: '0.74rem' }}>{label}</td>
      <td style={{ padding: divider ? '5px 12px 2px 4px' : '1px 12px 1px 4px', textAlign: 'right', fontWeight: bold ? 700 : 400, color: color || '#f8f9fa', whiteSpace: 'nowrap', fontSize: '0.74rem', fontVariantNumeric: 'tabular-nums' }}>{value}</td>
    </tr>
  );

  const renderTaxableAmountTooltip = () => {
    const total = trimTo2Decimals(formData.total || 0);
    const shipping = trimTo2Decimals(formData.shipping_handling_fees || 0);
    const discount = trimTo2Decimals(formData.discount || 0);
    const result = trimTo2Decimals((formData.total || 0) + (formData.shipping_handling_fees || 0) - (formData.discount || 0));
    return (
      <Popover id="dn-taxable-tooltip" style={_dnPopoverStyle}>
        <Popover.Header style={_dnPopoverHeaderStyle}>
          <span>Taxable Amount (ex. VAT)</span>{_dnCloseBtn()}
        </Popover.Header>
        <Popover.Body style={_dnPopoverBodyStyle}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>
            {_dnRow('Total (ex. VAT)', total)}
            {_dnRow('+ Shipping', shipping)}
            {_dnRow('− Discount (ex. VAT)', discount)}
            {_dnRow('= Taxable Amount', `SAR ${result}`, true, true, '#74c0fc')}
          </tbody></table>
        </Popover.Body>
      </Popover>
    );
  };

  const renderNetTotalBeforeRoundingTooltip = () => {
    const taxable = trimTo2Decimals((formData.total || 0) + (formData.shipping_handling_fees || 0) - (formData.discount || 0));
    const vat = trimTo2Decimals(formData.vat_price || 0);
    const result = trimTo2Decimals((formData.net_total || 0) - (formData.rounding_amount || 0));
    return (
      <Popover id="dn-net-before-rounding-tooltip" style={_dnPopoverStyle}>
        <Popover.Header style={_dnPopoverHeaderStyle}>
          <span>Net Total Before Rounding</span>{_dnCloseBtn()}
        </Popover.Header>
        <Popover.Body style={_dnPopoverBodyStyle}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>
            {_dnRow('Taxable Amount', taxable)}
            {_dnRow(`+ VAT (${formData.vat_percent || 0}%)`, vat)}
            {_dnRow('= Before Rounding', `SAR ${result}`, true, true, '#74c0fc')}
          </tbody></table>
        </Popover.Body>
      </Popover>
    );
  };

  const renderNetTotalTooltip = () => {
    const taxable = trimTo2Decimals((formData.total || 0) + (formData.shipping_handling_fees || 0) - (formData.discount || 0));
    const vat = trimTo2Decimals(formData.vat_price || 0);
    const rounding = formData.rounding_amount || 0;
    const net = trimTo2Decimals(formData.net_total || 0);
    return (
      <Popover id="dn-net-total-tooltip" style={_dnPopoverStyle}>
        <Popover.Header style={_dnPopoverHeaderStyle}>
          <span>Net Total (inc. VAT)</span>{_dnCloseBtn()}
        </Popover.Header>
        <Popover.Body style={_dnPopoverBodyStyle}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>
            {_dnRow('Taxable Amount', taxable)}
            {_dnRow(`+ VAT (${formData.vat_percent || 0}%)`, vat)}
            {_dnRow(`${rounding >= 0 ? '+ ' : '− '}Rounding`, trimTo2Decimals(Math.abs(rounding)))}
            {_dnRow('= Net Total (inc. VAT)', `SAR ${net}`, true, true, '#69db7c')}
          </tbody></table>
        </Popover.Body>
      </Popover>
    );
  };

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


  const onChangeTriggeredRef = useRef(false);

  const ProductHistoryRef = useRef();
  function openProductHistory(model) {
    ProductHistoryRef.current.open(model);
  }



  //Product Search Settings
  const [showProductSearchSettings, setShowProductSearchSettings] = useState(false);

  // Initial column config

  const defaultSearchProductsColumns = useMemo(() => [
    { key: "select", label: "Select", fieldName: "select", width: 3, visible: true },
    { key: "part_number", label: "Part Number", fieldName: "part_number", width: 12, visible: true },
    { key: "name", label: "Name", fieldName: "name", width: 26, visible: true },
    { key: "unit_price", label: "S.Unit Price", fieldName: "unit_price", width: 10, visible: true },
    { key: "stock", label: "Stock", fieldName: "stock", width: 13, visible: true },
    { key: "photos", label: "Photos", fieldName: "photos", width: 5, visible: true },
    { key: "brand", label: "Brand", fieldName: "brand", width: 8, visible: true },
    { key: "purchase_price", label: "P.Unit Price", fieldName: "purchase_price", width: 10, visible: true },
    { key: "country", label: "Country", fieldName: "country", width: 8, visible: true },
    { key: "rack", label: "Rack", fieldName: "rack", width: 5, visible: true },
  ], []);



  const [searchProductsColumns, setSearchProductsColumns] = useState(defaultSearchProductsColumns);

  const visibleColumns = searchProductsColumns.filter(c => c.visible);

  const totalWidth = visibleColumns.reduce((sum, col) => sum + col.width, 0);

  const getColumnWidth = (col) => `${(col.width / totalWidth) * 100}%`;

  const startPsColResize = useCallback((e, colKey) => {
      e.preventDefault(); e.stopPropagation();
      const startX = e.clientX;
      let currentCols = null;
      setSearchProductsColumns(prev => { currentCols = prev; return prev; });
      setTimeout(() => {
          const cols = currentCols;
          if (!cols) return;
          const col = cols.find(c => c.key === colKey);
          if (!col) return;
          const startWidth = col.width;
          const totalW = cols.filter(c => c.visible).reduce((s, c) => s + c.width, 0);
          const pxPerUnit = (window.innerWidth * 0.95) / totalW;
          function onMouseMove(ev) {
              const newWidth = Math.max(1, startWidth + (ev.clientX - startX) / pxPerUnit);
              setSearchProductsColumns(prev => {
                  const updated = prev.map(c => c.key === colKey ? { ...c, width: parseFloat(newWidth.toFixed(1)) } : c);
                  localStorage.setItem("delivery_note_product_search_settings", JSON.stringify(updated));
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

  const handleToggleColumn = (index) => {
    const updated = [...searchProductsColumns];
    updated[index].visible = !updated[index].visible;
    setSearchProductsColumns(updated);
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const reordered = Array.from(searchProductsColumns);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    setSearchProductsColumns(reordered);
  };



  function RestoreDefaultSettings() {
    const clonedDefaults = defaultSearchProductsColumns.map(col => ({ ...col }));
    localStorage.setItem("delivery_note_product_search_settings", JSON.stringify(clonedDefaults));
    setSearchProductsColumns(clonedDefaults);

    setShowSuccess(true);
    setSuccessMessage("Successfully restored to default settings!");
  }


  // Load settings from localStorage
  useEffect(() => {
    const clonedDefaults = defaultSearchProductsColumns.map(col => ({ ...col }));

    let saved = localStorage.getItem("delivery_note_product_search_settings");
    if (saved) {
      setSearchProductsColumns(JSON.parse(saved));
    } else {
      setSearchProductsColumns(clonedDefaults.map(col => ({ ...col })));
    }

    let missingOrUpdated = false;
    for (let i = 0; i < clonedDefaults.length; i++) {
      if (!saved) break;

      const savedCol = JSON.parse(saved)?.find(col => col.fieldName === clonedDefaults[i].fieldName);
      missingOrUpdated = !savedCol || savedCol.label !== clonedDefaults[i].label || savedCol.key !== clonedDefaults[i].key;
      if (missingOrUpdated) break;
    }

    if (missingOrUpdated) {

      localStorage.setItem("delivery_note_product_search_settings", JSON.stringify(clonedDefaults));
      setSearchProductsColumns(clonedDefaults);
    }
  }, [defaultSearchProductsColumns]);


  // Skip the first run so we don't overwrite saved settings during initial hydration
  const isFirstRun = useRef(true);
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    localStorage.setItem("delivery_note_product_search_settings", JSON.stringify(searchProductsColumns));
  }, [searchProductsColumns]);

  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState(false);
  const [showDNSPSettings, setShowDNSPSettings] = useState(false);

  const _dnSummaryDefaultOrder = ['total_without_vat', 'total_with_vat', 'shipping', 'discount_without_vat', 'discount_with_vat', 'taxable_amount', 'vat', 'net_before_rounding', 'rounding'];
  const _dnSummaryLabels = { total_without_vat: 'Total (ex. VAT)', total_with_vat: 'Total (inc. VAT)', shipping: 'Shipping & Handling', discount_without_vat: 'Discount (ex. VAT)', discount_with_vat: 'Discount (inc. VAT)', taxable_amount: 'Taxable Amount (ex. VAT)', vat: 'VAT', net_before_rounding: 'Before Rounding', rounding: 'Rounding' };
  const [dnSummaryVisible, setDnSummaryVisible] = useState(() => {
    try { const s = localStorage.getItem('dn_summary_visible'); if (s) return JSON.parse(s); } catch {}
    return Object.fromEntries(_dnSummaryDefaultOrder.map(k => [k, true]));
  });
  const [dnSummaryOrder, setDnSummaryOrder] = useState(() => {
    try { const s = localStorage.getItem('dn_summary_order'); if (s) return JSON.parse(s); } catch {}
    return _dnSummaryDefaultOrder;
  });
  const [showDNSummarySettings, setShowDNSummarySettings] = useState(false);

  const [showCustomerSearchSettings, setShowCustomerSearchSettings] = useState(false);
  const [customerSearchColumns, setCustomerSearchColumns] = useState(() => {
    try {
      const saved = localStorage.getItem(DN_CUSTOMER_COLS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const keyMap = {};
        parsed.forEach(c => { keyMap[c.key] = c; });
        return DEFAULT_DN_CUSTOMER_COLS.map(d => keyMap[d.key] ? { ...d, ...keyMap[d.key] } : d);
      }
    } catch {}
    return DEFAULT_DN_CUSTOMER_COLS.map(c => ({ ...c }));
  });

  const dnSummaryDragRef = useRef(null);
  const updateDnSummaryVisible = (key, val) => {
    const next = { ...dnSummaryVisible, [key]: val };
    setDnSummaryVisible(next);
    localStorage.setItem('dn_summary_visible', JSON.stringify(next));
  };
  const reorderDnSummary = (from, to) => {
    const arr = [...dnSummaryOrder];
    const [item] = arr.splice(from, 1);
    arr.splice(to, 0, item);
    setDnSummaryOrder(arr);
    localStorage.setItem('dn_summary_order', JSON.stringify(arr));
  };
  const DN_COL_DEFAULTS = useMemo(() => ({ delete: 32, si_no: 36, select: 36, part_number: 80, name: 100, info: 32, qty: 117, unit_price: 80, unit_price_with_vat: 80, purchase_unit_price: 80, purchase_unit_price_with_vat: 80, unit_discount: 70, unit_discount_with_vat: 70, price: 80, price_with_vat: 80 }), []);
  const [colWidths, setColWidths] = useState(() => {
    try { return JSON.parse(localStorage.getItem('dn_sp_col_widths') || '{}'); } catch { return {}; }
  });
  const colResizeRef = useRef(null);
  const startColResize = useCallback((e, colKey, defaultWidth) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = colWidths[colKey] ?? defaultWidth ?? DN_COL_DEFAULTS[colKey] ?? 60;
    function onMouseMove(ev) {
      const w = Math.max(40, startWidth + ev.clientX - startX);
      setColWidths(prev => {
        const next = { ...prev, [colKey]: w };
        localStorage.setItem('dn_sp_col_widths', JSON.stringify(next));
        return next;
      });
    }
    function onMouseUp() {
      colResizeRef.current = null;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    colResizeRef.current = colKey;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [colWidths, DN_COL_DEFAULTS]);
  const defaultDNSPColumns = [
    { key: 'delete', label: 'Delete', visible: true },
    { key: 'si_no', label: 'SI No.', visible: true },
    { key: 'select', label: 'Select (Product Selection)', visible: true },
    { key: 'part_number', label: 'Part No.', visible: true },
    { key: 'name', label: 'Name', visible: true },
    { key: 'info', label: 'Info', visible: true },
    { key: 'purchase_unit_price', label: 'Purchase Unit Price(without VAT)', visible: true },
    { key: 'purchase_unit_price_with_vat', label: 'Purchase Unit Price(with VAT)', visible: false },
    { key: 'qty', label: 'Qty', visible: true },
    { key: 'unit_price', label: 'Unit Price(without VAT)', visible: true },
    { key: 'unit_price_with_vat', label: 'Unit Price(with VAT)', visible: true },
    { key: 'unit_discount', label: 'Unit Disc.(without VAT)', visible: false },
    { key: 'unit_discount_with_vat', label: 'Unit Disc.(with VAT)', visible: false },
    { key: 'price', label: 'Price(without VAT)', visible: true },
    { key: 'price_with_vat', label: 'Price(with VAT)', visible: true },
  ];
  const [dnSPColumns, setDnSPColumns] = useState(() => {
    try {
      const saved = localStorage.getItem('dn_sp_table_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        const merged = defaultDNSPColumns.map(def => {
          const found = parsed.find(p => p.key === def.key);
          return found ? { ...def, visible: found.visible } : def;
        });
        return merged;
      }
    } catch (e) { }
    return defaultDNSPColumns;
  });
  useEffect(() => {
    localStorage.setItem('dn_sp_table_settings', JSON.stringify(dnSPColumns));
  }, [dnSPColumns]);
  const handleToggleDNSPColumn = (key) => {
    setDnSPColumns(cols => cols.map(c => c.key === key ? { ...c, visible: !c.visible } : c));
  };
  const onDragEndDNSP = (result) => {
    if (!result.destination) return;
    const items = Array.from(dnSPColumns);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    setDnSPColumns(items);
  };
  const restoreDefaultDNSPSettings = () => {
    setDnSPColumns(defaultDNSPColumns);
    localStorage.removeItem('dn_sp_table_settings');
  };


  // ── Customer Search Column Settings ────────────────────────────────────────
  function handleToggleCustomerCol(index) {
    const updated = customerSearchColumns.map((c, i) => i === index ? { ...c, visible: !c.visible } : c);
    setCustomerSearchColumns(updated);
    localStorage.setItem(DN_CUSTOMER_COLS_KEY, JSON.stringify(updated));
  }
  function handleCustomerColDragEnd(result) {
    if (!result.destination) return;
    const reordered = Array.from(customerSearchColumns);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    setCustomerSearchColumns(reordered);
    localStorage.setItem(DN_CUSTOMER_COLS_KEY, JSON.stringify(reordered));
  }
  function restoreCustomerColDefaults() {
    const cloned = DEFAULT_DN_CUSTOMER_COLS.map(c => ({ ...c }));
    setCustomerSearchColumns(cloned);
    localStorage.setItem(DN_CUSTOMER_COLS_KEY, JSON.stringify(cloned));
  }
  const startCustomerColResize = useCallback((e, colKey) => {
    e.preventDefault(); e.stopPropagation();
    const startX = e.clientX;
    let currentCols = null;
    setCustomerSearchColumns(prev => { currentCols = prev; return prev; });
    setTimeout(() => {
      const cols = currentCols || DEFAULT_DN_CUSTOMER_COLS;
      const col = cols.find(c => c.key === colKey);
      if (!col) return;
      const startWidth = col.width;
      const totalW = cols.filter(c => c.visible).reduce((s, c) => s + c.width, 0);
      const pxPerUnit = (window.innerWidth * 0.95) / totalW;
      function onMouseMove(ev) {
        const newWidth = Math.max(3, startWidth + (ev.clientX - startX) / pxPerUnit);
        setCustomerSearchColumns(prev => {
          const updated = prev.map(c => c.key === colKey ? { ...c, width: parseFloat(newWidth.toFixed(1)) } : c);
          localStorage.setItem(DN_CUSTOMER_COLS_KEY, JSON.stringify(updated));
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
  // ───────────────────────────────────────────────────────────────────────────

  // ── Design tokens ──────────────────────────────────────────────────────────
  const INPUT = { border: '1px solid #c3c6d7', borderRadius: '4px', padding: '7px 12px', fontSize: '13px', fontFamily: '"Inter", sans-serif', width: '100%', outline: 'none', color: '#191c1e', background: '#fff' };

  const Label = ({ children, required }) => (
    <label style={{ display: 'block', fontFamily: '"Inter", sans-serif', fontSize: '13px', fontWeight: 600, color: '#191c1e', marginBottom: '4px' }}>
      {children}{required && <span style={{ color: '#ba1a1a', marginLeft: '2px' }}>*</span>}
    </label>
  );
  // ───────────────────────────────────────────────────────────────────────────

  const allErrors = Object.entries(errors).filter(([, v]) => v);
  const totalErrors = allErrors.length;

  return (
    <>


      <SuccessModal show={showSuccess} message={successMessage} onClose={() => setShowSuccess(false)} />

      <TableSettingsModal
          show={showProductSearchSettings}
          onHide={() => setShowProductSearchSettings(false)}
          title="Product Search Settings"
          columns={searchProductsColumns}
          onToggleColumn={handleToggleColumn}
          onDragEnd={onDragEnd}
          onRestoreDefaults={RestoreDefaultSettings}
      />
      <TableSettingsModal
          show={showCustomerSearchSettings}
          onHide={() => setShowCustomerSearchSettings(false)}
          title="Customer Search Settings"
          columns={customerSearchColumns}
          onToggleColumn={handleToggleCustomerCol}
          onDragEnd={handleCustomerColDragEnd}
          onRestoreDefaults={restoreCustomerColDefaults}
      />
      <ProductHistory ref={ProductHistoryRef} showToastMessage={props.showToastMessage} />
      <ImageViewerModal ref={imageViewerRef} images={productImages} />
      <Customers ref={CustomersRef} onSelectCustomer={handleSelectedCustomer} showToastMessage={props.showToastMessage} />
      <Products ref={ProductsRef} onSelectProducts={handleSelectedProductsToDeliveryNote} showToastMessage={props.showToastMessage} />
      <SalesHistory ref={SalesHistoryRef} showToastMessage={props.showToastMessage} />
      <SalesReturnHistory ref={SalesReturnHistoryRef} showToastMessage={props.showToastMessage} />
      <PurchaseHistory ref={PurchaseHistoryRef} showToastMessage={props.showToastMessage} />
      <PurchaseReturnHistory ref={PurchaseReturnHistoryRef} showToastMessage={props.showToastMessage} />
      <QuotationHistory ref={QuotationHistoryRef} showToastMessage={props.showToastMessage} />
      <QuotationSalesReturnHistory ref={QuotationSalesReturnHistoryRef} showToastMessage={props.showToastMessage} />
      <DeliveryNoteHistory ref={DeliveryNoteHistoryRef} showToastMessage={props.showToastMessage} />

      <div
        className="toast-container position-fixed top-0 end-0 p-3"
        style={{ zIndex: 9999 }}
      >
        <div
          className={`toast align-items-center text-white bg-success ${showToast ? "show" : "hide"}`}
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
        >
          <div className="d-flex">
            <div className="toast-body">{toastMessage}</div>
            <button
              type="button"
              className="btn-close btn-close-white me-2 m-auto"
              onClick={() => setShowToast(false)}
            ></button>
          </div>
        </div>
      </div>

      <ProductView ref={ProductDetailsViewRef} openUpdateForm={openProductUpdateForm} openCreateForm={openProductCreateForm} />
      <ProductCreate ref={ProductCreateFormRef} showToastMessage={props.showToastMessage} openDetailsView={openProductDetailsView} refreshList={refreshEditedProduct} />
      <PurchaseOrderPicker ref={PurchaseOrderPickerRef} />
      <Preview ref={PreviewRef} />
      <CustomerCreate ref={CustomerCreateFormRef} showToastMessage={props.showToastMessage}
        onUpdated={(updatedCustomer) => {
          if (updatedCustomer.id === formData.customer_id) {
            setSelectedCustomers([updatedCustomer]);
            formData.customer_name = updatedCustomer.name;
            setFormData({ ...formData });
          }
        }}
      />
      <UserCreate ref={UserCreateFormRef} showToastMessage={props.showToastMessage} />
      <SignatureCreate ref={SignatureCreateFormRef} showToastMessage={props.showToastMessage} />
      <Modal show={show} fullscreen onHide={handleClose} animation={false} backdrop="static" dialogClassName="pw-modal">
        <Modal.Header style={{ background: '#ffffff', borderBottom: '1px solid #c3c6d7', padding: '5px 20px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button type="button" onClick={handleClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#434655', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 600, fontFamily: 'Inter, sans-serif', padding: '4px 8px', borderRadius: '4px', flexShrink: 0 }}
            onMouseEnter={e => e.currentTarget.style.background = '#f0f2f4'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}>
            <i className="bi bi-arrow-left" style={{ fontSize: '16px' }}></i> Back
          </button>
          <Modal.Title style={{ fontFamily: '"Hanken Grotesk", sans-serif', fontSize: '17px', fontWeight: 700, color: '#191c1e', letterSpacing: '-0.01em', flex: 1 }}>
            {formData.id ? 'Update Delivery Note' : 'Create New Delivery Note'}
          </Modal.Title>
          <div className="d-flex align-items-center gap-2 dn-hdr-actions">
            <Button variant="light" size="sm" onClick={openPreview} style={{ fontFamily: '"Inter", sans-serif', fontSize: '13px' }}>
              <i className="bi bi-display me-1"></i>Preview
            </Button>
            {formData.id && (
              <button type="button"
                style={{ background: '#d0e1fb', color: '#54647a', border: 'none', borderRadius: '4px', padding: '6px 14px', fontSize: '13px', fontWeight: 600, fontFamily: '"Inter", sans-serif', cursor: 'pointer' }}
                onClick={() => { handleClose(); if (props.openDetailsView) props.openDetailsView(formData.id); }}>
                <i className="bi bi-eye me-1"></i>View Detail
              </button>
            )}
            <button type="button"
              style={{ background: '#004ac6', color: '#ffffff', border: 'none', borderRadius: '4px', padding: '6px 18px', fontSize: '13px', fontWeight: 600, fontFamily: '"Inter", sans-serif', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              onClick={handleCreate} disabled={isProcessing || enableProductSelection}>
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
          .pw-content { flex: 1; overflow-y: auto; padding: 20px 28px; background: #f7f9fb; min-width: 0; }
          .pw-tab-wrap { max-width: 900px; }
          .pw-price-cards .col-md-4 { margin-bottom: 16px; }

          /* ── Delivery Note form ── */
          .dn-form { padding: 6px 14px; }
          .dn-customer-info { border-radius: 8px; }
          .dn-product-row { display: flex; gap: 8px; align-items: stretch; margin-bottom: 12px; }
          .dn-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }

          /* ── Header two-column split ── */
          .dn-header-flex { display: flex; }
          .dn-header-left { flex: 0 0 60%; }
          .dn-header-right { flex: 1; min-width: 0; }
          .dn-sub-row { display: flex; gap: 6px; flex-wrap: wrap; }
          .dn-search-input { flex: 0 0 252px; min-width: 160px; }
          .dn-date-input { flex: 0 0 175px; min-width: 130px; }
          .dn-remarks { flex: 0 1 156px; min-width: 80px; }
          .dn-summary-card { width: 100%; max-width: 380px; }
          .dn-summary-popup { width: 300px; max-width: calc(100vw - 24px); }

          /* ── Mobile (≤575px) ── */
          @media (max-width: 575px) {
            .dn-form { padding: 4px 4px !important; }
            .pw-card { padding: 10px !important; margin-bottom: 8px !important; }
            .pw-modal .modal-header { padding: 6px 8px !important; flex-wrap: wrap; gap: 4px !important; }
            .pw-modal .modal-title { font-size: 12px !important; }
            .dn-hdr-actions { flex-wrap: wrap; gap: 4px !important; }
            .dn-hdr-actions .btn, .dn-hdr-actions button { font-size: 12px !important; padding: 4px 10px !important; }
            .dn-product-row { flex-wrap: wrap; }
            .dn-product-row > div:first-child { flex: 1 0 100% !important; max-width: 100% !important; }
            .dn-product-row > div:last-child { flex: 1 0 100% !important; }
            .dn-table-wrap { max-height: none !important; }
            .dn-header-flex { flex-direction: column !important; }
            .dn-header-left { flex: 1 1 100% !important; border-right: none !important; border-bottom: 1px solid #c3c6d7; }
            .dn-header-right { flex: 1 1 100% !important; border-top: none; }
            .dn-sub-row { flex-wrap: wrap; }
            .dn-search-input { flex: 1 1 130px !important; min-width: 110px !important; }
            .dn-date-input { flex: 1 1 110px !important; min-width: 100px !important; }
            .dn-barcode-input { flex: 1 1 100px !important; min-width: 80px !important; }
            .dn-remarks { flex: 1 1 100% !important; min-width: 0 !important; max-height: 54px !important; align-self: auto !important; }
            .dn-summary-card { max-width: 100% !important; }
          }

          /* ── Tablet portrait (576–767px) ── */
          @media (min-width: 576px) and (max-width: 767px) {
            .dn-form { padding: 6px 8px !important; }
            .pw-card { padding: 12px !important; margin-bottom: 10px !important; }
            .pw-modal .modal-header { padding: 8px 12px !important; }
            .dn-hdr-actions { flex-wrap: wrap; gap: 6px !important; }
            .dn-table-wrap { max-height: none !important; }
            .dn-header-flex { flex-direction: column !important; }
            .dn-header-left { flex: 1 1 100% !important; border-right: none !important; border-bottom: 1px solid #c3c6d7; }
            .dn-header-right { flex: 1 1 100% !important; }
            .dn-search-input { flex: 1 1 150px !important; }
            .dn-date-input { flex: 1 1 130px !important; }
            .dn-barcode-input { flex: 1 1 120px !important; }
            .dn-remarks { flex: 1 1 120px !important; }
            .dn-summary-card { max-width: 100% !important; }
          }

          /* ── Tablet landscape (768–991px) ── */
          @media (min-width: 768px) and (max-width: 991px) {
            .dn-form { padding: 6px 10px !important; }
            .pw-card { padding: 14px !important; margin-bottom: 12px !important; }
            .pw-modal .modal-header { padding: 8px 14px !important; }
            .dn-header-left { flex: 0 0 55% !important; }
            .dn-search-input { flex: 1 1 180px !important; }
            .dn-date-input { flex: 1 1 140px !important; }
            .dn-barcode-input { flex: 0 1 140px !important; }
          }

          /* ── Small desktop (992–1199px) ── */
          @media (min-width: 992px) and (max-width: 1199px) {
            .dn-form { padding: 6px 14px !important; }
            .pw-card { padding: 18px !important; }
          }

          @media (min-width: 768px) and (max-width: 1100px) {
            .pw-form { flex-direction: column; }
            .pw-sidebar { width: 100%; height: auto; flex-direction: row; overflow-x: auto; overflow-y: hidden; border-right: none; border-bottom: 1px solid #c3c6d7; padding: 6px 8px; gap: 4px; }
            .pw-sidebar-header { display: none; }
            .pw-sidebar button { flex-shrink: 0; white-space: nowrap; padding: 8px 12px !important; }
            .pw-content { padding: 16px 20px; }
            .pw-tab-wrap { max-width: 100%; }
          }
          @media (max-width: 767px) {
            .pw-form { flex-direction: column; }
            .pw-sidebar { width: 100%; height: auto; flex-direction: row; overflow-x: auto; overflow-y: hidden; border-right: none; border-bottom: 1px solid #c3c6d7; padding: 6px 8px; gap: 4px; }
            .pw-sidebar-header { display: none; }
            .pw-sidebar button { flex-shrink: 0; white-space: nowrap; padding: 8px 12px !important; }
            .pw-content { padding: 14px 16px !important; }
            .pw-tab-wrap { max-width: 100%; }
          }
          @media (min-height: 600px) and (max-height: 800px) {
            .pw-content { padding: 14px 24px; }
          }
        `}</style>
        <Modal.Body className="pw-body">
          <form className="dn-form" style={{ flex: 1, overflow: 'auto', background: '#f7f9fb' }} onSubmit={handleCreate}>
            <div style={{ maxWidth: '100%', margin: '0 auto' }}>

              {/* Error summary */}
              <div style={{ overflow: "hidden", maxHeight: totalErrors > 0 ? "500px" : "0", marginBottom: totalErrors > 0 ? "16px" : "0", transition: "max-height 0.25s ease, margin-bottom 0.2s ease" }}>
                <div style={{ background: "#ffdad6", border: "1px solid #f4adaa", borderRadius: "8px", padding: "12px 16px" }}>
                  <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, color: "#93000a", marginBottom: "8px", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <i className="bi bi-exclamation-circle-fill" style={{ fontSize: "14px" }}></i>
                    {totalErrors} error{totalErrors > 1 ? "s" : ""} — please fix before saving:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: "18px" }}>
                    {allErrors.map(([k, v]) => (
                      <li key={k} style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#93000a" }}>{v}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Header Fields + Selected Customer side by side */}
              {/* Combined Details + Products Card */}
              <div>
            <section style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div className="dn-header-flex" style={{ borderBottom: '1px solid #c3c6d7' }}>
                <div className="dn-header-left" style={{ padding: '4px 10px', display: 'flex', gap: '6px', alignItems: 'stretch', backgroundColor: '#f2f4f6', borderRight: '1px solid #c3c6d7' }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div className="dn-sub-row" style={{ alignItems: 'center' }}>
                    <div className="dn-search-input">
                    <div style={{ flex: 1, minWidth: 0 }}>
                    <Typeahead
                id="customer_search"
                labelKey="search_label"
                filterBy={() => true}
                isLoading={false}
                open={openCustomerSearchResult}
                onChange={(selectedItems) => {
                  delete errors["customer_id"];
                  setErrors(errors);
                  if (selectedItems.length === 0) {
                    delete errors["customer_id"];
                    setErrors(errors);
                    formData.customer_id = "";
                    formData.customer_name = "";
                    setFormData({ ...formData });
                    setSelectedCustomers([]);
                    return;
                  }
                  formData.customer_id = selectedItems[0].id;
                  if (selectedItems[0].use_remarks_in_sales && selectedItems[0].remarks) {
                    formData.remarks = selectedItems[0].remarks;
                  }

                  openCustomerSearchResult = false;
                  setOpenCustomerSearchResult(false);

                  setFormData({ ...formData });
                  setSelectedCustomers(selectedItems);
                }}
                options={customerOptions}
                placeholder="Customer Name / Mob / VAT # / ID"
                selected={selectedCustomers}
                highlightOnlyResult={true}
                ref={customerSearchRef}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    delete errors.customer_id;
                    //setErrors(errors);
                    formData.customer_id = "";
                    formData.customer_name = "";
                    setFormData({ ...formData });
                    setSelectedCustomers([]);
                    setCustomerOptions([]);
                    openCustomerSearchResult = false;
                    setOpenCustomerSearchResult(false);
                    customerSearchRef.current?.clear();
                  }
                }}
                onInputChange={(searchTerm, e) => {
                  if (searchTerm) {
                    formData.customer_name = searchTerm;
                  }
                  setFormData({ ...formData });

                  if (timerRef.current) clearTimeout(timerRef.current);
                  timerRef.current = setTimeout(() => {
                    suggestCustomers(searchTerm);
                  }, 350);
                }}

                renderMenu={(results, menuProps, state) => {
                  const searchWords = state.text.toLowerCase().split(' ').filter(Boolean);
                  const visCols = customerSearchColumns.filter(c => c.visible);
                  const totW = visCols.reduce((s, c) => s + c.width, 0);
                  const cw = (col) => `${(col.width / totW) * 100}%`;
                  const resizeHandle = (colKey) => (
                    <div onMouseDown={e => startCustomerColResize(e, colKey)}
                      style={{ position: 'absolute', right: 0, top: '10%', bottom: '10%', width: '5px', cursor: 'col-resize', zIndex: 2 }} />
                  );
                  return (
                    <Menu {...menuProps} style={{ ...(menuProps.style || {}), width: '95vw', maxWidth: '95vw', minWidth: '300px', zIndex: 9999 }}>
                      <MenuItem disabled style={{ position: 'sticky', top: 0, padding: 0, margin: 0 }}>
                        <div style={{ display: 'flex', fontWeight: 700, color: '#374151', padding: '4px 8px', background: '#f8f9fa', borderBottom: '1px solid #e2e8f0', pointerEvents: 'auto', position: 'relative' }}>
                          {visCols.map(col => (
                            <div key={col.key} style={{ width: cw(col), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', position: 'relative' }}>
                              {col.key === 'code' && 'Code'}
                              {col.key === 'name' && 'Name'}
                              {col.key === 'phone' && 'Phone'}
                              {col.key === 'vat_no' && 'VAT No.'}
                              {col.key === 'credit_balance' && 'Credit Balance'}
                              {col.key === 'credit_limit' && 'Credit Limit'}
                              {resizeHandle(col.key)}
                            </div>
                          ))}
                          <div style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer' }}
                            onClick={e => { e.stopPropagation(); setShowCustomerSearchSettings(true); }}>
                            <i className="bi bi-gear-fill" style={{ fontSize: '13px', color: '#6b7280' }} />
                          </div>
                        </div>
                      </MenuItem>
                      {results.map((option, idx) => {
                        const isActive = state.activeIndex === idx || results.length === 1;
                        const rowBg = isActive ? '#e8f0fe' : 'transparent';
                        return (
                          <MenuItem option={option} position={idx} key={idx} style={{ padding: 0 }}>
                            <div style={{ display: 'flex', padding: '5px 8px', alignItems: 'center', background: rowBg }}>
                              {visCols.map(col => (
                                <div key={col.key} style={{ width: cw(col), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {col.key === 'code' && <span style={{ color: isActive ? '#191c1e' : '#374151', fontWeight: isActive ? 600 : 400 }}>{highlightWords(option.code, searchWords, isActive)}</span>}
                                  {col.key === 'name' && <span style={{ color: isActive ? '#191c1e' : '#374151', fontWeight: isActive ? 600 : 400 }}>{highlightWords(option.name + (option.name_in_arabic ? ' - ' + option.name_in_arabic : ''), searchWords, isActive)}</span>}
                                  {col.key === 'phone' && <span style={{ color: isActive ? '#191c1e' : '#374151', fontWeight: isActive ? 600 : 400 }}>{highlightWords(option.phone || '–', searchWords, isActive)}</span>}
                                  {col.key === 'vat_no' && <span style={{ color: isActive ? '#191c1e' : '#374151', fontWeight: isActive ? 600 : 400 }}>{highlightWords(option.vat_no || '–', searchWords, isActive)}</span>}
                                  {col.key === 'credit_balance' && <span style={{ color: option.credit_balance > 0 ? '#dc2626' : option.credit_balance < 0 ? '#2563eb' : (isActive ? '#191c1e' : '#374151'), fontWeight: isActive ? 600 : 400 }}>{option.credit_balance != null ? option.credit_balance : '–'}</span>}
                                  {col.key === 'credit_limit' && <span style={{ color: isActive ? '#191c1e' : '#374151', fontWeight: isActive ? 600 : 400 }}>{option.credit_limit || '–'}</span>}
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
              </div>{/* end flex-1 typeahead */}
                  </div>{/* end 33% search block */}
                <Button hide={true.toString()} onClick={openCustomerCreateForm} className="btn" type="button"
                  style={{ background: '#004ac6', color: '#fff', border: '1px solid transparent', borderRadius: '4px', padding: '7px 12px', fontSize: '13px', fontWeight: 600, fontFamily: '"Inter", sans-serif', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', lineHeight: '1', flexShrink: 0 }}>
                  <i className="bi bi-plus-lg"></i>
                </Button>
                {formData.customer_id && (
                  <Button className="btn" title="Edit Customer" onClick={() => CustomerCreateFormRef.current.open(formData.customer_id)}
                    style={{ background: '#004ac6', color: '#fff', border: '1px solid transparent', borderRadius: '4px', padding: '7px 12px', fontSize: '13px', fontWeight: 600, fontFamily: '"Inter", sans-serif', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', lineHeight: '1', flexShrink: 0 }}>
                    <i className="bi bi-pencil"></i>
                  </Button>
                )}
                <Button className="btn" onClick={openCustomers}
                  style={{ background: '#004ac6', color: '#fff', border: '1px solid transparent', borderRadius: '4px', padding: '7px 12px', fontSize: '13px', fontWeight: 600, fontFamily: '"Inter", sans-serif', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', lineHeight: '1', flexShrink: 0 }}>
                  <i className="bi bi-list"></i>
                </Button>
                {/* Date inline after buttons */}
                <div className="dn-date-input">
                  <DatePicker
                    id="date_str"
                    selected={formData.date_str ? new Date(formData.date_str) : null}
                    value={formData.date_str ? format(new Date(formData.date_str), "MMMM d, yyyy h:mm aa") : null}
                    className="form-control"
                    dateFormat="MMMM d, yyyy h:mm aa"
                    showTimeSelect
                    timeIntervals="1"
                    placeholderText="Date"
                    customInput={<input style={INPUT} />}
                    onChange={(value) => { formData.date_str = value; setFormData({ ...formData }); }}
                  />
                </div>
                  </div>{/* end customer sub-row */}
              {store.settings?.enable_notification === true && (
                <div>
                  <Label>Notify At (Sales Reminder)</Label>
                  <DatePicker
                    id="notify_at"
                    selected={formData.notify_at ? new Date(formData.notify_at) : null}
                    value={formData.notify_at ? format(new Date(formData.notify_at), "MMMM d, yyyy h:mm aa") : null}
                    className="form-control"
                    dateFormat="MMMM d, yyyy h:mm aa"
                    showTimeSelect
                    timeIntervals="1"
                    onChange={(value) => { formData.notify_at = value; setFormData({ ...formData }); }}
                  />
                </div>
              )}
                  {/* Product search sub-row */}
                  <div className="dn-sub-row" style={{ alignItems: 'flex-end' }}>
                {/* Product search */}
                <div className="dn-search-input">
                  <Typeahead
                    id="product_id"
                    filterBy={() => true}
                    ref={productSearchRef}
                    labelKey="search_label"
                    inputProps={{ className: 'productSearch' }}
                    emptyLabel=""
                    clearButton={true}
                    open={openProductSearchResult}
                    isLoading={false}
                    isInvalid={errors.product_id ? true : false}
                    onChange={(selectedItems) => {
                      if (onChangeTriggeredRef.current) return;
                      onChangeTriggeredRef.current = true;
                      setTimeout(() => { onChangeTriggeredRef.current = false; }, 300);
                      if (selectedItems.length === 0) {
                        errors["product_id"] = "Invalid Product selected";
                        setErrors(errors);
                        return;
                      }
                      delete errors["product_id"];
                      setErrors({ ...errors });
                      if (formData.store_id) { addProduct(selectedItems[0]); }
                      setOpenProductSearchResult(false);
                      moveToProductQuantityInputBox();
                    }}
                    options={productOptions}
                    selected={selectedProduct}
                    placeholder="Part No. | Name | Brand"
                    highlightOnlyResult={true}
                    onInputChange={(searchTerm, e) => {
                      const requestId = Date.now();
                      latestRequestRef.current = requestId;
                      if (timerRef.current) clearTimeout(timerRef.current);
                      timerRef.current = setTimeout(() => {
                        if (latestRequestRef.current !== requestId) return;
                        suggestProducts(searchTerm);
                      }, 350);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        setProductOptions([]);
                        setOpenProductSearchResult(false);
                        productSearchRef.current?.clear();
                      }
                    }}
                    renderMenu={(results, menuProps, state) => {
                      const searchWords = state.text.toLowerCase().split(" ").filter(Boolean);
                      return (
                        <Menu {...menuProps} style={{ ...(menuProps.style || {}), minWidth: '900px', width: 'max-content', maxWidth: '95vw', zIndex: 9999 }}>
                          <MenuItem disabled style={{ position: 'sticky', top: 0, padding: 0, margin: 0 }}>
                            <div style={{ background: '#f8f9fa', zIndex: 2, display: 'flex', fontWeight: 'bold', padding: '4px 8px', border: "solid 0px", borderBottom: '1px solid #ddd', pointerEvents: "auto" }}>
                              {searchProductsColumns.filter(c => c.visible).map((col) => {
                                const rh = <div onMouseDown={e => startPsColResize(e, col.key)} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '5px', cursor: 'col-resize', zIndex: 2 }} />;
                                return (<React.Fragment key={col.key}>
                                  {col.key === "select" && <div style={{ width: getColumnWidth(col), border: "solid 0px", position: 'relative' }}>{rh}</div>}
                                  {col.key === "part_number" && <div style={{ width: getColumnWidth(col), border: "solid 0px", position: 'relative' }}>Part Number{rh}</div>}
                                  {col.key === "name" && <div style={{ width: getColumnWidth(col), border: "solid 0px", position: 'relative' }}>Name{rh}</div>}
                                  {col.key === "unit_price" && <div style={{ width: getColumnWidth(col), border: "solid 0px", position: 'relative' }}>S.Unit Price{rh}</div>}
                                  {col.key === "stock" && <div style={{ width: getColumnWidth(col), border: "solid 0px", position: 'relative' }}>Stock{rh}</div>}
                                  {col.key === "photos" && <div style={{ width: getColumnWidth(col), border: "solid 0px", position: 'relative' }}>Photos{rh}</div>}
                                  {col.key === "brand" && <div style={{ width: getColumnWidth(col), border: "solid 0px", position: 'relative' }}>Brand{rh}</div>}
                                  {col.key === "purchase_price" && <div style={{ width: getColumnWidth(col), border: "solid 0px", position: 'relative' }}>P.Unit Price{rh}</div>}
                                  {col.key === "country" && <div style={{ width: getColumnWidth(col), border: "solid 0px", position: 'relative' }}>Country{rh}</div>}
                                  {col.key === "rack" && <div style={{ width: getColumnWidth(col), border: "solid 0px", position: 'relative' }}>Rack{rh}</div>}
                                </React.Fragment>)
                              })}
                              <div style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", cursor: "pointer" }}
                                onClick={(e) => { e.stopPropagation(); setShowProductSearchSettings(true); }}>
                                <i className="bi bi-gear-fill" />
                              </div>
                            </div>
                          </MenuItem>
                          {results.map((option, index) => {
                            const onlyOneResult = results.length === 1;
                            const isActive = state.activeIndex === index || onlyOneResult;
                            let checked = isProductAdded(option.id);
                            return (
                              <MenuItem option={option} position={index} key={index} style={{ padding: "0px" }}>
                                <div style={{ display: 'flex', padding: '4px 8px' }}>
                                  {searchProductsColumns.filter(c => c.visible).map((col) => {
                                    return (<>
                                      {col.key === "select" &&
                                        <div className="form-check" style={{ ...columnStyle, width: getColumnWidth(col) }}
                                          onClick={e => { e.stopPropagation(); checked = !checked; if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = setTimeout(() => { if (checked) { addProduct(option); } else { removeProduct(option); } }, 100); }}>
                                          <input className="form-check-input" type="checkbox" value={checked} checked={checked}
                                            onClick={e => { e.stopPropagation(); }}
                                            onChange={e => { e.preventDefault(); e.stopPropagation(); checked = !checked; if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = setTimeout(() => { if (checked) { addProduct(option); } else { removeProduct(option); } }, 100); }} />
                                        </div>
                                      }
                                      {col.key === "part_number" && <div style={{ ...columnStyle, width: getColumnWidth(col) }}>{highlightWords(option.prefix_part_number ? `${option.prefix_part_number} - ${option.part_number}` : option.part_number, searchWords, isActive)}</div>}
                                      {col.key === "name" && <div style={{ ...columnStyle, width: getColumnWidth(col) }}>{highlightWords(option.name_in_arabic ? `${option.name} - ${option.name_in_arabic}` : option.name, searchWords, isActive)}</div>}
                                      {col.key === "unit_price" &&
                                        <div style={{ ...columnStyle, width: getColumnWidth(col) }}>
                                          {option.product_stores?.[localStorage.getItem("store_id")]?.retail_unit_price && (<><Amount amount={trimTo2Decimals(option.product_stores?.[localStorage.getItem("store_id")]?.retail_unit_price)} />+</>)}
                                          {option.product_stores?.[localStorage.getItem("store_id")]?.retail_unit_price_with_vat && (<>|<Amount amount={trimTo2Decimals(option.product_stores?.[localStorage.getItem("store_id")]?.retail_unit_price_with_vat)} /></>)}
                                        </div>
                                      }
                                      {col.key === "stock" &&
                                        <div style={{ ...columnStyle, width: getColumnWidth(col) }}>
                                          {(() => {
                                            const storeId = localStorage.getItem("store_id");
                                            const productStore = option.product_stores?.[storeId];
                                            const totalStock = productStore?.stock ?? 0;
                                            const warehouseStocks = productStore?.warehouse_stocks ?? {};
                                            const warehouseDetails = (() => {
                                              let details = [];
                                              if (warehouseStocks["main_store"] !== undefined) { details.push(`MS: ${warehouseStocks["main_store"]}`); }
                                              Object.entries(warehouseStocks).filter(([key]) => key !== "main_store").forEach(([key, value]) => { details.push(`${key.replace(/^w/, "WH").toUpperCase()}: ${value}`); });
                                              return details.join(", ");
                                            })();
                                            return (<span>{totalStock}{warehouseDetails && store.settings.enable_warehouse_module ? ` (${warehouseDetails})` : ""}</span>);
                                          })()}
                                        </div>
                                      }
                                      {col.key === "photos" &&
                                        <div style={{ ...columnStyle, width: getColumnWidth(col) }}>
                                          <button type="button" className={isActive ? "btn btn-outline-light btn-sm" : "btn btn-outline-primary btn-sm"}
                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); openProductImages(option.id); }}>
                                            <i className="bi bi-images" aria-hidden="true" />
                                          </button>
                                        </div>
                                      }
                                      {col.key === "brand" && <div style={{ ...columnStyle, width: getColumnWidth(col) }}>{highlightWords(option.brand_name, searchWords, isActive)}</div>}
                                      {col.key === "purchase_price" &&
                                        <div style={{ ...columnStyle, width: getColumnWidth(col) }}>
                                          {option.product_stores?.[localStorage.getItem("store_id")]?.purchase_unit_price && (<><Amount amount={trimTo2Decimals(option.product_stores?.[localStorage.getItem("store_id")]?.purchase_unit_price)} />+</>)}
                                          {option.product_stores?.[localStorage.getItem("store_id")]?.purchase_unit_price_with_vat && (<>|<Amount amount={trimTo2Decimals(option.product_stores?.[localStorage.getItem("store_id")]?.purchase_unit_price_with_vat)} /></>)}
                                        </div>
                                      }
                                      {col.key === "country" && <div style={{ ...columnStyle, width: getColumnWidth(col) }}>{highlightWords(option.country_name, searchWords, isActive)}</div>}
                                      {col.key === "rack" && (() => {
                                        if (store?.settings?.enable_warehouse_module) {
                                          const storeId = localStorage.getItem("store_id");
                                          const wRacks = option.product_stores?.[storeId]?.warehouse_racks;
                                          const parts = [];
                                          if (wRacks?.main_store) parts.push(`MS:${wRacks.main_store}`);
                                          if (wRacks) Object.entries(wRacks).filter(([k]) => k !== "main_store").forEach(([k, v]) => { if (v) parts.push(`${k}:${v}`); });
                                          const rackText = parts.join(" | ") || option.rack || "";
                                          return <div style={{ ...columnStyle, width: getColumnWidth(col), whiteSpace: 'normal', overflow: 'visible' }} title={rackText}>{rackText}</div>;
                                        }
                                        return <div style={{ ...columnStyle, width: getColumnWidth(col) }}>{highlightWords(option.rack, searchWords, isActive)}</div>;
                                      })()}
                                    </>)
                                  })}
                                </div>
                              </MenuItem>
                            );
                          })}
                        </Menu>
                      );
                    }}
                  />
                </div>
                <Button hide={true.toString()} onClick={openProductCreateForm} className="btn" type="button"
                  style={{ background: '#004ac6', color: '#fff', border: '1px solid transparent', borderRadius: '4px', padding: '7px 12px', fontSize: '13px', fontWeight: 600, fontFamily: '"Inter", sans-serif', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', lineHeight: '1', flexShrink: 0 }}>
                  <i className="bi bi-plus-lg"></i>
                </Button>
                <Button className="btn" onClick={openProducts}
                  style={{ background: '#004ac6', color: '#fff', border: '1px solid transparent', borderRadius: '4px', padding: '7px 12px', fontSize: '13px', fontWeight: 600, fontFamily: '"Inter", sans-serif', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', lineHeight: '1', flexShrink: 0 }}>
                  <i className="bi bi-list"></i>
                </Button>
                {store?.settings?.enable_purchase_order_module && <button type="button" onClick={() => PurchaseOrderPickerRef.current?.open(handleImportFromPO)} style={{ background: '#f0f4ff', color: '#004ac6', border: '1px solid #c5d5f5', borderRadius: '4px', padding: '5px 10px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '3px', alignSelf: 'flex-end' }}><i className="bi bi-file-earmark-arrow-down" />From P.O.</button>}
                <div className="dn-barcode-input" style={{ flex: '0 1 160px', minWidth: '100px' }}>
                  <DebounceInput minLength={3} debounceTimeout={500} placeholder="Scan Barcode" style={INPUT} value={formData.barcode} onChange={event => getProductByBarCode(event.target.value)} />
                </div>
                {enableProductSelection && (
                  <button className="btn btn-success btn-sm" style={{ flexShrink: 0 }} disabled={selectedIds.length === 0} onClick={handleSendSelected}>
                    Select {selectedIds.length} Product{selectedIds.length !== 1 ? "s" : ""}
                  </button>
                )}
                  </div>{/* end product sub-row */}
                  </div>{/* end stacked rows */}
                  <div className="dn-remarks" style={{ display: 'flex', flexDirection: 'column', alignSelf: 'stretch', maxHeight: '76px' }}>
                    <textarea value={formData.remarks} onChange={(e) => { delete errors["address"]; setErrors({ ...errors }); formData.remarks = e.target.value; setFormData({ ...formData }); }} onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); } }} style={{ ...INPUT, resize: 'none', flex: 1 }} id="remarks" placeholder="Remarks" />
                  </div>
                </div>{/* end left column */}
                {/* Right 50%: selected customer details */}
                {selectedCustomers.length > 0 && formData.customer_id ? (() => {
                  const c = selectedCustomers[0];
                  return (
                    <div className="dn-header-right" style={{ padding: '6px 14px', background: 'rgba(0,74,198,0.04)', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '3px 10px', overflow: 'hidden' }}>
                      {c.code && <span style={{ background: 'rgba(0,74,198,0.1)', color: '#004ac6', padding: '1px 7px', borderRadius: '4px', fontWeight: 700, fontFamily: 'monospace', fontSize: '11px', flexShrink: 0 }}>{c.code}</span>}
                      <span style={{ fontWeight: 700, color: '#191c1e', fontSize: '13px', flexShrink: 0 }}>{c.name_in_arabic ? `${c.name} | ${c.name_in_arabic}` : c.name}</span>
                      {(c.phone || c.phone_in_arabic || c.phone2 || c.vat_no || c.contact_person || c.credit_balance !== undefined) && <span style={{ width: '1px', height: '14px', background: 'rgba(0,74,198,0.2)', flexShrink: 0 }} />}
                      {c.phone && <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#434655', whiteSpace: 'nowrap' }}><i className="bi bi-telephone me-1" style={{ color: '#6b7280' }}></i>{c.phone}</span>}
                      {c.phone_in_arabic && <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#434655', whiteSpace: 'nowrap' }}><i className="bi bi-telephone me-1" style={{ color: '#6b7280' }}></i>{c.phone_in_arabic}</span>}
                      {c.phone2 && <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#434655', whiteSpace: 'nowrap' }}><i className="bi bi-telephone me-1" style={{ color: '#6b7280' }}></i>{c.phone2}</span>}
                      {c.vat_no && <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#434655', whiteSpace: 'nowrap' }}><i className="bi bi-building me-1" style={{ color: '#6b7280' }}></i>{c.vat_no}</span>}
                      {c.contact_person && <span style={{ fontSize: '11px', color: '#434655', whiteSpace: 'nowrap' }}><i className="bi bi-person me-1" style={{ color: '#6b7280' }}></i>{c.contact_person}</span>}
                      <span style={{ width: '1px', height: '14px', background: 'rgba(0,74,198,0.2)', flexShrink: 0 }} />
                      <span style={{ color: '#004ac6', fontWeight: 600, fontFamily: 'monospace', fontSize: '11px', whiteSpace: 'nowrap' }}>Cr.Bal: <Amount amount={trimTo2Decimals(c.credit_balance)} /></span>
                      {c.credit_limit > 0 && <span style={{ color: '#434655', fontFamily: 'monospace', fontSize: '11px', whiteSpace: 'nowrap' }}>Limit: <Amount amount={trimTo2Decimals(c.credit_limit)} /></span>}
                    </div>
                  );
                })() : <div className="dn-header-right" />}
              </div>{/* end two-column header */}
              <div style={{ overflowX: 'auto', maxHeight: '55vh', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px', tableLayout: 'fixed' }}>
                <colgroup>
                  {dnSPColumns.filter(c => c.visible).map(col => {
                    const defaults = DN_COL_DEFAULTS;
                    if (col.key === 'select' && !enableProductSelection) return null;
                    return <col key={col.key} style={{ width: `${colWidths[col.key] ?? defaults[col.key] ?? 120}px` }} />;
                  })}
                </colgroup>
                <thead style={{ backgroundColor: '#f1f5f9', position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr style={{ fontSize: '12px', fontWeight: 600, color: '#434655', lineHeight: '16px' }}>
                    {dnSPColumns.filter(c => c.visible).map(col => {
                      const defaults = DN_COL_DEFAULTS;
                      const thStyle = { padding: '10px 12px', fontWeight: 600, borderBottom: '2px solid #c3c6d7', whiteSpace: 'nowrap', position: 'relative', overflow: 'hidden' };
                      const resizeHandle = (
                        <div
                          onMouseDown={(e) => startColResize(e, col.key, colWidths[col.key] ?? defaults[col.key] ?? 60)}
                          style={{ position: 'absolute', right: 0, top: '20%', bottom: '20%', width: '4px', cursor: 'col-resize', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1px', borderRadius: '2px', backgroundColor: 'transparent' }}
                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#dbeafe'; Array.from(e.currentTarget.children).forEach(d => d.style.backgroundColor = '#3b82f6'); }}
                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; Array.from(e.currentTarget.children).forEach(d => d.style.backgroundColor = '#b0b7c3'); }}
                        >
                          <div style={{ width: '1px', height: '100%', backgroundColor: '#b0b7c3', borderRadius: '1px', pointerEvents: 'none' }} />
                          <div style={{ width: '1px', height: '100%', backgroundColor: '#b0b7c3', borderRadius: '1px', pointerEvents: 'none' }} />
                        </div>
                      );
                      if (col.key === 'delete') return <th key="delete" style={{ ...thStyle, padding: 0 }}><button type="button" title="Table Settings" onClick={() => setShowDNSPSettings(true)} style={{ background: 'none', border: 'none', padding: '2px 0', cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }} onMouseEnter={e => e.currentTarget.style.color='#191c1e'} onMouseLeave={e => e.currentTarget.style.color='#6b7280'}><i className="bi bi-gear-fill" style={{ fontSize: '11px' }}></i></button>{resizeHandle}</th>;
                      if (col.key === 'si_no') return <th key="si_no" style={thStyle}>#&nbsp;{resizeHandle}</th>;
                      if (col.key === 'select') return enableProductSelection ? <th key="select" style={thStyle}><input type="checkbox" checked={isAllSelected} onChange={handleSelectAll} /><br /><span style={{ fontSize: '10px' }}>All</span>{resizeHandle}</th> : null;
                      if (col.key === 'part_number') return <th key="part_number" style={thStyle}>Part No.{resizeHandle}</th>;
                      if (col.key === 'name') return <th key="name" style={thStyle}>Name{resizeHandle}</th>;
                      if (col.key === 'info') return <th key="info" style={thStyle}>Info{resizeHandle}</th>;
                      if (col.key === 'qty') return <th key="qty" style={{ ...thStyle, textAlign: 'center' }}>Qty{resizeHandle}</th>;
                      if (col.key === 'unit_price' && store.settings?.add_price_details_in_delivery_note) return <th key="unit_price" style={{ ...thStyle, textAlign: 'right' }}>U. Price (ex. VAT){resizeHandle}</th>;
                      if (col.key === 'unit_price_with_vat' && store.settings?.add_price_details_in_delivery_note) return <th key="unit_price_with_vat" style={{ ...thStyle, textAlign: 'right' }}>U. Price (inc. VAT){resizeHandle}</th>;
                      if (col.key === 'purchase_unit_price' && store.settings?.add_price_details_in_delivery_note) return <th key="purchase_unit_price" style={{ ...thStyle, textAlign: 'right' }}>P. U.Price{resizeHandle}</th>;
                      if (col.key === 'purchase_unit_price_with_vat' && store.settings?.add_price_details_in_delivery_note) return <th key="purchase_unit_price_with_vat" style={{ ...thStyle, textAlign: 'right' }}>P. U.Price (inc. VAT){resizeHandle}</th>;
                      if (col.key === 'unit_discount' && store.settings?.add_price_details_in_delivery_note) return <th key="unit_discount" style={{ ...thStyle, textAlign: 'right' }}>U. Dsc. (ex. VAT){resizeHandle}</th>;
                      if (col.key === 'unit_discount_with_vat' && store.settings?.add_price_details_in_delivery_note) return <th key="unit_discount_with_vat" style={{ ...thStyle, textAlign: 'right' }}>U. Dsc. (inc. VAT){resizeHandle}</th>;
                      if (col.key === 'price' && store.settings?.add_price_details_in_delivery_note) return <th key="price" style={{ ...thStyle, textAlign: 'right' }}>Total (ex. VAT){resizeHandle}</th>;
                      if (col.key === 'price_with_vat' && store.settings?.add_price_details_in_delivery_note) return <th key="price_with_vat" style={{ ...thStyle, textAlign: 'right' }}>Total (inc. VAT){resizeHandle}</th>;
                      return null;
                    })}
                  </tr>
                </thead>
                <tbody style={{ fontSize: '13px', color: '#191c1e' }}>
                  {selectedProducts.map((product, index) => (
                    <tr key={index}
                      style={{ borderBottom: '1px solid #e2e8f0', transition: 'background-color 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; }}
                    >
                      {dnSPColumns.filter(c => c.visible).map(col => {
                        if (col.key === 'delete') return (<td key="delete" style={{ verticalAlign: 'middle', padding: '6px 10px', textAlign: 'center' }} >
                          <div
                            style={{ color: '#ba1a1a', cursor: 'pointer', fontSize: '14px', lineHeight: 1 }}
                            onClick={() => { removeProduct(product); }}
                            title="Remove"
                          >
                            <i className="bi bi-trash3"></i>
                          </div>
                        </td>);
                        if (col.key === 'si_no') return (<td key="si_no" style={{ verticalAlign: 'middle', padding: '6px 10px', textAlign: 'center', color: '#434655', fontSize: '12px' }}>{index + 1}</td>);
                        if (col.key === 'select') return enableProductSelection ? (<td key="select" style={{ verticalAlign: 'middle', padding: '6px 10px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(product.product_id)}
                            onChange={() => handleSelect(product.product_id)}
                          />
                        </td>) : null;
                        // eslint-disable-next-line no-lone-blocks
                        {/*<td style={{ verticalAlign: 'middle', padding: '4px 8px', width: "auto", whiteSpace: "nowrap" }}>
                        <OverflowTooltip maxWidth={120} value={product.prefix_part_number ? product.prefix_part_number + " - " + product.part_number : product.part_number} />
                      </td>*/}
                        if (col.key === 'part_number') return (<td key="part_number" style={{ verticalAlign: 'middle', padding: '4px 8px' }}>
                          <input type="text" id={`${"delivery_note_product_part_number" + index}`}
                            name={`${"delivery_note_product_part_number" + index}`}
                            onWheel={(e) => e.target.blur()}

                            value={selectedProducts[index].part_number}
                            className={`form-control text-start ${errors["part_number_" + index] ? 'is-invalid' : ''} ${warnings["part_number_" + index] ? 'border-warning text-warning' : ''}`}
                            onKeyDown={(e) => {
                              RunKeyActions(e, product);
                            }}
                            placeholder="Part No." onChange={(e) => {
                              delete errors["part_number_" + index];
                              setErrors({ ...errors });

                              if (!e.target.value) {
                                selectedProducts[index].part_number = "";
                                setSelectedProducts([...selectedProducts]);
                                return;
                              }
                              selectedProducts[index].part_number = e.target.value;
                              setSelectedProducts([...selectedProducts]);
                            }} />
                          {(errors[`part_number_${index}`] || warnings[`part_number_${index}`]) && (
                            <i
                              className={`bi bi-exclamation-circle-fill ${errors[`part_number_${index}`] ? 'text-danger' : 'text-warning'} ms-2`}
                              data-bs-toggle="tooltip"
                              data-bs-placement="top"
                              data-error={errors[`part_number_${index}`] || ''}
                              data-warning={warnings[`part_number_${index}`] || ''}
                              title={errors[`part_number_${index}`] || warnings[`part_number_${index}`] || ''}
                              style={{
                                fontSize: '1rem',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                              }}
                            ></i>
                          )}
                        </td>);
                        if (col.key === 'name') return (<td key="name" style={{ verticalAlign: 'middle', padding: '4px 8px' }}>
                          <div className="input-group">
                            <input type="text"
                              id={`${"delivery_note_product_name" + index}`}
                              name={`${"delivery_note_product_name" + index}`}
                              onWheel={(e) => e.target.blur()}
                              value={product.name}
                              className={`form-control text-start ${errors["name_" + index] ? 'is-invalid' : ''} ${warnings["name_" + index] ? 'border-warning text-warning' : ''}`}
                              onKeyDown={(e) => {
                                RunKeyActions(e, product);
                              }}
                              placeholder="Name" onChange={(e) => {
                                delete errors["name_" + index];
                                setErrors({ ...errors });

                                if (!e.target.value) {
                                  //errors["purchase_unit_price_" + index] = "Invalid purchase unit price";
                                  selectedProducts[index].name = "";
                                  setSelectedProducts([...selectedProducts]);
                                  //setErrors({ ...errors });
                                  console.log("errors:", errors);
                                  return;
                                }


                                selectedProducts[index].name = e.target.value;
                                setSelectedProducts([...selectedProducts]);
                              }} />


                            <div
                              style={{ color: "blue", cursor: "pointer", marginLeft: "10px" }}
                              onClick={() => {
                                openUpdateProductForm(product.product_id);
                              }}
                            >
                              <i className="bi bi-pencil"> </i>
                            </div>

                            <div
                              style={{ color: "blue", cursor: "pointer", marginLeft: "10px" }}
                              onClick={() => {
                                openProductDetails(product.product_id);
                              }}
                            >
                              <i className="bi bi-eye"> </i>
                            </div>
                          </div>
                          {(errors[`name_${index}`] || warnings[`name_${index}`]) && (
                            <i
                              className={`bi bi-exclamation-circle-fill ${errors[`name_${index}`] ? 'text-danger' : 'text-warning'} ms-2`}
                              data-bs-toggle="tooltip"
                              data-bs-placement="top"
                              data-error={errors[`name_${index}`] || ''}
                              data-warning={warnings[`name_${index}`] || ''}
                              title={errors[`name_${index}`] || warnings[`name_${index}`] || ''}
                              style={{
                                fontSize: '1rem',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                              }}
                            ></i>
                          )}
                        </td>);
                        if (col.key === 'info') return (<td key="info" style={{ verticalAlign: 'middle', padding: '4px 6px', textAlign: 'center' }}>
                          <Dropdown drop="auto">
                            <Dropdown.Toggle as="span" id={`info-dd-${index}`} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '6px', cursor: 'pointer', color: '#6b7280', transition: 'background 0.15s, color 0.15s' }}
                              onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#191c1e'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6b7280'; }}>
                              <i className="bi bi-three-dots-vertical" style={{ fontSize: '15px', pointerEvents: 'none' }}></i>
                            </Dropdown.Toggle>
                            <Dropdown.Menu style={{ zIndex: 9999, fontSize: '13px', minWidth: '210px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '4px' }} popperConfig={{ modifiers: [{ name: 'preventOverflow', options: { boundary: 'viewport' } }] }}>
                              <Dropdown.Item style={{ borderRadius: '6px', padding: '7px 12px' }} onClick={() => openLinkedProducts(product)}>
                                <i className="bi bi-link-45deg me-2" style={{ color: '#6366f1' }}></i>Linked Products <span className="text-muted" style={{ fontSize: '11px' }}>({getShortcut('linkedProducts')})</span>
                              </Dropdown.Item>
                              <Dropdown.Item style={{ borderRadius: '6px', padding: '7px 12px' }} onClick={() => openProductImages(product.product_id)}>
                                <i className="bi bi-images me-2" style={{ color: '#0ea5e9' }}></i>Images <span className="text-muted" style={{ fontSize: '11px' }}>({getShortcut('images')})</span>
                              </Dropdown.Item>
                              <Dropdown.Divider style={{ margin: '4px 0' }} />
                              <Dropdown.Item style={{ borderRadius: '6px', padding: '7px 12px' }} onClick={() => openProductHistory(product)}>
                                <i className="bi bi-journal-text me-2" style={{ color: '#64748b' }}></i>Product History <span className="text-muted" style={{ fontSize: '11px' }}>({getShortcut('productHistory')})</span>
                              </Dropdown.Item>
                              <Dropdown.Item style={{ borderRadius: '6px', padding: '7px 12px' }} onClick={() => openSalesHistory(product)}>
                                <i className="bi bi-receipt me-2" style={{ color: '#16a34a' }}></i>Sales History <span className="text-muted" style={{ fontSize: '11px' }}>({getShortcut('salesHistory')})</span>
                              </Dropdown.Item>
                              <Dropdown.Item style={{ borderRadius: '6px', padding: '7px 12px' }} onClick={() => openSalesReturnHistory(product)}>
                                <i className="bi bi-arrow-return-left me-2" style={{ color: '#dc2626' }}></i>Sales Return History <span className="text-muted" style={{ fontSize: '11px' }}>({getShortcut('salesReturnHistory')})</span>
                              </Dropdown.Item>
                              <Dropdown.Item style={{ borderRadius: '6px', padding: '7px 12px' }} onClick={() => openPurchaseHistory(product)}>
                                <i className="bi bi-bag me-2" style={{ color: '#d97706' }}></i>Purchase History <span className="text-muted" style={{ fontSize: '11px' }}>({getShortcut('purchaseHistory')})</span>
                              </Dropdown.Item>
                              <Dropdown.Item style={{ borderRadius: '6px', padding: '7px 12px' }} onClick={() => openPurchaseReturnHistory(product)}>
                                <i className="bi bi-bag-x me-2" style={{ color: '#ea580c' }}></i>Purchase Return History <span className="text-muted" style={{ fontSize: '11px' }}>({getShortcut('purchaseReturnHistory')})</span>
                              </Dropdown.Item>
                              <Dropdown.Item style={{ borderRadius: '6px', padding: '7px 12px' }} onClick={() => openDeliveryNoteHistory(product)}>
                                <i className="bi bi-truck me-2" style={{ color: '#0891b2' }}></i>Delivery Note History <span className="text-muted" style={{ fontSize: '11px' }}>({getShortcut('deliveryNoteHistory')})</span>
                              </Dropdown.Item>
                              <Dropdown.Divider style={{ margin: '4px 0' }} />
                              <Dropdown.Item style={{ borderRadius: '6px', padding: '7px 12px' }} onClick={() => openQuotationHistory(product, "quotation")}>
                                <i className="bi bi-file-earmark-text me-2" style={{ color: '#7c3aed' }}></i>Quotation History <span className="text-muted" style={{ fontSize: '11px' }}>({getShortcut('quotationHistory')})</span>
                              </Dropdown.Item>
                              <Dropdown.Item style={{ borderRadius: '6px', padding: '7px 12px' }} onClick={() => openQuotationSalesHistory(product)}>
                                <i className="bi bi-file-earmark-check me-2" style={{ color: '#059669' }}></i>Qtn. Sales History <span className="text-muted" style={{ fontSize: '11px' }}>({getShortcut('quotationSalesHistory')})</span>
                              </Dropdown.Item>
                              <Dropdown.Item style={{ borderRadius: '6px', padding: '7px 12px' }} onClick={() => openQuotationSalesReturnHistory(product)}>
                                <i className="bi bi-file-earmark-x me-2" style={{ color: '#be123c' }}></i>Qtn. Sales Return History <span className="text-muted" style={{ fontSize: '11px' }}>({getShortcut('quotationSalesReturnHistory')})</span>
                              </Dropdown.Item>
                            </Dropdown.Menu>
                          </Dropdown>
                        </td>);
                        if (col.key === 'qty') return (<td key="qty" style={{
                          verticalAlign: 'middle',
                          padding: '4px 8px',
                          whiteSpace: 'nowrap',
                          position: 'relative',
                          textAlign: 'left',
                        }} >
                          <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                            <div className="input-group flex-nowrap" style={{ width: 'auto', minWidth: 0 }}>
                              <input type="number"
                                style={{ width: "81px", minWidth: "54px" }}
                                id={`${"delivery_note_quantity_" + index}`}
                                name={`${"delivery_note_quantity_" + index}`}
                                value={product.quantity}
                                className="form-control"

                                placeholder="Quantity"

                                ref={(el) => {
                                  if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                  inputRefs.current[index][`${"delivery_note_quantity_" + index}`] = el;
                                }}
                                onFocus={() => handleFocus(index, `${"delivery_note_quantity_" + index}`)}
                                onKeyDown={(e) => {
                                  RunKeyActions(e, product);
                                  if (timerRef.current) clearTimeout(timerRef.current);

                                  if (e.key === "Backspace") {
                                    selectedProducts[index].quantity = "";
                                    setSelectedProducts([...selectedProducts]);
                                    timerRef.current = setTimeout(() => {
                                      CalCulateLineTotals(index);
                                      checkErrors(index);
                                      checkWarnings(index);
                                      reCalculate(index);
                                    }, 100);
                                  }
                                }}

                                onChange={(e) => {
                                  if (timerRef.current) clearTimeout(timerRef.current);

                                  delete errors["quantity_" + index];
                                  setErrors({ ...errors });


                                  if (parseFloat(e.target.value) === 0) {
                                    selectedProducts[index].quantity = e.target.value;
                                    setSelectedProducts([...selectedProducts]);

                                    timerRef.current = setTimeout(() => {
                                      CalCulateLineTotals(index);
                                      checkErrors(index);
                                      checkWarnings(index);
                                      reCalculate(index);
                                    }, 100);
                                    return;
                                  }

                                  if (!e.target.value) {
                                    selectedProducts[index].quantity = e.target.value;
                                    setSelectedProducts([...selectedProducts]);
                                    timerRef.current = setTimeout(() => {
                                      CalCulateLineTotals(index);
                                      checkErrors(index);
                                      checkWarnings(index);
                                      reCalculate(index);
                                    }, 100);
                                    return;
                                  }


                                  product.quantity = parseFloat(e.target.value);


                                  selectedProducts[index].quantity = parseFloat(e.target.value);

                                  setSelectedProducts([...selectedProducts]);

                                  timerRef.current = setTimeout(() => {
                                    CalCulateLineTotals(index);
                                    checkErrors(index);
                                    checkWarnings(index);
                                    reCalculate(index);
                                  }, 100);

                                }} />
                              <span className="input-group-text" id="basic-addon2" style={{ borderRadius: '0 4px 4px 0', marginRight: '8px' }}> {selectedProducts[index].unit ? selectedProducts[index].unit[0] : "P"}</span>
                            </div>
                            {(errors[`quantity_${index}`] || warnings[`quantity_${index}`]) && (
                              <i
                                className={`bi bi-exclamation-circle-fill ${errors[`quantity_${index}`] ? 'text-danger' : 'text-warning'} ms-2`}
                                data-bs-toggle="tooltip"
                                data-bs-placement="top"
                                data-error={errors[`quantity_${index}`] || ''}
                                data-warning={warnings[`quantity_${index}`] || ''}
                                title={errors[`quantity_${index}`] || warnings[`quantity_${index}`] || ''}
                                style={{
                                  fontSize: '1rem',
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                }}
                              ></i>
                            )}
                          </div>
                        </td>);
                        if (col.key === 'unit_price' && store.settings?.add_price_details_in_delivery_note) return (<td key="unit_price" style={{ verticalAlign: 'middle', padding: '4px 8px', borderLeft: '1px solid #e2e8f0' }}>
                          <input type="number"
                            style={{ minWidth: "60px", maxWidth: "120px" }}
                            value={product.unit_price}
                            className="form-control"
                            placeholder="Unit Price"
                            onWheel={(e) => e.target.blur()}
                            onKeyDown={(e) => {
                              if (e.key === "Backspace") {
                                selectedProducts[index].unit_price = "";
                                selectedProducts[index].unit_price_with_vat = "";
                                setSelectedProducts([...selectedProducts]);
                                CalCulateLineTotals(index);
                                reCalculate();
                              } else if (e.key === "Enter" && index === selectedProducts.length - 1) {
                                e.preventDefault();
                                e.nativeEvent.stopImmediatePropagation();
                                productSearchRef.current?.focus();
                              }
                            }}
                            onChange={(e) => {
                              if (!e.target.value) {
                                selectedProducts[index].unit_price = "";
                                selectedProducts[index].unit_price_with_vat = "";
                                setSelectedProducts([...selectedProducts]);
                                return;
                              }
                              selectedProducts[index].unit_price = parseFloat(e.target.value);
                              selectedProducts[index].unit_price_with_vat = parseFloat(trimTo2Decimals(selectedProducts[index].unit_price * (1 + ((formData.vat_percent || 0) / 100))));
                              selectedProducts[index].unit_discount_with_vat = parseFloat(trimTo2Decimals((selectedProducts[index].unit_discount || 0) * (1 + ((formData.vat_percent || 0) / 100))));
                              CalCulateLineTotals(index);
                              reCalculate();
                            }} />
                        </td>);
                        if (col.key === 'unit_price_with_vat' && store.settings?.add_price_details_in_delivery_note) return (<td key="unit_price_with_vat" style={{ verticalAlign: 'middle', padding: '4px 8px' }}>
                          <input type="number"
                            style={{ minWidth: "60px", maxWidth: "120px" }}
                            value={product.unit_price_with_vat}
                            className="form-control"
                            placeholder="Unit Price(with VAT)"
                            onWheel={(e) => e.target.blur()}
                            onKeyDown={(e) => {
                              if (e.key === "Backspace") {
                                selectedProducts[index].unit_price_with_vat = "";
                                selectedProducts[index].unit_price = "";
                                setSelectedProducts([...selectedProducts]);
                                CalCulateLineTotals(index);
                                reCalculate();
                              }
                            }}
                            onChange={(e) => {
                              if (!e.target.value) {
                                selectedProducts[index].unit_price_with_vat = "";
                                selectedProducts[index].unit_price = "";
                                setSelectedProducts([...selectedProducts]);
                                return;
                              }
                              selectedProducts[index].unit_price_with_vat = parseFloat(e.target.value);
                              selectedProducts[index].unit_price = parseFloat(trimTo2Decimals(selectedProducts[index].unit_price_with_vat / (1 + ((formData.vat_percent || 0) / 100))));
                              selectedProducts[index].unit_discount_with_vat = parseFloat(trimTo2Decimals((selectedProducts[index].unit_discount || 0) * (1 + ((formData.vat_percent || 0) / 100))));
                              CalCulateLineTotals(index);
                              reCalculate();
                            }} />
                        </td>);
                        if (col.key === 'purchase_unit_price' && store.settings?.add_price_details_in_delivery_note) return (<td key="purchase_unit_price" style={{ verticalAlign: 'middle', padding: '4px 8px' }}>
                          <input type="number"
                            style={{ minWidth: "60px", maxWidth: "120px" }}
                            value={product.purchase_unit_price}
                            className="form-control"
                            placeholder="Purchase Unit Price"
                            onWheel={(e) => e.target.blur()}
                            onKeyDown={(e) => {
                              if (e.key === "Backspace") {
                                selectedProducts[index].purchase_unit_price = "";
                                selectedProducts[index].purchase_unit_price_with_vat = "";
                                setSelectedProducts([...selectedProducts]);
                              }
                            }}
                            onChange={(e) => {
                              if (!e.target.value) {
                                selectedProducts[index].purchase_unit_price = "";
                                selectedProducts[index].purchase_unit_price_with_vat = "";
                                setSelectedProducts([...selectedProducts]);
                                return;
                              }
                              selectedProducts[index].purchase_unit_price = parseFloat(e.target.value);
                              selectedProducts[index].purchase_unit_price_with_vat = parseFloat(trimTo2Decimals(selectedProducts[index].purchase_unit_price * (1 + ((formData.vat_percent || 0) / 100))));
                              setSelectedProducts([...selectedProducts]);
                            }} />
                        </td>);
                        if (col.key === 'purchase_unit_price_with_vat' && store.settings?.add_price_details_in_delivery_note) return (<td key="purchase_unit_price_with_vat" style={{ verticalAlign: 'middle', padding: '4px 8px' }}>
                          <input type="number"
                            style={{ minWidth: "60px", maxWidth: "120px" }}
                            value={product.purchase_unit_price_with_vat}
                            className="form-control"
                            placeholder="Purchase Unit Price(with VAT)"
                            onWheel={(e) => e.target.blur()}
                            onKeyDown={(e) => {
                              if (e.key === "Backspace") {
                                selectedProducts[index].purchase_unit_price_with_vat = "";
                                selectedProducts[index].purchase_unit_price = "";
                                setSelectedProducts([...selectedProducts]);
                              }
                            }}
                            onChange={(e) => {
                              if (!e.target.value) {
                                selectedProducts[index].purchase_unit_price_with_vat = "";
                                selectedProducts[index].purchase_unit_price = "";
                                setSelectedProducts([...selectedProducts]);
                                return;
                              }
                              selectedProducts[index].purchase_unit_price_with_vat = parseFloat(e.target.value);
                              selectedProducts[index].purchase_unit_price = parseFloat(trimTo2Decimals(selectedProducts[index].purchase_unit_price_with_vat / (1 + ((formData.vat_percent || 0) / 100))));
                              setSelectedProducts([...selectedProducts]);
                            }} />
                        </td>);
                        if (col.key === 'unit_discount' && store.settings?.add_price_details_in_delivery_note) return (<td key="unit_discount" style={{ verticalAlign: 'middle', padding: '4px 8px' }}>
                          <input type="number"
                            style={{ minWidth: "60px", maxWidth: "100px" }}
                            value={product.unit_discount}
                            className="form-control"
                            placeholder="Disc.(without VAT)"
                            onWheel={(e) => e.target.blur()}
                            onKeyDown={(e) => {
                              if (e.key === "Backspace") {
                                selectedProducts[index].unit_discount = "";
                                selectedProducts[index].unit_discount_with_vat = "";
                                setSelectedProducts([...selectedProducts]);
                                CalCulateLineTotals(index);
                                reCalculate();
                              }
                            }}
                            onChange={(e) => {
                              if (!e.target.value) {
                                selectedProducts[index].unit_discount = "";
                                selectedProducts[index].unit_discount_with_vat = "";
                                setSelectedProducts([...selectedProducts]);
                                return;
                              }
                              selectedProducts[index].unit_discount = parseFloat(e.target.value);
                              selectedProducts[index].unit_discount_with_vat = parseFloat(trimTo2Decimals(selectedProducts[index].unit_discount * (1 + ((formData.vat_percent || 0) / 100))));
                              CalCulateLineTotals(index);
                              reCalculate();
                            }} />
                        </td>);
                        if (col.key === 'unit_discount_with_vat' && store.settings?.add_price_details_in_delivery_note) return (<td key="unit_discount_with_vat" style={{ verticalAlign: 'middle', padding: '4px 8px' }}>
                          <input type="number"
                            style={{ minWidth: "60px", maxWidth: "100px" }}
                            value={product.unit_discount_with_vat}
                            className="form-control"
                            placeholder="Disc.(with VAT)"
                            onWheel={(e) => e.target.blur()}
                            onKeyDown={(e) => {
                              if (e.key === "Backspace") {
                                selectedProducts[index].unit_discount_with_vat = "";
                                selectedProducts[index].unit_discount = "";
                                setSelectedProducts([...selectedProducts]);
                                CalCulateLineTotals(index);
                                reCalculate();
                              }
                            }}
                            onChange={(e) => {
                              if (!e.target.value) {
                                selectedProducts[index].unit_discount_with_vat = "";
                                selectedProducts[index].unit_discount = "";
                                setSelectedProducts([...selectedProducts]);
                                return;
                              }
                              selectedProducts[index].unit_discount_with_vat = parseFloat(e.target.value);
                              selectedProducts[index].unit_discount = parseFloat(trimTo2Decimals(selectedProducts[index].unit_discount_with_vat / (1 + ((formData.vat_percent || 0) / 100))));
                              CalCulateLineTotals(index);
                              reCalculate();
                            }} />
                        </td>);
                        if (col.key === 'price' && store.settings?.add_price_details_in_delivery_note) return (<td key="price" style={{ verticalAlign: 'middle', padding: '4px 8px' }}>
                          <input type="number"
                            style={{ minWidth: "60px", maxWidth: "120px" }}
                            value={product.line_total !== undefined ? product.line_total : trimTo2Decimals(((product.unit_price || 0) - (product.unit_discount || 0)) * (product.quantity || 0))}
                            className="form-control"
                            placeholder="Price(without VAT)"
                            onWheel={(e) => e.target.blur()}
                            onKeyDown={(e) => {
                              if (e.key === "Backspace") {
                                selectedProducts[index].line_total = "";
                                selectedProducts[index].line_total_with_vat = "";
                                selectedProducts[index].unit_price = "";
                                selectedProducts[index].unit_price_with_vat = "";
                                setSelectedProducts([...selectedProducts]);
                                reCalculate();
                              }
                            }}
                            onChange={(e) => {
                              if (!e.target.value) {
                                selectedProducts[index].line_total = "";
                                selectedProducts[index].line_total_with_vat = "";
                                selectedProducts[index].unit_price = "";
                                selectedProducts[index].unit_price_with_vat = "";
                                setSelectedProducts([...selectedProducts]);
                                return;
                              }
                              selectedProducts[index].line_total = parseFloat(e.target.value);
                              if (selectedProducts[index].quantity > 0) {
                                selectedProducts[index].unit_price = parseFloat(trimTo8Decimals((selectedProducts[index].line_total / selectedProducts[index].quantity) + (selectedProducts[index].unit_discount || 0)));
                                selectedProducts[index].unit_price_with_vat = parseFloat(trimTo8Decimals(selectedProducts[index].unit_price * (1 + ((formData.vat_percent || 0) / 100))));
                                selectedProducts[index].line_total_with_vat = parseFloat(trimTo2Decimals(selectedProducts[index].unit_price_with_vat * selectedProducts[index].quantity));
                              }
                              setSelectedProducts([...selectedProducts]);
                              reCalculate();
                            }} />
                        </td>);
                        if (col.key === 'price_with_vat' && store.settings?.add_price_details_in_delivery_note) return (<td key="price_with_vat" style={{ verticalAlign: 'middle', padding: '4px 8px' }}>
                          <input type="number"
                            style={{ minWidth: "60px", maxWidth: "120px" }}
                            value={product.line_total_with_vat !== undefined ? product.line_total_with_vat : trimTo2Decimals(((product.unit_price_with_vat || 0) - (product.unit_discount_with_vat || 0)) * (product.quantity || 0))}
                            className="form-control"
                            placeholder="Price(with VAT)"
                            onWheel={(e) => e.target.blur()}
                            onKeyDown={(e) => {
                              if (e.key === "Backspace") {
                                selectedProducts[index].line_total_with_vat = "";
                                selectedProducts[index].line_total = "";
                                selectedProducts[index].unit_price_with_vat = "";
                                selectedProducts[index].unit_price = "";
                                setSelectedProducts([...selectedProducts]);
                                reCalculate();
                              }
                            }}
                            onChange={(e) => {
                              if (!e.target.value) {
                                selectedProducts[index].line_total_with_vat = "";
                                selectedProducts[index].line_total = "";
                                selectedProducts[index].unit_price_with_vat = "";
                                selectedProducts[index].unit_price = "";
                                setSelectedProducts([...selectedProducts]);
                                return;
                              }
                              selectedProducts[index].line_total_with_vat = parseFloat(e.target.value);
                              if (selectedProducts[index].quantity > 0) {
                                selectedProducts[index].unit_price_with_vat = parseFloat(trimTo8Decimals((selectedProducts[index].line_total_with_vat / selectedProducts[index].quantity) + (selectedProducts[index].unit_discount_with_vat || 0)));
                                selectedProducts[index].unit_price = parseFloat(trimTo8Decimals(selectedProducts[index].unit_price_with_vat / (1 + ((formData.vat_percent || 0) / 100))));
                                selectedProducts[index].line_total = parseFloat(trimTo2Decimals(selectedProducts[index].unit_price * selectedProducts[index].quantity));
                              }
                              setSelectedProducts([...selectedProducts]);
                              reCalculate();
                            }} />
                        </td>);
                        return null;
                      })}
                    </tr>
                  )).reverse()}
                </tbody>
              </table>
              </div>
            </section>

            {store.settings?.add_price_details_in_delivery_note && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 0 0 0', position: 'relative' }}>
                {showDNSummarySettings && (
                  <div className="dn-summary-popup" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1060, background: '#fff', border: '1px solid #dee2e6', borderRadius: '8px', padding: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.22)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <strong style={{ fontSize: '13px' }}>Customize Summary</strong>
                      <button type="button" className="btn-close" style={{ fontSize: '10px' }} onClick={() => setShowDNSummarySettings(false)}></button>
                    </div>
                    <div style={{ fontSize: '11px', color: '#888', marginBottom: '8px' }}>Toggle visibility or drag to reorder</div>
                    {dnSummaryOrder.map((key, idx) => (
                      <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '3px 0', borderBottom: '1px solid #f5f5f5', cursor: 'grab' }}
                        draggable
                        onDragStart={() => { dnSummaryDragRef.current = idx; }}
                        onDragOver={e => e.preventDefault()}
                        onDrop={() => { reorderDnSummary(dnSummaryDragRef.current, idx); dnSummaryDragRef.current = null; }}>
                        <span style={{ color: '#bbb', fontSize: '15px', userSelect: 'none', flexShrink: 0 }}>⠿</span>
                        <input type="checkbox" className="form-check-input m-0" checked={!!dnSummaryVisible[key]} onChange={e => updateDnSummaryVisible(key, e.target.checked)} style={{ width: '14px', height: '14px', flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: '12px' }}>{_dnSummaryLabels[key]}</span>
                      </div>
                    ))}
                    <button type="button" className="btn btn-sm btn-outline-secondary mt-2 w-100" style={{ fontSize: '11px' }} onClick={() => {
                      setDnSummaryOrder(_dnSummaryDefaultOrder);
                      setDnSummaryVisible(Object.fromEntries(_dnSummaryDefaultOrder.map(k => [k, true])));
                      localStorage.removeItem('dn_summary_visible');
                      localStorage.removeItem('dn_summary_order');
                    }}>Reset to Default</button>
                  </div>
                )}
                <div className="dn-summary-card" style={{ display: 'flex', flexDirection: 'column', gap: '0', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                  <div style={{ padding: '6px 16px', borderBottom: '1px solid #c3c6d7', backgroundColor: '#f2f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#191c1e', fontFamily: "'Hanken Grotesk', sans-serif" }}>Summary</span>
                    <button type="button" title="Customize Summary" onClick={() => setShowDNSummarySettings(v => !v)}
                      style={{ background: 'none', border: '1px solid #c3c6d7', borderRadius: '4px', padding: '1px 5px', cursor: 'pointer', color: '#6b7280', lineHeight: 1 }}
                      onMouseEnter={e => e.currentTarget.style.color='#191c1e'}
                      onMouseLeave={e => e.currentTarget.style.color='#6b7280'}>
                      <i className="bi bi-gear-fill" style={{ fontSize: '11px' }}></i>
                    </button>
                  </div>
                  <div style={{ padding: '6px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {dnSummaryOrder.filter(key => dnSummaryVisible[key]).map(key => {
                      switch (key) {
                        case 'total_without_vat': return (
                          <div key="total_without_vat" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', lineHeight: '20px' }}>
                            <span style={{ color: '#434655' }}>Total (ex. VAT)</span>
                            <span style={{ fontWeight: 500 }}><Amount amount={trimTo2Decimals(formData.total || 0)} /></span>
                          </div>
                        );
                        case 'total_with_vat': return (
                          <div key="total_with_vat" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', lineHeight: '20px' }}>
                            <span style={{ color: '#434655' }}>Total (inc. VAT)</span>
                            <span style={{ fontWeight: 500 }}><Amount amount={trimTo2Decimals(formData.total_with_vat || 0)} /></span>
                          </div>
                        );
                        case 'shipping': return (
                          <div key="shipping" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', lineHeight: '20px' }}>
                            <span style={{ color: '#434655' }}>Shipping &amp; Handling</span>
                            <input type="number" className="form-control form-control-sm text-end" style={{ width: '110px' }}
                              value={formData.shipping_handling_fees}
                              onWheel={(e) => e.target.blur()}
                              onChange={(e) => {
                                if (!e.target.value) { formData.shipping_handling_fees = ""; setFormData({ ...formData }); return; }
                                formData.shipping_handling_fees = parseFloat(e.target.value);
                                setFormData({ ...formData }); reCalculate();
                              }} />
                          </div>
                        );
                        case 'discount_without_vat': return (
                          <div key="discount_without_vat" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', lineHeight: '20px' }}>
                            <span style={{ color: '#434655' }}>Discount (ex. VAT)&nbsp;<span style={{ fontSize: '11px', color: '#888' }}>{discountPercent}%</span></span>
                            <input type="number" className="form-control form-control-sm text-end" style={{ width: '110px' }}
                              value={formData.discount}
                              onWheel={(e) => e.target.blur()}
                              onChange={(e) => {
                                if (!e.target.value) { formData.discount = ""; formData.discount_with_vat = ""; setFormData({ ...formData }); return; }
                                formData.discount = parseFloat(e.target.value);
                                formData.discount_with_vat = parseFloat(trimTo2Decimals(formData.discount * (1 + ((formData.vat_percent || 0) / 100))));
                                setFormData({ ...formData }); reCalculate();
                              }} />
                          </div>
                        );
                        case 'discount_with_vat': return (
                          <div key="discount_with_vat" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', lineHeight: '20px' }}>
                            <span style={{ color: '#434655' }}>Discount (inc. VAT)&nbsp;<span style={{ fontSize: '11px', color: '#888' }}>{discountPercentWithVAT}%</span></span>
                            <input type="number" className="form-control form-control-sm text-end" style={{ width: '110px' }}
                              value={formData.discount_with_vat}
                              onWheel={(e) => e.target.blur()}
                              onChange={(e) => {
                                if (!e.target.value) { formData.discount_with_vat = ""; formData.discount = ""; setFormData({ ...formData }); return; }
                                formData.discount_with_vat = parseFloat(e.target.value);
                                formData.discount = parseFloat(trimTo2Decimals(formData.discount_with_vat / (1 + ((formData.vat_percent || 0) / 100))));
                                setFormData({ ...formData }); reCalculate();
                              }} />
                          </div>
                        );
                        case 'taxable_amount': return (
                          <div key="taxable_amount" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', lineHeight: '20px' }}>
                            <span style={{ color: '#434655' }}>Taxable Amount (ex. VAT)&nbsp;<OverlayTrigger placement="left" trigger="click" show={openSummaryTooltip === 'taxable'} overlay={renderTaxableAmountTooltip()}><span style={{ textDecoration: 'underline dotted', cursor: 'pointer', color: '#888' }} onClick={(e) => { e.stopPropagation(); setOpenSummaryTooltip(p => p === 'taxable' ? null : 'taxable'); }}>ℹ️</span></OverlayTrigger></span>
                            <span style={{ fontWeight: 500 }}><Amount amount={trimTo2Decimals((formData.total || 0) + (formData.shipping_handling_fees || 0) - (formData.discount || 0))} /></span>
                          </div>
                        );
                        case 'vat': return (
                          <div key="vat" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', lineHeight: '20px' }}>
                            <span style={{ color: '#434655', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              VAT
                              <input type="number" className="form-control form-control-sm text-end d-inline" style={{ width: '54px' }}
                                value={formData.vat_percent || 0}
                                onWheel={(e) => e.target.blur()}
                                onChange={(e) => { formData.vat_percent = parseFloat(e.target.value) || 0; setFormData({ ...formData }); reCalculate(); }} />
                              %
                            </span>
                            <span style={{ fontWeight: 500 }}><Amount amount={trimTo2Decimals(formData.vat_price || 0)} /></span>
                          </div>
                        );
                        case 'net_before_rounding': return (
                          <div key="net_before_rounding" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', lineHeight: '20px' }}>
                            <span style={{ color: '#434655' }}>Before Rounding&nbsp;<OverlayTrigger placement="left" trigger="click" show={openSummaryTooltip === 'before_rounding'} overlay={renderNetTotalBeforeRoundingTooltip()}><span style={{ textDecoration: 'underline dotted', cursor: 'pointer', color: '#888' }} onClick={(e) => { e.stopPropagation(); setOpenSummaryTooltip(p => p === 'before_rounding' ? null : 'before_rounding'); }}>ℹ️</span></OverlayTrigger></span>
                            <span style={{ fontWeight: 500 }}><Amount amount={trimTo2Decimals((formData.net_total || 0) - (formData.rounding_amount || 0))} /></span>
                          </div>
                        );
                        case 'rounding': return (
                          <div key="rounding" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', lineHeight: '20px' }}>
                            <span style={{ color: '#434655', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              Rounding
                              <label style={{ fontSize: '11px', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', marginBottom: 0 }}>
                                <input type="checkbox" checked={formData.auto_rounding_amount || false} onChange={(e) => { formData.auto_rounding_amount = e.target.checked; setFormData({ ...formData }); reCalculate(); }} />
                                Auto
                              </label>
                            </span>
                            <input type="number" className="form-control form-control-sm text-end" style={{ width: '110px' }}
                              value={formData.rounding_amount}
                              disabled={formData.auto_rounding_amount}
                              onWheel={(e) => e.target.blur()}
                              onChange={(e) => {
                                if (!e.target.value) { formData.rounding_amount = ""; setFormData({ ...formData }); return; }
                                formData.rounding_amount = parseFloat(e.target.value);
                                setFormData({ ...formData }); reCalculate();
                              }} />
                          </div>
                        );
                        default: return null;
                      }
                    })}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '15px', fontWeight: 700, paddingTop: '10px', borderTop: '1px solid #c3c6d7', color: '#191c1e', marginTop: '2px' }}>
                      <span>Net Total (inc. VAT)&nbsp;<OverlayTrigger placement="left" trigger="click" show={openSummaryTooltip === 'net_total'} overlay={renderNetTotalTooltip()}><span style={{ textDecoration: 'underline dotted', cursor: 'pointer', fontSize: '13px', color: '#888' }} onClick={(e) => { e.stopPropagation(); setOpenSummaryTooltip(p => p === 'net_total' ? null : 'net_total'); }}>ℹ️</span></OverlayTrigger></span>
                      <span style={{ color: '#004ac6' }}><Amount amount={trimTo2Decimals(formData.net_total || 0)} /></span>
                    </div>
                  </div>
                </div>
              </div>
            )}
              </div>{/* end product CARD */}

            </div>{/* end maxWidth wrapper */}
          </form>
        </Modal.Body>

      </Modal>


      {/* DN SP Table Settings Modal */}
      < Modal show={showDNSPSettings} onHide={() => setShowDNSPSettings(false)} size="md" >
        <Modal.Header closeButton>
          <Modal.Title>Table Settings</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <DragDropContext onDragEnd={onDragEndDNSP}>
            <Droppable droppableId="dn-sp-columns">
              {(provided) => (
                <ul className="list-group" {...provided.droppableProps} ref={provided.innerRef}>
                  {dnSPColumns.map((col, idx) => (
                    <Draggable key={col.key} draggableId={col.key} index={idx}>
                      {(provided) => (
                        <li className="list-group-item d-flex align-items-center gap-2"
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}>
                          <input type="checkbox" checked={col.visible}
                            onChange={() => handleToggleDNSPColumn(col.key)} />
                          {col.label}
                        </li>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </ul>
              )}
            </Droppable>
          </DragDropContext>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={restoreDefaultDNSPSettings}>Restore Defaults</Button>
          <Button variant="primary" onClick={() => setShowDNSPSettings(false)}>Close</Button>
        </Modal.Footer>
      </Modal >

    </>
  );
});

export default DeliveryNoteCreate;
