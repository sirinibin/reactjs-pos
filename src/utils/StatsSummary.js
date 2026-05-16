// ...existing code...
import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Amount from "./amount.js";
import { trimTo2Decimals } from "./numberUtils";
import { Modal, Button, OverlayTrigger, Tooltip } from "react-bootstrap";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { useTranslation } from 'react-i18next';
import html2pdf from 'html2pdf.js';
import WhatsAppModal from './WhatsAppModal';

const StatsSummary = ({ title, stats = {}, statsWithInfo = {}, defaultOpen = false, onToggle, filters = {} }) => {
    const { t } = useTranslation();

    const [isOpen, setIsOpen] = useState(defaultOpen);
    const [showSettings, setShowSettings] = useState(false);
    const [leftFields, setLeftFields] = useState([]);
    const [rightFields, setRightFields] = useState([]);
    const [initialized, setInitialized] = useState(false);
    const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
    const [whatsAppMessage, setWhatsAppMessage] = useState("");
    const [isSharingWhatsApp, setIsSharingWhatsApp] = useState(false);
    const [whatsAppError, setWhatsAppError] = useState("");
    const [isDownloading, setIsDownloading] = useState(false);

    const LOCAL_KEY = useMemo(() => `${title}_stats_summary`, [title]);
    const printAreaRef = useRef(null);

    const splitStats = useCallback((statsArr) => {
        const mid = Math.ceil(statsArr.length / 2);
        return [statsArr.slice(0, mid), statsArr.slice(mid)];
    }, []);

    const normalizeStatsWithInfo = useCallback(() => {
        // Accepts:
        // - array: [{ label, value?, info? }, ...]
        // - object: { label: "info string" } or { label: { info, value? } }
        if (!statsWithInfo) return null;

        if (Array.isArray(statsWithInfo) && statsWithInfo.length > 0) {
            return statsWithInfo.map((it) => ({
                label: it.label,
                info: it.info,
                value: (typeof it.value !== "undefined" ? it.value : (stats[it.label] ?? 0)),
                visible: true
            }));
        }

        if (typeof statsWithInfo === "object" && Object.keys(statsWithInfo).length > 0) {
            return Object.keys(statsWithInfo).map((label) => {
                const val = statsWithInfo[label];
                if (typeof val === "string") {
                    return { label, info: val, value: (stats[label] ?? 0), visible: true };
                } else if (val && typeof val === "object") {
                    return {
                        label,
                        info: val.info,
                        value: (typeof val.value !== "undefined" ? val.value : (stats[label] ?? 0)),
                        visible: true
                    };
                } else {
                    return { label, value: (stats[label] ?? 0), visible: true };
                }
            });
        }

        return null;
    }, [statsWithInfo, stats]);

    const initializeFields = useCallback(() => {
        const normalized = normalizeStatsWithInfo();
        const defaults = (normalized && normalized.length > 0)
            ? normalized
            : Object.entries(stats).map(([label, value]) => ({
                label,
                value,
                visible: true
            }));

        const saved = localStorage.getItem(LOCAL_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setLeftFields(parsed.left || []);
                setRightFields(parsed.right || []);
            } catch {
                const [left, right] = splitStats(defaults);
                setLeftFields(left);
                setRightFields(right);
                localStorage.setItem(LOCAL_KEY, JSON.stringify({ left, right }));
            }
        } else {
            const [left, right] = splitStats(defaults);
            setLeftFields(left);
            setRightFields(right);
            localStorage.setItem(LOCAL_KEY, JSON.stringify({ left, right }));
        }

        setInitialized(true);
    }, [LOCAL_KEY, stats, normalizeStatsWithInfo, splitStats]);

    useEffect(() => {
        if (!initialized) {
            initializeFields();
        }
    }, [initializeFields, initialized]);

    useEffect(() => {
        if (initialized) {
            localStorage.setItem(LOCAL_KEY, JSON.stringify({ left: leftFields, right: rightFields }));
        }
    }, [LOCAL_KEY, leftFields, rightFields, initialized]);

    const handleToggle = () => {
        setIsOpen(!isOpen);
        if (onToggle) onToggle(!isOpen);
    };

    const renderInfoTooltip = (info) => (props) => (
        <Tooltip id="label-tooltip" {...props}>
            {info}
        </Tooltip>
    );

    const renderStats = (fields) =>
        fields.filter(f => f.visible).map((f, index) => {
            const amount = trimTo2Decimals((typeof stats[f.label] !== "undefined") ? stats[f.label] : (typeof f.value !== "undefined" ? f.value : 0));
            return (
                <div className="mb-2" key={index}>
                    <div className="d-flex justify-content-between align-items-center">
                        <span>
                            {t(f.label)}
                            {f.info ? (
                                <OverlayTrigger placement="right" overlay={renderInfoTooltip(f.info)}>
                                    <span className="stats-info-icon" style={{ textDecoration: 'underline dotted', cursor: 'pointer', marginLeft: '6px' }}>ℹ️</span>
                                </OverlayTrigger>
                            ) : null}
                            :
                        </span>
                        <span className="badge bg-secondary">
                            <Amount amount={amount} />
                        </span>
                    </div>
                </div>
            );
        });

    const handleDragEnd = (result) => {
        if (!result.destination) return;

        const { source, destination } = result;
        const sourceList = source.droppableId === "left" ? [...leftFields] : [...rightFields];
        const destinationList = destination.droppableId === "left" ? [...leftFields] : [...rightFields];

        const [movedItem] = sourceList.splice(source.index, 1);

        if (source.droppableId === destination.droppableId) {
            sourceList.splice(destination.index, 0, movedItem);
            if (source.droppableId === "left") setLeftFields(sourceList);
            else setRightFields(sourceList);
        } else {
            destinationList.splice(destination.index, 0, movedItem);
            if (source.droppableId === "left") {
                setLeftFields(sourceList);
                setRightFields(destinationList);
            } else {
                setRightFields(sourceList);
                setLeftFields(destinationList);
            }
        }
    };

    const handlePrint = () => {
        const styleId = 'stats-summary-print-style';
        let style = document.getElementById(styleId);
        if (!style) {
            style = document.createElement('style');
            style.id = styleId;
            document.head.appendChild(style);
        }
        style.innerHTML = `
            @media print {
                @page { size: A4; margin: 0; }
                body { background: white !important; }
                body > *:not(#stats-summary-print-wrapper) { display: none !important; }
                #stats-summary-print-wrapper {
                    display: block !important;
                    margin: 0 !important;
                    padding: 25px 25px 15mm 25px !important;
                    background: white !important;
                    min-height: 100vh !important;
                }
                #stats-summary-print-area {
                    border: 1px solid #999 !important;
                    border-radius: 4px !important;
                    background: white !important;
                    padding: 12px !important;
                    margin: 0 !important;
                }
                .stats-print-header { display: block !important; }
                .stats-info-icon { display: none !important; }
            }
        `;

        // Move print area to body to guarantee it starts at the very top
        const printArea = printAreaRef.current;
        const originalParent = printArea.parentNode;
        const originalNextSibling = printArea.nextSibling;

        const wrapper = document.createElement('div');
        wrapper.id = 'stats-summary-print-wrapper';
        document.body.appendChild(wrapper);
        wrapper.appendChild(printArea);

        const cleanup = () => {
            // Restore original position
            if (originalNextSibling) {
                originalParent.insertBefore(printArea, originalNextSibling);
            } else {
                originalParent.appendChild(printArea);
            }
            wrapper.remove();
            style.innerHTML = '';
            window.removeEventListener('afterprint', cleanup);
        };
        window.addEventListener('afterprint', cleanup);
        window.print();
    };

    const handleDownload = async () => {
        setIsDownloading(true);
        try {
            const printArea = printAreaRef.current;
            const header = printArea?.querySelector('.stats-print-header');
            const originalDisplay = header ? header.style.display : '';
            const originalBg = printArea ? printArea.style.backgroundColor : '';
            const originalBodyBg = document.body.style.backgroundColor;
            if (header) header.style.display = 'block';
            if (printArea) printArea.style.backgroundColor = '#ffffff';
            document.body.style.backgroundColor = '#ffffff';

            // Hide info icons for PDF (UI-only)
            const infoIcons = printArea?.querySelectorAll('.stats-info-icon') || [];
            infoIcons.forEach(el => { el._origDisplay = el.style.display; el.style.display = 'none'; });

            const safeFileName = `${title.replace(/[^a-zA-Z0-9._-]/g, '_')}.pdf`;
            const pdfBlob = await html2pdf()
                .set({
                    margin: [10, 10, 10, 10],
                    filename: safeFileName,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                })
                .from(printArea)
                .outputPdf('blob');

            if (header) header.style.display = originalDisplay;
            if (printArea) printArea.style.backgroundColor = originalBg;
            document.body.style.backgroundColor = originalBodyBg;
            infoIcons.forEach(el => { el.style.display = el._origDisplay; });

            const url = URL.createObjectURL(pdfBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = safeFileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            setWhatsAppError(err?.message || 'Failed to generate PDF');
        } finally {
            setIsDownloading(false);
        }
    };

    // Step 1: Upload PDF to filebin.net, then open the WhatsApp modal with the message pre-filled
    const handleWhatsAppShare = async () => {
        setIsSharingWhatsApp(true);
        setWhatsAppError("");
        try {
            // Temporarily show the print header and force white background for PDF generation
            const printArea = printAreaRef.current;
            const header = printArea?.querySelector('.stats-print-header');
            const originalDisplay = header ? header.style.display : '';
            const originalBg = printArea ? printArea.style.backgroundColor : '';
            const originalBodyBg = document.body.style.backgroundColor;
            if (header) header.style.display = 'block';
            if (printArea) printArea.style.backgroundColor = '#ffffff';
            document.body.style.backgroundColor = '#ffffff';

            // Hide info icons for PDF (UI-only)
            const infoIconsWA = printArea?.querySelectorAll('.stats-info-icon') || [];
            infoIconsWA.forEach(el => { el._origDisplay = el.style.display; el.style.display = 'none'; });

            const pdfBlob = await html2pdf()
                .set({
                    margin: [10, 10, 10, 10],
                    filename: `${title}.pdf`,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                })
                .from(printArea)
                .outputPdf('blob');

            // Restore original styles
            if (header) header.style.display = originalDisplay;
            if (printArea) printArea.style.backgroundColor = originalBg;
            document.body.style.backgroundColor = originalBodyBg;
            infoIconsWA.forEach(el => { el.style.display = el._origDisplay; });

            // Upload to filebin.net
            const binId = `startpos-${Date.now()}`;
            const safeFileName = `${title.replace(/[^a-zA-Z0-9._-]/g, '_')}.pdf`;
            const rawBlob = new Blob([await pdfBlob.arrayBuffer()]);
            const fbResponse = await fetch(`https://filebin.net/${binId}/${safeFileName}`, {
                method: 'POST',
                body: rawBlob,
            });

            if (!fbResponse.ok && fbResponse.status !== 201) {
                throw new Error(`filebin.net upload failed: HTTP ${fbResponse.status}`);
            }

            const publicUrl = `https://filebin.net/${binId}/${safeFileName}`;
            setWhatsAppMessage(`Hello, here is the ${title}:\n${publicUrl}`);
            setShowWhatsAppModal(true);
        } catch (err) {
            setWhatsAppError(err?.message || 'Failed to upload PDF for sharing');
        } finally {
            setIsSharingWhatsApp(false);
        }
    };

    // Step 2: Called by WhatsAppModal with { type, number, message }
    const handleWhatsAppChoice = async ({ type, number, message }) => {
        let whatsappUrl = "";
        if (type === "number" && number) {
            let phone = number.replace(/\D/g, '');
            if (phone.startsWith('05')) phone = '966' + phone.slice(1);
            const isWindows = navigator.userAgent.toLowerCase().includes('windows');
            whatsappUrl = isWindows
                ? `https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`
                : `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
        } else {
            // contacts — open WhatsApp contact picker
            whatsappUrl = `https://wa.me?text=${encodeURIComponent(message)}`;
        }

        // In Tauri, window.open does not open external URLs — use the shell plugin instead
        let tauriShell = null;
        try {
            let w = window;
            while (w) {
                if (w.__TAURI__?.shell?.open) { tauriShell = w.__TAURI__.shell; break; }
                if (w === w.parent) break;
                w = w.parent;
            }
        } catch (_) { /* cross-origin guard */ }

        if (tauriShell) {
            await tauriShell.open(whatsappUrl);
        } else {
            window.open(whatsappUrl, '_blank');
        }
    };

    const restoreDefaults = () => {
        const normalized = normalizeStatsWithInfo();
        const defaults = (normalized && normalized.length > 0)
            ? normalized
            : Object.entries(stats).map(([label, value]) => ({
                label,
                value,
                visible: true
            }));
        const [left, right] = splitStats(defaults);
        setLeftFields(left);
        setRightFields(right);
        localStorage.setItem(LOCAL_KEY, JSON.stringify({ left, right }));
    };

    const renderSettingsModal = () => (
        <Modal show={showSettings} onHide={() => setShowSettings(false)} size="lg">
            <Modal.Header closeButton>
                <Modal.Title>{t(`Customize ${title} Summary`)}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <DragDropContext onDragEnd={handleDragEnd}>
                    <div className="row">
                        {[{ id: "left", fields: leftFields, setFields: setLeftFields }, { id: "right", fields: rightFields, setFields: setRightFields }].map(({ id, fields, setFields }) => (
                            <div className="col-md-6" key={id}>
                                <h6 className="text-center">{id === "left" ? t("Left Column") : t("Right Column")}</h6>
                                <Droppable droppableId={id}>
                                    {(provided) => (
                                        <div ref={provided.innerRef} {...provided.droppableProps} style={{ minHeight: "50px" }}>
                                            {fields.map((field, index) => (
                                                <Draggable key={field.label} draggableId={`${id}-${field.label}`} index={index}>
                                                    {(provided) => (
                                                        <div
                                                            className="d-flex align-items-center mb-2 p-2 border rounded"
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            {...provided.dragHandleProps}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                style={{ width: "20px", height: "20px" }}
                                                                className="me-2"
                                                                checked={field.visible}
                                                                onChange={() => {
                                                                    const updated = [...fields];
                                                                    updated[index].visible = !updated[index].visible;
                                                                    setFields(updated);
                                                                }}
                                                            />
                                                            {t(field.label)}
                                                        </div>
                                                    )}
                                                </Draggable>
                                            ))}
                                            {provided.placeholder}
                                        </div>
                                    )}
                                </Droppable>
                            </div>
                        ))}
                    </div>
                </DragDropContext>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="outline-danger" onClick={restoreDefaults}>
                    {t("Restore to Defaults")}
                </Button>
                <Button variant="secondary" onClick={() => setShowSettings(false)}>
                    {t("Close")}
                </Button>
            </Modal.Footer>
        </Modal>
    );

    return (
        <div className="mb-3">
            <button className="btn btn-outline-primary mb-2" onClick={handleToggle}>
                {isOpen ? t(`Hide ${title}`) : t(`Show ${title}`)}
            </button>

            {(isOpen) && (
                <>
                    <div className="row">
                        <div className="col">
                            <div className="d-flex justify-content-start mb-2">
                                <h4>{t(`${title}`)}</h4>
                            </div>
                        </div>
                        <div className="col">
                            <div className="d-flex justify-content-end mb-2 gap-2">
                                <Button
                                    variant="outline-secondary"
                                    size="sm"
                                    onClick={handlePrint}
                                    title={t("Print A4")}
                                >
                                    <i className="bi bi-printer"></i>
                                </Button>
                                <Button
                                    variant="outline-primary"
                                    size="sm"
                                    onClick={handleDownload}
                                    title={t("Download PDF")}
                                    disabled={isDownloading}
                                >
                                    {isDownloading
                                        ? <span className="spinner-border spinner-border-sm"></span>
                                        : <i className="bi bi-file-earmark-arrow-down"></i>}
                                </Button>
                                <Button
                                    variant="outline-success"
                                    size="sm"
                                    onClick={() => { setWhatsAppError(""); handleWhatsAppShare(); }}
                                    title={t("Share via WhatsApp")}
                                    disabled={isSharingWhatsApp}
                                >
                                    {isSharingWhatsApp
                                        ? <span className="spinner-border spinner-border-sm"></span>
                                        : <i className="bi bi-whatsapp"></i>}
                                </Button>
                                <Button
                                    variant="outline-secondary"
                                    size="sm"
                                    onClick={() => setShowSettings(true)}
                                >
                                    <i className="bi bi-gear"></i>
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div ref={printAreaRef} className="border pt-4 px-3 pb-3 rounded bg-white position-relative">
                        <div className="stats-print-header" style={{ display: 'none' }}>
                            <h2 style={{ fontSize: '18pt', marginBottom: '10px', textAlign: 'center', fontWeight: 'bold' }}>{title}</h2>
                            {Object.keys(filters).filter(k => filters[k] !== undefined && filters[k] !== null && filters[k] !== '').length > 0 && (
                                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px', fontSize: '10pt', textAlign: 'left' }}>
                                    <tbody>
                                        {Object.entries(filters)
                                            .filter(([, v]) => v !== undefined && v !== null && v !== '')
                                            .map(([label, value]) => (
                                                <tr key={label}>
                                                    <td style={{ padding: '3px 10px 3px 0', fontWeight: 'bold', whiteSpace: 'nowrap', width: '1%', color: '#444' }}>{label}:</td>
                                                    <td style={{ padding: '3px 0', color: '#222' }}>{String(value)}</td>
                                                </tr>
                                            ))
                                        }
                                    </tbody>
                                </table>
                            )}
                            <hr style={{ borderTop: '2px solid #333', marginBottom: '14px' }} />
                        </div>
                        <div className="row">
                            <div className="col-md-6">{renderStats(leftFields)}</div>
                            <div className="col-md-6">{renderStats(rightFields)}</div>
                        </div>
                    </div>
                </>
            )}

            {renderSettingsModal()}

            <WhatsAppModal
                show={showWhatsAppModal}
                onClose={() => setShowWhatsAppModal(false)}
                onChoice={handleWhatsAppChoice}
                defaultMessage={whatsAppMessage}
                hideMessage={true}
            />
            {whatsAppError && (
                <div className="alert alert-danger py-2 mt-2">{whatsAppError}</div>
            )}
        </div>
    );
};

export default StatsSummary;
// ...existing code...