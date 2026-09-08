/**
 * .what = what the pnpm presence probe could actually establish
 *
 * 🚨 `present` and `absent` are answers; `unreadable` is the ADMISSION of none. a probe
 *   that timed out has not said pnpm is absent — it has said naught, so to fold that
 *   silence into `absent` reads absence of evidence as evidence of absence
 *   (`rule.forbid.failhide`).
 */
export type PnpmPresenceRead = 'present' | 'absent' | 'unreadable';

/**
 * .what = the subset of a spawn's outcome this classification actually reads
 * .why = a narrow shape lets a unit test hand it a plain object literal. the full
 *   `SpawnSyncReturns` demands `pid`/`output`/`stdout`/`stderr` that decide naught here, and
 *   every one of them would be a fixture detail with no stake in the verdict.
 */
export interface PnpmVersionProbeResult {
  status: number | null;
  signal: NodeJS.Signals | null;
  error?: Error;
}

/**
 * .what = reads one probe outcome into the fact it established, or into the admission of none
 * .why = this is the PURE half of the presence probe, split out from the spawn so it can be
 *   unit-tested with plain values and no mock (`rule.forbid.unit.remote-boundaries`). the
 *   spawn itself is a communicator, covered by `getPnpmPresence.integration.test.ts`.
 */
export const asPnpmPresenceFromProbeResult = (input: {
  result: PnpmVersionProbeResult;
}): PnpmPresenceRead => {
  const { result } = input;

  // 🚨 ENOENT is a FACT of ABSENCE, never a silence — with no shell, node does the PATH
  //   lookup itself and reports a spawn error where a shell would have exited 127. both
  //   describe the same world, so both must say `absent`
  const spawnErrorCode = (result.error as NodeJS.ErrnoException | undefined)
    ?.code;
  if (spawnErrorCode === 'ENOENT') return 'absent';

  // 🚨 the STRUCTURAL death is read FIRST. a child killed at its bound has `status === null`
  //   — it never exited, so a `status === 0` test below would silently render it `false`
  if (result.error !== undefined || result.signal !== null) return 'unreadable';
  if (result.status === null) return 'unreadable';

  // pnpm exits 0 when it ran; a shell that cannot execute it exits nonzero
  return result.status === 0 ? 'present' : 'absent';
};
