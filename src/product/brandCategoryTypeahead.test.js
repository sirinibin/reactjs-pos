/**
 * Source-code tests for brand & category Typeahead (now always active —
 * no longer gated behind a store settings flag).
 *
 * Covers:
 *  1–4   product/create.js — brand field
 *  5–8   product/create.js — category field
 *  9–13  service/create.js — service category field
 */

const fs = require('fs');
const path = require('path');

const productSrc = fs.readFileSync(path.join(__dirname, 'create.js'), 'utf8');
const serviceSrc = fs.readFileSync(
    path.join(__dirname, '../service/create.js'),
    'utf8'
);

// ── product/create.js — Brand ─────────────────────────────────────────────────

describe('product/create.js — Brand Typeahead (always on)', () => {
    it('1. Brand Typeahead is rendered unconditionally', () => {
        expect(productSrc).toMatch(/id="brand"/);
    });

    it('2. Brand Typeahead is NOT gated by enable_arabic_names_list', () => {
        expect(productSrc).not.toMatch(/enable_arabic_names_list[\s\S]{0,400}id="brand"/);
    });

    it('3. Brand Typeahead uses server-side filtering (filterBy={() => true})', () => {
        expect(productSrc).toMatch(/id="brand"[\s\S]{0,300}filterBy=\{\(\)\s*=>\s*true\}/);
    });

    it('4. Brand Typeahead onInputChange calls suggestBrands', () => {
        expect(productSrc).toMatch(/id="brand"[\s\S]{0,600}suggestBrands/);
    });

    it('5. Brand Typeahead onChange updates formData.brand_id and brand_name', () => {
        expect(productSrc).toMatch(/id="brand"[\s\S]{0,800}formData\.brand_id[\s\S]{0,100}formData\.brand_name/);
    });

    it('6. Old custom-dropdown (setBrandOpen) is removed', () => {
        expect(productSrc).not.toMatch(/onFocus=\{\(\)\s*=>\s*\{\s*setBrandOpen/);
    });
});

// ── product/create.js — Category ──────────────────────────────────────────────

describe('product/create.js — Category Typeahead (always on)', () => {
    it('1. Category Typeahead is rendered unconditionally', () => {
        expect(productSrc).toMatch(/id="category"/);
    });

    it('2. Category Typeahead is NOT gated by enable_arabic_names_list', () => {
        expect(productSrc).not.toMatch(/enable_arabic_names_list[\s\S]{0,2000}id="category"/);
    });

    it('3. Category Typeahead uses server-side filtering', () => {
        expect(productSrc).toMatch(/id="category"[\s\S]{0,300}filterBy=\{\(\)\s*=>\s*true\}/);
    });

    it('4. Category Typeahead onInputChange calls suggestCategories', () => {
        expect(productSrc).toMatch(/id="category"[\s\S]{0,1200}suggestCategories/);
    });

    it('5. Category Typeahead onChange updates selectedCategories', () => {
        expect(productSrc).toMatch(/id="category"[\s\S]{0,1500}setSelectedCategories/);
    });

    it('6. Old custom-dropdown (setCategoryOpen) is removed', () => {
        expect(productSrc).not.toMatch(/onFocus=\{\(\)\s*=>\s*\{\s*setCategoryOpen/);
    });
});

// ── product/create.js — suggestBrands / suggestCategories cleanup ─────────────

describe('product/create.js — suggest function cleanup', () => {
    it('suggestBrands no longer has console.log', () => {
        const fnMatch = productSrc.match(/async function suggestBrands[\s\S]{0,1200}setBrandOptions/);
        expect(fnMatch).toBeTruthy();
        expect(fnMatch[0]).not.toMatch(/console\.log/);
    });

    it('suggestCategories no longer has console.log', () => {
        const fnMatch = productSrc.match(/async function suggestCategories[\s\S]{0,1200}setCategoryOptions/);
        expect(fnMatch).toBeTruthy();
        expect(fnMatch[0]).not.toMatch(/console\.log/);
    });
});

// ── service/create.js — Service Category ─────────────────────────────────────

describe('service/create.js — Service Category Typeahead (always on)', () => {
    it('1. Service category Typeahead is rendered unconditionally', () => {
        expect(serviceSrc).toMatch(/id="service_category"/);
    });

    it('2. Service category Typeahead is NOT gated by enable_arabic_names_list', () => {
        expect(serviceSrc).not.toMatch(/enable_arabic_names_list[\s\S]{0,400}id="service_category"/);
    });

    it('3. Service category Typeahead uses server-side filtering', () => {
        expect(serviceSrc).toMatch(/id="service_category"[\s\S]{0,300}filterBy=\{\(\)\s*=>\s*true\}/);
    });

    it('4. Service category Typeahead onInputChange calls suggestCategories', () => {
        expect(serviceSrc).toMatch(/id="service_category"[\s\S]{0,1200}suggestCategories/);
    });

    it('5. Service category Typeahead onChange sets formData.service_category_id and service_category_name', () => {
        expect(serviceSrc).toMatch(/id="service_category"[\s\S]{0,1800}service_category_id[\s\S]{0,100}service_category_name/);
    });

    it('6. Old service category custom-dropdown (setCategoryOpen) is removed', () => {
        expect(serviceSrc).not.toMatch(/onFocus=\{\(\)\s*=>\s*\{\s*setCategoryOpen/);
    });

    it('7. Typeahead import has no eslint-disable comment', () => {
        expect(serviceSrc).not.toMatch(/eslint-disable-next-line no-unused-vars[\s\S]{0,10}import \{ Typeahead \}/);
    });
});
