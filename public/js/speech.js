// Lectura en voz alta con la síntesis de voz del navegador.

const synth = globalThis.speechSynthesis;
let rate = 0.9;
let enabled = true;
let preferredVoice = '';
const listeners = new Set();
let speaking = false;
let currentToken = null;
let safetyTimer = null;

// Avisa cuando la voz empieza o termina (la música se pausa mientras habla).
export function onSpeaking(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function setSpeaking(on) {
  if (speaking === on) return;
  speaking = on;
  for (const fn of listeners) fn(on);
}

export function isSpeaking() {
  return speaking;
}

// Tiempo máximo que puede durar una frase. Safari en iPhone a veces no avisa
// de que la voz terminó: pasado este tiempo damos la frase por acabada.
export function maxSpeechMs(text, rateValue = rate) {
  return 1500 + (String(text).length * 95) / Math.max(0.5, rateValue);
}

export const speechSupported = Boolean(synth && globalThis.SpeechSynthesisUtterance);

export function configureSpeech(opts = {}) {
  if (opts.rate) rate = opts.rate;
  if (typeof opts.enabled === 'boolean') enabled = opts.enabled;
  if (typeof opts.voice === 'string') preferredVoice = opts.voice;
}

// Voces disponibles en español, para elegir en la zona de padres.
export function spanishVoices() {
  if (!speechSupported) return [];
  return synth.getVoices().filter((v) => v.lang.toLowerCase().startsWith('es'));
}

function findVoice(lang) {
  const voices = synth.getVoices();
  const prefix = lang.slice(0, 2);
  const chosen = preferredVoice && voices.find((v) => v.voiceURI === preferredVoice && v.lang.startsWith(prefix));
  if (chosen) return chosen;
  return (
    voices.find((v) => v.lang === lang && /natural|google|premium|enhanced/i.test(v.name)) ||
    voices.find((v) => v.lang === lang) ||
    voices.find((v) => v.lang.startsWith(prefix)) ||
    null
  );
}

// Quita emojis y símbolos que la voz leería de forma extraña.
export function cleanForSpeech(text) {
  return String(text)
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, '')
    .replace(/×/g, ' por ')
    .replace(/÷/g, ' entre ')
    .replace(/ - /g, ' menos ')
    .replace(/ \+ /g, ' más ')
    .replace(/ = \?/g, ' es igual a... ')
    .replace(/_{2,}/g, '...')
    .replace(/\s+/g, ' ')
    .trim();
}

export function stopSpeaking() {
  currentToken = null;
  clearTimeout(safetyTimer);
  if (speechSupported) synth.cancel();
  setSpeaking(false);
}

// Lee un texto. `onWord(charIndex)` se llama en cada palabra si el navegador
// lo permite, para resaltar lo que se está leyendo.
export function speak(text, { lang = 'es-ES', onWord, onEnd, slow = false } = {}) {
  if (!speechSupported || !enabled || !text) {
    onEnd?.();
    return Promise.resolve();
  }
  synth.cancel();
  // La música se pausa en cuanto pedimos hablar, sin esperar a que el
  // navegador avise de que empezó (en iPhone ese aviso llega tarde o nunca).
  const token = {};
  currentToken = token;
  setSpeaking(true);
  return new Promise((resolve) => {
    const spoken = lang.startsWith('es') ? cleanForSpeech(text) : String(text);
    const u = new SpeechSynthesisUtterance(spoken);
    u.lang = lang;
    u.rate = slow ? Math.max(0.5, rate - 0.25) : rate;
    u.pitch = 1.05;
    const voice = findVoice(lang);
    if (voice) u.voice = voice;
    if (onWord) u.onboundary = (e) => { if (e.name === 'word' || e.name === undefined) onWord(e.charIndex); };
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      // Sólo la frase más reciente decide cuándo vuelve la música.
      if (currentToken === token) {
        currentToken = null;
        clearTimeout(safetyTimer);
        setSpeaking(false);
      }
      onEnd?.();
      resolve();
    };
    u.onend = done;
    u.onerror = done;
    clearTimeout(safetyTimer);
    safetyTimer = setTimeout(done, maxSpeechMs(spoken, u.rate));
    synth.speak(u);
  });
}

// Algunos navegadores cargan las voces tarde.
if (speechSupported) synth.onvoiceschanged = () => synth.getVoices();

// Dictado por voz para escribir la tarea, si el navegador lo permite.
const Recognition = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
export const dictationSupported = Boolean(Recognition);

export function dictate({ lang = 'es-ES', onText, onEnd }) {
  if (!Recognition) return null;
  const r = new Recognition();
  r.lang = lang;
  r.interimResults = false;
  r.onresult = (e) => onText?.(e.results[0][0].transcript);
  r.onend = () => onEnd?.();
  r.onerror = () => onEnd?.();
  r.start();
  return r;
}
