// Run with: node --test tests/
// Checks how storage.js behaves on the different ways the app can be opened:
// the local server, a file on disk, or a static host such as GitHub Pages (iPhone Safari).
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../src/js/storage.js'), 'utf8').replaceAll('export ', '');

function harness(location, { throwOnRead = false, throwAlways = false, serverState = null } = {}) {
  const store = new Map(), alerts = [], urls = [];
  const localStorage = {
    getItem: (k) => { if (throwOnRead || throwAlways) throw new Error('SecurityError'); return store.get(k) ?? null; },
    setItem: (k, v) => { if (throwAlways) throw new Error('SecurityError'); store.set(k, v); },
  };
  const ctx = {
    JSON, console: { warn() {} }, setTimeout() { return 1; }, clearTimeout() {},
    localStorage, location,
    window: { alert: (s) => alerts.push(s), addEventListener() {} },
    fetch: async (url, opts) => { urls.push(String(url)); return opts && opts.method === 'PUT' ? { ok: true } : { ok: true, json: async () => serverState }; },
  };
  if (location === undefined) delete ctx.location;
  vm.createContext(ctx);
  vm.runInContext(source + ';globalThis.api={save,load,flush,backend};', ctx);
  return { api: ctx.api, store, alerts, urls };
}

test('static https host (GitHub Pages): no server probe, data stays in localStorage', async () => {
  const h = harness({ protocol: 'https:', hostname: 'someone.github.io' });
  const first = await h.api.load();
  assert.equal(first, null);
  assert.equal(h.urls.length, 0, 'must not request anything from the host');
  assert.equal(h.api.backend(), 'browser');
  h.api.save({ diary: { a: 1 } });
  await h.api.flush();
  assert.equal(h.urls.length, 0);
  assert.deepEqual(JSON.parse(h.store.get('ballast.v1')), { diary: { a: 1 } });
  const again = harness({ protocol: 'https:', hostname: 'someone.github.io' });
  again.store.set('ballast.v1', h.store.get('ballast.v1'));
  assert.deepEqual(await again.api.load(), { diary: { a: 1 } });
});

test('file:// (double-clicked dist/Ballast.html): no server probe', async () => {
  const h = harness({ protocol: 'file:', hostname: '' });
  await h.api.load();
  assert.equal(h.urls.length, 0);
  assert.equal(h.api.backend(), 'browser');
});

test('local server (http://127.0.0.1): probes a relative api/state, never a root-absolute URL', async () => {
  const h = harness({ protocol: 'http:', hostname: '127.0.0.1' }, { serverState: { diary: { z: 1 } } });
  assert.deepEqual(await h.api.load(), { diary: { z: 1 } });
  assert.equal(h.api.backend(), 'file');
  h.api.save({ diary: {} });
  await h.api.flush();
  assert.ok(h.urls.length >= 2);
  for (const u of h.urls) assert.ok(!u.startsWith('/'), 'root-absolute URL: ' + u);
  assert.ok(h.urls.every((u) => u === 'api/state'));
});

test('http on a non-loopback host (e.g. a LAN name) does not probe either', async () => {
  const h = harness({ protocol: 'http:', hostname: 'example.com' });
  await h.api.load();
  assert.equal(h.urls.length, 0);
});

test('Safari private mode: localStorage that throws on read and write does not break load or save', async () => {
  const h = harness({ protocol: 'https:', hostname: 'someone.github.io' }, { throwAlways: true });
  assert.equal(await h.api.load(), null);
  h.api.save({ diary: {} });
  h.api.save({ diary: { x: 1 } });
  await h.api.flush();
  assert.equal(h.alerts.length, 1, 'warn once, not on every save');
});

test('localStorage that only fails on read still loads as empty', async () => {
  const h = harness({ protocol: 'https:', hostname: 'someone.github.io' }, { throwOnRead: true });
  assert.equal(await h.api.load(), null);
});
