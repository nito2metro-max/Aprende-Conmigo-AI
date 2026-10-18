// Profe Búho IA: compañero de estudio con el que el niño conversa.
// Usa la IA del servidor propio, o Claude cuando la app está publicada en
// claude.ai, y si no hay ninguna, un "cerebro" sin conexión que también
// explica operaciones, hace preguntas de repaso y cuenta cuentos.
import { checkAi } from './tutor.js';
import { solveExpression, generateMathProblem } from './math.js';
import { VOCAB } from './english.js';
import { PASSAGES } from './reading.js';
import { pick } from './random.js';

export const MAX_TURNS = 12;
export const MAX_MESSAGE = 600;

export const SUGGESTIONS = [
  { emoji: '❓', text: 'Hazme 3 preguntas para repasar' },
  { emoji: '✖️', text: 'Ayúdame a estudiar las tablas' },
  { emoji: '🍕', text: 'Explícame las fracciones' },
  { emoji: '🗽', text: 'Enséñame los colores en inglés' },
  { emoji: '📖', text: 'Cuéntame un cuento corto' },
  { emoji: '🧠', text: 'Dame un truco para estudiar mejor' },
];

const SUBJECT_NAMES = { math: 'matemáticas', reading: 'lectura', english: 'inglés' };

export function buddyRules({ age, levels }) {
  const lv = Object.entries(levels || {}).map(([k, v]) => `${SUBJECT_NAMES[k] || k}: nivel ${v} de 5`).join(', ');
  return `Eres "Profe Búho", un búho sabio, cariñoso y divertido que ayuda a estudiar a un niño de ${Number(age) || 8} años con dificultades de aprendizaje. Sus niveles en la app: ${lv || 'desconocidos'}.
Cómo hablas:
- Español sencillo, frases cortas. Tus respuestas se leen en voz alta: nada de listas largas, tablas, asteriscos ni formato Markdown. Máximo 80 palabras.
- Un poco de humor y algún emoji, sin abusar.
Cómo ayudas a estudiar:
- Enseña paso a paso y comprueba que entiende: termina casi siempre con UNA pregunta corta para que responda él.
- Si te pide preguntas de repaso, hazlas DE UNA EN UNA, espera su respuesta y dile si está bien. Si se equivoca, anímale y explica el truco.
- Adapta la dificultad a su nivel y sube poco a poco si acierta.
- Si pide la respuesta de una tarea, guíale para que llegue él, pero no le dejes atascado: después de dos intentos, muéstrale cómo se hace.
- En inglés, escribe las palabras entre comillas y cómo se pronuncian "a la española".
Seguridad:
- Sólo temas escolares y apropiados para niños; si te piden otra cosa, vuelve con cariño al estudio.
- No pidas ni repitas datos personales (nombre completo, dirección, colegio, teléfono).
- Si cuenta que alguien le hace daño o que está en peligro, dile con calma que se lo cuente ya a un adulto de confianza.`;
}

// Recorta la conversación a lo que se envía: empieza en el niño y alterna.
export function trimHistory(history) {
  let turns = history
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && String(m.content || '').trim())
    .map((m) => ({ role: m.role, content: String(m.content).slice(0, MAX_MESSAGE * 2) }))
    .slice(-MAX_TURNS);
  while (turns.length && turns[0].role !== 'user') turns = turns.slice(1);
  return turns;
}

// ---------- IA ----------

let samplePromise = null;
let sampleBlocked = false;
function getSample() {
  if (!samplePromise) samplePromise = globalThis.claude?.use ? globalThis.claude.use('sample').catch(() => null) : Promise.resolve(null);
  return samplePromise;
}

export async function buddyMode() {
  if (await checkAi()) return 'server';
  if (!sampleBlocked && (await getSample())) return 'claude';
  return 'offline';
}

// Devuelve la respuesta de Profe Búho. `onText` recibe el texto mientras se escribe.
export async function askBuddy(history, ctx, { onText, signal } = {}) {
  const turns = trimHistory(history);
  if (await checkAi()) {
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: turns, age: ctx.age, levels: ctx.levels }),
        signal,
      });
      if (res.ok) {
        const { reply } = await res.json();
        if (reply) return { source: 'ai', text: reply };
      }
    } catch (e) {
      if (e?.name === 'AbortError') throw e;
    }
  }

  const sample = sampleBlocked ? null : await getSample();
  if (sample) {
    try {
      const { text } = await sample([{ role: 'user', content: buddyRules(ctx) }, ...turns], {
        modelTier: 'quick',
        cache: false,
        signal,
        onText: ({ text: t }) => onText?.(t),
      });
      return { source: 'ai', text };
    } catch (e) {
      if (e?.code === 'cancelled') throw e;
      if (['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'].includes(e?.code)) sampleBlocked = true;
    }
  }
  return { source: 'local', text: offlineReply(history, ctx) };
}

// ---------- Cerebro sin conexión ----------

function normalize(s) {
  return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

const quiz = { expected: null, asked: 0, subject: null, explain: null };

export function resetOfflineQuiz() {
  Object.assign(quiz, { expected: null, asked: 0, subject: null, explain: null });
}

function nextQuizQuestion(ctx) {
  quiz.asked += 1;
  if (quiz.subject === 'english') {
    const w = pick(VOCAB.filter((v) => v.level <= Math.min(ctx.levels?.english || 1, 3)));
    quiz.expected = w.en;
    quiz.explain = [`"${w.es}" en inglés es "${w.en}" y se pronuncia "${w.say}".`];
    return `Pregunta ${quiz.asked}: ¿cómo se dice "${w.es}" ${w.emoji} en inglés?`;
  }
  // Hasta el nivel 4 no salen problemas con texto: la respuesta es un número.
  const pr = generateMathProblem(Math.min(ctx.levels?.math || 1, 4));
  quiz.expected = pr.answer;
  quiz.explain = pr.steps;
  return `Pregunta ${quiz.asked}: ¿cuánto es ${pr.prompt.replace(' = ?', '')}?`;
}

export function offlineReply(history, ctx) {
  const last = [...history].reverse().find((m) => m.role === 'user')?.content || '';
  const text = normalize(last);

  // ¿Está respondiendo a una pregunta de repaso?
  if (quiz.expected !== null) {
    const shown = quiz.expected;
    const expected = normalize(shown);
    const said = text.replace(/[^\p{L}\p{N} -]/gu, '').trim();
    const right = said === expected || said.split(/\s+/).includes(expected);
    const explain = quiz.explain;
    quiz.expected = null;
    if (/^(para|basta|stop|ya no|no quiero)/.test(text)) {
      resetOfflineQuiz();
      return '¡Muy bien por hoy! 🦉 Cuando quieras, seguimos repasando.';
    }
    const feedback = right
      ? `¡Correcto! 🎉 Era ${shown}.`
      : `¡Buen intento! ${explain?.length ? explain[explain.length - 1] : `La respuesta era ${shown}.`}`;
    if (quiz.asked >= 3) {
      resetOfflineQuiz();
      return `${feedback} ¡Terminamos las 3 preguntas! Eres un gran estudiante. ¿Quieres otra ronda?`;
    }
    return `${feedback} ${nextQuizQuestion(ctx)}`;
  }

  const math = solveExpression(last);
  if (math) {
    return `${math.intro} ${math.steps.join(' ')} ${math.tryIt}`;
  }

  if (/pregunta|repas|examen|quiz|preguntame|tabla/.test(text)) {
    quiz.subject = /ingles|english/.test(text) ? 'english' : 'math';
    quiz.asked = 0;
    return `¡Genial, vamos a repasar! Te haré 3 preguntas. Escribe sólo la respuesta. ${nextQuizQuestion(ctx)}`;
  }

  if (/cuento|historia|leer/.test(text)) {
    const level = ctx.levels?.reading || 1;
    const p = pick(PASSAGES.filter((x) => x.level <= Math.max(1, level)));
    return `${p.emoji} "${p.title}". ${p.text} ¿Te gustó? ¿Qué parte te gustó más?`;
  }

  const word = VOCAB.find((w) => new RegExp(`\\b(${normalize(w.es)}|${w.en})\\b`).test(text));
  if (word) return `${word.emoji} "${word.es}" en inglés se dice "${word.en}". Se pronuncia "${word.say}". ¡Repítelo conmigo tres veces!`;

  if (/color/.test(text)) {
    const colors = VOCAB.filter((w) => w.level === 1 && /🔴|🔵|🟢|🟡/.test(w.emoji));
    return `¡Los colores en inglés! ${colors.map((c) => `${c.emoji} ${c.es} es "${c.en}", se dice "${c.say}"`).join('. ')}. ¿Cómo se dice "rojo" en inglés?`;
  }

  if (/fraccion/.test(text)) {
    return 'Imagina una pizza 🍕 cortada en 4 trozos iguales. Si te comes 1, te comiste 1 de 4: eso se escribe 1/4. El número de abajo dice en cuántos trozos se cortó, y el de arriba cuántos tomaste. Si te comes 2 trozos, ¿qué fracción es?';
  }

  if (/truco|estudiar|concentr/.test(text)) {
    return pick([
      'Truco del búho 🦉: estudia 10 minutos, descansa 2 y vuelve. Tu cerebro aprende mejor en ratitos cortos. ¿Probamos ahora con unas preguntas?',
      'Explica lo que aprendiste a alguien de tu casa, ¡o a tu peluche! Cuando enseñas algo, lo recuerdas mucho mejor.',
      'Lee en voz alta y despacio. Si una palabra es difícil, sepárala en sílabas: ma-ri-po-sa. ¿Quieres practicar?',
    ]);
  }

  if (/hola|buenas|hey/.test(text)) {
    return '¡Hola! 🦉 Soy Profe Búho. Puedo explicarte cosas, hacerte preguntas para repasar o contarte un cuento. ¿Qué quieres hacer?';
  }

  return 'Ahora mismo estoy sin mi cerebro de internet 🦉, pero puedo explicarte operaciones como 25 + 17, hacerte preguntas de repaso, enseñarte palabras en inglés o contarte un cuento. ¿Qué eliges?';
}
