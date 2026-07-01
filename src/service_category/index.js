import React, { useState, useEffect, useRef } from "react";
import ServiceCategoryCreate from "./create.js";
import { format } from "date-fns";
import { Button, Spinner } from "react-bootstrap";
import ReactPaginate from "react-paginate";
import { confirm } from 'react-bootstrap-confirmation';

function ServiceCategoryIndex(props) {
    const [list, setList] = useState([]);
    let [pageSize, setPageSize] = useState(() => parseInt(localStorage.getItem('service_category_pageSize') || '10'));
    let [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(0);
    const [currentPageItemsCount, setCurrentPageItemsCount] = useState(0);
    const [offset, setOffset] = useState(0);
    const [isListLoading, setIsListLoading] = useState(false);
    const [searchParams, setSearchParams] = useState({});
    let sortField = "created_at";
    let sortDir = "-";
    const createFormRef = useRef();

    function ObjectToSearchQueryParams(object) {
        return Object.keys(object).map(key => `search[${key}]=${object[key]}`).join("&");
    }

    useEffect(() => {
        fetchList();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function fetchList() {
        setIsListLoading(true);
        const storeId = localStorage.getItem("store_id");
        let params = { ...searchParams, store_id: storeId || "" };
        let queryParams = ObjectToSearchQueryParams(params);
        let sortParam = `sort=${sortDir}${sortField}&page=${page}&limit=${pageSize}`;
        const headers = { 'Content-Type': 'application/json', Authorization: localStorage.getItem('access_token') };
        try {
            const r = await fetch(`/v1/service-category?${queryParams}&${sortParam}`, { method: 'GET', headers });
            const data = await r.json();
            if (r.ok && data.result) {
                setList(data.result);
                setTotalPages(data.criterias?.total_pages || 0);
                setTotalItems(data.total_count || 0);
                setCurrentPageItemsCount((data.result || []).length);
                setOffset((page - 1) * pageSize);
            }
        } catch (e) {}
        setIsListLoading(false);
    }

    function handleSearch(field, value) {
        const updated = { ...searchParams, [field]: value };
        setSearchParams(updated);
        page = 1;
        setPage(1);
    }

    async function handleDelete(id) {
        const confirmed = await confirm("Delete this service category?");
        if (!confirmed) return;
        const headers = { 'Content-Type': 'application/json', Authorization: localStorage.getItem('access_token') };
        const storeId = localStorage.getItem("store_id");
        await fetch(`/v1/service-category/${id}?search[store_id]=${storeId}`, { method: 'DELETE', headers });
        fetchList();
    }

    return (
        <div className="container-fluid">
            <div className="row mb-2">
                <div className="col">
                    <h1 className="h3 mb-0">Service Categories</h1>
                </div>
                <div className="col-auto">
                    <Button variant="primary" onClick={() => createFormRef.current?.open()}>
                        <i className="bi bi-plus-lg"></i> Create
                    </Button>
                </div>
            </div>

            <ServiceCategoryCreate ref={createFormRef} showToastMessage={props.showToastMessage} refreshList={fetchList} />

            <div className="row mb-2">
                <div className="col-md-3">
                    <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Search by name..."
                        onChange={(e) => { handleSearch('name', e.target.value); }}
                    />
                </div>
                <div className="col-auto">
                    <Button variant="outline-secondary" size="sm" onClick={fetchList}>
                        {isListLoading ? <Spinner as="span" animation="border" size="sm" /> : <i className="bi bi-search"></i>} Search
                    </Button>
                </div>
            </div>

            <div className="table-responsive">
                <table className="table table-hover table-sm">
                    <thead className="table-light">
                        <tr>
                            <th>#</th>
                            <th>Name</th>
                            <th>Parent Category</th>
                            <th>Created At</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isListLoading && (
                            <tr><td colSpan={5} className="text-center py-4"><Spinner animation="border" size="sm" /> Loading...</td></tr>
                        )}
                        {!isListLoading && list.length === 0 && (
                            <tr><td colSpan={5} className="text-center py-4 text-muted">No service categories found</td></tr>
                        )}
                        {list.map((item, i) => (
                            <tr key={item.id}>
                                <td>{offset + i + 1}</td>
                                <td>{item.name}</td>
                                <td>{item.parent_name || '—'}</td>
                                <td>{item.created_at ? format(new Date(item.created_at), 'dd/MM/yyyy') : '—'}</td>
                                <td>
                                    <button className="btn btn-sm btn-outline-primary me-1" onClick={() => createFormRef.current?.open(item.id)}>
                                        <i className="bi bi-pencil"></i>
                                    </button>
                                    <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(item.id)}>
                                        <i className="bi bi-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="d-flex justify-content-between align-items-center mt-2">
                    <small className="text-muted">
                        Showing {offset + 1}–{offset + currentPageItemsCount} of {totalItems}
                    </small>
                    <ReactPaginate
                        previousLabel="«"
                        nextLabel="»"
                        breakLabel="..."
                        pageCount={totalPages}
                        marginPagesDisplayed={1}
                        pageRangeDisplayed={3}
                        onPageChange={({ selected }) => { page = selected + 1; setPage(page); fetchList(); }}
                        containerClassName="pagination pagination-sm mb-0"
                        pageClassName="page-item"
                        pageLinkClassName="page-link"
                        previousClassName="page-item"
                        previousLinkClassName="page-link"
                        nextClassName="page-item"
                        nextLinkClassName="page-link"
                        activeClassName="active"
                        forcePage={page - 1}
                    />
                    <select className="form-select form-select-sm" style={{ width: 'auto' }}
                        value={pageSize}
                        onChange={(e) => { pageSize = parseInt(e.target.value); setPageSize(pageSize); localStorage.setItem('service_category_pageSize', pageSize); page = 1; setPage(1); fetchList(); }}>
                        {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n} / page</option>)}
                    </select>
                </div>
            )}
        </div>
    );
}

export default ServiceCategoryIndex;
