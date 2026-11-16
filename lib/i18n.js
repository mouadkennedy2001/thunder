'use strict';
// thunder — i18n loader. translations live in /lang as flat json files.
const fs = require('fs');
const path = require('path');

const LANG_DIR = path.join(__dirname, '..', 'lang');
const SUPPORTED = ['ar', 'en', 'fr'];

const cache = new Map();

function load(code) {
  if (!SUPPORTED.includes(code)) code = 'en';
  if (cache.has(code)) return cache.get(code);
  const file = path.join(LANG_DIR, `${code}.json`);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  cache.set(code, data);
  return data;
}

// pick a language from the Accept-Language header
function negotiate(acceptLanguage) {
  if (!acceptLanguage) return 'en';
  const parts = String(acceptLanguage)
    .split(',')
    .map((p) => {
      const [tag, q] = p.trim().split(';q=');
      return { tag: tag.trim().toLowerCase(), q: q ? parseFloat(q) : 1 };
    })
    .filter((p) => p.tag)
    .sort((a, b) => b.q - a.q);
  for (const p of parts) {
    const base = p.tag.split('-')[0];
    if (SUPPORTED.includes(base)) return base;
  }
  return 'en';
}

// translate: t('results_for') or t('hero_body', { mark: 'actually!' })
function make(code) {
  const dict = load(code);
  return function t(key, vars) {
    let s = dict[key];
    if (s === undefined) return key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
    }
    return s;
  };
}

module.exports = { SUPPORTED, load, negotiate, make };
