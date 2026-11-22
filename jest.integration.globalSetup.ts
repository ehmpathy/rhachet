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
  // the run's temp-dir reclaim (mint the autoprune id before workers fork, and reclaim on a
  // signal); jest allows one globalSetup, so we compose it — first, so an interrupt within the
  // ~20s keyrack spawn below still reclaims
  const { setAutopruneForRun } = await import(
    './src/.test/infra/setAutopruneForRun'
  );
  await setAutopruneForRun({ globalConfig });

  // source api keys into process.env
  const { keyrack } = await import('rhachet/keyrack');
  keyrack.source({ env: 'test', owner: 'ehmpath' });

  // export the sourced aws profile's static creds once, for `useKeyrack` suites to apply
  const { genAwsStaticCredsExport } = await import(
    './src/.test/infra/genAwsStaticCredsExport'
  );
  genAwsStaticCredsExport();
};
