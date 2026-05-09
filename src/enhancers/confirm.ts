/**
 * Confirm enhancer — intercept clicks on [data-cms-confirm="..."] and require
 * a confirmation step before continuing. Falls back to the native confirm()
 * dialog; prefer the modal version when Bootstrap 4's modal is available.
 *
 * Markup:
 *   <a href="/delete/42" data-cms-confirm="Delete row 42?">Delete</a>
 *   <button form="f" data-cms-confirm="Submit changes?">Save</button>
 */

import { $$, el } from '../lib/dom.js';
import { isAlreadyEnhanced, markEnhanced } from '../lib/compat.js';

export function wireConfirms(root: ParentNode): void {
  const targets = $$<HTMLElement>('[data-cms-confirm]', root);
  for (const t of targets) {
    if (isAlreadyEnhanced(t)) continue;
    markEnhanced(t);
    t.addEventListener('click', handleClick, { capture: true });
    if (t instanceof HTMLFormElement === false && t.closest('form')) {
      // submit-buttons trigger via 'click' first, so capture is enough.
    }
  }
}

function handleClick(ev: Event): void {
  const target = ev.currentTarget as HTMLElement;
  const message = target.dataset.cmsConfirm ?? 'Are you sure?';

  // If we've already confirmed and re-fired the same event, let it through.
  if (target.dataset.cmsConfirmed === '1') {
    delete target.dataset.cmsConfirmed;
    return;
  }

  ev.preventDefault();
  ev.stopPropagation();

  showConfirm(message, target.dataset.cmsConfirmTitle).then((ok) => {
    if (!ok) return;
    target.dataset.cmsConfirmed = '1';
    // Re-fire the original event so the link/form handler runs.
    if (target instanceof HTMLAnchorElement) {
      target.click();
    } else if (target instanceof HTMLButtonElement || target instanceof HTMLInputElement) {
      // Submit buttons re-click; non-submit just call onclick chain.
      target.click();
    } else {
      target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    }
  });
}

/** Modal-based confirm. Falls back to native confirm() if anything goes wrong. */
function showConfirm(message: string, title?: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const dialog = buildDialog(message, title ?? 'Please confirm');
      document.body.appendChild(dialog.backdrop);
      document.body.appendChild(dialog.root);

      requestAnimationFrame(() => dialog.root.classList.add('show'));

      const finish = (ok: boolean): void => {
        dialog.root.remove();
        dialog.backdrop.remove();
        resolve(ok);
      };

      dialog.cancelBtn.addEventListener('click', () => finish(false));
      dialog.okBtn.addEventListener('click', () => finish(true));
      dialog.backdrop.addEventListener('click', () => finish(false));
      document.addEventListener('keydown', function onKey(ev) {
        if (ev.key === 'Escape') {
          document.removeEventListener('keydown', onKey);
          finish(false);
        }
      });

      dialog.okBtn.focus();
    } catch {
      resolve(window.confirm(message));
    }
  });
}

interface Dialog {
  root: HTMLElement;
  backdrop: HTMLElement;
  okBtn: HTMLButtonElement;
  cancelBtn: HTMLButtonElement;
}

function buildDialog(message: string, title: string): Dialog {
  const backdrop = el('div', { class: 'modal-backdrop fade show' });
  const okBtn = el('button', { class: 'btn btn-primary', type: 'button' }, ['Confirm']) as HTMLButtonElement;
  const cancelBtn = el('button', { class: 'btn btn-secondary', type: 'button' }, ['Cancel']) as HTMLButtonElement;

  const root = el('div', {
    class: 'modal fade',
    tabindex: '-1',
    role: 'dialog',
    'aria-modal': 'true',
    style: 'display:block',
  }, [
    el('div', { class: 'modal-dialog modal-dialog-centered', role: 'document' }, [
      el('div', { class: 'modal-content' }, [
        el('div', { class: 'modal-header' }, [
          el('h5', { class: 'modal-title' }, [title]),
        ]),
        el('div', { class: 'modal-body' }, [el('p', {}, [message])]),
        el('div', { class: 'modal-footer' }, [cancelBtn, okBtn]),
      ]),
    ]),
  ]);

  return { root, backdrop, okBtn, cancelBtn };
}
