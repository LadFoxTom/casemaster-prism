/**
 * Public entry point for `cms-vercel`. Consumers do:
 *
 *   // api/index.ts
 *   import { createHandler } from 'cms-vercel';
 *   export default createHandler({ appDir: './app' });
 *
 * That's the entire integration. Everything else lives inside the
 * package — parser, interpreter, BO registry, page rendering, Postgres
 * pool, the lot. Upgrades happen with `npm update cms-vercel`.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { AppRegistry } from './loader.js';
export interface CreateHandlerOptions {
    /** Absolute or process.cwd()-relative path to the .cms application. */
    appDir?: string;
    /**
     * Hook to mutate the registry after parsing — useful for plugin-style
     * extensions in later phases (custom qualifiers, alternative
     * authenticators). Phase 13 keeps it as a no-op surface.
     */
    loaderHook?: (reg: AppRegistry) => void;
    /**
     * Custom error renderer. Defaults to `text/plain` with the `Error: …`
     * message — matches what we ship today.
     */
    onError?: (err: unknown, req: VercelRequest, res: VercelResponse) => void;
    /**
     * @casemaster/ui drop-in. Adds the theme + enhancer assets to the
     * default HTML shell. No effect on pages that emit their own shell.
     *
     *   ui: 'pro'             — theme + enhancers (recommended).
     *   ui: 'theme-only'      — CSS only.
     *   ui: 'enhancers-only'  — JS only.
     *   ui: false             — neither (default).
     *   ui: { theme, themeAccent, enhancers, version, themeMode }
     *                         — granular control.
     */
    ui?: false | 'pro' | 'theme-only' | 'enhancers-only' | UiOpts;
}
export interface UiOpts {
    /** Boolean = on/off. String = explicit URL to the cms-ui CSS bundle. */
    theme?: boolean | string;
    /** Override --cms-primary at the page level. */
    themeAccent?: string;
    /** Boolean = on/off. Object = per-feature flags (passed as window.cmsUi). */
    enhancers?: boolean | Record<string, boolean>;
    /** Pin a specific @casemaster/ui release. Defaults to "1". */
    version?: string;
    /** "auto" | "dark" | "light" — default "light". */
    themeMode?: 'auto' | 'dark' | 'light';
    /** Override the JS bundle URL. */
    scriptUrl?: string;
}
export declare function createHandler(opts?: CreateHandlerOptions): (req: VercelRequest, res: VercelResponse) => Promise<void>;
