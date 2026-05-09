# casemaster-prism — cms-vercel integration

cms-vercel auto-wraps app responses in a default HTML shell. Adding
prism is a one-line config knob.

## 1. Patch the runtime (one-time)

In `packages/runtime/src/handler.ts`, extend `CreateHandlerOptions`:

```ts
export interface CreateHandlerOptions {
  appDir?: string;
  loaderHook?: (reg: AppRegistry) => void;
  onError?: (e: unknown, req: VercelRequest, res: VercelResponse) => void;

  /** casemaster-prism — drop-in design system + enhancers. */
  ui?: false | 'pro' | 'theme-only' | 'enhancers-only' | UiOpts;
}

interface UiOpts {
  theme?: boolean | string;
  themeAccent?: string;
  enhancers?: boolean | Record<string, boolean>;
  /** Pin a specific casemaster-prism version; defaults to latest 1.x. */
  version?: string;
  /** "auto" | "dark" | "light" — default "light". */
  themeMode?: 'auto' | 'dark' | 'light';
  /** Override the JS bundle URL when vendoring. */
  scriptUrl?: string;
}
```

Inside `wrapInDefaultShell(body, opts)`:

```ts
const ui  = normaliseUiOpts(opts.ui);
const v   = ui.version ?? '1';
const cdn = `https://cdn.jsdelivr.net/npm/casemaster-prism@${v}/dist`;

const themeLink = ui.theme
  ? `<link rel="stylesheet" href="${typeof ui.theme === 'string' ? ui.theme : `${cdn}/prism.min.css`}">`
  : '';
const accentVar = ui.themeAccent
  ? `<style>:root{--cms-primary:${ui.themeAccent}}</style>`
  : '';
const themeAttr = ui.themeMode && ui.themeMode !== 'light'
  ? ` data-theme="${ui.themeMode}"`
  : '';
const scriptSrc = ui.scriptUrl ?? `${cdn}/prism.js`;
const enhancerScript = ui.enhancers
  ? `<script>window.cmsUi = ${JSON.stringify(typeof ui.enhancers === 'object' ? ui.enhancers : {})}</script>
     <script type="module" src="${scriptSrc}"></script>`
  : '';
```

Slot `themeLink + accentVar` into `<head>`, `themeAttr` onto `<html>`,
and `enhancerScript` just before `</body>`.

`normaliseUiOpts` maps the string shorthands:

```ts
function normaliseUiOpts(v: CreateHandlerOptions['ui']): UiOpts {
  if (!v)                       return {};
  if (v === 'pro')              return { theme: true, enhancers: true };
  if (v === 'theme-only')       return { theme: true };
  if (v === 'enhancers-only')   return { enhancers: true };
  return v;
}
```

## 2. Use it in an app

`api/index.ts` of any cms-vercel app:

```ts
import { createHandler } from 'cms-vercel';

export default createHandler({
  ui: 'pro', // theme + enhancers
});
```

Granular form, when you want to disable a single feature:

```ts
export default createHandler({
  ui: {
    theme: true,
    themeAccent: '#7c3aed',
    enhancers: { tables: true, shortcuts: false },
  },
});
```

## 3. Vendoring (no CDN)

If you can't reach jsDelivr from production, vendor the files into your
`public/` directory and pass URLs:

```ts
ui: {
  theme:     '/static/lib/prism/prism.min.css',
  scriptUrl: '/static/lib/prism/prism.js',
  enhancers: true,
}
```

Then drop `dist/prism.min.css`, `dist/prism.js`, and the
`dist/chunks/` folder into your repo's `public/lib/prism/`.

## 4. Custom shells

If your app uses `inherits 'base'` with a custom HTML shell that
bypasses `wrapInDefaultShell`, add the tags manually in your base
template:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/casemaster-prism@1/dist/prism.min.css">
<script type="module" src="https://cdn.jsdelivr.net/npm/casemaster-prism@1/dist/prism.js"></script>
```

Per-feature config still works via `<script>window.cmsUi = {…}</script>`
above the prism script tag.

## 5. Apply a preset theme

```ts
ui: {
  theme:     true,
  enhancers: true,
  themeMode: 'auto',  // honours prefers-color-scheme
}
```

For brand presets, set the attribute on `<html>` from your shell or
inject another `<style>` tag:

```ts
// inside wrapInDefaultShell, before </head>
const presetStyle = `<style>:root[data-cms-theme="tabler"]{ /* ... */ }</style>`;
const html = `<html lang="en" data-cms-theme="${opts.preset ?? ''}">…</html>`;
```

The presets ship with prism — just adding the attribute is enough.
