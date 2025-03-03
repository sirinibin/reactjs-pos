import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import Cookies from "universal-cookie";
import { Spinner } from "react-bootstrap";


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


                formData = {
                    id: userData.id,
                    name: userData.name,
                    email: userData.email,
                    mob: userData.mob,
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

    function handleCreate(event) {
        event.preventDefault();
        console.log("Inside handle Create");


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


    return (
        <>
            <Modal show={show} size="lg" onHide={handleClose} animation={false} backdrop="static" scrollable={true}>
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

                        <div className="col-md-6">
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
                                {formData.name && !errors.name && (
                                    <div style={{ color: "green" }}>
                                        <i className="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>


                            <Form.Check
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
                            />

                        </div>

                        <div className="col-md-6">
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
                                {formData.email && !errors.email && (
                                    <div style={{ color: "green" }}>
                                        <i className="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-md-6">
                            <label className="form-label">Password*</label>

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
                                    placeholder="Password"
                                />

                                {errors.password && (
                                    <div style={{ color: "red" }}>
                                        <i className="bi bi-x-lg"> </i>
                                        {errors.password}
                                    </div>
                                )}
                                {formData.password && !errors.password && (
                                    <div style={{ color: "green" }}>
                                        <i className="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-md-6">
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
                                {formData.mob && !errors.mob && (
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
