/**
 * @casemaster/ui — main JS entry point.
 *
 * Loads as <script type="module">. On DOMContentLoaded:
 *   1. Reads opt-out flags from window.cmsUi.
 *   2. Runs each enhancer over the document.
 *   3. Starts a MutationObserver so dynamically inserted markup
 *      (modal-link content, partial reloads) gets the same treatment.
 *
 * Both runtimes load their own static assets first (jQuery, Bootstrap,
 * Select2 on .NET) — by the time we run, the DOM has already been wired
 * by them. We never re-enhance their targets — see lib/compat.ts.
 */

import { enhanceTables } from './tables.js';
import { enhanceForms } from './forms.js';
import { wireConfirms } from './confirm.js';
import { wireLoading } from './loading.js';
import { wireToasts } from './toasts.js';
import { wireShortcuts } from './shortcuts.js';
import { wireModalLinks } from './modal-links.js';
import { wireInlineEdit } from './inline-edit.js';
import { wireCommand } from './command.js';

import { readConfig, isFeatureOn, detectRuntime, type CmsUiConfig } from '../lib/compat.js';
import { startObserver } from '../lib/observer.js';
import { ready } from '../lib/dom.js';

// Re-export client APIs so callers can `import { showToast } from '@casemaster/ui'`.
export { showToast } from './toasts.js';
export { startLoading, endLoading } from './loading.js';
export type { CmsUiConfig } from '../lib/compat.js';

function runOnce(cfg: CmsUiConfig, root: ParentNode): void {
  if (isFeatureOn(cfg, 'tables'))     enhanceTables(root, typeof cfg.tables === 'object' ? cfg.tables : {});
  if (isFeatureOn(cfg, 'forms'))      enhanceForms(root, typeof cfg.forms === 'object' ? cfg.forms : {});
  if (isFeatureOn(cfg, 'confirm'))    wireConfirms(root);
  if (isFeatureOn(cfg, 'loading'))    wireLoading(root);
  if (isFeatureOn(cfg, 'modalLinks')) wireModalLinks(root);
  if (isFeatureOn(cfg, 'inlineEdit')) wireInlineEdit(root);
}

export function init(): void {
  const cfg = readConfig();

  ready(() => {
    // Tag the body with the runtime we think we're on. Surfaces in DevTools
    // and lets per-runtime CSS overrides hook in if ever needed.
    document.body.setAttribute('data-cms-runtime', detectRuntime());
    document.body.setAttribute('data-cms-ui-version', '0.2.0');

    runOnce(cfg, document);

    // Document-global wiring (only attach once)
    if (isFeatureOn(cfg, 'toasts'))    wireToasts();
    if (isFeatureOn(cfg, 'shortcuts')) wireShortcuts(cfg.shortcuts);
    if (isFeatureOn(cfg, 'command'))   wireCommand(typeof cfg.command === 'object' ? cfg.command : undefined);

    startObserver((root) => runOnce(cfg, root));
  });
}

// Auto-init when loaded as a side-effect script (the recommended embed).
init();
