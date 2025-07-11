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

import { Spinner } from "react-bootstrap";
import { Typeahead } from "react-bootstrap-typeahead";
import StoreCreate from "../store/create.js";
import ProductCategoryCreate from "../product_category/create.js";
import ProductBrandCreate from "../product_brand/create.js";
import countryList from 'react-select-country-list';
import ImageGallery from '../utils/ImageGallery.js';
import { trimTo2Decimals } from "../utils/numberUtils.js";
//import Select from 'react-select'

const ProductUpdate = forwardRef((props, ref) => {


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
          ImageGalleryRef.current.open();
        }, 300);

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

  const [show, SetShow] = useState(false);

  function handleClose() {
    SetShow(false);
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
              id: categoryIds[i],
              name: categoryNames[i],
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
      if (!formData.set?.products[i].retail_unit_price) {
        formData.set.products[i].retail_unit_price = 0;
      }
      if (!formData.set?.products[i].retail_unit_price_with_vat) {
        formData.set.products[i].retail_unit_price_with_vat = 0;
      }

      if (/^\d*\.?\d{0,2}$/.test(formData.set?.products[i].retail_unit_price_with_vat) === false) {
        errors["set_product_unit_price_with_vat_" + i] = "Only 2 decimal points are allowed";
        haveErrors = true;
        setErrors({ ...errors });
      }

      if (/^\d*\.?\d{0,2}$/.test(formData.set?.products[i].retail_unit_price) === false) {
        errors["set_product_unit_price_" + i] = "Only 2 decimal points are allowed";
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
      if (/^\d*\.?\d{0,2}$/.test(productStores[i]?.retail_unit_price) === false) {
        errors["retail_unit_price_" + i] = "Only 2 decimal points are allowed";
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

        await ImageGalleryRef.current.uploadAllImages();

        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
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

    let Select = `select=id,additional_keywords,search_label,set.name,item_code,prefix_part_number,country_name,brand_name,part_number,name,unit,name_in_arabic,product_stores.${localStorage.getItem('store_id')}.purchase_unit_price,product_stores.${localStorage.getItem('store_id')}.purchase_unit_price_with_vat,product_stores.${localStorage.getItem('store_id')}.retail_unit_price,product_stores.${localStorage.getItem('store_id')}.retail_unit_price_with_vat,product_stores.${localStorage.getItem('store_id')}.stock`;
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

    if (type === "set") {
      setOpenProductSetSearchResult(true);
      setProductSetOptions(products);
    } else {
      setOpenProductSearchResult(true);
      setProductOptions(products);
    }

    //setIsProductsLoading(false);

  }, []);


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

    if (IsProductExistsInSet(product.id)) {
      return;
    }

    if (product.product_stores && product.product_stores[formData.store_id]?.retail_unit_price) {
      product.unit_price = product.product_stores[formData.store_id].retail_unit_price;
      product.unit_price_with_vat = product.product_stores[formData.store_id].retail_unit_price_with_vat;
    }

    formData.set.products.push({
      "product_id": product.id,
      "name": product.name,
      "retail_unit_price": product.unit_price,
      "retail_unit_price_with_vat": product.unit_price_with_vat,
    });
    setFormData({ ...formData });
    findSetTotal();
  }


  function IsProductExistsInSet(productID) {
    for (var i = 0; i < formData.set.products.length; i++) {
      if (formData.set.products[i].product_id === productID) {
        return true;
      }
    }
    return false;
  }

  function RemoveProductFromSet(index) {
    if (index > -1) {
      formData.set.products.splice(index, 1);
    }
    setFormData({ ...formData });
    findSetTotal();
  }

  function findSetTotal() {
    let total = 0.00;
    let totalWithVAT = 0.00;
    for (let i = 0; i < formData.set.products.length; i++) {
      total += formData.set.products[i].retail_unit_price;
      totalWithVAT += formData.set.products[i].retail_unit_price_with_vat;
    }
    formData.set.total = parseFloat(trimTo2Decimals(total));
    formData.set.total_with_vat = parseFloat(trimTo2Decimals(totalWithVAT));

    productStores[localStorage.getItem('store_id')].retail_unit_price = formData.set.total;
    productStores[localStorage.getItem('store_id')].retail_unit_price_with_vat = formData.set.total_with_vat;

    setFormData({ ...formData });
  }

  return (
    <>
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
        size="xl"
        onHide={handleClose}
        animation={false}
        backdrop="static"
        scrollable={true}
        keyboard={false}
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
                    console.log(formData);
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

            {/*
                        <div className="col-md-6">
                            <label className="form-label">ean_12</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.ean_12 ? formData.ean_12 : ""}
                                    type='string'
                                    onChange={(e) => {
                                        errors["name"] = "";
                                        setErrors({ ...errors });
                                        formData.ean_12 = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="ean_12"
                                    placeholder="ean_12"
                                />
                                {errors.ean_12 && (
                                    <div style={{ color: "red" }}>
                                        <i className="bi bi-x-lg"> </i>
                                        {errors.ean_12}
                                    </div>
                                )}
                               
                            </div>
                        </div>
                                */}

            <div className="col-md-6">
              <label className="form-label">Name In Arabic </label>

              <div className="input-group mb-3">
                <input
                  id="product_name_arabic"
                  name="product_name_arabic"
                  value={formData.name_in_arabic ? formData.name_in_arabic : ""}
                  type="string"
                  onChange={(e) => {
                    errors["v"] = "";
                    setErrors({ ...errors });
                    formData.name_in_arabic = e.target.value;
                    setFormData({ ...formData });
                    console.log(formData);
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
                  ref={categorySearchRef}
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










            <h4>Unit Prices</h4>
            <div className="table-responsive" style={{ overflowX: "auto" }}>
              <table className="table table-striped table-sm table-bordered">
                <thead>
                  <tr className="text-center">
                    <th>Purchase Unit Price</th>
                    <th>Wholesale Unit Price</th>
                    <th>Retail Unit Price</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="text-center">
                    {!localStorage.getItem('store_id') ? <td style={{ width: "150px" }}>{store.name}</td> : ""}
                    <td style={{ width: "150px" }}>
                      <input
                        id={`${"product_purchase_unit_price_0"}`}
                        name={`${"product_purchase_unit_price_0"}`}
                        type="number"
                        value={
                          productStores[localStorage.getItem('store_id')]?.purchase_unit_price || productStores[localStorage.getItem('store_id')]?.purchase_unit_price === 0
                            ? productStores[localStorage.getItem('store_id')]?.purchase_unit_price
                            : ""
                        }
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
                          errors["purchase_unit_price_0"] = "";
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
                          errors["wholesale_unit_price"] = "";
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
                          errors["retail_unit_price"] = "";
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

                          productStores[localStorage.getItem('store_id')].retail_unit_price = parseFloat(
                            e.target.value
                          );
                          console.log("productStores[localStorage.getItem('store_id')].retail_unit_price:", productStores[localStorage.getItem('store_id')].retail_unit_price);
                          setProductStores({ ...productStores });
                        }}
                      />{" "}
                      {errors["retail_unit_price"] && (
                        <div style={{ color: "red" }}>

                          {errors["retail_unit_price"]}
                        </div>
                      )}

                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h4>Stock</h4>
            <div className="table-responsive" style={{ overflowX: "auto" }}>
              <table className="table table-striped table-sm table-bordered">
                <thead>
                  <tr className="text-center">
                    <th>Damaged/Missing Stock</th>
                    <th>Stock</th>
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
                    <td style={{ width: "150px" }}>
                      <input
                        id={`${"product_stock0"}`}
                        name={`${"product_stock0"}`}
                        value={productStores[localStorage.getItem('store_id')]?.stock || productStores[localStorage.getItem('store_id')]?.stock === 0
                          ? productStores[localStorage.getItem('store_id')].stock
                          : ""
                        }
                        disabled={true}
                        type="number"
                        onChange={(e) => {
                          errors["stock_0"] = "";
                          setErrors({ ...errors });

                          if (!e.target.value) {
                            productStores[localStorage.getItem('store_id')].stock = "";
                            setProductStores({ ...productStores });
                            //errors["stock_" + index] = "Invalid Stock value";
                            //setErrors({ ...errors });
                            return;
                          }

                          productStores[localStorage.getItem('store_id')].stock = parseFloat(e.target.value);
                        }}
                        className="form-control"
                        placeholder="Stock"
                      />
                      {errors["stock_0"] && (
                        <div style={{ color: "red" }}>
                          <i className="bi bi-x-lg"> </i>
                          {errors["stock_0"]}
                        </div>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={2}>
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

                            productStores[localStorage.getItem('store_id')].stocks_added += parseFloat(damagedStock);
                            productStores[localStorage.getItem('store_id')].stock += parseFloat(damagedStock);
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

                            productStores[localStorage.getItem('store_id')].stocks_removed += parseFloat(damagedStock);
                            productStores[localStorage.getItem('store_id')].stock -= parseFloat(damagedStock);
                            setProductStores({ ...productStores });
                            damagedStock = "";
                            setDamagedStock(damagedStock);

                          }}>Remove</button>
                        </div>
                      )}
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

            <h4>SET</h4>
            <div className="col-md-3">
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

            <div className="col-md-9">
              <label className="form-label">Select Products</label>
              <Typeahead
                id="product_id"
                labelKey="search_label"
                emptyLabel=""
                ref={productSetSearchRef}
                filterBy={['additional_keywords']}
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
                    inputRefs.current[(formData.set.products.length - 1)][`${"set_product_unit_price_" + (formData.set.products.length - 1)}`].select();
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
                  if (timerRef.current) clearTimeout(timerRef.current);
                  timerRef.current = setTimeout(() => {
                    suggestProducts(searchTerm, "set");
                  }, 100);

                }}
              />
            </div>

            <div className="col-md-12">
              <label className="form-label">Set Products</label>
              <div class="table-responsive" style={{}}>
                <table class="table table-striped table-sm table-bordered">
                  {formData.set?.products && formData.set?.products?.length > 0 &&
                    <thead className="text-center">
                      <th>
                        Name
                      </th>
                      <th>
                        Unit Price
                      </th>
                      <th>
                        Unit Price(with VAT)
                      </th>
                      <th>
                        Action
                      </th>
                    </thead>}
                  <tbody>
                    {formData.set?.products &&
                      formData.set?.products.map((product, key) => (
                        <tr key={key}>
                          <td style={{ minWidth: "300px" }}>
                            {product.name}
                          </td>
                          <td style={{ width: "200px" }}>
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
                                errors["set_product_unit_price_" + key] = "";
                                setErrors({ ...errors });

                                if (e.target.value === 0) {
                                  formData.set.products[key].retail_unit_price_with_vat = 0;
                                  formData.set.products[key].retail_unit_price = 0;
                                  setFormData({ ...formData });
                                  return;
                                }

                                if (!e.target.value) {
                                  formData.set.products[key].retail_unit_price_with_vat = "";
                                  formData.set.products[key].retail_unit_price = ""
                                  setFormData({ ...formData });
                                  return;
                                }

                                formData.set.products[key].retail_unit_price = parseFloat(e.target.value);
                                formData.set.products[key].retail_unit_price_with_vat = parseFloat(trimTo2Decimals(formData.set.products[key].retail_unit_price * (1 + (store.vat_percent / 100))));
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
                          <td style={{ width: "200px" }}>
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
                                        inputRefs.current[key - 1][`${"set_product_unit_price_" + (key - 1)}`]?.focus();
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
                                  setFormData({ ...formData });
                                  return;
                                }

                                if (!e.target.value) {
                                  formData.set.products[key].retail_unit_price_with_vat = "";
                                  formData.set.products[key].retail_unit_price = ""
                                  setFormData({ ...formData });
                                  return;
                                }

                                formData.set.products[key].retail_unit_price_with_vat = parseFloat(e.target.value);
                                formData.set.products[key].retail_unit_price = parseFloat(trimTo2Decimals(formData.set.products[key].retail_unit_price_with_vat / (1 + (store.vat_percent / 100))));
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
                          <td style={{ width: "100px" }}>
                            <Button variant="danger" onClick={(event) => {
                              RemoveProductFromSet(key);
                            }}>
                              Remove
                            </Button>
                          </td>

                        </tr>
                      )).reverse()}
                    <tr>
                      <td class="text-end">
                        <b>Total</b>
                      </td>
                      <td><b style={{ marginLeft: "14px" }}>{formData.set?.total ? trimTo2Decimals(formData.set?.total) + " (without VAT)" : ""}</b>
                        {errors["set_total"] && (
                          <div style={{ color: "red" }}>
                            {errors["set_total"]}
                          </div>
                        )}
                      </td>
                      <td><b style={{ marginLeft: "14px" }}>{formData.set?.total_with_vat ? trimTo2Decimals(formData.set?.total_with_vat) + " (with VAT)" : ""}</b>
                        {errors["set_total_with_vat"] && (
                          <div style={{ color: "red" }}>
                            {errors["set_total_with_vat"]}
                          </div>
                        )}
                      </td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>

              </div>
            </div>

            <h4>Link Products</h4>
            <div className="col-md-12">
              <label className="form-label">Linked Products</label>
              <Typeahead
                id="product_id"
                labelKey="search_label"
                emptyLabel=""
                ref={productSearchRef}
                filterBy={['additional_keywords']}
                onChange={(selectedItems) => {
                  setSelectedLinkedProducts(selectedItems);
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
                    // setProductOptions([]);
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
                multiple
              />
            </div>
            <div className="col-md-12">
              <label className="form-label">Product photos</label>
              <ImageGallery ref={ImageGalleryRef} id={formData.id} storeID={formData.store_id} storedImages={formData.images} modelName={"product"} />
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

export default ProductUpdate;