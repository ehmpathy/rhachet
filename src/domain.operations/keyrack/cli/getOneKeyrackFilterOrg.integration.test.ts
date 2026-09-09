import { ConstraintError } from 'helpful-errors';
import { getError, given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempDir } from '@src/.test/infra/genTestTempDir';

import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getOneKeyrackFilterOrg } from './getOneKeyrackFilterOrg';

/**
 * .what = the clamp for `an --org FILTER value is expanded before it is compared`
 * .why = a sweep verb compares the filter to a host slug's org segment, which is always
 *        LITERAL. `@this` is a sigil, so compared verbatim it matches zero slugs and renders
 *        an empty rack — which a human reads as "you have no repo keys", never as "that flag
 *        needed an expansion". a silent empty set is the hazard this operation exists to prevent
 *
 * .note = each case `git init`s its own temp dir, because the repo search walks UPWARD. a
 *         plain directory under __dirname sits INSIDE this worktree, so the search would climb
 *         out of the fixture and read rhachet's own manifest — the test would then assert
 *         against this repo's org and pass or fail for reasons it never meant to measure
 * .note = the `@all` rows are what tie this back to ehmpathy/rhachet#467: a machine-wide
 *         filter must touch NO gitroot and NO manifest, so it is answered without any repo
 */
describe('getOneKeyrackFilterOrg.integration', () => {
  const testDir = genTestTempDir({
    base: __dirname,
    name: 'getOneKeyrackFilterOrg',
  });

  beforeAll(() => testDir.setup());
  afterAll(() => testDir.teardown());

  given('[case1] a filter that names no repo', () => {
    when('[t0] the flag is absent', () => {
      then('there is no filter', async () => {
        expect(
          await getOneKeyrackFilterOrg({ org: null, from: testDir.path }),
        ).toEqual(null);
      });
    });

    when('[t1] the flag is @all', () => {
      // .why = the #467 invariant, at the filter grain. a machine-wide ask reads no repo
      then('it passes through, with no repo read', async () => {
        expect(
          await getOneKeyrackFilterOrg({ org: '@all', from: testDir.path }),
        ).toEqual('@all');
      });
    });

    when('[t2] the flag is a literal org name', () => {
      then('it passes through unchanged', async () => {
        expect(
          await getOneKeyrackFilterOrg({ org: 'ehmpathy', from: testDir.path }),
        ).toEqual('ehmpathy');
      });
    });
  });

  given('[case2] a repo that declares an org', () => {
    const scene = useBeforeAll(async () => {
      const gitroot = join(testDir.path, 'case2');
      mkdirSync(join(gitroot, '.agent'), { recursive: true });
      execSync('git init -q', { cwd: gitroot });
      writeFileSync(
        join(gitroot, '.agent', 'keyrack.yml'),
        `org: testorg
env.prep:
  - REPO_KEY
`,
      );
      return { gitroot };
    });

    when('[t0] the flag is @this — THE EXPANSION', () => {
      then('it becomes the manifest org, never the literal sigil', async () => {
        const filterOrg = await getOneKeyrackFilterOrg({
          org: '@this',
          from: scene.gitroot,
        });

        // the whole point: a host slug carries `testorg`, never `@this`. an unexpanded
        // sigil here would match zero slugs and render an empty rack
        expect(filterOrg).toEqual('testorg');
        expect(filterOrg).not.toEqual('@this');
      });
    });
  });

  given('[case3] a repo with no keyrack.yml to name', () => {
    const scene = useBeforeAll(async () => {
      const gitroot = join(testDir.path, 'case3');
      mkdirSync(gitroot, { recursive: true });
      execSync('git init -q', { cwd: gitroot });
      return { gitroot };
    });

    when('[t0] the flag is @this — THE GUARD', () => {
      // .why = fail loud, never yield an empty rack. `@this` names a repo manifest that is
      //        not there, so the caller has a fixable mistake and is owed the fix by name
      then('it throws a ConstraintError that names the fix', async () => {
        const error = await getError(
          getOneKeyrackFilterOrg({ org: '@this', from: scene.gitroot }),
        );

        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('@this');
      });
    });

    when('[t1] the flag is @all from that same repo', () => {
      // .why = the contrast row. the SAME manifest-less repo that refuses `@this` must serve
      //        `@all` without complaint — a machine-wide filter needs no manifest, ever
      then('it passes through, with no throw', async () => {
        expect(
          await getOneKeyrackFilterOrg({ org: '@all', from: scene.gitroot }),
        ).toEqual('@all');
      });
    });
  });
});
