/**
 * HTML renderer for `<@page/...>` qualifier values, plus the
 * resolveTemplate(`…{{ expr }}…`) string interpolator.
 *
 * Phase 2 covers the bare minimum to render one visible page:
 *   page/container, page/content, page/title, page/html
 * Plus the `_list` synthetic qualifier that the parser emits for `< … >`
 * literals (we walk children in order).
 *
 * Anything not yet implemented falls through to a comment marker so the
 * page renders something visible and we can grep the HTML for missing
 * qualifiers when porting more pages.
 */
import { Value, Scope, Ctx } from './eval.js';
export declare function renderValue(ctx: Ctx, scope: Scope, v: Value): Promise<string>;
/**
 * resolveTemplate("…{{ expr }}…") — substitutes each `{{…}}` block with
 * the eval'd expression. The expression is parsed and evaluated using the
 * current request scope.
 */
export declare function resolveTemplate(ctx: Ctx, scope: Scope, tpl: string): Promise<string>;
