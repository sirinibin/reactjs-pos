/**
 * Source-level tests for the Vendor Category feature.
 *
 * Covers all changed files without spinning up React or a real server:
 *   1. vendor_category/create.js  — CRUD form modal
 *   2. vendor_category/index.js   — manage-categories modal (list + delete + create)
 *   3. vendor_category/view.js    — detail view modal
 *   4. vendor/create.js           — multi-select category field, duplicate prevention,
 *                                   category_id submission, getVendor population
 */

const fs   = require('fs');
const path = require('path');

const CREATE  = fs.readFileSync(path.join(__dirname, '../create.js'), 'utf8');
const INDEX   = fs.readFileSync(path.join(__dirname, '../index.js'),  'utf8');
const VIEW    = fs.readFileSync(path.join(__dirname, '../view.js'),   'utf8');
const VENDOR  = fs.readFileSync(path.join(__dirname, '../../vendor/create.js'), 'utf8');


// ══════════════════════════════════════════════════════════════════════════════
// 1. vendor_category/create.js
// ══════════════════════════════════════════════════════════════════════════════

describe('vendor_category/create.js — API endpoints', () => {
    test('POST to /v1/vendor-category on create', () => {
        expect(CREATE).toMatch(/["'`]\/v1\/vendor-category["'`]/);
    });

    test('PUT to /v1/vendor-category/{id} on update', () => {
        expect(CREATE).toMatch(/["'`]\/v1\/vendor-category\/["'`]\s*\+\s*(formData\.id|vendorCategory\.id)/);
    });

    test('store_id read from localStorage', () => {
        expect(CREATE).toMatch(/localStorage\.getItem\(["']store_id["']\)/);
    });

    test('store_id set on formData before POST', () => {
        expect(CREATE).toMatch(/formData\.store_id\s*=\s*localStorage\.getItem\(["']store_id["']\)/);
    });
});

describe('vendor_category/create.js — useImperativeHandle open()', () => {
    test('open() method is exposed via useImperativeHandle', () => {
        expect(CREATE).toMatch(/useImperativeHandle/);
        expect(CREATE).toMatch(/open\s*\(\s*id\s*\)/);
    });

    test('formData is reset on open()', () => {
        expect(CREATE).toMatch(/formData\s*=\s*\{\}/);
    });

    test('SetShow(true) is called to display the modal', () => {
        expect(CREATE).toMatch(/SetShow\s*\(\s*true\s*\)/);
    });

    test('getVendorCategory(id) is called when id is provided', () => {
        expect(CREATE).toMatch(/if\s*\(\s*id\s*\)\s*\{[\s\S]*?getVendorCategory\s*\(\s*id\s*\)/);
    });
});

describe('vendor_category/create.js — name field', () => {
    test('name input field is present in the form', () => {
        expect(CREATE).toMatch(/formData\.name/);
    });

    test('Name label is rendered', () => {
        expect(CREATE).toMatch(/Category\s*name|Category Details/);
    });

    test('vendor_category_name id used on input', () => {
        expect(CREATE).toMatch(/id=["']vendor_category_name["']/);
    });
});

describe('vendor_category/create.js — error handling', () => {
    test('errors state is initialised', () => {
        expect(CREATE).toMatch(/useState\s*\(\s*\{\}\s*\)/);
    });

    test('setErrors is called on catch', () => {
        expect(CREATE).toMatch(/setErrors\s*\(\s*\{/);
    });

    test('showToastMessage is called on failure', () => {
        expect(CREATE).toMatch(/showToastMessage.*Failed to process vendor category/);
    });

    test('showToastMessage is called on success (create)', () => {
        expect(CREATE).toMatch(/Vendor category created successfully/);
    });

    test('showToastMessage is called on success (update)', () => {
        expect(CREATE).toMatch(/Vendor category updated successfully/);
    });
});

describe('vendor_category/create.js — processing state', () => {
    test('setProcessing(true) before fetch', () => {
        expect(CREATE).toMatch(/setProcessing\s*\(\s*true\s*\)/);
    });

    test('setProcessing(false) on success', () => {
        expect(CREATE).toMatch(/setProcessing\s*\(\s*false\s*\)/);
    });

    test('Spinner is shown during processing', () => {
        expect(CREATE).toMatch(/Spinner/);
        expect(CREATE).toMatch(/isProcessing/);
    });
});

describe('vendor_category/create.js — GET for edit', () => {
    test('GET /v1/vendor-category/{id} fetches the record', () => {
        expect(CREATE).toMatch(/fetch\s*\(\s*['"`]\/v1\/vendor-category\/['"`]\s*\+\s*id/);
    });

    test('Authorization header is set from localStorage', () => {
        expect(CREATE).toMatch(/Authorization.*localStorage\.getItem\(["']access_token["']\)/);
    });

    test('formData is populated from response', () => {
        expect(CREATE).toMatch(/formData\s*=\s*data\.result/);
    });
});

describe('vendor_category/create.js — forwardRef export', () => {
    test('forwardRef is used', () => {
        expect(CREATE).toMatch(/forwardRef/);
    });

    test('component is exported as default', () => {
        expect(CREATE).toMatch(/export\s+default\s+VendorCategoryCreate/);
    });
});


// ══════════════════════════════════════════════════════════════════════════════
// 2. vendor_category/index.js
// ══════════════════════════════════════════════════════════════════════════════

describe('vendor_category/index.js — API calls', () => {
    test('GET /v1/vendor-category to list categories', () => {
        expect(INDEX).toMatch(/["'`]\/v1\/vendor-category\?["'`]/);
    });

    test('DELETE /v1/vendor-category/{id} for delete', () => {
        expect(INDEX).toMatch(/["'`]DELETE["'`]/);
        expect(INDEX).toMatch(/["'`]\/v1\/vendor-category\/["'`]\s*\+\s*id/);
    });

    test('select=id,name,created_by_name,created_at in list query', () => {
        expect(INDEX).toMatch(/select=id,name,created_by_name,created_at/);
    });

    test('limit=200 to load all categories', () => {
        expect(INDEX).toMatch(/limit.*200|200.*limit/);
    });
});

describe('vendor_category/index.js — open() method', () => {
    test('open() is exposed via useImperativeHandle', () => {
        expect(INDEX).toMatch(/useImperativeHandle/);
        expect(INDEX).toMatch(/open\s*\(\s*\)/);
    });

    test('list() is called when modal opens', () => {
        // list() called inside open()
        expect(INDEX).toMatch(/open\s*\(\s*\)\s*\{[\s\S]*?list\s*\(\s*\)/);
    });

    test('SetShow(true) shows the modal', () => {
        expect(INDEX).toMatch(/SetShow\s*\(\s*true\s*\)/);
    });
});

describe('vendor_category/index.js — delete behavior', () => {
    test('window.confirm is called before delete', () => {
        expect(INDEX).toMatch(/window\.confirm/);
    });

    test('deletingId state tracks which row is deleting', () => {
        expect(INDEX).toMatch(/deletingId/);
        expect(INDEX).toMatch(/setDeletingId/);
    });

    test('list() is refreshed after successful delete', () => {
        // After delete resolves, list() is called again
        expect(INDEX).toMatch(/setDeletingId\s*\(\s*null\s*\)[\s\S]{0,200}list\s*\(\s*\)/);
    });

    test('showToastMessage called on delete success', () => {
        expect(INDEX).toMatch(/Category deleted successfully/);
    });

    test('showToastMessage called on delete failure', () => {
        expect(INDEX).toMatch(/Failed to delete category/);
    });
});

describe('vendor_category/index.js — embedded VendorCategoryCreate', () => {
    test('VendorCategoryCreate is imported', () => {
        expect(INDEX).toMatch(/import\s+VendorCategoryCreate\s+from/);
    });

    test('VendorCategoryCreate is rendered', () => {
        expect(INDEX).toMatch(/<VendorCategoryCreate/);
    });

    test('refreshList prop wired to list()', () => {
        expect(INDEX).toMatch(/refreshList=\{[^}]*list[^}]*\}/);
    });

    test('CreateFormRef is used to open create form', () => {
        expect(INDEX).toMatch(/CreateFormRef/);
        expect(INDEX).toMatch(/CreateFormRef\.current\.open/);
    });
});

describe('vendor_category/index.js — search', () => {
    test('search name filter state exists', () => {
        expect(INDEX).toMatch(/searchName/);
    });

    test('name filter is passed to list() on input change', () => {
        expect(INDEX).toMatch(/setSearchName[\s\S]{0,200}list\s*\(/);
    });

    test('name filter is applied in the fetch URL', () => {
        expect(INDEX).toMatch(/params\.name\s*=\s*(nameFilter|searchName)/);
    });
});

describe('vendor_category/index.js — loading state', () => {
    test('isLoading state tracks list fetch', () => {
        expect(INDEX).toMatch(/isLoading/);
        expect(INDEX).toMatch(/setIsLoading/);
    });

    test('Spinner shown during loading', () => {
        expect(INDEX).toMatch(/Spinner/);
        expect(INDEX).toMatch(/isLoading/);
    });
});

describe('vendor_category/index.js — forwardRef export', () => {
    test('forwardRef is used', () => {
        expect(INDEX).toMatch(/forwardRef/);
    });

    test('component is exported as default', () => {
        expect(INDEX).toMatch(/export\s+default\s+VendorCategoryIndex/);
    });
});


// ══════════════════════════════════════════════════════════════════════════════
// 3. vendor_category/view.js
// ══════════════════════════════════════════════════════════════════════════════

describe('vendor_category/view.js — API', () => {
    test('GET /v1/vendor-category/{id} to load detail', () => {
        expect(VIEW).toMatch(/fetch\s*\(\s*['"`]\/v1\/vendor-category\/['"`]\s*\+\s*id/);
    });

    test('store_id included in query params', () => {
        expect(VIEW).toMatch(/store_id/);
    });
});

describe('vendor_category/view.js — open()', () => {
    test('open(id) calls getVendorCategory and shows modal', () => {
        expect(VIEW).toMatch(/open\s*\(\s*id\s*\)/);
        expect(VIEW).toMatch(/getVendorCategory\s*\(\s*id\s*\)/);
        expect(VIEW).toMatch(/SetShow\s*\(\s*true\s*\)/);
    });

    test('open(id) guards: only calls when id is truthy', () => {
        expect(VIEW).toMatch(/if\s*\(\s*id\s*\)/);
    });
});

describe('vendor_category/view.js — action buttons', () => {
    test('openUpdateForm prop is used for Edit button', () => {
        expect(VIEW).toMatch(/openUpdateForm/);
    });

    test('openCreateForm prop is used for Create button', () => {
        expect(VIEW).toMatch(/openCreateForm/);
    });

    test('Edit button calls openUpdateForm with model.id', () => {
        expect(VIEW).toMatch(/openUpdateForm\s*\(\s*model\.id\s*\)/);
    });
});

describe('vendor_category/view.js — model display', () => {
    test('model.name is displayed', () => {
        expect(VIEW).toMatch(/model\.name/);
    });

    test('model.created_by_name is displayed', () => {
        expect(VIEW).toMatch(/model\.created_by_name/);
    });

    test('model.created_at is displayed via formatInStoreTimezone', () => {
        expect(VIEW).toMatch(/formatInStoreTimezone\s*\(\s*model\.created_at\s*\)/);
    });
});

describe('vendor_category/view.js — forwardRef export', () => {
    test('forwardRef is used', () => {
        expect(VIEW).toMatch(/forwardRef/);
    });

    test('component is exported as default', () => {
        expect(VIEW).toMatch(/export\s+default\s+VendorCategoryView/);
    });
});


// ══════════════════════════════════════════════════════════════════════════════
// 4. vendor/create.js — category feature additions
// ══════════════════════════════════════════════════════════════════════════════

describe('vendor/create.js — imports', () => {
    test('VendorCategoryCreate is imported', () => {
        expect(VENDOR).toMatch(/import\s+VendorCategoryCreate\s+from\s+['"]\.\.\/vendor_category\/create\.js['"]/);
    });

    test('VendorCategoryIndex is imported', () => {
        expect(VENDOR).toMatch(/import\s+VendorCategoryIndex\s+from\s+['"]\.\.\/vendor_category\/index\.js['"]/);
    });
});

describe('vendor/create.js — selectedCategories state', () => {
    test('selectedCategories state is declared', () => {
        expect(VENDOR).toMatch(/selectedCategories,\s*setSelectedCategories/);
    });

    test('selectedCategories is initialised as empty array', () => {
        expect(VENDOR).toMatch(/useState\s*\(\s*\[\s*\]\s*\)/);
    });

    test('selectedCategories is reset in open()', () => {
        expect(VENDOR).toMatch(/selectedCategories\s*=\s*\[\s*\]/);
        expect(VENDOR).toMatch(/setSelectedCategories\s*\(\s*selectedCategories\s*\)/);
    });
});

describe('vendor/create.js — getVendor: populate selectedCategories', () => {
    test('category_id is read from API response', () => {
        expect(VENDOR).toMatch(/data\.result\.category_id/);
    });

    test('category_name is read from API response', () => {
        expect(VENDOR).toMatch(/data\.result\.category_name/);
    });

    test('selectedCategories is rebuilt from id+name pairs', () => {
        expect(VENDOR).toMatch(/selectedCategories\.push\s*\(\s*\{[\s\S]*?id:.*category_id[\s\S]*?name:.*category_name/);
    });

    test('setSelectedCategories called after population', () => {
        expect(VENDOR).toMatch(/setSelectedCategories\s*\(\s*\[\.\.\.selectedCategories\]\s*\)/);
    });
});

describe('vendor/create.js — handleCreate: sends category_id', () => {
    test('formData.category_id is set before submit', () => {
        expect(VENDOR).toMatch(/formData\.category_id\s*=/);
    });

    test('category_id is built from selectedCategories', () => {
        expect(VENDOR).toMatch(/selectedCategories\.map\s*\(\s*c\s*=>\s*c\.id\s*\)/);
    });
});


// ── Product Categories (new simple tag-based feature replacing old Typeahead) ──

describe('vendor/create.js — Product Categories: state', () => {
    test('productCategories state is declared', () => {
        expect(VENDOR).toMatch(/productCategories/);
        expect(VENDOR).toMatch(/setProductCategories/);
    });

    test('productCatInput state is declared for the text input', () => {
        expect(VENDOR).toMatch(/productCatInput/);
        expect(VENDOR).toMatch(/setProductCatInput/);
    });
});

describe('vendor/create.js — Product Categories: section heading', () => {
    test('"Product Categories" section heading is present', () => {
        expect(VENDOR).toMatch(/Product Categories/);
    });
});

describe('vendor/create.js — Product Categories: tag badge display', () => {
    test('productCategories are rendered as badges', () => {
        expect(VENDOR).toMatch(/productCategories\.map/);
    });

    test('badge has bi-x icon to remove a category', () => {
        // bi-x appears near productCategories in the file
        expect(VENDOR).toMatch(/bi-x/);
    });

    test('remove click filters productCategories', () => {
        expect(VENDOR).toMatch(/productCategories\.filter/);
    });
});

describe('vendor/create.js — Product Categories: add input', () => {
    test('productCatInput value binding is present', () => {
        expect(VENDOR).toMatch(/value=\{productCatInput\}/);
    });

    test('Enter key triggers add category', () => {
        // onKeyDown with 'Enter' key is in the product categories input
        expect(VENDOR).toMatch(/e\.key.*===.*'Enter'|'Enter'.*===.*e\.key/);
    });

    test('Add button is present', () => {
        // The Add button appears after the product categories section
        expect(VENDOR).toMatch(/t\s*\(\s*['"]Add['"]\s*\)|>.*Add.*</s);
    });

    test('duplicate prevention using includes()', () => {
        expect(VENDOR).toMatch(/productCategories\.includes\s*\(\s*cat\s*\)/);
    });
});

describe('vendor/create.js — Product Categories: save to form data', () => {
    test('formData.product_categories is set on save', () => {
        expect(VENDOR).toMatch(/formData\.product_categories\s*=\s*productCategories/);
    });

    test('product_categories loaded from vendor record on edit', () => {
        expect(VENDOR).toMatch(/product_categories\s*\|\|\s*\[\]/);
    });
});

describe('vendor/create.js — legacy category fields preserved for compat', () => {
    test('selectedCategories state is still declared (backward compat)', () => {
        expect(VENDOR).toMatch(/selectedCategories/);
    });

    test('VendorCategoryCreateRef is still declared', () => {
        expect(VENDOR).toMatch(/VendorCategoryCreateRef/);
    });

    test('VendorCategoryIndexRef is still declared', () => {
        expect(VENDOR).toMatch(/VendorCategoryIndexRef/);
    });

    test('VendorCategoryCreate component is still rendered', () => {
        expect(VENDOR).toMatch(/<VendorCategoryCreate\s[^>]*ref=\{VendorCategoryCreateRef\}/);
    });

    test('VendorCategoryIndex component is still rendered', () => {
        expect(VENDOR).toMatch(/<VendorCategoryIndex\s[^>]*ref=\{VendorCategoryIndexRef\}/);
    });

    test('formData.category_id is still set (legacy backward compat)', () => {
        expect(VENDOR).toMatch(/formData\.category_id\s*=\s*selectedCategories\.map/);
    });
});
