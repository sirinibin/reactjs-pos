import React, { useState, useEffect, useRef, useMemo, forwardRef, useImperativeHandle, useCallback } from "react";
import Preview from "./../order/preview.js";
import { Modal, Button } from "react-bootstrap";
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
import { Dropdown, Alert } from 'react-bootstrap';
import SalesHistory from "./../product/sales_history.js";
import SalesReturnHistory from "./../product/sales_return_history.js";
import PurchaseHistory from "./../product/purchase_history.js";
import PurchaseReturnHistory from "./../product/purchase_return_history.js";
import QuotationHistory from "./../product/quotation_history.js";
import DeliveryNoteHistory from "./../product/delivery_note_history.js";
import Products from "../utils/products.js";
import Customers from "./../utils/customers.js";
import ResizableTableCell from './../utils/ResizableTableCell';
import ImageViewerModal from './../utils/ImageViewerModal';
import * as bootstrap from 'bootstrap';
//import OverflowTooltip from "../utils/OverflowTooltip.js";
import Amount from "../utils/amount.js";
import { trimTo2Decimals } from "../utils/numberUtils";
import { highlightWords } from "../utils/search.js";
import ProductHistory from "./../product/product_history.js";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

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
        discountValue: 0.0,
        discount_percent: 0.0,
        shipping_handling_fees: 0.00,
        is_discount_percent: false,
        date_str: format(new Date(), "MMM dd yyyy"),
        signature_date_str: format(new Date(), "MMM dd yyyy"),
        status: "delivered",
        remarks: "",
        price_type: "retail",
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

  function openUpdateProductForm(id) {
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
    if (index) {
      checkError(index);
    } else {
      for (let i = 0; i < selectedProducts.length; i++) {
        checkError(i);
      }
    }
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


  async function checkWarnings(index) {
    if (index) {
      checkWarning(index);
    } else {
      for (let i = 0; i < selectedProducts.length; i++) {
        checkWarning(i);
      }
    }
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
      if (oldProducts[j].product_id === selectedProducts[j].product_id) {
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
        console.log("Enter key was pressed. Run your function.");
        // event.preventDefault();

        var form = event.target.form;
        if (form && event.target) {
          var index = Array.prototype.indexOf.call(form, event.target);
          if (form && form.elements[index + 1]) {
            if (event.target.getAttribute("class").includes("barcode")) {
              form.elements[index].focus();
            } else if (event.target.getAttribute("class").includes("productSearch")) {
              //  moveToProductSearch();
              //productSearchRef.current?.focus();
            } else if (event.target.getAttribute("class").includes("delivery_note_quantity")) {
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


  //fields
  let [formData, setFormData] = useState({
    vat_percent: 15.0,
    discount: 0.0,
    discountValue: 0.0,
    discount_percent: 0.0,
    date_str: format(new Date(), "MMM dd yyyy"),
    signature_date_str: format(new Date(), "MMM dd yyyy"),
    status: "created",
    price_type: "retail",
    is_discount_percent: false,
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
          discount: deliverynote.discount,
          discount_percent: deliverynote.discount_percent,
          status: deliverynote.status,
          delivered_by: deliverynote.delivered_by,
          delivered_by_signature_id: deliverynote.delivered_by_signature_id,
          is_discount_percent: deliverynote.is_discount_percent,
          shipping_handling_fees: deliverynote.shipping_handling_fees,
          customer: deliverynote.customer,
          remarks: deliverynote.remarks,
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
          let selectedCustomers = [
            {
              id: deliverynote.customer_id,
              name: deliverynote.customer.name,
              search_label: deliverynote.customer.search_label,
            }
          ];
          setSelectedCustomers([...selectedCustomers]);
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

  function ObjectToSearchQueryParams(object) {
    return Object.keys(object)
      .map(function (key) {
        return `search[${key}]=` + encodeURIComponent(object[key]);
      })
      .join("&");
  }



  const customCustomerFilter = useCallback((option, query) => {
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


  let [openCustomerSearchResult, setOpenCustomerSearchResult] = useState(false);

  async function suggestCustomers(searchTerm) {
    console.log("Inside handle suggestCustomers");
    setCustomerOptions([]);

    console.log("searchTerm:" + searchTerm);
    if (!searchTerm) {
      setTimeout(() => {
        openCustomerSearchResult = false;
        setOpenCustomerSearchResult(false);
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

    let Select = "select=id,credit_balance,credit_limit,code,vat_no,remarks,name,phone,name_in_arabic,phone_in_arabic,search_label";
    //setIsCustomersLoading(true);
    let result = await fetch(
      "/v1/customer?" + Select + queryString,
      requestOptions
    );
    let data = await result.json();

    if (!data.result || data.result.length === 0) {
      openCustomerSearchResult = false;
      setOpenCustomerSearchResult(false);
      return;
    }

    openCustomerSearchResult = true;
    setOpenCustomerSearchResult(true);

    const filtered = data.result.filter((opt) => customCustomerFilter(opt, searchTerm));

    setCustomerOptions(filtered);
    // setIsCustomersLoading(false);
  }

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



  function RunKeyActions(event, product) {
    const isMac = navigator.userAgentData
      ? navigator.userAgentData.platform === 'macOS'
      : /Mac/i.test(navigator.userAgent);

    const isCmdOrCtrl = isMac ? event.metaKey : event.ctrlKey;

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
      openDeliveryNoteHistory(product);
    } else if (event.key === "F2") {
      openQuotationHistory(product);
    } else if (isCmdOrCtrl && event.shiftKey && event.key.toLowerCase() === 'f') {
      openProductImages(product.product_id);
    }
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

    let partNoLabel = "";
    if (option.prefix_part_number) {
      partNoLabel = option.prefix_part_number + " - " + option.part_number;
    }

    const fields = [
      partNoLabel,
      option.prefix_part_number,
      option.part_number,
      option.name,
      option.name_in_arabic,
      option.country_name,
      option.brand_name,
      ...(Array.isArray(option.additional_keywords) ? option.additional_keywords : []),
    ];

    const searchable = normalize(fields.join(" "));

    return qWords.every((word) => searchable.includes(word));
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

    var params = {
      search_text: searchTerm,
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

    let Select = `select=id,rack,allow_duplicates,additional_keywords,search_label,set.name,item_code,prefix_part_number,country_name,brand_name,part_number,name,unit,name_in_arabic,product_stores.${localStorage.getItem('store_id')}.purchase_unit_price,product_stores.${localStorage.getItem('store_id')}.purchase_unit_price_with_vat,product_stores.${localStorage.getItem('store_id')}.retail_unit_price,product_stores.${localStorage.getItem('store_id')}.retail_unit_price_with_vat,product_stores.${localStorage.getItem('store_id')}.stock`;

    // Fetch page 1 and page 2 in parallel
    const urls = [
      "/v1/product?" + Select + queryString + "&limit=200&page=1&sort=-country_name",
      "/v1/product?" + Select + queryString + "&limit=200&page=2&sort=-country_name"
    ];

    const [result1, result2] = await Promise.all([
      fetch(urls[0], requestOptions),
      fetch(urls[1], requestOptions)
    ]);

    const data1 = await result1.json();
    const data2 = await result2.json();

    // Only update if this is the latest request
    if (latestRequestRef.current !== requestId) return;

    // Combine results from both pages
    let products = [
      ...(data1.result || []),
      ...(data2.result || [])
    ];

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

      const words = searchTerm.toLowerCase().split(" ").filter(Boolean);
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
        unit_price: parseFloat(selectedProducts[i].unit_price),
        purchase_unit_price: parseFloat(selectedProducts[i].purchase_unit_price),
        unit: selectedProducts[i].unit,
      });
    }

    formData.discount = parseFloat(formData.discount);
    formData.discount_percent = parseFloat(formData.discount_percent);
    formData.vat_percent = parseFloat(formData.vat_percent);

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

    let productStore = GetProductUnitPriceInStore(
      formData.store_id,
      product.stores
    );
    product.unit_price = productStore.retail_unit_price ? productStore.retail_unit_price : 0.00;
    product.purchase_unit_price = productStore.purchase_unit_price ? productStore.purchase_unit_price : 0.00;

    let alreadyAdded = false;
    let index = -1;
    let quantity = 0.00;
    product.quantity = 1.00;

    if (isProductAdded(product.id) && !product.allow_duplicates) {
      alreadyAdded = true;
      index = getProductIndex(product.id);
      // quantity = parseFloat(selectedProducts[index].quantity + product.quantity);
      quantity = parseFloat(selectedProducts[index].quantity);
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
        quantity: product.quantity,
        stores: product.stores,
        unit: product.unit,
        stock: product.product_stores[localStorage.getItem("store_id")]?.stock ? product.product_stores[localStorage.getItem("store_id")]?.stock : 0,
      };

      if (product.unit_price) {
        item.unit_price = parseFloat(product.unit_price);
        console.log("item.unit_price:", item.unit_price);
      }

      if (product.purchase_unit_price) {
        item.purchase_unit_price = parseFloat(product.purchase_unit_price);
        console.log("item.purchase_unit_price", item.purchase_unit_price);
      }

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

  function findTotalPrice() {
    totalPrice = 0.00;
    for (var i = 0; i < selectedProducts.length; i++) {
      totalPrice +=
        parseFloat(selectedProducts[i].unit_price) *
        parseFloat(selectedProducts[i].quantity);
    }
    totalPrice = totalPrice.toFixed(2);
    setTotalPrice(totalPrice);
  }

  let [vatPrice, setVatPrice] = useState(0.00);

  function findVatPrice() {
    vatPrice = 0.00;
    if (totalPrice > 0) {
      vatPrice = (parseFloat((parseFloat(formData.vat_percent) / 100)) * (parseFloat(totalPrice) + parseFloat(formData.shipping_handling_fees) - parseFloat(formData.discount))).toFixed(2);;
      console.log("vatPrice:", vatPrice);
    }
    setVatPrice(vatPrice);
  }

  let [netTotal, setNetTotal] = useState(0.00);

  function findNetTotal() {
    netTotal = 0.00;
    if (totalPrice > 0) {
      netTotal = (parseFloat(totalPrice) + parseFloat(formData.shipping_handling_fees) - parseFloat(formData.discount) + parseFloat(vatPrice)).toFixed(2);
    }
    setNetTotal(netTotal);
  }

  let [discountPercent, setDiscountPercent] = useState(0.00);

  function findDiscountPercent() {
    if (formData.discount >= 0 && totalPrice > 0) {
      discountPercent = parseFloat(parseFloat(formData.discount / totalPrice) * 100).toFixed(2);
      setDiscountPercent(discountPercent);
      formData.discount_percent = discountPercent;
      setFormData({ ...formData });
    }
  }

  function findDiscount() {
    if (formData.discount_percent >= 0 && totalPrice > 0) {
      formData.discount = parseFloat(totalPrice * parseFloat(formData.discount_percent / 100)).toFixed(2);
      setFormData({ ...formData });
    }
  }


  function reCalculate() {
    findTotalPrice();
    if (formData.is_discount_percent) {
      findDiscount();
    } else {
      findDiscountPercent();
    }
    findVatPrice();
    findNetTotal();
  }

  const CustomerCreateFormRef = useRef();
  function openCustomerCreateForm() {
    CustomerCreateFormRef.current.open();
  }


  const ProductCreateFormRef = useRef();
  function openProductCreateForm() {
    ProductCreateFormRef.current.open();
  }

  function openProductUpdateForm(id) {
    ProductCreateFormRef.current.open(id);
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
    model.net_total = netTotal;
    model.vat_price = vatPrice;
    model.total = totalPrice;

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
  function openQuotationHistory(model) {
    QuotationHistoryRef.current.open(model, selectedCustomers);
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
      props.onSelectProducts(newlySelectedProducts, selectedCustomers); // Send to parent
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
    { key: "unit_price", label: "S.Unit Price", fieldName: "unit_price", width: 12, visible: true },
    { key: "stock", label: "Stock", fieldName: "stock", width: 5, visible: true },
    { key: "photos", label: "Photos", fieldName: "photos", width: 5, visible: true },
    { key: "brand", label: "Brand", fieldName: "brand", width: 10, visible: true },
    { key: "purchase_price", label: "P.Unit Price", fieldName: "purchase_price", width: 12, visible: true },
    { key: "country", label: "Country", fieldName: "country", width: 10, visible: true },
    { key: "rack", label: "Rack", fieldName: "rack", width: 5, visible: true },
  ], []);



  const [searchProductsColumns, setSearchProductsColumns] = useState(defaultSearchProductsColumns);

  const visibleColumns = searchProductsColumns.filter(c => c.visible);

  const totalWidth = visibleColumns.reduce((sum, col) => sum + col.width, 0);

  const getColumnWidth = (col) => `${(col.width / totalWidth) * 100}%`;

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


  return (
    <>


      <Modal show={showSuccess} onHide={() => setShowSuccess(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Success</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="success">
            {successMessage}
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSuccess(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={showProductSearchSettings}
        onHide={() => setShowProductSearchSettings(false)}
        centered
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <i
              className="bi bi-gear-fill"
              style={{ fontSize: "1.2rem", marginRight: "4px" }}
              title="Table Settings"

            />
            Product Search Settings
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {/* Column Settings */}
          {showProductSearchSettings && (
            <>
              <h6 className="mb-2">Customize Columns</h6>
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="columns">
                  {(provided) => (
                    <ul
                      className="list-group"
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                    >
                      {searchProductsColumns.map((col, index) => {
                        return (
                          <>
                            <Draggable
                              key={col.key}
                              draggableId={col.key}
                              index={index}
                            >
                              {(provided) => (
                                <li
                                  className="list-group-item d-flex justify-content-between align-items-center"
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}                                                        >
                                  <div>
                                    <input
                                      style={{ width: "20px", height: "20px" }}
                                      type="checkbox"
                                      className="form-check-input me-2"
                                      checked={col.visible}
                                      onChange={() => {
                                        handleToggleColumn(index);
                                      }}
                                    />
                                    {col.label}
                                  </div>
                                  <span style={{ cursor: "grab" }}>☰</span>
                                </li>
                              )}
                            </Draggable>
                          </>)
                      })}
                      {provided.placeholder}
                    </ul>
                  )}
                </Droppable>
              </DragDropContext>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowProductSearchSettings(false)}>
            Close
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              RestoreDefaultSettings();
              // Save to localStorage here if needed
              //setShowSettings(false);
            }}
          >
            Restore to Default
          </Button>
        </Modal.Footer>
      </Modal>
      <ProductHistory ref={ProductHistoryRef} showToastMessage={props.showToastMessage} />
      <ImageViewerModal ref={imageViewerRef} images={productImages} />
      <Customers ref={CustomersRef} onSelectCustomer={handleSelectedCustomer} showToastMessage={props.showToastMessage} />
      <Products ref={ProductsRef} onSelectProducts={handleSelectedProductsToDeliveryNote} showToastMessage={props.showToastMessage} />
      <SalesHistory ref={SalesHistoryRef} showToastMessage={props.showToastMessage} />
      <SalesReturnHistory ref={SalesReturnHistoryRef} showToastMessage={props.showToastMessage} />
      <PurchaseHistory ref={PurchaseHistoryRef} showToastMessage={props.showToastMessage} />
      <PurchaseReturnHistory ref={PurchaseReturnHistoryRef} showToastMessage={props.showToastMessage} />
      <QuotationHistory ref={QuotationHistoryRef} showToastMessage={props.showToastMessage} />
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
      <ProductCreate ref={ProductCreateFormRef} showToastMessage={props.showToastMessage} openDetailsView={openProductDetailsView} />
      <Preview ref={PreviewRef} />
      <CustomerCreate ref={CustomerCreateFormRef} showToastMessage={props.showToastMessage} />
      <UserCreate ref={UserCreateFormRef} showToastMessage={props.showToastMessage} />
      <SignatureCreate ref={SignatureCreateFormRef} showToastMessage={props.showToastMessage} />
      <Modal show={show} size="xl" fullscreen={!enableProductSelection} onHide={handleClose} animation={false} backdrop="static" scrollable={true}>
        <Modal.Header>
          <Modal.Title>
            {!enableProductSelection && formData.id ? "Update Delivery Note #" + formData.code : !enableProductSelection ? "Create New DeliveryNote" : ""}
            {enableProductSelection ? "Select products from Delivery Note #" + formData.code : ""}
          </Modal.Title>


          <div className="col align-self-end text-end">
            <Button variant="primary" onClick={openPreview}>
              <i className="bi bi-display"></i> Preview
            </Button>

            &nbsp;&nbsp; &nbsp;&nbsp; &nbsp;&nbsp;
            {formData.id ? <Button variant="primary" onClick={() => {
              handleClose();
              if (props.openDetailsView)
                props.openDetailsView(formData.id);
            }}>
              <i className="bi bi-eye"></i> View Detail
            </Button> : ""}
            &nbsp;&nbsp;
            <Button variant="primary" disabled={enableProductSelection} onClick={handleCreate} >
              {isProcessing ?
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden={true}
                />

                : ""
              }
              {formData.id && !isProcessing ? "Update" : !isProcessing ? "Create" : ""}

            </Button>
            <button
              type="button"
              className="btn-close"
              onClick={handleClose}
              aria-label="Close"
            ></button>
          </div>
        </Modal.Header>
        <Modal.Body>
          <div style={{
            maxHeight: "50px",        // Adjust based on design
            minHeight: "50px",
            overflowY: "scroll",
          }}>
            {errors && Object.keys(errors).length > 0 && (
              <div
                style={{
                  backgroundColor: "#fff0f0",
                  border: "1px solid #f5c6cb",
                  padding: "10px",
                  marginBottom: "10px",
                  borderRadius: "4px"
                }}
              >
                <ul style={{ marginBottom: 0 }}>
                  {Object.keys(errors).map((key, index) => {
                    const message = Array.isArray(errors[key]) ? errors[key][0] : errors[key];
                    return message ? (
                      <li key={index} style={{ color: "red" }}>
                        {message}
                      </li>
                    ) : null;
                  })}
                </ul>
              </div>
            )}
          </div>
          <form className="row g-3 needs-validation" onSubmit={handleCreate}>
            <div className="col-md-10">
              <label className="form-label">Customer</label>
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
                  }, 100);
                }}

                renderMenu={(results, menuProps, state) => {
                  const searchWords = state.text.toLowerCase().split(" ").filter(Boolean);

                  return (
                    <Menu {...menuProps}>
                      {/* Header */}
                      <MenuItem disabled>
                        <div style={{ display: 'flex', fontWeight: 'bold', padding: '4px 8px', borderBottom: '1px solid #ddd' }}>
                          <div style={{ width: '15%' }}>ID</div>
                          <div style={{ width: '42%' }}>Name</div>
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
                              <div style={{ ...columnStyle, width: '15%' }}>
                                {highlightWords(
                                  option.code,
                                  searchWords,
                                  isActive
                                )}
                              </div>
                              <div style={{ ...columnStyle, width: '42%' }}>
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
              <Button hide={true.toString()} onClick={openCustomerCreateForm} className="btn btn-outline-secondary btn-primary btn-sm" type="button" id="button-addon1"> <i className="bi bi-plus-lg"></i> New</Button>
              {errors.customer_id && (
                <div style={{ color: "red" }}>
                  {errors.customer_id}
                </div>
              )}
            </div>

            <div className="col-md-1">
              <Button className="btn btn-primary" style={{ marginTop: "30px" }} onClick={openCustomers}>
                <i class="bi bi-list"></i>
              </Button>
            </div>

            <div className="col-md-3">
              <label className="form-label">Product Barcode Scan</label>

              <div className="input-group mb-3">
                <DebounceInput
                  minLength={3}
                  debounceTimeout={500}
                  placeholder="Scan Barcode"
                  className="form-control"
                  value={formData.barcode}
                  onChange={event => getProductByBarCode(event.target.value)} />
                {errors.bar_code && (
                  <div style={{ color: "red" }}>
                    <i className="bi bi-x-lg"> </i>
                    {errors.bar_code}
                  </div>
                )}
                {formData.bar_code && !errors.bar_code && (
                  <div style={{ color: "green" }}>
                    <i className="bi bi-check-lg"> </i>
                    Looks good!
                  </div>
                )}
              </div>
            </div>

            <div className="col-md-3">
              <label className="form-label">Date*</label>

              <div className="input-group mb-3">
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
                    // formData.date_str = format(new Date(value), "MMMM d yyyy h:mm aa");
                    setFormData({ ...formData });
                  }}
                />

                {errors.date_str && (
                  <div style={{ color: "red" }}>

                    {errors.date_str}
                  </div>
                )}
              </div>
            </div>

            <div className="col-md-3">
              <label className="form-label">Remarks</label>
              <div className="input-group mb-3">
                <textarea
                  value={formData.remarks}
                  type='string'
                  onChange={(e) => {
                    delete errors["address"];
                    setErrors({ ...errors });
                    formData.remarks = e.target.value;
                    setFormData({ ...formData });
                    console.log(formData);
                  }}
                  className="form-control"
                  id="remarks"
                  placeholder="Remarks"
                />
              </div>
              {errors.remarks && (
                <div style={{ color: "red" }}>

                  {errors.remarks}
                </div>
              )}
            </div>

            <div className="col-md-10">
              <label className="form-label">Product*</label>
              <Typeahead
                id="product_id"
                size="lg"
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

                  // Reset after short delay
                  setTimeout(() => {
                    onChangeTriggeredRef.current = false;
                  }, 300);

                  if (selectedItems.length === 0) {
                    errors["product_id"] = "Invalid Product selected";
                    setErrors(errors);
                    return;
                  }
                  delete errors["product_id"];
                  setErrors({ ...errors });

                  if (formData.store_id) {
                    addProduct(selectedItems[0]);

                  }
                  setOpenProductSearchResult(false);
                  moveToProductQuantityInputBox();
                }}
                options={productOptions}
                selected={selectedProduct}
                placeholder="Part No. | Name | Name in Arabic | Brand | Country"
                highlightOnlyResult={true}
                onInputChange={(searchTerm, e) => {
                  if (timerRef.current) clearTimeout(timerRef.current);
                  timerRef.current = setTimeout(() => {
                    suggestProducts(searchTerm);
                  }, 100);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setProductOptions([]);
                    setOpenProductSearchResult(false);
                    productSearchRef.current?.clear();
                  }

                  moveToProductSearch();

                  /* if (e.key === "Enter") {
                     moveToProductSearch();
                   }*/


                }}
                renderMenu={(results, menuProps, state) => {
                  const searchWords = state.text.toLowerCase().split(" ").filter(Boolean);

                  return (
                    <Menu {...menuProps}>
                      {/* Header */}
                      <MenuItem disabled style={{ position: 'sticky', top: 0, padding: 0, margin: 0 }}>
                        <div style={{
                          background: '#f8f9fa',
                          zIndex: 2,
                          display: 'flex',
                          fontWeight: 'bold',
                          padding: '4px 8px',
                          border: "solid 0px",
                          borderBottom: '1px solid #ddd',
                          pointerEvents: "auto" // <-- allow click here
                        }}>
                          {searchProductsColumns.filter(c => c.visible).map((col) => {
                            return (<>
                              {col.key === "select" && <div style={{ width: getColumnWidth(col), border: "solid 0px", }}></div>}
                              {col.key === "part_number" && <div style={{ width: getColumnWidth(col), border: "solid 0px", }}>Part Number</div>}
                              {col.key === "name" && <div style={{ width: getColumnWidth(col), border: "solid 0px", }}>Name</div>}
                              {col.key === "unit_price" && <div style={{ width: getColumnWidth(col), border: "solid 0px", }}>S.Unit Price</div>}
                              {col.key === "stock" && <div style={{ width: getColumnWidth(col), border: "solid 0px", }}>Stock</div>}
                              {col.key === "photos" && <div style={{ width: getColumnWidth(col), border: "solid 0px", }}>Photos</div>}
                              {col.key === "brand" && <div style={{ width: getColumnWidth(col), border: "solid 0px", }}>Brand</div>}
                              {col.key === "purchase_price" && <div style={{ width: getColumnWidth(col), border: "solid 0px", }}>P.Unit Price</div>}
                              {col.key === "country" && <div style={{ width: getColumnWidth(col), border: "solid 0px", }}>Country</div>}
                              {col.key === "rack" && <div style={{ width: getColumnWidth(col), border: "solid 0px", }}>Rack</div>}
                            </>)
                          })}
                          {/* Settings icon on right */}
                          <div
                            style={{
                              position: "absolute",
                              right: "8px",
                              top: "50%",
                              transform: "translateY(-50%)",
                              cursor: "pointer",
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowProductSearchSettings(true);
                            }}
                          >
                            <i className="bi bi-gear-fill" />
                          </div>
                        </div>
                      </MenuItem>

                      {/* Rows */}
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
                                    <div
                                      className="form-check"
                                      style={{ ...columnStyle, width: getColumnWidth(col) }}
                                      onClick={e => {
                                        e.stopPropagation();     // Stop click bubbling to parent MenuItem
                                        checked = !checked;

                                        if (timerRef.current) clearTimeout(timerRef.current);
                                        timerRef.current = setTimeout(() => {
                                          if (checked) {
                                            addProduct(option);
                                          } else {
                                            removeProduct(option);
                                          }
                                        }, 100);

                                      }}
                                    >
                                      <input
                                        className="form-check-input"
                                        type="checkbox"
                                        value={checked}
                                        checked={checked}
                                        onClick={e => {
                                          e.stopPropagation();     // Stop click bubbling to parent MenuItem
                                        }}
                                        onChange={e => {
                                          e.preventDefault();      // Prevent default selection behavior
                                          e.stopPropagation();

                                          checked = !checked;

                                          if (timerRef.current) clearTimeout(timerRef.current);
                                          timerRef.current = setTimeout(() => {
                                            if (checked) {
                                              addProduct(option);
                                            } else {
                                              removeProduct(option);
                                            }
                                          }, 100);
                                        }}
                                      />
                                    </div>
                                  }
                                  {col.key === "part_number" &&
                                    <div style={{ ...columnStyle, width: getColumnWidth(col) }}>
                                      {highlightWords(
                                        option.prefix_part_number
                                          ? `${option.prefix_part_number} - ${option.part_number}`
                                          : option.part_number,
                                        searchWords,
                                        isActive
                                      )}
                                    </div>
                                  }
                                  {col.key === "name" &&
                                    <div style={{ ...columnStyle, width: getColumnWidth(col) }}>
                                      {highlightWords(
                                        option.name_in_arabic
                                          ? `${option.name} - ${option.name_in_arabic}`
                                          : option.name,
                                        searchWords,
                                        isActive
                                      )}
                                    </div>
                                  }
                                  {col.key === "unit_price" &&
                                    <div style={{ ...columnStyle, width: getColumnWidth(col) }}>
                                      {option.product_stores?.[localStorage.getItem("store_id")]?.retail_unit_price && (
                                        <>
                                          <Amount amount={trimTo2Decimals(option.product_stores?.[localStorage.getItem("store_id")]?.retail_unit_price)} />+
                                        </>
                                      )}
                                      {option.product_stores?.[localStorage.getItem("store_id")]?.retail_unit_price_with_vat && (
                                        <>
                                          |<Amount amount={trimTo2Decimals(option.product_stores?.[localStorage.getItem("store_id")]?.retail_unit_price_with_vat)} />
                                        </>
                                      )}
                                    </div>
                                  }
                                  {col.key === "stock" &&
                                    <div style={{ ...columnStyle, width: getColumnWidth(col) }}>
                                      {option.product_stores?.[localStorage.getItem("store_id")]?.stock ?? ''}
                                    </div>
                                  }
                                  {col.key === "photos" &&
                                    <div style={{ ...columnStyle, width: getColumnWidth(col) }}>
                                      <button
                                        type="button"
                                        className={isActive ? "btn btn-outline-light btn-sm" : "btn btn-outline-primary btn-sm"}
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          openProductImages(option.id);
                                        }}
                                      >
                                        <i className="bi bi-images" aria-hidden="true" />
                                      </button>
                                    </div>
                                  }
                                  {col.key === "brand" &&
                                    <div style={{ ...columnStyle, width: getColumnWidth(col) }}>
                                      {highlightWords(option.brand_name, searchWords, isActive)}
                                    </div>
                                  }
                                  {col.key === "purchase_price" &&
                                    <div style={{ ...columnStyle, width: getColumnWidth(col) }}>
                                      {option.product_stores?.[localStorage.getItem("store_id")]?.purchase_unit_price && (
                                        <>
                                          <Amount amount={trimTo2Decimals(option.product_stores?.[localStorage.getItem("store_id")]?.purchase_unit_price)} />+
                                        </>
                                      )}
                                      {option.product_stores?.[localStorage.getItem("store_id")]?.purchase_unit_price_with_vat && (
                                        <>
                                          |<Amount amount={trimTo2Decimals(option.product_stores?.[localStorage.getItem("store_id")]?.purchase_unit_price_with_vat)} />
                                        </>
                                      )}
                                    </div>
                                  }
                                  {col.key === "country" &&
                                    <div style={{ ...columnStyle, width: getColumnWidth(col) }}>
                                      {highlightWords(option.country_name, searchWords, isActive)}
                                    </div>
                                  }
                                  {col.key === "rack" &&
                                    <div style={{ ...columnStyle, width: getColumnWidth(col) }}>
                                      {highlightWords(option.rack, searchWords, isActive)}
                                    </div>
                                  }
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
              <Button hide={true.toString()} onClick={openProductCreateForm} className="btn btn-outline-secondary btn-primary btn-sm" type="button" id="button-addon1"> <i className="bi bi-plus-lg"></i> New</Button>
              {errors.product_id ? (
                <div style={{ color: "red" }}>
                  <i className="bi bi-x-lg"> </i>
                  {errors.product_id}
                </div>
              ) : null}
            </div>
            <div className="col-md-1">
              <Button className="btn btn-primary" style={{ marginTop: "30px" }} onClick={openProducts}>
                <i class="bi bi-list"></i>
              </Button>
            </div>

            <div className="table-responsive" style={{ overflowX: "auto", maxHeight: "400px", overflowY: "auto" }}>
              {enableProductSelection && <button
                style={{ marginBottom: "3px" }}
                className="btn btn-success mt-2"
                disabled={selectedIds.length === 0}
                onClick={handleSendSelected}
              >
                Select {selectedIds.length} Product{selectedIds.length !== 1 ? "s" : ""}
              </button>}
              <table className="table table-striped table-sm table-bordered">
                <tbody>
                  <tr className="text-center" style={{ borderBottom: "solid 2px" }}>
                    <th></th>
                    <th >SI No.</th>
                    {enableProductSelection && <th>
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={handleSelectAll}
                      /> <br />Select All
                    </th>}

                    <th style={{ width: "20%" }}>Part No.</th>
                    <th style={{ width: "50%" }}>Name</th>
                    <th >Info</th>
                    <th style={{ width: "10%" }}>Qty</th>
                  </tr>
                  {selectedProducts.map((product, index) => (
                    <tr key={index} className="text-center">
                      <td style={{ verticalAlign: 'middle', padding: '0.25rem' }} >
                        <div
                          style={{ color: "red", cursor: "pointer" }}
                          onClick={() => {
                            removeProduct(product);
                          }}
                        >
                          <i className="bi bi-trash"> </i>
                        </div>
                      </td>
                      <td style={{ verticalAlign: 'middle', padding: '0.25rem' }}>{index + 1}</td>
                      {enableProductSelection && <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(product.product_id)}
                          onChange={() => handleSelect(product.product_id)}
                        />
                      </td>}
                      {/*<td style={{ verticalAlign: 'middle', padding: '0.25rem', width: "auto", whiteSpace: "nowrap" }}>
                        <OverflowTooltip maxWidth={120} value={product.prefix_part_number ? product.prefix_part_number + " - " + product.part_number : product.part_number} />
                      </td>*/}
                      <ResizableTableCell style={{ verticalAlign: 'middle', padding: '0.25rem' }}
                      >
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
                      </ResizableTableCell>
                      <ResizableTableCell style={{ verticalAlign: 'middle', padding: '0.25rem' }}
                      >
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
                      </ResizableTableCell>
                      <td style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                        <div style={{ zIndex: "9999 !important", position: "absolute !important" }}>
                          <Dropdown drop="top">
                            <Dropdown.Toggle variant="secondary" id="dropdown-secondary" style={{}}>
                              <i className="bi bi-info"></i>
                            </Dropdown.Toggle>

                            <Dropdown.Menu style={{ zIndex: 9999, position: "absolute" }} popperConfig={{ modifiers: [{ name: 'preventOverflow', options: { boundary: 'viewport' } }] }}>
                              <Dropdown.Item onClick={() => {
                                openLinkedProducts(product);
                              }}>
                                <i className="bi bi-link"></i>
                                &nbsp;
                                Linked Products (F10)
                              </Dropdown.Item>
                              <Dropdown.Item onClick={() => {
                                openProductHistory(product);
                              }}>
                                <i className="bi bi-clock-history"></i>
                                &nbsp;
                                History (CTR + SHIFT + B)
                              </Dropdown.Item>

                              <Dropdown.Item onClick={() => {
                                openSalesHistory(product);
                              }}>
                                <i className="bi bi-clock-history"></i>
                                &nbsp;
                                Sales History (F4)
                              </Dropdown.Item>
                              <Dropdown.Item onClick={() => {
                                openSalesReturnHistory(product);
                              }}>
                                <i className="bi bi-clock-history"></i>
                                &nbsp;
                                Sales Return History (F9)
                              </Dropdown.Item>
                              <Dropdown.Item onClick={() => {
                                openPurchaseHistory(product);
                              }}>
                                <i className="bi bi-clock-history"></i>
                                &nbsp;
                                Purchase History (F6)
                              </Dropdown.Item>
                              <Dropdown.Item onClick={() => {
                                openPurchaseReturnHistory(product);
                              }}>
                                <i className="bi bi-clock-history"></i>
                                &nbsp;
                                Purchase Return History (F8)
                              </Dropdown.Item>
                              <Dropdown.Item onClick={() => {
                                openDeliveryNoteHistory(product);
                              }}>
                                <i className="bi bi-clock-history"></i>
                                &nbsp;
                                Delivery Note History (F3)
                              </Dropdown.Item>
                              <Dropdown.Item onClick={() => {
                                openQuotationHistory(product);
                              }}>
                                <i className="bi bi-clock-history"></i>
                                &nbsp;
                                Quotation History  (F2)
                              </Dropdown.Item>
                              <Dropdown.Item onClick={() => {
                                openProductImages(product.product_id);
                              }}>
                                <i className="bi bi-clock-history"></i>
                                &nbsp;
                                Images  (CTR + SHIFT + F)
                              </Dropdown.Item>

                            </Dropdown.Menu>
                          </Dropdown>
                        </div>
                      </td>
                      <td style={{
                        verticalAlign: 'middle',
                        padding: '0.25rem',
                        whiteSpace: 'nowrap',
                        width: 'auto',
                        position: 'relative',
                      }} >
                        <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                          <div className="input-group flex-nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                            <input type="number"
                              style={{ minWidth: "40px", maxWidth: "120px" }}
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

                                if (e.key === "Enter") {
                                  moveToProductSearch();
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
                                  checkErrors(index);
                                  checkWarnings(index);
                                  reCalculate(index);
                                }, 100);

                              }} />
                            <span className="input-group-text" id="basic-addon2"> {selectedProducts[index].unit ? selectedProducts[index].unit[0] : "P"}</span>
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
                      </td>
                    </tr>
                  )).reverse()}
                </tbody>
              </table>
            </div>
            <Modal.Footer>
              <Button variant="secondary" onClick={handleClose}>
                Close
              </Button>
              <Button variant="primary" disabled={enableProductSelection} onClick={handleCreate} >
                {isProcessing ?
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden={true}
                  /> + " Processing..."

                  : formData.id ? "Update" : "Create"
                }
              </Button>
            </Modal.Footer>
          </form>
        </Modal.Body>

      </Modal>


    </>
  );
});

export default DeliveryNoteCreate;
