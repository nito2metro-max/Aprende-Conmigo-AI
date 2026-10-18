import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TRACKS, buildEvents, trackLength, midiToFreq } from '../public/js/music.js';

test('cada compás de cada canción dura exactamente 4 tiempos', () => {
  for (const [name, track] of Object.entries(TRACKS)) {
    assert.equal(track.melody.length, track.chords.length, name);
    track.melody.forEach((bar, i) => {
      const beats = bar.reduce((a, [, d]) => a + d, 0);
      assert.equal(beats, 4, `${name} compás ${i + 1}`);
    });
  }
});

test('los eventos están ordenados y dentro de la canción', () => {
  for (const track of Object.values(TRACKS)) {
    const events = buildEvents(track);
    const len = trackLength(track);
    for (let i = 1; i < events.length; i++) assert.ok(events[i].t >= events[i - 1].t);
    assert.ok(events.every((e) => e.t >= 0 && e.t < len));
  }
});

test('afinación: el La central es 440 Hz', () => {
  assert.equal(midiToFreq(69), 440);
  assert.ok(Math.abs(midiToFreq(60) - 261.63) < 0.01);
});
