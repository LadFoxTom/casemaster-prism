/** Tiny DOM helpers shared across enhancers. */

export function $<T extends Element>(sel: string, root: ParentNode = document): T | null {
  return root.querySelector<T>(sel);
}

export function $$<T extends Element>(sel: string, root: ParentNode = document): T[] {
  return Array.from(root.querySelectorAll<T>(sel));
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number | boolean | undefined> = {},
  children: Array<Node | string> = []
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (k === 'class' || k === 'className') {
      node.className = String(v);
    } else if (k.startsWith('on') && typeof v === 'function') {
      node.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
    } else if (v === true) {
      node.setAttribute(k, '');
    } else {
      node.setAttribute(k, String(v));
    }
  }
  for (const c of children) {
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
}

export function debounce<F extends (...args: unknown[]) => void>(fn: F, ms: number): F {
  let h: ReturnType<typeof setTimeout> | undefined;
  return ((...args: unknown[]) => {
    if (h) clearTimeout(h);
    h = setTimeout(() => fn(...args), ms);
  }) as F;
}

export function ready(fn: () => void): void {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn, { once: true });
  } else {
    queueMicrotask(fn);
  }
}

export function on<K extends keyof HTMLElementEventMap>(
  target: EventTarget,
  type: K | string,
  handler: (ev: Event) => void,
  options?: AddEventListenerOptions
): () => void {
  target.addEventListener(type, handler, options);
  return () => target.removeEventListener(type, handler, options);
}

/** Escape HTML so user-supplied content is safe to insert via innerHTML.
 *  Prefer textContent where possible — this is for cases where templating into
 *  innerHTML is unavoidable (e.g. composing a table-cell highlight). */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Stable-sort comparator for table cells.
 *
 * Strategy, in order:
 *   1. If both look like ISO/locale dates → date compare.
 *   2. If both parse as numbers (after stripping currency, %, thousands) → numeric.
 *   3. Otherwise → locale string compare (numeric-aware).
 */
export function compareCells(a: string, b: string): number {
  // 1. Date — looser than parseFloat (avoids the "2024-01-01" → NaN trap).
  if (looksLikeDate(a) && looksLikeDate(b)) {
    const da = Date.parse(a);
    const db = Date.parse(b);
    if (!Number.isNaN(da) && !Number.isNaN(db)) return da - db;
  }

  // 2. Numeric — strip currency symbols, %, thousands separators.
  const na = toNumber(a);
  const nb = toNumber(b);
  if (na !== null && nb !== null) return na - nb;

  // 3. Lexical (numeric-aware so "A2" < "A10").
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

function looksLikeDate(s: string): boolean {
  return /^\d{4}-\d{1,2}-\d{1,2}([T ]\d{1,2}:\d{2})?/.test(s.trim());
}

function toNumber(s: string): number | null {
  const cleaned = s.replace(/[\s,$£€¥%]/g, '').trim();
  if (cleaned === '' || !/^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(cleaned)) {
    return null;
  }
  const n = parseFloat(cleaned);
  return Number.isNaN(n) ? null : n;
}
