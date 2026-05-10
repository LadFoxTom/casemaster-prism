/**
 * Parser for the .cms language. Phase 1 covers only what `ping` needs:
 * function declarations, set/if/iterate/return statements, calls with
 * positional + named args, qualifier blocks, var refs, dotted member
 * access, string/number/bool/null literals.
 *
 * No grammar generator — see HOW.md for why. The parser is two parts:
 *   skipNL()       — consume any pending NEWLINE tokens
 *   parseFile()    — top-level loop, picks `function` or skips other things
 */
import { Tok } from './lex.js';
import * as A from './ast.js';
export declare class ParseError extends Error {
    file: string;
    line: number;
    col: number;
    constructor(file: string, line: number, col: number, msg: string);
}
export interface ParsedFile {
    funcs: A.Func[];
    resources: A.Resource[];
}
export declare function parse(toks: Tok[], file: string): ParsedFile;
/**
 * Parse a free-standing expression — used by resolveTemplate to evaluate
 * a single `{{…}}` chunk. Toks should be the lex output of the chunk's
 * source, no surrounding `function` / `end-function`.
 */
export declare function parseExpression(toks: Tok[], file: string): A.Expr;
