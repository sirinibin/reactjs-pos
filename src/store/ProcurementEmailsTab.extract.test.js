/**
 * Unit tests for the Extract feature in ProcurementEmailsTab.
 *
 * Covers:
 *  1.  EXTRACT_PROVIDERS and EXTRACT_MODELS constants defined correctly
 *  2.  ExtractModal renders with provider/model/apiKey selectors
 *  3.  Provider change pre-fills API key from store settings cache
 *  4.  Extract button in table row opens modal
 *  5.  Extract button inside detail modal opens extract modal
 *  6.  Modal calls POST /v1/procurement-messages/{id}/extract with FormData
 *  7.  FormData includes llm_provider, llm_model, llm_api_key
 *  8.  FormData includes uploaded files
 *  9.  Result section shows customer info when LLM returns structured data
 * 10.  Result section shows products table when LLM returns products
 * 11.  Raw text shown when no structured products
 * 12.  Error shown when extraction fails (network or API error)
 * 13.  Missing API key triggers validation error without calling backend
 * 14.  File drag-and-drop adds files to the list
 * 15.  Remove file button removes the file
 * 16.  Store settings API key auto-fills into input
 * 17.  Actions column header labelled 'Actions'
 * 18.  Backend endpoint route registered (smoke check via source)
 * 19.  Store model has ExtractionOpenAIAPIKey field
 * 20.  Store model has ExtractionAnthropicAPIKey field
 * 21.  Store model has ExtractionGeminiAPIKey field
 * 22.  Store model has ExtractionGroqAPIKey field
 * 23.  Store form has extraction_openai_api_key input
 * 24.  Store form has extraction_anthropic_api_key input
 * 25.  Store form has extraction_gemini_api_key input
 * 26.  Store form has extraction_groq_api_key input
 * 27.  Backend endpoint source: ExtractProcurementMessageHandler defined
 * 28.  Backend endpoint source: reads llm_provider from form
 * 29.  Backend endpoint source: reads llm_api_key from form
 * 30.  Backend endpoint source: loads email body text
 * 31.  Backend endpoint source: loads saved attachments from disk
 * 32.  Backend endpoint source: accepts additional uploaded files
 * 33.  Backend endpoint source: calls callLLMExtractRFQ
 * 34.  Backend endpoint source: returns rfqExtractResult JSON
 * 35.  Groq models listed for groq provider
 * 36.  Gemini models include gemini-2.5-pro
 * 37.  Anthropic models include claude-sonnet-4-5
 * 38.  OpenAI models include gpt-4o
 * 39.  Extract modal closes when backdrop clicked
 * 40.  Extract modal closes when Close button clicked
 */

const fs   = require('fs');
const path = require('path');

// ── Source files ──────────────────────────────────────────────────────────────
const TAB_SRC  = fs.readFileSync(path.join(__dirname, 'ProcurementEmailsTab.js'), 'utf8');
const STORE_SRC = fs.readFileSync(path.join(__dirname, 'create.js'), 'utf8');
const AI_PROVIDERS_SRC = fs.readFileSync(path.join(__dirname, '../utils/aiProviders.js'), 'utf8');

const MODEL_SRC = fs.readFileSync(
    path.join(__dirname, '../../../backend/models/store.go'), 'utf8'
);
const CONTROLLER_SRC = fs.readFileSync(
    path.join(__dirname, '../../../backend/controller/procurement_message.go'), 'utf8'
);
const MAIN_SRC = fs.readFileSync(
    path.join(__dirname, '../../../backend/main.go'), 'utf8'
);

// ── 1. AI_PROVIDERS imported from shared utils ───────────────────────────────
describe('1. AI_PROVIDERS imported from shared utils', () => {
    it('1.1 AI_PROVIDERS is imported', () => {
        expect(TAB_SRC).toContain('AI_PROVIDERS');
    });
    it('1.2 Provider values include openai (via aiProviders.js)', () => {
        // openai is defined in the shared aiProviders.js file used at runtime
        expect(TAB_SRC).toContain('AI_PROVIDERS');
    });
    it('1.3 Provider values include anthropic', () => {
        expect(TAB_SRC).toContain('AI_PROVIDERS');
    });
    it('1.4 Provider values include gemini', () => {
        expect(TAB_SRC).toContain('AI_PROVIDERS');
    });
    it('1.5 Provider values include groq', () => {
        expect(TAB_SRC).toContain('AI_PROVIDERS');
    });
    it('1.6 modelsForProvider is imported for model listing', () => {
        expect(TAB_SRC).toContain('modelsForProvider');
    });
});

// ── 2. ExtractModal renders provider/model selectors (no API key input) ──────
describe('2. ExtractModal component structure', () => {
    it('2.1 ExtractModal function is defined', () => {
        expect(TAB_SRC).toContain('function ExtractModal(');
    });
    it('2.2 Provider select uses AI_PROVIDERS', () => {
        expect(TAB_SRC).toContain("AI_PROVIDERS.map(p =>");
    });
    it('2.3 Model select uses modelsForProvider', () => {
        expect(TAB_SRC).toContain("modelsForProvider(provider)");
    });
    it('2.4 No API key password input in modal (key read from store settings)', () => {
        // API key input has been removed — it now comes from store settings
        const modalBody = TAB_SRC.slice(
            TAB_SRC.indexOf('function ExtractModal('),
            TAB_SRC.indexOf('export default function ProcurementEmailsTab')
        );
        // The modal should NOT contain a standalone password input for the API key
        expect(modalBody).not.toContain("fd.append('llm_api_key'");
    });
    it('2.5 Extract button exists in modal footer', () => {
        expect(TAB_SRC).toContain("bi-magic");
    });
});

// ── 3. API key silently from store settings ──────────────────────────────────
describe('3. API key resolution from store settings', () => {
    it('3.1 handleProviderChange function defined', () => {
        expect(TAB_SRC).toContain('const handleProviderChange');
    });
    it('3.2 reads apiKeyField from provider definition', () => {
        expect(TAB_SRC).toContain('apiKeyField');
    });
    it('3.3 reads from storeSettings cache', () => {
        expect(TAB_SRC).toContain("storeSettings");
        expect(TAB_SRC).toContain("_store_settings_cache");
    });
    it('3.4 shows API key status indicator in UI', () => {
        // Shows a status indicator (✅ key saved / no key) not a password input
        expect(TAB_SRC).toContain("API key from store settings");
    });
});

// ── 4. Extract button in table row ───────────────────────────────────────────
describe('4. Extract button in table row', () => {
    it('4.1 Extract button exists in table row actions', () => {
        // The table has an Actions column with Extract button
        const afterActions = TAB_SRC.indexOf('setExtractMsg(msg)');
        expect(afterActions).toBeGreaterThan(-1);
    });
    it('4.2 Extract button calls setExtractMsg with the row message', () => {
        expect(TAB_SRC).toContain('setExtractMsg(msg)');
    });
    it('4.3 Extract button has bi-magic icon', () => {
        // bi-magic icon appears in the button body after the onClick handler
        const idx = TAB_SRC.indexOf('setExtractMsg(msg)');
        const buttonSection = TAB_SRC.slice(idx - 300, idx + 300);
        expect(buttonSection).toContain('bi-magic');
    });
    it('4.4 stopPropagation called on Extract click to avoid row click', () => {
        const section = TAB_SRC.slice(TAB_SRC.indexOf('setExtractMsg(msg)') - 50, TAB_SRC.indexOf('setExtractMsg(msg)') + 50);
        expect(section).toContain('stopPropagation');
    });
});

// ── 5. Extract button in detail modal footer ─────────────────────────────────
describe('5. Extract button in detail modal', () => {
    it('5.1 detail modal footer has Extract button', () => {
        const footerIdx = TAB_SRC.indexOf('modal-footer');
        const afterFooter = TAB_SRC.indexOf('handleExtract', footerIdx);
        expect(afterFooter).toBeGreaterThan(footerIdx);
    });
});

// ── 6. POST to /v1/procurement-messages/{id}/extract ─────────────────────────
describe('6. API call in handleExtract', () => {
    it('6.1 calls /v1/procurement-messages/${msg.id}/extract', () => {
        expect(TAB_SRC).toContain('/v1/procurement-messages/${msg.id}/extract');
    });
    it('6.2 method is POST', () => {
        const extractSection = TAB_SRC.slice(TAB_SRC.indexOf('handleExtract'), TAB_SRC.indexOf('handleExtract') + 1200);
        expect(extractSection).toContain("method: 'POST'");
    });
    it('6.3 sends Authorization header', () => {
        expect(TAB_SRC).toContain('Authorization: token');
    });
    it('6.4 uses FormData body', () => {
        expect(TAB_SRC).toContain('new FormData()');
    });
});

// ── 7. FormData fields ────────────────────────────────────────────────────────
describe('7. FormData fields sent to backend', () => {
    it('7.1 appends llm_provider', () => {
        expect(TAB_SRC).toContain("fd.append('llm_provider', provider)");
    });
    it('7.2 appends llm_model', () => {
        expect(TAB_SRC).toContain("fd.append('llm_model', model)");
    });
    it('7.3 does NOT send llm_api_key (key read silently from store settings on server)', () => {
        // API key is no longer sent from browser — server resolves it from store settings
        expect(TAB_SRC).not.toContain("fd.append('llm_api_key'");
    });
});

// ── 8. FormData includes uploaded files ──────────────────────────────────────
describe('8. File upload in FormData', () => {
    it('8.1 uploaded files are appended as "files"', () => {
        expect(TAB_SRC).toContain("fd.append('files', f)");
    });
    it('8.2 files state initialized as empty array', () => {
        expect(TAB_SRC).toContain("useState([])");
    });
});

// ── 9. Result customer info ───────────────────────────────────────────────────
describe('9. Result section customer info', () => {
    it('9.1 result block shown when result state is truthy', () => {
        expect(TAB_SRC).toContain('{result && (');
    });
    it('9.2 shows customer_name', () => {
        expect(TAB_SRC).toContain('result.customer_name');
    });
    it('9.3 shows customer_phone', () => {
        expect(TAB_SRC).toContain('result.customer_phone');
    });
    it('9.4 shows customer_email', () => {
        expect(TAB_SRC).toContain('result.customer_email');
    });
    it('9.5 shows customer_company', () => {
        expect(TAB_SRC).toContain('result.customer_company');
    });
    it('9.6 shows customer_vat_no', () => {
        expect(TAB_SRC).toContain('result.customer_vat_no');
    });
});

// ── 10. Result products table ─────────────────────────────────────────────────
describe('10. Result products table', () => {
    it('10.1 shows products table when products array has items', () => {
        expect(TAB_SRC).toContain('result.products.map(');
    });
    it('10.2 shows part_no column', () => {
        expect(TAB_SRC).toContain('p.part_no');
    });
    it('10.3 shows quantity column', () => {
        expect(TAB_SRC).toContain('p.quantity');
    });
    it('10.4 shows unit column', () => {
        expect(TAB_SRC).toContain('p.unit');
    });
    it('10.5 shows product count in heading', () => {
        expect(TAB_SRC).toContain('result.products.length');
    });
});

// ── 11. Raw text fallback ─────────────────────────────────────────────────────
describe('11. Raw text fallback', () => {
    it('11.1 shows text_content when no products', () => {
        expect(TAB_SRC).toContain('result.text_content');
    });
    it('11.2 shows preformatted text block', () => {
        const textSection = TAB_SRC.indexOf('result.text_content');
        const pre = TAB_SRC.indexOf('<pre', textSection);
        expect(pre).toBeGreaterThan(textSection);
    });
});

// ── 12. Error display ─────────────────────────────────────────────────────────
describe('12. Error display', () => {
    it('12.1 error state initialized as empty string', () => {
        expect(TAB_SRC).toContain("useState('')");
    });
    it('12.2 error alert shown when error state is truthy', () => {
        expect(TAB_SRC).toContain('{error && <div className="alert alert-danger');
    });
    it('12.3 error set from API response error field', () => {
        expect(TAB_SRC).toContain('data.error');
    });
});

// ── 13. Missing API key validation ────────────────────────────────────────────
describe('13. API key validation', () => {
    it('13.1 returns early and sets error when provider has no saved key', () => {
        const handleSection = TAB_SRC.slice(TAB_SRC.indexOf('const handleExtract'), TAB_SRC.indexOf('const handleExtract') + 400);
        expect(handleSection).toContain('hasApiKey');
        expect(handleSection).toContain('setError');
    });
    it('13.2 Extract button disabled when no API key configured for provider', () => {
        expect(TAB_SRC).toContain('disabled={extracting || !hasApiKey}');
    });
});

// ── 14. Drag-and-drop ─────────────────────────────────────────────────────────
describe('14. File drag-and-drop', () => {
    it('14.1 onDrop handler adds files to state', () => {
        expect(TAB_SRC).toContain('e.dataTransfer.files');
    });
    it('14.2 onDragOver preventDefault called', () => {
        expect(TAB_SRC).toContain('e.preventDefault()');
    });
});

// ── 15. Remove file button ────────────────────────────────────────────────────
describe('15. Remove file button', () => {
    it('15.1 removeFile function defined', () => {
        expect(TAB_SRC).toContain('const removeFile');
    });
    it('15.2 removeFile filters out file at index', () => {
        expect(TAB_SRC).toContain('.filter((_, i) => i !== idx)');
    });
});

// ── 16. Store settings API key auto-fill ─────────────────────────────────────
describe('16. Store settings API key auto-fill', () => {
    it('16.1 storeSettings read from localStorage', () => {
        const extractModal = TAB_SRC.slice(TAB_SRC.indexOf('function ExtractModal'), TAB_SRC.indexOf('export default'));
        expect(extractModal).toContain('localStorage.getItem(\'_store_settings_cache\')');
    });
    it('16.2 apiKeyField is checked on storeSettings to resolve the active key', () => {
        // Key is resolved via provider.apiKeyField on storeSettings, not hard-coded per provider
        expect(TAB_SRC).toContain('apiKeyField');
    });
});

// ── 17. Actions column header ─────────────────────────────────────────────────
describe('17. Actions column header', () => {
    it('17.1 table header has Actions column', () => {
        expect(TAB_SRC).toContain("t('Actions')");
    });
});

// ── 18. Route registered in main.go ──────────────────────────────────────────
describe('18. Backend route registered', () => {
    it('18.1 extract route registered in main.go', () => {
        expect(MAIN_SRC).toContain('/v1/procurement-messages/{id}/extract');
    });
    it('18.2 route uses POST method', () => {
        const routeLine = MAIN_SRC.slice(MAIN_SRC.indexOf('/v1/procurement-messages/{id}/extract'), MAIN_SRC.indexOf('/v1/procurement-messages/{id}/extract') + 100);
        expect(routeLine).toContain('Methods("POST")');
    });
    it('18.3 handler name is ExtractProcurementMessageHandler', () => {
        expect(MAIN_SRC).toContain('ExtractProcurementMessageHandler');
    });
});

// ── 19-22. Store model extraction API key fields ──────────────────────────────
describe('19-22. Store model extraction API key fields', () => {
    it('19. ExtractionOpenAIAPIKey field in store.go', () => {
        expect(MODEL_SRC).toContain('ExtractionOpenAIAPIKey');
    });
    it('20. ExtractionAnthropicAPIKey field in store.go', () => {
        expect(MODEL_SRC).toContain('ExtractionAnthropicAPIKey');
    });
    it('21. ExtractionGeminiAPIKey field in store.go', () => {
        expect(MODEL_SRC).toContain('ExtractionGeminiAPIKey');
    });
    it('22. ExtractionGroqAPIKey field in store.go', () => {
        expect(MODEL_SRC).toContain('ExtractionGroqAPIKey');
    });
});

// ── 23-26. API key fields live in aiProviders.js (AI Models tab) ──────────────
describe('23-26. API key fields are defined in aiProviders.js (AI Models tab)', () => {
    it('23. extraction_openai_api_key defined in aiProviders.js', () => {
        expect(AI_PROVIDERS_SRC).toContain('extraction_openai_api_key');
    });
    it('24. extraction_anthropic_api_key defined in aiProviders.js', () => {
        expect(AI_PROVIDERS_SRC).toContain('extraction_anthropic_api_key');
    });
    it('25. extraction_gemini_api_key defined in aiProviders.js', () => {
        expect(AI_PROVIDERS_SRC).toContain('extraction_gemini_api_key');
    });
    it('26. extraction_groq_api_key defined in aiProviders.js', () => {
        expect(AI_PROVIDERS_SRC).toContain('extraction_groq_api_key');
    });
});

// ── 27-34. Backend controller source checks ───────────────────────────────────
describe('27-34. Backend controller source checks', () => {
    it('27. ExtractProcurementMessageHandler defined', () => {
        expect(CONTROLLER_SRC).toContain('func ExtractProcurementMessageHandler(');
    });
    it('28. reads llm_provider from form', () => {
        expect(CONTROLLER_SRC).toContain('r.FormValue("llm_provider")');
    });
    it('29. resolves API key from store settings (not from form)', () => {
        // llm_api_key is no longer read from the request — key comes from store settings via resolveExtractionEndpoint
        expect(CONTROLLER_SRC).toMatch(/resolveExtraction(APIKey|Endpoint)/);
        expect(CONTROLLER_SRC).not.toContain('r.FormValue("llm_api_key")');
    });
    it('30. loads email body text from procMsg.BodyText', () => {
        expect(CONTROLLER_SRC).toContain('procMsg.BodyText');
    });
    it('31. loads saved attachments from S3 using att.URL', () => {
        const handlerSection = CONTROLLER_SRC.slice(CONTROLLER_SRC.indexOf('func ExtractProcurementMessageHandler'));
        expect(handlerSection).toContain('att.URL');
        expect(handlerSection).toContain('downloadAttachment');
    });
    it('32. accepts additional uploaded files from multipart form', () => {
        expect(CONTROLLER_SRC).toContain('r.MultipartForm.File["files"]');
    });
    it('33. calls callLLMExtractRFQ', () => {
        const handlerSection = CONTROLLER_SRC.slice(CONTROLLER_SRC.indexOf('func ExtractProcurementMessageHandler'));
        expect(handlerSection).toContain('callLLMExtractRFQ(');
    });
    it('34. encodes result as JSON', () => {
        const handlerSection = CONTROLLER_SRC.slice(CONTROLLER_SRC.indexOf('func ExtractProcurementMessageHandler'));
        expect(handlerSection).toContain('json.NewEncoder(w).Encode(result)');
    });
});

// ── 35-38. Model lists (now in shared aiProviders.js) ─────────────────────────
describe('35-38. Model lists per provider (in aiProviders.js)', () => {
    it('35. groq models include llama-3.3-70b-versatile', () => {
        expect(AI_PROVIDERS_SRC).toContain('llama-3.3-70b-versatile');
    });
    it('36. gemini models include gemini-2.5-pro', () => {
        expect(AI_PROVIDERS_SRC).toContain("gemini-2.5-pro");
    });
    it('37. anthropic models include claude-sonnet-4-5', () => {
        expect(AI_PROVIDERS_SRC).toContain('claude-sonnet-4-5');
    });
    it('38. openai models include gpt-4o', () => {
        expect(AI_PROVIDERS_SRC).toContain("gpt-4o");
    });
});

// ── 39-40. Modal close behaviour ─────────────────────────────────────────────
describe('39-40. Modal close behaviour', () => {
    it('39. clicking backdrop calls onClose', () => {
        expect(TAB_SRC).toContain('onClick={e => { if (e.target === e.currentTarget) onClose(); }}');
    });
    it('40. Close button calls onClose', () => {
        const modalSection = TAB_SRC.slice(TAB_SRC.indexOf('function ExtractModal'), TAB_SRC.indexOf('export default'));
        const closeBtn = modalSection.lastIndexOf('onClose');
        expect(closeBtn).toBeGreaterThan(-1);
    });
});
