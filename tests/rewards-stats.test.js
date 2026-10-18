import { test } from 'node:test';
import assert from 'node:assert/strict';
import { coinsForAnswer, newBadges, buy, SHOP } from '../public/js/rewards.js';
import { summarize, recommendations } from '../public/js/stats.js';
import { createProfile, loadState, saveState, defaultState, MAX_HISTORY } from '../public/js/storage.js';

function memoryStorage() {
  const data = new Map();
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)) };
}

test('monedas: acierto, racha y esfuerzo', () => {
  assert.equal(coinsForAnswer(true, 1), 5);
  assert.equal(coinsForAnswer(true, 5), 15);
  assert.equal(coinsForAnswer(false, 0), 1);
});

test('medallas nuevas se detectan una sola vez', () => {
  const p = createProfile({ name: 'Ana', age: 8 });
  p.history.push({ t: Date.now(), subject: 'math', correct: true, level: 1, ms: 1000 });
  const won = newBadges(p).map((b) => b.id);
  assert.ok(won.includes('first'));
  p.badges.push(...won);
  assert.equal(newBadges(p).length, 0);
});

test('comprar en la tienda', () => {
  const p = { ...createProfile({ name: 'Leo', age: 7 }), coins: 40 };
  const item = SHOP.find((i) => i.price <= 40);
  const r = buy(p, item.id);
  assert.ok(r.ok);
  assert.equal(r.profile.coins, 40 - item.price);
  assert.equal(buy(r.profile, item.id).reason, 'owned');
  assert.equal(buy({ ...p, coins: 0 }, item.id).reason, 'coins');
});

test('resumen de progreso por materia y por día', () => {
  const now = new Date(2026, 9, 18, 12).getTime();
  const day = 86400000;
  const history = [
    { t: now, subject: 'math', correct: true, ms: 30000 },
    { t: now, subject: 'math', correct: false, ms: 30000 },
    { t: now - day, subject: 'reading', correct: true, ms: 60000 },
    { t: now - 10 * day, subject: 'english', correct: true, ms: 1000 },
  ];
  const s = summarize(history, now);
  assert.equal(s.bySubject.math.accuracy, 50);
  assert.equal(s.bySubject.reading.accuracy, 100);
  assert.equal(s.days.length, 7);
  assert.equal(s.days[6].answered, 2);
  assert.equal(s.days[5].answered, 1);
  assert.equal(s.minutes, 2);
});

test('recomendaciones señalan la materia difícil', () => {
  const p = createProfile({ name: 'Sol', age: 9 });
  const now = Date.now();
  for (let i = 0; i < 10; i++) p.history.push({ t: now, subject: 'math', correct: i < 3, ms: 1000 });
  const tips = recommendations(p, summarize(p.history, now));
  assert.ok(tips.some((t) => t.includes('Matemáticas')));
});

test('guardar y cargar el estado', () => {
  const storage = memoryStorage();
  const state = defaultState();
  const p = createProfile({ name: 'Mia', age: 10, avatar: '🐸' });
  p.history = Array.from({ length: MAX_HISTORY + 10 }, () => ({ t: 1, subject: 'math', correct: true }));
  state.profiles.push(p);
  assert.ok(saveState(state, storage));
  const loaded = loadState(storage);
  assert.equal(loaded.profiles[0].name, 'Mia');
  assert.equal(loaded.profiles[0].history.length, MAX_HISTORY);
  assert.equal(loaded.profiles[0].skills.math.level, 3);
});

test('estado dañado vuelve al predeterminado', () => {
  const storage = memoryStorage();
  storage.setItem('aprende-conmigo-ai:v1', '{roto');
  assert.deepEqual(loadState(storage), defaultState());
});
