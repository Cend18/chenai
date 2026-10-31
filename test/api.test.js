import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp, GEMINI_MODEL } from '../index.js';

const EXPECTED_MODEL = process.env.GEMINI_MODEL || GEMINI_MODEL;

function createMockAi() {
  const calls = [];
  return {
    calls,
    models: {
      async generateContent(params) {
        calls.push(params);
        return {
          text: `Mock Gemini response for: ${JSON.stringify(params.contents)}`
        };
      }
    }
  };
}

test('POST /generate-text returns generated text', async (t) => {
  const mockAi = createMockAi();
  const app = createApp({ aiClient: mockAi });
  const server = app.listen(0);
  t.after(() => server.close());

  const port = server.address().port;
  const res = await fetch(`http://127.0.0.1:${port}/generate-text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: 'Jelaskan konsep OOP' })
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.result);
  assert.match(data.result, /Mock Gemini response/);
  assert.equal(mockAi.calls.length, 1);
  assert.equal(mockAi.calls[0].model, EXPECTED_MODEL);
});

test('POST /generate-text returns 400 when prompt is missing', async (t) => {
  const mockAi = createMockAi();
  const app = createApp({ aiClient: mockAi });
  const server = app.listen(0);
  t.after(() => server.close());

  const port = server.address().port;
  const res = await fetch(`http://127.0.0.1:${port}/generate-text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });

  assert.equal(res.status, 400);
  const data = await res.json();
  assert.ok(data.message);
});

test('POST /generate-from-image handles image buffer as base64 inlineData', async (t) => {
  const mockAi = createMockAi();
  const app = createApp({ aiClient: mockAi });
  const server = app.listen(0);
  t.after(() => server.close());

  const port = server.address().port;
  const formData = new FormData();
  const dummyPng = new Blob([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], { type: 'image/png' });
  formData.append('image', dummyPng, 'test.png');
  formData.append('prompt', 'Apa isi gambar ini?');

  const res = await fetch(`http://127.0.0.1:${port}/generate-from-image`, {
    method: 'POST',
    body: formData
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.result);
  assert.equal(mockAi.calls.length, 1);
  const contents = mockAi.calls[0].contents;
  assert.equal(contents.length, 2);
  assert.equal(contents[0].text, 'Apa isi gambar ini?');
  assert.equal(contents[1].inlineData.mimeType, 'image/png');
  assert.ok(contents[1].inlineData.data.length > 0);
});

test('POST /generate-from-document uses default summary prompt if not provided', async (t) => {
  const mockAi = createMockAi();
  const app = createApp({ aiClient: mockAi });
  const server = app.listen(0);
  t.after(() => server.close());

  const port = server.address().port;
  const formData = new FormData();
  const dummyDoc = new Blob(['%PDF-1.4 Catatan materi sistem kendali cerdas.'], { type: 'application/pdf' });
  formData.append('document', dummyDoc, 'notes.pdf');

  const res = await fetch(`http://127.0.0.1:${port}/generate-from-document`, {
    method: 'POST',
    body: formData
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.result);
  const contents = mockAi.calls[0].contents;
  assert.equal(contents[0].text, 'Tolong buat ringkasan dari dokumen berikut.');
  assert.equal(contents[1].inlineData.mimeType, 'application/pdf');
});

test('POST /generate-from-audio supports audio upload and default transcript prompt', async (t) => {
  const mockAi = createMockAi();
  const app = createApp({ aiClient: mockAi });
  const server = app.listen(0);
  t.after(() => server.close());

  const port = server.address().port;
  const formData = new FormData();
  const dummyAudio = new Blob([Buffer.from('RIFF....WAVEfmt ')], { type: 'audio/wav' });
  formData.append('audio', dummyAudio, 'voice.wav');

  const res = await fetch(`http://127.0.0.1:${port}/generate-from-audio`, {
    method: 'POST',
    body: formData
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.result);
  const contents = mockAi.calls[0].contents;
  assert.equal(contents[0].text, 'Tolong buatkan transkrip dari rekaman berikut.');
  assert.equal(contents[1].inlineData.mimeType, 'audio/wav');
});

test('GET /health returns server status and configured flag', async (t) => {
  const mockAi = createMockAi();
  const app = createApp({ aiClient: mockAi });
  const server = app.listen(0);
  t.after(() => server.close());

  const port = server.address().port;
  const res = await fetch(`http://127.0.0.1:${port}/health`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.status, 'ok');
  assert.equal(data.model, EXPECTED_MODEL);
});

test('POST /api/chat supports multi-turn conversation format', async (t) => {
  const mockAi = createMockAi();
  const app = createApp({ aiClient: mockAi });
  const server = app.listen(0);
  t.after(() => server.close());

  const port = server.address().port;
  const res = await fetch(`http://127.0.0.1:${port}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      conversation: [
        { role: 'user', text: 'Halo Gemini' },
        { role: 'model', text: 'Halo! Ada yang bisa saya bantu?' },
        { role: 'user', text: 'Apa itu OOP?' }
      ]
    })
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.result);
  assert.equal(mockAi.calls.length, 1);
  assert.equal(mockAi.calls[0].contents.length, 3);
  assert.equal(mockAi.calls[0].contents[0].parts[0].text, 'Halo Gemini');
});
