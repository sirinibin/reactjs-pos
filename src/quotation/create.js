import React, { useState, useEffect } from "react";
import QuotationPreview from "./preview.js";
import { Modal, Button } from "react-bootstrap";
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


function QuotationCreate(props) {
  const selectedDate = new Date();

  //const history = useHistory();
  let [errors, setErrors] = useState({});
  const [isProcessing, setProcessing] = useState(false);
  const cookies = new Cookies();

  //fields
  let [formData, setFormData] = useState({
    vat_percent: 10.0,
    discount: 0.0,
    date_str: format(new Date(), "MMM dd yyyy"),
    status: "created",
  });

  let [unitPriceList, setUnitPriceList] = useState([]);

  //Store Auto Suggestion
  const [storeOptions, setStoreOptions] = useState([]);
  const [selectedStores, setSelectedStores] = useState([]);
  const [isStoresLoading, setIsStoresLoading] = useState(false);

  //Customer Auto Suggestion
  const [customerOptions, setCustomerOptions] = useState([]);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [isCustomersLoading, setIsCustomersLoading] = useState(false);

  //Product Auto Suggestion
  const [productOptions, setProductOptions] = useState([]);
  let [selectedProduct, setSelectedProduct] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [isProductsLoading, setIsProductsLoading] = useState(false);

  //Delivered By Auto Suggestion
  const [deliveredByUserOptions, setDeliveredByUserOptions] = useState([]);
  const [selectedDeliveredByUsers, setSelectedDeliveredByUsers] = useState([]);
  const [isDeliveredByUsersLoading, setIsDeliveredByUsersLoading] =
    useState(false);

  //Delivered By Signature Auto Suggestion
  const [deliveredBySignatureOptions, setDeliveredBySignatureOptions] =
    useState([]);
  const [selectedDeliveredBySignatures, setSelectedDeliveredBySignatures] =
    useState([]);
  const [isDeliveredBySignaturesLoading, setIsDeliveredBySignaturesLoading] =
    useState(false);

  const [show, SetShow] = useState(false);

  function handleClose() {
    SetShow(false);
  }

  function handleShow() {
    SetShow(true);
  }

  useEffect(() => {
    let at = cookies.get("access_token");
    if (!at) {
      // history.push("/dashboard/quotations");
      window.location = "/";
    }
  });

  useEffect(() => {
    console.log("Re calculating1");
    findVatPrice();
    findNetTotal();
  }, [formData.vat_percent]);

  useEffect(() => {
    console.log("Re calculating2");
    findNetTotal();
  }, [formData.discount]);

  function ObjectToSearchQueryParams(object) {
    return Object.keys(object)
      .map(function (key) {
        return `search[${key}]=${object[key]}`;
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
    setIsCustomersLoading(true);
    let result = await fetch(
      "/v1/customer?" + Select + queryString,
      requestOptions
    );
    let data = await result.json();

    setCustomerOptions(data.result);
    setIsCustomersLoading(false);
  }

  function GetProductUnitPriceInStore(storeId, unitPriceListArray) {
    if (!unitPriceListArray) {
      return "";
    }

    for (var i = 0; i < unitPriceListArray.length; i++) {
      console.log("unitPriceListArray[i]:", unitPriceListArray[i]);
      console.log("store_id:", storeId);

      if (unitPriceListArray[i].store_id === storeId) {
        console.log("macthed");
        console.log(
          "unitPrice.retail_unit_price:",
          unitPriceListArray[i].retail_unit_price
        );
        return unitPriceListArray[i].retail_unit_price;
      } else {
        console.log("not matched");
      }
    }
    return "";
  }

  function GetProductStockInStore(storeId, stockList) {
    for (var i = 0; i < stockList.length; i++) {
      if (stockList[i].store_id === storeId) {
        return stockList[i].stock;
      }
    }
    return 0;
  }
  /*
    function SetPriceOfAllProducts(storeId) {
      console.log("inside set price of all products:");
  
      if (selectedProduct[0] && selectedProduct[0].id) {
        let unitPrice = GetProductUnitPriceInStore(
          storeId,
          selectedProduct[0].unit_prices
        );
        if (unitPrice) {
          selectedProduct[0].unit_price = GetProductUnitPriceInStore(
            storeId,
            selectedProduct[0].unit_prices
          );
          setSelectedProduct([...selectedProduct]);
        }
  
        console.log(
          "selectedProduct[0].unit_price:",
          selectedProduct[0].unit_price
        );
      }
  
      for (var i = 0; i < selectedProducts.length; i++) {
        let unitPrice = GetProductUnitPriceInStore(
          storeId,
          selectedProducts[i].unit_prices
        );
  
        if (unitPrice) {
          selectedProducts[i].unit_price = GetProductUnitPriceInStore(
            storeId,
            selectedProducts[i].unit_prices
          );
        }
  
        console.log(
          "selectedProducts[i].unit_price:",
          selectedProducts[i].unit_price
        );
      }
  
      setSelectedProducts([...selectedProducts]);
    }
    */

  async function suggestProducts(searchTerm) {
    console.log("Inside handle suggestProducts");
    setProductOptions([]);

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

    let Select = "select=id,item_code,name,unit_prices,stock";
    setIsProductsLoading(true);
    let result = await fetch(
      "/v1/product?" + Select + queryString,
      requestOptions
    );
    let data = await result.json();

    setProductOptions(data.result);
    setIsProductsLoading(false);
  }

  async function suggestUsers(searchTerm) {
    console.log("Inside handle suggestUsers");
    setDeliveredByUserOptions([]);

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
    setIsDeliveredByUsersLoading(true);
    let result = await fetch(
      "/v1/user?" + Select + queryString,
      requestOptions
    );
    let data = await result.json();

    setDeliveredByUserOptions(data.result);
    setIsDeliveredByUsersLoading(false);
  }

  async function suggestSignatures(searchTerm) {
    console.log("Inside handle suggestSignatures");
    setDeliveredBySignatureOptions([]);

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
    setIsDeliveredBySignaturesLoading(true);
    let result = await fetch(
      "/v1/signature?" + Select + queryString,
      requestOptions
    );
    let data = await result.json();

    setDeliveredBySignatureOptions(data.result);
    setIsDeliveredBySignaturesLoading(false);
  }

  function handleCreate(event) {
    event.preventDefault();
    console.log("Inside handle Create");
    console.log("selectedProducts:", selectedProducts);

    formData.products = [];
    for (var i = 0; i < selectedProducts.length; i++) {
      formData.products.push({
        product_id: selectedProducts[i].product_id,
        quantity: parseInt(selectedProducts[i].quantity),
        unit_price: parseFloat(selectedProducts[i].unit_price),
      });
    }

    formData.discount = parseFloat(formData.discount);
    formData.vat_percent = parseFloat(formData.vat_percent);
    console.log("formData.discount:", formData.discount);

    const requestOptions = {
      method: "POST",
      headers: {
        'Accept': 'application/json',
        "Content-Type": "application/json",
        Authorization: cookies.get("access_token"),
      },
      body: JSON.stringify(formData),
    };

    console.log("formData:", formData);

    setProcessing(true);
    fetch("/v1/quotation", requestOptions)
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
        props.showToastMessage("Quotation Created Successfully!", "success");
        props.refreshList();
        handleClose();
      })
      .catch((error) => {
        setProcessing(false);
        console.log("Inside catch");
        console.log(error);
        setErrors({ ...error });
        console.error("There was an error!", error);
        props.showToastMessage("Error Creating Quotation!", "danger");
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

  function addProduct() {
    console.log("Inside Add product");

    errors.product_id = "";
    if (!selectedProduct[0] || !selectedProduct[0].id) {
      errors.product_id = "No product selected";
      setErrors({ ...errors });
      return;
    }

    if (isProductAdded(selectedProduct[0].id)) {
      errors.product_id = "Product Already Added";
      setErrors({ ...errors });
      return;
    }

    errors.quantity = "";
    console.log("selectedProduct[0].quantity:", selectedProduct[0].quantity);

    if (!selectedProduct[0].quantity || isNaN(selectedProduct[0].quantity)) {
      errors.quantity = "Invalid Quantity";
      setErrors({ ...errors });
      return;
    }

    errors.unit_price = "";
    if (
      !selectedProduct[0].unit_price ||
      isNaN(selectedProduct[0].unit_price)
    ) {
      errors.unit_price = "Invalid Unit Price";
      setErrors({ ...errors });
      return;
    }

    selectedProducts.push({
      product_id: selectedProduct[0].id,
      code: selectedProduct[0].item_code,
      name: selectedProduct[0].name,
      quantity: selectedProduct[0].quantity,
      unit_price: parseFloat(selectedProduct[0].unit_price).toFixed(2),
    });

    selectedProduct[0].name = "";
    selectedProduct[0].id = "";
    selectedProduct[0].quantity = "";
    selectedProduct[0].unit_price = "";

    setSelectedProduct([...selectedProduct]);
    setSelectedProducts([...selectedProducts]);
    console.log("selectedProduct:", selectedProduct);
    console.log("selectedProducts:", selectedProducts);

    findTotalPrice();
    findTotalQuantity();
    findVatPrice();
    findNetTotal();
  }

  function removeProduct(product) {
    const index = selectedProducts.indexOf(product);
    if (index > -1) {
      selectedProducts.splice(index, 1);
    }
    setSelectedProducts(selectedProducts);

    findTotalPrice();
    findTotalQuantity();
    findVatPrice();
    findNetTotal();
  }

  let [totalPrice, setTotalPrice] = useState(0.0);

  function findTotalPrice() {
    totalPrice = 0.00;
    for (var i = 0; i < selectedProducts.length; i++) {
      totalPrice +=
        parseFloat(selectedProducts[i].unit_price) *
        parseInt(selectedProducts[i].quantity);
    }
    totalPrice = totalPrice.toFixed(2);
    setTotalPrice(totalPrice);
  }

  let [totalQuantity, setTotalQuantity] = useState(0);

  function findTotalQuantity() {
    totalQuantity = 0;
    for (var i = 0; i < selectedProducts.length; i++) {
      totalQuantity += parseInt(selectedProducts[i].quantity);
    }
    setTotalQuantity(totalQuantity);
  }

  let [vatPrice, setVatPrice] = useState(0.00);

  function findVatPrice() {
    vatPrice = ((parseFloat(formData.vat_percent) / 100) * parseFloat(totalPrice)).toFixed(2);;
    console.log("vatPrice:", vatPrice);
    setVatPrice(vatPrice);
  }

  let [netTotal, setNetTotal] = useState(0.00);

  function findNetTotal() {
    netTotal = (parseFloat(totalPrice) + parseFloat(vatPrice) - parseFloat(formData.discount)).toFixed(2);
    setNetTotal(netTotal);
  }

  return (
    <>
      {
        props.showCreateButton && (
          <Button
            hide={true}
            variant="primary"
            className="btn btn-primary mb-3"
            onClick={handleShow}
          >
            <i className="bi bi-plus-lg"></i> Create
          </Button>
        )
      }
      <Modal show={show} size="lg" onHide={handleClose} animation={false} backdrop={true}>
        <Modal.Header>
          <Modal.Title>Create New Quotation</Modal.Title>

          <div className="col align-self-end text-end">
            <QuotationPreview />
            {/*
                        <button
                            className="btn btn-primary mb-3"
                            data-bs-toggle="modal"
                            data-bs-target="#previewQuotationModal"
                        >
                            <i className="bi bi-display"></i> Preview
                        </button> */}
            <button
              type="button"
              className="btn-close"
              onClick={handleClose}
              aria-label="Close"
            ></button>
          </div>
        </Modal.Header>
        <Modal.Body>
          <form className="row g-3 needs-validation" onSubmit={handleCreate}>
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
                  highlightOnlyResult="true"
                  onInputChange={(searchTerm, e) => {
                    suggestStores(searchTerm);
                  }}
                />

                <StoreCreate showCreateButton={true} />
                <div style={{ color: "red" }}>
                  <i class="bi x-lg"> </i>
                  {errors.store_id}
                </div>
                {formData.store_id && !errors.store_id && (
                  <div style={{ color: "green" }}>
                    <i class="bi bi-check-lg"> </i>
                    Looks good!
                  </div>
                )}
              </div>
            </div>
            <div className="col-md-6">
              <label className="form-label">Customer*</label>

              <div className="input-group mb-3">
                <Typeahead
                  id="customer_id"
                  labelKey="name"
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
                  placeholder="Select Customer"
                  selected={selectedCustomers}
                  highlightOnlyResult="true"
                  onInputChange={(searchTerm, e) => {
                    suggestCustomers(searchTerm);
                  }}
                />
                <CustomerCreate showCreateButton={true} />
                {errors.customer_id && (
                  <div style={{ color: "red" }}>
                    <i class="bi bi-x-lg"> </i>
                    {errors.customer_id}
                  </div>
                )}
                {formData.customer_id && !errors.customer_id && (
                  <div style={{ color: "green" }}>
                    <i class="bi bi-check-lg"> </i>
                    Looks good!
                  </div>
                )}
              </div>
            </div>
            <div className="col-md-6">
              <label className="form-label">Date*</label>

              <div className="input-group mb-3">
                <DatePicker
                  id="date_str"
                  value={formData.date_str}
                  selected={selectedDate}
                  className="form-control"
                  dateFormat="MMM dd yyyy"
                  onChange={(value) => {
                    formData.date_str = format(new Date(value), "MMM dd yyyy");
                    setFormData({ ...formData });
                  }}
                />

                {errors.date_str && (
                  <div style={{ color: "red" }}>
                    <i class="bi bi-x-lg"> </i>
                    {errors.date_str}
                  </div>
                )}
                {formData.date_str && !errors.date_str && (
                  <div style={{ color: "green" }}>
                    <i class="bi bi-check-lg"> </i>
                    Looks good!
                  </div>
                )}
              </div>
            </div>

            <div className="col-md-6">
              <label className="form-label">VAT %*</label>

              <div className="input-group mb-3">
                <input
                  value={formData.vat_percent}
                  type='number'
                  onChange={(e) => {
                    console.log("Inside onchange vat percent");
                    if (isNaN(e.target.value)) {
                      errors["vat_percent"] = "Invalid Quantity";
                      setErrors({ ...errors });
                      return;
                    }

                    errors["vat_percent"] = "";
                    setErrors({ ...errors });

                    formData.vat_percent = e.target.value;
                    setFormData({ ...formData });
                    console.log(formData);
                  }}
                  className="form-control"
                  defaultValue="10.00"
                  id="validationCustom01"
                  placeholder="VAT %"
                  aria-label="Select Store"
                  aria-describedby="button-addon1"
                />
                {errors.vat_percent && (
                  <div style={{ color: "red" }}>
                    <i class="bi bi-x-lg"> </i>
                    {errors.vat_percent}
                  </div>
                )}
                {formData.vat_percent && !errors.vat_percent && (
                  <div style={{ color: "green" }}>
                    <i class="bi bi-check-lg"> </i>
                    Looks good!
                  </div>
                )}
              </div>
            </div>
            <div className="col-md-6">
              <label className="form-label">Discount*</label>
              <div className="input-group mb-3">
                <input
                  value={formData.discount}
                  type='number'
                  onChange={(e) => {
                    console.log("Inside onchange vat discount");
                    if (isNaN(e.target.value)) {
                      errors["discount"] = "Invalid Discount";
                      setErrors({ ...errors });
                      return;
                    }

                    errors["discount"] = "";
                    setErrors({ ...errors });

                    formData.discount = e.target.value;
                    setFormData({ ...formData });
                    console.log(formData);
                  }}
                  className="form-control"
                  defaultValue="0.00"
                  id="validationCustom02"
                  placeholder="Discount"
                  aria-label="Select Customer"
                  aria-describedby="button-addon2"
                />
                {errors.discount && (
                  <div style={{ color: "red" }}>
                    <i class="bi bi-x-lg"> </i>
                    {errors.discount}
                  </div>
                )}
                {!errors.discount && (
                  <div style={{ color: "green" }}>
                    <i class="bi bi-check-lg"> </i>
                    Looks good!
                  </div>
                )}
              </div>
            </div>
            <div className="col-md-6">
              <label className="form-label">Status*</label>

              <div className="input-group mb-3">
                <select
                  onChange={(e) => {
                    console.log("Inside onchange status");
                    if (!e.target.value) {
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
                  <option vaue="delivered">Delivered</option>
                  <option value="pending">Pending</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                {errors.status && (
                  <div style={{ color: "red" }}>
                    <i class="bi bi-x-lg"> </i>
                    {errors.status}
                  </div>
                )}
                {formData.status && !errors.status && (
                  <div style={{ color: "green" }}>
                    <i class="bi bi-check-lg"> </i>
                    Looks good!
                  </div>
                )}
              </div>
            </div>
            <div className="col-md-6">
              <label className="form-label">Product*</label>

              <div className="input-group mb-3">
                <Typeahead
                  id="product_id"
                  labelKey="name"
                  isLoading={isProductsLoading}
                  isInvalid={errors.product_id ? true : false}
                  onChange={(selectedItems) => {
                    if (selectedItems.length === 0) {
                      errors["product_id"] = "Invalid Product selected";
                      console.log(errors);
                      setErrors(errors);
                      setSelectedProduct([]);
                      console.log(errors);
                      return;
                    }

                    errors["product_id"] = "";
                    setErrors({ ...errors });

                    if (formData.store_id) {
                      selectedItems[0].unit_price = GetProductUnitPriceInStore(
                        formData.store_id,
                        selectedItems[0].unit_prices
                      );
                    }

                    selectedProduct = selectedItems;
                    console.log("selectedItems:", selectedItems);
                    setSelectedProduct([...selectedItems]);
                    console.log("selectedProduct:", selectedProduct);
                    unitPriceList[selectedItems[0].product_id] =
                      selectedItems[0].unit_prices;
                    setUnitPriceList(unitPriceList);
                  }}
                  options={productOptions}
                  placeholder="Select Product"
                  selected={selectedProduct}
                  highlightOnlyResult="true"
                  onInputChange={(searchTerm, e) => {
                    suggestProducts(searchTerm);
                  }}
                />
                <ProductCreate showCreateButton={true} />
                {errors.product_id ? (
                  <div style={{ color: "red" }}>
                    <i class="bi bi-x-lg"> </i>
                    {errors.product_id}
                  </div>
                ) : null}
                {selectedProduct[0] &&
                  selectedProduct[0].id &&
                  !errors.product_id && (
                    <div style={{ color: "green" }}>
                      <i class="bi bi-check-lg"> </i>
                      Looks good!
                    </div>
                  )}
              </div>
            </div>

            <div className="col-md-2">
              <label className="form-label">Qty*</label>
              <input
                value={selectedProduct[0] ? selectedProduct[0].quantity : null}
                onChange={(e) => {
                  console.log("Inside onchange qty");
                  if (isNaN(e.target.value) || e.target.value === "0") {
                    errors["quantity"] = "Invalid Quantity";
                    setErrors({ ...errors });
                    return;
                  }

                  errors["quantity"] = "";
                  setErrors({ ...errors });

                  if (selectedProduct[0]) {
                    selectedProduct[0].quantity = e.target.value;
                    setSelectedProduct([...selectedProduct]);
                    console.log(selectedProduct);
                  }
                }}
                type="text"
                className="form-control"
                id="quantity"
                placeholder="Quantity"
              />
              {errors.quantity ? (
                <div style={{ color: "red" }}>
                  <i class="bi bi-x-lg"> </i>
                  {errors.quantity}
                </div>
              ) : null}

              {selectedProduct[0] &&
                selectedProduct[0].quantity &&
                !errors["quantity"] && (
                  <div style={{ color: "green" }}>
                    <i class="bi bi-check-lg"> </i>
                    Looks good!
                  </div>
                )}
            </div>
            <div className="col-md-2">
              <label className="form-label">Unit Price*</label>
              <input
                type="text"
                value={
                  selectedProduct[0] ? selectedProduct[0].unit_price : null
                }
                onChange={(e) => {
                  console.log("Inside onchange unit price:");

                  if (isNaN(e.target.value) || e.target.value === "0") {
                    errors["unit_price"] = "Invalid Unit Price";
                    setErrors({ ...errors });
                    return;
                  }
                  errors["unit_price"] = "";
                  setErrors({ ...errors });

                  //setFormData({ ...formData });
                  if (selectedProduct[0]) {
                    selectedProduct[0].unit_price = e.target.value;
                    setSelectedProduct([...selectedProduct]);
                  }
                }}
                className="form-control"
                id="unit_price"
                placeholder="Unit Price"
                defaultValue=""
              />

              {errors.unit_price ? (
                <div style={{ color: "red" }}>
                  <i class="bi bi-x-lg"> </i>
                  {errors.unit_price}
                </div>
              ) : null}
              {selectedProduct[0] &&
                selectedProduct[0].unit_price &&
                !errors.unit_price && (
                  <div style={{ color: "green" }}>
                    <i class="bi bi-check-lg"> </i>Looks good!
                  </div>
                )}
            </div>
            <div className="col-md-2">
              <label className="form-label">&nbsp;</label>
              <Button
                variant="primary"
                className="btn btn-primary form-control"
                onClick={addProduct}
              >
                <i className="bi bi-plus-lg"></i> ADD
              </Button>
            </div>

            <table className="table table-striped table-sm table-bordered">
              <thead>
                <tr className="text-center">
                  <th>SI No.</th>
                  <th>CODE</th>
                  <th>Name</th>
                  <th>Qty</th>
                  <th>Unit Price</th>
                  <th>Price</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {selectedProducts.map((product, index) => (
                  <tr className="text-center">
                    <td>{index + 1}</td>
                    <td>{product.code}</td>
                    <td>{product.name}</td>
                    <td>{product.quantity}</td>
                    <td>
                      <NumberFormat
                        value={product.unit_price}
                        displayType={"text"}
                        thousandSeparator={true}
                        suffix={" SAR"}
                        renderText={(value, props) => value}
                      />
                    </td>
                    <td>
                      <NumberFormat
                        value={(product.unit_price * product.quantity).toFixed(2)}
                        displayType={"text"}
                        thousandSeparator={true}
                        suffix={" SAR"}
                        renderText={(value, props) => value}
                      />
                    </td>
                    <td>
                      <div
                        style={{ color: "red", cursor: "pointer" }}
                        onClick={() => {
                          removeProduct(product);
                        }}
                      >
                        <i class="bi bi-x-lg"> </i>
                      </div>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td colSpan="3"></td>
                  <td className="text-center">
                    <b>{totalQuantity}</b>
                  </td>
                  <th className="text-end">Total</th>
                  <td className="text-center">
                    <NumberFormat
                      value={totalPrice}
                      displayType={"text"}
                      thousandSeparator={true}
                      suffix={" SAR"}
                      renderText={(value, props) => value}
                    />
                  </td>
                </tr>
                <tr>
                  <th colSpan="4" className="text-end">
                    VAT
                  </th>
                  <td className="text-center">{formData.vat_percent + "%"}</td>
                  <td className="text-center">
                    <NumberFormat
                      value={vatPrice}
                      displayType={"text"}
                      thousandSeparator={true}
                      suffix={" SAR"}
                      renderText={(value, props) => value}
                    />
                  </td>
                </tr>
                <tr>
                  <th colSpan="5" className="text-end">
                    Discount
                  </th>
                  <td className="text-center">
                    <NumberFormat
                      value={formData.discount}
                      displayType={"text"}
                      thousandSeparator={true}
                      suffix={" SAR"}
                      renderText={(value, props) => value}
                    />
                  </td>
                </tr>
                <tr>
                  <td colSpan="4"></td>
                  <th className="text-end">Net Total</th>
                  <th className="text-center">
                    <NumberFormat
                      value={netTotal}
                      displayType={"text"}
                      thousandSeparator={true}
                      suffix={" SAR"}
                      renderText={(value, props) => value}
                    />
                  </th>
                </tr>
              </tbody>
            </table>

            <div className="col-md-6">
              <label className="form-label">Delivered By*</label>

              <div className="input-group mb-3">
                <Typeahead
                  id="delivered_by"
                  labelKey="name"
                  isLoading={isDeliveredByUsersLoading}
                  isInvalid={errors.delivered_by ? true : false}
                  onChange={(selectedItems) => {
                    errors.delivered_by = "";
                    setErrors(errors);
                    if (selectedItems.length === 0) {
                      errors.delivered_by = "Invalid User Selected";
                      setErrors(errors);
                      setFormData({ ...formData });
                      setSelectedDeliveredByUsers([]);
                      return;
                    }
                    formData.delivered_by = selectedItems[0].id;
                    setFormData({ ...formData });
                    setSelectedDeliveredByUsers(selectedItems);
                  }}
                  options={deliveredByUserOptions}
                  placeholder="Select User"
                  selected={selectedDeliveredByUsers}
                  highlightOnlyResult="true"
                  onInputChange={(searchTerm, e) => {
                    suggestUsers(searchTerm);
                  }}
                />

                <UserCreate showCreateButton={true} />
                {errors.delivered_by ? (
                  <div style={{ color: "red" }}>
                    <i class="bi bi-x-lg"> </i> {errors.delivered_by}
                  </div>
                ) : null}
                {formData.delivered_by && !errors.delivered_by && (
                  <div style={{ color: "green" }}>
                    <i class="bi bi-check-lg"> </i>Looks good!
                  </div>
                )}
              </div>
            </div>

            <div className="col-md-6">
              <label className="form-label">
                Delivered By Signature(Optional)
              </label>

              <div className="input-group mb-3">
                <Typeahead
                  id="delivered_by_signature_id"
                  labelKey="name"
                  isLoading={isDeliveredBySignaturesLoading}
                  isInvalid={errors.delivered_by_signature_id ? true : false}
                  onChange={(selectedItems) => {
                    errors.delivered_by_signature_id = "";
                    setErrors(errors);
                    if (selectedItems.length === 0) {
                      errors.delivered_by_signature_id =
                        "Invalid Signature Selected";
                      setErrors(errors);
                      setFormData({ ...formData });
                      setSelectedDeliveredBySignatures([]);
                      return;
                    }
                    formData.delivered_by_signature_id = selectedItems[0].id;
                    setFormData({ ...formData });
                    setSelectedDeliveredBySignatures(selectedItems);
                  }}
                  options={deliveredBySignatureOptions}
                  placeholder="Select Signature"
                  selected={selectedDeliveredBySignatures}
                  highlightOnlyResult="true"
                  onInputChange={(searchTerm, e) => {
                    suggestSignatures(searchTerm);
                  }}
                />

                <SignatureCreate showCreateButton={true} />
                {errors.delivered_by_signature_id ? (
                  <div style={{ color: "red" }}>
                    <i class="bi bi-x-lg"> </i>{" "}
                    {errors.delivered_by_signature_id}
                  </div>
                ) : null}
                {formData.delivered_by_signature_id &&
                  !errors.delivered_by_signature_id && (
                    <div style={{ color: "green" }}>
                      <i class="bi bi-check-lg"> </i> Looks good!
                    </div>
                  )}
              </div>
            </div>
            <Modal.Footer>
              <Button variant="secondary" onClick={handleClose}>
                Close
              </Button>
              <Button variant="primary" type="submit" >
                {isProcessing ?
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                  /> + " Creating..."

                  : "Create"
                }
              </Button>
            </Modal.Footer>
          </form>
        </Modal.Body>

      </Modal>


    </>
  );
}

export default QuotationCreate;
