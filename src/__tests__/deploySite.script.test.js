/**
 * Functional tests for .github/scripts/deploy_site.sh, the step that puts one
 * tested build on the test site and then on production. The real bash script
 * runs against stand-ins for ssh, rsync and curl that act on a temp folder, so
 * the swap, the "is the site serving it" check and the rollback are exercised
 * without a server.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';

const SCRIPT = path.join(__dirname, '..', '..', '.github', 'scripts', 'deploy_site.sh');

// ssh: drop options and user@host, run the remote command locally.
const FAKE_SSH = `#!/usr/bin/env bash
while [ $# -gt 0 ]; do
  case "$1" in -o|-i|-p) shift 2 ;; *) break ;; esac
done
shift
echo "$*" >> "$FAKE_LOG"
bash -c "$*"
`;
// rsync: copy SRC/ into the path after "host:".
const FAKE_RSYNC = `#!/usr/bin/env bash
args=("$@"); n=\${#args[@]}
src="\${args[$((n-2))]}"; dst="\${args[$((n-1))]#*:}"
mkdir -p "$dst" && cp -a "$src". "$dst"
`;
// curl: the "site" serves DEST/index.html, or a fixed page in broken mode.
const FAKE_CURL = `#!/usr/bin/env bash
case "$*" in *frontend-deployed*) echo "$*" >> "$FAKE_ANNOUNCE"; exit \${FAKE_ANNOUNCE_FAIL:-0} ;; esac
if [ -n "$FAKE_BROKEN" ]; then echo "<html>502 Bad Gateway</html>"; exit 0; fi
cat "$FAKE_DEST/index.html"
`;

function setup() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'deploy-site-'));
    const bin = path.join(root, 'bin');
    fs.mkdirSync(bin);
    for (const [name, body] of [['ssh', FAKE_SSH], ['rsync', FAKE_RSYNC], ['curl', FAKE_CURL]]) {
        fs.writeFileSync(path.join(bin, name), body, { mode: 0o755 });
    }
    const work = path.join(root, 'work');
    fs.mkdirSync(path.join(work, 'build', 'static'), { recursive: true });
    fs.writeFileSync(path.join(work, 'build', 'index.html'), '<html>new build</html>');
    fs.writeFileSync(path.join(work, 'build', 'static', 'main.new.js'), 'new');
    const dest = path.join(root, 'site', 'build');
    fs.mkdirSync(dest, { recursive: true });
    fs.writeFileSync(path.join(dest, 'index.html'), '<html>old build</html>');
    fs.writeFileSync(path.join(dest, 'old.js'), 'old');
    const tmp = path.join(root, 'tmp');
    fs.mkdirSync(tmp);
    return { root, bin, work, dest, tmp, log: path.join(root, 'ssh.log') };
}

function run(t, extraEnv = {}) {
    return spawnSync('bash', [SCRIPT], {
        cwd: t.work,
        encoding: 'utf8',
        env: {
            PATH: `${t.bin}:${process.env.PATH}`,
            HOME: t.root,
            TMPDIR: t.tmp,
            SSH_PRIVATE_KEY: 'dummy-key',
            AWS_HOST: 'example.invalid',
            AWS_USER: 'ubuntu',
            AWS_PORT: '22',
            AWS_DEST_PATH: `${t.dest}/`,
            SITE_URL: 'https://site.invalid/',
            VERIFY_ATTEMPTS: '2',
            VERIFY_DELAY: '0',
            FAKE_DEST: t.dest,
            FAKE_LOG: t.log,
            FAKE_ANNOUNCE: path.join(t.root, 'announce.log'),
            ...extraEnv,
        },
    });
}

const read = (p) => fs.readFileSync(p, 'utf8');

describe('deploy_site.sh', () => {
    let t;
    beforeEach(() => { t = setup(); });
    afterEach(() => fs.rmSync(t.root, { recursive: true, force: true }));

    it('swaps the new build in, verifies it and removes the previous one', () => {
        const r = run(t);
        expect(r.status).toBe(0);
        expect(r.stdout).toMatch(/Deployed and verified/);
        expect(read(path.join(t.dest, 'index.html'))).toBe('<html>new build</html>');
        expect(fs.existsSync(path.join(t.dest, 'static', 'main.new.js'))).toBe(true);
        // A clean swap, not a merge into the old folder.
        expect(fs.existsSync(path.join(t.dest, 'old.js'))).toBe(false);
        expect(fs.existsSync(`${t.dest}_old`)).toBe(false);
        expect(fs.existsSync(`${t.dest}_new`)).toBe(false);
    });

    it('puts the previous build back and fails when the site does not serve the new one', () => {
        const r = run(t, { FAKE_BROKEN: '1' });
        expect(r.status).not.toBe(0);
        expect(r.stdout).toMatch(/never served the new build/);
        expect(read(path.join(t.dest, 'index.html'))).toBe('<html>old build</html>');
        expect(fs.existsSync(path.join(t.dest, 'old.js'))).toBe(true);
        // The rejected build is kept aside for inspection.
        expect(read(path.join(`${t.dest}_failed`, 'index.html'))).toBe('<html>new build</html>');
    });

    it('tells the API about the new build once it is live', () => {
        const r = run(t, { APP_API_URL: 'https://api.invalid/' });
        expect(r.status).toBe(0);
        expect(read(path.join(t.root, 'announce.log'))).toMatch(/-X POST https:\/\/api\.invalid\/v1\/app\/frontend-deployed/);
        expect(r.stdout).toMatch(/Open pages were told/);
    });

    it('a failed announcement does not fail the deploy', () => {
        const r = run(t, { APP_API_URL: 'https://api.invalid', FAKE_ANNOUNCE_FAIL: '7' });
        expect(r.status).toBe(0);
        expect(r.stdout).toMatch(/could not tell open pages/);
        expect(read(path.join(t.dest, 'index.html'))).toBe('<html>new build</html>');
    });

    it('announces nothing without APP_API_URL or when the deploy is rolled back', () => {
        expect(run(t).status).toBe(0);
        expect(run(t, { APP_API_URL: 'https://api.invalid', FAKE_BROKEN: '1' }).status).not.toBe(0);
        expect(fs.existsSync(path.join(t.root, 'announce.log'))).toBe(false);
    });

    it('a second deploy after a failed one still works', () => {
        expect(run(t, { FAKE_BROKEN: '1' }).status).not.toBe(0);
        expect(run(t).status).toBe(0);
        expect(read(path.join(t.dest, 'index.html'))).toBe('<html>new build</html>');
    });

    it('starts from a clean staging folder even if an earlier run left one behind', () => {
        fs.mkdirSync(`${t.dest}_new`);
        fs.writeFileSync(path.join(`${t.dest}_new`, 'stale.js'), 'stale');
        expect(run(t).status).toBe(0);
        expect(fs.existsSync(path.join(t.dest, 'stale.js'))).toBe(false);
    });

    it('creates the site folder on a first deploy', () => {
        fs.rmSync(t.dest, { recursive: true });
        expect(run(t).status).toBe(0);
        expect(read(path.join(t.dest, 'index.html'))).toBe('<html>new build</html>');
    });

    it('refuses to deploy without a build and leaves the site alone', () => {
        fs.rmSync(path.join(t.work, 'build'), { recursive: true });
        const r = run(t);
        expect(r.status).not.toBe(0);
        expect(r.stdout).toMatch(/index.html is missing/);
        expect(read(path.join(t.dest, 'index.html'))).toBe('<html>old build</html>');
        expect(fs.existsSync(t.log)).toBe(false);
    });

    it.each(['SSH_PRIVATE_KEY', 'AWS_HOST', 'AWS_DEST_PATH', 'SITE_URL'])('fails before touching the server when %s is unset', (name) => {
        const r = run(t, { [name]: '' });
        expect(r.status).not.toBe(0);
        expect(fs.existsSync(t.log)).toBe(false);
        expect(read(path.join(t.dest, 'index.html'))).toBe('<html>old build</html>');
    });

    it.each([[''], ['1']])('does not leave the private key on disk (broken site: %p)', (broken) => {
        run(t, { FAKE_BROKEN: broken });
        expect(fs.readdirSync(t.tmp)).toEqual([]);
        const leftovers = spawnSync('grep', ['-rl', 'dummy-key', t.work, path.join(t.root, 'site')], { encoding: 'utf8' }).stdout;
        expect(leftovers).toBe('');
    });
});

describe('deploying without GitHub Actions', () => {
    const root = path.join(__dirname, '..', '..');

    it('no GitHub Actions workflow is left to run (deploy.sh is the only deploy path)', () => {
        expect(fs.existsSync(path.join(root, '.github', 'workflows'))).toBe(false);
    });

    it('deploy.sh tests, then deploys the one build to the test site before production', () => {
        const s = fs.readFileSync(path.join(root, 'deploy.sh'), 'utf8');
        expect(s).toMatch(/ci\/run_all_tests\.sh/);
        expect(s).toMatch(/\.github\/scripts\/deploy_site\.sh/);
        expect(s).not.toMatch(/\.github\/workflows/);
    });

    it('quick deploy reaches the test site from master with --test (there is no test branch)', () => {
        const quick = fs.readFileSync(path.join(root, 'deploy_quick.sh'), 'utf8');
        expect(quick).not.toMatch(/origin\/test/);
        expect(quick).toMatch(/if \[ "\$BRANCH" = master \] && \$TO_TEST; then TARGET=test; fi/);
    });

    // Deploys happen only after every suite passes (user rule 2026-10-11).
    it('ci/run_all_tests.sh runs every suite unless QUICK=1', () => {
        const s = fs.readFileSync(path.join(root, 'ci', 'run_all_tests.sh'), 'utf8');
        expect(s).toContain('if [ "${QUICK:-}" = 1 ]; then FULL=0; else FULL=1; fi');
        expect(s).not.toContain('"${FULL:-}"');
        expect(s).toMatch(/PROJECTS="desktop desktop-large tablet tablet-landscape phone phone-small"/);
        expect(s).toMatch(/Role audit/);
    });

    it('deploy.sh refuses QUICK=1 before doing anything else', () => {
        const r = spawnSync('bash', [path.join(root, 'deploy.sh')], {
            encoding: 'utf8',
            env: { ...process.env, QUICK: '1', HOME: fs.mkdtempSync(path.join(require('os').tmpdir(), 'deploy-')) },
        });
        expect(r.status).not.toBe(0);
        expect(r.stdout + r.stderr).toMatch(/always runs every test suite/);
        expect(r.stdout + r.stderr).not.toMatch(/Running the test suites|Checking for uncommitted/);
    });
});
