// Servidor de Aprende Conmigo AI: sirve la app y el tutor con IA.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { askClaude, chatWithClaude, aiAvailable, MAX_QUESTION_LENGTH } from './tutor-ai.js';
import { trimHistory, MAX_TURNS, MAX_MESSAGE } from './public/js/buddy.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(here, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

const RATE_LIMIT = 20; // peticiones al tutor por minuto y por IP
const SUBJECTS = new Set(['math', 'reading', 'english', 'other']);

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': MIME['.json'], 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

async function readBody(req, limit = 16 * 1024) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw Object.assign(new Error('too large'), { status: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function serveStatic(req, res) {
  const url = new URL(req.url, 'http://localhost');
  let rel = decodeURIComponent(url.pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!file.startsWith(PUBLIC_DIR + path.sep)) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  try {
    const data = await fs.readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('No encontrado');
  }
}

export function createAppServer({ tutor = askClaude, chat = chatWithClaude, isAiAvailable = aiAvailable } = {}) {
  const hits = new Map();

  function limited(ip) {
    const now = Date.now();
    const recent = (hits.get(ip) || []).filter((t) => now - t < 60_000);
    recent.push(now);
    hits.set(ip, recent);
    return recent.length > RATE_LIMIT;
  }

  async function handleTutor(req, res) {
    if (!isAiAvailable()) return sendJson(res, 503, { error: 'ai_unavailable' });
    if (limited(req.socket.remoteAddress)) return sendJson(res, 429, { error: 'rate_limited' });

    let body;
    try {
      body = JSON.parse(await readBody(req));
    } catch (err) {
      return sendJson(res, err.status || 400, { error: 'bad_request' });
    }
    const question = String(body.question || '').trim();
    if (!question) return sendJson(res, 400, { error: 'empty_question' });
    if (question.length > MAX_QUESTION_LENGTH) return sendJson(res, 400, { error: 'too_long' });

    try {
      const reply = await tutor({
        question,
        subject: SUBJECTS.has(body.subject) ? body.subject : 'other',
        level: Math.min(5, Math.max(1, Number(body.level) || 1)),
        age: Math.min(14, Math.max(4, Number(body.age) || 8)),
      });
      sendJson(res, 200, { source: 'ai', ...reply });
    } catch (err) {
      console.error('Error del tutor:', err.message);
      sendJson(res, 502, { error: err.code || 'tutor_error' });
    }
  }

  async function handleChat(req, res) {
    if (!isAiAvailable()) return sendJson(res, 503, { error: 'ai_unavailable' });
    if (limited(req.socket.remoteAddress)) return sendJson(res, 429, { error: 'rate_limited' });

    let body;
    try {
      body = JSON.parse(await readBody(req, 64 * 1024));
    } catch (err) {
      return sendJson(res, err.status || 400, { error: 'bad_request' });
    }
    if (!Array.isArray(body.messages) || !body.messages.length || body.messages.length > MAX_TURNS * 2) {
      return sendJson(res, 400, { error: 'bad_messages' });
    }
    const last = body.messages.at(-1);
    if (last?.role !== 'user' || String(last.content || '').length > MAX_MESSAGE) return sendJson(res, 400, { error: 'bad_messages' });

    // Claude necesita turnos alternos: se unen los seguidos del mismo rol.
    const messages = [];
    for (const m of trimHistory(body.messages)) {
      const prev = messages.at(-1);
      if (prev && prev.role === m.role) prev.content += `\n${m.content}`;
      else messages.push({ ...m });
    }
    if (!messages.length) return sendJson(res, 400, { error: 'bad_messages' });

    const levels = {};
    for (const key of ['math', 'reading', 'english']) {
      const v = Number(body.levels?.[key]);
      if (v >= 1 && v <= 5) levels[key] = Math.round(v);
    }
    try {
      const reply = await chat({ messages, age: Math.min(14, Math.max(4, Number(body.age) || 8)), levels });
      sendJson(res, 200, { source: 'ai', reply });
    } catch (err) {
      console.error('Error del chat:', err.message);
      sendJson(res, 502, { error: err.code || 'chat_error' });
    }
  }

  return http.createServer(async (req, res) => {
    const { pathname } = new URL(req.url, 'http://localhost');
    if (pathname === '/api/health' && req.method === 'GET') {
      return sendJson(res, 200, { ok: true, ai: isAiAvailable() });
    }
    if (pathname === '/api/chat') {
      if (req.method !== 'POST') return sendJson(res, 405, { error: 'method_not_allowed' });
      return handleChat(req, res);
    }
    if (pathname === '/api/tutor') {
      if (req.method !== 'POST') return sendJson(res, 405, { error: 'method_not_allowed' });
      return handleTutor(req, res);
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return sendJson(res, 405, { error: 'method_not_allowed' });
    return serveStatic(req, res);
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    process.loadEnvFile(path.join(here, '.env'));
  } catch {
    // Sin archivo .env: se usan las variables de entorno del sistema.
  }
  const port = Number(process.env.PORT) || 3000;
  createAppServer().listen(port, () => {
    console.log(`🦉 Aprende Conmigo AI en http://localhost:${port}`);
    console.log(aiAvailable() ? '   Tutor con IA: activado' : '   Tutor con IA: desactivado (falta ANTHROPIC_API_KEY). La app funciona con explicaciones sin conexión.');
  });
}
