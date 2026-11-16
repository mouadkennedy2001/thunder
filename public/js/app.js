'use strict';
// thunder client glue — privacy stays local: prefs live in cookies the user sets,
// recent searches live only in this browser's localStorage.

(function () {
  function getCookie(name) {
    const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : '';
  }

  function setCookie(name, value) {
    document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }

  const $ = (sel) => document.querySelector(sel);

  /* ---------- theme toggle: light → dark → auto (system) ---------- */
  const themeBtn = document.querySelector('.theme-toggle');
  if (themeBtn) {
    const order = ['light', 'dark', 'auto'];
    themeBtn.addEventListener('click', () => {
      const cur = document.documentElement.getAttribute('data-theme') || 'light';
      const next = order[(order.indexOf(cur) + 1) % order.length];
      document.documentElement.setAttribute('data-theme', next);
      setCookie('th_theme', next);
    });
  }

  /* open results in a new tab (setting) */
  if (getCookie('th_newtab') === '1') {
    document.querySelectorAll('a.r-link').forEach((a) => {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    });
  }

  /* ---------- search suggestions (proxied anonymously) ---------- */
  document.querySelectorAll('form.search-form').forEach((form) => {
    const input = form.querySelector('.search-input');
    if (!input) return;
    const box = document.createElement('div');
    box.className = 'suggest';
    box.hidden = true;
    const list = document.createElement('ul');
    box.appendChild(list);
    form.appendChild(box);

    let items = [];
    let idx = -1;
    let ctrl = null;
    let timer = null;

    function hide() {
      box.hidden = true;
      idx = -1;
    }

    function render() {
      list.innerHTML = '';
      items.forEach((s, i) => {
        const li = document.createElement('li');
        li.textContent = s;
        if (i === idx) li.classList.add('is-active');
        li.addEventListener('mousedown', (e) => {
          e.preventDefault(); // keep focus on the input
          input.value = s;
          hide();
          form.requestSubmit();
        });
        list.appendChild(li);
      });
      box.hidden = items.length === 0;
    }

    async function suggest(q) {
      if (ctrl) ctrl.abort();
      ctrl = new AbortController();
      try {
        const res = await fetch('/suggest?q=' + encodeURIComponent(q), { signal: ctrl.signal });
        const data = await res.json();
        items = (data.suggestions || []).filter((s) => s.toLowerCase() !== q.toLowerCase()).slice(0, 7);
      } catch {
        items = [];
      }
      render();
    }

    input.addEventListener('input', () => {
      clearTimeout(timer);
      const q = input.value.trim();
      if (!q) return hide();
      timer = setTimeout(() => suggest(q), 220);
    });

    input.addEventListener('keydown', (e) => {
      if (box.hidden) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        idx = e.key === 'ArrowDown' ? (idx + 1) % items.length : (idx - 1 + items.length) % items.length;
        render();
      } else if (e.key === 'Enter' && idx >= 0) {
        e.preventDefault();
        input.value = items[idx];
        hide();
        form.requestSubmit();
      } else if (e.key === 'Escape') {
        hide();
      }
    });

    input.addEventListener('blur', () => setTimeout(hide, 150));
  });

  /* ---------- home buttons: search + lucky ---------- */
  const form = document.querySelector('form.search-form');
  const submitBtn = document.querySelector('[data-submit]');
  const luckyBtn = document.querySelector('[data-lucky]');
  if (form && submitBtn) submitBtn.addEventListener('click', () => form.requestSubmit());
  if (form && luckyBtn) {
    luckyBtn.addEventListener('click', () => {
      const qInput = form.querySelector('input[name="q"]');
      const q = String(qInput ? qInput.value : '').trim();
      if (!q) return;
      const cat = (form.querySelector('input[name="cat"]') || {}).value || 'web';
      location.href = '/search?' + new URLSearchParams({ q, cat, lucky: '1' });
    });
  }

  /* recent searches — local storage only, never sent to the server */
  const KEY = 'th_recent';
  let recent = [];
  try {
    recent = JSON.parse(localStorage.getItem(KEY) || '[]');
    if (!Array.isArray(recent)) recent = [];
  } catch {
    recent = [];
  }
  recent = recent.slice(0, 8);

  if (form) {
    form.addEventListener('submit', () => {
      if (getCookie('th_recent') === '0') return;
      const qInput = form.querySelector('input[name="q"]') || {};
      const q = String(qInput.value || '').trim();
      if (!q) return;
      const next = [q, ...recent.filter((r) => r !== q)].slice(0, 8);
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {}
    });
  }

  /* ---------- shareable search link (no tracking params) ---------- */
  const share = document.getElementById('share-link');
  if (share) {
    share.addEventListener('click', async () => {
      const u = new URL(location.href);
      const clean = `${u.origin}/search?${new URLSearchParams({ q: u.searchParams.get('q') || '', cat: u.searchParams.get('cat') || 'web' })}`;
      try {
        await navigator.clipboard.writeText(clean);
      } catch {
        // clipboard api blocked — fall back to a prompt
        window.prompt(share.dataset.toast, clean);
        return;
      }
      const t = document.createElement('div');
      t.className = 'toast';
      t.textContent = share.dataset.toast;
      document.body.appendChild(t);
      setTimeout(() => t.remove(), 2000);
    });
  }

  /* clear recent (settings page) */
  const clearBtn = $('#recent-clear');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      try {
        localStorage.removeItem(KEY);
      } catch {}
      recent = [];
      clearBtn.blur();
    });
  }

  /* settings page: show "saved" flash after redirect */
  const saved = $('#settings-saved');
  if (saved && performance.navigation && performance.navigation.type === 1) {
    saved.hidden = false;
  }

  /* "/" focuses the search box */
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) {
      const input = document.querySelector('input.search-input');
      if (input) {
        e.preventDefault();
        input.focus();
        input.select();
      }
    }
  });
})();
