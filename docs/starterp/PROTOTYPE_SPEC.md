# StartERP — HTML prototype spec (shared by all 3 variants)

StartERP is a rebuild of the existing "Start POS" app (React 17 frontend + Go/Mongo backend) into a
multi-tenant ERP-grade SaaS for the Saudi market. The prototype is a clickable, single-file HTML demo
that the owner will use to approve a visual direction before development. All 3 variants share the
SAME screens and content; they differ ONLY in visual design language. Quality bar: a high-class,
modern, professional ERP (think SAP Fiori / Oracle Redwood / Odoo 17 / Linear / Stripe dashboard
craft). Dense-but-calm data tables, precise alignment, tabular numbers, clear status pills,
keyboard-friendly, excellent forms.

Reference inventories of the real app (read the relevant parts to get real field names/labels):
- scratchpad/frontend_inventory.md (sections 1.8–1.13 and module sections: order, product, customer,
  vendor, purchase, quotation, store, repair_job, user, role)
- scratchpad/backend_inventory.md (sections 4–6: auth, ZATCA, counters, email providers)

## Hard technical rules (the file is published as a claude.ai Artifact)
- ONE self-contained .html file. Do NOT write <!doctype>, <html>, <head>, <body> tags; start with
  <title>, then <link> to Google Fonts, then <style>, then markup, then <script>.
- Title: "StartERP — Variant A" is NOT allowed (no dash explainers). Use e.g. `StartERP Enterprise`
  / `StartERP Studio` / `StartERP Najd` (name given in your variant brief).
- External: only Google Fonts stylesheets; scripts only from cdnjs.cloudflare.com (pinned version) if
  truly needed — prefer zero libraries. Hand-draw charts in inline SVG. Generate QR-like and barcode
  graphics yourself in SVG (a plausible pseudo QR grid and Code128/EAN-looking bars are fine).
- No alert/confirm/prompt (they don't work). Use in-page modals/toasts. No window.print — show a
  "Send to printer" button that opens a simulated print-job toast/progress instead.
- No real network calls. All data is sample data in JS.
- Routing: in-page JS router. Optional bare `#token` hashes (letters/digits/-/_ only), e.g. #pos,
  #pricing. Never `#a=b`.
- Theming: define every color as a CSS custom property on bare :root (light), redefine in
  `@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){...;color-scheme:dark}}` and in
  `:root[data-theme="dark"]{...;color-scheme:dark}`. body gets explicit background token. A theme
  toggle in the app top bar sets data-theme on document.documentElement.
- Language: EN/AR toggle sets `dir="rtl"` + `lang="ar"` on documentElement and swaps strings for at
  least: marketing nav/hero/CTAs, pricing plan names/CTAs, app sidebar, top bar, page titles, POS
  terminal buttons, key form labels. Use CSS logical properties (margin-inline-start, inset-inline-*,
  padding-inline) so RTL mirrors correctly. Use an Arabic Google Font (e.g. IBM Plex Sans Arabic,
  Noto Kufi Arabic, Tajawal, Cairo) for :lang(ar).
- Responsive: must work 360px phone → tablet (768/1024, portrait+landscape) → 1440/1920 desktop.
  No horizontal page scroll; wide tables scroll inside their own overflow-x:auto wrapper. Sidebar
  becomes an off-canvas drawer < 1024px; on phones add a bottom tab bar (Home, POS, Sales, Products,
  More). POS terminal re-flows: cart becomes a bottom sheet on phones.
- Touch: POS targets ≥ 48px. Visible focus rings. prefers-reduced-motion respected.
- Every form control has a stable id. Use `font-variant-numeric: tabular-nums` for money columns.
- Money: SAR with the new Saudi Riyal symbol rendered as text "SAR" or "﷼" fallback; VAT 15%.
- Open in a realistic working state: the app area must show populated sample data.
- Keep the file under ~600 KB. Write clean, well-organized code (CSS sections, JS modules as objects).

## Entry / navigation
Start on the Marketing Home. A small floating "Prototype navigator" pill (bottom-inline-end) opens a
menu listing every screen below so the reviewer can jump anywhere. Marketing "Start free trial" →
Signup; "Sign in" → Login → App Dashboard.

## Screens (all required)

### Public
1. **Marketing home** — ERP-grade landing page for KSA: sticky nav (Product, Industries, Pricing,
   ZATCA, Resources, Sign in, Start 15-day free trial), hero with a crafted product screenshot
   composed in HTML/CSS (not an image) of the dashboard/POS, trust strip ("ZATCA Phase 2 certified
   workflow", "Arabic & English", "Hosted in-region", "mada/STC Pay ready POS"), module grid (Sales &
   POS, Purchasing & Procurement, Inventory & Warehouses, Accounting & Ledger, ZATCA e-invoicing,
   Workshop, HR & Payroll, BI Analytics, AI RFQ procurement), industries section with the 7 verticals
   (Spare Parts, Restaurant, Automobile Garage/Workshop, Bakkala, Supermarket, Cafeteria, Fish Store)
   each with a tailored one-liner, ZATCA section (Phase 1 QR → Phase 2 integration: CSID onboarding,
   XML UBL 2.1, cryptographic stamp, hash chain, clearance/reporting), printing section (thermal
   58/80mm, A4/A5, dot-matrix, label printers), pricing teaser, testimonials (clearly fictional
   placeholder names of businesses in Riyadh/Jeddah/Dammam), FAQ, footer with CR/VAT placeholders.
2. **Pricing** — monthly/annual toggle (annual = 2 months free), prices in SAR excluding 15% VAT,
   "15-day free trial, no card" banner. Plans (use exactly):
   - **Starter** SAR 99/mo (990/yr): 1 branch, 3 users, 1 POS terminal, 2,000 products, sales,
     quotations, returns, customers, ZATCA Phase 2, thermal & A4 printing, barcode labels, email
     support.
   - **Business** (Most popular) SAR 249/mo (2,490/yr): 3 branches, 10 users, 3 POS terminals,
     unlimited products, purchasing & purchase returns, purchase orders, delivery notes, warehouses &
     stock transfer, expenses, customer/vendor statements, WhatsApp & email sharing, 1 industry
     vertical POS mode, chat support.
   - **Professional** SAR 499/mo (4,990/yr): 10 branches, 30 users, 10 POS terminals, everything in
     Business + full accounting (ledger, trial balance, balance sheet, capital & drawings), all 7
     industry POS modes, workshop & repair jobs, HR & salaries, RBAC roles, BI analytics, API access,
     priority support.
   - **Enterprise** from SAR 1,499/mo — custom: unlimited branches/users/terminals, AI RFQ
     procurement bot, dedicated account manager, SLA 99.9%, onboarding & data migration, custom print
     templates.
   - Add-ons: extra POS terminal SAR 49/mo, extra branch SAR 79/mo, extra user SAR 19/mo, WhatsApp
     API SAR 49/mo, AI procurement SAR 149/mo, extra 10 GB storage SAR 29/mo.
   - Full feature comparison table (grouped rows, check/dash marks), competitor-aware note avoided
     (do NOT name competitors). FAQ: trial, how to pay (bank transfer + receipt upload), VAT invoice
     for subscription, cancellation, data export.
3. **Sign up** — 3-step wizard with progress: (1) Account: full name, work email, mobile (+966),
   password with strength meter, (2) Business: business name EN, business name AR, business type
   select (7 verticals + General Trading/Wholesale + Services), VAT number (15 digits, starts & ends
   with 3, live validation), CRN (10 digits), city, branches count, (3) Plan: pick plan, notice "Your
   15-day trial starts today — ends 20 Oct 2026. No payment needed now." + terms checkbox → "Create my
   workspace" → success screen "Verify your email" (we sent a link) → continue to app.
4. **Sign in / Forgot password** — email+password, remember me, "Forgot password" → email sent
   state; also 2FA OTP step visual.

### App (authenticated shell)
Shell: left sidebar (collapsible to icons) with grouped navigation:
- Overview: Dashboard, Analytics
- Sales: POS Terminal, Sales Invoices, Quotations, Sales Returns, Delivery Notes, Non-VAT Sales,
  Debit Notes (DB customer_deposit), Credit Notes (DB customer_withdrawal)
- Purchases: Purchases, Purchase Orders, Purchase Requests, Purchase Returns, RFQ & AI
  Procurement
- Inventory: Products, Services, Categories, Brands, Warehouses, Stock Transfers, Barcode Labels
- Contacts: Customers, Vendors
- Finance: Expenses, Capital, Drawings, Ledger, Trial Balance, Balance Sheet
- Workshop: Repair Jobs, Vehicles
- People: Employees, Salaries
- Settings: Store, ZATCA e-Invoicing, Printing, Email, WhatsApp, Users & Roles, Subscription
- (Admin only, visually separated) Platform Admin: Payment Approvals, Tenants, Plans, System Email
Top bar: store/branch switcher (e.g. "Al Noor Trading — Riyadh HQ", "Jeddah Branch"), global search
with Ctrl+K command palette (working: filters a list of screens/actions), trial banner ("Trial: 12
days left · Choose a plan"), notification bell with badge (shows "2 payment receipts awaiting
approval", "ZATCA: 1 invoice failed reporting", "Low stock: 5 items"), language toggle, theme toggle,
user avatar menu (role: Admin). Breadcrumbs + page title + primary actions on each page.

Screens without a dedicated design below can show a well-made generic list page (filters, table,
pagination) so every nav item lands somewhere sensible.

5. **Dashboard** — KPI row (Today's sales, This month revenue, Gross profit, Receivables due, Payables
   due, VAT payable), SVG area chart (30 days sales vs purchases), sales by branch bar, payment method
   donut (Cash, mada, Credit card, Bank transfer, Credit), ZATCA health card (reported / failed /
   pending, last sync), recent invoices table, low-stock list, top products.
6. **Sales Invoices list** — summary stat strip, filter bar (code, date single/range, customer,
   payment status, payment methods, created by, ZATCA status, drafts toggle), column settings button,
   table columns: ID, Date, Customer, Net Total, Amount Paid, Credit Balance, ZATCA (REPORTED /
   COMPLIANCE FAILED / REPORTING FAILED / NOT REPORTED pills), Payment Status (paid / partially / not
   paid), Payment Methods, Net Profit, Created By; row action menu (View, Edit, Print, Print A4,
   WhatsApp, Email, Payments history, Create return, Report to ZATCA, Delete); bulk select;
   pagination; export Excel button.
7. **Sales Invoice create** — the most important form. Must contain ALL of these inputs (don't omit):
   - Header: "Report to ZATCA" toggle, Switch to Quotation, Prev/Next, Save as draft, Print, Print A4,
     Create.
   - Customer typeahead (Name / Mobile / VAT / ID) with New / Edit / Browse buttons, credit balance &
     credit limit chips, "View pending invoices" link; walk-in customer free text; Date; Phone; VAT No.
     (15 digits); Address; Remarks; Customer P.O. No.; Invoice ID (custom, "auto-generate if empty");
     Workshop fields shown when vertical=Garage: Vehicle select, Km driven, Repair job link.
   - Product barcode scan input (focus ring, "Scan or type barcode"); product search typeahead with
     Products/Services tabs; Import dropdown (From Quotations, From Delivery Notes, From Purchase
     Order).
   - Line table columns: #, Part No., Name (editable), Info menu (history), P. Unit Price, Stock (with
     warehouse breakdown popover), Remove stock from (Main store / Warehouse), Qty, Unit, U. Price ex
     VAT, U. Price inc VAT, U. Disc ex VAT, U. Disc %, Total ex VAT, Total inc VAT, delete. Live
     recalculation in JS with 3–4 sample lines (e.g. Toyota brake pads, oil filter, engine oil 5W-30).
     Inline validation example: one row showing "Unit price below purchase price" warning.
   - Bill summary: Total ex VAT, Total inc VAT, Shipping & handling, Discount ex VAT / inc VAT /
     % toggle, Taxable amount, VAT % (15) and amount, Before rounding, Rounding (Auto checkbox), Net
     total inc VAT.
   - Payments: rows with Date, Amount, Method (Cash, mada/Debit card, Credit card, Bank card, Bank
     transfer, Bank cheque, Sales return, Customer account), Description, Reference (advance link),
     remove; "Add payment"; Total paid, Balance due, Payment status pill.
   - Cash discount, Commission amount, Commission payment method.
   - Keyboard hints bar (F2 search product, F4 customer, F8 payments, Ctrl+S save, Ctrl+P print).
8. **Invoice view** — document-style preview + side panel: ZATCA info (Status: Cleared/Reported,
   Invoice type: Simplified tax invoice 0200000 / Standard 0100000, UUID, ICV, Invoice hash, Previous
   invoice hash (PIH), Signing time, QR), payment history, activity timeline, actions (Download PDF,
   PDF/A-3 with XML, Print, WhatsApp, Email, Create return, Report to ZATCA).
9. **POS Terminal (touch)** — full-screen, touch-first, ERP-grade. Top: vertical mode switcher with
   the 7 business types; each mode changes the layout meaningfully:
   - **Spare Parts**: part-number/OEM search first, vehicle make/model/year compatibility filter, rack
     location & stock per warehouse on cards, cross-reference/alternatives chips.
   - **Restaurant**: floor plan of tables (free/occupied/bill-requested), order type Dine-in /
     Takeaway / Delivery (Jahez/HungerStation/Keeta as generic "aggregator" chips is fine, or
     "Delivery app"), menu categories, item modifiers modal (size, extras, remove onion), guests
     count, "Send to kitchen (KOT)", split bill.
   - **Automobile Garage/Workshop**: job card header (plate number KSA format e.g. "ABC 1234", vehicle,
     km, technician), labor services + parts tabs, job status steps (Received → Diagnosing → In
     progress → Ready → Delivered).
   - **Bakkala**: big quick-key grid of daily items, weighed items, customer credit ("account") tab
     with balance, fast cash.
   - **Supermarket**: scan-first layout (big barcode field, last scanned item highlight), weighing
     scale barcode support note (prefix 2x), quantity multiplier, loyalty phone lookup, promotions
     applied (Buy 2 get 1).
   - **Cafeteria**: quick menu tiles, size (S/M/L) & add-ons, order number/token display, "call order".
   - **Fish Store**: price per kg, live scale weight readout (simulated, e.g. 1.245 kg), cleaning &
     cutting options (Whole, Cleaned, Fillet, Steaks; grilled/fried service charge), tare.
   Cart panel: lines with qty steppers, customer chip, discount, VAT breakdown, total; Hold / Recall /
   Void / Price check; Pay → payment modal: Cash with numeric keypad and quick notes (50/100/200/500),
   mada, Credit card, STC Pay, Split payment, change due; on completion show receipt preview (80mm
   thermal with ZATCA QR) and "Print receipt" / "New sale". Show cashier name, shift, terminal id,
   online/ZATCA sync status.
10. **Products** list + **Product create/edit** (tabs: General: Name, Name in Arabic (with
    "Translate" button), Part number, Barcode (generate), Category (multi), Brand, Country of origin,
    Unit (PCS, Kg, Meter, Liter, Box...), Rack/location, Item code, Allow duplicates, Is service;
    Pricing per store: Purchase unit price, Wholesale unit price, Retail unit price (ex/inc VAT pair),
    damage/loss; Stock per store & warehouse with opening stock; Set/Linked products; Images gallery
    upload; Product history tab).
11. **Customers** create form (Code, Name, Name in Arabic, VAT No., CRN, Phone, Phone 2, Email, Credit
    limit, Credit days/terms, Remarks, National address: building no., street EN/AR, district EN/AR,
    city EN/AR, zip, additional no., unit no., country; contact person; images) + list.
12. **Invoice Print Studio** (Settings → Printing) — highly professional:
    - Printer profiles list (e.g. "Counter 1 — Epson TM-T88VI (80mm, LAN 192.168.1.50)", "Office —
      HP LaserJet A4", "Warehouse — Epson LQ-310 dot-matrix", "Label — Zebra ZD421").
    - Add printer: Connection (System/Browser print, Network ESC/POS (IP:9100), USB (WebUSB), Bluetooth
      (Web Bluetooth), Print agent (local desktop bridge for silent printing)), Language/driver
      (ESC/POS, StarPRNT, ZPL, TSPL, EPL, PCL/PostScript via OS, Dot-matrix ESC/P), brands list
      (Epson, Star, Bixolon, Xprinter, Sunmi built-in, Citizen, HP, Canon, Brother, Zebra, TSC,
      Godex, Honeywell, Rongta, Sewoo), Test print button with simulated result.
    - Paper sizes: Thermal 58mm, 80mm, 112mm; A4; A5; A6; Letter; Legal; Half letter; Dot-matrix
      continuous 9.5"×11" and 9.5"×5.5"; Pre-printed stationery; Custom (W×H mm).
    - Template gallery per document type (Sales, Simplified tax invoice, Credit note, Quotation,
      Delivery note, Receipt voucher, Purchase order, Statement, Kitchen ticket (KOT), Job card).
    - Designer: bilingual layout (EN | AR side by side), logo, header/footer, invoice background,
      margins, font family/size per section, show/hide fields, QR position (top-right / bottom-left),
      columns, copies, auto-print after save, cut paper, open cash drawer, page break rules.
    - Live preview pane that switches between 80mm thermal receipt and A4 tax invoice rendering, with
      ZATCA QR and all mandatory fields (Seller name, VAT, CRN, address, invoice no., issue date &
      time, buyer VAT for B2B, line VAT, totals, QR).
13. **Barcode Label Studio** (Inventory → Barcode Labels): pick products & quantities (table),
    label stock presets (38×25, 40×30, 50×25, 50×30, 58×40, 60×40, 100×50, 100×150 shipping, jewelry
    tag 72×10; A4 sheets: 21, 24, 30, 40, 65 labels), symbology (EAN-13, EAN-8, UPC-A, Code 128,
    Code 39, ITF-14, QR, Data Matrix, GS1-128, Scale/weight barcode), fields toggles (Name EN, Name
    AR, Price inc VAT, Part no., Brand, Pack date, Expiry (bakery/fish), Weight, Store name), printer
    language (ZPL / TSPL / EPL / ESC-POS / Browser PDF), DPI (203/300/600), gap/black-mark, rotation,
    live label preview grid, "Generate ZPL" code preview panel.
14. **ZATCA e-Invoicing** (Settings): environment segmented control (Developer portal / Simulation /
    Production) — show "Non-production · Developer portal" selected with the test taxpayer: VAT
    399999999900003, CRN 4030360927. EGS onboarding stepper: (1) Taxpayer & EGS details form (Common
    name, Serial number "1-StartERP|2-POS1|3-<uuid>", Organization identifier = VAT, Organization unit
    (branch), Organization name, Country SA, Invoice type 1100 (Standard+Simplified), Location
    address, Industry/business category), (2) OTP from Fatoora portal, (3) Generate CSR & keys
    (secp256k1), (4) Compliance CSID, (5) Compliance checks — 6 sample docs with pass marks (Standard
    invoice 388, Standard credit note 383, Standard debit note 381, Simplified invoice, Simplified
    credit note, Simplified debit note), (6) Production CSID → Connected. Plus: certificate expiry,
    reporting queue table (doc no., type, B2B/B2C, clearance/reporting, status, attempts, last error),
    hash-chain monitor (ICV, PIH continuity check), "Reconnect required" banner example.
15. **Subscription & Billing** (tenant): current plan card with trial progress (Day 3 of 15), usage
    meters (users, branches, terminals, products), plan picker, "Pay by bank transfer" panel showing
    the company bank account (clearly marked SAMPLE: Beneficiary "StartERP Information Technology
    Co.", Bank, IBAN SA03 8000 0000 6080 1016 7519 (sample), Account no., SWIFT, amount incl. VAT,
    transfer reference code "STE-7F3K2"), copy buttons, steps (1 transfer via your banking app,
    2 upload receipt image/PDF, 3 we verify within 24 hours), drag-and-drop upload zone (file input
    works, shows file name/size + thumbnail for images), submitted receipts history with statuses
    (Pending review / Approved / Rejected with reason), subscription invoices (ZATCA compliant tax
    invoices from StartERP).
16. **Platform Admin → Payment Approvals**: header bell shows new receipt notifications; queue table
    (Tenant, Plan, Period, Amount, Reference, Uploaded at, Bank, status); detail drawer with receipt
    preview (render a mock bank-transfer receipt in HTML), matching checks (amount matches, reference
    matches), Approve (activates plan, sets period dates, sends email) / Reject with reason select +
    note; toast feedback; tenants list with trial/active/expired/suspended pills.
17. **Email settings** — two scopes:
    - Store-level (Settings → Email): Outgoing provider picker cards (SMTP generic, Google Workspace /
      Gmail (OAuth), Microsoft 365 / Outlook (OAuth), Zoho Mail, Amazon SES, SendGrid, Mailgun,
      Postmark, Brevo, Resend, SparkPost, Mailjet); dynamic form per provider (SMTP: host, port,
      encryption None/SSL/TLS/STARTTLS, username, password, from name, from email, reply-to; API
      providers: API key, domain/region, sender); Incoming: IMAP / POP3 / Gmail API / Microsoft Graph
      (host, port, SSL, username, password/OAuth, folder, polling interval, mark as read); Signatures
      (HTML, default); "Send test email" with recipient + step-by-step result log (DNS → connect → TLS
      → auth → send → delivered) and SPF/DKIM/DMARC check chips.
    - Platform-level (Admin → System Email): same provider config + transactional templates list
      (Email verification, Welcome, Password reset, Trial ending in 3 days, Trial expired, Payment
      receipt received, Subscription activated, Payment rejected, Invoice) with bilingual subject/body
      editor, variables chips ({{name}}, {{workspace}}, {{trial_end}}, {{reset_link}}), preview.
18. **Users & Roles**: users table (name, email, role, stores, status, last login) + role editor with
    permission matrix (resources × Read/Create/Update/Delete) — use the real resources: sales,
    quotation, sales_return, purchase, purchase_return, product, customer, vendor, expense, store,
    user, user_roles, zatca, reports, pos.
19. **Store settings** (sample of the feature flags grouped in cards with toggles): Invoice numbering
    (prefix, padding, monthly serial, start from), Sales form design (Classic/Compact/Workshop/Van),
    Enable drafts, Block sale below purchase price, Block sales after N pending invoices, Customer P.O.
    No., Custom invoice ID, Warehouses module, Report to ZATCA by default, Lock edit after ZATCA
    reporting, Show created-by on invoice, QR bottom-left, Invoice print type selection, WhatsApp
    API (Evolution) settings, Store info (name EN/AR, branch, VAT, CRN, national address, logo).
20. **Repair Jobs** Kanban (columns by status, job cards with plate, vehicle, customer, technician,
    amount) and a **Reports** hub (cards: Sales, Sales returns, Purchases, VAT return report (KSA VAT
    form boxes), Profit & loss, Stock valuation, Customer aging, Vendor aging, Expense, Z-report per
    POS shift).

## Sample data flavor
KSA businesses: "Al Noor Auto Spare Parts", branches Riyadh (Al Olaya), Jeddah (Al Rawdah), Dammam.
Customers: "Gulf Union Ozone Co.", "Riyadh Fleet Services", walk-in "Cash Customer". Invoice codes like
"INV-20261005-0142". Products: "Brake Pad Set Toyota Camry 2018-2022 (04465-33471)", "Oil Filter
90915-YZZE1", "Mobil 1 5W-30 4L" — fine as generic product descriptions. Dates around Oct 2026.
Fictional people names: Faisal Al-Harbi, Noura Al-Qahtani, Omar Siddiqui, Ahmed Khan.
