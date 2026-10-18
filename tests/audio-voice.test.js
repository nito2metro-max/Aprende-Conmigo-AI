import { test } from 'node:test';
import assert from 'node:assert/strict';
import { duckMusic, musicState, RESUME_DELAY_MS } from '../public/js/music.js';
import { maxSpeechMs } from '../public/js/speech.js';

test('la música se pausa al hablar y vuelve después de una pausa', async () => {
  duckMusic(true);
  assert.equal(musicState().ducked, true);
  duckMusic(false);
  // Aún en pausa: no se mezcla con el final de la frase.
  assert.equal(musicState().ducked, true);
  await new Promise((r) => setTimeout(r, RESUME_DELAY_MS + 50));
  assert.equal(musicState().ducked, false);
});

test('si la voz vuelve a hablar enseguida, la música sigue en pausa', async () => {
  duckMusic(true);
  duckMusic(false);
  await new Promise((r) => setTimeout(r, RESUME_DELAY_MS / 2));
  duckMusic(true);
  await new Promise((r) => setTimeout(r, RESUME_DELAY_MS));
  assert.equal(musicState().ducked, true);
  duckMusic(false);
  await new Promise((r) => setTimeout(r, RESUME_DELAY_MS + 50));
  assert.equal(musicState().ducked, false);
});

test('el tiempo máximo de una frase crece con el texto y con la voz lenta', () => {
  assert.ok(maxSpeechMs('Hola') >= 1500);
  assert.ok(maxSpeechMs('a'.repeat(200)) > maxSpeechMs('a'.repeat(20)));
  assert.ok(maxSpeechMs('texto de prueba', 0.6) > maxSpeechMs('texto de prueba', 1.2));
});
