import {
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { delimiter, join } from 'node:path';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { envIsolated } from '@/blackbox/.test/infra/envIsolated';
import { getCachedClaudeCliBin } from '@/blackbox/.test/infra/genIsolatedClaudeHome';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { setupRoleFixtureRepo } from '@/blackbox/.test/infra/roleFixtureRepo';

jest.setTimeout(300_000);

/**
 * .what = every path under a dir, each with its bytes (a file) or a dir marker, sorted
 * .why = a byte-identical tree is the proof no write landed: a rename, a mkdir, or a rewrite each
 *   change it
 */
const asTreeFingerprint = (input: { dir: string }): string[] =>
  readdirSync(input.dir, { recursive: true })
    .map(String)
    .sort()
    .map((rel) => {
      const abs = join(input.dir, rel);
      return statSync(abs).isDirectory()
        ? `${rel}/`
        : `${rel} = ${readFileSync(abs, 'utf8')}`;
    });

/**
 * .what = the actors root of a repo
 */
const asActorsRootDir = (input: { dir: string }): string =>
  join(input.dir, '.agent', '.actors');

/**
 * .what = a repo with roles linked, one dir under it moved out of the repo by a link, then one
 *   `rhx enroll claude`
 * .why = each case varies which dir links out (the actors root, or the repo actor's own dir) and
 *   what the outside dir held before the enroll
 */
const genSceneEnrollWithDirLinkedOut = (input: {
  slug: string;
  seedOutside: (input: { outside: string }) => void;
  linkAt: (input: { dir: string }) => string;
}) => {
  const { binDir } = getCachedClaudeCliBin();
  const home = genTempDir({ slug: `${input.slug}-home` });
  mkdirSync(join(home, '.claude'), { recursive: true });
  const env = {
    ...envIsolated(home),
    PATH: `${binDir}${delimiter}${process.env.PATH ?? ''}`,
  };

  // a repo with roles linked, then its actors root moved out of the repo by a link
  const dir = genTempDir({ slug: `${input.slug}-repo` });
  setupRoleFixtureRepo({ dir });
  invokeRhachetCliBinary({
    args: ['init', '--roles', 'mechanic'],
    cwd: dir,
    env,
  });
  const outside = genTempDir({ slug: `${input.slug}-target` });
  input.seedOutside({ outside });
  const linked = input.linkAt({ dir });
  rmSync(linked, { recursive: true, force: true });
  symlinkSync(outside, linked);

  const outsideTreeBefore = asTreeFingerprint({ dir: outside });
  const result = invokeRhachetCliBinary({
    args: ['enroll', 'claude', '--model', 'haiku', '--await', '-p', 'reply ok'],
    cwd: dir,
    env,
    timeoutMs: 120_000,
    logOnError: false,
  });
  const outsideTreeAfter = asTreeFingerprint({ dir: outside });
  return { outside, outsideTreeBefore, outsideTreeAfter, result };
};

/**
 * .what = `rhx enroll` against a repo whose actors root links to a dir outside the repo
 * .why = rhachet never writes outside the repo. a clone cannot spawn without its brain dir, so
 *   where init skips such a dir with a warn, enroll refuses loud — before any write lands there
 */
describe('rhx enroll never writes outside the repo', () => {
  given('[case1] a repo whose .agent/.actors links to a dir outside the repo', () => {
    const scene = useBeforeAll(async () =>
      genSceneEnrollWithDirLinkedOut({
        slug: 'enroll-outside',
        seedOutside: () => undefined,
        linkAt: asActorsRootDir,
      }),
    );

    when('[t0] a clone is enrolled', () => {
      then('it refuses as a constraint, exit 2', () => {
        expect(scene.result.status).toEqual(2);
      });

      then('stderr names the refusal and the dir', () => {
        expect(scene.result.stderr).toContain(
          'ConstraintError: refused a write outside the repo',
        );
        expect(scene.result.stderr).toContain('.agent/.actors');
      });

      then('the outside dir stays empty', () => {
        expect(scene.outsideTreeAfter).toEqual([]);
      });

      then('no clone spawned', () => {
        expect(scene.result.stdout).not.toContain('clone enrolled');
        expect(scene.result.stderr).not.toContain('clone enrolled');
      });

      then('the stderr is locked', () => {
        expect(
          asSnapshotSafe(scene.result.stderr).split(scene.outside).join('/TMP_OUTSIDE'),
        ).toMatchSnapshot();
      });
    });
  });

  given(
    '[case2] the outside actors root holds a legacy repo actor dir, from before the rename',
    () => {
      const scene = useBeforeAll(async () =>
        genSceneEnrollWithDirLinkedOut({
          slug: 'enroll-outside-legacy',
          linkAt: asActorsRootDir,
          seedOutside: ({ outside }) => {
            const legacyBrainDir = join(
              outside,
              'actor.via.slug=.default',
              'brain',
              '.claude',
            );
            mkdirSync(legacyBrainDir, { recursive: true });
            writeFileSync(join(legacyBrainDir, 'keep.txt'), 'the human owns this\n');
          },
        }),
      );

      when('[t0] a clone is enrolled', () => {
        then('it refuses as a constraint, exit 2', () => {
          expect(scene.result.status).toEqual(2);
          expect(scene.result.stderr).toContain(
            'ConstraintError: refused a write outside the repo',
          );
        });

        then('the outside tree is byte-identical: no rename, no lock dir, no write', () => {
          expect(scene.outsideTreeBefore).toContain('actor.via.slug=.default/');
          expect(scene.outsideTreeAfter).toEqual(scene.outsideTreeBefore);
        });

        then('no clone spawned', () => {
          expect(scene.result.stdout).not.toContain('clone enrolled');
          expect(scene.result.stderr).not.toContain('clone enrolled');
        });

        then('the stderr is locked', () => {
          expect(
            asSnapshotSafe(scene.result.stderr)
              .split(scene.outside)
              .join('/TMP_OUTSIDE'),
          ).toMatchSnapshot();
        });
      });
    },
  );

  given(
    '[case3] the actors root stays inside, but the repo actor dir links outside the repo',
    () => {
      const scene = useBeforeAll(async () =>
        genSceneEnrollWithDirLinkedOut({
          slug: 'enroll-outside-actor',
          seedOutside: () => undefined,
          linkAt: ({ dir }) =>
            join(asActorsRootDir({ dir }), 'actor.via.repo=ambient'),
        }),
      );

      when('[t0] a bare clone is enrolled', () => {
        then('it refuses as a constraint, exit 2', () => {
          expect(scene.result.status).toEqual(2);
        });

        then("stderr names the refusal and the actor's brain dir", () => {
          expect(scene.result.stderr).toContain(
            'ConstraintError: refused a write outside the repo',
          );
          expect(scene.result.stderr).toContain(
            '.agent/.actors/actor.via.repo=ambient/brain/.claude',
          );
        });

        then('the outside dir stays empty: the refusal precedes the mkdir', () => {
          expect(scene.outsideTreeAfter).toEqual([]);
        });

        then('no clone spawned', () => {
          expect(scene.result.stdout).not.toContain('clone enrolled');
          expect(scene.result.stderr).not.toContain('clone enrolled');
        });

        then('the stderr is locked', () => {
          expect(
            asSnapshotSafe(scene.result.stderr)
              .split(scene.outside)
              .join('/TMP_OUTSIDE'),
          ).toMatchSnapshot();
        });
      });
    },
  );

  given(
    '[case4] the repo actor brain dir sits inside, but its settings.of.repo.json is a dir',
    () => {
      const scene = useBeforeAll(async () => {
        const { binDir } = getCachedClaudeCliBin();
        const home = genTempDir({ slug: 'enroll-repo-file-dir-home' });
        mkdirSync(join(home, '.claude'), { recursive: true });
        const env = {
          ...envIsolated(home),
          PATH: `${binDir}${delimiter}${process.env.PATH ?? ''}`,
        };

        // a repo with roles linked, then a dir laid where the one real file belongs
        const dir = genTempDir({ slug: 'enroll-repo-file-dir-repo' });
        setupRoleFixtureRepo({ dir });
        invokeRhachetCliBinary({
          args: ['init', '--roles', 'mechanic'],
          cwd: dir,
          env,
        });
        const pathRepoFile = join(
          asActorsRootDir({ dir }),
          'actor.via.repo=ambient',
          'brain',
          '.claude',
          'settings.of.repo.json',
        );
        rmSync(pathRepoFile, { recursive: true, force: true });
        mkdirSync(pathRepoFile);
        writeFileSync(join(pathRepoFile, 'keep.txt'), 'the human owns this\n');

        const result = invokeRhachetCliBinary({
          args: ['enroll', 'claude', '--model', 'haiku', '--await', '-p', 'reply ok'],
          cwd: dir,
          env,
          timeoutMs: 120_000,
          logOnError: false,
        });
        const treeAfter = asTreeFingerprint({ dir: pathRepoFile });
        return { dir, result, treeAfter };
      });

      when('[t0] a bare clone is enrolled', () => {
        then('it refuses as a constraint, exit 2', () => {
          expect(scene.result.status).toEqual(2);
        });

        then('stderr names the refusal, what it found, and the fix', () => {
          expect(scene.result.stderr).toContain(
            'ConstraintError: settings.of.repo.json must be a real file',
          );
          expect(scene.result.stderr).toContain('a dir');
          expect(scene.result.stderr).toContain(
            'rhachet derives it from the roles, so remove .agent/.actors/actor.via.repo=ambient/brain/.claude/settings.of.repo.json',
          );
        });

        then('the dir is untouched', () => {
          expect(scene.treeAfter).toEqual(['keep.txt = the human owns this\n']);
        });

        then('no clone spawned', () => {
          expect(scene.result.stdout).not.toContain('clone enrolled');
          expect(scene.result.stderr).not.toContain('clone enrolled');
        });

        then('the stderr is locked', () => {
          expect(
            asSnapshotSafe(scene.result.stderr).split(scene.dir).join('/TMP_REPO'),
          ).toMatchSnapshot();
        });
      });
    },
  );
});
