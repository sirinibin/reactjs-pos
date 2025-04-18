import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import DeliveryNotePreview from "./preview.js";
import { Modal, Button } from "react-bootstrap";
import StoreCreate from "../store/create.js";
import CustomerCreate from "../customer/create.js";
import ProductCreate from "../product/create.js";
import UserCreate from "../user/create.js";
import SignatureCreate from "../signature/create.js";
import Cookies from "universal-cookie";
import { Typeahead } from "react-bootstrap-typeahead";
import { format } from "date-fns";
import { Spinner } from "react-bootstrap";
import ProductView from "../product/view.js";
import { DebounceInput } from 'react-debounce-input';
import DatePicker from "react-datepicker";

import { Dropdown } from 'react-bootstrap';

import SalesHistory from "./../product/sales_history.js";
import SalesReturnHistory from "./../product/sales_return_history.js";
import PurchaseHistory from "./../product/purchase_history.js";
import PurchaseReturnHistory from "./../product/purchase_return_history.js";
import QuotationHistory from "./../product/quotation_history.js";
import DeliveryNoteHistory from "./../product/delivery_note_history.js";
import Products from "./../utils/products.js";
import Customers from "./../utils/customers.js";

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
        price_type: "retail",
      };

      formData.date_str = new Date();

      selectedProducts = [];
      setSelectedProducts([]);

      selectedStores = [];
      setSelectedStores([]);

      selectedCustomers = [];
      setSelectedCustomers([]);

      selectedDeliveredByUsers = [];
      setSelectedDeliveredByUsers([]);

      reCalculate();

      if (cookies.get("user_id")) {
        selectedDeliveredByUsers = [{
          id: cookies.get("user_id"),
          name: cookies.get("user_name"),
        }];
        formData.delivered_by = cookies.get("user_id");
        setFormData({ ...formData });
        setSelectedDeliveredByUsers([...selectedDeliveredByUsers]);
      }
      if (cookies.get('store_id')) {
        formData.store_id = cookies.get('store_id');
        formData.store_name = cookies.get('store_name');
      }

      setFormData({ ...formData });
      if (id) {
        getDeliveryNote(id);
      }
      SetShow(true);
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
            if (event.target.getAttribute("class").includes("barcode")) {
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



  //const history = useHistory();
  let [errors, setErrors] = useState({});
  const [isProcessing, setProcessing] = useState(false);
  const cookies = new Cookies();

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


  //Store Auto Suggestion
  const [storeOptions, setStoreOptions] = useState([]);
  let [selectedStores, setSelectedStores] = useState([]);
  const [isStoresLoading, setIsStoresLoading] = useState(false);

  //Customer Auto Suggestion
  const [customerOptions, setCustomerOptions] = useState([]);
  let [selectedCustomers, setSelectedCustomers] = useState([]);
  const [isCustomersLoading, setIsCustomersLoading] = useState(false);

  //Product Auto Suggestion
  let [productOptions, setProductOptions] = useState([]);
  let selectedProduct = [];
  let [selectedProducts, setSelectedProducts] = useState([]);
  const [isProductsLoading, setIsProductsLoading] = useState(false);

  //Delivered By Auto Suggestion
  let [selectedDeliveredByUsers, setSelectedDeliveredByUsers] = useState([]);


  const [show, SetShow] = useState(false);

  function handleClose() {
    SetShow(false);
  }


  useEffect(() => {
    let at = cookies.get("access_token");
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
        'Authorization': cookies.get('access_token'),
      },
    };

    let searchParams = {};
    if (cookies.get("store_id")) {
      searchParams.store_id = cookies.get("store_id");
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
        };

        formData.date_str = data.result.date;

        if (formData.is_discount_percent) {
          formData.discountValue = formData.discount_percent;
        } else {
          formData.discountValue = formData.discount;
        }

        selectedProducts = deliverynote.products;
        setSelectedProducts([...selectedProducts]);


        let selectedStores = [
          {
            id: deliverynote.store_id,
            name: deliverynote.store_name,
          }
        ];

        let selectedCustomers = [
          {
            id: deliverynote.customer_id,
            name: deliverynote.customer.name,
            search_label: deliverynote.customer.search_label,
          }
        ];

        let selectedDeliveredByUsers = [
          {
            id: deliverynote.delivered_by,
            name: deliverynote.delivered_by_name
          }
        ];


        setSelectedDeliveredByUsers([...selectedDeliveredByUsers]);

        setSelectedStores([...selectedStores]);
        setSelectedCustomers([...selectedCustomers]);


        setFormData({ ...formData });

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

  async function suggestStores(searchTerm) {
    console.log("Inside handle suggestStores");
    setStoreOptions([]);

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
        Authorization: cookies.get("access_token"),
      },
    };

    let Select = "select=id,name";
    setIsStoresLoading(true);
    let result = await fetch(
      "/v1/store?" + Select + queryString,
      requestOptions
    );
    let data = await result.json();

    setStoreOptions(data.result);
    setIsStoresLoading(false);
  }

  async function suggestCustomers(searchTerm) {
    console.log("Inside handle suggestCustomers");
    setCustomerOptions([]);

    console.log("searchTerm:" + searchTerm);
    if (!searchTerm) {
      return;
    }

    var params = {
      query: searchTerm,
    };

    if (cookies.get("store_id")) {
      params.store_id = cookies.get("store_id");
    }

    var queryString = ObjectToSearchQueryParams(params);
    if (queryString !== "") {
      queryString = "&" + queryString;
    }

    const requestOptions = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: cookies.get("access_token"),
      },
    };

    let Select = "select=id,code,vat_no,name,phone,name_in_arabic,phone_in_arabic,search_label";
    setIsCustomersLoading(true);
    let result = await fetch(
      "/v1/customer?" + Select + queryString,
      requestOptions
    );
    let data = await result.json();

    setCustomerOptions(data.result);
    setIsCustomersLoading(false);
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



  let [openProductSearchResult, setOpenProductSearchResult] = useState(false);

  async function suggestProducts(searchTerm) {
    console.log("Inside handle suggestProducts");
    setProductOptions([]);

    console.log("searchTerm:" + searchTerm);
    if (!searchTerm) {
      setTimeout(() => {
        openProductSearchResult = false;
        setOpenProductSearchResult(false);
      }, 300);


      setIsProductsLoading(false);
      return;
    }

    var params = {
      search_text: searchTerm,
    };

    if (cookies.get("store_id")) {
      params.store_id = cookies.get("store_id");
    }

    var queryString = ObjectToSearchQueryParams(params);
    if (queryString !== "") {
      queryString = "&" + queryString;
    }

    const requestOptions = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: cookies.get("access_token"),
      },
    };

    let Select = `select=id,item_code,prefix_part_number,country_name,brand_name,part_number,name,unit,name_in_arabic,product_stores.${cookies.get('store_id')}.purchase_unit_price,product_stores.${cookies.get('store_id')}.retail_unit_price,product_stores.${cookies.get('store_id')}.stock`;
    setIsProductsLoading(true);
    let result = await fetch(
      "/v1/product?" + Select + queryString + "&limit=200",
      requestOptions
    );
    let data = await result.json();

    let products = data.result;
    if (!products || products.length === 0) {
      openProductSearchResult = false;
      setOpenProductSearchResult(false);
      setIsProductsLoading(false);
      return;
    }

    openProductSearchResult = true;
    setOpenProductSearchResult(true);
    setProductOptions(products);
    setIsProductsLoading(false);
  }

  async function getProductByBarCode(barcode) {
    formData.barcode = barcode;
    setFormData({ ...formData });
    console.log("Inside getProductByBarCode");
    errors["bar_code"] = "";
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
        Authorization: cookies.get("access_token"),
      },
    };


    let Select = "select=id,item_code,bar_code,ean_12,part_number,name,product_stores,unit,part_number,name_in_arabic";

    let searchParams = {};
    if (cookies.get("store_id")) {
      searchParams.store_id = cookies.get("store_id");
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
        part_number: selectedProducts[i].part_number,
      });
    }

    formData.discount = parseFloat(formData.discount);
    formData.discount_percent = parseFloat(formData.discount_percent);
    formData.vat_percent = parseFloat(formData.vat_percent);

    if (cookies.get('store_id')) {
      formData.store_id = cookies.get('store_id');
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
        Authorization: cookies.get("access_token"),
      },
      body: JSON.stringify(formData),
    };

    console.log("formData:", formData);

    let searchParams = {};
    if (cookies.get("store_id")) {
      searchParams.store_id = cookies.get("store_id");
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
          props.showToastMessage("Delivery note updated successfully!", "success");
        } else {
          props.showToastMessage("Delivery note created successfully!", "success");
        }
        if (props.refreshList) {
          props.refreshList();
        }
        handleClose();
        props.openDetailsView(data.result.id);
      })
      .catch((error) => {
        setProcessing(false);
        console.log("Inside catch");
        console.log(error);
        setErrors({ ...error });
        console.error("There was an error!", error);
        props.showToastMessage("Failed to process delivery note!", "danger");
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


    errors.product_id = "";
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

    if (isProductAdded(product.id)) {
      alreadyAdded = true;
      index = getProductIndex(product.id);
      quantity = parseFloat(selectedProducts[index].quantity + product.quantity);
    } else {
      quantity = parseFloat(product.quantity);
    }

    console.log("quantity:", quantity);

    errors.quantity = "";

    if (alreadyAdded) {
      selectedProducts[index].quantity = parseFloat(quantity);
    }

    if (!alreadyAdded) {
      let item = {
        product_id: product.id,
        code: product.item_code,
        part_number: product.part_number,
        name: product.name,
        quantity: product.quantity,
        stores: product.stores,
        unit: product.unit,
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
    const index = selectedProducts.indexOf(product);
    if (index > -1) {
      selectedProducts.splice(index, 1);
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

  const StoreCreateFormRef = useRef();
  function openStoreCreateForm() {
    StoreCreateFormRef.current.open();
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
    PreviewRef.current.open(model);
  }

  const ProductsRef = useRef();
  function openLinkedProducts(model) {
    ProductsRef.current.open(model, "linked_products");
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

    // props.showToastMessage("Successfully Added " + selected.length + " products", "success");
  };


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
      setSelectedIds(selectedProducts.map((p) => p.id));
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
    const newlySelectedProducts = selectedProducts.filter((p) => selectedIds.includes(p.id));
    if (props.onSelectProducts) {
      props.onSelectProducts(newlySelectedProducts); // Send to parent
    }

    handleClose();
  };

  return (
    <>
      <Customers ref={CustomersRef} onSelectCustomer={handleSelectedCustomer} showToastMessage={props.showToastMessage} />
      <Products ref={ProductsRef} onSelectProducts={handleSelectedProducts} showToastMessage={props.showToastMessage} />
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

      <DeliveryNotePreview ref={PreviewRef} />

      <StoreCreate ref={StoreCreateFormRef} showToastMessage={props.showToastMessage} />
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
          {Object.keys(errors).length > 0 ?
            <div>
              <ul>

                {errors && Object.keys(errors).map((key, index) => {
                  return (errors[key] ? <li style={{ color: "red" }}>{errors[key]}</li> : "");
                })}
              </ul></div> : ""}
          <form className="row g-3 needs-validation" onSubmit={handleCreate}>
            {!cookies.get('store_name') ? <div className="col-md-6">
              <label className="form-label">Store*</label>

              <div className="input-group mb-3">
                <Typeahead
                  id="store_id"
                  labelKey="name"
                  isLoading={isStoresLoading}
                  isInvalid={errors.store_id ? true : false}
                  onChange={(selectedItems) => {
                    errors.store_id = "";
                    setErrors(errors);
                    if (selectedItems.length === 0) {
                      errors.store_id = "Invalid Store selected";
                      setErrors(errors);
                      formData.store_id = "";
                      setFormData({ ...formData });
                      setSelectedStores([]);
                      return;
                    }
                    formData.store_id = selectedItems[0].id;
                    setFormData({ ...formData });
                    setSelectedStores(selectedItems);
                    //SetPriceOfAllProducts(selectedItems[0].id);
                  }}
                  options={storeOptions}
                  placeholder="Select Store"
                  selected={selectedStores}
                  highlightOnlyResult={true}
                  onInputChange={(searchTerm, e) => {
                    suggestStores(searchTerm);
                  }}
                />

                <Button hide={true.toString()} onClick={openStoreCreateForm} className="btn btn-outline-secondary btn-primary btn-sm" type="button" id="button-addon1"> <i className="bi bi-plus-lg"></i> New</Button>
                <div style={{ color: "red" }}>
                  <i className="bi x-lg"> </i>
                  {errors.store_id}
                </div>
                {formData.store_id && !errors.store_id && (
                  <div style={{ color: "green" }}>
                    <i className="bi bi-check-lg"> </i>
                    Looks good!
                  </div>
                )}
              </div>
            </div> : ""}
            <div className="col-md-6">
              <label className="form-label">Customer*</label>
              <Typeahead
                id="customer_id"
                labelKey="search_label"
                isLoading={isCustomersLoading}
                isInvalid={errors.customer_id ? true : false}
                onChange={(selectedItems) => {
                  errors.customer_id = "";
                  setErrors(errors);
                  if (selectedItems.length === 0) {
                    errors.customer_id = "Invalid Customer selected";
                    setErrors(errors);
                    formData.customer_id = "";
                    setFormData({ ...formData });
                    setSelectedCustomers([]);
                    return;
                  }
                  formData.customer_id = selectedItems[0].id;
                  setFormData({ ...formData });
                  setSelectedCustomers(selectedItems);
                }}
                options={customerOptions}
                placeholder="Customer Name / Mob / VAT # / ID"
                selected={selectedCustomers}
                highlightOnlyResult={true}
                onInputChange={(searchTerm, e) => {
                  suggestCustomers(searchTerm);
                }}
              />
              <Button hide={true.toString()} onClick={openCustomerCreateForm} className="btn btn-outline-secondary btn-primary btn-sm" type="button" id="button-addon1"> <i className="bi bi-plus-lg"></i> New</Button>
              {errors.customer_id && (
                <div style={{ color: "red" }}>
                  <i className="bi bi-x-lg"> </i>
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

            <div className="col-md-12">
              <label className="form-label">Product*</label>
              <Typeahead
                id="product_id"
                size="lg"
                labelKey="search_label"
                emptyLabel=""
                clearButton={true}
                open={openProductSearchResult}
                isLoading={isProductsLoading}
                isInvalid={errors.product_id ? true : false}
                onChange={(selectedItems) => {
                  if (selectedItems.length === 0) {
                    errors["product_id"] = "Invalid Product selected";
                    setErrors(errors);
                    return;
                  }
                  errors["product_id"] = "";
                  setErrors({ ...errors });

                  if (formData.store_id) {
                    addProduct(selectedItems[0]);

                  }
                  setOpenProductSearchResult(false);
                }}
                options={productOptions}
                selected={selectedProduct}
                placeholder="Part No. | Name | Name in Arabic | Brand | Country"
                highlightOnlyResult={true}
                onInputChange={(searchTerm, e) => {
                  suggestProducts(searchTerm);
                }}
              />
              <Button hide={true.toString()} onClick={openProductCreateForm} className="btn btn-outline-secondary btn-primary btn-sm" type="button" id="button-addon1"> <i className="bi bi-plus-lg"></i> New</Button>
              {errors.product_id ? (
                <div style={{ color: "red" }}>
                  <i className="bi bi-x-lg"> </i>
                  {errors.product_id}
                </div>
              ) : null}
              {selectedProduct[0] &&
                selectedProduct[0].id &&
                !errors.product_id && (
                  <div style={{ color: "green" }}>
                    <i className="bi bi-check-lg"> </i>
                    Looks good!
                  </div>
                )}
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
                <thead>
                  <tr className="text-center">
                    <th style={{ width: "3%" }}></th>
                    {enableProductSelection && <th>
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={handleSelectAll}
                      /> Select All
                    </th>}
                    <th style={{ width: "5%" }}>SI No.</th>
                    <th style={{ width: "10%" }}>Part No.</th>
                    <th style={{ width: "30%" }} className="text-start">Name</th>
                    <th style={{ width: "4%%" }}>Info</th>
                    <th style={{ width: "11%" }}>Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedProducts.map((product, index) => (
                    <tr key={index} className="text-center">
                      <td>
                        <div
                          style={{ color: "red", cursor: "pointer" }}
                          onClick={() => {
                            removeProduct(product);
                          }}
                        >
                          <i className="bi bi-x-lg"> </i>
                        </div>
                      </td>
                      {enableProductSelection && <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(product.id)}
                          onChange={() => handleSelect(product.id)}
                        />
                      </td>}
                      <td>{index + 1}</td>
                      <td>{product.part_number}</td>
                      <td style={{
                        textDecoration: "underline",
                        color: "blue",
                        cursor: "pointer",
                      }}
                        className="text-start"
                        onClick={() => {
                          openProductDetailsView(product.product_id);
                          console.log("okk,id:", product.product_id);
                        }}>{product.name}
                      </td>
                      <td>
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
                                Linked Products
                              </Dropdown.Item>

                              <Dropdown.Item onClick={() => {
                                openSalesHistory(product);
                              }}>
                                <i className="bi bi-clock-history"></i>
                                &nbsp;
                                Sales History
                              </Dropdown.Item>
                              <Dropdown.Item onClick={() => {
                                openSalesReturnHistory(product);
                              }}>
                                <i className="bi bi-clock-history"></i>
                                &nbsp;
                                Sales Return History
                              </Dropdown.Item>
                              <Dropdown.Item onClick={() => {
                                openPurchaseHistory(product);
                              }}>
                                <i className="bi bi-clock-history"></i>
                                &nbsp;
                                Purchase History
                              </Dropdown.Item>
                              <Dropdown.Item onClick={() => {
                                openPurchaseReturnHistory(product);
                              }}>
                                <i className="bi bi-clock-history"></i>
                                &nbsp;
                                Purchase Return History
                              </Dropdown.Item>
                              <Dropdown.Item onClick={() => {
                                openDeliveryNoteHistory(product);
                              }}>
                                <i className="bi bi-clock-history"></i>
                                &nbsp;
                                Delivery Note History
                              </Dropdown.Item>
                              <Dropdown.Item onClick={() => {
                                openQuotationHistory(product);
                              }}>
                                <i className="bi bi-clock-history"></i>
                                &nbsp;
                                Quotation History
                              </Dropdown.Item>

                            </Dropdown.Menu>
                          </Dropdown>
                        </div>
                      </td>
                      <td style={{ width: "155px" }}>

                        <div className="input-group mb-3">
                          <input type="number" value={product.quantity} className="form-control"

                            placeholder="Quantity" onChange={(e) => {
                              errors["quantity_" + index] = "";
                              setErrors({ ...errors });
                              if (!e.target.value) {
                                errors["quantity_" + index] = "Invalid Quantity";
                                selectedProducts[index].quantity = e.target.value;
                                setSelectedProducts([...selectedProducts]);
                                setErrors({ ...errors });
                                console.log("errors:", errors);
                                return;
                              }

                              if (parseFloat(e.target.value) === 0) {
                                errors["quantity_" + index] = "Quantity should be > 0";
                                selectedProducts[index].quantity = e.target.value;
                                setSelectedProducts([...selectedProducts]);
                                setErrors({ ...errors });
                                console.log("errors:", errors);
                                return;
                              }

                              product.quantity = parseFloat(e.target.value);
                              reCalculate();

                              selectedProducts[index].quantity = parseFloat(e.target.value);
                              console.log("selectedProducts[index].quantity:", selectedProducts[index].quantity);
                              setSelectedProducts([...selectedProducts]);
                              reCalculate();

                            }} />
                          <span className="input-group-text" id="basic-addon2"> {selectedProducts[index].unit ? selectedProducts[index].unit : "Units"}</span>
                        </div>
                        {errors["quantity_" + index] && (
                          <div style={{ color: "red" }}>
                            <i className="bi bi-x-lg"> </i>
                            {errors["quantity_" + index]}
                          </div>
                        )}

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
