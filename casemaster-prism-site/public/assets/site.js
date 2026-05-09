// Landing-page UX glue — copy buttons, dark toggle, token tester.

(function () {
  // --- Persist + apply dark mode -----------------------------------
  const THEME_KEY = 'cms-ui-landing-theme';
  function setTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem(THEME_KEY, t); } catch {}
    document.querySelectorAll('iframe.theme-aware').forEach((f) => {
      const u = new URL(f.src, location.href);
      if (t === 'dark') u.searchParams.set('theme', 'dark');
      else u.searchParams.delete('theme');
      f.src = u.toString();
    });
  }
  const stored = (() => { try { return localStorage.getItem(THEME_KEY); } catch { return null; } })();
  if (stored === 'dark') setTheme('dark');

  document.addEventListener('click', (ev) => {
    const t = ev.target.closest('[data-theme-toggle]');
    if (!t) return;
    const cur = document.documentElement.getAttribute('data-theme');
    setTheme(cur === 'dark' ? 'light' : 'dark');
  });

  // --- Copy buttons on every <pre> ---------------------------------
  document.querySelectorAll('pre').forEach((pre) => {
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

  // --- Auto-load iframes that only specify data-base ---------------
  // Some iframes carry data-base instead of src — they expected a JS
  // controller (theme picker) to set src. If no picker activates them,
  // fall back to loading the base URL once on page load.
  document.querySelectorAll('iframe[data-base]').forEach((f) => {
    if (f.src) return;
    try {
      const u = new URL(f.dataset.base, location.href);
      if (document.documentElement.getAttribute('data-theme') === 'dark') {
        u.searchParams.set('theme', 'dark');
      }
      f.src = u.toString();
    } catch {}
  });

  // --- Component blocks (Preview / Code / Before tabs) -------------
  // Fetch sandbox.html once, parse out every <template id="demo-X">,
  // and project the template's HTML into each comp-block's code pane.
  let sandboxTemplates = null;
  async function getSandboxTemplates() {
    if (sandboxTemplates) return sandboxTemplates;
    try {
      const res = await fetch('./sandbox.html');
      const text = await res.text();
      const doc = new DOMParser().parseFromString(text, 'text/html');
      const map = {};
      doc.querySelectorAll('template[id^="demo-"]').forEach((t) => {
        const id = t.id.replace(/^demo-/, '');
        // .innerHTML on a template gives back what was inside (already
        // escaped). Pretty-print with leading indent stripped.
        const raw = t.innerHTML.trim();
        const lines = raw.split('\n');
        // Drop the first line's whitespace-only leading indent from all
        // subsequent lines so the snippet doesn't render with a 6-space
        // gutter.
        const indent = (lines[1] ?? '').match(/^\s*/)?.[0]?.length ?? 0;
        const cleaned = lines.map((l) => l.startsWith(' '.repeat(indent)) ? l.slice(indent) : l).join('\n');
        map[id] = cleaned;
      });
      sandboxTemplates = map;
    } catch (e) {
      console.warn('[prism landing] failed to load sandbox templates', e);
      sandboxTemplates = {};
    }
    return sandboxTemplates;
  }

  document.querySelectorAll('.comp-block').forEach(async (block) => {
    const tabs = block.querySelector('.comp-tabs');
    const panes = block.querySelectorAll('.comp-pane');

    const activate = (name) => {
      tabs.querySelectorAll('button[data-pane]').forEach((b) => {
        b.classList.toggle('is-active', b.dataset.pane === name);
      });
      panes.forEach((p) => {
        p.classList.toggle('is-active', p.dataset.pane === name);
      });

      // Lazy-mount iframes when their pane becomes active.
      panes.forEach((p) => {
        const f = p.querySelector('iframe');
        if (!f) return;
        if (p.dataset.pane === name && !f.src && f.dataset.base) {
          const u = new URL(f.dataset.base, location.href);
          if (document.documentElement.getAttribute('data-theme') === 'dark') {
            u.searchParams.set('theme', 'dark');
          }
          f.src = u.toString();
        }
      });
    };

    tabs.querySelectorAll('button[data-pane]').forEach((b) => {
      b.addEventListener('click', () => activate(b.dataset.pane));
    });

    // Auto-fill code pane from the matching sandbox template.
    const codePane = block.querySelector('.comp-pane-code pre code');
    if (codePane) {
      const demo = block.dataset.demo;
      const tpl = await getSandboxTemplates();
      if (demo && tpl[demo]) {
        codePane.textContent = tpl[demo];
      } else {
        codePane.textContent = '<!-- no demo template found for "' + demo + '" -->';
      }
    }

    // Copy button on the tab bar
    const copyBtn = block.querySelector('.comp-copy');
    if (copyBtn) {
      copyBtn.addEventListener('click', async () => {
        const code = block.querySelector('.comp-pane-code pre code')?.textContent ?? '';
        try {
          await navigator.clipboard.writeText(code);
          const orig = copyBtn.textContent;
          copyBtn.textContent = 'Copied';
          copyBtn.classList.add('is-done');
          setTimeout(() => { copyBtn.textContent = orig; copyBtn.classList.remove('is-done'); }, 1400);
        } catch {
          copyBtn.textContent = 'Manual';
        }
      });
    }

    // Activate the first tab by default
    activate('preview');
  });

  // --- Install tabs (hero) -----------------------------------------
  const tabRow = document.querySelector('.install-tabs-row');
  if (tabRow) {
    tabRow.querySelectorAll('button[data-pkg]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pkg = btn.dataset.pkg;
        tabRow.querySelectorAll('button').forEach((b) => {
          const active = b === btn;
          b.classList.toggle('is-active', active);
          b.setAttribute('aria-selected', String(active));
        });
        document.querySelectorAll('[data-pkg-cmd]').forEach((c) => {
          c.toggleAttribute('hidden', c.dataset.pkgCmd !== pkg);
        });
      });
    });
  }
  const installCopy = document.querySelector('.install-copy');
  if (installCopy) {
    installCopy.addEventListener('click', async () => {
      const code = document.querySelector('[data-pkg-cmd]:not([hidden])');
      if (!code) return;
      try {
        await navigator.clipboard.writeText(code.textContent ?? '');
        installCopy.textContent = 'Copied';
        installCopy.classList.add('is-done');
        setTimeout(() => { installCopy.textContent = 'Copy'; installCopy.classList.remove('is-done'); }, 1400);
      } catch {
        installCopy.textContent = 'Manual';
      }
    });
  }

  // --- Sticky header global picker ---------------------------------
  // Drives every iframe that carries the .theme-aware class OR sits inside
  // a [data-theme-frames] container.
  const globalPicker = document.getElementById('globalPicker');
  if (globalPicker) {
    let gPreset  = '';
    let gDensity = '';

    const propagate = () => {
      // Walk every iframe with src containing /sandbox.html (covers
      // .theme-aware, [data-theme-frames] children, anything else).
      document.querySelectorAll('iframe').forEach((f) => {
        if (!f.src && !f.dataset.base) return;
        const baseSrc = f.dataset.base ?? f.src;
        const u = new URL(baseSrc, location.href);
        if (!u.pathname.endsWith('/sandbox.html')) return;
        if (gPreset)  u.searchParams.set('preset',  gPreset);  else u.searchParams.delete('preset');
        if (gDensity) u.searchParams.set('density', gDensity); else u.searchParams.delete('density');
        if (document.documentElement.getAttribute('data-theme') === 'dark') {
          u.searchParams.set('theme', 'dark');
        }
        f.src = u.toString();
      });
    };

    globalPicker.querySelectorAll('button[data-global-preset]').forEach((b) => {
      b.addEventListener('click', () => {
        gPreset = b.dataset.globalPreset;
        globalPicker.querySelectorAll('button[data-global-preset]').forEach((x) =>
          x.classList.toggle('is-active', x === b),
        );
        propagate();
      });
    });
    globalPicker.querySelectorAll('button[data-global-density]').forEach((b) => {
      b.addEventListener('click', () => {
        gDensity = b.dataset.globalDensity;
        globalPicker.querySelectorAll('button[data-global-density]').forEach((x) =>
          x.classList.toggle('is-active', x === b),
        );
        propagate();
      });
    });
  }

  // --- Theme picker ------------------------------------------------
  const picker = document.getElementById('themePicker');
  if (picker) {
    let activePreset  = '';
    let activeDensity = '';

    const refreshFrames = () => {
      const frames = document.querySelectorAll('[data-theme-frames] iframe');
      frames.forEach((f) => {
        const u = new URL(f.dataset.base, location.href);
        if (activePreset)  u.searchParams.set('preset',  activePreset);  else u.searchParams.delete('preset');
        if (activeDensity) u.searchParams.set('density', activeDensity); else u.searchParams.delete('density');
        if (document.documentElement.getAttribute('data-theme') === 'dark') {
          u.searchParams.set('theme', 'dark');
        }
        f.src = u.toString();
      });
    };

    picker.querySelectorAll('button[data-preset]').forEach((b) => {
      b.addEventListener('click', () => {
        activePreset = b.dataset.preset;
        picker.querySelectorAll('button[data-preset]').forEach((x) => x.classList.toggle('is-active', x === b));
        refreshFrames();
      });
    });
    picker.querySelectorAll('button[data-density]').forEach((b) => {
      b.addEventListener('click', () => {
        activeDensity = b.dataset.density;
        picker.querySelectorAll('button[data-density]').forEach((x) => x.classList.toggle('is-active', x === b));
        refreshFrames();
      });
    });

    refreshFrames();
  }

  // --- Token tester ------------------------------------------------
  const tester = document.getElementById('tokenTester');
  if (tester) {
    const accentInput = tester.querySelector('input[name=accent]');
    const radiusInput = tester.querySelector('input[name=radius]');
    const accentValue = tester.querySelector('[data-token=accent]');
    const radiusValue = tester.querySelector('[data-token=radius]');
    const frame = tester.querySelector('iframe');

    function refresh() {
      const accent = accentInput.value;
      const radius = radiusInput.value;
      accentValue.textContent = accent;
      radiusValue.textContent = radius + 'px';

      const u = new URL(frame.dataset.base, location.href);
      u.searchParams.set('ui', '1');
      u.searchParams.set('accent', accent);
      u.searchParams.set('radius', radius);
      if (document.documentElement.getAttribute('data-theme') === 'dark') {
        u.searchParams.set('theme', 'dark');
      }
      frame.src = u.toString();
    }
    accentInput.addEventListener('input', refresh);
    radiusInput.addEventListener('input', refresh);
    refresh();
  }
})();
