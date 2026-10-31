import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { setImmediate } from 'node:timers/promises';

const root = new URL('../public/', import.meta.url);
const read = name => readFileSync(new URL(name, root), 'utf8');

test('workspace has accessible form, honest setup and privacy copy', () => {
  const html = read('index.html');
  assert.match(html, /<html lang="id">/);
  for (const id of ['mode', 'prompt', 'file', 'style', 'temperature', 'submit', 'result', 'status']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /\.env/);
  assert.match(html, /Google/);
  assert.match(html, /aria-live/);
  assert.match(html, /<script src="\/app\.js" defer><\/script>/);
  assert.match(html, /<link rel="stylesheet" href="\/style\.css">/);
});

test('client uses same-origin endpoints and safe text rendering', () => {
  const js = read('app.js');
  for (const endpoint of ['/health', '/generate-text', '/generate-from-image', '/generate-from-document', '/generate-from-audio']) {
    assert.ok(js.includes(endpoint), `missing ${endpoint}`);
  }
  assert.match(js, /textContent/);
  assert.doesNotMatch(js, /innerHTML|localStorage|sessionStorage/);
  execFileSync(process.execPath, ['--check', fileURLToPath(new URL('app.js', root))]);
});

// Tiny DOM double exercises client state without a browser or dependency.
async function boot(configured = true) {
  const nodes = new Map();
  const node = () => ({ value: '', files: [], textContent: '', listeners: {}, classList: { toggle() {} }, setAttribute() {}, appendChild(child) { this.child = child; }, addEventListener(type, fn) { this.listeners[type] = fn; } });
  const get = id => { if (!nodes.has(id)) nodes.set(id, node()); return nodes.get(id); };
  get('mode').value = 'text'; get('style').value = 'santai'; get('temperature').value = '0.7';
  const calls = [];
  let respond = async () => ({ ok: true, json: async () => ({ result: '<script>unsafe</script>' }) });
  vm.runInNewContext(read('app.js'), {
    document: { getElementById: get, createElement: node }, FormData, AbortSignal,
    fetch: async (url, options) => {
      if (url === '/health') return { ok: true, json: async () => ({ configured, status: 'ok', model: 'test-model' }) };
      calls.push({ url, options }); return respond();
    }
  });
  await setImmediate();
  return { get, calls, respond: fn => { respond = fn; }, submit: () => get('study-form').listeners.submit({ preventDefault() {} }) };
}

test('missing key blocks submit and points to server .env', async () => {
  const ui = await boot(false);
  assert.equal(ui.get('submit').disabled, true);
  assert.match(ui.get('status').textContent, /\.env/);
  await ui.submit();
  assert.equal(ui.calls.length, 0);
});

test('text submit disables controls in flight, sends fields, renders literal text', async () => {
  const ui = await boot();
  ui.get('prompt').value = ' Jelaskan sel ';
  const pending = ui.submit();
  assert.equal(ui.get('submit').disabled, true);
  assert.equal(ui.get('mode').disabled, true);
  await pending;
  assert.deepEqual(JSON.parse(ui.calls[0].options.body), { prompt: 'Jelaskan sel', style: 'santai', temperature: 0.7 });
  assert.equal(ui.get('result').child.textContent, '<script>unsafe</script>');
  assert.equal(ui.get('submit').disabled, false);
});

test('multipart preserves selected file for retries and rejects large files', async () => {
  const ui = await boot();
  ui.get('mode').value = 'document';
  ui.get('mode').listeners.change();
  ui.get('prompt').value = 'Ringkas';
  const file = new File(['materi'], 'materi.txt', { type: 'text/plain' });
  ui.get('file').files = [file]; ui.get('file').value = 'materi.txt';
  ui.respond(async () => ({ ok: false, json: async () => ({ message: 'Kuota habis', code: 'RATE_LIMIT' }) }));
  await ui.submit();
  assert.equal(ui.calls[0].url, '/generate-from-document');
  assert.equal(ui.calls[0].options.body.get('document').name, 'materi.txt');
  assert.equal(ui.get('file').value, 'materi.txt');
  assert.match(ui.get('status').textContent, /Kuota habis/);
  ui.get('file').files = [{ size: 10 * 1024 * 1024 + 1, name: 'large.txt' }];
  await ui.submit();
  assert.equal(ui.calls.length, 1);
});

test('responsive layout and keyboard focus', () => {
  const css = read('style.css');
  assert.match(css, /\[hidden\]\s*\{\s*display:\s*none\s*!important;/);
  assert.match(css, /@media/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
});
