# thunder — a private metasearch engine

no logs · no trackers · no ads · no income — forever

**developer: zerouki ahmed mouad (زروقي أحمد معاذ)** · MIT licensed · nonprofit, with no source of income now or ever.

## what it is

thunder asks many independent search engines on your behalf, anonymously, and stitches
the answers together. it never logs your ip, never stores your searches, and sets no
tracking cookies. the design is minimal and google-like on purpose: a single centered
search box, a light green paper background with dark green accents, and a private line
icon set drawn from scratch (see `public/icons`).

## features

- **multi-engine web search** — duckduckgo html + lite + mojeek in parallel, merged and ranked by agreement
- **image search** — openverse + duckduckgo images, with licenses shown per result
- **news search** — google news rss, localized to your language
- **anonymous reader proxy** — open any result through `/proxy`: scripts, styles, ads and trackers stripped
- **instant answers** — type a math expression, get the answer
- **i'm feeling lucky** — jump straight to the first result
- **full i18n** — `lang/ar.json`, `lang/en.json`, `lang/fr.json`; arabic gets a full right-to-left layout
- **privacy hardening** — strict CSP, no-referrer everywhere, no ip logging (ips are hashed in-memory only for rate limiting), optional outbound proxy
- **local-only extras** — recent searches live in your browser's localStorage, clearable in one click

## run

```sh
npm install
npm start          # → http://localhost:3000
```

## configuration (environment, optional)

| variable | purpose |
|----------|---------|
| `PORT` | listen port (default 3000) |
| `TH_UPSTREAM_PROXY` | route all outbound engine traffic through an http(s) proxy, e.g. a tor bridge (`http://127.0.0.1:8118` with privoxy in front of tor) |

## languages

translations are flat json files in `lang/`. to add a language, drop `lang/de.json`,
add its code to `SUPPORTED` in `lib/i18n.js`, and map its locale in `server.js` (`ddgLocale`).
language is picked from the browser, overridable in settings, stored in a preference cookie (`th_lang`).

## privacy promise

1. no ip addresses are logged, ever.
2. no searches are stored — they exist only while your request is being answered.
3. no tracking or advertising cookies; only your own preference cookies (`th_*`).
4. the anonymous reader strips scripts, styles, ads and trackers from proxied pages.
5. recent searches, if enabled, live only in your browser's local storage.

## notes on engines

all engines are queried without api keys, by fetching their public html/json/rss
endpoints. if one engine changes its markup, thunder keeps working with the others —
results merge gracefully. image results from openverse are cc-licensed and link to
their source page.
"# thunder" 
