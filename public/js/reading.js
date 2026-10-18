// Lecturas cortas con preguntas de comprensión, ordenadas por nivel.
import { pick, shuffle } from './random.js';

// Cada pregunta tiene la respuesta correcta en `answer`, otras opciones en
// `wrong` y la frase del texto que demuestra la respuesta en `evidence`.
export const PASSAGES = [
  // Nivel 1: frases muy cortas, palabras sencillas.
  {
    id: 'gato-sol', level: 1, title: 'El gato Tito', emoji: '🐱',
    text: 'Tito es un gato. Tito es gris. A Tito le gusta el sol.',
    questions: [
      { q: '¿Qué animal es Tito?', answer: 'Un gato', wrong: ['Un perro', 'Un pez'], evidence: 'Tito es un gato.' },
      { q: '¿De qué color es Tito?', answer: 'Gris', wrong: ['Azul', 'Verde'], evidence: 'Tito es gris.' },
      { q: '¿Qué le gusta a Tito?', answer: 'El sol', wrong: ['La lluvia', 'La nieve'], evidence: 'A Tito le gusta el sol.' },
    ],
  },
  {
    id: 'pelota-ana', level: 1, title: 'La pelota de Ana', emoji: '⚽',
    text: 'Ana tiene una pelota roja. Ana juega en el parque. Su amigo Leo juega con ella.',
    questions: [
      { q: '¿De qué color es la pelota?', answer: 'Roja', wrong: ['Amarilla', 'Negra'], evidence: 'Ana tiene una pelota roja.' },
      { q: '¿Dónde juega Ana?', answer: 'En el parque', wrong: ['En la escuela', 'En la playa'], evidence: 'Ana juega en el parque.' },
      { q: '¿Quién juega con Ana?', answer: 'Leo', wrong: ['Tito', 'Mamá'], evidence: 'Su amigo Leo juega con ella.' },
    ],
  },
  // Nivel 2
  {
    id: 'huerto', level: 2, title: 'El huerto del abuelo', emoji: '🥕',
    text: 'El abuelo Pedro tiene un huerto detrás de su casa. Allí planta zanahorias y tomates. Cada mañana, Marta lo ayuda a regar las plantas con una regadera azul.',
    questions: [
      { q: '¿Dónde está el huerto?', answer: 'Detrás de la casa', wrong: ['En la montaña', 'Dentro de la escuela'], evidence: 'El abuelo Pedro tiene un huerto detrás de su casa.' },
      { q: '¿Qué planta el abuelo?', answer: 'Zanahorias y tomates', wrong: ['Manzanas y peras', 'Flores y árboles'], evidence: 'Allí planta zanahorias y tomates.' },
      { q: '¿Cuándo ayuda Marta?', answer: 'Cada mañana', wrong: ['Por la noche', 'Solo los domingos'], evidence: 'Cada mañana, Marta lo ayuda a regar las plantas con una regadera azul.' },
    ],
  },
  {
    id: 'perrito-perdido', level: 2, title: 'El perrito perdido', emoji: '🐶',
    text: 'Un día, Sami encontró un perrito en la calle. El perrito tenía frío y estaba solo. Sami lo llevó a casa y le dio agua. Luego buscaron juntos a su dueña.',
    questions: [
      { q: '¿Dónde encontró Sami al perrito?', answer: 'En la calle', wrong: ['En el colegio', 'En un árbol'], evidence: 'Un día, Sami encontró un perrito en la calle.' },
      { q: '¿Cómo estaba el perrito?', answer: 'Tenía frío y estaba solo', wrong: ['Estaba contento y jugando', 'Estaba comiendo'], evidence: 'El perrito tenía frío y estaba solo.' },
      { q: '¿Qué le dio Sami?', answer: 'Agua', wrong: ['Un juguete', 'Una manta'], evidence: 'Sami lo llevó a casa y le dio agua.' },
    ],
  },
  // Nivel 3
  {
    id: 'mariposa', level: 3, title: 'De oruga a mariposa', emoji: '🦋',
    text: 'Las mariposas no nacen con alas. Primero son una oruga pequeña que come muchas hojas. Después, la oruga se envuelve en un capullo y se queda quieta durante semanas. Al final, sale del capullo convertida en mariposa.',
    questions: [
      { q: '¿Qué es una mariposa antes de tener alas?', answer: 'Una oruga', wrong: ['Un pájaro', 'Una flor'], evidence: 'Primero son una oruga pequeña que come muchas hojas.' },
      { q: '¿Qué come la oruga?', answer: 'Hojas', wrong: ['Semillas', 'Insectos'], evidence: 'Primero son una oruga pequeña que come muchas hojas.' },
      { q: '¿Cuánto tiempo pasa la oruga en el capullo?', answer: 'Semanas', wrong: ['Unos minutos', 'Muchos años'], evidence: 'Después, la oruga se envuelve en un capullo y se queda quieta durante semanas.' },
    ],
  },
  {
    id: 'cumple-lola', level: 3, title: 'La sorpresa de Lola', emoji: '🎂',
    text: 'Era el cumpleaños de Lola, pero nadie le había dicho nada en todo el día. Lola estaba un poco triste. Por la tarde, al abrir la puerta de su casa, todos sus amigos gritaron: "¡Sorpresa!". Habían preparado una fiesta con globos y una tarta de chocolate.',
    questions: [
      { q: '¿Por qué estaba triste Lola?', answer: 'Nadie le había dicho nada', wrong: ['Estaba enferma', 'Perdió su juguete'], evidence: 'Era el cumpleaños de Lola, pero nadie le había dicho nada en todo el día.' },
      { q: '¿Qué pasó al abrir la puerta?', answer: 'Sus amigos le dieron una sorpresa', wrong: ['Empezó a llover', 'Encontró un gato'], evidence: 'Por la tarde, al abrir la puerta de su casa, todos sus amigos gritaron: "¡Sorpresa!".' },
      { q: '¿De qué era la tarta?', answer: 'De chocolate', wrong: ['De fresa', 'De limón'], evidence: 'Habían preparado una fiesta con globos y una tarta de chocolate.' },
    ],
  },
  // Nivel 4
  {
    id: 'agua', level: 4, title: 'El viaje del agua', emoji: '💧',
    text: 'El agua de los ríos y los mares se calienta con el sol y sube al cielo como vapor. Allí arriba hace frío, y el vapor se junta formando nubes. Cuando las nubes pesan mucho, el agua cae en forma de lluvia. La lluvia vuelve a los ríos y el viaje empieza otra vez. A esto se le llama el ciclo del agua.',
    questions: [
      { q: '¿Qué hace que el agua suba al cielo?', answer: 'El calor del sol', wrong: ['El viento', 'Los peces'], evidence: 'El agua de los ríos y los mares se calienta con el sol y sube al cielo como vapor.' },
      { q: '¿Qué se forma cuando el vapor se junta?', answer: 'Nubes', wrong: ['Montañas', 'Arcoíris'], evidence: 'Allí arriba hace frío, y el vapor se junta formando nubes.' },
      { q: '¿Cuál es la idea principal del texto?', answer: 'El agua viaja en un ciclo que se repite', wrong: ['Los ríos son muy largos', 'Las nubes son blancas'], evidence: 'La lluvia vuelve a los ríos y el viaje empieza otra vez. A esto se le llama el ciclo del agua.' },
    ],
  },
  {
    id: 'equipo', level: 4, title: 'El partido', emoji: '🏀',
    text: 'Diego era el más bajito del equipo de baloncesto y casi nunca encestaba. En el último partido, en vez de lanzar, pasó el balón a su compañera Irene, que estaba sola debajo de la canasta. Irene encestó y ganaron. El entrenador dijo que el mejor jugador no es el que más puntos marca, sino el que ayuda a su equipo.',
    questions: [
      { q: '¿Qué hizo Diego en vez de lanzar?', answer: 'Pasó el balón a Irene', wrong: ['Se sentó en el banco', 'Lanzó desde lejos'], evidence: 'En el último partido, en vez de lanzar, pasó el balón a su compañera Irene, que estaba sola debajo de la canasta.' },
      { q: '¿Por qué pasó el balón a Irene?', answer: 'Porque ella estaba sola debajo de la canasta', wrong: ['Porque estaba cansado', 'Porque Irene se lo pidió gritando'], evidence: 'En el último partido, en vez de lanzar, pasó el balón a su compañera Irene, que estaba sola debajo de la canasta.' },
      { q: '¿Qué enseñanza tiene la historia?', answer: 'Ayudar al equipo es lo más importante', wrong: ['Ser alto es lo más importante', 'Hay que lanzar siempre'], evidence: 'El entrenador dijo que el mejor jugador no es el que más puntos marca, sino el que ayuda a su equipo.' },
    ],
  },
  // Nivel 5
  {
    id: 'abejas', level: 5, title: 'Las abejas, pequeñas heroínas', emoji: '🐝',
    text: 'Aunque son muy pequeñas, las abejas tienen un trabajo enorme. Al volar de flor en flor para buscar néctar, llevan polen pegado a su cuerpo. Ese polen ayuda a que las plantas produzcan frutos y semillas. Sin las abejas, muchas frutas como las manzanas o las fresas serían muy difíciles de conseguir. Por eso, cuidar los lugares donde viven es cuidar también nuestra comida.',
    questions: [
      { q: '¿Qué buscan las abejas en las flores?', answer: 'Néctar', wrong: ['Agua', 'Hojas'], evidence: 'Al volar de flor en flor para buscar néctar, llevan polen pegado a su cuerpo.' },
      { q: '¿Para qué sirve el polen que llevan?', answer: 'Para que las plantas den frutos y semillas', wrong: ['Para construir su casa', 'Para defenderse'], evidence: 'Ese polen ayuda a que las plantas produzcan frutos y semillas.' },
      { q: '¿Qué quiere decir el autor en la última frase?', answer: 'Si cuidamos a las abejas, cuidamos nuestra comida', wrong: ['Las abejas son peligrosas', 'Las fresas no necesitan abejas'], evidence: 'Por eso, cuidar los lugares donde viven es cuidar también nuestra comida.' },
    ],
  },
  {
    id: 'faro', level: 5, title: 'El farero', emoji: '🗼',
    text: 'Don Ramón vivió cuarenta años en un faro junto al mar. Cada noche subía los ciento veinte escalones para encender la gran luz que guiaba a los barcos. Los marineros nunca lo vieron, pero todos sabían que, gracias a él, volvían a casa sanos y salvos. Cuando se jubiló, el pueblo entero subió al faro para darle las gracias.',
    questions: [
      { q: '¿Cuántos años vivió Don Ramón en el faro?', answer: 'Cuarenta', wrong: ['Ciento veinte', 'Diez'], evidence: 'Don Ramón vivió cuarenta años en un faro junto al mar.' },
      { q: '¿Para qué servía la luz del faro?', answer: 'Para guiar a los barcos', wrong: ['Para iluminar el pueblo', 'Para leer de noche'], evidence: 'Cada noche subía los ciento veinte escalones para encender la gran luz que guiaba a los barcos.' },
      { q: '¿Cómo se sentía el pueblo con Don Ramón?', answer: 'Agradecido', wrong: ['Enfadado', 'Aburrido'], evidence: 'Cuando se jubiló, el pueblo entero subió al faro para darle las gracias.' },
    ],
  },
];

export function passagesForLevel(level) {
  const exact = PASSAGES.filter((p) => p.level === level);
  return exact.length ? exact : PASSAGES.filter((p) => p.level <= level);
}

// Crea un ejercicio de lectura: un texto con una de sus preguntas.
// `avoid` permite no repetir la misma pregunta dentro de una sesión.
export function generateReadingProblem(level, rng = Math.random, avoid = new Set()) {
  const pool = passagesForLevel(level).flatMap((p) => p.questions.map((q, i) => ({ p, q, key: `${p.id}:${i}` })));
  const fresh = pool.filter((x) => !avoid.has(x.key));
  const { p, q, key } = pick(fresh.length ? fresh : pool, rng);
  return {
    subject: 'reading',
    type: 'comprehension',
    key,
    passage: { title: p.title, emoji: p.emoji, text: p.text },
    prompt: q.q,
    speech: q.q,
    answer: q.answer,
    choices: shuffle([q.answer, ...q.wrong], rng),
    evidence: q.evidence,
    hint: 'Vuelve a leer el texto. La respuesta está escondida en una de las frases.',
    steps: [
      `Primero leemos la pregunta con calma: "${q.q}"`,
      'Buscamos en el texto las palabras importantes de la pregunta.',
      `La frase que nos da la pista es: "${q.evidence}"`,
      `Por eso la respuesta es: ${q.answer}.`,
    ],
  };
}

// Divide un texto en palabras conservando la puntuación, para resaltarlas
// una a una mientras se lee en voz alta.
export function splitWords(text) {
  const out = [];
  const re = /\S+/g;
  let m;
  while ((m = re.exec(text))) out.push({ word: m[0], start: m.index, end: m.index + m[0].length });
  return out;
}
