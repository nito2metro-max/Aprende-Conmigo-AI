// Vocabulario y frases de inglés para hispanohablantes, por nivel.
import { pick, shuffle } from './random.js';

// `say` es una ayuda de pronunciación escrita "a la española".
export const VOCAB = [
  // Nivel 1: colores y animales
  { en: 'cat', es: 'gato', emoji: '🐱', say: 'cat', level: 1 },
  { en: 'dog', es: 'perro', emoji: '🐶', say: 'dog', level: 1 },
  { en: 'fish', es: 'pez', emoji: '🐟', say: 'fish', level: 1 },
  { en: 'bird', es: 'pájaro', emoji: '🐦', say: 'berd', level: 1 },
  { en: 'red', es: 'rojo', emoji: '🔴', say: 'red', level: 1 },
  { en: 'blue', es: 'azul', emoji: '🔵', say: 'blu', level: 1 },
  { en: 'green', es: 'verde', emoji: '🟢', say: 'grin', level: 1 },
  { en: 'yellow', es: 'amarillo', emoji: '🟡', say: 'iélou', level: 1 },
  // Nivel 2: comida y casa
  { en: 'apple', es: 'manzana', emoji: '🍎', say: 'ápol', level: 2 },
  { en: 'banana', es: 'plátano', emoji: '🍌', say: 'banána', level: 2 },
  { en: 'bread', es: 'pan', emoji: '🍞', say: 'bred', level: 2 },
  { en: 'milk', es: 'leche', emoji: '🥛', say: 'milk', level: 2 },
  { en: 'house', es: 'casa', emoji: '🏠', say: 'jaus', level: 2 },
  { en: 'book', es: 'libro', emoji: '📖', say: 'buk', level: 2 },
  { en: 'sun', es: 'sol', emoji: '☀️', say: 'san', level: 2 },
  { en: 'tree', es: 'árbol', emoji: '🌳', say: 'tri', level: 2 },
  // Nivel 3: acciones
  { en: 'run', es: 'correr', emoji: '🏃', say: 'ran', level: 3 },
  { en: 'eat', es: 'comer', emoji: '🍽️', say: 'it', level: 3 },
  { en: 'sleep', es: 'dormir', emoji: '😴', say: 'slip', level: 3 },
  { en: 'swim', es: 'nadar', emoji: '🏊', say: 'suim', level: 3 },
  { en: 'read', es: 'leer', emoji: '📚', say: 'rid', level: 3 },
  { en: 'sing', es: 'cantar', emoji: '🎤', say: 'sing', level: 3 },
  { en: 'happy', es: 'feliz', emoji: '😊', say: 'jápi', level: 3 },
  { en: 'sad', es: 'triste', emoji: '😢', say: 'sad', level: 3 },
];

// Frases con un hueco (nivel 4) y oraciones completas (nivel 5).
export const SENTENCES = [
  { level: 4, en: 'I ___ an apple.', es: 'Yo como una manzana.', answer: 'eat', wrong: ['run', 'blue'], emoji: '🍎' },
  { level: 4, en: 'The cat is ___.', es: 'El gato está durmiendo.', answer: 'sleeping', wrong: ['eating', 'red'], emoji: '😴' },
  { level: 4, en: 'She ___ a book.', es: 'Ella lee un libro.', answer: 'reads', wrong: ['swims', 'sings'], emoji: '📖' },
  { level: 4, en: 'The sky is ___.', es: 'El cielo es azul.', answer: 'blue', wrong: ['green', 'happy'], emoji: '🌤️' },
  { level: 4, en: 'I have two ___.', es: 'Tengo dos perros.', answer: 'dogs', wrong: ['dog', 'milk'], emoji: '🐶🐶' },
  { level: 5, en: 'Good morning!', es: '¡Buenos días!', answer: '¡Buenos días!', wrong: ['¡Buenas noches!', '¡Adiós!'], emoji: '🌅', translate: true },
  { level: 5, en: 'How are you?', es: '¿Cómo estás?', answer: '¿Cómo estás?', wrong: ['¿Cómo te llamas?', '¿Cuántos años tienes?'], emoji: '🙂', translate: true },
  { level: 5, en: 'My name is Leo.', es: 'Me llamo Leo.', answer: 'Me llamo Leo.', wrong: ['Tengo un león.', 'Leo es mi perro.'], emoji: '👋', translate: true },
  { level: 5, en: 'I like to play football.', es: 'Me gusta jugar al fútbol.', answer: 'Me gusta jugar al fútbol.', wrong: ['Tengo una pelota.', 'Veo el fútbol en la tele.'], emoji: '⚽', translate: true },
  { level: 5, en: 'The dog is under the table.', es: 'El perro está debajo de la mesa.', answer: 'El perro está debajo de la mesa.', wrong: ['El perro está encima de la mesa.', 'El gato está debajo de la mesa.'], emoji: '🐶', translate: true },
];

export function vocabForLevel(level) {
  const capped = Math.min(level, 3);
  const own = VOCAB.filter((w) => w.level === capped);
  return own.length ? own : VOCAB;
}

function vocabProblem(level, rng) {
  const pool = vocabForLevel(level);
  const word = pick(pool, rng);
  const others = shuffle(VOCAB.filter((w) => w.en !== word.en), rng).slice(0, 3);
  const mode = rng() < 0.5 ? 'listen' : 'translate';
  const base = {
    subject: 'english',
    word,
    hint: `Pista: suena parecido a "${word.say}".`,
    steps: [
      `${word.emoji} en español es "${word.es}".`,
      `En inglés se dice "${word.en}".`,
      `Se pronuncia más o menos así: "${word.say}". ¡Repítelo en voz alta!`,
    ],
  };
  if (mode === 'listen') {
    // Escuchar la palabra en inglés y elegir el dibujo correcto.
    return {
      ...base,
      type: 'listen',
      prompt: 'Escucha y elige el dibujo correcto',
      question: '¿Qué palabra escuchas? Elige el dibujo',
      scene: { listen: true },
      speech: word.en,
      speechLang: 'en-US',
      answer: word.emoji,
      choices: shuffle([word.emoji, ...others.map((o) => o.emoji)], rng),
      bigChoices: true,
    };
  }
  return {
    ...base,
    type: 'translate',
    prompt: `¿Cómo se dice "${word.es}" en inglés? ${word.emoji}`,
    question: `¿Cómo se dice "${word.es}" en inglés?`,
    scene: { emoji: word.emoji },
    speech: `¿Cómo se dice ${word.es} en inglés?`,
    answer: word.en,
    choices: shuffle([word.en, ...others.map((o) => o.en)], rng),
    sayChoicesIn: 'en-US',
  };
}

function sentenceProblem(level, rng) {
  const s = pick(SENTENCES.filter((x) => x.level === level), rng);
  if (s.translate) {
    return {
      subject: 'english',
      type: 'sentence',
      prompt: `¿Qué significa? "${s.en}" ${s.emoji}`,
      question: '¿Qué significa esta frase?',
      scene: { emoji: s.emoji, text: `"${s.en}"` },
      speech: s.en,
      speechLang: 'en-US',
      answer: s.answer,
      choices: shuffle([s.answer, ...s.wrong], rng),
      hint: 'Busca las palabras que ya conoces dentro de la frase.',
      steps: [
        `Escuchamos la frase: "${s.en}".`,
        'Buscamos palabras que ya conocemos y pensamos qué significan.',
        `La frase completa significa: "${s.es}"`,
      ],
    };
  }
  return {
    subject: 'english',
    type: 'fill',
    prompt: `Completa la frase: "${s.en}" ${s.emoji}`,
    question: 'Completa la frase',
    scene: { emoji: s.emoji, text: s.en },
    speech: s.en.replace('___', 'blank'),
    speechLang: 'en-US',
    answer: s.answer,
    choices: shuffle([s.answer, ...s.wrong], rng),
    sayChoicesIn: 'en-US',
    hint: `En español: "${s.es}"`,
    steps: [
      `En español la frase quiere decir: "${s.es}"`,
      'Pensamos qué palabra en inglés falta en el hueco.',
      `La palabra que falta es "${s.answer}": ${s.en.replace('___', s.answer)}`,
    ],
  };
}

export function generateEnglishProblem(level, rng = Math.random) {
  if (level >= 4 && rng() < 0.7) return sentenceProblem(level, rng);
  return vocabProblem(level, rng);
}
