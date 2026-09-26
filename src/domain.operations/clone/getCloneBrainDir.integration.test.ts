import { asIsoTimeStamp } from 'iso-time';
import { genTempDir, given, then, when } from 'test-fns';

import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { getCloneBrainDir } from './getCloneBrainDir';

describe('getCloneBrainDir.integration', () => {
  given('[case1] an actor with no brain dir', () => {
    when('[t0] the clone brain dir is read', () => {
      then('it is ~/.claude, where a pre-release clone wrote', () => {
        const actorDir = genTempDir({ slug: 'cloneconfig-absent' });
        const result = getCloneBrainDir({
          actorDir,
          spawnedAt: asIsoTimeStamp(new Date().toISOString()),
        });
        expect(result).toEqual(join(homedir(), '.claude'));
      });
    });
  });

  given('[case2] an actor whose brain dir was born before the spawn', () => {
    when('[t0] the clone brain dir is read', () => {
      then('it is the actor brain dir', () => {
        const actorDir = genTempDir({ slug: 'cloneconfig-present' });
        const brainDir = join(actorDir, 'brain', '.claude');
        mkdirSync(brainDir, { recursive: true });
        const result = getCloneBrainDir({
          actorDir,
          spawnedAt: asIsoTimeStamp(
            new Date(Date.now() + 60_000).toISOString(),
          ),
        });
        expect(result).toEqual(brainDir);
      });
    });
  });
});
