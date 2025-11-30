import React, {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  useMemo,
  useCallback,
} from "react";
import { Modal, Button } from "react-bootstrap";
import { OverlayTrigger, Tooltip, Dropdown, Spinner } from 'react-bootstrap';
import { Typeahead, Menu, MenuItem } from "react-bootstrap-typeahead";
import StoreCreate from "../store/create.js";
import ProductCategoryCreate from "../product_category/create.js";
import ProductBrandCreate from "../product_brand/create.js";
import countryList from 'react-select-country-list';
import ImageGallery from '../utils/ImageGallery.js';
import { trimTo2Decimals, trimTo8Decimals, trimTo4Decimals } from "../utils/numberUtils";
import Amount from "../utils/amount.js";
import SalesHistory from "./../product/sales_history.js";
import SalesReturnHistory from "./../product/sales_return_history.js";
import PurchaseHistory from "./../product/purchase_history.js";
import PurchaseReturnHistory from "./../product/purchase_return_history.js";
import QuotationHistory from "./../product/quotation_history.js";
import QuotationSalesReturnHistory from "./../product/quotation_sales_return_history.js";
import DeliveryNoteHistory from "./../product/delivery_note_history.js";
import Products from "../utils/products.js";
import ImageViewerModal from './../utils/ImageViewerModal';
import { highlightWords } from "../utils/search.js";
import ProductHistory from "./../product/product_history.js";
import DatePicker from "react-datepicker";
import { format } from "date-fns";

const columnStyle = {
  width: '20%',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
  paddingRight: '8px',
};




const ProductCreate = forwardRef((props, ref) => {


  const countryOptions = useMemo(() => countryList().getData(), [])
  //const [selectedCountry, setSelectedCountry] = useState('')
  let [selectedCountries, setSelectedCountries] = useState([]);

  const timerRef = useRef(null);

  useImperativeHandle(ref, () => ({
    async open(id, linkToProductID) {
      selectedCategories = [];
      setSelectedCategories(selectedCategories);

      formData = {
        images_content: [],
        unit: "",
        item_code: "",
        store_id: localStorage.getItem("store_id"),
        set: {
          name: "",
          products: [],
        },
      };

      if (linkToProductID) {
        formData["link_to_product_id"] = linkToProductID
      }
      setFormData(formData);
      // await getAllStores();
      await getStore(localStorage.getItem("store_id"));

      if (id) {
        await getProduct(id);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          ImageGalleryRef.current?.open();
        }, 400);

      }

      SetShow(true);
    },
  }));


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
        //stores = data.result;
        //setStores(data.result);
        productStores = {};
        productStores[store.id] = {
          store_id: store.id,
          store_name: store.name,
          purchase_unit_price: 0.00,
          retail_unit_price: 0.00,
          wholesale_unit_price: 0.00,
          stock: 0.00,
          with_vat: store?.settings?.default_unit_price_is_with_vat,
        };

        setProductStores({ ...productStores });
      })
      .catch(error => {

      });
  }


  useEffect(() => {
    const listener = (event) => {
      if (event.code === "Enter" || event.code === "NumpadEnter") {
        console.log("Enter key was pressed. Run your function-product.");
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




  let [productStores, setProductStores] = useState({});


  let [selectedCategories, setSelectedCategories] = useState([]);
  let [selectedBrands, setSelectedBrands] = useState([]);
  let [categoryOptions, setCategoryOptions] = useState([]);
  let [brandOptions, setBrandOptions] = useState([]);

  let [errors, setErrors] = useState({});
  const [isProcessing, setProcessing] = useState(false);

  //fields
  let [formData, setFormData] = useState({
    images_content: [],
    unit: "",
    item_code: "",
    images: [],
  });

  const translateText = useCallback(async (text) => {
    if (store.settings.enable_auto_translation_to_arabic !== true) {
      return;
    }

    try {
      const response = await fetch('/v1/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json', // Send as JSON
          Authorization: localStorage.getItem("access_token"),
        },
        body: JSON.stringify({ text }), // Convert the payload to JSON
      });

      if (!response.ok) {
        throw new Error('Failed to fetch translation');
      }

      const data = await response.json();

      // Create a new copy of formData and update it
      setFormData((prevFormData) => ({
        ...prevFormData,
        name_in_arabic: data.translatedText,
      }));

      return data.translatedText;
    } catch (error) {
      console.error('Translation error:', error);
      return '';
    }
  }, [store]);

  const [show, SetShow] = useState(false);

  function handleClose() {
    SetShow(false);
  }

  async function getProductObj(id) {
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
      const response = await fetch(`/v1/product/${id}?select=id,images,store_id&${queryParams}`, requestOptions);
      const isJson = response.headers.get("content-type")?.includes("application/json");
      const data = isJson ? await response.json() : null;

      if (!response.ok) {
        const error = data?.errors || "Unknown error";
        throw error;
      }

      return data.result;  // ✅ return the result here
    } catch (error) {
      return null;  // ✅ explicitly return null or a fallback if there's an error
    }
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

    await fetch("/v1/product/" + id + "?" + queryParams, requestOptions)
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

        let categoryIds = data.result.category_id;
        let categoryNames = data.result.category_name;

        selectedCategories = [];
        if (categoryIds && categoryNames) {
          for (var i = 0; i < categoryIds.length; i++) {
            selectedCategories.push({
              id: categoryIds[i] ? categoryIds[i] : " ",
              name: categoryNames[i] ? categoryNames[i] : " ",
            });
          }
        }
        setSelectedCategories(selectedCategories);


        selectedBrands = [];
        if (data.result.brand_id) {
          selectedBrands.push({
            id: data.result.brand_id,
            name: data.result.brand_name ? data.result.brand_name : "",
          });
        }
        console.log("selectedBrands:", selectedBrands);
        setSelectedBrands(selectedBrands);

        selectedCountries = [];
        if (data.result.country_code && data.result.country_name) {
          selectedCountries.push({
            value: data.result.country_code,
            label: data.result.country_name,
          });
        }
        setSelectedCountries(selectedCountries);

        setSelectedLinkedProducts([]);
        if (data.result.linked_products) {
          setSelectedLinkedProducts(data.result.linked_products);
        }




        if (data.result.product_stores) {
          console.log("data.result.product_stores-ok:", data.result.product_stores);
          productStores[localStorage.getItem('store_id')] = data.result.product_stores[localStorage.getItem('store_id')];
          setProductStores({ ...productStores });
          console.log("productStores-ok:", productStores);

          if (data.result.product_stores[localStorage.getItem('store_id')]?.stock_adjustments) {
            // console.log("data.result.payments:", data.result.payments);
            // formData.payments_input = data.result.payments;
            for (let i = 0; i < data.result.product_stores[localStorage.getItem('store_id')]?.stock_adjustments?.length; i++) {
              productStores[localStorage.getItem('store_id')].stock_adjustments[i].date_str = data.result.product_stores[localStorage.getItem('store_id')]?.stock_adjustments[i].date;
            }
            setProductStores({ ...productStores });
            setFormData({ ...formData });
          }

          // productStores.push(data.result.stores);

          //let i = 0;
          /*
          for (const key in data.result.product_stores) {
            console.log("key: ", key);
            if (productStores[i].store_id === data.result.product_stores[key].store_id) {
              selectedStoreIndex = i;
              setSelectedStoreIndex(i);
              productStores[i].purchase_unit_price = data.result.product_stores[key].purchase_unit_price;
              productStores[i].wholesale_unit_price = data.result.product_stores[key].wholesale_unit_price;
              productStores[i].retail_unit_price = data.result.product_stores[key].retail_unit_price;
              productStores[i].stock = data.result.product_stores[key].stock;
              productStores[i].damaged_stock = data.result.product_stores[key].damaged_stock;
           
              i++;
            }
          }*/

        }



        formData = data.result;
        formData.name = data.result.name;
        if (data.result.images) {
          formData.images = data.result.images;
        } else {
          formData.images = [];
        }



        if (!formData.unit) {
          formData.unit = "";
        }
        formData.images_content = [];
        formData.useLaserScanner = false;
        setFormData({ ...formData });
      })
      .catch((error) => {
        setProcessing(false);
        setErrors(error);
      });
  }

  async function suggestCategories(searchTerm) {
    console.log("Inside handle suggest Categories");

    console.log("searchTerm:" + searchTerm);
    if (!searchTerm) {
      return;
    }

    var params = {
      name: searchTerm,
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

    let Select = "select=id,name";
    let result = await fetch(
      "/v1/product-category?" + Select + queryString,
      requestOptions
    );
    let data = await result.json();

    setCategoryOptions(data.result);
  }

  async function suggestBrands(searchTerm) {
    console.log("Inside handle suggest Brands");

    console.log("searchTerm:" + searchTerm);
    if (!searchTerm) {
      return;
    }

    var params = {
      name: searchTerm,
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

    let Select = "select=id,code,name";
    setIsBrandsLoading(true);

    let result = await fetch(
      "/v1/product-brand?" + Select + queryString,
      requestOptions
    );
    setIsBrandsLoading(false);

    let data = await result.json();
    setBrandOptions(data.result);
  }


  useEffect(() => {
    let at = localStorage.getItem("access_token");
    if (!at) {
      window.location = "/";
    }
  });

  function ObjectToSearchQueryParams(object) {
    return Object.keys(object)
      .map(function (key) {
        return `search[${key}]=${object[key]}`;
      })
      .join("&");
  }

  function handleCreate(event) {
    event.preventDefault();
    console.log("Inside handle Create");
    let haveErrors = false;
    errors = {};
    setErrors({ ...errors });

    for (var i = 0; i < formData.set?.products?.length; i++) {
      if (!formData.set?.products[i].quantity) {
        formData.set.products[i].quantity = 0;
      }

      if (!formData.set.products[i].quantity) {
        errors["set_product_quantity_" + i] = "Quantity is required";
        haveErrors = true;
        setErrors({ ...errors });
      }

      if (!formData.set?.products[i].retail_unit_price) {
        formData.set.products[i].retail_unit_price = 0;
      }

      if (!formData.set?.products[i].retail_unit_price_with_vat) {
        formData.set.products[i].retail_unit_price_with_vat = 0;
      }

      /*
      if (/^\d*\.?\d{0,3}$/.test(formData.set?.products[i].quantity) === false) {
        errors["set_product_quantity_" + i] = "Only 3 decimal points are allowed";
        haveErrors = true;
        setErrors({ ...errors });
      }*/

      if (/^\d*\.?\d{0,8}$/.test(formData.set?.products[i].retail_unit_price_with_vat) === false) {
        errors["set_product_unit_price_with_vat_" + i] = "Only 8 decimal points are allowed";
        haveErrors = true;
        setErrors({ ...errors });
      }

      if (/^\d*\.?\d{0,8}$/.test(formData.set?.products[i].retail_unit_price) === false) {
        errors["set_product_unit_price_" + i] = "Only 8 decimal points are allowed";
        haveErrors = true;
        setErrors({ ...errors });
      }
    }


    formData.category_id = [];
    for (i = 0; i < selectedCategories.length; i++) {
      formData.category_id.push(selectedCategories[i].id);
    }

    formData.linked_product_ids = [];
    for (i = 0; i < selectedLinkedProducts.length; i++) {
      formData.linked_product_ids.push(selectedLinkedProducts[i].id);
    }

    console.log("productStores:", productStores);


    // let storesData = {};
    formData.product_stores = productStores;
    /*storesData[productStores[selectedStoreIndex].store_id] = {
      "store_id": productStores[selectedStoreIndex].store_id,
      "store_name": productStores[selectedStoreIndex].store_name,
      "retail_unit_price": productStores[selectedStoreIndex].retail_unit_price ? productStores[selectedStoreIndex].retail_unit_price : 0,
      "wholesale_unit_price": productStores[selectedStoreIndex].wholesale_unit_price ? productStores[selectedStoreIndex].wholesale_unit_price : 0,
      "purchase_unit_price": productStores[selectedStoreIndex].purchase_unit_price ? productStores[selectedStoreIndex].purchase_unit_price : 0,
      "stock": productStores[selectedStoreIndex].stock ? productStores[selectedStoreIndex].stock : 0,
      "damaged_stock": productStores[selectedStoreIndex].damaged_stock ? productStores[selectedStoreIndex].damaged_stock : 0,
     
    };*/
    //console.log("saving to store id:" + productStores[selectedStoreIndex].store_id);


    //for (let i = 0; i < productStores.length; i++) {

    /*
    if (productStores[i]?.retail_unit_price) {
      if (/^\d*\.?\d{0,8}$/.test(productStores[i]?.retail_unit_price) === false) {
        errors["retail_unit_price_" + i] = "Only 8 decimal points are allowed";
        haveErrors = true;
        setErrors({ ...errors });
      }
    }*/




    /* storesData[productStores[i].store_id] = {
       "store_id": productStores[i].store_id,
       "store_name": productStores[i].store_name,
       "retail_unit_price": productStores[i].retail_unit_price ? productStores[i].retail_unit_price : 0,
       "wholesale_unit_price": productStores[i].wholesale_unit_price ? productStores[i].wholesale_unit_price : 0,
       "purchase_unit_price": productStores[i].purchase_unit_price ? productStores[i].purchase_unit_price : 0,
       "stock": productStores[i].stock ? productStores[i].stock : 0,
       "damaged_stock": productStores[i].damaged_stock ? productStores[i].damaged_stock : 0,
     };*/
    /*
        storesData.push({
            "store_id": productStores[i].store_id,
            "store_name": productStores[i].store_name,
            "retail_unit_price": productStores[i].retail_unit_price?productStores[i].retail_unit_price:0,
            "wholesale_unit_price": productStores[i].wholesale_unit_price?productStores[i].wholesale_unit_price:0,
            "purchase_unit_price": productStores[i].purchase_unit_price?productStores[i].purchase_unit_price:0,
            "stock": productStores[i].stock?productStores[i].stock:0,
        });
        */
    // }




    /*
    if (localStorage.getItem("store_id")) {
      formData.store_id = localStorage.getItem("store_id");
    }
    */

    console.log("Formdata:", formData);

    if (haveErrors) {
      console.log("Errors: ", errors);
      return;
    }

    formData.barcode_base64 = "";
    let endPoint = "/v1/product";
    let method = "POST";
    if (formData.id) {
      endPoint = "/v1/product/" + formData.id;
      method = "PUT";
    }

    if (localStorage.getItem("store_id")) {
      formData.store_id = localStorage.getItem("store_id");
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
        formData.id = data.result?.id;
        setFormData({ ...formData });

        // alert("Starting Images upload")
        await ImageGalleryRef.current.uploadAllImages();
        //alert("Images upload done")

        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          // alert("Going to product view")
          setProcessing(false);

          console.log("Response after creating  product:");
          console.log(data);
          if (formData.id) {
            if (props.showToastMessage) props.showToastMessage("Product updated successfully!", "success");
          } else {
            if (props.showToastMessage) props.showToastMessage("Product created successfully!", "success");
          }

          if (props.refreshList) {
            props.refreshList();
          }

          handleClose();
          if (props.openDetailsView)
            props.openDetailsView(data.result.id);

        }, 300);





      })
      .catch((error) => {
        setProcessing(false);
        console.log("Inside catch");
        console.log(error);
        setErrors({ ...error });
        console.error("There was an error!", error);
        if (props.showToastMessage) props.showToastMessage("Failed to process product!", "danger");
      });
  }




  /*
    const DetailsViewRef = useRef();
    function openDetailsView(id) {
        console.log("id:", id);
        DetailsViewRef.current.open(id);
    }
    */

  const StoreCreateFormRef = useRef();
  const ProductCategoryCreateFormRef = useRef();
  function openProductCategoryCreateForm() {
    ProductCategoryCreateFormRef.current.open();
  }
  const ProductBrandCreateFormRef = useRef();
  function openProductBrandCreateForm() {
    ProductBrandCreateFormRef.current.open();
  }

  const [isBrandsLoading, setIsBrandsLoading] = useState(false);

  function makePartNumberPrefix() {
    if (formData.brand_code && formData.country_code) {
      formData.prefix_part_number = formData.brand_code + "-" + formData.country_code
    } else if (formData.brand_code) {
      formData.prefix_part_number = formData.brand_code;
    } else if (formData.country_code) {
      formData.prefix_part_number = formData.country_code;
    } else {
      formData.prefix_part_number = "";
    }

    formData.prefix_part_number = formData.prefix_part_number.toUpperCase();
    setFormData({ ...formData });
  }

  const [productOptions, setProductOptions] = useState([]);
  //let [openProductSearchResult, setOpenProductSearchResult] = useState(false);
  //const [isProductsLoading, setIsProductsLoading] = useState(false);
  let [selectedLinkedProducts, setSelectedLinkedProducts] = useState([]);

  const productSearchRef = useRef();


  const [productSetOptions, setProductSetOptions] = useState([]);
  const productSetSearchRef = useRef();
  let [openProductSetSearchResult, setOpenProductSetSearchResult] = useState(false);

  let [openProductSearchResult, setOpenProductSearchResult] = useState(false);

  const normalize = (str) => (str || '').toString().toLowerCase();
  const customFilter = useCallback((option, query) => {
    const q = normalize(query);

    let partNoLabel = "";
    if (option.prefix_part_number) {
      partNoLabel = option.prefix_part_number + "-" + option.part_number;
    }

    return (
      normalize(partNoLabel).includes(q) ||
      normalize(option.prefix_part_number).includes(q) ||
      normalize(option.part_number).includes(q) ||
      normalize(option.name).includes(q) ||
      normalize(option.name_in_arabic).includes(q) ||
      normalize(option.country_name).includes(q) ||
      normalize(option.brand_name).includes(q) ||
      (Array.isArray(option.additional_keywords) &&
        option.additional_keywords.some((kw) => normalize(kw).includes(q)))
    );
  }, []);

  const suggestProducts = useCallback(async (searchTerm, type) => {
    console.log("Inside handle suggestProducts");
    if (type === "set") {
      setProductSetOptions([]);
    } else {
      setProductOptions([]);
    }


    console.log("searchTerm:" + searchTerm);
    if (!searchTerm) {
      // openProductSearchResult = false;

      setTimeout(() => {
        // setOpenProductSearchResult(false);
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

    let Select = `select=id,additional_keywords,search_label,set.name,item_code,prefix_part_number,country_name,brand_name,part_number,name,unit,name_in_arabic,product_stores.${localStorage.getItem('store_id')}.purchase_unit_price,product_stores.${localStorage.getItem('store_id')}.purchase_unit_price_with_vat,product_stores.${localStorage.getItem('store_id')}.retail_unit_price,product_stores.${localStorage.getItem('store_id')}.retail_unit_price_with_vat,product_stores.${localStorage.getItem('store_id')}.stock,product_stores.${localStorage.getItem('store_id')}.warehouse_stocks`;
    //setIsProductsLoading(true);
    let result = await fetch(
      "/v1/product?" + Select + queryString + "&limit=50&sort=-country_name",
      requestOptions
    );
    let data = await result.json();

    let products = data.result;
    if (!products || products.length === 0) {
      if (type === "set") {
        setOpenProductSetSearchResult(false);
      } else {
        setOpenProductSearchResult(false);
      }

      // setIsProductsLoading(false);
      return;
    }



    /*
    const sortedProducts = products
      .filter(item => item.country_name)                        // Keep only items with name
      .sort((a, b) => a.country_name.localeCompare(b.country_name))     // Sort alphabetically
      .concat(products.filter(item => !item.country_name));*/



    const filtered = products.filter((opt) => customFilter(opt, searchTerm));

    const sorted = filtered.sort((a, b) => {
      const aHasCountry = a.country_name && a.country_name.trim() !== "";
      const bHasCountry = b.country_name && b.country_name.trim() !== "";

      // If both have country, sort by country_name ascending
      if (aHasCountry && bHasCountry) {
        return a.country_name.localeCompare(b.country_name);
      }

      // If only a has country, it comes before b
      if (aHasCountry && !bHasCountry) {
        return -1;
      }

      // If only b has country, it comes before a
      if (!aHasCountry && bHasCountry) {
        return 1;
      }

      // Both have no country, keep original order or sort as needed
      return 0;
    });



    if (type === "set") {
      setOpenProductSetSearchResult(true);
      setProductSetOptions(sorted);
    } else {
      setOpenProductSearchResult(true);
      setProductOptions(sorted);
    }

    //setIsProductsLoading(false);

  }, [customFilter]);


  const ImageGalleryRef = useRef();
  /*
  function openImageGallery() {
    ImageGalleryRef.current.open();
  }*/

  let [damagedStock, setDamagedStock] = useState('');
  const [operationType, setOperationType] = useState(null); // 'add' or 'remove'

  const inputRefs = useRef({});
  const countrySearchRef = useRef();
  const brandSearchRef = useRef();
  const categorySearchRef = useRef();

  function AddProductToSet(product) {
    console.log("product:", product);
    if (!formData.set) {
      formData["set"] = {};
    }

    if (!formData.set.products) {
      formData["set"]["products"] = [];
    }



    if (product.product_stores && product.product_stores[formData.store_id]?.retail_unit_price) {
      product.unit_price = product.product_stores[formData.store_id].retail_unit_price;
      product.unit_price_with_vat = product.product_stores[formData.store_id].retail_unit_price_with_vat;
    } else {
      product.unit_price = 0;
      product.unit_price_with_vat = 0;
    }


    if (product.product_stores && product.product_stores[formData.store_id]?.purchase_unit_price) {
      product.purchase_unit_price = product.product_stores[formData.store_id].purchase_unit_price;
      product.purchase_unit_price_with_vat = product.product_stores[formData.store_id].purchase_unit_price_with_vat;
    } else {
      product.purchase_unit_price = 0;
      product.purchase_unit_price_with_vat = 0;
    }

    if (IsProductExistsInSet(product.id)) {
      //let index = getProductIndexInSET(product.id);
      // formData.set.products[index].quantity++;
    } else {
      formData.set.products.push({
        "product_id": product.id,
        "part_number": product.part_number,
        "name": product.name,
        "quantity": 1,
        "unit": product.unit,
        "purchase_unit_price": product.purchase_unit_price,
        "purchase_unit_price_with_vat": product.purchase_unit_price_with_vat,
        "retail_unit_price": product.unit_price,
        "retail_unit_price_with_vat": product.unit_price_with_vat,
      });
    }


    setFormData({ ...formData });
    findSetTotal();
  }


  function IsProductExistsInSet(productID) {
    for (var i = 0; i < formData.set.products?.length; i++) {
      if (formData.set.products[i].product_id === productID) {
        return true;
      }
    }
    return false;
  }

  function IsProductExistsInLinkedProducts(productID) {
    for (var i = 0; i < selectedLinkedProducts.length; i++) {
      if (selectedLinkedProducts[i].id === productID) {
        return true;
      }
    }
    return false;
  }

  function removeProductFromLinkedProducts(product) {
    for (var i = 0; i < selectedLinkedProducts.length; i++) {
      if (selectedLinkedProducts[i].id === product.id) {
        selectedLinkedProducts.splice(i, 1);
        setSelectedLinkedProducts([...selectedLinkedProducts]);
        return true;
      }
    }
  }



  /*
  function getProductIndexInSET(productID) {
    for (var i = 0; i < formData.set.products.length; i++) {
      if (formData.set.products[i].product_id === productID) {
        return i;
      }
    }
  }*/

  function RemoveProductFromSet(index) {
    if (index > -1) {
      formData.set.products.splice(index, 1);
    }
    setFormData({ ...formData });
    findSetTotal();
  }

  function RemoveProductFromSetByObj(product) {
    // alert(formData.set.products.length)
    for (var i = 0; i < formData.set.products.length; i++) {
      // alert(formData.set.products[i].id);
      if (formData.set.products[i].product_id === product.id) {
        formData.set.products.splice(i, 1);
        // alert("Removed")
        setFormData({ ...formData });
        findSetTotal();
        return true;
      }
    }
    return false
  }

  function findSetTotal() {
    let purchaseTotal = 0.00;
    let purchaseTotalWithVAT = 0.00;

    let total = 0.00;
    let totalWithVAT = 0.00;

    let totalQuantity = 0.00;
    for (let i = 0; i < formData.set.products.length; i++) {
      if (formData.set.products[i].quantity) {
        totalQuantity += formData.set.products[i].quantity;
      }

      if (formData.set.products[i].retail_unit_price && formData.set.products[i].quantity) {
        total += formData.set.products[i].retail_unit_price * formData.set.products[i].quantity;
      }

      if (formData.set.products[i].retail_unit_price_with_vat && formData.set.products[i].quantity) {
        totalWithVAT += formData.set.products[i].retail_unit_price_with_vat * formData.set.products[i].quantity;
      }

      //purchase 
      if (formData.set.products[i].purchase_unit_price && formData.set.products[i].quantity) {
        purchaseTotal += formData.set.products[i].purchase_unit_price * formData.set.products[i].quantity;
      }

      if (formData.set.products[i].purchase_unit_price_with_vat && formData.set.products[i].quantity) {
        purchaseTotalWithVAT += formData.set.products[i].purchase_unit_price_with_vat * formData.set.products[i].quantity;
      }
    }

    formData.set.total_quantity = parseFloat(trimTo2Decimals(totalQuantity));

    formData.set.total = parseFloat(trimTo8Decimals(total));
    formData.set.total_with_vat = parseFloat(trimTo8Decimals(totalWithVAT));

    formData.set.purchase_total = parseFloat(trimTo8Decimals(purchaseTotal));
    formData.set.purchase_total_with_vat = parseFloat(trimTo8Decimals(purchaseTotalWithVAT));

    productStores[localStorage.getItem('store_id')].retail_unit_price = formData.set.total;
    productStores[localStorage.getItem('store_id')].retail_unit_price_with_vat = formData.set.total_with_vat;

    //purchase
    productStores[localStorage.getItem('store_id')].purchase_unit_price = formData.set.purchase_total;
    productStores[localStorage.getItem('store_id')].purchase_unit_price_with_vat = formData.set.purchase_total_with_vat;

    //Caluclate %
    for (let i = 0; i < formData.set.products.length; i++) {
      let price = formData.set.products[i].purchase_unit_price * formData.set.products[i].quantity;
      formData.set.products[i].purchase_price_percent = parseFloat(trimTo8Decimals(((price / purchaseTotal) * 100)));

      price = formData.set.products[i].retail_unit_price * formData.set.products[i].quantity;
      formData.set.products[i].retail_price_percent = parseFloat(trimTo8Decimals(((price / total) * 100)));
    }

    setFormData({ ...formData });
  }


  let [showProductUpdateForm, setShowProductUpdateForm] = useState(false);
  const ProductUpdateFormRef = useRef();
  function openUpdateForm(id) {
    showProductUpdateForm = true;
    setShowProductUpdateForm(true);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      ProductUpdateFormRef.current?.open(id);
    }, 100);


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


  const renderPercentTooltip = (props) => (
    <Tooltip id="label-tooltip" {...props}>
      {props.value + "%"}
    </Tooltip>
  );


  const ProductsRef = useRef();
  function openLinkedProducts(model) {
    ProductsRef.current.open(false, "linked_products", model);
  }


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


  const DeliveryNoteHistoryRef = useRef();
  function openDeliveryNoteHistory(model) {
    DeliveryNoteHistoryRef.current.open(model);
  }


  const QuotationHistoryRef = useRef();
  function openQuotationHistory(model) {
    QuotationHistoryRef.current.open(model, [], "quotation");
  }

  function openQuotationSalesHistory(model) {
    QuotationHistoryRef.current.open(model, [], "invoice");
  }

  const QuotationSalesReturnHistoryRef = useRef();
  function openQuotationSalesReturnHistory(model) {
    QuotationSalesReturnHistoryRef.current.open(model);
  }

  const imageViewerRef = useRef();
  let [productImages, setProductImages] = useState([]);

  async function openProductImages(id) {
    let product = await getProductObj(id);
    productImages = product?.images;
    setProductImages(productImages);
    imageViewerRef.current.open(0);
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
      deliveryNoteHistory: "F3",
      quotationHistory: "F2",
      quotationSalesHistory: "Ctrl + Shift + P",
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
      deliveryNoteHistory: "F3",
      quotationHistory: "F2",
      quotationSalesHistory: "Ctrl + Shift + 7",
      quotationSalesReturnHistory: "Ctrl + Shift + 8",
      images: "Ctrl + Shift + 9",
    },
  };

  function getShortcut(key) {
    const code = (store && store.code) ? store.code : "DEFAULT";
    return (SHORTCUTS[code] && SHORTCUTS[code][key]) || SHORTCUTS.DEFAULT[key] || "";
  }
  // ...existing code...
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
        openDeliveryNoteHistory(product);
      } else if (event.key === "F2") {
        openQuotationHistory(product);
      } else if (isCmdOrCtrl && event.shiftKey && event.key.toLowerCase() === 'p') {
        openQuotationSalesHistory(product);
      } else if (isCmdOrCtrl && event.shiftKey && event.key.toLowerCase() === 'z') {
        openQuotationSalesReturnHistory(product);
      } else if (isCmdOrCtrl && event.shiftKey && event.key.toLowerCase() === 'f') {
        openProductImages(product.product_id);
      }
      return;
    } else if (store?.code === "MBDI") {
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
        openDeliveryNoteHistory(product);
      } else if (event.key === "F2") {
        openQuotationHistory(product);
      } else if (isCmdOrCtrl && event.shiftKey && event.key.toLowerCase() === '7') {
        openQuotationSalesHistory(product);
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

  const ProductHistoryRef = useRef();
  function openProductHistory(model) {
    ProductHistoryRef.current.open(model);
  }

  function addStockAdjustment(qty, type) {
    // alert(stock)
    let date = new Date();
    /*if (!formData.id) {
        date = formData.date_str;
    }*/

    if (!productStores[localStorage.getItem('store_id')].stock_adjustments) {
      productStores[localStorage.getItem('store_id')].stock_adjustments = [];
    }

    productStores[localStorage.getItem('store_id')].stock_adjustments.push({
      "date_str": date,
      // "amount": "",
      "quantity": qty ? qty : 0.00,
      "type": type ? type : "adding",
    });

    if (type === "adding") {
      productStores[localStorage.getItem('store_id')].stocks_added += qty;
    } else if (type === "removing") {
      productStores[localStorage.getItem('store_id')].stocks_removed += qty;
    }


    setProductStores({ ...productStores })

    setFormData({ ...formData });
    findStocksAdded();
    findStocksRemoved();
    //findProductStock();
    //validatePaymentAmounts();
    //validatePaymentAmounts((formData.payments_input.filter(payment => !payment.deleted).length - 1));
  }

  function removeStockAdjustment(key) {
    productStores[localStorage.getItem('store_id')]?.stock_adjustments?.splice(key, 1);
    setProductStores({ ...productStores });

    delete errors["adjustment_type_" + key];
    delete errors["adjustment_stock_" + key];
    delete errors["adjustment_date_" + key];

    findStocksAdded();
    findStocksRemoved();
    //findProductStock();

    //formData.payments_input[key]["deleted"] = true;
    //setFormData({ ...formData });

  }

  /*
  function findProductStock() {
    if (!productStores[localStorage.getItem('store_id')]?.stock) {
      productStores[localStorage.getItem('store_id')].stock = 0;
    }

    let newStock = 0;

    if (productStores[localStorage.getItem('store_id')].purchase_quantity) {
      newStock += parseFloat(productStores[localStorage.getItem('store_id')].purchase_quantity);
    }

    if (parseFloat(productStores[localStorage.getItem('store_id')].purchase_return_quantity)) {
      newStock -= parseFloat(productStores[localStorage.getItem('store_id')].purchase_return_quantity);
    }

    if (productStores[localStorage.getItem('store_id')].sales_quantity) {
      newStock -= parseFloat(productStores[localStorage.getItem('store_id')].sales_quantity);
    }

    if (productStores[localStorage.getItem('store_id')].sales_return_quantity) {
      newStock -= parseFloat(productStores[localStorage.getItem('store_id')].sales_return_quantity);
    }

    if (store.settings.update_product_stock_on_quotation_sales) {
      if (productStores[localStorage.getItem('store_id')].quotation_sales_quantity) {
        newStock -= parseFloat(productStores[localStorage.getItem('store_id')].quotation_sales_quantity);
      }
      if (productStores[localStorage.getItem('store_id')].quotation_sales_return_quantity) {
        newStock += parseFloat(productStores[localStorage.getItem('store_id')].quotation_sales_return_quantity);
      }
    }
    // alert(productStores[localStorage.getItem('store_id')].stocks_added)

    if (productStores[localStorage.getItem('store_id')].stocks_added) {
      newStock += parseFloat(productStores[localStorage.getItem('store_id')].stocks_added);
    }

    if (productStores[localStorage.getItem('store_id')].stocks_removed) {
      newStock -= parseFloat(productStores[localStorage.getItem('store_id')].stocks_removed);
    }

    productStores[localStorage.getItem('store_id')].stock = newStock;

    setProductStores({ ...productStores });

  }*/

  function findStocksAdded() {
    let stocksAdded = 0;
    for (let i = 0; i < productStores[localStorage.getItem('store_id')]?.stock_adjustments?.length; i++) {
      if (productStores[localStorage.getItem('store_id')]?.stock_adjustments[i].type === "adding") {
        stocksAdded += productStores[localStorage.getItem('store_id')]?.stock_adjustments[i].quantity;
      }
    }
    productStores[localStorage.getItem('store_id')].stocks_added = stocksAdded;
    setProductStores({ ...productStores });
  }

  function findStocksRemoved() {
    let stocksRemoved = 0;
    for (let i = 0; i < productStores[localStorage.getItem('store_id')]?.stock_adjustments?.length; i++) {
      if (productStores[localStorage.getItem('store_id')]?.stock_adjustments[i].type === "removing") {
        stocksRemoved += productStores[localStorage.getItem('store_id')]?.stock_adjustments[i].quantity;
      }
    }
    productStores[localStorage.getItem('store_id')].stocks_removed = stocksRemoved;
    setProductStores({ ...productStores });
  }

  function handleDeleteImage(index) {
    formData.images = formData.images.filter((_, i) => i !== index);
    setFormData({ ...formData });
  }


  const [warehouseList, setWarehouseList] = useState([]);
  const [searchParams, setSearchParams] = useState({});

  const loadWarehouses = useCallback(() => {
    const requestOptions = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: localStorage.getItem("access_token"),
      },
    };
    let Select =
      "select=id,name,code,created_by_name,created_at";

    const d = new Date();
    let diff = d.getTimezoneOffset();
    searchParams["timezone_offset"] = parseFloat(diff / 60);

    if (localStorage.getItem("store_id")) {
      searchParams.store_id = localStorage.getItem("store_id");
    }

    setSearchParams(searchParams);
    let queryParams = ObjectToSearchQueryParams(searchParams);
    if (queryParams !== "") {
      queryParams = "&" + queryParams;
    }

    fetch(
      "/v1/warehouse?" +
      Select +
      queryParams +
      "&sort=name" +
      "&page=1" +
      "&limit=100",
      requestOptions
    )
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


        setWarehouseList(data.result);
      })
      .catch((error) => {
        console.log(error);
      });
  }, [searchParams]);

  useEffect(() => {
    loadWarehouses();
  }, [loadWarehouses]);

  return (
    <>
      <ProductHistory ref={ProductHistoryRef} showToastMessage={props.showToastMessage} />
      <ImageViewerModal ref={imageViewerRef} images={productImages} />
      <Products ref={ProductsRef} showToastMessage={props.showToastMessage} />
      <SalesHistory ref={SalesHistoryRef} showToastMessage={props.showToastMessage} />
      <SalesReturnHistory ref={SalesReturnHistoryRef} showToastMessage={props.showToastMessage} />
      <PurchaseHistory ref={PurchaseHistoryRef} showToastMessage={props.showToastMessage} />
      <PurchaseReturnHistory ref={PurchaseReturnHistoryRef} showToastMessage={props.showToastMessage} />
      <QuotationHistory ref={QuotationHistoryRef} showToastMessage={props.showToastMessage} />
      <QuotationSalesReturnHistory ref={QuotationSalesReturnHistoryRef} showToastMessage={props.showToastMessage} />
      <DeliveryNoteHistory ref={DeliveryNoteHistoryRef} showToastMessage={props.showToastMessage} />

      {showProductUpdateForm && <ProductCreate ref={ProductUpdateFormRef} showToastMessage={props.showToastMessage} />}
      <StoreCreate
        ref={StoreCreateFormRef}
        showToastMessage={props.showToastMessage}
      />
      {/*
            <ProductView ref={DetailsViewRef} />
            */}
      <ProductCategoryCreate
        ref={ProductCategoryCreateFormRef}
        showToastMessage={props.showToastMessage}
      />

      <ProductBrandCreate
        ref={ProductBrandCreateFormRef}
        showToastMessage={props.showToastMessage}
      />

      <Modal
        show={show}
        fullscreen
        onHide={handleClose}
        animation={false}
        backdrop="static"
        scrollable={true}

      >
        <Modal.Header>
          <Modal.Title>
            {formData.id
              ? "Update Product #" + formData.name
              : "Create New Product"}
          </Modal.Title>

          <div className="col align-self-end text-end">
            {formData.id ? (
              <Button
                variant="primary"
                onClick={() => {
                  handleClose();
                  if (props.openDetailsView)
                    props.openDetailsView(formData.id);
                }}
              >
                <i className="bi bi-eye"></i> View Detail
              </Button>
            ) : (
              ""
            )}
            &nbsp;&nbsp;
            <Button variant="primary" onClick={handleCreate}>
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
          <form className="row g-3 needs-validation" onSubmit={handleCreate}>
            <div className="col-md-6">
              <label className="form-label">Name*</label>
              <div className="input-group mb-3">
                <input
                  id="product_name"
                  name="product_name"
                  value={formData.name ? formData.name : ""}
                  type="string"
                  onChange={(e) => {
                    errors["name"] = "";
                    setErrors({ ...errors });
                    formData.name = e.target.value;
                    setFormData({ ...formData });

                    // Auto-translate to Arabic]

                    if (timerRef.current) clearTimeout(timerRef.current);
                    timerRef.current = setTimeout(async () => {
                      translateText(e.target.value);
                    }, 100);

                  }}
                  className="form-control"
                  placeholder="Name"
                />
                {errors.name && (
                  <div style={{ color: "red" }}>
                    <i className="bi bi-x-lg"> </i>
                    {errors.name}
                  </div>
                )}
              </div>
            </div>

            <div className="col-md-6">
              <label className="form-label">Name In Arabic</label>
              <div className="input-group mb-3">
                <input
                  id="product_name_arabic"
                  name="product_name_arabic"
                  value={formData.name_in_arabic ? formData.name_in_arabic : ""}
                  type="string"
                  onChange={(e) => {
                    errors["name_in_arabic"] = "";
                    setErrors({ ...errors });
                    formData.name_in_arabic = e.target.value;
                    setFormData({ ...formData });
                  }}
                  className="form-control"
                  placeholder="Name In Arabic"
                />
                {errors.name_in_arabic && (
                  <div style={{ color: "red" }}>
                    <i className="bi bi-x-lg"> </i>
                    {errors.name_in_arabic}
                  </div>
                )}
              </div>
            </div>

            <div className="col-md-3" style={{ border: "solid 0px" }}>
              <label className="form-label">Brand</label>
              <div className="input-group mb-3">
                <Typeahead
                  id="brand_id"
                  labelKey="name"
                  isLoading={isBrandsLoading}
                  onChange={(selectedItems) => {
                    errors.brand_id = "";
                    setErrors(errors);
                    if (selectedItems.length === 0) {
                      errors.brand_id = "Invalid brand selected";
                      setErrors(errors);
                      formData.brand_id = "";
                      formData.brand_code = "";
                      formData.brand_name = "";
                      makePartNumberPrefix();
                      setFormData({ ...formData });
                      setSelectedBrands([]);
                      return;
                    }
                    formData.brand_id = selectedItems[0].id;
                    formData.brand_code = selectedItems[0].code;
                    formData.brand_name = selectedItems[0].name;
                    makePartNumberPrefix();
                    setFormData({ ...formData });
                    setSelectedBrands(selectedItems);

                  }}
                  options={brandOptions}
                  placeholder="Brand name"
                  selected={selectedBrands}
                  highlightOnlyResult={true}
                  ref={brandSearchRef}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setBrandOptions([]);
                      brandSearchRef.current?.clear();
                    }
                  }}
                  onInputChange={(searchTerm, e) => {
                    suggestBrands(searchTerm);
                  }}
                />
                <Button
                  hide={true.toString()}
                  onClick={openProductBrandCreateForm}
                  className="btn btn-outline-secondary btn-primary btn-sm"
                  type="button"
                  id="button-addon1"
                >
                  {" "}
                  <i className="bi bi-plus-lg"></i> New
                </Button>
              </div>
            </div>


            <div className="col-md-3">
              <label className="form-label">Country</label>

              <div className="input-group mb-3">

                <Typeahead
                  id="country_code"
                  labelKey="label"
                  onChange={(selectedItems) => {
                    errors.country_code = "";
                    setErrors(errors);
                    if (selectedItems.length === 0) {
                      errors.country_code = "Invalid country selected";
                      setErrors(errors);
                      formData.country_code = "";
                      formData.country_name = "";
                      makePartNumberPrefix();
                      setFormData({ ...formData });
                      setSelectedCountries([]);
                      return;
                    }
                    formData.country_code = selectedItems[0].value;
                    formData.country_name = selectedItems[0].label;
                    makePartNumberPrefix();
                    setFormData({ ...formData });
                    setSelectedCountries(selectedItems);
                  }}
                  options={countryOptions}
                  placeholder="Country name"
                  selected={selectedCountries}
                  highlightOnlyResult={true}
                  ref={countrySearchRef}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      countrySearchRef.current?.clear();
                    }
                  }}
                  onInputChange={(searchTerm, e) => {
                    //suggestBrands(searchTerm);
                  }}
                />
              </div>
            </div>

            <div className="col-md-2">
              <label className="form-label">Part no. prefix </label>

              <div className="input-group mb-3">
                <input
                  id="product_prefix_part_no"
                  name="product_prefix_part_no"
                  value={formData.prefix_part_number ? formData.prefix_part_number : ""}
                  type="string"
                  onChange={(e) => {
                    errors["part_number"] = "";
                    setErrors({ ...errors });
                    formData.prefix_part_number = e.target.value;
                    setFormData({ ...formData });
                    console.log(formData);
                  }}
                  className="form-control"
                  placeholder="Prefix"
                />
                {errors.prefix_part_number && (
                  <div style={{ color: "red" }}>
                    <i className="bi bi-x-lg"> </i>
                    {errors.prefix_part_number}
                  </div>
                )}
              </div>
            </div>

            <div className="col-md-4">
              <label className="form-label">Part No.</label>

              <div className="input-group mb-3">
                <input
                  id="product_part_no"
                  name="product_part_no"
                  value={formData.part_number ? formData.part_number : ""}
                  type="string"
                  onChange={(e) => {
                    errors["part_number"] = "";
                    setErrors({ ...errors });
                    formData.part_number = e.target.value;
                    setFormData({ ...formData });
                    console.log(formData);
                  }}
                  className="form-control"
                  placeholder="Part Number"
                />
                {errors.part_number && (
                  <div style={{ color: "red" }}>
                    <i className="bi bi-x-lg"> </i>
                    {errors.part_number}
                  </div>
                )}

              </div>
            </div>

            <div className="col-md-6">
              <label className="form-label">Rack / Location </label>

              <div className="input-group mb-3">
                <input
                  id="product_rack"
                  name="product_rack"
                  value={formData.rack ? formData.rack : ""}
                  type="string"
                  onChange={(e) => {
                    errors["rack"] = "";
                    setErrors({ ...errors });
                    formData.rack = e.target.value;
                    setFormData({ ...formData });
                    console.log(formData);
                  }}
                  className="form-control"
                  placeholder="Rack/Location"
                />
                {errors.rack && (
                  <div style={{ color: "red" }}>

                    {errors.rack}
                  </div>
                )}

              </div>
            </div>

            <div className="col-md-4">
              <label className="form-label">Category</label>

              <div className="input-group mb-4">

                <Typeahead
                  ref={categorySearchRef}
                  id="category_id"
                  labelKey="name"

                  isInvalid={errors.category_id ? true : false}
                  onChange={(selectedItems) => {
                    errors.category_id = "";
                    setErrors(errors);
                    if (selectedItems.length === 0) {
                      errors.category_id = "Invalid Category selected";
                      setErrors(errors);
                      setFormData({ ...formData });
                      setSelectedCategories([]);
                      return;
                    }
                    setFormData({ ...formData });
                    setSelectedCategories(selectedItems);
                  }}
                  options={categoryOptions}
                  placeholder="Select Categories"
                  selected={selectedCategories}
                  highlightOnlyResult={true}
                  onInputChange={(searchTerm, e) => {
                    suggestCategories(searchTerm);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setCategoryOptions([]);
                      categorySearchRef.current?.clear();
                    }
                  }}
                />
                <Button
                  hide={true.toString()}
                  onClick={openProductCategoryCreateForm}
                  className="btn btn-outline-secondary btn-primary btn-sm"
                  type="button"
                  id="button-addon1"
                >
                  {" "}
                  <i className="bi bi-plus-lg"></i> New
                </Button>
                {errors.category_id && (
                  <div style={{ color: "red" }}>
                    {errors.category_id}
                  </div>
                )}
              </div>
            </div>

            <div className="col-md-2">
              <label className="form-label">Unit*</label>
              <select
                className="form-control"
                value={formData.unit}
                onChange={(e) => {
                  formData.unit = e.target.value;
                  console.log("Inside onchange price type:", formData.unit);
                  setFormData({ ...formData });
                }}
              >
                <option value="">PC</option>
                <option value="drum">Drum</option>
                <option value="set">Set</option>
                <option value="Kg">Kg</option>
                <option value="Meter(s)">Meter(s)</option>
                <option value="CMT">Centi Meter(s)</option>
                <option value="MMT">Milli Meter(s)</option>
                <option value="Gm">Gm</option>
                <option value="L">Liter (L)</option>
                <option value="Mg">Mg</option>
              </select>
            </div>

            <div className="col-md-4">
              <div className="input-group mb-3">
                <input type="checkbox"
                  value={formData.allow_duplicates}
                  checked={formData.allow_duplicates}
                  onChange={(e) => {

                    errors["formData.allow_duplicates"] = "";
                    formData.allow_duplicates = !formData.allow_duplicates
                    setFormData({ ...formData });
                    console.log(formData);
                  }}
                  className=""
                  id="formData.allow_duplicates"
                /> &nbsp;Allow duplicates in Sales, Purchases etc
              </div>
              <label className="form-label"></label>
              {errors.allow_duplicates && (
                <div style={{ color: "red" }}>
                  {errors.allow_duplicates}
                </div>
              )}
            </div>

            <h4>Unit Prices</h4>
            <div className="table-responsive" style={{ overflowX: "auto" }}>
              <table className="table table-striped table-sm table-bordered">
                <tbody>
                  <tr className="text-center">
                    <th>Purchase Unit Price</th>
                    <th>Wholesale Unit Price</th>
                    <th>Retail Unit Price</th>
                  </tr>
                  <tr className="text-center">
                    {!localStorage.getItem('store_id') ? <td style={{ width: "150px" }}>{store.name}</td> : ""}
                    <td style={{ width: "150px" }}>
                      <input
                        id={`${"product_purchase_unit_price_0"}`}
                        name={`${"product_purchase_unit_price_0"}`}
                        type="number"
                        value={productStores[localStorage.getItem('store_id')]?.purchase_unit_price}
                        disabled={formData.set?.purchase_total}
                        ref={(el) => {
                          if (!inputRefs.current[0]) inputRefs.current[0] = {};
                          inputRefs.current[0][`${"product_purchase_unit_price_0"}`] = el;
                        }}
                        onFocus={() => {
                          if (timerRef.current) clearTimeout(timerRef.current);
                          timerRef.current = setTimeout(() => {
                            inputRefs.current[0][`${"product_purchase_unit_price_0"}`]?.select();
                          }, 100);
                        }}
                        onKeyDown={(e) => {
                          if (timerRef.current) clearTimeout(timerRef.current);
                          if (e.key === "Enter") {
                            timerRef.current = setTimeout(() => {
                              inputRefs.current[0][`${"product_wholesale_unit_price_0"}`]?.select();
                            }, 100);

                          } /*else if (e.key ===  "ArrowLeft") {
                            timerRef.current = setTimeout(() => {
                              inputRefs.current[index][`${"sales_product_unit_price_with_vat_" + index}`].focus();
                            }, 100);
                          }*/
                        }}
                        className="form-control"
                        placeholder="Purchase Unit Price"
                        onChange={(e) => {
                          if (timerRef.current) clearTimeout(timerRef.current);

                          delete errors["purchase_unit_price_0"];
                          setErrors({ ...errors });

                          if (!e.target.value) {
                            productStores[localStorage.getItem('store_id')].purchase_unit_price = "";
                            setProductStores({ ...productStores });
                            // setErrors({ ...errors });
                            console.log("errors:", errors);
                            return;
                          }
                          if (parseFloat(e.target.value) < 0) {
                            productStores[localStorage.getItem('store_id')].purchase_unit_price = "";
                            setProductStores({ ...productStores });

                            errors["purchase_unit_price_0"] =
                              "Purchase Unit Price should not be < 0";
                            setErrors({ ...errors });
                            return;
                          }

                          productStores[localStorage.getItem('store_id')].purchase_unit_price = parseFloat(e.target.value);
                          setProductStores({ ...productStores });

                          timerRef.current = setTimeout(() => {
                            productStores[localStorage.getItem('store_id')].purchase_unit_price_with_vat = parseFloat(trimTo8Decimals(productStores[localStorage.getItem('store_id')].purchase_unit_price * (1 + (store.vat_percent / 100))));
                            setProductStores({ ...productStores });
                          }, 100);

                        }}
                      />{" "}
                      {errors["purchase_unit_price_0"] && (
                        <div style={{ color: "red" }}>
                          {errors["purchase_unit_price_0"]}
                        </div>
                      )}

                    </td>
                    <td style={{ width: "150px" }}>
                      <input
                        id={`${"product_wholesale_unit_price"}`}
                        name={`${"product_wholesale_unit_price"}`}
                        type="number"
                        value={
                          productStores[localStorage.getItem('store_id')]?.wholesale_unit_price || productStores[localStorage.getItem('store_id')]?.wholesale_unit_price === 0
                            ? productStores[localStorage.getItem('store_id')]?.wholesale_unit_price
                            : ""
                        }
                        ref={(el) => {
                          if (!inputRefs.current[0]) inputRefs.current[0] = {};
                          inputRefs.current[0][`${"product_wholesale_unit_price_0"}`] = el;
                        }}
                        onFocus={() => {
                          if (timerRef.current) clearTimeout(timerRef.current);
                          timerRef.current = setTimeout(() => {
                            inputRefs.current[0][`${"product_wholesale_unit_price_0"}`]?.select();
                          }, 100);
                        }}
                        onKeyDown={(e) => {
                          if (timerRef.current) clearTimeout(timerRef.current);
                          if (e.key === "Enter") {
                            timerRef.current = setTimeout(() => {
                              inputRefs.current[0][`${"product_retail_unit_price_0"}`]?.select();
                            }, 100);

                          } else if (e.key === "ArrowLeft") {
                            timerRef.current = setTimeout(() => {
                              inputRefs.current[0][`${"product_purchase_unit_price_0"}`].focus();
                            }, 100);
                          }
                        }}
                        className="form-control"
                        placeholder="Wholesale Unit Price"
                        onChange={(e) => {
                          if (timerRef.current) clearTimeout(timerRef.current);

                          delete errors["wholesale_unit_price"];
                          setErrors({ ...errors });

                          if (!e.target.value) {
                            productStores[localStorage.getItem('store_id')].wholesale_unit_price = "";
                            setProductStores({ ...productStores });
                            return;
                          }

                          if (parseFloat(e.target.value) < 0) {
                            productStores[localStorage.getItem('store_id')].wholesale_unit_price = "";
                            setProductStores({ ...productStores });

                            errors["wholesale_unit_price"] =
                              "Wholesale unit price should not be < 0";
                            setErrors({ ...errors });
                            return;
                          }

                          productStores[localStorage.getItem('store_id')].wholesale_unit_price = parseFloat(e.target.value);

                          setProductStores({ ...productStores });
                          timerRef.current = setTimeout(() => {
                            productStores[localStorage.getItem('store_id')].wholesale_unit_price_with_vat = parseFloat(trimTo8Decimals(productStores[localStorage.getItem('store_id')].wholesale_unit_price * (1 + (store.vat_percent / 100))));
                            setProductStores({ ...productStores });
                          }, 100);

                        }}
                      />
                      {errors["wholesale_unit_price"] && (
                        <div style={{ color: "red" }}>
                          {errors["wholesale_unit_price"]}
                        </div>
                      )}

                    </td>
                    <td style={{ width: "150px" }}>
                      <input
                        id={`${"product_retail_unit_price"}`}
                        name={`${"product_retail_unit_price"}`}
                        type="number"
                        disabled={formData.set?.total}
                        value={
                          productStores[localStorage.getItem('store_id')]?.retail_unit_price || productStores[localStorage.getItem('store_id')]?.retail_unit_price === 0
                            ? productStores[localStorage.getItem('store_id')]?.retail_unit_price
                            : ""
                        }
                        ref={(el) => {
                          if (!inputRefs.current[0]) inputRefs.current[0] = {};
                          inputRefs.current[0][`${"product_retail_unit_price_0"}`] = el;
                        }}
                        onFocus={() => {
                          if (timerRef.current) clearTimeout(timerRef.current);
                          timerRef.current = setTimeout(() => {
                            inputRefs.current[0][`${"product_retail_unit_price_0"}`]?.select();
                          }, 100);
                        }}
                        onKeyDown={(e) => {
                          if (timerRef.current) clearTimeout(timerRef.current);
                          if (e.key === "ArrowLeft") {
                            timerRef.current = setTimeout(() => {
                              inputRefs.current[0][`${"product_wholesale_unit_price_0"}`].focus();
                            }, 100);
                          }
                        }}
                        className="form-control"
                        placeholder="Retail Unit Price"
                        onChange={(e) => {
                          if (timerRef.current) clearTimeout(timerRef.current);

                          delete errors["retail_unit_price"];
                          setErrors({ ...errors });
                          if (!e.target.value) {
                            productStores[localStorage.getItem('store_id')].retail_unit_price = "";
                            setProductStores({ ...productStores });
                            return;
                          }

                          if (parseFloat(e.target.value) < 0) {
                            errors["retail_unit_price_0"] =
                              "Retail Unit Price should not be < 0";
                            productStores[localStorage.getItem('store_id')].retail_unit_price = "";

                            setProductStores({ ...productStores });
                            setErrors({ ...errors });
                            console.log("errors:", errors);
                            return;
                          }

                          console.log("e.target.value:", e.target.value);

                          productStores[localStorage.getItem('store_id')].retail_unit_price = parseFloat(e.target.value);
                          setProductStores({ ...productStores });


                          timerRef.current = setTimeout(() => {
                            productStores[localStorage.getItem('store_id')].retail_unit_price_with_vat = parseFloat(trimTo8Decimals(productStores[localStorage.getItem('store_id')].retail_unit_price * (1 + (store.vat_percent / 100))));
                            setProductStores({ ...productStores });
                          }, 100);


                        }}
                      />{" "}
                      {errors["retail_unit_price"] && (
                        <div style={{ color: "red" }}>

                          {errors["retail_unit_price"]}
                        </div>
                      )}

                    </td>
                  </tr>
                  <tr className="text-center">
                    <th>Purchase Unit Price(with VAT)</th>
                    <th>Wholesale Unit Price(with VAT)</th>
                    <th>Retail Unit Price(with VAT)</th>
                  </tr>
                  <tr className="text-center">
                    {!localStorage.getItem('store_id') ? <td style={{ width: "150px" }}>{store.name}</td> : ""}
                    <td style={{ width: "150px" }}>
                      <input
                        id={`${"product_purchase_unit_price_with_vat_0"}`}
                        name={`${"product_purchase_unit_price_with_vat_0"}`}
                        disabled={formData.set?.purchase_total_with_vat}
                        type="number"
                        value={
                          productStores[localStorage.getItem('store_id')]?.purchase_unit_price_with_vat || productStores[localStorage.getItem('store_id')]?.purchase_unit_price_with_vat === 0
                            ? productStores[localStorage.getItem('store_id')]?.purchase_unit_price_with_vat
                            : ""
                        }
                        ref={(el) => {
                          if (!inputRefs.current[0]) inputRefs.current[0] = {};
                          inputRefs.current[0][`${"product_purchase_unit_price_with_vat_0"}`] = el;
                        }}
                        onFocus={() => {
                          if (timerRef.current) clearTimeout(timerRef.current);
                          timerRef.current = setTimeout(() => {
                            inputRefs.current[0][`${"product_purchase_unit_price_with_vat_0"}`]?.select();
                          }, 100);
                        }}
                        onKeyDown={(e) => {
                          if (timerRef.current) clearTimeout(timerRef.current);
                          if (e.key === "Enter") {
                            timerRef.current = setTimeout(() => {
                              inputRefs.current[0][`${"product_wholesale_unit_price_with_vat_0"}`]?.select();
                            }, 100);

                          } /*else if (e.key ===  "ArrowLeft") {
                            timerRef.current = setTimeout(() => {
                              inputRefs.current[index][`${"sales_product_unit_price_with_vat_" + index}`].focus();
                            }, 100);
                          }*/

                          if (e.key === "ArrowLeft") {
                            timerRef.current = setTimeout(() => {
                              inputRefs.current[0][`${"product_retail_unit_price_0"}`].focus();
                            }, 100);
                          }

                        }}
                        className="form-control"
                        placeholder="Purchase Unit Price with VAT"
                        onChange={(e) => {
                          if (timerRef.current) clearTimeout(timerRef.current);

                          delete errors["purchase_unit_price_with_vat_0"];
                          setErrors({ ...errors });

                          if (!e.target.value) {
                            productStores[localStorage.getItem('store_id')].purchase_unit_price_with_vat = "";
                            setProductStores({ ...productStores });
                            // setErrors({ ...errors });
                            console.log("errors:", errors);
                            return;
                          }
                          if (parseFloat(e.target.value) < 0) {
                            productStores[localStorage.getItem('store_id')].purchase_unit_price_with_vat = "";
                            setProductStores({ ...productStores });

                            errors["purchase_unit_price_with_vat_0"] =
                              "Purchase Unit Price with VAT should not be < 0";
                            setErrors({ ...errors });
                            return;
                          }

                          productStores[localStorage.getItem('store_id')].purchase_unit_price_with_vat = parseFloat(e.target.value);
                          setProductStores({ ...productStores });

                          timerRef.current = setTimeout(() => {
                            productStores[localStorage.getItem('store_id')].purchase_unit_price = parseFloat(trimTo8Decimals(productStores[localStorage.getItem('store_id')].purchase_unit_price_with_vat / (1 + (store.vat_percent / 100))));
                            setProductStores({ ...productStores });
                          }, 100);

                        }}
                      />{" "}
                      {errors["purchase_unit_price_with_vat_0"] && (
                        <div style={{ color: "red" }}>
                          {errors["purchase_unit_price_with_vat_0"]}
                        </div>
                      )}

                    </td>
                    <td style={{ width: "150px" }}>
                      <input
                        id={`${"product_wholesale_unit_price_with_vat"}`}
                        name={`${"product_wholesale_unit_price_with_vat"}`}
                        type="number"
                        value={
                          productStores[localStorage.getItem('store_id')]?.wholesale_unit_price_with_vat || productStores[localStorage.getItem('store_id')]?.wholesale_unit_price_with_vat === 0
                            ? productStores[localStorage.getItem('store_id')]?.wholesale_unit_price_with_vat
                            : ""
                        }
                        ref={(el) => {
                          if (!inputRefs.current[0]) inputRefs.current[0] = {};
                          inputRefs.current[0][`${"product_wholesale_unit_price_with_vat_0"}`] = el;
                        }}
                        onFocus={() => {
                          if (timerRef.current) clearTimeout(timerRef.current);
                          timerRef.current = setTimeout(() => {
                            inputRefs.current[0][`${"product_wholesale_unit_price_with_vat_0"}`]?.select();
                          }, 100);
                        }}
                        onKeyDown={(e) => {
                          if (timerRef.current) clearTimeout(timerRef.current);
                          if (e.key === "Enter") {
                            timerRef.current = setTimeout(() => {
                              inputRefs.current[0][`${"product_retail_unit_price_with_vat_0"}`]?.select();
                            }, 100);

                          } else if (e.key === "ArrowLeft") {
                            timerRef.current = setTimeout(() => {
                              inputRefs.current[0][`${"product_purchase_unit_price_with_vat_0"}`].focus();
                            }, 100);
                          }
                        }}
                        className="form-control"
                        placeholder="Wholesale Unit Price with VAT"
                        onChange={(e) => {
                          if (timerRef.current) clearTimeout(timerRef.current);

                          delete errors["wholesale_unit_price_with_vat"];
                          setErrors({ ...errors });

                          if (!e.target.value) {
                            productStores[localStorage.getItem('store_id')].wholesale_unit_price_with_vat = "";
                            setProductStores({ ...productStores });
                            return;
                          }

                          if (parseFloat(e.target.value) < 0) {
                            productStores[localStorage.getItem('store_id')].wholesale_unit_price_with_vat = "";
                            setProductStores({ ...productStores });

                            errors["wholesale_unit_price_with_vat"] =
                              "Wholesale unit price with VAT should not be < 0";
                            setErrors({ ...errors });
                            return;
                          }

                          productStores[localStorage.getItem('store_id')].wholesale_unit_price_with_vat = parseFloat(e.target.value);
                          setProductStores({ ...productStores });

                          timerRef.current = setTimeout(() => {
                            productStores[localStorage.getItem('store_id')].wholesale_unit_price = parseFloat(trimTo8Decimals(productStores[localStorage.getItem('store_id')].wholesale_unit_price_with_vat / (1 + (store.vat_percent / 100))));
                            setProductStores({ ...productStores });
                          }, 100);

                        }}
                      />
                      {errors["wholesale_unit_price_with_vat"] && (
                        <div style={{ color: "red" }}>
                          {errors["wholesale_unit_price_with_vat"]}
                        </div>
                      )}

                    </td>
                    <td style={{ width: "150px" }}>
                      <input
                        id={`${"product_retail_unit_price_with_vat"}`}
                        name={`${"product_retail_unit_price_with_vat"}`}
                        type="number"
                        disabled={formData.set?.total}
                        value={
                          productStores[localStorage.getItem('store_id')]?.retail_unit_price_with_vat || productStores[localStorage.getItem('store_id')]?.retail_unit_price_with_vat === 0
                            ? productStores[localStorage.getItem('store_id')]?.retail_unit_price_with_vat
                            : ""
                        }
                        ref={(el) => {
                          if (!inputRefs.current[0]) inputRefs.current[0] = {};
                          inputRefs.current[0][`${"product_retail_unit_price_with_vat_0"}`] = el;
                        }}
                        onFocus={() => {
                          if (timerRef.current) clearTimeout(timerRef.current);
                          timerRef.current = setTimeout(() => {
                            inputRefs.current[0][`${"product_retail_unit_price_with_vat_0"}`]?.select();
                          }, 100);
                        }}
                        onKeyDown={(e) => {
                          if (timerRef.current) clearTimeout(timerRef.current);
                          if (e.key === "ArrowLeft") {
                            timerRef.current = setTimeout(() => {
                              inputRefs.current[0][`${"product_wholesale_unit_price_with_vat_0"}`].focus();
                            }, 100);
                          }
                        }}
                        className="form-control"
                        placeholder="Retail Unit Price with VAT"
                        onChange={(e) => {
                          if (timerRef.current) clearTimeout(timerRef.current);

                          delete errors["retail_unit_price_with_vat"];
                          setErrors({ ...errors });
                          if (!e.target.value) {
                            productStores[localStorage.getItem('store_id')].retail_unit_price_with_vat = "";
                            setProductStores({ ...productStores });
                            return;
                          }

                          if (parseFloat(e.target.value) < 0) {
                            errors["retail_unit_price_with_vat_0"] =
                              "Retail Unit Price with VAT should not be < 0";
                            productStores[localStorage.getItem('store_id')].retail_unit_price_with_vat = "";

                            setProductStores({ ...productStores });
                            setErrors({ ...errors });
                            console.log("errors:", errors);
                            return;
                          }

                          console.log("e.target.value:", e.target.value);

                          productStores[localStorage.getItem('store_id')].retail_unit_price_with_vat = parseFloat(
                            e.target.value
                          );
                          setProductStores({ ...productStores });

                          timerRef.current = setTimeout(() => {
                            productStores[localStorage.getItem('store_id')].retail_unit_price = parseFloat(trimTo8Decimals(productStores[localStorage.getItem('store_id')].retail_unit_price_with_vat / (1 + (store.vat_percent / 100))));
                            setProductStores({ ...productStores });
                          }, 100);


                        }}
                      />{" "}
                      {errors["retail_unit_price_with_vat"] && (
                        <div style={{ color: "red" }}>

                          {errors["retail_unit_price_with_vat"]}
                        </div>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="row">
              <div className="col-md-8">
                <h4>Stock Adjustments</h4>
                <div className="table-responsive" style={{ overflowX: "auto" }}>
                  <table className="table table-striped table-sm table-bordered">
                    <thead>
                      <tr className="text-center">
                        <th>Damaged/Missing Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="text-center">
                        <td style={{ width: "150px" }}>
                          <input
                            id={`${"product_damaged_stock_0"}`}
                            name={`${"product_damaged_stock_0"}`}
                            value={damagedStock}
                            type="number"
                            onChange={(e) => {
                              errors["damaged_stock_0"] = "";
                              setErrors({ ...errors });

                              /*if (!e.target.value) {
                                 productStores[localStorage.getItem('store_id')].damaged_stock = "";
                                 setProductStores({ ...productStores });
                                 //errors["stock_" + index] = "Invalid Stock value";
                                 //setErrors({ ...errors });
                                 return;
                               }
       
                               productStores[localStorage.getItem('store_id')].damaged_stock = parseFloat(e.target.value);
                               */
                              setDamagedStock(parseFloat(e.target.value));
                              setOperationType(null); // reset choice

                            }}
                            className="form-control"
                            placeholder="Damaged stock"
                          />
                          {errors["damaged_stock_0"] && (
                            <div style={{ color: "red" }}>
                              {errors["damaged_stock_0"]}
                            </div>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={1}>
                          {damagedStock && !operationType && (
                            <div className="mt-2">
                              <button className="btn btn-success me-2" onClick={(e) => {
                                e.preventDefault();
                                if (!productStores[localStorage.getItem('store_id')].stocks_added) {
                                  productStores[localStorage.getItem('store_id')].stocks_added = 0.00;
                                }

                                if (!productStores[localStorage.getItem('store_id')].stock) {
                                  productStores[localStorage.getItem('store_id')].stock = 0.00;
                                }

                                // productStores[localStorage.getItem('store_id')].stocks_added += parseFloat(damagedStock);
                                //productStores[localStorage.getItem('store_id')].stock += parseFloat(damagedStock);
                                addStockAdjustment(parseFloat(damagedStock), "added")
                                setProductStores({ ...productStores });
                                damagedStock = "";
                                setDamagedStock(damagedStock);



                              }}>Add</button>
                              <button className="btn btn-danger" onClick={(e) => {
                                e.preventDefault();

                                if (!productStores[localStorage.getItem('store_id')].stocks_removed) {
                                  productStores[localStorage.getItem('store_id')].stocks_removed = 0.00;
                                }

                                if (!productStores[localStorage.getItem('store_id')].stock) {
                                  productStores[localStorage.getItem('store_id')].stock = 0.00;
                                }

                                //productStores[localStorage.getItem('store_id')].stocks_removed += parseFloat(damagedStock);
                                //productStores[localStorage.getItem('store_id')].stock -= parseFloat(damagedStock);
                                addStockAdjustment(parseFloat(damagedStock), "removed")
                                setProductStores({ ...productStores });
                                damagedStock = "";
                                setDamagedStock(damagedStock);



                              }}>Remove</button>
                            </div>
                          )}

                          <div className="">
                            <label className="form-label"></label>

                            <div class="table-responsive" style={{ maxWidth: "900px" }}>
                              <Button variant="secondary" style={{ alignContent: "right", marginBottom: "10px" }} onClick={() => {
                                addStockAdjustment();
                              }}>
                                Create Stock Adjustment
                              </Button>
                              <table class="table table-striped table-sm table-bordered">
                                {productStores[localStorage.getItem('store_id')]?.stock_adjustments && productStores[localStorage.getItem('store_id')].stock_adjustments?.length > 0 &&
                                  <thead>
                                    <th style={{ textAlign: "center" }}>
                                      Date
                                    </th>
                                    <th style={{ textAlign: "center" }}>
                                      Quantity
                                    </th>
                                    <th style={{ textAlign: "center" }}>
                                      Add/Remove
                                    </th>
                                    <th style={{ textAlign: "center" }}>Warehouse/Store</th> {/* New column */}
                                    <th style={{ textAlign: "center" }}>
                                      Action
                                    </th>
                                  </thead>}
                                <tbody>
                                  {productStores[localStorage.getItem('store_id')]?.stock_adjustments &&
                                    productStores[localStorage.getItem('store_id')].stock_adjustments.filter(adjustment => !adjustment.deleted).map((adjustment, key) => (
                                      <tr key={key}>
                                        <td style={{ width: "180px" }}>

                                          <DatePicker
                                            id="payment_date_str"
                                            selected={productStores[localStorage.getItem('store_id')].stock_adjustments[key].date_str ? new Date(productStores[localStorage.getItem('store_id')].stock_adjustments[key].date_str) : null}
                                            value={productStores[localStorage.getItem('store_id')].stock_adjustments[key].date_str ? format(
                                              new Date(productStores[localStorage.getItem('store_id')].stock_adjustments[key].date_str),
                                              "MMMM d, yyyy h:mm aa"
                                            ) : null}
                                            className="form-control"
                                            dateFormat="MMMM d, yyyy h:mm aa"
                                            showTimeSelect
                                            timeIntervals="1"
                                            onChange={(value) => {
                                              console.log("Value", value);
                                              productStores[localStorage.getItem('store_id')].stock_adjustments[key].date_str = value;
                                              setProductStores({ ...productStores });
                                              //setFormData({ ...formData });
                                            }}
                                          />
                                          {errors["adjustment_date_" + key] && (
                                            <div style={{ color: "red" }}>

                                              {errors["adjustment_date_" + key]}
                                            </div>
                                          )}
                                        </td>
                                        <td style={{ width: "80px" }}>
                                          <input
                                            type='number'
                                            id={`${"adjustment_quantity_" + key}`}
                                            name={`${"adjustment_quantity_" + key}`}
                                            value={productStores[localStorage.getItem('store_id')].stock_adjustments[key].quantity}
                                            className="form-control"
                                            ref={(el) => {
                                              if (!inputRefs.current[key]) inputRefs.current[key] = {};
                                              inputRefs.current[key][`${"adjustment_quantity_" + key}`] = el;
                                            }}
                                            onFocus={() => {
                                              if (timerRef.current) clearTimeout(timerRef.current);
                                              timerRef.current = setTimeout(() => {
                                                inputRefs.current[key][`${"adjustment_quantity_" + key}`]?.select();
                                              }, 20);
                                            }}
                                            onChange={(e) => {
                                              delete errors["adjustment_quantity_" + key];
                                              setErrors({ ...errors });


                                              if (!e.target.value) {
                                                productStores[localStorage.getItem('store_id')].stock_adjustments[key].quantity = e.target.value;
                                                setProductStores({ ...productStores });
                                                //setFormData({ ...formData });
                                                //validatePaymentAmounts();
                                                return;
                                              }

                                              productStores[localStorage.getItem('store_id')].stock_adjustments[key].quantity = parseFloat(e.target.value);

                                              /*
      
                                              if (productStores[localStorage.getItem('store_id')]?.stock_adjustments[key]?.type === "added") {
                                               // productStores[localStorage.getItem('store_id')].stocks_added += parseFloat(e.target.value);
                                                productStores[localStorage.getItem('store_id')].stock += parseFloat(e.target.value);
                                                //alert("Added:" + productStores[localStorage.getItem('store_id')].stocks_added);
                                              } else if (productStores[localStorage.getItem('store_id')]?.stock_adjustments[key]?.type === "removed") {
                                               // productStores[localStorage.getItem('store_id')].stocks_removed += parseFloat(e.target.value);
                                                productStores[localStorage.getItem('store_id')].stock -= parseFloat(e.target.value);
                                              }*/


                                              setProductStores({ ...productStores });

                                              findStocksAdded();
                                              findStocksRemoved();

                                              // validatePaymentAmounts();
                                              //setFormData({ ...formData });
                                              console.log(formData);
                                            }}
                                          />
                                          {errors["adjustment_quantity_" + key] && (
                                            <div style={{ color: "red" }}>
                                              {errors["adjustment_quantity_" + key]}
                                            </div>
                                          )}
                                        </td>
                                        <td style={{ width: "100px" }}>
                                          <select
                                            value={productStores[localStorage.getItem('store_id')].stock_adjustments[key].type} className="form-control "
                                            onChange={(e) => {
                                              // errors["payment_method"] = [];
                                              delete errors["adjustment_type_" + key];
                                              setErrors({ ...errors });

                                              if (!e.target.value) {
                                                errors["adjustment_type_" + key] = "Type is required";
                                                setErrors({ ...errors });

                                                productStores[localStorage.getItem('store_id')].stock_adjustments[key].type = "";
                                                //  setFormData({ ...formData });
                                                setProductStores({ ...productStores });
                                                return;
                                              }

                                              // errors["payment_method"] = "";
                                              //setErrors({ ...errors });

                                              productStores[localStorage.getItem('store_id')].stock_adjustments[key].type = e.target.value;
                                              setProductStores({ ...productStores });
                                              findStocksAdded();
                                              findStocksRemoved();

                                              //setFormData({ ...formData });
                                              console.log(formData);
                                            }}
                                          >
                                            <option value="">Select</option>
                                            <option value="adding">Adding</option>
                                            <option value="removing">Removing</option>
                                          </select>
                                          {errors["adjustment_type_" + key] && (
                                            <div style={{ color: "red" }}>
                                              {errors["adjustment_type_" + key]}
                                            </div>
                                          )}
                                        </td>
                                        <td style={{ width: "130px" }} >
                                          <select
                                            id={`adjustment_warehouse_${key}`}
                                            name={`adjustment_warehouse_${key}`}
                                            className="form-control"
                                            value={productStores[localStorage.getItem('store_id')].stock_adjustments[key].warehouse_id || "main_store"}
                                            onChange={(e) => {
                                              const selectedValue = e.target.value;

                                              if (selectedValue === "main_store") {
                                                productStores[localStorage.getItem('store_id')].stock_adjustments[key].warehouse_id = null;
                                                productStores[localStorage.getItem('store_id')].stock_adjustments[key].warehouse_code = "";
                                              } else {
                                                const selectedWarehouse = warehouseList.find(w => w.id === selectedValue);
                                                if (selectedWarehouse) {
                                                  productStores[localStorage.getItem('store_id')].stock_adjustments[key].warehouse_id = selectedWarehouse.id;
                                                  productStores[localStorage.getItem('store_id')].stock_adjustments[key].warehouse_code = selectedWarehouse.code;
                                                }
                                              }

                                              setProductStores({ ...productStores });
                                            }}
                                          >
                                            <option value="main_store">Main Store</option>
                                            {warehouseList.map((warehouse) => (
                                              <option key={warehouse.id} value={warehouse.id}>
                                                {warehouse.name} ({warehouse.code})
                                              </option>
                                            ))}
                                          </select>
                                          {errors[`adjustment_warehouse_${key}`] && (
                                            <div style={{ color: "red" }}>
                                              {errors[`adjustment_warehouse_${key}`]}
                                            </div>
                                          )}
                                        </td>
                                        <td style={{ width: "70px", textAlign: "center" }}>
                                          <Button variant="danger" onClick={(event) => {
                                            removeStockAdjustment(key);
                                          }}>
                                            Remove
                                          </Button>

                                        </td>
                                      </tr>
                                    ))}
                                </tbody>
                              </table>
                            </div>
                          </div>



                          <div className="mt-4">
                            <h6>Stock Adjustment Summary:</h6>
                            <ul className="list-unstyled">
                              <li>
                                ✅ Total Added: {productStores[localStorage.getItem('store_id')]?.stocks_added ? productStores[localStorage.getItem('store_id')]?.stocks_added : 0.00}
                              </li>
                              <li>
                                ❌ Total Removed:  {productStores[localStorage.getItem('store_id')]?.stocks_removed ? productStores[localStorage.getItem('store_id')]?.stocks_removed : 0.00}
                              </li>
                            </ul>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="col-md-2">
                <h4>Stock</h4>
                <div className="table-responsive" style={{ maxWidth: "400px", marginBottom: "16px" }}>
                  <table className="table table-bordered table-sm mb-0">
                    <thead>
                      <tr>
                        <th>Main Store / Warehouse</th>
                        <th>Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const storeId = localStorage.getItem('store_id');
                        const productStore = productStores?.[storeId] || {};
                        const warehousesStocks = productStore.warehouse_stocks || {};
                        const mainStoreStock = productStore.stock ?? 0;

                        let rows = [];
                        // Main Store first
                        const mainStock = warehousesStocks["main_store"] !== undefined ? warehousesStocks["main_store"] : mainStoreStock;
                        rows.push(
                          <tr key="main_store">
                            <td>Main Store</td>
                            <td>{mainStock}</td>
                          </tr>
                        );

                        // Other warehouses from warehouseList
                        warehouseList.forEach((wh) => {
                          if (wh.code !== "main_store") {
                            const whStock = warehousesStocks[wh.code] !== undefined ? warehousesStocks[wh.code] : 0;
                            rows.push(
                              <tr key={wh.code}>
                                <td>{wh.name} ({wh.code})</td>
                                <td>{whStock}</td>
                              </tr>
                            );
                          }
                        });

                        // Add total row at the end
                        rows.push(
                          <tr key="total" style={{ fontWeight: "bold", background: "#f6f6f6" }}>
                            <td>Total Stock</td>
                            <td>{productStores[localStorage.getItem('store_id')]?.stock}</td>
                          </tr>
                        );

                        return rows;
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <h4>SET</h4>
            <div className="col-md-2">
              <label className="form-label">Set Name</label>
              <div className="input-group mb-3">
                <input
                  id="set_name"
                  name="set_name"
                  value={formData.set?.name ? formData.set.name : ""}
                  type="string"
                  onChange={(e) => {
                    errors["set_name"] = "";
                    setErrors({ ...errors });
                    formData.set.name = e.target.value;
                    formData.name = e.target.value;
                    setFormData({ ...formData });
                    console.log(formData);
                  }}
                  className="form-control"
                  placeholder="Set Name"

                />
                {errors.set_name && (
                  <div style={{ color: "red" }}>
                    <i className="bi bi-x-lg"> </i>
                    {errors.set_name}
                  </div>
                )}
              </div>
            </div>

            <div className="col-md-10">
              <label className="form-label">Select Products</label>
              <Typeahead
                id="set_product_id"
                labelKey="search_label"
                emptyLabel=""
                ref={productSetSearchRef}

                onChange={(selectedItems) => {
                  if (timerRef.current) clearTimeout(timerRef.current);

                  if (selectedItems.length === 0) {
                    return;
                  }

                  AddProductToSet(selectedItems[0])
                  // setSelectedLinkedProducts(selectedItems);


                  timerRef.current = setTimeout(() => {
                    setOpenProductSetSearchResult(false);
                    setProductSetOptions([]);
                    productSetSearchRef.current?.clear();
                    inputRefs.current[(formData.set.products.length - 1)][`${"set_product_quantity_" + (formData.set.products.length - 1)}`].select();
                  }, 300);

                  /*
                  if (timerRef.current) clearTimeout(timerRef.current);
                  timerRef.current = setTimeout(() => {
                    inputRefs.current[0][`${"set_product_unit_price_0"}`].select();
                  }, 100);*/


                  /*
                  setProductOptions([]);
                  setOpenProductSearchResult(false);
                  productSearchRef.current?.clear();
                  */
                  /*
                  searchByMultipleValuesField(
                    "category_id",
                    selectedItems
                  );*/
                }}
                options={productSetOptions}
                placeholder="Select Products"
                highlightOnlyResult={true}
                open={openProductSetSearchResult}
                onKeyDown={(e) => {
                  if (timerRef.current) clearTimeout(timerRef.current);
                  if (e.key === "Escape") {
                    timerRef.current = setTimeout(() => {
                      setOpenProductSetSearchResult(false);
                      setProductSetOptions([]);
                      productSetSearchRef.current?.clear();
                    }, 100);
                  }

                  timerRef.current = setTimeout(() => {
                    productSetSearchRef.current?.focus();
                  }, 100);

                }}
                onInputChange={(searchTerm, e) => {
                  suggestProducts(searchTerm, "set");

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
                        }}>
                          <div style={{ width: '3%', border: "solid 0px", }}></div>
                          <div style={{ width: '14%', border: "solid 0px", }}>Part Number</div>
                          <div style={{ width: '29%', border: "solid 0px", }}>Name</div>
                          <div style={{ width: '10%', border: "solid 0px", }}>S.Unit Price</div>
                          <div style={{ width: '13%', border: "solid 0px", }}>Stock</div>
                          <div style={{ width: '5%', border: "solid 0px", }}>Photos</div>
                          <div style={{ width: '8%', border: "solid 0px", }}>Brand</div>
                          <div style={{ width: '10%' }}>P.Unit Price</div>
                          <div style={{ width: '8%', border: "solid 0px", }}>Country</div>
                        </div>
                      </MenuItem>

                      {/* Rows */}
                      {results.map((option, index) => {
                        const onlyOneResult = results.length === 1;
                        const isActive = state.activeIndex === index || onlyOneResult;
                        let checked = IsProductExistsInSet(option.id);
                        return (
                          <MenuItem option={option} position={index} key={index} style={{ padding: "0px" }}>
                            <div style={{ display: 'flex', padding: '4px 8px' }}>
                              <div
                                className="form-check"
                                style={{ ...columnStyle, width: '3%' }}
                                onClick={e => {
                                  e.stopPropagation();     // Stop click bubbling to parent MenuItem
                                  checked = !checked;

                                  if (timerRef.current) clearTimeout(timerRef.current);
                                  timerRef.current = setTimeout(() => {
                                    if (checked) {
                                      AddProductToSet(option);
                                    } else {
                                      RemoveProductFromSetByObj(option);
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
                                        AddProductToSet(option);
                                      } else {
                                        RemoveProductFromSetByObj(option);
                                      }
                                    }, 100);
                                  }}
                                />
                              </div>
                              <div style={{ ...columnStyle, width: '14%' }}>
                                {highlightWords(
                                  option.prefix_part_number
                                    ? `${option.prefix_part_number} - ${option.part_number}`
                                    : option.part_number,
                                  searchWords,
                                  isActive
                                )}
                              </div>
                              <div style={{ ...columnStyle, width: '29%' }}>
                                {highlightWords(
                                  option.name_in_arabic
                                    ? `${option.name} - ${option.name_in_arabic}`
                                    : option.name,
                                  searchWords,
                                  isActive
                                )}
                              </div>
                              <div style={{ ...columnStyle, width: '10%' }}>
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
                              <div style={{ ...columnStyle, width: '13%' }}>
                                {(() => {
                                  const storeId = localStorage.getItem("store_id");
                                  const productStore = option.product_stores?.[storeId];
                                  const warehouseStocks = productStore?.warehouse_stocks || {};
                                  const mainStock = warehouseStocks["main_store"] ?? 0;
                                  let warehouseDetail = "";
                                  if (store.settings?.enable_warehouse_module) {
                                    const whEntries = Object.entries(warehouseStocks)
                                      .filter(([key]) => key !== "main_store")
                                      .map(([key, value]) => {
                                        let name = key.toUpperCase();
                                        return `${name}: ${value}`;
                                      });
                                    if (whEntries.length > 0) {
                                      warehouseDetail = ` (${whEntries.join(", ")})`;
                                    }
                                  }
                                  return (
                                    <span>
                                      {mainStock}
                                      {warehouseDetail}
                                    </span>
                                  );
                                })()}
                              </div>
                              <div style={{ ...columnStyle, width: '5%' }}>
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
                              <div style={{ ...columnStyle, width: '8%' }}>
                                {highlightWords(option.brand_name, searchWords, isActive)}
                              </div>
                              <div style={{ ...columnStyle, width: '10%' }}>
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
                              <div style={{ ...columnStyle, width: '8%' }}>
                                {highlightWords(option.country_name, searchWords, isActive)}
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

            <div className="col-md-12">
              <label className="form-label">Set Products</label>
              <div class="table-responsive" style={{}}>
                <table class="table table-striped table-sm table-bordered">
                  {formData.set?.products && formData.set?.products?.length > 0 &&
                    <thead className="text-center">
                      <th style={{ width: "11%" }}>
                        Part No.
                      </th>
                      <th style={{ width: "19%" }}>
                        Name
                      </th>
                      <th style={{ width: "5%" }} >Info</th>
                      <th style={{ width: "8%" }}>
                        Qty
                      </th>
                      <th style={{ width: "4%" }}>
                        Unit
                      </th>
                      <th style={{ width: "8%" }}>
                        Purchase Unit Price
                      </th>
                      <th style={{ width: "8%" }}>
                        Purchase Unit Price(with VAT)
                      </th>
                      <th style={{ width: "8%" }}>
                        Purchase Price %
                      </th>
                      <th style={{ width: "8%" }}>
                        Retail Unit Price
                      </th>
                      <th style={{ width: "8%" }}>
                        Retail Unit Price(with VAT)
                      </th>
                      <th style={{ width: "8%" }}>
                        Retail Price %
                      </th>
                      <th style={{ width: "5%" }}>
                        Action
                      </th>
                    </thead>}
                  <tbody>
                    {formData.set?.products &&
                      formData.set?.products.map((product, key) => (
                        <tr key={key}>
                          <td >
                            <span style={{ color: "blue", cursor: "pointer" }} onClick={() => {
                              openUpdateForm(product.product_id);
                            }}>{product.part_number}</span>
                          </td>
                          <td >
                            <span style={{ color: "blue", cursor: "pointer" }} onClick={() => {
                              openUpdateForm(product.product_id);
                            }}>{product.name}</span>
                          </td>
                          <td style={{ verticalAlign: 'middle', padding: '0.25rem' }}>
                            <div style={{ zIndex: "9999 !important", position: "absolute !important" }}>
                              <Dropdown drop="top">
                                <Dropdown.Toggle variant="secondary" id="dropdown-secondary" style={{}}>
                                  <i className="bi bi-info"></i>
                                </Dropdown.Toggle>

                                <Dropdown.Menu style={{ zIndex: 9999, position: "absolute" }} popperConfig={{ modifiers: [{ name: 'preventOverflow', options: { boundary: 'viewport' } }] }}>
                                  <Dropdown.Item onClick={() => openLinkedProducts(product)}>
                                    <i className="bi bi-link"></i>&nbsp;
                                    Linked Products ({getShortcut('linkedProducts')})
                                  </Dropdown.Item>

                                  <Dropdown.Item onClick={() => openProductHistory(product)}>
                                    <i className="bi bi-clock-history"></i>&nbsp;
                                    History ({getShortcut('productHistory')})
                                  </Dropdown.Item>

                                  <Dropdown.Item onClick={() => openSalesHistory(product)}>
                                    <i className="bi bi-clock-history"></i>&nbsp;
                                    Sales History ({getShortcut('salesHistory')})
                                  </Dropdown.Item>

                                  <Dropdown.Item onClick={() => openSalesReturnHistory(product)}>
                                    <i className="bi bi-clock-history"></i>&nbsp;
                                    Sales Return History ({getShortcut('salesReturnHistory')})
                                  </Dropdown.Item>

                                  <Dropdown.Item onClick={() => openPurchaseHistory(product)}>
                                    <i className="bi bi-clock-history"></i>&nbsp;
                                    Purchase History ({getShortcut('purchaseHistory')})
                                  </Dropdown.Item>

                                  <Dropdown.Item onClick={() => openPurchaseReturnHistory(product)}>
                                    <i className="bi bi-clock-history"></i>&nbsp;
                                    Purchase Return History ({getShortcut('purchaseReturnHistory')})
                                  </Dropdown.Item>

                                  <Dropdown.Item onClick={() => openDeliveryNoteHistory(product)}>
                                    <i className="bi bi-clock-history"></i>&nbsp;
                                    Delivery Note History ({getShortcut('deliveryNoteHistory')})
                                  </Dropdown.Item>

                                  <Dropdown.Item onClick={() => openQuotationHistory(product)}>
                                    <i className="bi bi-clock-history"></i>&nbsp;
                                    Quotation History ({getShortcut('quotationHistory')})
                                  </Dropdown.Item>

                                  <Dropdown.Item onClick={() => openQuotationSalesHistory(product)}>
                                    <i className="bi bi-clock-history"></i>&nbsp;
                                    Qtn. Sales History ({getShortcut('quotationSalesHistory')})
                                  </Dropdown.Item>

                                  <Dropdown.Item onClick={() => openQuotationSalesReturnHistory(product)}>
                                    <i className="bi bi-clock-history"></i>&nbsp;
                                    Qtn. Sales Return History ({getShortcut('quotationSalesReturnHistory')})
                                  </Dropdown.Item>

                                  <Dropdown.Item onClick={() => openProductImages(product.product_id)}>
                                    <i className="bi bi-clock-history"></i>&nbsp;
                                    Images ({getShortcut('images')})
                                  </Dropdown.Item>
                                </Dropdown.Menu>
                              </Dropdown>
                            </div>
                          </td>

                          <td >
                            <input type='number'
                              id={`${"set_product_quantity_" + key}`}
                              name={`${"set_product_quantity_" + key}`}
                              value={formData.set.products[key].quantity}
                              className="form-control"
                              ref={(el) => {
                                if (!inputRefs.current[key]) inputRefs.current[key] = {};
                                inputRefs.current[key][`${"set_product_quantity_" + key}`] = el;
                              }}
                              onFocus={() => {
                                if (timerRef.current) clearTimeout(timerRef.current);
                                timerRef.current = setTimeout(() => {
                                  inputRefs.current[key][`${"set_product_quantity_" + key}`].select();
                                }, 100);
                              }}
                              onKeyDown={(e) => {
                                RunKeyActions(e, product);
                                if (timerRef.current) clearTimeout(timerRef.current);

                                if (e.key === "ArrowLeft") {
                                  if ((key + 1) === formData.set.products.length) {
                                    timerRef.current = setTimeout(() => {
                                      productSetSearchRef.current?.focus();
                                    }, 100);
                                  } else {
                                    timerRef.current = setTimeout(() => {
                                      inputRefs.current[(key + 1)][`${"set_product_unit_price_with_vat_" + (key + 1)}`].focus();
                                    }, 100);
                                  }
                                }
                              }}

                              onChange={(e) => {
                                errors["set_product_quantity_" + key] = "";
                                setErrors({ ...errors });

                                if (e.target.value === 0) {
                                  formData.set.products[key].quantity = 0;
                                  setFormData({ ...formData });
                                  findSetTotal();
                                  return;
                                }

                                if (!e.target.value) {
                                  formData.set.products[key].quantity = "";
                                  setFormData({ ...formData });
                                  findSetTotal();
                                  return;
                                }

                                formData.set.products[key].quantity = parseFloat(e.target.value);
                                setFormData({ ...formData });
                                findSetTotal();
                                console.log(formData);
                              }}
                            />
                            {errors["set_product_quantity_" + key] && (
                              <div style={{ color: "red" }}>

                                {errors["set_product_quantity_" + key]}
                              </div>
                            )}
                          </td>
                          <td>
                            {formData.set.products[key].unit ? formData.set.products[key].unit[0]?.toUpperCase() : 'P'}
                          </td>
                          <td >
                            <input type='number'
                              id={`${"set_product_purchase_unit_price_" + key}`}
                              name={`${"set_product_purchase_unit_price_" + key}`}
                              value={formData.set.products[key].purchase_unit_price}
                              className="form-control"
                              ref={(el) => {
                                if (!inputRefs.current[key]) inputRefs.current[key] = {};
                                inputRefs.current[key][`${"set_product_purchase_unit_price_" + key}`] = el;
                              }}
                              onFocus={() => {
                                if (timerRef.current) clearTimeout(timerRef.current);
                                timerRef.current = setTimeout(() => {
                                  inputRefs.current[key][`${"set_product_purchase_unit_price_" + key}`].select();
                                }, 100);
                              }}
                              onKeyDown={(e) => {
                                RunKeyActions(e, product);
                                if (timerRef.current) clearTimeout(timerRef.current);

                                if (e.key === "ArrowLeft") {
                                  timerRef.current = setTimeout(() => {
                                    inputRefs.current[(key)][`${"set_product_quantity_" + (key)}`].focus();
                                    // productSetSearchRef.current?.focus();
                                  }, 100);
                                }
                              }}

                              onChange={(e) => {
                                errors["set_product_purchase_unit_price_" + key] = "";
                                setErrors({ ...errors });

                                if (e.target.value === 0) {
                                  formData.set.products[key].purchase_unit_price_with_vat = 0;
                                  formData.set.products[key].purchase_unit_price = 0;
                                  findSetTotal();
                                  setFormData({ ...formData });
                                  return;
                                }

                                if (!e.target.value) {
                                  formData.set.products[key].purchase_unit_price_with_vat = "";
                                  formData.set.products[key].purchase_unit_price = "";
                                  findSetTotal();
                                  setFormData({ ...formData });
                                  return;
                                }

                                formData.set.products[key].purchase_unit_price = parseFloat(e.target.value);
                                formData.set.products[key].purchase_unit_price_with_vat = parseFloat(trimTo8Decimals(formData.set.products[key].purchase_unit_price * (1 + (store.vat_percent / 100))));
                                setFormData({ ...formData });
                                findSetTotal();
                                console.log(formData);
                              }}
                            />
                            {errors["set_product_purchase_unit_price_" + key] && (
                              <div style={{ color: "red" }}>
                                {errors["set_product_purchase_unit_price_" + key]}
                              </div>
                            )}
                          </td>
                          <td >
                            <input type='number'
                              id={`${"set_product_purchase_unit_price_with_vat_" + key}`}
                              name={`${"set_product_purchase_unit_price_with_vat_" + key}`}
                              value={formData.set.products[key].purchase_unit_price_with_vat}
                              className="form-control "
                              ref={(el) => {
                                if (!inputRefs.current[key]) inputRefs.current[key] = {};
                                inputRefs.current[key][`${"set_product_purchase_unit_price_with_vat_" + key}`] = el;
                              }}
                              onFocus={() => {
                                if (timerRef.current) clearTimeout(timerRef.current);
                                timerRef.current = setTimeout(() => {
                                  inputRefs.current[key][`${"set_product_purchase_unit_price_with_vat_" + key}`]?.select();
                                }, 100);
                              }}
                              onKeyDown={(e) => {
                                RunKeyActions(e, product);
                                if (timerRef.current) clearTimeout(timerRef.current);

                                if (e.key === "Enter") {
                                  if ((key + 1) === formData.set.products.length) {
                                    timerRef.current = setTimeout(() => {
                                      productSetSearchRef.current?.focus();
                                    }, 100);
                                  } else {
                                    console.log("moviing to next line")
                                    if (key === 0) {
                                      timerRef.current = setTimeout(() => {
                                        productSetSearchRef.current?.focus();
                                      }, 100);
                                    } else {
                                      timerRef.current = setTimeout(() => {
                                        inputRefs.current[key][`${"set_product_unit_price_" + key}`].focus();
                                      }, 100);
                                    }
                                  }
                                } else if (e.key === "ArrowLeft") {
                                  timerRef.current = setTimeout(() => {
                                    inputRefs.current[key][`${"set_product_purchase_unit_price_" + key}`].focus();
                                  }, 100);
                                }
                              }}

                              onChange={(e) => {
                                errors["set_product_purchase_unit_price_with_vat_" + key] = "";
                                setErrors({ ...errors });

                                if (e.target.value === 0) {
                                  formData.set.products[key].purchase_unit_price_with_vat = 0;
                                  formData.set.products[key].purchase_unit_price = 0;
                                  findSetTotal();
                                  setFormData({ ...formData });
                                  return;
                                }

                                if (!e.target.value) {
                                  formData.set.products[key].purchase_unit_price_with_vat = "";
                                  formData.set.products[key].purchase_unit_price = ""
                                  findSetTotal();
                                  setFormData({ ...formData });
                                  return;
                                }

                                formData.set.products[key].purchase_unit_price_with_vat = parseFloat(e.target.value);
                                formData.set.products[key].purchase_unit_price = parseFloat(trimTo8Decimals(formData.set.products[key].purchase_unit_price_with_vat / (1 + (store.vat_percent / 100))));
                                setFormData({ ...formData });
                                findSetTotal();
                                console.log(formData);
                              }}
                            />
                            {errors["set_product_purchase_unit_price_with_vat_" + key] && (
                              <div style={{ color: "red" }}>

                                {errors["set_product_purchase_unit_price_with_vat_" + key]}
                              </div>
                            )}
                          </td>
                          <td >
                            {trimTo2Decimals(formData.set.products[key].purchase_price_percent) + "%"}
                            <OverlayTrigger placement="right" overlay={renderPercentTooltip({ value: formData.set.products[key].purchase_price_percent })}>
                              <span style={{ textDecoration: 'underline dotted', cursor: 'pointer' }}>ℹ️</span>
                            </OverlayTrigger>
                          </td>
                          <td style={{ width: "140px" }}>
                            <input type='number'
                              id={`${"set_product_unit_price_" + key}`}
                              name={`${"set_product_unit_price_" + key}`}
                              value={formData.set.products[key].retail_unit_price}
                              className="form-control"
                              ref={(el) => {
                                if (!inputRefs.current[key]) inputRefs.current[key] = {};
                                inputRefs.current[key][`${"set_product_unit_price_" + key}`] = el;
                              }}
                              onFocus={() => {
                                if (timerRef.current) clearTimeout(timerRef.current);
                                timerRef.current = setTimeout(() => {
                                  inputRefs.current[key][`${"set_product_unit_price_" + key}`].select();
                                }, 100);
                              }}
                              onKeyDown={(e) => {
                                RunKeyActions(e, product);
                                if (timerRef.current) clearTimeout(timerRef.current);

                                if (e.key === "ArrowLeft") {
                                  timerRef.current = setTimeout(() => {
                                    inputRefs.current[(key)][`${"set_product_purchase_unit_price_with_vat_" + (key)}`].focus();
                                    // productSetSearchRef.current?.focus();
                                  }, 100);
                                }
                              }}

                              onChange={(e) => {
                                errors["set_product_unit_price_" + key] = "";
                                setErrors({ ...errors });

                                if (e.target.value === 0) {
                                  formData.set.products[key].retail_unit_price_with_vat = 0;
                                  formData.set.products[key].retail_unit_price = 0;
                                  findSetTotal();
                                  setFormData({ ...formData });
                                  return;
                                }

                                if (!e.target.value) {
                                  formData.set.products[key].retail_unit_price_with_vat = "";
                                  formData.set.products[key].retail_unit_price = "";
                                  findSetTotal();
                                  setFormData({ ...formData });
                                  return;
                                }

                                formData.set.products[key].retail_unit_price = parseFloat(e.target.value);
                                formData.set.products[key].retail_unit_price_with_vat = parseFloat(trimTo8Decimals(formData.set.products[key].retail_unit_price * (1 + (store.vat_percent / 100))));
                                setFormData({ ...formData });
                                findSetTotal();
                                console.log(formData);
                              }}
                            />
                            {errors["set_product_unit_price_" + key] && (
                              <div style={{ color: "red" }}>

                                {errors["set_product_unit_price_" + key]}
                              </div>
                            )}
                          </td>
                          <td >
                            <input type='number'
                              id={`${"set_product_unit_price_with_vat_" + key}`}
                              name={`${"set_product_unit_price_with_vat_" + key}`}
                              value={formData.set.products[key].retail_unit_price_with_vat}
                              className="form-control "
                              ref={(el) => {
                                if (!inputRefs.current[key]) inputRefs.current[key] = {};
                                inputRefs.current[key][`${"set_product_unit_price_with_vat_" + key}`] = el;
                              }}
                              onFocus={() => {
                                if (timerRef.current) clearTimeout(timerRef.current);
                                timerRef.current = setTimeout(() => {
                                  inputRefs.current[key][`${"set_product_unit_price_with_vat_" + key}`]?.select();
                                }, 100);
                              }}
                              onKeyDown={(e) => {
                                RunKeyActions(e, product);
                                if (timerRef.current) clearTimeout(timerRef.current);

                                if (e.key === "Enter") {
                                  if ((key + 1) === formData.set.products.length) {
                                    timerRef.current = setTimeout(() => {
                                      productSetSearchRef.current?.focus();
                                    }, 100);
                                  } else {
                                    console.log("moviing to next line")
                                    if (key === 0) {
                                      timerRef.current = setTimeout(() => {
                                        productSetSearchRef.current?.focus();
                                      }, 100);
                                    } else {
                                      timerRef.current = setTimeout(() => {
                                        inputRefs.current[key - 1][`${"set_product_quantity_" + (key - 1)}`]?.focus();
                                      }, 100);
                                    }
                                  }
                                } else if (e.key === "ArrowLeft") {
                                  timerRef.current = setTimeout(() => {
                                    inputRefs.current[key][`${"set_product_unit_price_" + key}`].focus();
                                  }, 100);
                                }
                              }}

                              onChange={(e) => {
                                errors["set_product_unit_price_with_vat_" + key] = "";
                                setErrors({ ...errors });

                                if (e.target.value === 0) {
                                  formData.set.products[key].retail_unit_price_with_vat = 0;
                                  formData.set.products[key].retail_unit_price = 0;
                                  findSetTotal();
                                  setFormData({ ...formData });
                                  return;
                                }

                                if (!e.target.value) {
                                  formData.set.products[key].retail_unit_price_with_vat = "";
                                  formData.set.products[key].retail_unit_price = ""
                                  findSetTotal();
                                  setFormData({ ...formData });
                                  return;
                                }

                                formData.set.products[key].retail_unit_price_with_vat = parseFloat(e.target.value);
                                formData.set.products[key].retail_unit_price = parseFloat(trimTo8Decimals(formData.set.products[key].retail_unit_price_with_vat / (1 + (store.vat_percent / 100))));
                                setFormData({ ...formData });
                                findSetTotal();
                                console.log(formData);
                              }}
                            />
                            {errors["set_product_unit_price_with_vat_" + key] && (
                              <div style={{ color: "red" }}>

                                {errors["set_product_unit_price_with_vat_" + key]}
                              </div>
                            )}
                          </td>
                          <td>
                            {trimTo2Decimals(formData.set.products[key].retail_price_percent) + "%"}
                            <OverlayTrigger placement="right" overlay={renderPercentTooltip({ value: formData.set.products[key].retail_price_percent })}>
                              <span style={{ textDecoration: 'underline dotted', cursor: 'pointer' }}>ℹ️</span>
                            </OverlayTrigger>
                          </td>
                          <td>
                            <Button variant="danger" onClick={(event) => {
                              RemoveProductFromSet(key);
                            }}>
                              <i className="bi bi-trash"></i>
                            </Button>
                          </td>

                        </tr>
                      )).reverse()}
                    <tr>
                      <td></td>
                      <td></td>

                      <td class="text-end">
                        <b>Total</b>
                      </td>
                      <td> {formData.set?.total_quantity ? trimTo4Decimals(formData.set?.total_quantity) : ""} </td>
                      <td></td>
                      <td><b style={{ marginLeft: "14px" }}>{formData.set?.purchase_total ? trimTo4Decimals(formData.set?.purchase_total) : ""}</b>
                        {errors["set_purchase_total"] && (
                          <div style={{ color: "red" }}>
                            {errors["set_purchase_total"]}
                          </div>
                        )}
                      </td>
                      <td><b style={{ marginLeft: "14px" }}>{formData.set?.purchase_total_with_vat ? trimTo4Decimals(formData.set?.purchase_total_with_vat) : ""}</b>
                        {errors["set_purchase_total_with_vat"] && (
                          <div style={{ color: "red" }}>
                            {errors["set_purchase_total_with_vat"]}
                          </div>
                        )}
                      </td>
                      <td></td>
                      <td><b style={{ marginLeft: "14px" }}>{formData.set?.total ? trimTo4Decimals(formData.set?.total) : ""}</b>
                        {errors["set_total"] && (
                          <div style={{ color: "red" }}>
                            {errors["set_total"]}
                          </div>
                        )}
                      </td>
                      <td><b style={{ marginLeft: "14px" }}>{formData.set?.total_with_vat ? trimTo4Decimals(formData.set?.total_with_vat) : ""}</b>
                        {errors["set_total_with_vat"] && (
                          <div style={{ color: "red" }}>
                            {errors["set_total_with_vat"]}
                          </div>
                        )}
                      </td>
                      <td></td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>

              </div>
            </div>

            <h4>Link Products</h4>
            <div className="col-md-12">
              {/*<label className="form-label">Linked Products</label>*/}
              <Typeahead
                id="linked_product_id"
                labelKey="search_label"
                emptyLabel=""
                filterBy={() => true}
                ref={productSearchRef}
                onChange={(selectedItems) => {

                  // alert(selectedItems[selectedItems.length - 1].part_number);
                  if (selectedItems.length > selectedLinkedProducts.length) {
                    if (!IsProductExistsInLinkedProducts(selectedItems[selectedItems.length - 1].id)) {
                      setSelectedLinkedProducts(selectedItems);
                    }
                  } else {
                    setSelectedLinkedProducts(selectedItems);
                  }



                  setOpenProductSearchResult(false);
                  /*
                  setProductOptions([]);
                  setOpenProductSearchResult(false);
                  productSearchRef.current?.clear();
                  */
                  /*
                  searchByMultipleValuesField(
                    "category_id",
                    selectedItems
                  );*/
                }}
                options={productOptions}
                placeholder="Select Products"
                selected={selectedLinkedProducts}
                highlightOnlyResult={true}
                open={openProductSearchResult}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setProductOptions([]);
                    setOpenProductSearchResult(false);
                    // productSearchRef.current?.clear();
                  }
                }}
                onInputChange={(searchTerm, e) => {
                  if (timerRef.current) clearTimeout(timerRef.current);
                  timerRef.current = setTimeout(() => {
                    suggestProducts(searchTerm);
                  }, 100);

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
                        }}>
                          <div style={{ width: '3%', border: "solid 0px", }}></div>
                          <div style={{ width: '14%', border: "solid 0px", }}>Part Number</div>
                          <div style={{ width: '29%', border: "solid 0px", }}>Name</div>
                          <div style={{ width: '12%', border: "solid 0px", }}>S.Unit Price</div>
                          <div style={{ width: '5%', border: "solid 0px", }}>Stock</div>
                          <div style={{ width: '5%', border: "solid 0px", }}>Photos</div>
                          <div style={{ width: '10%', border: "solid 0px", }}>Brand</div>
                          <div style={{ width: '12%' }}>P.Unit Price</div>
                          <div style={{ width: '10%', border: "solid 0px", }}>Country</div>
                        </div>
                      </MenuItem>

                      {/* Rows */}
                      {results.map((option, index) => {
                        const onlyOneResult = results.length === 1;
                        const isActive = state.activeIndex === index || onlyOneResult;
                        let checked = IsProductExistsInLinkedProducts(option.id);
                        return (
                          <MenuItem option={option} position={index} key={index} style={{ padding: "0px" }}>
                            <div style={{ display: 'flex', padding: '4px 8px' }}>
                              <div
                                className="form-check"
                                style={{ ...columnStyle, width: '3%' }}
                                onClick={e => {
                                  e.stopPropagation();     // Stop click bubbling to parent MenuItem
                                  checked = !checked;

                                  if (timerRef.current) clearTimeout(timerRef.current);
                                  timerRef.current = setTimeout(() => {
                                    if (checked) {
                                      // addProduct(option);
                                      selectedLinkedProducts.push(option);
                                      setSelectedLinkedProducts([...selectedLinkedProducts]);
                                    } else {
                                      removeProductFromLinkedProducts(option);
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
                                        // addProduct(option);
                                        selectedLinkedProducts.push(option);
                                        setSelectedLinkedProducts([...selectedLinkedProducts]);
                                      } else {
                                        removeProductFromLinkedProducts(option);
                                      }
                                    }, 100);
                                  }}
                                />
                              </div>
                              <div style={{ ...columnStyle, width: '14%' }}>
                                {highlightWords(
                                  option.prefix_part_number
                                    ? `${option.prefix_part_number}-${option.part_number}`
                                    : option.part_number,
                                  searchWords,
                                  isActive
                                )}
                              </div>
                              <div style={{ ...columnStyle, width: '29%' }}>
                                {highlightWords(
                                  option.name_in_arabic
                                    ? `${option.name} - ${option.name_in_arabic}`
                                    : option.name,
                                  searchWords,
                                  isActive
                                )}
                              </div>
                              <div style={{ ...columnStyle, width: '12%' }}>
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
                              <div style={{ ...columnStyle, width: '5%' }}>
                                {(() => {
                                  const storeId = localStorage.getItem("store_id");
                                  const productStore = option.product_stores?.[storeId];
                                  const totalStock = productStore?.stock ?? 0;
                                  const warehouseStocks = productStore?.warehouse_stocks ?? {};

                                  // Build warehouse stock details string
                                  const warehouseDetails = (() => {
                                    // Always show MS first
                                    let details = [];
                                    if (warehouseStocks["main_store"] !== undefined) {
                                      details.push(`MS: ${warehouseStocks["main_store"]}`);
                                    }
                                    Object.entries(warehouseStocks)
                                      .filter(([key]) => key !== "main_store")
                                      .forEach(([key, value]) => {
                                        details.push(`${key.replace(/^w/, "WH").toUpperCase()}: ${value}`);
                                      });
                                    return details.join(", ");
                                  })();

                                  // Final display string
                                  return (
                                    <span>
                                      {totalStock}
                                      {warehouseDetails && store.settings.enable_warehouse_module ? ` (${warehouseDetails})` : ""}
                                    </span>
                                  );
                                })()}
                              </div>
                              <div style={{ ...columnStyle, width: '5%' }}>
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
                              <div style={{ ...columnStyle, width: '10%' }}>
                                {highlightWords(option.brand_name, searchWords, isActive)}
                              </div>
                              <div style={{ ...columnStyle, width: '12%' }}>
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
                              <div style={{ ...columnStyle, width: '10%' }}>
                                {highlightWords(option.country_name, searchWords, isActive)}
                              </div>
                            </div>
                          </MenuItem>
                        );
                      })}
                    </Menu>
                  );
                }}
                multiple
              />
            </div>
            <div className="col-md-12">
              <label className="form-label">Product photos</label>
              <ImageGallery
                ref={ImageGalleryRef}
                id={formData.id}
                storeID={formData.store_id}
                storedImages={formData.images}
                modelName={"product"}
                handleDelete={handleDeleteImage}
              />
            </div>

            {/*<div className="col-md-6">
              <label className="form-label">Image</label>

              <div className="input-group mb-3">
                <input
                  id="product_image"
                  name="product_image"
                  value={selectedImage ? selectedImage : ""}
                  type="file"
                  onChange={(e) => {
                    errors["image"] = "";
                    setErrors({ ...errors });

                    if (!e.target.value) {
                      errors["image"] = "Invalid Image File";
                      setErrors({ ...errors });
                      return;
                    }

                    selectedImage = e.target.value;
                    setSelectedImage(selectedImage);

                    let file = document.querySelector("#image").files[0];

                    let targetHeight = 400;
                    let targetWidth = 400;

                    let url = URL.createObjectURL(file);
                    let img = new Image();

                    img.onload = function () {
                      let originaleWidth = img.width;
                      let originalHeight = img.height;

                      let targetDimensions = getTargetDimension(
                        originaleWidth,
                        originalHeight,
                        targetWidth,
                        targetHeight
                      );
                      targetWidth = targetDimensions.targetWidth;
                      targetHeight = targetDimensions.targetHeight;

                      resizeFIle(file, targetWidth, targetHeight, (result) => {
                        formData.images_content[0] = result;
                        setFormData({ ...formData });

                        console.log(
                          "formData.images_content[0]:",
                          formData.images_content[0]
                        );
                      });
                    };
                    img.src = url;


                  }}
                  className="form-control"
                />
                {errors.image && (
                  <div style={{ color: "red" }}>
                    {errors.image}
                  </div>
                )}

              </div>
            </div>*/}

            <Modal.Footer>
              <Button variant="secondary" onClick={handleClose}>
                Close
              </Button>
              <Button variant="primary" onClick={handleCreate}>
                {isProcessing
                  ? (
                    <Spinner
                      as="span"
                      animation="bproduct"
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
      </Modal >
    </>
  );
});

export default ProductCreate;