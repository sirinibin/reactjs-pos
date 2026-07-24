import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { useTableSettings } from "../useTableSettings";

const makeColumns = () => [
    { fieldName: "name", label: "Name", key: "name", visible: true },
    { fieldName: "price", label: "Price", key: "price", visible: true },
    { fieldName: "qty", label: "Qty", key: "qty", visible: false },
];

// Stable reference — must NOT be recreated per render, or the useEffect in
// useTableSettings (which lists defaultColumns as a dep) will loop forever.
const DEFAULT_COLS = makeColumns();

function Harness({ storageKey = "test-k", selectStorageKey, pendingStorageKey, enableSelection = false, pendingView = false, columns: colsProp }) {
    const defaultColumns = colsProp || DEFAULT_COLS;
    const { columns, handleToggleColumn, onDragEnd, restoreDefaults } = useTableSettings({
        storageKey, selectStorageKey, pendingStorageKey, defaultColumns, enableSelection, pendingView,
    });
    return (
        <div>
            <ul>
                {columns.map((col, i) => (
                    <li key={col.fieldName} data-testid={`col-${i}`} data-field={col.fieldName} data-vis={String(col.visible)}>
                        {col.fieldName}
                    </li>
                ))}
            </ul>
            <button data-testid="toggle-0" onClick={() => handleToggleColumn(0)}>T0</button>
            <button data-testid="toggle-1" onClick={() => handleToggleColumn(1)}>T1</button>
            <button data-testid="restore" onClick={restoreDefaults}>Restore</button>
            <button data-testid="drag-0-2" onClick={() => onDragEnd({ source: { index: 0 }, destination: { index: 2 } })}>D0→2</button>
            <button data-testid="drag-0-1" onClick={() => onDragEnd({ source: { index: 0 }, destination: { index: 1 } })}>D0→1</button>
            <button data-testid="drag-null" onClick={() => onDragEnd({ source: { index: 0 }, destination: null })}>null</button>
        </div>
    );
}

beforeEach(() => {
    localStorage.clear();
});

// ── initial state ─────────────────────────────────────────────────────────────

test("starts with defaultColumns when localStorage is empty", () => {
    render(<Harness storageKey="init-k" />);
    expect(screen.getByTestId("col-0")).toHaveAttribute("data-field", "name");
    expect(screen.getByTestId("col-1")).toHaveAttribute("data-field", "price");
    expect(screen.getByTestId("col-2")).toHaveAttribute("data-field", "qty");
});

test("initial visible flags match defaultColumns", () => {
    render(<Harness storageKey="vis-k" />);
    expect(screen.getByTestId("col-0").dataset.vis).toBe("true");
    expect(screen.getByTestId("col-2").dataset.vis).toBe("false");
});

// ── localStorage persistence ──────────────────────────────────────────────────

test("loads saved columns from localStorage", () => {
    const saved = [
        { fieldName: "name", label: "Name", key: "name", visible: false },
        { fieldName: "price", label: "Price", key: "price", visible: true },
        { fieldName: "qty", label: "Qty", key: "qty", visible: true },
    ];
    localStorage.setItem("saved-k", JSON.stringify(saved));
    render(<Harness storageKey="saved-k" />);
    expect(screen.getByTestId("col-0").dataset.vis).toBe("false");
    expect(screen.getByTestId("col-2").dataset.vis).toBe("true");
});

test("detects stale columns (label changed) and resets to defaults", () => {
    const stale = [
        { fieldName: "name", label: "OLD", key: "name", visible: false },
        { fieldName: "price", label: "Price", key: "price", visible: true },
        { fieldName: "qty", label: "Qty", key: "qty", visible: false },
    ];
    localStorage.setItem("stale-k", JSON.stringify(stale));
    render(<Harness storageKey="stale-k" />);
    // stale label → reset to defaults → name becomes visible again
    expect(screen.getByTestId("col-0").dataset.vis).toBe("true");
    const stored = JSON.parse(localStorage.getItem("stale-k"));
    expect(stored[0].label).toBe("Name");
});

// ── handleToggleColumn ────────────────────────────────────────────────────────

test("handleToggleColumn flips visibility of the given index", () => {
    render(<Harness storageKey="toggle-k" />);
    expect(screen.getByTestId("col-0").dataset.vis).toBe("true");

    fireEvent.click(screen.getByTestId("toggle-0"));
    expect(screen.getByTestId("col-0").dataset.vis).toBe("false");

    fireEvent.click(screen.getByTestId("toggle-0"));
    expect(screen.getByTestId("col-0").dataset.vis).toBe("true");
});

test("handleToggleColumn persists to localStorage", () => {
    render(<Harness storageKey="toggle-persist-k" />);
    fireEvent.click(screen.getByTestId("toggle-1"));
    const stored = JSON.parse(localStorage.getItem("toggle-persist-k"));
    expect(stored[1].visible).toBe(false);
});

test("handleToggleColumn does not mutate defaultColumns objects", () => {
    const cols = makeColumns();
    render(<Harness storageKey="mutate-k" columns={cols} />);
    fireEvent.click(screen.getByTestId("toggle-0"));
    // Original cols[0].visible must be unchanged
    expect(cols[0].visible).toBe(true);
});

// ── onDragEnd ─────────────────────────────────────────────────────────────────

test("onDragEnd reorders columns correctly (move 0 → 2)", () => {
    render(<Harness storageKey="drag-k" />);
    expect(screen.getByTestId("col-0")).toHaveAttribute("data-field", "name");

    fireEvent.click(screen.getByTestId("drag-0-2"));

    expect(screen.getByTestId("col-0")).toHaveAttribute("data-field", "price");
    expect(screen.getByTestId("col-1")).toHaveAttribute("data-field", "qty");
    expect(screen.getByTestId("col-2")).toHaveAttribute("data-field", "name");
});

test("onDragEnd reorders columns (move 0 → 1)", () => {
    render(<Harness storageKey="drag2-k" />);
    fireEvent.click(screen.getByTestId("drag-0-1"));
    expect(screen.getByTestId("col-0")).toHaveAttribute("data-field", "price");
    expect(screen.getByTestId("col-1")).toHaveAttribute("data-field", "name");
});

test("onDragEnd does nothing when destination is null", () => {
    render(<Harness storageKey="drag-null-k" />);
    fireEvent.click(screen.getByTestId("drag-null"));
    expect(screen.getByTestId("col-0")).toHaveAttribute("data-field", "name");
});

test("onDragEnd persists reordered columns to localStorage", () => {
    render(<Harness storageKey="drag-persist-k" />);
    fireEvent.click(screen.getByTestId("drag-0-1"));
    const stored = JSON.parse(localStorage.getItem("drag-persist-k"));
    expect(stored[0].fieldName).toBe("price");
});

// ── restoreDefaults ───────────────────────────────────────────────────────────

test("restoreDefaults resets to defaultColumns", () => {
    render(<Harness storageKey="restore-k" />);
    fireEvent.click(screen.getByTestId("toggle-0"));
    expect(screen.getByTestId("col-0").dataset.vis).toBe("false");

    fireEvent.click(screen.getByTestId("restore"));
    expect(screen.getByTestId("col-0").dataset.vis).toBe("true");
});

test("restoreDefaults persists defaults to localStorage", () => {
    render(<Harness storageKey="restore-persist-k" />);
    fireEvent.click(screen.getByTestId("toggle-0"));
    fireEvent.click(screen.getByTestId("restore"));
    const stored = JSON.parse(localStorage.getItem("restore-persist-k"));
    expect(stored[0].visible).toBe(true);
});

// ── key switching ─────────────────────────────────────────────────────────────

test("uses selectStorageKey when enableSelection=true", () => {
    const saved = makeColumns().map(c => ({ ...c, visible: false }));
    localStorage.setItem("sel-k", JSON.stringify(saved));
    render(<Harness storageKey="base-k" selectStorageKey="sel-k" enableSelection />);
    expect(screen.getByTestId("col-0").dataset.vis).toBe("false");
});

test("uses pendingStorageKey when pendingView=true", () => {
    const saved = makeColumns().map(c => ({ ...c, visible: false }));
    localStorage.setItem("pend-k", JSON.stringify(saved));
    render(<Harness storageKey="base-k" pendingStorageKey="pend-k" pendingView />);
    expect(screen.getByTestId("col-0").dataset.vis).toBe("false");
});
