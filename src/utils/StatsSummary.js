// ...existing code...
import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Amount from "./amount.js";
import { trimTo2Decimals, addCommasToInfoValue, stripSarBreakdown } from "./numberUtils";
import { Modal, Button, OverlayTrigger, Popover } from "react-bootstrap";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { useTranslation } from 'react-i18next';
import WhatsAppModal from './WhatsAppModal';
import { generateInfoPdf, generateSectionPdf, safeName } from './pdfGenerator';
import { uploadPdfForShare } from './pdfShare';


const StatsSummary = ({ title, stats = {}, statsWithInfo = {}, defaultOpen = false, onToggle, filters = {}, statsDefaultVisibility = {}, storageKey, store = {} }) => {
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

    // Per-tooltip popover state
    const [openInfoLabel, setOpenInfoLabel] = useState(null);
    const autoCloseTimerRef = useRef(null);
    const [downloadingLabel, setDownloadingLabel] = useState(null);
    const [sharingWALabel, setSharingWALabel] = useState(null);
    const [tooltipErrorLabel, setTooltipErrorLabel] = useState(null);
    const [tooltipErrorMsg, setTooltipErrorMsg] = useState("");
    const [showTooltipWAModal, setShowTooltipWAModal] = useState(false);
    const [tooltipWAMessage, setTooltipWAMessage] = useState("");

    const LOCAL_KEY = useMemo(() => storageKey ? `${storageKey}_stats_summary` : `${title}_stats_summary`, [storageKey, title]);
    const printAreaRef = useRef(null);
    // Always holds the latest info+value per label, updated every render in renderStats.
    // Handlers read from here so they never use stale closure values.
    const currentInfoRef = useRef({});
    const currentValueRef = useRef({});

    // Auto-close tooltip after 5 s when mouse leaves
    const clearAutoClose = useCallback(() => {
        if (autoCloseTimerRef.current) {
            clearTimeout(autoCloseTimerRef.current);
            autoCloseTimerRef.current = null;
        }
    }, []);

    const startAutoClose = useCallback(() => {
        clearAutoClose();
        autoCloseTimerRef.current = setTimeout(() => setOpenInfoLabel(null), 5000);
    }, [clearAutoClose]);

    useEffect(() => {
        if (openInfoLabel) startAutoClose();
        else clearAutoClose();
        return clearAutoClose;
    }, [openInfoLabel, startAutoClose, clearAutoClose]);

    // Click outside any popover → close
    useEffect(() => {
        const handleDocClick = (e) => {
            if (!e.target.closest('.popover') &&
                !e.target.closest('.stats-info-icon') &&
                !e.target.closest('.modal')) {
                setOpenInfoLabel(null);
            }
        };
        document.addEventListener('mousedown', handleDocClick);
        return () => document.removeEventListener('mousedown', handleDocClick);
    }, []);

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
                colorByValue: it.colorByValue || false,
                noActions: it.noActions || false,
                bold: it.bold || false,
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
                visible: statsDefaultVisibility[label] !== undefined ? statsDefaultVisibility[label] : true
            }));

        const saved = localStorage.getItem(LOCAL_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                const savedLeft = parsed.left || [];
                const savedRight = parsed.right || [];
                const savedLabels = new Set([...savedLeft, ...savedRight].map(f => f.label));
                const missing = defaults.filter(d => !savedLabels.has(d.label));
                const mergedRight = [...savedRight, ...missing];
                setLeftFields(savedLeft);
                setRightFields(mergedRight);
                if (missing.length > 0) {
                    localStorage.setItem(LOCAL_KEY, JSON.stringify({ left: savedLeft, right: mergedRight }));
                }
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
    }, [LOCAL_KEY, stats, normalizeStatsWithInfo, splitStats, statsDefaultVisibility]);

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

    const handleTooltipDownload = useCallback(async (field) => {
        if (!field) return;
        // Always use the freshest info+value from refs (updated every render).
        const info = currentInfoRef.current[field.label] ?? field.info;
        const fieldValue = currentValueRef.current[field.label] ?? field.value;
        setDownloadingLabel(field.label);
        setTooltipErrorLabel(null);
        setTooltipErrorMsg("");
        try {
            const doc = generateInfoPdf(title, field.label, fieldValue, info, filters, store);
            const safeTitle = safeName(`${title} - ${field.label}`);
            doc.save(`${safeTitle}.pdf`);
        } catch (err) {
            setTooltipErrorLabel(field.label);
            setTooltipErrorMsg(err?.message || 'Failed to generate PDF');
        } finally {
            setDownloadingLabel(null);
        }
    }, [title, filters, store]);

    const handleTooltipPrint = useCallback((field) => {
        if (!field) return;
        const info = currentInfoRef.current[field.label] ?? field.info;
        const fieldValue = currentValueRef.current[field.label] ?? field.value;
        try {
            const doc = generateInfoPdf(title, field.label, fieldValue, info, filters, store);
            doc.autoPrint();
            doc.output('dataurlnewwindow');
        } catch (err) {
            setTooltipErrorLabel(field.label);
            setTooltipErrorMsg(err?.message || 'Failed to print PDF');
        }
    }, [title, filters, store]);

    const handleTooltipWhatsAppShare = useCallback(async (field) => {
        if (!field) return;
        const info = currentInfoRef.current[field.label] ?? field.info;
        const fieldValue = currentValueRef.current[field.label] ?? field.value;
        setSharingWALabel(field.label);
        setTooltipErrorLabel(null);
        setTooltipErrorMsg("");
        try {
            const doc = generateInfoPdf(title, field.label, fieldValue, info, filters, store);
            const pdfBlob = doc.output('blob');
            const safeFileName = `${safeName(`${title}_${field.label}`)}.pdf`;
            const publicUrl = await uploadPdfForShare(pdfBlob, safeFileName);
            setTooltipWAMessage(`Hello, here is the ${title} — ${field.label}:\n${publicUrl}`);
            setShowTooltipWAModal(true);
        } catch (err) {
            setTooltipErrorLabel(field.label);
            setTooltipErrorMsg(err?.message || 'Failed to upload PDF for sharing');
        } finally {
            setSharingWALabel(null);
        }
    }, [title, filters, store]);

    const renderInfoPopover = useCallback((fieldLabel, info, noActions = false) => {
        const lines = Array.isArray(info) ? info : null;
        const field = { label: fieldLabel, info };
        const isDown = downloadingLabel === fieldLabel;
        const isSharingWA = sharingWALabel === fieldLabel;
        const hasError = tooltipErrorLabel === fieldLabel;

        // Separate the first "description" line (What it is) from calculation lines
        const descLine = lines && lines[0] && !lines[0].divider && lines[0].bold ? lines[0] : null;
        const detailLines = descLine ? lines.slice(1) : (lines || []);

        // Dashboard-matching dark theme colours
        const BG      = '#212529';
        const BORDER  = '#495057';
        const DIVIDER = '#495057';

        return (
            <Popover
                id={`popover-${fieldLabel}`}
                style={{
                    maxWidth: '400px',
                    minWidth: '260px',
                    background: BG,
                    border: `1px solid ${BORDER}`,
                    boxShadow: '0 4px 14px rgba(0,0,0,.45)',
                    borderRadius: '6px',
                    color: '#f8f9fa'
                }}
            >
                <Popover.Header style={{
                    background: BG,
                    borderBottom: `1px solid ${BORDER}`,
                    color: '#f8f9fa',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    padding: '7px 10px 7px 14px',
                    borderRadius: '6px 6px 0 0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <span>{title} — {fieldLabel}</span>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setOpenInfoLabel(null); }}
                        style={{ background: 'none', border: 'none', color: '#adb5bd', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1, padding: '0 0 0 10px' }}
                        title="Close"
                    >×</button>
                </Popover.Header>
                <Popover.Body
                    style={{ padding: '0', background: BG, borderRadius: '0 0 6px 6px' }}
                    onClick={e => e.stopPropagation()}
                    onMouseEnter={clearAutoClose}
                    onMouseLeave={startAutoClose}
                >
                    {/* Active date filters */}
                    {Object.entries(filters).filter(([, v]) => v !== undefined && v !== null && v !== '').length > 0 && (
                        <div style={{
                            padding: '5px 14px',
                            borderBottom: `1px solid ${BORDER}`,
                            fontSize: '0.72rem',
                            color: '#adb5bd',
                            lineHeight: 1.7
                        }}>
                            {Object.entries(filters)
                                .filter(([, v]) => v !== undefined && v !== null && v !== '')
                                .map(([k, v]) => (
                                    <span key={k} style={{ marginRight: '12px' }}>
                                        {k}: <span style={{ color: '#f8f9fa', fontWeight: 500 }}>{v}</span>
                                    </span>
                                ))}
                        </div>
                    )}
                    {/* "What it is" description block */}
                    {descLine && (
                        <div style={{
                            padding: '8px 14px',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            color: descLine.color || '#f8f9fa',
                            borderBottom: `1px solid ${DIVIDER}`,
                            lineHeight: 1.5
                        }}>
                            {addCommasToInfoValue(descLine.value)}
                        </div>
                    )}

                    {/* Calculation breakdown — table for perfect column alignment */}
                    {detailLines.length > 0 && (
                        <table style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                            fontSize: '0.75rem'
                        }}>
                            <tbody>
                                {detailLines.map((line, i) => (
                                    <tr key={i} style={{
                                        lineHeight: 1.7,
                                        borderTop: line.divider ? `1px solid ${DIVIDER}` : 'none'
                                    }}>
                                        <td style={{
                                            padding: line.divider ? '6px 8px 2px 14px' : '1px 8px 1px 14px',
                                            color: '#adb5bd',
                                            whiteSpace: 'nowrap',
                                            verticalAlign: 'top',
                                            width: '1%'
                                        }}>
                                            {line.label || ''}
                                        </td>
                                        <td style={{
                                            padding: line.divider ? '6px 14px 2px 4px' : '1px 14px 1px 4px',
                                            textAlign: 'right',
                                            fontWeight: line.bold ? 700 : 400,
                                            color: line.color || '#f8f9fa',
                                            whiteSpace: 'nowrap',
                                            fontVariantNumeric: 'tabular-nums'
                                        }}>
                                            {stripSarBreakdown(addCommasToInfoValue(line.value), line.bold)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {!lines && (
                        <div style={{ padding: '8px 14px', fontSize: '0.75rem', whiteSpace: 'pre-line', color: '#f8f9fa' }}>
                            {info}
                        </div>
                    )}

                    {hasError && (
                        <div style={{ padding: '4px 14px', color: '#f8a5a5', fontSize: '0.72rem' }}>{tooltipErrorMsg}</div>
                    )}

                    {/* Action bar */}
                    {!noActions && (
                    <div style={{
                        display: 'flex',
                        gap: '6px',
                        padding: '7px 14px',
                        borderTop: `1px solid ${DIVIDER}`,
                        justifyContent: 'flex-end',
                        background: BG,
                        borderRadius: '0 0 6px 6px'
                    }}>
                        <Button
                            variant="outline-secondary"
                            size="sm"
                            style={{ fontSize: '0.7rem', padding: '2px 10px' }}
                            onClick={() => handleTooltipPrint(field)}
                            title="Print"
                        >
                            <i className="bi bi-printer me-1"></i>Print
                        </Button>
                        <Button
                            variant="outline-light"
                            size="sm"
                            style={{ fontSize: '0.7rem', padding: '2px 10px' }}
                            onClick={() => handleTooltipDownload(field)}
                            disabled={isDown}
                            title="Download PDF"
                        >
                            {isDown
                                ? <span className="spinner-border spinner-border-sm" style={{ width: '0.7rem', height: '0.7rem' }}></span>
                                : <><i className="bi bi-file-earmark-arrow-down me-1"></i>PDF</>}
                        </Button>
                        <Button
                            variant="outline-success"
                            size="sm"
                            style={{ fontSize: '0.7rem', padding: '2px 10px' }}
                            onClick={() => handleTooltipWhatsAppShare(field)}
                            disabled={isSharingWA}
                            title="Share via WhatsApp"
                        >
                            {isSharingWA
                                ? <span className="spinner-border spinner-border-sm" style={{ width: '0.7rem', height: '0.7rem' }}></span>
                                : <><i className="bi bi-whatsapp me-1"></i>Share</>}
                        </Button>
                    </div>
                    )}
                </Popover.Body>
            </Popover>
        );
    }, [title, filters, downloadingLabel, sharingWALabel, tooltipErrorLabel, tooltipErrorMsg,
        handleTooltipDownload, handleTooltipPrint, handleTooltipWhatsAppShare, setOpenInfoLabel, clearAutoClose, startAutoClose]);

    const renderStats = (fields, placement = 'right') => {
        const normalized = normalizeStatsWithInfo();
        const infoByLabel = normalized ? Object.fromEntries(normalized.map(n => [n.label, n.info])) : {};
        const colorByValueLabels = normalized ? new Set(normalized.filter(n => n.colorByValue).map(n => n.label)) : new Set();
        const noActionsByLabel = normalized ? new Set(normalized.filter(n => n.noActions).map(n => n.label)) : new Set();
        return fields.filter(f => f.visible).map((f, index) => {
            const rawValue = (typeof stats[f.label] !== "undefined") ? stats[f.label] : (typeof f.value !== "undefined" ? f.value : 0);
            const amount = trimTo2Decimals(rawValue);
            const info = (infoByLabel[f.label] !== undefined) ? infoByLabel[f.label] : f.info;
            // Keep refs up-to-date so tooltip handlers always use the latest values.
            currentInfoRef.current[f.label] = info;
            currentValueRef.current[f.label] = rawValue;
            const useColor = colorByValueLabels.has(f.label);
            const noActions = noActionsByLabel.has(f.label);
            const isPositive = useColor && Number(rawValue) >= 0;
            return (
                <div className="mb-2" key={index}>
                    <div className="d-flex justify-content-between align-items-center">
                        <span>
                            {t(f.label)}
                            {info ? (
                                <OverlayTrigger
                                    show={openInfoLabel === f.label}
                                    placement={placement}
                                    overlay={renderInfoPopover(f.label, info, noActions)}
                                >
                                    <span
                                        className="stats-info-icon"
                                        style={{ textDecoration: 'underline dotted', cursor: 'pointer', marginLeft: '6px' }}
                                        title="Click for details"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenInfoLabel(prev => prev === f.label ? null : f.label);
                                        }}
                                    >ℹ️</span>
                                </OverlayTrigger>
                            ) : null}
                            :
                        </span>
                        {useColor ? (
                            <span className="badge" style={{ backgroundColor: isPositive ? 'green' : 'red' }}>
                                {isPositive ? '+' : ''}<Amount amount={amount} />
                            </span>
                        ) : (
                            <span className="badge bg-secondary">
                                <Amount amount={amount} />
                            </span>
                        )}
                    </div>
                </div>
            );
        });
    };

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

    const buildSectionDoc = useCallback(() => {
        const normalized = normalizeStatsWithInfo();
        const infoMap = normalized
            ? Object.fromEntries(normalized.filter(n => n.info).map(n => [n.label, n.info]))
            : {};
        const colorByValueSet = normalized
            ? new Set(normalized.filter(n => n.colorByValue).map(n => n.label))
            : new Set();
        const boldSet = normalized
            ? new Set(normalized.filter(n => n.bold).map(n => n.label))
            : new Set();
        const allVisible = [...leftFields, ...rightFields]
            .filter(f => f.visible)
            .map(f => ({
                label: f.label,
                value: typeof stats[f.label] !== 'undefined' ? stats[f.label] : (f.value ?? 0),
                colorByValue: colorByValueSet.has(f.label),
                bold: boldSet.has(f.label),
            }));
        return generateSectionPdf(title, allVisible, infoMap, filters, store);
    }, [normalizeStatsWithInfo, leftFields, rightFields, stats, title, filters, store]);

    const handlePrint = () => {
        const doc = buildSectionDoc();
        doc.autoPrint();
        doc.output('dataurlnewwindow');
    };

    const handleDownload = async () => {
        setIsDownloading(true);
        try {
            const doc = buildSectionDoc();
            doc.save(`${safeName(title)}.pdf`);
        } catch (err) {
            setWhatsAppError(err?.message || 'Failed to generate PDF');
        } finally {
            setIsDownloading(false);
        }
    };

    const handleWhatsAppShare = async () => {
        setIsSharingWhatsApp(true);
        setWhatsAppError("");
        try {
            const doc = buildSectionDoc();
            const pdfBlob = doc.output('blob');
            const safeFileName = `${safeName(title)}.pdf`;
            const publicUrl = await uploadPdfForShare(pdfBlob, safeFileName);
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
                visible: statsDefaultVisibility[label] !== undefined ? statsDefaultVisibility[label] : true
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
                            <div className="col-md-6">{renderStats(leftFields, 'right')}</div>
                            <div className="col-md-6">{renderStats(rightFields, 'left')}</div>
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

            <WhatsAppModal
                show={showTooltipWAModal}
                onClose={() => setShowTooltipWAModal(false)}
                onChoice={handleWhatsAppChoice}
                defaultMessage={tooltipWAMessage}
                hideMessage={true}
            />
        </div>
    );
};

export default StatsSummary;
// ...existing code...