# casemaster-prism — .NET runtime integration (`CaseMaster.Web.exe`)

The .NET runtime ships an HTML shell that always loads
`static/css/app.css` and `static/js/app.js` at the bottom of every
page. App authors hook in through those files, so we never patch the
framework itself.

## Recommended path: vendored static files

Survives `git pull` of the framework. Works offline. Pinned versions.

### 1. Drop the bundle into the framework's static-asset tree

```
C:\Casemaster-WMS\runtime\static\lib\prism\prism.min.css
C:\Casemaster-WMS\runtime\static\lib\prism\prism.js
C:\Casemaster-WMS\runtime\static\lib\prism\prism-dark.css
C:\Casemaster-WMS\runtime\static\lib\prism\chunks\
```

You can copy them at deploy time:

```powershell
# After `npm install casemaster-prism` somewhere convenient:
$src  = "$env:USERPROFILE\.prism-src\node_modules\casemaster-prism\dist"
$dst  = "C:\Casemaster-WMS\runtime\static\lib\prism"
Remove-Item $dst -Recurse -Force -ErrorAction SilentlyContinue
New-Item   $dst -ItemType Directory | Out-Null
Copy-Item  "$src\*" $dst -Recurse
```

…or vendor the files directly into your app repo once and check them in.

### 2. Append to `static/css/app.css`

```css
/* App-wide overrides go above; everything below this line is owned by prism. */
@import url('/static/lib/prism/prism.min.css');

/* Optional: per-app brand override */
:root { --cms-primary: #0ea5e9; }
```

### 3. Append to `static/js/app.js`

```js
(function () {
  // Optional config — disable any enhancer here.
  window.cmsUi = window.cmsUi || {};

  var s = document.createElement('script');
  s.type = 'module';
  s.src = '/static/lib/prism/prism.js';
  document.body.appendChild(s);
})();
```

That's the full integration. Per-app theming via `--cms-primary`
overrides at the top of `app.css`. To apply a preset theme, add an
attribute to the `<html>` tag from `app.js`:

```js
document.documentElement.setAttribute('data-cms-theme', 'tabler');
document.documentElement.setAttribute('data-cms-density', 'comfortable');
```

## Coexistence with the .NET stack

`runtime/page/base.cms` loads scripts in this order:

```
jquery.min.js
select2.min.js
bootstrap.bundle.min.js
cm.js
app.js                ← we hook in here
```

By the time prism runs, Select2 has already wrapped its targets and
added `.select2-hidden-accessible` to the underlying `<select>`. Our
forms enhancer skips those — Select2's UX wins. No `cm.js` collisions
because we use `data-cms-enhanced` flags to mark our work.

## Optional dark mode

Add `data-theme="dark"` to the `<html>` tag. The framework emits the
shell from `runtime/page/base.cms`; if you want to override it without
forking the framework, set the attribute from `app.js`:

```js
document.documentElement.setAttribute(
  'data-theme',
  matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
);
```

## Alternative: CDN reference

Simpler for prototypes; needs outbound HTTPS at request time.

```css
/* app.css */
@import url('https://cdn.jsdelivr.net/npm/casemaster-prism@1/dist/prism.min.css');
```

```js
/* app.js */
const s = document.createElement('script');
s.type = 'module';
s.src = 'https://cdn.jsdelivr.net/npm/casemaster-prism@1/dist/prism.js';
document.body.appendChild(s);
```

## Per-page opt-out

A single page can disable enhancement entirely with one attribute on
the body or an ancestor wrapper:

```html
<body data-cms-no-enhance>
```

Or just one element:

```html
<table class="cms-table" data-cms-no-enhance>...</table>
```

## Verification

1. Open a page that emits `<table class='table table-striped …'>` with > 2 rows.
2. Hover a column header → cursor becomes a pointer.
3. Click a header → rows reorder; arrow indicator appears.
4. Press `/` → page's search input gains focus.
5. Press `Cmd+K` (Mac) / `Ctrl+K` (Windows) → command palette opens.
6. DevTools console → no warnings about double-enhanced inputs.
