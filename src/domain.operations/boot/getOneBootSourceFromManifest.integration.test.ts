import { getError, given, then, useThen, when } from 'test-fns';

import { asSnapshotSafe as asMaskedPaths } from '@src/.test/infra/asSnapshotSafe';
import { getOneGitRepoRootSync } from '@src/infra/git/getOneGitRepoRootSync';

import { mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getOneBootSourceFromManifest } from './getOneBootSourceFromManifest';

/**
 * .what = masks the temp dir and the repo root — the refusal quotes the bound it checked
 */
const asSnapshotSafe = (input: {
  of: string;
  testDir: string;
  repoRoot: string;
}): string =>
  asMaskedPaths({
    of: input.of,
    masks: [
      { path: input.testDir, into: '/TMP_REPO' },
      { path: input.repoRoot, into: '/REPO_ROOT' },
    ],
  });

/**
 * .what = clamps the manifest arm's own guarantees — the boundary, the file guard, the offer
 * .why = this arm reads `statSync` and the git root, so it is an integration test by
 *        definition (`rule.forbid.unit.remote-boundaries`). these messages are the caller's
 *        whole recovery path, and a `toContain` assertion shows a reviewer no part of what
 *        they say (`rule.require.errors-name-the-fix`).
 *
 * 🔴 .note = it is the arm's OWN file. in a shared body whose other two arms are separately
 *   under edit, an invariant repaired on a peer is re-reviewed here rather than re-tested.
 */
describe('getOneBootSourceFromManifest (integration)', () => {
  const testDir = resolve(__dirname, './.temp/getOneBootSourceFromManifest');

  // the bound the guard actually checks — an ancestor of `testDir`, so the two masks nest
  // and their substitution order matters (see `asSnapshotSafe`)
  const repoRoot = getOneGitRepoRootSync({ from: testDir }) ?? testDir;

  beforeAll(() => {
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(testDir, { recursive: true });
  });

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  given('[case1] a manifest path that reaches outside the repo', () => {
    /**
     * .what = a `..` chain long enough to climb past the filesystem root
     * .why = the escape must be true on ANY checkout, at any depth. a fixed `../../` is an
     *        escape only from a dir that sits exactly two levels under the bound — and under
     *        the repo-root bound it escapes no checkout at all, since a repo is deeper than
     *        two levels. an absolute path clamps at `/`, so a surplus of `..` lands at a
     *        fictive `/outside-the-repo` wherever the test runs — it names no host path.
     */
    const pathEscaped = `${'../'.repeat(40)}outside-the-repo/boot.yml`;

    when('[t0] the source is looked up', () => {
      then('it refuses before any read, and names the bound it checked', () => {
        const error = getError(() =>
          getOneBootSourceFromManifest({ path: pathEscaped, cwd: testDir }),
        );

        expect(error).toBeDefined();
        expect(
          asSnapshotSafe({ of: error!.message, testDir, repoRoot }),
        ).toMatchSnapshot();
      });
    });
  });

  /**
   * .what = a manifest that escapes the caller's cwd but stays inside the repo — the
   *   boundary check is repo-anchored, never cwd-anchored, so the lookup succeeds
   *   regardless of where the caller stood
   */
  given(
    '[case2] a manifest that escapes the cwd but stays inside the repo',
    () => {
      const dirDeep = resolve(testDir, 'deep');
      const pathToSpec = resolve(testDir, 'boot.yml');
      const inputFromDeep = { path: '../boot.yml', cwd: dirDeep };

      beforeAll(() => {
        mkdirSync(dirDeep, { recursive: true });
        writeFileSync(pathToSpec, 'always:\n  briefs:\n    say: []\n', 'utf-8');
      });

      when(
        '[t0] the caller runs from a subdirectory and names it `../boot.yml`',
        () => {
          // ONE lookup, three facets — one read serves every then below
          const source = useThen('the source resolves', () =>
            getOneBootSourceFromManifest(inputFromDeep),
          );

          then('it is accepted — the path never left the repo', () => {
            expect(source.pathToSpec).toEqual(pathToSpec);
          });

          // 🔴 the parity line against the role arm. a route dir has no
          //    `briefs/` subdir, so the whole `rootDir` is the universe — a `briefs/`
          //    requirement here would render the vision's own worked manifest empty
          then(
            'the brief universe is the whole dir, never a `briefs/` subdir',
            () => {
              expect(source.dirBriefs).toEqual(null);
            },
          );

          // 🔴 the caller NAMED this path and the `isFile()` guard proved a file sat there,
          //    so a downstream absence is a vanish race rather than a say-all fallback
          then('the spec IS declared — the caller named the path', () => {
            expect(source.specIsDeclared).toEqual(true);
          });

          // 🔴 the label feeds every rendered `path=` prefix, so it anchors on the repo root:
          //    the same manifest, looked up from the repo dir, must label its resources alike
          then('the label anchors on the repo root, never on the cwd', () => {
            const sourceFromTop = getOneBootSourceFromManifest({
              path: 'boot.yml',
              cwd: testDir,
            });
            expect(source.label).toEqual({ base: repoRoot, prefix: '' });
            expect(source.label).toEqual(sourceFromTop.label);
          });
        },
      );
    },
  );

  given('[case3] a manifest path that points at a DIRECTORY', () => {
    when('[t0] the source is looked up', () => {
      then('it refuses, and says what it found instead of a file', () => {
        mkdirSync(resolve(testDir, 'not-a-spec'), { recursive: true });

        const error = getError(() =>
          getOneBootSourceFromManifest({ path: 'not-a-spec', cwd: testDir }),
        );

        expect(error).toBeDefined();
        expect(
          asSnapshotSafe({ of: error!.message, testDir, repoRoot }),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case4] a manifest path one edit away from an extant spec', () => {
    /**
     * 🔴 .why = this halt offers the nearest extant match, when one is close. a typo is the
     *   commonest way a caller reaches this line, so the offer is what parts a refusal from
     *   a repair.
     *
     * 🟡 the two `when`s are a PAIR, and the second carries most of the weight. an offer that
     *   always fires is worse than none — it spends the caller's attention on a path they
     *   never meant. so the clamp grades the THRESHOLD, never merely the feature: `[t0]` says
     *   a close neighbor is offered, `[t1]` says a distant one is withheld. a build that
     *   offered every `.yml` in the dir would pass `[t0]` alone
     *   (`rule.require.clamp-edge-cases`: a clamp with no teeth is a claim that looks like a
     *   proof).
     */
    const dirNear = resolve(testDir, 'near');

    beforeAll(() => {
      mkdirSync(dirNear, { recursive: true });
      writeFileSync(resolve(dirNear, 'boot.yml'), 'briefs:\n  say: []\n');
      writeFileSync(
        resolve(dirNear, 'completely-unrelated.yml'),
        'briefs:\n  say: []\n',
      );
    });

    when('[t0] the typo is ONE edit from an extant spec', () => {
      const refusal = useThen('it refuses', () => {
        const error = getError(() =>
          // `boot.yaml` → `boot.yml` is one deletion
          getOneBootSourceFromManifest({
            path: 'near/boot.yaml',
            cwd: testDir,
          }),
        );
        expect(error).toBeDefined();
        return { message: error!.message };
      });

      then('it OFFERS the neighbor it found', () => {
        expect(refusal.message).toContain('didYouMean');
        expect(refusal.message).toContain('boot.yml');

        // 🟡 the paired negative: a near-match must never pull in a distant peer that
        //   happens to share the directory
        expect(refusal.message).not.toContain('completely-unrelated.yml');
      });

      /**
       * 🟡 a caller who meant a role rather than a manifest is told of the other arm.
       */
      then('it names the ALTERNATIVE — a role boot', () => {
        expect(refusal.message).toContain('--repo');
        expect(refusal.message).toContain('--role');
      });
    });

    when('[t1] the typo is FAR from every extant spec', () => {
      then('it refuses with NO offer — a weak one is worse than none', () => {
        /**
         * 🔴 the row with the teeth. `zzz.yml` is many edits from both files in the dir, so
         *   an offer here would be noise the caller must evaluate and reject.
         */
        const error = getError(() =>
          getOneBootSourceFromManifest({ path: 'near/zzz.yml', cwd: testDir }),
        );

        expect(error).toBeDefined();
        expect(error!.message).toContain('--what points at no file');
        expect(error!.message).not.toContain('didYouMean');
      });
    });
  });

  /**
   * .why = `throwIfNoEntry: false` suppresses an ABSENCE. every other fs fault still throws from
   *   `statSync`, so a caller-fixable errno must be classified explicitly rather than left to
   *   reach a raw node `Error`, which carries no exit classification
   *   (`rule.require.exit-code-semantics`).
   *
   * .note = the fixture is `ELOOP`: `statSync` throws it on every uid, where `ENOTDIR` reads as
   *   an absence and `EACCES` is bypassed by root (`define.statsync-and-lstatsync-suppress-different-errnos`).
   *
   * .note = not graded here: a fault outside the set (`EIO`, `ENOMEM`) that reaches the caller
   *   unwrapped. `statSync` binds at import, so no spy reaches it; that half is left to review.
   */
  given('[case5] a manifest path that walks a symlink cycle', () => {
    beforeAll(() => {
      // a two-link cycle: A → B → A. the kernel gives up at its hop limit and raises `ELOOP`
      const pathA = resolve(testDir, 'loopA');
      const pathB = resolve(testDir, 'loopB');
      rmSync(pathA, { force: true });
      rmSync(pathB, { force: true });
      symlinkSync(pathB, pathA);
      symlinkSync(pathA, pathB);
    });

    when('[t0] the walk faults with a caller-fixable errno', () => {
      const refusal = useThen('it refuses', () => {
        const error = getError(() =>
          getOneBootSourceFromManifest({ path: 'loopA', cwd: testDir }),
        );
        expect(error).toBeDefined();
        return { name: error!.constructor.name, message: error!.message };
      });

      then('it is a CONSTRAINT — never a malfunction', () => {
        // 🔴 the teeth: a bare `Error` off `statSync` here would report a caller-fixable
        //    errno as a malfunction
        expect(refusal.name).toEqual('ConstraintError');
        expect(refusal.message).toContain('--what is not a readable path');
      });

      then('it names the errno, and the fix that errno implies', () => {
        // a caller cannot act on "it failed"; they can act on "it walks a symlink cycle"
        expect(refusal.message).toContain('ELOOP');
        expect(refusal.message).toContain('symlink cycle');
      });

      then('the refusal matches its snapshot', () => {
        expect(
          asSnapshotSafe({ of: refusal.message, testDir, repoRoot }),
        ).toMatchSnapshot();
      });
    });
  });
});
