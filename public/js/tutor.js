// Cliente del tutor: pregunta a la IA y, si no hay conexión, usa las
// explicaciones integradas en la app.
import { solveExpression } from './math.js';
import { VOCAB } from './english.js';

let aiStatus = null;

export async function checkAi() {
  if (aiStatus !== null) return aiStatus;
  try {
    const res = await fetch('/api/health', { cache: 'no-store' });
    aiStatus = res.ok ? Boolean((await res.json()).ai) : false;
  } catch {
    aiStatus = false;
  }
  return aiStatus;
}

export function offlineExplanation(question, subject) {
  const math = solveExpression(question);
  if (math) return { source: 'local', ...math };

  const lower = question.toLowerCase();
  const word = VOCAB.find((w) => new RegExp(`(^|[^\\p{L}])(${w.es}|${w.en})($|[^\\p{L}])`, 'iu').test(lower));
  if (word) {
    return {
      source: 'local',
      intro: `¡Vamos a aprender una palabra! ${word.emoji}`,
      steps: [
        `En español: "${word.es}".`,
        `En inglés: "${word.en}".`,
        `Se pronuncia así: "${word.say}".`,
        'Repítela tres veces en voz alta y luego intenta usarla en una frase.',
      ],
      answer: `${word.es} = ${word.en}`,
      tryIt: `¿Sabes decir "${word.es}" en inglés sin mirar?`,
    };
  }

  const tips = {
    reading: [
      'Lee el texto una vez despacio, sin preocuparte por las preguntas.',
      'Ahora lee la pregunta y busca su palabra más importante.',
      'Busca esa palabra en el texto y lee la frase completa donde aparece.',
      'Responde con tus palabras usando lo que dice esa frase.',
    ],
    english: [
      'Busca las palabras que ya conoces en la frase.',
      'Para las palabras nuevas, mira si se parecen a alguna en español.',
      'Lee la frase en voz alta: a veces el sonido ayuda a recordar.',
      'Pide a un adulto que te ayude a buscar las palabras difíciles en el diccionario.',
    ],
    math: [
      'Lee el problema dos veces y subraya los números.',
      'Piensa qué te piden: ¿juntar (sumar), quitar (restar), grupos iguales (multiplicar) o repartir (dividir)?',
      'Escribe la operación, por ejemplo: 12 + 5.',
      'Resuélvela y comprueba si el resultado tiene sentido.',
    ],
  };
  return {
    source: 'local',
    intro: 'Ahora mismo no tengo conexión con mi cerebro de IA, pero te doy un plan para resolverlo. 🦉',
    steps: tips[subject] || tips.math,
    answer: '',
    tryIt: 'Si es una operación, escríbela así: 25 + 17, y te la explico paso a paso.',
  };
}

const SUBJECT_NAMES = { math: 'matemáticas', reading: 'lectura y comprensión', english: 'inglés' };

// Mismas reglas que el tutor del servidor (tutor-ai.js), para cuando la app
// se abre publicada en claude.ai y no hay servidor propio.
const RULES = `Eres "Profe Búho", un profesor particular cariñoso y paciente para niños de 6 a 12 años con dificultades en matemáticas, lectura o inglés. Hablas en español sencillo.
- Explica paso a paso, un paso pequeño por línea, con frases cortas: tus respuestas se leen en voz alta.
- Adapta la explicación a la edad y al nivel (1 = muy básico, 5 = avanzado para su edad).
- Usa ejemplos cotidianos (frutas, juguetes, animales) y algún emoji, sin abusar.
- Enseña el método completo y termina con un ejercicio parecido para que lo intente solo.
- En inglés, pon las palabras inglesas entre comillas y cómo se pronuncian "a la española".
- Anima siempre. Habla sólo de temas escolares apropiados para niños; si piden otra cosa, redirige a la tarea con amabilidad. No pidas datos personales. Si el niño cuenta que alguien le hace daño, dile con calma que se lo cuente ya a un adulto de confianza.
Responde SOLO con un objeto JSON: {"intro": "frase corta de ánimo", "steps": ["paso 1", "paso 2"], "answer": "resultado o idea clave (puede estar vacío)", "tryIt": "ejercicio parecido"}. Entre 2 y 7 pasos.`;

let samplePromise = null;
function getSample() {
  if (!samplePromise) samplePromise = globalThis.claude?.use ? globalThis.claude.use('sample').catch(() => null) : Promise.resolve(null);
  return samplePromise;
}

let sampleBlocked = false;

async function askViaSample({ question, subject, level, age }) {
  if (sampleBlocked) return null;
  const sample = await getSample();
  if (!sample) return null;
  const prompt = `${RULES}\n\nMateria: ${SUBJECT_NAMES[subject] || 'cualquier materia'}\nEdad: ${Number(age) || 8} años\nNivel: ${Number(level) || 1} de 5\n\nTarea o pregunta del niño:\n${question}`;
  try {
    const data = await sample.json(prompt, { modelTier: 'quick' });
    const steps = Array.isArray(data?.steps) ? data.steps.map(String).filter(Boolean).slice(0, 10) : [];
    if (!steps.length) return null;
    return { source: 'ai', intro: String(data.intro || ''), steps, answer: String(data.answer || ''), tryIt: String(data.tryIt || '') };
  } catch (e) {
    // Si el adulto no da permiso o no está disponible, no volvemos a preguntar.
    if (['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'].includes(e?.code)) sampleBlocked = true;
    return null;
  }
}

export async function askTutor({ question, subject, level, age }) {
  const local = solveExpression(question);
  // Las operaciones sencillas se explican al instante sin gastar IA.
  if (local && subject === 'math') return { source: 'local', ...local };

  if (await checkAi()) {
    try {
      const res = await fetch('/api/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, subject, level, age }),
      });
      if (res.ok) return await res.json();
    } catch {
      // Sin red: probamos las otras opciones.
    }
  }
  const viaClaude = await askViaSample({ question, subject, level, age });
  if (viaClaude) return viaClaude;
  return offlineExplanation(question, subject);
}

// ¿Hay algún tutor con IA disponible (servidor propio o Claude en claude.ai)?
export async function aiReachable() {
  if (await checkAi()) return true;
  return !sampleBlocked && Boolean(await getSample());
}
