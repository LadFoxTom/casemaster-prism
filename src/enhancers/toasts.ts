/**
 * Toast notifications — pop-up status messages.
 *
 * Triggers:
 *   - Server-side: ASP.NET / cms-vercel returns the X-Cms-Toast header on any
 *     response — see lib/http.ts. The page-load entry below honours a
 *     <meta name="cms-toast" content='{"kind":"success","message":"Saved"}'>
 *     pattern that both runtimes can emit on POST/redirect.
 *   - Client-side: import { showToast } from '@casemaster/ui'.
 */

import { el } from '../lib/dom.js';

export type ToastKind = 'info' | 'success' | 'warning' | 'danger' | 'error';

export interface ToastOptions {
  kind?: ToastKind;
  title?: string;
  message?: string;
  durationMs?: number;
  /** When false the toast stays until clicked. */
  autoDismiss?: boolean;
}

const KIND_ICON: Record<ToastKind, string> = {
  info:    'ℹ',  // ℹ
  success: '✓',  // ✓
  warning: '⚠',  // ⚠
  danger:  '✖',  // ✖
  error:   '✖',
};

let container: HTMLElement | null = null;

function ensureContainer(): HTMLElement {
  if (container && document.body.contains(container)) return container;
  container = el('div', { class: 'cms-toast-container', role: 'status', 'aria-live': 'polite' });
  document.body.appendChild(container);
  return container;
}

export function showToast(opts: ToastOptions): HTMLElement {
  const kind = opts.kind ?? 'info';
  const root = ensureContainer();

  const icon = el('span', { class: 'cms-toast-icon', 'aria-hidden': 'true' }, [KIND_ICON[kind]]);
  const body = el('div', { class: 'cms-toast-body' });
  if (opts.title) body.appendChild(el('div', { class: 'cms-toast-title' }, [opts.title]));
  if (opts.message) body.appendChild(el('div', { class: 'cms-toast-msg' }, [opts.message]));

  const close = el('button', {
    class: 'cms-toast-close',
    type: 'button',
    'aria-label': 'Close notification',
  }, ['×']);

  const toast = el('div', { class: `cms-toast kind-${kind}` }, [icon, body, close]);

  const dismiss = (): void => {
    if (toast.classList.contains('is-leaving')) return;
    toast.classList.add('is-leaving');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  };

  close.addEventListener('click', dismiss);

  root.appendChild(toast);

  const auto = opts.autoDismiss !== false;
  if (auto) {
    const dur = opts.durationMs ?? 5000;
    setTimeout(dismiss, dur);
  }

  return toast;
}

export function wireToasts(): void {
  // Honour <meta name="cms-toast" content='...JSON...'> on initial render.
  const meta = document.querySelector<HTMLMetaElement>('meta[name="cms-toast"]');
  if (meta && meta.content) {
    try {
      const data = JSON.parse(meta.content) as ToastOptions;
      showToast(data);
    } catch {
      showToast({ kind: 'info', message: meta.content });
    }
    meta.remove();
  }

  // Allow other code to dispatch a toast via custom event.
  window.addEventListener('cms-toast', (ev: Event) => {
    const ce = ev as CustomEvent<ToastOptions>;
    showToast(ce.detail ?? {});
  });
}
