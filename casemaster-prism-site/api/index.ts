/**
 * casemaster-prism-site — the marketing site, served by cms-vercel.
 *
 * The cms-vercel runtime is vendored under ../packages/runtime/dist/
 * (pre-compiled JS, included in the repo so this site deploys
 * standalone without an npm-published cms-vercel package).
 *
 * vercel.json declares { includeFiles: "{app,packages}/**" } so the
 * runtime ships into the serverless bundle.
 */

// @ts-ignore — vendored runtime ships JS only, no .d.ts at this path
import { createHandler } from '../packages/runtime/dist/index.js';

export default createHandler({
  ui: {
    theme:     '/static/lib/prism/prism.min.css',
    enhancers: true,
    scriptUrl: '/static/lib/prism/prism.js',
  },
});
