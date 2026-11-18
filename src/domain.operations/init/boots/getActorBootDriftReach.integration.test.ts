import { genTempDir, given, then, when } from 'test-fns';

import { getBrainOndiskDir } from '@src/domain.operations/actor/enrolled/getBrainOndiskDir';
import { genActorBootRevision } from '@src/domain.operations/boot/genActorBootRevision';
import { setActorBootDrifts } from '@src/domain.operations/boot/setActorBootDrifts';

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getActorBootDriftReach } from './getActorBootDriftReach';

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

describe('getActorBootDriftReach', () => {
  given('[case1] one clone on a re-written revision', () => {
    when('[t0] the reach is read', () => {
      then('it counts the clone, with no fault', () => {
        const scene = genActorWithCloneOnV1();
        expect(
          getActorBootDriftReach({
            actorDir: scene.actorDir,
            revisions: scene.drifts.revisions,
            rewritten: scene.drifts.rewritten,
          }),
        ).toEqual({ clones: 1, faults: [] });
      });
    });
  });

  given('[case2] a ref names a revision that was reaped', () => {
    when('[t0] the reach is read', () => {
      then('the gone revision is a fault, and respawn is the cure', () => {
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
        const reach = getActorBootDriftReach({
          actorDir: scene.actorDir,
          revisions: scene.drifts.revisions,
          rewritten: scene.drifts.rewritten,
        });
        expect(reach.clones).toEqual(1);
        expect(
          reach.faults.map((fault) => [fault.revisionDir, fault.reason]),
        ).toEqual([
          [
            join(scene.actorDir, 'boots', 'sha256=ffffffffffffffff'),
            'is gone, yet a clone refers to it — respawn that clone',
          ],
        ]);
      });
    });
  });

  given('[case3] a ref cannot be read', () => {
    when('[t0] the reach is read', () => {
      then(
        'the unreadable ref is a fault with its path and cause, never a throw',
        () => {
          const scene = genActorWithCloneOnV1();
          const refPath = join(scene.cloneDir, 'boot.spawned.ref');
          rmSync(refPath);
          mkdirSync(refPath);
          const reach = getActorBootDriftReach({
            actorDir: scene.actorDir,
            revisions: scene.drifts.revisions,
            rewritten: scene.drifts.rewritten,
          });
          expect(reach.clones).toEqual(0);
          expect(reach.faults).toHaveLength(1);
          expect(reach.faults[0]!.revisionDir).toEqual(
            join(scene.actorDir, 'clones'),
          );
          expect(reach.faults[0]!.reason).toContain(
            'a spawn ref could not be read',
          );
          expect(reach.faults[0]!.reason).toContain(refPath);
        },
      );
    });
  });
});
