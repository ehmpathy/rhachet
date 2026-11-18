import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { getBrainOndiskDir } from '@src/domain.operations/actor/enrolled/getBrainOndiskDir';

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { asBootContentHash } from './asBootContentHash';
import { genActorBootRevision } from './genActorBootRevision';
import { setActorBootDrifts } from './setActorBootDrifts';

const BOOT_V1 = [
  '<brief.say path=".agent/repo=.this/role=any/briefs/surf.md">',
  'paddle out at dawn',
  '</brief.say>',
  '',
].join('\n');
const BOOT_V2 = BOOT_V1.replace('dawn', 'dusk');
const BOOT_V3 = BOOT_V1.replace('dawn', 'noon');

/**
 * .what = an actor dir whose brain dir holds the given boot
 */
const genActorWithBoot = (input: { boot: string }) => {
  const actorDir = join(
    genTempDir({ slug: 'boot-revision' }),
    '.agent',
    '.actors',
    'actor.via.hash=abc12345',
  );
  const brainDir = getBrainOndiskDir({ actorDir });
  mkdirSync(brainDir, { recursive: true });
  writeFileSync(join(brainDir, 'boot.md'), input.boot);
  return { actorDir, bootMdPath: join(brainDir, 'boot.md') };
};

describe('genActorBootRevision', () => {
  given('[case1] an actor with no rendered boot', () => {
    when('[t0] a revision is sought', () => {
      then('there is none, and no dir is made', () => {
        const actorDir = join(genTempDir({ slug: 'boot-revision' }), 'a');
        expect(genActorBootRevision({ actorDir })).toBeNull();
        expect(existsSync(join(actorDir, 'boots'))).toBe(false);
      });
    });
  });

  given('[case2] an actor with a rendered boot', () => {
    when('[t0] a revision is sought, twice', () => {
      then(
        'one revision dir holds the boot bytes, named by their hash, with an empty drift',
        () => {
          const scene = genActorWithBoot({ boot: BOOT_V1 });
          const first = genActorBootRevision({ actorDir: scene.actorDir })!;
          const second = genActorBootRevision({ actorDir: scene.actorDir })!;
          expect(second).toEqual(first);
          expect(first.hash).toEqual(asBootContentHash({ bytes: BOOT_V1 }));
          expect(first.revisionDir).toEqual(
            join(scene.actorDir, 'boots', `sha256=${first.hash}`),
          );
          expect(readFileSync(first.bootMdPath, 'utf8')).toEqual(BOOT_V1);
          expect(
            readFileSync(join(first.revisionDir, 'CLAUDE.md'), 'utf8'),
          ).toEqual('');
          expect(readdirSync(join(scene.actorDir, 'boots'))).toHaveLength(1);
        },
      );
    });
  });

  given(
    '[case3] two clones spawned on two boots, then the boot changes',
    () => {
      when('[t0] the actor sweeps its drifts', () => {
        // revisions on v1 and v2, then the actor boot moved to v3
        const scene = useBeforeAll(async () => {
          const actor = genActorWithBoot({ boot: BOOT_V1 });
          const revV1 = genActorBootRevision({
            actorDir: actor.actorDir,
          })!.revisionDir;
          writeFileSync(actor.bootMdPath, BOOT_V2);
          const revV2 = genActorBootRevision({
            actorDir: actor.actorDir,
          })!.revisionDir;
          writeFileSync(actor.bootMdPath, BOOT_V3);
          return { ...actor, revV1, revV2 };
        });

        then(
          'each revision holds its own drift against the current boot',
          () => {
            const drifts = setActorBootDrifts({
              actorDir: scene.actorDir,
              bootMdPathCurrent: scene.bootMdPath,
            });
            expect(drifts).toEqual({
              revisions: 2,
              rewritten: 2,
              clones: 0,
              faults: [],
            });
            const claudeMdV1 = readFileSync(
              join(scene.revV1, 'CLAUDE.md'),
              'utf8',
            );
            const claudeMdV2 = readFileSync(
              join(scene.revV2, 'CLAUDE.md'),
              'utf8',
            );
            expect(claudeMdV1).toContain('paddle out at noon');
            expect(claudeMdV2).toContain('paddle out at noon');
            expect(claudeMdV1).toMatch(/\ndrift = [0-9a-f]{16}\n/);
          },
        );

        then('a second sweep with no change re-writes no file', () => {
          const drifts = setActorBootDrifts({
            actorDir: scene.actorDir,
            bootMdPathCurrent: scene.bootMdPath,
          });
          expect(drifts).toEqual({
            revisions: 2,
            rewritten: 0,
            clones: 0,
            faults: [],
          });
        });
      });
    },
  );

  given('[case4] one revision cannot be written', () => {
    when('[t0] the actor sweeps its drifts', () => {
      then(
        'the fault is named, and the other revision is still written',
        () => {
          const scene = genActorWithBoot({ boot: BOOT_V1 });
          const revV1 = genActorBootRevision({
            actorDir: scene.actorDir,
          })!.revisionDir;
          writeFileSync(scene.bootMdPath, BOOT_V2);
          const revV2 = genActorBootRevision({
            actorDir: scene.actorDir,
          })!.revisionDir;
          writeFileSync(scene.bootMdPath, BOOT_V3);

          // a dir where the drift file belongs: no user, root included, can write it
          rmSync(join(revV1, 'CLAUDE.md'));
          mkdirSync(join(revV1, 'CLAUDE.md'));
          const drifts = setActorBootDrifts({
            actorDir: scene.actorDir,
            bootMdPathCurrent: scene.bootMdPath,
          });
          expect(drifts.revisions).toEqual(2);
          expect(drifts.rewritten).toEqual(1);
          expect(
            drifts.faults.map((fault) => [fault.revisionDir, fault.reason]),
          ).toEqual([
            [revV1, 'drift not written — its clones keep their prior drift'],
          ]);
          expect(readFileSync(join(revV2, 'CLAUDE.md'), 'utf8')).toContain(
            'noon',
          );
        },
      );
    });
  });

  given('[case5] clone refs the sweep cannot serve', () => {
    /**
     * .what = an actor with one revision on v1, a clone on it, and the boot moved to v2
     */
    const genActorWithCloneOnV1 = () => {
      const scene = genActorWithBoot({ boot: BOOT_V1 });
      const revision = genActorBootRevision({ actorDir: scene.actorDir })!;
      const cloneDir = join(
        scene.actorDir,
        'clones',
        'serial=0000aaaa-1111-2222-3333-444455556666',
      );
      mkdirSync(cloneDir, { recursive: true });
      writeFileSync(join(cloneDir, 'boot.spawned.ref'), `${revision.hash}\n`);
      writeFileSync(scene.bootMdPath, BOOT_V2);
      return { ...scene, revision, cloneDir };
    };

    when('[t0] a ref names a revision that was reaped', () => {
      then(
        'the sweep names the gone revision as a fault, and respawn as the cure',
        () => {
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
          const drifts = setActorBootDrifts({
            actorDir: scene.actorDir,
            bootMdPathCurrent: scene.bootMdPath,
          });
          expect(drifts.rewritten).toEqual(1);
          expect(drifts.clones).toEqual(1);
          expect(
            drifts.faults.map((fault) => [fault.revisionDir, fault.reason]),
          ).toEqual([
            [
              join(scene.actorDir, 'boots', 'sha256=ffffffffffffffff'),
              'is gone, yet a clone refers to it — respawn that clone',
            ],
          ]);
        },
      );
    });

    when('[t1] a ref cannot be read', () => {
      then(
        'the drifts are still written, and the unreadable ref is a fault with its path, never a throw',
        () => {
          const scene = genActorWithCloneOnV1();
          const refPath = join(scene.cloneDir, 'boot.spawned.ref');
          rmSync(refPath);
          mkdirSync(refPath);
          const drifts = setActorBootDrifts({
            actorDir: scene.actorDir,
            bootMdPathCurrent: scene.bootMdPath,
          });
          expect(drifts.rewritten).toEqual(1);
          expect(
            readFileSync(join(scene.revision.revisionDir, 'CLAUDE.md'), 'utf8'),
          ).toContain('paddle out at dusk');
          expect(drifts.faults).toHaveLength(1);
          expect(drifts.faults[0]!.revisionDir).toEqual(
            join(scene.actorDir, 'clones'),
          );
          expect(drifts.faults[0]!.reason).toContain(
            'a spawn ref could not be read',
          );
          expect(drifts.faults[0]!.reason).toContain(refPath);
        },
      );
    });
  });
});
