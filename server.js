'use strict';
// thunder — a private metasearch engine.
// no logs, no trackers, no profiles. engines are queried anonymously in parallel.

const express = require('express');
const path = require('path');
const { ProxyAgent, setGlobalDispatcher } = require('undici');
const i18n = require('./lib/i18n');
const engines = require('./lib/engines');
const { proxify } = require('./lib/proxy');
const view = require('./lib/render');

// optional: route all outbound engine traffic through an http(s) proxy
// (e.g. a local tor http bridge: TH_UPSTREAM_PROXY=http://127.0.0.1:8118)
if (process.env.TH_UPSTREAM_PROXY) {
  setGlobalDispatcher(new ProxyAgent(process.env.TH_UPSTREAM_PROXY));
}

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', false); // we never trust or log client ips

const PORT = process.env.PORT || 3000;

/* ---------- security headers ---------- */
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "img-src 'self' data: https:",
      "style-src 'self'",
      "script-src 'self'",
      "connect-src 'self'",
      "font-src 'self'",
      "base-uri 'none'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join('; ')
  );
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  next();
});

/* ---------- gentle rate limit (in-memory, never persisted) ---------- */
const hits = new Map();
setInterval(() => hits.clear(), 10 * 60 * 1000).unref();
app.use((req, res, next) => {
  const now = Date.now();
  // hash the ip so it is never stored raw
  const key = Buffer.from(req.socket.remoteAddress || 'x').toString('base64url');
  const arr = (hits.get(key) || []).filter((ts) => now - ts < 60_000);
  if (arr.length > 60) return res.status(429).send('too fast — breathe.');
  arr.push(now);
  hits.set(key, arr);
  next();
});

/* ---------- static ---------- */
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h', index: false }));

/* ---------- cookies & language ---------- */
function cookies(req) {
  const out = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

app.use((req, res, next) => {
  const c = cookies(req);
  const urlLang = typeof req.query.lang === 'string' ? req.query.lang : null;
  const lang = i18n.SUPPORTED.includes(urlLang) ? urlLang : i18n.SUPPORTED.includes(c.th_lang) ? c.th_lang : i18n.negotiate(req.headers['accept-language']);
  const t = i18n.make(lang);
  req.ctx = {
    lang,
    dir: lang === 'ar' ? 'rtl' : 'ltr',
    t,
    theme: ['light', 'dark', 'auto'].includes(c.th_theme) ? c.th_theme : 'auto',
    safe: c.th_safe !== '0',
    newtab: c.th_newtab !== '0',
    recent: c.th_recent !== '0',
    ddgLocale: { ar: 'xa-ar', en: 'wt-wt', fr: 'fr-fr' }[lang] || 'wt-wt',
  };
  next();
});

const setPref = (res, name, value) => {
  res.append('Set-Cookie', `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=31536000; SameSite=Lax`);
};

/* ---------- routes ---------- */
app.get('/', (req, res) => {
  const { t, lang, dir, theme } = req.ctx;
  res.send(view.home(t, { lang, dir, theme }));
});

const CALC_RE = /^[\d\s+\-*/().%^]+$/;
function instantAnswer(q) {
  const s = q.trim();
  if (!s || s.length > 80 || !CALC_RE.test(s) || !/[\d]/.test(s) || !/[+\-*/%^]/.test(s)) return null;
  try {
    // scope is empty and the expression is strictly numeric — safe to evaluate
    const val = Function(`"use strict"; return (${s.replace(/\^/g, '**')})`)();
    if (typeof val !== 'number' || !isFinite(val)) return null;
    const rounded = Math.round(val * 1e10) / 1e10;
    return `${s.replace(/\s+/g, ' ')} = ${rounded.toLocaleString('en-US')}`;
  } catch {
    return null;
  }
}

app.get('/search', async (req, res) => {
  const { t, lang, dir, theme, safe, ddgLocale } = req.ctx;
  const q = String(req.query.q || '').slice(0, 200).trim();
  const cat = ['web', 'images', 'videos', 'news'].includes(req.query.cat) ? req.query.cat : 'web';
  if (!q) return res.redirect('/');

  // "i'm feeling lucky": redirect straight to the first result (no-referrer keeps it private)
  if (req.query.lucky === '1' && cat === 'web') {
    try {
      const { results } = await engines.runAll(q, 'web', { safe, t: ddgLocale, lang });
      const first = results.find((r) => /^https?:\/\//.test(r.url));
      if (first) return res.redirect(first.url);
    } catch {
      /* fall through to the normal page */
    }
  }

  const started = Date.now();
  try {
    const { results, enginesOk, enginesFailed } = await engines.runAll(q, cat, { safe, t: ddgLocale, lang });
    const took = Date.now() - started;
    const instant = cat === 'web' ? instantAnswer(q) : null;
    res.send(view.searchPage(t, { lang, dir, theme, q, cat, results, enginesOk, enginesFailed, took, instant }));
  } catch (err) {
    res.status(502).send(view.errorPage(t, { lang, dir, theme, title: t('err_title'), message: t('err_body') }));
  }
});

/* ---------- search suggestions (proxied anonymously from ddg autocomplete) ---------- */
app.get('/suggest', async (req, res) => {
  const q = String(req.query.q || '').slice(0, 100).trim();
  if (!q) return res.json({ q, suggestions: [] });
  try {
    const upstream = await fetch(`https://duckduckgo.com/ac/?q=${encodeURIComponent(q)}&type=list`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36', Accept: 'application/json' },
      signal: AbortSignal.timeout(4000),
    });
    const data = await upstream.json();
    let suggestions = [];
    if (Array.isArray(data)) {
      if (Array.isArray(data[1])) suggestions = data[1];
      else suggestions = data.map((x) => (typeof x === 'string' ? x : x.phrase)).filter(Boolean);
    }
    res.json({ q, suggestions: suggestions.slice(0, 8) });
  } catch {
    res.json({ q, suggestions: [] });
  }
});

/* ---------- random discovery: a random wikipedia article ---------- */
app.get('/random', (req, res) => {
  const wiki = {
    ar: 'https://ar.wikipedia.org/wiki/Special:Random',
    fr: 'https://fr.wikipedia.org/wiki/Special:Random',
    en: 'https://en.wikipedia.org/wiki/Special:Random',
  }[req.ctx.lang];
  res.redirect(wiki);
});

/* ---------- anonymous reader ---------- */
app.get('/proxy', async (req, res) => {
  const { t, lang, dir } = req.ctx;
  const raw = String(req.query.url || '');
  let target;
  try {
    target = new URL(raw);
  } catch {
    return res.status(400).send(view.errorPage(t, { lang, dir, title: 'proxy', message: 'bad url' }));
  }
  if (!/^https?:$/.test(target.protocol)) {
    return res.status(400).send(view.errorPage(t, { lang, dir, theme, title: 'proxy', message: 'only http(s) allowed' }));
  }
  try {
    const upstream = await fetch(target.href, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
        'Accept-Language': 'en,ar,fr;q=0.8',
        Accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(12_000),
    });
    const type = upstream.headers.get('content-type') || '';
    if (!type.includes('text/html')) {
      // images & co pass straight through, still without a referrer
      const buf = Buffer.from(await upstream.arrayBuffer());
      res.setHeader('Content-Type', type);
      return res.send(buf.slice(0, 8 * 1024 * 1024));
    }
    const html = (await upstream.text()).slice(0, 5 * 1024 * 1024);
    // reader-mode CSP: no scripts, no frames, inline banner style only
    res.setHeader('Content-Security-Policy', "default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; media-src https: data:; base-uri 'none'; form-action 'none'");
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(proxify(html, upstream.url || target.href));
  } catch {
    res.status(502).send(view.errorPage(t, { lang, dir, theme, title: t('err_title'), message: t('err_body') }));
  }
});

/* ---------- settings ---------- */
app.get('/settings', (req, res) => {
  const { t, lang, dir, theme, safe, newtab, recent } = req.ctx;
  res.send(view.settingsPage(t, { lang, dir, theme, safe, newtab, recent }));
});

app.post('/settings/save', express.urlencoded({ extended: false }), (req, res) => {
  const { lang: bodyLang, theme: bodyTheme } = req.body;
  const lang = i18n.SUPPORTED.includes(bodyLang) ? bodyLang : req.ctx.lang;
  const theme = ['light', 'dark', 'auto'].includes(bodyTheme) ? bodyTheme : req.ctx.theme;
  setPref(res, 'th_lang', lang);
  setPref(res, 'th_theme', theme);
  setPref(res, 'th_safe', req.body.safe === '0' ? '0' : '1');
  setPref(res, 'th_newtab', req.body.newtab === '1' ? '1' : '0');
  setPref(res, 'th_recent', req.body.recent === '1' ? '1' : '0');
  res.redirect('/settings');
});

app.get('/about', (req, res) => {
  const { t, lang, dir, theme } = req.ctx;
  res.send(view.aboutPage(t, { lang, dir, theme }));
});

app.get('/privacy', (req, res) => {
  const { t, lang, dir, theme } = req.ctx;
  res.send(view.privacyPage(t, { lang, dir, theme }));
});

app.get('/favicon.svg', (req, res) => {
  res.setHeader('Content-Type', 'image/svg+xml');
  res.sendFile(path.join(__dirname, 'public', 'favicon.svg'));
});

app.use((req, res) => {
  const { t, lang, dir, theme } = req.ctx;
  res.status(404).send(view.errorPage(t, { lang, dir, theme, title: '404', message: t('results_none_body') }));
});

app.listen(PORT, () => {
  console.log(`⚡ thunder is running on http://localhost:${PORT} — no logs, no trackers.`);
});
