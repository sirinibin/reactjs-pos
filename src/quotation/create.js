import React, {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import QuotationPreview from "./preview.js";
import { Modal, Button, } from "react-bootstrap";
import StoreCreate from "../store/create.js";
import CustomerCreate from "./../customer/create.js";
import ProductCreate from "./../product/create.js";
import UserCreate from "./../user/create.js";
import SignatureCreate from "./../signature/create.js";
import Cookies from "universal-cookie";
import { Typeahead } from "react-bootstrap-typeahead";
import NumberFormat from "react-number-format";
import DatePicker from "react-datepicker";
import { format } from "date-fns";
import { Spinner } from "react-bootstrap";
import ProductView from "./../product/view.js";
import { DebounceInput } from "react-debounce-input";
import ResizableTableCell from './../utils/ResizableTableCell';

import { Dropdown } from 'react-bootstrap';

import SalesHistory from "./../product/sales_history.js";
import SalesReturnHistory from "./../product/sales_return_history.js";
import PurchaseHistory from "./../product/purchase_history.js";
import PurchaseReturnHistory from "./../product/purchase_return_history.js";
import QuotationHistory from "./../product/quotation_history.js";
import DeliveryNoteHistory from "./../product/delivery_note_history.js";
import Products from "./../utils/products.js";
import Customers from "./../utils/customers.js";

const QuotationCreate = forwardRef((props, ref) => {
  //const [operationType, setoperationType] = useState("")
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
        shipping_handling_fees: 0.0,
        is_discount_percent: false,
        date_str: new Date(),
        signature_date_str: format(new Date(), "MMM dd yyyy"),
        status: "delivered",
        price_type: "retail",
        delivery_days: 7,
        validity_days: 2,
      };

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
        selectedDeliveredByUsers = [
          {
            id: cookies.get("user_id"),
            name: cookies.get("user_name"),
          },
        ];
        formData.delivered_by = cookies.get("user_id");
        setFormData({ ...formData });
        setSelectedDeliveredByUsers([...selectedDeliveredByUsers]);
      }
      if (cookies.get("store_id")) {
        formData.store_id = cookies.get("store_id");
        formData.store_name = cookies.get("store_name");
      }

      setFormData({ ...formData });
      if (id) {
        getQuotation(id);
      }
      SetShow(true);
    },
  }));

  useEffect(() => {
    const listener = (event) => {
      if (event.code === "Enter" || event.code === "NumpadEnter") {
        console.log("Enter key was pressed. Run your function-order.123");
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
    //date_str: format(new Date(), "MMM dd yyyy"),
    date_str: new Date(),
    signature_date_str: format(new Date(), "MMM dd yyyy"),
    status: "created",
    price_type: "retail",
    is_discount_percent: false,
    validity_days: 2,
    delivery_days: 7,
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
      // history.push("/dashboard/quotations");
      window.location = "/";
    }
  });

  function getQuotation(id) {
    console.log("inside get Quotation");
    const requestOptions = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: cookies.get("access_token"),
      },
    };


    let searchParams = {};
    if (cookies.get("store_id")) {
      searchParams.store_id = cookies.get("store_id");
    }
    let queryParams = ObjectToSearchQueryParams(searchParams);

    fetch("/v1/quotation/" + id + "?" + queryParams, requestOptions)
      .then(async (response) => {
        const isJson = response.headers
          .get("content-type")
          ?.includes("application/json");
        const data = isJson && (await response.json());

        // check for error response
        if (!response.ok) {
          const error = data && data.errors;
          return Promise.reject(error);
        }

        setErrors({});

        console.log("Response:");
        console.log(data);

        let quotation = data.result;
        formData = {
          id: quotation.id,
          code: quotation.code,
          store_id: quotation.store_id,
          customer_id: quotation.customer_id,
          // date_str: quotation.date_str,
          date: quotation.date,
          vat_percent: quotation.vat_percent,
          discount: quotation.discount,
          discount_percent: quotation.discount_percent,
          status: quotation.status,
          delivered_by: quotation.delivered_by,
          delivered_by_signature_id: quotation.delivered_by_signature_id,
          is_discount_percent: quotation.is_discount_percent,
          shipping_handling_fees: quotation.shipping_handling_fees,
          delivery_days: quotation.delivery_days ? quotation.delivery_days : 7,
          validity_days: quotation.validity_days ? quotation.validity_days : 2,
        };
        formData.date_str = data.result.date;

        if (formData.is_discount_percent) {
          formData.discountValue = formData.discount_percent;
        } else {
          formData.discountValue = formData.discount;
        }

        selectedProducts = quotation.products;
        setSelectedProducts([...selectedProducts]);

        let selectedStores = [
          {
            id: quotation.store_id,
            name: quotation.store_name,
          },
        ];

        let selectedCustomers = [
          {
            id: quotation.customer_id,
            name: quotation.customer.name,
            search_label: quotation.customer.search_label,
          },
        ];

        let selectedDeliveredByUsers = [
          {
            id: quotation.delivered_by,
            name: quotation.delivered_by_name,
          },
        ];


        setSelectedDeliveredByUsers([...selectedDeliveredByUsers]);

        setSelectedStores([...selectedStores]);
        setSelectedCustomers([...selectedCustomers]);

        setFormData({ ...formData });

        reCalculate();
      })
      .catch((error) => {
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

    let Select =
      "select=id,code,vat_no,name,phone,name_in_arabic,phone_in_arabic,search_label";
    setIsCustomersLoading(true);
    let result = await fetch(
      "/v1/customer?" + Select + queryString,
      requestOptions
    );
    let data = await result.json();

    setCustomerOptions(data.result);
    setIsCustomersLoading(false);
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
      "/v1/product?" + Select + queryString + "&limit=50",
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

    let Select =
      "select=id,item_code,bar_code,ean_12,part_number,name,product_stores,unit,part_number,name_in_arabic";

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
      errors["bar_code"] = "Invalid Barcode:" + formData.barcode;
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
        purchase_unit_price: selectedProducts[i].purchase_unit_price ? parseFloat(
          selectedProducts[i].purchase_unit_price
        ) : 0.00,
        unit: selectedProducts[i].unit,
        part_number: selectedProducts[i].part_number,
        unit_discount: selectedProducts[i].unit_discount ? parseFloat(selectedProducts[i].unit_discount) : 0,
        unit_discount_percent: selectedProducts[i].unit_discount_percent ? parseFloat(selectedProducts[i].unit_discount_percent) : 0,
      });
    }

    formData.discount = parseFloat(formData.discount);
    formData.discount_percent = parseFloat(formData.discount_percent);
    formData.vat_percent = parseFloat(formData.vat_percent);


    if (cookies.get("store_id")) {
      formData.store_id = cookies.get("store_id");
    }

    console.log("formData.discount:", formData.discount);

    let endPoint = "/v1/quotation";
    let method = "POST";
    if (formData.id) {
      endPoint = "/v1/quotation/" + formData.id;
      method = "PUT";
    }

    const requestOptions = {
      method: method,
      headers: {
        Accept: "application/json",
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
          props.showToastMessage("Quotation updated successfully!", "success");
        } else {
          props.showToastMessage("Quotation created successfully!", "success");
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
        props.showToastMessage("Failed to process quotation!", "danger");
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
      return;
    }

    errors.product_id = "";
    if (!product) {
      errors.product_id = "Invalid Product";
      setErrors({ ...errors });
      return;
    }

    product.unit_price = 0.00;
    product.purchase_unit_price = 0.00;

    product.unit_price = product.product_stores[formData.store_id]?.retail_unit_price;
    product.purchase_unit_price = product.product_stores[formData.store_id]?.purchase_unit_price;

    if (product.product_stores[formData.store_id]) {
      product.unit_price = product.product_stores[formData.store_id].retail_unit_price;
      product.purchase_unit_price = product.product_stores[formData.store_id].purchase_unit_price;
      product.unit_discount = 0.00;
      product.unit_discount_percent = 0.00;
    }

    // product.unit_price = unitPrice.retail_unit_price;
    // product.purchase_unit_price = unitPrice.purchase_unit_price;

    let alreadyAdded = false;
    let index = -1;
    let quantity = 0.0;
    product.quantity = 1.0;

    if (isProductAdded(product.id)) {
      alreadyAdded = true;
      index = getProductIndex(product.id);
      quantity = parseFloat(
        selectedProducts[index].quantity + product.quantity
      );
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
        product_stores: product.product_stores,
        unit: product.unit,
        unit_discount: product.unit_discount,
        unit_discount_percent: product.unit_discount_percent,
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


  let [deliveryDays, setDeliveryDays] = useState(7);
  let [validityDays, setValidityDays] = useState(2);

  function findProductUnitDiscountPercent(productIndex) {
    let unitPrice = parseFloat(selectedProducts[productIndex].unit_price);
    if (selectedProducts[productIndex].unit_discount
      && parseFloat(selectedProducts[productIndex].unit_discount) >= 0
      && unitPrice > 0) {

      let unitDiscountPercent = parseFloat(parseFloat(selectedProducts[productIndex].unit_discount / unitPrice) * 100);
      selectedProducts[productIndex].unit_discount_percent = unitDiscountPercent;
      setSelectedProducts([...selectedProducts]);
    }
  }

  function findProductUnitDiscount(productIndex) {
    let unitPrice = parseFloat(selectedProducts[productIndex].unit_price);

    if (selectedProducts[productIndex].unit_discount_percent
      && selectedProducts[productIndex].unit_discount_percent >= 0
      && unitPrice > 0) {
      selectedProducts[productIndex].unit_discount = parseFloat(unitPrice * parseFloat(selectedProducts[productIndex].unit_discount_percent / 100));
      setSelectedProducts([...selectedProducts]);
    }
  }


  async function reCalculate(productIndex) {
    if (selectedProducts[productIndex]) {
      if (selectedProducts[productIndex].is_discount_percent) {
        findProductUnitDiscount(productIndex);
      } else {
        findProductUnitDiscountPercent(productIndex);
      }
    }


    formData.products = [];
    for (var i = 0; i < selectedProducts.length; i++) {
      formData.products.push({
        product_id: selectedProducts[i].product_id,
        name: selectedProducts[i].name,
        name_in_arabic: selectedProducts[i].name_in_arabic,
        quantity: parseFloat(selectedProducts[i].quantity),
        unit_price: parseFloat(selectedProducts[i].unit_price),
        purchase_unit_price: selectedProducts[i].purchase_unit_price ? parseFloat(
          selectedProducts[i].purchase_unit_price
        ) : 0.00,
        unit: selectedProducts[i].unit,
        part_number: selectedProducts[i].part_number,
        unit_discount: selectedProducts[i].unit_discount ? parseFloat(selectedProducts[i].unit_discount) : 0,
        unit_discount_percent: selectedProducts[i].unit_discount_percent ? parseFloat(selectedProducts[i].unit_discount_percent) : 0,
      });
    }


    const requestOptions = {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: cookies.get("access_token"),
      },
      body: JSON.stringify(formData),
    };

    let result = await fetch(
      "/v1/quotation/calculate-net-total",
      requestOptions
    );
    console.log("Done")
    let res = await result.json();

    if (res.result) {
      formData.total = res.result.total;
      formData.net_total = res.result.net_total;
      formData.vat_price = res.result.vat_price;
      formData.discount_percent = res.result.discount_percent;
      formData.discount = res.result.discount;
    }

    setFormData({ ...formData });
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
    let model = formData;
    model.products = selectedProducts;
    model.date = formData.date_str;
    model.code = formData.code;
    if (!formData.code) {
      formData.code = Math.floor(10000 + Math.random() * 90000).toString();;
    }
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

      <QuotationPreview ref={PreviewRef} />
      <ProductView
        ref={ProductDetailsViewRef}
        openUpdateForm={openProductUpdateForm}
        openCreateForm={openProductCreateForm}
      />
      <ProductCreate
        ref={ProductCreateFormRef}
        showToastMessage={props.showToastMessage}
        openDetailsView={openProductDetailsView}
      />

      <StoreCreate
        ref={StoreCreateFormRef}
        showToastMessage={props.showToastMessage}
      />
      <CustomerCreate
        ref={CustomerCreateFormRef}
        showToastMessage={props.showToastMessage}
      />
      <UserCreate
        ref={UserCreateFormRef}
        showToastMessage={props.showToastMessage}
      />
      <SignatureCreate
        ref={SignatureCreateFormRef}
        showToastMessage={props.showToastMessage}
      />
      <Modal
        show={show}
        size="xl"
        fullscreen={!enableProductSelection}
        onHide={handleClose}
        animation={false}
        backdrop="static"
        scrollable={true}
      >
        <Modal.Header>
          <Modal.Title>
            {!enableProductSelection && formData.id
              ? "Update Quotation #" + formData.code
              : !enableProductSelection ? "Create New Quotation" : ""}
            {enableProductSelection ? "Select products from quotation #" + formData.code : ""}
          </Modal.Title>

          <div className="col align-self-end text-end">
            <Button variant="primary" onClick={openPreview}>
              <i className="bi bi-printer"></i> Print Full Quotation
            </Button>
            &nbsp;&nbsp;
            &nbsp;&nbsp;
            <Button variant="primary" disabled={enableProductSelection} onClick={handleCreate}>
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
            {!cookies.get("store_name") ? (
              <div className="col-md-6">
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

                  <Button
                    hide={true.toString()}
                    onClick={openStoreCreateForm}
                    className="btn btn-outline-secondary btn-primary btn-sm"
                    type="button"
                    id="button-addon1"
                  >
                    {" "}
                    <i className="bi bi-plus-lg"></i> New
                  </Button>
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
              </div>
            ) : (
              ""
            )}
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
                  formData.customerName = searchTerm;
                  suggestCustomers(searchTerm);
                }}
              />
              <Button
                hide={true.toString()}
                onClick={openCustomerCreateForm}
                className="btn btn-outline-secondary btn-primary btn-sm"
                type="button"
                id="button-addon1"
              >
                {" "}
                <i className="bi bi-plus-lg"></i> New
              </Button>
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

            <div className="col-md-2">
              <label className="form-label">Product Barcode Scan</label>

              <div className="input-group mb-3">
                <DebounceInput
                  minLength={3}
                  debounceTimeout={500}
                  placeholder="Scan Barcode"
                  className="form-control barcode"
                  value={formData.barcode}
                  onChange={(event) => getProductByBarCode(event.target.value)}
                />
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
                  selected={
                    formData.date_str ? new Date(formData.date_str) : null
                  }
                  value={
                    formData.date_str
                      ? format(
                        new Date(formData.date_str),
                        "MMMM d, yyyy h:mm aa"
                      )
                      : null
                  }
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
                    <i className="bi bi-x-lg"> </i>
                    {errors.date_str}
                  </div>
                )}
              </div>
            </div>

            <div className="col-md-2">
              <label className="form-label">Phone ( 05.. / +966..)</label>

              <div className="input-group mb-3">
                <input
                  value={formData.phone ? formData.phone : ""}
                  type='string'
                  onChange={(e) => {
                    errors["phone"] = "";
                    setErrors({ ...errors });
                    formData.phone = e.target.value;
                    setFormData({ ...formData });
                    console.log(formData);
                  }}
                  className="form-control"
                  id="phone"
                  placeholder="Phone"
                />
              </div>
              {errors.phone && (
                <div style={{ color: "red" }}>

                  {errors.phone}
                </div>
              )}
            </div>



            <div className="col-md-2">
              <label className="form-label">VAT NO.(15 digits)</label>

              <div className="input-group mb-3">
                <input
                  value={formData.vat_no ? formData.vat_no : ""}
                  type='string'
                  onChange={(e) => {
                    errors["vat_no"] = "";
                    setErrors({ ...errors });
                    formData.vat_no = e.target.value;
                    setFormData({ ...formData });
                    console.log(formData);
                  }}
                  className="form-control"
                  id="vat_no"
                  placeholder="VAT NO."
                />
              </div>
              {errors.vat_no && (
                <div style={{ color: "red" }}>

                  {errors.vat_no}
                </div>
              )}
            </div>

            <div className="col-md-3">
              <label className="form-label">Address</label>
              <div className="input-group mb-3">
                <textarea
                  value={formData.address}
                  type='string'
                  onChange={(e) => {
                    errors["address"] = "";
                    setErrors({ ...errors });
                    formData.address = e.target.value;
                    setFormData({ ...formData });
                    console.log(formData);
                  }}
                  className="form-control"
                  id="address"
                  placeholder="Address"
                />
              </div>
              {errors.address && (
                <div style={{ color: "red" }}>

                  {errors.address}
                </div>
              )}
            </div>
            <div className="col-md-3">
              <label className="form-label">Remarks</label>
              <div className="input-group mb-3">
                <textarea
                  value={formData.remarks}
                  type='string'
                  onChange={(e) => {
                    errors["address"] = "";
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
              <Button
                hide={true.toString()}
                onClick={openProductCreateForm}
                className="btn btn-outline-secondary btn-primary btn-sm"
                type="button"
                id="button-addon1"
              >
                {" "}
                <i className="bi bi-plus-lg"></i> New
              </Button>
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



            <div
              className="table-responsive"
              style={{
                overflowX: "auto",
                maxHeight: "400px",
                overflowY: "auto",
              }}
            >

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
                    <th ></th>
                    {enableProductSelection && <th>

                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={handleSelectAll}
                      /> Select All
                    </th>}
                    <th >SI No.</th>
                    <th >Part No.</th>
                    <ResizableTableCell className="text-start">
                      <b>Name</b>
                    </ResizableTableCell>
                    <th >Info</th>
                    <th >Purchase Unit Price</th>
                    <th  >Qty</th>
                    <th >Unit Price</th>
                    <th >Discount</th>
                    <th >Discount%</th>
                    <th >Price</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedProducts
                    .map((product, index) => (
                      <tr key={index} className="text-center">
                        <td>
                          <div
                            style={{ color: "red", cursor: "pointer" }}
                            onClick={() => {
                              removeProduct(product);
                            }}
                          >
                            <i className="bi bi-trash"> </i>
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
                        <ResizableTableCell
                          style={{
                            textDecoration: "underline",
                            color: "blue",
                            cursor: "pointer",
                          }}
                          className="text-start"
                          onClick={() => {
                            openProductDetailsView(product.product_id);
                            console.log("okk,id:", product.product_id);
                          }}
                        >
                          {product.name}
                        </ResizableTableCell>
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
                        <td>

                          <div className="input-group mb-3">
                            <input type="number" value={product.purchase_unit_price} disabled={!selectedProducts[index].can_edit} className="form-control text-end"

                              placeholder="Purchase Unit Price" onChange={(e) => {
                                errors["purchase_unit_price_" + index] = "";
                                setErrors({ ...errors });

                                if (!e.target.value) {
                                  //errors["purchase_unit_price_" + index] = "Invalid purchase unit price";
                                  selectedProducts[index].purchase_unit_price = "";
                                  setSelectedProducts([...selectedProducts]);
                                  //setErrors({ ...errors });
                                  console.log("errors:", errors);
                                  return;
                                }


                                if (e.target.value === 0) {
                                  // errors["purchase_unit_price_" + index] = "purchase unit price should be > 0";
                                  selectedProducts[index].purchase_unit_price = parseFloat(e.target.value);
                                  setSelectedProducts([...selectedProducts]);
                                  //setErrors({ ...errors });
                                  //console.log("errors:", errors);
                                  return;
                                }


                                if (e.target.value) {
                                  selectedProducts[index].purchase_unit_price = parseFloat(e.target.value);
                                  console.log("selectedProducts[index].purchase_unit_price:", selectedProducts[index].purchase_unit_price);
                                  setSelectedProducts([...selectedProducts]);
                                  //reCalculate();
                                }


                              }} />
                            <div
                              style={{ color: "red", cursor: "pointer", marginLeft: "3px" }}
                              onClick={() => {

                                selectedProducts[index].can_edit = !selectedProducts[index].can_edit;
                                setSelectedProducts([...selectedProducts]);


                              }}
                            >
                              {selectedProducts[index].can_edit ? <i className="bi bi-floppy"> </i> : <i className="bi bi-pencil"> </i>}
                            </div>
                            {/*<span className="input-group-text" id="basic-addon2"></span>*/}
                          </div>
                          {errors["purchase_unit_price_" + index] && (
                            <div style={{ color: "red" }}>
                              <i className="bi bi-x-lg"> </i>
                              {errors["purchase_unit_price_" + index]}
                            </div>
                          )}

                        </td>
                        <td style={{ width: "155px" }}>
                          <div className="input-group mb-3">
                            <input
                              type="number"
                              value={product.quantity}
                              className="form-control"
                              placeholder="Quantity"
                              onChange={(e) => {
                                errors["quantity_" + index] = "";
                                setErrors({ ...errors });
                                if (!e.target.value) {
                                  errors["quantity_" + index] =
                                    "Invalid Quantity";
                                  selectedProducts[index].quantity =
                                    e.target.value;
                                  setSelectedProducts([...selectedProducts]);
                                  setErrors({ ...errors });
                                  console.log("errors:", errors);
                                  return;
                                }

                                if (parseFloat(e.target.value) === 0) {
                                  errors["quantity_" + index] =
                                    "Quantity should be > 0";
                                  selectedProducts[index].quantity =
                                    e.target.value;
                                  setSelectedProducts([...selectedProducts]);
                                  setErrors({ ...errors });
                                  console.log("errors:", errors);
                                  return;
                                }

                                product.quantity = parseFloat(e.target.value);
                                reCalculate();

                                selectedProducts[index].quantity = parseFloat(
                                  e.target.value
                                );
                                console.log(
                                  "selectedProducts[index].quantity:",
                                  selectedProducts[index].quantity
                                );
                                setSelectedProducts([...selectedProducts]);
                                reCalculate();
                              }}
                            />
                            <span
                              className="input-group-text"
                              id="basic-addon2"
                            >
                              {" "}
                              {selectedProducts[index].unit
                                ? selectedProducts[index].unit
                                : "Units"}
                            </span>
                          </div>
                          {errors["quantity_" + index] && (
                            <div style={{ color: "red" }}>
                              <i className="bi bi-x-lg"> </i>
                              {errors["quantity_" + index]}
                            </div>
                          )}
                        </td>

                        <td style={{ width: "180px" }}>
                          <div className="input-group mb-3">
                            <input
                              type="number"
                              value={product.unit_price}
                              className="form-control"
                              placeholder="Unit Price"
                              onChange={(e) => {
                                errors["unit_price_" + index] = "";
                                setErrors({ ...errors });
                                if (!e.target.value) {
                                  errors["unit_price_" + index] =
                                    "Invalid Unit Price";
                                  selectedProducts[index].unit_price =
                                    parseFloat(e.target.value);
                                  setSelectedProducts([...selectedProducts]);
                                  setErrors({ ...errors });
                                  console.log("errors:", errors);
                                  return;
                                }

                                if (parseFloat(e.target.value) === 0) {
                                  errors["unit_price_" + index] =
                                    "Unit Price shoudl be > 0";
                                  selectedProducts[index].unit_price =
                                    parseFloat(e.target.value);
                                  setSelectedProducts([...selectedProducts]);
                                  setErrors({ ...errors });
                                  console.log("errors:", errors);
                                  return;
                                }

                                selectedProducts[index].unit_price = parseFloat(
                                  e.target.value
                                );
                                console.log(
                                  "selectedProducts[index].unit_price:",
                                  selectedProducts[index].unit_price
                                );
                                setSelectedProducts([...selectedProducts]);
                                reCalculate();
                              }}
                            />

                          </div>
                          {errors["unit_price_" + index] && (
                            <div style={{ color: "red" }}>
                              <i className="bi bi-x-lg"> </i>
                              {errors["unit_price_" + index]}
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="input-group mb-3">
                            <input type="number" className="form-control text-end" value={selectedProducts[index].unit_discount} onChange={(e) => {
                              selectedProducts[index].is_discount_percent = false;
                              if (parseFloat(e.target.value) === 0) {
                                selectedProducts[index].unit_discount = parseFloat(e.target.value);
                                setFormData({ ...formData });
                                errors["discount_" + index] = "";
                                setErrors({ ...errors });
                                reCalculate(index);
                                return;
                              }

                              if (parseFloat(e.target.value) < 0) {
                                selectedProducts[index].unit_discount = parseFloat(e.target.value);
                                selectedProducts[index].unit_discount_percent = 0.00;
                                setFormData({ ...formData });
                                errors["discount_" + index] = "Discount should be >= 0";
                                setErrors({ ...errors });
                                reCalculate(index);
                                return;
                              }

                              if (!e.target.value) {
                                selectedProducts[index].unit_discount = "";
                                selectedProducts[index].unit_discount_percent = "";
                                // errors["discount_" + index] = "Invalid Discount";
                                setFormData({ ...formData });
                                reCalculate(index);
                                //setErrors({ ...errors });
                                return;
                              }

                              errors["discount_" + index] = "";
                              errors["discount_percent_" + index] = "";
                              setErrors({ ...errors });

                              selectedProducts[index].unit_discount = parseFloat(e.target.value);
                              setFormData({ ...formData });
                              reCalculate(index);
                            }} />
                          </div>
                          {" "}
                          {errors["discount_" + index] && (
                            <div style={{ color: "red" }}>
                              {errors["discount_" + index]}
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="input-group mb-3">
                            <input type="number" disabled={true} className="form-control text-end" value={selectedProducts[index].unit_discount_percent} onChange={(e) => {
                              selectedProducts[index].is_discount_percent = true;
                              if (parseFloat(e.target.value) === 0) {
                                selectedProducts[index].unit_discount_percent = parseFloat(e.target.value);
                                setFormData({ ...formData });
                                errors["unit_discount_percent_" + index] = "";
                                setErrors({ ...errors });
                                reCalculate(index);
                                return;
                              }

                              if (parseFloat(e.target.value) < 0) {
                                selectedProducts[index].unit_discount_percent = parseFloat(e.target.value);
                                selectedProducts[index].unit_discount = 0.00;
                                setFormData({ ...formData });
                                errors["unit_discount_percent_" + index] = "Discount percent should be >= 0";
                                setErrors({ ...errors });
                                reCalculate(index);
                                return;
                              }

                              if (!e.target.value) {
                                selectedProducts[index].unit_discount_percent = "";
                                selectedProducts[index].unit_discount = "";
                                //errors["discount_percent_" + index] = "Invalid Discount Percent";
                                setFormData({ ...formData });
                                reCalculate(index);
                                //setErrors({ ...errors });
                                return;
                              }

                              errors["unit_iscount_percent_" + index] = "";
                              errors["unit_discount_" + index] = "";
                              setErrors({ ...errors });

                              selectedProducts[index].unit_discount_percent = parseFloat(e.target.value);
                              setFormData({ ...formData });
                              reCalculate(index);
                            }} />{""}
                          </div>
                          {errors["unit_discount_percent_" + index] && (
                            <div style={{ color: "red" }}>
                              {errors["unit_discount_percent_" + index]}
                            </div>
                          )}
                        </td>
                        <td className="text-end">
                          <NumberFormat
                            value={((product.unit_price - product.unit_discount) * product.quantity).toFixed(2)}
                            displayType={"text"}
                            thousandSeparator={true}
                            suffix={" "}
                            renderText={(value, props) => value}
                          />
                        </td>
                      </tr>
                    ))
                    .reverse()}
                </tbody>
              </table>
            </div>
            <div className="table-responsive">
              <table className="table table-striped table-sm table-bordered">
                <tbody>
                  <tr>
                    <th colSpan="8" className="text-end">
                      Total
                    </th>
                    <td className="text-end" style={{ width: "200px" }}>
                      <NumberFormat
                        value={formData.total}
                        displayType={"text"}
                        thousandSeparator={true}
                        suffix={" "}
                        renderText={(value, props) => value}
                      />
                    </td>
                  </tr>
                  <tr>
                    <th colSpan="8" className="text-end">
                      Shipping & Handling Fees
                    </th>
                    <td className="text-end">
                      <input
                        type="number"
                        style={{ width: "150px" }}
                        className="text-start"
                        value={formData.shipping_handling_fees}
                        onChange={(e) => {
                          if (parseFloat(e.target.value) === 0) {
                            formData.shipping_handling_fees = parseFloat(
                              e.target.value
                            );
                            setFormData({ ...formData });
                            errors["shipping_handling_fees"] = "";
                            setErrors({ ...errors });
                            reCalculate();
                            return;
                          }

                          if (parseFloat(e.target.value) < 0) {
                            formData.shipping_handling_fees = parseFloat(
                              e.target.value
                            );
                            setFormData({ ...formData });
                            errors["shipping_handling_fees"] =
                              "Shipping / Handling Fees should be > 0";
                            setErrors({ ...errors });
                            reCalculate();
                            return;
                          }

                          if (!e.target.value) {
                            formData.shipping_handling_fees = "";
                            errors["shipping_handling_fees"] =
                              "Invalid Shipping / Handling Fees";
                            setFormData({ ...formData });
                            setErrors({ ...errors });
                            return;
                          }

                          errors["shipping_handling_fees"] = "";
                          setErrors({ ...errors });

                          formData.shipping_handling_fees = parseFloat(
                            e.target.value
                          );
                          setFormData({ ...formData });
                          reCalculate();
                        }}
                      />
                      {" "}
                      {errors.shipping_handling_fees && (
                        <div style={{ color: "red" }}>
                          {errors.shipping_handling_fees}
                        </div>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <th colSpan="8" className="text-end">
                      Discount{" "}
                      <input
                        type="number"
                        style={{ width: "50px" }}
                        className="text-start"
                        value={formData.discount_percent}
                        onChange={(e) => {
                          formData.is_discount_percent = true;
                          if (parseFloat(e.target.value) === 0) {
                            formData.discount_percent = parseFloat(
                              e.target.value
                            );
                            setFormData({ ...formData });
                            errors["discount_percent"] = "";
                            setErrors({ ...errors });
                            reCalculate();
                            return;
                          }

                          if (parseFloat(e.target.value) < 0) {
                            formData.discount_percent = parseFloat(
                              e.target.value
                            );
                            formData.discount = 0.0;
                            setFormData({ ...formData });
                            errors["discount_percent"] =
                              "Discount percent should be >= 0";
                            setErrors({ ...errors });
                            reCalculate();
                            return;
                          }

                          if (!e.target.value) {
                            formData.discount_percent = "";
                            formData.discount = 0.0;
                            errors["discount_percent"] =
                              "Invalid Discount Percent";
                            setFormData({ ...formData });
                            setErrors({ ...errors });
                            return;
                          }

                          errors["discount_percent"] = "";
                          errors["discount"] = "";
                          setErrors({ ...errors });

                          formData.discount_percent = parseFloat(
                            e.target.value
                          );
                          setFormData({ ...formData });
                          reCalculate();
                        }}
                      />
                      {"%"}
                      {errors.discount_percent && (
                        <div style={{ color: "red" }}>
                          {errors.discount_percent}
                        </div>
                      )}
                    </th>
                    <td className="text-end">
                      <input
                        type="number"
                        style={{ width: "150px" }}
                        className="text-start"
                        value={formData.discount}
                        onChange={(e) => {
                          formData.is_discount_percent = false;
                          if (parseFloat(e.target.value) === 0) {
                            formData.discount = parseFloat(e.target.value);
                            setFormData({ ...formData });
                            errors["discount"] = "";
                            setErrors({ ...errors });
                            reCalculate();
                            return;
                          }

                          if (parseFloat(e.target.value) < 0) {
                            formData.discount = parseFloat(e.target.value);
                            formData.discount_percent = 0.0;
                            setFormData({ ...formData });
                            errors["discount"] = "Discount should be >= 0";
                            setErrors({ ...errors });
                            reCalculate();
                            return;
                          }

                          if (!e.target.value) {
                            formData.discount = "";
                            formData.discount_percent = 0.0;
                            errors["discount"] = "Invalid Discount";
                            setFormData({ ...formData });
                            reCalculate();
                            setErrors({ ...errors });
                            return;
                          }

                          errors["discount"] = "";
                          errors["discount_percent"] = "";
                          setErrors({ ...errors });

                          formData.discount = parseFloat(e.target.value);
                          setFormData({ ...formData });
                          reCalculate();
                        }}
                      />
                      {" "}
                      {errors.discount && (
                        <div style={{ color: "red" }}>{errors.discount}</div>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <th colSpan="8" className="text-end">
                      {" "}
                      VAT{" "}
                      <input
                        type="number"
                        className="text-center"
                        style={{ width: "50px" }}
                        value={formData.vat_percent}
                        onChange={(e) => {
                          console.log("Inside onchange vat percent");
                          if (parseFloat(e.target.value) === 0) {
                            formData.vat_percent = parseFloat(e.target.value);
                            setFormData({ ...formData });
                            errors["vat_percent"] = "";
                            setErrors({ ...errors });
                            reCalculate();
                            return;
                          }
                          if (parseFloat(e.target.value) < 0) {
                            formData.vat_percent = parseFloat(e.target.value);
                            formData.vat_price = 0.0;
                            setFormData({ ...formData });
                            errors["vat_percent"] =
                              "Vat percent should be >= 0";
                            setErrors({ ...errors });
                            reCalculate();
                            return;
                          }

                          if (!e.target.value) {
                            formData.vat_percent = "";
                            formData.vat_price = 0.0;
                            //formData.discount_percent = 0.00;
                            errors["vat_percent"] = "Invalid vat percent";
                            setFormData({ ...formData });
                            setErrors({ ...errors });
                            return;
                          }
                          errors["vat_percent"] = "";
                          setErrors({ ...errors });

                          formData.vat_percent = e.target.value;
                          reCalculate();
                          setFormData({ ...formData });
                          console.log(formData);
                        }}
                      />
                      {"%"}
                      {errors.vat_percent && (
                        <div style={{ color: "red" }}>{errors.vat_percent}</div>
                      )}
                    </th>
                    <td className="text-end">
                      <NumberFormat
                        value={formData.vat_price}
                        displayType={"text"}
                        thousandSeparator={true}
                        suffix={" "}
                        renderText={(value, props) => value}
                      />
                    </td>
                  </tr>
                  <tr>
                    <th colSpan="8" className="text-end">
                      Net Total
                    </th>
                    <th className="text-end">
                      <NumberFormat
                        value={formData.net_total}
                        displayType={"text"}
                        thousandSeparator={true}
                        suffix={" "}
                        renderText={(value, props) => value}
                      />
                    </th>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="col-md-6">
              <label className="form-label">Status*</label>

              <div className="input-group mb-3">
                <select
                  value={formData.status}
                  onChange={(e) => {
                    console.log("Inside onchange status");
                    if (!e.target.value) {
                      formData.status = "";
                      setFormData({ ...formData });
                      errors["status"] = "Invalid Status";
                      setErrors({ ...errors });
                      return;
                    }

                    errors["status"] = "";
                    setErrors({ ...errors });

                    formData.status = e.target.value;
                    setFormData({ ...formData });
                    console.log(formData);
                  }}
                  className="form-control"
                >
                  <option value="created">Created</option>
                  <option value="delivered">Delivered</option>
                  <option value="pending">Pending</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                {errors.status && (
                  <div style={{ color: "red" }}>
                    <i className="bi bi-x-lg"> </i>
                    {errors.status}
                  </div>
                )}
                {formData.status && !errors.status && (
                  <div style={{ color: "green" }}>
                    <i className="bi bi-check-lg"> </i>
                    Looks good!
                  </div>
                )}
              </div>
            </div>



            <div className="col-md-3">
              <label className="form-label">Validity (# of Days)*</label>

              <div className="input-group mb-3">
                <input
                  type="number"
                  className="text-center"
                  style={{ width: "50px" }}
                  value={formData.validity_days}
                  onChange={(e) => {
                    console.log("Inside onchange validity days");
                    if (!e.target.value) {
                      formData.validity_days = null;
                      errors["validity_days"] = "Validity days are required";
                      setFormData({ ...formData });
                      setErrors({ ...errors });
                      return;
                    }

                    if (parseInt(e.target.value) <= 0) {
                      formData.validity_days = parseInt(e.target.value);
                      setValidityDays(validityDays);
                      setFormData({ ...formData });
                      errors["validity_days"] =
                        "Validity days should be > 0";
                      setErrors({ ...errors });
                      return;
                    }

                    errors["validity_days"] = "";
                    setErrors({ ...errors });

                    formData.validity_days = parseInt(e.target.value);
                    setFormData({ ...formData });

                    validityDays = formData.validity_days;
                    setValidityDays(formData.validity_days);
                    console.log(formData);
                  }}
                />

                {errors.validity_days && (
                  <div style={{ color: "red" }}>
                    <i className="bi bi-x-lg"> </i>
                    {errors.validity_days}
                  </div>
                )}

                {formData.validity_days > 0 && formData.validity_days && !errors.validity_days && (
                  <div style={{ color: "green" }}>
                    <i className="bi bi-check-lg"> </i>
                    Looks good!
                  </div>
                )}
              </div>
            </div>

            <div className="col-md-3">
              <label className="form-label">Delivery (# of Days)*</label>

              <div className="input-group mb-3">
                <input
                  type="number"
                  className="text-center"
                  style={{ width: "50px" }}
                  value={formData.delivery_days}
                  onChange={(e) => {
                    console.log("Inside onchange delivery days");
                    if (!e.target.value) {
                      formData.delivery_days = null;
                      errors["delivery_days"] = "Delivery days are required";
                      setFormData({ ...formData });
                      setErrors({ ...errors });
                      return;
                    }

                    if (parseInt(e.target.value) <= 0) {
                      formData.delivery_days = parseInt(e.target.value);
                      setDeliveryDays(deliveryDays);
                      setFormData({ ...formData });
                      errors["delivery_days"] =
                        "Delivery days should be > 0";
                      setErrors({ ...errors });
                      return;
                    }

                    errors["delivery_days"] = "";
                    setErrors({ ...errors });

                    formData.delivery_days = parseInt(e.target.value);
                    setFormData({ ...formData });

                    deliveryDays = formData.delivery_days;
                    setDeliveryDays(formData.delivery_days);
                    console.log(formData);
                  }}
                />

                {errors.delivery_days && (
                  <div style={{ color: "red" }}>
                    <i className="bi bi-x-lg"> </i>
                    {errors.delivery_days}
                  </div>
                )}
                {formData.delivery_days > 0 && formData.delivery_days && !errors.delivery_days && (
                  <div style={{ color: "green" }}>
                    <i className="bi bi-check-lg"> </i>
                    Looks good!
                  </div>
                )}
              </div>
            </div>

            <Modal.Footer>
              <Button variant="secondary" onClick={handleClose}>
                Close
              </Button>
              <Button variant="primary" disabled={enableProductSelection} onClick={handleCreate}>
                {isProcessing
                  ? (
                    <Spinner
                      as="span"
                      animation="border"
                      size="sm"
                      role="status"
                      aria-hidden={true}
                    />
                  ) + " Processing..."
                  : formData.id
                    ? "Update"
                    : "Create"}
              </Button>
            </Modal.Footer>
          </form>
        </Modal.Body>
      </Modal>
    </>
  );
});

export default QuotationCreate;
