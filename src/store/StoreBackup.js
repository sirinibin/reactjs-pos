import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef } from "react";
import { Modal, Button, Spinner, ProgressBar, Table } from "react-bootstrap";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes) {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function formatDuration(seconds) {
    if (seconds == null || seconds < 0) return "";
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s < 10 ? "0" : ""}${s}s`;
}

const STATUS_VARIANT = { pending: "secondary", running: "info", done: "success", error: "danger" };

const STEP_ICON = {
    pending: <i className="bi bi-circle text-muted" style={{ fontSize: 13 }}></i>,
    done:    <i className="bi bi-check-circle-fill text-success" style={{ fontSize: 13 }}></i>,
    error:   <i className="bi bi-x-circle-fill text-danger" style={{ fontSize: 13 }}></i>,
};

// ── Component ─────────────────────────────────────────────────────────────────

const StoreBackup = forwardRef((props, ref) => {
    const [show, setShow] = useState(false);
    const [store, setStore] = useState(null);

    // Size breakdown
    const [sizeData, setSizeData] = useState(null);
    const [sizeError, setSizeError] = useState("");
    const [loadingSize, setLoadingSize] = useState(false);

    // Backup progress
    const [downloading, setDownloading] = useState(false);
    const [steps, setSteps] = useState([]);
    const [overallProgress, setOverallProgress] = useState(0);
    const [backupDone, setBackupDone] = useState(false);
    const [backupError, setBackupError] = useState("");

    // Timing
    const [elapsed, setElapsed] = useState(0);           // seconds since backup started
    const [stepTimings, setStepTimings] = useState({});  // { stepId: { started, ended } }
    const startTimeRef  = useRef(null);
    const timerRef      = useRef(null);
    const stepTimingsRef = useRef({});

    const pollRef = useRef(null);

    // ── Track per-step start / end times ────────────────────────────────────
    useEffect(() => {
        if (!steps.length) return;
        const now = Date.now();
        setStepTimings(prev => {
            const next = { ...prev };
            steps.forEach(step => {
                if (step.status === "running" && !next[step.id]?.started) {
                    next[step.id] = { started: now };
                } else if (
                    (step.status === "done" || step.status === "error") &&
                    next[step.id]?.started && !next[step.id]?.ended
                ) {
                    next[step.id] = { ...next[step.id], ended: now };
                }
            });
            stepTimingsRef.current = next;
            return next;
        });
    }, [steps]);

    // ── Expose open() ────────────────────────────────────────────────────────
    useImperativeHandle(ref, () => ({
        open(storeData) {
            resetState();
            setStore(storeData);
            setShow(true);
            fetchSize(storeData.id);
        },
    }));

    function resetState() {
        setSizeData(null);
        setSizeError("");
        setSteps([]);
        setOverallProgress(0);
        setBackupDone(false);
        setBackupError("");
        setDownloading(false);
        setElapsed(0);
        setStepTimings({});
        stepTimingsRef.current = {};
        startTimeRef.current = null;
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        if (pollRef.current)  { clearInterval(pollRef.current);  pollRef.current = null; }
    }

    function handleClose() {
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        if (pollRef.current)  { clearInterval(pollRef.current);  pollRef.current = null; }
        setShow(false);
    }

    // ── Size fetch ───────────────────────────────────────────────────────────
    function fetchSize(storeId) {
        setLoadingSize(true);
        setSizeError("");
        fetch(`/v1/store/${storeId}/backup/size`, {
            headers: { Authorization: localStorage.getItem("access_token") },
        })
            .then(r => r.json())
            .then(data => {
                setLoadingSize(false);
                if (data.status) setSizeData(data.result);
                else setSizeError("Could not calculate size");
            })
            .catch(() => { setLoadingSize(false); setSizeError("Could not calculate size"); });
    }

    // ── Start backup ─────────────────────────────────────────────────────────
    function startDownload() {
        if (!store) return;
        setDownloading(true);
        setBackupDone(false);
        setBackupError("");
        setSteps([]);
        setOverallProgress(0);
        setElapsed(0);
        setStepTimings({});
        stepTimingsRef.current = {};

        // Start elapsed timer
        startTimeRef.current = Date.now();
        timerRef.current = setInterval(() => {
            setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }, 1000);

        fetch(`/v1/store/${store.id}/backup/start`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: localStorage.getItem("access_token"),
            },
        })
            .then(r => r.json())
            .then(data => {
                if (!data.status) {
                    stopTimer();
                    setBackupError(
                        data.errors ? Object.values(data.errors).join(", ") : "Failed to start backup"
                    );
                    setDownloading(false);
                    return;
                }
                subscribeProgress(store.id, data.result.job_id);
            })
            .catch(err => {
                stopTimer();
                setBackupError(err.message);
                setDownloading(false);
            });
    }

    function stopTimer() {
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }

    // ── Polling progress (500 ms) ─────────────────────────────────────────────
    function subscribeProgress(storeId, jobId) {
        async function poll() {
            try {
                const res = await fetch(
                    `/v1/store/${storeId}/backup/progress?job_id=${jobId}`,
                    { headers: { Authorization: localStorage.getItem("access_token") } }
                );
                const data = await res.json();

                if (!data.status) {
                    clearInterval(pollRef.current); pollRef.current = null;
                    stopTimer();
                    setBackupError(
                        data.errors ? Object.values(data.errors).join(", ") : "Failed to get progress"
                    );
                    setDownloading(false);
                    return;
                }

                const progress = data.result;
                setSteps(progress.steps || []);
                setOverallProgress(progress.overall_progress || 0);

                if (progress.done) {
                    clearInterval(pollRef.current); pollRef.current = null;
                    stopTimer();
                    setDownloading(false);
                    setBackupDone(true);
                    if (progress.error) {
                        setBackupError(progress.error);
                    } else if (progress.file_token) {
                        triggerFileDownload(storeId, progress.file_token);
                    }
                }
            } catch (err) {
                clearInterval(pollRef.current); pollRef.current = null;
                stopTimer();
                setBackupError("Failed to get progress: " + err.message);
                setDownloading(false);
            }
        }

        poll(); // immediate first hit
        pollRef.current = setInterval(poll, 500);
    }

    // ── File download trigger ─────────────────────────────────────────────────
    // Use a direct <a> link so the browser streams the file straight to disk
    // instead of buffering the whole thing in memory first (critical for large files).
    function triggerFileDownload(storeId, token) {
        const authToken = encodeURIComponent(localStorage.getItem("access_token") || "");
        const url = `/v1/store/${storeId}/backup/file?job_id=${token}&access_token=${authToken}`;
        const a = document.createElement("a");
        a.href = url;
        // Leave `download` empty — the browser uses the Content-Disposition
        // filename from the server (backup_<storeId>_<datetime>.zip)
        a.download = "";
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    // ── Derived timing values ─────────────────────────────────────────────────
    const eta = (downloading && overallProgress > 5 && elapsed > 0)
        ? Math.max(0, Math.round(elapsed / (overallProgress / 100) - elapsed))
        : null;

    const activeStep = steps.find(s => s.status === "running");

    function stepElapsed(stepId) {
        const t = stepTimings[stepId];
        if (!t) return null;
        if (t.ended) return Math.round((t.ended - t.started) / 1000);
        if (downloading) return Math.round((Date.now() - t.started) / 1000);
        return null;
    }

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <Modal show={show} onHide={handleClose} size="lg" backdrop="static" keyboard={false}>
            <Modal.Header closeButton>
                <Modal.Title>
                    <i className="bi bi-archive me-2"></i>
                    Backup Store — {store?.name}
                </Modal.Title>
            </Modal.Header>

            <Modal.Body>

                {/* ── Size breakdown ──────────────────────────────────────── */}
                {loadingSize && (
                    <div className="text-center py-3 text-muted">
                        <Spinner animation="border" size="sm" className="me-2" />
                        Calculating backup size…
                    </div>
                )}

                {sizeError && (
                    <div className="alert alert-warning py-2">
                        <i className="bi bi-exclamation-triangle me-2"></i>{sizeError}
                    </div>
                )}

                {sizeData && !loadingSize && (
                    <div className="mb-4">
                        <h6 className="fw-semibold mb-2">
                            <i className="bi bi-pie-chart me-2"></i>Backup Size Breakdown
                        </h6>
                        <Table size="sm" bordered className="mb-0">
                            <tbody>
                                <tr>
                                    <td>
                                        <i className="bi bi-database me-2 text-primary"></i>
                                        MongoDB — <code>store_{store?.id}</code>
                                    </td>
                                    <td className="text-end fw-semibold" style={{ width: 120 }}>
                                        {formatBytes(sizeData.mongodb_store_db)}
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <i className="bi bi-file-earmark-code me-2 text-primary"></i>
                                        MongoDB — store document (main DB)
                                    </td>
                                    <td className="text-end fw-semibold">
                                        {formatBytes(sizeData.mongodb_store_doc)}
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <i className="bi bi-people me-2 text-primary"></i>
                                        MongoDB — users assigned to this store (main DB)
                                    </td>
                                    <td className="text-end fw-semibold">
                                        {formatBytes(sizeData.mongodb_users)}
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <i className="bi bi-images me-2 text-success"></i>
                                        <code>images/{store?.id}</code>
                                    </td>
                                    <td className="text-end fw-semibold">
                                        {formatBytes(sizeData.images_size)}
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <i className="bi bi-file-zip me-2 text-warning"></i>
                                        <code>zatca/{store?.id}</code>
                                    </td>
                                    <td className="text-end fw-semibold">
                                        {formatBytes(sizeData.zatca_size)}
                                    </td>
                                </tr>
                                <tr className="table-primary">
                                    <td className="fw-bold">
                                        <i className="bi bi-hdd me-2"></i>Total Estimated Size
                                    </td>
                                    <td className="text-end fw-bold">
                                        {formatBytes(sizeData.total_size)}
                                    </td>
                                </tr>
                            </tbody>
                        </Table>
                    </div>
                )}

                {/* ── Progress panel ──────────────────────────────────────── */}
                {(downloading || backupDone || (steps.length > 0)) && (
                    <div className="mb-3">
                        <h6 className="fw-semibold mb-3">
                            <i className="bi bi-list-check me-2"></i>Backup Progress
                        </h6>

                        {/* Timer + ETA bar */}
                        {(downloading || backupDone) && (
                            <div
                                className="d-flex justify-content-between align-items-center rounded px-3 py-2 mb-3"
                                style={{ background: "#f8f9fa", border: "1px solid #dee2e6" }}
                            >
                                <span style={{ fontSize: "0.9em" }}>
                                    <i className="bi bi-stopwatch me-1 text-secondary"></i>
                                    <strong>Elapsed:</strong>{" "}
                                    <span className="font-monospace">
                                        {formatDuration(elapsed)}
                                    </span>
                                </span>

                                {eta != null && !backupDone && (
                                    <span style={{ fontSize: "0.9em" }}>
                                        <i className="bi bi-hourglass-split me-1 text-secondary"></i>
                                        <strong>ETA:</strong>{" "}
                                        <span className="font-monospace">~{formatDuration(eta)}</span>
                                    </span>
                                )}

                                {backupDone && !backupError && (
                                    <span className="text-success" style={{ fontSize: "0.9em" }}>
                                        <i className="bi bi-check-circle-fill me-1"></i>
                                        Completed in {formatDuration(elapsed)}
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Active step spotlight */}
                        {activeStep && (
                            <div
                                className="rounded px-3 py-2 mb-3"
                                style={{
                                    background: "linear-gradient(90deg,#e8f4ff,#f0f8ff)",
                                    border: "1px solid #90caf9",
                                }}
                            >
                                <div className="d-flex align-items-center gap-2 mb-1">
                                    <Spinner animation="border" size="sm" variant="primary"
                                        style={{ width: 14, height: 14 }} />
                                    <strong style={{ fontSize: "0.9em" }}>{activeStep.name}</strong>
                                    <span className="text-muted ms-auto font-monospace" style={{ fontSize: "0.8em" }}>
                                        {formatDuration(stepElapsed(activeStep.id))}
                                    </span>
                                </div>
                                {activeStep.message && (
                                    <div className="text-muted ps-1" style={{ fontSize: "0.8em" }}>
                                        <i className="bi bi-arrow-right me-1"></i>{activeStep.message}
                                    </div>
                                )}
                                <ProgressBar
                                    now={activeStep.progress}
                                    variant="info"
                                    animated
                                    striped
                                    style={{ height: 8, marginTop: 6 }}
                                    label={`${Math.round(activeStep.progress)}%`}
                                />
                            </div>
                        )}

                        {/* All steps list */}
                        {steps.map(step => {
                            const isActive  = step.status === "running";
                            const isDone    = step.status === "done";
                            const isError   = step.status === "error";
                            const isPending = step.status === "pending";
                            const duration  = stepElapsed(step.id);

                            return (
                                <div
                                    key={step.id}
                                    className="mb-2"
                                    style={{
                                        opacity: isPending ? 0.45 : 1,
                                        transition: "opacity 0.3s",
                                    }}
                                >
                                    <div className="d-flex justify-content-between align-items-center mb-1">
                                        <span
                                            className="d-flex align-items-center gap-2"
                                            style={{ fontSize: "0.85em" }}
                                        >
                                            {isActive ? (
                                                <Spinner animation="border" size="sm"
                                                    style={{ width: 12, height: 12 }} />
                                            ) : (
                                                STEP_ICON[step.status]
                                            )}
                                            <span className={isError ? "text-danger" : isDone ? "text-success fw-semibold" : ""}>
                                                {step.name}
                                            </span>
                                        </span>

                                        <span className="d-flex align-items-center gap-2"
                                            style={{ fontSize: "0.8em" }}>
                                            {/* Duration badge for completed/running steps */}
                                            {duration != null && (
                                                <span
                                                    className={`badge ${isDone ? "bg-success" : isActive ? "bg-info" : "bg-danger"} font-monospace`}
                                                    style={{ fontSize: "0.75em" }}
                                                >
                                                    {isActive ? `${formatDuration(duration)} …` : formatDuration(duration)}
                                                </span>
                                            )}
                                            <span className="text-muted">
                                                {Math.round(step.progress)}%
                                            </span>
                                        </span>
                                    </div>

                                    <ProgressBar
                                        now={step.progress}
                                        variant={STATUS_VARIANT[step.status] || "secondary"}
                                        animated={isActive}
                                        style={{ height: 5 }}
                                    />
                                </div>
                            );
                        })}

                        {/* Overall bar */}
                        <div className="mt-3 pt-2 border-top">
                            <div className="d-flex justify-content-between align-items-center mb-1">
                                <span className="fw-semibold" style={{ fontSize: "0.85em" }}>
                                    Overall
                                </span>
                                <span className="text-muted" style={{ fontSize: "0.85em" }}>
                                    {Math.round(overallProgress)}%
                                </span>
                            </div>
                            <ProgressBar
                                now={overallProgress}
                                variant={backupError ? "danger" : backupDone ? "success" : "primary"}
                                animated={downloading}
                                striped={downloading}
                                style={{ height: 12 }}
                                label={`${Math.round(overallProgress)}%`}
                            />
                        </div>
                    </div>
                )}

                {/* ── Alerts ──────────────────────────────────────────────── */}
                {backupError && (
                    <div className="alert alert-danger py-2 mb-0">
                        <i className="bi bi-exclamation-triangle-fill me-2"></i>
                        {backupError}
                    </div>
                )}

                {backupDone && !backupError && (
                    <div className="alert alert-success py-2 mb-0">
                        <i className="bi bi-check-circle-fill me-2"></i>
                        Backup complete — your download has started automatically.
                    </div>
                )}

            </Modal.Body>

            <Modal.Footer>
                <Button variant="secondary" onClick={handleClose} disabled={downloading}>
                    Close
                </Button>
                <Button
                    variant="primary"
                    onClick={startDownload}
                    disabled={downloading || loadingSize || (!sizeData && !sizeError)}
                >
                    {downloading ? (
                        <>
                            <Spinner size="sm" animation="border" className="me-2" />
                            Backing up… {elapsed > 0 && `(${formatDuration(elapsed)})`}
                        </>
                    ) : backupDone ? (
                        <>
                            <i className="bi bi-arrow-clockwise me-2"></i>Backup Again
                        </>
                    ) : (
                        <>
                            <i className="bi bi-download me-2"></i>Download Data
                        </>
                    )}
                </Button>
            </Modal.Footer>
        </Modal>
    );
});

export default StoreBackup;
