import { genTempDir, getError, given, then, when } from 'test-fns';

import { asBootContentHash } from '@src/domain.operations/boot/asBootContentHash';
import { delActorBootRevision } from '@src/domain.operations/boot/delActorBootRevision';
import { getActorBootCurrentPath } from '@src/domain.operations/boot/getActorBootCurrentPath';
import { getActorBootRevisionPaths } from '@src/domain.operations/boot/getActorBootRevisionPaths';

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { getAllBootRevisionsUnreferenced } from './getAllBootRevisionsUnreferenced';
import { CLONE_BOOT_SPAWNED_REF_FILENAME } from './setCloneBootSpawnedRef';

/**
 * .what = an actor dir on disk: a current boot, revisions by bytes, and clones by the ref each holds
 */
const genActorScene = (input: {
  slug: string;
  bootCurrent: string;
  revisions: string[];
  clones: { serial: string; ref: string | null }[];
}): { actorDir: string; hashOf: (bytes: string) => string } => {
  const actorDir = join(genTempDir({ slug: input.slug }), 'actor.via.hash=abc');

  // the boot the actor holds now
  const bootCurrentPath = getActorBootCurrentPath({ actorDir });
  mkdirSync(dirname(bootCurrentPath), { recursive: true });
  writeFileSync(bootCurrentPath, input.bootCurrent);

  // each revision, by the hash of its bytes
  input.revisions.forEach((bytes) => {
    const paths = getActorBootRevisionPaths({
      actorDir,
      hash: asBootContentHash({ bytes }),
    });
    mkdirSync(paths.dir, { recursive: true });
    writeFileSync(paths.bootMd, bytes);
    writeFileSync(paths.driftMd, '');
  });

  // each clone, with the ref it holds (null = a clone from before boot drift)
  input.clones.forEach((clone) => {
    const cloneDir = join(actorDir, 'clones', `serial=${clone.serial}`);
    mkdirSync(cloneDir, { recursive: true });
    if (clone.ref !== null)
      writeFileSync(
        join(cloneDir, CLONE_BOOT_SPAWNED_REF_FILENAME),
        `${clone.ref}\n`,
      );
  });

  return { actorDir, hashOf: (bytes) => asBootContentHash({ bytes }) };
};

describe('getAllBootRevisionsUnreferenced', () => {
  given('[case1] three old revisions and the current one', () => {
    const v1 = 'boot v1\n';
    const v2 = 'boot v2\n';
    const v3 = 'boot v3\n';
    const vNow = 'boot now\n';
    const scene = genActorScene({
      slug: 'unreferenced-case1',
      bootCurrent: vNow,
      revisions: [v1, v2, v3, vNow],
      clones: [
        { serial: 'stays-on-v1', ref: asBootContentHash({ bytes: v1 }) },
        { serial: 'reaped-on-v2', ref: asBootContentHash({ bytes: v2 }) },
        { serial: 'from-before', ref: null },
      ],
    });

    // read once, before any revision is reaped: [t0] asserts on it and [t2] reaps it
    const hashesOnReapOfV2 = getAllBootRevisionsUnreferenced({
      actorDir: scene.actorDir,
      serialsReaped: ['reaped-on-v2'],
    });

    when('[t0] the prune reaps the clone on v2', () => {
      const hashes = hashesOnReapOfV2;

      then('v2 and v3 are returned: no clone that stays refers to them', () => {
        expect([...hashes].sort()).toEqual(
          [scene.hashOf(v2), scene.hashOf(v3)].sort(),
        );
      });

      then('v1 stays: a clone that stays refers to it', () => {
        expect(hashes).not.toContain(scene.hashOf(v1));
      });

      then(
        "the current boot's revision stays, though no clone refers to it",
        () => {
          expect(hashes).not.toContain(scene.hashOf(vNow));
        },
      );
    });

    when('[t1] the prune reaps no clone', () => {
      const hashes = getAllBootRevisionsUnreferenced({
        actorDir: scene.actorDir,
        serialsReaped: [],
      });

      then('only v3 is returned: the clone on v2 still refers to it', () => {
        expect(hashes).toEqual([scene.hashOf(v3)]);
      });
    });

    when('[t2] the returned revisions are reaped', () => {
      hashesOnReapOfV2.forEach((hash) =>
        delActorBootRevision({ actorDir: scene.actorDir, hash }),
      );

      then('their dirs are gone and the kept ones remain', () => {
        const dirOf = (bytes: string) =>
          getActorBootRevisionPaths({
            actorDir: scene.actorDir,
            hash: scene.hashOf(bytes),
          }).dir;
        expect(existsSync(dirOf(v2))).toBe(false);
        expect(existsSync(dirOf(v3))).toBe(false);
        expect(existsSync(dirOf(v1))).toBe(true);
        expect(existsSync(dirOf(vNow))).toBe(true);
      });

      then('a second reap of the same hash is a no-op', () => {
        expect(() =>
          delActorBootRevision({
            actorDir: scene.actorDir,
            hash: scene.hashOf(v2),
          }),
        ).not.toThrow();
      });
    });
  });

  given('[case2] an actor with no boots dir', () => {
    const scene = genActorScene({
      slug: 'unreferenced-case2',
      bootCurrent: 'boot\n',
      revisions: [],
      clones: [],
    });

    when('[t0] the unreferenced set is read', () => {
      then('it is empty', () => {
        expect(
          getAllBootRevisionsUnreferenced({
            actorDir: scene.actorDir,
            serialsReaped: [],
          }),
        ).toEqual([]);
      });
    });
  });

  given('[case3] a clone whose ref cannot be read', () => {
    const scene = genActorScene({
      slug: 'unreferenced-case3',
      bootCurrent: 'boot now\n',
      revisions: ['boot old\n'],
      clones: [],
    });
    // a dir where the ref file should be: the read fails, never a guess
    mkdirSync(
      join(
        scene.actorDir,
        'clones',
        'serial=broken',
        CLONE_BOOT_SPAWNED_REF_FILENAME,
      ),
      { recursive: true },
    );

    when('[t0] the unreferenced set is read', () => {
      then(
        'it fails loud, so a prune that cannot read a ref reaps none',
        async () => {
          const error = await getError(async () =>
            getAllBootRevisionsUnreferenced({
              actorDir: scene.actorDir,
              serialsReaped: [],
            }),
          );
          expect(error.message).toContain(CLONE_BOOT_SPAWNED_REF_FILENAME);
        },
      );
    });
  });
});
