# reactjs-pos: frontend feature inventory for the rebuild spec

Repo: `/home/user/reactjs-pos`. package name `billing-app2`, product title "Start POS". It is a React 17 CRA app (react-scripts 4.0.3) with 749 files under `src/` and about 425k lines including assets. The UI is English-first with i18n, aimed at Saudi VAT/ZATCA retail and wholesale, plus an automobile-workshop module and an AI RFQ/procurement bot.

**How this was gathered:** field lists were taken from `formData.*` keys, `<Label>`/`<label>`/`<SectionTitle>` text and `t('…')` strings in each file. Column lists come from `DEFAULT_COLUMNS`/`{key,label,fieldName}` arrays and filters from `searchByFieldValue`/`searchByDateField` keys. The giant transactional forms (`order/create.js` is 11.5k lines, `quotation/create.js` 9.2k, `purchase/create.js` 8.3k, `sales_return/create.js` 8.6k) were sampled and grepped, not read line by line. Expect a small number of conditional fields not listed below; check those files directly for edge cases.

---

## 1. Platform and cross-cutting architecture

### 1.1 Key dependencies (package.json)
- **UI**
  - Bootstrap 5 CSS/JS from CDN plus `public/bootstrap-5.1.3-dist`, loaded in `public/index.html`; jQuery 1.11 is also loaded from CDN.
  - `react-bootstrap` 2 (Modal, Button, Dropdown, Spinner, Toast), `bootstrap-icons`, `font-awesome` 4.7, `lucide-react`.
  - **Tailwind 3.4** as a devDependency, with `preflight:false`, a Material-3-style colour palette in `tailwind.config.js` and `@tailwindcss/forms` / `container-queries`. `prebuild` generates `src/tailwind.generated.css`, which is imported only in `order/create.js` (used by the "type2" sales form).
  - Most newer forms use inline style objects (`CARD`, `INPUT`, `Label`, `SectionTitle`, `ErrMsg` helpers defined in each file). Fonts: Inter, Hanken Grotesk, JetBrains Mono, Cairo, plus Arabic TTFs in `src/fonts`.
- **Inputs:** `react-bootstrap-typeahead` (every searchable select), `react-datepicker` + `date-fns`, `react-number-format`, `react-debounce-input`, `react-select`, `react-select-country-list` (country pickers).
- **Tables and UX:** `react-beautiful-dnd` (column reorder, sidebar menu reorder, kanban), `react-draggable` (draggable history modals), `react-paginate`.
- **Print, PDF and QR**
  - `react-to-print`, `html2pdf.js`, `html2canvas`, `pdf-lib`, `pdfjs-dist` (PDF→image in Purchase Bills).
  - `qrcode.react` / `react-qr-code`, `@axenda/zatca` (client-side ZATCA TLV QR fallback), `@zatca/qr`.
  - `react-barcode`, `n2words` / `number-to-words` (amount in words, EN/AR), `arabic-digits`.
- **Excel:** `xlsx` (product/service export, RFQ Excel reading), `react-data-export` (Sales/Expense report XLS), `xlsx-style`, `file-saver`.
- **Charts:** `react-google-charts`.
- **Realtime and device:** `react-use-websocket`, `@fingerprintjs/fingerprintjs`, `mitt` (event emitter in `src/utils/eventEmitter.js`).
- **i18n:** `i18next`, `react-i18next`, `i18next-browser-languagedetector`.
- **Images:** `browser-image-compression`, `react-image-file-resizer`.
- **Installed but not active:** `quagga` and `react-qr-barcode-scanner` imports are commented out in `order/create.js` and `stock_transfer/create.js`.
- **Testing:** `@testing-library/react` 11, `jest-dom`, `user-event`, `msw` 1.3 (devDependency).

### 1.2 API client and base URL
- **No axios and no central client.** Every component calls raw `fetch('/v1/...')` with the header `Authorization: localStorage.access_token`. Most calls send the raw token; a few (Topbar) send `"Bearer " + token`.
- **Proxy (`src/setupProxy.js`)**
  - `/v1/socket` is a WebSocket proxy.
  - `/v1`, `/zatca`, `/pdfs`, `/images`, `/attachments`, `/cdn/`, `/socket.io/` are proxied to `process.env.REACT_APP_PROXY_HOST`, with `X-Forwarded-Host/Proto` headers set.
- **.env:** `REACT_APP_API_URL='http://127.0.0.1:2000'`, `PORT=3004`. The code itself uses relative paths.
- **Query conventions**
  - Filters: `search[field]=value` via `ObjectToSearchQueryParams` (`src/utils/queryUtils.js`).
  - Field selection: `select=a,b,c`. Paging: `page=N&limit=N`. Sorting: `sort=-created_at`.
  - Lists also send `search[timezone_offset]` and `search[stats]=1` when the summary panel is open.
  - Date filters: `date_str`, `from_date`, `to_date`, `created_at`, `created_at_from`, `created_at_to`.
- **Response shape:** `{ result, total_count, ..., errors: {field: msg} }`. Errors are shown per field.
- **Helpers**
  - `utils/storeUtils.js#fetchStore(id, select)` caches the full store object in memory.
  - `utils/useDraft.js` autosaves drafts: 2.5 s after products change it POSTs or PUTs `/v1/{entity}?search[store_id]=` with `status:'draft'`. It is used by order, quotation, purchase and QuotationType3Form.

### 1.3 Store scoping (multi-store)
- **Active store lives in localStorage.** Keys: `store_id`, `store_name`, `store_name_in_arabic`, `branch_name`, `last_store_<userId>`, and `_store_settings_cache` (the store's `settings` JSON, used for feature flags).
- **Every list and create call scopes by store**
  - Query string gets `search[store_id]=<store_id>` (157 occurrences) or `store_id=` (127).
  - Create/update bodies also set `formData.store_id = localStorage.store_id`, and the store id is sent again as `?search[store_id]=` on POST/PUT.
- **Per-store data on shared entities**
  - Products keep prices and stock in `product_stores[storeId]`: `purchase_unit_price(_with_vat)`, `wholesale_unit_price(_with_vat)`, `retail_unit_price(_with_vat)`, `wholesale_margin_percent`, `retail_margin_percent`, `auto_update_*_from_last_purchase`, `stock`, `damaged_stock`, `warehouse_racks`, `stock_adjustments`, plus per-type quantities.
  - Customer and vendor stats live in `stores.<storeId>.*`.
- **Store switching:** the Topbar store dropdown loads `GET /v1/store?select=id,name,name_in_arabic,code,branch_name,zatca&limit=10000`. `switchStore()` writes the localStorage keys and calls `window.location.reload()`.
- **Cross-tab sync:** a `storage` event on `store_id` or `access_token` reloads the other tabs (Dashboard.js).
- **Login store choice**
  - Non-admins are restricted to `user.store_ids` / `store_names`; the last-used store is restored if it is still assigned. No stores assigned gives the error "You have no stores assigned to you".
  - Admins get the last store, else `GET /v1/store?select=id,name,branch_name&limit=1`.
- **Behaviour switches on `store.code`:** keyboard shortcut sets (LGK, MBDI, YNB, MDNA) and pre-printed "Print" templates (GUOJ, UMLJ, PH2, LGK, YNB, JDA…). The rebuild should turn these into configuration.

### 1.4 Auth flow (`src/user/login.js`, `src/user/AuthCallback.js`)
1. The login form has Email and Password; the submit button is disabled while locked out.
2. `POST /v1/authorize {email,password}` returns `result.code`.
3. `POST /v1/accesstoken` with header `Authorization: <code>` returns `result.access_token`, which is stored in `localStorage.access_token`.
4. `GET /v1/me` provides `name`, `id`, `role` (Admin / Manager / SalesMan, default `Manager` if empty), `admin`, `photo`, `store_ids`, `store_names`. These are stored as `user_name`, `user_id`, `user_role`, `admin`, `user_photo`.
5. `GET /v1/user-role/effective-permissions` results are stored in `user_permissions` for RBAC.
6. Redirect to `getLandingPath()`: the first visible sidebar item that is permitted.

Other auth details:
- **Client-side brute-force lockout:** 5 failures lead to a 15-minute lock, stored per email in `pos_login_lock_<email>` with a countdown. HTTP 429 shows "Too many login attempts…".
- **`/auth?at=<token>`** (`AuthCallback`) accepts an external SSO-style token handoff (workshop.gulfunionozone.com).
- **Logout** clears the localStorage keys and goes to `/` (or `/login.html` on the workshop host).
- **Dashboard guard:** if there is no `access_token`, redirect to `/`. If `/` is opened while logged in, redirect to the landing path.
- **ChangePasswordModal:** Current Password*, New Password*, Confirm New Password*.

### 1.5 Routing and navigation
- **react-router v5.** `App.js` routes:
  - Print-only pages (no chrome): `/invoice-print`, `/receipt-print`, `/posting-print`, `/report-print`, `/rfq-print`. These are rendered by headless Chrome for the backend's `/v1/invoice/pdf`, `/v1/receipt/pdf`, `/v1/posting/pdf`, `/v1/report/pdf`; each fetches `/v1/<x>/print-data/<key>` and sets `data-print-ready`.
  - `/auth` (AuthCallback), `/` (Login), and each `/dashboard/*` path renders `Dashboard`.
- **Dashboard.js** contains an inner Router with Sidebar, Topbar, Footer, a Toast stack, a geolocation-denied modal (with Tauri desktop support) and a `RouteGuard`. The guard blocks with "Access Denied" when RBAC is enabled and `permissions[resource].read` is false, or for `adminOnly` items.
- **Route → component map**
  - business-dashboard→BusinessDashboard, analytics→Analytics, sales→OrderIndex, stock-transfers→StockTransferIndex
  - sales-cash-discounts, sales-payments, salesreturn, sales-return-payments → the matching modules
  - purchases, purchase-orders, purchase-requests, rfq-received, rfq-suppliers → the matching modules
  - procurement-emails, procurement-whatsapp, purchase-bill-images → wrappers around `store/*Tab`
  - purchase-cash-discounts, purchase-payments, purchasereturn, purchase-return-payments, delivery-notes, quotations, quotation_sales_returns, non-vat-sales, non-vat-sales-returns, stats → the matching modules
  - vendors, stores, warehouses, customers, products, product_category, services, service_category, product_brand, customer-packages, expense_category, expenses → the matching modules
  - receivables→CustomerDepositIndex, payables→CustomerWithdrawalIndex
  - capitals, capital_withdrawals, dividents (labelled "Drawings"), users, user-roles, signatures, ledger, accounts, postings → the matching modules
  - automobile-dashboard, employees, salaries→SalaryIndex, vehicles, repair-jobs, repair-jobs-board (RepairJobIndex with `defaultMode="board"`), sidebar-settings
- **Bug to fix in the rebuild:** the outer `App.js` has no `/dashboard/salaries` route, so a hard load of that URL falls through to Login.
- **Sidebar (`src/sidebar_menu_config.js` DEFAULT_MENU)**
  - Each item has `id`, `resource` (RBAC key), `label`, `path`, `icon`, and visibility flags: `adminOnly`, `productsOnly`, `warehouseOnly`, `requiresServices`, `requiresPurchaseOrderModule`, `purchaseRequestOnly`, `requiresAIRFQBot`, `requiresRFQModule`, `requiresPurchaseBillsTracking`, `requiresSalesInQuotation`, `requiresNonVATSales`, `requiresRBACModule`, `requiresAutomobileModule`, `requiresAutomobileDashboard`, `requiresEmployeeModule`, `requiresCommonDashboard`.
  - Order and visibility are stored in `localStorage.sidebar_config`. If the store setting `save_sidebar_config_to_server` is on, they are also synced via `PUT /v1/store/:id/sidebar-config`.
  - `applyAutomobileMenuOrder()` moves the automobile items to the top when that module is enabled.
  - **Sidebar Settings page (`/dashboard/sidebar-settings`):** drag to reorder, toggle visibility, "Set as landing page after login", Reset, grouping badges (Admin, Warehouse, Automobiles, Employees, Services, Purchase Orders, Purchase Requests, AI RFQ Bot).
- **Topbar (`src/Topbar.js`)**
  - Sidebar collapse toggle, store switcher, and language switcher (7 languages).
  - Notification bell: delivery-note reminders with "create sales from DN", and purchase-request notifications ("open PR view").
  - RFQ History button; WhatsApp unread dropdown (`/v1/rfq-whatsapp-unread`) that opens a conversation modal; Email unread dropdown (`/v1/email-unread`).
  - User menu: Store Settings modal (Admin/Manager), Change Password, Manage Users (Admin/Manager), Admin Settings (Admin: S3 storage config), Server Status, Logout. There is also a mobile slide-out menu.

### 1.6 State management
- **No Redux or Context store** for app data. Local `useState`; components exchange data through `forwardRef` + `useImperativeHandle` (`ref.current.open(...)`).
- **localStorage** holds session data, store settings cache, table column settings, print font sizes (`printFontSizes`), sales form type (`order_form_type`), notification histories, dismissed delivery notes (`dn_dismissed`), workshop positions and similar preferences.
- **Contexts and events:** `WebSocketContext` is the only React context. `mitt` handles global events.
- **WebSocket** `/v1/socket?userId=&deviceId=`
  - On open, sends device fingerprint info (FingerprintJS, UA, screen, CPU, RAM, timezone, battery, IP from api.ipify.org).
  - Events: `delivery_note_reminder`, `delivery_note_order_linked`, `purchase_request_received`, `purchase_request_status_changed`, `purchase_request_po_created`, `purchase_request_updated`, `wa_unread_changed`, `email_unread_changed`, `role_updated`, `pong`.
  - List pages watch `lastMessage` to refresh live.
- **AutoRefresh:** polls `/index.html` every 10 minutes and compares the build fingerprint. If the store setting `enable_auto_refresh` is on, it shows a 60-second reload countdown with a snooze option.
- **Tauri desktop wrapper:** `public/tabs.html` hosts multi-tab iframes. Tauri shell is used to open WhatsApp URLs and macOS location settings.
- **Offline:** none. There is no service worker, IndexedDB or `navigator.onLine` handling.

### 1.7 i18n, Arabic and RTL
- `src/i18n/config.js` defines languages en, ar, ml, bn, ur, hn (Hindi), ru, each with namespaces `common`, `messages`, `validation`, `modules` (about 3.26k keys in common).
- Detection order: localStorage `i18nextLng`, then navigator.
- **RTL** (`dir=rtl`, `src/rtl.css`) applies only when the language is `ar` and the store setting `use_rtl_for_arabic` is true.
- **Arabic data fields** exist almost everywhere: `name_in_arabic`, `*_in_arabic`, `national_address.*_arabic`; numbers are converted to Arabic digits (e.g. `phone_in_arabic`, `vat_no_in_arabic`).
- **Auto translation to Arabic:** store setting `enable_auto_translation_to_arabic`; `POST /v1/translate` from customer, vendor and product forms.
- **Arabic Names list:** module `arabic_name` (English↔Arabic dictionary) used by the Product form's "Browse Arabic names / Add new Arabic name" when `enable_arabic_names_list` is on.
- **Invoices are bilingual (EN/AR)** with amount in words via `n2words`.

### 1.8 Common UI patterns used in every list and form (rebuild these as shared components)
- **List page**
  - Header with title, Create button and a "Summary" toggle (StatsSummary: draggable stats cards with per-stat visibility settings).
  - Filter row inside the table header: text inputs, Typeahead multi-selects (customer/vendor, "Select Users" for created_by, payment methods, payment status), and date filters toggling between a single date and a From/To range ("Less.. / More..").
  - Column sorting by clicking headers; TableSettingsModal to show/hide and drag-reorder columns (`useTableSettings`, stored in localStorage); page-size selector; `PaginationControls`.
  - Deleted/Restore toggle (soft delete) on most masters.
  - Row actions dropdown: View, Edit, Preview/Print, Print A4, WhatsApp share, Payments history, Create Return, Report to ZATCA, Delete/Restore.
- **Create/Edit form:** large Bootstrap modal (often fullscreen) opened through a ref. Error summary banner ("N errors — please fix before saving"), per-field `errors[...]`, Back / View Detail / Update / Create buttons, and Previous / Next record navigation on transactional forms. Escape is blocked on the main transactional forms so they don't close by accident.
- **Searchable selects** (Typeahead) for customer, vendor, product, user, employee, category and brand. The customer/vendor search dropdown is a configurable table (Code, Name, Phone, VAT No., Credit Balance, Credit Limit; "Customer Search Settings" modal). Each has New / Edit / Browse ("List") buttons that open nested create forms or a picker modal.
- **"Click to view pendings":** shows the customer's or vendor's unpaid invoices (`utils/customer_pending.js`, `vendor_pending.js`) with credit balance and limit badges.
- **Product search Typeahead:** "Part No. | Name | Name in Arabic | Brand | Country", paged "Load more", configurable result columns (Part Number, Name, S.Unit Price, Stock, Photos, Brand, P.Unit Price, Country, Rack; "Product Search Settings"), multi-select mode with "Select N Products".
- **Product line "Info" dropdown** opens draggable history modals: Linked Products, Product History, Sales / Sales Return / Purchase / Purchase Return / Delivery Note / Quotation / Qtn. Sales / Qtn. Sales Return / Non-VAT Sales / Non-VAT Return history, and Images. All are in `src/product/*_history.js` and `utils/product_*_history.js`.
- **Enter-key navigation** between fields (`useEnterKeyNavigation`; inputs with class `barcode` keep focus).
- **Image galleries** (`utils/ImageGallery.js`) for multi-photo upload on product/customer/vendor/service. Images are resized client-side to about 400px.

### 1.9 Keyboard shortcuts (product line rows in sales, quotation, purchase, returns, delivery note, stock transfer and product forms)
`order/create.js` `RunKeyActions` (about lines 3740–3990) has three mappings, chosen by `store.code`:

| Store code(s) | Mapping |
|---|---|
| Default (all others) | Ctrl/Cmd+Shift+B product history; Ctrl/Cmd+Shift+P qtn sales history; Ctrl/Cmd+Shift+Z qtn sales return history; Ctrl/Cmd+Shift+F images; Ctrl/Cmd+Shift+digit: 1 qtn sales, 2 product history, 3 sales, 4 sales return, 5 purchase, 6 purchase return, 7 delivery note, 8 quotation, 9 linked products |
| LGK | F2 quotation history, F3 linked products, F4 sales, F6 purchase, F8 purchase return, F9 sales return, F10 qtn sales; Ctrl+Shift+B/P/Z/F |
| MBDI / YNB / MDNA | F2–F10 plus Ctrl+Shift+6–9 |

Other keys:
- Arrow Left/Right and Backspace handling inside line inputs.
- Enter in the preview modal prints.
- Arrow keys in the "Select Print Type" modal.

### 1.10 Barcode
- **Scanning** is keyboard-wedge (laser scanner): a "Product Barcode Scan" / "Scan Barcode" text input in Sales, Quotation, Purchase, Delivery Note and Stock Transfer calls `GET /v1/product/barcode/<code>` and adds the line. Error: "Invalid Barcode". There is no camera scanning (Quagga is commented out).
- **Label printing:** Product View has "Print Barcode", which prints `barcode_base64` (EAN-12 from the backend) on a 35mm×25mm `@page`.

### 1.11 Printing and documents
- **"Select Print Type" modal** (when the store setting `enable_invoice_print_type_selection` is on): "Print" (store-specific template) or "Print A4 Invoice".
- **A4 preview (`order/preview.js` + `previewContent*.js`)** is shared by all document types. modelName values: sales, sales_return, purchase, purchase_return, quotation, quotation_sales_return, delivery_note, customer_deposit, customer_withdrawal, balance_sheet, stock_transfer, purchase_order, purchase_request, non_vat_invoice, non_vat_sales_return, plus a `whatsapp_*` variant of each.
  - Designs: Type 1, Type 2 (Classic Professional), Type 3 (Sales Return Compact), set by the store setting `invoice_a4_preview_design`; toolbar style by `invoice_header_design`.
  - Toolbar controls: Font Size per section, Show Store Header, Margin Top, QR Width/Height, font family, Page Size (5–16 products per page, paginated pages). Settings persist in localStorage `printFontSizes` and optionally on the server (`save_print_settings_to_server`).
  - Outputs: Print (react-to-print or iframe), Download PDF (server `/v1/invoice/pdf` via headless Chrome, or html2pdf fallback), PDF/A-3 (`/v1/pdfa3`, embeds XML for ZATCA), WhatsApp share.
  - Invoice background image and logo are store-configurable.
  - Content details: bank account block, signatures (received_by / order_placed_by / purchase_returned_by), "created by" (`show_created_by_in_invoice_preview`), seller info block (`show_seller_info_in_invoice`), address in footer, currency symbol (Saudi Riyal font), one-line product names, hide VAT (`no_tax_for_quotation_invoice`).
- **"Print" (non-A4)** in `order/print.js` uses pre-printed stationery templates `printContent.js`/`2`/`3`/`4` (907×1058px `@page`), selected by store code.
- **Other previews**
  - Receipt preview (customer deposit/withdrawal) uses `customer_deposit/preview.js` and `/v1/receipt/pdf`.
  - Balance sheet / account statement print uses `posting/printPreview.js` (two designs) and `/v1/posting/pdf`.
  - Sales/Purchase reports use `order/report.js` and `reportContent.js` ("Print Report", WhatsApp, PDF via `/v1/report/pdf`).
  - RFQ PDF uses `rfq_received/RFQPreview*.js`.
- **ZATCA QR**
  - When the backend returns `model.zatca.qr_code`, it is rendered with `QRCodeSVG`.
  - Otherwise the client builds a TLV QR with `@axenda/zatca` `Invoice({sellerName, vatRegistrationNumber, invoiceTimestamp, invoiceTotal, invoiceVatTotal}).render()`.
  - Placement is right-top by default or left-bottom (`zatca_qr_on_left_bottom`). The QR is hidden for quotation (non-invoice), delivery note, stock transfer, purchase order/request and non-VAT documents.
- **ZATCA reporting UI**
  - "Report to Zatca" checkbox on create (Sales, Sales Return, Purchase).
  - Index filter and column with statuses REPORTED / COMPLIANCE FAILED / REPORTING FAILED / NOT REPORTED, plus a per-row "Report" button (`/v1/order/zatca/report/:id`, `/v1/sales-return/zatca/report/:id`).
  - View page shows Zatca Info: status, reported at, invoice hash, previous hash, QR, signing time, failures.
  - Editing is locked once reported (`disable_sales_edit_once_reported_to_zatca`); payments can't be removed ("Cannot remove: invoice already reported to ZATCA").
  - Reconnect-required banner. Debit/credit-note reporting for receivables/payables.
  - Store "Connect to Zatca" modal: OTP*. Endpoints `/v1/store/zatca/connect` and `/disconnect`; warehouse has its own `/v1/warehouse/zatca/disconnect`.

### 1.12 WhatsApp and email sending
- **WhatsApp modal (`utils/WhatsAppModal.js`):** number with country code and a message.
  - "Open in WhatsApp" uses `wa.me` or `web.whatsapp.com` on Windows. The PDF is uploaded to filebin.net (`utils/pdfShare.js`) or the server and the link is put in the text.
  - "Send to contacts" is also available.
- **WhatsApp API mode (`utils/WhatsAppAPIModal.js`, when `use_whatsapp_api` is on):** Evolution API (settings `evolution_api_url`, `evolution_api_key`, `evolution_instance_name`).
  - QR-connect flow (`/v1/whatsapp/connect`, `/qr`, `/status`, `/disconnect`).
  - Sends the PDF as an attachment via `/v1/whatsapp/send-document`.
  - Contact sync and search (`/v1/whatsapp/sync-contacts`, `/contacts`, `/check-numbers` to show "Has WhatsApp").
- **Email:** outgoing email widget (`store/ProcurementOutgoingEmailWidget.js`) with From Name, From Email, test email, and HTML signatures (add, set default, live preview). `/v1/procurement-email-send` is used for RFQ/procurement emails.
- **WhatsApp share buttons** appear on the business dashboard (chart image via `/v1/chart-image-share`), reports, purchase order and purchase request.

### 1.13 Excel import and export
- **Export Excel:** Products (`/v1/product?...limit=5000`; columns #, Name, Name (Arabic), Part Number, Barcode, Category, Brand, Country, Rack, Unit, Purchase/Wholesale/Retail Price, Stock, Created At) and Services. Both respect the current filters.
- **XLS reports (react-data-export):** "Download Sales Report(XLS)" (per-invoice line detail and day totals: Description, Quantity, Unit, Rate, Gross, Disc %, Disc, Tax %, Tax Amount, Net Amount, Shipping/Handling Fees, Discount, totals before and after VAT, Day totals), "Download Sales Return Report", "Download Purchase Report", "Download Purchase Return Report", "Download Expense Report".
- **Import:** there is no generic Excel import of master data. Excel/CSV/PDF/images are read in RFQ create (products file, converted to CSV with SheetJS) and shown in FileViewerModal. "Import" on sales/quotation/stock transfer means importing lines from other documents (From Quotations / Delivery Notes / Purchase Order / Sales / Purchases / P.O.).

---

## 2. Module inventory (A–Z by `src/` directory)

Notation used below: `*` = required, `(TA)` = Typeahead searchable select, `(sel)` = `<select>`, `(DP)` = datepicker with time.

### account — Accounts & Trial Balances (`/dashboard/accounts`)
- **Screens:** list only (chart of accounts / trial balance); opens the balance sheet (posting) per account.
- **Columns, sortable and filterable:** number (account no), name, balance (debit/credit balance), phone, vat_no, type (drawing, expense, asset, liability, capital, revenue), open (Open/Closed), reference_model (customer, vendor, investor, withdrawer, expense_category, …), updated_at, created_at, deleted.
- Date-range filters for created and updated dates; delete and restore.

### analytics — Analytics (admin only)
- Google Charts: allSales, dailySales, hourlySales, monthlySales, yearlySales. Data comes from `/v1/<model>?select…`.

### arabic_name — Arabic Names dictionary
- **Screens:** index (search English/Arabic, edit, delete, paging) and create/edit modal.
- **Form:** Name in English*, Name in Arabic*. Hidden: store_id.

### automobile_dashboard — Workshop Dashboard
- **KPI groups**
  - Revenue/Expense/Profit, with and without VAT.
  - Labour profit, Spare-parts profit and "Additional" (other services) profit, each split by Sales / Returns / Non-VAT Sales / Non-VAT Returns.
  - Counter Cash and Bank Cash; Spare-parts stock value (purchase and retail).
  - Total customer credit, unpaid purchase bills, additional expenses, salary balance (owed to and by employees, by employee).
- **Breakdowns:** by customer, vendor, employee and expense category.
- **VAT:** sales VAT, return VAT, purchase VAT, purchase-return VAT, expense VAT, Net VAT payable; Monthly VAT for the last 12 months.
- **Charts:** monthly P&L trend, profit breakdown, cash distribution, assets & liabilities.
- **Filters:** single month / month range / customer. Refresh button.

### business_dashboard — Business Dashboard
- **Tabs:** Overview, Revenue, Payments, Products & Inventory, Customers & Finance.
- **Content:** KPI cards, Revenue trends, Payment analysis, Product performance, Inventory health (Out of Stock, Low Stock < 5, Healthy, Total), Customer intelligence, Financial overview.
- **Filters:** Single Month / Month Range / Year.
- **Actions:** "Recompute" (`/v1/dashboard/backfill`); share chart via WhatsApp (image upload) or download.
- Optional VAT KPI card (store setting).

### capital — Capitals (owner investment)
- **Screens:** list, create/edit, view.
- **Form:**
  - **Investment Details:** Invested By User* (TA over users, with "New" for admin); Amount* (number); Description* (textarea); Date Time* (DP, "MMMM d, yyyy h:mm aa"); Payment Method* (sel: cash, debit_card, credit_card, bank_card, bank_transfer, bank_cheque).
  - **Attachments:** Image (optional, drag & drop, resized to 400px; `images_content[]`).
- **List columns and sort:** code, date, amount, payment_method, description, invested_by_user_name, created_by_name, created_at. Filters on the same fields plus date ranges.

### capital_withdrawal — Capital withdrawals
- **Form:** Store*, Withdrawn By User* (TA), Amount*, Description*, Date Time*, Payment method* (same options), Image (optional).
- **List:** code, date, amount, payment_method, description, withdrawn_by_user_name, created_by_name, created_at.

### components — LanguageSwitcher
- Dropdown of LANGUAGE_OPTIONS (English, മലയാളം, العربية, বাংলা, اردو, हिन्दी, Русский).

### customer — Customers
- **Screens:** list, create/edit, view (tabs: details, Repair Jobs, Vehicles, Sales / Sales Return / Quotation / Qtn. Sales / Qtn. Sales Return history, Churn Risk History, CLV History), `history_modal.js`.
- **Form:**
  - **Identity:** Name*; Name in Arabic (auto-translate); Email (validated); Phone (05.. / +966..); Phone2; Contact Person; Country (react-select-country-list, `country_code` and `country_name`).
  - **Business Details:** VAT No. (15 digits). If the country is SA or empty it must be 15 digits and start and end with 3. Registration Number (CRN), alphanumeric only.
  - **Remarks:** textarea, plus checkbox "Use in Sales / Sales Return" (`use_remarks_in_sales`).
  - **National Address:** Building Number (4 digits when the store is on ZATCA phase 2 and a VAT no is given), Street Name, Street Name (Arabic), District Name, District Name (Arabic), Unit Number, City Name, City Name (Arabic), Zipcode (5 digits on phase 2), Additional Number.
  - Checkbox `show_address_in_invoice_footer`.
  - **Credit & Balances:** Credit Limit; Credit Balance (read-only); Qtn. Credit Invoice Amount and Qtn. Paid Invoice Amount (read-only).
  - **Vehicles:** inline vehicle list with Add/Edit/Delete; only available after the customer is saved.
  - **Opening Balance:** Balance Direction (radio: Customer owes Store / Store owes Customer → `opening_balance_type`); Opening Balance Amount; As Of Date (DP). The `opening_balance_posted` flag locks it.
  - **Customer Photos:** gallery (`images`).
  - Hidden fields: code (auto serial), stores, search_label, vat_percent, `*_in_arabic`.
- **List columns:** select, deleted, actions, ID (code), Name, Phone, Vat No., Email, Credit Balance, Credit Limit.
  - Per-store stats: sales amount, paid, count, credit balance, paid / unpaid / partially paid counts, profit, loss.
  - Sales return: count, amount, paid, balance, profit, loss and status counts.
  - Quotation: count, amount, profit, loss. Qtn. invoice: count, amount, paid, balance, profit, loss and status counts. Qtn. sales return: same set.
  - Delivery note count.
  - AI/BI: Churn Risk Tier, reason, Churn %, Total Spend, Days Since Last Buy, CLV 12m, CLV Segment and reason, Tenure Days, First/Last Purchase, 1/3/6/12/24-month Retention.
  - Created By, Created At.
- **Filters:** a filter for every column above, plus "Ignore Zero Credit Balance", "Ignore Zero Qtn. Invoice Credit Balance", churn tier (All Tiers), CLV segment (All Segments), created_by users, deleted. Stats summary panel. Delete and restore.

### customer_deposit — Receivables (Receipts) (`/dashboard/receivables`)
- **Screens:** list, create/edit, view, preview (receipt A4/PDF), `ReceiptPrintPage`.
- **Form:**
  - **Customer / Vendor:** Type* (sel: customer, vendor, employee); Date* (DP); Remarks.
  - Then Customer* (TA "Customer Name / Mob / VAT # / ID" with New/Edit/List), or Vendor* (TA with New/Edit/List), or Employee* (TA "Employee Name / Code" with New/Edit/List, when the employee module is on).
  - **Payments (rows, at least one required):** Amount*, Discount, Invoice (link to a specific invoice; first pick the invoice type "Sales Invoices" or "Quotation Invoices", then pick from the pending list), Payment method* (cash, debit_card, credit_card, bank_card, bank_transfer, bank_cheque, purchase_fund "Purchase Fund A/c"), Bank Reference #, Description, Remove.
  - **Totals:** Total, Total Discount, Amount (Excl. VAT), Net Total.
  - **ZATCA Reporting (Debit Note):** checkbox "Report to ZATCA as Debit Note on Create" (`enable_report_to_zatca`); the record is locked once reported.
  - **Attachments:** multi-file drag & drop (images, PDFs, any type) with View/Download.
- **List columns:** actions, ID, Date, Type, Customer, Vendor, Net Total, Payment Methods, Description, Created By, Created At, Reported to Zatca (Report / Retry button).
- **Filters:** code, date (single or range), created_at range, customer_id, vendor_id, type, net_total, payment_methods, description, created_by.
- **Summary:** Total, Cash, Bank, Purchase Fund, Receivable from Customers (Unpaid Sales), Receivable from Vendors (Purchase Return), Net Receivables.

### customer_withdrawal — Payables (`/dashboard/payables`)
- Mirror of customer_deposit: same fields (Type customer/vendor/employee, Date, Remarks, party, payment rows, ZATCA "Debit Note" checkbox for payables / credit note, attachments), same list columns and filters, and a receipt preview.

### customer_package — Customer Packages (admin; SaaS feature bundles)
- **Form:** name*; Available Tabs (checkbox grid of all DEFAULT_MENU items → `tab_ids`, with Select all / Clear all and a count).
- **List:** name, tabs enabled, created by, actions; paging.
- A store selects a package in Store create ("Customer Package").

### delivery_note — Delivery Notes
- **Screens:** list, create/edit, view, print (A4, preview), report.
- **Form:**
  - Customer (TA, with Edit); Date (DP); Notify At (Sales Reminder) (DP). When due, a websocket reminder appears in the Topbar bell, which offers to create sales from the DN.
  - Remarks; Scan Barcode; product search (TA) or "From P.O.".
  - **Product lines:** Part No., Name, Info dropdown, Qty* (warning "Available stock is…"), U. Price ex/inc VAT, P. U.Price ex/inc VAT, U. Disc ex VAT, L. Disc incl VAT, Remove.
  - **Customizable "Summary" block:** Total ex/inc VAT, Shipping & Handling, Discount ex/inc VAT, Taxable Amount, VAT, Before Rounding, Rounding (Auto checkbox), Net Total.
  - Fields: discount, discount_percent, vat_percent, shipping_handling_fees, rounding_amount, auto_rounding_amount, delivered_by.
  - Prices are shown only if the store setting `add_price_details_in_delivery_note` is on.
- **List columns:** Actions, Select, ID, Date, Customer, Net Total, Invoiced (YES/NO), Sales ID, Created By, Created At.
- **Filters:** code, date, created_at, invoiced, customer, users.
- **Summary:** Total Delivery Note, Invoiced Count, VAT, Discount, Shipping. Print Report.

### divident — Drawings (`/dashboard/dividents`)
- **Form:** Withdrawn By User* (TA), Amount*, Description*, Date Time*, Payment Method*, Image (optional).
- **List:** code, date, amount, payment_method, description, withdrawn_by_user_name, created_by_name, created_at.

### employee — Employees and Salaries (employee module)
- **Screens:** list, create/edit, view (balance sheet link, salary history), salaryIndex (`/dashboard/salaries`), salaryPayment form.
- **Employee form:**
  - **Employee Details:** Name*; Name (Arabic); Position / Designation (sel from DEFAULT_POSITIONS: Technician, Senior Technician, Master Technician, Workshop Manager, Service Advisor, Parts Manager, Receptionist, Cashier, Electrician, Mechanic, Painter, Welder, Body Repair Technician, Quality Inspector, Driver; the list is user-extendable and stored in localStorage `workshop_positions`); Mobile 1; Mobile 2; Iqama No.; Joining Date* (DP); Status (`is_active` checkbox); Address.
  - **Salary Information:** Salary* (amount); Salary Date (Day of Month)*.
  - **Opening Balance:** direction radio (Store owes Employee = payable / Employee owes Store = receivable), amount, As Of Date.
  - **Account Balance:** read-only account name and balance.
  - **Salary Payment History** table.
- **Salary Payment form:** Employee* (TA), Amount*, Payment Method* (Cash / Bank Transfer), Date*, Description.
- **Employee list:** Name, Mobile, Salary, Joining Date, Balance, Created At, Actions (Pay Salary, Salary History, Delete Permanently). Filters: search, mob1, created range. Summary: count, sum of salaries, total paid, owed to and by employees.
- **Salary list:** Code, Employee, Amount, Method, Date, Description, Actions. Filters: employee_name, payment_method, date_from, date_to. Summary: count, total, cash, bank.

### expense — Expenses
- **Screens:** list, create/edit (wizard with Details and Attachments steps), view.
- **Form:**
  - **Vendor:** TA (optional, with New Vendor / Browse).
  - **Date & Amount:** Date* (DP), Amount*, Vendor Invoice No.
  - **Description & Payment:** Description*; Payment Method* (cash, debit_card, credit_card, bank_card, bank_transfer, bank_cheque, purchase_fund).
  - **Expense Categories:** Categories* (multi TA with New Category; `category_id[]`).
  - **Attachments:** multi-file (images, PDF, Word, Excel), saved and new lists, delete confirm.
  - Hidden: remarks, images_content.
- **List columns:** actions, ID, Date, Amount, VAT, Vendor Invoice No., Vendor, Payment Methods, Category, Description, Created By, Created At.
- **Filters:** code, date, amount, category (include and exclude), payment method (include and exclude), vendor, users, description, created range.
- **Summary:** Total, Cash, Bank, Purchase Fund, VAT Paid. "Download Expense Report" (XLS).

### expense_category — Expense Categories
- **Form:** Name*, Parent Category (optional; TA, hierarchical).
- **List:** name, parent_name, created_by_name, created_at; deleted toggle.

### i18n
- Config plus locales in 7 languages (common, messages, validation, modules) and `dateLocales.js`.

### ledger — Ledger (journal)
- **List columns:** journals.date, journals.account_name, journals.debit, journals.credit, reference_model (Type), reference_code (ID), created_at.
- **Filters:** "Name / mob / acc no." search, Type (All, Sales, Sales Return, Purchase, Purchase Return, Capital, Drawing, Expense, Customer Receivable, Customer Payable, Quotation Sales), date ranges.

### non_vat_sales — Non VAT Sales (`requiresNonVATSales`)
- **Screens:** list. Create uses `QuotationType3Form` in non-VAT mode ("Create Non VAT Sale"). Preview A4 (`non_vat_invoice`), view, Create Return.
- **List:** Code, Customer (TA filter), Date (single or range), Total, Payment, Actions (View, Preview A4, Edit, Create Return). Summary total. API `/v1/non-vat-sales`.

### non_vat_sales_return — Non VAT Sales Returns
- "Select Non VAT Sale" picker, then QuotationType3Form in return mode.
- **List:** Code, Customer, Date, Total, Payment, Actions (View, Print A4, Edit). API `/v1/non-vat-sales-return`.

### order — Sales (the core POS form)
- **Screens:** `index.js` (list); `create.js` (5 form layouts); `view.js` (details); `preview.js` (A4); `print.js` (template print); `report.js` (sales report); `InvoicePrintPage.js` and `ReportPrintPage.js` (headless pages).
- **Form layouts** (store setting `sales_create_form_design`; per-user switch stored in localStorage `order_form_type` when `enable_sales_page_selection` is on):
  - type1: Classic (`SalesType1Form.js`)
  - type2: New, Tailwind, compact 56px header
  - type3: Compact (default)
  - type4: VAN Store (`SalesVanStoreForm.js`), mobile/tap UI
  - type5: Workshop (`SalesType5Form.js`), needs the automobile module
- **Header actions:** title (Create New Sales Order / Update Sales #code / Draft resume), "Report to Zatca" checkbox, "Switch to Quotation" (carries data over), Previous / Next, Create New, Print, Print A4, Select N Products (multi-select mode), Create / Update. Delivery-note reminder bell. Repair job "N Jobs" and "View Job Card" when created from repair jobs.
- **Header / customer fields (type2/3 configurable via "Configure Customer & Order Details"):**
  - Customer (TA "Customer Name / Mob / VAT # / ID" with configurable result columns; New / Edit / Browse; shows Cr.Balance and Limit; "Click to view pendings").
    - **Blocking:** sales are blocked when the customer has at least `block_sales_after_pending_count` pending invoices (`errors.blocked`). Credit-limit warnings.
    - A walk-in customer is allowed: `customer_name` free text.
  - Date (`date_str`, DP); Phone (`sales_phone`); VAT NO. (15 digits); Address; Remarks (prefilled from customer remarks if `use_remarks_in_sales`); Customer P.O No. (if `enable_customer_po_no`).
  - Invoice ID (`custom_invoice_id`, if `enable_custom_sales_invoice_id`: "auto-generate if empty"; required on update).
  - Product Barcode Scan; Product search (TA, Products/Services tabs, New product/service).
  - Import dropdown: From Quotations (`quotation_ids`, `quotation_codes`), From Delivery Notes (`delivery_note_id`), From Purchase Order.
  - Workshop (type5): Vehicle (sel from customer's vehicles; Add/Edit Vehicle), Km Driven (`km_driven`), `vehicle_snapshot`, `repair_job_id(s)`.
- **Product line table** (configurable, resizable and reorderable columns via "Table Settings"):
  - delete; SI No.; Part No.; Name (editable); Info (history dropdown); P. Unit Price (`purchase_unit_price`, editable); Stock (per-warehouse breakdown popover).
  - Remove Stock From (sel main_store or warehouse, when `enable_warehouse_module`).
  - Qty*; U. Price ex VAT*; U. Price inc VAT; U. Disc ex VAT; L. Disc incl VAT; U. Disc %; Total ex VAT; Total inc VAT.
  - **Line validation:**
    - Qty > 0; unit price > 0; discount ≥ 0; max 8 decimal places for prices and 2 for others.
    - "Unit price should not be less than Purchase Unit Price" (when `block_sale_when_purchase_price_is_higher` or `enable_purchase_unit_price_validation`).
    - Duplicate products flagged unless the product has `allow_duplicates`.
- **Bill Summary** (fields can be shown/hidden and reordered via "Customize Bill Summary"):
  - Total ex VAT, Total inc VAT, Shipping & Handling (`shipping_handling_fees` ≥ 0, 2 decimals).
  - Discount ex VAT (`discount`) and inc VAT (`discount_with_vat`), with percentages (`discount_percent`, `discount_percent_with_vat`, `is_discount_percent`; 0–100).
  - Taxable Amount, VAT (`vat_percent`, editable ≥ 0), Before Rounding, Rounding (`rounding_amount` with Auto checkbox `auto_rounding_amount`), Net Total inc VAT.
- **Payments** (`payments_input[]` rows, "Add Payment"):
  - Payment Date (DP), Amount, Method* (cash, debit_card, credit_card, bank_card, bank_transfer, bank_cheque, sales_return, purchase), Description, Reference (link to an advance/customer deposit; reference_type, reference_id, reference_code; auto-suggest via `auto_suggest_advance_payment_linking_in_sales`), Remove (locked once ZATCA-reported).
  - Derived: Total Payments, Balance Due, Payment Status (paid / paid_partially / not_paid).
  - VAN store adds "On Account" / "Credit".
- **Cash Discount & Commission:** Cash Discount (< net total), Commission Amount (< net total), Commission Payment Method (required when there is a commission).
- **Other behaviours:** drafts (`enable_drafts`, `useDraft`) with "Hide Drafts / Drafts" toggle on the list and Resume/Undraft; Escape disabled; "Customer & Order Details" left/right collapsible sidebars in type2.
- **List (`index.js`) columns:** actions, select, ID, Date, Customer, Net Total, Amount Paid, Credit Balance, Reported to Zatca, Payment Status, Payment Methods, Cash Discount, Commission, Commission Payment Method, Sales Discount, Net Profit, Net Loss, Return Count, Return Paid Amount, Created By, Created At.
- **List filters:** code, date (single or range), created range, customer (TA), payment status, payment methods, users, ZATCA status, drafts.
- **List extras:** Sales Summary stats; Print Report; Download Sales Report (XLS); row actions (view, edit, preview, print, WhatsApp, payments history, create sales return, ZATCA report).
- **View:** Net Total, VAT, Net Profit with/without VAT, Margin, Payment Methods, sold-items table with profit columns, totals, cash discounts, Payment History, Zatca Info block, Metadata (customer, delivered by, created/updated by, previous invoice hash). Actions: Share, Download PDF, Print Invoice, Update Sale.

### posting — Balance sheet / account statement (`/dashboard/postings`)
- **Screens:** list per account, `printPreview` (two designs, `balance_sheet_design`, A4/PDF/WhatsApp), `PostingPrintPage`.
- **Columns:** No., posts.date, reference_code, posts.debit, posts.credit, posts.balance, reference_model, created_at.
- **Filters:** Type (Sales, Sales Return, Qtn. Sales, Qt. Sales Return, Purchase, Purchase Return, Capital, Drawing, Expense, Customer/Vendor/Employee Receivable/Payable), date ranges, "Ignore Opening Balance", "Ignore Discount Allowed A/c", rows per page.
- **Footer:** Debit Total, Credit Total, Net Balance DR/CR, opening and closing balance rows.

### procurement_emails / procurement_whatsapp — wrappers
- **Emails:** tabs "Emails" (`store/ProcurementEmailsTab`) and "Conversations" (`ProcurementEmailConversationTab`).
  - Filters: search from/subject, direction (incoming/outgoing), RFQ filter (RFQ Created / Quotation / Other / No RFQ), date or date range.
  - Actions: Sync Now, Delete All (admin), Extract RFQ Data (AI provider/model, extra files) → Create RFQ, label as Supplier Quotation, retry or upload attachments.
- **WhatsApp:** `ProcurementWhatsAppTab`, the same set plus reply, voice (microphone), "Identify Senders", "Has Attachments" filter, Extract Quotation Prices → match to RFQ → Add Prices.

### product — Products
- **Screens:** list, create/edit, view, `json.js`, and history modals (product, sales, sales_return, purchase, purchase_return, quotation, quotation_sales_return, delivery_note).
- **Form:**
  - **Product Identity:** Name*; Name in Arabic (with "Add new Arabic name" and "Browse Arabic names" when enabled; auto-translate).
  - **Classification:** Brand (sel/TA with New Brand → `brand_id`, `brand_code`, `brand_name`); Country of Origin (country list); Part No. Prefix (`prefix_part_number`); Part No. (`part_number`); Category (multi, with New Category → `category_id[]`); Unit* (sel: PCE Piece, DRM Drum, SET Set, KGM Kilogram, MTR Metre, CMT Centimetre, MMT Millimetre, GRM Gram, LTR Litre, MG Milligram, with ZATCA code shown).
  - **Unit Prices (per store, `product_stores[storeId]`):**
    - Purchase Unit Price Excl. VAT and Incl. VAT (bidirectional, ≥ 0).
    - Wholesale Unit Price Excl./Incl. VAT, Wholesale Margin %, "Enable Auto Update from Last Purchase", "Update Now" (fetches the last purchase price).
    - Retail Unit Price Excl./Incl. VAT, Retail Margin %, auto-update checkbox.
    - Margin % back-calculates prices.
  - **Rack / Location:** `rack` (per-warehouse "Storage Facility" racks when warehouses are on).
  - Checkbox "Allow duplicates in Sales, Purchases etc." (`allow_duplicates`; default from `allow_products_duplicates_by_default`).
  - **Note:** textarea.
  - **Current Stock Levels:** read-only, per Location.
  - **Stock Adjustments:** "Quick Adjust (Damaged / Missing Stock)" with qty, Add/Remove, Warehouse/Store, Reason, Date; history list → `stock_adjustments`.
  - **SET Configuration:** Set Name; Add Products to SET (TA multi; per-item purchase/retail price and %) → `set`.
  - **Linked Products:** TA multi → `linked_product_ids`.
  - **Product Photos:** gallery.
  - Keyboard history shortcuts are available in the form.
- **List columns:** deleted, select, actions, Part Number, Name, Barcode (ean_12), Purchase / Wholesale / Retail Unit Price, Total Stock, Main Store Stock, Store/Warehouse, Set, Categories, Brands, Countries, Rack.
  - Per-store sales, return, purchase, purchase-return, quotation, qtn sales and qtn sales-return count, amount, qty, profit, loss; Delivery Note count and qty.
  - BI: Velocity Trend and reason, Slope %/Mo, Momentum %/3Mo, Recent 3Mo Qty, ABC Tier, XYZ Tier, ABC-XYZ Class and reason, Stocking Strategy, Revenue, Avg Monthly Qty, CV, Active Months.
  - Created By, Created At.
- **List filters:** every column above, plus category, brand, country, rack, is_set, deleted, created range.
- **List extras:** Store/Warehouse selector (All / Main Store / WH); "Migrate Rack → Main Store" (`/v1/product/migrate-rack`); Products Summary (stock count, retail/wholesale/purchase stock value, sales, returns, profits); BI History modals (Sales Velocity Trend, ABC-XYZ); Export Excel; selection mode ("Use Selected") when used as a picker; Delete / Restore (`/v1/product/restore/`).
- **View:** details, barcode image with Print Barcode (35×25mm label), unit prices and stock per store, damaged/missing stock, photos, metadata, history buttons.

### product_brand — Product Brands
- **Form:** Name*, Code*. Hidden: logo.
- **List:** code, name, created_at; deleted and restore.

### product_category — Product Categories
- **Form:** Name*, Parent Category (TA). Hidden: logo.
- **List:** name, parent_name, created_by_name, created_at; deleted and restore.

### purchase — Purchases
- **Screens:** list, create/edit, view, preview / print (`printContent`), print.
- **Form header:**
  - "Report to Zatca" checkbox.
  - Vendor (TA "Vendor Name / Mob / VAT # / ID", configurable columns and "Selected Vendor" card fields; New / Edit / List).
  - Date Time* (DP); Phone (05.. / +966..); VAT NO. (15 digits); Vendor Invoice No. (optional); Address; Remarks.
  - "From P.O." import; Scan Barcode; product search; Share via WhatsApp.
  - Checkbox `enable_on_accounts` ("Accounted"; can be disabled store-wide by `disable_purchases_on_accounts`).
  - Hidden fields: order_placed_by (current user) with signature, `vendor_national_address`.
- **Lines:** SI No., Part No., Name, Info, Stock, Add Stock To (warehouse sel), Qty, U. Price ex/inc VAT, U. Disc ex/inc VAT, U. Disc %, Wholesale Price and Retail Price (optionally set on purchase: "Set Wholesale/Retail unit price"), Total ex/inc VAT.
- **Summary:** same bill-summary block as Sales.
- **Payments ("Payments Paid"):** date, amount, method (cash, debit_card, credit_card, bank_card, bank_transfer, bank_cheque, sales, purchase_return, vendor_account), description, reference. Cash Disc., Commission, C. Payment Method.
- **List columns:** Actions, ID, Date, Vendor, Net Total, Amount Paid, Credit Balance, Cash Discount, Vendor Invoice No., Payment Status, Payment Methods, Purchase Discount, VAT, Return Count, Return Paid Amount, Created By, Created At, Accounted.
- **List filters:** code, date, vendor, vendor_invoice_no, net_total, total_payment_paid, balance_amount, payment_status, payments_count, return_count, return_amount, cash_discount, discount, vat_price, enable_on_accounts, created and updated ranges.
- **List extras:** drafts; Purchase Summary; Print Report; Download Purchase Report; Create Purchase Return; payment history modal.

### purchase_bill_images — Purchase Bill images/PDFs (`requiresPurchaseBillsTracking`)
- Wraps `store/PurchaseBillsTab`. Bills are received by WhatsApp from "Purchase Managers Numbers" or uploaded manually (images compressed, PDFs).
- "Extract Purchase Bill Data" with AI: Vendor Info (Company, VAT, Mobile, CR, Address), Invoice No/Date, Total, Tax, Products → "Create Purchase". Also View Purchase and Delete.

### purchase_cash_discount — Purchase cash discounts
- **Form:** amount* (linked to `purchase_id` / `purchase_code`).
- **List:** purchase_code, amount, created_by_name, created_at.

### purchase_order — Purchase Orders (`requiresPurchaseOrderModule`)
- **Screens:** list, create/edit, `PurchaseOrderPicker`, `SourceDocumentPicker`.
- **Form:**
  - Vendor (TA with New / Edit / List and a selected-vendor card), Date (DP), Expected Date (DP, `expected_date_str`).
  - Status (sel: draft, sent, confirmed, partially_received, received, cancelled).
  - Vendor Invoice No. (optional), VAT NO., Phone, Address, Remarks.
  - Add Product (search, New Product, Browse Products, "Import From" source documents).
  - **Lines:** SI, Product, Qty, Unit Price ex/inc VAT, U.Disc ex VAT, Total ex VAT.
  - **Bill Summary:** Total, Shipping & Handling, Discount, Taxable, VAT, Rounding (auto), Net Total.
- **Actions:** Previous / Next; "Convert to Purchase"; Print / Preview; Share via WhatsApp.
- **List columns:** Code, Date, Vendor, Status (coloured badges), Net Total, Qty, Expected Date, Created By, Created At, Vendor Invoice No., Remarks.

### purchase_payment — Purchase payments
- **Form:** amount*, date* (DP), payment_method* (`purchase_id` context).
- **List:** purchase_code, date, amount, method, created_by_name, created_at; filters on these plus deleted.

### purchase_request — Purchase Requests (`purchaseRequestOnly`)
- **Form:** Assign To (TA user search → `assigned_to`, `assigned_to_name`), Date, Notes (optional), Add Product (search / New / Browse).
  - Lines: Product, Qty, Unit Price ex/inc VAT, U.Disc, Total. Bill Summary.
  - Status: pending, accepted, partially_accepted, rejected.
  - Buttons: "Send P.R", Print / Preview, Share via WhatsApp.
- **List:** tabs Sent / Received (created_by / assigned_to); columns Code, Assigned To, Created By, Products, Net Total, Date, Status, P.O; actions Accept / Reject / Create P.O.
- Realtime websocket notifications in the Topbar.

### purchase_return — Purchase Returns
- **Form:** created from a purchase (`purchase_id`). "Already Returned All purchased products" guard.
  - Vendor (Edit), Date*, Phone, VAT NO., Vendor Invoice No. (optional), Address, Remarks, Select All.
  - **Lines:** checkbox select, Part No., Info, Stock, Remove Stock From, Qty (≤ purchased), U. Price ex/inc VAT, U. Disc, L. Discount (with VAT), Total. Bill summary.
  - **Payments received:** methods cash … bank_cheque, purchase, vendor_account. Validation: payment date ≥ order date; total must not exceed net total.
  - Cash discount, Commission, C. Payment Method.
  - `purchase_returned_by` signature and signature date; `enable_on_accounts`.
- **List columns:** Actions, Purchase Return ID, Date, Vendor, Net Total, Amount Paid, Credit Balance, Purchase ID, Cash Discount, Vendor Return Invoice No., Payment Status, Payment Methods, Purchase Return Discount, VAT, Created By, Created At, Accounted.
- **Summary:** Cash / Credit / Bank purchase return, cash discount return, VAT return, etc. Download report.

### purchase_return_payment
- **Form:** amount*, date*, payment_method*.
- **List:** purchase_return_code, date, amount, method, created_by_name, created_at.

### quotation — Quotations (and "Qtn. Sales" invoices)
- **Screens:** list, create (`create.js` classic, plus `QuotationType3Form.js` compact/workshop form also used for Non-VAT), view, `previewContent`, `printContent`.
- **Form:**
  - Type* (sel: quotation / invoice; invoice = "Quotation Sales", shown when `enable_sales_in_quotation`).
  - Customer (TA), Date*, Phone, VAT NO., Product Barcode Scan, Address, Remarks.
  - Products / Services tabs; import "From Sales / From Purchases / From P.O."; import modal with Select all, qty, and retail price excl. VAT.
  - **Lines:** Part No., Name, Info, Purchase Unit Price, Remove Stock From (main_store / warehouses), Quantity, Unit Price ex/inc VAT, line totals.
  - Payments Received when type = invoice: methods cash … bank_cheque, quotation_sales_return, customer_account.
  - Commission, C. Payment Method, Cash discount.
  - Sales ID (link to the order: `order_id`, `order_code`).
  - Status* (sel: created, delivered, pending, accepted, rejected, cancelled).
  - Validity (# of Days)* (default `default_quotation_validity_days`); Delivery (# of Days)* (default `default_quotation_delivery_days`); Delivery From the Date of (sel: Payment / Approval).
  - `rfq_received_id` / `rfq_received_code` link.
  - Type3 form adds: Exclude Service Tax / Exclude Products Tax, Vehicle and Km for the workshop, and "Switch to Sales".
- **Other:** drafts with Resume/Undraft; "Create Sales Return" (quotation sales return).
- **List columns:** actions, select, ID, Date, Customer, Net Total, Amount Paid, Credit Balance, Reported to Zatca, Type, Invoiced, Sales ID, RFQ ID, Payment Status, Payment Methods, Cash Discount, Discount, Net Profit, Net Loss, Return Count, Return Paid Amount, Status, Created By, Created At.
- **List filters:** code, date, customer, type (All / Quotation / Invoice), invoiced (ALL / YES / NO), status, payment methods, payment status, ZATCA, profit, loss, users.
- **Summaries:** "Quotation Summary" and "Qtn. Sales Summary"; Print Sales Report / Print Quotation Report.

### quotation_sales_return — Quotation Sales Returns (`requiresSalesInQuotation`)
- **Form:** created for a Qtn Sale (`quotation_id` / code). Customer, Phone, VAT NO., Remarks, Address, Select All lines (qty ≤ sold), Payments given (methods …, quotation sales, customer_account), Commission, Cash discount, `received_by` signature, ZATCA checkbox.
- **List:** actions, select, Qtn. Sales Return ID, Date, Customer, Net Total, Amount Paid, Credit Balance, Qtn. Sales ID, Payment Status, Payment Methods, Cash Discount, Discount, Net Profit, Net Loss, Created By, Created At. Excel report.

### quotation_sales_return_payment
- **Form:** Amount*, Date*, Payment method*.
- **List:** quotation_sales_return_code, date, amount, method, created_by_name, created_at.

### repair_job — Repair Jobs (automobile module)
- **Screens:** table list, Kanban board (`kanban.js`, Trello-like), card view (`card_view.js`), create/edit, view.
- **Form:**
  - **Job Information:** Title*; Job Number; Status (sel of board lists); Est. Delivery (DP).
  - **Customer & Vehicle:** Customer (TA, clear); Vehicle (TA filtered by customer; shows Vehicle #, Brand / Model, Year, Color); Date; KM; Technicians (multi employee picker with search by name or position, "Add New Technician").
  - **Parts & Labour:** product/service search (multi-select); lines Part/Service Name, Qty, Price excl./incl. VAT, Total; Labour Charge. Totals: Parts excl./incl. VAT, Labour, Grand Total excl./incl.
  - **Service Details:** Complaint, Inspection, Work Done (textareas).
  - Create a Sales Invoice, Quotation or Non-VAT Invoice from the job (`order_id`, `quotation_id` links).
- **Kanban:**
  - Lists: add, rename by double-click, drag to reorder, delete.
  - Cards: add, drag between lists, archive/unarchive, Overdue / Due Today badges.
  - Filters: customer, vehicle, chassis. Show/Hide Archived.
  - Bulk "Create Sales Invoice / Quotation / Non-VAT Invoice" from selected job cards.
- **List columns:** Date, Job, Vehicle, Customer, Technician, Status, Open/Closed, Est. Delivery, KM, Labour, Parts, Net Total, Actions.
- **List filters:** search, customer_id, technician_name, vehicle_number, date (single or range).

### rfq_received — RFQ (AI RFQ Bot)
- **Screens:** list, create/edit, detail modal (tabs Info / Suppliers / Prices), `RFQPreview` (PDF) and `RFQPrintPage`, email and WhatsApp conversation panels.
- **Form** (EMPTY_FORM: customer_id, customer_name, customer_rfq_id, customer_email, customer_phone, customer_city, text_content, general_instructions):
  - Customer (TA, Edit Customer); Customer RFQ ID ("from customer doc", e.g. PO-2025-001); Customer Email; Customer Mobile.
  - **Products Required table:** # / Part No. / Product Name / Qty / Unit (EA) / Notes, plus product search "Part No. | Name | Brand | Country…" and a sync-products progress indicator.
  - Products File (PDF / Image / CSV / Excel, shown as-is instead of the table); additional attachment files below.
  - Additional Description / Enquiry Text; General instructions.
  - AI extraction: Provider and Model selects ("Extract Products from Text" and "from files"; providers Groq, Gemini, OpenAI, Anthropic, xAI in `utils/aiProviders.js`).
- **List:** search; status filter (received, processing, ready_to_send, forwarded, failed); columns ID, Received At, Customer, Type, Categories, Forwarded To, Replies, Quotations; actions view detail, re-process, edit, send, Delete All (admin).
- **Detail:** suppliers forwarded (WhatsApp, market, category, status, sent at, message); supplier quotation replies (upload PDF / image / Excel, then AI extract prices, then match).
  - Price comparison table: supplier, selected supplier, margin %, retail price, incl./excl. VAT.
  - Actions: "Update product prices", "Create quotation".

### rfq_suppliers — RFQ Suppliers
- **Form:** Supplier name*, WhatsApp number* (validated), Address, Website, Purchase Market* (sel / any market), Rating, Active ("include in RFQ forwarding"), Product categories (tags).
- **List:** ID, Supplier, WhatsApp, Categories, Rating, Address, Status; actions edit, refetch from Google Maps, delete. Fetch suppliers from Maps (`/v1/rfq-suppliers/fetch-from-maps`).

### role — User Roles (RBAC; admin plus `requiresRBACModule`)
- **Form:** Role Name*; Permissions matrix with one row per Module/resource (from DEFAULT_MENU) and columns read / create / update / delete, plus an "All" column. Turning off read clears the others; turning on any other action enables read.
- **List:** Role Name, Permissions summary, Created By, Actions; search.
- Users get `role_ids`; effective permissions come from `/v1/user-role/effective-permissions`.

### sales_cash_discount, sales_payment, sales_return_payment
- **Forms:** amount*, date* (DP), payment_method* (in the context of `order_id` / `sales_return_id`).
- **Lists:** order_code / sales_return_code, date, amount, method, created_by_name, created_at; deleted filter.

### sales_return — Sales Returns
- **Form:** created for a sale ("Create Sales Return for Sale #").
  - Customer (Edit), Date, Phone, VAT NO. (15 digits), Remarks, Address, "Report to Zatca" checkbox.
  - **Lines:** checkbox Select All, Part No., Name, Info, P. Unit Price, Stock, Add Stock To (warehouse), Qty (≤ sold minus already returned), U. Price ex/inc VAT, U. Disc ex VAT, L. Disc incl VAT, U. Disc %, Totals.
  - Bill Summary (customizable).
  - Payments Given (methods cash … bank_cheque, sales, customer_account).
  - Cash Discount & Commission; `received_by` signature.
- **List columns:** Deleted, Actions, Return ID, Sales ID, Date, Customer, Net Total, Amount Paid, Credit Balance, Reported to Zatca, Payment Status, Payment Methods, Cash Discount, Commission, Commission Payment Method, Net Profit, Net Loss, Created By, Created At.
- **List filters:** customer, date, payment status, ZATCA, deleted, users.
- **List extras:** Sales Return Summary, Print Report, Download Sales Return Report, ZATCA report per row, delete and restore (`/v1/sales-return/restore/`).

### service — Services (`requiresServices`)
- **Form:**
  - **Service Identity:** Name*, Name in Arabic.
  - **Classification:** Service Category (sel with New Category); Unit* (sel: C62 Each/Per Visit, HUR Hour, DAY, WEE Week, MON Month, ANN Year); Item Code / SKU (auto if empty).
  - **Service Details:** Duration (number plus unit Min / Hours / Days / Weeks); Delivery Mode (sel: not specified, In Store, Remote / Online, At Customer Location); Booking / Appointment Required (checkbox); Description / Notes.
  - **Pricing:** Purchase Unit Price excl./incl. VAT, Wholesale, Retail.
  - Photos; Transaction History tabs (Sales, Sales Returns, Quotations).
- **List:** Name, Category, Unit, Retail Price, Duration, Delivery, Booking, Deleted, Actions. Filters per column. Export Excel. Delete and restore; "Use Selected" picker mode.

### service_category
- **Form:** Name*, Parent Category. Simple list.

### sidebar_settings
- See section 1.5.

### signature — Signatures
- **Form:** name*, signature* (image upload → `signature_content`; optional `logo`).
- **List:** name, created_by_name, created_at.
- Used on documents as the received_by / order_placed_by / returned_by signatures.

### stats — Statistics
- **Sections** (each can be shown/hidden via "Section Settings"): Profit / Loss Statement, Overall Summary, Sales, Sales Return, Purchase, Purchase Return, Expense, Quotation, Qtn. Sales, Qtn. Sales Return, Receivables, Payables, and Revenue / Expense / Profit-Loss Forecast for the next 6 months.
- Date filter: single or range.

### stock_transfer — Stock Transfers (`warehouseOnly`)
- **Form:** From Warehouse/Store (sel: Main Store or a warehouse); To Warehouse/Store; Date*; Remarks; Product Barcode Scan; Product Search* (Import From Quotations / Delivery Notes).
  - **Lines:** SI, Part No., Info, Qty (stock warning), P.Unit Price ex/inc VAT, Price totals.
  - Summary: totals, VAT, rounding (auto), net.
  - Print / Print A4; Previous / Next.
- **List:** Actions, Select, ID, Date, From Warehouse/Store, To Warehouse/Store, Total Qty, Net Total Amt., Created By, Created At. Summary: total amount, total qty.

### store — Stores (biggest config surface)
- **Screens:** list, create/edit (tabbed), view, StoreSettingsModal (Topbar quick settings: General, Address, Contact, Invoice Titles, Bank, Opening Balances, Logo, Invoice BG, ZATCA connect), `zatca_connect` (OTP).
  - Also StoreBackup (size breakdown, progress, download), StoreDuplicate (with new name and Arabic name, variants: with products, products without images, without data).
  - WhatsAppConnect (Evolution QR), WhatsAppContactsModal, Procurement email/WhatsApp widgets, WABA template tester/purpose widgets, StoreS3Widget.
- **List actions:** Name, Branch Code, Branch Name, Zatca phase columns; Connect to Zatca; View; Edit; Duplicate variants; Backup Data; Delete / Restore; Mark for Permanent Deletion after N days, Abort, Delete Permanently; WhatsApp contacts sync / clear / disconnect.
- **Create/Edit tabs and fields:**
  - **General Info:** Customer Package (sel); Zatca phase* (1 / 2); Zatca environment* (incl. NonProduction); Business category* (Supply Activities, Service Activities, Retail, Food and Beverages, Trading, Manufacturing, Healthcare, Real Estate, Construction, Transportation, Technology, Education, Financial Services); Registered Company Name*; Registered Company Name In Arabic*; Store Name; Store Name In Arabic; Branch Code* (`code`); Branch Name*; Title / Title In Arabic (optional); "Use products from other stores (optional)" (`use_products_from_store_id`); Registration Number (CRN)*; VAT NO. (15 digits)*; VAT %*. Changing key fields on phase 2 forces a ZATCA reconnect.
  - **National Address:** Country*; Short Code; Building Number (4 digits)*; Street Name* and Arabic; District Name* and Arabic; City Name* and Arabic; Zipcode (5 digits)*; Additional Number; Unit Number. Hidden: application_no, service_no, customer_account_no, each with an Arabic variant.
  - **Contact:** Phone*, Email*.
  - **Invoice Titles:**
    - Phase 1: Sales / Sales Return / Purchase / Purchase Return, each with Paid / Credit / Cash titles.
    - Phase 2 B2C and B2B: Sales, Sales Return, Purchase (Paid / Credit / Cash).
    - Other: Quotation, Delivery Note, Stock Transfer, Purchase Order, Payable, Receivable, Qtn. Sales and Qtn. Sales Return (paid / credit / cash), Non-VAT Sales and Non-VAT Sales Return (paid / credit / cash), RFQ PDF Title.
  - **Serial Numbers** (each has Prefix, Padding count and Counting start from, with a preview): sales, sales_return, purchase, purchase_return, quotation, quotation_sales, quotation_sales_return, delivery_note, stock_transfer, purchase_order, purchase_request, rfq_received, customer, vendor, customer_deposit, customer_withdrawal, expense, capital_deposit, divident, non_vat_sales, non_vat_sales_return. Toggle "Enable Monthly Serial Number Reset".
  - **Bank Account:** Bank Name, Customer No., IBAN, Account Name, Account No.
  - **Settings (checkboxes and numbers):**
    - Display: Show Currency Symbol; Show Seller Info in Invoice; Show Address in Invoice Footer; Show Received By Footer; Show Created By in Invoice/Receivables Preview; ZATCA QR on Left Bottom.
    - ZATCA: Enable ZATCA Reporting for Receivables (Debit Note) and Payables (Credit Note); Disable Sales Edit once Reported to ZATCA.
    - Payments: Auto Prompt Advance Payment Linking in Sales Payments; Display VAT in Receivables & Payables; Auto-close Sales Payment on Purchase; Auto-close Purchase Payment on Sales; Auto-close Payment on Return; Allow Adjusting Same-Date Payments.
    - Printing: Enable Invoice Print Type Selection; One Line Product Name in Invoice / Print Invoice; Add Price Details in Delivery Note; Skip Product Selection on Delivery Note Import.
    - Purchases and sales rules: Disable Purchases on Accounts; Block Sale When Purchase Price is Lower; Block Sales After N Pending (number, 0 = off).
    - Modules: Enable Warehouse Module; Custom Sales Invoice ID; Purchase Order Module; Purchase Requests Module; Drafts; RBAC Module; Sales Page Selection; Notifications; Products; Services; Customer P.O No. Field; Non VAT Sales; Employee Module; Automobile module.
    - Language: Enable Auto Translation to Arabic; Use RTL for Arabic; Enable Arabic Names List.
    - Products and pricing: Mark Allow Products Duplicates by Default; Enable Purchase Unit Price Validation; Enable Auto Update Wholesale & Retail Prices from Last Purchase (Margin %).
    - Balance sheet: Show Minus on Liability Balance; Hide Total Amount Row.
    - Quotations: Enable Quotation Invoice Accounting; Enable Sales in Quotation; Update Product Stock on Quotation Sales; No Tax for Quotation Invoice & Qtn Sales Return; Default Quotation Validity (days) and Delivery (days).
    - Statistics and dashboards: Show Overall Summary; Show Profit / Loss Statement; Common Dashboard; Auto Mobile Dashboard.
    - WhatsApp API: Use WhatsApp API (Evolution API URL / Key / Instance Name).
  - **Designs:** Balance Sheet Design (type1 / 2); Balance Sheet A4 Preview; Invoice A4 Preview Design (type1 / 2 / 3); A4 Preview Header; Balance Sheet Preview Header; Save Sidebar Config to Server; Save Print Settings to Server; Auto Refresh on New Version; VAT on Dashboards; Form designs for Sales (type1–5), Sales Return, Purchase, Purchase Return, Quotation and Qtn Sales Return.
  - **Logo** and **Invoice BG Image:** upload with guidelines (A4 595×842); remove.
  - **WhatsApp Settings:**
    - Tabs: Insights, Templates, Billing, Payments.
    - Enable AI RFQ Bot; Bot WhatsApp number (Meta webhook instructions, Verify Token `startpos-rfq-verify`).
    - WABA Business Account ID; RFQ Message Contact Number; RFQ intro text; WABA Template Tester.
  - **Purchase Bills:** Enable Purchase Bills Tracking; Purchase Managers Numbers (list).
  - **Email Settings:** Email Source accounts (Zoho etc. via OAuth or IMAP: Host, Port, Username, Password, Use SSL, Test Connection, Webhook URL); Incoming keyword filter (`incoming_email_keywords`); Outgoing email (from name and email, test, signatures); Auto-delete messages older than N days.
  - **Google Settings:** Google Maps API Key; RFQ minimum suppliers.
  - **RFQ Settings:**
    - Models: RFQ LLM provider and model; Classification LLM.
    - Toggles: disable auto RFQ from email / WhatsApp; Enable RFQ Module; Enable Populate RFQ Supplier on Create/Update ("Populate RFQ Suppliers from Vendors").
    - Values: Purchase Markets (`purchase_markets`, default forward markets `rfq_forward_markets`); Default Customer Quotation Margin % (35); Quotation Extraction LLM; RFQ allowed senders (WhatsApp number check and add).
    - Content Extraction Test: text and files → Extract.
  - **AI Models:** API keys per provider (`extraction_groq|gemini|openai|anthropic|xai_api_key`).
  - **Opening Balances:** Cash A/C Opening Balance and As of Date & Time; Bank A/C Opening Balance and date.
  - **ZATCA Credentials** (phase 2, read-only): Environment, Connected, OTP, CSR, Private Key, Binary Security Token, Secret, Production BST and Secret, Compliance and Production Request IDs, Last Connected / Disconnected At, Connection Errors.

### user — Users
- **Screens:** list (Online/Offline status), create/edit (wizard: Account then Permissions), view, ManageUsersModal (Topbar: search, role filter, Show Inactive, activate/deactivate, delete, change password), ChangePasswordModal.
- **Form:**
  - **Account Information:** Name*; Email*; Password* (on create; "Change password" on edit); Phone* (`mob`).
  - **Opening Balance:** Store owes User / User owes Store, amount, As Of Date.
  - **Role & Store Access:** Role* (sel: Manager, SalesMan, Admin; a Manager can only assign Manager or SalesMan; you can't change your own role); Stores (multi-store picker with search, Apply → `store_ids`); RBAC Roles (TA multi → `role_ids`). Hidden: `admin`.
- **List:** online, mob, name, email, created_by_name, created_at; filters on these.

### utils
- Shared modals and hooks listed in sections 1.8–1.12.
- Pickers/browsers: `customers.js`, `vendors.js`, `employees.js`, `products.js`, `sales.js`, `quotations.js`, `purchases.js`, `delivery_notes.js` and similar.
- Also: `PaymentView.js` (payment/discount list modal), `ProfitBreakdown`, `timezone.js` (country→offset), `pdfGenerator.js` (jsPDF), `dateUtils`, `numberUtils`, `imageUtils` (store-scoped image URL resolution), `SuccessModal`, `InfoDialog`, `OverflowTooltip`, `ResizableTableCell`.

### vehicle — Vehicles (automobile module)
- **Form:**
  - Customer: Search Customer* (TA).
  - Vehicle Identification: Brand* (sel from `/v1/vehicle/brands`), Model* (sel, depends on brand), Variant, Manufacture Year.
  - Registration & Technical: Vehicle Number (Plate)*, Istimara No., Chassis Number, Engine Number, Current KM, Color, Remarks.
- **List:** Vehicle #, Brand / Model, Year, Customer, Istimara No., Chassis #, KM, Color, Created At, Actions; single search box.

### vendor — Vendors / Suppliers
- **Form:**
  - **Vendor Identity:** Name*, Name In Arabic, Email, Phone, Phone 2, Contact Person, Country.
  - **Registration & VAT:** VAT NO., Registration Number (C.R NO.), VAT %.
  - **Remarks:** checkboxes "Use in Purchase / Purchase Return" (`use_remarks_in_purchases`) and `use_remarks_in_sales`.
  - **Product Categories:** tags (type and press Enter). Vendor category: `category_id`.
  - **National Address:** same fields as customer.
  - **Credit & Balances:** Credit Limit, Credit Balance.
  - **Opening Balance:** Store owes Vendor / Vendor owes Store, amount, date.
  - **Vendor Photos.**
- **List:** select, deleted, actions, ID, Name, Total Purchase Amount, Purchase Paid Amount, Credit Balance, Credit Limit, Purchase Count, Purchase Credit Balance, Phone, Email, Vat No., purchase paid / unpaid / partial counts, purchase return amount, paid, balance and status counts, Created By, Created At. Filters per column; "Ignore Zero Credit Balance"; Vendor Stats Summary.
- **View:** includes Arabic variants and national address with application, service and account numbers.

### vendor_category
- **Form:** Name*. List with search, Created By, delete.

### warehouse — Warehouses (`warehouseOnly`)
- **Form:**
  - **Warehouse Identity:** Name*, Name in Arabic, Phone, Email, Country.
  - **National Address:** Short Code, Building Number (4 digits), Street Name and Arabic, District and Arabic, City and Arabic, Zipcode (5 digits), Additional Number, Unit Number.
  - Hidden: zipcode_in_arabic.
- **List:** name, code. Warehouses have their own ZATCA disconnect.

---

## 3. Tests
- **Setup:** CRA Jest with `src/setupTests.js` (jest-dom). An MSW `setupServer()` is defined in `src/mocks/server.js`.
- **package.json `jest.moduleNameMapper`:** canvas, `.node`, jspdf and html2pdf.js are mapped to `src/__mocks__/`, which also holds a `react-i18next.js` mock.
- **Script:** `react-scripts test --forceExit --testTimeout=40000`.
- **350 test files.** Most modules have `__tests__/*.smoke.test.jsx` (Create, Index and View render smoke tests). There are also logic tests:
  - order: orderCalculations, customInvoiceID, pendingView, zatcaReconnect, priceBlurFix, quotationCarryover, previewContent.qrCode, print.fontSizes, warehouseStockDisplay, plus many z-index regression tests.
  - quotation: noTaxInvoice, importHandlers, drafts.
  - product: marginBackCalculation, unitPriceBidirectional.
  - store: StoreCreate zatcaReconnect, zipcodeValidation, useRTL, purchaseBills, incomingEmailKeywords.
  - i18n: integrity, coverage, col-label translation.
  - utils: dateUtils, numberUtils, timezone, profitCalcs, queryUtils, storeUtils, useTableSettings, useEnterKeyNavigation, pdfGenerator, pdfShare.
  - user: Login.security and login.storeSelection.
  - Also `sidebar_menu_config.test.js` and `Topbar.storeSettings.test.js`.
- **CI** (`.github/workflows/deploy.yml`, test branch; also `deploy_production`, `deploy_quick`, `deploy_v2`):
  - Node 17.9, ESLint errors-only.
  - Tests with `--testPathIgnorePatterns`: RFQReceived.smoke, importHandlers, QuotationCreate.productEditFocus, ProcurementEmailsTab.extract, create.extractionTest, chartTooltipSetup, deployTimeWindow, workshopI18n, PdfPriceExtraction.
  - The build fails on "Compiled with warnings". `deploy.sh` enforces a clean git tree, passing tests and no warnings.

---

## 4. Things a rebuild must not miss
1. Store-scoped data: `store_id` in every query and payload, per-store product pricing and stock, and store switching with a full reload.
2. The roughly 60 store settings flags that switch modules and fields on and off; the rebuild needs a single feature-flag source.
3. The five sales form layouts and the per-document form-design settings.
4. ZATCA: phase 1/2, B2B/B2C invoice titles, report button and status, edit lock, QR (server-provided or client TLV), PDF/A-3, debit/credit note reporting for receivables and payables, the reconnect flow.
5. Payment rows with special methods (sales_return, purchase, vendor_account, customer_account, purchase_fund, quotation_sales_return) and advance-payment reference linking.
6. Cross-document import (Quotation, Delivery Note or Purchase Order → Sales; Sales, Purchases or P.O. → Quotation; Purchase Order → Purchase; Repair Jobs → Sales, Quotation or Non-VAT invoice) and returns limited to the sold quantity.
7. Print system: A4 preview designs, per-section font controls, store-code stationery templates, server-side headless-Chrome PDF routes (`/invoice-print` etc.), WhatsApp (`wa.me` or Evolution API) and email sharing.
8. Keyboard shortcut sets per store code, barcode-wedge scanning, Enter-key navigation.
9. RBAC (resource × read/create/update/delete), role-based menu visibility, customer packages that restrict tabs.
10. AI procurement (RFQ, supplier forwarding, email and WhatsApp ingestion, LLM extraction, purchase bills) — a large, separate sub-product.
11. The workshop/automobile suite: vehicles, repair-job Kanban, technicians (employees), salaries, workshop dashboard.
12. The `/dashboard/salaries` route is missing from `App.js` (the outer router), so a hard load of that URL falls through to Login. Fix this in the rebuild.
