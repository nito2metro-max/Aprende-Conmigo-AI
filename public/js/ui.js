// Pequeñas utilidades de interfaz: escape de HTML, avisos y confeti.

export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

export function $(selector, root = document) {
  return root.querySelector(selector);
}

export function toast(message, emoji = '🎉') {
  const box = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.innerHTML = `<span class="toast-emoji" aria-hidden="true">${esc(emoji)}</span><span>${esc(message)}</span>`;
  box.appendChild(el);
  setTimeout(() => el.classList.add('out'), 3200);
  setTimeout(() => el.remove(), 3700);
}

const reduceMotion = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function confetti(count = 40) {
  if (reduceMotion()) return;
  const layer = document.createElement('div');
  layer.className = 'confetti';
  layer.setAttribute('aria-hidden', 'true');
  const colors = ['#ff6b6b', '#ffd93d', '#6bcB77', '#4d96ff', '#c77dff', '#ff9f43'];
  for (let i = 0; i < count; i++) {
    const p = document.createElement('i');
    p.style.left = `${Math.random() * 100}%`;
    p.style.background = colors[i % colors.length];
    p.style.animationDelay = `${Math.random() * 0.4}s`;
    p.style.animationDuration = `${1.2 + Math.random() * 1.2}s`;
    p.style.transform = `rotate(${Math.random() * 360}deg)`;
    layer.appendChild(p);
  }
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 3000);
}

export function avatarHtml(profile, size = '') {
  const hat = profile.hat ? `<span class="avatar-hat" aria-hidden="true">${esc(profile.hat)}</span>` : '';
  return `<span class="avatar ${size}" aria-hidden="true">${hat}${esc(profile.avatar)}</span>`;
}
