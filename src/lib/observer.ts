/**
 * MutationObserver glue — re-runs enhancers when new nodes appear.
 *
 * Both modal-link injections and inline-edit replacements add HTML to the DOM
 * after page load; the observer re-scans those subtrees so users get the same
 * sortable tables / Tom Selects / etc. inside dynamically loaded content.
 *
 * To avoid thrash, we:
 *   - debounce a flushed batch of additions
 *   - skip nodes that already carry data-cms-enhanced
 *   - skip subtrees inside [data-cms-no-enhance]
 */

import { debounce } from './dom.js';

type EnhanceFn = (root: ParentNode) => void;

export function startObserver(enhance: EnhanceFn): () => void {
  const pending = new Set<ParentNode>();

  const flush = debounce(() => {
    for (const root of pending) enhance(root);
    pending.clear();
  }, 30);

  const obs = new MutationObserver((muts) => {
    for (const m of muts) {
      m.addedNodes.forEach((n) => {
        if (n.nodeType !== Node.ELEMENT_NODE) return;
        const e = n as Element;
        if (e.closest('[data-cms-no-enhance]')) return;
        pending.add(e);
      });
    }
    if (pending.size > 0) flush();
  });

  obs.observe(document.body, { childList: true, subtree: true });
  return () => obs.disconnect();
}
