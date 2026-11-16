'use strict';
// thunder — anonymous reader proxy. fetches a page server-side, strips every
// script/style/tracker and rewrites links so browsing stays inside the proxy.

function proxify(html, baseUrl) {
  let out = String(html);

  // 1. remove whole dangerous elements (with their content)
  out = out
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|noscript|style|iframe|object|embed|applet|frameset|svg)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<(script|iframe|object|embed|applet|link|meta|base|frameset|form)\b[^>]*\/?>/gi, '');

  // 2. remove risky attributes everywhere
  out = out
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s(style|srcset|integrity|nonce|ping|crossorigin|referrerpolicy)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  // 3. rewrite <a href> to stay inside the proxy
  out = out.replace(/\shref\s*=\s*(?:"([^"]*)"|'([^']*)')/gi, (m, dq, sq) => {
    const u = dq !== undefined ? dq : sq;
    const abs = absolutize(u, baseUrl);
    if (!abs) return ''; // drop javascript:, mailto handled below
    if (/^(mailto|tel|data):/i.test(u.trim())) return m;
    return ` href="/proxy?url=${encodeURIComponent(abs)}"`;
  });

  // 4. absolutize media sources (images, video, audio, source)
  out = out.replace(/\s(src|poster)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi, (m, attr, dq, sq) => {
    const u = dq !== undefined ? dq : sq;
    const abs = absolutize(u, baseUrl);
    return abs ? ` ${attr}="${abs}"` : '';
  });

  // 5. reader banner
  const banner =
    '<div style="font:15px system-ui,sans-serif;padding:10px 16px;border-bottom:2px solid #171717;background:#f7efe9;color:#171717">🛡️ anon reader · thunder</div>';
  out = out.replace(/<body([^>]*)>/i, `<body$1>${banner}`);

  return out;
}

function absolutize(u, base) {
  if (!u) return null;
  u = u.trim();
  if (!u || u.startsWith('#')) return null;
  if (/^(javascript|vbscript):/i.test(u)) return null;
  try {
    return new URL(u, base).href;
  } catch {
    return null;
  }
}

module.exports = { proxify };
