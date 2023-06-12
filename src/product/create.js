import React, {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Modal, Button } from "react-bootstrap";
import Cookies from "universal-cookie";
import { Spinner } from "react-bootstrap";
import ProductView from "./view.js";
import { Typeahead } from "react-bootstrap-typeahead";
import StoreCreate from "../store/create.js";
import ProductCategoryCreate from "../product_category/create.js";
import Resizer from "react-image-file-resizer";

const ProductCreate = forwardRef((props, ref) => {
  useImperativeHandle(ref, () => ({
    open(id) {
      selectedCategories = [];
      setSelectedCategories(selectedCategories);
      getAllStores();


      formData = {
        images_content: [],
        unit: "",
        item_code: "",
      };
      setFormData({ formData });

      if (id) {
        getProduct(id);
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

  let [storeOptions, setStoreOptions] = useState([]);

  let [selectedCategories, setSelectedCategories] = useState([]);
  let [categoryOptions, setCategoryOptions] = useState([]);

  let [errors, setErrors] = useState({});
  const [isProcessing, setProcessing] = useState(false);
  const cookies = new Cookies();

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
        Authorization: cookies.get("access_token"),
      },
    };

    fetch("/v1/product/" + id, requestOptions)
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

        if (data.result.stores) {
            if(cookies.get('store_id')){
                console.log("data.result.stores.:",data.result.stores);
                console.log("cookies.get('store_id'):",cookies.get('store_id'));
                 let stores1 = data.result.stores.filter((store)=>store.store_id==cookies.get('store_id'));
                 console.log("stores1:",stores1);
                if(stores1.length>0){
                    productStores= stores1;
                    setProductStores([...productStores]);
                }
            }
        } 

        setSelectedCategories(selectedCategories);

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
    let result = await fetch(
      "/v1/product-category?" + Select + queryString,
      requestOptions
    );
    let data = await result.json();

    setCategoryOptions(data.result);
  }

  let [stores, setStores] = useState([]);

  async function getAllStores() {
    console.log("fetching all stores");
    const requestOptions = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: cookies.get("access_token"),
      },
    };

    let Select = "select=id,name";
    let result = await fetch("/v1/store?" + Select, requestOptions);
    let data = await result.json();

    stores = data.result;
    setStores(data.result);
    productStores = [];
    for(let i=0; i<stores.length ;i++){
        if(cookies.get("store_id")&&cookies.get("store_id")==stores[i].id){
            productStores.push({
                store_id: stores[i].id,
                store_name: stores[i].name,
                purchase_unit_price: "",
                retail_unit_price: "",
                wholesale_unit_price: "",
                stock: "",
              });

        }else if(!cookies.get("store_id")){
            productStores.push({
                store_id: stores[i].id,
                store_name: stores[i].name,
                purchase_unit_price: "",
                retail_unit_price: "",
                wholesale_unit_price: "",
                stock: "",
              });
        }
       
    }

    setProductStores([...productStores]);
    console.log("productStores:",productStores);
  }

  async function suggestStores(searchTerm) {
    console.log("Inside handle suggest Stores");

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
    let result = await fetch(
      "/v1/store?" + Select + queryString,
      requestOptions
    );
    let data = await result.json();

    setStoreOptions(data.result);
  }

  useEffect(() => {
    let at = cookies.get("access_token");
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

    formData.category_id = [];
    for (var i = 0; i < selectedCategories.length; i++) {
      formData.category_id.push(selectedCategories[i].id);
    }

    console.log("productStores:",productStores);

   
    let storesData =[];
    for(let i=0;i<productStores.length;i++){
        storesData.push({
            "store_id": productStores[i].store_id,
            "store_name": productStores[i].store_name,
            "retail_unit_price": productStores[i].retail_unit_price?productStores[i].retail_unit_price:0,
            "wholesale_unit_price": productStores[i].wholesale_unit_price?productStores[i].wholesale_unit_price:0,
            "purchase_unit_price": productStores[i].purchase_unit_price?productStores[i].purchase_unit_price:0,
            "stock": productStores[i].stock?productStores[i].stock:0,
        });
    }

    formData.stores = storesData;

    if (cookies.get("store_id")) {
      formData.store_id = cookies.get("store_id");
    }

    console.log("Formdata:",formData);

    let endPoint = "/v1/product";
    let method = "POST";
    if (formData.id) {
      endPoint = "/v1/product/" + formData.id;
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

    setProcessing(true);
    fetch(endPoint, requestOptions)
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
        props.showToastMessage("Product Created Successfully!", "success");
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
        props.showToastMessage("Error Creating Product!", "danger");
      });
  }

  function isStockAddedToStore(storeID) {
    for (var i = 0; i < productStores.length; i++) {
      if (productStores[i].store_id === storeID) {
        return true;
      }
    }
    return false;
  }

  function findStockIndexByStoreID(storeID) {
    for (var i = 0; i < productStores.length; i++) {
      if (productStores[i].store_id === storeID) {
        return i;
      }
    }
    return -1;
  }

  function isUnitPriceAddedToStore(storeID) {
    for (var i = 0; i < productStores.length; i++) {
      if (productStores[i].store_id === storeID) {
        return true;
      }
    }
    return false;
  }

  function removeStock(productStore) {
    const index = productStores.indexOf(productStore);
    if (index > -1) {
      productStores.splice(index, 1);
    }
    setProductStores([...productStores]);
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
  function openStoreCreateForm() {
    StoreCreateFormRef.current.open();
  }

  const ProductCategoryCreateFormRef = useRef();
  function openProductCategoryCreateForm() {
    ProductCategoryCreateFormRef.current.open();
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
              {isProcessing
                ? (
                    <Spinner
                      as="span"
                      animation="border"
                      size="sm"
                      role="status"
                      aria-hidden={true}
                    />
                  ) + " Creating..."
                : ""}
              {formData.id ? "Update" : "Create"}
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
                {formData.name && !errors.name && (
                  <div style={{ color: "green" }}>
                    <i className="bi bi-check-lg"> </i>
                    Looks good!
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
                                {formData.ean_12 && !errors.ean_12 && (
                                    <div style={{ color: "green" }}>
                                        <i className="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div>
                                */}

            <div className="col-md-6">
              <label className="form-label">Name In Arabic (Optional)</label>

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
                {formData.name_in_arabic && !errors.name_in_arabic && (
                  <div style={{ color: "green" }}>
                    <i className="bi bi-check-lg"> </i>
                    Looks good!
                  </div>
                )}
              </div>
            </div>
            <div className="col-md-6">
              <label className="form-label">Part Number(Optional)</label>

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
                {formData.part_number && !errors.part_number && (
                  <div style={{ color: "green" }}>
                    <i className="bi bi-check-lg"> </i>
                    Looks good!
                  </div>
                )}
              </div>
            </div>

            <div className="col-md-6">
              <label className="form-label">Rack / Location (Optional)</label>

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
                    <i className="bi bi-x-lg"> </i>
                    {errors.rack}
                  </div>
                )}
                {formData.rack && !errors.rack && (
                  <div style={{ color: "green" }}>
                    <i className="bi bi-check-lg"> </i>
                    Looks good!
                  </div>
                )}
              </div>
            </div>

            <div className="col-md-6">
              <label className="form-label">Categories*</label>

              <div className="input-group mb-3">
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
                    <i className="bi bi-x-lg"> </i>
                    {errors.category_id}
                  </div>
                )}
                {formData.category_id && !errors.category_id && (
                  <div style={{ color: "green" }}>
                    <i className="bi bi-check-lg"> </i>
                    Looks good!
                  </div>
                )}
              </div>
            </div>

            <div className="col-md-2">
              <label className="form-label">Unit</label>
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
                <option value="Gm">Gm</option>
                <option value="L">Liter (L)</option>
                <option value="Gm">Gm</option>
                <option value="Mg">Mg</option>
              </select>
            </div>

            <h4>Unit Price & Stock</h4>
            <div className="table-responsive" style={{ overflowX: "auto" }}>
              <table className="table table-striped table-sm table-bordered">
                <thead>
                  <tr className="text-center">
                    {!cookies.get('store_id')?<th>Store Name</th>:""}
                    <th>Purchase Unit Price</th>
                    <th>Wholesale Unit Price</th>
                    <th>Retail Unit Price</th>
                    <th>Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {stores.map((store, index) => (
                    !cookies.get('store_id') || store.id==cookies.get('store_id')?<tr key={index} className="text-center">
                      {!cookies.get('store_id')?<td style={{ width: "150px" }}>{store.name}</td>:""}
                      <td style={{ width: "150px" }}>
                        <input
                          type="number"
                          value={
                            productStores[index]?.purchase_unit_price||productStores[index]?.purchase_unit_price==0
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
                            <i className="bi bi-x-lg"> </i>
                            {errors["purchase_unit_price_" + index]}
                          </div>
                        )}
                        {productStores[index]?.purchase_unit_price &&
                        !errors["purchase_unit_price_" + index] ? (
                          <div style={{ color: "green" }}>
                            <i className="bi bi-check-lg"> </i>
                            Looks good!
                          </div>
                        ) : null}
                      </td>
                      <td style={{ width: "150px" }}>
                        <input
                          type="number"
                          value={
                            productStores[index]?.wholesale_unit_price||productStores[index]?.wholesale_unit_price === 0
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
                            <i className="bi bi-x-lg"> </i>
                            {errors["wholesale_unit_price_" + index]}
                          </div>
                        )}
                        {productStores[index]?.wholesale_unit_price &&
                        !errors["wholesale_unit_price_" + index] ? (
                          <div style={{ color: "green" }}>
                            <i className="bi bi-check-lg"> </i>
                            Looks good!
                          </div>
                        ) : null}
                      </td>
                      <td style={{ width: "150px" }}>
                        <input
                          type="number"
                          value={
                            productStores[index]?.retail_unit_price||productStores[index]?.retail_unit_price===0
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

                            console.log("e.target.value:",e.target.value);

                            productStores[index].retail_unit_price = parseFloat(
                              e.target.value
                            );
                            console.log("productStores[index].retail_unit_price:",productStores[index].retail_unit_price);
                            setProductStores([...productStores]);
                          }}
                        />{" "}
                        {errors["retail_unit_price_" + index] && (
                          <div style={{ color: "red" }}>
                            <i className="bi bi-x-lg"> </i>
                            {errors["retail_unit_price_" + index]}
                          </div>
                        )}
                        {productStores[index]?.retail_unit_price &&
                        !errors["retail_unit_price_" + index] ? (
                          <div style={{ color: "green" }}>
                            <i className="bi bi-check-lg"> </i>
                            Looks good!
                          </div>
                        ) : null}
                      </td>

                      <td style={{ width: "150px" }}>
                        <input
                          value={productStores[index]?.stock || productStores[index]?.stock===0
                              ? productStores[index].stock
                              : ""
                          }
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
                        {productStores[index]?.stock &&
                        !errors["stock_" + index] ? (
                          <div style={{ color: "green" }}>
                            <i className="bi bi-check-lg"> </i>
                            Looks good!
                          </div>
                        ) : null}
                      </td>
                    </tr>:''
                  ))}
                </tbody>
              </table>
            </div>
          
            <div className="col-md-6">
              <label className="form-label">Image(Optional)</label>

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
                    <i className="bi bi-x-lg"> </i>
                    {errors.image}
                  </div>
                )}
                {formData.image && !errors.image && (
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
      </Modal>
    </>
  );
});

export default ProductCreate;
