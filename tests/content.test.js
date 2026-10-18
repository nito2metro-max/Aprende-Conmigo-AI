import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PASSAGES, generateReadingProblem, splitWords } from '../public/js/reading.js';
import { VOCAB, SENTENCES, generateEnglishProblem } from '../public/js/english.js';
import { seeded } from '../public/js/random.js';

test('cada lectura contiene la frase que demuestra cada respuesta', () => {
  for (const p of PASSAGES) {
    for (const q of p.questions) {
      assert.ok(p.text.includes(q.evidence), `${p.id}: falta "${q.evidence}"`);
      assert.ok(!q.wrong.includes(q.answer));
    }
  }
});

test('hay lecturas para todos los niveles', () => {
  for (let l = 1; l <= 5; l++) assert.ok(PASSAGES.some((p) => p.level === l), `nivel ${l}`);
});

test('la lectura evita repetir preguntas en la sesión', () => {
  const rng = seeded(5);
  const seen = new Set();
  for (let i = 0; i < 6; i++) {
    const pr = generateReadingProblem(1, rng, seen);
    assert.ok(!seen.has(pr.key));
    seen.add(pr.key);
    assert.ok(pr.choices.includes(pr.answer));
  }
});

test('splitWords conserva las posiciones', () => {
  const text = 'Tito es  gris.';
  for (const w of splitWords(text)) assert.equal(text.slice(w.start, w.end), w.word);
});

test('el vocabulario no tiene palabras ni dibujos repetidos', () => {
  assert.equal(new Set(VOCAB.map((w) => w.en)).size, VOCAB.length);
  assert.equal(new Set(VOCAB.map((w) => w.emoji)).size, VOCAB.length);
});

test('las frases de inglés tienen respuestas válidas', () => {
  for (const s of SENTENCES) {
    assert.ok(!s.wrong.includes(s.answer));
    if (!s.translate) assert.ok(s.en.includes('___'));
  }
});

test('inglés genera problemas en todos los niveles', () => {
  const rng = seeded(11);
  for (let l = 1; l <= 5; l++) {
    for (let i = 0; i < 100; i++) {
      const p = generateEnglishProblem(l, rng);
      assert.ok(p.choices.includes(p.answer));
      assert.equal(new Set(p.choices).size, p.choices.length);
      assert.ok(p.steps.length >= 2);
    }
  }
});
