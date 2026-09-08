import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempDir } from '@src/.test/infra/genTestTempDir';
import { withTempHome } from '@src/.test/infra/withTempHome';

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { genContextKeyrackGrantGet } from './genContextKeyrackGrantGet';

/**
 * .what = the clamp for `an @all read must not load a repo manifest it never consults`
 * .why = ehmpathy/rhachet#467. a repo manifest that cannot hydrate used to kill a read that
 *        never needed it, because the load branched on "is there a repo?" rather than on
 *        "will this ask consult one?"
 *
 * .note = the GUARD row of each case is what gives this clamp teeth. a repo-scoped ask must
 *         STILL throw loud on the same broken manifest — this wish narrows WHEN the manifest
 *         loads, never HOW it fails
 * .note = two throw modes are covered (a broken `extends`, and invalid yaml) because the class
 *         is "a manifest that cannot load", not a defect of `extends` alone. a fix that
 *         special-cased `extends` would pass a one-mode clamp and still be the wrong fix
 */
describe('genContextKeyrackGrantGet.integration', () => {
  const tempHome = withTempHome({ name: 'genContextKeyrackGrantGet' });
  const testDir = genTestTempDir({
    base: __dirname,
    name: 'genContextKeyrackGrantGet',
  });

  beforeAll(() => {
    tempHome.setup();
    testDir.setup();
  });

  afterAll(() => {
    testDir.teardown();
    tempHome.teardown();
  });

  given('[case1] a repo manifest whose `extends` target is absent', () => {
    const scene = useBeforeAll(async () => {
      const gitroot = join(testDir.path, 'case1');
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

    when('[t0] the ask is machine-wide, by an @all slug', () => {
      then('the manifest is never loaded, so the read proceeds', async () => {
        const context = await genContextKeyrackGrantGet({
          gitroot: scene.gitroot,
          owner: null,
          for: { keys: ['@all.camp.__TEST_MACHINE_KEY__'] },
        });
        expect(context.repoManifest).toEqual(null);
      });
    });

    when('[t1] the ask is machine-wide, by the --org @all flag', () => {
      then('the manifest is never loaded, so the read proceeds', async () => {
        const context = await genContextKeyrackGrantGet({
          gitroot: scene.gitroot,
          owner: null,
          for: { keys: ['__TEST_MACHINE_KEY__'] },
          org: '@all',
        });
        expect(context.repoManifest).toEqual(null);
      });
    });

    when('[t2] the ask is repo-scoped — THE GUARD', () => {
      // .why = this row is what makes the clamp bite. the fix narrows WHEN the manifest loads;
      //        it must not soften HOW it fails for an ask that genuinely needs one
      then('it still throws loud', async () => {
        await expect(
          genContextKeyrackGrantGet({
            gitroot: scene.gitroot,
            owner: null,
            for: { keys: ['__TEST_REPO_KEY__'] },
          }),
        ).rejects.toThrow(/extended keyrack not found/);
      });
    });

    when('[t3] the builder is told no ask at all', () => {
      // .why = backwards compatibility. an untold ask is a manifest ask, so every extant
      //        caller and the published sdk signature behave exactly as before
      then('it still throws loud', async () => {
        await expect(
          genContextKeyrackGrantGet({ gitroot: scene.gitroot, owner: null }),
        ).rejects.toThrow(/extended keyrack not found/);
      });
    });
  });

  given('[case2] a repo manifest with invalid yaml', () => {
    // .why = the SECOND throw mode. the axis this branch is keyed on is "can this manifest
    //        load?", never "is its `extends` broken?" — so the clamp pins the axis
    const scene = useBeforeAll(async () => {
      const gitroot = join(testDir.path, 'case2');
      mkdirSync(join(gitroot, '.agent'), { recursive: true });
      writeFileSync(
        join(gitroot, '.agent', 'keyrack.yml'),
        `org: testorg
env.prep:
  - [unclosed
    : : :
`,
      );
      return { gitroot };
    });

    when('[t0] the ask is machine-wide', () => {
      then('the manifest is never loaded, so the read proceeds', async () => {
        const context = await genContextKeyrackGrantGet({
          gitroot: scene.gitroot,
          owner: null,
          for: { keys: ['@all.camp.__TEST_MACHINE_KEY__'] },
        });
        expect(context.repoManifest).toEqual(null);
      });
    });

    when('[t1] the ask is repo-scoped — THE GUARD', () => {
      then('it still throws loud', async () => {
        await expect(
          genContextKeyrackGrantGet({
            gitroot: scene.gitroot,
            owner: null,
            for: { keys: ['__TEST_REPO_KEY__'] },
          }),
        ).rejects.toThrow();
      });
    });
  });

  given('[case3] a MIXED ask against a broken manifest', () => {
    // .why = the union is STRICT. any member that needs the manifest wins, so the load must
    //        still run — and so this still throws. a per-key decision would silently move the
    //        repo member's provenance check off the upfront ORG_MISMATCH guard
    const scene = useBeforeAll(async () => {
      const gitroot = join(testDir.path, 'case3');
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

    when('[t0] one @all key and one repo key are named together', () => {
      then('it still throws loud', async () => {
        await expect(
          genContextKeyrackGrantGet({
            gitroot: scene.gitroot,
            owner: null,
            for: {
              keys: ['@all.camp.__TEST_MACHINE_KEY__', '__TEST_REPO_KEY__'],
            },
          }),
        ).rejects.toThrow(/extended keyrack not found/);
      });
    });
  });

  given('[case4] no repo at all — a null gitroot', () => {
    // .why = the twin case, fixed at 1.45.1. after this wish the two paths AGREE: a
    //        machine-wide ask yields a null manifest whether or not a repo is present
    when('[t0] a machine-wide ask', () => {
      then('the manifest is null', async () => {
        const context = await genContextKeyrackGrantGet({
          gitroot: null,
          owner: null,
          for: { keys: ['@all.camp.__TEST_MACHINE_KEY__'] },
        });
        expect(context.repoManifest).toEqual(null);
      });
    });

    when('[t1] a repo-scoped ask', () => {
      then(
        'the manifest is null, with no throw (there is none to load)',
        async () => {
          const context = await genContextKeyrackGrantGet({
            gitroot: null,
            owner: null,
            for: { keys: ['__TEST_REPO_KEY__'] },
          });
          expect(context.repoManifest).toEqual(null);
        },
      );
    });
  });
});
