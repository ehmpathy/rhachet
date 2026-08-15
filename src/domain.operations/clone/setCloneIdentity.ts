import type { IsoTimeStamp } from 'iso-time';
import { getUuid } from 'uuid-fns';

import { renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CLONE_IDENTITY_SCHEMA_VERSION } from './constants';

/**
 * .what = write one clone's identity.json into its dir, atomically
 * .why =
 *   - identity.json is the durable, host-portable half of a clone: the serial,
 *     the optional slug, whether a socket was stood up, and the host-pid facts a
 *     later reach needs. it is the record `getCloneIdentity` reads back
 *   - the write is atomic (temp file + rename), so a reader never sees a
 *     half-written record — a partial identity.json would read as corrupt and
 *     fail loud, which wedges the clone
 *
 * .note = the SLUG index (`.slugs/<slug>`) is NOT written here — genClone claims
 *   it (an atomic exclusive symlink) BEFORE it renames the temp dir into place,
 *   so the winner-election happens before the serial dir is enumerable. this op
 *   only writes the per-clone record
 * .note = the socket PATH is not persisted — only `socketEligible`. the path is
 *   derived fresh from the serial (getCloneSocketPath), so a moved repo carries
 *   no stale path
 */
export const setCloneIdentity = (input: {
  cloneDir: string;
  serial: string;
  slug: string | null;
  socketEligible: boolean;
  spawnedAt: IsoTimeStamp;
  hostHash: string;
  hostPid: number;
  hostPidStartedAt: IsoTimeStamp;
}): void => {
  const record = {
    schemaVersion: CLONE_IDENTITY_SCHEMA_VERSION,
    serial: input.serial,
    slug: input.slug,
    socketEligible: input.socketEligible,
    spawnedAt: input.spawnedAt,
    hostHash: input.hostHash,
    hostPid: input.hostPid,
    hostPidStartedAt: input.hostPidStartedAt,
  };

  // write to a temp file, then rename — so a reader never sees a partial record
  const recordPath = join(input.cloneDir, 'identity.json');
  const recordTemp = join(input.cloneDir, `.identity.json.${getUuid()}.tmp`);
  writeFileSync(recordTemp, JSON.stringify(record) + '\n', 'utf8');
  renameSync(recordTemp, recordPath);
};
