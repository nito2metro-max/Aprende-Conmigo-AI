import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateMathProblem, makeChoices, solveExpression, parseExpression, explainAddition, explainSubtraction } from '../public/js/math.js';
import { seeded } from '../public/js/random.js';

test('cada nivel genera problemas válidos con la respuesta entre las opciones', () => {
  const rng = seeded(42);
  for (let level = 1; level <= 5; level++) {
    for (let i = 0; i < 300; i++) {
      const p = generateMathProblem(level, rng);
      assert.ok(p.choices.includes(p.answer), `${p.prompt} -> ${p.answer} no está en ${p.choices}`);
      assert.equal(new Set(p.choices).size, p.choices.length, 'opciones repetidas');
      assert.ok(p.choices.length >= 3);
      assert.ok(Number(p.answer) >= 0, `respuesta negativa en ${p.prompt}`);
      assert.ok(Number.isInteger(Number(p.answer)), `respuesta no entera en ${p.prompt}`);
      assert.ok(p.steps.length >= 2);
      assert.ok(p.steps.every((s) => typeof s === 'string' && s.length));
    }
  }
});

test('los problemas de nivel 1 no pasan de 10', () => {
  const rng = seeded(7);
  for (let i = 0; i < 200; i++) {
    const p = generateMathProblem(1, rng);
    assert.ok(Number(p.answer) <= 10);
    assert.ok(p.visual);
  }
});

test('la explicación de la suma termina con el resultado correcto', () => {
  const rng = seeded(1);
  for (let i = 0; i < 300; i++) {
    const a = Math.floor(rng() * 999);
    const b = Math.floor(rng() * 999);
    const steps = explainAddition(a, b);
    assert.match(steps.at(-1), new RegExp(`= ${a + b}\\.$`));
  }
});

test('la resta con préstamo explica bien los ceros', () => {
  const steps = explainSubtraction(305, 47);
  assert.match(steps.at(-1), /258/);
  assert.ok(steps.some((s) => s.includes('hay un 0')));
  assert.ok(!steps.some((s) => s.includes('-1')));
});

test('las opciones nunca son negativas', () => {
  const choices = makeChoices(0, seeded(3));
  assert.ok(choices.every((c) => Number(c) >= 0));
  assert.ok(choices.includes('0'));
});

test('entiende operaciones escritas de muchas formas', () => {
  assert.deepEqual(parseExpression('23 + 48'), { op: '+', a: 23, b: 48 });
  assert.deepEqual(parseExpression('7x8'), { op: '×', a: 7, b: 8 });
  assert.deepEqual(parseExpression('56 : 7'), { op: '÷', a: 56, b: 7 });
  assert.deepEqual(parseExpression('cuánto es 9 por 6'), { op: '×', a: 9, b: 6 });
  assert.deepEqual(parseExpression('20 menos 5'), { op: '-', a: 20, b: 5 });
  assert.deepEqual(parseExpression('15 dividido entre 3'), { op: '÷', a: 15, b: 3 });
  assert.equal(parseExpression('¿qué es un sustantivo?'), null);
});

test('resuelve tareas con pasos y respuesta', () => {
  assert.equal(solveExpression('47 + 38').answer, '85');
  assert.equal(solveExpression('9 x 6').answer, '54');
  assert.equal(solveExpression('58 / 7').answer, '8 y sobran 2');
  assert.equal(solveExpression('3 - 5').answer, '-2');
  assert.ok(solveExpression('10 / 0').steps[0].includes('No se puede'));
});
