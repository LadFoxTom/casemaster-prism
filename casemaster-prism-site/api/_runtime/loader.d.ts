/**
 * Read all .cms files under the app directory, parse them, and return a
 * flat function registry. Phase 1: a single file is enough; later phases
 * will key by (script, fn) and build a richer module map.
 */
import * as A from './ast.js';
import { BOInfo } from './bo.js';
export interface AppRegistry {
    funcs: Map<string, A.Func>;
    resources: Map<string, A.Resource>;
    bos: Map<string, BOInfo>;
    fileFns: Map<string, string[]>;
}
export declare function loadApp(appDir: string): AppRegistry;
