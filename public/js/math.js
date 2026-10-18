// Generador de problemas de matemáticas con explicaciones paso a paso.
import { randInt, pick, shuffle } from './random.js';

const PLACES = ['unidades', 'decenas', 'centenas', 'unidades de mil', 'decenas de mil'];
const OBJECTS = ['🍎', '⭐', '🐟', '🎈', '🍪', '🚗', '🌸', '⚽'];

function digits(n) {
  return String(n).split('').reverse().map(Number);
}

function countList(from, count, dir) {
  const out = [];
  for (let i = 1; i <= count; i++) out.push(from + dir * i);
  return out.join(', ');
}

// ---------- Explicaciones ----------

export function explainAddition(a, b) {
  const result = a + b;
  if (a < 10 && b < 10) {
    const big = Math.max(a, b);
    const small = Math.min(a, b);
    return [
      `Empezamos por el número más grande: ${big}.`,
      small === 0
        ? `Sumar 0 no cambia nada, así que seguimos en ${big}.`
        : `Ahora contamos ${small} más con los dedos: ${countList(big, small, 1)}.`,
      `¡Llegamos a ${result}! Entonces ${a} + ${b} = ${result}.`,
    ];
  }

  const da = digits(a);
  const db = digits(b);
  const len = Math.max(da.length, db.length);
  const steps = [`Ponemos los números uno debajo del otro, alineando las unidades: ${a} y ${b}.`];
  let carry = 0;
  for (let i = 0; i < len; i++) {
    const x = da[i] ?? 0;
    const y = db[i] ?? 0;
    const sum = x + y + carry;
    const parts = carry ? `${x} + ${y} + ${carry} (que llevábamos)` : `${x} + ${y}`;
    const place = PLACES[i];
    const last = i === len - 1;
    if (sum >= 10 && !last) {
      steps.push(`Sumamos las ${place}: ${parts} = ${sum}. Escribimos ${sum % 10} y llevamos 1 a las ${PLACES[i + 1]}.`);
      carry = 1;
    } else {
      steps.push(`Sumamos las ${place}: ${parts} = ${sum}. Escribimos ${sum}.`);
      carry = 0;
    }
  }
  steps.push(`El resultado es ${result}. Entonces ${a} + ${b} = ${result}.`);
  return steps;
}

export function explainSubtraction(a, b) {
  const result = a - b;
  if (a <= 20 && b <= 10) {
    return [
      `Empezamos en ${a}.`,
      b === 0
        ? `Quitar 0 no cambia nada, seguimos en ${a}.`
        : `Contamos ${b} hacia atrás: ${countList(a, b, -1)}.`,
      `¡Llegamos a ${result}! Entonces ${a} - ${b} = ${result}.`,
    ];
  }

  const da = digits(a);
  const db = digits(b);
  const steps = [`Ponemos ${a} arriba y ${b} abajo, alineando las unidades.`];
  let borrow = 0;
  for (let i = 0; i < da.length; i++) {
    let x = da[i] - borrow;
    const y = db[i] ?? 0;
    const place = PLACES[i];
    if (i >= db.length && borrow === 0) {
      steps.push(`En las ${place} no hay nada que quitar: bajamos el ${x}.`);
      continue;
    }
    if (borrow && da[i] === 0) {
      // Un 0 no puede prestar: pide a su vecino, se convierte en 10 y presta 1.
      x = 9;
      steps.push(`En las ${place} hay un 0 y no puede prestar. Pide 1 a las ${PLACES[i + 1]}, se convierte en 10, presta 1 y queda en 9. Ahora: 9 - ${y} = ${9 - y}.`);
      continue;
    }
    const prefix = borrow ? `Como prestamos 1, el ${da[i]} ahora es ${x}. ` : '';
    if (x < y) {
      steps.push(`${prefix}En las ${place}, a ${x} no le podemos quitar ${y}. Pedimos prestada 1 a las ${PLACES[i + 1]}: ${x} se convierte en ${x + 10}. ${x + 10} - ${y} = ${x + 10 - y}.`);
      borrow = 1;
    } else {
      steps.push(`${prefix}En las ${place}: ${x} - ${y} = ${x - y}.`);
      borrow = 0;
    }
  }
  steps.push(`El resultado es ${result}. Para comprobarlo sumamos: ${result} + ${b} = ${a}. ¡Correcto!`);
  return steps;
}

export function explainMultiplication(a, b) {
  const result = a * b;
  if (a >= 10 && b < 10) {
    const tens = Math.floor(a / 10) * 10;
    const units = a % 10;
    return [
      `Partimos ${a} en dos partes fáciles: ${tens} y ${units}.`,
      `Multiplicamos ${tens} × ${b} = ${tens * b}.`,
      `Multiplicamos ${units} × ${b} = ${units * b}.`,
      `Sumamos las dos partes: ${tens * b} + ${units * b} = ${result}. Entonces ${a} × ${b} = ${result}.`,
    ];
  }
  if (b === 0 || a === 0) {
    return [`Cualquier número multiplicado por 0 da 0.`, `Entonces ${a} × ${b} = 0.`];
  }
  const repeated = Array(b).fill(a).join(' + ');
  const steps = [`${a} × ${b} significa "${b} grupos de ${a}".`];
  if (b <= 5) {
    steps.push(`Sumamos ${a}, ${b} veces: ${repeated} = ${result}.`);
  } else {
    const skip = Array.from({ length: b }, (_, i) => a * (i + 1)).join(', ');
    steps.push(`Contamos de ${a} en ${a}, ${b} veces: ${skip}.`);
  }
  if (a === 9 || b === 9) {
    const other = a === 9 ? b : a;
    steps.push(`Truco del 9: ${other} × 10 = ${other * 10}, y le quitamos ${other}: ${other * 10} - ${other} = ${result}.`);
  }
  steps.push(`Entonces ${a} × ${b} = ${result}.`);
  return steps;
}

export function explainDivision(a, b) {
  if (b === 0) return ['No se puede dividir entre 0. ¡Nadie puede repartir en 0 grupos!'];
  const q = Math.floor(a / b);
  const r = a % b;
  const steps = [`${a} ÷ ${b} significa repartir ${a} en grupos de ${b}. ¿Cuántos grupos salen?`];
  if (q <= 12) {
    const skip = Array.from({ length: q }, (_, i) => b * (i + 1)).join(', ');
    steps.push(q === 0 ? `${b} es más grande que ${a}, así que no sale ningún grupo completo.` : `Contamos de ${b} en ${b}: ${skip}. Son ${q} saltos.`);
  } else {
    steps.push(`Buscamos qué número por ${b} se acerca más a ${a} sin pasarse: ${q} × ${b} = ${q * b}.`);
  }
  if (r === 0) {
    steps.push(`Comprobamos multiplicando: ${q} × ${b} = ${a}. Entonces ${a} ÷ ${b} = ${q}.`);
  } else {
    steps.push(`Sobran ${a} - ${q * b} = ${r}. Ese es el resto.`);
    steps.push(`Entonces ${a} ÷ ${b} = ${q} y sobran ${r}.`);
  }
  return steps;
}

export function explain(op, a, b) {
  switch (op) {
    case '+': return explainAddition(a, b);
    case '-': return explainSubtraction(a, b);
    case '×': return explainMultiplication(a, b);
    case '÷': return explainDivision(a, b);
    default: return [];
  }
}

export function compute(op, a, b) {
  switch (op) {
    case '+': return a + b;
    case '-': return a - b;
    case '×': return a * b;
    case '÷': return b === 0 ? NaN : Math.floor(a / b);
    default: return NaN;
  }
}

const SPOKEN = { '+': 'más', '-': 'menos', '×': 'por', '÷': 'entre' };

// ---------- Opciones de respuesta ----------

export function makeChoices(answer, rng = Math.random, count = 4) {
  const set = new Set([answer]);
  const spread = Math.max(3, Math.round(Math.abs(answer) * 0.2));
  const candidates = [answer + 1, answer - 1, answer + 10, answer - 10, answer + 2, answer - 2];
  for (const c of shuffle(candidates, rng)) {
    if (set.size >= count) break;
    if (c >= 0) set.add(c);
  }
  let guard = 0;
  while (set.size < count && guard++ < 100) {
    const c = answer + randInt(-spread, spread, rng);
    if (c >= 0) set.add(c);
  }
  return shuffle([...set].map(String), rng);
}

// ---------- Generación por nivel ----------

function operationFor(level, rng) {
  switch (level) {
    case 1: {
      if (rng() < 0.6) {
        const a = randInt(1, 9, rng);
        const b = randInt(0, 10 - a, rng);
        return ['+', a, b];
      }
      const a = randInt(2, 10, rng);
      return ['-', a, randInt(0, a, rng)];
    }
    case 2: {
      const r = rng();
      if (r < 0.35) {
        const a = randInt(5, 15, rng);
        return ['+', a, randInt(1, 20 - a, rng)];
      }
      if (r < 0.7) {
        const a = randInt(10, 20, rng);
        return ['-', a, randInt(1, Math.min(10, a), rng)];
      }
      // Dos cifras sin llevar.
      const a = randInt(1, 6, rng) * 10 + randInt(0, 5, rng);
      const b = randInt(1, 3, rng) * 10 + randInt(0, 4, rng);
      return ['+', a, b];
    }
    case 3: {
      const r = rng();
      if (r < 0.4) {
        const a = randInt(15, 69, rng);
        const b = randInt(11, 29, rng);
        return ['+', a, b];
      }
      if (r < 0.8) {
        const a = randInt(30, 99, rng);
        return ['-', a, randInt(11, a - 5, rng)];
      }
      return ['×', randInt(1, 10, rng), pick([2, 5, 10], rng)];
    }
    case 4: {
      if (rng() < 0.7) return ['×', randInt(2, 10, rng), randInt(2, 10, rng)];
      const b = randInt(2, 9, rng);
      return ['÷', b * randInt(2, 10, rng), b];
    }
    default: {
      const r = rng();
      if (r < 0.4) {
        const b = randInt(2, 9, rng);
        return ['÷', b * randInt(3, 12, rng), b];
      }
      if (r < 0.7) return ['×', randInt(11, 49, rng), randInt(2, 9, rng)];
      const a = randInt(100, 499, rng);
      return [pick(['+', '-'], rng), a, randInt(100, a - 1, rng)];
    }
  }
}

const STORIES = [
  {
    op: '+',
    make: (a, b) => `Lucía tiene ${a} cromos y su abuela le regala ${b} más. ¿Cuántos cromos tiene ahora?`,
    data: (a, b) => `Datos: Lucía tiene ${a} cromos y le regalan ${b}.`,
    why: '"Le regalan más" significa que juntamos: es una suma.',
    unit: 'cromos',
  },
  {
    op: '-',
    make: (a, b) => `En el autobús van ${a} personas. En la parada se bajan ${b}. ¿Cuántas personas quedan?`,
    data: (a, b) => `Datos: hay ${a} personas y se bajan ${b}.`,
    why: '"Se bajan" significa que quitamos: es una resta.',
    unit: 'personas',
  },
  {
    op: '×',
    make: (a, b) => `Hay ${b} cajas y en cada caja hay ${a} lápices. ¿Cuántos lápices hay en total?`,
    data: (a, b) => `Datos: ${b} cajas con ${a} lápices cada una.`,
    why: '"Cada caja tiene lo mismo" significa grupos iguales: es una multiplicación.',
    unit: 'lápices',
  },
  {
    op: '÷',
    make: (a, b) => `Mamá reparte ${a} galletas entre ${b} niños por igual. ¿Cuántas galletas recibe cada niño?`,
    data: (a, b) => `Datos: ${a} galletas para ${b} niños.`,
    why: '"Repartir por igual" significa dividir.',
    unit: 'galletas',
  },
];

function storyNumbers(op, rng) {
  switch (op) {
    case '+': return [randInt(12, 60, rng), randInt(5, 39, rng)];
    case '-': { const a = randInt(20, 60, rng); return [a, randInt(5, a - 3, rng)]; }
    case '×': return [randInt(3, 9, rng), randInt(2, 8, rng)];
    default: { const b = randInt(2, 6, rng); return [b * randInt(2, 8, rng), b]; }
  }
}

export function generateWordProblem(rng = Math.random) {
  const story = pick(STORIES, rng);
  const [a, b] = storyNumbers(story.op, rng);
  const answer = compute(story.op, a, b);
  const text = story.make(a, b);
  return {
    subject: 'math',
    type: 'word',
    prompt: text,
    speech: text,
    answer: String(answer),
    choices: makeChoices(answer, rng),
    hint: story.why,
    steps: [
      'Leemos el problema despacio y buscamos los números.',
      story.data(a, b),
      story.why,
      ...explain(story.op, a, b),
      `Respuesta: ${answer} ${story.unit}.`,
    ],
  };
}

export function generateMathProblem(level, rng = Math.random) {
  if (level >= 5 && rng() < 0.3) return generateWordProblem(rng);
  const [op, a, b] = operationFor(level, rng);
  const answer = compute(op, a, b);
  const problem = {
    subject: 'math',
    type: op,
    prompt: `${a} ${op} ${b} = ?`,
    speech: `¿Cuánto es ${a} ${SPOKEN[op]} ${b}?`,
    answer: String(answer),
    choices: makeChoices(answer, rng),
    hint: hintFor(op, a, b),
    steps: explain(op, a, b),
  };
  if (level === 1) {
    const emoji = pick(OBJECTS, rng);
    problem.visual = op === '+'
      ? `${emoji.repeat(a)} + ${emoji.repeat(b)}`
      : `${emoji.repeat(a)} − ${b}`;
  }
  return problem;
}

function hintFor(op, a, b) {
  switch (op) {
    case '+': return a < 10 && b < 10 ? `Empieza en ${Math.max(a, b)} y cuenta hacia arriba.` : 'Empieza sumando las unidades (el número de la derecha).';
    case '-': return a <= 20 && b <= 10 ? `Empieza en ${a} y cuenta hacia atrás.` : 'Empieza por las unidades. Si arriba hay menos, pide prestado.';
    case '×': return `Piensa en ${b} grupos de ${a}.`;
    case '÷': return `¿Qué número multiplicado por ${b} da ${a}?`;
    default: return '';
  }
}

// ---------- Ayuda con la tarea (sin conexión) ----------

const WORD_OPS = [
  [/dividido\s+(entre|por)|entre/g, '/'],
  [/multiplicado\s+por|por|veces/g, '*'],
  [/m[aá]s/g, '+'],
  [/menos/g, '-'],
];

// Intenta entender una operación escrita por el niño, como "23 + 48",
// "7x8", "56 : 7" o "cuánto es 9 por 6".
export function parseExpression(text) {
  let s = String(text || '').toLowerCase();
  for (const [re, sym] of WORD_OPS) s = s.replace(re, ` ${sym} `);
  s = s.replace(/[×xX]/g, '*').replace(/[÷:]/g, '/').replace(/−/g, '-');
  const m = s.match(/(\d+)\s*([+\-*/])\s*(\d+)/);
  if (!m) return null;
  const opMap = { '+': '+', '-': '-', '*': '×', '/': '÷' };
  return { op: opMap[m[2]], a: Number(m[1]), b: Number(m[3]) };
}

export function solveExpression(text) {
  const parsed = parseExpression(text);
  if (!parsed) return null;
  const { op, a, b } = parsed;
  if (op === '-' && b > a) {
    return {
      intro: `Vamos a resolver ${a} - ${b}.`,
      steps: [
        `${b} es más grande que ${a}, así que el resultado será un número negativo (menor que cero).`,
        `Primero restamos al revés: ${b} - ${a} = ${b - a}.`,
        `Como quitamos más de lo que teníamos, ponemos un signo menos: ${a} - ${b} = -${b - a}.`,
      ],
      answer: String(a - b),
      tryIt: `Ahora prueba tú: ¿cuánto es ${b} - ${a}?`,
    };
  }
  const steps = explain(op, a, b);
  const answer = op === '÷' && b !== 0 && a % b !== 0
    ? `${Math.floor(a / b)} y sobran ${a % b}`
    : String(compute(op, a, b));
  return {
    intro: `Vamos a resolver ${a} ${op} ${b} paso a paso.`,
    steps,
    answer,
    tryIt: practiceFor(op, a, b),
  };
}

function practiceFor(op, a, b) {
  const a2 = Math.max(1, a + (a > 5 ? -1 : 1));
  if (op === '÷') return `Ahora prueba tú: ¿cuánto es ${b * 3} ÷ ${b}?`;
  if (op === '-' && a2 < b) return `Ahora prueba tú: ¿cuánto es ${a + 1} - ${b}?`;
  return `Ahora prueba tú: ¿cuánto es ${a2} ${op} ${b}?`;
}
