import { given, then, when } from 'test-fns';

import { asPnpmPresenceFromProbeResult } from './asPnpmPresenceFromProbeResult';

/**
 * 🚨 ZERO mocks. these rows used to run through a `jest.mock('node:child_process')`, which
 *   made every verdict a check against the mock's own `mockReturnValue`
 *   (`rule.forbid.unit.remote-boundaries`). the classification is pure, so the outcomes are
 *   handed to it as plain values instead — and the real spawn that produces them is
 *   exercised at the integration tier.
 */
describe('asPnpmPresenceFromProbeResult', () => {
  given('[case1] pnpm ran and exited clean', () => {
    when('[t0] the probe exited 0', () => {
      then('it reads as present', () => {
        expect(
          asPnpmPresenceFromProbeResult({
            result: { status: 0, signal: null },
          }),
        ).toEqual('present');
      });
    });
  });

  given('[case2] pnpm is not installed', () => {
    when('[t0] a shell reported it as exit 127-style nonzero', () => {
      then('it reads as absent — a real answer, not an admission', () => {
        expect(
          asPnpmPresenceFromProbeResult({
            result: { status: 1, signal: null },
          }),
        ).toEqual('absent');
      });
    });
  });

  // 🚨 with no shell, node reads PATH itself and reports an absent pnpm as a spawn ENOENT
  //   rather than as a nonzero exit ([case2]). both describe the same world, so both must
  //   say `absent` — the generic `result.error !== undefined` guard would otherwise swallow
  //   this into `unreadable` (`rule.forbid.failhide`).
  //   .the mutation that reddens this row = delete the ENOENT branch
  given('[case2b] pnpm is not installed, and no shell masks it', () => {
    when('[t0] the spawn itself failed with ENOENT', () => {
      then('it reads as absent, never as unreadable', () => {
        expect(
          asPnpmPresenceFromProbeResult({
            result: {
              status: null,
              signal: null,
              error: Object.assign(new Error('spawnSync pnpm ENOENT'), {
                code: 'ENOENT',
              }),
            },
          }),
        ).toEqual('absent');
      });
    });
  });

  // 🚨 a tri-state read, never an `is*` boolean: `return result.status === 0` renders a probe
  //   killed at its bound (status `null`) as `false` — indistinguishable from a host with no
  //   pnpm, so a wedged PATH mount switches the human to npm, unreported.
  //   .the mutation that reddens every row below = restore `return result.status === 0`
  given('[case3] the probe could not answer', () => {
    when('[t0] it was killed at its TIME BOUND', () => {
      then('it reads as unreadable, never as absent', () => {
        // .why not 'absent' = the probe never answered, so it established no fact about
        //   this host. to call that "no pnpm here" is absence of evidence read as
        //   evidence of absence (`rule.forbid.failhide`)
        expect(
          asPnpmPresenceFromProbeResult({
            result: {
              status: null,
              signal: 'SIGTERM',
              error: Object.assign(new Error('spawnSync ETIMEDOUT'), {
                code: 'ETIMEDOUT',
              }),
            },
          }),
        ).toEqual('unreadable');
      });
    });

    when('[t1] it died of a signal with no exit', () => {
      then('it reads as unreadable', () => {
        // .why = a crash and a timeout differ in cause and agree in consequence: neither
        //   produced an exit code, so neither may be read as a verdict about PATH
        expect(
          asPnpmPresenceFromProbeResult({
            result: { status: null, signal: 'SIGKILL' },
          }),
        ).toEqual('unreadable');
      });
    });

    when('[t2] it carried an error that is NOT ENOENT', () => {
      then('it reads as unreadable — a foreign fault settles naught', () => {
        // 🚨 the anti-vacuous twin of [case2b]: an ENOENT branch that swallowed EVERY error
        //   code would satisfy that row and silently render a permission fault as `absent`
        expect(
          asPnpmPresenceFromProbeResult({
            result: {
              status: null,
              signal: null,
              error: Object.assign(new Error('spawnSync EACCES'), {
                code: 'EACCES',
              }),
            },
          }),
        ).toEqual('unreadable');
      });
    });
  });
});
