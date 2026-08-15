import { join } from 'node:path';
import { asCloneDirName } from './asCloneDirName';

/**
 * .what = derive the on-disk dir for one clone under its actor
 * .why =
 *   - a clone lives under its actor's dir at `clones/serial=<serial>/`, keyed by
 *     the serial (its primary ref). the dir holds only the durable, host-portable
 *     bits — the identity manifest + the history symlinks
 *   - the SOCKET is NOT here: it is host-scoped runtime under $XDG_RUNTIME_DIR
 *     (see getCloneSocketPath), so the clone dir stays free of a stale path when
 *     the repo is read on another host
 *
 * .note = derived fresh from { actorDir, serial } on every read, never stored
 */
export const getCloneDir = (input: {
  actorDir: string;
  serial: string;
}): string =>
  join(input.actorDir, 'clones', asCloneDirName({ serial: input.serial }));
