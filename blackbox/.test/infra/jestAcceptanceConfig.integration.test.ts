import { spawnSync } from 'child_process';
import { availableParallelism } from 'os';
import { join } from 'path';
import { given, then, useThen, when } from 'test-fns';

/**
 * .what = the acceptance config, loaded by real jest under each host signal, and the width it sets
 * .why = `getOneAcceptanceBox` is unit tested alone; this proves the config wires it in, so a
 *   laptop that sets `CI=true` stays narrow and a github runner goes wide
 */

/** the repo root, where the acceptance config lives */
const REPO_ROOT = join(__dirname, '../../..');

/**
 * .what = this process's env, less every var that names a host or a jest run
 * .why = each case sets the one host signal it tests, and no other
 */
const ENV_BARE = Object.fromEntries(
  Object.entries(process.env).filter(
    ([key]) => !/^(JEST_|NODE_ENV$|CI$|GITHUB_ACTIONS$|TEST_FNS_RUN$|RHACHET_ACCEPTANCE_RUN_MINTER$)/.test(key),
  ),
);

/**
 * .what = the maxWorkers jest computes from the acceptance config, under the given env
 */
const getOneMaxWorkers = (input: { env: Record<string, string> }): { status: number | null; maxWorkers: number } => {
  const shown = spawnSync(
    process.execPath,
    [require.resolve('jest/bin/jest'), '-c', './jest.acceptance.config.ts', '--showConfig'],
    { cwd: REPO_ROOT, env: { ...ENV_BARE, ...input.env }, encoding: 'utf-8' },
  );
  const config = JSON.parse(shown.stdout) as { globalConfig: { maxWorkers: number } };
  return { status: shown.status, maxWorkers: config.globalConfig.maxWorkers };
};

/** a quarter of the cores, at least one: the shared-box width */
const WIDTH_SHARED = Math.max(1, Math.floor(availableParallelism() / 4));

/** half the cores, at least one: the ci width, as jest computes '50%' */
const WIDTH_CI = Math.max(1, Math.floor(availableParallelism() / 2));

describe('jest.acceptance.config, width by host', () => {
  // each case loads the config through a cold jest
  jest.setTimeout(60_000);

  given('[case1] a laptop that sets CI=true, as test.acceptance.credfree does', () => {
    when('[t0] jest loads the config', () => {
      const result = useThen('it loads', async () => getOneMaxWorkers({ env: { CI: 'true' } }));
      then('the width is the shared-box share, not ci width', () => {
        expect(result.status).toEqual(0);
        expect(result.maxWorkers).toEqual(WIDTH_SHARED);
      });
    });
  });

  given('[case2] a github runner, which sets GITHUB_ACTIONS=true', () => {
    when('[t0] jest loads the config', () => {
      const result = useThen('it loads', async () =>
        getOneMaxWorkers({ env: { CI: 'true', GITHUB_ACTIONS: 'true' } }),
      );
      then('the width is the full ci width', () => {
        expect(result.status).toEqual(0);
        expect(result.maxWorkers).toEqual(WIDTH_CI);
      });
    });
  });

  given('[case3] no host signal at all', () => {
    when('[t0] jest loads the config', () => {
      const result = useThen('it loads', async () => getOneMaxWorkers({ env: {} }));
      then('the width is the shared-box share', () => {
        expect(result.status).toEqual(0);
        expect(result.maxWorkers).toEqual(WIDTH_SHARED);
      });
    });
  });
});
