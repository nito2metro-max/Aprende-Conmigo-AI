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
      // Sin red: usamos la explicación integrada.
    }
  }
  return offlineExplanation(question, subject);
}
