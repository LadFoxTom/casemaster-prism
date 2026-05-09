/**
 * casemaster-prism-site — the marketing site, served by cms-vercel.
 *
 * This is the entire backend for the site. cms-vercel parses .cms files
 * under app/page/, renders them, and wraps the body in a default shell
 * that loads prism via the `ui` option below.
 *
 * The `prism` package is the same one this site is documenting — we eat
 * our own dog food.
 */
import { createHandler } from 'cms-vercel';

export default createHandler({
  ui: {
    theme:     '/static/lib/prism/prism.min.css',
    enhancers: true,
    scriptUrl: '/static/lib/prism/prism.js',
  },
});
