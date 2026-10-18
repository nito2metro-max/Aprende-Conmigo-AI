// Estrellas, monedas, medallas y tienda de premios.

export const COINS_PER_CORRECT = 5;
export const STREAK_BONUS_EVERY = 5;
export const STREAK_BONUS = 10;

export function coinsForAnswer(correct, streak) {
  if (!correct) return 1; // Esforzarse también cuenta.
  const bonus = streak > 0 && streak % STREAK_BONUS_EVERY === 0 ? STREAK_BONUS : 0;
  return COINS_PER_CORRECT + bonus;
}

const countCorrect = (p, subject) => p.history.filter((h) => h.correct && (!subject || h.subject === subject)).length;

export const BADGES = [
  { id: 'first', emoji: '🌱', name: 'Primer paso', desc: 'Responde tu primera pregunta.', test: (p) => p.history.length >= 1 },
  { id: 'ten', emoji: '⭐', name: 'Diez estrellas', desc: 'Consigue 10 respuestas correctas.', test: (p) => countCorrect(p) >= 10 },
  { id: 'math10', emoji: '🔢', name: 'Mago de los números', desc: '10 aciertos en matemáticas.', test: (p) => countCorrect(p, 'math') >= 10 },
  { id: 'read10', emoji: '📚', name: 'Ratón de biblioteca', desc: '10 aciertos en lectura.', test: (p) => countCorrect(p, 'reading') >= 10 },
  { id: 'eng10', emoji: '🗽', name: 'Hello, amigo', desc: '10 aciertos en inglés.', test: (p) => countCorrect(p, 'english') >= 10 },
  { id: 'streak5', emoji: '🔥', name: 'En racha', desc: '5 respuestas correctas seguidas.', test: (p) => (p.bestStreak || 0) >= 5 },
  { id: 'level3', emoji: '🌳', name: 'Creciendo', desc: 'Llega al nivel 3 en algo.', test: (p) => Object.values(p.skills).some((s) => s.level >= 3) },
  { id: 'level5', emoji: '🏆', name: 'Campeón', desc: 'Llega al nivel 5 en algo.', test: (p) => Object.values(p.skills).some((s) => s.level >= 5) },
  { id: 'gamer', emoji: '🎮', name: 'Jugador', desc: 'Juega 3 partidas.', test: (p) => (p.gamesPlayed || 0) >= 3 },
  { id: 'buddy', emoji: '🦉', name: 'Amigo del búho', desc: 'Conversa 5 veces con Profe Búho IA.', test: (p) => (p.buddyAsked || 0) >= 5 },
  { id: 'homework', emoji: '📝', name: 'Tarea hecha', desc: 'Pide ayuda con una tarea.', test: (p) => (p.homeworkAsked || 0) >= 1 },
  { id: 'brave', emoji: '💪', name: 'Valiente', desc: 'Sigue intentando después de 10 errores.', test: (p) => p.history.filter((h) => !h.correct).length >= 10 },
  { id: 'days3', emoji: '📅', name: 'Constante', desc: 'Aprende 3 días distintos.', test: (p) => new Set(p.history.map((h) => new Date(h.t).toDateString())).size >= 3 },
];

// Devuelve las medallas nuevas que el perfil acaba de ganar.
export function newBadges(profile) {
  const have = new Set(profile.badges);
  return BADGES.filter((b) => !have.has(b.id) && b.test(profile));
}

export const SHOP = [
  { id: 'av-fox', type: 'avatar', emoji: '🦊', name: 'Zorro', price: 30 },
  { id: 'av-panda', type: 'avatar', emoji: '🐼', name: 'Panda', price: 30 },
  { id: 'av-lion', type: 'avatar', emoji: '🦁', name: 'León', price: 50 },
  { id: 'av-unicorn', type: 'avatar', emoji: '🦄', name: 'Unicornio', price: 80 },
  { id: 'av-dragon', type: 'avatar', emoji: '🐲', name: 'Dragón', price: 120 },
  { id: 'av-robot', type: 'avatar', emoji: '🤖', name: 'Robot', price: 150 },
  { id: 'hat-crown', type: 'hat', emoji: '👑', name: 'Corona', price: 60 },
  { id: 'hat-cap', type: 'hat', emoji: '🧢', name: 'Gorra', price: 25 },
  { id: 'hat-top', type: 'hat', emoji: '🎩', name: 'Sombrero', price: 40 },
  { id: 'hat-party', type: 'hat', emoji: '🥳', name: 'Fiesta', price: 70 },
  { id: 'st-rainbow', type: 'sticker', emoji: '🌈', name: 'Arcoíris', price: 15 },
  { id: 'st-rocket', type: 'sticker', emoji: '🚀', name: 'Cohete', price: 15 },
  { id: 'st-planet', type: 'sticker', emoji: '🪐', name: 'Planeta', price: 20 },
  { id: 'st-dino', type: 'sticker', emoji: '🦖', name: 'Dino', price: 20 },
];

export function buy(profile, itemId) {
  const item = SHOP.find((i) => i.id === itemId);
  if (!item) return { ok: false, reason: 'missing' };
  if (profile.owned.includes(itemId)) return { ok: false, reason: 'owned' };
  if (profile.coins < item.price) return { ok: false, reason: 'coins' };
  return { ok: true, profile: { ...profile, coins: profile.coins - item.price, owned: [...profile.owned, itemId] } };
}
