// Juegos educativos. Cada juego recibe un contenedor y un contexto
// { level, speak, onFinish } y devuelve una función para limpiarlo.
import { generateMathProblem } from './math.js';
import { vocabForLevel } from './english.js';
import { shuffle, pick } from './random.js';
import { esc, confetti } from './ui.js';

export const GAMES = [
  { id: 'race', emoji: '🚀', name: 'Carrera de cohetes', desc: 'Resuelve sumas y restas rápidas para llegar a la Luna.', subject: 'math',
    rules: 'Carrera de cohetes. Resuelve 10 operaciones antes de que se acabe el tiempo. Cada respuesta correcta acerca tu cohete a la Luna. ¿Preparado? ¡Toca A jugar!' },
  { id: 'memory', emoji: '🃏', name: 'Memoria en inglés', desc: 'Encuentra las parejas de dibujo y palabra.', subject: 'english',
    rules: 'Memoria en inglés. Toca dos cartas. Si el dibujo y la palabra en inglés son pareja, se quedan abiertas. Escucha cómo se dice cada palabra. ¡Toca A jugar!' },
  { id: 'balloons', emoji: '🎈', name: 'Globos de palabras', desc: 'Escucha la palabra y explota el globo correcto.', subject: 'reading',
    rules: 'Globos de palabras. Escucha la palabra que te digo y explota el globo que la tiene escrita. Si no la oyes bien, toca Repetir. ¡Toca A jugar!' },
];

// ---------- Carrera de cohetes ----------

export function startRace(root, { level, onFinish, sfx = () => {} }) {
  const GOAL = 10;
  const SECONDS = 90;
  let done = 0;
  let mistakes = 0;
  let left = SECONDS;
  let problem;
  const gameLevel = Math.max(1, Math.min(level, 4));

  root.innerHTML = `
    <div class="race">
      <div class="race-hud"><span>⏱️ <b id="race-time">${SECONDS}</b> s</span><span>🌕 <b id="race-count">0</b> / ${GOAL}</span></div>
      <div class="race-track" aria-hidden="true"><span class="race-rocket" id="race-rocket">🚀</span><span class="race-moon">🌕</span></div>
      <div class="race-question" id="race-q" aria-live="polite"></div>
      <div class="choices" id="race-choices"></div>
    </div>`;

  const timer = setInterval(() => {
    left -= 1;
    root.querySelector('#race-time').textContent = left;
    if (left <= 0) finish();
  }, 1000);

  function next() {
    problem = generateMathProblem(gameLevel);
    root.querySelector('#race-q').textContent = problem.prompt;
    root.querySelector('#race-choices').innerHTML = problem.choices
      .map((c) => `<button class="choice" data-v="${esc(c)}">${esc(c)}</button>`)
      .join('');
  }

  function finish() {
    clearInterval(timer);
    const won = done >= GOAL;
    sfx(won ? 'fanfare' : 'levelUp');
    if (won) confetti();
    onFinish({
      title: won ? '¡Llegaste a la Luna!' : '¡Buen viaje!',
      message: `Resolviste ${done} operaciones${mistakes ? ` y aprendiste de ${mistakes} errores` : ''}.`,
      coins: done * 2 + (won ? 10 : 0),
    });
  }

  root.querySelector('#race-choices').addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.v === problem.answer) {
      done += 1;
      sfx('whoosh');
      root.querySelector('#race-count').textContent = done;
      root.querySelector('#race-rocket').style.left = `${(done / GOAL) * 85}%`;
      if (done >= GOAL) return finish();
      next();
    } else {
      mistakes += 1;
      sfx('wrong');
      btn.classList.add('wrong');
      btn.disabled = true;
    }
  });

  next();
  return () => clearInterval(timer);
}

// ---------- Memoria en inglés ----------

export function startMemory(root, { level, speak, onFinish, sfx = () => {} }) {
  const words = shuffle(vocabForLevel(Math.min(level, 3)), Math.random).slice(0, 6);
  const cards = shuffle(
    words.flatMap((w) => [
      { key: w.en, face: w.emoji, kind: 'emoji', word: w },
      { key: w.en, face: w.en, kind: 'word', word: w },
    ]),
  );
  let open = [];
  let matched = 0;
  let moves = 0;
  let locked = false;

  root.innerHTML = `
    <p class="game-tip">Toca dos cartas. Si el dibujo y la palabra en inglés coinciden, ¡son pareja!</p>
    <div class="memory-hud">Movimientos: <b id="mem-moves">0</b></div>
    <div class="memory-grid">
      ${cards.map((c, i) => `<button class="mem-card" data-i="${i}" aria-label="Carta ${i + 1}"><span class="mem-front">❓</span><span class="mem-back ${c.kind}">${esc(c.face)}</span></button>`).join('')}
    </div>`;

  let timeout;
  root.querySelector('.memory-grid').addEventListener('click', (e) => {
    const btn = e.target.closest('.mem-card');
    if (!btn || locked || btn.classList.contains('flipped')) return;
    const card = cards[Number(btn.dataset.i)];
    btn.classList.add('flipped');
    sfx('flip');
    btn.setAttribute('aria-label', card.face);
    if (card.kind === 'word') speak(card.word.en, { lang: 'en-US' });
    open.push({ btn, card });
    if (open.length < 2) return;

    moves += 1;
    root.querySelector('#mem-moves').textContent = moves;
    const [a, b] = open;
    if (a.card.key === b.card.key && a.card.kind !== b.card.kind) {
      a.btn.classList.add('matched');
      b.btn.classList.add('matched');
      sfx('correct');
      open = [];
      matched += 1;
      if (matched === words.length) {
        sfx('fanfare');
        confetti();
        timeout = setTimeout(() => onFinish({
          title: '¡Encontraste todas las parejas!',
          message: `Lo hiciste en ${moves} movimientos.`,
          coins: Math.max(10, 30 - Math.max(0, moves - words.length) * 2),
        }), 900);
      }
    } else {
      locked = true;
      timeout = setTimeout(() => {
        for (const o of open) {
          o.btn.classList.remove('flipped');
          o.btn.setAttribute('aria-label', 'Carta');
        }
        open = [];
        locked = false;
      }, 1100);
    }
  });
  return () => clearTimeout(timeout);
}

// ---------- Globos de palabras ----------

export const BALLOON_WORDS = {
  1: ['sol', 'mar', 'pan', 'luz', 'flor', 'mesa', 'casa', 'gato', 'pato', 'luna', 'mamá', 'papá'],
  2: ['perro', 'nube', 'libro', 'silla', 'fresa', 'tren', 'plato', 'globo', 'queso', 'jirafa'],
  3: ['mariposa', 'zapato', 'ventana', 'pelota', 'tortuga', 'bicicleta', 'escuela', 'guitarra', 'chocolate'],
};

export function startBalloons(root, { level, speak, onFinish, sfx = () => {} }) {
  const ROUNDS = 8;
  const pool = BALLOON_WORDS[Math.min(3, Math.max(1, level - 1))] || BALLOON_WORDS[1];
  let round = 0;
  let score = 0;
  let target;
  const colors = ['#ff6b6b', '#4d96ff', '#6bcb77', '#ffd93d', '#c77dff'];

  root.innerHTML = `
    <p class="game-tip">Escucha la palabra y toca el globo que la tiene escrita.</p>
    <div class="balloon-hud"><span>Ronda <b id="bal-round">1</b> / ${ROUNDS}</span><button class="btn small" id="bal-repeat">🔊 Repetir</button></div>
    <div class="balloon-field" id="bal-field"></div>`;

  function next() {
    round += 1;
    if (round > ROUNDS) {
      sfx(score >= ROUNDS - 1 ? 'fanfare' : 'levelUp');
      if (score >= ROUNDS - 1) confetti();
      onFinish({ title: '¡Fiesta de globos!', message: `Acertaste ${score} de ${ROUNDS} palabras.`, coins: score * 2 });
      return;
    }
    root.querySelector('#bal-round').textContent = round;
    target = pick(pool);
    const options = shuffle([target, ...shuffle(pool.filter((w) => w !== target)).slice(0, 3)]);
    root.querySelector('#bal-field').innerHTML = options
      .map((w, i) => `<button class="balloon" style="--c:${colors[(i + round) % colors.length]};--d:${i * 0.15}s" data-w="${esc(w)}">${esc(w)}</button>`)
      .join('');
    speak(target, { slow: true });
  }

  root.querySelector('#bal-repeat').addEventListener('click', () => speak(target, { slow: true }));
  let timeout;
  root.querySelector('#bal-field').addEventListener('click', (e) => {
    const btn = e.target.closest('.balloon');
    if (!btn || btn.disabled) return;
    root.querySelectorAll('.balloon').forEach((b) => { b.disabled = true; });
    if (btn.dataset.w === target) {
      score += 1;
      sfx('pop');
      btn.classList.add('pop');
    } else {
      sfx('wrong');
      btn.classList.add('wrong');
      root.querySelector(`.balloon[data-w="${CSS.escape(target)}"]`)?.classList.add('right');
    }
    timeout = setTimeout(next, 1300);
  });

  next();
  return () => clearTimeout(timeout);
}

export const STARTERS = { race: startRace, memory: startMemory, balloons: startBalloons };
