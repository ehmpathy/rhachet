import type { IsoTimeStamp } from 'iso-time';

import { getBrainOndiskDir } from '@src/domain.operations/actor/enrolled/getBrainOndiskDir';
import { getHomeDir } from '@src/infra/getHomeDir';

import { statSync } from 'node:fs';
import { join } from 'node:path';
import { asCloneBrainDir } from './asCloneBrainDir';

/**
 * .what = the brain dir one clone writes its transcripts under
 * .why = the history link and the history read must scope the same dir, so both
 *   reach it through this one call (D8)
 *
 * .note = an actor with no brain dir was enrolled before brain dirs existed, so its
 *   clones write under `~/.claude`
 */
export const getCloneBrainDir = (input: {
  actorDir: string;
  spawnedAt: IsoTimeStamp;
}): string => {
  const brainDir = getBrainOndiskDir({ actorDir: input.actorDir });
  const home = getHomeDir();

  // no brain dir → a pre-release actor
  const brainDirStat = statSync(brainDir, { throwIfNoEntry: false });
  if (!brainDirStat) return join(home, '.claude');

  return asCloneBrainDir({
    brainDir,
    brainDirBornAt: brainDirStat.birthtimeMs,
    spawnedAt: Date.parse(input.spawnedAt),
    home,
  });
};
