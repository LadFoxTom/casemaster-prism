/**
 * AST node types for the .cms language. Phase 1 covers only what the
 * `ping` function needs: `function`, `set`, `if`, `iterate iterator.ofEntity`,
 * a handful of expressions, and `response.*` calls. Each node carries a
 * `loc` so error messages can point back to the original .cms file.
 */
export interface Loc {
    file: string;
    line: number;
    col: number;
}
export type Node = Func | Resource | Stmt | Expr;
export interface Param {
    name: string;
    default_: Expr | null;
}
export interface Func {
    kind: 'Func';
    name: string;
    params: Param[];
    body: Stmt[];
    loc: Loc;
}
export interface Resource {
    kind: 'Resource';
    name: string;
    body: Expr;
    loc: Loc;
}
export type Stmt = Set | If | Iterate | Return | ExitFunction | Raise | Try | ExprStmt;
export interface Set {
    kind: 'Set';
    name: string;
    value: Expr;
    loc: Loc;
}
export interface If {
    kind: 'If';
    cond: Expr;
    then: Stmt[];
    elseIfs: {
        cond: Expr;
        body: Stmt[];
    }[];
    else_: Stmt[] | null;
    loc: Loc;
}
export interface Iterate {
    kind: 'Iterate';
    source: Expr;
    body: Stmt[];
    loc: Loc;
}
export interface Return {
    kind: 'Return';
    value: Expr | null;
    loc: Loc;
}
export interface ExitFunction {
    kind: 'ExitFunction';
    loc: Loc;
}
export interface Try {
    kind: 'Try';
    body: Stmt[];
    catchVar: string | null;
    catch_: Stmt[] | null;
    finally_: Stmt[] | null;
    loc: Loc;
}
export interface Raise {
    kind: 'Raise';
    exType: Expr;
    message: Expr;
    loc: Loc;
}
export interface ExprStmt {
    kind: 'ExprStmt';
    expr: Expr;
    loc: Loc;
}
export type Expr = StrLit | NumLit | BoolLit | NullLit | VarRef | Ident | MemberAcc | Call | Qualifier | NamedArg;
export interface StrLit {
    kind: 'StrLit';
    value: string;
    template: boolean;
    loc: Loc;
}
export interface NumLit {
    kind: 'NumLit';
    value: number;
    loc: Loc;
}
export interface BoolLit {
    kind: 'BoolLit';
    value: boolean;
    loc: Loc;
}
export interface NullLit {
    kind: 'NullLit';
    loc: Loc;
}
export interface VarRef {
    kind: 'VarRef';
    name: string;
    loc: Loc;
}
export interface Ident {
    kind: 'Ident';
    name: string;
    loc: Loc;
}
export interface MemberAcc {
    kind: 'MemberAcc';
    object: Expr;
    member: string;
    loc: Loc;
}
export interface Call {
    kind: 'Call';
    callee: Expr;
    args: Expr[];
    loc: Loc;
}
export interface Qualifier {
    kind: 'Qualifier';
    path: string[];
    props: Record<string, Expr>;
    loc: Loc;
}
export interface NamedArg {
    kind: 'NamedArg';
    name: string;
    value: Expr;
    loc: Loc;
}
