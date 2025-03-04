import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { Modal, Button } from "react-bootstrap";
import Cookies from "universal-cookie";
import { Spinner } from "react-bootstrap";
import { Typeahead } from "react-bootstrap-typeahead";


const UserCreate = forwardRef((props, ref) => {

    useImperativeHandle(ref, () => ({
        open(id) {
            formData = {};
            setFormData({});
            if (id) {
                getUser(id);
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


    let [errors, setErrors] = useState({});
    const [isProcessing, setProcessing] = useState(false);
    const cookies = new Cookies();

    //fields
    let [formData, setFormData] = useState({
        admin: false,
    });

    const [show, SetShow] = useState(false);

    function handleClose() {
        SetShow(false);
    }

    useEffect(() => {
        let at = cookies.get("access_token");
        if (!at) {
            window.location = "/";
        }
    });


    function getUser(id) {
        console.log("inside get User");
        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': cookies.get('access_token'),
            },
        };

        fetch('/v1/user/' + id, requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();

                // check for error response
                if (!response.ok) {
                    const error = (data && data.errors);
                    return Promise.reject(error);
                }

                setErrors({});


                let userData = data.result;
                console.log("Response:");
                console.log(userData);


                let storeIds = data.result.store_ids;
                let storeNames = data.result.store_names;


                selectedStores = [];
                if (storeIds && storeNames) {
                    for (var i = 0; i < storeIds.length; i++) {
                        selectedStores.push({
                            id: storeIds[i],
                            name: storeNames[i],
                        });
                    }
                }
                setSelectedStores(selectedStores);



                formData = {
                    id: userData.id,
                    name: userData.name,
                    email: userData.email,
                    mob: userData.mob,
                    role: userData.role,
                    log: "",
                };

                if (userData.admin === true) {
                    formData.admin = true;
                } else {
                    formData.admin = false;
                }
                console.log("From Server:", formData);
                setFormData({ ...formData });
            })
            .catch(error => {
                setProcessing(false);
                setErrors(error);
            });
    }

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


        formData.store_ids = [];

        for (var i = 0; i < selectedStores.length; i++) {
            formData.store_ids.push(selectedStores[i].id);
        }



        let endPoint = "/v1/user";
        let method = "POST";
        if (formData.id) {
            endPoint = "/v1/user/" + formData.id;
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

        console.log("sending formData:", formData);

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
                if (formData.id) {
                    props.showToastMessage("User updated successfully!", "success");
                } else {
                    props.showToastMessage("User created successfully!", "success");
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
                props.showToastMessage("Failed to process user!", "danger");
            });
    }


    let [selectedStores, setSelectedStores] = useState([]);
    let [storeOptions, setStoreOptions] = useState([]);

    async function suggestStores(searchTerm) {
        console.log("Inside handle suggest stores");

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

        let Select = "select=id,name,branch_name";
        let result = await fetch(
            "/v1/store?" + Select + queryString,
            requestOptions
        );
        let data = await result.json();
        console.log("data:", data);
        if (data.result) {
            for (var i = 0; i < data.result.length; i++) {
                data.result[i].name = data.result[i].name + " - " + data.result[i].branch_name;
            }
        }

        if (formData.id) {
            // data.result = data.result.filter(store => store.id !== formData.id);
        }

        let newStoreOptions = [];
        for (let i = 0; i < data.result.length; i++) {
            let storeSelected = false;
            for (var j = 0; j < selectedStores.length; j++) {
                if (data.result[i].id === selectedStores[j].id) {
                    storeSelected = true;
                    break
                }
            }
            if (!storeSelected) {
                newStoreOptions.push(data.result[i]);
            }
        }
        // data.result = data.result.filter(store => store.id !== selectedStores.id);
        setStoreOptions(newStoreOptions);
    }


    return (
        <>
            <Modal show={show} size="xl" onHide={handleClose} animation={false} backdrop="static" scrollable={true}>
                <Modal.Header>
                    <Modal.Title>
                        {formData.id ? "Update User #" + formData.name : "Create New User"}
                    </Modal.Title>

                    <div className="col align-self-end text-end">
                        {formData.id ? <Button variant="primary" onClick={() => {
                            handleClose();
                            props.openDetailsView(formData.id);
                        }}>
                            <i className="bi bi-eye"></i> View Detail
                        </Button> : ""}
                        &nbsp;&nbsp;
                        <Button variant="primary" onClick={handleCreate} >
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

                        <div className="col-md-3">
                            <label className="form-label">Name*</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.name ? formData.name : ""}
                                    type='text'
                                    onChange={(e) => {
                                        errors["name"] = "";
                                        setErrors({ ...errors });
                                        formData.name = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="name1"
                                    placeholder="Name"
                                />
                                {errors.name && (
                                    <div style={{ color: "red" }}>
                                        <i className="bi bi-x-lg"> </i>
                                        {errors.name}
                                    </div>
                                )}
                            </div>


                            {/*<Form.Check
                                type="switch"
                                as="input"
                                id="admin"
                                label="Admin"
                                value={formData.admin}
                                checked={formData.admin === true ? "checked" : ""}
                                onChange={(e) => {
                                    formData.admin = !formData.admin;
                                    console.log("formData.admin:", formData.admin);
                                    setFormData({ ...formData });
                                }}
                            />*/}
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">Email*</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.email ? formData.email : ""}
                                    type='text'
                                    onChange={(e) => {
                                        errors["email"] = "";

                                        formData.email = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="email1"
                                    placeholder="Email"
                                />

                                {errors.email && (
                                    <div style={{ color: "red" }}>
                                        <i className="bi bi-x-lg"> </i>
                                        {errors.email}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">Password{!formData.id ? "*" : ""}</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.password ? formData.password : ""}
                                    type='password'
                                    onChange={(e) => {
                                        errors["password"] = "";

                                        formData.password = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="password1"
                                    placeholder={formData.id ? "Change password" : "Password"}
                                />

                                {errors.password && (
                                    <div style={{ color: "red" }}>
                                        <i className="bi bi-x-lg"> </i>
                                        {errors.password}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">Mob*</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.mob ? formData.mob : ""}
                                    type='text'
                                    onChange={(e) => {
                                        errors["mob"] = "";
                                        setErrors({ ...errors });
                                        formData.mob = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="mob1"
                                    placeholder="Mob"
                                />
                                {errors.mob && (
                                    <div style={{ color: "red" }}>
                                        <i className="bi bi-x-lg"> </i>
                                        {errors.mob}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Role*</label>
                            <div className="input-group mb-3">
                                <select
                                    value={formData.role}
                                    onChange={(e) => {

                                        if (!e.target.value) {
                                            formData.role = "";
                                            errors["role"] = "Invalid role";
                                            setErrors({ ...errors });
                                            return;
                                        }

                                        errors["role"] = "";
                                        setErrors({ ...errors });

                                        formData.role = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                >
                                    <option value="Manager" SELECTED>Manager</option>
                                    <option value="SalesMan" >Sales Man</option>
                                    <option value="Admin" >Admin</option>
                                </select>
                            </div>
                            {errors.role && (
                                <div style={{ color: "red" }}>
                                    {errors.role}
                                </div>
                            )}
                        </div>

                        <div className="col-md-6">
                            <label className="form-label">Stores</label>

                            <div className="input-group mb-3">
                                <Typeahead
                                    id="store_ids"
                                    labelKey="name"
                                    isInvalid={errors.store_ids ? true : false}
                                    onChange={(selectedItems) => {
                                        errors.store_ids = "";
                                        setErrors(errors);
                                        if (selectedItems.length === 0) {
                                            // errors.use_products_from_store_id = "Invalid store selected";
                                            //setErrors(errors);
                                            //setFormData({ ...formData });
                                            setSelectedStores([]);
                                            return;
                                        }
                                        //setFormData({ ...formData });
                                        console.log("selectedItems", selectedItems);
                                        setSelectedStores(selectedItems);
                                    }}
                                    options={storeOptions}
                                    placeholder="Select Stores"
                                    selected={selectedStores}
                                    highlightOnlyResult={true}
                                    onInputChange={(searchTerm, e) => {
                                        suggestStores(searchTerm);
                                    }}
                                    multiple
                                />


                            </div>
                            {errors.store_ids && (
                                <div style={{ color: "red" }}>

                                    {errors.store_ids}
                                </div>
                            )}
                        </div>

                        <Modal.Footer>
                            <Button variant="secondary" onClick={handleClose}>
                                Close
                            </Button>
                            <Button variant="primary" type="submit" >
                                {isProcessing ?
                                    <Spinner
                                        as="span"
                                        animation="buser"
                                        size="sm"
                                        role="status"
                                        aria-hidden={true}
                                    />

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

export default UserCreate;
