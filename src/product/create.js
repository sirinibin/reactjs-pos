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
import SalesHistory from "../utils/product_sales_history.js";
import SalesReturnHistory from "./../utils/product_sales_return_history.js";
import PurchaseHistory from "./../utils/product_purchase_history.js";
import PurchaseReturnHistory from "./../utils/product_purchase_return_history.js";
import QuotationHistory from "./../utils/product_quotation_history.js";
import QuotationSalesReturnHistory from "./../utils/product_quotation_sales_return_history.js";

import DeliveryNoteHistory from "./../utils/product_delivery_note_history.js";
import Products from "../utils/products.js";
import ImageViewerModal from './../utils/ImageViewerModal';
import { highlightWords } from "../utils/search.js";
//import ProductHistory from "./../product/product_history.js";
import ProductHistory from "../utils/product_history.js";

import DatePicker from "react-datepicker";
import { format } from "date-fns";
import { ObjectToSearchQueryParams } from '../utils/queryUtils.js';
import { fetchStore } from '../utils/storeUtils.js';
import { useEnterKeyNavigation } from '../utils/useEnterKeyNavigation.js';

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
      selectedBrands = [];
      setSelectedBrands(selectedBrands);
      selectedCountries = [];
      setSelectedCountries(selectedCountries);

      productStores = {};
      productStores[localStorage.getItem('store_id')] = {};
      setProductStores({ ...productStores });

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

      if (!id && store?.settings?.allow_products_duplicates_by_default) {
        formData.allow_duplicates = true;
        setFormData({ ...formData });
      }

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
      try {
          const data = await fetchStore(id);
          store = data;
          setStore({ ...data });
      } catch (error) { }
  }


  useEnterKeyNavigation();




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
  const [flash, setFlash] = useState(null); // { text, type: 'success'|'danger' }
  const flashTimerRef = useRef(null);

  function showFlash(text, type = 'success') {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    setFlash({ text, type });
    flashTimerRef.current = setTimeout(() => setFlash(null), 4000);
  }

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
    const wasNew = !formData.id;
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

        const msg = wasNew ? "Product created successfully!" : "Product updated successfully!";
        showFlash(msg, "success");

        try {
          await ImageGalleryRef.current.uploadAllImages();
        } catch (imgErr) {
          console.warn("Image upload error (product was saved):", imgErr);
        }

        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          setProcessing(false);

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
        showFlash("Failed to save product. Please fix the errors and try again.", "danger");
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

    const apiSearchTerm = searchTerm.split(/\s+/).map(w => w.replace(/^-+/, "")).filter(Boolean).join(" ");
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

    let Select = `select=id,additional_keywords,search_label,set.name,item_code,prefix_part_number,country_name,brand_name,part_number,name,unit,name_in_arabic,product_stores.${localStorage.getItem('store_id')}.purchase_unit_price,product_stores.${localStorage.getItem('store_id')}.purchase_unit_price_with_vat,product_stores.${localStorage.getItem('store_id')}.retail_unit_price,product_stores.${localStorage.getItem('store_id')}.retail_unit_price_with_vat,product_stores.${localStorage.getItem('store_id')}.stock,product_stores.${localStorage.getItem('store_id')}.warehouse_stocks,product_stores.${localStorage.getItem('store_id')}.warehouse_racks`;
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

  useEffect(() => {
    const blurNumberOnWheel = () => {
      if (document.activeElement?.type === 'number') {
        document.activeElement.blur();
      }
    };
    document.addEventListener('wheel', blurNumberOnWheel, { passive: true });
    return () => document.removeEventListener('wheel', blurNumberOnWheel);
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
      linkedProducts: "Ctrl + Shift + 9",
      productHistory: "Ctrl + Shift + 2",
      salesHistory: "Ctrl + Shift + 3",
      salesReturnHistory: "Ctrl + Shift + 4",
      purchaseHistory: "Ctrl + Shift + 5",
      purchaseReturnHistory: "Ctrl + Shift + 6",
      deliveryNoteHistory: "Ctrl + Shift + 7",
      quotationHistory: "Ctrl + Shift + 8",
      quotationSalesHistory: "Ctrl + Shift + 1",
      quotationSalesReturnHistory: "Ctrl + Shift + Z",
      images: "Ctrl + Shift + F",
    },
    LGK: {
      linkedProducts: "F3",
      productHistory: "Ctrl + Shift + B",
      salesHistory: "F4",
      salesReturnHistory: "F9",
      purchaseHistory: "F6",
      purchaseReturnHistory: "F8",
      deliveryNoteHistory: "Ctrl + Shift + P",
      quotationHistory: "F2",
      quotationSalesHistory: "F10",
      quotationSalesReturnHistory: "Ctrl + Shift + Z",
      images: "Ctrl + Shift + F",
    },
    MBDI: {
      linkedProducts: "Ctrl + Shift + 7",
      productHistory: "Ctrl + Shift + 6",
      salesHistory: "F4",
      salesReturnHistory: "F9",
      purchaseHistory: "F6",
      purchaseReturnHistory: "F8",
      deliveryNoteHistory: "F10",
      quotationHistory: "F2",
      quotationSalesHistory: "F3",
      quotationSalesReturnHistory: "Ctrl + Shift + 8",
      images: "Ctrl + Shift + 9",
    },
    "MBDI-SIMULATION": {
      linkedProducts: "Ctrl + Shift + 7",
      productHistory: "Ctrl + Shift + 6",
      salesHistory: "F4",
      salesReturnHistory: "F9",
      purchaseHistory: "F6",
      purchaseReturnHistory: "F8",
      deliveryNoteHistory: "F10",
      quotationHistory: "F2",
      quotationSalesHistory: "F3",
      quotationSalesReturnHistory: "Ctrl + Shift + 8",
      images: "Ctrl + Shift + 9",
    },
    YNB: {
      linkedProducts: "Ctrl + Shift + 7",
      productHistory: "Ctrl + Shift + 6",
      salesHistory: "F4",
      salesReturnHistory: "F9",
      purchaseHistory: "F6",
      purchaseReturnHistory: "F8",
      deliveryNoteHistory: "F10",
      quotationHistory: "F2",
      quotationSalesHistory: "F3",
      quotationSalesReturnHistory: "Ctrl + Shift + 8",
      images: "Ctrl + Shift + 9",
    },
    MDNA: {
      linkedProducts: "Ctrl + Shift + 7",
      productHistory: "Ctrl + Shift + 6",
      salesHistory: "F4",
      salesReturnHistory: "F9",
      purchaseHistory: "F6",
      purchaseReturnHistory: "F8",
      deliveryNoteHistory: "F10",
      quotationHistory: "F2",
      quotationSalesHistory: "F3",
      quotationSalesReturnHistory: "Ctrl + Shift + 8",
      images: "Ctrl + Shift + 9",
    },
    "MDNA-SIMULATION": {
      linkedProducts: "Ctrl + Shift + 7",
      productHistory: "Ctrl + Shift + 6",
      salesHistory: "F4",
      salesReturnHistory: "F9",
      purchaseHistory: "F6",
      purchaseReturnHistory: "F8",
      deliveryNoteHistory: "F10",
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
        openQuotationSalesHistory(product);
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
        openLinkedProducts(product);
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
        openDeliveryNoteHistory(product);
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
        openQuotationHistory(product);
      } else if (isCmdOrCtrl && event.shiftKey && event.key.toLowerCase() === '7') {
        openLinkedProducts(product);
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
        case "1": openQuotationSalesHistory(product); return;
        case "2": openProductHistory(product); return;
        case "3": openSalesHistory(product); return;
        case "4": openSalesReturnHistory(product); return;
        case "5": openPurchaseHistory(product); return;
        case "6": openPurchaseReturnHistory(product); return;
        case "7": openDeliveryNoteHistory(product); return;
        case "8": openQuotationHistory(product); return;
        case "9": openLinkedProducts(product); return;
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
      "reason": "",
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
    if (show) {
      loadWarehouses();
    }
  }, [loadWarehouses, show]);

  // ── Design tokens (Enterprise Core) ──────────────────────────────────
  const CARD = { background: '#ffffff', border: '1px solid #c3c6d7', borderRadius: '8px', padding: '24px', marginBottom: '20px' };
  const TH = { padding: '8px 12px', textAlign: 'left', fontFamily: '"Inter", sans-serif', fontSize: '12px', fontWeight: 600, color: '#434655', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' };
  const TD = { padding: '8px 12px', fontFamily: '"Inter", sans-serif', fontSize: '13px', color: '#191c1e', verticalAlign: 'middle' };
  const INPUT = { border: '1px solid #c3c6d7', borderRadius: '4px', padding: '7px 12px', fontSize: '13px', fontFamily: '"Inter", sans-serif', width: '100%', outline: 'none', color: '#191c1e', background: '#fff' };
  const PRICE_INPUT = { border: '1px solid #c3c6d7', borderRadius: '4px', padding: '8px 12px', fontSize: '14px', fontFamily: '"Inter", sans-serif', width: '100%', outline: 'none', color: '#191c1e' };
  const PRICE_CARD = { background: '#ffffff', border: '1px solid #c3c6d7', borderRadius: '8px', padding: '20px', height: '100%' };
  const PRICE_CARD_LABEL = { fontFamily: '"Inter", sans-serif', fontSize: '11px', fontWeight: 600, color: '#434655', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '14px' };
  const PRICE_SUB_LABEL = { fontFamily: '"Inter", sans-serif', fontSize: '12px', fontWeight: 500, color: '#737686', marginBottom: '4px' };
  const ICON_BTN = { background: '#004ac6', color: '#ffffff', border: 'none', borderRadius: '4px', padding: '7px 10px', fontSize: '13px', cursor: 'pointer', flexShrink: 0, display: 'inline-flex', alignItems: 'center' };
  const SEC_BTN = { background: '#d0e1fb', color: '#54647a', border: 'none', borderRadius: '4px', padding: '7px 16px', fontSize: '13px', fontWeight: 600, fontFamily: '"Inter", sans-serif', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' };

  const Label = ({ children, required }) => (
    <label style={{ display: 'block', fontFamily: '"Inter", sans-serif', fontSize: '13px', fontWeight: 600, color: '#191c1e', marginBottom: '4px' }}>
      {children}{required && <span style={{ color: '#ba1a1a', marginLeft: '2px' }}>*</span>}
    </label>
  );
  const ErrMsg = ({ children }) => (
    <div style={{ color: '#ba1a1a', fontSize: '12px', fontFamily: '"Inter", sans-serif', marginTop: '3px' }}>{children}</div>
  );
  const SectionTitle = ({ children, icon }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
      {icon && <i className={`bi ${icon}`} style={{ fontSize: '18px', color: '#004ac6' }}></i>}
      <h3 style={{ fontFamily: '"Hanken Grotesk", sans-serif', fontSize: '16px', fontWeight: 600, color: '#191c1e', margin: 0 }}>{children}</h3>
    </div>
  );

  const allErrors = Object.entries(errors).filter(([, v]) => v);
  const totalErrors = allErrors.length;

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

      {flash && (
        <div style={{
          position: 'fixed', top: '20px', right: '24px', zIndex: 99999,
          background: flash.type === 'success' ? '#dcfce7' : '#ffdad6',
          border: `1px solid ${flash.type === 'success' ? '#86efac' : '#f4adaa'}`,
          borderRadius: '8px', padding: '12px 18px',
          fontFamily: '"Inter", sans-serif', fontSize: '13px', fontWeight: 600,
          color: flash.type === 'success' ? '#15803d' : '#93000a',
          display: 'flex', alignItems: 'center', gap: '10px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.14)',
          minWidth: '280px', maxWidth: '380px',
          animation: 'fadeInDown 0.2s ease',
        }}>
          <i className={`bi ${flash.type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-circle-fill'}`}
            style={{ fontSize: '16px', flexShrink: 0 }}></i>
          <span style={{ flex: 1 }}>{flash.text}</span>
          <button type="button" onClick={() => setFlash(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '18px', lineHeight: 1, padding: 0, marginLeft: '4px', opacity: 0.7 }}>
            ×
          </button>
        </div>
      )}

      <Modal show={show} fullscreen onHide={handleClose} animation={false} backdrop="static" dialogClassName="pw-modal">
        <Modal.Header style={{ background: '#ffffff', borderBottom: '1px solid #c3c6d7', padding: '10px 20px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button type="button" onClick={handleClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#434655', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 600, fontFamily: '"Inter", sans-serif', padding: '4px 8px', borderRadius: '4px', flexShrink: 0 }}
            onMouseEnter={e => e.currentTarget.style.background = '#f0f2f4'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}>
            <i className="bi bi-arrow-left" style={{ fontSize: '16px' }}></i> Back
          </button>
          <Modal.Title style={{ fontFamily: '"Hanken Grotesk", sans-serif', fontSize: '17px', fontWeight: 700, color: '#191c1e', letterSpacing: '-0.01em', flex: 1 }}>
            {formData.id ? <>Update Product{formData.part_number ? <span style={{ fontWeight: 400, color: '#5a6478', marginLeft: '8px', fontSize: '14px' }}>#{formData.part_number}</span> : ''} — {formData.name}</> : 'Create New Product'}
          </Modal.Title>
          <div className="d-flex align-items-center gap-2">
            {formData.id && (
              <button type="button"
                style={{ background: '#d0e1fb', color: '#54647a', border: 'none', borderRadius: '4px', padding: '6px 14px', fontSize: '13px', fontWeight: 600, fontFamily: '"Inter", sans-serif', cursor: 'pointer' }}
                onClick={() => { handleClose(); if (props.openDetailsView) props.openDetailsView(formData.id); }}>
                <i className="bi bi-eye me-1"></i>View Detail
              </button>
            )}
            <button type="button"
              style={{ background: '#004ac6', color: '#ffffff', border: 'none', borderRadius: '4px', padding: '6px 18px', fontSize: '13px', fontWeight: 600, fontFamily: '"Inter", sans-serif', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              onClick={handleCreate} disabled={isProcessing}>
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
          .pw-content { flex: 1; display: flex; flex-direction: column; background: #f7f9fb; min-width: 0; overflow: hidden; }
          .pw-content-scroll { flex: 1; overflow-y: auto; padding: 20px 28px; }
          .pw-tab-wrap { max-width: 900px; width: 100%; margin: 0 auto; }
          .pw-price-cards .col-md-4 { margin-bottom: 16px; }
          @media (max-width: 767px) {
            .pw-form { flex-direction: column; }
            .pw-sidebar { width: 100%; height: auto; flex-direction: row; overflow-x: auto; overflow-y: hidden; border-right: none; border-bottom: 1px solid #c3c6d7; padding: 6px 8px; gap: 4px; }
            .pw-sidebar-header { display: none; }
            .pw-sidebar button { flex-shrink: 0; white-space: nowrap; padding: 8px 12px !important; }
            .pw-content-scroll { padding: 14px 16px !important; }
            .pw-tab-wrap { max-width: 100%; }
          }
          @media (min-width: 768px) and (max-width: 1100px) {
            .pw-sidebar { width: 170px; }
            .pw-content-scroll { padding: 16px 20px; }
            .pw-tab-wrap { max-width: 100%; }
          }
          @media (min-height: 600px) and (max-height: 800px) {
            .pw-content-scroll { padding-top: 14px; padding-bottom: 14px; }
          }
          @media (max-width: 767px) {
            .pw-card { padding: 14px !important; margin-bottom: 12px !important; }
          }
          @media (min-width: 768px) and (max-width: 1100px) {
            .pw-card { padding: 16px !important; margin-bottom: 14px !important; }
          }
        `}</style>
        <Modal.Body className="pw-body">
          <form onSubmit={handleCreate} className="pw-form">

            {/* Main Content Area */}
            <div className="pw-content">
              <div className="pw-content-scroll">

              {/* ── Error Summary (animated — no layout jump) ── */}
              <div style={{ overflow: 'hidden', maxHeight: totalErrors > 0 ? '500px' : '0', marginBottom: totalErrors > 0 ? '16px' : '0', transition: 'max-height 0.25s ease, margin-bottom 0.2s ease' }}>
                <div style={{ background: '#ffdad6', border: '1px solid #f4adaa', borderRadius: '8px', padding: '12px 16px' }}>
                  <div style={{ fontFamily: '"Inter", sans-serif', fontWeight: 700, color: '#93000a', marginBottom: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="bi bi-exclamation-circle-fill" style={{ fontSize: '14px' }}></i>
                    {totalErrors} error{totalErrors > 1 ? 's' : ''} — please fix before saving:
                  </div>
                  {allErrors.map(([k, v]) => (
                    <div key={k} style={{ fontFamily: '"Inter", sans-serif', fontSize: '12px', color: '#93000a', paddingLeft: '10px' }}>• {v}</div>
                  ))}
                </div>
              </div>

              {/* ===== BASIC INFO ===== */}
              <div className="pw-tab-wrap">

                  <div className="pw-card" style={CARD}>
                    <SectionTitle icon="bi-person-badge">Product Identity</SectionTitle>
                    <div className="row g-3">
                      <div className="col-md-6">
                        <Label required>Name</Label>
                        <input id="product_name" name="product_name" type="text"
                          value={formData.name || ''}
                          onChange={(e) => {
                            errors['name'] = ''; setErrors({ ...errors });
                            formData.name = e.target.value; setFormData({ ...formData });
                            if (timerRef.current) clearTimeout(timerRef.current);
                            timerRef.current = setTimeout(() => { translateText(e.target.value); }, 100);
                          }}
                          style={INPUT} placeholder="Product name"
                        />
                        {errors.name && <ErrMsg>{errors.name}</ErrMsg>}
                      </div>
                      <div className="col-md-6">
                        <Label>Name in Arabic</Label>
                        <input id="product_name_arabic" name="product_name_arabic" type="text"
                          value={formData.name_in_arabic || ''}
                          onChange={(e) => { errors['name_in_arabic'] = ''; setErrors({ ...errors }); formData.name_in_arabic = e.target.value; setFormData({ ...formData }); }}
                          style={{ ...INPUT, direction: 'rtl' }} placeholder="الاسم بالعربية"
                        />
                        {errors.name_in_arabic && <ErrMsg>{errors.name_in_arabic}</ErrMsg>}
                      </div>
                    </div>
                  </div>

                  <div className="pw-card" style={CARD}>
                    <SectionTitle icon="bi-tags">Classification</SectionTitle>
                    <div className="row g-3">
                      <div className="col-md-4">
                        <Label>Brand</Label>
                        <div className="d-flex gap-1">
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <Typeahead id="brand_id" labelKey="name" positionFixed={true} isLoading={isBrandsLoading}
                              onChange={(selectedItems) => {
                                errors.brand_id = ''; setErrors(errors);
                                if (selectedItems.length === 0) { formData.brand_id = ''; formData.brand_code = ''; formData.brand_name = ''; makePartNumberPrefix(); setFormData({ ...formData }); setSelectedBrands([]); return; }
                                formData.brand_id = selectedItems[0].id; formData.brand_code = selectedItems[0].code; formData.brand_name = selectedItems[0].name;
                                makePartNumberPrefix(); setFormData({ ...formData }); setSelectedBrands(selectedItems);
                              }}
                              options={brandOptions} placeholder="Brand name" selected={selectedBrands} highlightOnlyResult={true} ref={brandSearchRef}
                              onKeyDown={(e) => { if (e.key === 'Escape') { setBrandOptions([]); brandSearchRef.current?.clear(); } }}
                              onInputChange={(searchTerm) => { suggestBrands(searchTerm); }}
                            />
                          </div>
                          <button type="button" onClick={openProductBrandCreateForm} style={ICON_BTN} title="New Brand">
                            <i className="bi bi-plus-lg"></i>
                          </button>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <Label>Country of Origin</Label>
                        <Typeahead id="country_code" labelKey="label" positionFixed={true}
                          onChange={(selectedItems) => {
                            errors.country_code = ''; setErrors(errors);
                            if (selectedItems.length === 0) { formData.country_code = ''; formData.country_name = ''; makePartNumberPrefix(); setFormData({ ...formData }); setSelectedCountries([]); return; }
                            formData.country_code = selectedItems[0].value; formData.country_name = selectedItems[0].label;
                            makePartNumberPrefix(); setFormData({ ...formData }); setSelectedCountries(selectedItems);
                          }}
                          options={countryOptions} placeholder="Country name" selected={selectedCountries} highlightOnlyResult={true} ref={countrySearchRef}
                          onKeyDown={(e) => { if (e.key === 'Escape') { countrySearchRef.current?.clear(); } }}
                          onInputChange={() => {}}
                        />
                      </div>
                      <div className="col-md-2">
                        <Label>Part No. Prefix</Label>
                        <input id="product_prefix_part_no" name="product_prefix_part_no" type="text"
                          value={formData.prefix_part_number || ''}
                          onChange={(e) => { errors['part_number'] = ''; setErrors({ ...errors }); formData.prefix_part_number = e.target.value; setFormData({ ...formData }); }}
                          style={INPUT} placeholder="Prefix"
                        />
                        {errors.prefix_part_number && <ErrMsg>{errors.prefix_part_number}</ErrMsg>}
                      </div>
                      <div className="col-md-2">
                        <Label>Part No.</Label>
                        <input id="product_part_no" name="product_part_no" type="text"
                          value={formData.part_number || ''}
                          onChange={(e) => { errors['part_number'] = ''; setErrors({ ...errors }); formData.part_number = e.target.value; setFormData({ ...formData }); }}
                          style={INPUT} placeholder="Part Number"
                        />
                        {errors.part_number && <ErrMsg>{errors.part_number}</ErrMsg>}
                      </div>
                      <div className="col-md-4">
                        <Label>Category</Label>
                        <div className="d-flex gap-1">
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <Typeahead ref={categorySearchRef} id="category_id" labelKey="name" positionFixed={true}
                              isInvalid={errors.category_id ? true : false}
                              onChange={(selectedItems) => {
                                errors.category_id = ''; setErrors(errors);
                                if (selectedItems.length === 0) { errors.category_id = 'Invalid Category selected'; setErrors(errors); setSelectedCategories([]); return; }
                                setFormData({ ...formData }); setSelectedCategories(selectedItems);
                              }}
                              options={categoryOptions} placeholder="Select Category" selected={selectedCategories} highlightOnlyResult={true}
                              onInputChange={(searchTerm) => { suggestCategories(searchTerm); }}
                              onKeyDown={(e) => { if (e.key === 'Escape') { setCategoryOptions([]); categorySearchRef.current?.clear(); } }}
                            />
                          </div>
                          <button type="button" onClick={openProductCategoryCreateForm} style={ICON_BTN} title="New Category">
                            <i className="bi bi-plus-lg"></i>
                          </button>
                        </div>
                        {errors.category_id && <ErrMsg>{errors.category_id}</ErrMsg>}
                      </div>
                      <div className="col-md-2">
                        <Label required>Unit</Label>
                        <select className="form-select form-select-sm" style={{ height: '30px', padding: '2px 8px' }} value={formData.unit}
                          onChange={(e) => { formData.unit = e.target.value; setFormData({ ...formData }); }}>
                          <option value="">Piece (PCE)</option>
                          <option value="drum">Drum (DRM)</option>
                          <option value="set">Set (SET)</option>
                          <option value="Kg">Kilogram (KGM)</option>
                          <option value="Meter(s)">Metre (MTR)</option>
                          <option value="CMT">Centimetre (CMT)</option>
                          <option value="MMT">Millimetre (MMT)</option>
                          <option value="Gm">Gram (GRM)</option>
                          <option value="L">Litre (LTR)</option>
                          <option value="Mg">Milligram (MG)</option>
                        </select>
                        {(() => {
                          const map = { '': {code:'PCE', label:'Piece'}, drum: {code:'DRM', label:'Drum'}, set: {code:'SET', label:'Set'}, Kg: {code:'KGM', label:'Kilogram'}, 'Meter(s)': {code:'MTR', label:'Metre'}, CMT: {code:'CMT', label:'Centimetre'}, MMT: {code:'MMT', label:'Millimetre'}, Gm: {code:'GRM', label:'Gram'}, L: {code:'LTR', label:'Litre'}, Mg: {code:'MG', label:'Milligram'} };
                          const { code, label } = map[formData.unit ?? ''] || { code: 'PCE', label: 'Piece' };
                          return (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '4px' }}>
                              <span style={{ fontSize: '10px', color: '#737686' }}>ZATCA code:</span>
                              <span style={{ fontSize: '11px', fontWeight: 700, fontFamily: 'monospace', color: '#004ac6', background: '#eef2ff', padding: '1px 5px', borderRadius: '3px' }}>({code})</span>
                              <span style={{ fontSize: '11px', color: '#737686' }}>{label}</span>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  <div className="pw-card" style={CARD}>
                    <SectionTitle icon="bi-currency-dollar">Unit Prices</SectionTitle>
                    <div className="row g-4 pw-price-cards">

                      {/* Purchase Price Card */}
                      <div className="col-md-4">
                        <div style={PRICE_CARD}>
                          <div style={PRICE_CARD_LABEL}>Purchase Unit Price</div>
                          <div style={{ marginBottom: '16px' }}>
                            <div style={PRICE_SUB_LABEL}>Excl. VAT</div>
                            <input id="product_purchase_unit_price_0" name="product_purchase_unit_price_0" type="number"
                              value={productStores[localStorage.getItem('store_id')]?.purchase_unit_price}
                              disabled={formData.set?.purchase_total}
                              ref={(el) => { if (!inputRefs.current[0]) inputRefs.current[0] = {}; inputRefs.current[0]['product_purchase_unit_price_0'] = el; }}
                              onFocus={() => { if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = setTimeout(() => { inputRefs.current[0]['product_purchase_unit_price_0']?.select(); }, 100); }}
                              onKeyDown={(e) => { if (timerRef.current) clearTimeout(timerRef.current); if (e.key === 'Enter') { timerRef.current = setTimeout(() => { inputRefs.current[0]['product_wholesale_unit_price_0']?.select(); }, 100); } }}
                              style={PRICE_INPUT} placeholder="0.00"
                              onChange={(e) => {
                                if (timerRef.current) clearTimeout(timerRef.current);
                                delete errors['purchase_unit_price_0']; setErrors({ ...errors });
                                if (!e.target.value) { productStores[localStorage.getItem('store_id')].purchase_unit_price = ''; setProductStores({ ...productStores }); return; }
                                if (parseFloat(e.target.value) < 0) { productStores[localStorage.getItem('store_id')].purchase_unit_price = ''; setProductStores({ ...productStores }); errors['purchase_unit_price_0'] = 'Purchase Unit Price should not be < 0'; setErrors({ ...errors }); return; }
                                productStores[localStorage.getItem('store_id')].purchase_unit_price = parseFloat(e.target.value); setProductStores({ ...productStores });
                                timerRef.current = setTimeout(() => { productStores[localStorage.getItem('store_id')].purchase_unit_price_with_vat = parseFloat(trimTo8Decimals(productStores[localStorage.getItem('store_id')].purchase_unit_price * (1 + (store.vat_percent / 100)))); setProductStores({ ...productStores }); }, 100);
                              }}
                            />
                            {errors['purchase_unit_price_0'] && <ErrMsg>{errors['purchase_unit_price_0']}</ErrMsg>}
                          </div>
                          <div style={{ borderTop: '1px solid #e0e3e5', paddingTop: '14px' }}>
                            <div style={PRICE_SUB_LABEL}>Incl. VAT</div>
                            <input id="product_purchase_unit_price_with_vat_0" name="product_purchase_unit_price_with_vat_0" type="number"
                              disabled={formData.set?.purchase_total_with_vat}
                              value={productStores[localStorage.getItem('store_id')]?.purchase_unit_price_with_vat || productStores[localStorage.getItem('store_id')]?.purchase_unit_price_with_vat === 0 ? productStores[localStorage.getItem('store_id')]?.purchase_unit_price_with_vat : ''}
                              ref={(el) => { if (!inputRefs.current[0]) inputRefs.current[0] = {}; inputRefs.current[0]['product_purchase_unit_price_with_vat_0'] = el; }}
                              onFocus={() => { if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = setTimeout(() => { inputRefs.current[0]['product_purchase_unit_price_with_vat_0']?.select(); }, 100); }}
                              onKeyDown={(e) => { if (timerRef.current) clearTimeout(timerRef.current); if (e.key === 'Enter') { timerRef.current = setTimeout(() => { inputRefs.current[0]['product_wholesale_unit_price_with_vat_0']?.select(); }, 100); } if (e.key === 'ArrowLeft') { timerRef.current = setTimeout(() => { inputRefs.current[0]['product_retail_unit_price_0'].focus(); }, 100); } }}
                              style={{ ...PRICE_INPUT, background: '#f2f4f6' }} placeholder="Calculated automatically"
                              onChange={(e) => {
                                if (timerRef.current) clearTimeout(timerRef.current);
                                delete errors['purchase_unit_price_with_vat_0']; setErrors({ ...errors });
                                if (!e.target.value) { productStores[localStorage.getItem('store_id')].purchase_unit_price_with_vat = ''; setProductStores({ ...productStores }); return; }
                                if (parseFloat(e.target.value) < 0) { productStores[localStorage.getItem('store_id')].purchase_unit_price_with_vat = ''; setProductStores({ ...productStores }); errors['purchase_unit_price_with_vat_0'] = 'Purchase Unit Price with VAT should not be < 0'; setErrors({ ...errors }); return; }
                                productStores[localStorage.getItem('store_id')].purchase_unit_price_with_vat = parseFloat(e.target.value); setProductStores({ ...productStores });
                                timerRef.current = setTimeout(() => { productStores[localStorage.getItem('store_id')].purchase_unit_price = parseFloat(trimTo8Decimals(productStores[localStorage.getItem('store_id')].purchase_unit_price_with_vat / (1 + (store.vat_percent / 100)))); setProductStores({ ...productStores }); }, 100);
                              }}
                            />
                            {errors['purchase_unit_price_with_vat_0'] && <ErrMsg>{errors['purchase_unit_price_with_vat_0']}</ErrMsg>}
                          </div>
                        </div>
                      </div>

                      {/* Wholesale Price Card */}
                      <div className="col-md-4">
                        <div style={PRICE_CARD}>
                          <div style={PRICE_CARD_LABEL}>Wholesale Unit Price</div>
                          <div style={{ marginBottom: '16px' }}>
                            <div style={PRICE_SUB_LABEL}>Excl. VAT</div>
                            <input id="product_wholesale_unit_price" name="product_wholesale_unit_price" type="number"
                              value={productStores[localStorage.getItem('store_id')]?.wholesale_unit_price || productStores[localStorage.getItem('store_id')]?.wholesale_unit_price === 0 ? productStores[localStorage.getItem('store_id')]?.wholesale_unit_price : ''}
                              ref={(el) => { if (!inputRefs.current[0]) inputRefs.current[0] = {}; inputRefs.current[0]['product_wholesale_unit_price_0'] = el; }}
                              onFocus={() => { if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = setTimeout(() => { inputRefs.current[0]['product_wholesale_unit_price_0']?.select(); }, 100); }}
                              onKeyDown={(e) => { if (timerRef.current) clearTimeout(timerRef.current); if (e.key === 'Enter') { timerRef.current = setTimeout(() => { inputRefs.current[0]['product_retail_unit_price_0']?.select(); }, 100); } else if (e.key === 'ArrowLeft') { timerRef.current = setTimeout(() => { inputRefs.current[0]['product_purchase_unit_price_0'].focus(); }, 100); } }}
                              style={PRICE_INPUT} placeholder="0.00"
                              onChange={(e) => {
                                if (timerRef.current) clearTimeout(timerRef.current);
                                delete errors['wholesale_unit_price']; setErrors({ ...errors });
                                if (!e.target.value) { productStores[localStorage.getItem('store_id')].wholesale_unit_price = ''; setProductStores({ ...productStores }); return; }
                                if (parseFloat(e.target.value) < 0) { productStores[localStorage.getItem('store_id')].wholesale_unit_price = ''; setProductStores({ ...productStores }); errors['wholesale_unit_price'] = 'Wholesale unit price should not be < 0'; setErrors({ ...errors }); return; }
                                productStores[localStorage.getItem('store_id')].wholesale_unit_price = parseFloat(e.target.value); setProductStores({ ...productStores });
                                timerRef.current = setTimeout(() => { productStores[localStorage.getItem('store_id')].wholesale_unit_price_with_vat = parseFloat(trimTo8Decimals(productStores[localStorage.getItem('store_id')].wholesale_unit_price * (1 + (store.vat_percent / 100)))); setProductStores({ ...productStores }); }, 100);
                              }}
                            />
                            {errors['wholesale_unit_price'] && <ErrMsg>{errors['wholesale_unit_price']}</ErrMsg>}
                          </div>
                          <div style={{ borderTop: '1px solid #e0e3e5', paddingTop: '14px' }}>
                            <div style={PRICE_SUB_LABEL}>Incl. VAT</div>
                            <input id="product_wholesale_unit_price_with_vat" name="product_wholesale_unit_price_with_vat" type="number"
                              value={productStores[localStorage.getItem('store_id')]?.wholesale_unit_price_with_vat || productStores[localStorage.getItem('store_id')]?.wholesale_unit_price_with_vat === 0 ? productStores[localStorage.getItem('store_id')]?.wholesale_unit_price_with_vat : ''}
                              ref={(el) => { if (!inputRefs.current[0]) inputRefs.current[0] = {}; inputRefs.current[0]['product_wholesale_unit_price_with_vat_0'] = el; }}
                              onFocus={() => { if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = setTimeout(() => { inputRefs.current[0]['product_wholesale_unit_price_with_vat_0']?.select(); }, 100); }}
                              onKeyDown={(e) => { if (timerRef.current) clearTimeout(timerRef.current); if (e.key === 'Enter') { timerRef.current = setTimeout(() => { inputRefs.current[0]['product_retail_unit_price_with_vat_0']?.select(); }, 100); } else if (e.key === 'ArrowLeft') { timerRef.current = setTimeout(() => { inputRefs.current[0]['product_purchase_unit_price_with_vat_0'].focus(); }, 100); } }}
                              style={{ ...PRICE_INPUT, background: '#f2f4f6' }} placeholder="Calculated automatically"
                              onChange={(e) => {
                                if (timerRef.current) clearTimeout(timerRef.current);
                                delete errors['wholesale_unit_price_with_vat']; setErrors({ ...errors });
                                if (!e.target.value) { productStores[localStorage.getItem('store_id')].wholesale_unit_price_with_vat = ''; setProductStores({ ...productStores }); return; }
                                if (parseFloat(e.target.value) < 0) { productStores[localStorage.getItem('store_id')].wholesale_unit_price_with_vat = ''; setProductStores({ ...productStores }); errors['wholesale_unit_price_with_vat'] = 'Wholesale unit price with VAT should not be < 0'; setErrors({ ...errors }); return; }
                                productStores[localStorage.getItem('store_id')].wholesale_unit_price_with_vat = parseFloat(e.target.value); setProductStores({ ...productStores });
                                timerRef.current = setTimeout(() => { productStores[localStorage.getItem('store_id')].wholesale_unit_price = parseFloat(trimTo8Decimals(productStores[localStorage.getItem('store_id')].wholesale_unit_price_with_vat / (1 + (store.vat_percent / 100)))); setProductStores({ ...productStores }); }, 100);
                              }}
                            />
                            {errors['wholesale_unit_price_with_vat'] && <ErrMsg>{errors['wholesale_unit_price_with_vat']}</ErrMsg>}
                          </div>
                        </div>
                      </div>

                      {/* Retail Price Card */}
                      <div className="col-md-4">
                        <div style={PRICE_CARD}>
                          <div style={PRICE_CARD_LABEL}>Retail Unit Price</div>
                          <div style={{ marginBottom: '16px' }}>
                            <div style={PRICE_SUB_LABEL}>Excl. VAT</div>
                            <input id="product_retail_unit_price" name="product_retail_unit_price" type="number"
                              disabled={formData.set?.total}
                              value={productStores[localStorage.getItem('store_id')]?.retail_unit_price || productStores[localStorage.getItem('store_id')]?.retail_unit_price === 0 ? productStores[localStorage.getItem('store_id')]?.retail_unit_price : ''}
                              ref={(el) => { if (!inputRefs.current[0]) inputRefs.current[0] = {}; inputRefs.current[0]['product_retail_unit_price_0'] = el; }}
                              onFocus={() => { if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = setTimeout(() => { inputRefs.current[0]['product_retail_unit_price_0']?.select(); }, 100); }}
                              onKeyDown={(e) => { if (timerRef.current) clearTimeout(timerRef.current); if (e.key === 'ArrowLeft') { timerRef.current = setTimeout(() => { inputRefs.current[0]['product_wholesale_unit_price_0'].focus(); }, 100); } }}
                              style={PRICE_INPUT} placeholder="0.00"
                              onChange={(e) => {
                                if (timerRef.current) clearTimeout(timerRef.current);
                                delete errors['retail_unit_price']; delete errors['retail_unit_price_0']; setErrors({ ...errors });
                                if (!e.target.value) { productStores[localStorage.getItem('store_id')].retail_unit_price = ''; setProductStores({ ...productStores }); return; }
                                if (parseFloat(e.target.value) < 0) { errors['retail_unit_price_0'] = 'Retail Unit Price should not be < 0'; productStores[localStorage.getItem('store_id')].retail_unit_price = ''; setProductStores({ ...productStores }); setErrors({ ...errors }); return; }
                                productStores[localStorage.getItem('store_id')].retail_unit_price = parseFloat(e.target.value); setProductStores({ ...productStores });
                                timerRef.current = setTimeout(() => { productStores[localStorage.getItem('store_id')].retail_unit_price_with_vat = parseFloat(trimTo8Decimals(productStores[localStorage.getItem('store_id')].retail_unit_price * (1 + (store.vat_percent / 100)))); setProductStores({ ...productStores }); }, 100);
                              }}
                            />
                            {errors['retail_unit_price'] && <ErrMsg>{errors['retail_unit_price']}</ErrMsg>}
                          </div>
                          <div style={{ borderTop: '1px solid #e0e3e5', paddingTop: '14px' }}>
                            <div style={PRICE_SUB_LABEL}>Incl. VAT</div>
                            <input id="product_retail_unit_price_with_vat" name="product_retail_unit_price_with_vat" type="number"
                              disabled={formData.set?.total}
                              value={productStores[localStorage.getItem('store_id')]?.retail_unit_price_with_vat || productStores[localStorage.getItem('store_id')]?.retail_unit_price_with_vat === 0 ? productStores[localStorage.getItem('store_id')]?.retail_unit_price_with_vat : ''}
                              ref={(el) => { if (!inputRefs.current[0]) inputRefs.current[0] = {}; inputRefs.current[0]['product_retail_unit_price_with_vat_0'] = el; }}
                              onFocus={() => { if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = setTimeout(() => { inputRefs.current[0]['product_retail_unit_price_with_vat_0']?.select(); }, 100); }}
                              onKeyDown={(e) => { if (timerRef.current) clearTimeout(timerRef.current); if (e.key === 'ArrowLeft') { timerRef.current = setTimeout(() => { inputRefs.current[0]['product_wholesale_unit_price_with_vat_0'].focus(); }, 100); } }}
                              style={{ ...PRICE_INPUT, background: '#f2f4f6' }} placeholder="Calculated automatically"
                              onChange={(e) => {
                                if (timerRef.current) clearTimeout(timerRef.current);
                                delete errors['retail_unit_price_with_vat']; delete errors['retail_unit_price_with_vat_0']; setErrors({ ...errors });
                                if (!e.target.value) { productStores[localStorage.getItem('store_id')].retail_unit_price_with_vat = ''; setProductStores({ ...productStores }); return; }
                                if (parseFloat(e.target.value) < 0) { errors['retail_unit_price_with_vat_0'] = 'Retail Unit Price with VAT should not be < 0'; productStores[localStorage.getItem('store_id')].retail_unit_price_with_vat = ''; setProductStores({ ...productStores }); setErrors({ ...errors }); return; }
                                productStores[localStorage.getItem('store_id')].retail_unit_price_with_vat = parseFloat(e.target.value); setProductStores({ ...productStores });
                                timerRef.current = setTimeout(() => { productStores[localStorage.getItem('store_id')].retail_unit_price = parseFloat(trimTo8Decimals(productStores[localStorage.getItem('store_id')].retail_unit_price_with_vat / (1 + (store.vat_percent / 100)))); setProductStores({ ...productStores }); }, 100);
                              }}
                            />
                            {errors['retail_unit_price_with_vat'] && <ErrMsg>{errors['retail_unit_price_with_vat']}</ErrMsg>}
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>

                  {!store?.settings?.enable_warehouse_module && (
                    <div className="pw-card" style={CARD}>
                      <SectionTitle icon="bi-geo-alt">Rack / Location</SectionTitle>
                      <div className="row">
                        <div className="col-md-4">
                          <Label>Rack / Location</Label>
                          <input id="product_rack" name="product_rack" type="text"
                            value={formData.rack || ''}
                            onChange={(e) => { formData.rack = e.target.value; setFormData({ ...formData }); }}
                            style={INPUT} placeholder="Rack / Location"
                          />
                          {errors.rack && <ErrMsg>{errors.rack}</ErrMsg>}
                        </div>
                      </div>
                    </div>
                  )}

                  {store?.settings?.enable_warehouse_module && (
                    <div className="pw-card" style={CARD}>
                      <SectionTitle icon="bi-geo-alt">Rack / Location</SectionTitle>
                      <div style={{ overflowX: 'auto', maxWidth: '560px' }}>
                        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                          <thead>
                            <tr style={{ background: '#eceef0' }}>
                              <th style={TH}>Storage Facility</th>
                              <th style={TH}>Rack / Location</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr style={{ borderBottom: '1px solid #c3c6d7' }}>
                              <td style={{ ...TD, fontWeight: 600 }}>Main Store</td>
                              <td style={TD}>
                                <input type="text" style={INPUT}
                                  value={productStores[localStorage.getItem('store_id')]?.warehouse_racks?.main_store || ''}
                                  onChange={(e) => { const storeId = localStorage.getItem('store_id'); if (!productStores[storeId].warehouse_racks) productStores[storeId].warehouse_racks = {}; productStores[storeId].warehouse_racks.main_store = e.target.value; setProductStores({ ...productStores }); }}
                                  placeholder="Rack/Location"
                                />
                              </td>
                            </tr>
                            {warehouseList.map((wh) => (
                              <tr key={wh.id} style={{ borderBottom: '1px solid #c3c6d7' }}>
                                <td style={{ ...TD, fontWeight: 600 }}>{wh.name} ({wh.code})</td>
                                <td style={TD}>
                                  <input type="text" style={INPUT}
                                    value={productStores[localStorage.getItem('store_id')]?.warehouse_racks?.[wh.code] || ''}
                                    onChange={(e) => { const storeId = localStorage.getItem('store_id'); if (!productStores[storeId].warehouse_racks) productStores[storeId].warehouse_racks = {}; productStores[storeId].warehouse_racks[wh.code] = e.target.value; setProductStores({ ...productStores }); }}
                                    placeholder="Rack/Location"
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div className="pw-card" style={{ ...CARD, padding: '16px 24px' }}>
                    <div className="d-flex align-items-start gap-2">
                      <input type="checkbox" id="allow_duplicates"
                        style={{ width: '16px', height: '16px', accentColor: '#004ac6', cursor: 'pointer', flexShrink: 0, marginTop: '2px' }}
                        checked={formData.allow_duplicates || false}
                        onChange={() => { formData.allow_duplicates = !formData.allow_duplicates; setFormData({ ...formData }); }}
                      />
                      <div>
                        <label htmlFor="allow_duplicates" style={{ fontFamily: '"Inter", sans-serif', fontSize: '13px', fontWeight: 500, color: '#191c1e', cursor: 'pointer', marginBottom: '2px', display: 'block' }}>
                          Allow duplicates in Sales, Purchases etc.
                        </label>
                        <p style={{ fontFamily: '"Inter", sans-serif', fontSize: '12px', color: '#737686', marginBottom: 0 }}>
                          System will not flag redundant entries for this product.
                        </p>
                      </div>
                    </div>
                    {errors.allow_duplicates && <ErrMsg>{errors.allow_duplicates}</ErrMsg>}
                  </div>

                  <div className="pw-card" style={CARD}>
                    <SectionTitle icon="bi-journal-text">Note</SectionTitle>
                    <textarea
                      id="product_note"
                      name="product_note"
                      value={formData.note || ''}
                      rows={4}
                      onChange={(e) => {
                        formData.note = e.target.value;
                        setFormData({ ...formData });
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter') e.stopPropagation(); }}
                      style={{ ...INPUT, resize: 'vertical', minHeight: '88px' }}
                      placeholder="Optional note about this product…"
                    />
                  </div>

                </div>

              {/* ===== INVENTORY / STOCK ===== */}
              <div className="pw-tab-wrap">

                  <div className="pw-card" style={CARD}>
                    <SectionTitle icon="bi-boxes">Current Stock Levels</SectionTitle>
                    <div style={{ overflowX: 'auto', maxWidth: '500px' }}>
                      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                        <thead>
                          <tr style={{ background: '#eceef0' }}>
                            <th style={TH}>Location</th>
                            <th style={TH}>Stock</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const storeId = localStorage.getItem('store_id');
                            const productStore = productStores?.[storeId] || {};
                            const warehousesStocks = productStore.warehouse_stocks || {};
                            const mainStoreStock = productStore.stock ?? 0;
                            let rows = [];
                            const mainStock = warehousesStocks['main_store'] !== undefined ? warehousesStocks['main_store'] : mainStoreStock;
                            rows.push(<tr key="main_store" style={{ borderBottom: '1px solid #e0e3e5' }}><td style={TD}>Main Store</td><td style={TD}>{mainStock}</td></tr>);
                            warehouseList.forEach((wh) => {
                              if (wh.code !== 'main_store') {
                                const whStock = warehousesStocks[wh.code] !== undefined ? warehousesStocks[wh.code] : 0;
                                rows.push(<tr key={wh.code} style={{ borderBottom: '1px solid #e0e3e5' }}><td style={TD}>{wh.name} ({wh.code})</td><td style={TD}>{whStock}</td></tr>);
                              }
                            });
                            rows.push(<tr key="total" style={{ fontWeight: 700, background: '#eceef0' }}><td style={TD}>Total Stock</td><td style={TD}>{productStores[localStorage.getItem('store_id')]?.stock}</td></tr>);
                            return rows;
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="pw-card" style={CARD}>
                    <SectionTitle icon="bi-arrow-left-right">Stock Adjustments</SectionTitle>
                    <div style={{ marginBottom: '16px' }}>
                      <Label>Quick Adjust (Damaged / Missing Stock)</Label>
                      <div className="d-flex align-items-center gap-2 mt-1">
                        <input id="product_damaged_stock_0" name="product_damaged_stock_0" type="number"
                          value={damagedStock} style={{ ...INPUT, maxWidth: '180px' }} placeholder="Enter quantity"
                          onChange={(e) => { errors['damaged_stock_0'] = ''; setErrors({ ...errors }); setDamagedStock(parseFloat(e.target.value)); setOperationType(null); }}
                        />
                        {damagedStock && !operationType && (
                          <>
                            <button type="button" className="btn btn-sm btn-success" onClick={(e) => { e.preventDefault(); if (!productStores[localStorage.getItem('store_id')].stocks_added) productStores[localStorage.getItem('store_id')].stocks_added = 0; if (!productStores[localStorage.getItem('store_id')].stock) productStores[localStorage.getItem('store_id')].stock = 0; addStockAdjustment(parseFloat(damagedStock), 'adding'); setProductStores({ ...productStores }); damagedStock = ''; setDamagedStock(damagedStock); }}>Add</button>
                            <button type="button" className="btn btn-sm btn-danger" onClick={(e) => { e.preventDefault(); if (!productStores[localStorage.getItem('store_id')].stocks_removed) productStores[localStorage.getItem('store_id')].stocks_removed = 0; if (!productStores[localStorage.getItem('store_id')].stock) productStores[localStorage.getItem('store_id')].stock = 0; addStockAdjustment(parseFloat(damagedStock), 'removing'); setProductStores({ ...productStores }); damagedStock = ''; setDamagedStock(damagedStock); }}>Remove</button>
                          </>
                        )}
                      </div>
                    </div>

                    <button type="button" style={{ ...SEC_BTN, marginBottom: '12px' }} onClick={() => addStockAdjustment()}>
                      <i className="bi bi-plus-lg"></i>Create Stock Adjustment
                    </button>

                    {productStores[localStorage.getItem('store_id')]?.stock_adjustments?.filter(a => !a.deleted).length > 0 && (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: '700px' }}>
                          <thead>
                            <tr style={{ background: '#eceef0' }}>
                              <th style={TH}>Date</th><th style={TH}>Qty</th><th style={TH}>Add/Remove</th>
                              <th style={TH}>Warehouse/Store</th><th style={TH}>Reason</th><th style={TH}></th>
                            </tr>
                          </thead>
                          <tbody>
                            {productStores[localStorage.getItem('store_id')].stock_adjustments.filter(a => !a.deleted).map((adjustment, key) => (
                              <tr key={key} style={{ borderBottom: '1px solid #e0e3e5' }}>
                                <td style={{ ...TD, width: '200px' }}>
                                  <DatePicker id="payment_date_str"
                                    selected={productStores[localStorage.getItem('store_id')].stock_adjustments[key].date_str ? new Date(productStores[localStorage.getItem('store_id')].stock_adjustments[key].date_str) : null}
                                    value={productStores[localStorage.getItem('store_id')].stock_adjustments[key].date_str ? format(new Date(productStores[localStorage.getItem('store_id')].stock_adjustments[key].date_str), 'MMMM d, yyyy h:mm aa') : null}
                                    className="form-control form-control-sm" dateFormat="MMMM d, yyyy h:mm aa" showTimeSelect timeIntervals="1"
                                    onChange={(value) => { productStores[localStorage.getItem('store_id')].stock_adjustments[key].date_str = value; setProductStores({ ...productStores }); }}
                                  />
                                  {errors['adjustment_date_' + key] && <ErrMsg>{errors['adjustment_date_' + key]}</ErrMsg>}
                                </td>
                                <td style={{ ...TD, width: '90px' }}>
                                  <input type="number" id={`adjustment_quantity_${key}`} name={`adjustment_quantity_${key}`}
                                    value={productStores[localStorage.getItem('store_id')].stock_adjustments[key].quantity}
                                    className="form-control form-control-sm"
                                    ref={(el) => { if (!inputRefs.current[key]) inputRefs.current[key] = {}; inputRefs.current[key][`adjustment_quantity_${key}`] = el; }}
                                    onFocus={() => { if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = setTimeout(() => { inputRefs.current[key][`adjustment_quantity_${key}`]?.select(); }, 20); }}
                                    onChange={(e) => {
                                      delete errors[`adjustment_quantity_${key}`]; setErrors({ ...errors });
                                      if (!e.target.value) { productStores[localStorage.getItem('store_id')].stock_adjustments[key].quantity = e.target.value; setProductStores({ ...productStores }); return; }
                                      productStores[localStorage.getItem('store_id')].stock_adjustments[key].quantity = parseFloat(e.target.value); setProductStores({ ...productStores });
                                      findStocksAdded(); findStocksRemoved();
                                    }}
                                  />
                                  {errors[`adjustment_quantity_${key}`] && <ErrMsg>{errors[`adjustment_quantity_${key}`]}</ErrMsg>}
                                </td>
                                <td style={{ ...TD, width: '110px' }}>
                                  <select value={productStores[localStorage.getItem('store_id')].stock_adjustments[key].type} className="form-control form-control-sm"
                                    onChange={(e) => {
                                      delete errors[`adjustment_type_${key}`]; setErrors({ ...errors });
                                      if (!e.target.value) { errors[`adjustment_type_${key}`] = 'Type is required'; setErrors({ ...errors }); productStores[localStorage.getItem('store_id')].stock_adjustments[key].type = ''; setProductStores({ ...productStores }); return; }
                                      productStores[localStorage.getItem('store_id')].stock_adjustments[key].type = e.target.value; setProductStores({ ...productStores }); findStocksAdded(); findStocksRemoved();
                                    }}>
                                    <option value="">Select</option>
                                    <option value="adding">Adding</option>
                                    <option value="removing">Removing</option>
                                  </select>
                                  {errors[`adjustment_type_${key}`] && <ErrMsg>{errors[`adjustment_type_${key}`]}</ErrMsg>}
                                </td>
                                <td style={{ ...TD, width: '140px' }}>
                                  <select id={`adjustment_warehouse_${key}`} name={`adjustment_warehouse_${key}`} className="form-control form-control-sm"
                                    value={productStores[localStorage.getItem('store_id')].stock_adjustments[key].warehouse_id || 'main_store'}
                                    onChange={(e) => {
                                      const selectedValue = e.target.value;
                                      if (selectedValue === 'main_store') { productStores[localStorage.getItem('store_id')].stock_adjustments[key].warehouse_id = null; productStores[localStorage.getItem('store_id')].stock_adjustments[key].warehouse_code = ''; }
                                      else { const wh = warehouseList.find(w => w.id === selectedValue); if (wh) { productStores[localStorage.getItem('store_id')].stock_adjustments[key].warehouse_id = wh.id; productStores[localStorage.getItem('store_id')].stock_adjustments[key].warehouse_code = wh.code; } }
                                      setProductStores({ ...productStores });
                                    }}>
                                    <option value="main_store">Main Store</option>
                                    {warehouseList.map((w) => <option key={w.id} value={w.id}>{w.name} ({w.code})</option>)}
                                  </select>
                                </td>
                                <td style={{ ...TD, width: '160px' }}>
                                  <textarea id={`adjustment_reason_${key}`} name={`adjustment_reason_${key}`}
                                    value={productStores[localStorage.getItem('store_id')].stock_adjustments[key].reason || ''}
                                    className="form-control form-control-sm" placeholder="Reason" rows={2} style={{ resize: 'vertical' }}
                                    onKeyDown={(e) => { if (e.key === 'Enter') e.stopPropagation(); }}
                                    onChange={(e) => { productStores[localStorage.getItem('store_id')].stock_adjustments[key].reason = e.target.value; setProductStores({ ...productStores }); }}
                                  />
                                </td>
                                <td style={{ ...TD, width: '40px', textAlign: 'center' }}>
                                  <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeStockAdjustment(key)}>
                                    <i className="bi bi-trash"></i>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <div style={{ marginTop: '16px', padding: '12px 16px', background: '#f2f4f6', borderRadius: '6px', border: '1px solid #c3c6d7', display: 'flex', gap: '24px' }}>
                      <span style={{ fontFamily: '"Inter", sans-serif', fontSize: '13px', color: '#16a34a', fontWeight: 600 }}>+ Added: {productStores[localStorage.getItem('store_id')]?.stocks_added || 0}</span>
                      <span style={{ fontFamily: '"Inter", sans-serif', fontSize: '13px', color: '#dc2626', fontWeight: 600 }}>− Removed: {productStores[localStorage.getItem('store_id')]?.stocks_removed || 0}</span>
                    </div>
                  </div>

                  <div className="pw-card" style={CARD}>
                    <SectionTitle icon="bi-collection">SET Configuration</SectionTitle>
                    <div className="row g-3">
                      <div className="col-md-3">
                        <Label>Set Name</Label>
                        <input id="set_name" name="set_name" type="text"
                          value={formData.set?.name || ''}
                          style={INPUT} placeholder="Set Name"
                          onChange={(e) => { errors['set_name'] = ''; setErrors({ ...errors }); formData.set.name = e.target.value; formData.name = e.target.value; setFormData({ ...formData }); }}
                        />
                        {errors.set_name && <ErrMsg>{errors.set_name}</ErrMsg>}
                      </div>
                      <div className="col-md-9">
                        <Label>Add Products to SET</Label>
                        <Typeahead id="set_product_id" labelKey="search_label" emptyLabel="" ref={productSetSearchRef}
                          onChange={(selectedItems) => {
                            if (timerRef.current) clearTimeout(timerRef.current);
                            if (selectedItems.length === 0) return;
                            AddProductToSet(selectedItems[0]);
                            timerRef.current = setTimeout(() => { setOpenProductSetSearchResult(false); setProductSetOptions([]); productSetSearchRef.current?.clear(); inputRefs.current[(formData.set.products.length - 1)]?.[`set_product_quantity_${formData.set.products.length - 1}`]?.select(); }, 300);
                          }}
                          options={productSetOptions} placeholder="Search and select products..." highlightOnlyResult={true}
                          open={openProductSetSearchResult}
                          onKeyDown={(e) => {
                            if (timerRef.current) clearTimeout(timerRef.current);
                            if (e.key === 'Escape') { timerRef.current = setTimeout(() => { setOpenProductSetSearchResult(false); setProductSetOptions([]); productSetSearchRef.current?.clear(); }, 100); }
                            timerRef.current = setTimeout(() => { productSetSearchRef.current?.focus(); }, 100);
                          }}
                          onInputChange={(searchTerm) => { suggestProducts(searchTerm, 'set'); }}
                          renderMenu={(results, menuProps, state) => {
                            const searchWords = state.text.toLowerCase().split(' ').filter(Boolean);
                            return (
                              <Menu {...menuProps}>
                                <MenuItem disabled style={{ position: 'sticky', top: 0, padding: 0, margin: 0 }}>
                                  <div style={{ background: '#f8f9fa', zIndex: 2, display: 'flex', fontWeight: 'bold', padding: '4px 8px', borderBottom: '1px solid #ddd' }}>
                                    <div style={{ width: '3%' }}></div><div style={{ width: '14%' }}>Part Number</div><div style={{ width: '29%' }}>Name</div>
                                    <div style={{ width: '10%' }}>S.Unit Price</div><div style={{ width: '13%' }}>Stock</div><div style={{ width: '5%' }}>Photos</div>
                                    <div style={{ width: '8%' }}>Brand</div><div style={{ width: '10%' }}>P.Unit Price</div><div style={{ width: '8%' }}>Country</div>
                                  </div>
                                </MenuItem>
                                {results.map((option, index) => {
                                  const onlyOneResult = results.length === 1;
                                  const isActive = state.activeIndex === index || onlyOneResult;
                                  let checked = IsProductExistsInSet(option.id);
                                  return (
                                    <MenuItem option={option} position={index} key={index} style={{ padding: '0px' }}>
                                      <div style={{ display: 'flex', padding: '4px 8px' }}>
                                        <div className="form-check" style={{ ...columnStyle, width: '3%' }} onClick={e => { e.stopPropagation(); checked = !checked; if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = setTimeout(() => { if (checked) AddProductToSet(option); else RemoveProductFromSetByObj(option); }, 100); }}>
                                          <input className="form-check-input" type="checkbox" value={checked} checked={checked} onClick={e => e.stopPropagation()} onChange={e => { e.preventDefault(); e.stopPropagation(); checked = !checked; if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = setTimeout(() => { if (checked) AddProductToSet(option); else RemoveProductFromSetByObj(option); }, 100); }} />
                                        </div>
                                        <div style={{ ...columnStyle, width: '14%' }}>{highlightWords(option.prefix_part_number ? `${option.prefix_part_number} - ${option.part_number}` : option.part_number, searchWords, isActive)}</div>
                                        <div style={{ ...columnStyle, width: '29%' }}>{highlightWords(option.name_in_arabic ? `${option.name} - ${option.name_in_arabic}` : option.name, searchWords, isActive)}</div>
                                        <div style={{ ...columnStyle, width: '10%' }}>{option.product_stores?.[localStorage.getItem('store_id')]?.retail_unit_price && <><Amount amount={trimTo2Decimals(option.product_stores?.[localStorage.getItem('store_id')]?.retail_unit_price)} />+</>}{option.product_stores?.[localStorage.getItem('store_id')]?.retail_unit_price_with_vat && <>|<Amount amount={trimTo2Decimals(option.product_stores?.[localStorage.getItem('store_id')]?.retail_unit_price_with_vat)} /></>}</div>
                                        <div style={{ ...columnStyle, width: '13%' }}>{(() => { const storeId = localStorage.getItem('store_id'); const ps = option.product_stores?.[storeId]; const ws = ps?.warehouse_stocks || {}; const mainStock = ws['main_store'] ?? 0; let warehouseDetail = ''; if (store.settings?.enable_warehouse_module) { const whEntries = Object.entries(ws).filter(([k]) => k !== 'main_store').map(([k, v]) => `${k.toUpperCase()}: ${v}`); if (whEntries.length > 0) warehouseDetail = ` (${whEntries.join(', ')})`; } return <span>{mainStock}{warehouseDetail}</span>; })()}</div>
                                        <div style={{ ...columnStyle, width: '5%' }}><button type="button" className={isActive ? 'btn btn-outline-light btn-sm' : 'btn btn-outline-primary btn-sm'} onClick={(e) => { e.preventDefault(); e.stopPropagation(); openProductImages(option.id); }}><i className="bi bi-images" /></button></div>
                                        <div style={{ ...columnStyle, width: '8%' }}>{highlightWords(option.brand_name, searchWords, isActive)}</div>
                                        <div style={{ ...columnStyle, width: '10%' }}>{option.product_stores?.[localStorage.getItem('store_id')]?.purchase_unit_price && <><Amount amount={trimTo2Decimals(option.product_stores?.[localStorage.getItem('store_id')]?.purchase_unit_price)} />+</>}{option.product_stores?.[localStorage.getItem('store_id')]?.purchase_unit_price_with_vat && <>|<Amount amount={trimTo2Decimals(option.product_stores?.[localStorage.getItem('store_id')]?.purchase_unit_price_with_vat)} /></>}</div>
                                        <div style={{ ...columnStyle, width: '8%' }}>{highlightWords(option.country_name, searchWords, isActive)}</div>
                                      </div>
                                    </MenuItem>
                                  );
                                })}
                              </Menu>
                            );
                          }}
                        />
                      </div>
                    </div>

                    {formData.set?.products?.length > 0 && (
                      <div style={{ marginTop: '20px', overflowX: 'auto' }}>
                        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                          <thead>
                            <tr style={{ background: '#eceef0' }}>
                              <th style={TH}>Part No.</th><th style={{ ...TH, minWidth: '200px' }}>Name</th><th style={TH}>Info</th>
                              <th style={TH}>Qty</th><th style={TH}>Unit</th>
                              <th style={TH}>Purchase Price</th><th style={TH}>Purchase (VAT)</th><th style={TH}>Purchase %</th>
                              <th style={TH}>Retail Price</th><th style={TH}>Retail (VAT)</th><th style={TH}>Retail %</th>
                              <th style={TH}></th>
                            </tr>
                          </thead>
                          <tbody>
                            {formData.set.products.map((product, key) => (
                              <tr key={key} style={{ borderBottom: '1px solid #e0e3e5' }}>
                                <td style={TD}><span style={{ color: '#004ac6', cursor: 'pointer' }} onClick={() => openUpdateForm(product.product_id)}>{product.part_number}</span></td>
                                <td style={{ ...TD, minWidth: '200px' }}><span style={{ color: '#004ac6', cursor: 'pointer' }} onClick={() => openUpdateForm(product.product_id)}>{product.name}</span></td>
                                <td style={{ ...TD, verticalAlign: 'middle', padding: '0.25rem' }}>
                                  <div style={{ zIndex: '9999 !important', position: 'absolute !important' }}>
                                    <Dropdown drop="top">
                                      <Dropdown.Toggle variant="secondary" id="dropdown-secondary">
                                        <i className="bi bi-info"></i>
                                      </Dropdown.Toggle>
                                      <Dropdown.Menu style={{ zIndex: 9999, position: 'absolute' }} popperConfig={{ modifiers: [{ name: 'preventOverflow', options: { boundary: 'viewport' } }] }}>
                                        <Dropdown.Item onClick={() => openLinkedProducts(product)}><i className="bi bi-link"></i>&nbsp;Linked Products ({getShortcut('linkedProducts')})</Dropdown.Item>
                                        <Dropdown.Item onClick={() => openProductHistory(product)}><i className="bi bi-clock-history"></i>&nbsp;History ({getShortcut('productHistory')})</Dropdown.Item>
                                        <Dropdown.Item onClick={() => openSalesHistory(product)}><i className="bi bi-clock-history"></i>&nbsp;Sales History ({getShortcut('salesHistory')})</Dropdown.Item>
                                        <Dropdown.Item onClick={() => openSalesReturnHistory(product)}><i className="bi bi-clock-history"></i>&nbsp;Sales Return History ({getShortcut('salesReturnHistory')})</Dropdown.Item>
                                        <Dropdown.Item onClick={() => openPurchaseHistory(product)}><i className="bi bi-clock-history"></i>&nbsp;Purchase History ({getShortcut('purchaseHistory')})</Dropdown.Item>
                                        <Dropdown.Item onClick={() => openPurchaseReturnHistory(product)}><i className="bi bi-clock-history"></i>&nbsp;Purchase Return History ({getShortcut('purchaseReturnHistory')})</Dropdown.Item>
                                        <Dropdown.Item onClick={() => openDeliveryNoteHistory(product)}><i className="bi bi-clock-history"></i>&nbsp;Delivery Note History ({getShortcut('deliveryNoteHistory')})</Dropdown.Item>
                                        <Dropdown.Item onClick={() => openQuotationHistory(product)}><i className="bi bi-clock-history"></i>&nbsp;Quotation History ({getShortcut('quotationHistory')})</Dropdown.Item>
                                        <Dropdown.Item onClick={() => openQuotationSalesHistory(product)}><i className="bi bi-clock-history"></i>&nbsp;Qtn. Sales History ({getShortcut('quotationSalesHistory')})</Dropdown.Item>
                                        <Dropdown.Item onClick={() => openQuotationSalesReturnHistory(product)}><i className="bi bi-clock-history"></i>&nbsp;Qtn. Sales Return History ({getShortcut('quotationSalesReturnHistory')})</Dropdown.Item>
                                        <Dropdown.Item onClick={() => openProductImages(product.product_id)}><i className="bi bi-images"></i>&nbsp;Images ({getShortcut('images')})</Dropdown.Item>
                                      </Dropdown.Menu>
                                    </Dropdown>
                                  </div>
                                </td>
                                <td style={TD}>
                                  <input type="number" id={`set_product_quantity_${key}`} name={`set_product_quantity_${key}`}
                                    value={formData.set.products[key].quantity} className="form-control form-control-sm"
                                    ref={(el) => { if (!inputRefs.current[key]) inputRefs.current[key] = {}; inputRefs.current[key][`set_product_quantity_${key}`] = el; }}
                                    onFocus={() => { if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = setTimeout(() => { inputRefs.current[key][`set_product_quantity_${key}`].select(); }, 100); }}
                                    onKeyDown={(e) => { RunKeyActions(e, product); if (timerRef.current) clearTimeout(timerRef.current); if (e.key === 'ArrowLeft') { if ((key + 1) === formData.set.products.length) { timerRef.current = setTimeout(() => { productSetSearchRef.current?.focus(); }, 100); } else { timerRef.current = setTimeout(() => { inputRefs.current[(key + 1)][`set_product_unit_price_with_vat_${key + 1}`].focus(); }, 100); } } }}
                                    onChange={(e) => { errors[`set_product_quantity_${key}`] = ''; setErrors({ ...errors }); if (e.target.value === 0) { formData.set.products[key].quantity = 0; setFormData({ ...formData }); findSetTotal(); return; } if (!e.target.value) { formData.set.products[key].quantity = ''; setFormData({ ...formData }); findSetTotal(); return; } formData.set.products[key].quantity = parseFloat(e.target.value); setFormData({ ...formData }); findSetTotal(); }}
                                  />
                                  {errors[`set_product_quantity_${key}`] && <ErrMsg>{errors[`set_product_quantity_${key}`]}</ErrMsg>}
                                </td>
                                <td style={TD}>{formData.set.products[key].unit ? formData.set.products[key].unit[0]?.toUpperCase() : 'P'}</td>
                                <td style={TD}>
                                  <input type="number" id={`set_product_purchase_unit_price_${key}`} name={`set_product_purchase_unit_price_${key}`}
                                    value={formData.set.products[key].purchase_unit_price} className="form-control form-control-sm"
                                    ref={(el) => { if (!inputRefs.current[key]) inputRefs.current[key] = {}; inputRefs.current[key][`set_product_purchase_unit_price_${key}`] = el; }}
                                    onFocus={() => { if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = setTimeout(() => { inputRefs.current[key][`set_product_purchase_unit_price_${key}`].select(); }, 100); }}
                                    onKeyDown={(e) => { RunKeyActions(e, product); if (timerRef.current) clearTimeout(timerRef.current); if (e.key === 'ArrowLeft') { timerRef.current = setTimeout(() => { inputRefs.current[key][`set_product_quantity_${key}`].focus(); }, 100); } }}
                                    onChange={(e) => { errors[`set_product_purchase_unit_price_${key}`] = ''; setErrors({ ...errors }); if (e.target.value === 0) { formData.set.products[key].purchase_unit_price_with_vat = 0; formData.set.products[key].purchase_unit_price = 0; findSetTotal(); setFormData({ ...formData }); return; } if (!e.target.value) { formData.set.products[key].purchase_unit_price_with_vat = ''; formData.set.products[key].purchase_unit_price = ''; findSetTotal(); setFormData({ ...formData }); return; } formData.set.products[key].purchase_unit_price = parseFloat(e.target.value); formData.set.products[key].purchase_unit_price_with_vat = parseFloat(trimTo8Decimals(formData.set.products[key].purchase_unit_price * (1 + (store.vat_percent / 100)))); setFormData({ ...formData }); findSetTotal(); }}
                                  />
                                  {errors[`set_product_purchase_unit_price_${key}`] && <ErrMsg>{errors[`set_product_purchase_unit_price_${key}`]}</ErrMsg>}
                                </td>
                                <td style={TD}>
                                  <input type="number" id={`set_product_purchase_unit_price_with_vat_${key}`} name={`set_product_purchase_unit_price_with_vat_${key}`}
                                    value={formData.set.products[key].purchase_unit_price_with_vat} className="form-control form-control-sm"
                                    ref={(el) => { if (!inputRefs.current[key]) inputRefs.current[key] = {}; inputRefs.current[key][`set_product_purchase_unit_price_with_vat_${key}`] = el; }}
                                    onFocus={() => { if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = setTimeout(() => { inputRefs.current[key][`set_product_purchase_unit_price_with_vat_${key}`]?.select(); }, 100); }}
                                    onKeyDown={(e) => { RunKeyActions(e, product); if (timerRef.current) clearTimeout(timerRef.current); if (e.key === 'Enter') { if ((key + 1) === formData.set.products.length) { timerRef.current = setTimeout(() => { productSetSearchRef.current?.focus(); }, 100); } else { if (key === 0) { timerRef.current = setTimeout(() => { productSetSearchRef.current?.focus(); }, 100); } else { timerRef.current = setTimeout(() => { inputRefs.current[key][`set_product_unit_price_${key}`].focus(); }, 100); } } } else if (e.key === 'ArrowLeft') { timerRef.current = setTimeout(() => { inputRefs.current[key][`set_product_purchase_unit_price_${key}`].focus(); }, 100); } }}
                                    onChange={(e) => { errors[`set_product_purchase_unit_price_with_vat_${key}`] = ''; setErrors({ ...errors }); if (e.target.value === 0) { formData.set.products[key].purchase_unit_price_with_vat = 0; formData.set.products[key].purchase_unit_price = 0; findSetTotal(); setFormData({ ...formData }); return; } if (!e.target.value) { formData.set.products[key].purchase_unit_price_with_vat = ''; formData.set.products[key].purchase_unit_price = ''; findSetTotal(); setFormData({ ...formData }); return; } formData.set.products[key].purchase_unit_price_with_vat = parseFloat(e.target.value); formData.set.products[key].purchase_unit_price = parseFloat(trimTo8Decimals(formData.set.products[key].purchase_unit_price_with_vat / (1 + (store.vat_percent / 100)))); setFormData({ ...formData }); findSetTotal(); }}
                                  />
                                  {errors[`set_product_purchase_unit_price_with_vat_${key}`] && <ErrMsg>{errors[`set_product_purchase_unit_price_with_vat_${key}`]}</ErrMsg>}
                                </td>
                                <td style={TD}>
                                  {trimTo2Decimals(formData.set.products[key].purchase_price_percent) + '%'}
                                  <OverlayTrigger placement="right" overlay={renderPercentTooltip({ value: formData.set.products[key].purchase_price_percent })}>
                                    <span style={{ textDecoration: 'underline dotted', cursor: 'pointer' }}>ℹ️</span>
                                  </OverlayTrigger>
                                </td>
                                <td style={TD}>
                                  <input type="number" id={`set_product_unit_price_${key}`} name={`set_product_unit_price_${key}`}
                                    value={formData.set.products[key].retail_unit_price} className="form-control form-control-sm"
                                    ref={(el) => { if (!inputRefs.current[key]) inputRefs.current[key] = {}; inputRefs.current[key][`set_product_unit_price_${key}`] = el; }}
                                    onFocus={() => { if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = setTimeout(() => { inputRefs.current[key][`set_product_unit_price_${key}`].select(); }, 100); }}
                                    onKeyDown={(e) => { RunKeyActions(e, product); if (timerRef.current) clearTimeout(timerRef.current); if (e.key === 'ArrowLeft') { timerRef.current = setTimeout(() => { inputRefs.current[key][`set_product_purchase_unit_price_with_vat_${key}`].focus(); }, 100); } }}
                                    onChange={(e) => { errors[`set_product_unit_price_${key}`] = ''; setErrors({ ...errors }); if (e.target.value === 0) { formData.set.products[key].retail_unit_price_with_vat = 0; formData.set.products[key].retail_unit_price = 0; findSetTotal(); setFormData({ ...formData }); return; } if (!e.target.value) { formData.set.products[key].retail_unit_price_with_vat = ''; formData.set.products[key].retail_unit_price = ''; findSetTotal(); setFormData({ ...formData }); return; } formData.set.products[key].retail_unit_price = parseFloat(e.target.value); formData.set.products[key].retail_unit_price_with_vat = parseFloat(trimTo8Decimals(formData.set.products[key].retail_unit_price * (1 + (store.vat_percent / 100)))); setFormData({ ...formData }); findSetTotal(); }}
                                  />
                                  {errors[`set_product_unit_price_${key}`] && <ErrMsg>{errors[`set_product_unit_price_${key}`]}</ErrMsg>}
                                </td>
                                <td style={TD}>
                                  <input type="number" id={`set_product_unit_price_with_vat_${key}`} name={`set_product_unit_price_with_vat_${key}`}
                                    value={formData.set.products[key].retail_unit_price_with_vat} className="form-control form-control-sm"
                                    ref={(el) => { if (!inputRefs.current[key]) inputRefs.current[key] = {}; inputRefs.current[key][`set_product_unit_price_with_vat_${key}`] = el; }}
                                    onFocus={() => { if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = setTimeout(() => { inputRefs.current[key][`set_product_unit_price_with_vat_${key}`]?.select(); }, 100); }}
                                    onKeyDown={(e) => { RunKeyActions(e, product); if (timerRef.current) clearTimeout(timerRef.current); if (e.key === 'Enter') { if ((key + 1) === formData.set.products.length) { timerRef.current = setTimeout(() => { productSetSearchRef.current?.focus(); }, 100); } else { if (key === 0) { timerRef.current = setTimeout(() => { productSetSearchRef.current?.focus(); }, 100); } else { timerRef.current = setTimeout(() => { inputRefs.current[key - 1][`set_product_quantity_${key - 1}`]?.focus(); }, 100); } } } else if (e.key === 'ArrowLeft') { timerRef.current = setTimeout(() => { inputRefs.current[key][`set_product_unit_price_${key}`].focus(); }, 100); } }}
                                    onChange={(e) => { errors[`set_product_unit_price_with_vat_${key}`] = ''; setErrors({ ...errors }); if (e.target.value === 0) { formData.set.products[key].retail_unit_price_with_vat = 0; formData.set.products[key].retail_unit_price = 0; findSetTotal(); setFormData({ ...formData }); return; } if (!e.target.value) { formData.set.products[key].retail_unit_price_with_vat = ''; formData.set.products[key].retail_unit_price = ''; findSetTotal(); setFormData({ ...formData }); return; } formData.set.products[key].retail_unit_price_with_vat = parseFloat(e.target.value); formData.set.products[key].retail_unit_price = parseFloat(trimTo8Decimals(formData.set.products[key].retail_unit_price_with_vat / (1 + (store.vat_percent / 100)))); setFormData({ ...formData }); findSetTotal(); }}
                                  />
                                  {errors[`set_product_unit_price_with_vat_${key}`] && <ErrMsg>{errors[`set_product_unit_price_with_vat_${key}`]}</ErrMsg>}
                                </td>
                                <td style={TD}>
                                  {trimTo2Decimals(formData.set.products[key].retail_price_percent) + '%'}
                                  <OverlayTrigger placement="right" overlay={renderPercentTooltip({ value: formData.set.products[key].retail_price_percent })}>
                                    <span style={{ textDecoration: 'underline dotted', cursor: 'pointer' }}>ℹ️</span>
                                  </OverlayTrigger>
                                </td>
                                <td style={TD}>
                                  <Button variant="danger" size="sm" onClick={() => RemoveProductFromSet(key)}>
                                    <i className="bi bi-trash"></i>
                                  </Button>
                                </td>
                              </tr>
                            )).reverse()}
                            <tr style={{ fontWeight: 700, background: '#eceef0' }}>
                              <td style={TD}></td><td style={TD}></td><td style={{ ...TD, textAlign: 'right' }}>Total</td>
                              <td style={TD}>{formData.set?.total_quantity ? trimTo4Decimals(formData.set.total_quantity) : ''}</td>
                              <td style={TD}></td>
                              <td style={TD}>{formData.set?.purchase_total ? trimTo4Decimals(formData.set.purchase_total) : ''}{errors['set_purchase_total'] && <ErrMsg>{errors['set_purchase_total']}</ErrMsg>}</td>
                              <td style={TD}>{formData.set?.purchase_total_with_vat ? trimTo4Decimals(formData.set.purchase_total_with_vat) : ''}</td>
                              <td style={TD}></td>
                              <td style={TD}>{formData.set?.total ? trimTo4Decimals(formData.set.total) : ''}{errors['set_total'] && <ErrMsg>{errors['set_total']}</ErrMsg>}</td>
                              <td style={TD}>{formData.set?.total_with_vat ? trimTo4Decimals(formData.set.total_with_vat) : ''}</td>
                              <td style={TD}></td><td style={TD}></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                </div>

              {/* ===== LINKED PRODUCTS & PHOTOS ===== */}
              <div className="pw-tab-wrap">

                  <div className="pw-card" style={CARD}>
                    <SectionTitle icon="bi-link-45deg">Linked Products</SectionTitle>
                    <Typeahead id="linked_product_id" labelKey="search_label" emptyLabel="" filterBy={() => true} ref={productSearchRef} multiple
                      onChange={(selectedItems) => {
                        if (selectedItems.length > selectedLinkedProducts.length) {
                          if (!IsProductExistsInLinkedProducts(selectedItems[selectedItems.length - 1].id)) setSelectedLinkedProducts(selectedItems);
                        } else { setSelectedLinkedProducts(selectedItems); }
                        setOpenProductSearchResult(false);
                      }}
                      options={productOptions} placeholder="Search products to link..." selected={selectedLinkedProducts} highlightOnlyResult={true} open={openProductSearchResult}
                      onKeyDown={(e) => { if (e.key === 'Escape') { setProductOptions([]); setOpenProductSearchResult(false); } }}
                      onInputChange={(searchTerm) => { if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = setTimeout(() => { suggestProducts(searchTerm); }, 100); }}
                      renderMenu={(results, menuProps, state) => {
                        const searchWords = state.text.toLowerCase().split(' ').filter(Boolean);
                        return (
                          <Menu {...menuProps}>
                            <MenuItem disabled style={{ position: 'sticky', top: 0, padding: 0, margin: 0 }}>
                              <div style={{ background: '#f8f9fa', zIndex: 2, display: 'flex', fontWeight: 'bold', padding: '4px 8px', borderBottom: '1px solid #ddd' }}>
                                <div style={{ width: '3%' }}></div><div style={{ width: '14%' }}>Part Number</div><div style={{ width: '29%' }}>Name</div>
                                <div style={{ width: '12%' }}>S.Unit Price</div><div style={{ width: '5%' }}>Stock</div><div style={{ width: '5%' }}>Photos</div>
                                <div style={{ width: '10%' }}>Brand</div><div style={{ width: '12%' }}>P.Unit Price</div><div style={{ width: '10%' }}>Country</div>
                              </div>
                            </MenuItem>
                            {results.map((option, index) => {
                              const onlyOneResult = results.length === 1;
                              const isActive = state.activeIndex === index || onlyOneResult;
                              let checked = IsProductExistsInLinkedProducts(option.id);
                              return (
                                <MenuItem option={option} position={index} key={index} style={{ padding: '0px' }}>
                                  <div style={{ display: 'flex', padding: '4px 8px' }}>
                                    <div className="form-check" style={{ ...columnStyle, width: '3%' }} onClick={e => { e.stopPropagation(); checked = !checked; if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = setTimeout(() => { if (checked) { selectedLinkedProducts.push(option); setSelectedLinkedProducts([...selectedLinkedProducts]); } else removeProductFromLinkedProducts(option); }, 100); }}>
                                      <input className="form-check-input" type="checkbox" value={checked} checked={checked} onClick={e => e.stopPropagation()} onChange={e => { e.preventDefault(); e.stopPropagation(); checked = !checked; if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = setTimeout(() => { if (checked) { selectedLinkedProducts.push(option); setSelectedLinkedProducts([...selectedLinkedProducts]); } else removeProductFromLinkedProducts(option); }, 100); }} />
                                    </div>
                                    <div style={{ ...columnStyle, width: '14%' }}>{highlightWords(option.prefix_part_number ? `${option.prefix_part_number}-${option.part_number}` : option.part_number, searchWords, isActive)}</div>
                                    <div style={{ ...columnStyle, width: '29%' }}>{highlightWords(option.name_in_arabic ? `${option.name} - ${option.name_in_arabic}` : option.name, searchWords, isActive)}</div>
                                    <div style={{ ...columnStyle, width: '12%' }}>{option.product_stores?.[localStorage.getItem('store_id')]?.retail_unit_price && <><Amount amount={trimTo2Decimals(option.product_stores?.[localStorage.getItem('store_id')]?.retail_unit_price)} />+</>}{option.product_stores?.[localStorage.getItem('store_id')]?.retail_unit_price_with_vat && <>|<Amount amount={trimTo2Decimals(option.product_stores?.[localStorage.getItem('store_id')]?.retail_unit_price_with_vat)} /></>}</div>
                                    <div style={{ ...columnStyle, width: '5%' }}>{(() => { const storeId = localStorage.getItem('store_id'); const ps = option.product_stores?.[storeId]; const totalStock = ps?.stock ?? 0; const ws = ps?.warehouse_stocks ?? {}; const warehouseDetails = (() => { let details = []; if (ws['main_store'] !== undefined) details.push(`MS: ${ws['main_store']}`); Object.entries(ws).filter(([k]) => k !== 'main_store').forEach(([k, v]) => details.push(`${k.replace(/^w/, 'WH').toUpperCase()}: ${v}`)); return details.join(', '); })(); return <span>{totalStock}{warehouseDetails && store.settings.enable_warehouse_module ? ` (${warehouseDetails})` : ''}</span>; })()}</div>
                                    <div style={{ ...columnStyle, width: '5%' }}><button type="button" className={isActive ? 'btn btn-outline-light btn-sm' : 'btn btn-outline-primary btn-sm'} onClick={(e) => { e.preventDefault(); e.stopPropagation(); openProductImages(option.id); }}><i className="bi bi-images" aria-hidden="true" /></button></div>
                                    <div style={{ ...columnStyle, width: '10%' }}>{highlightWords(option.brand_name, searchWords, isActive)}</div>
                                    <div style={{ ...columnStyle, width: '12%' }}>{option.product_stores?.[localStorage.getItem('store_id')]?.purchase_unit_price && <><Amount amount={trimTo2Decimals(option.product_stores?.[localStorage.getItem('store_id')]?.purchase_unit_price)} />+</>}{option.product_stores?.[localStorage.getItem('store_id')]?.purchase_unit_price_with_vat && <>|<Amount amount={trimTo2Decimals(option.product_stores?.[localStorage.getItem('store_id')]?.purchase_unit_price_with_vat)} /></>}</div>
                                    <div style={{ ...columnStyle, width: '10%' }}>{highlightWords(option.country_name, searchWords, isActive)}</div>
                                  </div>
                                </MenuItem>
                              );
                            })}
                          </Menu>
                        );
                      }}
                    />
                  </div>

                  <div className="pw-card" style={CARD}>
                    <SectionTitle icon="bi-images">Product Photos</SectionTitle>
                    <ImageGallery ref={ImageGalleryRef} id={formData.id} storeID={formData.store_id} storedImages={formData.images} modelName="product" handleDelete={handleDeleteImage} />
                  </div>

                </div>

              </div>{/* end pw-content-scroll */}

            </div>{/* end pw-content */}
          </form>
        </Modal.Body>
      </Modal >
    </>
  );
});

export default ProductCreate;