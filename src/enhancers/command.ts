/**
 * Command palette — Cmd+K / Ctrl+K. Linear-style fuzzy quick switcher.
 *
 * Item sources (in order of priority):
 *   1. window.cmsUi.command.items — explicitly provided by the host page.
 *   2. <a> elements inside the sidebar (.wms-sidebar / .cms-sidebar).
 *   3. <a> elements inside the navbar (.navbar).
 *
 * Each item is { label, href?, action?, meta? }. Either href or action runs
 * on Enter / click.
 */

import { $$, el } from '../lib/dom.js';
import { readConfig, type CommandOptions } from '../lib/compat.js';

interface Item {
  label: string;
  meta?: string;
  href?: string;
  action?: () => void;
}

let panel: HTMLElement | null = null;
let input: HTMLInputElement | null = null;
let listEl: HTMLUListElement | null = null;
let items: Item[] = [];
let filtered: Item[] = [];
let activeIndex = 0;

export function wireCommand(opts?: boolean | CommandOptions): void {
  const cfg = typeof opts === 'object' && opts ? opts : null;

  if ((window as unknown as { __cmsCmdkWired?: boolean }).__cmsCmdkWired) return;
  (window as unknown as { __cmsCmdkWired?: boolean }).__cmsCmdkWired = true;

  window.addEventListener('cms-cmdk-open', () => openPalette(cfg));
  window.addEventListener('cms-cmdk-close', () => closePalette());
}

function openPalette(cfg: CommandOptions | null): void {
  if (panel) {
    closePalette();
    return;
  }
  items = collectItems(cfg);
  filtered = items.slice();
  activeIndex = 0;

  panel = buildPalette();
  document.body.appendChild(panel);
  requestAnimationFrame(() => panel?.classList.add('is-open'));
  input?.focus();
}

function closePalette(): void {
  if (!panel) return;
  panel.classList.remove('is-open');
  setTimeout(() => {
    panel?.remove();
    panel = null;
    input = null;
    listEl = null;
  }, 150);
}

function buildPalette(): HTMLElement {
  input = el('input', {
    class: 'cms-cmdk-input',
    placeholder: 'Search commands, pages…',
    type: 'text',
    'aria-label': 'Command palette',
  }) as HTMLInputElement;

  listEl = el('ul', { class: 'cms-cmdk-list', role: 'listbox' }) as HTMLUListElement;

  const root = el('div', { class: 'cms-cmdk', role: 'dialog', 'aria-modal': 'true' }, [
    el('div', { class: 'cms-cmdk-panel' }, [input, listEl]),
  ]);

  root.addEventListener('click', (ev) => {
    if (ev.target === root) closePalette();
  });

  input.addEventListener('input', () => render(input!.value));
  input.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') { ev.preventDefault(); closePalette(); }
    else if (ev.key === 'ArrowDown') { ev.preventDefault(); move(1); }
    else if (ev.key === 'ArrowUp')   { ev.preventDefault(); move(-1); }
    else if (ev.key === 'Enter')     { ev.preventDefault(); commit(); }
  });

  render('');
  return root;
}

function render(query: string): void {
  if (!listEl) return;
  const q = query.trim().toLowerCase();
  filtered = q
    ? items.filter((it) => it.label.toLowerCase().includes(q) || (it.meta?.toLowerCase().includes(q) ?? false))
    : items.slice();
  if (activeIndex >= filtered.length) activeIndex = 0;
  listEl.innerHTML = '';
  if (filtered.length === 0) {
    listEl.appendChild(el('div', { class: 'cms-cmdk-empty' }, [`No matches for "${query}"`]));
    return;
  }
  filtered.forEach((it, i) => {
    const li = el('li', {
      class: 'cms-cmdk-item' + (i === activeIndex ? ' is-active' : ''),
      role: 'option',
      'data-index': i,
    }, [
      el('span', {}, [it.label]),
      it.meta ? el('span', { class: 'cms-cmdk-meta' }, [it.meta]) : document.createTextNode(''),
    ]);
    li.addEventListener('mouseenter', () => {
      activeIndex = i;
      updateActive();
    });
    li.addEventListener('click', () => commit());
    listEl!.appendChild(li);
  });
}

function move(delta: number): void {
  if (filtered.length === 0) return;
  activeIndex = (activeIndex + delta + filtered.length) % filtered.length;
  updateActive();
}

function updateActive(): void {
  if (!listEl) return;
  const lis = listEl.querySelectorAll<HTMLElement>('.cms-cmdk-item');
  lis.forEach((li, i) => li.classList.toggle('is-active', i === activeIndex));
  lis[activeIndex]?.scrollIntoView({ block: 'nearest' });
}

function commit(): void {
  const item = filtered[activeIndex];
  if (!item) return;
  closePalette();
  if (item.action) item.action();
  else if (item.href) window.location.assign(item.href);
}

function collectItems(cfg: CommandOptions | null): Item[] {
  const fromCfg = cfg?.items ?? readConfig().command;
  const explicit: Item[] = Array.isArray(fromCfg)
    ? (fromCfg as Item[])
    : typeof fromCfg === 'object' && fromCfg && 'items' in fromCfg && Array.isArray(fromCfg.items)
      ? fromCfg.items as Item[]
      : [];

  const harvested: Item[] = [];
  // Sidebar links
  for (const a of $$<HTMLAnchorElement>('.wms-sidebar a[href], .cms-sidebar a[href]')) {
    const label = a.textContent?.trim();
    if (!label) continue;
    harvested.push({ label, href: a.href, meta: 'Navigate' });
  }
  // Navbar links
  for (const a of $$<HTMLAnchorElement>('.navbar a[href]')) {
    const label = a.textContent?.trim();
    if (!label || label.length > 40) continue;
    harvested.push({ label, href: a.href, meta: 'Top nav' });
  }

  // Dedupe by label+href
  const seen = new Set<string>();
  const merged: Item[] = [];
  for (const it of [...explicit, ...harvested]) {
    const key = `${it.label}|${it.href ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(it);
  }
  return merged;
}
