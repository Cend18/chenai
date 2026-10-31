import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../index.js';

async function serve(t, aiClient) {
  const calls = [];
  const ai = aiClient ?? { models: { generateContent: async p => { calls.push(p); return { text: 'Test double: bukan hasil Gemini.' }; } } };
  const server = createApp({ aiClient: ai, apiKey: '' }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => server.close());
  const base = `http://127.0.0.1:${server.address().port}`;
  return { calls, request: (route, body, headers = {}) => fetch(base + route, { method: 'POST', headers: body instanceof FormData ? headers : { 'Content-Type': 'application/json', ...headers }, body: body instanceof FormData ? body : JSON.stringify(body) }) };
}

for (const body of [{prompt: 5}, {prompt:'x',temperature:3}, {prompt:'x',style:'evil'}, {prompt:'x',extra:1}, {prompt:'x'.repeat(10001)}]) {
  test(`invalid request rejected: ${JSON.stringify(body).slice(0,90)}`, async t => {
    const { request, calls } = await serve(t);
    const r = await request('/generate-text',body);
    assert.equal(r.status,400); assert.equal(calls.length,0);
    assert.ok((await r.json()).code);
  });
}

test('provider errors never expose secrets', async t => {
  const { request } = await serve(t, {models:{generateContent:async()=>{throw Object.assign(new Error('secret-api-key'),{status:429});}}});
  const r=await request('/generate-text',{prompt:'test'});
  assert.equal(r.status,429);
  assert.doesNotMatch(await r.text(),/secret-api-key/);
});

test('empty AI response is not reported as success',async t=>{
  const {request}=await serve(t,{models:{generateContent:async()=>({})}});
  assert.equal((await request('/generate-text',{prompt:'test'})).status,502);
});

test('forged image rejected before AI call',async t=>{
  const {request,calls}=await serve(t);
  const form=new FormData();form.append('image',new Blob(['not png'],{type:'image/png'}),'bad.png');
  assert.equal((await request('/generate-from-image',form)).status,415);
  assert.equal(calls.length,0);
});

test('missing file rejected with JSON',async t=>{
  const {request}=await serve(t);
  const r=await request('/generate-from-image',new FormData());
  assert.equal(r.status,400);assert.ok((await r.json()).code);
});

test('oversized upload returns JSON 413',async t=>{
  const {request}=await serve(t);
  const form=new FormData();form.append('document',new Blob([new Uint8Array(10*1024*1024+1)],{type:'application/pdf'}),'big.pdf');
  const r=await request('/generate-from-document',form);
  assert.equal(r.status,413);assert.ok((await r.json()).code);
});

test('UTF8 text uses text part and settings apply to files',async t=>{
  const {request,calls}=await serve(t);
  const form=new FormData();form.append('document',new Blob(['Catatan belajar'],{type:'text/plain'}),'notes.txt');
  form.append('style','santai');form.append('temperature','0.4');
  assert.equal((await request('/generate-from-document',form)).status,200);
  assert.equal(calls[0].contents[1].text,'Catatan belajar');
  assert.equal(calls[0].config.temperature,0.4);
  assert.match(calls[0].config.systemInstruction,/santai/);
});

test('cross-origin expensive requests forbidden',async t=>{
  const {request,calls}=await serve(t);
  const r=await request('/generate-text',{prompt:'x'},{Origin:'https://untrusted.example'});
  assert.equal(r.status,403);assert.equal(calls.length,0);
});

test('unknown API route gives JSON 404',async t=>{
  const {request}=await serve(t);
  const r=await request('/unknown',{});assert.equal(r.status,404);assert.ok((await r.json()).code);
});
