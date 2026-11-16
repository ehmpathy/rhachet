/**
 * .what = the env key where an acceptance run records which process minted its run id
 */
export const RUN_MINTER_ENV_KEY = 'RHACHET_ACCEPTANCE_RUN_MINTER';

/**
 * .what = the value the minter key holds: the minter's pid and the run id it minted
 */
export const asRunMinterMark = (input: { pid: number; runId: string }): string =>
  `${input.pid}:${input.runId}`;

/**
 * .what = this process's run id, only when this process minted it
 * .why = the leak sweep ends every process that carries the run id. jest skips the globalSetup
 *   that mints the id when no test file matches, so a run started from inside another run would
 *   read the id it inherited and end its own ancestors (measured 2026-11-16: a credfree run with a
 *   typo scope, launched by a test, was sent SIGTERM by its own nested jest). the mint mark carries
 *   the minter's pid, so an inherited mark never matches the process that reads it
 */
export const getOneRunIdMintedHere = (input: {
  env: Record<string, string | undefined>;
  pid: number;
}): string | null => {
  const runId = input.env.TEST_FNS_RUN ?? null;
  if (!runId) return null;
  const mark = input.env[RUN_MINTER_ENV_KEY] ?? null;
  if (mark !== asRunMinterMark({ pid: input.pid, runId })) return null;
  return runId;
};
