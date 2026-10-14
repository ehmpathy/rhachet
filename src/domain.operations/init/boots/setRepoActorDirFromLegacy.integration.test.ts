import {
  genTempDir,
  getError,
  given,
  then,
  useBeforeAll,
  when,
} from 'test-fns';

import type * as NodeFs from 'node:fs';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { setRepoActorDirFromLegacy } from './setRepoActorDirFromLegacy';

/**
 * .mock = node:fs `renameSync`, wrapped; every call delegates to the real rename by default,
 *         and only [case4] and [case5] swap ONE call, still made against the real fs
 * .why = the race these cases prove lives between the operation's probe and its rename — a
 *        window of microseconds. two real processes cannot be made to land a peer's move
 *        inside it on demand, so a real race would pass or fail by luck. the swap makes the
 *        peer's move happen at that exact point, and the error the operation then meets is a
 *        genuine ENOENT minted by the fs, never a fabricated one. (a spy on `import * as fs`
 *        patches an interop copy the operation never reads, so the module is wrapped whole)
 * .real = [case1], [case2] and [case3] in this file run against the real fs with no swap
 *         ([case1] moves the dir with the real rename); the blackbox `upgrade.default-actor-migration.journey` and `enroll` [case2d]
 *         drive the same move through the cli with no mock at all
 */
jest.mock('node:fs', () => {
  const actual = jest.requireActual('node:fs');
  return { ...actual, renameSync: jest.fn(actual.renameSync) };
});
const fsActual = jest.requireActual<typeof NodeFs>('node:fs');

const ACTORS_REL = '.agent/.actors';
const LEGACY_REL = `${ACTORS_REL}/actor.via.slug=.default`;
const CURRENT_REL = `${ACTORS_REL}/actor.via.repo=ambient`;

/**
 * .what = a fresh repo dir
 */
const genRepoPath = (input: { slug: string }): string =>
  realpathSync(genTempDir({ slug: input.slug }));

describe('setRepoActorDirFromLegacy', () => {
  given('[case1] only the legacy repo actor dir exists', () => {
    const scene = useBeforeAll(async () => {
      const repoPath = genRepoPath({ slug: 'repo-actor-legacy-only' });
      mkdirSync(join(repoPath, LEGACY_REL, 'brain', '.claude'), {
        recursive: true,
      });
      writeFileSync(
        join(repoPath, LEGACY_REL, 'brain', '.claude', 'AGENTS.md'),
        '@boot.md\n',
      );
      const result = setRepoActorDirFromLegacy({ repoPath });
      return { repoPath, result };
    });

    when('[t0] the legacy dir is carried over', () => {
      then('it moves to the current name, contents intact', () => {
        expect(scene.result.effect).toEqual('MOVED');
        expect(existsSync(join(scene.repoPath, LEGACY_REL))).toBe(false);
        expect(
          readFileSync(
            join(scene.repoPath, CURRENT_REL, 'brain', '.claude', 'AGENTS.md'),
            'utf8',
          ),
        ).toEqual('@boot.md\n');
      });
    });

    when('[t1] it runs again', () => {
      const rerun = useBeforeAll(async () =>
        setRepoActorDirFromLegacy({ repoPath: scene.repoPath }),
      );

      then('there is no legacy dir left to move', () => {
        expect(rerun.effect).toEqual('ABSENT');
      });
    });
  });

  given('[case2] both the legacy and the current repo actor dirs exist', () => {
    const scene = useBeforeAll(async () => {
      const repoPath = genRepoPath({ slug: 'repo-actor-legacy-and-current' });
      mkdirSync(join(repoPath, LEGACY_REL), { recursive: true });
      mkdirSync(join(repoPath, CURRENT_REL), { recursive: true });
      writeFileSync(join(repoPath, CURRENT_REL, 'live.md'), 'live\n');
      const result = setRepoActorDirFromLegacy({ repoPath });
      return { repoPath, result };
    });

    when('[t0] the legacy dir is considered', () => {
      then('the current dir wins, and both are left in place', () => {
        expect(scene.result.effect).toEqual('SKIPPED');
        expect(existsSync(join(scene.repoPath, LEGACY_REL))).toBe(true);
        expect(
          readFileSync(join(scene.repoPath, CURRENT_REL, 'live.md'), 'utf8'),
        ).toEqual('live\n');
      });
    });
  });

  given('[case4] a peer `rhx init` moves the legacy dir first', () => {
    const scene = useBeforeAll(async () => {
      const repoPath = genRepoPath({ slug: 'repo-actor-peer-moved' });
      mkdirSync(join(repoPath, LEGACY_REL), { recursive: true });
      writeFileSync(join(repoPath, LEGACY_REL, 'AGENTS.md'), '@boot.md\n');

      // the peer's move lands between this call's probe and its rename, so this call's own
      //   rename meets a source already gone — a genuine ENOENT from the fs
      jest.mocked(renameSync).mockImplementationOnce((from, to) => {
        fsActual.renameSync(from, to);
        fsActual.renameSync(from, to);
      });
      const result = setRepoActorDirFromLegacy({ repoPath });
      return { repoPath, result };
    });

    when('[t0] this call reaches its rename', () => {
      then('it reads as SKIPPED, and the peer move stands', () => {
        expect(scene.result.effect).toEqual('SKIPPED');
        expect(existsSync(join(scene.repoPath, LEGACY_REL))).toBe(false);
        expect(
          readFileSync(join(scene.repoPath, CURRENT_REL, 'AGENTS.md'), 'utf8'),
        ).toEqual('@boot.md\n');
      });
    });
  });

  given(
    '[case5] a rename fails with ENOENT while the legacy dir remains',
    () => {
      const scene = useBeforeAll(async () => {
        const repoPath = genRepoPath({ slug: 'repo-actor-enoent-unexplained' });
        mkdirSync(join(repoPath, LEGACY_REL), { recursive: true });
        jest
          .mocked(renameSync)
          .mockImplementationOnce((from, to) =>
            fsActual.renameSync(`${String(from)}.absent`, to),
          );
        const error = await getError(() =>
          setRepoActorDirFromLegacy({ repoPath }),
        );
        return { repoPath, error };
      });

      when('[t0] this call reaches its rename', () => {
        then('the fault is thrown — no peer move explains it', () => {
          expect((scene.error as NodeJS.ErrnoException).code).toEqual('ENOENT');
          expect(existsSync(join(scene.repoPath, LEGACY_REL))).toBe(true);
        });
      });
    },
  );

  given('[case3] no repo actor dir exists at all', () => {
    const scene = useBeforeAll(async () => {
      const repoPath = genRepoPath({ slug: 'repo-actor-none' });
      const result = setRepoActorDirFromLegacy({ repoPath });
      return { repoPath, result };
    });

    when('[t0] the legacy dir is considered', () => {
      then('there is no legacy dir to move, and no dir is made', () => {
        expect(scene.result.effect).toEqual('ABSENT');
        expect(existsSync(join(scene.repoPath, CURRENT_REL))).toBe(false);
      });
    });
  });
});
