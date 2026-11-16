'use strict';
// thunder — google-style minimal pages, light green palette with dark-green accents.
// all copy comes from lang files via t(); all icons are inline line-svgs from lib/icons.

const { icon } = require('./icons');
const { INV_ANON, CATALOG } = require('./engines');

// bust browser cache on every restart — css/js urls get ?v=<startup-stamp>
const ASSET_V = Date.now().toString(36);

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function logo(size = 'lg') {
  return `<a class="logo logo--${size}" href="/" aria-label="thunder home">${icon('bolt', 'logo-bolt', size === 'lg' ? 44 : 26)}<span>thunder</span></a>`;
}

function navLinks(t, includeTheme = true) {
  const themeBtn = includeTheme
    ? `<button class="theme-toggle" type="button" aria-label="${esc(t('theme_label'))}" title="${esc(t('theme_label'))}">
        ${icon('sun', 'icon-sun', 16)}${icon('moon', 'icon-moon', 16)}
      </button>`
    : '';
  return `<nav class="topnav">
    ${themeBtn}
    <a class="topnav-link" href="/about">${icon('speech', '', 16)}<span>${esc(t('nav_about'))}</span></a>
    <a class="topnav-link" href="/privacy">${icon('shield', '', 16)}<span>${esc(t('nav_privacy'))}</span></a>
    <a class="topnav-link" href="/settings">${icon('gear', '', 16)}<span>${esc(t('nav_settings'))}</span></a>
  </nav>`;
}

function layout({ t, lang, dir, title, body, chrome = 'full', theme = 'auto' }) {
  const header = chrome === 'full' ? `<header class="topbar">
    ${logo('sm')}
    ${navLinks(t)}
  </header>` : '';
  return `<!doctype html>
<html lang="${lang}" dir="${dir}" data-theme="${theme}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="${esc(t('meta_description'))}">
<meta name="referrer" content="no-referrer">
<!-- force "dark reader" style extensions to leave our own theme system alone -->
<meta name="darkreader-lock">
<link rel="search" type="application/opensearchdescription+xml" title="thunder" href="/opensearch.xml">
<meta name="theme-color" content="#f4f8f5" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0e1611" media="(prefers-color-scheme: dark)">
<title>${esc(title)}</title>
<link rel="icon" href="/favicon.svg?v=${ASSET_V}" type="image/svg+xml">
<link rel="stylesheet" href="/fonts/fonts.css?v=${ASSET_V}">
<link rel="stylesheet" href="/css/style.css?v=${ASSET_V}">
</head>
<body>
${header}
<main class="page page--${chrome}">
${body}
</main>
<footer class="bottombar">
  <span class="credit">${icon('heart', '', 13)} ${esc(t('developer_credit'))}</span>
  <span class="promise">${esc(t('nonprofit_line'))}</span>
  <span class="oss">${icon('lock', '', 13)} ${esc(t('open_source_line'))}</span>
</footer>
<script src="/js/app.js?v=${ASSET_V}" defer></script>
</body>
</html>`;
}

function searchForm(t, { q = '', cat = 'web', big = true } = {}) {
  return `<form class="search-form ${big ? 'search-form--big' : 'search-form--bar'}" action="/search" method="get" role="search">
  <input type="hidden" name="cat" value="${esc(cat)}">
  <div class="search-pill">
    ${icon('search', 'search-icon', 18)}
    <input class="search-input" type="search" name="q" value="${esc(q)}" placeholder="${esc(t('search_placeholder'))}" autocomplete="off" autocapitalize="off" spellcheck="false" ${big ? 'autofocus' : ''}>
    <button class="search-submit" type="submit" aria-label="${esc(t('search_button'))}">${icon('search', '', 18)}</button>
  </div>
</form>`;
}

/* ---------------- home (google-style, centered) ---------------- */
function home(t, { lang, dir, theme }) {
  const langLinks = [
    ['ar', 'العربية'],
    ['en', 'english'],
    ['fr', 'français'],
  ];
  const body = `
<section class="home-center">
  ${logo('lg')}
  <p class="home-tagline">${esc(t('brand_tagline'))}</p>
  ${searchForm(t, { big: true })}
  <div class="home-actions">
    <button class="btn btn--solid" type="button" data-submit="1">${esc(t('search_button'))}</button>
    <button class="btn btn--ghost" type="button" data-lucky="1">${esc(t('lucky_button'))}</button>
    <a class="btn btn--ghost" href="/random" title="${esc(t('random_button'))}">${icon('shuffle', '', 16)}<span>${esc(t('random_button'))}</span></a>
    <a class="btn btn--ghost" href="/add-to-browser" title="${esc(t('add_title'))}">${icon('target', '', 16)}<span>${esc(t('default_engine_button'))}</span></a>
  </div>
  <div class="home-langs">
    ${langLinks.map(([code, name]) => `<a href="/?lang=${code}">${name}</a>`).join('<span class="dot">·</span>')}
  </div>
  <div class="home-langs">
    <button class="theme-toggle" type="button" aria-label="${esc(t('theme_label'))}" title="${esc(t('theme_label'))}">
      ${icon('sun', 'icon-sun', 16)}${icon('moon', 'icon-moon', 16)}
    </button>
    <a href="/about">${esc(t('nav_about'))}</a><span class="dot">·</span>
    <a href="/privacy">${esc(t('nav_privacy'))}</a><span class="dot">·</span>
    <a href="/settings">${esc(t('nav_settings'))}</a>
  </div>
</section>
<p class="home-privacy-line">${icon('shield', '', 15)} ${esc(t('privacy_one_line'))}</p>`;
  return layout({ t, lang, dir, theme, title: `thunder — ${t('brand_tagline')}`, chrome: 'home', body });
}

/* ---------------- search ---------------- */
function searchPage(t, { lang, dir, theme, q, cat, results, enginesOk, enginesFailed, took, instant }) {
  const tabs = ['web', 'images', 'videos', 'news']
    .map(
      (c) => `<a class="tab${cat === c ? ' is-active' : ''}" href="/search?${new URLSearchParams({ q, cat: c })}">
      ${icon(c === 'web' ? 'search' : c === 'images' ? 'image' : c === 'videos' ? 'play' : 'news', '', 15)}<span>${esc(t('tab_' + c))}</span></a>`
    )
    .join('');

  let list = '';
  if (!results.length) {
    list = `<div class="empty-card">
      ${icon('ghost', '', 44)}
      <h2 class="heading-sm">${esc(t('results_none_title'))}</h2>
      <p class="body-sm">${esc(t('results_none_body'))}</p>
    </div>`;
  } else if (cat === 'images') {
    list = `<div class="img-grid">${results.map(imagesCard).join('')}</div>`;
  } else if (cat === 'videos') {
    list = `<div class="video-grid">${results.map(videoCard).join('')}</div>`;
  } else if (cat === 'news') {
    list = `<div class="news-list">${results.map(newsCard).join('')}</div>`;
  } else {
    list = results.map(webCard).join('');
  }

  const instantCard = instant
    ? `<div class="instant-card">${icon('sparkle', '', 22)}<div><p class="instant-label">${esc(t('instant_answer'))}</p><p class="instant-value">${esc(instant)}</p></div></div>`
    : '';
  const body = `
<header class="search-head">
  ${logo('sm')}
  ${searchForm(t, { q, cat, big: false })}
  ${navLinks(t)}
</header>
<div class="search-body">
  <nav class="tabs" aria-label="categories">${tabs}</nav>
  <div class="meta-row">
    <span>${results.length} ${esc(t('stats_results'))} · ${esc(took)}ms · ${enginesOk} ${esc(t('stats_engines'))}${enginesFailed ? ` · ${enginesFailed} ✗` : ''}</span>
    <button class="share-link" type="button" id="share-link" data-toast="${esc(t('copy_done'))}">${icon('link', '', 14)}<span>${esc(t('share_link'))}</span></button>
  </div>
  ${instantCard}
  <section class="results">${list}</section>
</div>`;
  return layout({ t, lang, dir, theme, title: `${q} — thunder`, chrome: 'search', body });

  function webCard(r) {
    let host = '';
    try {
      host = new URL(r.url).hostname.replace(/^www\./, '');
    } catch {}
    const proxyHref = `/proxy?url=${encodeURIComponent(r.url)}`;
    return `<article class="result">
    <div class="result-host">${icon('globe', '', 13)} ${esc(host)}</div>
    <h2 class="result-title"><a class="r-link" href="${esc(r.url)}">${esc(r.title)}</a></h2>
    <p class="result-snippet">${esc(r.snippet)}</p>
    <div class="result-meta">
      ${r.votes > 1 ? `<span class="votes">${esc(t('stats_engines'))} ${r.votes}</span>` : ''}
      <a class="proxy-link" href="${esc(proxyHref)}">${icon('ghost', '', 14)}<span>${esc(t('proxy_this'))}</span></a>
    </div>
  </article>`;
  }

  function imagesCard(r) {
    return `<figure class="img-card">
    <a class="r-link img-frame" href="${esc(r.url)}" title="${esc(r.title)}">
      <img src="${esc(r.thumb || r.url)}" alt="${esc(r.title)}" loading="lazy" width="${esc(r.width || 300)}" height="${esc(r.height || 200)}">
    </a>
    <figcaption class="img-caption">
      <span class="img-license">${esc(r.license || '')}</span>
      <a class="img-page" href="${esc(r.page || r.url)}" title="${esc(t('img_open'))}">${esc(r.source || '')}</a>
    </figcaption>
  </figure>`;
  }

  function videoCard(r) {
    const date = r.date ? new Date(r.date) : null;
    const dateStr = date && !isNaN(date) ? date.toLocaleDateString(lang === 'ar' ? 'ar' : lang === 'fr' ? 'fr' : 'en', { dateStyle: 'medium' }) : '';
    return `<article class="video-card">
    <a class="r-link video-thumb" href="${esc(r.url)}" title="${esc(r.title)}">
      <img src="${esc(r.thumb)}" alt="${esc(r.title)}" loading="lazy">
      ${r.duration ? `<span class="video-duration">${esc(r.duration)}</span>` : ''}
    </a>
    <h3 class="video-title"><a class="r-link" href="${esc(r.url)}">${esc(r.title)}</a></h3>
    <div class="video-meta">
      <span class="video-publisher">${esc(r.publisher || '')}</span>
      ${dateStr ? `<span class="news-date">${esc(dateStr)}</span>` : ''}
    </div>
    ${r.videoId ? `<a class="proxy-link" href="${esc(`${INV_ANON}/watch?v=${r.videoId}`)}" target="_blank" rel="noopener noreferrer">${icon('play', '', 14)}<span>${esc(t('watch_anon'))}</span></a>` : ''}
  </article>`;
  }

  function newsCard(r) {
    const date = r.date ? new Date(r.date) : null;
    const dateStr = date && !isNaN(date) ? date.toLocaleDateString(lang === 'ar' ? 'ar' : lang === 'fr' ? 'fr' : 'en', { dateStyle: 'medium' }) : '';
    const proxyHref = `/proxy?url=${encodeURIComponent(r.url)}`;
    return `<article class="result news-result">
    <div class="result-host">${icon('news', '', 13)} ${esc(r.source || '')}</div>
    <h2 class="result-title"><a class="r-link" href="${esc(r.url)}">${esc(r.title)}</a></h2>
    <div class="result-meta">
      ${dateStr ? `<span class="news-date">${esc(t('news_ago'))} · ${esc(dateStr)}</span>` : ''}
      <a class="proxy-link" href="${esc(proxyHref)}">${icon('ghost', '', 14)}<span>${esc(t('proxy_this'))}</span></a>
    </div>
  </article>`;
  }
}

/* ---------------- settings ---------------- */
function settingsPage(t, { lang, dir, theme = 'auto', safe = true, newtab = true, recent = true, enginesOn = null }) {
  const langs = [
    ['ar', 'العربية'],
    ['en', 'english'],
    ['fr', 'français'],
  ];
  const themes = [
    ['light', 'theme_light'],
    ['dark', 'theme_dark'],
    ['auto', 'theme_auto'],
  ];
  const engineSections = Object.entries(CATALOG)
    .map(([cat, list]) => {
      const catIcon = { web: 'search', images: 'image', videos: 'play', news: 'news' }[cat];
      return `<div class="engine-group">
      <span class="engine-cat">${icon(catIcon, '', 14)} ${esc(t('tab_' + cat))}</span>
      <div class="engine-chips">
        ${list
          .map(
            (e) => `<label class="chip"><input type="checkbox" name="engines" value="${esc(e.id)}"${!enginesOn || enginesOn.has(e.id) ? ' checked' : ''}> ${esc(e.label)}</label>`
          )
          .join('')}
      </div>
    </div>`;
    })
    .join('');
  const onOff = (key, checked) => `
      <span class="settings-switch">
        <label><input type="radio" name="${key}" value="1"${checked ? ' checked' : ''}> ${esc(t('settings_on'))}</label>
        <label><input type="radio" name="${key}" value="0"${checked ? '' : ' checked'}> ${esc(t('settings_off'))}</label>
      </span>`;
  const body = `
<section class="panel">
  <h1 class="heading">${icon('gear', '', 28)} ${esc(t('settings_title'))}</h1>
  <form class="settings-form" action="/settings/save" method="post">
    <label class="settings-row">
      <span class="settings-label">${esc(t('settings_language'))}</span>
      <select class="settings-select" name="lang" dir="ltr">
        ${langs.map(([code, name]) => `<option value="${code}"${code === lang ? ' selected' : ''}>${name}</option>`).join('')}
      </select>
    </label>
    <label class="settings-row">
      <span class="settings-label">${esc(t('theme_label'))}</span>
      <select class="settings-select" name="theme">
        ${themes.map(([code, key]) => `<option value="${code}"${code === theme ? ' selected' : ''}>${esc(t(key))}</option>`).join('')}
      </select>
    </label>
    <label class="settings-row">
      <span class="settings-label">${esc(t('settings_safesearch'))}</span>
      ${onOff('safe', safe)}
    </label>
    <label class="settings-row">
      <span class="settings-label">${esc(t('settings_newtab'))}</span>
      <input type="checkbox" name="newtab" value="1"${newtab ? ' checked' : ''}>
    </label>
    <label class="settings-row">
      <span class="settings-label">${esc(t('settings_recent'))}</span>
      <input type="checkbox" name="recent" value="1"${recent ? ' checked' : ''}>
    </label>
    <div class="settings-engines">
      <span class="settings-label">${esc(t('settings_engines'))}</span>
      <p class="settings-note">${esc(t('settings_engines_note'))}</p>
      ${engineSections}
    </div>
    <div class="settings-actions">
      <button class="btn btn--solid" type="submit">${esc(t('settings_save'))}</button>
      <button class="btn btn--ghost btn--sm" id="recent-clear" type="button">${esc(t('settings_clear_recent'))}</button>
    </div>
    <p class="settings-saved" id="settings-saved" hidden>${esc(t('settings_saved'))}</p>
  </form>
</section>`;
  return layout({ t, lang, dir, theme, title: `${t('settings_title')} — thunder`, chrome: 'full', body });
}

/* ---------------- about / privacy ---------------- */
function aboutPage(t, { lang, dir, theme }) {
  const features = [
    ['search', 'feature_multi_title', 'feature_multi_body'],
    ['image', 'feature_images_title', 'feature_images_body'],
    ['news', 'feature_news_title', 'feature_news_body'],
    ['ghost', 'feature_proxy_title', 'feature_proxy_body'],
    ['sparkle', 'feature_instant_title', 'feature_instant_body'],
    ['globe', 'feature_i18n_title', 'feature_i18n_body'],
  ];
  const body = `
<section class="panel">
  <h1 class="heading">${icon('speech', '', 28)} ${esc(t('about_title'))}</h1>
  <p class="body-lg">${esc(t('about_body'))}</p>
  <p class="nonprofit">${esc(t('nonprofit_line'))}</p>
  <h2 class="heading-sm">${esc(t('about_features_title'))}</h2>
  <div class="feature-grid">
    ${features
      .map(
        ([ic, title, text]) => `
    <div class="feature-card">
      <span class="feature-icon">${icon(ic, '', 22)}</span>
      <h3 class="feature-title">${esc(t(title))}</h3>
      <p class="feature-body">${esc(t(text))}</p>
    </div>`
      )
      .join('')}
  </div>
  <p class="dev-credit">${icon('heart', '', 15)} ${esc(t('developer_credit'))} · ${esc(t('open_source_line'))}</p>
</section>`;
  return layout({ t, lang, dir, theme, title: `${t('about_title')} — thunder`, chrome: 'full', body });
}

function privacyPage(t, { lang, dir, theme }) {
  const body = `
<section class="panel">
  <h1 class="heading">${icon('shield', '', 28)} ${esc(t('privacy_title'))}</h1>
  <ul class="privacy-list">
    ${t('privacy_points').map((p) => `<li class="privacy-point">${icon('lock', '', 15)}<span>${esc(p)}</span></li>`).join('')}
  </ul>
</section>`;
  return layout({ t, lang, dir, theme, title: `${t('privacy_title')} — thunder`, chrome: 'full', body });
}

/* ---------------- add-to-browser guide ---------------- */
function addPage(t, { lang, dir, theme }) {
  const browsers = [
    ['chrome', 'add_chrome_title', 'add_chrome_body'],
    ['brave', 'add_brave_title', 'add_brave_body'],
    ['firefox', 'add_firefox_title', 'add_firefox_body'],
    ['edge', 'add_edge_title', 'add_edge_body'],
  ];
  const body = `
<section class="panel">
  <h1 class="heading">${icon('target', '', 28)} ${esc(t('add_title'))}</h1>
  <p class="body-lg">${esc(t('add_intro'))}</p>
  <div class="add-step">
    <p class="body-sm">${esc(t('add_step_detect'))}</p>
    <button class="btn btn--solid" type="button" id="add-open-home">${esc(t('add_open_home'))}</button>
  </div>
  <div class="add-step">
    <p class="body-sm">${esc(t('add_manual_title'))}</p>
    <div class="add-url-box">
      <code id="search-url" data-tpl="/search?q=%s">${esc('…')}</code>
      <button class="btn btn--ghost btn--sm" id="copy-url" data-toast="${esc(t('copy_done'))}" type="button">${icon('link', '', 14)}<span>${esc(t('share_link'))}</span></button>
    </div>
  </div>
  <h2 class="heading-sm">${esc(t('add_browsers_title'))}</h2>
  <div class="guide-grid">
    ${browsers
      .map(
        ([b, title, text]) => `
    <div class="guide-card" data-browser="${b}">
      <h3 class="feature-title">${esc(t(title))}</h3>
      <p class="feature-body">${esc(t(text))}</p>
    </div>`
      )
      .join('')}
  </div>
  <p class="nonprofit">${esc(t('add_mobile_note'))}</p>
</section>`;
  return layout({ t, lang, dir, theme, title: `${t('add_title')} — thunder`, chrome: 'full', body });
}

function errorPage(t, { lang, dir, theme, title, message }) {
  const body = `
<section class="panel">
  <h1 class="heading">${esc(title)}</h1>
  <p class="body-lg">${esc(message)}</p>
  <a class="btn btn--solid" href="/">${esc(t('footer_home'))}</a>
</section>`;
  return layout({ t, lang, dir, theme, title: `${title} — thunder`, chrome: 'full', body });
}

module.exports = { esc, home, searchPage, settingsPage, aboutPage, privacyPage, addPage, errorPage };
