import React from "react";

// New official Saudi Riyal symbol (SAMA 2020).
// Two bold vertical strokes crossed by three horizontal bars,
// plus a shorter bar at the bottom — all rendered as a single fill shape.
const PATHS = [
    // Left stroke — tall, slight right-lean, with a right-curving hook at the bottom
    "M10 3 H27 L29 68 Q29 84 18 88 H6 Q7 78 17 76 H20 L18 68 Z",
    // Right stroke — shorter, no hook
    "M38 3 H55 L55 54 H38 Z",
    // Bar 1 (top)
    "M0 18 H76 V29 H0 Z",
    // Bar 2 (middle)
    "M0 39 H78 V50 H0 Z",
    // Bar 3 (lower)
    "M2 58 H74 V69 H2 Z",
    // Bottom separate bar
    "M20 85 H76 V96 H20 Z",
];

const VIEWBOX = "0 0 82 100";

export function RiyalSymbol({ size = "1.1em" }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox={VIEWBOX}
            width={size}
            height={size}
            fill="currentColor"
            style={{ verticalAlign: "middle", marginBottom: "0.1em", marginRight: "1px" }}
            aria-label="Saudi Riyal"
        >
            {PATHS.map((d, i) => <path key={i} d={d} />)}
        </svg>
    );
}

// Inline HTML string for Google Charts HTML tooltips
export const riyalHtml =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX}" ` +
    `width="12" height="14" fill="currentColor" ` +
    `style="vertical-align:middle;margin-bottom:1px;margin-right:1px">` +
    PATHS.map(d => `<path d="${d}"/>`).join("") +
    `</svg>`;
