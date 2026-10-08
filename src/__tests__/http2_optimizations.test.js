/**
 * Source-level tests for HTTP/2 parallelization changes.
 * Each test reads the changed source file and verifies the Promise.all pattern
 * (or semaphore-bounded variant) replaced the old sequential for-await loop.
 */

const fs   = require('fs');
const path = require('path');

const read = rel => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

const topbar         = read('Topbar.js');
const rfqIndex       = read('rfq_received/index.js');
const rfqCreate      = read('rfq_received/create.js');
const quotCreate     = read('quotation/create.js');
const whatsapp       = read('utils/WhatsAppAPIModal.js');
const purchaseBills  = read('store/PurchaseBillsTab.js');
const storeCreate    = read('store/create.js');

// ── Topbar.js — 3 PR notification fetches in parallel ────────────────────────

describe('Topbar.js — parallel PR notification fetches', () => {
    test('uses Promise.all for the three PR fetches', () => {
        expect(topbar).toMatch(/Promise\.all\(\[[\s\S]{0,500}search\[assigned_to\][\s\S]{0,500}search\[created_by\][\s\S]{0,500}search\[created_by\]/);
    });

    test('fetches pending (assigned), accepted (created) and rejected (created) in a single Promise.all', () => {
        expect(topbar).toMatch(/status]=pending/);
        expect(topbar).toMatch(/status]=accepted/);
        expect(topbar).toMatch(/status]=rejected/);
        // All three must be inside the same Promise.all block
        const allIdx = topbar.indexOf('Promise.all([');
        expect(allIdx).toBeGreaterThan(-1);
        const allBlock = topbar.slice(allIdx, allIdx + 800);
        expect(allBlock).toMatch(/status]=pending/);
        expect(allBlock).toMatch(/status]=accepted/);
        expect(allBlock).toMatch(/status]=rejected/);
    });

    test('sequential for-await pattern removed', () => {
        // Old pattern: const r1 = await fetch(...); const d1 = await r1.json(); followed by r2, r3
        expect(topbar).not.toMatch(/const r1 = await fetch.*\n.*const d1 = await r1\.json/s);
    });
});

// ── rfq_received/index.js — margin fetch loop ────────────────────────────────

describe('rfq_received/index.js — parallel margin fetches', () => {
    test('margin loop uses Promise.all with products.map', () => {
        expect(rfqIndex).toMatch(/Promise\.all\(products\.map\(async \(prod, i\)/);
    });

    test('margin loop no longer has for (let i = 0; i < products.length; i++)', () => {
        // Verify the old sequential pattern is gone from the margin fetch section
        // The old pattern used `for (let i = 0; i < products.length; i++)` for margin fetches
        const marginSection = rfqIndex.slice(rfqIndex.indexOf('retail_margin_percent'), rfqIndex.indexOf('retail_margin_percent') + 600);
        expect(marginSection).not.toMatch(/for \(let i = 0; i < products\.length; i\+\+\)/);
    });
});

// ── rfq_received/index.js — multi-file parse loop ────────────────────────────

describe('rfq_received/index.js — parallel multi-file parse', () => {
    test('multi-file parse uses Promise.all with addFiles.map', () => {
        expect(rfqIndex).toMatch(/Promise\.all\(addFiles\.map\(async file/);
    });

    test('results are iterated with for (const data of fileResults)', () => {
        expect(rfqIndex).toMatch(/for \(const data of fileResults\)/);
    });

    test('sequential for (const file of addFiles) pattern removed', () => {
        expect(rfqIndex).not.toMatch(/for \(const file of addFiles\)/);
    });
});

// ── quotation/create.js — prefill product fetch loop ─────────────────────────

describe('quotation/create.js — parallel prefill product fetches', () => {
    test('uses Promise.all with prefill.items.map', () => {
        expect(quotCreate).toMatch(/Promise\.all\(prefill\.items\.map\(async \(_item, _i\)/);
    });

    test('.then(() => setSelectedProducts) applied after all fetches', () => {
        expect(quotCreate).toMatch(/\.then\(\(\) => setSelectedProducts\(\[\.\.\.selectedProducts\]\)\)/);
    });

    test('old for (let _i = 0; _i < prefill.items.length; _i++) loop removed', () => {
        expect(quotCreate).not.toMatch(/for \(let _i = 0; _i < prefill\.items\.length; _i\+\+\)/);
    });
});

// ── WhatsAppAPIModal.js — QR poller parallel fetch ───────────────────────────

describe('WhatsAppAPIModal.js — QR poller parallel fetch', () => {
    test('uses Promise.all([status, qr]) in connect poller', () => {
        expect(whatsapp).toMatch(/Promise\.all\(\[[\s\S]{0,200}whatsapp\/status[\s\S]{0,200}whatsapp\/qr/);
    });

    test('sequential status then QR pattern removed', () => {
        // Old: const statusData = await fetch(.../status...) then const qrData = await fetch(.../qr...)
        expect(whatsapp).not.toMatch(/const statusData = await fetch[\s\S]{0,400}const qrData = await fetch/);
    });
});

// ── WhatsAppAPIModal.js — sendToCustomer parallel ────────────────────────────

describe('WhatsAppAPIModal.js — sendToCustomer parallel', () => {
    test('sendToCustomer uses Promise.all(valid.map(async num =>', () => {
        expect(whatsapp).toMatch(/Promise\.all\(valid\.map\(async num/);
    });

    test('sendToCustomer returns result objects (not push)', () => {
        // Old: results.push(...); New: return { phone, success, error }
        const sendSection = whatsapp.slice(whatsapp.indexOf('sendToCustomer'), whatsapp.indexOf('sendToContacts'));
        expect(sendSection).toMatch(/return \{ phone:/);
        expect(sendSection).not.toMatch(/results\.push\(\{[\s\S]{0,50}phone:/);
    });
});

// ── WhatsAppAPIModal.js — sendToContacts parallel ────────────────────────────

describe('WhatsAppAPIModal.js — sendToContacts parallel', () => {
    test('sendToContacts uses Promise.all(targets.map(async contact =>', () => {
        expect(whatsapp).toMatch(/Promise\.all\(targets\.map\(async contact/);
    });

    test('sendToContacts returns result objects (not push)', () => {
        const sendSection = whatsapp.slice(whatsapp.indexOf('sendToContacts'));
        expect(sendSection).toMatch(/return \{ name:/);
    });
});

// ── rfq_received/create.js — syncProductListToDB semaphore ───────────────────

describe('rfq_received/create.js — syncProductListToDB with bounded concurrency', () => {
    test('uses Promise.all(productList.map(async (ep) =>', () => {
        expect(rfqCreate).toMatch(/Promise\.all\(productList\.map\(async \(ep\)/);
    });

    test('semaphore acquire/release pattern limits to 5 concurrent', () => {
        expect(rfqCreate).toMatch(/active < 5/);
        expect(rfqCreate).toMatch(/const acquire/);
        expect(rfqCreate).toMatch(/const release/);
    });

    test('cache stores promises (not raw results) to prevent duplicate concurrent lookups', () => {
        expect(rfqCreate).toMatch(/partNoPromiseCache/);
        expect(rfqCreate).toMatch(/partNoPromiseCache\.set\(partNoKey,.*async \(\)/s);
    });

    test('finally block releases semaphore', () => {
        expect(rfqCreate).toMatch(/finally[\s\S]{0,30}release\(\)/);
    });

    test('sequential for (const ep of productList) loop removed', () => {
        expect(rfqCreate).not.toMatch(/for \(const ep of productList\)/);
    });
});

// ── store/PurchaseBillsTab.js — file upload (3 concurrent) ───────────────────

describe('store/PurchaseBillsTab.js — batched file upload', () => {
    test('handleUpload uses Promise.all(files.map(async file =>', () => {
        expect(purchaseBills).toMatch(/Promise\.all\(files\.map\(async file/);
    });

    test('semaphore limits to 3 concurrent uploads', () => {
        expect(purchaseBills).toMatch(/active < 3/);
    });

    test('sequential for (let i = 0; i < files.length; i++) removed from handleUpload', () => {
        // The old pattern used indexed for-loop for file uploads
        expect(purchaseBills).not.toMatch(/for \(let i = 0; i < files\.length; i\+\+\)/);
    });
});

// ── store/PurchaseBillsTab.js — product resolution (5 concurrent) ────────────

describe('store/PurchaseBillsTab.js — parallel product resolution', () => {
    test('product resolution uses Promise.all(products.map(async ep =>', () => {
        expect(purchaseBills).toMatch(/Promise\.all\(products\.map\(async ep/);
    });

    test('semaphore limits to 5 concurrent resolutions', () => {
        expect(purchaseBills).toMatch(/pActive < 5/);
    });

    test('resolved results spread into resolvedProducts', () => {
        expect(purchaseBills).toMatch(/resolvedProducts\.push\(\.\.\.resolved\.filter\(Boolean\)\)/);
    });

    test('sequential for (const ep of products) loop removed', () => {
        const resolveSection = purchaseBills.slice(purchaseBills.indexOf('pActive'));
        expect(resolveSection).not.toMatch(/for \(const ep of products\)/);
    });
});

// ── store/create.js — store + serial-locks parallel ──────────────────────────

describe('store/create.js — parallel store + serial-locks fetch', () => {
    test('uses Promise.all([store, locks]) to fetch both in parallel', () => {
        expect(storeCreate).toMatch(/Promise\.all\(\[[\s\S]{0,200}\/v1\/store\/\$\{id\}[\s\S]{0,200}serial-locks/);
    });

    test('store fetch and locks fetch destructured together', () => {
        expect(storeCreate).toMatch(/const \[response, locksRes\] = await Promise\.all/);
    });

    test('sequential locks fetch inside try block removed', () => {
        // Old: const locksRes = await fetch(`/v1/store/${id}/serial-locks`
        expect(storeCreate).not.toMatch(/locksRes = await fetch\(`\/v1\/store\/\$\{id\}\/serial-locks/);
    });
});
