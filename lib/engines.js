'use strict';
// thunder — engine adapters. each engine answers in a common result shape:
// web: { title, url, snippet, engine }
// image: { title, url, thumb, page, width, height, license, source }
// news: { title, url, snippet, date, source, engine }

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const UA_FIREFOX =
  'Mozilla/5.0 (X11; Linux x86_64; rv:126.0) Gecko/20100101 Firefox/126.0';

const TIMEOUT = 6500;

async function rawFetch(url, extraHeaders, method) {
  return fetch(url, {
    method: method || 'GET',
    headers: {
      'User-Agent': UA,
      'Accept-Language': 'en,ar,fr;q=0.8',
      Accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.5',
      ...extraHeaders,
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(TIMEOUT),
  });
}

// fetch with one automatic retry under a second UA — survives soft bot walls
async function get(url, extraHeaders, method = 'GET') {
  let res;
  try {
    res = await rawFetch(url, extraHeaders, method);
    if (res.ok) return res;
  } catch (e) {
    if (!method || method === 'GET') {
      res = await rawFetch(url, { ...(extraHeaders || {}), 'User-Agent': UA_FIREFOX }, method);
    } else {
      throw e;
    }
  }
  if (!res.ok) throw new Error(`upstream ${res.status}`);
  return res;
}

function stripTags(s) {
  return decodeEntities(String(s || '').replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
}

function decodeEntities(s) {
  if (!s) return '';
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

// unwrap ddg redirect links: //duckduckgo.com/l/?uddg=<encoded>
function unwrapDdg(href) {
  try {
    if (href.startsWith('//')) href = 'https:' + href;
    const u = new URL(href, 'https://duckduckgo.com');
    const uddg = u.searchParams.get('uddg');
    return uddg ? decodeURIComponent(uddg) : u.href;
  } catch {
    return href;
  }
}

/* ---------- web: duckduckgo html (GET, then POST fallback) ---------- */
async function ddgWeb(q, { safe, t }) {
  const kp = safe ? '1' : '-2';
  let html;
  try {
    const res = await get(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}&kp=${kp}&kl=${t}`,
      { Referer: 'https://duckduckgo.com/' }
    );
    html = await res.text();
    if (!html.includes('result__a')) throw new Error('ddgWeb: anomaly page');
  } catch {
    // GET sometimes draws a 202 anomaly page — retry as a form POST
    const res = await get(
      'https://html.duckduckgo.com/html/',
      {
        Referer: 'https://duckduckgo.com/',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      'POST'
    );
    html = await res.text();
    if (!html.includes('result__a')) throw new Error('ddgWeb: POST anomaly page');
  }
  const out = [];
  const re =
    /<a[^>]+class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
  let m;
  while ((m = re.exec(html))) {
    out.push({ title: stripTags(m[2]), url: unwrapDdg(m[1]), snippet: stripTags(m[3]), engine: 'duckduckgo' });
  }
  if (!out.length) throw new Error('ddgWeb: no results parsed');
  return out.slice(0, 20);
}

/* ---------- web: duckduckgo lite ---------- */
async function ddgLite(q, { safe, t }) {
  const kp = safe ? '1' : '-2';
  const res = await get(`https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(q)}&kp=${kp}&kl=${t}`);
  const html = await res.text();
  const out = [];
  const re =
    /<a[^>]+class='result-link'[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?class='result-snippet'[^>]*>([\s\S]*?)<\/td>/g;
  let m;
  while ((m = re.exec(html))) {
    out.push({ title: stripTags(m[2]), url: unwrapDdg(m[1]), snippet: stripTags(m[3]), engine: 'ddg-lite' });
  }
  if (!out.length) throw new Error('ddg-lite: no results parsed');
  return out.slice(0, 20);
}

/* ---------- web: mojeek (often shows captcha for automated requests — optional) ---------- */
async function mojeek(q, { safe }) {
  const safeQ = safe ? '&s=' : '';
  const res = await get(
    `https://www.mojeek.com/search?q=${encodeURIComponent(q)}${safeQ}`,
    { 'User-Agent': UA_FIREFOX }
  );
  const html = await res.text();
  // mojeek serves captcha for bot-like requests — detect and fail fast
  if (html.includes('<title>Captcha</title>') || html.includes('id="captcha"')) {
    throw new Error('mojeek: captcha page');
  }
  const out = [];
  const re =
    /<h2[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/h2>[\s\S]*?<p class="s">([\s\S]*?)<\/p>/g;
  let m;
  while ((m = re.exec(html))) {
    out.push({ title: stripTags(m[2]), url: m[1].startsWith('//') ? 'https:' + m[1] : m[1], snippet: stripTags(m[3]), engine: 'mojeek' });
  }
  if (!out.length) throw new Error('mojeek: no results parsed');
  return out.slice(0, 20);
}

/* ---------- images: openverse ---------- */
async function openverse(q, { safe }) {
  const url =
    `https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}` +
    `&page_size=24&mature=${safe ? '0' : '0'}&license_type=all-cc`;
  const res = await get(url, { Accept: 'application/json' });
  const data = await res.json();
  const out = (data.results || []).map((r) => ({
    title: r.title || q,
    url: r.url,
    thumb: r.thumbnail || r.url,
    page: r.foreign_landing_url,
    width: r.width,
    height: r.height,
    license: [r.license, r.license_version].filter(Boolean).join(' ').toUpperCase(),
    source: r.source,
    engine: 'openverse',
  }));
  if (!out.length) throw new Error('openverse: empty');
  return out;
}

/* ---------- images: duckduckgo (vqd token) ---------- */
async function ddgImages(q, { safe, t }) {
  const first = await get(`https://duckduckgo.com/?q=${encodeURIComponent(q)}&iax=images&ia=images`);
  const body = await first.text();
  const vqd = (body.match(/vqd=["']([\d-]+)["']/) || [])[1];
  if (!vqd) throw new Error('ddg-images: no vqd');
  const p = safe ? '1' : '-2';
  const res = await get(
    `https://duckduckgo.com/i.js?l=${encodeURIComponent(t || 'wt-wt')}&o=json&q=${encodeURIComponent(q)}&vqd=${vqd}&f=,,,&p=${p}`
  );
  const data = await res.json();
  const out = (data.results || []).map((r) => ({
    title: r.title || q,
    url: r.image,
    thumb: r.thumbnail,
    page: r.url,
    width: r.width,
    height: r.height,
    license: '',
    source: (() => {
      try {
        return new URL(r.url).hostname;
      } catch {
        return '';
      }
    })(),
    engine: 'ddg-images',
  }));
  if (!out.length) throw new Error('ddg-images: empty');
  return out.slice(0, 24);
}

/* ---------- news: google news rss ---------- */
async function gnews(q, { lang }) {
  const locale = { ar: 'ar&gl=SA&ceid=SA:ar', en: 'en-US&gl=US&ceid=US:en', fr: 'fr&gl=FR&ceid=FR:fr' }[lang] || 'en-US&gl=US&ceid=US:en';
  const res = await get(`https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=${locale}`);
  const xml = await res.text();
  const out = [];
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
  for (const item of items.slice(0, 20)) {
    const title = stripTags((item.match(/<title>([\s\S]*?)<\/title>/) || [])[1]);
    const link = stripTags((item.match(/<link>([\s\S]*?)<\/link>/) || [])[1]);
    const date = stripTags((item.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1]);
    const source = stripTags((item.match(/<source[^>]*>([\s\S]*?)<\/source>/) || [])[1]);
    if (!title || !link) continue;
    out.push({ title, url: link, snippet: '', date, source, engine: 'gnews' });
  }
  if (!out.length) throw new Error('gnews: empty');
  return out;
}

/* ---------- web: bing ---------- */
// bing wraps result links in /ck/a tracking redirects holding a base64url payload:
// u=a1<base64url-of-real-url>. decode it so users never touch a bing tracker.
function unwrapBing(href) {
  let u = decodeEntities(href);
  try {
    const parsed = new URL(u, 'https://www.bing.com');
    if (parsed.hostname.endsWith('bing.com') && parsed.pathname.startsWith('/ck/')) {
      const uparam = parsed.searchParams.get('u') || '';
      if (uparam.startsWith('a1')) {
        const b64 = uparam.slice(2).replace(/-/g, '+').replace(/_/g, '/');
        const decoded = Buffer.from(b64, 'base64').toString('utf8');
        if (/^https?:\/\//.test(decoded)) return decoded;
      }
    }
  } catch {
    /* keep the original below */
  }
  return u;
}

async function bing(q, { safe }) {
  const adlt = safe ? '' : '&adlt=off';
  const res = await get(
    `https://www.bing.com/search?q=${encodeURIComponent(q)}&count=20${adlt}`,
    { 'User-Agent': UA_FIREFOX, Referer: 'https://www.bing.com/' }
  );
  const html = await res.text();
  const out = [];
  const re =
    /<li class="b_algo"[\s\S]*?<h2[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/h2>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/g;
  let m;
  while ((m = re.exec(html))) {
    out.push({ title: stripTags(m[2]), url: unwrapBing(m[1]), snippet: stripTags(m[3]), engine: 'bing' });
  }
  if (!out.length) throw new Error('bing: no results parsed');
  return out.slice(0, 20);
}

/* ---------- web: ddg instant answers (low-priority fallback, rarely throttled) ---------- */
async function ddgIA(q) {
  const res = await get(`https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`, {
    Accept: 'application/json',
  });
  const data = await res.json();
  const out = [];
  const push = (t) => {
    if (t && t.FirstURL && t.Text) {
      out.push({ title: t.Text.split(' - ')[0].slice(0, 120), url: t.FirstURL, snippet: t.Text, engine: 'ddg-ia' });
    }
  };
  (data.RelatedTopics || []).forEach((t) => {
    push(t);
    (t.Topics || []).forEach(push);
  });
  if (!out.length) throw new Error('ddg-ia: empty');
  return out.slice(0, 12);
}

/* ---------- videos: duckduckgo (vqd token) ---------- */
function ytId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1);
    if (u.searchParams.get('v')) return u.searchParams.get('v');
    if (u.pathname.startsWith('/embed/') || u.pathname.startsWith('/shorts/')) return u.pathname.split('/')[2] || '';
  } catch {
    /* not a url */
  }
  return '';
}

function fmtDur(s) {
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

async function ddgVideos(q, { safe, t }) {
  const first = await get(`https://duckduckgo.com/?q=${encodeURIComponent(q)}&iax=videos&ia=videos`);
  const body = await first.text();
  const vqd = (body.match(/vqd=["']([\d-]+)["']/) || [])[1];
  if (!vqd) throw new Error('ddg-videos: no vqd');
  const p = safe ? '-1' : '-2'; // strict (1) wipes nearly every result — use moderate
  const res = await get(
    `https://duckduckgo.com/v.js?l=${encodeURIComponent(t || 'wt-wt')}&o=json&q=${encodeURIComponent(q)}&vqd=${vqd}&p=${p}&f=,,,1,1`
  );
  const data = await res.json();
  const out = (data.results || [])
    .map((r) => {
      // ddg v.js puts the real video url in `content`, thumbnails in `images.*`
      const url = unwrapDdg(r.content || '');
      const thumb = (r.images && (r.images.medium || r.images.small || r.images.large)) || '';
      return {
        title: r.title || q,
        url,
        thumb,
        publisher: r.uploader || r.publisher || '',
        duration: r.duration || '',
        date: r.published || '',
        videoId: ytId(url),
        engine: 'ddg-videos',
      };
    })
    .filter((v) => v.url);
  if (!out.length) throw new Error('ddg-videos: empty');
  return out.slice(0, 24);
}

/* ---------- videos: invidious instances (fallback + anonymous watching) ---------- */
const INV_ANON = 'https://inv.nadeko.net';
const INV_INSTANCES = ['https://inv.nadeko.net', 'https://invidious.nerdvpn.de', 'https://yewtu.be'];

async function invidious(q) {
  let lastErr;
  for (const base of INV_INSTANCES) {
    try {
      const res = await get(
        `${base}/api/v1/search?type=video&q=${encodeURIComponent(q)}&sort_by=relevance`,
        { Accept: 'application/json' }
      );
      const data = await res.json();
      const out = (Array.isArray(data) ? data : [])
        .filter((v) => v.videoId)
        .map((v) => ({
          title: v.title || q,
          url: `https://www.youtube.com/watch?v=${v.videoId}`,
          thumb: `https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`,
          publisher: v.author || '',
          duration: v.lengthSeconds ? fmtDur(v.lengthSeconds) : '',
          date: v.publishedText || '',
          videoId: v.videoId,
          engine: 'invidious',
        }));
      if (!out.length) throw new Error('invidious: empty');
      return out.slice(0, 24);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('invidious: all instances failed');
}

/* ---------- engine registry ----------
   each entry: id (cookie value), label (settings ui), fn.
   order matters: fastest first — runAll answers as soon as enough engines respond,
   which keeps us inside vercel's serverless time budget. */
const CATALOG = {
  web: [
    { id: 'ddg', label: 'DuckDuckGo', fn: ddgWeb },
    { id: 'bing', label: 'Bing', fn: bing },
    { id: 'ddg-ia', label: 'DDG Instant Answers', fn: ddgIA },
    { id: 'mojeek', label: 'Mojeek (captcha risk)', fn: mojeek },
  ],
  images: [
    { id: 'openverse', label: 'Openverse', fn: openverse },
    { id: 'ddg-images', label: 'DuckDuckGo Images', fn: ddgImages },
  ],
  videos: [
    { id: 'invidious', label: 'Invidious', fn: invidious },
    { id: 'ddg-videos', label: 'DuckDuckGo Videos', fn: ddgVideos },
  ],
  news: [{ id: 'gnews', label: 'Google News', fn: gnews }],
};

const ALL_ENGINE_IDS = [...new Set(Object.values(CATALOG).flatMap((l) => l.map((e) => e.id)))];

function enginesFor(category, enabledIds) {
  const list = CATALOG[category] || CATALOG.web;
  if (!enabledIds || !enabledIds.size) return list;
  const on = list.filter((e) => enabledIds.has(e.id));
  return on.length ? on : list; // never run with zero engines
}

// in-memory cache (never persisted) softens repeated queries on the engines.
const cache = new Map(); // key -> { at, value }
const CACHE_TTL = 5 * 60 * 1000;
setInterval(() => cache.clear(), 15 * 60 * 1000).unref();

async function runAll(q, category, opts) {
  const key = `${category}:${opts.safe ? 's' : 'o'}:${opts.lang || ''}:${opts.engines ? [...opts.engines].sort().join(',') : ''}:${q}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.value;

  const chosen = enginesFor(category, opts.engines);
  // hard time budget — vercel serverless functions must answer quickly
  const deadline = opts.deadline || (category === 'web' ? 6500 : 8500);
  const enough = Math.min(2, chosen.length);

  const settled = await settleEarly(chosen.map((e) => e.fn(q, opts)), enough, deadline);
  const ok = settled.filter((s) => s.status === 'fulfilled');
  const failed = settled.filter((s) => s.status === 'rejected').length;
  if (!ok.length) throw new Error('all engines failed');
  const value = { results: merge(ok.map((s) => s.value), category), enginesOk: ok.length, enginesFailed: failed };
  cache.set(key, { at: Date.now(), value });
  return value;
}

// Promise.allSettled, but resolves early once `enough` engines succeeded
// or after `ms` — pending stragglers are dropped (counted as failed).
function settleEarly(promises, enough, ms) {
  return new Promise((resolve) => {
    const out = new Array(promises.length);
    let remaining = promises.length;
    let successes = 0;
    let finished = false;
    const timer = setTimeout(finish, ms);
    function finish() {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      const settled = [];
      for (let i = 0; i < promises.length; i++) {
        settled.push(out[i] || { status: 'rejected', reason: new Error('dropped — deadline') });
      }
      resolve(settled);
    }
    promises.forEach((p, i) => {
      p.then((v) => {
        if (finished) return;
        out[i] = { status: 'fulfilled', value: v };
        successes++;
        if (successes >= enough) finish();
      }).catch(() => {
        if (finished) return;
        out[i] = { status: 'rejected', reason: new Error('engine failed') };
      }).finally(() => {
        remaining--;
        if (!finished && remaining === 0) finish();
      });
    });
  });
}

/* "i'm feeling lucky": race the two fastest web engines and take the first real url */
async function firstResult(q, opts = {}) {
  const chosen = enginesFor('web', opts.engines).filter((e) => e.id !== 'ddg-ia');
  const list = chosen.length ? chosen : enginesFor('web', null);
  let done = false;
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      if (!done) { done = true; resolve(null); }
    }, 6000);
    let remaining = list.length;
    list.forEach((e) => {
      e.fn(q, opts).catch(() => []).then((results) => {
        if (done) return;
        const first = (results || []).find((r) => /^https?:\/\//.test(r.url || ''));
        if (first) {
          done = true;
          clearTimeout(timer);
          resolve(first);
        } else if (--remaining === 0) {
          done = true;
          clearTimeout(timer);
          resolve(null);
        }
      });
    });
  });
}

// merge, dedupe and rank: agreement across engines wins.
function merge(lists, category) {
  const byKey = new Map();
  for (const list of lists) {
    list.forEach((r, i) => {
      const key = normKey(r.url, category);
      if (!byKey.has(key)) {
        byKey.set(key, { ...r, score: 0, votes: new Set() });
      }
      const entry = byKey.get(key);
      entry.score += Math.max(0, list.length - i);
      entry.votes.add(r.engine);
      if (!entry.title && r.title) entry.title = r.title;
      if (!entry.snippet && r.snippet) entry.snippet = r.snippet;
      if (category !== 'images' && category !== 'news' && r.engine !== entry.engine) entry.engine = entry.votes.size > 1 ? `${entry.votes.size} engines` : entry.engine;
    });
  }
  return [...byKey.values()]
    .map((r) => ({ ...r, votes: r.votes.size }))
    .sort((a, b) => b.votes - a.votes || b.score - a.score)
    .map(({ score, ...r }) => r);
}

function normKey(url, category) {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/+$/, '');
    // images & videos are media links: the query IS the identity (?v=…, file ids…)
    if (category === 'images' || category === 'videos') return u.href;
    return `${u.hostname.replace(/^www\./, '')}${path}`;
  } catch {
    return String(url);
  }
}

module.exports = { runAll, firstResult, CATALOG, ALL_ENGINE_IDS, INV_ANON };
