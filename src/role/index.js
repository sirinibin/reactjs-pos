import React, { useState, useEffect, useRef } from "react";
import UserRoleCreate from "./create.js";
import UserRoleView from "./view.js";
import { Button, Spinner } from "react-bootstrap";
import { ObjectToSearchQueryParams } from '../utils/queryUtils.js';
import PaginationControls from '../utils/PaginationControls.js';

function UserRoleIndex(props) {
    const [roleList, setRoleList] = useState([]);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(0);
    const [isListLoading, setIsListLoading] = useState(false);
    const [searchName, setSearchName] = useState("");
    const [authorized, setAuthorized] = useState(null); // null=checking, true=ok, false=denied

    const createRef = useRef();
    const viewRef = useRef();

    useEffect(() => {
        // RouteGuard in Dashboard.js handles RBAC permission check.
        // Only need to verify the RBAC module itself is enabled for this store.
        const isAdmin = localStorage.getItem("user_role") === "Admin";
        if (isAdmin) { setAuthorized(true); return; }
        const storeSettings = (() => {
            try { return JSON.parse(localStorage.getItem("_store_settings_cache") || "null"); }
            catch (_) { return null; }
        })();
        if (!storeSettings?.enable_rbac_module) {
            window.location = "/dashboard/business-dashboard";
            return;
        }
        setAuthorized(true);
    }, []);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { if (authorized) list(); }, [page, authorized]);

    async function list() {
        setIsListLoading(true);

        const storeId = localStorage.getItem("store_id");
        const searchParams = { store_id: storeId };
        if (searchName) searchParams["name"] = searchName;
        const qs = ObjectToSearchQueryParams(searchParams) + `&page=${page}&page_size=${pageSize}`;

        const res = await fetch("/v1/user-role?" + qs, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: localStorage.getItem("access_token"),
            },
        }).then(r => r.json()).catch(() => ({}));

        setIsListLoading(false);
        if (res?.result) {
            setRoleList(res.result);
            setTotalItems(res.total_count || 0);
            setTotalPages(Math.ceil((res.total_count || 0) / pageSize));
        }
    }

    function handleSearch(e) {
        e.preventDefault();
        setPage(1);
        list();
    }

    async function handleDelete(id) {
        if (!window.confirm("Delete this role?")) return;
        const storeId = localStorage.getItem("store_id");
        const res = await fetch("/v1/user-role/" + id + "?search[store_id]=" + storeId, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                Authorization: localStorage.getItem("access_token"),
            },
        }).then(r => r.json()).catch(() => ({}));

        if (!res.status) {
            const msg = res.errors?.delete || "Failed to delete role";
            if (props.showToastMessage) props.showToastMessage(msg, "danger");
            else alert(msg);
            return;
        }
        if (props.showToastMessage) props.showToastMessage("Role deleted", "success");
        list();
    }

    if (authorized === null) {
        return <div className="text-center py-5"><Spinner animation="border" /></div>;
    }

    return (
        <div style={{ padding: "16px" }}>
            <UserRoleCreate ref={createRef} refreshList={list} showToastMessage={props.showToastMessage} openDetailsView={id => viewRef.current?.open(id)} />
            <UserRoleView ref={viewRef} refreshList={list} showToastMessage={props.showToastMessage} openCreateView={id => createRef.current?.open(id)} />

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
                <h4 style={{ margin: 0, fontFamily: '"Hanken Grotesk", sans-serif', fontWeight: 700 }}>User Roles</h4>
                <Button size="sm" style={{ background: "#004ac6", border: "none" }} onClick={() => createRef.current?.open()}>
                    <i className="bi bi-plus-lg me-1" /> New Role
                </Button>
            </div>

            <form onSubmit={handleSearch} style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
                <input
                    className="form-control form-control-sm"
                    placeholder="Search by name..."
                    value={searchName}
                    onChange={e => setSearchName(e.target.value)}
                    style={{ flex: "1 1 180px", minWidth: "0" }}
                />
                <Button type="submit" size="sm" variant="outline-secondary">Search</Button>
                {searchName && <Button size="sm" variant="outline-danger" onClick={() => { setSearchName(""); setPage(1); setTimeout(list, 0); }}>Clear</Button>}
            </form>

            {isListLoading ? (
                <div className="text-center py-4"><Spinner animation="border" size="sm" /></div>
            ) : (
                <div style={{ overflowX: "auto" }}>
                    <table className="table table-hover table-sm" style={{ fontSize: "13px", fontFamily: '"Inter", sans-serif' }}>
                        <thead style={{ background: "#f2f4f6" }}>
                            <tr>
                                <th>#</th>
                                <th>Role Name</th>
                                <th>Permissions</th>
                                <th>Created By</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {roleList.length === 0 ? (
                                <tr><td colSpan={5} className="text-center text-muted py-4">No roles found</td></tr>
                            ) : roleList.map((role, idx) => (
                                <tr key={role.id}>
                                    <td>{(page - 1) * pageSize + idx + 1}</td>
                                    <td>
                                        <button style={{ background: "none", border: "none", color: "#004ac6", fontWeight: 600, cursor: "pointer", padding: 0 }}
                                            onClick={() => viewRef.current?.open(role.id)}>
                                            {role.name}
                                        </button>
                                    </td>
                                    <td>
                                        <span style={{ fontSize: "12px", color: "#555" }}>
                                            {role.permissions?.length || 0} resource{role.permissions?.length !== 1 ? "s" : ""}
                                        </span>
                                    </td>
                                    <td>{role.created_by_name || "—"}</td>
                                    <td style={{ display: "flex", gap: "6px" }}>
                                        <button className="btn btn-sm btn-outline-primary py-0 px-2" onClick={() => createRef.current?.open(role.id)}>
                                            <i className="bi bi-pencil" />
                                        </button>
                                        <button className="btn btn-sm btn-outline-danger py-0 px-2" onClick={() => handleDelete(role.id)}>
                                            <i className="bi bi-trash" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <PaginationControls
                page={page}
                totalPages={totalPages}
                totalItems={totalItems}
                pageSize={pageSize}
                currentPageItemsCount={roleList.length}
                onPageChange={setPage}
            />
        </div>
    );
}

export default UserRoleIndex;
