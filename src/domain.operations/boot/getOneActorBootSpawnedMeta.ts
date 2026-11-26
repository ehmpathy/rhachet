import { MalfunctionError } from 'helpful-errors';

import { existsSync, readFileSync } from 'node:fs';
import type { BootSpawnedMeta } from './BootSpawnedMeta';

/**
 * .what = the meta a clone's spawn boot dir holds, or null where it holds none
 * .why = the sweep and the drift reader each key on these hashes; one reader keeps the parse
 *        and its fault in one place
 * .note = a meta that does not parse, or lacks the spawn hash, fails loud with its path: a quiet
 *         null would read a corrupt dir as a clone from before boot drift
 */
export const getOneActorBootSpawnedMeta = (input: {
  path: string;
}): BootSpawnedMeta | null => {
  // no meta means no spawn boot was recorded here
  if (!existsSync(input.path)) return null;

  // parse it; a malformed meta names its path. a read fault throws as it is
  const raw = readFileSync(input.path, 'utf8');
  const parsed = ((): Partial<BootSpawnedMeta> | null => {
    try {
      return JSON.parse(raw);
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
      return null;
    }
  })();
  const hash = parsed?.spawned?.hash;
  if (typeof hash !== 'string' || hash.length === 0)
    throw new MalfunctionError('the spawn boot meta is malformed', {
      path: input.path,
      hint: 'the clone cannot be read for drift; respawn it to take the current boot',
    });

  // the drift key is optional: a spawn writes it right after the boot
  const against = parsed?.drift?.against;
  return {
    spawned: { hash },
    drift: typeof against === 'string' ? { against } : null,
  };
};
