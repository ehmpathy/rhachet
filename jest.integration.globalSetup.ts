/**
 * .what = source api keys from keyrack into process.env, once per jest run; otherwise, fail fast
 * .why =
 *   - mint the test-fns autoprune run id, so temp dirs are reclaimed at teardown
 *   - prevent time wasted on tests that fail due to absent api keys
 *   - prevent agents from quit when they have access to credentials
 *
 * .note = a globalSetup, never a setupFilesAfterEnv: `keyrack.source` spawns a full
 *   `rhx keyrack get --for repo` child (~20s on a loaded box). per suite file, that was paid once
 *   per file; here it is paid once per run. the env it sets reaches every suite — in-band suites
 *   share this process, and a forked worker inherits its env
 * .note = hardcoded to --owner ehmpath because we expect only ehmpaths to work in this repo
 * .note = keyrack already prefers passthrough (checks env vars first)
 */
// eslint-disable-next-line import/no-default-export
export default async (globalConfig: {
  globalTeardown?: string | null;
}): Promise<void> => {
  // mint this run's autoprune id before workers fork; jest allows one globalSetup, so we compose it
  const { default: setupAutoprune } = await import('test-fns/autoprune.setup.jest');
  await setupAutoprune(globalConfig);

  // source api keys into process.env
  const { keyrack } = await import('rhachet/keyrack');
  keyrack.source({ env: 'test', owner: 'ehmpath' });
};
