import React from "react";
import { render, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// ── react-i18next ──────────────────────────────────────────────────────────────
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

// ── react-bootstrap ────────────────────────────────────────────────────────────
jest.mock("react-bootstrap", () => {
  const Button = ({ children, onClick, disabled }) =>
    children || null;
  const Spinner = () => null;

  const Dropdown = ({ children }) => children || null;
  Dropdown.Toggle = ({ children, onClick }) => children || null;
  Dropdown.Menu = ({ children }) => children || null;
  Dropdown.Item = ({ children, onClick }) => children || null;
  Dropdown.Divider = () => null;

  return { Button, Spinner, Dropdown };
});

// ── react-bootstrap-typeahead ──────────────────────────────────────────────────
jest.mock("react-bootstrap-typeahead", () => {
  // eslint-disable-next-line no-shadow
  const React = require("react");
  return {
    Typeahead: React.forwardRef(function Typeahead(_props, _ref) {
      return null;
    }),
  };
});

// ── react-router-dom: keep MemoryRouter real, mock hooks ──────────────────────
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useHistory: () => ({ push: jest.fn() }),
  useParams: () => ({}),
  useLocation: () => ({ pathname: "/" }),
}));

// ── child domain components (all accept a forwarded ref) ──────────────────────
jest.mock("../create.js", () => {
  // eslint-disable-next-line no-shadow
  const React = require("react");
  return React.forwardRef(function VehicleCreate(_props, _ref) {
    return null;
  });
});
jest.mock("../view.js", () => {
  // eslint-disable-next-line no-shadow
  const React = require("react");
  return React.forwardRef(function VehicleView(_props, _ref) {
    return null;
  });
});
jest.mock("../../customer/create.js", () => {
  // eslint-disable-next-line no-shadow
  const React = require("react");
  return React.forwardRef(function CustomerCreate(_props, _ref) {
    return null;
  });
});
jest.mock("../../repair_job/create.js", () => {
  // eslint-disable-next-line no-shadow
  const React = require("react");
  return React.forwardRef(function RepairJobCreate(_props, _ref) {
    return null;
  });
});
jest.mock("../../quotation/QuotationType3Form.js", () => {
  // eslint-disable-next-line no-shadow
  const React = require("react");
  return React.forwardRef(function QuotationType3Form(_props, _ref) {
    return null;
  });
});
jest.mock("../../order/create.js", () => {
  // eslint-disable-next-line no-shadow
  const React = require("react");
  return React.forwardRef(function OrderCreate(_props, _ref) {
    return null;
  });
});

// ── utils ──────────────────────────────────────────────────────────────────────
jest.mock("../../utils/OverflowTooltip.js", () =>
  function OverflowTooltip({ value }) {
    return value || null;
  }
);
jest.mock("../../utils/queryUtils.js", () => ({
  ObjectToSearchQueryParams: jest.fn(() => ""),
}));
jest.mock("../../utils/storeUtils.js", () => ({
  fetchStore: jest.fn(() => Promise.resolve({})),
}));
jest.mock("../../utils/PaginationControls.js", () =>
  function PaginationControls() {
    return null;
  }
);
jest.mock("../../utils/useTableSettings.js", () => ({
  useTableSettings: () => ({
    columns: [
      { key: "vehicle_number", label: "Vehicle #",     fieldName: "vehicle_number", visible: true },
      { key: "brand_model",    label: "Brand / Model", fieldName: "brand_model",    visible: true },
      { key: "year",           label: "Year",          fieldName: "year",           visible: false },
      { key: "customer",       label: "Customer",      fieldName: "customer",       visible: true },
      { key: "istimara_no",    label: "Istimara No.",  fieldName: "istimara_no",    visible: true },
      { key: "chassis",        label: "Chassis #",     fieldName: "chassis",        visible: true },
      { key: "km",             label: "KM",            fieldName: "km",             visible: true },
      { key: "color",          label: "Color",         fieldName: "color",          visible: false },
      { key: "created_at",     label: "Created At",    fieldName: "created_at",     visible: false },
      { key: "actions",        label: "Actions",       fieldName: "actions",        visible: true },
    ],
    showSettings: false,
    setShowSettings: jest.fn(),
    handleToggleColumn: jest.fn(),
    onDragEnd: jest.fn(),
    restoreDefaults: jest.fn(),
  }),
}));
jest.mock("../../utils/TableSettingsModal.js", () =>
  function TableSettingsModal() {
    return null;
  }
);

// ── subject ────────────────────────────────────────────────────────────────────
import VehicleIndex from "../index.js";

// ── test lifecycle ─────────────────────────────────────────────────────────────
beforeAll(() => {
  jest.useFakeTimers();
});

beforeEach(() => {
  localStorage.setItem("access_token", "test-token");
  localStorage.setItem("store_id", "store-001");

  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    headers: { get: () => "application/json" },
    json: () =>
      Promise.resolve({
        result: [],
        data: [],
        total_count: 0,
        store: {},
        settings: {},
      }),
  });
});

afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
  localStorage.clear();
});

// ── tests ──────────────────────────────────────────────────────────────────────
describe("VehicleIndex smoke test", () => {
  test("renders without crashing", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <VehicleIndex showToastMessage={jest.fn()} />
        </MemoryRouter>
      );
    });
  });

  test("renders the Vehicles heading", async () => {
    let getByText;
    await act(async () => {
      ({ getByText } = render(
        <MemoryRouter>
          <VehicleIndex showToastMessage={jest.fn()} />
        </MemoryRouter>
      ));
    });
    expect(getByText("Vehicles")).toBeTruthy();
  });

  test("renders the Create button", async () => {
    let getByText;
    await act(async () => {
      ({ getByText } = render(
        <MemoryRouter>
          <VehicleIndex showToastMessage={jest.fn()} />
        </MemoryRouter>
      ));
    });
    expect(getByText("Create")).toBeTruthy();
  });
});
