import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAppServer } from '../server.js';
import { parseTutorReply, buildUserMessage } from '../tutor-ai.js';

async function withServer(opts, fn) {
  const server = createAppServer(opts);
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await fn(base);
  } finally {
    server.close();
  }
}

test('sirve la app y bloquea rutas fuera de public', async () => {
  await withServer({ isAiAvailable: () => false }, async (base) => {
    const res = await fetch(`${base}/`);
    assert.equal(res.status, 200);
    assert.match(await res.text(), /Aprende Conmigo AI/);
    const js = await fetch(`${base}/js/app.js`);
    assert.match(js.headers.get('content-type'), /javascript/);
    const evil = await fetch(`${base}/..%2Fserver.js`);
    assert.ok([403, 404].includes(evil.status));
  });
});

test('sin IA el tutor responde 503 para que la app use el modo sin conexión', async () => {
  await withServer({ isAiAvailable: () => false }, async (base) => {
    const health = await (await fetch(`${base}/api/health`)).json();
    assert.equal(health.ai, false);
    const res = await fetch(`${base}/api/tutor`, { method: 'POST', body: '{"question":"hola"}' });
    assert.equal(res.status, 503);
  });
});

test('con IA pasa la pregunta al tutor y valida la entrada', async () => {
  let received;
  const tutor = async (input) => {
    received = input;
    return { intro: 'Hola', steps: ['Paso 1'], answer: '4', tryIt: '' };
  };
  await withServer({ isAiAvailable: () => true, tutor }, async (base) => {
    const post = (body) => fetch(`${base}/api/tutor`, { method: 'POST', body: JSON.stringify(body) });
    const ok = await post({ question: '2 + 2', subject: 'math', level: 9, age: 8, name: 'Ana' });
    assert.equal(ok.status, 200);
    const data = await ok.json();
    assert.equal(data.source, 'ai');
    assert.deepEqual(data.steps, ['Paso 1']);
    assert.deepEqual(received, { question: '2 + 2', subject: 'math', level: 5, age: 8 });
    assert.equal((await post({ question: '' })).status, 400);
    assert.equal((await post({ question: 'a'.repeat(1001) })).status, 400);
    const bad = await fetch(`${base}/api/tutor`, { method: 'POST', body: 'no json' });
    assert.equal(bad.status, 400);
  });
});

test('interpreta la respuesta JSON del modelo', () => {
  const r = parseTutorReply('Aquí va:\n{"intro":"¡Vamos!","steps":["Uno","Dos"],"answer":"3","tryIt":"1+1"}');
  assert.deepEqual(r, { intro: '¡Vamos!', steps: ['Uno', 'Dos'], answer: '3', tryIt: '1+1' });
  const plain = parseTutorReply('1. Primero\n2. Después');
  assert.deepEqual(plain.steps, ['Primero', 'Después']);
  assert.equal(parseTutorReply(''), null);
});

test('el mensaje al modelo no incluye datos personales', () => {
  const msg = buildUserMessage({ question: '5 x 3', subject: 'math', level: 2, age: 8 });
  assert.match(msg, /matemáticas/);
  assert.match(msg, /8 años/);
});

test('el chat de estudio valida la conversación y une turnos seguidos', async () => {
  let received;
  const chat = async (input) => {
    received = input;
    return '¡Hola! ¿Repasamos?';
  };
  await withServer({ isAiAvailable: () => true, chat }, async (base) => {
    const post = (body) => fetch(`${base}/api/chat`, { method: 'POST', body: JSON.stringify(body) });
    const ok = await post({
      messages: [
        { role: 'assistant', content: 'Bienvenida' },
        { role: 'user', content: 'hola' },
        { role: 'user', content: '¿me ayudas?' },
      ],
      age: 8,
      levels: { math: 2, reading: 9, english: 'x' },
    });
    assert.equal(ok.status, 200);
    assert.equal((await ok.json()).reply, '¡Hola! ¿Repasamos?');
    assert.deepEqual(received.messages, [{ role: 'user', content: 'hola\n¿me ayudas?' }]);
    assert.deepEqual(received.levels, { math: 2 });
    assert.equal((await post({ messages: [] })).status, 400);
    assert.equal((await post({ messages: [{ role: 'assistant', content: 'x' }] })).status, 400);
    assert.equal((await post({ messages: [{ role: 'user', content: 'a'.repeat(601) }] })).status, 400);
  });
});
