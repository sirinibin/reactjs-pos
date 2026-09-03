import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { Modal, Spinner, Button } from "react-bootstrap";
import VendorCategoryCreate from "./create.js";
import { ObjectToSearchQueryParams } from '../utils/queryUtils.js';

const VendorCategoryIndex = forwardRef((props, ref) => {

    useImperativeHandle(ref, () => ({
        open() {
            list();
            SetShow(true);
        },
    }));

    const [show, SetShow] = useState(false);
    function handleClose() { SetShow(false); }

    const [categoryList, setCategoryList] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [searchName, setSearchName] = useState("");
    const [deletingId, setDeletingId] = useState(null);

    const CreateFormRef = useRef();

    function openCreateForm(id) {
        CreateFormRef.current.open(id || undefined);
    }

    function list(nameFilter) {
        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: localStorage.getItem("access_token"),
            },
        };

        let params = { limit: 200, sort: "name" };
        if (localStorage.getItem("store_id")) {
            params.store_id = localStorage.getItem("store_id");
        }
        if (nameFilter !== undefined ? nameFilter : searchName) {
            params.name = nameFilter !== undefined ? nameFilter : searchName;
        }

        let Select = "select=id,name,created_by_name,created_at";
        let queryParams = ObjectToSearchQueryParams(params);
        if (queryParams) queryParams = "&" + queryParams;

        setIsLoading(true);
        fetch("/v1/vendor-category?" + Select + queryParams, requestOptions)
            .then(async (response) => {
                const isJson = response.headers.get("content-type")?.includes("application/json");
                const data = isJson && (await response.json());
                if (!response.ok) { return Promise.reject(data && data.errors); }
                setCategoryList(data.result || []);
                setIsLoading(false);
                setIsRefreshing(false);
            })
            .catch(() => {
                setIsLoading(false);
                setIsRefreshing(false);
            });
    }

    function deleteCategory(id) {
        if (!window.confirm("Delete this category?")) return;
        setDeletingId(id);

        let searchParams = {};
        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
        }
        let queryParams = ObjectToSearchQueryParams(searchParams);

        fetch("/v1/vendor-category/" + id + "?" + queryParams, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                Authorization: localStorage.getItem("access_token"),
            },
        })
            .then(async (response) => {
                const isJson = response.headers.get("content-type")?.includes("application/json");
                const data = isJson && (await response.json());
                if (!response.ok) { return Promise.reject(data && data.errors); }
                setDeletingId(null);
                list();
                if (props.showToastMessage) props.showToastMessage("Category deleted successfully!", "success");
            })
            .catch(() => {
                setDeletingId(null);
                if (props.showToastMessage) props.showToastMessage("Failed to delete category!", "danger");
            });
    }

    const CELL = { padding: '10px 14px', fontFamily: '"Inter", sans-serif', fontSize: '13px', color: '#191c1e', verticalAlign: 'middle', borderBottom: '1px solid #e2e8f0' };
    const TH = { padding: '10px 14px', fontFamily: '"Inter", sans-serif', fontSize: '11px', fontWeight: 700, color: '#434655', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#f2f4f6', borderBottom: '2px solid #c3c6d7' };

    return (
        <>
            <VendorCategoryCreate
                ref={CreateFormRef}
                refreshList={() => list()}
                showToastMessage={props.showToastMessage}
            />

            <Modal show={show} size="lg" onHide={handleClose} animation={false} backdrop="static" scrollable>
                <Modal.Header style={{ background: '#ffffff', borderBottom: '1px solid #c3c6d7', padding: '14px 20px' }}>
                    <Modal.Title style={{ fontFamily: '"Hanken Grotesk", sans-serif', fontSize: '17px', fontWeight: 700, color: '#191c1e', flex: 1 }}>
                        Vendor Categories
                    </Modal.Title>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                            type="button"
                            style={{ background: '#004ac6', color: '#fff', border: 'none', borderRadius: '4px', padding: '6px 14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            onClick={() => openCreateForm()}
                        >
                            <i className="bi bi-plus-lg"></i> New Category
                        </button>
                        <button type="button" className="btn-close ms-1" onClick={handleClose} aria-label="Close" />
                    </div>
                </Modal.Header>

                <Modal.Body style={{ padding: '16px 20px', background: '#f7f9fb', minHeight: '300px' }}>
                    {/* Search bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                        <input
                            type="text"
                            placeholder="Search categories..."
                            value={searchName}
                            onChange={(e) => {
                                setSearchName(e.target.value);
                                list(e.target.value);
                            }}
                            style={{ border: '1px solid #c3c6d7', borderRadius: '4px', padding: '7px 12px', fontSize: '13px', fontFamily: '"Inter", sans-serif', width: '100%', outline: 'none', color: '#191c1e', background: '#fff' }}
                        />
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={() => { setIsRefreshing(true); list(); }}
                            disabled={isRefreshing}
                            style={{ flexShrink: 0 }}
                        >
                            {isRefreshing ? <Spinner as="span" animation="border" size="sm" /> : <i className="fa fa-refresh"></i>}
                        </Button>
                    </div>

                    {isLoading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                            <Spinner animation="grow" variant="primary" />
                        </div>
                    ) : categoryList.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', fontFamily: '"Inter", sans-serif', fontSize: '14px', color: '#737686' }}>
                            No categories found.{' '}
                            <span
                                style={{ color: '#004ac6', cursor: 'pointer', textDecoration: 'underline' }}
                                onClick={() => openCreateForm()}
                            >Create one</span>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#fff' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr>
                                        <th style={TH}>Name</th>
                                        <th style={TH}>Created By</th>
                                        <th style={{ ...TH, textAlign: 'center', width: '120px' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {categoryList.map((cat) => (
                                        <tr key={cat.id}>
                                            <td style={CELL}>
                                                <span style={{ fontWeight: 600 }}>{cat.name}</span>
                                            </td>
                                            <td style={{ ...CELL, color: '#737686' }}>{cat.created_by_name || '—'}</td>
                                            <td style={{ ...CELL, textAlign: 'center' }}>
                                                <div style={{ display: 'inline-flex', gap: '6px' }}>
                                                    <button
                                                        type="button"
                                                        title="Edit"
                                                        onClick={() => openCreateForm(cat.id)}
                                                        style={{ background: '#e8f0fe', color: '#004ac6', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '13px' }}
                                                    >
                                                        <i className="bi bi-pencil"></i>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        title="Delete"
                                                        onClick={() => deleteCategory(cat.id)}
                                                        disabled={deletingId === cat.id}
                                                        style={{ background: '#fde8e8', color: '#ba1a1a', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '13px' }}
                                                    >
                                                        {deletingId === cat.id
                                                            ? <Spinner as="span" animation="border" size="sm" />
                                                            : <i className="bi bi-trash3"></i>}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Modal.Body>

                <Modal.Footer style={{ background: '#ffffff', borderTop: '1px solid #c3c6d7', padding: '10px 20px' }}>
                    <button
                        type="button"
                        onClick={handleClose}
                        style={{ backgroundColor: '#d0e1fb', color: '#54647a', border: 'none', borderRadius: '4px', padding: '8px 20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                    >
                        Close
                    </button>
                </Modal.Footer>
            </Modal>
        </>
    );
});

export default VendorCategoryIndex;
