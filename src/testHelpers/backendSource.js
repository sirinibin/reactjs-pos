/**
 * Locates the pos-rest (Go backend) source tree for "source-level" frontend
 * tests that assert on backend code (routes, struct fields, prompts).
 *
 * The backend is NOT part of this repo, so those tests must skip cleanly when
 * it is absent (e.g. a plain CI checkout of reactjs-pos).
 *
 * Search order:
 *   1. $POS_REST_DIR (absolute, or relative to the repo root). When set, it is
 *      the ONLY place searched — set it to a non-existent path to force-skip.
 *   2. <repo>/../backend    (original monorepo layout: frontend/ + backend/)
 *   3. <repo>/../pos-rest   (side-by-side clones)
 *   4. <repo>/pos-rest      (CI checkout of pos-rest inside the workspace)
 */
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '../..');

function candidateDirs() {
    if (process.env.POS_REST_DIR) {
        return [path.resolve(REPO_ROOT, process.env.POS_REST_DIR)];
    }
    const dirs = [];
    dirs.push(
        path.resolve(REPO_ROOT, '../backend'),
        path.resolve(REPO_ROOT, '../pos-rest'),
        path.resolve(REPO_ROOT, 'pos-rest'),
    );
    return dirs;
}

/** Absolute path of the first backend dir containing main.go, or null. */
function findBackendDir() {
    for (const dir of candidateDirs()) {
        try {
            if (fs.statSync(path.join(dir, 'main.go')).isFile()) return dir;
        } catch (_) { /* not here */ }
    }
    return null;
}

/** Contents of <backend>/<relPath>, or null when the backend/file is absent. */
function readBackendFile(relPath) {
    const dir = findBackendDir();
    if (!dir) return null;
    try {
        return fs.readFileSync(path.join(dir, relPath), 'utf8');
    } catch (_) {
        return null;
    }
}

/**
 * `describe` when every listed source is non-null, otherwise `describe.skip`
 * (the suite shows as skipped instead of failing).
 */
function describeIfSources(...sources) {
    return sources.every(s => typeof s === 'string') ? describe : describe.skip;
}

module.exports = { findBackendDir, readBackendFile, describeIfSources };
