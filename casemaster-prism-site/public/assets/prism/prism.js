function $$(sel, root = document) {
  return Array.from(root.querySelectorAll(sel));
}
function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === void 0 || v === false) continue;
    if (k === "class" || k === "className") {
      node.className = String(v);
    } else if (k.startsWith("on") && typeof v === "function") {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (v === true) {
      node.setAttribute(k, "");
    } else {
      node.setAttribute(k, String(v));
    }
  }
  for (const c of children) {
    node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return node;
}
function debounce(fn, ms) {
  let h;
  return (...args) => {
    if (h) clearTimeout(h);
    h = setTimeout(() => fn(...args), ms);
  };
}
function ready(fn) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fn, { once: true });
  } else {
    queueMicrotask(fn);
  }
}
function compareCells(a, b) {
  if (looksLikeDate(a) && looksLikeDate(b)) {
    const da = Date.parse(a);
    const db = Date.parse(b);
    if (!Number.isNaN(da) && !Number.isNaN(db)) return da - db;
  }
  const na = toNumber(a);
  const nb = toNumber(b);
  if (na !== null && nb !== null) return na - nb;
  return a.localeCompare(b, void 0, { numeric: true, sensitivity: "base" });
}
function looksLikeDate(s) {
  return /^\d{4}-\d{1,2}-\d{1,2}([T ]\d{1,2}:\d{2})?/.test(s.trim());
}
function toNumber(s) {
  const cleaned = s.replace(/[\s,$£€¥%]/g, "").trim();
  if (cleaned === "" || !/^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(cleaned)) {
    return null;
  }
  const n = parseFloat(cleaned);
  return Number.isNaN(n) ? null : n;
}
const ENHANCED_FLAG = "cmsEnhanced";
const NO_ENHANCE_ATTR = "data-cms-no-enhance";
function isSelect2Wrapped(el2) {
  return el2.classList.contains("select2-hidden-accessible");
}
function isAlreadyEnhanced(el2) {
  return el2.dataset[ENHANCED_FLAG] === "1";
}
function markEnhanced(el2) {
  el2.dataset[ENHANCED_FLAG] = "1";
}
function isOptedOut(el2) {
  return el2.hasAttribute(NO_ENHANCE_ATTR);
}
function shouldSkip(el2) {
  return isAlreadyEnhanced(el2) || isOptedOut(el2);
}
function detectRuntime() {
  const w = window;
  if (w.cm || w.CM) return "dotnet";
  if (w.__cmsVercel) return "vercel";
  const hasSelect2 = !!window.jQuery?.fn?.select2;
  if (hasSelect2) return "dotnet";
  return "unknown";
}
function readConfig() {
  return window.cmsUi ?? {};
}
function isFeatureOn(cfg, key) {
  const v = cfg[key];
  return v !== false;
}
const TABLE_SELECTOR = "table.cms-table, table.table.table-striped, table.table.table-bordered";
function enhanceTables(root, opts = {}) {
  const tables = $$(TABLE_SELECTOR, root);
  for (const table of tables) {
    if (shouldSkip(table)) continue;
    const tbody = table.tBodies[0];
    if (!tbody) continue;
    const minRows = opts.minRowsToEnhance ?? 2;
    if (tbody.rows.length < minRows) continue;
    markEnhanced(table);
    const state = {
      table,
      sortIndex: -1,
      sortDir: "asc",
      originalOrder: Array.from(tbody.rows)
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
function addToolbar(state, opts) {
  const { table } = state;
  const toolbar = el("div", { class: "cms-table-toolbar", role: "toolbar" });
  if (opts.search !== false) {
    const search = el("input", {
      class: "form-control form-control-sm cms-table-search",
      type: "search",
      placeholder: "Filter rows…",
      "aria-label": "Filter table"
    });
    state.search = search;
    search.addEventListener("input", debounce(() => applyFilter(state), 80));
    toolbar.appendChild(search);
  }
  if (opts.columnToggle !== false) {
    toolbar.appendChild(buildColumnToggle(state));
  }
  if (opts.csvExport !== false) {
    const exportBtn = el(
      "button",
      { class: "btn btn-sm btn-outline-secondary", type: "button", title: "Export visible rows as CSV" },
      ["CSV"]
    );
    exportBtn.addEventListener("click", () => exportToCsv(state));
    toolbar.appendChild(exportBtn);
  }
  const count = el("span", { class: "cms-table-count" });
  state.countLabel = count;
  toolbar.appendChild(count);
  table.parentNode?.insertBefore(toolbar, table);
  state.toolbar = toolbar;
  updateCount(state);
}
function buildColumnToggle(state) {
  const headers = Array.from(state.table.tHead?.rows[0]?.cells ?? []);
  const wrap = el("div", { class: "cms-col-toggle" });
  const trigger = el(
    "button",
    {
      class: "btn btn-sm btn-outline-secondary",
      type: "button",
      "aria-haspopup": "true",
      "aria-expanded": "false"
    },
    ["Columns"]
  );
  const menu = el("div", { class: "cms-col-toggle-menu", role: "menu" });
  headers.forEach((th, i) => {
    const cb = el("input", { type: "checkbox", checked: true });
    const label = el("label", {}, [cb, document.createTextNode(" " + (th.textContent?.trim() || `Col ${i + 1}`))]);
    cb.addEventListener("change", () => toggleColumn(state, i, cb.checked));
    menu.appendChild(label);
  });
  trigger.addEventListener("click", (ev) => {
    ev.stopPropagation();
    wrap.classList.toggle("is-open");
    trigger.setAttribute("aria-expanded", String(wrap.classList.contains("is-open")));
  });
  document.addEventListener("click", (ev) => {
    if (!wrap.contains(ev.target)) wrap.classList.remove("is-open");
  });
  wrap.appendChild(trigger);
  wrap.appendChild(menu);
  return wrap;
}
function toggleColumn(state, index, visible) {
  const { table } = state;
  const display = visible ? "" : "none";
  const head = table.tHead?.rows[0];
  if (head?.cells[index]) head.cells[index].style.display = display;
  for (const row of Array.from(table.tBodies[0]?.rows ?? [])) {
    if (row.cells[index]) row.cells[index].style.display = display;
  }
  for (const row of Array.from(table.tFoot?.rows ?? [])) {
    if (row.cells[index]) row.cells[index].style.display = display;
  }
}
function makeHeadersSortable(state) {
  const head = state.table.tHead?.rows[0];
  if (!head) return;
  Array.from(head.cells).forEach((th, i) => {
    if (th.hasAttribute("data-cms-no-sort")) return;
    th.setAttribute("data-cms-sortable", "1");
    th.tabIndex = 0;
    th.setAttribute("role", "columnheader");
    th.setAttribute("aria-sort", "none");
    const handler = () => {
      const dir = state.sortIndex === i && state.sortDir === "asc" ? "desc" : "asc";
      sortBy(state, i, dir);
    };
    th.addEventListener("click", handler);
    th.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        handler();
      }
    });
  });
}
function sortBy(state, index, dir) {
  const tbody = state.table.tBodies[0];
  if (!tbody) return;
  const rows = Array.from(tbody.rows);
  rows.sort((a, b) => {
    const av = (a.cells[index]?.textContent ?? "").trim();
    const bv = (b.cells[index]?.textContent ?? "").trim();
    return compareCells(av, bv);
  });
  if (dir === "desc") rows.reverse();
  for (const row of rows) tbody.appendChild(row);
  state.sortIndex = index;
  state.sortDir = dir;
  const head = state.table.tHead?.rows[0];
  if (head) {
    Array.from(head.cells).forEach((th, i) => {
      if (i === index) {
        th.setAttribute("data-cms-sort", dir);
        th.setAttribute("aria-sort", dir === "asc" ? "ascending" : "descending");
      } else {
        th.removeAttribute("data-cms-sort");
        th.setAttribute("aria-sort", "none");
      }
    });
  }
}
function applyFilter(state) {
  const tbody = state.table.tBodies[0];
  if (!tbody) return;
  const term = (state.search?.value ?? "").trim().toLowerCase();
  let visible = 0;
  for (const row of Array.from(tbody.rows)) {
    if (row.classList.contains("cms-table-empty")) continue;
    const text = row.textContent?.toLowerCase() ?? "";
    const match = !term || text.includes(term);
    row.style.display = match ? "" : "none";
    if (match) visible++;
  }
  const colspan = state.table.tHead?.rows[0]?.cells.length ?? 1;
  let emptyRow = tbody.querySelector("tr.cms-table-empty");
  if (visible === 0 && term) {
    if (!emptyRow) {
      emptyRow = el("tr", { class: "cms-table-empty" }, [
        el("td", { colspan: String(colspan) }, ['No rows match "', term, '"'])
      ]);
      tbody.appendChild(emptyRow);
    } else {
      const td = emptyRow.cells[0];
      if (td) td.textContent = `No rows match "${term}"`;
      emptyRow.style.display = "";
    }
  } else if (emptyRow) {
    emptyRow.style.display = "none";
  }
  updateCount(state);
}
function updateCount(state) {
  const tbody = state.table.tBodies[0];
  if (!tbody || !state.countLabel) return;
  const all = Array.from(tbody.rows).filter((r) => !r.classList.contains("cms-table-empty"));
  const visible = all.filter((r) => r.style.display !== "none").length;
  state.countLabel.textContent = visible === all.length ? `${all.length} row${all.length === 1 ? "" : "s"}` : `${visible} of ${all.length}`;
}
function detectNumericColumns(state) {
  const head = state.table.tHead?.rows[0];
  const tbody = state.table.tBodies[0];
  if (!head || !tbody) return;
  const cols = head.cells.length;
  for (let i = 0; i < cols; i++) {
    const sample = Array.from(tbody.rows).slice(0, 12);
    if (sample.length === 0) continue;
    const allNumeric = sample.every((row) => {
      const v = row.cells[i]?.textContent?.trim() ?? "";
      if (v === "" || v === "—" || v === "-") return true;
      return /^[-+]?[\d,. ]+%?$/.test(v);
    });
    if (allNumeric) {
      head.cells[i]?.setAttribute("data-cms-numeric", "1");
      for (const row of Array.from(tbody.rows)) {
        row.cells[i]?.setAttribute("data-cms-numeric", "1");
      }
    }
  }
}
function exportToCsv(state) {
  const lines = [];
  const head = state.table.tHead?.rows[0];
  if (head) lines.push(rowToCsv(Array.from(head.cells)));
  for (const row of Array.from(state.table.tBodies[0]?.rows ?? [])) {
    if (row.style.display === "none") continue;
    if (row.classList.contains("cms-table-empty")) continue;
    lines.push(rowToCsv(Array.from(row.cells)));
  }
  const csv = lines.join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const filename = (document.title || "export").replace(/[^A-Za-z0-9_-]+/g, "_") + ".csv";
  const a = el("a", { href: url, download: filename, style: "display:none" });
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 200);
}
function rowToCsv(cells) {
  return cells.filter((c) => c.style.display !== "none").map((c) => csvField(c.textContent ?? "")).join(",");
}
function csvField(s) {
  const trimmed = s.replace(/\s+/g, " ").trim();
  if (/[",\r\n]/.test(trimmed)) {
    return '"' + trimmed.replace(/"/g, '""') + '"';
  }
  return trimmed;
}
let tomSelectModulePromise = null;
let flatpickrModulePromise = null;
function loadTomSelect() {
  if (!tomSelectModulePromise) {
    tomSelectModulePromise = import("./chunks/tom-select-CDbfXNsj.js").then((m) => m.default);
  }
  return tomSelectModulePromise;
}
function loadFlatpickr() {
  if (!flatpickrModulePromise) {
    flatpickrModulePromise = import("./chunks/flatpickr-v3r4mkgj.js").then((m) => m.default);
  }
  return flatpickrModulePromise;
}
function enhanceForms(root, opts = {}) {
  if (opts.tomSelect !== false) enhanceSelects(root, opts);
  if (opts.flatpickr !== false) enhanceDates(root);
}
function enhanceSelects(root, opts) {
  const threshold = opts.selectThreshold ?? 8;
  const selects = $$(
    "select.form-control, select.custom-select, select[data-cms-search]",
    root
  );
  for (const sel of selects) {
    if (isAlreadyEnhanced(sel)) continue;
    if (isOptedOut(sel)) continue;
    if (isSelect2Wrapped(sel)) continue;
    if (sel.classList.contains("flatpickr-input")) continue;
    const hasFlag = sel.hasAttribute("data-cms-search");
    const tooBig = sel.options.length >= threshold;
    if (!hasFlag && !tooBig) continue;
    markEnhanced(sel);
    void loadTomSelect().then((TomSelect) => {
      try {
        new TomSelect(sel, {
          maxOptions: 1e3,
          create: false,
          hidePlaceholder: true,
          allowEmptyOption: true,
          plugins: sel.multiple ? ["remove_button"] : []
        });
      } catch (e) {
        console.warn("[cms-ui] TomSelect failed", e);
      }
    });
  }
}
function enhanceDates(root) {
  const inputs = $$(
    'input[type="date"], input[type="datetime-local"], input[type="time"], input[data-cms-date]',
    root
  );
  for (const inp of inputs) {
    if (isAlreadyEnhanced(inp)) continue;
    if (isOptedOut(inp)) continue;
    if (inp.classList.contains("flatpickr-input")) continue;
    if (inp.classList.contains("hasDatepicker")) continue;
    markEnhanced(inp);
    void loadFlatpickr().then((flatpickr) => {
      try {
        const isDateTime = inp.type === "datetime-local";
        const isTimeOnly = inp.type === "time";
        flatpickr(inp, {
          enableTime: isDateTime || isTimeOnly,
          noCalendar: isTimeOnly,
          dateFormat: isTimeOnly ? "H:i" : isDateTime ? "Y-m-d H:i" : "Y-m-d",
          weekNumbers: !isTimeOnly,
          allowInput: true,
          time_24hr: true
        });
      } catch (e) {
        console.warn("[cms-ui] flatpickr failed", e);
      }
    });
  }
}
function wireConfirms(root) {
  const targets = $$("[data-cms-confirm]", root);
  for (const t of targets) {
    if (isAlreadyEnhanced(t)) continue;
    markEnhanced(t);
    t.addEventListener("click", handleClick, { capture: true });
    if (t instanceof HTMLFormElement === false && t.closest("form")) ;
  }
}
function handleClick(ev) {
  const target = ev.currentTarget;
  const message = target.dataset.cmsConfirm ?? "Are you sure?";
  if (target.dataset.cmsConfirmed === "1") {
    delete target.dataset.cmsConfirmed;
    return;
  }
  ev.preventDefault();
  ev.stopPropagation();
  showConfirm(message, target.dataset.cmsConfirmTitle).then((ok) => {
    if (!ok) return;
    target.dataset.cmsConfirmed = "1";
    if (target instanceof HTMLAnchorElement) {
      target.click();
    } else if (target instanceof HTMLButtonElement || target instanceof HTMLInputElement) {
      target.click();
    } else {
      target.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    }
  });
}
function showConfirm(message, title) {
  return new Promise((resolve) => {
    try {
      const dialog = buildDialog(message, title ?? "Please confirm");
      document.body.appendChild(dialog.backdrop);
      document.body.appendChild(dialog.root);
      requestAnimationFrame(() => dialog.root.classList.add("show"));
      const finish = (ok) => {
        dialog.root.remove();
        dialog.backdrop.remove();
        resolve(ok);
      };
      dialog.cancelBtn.addEventListener("click", () => finish(false));
      dialog.okBtn.addEventListener("click", () => finish(true));
      dialog.backdrop.addEventListener("click", () => finish(false));
      document.addEventListener("keydown", function onKey(ev) {
        if (ev.key === "Escape") {
          document.removeEventListener("keydown", onKey);
          finish(false);
        }
      });
      dialog.okBtn.focus();
    } catch {
      resolve(window.confirm(message));
    }
  });
}
function buildDialog(message, title) {
  const backdrop = el("div", { class: "modal-backdrop fade show" });
  const okBtn = el("button", { class: "btn btn-primary", type: "button" }, ["Confirm"]);
  const cancelBtn = el("button", { class: "btn btn-secondary", type: "button" }, ["Cancel"]);
  const root = el("div", {
    class: "modal fade",
    tabindex: "-1",
    role: "dialog",
    "aria-modal": "true",
    style: "display:block"
  }, [
    el("div", { class: "modal-dialog modal-dialog-centered", role: "document" }, [
      el("div", { class: "modal-content" }, [
        el("div", { class: "modal-header" }, [
          el("h5", { class: "modal-title" }, [title])
        ]),
        el("div", { class: "modal-body" }, [el("p", {}, [message])]),
        el("div", { class: "modal-footer" }, [cancelBtn, okBtn])
      ])
    ])
  ]);
  return { root, backdrop, okBtn, cancelBtn };
}
let bar = null;
let activeCount = 0;
let resetHandle = null;
function ensureBar() {
  if (bar && document.body.contains(bar)) return bar;
  bar = el("div", { class: "cms-progress-bar", role: "progressbar", "aria-hidden": "true" });
  document.body.appendChild(bar);
  return bar;
}
function startLoading() {
  activeCount++;
  const b = ensureBar();
  b.classList.remove("is-complete");
  b.classList.add("is-active");
}
function endLoading() {
  if (activeCount > 0) activeCount--;
  if (activeCount > 0) return;
  const b = ensureBar();
  b.classList.remove("is-active");
  b.classList.add("is-complete");
  if (resetHandle) clearTimeout(resetHandle);
  resetHandle = setTimeout(() => {
    b.classList.remove("is-complete");
    b.style.transform = "scaleX(0)";
    setTimeout(() => {
      b.style.transform = "";
    }, 50);
  }, 250);
}
function wireLoading(_root) {
  if (window.__cmsLoadingWired) return;
  window.__cmsLoadingWired = true;
  document.addEventListener("click", (ev) => {
    const a = ev.target?.closest?.("a");
    if (!a || !a.href) return;
    if (a.target && a.target !== "_self") return;
    if (a.dataset.cmsNoProgress === "1" || a.closest("[data-cms-no-progress]")) return;
    if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button !== 0) return;
    if (!isSameOrigin(a.href)) return;
    if (a.getAttribute("href")?.startsWith("#")) return;
    startLoading();
  });
  document.addEventListener("submit", (ev) => {
    const form = ev.target;
    if (!form) return;
    if (form.matches("[data-cms-no-progress]")) return;
    startLoading();
    markBusySubmitButton(form);
  }, true);
  window.addEventListener("beforeunload", () => {
    const b = ensureBar();
    b.classList.add("is-active");
  });
  window.addEventListener("cms-progress-start", () => startLoading());
  window.addEventListener("cms-progress-end", () => endLoading());
  window.addEventListener("pageshow", () => {
    activeCount = 0;
    const b = ensureBar();
    b.classList.remove("is-active");
    b.classList.remove("is-complete");
    b.style.transform = "";
  });
}
function markBusySubmitButton(form) {
  const btn = form.querySelector('button[type="submit"]:not([disabled])') ?? form.querySelector('input[type="submit"]:not([disabled])');
  if (!btn) return;
  btn.setAttribute("aria-busy", "true");
  btn.setAttribute("data-cms-was-busy", "1");
}
function isSameOrigin(url) {
  try {
    const u = new URL(url, window.location.origin);
    return u.origin === window.location.origin;
  } catch {
    return false;
  }
}
const KIND_ICON = {
  info: "ℹ",
  // ℹ
  success: "✓",
  // ✓
  warning: "⚠",
  // ⚠
  danger: "✖",
  // ✖
  error: "✖"
};
let container = null;
function ensureContainer() {
  if (container && document.body.contains(container)) return container;
  container = el("div", { class: "cms-toast-container", role: "status", "aria-live": "polite" });
  document.body.appendChild(container);
  return container;
}
function showToast(opts) {
  const kind = opts.kind ?? "info";
  const root = ensureContainer();
  const icon = el("span", { class: "cms-toast-icon", "aria-hidden": "true" }, [KIND_ICON[kind]]);
  const body = el("div", { class: "cms-toast-body" });
  if (opts.title) body.appendChild(el("div", { class: "cms-toast-title" }, [opts.title]));
  if (opts.message) body.appendChild(el("div", { class: "cms-toast-msg" }, [opts.message]));
  const close = el("button", {
    class: "cms-toast-close",
    type: "button",
    "aria-label": "Close notification"
  }, ["×"]);
  const toast = el("div", { class: `cms-toast kind-${kind}` }, [icon, body, close]);
  const dismiss = () => {
    if (toast.classList.contains("is-leaving")) return;
    toast.classList.add("is-leaving");
    toast.addEventListener("animationend", () => toast.remove(), { once: true });
  };
  close.addEventListener("click", dismiss);
  root.appendChild(toast);
  const auto = opts.autoDismiss !== false;
  if (auto) {
    const dur = opts.durationMs ?? 5e3;
    setTimeout(dismiss, dur);
  }
  return toast;
}
function wireToasts() {
  const meta = document.querySelector('meta[name="cms-toast"]');
  if (meta && meta.content) {
    try {
      const data = JSON.parse(meta.content);
      showToast(data);
    } catch {
      showToast({ kind: "info", message: meta.content });
    }
    meta.remove();
  }
  window.addEventListener("cms-toast", (ev) => {
    const ce = ev;
    showToast(ce.detail ?? {});
  });
}
const defaultShortcuts = {
  focusSearch: "/",
  // focus the page's search input
  toggleHelp: "?",
  // show shortcut cheatsheet
  openCommand: "mod+k",
  // command palette (Cmd+K / Ctrl+K)
  closeOverlay: "Escape",
  // dismiss palette/modal/popovers
  // Two-key chord prefix (e.g. "g d" = goto dashboard)
  goto: {
    "d": "/",
    // dashboard
    "i": "/inventory",
    // inventory
    "s": "/settings"
  }
};
function matchesChord(ev, chord) {
  const parts = chord.toLowerCase().split("+");
  const key = parts.pop() ?? "";
  const want = new Set(parts);
  const mod = ev.metaKey || ev.ctrlKey;
  if (want.has("mod") && !mod) return false;
  if (!want.has("mod") && (ev.metaKey || ev.ctrlKey)) return false;
  if (want.has("shift") && !ev.shiftKey) return false;
  if (!want.has("shift") && ev.shiftKey && key.length === 1) ;
  if (want.has("alt") && !ev.altKey) return false;
  if (key.length === 1) return ev.key.toLowerCase() === key;
  return ev.key === chord.split("+").pop();
}
function isTypingInField(target) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}
let helpOverlay = null;
let pendingPrefix = null;
let pendingTimer = null;
function wireShortcuts(opts) {
  const overrides = typeof opts === "object" && opts ? opts : {};
  const map = {
    ...defaultShortcuts,
    ...overrides,
    goto: { ...defaultShortcuts.goto, ...overrides.goto ?? {} }
  };
  if (window.__cmsShortcutsWired) return;
  window.__cmsShortcutsWired = true;
  document.addEventListener("keydown", (ev) => {
    if (isTypingInField(ev.target)) return;
    if (matchesChord(ev, map.openCommand)) {
      ev.preventDefault();
      window.dispatchEvent(new CustomEvent("cms-cmdk-open"));
      return;
    }
    if (ev.key === map.focusSearch && !ev.metaKey && !ev.ctrlKey) {
      const search = document.querySelector(
        '.cms-table-search, input[type="search"], input[name="q"], input[placeholder*="search" i]'
      );
      if (search) {
        ev.preventDefault();
        search.focus();
        search.select();
        return;
      }
    }
    if (ev.key === map.toggleHelp && !ev.metaKey && !ev.ctrlKey) {
      ev.preventDefault();
      toggleHelp(map);
      return;
    }
    if (ev.key === map.closeOverlay && helpOverlay) {
      ev.preventDefault();
      hideHelp();
      return;
    }
    if (pendingPrefix === "g") {
      const target = map.goto[ev.key.toLowerCase()];
      pendingPrefix = null;
      if (pendingTimer) clearTimeout(pendingTimer);
      if (target) {
        ev.preventDefault();
        window.location.assign(target);
      }
      return;
    }
    if (ev.key.toLowerCase() === "g" && !ev.metaKey && !ev.ctrlKey && !ev.altKey) {
      pendingPrefix = "g";
      if (pendingTimer) clearTimeout(pendingTimer);
      pendingTimer = setTimeout(() => {
        pendingPrefix = null;
      }, 1200);
    }
  });
}
function toggleHelp(map) {
  if (helpOverlay) hideHelp();
  else showHelp(map);
}
function showHelp(map) {
  const rows = [
    [map.focusSearch, "Focus search"],
    [map.toggleHelp, "Toggle this help"],
    [map.openCommand, "Open command palette"],
    [map.closeOverlay, "Close overlay"],
    ...Object.entries(map.goto).map(([k, v]) => [`g ${k}`, `Go to ${v}`])
  ];
  const list = el("ul", { class: "list-unstyled mb-0" });
  for (const [chord, label] of rows) {
    list.appendChild(el("li", {
      style: "display:flex;justify-content:space-between;padding:.35rem 0;border-bottom:1px solid var(--cms-border);"
    }, [
      el("span", {}, [label]),
      el("kbd", { class: "cms-kbd" }, [chord])
    ]));
  }
  helpOverlay = el("div", { class: "cms-cmdk is-open", role: "dialog" }, [
    el("div", { class: "cms-cmdk-panel", style: "padding:var(--cms-space-4)" }, [
      el("div", { style: "font-weight:600;font-size:var(--cms-text-md);margin-bottom:.5rem" }, ["Keyboard shortcuts"]),
      list
    ])
  ]);
  helpOverlay.addEventListener("click", (ev) => {
    if (ev.target === helpOverlay) hideHelp();
  });
  document.body.appendChild(helpOverlay);
}
function hideHelp() {
  if (!helpOverlay) return;
  helpOverlay.remove();
  helpOverlay = null;
}
function wireModalLinks(root) {
  const links = $$("a[data-cms-modal-link]", root);
  for (const link of links) {
    if (isAlreadyEnhanced(link)) continue;
    markEnhanced(link);
    link.addEventListener("click", onClick);
  }
}
async function onClick(ev) {
  const link = ev.currentTarget;
  if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button !== 0) return;
  ev.preventDefault();
  const url = link.href;
  startLoading();
  let html = "";
  try {
    const res = await fetch(url, {
      credentials: "same-origin",
      headers: { "X-Cms-Modal": "1", Accept: "text/html" }
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
  showModal(link.dataset.cmsModalTitle ?? link.textContent?.trim() ?? "", fragment, url);
}
function extractContent(html, fallbackHref) {
  const tpl = document.createElement("template");
  tpl.innerHTML = html;
  const root = tpl.content.querySelector("main") ?? tpl.content.querySelector("article") ?? tpl.content.querySelector(".cms-content") ?? tpl.content.querySelector(".container, .container-fluid");
  const frag = document.createDocumentFragment();
  if (root) {
    Array.from(root.childNodes).forEach((n) => frag.appendChild(n));
  } else {
    frag.appendChild(el("div", {}, [
      el("p", {}, ["Could not load this page in a modal. "]),
      el("a", { href: fallbackHref }, ["Open it directly →"])
    ]));
  }
  return frag;
}
function showModal(title, body, returnHref) {
  const backdrop = el("div", { class: "modal-backdrop fade show" });
  const close = el("button", {
    class: "close",
    type: "button",
    "aria-label": "Close",
    "data-dismiss": "modal"
  }, ["×"]);
  const openLink = el("a", { href: returnHref, class: "btn btn-link btn-sm" }, ["Open page →"]);
  const bodyEl = el("div", { class: "modal-body" });
  bodyEl.appendChild(body);
  const root = el("div", {
    class: "modal fade show cms-modal-drawer",
    tabindex: "-1",
    role: "dialog",
    "aria-modal": "true",
    style: "display:block"
  }, [
    el("div", { class: "modal-dialog", role: "document" }, [
      el("div", { class: "modal-content" }, [
        el("div", { class: "modal-header" }, [
          el("h5", { class: "modal-title" }, [title || "Details"]),
          openLink,
          close
        ]),
        bodyEl
      ])
    ])
  ]);
  document.body.appendChild(backdrop);
  document.body.appendChild(root);
  const dismiss = () => {
    root.remove();
    backdrop.remove();
  };
  close.addEventListener("click", dismiss);
  backdrop.addEventListener("click", dismiss);
  document.addEventListener("keydown", function onKey(ev) {
    if (ev.key === "Escape") {
      document.removeEventListener("keydown", onKey);
      dismiss();
    }
  });
}
async function cmsFetch(input2, init2 = {}) {
  const { toastErrors = true, toastSuccess = false, headers, ...rest } = init2;
  const merged = {
    credentials: "same-origin",
    ...rest,
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
      ...headers ?? {}
    }
  };
  let res;
  try {
    res = await fetch(input2, merged);
  } catch (e) {
    if (toastErrors) showToast({ kind: "danger", title: "Network error", message: String(e) });
    throw e;
  }
  const tHeader = res.headers.get("X-Cms-Toast");
  if (tHeader) {
    try {
      const parsed = JSON.parse(tHeader);
      showToast({
        kind: parsed.kind ?? (res.ok ? "info" : "danger"),
        title: parsed.title,
        message: parsed.message ?? ""
      });
    } catch {
      showToast({ kind: res.ok ? "info" : "danger", message: tHeader });
    }
  }
  if (!res.ok && toastErrors && !tHeader) {
    showToast({
      kind: "danger",
      title: `${res.status} ${res.statusText || "Error"}`,
      message: await peekErrorBody(res)
    });
  } else if (res.ok && toastSuccess) {
    showToast({ kind: "success", message: toastSuccess });
  }
  return res;
}
async function peekErrorBody(res) {
  try {
    const text = await res.clone().text();
    if (!text) return "";
    if (text.length > 200) return text.slice(0, 200) + "…";
    return text;
  } catch {
    return "";
  }
}
function wireInlineEdit(root) {
  const cells = $$("[data-cms-inline-edit]", root);
  for (const cell of cells) {
    if (isAlreadyEnhanced(cell)) continue;
    markEnhanced(cell);
    cell.tabIndex = 0;
    cell.setAttribute("role", "button");
    cell.setAttribute("aria-label", "Click to edit");
    cell.addEventListener("click", () => beginEdit(cell));
    cell.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        beginEdit(cell);
      }
    });
  }
}
function beginEdit(cell) {
  if (cell.dataset.editing === "1") return;
  cell.dataset.editing = "1";
  const original = cell.textContent?.trim() ?? "";
  cell.dataset.cmsOriginal = original;
  const inputType = cell.dataset.cmsEditType === "number" ? "number" : "text";
  const input2 = el("input", {
    class: "form-control form-control-sm",
    type: inputType,
    value: original,
    style: "min-width:100px"
  });
  cell.textContent = "";
  cell.appendChild(input2);
  input2.focus();
  input2.select();
  let committed = false;
  const commit2 = async () => {
    if (committed) return;
    committed = true;
    const newValue = input2.value.trim();
    if (newValue === original) {
      revert(cell);
      return;
    }
    const url = cell.dataset.cmsEditUrl;
    const field = cell.dataset.cmsEditField ?? "value";
    if (!url) {
      revert(cell, newValue);
      return;
    }
    cell.textContent = newValue;
    cell.setAttribute("aria-busy", "true");
    try {
      const res = await cmsFetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: newValue }),
        toastErrors: true,
        toastSuccess: "Saved"
      });
      if (!res.ok) {
        cell.textContent = original;
      }
    } catch {
      cell.textContent = original;
    } finally {
      cell.removeAttribute("aria-busy");
      cell.dataset.editing = "0";
    }
  };
  const cancel = () => {
    if (committed) return;
    committed = true;
    revert(cell, original);
  };
  input2.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") {
      ev.preventDefault();
      void commit2();
    } else if (ev.key === "Escape") {
      ev.preventDefault();
      cancel();
    }
  });
  input2.addEventListener("blur", () => void commit2());
}
function revert(cell, value) {
  cell.textContent = value ?? cell.dataset.cmsOriginal ?? "";
  cell.dataset.editing = "0";
}
let panel = null;
let input = null;
let listEl = null;
let items = [];
let filtered = [];
let activeIndex = 0;
function wireCommand(opts) {
  const cfg = typeof opts === "object" && opts ? opts : null;
  if (window.__cmsCmdkWired) return;
  window.__cmsCmdkWired = true;
  window.addEventListener("cms-cmdk-open", () => openPalette(cfg));
  window.addEventListener("cms-cmdk-close", () => closePalette());
}
function openPalette(cfg) {
  if (panel) {
    closePalette();
    return;
  }
  items = collectItems(cfg);
  filtered = items.slice();
  activeIndex = 0;
  panel = buildPalette();
  document.body.appendChild(panel);
  requestAnimationFrame(() => panel?.classList.add("is-open"));
  input?.focus();
}
function closePalette() {
  if (!panel) return;
  panel.classList.remove("is-open");
  setTimeout(() => {
    panel?.remove();
    panel = null;
    input = null;
    listEl = null;
  }, 150);
}
function buildPalette() {
  input = el("input", {
    class: "cms-cmdk-input",
    placeholder: "Search commands, pages…",
    type: "text",
    "aria-label": "Command palette"
  });
  listEl = el("ul", { class: "cms-cmdk-list", role: "listbox" });
  const root = el("div", { class: "cms-cmdk", role: "dialog", "aria-modal": "true" }, [
    el("div", { class: "cms-cmdk-panel" }, [input, listEl])
  ]);
  root.addEventListener("click", (ev) => {
    if (ev.target === root) closePalette();
  });
  input.addEventListener("input", () => render(input.value));
  input.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") {
      ev.preventDefault();
      closePalette();
    } else if (ev.key === "ArrowDown") {
      ev.preventDefault();
      move(1);
    } else if (ev.key === "ArrowUp") {
      ev.preventDefault();
      move(-1);
    } else if (ev.key === "Enter") {
      ev.preventDefault();
      commit();
    }
  });
  render("");
  return root;
}
function render(query) {
  if (!listEl) return;
  const q = query.trim().toLowerCase();
  filtered = q ? items.filter((it) => it.label.toLowerCase().includes(q) || (it.meta?.toLowerCase().includes(q) ?? false)) : items.slice();
  if (activeIndex >= filtered.length) activeIndex = 0;
  listEl.innerHTML = "";
  if (filtered.length === 0) {
    listEl.appendChild(el("div", { class: "cms-cmdk-empty" }, [`No matches for "${query}"`]));
    return;
  }
  filtered.forEach((it, i) => {
    const li = el("li", {
      class: "cms-cmdk-item" + (i === activeIndex ? " is-active" : ""),
      role: "option",
      "data-index": i
    }, [
      el("span", {}, [it.label]),
      it.meta ? el("span", { class: "cms-cmdk-meta" }, [it.meta]) : document.createTextNode("")
    ]);
    li.addEventListener("mouseenter", () => {
      activeIndex = i;
      updateActive();
    });
    li.addEventListener("click", () => commit());
    listEl.appendChild(li);
  });
}
function move(delta) {
  if (filtered.length === 0) return;
  activeIndex = (activeIndex + delta + filtered.length) % filtered.length;
  updateActive();
}
function updateActive() {
  if (!listEl) return;
  const lis = listEl.querySelectorAll(".cms-cmdk-item");
  lis.forEach((li, i) => li.classList.toggle("is-active", i === activeIndex));
  lis[activeIndex]?.scrollIntoView({ block: "nearest" });
}
function commit() {
  const item = filtered[activeIndex];
  if (!item) return;
  closePalette();
  if (item.action) item.action();
  else if (item.href) window.location.assign(item.href);
}
function collectItems(cfg) {
  const fromCfg = cfg?.items ?? readConfig().command;
  const explicit = Array.isArray(fromCfg) ? fromCfg : typeof fromCfg === "object" && fromCfg && "items" in fromCfg && Array.isArray(fromCfg.items) ? fromCfg.items : [];
  const harvested = [];
  for (const a of $$(".wms-sidebar a[href], .cms-sidebar a[href]")) {
    const label = a.textContent?.trim();
    if (!label) continue;
    harvested.push({ label, href: a.href, meta: "Navigate" });
  }
  for (const a of $$(".navbar a[href]")) {
    const label = a.textContent?.trim();
    if (!label || label.length > 40) continue;
    harvested.push({ label, href: a.href, meta: "Top nav" });
  }
  const seen = /* @__PURE__ */ new Set();
  const merged = [];
  for (const it of [...explicit, ...harvested]) {
    const key = `${it.label}|${it.href ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(it);
  }
  return merged;
}
function startObserver(enhance) {
  const pending = /* @__PURE__ */ new Set();
  const flush = debounce(() => {
    for (const root of pending) enhance(root);
    pending.clear();
  }, 30);
  const obs = new MutationObserver((muts) => {
    for (const m of muts) {
      m.addedNodes.forEach((n) => {
        if (n.nodeType !== Node.ELEMENT_NODE) return;
        const e = n;
        if (e.closest("[data-cms-no-enhance]")) return;
        pending.add(e);
      });
    }
    if (pending.size > 0) flush();
  });
  obs.observe(document.body, { childList: true, subtree: true });
  return () => obs.disconnect();
}
function runOnce(cfg, root) {
  if (isFeatureOn(cfg, "tables")) enhanceTables(root, typeof cfg.tables === "object" ? cfg.tables : {});
  if (isFeatureOn(cfg, "forms")) enhanceForms(root, typeof cfg.forms === "object" ? cfg.forms : {});
  if (isFeatureOn(cfg, "confirm")) wireConfirms(root);
  if (isFeatureOn(cfg, "loading")) wireLoading();
  if (isFeatureOn(cfg, "modalLinks")) wireModalLinks(root);
  if (isFeatureOn(cfg, "inlineEdit")) wireInlineEdit(root);
}
function init() {
  const cfg = readConfig();
  ready(() => {
    document.body.setAttribute("data-cms-runtime", detectRuntime());
    document.body.setAttribute("data-cms-ui-version", "0.2.0");
    runOnce(cfg, document);
    if (isFeatureOn(cfg, "toasts")) wireToasts();
    if (isFeatureOn(cfg, "shortcuts")) wireShortcuts(cfg.shortcuts);
    if (isFeatureOn(cfg, "command")) wireCommand(typeof cfg.command === "object" ? cfg.command : void 0);
    startObserver((root) => runOnce(cfg, root));
  });
}
init();
export {
  endLoading,
  init,
  showToast,
  startLoading
};
//# sourceMappingURL=prism.js.map
