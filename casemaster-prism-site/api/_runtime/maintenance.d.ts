/**
 * Phase 20 — auto-generated BO maintenance pages.
 *
 * Routes:
 *   /maintenance/<bo>                — list view (paginated)
 *   /maintenance/<bo>/edit?id=<id>   — edit form for a row
 *   /maintenance/<bo>/new            — create form
 *   /maintenance/<bo>/save           — POST: insert or update via bo.persist
 *   /maintenance/<bo>/delete         — POST: delete a row
 *
 * The handler intercepts these before the normal /page/<script>/f/<fn>
 * dispatch. Returns null when the path doesn't match any maintenance
 * route, letting the main router continue.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { BOInfo } from './bo.js';
export interface MaintenanceContext {
    bos: Map<string, BOInfo>;
}
/**
 * Try to handle a /maintenance/* request. Returns true if a response was
 * written; false if the URL doesn't match any maintenance route.
 */
export declare function handleMaintenance(ctx: MaintenanceContext, req: VercelRequest, res: VercelResponse, pathname: string, query_: Record<string, string>, body: string): Promise<boolean>;
