import { given, then, when } from 'test-fns';

import { getPnpmPresence } from './getPnpmPresence';

/**
 * .what = the pnpm-presence probe, run against the REAL pnpm on this host
 *
 * .why  = 🚨 this is the ONE row that crosses the process boundary, and the only row that can
 *   catch a command which is well-formed and wrong. the unit tier owns the two pure halves —
 *   `asPnpmVersionProbeCommand.test.ts` reads the command as data, and
 *   `asPnpmPresenceFromProbeResult.test.ts` reads each outcome into its verdict — so both are
 *   proven with no mock and neither can say what those arguments actually DO.
 *
 *   if `--version` were the wrong flag — misspelled, removed by a future pnpm, or silently
 *   rejected under `shell: true` — every unit row would stay green while the probe reported
 *   `absent` on a host that has pnpm, and the upgrade would quietly fall back to npm.
 *
 *   that is the exact shape this whole change exists to retire: a green test beside a defect
 *   is not evidence of its absence, it is often the reason nobody looked. this file is the
 *   one row that looks.
 *
 * .note = the repo declares `packageManager: pnpm` and every contributor runs it
 *   (`rule.require.pnpm-over-npm`), so `present` is a fact about the dev + ci host, never a
 *   hopeful assumption. a host without pnpm could not have installed this repo's deps.
 */
describe('getPnpmPresence.integration', () => {
  given('[case1] this host, which runs pnpm', () => {
    when('[t0] the probe runs for real', () => {
      then('it reads present — the flag is right and pnpm answers it', () => {
        // .the mutation that reddens this = change `--version` to `--verison`, or drop the
        //   dashes. the spawn then exits nonzero and this reads `absent`. no unit row moves
        expect(getPnpmPresence()).toEqual('present');
      });
    });
  });
});
