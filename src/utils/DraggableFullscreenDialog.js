import React, { useRef } from "react";
import Draggable from "react-draggable";

// Full-screen modal dialog that can be dragged by its header, for react-bootstrap's
// <Modal dialogAs={...}>. It must be a component defined once at module level:
// an inline arrow passed as dialogAs is a new component type on every render, so
// React unmounts and remounts the whole modal body each time the parent re-renders
// (every list inside fetched again, the open tab and any child form reset).
const DraggableFullscreenDialog = ({ children, ...dlgProps }) => {
    const nodeRef = useRef(null);
    return (
        <Draggable handle=".modal-header" nodeRef={nodeRef}>
            <div
                ref={nodeRef}
                className="modal-dialog modal-fullscreen modal-dialog-scrollable"
                {...dlgProps}
                style={{
                    position: "fixed",
                    top: "0",
                    left: "0",
                    margin: "0",
                    zIndex: 1082,
                    width: "100%",
                    height: "100%",
                }}
            >
                <div className="modal-content" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>{children}</div>
            </div>
        </Draggable>
    );
};

export default DraggableFullscreenDialog;
