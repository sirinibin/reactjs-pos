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
import Resizer from "react-image-file-resizer";
import countryList from 'react-select-country-list';
//import Select from 'react-select'

const ProductCreate = forwardRef((props, ref) => {


  const countryOptions = useMemo(() => countryList().getData(), [])
  //const [selectedCountry, setSelectedCountry] = useState('')
  let [selectedCountries, setSelectedCountries] = useState([]);


  useImperativeHandle(ref, () => ({
    open(id, linkToProductID) {
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
      getAllStores();

      if (id) {
        getProduct(id);
      } else {
        //getAllStores();
      }



      SetShow(true);
    },
  }));

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

  function resizeFIle(file, w, h, cb) {
    Resizer.imageFileResizer(
      file,
      w,
      h,
      "JPEG",
      100,
      0,
      (uri) => {
        cb(uri);
      },
      "base64"
    );
  }

  let [selectedImage, setSelectedImage] = useState("");
  let [productStores, setProductStores] = useState([]);


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
  });

  const [show, SetShow] = useState(false);

  function handleClose() {
    SetShow(false);
  }

  function getProduct(id) {
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

    fetch("/v1/product/" + id + "?" + queryParams, requestOptions)
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
          // productStores.push(data.result.stores);

          let i = 0;
          for (const key in data.result.product_stores) {
            console.log("key: ", key);
            if (productStores[i].store_id === data.result.product_stores[key].store_id) {
              productStores[i].purchase_unit_price = data.result.product_stores[key].purchase_unit_price;
              productStores[i].wholesale_unit_price = data.result.product_stores[key].wholesale_unit_price;
              productStores[i].retail_unit_price = data.result.product_stores[key].retail_unit_price;
              productStores[i].stock = data.result.product_stores[key].stock;
              productStores[i].damaged_stock = data.result.product_stores[key].damaged_stock;
              i++;
            }
          }
          setProductStores([...productStores]);
          console.log("productStores-ok:", productStores);
        }
        /*
    if(      localStorage.getItem('store_id')){
         //let stores1 = data.result.stores.filter((store)=>store.store_id==      localStorage.getItem('store_id'));
        // let stores1 = data.result.stores;
        if(data.result.stores.length>0){
            productStores= data.result.stores;
            setProductStores([...productStores]);
        }
    }else {
        console.log("data.result.stores:",data.result.stores);
       // productStores.push(data.result.stores);

        let i=0;
        for(let store of data.result.stores){
            if(productStores[i].store_id == store.store_id){
                productStores[i].purchase_unit_price= store.purchase_unit_price;
                productStores[i].wholesale_unit_price= store.wholesale_unit_price;
                productStores[i].retail_unit_price= store.retail_unit_price;
                productStores[i].stock= store.stock;
                i++;
            }
        }
        setProductStores([...productStores]);
        console.log("productStores:",productStores);
        */



        formData = data.result;
        formData.name = data.result.name;
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

  let [stores, setStores] = useState([]);

  async function getAllStores() {
    console.log("fetching all stores");
    const requestOptions = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: localStorage.getItem("access_token"),
      },
    };

    let Select = "select=id,name";
    let result = await fetch("/v1/store?" + Select, requestOptions);
    let data = await result.json();

    stores = data.result;
    setStores(data.result);
    productStores = [];
    for (let i = 0; i < stores.length; i++) {
      productStores.push({
        store_id: stores[i].id,
        store_name: stores[i].name,
        purchase_unit_price: "",
        retail_unit_price: "",
        wholesale_unit_price: "",
        stock: "",
      });
    }

    setProductStores([...productStores]);
    console.log("productStores:", productStores);
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
    setErrors({ ...errors });

    formData.category_id = [];
    for (var i = 0; i < selectedCategories.length; i++) {
      formData.category_id.push(selectedCategories[i].id);
    }

    formData.linked_product_ids = [];
    for (i = 0; i < selectedLinkedProducts.length; i++) {
      formData.linked_product_ids.push(selectedLinkedProducts[i].id);
    }

    console.log("productStores:", productStores);


    let storesData = {};
    for (let i = 0; i < productStores.length; i++) {

      /*
      if (productStores[i]?.retail_unit_price) {
        if (/^\d*\.?\d{0,2}$/.test(productStores[i]?.retail_unit_price) === false) {
          errors["retail_unit_price_" + i] = "Only 2 decimal points are allowed";
          haveErrors = true;
          setErrors({ ...errors });
        }
      }*/




      storesData[productStores[i].store_id] = {
        "store_id": productStores[i].store_id,
        "store_name": productStores[i].store_name,
        "retail_unit_price": productStores[i].retail_unit_price ? productStores[i].retail_unit_price : 0,
        "wholesale_unit_price": productStores[i].wholesale_unit_price ? productStores[i].wholesale_unit_price : 0,
        "purchase_unit_price": productStores[i].purchase_unit_price ? productStores[i].purchase_unit_price : 0,
        "stock": productStores[i].stock ? productStores[i].stock : 0,
        "damaged_stock": productStores[i].damaged_stock ? productStores[i].damaged_stock : 0,
      };
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
    }

    formData.product_stores = storesData;


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
        setProcessing(false);

        console.log("Response after creating  product:");
        console.log(data);
        if (formData.id) {
          props.showToastMessage("Product updated successfully!", "success");
        } else {
          props.showToastMessage("Product created successfully!", "success");
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
        props.showToastMessage("Failed to process product!", "danger");
      });
  }


  function getTargetDimension(
    originaleWidth,
    originalHeight,
    targetWidth,
    targetHeight
  ) {
    let ratio = parseFloat(originaleWidth / originalHeight);

    targetWidth = parseInt(targetHeight * ratio);
    targetHeight = parseInt(targetWidth * ratio);

    return { targetWidth: targetWidth, targetHeight: targetHeight };
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

  const suggestProducts = useCallback(async (searchTerm) => {
    console.log("Inside handle suggestProducts");
    setProductOptions([]);

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

    let Select = `select=id,item_code,prefix_part_number,country_name,brand_name,part_number,name,unit,name_in_arabic,product_stores.${localStorage.getItem('store_id')}.purchase_unit_price,product_stores.${localStorage.getItem('store_id')}.retail_unit_price,product_stores.${localStorage.getItem('store_id')}.stock`;
    //setIsProductsLoading(true);
    let result = await fetch(
      "/v1/product?" + Select + queryString + "&limit=200",
      requestOptions
    );
    let data = await result.json();

    let products = data.result;
    if (!products || products.length === 0) {
      // openProductSearchResult = false;
      //setOpenProductSearchResult(false);
      // setIsProductsLoading(false);
      return;
    }

    // openProductSearchResult = true;
    //setOpenProductSearchResult(true);
    setProductOptions(products);
    //setIsProductsLoading(false);

  }, []);

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
                  id="name"
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
                  id="name_in_arabic"
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
                      formData.brand_name = "";
                      setFormData({ ...formData });
                      setSelectedBrands([]);
                      return;
                    }
                    formData.brand_id = selectedItems[0].id;
                    formData.brand_code = selectedItems[0].code;
                    formData.brand_name = selectedItems[0].name;
                    setFormData({ ...formData });
                    setSelectedBrands(selectedItems);
                    makePartNumberPrefix();
                  }}
                  options={brandOptions}
                  placeholder="Brand name"
                  selected={selectedBrands}
                  highlightOnlyResult={true}
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
                      setFormData({ ...formData });
                      setSelectedCountries([]);
                      return;
                    }
                    formData.country_code = selectedItems[0].value;
                    formData.country_name = selectedItems[0].label;
                    setFormData({ ...formData });
                    setSelectedCountries(selectedItems);
                    makePartNumberPrefix();
                  }}
                  options={countryOptions}
                  placeholder="Country name"
                  selected={selectedCountries}
                  highlightOnlyResult={true}
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
                  id="prefix_part_number"
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
                  id="part_number"
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
                  id="rack"
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
              <label className="form-label">Categories*</label>

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










            <h4>Unit Price & Stock</h4>
            <div className="table-responsive" style={{ overflowX: "auto" }}>
              <table className="table table-striped table-sm table-bordered">
                <thead>
                  <tr className="text-center">
                    {!localStorage.getItem('store_id') ? <th>Store Name</th> : ""}
                    <th>Purchase Unit Price</th>
                    <th>Wholesale Unit Price</th>
                    <th>Retail Unit Price</th>
                    <th>Damaged/Missing Stock</th>
                    <th>Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {stores.map((store, index) => (
                    !localStorage.getItem('store_id') || store.id === localStorage.getItem('store_id') ? <tr key={index} className="text-center">
                      {!localStorage.getItem('store_id') ? <td style={{ width: "150px" }}>{store.name}</td> : ""}
                      <td style={{ width: "150px" }}>
                        <input
                          type="number"
                          value={
                            productStores[index]?.purchase_unit_price || productStores[index]?.purchase_unit_price === 0
                              ? productStores[index]?.purchase_unit_price
                              : ""
                          }
                          className="form-control"
                          placeholder="Purchase Unit Price"
                          onChange={(e) => {
                            errors["purchase_unit_price_" + index] = "";
                            setErrors({ ...errors });

                            if (!e.target.value) {
                              productStores[index].purchase_unit_price = "";
                              setProductStores([...productStores]);
                              // setErrors({ ...errors });
                              console.log("errors:", errors);
                              return;
                            }
                            if (parseFloat(e.target.value) < 0) {
                              productStores[index].purchase_unit_price = "";
                              setProductStores([...productStores]);

                              errors["purchase_unit_price_" + index] =
                                "Purchase Unit Price should not be < 0";
                              setErrors({ ...errors });
                              return;
                            }

                            productStores[index].purchase_unit_price = parseFloat(e.target.value);
                            setProductStores([...productStores]);
                          }}
                        />{" "}
                        {errors["purchase_unit_price_" + index] && (
                          <div style={{ color: "red" }}>
                            {errors["purchase_unit_price_" + index]}
                          </div>
                        )}

                      </td>
                      <td style={{ width: "150px" }}>
                        <input
                          type="number"
                          value={
                            productStores[index]?.wholesale_unit_price || productStores[index]?.wholesale_unit_price === 0
                              ? productStores[index]?.wholesale_unit_price
                              : ""
                          }
                          className="form-control"
                          placeholder="Wholesale Unit Price"
                          onChange={(e) => {
                            errors["wholesale_unit_price_" + index] = "";
                            setErrors({ ...errors });

                            if (!e.target.value) {
                              productStores[index].wholesale_unit_price = "";
                              setProductStores([...productStores]);
                              return;
                            }

                            if (parseFloat(e.target.value) < 0) {
                              productStores[index].wholesale_unit_price = "";
                              setProductStores([...productStores]);

                              errors["wholesale_unit_price_" + index] =
                                "Wholesale unit price should not be < 0";
                              setErrors({ ...errors });
                              return;
                            }

                            productStores[index].wholesale_unit_price = parseFloat(e.target.value);

                            setProductStores([...productStores]);
                          }}
                        />
                        {errors["wholesale_unit_price_" + index] && (
                          <div style={{ color: "red" }}>
                            {errors["wholesale_unit_price_" + index]}
                          </div>
                        )}

                      </td>
                      <td style={{ width: "150px" }}>
                        <input
                          type="number"
                          value={
                            productStores[index]?.retail_unit_price || productStores[index]?.retail_unit_price === 0
                              ? productStores[index]?.retail_unit_price
                              : ""
                          }
                          className="form-control"
                          placeholder="Retail Unit Price"
                          onChange={(e) => {
                            errors["retail_unit_price_" + index] = "";
                            setErrors({ ...errors });
                            if (!e.target.value) {
                              productStores[index].retail_unit_price = "";
                              setProductStores([...productStores]);
                              return;
                            }

                            if (parseFloat(e.target.value) < 0) {
                              errors["retail_unit_price_" + index] =
                                "Retail Unit Price should not be < 0";
                              productStores[index].retail_unit_price = "";

                              setProductStores([...productStores]);
                              setErrors({ ...errors });
                              console.log("errors:", errors);
                              return;
                            }

                            console.log("e.target.value:", e.target.value);

                            productStores[index].retail_unit_price = parseFloat(
                              e.target.value
                            );
                            console.log("productStores[index].retail_unit_price:", productStores[index].retail_unit_price);
                            setProductStores([...productStores]);
                          }}
                        />{" "}
                        {errors["retail_unit_price_" + index] && (
                          <div style={{ color: "red" }}>

                            {errors["retail_unit_price_" + index]}
                          </div>
                        )}

                      </td>

                      <td style={{ width: "150px" }}>
                        <input
                          value={productStores[index]?.damaged_stock || productStores[index]?.damaged_stock === 0
                            ? productStores[index].damaged_stock
                            : ""
                          }
                          type="number"
                          onChange={(e) => {
                            errors["damaged_stock_" + index] = "";
                            setErrors({ ...errors });

                            if (!e.target.value) {
                              productStores[index].damaged_stock = "";
                              setProductStores([...productStores]);
                              //errors["stock_" + index] = "Invalid Stock value";
                              //setErrors({ ...errors });
                              return;
                            }

                            productStores[index].damaged_stock = parseFloat(e.target.value);
                          }}
                          className="form-control"
                          id="damaged_stock"
                          placeholder="Damaged stock"
                        />
                        {errors["damaged_stock_" + index] && (
                          <div style={{ color: "red" }}>
                            {errors["damaged_stock_" + index]}
                          </div>
                        )}
                      </td>
                      <td style={{ width: "150px" }}>
                        <input
                          value={productStores[index]?.stock || productStores[index]?.stock === 0
                            ? productStores[index].stock
                            : ""
                          }
                          disabled={true}
                          type="number"
                          onChange={(e) => {
                            errors["stock_" + index] = "";
                            setErrors({ ...errors });

                            if (!e.target.value) {
                              productStores[index].stock = "";
                              setProductStores([...productStores]);
                              //errors["stock_" + index] = "Invalid Stock value";
                              //setErrors({ ...errors });
                              return;
                            }

                            productStores[index].stock = parseFloat(e.target.value);
                          }}
                          className="form-control"
                          id="stock"
                          placeholder="Stock"
                        />
                        {errors["stock_" + index] && (
                          <div style={{ color: "red" }}>
                            <i className="bi bi-x-lg"> </i>
                            {errors["stock_" + index]}
                          </div>
                        )}
                      </td>
                    </tr> : ''
                  ))}
                </tbody>
              </table>
            </div>

            <div className="col-md-12">
              <label className="form-label">Linked Products</label>
              <Typeahead
                id="product_id"
                labelKey="search_label"
                onChange={(selectedItems) => {
                  setSelectedLinkedProducts(selectedItems);
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
                onInputChange={(searchTerm, e) => {
                  suggestProducts(searchTerm);
                }}
                multiple
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">Image</label>

              <div className="input-group mb-3">
                <input
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

                    /*
                                        resizeFIle(file, (result) => {
                                            if (!formData.images_content) {
                                                formData.images_content = [];
                                            }
                                            formData.images_content[0] = result;
                                            setFormData({ ...formData });
     
                                            console.log("formData.images_content[0]:", formData.images_content[0]);
                                        });
                                        */
                  }}
                  className="form-control"
                  id="image"
                />
                {errors.image && (
                  <div style={{ color: "red" }}>
                    {errors.image}
                  </div>
                )}

              </div>
            </div>

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
