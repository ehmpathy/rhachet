import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { getBrainOndiskDir } from '@src/domain.operations/actor/enrolled/getBrainOndiskDir';

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { asBootContentHash } from './asBootContentHash';
import { delActorBootSpawned } from './delActorBootSpawned';
import { genActorBootSpawned } from './genActorBootSpawned';
import { getActorBootSpawnedPaths } from './getActorBootSpawnedPaths';
import { getAllActorBootSpawnedSerials } from './getAllActorBootSpawnedSerials';
import { getOneActorBootSpawnedMeta } from './getOneActorBootSpawnedMeta';
import { setActorBootDrift } from './setActorBootDrift';
import { setActorBootDrifts } from './setActorBootDrifts';

const BOOT_V1 = [
  '<brief.say path=".agent/repo=.this/role=any/briefs/surf.md">',
  'paddle out at dawn',
  '</brief.say>',
  '',
].join('\n');

const BOOT_V2 = BOOT_V1.replace('dawn', 'dusk');

const SERIAL = '0000aaaa-1111-2222-3333-444455556666';

/**
 * .what = an actor with a rendered boot at `boot`
 */
const genActorWithBoot = (input: { boot: string }) => {
  const actorDir = join(
    genTempDir({ slug: 'boot-spawned' }),
    '.agent',
    '.actors',
    'actor.via.hash=abc12345',
  );
  const brainDir = getBrainOndiskDir({ actorDir });
  mkdirSync(brainDir, { recursive: true });
  const bootMdPath = join(brainDir, 'boot.md');
  writeFileSync(bootMdPath, input.boot);
  return { actorDir, bootMdPath };
};

describe('genActorBootSpawned', () => {
  given('[case1] an actor with no rendered boot', () => {
    when('[t0] a spawn boot is asked for', () => {
      const result = useBeforeAll(async () => {
        const actorDir = join(genTempDir({ slug: 'boot-spawned-none' }), 'a');
        mkdirSync(actorDir, { recursive: true });
        return { spawned: genActorBootSpawned({ actorDir, serial: SERIAL }) };
      });

      then('it returns null: no boot, no spawn boot', () => {
        expect(result.spawned).toBeNull();
      });
    });
  });

  given('[case2] an actor with a rendered boot', () => {
    when('[t0] a clone spawns on it', () => {
      const result = useBeforeAll(async () => {
        const scene = genActorWithBoot({ boot: BOOT_V1 });
        const spawned = genActorBootSpawned({
          actorDir: scene.actorDir,
          serial: SERIAL,
        })!;
        const paths = getActorBootSpawnedPaths({
          actorDir: scene.actorDir,
          serial: SERIAL,
        });
        return { ...scene, spawned, paths };
      });

      then('the spawn boot lives under boots/serial=<serial>/', () => {
        expect(result.spawned.dir).toEqual(
          join(result.actorDir, 'boots', `serial=${SERIAL}`),
        );
        expect(readFileSync(result.paths.bootMd, 'utf8')).toEqual(BOOT_V1);
      });

      then('the meta names the spawn hash, and the drift keyed to it', () => {
        const meta = getOneActorBootSpawnedMeta({
          path: result.paths.metaJson,
        });
        expect(meta).toEqual({
          spawned: { hash: asBootContentHash({ bytes: BOOT_V1 }) },
          drift: { against: asBootContentHash({ bytes: BOOT_V1 }) },
        });
      });

      then('the drift is empty: the clone holds the current boot', () => {
        expect(readFileSync(result.paths.driftMd, 'utf8')).toEqual('');
      });

      then('the sweep lists the clone by its serial', () => {
        expect(
          getAllActorBootSpawnedSerials({ actorDir: result.actorDir }),
        ).toEqual([SERIAL]);
      });
    });
  });

  given('[case3] a clone whose boot moved on since it spawned', () => {
    when('[t0] the sweep runs, then a clone drift is asked for again', () => {
      const result = useBeforeAll(async () => {
        const scene = genActorWithBoot({ boot: BOOT_V1 });
        genActorBootSpawned({ actorDir: scene.actorDir, serial: SERIAL });
        writeFileSync(scene.bootMdPath, BOOT_V2);
        const sweep = setActorBootDrifts({
          actorDir: scene.actorDir,
          bootMdPathCurrent: scene.bootMdPath,
        });
        const paths = getActorBootSpawnedPaths({
          actorDir: scene.actorDir,
          serial: SERIAL,
        });
        const driftAfterSweep = readFileSync(paths.driftMd, 'utf8');
        const again = setActorBootDrift({
          actorDir: scene.actorDir,
          serial: SERIAL,
          bootCurrent: BOOT_V2,
          bootCurrentHash: asBootContentHash({ bytes: BOOT_V2 }),
        });
        const meta = getOneActorBootSpawnedMeta({ path: paths.metaJson });
        return { sweep, driftAfterSweep, again, meta };
      });

      then('the sweep re-writes the clone drift', () => {
        expect(result.sweep.rewritten).toEqual([SERIAL]);
        expect(result.driftAfterSweep).toContain('dusk');
      });

      then('the meta keys the drift to the current boot hash', () => {
        expect(result.meta!.spawned.hash).toEqual(
          asBootContentHash({ bytes: BOOT_V1 }),
        );
        expect(result.meta!.drift).toEqual({
          against: asBootContentHash({ bytes: BOOT_V2 }),
        });
      });

      then(
        'a second ask against the same boot hash is a cache hit: unchanged',
        () => {
          expect(result.again.outcome).toEqual('unchanged');
        },
      );
    });
  });

  given('[case4] a clone is reaped', () => {
    when('[t0] its spawn boot is deleted twice', () => {
      const result = useBeforeAll(async () => {
        const scene = genActorWithBoot({ boot: BOOT_V1 });
        const spawned = genActorBootSpawned({
          actorDir: scene.actorDir,
          serial: SERIAL,
        })!;
        delActorBootSpawned({ actorDir: scene.actorDir, serial: SERIAL });
        delActorBootSpawned({ actorDir: scene.actorDir, serial: SERIAL });
        return { ...scene, spawned };
      });

      then('the spawn boot dir is gone, and the second reap is a no-op', () => {
        expect(existsSync(result.spawned.dir)).toBe(false);
        expect(
          getAllActorBootSpawnedSerials({ actorDir: result.actorDir }),
        ).toEqual([]);
      });
    });
  });
});
