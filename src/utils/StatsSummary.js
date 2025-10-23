// ...existing code...
import React, { useEffect, useState, useCallback, useMemo } from "react";
import Amount from "./amount.js";
import { trimTo2Decimals } from "./numberUtils";
import { Modal, Button, OverlayTrigger, Tooltip } from "react-bootstrap";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

const StatsSummary = ({ title, stats = {}, statsWithInfo = {}, defaultOpen = false, onToggle }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const [showSettings, setShowSettings] = useState(false);
    const [leftFields, setLeftFields] = useState([]);
    const [rightFields, setRightFields] = useState([]);
    const [initialized, setInitialized] = useState(false);

    const LOCAL_KEY = useMemo(() => `${title}_stats_summary`, [title]);

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
                            {f.label}
                            {f.info ? (
                                <OverlayTrigger placement="right" overlay={renderInfoTooltip(f.info)}>
                                    <span style={{ textDecoration: 'underline dotted', cursor: 'pointer', marginLeft: '6px' }}>ℹ️</span>
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
                <Modal.Title>Customize {title} Summary</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <DragDropContext onDragEnd={handleDragEnd}>
                    <div className="row">
                        {[{ id: "left", fields: leftFields, setFields: setLeftFields }, { id: "right", fields: rightFields, setFields: setRightFields }].map(({ id, fields, setFields }) => (
                            <div className="col-md-6" key={id}>
                                <h6 className="text-center">{id === "left" ? "Left Column" : "Right Column"}</h6>
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
                                                            {field.label}
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
                    Restore to Defaults
                </Button>
                <Button variant="secondary" onClick={() => setShowSettings(false)}>
                    Close
                </Button>
            </Modal.Footer>
        </Modal>
    );

    return (
        <div className="mb-3">
            <button className="btn btn-outline-primary mb-2" onClick={handleToggle}>
                {isOpen ? `Hide ${title} Summary` : `Show ${title} Summary`}
            </button>

            {(isOpen) && (
                <>
                    <div className="row">
                        <div className="col">
                            <div className="d-flex justify-content-start mb-2">
                                <h4>{` ${title}`}</h4>
                            </div>
                        </div>
                        <div className="col">
                            <div className="d-flex justify-content-end mb-2">
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

                    <div className="border pt-4 px-3 pb-3 rounded bg-light position-relative">
                        <div className="row">
                            <div className="col-md-6">{renderStats(leftFields)}</div>
                            <div className="col-md-6">{renderStats(rightFields)}</div>
                        </div>
                    </div>
                </>
            )}

            {renderSettingsModal()}
        </div>
    );
};

export default StatsSummary;
// ...existing code...