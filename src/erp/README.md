# StartERP UI (src/erp)

The new ERP-grade frontend. It replaces the classic screens one module at a
time; any screen not rebuilt yet keeps running unchanged inside the new shell.
The API is not changed: every request matches what the classic screens send.

## Layout

| Folder | What lives there |
|---|---|
| `theme/` | Design tokens (`tokens.css`), component styles (`erp.css`), and `legacy-bridge.css`, which only recolours classic screens so they fit the shell |
| `ui/` | Design-system components: Button, Field/Input/Select, Modal/Drawer/ConfirmDialog, Toast, DataGrid, Pagination, filters, ColumnChooser, Menu, KeyValue, Tabs |
| `shell/` | App frame: grouped side navigation, header (hosts the classic Topbar for store switching, notifications and the user menu), Ctrl+K command palette, footer |
| `api/` | `client.js` (fetch wrapper, `search[field]=` query building, error envelope) and `resource.js` (list/get/create/update/remove/restore per REST resource) |
| `hooks/` | `useServerList` (paging, sort, filters, stale-response protection), `useColumnPrefs`, `useDebouncedValue` |
| `crud/` | `CrudPage` + `CrudForm` + `CrudView`: config-driven list → view → create/edit → delete/restore for master data |
| `modules/` | Per-module configs and pages |

## Rebuilt so far

| Route | Module |
|---|---|
| `/` | Login |
| every `/dashboard/*` route | New shell (navigation, header, footer) |
| `/dashboard/product_brand` | Product Brands |
| `/dashboard/product_category` | Product Categories |
| `/dashboard/expense_category` | Expense Categories |
| `/dashboard/service_category` | Service Categories |

## Tests

| Layer | Where | Run |
|---|---|---|
| Unit | `src/erp/__tests__/unit` | `CI=true npx react-scripts test --watchAll=false --testPathPattern=src/erp/__tests__/unit` |
| Functional (components) | `src/erp/__tests__/functional` | same, `--testPathPattern=src/erp/__tests__/functional` |
| Integration (pages against a mocked API contract, MSW) | `src/erp/__tests__/integration` | same, `--testPathPattern=src/erp/__tests__/integration` |
| API compatibility (live pos-rest) | `e2e/api` | `cd e2e && npm install && npx playwright test --project=api` |
| End-to-end UI (browser, live API) | `e2e/ui` | `cd e2e && npx playwright test --project=ui` |

The e2e suites need the Go API on `http://localhost:2000` (MongoDB + Redis
running) and the dev server on `http://localhost:3004`. Override with
`E2E_API_URL`, `E2E_UI_URL`, `E2E_EMAIL` and `E2E_PASSWORD`. The test user
must have at least one store.
