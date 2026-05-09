/**
 * Inline-edit — click a cell with [data-cms-inline-edit] to edit in place.
 *
 * Markup:
 *   <td data-cms-inline-edit
 *       data-cms-edit-field="name"
 *       data-cms-edit-url="/api/inventory/42">
 *     Widget
 *   </td>
 *
 * On commit (Enter / blur), POSTs JSON `{ field: value }` to the URL and shows
 * a toast on success or error. On Escape, reverts.
 */

import { $$, el } from '../lib/dom.js';
import { isAlreadyEnhanced, markEnhanced } from '../lib/compat.js';
import { cmsFetch } from '../lib/http.js';

export function wireInlineEdit(root: ParentNode): void {
  const cells = $$<HTMLElement>('[data-cms-inline-edit]', root);
  for (const cell of cells) {
    if (isAlreadyEnhanced(cell)) continue;
    markEnhanced(cell);
    cell.tabIndex = 0;
    cell.setAttribute('role', 'button');
    cell.setAttribute('aria-label', 'Click to edit');
    cell.addEventListener('click', () => beginEdit(cell));
    cell.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        beginEdit(cell);
      }
    });
  }
}

function beginEdit(cell: HTMLElement): void {
  if (cell.dataset.editing === '1') return;
  cell.dataset.editing = '1';

  const original = cell.textContent?.trim() ?? '';
  cell.dataset.cmsOriginal = original;

  const inputType = cell.dataset.cmsEditType === 'number' ? 'number' : 'text';
  const input = el('input', {
    class: 'form-control form-control-sm',
    type: inputType,
    value: original,
    style: 'min-width:100px',
  }) as HTMLInputElement;

  cell.textContent = '';
  cell.appendChild(input);
  input.focus();
  input.select();

  let committed = false;

  const commit = async (): Promise<void> => {
    if (committed) return;
    committed = true;
    const newValue = input.value.trim();
    if (newValue === original) {
      revert(cell);
      return;
    }

    const url = cell.dataset.cmsEditUrl;
    const field = cell.dataset.cmsEditField ?? 'value';
    if (!url) {
      revert(cell, newValue);
      return;
    }

    cell.textContent = newValue;
    cell.setAttribute('aria-busy', 'true');

    try {
      const res = await cmsFetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: newValue }),
        toastErrors: true,
        toastSuccess: 'Saved',
      });
      if (!res.ok) {
        cell.textContent = original;
      }
    } catch {
      cell.textContent = original;
    } finally {
      cell.removeAttribute('aria-busy');
      cell.dataset.editing = '0';
    }
  };

  const cancel = (): void => {
    if (committed) return;
    committed = true;
    revert(cell, original);
  };

  input.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') { ev.preventDefault(); void commit(); }
    else if (ev.key === 'Escape') { ev.preventDefault(); cancel(); }
  });
  input.addEventListener('blur', () => void commit());
}

function revert(cell: HTMLElement, value?: string): void {
  cell.textContent = value ?? cell.dataset.cmsOriginal ?? '';
  cell.dataset.editing = '0';
}
