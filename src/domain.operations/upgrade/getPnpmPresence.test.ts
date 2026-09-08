import { given, then, when } from 'test-fns';

import type { PnpmPresenceRead } from './asPnpmPresenceFromProbeResult';
import { getPnpmPresence } from './getPnpmPresence';

/**
 * 🚨 ZERO mocks. this file used to `jest.mock('node:child_process')` and drive `spawnSync`
 *   through a `jest.fn()`, so every row proved the mock's own setup rather than the retry
 *   (`rule.forbid.unit.remote-boundaries`). the retry is pure control flow, so it is driven
 *   through the `probe` seam with a real, typed fake instead.
 *
 * ⚠️ what moved out, and where it went — none of it was dropped:
 *   | the command (`pnpm`, `--version`, shell, timeout) | `asPnpmVersionProbeCommand.test.ts`  |
 *   | the verdict per outcome (ENOENT, signal, status)  | `asPnpmPresenceFromProbeResult.test.ts` |
 *   | the real spawn against a real pnpm                 | `getPnpmPresence.integration.test.ts` |
 */

/**
 * .what = a probe that answers a scripted sequence, one read per call, and counts its calls
 * .why = the retry's whole contract is *how many times it asks* and *which answer it keeps*,
 *   so the fake must record both. the last entry repeats, which is what makes a PERMANENT
 *   wedge expressible ([case3]) as distinct from a TRANSIENT one ([case4]).
 */
const genProbeThatAnswers = (
  reads: PnpmPresenceRead[],
): { probe: () => PnpmPresenceRead; countCalls: () => number } => {
  // .note = deliberate mutation — a local call counter, never escapes this closure
  let calls = 0;
  return {
    probe: () => {
      const read = reads[Math.min(calls, reads.length - 1)]!;
      calls += 1;
      return read;
    },
    countCalls: () => calls,
  };
};

describe('getPnpmPresence', () => {
  given('[case1] the probe answers definitely on the first read', () => {
    when('[t0] the answer is present', () => {
      then('it reads as present, and spends ONE probe', () => {
        const fake = genProbeThatAnswers(['present']);
        expect(getPnpmPresence({ probe: fake.probe })).toEqual('present');

        // 🚨 the count matters on its own: a retry on EVERY read satisfies [case4] while it
        //   doubles the probe cost on every healthy host, and only this line sees it.
        //   .the mutation that reddens this = re-probe unconditionally
        expect(fake.countCalls()).toEqual(1);
      });
    });

    when('[t1] the answer is absent', () => {
      then('it reads as absent, and spends ONE probe', () => {
        // 🚨 `absent` is a FACT, not a silence — so it must be as final as `present`. a
        //   retry keyed on "not present" rather than on "unreadable" reddens here
        const fake = genProbeThatAnswers(['absent']);
        expect(getPnpmPresence({ probe: fake.probe })).toEqual('absent');
        expect(fake.countCalls()).toEqual(1);
      });
    });
  });

  given('[case3] the probe is wedged PERMANENTLY', () => {
    when('[t0] every read is unreadable', () => {
      then('it reads as unreadable, after exactly TWO probes', () => {
        // .why not more = the retry bound is spelled by the two calls in the source. a loop
        //   here would hang the upgrade behind an unbounded number of 10s waits
        const fake = genProbeThatAnswers(['unreadable']);
        expect(getPnpmPresence({ probe: fake.probe })).toEqual('unreadable');
        expect(fake.countCalls()).toEqual(2);
      });
    });
  });

  given('[case4] the probe is wedged TRANSIENTLY, then recovers', () => {
    // 🚨 the retry clamp. the wedge the time bound guards is TRANSIENT, so a single-shot
    //   probe lets one momentary silence pick the package manager for the whole upgrade.
    //   ⚠️ the cost is not "npm instead of pnpm": the two global stores are distinct
    //   directories, so an npm-installed rhachet can land where the human's `rhx` shim
    //   never reads it
    when('[t0] the FIRST read is silent and the SECOND answers present', () => {
      then('it keeps the recovered answer, never the silence', () => {
        // .the mutation that reddens this: drop the re-probe, return `readFirst` always
        const fake = genProbeThatAnswers(['unreadable', 'present']);
        expect(getPnpmPresence({ probe: fake.probe })).toEqual('present');
        expect(fake.countCalls()).toEqual(2);
      });
    });

    when('[t1] the FIRST read is silent and the SECOND answers absent', () => {
      then('it keeps that answer too — the retry is not present-biased', () => {
        // 🚨 the anti-vacuous twin of [t0]: a retry that returned `present` on any recovery
        //   would satisfy [t0] and lie here
        const fake = genProbeThatAnswers(['unreadable', 'absent']);
        expect(getPnpmPresence({ probe: fake.probe })).toEqual('absent');
        expect(fake.countCalls()).toEqual(2);
      });
    });
  });

  given('[case5] no probe is injected', () => {
    when('[t0] the default is taken', () => {
      then('it still answers with one of the three reads', () => {
        // 🚨 this row exists so the DEFAULT is never left unexercised. a seam whose default
        //   pointed at naught would pass every row above and fail in production — the one
        //   failure an injected fake cannot see.
        //   ⚠️ it asserts the TYPE, never a value: which read a host yields is that host's
        //   business, and `getPnpmPresence.integration.test.ts` owns the real verdict
        expect(['present', 'absent', 'unreadable']).toContain(
          getPnpmPresence(),
        );
      });
    });
  });
});
