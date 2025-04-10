import React, { useRef, useEffect } from 'react';
import './ResizableCell.css';

const ResizableTableCell = ({ children }) => {
    const cellRef = useRef(null);

    useEffect(() => {
        const cell = cellRef.current;
        if (!cell) return;

        // Apply initial style
        cell.style.position = 'relative';
        cell.style.whiteSpace = 'nowrap'; // Prevent content from wrapping
        cell.style.overflow = 'hidden';
        cell.style.minWidth = '100px';
        cell.style.width = '150px'; // Initial width

        const resizer = document.createElement('div');
        resizer.className = 'resize-handle';
        cell.appendChild(resizer);

        let startX, startY, startWidth, startHeight;

        const onMouseDown = (e) => {
            e.preventDefault();
            startX = e.clientX;
            startY = e.clientY;
            startWidth = cell.offsetWidth;
            startHeight = cell.offsetHeight;

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };

        const onMouseMove = (e) => {
            const newWidth = startWidth + (e.clientX - startX);
            const newHeight = startHeight + (e.clientY - startY);

            cell.style.width = `${newWidth}px`;
            cell.style.height = `${newHeight}px`;
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        resizer.addEventListener('mousedown', onMouseDown);

        return () => {
            resizer.removeEventListener('mousedown', onMouseDown);
        };
    }, []);

    return (
        <td ref={cellRef} className="resizable-td">
            {children}
        </td>
    );
};

export default ResizableTableCell;
