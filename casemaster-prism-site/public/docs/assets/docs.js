// Docs subsite glue — sidebar load, search filter, copy buttons, anchor
// hover affordances.

(async function () {
  // ---- Load shared sidebar HTML --------------------------------------
  const host = document.getElementById('docs-sidebar-host');
  if (host) {
    try {
      const res = await fetch('./_sidebar.html');
      const html = await res.text();
      host.innerHTML = html;

      // Highlight current page
      const here = location.pathname.split('/').pop();
      host.querySelectorAll('a[href]').forEach((a) => {
        const target = a.getAttribute('href').split('/').pop();
        if (target === here) a.classList.add('is-current');
      });

      // Wire search filter
      const search = host.querySelector('.docs-search');
      if (search) {
        search.addEventListener('input', () => {
          const q = search.value.trim().toLowerCase();
          host.querySelectorAll('.docs-nav a').forEach((a) => {
            const match = !q || a.textContent.toLowerCase().includes(q);
            a.classList.toggle('is-hidden', !match);
          });
        });
      }
    } catch (e) {
      console.warn('[prism-docs] sidebar load failed', e);
    }
  }

  // ---- Anchor links on h2 / h3 --------------------------------------
  document.querySelectorAll('.docs-content h2[id], .docs-content h3[id]').forEach((h) => {
    if (h.querySelector('.anchor')) return;
    const a = document.createElement('a');
    a.className = 'anchor';
    a.href = '#' + h.id;
    a.textContent = '#';
    h.appendChild(a);
  });

  // ---- Copy buttons on every <pre> -----------------------------------
  document.querySelectorAll('.docs-content pre').forEach((pre) => {
    if (pre.querySelector('.copy')) return;
    const btn = document.createElement('button');
    btn.className = 'copy';
    btn.type = 'button';
    btn.textContent = 'Copy';
    btn.addEventListener('click', async () => {
      const code = pre.querySelector('code')?.textContent ?? pre.textContent ?? '';
      try {
        await navigator.clipboard.writeText(code);
        btn.textContent = 'Copied';
        btn.classList.add('is-done');
        setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('is-done'); }, 1400);
      } catch {
        btn.textContent = 'Manual';
      }
    });
    pre.appendChild(btn);
  });

  // ---- Persist + apply dark mode (shared key with the landing site) --
  const THEME_KEY = 'cms-ui-landing-theme';
  function setTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem(THEME_KEY, t); } catch {}
  }
  const stored = (() => { try { return localStorage.getItem(THEME_KEY); } catch { return null; } })();
  if (stored === 'dark') setTheme('dark');
  document.addEventListener('click', (ev) => {
    const t = ev.target.closest('[data-theme-toggle]');
    if (!t) return;
    const cur = document.documentElement.getAttribute('data-theme');
    setTheme(cur === 'dark' ? 'light' : 'dark');
  });
})();
