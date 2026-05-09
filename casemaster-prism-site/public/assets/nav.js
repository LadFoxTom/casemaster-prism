// Global nav loader. Drop this into any page that has a #gnav-host
// element; it fetches /_nav.html, rewrites relative paths for the
// page's depth, highlights the active link, and wires the mobile
// hamburger.

(async function () {
  const host = document.getElementById('gnav-host');
  if (!host) return;

  // Compute the depth of the current page from the site root.
  // Site root is the directory containing _nav.html. We expose it as a
  // data attribute on #gnav-host (defaults to the current dir).
  const rootRel = host.dataset.root ?? './';
  const navUrl = new URL(rootRel + '_nav.html', location.href).toString();

  let html = '';
  try {
    const res = await fetch(navUrl);
    html = await res.text();
  } catch (e) {
    console.warn('[gnav] could not load _nav.html', e);
    return;
  }

  host.innerHTML = html;

  // Rewrite every data-href to be relative to this page.
  host.querySelectorAll('[data-href]').forEach((a) => {
    const original = a.getAttribute('data-href');
    // Strip leading "./"
    let target = original.replace(/^\.\//, '');
    // Use rootRel as the prefix so a page at /docs/x.html with rootRel="../"
    // gets "../target".
    const finalUrl = rootRel + target;
    a.setAttribute('href', finalUrl);
    a.removeAttribute('data-href');
  });

  // Highlight the active link.
  // We compare against location.pathname relative to rootRel root.
  const here = computeRelativePath(rootRel);
  host.querySelectorAll('a[data-match]').forEach((a) => {
    try {
      const re = new RegExp(a.dataset.match);
      if (re.test(here)) a.classList.add('is-active');
    } catch {}
    a.removeAttribute('data-match');
  });

  // Mobile hamburger
  const hamburger = host.querySelector('.gnav-mobile-toggle');
  if (hamburger) {
    hamburger.addEventListener('click', () => {
      const open = host.classList.toggle('is-open');
      hamburger.setAttribute('aria-expanded', String(open));
    });
    // Close when a link is clicked (mobile UX)
    host.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => host.classList.remove('is-open'));
    });
  }

  // Dark toggle inside the nav (replaces the per-page one)
  const THEME_KEY = 'cms-ui-landing-theme';
  function setTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem(THEME_KEY, t); } catch {}
    document.querySelectorAll('iframe.theme-aware, iframe[data-base]').forEach((f) => {
      const baseSrc = f.dataset.base ?? f.src;
      if (!baseSrc) return;
      try {
        const u = new URL(baseSrc, location.href);
        if (t === 'dark') u.searchParams.set('theme', 'dark');
        else u.searchParams.delete('theme');
        f.src = u.toString();
      } catch {}
    });
  }
  const stored = (() => { try { return localStorage.getItem(THEME_KEY); } catch { return null; } })();
  if (stored === 'dark') setTheme('dark');
  host.addEventListener('click', (ev) => {
    const t = ev.target.closest('[data-theme-toggle]');
    if (!t) return;
    const cur = document.documentElement.getAttribute('data-theme');
    setTheme(cur === 'dark' ? 'light' : 'dark');
  });
})();

function computeRelativePath(rootRel) {
  // location.pathname is e.g. "/docs/themes.html" when served by http-server.
  // rootRel is "../" for a page at depth 1.
  const path = location.pathname.replace(/^\//, ''); // strip leading slash
  // Some servers emit "/docs/" without index — handle empty-segment
  return path === '' ? '' : path.replace(/\/$/, '/'); // keep trailing slash if any
}
