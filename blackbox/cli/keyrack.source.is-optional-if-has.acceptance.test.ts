import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { given, then, useBeforeAll, useThen, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';

/**
 * .what = CLI acceptance tests for is-optional-if-has keyrack feature
 * .why = verify that `rhx keyrack source` CLI respects is-optional-if-has waivers
 *
 * .note = parity with blackbox/sdk/keyrack.source.is-optional-if-has.acceptance.test.ts
 */
describe('keyrack.source CLI is-optional-if-has', () => {
  // kill any stale daemon to ensure fresh daemon with current code
  beforeAll(() => killKeyrackDaemonForTests());

  given('[case1] absent key with alternative present (CLI)', () => {
    /**
     * .scenario = AWS_PROFILE is absent but AWS_ACCESS_KEY_ID is present
     * .expected = strict mode should pass because alternative is present
     */
    const primaryKey = '__TEST_OPT_AWS_PROFILE__';
    const alternativeKey = '__TEST_OPT_AWS_ACCESS_KEY_ID__';
    const alternativeValue = 'AKIAIOSFODNN7EXAMPLE';

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-keyrack-manifest' });

      // write manifest with is-optional-if-has declaration
      writeFileSync(
        join(r.path, '.agent', 'keyrack.yml'),
        `org: testorg

env.test:
  - key: ${primaryKey}
    is-optional-if-has: ${alternativeKey}
  - ${alternativeKey}
`,
      );

      return r;
    });

    when('[t0] source in strict mode with alternative present', () => {
      const result = useThen('source succeeds', async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: [
            'keyrack',
            'source',
            '--env',
            'test',
            '--owner',
            'testorg',
            '--allow-dangerous', // allow AWS-pattern key
          ],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            XDG_RUNTIME_DIR: join(repo.path, '.xdg-runtime'),
            // primary key NOT set
            [alternativeKey]: alternativeValue, // alternative IS set
          },
        }),
      );

      then('exits with status 0 (requirement waived)', () => {
        expect(result.status).toEqual(0);
      });

      then('stdout contains only alternative key (primary was absent)', () => {
        expect(result.stdout).toContain(alternativeKey);
        expect(result.stdout).not.toContain(primaryKey);
      });

      then('stdout matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t1] source in strict mode without alternative present', () => {
      const result = useThen('source fails', async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'source', '--env', 'test', '--owner', 'testorg'],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            XDG_RUNTIME_DIR: join(repo.path, '.xdg-runtime'),
            // neither key set
          },
          logOnError: false,
        }),
      );

      then('exits with status 2 (both keys absent, no waiver)', () => {
        expect(result.status).toEqual(2);
      });

      then('stderr mentions absent keys', () => {
        expect(result.stderr).toContain('absent');
      });

      then('stderr matches snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case2] both keys present', () => {
    /**
     * .scenario = both primary and alternative keys are present
     * .expected = both should be sourced normally
     */
    const primaryKey = '__TEST_OPT_BOTH_PRIMARY__';
    const alternativeKey = '__TEST_OPT_BOTH_ALT__';
    const primaryValue = 'primary-value';
    const alternativeValue = 'alternative-value';

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-keyrack-manifest' });

      writeFileSync(
        join(r.path, '.agent', 'keyrack.yml'),
        `org: testorg

env.test:
  - key: ${primaryKey}
    is-optional-if-has: ${alternativeKey}
  - ${alternativeKey}
`,
      );

      return r;
    });

    when('[t0] source with both keys present', () => {
      const result = useThen('source succeeds', async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'source', '--env', 'test', '--owner', 'testorg'],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            [primaryKey]: primaryValue,
            [alternativeKey]: alternativeValue,
          },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('stdout contains both keys', () => {
        expect(result.stdout).toContain(primaryKey);
        expect(result.stdout).toContain(alternativeKey);
      });

      then('stdout matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case3] alternative key with empty string value', () => {
    /**
     * .scenario = alternative key is present but empty string
     * .expected = empty string does NOT waive requirement (falsy)
     */
    const primaryKey = '__TEST_OPT_EMPTY_PRIMARY__';
    const alternativeKey = '__TEST_OPT_EMPTY_ALT__';

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-keyrack-manifest' });

      writeFileSync(
        join(r.path, '.agent', 'keyrack.yml'),
        `org: testorg

env.test:
  - key: ${primaryKey}
    is-optional-if-has: ${alternativeKey}
  - ${alternativeKey}
`,
      );

      return r;
    });

    when('[t0] source with empty alternative', () => {
      const result = useThen('source fails', async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'source', '--env', 'test', '--owner', 'testorg'],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            XDG_RUNTIME_DIR: join(repo.path, '.xdg-runtime'),
            // primary NOT set
            [alternativeKey]: '', // empty string - should not waive
          },
          logOnError: false,
        }),
      );

      then('exits with status 2 (empty string does not waive)', () => {
        expect(result.status).toEqual(2);
      });

      then('stderr mentions absent keys', () => {
        expect(result.stderr).toContain('absent');
      });

      then('stderr matches snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case4] key with is-optional-if-has AND grade', () => {
    /**
     * .scenario = key has both is-optional-if-has and grade: ephemeral
     * .expected = both should be parsed correctly
     */
    const primaryKey = '__TEST_OPT_GRADED_PRIMARY__';
    const alternativeKey = '__TEST_OPT_GRADED_ALT__';
    const alternativeValue = 'alternative-graded-value';

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-keyrack-manifest' });

      writeFileSync(
        join(r.path, '.agent', 'keyrack.yml'),
        `org: testorg

env.test:
  - key: ${primaryKey}
    is-optional-if-has: ${alternativeKey}
    grade: ephemeral
  - ${alternativeKey}
`,
      );

      return r;
    });

    when('[t0] source with graded key and alternative present', () => {
      const result = useThen('source succeeds', async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'source', '--env', 'test', '--owner', 'testorg'],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            XDG_RUNTIME_DIR: join(repo.path, '.xdg-runtime'),
            // primary NOT set
            [alternativeKey]: alternativeValue, // alternative IS set
          },
        }),
      );

      then('exits with status 0 (graded key waived)', () => {
        expect(result.status).toEqual(0);
      });

      then('stdout contains alternative key', () => {
        expect(result.stdout).toContain(alternativeKey);
      });

      then('stdout matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case5] alternative key NOT in manifest but present in env', () => {
    /**
     * .scenario = primary key has is-optional-if-has referencing a key NOT in manifest
     *             but that key IS present in process.env
     * .expected = waiver should still apply (check env, not manifest)
     */
    const primaryKey = '__TEST_OPT_ENV_ONLY_PRIMARY__';
    const alternativeKey = '__TEST_OPT_ENV_ONLY_ALT__'; // NOT in manifest
    const alternativeValue = 'env-only-alternative-value';

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-keyrack-manifest' });

      // manifest declares primary with is-optional-if-has, but alternative is NOT listed
      writeFileSync(
        join(r.path, '.agent', 'keyrack.yml'),
        `org: testorg

env.test:
  - key: ${primaryKey}
    is-optional-if-has: ${alternativeKey}
`,
      );
      // note: ${alternativeKey} is NOT listed in manifest

      return r;
    });

    when('[t0] source with alternative in env but not in manifest', () => {
      const result = useThen('source succeeds', async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'source', '--env', 'test', '--owner', 'testorg'],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            XDG_RUNTIME_DIR: join(repo.path, '.xdg-runtime'),
            // primary NOT set (absent from keyrack)
            [alternativeKey]: alternativeValue, // alternative IS set in env (not in manifest)
          },
        }),
      );

      then('exits with status 0 (waiver checks env, not manifest)', () => {
        expect(result.status).toEqual(0);
      });

      then('stdout is empty (primary absent, alternative not in keyrack)', () => {
        // primary is absent, alternative is in env but not managed by keyrack
        // so keyrack outputs no export statements, but strict mode passes due to waiver
        expect(result.stdout.trim()).toEqual('');
      });

      then('stdout matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t1] source without alternative in env', () => {
      const result = useThen('source fails', async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'source', '--env', 'test', '--owner', 'testorg'],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            XDG_RUNTIME_DIR: join(repo.path, '.xdg-runtime'),
            // neither key set
          },
          logOnError: false,
        }),
      );

      then('exits with status 2 (no waiver, primary required)', () => {
        expect(result.status).toEqual(2);
      });

      then('stderr mentions absent key', () => {
        expect(result.stderr).toContain('absent');
        expect(result.stderr).toContain(primaryKey);
      });

      then('stderr matches snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case6] primary key directly supplied (happy path)', () => {
    /**
     * .scenario = primary key has is-optional-if-has, but primary IS supplied
     * .expected = primary is sourced, no waiver needed
     */
    const primaryKey = '__TEST_OPT_DIRECT_PRIMARY__';
    const alternativeKey = '__TEST_OPT_DIRECT_ALT__';
    const primaryValue = 'direct-primary-value';

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-keyrack-manifest' });

      // note: alternativeKey is NOT in manifest - is-optional-if-has only checks process.env
      writeFileSync(
        join(r.path, '.agent', 'keyrack.yml'),
        `org: testorg

env.test:
  - key: ${primaryKey}
    is-optional-if-has: ${alternativeKey}
`,
      );

      return r;
    });

    when('[t0] source with primary key supplied', () => {
      const result = useThen('source succeeds', async () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'source', '--env', 'test', '--owner', 'testorg'],
          cwd: repo.path,
          env: {
            HOME: repo.path,
            XDG_RUNTIME_DIR: join(repo.path, '.xdg-runtime'),
            [primaryKey]: primaryValue, // primary IS set
            // alternative NOT set
          },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('stdout contains primary key', () => {
        expect(result.stdout).toContain(primaryKey);
        expect(result.stdout).toContain(primaryValue);
      });

      then('stdout matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });

      then('stderr matches snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });
  });
});
