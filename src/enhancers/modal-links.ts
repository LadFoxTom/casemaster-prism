/**
 * Modal-links — open detail pages in a slide-in modal instead of a full
 * page navigation.
 *
 * Opt-in via:
 *   <a href="/inventory/42" data-cms-modal-link>View</a>
 *
 * The fetched page's <main>/<article>/<.cms-content> body is extracted and
 * inserted into the modal body. The MutationObserver re-runs other enhancers
 * over the new content so tables/forms inside it work as expected.
 */

import { $$, el } from '../lib/dom.js';
import { isAlreadyEnhanced, markEnhanced } from '../lib/compat.js';
import { startLoading, endLoading } from './loading.js';

export function wireModalLinks(root: ParentNode): void {
  const links = $$<HTMLAnchorElement>('a[data-cms-modal-link]', root);
  for (const link of links) {
    if (isAlreadyEnhanced(link)) continue;
    markEnhanced(link);
    link.addEventListener('click', onClick);
  }
}

async function onClick(ev: MouseEvent): Promise<void> {
  const link = ev.currentTarget as HTMLAnchorElement;
  if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button !== 0) return;
  ev.preventDefault();

  const url = link.href;
  startLoading();

  let html = '';
  try {
    const res = await fetch(url, {
      credentials: 'same-origin',
      headers: { 'X-Cms-Modal': '1', Accept: 'text/html' },
    });
    if (!res.ok) {
      window.location.assign(url);
      return;
    }
    html = await res.text();
  } catch {
    window.location.assign(url);
    return;
  } finally {
    endLoading();
  }

  const fragment = extractContent(html, url);
  showModal(link.dataset.cmsModalTitle ?? link.textContent?.trim() ?? '', fragment, url);
}

function extractContent(html: string, fallbackHref: string): DocumentFragment {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  const root =
    tpl.content.querySelector('main') ??
    tpl.content.querySelector('article') ??
    tpl.content.querySelector('.cms-content') ??
    tpl.content.querySelector('.container, .container-fluid');
  const frag = document.createDocumentFragment();
  if (root) {
    Array.from(root.childNodes).forEach((n) => frag.appendChild(n));
  } else {
    frag.appendChild(el('div', {}, [
      el('p', {}, ['Could not load this page in a modal. ']),
      el('a', { href: fallbackHref }, ['Open it directly →']),
    ]));
  }
  return frag;
}

function showModal(title: string, body: DocumentFragment, returnHref: string): void {
  const backdrop = el('div', { class: 'modal-backdrop fade show' });
  const close = el('button', {
    class: 'close',
    type: 'button',
    'aria-label': 'Close',
    'data-dismiss': 'modal',
  }, ['×']);
  const openLink = el('a', { href: returnHref, class: 'btn btn-link btn-sm' }, ['Open page →']);

  const bodyEl = el('div', { class: 'modal-body' });
  bodyEl.appendChild(body);

  const root = el('div', {
    class: 'modal fade show cms-modal-drawer',
    tabindex: '-1',
    role: 'dialog',
    'aria-modal': 'true',
    style: 'display:block',
  }, [
    el('div', { class: 'modal-dialog', role: 'document' }, [
      el('div', { class: 'modal-content' }, [
        el('div', { class: 'modal-header' }, [
          el('h5', { class: 'modal-title' }, [title || 'Details']),
          openLink,
          close,
        ]),
        bodyEl,
      ]),
    ]),
  ]);

  document.body.appendChild(backdrop);
  document.body.appendChild(root);

  const dismiss = (): void => {
    root.remove();
    backdrop.remove();
  };
  close.addEventListener('click', dismiss);
  backdrop.addEventListener('click', dismiss);
  document.addEventListener('keydown', function onKey(ev) {
    if (ev.key === 'Escape') {
      document.removeEventListener('keydown', onKey);
      dismiss();
    }
  });
}
