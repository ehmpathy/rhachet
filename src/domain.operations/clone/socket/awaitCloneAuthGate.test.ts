import { given, then, useThen, when } from 'test-fns';

import { awaitCloneAuthGate } from './awaitCloneAuthGate';

/**
 * .what = clamps the BOUND on the clone socket's same-user auth gate — the third outcome
 *   (`timeout`) exists, is reached, and is told apart from a deny
 * .why = 🔴 the accept path writes NO frame until this gate settles, so an unbounded check is
 *   an unbounded silence: the client sees a connected peer that never answers and falls to
 *   its own 30s wedge timer with an EMPTY ack trail. measured 2026-09-18 on an 11-suite clone
 *   acceptance tier: `acksSeen: []`, `silentMs: 30092`. `[case4]` is the RED-before /
 *   GREEN-after of that repair — with no bound it never settles at all, so the test hangs
 *   rather than fails, which is exactly the production symptom
 * .note = the check is injected, so a never-settled lookup is one line and needs no socket,
 *   no `ss` scan, and no second unix user
 */
describe('awaitCloneAuthGate', () => {
  given('[case1] a check that answers TRUE inside the bound', () => {
    when('[t0] the gate is awaited', () => {
      const outcome = useThen('it settles', async () =>
        awaitCloneAuthGate({
          check: async () => true,
          timeoutMs: 1000,
        }),
      );

      then('the verdict is `pass`, with no fault', () => {
        expect({ verdict: outcome.verdict, fault: outcome.fault }).toEqual({
          verdict: 'pass',
          fault: null,
        });
      });
    });
  });

  given('[case2] a check that answers FALSE inside the bound', () => {
    when('[t0] the gate is awaited', () => {
      const outcome = useThen('it settles', async () =>
        awaitCloneAuthGate({
          check: async () => false,
          timeoutMs: 1000,
        }),
      );

      then('the verdict is `deny`, with no fault', () => {
        expect({ verdict: outcome.verdict, fault: outcome.fault }).toEqual({
          verdict: 'deny',
          fault: null,
        });
      });
    });
  });

  given('[case3] a check that THROWS', () => {
    when('[t0] the gate is awaited', () => {
      const outcome = useThen('it settles', async () =>
        awaitCloneAuthGate({
          check: async () => {
            throw new Error('ss lookup blew up');
          },
          timeoutMs: 1000,
        }),
      );

      then(
        'it fails CLOSED — a deny that carries the fault for a trace',
        () => {
          expect({
            verdict: outcome.verdict,
            faultMessage: outcome.fault?.message ?? null,
          }).toEqual({
            verdict: 'deny',
            faultMessage: 'ss lookup blew up',
          });
        },
      );
    });
  });

  given('[case4] a check that NEVER settles — the measured pathology', () => {
    when('[t0] the gate is awaited with a short bound', () => {
      // the discriminant is computed INSIDE the async so a primitive is asserted: the
      // elapsed time proves the gate settled from its own TIMER rather than from the
      // check, which never answers at all
      const outcome = useThen(
        'the gate settles anyway, from its own bound',
        async () => {
          const startedAt = Date.now();
          const settled = await awaitCloneAuthGate({
            check: () => new Promise<boolean>(() => undefined), // never settles
            timeoutMs: 120,
          });
          return {
            verdict: settled.verdict,
            fault: settled.fault,
            // a node timer may fire ~1ms before `Date.now()` ticks past the bound (the
            //   timer clock is monotonic, the wall clock truncates to the ms), so a strict
            //   `>= 120` flakes on a loaded host. the slack stays far above an early settle
            elapsedAtLeastTheBound: Date.now() - startedAt >= 120 - 5,
          };
        },
      );

      then('the verdict is `timeout` — a third word, never a deny', () => {
        expect({
          verdict: outcome.verdict,
          fault: outcome.fault,
          elapsedAtLeastTheBound: outcome.elapsedAtLeastTheBound,
        }).toEqual({
          verdict: 'timeout',
          fault: null,
          elapsedAtLeastTheBound: true,
        });
      });
    });
  });

  given('[case5] a check that answers FAST, against a long bound', () => {
    when('[t0] the gate is awaited', () => {
      // clamps that a settled check does NOT wait out its bound — the armed timer is
      // cleared, so a healthy dispatch pays the lookup only. without the clear, every
      // accept would hold its reply for the whole 8s prod bound
      const outcome = useThen('it settles promptly', async () => {
        const startedAt = Date.now();
        const settled = await awaitCloneAuthGate({
          check: async () => true,
          timeoutMs: 60_000,
        });
        return {
          verdict: settled.verdict,
          elapsedUnderASecond: Date.now() - startedAt < 1000,
        };
      });

      then('it returns at the check`s pace, never the bound`s', () => {
        expect({
          verdict: outcome.verdict,
          elapsedUnderASecond: outcome.elapsedUnderASecond,
        }).toEqual({ verdict: 'pass', elapsedUnderASecond: true });
      });
    });
  });
});
