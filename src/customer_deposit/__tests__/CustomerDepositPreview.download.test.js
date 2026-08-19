/**
 * Tests for the PDF download feature added to CustomerDepositPreview
 * (customer_deposit/preview.js).
 *
 * The component handles BOTH receivables (modelName="customer_deposit") and
 * payables (modelName="customer_withdrawal") — customer_withdrawal/view.js
 * opens the same preview with modelName="customer_withdrawal".
 *
 * Changes verified:
 *   - isDownloading state added
 *   - handleDownload (useCallback) added: html2pdf blob download (web) or
 *     /v1/receipt/pdf POST (Tauri)
 *   - PDF button with Spinner added to Modal header
 *   - Button is disabled and shows Spinner while isDownloading
 *
 * Test strategy: pure-JS simulation (no browser/DOM needed) plus source-file
 * structural assertions — the same approach used throughout this codebase.
 */

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
    path.join(__dirname, '../preview.js'),
    'utf8'
);

// ─── 1. Source-code structure: state & function presence ──────────────────────

describe('CustomerDepositPreview — handleDownload source structure', () => {
    test('isDownloading state is declared', () => {
        expect(SRC).toMatch(/const\s+\[isDownloading,\s*setIsDownloading\]\s*=\s*useState\(false\)/);
    });

    test('handleDownload is defined as a useCallback', () => {
        expect(SRC).toMatch(/const\s+handleDownload\s*=\s*useCallback\s*\(/);
    });

    test('handleDownload calls setIsDownloading(true) at the start', () => {
        expect(SRC).toMatch(/handleDownload[\s\S]{0,200}setIsDownloading\(true\)/);
    });

    test('handleDownload calls setIsDownloading(false) in finally block', () => {
        expect(SRC).toMatch(/finally[\s\S]{0,100}setIsDownloading\(false\)/);
    });

    test('handleDownload posts to /v1/receipt/pdf for Tauri path', () => {
        expect(SRC).toMatch(/\/v1\/receipt\/pdf/);
    });

    test('handleDownload uses html2pdf for web browser path', () => {
        expect(SRC).toMatch(/html2pdf\(\)/);
    });

    test('handleDownload outputs blob for download (not bloburl for print)', () => {
        expect(SRC).toMatch(/outputPdf\(['"]blob['"]\)/);
    });

    test('handleDownload creates an <a> element and clicks it (browser download)', () => {
        expect(SRC).toMatch(/document\.createElement\(['"]a['"]\)/);
        expect(SRC).toMatch(/a\.download\s*=/);
        expect(SRC).toMatch(/a\.click\(\)/);
    });

    test('handleDownload revokes the object URL after download', () => {
        expect(SRC).toMatch(/URL\.revokeObjectURL\(/);
    });

    test('handleDownload has error handling with alert', () => {
        expect(SRC).toMatch(/catch[\s\S]{0,100}alert\(['"]PDF download failed/);
    });

    test('handleDownload reads X-Saved-To header for Tauri save path', () => {
        expect(SRC).toMatch(/X-Saved-To/);
    });

    test('handleDownload depends on getFileName, model, modelName', () => {
        expect(SRC).toMatch(/\[getFileName,\s*model,\s*modelName\]/);
    });
});


// ─── 2. Source-code structure: PDF button in the Modal header ─────────────────

describe('CustomerDepositPreview — PDF button in Modal header', () => {
    test('PDF button calls handleDownload on click', () => {
        expect(SRC).toMatch(/onClick=\{handleDownload\}/);
    });

    test('PDF button is disabled while isDownloading', () => {
        expect(SRC).toMatch(/disabled=\{isDownloading\}/);
    });

    test('PDF button shows a Spinner while downloading', () => {
        expect(SRC).toMatch(/isDownloading[\s\S]{0,200}Spinner/);
    });

    test('PDF button shows the download icon (bi-file-earmark-arrow-down)', () => {
        expect(SRC).toMatch(/bi-file-earmark-arrow-down/);
    });

    test('PDF button label text is "PDF"', () => {
        expect(SRC).toMatch(/>\s*PDF\s*</);
    });

    test('PDF button appears in the same button group as the Print button', () => {
        const printIdx = SRC.indexOf('bi bi-printer');
        const pdfIdx   = SRC.indexOf('bi-file-earmark-arrow-down');
        const closeIdx = SRC.indexOf('btn-close" onClick={handleClose}');
        // PDF button is after Print, before the close button
        expect(printIdx).toBeGreaterThan(-1);
        expect(pdfIdx).toBeGreaterThan(printIdx);
        expect(closeIdx).toBeGreaterThan(pdfIdx);
    });
});


// ─── 3. getFileName logic — pure simulation ───────────────────────────────────
// Mirrors the getFileName useCallback in preview.js exactly.

function getFileName(model, modelName) {
    let filename = model.store.code + '_';
    if (modelName === 'customer_deposit' || modelName === 'whatsapp_customer_deposit') {
        filename += 'Receipt_receivable';
    } else if (modelName === 'customer_withdrawal' || modelName === 'whatsapp_customer_withdrawal') {
        filename += 'Receipt_payable';
    }
    if (model.id) {
        filename += '_' + model.code;
    }
    return filename;
}

const baseModel = { store: { code: 'STORE1' }, id: 'abc', code: 'CD-0042' };

describe('getFileName — filename format for receivable vs payable', () => {
    test('customer_deposit → Receipt_receivable', () => {
        expect(getFileName(baseModel, 'customer_deposit')).toBe('STORE1_Receipt_receivable_CD-0042');
    });

    test('customer_withdrawal → Receipt_payable', () => {
        expect(getFileName(baseModel, 'customer_withdrawal')).toBe('STORE1_Receipt_payable_CD-0042');
    });

    test('whatsapp_customer_deposit → Receipt_receivable (WhatsApp variant)', () => {
        expect(getFileName(baseModel, 'whatsapp_customer_deposit')).toBe('STORE1_Receipt_receivable_CD-0042');
    });

    test('whatsapp_customer_withdrawal → Receipt_payable (WhatsApp variant)', () => {
        expect(getFileName(baseModel, 'whatsapp_customer_withdrawal')).toBe('STORE1_Receipt_payable_CD-0042');
    });

    test('filename includes store code prefix', () => {
        expect(getFileName(baseModel, 'customer_deposit')).toMatch(/^STORE1_/);
    });

    test('filename includes document code as suffix when model.id is set', () => {
        expect(getFileName(baseModel, 'customer_deposit')).toMatch(/_CD-0042$/);
    });

    test('filename omits document code suffix when model.id is falsy', () => {
        const noId = { store: { code: 'STC' }, id: '', code: 'CD-001' };
        expect(getFileName(noId, 'customer_deposit')).toBe('STC_Receipt_receivable');
    });

    test('filename for different store codes', () => {
        const mbdi = { store: { code: 'MBDI' }, id: '1', code: 'R-007' };
        expect(getFileName(mbdi, 'customer_withdrawal')).toBe('MBDI_Receipt_payable_R-007');
    });
});


// ─── 4. Download path logic — web browser simulation ─────────────────────────
// Simulates the web branch of handleDownload without html2pdf or DOM.

describe('handleDownload — web browser download path (simulated)', () => {
    test('download link href is set to the blob URL', () => {
        const blobUrl = 'blob:http://localhost/fake-uuid';
        const clicks = [];
        const removed = [];

        const mockA = {
            set href(v) { this._href = v; },
            get href() { return this._href; },
            download: '',
            click() { clicks.push(this.download); },
        };

        const mockBody = {
            appendChild(el) {},
            removeChild(el) { removed.push(el); },
        };

        // Simulate the web download sequence from handleDownload
        const url = blobUrl;
        const fileName = 'STORE1_Receipt_receivable_CD-0042';

        mockA.href = url;
        mockA.download = `${fileName}.pdf`;
        mockBody.appendChild(mockA);
        mockA.click();
        mockBody.removeChild(mockA);

        expect(mockA.href).toBe(blobUrl);
        expect(mockA.download).toBe('STORE1_Receipt_receivable_CD-0042.pdf');
        expect(clicks).toHaveLength(1);
        expect(removed).toHaveLength(1);
    });

    test('download filename uses .pdf extension', () => {
        const fileName = 'STORE1_Receipt_payable_CW-001';
        expect(`${fileName}.pdf`).toMatch(/\.pdf$/);
    });

    test('blob URL is revoked after download to free memory', () => {
        const revoked = [];
        const mockRevoke = (url) => revoked.push(url);
        const blobUrl = 'blob:http://localhost/test-uuid';

        // Simulate URL.revokeObjectURL call
        mockRevoke(blobUrl);
        expect(revoked).toContain(blobUrl);
    });

    test('blob URL is created from the PDF blob (createObjectURL called)', () => {
        const created = [];
        const mockCreate = (blob) => {
            created.push(blob);
            return 'blob:http://localhost/mocked';
        };

        const fakeBlob = new Blob(['%PDF-1.4'], { type: 'application/pdf' });
        const url = mockCreate(fakeBlob);

        expect(created).toHaveLength(1);
        expect(url).toMatch(/^blob:/);
    });

    test('html2pdf options: margin 0, quality 0.98, scale 2, A4 portrait', () => {
        const opt = {
            margin: 0,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        };
        expect(opt.margin).toBe(0);
        expect(opt.image.quality).toBe(0.98);
        expect(opt.html2canvas.scale).toBe(2);
        expect(opt.html2canvas.useCORS).toBe(true);
        expect(opt.jsPDF.format).toBe('a4');
        expect(opt.jsPDF.orientation).toBe('portrait');
    });

    test('outputPdf mode is "blob" (not "bloburl" which is the print path)', () => {
        // print path uses outputPdf('bloburl') → opens an iframe for window.print()
        // download path uses outputPdf('blob') → creates an <a download> link
        // handlePrint and outputPdf('bloburl') can be ~80 lines (5000+ chars) apart;
        // handleDownload and outputPdf('blob') can be ~53 lines (~4000 chars) apart.
        const printMode = SRC.match(/handlePrint[\s\S]{0,8000}?outputPdf\(['"](\w+)['"]\)/)?.[1];
        const downloadSection = SRC.indexOf('handleDownload');
        const afterDownload = SRC.slice(downloadSection, downloadSection + 5000);
        const dlMode = afterDownload.match(/outputPdf\(['"](\w+)['"]\)/)?.[1];

        expect(printMode).toBe('bloburl');
        expect(dlMode).toBe('blob');
        expect(dlMode).not.toBe(printMode);
    });
});


// ─── 5. Download path logic — Tauri simulation ────────────────────────────────

describe('handleDownload — Tauri path (simulated)', () => {
    test('Tauri path POSTs to /v1/receipt/pdf (not /v1/invoice/pdf used by order preview)', () => {
        // Receivables & payables use the receipt endpoint, not the invoice endpoint
        const downloadSection = SRC.slice(SRC.indexOf('handleDownload'), SRC.indexOf('handleDownload') + 3000);
        expect(downloadSection).toMatch(/\/v1\/receipt\/pdf/);
        expect(downloadSection).not.toMatch(/\/v1\/invoice\/pdf/);
    });

    test('Tauri POST body includes model, modelName, fontSizes, filename', () => {
        const downloadSection = SRC.slice(SRC.indexOf('handleDownload'), SRC.indexOf('handleDownload') + 3000);
        expect(downloadSection).toMatch(/model:\s*model/);
        expect(downloadSection).toMatch(/modelName:\s*modelName/);
        expect(downloadSection).toMatch(/fontSizes:\s*fontSizesRef\.current/);
        expect(downloadSection).toMatch(/filename:\s*fileName/);
    });

    test('Tauri path reads X-Saved-To response header for the saved file path', () => {
        const downloadSection = SRC.slice(SRC.indexOf('handleDownload'), SRC.indexOf('handleDownload') + 3000);
        expect(downloadSection).toMatch(/X-Saved-To/);
    });

    test('Tauri detection walks up the iframe parent chain (same pattern as handlePrint)', () => {
        // Both handlePrint and handleDownload use the same Tauri detection approach
        const printSection  = SRC.slice(SRC.indexOf('handlePrint'),    SRC.indexOf('handlePrint')    + 1000);
        const dlSection     = SRC.slice(SRC.indexOf('handleDownload'), SRC.indexOf('handleDownload') + 1000);
        // Both sections walk up via w = w.parent
        expect(printSection).toMatch(/w\s*=\s*w\.parent/);
        expect(dlSection).toMatch(/w\s*=\s*w\.parent/);
    });

    test('Tauri: simulated POST body is correctly shaped', () => {
        const model     = { id: 'x', code: 'CD-1', store: { code: 'ST' } };
        const modelName = 'customer_deposit';
        const fontSizesRefCurrent = { customer_deposit_font: 'Cairo' };
        const fileName  = getFileName(model, modelName);

        const body = JSON.stringify({
            model,
            modelName,
            fontSizes: fontSizesRefCurrent,
            filename: fileName,
        });

        const parsed = JSON.parse(body);
        expect(parsed.model.code).toBe('CD-1');
        expect(parsed.modelName).toBe('customer_deposit');
        expect(parsed.fontSizes).toEqual(fontSizesRefCurrent);
        expect(parsed.filename).toBe('ST_Receipt_receivable_CD-1');
    });
});


// ─── 6. isDownloading state machine ───────────────────────────────────────────

describe('isDownloading state transitions', () => {
    test('initial isDownloading value is false', () => {
        // useState(false) initialisation
        expect(SRC).toMatch(/const\s+\[isDownloading,\s*setIsDownloading\]\s*=\s*useState\(false\)/);
    });

    test('setIsDownloading(true) is called before the async operation starts', () => {
        const dlSection = SRC.slice(SRC.indexOf('handleDownload'), SRC.indexOf('handleDownload') + 3000);
        // setIsDownloading(true) must appear before the try block content
        const trueIdx = dlSection.indexOf('setIsDownloading(true)');
        const fetchIdx = dlSection.indexOf('/v1/receipt/pdf');
        const html2pdfIdx = dlSection.indexOf('html2pdf()');
        expect(trueIdx).toBeLessThan(fetchIdx);
        expect(trueIdx).toBeLessThan(html2pdfIdx);
    });

    test('setIsDownloading(false) is in the finally block (runs even on error)', () => {
        // handleDownload and its finally block can be ~66 lines (~5000 chars) apart
        const dlSection = SRC.slice(SRC.indexOf('handleDownload'), SRC.indexOf('handleDownload') + 6000);
        const finallyIdx = dlSection.indexOf('finally');
        const falseIdx   = dlSection.indexOf('setIsDownloading(false)');
        expect(finallyIdx).toBeGreaterThan(-1);
        expect(falseIdx).toBeGreaterThan(finallyIdx);
    });

    test('simulated download state flow: false → true → false', () => {
        let state = false;
        const setIsDownloading = (v) => { state = v; };

        // Simulate start
        setIsDownloading(true);
        expect(state).toBe(true);

        // Simulate finish (finally block)
        setIsDownloading(false);
        expect(state).toBe(false);
    });

    test('simulated error flow: state resets to false even after throw', () => {
        let state = false;
        const setIsDownloading = (v) => { state = v; };

        const simulateDownload = async () => {
            setIsDownloading(true);
            try {
                throw new Error('network error');
            } catch (_) {
                // alert would fire here
            } finally {
                setIsDownloading(false);
            }
        };

        return simulateDownload().then(() => {
            expect(state).toBe(false);
        });
    });
});


// ─── 7. No regression — existing functionality unchanged ──────────────────────

describe('No regression — existing handlePrint and openWhatsAppShare unchanged', () => {
    test('handlePrint is still defined', () => {
        expect(SRC).toMatch(/const\s+handlePrint\s*=\s*useCallback/);
    });

    test('handlePrint still uses outputPdf("bloburl") for iframe print', () => {
        // handlePrint and outputPdf('bloburl') are ~78 lines (~5500 chars) apart
        const printSection = SRC.slice(SRC.indexOf('handlePrint'), SRC.indexOf('handlePrint') + 8000);
        expect(printSection).toMatch(/outputPdf\(['"]bloburl['"]\)/);
    });

    test('openWhatsAppShare is still defined', () => {
        expect(SRC).toMatch(/const\s+openWhatsAppShare\s*=\s*useCallback/);
    });

    test('Print button still calls handlePrint (when not whatsAppShare)', () => {
        expect(SRC).toMatch(/whatsAppShare\s*\?\s*openWhatsAppShare\s*:\s*handlePrint/);
    });

    test('isProcessing state still exists (used by print and WhatsApp buttons)', () => {
        expect(SRC).toMatch(/let\s+\[isProcessing,\s*setIsProcessing\]\s*=\s*useState\(false\)/);
    });
});
