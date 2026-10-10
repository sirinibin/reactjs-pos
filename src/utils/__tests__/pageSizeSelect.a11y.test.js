/**
 * axe select-name (role audit F006): the list screens' page-size <select
 * className="form-control pull-right"> sits next to a <label> that is not tied
 * to it, so it had no accessible name. Every one now carries an aria-label.
 */
const fs = require('fs');
const path = require('path');

function walk(dir, out = []) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.name === '__tests__' || e.name === 'node_modules') continue;
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p, out);
        else if (p.endsWith('.js')) out.push(p);
    }
    return out;
}

const SRC = path.join(__dirname, '../..');
// src/signature is being changed elsewhere; it is left out of this sweep.
const files = walk(SRC).filter((f) => !f.includes(`${path.sep}signature${path.sep}`));

test('every page-size select on the list screens has an aria-label', () => {
    const missing = [];
    let seen = 0;
    for (const f of files) {
        const lines = fs.readFileSync(f, 'utf8').split('\n');
        lines.forEach((l, i) => {
            if (l.includes('className="form-control pull-right"')) {
                seen++;
                if (!/aria-label=/.test(l)) missing.push(`${path.relative(SRC, f)}:${i + 1}`);
            }
        });
    }
    expect(seen).toBeGreaterThan(20);
    expect(missing).toEqual([]);
});
