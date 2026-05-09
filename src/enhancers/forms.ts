/**
 * Forms enhancer — Tom Select for searchable dropdowns, Flatpickr for dates.
 *
 * Coexistence rules:
 *   - .NET runtime ships Select2; we never enhance .select2-hidden-accessible.
 *   - .NET datepicker on signature_pad / FullCalendar elements is left alone.
 *   - cms-vercel ships nothing — we always enhance there.
 */

import { $$ } from '../lib/dom.js';
import { isAlreadyEnhanced, isOptedOut, isSelect2Wrapped, markEnhanced, type FormsOptions } from '../lib/compat.js';

let tomSelectModulePromise: Promise<typeof import('tom-select').default> | null = null;
let flatpickrModulePromise: Promise<typeof import('flatpickr').default> | null = null;

function loadTomSelect(): Promise<typeof import('tom-select').default> {
  if (!tomSelectModulePromise) {
    tomSelectModulePromise = import('tom-select').then((m) => m.default);
  }
  return tomSelectModulePromise;
}

function loadFlatpickr(): Promise<typeof import('flatpickr').default> {
  if (!flatpickrModulePromise) {
    flatpickrModulePromise = import('flatpickr').then((m) => m.default);
  }
  return flatpickrModulePromise;
}

export function enhanceForms(root: ParentNode, opts: FormsOptions = {}): void {
  if (opts.tomSelect !== false) enhanceSelects(root, opts);
  if (opts.flatpickr !== false) enhanceDates(root);
}

function enhanceSelects(root: ParentNode, opts: FormsOptions): void {
  const threshold = opts.selectThreshold ?? 8;

  const selects = $$<HTMLSelectElement>(
    'select.form-control, select.custom-select, select[data-cms-search]',
    root,
  );

  for (const sel of selects) {
    if (isAlreadyEnhanced(sel)) continue;
    if (isOptedOut(sel)) continue;
    if (isSelect2Wrapped(sel)) continue; // .NET coexistence
    if (sel.classList.contains('flatpickr-input')) continue;

    const hasFlag = sel.hasAttribute('data-cms-search');
    const tooBig = sel.options.length >= threshold;
    if (!hasFlag && !tooBig) continue;

    markEnhanced(sel);

    void loadTomSelect().then((TomSelect) => {
      try {
        new TomSelect(sel, {
          maxOptions: 1000,
          create: false,
          hidePlaceholder: true,
          allowEmptyOption: true,
          plugins: sel.multiple ? ['remove_button'] : [],
        });
      } catch (e) {
        // If TomSelect fails (e.g. element already removed), bail silently —
        // we'll still have the native select left in place.
        // eslint-disable-next-line no-console
        console.warn('[cms-ui] TomSelect failed', e);
      }
    });
  }
}

function enhanceDates(root: ParentNode): void {
  const inputs = $$<HTMLInputElement>(
    'input[type="date"], input[type="datetime-local"], input[type="time"], input[data-cms-date]',
    root,
  );

  for (const inp of inputs) {
    if (isAlreadyEnhanced(inp)) continue;
    if (isOptedOut(inp)) continue;
    if (inp.classList.contains('flatpickr-input')) continue;
    if (inp.classList.contains('hasDatepicker')) continue; // jQuery UI datepicker — likely .NET
    markEnhanced(inp);

    void loadFlatpickr().then((flatpickr) => {
      try {
        const isDateTime = inp.type === 'datetime-local';
        const isTimeOnly = inp.type === 'time';
        flatpickr(inp, {
          enableTime: isDateTime || isTimeOnly,
          noCalendar: isTimeOnly,
          dateFormat: isTimeOnly ? 'H:i' : isDateTime ? 'Y-m-d H:i' : 'Y-m-d',
          weekNumbers: !isTimeOnly,
          allowInput: true,
          time_24hr: true,
        });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[cms-ui] flatpickr failed', e);
      }
    });
  }
}
