/**
 * Phase 18 — session storage.
 *
 * Sessions are a Postgres row keyed by a random id; the cookie carries
 * the id. Schema is created lazily on first write so a fresh deploy
 * doesn't need a manual migration step.
 */
export declare function ensureSchema(): Promise<void>;
export declare function newSessionId(): string;
export declare function persistSession(id: string, payload: Record<string, unknown>, ttlSeconds?: number): Promise<void>;
export declare function deleteSession(id: string): Promise<void>;
/** Build a `Set-Cookie` value for the given session id. */
export declare function buildCookie(id: string, ttlSeconds?: number): string;
export declare function csrfToken(sid: string): string;
export declare function csrfMatches(sid: string, candidate: string): boolean;
