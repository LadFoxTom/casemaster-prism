/**
 * Detection helpers — let enhancers stay out of the way of whatever the
 * runtime already wired up.
 *
 * Both runtimes ship Bootstrap 4 + jQuery + Font Awesome.
 *  - .NET adds Select2, FullCalendar, signature_pad, plus its own cm.js/app.js.
 *  - cms-vercel ships only the BS4 stack by default.
 *
 * If a Select2-wrapped element is present, .select2-hidden-accessible appears
 * on the underlying <select>; FullCalendar adds .fc-* classes; signature_pad
 * doesn't add markers but only attaches to <canvas>. We never enhance any of
 * those targets.
 */

export const ENHANCED_FLAG = 'cmsEnhanced';
export const NO_ENHANCE_ATTR = 'data-cms-no-enhance';

/** Has another library already wrapped this select? */
export function isSelect2Wrapped(el: Element): boolean {
  return el.classList.contains('select2-hidden-accessible');
}

/** Has Flatpickr already wrapped this input? */
export function isFlatpickrWrapped(el: Element): boolean {
  return el.classList.contains('flatpickr-input') || el.hasAttribute('readonly') && el.classList.contains('flatpickr-alt');
}

/** Has @casemaster/ui already enhanced this element? */
export function isAlreadyEnhanced(el: HTMLElement): boolean {
  return el.dataset[ENHANCED_FLAG] === '1';
}

/** Mark an element as enhanced; idempotent. */
export function markEnhanced(el: HTMLElement): void {
  el.dataset[ENHANCED_FLAG] = '1';
}

/** Author opt-out via [data-cms-no-enhance]. */
export function isOptedOut(el: Element): boolean {
  return el.hasAttribute(NO_ENHANCE_ATTR);
}

/** Combined "skip this element" check, used by every enhancer. */
export function shouldSkip(el: HTMLElement): boolean {
  return isAlreadyEnhanced(el) || isOptedOut(el);
}

/** Detect which runtime served this page. Best-effort; only used for diagnostics. */
export function detectRuntime(): 'dotnet' | 'vercel' | 'unknown' {
  // .NET runtime ships cm.js which sets window.cm.
  const w = window as unknown as { cm?: unknown; CM?: unknown; __cmsVercel?: unknown };
  if (w.cm || w.CM) return 'dotnet';
  if (w.__cmsVercel) return 'vercel';

  // Heuristic: Select2 + FullCalendar + signature_pad together signals .NET.
  const hasSelect2 = !!(window as unknown as { jQuery?: { fn?: { select2?: unknown } } }).jQuery?.fn?.select2;
  if (hasSelect2) return 'dotnet';

  return 'unknown';
}

/** Read the global runtime config from window.cmsUi. */
export interface CmsUiConfig {
  tables?: boolean | TablesOptions;
  forms?: boolean | FormsOptions;
  confirm?: boolean;
  loading?: boolean;
  toasts?: boolean;
  shortcuts?: boolean | ShortcutsOptions;
  modalLinks?: boolean;
  inlineEdit?: boolean;
  command?: boolean | CommandOptions;
}

export interface TablesOptions {
  search?: boolean;
  sort?: boolean;
  columnToggle?: boolean;
  csvExport?: boolean;
  stickyHeader?: boolean;
  minRowsToEnhance?: number;
  virtualizeAfter?: number;
}

export interface FormsOptions {
  tomSelect?: boolean;
  flatpickr?: boolean;
  selectThreshold?: number;
}

export interface ShortcutsOptions {
  focusSearch?: string;
  toggleHelp?: string;
  openCommand?: string;
  goto?: Record<string, string>;
}

export interface CommandOptions {
  items?: Array<{ label: string; href?: string; action?: () => void; meta?: string }>;
}

export function readConfig(): CmsUiConfig {
  return ((window as unknown as { cmsUi?: CmsUiConfig }).cmsUi ?? {}) as CmsUiConfig;
}

/** A feature is enabled if its key is missing or truthy (default-on). */
export function isFeatureOn(cfg: CmsUiConfig, key: keyof CmsUiConfig): boolean {
  const v = cfg[key];
  return v !== false;
}
