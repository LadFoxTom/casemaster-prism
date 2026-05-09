/**
 * Table enhancer — sort, filter, sticky thead, column toggle, CSV export.
 *
 * Verified .NET runtime markup (page/data/table qualifier):
 *   <table class='table table-sm table-striped table-bordered'>
 *     <thead class='bg-primary text-light'>...
 *
 * We attach to:
 *   - any `.cms-table` (the opt-in marker the proposal originally
 *     suggested),
 *   - any `table.table.table-striped` or `table.table.table-bordered`
 *     (the actual default emitted by the .NET runtime),
 *   - skipping anything tagged `[data-cms-no-enhance]` or already
 *     enhanced.
 */

import { $$ , el, debounce, escapeHtml, compareCells } from '../lib/dom.js';
import { shouldSkip, markEnhanced, type TablesOptions } from '../lib/compat.js';

const TABLE_SELECTOR =
  'table.cms-table, table.table.table-striped, table.table.table-bordered';

type SortDir = 'asc' | 'desc';

interface TableState {
  table: HTMLTableElement;
  toolbar?: HTMLElement;
  search?: HTMLInputElement;
  countLabel?: HTMLElement;
  sortIndex: number;
  sortDir: SortDir;
  originalOrder: HTMLTableRowElement[];
}

export function enhanceTables(root: ParentNode, opts: TablesOptions = {}): void {
  const tables = $$<HTMLTableElement>(TABLE_SELECTOR, root);

  for (const table of tables) {
    if (shouldSkip(table)) continue;
    const tbody = table.tBodies[0];
    if (!tbody) continue;
    const minRows = opts.minRowsToEnhance ?? 2;
    if (tbody.rows.length < minRows) continue;

    markEnhanced(table);

    const state: TableState = {
      table,
      sortIndex: -1,
      sortDir: 'asc',
      originalOrder: Array.from(tbody.rows),
    };

    if (opts.search !== false || opts.csvExport !== false || opts.columnToggle !== false) {
      addToolbar(state, opts);
    }
    if (opts.sort !== false) {
      makeHeadersSortable(state);
    }
    detectNumericColumns(state);
  }
}

function addToolbar(state: TableState, opts: TablesOptions): void {
  const { table } = state;

  const toolbar = el('div', { class: 'cms-table-toolbar', role: 'toolbar' });

  if (opts.search !== false) {
    const search = el('input', {
      class: 'form-control form-control-sm cms-table-search',
      type: 'search',
      placeholder: 'Filter rows…',
      'aria-label': 'Filter table',
    }) as HTMLInputElement;
    state.search = search;
    search.addEventListener('input', debounce(() => applyFilter(state), 80));
    toolbar.appendChild(search);
  }

  if (opts.columnToggle !== false) {
    toolbar.appendChild(buildColumnToggle(state));
  }

  if (opts.csvExport !== false) {
    const exportBtn = el(
      'button',
      { class: 'btn btn-sm btn-outline-secondary', type: 'button', title: 'Export visible rows as CSV' },
      ['CSV'],
    );
    exportBtn.addEventListener('click', () => exportToCsv(state));
    toolbar.appendChild(exportBtn);
  }

  const count = el('span', { class: 'cms-table-count' });
  state.countLabel = count;
  toolbar.appendChild(count);

  // Insert before the table
  table.parentNode?.insertBefore(toolbar, table);
  state.toolbar = toolbar;

  updateCount(state);
}

function buildColumnToggle(state: TableState): HTMLElement {
  const headers = Array.from(state.table.tHead?.rows[0]?.cells ?? []);

  const wrap = el('div', { class: 'cms-col-toggle' });
  const trigger = el(
    'button',
    {
      class: 'btn btn-sm btn-outline-secondary',
      type: 'button',
      'aria-haspopup': 'true',
      'aria-expanded': 'false',
    },
    ['Columns'],
  );
  const menu = el('div', { class: 'cms-col-toggle-menu', role: 'menu' });

  headers.forEach((th, i) => {
    const cb = el('input', { type: 'checkbox', checked: true }) as HTMLInputElement;
    const label = el('label', {}, [cb, document.createTextNode(' ' + (th.textContent?.trim() || `Col ${i + 1}`))]);
    cb.addEventListener('change', () => toggleColumn(state, i, cb.checked));
    menu.appendChild(label);
  });

  trigger.addEventListener('click', (ev) => {
    ev.stopPropagation();
    wrap.classList.toggle('is-open');
    trigger.setAttribute('aria-expanded', String(wrap.classList.contains('is-open')));
  });
  document.addEventListener('click', (ev) => {
    if (!wrap.contains(ev.target as Node)) wrap.classList.remove('is-open');
  });

  wrap.appendChild(trigger);
  wrap.appendChild(menu);
  return wrap;
}

function toggleColumn(state: TableState, index: number, visible: boolean): void {
  const { table } = state;
  const display = visible ? '' : 'none';
  const head = table.tHead?.rows[0];
  if (head?.cells[index]) (head.cells[index] as HTMLElement).style.display = display;
  for (const row of Array.from(table.tBodies[0]?.rows ?? [])) {
    if (row.cells[index]) (row.cells[index] as HTMLElement).style.display = display;
  }
  for (const row of Array.from(table.tFoot?.rows ?? [])) {
    if (row.cells[index]) (row.cells[index] as HTMLElement).style.display = display;
  }
}

function makeHeadersSortable(state: TableState): void {
  const head = state.table.tHead?.rows[0];
  if (!head) return;
  Array.from(head.cells).forEach((th, i) => {
    if (th.hasAttribute('data-cms-no-sort')) return;
    th.setAttribute('data-cms-sortable', '1');
    th.tabIndex = 0;
    th.setAttribute('role', 'columnheader');
    th.setAttribute('aria-sort', 'none');
    const handler = (): void => {
      const dir: SortDir = state.sortIndex === i && state.sortDir === 'asc' ? 'desc' : 'asc';
      sortBy(state, i, dir);
    };
    th.addEventListener('click', handler);
    th.addEventListener('keydown', (ev) => {
      if ((ev as KeyboardEvent).key === 'Enter' || (ev as KeyboardEvent).key === ' ') {
        ev.preventDefault();
        handler();
      }
    });
  });
}

function sortBy(state: TableState, index: number, dir: SortDir): void {
  const tbody = state.table.tBodies[0];
  if (!tbody) return;

  const rows = Array.from(tbody.rows);
  rows.sort((a, b) => {
    const av = (a.cells[index]?.textContent ?? '').trim();
    const bv = (b.cells[index]?.textContent ?? '').trim();
    return compareCells(av, bv);
  });
  if (dir === 'desc') rows.reverse();

  for (const row of rows) tbody.appendChild(row);
  state.sortIndex = index;
  state.sortDir = dir;

  // Update header indicators
  const head = state.table.tHead?.rows[0];
  if (head) {
    Array.from(head.cells).forEach((th, i) => {
      if (i === index) {
        th.setAttribute('data-cms-sort', dir);
        th.setAttribute('aria-sort', dir === 'asc' ? 'ascending' : 'descending');
      } else {
        th.removeAttribute('data-cms-sort');
        th.setAttribute('aria-sort', 'none');
      }
    });
  }
}

function applyFilter(state: TableState): void {
  const tbody = state.table.tBodies[0];
  if (!tbody) return;
  const term = (state.search?.value ?? '').trim().toLowerCase();

  let visible = 0;
  for (const row of Array.from(tbody.rows)) {
    if (row.classList.contains('cms-table-empty')) continue;
    const text = row.textContent?.toLowerCase() ?? '';
    const match = !term || text.includes(term);
    row.style.display = match ? '' : 'none';
    if (match) visible++;
  }

  // Empty-state row
  const colspan = state.table.tHead?.rows[0]?.cells.length ?? 1;
  let emptyRow = tbody.querySelector<HTMLTableRowElement>('tr.cms-table-empty');
  if (visible === 0 && term) {
    if (!emptyRow) {
      emptyRow = el('tr', { class: 'cms-table-empty' }, [
        el('td', { colspan: String(colspan) }, ['No rows match "', term, '"']),
      ]);
      tbody.appendChild(emptyRow);
    } else {
      const td = emptyRow.cells[0];
      if (td) td.textContent = `No rows match "${term}"`;
      emptyRow.style.display = '';
    }
  } else if (emptyRow) {
    emptyRow.style.display = 'none';
  }

  updateCount(state);
}

function updateCount(state: TableState): void {
  const tbody = state.table.tBodies[0];
  if (!tbody || !state.countLabel) return;
  const all = Array.from(tbody.rows).filter((r) => !r.classList.contains('cms-table-empty'));
  const visible = all.filter((r) => r.style.display !== 'none').length;
  state.countLabel.textContent = visible === all.length
    ? `${all.length} row${all.length === 1 ? '' : 's'}`
    : `${visible} of ${all.length}`;
}

function detectNumericColumns(state: TableState): void {
  const head = state.table.tHead?.rows[0];
  const tbody = state.table.tBodies[0];
  if (!head || !tbody) return;

  const cols = head.cells.length;
  for (let i = 0; i < cols; i++) {
    const sample = Array.from(tbody.rows).slice(0, 12);
    if (sample.length === 0) continue;
    const allNumeric = sample.every((row) => {
      const v = row.cells[i]?.textContent?.trim() ?? '';
      if (v === '' || v === '—' || v === '-') return true;
      return /^[-+]?[\d,. ]+%?$/.test(v);
    });
    if (allNumeric) {
      head.cells[i]?.setAttribute('data-cms-numeric', '1');
      for (const row of Array.from(tbody.rows)) {
        row.cells[i]?.setAttribute('data-cms-numeric', '1');
      }
    }
  }
}

/** CSV export of currently-visible rows. RFC 4180 quoting. */
function exportToCsv(state: TableState): void {
  const lines: string[] = [];
  const head = state.table.tHead?.rows[0];
  if (head) lines.push(rowToCsv(Array.from(head.cells)));
  for (const row of Array.from(state.table.tBodies[0]?.rows ?? [])) {
    if (row.style.display === 'none') continue;
    if (row.classList.contains('cms-table-empty')) continue;
    lines.push(rowToCsv(Array.from(row.cells)));
  }
  const csv = lines.join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const filename = (document.title || 'export').replace(/[^A-Za-z0-9_-]+/g, '_') + '.csv';
  const a = el('a', { href: url, download: filename, style: 'display:none' });
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 200);
}

function rowToCsv(cells: HTMLTableCellElement[]): string {
  return cells
    .filter((c) => (c as HTMLElement).style.display !== 'none')
    .map((c) => csvField(c.textContent ?? ''))
    .join(',');
}

function csvField(s: string): string {
  const trimmed = s.replace(/\s+/g, ' ').trim();
  if (/[",\r\n]/.test(trimmed)) {
    return '"' + trimmed.replace(/"/g, '""') + '"';
  }
  return trimmed;
}

// Re-exported helpers — surface these so tests can hit them directly.
export const _internals = { compareCells, csvField, escapeHtml };
