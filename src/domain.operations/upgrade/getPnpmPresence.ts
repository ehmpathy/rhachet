import { spawnSync } from 'node:child_process';
import {
  asPnpmPresenceFromProbeResult,
  type PnpmPresenceRead,
} from './asPnpmPresenceFromProbeResult';
import {
  asPnpmVersionProbeCommand,
  PROBE_TIMEOUT_MS,
} from './asPnpmVersionProbeCommand';

export type { PnpmPresenceRead };

/**
 * .what = the probe's time bound, rendered for a human
 *
 * ⚠️ DERIVED, never retyped — the notice states how long we waited, and a literal there
 *   would decay silently when the constant moves.
 */
export const asProbeTimeoutWords = (): string => `${PROBE_TIMEOUT_MS / 1_000}s`;

/**
 * .what = runs pnpm's own version probe exactly once and reports what that read established
 * .why = this is the COMMUNICATOR — the one line that crosses the process boundary. it holds
 *   no policy (the command is `asPnpmVersionProbeCommand`) and no verdict (the read is
 *   `asPnpmPresenceFromProbeResult`), so a real spawn is its only possible defect. covered by
 *   `getPnpmPresence.integration.test.ts`, against a real pnpm.
 */
const getPnpmPresenceFromVersionProbe = (): PnpmPresenceRead => {
  // 🚨 it RUNS pnpm rather than looks it up on PATH. a corrupt shim, a broken node, or a
  //   symlink to naught each satisfy a PATH lookup and then fail when invoked, so a lookup
  //   hands back a confident `present`
  const probe = asPnpmVersionProbeCommand({ platform: process.platform });
  const result = spawnSync(probe.command, probe.args, probe.options);
  return asPnpmPresenceFromProbeResult({ result });
};

/**
 * .what = probes whether pnpm can RUN, and says so when it could not tell
 *
 * 🚨 silence is RE-PROBED once before it concludes `unreadable`. a wedged mount is
 *   transient — wedged at t=0, it may answer at t=11 — and a redirect to npm lands rhachet
 *   in a different global store than the one the `rhx` shim reads.
 *
 * ⚠️ the retry bound is spelled by the two CALLS, never by a constant, so no number can
 *   drift from the behavior. no backoff — a sleep would be a third unmeasured wall-clock
 *   figure (`rule.forbid.time-assumptions`), and the first probe's own bound IS the gap.
 *
 * .note = `input.probe` is the seam the retry clamp drives. the DEFAULT is the only value
 *   production uses; it exists so the retry can be proven with an injected fake rather than
 *   a `jest.mock('node:child_process')`, which `rule.forbid.unit.remote-boundaries` grades a
 *   blocker. the same shape `getPtyModuleOrNull` already carries for its addon load.
 */
export const getPnpmPresence = (input?: {
  probe?: () => PnpmPresenceRead;
}): PnpmPresenceRead => {
  const probe = input?.probe ?? getPnpmPresenceFromVersionProbe;

  // a definite answer needs no second look — `present` and `absent` are both facts
  const readFirst = probe();
  if (readFirst !== 'unreadable') return readFirst;

  // only silence is re-asked. whatever this returns is final, another silence too
  return probe();
};
