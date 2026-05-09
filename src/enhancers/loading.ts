/**
 * Loading-state enhancer — top-bar progress, busy-button, navigation tracker.
 *
 * Triggers:
 *   - Click on a same-origin <a> with no target=_blank.
 *   - Submit on any <form> (except [data-cms-no-progress]).
 *   - fetch / XHR if the wrapped helper from lib/http.ts is used.
 *
 * The progress bar is purely cosmetic; it animates to 80% on activity start
 * and snaps to 100% on full page unload. On SPA-style fetch-based pages we
 * also accept a manual `cms-progress-end` window event.
 */

import { el } from '../lib/dom.js';

let bar: HTMLElement | null = null;
let activeCount = 0;
let resetHandle: ReturnType<typeof setTimeout> | null = null;

function ensureBar(): HTMLElement {
  if (bar && document.body.contains(bar)) return bar;
  bar = el('div', { class: 'cms-progress-bar', role: 'progressbar', 'aria-hidden': 'true' });
  document.body.appendChild(bar);
  return bar;
}

export function startLoading(): void {
  activeCount++;
  const b = ensureBar();
  b.classList.remove('is-complete');
  b.classList.add('is-active');
}

export function endLoading(): void {
  if (activeCount > 0) activeCount--;
  if (activeCount > 0) return;
  const b = ensureBar();
  b.classList.remove('is-active');
  b.classList.add('is-complete');
  if (resetHandle) clearTimeout(resetHandle);
  resetHandle = setTimeout(() => {
    b.classList.remove('is-complete');
    // reset transform via inline style so re-arming is instant
    b.style.transform = 'scaleX(0)';
    setTimeout(() => { b.style.transform = ''; }, 50);
  }, 250);
}

export function wireLoading(_root: ParentNode): void {
  // Bind once globally — re-binding per-mutation would double-fire.
  if ((window as unknown as { __cmsLoadingWired?: boolean }).__cmsLoadingWired) return;
  (window as unknown as { __cmsLoadingWired?: boolean }).__cmsLoadingWired = true;

  document.addEventListener('click', (ev) => {
    const a = (ev.target as Element | null)?.closest?.('a') as HTMLAnchorElement | null;
    if (!a || !a.href) return;
    if (a.target && a.target !== '_self') return;
    if (a.dataset.cmsNoProgress === '1' || a.closest('[data-cms-no-progress]')) return;
    if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button !== 0) return;
    if (!isSameOrigin(a.href)) return;
    if (a.getAttribute('href')?.startsWith('#')) return;
    startLoading();
  });

  document.addEventListener('submit', (ev) => {
    const form = ev.target as HTMLFormElement | null;
    if (!form) return;
    if (form.matches('[data-cms-no-progress]')) return;
    startLoading();
    markBusySubmitButton(form);
  }, true);

  window.addEventListener('beforeunload', () => {
    const b = ensureBar();
    b.classList.add('is-active');
  });

  window.addEventListener('cms-progress-start', () => startLoading());
  window.addEventListener('cms-progress-end', () => endLoading());

  // pageshow fires on bfcache restore — clear stale state.
  window.addEventListener('pageshow', () => {
    activeCount = 0;
    const b = ensureBar();
    b.classList.remove('is-active');
    b.classList.remove('is-complete');
    b.style.transform = '';
  });
}

function markBusySubmitButton(form: HTMLFormElement): void {
  const btn =
    (form.querySelector('button[type="submit"]:not([disabled])') as HTMLButtonElement | null) ??
    (form.querySelector('input[type="submit"]:not([disabled])') as HTMLInputElement | null);
  if (!btn) return;
  btn.setAttribute('aria-busy', 'true');
  btn.setAttribute('data-cms-was-busy', '1');
}

function isSameOrigin(url: string): boolean {
  try {
    const u = new URL(url, window.location.origin);
    return u.origin === window.location.origin;
  } catch {
    return false;
  }
}
