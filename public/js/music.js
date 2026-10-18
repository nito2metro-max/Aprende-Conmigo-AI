// Música infantil y efectos de sonido generados con Web Audio.
// Las melodías son originales y se sintetizan en el dispositivo:
// no hace falta descargar ningún archivo de audio.

// Cada compás dura 4 tiempos. Una nota es [midi, tiempos]; null es silencio.
export const TRACKS = {
  // Menús: alegre y saltarina.
  menu: {
    bpm: 112,
    volume: 0.55,
    wave: 'triangle',
    drums: 'soft',
    chords: [['C', 48], ['G', 43], ['Am', 45], ['F', 41], ['C', 48], ['G', 43], ['F', 41], ['G', 43]],
    melody: [
      [[76, 0.5], [79, 0.5], [76, 0.5], [74, 0.5], [72, 1], [74, 1]],
      [[71, 0.5], [74, 0.5], [79, 0.5], [74, 0.5], [71, 1], [67, 1]],
      [[72, 0.5], [76, 0.5], [81, 0.5], [79, 0.5], [76, 1], [72, 1]],
      [[77, 0.5], [76, 0.5], [74, 0.5], [72, 0.5], [74, 2]],
      [[72, 0.5], [76, 0.5], [79, 1], [84, 1], [79, 1]],
      [[79, 0.5], [77, 0.5], [76, 0.5], [74, 0.5], [71, 2]],
      [[69, 0.5], [72, 0.5], [77, 1], [76, 1], [74, 1]],
      [[74, 1], [71, 1], [72, 2]],
    ],
  },
  // Lecciones: tranquila, como una cajita de música, para concentrarse.
  lesson: {
    bpm: 80,
    volume: 0.32,
    wave: 'sine',
    drums: null,
    chords: [['F', 41], ['C', 48], ['Dm', 50], ['Bb', 46], ['F', 41], ['C', 48], ['Bb', 46], ['C', 48]],
    melody: [
      [[72, 1], [77, 1], [76, 1], [72, 1]],
      [[72, 2], [67, 2]],
      [[69, 1], [74, 1], [72, 1], [69, 1]],
      [[70, 3], [null, 1]],
      [[77, 1], [76, 1], [74, 1], [72, 1]],
      [[76, 2], [79, 2]],
      [[77, 1], [74, 1], [70, 2]],
      [[72, 4]],
    ],
  },
  // Juegos: rápida y con ritmo.
  game: {
    bpm: 136,
    volume: 0.5,
    wave: 'square',
    drums: 'full',
    chords: [['G', 43], ['C', 48], ['D', 50], ['G', 43], ['Em', 40], ['C', 48], ['D', 50], ['D', 50]],
    melody: [
      [[67, 0.5], [71, 0.5], [74, 0.5], [71, 0.5], [79, 0.5], [74, 0.5], [71, 1]],
      [[72, 0.5], [76, 0.5], [79, 0.5], [76, 0.5], [84, 1], [79, 1]],
      [[74, 0.5], [78, 0.5], [81, 0.5], [78, 0.5], [74, 0.5], [78, 0.5], [81, 1]],
      [[79, 1], [74, 1], [67, 2]],
      [[76, 0.5], [79, 0.5], [83, 0.5], [79, 0.5], [76, 1], [71, 1]],
      [[72, 0.5], [76, 0.5], [79, 1], [76, 1], [72, 1]],
      [[74, 0.5], [76, 0.5], [78, 0.5], [79, 0.5], [81, 1], [78, 1]],
      [[74, 2], [null, 2]],
    ],
  },
};

const MINOR = /m$/;

function chordNotes(name, root) {
  const third = MINOR.test(name) ? 3 : 4;
  return [root + 12, root + 12 + third, root + 19];
}

export function midiToFreq(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

// Convierte una canción en una lista de eventos ordenados por tiempo (en tiempos).
export function buildEvents(track) {
  const events = [];
  track.melody.forEach((bar, i) => {
    let t = i * 4;
    for (const [midi, beats] of bar) {
      if (midi !== null) events.push({ t, kind: 'lead', midi, beats });
      t += beats;
    }
  });
  track.chords.forEach(([name, root], i) => {
    const t = i * 4;
    events.push({ t, kind: 'bass', midi: root, beats: 1.6 });
    events.push({ t: t + 2, kind: 'bass', midi: root + 7, beats: 1.6 });
    for (const midi of chordNotes(name, root)) events.push({ t, kind: 'pad', midi, beats: 3.8 });
    if (track.drums) {
      for (let b = 0; b < 4; b++) {
        if (track.drums === 'full' || b % 2 === 0) events.push({ t: t + b, kind: 'kick' });
        if (track.drums === 'full' && b % 2 === 1) events.push({ t: t + b, kind: 'clap' });
        events.push({ t: t + b + 0.5, kind: 'hat' });
      }
    }
  });
  return events.sort((a, b) => a.t - b.t);
}

export function trackLength(track) {
  return track.melody.length * 4;
}

// ---------- Motor de audio ----------

const AudioCtx = globalThis.AudioContext || globalThis.webkitAudioContext;
export const audioSupported = Boolean(AudioCtx);

let ctx = null;
let master;
let musicBus;
let sfxBus;
let noiseBuffer;
let settings = { music: true, sfx: true, volume: 0.6 };
let wanted = null; // pista que debería sonar
let current = null; // { name, gain, events, index, loopStart, timer }
let ducked = false;

function ensureContext() {
  if (!AudioCtx) return null;
  if (!ctx) {
    ctx = new AudioCtx();
    master = ctx.createGain();
    master.gain.value = 1;
    master.connect(ctx.destination);
    musicBus = ctx.createGain();
    musicBus.connect(master);
    sfxBus = ctx.createGain();
    sfxBus.gain.value = 0.7;
    sfxBus.connect(master);
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    applyMusicVolume(0);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) ctx.suspend();
      else ctx.resume();
    });
  }
  return ctx;
}

function applyMusicVolume(ramp = 0.4) {
  if (!ctx) return;
  const target = settings.music ? settings.volume * (ducked ? 0.25 : 1) : 0;
  musicBus.gain.cancelScheduledValues(ctx.currentTime);
  musicBus.gain.setTargetAtTime(target, ctx.currentTime, ramp / 3 || 0.001);
}

// Los navegadores (sobre todo el iPhone) sólo dejan sonar audio después de
// que el niño toque la pantalla. Llamar desde un evento de toque.
export function unlockAudio() {
  const c = ensureContext();
  if (!c) return;
  if (c.state !== 'running') c.resume();
  if (wanted && !current) startTrack(wanted);
}

export function configureAudio(next) {
  settings = { ...settings, ...next };
  applyMusicVolume();
  if (ctx && settings.music && wanted && !current) startTrack(wanted);
}

// La música baja mientras la voz lee.
export function duckMusic(on) {
  ducked = on;
  applyMusicVolume(on ? 0.25 : 0.8);
}

function envelope(gain, start, attack, peak, decayTo, end) {
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + attack);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, decayTo), end);
}

function tone({ freq, start, dur, type = 'triangle', peak = 0.2, attack = 0.01, bus, sustain = 0.3, endFreq }) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, start + dur);
  envelope(g, start, attack, peak, peak * sustain, start + dur);
  osc.connect(g).connect(bus);
  osc.start(start);
  osc.stop(start + dur + 0.05);
}

function noise({ start, dur, peak, filter, freq, bus }) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const f = ctx.createBiquadFilter();
  f.type = filter;
  f.frequency.value = freq;
  const g = ctx.createGain();
  envelope(g, start, 0.003, peak, 0.0001, start + dur);
  src.connect(f).connect(g).connect(bus);
  src.start(start);
  src.stop(start + dur + 0.02);
}

function playEvent(ev, time, spb, track, bus) {
  const dur = (ev.beats || 0.25) * spb;
  switch (ev.kind) {
    case 'lead':
      tone({ freq: midiToFreq(ev.midi), start: time, dur: dur * 0.95, type: track.wave, peak: track.wave === 'square' ? 0.07 : 0.16, bus, sustain: track.wave === 'sine' ? 0.05 : 0.35 });
      if (track.wave === 'sine') tone({ freq: midiToFreq(ev.midi + 12), start: time, dur: dur * 0.6, type: 'sine', peak: 0.04, bus, sustain: 0.02 });
      break;
    case 'bass':
      tone({ freq: midiToFreq(ev.midi - 12), start: time, dur, type: 'sine', peak: 0.2, bus, sustain: 0.4 });
      break;
    case 'pad':
      tone({ freq: midiToFreq(ev.midi), start: time, dur, type: 'triangle', peak: 0.035, attack: 0.2, bus, sustain: 0.6 });
      break;
    case 'kick':
      tone({ freq: 140, endFreq: 45, start: time, dur: 0.18, type: 'sine', peak: track.drums === 'full' ? 0.35 : 0.22, bus, sustain: 0.01 });
      break;
    case 'hat':
      noise({ start: time, dur: 0.04, peak: track.drums === 'full' ? 0.05 : 0.025, filter: 'highpass', freq: 7000, bus });
      break;
    case 'clap':
      noise({ start: time, dur: 0.12, peak: 0.09, filter: 'bandpass', freq: 1500, bus });
      break;
    default:
  }
}

function startTrack(name) {
  const track = TRACKS[name];
  if (!track || !ctx || !settings.music) return;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(track.volume, ctx.currentTime + 1.2);
  gain.connect(musicBus);
  const spb = 60 / track.bpm;
  const player = { name, gain, events: buildEvents(track), index: 0, loopStart: ctx.currentTime + 0.1, spb, track };
  const loopSeconds = trackLength(track) * spb;
  player.timer = setInterval(() => {
    const horizon = ctx.currentTime + 0.2;
    while (true) {
      const ev = player.events[player.index];
      const time = player.loopStart + ev.t * spb;
      if (time > horizon) break;
      if (time >= ctx.currentTime - 0.05) playEvent(ev, time, spb, track, gain);
      player.index += 1;
      if (player.index >= player.events.length) {
        player.index = 0;
        player.loopStart += loopSeconds;
      }
    }
  }, 50);
  current = player;
}

function stopTrack(fade = 0.6) {
  if (!current) return;
  const { gain, timer } = current;
  clearInterval(timer);
  gain.gain.cancelScheduledValues(ctx.currentTime);
  gain.gain.setTargetAtTime(0.0001, ctx.currentTime, fade / 4);
  setTimeout(() => gain.disconnect(), fade * 1000 + 300);
  current = null;
}

// Cambia la música de fondo ('menu', 'lesson', 'game' o null para silencio).
export function playMusic(name) {
  wanted = name;
  if (!ctx) return;
  if (current?.name === name) return;
  stopTrack();
  if (name) startTrack(name);
}

// ---------- Efectos de sonido ----------

const SFX = {
  correct: [[72, 0, 0.12], [79, 0.1, 0.25]],
  wrong: [[55, 0, 0.18, 'sine', 52]],
  coin: [[88, 0, 0.07, 'square'], [93, 0.07, 0.18, 'square']],
  levelUp: [[67, 0, 0.12], [72, 0.11, 0.12], [76, 0.22, 0.12], [79, 0.33, 0.12], [84, 0.44, 0.4]],
  fanfare: [[72, 0, 0.15], [72, 0.16, 0.15], [72, 0.32, 0.15], [76, 0.5, 0.3], [72, 0.82, 0.15], [76, 0.98, 0.15], [79, 1.14, 0.6]],
  badge: [[79, 0, 0.1], [84, 0.1, 0.1], [88, 0.2, 0.35]],
  tap: [[84, 0, 0.04, 'sine']],
  flip: [[76, 0, 0.06, 'sine', 81]],
  pop: 'pop',
  whoosh: 'whoosh',
  jingle: [[72, 0, 0.12], [76, 0.12, 0.12], [79, 0.24, 0.12], [84, 0.36, 0.25], [79, 0.62, 0.12], [84, 0.74, 0.5]],
};

export function playSfx(name) {
  if (!settings.sfx || !ctx || ctx.state !== 'running') return;
  const now = ctx.currentTime + 0.01;
  const def = SFX[name];
  if (def === 'pop') {
    noise({ start: now, dur: 0.08, peak: 0.3, filter: 'lowpass', freq: 2500, bus: sfxBus });
    tone({ freq: 600, endFreq: 1200, start: now, dur: 0.08, type: 'sine', peak: 0.15, bus: sfxBus, sustain: 0.1 });
    return;
  }
  if (def === 'whoosh') {
    noise({ start: now, dur: 0.35, peak: 0.12, filter: 'bandpass', freq: 900, bus: sfxBus });
    return;
  }
  for (const [midi, offset, dur, type = 'triangle', endMidi] of def || []) {
    tone({ freq: midiToFreq(midi), endFreq: endMidi ? midiToFreq(endMidi) : undefined, start: now + offset, dur, type, peak: type === 'square' ? 0.08 : 0.22, bus: sfxBus, sustain: 0.2 });
  }
}
