# StartERP — Master Development Prompt

> Paste this whole document into a Claude Code session (with **both** repositories attached:
> `sirinibin/reactjs-pos` and `sirinibin/pos-rest`) to drive the rebuild.
> The companion files in this folder are part of the prompt:
> - `FRONTEND_INVENTORY.md`: A–Z inventory of the current React app (every module, form input, list column, print feature).
> - `BACKEND_INVENTORY.md`: A–Z inventory of the current Go API (every route, model, collection, ZATCA flow, counter).
> - `prototypes/`: the approved HTML prototype. It is the visual source of truth once a variant is chosen.

---

## 0. Role

You are a principal engineer and product designer leading a small elite team. You are rebuilding
**Start POS** into **StartERP**, a multi-tenant, subscription-based, ERP-grade SaaS platform for
the Saudi Arabian market. You own architecture, UI/UX quality, ZATCA compliance, test automation
and delivery. Work in small, fully tested, deployable increments. Never trade correctness for
speed, and never break existing customer data.

## 1. Mission

Deliver StartERP so that:

1. **Every feature of the current app still works.** Use the inventories as the checklist; no
   form input may be dropped.
2. **It runs on the existing MongoDB data unchanged.** That means main DB `pos` plus per-store DBs
   `store_<STORE_ID>`.
3. **It looks and feels like a top-tier modern ERP** (Fiori/Redwood/Odoo-17/Linear-level craft) in
   Arabic (RTL) and English, on every device class.
4. **New businesses can self-serve:** sign up, get a 15-day trial, then subscribe by bank
   transfer with receipt upload and admin approval.
5. **Every invoice is ZATCA Phase 2 compliant.**
6. **It prints professionally** to any invoice printer and any barcode-label printer, in every
   common size.
7. **It ships touch-screen POS terminals** for 7 business verticals.
8. **Every feature is covered by automated tests**, and those tests pass before the next feature
   starts.

## 2. Non-negotiable rules

### 2.1 Data compatibility (highest priority)
- **Golden rule (owner decision):** never rename, remove or retype any existing database, collection
  or field name. This covers the main DB, `store_<id>` DBs, bson keys, embedded-document keys,
  index names that code depends on, and Redis key patterns.
  - You may **add** new collections, fields, indexes and Redis keys.
  - Any change that seems to need a rename is done as **add a new field, dual-write, keep reading
    the old one**. The old field stays forever.
- **Main DB.** It is named by `MONGO_DB` (`pos` in production) and holds `store`, `user`,
  `customer_package`, `admin_settings`, the RFQ/procurement collections and the BI settings.
- **Per-store DBs.** Each is named `store_<storeHex>` and holds every transactional and master
  collection (see `BACKEND_INVENTORY.md §2`).
- **Keep existing names exactly**, including the misspellings:
  - fields `divident`, `produc_id`, `receivabale_title`
  - collections `salesreturn`, `purchasereturn`, `customerdeposit`, `customerwithdrawal`,
    `capitalwithdrawal`, `stocktransfer`
  - the malformed `simplified_debit_note` bson tag: read both keys, write the existing one.
- **Schema changes must be additive.** New fields need defaults that reproduce today's behaviour
  when missing. No destructive migrations.
- **Back up before migrating.** Every migration is idempotent, has a dry-run mode, and is tested
  against a copy of production-shaped data before it runs.
- **Keep the existing Redis counter keys and ICV semantics.** Changing them would break invoice
  numbering and the ZATCA chain for live stores (see §8.4).
- **Keep all existing v1 API contracts.** The current frontend and the MCP/BI clients must keep
  working. New capabilities go under new routes or as additive fields. Use `/v2/` routes only
  when a breaking shape is unavoidable.

### 2.1c Old data must work as-is in StartERP (owner decision)
The new system adapts to the old data, never the other way round.

- **Read every legacy shape.**
  - Missing fields, nulls, old enum values, numbers stored as strings or ints (`FlexInt`), empty
    arrays.
  - Legacy top-level store flags that are duplicated under `settings`: read `settings.x`, fall back
    to top-level `x`.
  - Old embedded structures and legacy collections (`order_item`, `sales_return_item`).
  - Documents created by older app versions without `uuid`, `hash`, `zatca`, `payments[]`,
    `product_stores` or `stores{}` maps.
- **Defaults reproduce old behaviour.** Every new setting or field, when absent, behaves exactly
  as the current app does.
- **Old documents are fully usable:**
  - viewable and printable with the same numbers, totals, VAT, rounding and QR as originally
    issued; never recalculated on read
  - payable, returnable within remaining quantity, and reportable
  - visible in every list, filter, report, statement, ledger and BI view
- **Old and new documents interleave.** They share the same serial counters (Redis keys
  unchanged), the same ledger/postings, the same product and customer/vendor stats maps, and the
  same ZATCA chain for already-onboarded stores.
- **Both apps can run side by side.** The old React app and StartERP can run against the same
  database during the transition, so every write StartERP makes is something the old app can still
  read and display.
- **Compatibility test suite** (blocking in CI):
  - An anonymised snapshot of real production-shaped data: main `pos` DB plus several
    `store_<id>` DBs from different store types, including the oldest stores.
  - Golden tests: open, print and recompute totals for N historical invoices of every type, and
    the totals must equal the stored values.
  - Every list endpoint returns all historical documents.
  - Ledger and trial balance match the old app's figures.
  - A write made by StartERP is readable by the old app's API code paths.

### 2.1a UI naming of legacy entities (owner decision)
| DB collection / model | UI name (EN) | UI name (AR) | ZATCA type |
|---|---|---|---|
| `customerdeposit` (CustomerDeposit, old UI "Receivables") | **Debit Note** | إشعار مدين | 381 |
| `customerwithdrawal` (CustomerWithdrawal, old UI "Payables") | **Credit Note** | إشعار دائن | 383 |

Only labels change: nav, page titles, forms, lists, print templates, emails and reports. Collection
names, API routes (`/v1/customer-deposit…`, `/v1/customer-withdrawal…`), Redis counters and
existing serial-number prefixes stay unchanged. Store invoice-title settings (`receivabale_title`,
`payable_title`) default to "Debit Note" / "Credit Note" when empty. Sales returns stay labelled
"Sales Return" but are typed as credit notes (383) in ZATCA views.

### 2.1b Drafts and work-in-progress data live in SEPARATE collections (owner decision)
Today `src/utils/useDraft.js` POSTs/PUTs drafts into the **real** collections (`order`,
`quotation`, `purchase`) with `status: "draft"`. That mixes unfinished data with posted documents
and can affect counters, stock, ledger, reports and ZATCA. StartERP must not do this.

- **One draft collection per document type**, in the store DB: `order_draft`, `quotation_draft`,
  `purchase_draft`, `salesreturn_draft`, `purchasereturn_draft`, `delivery_note_draft`,
  `purchase_order_draft`, `quotation_sales_return_draft`, `customerdeposit_draft`,
  `customerwithdrawal_draft`, `stocktransfer_draft`, and `pos_cart_draft` for POS held carts.
- **A draft document holds:** `_id`, `store_id`, `doc_type`, `payload` (the full form state as the
  create API expects it), `title` or summary (customer, net total, line count), `created_by`,
  `updated_by`, `created_at`, `updated_at`, `expires_at` (optional TTL index), and `device_id`.
- **Dedicated routes:** `GET/POST /v1/drafts/{doc_type}`, `GET/PUT/DELETE /v1/drafts/{doc_type}/{id}`.
  - These routes **never** call the real create path.
  - They never allocate serial numbers, ICV or UUID.
  - They never touch stock, postings/ledger, customer/vendor/product stats, dashboards or ZATCA.
- **Finalize.** Validate the payload, then run the normal create endpoint (same validation, same
  side effects). On success, delete the draft in the same request; use a transaction when the
  replica set allows it, otherwise delete after the create commits. If the create fails, the draft
  stays untouched.
- **Never mix the two.** All list, report, BI, MCP and ZATCA queries on real collections must stay
  free of draft data. Add a regression test that creating, updating and deleting drafts changes no
  count, stock or counter.
- **Legacy drafts stay where they are.** Existing `status: "draft"` documents in `order`,
  `quotation` and `purchase` are **not moved, copied out or deleted**.
  - The draft list shows them alongside new drafts, through a read adapter, labelled "Legacy draft".
  - Finalizing a legacy draft uses the same path the old app uses today.
  - Real-collection queries keep excluding `status: "draft"` exactly as today.
  - Only **new** drafts go to `*_draft` collections.
- **General rule:** the same separation applies to any future work-in-progress feature, such as
  POS parked orders, import staging rows, quotation revisions and approval requests. They get their
  own collections and never get a status flag on a posted-document collection.

### 2.2 Branches and deploy
- Development branch for StartERP is `v3`. Create it from `v2` in both repos.
  - `v3` is a new product line. Follow the CLAUDE.md branch isolation rule: no merge, cherry-pick or
    rebase between `v3` and `master`/`test`/`v2`.
  - The only exception is copying `.github/workflows/*.yml` to `master`.
- Progress environment: `https://startpos-v2.gulfunionozone.com` (frontend) and
  `https://startpos-api-v2.gulfunionozone.com` (API, service `start-api-v2`, port 2004).
  - Point the existing `deploy_v2.sh` / `deploy_v2.yml` at `v3`, or add `deploy_v3.*`.
  - Confirm the choice with the owner before the first deploy.
- Deploy gates (kept from CLAUDE.md): clean git tree, all tests green, zero build warnings, and
  zero `go build` output.
- After each feature: commit frontend and backend, push to `v3`, deploy to the v2/v3 environment,
  and post a short changelog.

### 2.3 Quality gates per feature (Definition of Done)
A feature is **done** only when all of these hold:
1. The UI matches the approved prototype and the design system, in both EN and AR (RTL), and in
   light and dark themes.
2. It is responsive at 360, 390, 768, 1024, 1280, 1440 and 1920px, with no horizontal page scroll.
3. Unit, component, API, integration and e2e tests are written and green, including corner cases
   (see §12).
4. Accessibility passes: axe has no serious or critical violations, keyboard paths work, and
   focus states are visible.
5. Performance budget holds: LCP < 2.5s on 4G, list API p95 < 300ms on 10k-row stores, and POS
   add-to-cart < 50ms.
6. Old-data regression passes: the feature works on a fixture DB cloned from real store shapes,
   including stores with legacy/missing fields.
7. Docs are updated: user help text, API OpenAPI spec, and CHANGELOG.

Do **not** start the next feature until the current one meets the DoD.

## 3. Target architecture

### 3.1 Backend: evolve, don't rewrite (Go, `pos-rest`)
- Keep Go, gorilla/mux, the Mongo driver, Redis and the existing models.
- Add new packages and endpoints for tenancy, subscriptions, notifications, printing profiles,
  label templates, system email, and POS terminals/shifts.
- **Mandatory hardening:**
  - Remove the process-global `models.UserObject` / `TokenClaimsObject`. Pass the user through
    `context.Context` (it is a data race today).
  - Require `ACCESS_SECRET` from env; refuse to start with the default `"1234"` outside dev.
  - Remove the hard-coded admin seed. Use a one-time bootstrap CLI command instead.
  - Remove committed TLS keys and binaries from the repo.
  - Fix route shadowing (`/stock-transfer/history`, `/non-vat-sales/history`,
    `/vendor/vat_no/name` registered after `/{id}`).
  - Add the missing `/dashboard/salaries` outer route on the frontend.
  - Reduce access-token lifetime: 15-60 min access token plus rotating refresh tokens, with device
    session list and revoke.
  - Enforce RBAC server-side for **every** resource. Today only `user_roles` is enforced.
  - Add audit logging for sensitive actions: price changes, deletes, ZATCA actions, and
    subscription approvals.
- ZATCA: keep the working Go UBL builder.
  - Either keep the Python signer behind a hardened, queue-based worker, or port signing to Go
    (`crypto/ecdsa` secp256k1, XAdES, C14N11). Do it behind the same interface, with golden-file
    tests proving byte-identical hashes.

### 3.2 Frontend: new app shell (new code in `reactjs-pos` on `v3`, e.g. `apps/starterp/`)
- **Core stack:** React 18 + TypeScript (strict) + Vite.
- **Routing and data:** React Router 6 (data routers), TanStack Query (server cache), TanStack
  Table (virtualized grids), React Hook Form + Zod (forms and validation shared with API types).
- **Design system:** a headless primitives layer (Radix UI) plus our own token-driven components.
  - Tailwind with CSS variables for tokens.
  - Logical properties throughout for RTL.
- **i18n:** i18next with ICU, full RTL, Arabic-Indic digit option, Hijri date display option
  (Gregorian stored), and the SAR currency symbol.
- **Charts:** ECharts or Visx, themed by tokens.
- **PWA:** installable POS with an offline queue for POS sales (IndexedDB) and sync with
  conflict rules.
- Reuse logic, not UI, from the old app: calculation utils, ZATCA TLV, number/date utils. Port
  them to TS with their existing tests.
- The old app stays deployable until StartERP reaches parity (strangler pattern). The API is
  shared.

### 3.3 Multi-tenancy model (additive)
New main-DB collections:

| Collection | Purpose |
|---|---|
| `workspace` | Tenant / company. `_id`, name EN/AR, owner_user_id, vat_no, crn, business_type, status (`trial` \| `active` \| `past_due` \| `expired` \| `suspended` \| `cancelled`), trial_started_at, trial_ends_at, current_plan_id, current_period_start/end, addons[], limits snapshot, created_at… |
| `plan` | Plan catalogue: code, names EN/AR, price_monthly, price_yearly, limits (branches, users, terminals, products, storage_gb), features[] (feature flags), sort, active |
| `subscription_payment` | Bank-transfer submissions: workspace_id, plan_id, period (monthly/yearly), addons, amount_ex_vat, vat, amount_inc_vat, transfer_reference, payer_bank, transfer_date, receipt_file_url (image/PDF), status (`pending` \| `approved` \| `rejected`), reviewed_by, reviewed_at, rejection_reason, note |
| `subscription_invoice` | ZATCA-compliant tax invoices **issued by StartERP** to the tenant on approval |
| `notification` | user_id/role target, type, title/body EN/AR, link, read_at (powers the header bell; push over the existing WebSocket) |
| `system_email_settings` | Platform-level provider config plus transactional templates |
| `print_profile`, `label_template` | Printer profiles and label designs. Store DB if per store, main DB for platform defaults |
| `pos_terminal`, `pos_shift` | Store DB: terminal registry (EGS link, printer profile, cash drawer), shifts with opening/closing cash and the Z-report |

Rules:
- `store.workspace_id` links stores to a workspace. `user.workspace_ids[]` links users.
- **Legacy stores need zero data rewrite.**
  - A store without `workspace_id` resolves at runtime to a virtual "Legacy" workspace: status
    `active`, plan `legacy-grandfathered`, all features, no expiry.
  - Nothing is written to legacy documents until the owner explicitly links the store to a
    workspace in Platform Admin. That link only **adds** `workspace_id`.
  - Existing users keep logging in exactly as today, with the same credentials, roles,
    `store_ids` and RBAC.
- Entitlement checks are one middleware: `RequireFeature("purchase_order")`, `RequireLimit("users")`.
  - They are mirrored in the frontend via `/v1/me/entitlements`.
  - The current `customer_package.tab_ids` mechanism maps into plan features. Keep it working.

## 4. Feature scope: A–Z parity checklist

Everything in `FRONTEND_INVENTORY.md §2` and `BACKEND_INVENTORY.md §1` must exist in StartERP. Areas:

- **Accounts & Trial Balance**: accounts list, trial balance, ledger (journal), postings (balance
  sheet / statements, 2 designs, A4 print).
- **Analytics & BI**: business dashboard, workshop dashboard, BI reports (monthly revenue, top
  products/customers, expense summary, outstanding, stock alerts, vendor performance, quotation
  conversion, ABC/XYZ, churn, CLV, cohort retention, sales trends, hourly/daily sales, return
  rate, customers over credit) and statistics summaries on every list.
- **Arabic names dictionary**; auto-translate to Arabic (Google Translate).
- **Capital, capital withdrawals, drawings (`divident`)**.
- **Customers** (with national address, credit limit/balance, pending invoices, opening balances,
  images, remarks-in-sales) and **Debit Notes** (DB `customerdeposit`) / **Credit Notes** (DB
  `customerwithdrawal`) with ZATCA reporting. See §2.1a.
- **Customer packages**. These become plans/feature bundles; see §3.3.
- **Delivery notes** (with reminders) and **stock transfers** between warehouses.
- **Employees, salaries, salary dues.**
- **Expenses and expense categories.**
- **Non-VAT sales and returns.**
- **Procurement / AI RFQ bot**: RFQ received/suppliers, email (IMAP/Gmail/Outlook/Zoho) and
  WhatsApp (Evolution, Meta WABA) ingestion, LLM extraction, purchase bills.
  - Plan-gated: Enterprise or the AI add-on.
- **Products** (sets/linked products, multi-store pricing, warehouse stock and racks, stock
  adjustments, images, full history modals), **brands**, **categories**, **services** and
  **service categories**.
- **Purchases, purchase returns, purchase orders, purchase requests**, with payments and cash
  discounts.
- **Quotations**, "Qtn. sales" invoices and quotation sales returns, with payments; import from
  sales/purchases/P.O.
- **Repair jobs** (Kanban) and **vehicles** (automobile module); sales from repair jobs.
- **Roles (RBAC)**: resource × read/create/update/delete.
- **Sales** (5 form layouts become one adaptive form with layout presets: Classic, Compact,
  Workshop, Van/mobile) with payments, cash discount, commission, drafts (separate `*_draft`
  collections, §2.1b), custom invoice ID,
  customer P.O., warehouse stock source, imports (quotation, delivery note, P.O., repair jobs),
  credit-limit and pending-invoice blocking, and purchase-price validation.
- **Sales returns** (limited to sold quantity) with payments.
- **Signatures; sidebar customization; table column settings** (persisted to server when the
  store setting is on).
- **Stores**: every field and every one of the ~200 settings flags (inventory §store), serial
  numbers per document type (prefix/padding/start/monthly reset), bank account, logo, invoice
  background, backup/duplicate/restore/clear/permanent-delete, and S3 storage.
- **Users**: devices/sessions, online presence, store membership, change password.
- **Vendors and vendor categories**; **warehouses**.
- **WhatsApp**: wa.me share and Evolution API (QR connect, send document, contact sync).
- **Cross-cutting**:
  - Keyboard shortcut sets. Make them configurable per store instead of hard-coded store codes
    (LGK/MBDI/YNB/MDNA presets).
  - Enter-key navigation, barcode-wedge scanning, product search with configurable columns, and
    the "Info" history menus.
  - Excel export and XLS reports.

New in StartERP:
- Marketing site, signup and trial, subscription billing, platform admin.
- Notification centre, POS terminals and verticals, Print Studio, Label Studio.
- System email, a Phase 2 onboarding wizard per EGS, and data import wizards (Excel import of
  products, customers and vendors with validation preview).

## 5. UI/UX system (ERP-grade)

- **Approved direction:** the prototype variant chosen by the owner (`prototypes/`). Extract its
  tokens into `design-tokens.json`:
  - color (light/dark), typography (Latin + Arabic pair), spacing (4px grid), radius, elevation,
    motion, z-index.
- **Components** (Storybook, each with EN/AR/dark stories and visual regression):
  - AppShell (grouped sidebar collapsible to icons, off-canvas < 1024px, mobile bottom tab bar).
  - TopBar: store/branch switcher, ⌘K command palette, trial banner, notification bell, language,
    theme, user menu.
  - PageHeader with breadcrumbs and actions; ObjectPageHeader with key facts.
  - DataGrid: virtualized, sticky header, column chooser/reorder/resize, saved views, inline
    filters, bulk actions, export, density toggle.
  - FilterBar; DateRange (Gregorian/Hijri display); Typeahead with result-table columns and
    New/Edit/Browse.
  - MoneyInput (ex/inc VAT pair), QuantityStepper, StatusPill, Kpi, Chart wrappers.
  - Drawer, Modal, Stepper, Toast, EmptyState, Skeleton, ErrorBoundary.
  - FileDrop (image/PDF), PrintPreview, KeyboardHint.
- **Forms:** label-above, sectioned, sticky action bar, error summary that jumps to fields, unsaved
  changes guard, autosave drafts where the store enables drafts (to `*_draft` collections only,
  §2.1b), and full keyboard flow (Enter
  moves next).
- **Tables:** right-aligned tabular numbers, totals row, and colour plus shape for state (never
  colour alone).
- **Responsive:** every screen designed at phone, tablet and desktop. Long forms become stepped
  sections on phones. Data grids become card lists below 640px.
- **Accessibility:** WCAG 2.2 AA, 44-48px touch targets in POS, reduced motion, screen-reader
  labels in both languages.

## 6. Public website, signup and trial

1. **Marketing home (ERP-grade)** sections:
   - product hero with a live-looking UI composition
   - trust strip
   - module grid
   - 7 industry pages
   - a ZATCA Phase 2 section
   - a printing/hardware section
   - pricing teaser, testimonials, FAQ
   - footer with company CR/VAT

   It also needs: SEO (SSR or prerender, hreflang en/ar, schema.org Product/Offer), page speed
   budget, and a cookie/privacy notice (PDPL).
2. **Pricing page.** See §7.
3. **Signup wizard:**
   - account (name, email, +966 mobile, password strength)
   - business (name EN/AR, type = vertical, VAT 15 digits starting and ending with 3, CRN 10
     digits, city, branches)
   - plan choice, then terms
   - email verification, then workspace provisioning (workspace, first store, admin user, default
     roles, chart of accounts, serial numbers, sample data option)
   - guided setup checklist: store info, logo, ZATCA onboarding, printer, first product, first
     sale

   Reuse and extend `/v1/guest-register`.
4. **Trial lifecycle:**
   - 15 days of full Professional features.
   - Banner countdown, plus emails at D-7, D-3, D-1 and D0.
   - On expiry the workspace becomes **read-only**: view, print and export allowed; no create or
     update. The "Choose plan" wall stays until payment is approved.
   - Data is never deleted automatically; retention policy is 90 days after expiry, with warnings.
   - Server-side enforcement through middleware, plus clock-skew-safe dates.

## 7. Pricing (from market research, SAR, excluding 15% VAT)

Benchmarks (2026):
- Qoyod: 120 / 180 / 330 per month.
- Daftra: 99-199 per month.
- Wafeq: 99 / 149 / 249 per month; Phase 2 only from mid tier.
- Rewaa POS: about SAR 3,449-5,939 per year, paid annually.

StartERP positions as **Phase 2 included from the entry plan**, POS plus ERP in one product, at
mid-market price:

| Plan | Monthly | Yearly (2 months free) | Limits | Highlights |
|---|---|---|---|---|
| **Starter** | 99 | 990 | 1 branch, 3 users, 1 POS terminal, 2,000 products | Sales, quotations, returns, customers, ZATCA Phase 2, thermal and A4 printing, barcode labels |
| **Business** ★ | 249 | 2,490 | 3 branches, 10 users, 3 terminals, unlimited products | + Purchasing and returns, P.O., delivery notes, warehouses and transfers, expenses, statements, WhatsApp/email sharing, 1 vertical POS mode |
| **Professional** | 499 | 4,990 | 10 branches, 30 users, 10 terminals | + Full accounting (ledger, trial balance, balance sheet, capital/drawings), all 7 verticals, workshop, HR and salaries, RBAC, BI analytics, API |
| **Enterprise** | from 1,499 | custom | Unlimited | + AI RFQ procurement, SLA 99.9%, dedicated manager, migration, custom templates |

Add-ons (per month):

| Add-on | SAR |
|---|---|
| Extra POS terminal | 49 |
| Extra branch | 79 |
| Extra user | 19 |
| WhatsApp API | 49 |
| AI procurement | 149 |
| +10 GB storage | 29 |

Plans, prices, limits and features live in the `plan` collection and are editable in Platform
Admin. Nothing is hard-coded.

## 8. ZATCA Phase 2 (must be bullet-proof)

### 8.1 Coverage
- **Documents:** standard (B2B, clearance) and simplified (B2C, reporting within 24h):
  - invoice 388, credit note 383 (sales return, payables), debit note 381 (receivables)
  - prepayment handling (386)
- **Invoice type codes:** `0100000` / `0200000` with sub-flags as applicable.
- **Mandatory fields:**
  - seller name, VAT, CRN and full national address
  - buyer VAT and address for B2B
  - UUID, ICV, PIH, issue date and time (Asia/Riyadh)
  - line VAT category (S/Z/E/O with exemption reason codes)
  - totals and rounding
  - QR TLV tags 1-9 (Phase 2 includes hash, signature, public key, certificate signature)
- **Outputs:** XML UBL 2.1, XAdES signature, cryptographic stamp, QR, and PDF/A-3 with embedded
  XML.

### 8.2 Onboarding wizard (per EGS unit)
1. Environment: Developer portal (non-production), Simulation, or Production.
2. EGS details for the CSR:
   - common name; serial `1-StartERP|2-<model>|3-<uuid>`
   - organization identifier = VAT; org unit = branch (or TIN for VAT groups)
   - org name, country SA, invoice type `1100`, location, industry
3. OTP from the Fatoora portal.
4. Generate keys and CSR (secp256k1).
5. Compliance CSID.
6. Compliance checks: the 6 sample documents.
7. Production CSID. New onboardings store secrets encrypted (KMS/envelope) in **new** fields. The
   existing `store.zatca.*` fields keep their names and are still read for legacy stores.
8. Certificate expiry monitoring and a renewal flow.

**Test taxpayer for non-production:** VAT `399999999900003`, CRN `4030360927`. Use it in automated
tests against the developer-portal endpoint
`https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal`. Store test credentials only in CI
secrets.

### 8.3 Reporting pipeline
- A durable queue, not in-memory: Redis streams or Mongo outbox. Required properties:
  - idempotent submission keyed by document UUID
  - retries with backoff, and a dead-letter view
  - a 24h SLA monitor for simplified documents
  - an alert banner and bell notification on failures
- Clearance (B2B) must succeed **before** the invoice is shared or printed as final. The UI shows
  "Pending clearance" otherwise.
- Edit-lock after reporting (store setting). Corrections go only through credit/debit notes.
- The reconnect-required flow is retained (store field change, then reconnect).

### 8.4 Hash chain and ICV: compliance review required
- **Today:** PIH chains **per collection** (order, salesreturn, customerdeposit,
  customerwithdrawal, quotation_sales_return). ICV comes from Redis counters per document type.
- **ZATCA expects** one continuous ICV/PIH chain **per EGS unit** across all documents that unit
  signs.
- Design a migration-safe approach:
  - New onboardings (StartERP EGS units, one per POS terminal or per branch) use **a single
    per-EGS chain**.
  - Already-onboarded legacy stores keep their current behaviour until the owner re-onboards.
  - Add a chain-integrity checker job and UI.
- Write explicit tests for chain continuity across doc types, concurrency (two terminals), and
  retries.

## 9. POS terminals (touch, ERP-grade)

- **Device support:**
  - Windows/Android touch POS (Sunmi, iMin, PAX-style all-in-ones), iPad/Android tablets, desktop.
  - Fullscreen PWA, kiosk mode, landscape and portrait, 10-21" screens; 48px+ targets.
- **Core flow:**
  - Terminal login by PIN, then open shift (opening float).
  - Product grid by category, search, and barcode wedge or camera scanning.
  - Cart: qty stepper, line and cart discounts with permission and reason, VAT breakdown.
  - Customer lookup (phone), hold/recall, void with manager PIN, returns/exchange by receipt
    scan.
  - Pay with cash keypad and quick notes, mada/credit card (manual reference now; terminal SDK
    later), STC Pay/Apple Pay reference, split payment, or customer account (credit).
  - Receipt printing (thermal) with ZATCA QR; reprint; email/WhatsApp receipt.
  - Cash in/out, X-report, Z-report and shift close with denominations count.
  - Offline mode: queue sales, sync later, and report to ZATCA on reconnect within 24h.
  - Customer-facing display (second screen); cash drawer kick via printer.
- **Vertical modes** (a terminal is configured for one; each changes layout and behaviour):

| Vertical | Key UX |
|---|---|
| **Spare Parts** | Part-no./OEM search first; vehicle make/model/year compatibility; cross-references and alternatives; rack location and per-warehouse stock; wholesale/retail price switch; quick quotation conversion |
| **Restaurant** | Floor plan and table states; dine-in/takeaway/delivery (aggregator orders); menu modifiers and combos; guests; course firing; KOT to kitchen printers per station and kitchen display (KDS); split/merge bills; service charge; tips |
| **Automobile Garage/Workshop** | Job card (KSA plate, VIN/chassis, km, istimara); technician assignment; labour and parts; status pipeline Received → Diagnosing → Approval → In progress → Ready → Delivered; customer approval via WhatsApp; links to the existing repair_job/vehicle models |
| **Bakkala** | Big quick-keys; weighed items; customer credit ledger (account) with limits; fast cash; minimal steps |
| **Supermarket** | Scan-first, high-throughput layout; scale barcodes (prefix 20-29, embedded weight/price); qty multiplier; promotions engine (BOGO, mix-and-match, time-bound); loyalty by phone; price check |
| **Cafeteria** | Quick menu tiles; sizes and add-ons; order token/number and a "call order" display; combos |
| **Fish Store** | Price per kg; live scale integration (Web Serial: CAS/DIGI/Mettler protocols) with tare; cleaning/cutting options (whole, cleaned, fillet, steaks) and cooking service charges; weight labels |

## 10. Printing module (invoices): "print anywhere, professionally"

- **Printer support matrix:**
  - Thermal 58/80/112mm: Epson, Star, Bixolon, Xprinter, Citizen, Rongta, Sewoo, and Sunmi/iMin
    built-in.
  - Laser/inkjet: A4, A5, A6, Letter, Legal, Half-letter.
  - Dot-matrix continuous 9.5"×11" and 9.5"×5.5" (Epson LQ/FX, ESC/P).
  - Pre-printed stationery, and custom W×H.
- **Connection paths, in order of preference:**
  1. **StartERP Print Bridge.** A small signed desktop agent (Go, Windows/macOS/Linux, auto-update)
     exposing a localhost WSS API for:
     - silent printing (raw ESC/POS, StarPRNT, ZPL, TSPL, EPL, PDF to the OS spooler)
     - printer discovery
     - cash drawer and scale access
  2. **Network raw** printing (IP:9100) through the bridge.
  3. **WebUSB / Web Serial / Web Bluetooth** for supported Chromium devices.
  4. **Browser print** (HTML/PDF) fallback with precise `@page` CSS.
  5. **Android POS:** Sunmi/iMin print SDK through a thin Android wrapper (Capacitor/TWA).
- **Print Studio** (per store):
  - printer profiles (connection, driver language, paper, DPI, code page incl. Arabic shaping for
    ESC/POS raster mode)
  - template gallery per document type: tax invoice, simplified, credit/debit note, quotation,
    delivery note, receipt voucher, P.O., statement, KOT, job card, Z-report
  - a visual designer: bilingual EN|AR layout, logo/background, sections, font per section,
    show/hide fields, QR position, margins, copies, auto-print, cut, drawer kick, page-break rules
    and pagination with totals carried forward
  - live preview and a test print
- Server-side PDF stays on headless Chrome but renders **from the same template engine** as the
  client, so print, PDF and PDF/A-3 are pixel-identical. Arabic shaping and bidi are verified by
  snapshot tests.
- Keep all existing print options:
  - A4 designs type 1/2/3, per-section font sizes, page size (products per page)
  - store-code stationery templates (migrated as named templates)
  - the "Select print type" modal
- Keep all existing outputs: `/v1/invoice/pdf`, `/v1/pdfa3`, `/v1/receipt/pdf`, `/v1/posting/pdf`,
  `/v1/report/pdf`.

## 11. Barcode label module

- **Symbologies:** EAN-13/8, UPC-A/E, Code 128 (GS1-128), Code 39, ITF-14, QR, Data Matrix, and
  scale/weight barcodes.
- **Label stocks:**
  - Rolls: 38×25, 40×30, 50×25, 50×30, 58×40, 60×40, 100×50, 100×150, jewellery 72×10, custom.
  - A4 sheets: 21, 24, 30, 40, 65-up (Avery-compatible).
- **Printer languages:** ZPL (Zebra), TSPL (TSC/Xprinter), EPL, DPL (Datamax), ESC/POS, and
  browser PDF; DPI 203/300/600; gap/black-mark sensing; rotation; darkness/speed.
- **Designer:** drag fields (name EN/AR, price inc VAT, part no., brand, rack, pack/expiry date,
  weight, store name, logo); data from products, purchases ("print labels for this purchase"),
  or stock adjustments; qty per product = received qty.
- Arabic text on ZPL/TSPL is rendered as a bitmap with verified shaping.
- Keep the existing backend barcode generation (`ean_12`, `_product_barcode_counter`) compatible.

## 12. Email module

- **Store level**, extending today's `outgoing_email_*` and `rfq_email_accounts`:
  - **Outgoing:** SMTP (SSL/TLS/STARTTLS), Google Workspace/Gmail OAuth, Microsoft 365 OAuth (Graph),
    Zoho, Amazon SES, SendGrid, Mailgun, Postmark, Brevo, Resend, SparkPost, Mailjet.
  - **Incoming:** IMAP, POP3, Gmail API, Microsoft Graph, inbound webhook.
  - **Test & diagnose:** a step log (DNS → connect → TLS → auth → send), SPF/DKIM/DMARC check, and a
    test-message round trip.
  - **Content:** HTML signatures; per-document email templates (invoice, quotation, statement)
    with PDF attachment.
- **Platform level (admin):** the same provider choice, plus transactional templates EN/AR with
  variables and preview:
  - verification, welcome, password reset
  - trial D-7, D-3, D-1, trial expired
  - receipt received, subscription approved/rejected, renewal reminder, subscription invoice
- **Delivery:** a queue with retries, a sent-mail log, and bounce/complaint handling.
- **Secrets:** encrypted at rest and never returned to the client after save (write-only fields).

## 13. Subscription payments by bank transfer (no payment gateway)

1. The tenant picks a plan, period and add-ons. The system computes amount ex VAT, VAT 15% and
   total, and generates a unique **transfer reference** (e.g. `STE-7F3K2`).
2. The tenant sees StartERP's bank details (beneficiary, bank, IBAN, account no., SWIFT), with copy
   buttons and the instruction "Transfer using any banking app, then upload the receipt".
3. The tenant uploads the receipt (JPG/PNG/HEIC/PDF, ≤ 10 MB, virus-scanned) along with transfer
   date, payer bank and amount. Status becomes **Pending review**.
4. **Platform admin is notified:** header bell badge plus real-time toast (WebSocket) plus email.
5. The admin reviews in **Payment Approvals**:
   - receipt viewer (zoom, PDF), with auto checks (amount match, reference present, duplicate
     receipt hash)
   - **Approve:** activates or extends the plan, sets period dates, issues a ZATCA-compliant
     subscription invoice, and emails the tenant.
   - **Reject:** a reason code plus note, then the tenant is notified and can re-upload.
6. Full audit trail and admin roles: only the `platform_admin` role can approve.
7. Renewal reminders: D-7 and D-1 before period end, then a 3-day grace, then read-only.

## 14. Responsive and device support

- Every screen is verified on:
  - phone (360-430)
  - tablet portrait/landscape (768-1366)
  - laptop (1280-1440)
  - desktop (1920+)
  - POS all-in-ones (1024×768, 1366×768, 1920×1080 touch)
- Browsers: latest Chrome, Edge, Safari (iOS/macOS), Firefox, and Android WebView.

## 15. Test automation strategy (every feature, every corner case)

| Layer | Tooling | Must cover |
|---|---|---|
| Unit (frontend) | Vitest + Testing Library | Calculations (VAT incl./excl., discounts %, rounding, commission, cash discount), validators (VAT 15-digit 3…3, CRN, IBAN, national address), formatters (SAR, Arabic digits, Hijri), reducers/hooks |
| Unit (backend) | `go test`, table-driven | Models, counters, entitlement checks, plan math, ZATCA XML builder (golden files), hash/ICV/PIH, QR TLV, migrations (idempotency) |
| Component | Testing Library + MSW | Every form (required, boundary and error states), DataGrid behaviours, RTL rendering |
| API | Go `httptest`, plus an OpenAPI contract test (schemathesis or dredd) | Every endpoint: `_Unauthenticated`, `_Forbidden` (RBAC), validation rows, happy path, pagination/filters, store isolation (no cross-tenant leakage) |
| Integration | Go + Testcontainers (Mongo, Redis) | Full flows on a **legacy-shaped fixture DB** (`pos` + `store_<id>`): sale → payment → return → ledger postings → reports; trial → upload → approve → entitlements |
| ZATCA | Go/Python against the developer portal (nightly) plus offline golden tests | Onboarding with the test taxpayer, the 6 compliance docs, B2C reporting, B2B clearance, credit/debit notes, chain continuity, retry/idempotency |
| E2E UI | Playwright (Chromium, WebKit, Firefox; mobile, tablet and desktop projects; EN and AR) | Signup → trial → first sale → print preview → ZATCA report; POS per vertical; subscription approval; email test; label printing to PDF |
| Visual regression | Playwright screenshots / Storybook (Chromatic or Loki) | Every component and key screen × theme × direction × breakpoint |
| Accessibility | axe-core in Playwright and Storybook | No serious/critical violations |
| Performance | k6 (API), Lighthouse CI (web) | Budgets in §2.3; 50 concurrent POS terminals per store |
| Security | gosec, govulncheck, npm audit, OWASP ZAP baseline, secret scanning | Authn/z, IDOR across stores/tenants, file upload abuse, rate limits |
| Print | Snapshot of generated ESC/POS/ZPL bytes and PDF raster diffs | Every template × paper size, Arabic shaping |

CI runs on GitHub Actions for every push to `v3`:
1. lint and typecheck
2. unit tests
3. API and integration tests
4. build (zero warnings)
5. e2e smoke on the deployed v3 environment after deploy, with full e2e nightly

Coverage targets: 85% lines on business logic packages; 100% of endpoints have API tests.

## 16. Delivery plan (each phase ends deployed, tested, demoed)

| Phase | Scope | Exit criteria |
|---|---|---|
| 0 | Prototype approval (3 variants delivered), `v3` branches, design tokens, CI pipeline, legacy fixture DB, hardening items from §3.1 | Variant chosen; CI green; fixture DB loads |
| 1 | Design system and app shell, auth (login, refresh, sessions, 2FA optional), i18n/RTL, theme, store switcher, ⌘K, notifications | Shell e2e on all breakpoints |
| 2 | Tenancy, plans, signup, trial, entitlements, subscription by bank transfer, platform admin approvals, system email | Trial → pay → approve e2e |
| 3 | Masters: products, services, categories, brands, customers, vendors, warehouses, users, roles, store settings (all flags) | Parity checklist for masters ticked |
| 4 | Sales cycle: sales, returns, quotations (+Qtn sales/returns), delivery notes, non-VAT, receivables/payables, payments, cash discounts | All inputs present; calc tests; old-data regression |
| 5 | ZATCA Phase 2 wizard, durable queue, chain monitor, PDF/A-3 | Developer-portal suite green |
| 6 | Print Studio, Print Bridge, Label Studio | Print snapshot suite green; hardware smoke list |
| 7 | POS terminal core, then verticals (Supermarket, Bakkala, Cafeteria, Restaurant, Fish, Spare Parts, Garage) | Per-vertical e2e |
| 8 | Purchasing cycle, stock transfers, expenses, capital/drawings, accounting (ledger, trial balance, balance sheet), HR/salaries, workshop | Accounting integration tests |
| 9 | BI and analytics, reports (VAT return, P&L, aging, stock valuation, Z-reports), Excel import/export, AI procurement | Report reconciliation tests |
| 10 | Marketing site, SEO, performance, security audit, migration rehearsal, production cut-over plan | Go-live checklist |

## 17. Working agreement for the AI developer

- Before coding each feature:
  - Re-read the relevant inventory section and the prototype screen.
  - List the inputs, outputs, API changes and test cases.
  - Ask only questions that block correctness.
- Commit in small logical units with clear messages, frontend and backend separately. Push to
  `v3` and deploy to the v2/v3 environment after each feature.
- Never weaken a test to make it pass. Never skip a test without an issue link and owner
  approval.
- Report after each feature:
  - what shipped
  - test counts (unit/API/e2e) and their results
  - screenshots (EN/AR, mobile/desktop)
  - known gaps

## 18. Open questions for the owner (answer before Phase 2/5)

1. **Bank account** for subscription transfers: beneficiary, bank, IBAN, SWIFT, and the StartERP
   company's own VAT/CRN for subscription tax invoices.
2. **EGS strategy:** one EGS (CSID) per **POS terminal** (recommended for ZATCA chain correctness),
   or one per branch?
3. **Legacy stores:** grandfather them as "Legacy" with all features, or move them to a paid plan
   on a date?
4. **Domains:** should marketing use `starterp.sa` / `starterp.com`, or stay under
   `gulfunionozone.com`?
5. **Deploy target:** is `v3` deployed to the existing v2 service/host (port 2004) or a new
   service?
6. **Card payments in POS:** manual reference only for now, or integrate a mada terminal SDK
   (e.g. Geidea, Nearpay soft-POS) later?
7. **Hosting region:** is in-Kingdom hosting required? Consider data-residency expectations for
   enterprise customers.
