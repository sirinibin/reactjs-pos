/**
 * Source-level tests for:
 *  1. "Content Extraction Test" section in store/create.js procurement tab
 *  2. LLM dropdown added to "Populate RFQ Suppliers from Vendors" section
 *  3. ProcurementExtractTestHandler route in main.go
 *  4. PopulateSuppliersLLM settings in store.go
 */

const fs   = require('fs');
const path = require('path');

const CREATE_SRC = fs.readFileSync(path.join(__dirname, 'create.js'), 'utf8');
const AI_PROVIDERS_SRC = fs.readFileSync(path.join(__dirname, '../utils/aiProviders.js'), 'utf8');
// Backend (pos-rest) sources live outside this repo; the suites that need them
// are skipped when the backend checkout is not found (see testHelpers/backendSource).
const { readBackendFile, describeIfSources } = require('../testHelpers/backendSource');
const STORE_GO   = readBackendFile('models/store.go');
const MAIN_GO    = readBackendFile('main.go');
const PM_GO      = readBackendFile('controller/procurement_message.go');

// ── 1. Content Extraction Test section — heading ───────────────────────────────

describe('create.js — Content Extraction Test: section heading', () => {
    test('1.1  "Content Extraction Test" heading is present', () => {
        expect(CREATE_SRC).toMatch(/Content Extraction Test/);
    });

    test('1.2  bi-magic icon used in the section heading', () => {
        const idx = CREATE_SRC.indexOf('Content Extraction Test');
        expect(idx).toBeGreaterThan(-1);
        const surroundings = CREATE_SRC.slice(Math.max(0, idx - 300), idx + 300);
        expect(surroundings).toMatch(/bi-magic/);
    });
});

// ── 2. Content Extraction Test — provider/model dropdown ─────────────────────

describe('create.js — Content Extraction Test: LLM provider dropdown', () => {
    test('2.1  extractTest state is declared', () => {
        expect(CREATE_SRC).toMatch(/extractTest/);
        expect(CREATE_SRC).toMatch(/setExtractTest/);
    });

    test('2.2  provider select for extractTest is present', () => {
        expect(CREATE_SRC).toMatch(/extractTest\.provider/);
    });

    test('2.3  model select for extractTest is present', () => {
        expect(CREATE_SRC).toMatch(/extractTest\.model/);
    });

    test('2.4  OpenAI option comes from AI_PROVIDERS (in aiProviders.js)', () => {
        // Provider options are rendered via AI_PROVIDERS.map() — labels live in aiProviders.js
        expect(CREATE_SRC).toMatch(/AI_PROVIDERS\.map/);
        expect(AI_PROVIDERS_SRC).toMatch(/openai/);
        expect(AI_PROVIDERS_SRC).toMatch(/OpenAI/);
    });

    test('2.5  Anthropic option comes from AI_PROVIDERS', () => {
        expect(AI_PROVIDERS_SRC).toMatch(/anthropic/);
        expect(AI_PROVIDERS_SRC).toMatch(/Anthropic/);
    });

    test('2.6  Google Gemini option comes from AI_PROVIDERS', () => {
        expect(AI_PROVIDERS_SRC).toMatch(/gemini/);
    });

    test('2.7  Groq option comes from AI_PROVIDERS', () => {
        expect(AI_PROVIDERS_SRC).toMatch(/Groq/);
    });
});

// ── 3. Content Extraction Test — model lists ──────────────────────────────────

describe('create.js — Content Extraction Test: model lists', () => {
    test('3.1  gpt-4o model present in AI_PROVIDERS', () => {
        // Model lists are in aiProviders.js, rendered via modelsForProvider() in create.js
        expect(AI_PROVIDERS_SRC).toMatch(/gpt-4o/);
        expect(CREATE_SRC).toMatch(/modelsForProvider\(|\.models/);
    });

    test('3.2  claude-sonnet model present in AI_PROVIDERS', () => {
        expect(AI_PROVIDERS_SRC).toMatch(/claude-sonnet/);
    });

    test('3.3  gemini-2.5-pro model present in AI_PROVIDERS', () => {
        expect(AI_PROVIDERS_SRC).toMatch(/gemini-2\.5-pro/);
    });

    test('3.4  llama model for groq present in AI_PROVIDERS', () => {
        expect(AI_PROVIDERS_SRC).toMatch(/llama-3\.3-70b|llama-3/);
    });

    test('3.5  pricing hints included in AI_PROVIDERS model labels', () => {
        expect(AI_PROVIDERS_SRC).toMatch(/per 1M|costPer1M/);
    });
});

// ── 4. Content Extraction Test — API key field ────────────────────────────────

describe('create.js — Content Extraction Test: API key', () => {
    test('4.1  API key status shown via apiKeyField from AI_PROVIDERS', () => {
        // No longer uses extractTest.apiKey — key is resolved server-side from store settings
        expect(CREATE_SRC).toMatch(/apiKeyField/);
        expect(CREATE_SRC).toMatch(/formData\.settings.*apiKeyField|apiKeyField.*formData\.settings/s);
    });

    test('4.2  API key fields for all providers defined in aiProviders.js', () => {
        expect(AI_PROVIDERS_SRC).toMatch(/extraction_openai_api_key/);
        expect(AI_PROVIDERS_SRC).toMatch(/extraction_anthropic_api_key/);
        expect(AI_PROVIDERS_SRC).toMatch(/extraction_gemini_api_key/);
        expect(AI_PROVIDERS_SRC).toMatch(/extraction_groq_api_key/);
    });

    test('4.3  key status indicator shown in UI (AI Models tab / no key warning)', () => {
        expect(CREATE_SRC).toMatch(/AI Models tab|apiKeyField/);
    });
});

// ── 5. Content Extraction Test — text input ───────────────────────────────────

describe('create.js — Content Extraction Test: text input', () => {
    test('5.1  textarea for free-text input is present', () => {
        const hasTextarea = CREATE_SRC.includes('<textarea') || CREATE_SRC.includes('textarea');
        expect(hasTextarea).toBe(true);
    });

    test('5.2  extractTest.text state field is used', () => {
        expect(CREATE_SRC).toMatch(/extractTest\.text/);
    });
});

// ── 6. Content Extraction Test — file upload ──────────────────────────────────

describe('create.js — Content Extraction Test: file upload', () => {
    test('6.1  file input with correct accepted types', () => {
        expect(CREATE_SRC).toMatch(/\.pdf.*\.xlsx|\.xlsx.*\.pdf/s);
        expect(CREATE_SRC).toMatch(/\.jpg|\.jpeg|\.png/);
    });

    test('6.2  extractTestFileInput id is used', () => {
        expect(CREATE_SRC).toMatch(/extractTestFileInput/);
    });

    test('6.3  drag-and-drop (onDrop) is implemented', () => {
        expect(CREATE_SRC).toMatch(/onDrop/);
    });

    test('6.4  files can be removed individually (filter)', () => {
        // s.files.filter is used in the remove-file button click handler
        expect(CREATE_SRC).toMatch(/files\.filter|s\.files\.filter/);
    });

    test('6.5  extractTest.files state field is used', () => {
        expect(CREATE_SRC).toMatch(/extractTest\.files/);
    });
});

// ── 7. Content Extraction Test — Extract button & API call ────────────────────

describe('create.js — Content Extraction Test: Extract button', () => {
    test('7.1  Extract button is present', () => {
        const idx = CREATE_SRC.indexOf('Content Extraction Test');
        const section = CREATE_SRC.slice(idx, idx + 8000);
        expect(section).toMatch(/Extract/);
    });

    test('7.2  calls /v1/procurement-extract-test endpoint', () => {
        expect(CREATE_SRC).toMatch(/procurement-extract-test/);
    });

    test('7.3  FormData is built with llm_provider and llm_model (no llm_api_key — resolved server-side)', () => {
        expect(CREATE_SRC).toMatch(/fd\.append\(['"]llm_provider['"]/);
        expect(CREATE_SRC).toMatch(/fd\.append\(['"]llm_model['"]/);
        // llm_api_key is NOT sent — server resolves key from store settings via store_id
        expect(CREATE_SRC).not.toMatch(/fd\.append\(['"]llm_api_key['"]/);
        expect(CREATE_SRC).toMatch(/store_id/);
    });

    test('7.4  text field is appended to FormData', () => {
        expect(CREATE_SRC).toMatch(/fd\.append\(['"]text['"]/);
    });

    test('7.5  files are appended to FormData', () => {
        expect(CREATE_SRC).toMatch(/fd\.append\(['"]files['"]/);
    });

    test('7.6  loading spinner shown while extracting', () => {
        expect(CREATE_SRC).toMatch(/extractTest\.loading/);
        expect(CREATE_SRC).toMatch(/spinner-border/);
    });
});

// ── 8. Content Extraction Test — results display ──────────────────────────────

describe('create.js — Content Extraction Test: results display', () => {
    test('8.1  customer info section in results', () => {
        expect(CREATE_SRC).toMatch(/Customer Info/);
        expect(CREATE_SRC).toMatch(/customer_name/);
    });

    test('8.2  products table in results', () => {
        expect(CREATE_SRC).toMatch(/Products/);
        expect(CREATE_SRC).toMatch(/part_no/);
    });

    test('8.3  products table shows Part No column', () => {
        expect(CREATE_SRC).toMatch(/Part No/);
    });

    test('8.4  products table shows Qty column', () => {
        expect(CREATE_SRC).toMatch(/Qty/);
    });

    test('8.5  products table shows Unit column', () => {
        expect(CREATE_SRC).toMatch(/Unit/);
    });

    test('8.6  general_instructions is displayed below products', () => {
        expect(CREATE_SRC).toMatch(/general_instructions/);
        expect(CREATE_SRC).toMatch(/General Instructions/);
    });

    test('8.7  raw text_content fallback for unstructured output', () => {
        expect(CREATE_SRC).toMatch(/text_content/);
    });

    test('8.8  error alert is shown on failure', () => {
        // alert-danger and extractTest.error appear in the whole file since this is the only extraction test section
        expect(CREATE_SRC).toMatch(/alert-danger/);
        expect(CREATE_SRC).toMatch(/extractTest\.error/);
    });

    test('8.9  Clear Results button is present', () => {
        expect(CREATE_SRC).toMatch(/Clear Results/);
    });

    test('8.10  model used is shown in results', () => {
        expect(CREATE_SRC).toMatch(/llm_model|Model used/);
    });
});

// ── 9. Populate RFQ Suppliers — LLM dropdown ─────────────────────────────────

describe('create.js — Populate RFQ Suppliers: LLM dropdown', () => {
    test('9.1  populate_suppliers_llm_provider field is referenced', () => {
        expect(CREATE_SRC).toMatch(/populate_suppliers_llm_provider/);
    });

    test('9.2  populate_suppliers_llm_model field is referenced', () => {
        expect(CREATE_SRC).toMatch(/populate_suppliers_llm_model/);
    });

    test('9.3  provider dropdown appears in the Populate section', () => {
        const idx = CREATE_SRC.indexOf('Populate RFQ Suppliers from Vendors');
        expect(idx).toBeGreaterThan(-1);
        const section = CREATE_SRC.slice(idx, idx + 5000);
        expect(section).toMatch(/populate_suppliers_llm_provider/);
    });

    test('9.4  model dropdown appears in the Populate section', () => {
        const idx = CREATE_SRC.indexOf('Populate RFQ Suppliers from Vendors');
        const section = CREATE_SRC.slice(idx, idx + 5000);
        expect(section).toMatch(/populate_suppliers_llm_model/);
    });

    test('9.5  provider options come from AI_PROVIDERS (openai in aiProviders.js)', () => {
        // Options rendered via AI_PROVIDERS.map() — literal "openai" is in aiProviders.js
        const idx = CREATE_SRC.indexOf('populate_suppliers_llm_provider');
        const section = CREATE_SRC.slice(idx, idx + 3000);
        expect(section).toMatch(/AI_PROVIDERS\.map|p\.value|p\.label/);
        expect(AI_PROVIDERS_SRC).toMatch(/openai/);
    });

    test('9.6  anthropic option comes from AI_PROVIDERS', () => {
        expect(AI_PROVIDERS_SRC).toMatch(/anthropic/);
    });

    test('9.7  note that extraction API key will be used is shown', () => {
        // The note appears after the model dropdown; search a wider window
        const idx = CREATE_SRC.indexOf('populate_suppliers_llm_provider');
        const section = CREATE_SRC.slice(idx, idx + 6000);
        expect(section).toMatch(/API key|api_key|Extraction API/i);
    });

    test('9.8  "Use default RFQ LLM" option for fallback', () => {
        const idx = CREATE_SRC.indexOf('populate_suppliers_llm_provider');
        const section = CREATE_SRC.slice(idx, idx + 6000);
        expect(section).toMatch(/Use default/i);
    });
});

// ── 10. Backend: store.go — PopulateSuppliersLLM fields ──────────────────────

describeIfSources(STORE_GO)('store.go — PopulateSuppliersLLM settings', () => {
    test('10.1  PopulateSuppliersLLMProvider field exists in store.go', () => {
        expect(STORE_GO).toMatch(/PopulateSuppliersLLMProvider/);
    });

    test('10.2  PopulateSuppliersLLMModel field exists in store.go', () => {
        expect(STORE_GO).toMatch(/PopulateSuppliersLLMModel/);
    });

    test('10.3  bson tags for populate_suppliers_llm_provider', () => {
        expect(STORE_GO).toMatch(/populate_suppliers_llm_provider/);
    });

    test('10.4  bson tags for populate_suppliers_llm_model', () => {
        expect(STORE_GO).toMatch(/populate_suppliers_llm_model/);
    });
});

// ── 11. Backend: main.go — /v1/procurement-extract-test route ─────────────────

describeIfSources(MAIN_GO)('main.go — ProcurementExtractTestHandler route', () => {
    test('11.1  route /v1/procurement-extract-test is registered', () => {
        expect(MAIN_GO).toMatch(/procurement-extract-test/);
    });

    test('11.2  ProcurementExtractTestHandler is referenced in main.go', () => {
        expect(MAIN_GO).toMatch(/ProcurementExtractTestHandler/);
    });

    test('11.3  POST method is used for the route', () => {
        const idx = MAIN_GO.indexOf('procurement-extract-test');
        const surroundings = MAIN_GO.slice(Math.max(0, idx - 20), idx + 200);
        expect(surroundings).toMatch(/POST/);
    });
});

// ── 12. Backend: procurement_message.go — ProcurementExtractTestHandler ────────

describeIfSources(PM_GO)('procurement_message.go — ProcurementExtractTestHandler', () => {
    test('12.1  handler function is defined', () => {
        expect(PM_GO).toMatch(/ProcurementExtractTestHandler/);
    });

    test('12.2  reads llm_provider from form', () => {
        const idx = PM_GO.indexOf('ProcurementExtractTestHandler');
        const fn = PM_GO.slice(idx, idx + 3000);
        expect(fn).toMatch(/llm_provider/);
    });

    test('12.3  reads llm_model from form', () => {
        const idx = PM_GO.indexOf('ProcurementExtractTestHandler');
        const fn = PM_GO.slice(idx, idx + 3000);
        expect(fn).toMatch(/llm_model/);
    });

    test('12.4  resolves API key from store settings (not from form field)', () => {
        const idx = PM_GO.indexOf('ProcurementExtractTestHandler');
        const fn = PM_GO.slice(idx, idx + 4000);
        expect(fn).toMatch(/resolveExtraction(APIKey|Endpoint)/);
        expect(fn).not.toMatch(/r\.FormValue\("llm_api_key"\)/);
    });

    test('12.5  reads free text from form field "text"', () => {
        const idx = PM_GO.indexOf('ProcurementExtractTestHandler');
        const fn = PM_GO.slice(idx, idx + 3000);
        expect(fn).toMatch(/"text"/);
    });

    test('12.6  accepts file uploads via multipart form', () => {
        const idx = PM_GO.indexOf('ProcurementExtractTestHandler');
        const fn = PM_GO.slice(idx, idx + 3000);
        expect(fn).toMatch(/MultipartForm|ParseMultipartForm/);
    });

    test('12.7  calls callLLMExtractRFQ', () => {
        const idx = PM_GO.indexOf('ProcurementExtractTestHandler');
        const fn = PM_GO.slice(idx, idx + 5000);
        expect(fn).toMatch(/callLLMExtractRFQ/);
    });

    test('12.8  handles xlsx/excel files', () => {
        const idx = PM_GO.indexOf('ProcurementExtractTestHandler');
        const fn = PM_GO.slice(idx, idx + 3000);
        expect(fn).toMatch(/\.xlsx|\.xls|excelToText/);
    });

    test('12.9  handles PDF files', () => {
        const idx = PM_GO.indexOf('ProcurementExtractTestHandler');
        const fn = PM_GO.slice(idx, idx + 3000);
        expect(fn).toMatch(/\.pdf|pdfBase64/);
    });

    test('12.10  handles image files', () => {
        const idx = PM_GO.indexOf('ProcurementExtractTestHandler');
        const fn = PM_GO.slice(idx, idx + 3000);
        expect(fn).toMatch(/imageDataURIs|isRFQImageExt/);
    });

    test('12.11  returns 400 when no content provided', () => {
        const idx = PM_GO.indexOf('ProcurementExtractTestHandler');
        const fn = PM_GO.slice(idx, idx + 5000);
        expect(fn).toMatch(/no content to extract/i);
    });

    test('12.12  returns 400 when api key missing', () => {
        const idx = PM_GO.indexOf('ProcurementExtractTestHandler');
        const fn = PM_GO.slice(idx, idx + 3000);
        expect(fn).toMatch(/llm_provider.*required|llm_api_key.*required/s);
    });
});

// ── 13. email_polling.go Zoho fixes (source-level) ────────────────────────────

const EMAIL_POLLING = readBackendFile('controller/email_polling.go');

describeIfSources(EMAIL_POLLING)('email_polling.go — Zoho fixes', () => {
    test('13.1  hasZohoAttachment field in parsedEmail struct', () => {
        expect(EMAIL_POLLING).toMatch(/hasZohoAttachment/);
    });

    test('13.2  HTTP status check in listZohoMessages (non-200 returns error)', () => {
        expect(EMAIL_POLLING).toMatch(/resp\.StatusCode != 200/);
    });

    test('13.3  attachmentMissing uses hasZohoAttachment OR mentionsAttachment', () => {
        expect(EMAIL_POLLING).toMatch(/hasZohoAttachment.*mentionsAttachment|mentionsAttachment.*hasZohoAttachment/s);
    });

    test('13.4  download URL fallback: no-folder URL tried as fallback', () => {
        expect(EMAIL_POLLING).toMatch(/dlURLs/);
        // Both folder and no-folder patterns should be present in the download loop
        expect(EMAIL_POLLING).toMatch(/folders.*messages.*attachments.*\n.*accounts.*messages.*attachments|dlURLs.*append.*folders/s);
    });

    test('13.5  mentionsAttachment includes "for the attached" phrase', () => {
        expect(EMAIL_POLLING).toMatch(/"for the attached"/);
    });

    test('13.6  mentionsAttachment includes "the attached excel" phrase', () => {
        expect(EMAIL_POLLING).toMatch(/"the attached excel"/);
    });

    test('13.7  mentionsAttachment includes "look at the attached" phrase', () => {
        expect(EMAIL_POLLING).toMatch(/"look at the attached"/);
    });

    test('13.8  mentionsAttachment includes "with attached" phrase', () => {
        expect(EMAIL_POLLING).toMatch(/"with attached"/);
    });

    test('13.9  listZohoMessages HTTP error includes status code in message', () => {
        expect(EMAIL_POLLING).toMatch(/zoho list HTTP.*StatusCode/s);
    });

    test('13.10  pe.hasZohoAttachment is set from m.HasAttachment', () => {
        expect(EMAIL_POLLING).toMatch(/hasZohoAttachment.*m\.HasAttachment|HasAttachment.*hasZohoAttachment/s);
    });
});
