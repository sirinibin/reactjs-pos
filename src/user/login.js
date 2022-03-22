
import avatar from './../avatar.jpg';
import React, { useState, useEffect } from "react";
import Footer from './../Footer.js';
import Cookies from 'universal-cookie';
import { useHistory } from "react-router-dom";

function Login() {

    const history = useHistory();
    const [errors, setErrors] = useState({});
    const [isProcessing, setProcessing] = useState(false);
    const cookies = new Cookies();

    useEffect(() => {
        let at = cookies.get("access_token");
        if (at) {
            // history.push("/dashboard/quotations");
            window.location = "/dashboard/sales";
        }
    });


    function me() {
        console.log("inside me");
        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': cookies.get('access_token'),
            },
        };

        fetch('/v1/me', requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();

                // check for error response
                if (!response.ok) {
                    const error = (data && data.errors);
                    return Promise.reject(error);
                }

                setErrors({});

                console.log("Response:");
                console.log(data);


                cookies.set('user_name', data.result.name, { path: '/', expires: new Date(Date.now() + (3600 * 1000 * 24 * 365)) });
                cookies.set('user_id', data.result.id, { path: '/', expires: new Date(Date.now() + (3600 * 1000 * 24 * 365)) });

                if (data.result.admin === true) {
                    cookies.set('admin', true, { path: '/', expires: new Date(Date.now() + (3600 * 1000 * 24 * 365)) });
                } else {
                    cookies.set('admin', false, { path: '/', expires: new Date(Date.now() + (3600 * 1000 * 24 * 365)) });
                }

                if (data.result.photo) {
                    cookies.set('user_photo', data.result.photo, { path: '/', expires: new Date(Date.now() + (3600 * 1000 * 24 * 365)) });
                }

                history.push("/dashboard/sales");
            })
            .catch(error => {
                setProcessing(false);
                setErrors(error);
            });
    }

    function getAccessToken(authCode) {
        console.log("inside access token");
        const requestOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authCode,
            },
        };

        fetch('/v1/accesstoken', requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();

                // check for error response
                if (!response.ok) {
                    const error = (data && data.errors);
                    return Promise.reject(error);
                }

                setErrors({});

                console.log("Response:");
                console.log(data);

                const cookies = new Cookies();
                var d = new Date(0); // The 0 there is the key, which sets the date to the epoch
                d.setUTCSeconds(data.result.expires_at);
                cookies.set('access_token', data.result.access_token, { path: '/', expires: d });
                me();
            })
            .catch(error => {
                setProcessing(false);
                setErrors(error);
            });
    }


    function handleSubmit(event) {
        console.log("Inside handle Submit");
        event.preventDefault();
        var data = {
            email: event.target[0].value,
            password: event.target[1].value,
        };

        const requestOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        };

        setProcessing(true);
        fetch('/v1/authorize', requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();

                // check for error response
                if (!response.ok) {
                    // get error message from body or default to response status
                    const error = (data && data.errors);
                    //const error = data.errors
                    return Promise.reject(error);
                }

                setErrors({});

                console.log("Response:");
                console.log(data);

                getAccessToken(data.result.code);
            })
            .catch(error => {
                setProcessing(false);
                console.log("Inside catch");
                console.log(error);
                setErrors(error);
                console.error('There was an error!', error);
            });


    }

    return (<>
        <div className="main">
            <main className="d-flex w-100" >

                <div className="container d-flex flex-column">
                    <div className="row vh-100">
                        <div className="col-sm-10 col-md-8 col-lg-6 mx-auto d-table h-100">
                            <div className="d-table-cell align-middle">
                                <div className="text-center mt-4">
                                    <h1 className="h2">Start POS</h1>
                                    <p className="lead">Sign in to your account to continue</p>
                                </div>

                                <div className="card">
                                    <div className="card-body">
                                        <div className="m-sm-4">
                                            <div className="text-center">
                                                <img
                                                    src={avatar}
                                                    alt="Charles Hall"
                                                    className="img-fluid rounded-circle"
                                                    width="132"
                                                    height="132"
                                                />
                                            </div>
                                            <form onSubmit={handleSubmit}>
                                                <div className="mb-3">
                                                    <label className="form-label">Email</label>
                                                    <input
                                                        className="form-control form-control-lg"
                                                        type="email"
                                                        name="email"
                                                        placeholder="Enter your email"
                                                    />
                                                    <span style={{ color: "red" }} >{errors.email}</span>
                                                </div>
                                                <div className="mb-3">
                                                    <label className="form-label">Password {isProcessing}</label>
                                                    <input
                                                        className="form-control form-control-lg"
                                                        type="password"
                                                        name="password"
                                                        placeholder="Enter your password"
                                                    />
                                                    <span style={{ color: "red" }} >{errors.password}</span>
                                                    {/*
                                                <small>
                                                    <a href="/"
                                                    >Forgot password?</a
                                                    >
                                                </small>
                                                */}
                                                </div>
                                                <div>
                                                    <label className="form-check">
                                                        {/*
                                                    <input
                                                        className="form-check-input"
                                                        type="checkbox"
                                                        value="remember-me"
                                                        name="remember-me"
                                                        checked
                                                        readOnly
                                                    />
                                                    <span className="form-check-label">
                                                        Remember me next time
                                                    </span> */}
                                                    </label>
                                                </div>
                                                <div className="text-center mt-3">

                                                    {isProcessing ?
                                                        <button className="btn btn-lg btn-primary" type="button" disabled>
                                                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden={true}></span>
                                                            Logging In...
                                                        </button> : null}

                                                    {!isProcessing ?
                                                        <button className="btn btn-lg btn-primary" type="submit">Login</button>
                                                        : null}

                                                </div>
                                            </form>
                                        </div>

                                    </div>

                                </div>
                                <Footer />
                            </div>

                        </div>

                    </div>

                </div>

            </main >  </div>   </>);
}

export default Login;