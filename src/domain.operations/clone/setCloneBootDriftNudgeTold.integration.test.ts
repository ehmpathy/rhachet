import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { getBrainOndiskDir } from '@src/domain.operations/actor/enrolled/getBrainOndiskDir';
import { genActorBootRevision } from '@src/domain.operations/boot/genActorBootRevision';
import { setActorBootDrifts } from '@src/domain.operations/boot/setActorBootDrifts';

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getOneCloneBootDriftTold } from './getOneCloneBootDriftTold';
import { setCloneBootDriftNudgeTold } from './setCloneBootDriftNudgeTold';
import { setCloneBootSpawnedRef } from './setCloneBootSpawnedRef';

const BOOT_V1 = [
  '<brief.say path=".agent/repo=.this/role=any/briefs/surf.md">',
  'paddle out at dawn',
  '</brief.say>',
  '',
].join('\n');

/** the boot after an editor added a 240-line brief: past the 200 line threshold */
const BOOT_V2 = [
  BOOT_V1,
  '<brief.say path=".agent/repo=.this/role=any/briefs/tides.md">',
  ...Array.from({ length: 240 }, (_, i) => `read the tide, line ${i + 1}`),
  '</brief.say>',
  '',
].join('\n');

/**
 * .what = an actor whose clone spawned on v1, with the boot moved to `bootNext` and the sweep run
 */
const genActorWithCloneDrifted = (input: { bootNext: string }) => {
  const actorDir = join(
    genTempDir({ slug: 'boot-drift-nudge-told' }),
    '.agent',
    '.actors',
    'actor.via.hash=abc12345',
  );
  const brainDir = getBrainOndiskDir({ actorDir });
  mkdirSync(brainDir, { recursive: true });
  const bootMdPath = join(brainDir, 'boot.md');
  writeFileSync(bootMdPath, BOOT_V1);
  const revision = genActorBootRevision({ actorDir })!;
  const cloneDir = join(
    actorDir,
    'clones',
    'serial=0000aaaa-1111-2222-3333-444455556666',
  );
  mkdirSync(cloneDir, { recursive: true });
  setCloneBootSpawnedRef({ cloneDir, hash: revision.hash });
  writeFileSync(bootMdPath, input.bootNext);
  setActorBootDrifts({ actorDir, bootMdPathCurrent: bootMdPath });
  return { actorDir, cloneDir };
};

describe('setCloneBootDriftNudgeTold', () => {
  given('[case1] a clone whose drift is past the threshold', () => {
    when('[t0] the nudge is asked for twice', () => {
      const result = useBeforeAll(async () => {
        const scene = genActorWithCloneDrifted({ bootNext: BOOT_V2 });
        const input = { ...scene, address: '@:driver' };
        const first = setCloneBootDriftNudgeTold(input);
        const toldAfterFirst = getOneCloneBootDriftTold({
          cloneDir: scene.cloneDir,
        });
        const second = setCloneBootDriftNudgeTold(input);
        return { first, toldAfterFirst, second };
      });

      then('the first returns the nudge lines, addressed to the clone', () => {
        expect(result.first).not.toBeNull();
        expect(result.first!.lines[0]).toEqual('😶 boot drift');
        expect(result.first!.lines.join('\n')).toContain(
          'rhx clone say @:driver --what /compact',
        );
      });

      then('the drift is latched as told before the lines return', () => {
        expect(result.toldAfterFirst).toMatch(/^[0-9a-f]{16}$/);
      });

      then('the second returns null: the drift is told once', () => {
        expect(result.second).toBeNull();
      });
    });
  });

  given('[case2] a clone whose drift is under the threshold', () => {
    when('[t0] the nudge is asked for', () => {
      const result = useBeforeAll(async () => {
        const scene = genActorWithCloneDrifted({
          bootNext: BOOT_V1.replace('dawn', 'dusk'),
        });
        const nudge = setCloneBootDriftNudgeTold({
          ...scene,
          address: '@:driver',
        });
        const told = getOneCloneBootDriftTold({ cloneDir: scene.cloneDir });
        return { nudge, told };
      });

      then('it returns null and latches naught', () => {
        expect(result.nudge).toBeNull();
        expect(result.told).toBeNull();
      });
    });
  });
});
