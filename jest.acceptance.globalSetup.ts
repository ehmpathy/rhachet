/**
 * .what = source api keys from keyrack into process.env, once per jest run
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
 * .note = mode 'lenient' — acceptance tests self-provision credentials per-subprocess (isolated
 *   HOME, fixtures, a local SSM stand-in), so this global source is a best-effort convenience, not
 *   a hard gate. a strict source would exit(2) the WHOLE suite whenever any env.test key (e.g. the
 *   SSO-backed AWS_PROFILE) is locked on an unattended host — even though no acceptance test reads
 *   it. lenient injects whatever is unlocked and skips the rest, so a test that truly needs a
 *   credential fails in that test with a legible error (never a blanket global halt). on CI the
 *   credentials are present, so behaviour is unchanged. mirrors the lenient source in useKeyrack.
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
  keyrack.source({ env: 'test', owner: 'ehmpath', mode: 'lenient' });
};
