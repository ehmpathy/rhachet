import { ConstraintError } from 'helpful-errors';
import { getError, given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempDirNonRepo } from '@src/.test/infra/genTestTempDirNonRepo';
import { withTempHome } from '@src/.test/infra/withTempHome';

import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getOneKeyrackRepoScopeForAsk } from './getOneKeyrackRepoScopeForAsk';

/**
 * .what = the clamp for the TWO axes this operation decides
 * .why = one operation now serves three cli verbs, and it answers two separate questions.
 *        each axis fails SILENTLY in one direction, so a branch test alone cannot hold it:
 *
 *        | axis | the question | a wrong answer looks like |
 *        |---|---|---|
 *        | is a manifest owed? | does this ask consult a repo keyrack.yml? | a throw for a key that needs none, OR a skipped guard |
 *        | what does no repo mean? | refuse the ask, or narrow it? | a refused credential path, OR a mutation against a manifest it never had |
 *
 * .note = the `onNoRepo` axis is the one a cli clamp cannot reach cheaply: a bare `unlock` from
 *         a non-repo cwd needs a host manifest to get far enough to prove the tolerance, and
 *         that setup would test the host manifest rather than this decision
 */
describe('getOneKeyrackRepoScopeForAsk.integration', () => {
  const tempHome = withTempHome({ name: 'getOneKeyrackRepoScopeForAsk' });

  beforeAll(() => {
    tempHome.setup();
  });

  afterAll(() => {
    tempHome.teardown();
  });

  given('[case1] a cwd that is NOT a git repo — the onNoRepo axis', () => {
    // ⚠️ .why = `genTestTempDir` roots under `__dirname`, which IS inside this repo — so a real
    //        `git rev-parse` from there walks UP and finds this worktree's own root. a clamp
    //        built on it reads a gitroot on every row, and so asserts none of the no-repo axis.
    //        `genTestTempDirNonRepo` roots in os.tmpdir(), outside any repo, which is the only
    //        place the absent-gitroot branch actually runs
    const scene = useBeforeAll(async () => ({
      notARepo: genTestTempDirNonRepo({ label: 'keyrack-scope-norepo' }).path,
    }));

    when('[t0] a keyed MUTATION asks (onNoRepo: refuse)', () => {
      // ⚠️ .why = the error is held INSIDE an object rather than returned bare. `useBeforeAll`
      //        yields a lazy proxy, and a proxy over an Error reports its own prototype — so a
      //        bare return makes `toBeInstanceOf(ConstraintError)` read `Object` and
      //        `JSON.stringify` read `{}`, which fails an assert that the code satisfies. one
      //        level of nesting hands the get-trap the real error
      const scope = useBeforeAll(async () => ({
        error: await getError(
          getOneKeyrackRepoScopeForAsk({
            for: { keys: ['__TEST_REPO_KEY__'] },
            org: null,
            from: scene.notARepo,
            onNoRepo: 'refuse',
          }),
        ),
      }));

      then('it refuses as a named CONSTRAINT, never a raw git throw', () => {
        // ⚠️ .why = the raw form (`BadRequestError: Not inside a Git repository`) reaches the
        //          top-level catch and prints a node stack trace. exit 1 for what a caller can fix
        expect(scope.error).toBeInstanceOf(ConstraintError);
        expect(scope.error.message).toContain('not a git repo');
      });

      then('the refusal names the fix, never only the symptom', () => {
        expect(JSON.stringify(scope.error)).toContain('--org @all');
      });
    });

    when('[t1] a SWEEP asks (onNoRepo: tolerate) — THE TOLERANCE', () => {
      // ⚠️ .why = `unlock` from a non-repo cwd is the bootstrap-to-clone credential path: the
      //        github-app install token is vaulted under `@all` precisely so it can be fetched
      //        before any repo is cloned. a refusal here breaks a path that works today
      then('it yields a null scope rather than a throw', async () => {
        const scope = await getOneKeyrackRepoScopeForAsk({
          for: null,
          org: null,
          from: scene.notARepo,
          onNoRepo: 'tolerate',
        });
        expect(scope.gitroot).toEqual(null);
        expect(scope.repoManifest).toEqual(null);
      });
    });

    when('[t2] a MACHINE-WIDE ask reaches the refuse path — THE GUARD', () => {
      // .why = `onNoRepo: 'refuse'` must not refuse an ask that needs no repo at all. were the
      //        refusal keyed on the gitroot alone, this row would throw
      then('it is served, because it consults no repo', async () => {
        const scope = await getOneKeyrackRepoScopeForAsk({
          for: { keys: ['@all.camp.__TEST_MACHINE_KEY__'] },
          org: null,
          from: scene.notARepo,
          onNoRepo: 'refuse',
        });
        expect(scope.gitroot).toEqual(null);
        expect(scope.repoManifest).toEqual(null);
      });
    });
  });

  given(
    '[case2] a repo whose keyrack.yml cannot hydrate — the manifest axis',
    () => {
      // ⚠️ .why = the manifest axis needs a REAL gitroot, and it must be THIS dir rather than the
      //        worktree above it — `getGitRepoRootOrNull` shells out to `git rev-parse`, so a dir
      //        inside this repo resolves to this repo's own root and reads this repo's own
      //        keyrack.yml. the broken fixture below would then never be the file under test
      const scene = useBeforeAll(async () => {
        const gitroot = genTestTempDirNonRepo({
          label: 'keyrack-scope-brokenmanifest',
        }).path;
        execSync('git init', { cwd: gitroot, stdio: 'ignore' });
        mkdirSync(join(gitroot, '.agent'), { recursive: true });
        writeFileSync(
          join(gitroot, '.agent', 'keyrack.yml'),
          `org: testorg

extends:
  - .agent/repo=absent/role=absent/keyrack.yml

env.prep:
  - __TEST_REPO_KEY__
`,
        );
        return { gitroot };
      });

      when(
        '[t0] the ask names a machine-wide key by its @all. prefix alone',
        () => {
          // ⚠️ .why = no `--org` flag at all. the prefix is the ONLY signal, so a fix that read the
          //        flag and not the slug would pass every `--org @all` row and fail this one
          then(
            'the manifest is never loaded, so the ask is served',
            async () => {
              const scope = await getOneKeyrackRepoScopeForAsk({
                for: { keys: ['@all.camp.__TEST_MACHINE_KEY__'] },
                org: null,
                from: scene.gitroot,
                onNoRepo: 'refuse',
              });
              expect(scope.repoManifest).toEqual(null);
            },
          );
        },
      );

      when(
        '[t1] the ask names a machine-wide key by the --org @all flag',
        () => {
          then('the two spellings agree', async () => {
            const scope = await getOneKeyrackRepoScopeForAsk({
              for: { keys: ['__TEST_MACHINE_KEY__'] },
              org: '@all',
              from: scene.gitroot,
              onNoRepo: 'refuse',
            });
            expect(scope.repoManifest).toEqual(null);
          });
        },
      );

      when('[t2] the ask is repo-scoped — THE GUARD', () => {
        // .why = this wish narrows WHEN the manifest loads, never HOW it fails. an ask that DOES
        //        consult the manifest must still throw loud on the same broken file
        then(
          'it still throws, and the throw names the absent target',
          async () => {
            const error = await getError(
              getOneKeyrackRepoScopeForAsk({
                for: { keys: ['__TEST_REPO_KEY__'] },
                org: null,
                from: scene.gitroot,
                onNoRepo: 'refuse',
              }),
            );
            expect(error.message).toContain('repo=absent');
          },
        );
      });

      when('[t3] a SWEEP asks from the same repo — THE GUARD', () => {
        // .why = `tolerate` softens the ABSENT-gitroot case only. with a gitroot present and a
        //        repo-scoped ask, a sweep owes the manifest exactly as a mutation does
        then(
          'tolerance does not soften a manifest that cannot load',
          async () => {
            const error = await getError(
              getOneKeyrackRepoScopeForAsk({
                for: null,
                org: null,
                from: scene.gitroot,
                onNoRepo: 'tolerate',
              }),
            );
            expect(error.message).toContain('repo=absent');
          },
        );
      });
    },
  );
});
