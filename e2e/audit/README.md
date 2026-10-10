# Role audit (`audit/`)

A "human-like" audit of StartPOS. The seeded owner signs in and does the following through the real UI:

- creates one brand-new audit store (`ZZ AUDIT <run id>`), with RBAC and "Use RTL for Arabic" turned on;
- builds one RBAC role per job on the User Roles screen;
- hires one user per persona on the Users screen.

Then each persona works through its day in a browser. The run covers phone, tablet and desktop sizes (320 to 1920 px, portrait and landscape) in English and Arabic. Every screen they reach gets these checks:

- layout (sideways scroll, controls off screen, small touch targets);
- English text left on Arabic screens;
- axe-core WCAG 2.1 A/AA;
- console errors and failed API calls;
- timing.

The result is `index.html`, `report.md` and `report.json` under `audit-reports/<run id>/`, with screenshots.

The audit is not a test suite. A failed expectation becomes a **finding** with evidence: detail, steps, screenshot, roles and devices. The run itself only fails (see the gate) when a persona cannot finish a scenario, the run aborts, or the store guard trips.

## Running it

It needs the same stack as `fullstack/`: pos-rest serving `../build` on `http://localhost:2000` with MongoDB and Redis, and the `e2e/seed` admin.

```
npm ci                                   # once; includes @axe-core/playwright
npm run audit                            # standard matrix, en + ar (~15–20 min)
AUDIT_MATRIX=smoke npm run audit         # one cell per scenario (~8 min)
npm run audit:gate -- audit-reports/<run id>/report.json
npm run test:audit-unit                  # node:test unit tests of the guard, gate, config, personas, report
```

| Variable | Default | Meaning |
|---|---|---|
| `AUDIT_MATRIX` | `standard` | `smoke`: each scenario once on a rotating device, first language. `standard`: each scenario on a phone, a tablet and a desktop, languages alternating, secondary roles rotating across the cells. `full`: every device in every language for every role. |
| `AUDIT_LANGS` | `en,ar` | Languages to cover. |
| `AUDIT_ONLY` / `AUDIT_ROLES` | all | Comma lists of scenario ids / persona ids (the owner always runs the setup). |
| `AUDIT_BASE_URL` | `http://localhost:2000` | Target. Anything not on localhost needs `--live` (see below). |
| `E2E_EMAIL` / `E2E_PASSWORD` | seed admin | The owner account (a platform Admin). |
| `E2E_CHROMIUM` | Playwright's | Chromium binary. |
| `AUDIT_OUT_DIR` | `audit-reports/<run id>` | Report folder (relative to `e2e/`). |
| `AUDIT_NO_AXE=1` | | Skip the axe-core checks. |
| `AUDIT_SETUP_DEVICE` | `laptop` | Device for the owner's setup. |
| `AUDIT_HEADED=1` | | Show the browser. |
| `ANTHROPIC_API_KEY` | unset | Turns on the optional Claude explorer, which uses the app as each persona for `AUDIT_EXPLORER_STEPS` (10) steps with model `AUDIT_MODEL` (`claude-opus-5-5`). It needs `npm install --no-save @anthropic-ai/sdk`. `AUDIT_NO_EXPLORER=1` turns it off. The key is never logged or written to the report. |
| `AUDIT_RUN_ID` + `AUDIT_PASSWORD` + `AUDIT_REUSE=1` | | Local development only. Reuses the audit store and users of an earlier run with that id instead of creating new ones, which helps when iterating on one scenario. It is refused on live runs. |

Each run creates exactly **one** store, with only a few users and records in it. Do not loop runs against a shared database. Each store adds MongoDB collections and indexes, so use `AUDIT_REUSE` when iterating.

## The store guard (`lib/guard.js`)

Every browser request passes through the guard. A violation aborts the request and stops the whole run (the run fails closed):

- **Live hosts.** Any request to `*.gulfunionozone.com` or `*.startuptech.uk` stops the run. The only exception is a `--live` run, and only for exactly its own target host.
- **Third-party hosts.** Writes are blocked; reads are counted in the report.
- **Sign-in.** Only the owner and the users this run created (`audit-<run id>-<role>@audit.startpos.test`) may sign in. Every API call must carry a token issued in this run.
- **Stores.** There is exactly one `POST /v1/store`, and the store must be named `ZZ AUDIT <run id>`. Before the owner's session has switched to it, other stores' data is blocked quietly. After the switch, any store id other than the audit store's, whether in the query, the body (nested lines and `product_stores` keys included) or `/v1/store/<id>`, stops the run. That includes a staff `/v1/me` that lists another store.
- **Writes.** A write that names no store must target a record this run created, or be a stateless calculator.
- **Users and roles.** `POST /v1/user` needs a run audit email, and other user writes need a user this run created. RBAC roles must be named `ZZ AUDIT <run id> …`.
- **Off-limits endpoints.** Store duplicate, permanent delete and restore, admin, `store-data`, rack migration and password reset are always refused.
- **Cross-store probe.** The permission sweep checks that a request naming a store outside the persona's assignment gets **403**. It uses a made-up store id (`fffffff0…`) that no store has. The guard allows only GETs with that id, so the probe never reads or writes real data.

`--live` (opt-in, never in CI) runs against a deployed site. It still creates a brand-new audit store and may touch nothing else, and it paces requests (`AUDIT_PACE_MS`, 250 ms). The default and CI paths are local only.

## Personas and scenarios

| Persona | Base role | RBAC role (created in setup) |
|---|---|---|
| owner | Admin (seed user) | – |
| manager | Manager | – |
| salesman | SalesMan | Sales desk: sales, returns, quotations, delivery notes, customers |
| cashier | SalesMan | Cashier: sales and customers (read + create) |
| accountant | SalesMan | Accounts: expenses, receivables/payables, read-only books |
| viewer | SalesMan | Read only: everything except users and roles |

| Scenario | Who | What |
|---|---|---|
| `setup` | owner | Empty and full store form, store switcher, RBAC roles (the saved permissions are checked against the ticked boxes), users (base role, store, RBAC role), and user form corner cases (invalid email, 3-character password, duplicate email, password hash in the response). |
| `signin` | all | Signs in by hand, checks the first screen, right-to-left in Arabic, and the side menu on narrow screens. |
| `permissions` | staff | Opens 13 guarded screens against the role matrix (Access Denied, Create buttons). Sends a cross-store request, which must get 403. Makes direct API writes the role must not have (product, vendor, customer, expense, user role). |
| `catalog` | owner, manager | Empty product form; long English and Arabic names; price with VAT; HTML/script in the name; negative price; duplicate part number; search. |
| `customers` | salesman, owner, cashier | Nameless customer; 5-digit VAT number; long Arabic name; listed. |
| `buying` | manager, owner | Vendor, then a purchase of 10 (product search box width on phones). |
| `selling` | cashier, salesman | No products, quantity 0 and −2, a huge quantity, a double-tapped Create, Back after saving, listed, and a quotation. |
| `returns` | owner, salesman | Returning more than was sold, then returning 1; payments list. |
| `expenses` | accountant, owner | Category, then amounts 0 and −50, then 125.50. |
| `stock` | manager, owner | Warehouse (empty name), then a stock transfer into it. |
| `reports` | accountant, owner, manager, viewer | Dashboard, statistics, ledger, accounts, analytics. |
| `language` | owner, salesman | Top-bar / ⋮ menu language switch, text direction, reload. |
| `keyboard` | owner (desktop) | Tabs through the Create Customer dialog (focus kept, focus visible), then Escape. |
| `browse` | viewer, cashier, accountant | Products, sales and purchases lists: timing and paging. |

## CI

The `role-audit` job builds and seeds pos-rest the same way as `e2e-fullstack` and serves the `frontend-build` artifact. It then runs `AUDIT_MATRIX=standard` and `node audit/gate.js`, which writes the GitHub job summary, and uploads `audit-reports/ci` as an artifact.

The gate fails on any of these:

- an aborted run;
- a store-guard violation;
- a persona run that could not finish.

Findings never fail the gate. They are listed in the summary and the report.
