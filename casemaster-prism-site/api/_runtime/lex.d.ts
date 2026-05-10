/**
 * Tokenizer for the .cms language. Phase 1: covers the ping function's
 * surface area — keywords, identifiers, numbers, strings (single-quoted,
 * double-quoted, backticked template), `[var]` substitutions, common
 * operators, and the `<@…>` qualifier opener.
 *
 * Backticked strings are returned whole (no inner-expression interpolation
 * happens here — that's resolveTemplate's job at evaluation time).
 */
export type TokKind = 'IDENT' | 'NUM' | 'STR' | 'TBSTR' | 'LPAREN' | 'RPAREN' | 'LBRACK' | 'RBRACK' | 'LANG' | 'RANG' | 'LANGAT' | 'COMMA' | 'COLON' | 'DOT' | 'SLASH' | 'EQ' | 'NEQ' | 'LE' | 'GE' | 'LT' | 'GT' | 'KW_FUNCTION' | 'KW_END_FUNCTION' | 'KW_EXIT_FUNCTION' | 'KW_RESOURCE' | 'KW_END_RESOURCE' | 'KW_IF' | 'KW_ELSE' | 'KW_ELSE_IF' | 'KW_END_IF' | 'KW_ITERATE' | 'KW_END_ITERATE' | 'KW_FOR' | 'KW_END_FOR' | 'KW_TRY' | 'KW_CATCH' | 'KW_FINALLY' | 'KW_END_TRY' | 'KW_RETURN' | 'KW_RAISE' | 'KW_TRUE' | 'KW_FALSE' | 'KW_NULL' | 'KW_PROTECTED' | 'KW_INHERITS' | 'NEWLINE' | 'EOF';
export interface Tok {
    kind: TokKind;
    value: string;
    line: number;
    col: number;
}
export declare class LexError extends Error {
    file: string;
    line: number;
    col: number;
    constructor(file: string, line: number, col: number, msg: string);
}
export declare function lex(src: string, file: string): Tok[];
