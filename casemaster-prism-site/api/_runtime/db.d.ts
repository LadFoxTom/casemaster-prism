/**
 * Single Postgres pool, lazily warmed. One pool per Node process; Vercel's
 * runtime model means each warm function instance gets its own. Tuned with
 * the same conservative defaults the official runtime uses for Neon's
 * suspend behaviour.
 */
import { Pool } from 'pg';
export declare function pool(): Pool;
export declare function query<T = any>(sql: string, params?: unknown[]): Promise<T[]>;
