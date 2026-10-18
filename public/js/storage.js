// Guardado local de perfiles y progreso (todo queda en este dispositivo).
import { newSkill, startingLevel } from './adaptive.js';
import { uid } from './random.js';

export const STORAGE_KEY = 'aprende-conmigo-ai:v1';
export const MAX_HISTORY = 3000;

export function defaultState() {
  return {
    profiles: [],
    activeId: null,
    parentPinHash: null,
    settings: { autoRead: true, voiceRate: 0.9 },
  };
}

export function createProfile({ name, age, avatar }) {
  const level = startingLevel(age);
  return {
    id: uid('kid'),
    name: String(name || '').trim().slice(0, 30) || 'Peque',
    age: Number(age) || 7,
    avatar: avatar || '🐻',
    hat: null,
    createdAt: Date.now(),
    skills: { math: newSkill(level), reading: newSkill(level), english: newSkill(level) },
    stars: 0,
    coins: 0,
    bestStreak: 0,
    currentStreak: 0,
    badges: [],
    owned: [],
    history: [],
    gamesPlayed: 0,
    homeworkAsked: 0,
  };
}

export function loadState(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    const base = defaultState();
    return { ...base, ...parsed, settings: { ...base.settings, ...parsed.settings } };
  } catch {
    return defaultState();
  }
}

export function saveState(state, storage = globalThis.localStorage) {
  for (const p of state.profiles) {
    if (p.history.length > MAX_HISTORY) p.history = p.history.slice(-MAX_HISTORY);
  }
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

// Hash sencillo para no guardar el PIN de padres en texto plano.
// No es seguridad fuerte: sólo evita que los niños entren por accidente.
export async function hashPin(pin) {
  const data = new TextEncoder().encode(`aprende-conmigo:${pin}`);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
