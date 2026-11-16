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

  /* ---------- add-to-browser guide page ---------- */
  const urlCode = document.getElementById('search-url');
  if (urlCode) {
    // fill the real address template with the current origin
    urlCode.textContent = location.origin + urlCode.dataset.tpl;

    // highlight the user's browser card
    const ua = navigator.userAgent.toLowerCase();
    const detected = ua.includes('edg/') ? 'edge' : ua.includes('brave') || ua.includes('chrome') ? 'brave' : ua.includes('firefox') ? 'firefox' : ua.includes('chrome') ? 'chrome' : '';
    const card = detected && document.querySelector(`.guide-card[data-browser="${detected}"]`);
    if (card) {
      card.classList.add('is-recommended');
      card.scrollIntoView({ block: 'nearest' });
    }

    // brave reports as chrome too — brave users see both cards highlighted
    if (ua.includes('chrome') && !ua.includes('edg/')) {
      const chromeCard = document.querySelector('.guide-card[data-browser="chrome"]');
      if (chromeCard) chromeCard.classList.add('is-recommended');
    }

    const openBtn = document.getElementById('add-open-home');
    if (openBtn) openBtn.addEventListener('click', () => (location.href = '/'));
  }

  /* copy button on the add page */
  const copyUrl = document.getElementById('copy-url');
  if (copyUrl) {
    copyUrl.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(urlCode.textContent);
      } catch {
        window.prompt(copyUrl.dataset.toast, urlCode.textContent);
        return;
      }
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.textContent = copyUrl.dataset.toast;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2000);
    });
  }

  /* settings: engine chips — require at least one checked before saving */
  const engineForm = document.querySelector('.settings-form');
  if (engineForm) {
    engineForm.addEventListener('submit', (e) => {
      const chips = engineForm.querySelectorAll('input[name="engines"]:checked');
      if (!chips.length) {
        e.preventDefault();
        const note = engineForm.querySelector('.settings-note');
        if (note) {
          note.style.color = 'var(--green-dark)';
          note.style.fontWeight = '600';
        }
      }
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
