// Global nav loader. Drop into any page that has a #gnav-host element.
// Fetches /_nav.html (cached in sessionStorage), rewrites relative paths
// for the page's depth, highlights the active link, persists scroll
// position across navigations, and wires the mobile hamburger.

(async function () {
  const host = document.getElementById('gnav-host');
  if (!host) return;

  const rootRel = host.dataset.root ?? './';
  const navUrl  = new URL(rootRel + '_nav.html', location.href).toString();
  const CACHE_KEY  = 'prism-nav-html-v3';
  const SCROLL_KEY = 'prism-nav-scroll';

  let html = '';
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      html = cached;
    } else {
      const res = await fetch(navUrl);
      html = await res.text();
      sessionStorage.setItem(CACHE_KEY, html);
    }
  } catch {
    try {
      const res = await fetch(navUrl);
      html = await res.text();
    } catch (e) {
      console.warn('[gnav] failed to load _nav.html', e);
      return;
    }
  }

  host.innerHTML = html;

  // Rewrite every data-href to be relative to this page.
  host.querySelectorAll('[data-href]').forEach((a) => {
    const original = a.getAttribute('data-href');
    let target = original.replace(/^\.\//, '');
    a.setAttribute('href', rootRel + target);
    a.removeAttribute('data-href');
  });

  // Active-link highlighting. Compare each entry's data-match regex
  // against a normalised current path.
  // location.pathname examples: "/", "/docs/", "/docs/index.html",
  // "/playground/", "/page/cms-demo".
  // Normalise: strip leading slash, trailing slash, "index.html" so
  // /docs/ and /docs/index.html both become "docs".
  let here = location.pathname.replace(/^\//, '').replace(/\/$/, '');
  if (here.endsWith('/index.html')) here = here.slice(0, -'/index.html'.length);
  if (here === 'index.html') here = '';

  let bestMatch = null;
  let bestMatchLen = -1;
  host.querySelectorAll('a[data-match]').forEach((a) => {
    try {
      const re = new RegExp(a.dataset.match);
      if (re.test(here)) {
        // Prefer the most specific match (longest pattern).
        const len = a.dataset.match.length;
        if (len > bestMatchLen) { bestMatch = a; bestMatchLen = len; }
      }
    } catch {}
    a.removeAttribute('data-match');
  });
  if (bestMatch) bestMatch.classList.add('is-active');

  // Same-path links shouldn't trigger a full reload. Useful for
  // "Overview" when already on the homepage — clicking it should just
  // scroll to top, not navigate (which causes a flash).
  host.querySelectorAll('a[href]').forEach((a) => {
    a.addEventListener('click', (ev) => {
      const href = a.getAttribute('href');
      if (!href || href.startsWith('http') || href.startsWith('//')) return;
      const target = new URL(href, location.href);
      const targetPath = target.pathname.replace(/\/$/, '') || '/';
      const herePath   = location.pathname.replace(/\/$/, '') || '/';
      if (targetPath === herePath && !target.hash) {
        ev.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      // Persist nav scroll before navigation.
      try { sessionStorage.setItem(SCROLL_KEY, String(host.scrollTop)); } catch {}
    });
  });

  // Restore nav scroll if the user navigated from another page.
  try {
    const saved = sessionStorage.getItem(SCROLL_KEY);
    if (saved) {
      host.scrollTop = parseInt(saved, 10) || 0;
    } else if (bestMatch) {
      // First visit on this page — make sure the active link is
      // visible by scrolling it into view (without animating).
      const r = bestMatch.getBoundingClientRect();
      const hr = host.getBoundingClientRect();
      if (r.top < hr.top || r.bottom > hr.bottom) {
        bestMatch.scrollIntoView({ block: 'center' });
      }
    }
  } catch {}

  // Persist scroll on every scroll (debounced).
  let saveTimer;
  host.addEventListener('scroll', () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { sessionStorage.setItem(SCROLL_KEY, String(host.scrollTop)); } catch {}
    }, 80);
  });

  // Mobile hamburger
  const hamburger = host.querySelector('.gnav-mobile-toggle');
  if (hamburger) {
    hamburger.addEventListener('click', () => {
      const open = host.classList.toggle('is-open');
      hamburger.setAttribute('aria-expanded', String(open));
    });
    host.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => host.classList.remove('is-open'));
    });
  }

  // Dark toggle — single source of truth (site.js's duplicate handler
  // was removed to stop the cancel-each-other-out bug).
  const THEME_KEY = 'prism-theme';
  function applyTheme(t) {
    if (t === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    else              document.documentElement.removeAttribute('data-theme');
    try { localStorage.setItem(THEME_KEY, t); } catch {}
    document.querySelectorAll('iframe.theme-aware, iframe[data-base]').forEach((f) => {
      const baseSrc = f.dataset.base ?? f.src;
      if (!baseSrc) return;
      try {
        const u = new URL(baseSrc, location.href);
        if (t === 'dark') u.searchParams.set('theme', 'dark');
        else              u.searchParams.delete('theme');
        f.src = u.toString();
      } catch {}
    });
    const btn = host.querySelector('[data-theme-toggle] .gnav-icon-label');
    if (btn) btn.textContent = t === 'dark' ? 'Light' : 'Dark';
  }
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'dark') applyTheme('dark');
    else if (stored === 'light') applyTheme('light');
  } catch {}

  host.addEventListener('click', (ev) => {
    const t = ev.target.closest('[data-theme-toggle]');
    if (!t) return;
    ev.preventDefault();
    const cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    applyTheme(cur === 'dark' ? 'light' : 'dark');
  });
})();
