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

describe('deploy workflows', () => {
    const wf = (name) => fs.readFileSync(path.join(__dirname, '..', '..', '.github', 'workflows', name), 'utf8');

    it('one pipeline: master only, tests once, test site before production', () => {
        const s = wf('deploy.yml');
        expect(s).toMatch(/push:\n\s+branches:\n\s+- master\n/);
        expect(s).not.toMatch(/- test\n/);
        expect(s.match(/uses: \.\/\.github\/workflows\/tests\.yml/g)).toHaveLength(1);
        expect(s).toMatch(/deploy-test:\n\s+needs: tests\n/);
        expect(s).toMatch(/deploy-production:\n\s+needs: deploy-test\n/);
        expect(s).toMatch(/backend_ref: master/);
        // Each site gets its own folder and URL.
        const [testJob, prodJob] = s.split('deploy-production:');
        expect(testJob).toMatch(/secrets\.AWS_DEST_PATH }}/);
        expect(testJob).toMatch(/https:\/\/test\.gulfunionozone\.com\//);
        expect(prodJob).toMatch(/secrets\.AWS_DEST_PATH_PROD }}/);
        expect(prodJob).toMatch(/https:\/\/startpos\.gulfunionozone\.com\//);
        // Both deploy the tested artifact; nothing is rebuilt.
        expect(s.match(/name: frontend-build/g)).toHaveLength(2);
        expect(s).not.toMatch(/npm run build/);
    });

    it('the per-branch production workflow is gone', () => {
        expect(fs.existsSync(path.join(__dirname, '..', '..', '.github', 'workflows', 'deploy_production.yml'))).toBe(false);
    });

    it('the tested build is site-neutral', () => {
        const s = wf('tests.yml');
        expect(s).not.toMatch(/api_url/);
        expect(s).toMatch(/REACT_APP_API_URL= \\\n/);
    });

    it('quick deploy builds once and goes to test before production', () => {
        const s = wf('deploy_quick.yml');
        expect(s).toMatch(/options:\n\s+- both\n\s+- test\n\s+- production/);
        expect(s.indexOf('target: test')).toBeLessThan(s.indexOf('target: production'));
        expect(s).toMatch(/max-parallel: 1/);
        expect(s).toMatch(/fail-fast: true/);
        expect(s.match(/npm run build/g)).toHaveLength(1);
    });
});
