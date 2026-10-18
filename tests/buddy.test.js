import { test } from 'node:test';
import assert from 'node:assert/strict';
import { offlineReply, resetOfflineQuiz, trimHistory, buddyRules } from '../public/js/buddy.js';

const ctx = { age: 8, levels: { math: 1, reading: 1, english: 1 } };

function chat() {
  const history = [];
  return (text) => {
    history.push({ role: 'user', content: text });
    const reply = offlineReply(history, ctx);
    history.push({ role: 'assistant', content: reply });
    return reply;
  };
}

test('sin conexión hace 3 preguntas de repaso y las corrige', () => {
  resetOfflineQuiz();
  const say = chat();
  let reply = say('hazme preguntas');
  for (let i = 1; i <= 3; i++) {
    const m = reply.match(/cuánto es (\d+) ([+\-×÷]) (\d+)/);
    assert.ok(m, reply);
    const [a, op, b] = [Number(m[1]), m[2], Number(m[3])];
    const result = { '+': a + b, '-': a - b, '×': a * b, '÷': a / b }[op];
    reply = say(String(result));
    assert.match(reply, /Correcto/);
  }
  assert.match(reply, /Terminamos/);
});

test('sin conexión explica operaciones, palabras y cuenta cuentos', () => {
  resetOfflineQuiz();
  const say = chat();
  assert.match(say('47 + 38'), /85/);
  assert.match(say('¿cómo se dice perro?'), /dog/);
  assert.match(say('cuéntame un cuento'), /"/);
  assert.doesNotMatch(say('quiero un pantalón'), /bread/);
});

test('la conversación se recorta y empieza en el niño', () => {
  const long = Array.from({ length: 30 }, (_, i) => ({ role: i % 2 ? 'user' : 'assistant', content: `m${i}` }));
  const t = trimHistory(long);
  assert.ok(t.length <= 12);
  assert.equal(t[0].role, 'user');
});

test('las reglas incluyen edad y niveles pero no el nombre', () => {
  const r = buddyRules({ age: 9, levels: { math: 3 } });
  assert.match(r, /9 años/);
  assert.match(r, /matemáticas: nivel 3/);
});
