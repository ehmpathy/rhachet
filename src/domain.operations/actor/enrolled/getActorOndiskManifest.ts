import { MalfunctionError } from 'helpful-errors';

import { readFileSync } from 'node:fs';
import { ACTOR_MANIFEST_SCHEMA_VERSION } from './constants';

/**
 * .what = read + parse + version-check ONE enrolled actor's actor.json manifest
 * .why =
 *   - the tolerant-read policy (corrupt => loud, a future schema => loud with an
 *     upgrade hint, older/absent schema => accepted) must read the SAME way at
 *     every caller. one owner means `getAllActorsOndisk` (the enumerate path)
 *     and `getOneActorOndiskByHash` (the O(1) direct path) never drift on how a
 *     manifest is validated
 *   - returns only the load-critical fields (brain, roles); the repoPath + hash of
 *     the actor come from the dir location the caller already holds
 *
 * .note = throws a MalfunctionError (server-fix) on a corrupt or too-new manifest;
 *   a caller that wants "absent => null" checks the file exists FIRST (an absent
 *   manifest is a benign half-built dir, not a corruption)
 */
export const getActorOndiskManifest = (input: {
  manifestPath: string;
  hash: string;
}): { brain: string; roles: string[] } => {
  const raw = readFileSync(input.manifestPath, 'utf8');

  const parsed = (() => {
    try {
      return JSON.parse(raw) as {
        schemaVersion?: number;
        brain?: string;
        roles?: string[];
      };
    } catch (error) {
      return MalfunctionError.throw(
        'enrolled actor manifest is corrupt — actor.json is not valid JSON',
        {
          manifestPath: input.manifestPath,
          hash: input.hash,
          cause: error instanceof Error ? error : undefined,
        },
      );
    }
  })();

  // a version from the FUTURE we cannot safely read => fail loud with a fix
  if (
    typeof parsed.schemaVersion === 'number' &&
    parsed.schemaVersion > ACTOR_MANIFEST_SCHEMA_VERSION
  )
    return MalfunctionError.throw(
      'enrolled actor manifest is a newer schema than this rhachet understands — upgrade rhachet to read it',
      {
        manifestPath: input.manifestPath,
        found: parsed.schemaVersion,
        known: ACTOR_MANIFEST_SCHEMA_VERSION,
      },
    );

  // the load-critical fields must be present, else the manifest is corrupt
  if (typeof parsed.brain !== 'string' || !Array.isArray(parsed.roles))
    return MalfunctionError.throw(
      'enrolled actor manifest is corrupt — brain or roles is absent',
      { manifestPath: input.manifestPath, hash: input.hash },
    );

  return { brain: parsed.brain, roles: parsed.roles };
};
