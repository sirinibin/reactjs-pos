import { useState } from "react";
import Amount from "./amount.js";
import { trimTo2Decimals } from "../utils/numberUtils";
const StatsSummary = ({ title, stats, onToggle }) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleToggle = () => {
        setIsOpen(!isOpen);
        if (onToggle) {
            onToggle(!isOpen); // Notify parent about the toggle
        }
    };

    return (
        <div className="mb-3">
            <button
                className="btn btn-outline-primary mb-2"
                onClick={handleToggle}
            >
                {isOpen ? `Hide ${title} Summary` : `Show ${title} Summary`}
            </button>

            {isOpen && (
                <div className="border p-3 rounded bg-light">
                    <div className="row">
                        {Object.keys(stats).map((key, index) => (
                            <div className="col-md-6 mb-2" key={index}>
                                <div className="d-flex justify-content-between">
                                    <span>{key}:</span>
                                    <span className="badge bg-secondary">
                                        <Amount amount={trimTo2Decimals(stats[key])} />
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default StatsSummary;
