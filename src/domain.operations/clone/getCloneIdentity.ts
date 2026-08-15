import { MalfunctionError } from 'helpful-errors';
import type { IsoTimeStamp } from 'iso-time';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CLONE_IDENTITY_SCHEMA_VERSION } from './constants';

/**
 * .what = the parsed, host-portable identity record of one clone (its
 *   identity.json), before hydration attaches the derived actor + historyDir
 */
export interface CloneIdentityRecord {
  serial: string;
  slug: string | null;
  socketEligible: boolean;
  spawnedAt: IsoTimeStamp;
  hostHash: string;
  hostPid: number;
  hostPidStartedAt: IsoTimeStamp;
}

/**
 * .what = read + parse one clone's identity.json — the ONE read seam every clone
 *   reader composes, so the parse + version logic lives in exactly one place
 * .why =
 *   - a clone dir with no identity.json is a typed "no record" (null), NOT an
 *     error — an enumerator that races a half-built dir simply skips it. this is
 *     distinct from a CORRUPT record, which fails loud (a real defect to fix)
 *   - the record is versioned: an OLDER schema upgrades on read (tolerant), a
 *     NEWER-unknown one fails loud with an upgrade hint — so a dir written by a
 *     future rhachet is never silently mis-read
 *
 * .note = ENOENT → null (absent, benign); a parse error or a newer schema →
 *   MalfunctionError (fail loud, names the fix)
 */
export const getCloneIdentity = (input: {
  cloneDir: string;
}): CloneIdentityRecord | null => {
  const recordPath = join(input.cloneDir, 'identity.json');

  // read the raw record; an absent file is a benign "no record", not an error
  // .note = deliberate mutation — `raw` is assigned once inside the try (a
  //         readFile that may throw ENOENT); bounded to this scope, never escapes
  let raw: string;
  try {
    raw = readFileSync(recordPath, 'utf8');
  } catch (error) {
    // .code is realm-safe (an own property); `instanceof Error` is not, in jest
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') return null;
    throw error;
  }

  // parse the record; a malformed json is a corrupt record — fail loud
  // .note = deliberate mutation — `parsed` is assigned once inside the try (a
  //         JSON.parse that may throw on corrupt bytes); bounded, never escapes
  let parsed: { schemaVersion?: unknown } & Partial<CloneIdentityRecord>;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return MalfunctionError.throw('clone identity.json is corrupt (bad json)', {
      recordPath,
      cause: error instanceof Error ? error : undefined,
    });
  }

  // a newer-unknown schema cannot be trusted — fail loud with the upgrade fix
  const version = parsed.schemaVersion;
  if (typeof version === 'number' && version > CLONE_IDENTITY_SCHEMA_VERSION)
    return MalfunctionError.throw(
      'clone identity.json is a newer schema than this rhachet understands',
      {
        recordPath,
        found: version,
        supported: CLONE_IDENTITY_SCHEMA_VERSION,
        hint: 'upgrade rhachet to read this clone',
      },
    );

  // the fixed fields must all be present — a record absent one is corrupt
  if (
    typeof parsed.serial !== 'string' ||
    typeof parsed.socketEligible !== 'boolean' ||
    typeof parsed.spawnedAt !== 'string' ||
    typeof parsed.hostHash !== 'string' ||
    typeof parsed.hostPid !== 'number' ||
    typeof parsed.hostPidStartedAt !== 'string'
  )
    return MalfunctionError.throw(
      'clone identity.json is corrupt (absent a required field)',
      { recordPath, parsed },
    );

  return {
    serial: parsed.serial,
    slug: parsed.slug ?? null,
    socketEligible: parsed.socketEligible,
    spawnedAt: parsed.spawnedAt,
    hostHash: parsed.hostHash,
    hostPid: parsed.hostPid,
    hostPidStartedAt: parsed.hostPidStartedAt,
  };
};
