/**
 * BO registry — Phase 3.
 *
 * CaseMaster `<@bo>` declarations live inside `resource main` of files
 * under `bo/`. We extract them statically (no DB / runtime needed) by
 * walking the AST: the resource body is a `<@bo>` qualifier with literal
 * props, including `table: '…'` and `attributes: <name1: <@bo/attribute
 * column: '…'>, …>`.
 *
 * The result is a flat `Map<boName, BOInfo>` keyed by the path-derived
 * name (e.g. `bo/qr/labelTemplate.cms` → `qr/labelTemplate`). The
 * iterator builtin uses this to translate `entity: 'qr/labelTemplate'`
 * into `SELECT … FROM qr_label_template`.
 */
import * as A from './ast.js';
export interface BOAttr {
    column: string;
    label?: string;
    dataType?: string;
    foreignKey?: string;
}
export interface BOInfo {
    name: string;
    table: string;
    primaryKey: string;
    attributes: Map<string, BOAttr>;
    groups: Map<string, string[]>;
    listGroup: string[];
}
/**
 * Extract a BOInfo from a parsed `resource main` body. Returns null when
 * the resource isn't a `<@bo>` declaration (most resources aren't).
 */
export declare function tryExtractBo(name: string, resource: A.Resource): BOInfo | null;
