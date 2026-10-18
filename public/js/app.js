// Aprende Conmigo AI: navegación y pantallas principales.
import { loadState, saveState, createProfile, hashPin } from './storage.js';
import { recordAnswer, LEVEL_NAMES, clampLevel, startingLevel, newSkill } from './adaptive.js';
import { generateMathProblem } from './math.js';
import { generateReadingProblem, splitWords } from './reading.js';
import { generateEnglishProblem } from './english.js';
import { coinsForAnswer, newBadges, BADGES, SHOP, buy } from './rewards.js';
import { summarize, recommendations, recentAccuracy, SUBJECTS } from './stats.js';
import { speak, stopSpeaking, configureSpeech, speechSupported, dictate, dictationSupported } from './speech.js';
import { askTutor, aiReachable } from './tutor.js';
import { GAMES, STARTERS } from './games.js';
import { esc, $, toast, confetti, avatarHtml, ICONS } from './ui.js';

const SESSION_LENGTH = 8;
const AVATARS = ['🐻', '🐰', '🐸', '🐵', '🐧', '🐯', '🐨', '🐙'];
const PRAISE = ['¡Muy bien!', '¡Genial!', '¡Lo lograste!', '¡Eres un crack!', '¡Fantástico!', '¡Así se hace!'];
const ENCOURAGE = ['¡Casi! Vamos a verlo juntos paso a paso.', 'No pasa nada, equivocarse es aprender. Mira cómo se hace.', '¡Buen intento! Te explico el truco.'];

const app = document.getElementById('app');
let state = loadState();
let view = { name: 'profiles' };
let cleanup = null;

configureSpeech({ rate: state.settings.voiceRate });

function profile() {
  return state.profiles.find((p) => p.id === state.activeId) || null;
}

function save() {
  saveState(state);
}

function updateProfile(next) {
  state.profiles = state.profiles.map((p) => (p.id === next.id ? next : p));
  save();
}

function say(text, opts) {
  return speak(text, opts);
}

let introActive = Boolean(document.getElementById('intro'));

function autoSay(text, opts) {
  if (state.settings.autoRead && !introActive) say(text, opts);
}

function go(name, params = {}) {
  stopSpeaking();
  cleanup?.();
  cleanup = null;
  view = { name, ...params };
  render();
  window.scrollTo({ top: 0 });
  app.focus({ preventScroll: true });
}

// ---------- Barra superior ----------

function topBar({ back = 'home', title = '' } = {}) {
  const p = profile();
  return `
    <header class="topbar">
      ${back ? `<button class="round-btn" data-go="${back}" aria-label="Volver">${ICONS.back}</button>` : '<span></span>'}
      <h1 class="topbar-title">${esc(title)}</h1>
      ${p ? `<div class="wallet" aria-label="${p.stars} estrellas y ${p.coins} monedas"><span>⭐ ${p.stars}</span><span>🪙 ${p.coins}</span></div>` : '<span></span>'}
    </header>`;
}

// ---------- Navegación inferior ----------

const NAV = [
  { go: 'home', label: 'Inicio', icon: 'home' },
  { go: 'games', label: 'Juegos', icon: 'game' },
  { go: 'rewards', label: 'Premios', icon: 'gift' },
  { go: 'profile', label: 'Perfil', icon: 'user' },
];

function bottomNav(active) {
  return `
    <nav class="bottom-nav" aria-label="Menú principal">
      ${NAV.map((n) => `<button class="nav-item ${n.go === active ? 'on' : ''}" data-go="${n.go}" ${n.go === active ? 'aria-current="page"' : ''}>${ICONS[n.icon]}<span>${n.label}</span></button>`).join('')}
    </nav>`;
}

// ---------- Bienvenida y perfiles ----------

function renderProfiles() {
  const cards = state.profiles
    .map((p) => `<button class="profile-card" data-pick="${p.id}">${avatarHtml(p, 'xl')}<span class="profile-name">${esc(p.name)}</span></button>`)
    .join('');
  app.innerHTML = `
    <section class="hero">
      <div class="hero-deco" aria-hidden="true">
        <span class="deco abc">ABC</span><span class="deco ab">AB</span><span class="deco three">3</span><span class="deco b">B</span>
        <span class="deco star-face">⭐</span><span class="deco s1">✦</span><span class="deco s2">✦</span><span class="deco s3">★</span><span class="deco s4">★</span>
        <span class="deco book">📖</span><span class="deco pencil">✏️</span>
        <span class="block block-a">A</span><span class="block block-1">1</span>
      </div>
      <p class="hero-brand">🦉 Aprende Conmigo AI</p>
      <h1 class="hero-title"><span>Aprende</span><span class="yellow">¡Jugando!</span></h1>
      <div class="hero-art" aria-hidden="true">
        <span class="hero-kid">🦉</span><span class="hero-friend">🐼</span>
        <span class="cloud"></span>
      </div>
      <button class="btn primary pill" data-action="start">Empezar a aprender</button>
    </section>
    <div class="sheet-backdrop ${view.sheet ? 'open' : ''}" data-action="close-sheet"></div>
    <section class="sheet ${view.sheet ? 'open' : ''}" aria-label="Elegir perfil" ${view.sheet ? '' : 'hidden'}>
      <span class="sheet-handle" aria-hidden="true"></span>
      <h2 class="sheet-title">¿Quién va a aprender hoy?</h2>
      <div class="profile-grid">
        ${cards}
        <button class="profile-card add" data-go="newProfile"><span class="avatar xl" aria-hidden="true">➕</span><span class="profile-name">Nuevo</span></button>
      </div>
      <button class="link-btn" data-go="parents">👨‍👩‍👧 Zona de padres</button>
    </section>`;
  if (view.sheet) autoSay('¿Quién va a aprender hoy?');
}

function renderNewProfile() {
  app.innerHTML = `
    ${topBar({ back: 'profiles', title: 'Nuevo perfil' })}
    <form class="screen card form" id="new-profile">
      <label>¿Cómo te llamas?
        <input name="name" maxlength="30" required autocomplete="off" placeholder="Tu nombre">
      </label>
      <label>¿Cuántos años tienes?
        <select name="age">${[5, 6, 7, 8, 9, 10, 11, 12, 13].map((a) => `<option ${a === 8 ? 'selected' : ''}>${a}</option>`).join('')}</select>
      </label>
      <fieldset>
        <legend>Elige tu personaje</legend>
        <div class="avatar-pick">
          ${AVATARS.map((a, i) => `<label><input type="radio" name="avatar" value="${a}" ${i === 0 ? 'checked' : ''}><span class="avatar lg">${a}</span></label>`).join('')}
        </div>
      </fieldset>
      <button class="btn primary big" type="submit">¡Empezar! 🚀</button>
    </form>`;
  $('#new-profile').addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    const p = createProfile({ name: data.get('name'), age: data.get('age'), avatar: data.get('avatar') });
    state.profiles.push(p);
    state.activeId = p.id;
    save();
    go('home');
  });
  autoSay('¿Cómo te llamas? Escribe tu nombre y elige tu personaje.');
}

// ---------- Inicio ----------

const DAILY_BONUS = 20;

const CATEGORIES = [
  { lesson: 'math', art: '<span class="art-123"><b>1</b><b>2</b><b>3</b></span>', name: 'Números', sub: 'Matemáticas', color: 'blue' },
  { lesson: 'reading', art: '<span class="art-abc"><b>A</b><b>B</b><b>C</b></span>', name: 'Lectura', sub: 'Cuentos', color: 'yellow' },
  { lesson: 'english', art: '<span class="art-emoji">🦁</span><span class="art-bubble">Hello!</span>', name: 'Inglés', sub: 'Palabras', color: 'green' },
  { go: 'homework', art: '<span class="art-emoji">📝</span><span class="art-emoji small">✨</span>', name: 'Mi tarea', sub: 'Ayuda paso a paso', color: 'pink' },
];

function today() {
  return new Date().toDateString();
}

function dailyDone(p) {
  return p.dailyDoneOn === today();
}

// La materia que más le cuesta: menos aciertos recientes o nivel más bajo.
function weakestSubject(p) {
  const score = (key) => {
    const items = p.history.filter((h) => h.subject === key).slice(-20);
    const acc = items.length ? items.filter((h) => h.correct).length / items.length : 0.5;
    return acc + p.skills[key].level / 10;
  };
  return Object.keys(SUBJECTS).reduce((a, b) => (score(b) < score(a) ? b : a));
}

function renderHome() {
  const p = profile();
  if (!p) return go('profiles');
  const unseen = p.badges.length > (p.seenBadges || 0);
  const done = dailyDone(p);
  const cats = CATEGORIES.map((c) => {
    const level = c.lesson ? p.skills[c.lesson].level : null;
    return `
      <button class="cat-card" ${c.lesson ? `data-lesson="${c.lesson}"` : `data-go="${c.go}"`}>
        <span class="cat-art ${c.color}" aria-hidden="true">${c.art}</span>
        <span class="cat-name">${c.name}</span>
        <span class="cat-sub">${level ? `Nivel ${level} · ${LEVEL_NAMES[level]}` : c.sub}</span>
      </button>`;
  }).join('');

  app.innerHTML = `
    <section class="screen with-nav">
      <header class="home-head">
        <button class="home-avatar" data-go="profile" aria-label="Mi perfil">${avatarHtml(p, 'md')}</button>
        <div class="home-hello">
          <p class="home-name">Hola, ${esc(p.name)}</p>
          <p class="home-sub">¡Vamos a aprender algo nuevo!</p>
        </div>
        <button class="round-btn bell" data-action="bell" aria-label="${unseen ? 'Tienes medallas nuevas' : 'Avisos'}">${ICONS.bell}${unseen ? '<span class="dot"></span>' : ''}</button>
      </header>

      <div class="challenge ${done ? 'done' : ''}">
        <div class="challenge-text">
          <h2>Reto diario</h2>
          <p>${done ? '¡Reto completado! Vuelve mañana para otro.' : `Completa una lección y gana ${DAILY_BONUS} monedas extra.`}</p>
          ${done ? '<span class="challenge-ok">✅ Hecho</span>' : '<button class="btn white" data-action="daily">¡Vamos!</button>'}
        </div>
        <span class="trophy" aria-hidden="true">🏆</span>
        <span class="c-star c1" aria-hidden="true">⭐</span><span class="c-star c2" aria-hidden="true">⭐</span>
      </div>

      <h2 class="section-title">Categorías</h2>
      <div class="cat-grid">${cats}</div>
    </section>
    ${bottomNav('home')}`;
  autoSay(`¡Hola, ${p.name}! ¿Qué quieres aprender hoy?`);
}

function renderProfile() {
  const p = profile();
  if (!p) return go('profiles');
  const sum = summarize(p.history);
  const levels = Object.entries(SUBJECTS).map(([key, s]) => {
    const lvl = p.skills[key].level;
    return `
      <li class="level-row">
        <span class="level-emoji" aria-hidden="true">${s.emoji}</span>
        <span class="level-info"><b>${s.name}</b><small>Nivel ${lvl} · ${LEVEL_NAMES[lvl]}</small></span>
        <span class="level-dots" aria-label="Nivel ${lvl} de 5">${[1, 2, 3, 4, 5].map((l) => `<i class="${l <= lvl ? 'on' : ''}"></i>`).join('')}</span>
      </li>`;
  }).join('');
  app.innerHTML = `
    <section class="screen with-nav">
      <div class="profile-hero">
        ${avatarHtml(p, 'xxl')}
        <h1 class="profile-title">${esc(p.name)}</h1>
        <p class="profile-age">${p.age} años</p>
        <div class="result-row">
          <div class="result"><b>⭐ ${p.stars}</b><span>estrellas</span></div>
          <div class="result"><b>🪙 ${p.coins}</b><span>monedas</span></div>
          <div class="result"><b>🏅 ${p.badges.length}</b><span>medallas</span></div>
        </div>
      </div>
      <div class="card">
        <h2 class="card-title">Mis niveles</h2>
        <ul class="level-list">${levels}</ul>
        <p class="note">Has hecho ${sum.answered} ejercicios. ¡Sigue así!</p>
      </div>
      <div class="list-card">
        <button class="list-item" data-go="homework"><span aria-hidden="true">📝</span>Ayuda con mi tarea<span class="chev" aria-hidden="true">›</span></button>
        <button class="list-item" data-action="switch-kid"><span aria-hidden="true">👫</span>Cambiar de jugador<span class="chev" aria-hidden="true">›</span></button>
        <button class="list-item" data-go="parents"><span aria-hidden="true">👨‍👩‍👧</span>Zona de padres<span class="chev" aria-hidden="true">›</span></button>
      </div>
    </section>
    ${bottomNav('profile')}`;
}

// ---------- Lecciones ----------

function makeProblem(subject, level, seen) {
  if (subject === 'math') return generateMathProblem(level);
  if (subject === 'reading') return generateReadingProblem(level, Math.random, seen);
  return generateEnglishProblem(level);
}

function startLesson(subject) {
  view = {
    name: 'lesson',
    subject,
    index: 0,
    correct: 0,
    coins: 0,
    stars: 0,
    seen: new Set(),
    levelStart: profile().skills[subject].level,
  };
  nextProblem();
}

function nextProblem() {
  const p = profile();
  const level = p.skills[view.subject].level;
  const problem = makeProblem(view.subject, level, view.seen);
  if (problem.key) view.seen.add(problem.key);
  Object.assign(view, { problem, attempts: 0, recorded: false, solved: false, stepIndex: -1, startedAt: Date.now() });
  render();
  readQuestion();
}

function readQuestion() {
  const pr = view.problem;
  if (!state.settings.autoRead) return;
  if (pr.speechLang) say(pr.speech, { lang: pr.speechLang, slow: true });
  else say(pr.speech);
}

// Qué se dibuja en la escena ilustrada de cada pregunta.
function sceneFor(pr) {
  if (pr.scene) return pr.scene;
  if (pr.subject === 'math' && pr.type === 'word') return { emoji: '🧮' };
  if (pr.subject === 'math') return { text: pr.prompt, sub: pr.visual, math: true };
  return {};
}

function questionFor(pr) {
  if (pr.question) return pr.question;
  if (pr.subject === 'math' && pr.type !== 'word') return pr.speech;
  return pr.prompt;
}

function sceneHtml(pr) {
  if (pr.passage) {
    return `
      <article class="passage card">
        <div class="passage-head"><span class="passage-emoji" aria-hidden="true">${esc(pr.passage.emoji)}</span><h2>${esc(pr.passage.title)}</h2>
        <button class="btn small soft-purple" data-action="read-passage">${ICONS.speaker} Leer en voz alta</button></div>
        <p class="passage-text" id="passage-text">${passageHtml(pr.passage.text)}</p>
      </article>`;
  }
  const sc = sceneFor(pr);
  let content = '';
  if (sc.listen) {
    content = `<button class="play-btn" data-action="speak-question" aria-label="Escuchar la palabra">${ICONS.speaker}<span>Escuchar</span></button>`;
  } else {
    content = `
      ${sc.emoji ? `<span class="scene-emoji" aria-hidden="true">${esc(sc.emoji)}</span>` : ''}
      ${sc.text ? `<span class="scene-bubble ${sc.math ? 'math' : ''}">${esc(sc.text)}</span>` : ''}
      ${sc.sub ? `<span class="scene-sub" aria-hidden="true">${esc(sc.sub)}</span>` : ''}`;
  }
  return `
    <div class="scene ${view.subject}">
      <span class="sky-cloud k1" aria-hidden="true"></span><span class="sky-cloud k2" aria-hidden="true"></span>
      <span class="hill h1" aria-hidden="true"></span><span class="hill h2" aria-hidden="true"></span>
      <span class="tree t1" aria-hidden="true">🌳</span><span class="tree t2" aria-hidden="true">🌳</span>
      <div class="scene-content">${content}</div>
    </div>`;
}

function renderLesson() {
  const pr = view.problem;
  const s = SUBJECTS[view.subject];
  const p = profile();
  const level = p.skills[view.subject].level;
  const emojiChoices = pr.bigChoices;
  const dashes = Array.from({ length: SESSION_LENGTH }, (_, i) => `<i class="${i < view.index ? 'done' : i === view.index ? 'now' : ''}"></i>`).join('');
  const last = view.index + 1 >= SESSION_LENGTH;

  app.innerHTML = `
    <section class="screen lesson ${view.subject}">
      <header class="lesson-head">
        <button class="round-btn" data-go="home" aria-label="Salir de la lección">${ICONS.back}</button>
        <div class="lesson-progress" role="progressbar" aria-valuemin="0" aria-valuemax="${SESSION_LENGTH}" aria-valuenow="${view.index}" aria-label="Pregunta ${view.index + 1} de ${SESSION_LENGTH}">
          <b>${view.index + 1}/${SESSION_LENGTH}</b>
          <span class="dashes">${dashes}</span>
        </div>
        <button class="round-btn" data-action="menu" aria-label="Más opciones" aria-expanded="false" aria-controls="lesson-menu">${ICONS.more}</button>
          <div class="popover" id="lesson-menu" role="menu" hidden>
            <p class="popover-title">${s.emoji} ${s.name} · Nivel ${level} (${LEVEL_NAMES[level]})</p>
            <button role="menuitem" data-action="hint">💡 Pista</button>
            <button role="menuitem" data-action="steps">🪜 Paso a paso</button>
            <button role="menuitem" data-action="toggle-voice">🔊 Leer en voz alta: <b id="voice-state">${state.settings.autoRead ? 'Sí' : 'No'}</b></button>
            <button role="menuitem" data-go="home">🏠 Salir</button>
          </div>
      </header>

      ${sceneHtml(pr)}

      <div class="question">
        <p class="question-text">${esc(questionFor(pr))}</p>
        <button class="speak-chip" data-action="speak-question" aria-label="Escuchar la pregunta">${ICONS.speaker}</button>
      </div>

      <div class="choices ${emojiChoices ? 'big' : ''}" id="choices">
        ${pr.choices.map((c) => `<button class="choice" data-answer="${esc(c)}"><span>${esc(c)}</span></button>`).join('')}
      </div>
      ${pr.sayChoicesIn ? `<button class="link-btn center-link" data-action="speak-choices">${ICONS.speaker} Escuchar las opciones en inglés</button>` : ''}

      <div class="feedback" id="feedback" aria-live="polite"></div>
      <div class="helpers">
        <button class="chip" data-action="hint">💡 Pista</button>
        <button class="chip" data-action="steps">🪜 Paso a paso</button>
      </div>
      <div class="steps card hidden" id="steps"></div>

      <div class="bottom-action">
        <button class="btn primary pill" id="next-btn" data-action="next" disabled>${last ? 'Terminar lección' : 'Siguiente pregunta'}</button>
      </div>
    </section>`;
}

function passageHtml(text) {
  return splitWords(text).map((w, i) => `<span class="w" data-wi="${i}" data-start="${w.start}">${esc(w.word)}</span>`).join(' ');
}

function readPassage() {
  const pr = view.problem;
  const words = [...app.querySelectorAll('#passage-text .w')];
  const starts = words.map((w) => Number(w.dataset.start));
  const clear = () => words.forEach((w) => w.classList.remove('reading'));
  say(pr.passage.text, {
    slow: true,
    onWord: (charIndex) => {
      let idx = 0;
      while (idx + 1 < starts.length && starts[idx + 1] <= charIndex) idx++;
      clear();
      words[idx]?.classList.add('reading');
    },
    onEnd: clear,
  });
}

function highlightEvidence() {
  const pr = view.problem;
  if (!pr.evidence) return;
  const start = pr.passage.text.indexOf(pr.evidence);
  if (start < 0) return;
  const end = start + pr.evidence.length;
  app.querySelectorAll('#passage-text .w').forEach((w) => {
    const s = Number(w.dataset.start);
    w.classList.toggle('evidence', s >= start && s < end);
  });
}

function showSteps(auto = false) {
  const box = $('#steps');
  if (!box) return;
  box.classList.remove('hidden');
  if (view.stepIndex < 0) view.stepIndex = 0;
  renderSteps();
  if (auto || state.settings.autoRead) say(view.problem.steps[view.stepIndex]);
  box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderSteps() {
  const steps = view.problem.steps;
  const shown = steps.slice(0, view.stepIndex + 1);
  const more = view.stepIndex < steps.length - 1;
  $('#steps').innerHTML = `
    <h3>🦉 Profe Búho te explica</h3>
    <ol class="step-list">
      ${shown.map((st, i) => `<li class="step ${i === view.stepIndex ? 'new' : ''}"><span>${esc(st)}</span><button class="icon-btn small" data-say-step="${i}" aria-label="Escuchar el paso ${i + 1}">🔊</button></li>`).join('')}
    </ol>
    <div class="step-actions">
      ${more ? '<button class="btn primary" data-action="next-step">Siguiente paso ➡️</button>' : ''}
      <button class="btn" data-action="ai-explain">🤖 Explícamelo de otra forma</button>
    </div>
    <div id="ai-explain"></div>`;
}

function answer(value, btn) {
  if (view.solved) return;
  const pr = view.problem;
  const p = profile();
  const correct = value === pr.answer;
  view.attempts += 1;

  // Sólo el primer intento cuenta para ajustar el nivel.
  let next = p;
  if (!view.recorded) {
    view.recorded = true;
    const { skill, changed } = recordAnswer(p.skills[view.subject], correct);
    const streak = correct ? p.currentStreak + 1 : 0;
    next = {
      ...p,
      skills: { ...p.skills, [view.subject]: skill },
      currentStreak: streak,
      bestStreak: Math.max(p.bestStreak, streak),
      history: [...p.history, { t: Date.now(), subject: view.subject, level: p.skills[view.subject].level, correct, ms: Date.now() - view.startedAt }],
    };
    if (changed === 'up') setTimeout(() => toast(`¡Subes al nivel ${skill.level}: ${LEVEL_NAMES[skill.level]}!`, '🌟'), 600);
    if (changed === 'down') setTimeout(() => toast('Vamos a practicar con ejercicios un poco más fáciles. ¡Tú puedes!', '💪'), 600);
  }

  const fb = $('#feedback');
  if (correct) {
    view.solved = true;
    const firstTry = view.attempts === 1;
    const coins = firstTry ? coinsForAnswer(true, next.currentStreak) : 2;
    next = { ...next, coins: next.coins + coins, stars: next.stars + (firstTry ? 1 : 0) };
    view.coins += coins;
    if (firstTry) { view.correct += 1; view.stars += 1; }
    btn.classList.add('right');
    app.querySelectorAll('.choice').forEach((b) => { b.disabled = true; });
    const praise = PRAISE[Math.floor(Math.random() * PRAISE.length)];
    fb.innerHTML = `<p class="good">${firstTry ? '⭐' : '👍'} ${praise} <span class="earned">+${coins} 🪙</span></p>`;
    enableNext();
    say(praise);
    if (firstTry) confetti(24);
  } else {
    btn.classList.add('wrong');
    btn.disabled = true;
    if (view.attempts >= 2) {
      view.solved = true;
      next = { ...next, coins: next.coins + coinsForAnswer(false, 0) };
      app.querySelectorAll('.choice').forEach((b) => {
        b.disabled = true;
        if (b.dataset.answer === pr.answer) b.classList.add('right');
      });
      fb.innerHTML = `<p class="soft">La respuesta era <b>${esc(pr.answer)}</b>. ¡La próxima seguro que te sale!</p>`;
      enableNext();
      view.stepIndex = pr.steps.length - 1;
      showSteps();
      const spoken = pr.word ? `${pr.word.es}, que en inglés es ${pr.word.en}` : pr.answer;
      say(`La respuesta era ${spoken}. ¡La próxima seguro que te sale!`);
    } else {
      const msg = ENCOURAGE[Math.floor(Math.random() * ENCOURAGE.length)];
      fb.innerHTML = `<p class="soft">💛 ${msg} Inténtalo otra vez.</p>`;
      highlightEvidence();
      say(msg).then(() => showSteps(true));
    }
  }

  updateProfile(next);
  refreshWallet();
  announceBadges();
}

function enableNext() {
  const btn = $('#next-btn');
  if (!btn) return;
  btn.disabled = false;
  btn.classList.add('ready');
}

function refreshWallet() {
  const p = profile();
  const w = app.querySelector('.wallet');
  if (w && p) w.innerHTML = `<span>⭐ ${p.stars}</span><span>🪙 ${p.coins}</span>`;
}

function announceBadges() {
  const p = profile();
  const won = newBadges(p);
  if (!won.length) return;
  updateProfile({ ...p, badges: [...p.badges, ...won.map((b) => b.id)] });
  won.forEach((b, i) => setTimeout(() => {
    toast(`¡Nueva medalla: ${b.name}!`, b.emoji);
    confetti();
  }, 900 + i * 1200));
}

async function aiExplain() {
  const box = $('#ai-explain');
  const p = profile();
  const pr = view.problem;
  box.innerHTML = '<p class="thinking">🦉 Pensando otra manera de explicarlo…</p>';
  const question = pr.passage
    ? `Texto: "${pr.passage.text}"\nPregunta: ${pr.prompt}\nNo entiendo cómo encontrar la respuesta. Explícamelo de otra forma.`
    : `No entiendo este ejercicio: ${pr.prompt}${pr.type === 'listen' ? ` (la palabra en inglés es "${pr.speech}")` : ''}. Explícamelo de otra forma, con un ejemplo.`;
  const reply = await askTutor({ question, subject: view.subject, level: p.skills[view.subject].level, age: p.age });
  if (!document.body.contains(box)) return;
  box.innerHTML = explanationHtml(reply);
  say([reply.intro, ...reply.steps].join(' '));
}

function explanationHtml(reply) {
  return `
    <div class="explanation">
      ${reply.intro ? `<p class="intro">${esc(reply.intro)}</p>` : ''}
      <ol class="step-list">${reply.steps.map((st) => `<li class="step"><span>${esc(st)}</span></li>`).join('')}</ol>
      ${reply.answer ? `<p class="answer-box">✅ ${esc(reply.answer)}</p>` : ''}
      ${reply.tryIt ? `<p class="try-it">✏️ ${esc(reply.tryIt)}</p>` : ''}
      <p class="source">${reply.source === 'ai' ? '🤖 Explicación creada con IA' : '📚 Explicación de Profe Búho'}</p>
    </div>`;
}

function finishLesson() {
  let p = profile();
  const levelNow = p.skills[view.subject].level;
  // Terminar cualquier lección completa el reto diario.
  const daily = !dailyDone(p);
  if (daily) {
    p = { ...p, coins: p.coins + DAILY_BONUS, dailyDoneOn: today() };
    updateProfile(p);
  }
  const result = { ...view, coins: view.coins + (daily ? DAILY_BONUS : 0), daily, levelNow };
  go('lessonEnd', { result });
}

function renderLessonEnd() {
  const r = view.result;
  const s = SUBJECTS[r.subject];
  const great = r.correct >= SESSION_LENGTH * 0.75;
  const levelMsg = r.levelNow > r.levelStart
    ? `¡Subiste al nivel ${r.levelNow}! 🌟`
    : r.levelNow < r.levelStart
      ? 'Hemos ajustado los ejercicios para que practiques con calma.'
      : `Sigues en el nivel ${r.levelNow}. ¡Cada vez más cerca del siguiente!`;
  app.innerHTML = `
    ${topBar({ back: 'home', title: `${s.emoji} ${s.name}` })}
    <section class="screen center">
      <div class="mascot bounce" aria-hidden="true">${great ? '🏆' : '🦉'}</div>
      <h2 class="big-title">${great ? '¡Lección superada!' : '¡Buen trabajo!'}</h2>
      <div class="result-row">
        <div class="result"><b>${r.correct}/${SESSION_LENGTH}</b><span>a la primera</span></div>
        <div class="result"><b>+${r.stars} ⭐</b><span>estrellas</span></div>
        <div class="result"><b>+${r.coins} 🪙</b><span>monedas</span></div>
      </div>
      <p class="lead">${levelMsg}</p>
      ${r.daily ? `<p class="daily-won">🏆 ¡Reto diario completado! +${DAILY_BONUS} 🪙</p>` : ''}
      <div class="row">
        <button class="btn primary big" data-lesson="${r.subject}">Otra vez 🔁</button>
        <button class="btn big" data-go="home">Inicio 🏠</button>
      </div>
    </section>`;
  if (great) confetti(60);
  autoSay(`${great ? '¡Lección superada!' : '¡Buen trabajo!'} Acertaste ${r.correct} de ${SESSION_LENGTH}. ${levelMsg}`);
}

// ---------- Ayuda con la tarea ----------

function renderHomework() {
  const p = profile();
  app.innerHTML = `
    ${topBar({ back: 'home', title: '📝 Ayuda con mi tarea' })}
    <section class="screen">
      <div class="card">
        <p class="lead">Escribe tu tarea y te la explico paso a paso. 🦉</p>
        <form id="hw-form" class="form">
          <div class="subject-tabs" role="radiogroup" aria-label="Materia">
            ${Object.entries(SUBJECTS).map(([k, s], i) => `<label><input type="radio" name="subject" value="${k}" ${i === 0 ? 'checked' : ''}><span>${s.emoji} ${s.name}</span></label>`).join('')}
          </div>
          <label class="sr-only" for="hw-q">Tu tarea</label>
          <textarea id="hw-q" name="question" rows="4" maxlength="1000" required placeholder="Ejemplo: 47 + 38, ¿qué es un sustantivo?, ¿cómo se dice 'manzana' en inglés?"></textarea>
          <div class="row">
            ${dictationSupported ? '<button type="button" class="btn" data-action="dictate">🎤 Dictar</button>' : ''}
            <button class="btn primary big" type="submit">Explícame 🪄</button>
          </div>
        </form>
      </div>
      <div id="hw-answer" aria-live="polite"></div>
      <p class="note" id="ai-note"></p>
    </section>`;

  aiReachable().then((ok) => {
    const note = $('#ai-note');
    if (note) note.textContent = ok ? '🤖 El tutor con IA está activado.' : '📚 Modo sin conexión: explico operaciones y palabras; las preguntas abiertas necesitan el tutor con IA.';
  });

  $('#hw-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    const question = String(data.get('question')).trim();
    if (!question) return;
    const subject = data.get('subject');
    const out = $('#hw-answer');
    out.innerHTML = '<div class="card"><p class="thinking">🦉 Pensando…</p></div>';
    const btn = e.target.querySelector('[type=submit]');
    btn.disabled = true;
    const reply = await askTutor({ question, subject, level: p.skills[subject]?.level || 1, age: p.age });
    btn.disabled = false;
    if (!document.body.contains(out)) return;
    view.hwReply = reply;
    view.hwStep = 0;
    renderHomeworkSteps();
    const cur = profile();
    updateProfile({ ...cur, homeworkAsked: (cur.homeworkAsked || 0) + 1 });
    announceBadges();
  });
}

function renderHomeworkSteps() {
  const r = view.hwReply;
  const shown = r.steps.slice(0, view.hwStep + 1);
  const done = view.hwStep >= r.steps.length - 1;
  $('#hw-answer').innerHTML = `
    <div class="card steps">
      ${r.intro ? `<p class="intro">${esc(r.intro)}</p>` : ''}
      <ol class="step-list">
        ${shown.map((st, i) => `<li class="step ${i === view.hwStep ? 'new' : ''}"><span>${esc(st)}</span><button class="icon-btn small" data-say="${esc(st)}" aria-label="Escuchar el paso ${i + 1}">🔊</button></li>`).join('')}
      </ol>
      ${done && r.answer ? `<p class="answer-box">✅ ${esc(r.answer)}</p>` : ''}
      ${done && r.tryIt ? `<p class="try-it">✏️ ${esc(r.tryIt)}</p>` : ''}
      <div class="step-actions">
        ${done ? '<button class="btn" data-action="hw-again">Otra tarea 📝</button>' : '<button class="btn primary" data-action="hw-next">Siguiente paso ➡️</button>'}
      </div>
      <p class="source">${r.source === 'ai' ? '🤖 Explicación creada con IA. Si algo no cuadra, pregunta a tu maestro o a tu familia.' : '📚 Explicación de Profe Búho'}</p>
    </div>`;
  const text = view.hwStep === 0 ? [r.intro, r.steps[0]].filter(Boolean).join(' ') : r.steps[view.hwStep];
  autoSay(done && r.tryIt ? `${text} ${r.tryIt}` : text);
}

// ---------- Juegos ----------

function renderGames() {
  app.innerHTML = `
    ${topBar({ back: 'home', title: 'Juegos' })}
    <section class="screen with-nav">
      <div class="game-list">
        ${GAMES.map((g, i) => `
          <button class="game-card" data-game="${g.id}">
            <span class="game-art ${['blue', 'green', 'pink'][i % 3]}" aria-hidden="true">${g.emoji}</span>
            <span class="game-info"><b>${esc(g.name)}</b><small>${esc(g.desc)}</small></span>
            <span class="play-pill" aria-hidden="true">Jugar</span>
          </button>`).join('')}
      </div>
    </section>
    ${bottomNav('games')}`;
  autoSay('¿A qué quieres jugar?');
}

function renderGame() {
  const g = GAMES.find((x) => x.id === view.game);
  const p = profile();
  app.innerHTML = `
    ${topBar({ back: 'games', title: `${g.emoji} ${g.name}` })}
    <section class="screen"><div class="card game-area" id="game"></div></section>`;
  cleanup = STARTERS[g.id]($('#game'), {
    level: p.skills[g.subject].level,
    speak: (text, opts) => say(text, opts),
    onFinish: (result) => {
      cleanup?.();
      cleanup = null;
      const cur = profile();
      updateProfile({ ...cur, coins: cur.coins + result.coins, gamesPlayed: (cur.gamesPlayed || 0) + 1 });
      announceBadges();
      $('#game').innerHTML = `
        <div class="center">
          <div class="mascot bounce" aria-hidden="true">🎉</div>
          <h2 class="big-title">${esc(result.title)}</h2>
          <p class="lead">${esc(result.message)}</p>
          <p class="earned big">+${result.coins} 🪙</p>
          <div class="row">
            <button class="btn primary big" data-game="${g.id}">Jugar otra vez 🔁</button>
            <button class="btn big" data-go="games">Más juegos 🎮</button>
          </div>
        </div>`;
      refreshWallet();
      say(`${result.title} ${result.message} Ganaste ${result.coins} monedas.`);
    },
  });
}

// ---------- Premios ----------

function renderRewards() {
  const p = profile();
  const badges = BADGES.map((b) => {
    const has = p.badges.includes(b.id);
    return `<li class="badge ${has ? 'got' : ''}" title="${esc(b.desc)}"><span class="badge-emoji" aria-hidden="true">${has ? b.emoji : '🔒'}</span><b>${esc(b.name)}</b><small>${esc(b.desc)}</small></li>`;
  }).join('');
  const shop = SHOP.map((item) => {
    const owned = p.owned.includes(item.id);
    const equipped = (item.type === 'avatar' && p.avatar === item.emoji) || (item.type === 'hat' && p.hat === item.emoji);
    let action;
    if (item.type === 'sticker') action = owned ? '<span class="owned">¡Es tuya!</span>' : `<button class="btn small" data-buy="${item.id}">${item.price} 🪙</button>`;
    else if (equipped) action = '<span class="owned">Puesto ✓</span>';
    else if (owned) action = `<button class="btn small" data-equip="${item.id}">Ponérmelo</button>`;
    else action = `<button class="btn small" data-buy="${item.id}" ${p.coins < item.price ? 'aria-disabled="true"' : ''}>${item.price} 🪙</button>`;
    return `<li class="shop-item"><span class="shop-emoji" aria-hidden="true">${item.emoji}</span><span>${esc(item.name)}</span>${action}</li>`;
  }).join('');
  const stickers = SHOP.filter((i) => i.type === 'sticker' && p.owned.includes(i.id)).map((i) => i.emoji).join(' ');

  app.innerHTML = `
    ${topBar({ back: 'home', title: 'Mis premios' })}
    <section class="screen with-nav">
      <div class="challenge rewards-banner">
        <div class="challenge-text">
          <h2>${esc(p.name)}</h2>
          <p>⭐ ${p.stars} ${p.stars === 1 ? 'estrella' : 'estrellas'} · 🪙 ${p.coins} ${p.coins === 1 ? 'moneda' : 'monedas'}</p>
          ${stickers ? `<p class="stickers" aria-label="Mis pegatinas">${stickers}</p>` : ''}
        </div>
        <span class="trophy avatar-big" aria-hidden="true">${avatarHtml(p, 'xxl')}</span>
      </div>
      <h2 class="section-title">Medallas (${p.badges.length}/${BADGES.length})</h2>
      <ul class="badge-grid">${badges}</ul>
      <h2 class="section-title">Tienda</h2>
      <p class="note">Gana monedas aprendiendo y jugando, y cámbialas por personajes, sombreros y pegatinas.</p>
      <ul class="shop-grid">${shop}</ul>
      ${AVATARS.includes(p.avatar) ? '' : `<p class="row"><button class="btn small" data-equip="default">Volver a mi personaje inicial</button></p>`}
    </section>
    ${bottomNav('rewards')}`;
  if ((p.seenBadges || 0) < p.badges.length) updateProfile({ ...p, seenBadges: p.badges.length });
}

function buyItem(id) {
  const p = profile();
  const res = buy(p, id);
  const item = SHOP.find((i) => i.id === id);
  if (!res.ok) {
    if (res.reason === 'coins') {
      toast(`Te faltan ${item.price - p.coins} monedas. ¡Sigue aprendiendo!`, '🪙');
      say(`Te faltan ${item.price - p.coins} monedas. ¡Sigue aprendiendo!`);
    }
    return;
  }
  let next = res.profile;
  if (item.type === 'avatar') next = { ...next, previousAvatar: next.previousAvatar || p.avatar, avatar: item.emoji };
  if (item.type === 'hat') next = { ...next, hat: item.emoji };
  updateProfile(next);
  toast(`¡Conseguiste: ${item.name}!`, item.emoji);
  confetti();
  render();
}

function equipItem(id) {
  const p = profile();
  if (id === 'default') {
    updateProfile({ ...p, avatar: p.previousAvatar || AVATARS[0] });
    return render();
  }
  const item = SHOP.find((i) => i.id === id);
  if (!item || !p.owned.includes(id)) return;
  if (item.type === 'avatar') updateProfile({ ...p, previousAvatar: p.previousAvatar || p.avatar, avatar: item.emoji });
  if (item.type === 'hat') updateProfile({ ...p, hat: item.emoji });
  render();
}

// ---------- Zona de padres ----------

function renderParents() {
  if (!view.unlocked) return renderPinGate();
  const kids = state.profiles;
  const selected = kids.find((k) => k.id === view.kid) || kids[0];
  app.innerHTML = `
    ${topBar({ back: state.activeId ? 'home' : 'profiles', title: '👨‍👩‍👧 Zona de padres' })}
    <section class="screen parents">
      ${kids.length ? `
        <div class="kid-tabs" role="tablist">
          ${kids.map((k) => `<button role="tab" aria-selected="${k.id === selected.id}" class="kid-tab ${k.id === selected.id ? 'on' : ''}" data-kid="${k.id}">${esc(k.avatar)} ${esc(k.name)}</button>`).join('')}
        </div>
        ${dashboard(selected)}` : '<div class="card"><p>Todavía no hay perfiles. Cree uno desde la pantalla de inicio.</p></div>'}
      ${settingsPanel()}
    </section>`;
}

function dashboard(kid) {
  const sum = summarize(kid.history);
  const tips = recommendations(kid, sum);
  const maxDay = Math.max(1, ...sum.days.map((d) => d.answered));
  const dayNames = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  const chartH = 120;
  const barW = 28;
  const gap = 14;
  const chartW = sum.days.length * (barW + gap);
  const bars = sum.days.map((d, i) => {
    const h = Math.round((d.answered / maxDay) * (chartH - 20));
    const x = i * (barW + gap) + gap / 2;
    const date = new Date(d.start);
    const label = `${dayNames[date.getDay()]} ${date.getDate()}: ${d.answered} ejercicios, ${d.correct} correctos`;
    return `<g class="bar-g"><title>${label}</title>
      <rect class="hit" x="${x - gap / 2}" y="0" width="${barW + gap}" height="${chartH}" fill="transparent"></rect>
      ${d.answered ? `<path class="bar" d="M${x},${chartH} v-${Math.max(0, h - 4)} q0,-4 4,-4 h${barW - 8} q4,0 4,4 v${Math.max(0, h - 4)} z"></path>` : ''}
      ${d.answered ? `<text class="bar-val" x="${x + barW / 2}" y="${chartH - h - 6}" text-anchor="middle">${d.answered}</text>` : ''}
      <text class="bar-lbl" x="${x + barW / 2}" y="${chartH + 16}" text-anchor="middle">${dayNames[date.getDay()]}</text></g>`;
  }).join('');

  const subjects = Object.entries(SUBJECTS).map(([key, s]) => {
    const st = sum.bySubject[key];
    const lvl = kid.skills[key].level;
    const recent = recentAccuracy(kid.history, key);
    return `
      <div class="subject-stat">
        <div class="subject-stat-head"><b>${s.emoji} ${s.name}</b><span>Nivel ${lvl} · ${LEVEL_NAMES[lvl]}</span></div>
        <div class="meter" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${st.accuracy ?? 0}" aria-label="Aciertos en ${s.name}"><span class="${key}" style="width:${st.accuracy ?? 0}%"></span></div>
        <p class="stat-line">${st.answered ? `${st.accuracy}% de aciertos (${st.correct} de ${st.answered})${recent !== null && st.answered > 20 ? ` · últimos 20: ${recent}%` : ''}` : 'Sin actividad todavía'}</p>
        <label class="level-set">Ajustar nivel
          <select data-set-level="${key}" data-kid-id="${kid.id}">${[1, 2, 3, 4, 5].map((l) => `<option value="${l}" ${l === lvl ? 'selected' : ''}>${l} · ${LEVEL_NAMES[l]}</option>`).join('')}</select>
        </label>
      </div>`;
  }).join('');

  const recentItems = kid.history.slice(-8).reverse().map((h) => {
    const d = new Date(h.t);
    return `<li>${h.correct ? '✅' : '🔁'} ${SUBJECTS[h.subject]?.emoji || ''} ${SUBJECTS[h.subject]?.name || h.subject}, nivel ${h.level} <small>${d.toLocaleDateString('es')} ${d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</small></li>`;
  }).join('');

  return `
    <div class="stat-tiles">
      <div class="tile"><b>${sum.answered}</b><span>ejercicios</span></div>
      <div class="tile"><b>${sum.minutes}</b><span>minutos</span></div>
      <div class="tile"><b>${kid.stars}</b><span>estrellas</span></div>
      <div class="tile"><b>${kid.badges.length}</b><span>medallas</span></div>
    </div>
    <div class="card">
      <h2 class="card-title">Progreso por materia</h2>
      ${subjects}
    </div>
    <div class="card">
      <h2 class="card-title">Ejercicios en los últimos 7 días</h2>
      <svg class="chart" viewBox="0 0 ${chartW} ${chartH + 22}" role="img" aria-label="Ejercicios por día: ${sum.days.map((d) => d.answered).join(', ')}">
        <line class="axis" x1="0" y1="${chartH}" x2="${chartW}" y2="${chartH}"></line>${bars}
      </svg>
      <details class="table-view"><summary>Ver como tabla</summary>
        <table><thead><tr><th>Día</th><th>Ejercicios</th><th>Correctos</th></tr></thead><tbody>
        ${sum.days.map((d) => `<tr><td>${new Date(d.start).toLocaleDateString('es', { weekday: 'long', day: 'numeric' })}</td><td>${d.answered}</td><td>${d.correct}</td></tr>`).join('')}
        </tbody></table>
      </details>
    </div>
    <div class="card">
      <h2 class="card-title">Recomendaciones</h2>
      <ul class="tips">${tips.map((t) => `<li>💡 ${esc(t)}</li>`).join('')}</ul>
    </div>
    ${recentItems ? `<div class="card"><h2 class="card-title">Actividad reciente</h2><ul class="recent">${recentItems}</ul></div>` : ''}
    <div class="card danger-zone">
      <button class="btn small danger" data-delete-kid="${kid.id}">Borrar el perfil de ${esc(kid.name)}</button>
    </div>`;
}

function settingsPanel() {
  return `
    <div class="card">
      <h2 class="card-title">Ajustes</h2>
      <label class="switch"><input type="checkbox" id="set-autoread" ${state.settings.autoRead ? 'checked' : ''}> Leer las preguntas en voz alta automáticamente</label>
      <label>Velocidad de la voz
        <input type="range" id="set-rate" min="0.6" max="1.2" step="0.1" value="${state.settings.voiceRate}">
      </label>
      <div class="row">
        <button class="btn small" data-action="test-voice">🔊 Probar voz</button>
        <button class="btn small" data-action="change-pin">Cambiar PIN</button>
        <button class="btn small" data-action="lock">🔒 Salir</button>
      </div>
      ${speechSupported ? '' : '<p class="note">Este navegador no permite leer en voz alta. Pruebe con Chrome, Edge o Safari.</p>'}
      <p class="note">Todo el progreso se guarda sólo en este dispositivo. El tutor con IA recibe la pregunta, la edad y el nivel, nunca el nombre del niño.</p>
    </div>`;
}

function renderPinGate() {
  const creating = !state.parentPinHash || view.changingPin;
  app.innerHTML = `
    ${topBar({ back: state.activeId ? 'home' : 'profiles', title: '👨‍👩‍👧 Zona de padres' })}
    <section class="screen center">
      <form class="card form pin-form" id="pin-form">
        <p class="lead">${creating ? 'Cree un PIN de 4 números para proteger esta zona.' : 'Introduzca el PIN de padres.'}</p>
        <input name="pin" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" required autocomplete="off" aria-label="PIN" class="pin-input" placeholder="••••">
        ${creating ? '<input name="pin2" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" required autocomplete="off" aria-label="Repita el PIN" class="pin-input" placeholder="Repetir">' : ''}
        <p class="error" id="pin-error" role="alert"></p>
        <button class="btn primary big" type="submit">${creating ? 'Guardar PIN' : 'Entrar'}</button>
        ${!creating ? `<p class="note">Pista para adultos: ${view.challenge.a} × ${view.challenge.b} = ? <input name="challenge" inputmode="numeric" class="challenge-answer" aria-label="Resultado de la multiplicación"> <button class="link-btn" type="button" data-action="forgot-pin">Olvidé el PIN</button></p>` : ''}
      </form>
    </section>`;
  $('#pin-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    const pin = String(data.get('pin'));
    const err = $('#pin-error');
    if (!/^\d{4}$/.test(pin)) { err.textContent = 'El PIN debe tener 4 números.'; return; }
    if (creating) {
      if (pin !== String(data.get('pin2'))) { err.textContent = 'Los PIN no coinciden.'; return; }
      state.parentPinHash = await hashPin(pin);
      save();
      view.changingPin = false;
      view.unlocked = true;
      return render();
    }
    if ((await hashPin(pin)) === state.parentPinHash) {
      view.unlocked = true;
      return render();
    }
    err.textContent = 'PIN incorrecto.';
  });
}

// ---------- Render y eventos ----------

function closeMenu() {
  const menu = $('#lesson-menu');
  if (menu && !menu.hidden) {
    menu.hidden = true;
    $('[data-action=menu]')?.setAttribute('aria-expanded', 'false');
  }
}

function render() {
  switch (view.name) {
    case 'profiles': return renderProfiles();
    case 'newProfile': return renderNewProfile();
    case 'home': return renderHome();
    case 'profile': return renderProfile();
    case 'lesson': return renderLesson();
    case 'lessonEnd': return renderLessonEnd();
    case 'homework': return renderHomework();
    case 'games': return renderGames();
    case 'game': return renderGame();
    case 'rewards': return renderRewards();
    case 'parents': return renderParents();
    default: return renderProfiles();
  }
}

app.addEventListener('click', (e) => {
  const t = e.target.closest('button, [data-go], [data-action]');
  if (!t) return;
  const d = t.dataset;

  if (d.go) {
    if (d.go === 'parents') return go('parents', { unlocked: false, challenge: { a: 6 + Math.floor(Math.random() * 4), b: 7 + Math.floor(Math.random() * 3) } });
    if (d.go === 'profiles') state.activeId = null;
    return go(d.go);
  }
  if (d.pick) {
    state.activeId = d.pick;
    save();
    return go('home');
  }
  if (d.lesson) {
    stopSpeaking();
    return startLesson(d.lesson);
  }
  if (d.answer !== undefined) return answer(d.answer, t);
  if (d.game) return go('game', { game: d.game });
  if (d.buy) return buyItem(d.buy);
  if (d.equip) return equipItem(d.equip);
  if (d.say) return say(d.say);
  if (d.sayStep !== undefined) return say(view.problem.steps[Number(d.sayStep)]);
  if (d.kid) { view.kid = d.kid; return render(); }
  if (d.deleteKid) {
    const kid = state.profiles.find((k) => k.id === d.deleteKid);
    // Confirmación en la propia página: hay que tocar dos veces.
    if (kid && t.dataset.armed !== 'yes') {
      t.dataset.armed = 'yes';
      t.textContent = `¿Seguro? Toque otra vez para borrar a ${kid.name} y todo su progreso`;
      return;
    }
    if (kid) {
      state.profiles = state.profiles.filter((k) => k.id !== kid.id);
      if (state.activeId === kid.id) state.activeId = null;
      save();
      view.kid = null;
      render();
    }
    return;
  }

  if (d.action !== 'menu') closeMenu();

  switch (d.action) {
    case 'start':
      if (!state.profiles.length) return go('newProfile');
      view.sheet = true;
      return render();
    case 'close-sheet':
      view.sheet = false;
      return render();
    case 'switch-kid':
      state.activeId = null;
      save();
      return go('profiles', { sheet: true });
    case 'bell': {
      const p = profile();
      const fresh = p.badges.length - (p.seenBadges || 0);
      updateProfile({ ...p, seenBadges: p.badges.length });
      if (fresh > 0) return go('rewards');
      toast(dailyDone(p) ? '¡Ya hiciste el reto de hoy! Puedes seguir practicando.' : `Tienes un reto diario esperando: +${DAILY_BONUS} monedas.`, '🔔');
      return render();
    }
    case 'daily':
      stopSpeaking();
      return startLesson(weakestSubject(profile()));
    case 'menu': {
      const menu = $('#lesson-menu');
      menu.hidden = !menu.hidden;
      t.setAttribute('aria-expanded', String(!menu.hidden));
      return;
    }
    case 'toggle-voice': {
      state.settings.autoRead = !state.settings.autoRead;
      save();
      if (!state.settings.autoRead) stopSpeaking();
      toast(`Leer en voz alta: ${state.settings.autoRead ? 'activado' : 'desactivado'}`, '🔊');
      return;
    }
    case 'speak-question': {
      const pr = view.problem;
      return say(pr.speech, { lang: pr.speechLang || 'es-ES', slow: true });
    }
    case 'speak-choices': return say(view.problem.choices.join('. '), { lang: view.problem.sayChoicesIn, slow: true });
    case 'read-passage': return readPassage();
    case 'hint': {
      highlightEvidence();
      const fb = $('#feedback');
      if (!view.solved) fb.innerHTML = `<p class="hint">💡 ${esc(view.problem.hint)}</p>`;
      return say(view.problem.hint);
    }
    case 'steps': return showSteps(true);
    case 'next-step':
      view.stepIndex += 1;
      renderSteps();
      return say(view.problem.steps[view.stepIndex]);
    case 'ai-explain': return aiExplain();
    case 'next':
      view.index += 1;
      if (view.index >= SESSION_LENGTH) return finishLesson();
      return nextProblem();
    case 'hw-next':
      view.hwStep += 1;
      return renderHomeworkSteps();
    case 'hw-again': return go('homework');
    case 'dictate': {
      t.textContent = '🎙️ Escuchando…';
      dictate({
        onText: (text) => { const q = $('#hw-q'); if (q) q.value = text; },
        onEnd: () => { t.textContent = '🎤 Dictar'; },
      });
      return;
    }
    case 'test-voice': return speak('¡Hola! Así leo las preguntas en voz alta.');
    case 'change-pin': view.changingPin = true; view.unlocked = false; return render();
    case 'lock': return go(state.activeId ? 'home' : 'profiles');
    case 'forgot-pin': {
      const form = $('#pin-form');
      const val = Number(form.querySelector('.challenge-answer').value);
      if (val === view.challenge.a * view.challenge.b) {
        state.parentPinHash = null;
        save();
        view.unlocked = false;
        return render();
      }
      $('#pin-error').textContent = 'Resuelva la multiplicación para restablecer el PIN.';
      return;
    }
    default:
  }
});

app.addEventListener('change', (e) => {
  const t = e.target;
  if (t.id === 'set-autoread') {
    state.settings.autoRead = t.checked;
    save();
  } else if (t.id === 'set-rate') {
    state.settings.voiceRate = Number(t.value);
    configureSpeech({ rate: state.settings.voiceRate });
    save();
  } else if (t.dataset.setLevel) {
    const kid = state.profiles.find((k) => k.id === t.dataset.kidId);
    if (!kid) return;
    const key = t.dataset.setLevel;
    kid.skills[key] = { ...kid.skills[key], level: clampLevel(Number(t.value)), streak: 0, wrongStreak: 0 };
    save();
    toast(`Nivel de ${SUBJECTS[key].name} ajustado a ${t.value}.`, '✅');
  }
});

// Por si un perfil antiguo no tiene todas las materias.
for (const p of state.profiles) {
  for (const key of Object.keys(SUBJECTS)) {
    if (!p.skills[key]) p.skills[key] = newSkill(startingLevel(p.age));
  }
}

// Arranque: si había un niño activo, volver a su inicio.
if (profile()) view = { name: 'home' };
else state.activeId = null;
render();

// Intro animada al abrir la app. Se cierra sola o al tocarla.
function runIntro() {
  const intro = document.getElementById('intro');
  if (!intro) return;
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    introActive = false;
    intro.classList.add('leave');
    setTimeout(() => intro.remove(), 650);
    // El primer toque permite al navegador (iPhone incluido) empezar a hablar.
    const p = profile();
    autoSay(p ? `¡Hola, ${p.name}! ¿Qué quieres aprender hoy?` : '¡Hola! Soy Profe Búho. ¡Vamos a aprender jugando!');
  };
  intro.addEventListener('click', close);
  intro.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') close(); });
  intro.querySelector('.intro-skip')?.focus({ preventScroll: true });
  setTimeout(close, reduce ? 1200 : 3600);
}
runIntro();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
