import React, {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import Preview from "./../order/preview.js";
import { Modal, Button, } from "react-bootstrap";
import CustomerCreate from "./../customer/create.js";
import ProductCreate from "./../product/create.js";
import UserCreate from "./../user/create.js";
import SignatureCreate from "./../signature/create.js";
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
import { trimTo2Decimals } from "../utils/numberUtils";
import Amount from "../utils/amount.js";
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import Sales from "./../utils/sales.js";
import InfoDialog from './../utils/InfoDialog';
import * as bootstrap from 'bootstrap';
import OverflowTooltip from "../utils/OverflowTooltip.js";
import ImageViewerModal from './../utils/ImageViewerModal';

const QuotationCreate = forwardRef((props, ref) => {
  //const [operationType, setoperationType] = useState("")

  function ResetForm() {
    shipping = 0.00;
    setShipping(shipping);

    discount = 0.00;
    setDiscount(discount);

    discountPercent = 0.00;
    setDiscountPercent(discountPercent);

    discountWithVAT = 0.00;
    setDiscountWithVAT(discountWithVAT);

    discountPercentWithVAT = 0.00;
    setDiscountPercentWithVAT(discountPercentWithVAT);

    selectedProducts = [];
    setSelectedProducts([]);

    selectedCustomers = [];
    setSelectedCustomers([]);

    selectedDeliveredByUsers = [];
    setSelectedDeliveredByUsers([]);

  }

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
        type: "quotation",
        payment_status: "",
      };

      formData.payments_input = [
        {
          "date_str": formData.date_str,
          // "amount": "",
          "amount": 0.00,
          "method": "",
          "deleted": false,
        }
      ];
      formData.cash_discount = 0.00;

      ResetForm();

      reCalculate();

      if (localStorage.getItem("user_id")) {
        selectedDeliveredByUsers = [
          {
            id: localStorage.getItem("user_id"),
            name: localStorage.getItem("user_name"),
          },
        ];
        formData.delivered_by = localStorage.getItem("user_id");
        setFormData({ ...formData });
        setSelectedDeliveredByUsers([...selectedDeliveredByUsers]);
      }
      if (localStorage.getItem("store_id")) {
        formData.store_id = localStorage.getItem("store_id");
        formData.store_name = localStorage.getItem("store_name");
      }

      setFormData({ ...formData });
      if (id) {
        getQuotation(id);
      } else {
        getStore(localStorage.getItem("store_id"));
      }

      getStore(localStorage.getItem("store_id"));

      SetShow(true);
    },
  }));




  let [store, setStore] = useState({});

  function getStore(id) {
    console.log("inside get Store");
    const requestOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': localStorage.getItem('access_token'),
      },
    };

    fetch('/v1/store/' + id, requestOptions)
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
        let storeData = data.result;
        if (storeData.default_quotation_validity_days) {
          formData.validity_days = storeData.default_quotation_validity_days;
        }

        if (storeData.default_quotation_delivery_days) {
          formData.delivery_days = storeData.default_quotation_delivery_days;
        }

        setFormData(formData);

        store = data.result;
        setStore(store);

      })
      .catch(error => {

      });
  }

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
    type: "quotation",
    payment_status: "",
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
      // history.push("/dashboard/quotations");
      window.location = "/";
    }
  });


  let [warnings, setWarnings] = useState({});

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

  function getQuotation(id) {
    console.log("inside get Quotation");
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

        if (data.result?.discount) {
          discount = data.result?.discount;
          setDiscount(discount);
        }

        if (data.result?.discount_with_vat) {
          discountWithVAT = data.result?.discount_with_vat;
          setDiscountWithVAT(discountWithVAT);
        }

        if (data.result?.discount_percent) {
          discountPercent = data.result?.discount_percent;
          setDiscountPercent(discountPercent);
        }

        if (data.result?.shipping_handling_fees) {
          shipping = data.result?.shipping_handling_fees;
          setShipping(shipping);
        }


        formData = {
          id: quotation.id,
          type: quotation.type,
          order_id: quotation.order_id,
          order_code: quotation.order_code,
          payment_status: quotation.payment_status,
          code: quotation.code,
          store_id: quotation.store_id,
          customer_id: quotation.customer_id,
          // date_str: quotation.date_str,
          date: quotation.date,
          vat_percent: quotation.vat_percent,
          discount: quotation.discount,
          cash_discount: quotation.cash_discount,
          discount_with_vat: quotation.discount_with_vat,
          discount_percent: quotation.discount_percent,
          discount_percent_vat: quotation.discount_percent_with_vat,
          status: quotation.status,
          delivered_by: quotation.delivered_by,
          delivered_by_signature_id: quotation.delivered_by_signature_id,
          is_discount_percent: quotation.is_discount_percent,
          shipping_handling_fees: quotation.shipping_handling_fees,
          delivery_days: quotation.delivery_days ? quotation.delivery_days : 7,
          validity_days: quotation.validity_days ? quotation.validity_days : 2,
        };
        formData.date_str = data.result.date;

        if (data.result?.payments) {
          console.log("data.result.payments:", data.result.payments);
          formData.payments_input = data.result?.payments;
          for (var i = 0; i < formData.payments_input?.length; i++) {
            formData.payments_input[i].date_str = formData.payments_input[i].date
          }
        }


        if (formData.is_discount_percent) {
          formData.discountValue = formData.discount_percent;
        } else {
          formData.discountValue = formData.discount;
        }

        selectedProducts = quotation.products;
        setSelectedProducts([...selectedProducts]);


        if (quotation.customer_id && quotation.customer?.name) {
          let selectedCustomers = [
            {
              id: quotation.customer_id,
              name: quotation.customer.name,
              search_label: quotation.customer.search_label,
            },
          ];
          setSelectedCustomers([...selectedCustomers]);
        }


        let selectedDeliveredByUsers = [
          {
            id: quotation.delivered_by,
            name: quotation.delivered_by_name,
          },
        ];


        setSelectedDeliveredByUsers([...selectedDeliveredByUsers]);


        setFormData({ ...formData });

        checkWarnings();
        checkErrors();
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

    let Select =
      "select=id,code,vat_no,name,phone,name_in_arabic,phone_in_arabic,search_label";
    // setIsCustomersLoading(true);
    let result = await fetch(
      "/v1/customer?" + Select + queryString,
      requestOptions
    );
    let data = await result.json();

    setCustomerOptions(data.result);
    //setIsCustomersLoading(false);
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

      //setIsProductsLoading(false);
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

    let Select = `select=id,set.name,item_code,prefix_part_number,country_name,brand_name,part_number,name,unit,name_in_arabic,product_stores.${localStorage.getItem('store_id')}.purchase_unit_price,product_stores.${localStorage.getItem('store_id')}.retail_unit_price,product_stores.${localStorage.getItem('store_id')}.stock,product_stores.${localStorage.getItem('store_id')}.with_vat`;
    //setIsProductsLoading(true);
    let result = await fetch(
      "/v1/product?" + Select + queryString + "&limit=50&sort=-country_name",
      requestOptions
    );
    let data = await result.json();

    let products = data.result;
    if (!products || products.length === 0) {
      openProductSearchResult = false;
      setOpenProductSearchResult(false);
      //setIsProductsLoading(false);
      return;
    }

    openProductSearchResult = true;
    setOpenProductSearchResult(true);
    /*
    const sortedProducts = products
      .filter(item => item.country_name)                        // Keep only items with name
      .sort((a, b) => a.country_name.localeCompare(b.country_name))     // Sort alphabetically
      .concat(products.filter(item => !item.country_name));*/

    setProductOptions(products);
    //setIsProductsLoading(false);
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

    let Select =
      "select=id,item_code,bar_code,ean_12,part_number,name,product_stores,unit,part_number,name_in_arabic";

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
      errors["bar_code"] = "Invalid Barcode:" + formData.barcode;
      setErrors({ ...errors });
    }

    formData.barcode = "";
    setFormData({ ...formData });
  }


  function handleCreate(event) {
    event.preventDefault();
    let haveErrors = false;

    console.log("Inside handle Create");
    console.log("selectedProducts:", selectedProducts);
    if (formData.type === "quotation") {
      formData.payment_status = ""
    }

    if (discount) {
      formData.discount = discount;
    } else {
      formData.discount = 0;
    }

    if (discountWithVAT) {
      formData.discount_with_vat = discountWithVAT;
    } else {
      formData.discountWithVAT = 0;
    }

    if (discountPercent) {
      formData.discount_percent = discountPercent;
    } else {
      formData.discount_percent = 0;
    }

    if (discountPercentWithVAT) {
      formData.discount_percent_with_vat = discountPercentWithVAT;
    } else {
      formData.discount_percent_with_vat = 0;
    }


    formData.products = [];
    for (var i = 0; i < selectedProducts.length; i++) {

      let unitPrice = parseFloat(selectedProducts[i].unit_price);

      /*
      if (unitPrice && /^\d*\.?\d{0,2}$/.test(unitPrice) === false) {
        errors["unit_price_" + i] = "Max decimal points allowed is 2";
        setErrors({ ...errors });
        haveErrors = true;
      }*/

      let unitPriceWithVAT = parseFloat(selectedProducts[i].unit_price_with_vat);

      if (unitPriceWithVAT && /^\d*\.?\d{0,2}$/.test(unitPriceWithVAT) === false) {
        errors["unit_price_with_vat_" + i] = "Max decimal points allowed is 2";
        setErrors({ ...errors });
        haveErrors = true;
      }


      let unitDiscount = 0.00;


      if (selectedProducts[i].unit_discount) {
        unitDiscount = parseFloat(selectedProducts[i].unit_discount)
        /*
        if (/^\d*\.?\d{0,2}$/.test(unitDiscount) === false) {
          errors["unit_discount_" + i] = "Max decimal points allowed is 2";
          setErrors({ ...errors });
          haveErrors = true;
        }*/
      }

      let unitDiscountWithVAT = 0.00;

      if (selectedProducts[i].unit_discount_with_vat) {
        unitDiscountWithVAT = parseFloat(selectedProducts[i].unit_discount_with_vat)
        if (/^\d*\.?\d{0,2}$/.test(unitDiscountWithVAT) === false) {
          errors["unit_discount_with_vat_" + i] = "Max decimal points allowed is 2";
          setErrors({ ...errors });
          haveErrors = true;
        }
      }

      /* let unitDiscountPercent = 0.00;
 
       if (selectedProducts[i].unit_discount_percent) {
         // unitDiscountPercent = parseFloat(selectedProducts[i].unit_discount_percent)
         
         if (/^\d*\.?\d{0,2}$/.test(unitDiscountPercent) === false) {
           errors["unit_discount_percent_" + i] = "Max decimal points allowed is 2";
           setErrors({ ...errors });
           haveErrors = true;
         }
       }*/



      formData.products.push({
        product_id: selectedProducts[i].product_id,
        name: selectedProducts[i].name,
        quantity: parseFloat(selectedProducts[i].quantity),
        unit_price: unitPrice ? unitPrice : 0.00,
        unit_price_with_vat: selectedProducts[i].unit_price_with_vat ? selectedProducts[i].unit_price_with_vat : 0.00,
        purchase_unit_price: selectedProducts[i].purchase_unit_price ? parseFloat(selectedProducts[i].purchase_unit_price) : 0,
        purchase_unit_price_with_vat: selectedProducts[i].purchase_unit_price ? parseFloat(selectedProducts[i].purchase_unit_price_with_vat) : 0,
        unit_discount: unitDiscount,
        unit_discount_with_vat: unitDiscountWithVAT,
        unit_discount_percent: selectedProducts[i].unit_discount_percent ? parseFloat(selectedProducts[i].unit_discount_percent) : 0,
        unit_discount_percent_with_vat: selectedProducts[i].unit_discount_percent_with_vat ? parseFloat(selectedProducts[i].unit_discount_percent_with_vat) : 0,
        unit: selectedProducts[i].unit,
      });
    }



    delete errors["products"];
    setErrors({ ...errors });

    if (formData.products.length === 0) {
      errors["products"] = "No products added";
      setErrors({ ...errors });
      haveErrors = true;
    }

    if (formData.type === "invoice") {
      if (!validatePaymentAmounts()) {
        console.log("Errors on payments")
        haveErrors = true;
      }
    }


    if (!formData.shipping_handling_fees && formData.shipping_handling_fees !== 0) {
      errors["shipping_handling_fees"] = "Invalid shipping / handling fees";
      setErrors({ ...errors });
      haveErrors = true;
    }

    if (parseFloat(formData.shipping_handling_fees) < 0) {
      errors["shipping_handling_fees"] = "shipping cost should not be < 0";
      setErrors({ ...errors });
      haveErrors = true;
    }

    if (/^\d*\.?\d{0,2}$/.test(parseFloat(formData.shipping_handling_fees)) === false) {
      errors["shipping_handling_fees"] = "Max. decimal points allowed is 2";
      setErrors({ ...errors });
      haveErrors = true;
    }

    if (/^\d*\.?\d{0,2}$/.test(parseFloat(formData.discount)) === false) {
      errors["discount"] = "Max. decimal points allowed is 2";
      setErrors({ ...errors });
      haveErrors = true;
    }

    if (parseFloat(formData.discount) < 0) {
      errors["discount"] = "discount should not be < 0";
      setErrors({ ...errors });
      haveErrors = true;
    }


    if (!formData.discount_percent && formData.discount_percent !== 0) {
      errors["discount_percent"] = "Invalid discount percent";
      setErrors({ ...errors });
      haveErrors = true;
    }

    if (parseFloat(formData.discount_percent) > 100) {
      errors["discount_percent"] = "Discount percent cannot be > 100";
      setErrors({ ...errors });
      haveErrors = true;
    }

    if (!formData.vat_percent && formData.vat_percent !== 0) {
      errors["vat_percent"] = "Invalid vat percent";
      setErrors({ ...errors });
      haveErrors = true;
    }

    if (haveErrors) {
      console.log("Errors: ", errors);
      return;
    }



    formData.discount = parseFloat(formData.discount);
    formData.discount_percent = parseFloat(formData.discount_percent);
    formData.vat_percent = parseFloat(formData.vat_percent);
    formData.net_total = parseFloat(formData.net_total);
    formData.balance_amount = parseFloat(balanceAmount);


    if (localStorage.getItem("store_id")) {
      formData.store_id = localStorage.getItem("store_id");
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
          if (props.showToastMessage) props.showToastMessage("Quotation updated successfully!", "success");
        } else {
          if (props.showToastMessage) props.showToastMessage("Quotation created successfully!", "success");
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
        if (props.showToastMessage) props.showToastMessage("Failed to process quotation!", "danger");
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
      formData.store_id = localStorage.getItem("store_id");
    }

    delete errors["product_id"];
    if (!product) {
      errors.product_id = "Invalid Product";
      setErrors({ ...errors });
      console.log("Invalid product:", product);
      return false;
    }

    // console.log("product:", product);
    if (product.product_stores && product.product_stores[formData.store_id]?.retail_unit_price) {
      if (product.product_stores[formData.store_id].with_vat) {
        product.unit_price = parseFloat(trimTo2Decimals(product.product_stores[formData.store_id].retail_unit_price / (1 + (formData.vat_percent / 100))));
        product.unit_price_with_vat = product.product_stores[formData.store_id].retail_unit_price;
      } else {
        product.unit_price = product.product_stores[formData.store_id].retail_unit_price;
        product.unit_price_with_vat = parseFloat(trimTo2Decimals(product.product_stores[formData.store_id].retail_unit_price * (1 + (formData.vat_percent / 100))));
      }
    }

    if (product.product_stores && product.product_stores[formData.store_id]?.purchase_unit_price) {
      if (product.product_stores[formData.store_id].with_vat) {
        product.purchase_unit_price = parseFloat(trimTo2Decimals(product.product_stores[formData.store_id].purchase_unit_price / (1 + (formData.vat_percent / 100))));
        product.purchase_unit_price_with_vat = product.product_stores[formData.store_id].purchase_unit_price;
      } else {
        product.purchase_unit_price = product.product_stores[formData.store_id].purchase_unit_price;
        product.purchase_unit_price_with_vat = parseFloat(trimTo2Decimals(product.product_stores[formData.store_id].purchase_unit_price * (1 + (formData.vat_percent / 100))));
      }
    }


    if (product.product_stores && product.product_stores[formData.store_id]) {
      product.unit_discount = 0.00;
      product.unit_discount_with_vat = 0.00;
      product.unit_discount_percent = 0.00;
      product.unit_discount_percent_with_vat = 0.00;
    }


    delete errors["unit_price"];
    if (!product.unit_price) {
      product["unit_price"] = 0.00;
    }

    if (!product.purchase_unit_price) {
      product["purchase_unit_price"] = 0.00;
    }

    if (!product.purchase_unit_price_with_vat) {
      product["purchase_unit_price_with_vat"] = 0.00;
    }

    if (!product.unit_price_with_vat) {
      product["unit_price_with_vat"] = 0.00;
    }

    let alreadyAdded = false;
    let index = false;
    let quantity = 0.00;

    if (!product.quantity) {
      product.quantity = 1.00;
    }

    if (!product.id && product.product_id) {
      product.id = product.product_id
    }



    if (isProductAdded(product.id)) {
      alreadyAdded = true;
      index = getProductIndex(product.id);
      quantity = parseFloat(selectedProducts[index].quantity + product.quantity);
      if (product.unit_price) {
        selectedProducts[index].unit_price = product.unit_price;
        selectedProducts[index].unit_price_with_vat = product.unit_price_with_vat;
      }

      if (product.unit_discount) {
        selectedProducts[index].unit_discount = product.unit_discount;
        //selectedProducts[index].unit_discount = product.unit_discount_percent;
      }
      if (product.unit_discount_with_vat) {
        selectedProducts[index].unit_discount_with_vat = product.unit_discount_with_vat;
        //selectedProducts[index].unit_discount = product.unit_discount_percent;
      }

    } else {
      quantity = parseFloat(product.quantity);
    }

    console.log("quantity:", quantity);

    delete errors["quantity"];

    //let stock = GetProductStockInStore(formData.store_id, product.stores);
    let stock = 0;

    if (product.product_stores && product.product_stores[formData.store_id]?.stock) {
      stock = product.product_stores[formData.store_id].stock;
    }

    if (product.product_stores && stock < quantity) {
      if (index === false) {
        index = selectedProducts.length;
      }
      // errors["quantity_" + index] = "Stock is only " + stock + " in Store: " + formData.store_name + " for product: " + product.name;
      errors["quantity_" + index] = "Warning: Available stock is " + stock
      console.log("errors:", errors);
      setErrors({ ...errors });
    }


    delete errors["purchase_unit_price_" + index];
    if (product.purchase_unit_price > product.unit_price) {
      errors["purchase_unit_price_" + index] = "Warning: Purchase unit price is greater than Unit Price(without VAT)"
      console.log("errors:", errors);
    }
    setErrors({ ...errors });


    if (alreadyAdded) {
      selectedProducts[index].quantity = parseFloat(quantity);
    }

    if (!alreadyAdded) {
      selectedProducts.push({
        product_id: product.id,
        code: product.item_code,
        prefix_part_number: product.prefix_part_number,
        part_number: product.part_number,
        name: product.name,
        quantity: product.quantity,
        product_stores: product.product_stores,
        unit_price: product.unit_price,
        unit_price_with_vat: product.unit_price_with_vat,
        unit: product.unit ? product.unit : "",
        purchase_unit_price: product.purchase_unit_price,
        purchase_unit_price_with_vat: product.purchase_unit_price_with_vat,
        unit_discount: product.unit_discount,
        unit_discount_with_vat: product.unit_discount_with_vat,
        unit_discount_percent: product.unit_discount_percent,
        unit_discount_percent_vat: product.unit_discount_percent_with_vat,

      });
      console.log("Product added")
    }
    setSelectedProducts([...selectedProducts]);
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {

      checkWarnings(index);
      checkErrors(index);
      reCalculate(index);
    }, 100);
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
      removeWarningAndError(index);
    }
    setSelectedProducts([...selectedProducts]);

    reCalculate();
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


  let [deliveryDays, setDeliveryDays] = useState(7);
  let [validityDays, setValidityDays] = useState(2);


  const renderTooltip = (props) => (
    <Tooltip id="label-tooltip" {...props}>
      Total(without VAT) + Shipping & Handling Fees - Discount(without VAT)
      {"(" + trimTo2Decimals(formData.total) + " + " + trimTo2Decimals(shipping) + " - " + trimTo2Decimals(discount) + ") = " + trimTo2Decimals(formData.total + shipping - discount)}
    </Tooltip>
  );

  const renderNetTotalTooltip = (props) => (
    <Tooltip id="label-tooltip" {...props}>
      Total Taxable Amount(without VAT) + VAT Price ( 15% of Taxable Amount)
      {"(" + trimTo2Decimals(formData.total + shipping - discount) + " + " + trimTo2Decimals(formData.vat_price) + ") = " + trimTo2Decimals(formData.net_total)}
    </Tooltip>
  );

  let [shipping, setShipping] = useState(0.00);
  let [discount, setDiscount] = useState(0.00);
  let [discountPercent, setDiscountPercent] = useState(0.00);

  let [discountWithVAT, setDiscountWithVAT] = useState(0.00);
  let [discountPercentWithVAT, setDiscountPercentWithVAT] = useState(0.00);


  async function reCalculate(productIndex) {
    console.log("inside reCalculate");

    if (!discountWithVAT) {
      formData.discount_with_vat = 0
    } else {
      formData.discount_with_vat = discountWithVAT;
    }

    if (!discount) {
      formData.discount = 0;
    } else {
      formData.discount = discount;
    }

    if (!discountPercent) {
      formData.discount_percent = 0;
    } else {
      formData.discount_percent = discountPercent;
    }

    if (!discountPercentWithVAT) {
      formData.discount_percent_with_vat = 0;
    } else {
      formData.discount_percent_with_vat = discountPercentWithVAT;
    }


    if (!shipping) {
      formData.shipping_handling_fees = 0;
    } else {
      formData.shipping_handling_fees = shipping;
    }



    formData.products = [];
    for (var i = 0; i < selectedProducts.length; i++) {

      let unitPrice = parseFloat(selectedProducts[i].unit_price);
      console.log("unitPrice:", unitPrice);
      console.log("selectedProducts[i].unit_price_with_vat:", selectedProducts[i].unit_price_with_vat);


      let unitPriceWithVAT = parseFloat(selectedProducts[i].unit_price_with_vat);
      /*
      if (unitPrice && /^\d*\.?\d{0,2}$/.test(unitPrice) === false) {
          errors["unit_price_" + i] = "Max decimal points allowed is 2 - WIITHOUT VAT";
          setErrors({ ...errors });
          return;
 
      }
 
    
 
 
      if (unitPriceWithVAT && /^\d*\.?\d{0,2}$/.test(unitPriceWithVAT) === false) {
          errors["unit_price_with_vat" + i] = "Max decimal points allowed is 2 - WITH VAT";
          setErrors({ ...errors });
          return;
 
      }*/



      let unitDiscount = 0.00;

      if (selectedProducts[i].unit_discount) {
        unitDiscount = parseFloat(selectedProducts[i].unit_discount)
        /*
        if (/^\d*\.?\d{0,2}$/.test(unitDiscount) === false) {
            errors["unit_discount_" + i] = "Max decimal points allowed is 2";
            setErrors({ ...errors });
            return;
        }*/
      }

      let unitDiscountWithVAT = 0.00;

      if (selectedProducts[i].unit_discount_with_vat) {
        unitDiscountWithVAT = parseFloat(selectedProducts[i].unit_discount_with_vat)
        /*
        if (/^\d*\.?\d{0,2}$/.test(unitDiscount) === false) {
            errors["unit_discount_" + i] = "Max decimal points allowed is 2";
            setErrors({ ...errors });
            return;
        }*/
      }


      formData.products.push({
        product_id: selectedProducts[i].product_id,
        quantity: parseFloat(selectedProducts[i].quantity),
        unit_price: unitPrice ? unitPrice : 0.00,
        unit_price_with_vat: unitPriceWithVAT ? unitPriceWithVAT : 0.00,
        purchase_unit_price: selectedProducts[i].purchase_unit_price ? parseFloat(selectedProducts[i].purchase_unit_price) : 0,
        purchase_unit_price_with_vat: selectedProducts[i].purchase_unit_price_with_vat ? parseFloat(selectedProducts[i].purchase_unit_price_with_vat) : 0,
        unit_discount: unitDiscount,
        unit_discount_with_vat: unitDiscountWithVAT,
        unit_discount_percent: selectedProducts[i].unit_discount_percent ? parseFloat(selectedProducts[i].unit_discount_percent) : 0,
        unit_discount_percent_with_vat: selectedProducts[i].unit_discount_percent_with_vat ? parseFloat(selectedProducts[i].unit_discount_percent_with_vat) : 0,
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

    let result;
    try {
      result = await fetch(
        "/v1/quotation/calculate-net-total",
        requestOptions
      );
      console.log("Done")
      if (!result.ok) {
        return;
      }


      let res = await result.json();
      if (res.result) {
        formData.total = res.result.total;
        formData.total_with_vat = res.result.total_with_vat;
        formData.net_total = res.result.net_total;
        formData.vat_price = res.result.vat_price;

        if (res.result.discount_percent) {
          discountPercent = res.result.discount_percent;
          setDiscountPercent(discountPercent);
        }


        if (res.result.discount_percent_with_vat) {
          discountPercentWithVAT = res.result.discount_percent_with_vat;
          setDiscountPercentWithVAT(discountPercentWithVAT);
        }

        if (res.result.discount) {
          discount = res.result.discount;
          setDiscount(discount);
        }

        if (res.result.discount_with_vat) {
          discountWithVAT = res.result.discount_with_vat;
          setDiscountWithVAT(discountWithVAT);
        }

        if (res.result.shipping_handling_fees) {
          formData.shipping_handling_fees = res.result.shipping_handling_fees;
        }


        for (let i = 0; i < selectedProducts?.length; i++) {
          for (let j = 0; j < res.result?.products?.length; j++) {
            if (res.result?.products[j].product_id === selectedProducts[i].product_id) {

              /*
              if (res.result?.products[j].unit_discount_percent) {
                selectedProducts[i].unit_discount_percent = res.result?.products[j].unit_discount_percent;
              }

              if (res.result?.products[j].unit_discount_percent_with_vat) {
                selectedProducts[i].unit_discount_percent_with_vat = res.result?.products[j].unit_discount_percent_with_vat;
              }

              if (res.result?.products[j].unit_discount) {
                selectedProducts[i].unit_discount = res.result?.products[j].unit_discount;
              }


              if (res.result?.products[j].unit_price) {
                selectedProducts[i].unit_price = res.result?.products[j].unit_price;
              }

              if (res.result?.products[j].unit_price_with_vat) {
                selectedProducts[i].unit_price_with_vat = res.result?.products[j].unit_price_with_vat;
              }*/

              console.log("Discounts updated from server")
            }
          }
        }
        setSelectedProducts([...selectedProducts]);
        /*
            selectedProducts[index].unit_discount_percent
            selectedProducts = formData.products;
            setSelectedProducts([...selectedProducts]);
        */
      }

      setFormData({ ...formData });

      if (!formData.id && formData.type === "invoice") {
        let method = "";
        if (formData.payments_input && formData.payments_input[0]) {
          method = formData.payments_input[0].method;
        }

        formData.payments_input = [{
          "date_str": formData.date_str,
          "amount": 0.00,
          "method": method,
          "deleted": false,
        }];

        if (formData.net_total > 0) {
          formData.payments_input[0].amount = parseFloat(trimTo2Decimals(formData.net_total));
          if (formData.cash_discount) {
            formData.payments_input[0].amount = formData.payments_input[0].amount - parseFloat(trimTo2Decimals(formData.cash_discount));
          }
          formData.payments_input[0].amount = parseFloat(trimTo2Decimals(formData.payments_input[0].amount));
        }
      }
      findTotalPayments();
      setFormData({ ...formData });
      validatePaymentAmounts();

    } catch (err) {
      console.error("Failed to parse response:", err);
    }
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


  const PreviewRef = useRef();
  function openPreview() {
    let model = formData;
    model.products = selectedProducts;
    model.date = formData.date_str;
    model.code = formData.code;
    if (!formData.code) {
      formData.code = Math.floor(10000 + Math.random() * 90000).toString();;
    }
    PreviewRef.current.open(model, undefined, "quotation");
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
  };*/

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
      props.onSelectProducts(newlySelectedProducts, selectedCustomers, "quotation", formData.id, formData.code); // Send to parent
    }

    handleClose();
  };



  function openProducts() {
    ProductsRef.current.open();
  }


  const handleSelectedProductsToQuotation = (selected) => {
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


  function validatePhoneNumber(input) {
    // Remove everything except digits and plus
    let s = input.trim().replace(/[^\d+]/g, "");

    if (s.startsWith("+")) {
      // International number: must be + followed by 6 to 15 digits
      return /^\+\d{6,15}$/.test(s);
    } else if (s.startsWith("05")) {
      // Saudi local number: must be 05 followed by 8 digits
      return /^05\d{8}$/.test(s);
    } else {
      return false;
    }
  }

  function sendWhatsAppMessage() {
    let model = formData;
    model.products = selectedProducts;
    model.date = formData.date_str;

    if (!formData.code) {
      formData.code = Math.floor(10000 + Math.random() * 90000).toString();;
      model.code = formData.code;
    }
    delete errors["phone"];
    setErrors({ ...errors });

    if (model.phone) {
      if (!validatePhoneNumber(model.phone)) {
        errors["phone"] = "Invalid phone no."
        setErrors({ ...errors });
        return;
      }
    }

    PreviewRef.current.open(model, "whatsapp", "quotation");
  }


  function moveToProductQuantityInputBox() {
    setTimeout(() => {
      let index = (selectedProducts.length - 1);
      const input = document.getElementById('quotation_product_quantity_' + index);
      input?.focus();

    }, 500);
  }

  function moveToProductSearch() {
    setTimeout(() => {
      productSearchRef.current?.focus();
    }, 500);
  }

  const timerRef = useRef(null);

  const productSearchRef = useRef();


  const inputRefs = useRef({});


  function validatePaymentAmounts() {
    if (formData.type !== "invoice") {
      return true;
    }
    console.log("validatePaymentAmount: formData.net_total:", formData.net_total)
    delete errors["cash_discount"];
    setErrors({ ...errors });

    let haveErrors = false;
    if (!formData.net_total) {
      /*
      removePayment(0, false);
      totalPaymentAmount = 0.0;
      setTotalPaymentAmount(0.00);
      balanceAmount = 0.00;
      setBalanceAmount(0.00);
      paymentStatus = "";
      setPaymentStatus(paymentStatus);
      */
      return true;
    }


    if (formData.cash_discount > 0 && formData.cash_discount >= formData.net_total) {
      errors["cash_discount"] = "Cash discount should not be >= " + trimTo2Decimals(formData.net_total).toString();
      setErrors({ ...errors });
      haveErrors = true
      return false;
    }



    // errors["payment_date"] = [];
    //errors["payment_method"] = [];
    //errors["payment_amount"] = [];
    for (var key = 0; key < formData.payments_input?.length; key++) {
      delete errors["payment_amount_" + key];
      delete errors["payment_date_" + key];
      delete errors["payment_method_" + key];
      setErrors({ ...errors });

      if (!formData.payments_input[key].amount) {
        errors["payment_amount_" + key] = "Payment amount is required";
        setErrors({ ...errors });
        haveErrors = true;
      } else if (formData.payments_input[key].amount === 0) {
        errors["payment_amount_" + key] = "Amount should be greater than zero";
        setErrors({ ...errors });
        haveErrors = true;
      }

      if (!formData.payments_input[key].date_str) {
        errors["payment_date_" + key] = "Payment date is required";
        setErrors({ ...errors });
        haveErrors = true;
      } /* else if ((new Date(formData.payments_input[key].date_str)) < (new Date(formData.date_str))) {
                  errors["payment_date_" + key] = "Payment date time should be greater than or equal to order date time";
                  setErrors({ ...errors });
                  haveErrors = true;
              }*/


      if (!formData.payments_input[key].method) {
        errors["payment_method_" + key] = "Payment method is required";
        setErrors({ ...errors });
        haveErrors = true;
      }
    }

    findTotalPayments();

    if (haveErrors) {
      return false;
    }

    return true;
  }

  function findTotalPayments() {
    console.log("Inisde findTotalPayments")
    let totalPayment = 0.00;
    for (var i = 0; i < formData.payments_input?.length; i++) {
      if (formData.payments_input[i].amount && !formData.payments_input[i].deleted) {
        totalPayment += formData.payments_input[i].amount;
      }
    }

    totalPaymentAmount = totalPayment;
    console.log("totalPaymentAmount:", totalPaymentAmount);
    setTotalPaymentAmount(totalPaymentAmount);
    console.log("totalPayment:", totalPayment)
    balanceAmount = (parseFloat(trimTo2Decimals(formData.net_total)) - parseFloat(parseFloat(trimTo2Decimals(formData.cash_discount)))) - parseFloat(trimTo2Decimals(totalPayment));
    balanceAmount = parseFloat(trimTo2Decimals(balanceAmount));
    setBalanceAmount(balanceAmount);

    if (balanceAmount === parseFloat((parseFloat(trimTo2Decimals(formData.net_total)) - parseFloat(trimTo2Decimals(formData.cash_discount))))) {
      paymentStatus = "not_paid"
    } else if (balanceAmount <= 0) {
      paymentStatus = "paid"
    } else if (balanceAmount > 0) {
      paymentStatus = "paid_partially"
    }

    setPaymentStatus(paymentStatus);

    return totalPayment;
  }

  function addNewPayment() {
    let date = new Date();
    if (!formData.id) {
      date = formData.date_str;
    }

    if (!formData.payments_input) {
      formData.payments_input = [];
    }

    formData.payments_input.push({
      "date_str": date,
      // "amount": "",
      "amount": 0.00,
      "method": "",
      "deleted": false,
    });
    setFormData({ ...formData });
    validatePaymentAmounts();
    //validatePaymentAmounts((formData.payments_input.filter(payment => !payment.deleted).length - 1));
  }


  let [totalPaymentAmount, setTotalPaymentAmount] = useState(0.00);
  let [balanceAmount, setBalanceAmount] = useState(0.00);
  let [paymentStatus, setPaymentStatus] = useState("");



  function removePayment(key, validatePayments = false) {
    formData.payments_input.splice(key, 1);
    //formData.payments_input[key]["deleted"] = true;
    setFormData({ ...formData });
    if (validatePayments) {
      validatePaymentAmounts();
    }
    findTotalPayments()
  }
  function RunKeyActions(event, product) {
    if (event.key === "F10") {
      openLinkedProducts(product);
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
    }
  }


  const ProductDetailsViewRef = useRef();
  function openProductDetails(id) {
    ProductDetailsViewRef.current.open(id);
  }


  const customerSearchRef = useRef();


  const SalesRef = useRef();
  function openSales() {
    SalesRef.current.open(selectedCustomers);
  }

  const handleSelectedSale = (selectedSale) => {

    if (formData.customer_id !== selectedSale.customer_id) {
      infoMessage = "The selected sale is not belongs to the customer " + selectedCustomers[0]?.name;
      setInfoMessage(infoMessage);
      showInfo = true;
      setShowInfo(showInfo);
      return;
    }

    formData.order_id = selectedSale.id;
    formData.order_code = selectedSale.code;
    setFormData({ ...formData });
  };

  let [showInfo, setShowInfo] = useState(false);
  let [infoMessage, setInfoMessage] = useState("");



  function removeWarningAndError(i) {
    delete warnings["quantity_" + i];
    delete errors["quantity_" + i];
    delete errors["purchase_unit_price_" + i];
    delete warnings["purchase_unit_price_" + i];
    delete warnings["unit_price_" + i];
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
    console.log("INSIDE CHECK ERROR");

    if (selectedProducts[i].quantity && selectedProducts[i].quantity <= 0) {
      errors["quantity_" + i] = "Quantity should be > 0";
    } else if (!selectedProducts[i].quantity) {
      errors["quantity_" + i] = "Quantity is required";
    } else {
      delete errors["quantity_" + i];
    }


    if (selectedProducts[i].unit_price && selectedProducts[i].unit_price <= 0) {
      errors["unit_price_" + i] = "Unit Price should be > 0";
    } else if (!selectedProducts[i].unit_price) {
      errors["unit_price_" + i] = "Unit Price is required";
    } else {
      delete errors["unit_price_" + i];
    }


    if (store.block_sale_when_purchase_price_is_higher) {
      if (selectedProducts[i].purchase_unit_price && selectedProducts[i].purchase_unit_price <= 0) {
        errors["purchase_unit_price_" + i] = "Purchase Unit Price should be > 0";
      } else if (!selectedProducts[i].purchase_unit_price) {
        errors["purchase_unit_price_" + i] = "Purchase Unit Price is required";
      } else {
        delete errors["purchase_unit_price_" + i];
      }
    }



    if (selectedProducts[i].purchase_unit_price > 0 && selectedProducts[i].unit_price > 0) {

      if (selectedProducts[i].purchase_unit_price > selectedProducts[i].unit_price) {
        errors["purchase_unit_price_" + i] = "Purchase Unit Price should not be greater than Unit Price(without VAT)"
        errors["unit_price_" + i] = "Unit price should not be less than Purchase Unit Price(without VAT)"
      } else {
        delete errors["purchase_unit_price_" + i];
        delete errors["unit_price_" + i];
      }
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


  async function checkWarning(i) {
    let product = await getProduct(selectedProducts[i].product_id);
    let stock = 0;

    if (product.product_stores && product.product_stores[localStorage.getItem("store_id")]?.stock) {
      stock = product.product_stores[localStorage.getItem("store_id")].stock;
    }

    let oldQty = 0;
    for (let j = 0; j < formData.products?.length; j++) {
      if (formData.products[j].product_id === selectedProducts[j].product_id) {
        oldQty = formData.products[j].quantity;
        break;
      }
    }

    if (product.product_stores && (stock + oldQty) < selectedProducts[i].quantity) {
      warnings["quantity_" + i] = "Warning: Available stock is " + (stock + oldQty);
    } else {
      delete warnings["quantity_" + i];
    }
    setWarnings({ ...warnings });
  }

  function openUpdateProductForm(id) {
    ProductCreateFormRef.current.open(id);
  }

  const imageViewerRef = useRef();
  let [productImages, setProductImages] = useState([]);

  async function openProductImages(id) {
    let product = await getProduct(id);
    productImages = product?.images;
    setProductImages(productImages);
    imageViewerRef.current.open(0);
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

  return (
    <>
      <ImageViewerModal ref={imageViewerRef} images={productImages} />
      <InfoDialog
        show={showInfo}
        message={infoMessage}
        onClose={() => setShowInfo(false)}
      />
      <Sales ref={SalesRef} onSelectSale={handleSelectedSale} showToastMessage={props.showToastMessage} />
      <Customers ref={CustomersRef} onSelectCustomer={handleSelectedCustomer} showToastMessage={props.showToastMessage} />
      <Products ref={ProductsRef} onSelectProducts={handleSelectedProductsToQuotation} showToastMessage={props.showToastMessage} />
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

      <Preview ref={PreviewRef} />
      <ProductView
        ref={ProductDetailsViewRef}
        openUpdateForm={openProductUpdateForm}
        openCreateForm={openProductCreateForm}
      />
      <ProductCreate
        ref={ProductCreateFormRef}
        showToastMessage={props.showToastMessage}
        openDetailsView={openProductDetails}
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
            <div className="row">
              <div className="col-md-2">
                <label className="form-label">Type*</label>

                <div className="input-group mb-3">
                  <select
                    value={formData.type}
                    onChange={(e) => {
                      console.log("Inside onchange payment method");
                      if (!e.target.value) {
                        formData.type = "";
                        errors["type"] = "Invalid type";
                        setErrors({ ...errors });
                        return;
                      }

                      delete errors["type"];
                      setErrors({ ...errors });

                      formData.type = e.target.value;
                      if (formData.type === "quotation") {
                        formData.payment_status = "";
                      } else if (formData.type === "invoice") {
                        formData.payment_status = "credit";
                      }
                      setFormData({ ...formData });
                      console.log(formData);
                    }}
                    className="form-control"
                  >
                    <option value="quotation" SELECTED>Quotation</option>
                    <option value="invoice">Invoice</option>

                  </select>
                </div>
                {errors.type && (
                  <div style={{ color: "red" }}>
                    {errors.type}
                  </div>
                )}
              </div>
            </div>

            <div className="col-md-6">
              <label className="form-label">Customer</label>
              <Typeahead
                id="customer_id"
                labelKey="search_label"
                filterBy={store?.client_filter ? undefined : () => true}
                isLoading={false}
                onChange={(selectedItems) => {
                  delete errors["customer_id"];
                  setErrors(errors);
                  if (selectedItems.length === 0) {
                    delete errors["customer_id"];
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
                ref={customerSearchRef}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setCustomerOptions([]);
                    customerSearchRef.current?.clear();
                  }
                }}

                onInputChange={(searchTerm, e) => {
                  formData.customerName = searchTerm;
                  if (searchTerm) {
                    formData.customer_name = searchTerm;
                  }
                  setFormData({ ...formData });
                  if (timerRef.current) clearTimeout(timerRef.current);
                  timerRef.current = setTimeout(() => {
                    suggestCustomers(searchTerm);
                  }, 400);
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
                  id="quotation_phone"
                  name="quotation_phone"
                  value={formData.phone ? formData.phone : ""}
                  type='string'
                  onChange={(e) => {
                    delete errors["phone"];
                    setErrors({ ...errors });
                    formData.phone = e.target.value;
                    setFormData({ ...formData });
                    console.log(formData);
                  }}
                  className="form-control"

                  placeholder="Phone"
                />
              </div>
              {errors.phone && (
                <div style={{ color: "red" }}>

                  {errors.phone}
                </div>
              )}
            </div>

            <div className="col-md-1">
              <Button className={`btn ${!formData.customer_name && !formData.phone ? "btn-secondary" : "btn-success"} btn-sm`} disabled={!formData.customer_name && !formData.phone} style={{ marginTop: "30px" }} onClick={sendWhatsAppMessage}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="white" viewBox="0 0 16 16">
                  <path d="M13.601 2.326A7.875 7.875 0 0 0 8.036 0C3.596 0 0 3.597 0 8.036c0 1.417.37 2.805 1.07 4.03L0 16l3.993-1.05a7.968 7.968 0 0 0 4.043 1.085h.003c4.44 0 8.036-3.596 8.036-8.036 0-2.147-.836-4.166-2.37-5.673ZM8.036 14.6a6.584 6.584 0 0 1-3.35-.92l-.24-.142-2.37.622.63-2.31-.155-.238a6.587 6.587 0 0 1-1.018-3.513c0-3.637 2.96-6.6 6.6-6.6 1.764 0 3.42.69 4.67 1.94a6.56 6.56 0 0 1 1.93 4.668c0 3.637-2.96 6.6-6.6 6.6Zm3.61-4.885c-.198-.1-1.17-.578-1.352-.644-.18-.066-.312-.1-.444.1-.13.197-.51.644-.626.775-.115.13-.23.15-.428.05-.198-.1-.837-.308-1.594-.983-.59-.525-.99-1.174-1.11-1.372-.116-.198-.012-.305.088-.403.09-.09.198-.23.298-.345.1-.115.132-.197.2-.33.065-.13.032-.247-.017-.345-.05-.1-.444-1.07-.61-1.46-.16-.384-.323-.332-.444-.338l-.378-.007c-.13 0-.344.048-.525.23s-.688.672-.688 1.64c0 .967.704 1.9.802 2.03.1.13 1.386 2.116 3.365 2.963.47.203.837.324 1.122.414.472.15.902.13 1.24.08.378-.057 1.17-.48 1.336-.942.165-.462.165-.858.116-.943-.048-.084-.18-.132-.378-.23Z" />
                </svg>
              </Button>
            </div>



            <div className="col-md-2">
              <label className="form-label">VAT NO.(15 digits)</label>

              <div className="input-group mb-3">
                <input
                  id="quotation_vat_no"
                  name="quotation_vat_no"
                  value={formData.vat_no ? formData.vat_no : ""}
                  type='string'
                  onChange={(e) => {
                    delete errors["vat_no"];
                    setErrors({ ...errors });
                    formData.vat_no = e.target.value;
                    setFormData({ ...formData });
                    console.log(formData);
                  }}
                  className="form-control"

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
                    delete errors["address"];
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

            <div className="col-md-8">
              <label className="form-label">Product*</label>
              <Typeahead
                id="product_id"
                ref={productSearchRef}
                filterBy={store?.client_filter ? undefined : () => true}
                size="lg"
                labelKey="search_label"
                emptyLabel=""
                clearButton={true}
                open={openProductSearchResult}
                isLoading={false}
                isInvalid={errors.product_id ? true : false}
                onChange={(selectedItems) => {
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
                  }, 400);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setProductOptions([]);
                    setOpenProductSearchResult(false);
                    productSearchRef.current?.clear();
                  }

                  moveToProductSearch();

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
            </div>

            <div className="col-md-1">
              <Button className="btn btn-primary" style={{ marginTop: "30px" }} onClick={openProducts}>
                <i class="bi bi-list"></i>
              </Button>
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
                    <th style={{ minWidth: "250px" }}>
                      Name
                    </th>
                    <th >Info</th>
                    <th >Purchase Unit Price(without VAT)</th>
                    <th>Qty</th>
                    <th>Unit Price(without VAT)</th>
                    <th>Unit Price(with VAT)</th>
                    <th>Unit Disc.(without VAT)</th>
                    <th>Unit Disc.(with VAT)</th>
                    {/*  <th>Unit Disc. %(without VAT)</th>*/}
                    <th>Unit Disc. %(with VAT)</th>
                    <th>Price(without VAT)</th>
                    <th>Price(with VAT)</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedProducts
                    .map((product, index) => (
                      <tr className="text-center fixed-row " key={index}>
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
                        {enableProductSelection && <td>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(product.id)}
                            onChange={() => handleSelect(product.id)}
                          />
                        </td>}
                        <td style={{ verticalAlign: 'middle', padding: '0.25rem' }}>{index + 1}</td>
                        <td style={{ verticalAlign: 'middle', padding: '0.25rem', width: "auto", whiteSpace: "nowrap" }}>
                          <OverflowTooltip maxWidth={120} value={product.prefix_part_number ? product.prefix_part_number + " - " + product.part_number : product.part_number} />
                        </td>
                        <ResizableTableCell style={{ verticalAlign: 'middle', padding: '0.25rem' }}
                        >
                          <div className="input-group">
                            <input type="text" id={`${"quotation_product_name" + index}`}
                              name={`${"quotation_product_name" + index}`}
                              onWheel={(e) => e.target.blur()}
                              value={product.name}
                              className={`form-control text-end ${errors["name_" + index] ? 'is-invalid' : ''} ${warnings["name_" + index] ? 'border-warning text-warning' : ''}`}
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

                        <td style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                          <div className="input-group">
                            <input
                              type="number"
                              id={`quotation_product_purchase_unit_price_${index}`}
                              name={`quotation_product_purchase_unit_price_${index}`}
                              className={`form-control text-end ${errors["purchase_unit_price_" + index] ? 'is-invalid' : ''} ${warnings["purchase_unit_price_" + index] ? 'border-warning text-warning' : ''}`}
                              onWheel={(e) => e.target.blur()}
                              value={product.purchase_unit_price}
                              placeholder="Purchase Unit Price"
                              ref={(el) => {
                                if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                inputRefs.current[index][`${"quotation_product_purchase_unit_price_" + index}`] = el;
                              }}
                              onFocus={() => {
                                if (timerRef.current) clearTimeout(timerRef.current);
                                timerRef.current = setTimeout(() => {
                                  inputRefs.current[index][`${"quotation_product_purchase_unit_price_" + index}`].select();
                                }, 100);
                              }}
                              onKeyDown={(e) => {
                                RunKeyActions(e, product);
                                if (timerRef.current) clearTimeout(timerRef.current);

                                if (e.key === "Backspace") {
                                  selectedProducts[index].purchase_unit_price = "";
                                  setSelectedProducts([...selectedProducts]);
                                  timerRef.current = setTimeout(() => {
                                    checkErrors(index);
                                    reCalculate(index);
                                  }, 100);
                                } else if (e.key === "ArrowLeft") {
                                  if ((index + 1) === selectedProducts.length) {
                                    timerRef.current = setTimeout(() => {
                                      productSearchRef.current?.focus();
                                    }, 100);
                                  } else {
                                    timerRef.current = setTimeout(() => {
                                      inputRefs.current[(index + 1)][`${"quotation_unit_discount_with_vat_" + (index + 1)}`].focus();
                                    }, 100);
                                  }
                                }
                              }}
                              onChange={(e) => {
                                if (timerRef.current) clearTimeout(timerRef.current);

                                if (parseFloat(e.target.value) === 0) {
                                  selectedProducts[index].purchase_unit_price = e.target.value;
                                  setSelectedProducts([...selectedProducts]);
                                  timerRef.current = setTimeout(() => {
                                    checkErrors(index);
                                    reCalculate(index);
                                  }, 100);
                                  return;
                                }

                                if (!e.target.value) {
                                  selectedProducts[index].purchase_unit_price = e.target.value;
                                  setSelectedProducts([...selectedProducts]);
                                  timerRef.current = setTimeout(() => {
                                    checkWarnings(index);
                                    checkErrors(index);
                                    reCalculate(index);
                                  }, 100);
                                  return;
                                }

                                if (e.target.value) {
                                  selectedProducts[index].purchase_unit_price = parseFloat(e.target.value);
                                  setSelectedProducts([...selectedProducts]);
                                }

                                checkErrors(index);
                              }}
                            />

                            {(errors[`purchase_unit_price_${index}`] || warnings[`purchase_unit_price_${index}`]) && (
                              <i
                                className={`bi bi-exclamation-circle-fill ${errors[`purchase_unit_price_${index}`] ? 'text-danger' : 'text-warning'} ms-2`}
                                data-bs-toggle="tooltip"
                                data-bs-placement="top"
                                data-error={errors[`purchase_unit_price_${index}`] || ''}
                                data-warning={warnings[`purchase_unit_price_${index}`] || ''}
                                title={errors[`purchase_unit_price_${index}`] || warnings[`purchase_unit_price_${index}`] || ''}
                                style={{
                                  fontSize: '1rem',
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                }}
                              ></i>
                            )}
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
                                style={{ minWidth: "40px" }}
                                id={`${"quotation_product_quantity_" + index}`}
                                name={`${"quotation_product_quantity" + index}`}
                                className={`form-control text-end ${errors["quantity_" + index] ? 'is-invalid' : warnings["quantity_" + index] ? 'border-warning text-warning' : ''}`}
                                onWheel={(e) => e.target.blur()}
                                value={product.quantity}
                                placeholder="Quantity"
                                ref={(el) => {
                                  if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                  inputRefs.current[index][`${"quotation_product_quantity_" + index}`] = el;
                                }}
                                onFocus={() => {
                                  if (timerRef.current) clearTimeout(timerRef.current);
                                  timerRef.current = setTimeout(() => {
                                    inputRefs.current[index][`${"quotation_product_quantity_" + index}`].select();
                                  }, 100);
                                }}
                                onKeyDown={(e) => {
                                  RunKeyActions(e, product);

                                  if (timerRef.current) clearTimeout(timerRef.current);
                                  if (e.key === "Backspace") {
                                    selectedProducts[index].quantity = "";
                                    setSelectedProducts([...selectedProducts]);
                                    timerRef.current = setTimeout(() => {
                                      checkWarnings(index);
                                      checkErrors(index);
                                      reCalculate(index);
                                    }, 100);
                                  } else if (e.key === "ArrowLeft") {
                                    timerRef.current = setTimeout(() => {
                                      inputRefs.current[index][`${"quotation_product_purchase_unit_price_" + index}`].focus();
                                    }, 100);
                                  }
                                }}
                                onChange={(e) => {
                                  setErrors({ ...errors });
                                  if (timerRef.current) clearTimeout(timerRef.current);

                                  if (parseFloat(e.target.value) === 0) {
                                    selectedProducts[index].quantity = e.target.value;
                                    setSelectedProducts([...selectedProducts]);
                                    timerRef.current = setTimeout(() => {
                                      checkWarnings(index);
                                      checkErrors(index);
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
                                  timerRef.current = setTimeout(() => {
                                    checkErrors(index);
                                    checkWarnings(index);
                                    reCalculate(index);
                                  }, 100);
                                }} />
                              <span className="input-group-text text-nowrap">
                                {selectedProducts[index].unit ? selectedProducts[index].unit : 'Units'}
                              </span>
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

                        <td style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                          <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                            <div className="input-group flex-nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                              <input type="number"
                                id={`${"quotation_product_unit_price_" + index}`}
                                name={`${"quotation_product_unit_price_" + index}`}
                                onWheel={(e) => e.target.blur()}
                                value={selectedProducts[index].unit_price}
                                className={`form-control text-end ${errors["unit_price_" + index] ? 'is-invalid' : ''} ${warnings["unit_price_" + index] ? 'border-warning text-warning' : ''}`}
                                placeholder="Unit Price(without VAT)"
                                ref={(el) => {
                                  if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                  inputRefs.current[index][`${"quotation_product_unit_price_" + index}`] = el;
                                }}

                                onFocus={() => {
                                  if (timerRef.current) clearTimeout(timerRef.current);
                                  timerRef.current = setTimeout(() => {
                                    inputRefs.current[index][`${"quotation_product_unit_price_" + index}`].select();
                                  }, 100);
                                }}

                                onKeyDown={(e) => {
                                  RunKeyActions(e, product);

                                  if (timerRef.current) clearTimeout(timerRef.current);
                                  if (e.key === "Backspace") {
                                    selectedProducts[index].unit_price_with_vat = "";
                                    selectedProducts[index].unit_price = "";
                                    setSelectedProducts([...selectedProducts]);
                                    timerRef.current = setTimeout(() => {
                                      checkErrors(index);
                                      reCalculate(index);
                                    }, 100);
                                  } else if (e.key === "ArrowLeft") {
                                    timerRef.current = setTimeout(() => {
                                      inputRefs.current[index][`${"quotation_product_quantity_" + index}`].focus();
                                    }, 100);
                                  }
                                }}

                                onChange={(e) => {
                                  if (timerRef.current) clearTimeout(timerRef.current);
                                  if (parseFloat(e.target.value) === 0) {
                                    selectedProducts[index].unit_price = e.target.value;
                                    selectedProducts[index].unit_price_with_vat = e.target.value;
                                    setSelectedProducts([...selectedProducts]);
                                    timerRef.current = setTimeout(() => {
                                      //  checkWarnings(index);
                                      checkErrors(index);
                                      reCalculate(index);
                                    }, 100);
                                    return;
                                  }

                                  if (!e.target.value) {
                                    selectedProducts[index].unit_price = e.target.value;
                                    selectedProducts[index].unit_price_with_vat = e.target.value;
                                    setSelectedProducts([...selectedProducts]);
                                    timerRef.current = setTimeout(() => {
                                      //checkWarnings(index);
                                      checkErrors(index);
                                      reCalculate(index);
                                    }, 100);
                                    return;
                                  }


                                  if (/^\d*\.?\d{0,2}$/.test(parseFloat(e.target.value)) === false) {
                                    errors["unit_price_" + index] = "Max decimal points allowed is 2";
                                    setErrors({ ...errors });
                                  }

                                  selectedProducts[index].unit_price = parseFloat(e.target.value);
                                  setSelectedProducts([...selectedProducts]);

                                  timerRef.current = setTimeout(() => {
                                    selectedProducts[index].unit_price_with_vat = parseFloat(trimTo2Decimals(selectedProducts[index].unit_price * (1 + (formData.vat_percent / 100))))
                                    selectedProducts[index].unit_discount_percent = parseFloat(trimTo2Decimals(((selectedProducts[index].unit_discount / selectedProducts[index].unit_price) * 100)))
                                    selectedProducts[index].unit_discount_percent_with_vat = parseFloat(trimTo2Decimals(((selectedProducts[index].unit_discount_with_vat / selectedProducts[index].unit_price_with_vat) * 100)))
                                    reCalculate(index);
                                    checkErrors(index);
                                  }, 100);
                                }} />

                            </div>
                            {(errors[`unit_price_${index}`] || warnings[`unit_price_${index}`]) && (
                              <i
                                className={`bi bi-exclamation-circle-fill ${errors[`unit_price_${index}`] ? 'text-danger' : 'text-warning'} ms-2`}
                                data-bs-toggle="tooltip"
                                data-bs-placement="top"
                                data-error={errors[`unit_price_${index}`] || ''}
                                data-warning={warnings[`unit_price_${index}`] || ''}
                                title={errors[`unit_price_${index}`] || warnings[`unit_price_${index}`] || ''}
                                style={{
                                  fontSize: '1rem',
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                }}
                              ></i>
                            )}
                          </div>
                        </td>
                        <td style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                          <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                            <div className="input-group flex-nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                              <input type="number"
                                id={`${"quotation_product_unit_price_with_vat_" + index}`}
                                name={`${"quotation_product_unit_price_with_vat_" + index}`}
                                onWheel={(e) => e.target.blur()}
                                value={selectedProducts[index].unit_price_with_vat}
                                className={`form-control text-end ${errors["unit_price_with_vat_" + index] ? 'is-invalid' : ''} ${warnings["unit_price_with_vat_" + index] ? 'border-warning text-warning' : ''}`}
                                ref={(el) => {
                                  if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                  inputRefs.current[index][`${"quotation_product_unit_price_with_vat_" + index}`] = el;
                                }}
                                placeholder="Unit Price(with VAT)"

                                onFocus={() => {
                                  if (timerRef.current) clearTimeout(timerRef.current);
                                  timerRef.current = setTimeout(() => {
                                    inputRefs.current[index][`${"quotation_product_unit_price_with_vat_" + index}`].select();
                                  }, 100);
                                }}

                                onKeyDown={(e) => {
                                  RunKeyActions(e, product);

                                  if (timerRef.current) clearTimeout(timerRef.current);
                                  if (e.key === "Backspace") {
                                    selectedProducts[index].unit_price_with_vat = "";
                                    selectedProducts[index].unit_price = "";
                                    setSelectedProducts([...selectedProducts]);
                                    timerRef.current = setTimeout(() => {
                                      reCalculate(index);
                                    }, 100);
                                  } else if (e.key === "ArrowLeft") {
                                    timerRef.current = setTimeout(() => {
                                      inputRefs.current[index][`${"quotation_product_unit_price_" + index}`].focus();
                                    }, 200);
                                  }
                                }}
                                onChange={(e) => {
                                  delete errors["unit_price_with_vat_" + index];

                                  if (timerRef.current) clearTimeout(timerRef.current);

                                  setErrors({ ...errors });
                                  if (!e.target.value) {
                                    // errors["unit_price_with_vat_" + index] = "";
                                    selectedProducts[index].unit_price_with_vat = "";
                                    selectedProducts[index].unit_price = "";
                                    setSelectedProducts([...selectedProducts]);
                                    setErrors({ ...errors });
                                    console.log("errors:", errors);
                                    // Set new debounce timer
                                    timerRef.current = setTimeout(() => {
                                      reCalculate(index);
                                    }, 100);
                                    return;
                                  }

                                  if (e.target.value === 0) {
                                    errors["unit_price_with_vat_" + index] = "Unit Price should be > 0";
                                    selectedProducts[index].unit_price_with_vat = 0;
                                    selectedProducts[index].unit_price = 0;
                                    setSelectedProducts([...selectedProducts]);
                                    setErrors({ ...errors });
                                    console.log("errors:", errors);
                                    // Set new debounce timer
                                    timerRef.current = setTimeout(() => {
                                      reCalculate(index);
                                    }, 100);
                                    return;
                                  }

                                  if (/^\d*\.?\d{0,2}$/.test(parseFloat(e.target.value)) === false) {
                                    errors["unit_price_with_vat_" + index] = "Max decimal points allowed is 2";
                                    setErrors({ ...errors });
                                  }


                                  selectedProducts[index].unit_price_with_vat = parseFloat(e.target.value);


                                  setSelectedProducts([...selectedProducts]);
                                  // Set new debounce timer
                                  timerRef.current = setTimeout(() => {
                                    selectedProducts[index].unit_price = parseFloat(trimTo2Decimals(selectedProducts[index].unit_price_with_vat / (1 + (formData.vat_percent / 100))))
                                    selectedProducts[index].unit_discount_with_vat = parseFloat(trimTo2Decimals(selectedProducts[index].unit_discount * (1 + (formData.vat_percent / 100))))

                                    selectedProducts[index].unit_discount_percent = parseFloat(trimTo2Decimals(((selectedProducts[index].unit_discount / selectedProducts[index].unit_price) * 100)))
                                    selectedProducts[index].unit_discount_percent_with_vat = parseFloat(trimTo2Decimals(((selectedProducts[index].unit_discount_with_vat / selectedProducts[index].unit_price_with_vat) * 100)))

                                    reCalculate(index);
                                  }, 100);
                                }} />
                            </div>
                            {(errors[`unit_price_with_vat_${index}`] || warnings[`unit_price_with_vat_${index}`]) && (
                              <i
                                className={`bi bi-exclamation-circle-fill ${errors[`unit_price_with_vat_${index}`] ? 'text-danger' : 'text-warning'} ms-2`}
                                data-bs-toggle="tooltip"
                                data-bs-placement="top"
                                data-error={errors[`unit_price_with_vat_${index}`] || ''}
                                data-warning={warnings[`unit_price_with_vat_${index}`] || ''}
                                title={errors[`unit_price_with_vat_${index}`] || warnings[`unit_price_with_vat_${index}`] || ''}
                                style={{
                                  fontSize: '1rem',
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                }}
                              ></i>
                            )}
                          </div>
                        </td>
                        <td style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                          <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                            <div className="input-group flex-nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                              <input type="number"
                                id={`${"quotation_unit_discount_" + index}`}
                                name={`${"quotation_unit_discount_" + index}`}
                                onWheel={(e) => e.target.blur()}
                                className={`form-control text-end ${errors["unit_discount_" + index] ? 'is-invalid' : ''} ${warnings["unit_discount_" + index] ? 'border-warning text-warning' : ''}`}
                                value={selectedProducts[index].unit_discount}
                                ref={(el) => {
                                  if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                  inputRefs.current[index][`${"quotation_unit_discount_" + index}`] = el;
                                }}
                                onFocus={() => {
                                  if (timerRef.current) clearTimeout(timerRef.current);
                                  timerRef.current = setTimeout(() => {
                                    inputRefs.current[index][`${"quotation_unit_discount_" + index}`]?.select();
                                  }, 100);
                                }}
                                onKeyDown={(e) => {
                                  RunKeyActions(e, product);

                                  if (timerRef.current) clearTimeout(timerRef.current);
                                  if (e.key === "ArrowLeft") {
                                    timerRef.current = setTimeout(() => {
                                      inputRefs.current[index][`${"quotation_product_unit_price_with_vat_" + index}`].focus();
                                    }, 100);
                                  }
                                }}
                                onChange={(e) => {
                                  delete errors["unit_discount_" + index];
                                  if (timerRef.current) clearTimeout(timerRef.current);

                                  if (parseFloat(e.target.value) === 0) {
                                    selectedProducts[index].unit_discount = parseFloat(e.target.value);
                                    setFormData({ ...formData });

                                    setErrors({ ...errors });
                                    timerRef.current = setTimeout(() => {
                                      reCalculate(index);
                                    }, 100);
                                    return;
                                  }

                                  if (parseFloat(e.target.value) < 0) {
                                    selectedProducts[index].unit_discount = 0.00;
                                    selectedProducts[index].unit_discount_with_vat = 0.00;
                                    selectedProducts[index].unit_discount_percent = 0.00;
                                    selectedProducts[index].unit_discount_percent_with_vat = 0.00;
                                    setFormData({ ...formData });
                                    errors["unit_discount_" + index] = "Unit discount should be >= 0";
                                    setErrors({ ...errors });
                                    timerRef.current = setTimeout(() => {
                                      reCalculate(index);
                                    }, 100);
                                    return;
                                  }

                                  if (!e.target.value) {
                                    selectedProducts[index].unit_discount = "";
                                    selectedProducts[index].unit_discount_with_vat = "";
                                    selectedProducts[index].unit_discount_percent = "";
                                    selectedProducts[index].unit_discount_percent_with_vat = "";
                                    // errors["discount_" + index] = "Invalid Discount";
                                    setFormData({ ...formData });
                                    timerRef.current = setTimeout(() => {
                                      reCalculate(index);
                                    }, 100);
                                    //setErrors({...errors});
                                    return;
                                  }

                                  delete errors["unit_discount_" + index];
                                  delete errors["unit_discount_percent_" + index];
                                  setErrors({ ...errors });

                                  if (/^\d*\.?\d{0,2}$/.test(parseFloat(e.target.value)) === false) {
                                    errors["unit_discount_" + index] = "Max decimal points allowed is 2";
                                    setErrors({ ...errors });
                                  }

                                  selectedProducts[index].unit_discount = parseFloat(e.target.value);


                                  setFormData({ ...formData });
                                  timerRef.current = setTimeout(() => {
                                    selectedProducts[index].unit_discount_with_vat = parseFloat(trimTo2Decimals(selectedProducts[index].unit_discount * (1 + (formData.vat_percent / 100))))

                                    selectedProducts[index].unit_discount_percent = parseFloat(trimTo2Decimals(((selectedProducts[index].unit_discount / selectedProducts[index].unit_price) * 100)))
                                    selectedProducts[index].unit_discount_percent_with_vat = parseFloat(trimTo2Decimals(((selectedProducts[index].unit_discount_with_vat / selectedProducts[index].unit_price_with_vat) * 100)))
                                    reCalculate(index);
                                  }, 100);
                                }} />
                            </div>
                            {(errors[`unit_discount_${index}`] || warnings[`unit_discount_${index}`]) && (
                              <i
                                className={`bi bi-exclamation-circle-fill ${errors[`unit_discount_${index}`] ? 'text-danger' : 'text-warning'} ms-2`}
                                data-bs-toggle="tooltip"
                                data-bs-placement="top"
                                data-error={errors[`unit_discount_${index}`] || ''}
                                data-warning={warnings[`unit_discount__${index}`] || ''}
                                title={errors[`unit_discount_${index}`] || warnings[`unit_discount_${index}`] || ''}
                                style={{
                                  fontSize: '1rem',
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                }}
                              ></i>
                            )}
                          </div>
                        </td>
                        {/*} ref={(el) => inputRefs.current[index] = el}
                                  onFocus={() => inputRefs.current[index]?.select()}*/}
                        <td style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                          <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                            <div className="input-group flex-nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                              <input type="number"
                                id={`${"quotation_unit_discount_with_vat_" + index}`}
                                name={`${"quotation_unit_discount_with_vat_" + index}`}
                                onWheel={(e) => e.target.blur()}
                                className={`form-control text-end ${errors["unit_discount_with_vat_" + index] ? 'is-invalid' : ''} ${warnings["unit_discount_with_vat_" + index] ? 'border-warning text-warning' : ''}`}
                                value={selectedProducts[index].unit_discount_with_vat}
                                ref={(el) => {
                                  if (!inputRefs.current[index]) inputRefs.current[index] = {};
                                  inputRefs.current[index][`${"quotation_unit_discount_with_vat_" + index}`] = el;
                                }}
                                onFocus={() => {
                                  if (timerRef.current) clearTimeout(timerRef.current);
                                  timerRef.current = setTimeout(() => {
                                    inputRefs.current[index][`${"quotation_unit_discount_with_vat_" + index}`]?.select();
                                  }, 100);
                                }}
                                onKeyDown={(e) => {
                                  RunKeyActions(e, product);

                                  if (timerRef.current) clearTimeout(timerRef.current);

                                  if (e.key === "Enter") {
                                    if ((index + 1) === selectedProducts.length) {
                                      timerRef.current = setTimeout(() => {
                                        productSearchRef.current?.focus();
                                      }, 100);
                                    } else {
                                      if (index === 0) {
                                        console.log("moviing to discount")
                                        timerRef.current = setTimeout(() => {
                                          // discountRef.current?.focus();
                                          productSearchRef.current?.focus();
                                        }, 100);
                                      } else {
                                        console.log("moviing to next line")
                                        timerRef.current = setTimeout(() => {
                                          inputRefs.current[index - 1][`${"quotation_product_quantity_" + (index - 1)}`]?.focus();
                                        }, 100);
                                      }

                                    }
                                  } else if (e.key === "ArrowLeft") {
                                    timerRef.current = setTimeout(() => {
                                      inputRefs.current[index][`${"quotation_unit_discount_" + index}`].focus();
                                    }, 100);
                                  }
                                }}
                                onChange={(e) => {
                                  if (timerRef.current) clearTimeout(timerRef.current);
                                  if (parseFloat(e.target.value) === 0) {
                                    selectedProducts[index].unit_discount_with_vat = 0.00;
                                    selectedProducts[index].unit_discount = 0.00;
                                    selectedProducts[index].unit_discount_percent = 0.00;
                                    selectedProducts[index].unit_discount_percent_with_vat = 0.00;
                                    setFormData({ ...formData });
                                    delete errors["unit_discount_with_vat" + index];
                                    setErrors({ ...errors });
                                    timerRef.current = setTimeout(() => {
                                      reCalculate(index);
                                    }, 100);
                                    return;
                                  }

                                  if (parseFloat(e.target.value) < 0) {
                                    selectedProducts[index].unit_discount_with_vat = 0.00;
                                    selectedProducts[index].unit_discount_percent = 0.00;
                                    selectedProducts[index].unit_discount = 0.00;
                                    selectedProducts[index].unit_discount_percent_with_vat = 0.00;
                                    setFormData({ ...formData });
                                    errors["unit_discount_" + index] = "Unit discount should be >= 0";
                                    setErrors({ ...errors });
                                    timerRef.current = setTimeout(() => {
                                      reCalculate(index);
                                    }, 100);
                                    return;
                                  }

                                  if (!e.target.value) {
                                    selectedProducts[index].unit_discount_with_vat = "";
                                    selectedProducts[index].unit_discount = "";
                                    selectedProducts[index].unit_discount_percent = "";
                                    selectedProducts[index].unit_discount_percent_with_vat = "";
                                    // errors["discount_" + index] = "Invalid Discount";
                                    setFormData({ ...formData });
                                    timerRef.current = setTimeout(() => {
                                      reCalculate(index);
                                    }, 100);
                                    //setErrors({ ...errors });
                                    return;
                                  }

                                  delete errors["unit_discount_with_vat_" + index];
                                  delete errors["unit_discount_percent_" + index];
                                  setErrors({ ...errors });

                                  if (/^\d*\.?\d{0,2}$/.test(parseFloat(e.target.value)) === false) {
                                    errors["unit_discount_with_vat_" + index] = "Max decimal points allowed is 2";
                                    setErrors({ ...errors });
                                  }

                                  selectedProducts[index].unit_discount_with_vat = parseFloat(e.target.value); //input


                                  setFormData({ ...formData });
                                  timerRef.current = setTimeout(() => {

                                    selectedProducts[index].unit_discount = parseFloat(trimTo2Decimals(selectedProducts[index].unit_discount_with_vat / (1 + (formData.vat_percent / 100))))
                                    selectedProducts[index].unit_discount_percent = parseFloat(trimTo2Decimals(((selectedProducts[index].unit_discount / selectedProducts[index].unit_price) * 100)))
                                    selectedProducts[index].unit_discount_percent_with_vat = parseFloat(trimTo2Decimals(((selectedProducts[index].unit_discount_with_vat / selectedProducts[index].unit_price_with_vat) * 100)))

                                    reCalculate(index);
                                  }, 100);
                                }} />
                            </div>
                            {(errors[`unit_discount_with_vat_${index}`] || warnings[`unit_discount_with_vat_${index}`]) && (
                              <i
                                className={`bi bi-exclamation-circle-fill ${errors[`unit_discount_with_vat_${index}`] ? 'text-danger' : 'text-warning'} ms-2`}
                                data-bs-toggle="tooltip"
                                data-bs-placement="top"
                                data-error={errors[`unit_discount_with_vat_${index}`] || ''}
                                data-warning={warnings[`unit_discount_with_vat_${index}`] || ''}
                                title={errors[`unit_discount_with_vat_${index}`] || warnings[`unit_discount_with_vat_${index}`] || ''}
                                style={{
                                  fontSize: '1rem',
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                }}
                              ></i>
                            )}
                          </div>
                        </td>
                        {/*<td>
                          <div className="input-group mb-3">
                              <input type="number" id={`${"quotation_unit_discount_percent" + index}`} disabled={false} name={`${"quotation_unit_discount_percent" + index}`} onWheel={(e) => e.target.blur()} className="form-control text-end" value={selectedProducts[index].unit_discount_percent} onChange={(e) => {
                                  if (timerRef.current) clearTimeout(timerRef.current);

                                  if (parseFloat(e.target.value) === 0) {
                                      selectedProducts[index].unit_discount_percent = 0.00;
                                      selectedProducts[index].unit_discount_with_vat = 0.00;
                                      selectedProducts[index].unit_discount = 0.00;
                                      selectedProducts[index].unit_discount_percent_with_vat = 0.00;
                                      setFormData({ ...formData });
                                      errors["unit_discount_percent_" + index] = "";
                                      setErrors({ ...errors });
                                      timerRef.current = setTimeout(() => {
                                          reCalculate(index);
                                      }, 300);
                                      return;
                                  }

                                  if (parseFloat(e.target.value) < 0) {
                                      selectedProducts[index].unit_discount_percent = 0.00;
                                      selectedProducts[index].unit_discount_with_vat = 0.00;
                                      selectedProducts[index].unit_discount = 0.00;
                                      selectedProducts[index].unit_discount_percent_with_vat = 0.00;
                                      setFormData({ ...formData });
                                      errors["unit_discount_percent_" + index] = "Unit discount % should be >= 0";
                                      setErrors({ ...errors });
                                      timerRef.current = setTimeout(() => {
                                          reCalculate(index);
                                      }, 300);
                                      return;
                                  }

                                  if (!e.target.value) {
                                      selectedProducts[index].unit_discount_percent = "";
                                      selectedProducts[index].unit_discount_with_vat = "";
                                      selectedProducts[index].unit_discount = "";
                                      selectedProducts[index].unit_discount_percent_with_vat = "";
                                      //errors["discount_percent_" + index] = "Invalid Discount Percent";
                                      setFormData({ ...formData });
                                      timerRef.current = setTimeout(() => {
                                          reCalculate(index);
                                      }, 300);
                                      //setErrors({ ...errors });
                                      return;
                                  }

                                  errors["unit_discount_percent_" + index] = "";
                                  errors["unit_discount_" + index] = "";
                                  setErrors({ ...errors });

                                  selectedProducts[index].unit_discount_percent = parseFloat(e.target.value); //input


                                  setFormData({ ...formData });

                                  timerRef.current = setTimeout(() => {
                                      selectedProducts[index].unit_discount = parseFloat(trimTo2Decimals(selectedProducts[index].unit_price * (selectedProducts[index].unit_discount_percent / 100)));
                                      selectedProducts[index].unit_discount_with_vat = parseFloat(trimTo2Decimals(selectedProducts[index].unit_discount * (1 + (formData.vat_percent / 100))))
                                      selectedProducts[index].unit_discount_percent_with_vat = parseFloat(trimTo2Decimals(((selectedProducts[index].unit_discount_with_vat / selectedProducts[index].unit_price_with_vat) * 100)))

                                      reCalculate(index);
                                  }, 300);
                              }} />
                          </div>
                          {errors["unit_discount_percent_" + index] && (
                              <div style={{ color: "red" }}>
                                  {errors["unit_discount_percent_" + index]}
                              </div>
                          )}
                      </td>*/}
                        <td style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                          <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                            <div className="input-group flex-nowrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                              <input type="number"
                                id={`${"quotation_unit_discount_percent_with_vat_" + index}`}
                                disabled={true}
                                name={`${"quotation_unit_discount_percent_with_vat_" + index}`}
                                onWheel={(e) => e.target.blur()}
                                className={`form-control text-end ${errors["unit_discount_percent_with_vat_" + index] ? 'is-invalid' : ''} ${warnings["unit_discount_percent_with_vat_" + index] ? 'border-warning text-warning' : ''}`}
                                value={selectedProducts[index].unit_discount_percent_with_vat}
                                onChange={(e) => {
                                  if (timerRef.current) clearTimeout(timerRef.current);

                                  if (parseFloat(e.target.value) === 0) {
                                    selectedProducts[index].unit_discount_percent = 0.00;
                                    selectedProducts[index].unit_discount_percent_with_vat = 0.00;
                                    selectedProducts[index].unit_discount_with_vat = 0.00;
                                    selectedProducts[index].unit_discount = 0.00;
                                    setFormData({ ...formData });
                                    delete errors["unit_discount_percent_" + index];
                                    setErrors({ ...errors });
                                    timerRef.current = setTimeout(() => {
                                      reCalculate(index)
                                    }, 100);
                                    return;
                                  }

                                  if (parseFloat(e.target.value) < 0) {
                                    selectedProducts[index].unit_discount_percent = 0.00;
                                    selectedProducts[index].unit_discount_percent_with_vat = 0.00;
                                    selectedProducts[index].unit_discount_with_vat = 0.00;
                                    selectedProducts[index].unit_discount = 0.00;
                                    setFormData({ ...formData });
                                    errors["unit_discount_percent_" + index] = "Unit discount % should be >= 0";
                                    setErrors({ ...errors });
                                    timerRef.current = setTimeout(() => {
                                      reCalculate(index);
                                    }, 100);
                                    return;
                                  }

                                  if (!e.target.value) {
                                    selectedProducts[index].unit_discount_percent = "";
                                    selectedProducts[index].unit_discount_percent_with_vat = "";
                                    selectedProducts[index].unit_discount_with_vat = "";
                                    selectedProducts[index].unit_discount = "";
                                    //errors["discount_percent_" + index] = "Invalid Discount Percent";
                                    setFormData({ ...formData });
                                    timerRef.current = setTimeout(() => {
                                      reCalculate(index);
                                    }, 100);
                                    //setErrors({ ...errors });
                                    return;
                                  }

                                  delete errors["unit_discount_percent_" + index];
                                  delete errors["unit_discount_" + index];
                                  setErrors({ ...errors });

                                  /*
                                  if (/^\d*\.?\d{0, 2}$/.test(parseFloat(e.target.value)) === false) {
                              errors["unit_discount_percent_" + index] = "Max. decimal points allowed is 2";
                          setErrors({...errors});
                                  }*/

                                  selectedProducts[index].unit_discount_percent_with_vat = parseFloat(e.target.value); //input


                                  //selectedProducts[index].unit_discount_percent_with_vat = parseFloat(trimTo2Decimals(((selectedProducts[index].unit_discount_with_vat / selectedProducts[index].unit_price_with_vat) * 100)))

                                  setFormData({ ...formData });

                                  timerRef.current = setTimeout(() => {
                                    selectedProducts[index].unit_discount_with_vat = parseFloat(trimTo2Decimals(selectedProducts[index].unit_price_with_vat * (selectedProducts[index].unit_discount_percent_with_vat / 100)))
                                    selectedProducts[index].unit_discount = parseFloat(trimTo2Decimals(selectedProducts[index].unit_discount_with_vat / (1 + (formData.vat_percent / 100))))
                                    selectedProducts[index].unit_discount_percent = parseFloat(trimTo2Decimals(((selectedProducts[index].unit_discount / selectedProducts[index].unit_price) * 100)))

                                    reCalculate(index);
                                  }, 100);
                                }} />{""}
                            </div>
                            {(errors[`unit_discount_percent_with_vat_${index}`] || warnings[`unit_discount_percent_with_vat_${index}`]) && (
                              <i
                                className={`bi bi-exclamation-circle-fill ${errors[`unit_discount_percent_with_vat_${index}`] ? 'text-danger' : 'text-warning'} ms-2`}
                                data-bs-toggle="tooltip"
                                data-bs-placement="top"
                                data-error={errors[`unit_discount_percent_with_vat_${index}`] || ''}
                                data-warning={warnings[`unit_discount_percent_with_vat_${index}`] || ''}
                                title={errors[`unit_discount_percent_with_vat_${index}`] || warnings[`unit_discount_percent_with_vat_${index}`] || ''}
                                style={{
                                  fontSize: '1rem',
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                }}
                              ></i>
                            )}
                          </div>
                        </td>
                        <td className="text-end" style={{ verticalAlign: 'middle', padding: '0.25rem' }} >
                          <Amount amount={trimTo2Decimals((selectedProducts[index].unit_price - selectedProducts[index].unit_discount) * selectedProducts[index].quantity)} />
                        </td>
                        <td className="text-end" style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                          <Amount amount={trimTo2Decimals(((selectedProducts[index].unit_price_with_vat - selectedProducts[index].unit_discount_with_vat) * selectedProducts[index].quantity))} />
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


                    <th colSpan="8" className="text-end">Total(without VAT)</th>
                    <td className="text-end" style={{ width: "200px" }} >
                      <NumberFormat
                        value={trimTo2Decimals(formData.total)}
                        displayType={"text"}
                        thousandSeparator={true}
                        suffix={" "}
                        renderText={(value, props) => value}
                      />
                    </td>
                  </tr>
                  <tr>
                    <th colSpan="8" className="text-end">Total(with VAT)</th>
                    <td className="text-end" style={{ width: "200px" }} >
                      <NumberFormat
                        value={trimTo2Decimals(formData.total_with_vat)}
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
                      <input type="number" id="quotation_shipping_fees" name="quotation_shipping_fees" onWheel={(e) => e.target.blur()} style={{ width: "150px" }} className="text-start" value={shipping} onChange={(e) => {
                        if (timerRef.current) clearTimeout(timerRef.current);
                        delete errors["shipping_handling_fees"];
                        setErrors({ ...errors });

                        if (parseFloat(e.target.value) === 0) {
                          shipping = 0;
                          setShipping(shipping);
                          delete errors["shipping_handling_fees"];
                          setErrors({ ...errors });
                          timerRef.current = setTimeout(() => {
                            reCalculate();
                          }, 300);

                          return;
                        }

                        if (parseFloat(e.target.value) < 0) {
                          shipping = 0;
                          setShipping(shipping);

                          // errors["shipping_handling_fees"] = "Shipping / Handling Fees should be > 0";
                          setErrors({ ...errors });
                          timerRef.current = setTimeout(() => {
                            reCalculate();
                          }, 300);
                          return;
                        }

                        if (!e.target.value) {
                          shipping = "";
                          setShipping(shipping);
                          //errors["shipping_handling_fees"] = "Invalid Shipping / Handling Fees";

                          setErrors({ ...errors });
                          timerRef.current = setTimeout(() => {
                            reCalculate();
                          }, 300);
                          return;
                        }


                        if (/^\d*\.?\d{0,2}$/.test(parseFloat(e.target.value)) === false) {
                          errors["shipping_handling_fees"] = "Max. decimal points allowed is 2";
                          setErrors({ ...errors });
                        }


                        shipping = parseFloat(e.target.value);
                        setShipping(shipping);
                        timerRef.current = setTimeout(() => {
                          reCalculate();
                        }, 300);
                      }} />
                      {" "}
                      {errors.shipping_handling_fees && (
                        <div style={{ color: "red" }}>
                          {errors.shipping_handling_fees}
                        </div>
                      )}
                    </td>
                  </tr>
                  {/*<tr>
                                                          <th colSpan="8" className="text-end">
                                                              Discount(without VAT) <input type="number" id="discount_percent" name="discount_percent" onWheel={(e) => e.target.blur()} disabled={true} style={{ width: "50px" }} className="text-start" value={discountPercent} onChange={(e) => {
                                                                  if (timerRef.current) clearTimeout(timerRef.current);
                                                                  if (parseFloat(e.target.value) === 0) {
                  
                                                                      discount = 0;
                                                                      setDiscount(discount);
                  
                                                                      discountPercentWithVAT = 0;
                                                                      setDiscountPercentWithVAT(discountPercentWithVAT);
                  
                                                                      discount = 0;
                                                                      setDiscount(discount);
                  
                                                                      discountPercent = 0;
                                                                      setDiscountPercent(discountPercent);
                  
                                                                      errors["discount_percent"] = "";
                                                                      setErrors({ ...errors });
                                                                      timerRef.current = setTimeout(() => {
                                                                          reCalculate();
                                                                      }, 300);
                                                                      return;
                                                                  }
                  
                                                                  if (parseFloat(e.target.value) < 0) {
                                                                      discountWithVAT = 0;
                                                                      setDiscountWithVAT(discountWithVAT);
                  
                                                                      discountPercentWithVAT = 0;
                                                                      setDiscountPercentWithVAT(discountPercentWithVAT);
                  
                                                                      discount = 0;
                                                                      setDiscount(discount);
                  
                                                                      discountPercent = 0;
                                                                      setDiscountPercent(discountPercent);
                  
                                                                      // errors["discount_percent"] = "Discount percent should be >= 0";
                                                                      setErrors({ ...errors });
                                                                      timerRef.current = setTimeout(() => {
                                                                          reCalculate();
                                                                      }, 300);
                                                                      return;
                                                                  }
                  
                                                                  if (!e.target.value) {
                                                                      discountWithVAT = "";
                                                                      setDiscountWithVAT(discountWithVAT);
                  
                                                                      discountPercentWithVAT = "";
                                                                      setDiscountPercentWithVAT(discountPercentWithVAT);
                  
                                                                      discount = "";
                                                                      setDiscount(discount);
                  
                                                                      discountPercent = "";
                                                                      setDiscountPercent(discountPercent);
                  
                                                                      setErrors({ ...errors });
                                                                      timerRef.current = setTimeout(() => {
                                                                          reCalculate();
                                                                      }, 300);
                                                                      return;
                                                                  }
                  
                                                                  errors["discount_percent"] = "";
                                                                  errors["discount"] = "";
                                                                  setErrors({ ...errors });
                  
                                                                  discountPercent = parseFloat(e.target.value);
                                                                  setDiscountPercent(discountPercent);
                                                                  timerRef.current = setTimeout(() => {
                                                                      reCalculate();
                                                                  }, 300);
                                                              }} />{"%"}
                                                              {errors.discount_percent && (
                                                                  <div style={{ color: "red" }}>
                                                                      {errors.discount_percent}
                                                                  </div>
                                                              )}
                                                          </th>
                                                          <td className="text-end">
                                                              <input type="number" id="quotation_discount" disabled={true} name="quotation_discount" onWheel={(e) => e.target.blur()} style={{ width: "150px" }} className="text-start" value={discount} onChange={(e) => {
                                                                  if (timerRef.current) clearTimeout(timerRef.current);
                                                                  if (parseFloat(e.target.value) === 0) {
                                                                      discount = 0;
                                                                      setDiscount(discount);
                                                                      discountWithVAT = 0;
                                                                      setDiscountWithVAT(discountWithVAT);
                                                                      discountPercent = 0
                                                                      setDiscountPercent(discountPercent);
                                                                      discountPercentWithVAT = 0
                                                                      setDiscountPercent(discountPercentWithVAT);
                  
                                                                      errors["discount"] = "";
                                                                      setErrors({ ...errors });
                                                                      timerRef.current = setTimeout(() => {
                                                                          reCalculate();
                                                                      }, 300);
                                                                      return;
                                                                  }
                  
                                                                  if (parseFloat(e.target.value) < 0) {
                                                                      discount = 0;
                                                                      setDiscount(discount);
                                                                      discountWithVAT = 0;
                                                                      setDiscountWithVAT(discountWithVAT);
                                                                      discountPercent = 0
                                                                      setDiscountPercent(discountPercent);
                                                                      discountPercentWithVAT = 0
                                                                      setDiscountPercent(discountPercentWithVAT);
                                                                      // errors["discount"] = "Discount should be >= 0";
                                                                      setErrors({ ...errors });
                                                                      timerRef.current = setTimeout(() => {
                                                                          reCalculate();
                                                                      }, 300);
                                                                      return;
                                                                  }
                  
                                                                  if (!e.target.value) {
                                                                      discount = "";
                                                                      setDiscount(discount);
                                                                      discountWithVAT = "";
                                                                      setDiscountWithVAT(discountWithVAT);
                                                                      discountPercent = "";
                                                                      setDiscountPercent(discountPercent);
                                                                      discountPercentWithVAT = "";
                                                                      setDiscountPercent(discountPercentWithVAT);
                  
                                                                      setErrors({ ...errors });
                                                                      timerRef.current = setTimeout(() => {
                                                                          reCalculate();
                                                                      }, 300);
                  
                                                                      return;
                                                                  }
                  
                                                                  errors["discount"] = "";
                                                                  errors["discount_percent"] = "";
                                                                  setErrors({ ...errors });
                  
                  
                                                                  if (/^\d*\.?\d{0,2}$/.test(parseFloat(e.target.value)) === false) {
                                                                      errors["discount"] = "Max. decimal points allowed is 2";
                                                                      setErrors({ ...errors });
                                                                  }
                  
                                                                  discount = parseFloat(e.target.value);
                                                                  setDiscount(discount);
                                                                  //discountPercent = parseFloat(trimTo2Decimals((discount / formData.net_total) * 100))
                                                                  //setDiscountPercent(discountPercent);
                  
                                                                  timerRef.current = setTimeout(() => {
                                                                      reCalculate();
                                                                  }, 300);
                                                              }} />
                                                              {" "}
                                                              {errors.discount && (
                                                                  <div style={{ color: "red" }}>
                                                                      {errors.discount}
                                                                  </div>
                                                              )}
                                                          </td>
                                                      </tr>*/}
                  <tr>
                    <th colSpan="8" className="text-end">
                      Discount(with VAT) <input type="number" id="discount_percent" name="discount_percent" onWheel={(e) => e.target.blur()} disabled={true} style={{ width: "50px" }} className="text-start" value={discountPercentWithVAT} onChange={(e) => {
                        if (timerRef.current) clearTimeout(timerRef.current);
                        if (parseFloat(e.target.value) === 0) {

                          discountWithVAT = 0;
                          setDiscountWithVAT(discountWithVAT);

                          discountPercentWithVAT = 0;
                          setDiscountPercentWithVAT(discountPercentWithVAT);

                          discount = 0;
                          setDiscount(discount);

                          discountPercent = 0;
                          setDiscountPercent(discountPercent);

                          delete errors["discount_percent_with_vat"];
                          setErrors({ ...errors });
                          timerRef.current = setTimeout(() => {
                            reCalculate();
                          }, 300);
                          return;
                        }

                        if (parseFloat(e.target.value) < 0) {
                          discountWithVAT = 0;
                          setDiscountWithVAT(discountWithVAT);

                          discountPercentWithVAT = 0;
                          setDiscountPercentWithVAT(discountPercentWithVAT);

                          discount = 0;
                          setDiscount(discount);

                          discountPercent = 0;
                          setDiscountPercent(discountPercent);

                          errors["discount_percent"] = "Discount percent should be >= 0";
                          setErrors({ ...errors });
                          timerRef.current = setTimeout(() => {
                            reCalculate();
                          }, 300);
                          return;
                        }

                        if (!e.target.value) {
                          discountWithVAT = "";
                          setDiscountWithVAT(discountWithVAT);

                          discountPercentWithVAT = "";
                          setDiscountPercentWithVAT(discountPercentWithVAT);

                          discount = "";
                          setDiscount(discount);

                          discountPercent = "";
                          setDiscountPercent(discountPercent);

                          setErrors({ ...errors });
                          timerRef.current = setTimeout(() => {
                            reCalculate();
                          }, 300);
                          return;
                        }

                        delete errors["discount_percent"];
                        delete errors["discount"];
                        setErrors({ ...errors });

                        discountPercentWithVAT = parseFloat(e.target.value);
                        setDiscountPercentWithVAT(discountPercentWithVAT);
                        timerRef.current = setTimeout(() => {
                          reCalculate();
                        }, 300);
                      }} />{"%"}
                      {errors.discount_percent_with_vat && (
                        <div style={{ color: "red" }}>
                          {errors.discount_percent_with_vat}
                        </div>
                      )}
                    </th>
                    <td className="text-end">
                      <input type="number" id="quotation_discoun_with_vat" name="quotation_discount_with_vat" onWheel={(e) => e.target.blur()} style={{ width: "150px" }} className="text-start" value={discountWithVAT} onChange={(e) => {
                        if (timerRef.current) clearTimeout(timerRef.current);
                        if (parseFloat(e.target.value) === 0) {
                          discount = 0;
                          discountWithVAT = 0;
                          discountPercent = 0
                          setDiscount(discount);
                          setDiscountWithVAT(discount);
                          setDiscountPercent(discount);
                          delete errors["discount"];
                          setErrors({ ...errors });
                          timerRef.current = setTimeout(() => {
                            reCalculate();
                          }, 300);
                          return;
                        }

                        if (parseFloat(e.target.value) < 0) {
                          discount = 0.00;
                          discountWithVAT = 0.00;
                          discountPercent = 0.00;
                          setDiscount(discount);
                          setDiscountWithVAT(discount);
                          setDiscountPercent(discountPercent);
                          // errors["discount"] = "Discount should be >= 0";
                          setErrors({ ...errors });
                          timerRef.current = setTimeout(() => {
                            reCalculate();
                          }, 300);
                          return;
                        }

                        if (!e.target.value) {
                          discount = "";
                          discountWithVAT = "";
                          discountPercent = "";
                          // errors["discount"] = "Invalid Discount";
                          setDiscount(discount);
                          setDiscountWithVAT(discount);
                          setDiscountPercent(discountPercent);
                          setErrors({ ...errors });
                          timerRef.current = setTimeout(() => {
                            reCalculate();
                          }, 300);

                          return;
                        }

                        delete errors["discount"];
                        delete errors["discount_percent"];
                        setErrors({ ...errors });


                        if (/^\d*\.?\d{0, 2}$/.test(parseFloat(e.target.value)) === false) {
                          errors["discount"] = "Max. decimal points allowed is 2";
                          setErrors({ ...errors });
                        }

                        discountWithVAT = parseFloat(e.target.value);
                        setDiscountWithVAT(discountWithVAT);
                        //discountPercent = parseFloat(trimTo2Decimals((discount / formData.net_total) * 100))
                        //setDiscountPercent(discountPercent);

                        timerRef.current = setTimeout(() => {
                          reCalculate();
                        }, 300);
                      }} />
                      {" "}
                      {errors.discount && (
                        <div style={{ color: "red" }}>
                          {errors.discount}
                        </div>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <th colSpan="8" className="text-end">
                      Total Taxable Amount(without VAT)
                      <OverlayTrigger placement="right" overlay={renderTooltip}>
                        <span style={{ textDecoration: 'underline dotted', cursor: 'pointer' }}>ℹ️</span>
                      </OverlayTrigger>

                    </th>
                    <td className="text-end" style={{ width: "200px" }} >
                      <NumberFormat
                        value={trimTo2Decimals(formData.total + shipping - discount)}
                        displayType={"text"}
                        thousandSeparator={true}
                        suffix={" "}
                        renderText={(value, props) => value}
                      />
                    </td>
                  </tr>
                  <tr>

                    <th colSpan="8" className="text-end"> VAT  <input type="number" id="quotation_vat_percent" name="quotation_vat_percent" onWheel={(e) => e.target.blur()} disabled={true} className="text-center" style={{ width: "50px" }} value={formData.vat_percent} onChange={(e) => {
                      console.log("Inside onchange vat percent");
                      if (parseFloat(e.target.value) === 0) {
                        formData.vat_percent = parseFloat(e.target.value);
                        setFormData({ ...formData });
                        delete errors["vat_percent"];
                        setErrors({ ...errors });
                        reCalculate();
                        return;
                      }
                      if (parseFloat(e.target.value) < 0) {
                        formData.vat_percent = parseFloat(e.target.value);
                        formData.vat_price = 0.00;

                        setFormData({ ...formData });
                        errors["vat_percent"] = "Vat percent should be >= 0";
                        setErrors({ ...errors });
                        reCalculate();
                        return;
                      }


                      if (!e.target.value) {
                        formData.vat_percent = "";
                        formData.vat_price = 0.00;
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
                    }} />{"%"}
                      {errors.vat_percent && (
                        <div style={{ color: "red" }}>
                          {errors.vat_percent}
                        </div>
                      )}
                    </th>
                    <td className="text-end">
                      <NumberFormat
                        value={trimTo2Decimals(formData.vat_price)}
                        displayType={"text"}
                        thousandSeparator={true}
                        suffix={" "}
                        renderText={(value, props) => value}
                      />
                    </td>
                  </tr>
                  <tr>

                    <th colSpan="8" className="text-end">
                      Net Total(with VAT)
                      <OverlayTrigger placement="right" overlay={renderNetTotalTooltip}>
                        <span style={{ textDecoration: 'underline dotted', cursor: 'pointer' }}>ℹ️</span>
                      </OverlayTrigger>
                    </th>
                    <th className="text-end">
                      <NumberFormat
                        value={trimTo2Decimals(formData.net_total)}
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

            {formData.type === "invoice" && <>
              <div className="col-md-2">
                <label className="form-label">Cash discount</label>
                <input type='number' id="quotation_cash_discount"
                  name="quotation_cash_discount" value={formData.cash_discount} className="form-control "
                  onChange={(e) => {
                    delete errors["cash_discount"];
                    setErrors({ ...errors });
                    if (!e.target.value) {
                      formData.cash_discount = e.target.value;
                      setFormData({ ...formData });
                      validatePaymentAmounts();
                      return;
                    }
                    formData.cash_discount = parseFloat(e.target.value);
                    if (formData.cash_discount > 0 && formData.cash_discount >= formData.net_total) {
                      errors["cash_discount"] = "Cash discount should not be >= " + formData.net_total.toString();
                      setErrors({ ...errors });
                      return;
                    }

                    setFormData({ ...formData });
                    validatePaymentAmounts();
                    console.log(formData);
                  }}
                />
                {errors.cash_discount && (
                  <div style={{ color: "red" }}>
                    {errors.cash_discount}
                  </div>
                )}
              </div>

              <div className="col-md-8">
                <label className="form-label">Payments Received</label>

                <div class="table-responsive" style={{ maxWidth: "900px" }}>
                  <Button variant="secondary" style={{ alignContent: "right", marginBottom: "10px" }} onClick={addNewPayment}>
                    Create new payment
                  </Button>
                  <table class="table table-striped table-sm table-bordered">
                    {formData.payments_input && formData.payments_input.length > 0 &&
                      <thead>
                        <th>
                          Date
                        </th>
                        <th>
                          Amount
                        </th>
                        <th>
                          Payment method
                        </th>
                        <th>
                          Action
                        </th>
                      </thead>}
                    <tbody>
                      {formData.payments_input &&
                        formData.payments_input.filter(payment => !payment.deleted).map((payment, key) => (
                          <tr key={key}>
                            <td style={{ minWidth: "220px" }}>

                              <DatePicker
                                id="payment_date_str"
                                selected={formData.payments_input[key].date_str ? new Date(formData.payments_input[key].date_str) : null}
                                value={formData.payments_input[key].date_str ? format(
                                  new Date(formData.payments_input[key].date_str),
                                  "MMMM d, yyyy h:mm aa"
                                ) : null}
                                className="form-control"
                                dateFormat="MMMM d, yyyy h:mm aa"
                                showTimeSelect
                                timeIntervals="1"
                                onChange={(value) => {
                                  console.log("Value", value);
                                  formData.payments_input[key].date_str = value;
                                  setFormData({ ...formData });
                                }}
                              />
                              {errors["payment_date_" + key] && (
                                <div style={{ color: "red" }}>

                                  {errors["payment_date_" + key]}
                                </div>
                              )}
                            </td>
                            <td style={{ width: "300px" }}>
                              <input type='number' id={`${"quotation_payment_amount" + key}`} name={`${"quotation_payment_amount" + key}`} value={formData.payments_input[key].amount} className="form-control "
                                onChange={(e) => {
                                  delete errors["payment_amount_" + key];
                                  setErrors({ ...errors });

                                  if (!e.target.value) {
                                    formData.payments_input[key].amount = e.target.value;
                                    setFormData({ ...formData });
                                    validatePaymentAmounts();
                                    return;
                                  }

                                  formData.payments_input[key].amount = parseFloat(e.target.value);

                                  validatePaymentAmounts();
                                  setFormData({ ...formData });
                                  console.log(formData);
                                }}
                              />
                              {errors["payment_amount_" + key] && (
                                <div style={{ color: "red" }}>

                                  {errors["payment_amount_" + key]}
                                </div>
                              )}
                            </td>
                            <td style={{ width: "200px" }}>
                              <select value={formData.payments_input[key].method} className="form-control "
                                onChange={(e) => {
                                  // errors["payment_method"] = [];
                                  delete errors["payment_method_" + key];
                                  setErrors({ ...errors });

                                  if (!e.target.value) {
                                    errors["payment_method_" + key] = "Payment method is required";
                                    setErrors({ ...errors });

                                    formData.payments_input[key].method = "";
                                    setFormData({ ...formData });
                                    return;
                                  }

                                  // errors["payment_method"] = "";
                                  //setErrors({ ...errors });

                                  formData.payments_input[key].method = e.target.value;
                                  setFormData({ ...formData });
                                  console.log(formData);
                                }}
                              >
                                <option value="">Select</option>
                                <option value="cash">Cash</option>
                                <option value="debit_card">Debit Card</option>
                                <option value="credit_card">Credit Card</option>
                                <option value="bank_card">Bank Card</option>
                                <option value="bank_transfer">Bank Transfer</option>
                                <option value="bank_cheque">Bank Cheque</option>
                                {formData.customer_id && <option value="customer_account">Customer Account</option>}
                              </select>
                              {errors["payment_method_" + key] && (
                                <div style={{ color: "red" }}>

                                  {errors["payment_method_" + key]}
                                </div>
                              )}
                            </td>
                            <td style={{ width: "200px" }}>
                              <Button variant="danger" onClick={(event) => {
                                removePayment(key);
                              }}>
                                Remove
                              </Button>

                            </td>
                          </tr>
                        ))}
                      <tr>
                        <td class="text-end">
                          <b>Total</b>
                        </td>
                        <td><b style={{ marginLeft: "14px" }}>{trimTo2Decimals(totalPaymentAmount)}</b>
                          {errors["total_payment"] && (
                            <div style={{ color: "red" }}>
                              {errors["total_payment"]}
                            </div>
                          )}
                        </td>
                        <td>
                          <b style={{ marginLeft: "12px", alignSelf: "end" }}>Balance: {trimTo2Decimals(balanceAmount)}</b>
                          {errors["customer_credit_limit"] && (
                            <div style={{ color: "red" }}>
                              {errors["customer_credit_limit"]}
                            </div>
                          )}
                        </td>
                        <td colSpan={1}>
                          <b>Payment status: </b>
                          {paymentStatus === "paid" ?
                            <span className="badge bg-success">
                              Paid
                            </span> : ""}
                          {paymentStatus === "paid_partially" ?
                            <span className="badge bg-warning">
                              Paid Partially
                            </span> : ""}
                          {paymentStatus === "not_paid" ?
                            <span className="badge bg-danger">
                              Not Paid
                            </span> : ""}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                </div>
              </div>
            </>}

            <div className="col-md-3">
              <label className="form-label">Sales ID</label>
              <div className="input-group mb-3">
                <input
                  id="quotation_order_code"
                  name="quotation_order_code"
                  value={formData.order_code ? formData.order_code : ""}
                  type='string'
                  onChange={(e) => {
                    delete errors["order_code"];
                    setErrors({ ...errors });
                    formData.order_id = "";
                    formData.order_code = e.target.value;
                    setFormData({ ...formData });
                    console.log(formData);
                  }}
                  className="form-control"

                  placeholder="Sales ID"
                />
                <Button className="btn btn-primary" style={{ marginLeft: "0px" }} onClick={() => {
                  openSales();
                }}>
                  <i className="bi bi-list"></i>
                </Button>
              </div>
              {errors.order_code && (
                <div style={{ color: "red" }}>
                  {errors.order_code}
                </div>
              )}

            </div>

            {formData.type === "quotation" && <>
              <div className="col-md-2">
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

                      delete errors["status"];
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
                      {errors.status}
                    </div>
                  )}
                </div>
              </div>




              <div className="col-md-3">
                <label className="form-label">Validity (# of Days)*</label>
                <div className="input-group mb-3">
                  <input
                    id="quotation_validity_days"
                    name="quotation_validity_days"
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

                      delete errors["validity_days"];
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
                </div>
              </div>

              <div className="col-md-3">
                <label className="form-label">Delivery (# of Days)*</label>

                <div className="input-group mb-3">
                  <input
                    id="quotation_delivery_days"
                    name="quotation_delivery_days"
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

                      delete errors["delivery_days"];
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
                      {errors.delivery_days}
                    </div>
                  )}
                </div>
              </div>
            </>}

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
