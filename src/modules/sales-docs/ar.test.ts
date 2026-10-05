import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { core } from '@/i18n/ar';
import { ar } from './ar';
import { ar as salesAr } from '../sales/ar';

/** Every literal passed to t()/tt() (and list/editor labels) in this module needs an Arabic string. */
describe('Arabic coverage', () => {
  const dir = resolve(__dirname);
  const files = [
    ...readdirSync(dir).filter((f) => /\.(tsx?|ts)$/.test(f) && !/\.test\./.test(f) && f !== 'ar.ts'),
    // Conversion / sharing additions to the sales invoices module.
    '../sales/importSource.tsx', '../sales/share.tsx',
  ];
  const found = new Set<string>();
  const patterns = [/\b(?:t|tt)\(\s*'((?:[^'\\]|\\.)*)'/g, /\b(?:label|title|header|subtitle|createLabel|searchPlaceholder|titleNew):\s*'((?:[^'\\]|\\.)*)'/g];
  for (const f of files) {
    const src = readFileSync(resolve(dir, f), 'utf8');
    for (const re of patterns) for (const m of src.matchAll(re)) found.add(m[1]);
  }
  const known = { ...core, ...salesAr, ...ar };

  it('finds the module strings', () => {
    expect(found.size).toBeGreaterThan(80);
  });

  it('has a non-empty translation for each one', () => {
    const missing = [...found].filter((s) => !known[s]?.trim());
    expect(missing).toEqual([]);
  });
});
