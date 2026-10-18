// Ajuste automático de dificultad: sube de nivel tras varios aciertos seguidos
// y baja cuando el niño falla seguido, para que nunca se frustre ni se aburra.

export const MIN_LEVEL = 1;
export const MAX_LEVEL = 5;
export const LEVEL_UP_STREAK = 3;
export const LEVEL_DOWN_STREAK = 2;

export const LEVEL_NAMES = {
  1: 'Semillita',
  2: 'Brote',
  3: 'Arbolito',
  4: 'Árbol',
  5: 'Bosque',
};

export function clampLevel(level) {
  return Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, Math.round(level)));
}

// Nivel inicial según la edad. Empezamos un poco por debajo de lo esperado:
// es mejor que los primeros ejercicios salgan bien y ganen confianza.
export function startingLevel(age) {
  const n = Number(age);
  if (!Number.isFinite(n)) return MIN_LEVEL;
  return clampLevel(n - 7);
}

export function newSkill(level = MIN_LEVEL) {
  return { level: clampLevel(level), streak: 0, wrongStreak: 0, answered: 0, correct: 0 };
}

// Devuelve una copia actualizada de la habilidad y si cambió el nivel.
export function recordAnswer(skill, correct) {
  const next = { ...newSkill(), ...skill };
  next.answered += 1;
  let changed = null;

  if (correct) {
    next.correct += 1;
    next.streak += 1;
    next.wrongStreak = 0;
    if (next.streak >= LEVEL_UP_STREAK && next.level < MAX_LEVEL) {
      next.level += 1;
      next.streak = 0;
      changed = 'up';
    }
  } else {
    next.streak = 0;
    next.wrongStreak += 1;
    if (next.wrongStreak >= LEVEL_DOWN_STREAK && next.level > MIN_LEVEL) {
      next.level -= 1;
      next.wrongStreak = 0;
      changed = 'down';
    }
  }
  return { skill: next, changed };
}
