import React, { useState, forwardRef, useImperativeHandle } from "react";
import { Modal, Table, Button } from 'react-bootstrap';
import Cookies from "universal-cookie";

const UserView = forwardRef((props, ref) => {

    useImperativeHandle(ref, () => ({
        open(id) {
            if (id) {
                getUser(id);
                SetShow(true);
            }
        },
    }));

    let [model, setModel] = useState({});
    const cookies = new Cookies();

    const [show, SetShow] = useState(false);

    function handleClose() {
        SetShow(false);
    };

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

                console.log("Response:");
                console.log(data);

                model = data.result;
                setModel({ ...model });
            })
            .catch(error => {
                // handle error
            });
    }

    // Function to format battery level as a percentage
    const formatBattery = (battery) => {
        return battery !== 'N/A' ? `${(parseFloat(battery) * 100).toFixed(0)}%` : 'Unknown';
    };

    return (
        <>
            <Modal show={show} size="lg" onHide={handleClose} animation={false} scrollable={true}>
                <Modal.Header>
                    <Modal.Title>Details of User #{model.name} </Modal.Title>

                    <div className="col align-self-end text-end">
                        {props.openCreateForm ? <Button variant="primary" onClick={() => {
                            handleClose();
                            props.openCreateForm();
                        }}>
                            <i className="bi bi-plus"></i> Create
                        </Button> : ""}
                        &nbsp;&nbsp;
                        {props.openUpdateForm ? <Button variant="primary" onClick={() => {
                            handleClose();
                            props.openUpdateForm(model.id);
                        }}>
                            <i className="bi bi-pencil"></i> Edit
                        </Button> : ""}
                        <button
                            type="button"
                            className="btn-close"
                            onClick={handleClose}
                            aria-label="Close"
                        ></button>
                    </div>
                </Modal.Header>
                <Modal.Body>
                    <Table striped bordered hover responsive="lg">
                        <tbody>
                            <tr>
                                <th>Name:</th><td> {model.name}</td>
                                <th>Role:</th><td> {model.role}</td>
                                <th>Admin:</th><td> {model.admin ? 'Yes' : 'No'}</td>
                                <th>E-mail:</th><td> {model.email}</td>
                            </tr>
                            <tr>
                                <th>Mob:</th><td> {model.mob}</td>
                                <th>Password:</th><td> ***********</td>
                            </tr>
                            <tr>
                                <th>Created At:</th><td> {model.created_at}</td>
                                <th>Updated At:</th><td> {model.updated_at}</td>
                            </tr>
                            <tr>
                                <th>Created By:</th><td> {model.created_by_name}</td>
                                <th>Updated By:</th><td> {model.updated_by_name}</td>
                            </tr>
                        </tbody>
                    </Table>

                    {/* Devices Table */}
                    <h5>User Devices</h5>
                    {model.devices && Object.keys(model.devices).length > 0 ? (
                        <Table striped bordered hover responsive="lg">
                            <thead>
                                <tr>
                                    <th>Device ID</th>
                                    <th>Device Type</th>
                                    <th>Platform</th>
                                    <th>Screen Resolution</th>
                                    <th>Touch</th>
                                    <th>Battery Level</th>
                                    <th>Connected</th>
                                    <th>Last Connected</th>
                                    <th>IP Address</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.keys(model.devices).map((deviceKey) => {
                                    const device = model.devices[deviceKey];
                                    return (
                                        <tr key={device.device_id}>
                                            <td>{device.device_id}</td>
                                            <td>{device.device_type}</td>
                                            <td>{device.platform}</td>
                                            <td>{device.screen_width} x {device.screen_height}</td>
                                            <td>{device.touch ? 'Yes' : 'No'}</td>
                                            <td>{formatBattery(device.battery)}</td>
                                            <td>{device.connected ? 'Yes' : 'No'}</td>
                                            <td>{device.last_connected_at ? new Date(device.last_connected_at).toLocaleString() : 'N/A'}</td>
                                            <td>{device.ip_address || 'N/A'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </Table>
                    ) : (
                        <p>No devices available for this user.</p>
                    )}
                </Modal.Body>
            </Modal>
        </>
    );
});

export default UserView;
