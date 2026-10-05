# pos-rest (StartPOS backend): A–Z inventory for a rebuild spec

Repo: `/home/user/pos-rest`. Go module `github.com/sirinibin/startpos/backend` (go 1.26). Router is gorilla/mux, all routes in `/home/user/pos-rest/main.go`. MongoDB driver 1.17. Redis (go-redis v6). Handlers are in `controller/`, models and DB access in `models/`.

Main libraries: dgrijalva/jwt-go, jameskeane/bcrypt, go-co-op/gocron, googollee/go-socket.io (created but not served), gorilla/websocket, chromedp (PDF), xuri/excelize, jung-kurt/gofpdf, boombuler/barcode, hennedo/escpos, Google Cloud Translate, golang.org/x/oauth2.

---

## 0. Global conventions (needed for compatibility)

- **Response envelope** (`models/response.go`): `{status: bool, criterias?, total_count, result?, errors?: {field: msg}, meta?}`.
- **Store selection**: every store-scoped endpoint needs query param `search[store_id]=<hex>` (`controller/common.go: ParseStore`). The handler loads the store from main DB `store`, then reads and writes `store_<hex>` DB.
- **List query params** (`models/common.go`):
  - `page`, `limit` and `sort` (e.g. `-created_at`).
  - `select` (comma list, parsed by `ParseSelectString`).
  - Filters: `search[<field>]`. Examples: `search[code]`, `search[customer_id]`, `search[date_str]`, `search[from_date]`/`search[to_date]`, `search[created_at_from]`/`_to`, `search[payment_status]`, `search[payment_methods]`, `search[zatca.reporting_passed]`, `search[net_total]`. Operators can be prefixed on values (`GetMongoLogicalOperator`).
  - Timezone offset comes from the request (`TimezoneOffsetFromRequest`) or from the store's country code.
- **Soft delete** convention: `deleted`, `deleted_by`, `deleted_at`, `deleted_by_name`.
- **Audit fields** on almost every entity: `created_at`, `updated_at`, `created_by`, `updated_by`, `created_by_name`, `updated_by_name`.
- **Enum values**:
  - Payment methods: `cash`, `debit_card`, `bank_card`, `credit_card`, `bank_transfer`, `bank_cheque`, `customer_account` (also `bank_account`, `purchase_fund`).
  - Payment status: `paid`, `not_paid`, `paid_partially`.
  - Quotation `type`: `quotation` or `invoice` (an "invoice" quotation is a "quotation sales" document).
  - Payment `reference_type` values: `customer_deposit`, `customer_withdrawal`, `quotation`, `quotation_sales`, `quotation_sales_return`, `purchase`, `purchase_return`, `non_vat_sales`, `non_vat_sales_return`.

---

## 1. API routes (all in main.go, in registration order by module)

Unless noted, a route needs a JWT (`AuthenticateByAccessToken`). Many routes also need `search[store_id]`.

### MCP-optimised read API (`controller/mcp_*.go`), all GET except login
| Method | Path | Handler |
|---|---|---|
| POST | /v1/mcp/login | MCPLogin (email+password → access token directly) |
| GET | /v1/mcp/stores, /v1/mcp/me | MCPListStores, MCPMe |
| GET | /v1/mcp/sales/summary, /orders, /order/{id}, /sales/history/summary, /sales/history, /sales-return/summary, /sales-returns, /sales-return/history | MCPSalesSummary, MCPListOrders, MCPGetOrder, MCPSalesHistorySummary, MCPListSalesHistory, MCPSalesReturnSummary, MCPListSalesReturns, MCPListSalesReturnHistory |
| GET | /v1/mcp/purchases/summary, /purchases, /purchase/{id}, /purchases/history/summary, /purchases/history, /purchase-returns/summary, /purchase-returns | MCPPurchaseSummary, MCPListPurchases, MCPGetPurchase, MCPPurchaseHistorySummary, MCPListPurchaseHistory, MCPPurchaseReturnSummary, MCPListPurchaseReturns |
| GET | /v1/mcp/customers/summary, /customers/new, /customers, /customer/{id} | MCPCustomerSummary, MCPGetNewCustomers, MCPListCustomers, MCPGetCustomer |
| GET | /v1/mcp/vendors/summary, /vendors, /vendor/{id} | MCPVendorSummary, MCPListVendors, MCPGetVendor |
| GET | /v1/mcp/products/summary, /products, /product/{id}, /product-categories, /product-brands | MCPProductSummary, MCPListProducts, MCPGetProduct, MCPListProductCategories, MCPListProductBrands |
| GET | /v1/mcp/expenses/summary, /expenses, /expense/{id}, /expense-categories | MCPExpenseSummary, MCPListExpenses, MCPGetExpense, MCPListExpenseCategories |
| GET | /v1/mcp/customer-deposits, /customer-withdrawals, /capitals, /ledger, /accounts | MCPListCustomerDeposits, MCPListCustomerWithdrawals, MCPListCapitals, MCPListLedger, MCPListAccounts |
| GET | /v1/mcp/warehouses, /stock-transfers, /delivery-notes, /quotations/summary, /quotations, /quotation/{id} | MCPListWarehouses, MCPListStockTransfers, MCPListDeliveryNotes, MCPQuotationSummary, MCPListQuotations, MCPGetQuotation |
| GET | /v1/mcp/profit-loss | MCPProfitLossStatement |
| GET | /v1/mcp/bi/{monthly-revenue, top-products, top-customers, expense-summary, outstanding, stock-alerts, vendor-performance, quotation-conversion, sales-by-category, product-abc-xyz, customer-churn, customer-clv, cohort-retention, product-sales-trends, monthly-pl, daily-revenue, hourly-sales, product-return-rate, customers-over-credit, store-settings} | MCPBIMonthlyRevenue, MCPBITopProducts, MCPBITopCustomers, MCPBIExpenseSummary, MCPBIOutstanding, MCPBIStockAlerts, MCPBIVendorPerformance, MCPBIQuotationConversion, MCPBISalesByCategory, MCPBIProductAbcXyz, MCPBICustomerChurn, MCPBICustomerCLV, MCPBICohortRetention, MCPBIProductSalesTrends, MCPBIMonthlyPL, MCPDailyRevenue, MCPHourlySales, MCPProductReturnRate, MCPCustomersOverCredit, MCPBIStoreSettings |

### Info, health and auth
| Method | Path | Handler |
|---|---|---|
| GET | /v1/info | APIInfo |
| GET | /v1/health | HealthCheck (no auth; checks Redis and Mongo) |
| GET | /v1/openapi.json | ServeOpenAPISpec |
| POST | /v1/register | Register |
| POST | /v1/guest-register | GuestRegister (rate limited, no auth; creates a store plus a user with Role "Manager") |
| POST | /v1/authorize | Authorize (rate limited; email+password → auth code) |
| POST | /v1/accesstoken | Accesstoken (auth_code → access+refresh) |
| POST | /v1/refresh | RefreshAccesstoken |
| GET | /v1/me | Me |
| DELETE | /v1/logout | LogOut |

### Store
| Method | Path | Handler |
|---|---|---|
| POST, GET | /v1/store | CreateStore, ListStore |
| GET | /v1/store/list | ListStoreList (slim: id, name, name_in_arabic, code, branch_name, vat_no) |
| GET | /v1/store/{id}/backup/size; POST /backup/start; GET /backup/progress; GET /backup/file | GetStoreBackupSize, StartStoreBackup, GetStoreBackupProgress, DownloadStoreBackupFile (ZIP) |
| GET/POST/GET | /v1/store/{id}/duplicate/{size,start,progress} | GetStoreDuplicateSize, StartStoreDuplicate, GetStoreDuplicateProgress |
| same | /v1/store/{id}/duplicate-with-products/{size,start,progress} | …WithProducts… |
| same | /v1/store/{id}/duplicate-with-products-no-images/{size,start,progress} | …WithProductsNoImages… |
| same | /v1/store/{id}/duplicate-without-data/{size,start,progress} | …WithoutData… |
| POST | /v1/store/{id}/restore | RestoreStore |
| POST | /v1/store/{id}/mark-permanent-deletion | MarkStoreForPermanentDeletion |
| POST | /v1/store/{id}/abort-permanent-deletion | AbortStorePermanentDeletion |
| DELETE | /v1/store/{id}/permanent | PermanentlyDeleteStore |
| POST | /v1/store/{id}/populate-test-data | PopulateStoreTestData |
| POST | /v1/store/{id}/clear-data | ClearStoreData |
| GET | /v1/store/{id}/serial-locks | GetStoreSerialLocks |
| GET, PUT, DELETE | /v1/store/{id} | ViewStore, UpdateStore, DeleteStore |
| PUT | /v1/store/{id}/print-settings | UpdateStorePrintSettings |
| PUT | /v1/store/{id}/sidebar-config | UpdateStoreSidebarConfig |
| PUT | /v1/store/{id}/email-signatures | UpdateStoreEmailSignatures |
| POST | /v1/store/{id}/migrate-to-s3 | MigrateAttachmentsToS3Handler |

### Warehouse
| Method | Path | Handler |
|---|---|---|
| POST, GET | /v1/warehouse | CreateWarehouse, ListWarehouse |
| GET, PUT, DELETE | /v1/warehouse/{id} | ViewWarehouse, UpdateWarehouse, DeleteWarehouse |

### Customer
| Method | Path | Handler |
|---|---|---|
| GET | /v1/customer/summary | CustomerSummary |
| GET | /v1/customer/by-phone | FindCustomerByPhoneHandler |
| POST | /v1/customers/normalize-phones | NormalizeCustomerPhonesHandler |
| GET | /v1/customer/vat_no/name | ViewCustomerByVatNoByName |
| POST | /v1/customer/upload-image, /v1/customer/delete-image | UploadCustomerImage, DeleteCustomerImage |
| POST | /v1/customer/find-or-create | FindOrCreateCustomerHandler |
| POST, GET | /v1/customer | CreateCustomer, ListCustomer |
| GET | /v1/customer/{id}/history | GetCustomerHistory |
| POST | /v1/customer/restore/{id} | RestoreCustomer |
| GET, PUT, DELETE | /v1/customer/{id} | ViewCustomer, UpdateCustomer, DeleteCustomer |

### Product
| Method | Path | Handler |
|---|---|---|
| GET | /v1/product/summary | ProductSummary |
| POST | /v1/product/migrate-rack | MigrateProductRackToWarehouseRacks |
| POST, GET | /v1/product | CreateProduct, ListProduct |
| GET | /v1/product/json | ListProductJson |
| GET | /v1/product/{id}/last-purchase-price | GetProductLastPurchasePrice |
| GET, PUT, DELETE | /v1/product/{id} | ViewProduct, UpdateProduct, DeleteProduct |
| GET | /v1/product/code/{code} | ViewProductByItemCode |
| GET | /v1/product/barcode/{barcode} | ViewProductByBarCode |
| POST | /v1/product/restore/{id} | RestoreProduct |
| POST | /v1/product/upload-image, /delete-image | UploadProductImage, DeleteProductImage |
| GET | /v1/product/history/summary/{id} | ProductHistorySummary |
| GET | /v1/product/history/{id} | ListProductHistory |
| GET | /v1/product/{id}/bi-history | GetProductBiHistory |

### BI (UI)
GET routes:
- /v1/bi/monthly-pl → BIMonthlyPL
- /v1/bi/monthly-revenue → GetBIMonthlyRevenue
- /top-products, /top-customers, /expense-summary, /outstanding, /stock-alerts, /vendor-performance, /quotation-conversion, /product-abc-xyz, /customer-churn, /customer-clv, /cohort-retention, /product-sales-trend, /sales-by-category → the matching GetBI* handlers

### Expense, deposits/withdrawals, capital, dividend
Each module has the same six routes:
- POST `<base>` → Create
- GET `<base>` → List
- GET `<base>/{id}` → View
- GET `<base>/code/{code}` → ViewByCode
- PUT `<base>/{id}` → Update
- DELETE `<base>/{id}` → Delete

| Base path | Handler prefix | Notes |
|---|---|---|
| /v1/expense | …Expense | Also GET /v1/expense/summary → ExpenseSummary |
| /v1/customer-deposit | …CustomerDeposit | Receivables |
| /v1/customer-withdrawal | …CustomerWithdrawal | Payables |
| /v1/capital-withdrawal | …CapitalWithdrawal | |
| /v1/capital | …Capital | |
| /v1/divident | …Divident | Spelling "divident" is used in route, collection and fields |

### Lookups and master data
Each has CRUD routes: POST and GET on the base path; GET, PUT and DELETE on `/{id}`.

| Base path | Extra routes |
|---|---|
| /v1/product-category | POST /restore/{id} |
| /v1/service-category | POST /restore/{id} |
| /v1/product-brand | POST /restore/{id} |
| /v1/arabic-name | DELETE /permanent/{id}, POST /restore/{id} |
| /v1/customer-package | (main DB; see section 6) |
| /v1/expense-category | |
| /v1/vendor-category | |
| /v1/signature | |

### Automobile workshop
- Employee: CRUD on `/v1/employee`, plus DELETE `/v1/employee/permanent/{id}` (HardDeleteEmployee).
- Salary payments: CRUD on `/v1/employee-salary-payment`.
- Vehicle: GET `/v1/vehicle/brands`, plus CRUD on `/v1/vehicle`.
- Repair job: CRUD on `/v1/repair-job`.
- Dashboard: GET `/v1/automobile/dashboard` → GetAutoMobileDashboard.

### User and RBAC
| Method | Path | Handler |
|---|---|---|
| POST, GET | /v1/user | CreateUser, ListUser |
| GET, PUT, DELETE | /v1/user/{id} | ViewUser, UpdateUser, DeleteUser |
| PATCH | /v1/user/{id}/change-password | ChangePassword |
| PATCH | /v1/user/{id}/toggle-status | ToggleUserStatus |
| GET | /v1/user-role/effective-permissions | GetEffectivePermissions |
| CRUD | /v1/user-role, /v1/user-role/{id} | Create/List/View/Update/DeleteUserRole |

### Quotation
| Method | Path | Handler |
|---|---|---|
| GET | /v1/quotation/history/summary, /v1/quotation/history | QuotationHistorySummary, ListQuotationHistory |
| GET | /v1/quotation/sales/summary, /v1/quotation/summary | QuotationSalesSummary, QuotationSummary |
| POST | /v1/quotation | CreateQuotation |
| POST | /v1/quotation/calculate-net-total | CalculateQuotationNetTotal |
| GET | /v1/quotation | ListQuotation |
| GET, PUT, DELETE | /v1/quotation/{id} | View/Update/DeleteQuotation |
| DELETE | /v1/quotation/{id}/order/{order_id} | UnlinkOrderFromQuotation |
| GET | /v1/previous-quotation/{id}, /v1/next-quotation/{id}, /v1/last-quotation | ViewPrevious/Next/LastQuotation |

### Delivery note (no DELETE route)
| Method | Path | Handler |
|---|---|---|
| GET | /v1/delivery-note/history | ListDeliveryNoteHistory |
| POST | /v1/delivery-note/calculate-net-total | CalculateDeliveryNoteNetTotal |
| GET | /v1/delivery-note/reminders | ListDeliveryNoteReminders |
| POST, GET | /v1/delivery-note | Create, List |
| GET, PUT | /v1/delivery-note/{id} | View, Update |

### Stock transfer
| Method | Path | Handler |
|---|---|---|
| POST | /v1/stock-transfer | CreateStockTransfer |
| POST | /v1/stock-transfer/calculate-net-total | CalculateStockTransferNetTotal |
| PUT, GET | /v1/stock-transfer/{id} | Update, View |
| GET | /v1/stock-transfer | List |
| GET | /v1/previous-stock-transfer/{id}, /v1/next-stock-transfer/{id}, /v1/last-stock-transfer | Prev/Next/Last |
| GET | /v1/stock-transfer/history | ListStockTransferHistory. Registered after `/{id}`, so it is probably shadowed. |

### Sales ("order", no DELETE)
| Method | Path | Handler |
|---|---|---|
| POST | /v1/order | CreateOrder |
| POST | /v1/order/calculate-net-total | CalculateSalesNetTotal |
| PUT, GET | /v1/order/{id} | UpdateOrder, ViewOrder |
| GET | /v1/order | ListOrder |
| GET | /v1/previous-order/{id}, /v1/next-order/{id}, /v1/last-order | ViewPrevious/Next/LastOrder |
| GET | /v1/sales/summary | SalesSummary |
| GET | /v1/sales/history/summary, /v1/sales/history | SalesHistorySummary, ListSalesHistory |
| GET | /v1/sales-return/history/summary, /v1/sales-return/history | SalesReturnHistorySummary, ListSalesReturnHistory |
| GET | /v1/quotation-sales-return/history/summary, /history | QuotationSalesReturnHistorySummary, ListQuotationSalesReturnHistory |
| GET | /v1/purchase/history/summary, /v1/purchase/history | PurchaseHistorySummary, ListPurchaseHistory |
| GET | /v1/purchase-return/history/summary, /history | PurchaseReturnHistorySummary, ListPurchaseReturnHistory |
| POST | /v1/purchase/upload/image | ParsePurchaseBill (AI bill parsing) |

### Sales return
| Method | Path | Handler |
|---|---|---|
| POST | /v1/sales-return | Create |
| POST | /v1/sales-return/calculate-net-total | CalculateSalesReturnNetTotal |
| PUT, GET, DELETE | /v1/sales-return/{id} | Update, View, Delete |
| GET | /v1/sales-return | List |
| GET | /v1/sales-return/summary | SalesReturnSummary |
| POST | /v1/sales-return/restore/{id} | UndeleteSalesReturn |

### Non-VAT sales and returns
| Method | Path | Handler |
|---|---|---|
| POST | /v1/non-vat-sales/calculate-net-total | Calculate… |
| POST, GET | /v1/non-vat-sales | Create, List |
| GET | /v1/last-non-vat-sale, /v1/previous-non-vat-sale/{id}, /v1/next-non-vat-sale/{id} | Last/Prev/Next |
| GET, PUT, DELETE | /v1/non-vat-sales/{id} | View, Update, Delete |
| GET | /v1/non-vat-sales/history | ListNonVATSalesHistory. Registered after `/{id}`, so it is shadowed. |
| POST | /v1/non-vat-sales-return/calculate-net-total | Calculate… |
| POST, GET | /v1/non-vat-sales-return | Create, List |
| GET | /v1/non-vat-sales-return/history | ListNonVATSalesReturnHistory |
| GET, PUT, DELETE | /v1/non-vat-sales-return/{id} | View, Update, Delete |

### Quotation sales return
| Method | Path | Handler |
|---|---|---|
| GET | /v1/quotation-sales-return/summary | Summary |
| POST, GET | /v1/quotation-sales-return | Create, List |
| POST | /v1/quotation-sales-return/calculate-net-total | Calculate… |
| PUT, GET | /v1/quotation-sales-return/{id} | Update, View |

### Vendor
| Method | Path | Handler |
|---|---|---|
| GET | /v1/vendor/summary | VendorSummary |
| POST, GET | /v1/vendor | Create, List |
| GET, PUT, DELETE | /v1/vendor/{id} | View, Update, Delete |
| GET | /v1/vendor/vat_no/name | ViewVendorByVatNoByName. Registered after `/{id}`, so it is shadowed. |
| POST | /v1/vendor/restore/{id} | RestoreVendor |
| POST | /v1/vendor/upload-image, /delete-image | Upload/DeleteVendorImage |

### Purchase order
| Method | Path | Handler |
|---|---|---|
| GET | /v1/purchase-order/summary | PurchaseOrderSummary |
| POST, GET | /v1/purchase-order | Create, List |
| POST | /v1/purchase-order/calculate-net-total | Calculate… |
| GET, PUT, DELETE | /v1/purchase-order/{id} | View, Update, Delete |
| GET | /v1/previous-purchase-order/{id}, /v1/next-purchase-order/{id} | Prev/Next |

### Purchase request
| Method | Path | Handler |
|---|---|---|
| GET, POST | /v1/purchase-request | List, Create |
| GET, PUT, DELETE | /v1/purchase-request/{id} | View, Update, Delete |
| POST | /v1/purchase-request/{id}/accept, /reject, /create-purchase-order | Accept, Reject, CreatePurchaseOrderFromPR |

### Purchase and purchase return
| Method | Path | Handler |
|---|---|---|
| GET | /v1/purchase/summary | PurchaseSummary |
| POST, GET | /v1/purchase | Create, List |
| POST | /v1/purchase/calculate-net-total | Calculate… |
| GET, PUT, DELETE | /v1/purchase/{id} | View, Update, Delete |
| GET | /v1/purchase-return/summary | PurchaseReturnSummary |
| POST, GET | /v1/purchase-return | Create, List |
| POST | /v1/purchase-return/calculate-net-total | Calculate… |
| GET, PUT, DELETE | /v1/purchase-return/{id} | View, Update, Delete |

### Cash discounts and payments
| Base path | Routes |
|---|---|
| /v1/purchase-cash-discount | POST, GET; GET and PUT on `/{id}` |
| /v1/sales-cash-discount | POST, GET; GET and PUT on `/{id}` |
| /v1/sales-payment | Full CRUD (POST, GET; GET, PUT, DELETE on `/{id}`) |
| /v1/sales-return-payment | Full CRUD |
| /v1/quotation-sales-return-payment | Full CRUD |
| /v1/purchase-payment | Full CRUD |
| /v1/purchase-return-payment | Full CRUD |

### ZATCA, admin and S3
| Method | Path | Handler |
|---|---|---|
| POST | /v1/store/zatca/connect | ConnectStoreToZatca (body `{id, otp}`) |
| POST | /v1/store/zatca/disconnect | DisconnectStoreFromZatca |
| PUT | /v1/store/{id}/zatca/clear-reconnect | ClearZatcaReconnect |
| POST | /v1/order/zatca/report/{id} | ReportOrderToZatca |
| POST | /v1/sales-return/zatca/report/{id} | ReportSalesReturnToZatca |
| POST | /v1/customer-deposit/zatca/report/{id} | ReportCustomerDepositToZatca |
| POST | /v1/customer-withdrawal/zatca/report/{id} | ReportCustomerWithdrawalToZatca |
| GET, PUT | /v1/admin-settings | Get/UpdateAdminSettingsHandler (Admin only) |
| POST | /v1/admin-settings/test-s3 | TestS3ConnectionHandler |
| GET | /v1/admin/server-status | GetServerStatusHandler |
| POST | /v1/admin/server-restart, /v1/admin/repair-frontend | RestartServerHandler, RepairFrontendHandler |
| GET (prefix) | /cdn/… | CdnFileHandler (serves local or S3 files) |
| (prefix) | /zatca/… | Redirects to /cdn/zatca/… |
| POST | /v1/migrate-all-stores-to-s3, /v1/migrate-rfq-attachments-to-s3, /v1/migrate-entity-images-to-s3, /v1/migrate-inline-images-to-s3, /v1/verify-cleanup-disk, /v1/fix-direct-s3-urls | S3 migration handlers |

### Accounting
| Method | Path | Handler |
|---|---|---|
| GET | /v1/ledger | ListLedger |
| GET | /v1/account | ListAccounts |
| GET, DELETE | /v1/account/{id} | ViewAccount, DeleteAccount |
| POST | /v1/account/restore/{id} | RestoreAccount |
| GET | /v1/posting | ListPostings |
| POST | /v1/translate | TranslateHandler (Google Translate) |

### Static file servers
`/images/`, `/pdfs/`, `/attachments/`, `/zatca/` (shadowed by the redirect above) and `/html-templates/` are served from local directories.

### Realtime, PDF sharing and WhatsApp (Evolution API)
| Method | Path | Handler |
|---|---|---|
| GET | /v1/socket | WebSocketHandler (gorilla ws; events `connection_open`, `location_update`, `ping` update user online/devices) |
| POST | /v1/upload-pdf, /v1/share-pdf | SavePdf, SharePdf |
| POST | /v1/whatsapp/send-document | SendWhatsAppDocument |
| POST | /v1/whatsapp/connect | ConnectWhatsApp |
| GET | /v1/whatsapp/qr, /v1/whatsapp/status | GetWhatsAppQR, GetWhatsAppStatus |
| DELETE | /v1/whatsapp/disconnect | DisconnectWhatsApp |
| POST | /v1/whatsapp/check-numbers | CheckWhatsAppNumbers |
| GET, DELETE | /v1/whatsapp/contacts | GetWhatsAppContacts, ClearWhatsAppContacts |
| GET | /v1/whatsapp/contacts-count | GetWhatsAppContactsCount |
| POST | /v1/whatsapp/sync-contacts | SyncWhatsAppContacts |

### AI RFQ bot and procurement
**Bot WhatsApp**
- POST /v1/rfq-bot/connect, GET /qr, GET /status, DELETE /disconnect.
- GET and POST /v1/rfq-bot/webhook (VerifyRFQBotWebhook, HandleRFQBotWebhook).
- POST /check-llm, GET /check-whatsapp, GET /waba-templates, POST /waba-business-account-id, POST /upload-media, POST /waba-test-message.
- GET /events (RFQEventsHandler, SSE), POST /populate-suppliers, GET /test-google-maps.

**Store RFQ WhatsApp**: POST /v1/rfq-store/connect, GET /qr, GET /status, DELETE /disconnect.

**RFQ email**
- POST /v1/rfq-email/connect, GET /status, DELETE /disconnect, GET /oauth-callback, POST /webhook.
- POST /v1/rfq-email/account, GET /v1/rfq-email/accounts.
- DELETE /v1/rfq-email/account/{accountID}, GET /{accountID}/status, PATCH /{accountID}/settings, POST /{accountID}/test-imap.

**Meta webhook**: GET and POST /v1/meta-whatsapp/webhook → HandleMetaWhatsAppWebhook.

**RFQ received**
- GET, POST and DELETE (all) on /v1/rfq-received.
- POST /v1/rfq-received/extract.
- GET, PUT and DELETE on /{id}.
- POST /{id}/process, POST /{id}/send, GET /{id}/send-preview, POST /{id}/send-test.
- POST /{id}/generate-image, POST /{id}/generate-pdf, GET /{id}/download-pdf.
- POST /{id}/supplier-reply.
- GET and POST /{id}/supplier-replies; POST /{id}/supplier-replies/parse-file; DELETE /{id}/supplier-replies/{reply_id}.
- POST /{id}/upload-attachment; PATCH /{id}/update-product-prices.

**RFQ suppliers**
- GET and POST /v1/rfq-suppliers; PUT and DELETE /{id}.
- POST /{id}/refetch-maps, /fetch-from-maps, /deduplicate, /backfill-markets, /backfill-emails.

**Outgoing email**: POST /v1/outgoing-email/test.

**Procurement messages**
- GET and DELETE /v1/procurement-messages.
- DELETE /thread; POST /cleanup, /resolve-senders, /upload-purchase-bill.
- GET /v1/procurement-rfq-history; GET /v1/procurement-messages/disk-usage.
- GET and DELETE /{id}.
- POST /{id}/create-rfq, /extract, /extract-quotation, /extract-purchase-bill, /retry-attachments, /upload-attachment, /link-as-quotation, /link-purchase, /reply, /email-reply.
- POST /v1/procurement-email-send.
- GET /v1/rfq-whatsapp-unread, GET /v1/email-unread.
- GET /v1/procurement-message-threads; GET /{phone}; POST /{phone}/send; POST /{phone}/send-media; POST and DELETE /{phone}/pin.
- POST /v1/procurement-extract-test; POST /v1/email-accounts/sync.

**Misc**: GET /v1/proxy-image; POST /v1/chart-image-share.

### Dashboard (precomputed)
- GET /v1/dashboard/{monthly, products, customers, outstanding, categories, vendors, accounts, stock, employee} → DashboardGet*.
- POST /v1/dashboard/backfill.

### BI bulk endpoints (JWT or `X-BI-Cron-Key` header = env `BI_CRON_API_KEY`)
- GET /v1/bi/{product-sales-history, products, customers, orders, ledger, sales-returns, store-settings}.
- POST, GET and DELETE /v1/bi/report-result; GET /v1/bi/report-result/download.
- POST, GET and DELETE /v1/bi/cron-log.
- POST /v1/bi/batch-cost; GET /v1/bi/batch-costs.
- GET and POST /v1/bi/aws-batch-settings.
- GET and POST /v1/bi/cron-store-settings.
- GET and POST /v1/bi/custom-questions; DELETE /v1/bi/custom-questions/{id}.
- POST /v1/bi/report-scores/{abc-xyz, velocity, clv, cohort, churn}.

### PDF via headless Chrome (chromedp)
The flow is: POST a payload, which is stored in memory under a key; Chrome then opens a React print page that fetches `print-data/{key}`.

| Method | Path |
|---|---|
| POST | /v1/invoice/pdf; GET /v1/invoice/print-data/{key} |
| POST | /v1/receipt/pdf; GET /v1/receipt/print-data/{key} |
| POST | /v1/rfq/pdf; GET /v1/rfq/print-data/{key} |
| POST | /v1/posting/pdf; GET /v1/posting/print-data/{key} |
| POST | /v1/report/pdf; GET /v1/report/print-data/{key} |

Catch-all: if `STATIC_DIR` is set, `PathPrefix("/")` serves the React SPA (desktop build).

---

## 2. Database architecture

- **Connection** (`db/db.go`): `mongodb://[user:pass@]host:port/<db>?authSource=<db>&authMechanism=SCRAM-SHA-1[&replicaSet=]`.
  - Env vars: `MONGO_USER`, `MONGO_PASS`, `MONGO_HOST` (localhost), `MONGO_PORT` (27017), `MONGO_RS`.
  - The main DB name comes from `MONGO_DB` and **defaults to `pos_test`**. Production sets it via env, presumably to `pos`; the value is not in the repo.
- **Per-store DB**: `db.GetDB("store_" + store.ID.Hex())`. It opens a separate mongo client per store DB. Clients are cached in a map and closed after 20 minutes idle (cleanup runs every minute).
- **How the store DB is picked per request**: `ParseStore(r)` reads `search[store_id]` from the query, loads the store doc from main DB `store`, and model methods (`store.FindOrderByID`, etc.) use `store_<id>`. Writes use `order.StoreID`.
- **Main DB (`MONGO_DB`) collections**:
  - `store`, `user`, `customer_package`, `admin_settings`.
  - `rfq_received`, `rfq_suppliers`, `procurement_messages`, `procurement_pinned_contacts`, `google_places_cache`.
  - `bi_aws_batch_settings`, `bi_batch_cost`, `bi_cron_settings`, `bi_custom_question`.
  - `account` (fallback only, when no store_id is given).
- **Per-store DB (`store_<hex>`) collections**:
  - Sales and quotations: `order`, `sales_payment`, `sales_cash_discount`, `salesreturn`, `sales_return_payment`, `quotation`, `quotation_payment`, `quotation_sales_return`, `quotation_sales_return_payment`, `non_vat_sales`, `non_vat_sales_return`, `delivery_note`.
  - Purchasing: `purchase`, `purchase_payment`, `purchase_cash_discount`, `purchasereturn`, `purchase_return_payment`, `purchase_order`, `purchase_request`.
  - Master data: `product`, `product_category`, `product_brand`, `service_category`, `customer`, `vendor`, `vendor_category`, `warehouse`, `stocktransfer`, `arabic_name`, `signature`, `user_role`.
  - Money and accounting: `expense`, `expense_category`, `capital`, `capitalwithdrawal`, `divident`, `customerdeposit`, `customerwithdrawal`, `account`, `ledger`, `posting`.
  - Workshop and staff: `employee`, `employee_salary_payment`, `salary_due`, `vehicle`, `repair_job`.
  - WhatsApp and dashboard: `whatsapp_contacts`, `dashboard_monthly`, `dashboard_dirty_months`.
  - Product history: `product_history`, `product_sales_history`, `product_sales_return_history`, `product_purchase_history`, `product_purchase_return_history`, `product_quotation_history`, `product_quotation_sales_return_history`, `product_delivery_note_history`, `product_stocktransfer_history`, `product_non_vat_sales_history`, `product_non_vat_sales_return_history`.
  - BI: `bi_report_result`, `bi_cron_log`, `bi_monthly_revenue`, `bi_top_products`, `bi_top_customers`, `bi_expense_summary`, `bi_outstanding`, `bi_stock_alerts`, `bi_vendor_performance`, `bi_quotation_conversion`, `customer_churn_risk_tier_history`, `customer_predicted_12month_clv_history`, `customer_cohort_retention_report`, `product_abc_xyz_classification_history`, `product_sales_trend_history`.
  - Legacy, referenced by old migration code: `order_item`, `sales_return_item`.
- **Note:** even inside per-store DBs every document still has a `store_id` field, and queries filter on it.
- **Indexes**: `models/index.go` (`SetIndexes`) creates unique and text indexes per store collection. The startup call is commented out. `EnsureRFQReceivedIndexes`, `EnsureRFQSupplierIndexes` and `EnsureGooglePlacesCacheIndexes` run at startup.
- **Redis** (`REDIS_DSN`, default localhost:6379) holds JWT session keys (`access_uuid → user_id`) and the invoice/document counters.
- **Stores share products**: `store.use_products_from_store_id[]`. Product, customer and vendor docs hold per-store stats maps: `product_stores{storeHex: ProductStore}`, `customer.stores{}`, `vendor.stores{}`.
- **Startup seed**: `main.go` inserts a hard-coded admin user `sirinibin2006@gmail.com` (bcrypt hash, `admin: true`, `role: "Admin"`) into main DB `user` if it is missing.

---

## 3. Models: collections and fields (bson names)

### store (main DB) — `models/store.go`
- **Identity**: `_id`, `name`, `name_in_arabic`, `store_name`, `store_name_in_arabic`, `code`, `branch_name`, `business_category`, `title`, `title_in_arabic`, `registration_number`, `registration_number_arabic`.
- **Contact and address**: `email`, `phone`, `phone_in_arabic`, `address`, `address_in_arabic`, `zipcode`, `zipcode_in_arabic`, `country_name`, `country_code`, `national_address{…}`.
- **Tax and branding**: `vat_no`, `vat_no_in_arabic`, `vat_percent`, `logo`, `invoice_background`.
- **Lifecycle**: `deleted`, `deleted_by`, `deleted_at`, `marked_for_permanent_deletion`, `marked_for_permanent_deletion_at`, `permanent_deletion_after_days`, plus audit fields.
- **Shared products**: `use_products_from_store_id[]`, `use_products_from_store_names[]`.
- **ZATCA**: `zatca{…}` (see section 5).
- **Serial numbers**: each is a `SerialNumber{prefix, start_from_count, padding_count}`:
  - `sales_serial_number`, `sales_return_serial_number`, `purchase_serial_number`, `purchase_return_serial_number`
  - `purchase_order_serial_number`, `purchase_request_serial_number`
  - `quotation_serial_number`, `quotation_sales_return_serial_number`
  - `customer_serial_number`, `vendor_serial_number`, `expense_serial_number`, `delivery_note_serial_number`
  - `customer_deposit_serial_number`, `customer_withdrawal_serial_number`, `capital_deposit_serial_number`, `divident_serial_number`
  - `stock_transfer_serial_number`, `non_vat_sales_serial_number`, `non_vat_sales_return_serial_number`, `rfq_received_serial_number`
- **Bank**: `bank_account{bank_name, customer_no, iban, account_name, account_no}`.
- **Legacy top-level flags**, duplicated under `settings`: `show_address_in_invoice_footer`, `default_quotation_validity_days`, `default_quotation_delivery_days`, `zatca_qr_on_left_bottom`, `show_received_by_footer_in_invoice`, `block_sale_when_purchase_price_is_higher`, `enable_monthly_serial_number`, `quotation_invoice_accounting`, `one_line_product_name_in_invoice`, `show_minus_on_liability_balance_in_balance_sheet`, `hide_total_amount_row_in_balance_sheet`, `show_seller_info_in_invoice`.
- **Package**: `customer_package_id`, `customer_package_name`, `customer_package_tab_ids[]`.

**`settings` (StoreSettings)**, about 200 fields:
- **Invoice and print behaviour**:
  - All the flags above, plus `one_line_product_name_in_print_invoice`, `enable_invoice_print_type_selection`, `allow_adjust_same_date_payments`.
  - Quotation VAT: `hide_quotation_invoice_vat`, `no_tax_for_quotation_invoice`, `hide_vat_in_quotation_sales_invoice`, `exclude_service_vat_in_quotation_sales_invoice`, `update_product_stock_on_quotation_sales`.
  - Auto payment close: `enable_auto_payment_close_on_return`, `enable_auto_sales_payment_close_on_purchase`, `enable_auto_purchase_payment_close_on_sales`, `disable_purchases_on_accounts`.
  - `invoice{phase1, phase2, phase2_b2b: {sales_titles, sales_return_titles, purchase_titles, purchase_return_titles: {paid, credit, cash}}, quotation_sales_titles, quotation_sales_return_titles, non_vat_sales_titles, non_vat_sales_return_titles, quotation_title, delivery_note_title, payable_title, receivabale_title (sic), stock_transfer_title}`.
- **Module toggles and UI**:
  - Modules: `enable_auto_translation_to_arabic`, `enable_warehouse_module`, `enable_custom_sales_invoice_id`, `show_warehouse_stock_in_selected_products`, `enable_purchase_order_module`, `enable_purchase_request_module`, `enable_rbac_module`.
  - Display: `show_currency_symbol`, `add_price_details_in_delivery_note`, `skip_product_selection_while_delivery_note_import`, `block_sales_after_pending_count`, `stats_show_overall_summary`, `stats_show_profit_loss_statement`, `enable_notification`, `enable_sales_page_selection`.
  - Designs: `balance_sheet_design`, `balance_sheet_a4_preview_design`, `invoice_a4_preview_design`, `sales_create_form_design`, `sales_return_create_form_design`, `quotation_create_form_design`, `purchase_create_form_design`, `purchase_return_create_form_design`, `quotation_sales_return_create_form_design`, `invoice_header_design`, `balance_sheet_header_design`.
  - More toggles: `enable_auto_refresh`, `enable_vat_box`, `enable_products`, `enable_services`, `enable_arabic_names_list`, `enable_customer_po_no`.
  - ZATCA-related: `enable_zatca_reporting_for_receivables`, `enable_zatca_reporting_for_payables`, `auto_suggest_advance_payment_linking_in_sales`, `display_vat_in_receivables_and_payables`, `disable_sales_edit_once_reported_to_zatca`.
  - Other modules: `non_vat_sales`, `enable_automobile_module`, `enable_automobile_dashboard`, `enable_common_dashboard`, `enable_sales_in_quotation`, `enable_employee_module`, `enable_purchase_unit_price_validation`, `enable_auto_update_prices_from_last_purchase`.
  - Opening balances: `cash_opening_balance`, `cash_opening_balance_date`, `bank_opening_balance`, `bank_opening_balance_date`.
  - Layout sync: `use_rtl_for_arabic`, `save_print_settings_to_server`, `print_settings{}`, `save_sidebar_config_to_server`, `sidebar_config[]`, `show_created_by_in_invoice_preview`.
- **WhatsApp (Evolution API)**: `evolution_api_url`, `evolution_api_key`, `evolution_instance_name`, `use_whatsapp_api`, `allow_products_duplicates_by_default`.
- **RFQ bot**:
  - Bot WhatsApp: `enable_ai_rfq_bot`, `bot_whatsapp_phone`, `bot_evolution_*`, `bot_waba_phone_number_id`, `bot_waba_access_token`, `bot_waba_business_account_id`.
  - Messaging: `rfq_pdf_title`, `rfq_message_contact_phone`, `waba_template_rfq_supplier`, `waba_template_invoice_share`.
  - LLMs: `rfq_llm_provider/model/api_key`, 19 `extraction_*_api_key` fields (openai, anthropic, gemini, groq, xai, mistral, cerebras, together, openrouter, sambanova, fireworks, nvidia, github, huggingface, cloudflare plus `cloudflare_account_id`, cohere, perplexity, deepinfra), `populate_suppliers_llm_provider/model`, `classify_llm_provider/model`.
  - Behaviour: `disable_auto_rfq_from_email/whatsapp`, `google_maps_api_key`, `rfq_min_suppliers`, `purchase_markets[]`, `rfq_forward_markets[]`, `rfq_intro`, `rfq_allowed_senders[]`, `incoming_email_keywords[]`.
  - Email source: `rfq_email_*` (provider, connected, address), Gmail/Outlook/Zoho OAuth fields, Zoho SMTP, Mailgun, SendGrid, Postmark, SES, IMAP, `rfq_email_accounts[]` (RFQEmailAccount with provider creds, IMAP/SMTP settings, `oauth_callback_url`, `last_polled_at`).
  - Store RFQ WhatsApp: `store_rfq_waba_*`, `store_rfq_evolution_*`.
  - Supplier and quotation: `enable_rfq_supplier_on_purchase`, `enable_rfq_module`, `default_quotation_margin_percent`, `quotation_llm_provider/model`.
  - Procurement inbox: `auto_delete_procurement_messages_days`, `show_procurement_emails_tab`, `show_procurement_whatsapp_tab`, `enable_purchase_bills_tracking`, `purchase_bills_manager_numbers[]`.
- **Outgoing email**:
  - Provider and sender: `outgoing_email_provider` (smtp | sendgrid | mailgun | ses | postmark | brevo | resend), `outgoing_email_from_name/from_address`.
  - SMTP: `outgoing_email_smtp_host/port(FlexInt)/username/password/use_tls`.
  - Other providers: `…sendgrid_api_key`, `…mailgun_api_key/domain`, `…ses_access_key_id/secret_key/region`, `…postmark_server_token`, `…brevo_api_key`, `…resend_api_key`.
  - `email_signatures[]{id, name, content, is_default, is_html}`.

**national_address**: `short_code`, `building_no(_arabic)`, `street_name(_arabic)`, `district_name(_arabic)`, `city_name(_arabic)`, `zipcode(_arabic)`, `additional_no(_arabic)`, `unit_no(_arabic)`.

### user (main DB)
- Fields: `_id`, `name`, `email`, `mob`, `password` (bcrypt), `photo`, `admin` (bool), `store_ids[]`, `store_names[]`, `role` ("Admin" | "Manager" | "SalesMan"), `role_ids[]`, `role_names[]`, `online`, `last_online_at`, `last_offline_at`, `connected_mobiles`, `connected_tabs`, `connected_computers`, `store_id`, `account`, `opening_balance`, `opening_balance_date`, `opening_balance_posted`, `opening_balance_type`, plus soft delete and audit fields.
- `devices{deviceId: Device}`. Device has `device_id`, `fingerprint`, `user_agent`, `platform`, `device_type`, `screen_width/height`, `cpu_cores`, `ram`, `timezone`, `touch`, `connected`, `battery`, `ip_address`, `tabs_open`, `first/last_connected_at`, `last_disconnected_at`, `location{latitude, longitude, city, country, last_updated_at}`.

### user_role (store DB)
`_id`, `name`, `store_id`, `store_name`, `permissions[{resource, read, create, update, delete}]`, plus soft delete and audit fields.

### product (store DB)
- **Identity and search**: `_id`, `name`, `name_in_arabic`, `name_prefixes[]`, `name_in_arabic_prefixes[]`, `additional_keywords[]`, `item_code`, `store_id`, `store_name`, `store_code`, `bar_code`, `ean_12`, `search_label`, `rack`, `prefix_part_number`, `part_number`.
- **Classification**: `category_id[]`, `category_name[]`, `brand_id`, `brand_name`, `brand_code`, `country_name`, `country_code`, `unit`, `images[]`.
- **Flags and sets**: `deleted`, `is_set`, `linked_product_ids[]`, `set{name, products[{produc_id (sic), part_number, name, quantity, unit, purchase_unit_price(_with_vat), retail_unit_price(_with_vat), retail_price_percent, purchase_price_percent}], total, total_with_vat, purchase_total(_with_vat), total_quantity}`, `allow_duplicates`, `note`.
- **Services**: `is_service`, `duration_minutes`, `duration_unit`, `booking_required`, `delivery_mode`, `service_category_id`, `service_category_name`.
- **BI fields**: `sales_velocity_trend(_reason)`, `slop_percent_per_month`, `momentum_percent_per_3month`, `avg_monthly_qty`, `recent_3month_qty`, `revenue`, `class`, `class_reason`, `abc_tier`, `xyz_tier`, `cv`, `active_months`, `stocking_strategy`.
- Plus audit fields.

`product_stores{storeHex: ProductStore}`:
- Prices: `purchase_unit_price(_with_vat)`, `purchase_unit_price_secret`, `wholesale_unit_price(_with_vat)`, `retail_unit_price(_with_vat)`, `wholesale/retail_margin_percent`, `auto_update_wholesale/retail_price_from_last_purchase`, `last_purchase_id/code`, `last_purchase_price_updated_at`, `wholesale/retail_manual_price_updated_at`, `with_vat`.
- Stock: `stock`, `warehouse_stocks{whCode: qty}`, `warehouse_racks{}`, `product_warehouses{wh: ProductWarehouse stats}`, `stocks_added`, `stocks_removed`, `stock_adjustments[{date, type, quantity, reason, warehouse_id, warehouse_code, created_at}]`.
- Profit: `retail/wholesale_unit_profit(_perc)`.
- Counters for sales, sales return, quotation sales and quotation sales return: `*_count`, `*_quantity`, amount, `*_profit`, `*_loss`.
- Counters for purchase and purchase return: `*_count`, `*_quantity`, amount.
- Other counters: `quotation_count/quantity`, `quotation`, `delivery_note_count/quantity`, `stocktransfer_amount/count/quantity`, `non_vat_sales_quantity`, `non_vat_sales_return_quantity`.

### customer (store DB)
- **Identity and contact**: `_id`, `code`, `name`, `name_in_arabic`, `search_words[]`, `search_words_in_arabic[]`, `additional_keywords[]`, `vat_no(_in_arabic)`, `phone(_in_arabic)`, `phone2(_in_arabic)`, `title(_in_arabic)`, `email`, `address(_in_arabic)`, `country_name/code`, `national_address`, `registration_number(_arabic)`, `contact_person`.
- **Credit and accounting**: `credit_limit`, `credit_balance`, `account` (embedded Account), `opening_balance`, `opening_balance_date`, `opening_balance_posted`, `opening_balance_type`.
- **Other**: `deleted`, `search_label`, `store_id`, `remarks`, `sponsor`, `use_remarks_in_sales`, `images[]`.
- **BI fields**: `churn_risk_tier(_reason)`, `churn_percent`, `total_spend`, `days_since_last_buy`, `lifetime_value_segment_for_12months(_reason…)`, `predicted_clv_amount_12months`, `predicted_purchases_count_forecast`, `predicted_avg_order_amount`, `history_orders_count`, `history_spend_amount`, `tenure_days`, `first/last_purchase_at`, `retention_{1,3,6,12,24}month`.
- Plus audit fields.

`stores{storeHex: CustomerStore}` holds count, amount, paid amount, balance, profit, loss, and paid / not-paid / paid-partially counts for each of: sales, sales_return, quotation_sales_return, quotation, quotation_invoice, delivery_note (count only), non_vat_sales and non_vat_sales_return.

### vendor (store DB)
- Fields: `_id`, `code`, `name`, `name_in_arabic`, `search_words(_in_arabic)`, `additional_keywords`, `title(_in_arabic)`, `email`, `phone(_in_arabic)`, `phone2(_in_arabic)`, `address(_in_arabic)`, `vat_no(_in_arabic)`, `vat_percent`, `registration_number(_arabic)`, `national_address`, `country_name/code`, `contact_person`, `credit_limit`, `credit_balance`, `account`, `logo`, `deleted`, `search_label`, `store_id`, `remarks`, `use_remarks_in_purchases`, `images[]`, `sponsor`, `opening_balance*`, `category_id[]`, `category_name[]`, `product_categories[]`, plus audit fields.
- `stores{storeHex: VendorStore}` holds purchase and purchase_return count, amount, paid, balance, paid-status counts, and `purchase_retail/wholesale_profit/loss`.

### order — sales (store DB `order`)
- **Header**: `_id`, `date`, `invoice_count_value` (ZATCA ICV), `code`, `uuid`, `hash`, `prev_hash`, `store_id`, `customer_id`, `delivered_by`, `vat_percent`, `status`.
- **Discounts and totals**: `discount`, `discount_with_vat`, `discount_percent(_with_vat)`, `return_discount(_with_vat)`, `shipping_handling_fees`, `total_quantity`, `vat_price`, `total`, `total_with_vat`, `net_total`, `actual_vat_price`, `actual_total(_with_vat)`, `actual_net_total`, `rounding_amount`, `auto_rounding_amount`, `cash_discount`, `return_cash_discount`.
- **Payments**: `total_payment_received`, `balance_amount`, `payments[]` (embedded SalesPayment), `payments_count`, `payment_status`, `payment_methods[]`.
- **Profit and returns**: `profit`, `net_profit`, `loss`, `net_loss`, `return_count`, `return_amount`.
- **Denormalised names and contact**: `delivered_by_name`, `customer_name`, `customer_name_arabic`, `store_name`, `remarks`, `phone`, `vat_no`, `address`, `customer_po_no`.
- **ZATCA**: `zatca` (ZatcaReporting).
- **Links**: `quotation_id`, `quotation_code`, `quotation_ids[]`, `quotation_codes[]`, `delivery_note_id`, `commission`, `commission_payment_method`, `vehicle_id`, `vehicle_snapshot{vehicle_number, chassis_number, brand, model, variant, year, engine_number, current_km, istimara_no}`, `km_driven`, `repair_job_id`, `repair_job_ids[]`.
- Plus audit fields.
- **products[]** (OrderProduct): `product_id`, `warehouse_id`, `warehouse_code`, `name`, `name_in_arabic`, `item_code`, `prefix_part_number`, `part_number`, `quantity`, `quantity_returned`, `unit_price(_with_vat)`, `purchase_unit_price(_with_vat)`, `unit`, `unit_discount(_with_vat)`, `unit_discount_percent(_with_vat)`, `profit`, `loss`, `is_service`, `service_category_name`.

**zatca (ZatcaReporting)**, shared by orders, sales returns, quotation sales returns, deposits and withdrawals:
- Compliance: `is_simplified`, `compliance_passed`, `compliance_passed_at`, `compliance_invoice_hash`.
- Reporting: `reporting_passed`, `reporting_passed_at`, `reporting_invoice_hash`.
- Signature data: `qr_code`, `ecdsa_signature`, `x509_digital_certificate`, `signing_time`, `signing_certificate_hash`, `x509_digital_certificate_issuer_name`, `x509_digital_certificate_serial_number`, `xades_signed_properties_hash`.
- Failures: `compliance_check_failed_count`, `compliance_check_errors[]`, `compliance_check_last_failed_at`, `reporting_failed_count`, `reporting_errors[]`, `reporting_last_failed_at`.
- `cleared_xml_url`.

### Payment collections
**sales_payment**:
- Fields: `_id`, `date`, `order_id`, `order_code`, `amount`, `method`, `bank_reference`, `description`, `reference_type`, `reference_code`, `reference_id`, `store_id`, `store_name`, `deleted*`, `receivable_id`, `receivable_payment_id`, plus audit fields.
- Payments are also embedded in `order.payments`.

The other payment collections follow the same shape with different links:

| Collection | Link fields |
|---|---|
| sales_return_payment | `sales_return_id/code`, `order_id/code`, `payable_id`, `payable_payment_id` |
| quotation_payment | `quotation_id/code`, receivable ids. Also used embedded in non_vat_sales. |
| quotation_sales_return_payment | `quotation_sales_return_id/code`, `quotation_id/code`, payable ids |
| purchase_payment | `purchase_id/code`, payable ids |
| purchase_return_payment | `purchase_return_id/code`, `purchase_id/code`, receivable ids |

Cash discount collections:
- **sales_cash_discount**: `order_id/code`, `amount`, `method`, `date`, `store_id/name`.
- **purchase_cash_discount**: `purchase_id/code`, `amount`, `store_id/name`.

### salesreturn (store DB)
- Same totals, payment, profit, `commission*` and `zatca` block as order.
- Extra fields: `order_id`, `order_code`, `invoice_count_value`, `code`, `uuid`, `hash`, `prev_hash`, `csid`, `received_by`, `stock_added`, `total_payment_paid`, `deleted*`.
- products[]: SalesReturnProduct (OrderProduct-like, plus `selected`, without `quantity_returned`).

### quotation (store DB)
- Mostly the same totals as order. Extra fields: `delivered_by_signature_id/name`, `signature_date`, `return_count`, `return_amount`, `validity_days`, `delivery_days`, `delivery_from`, `type` (quotation | invoice), `order_id/code`, `order_ids[]/codes[]`, `reported_to_zatca`, `reported_to_zatca_at`, `commission*`, vehicle and repair-job links, `rfq_received_id/code`, `deleted*`.
- `payments[]` are QuotationPayment.

### quotation_sales_return (store DB)
Like salesreturn, but links via `quotation_id/code` and has a `type` field. It also carries `invoice_count_value`, `uuid`, `hash`, `prev_hash`, `csid` and `zatca`.

### non_vat_sales and non_vat_sales_return (store DB)
- Quotation-like docs (products are QuotationProduct and QuotationSalesReturnProduct).
- Extra fields: `exclude_service_tax`, `exclude_product_tax`. The return links via `non_vat_sales_id/code`.

### purchase (store DB)
- **Header**: `_id`, `date`, `code`, `store_id`, `vendor_id`, `vendor_invoice_no`, `order_placed` (OrderPlacedBy), `status`.
- **Totals**: `vat_percent`, `discount(_with_vat)`, `return_discount(_with_vat)`, `discount_percent(_with_vat)`, `discount_profit`, `total_quantity`, `vat_price`, `total(_with_vat)`, `net_total`, `actual_*`, `rounding_amount`, `auto_rounding_amount`, `cash_discount`, `return_cash_discount`, `commission`, `commission_payment_method`, `payment_status`, `shipping_handling_fees`.
- **Expected profit**: `retail_profit`, `wholesale_profit`, `net_retail_profit`, `net_wholesale_profit`, `wholesale_loss`, `retail_loss`.
- **Returns, payments and names**: `return_count`, `return_amount`, `deleted*`, `order_placed_by_name`, `vendor_name`, `vendor_name_arabic`, `store_name`, `total_payment_paid`, `balance_amount`, `payments[]`, `payments_count`, `payment_methods[]`, `remarks`, `phone`, `vat_no`, `address`, `enable_on_accounts`.
- Plus audit fields.
- products[]: `product_id`, `warehouse_id/code`, `name(_in_arabic)`, `item_code`, `prefix_part_number`, `part_number`, `quantity`, `quantity_returned`, `unit`, `purchase_unit_price(_with_vat)`, `retail_unit_price(_with_vat)`, `wholesale_unit_price(_with_vat)`, `unit_discount*`, `retail_profit`, `wholesale_profit`, `wholesale_loss`, `retail_loss`, `is_service`.

### purchasereturn (store DB)
- Fields: `purchase_id/code`, `date`, `code`, `vendor_id`, `vendor_invoice_no`, `purchase_returned_by`, `purchase_returned_signature_id`, `purchase_returned_by_signature_name`, `signature_date`, totals as in purchase, `commission*`, `payment_status`, `deleted*`, `purchase_returned_by_name`, vendor names, `total_payment_paid`, `balance_amount`, `payments[]`, `payments_count`, `payment_methods`, `remarks`, `phone`, `vat_no`, `address`, `enable_on_accounts`.
- products[] price fields are `purchasereturn_unit_price(_with_vat)`.

### purchase_order (store DB)
- Fields: `date`, `expected_date`, `code`, `vendor_id`, `vendor_invoice_no`, `order_placed_by`, `status`, totals, names, `remarks`, `phone`, `vat_no`, `address`, `purchase_id/code`, `purchase_request_id/code`.

### purchase_request (store DB)
- Fields: `date`, `code`, `assigned_to(_name)`, `products[{product_id, name, name_in_arabic, item_code, part_number, prefix_part_number, quantity, unit, purchase_unit_price, unit_discount, is_service}]`, `status`, `notes`, `total_quantity`, `total`, `net_total`, `vat_percent`, `vat_price`, `discount`, `shipping_handling_fees`, `purchase_order_id/code`.

### delivery_note (store DB)
- Fields: `code`, `date`, `customer_id`, `customer_name(_arabic)`, `products[{product_id, rack, name, name_in_arabic, item_code, prefix_part_number, part_number, quantity, unit, unit_price(_with_vat), purchase_unit_price(_with_vat), unit_discount*}]`, `remarks`, totals, `delivered_by(_name)`, `order_id/code`, `notify_at`, `notified`.

### stocktransfer (store DB)
- Fields: `date`, `invoice_count_value`, `code`, `uuid`, `hash`, `prev_hash`, `from_warehouse_id/code`, `to_warehouse_id/code`, `products[]` (StockTransferProduct), totals, `remarks`.

### warehouse (store DB)
- Fields: `name(_in_arabic)`, `code`, `email`, `phone(_in_arabic)`, `address(_in_arabic)`, `zipcode(_in_arabic)`, `country_name/code`, `national_address`, `deleted*`, `store_id`, `stock_transfer_{sent,received}_{count,amount,quantity}`.

### expense (store DB)
- Fields: `code`, `amount`, `description`, `date`, `payment_method`, `store_id/name/code`, `category_id[]`, `category_name[]`, `images[]`, `deleted`, `deleted_by`, `deleted_by_user`, `deleted_at`, `vendor_id`, `vendor_invoice_no`, `taxable`, `vat_percent`, `vat_price`, `vendor_name(_arabic)`.

### expense_category (store DB)
- Fields: `parent_id`, `name`, `parent_name`, `store_id`, plus soft delete fields.

### capital, capitalwithdrawal, divident (store DB)
- **capital**: `code`, `amount`, `description`, `date`, `invested_by_user_id/name`, `payment_method`, `store_id/name/code`, `images[]`, `category_name[]`, `deleted*`.
- **capitalwithdrawal** and **divident**: the same, but with `withdrawn_by_user_id/name` instead of `invested_by_*`.

### customerdeposit — receivables (store DB)
- **Party**: `code`, `description`, `remarks`, `bank_reference_no`, `date`, `customer_id/name/name_arabic`, `type` (customer | vendor | employee), `vendor_id/name/name_arabic`, `employee_id/name`, `payment_method`, `store_id/name/code`, `images`, `category_name`, `deleted*`.
- **Payments**: `payments[ReceivablePayment{_id, date, amount, discount, method, bank_reference, description, invoice_id, invoice_code, invoice_type, store_id/name, audit}]`, `total`, `total_discount`, `net_total`, `payment_methods`.
- **ZATCA**: `invoice_count_value`, `uuid`, `hash`, `prev_hash`, `zatca`.

### customerwithdrawal — payables (store DB)
Same shape, plus `amount`, with `payments[PayablePayment]`.

### account (store DB)
- Fields: `store_id`, `reference_id`, `reference_model` (customer | vendor | employee | investor | withdrawer | expense_category | nil), `type` (asset | revenue | expense | capital | drawing | liability…), `number` (sequential starting at 1000 per store), `name` (UPPERCASE), `name_arabic`, `phone`, `vat_no`, `balance`, `debit_or_credit_balance`, `debit_total`, `credit_total`, `open`, `deleted`.
- System accounts are created on demand: CASH, BANK, SALES, SALES RETURN, PURCHASE, PURCHASE RETURN, CASH DISCOUNT ALLOWED, CASH DISCOUNT RECEIVED, COMMISSION ALLOWED, PURCHASE FUND, OPENING BALANCE EQUITY, SALARY EXPENSE, NON VAT SALES, NON VAT SALES RETURN.

### ledger (store DB)
- Fields: `store_id`, `reference_id`, `reference_model`, `reference_code`.
- `journals[{date, account_id, account_name, account_number, debit_or_credit, debit, credit, group_accounts[], group_id, reference_id, reference_model, reference_code}]`.

### posting (store DB), one per account per ledger
- Fields: `date`, `store_id`, `account_id/name/number`, `reference_id/model/code`, `reference2_id/model/code`, `debit_total`, `credit_total`.
- `posts[{_id, date, account_id, account_name, account_number, debit_or_credit, debit, credit, balance, reference_id/model/code}]`.
- **Accounting flow**: `DoAccounting()` = `UndoAccounting` → `AdjustPayments` → `CreateLedger` → `ledger.CreatePostings` → rebalance (`SetPostBalancesByLedger`). Every document type implements this.

### product_history and per-type history collections (store DB)
- Fields: `date`, `store_id/name`, `product_id`, `reference_type/id/code`, `customer_id/name/name_arabic`, `vendor_id/name/name_arabic`, `from/to_warehouse_id/code`, `stock`, `warehouse_stocks{}`, `quantity`, `purchase_unit_price`, `unit_price`, `unit`, `unit_discount`, `discount`, `discount_percent`, `price`, `net_price`, `profit`, `loss`, `vat_percent`, `vat_price`, `unit_price_with_vat`, `warehouse_id/code`, `reason`, `is_service`.
- `product_sales_history` uses a similar shape with `order_id/code`. The other `product_*_history` collections are analogous.

### Lookup collections (store DB)
| Collection | Fields |
|---|---|
| product_category | `parent_id`, `name`, `parent_name`, `deleted*`, `store_id` |
| service_category | same as product_category |
| product_brand | `code`, `name`, `deleted*`, `store_id` |
| vendor_category | `name`, `deleted*`, `store_id` |
| arabic_name | `name_in_english`, `name_in_arabic`, `deleted*`, `store_id` |
| signature | `name`, `signature` (image), `deleted*`, `store_id` |

### Workshop and staff (store DB)
- **employee**: `code`, `name(_in_arabic)`, `position`, `mob1`, `mob2`, `iqama_no`, `address`, `salary`, `salary_day`, `joining_date`, `opening_balance*`, `is_active`, `account`, `store_id/name`, `deleted`.
- **employee_salary_payment**: `code`, `employee_id/name`, `date`, `amount`, `payment_method`, `month`, `year`, `description`, `deleted`.
- **salary_due**: `employee_id`, `store_id`, `month`, `year`, `amount`.
- **vehicle**: `customer_id/name/name_arabic`, `vehicle_number`, `chassis_number`, `brand`, `model`, `variant`, `year`, `engine_number`, `current_km`, `istimara_no`, `color`, `remarks`, `deleted`.
- **repair_job**: `job_number`, `title`, `date`, `vehicle_id`, `customer_id/name`, `vehicle_number`, `brand`, `model`, `km`, `complaint`, `inspection`, `work_done`, `technician_id/name`, `technician_ids[]/names[]`, `labour_charge`, `vat_percent`, `parts[{product_id, item_code, part_number, name, qty, purchase_unit_price, stock, warehouse_stocks, unit_price(_with_vat), unit_discount(_with_vat), total_price(_with_vat)}]`, `parts_total(_with_vat)`, `total(_with_vat)`, `estimated_delivery`, `status`, `order_id/code/net_total`, `quotation_id/code/net_total/type`, `non_vat_sales_id/code/net_total`, `archived`, `deleted`.

### Other collections
- **whatsapp_contacts** (store DB): `store_id`, `jid`, `name`, `push_name`, `phone`, `last_chat_at`, `evo_updated_at`, `synced_at`.
- **dashboard_monthly** (store DB): `store_id`, `month_str`, plus about 50 aggregates: sales, returns, payment-method splits, qtn_*, purchase, accounted_purchase, commissions, cash discounts, expense, salary_paid, deposit_purchase_fund, non-VAT, VAT splits.
- **dashboard_dirty_months** (store DB): `store_id`, `month_str`, `queued_at`.
- **admin_settings** (main DB): `s3_enabled`, `s3_bucket_name`, `s3_region`, `s3_access_key_id`, `s3_secret_key`, `s3_endpoint`, `s3_public_base_url`.
- **customer_package** (main DB): `store_id`, `code`, `name(_in_arabic)`, `tab_ids[]`, `customer_id/name/name_ar`, `services[]`, `price`, `visits`, `used`, `valid_from`, `valid_days`, `status`, `notes`, `deleted*`.
- **rfq_received** (main DB): `store_id`, `code`, `received_at`, `source`, `from_phone`, `from_name`, `message_type`, `text_content`, `media_urls`, `documents[{url, file_name, mime_type}]`, `categories`, `products[{product_id, part_no, name, name_in_arabic, quantity, unit, notes}]`, `customer_*` (id, name, contact_person, phone, email, company, address, vat_no, cr_no, national_address, city), `status`, `forwarded_to[RFQForwardRecord]`, `matched_supplier_ids`, `supplier_replies[SupplierReply{prices[]…}]`, `activity_logs[]`, `quotation_ids/codes`, `procurement_message_id/code`, attachments, and more.
- **rfq_suppliers** (main DB): `store_id`, `code`, `name`, `phone`, `phone2`, `address`, `latitude`, `longitude`, `categories`, `rating`, `google_place_id`, `google_maps_url`, `purchase_market`, `website`, `email`, `is_active`, `added_at`, `created_by`.
- **procurement_messages** (main DB): `store_id`, `type`, `direction`, `provider`, `from`, `to`, `subject`, `body_text/html`, `wa_message_type`, `waba_phone_number_id`, `attachments[{filename, content_type, size, url}]`, `external_id`, `email_message_id`, `read`, `processed_as_rfq`, `rfq_received_id/code`, `is_supplier_quotation`, `linked_rfq_received_*`, `message_date`, `code`, `purchase_bill_code`, `linked_purchase_id/code`, `sender_name/type`, `created_at`.
- **procurement_pinned_contacts** (main DB): `store_id`, `contact`, `msg_type`, `pinned_at`.

---

## 4. Auth

- **Login flow (OAuth2-style)**:
  1. `POST /v1/authorize {email, password}`. The password is checked with bcrypt. Returns an `auth_code`, a JWT with `type: auth_code`. The comment says 5 minutes but the code uses `time.Hour*5`.
  2. `POST /v1/accesstoken {auth_code}` returns `{access_token, expires_at, refresh_token, refresh_expires_at}`. The access token lasts 365 days and the refresh token 7 days.
  3. `POST /v1/refresh` issues new tokens. MCP login skips the auth-code step.
- **JWT**: HS256 signed with `ACCESS_SECRET` (default "1234"). Claims: `authorized`, `access_uuid`, `user_id`, `email`, `exp`, `type` (access_token | refresh_token | auth_code), `admin`, `role`.
- **Redis session check**: on every request the server checks that Redis key `access_uuid` maps to `user_id`. Logout deletes it.
- **Token lookup order**: query `?access_token=`, then header `access_token`, then `Authorization: Bearer <t>` (or the raw token).
- **Global state**: auth sets package-level globals `models.UserObject` and `TokenClaimsObject`. This is not concurrency-safe.
- **Roles**: string `user.role` with values "Admin", "Manager", "SalesMan", plus `user.admin` bool. Admin bypasses store membership.
  - Manager can manage only Manager and SalesMan users.
  - SalesMan is blocked from editing store settings (`controller/store.go:381`).
  - Admin-only endpoints: admin-settings, S3 tooling, server status and restart.
- **User–store relation**: `user.store_ids[]` (with `store_names[]`). `ListStore` filters by it for non-admins. Store view and update need the store ID in the user's `store_ids` unless the role is Admin.
- **RBAC**:
  - `user.role_ids[]` points to `store_<id>.user_role` docs holding `permissions[{resource, read, create, update, delete}]`.
  - `GetEffectivePermissions` unions the permissions across all of the user's stores and roles.
  - The backend only enforces this for the `user_roles` resource. The frontend uses `/v1/user-role/effective-permissions`, gated by `settings.enable_rbac_module`.
- **Rate limiters**: `AuthRateLimiter` and `RegisterRateLimiter` (`controller/ratelimit.go`).

---

## 5. ZATCA (Saudi e-invoicing)

### Store fields
`store.zatca`:
- `phase` ("1" | "2")
- `env` ("NonProduction" | "Simulation" | "Production")
- `otp`, `private_key`, `csr`
- `compliance_request_id`, `binary_security_token`, `secret` (compliance CSID)
- `compliance_check{simplified_invoice, simplified_credit_note, simplified_debit_note, standard_invoice, standard_credit_note, standard_debit_note}`. **Bug:** the bson tag for SimplifiedDebitNote is malformed (missing closing quote), so it is probably stored under the default key `simplifieddebitnote`.
- `production_request_id`, `production_binary_security_token`, `production_secret` (production CSID)
- `connected`, `last_connected_at`, `connected_by`, `disconnected_by`, `last_disconnected_at`
- `connection_failed_count`, `connection_errors[]`, `connection_last_failed_at`
- `zatca_reconnect_required`: set when ZATCA-sensitive store fields change (name, Arabic name, code, branch, CRN, VAT, business category, national address, and for admins also the sales/return serial settings). Reporting returns 403 until the store reconnects.

Related settings: `settings.enable_zatca_reporting_for_receivables/payables`, `settings.disable_sales_edit_once_reported_to_zatca`, `settings.invoice.phase1/phase2/phase2_b2b` titles, `zatca_qr_on_left_bottom`.

### Onboarding (`controller/zatca.go: ConnectStoreToZatca`)
1. The Go handler builds JSON `{env, otp, crn, serial_number ("1-<prefix>|2-…|N-4bd41220-…"), vat, name, branch_name, country_code, invoice_type "1100", address, business_category, invoice_code}`.
2. It pipes that JSON on stdin to `ZatcaPython/venv/bin/python ZatcaPython/csr_and_onboarding.py`.
3. The Python script:
   1. Generates a CSR and secp256k1 private key (`utilities/csr_generator.py`).
   2. Requests a compliance CSID (`/compliance`).
   3. Sends six sample docs to `/compliance/invoices`: STD and SIM versions of invoice 388, credit note 383 and debit note 381.
   4. Requests a production CSID (`/production/csids`).
   5. Returns JSON on stdout.
4. Go saves the key, CSR, both CSIDs and the compliance_check flags. It sets `connected=true` only when all values are present.

API base is `https://gw-fatoora.zatca.gov.sa/e-invoicing/{developer-portal|simulation|core}` for NonProduction, Simulation and Production respectively.

### Reporting and clearance (`models/sales_zatca.go: ReportToZatca`; similar files for sales_return, customer_deposit, customer_withdrawal; QSR has one too)
Runs when `store.zatca.phase=="2" && connected`:
- **Automatically** on order create/update when `enable_report_to_zatca` is in the body.
- **Manually** via `/v1/{order|sales-return|customer-deposit|customer-withdrawal}/zatca/report/{id}`.
- Calls go through a per-store in-memory FIFO queue named "zatca" (`controller/queue.go`).

**XML/UBL generation is done in Go**:
- Starts from template `zatca/standard_invoice.xml`. Structs are in `models/zatca.go` and `models/ubl.go`.
- `ProfileID reporting:1.0`, currency SAR, Asia/Riyadh issue date and time.
- `InvoiceTypeCode` name `0100000` (standard/B2B) or `0200000` (simplified). B2B means the customer has a valid 15-digit VAT number (`Customer.IsB2B`).
- Type values:
  - sales = 388
  - sales return = 383, with BillingReference and InstructionNote
  - customer deposit (receivable) = 381 debit note
  - customer withdrawal (payable) = 383 credit note
- Additional document references: `ICV` = `invoice_count_value`, and `PIH` = previous hash.
- Supplier party: CRN, national address and VAT. Simplified buyers get `OTH/CASH`.
- Advance-payment deposits that were already reported are added as prepayment lines (DocumentTypeCode 386, PrepaidAmount).
- There is a whole-number amount hack for QR scanning when the payable amount is under 100.
- The XML is written to `ZatcaPython/templates/invoice_<code>.xml`.

**Signing, hashing, QR and submission are done in Python**:
- Go calls `ZatcaPython/reporting_and_clearance.py` with stdin `{env, private_key, production_binary_security_token, production_secret, xml_file_path, is_simplified, store_id}`.
- `utilities/einvoice_signer.py` produces the XAdES signature, invoice hash and QR (`qr_code_generator.py`).
- Simplified docs go to `/invoices/reporting/single`; standard docs go to `/invoices/clearance/single`.
- Output: `{invoice_hash, reporting_passed, cleared_invoice (base64), is_simplified, error, traceback}`.

**Back in Go** (`SaveClearedInvoiceData`):
- Decodes the XML and stores it via `SaveFileToStorage` under `zatca/<storeId>/{sales|sales-returns|receivables|payables}/xml/<code>.xml` (local disk or S3). The URL goes in `zatca.cleared_xml_url`.
- Parses out the signing cert hash, invoice hash (must equal `order.hash`), XAdES hash, ECDSA signature, X509 cert, signing time, issuer and serial, and the QR (AdditionalDocumentReference ID "QR").
- Deletes the temporary XML.

**Hash chain**:
- `prev_hash` = `hash` of the last doc in the **same collection** with `zatca.reporting_passed=true`, sorted by `zatca.reporting_passed_at` desc. If there is none, it is the base64 SHA-256 of "0".
- So chains are kept separately per doc type (order, salesreturn, customerdeposit, customerwithdrawal, quotation_sales_return), not as one per-EGS chain.

**ICV and invoice numbering**: see section 6, Counters.

**Phase 1 QR (TLV)**: not generated in the Go backend; probably in the frontend.

### Other ZATCA files
- `ZatcaPython/`: also has `*_cmd.py` CLI variants, `compliance_check.py`, `resources/` (xsl, `zatca_ubl.xml`, `zatca_signature.xml`), `templates/`, and `certificates/certificateInfo.json`. `README.md` is a copy of the upstream sample.
- `zatca/<storeId>/…`: legacy local XML output directories. `zatca/standard_invoice.xml` is the template.
- `DisconnectStoreFromZatca` clears `connected`.
- Env var `ZATCA_ENV` exists but is commented out; the env is taken from `store.zatca.env`.

---

## 6. Other subsystems

- **Counters and invoice numbering** (`MakeRedisCode` per model, e.g. `models/sales.go:3286`):
  - Redis key `<storeHex>_invoice_counter`. If the key is missing it is seeded with `start_from_count + count(collection) - 1`, then INCR.
  - If the prefix contains `DATE`, a monthly key `<storeHex>_invoice_counter_YYYYMM` is also kept. It is used for the number when `settings.enable_monthly_serial_number` is on.
  - Code format: `fmt.Sprintf("%s-%0*d", prefix, padding, n)`, with `DATE` replaced by YYYYMMDD in the store's country timezone.
  - `invoice_count_value` = global counter (the ZATCA ICV). `UnMakeCode` decrements the counter on failure.
  - Other Redis keys:
    - `_return_invoice_counter`, `_quotation_counter`, `_quotation_return_invoice_counter`
    - `_purchase_invoice_counter`, `_purchase_return_invoice_counter`, `_purchase_order_counter`, `_purchase_request_counter`
    - `_customer_counter`, `_vendor_counter`, `_expense_counter`, `_delivery_note_counter`
    - `_customer_deposit_counter`, `_customer_withdrawal_counter`, `_capital_deposit_counter`, `_capital_withdrawal_counter`, `_divident_counter`
    - `_stocktransfer_counter`, `_non_vat_sales_counter`, `_non_vat_sales_return_counter`, `_warehouse_counter`, `_product_barcode_counter`
    - `_rfq_received_counter`, `_rfq_supplier_counter`, `_pm_em_counter`, `_pm_wa_counter`, `_pm_pb_counter`
  - Most of these also have `_YYYYMM` variants.
  - `GET /v1/store/{id}/serial-locks` exposes the lock state.
- **PDF**:
  - Main path: chromedp headless Chrome renders the React print page at `FRONTEND_URL`/`FRONTEND_PORT` (3004). Covers invoice, receipt, RFQ, posting and report (`controller/invoice_pdf.go`, `receipt_pdf.go`, `rfq_pdf.go`, `posting_pdf.go`, `report_pdf.go`).
  - Legacy: `html-templates/{invoice,quotation,test}.html` plus Bootstrap, used by `models/quotation.go` (`getHTML`).
  - gofpdf is used in `scripts/main.go` and older code. Fonts are in `fonts/` and `scripts/*.ttf` (Amiri, Tajawal, Mirza…). Old PDFs go in `pdfs/quotations`.
  - `/v1/upload-pdf` and `/v1/share-pdf` save PDFs for sharing.
- **Email**:
  - Outgoing (`controller/outgoing_email.go`) is configured per store: SMTP (net/smtp, PlainAuth), SendGrid, Mailgun, SES (manual SigV4), Postmark, Brevo or Resend. There are also Zoho SMTP replies and IMAP-derived SMTP.
  - Incoming: `controller/email_polling.go`, started by `StartEmailPolling()`, polls IMAP, Gmail, Outlook and Zoho for RFQ/procurement mail. Inbound webhooks are also supported.
- **WhatsApp**:
  - Evolution API (self-hosted) per store via `settings.evolution_api_url/key/instance_name`. Covers instance create, connect (QR), status, delete, `message/sendMedia` for document share, and contact sync (hourly cron plus at startup).
  - Meta WhatsApp Cloud API (WABA) for the RFQ bot (`meta_waba.go`, `meta_whatsapp_webhook.go`; env `META_WEBHOOK_VERIFY_TOKEN`).
- **Excel**:
  - Only import utilities in `models/store.go`: `ImportVendorsFromExcel`, `ImportCustomersFromExcel`, `ImportProductCategoriesFromExcel`, `ImportProductsFromExcel`, `UpdateProductStockFromExcel`. They are invoked only from commented-out code in `ProcessStores`/warehouse; data files are in `xl/`.
  - There is no Excel export endpoint. BI report results are stored as CSV and PDF.
- **Reports**:
  - `/summary` endpoints per module.
  - Dashboard monthly pre-aggregation: dirty-month worker `StartDashboardDirtyWorker` and `DrainPersistedDirtyDates`.
  - BI endpoints. Python BI scripts run externally via AWS Batch (env `BI_SCRIPTS_DIR`, `BI_PYTHON`) and post back via the cron-key endpoints.
  - P&L via MCP.
  - Ledger, posting and account balance sheets.
- **Scheduled jobs** (gocron, UTC, `main.go:991`):
  - Every 3h: `cronJobsEveryHour` (effectively empty; all calls are commented out).
  - Every 1 min: `NotifyDeliveryNoteReminders`.
  - Every 1h: `SyncWhatsAppContactsForAllStores`.
  - Every 1h: `ProcessScheduledPermanentDeletions` (stores marked for permanent deletion).
  - Other background tasks: DB idle-connection cleanup every minute, email polling, and the dashboard dirty worker.
  - Optional startup jobs: `BACKFILL_NON_VAT_CUSTOMER_STATS=true`. `BI_RUN_BACKFILL` is commented out.
- **Storage**: `models/storage.go: SaveFileToStorage` writes to local disk (`images/`, `attachments/`, `zatca/`) or S3 when `admin_settings.s3_enabled` (custom SigV4, optional endpoint for R2/MinIO). Files are served at `/cdn/...`.
- **Subscription and billing**:
  - There is no payment billing.
  - The closest concept is **customer_package** (main DB). `tab_ids[]` controls which UI tabs a store can use; it is copied to `store.customer_package_tab_ids` (`propagatePackageTabsToStores`). It also has `price`, `visits`, `used`, `valid_from`, `valid_days` and `status`.
  - Guest self-registration creates a store and a Manager user.
- **Store tooling**: backup to ZIP, four duplicate modes, restore, clear-data, populate-test-data (`automobile_test_data.go`, `store_data.go`), and permanent deletion with a delay in days.
- **Translation**: Google Cloud Translate (`GOOGLE_APPLICATION_CREDENTIALS`, `GOOGLE_CLOUD_PROJECT`).

---

## 7. Tests, deploy, env and ports

- **Tests**: 92 `_test.go` files.
  - `controller/` (58): admin_settings, arabic_name_store, automobile_chart, bi, capital, category, customer_deposit, customer, dashboard, delivery_note, email_polling, employee, expense, guest_register, handler, http2_optimizations, ledger_account, mcp, misc_crud, non_vat_sales, oauth_misc, outgoing_email, payment, pdf_misc, procurement_message, procurement_threads, product_taxonomy, product, purchase_order, purchase_request, purchase_return, purchase, queue, quotation_sales_return, quotation, ratelimit, rfq_bot, rfq_email_account, rfq_send, s3_cleanup, s3_storage_migration, s3_storage, sales_custom_invoice_id, sales_remaining, sales_return, server_status, stock_transfer, store_ops, store_salesman_guard, store, user_changepw, user_role_guard, user, userrole, vehicle, vendor, warehouse, whatsapp_normalize, whatsapp_rfq, zatca.
  - `models/` (34): account, authorize, automobile_dashboard, common, customer_deposit, customer, customer_withdrawal, dashboard_analytics, delivery_note, do_accounting, google_places_cache, integration, product_brand, product_history, purchase_return, purchase, quotation_sales_return, quotation, rfq_procurement, rfq_received, rfq_supplier, sales_return, sales, sales_zatca_date, sales_zatca_lock, stock_transfer, store, user_changepw, user_search, vendor_category, vendor, zatca_unit.
  - Run with `go test ./... -count=1 -skip TestResolveDateKeyword_TimezoneOffset_SA`. CLAUDE.md requires `_Unauthenticated` tests for each new endpoint.
- **Deploy**:
  - `deploy.sh`: gates are a clean git tree, tests passing and silent `go build`. It builds a linux/amd64 `pos-rest` binary plus `pos-health-monitor`, then scps to the EC2 host `ec2-13-42-39-69.eu-west-2.compute.amazonaws.com` (user ubuntu).
  - systemd services: `start-api-test` at `/home/ubuntu/go/src/github.com/sirinibin/pos-rest-test` (deploys only 22:00–05:00 Riyadh time unless `--force`), and `start-api` at `…/pos-rest` (production).
  - `deploy_prod.sh` and `deploy_test.sh` both just exec `deploy.sh`. `deploy_quick.sh` and `deploy_v2.sh` also exist. v2 is a separate product line: service `start-api-v2`, port 2004, `startpos-api-v2.gulfunionozone.com`.
  - `.github/workflows/`: `deploy_prod.yml` (push to master), `deploy_test.yml`, `deploy_quick.yml`, `deploy_v2.yml`. They use the same test and build gates and deploy over SSH.
  - Committed binaries at the repo root: `backend`, `server`, `startpos`, `startpos_server`.
- **Env** (`env/env.go` only has `Getenv` and `GetJWTAccessSecret`; everything else is read from the OS environment):

| Variable | Default / meaning |
|---|---|
| `API_PORT` | 2000 (HTTP). HTTPS is served on API_PORT+1 = 2001 with the committed `localhost.cert.pem`/`localhost.key.pem`. |
| `ACCESS_SECRET` | "1234" |
| `MONGO_DB` | pos_test |
| `MONGO_HOST`, `MONGO_PORT`, `MONGO_USER`, `MONGO_PASS`, `MONGO_RS` | Mongo connection (see section 2) |
| `MONGODB_URI` | mongodb://localhost:27017/, used in some tooling |
| `REDIS_DSN` | localhost:6379 |
| `STATIC_DIR` | Enables the SPA catch-all |
| `FRONTEND_URL`, `FRONTEND_PORT` | Frontend port defaults to 3004 |
| `PUBLIC_SERVER_URL`, `REACT_APP_API_URL` | Public URLs |
| `BI_CRON_API_KEY`, `BI_PYTHON`, `BI_SCRIPTS_DIR`, `BI_RUN_BACKFILL` | BI scripts and cron |
| `BACKFILL_NON_VAT_CUSTOMER_STATS` | Startup backfill flag |
| `GOOGLE_APPLICATION_CREDENTIALS`, `GOOGLE_CLOUD_PROJECT` | Translate |
| `META_WEBHOOK_VERIFY_TOKEN` | Meta webhook |
| `ZATCA_ENV` | Unused |
| `HEALTH_MONITOR_PORT` | 2998 |

- **Ports**: API 2000, TLS 2001, v2 2004, health-monitor 2998, frontend 3004. CORS allows all origins and methods.

---

## Points to watch in a rebuild
1. The stored field names include misspellings and must stay as they are: `divident`, `produc_id`, `receivabale_title`, `purchasereturn_unit_price`, `vinvoice_at_price`, the malformed `simplified_debit_note` bson tag, and the mixed collection names `salesreturn`, `purchasereturn`, `customerdeposit`, `customerwithdrawal`, `capitalwithdrawal`, `stocktransfer`.
2. Several handlers are shadowed by route ordering: `/v1/stock-transfer/history`, `/v1/non-vat-sales/history` and `/v1/vendor/vat_no/name` are registered after `/{id}` routes. The `/zatca/` redirect also shadows the later static `/zatca/` file server.
3. ZATCA hash chains and ICV counters are kept per collection. ICV comes from Redis counters, not from the database.
4. Auth stores the current user in process-wide globals (`UserObject`, `TokenClaimsObject`). Concurrent requests can overwrite each other's user.
5. Security exposures in the repo: the default JWT secret is "1234", a default admin user is seeded with a hard-coded bcrypt hash and email, and TLS key/cert files are committed.
