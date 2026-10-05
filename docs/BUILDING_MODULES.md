# StartERP v2 — building a feature module

The app is React 18 + Vite + TypeScript. It talks to the unchanged Go API through same-origin
paths (`/v1/...`), proxied by Vite in dev/preview. Read this whole file before writing code.

## 1. Reference implementation — copy its patterns
`src/modules/sales/` (Sales invoices) is the reference module:
- `index.ts` — exports `routes: ModuleRoute[]` and `setup()` (Arabic strings, Ctrl+K search, "Create" actions).
  Modules are discovered automatically (`import.meta.glob('../modules/*/index.ts')`); never edit a shared registry.
- `invoices.tsx` — list page (`ListPage` config), editor (`DocumentEditor` config), view (`DocumentView` config).
- `print.tsx` — print views; `ar.ts` — Arabic strings keyed by the English text.
- `invoices.test.tsx` — functional tests (mocked API); `tests/integration/sales.test.ts` (live API);
  `tests/e2e/sales.spec.ts` (Playwright, all devices).

## 2. Building blocks (import, don't copy)
| Need | Use |
|---|---|
| List screen with views, search, filter chips, totals from `meta`, grid, export CSV, pagination, mobile cards | `framework/ListPage` (`ListConfig`) + `framework/filters` (`FilterDef`) |
| Simple master-data create/edit (categories, brands…) | `framework/EntityForm` (`FieldDef[]`), drawer or modal |
| Trade documents (lines + VAT + payments) | `framework/doc/DocumentEditor` (`DocConfig`), `DocumentView` (`ViewConfig`), `calc.ts` (all money math), `lookups.ts` (product/customer/vendor search) |
| Record page header/facets/tabs/side panel/stepper/document flow | `ui/ObjectPage` |
| Data hooks | `api/hooks`: `useList`, `useRecord`, `useSave`, `useRemove`; raw `api.get/post/put/del` from `api/client` |
| Auth/store/settings/permissions | `useAuth()` → `store`, `setting(key)`, `can(resource, action)`; `useStoreId()` |
| UI kit | `ui/Button`, `Pill/Tag`, `Card`, `Field/Input/Select/Textarea/Checkbox/SearchInput`, `Overlay` (`Modal`, `Drawer`), `Toast` (`useToast`), `Misc` (`Tabs`, `Segmented`, `EmptyState`, `ErrorState`, `Banner`, `useConfirm`, `Skeleton`), `AsyncPicker`, `DataGrid/Pager`, `charts/Charts` (`LineChart`, `VBars`, `HBars`, `Donut`, `Sparkline`, `Gauge`, `StackBar`, `Kpi`), `Icon` (names in `ui/icons.ts`) |
| Payment dialog | `framework/doc/ReceivePayment` |
| Formatting | `lib/format`: `fmtMoney`, `fmtDate`, `fmtDateTime`, `toApiDate` ("Jan 02 2006" for filters), `toRfc3339` (for `date_str`), `parseNumber` |
| Page title / workspace tab | `usePageMeta(title, icon)` (ListPage/DocumentView already call it) |
| Translations | `t('English text')` via `useTranslation()`; register Arabic with `registerArabic({...})` in `setup()` |

## 3. API rules (verified against the server — see specs in `/tmp/.../scratchpad/specs/*.md`)
- Every call needs `search[store_id]` — the hooks add it. View/update/delete need it in the query too.
- Lists: `search[field]`, `page`, `limit`, `sort=-field`, `select=a,b`. Totals (`meta`) only with `search[stats]=1`
  (ListPage sends it automatically when `summary` is configured).
- Dates in filters: `"Jan 02 2006"` (`toApiDate`). `date_str` on create/update: RFC3339 with offset (`toRfc3339`).
- Errors: `{status:false, errors:{field: message}}` → `ApiError.errors`; map them onto fields. Some handlers return
  HTTP 200 + `status:false` for validation errors, and some (e.g. product create) return `status:false` on success
  with a `result` — `api/client` already handles both.
- Never call endpoints the specs mark as broken/no-op (e.g. `DELETE /v1/order/{id}` is a no-op — don't show Delete).

## 4. Rules for parallel work (important)
- Only create/edit files inside **your module directories**, your `tests/integration/<yours>*.test.ts`, and your
  `tests/e2e/<yours>*.spec.ts`. Do NOT edit `src/framework`, `src/ui`, `src/shell`, `src/api`, `src/auth`,
  `src/app`, `src/styles`, `src/i18n`, configs or other modules. If you need a generic capability, build it inside
  your module (e.g. `src/modules/x/components/`) and mention it in your final report.
- Module CSS: put it in `src/modules/<x>/<x>.css` and import it from your components. Reuse design tokens
  (`var(--brand)`, `var(--surface)`, …) and existing classes (`card`, `pad`, `ph`, `grid-2c`, `fgrid`, `kv`, …).
- Routes must use the paths defined in `src/shell/nav.ts` (your assigned list) and set `navId` so permission and
  feature gating works. Detail pages: `<path>/:id`, editors `<path>/new` and `<path>/:id/edit`.
- Respect permissions: hide create/edit/delete when `can(resource, action)` is false.
- Every visible string goes through `t()`; add Arabic for all of them in your module's `ar.ts`.
- Use `bdi` around user-entered names in mixed-direction text; numbers use `className="num"`.

## 5. Quality bar
- ERP-grade UX: keyboard friendly (Enter/Escape/Ctrl+S where relevant), clear empty/loading/error states,
  confirmation before destructive actions, toasts with outcome, no layout overflow from 360px phones to 4K.
- Feature parity with the legacy app per the spec for your group (columns, filters, totals, forms, actions,
  settings flags). Skip only things the spec marks as dead/broken in the backend, and list them in your report.
- No `any` leaks into props where a type is easy; no console errors; no React warnings.

## 6. Tests you must write and run (all must pass)
1. **Unit** — pure logic (calculations, mappers, validators): `src/modules/<x>/**/*.test.ts`.
2. **Functional** — components with mocked API using `src/test/utils.tsx` (`mockApi`, `calls`, `renderApp`):
   list loads + filters send the right `search[...]`, forms validate, create/update POST/PUT the exact body,
   server errors map to fields, permission-hidden actions, empty/error states. Note the grid renders both a table
   and mobile cards in jsdom — scope queries (`within(table)`) or use `findAllBy…`.
3. **Integration** — `tests/integration/<x>.test.ts` against the live API (`npm run test:integration -- tests/integration/<x>.test.ts`);
   use `signIn()` / `loadSeed()` from `tests/integration/helpers.ts`. Cover list filters/sort/meta, create→read→update,
   validation errors, edge cases from the spec. Create your own fixture records; don't depend on other groups' data.
4. **E2E** — `tests/e2e/<x>.spec.ts` with `import { test, expect, login, expectNoHorizontalOverflow, isMobile } from './fixtures'`.
   Cover list → detail → create/edit flows, and `expectNoHorizontalOverflow` on each screen. Must work on phones
   (mobile cards, `.mbar` save bar, drawer nav) and desktops. Run against the dev server:
   `E2E_BASE_URL=http://localhost:3004 npx playwright test tests/e2e/<x>.spec.ts --project=desktop-1920 --project=ipad-portrait --project=iphone-14 --workers=2`
   (sessions are shared via the setup project; do not add sign-in tests — the API rate-limits logins).
Before finishing run: `npx tsc --noEmit -p .`, `npx eslint src/modules/<x> --max-warnings=0`, `npx vitest run src/modules/<x>`.

## 7. Environment
- Go API: http://127.0.0.1:2000 (already running). Login sirinibin2006@gmail.com / 123456.
- Seeded store: see `tests/.seed.json` (store GUO, products, customers, vendors, sales, purchases, quotations).
- Dev server with HMR: http://localhost:3004 (already running — don't start another on that port).
- If the API stops: run `/tmp/claude-0/-home-user/766160a3-a178-5d08-b210-d451e10abfca/scratchpad/services.sh`.
