import React from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// ---------------------------------------------------------------------------
// CSS / asset mocks
// ---------------------------------------------------------------------------
jest.mock("react-datepicker/dist/react-datepicker.css", () => ({}));

// ---------------------------------------------------------------------------
// react-datepicker
// ---------------------------------------------------------------------------
jest.mock("react-datepicker", () => () => null);

// ---------------------------------------------------------------------------
// react-bootstrap  (Button + Spinner used in this file)
// ---------------------------------------------------------------------------
jest.mock("react-bootstrap", () => ({
  Button: ({ children, ...props }) => {
    const React = require("react");
    return React.createElement("button", props, children);
  },
  Spinner: () => null,
}));

// ---------------------------------------------------------------------------
// react-bootstrap-typeahead
// ---------------------------------------------------------------------------
jest.mock("react-bootstrap-typeahead", () => ({
  Typeahead: require("react").forwardRef((_props, _ref) => null),
}));

// ---------------------------------------------------------------------------
// react-router-dom — keep MemoryRouter real, stub hooks
// ---------------------------------------------------------------------------
jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return {
    ...actual,
    useHistory: () => ({ push: jest.fn(), replace: jest.fn() }),
    useParams: () => ({}),
    useLocation: () => ({ pathname: "/" }),
  };
});

// ---------------------------------------------------------------------------
// react-i18next
// ---------------------------------------------------------------------------
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

// ---------------------------------------------------------------------------
// kanban_utils — plain functions to avoid jest.fn hoisting issues
// ---------------------------------------------------------------------------
jest.mock("../kanban_utils.js", () => ({
  loadKanbanLists: () => [
    { id: "todo", name: "ToDo", color: "#0052cc" },
    { id: "in_progress", name: "In Progress", color: "#ff8b00" },
    { id: "done", name: "DONE", color: "#00875a" },
  ],
  loadCardMap: () => ({}),
  saveCardMap: () => {},
  statusToDefaultListId: () => "todo",
}));

// ---------------------------------------------------------------------------
// child domain components — all use forwardRef in source
// ---------------------------------------------------------------------------
jest.mock("../create.js", () =>
  require("react").forwardRef((_props, _ref) => null)
);
jest.mock("../view.js", () =>
  require("react").forwardRef((_props, _ref) => null)
);
jest.mock("../kanban.js", () =>
  require("react").forwardRef((_props, _ref) => null)
);

jest.mock("../card_view.js", () => ({
  __esModule: true,
  default: require("react").forwardRef((_props, _ref) => null),
  loadKanbanLists: () => [
    { id: "todo", name: "ToDo", color: "#0052cc" },
    { id: "in_progress", name: "In Progress", color: "#ff8b00" },
    { id: "done", name: "DONE", color: "#00875a" },
  ],
  loadCardMap: () => ({}),
  saveCardMap: () => {},
  statusToDefaultListId: () => "todo",
}));

jest.mock("../../quotation/QuotationType3Form.js", () =>
  require("react").forwardRef((_props, _ref) => null)
);
jest.mock("../../quotation/view.js", () =>
  require("react").forwardRef((_props, _ref) => null)
);
jest.mock("../../order/create.js", () =>
  require("react").forwardRef((_props, _ref) => null)
);
jest.mock("../../order/preview.js", () =>
  require("react").forwardRef((_props, _ref) => null)
);
jest.mock("../../product/create.js", () =>
  require("react").forwardRef((_props, _ref) => null)
);
jest.mock("../../service/create.js", () =>
  require("react").forwardRef((_props, _ref) => null)
);

// ---------------------------------------------------------------------------
// utils — plain functions to avoid jest.fn hoisting issues
// ---------------------------------------------------------------------------
jest.mock("../../utils/queryUtils.js", () => ({
  ObjectToSearchQueryParams: () => "",
}));

jest.mock("../../utils/storeUtils.js", () => ({
  fetchStore: () => Promise.resolve({}),
}));

jest.mock("../../utils/PaginationControls.js", () => () => null);

jest.mock("../../utils/useTableSettings.js", () => ({
  useTableSettings: () => ({
    columns: [
      { key: "date", label: "Date", fieldName: "date", visible: true },
      { key: "job", label: "Job", fieldName: "job", visible: true },
      { key: "vehicle", label: "Vehicle", fieldName: "vehicle", visible: true },
      { key: "customer", label: "Customer", fieldName: "customer", visible: true },
      { key: "technician", label: "Technician", fieldName: "technician", visible: true },
      { key: "status", label: "Status", fieldName: "status", visible: true },
      { key: "open_closed", label: "Open/Closed", fieldName: "open_closed", visible: true },
      { key: "est_delivery", label: "Est. Delivery", fieldName: "est_delivery", visible: true },
      { key: "km", label: "KM", fieldName: "km", visible: false },
      { key: "labour", label: "Labour", fieldName: "labour", visible: false },
      { key: "parts", label: "Parts", fieldName: "parts", visible: false },
      { key: "total", label: "Net Total", fieldName: "total", visible: true },
      { key: "actions", label: "Actions", fieldName: "actions", visible: true },
    ],
    showSettings: false,
    setShowSettings: () => {},
    handleToggleColumn: () => {},
    onDragEnd: () => {},
    restoreDefaults: () => {},
  }),
}));

jest.mock("../../utils/TableSettingsModal.js", () => () => null);

// ---------------------------------------------------------------------------
// subject under test (import after all mocks are declared)
// ---------------------------------------------------------------------------
import RepairJobIndex from "../index.js";

// ---------------------------------------------------------------------------
// test suite
// ---------------------------------------------------------------------------
describe("RepairJobIndex smoke test", () => {
  beforeEach(() => {
    jest.useFakeTimers();

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => "application/json" },
      json: () =>
        Promise.resolve({
          result: [],
          total_count: 0,
          store: {},
          settings: {},
        }),
    });

    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it("renders without crashing in table mode (default)", () => {
    const { container } = render(
      <MemoryRouter>
        <RepairJobIndex showToastMessage={jest.fn()} />
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });

  it("renders without crashing in board mode", () => {
    const { container } = render(
      <MemoryRouter>
        <RepairJobIndex showToastMessage={jest.fn()} defaultMode="board" />
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });
});
