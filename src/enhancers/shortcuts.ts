/**
 * Keyboard shortcuts.
 *
 *   /        focus the first search input on the page
 *   ?        toggle the shortcut help overlay
 *   Cmd+K    open command palette (delegated to enhancers/command.ts)
 *   g d      navigate to dashboard (configurable goto chord)
 *
 * Suppresses when the user is typing in a form field.
 */

import { defaultShortcuts, isTypingInField, matchesChord, type ShortcutMap } from '../lib/shortcuts-map.js';
import { el } from '../lib/dom.js';
import type { ShortcutsOptions } from '../lib/compat.js';

let helpOverlay: HTMLElement | null = null;
let pendingPrefix: string | null = null;
let pendingTimer: ReturnType<typeof setTimeout> | null = null;

export function wireShortcuts(opts?: boolean | ShortcutsOptions): void {
  const overrides = typeof opts === 'object' && opts ? opts : {};
  const map: ShortcutMap = {
    ...defaultShortcuts,
    ...overrides,
    goto: { ...defaultShortcuts.goto, ...(overrides.goto ?? {}) },
  };

  if ((window as unknown as { __cmsShortcutsWired?: boolean }).__cmsShortcutsWired) return;
  (window as unknown as { __cmsShortcutsWired?: boolean }).__cmsShortcutsWired = true;

  document.addEventListener('keydown', (ev) => {
    if (isTypingInField(ev.target)) return;

    // Cmd+K / Ctrl+K — opens command palette.
    if (matchesChord(ev, map.openCommand)) {
      ev.preventDefault();
      window.dispatchEvent(new CustomEvent('cms-cmdk-open'));
      return;
    }

    // / — focus search.
    if (ev.key === map.focusSearch && !ev.metaKey && !ev.ctrlKey) {
      const search = document.querySelector<HTMLInputElement>(
        '.cms-table-search, input[type="search"], input[name="q"], input[placeholder*="search" i]',
      );
      if (search) {
        ev.preventDefault();
        search.focus();
        search.select();
        return;
      }
    }

    // ? — toggle help.
    if (ev.key === map.toggleHelp && !ev.metaKey && !ev.ctrlKey) {
      ev.preventDefault();
      toggleHelp(map);
      return;
    }

    // Escape — dismiss help overlay (and let cmdk handle its own dismiss).
    if (ev.key === map.closeOverlay && helpOverlay) {
      ev.preventDefault();
      hideHelp();
      return;
    }

    // Two-key chord prefix (g X)
    if (pendingPrefix === 'g') {
      const target = map.goto[ev.key.toLowerCase()];
      pendingPrefix = null;
      if (pendingTimer) clearTimeout(pendingTimer);
      if (target) {
        ev.preventDefault();
        window.location.assign(target);
      }
      return;
    }
    if (ev.key.toLowerCase() === 'g' && !ev.metaKey && !ev.ctrlKey && !ev.altKey) {
      pendingPrefix = 'g';
      if (pendingTimer) clearTimeout(pendingTimer);
      pendingTimer = setTimeout(() => { pendingPrefix = null; }, 1200);
    }
  });
}

function toggleHelp(map: ShortcutMap): void {
  if (helpOverlay) hideHelp();
  else showHelp(map);
}

function showHelp(map: ShortcutMap): void {
  const rows: Array<[string, string]> = [
    [map.focusSearch, 'Focus search'],
    [map.toggleHelp, 'Toggle this help'],
    [map.openCommand, 'Open command palette'],
    [map.closeOverlay, 'Close overlay'],
    ...Object.entries(map.goto).map(([k, v]) => [`g ${k}`, `Go to ${v}`] as [string, string]),
  ];

  const list = el('ul', { class: 'list-unstyled mb-0' });
  for (const [chord, label] of rows) {
    list.appendChild(el('li', {
      style: 'display:flex;justify-content:space-between;padding:.35rem 0;border-bottom:1px solid var(--cms-border);',
    }, [
      el('span', {}, [label]),
      el('kbd', { class: 'cms-kbd' }, [chord]),
    ]));
  }

  helpOverlay = el('div', { class: 'cms-cmdk is-open', role: 'dialog' }, [
    el('div', { class: 'cms-cmdk-panel', style: 'padding:var(--cms-space-4)' }, [
      el('div', { style: 'font-weight:600;font-size:var(--cms-text-md);margin-bottom:.5rem' }, ['Keyboard shortcuts']),
      list,
    ]),
  ]);

  helpOverlay.addEventListener('click', (ev) => {
    if (ev.target === helpOverlay) hideHelp();
  });

  document.body.appendChild(helpOverlay);
}

function hideHelp(): void {
  if (!helpOverlay) return;
  helpOverlay.remove();
  helpOverlay = null;
}
