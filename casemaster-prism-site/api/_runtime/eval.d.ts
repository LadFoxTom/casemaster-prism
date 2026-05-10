/**
 * Tree-walking interpreter. Phase 1 supports the subset of expressions
 * and statements that the `ping` function exercises. Each function call
 * gets its own fresh Scope; `set('x', …)` mutates the *current* scope
 * and is invisible to the caller.
 *
 * The `Ctx` carries request-wide state — the response writer and the
 * registry of loaded functions. Builtins live in a single dispatch
 * table; new ones are added as later phases need them.
 */
import * as A from './ast.js';
import type { Resource } from './ast.js';
import type { BOInfo } from './bo.js';
export type Value = string | number | boolean | null | Row | RowList | Iter | Qualifier | {
    __kind: 'undefined';
};
export interface Row {
    __kind: 'Row';
    data: Record<string, unknown>;
    entity?: string;
}
export interface RowList {
    __kind: 'RowList';
    rows: Row[];
}
export interface Iter {
    __kind: 'Iter';
    iterName: string;
    rows: Row[];
    entity?: string;
}
export interface Qualifier {
    __kind: 'Qualifier';
    path: string[];
    props: Record<string, Value>;
}
export declare class Scope {
    parent: Scope | null;
    vars: Map<string, Value>;
    constructor(parent?: Scope | null);
    get(name: string): Value;
    set(name: string, v: Value): void;
}
export interface Ctx {
    funcs: Map<string, A.Func>;
    resources: Map<string, Resource>;
    bos: Map<string, BOInfo>;
    res: {
        contentType: string;
        body: string;
        status: number;
        headers: Record<string, string>;
        redirect?: string;
    };
    req: {
        method: string;
        url: string;
        query: Record<string, string>;
        body: string;
        headers?: Record<string, string | undefined>;
    };
    session?: {
        id: string;
        payload: Record<string, unknown>;
    };
    sessionDirty?: boolean;
    currentPage?: string;
}
export declare class RuntimeError extends Error {
    loc: A.Loc;
    constructor(loc: A.Loc, msg: string);
}
export declare function callFunction(ctx: Ctx, name: string, args?: Value[]): Promise<Value>;
export declare function evalExpr(ctx: Ctx, scope: Scope, e: A.Expr): Promise<Value>;
export declare function compileWhere(w: string, info?: BOInfo): string;
