import { useState } from "react";
import Amount from "./amount.js";
import { trimTo2Decimals } from "../utils/numberUtils";

const StatsSummary = ({ title, leftStats = {}, rightStats = {}, onToggle, defaultOpen }) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleToggle = () => {
        setIsOpen(!isOpen);
        if (onToggle) {
            onToggle(!isOpen);
        }
    };

    const renderStats = (stats) =>
        Object.entries(stats).map(([label, value], index) => (
            <div className="mb-2" key={index}>
                <div className="d-flex justify-content-between">
                    <span>{label}:</span>
                    <span className="badge bg-secondary">
                        <Amount amount={trimTo2Decimals(value)} />
                    </span>
                </div>
            </div>
        ));

    return (
        <div className="mb-3">
            {!defaultOpen && (
                <button
                    className="btn btn-outline-primary mb-2"
                    onClick={handleToggle}
                >
                    {isOpen ? `Hide ${title} Summary` : `Show ${title} Summary`}
                </button>
            )}

            {(isOpen || defaultOpen) && (
                <div className="border p-3 rounded bg-light">
                    <div className="row">
                        <div className="col-md-6">{renderStats(leftStats)}</div>
                        <div className="col-md-6">{renderStats(rightStats)}</div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StatsSummary;
