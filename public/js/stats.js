// Resúmenes de progreso para el panel de padres.

export const SUBJECTS = {
  math: { name: 'Matemáticas', emoji: '🔢', color: 'var(--math)' },
  reading: { name: 'Lectura', emoji: '📖', color: 'var(--reading)' },
  english: { name: 'Inglés', emoji: '🗽', color: 'var(--english)' },
};

const DAY = 24 * 60 * 60 * 1000;

function startOfDay(t) {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function summarize(history, now = Date.now()) {
  const bySubject = {};
  for (const key of Object.keys(SUBJECTS)) bySubject[key] = { answered: 0, correct: 0, accuracy: null, ms: 0 };
  for (const h of history) {
    const s = bySubject[h.subject];
    if (!s) continue;
    s.answered += 1;
    if (h.correct) s.correct += 1;
    s.ms += Math.min(h.ms || 0, 5 * 60 * 1000); // ignora pausas muy largas
  }
  for (const s of Object.values(bySubject)) s.accuracy = s.answered ? Math.round((s.correct / s.answered) * 100) : null;

  // Actividad de los últimos 7 días (de más antiguo a hoy).
  const today = startOfDay(now);
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const start = today - i * DAY;
    const items = history.filter((h) => h.t >= start && h.t < start + DAY);
    days.push({ start, answered: items.length, correct: items.filter((h) => h.correct).length });
  }

  const totalMs = Object.values(bySubject).reduce((a, s) => a + s.ms, 0);
  return { bySubject, days, minutes: Math.round(totalMs / 60000), answered: history.length };
}

// Precisión de las últimas N respuestas de una materia, para ver la tendencia.
export function recentAccuracy(history, subject, n = 20) {
  const items = history.filter((h) => h.subject === subject).slice(-n);
  if (!items.length) return null;
  return Math.round((items.filter((h) => h.correct).length / items.length) * 100);
}

export function recommendations(profile, summary) {
  const tips = [];
  const entries = Object.entries(summary.bySubject);
  const practiced = entries.filter(([, s]) => s.answered >= 5);

  if (!summary.answered) {
    tips.push('Todavía no hay actividad. Sesiones cortas de 10 minutos al día funcionan mejor que una larga a la semana.');
    return tips;
  }
  if (practiced.length) {
    const [weakKey, weak] = practiced.reduce((a, b) => (b[1].accuracy < a[1].accuracy ? b : a));
    if (weak.accuracy < 60) {
      tips.push(`${SUBJECTS[weakKey].name} le está costando (${weak.accuracy}% de aciertos). La app ya ha bajado la dificultad; acompañarle en una sesión puede darle confianza.`);
    }
    const [strongKey, strong] = practiced.reduce((a, b) => (b[1].accuracy > a[1].accuracy ? b : a));
    if (strong.accuracy >= 80) {
      tips.push(`¡${SUBJECTS[strongKey].name} va genial (${strong.accuracy}%)! Felicítele por su esfuerzo, no solo por el resultado.`);
    }
  }
  for (const [key, s] of entries) {
    if (s.answered === 0) tips.push(`Aún no ha practicado ${SUBJECTS[key].name.toLowerCase()}. Puede proponerle probarlo.`);
  }
  const activeDays = summary.days.filter((d) => d.answered > 0).length;
  if (activeDays <= 2) tips.push(`Ha practicado ${activeDays} ${activeDays === 1 ? 'día' : 'días'} esta semana. La constancia es la clave: intenten un ratito cada día.`);
  else if (activeDays >= 5) tips.push(`Ha practicado ${activeDays} días esta semana. ¡Excelente constancia!`);
  return tips;
}
