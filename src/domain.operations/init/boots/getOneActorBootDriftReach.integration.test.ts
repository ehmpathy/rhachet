import { genTempDir, given, then, when } from 'test-fns';

import { getBrainOndiskDir } from '@src/domain.operations/actor/enrolled/getBrainOndiskDir';
import { genActorBootRevision } from '@src/domain.operations/boot/genActorBootRevision';
import { setActorBootDrifts } from '@src/domain.operations/boot/setActorBootDrifts';
import { setCloneBootSpawnedResumed } from '@src/domain.operations/clone/setCloneBootSpawnedResumed';

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getOneActorBootDriftReach } from './getOneActorBootDriftReach';

const BOOT_V1 = [
  '<brief.say path=".agent/repo=.this/role=any/briefs/surf.md">',
  'paddle out at dawn',
  '</brief.say>',
  '',
].join('\n');
const BOOT_V2 = BOOT_V1.replace('dawn', 'dusk');

/**
 * .what = an actor with one revision on v1, a clone on it, the boot moved to v2, and the
 *         drift sweep already run
 */
const genActorWithCloneOnV1 = () => {
  const actorDir = join(
    genTempDir({ slug: 'boot-drift-reach' }),
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
  writeFileSync(join(cloneDir, 'boot.spawned.ref'), `${revision.hash}\n`);
  writeFileSync(bootMdPath, BOOT_V2);
  const drifts = setActorBootDrifts({
    actorDir,
    bootMdPathCurrent: bootMdPath,
  });
  return { actorDir, revision, cloneDir, drifts };
};

describe('getOneActorBootDriftReach', () => {
  given('[case1] one clone on a re-written revision', () => {
    when('[t0] the reach is read', () => {
      then('it counts the clone, with no fault', () => {
        const scene = genActorWithCloneOnV1();
        expect(
          getOneActorBootDriftReach({
            actorDir: scene.actorDir,
            rewritten: scene.drifts.rewritten,
          }),
        ).toEqual({ clones: 1, unreached: 0, gone: [], faults: [] });
      });
    });
  });

  given('[case2] a ref names a revision that was reaped', () => {
    when('[t0] the reach is read', () => {
      then('the gone revision is a row, never a fault', () => {
        const scene = genActorWithCloneOnV1();
        const cloneDirGone = join(
          scene.actorDir,
          'clones',
          'serial=0000bbbb-1111-2222-3333-444455556666',
        );
        mkdirSync(cloneDirGone, { recursive: true });
        writeFileSync(
          join(cloneDirGone, 'boot.spawned.ref'),
          'ffffffffffffffff\n',
        );
        const reach = getOneActorBootDriftReach({
          actorDir: scene.actorDir,
          rewritten: scene.drifts.rewritten,
        });
        expect(reach.clones).toEqual(1);
        expect(reach.gone).toEqual(['ffffffffffffffff']);
        expect(reach.faults).toEqual([]);
      });
    });
  });

  given('[case2c] a revision dir that holds no boot.md', () => {
    when('[t0] the reach is read', () => {
      then(
        'the dir is no revision: its ref reads as gone, never a fault',
        () => {
          // a crash or a concurrent spawn can leave the dir between its mkdir and its write
          const scene = genActorWithCloneOnV1();
          rmSync(
            join(
              scene.actorDir,
              'boots',
              `sha256=${scene.revision.hash}`,
              'boot.md',
            ),
          );
          const reach = getOneActorBootDriftReach({
            actorDir: scene.actorDir,
            rewritten: [],
          });
          expect(reach.gone).toEqual([scene.revision.hash]);
          expect(reach.faults).toEqual([]);
        },
      );
    });
  });

  given(
    '[case2b] a clone spawned on a new revision after the sweep ran',
    () => {
      when('[t0] the reach is read', () => {
        then('its revision reads as present, never as gone', () => {
          // the sweep ran on v2's render; a clone then spawns, which findserts a v2 revision
          //   the sweep never listed, and records its ref to it
          const scene = genActorWithCloneOnV1();
          const revisionNew = genActorBootRevision({
            actorDir: scene.actorDir,
          })!;
          expect(scene.drifts.revisions).not.toContain(revisionNew.hash);
          const cloneDirNew = join(
            scene.actorDir,
            'clones',
            'serial=0000cccc-1111-2222-3333-444455556666',
          );
          mkdirSync(cloneDirNew, { recursive: true });
          writeFileSync(
            join(cloneDirNew, 'boot.spawned.ref'),
            `${revisionNew.hash}\n`,
          );
          const reach = getOneActorBootDriftReach({
            actorDir: scene.actorDir,
            rewritten: scene.drifts.rewritten,
          });
          expect(reach).toEqual({
            clones: 1,
            unreached: 0,
            gone: [],
            faults: [],
          });
        });
      });
    },
  );

  given('[case2d] a resumed clone and a clone from before boot drift', () => {
    when('[t0] the reach is read', () => {
      then(
        'each counts as unreached, never as a clone the drift reaches',
        () => {
          const scene = genActorWithCloneOnV1();
          const cloneDirResumed = join(
            scene.actorDir,
            'clones',
            'serial=0000dddd-1111-2222-3333-444455556666',
          );
          mkdirSync(cloneDirResumed, { recursive: true });
          setCloneBootSpawnedResumed({ cloneDir: cloneDirResumed });
          mkdirSync(
            join(
              scene.actorDir,
              'clones',
              'serial=0000eeee-1111-2222-3333-444455556666',
            ),
            { recursive: true },
          );
          const reach = getOneActorBootDriftReach({
            actorDir: scene.actorDir,
            rewritten: scene.drifts.rewritten,
          });
          expect(reach).toEqual({
            clones: 1,
            unreached: 2,
            gone: [],
            faults: [],
          });
        },
      );
    });
  });

  given('[case3] a ref cannot be read', () => {
    when('[t0] the reach is read', () => {
      then(
        'the unreadable ref is a fault with its path and cause, and the count is unknown, never a false zero',
        () => {
          const scene = genActorWithCloneOnV1();
          const refPath = join(scene.cloneDir, 'boot.spawned.ref');
          rmSync(refPath);
          mkdirSync(refPath);
          const reach = getOneActorBootDriftReach({
            actorDir: scene.actorDir,
            rewritten: scene.drifts.rewritten,
          });
          expect(reach.clones).toBeNull();
          expect(reach.unreached).toBeNull();
          expect(reach.faults).toHaveLength(1);
          expect(reach.faults[0]!.path).toEqual(join(scene.actorDir, 'clones'));
          expect(reach.faults[0]!.reason).toContain(
            'a spawn ref could not be read',
          );
          expect(reach.faults[0]!.reason).toContain(refPath);
        },
      );
    });
  });
});
