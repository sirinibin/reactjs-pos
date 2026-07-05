import React from "react";
import { Modal, Button } from 'react-bootstrap';
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { useTranslation } from "react-i18next";

function TableSettingsModal({
    show,
    onHide,
    title,
    columns,
    onToggleColumn,
    onDragEnd,
    onRestoreDefaults,
    enableSelection,
    onCheckAll,
    onUncheckAll,
}) {
    const { t } = useTranslation('common');

    return (
        <Modal show={show} onHide={onHide} centered size="lg">
            <Modal.Header closeButton>
                <Modal.Title>
                    <i
                        className="bi bi-gear-fill"
                        style={{ fontSize: "1.2rem", marginRight: "4px" }}
                        title={t('Table Settings')}
                    />
                    {title}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {show && (
                    <>
                        <h6 className="mb-2">{t('Customize Columns')}</h6>
                        <DragDropContext onDragEnd={onDragEnd}>
                            <Droppable droppableId="columns">
                                {(provided) => (
                                    <ul
                                        className="list-group"
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                    >
                                        {columns.map((col, index) => (
                                            <>
                                                {((col.key === "select" && enableSelection) || col.key !== "select") && (
                                                    <Draggable key={col.key} draggableId={col.key} index={index}>
                                                        {(provided) => (
                                                            <li
                                                                className="list-group-item d-flex justify-content-between align-items-center"
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                {...provided.dragHandleProps}
                                                            >
                                                                <div>
                                                                    <input
                                                                        style={{ width: "20px", height: "20px" }}
                                                                        type="checkbox"
                                                                        className="form-check-input me-2"
                                                                        checked={col.visible}
                                                                        onChange={() => onToggleColumn(index)}
                                                                    />
                                                                    {t(col.label)}
                                                                </div>
                                                                <span style={{ cursor: "grab" }}>☰</span>
                                                            </li>
                                                        )}
                                                    </Draggable>
                                                )}
                                            </>
                                        ))}
                                        {provided.placeholder}
                                    </ul>
                                )}
                            </Droppable>
                        </DragDropContext>
                    </>
                )}
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>{t('Close')}</Button>
                {onUncheckAll && (
                    <Button variant="outline-secondary" onClick={onUncheckAll}>{t('Uncheck All')}</Button>
                )}
                {onCheckAll && (
                    <Button variant="outline-secondary" onClick={onCheckAll}>{t('Check All')}</Button>
                )}
                {onRestoreDefaults && (
                    <Button variant="primary" onClick={onRestoreDefaults}>{t('Restore to Default')}</Button>
                )}
            </Modal.Footer>
        </Modal>
    );
}

export default TableSettingsModal;
