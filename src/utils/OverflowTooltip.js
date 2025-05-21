import React, { useState, useEffect, useRef } from "react";
import { Tooltip } from "bootstrap";
import { Copy, Check } from "lucide-react";
import "./OverflowTooltip.css";

const OverflowTooltip = ({ value, maxWidth = 250, hideCopyIcon = false, accountNumber, debit }) => {
    const tooltipRef = useRef(null);
    const tooltipInstance = useRef(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (tooltipRef.current) {
            tooltipInstance.current = new Tooltip(tooltipRef.current, {
                title: value,
                trigger: "manual",
                placement: "top",
            });
        }
        return () => {
            if (tooltipInstance.current) {
                tooltipInstance.current.dispose();
            }
        };
    }, [value]);

    const showTooltip = () => {
        tooltipInstance.current?.show();
    };

    const hideTooltip = () => {
        tooltipInstance.current?.hide();
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="overflow-tooltip-container" style={{ maxWidth: `${maxWidth}px` }}>
            <div
                ref={tooltipRef}
                className="overflow-tooltip"
                onMouseEnter={() => {
                    showTooltip();
                }}
                onMouseLeave={hideTooltip}
            >
                {value}
                {!hideCopyIcon && <button className="copy-btn" onClick={copyToClipboard}>
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>}
                {copied && <span className="copied-text">Copied!</span>}
            </div>
        </div>
    );
};

export default OverflowTooltip;
