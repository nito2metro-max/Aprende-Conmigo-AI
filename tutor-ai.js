// Tutor con inteligencia artificial (Claude) para "Ayuda con mi tarea".
import Anthropic from '@anthropic-ai/sdk';

export const DEFAULT_MODEL = 'claude-opus-5-5';
export const MAX_QUESTION_LENGTH = 1000;

const SUBJECT_NAMES = { math: 'matemáticas', reading: 'lectura y comprensión', english: 'inglés', other: 'cualquier materia' };

export const SYSTEM_PROMPT = `Eres "Profe Búho", un profesor particular cariñoso y paciente para niños y niñas de 6 a 12 años que tienen dificultades con las matemáticas, la lectura o el inglés. Hablas en español sencillo.

Cómo enseñas:
- Explica la tarea paso a paso, con un solo paso pequeño por línea. Frases cortas y palabras fáciles: tus respuestas se leen en voz alta.
- Adapta la explicación a la edad y al nivel del niño que te indiquen (nivel 1 = muy básico, nivel 5 = avanzado para su edad).
- Usa ejemplos concretos y cotidianos (frutas, juguetes, animales) y algún emoji, sin abusar.
- El objetivo es que el niño aprenda a hacerlo. Enseña el método con los pasos completos y termina proponiendo un ejercicio parecido para que lo intente solo.
- Si la pregunta es de inglés, escribe las palabras en inglés entre comillas y añade cómo se pronuncian "a la española".
- Anima siempre: equivocarse es parte de aprender. Nunca hagas sentir mal al niño.

Seguridad:
- Habla sólo de temas escolares y apropiados para niños. Si te piden otra cosa, redirige con amabilidad a la tarea.
- No pidas ni repitas datos personales (nombre completo, dirección, colegio, teléfono).
- Si el niño cuenta que alguien le hace daño o que está en peligro, responde con calma que se lo cuente ya a un adulto de confianza (su familia o su maestro).

Responde SOLO con un objeto JSON válido, sin texto antes ni después, con esta forma:
{"intro": "frase corta de ánimo que presenta la tarea", "steps": ["paso 1", "paso 2", "..."], "answer": "resultado final o idea clave (puede estar vacío si no aplica)", "tryIt": "un ejercicio parecido para que lo intente solo"}
Usa entre 2 y 7 pasos.`;

export function buildUserMessage({ question, subject, level, age }) {
  const lines = [
    `Materia: ${SUBJECT_NAMES[subject] || SUBJECT_NAMES.other}`,
    `Edad: ${Number(age) || 'desconocida'} años`,
    `Nivel actual en la app: ${Number(level) || 1} de 5`,
    '',
    'Tarea o pregunta del niño:',
    question,
  ];
  return lines.join('\n');
}

// Extrae el primer objeto JSON del texto del modelo y valida su forma.
export function parseTutorReply(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try {
      const data = JSON.parse(text.slice(start, end + 1));
      const steps = Array.isArray(data.steps) ? data.steps.map(String).filter(Boolean).slice(0, 10) : [];
      if (steps.length) {
        return {
          intro: String(data.intro || ''),
          steps,
          answer: String(data.answer || ''),
          tryIt: String(data.tryIt || ''),
        };
      }
    } catch {
      // Cae al formato de texto libre.
    }
  }
  const steps = text.split('\n').map((l) => l.replace(/^\s*(\d+[.)]|[-*•])\s*/, '').trim()).filter(Boolean);
  return steps.length ? { intro: '', steps, answer: '', tryIt: '' } : null;
}

let client = null;
export function getClient() {
  if (client) return client;
  try {
    client = new Anthropic();
  } catch {
    client = null;
  }
  return client;
}

// La IA se activa si hay credenciales en el entorno. TUTOR_AI=on la fuerza
// (por ejemplo, con un perfil de `ant auth login`) y TUTOR_AI=off la apaga.
export function aiAvailable(env = process.env) {
  if (env.TUTOR_AI === 'off') return false;
  const configured = env.TUTOR_AI === 'on' || Boolean(env.ANTHROPIC_API_KEY || env.ANTHROPIC_AUTH_TOKEN);
  return configured && getClient() !== null;
}

export async function askClaude(input, anthropic = getClient()) {
  if (!anthropic) {
    const err = new Error('AI not configured');
    err.code = 'ai_unavailable';
    throw err;
  }
  const response = await anthropic.beta.messages.create({
    model: process.env.CLAUDE_MODEL || DEFAULT_MODEL,
    max_tokens: 8000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    // Explicaciones para niños: rapidez antes que razonamiento profundo.
    output_config: { effort: 'low' },
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserMessage(input) }],
  });

  if (response.stop_reason === 'refusal') {
    return {
      intro: 'Esa pregunta no la puedo responder, pero me encantará ayudarte con tus tareas del cole. 🦉',
      steps: ['Escribe un ejercicio de matemáticas, una pregunta sobre una lectura o una palabra en inglés.'],
      answer: '',
      tryIt: '',
    };
  }
  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  const parsed = parseTutorReply(text);
  if (!parsed) {
    const err = new Error('Empty tutor reply');
    err.code = 'bad_reply';
    throw err;
  }
  return parsed;
}
