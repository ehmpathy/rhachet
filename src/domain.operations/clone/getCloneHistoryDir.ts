import { join } from 'node:path';

/**
 * .what = derive the on-disk `history/` dir for one clone from its clone dir
 * .why =
 *   - a clone's transcript symlinks live under `<cloneDir>/history/` (one link per
 *     episode, `<exid>.jsonl`). three readers + the linker each need that path, so
 *     one owner keeps the `history` segment single-sourced — the same
 *     decompose-for-recompose discipline `getCloneDir` follows for the `serial=`
 *     segment, so a rename of the segment is one edit, caught at every reader
 *   - pairs with `getCloneDir`: that owns `<actorDir>/clones/serial=<serial>`, this
 *     owns the `history/` leaf beneath it — the inverse `dirname` never appears
 *
 * .note = derived fresh from the clone dir on every read, never stored
 */
export const getCloneHistoryDir = (input: { cloneDir: string }): string =>
  join(input.cloneDir, 'history');
