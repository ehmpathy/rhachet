import { asIsoTimeStamp } from 'iso-time';
import { given, then, when } from 'test-fns';

import { computeExpiresAt } from './computeExpiresAt';

/**
 * .what = binds e17 — the ttl the daemon advertises must not outlive the real credential
 * .why = a github app installation token dies in an hour, while the requested duration
 *        defaults to nine. absent the grant-expiry bound, `status` reports
 *        `expires in: 540m` for a secret github killed at 60 — and whoever debugs the
 *        401 that follows is sent to the wrong subsystem entirely
 *
 * .note = every assertion here is EXACT, to the millisecond, and that is a direct yield of
 *         the operation's purity. while it read `Date.now()` itself, each case had to round
 *         to the nearest minute to absorb the drift between the clock the test read and the
 *         clock the operation read — so a bound that was wrong by up to 30 seconds passed.
 *         with `now` handed in, both sides share one instant and the tolerance is zero
 */
describe('computeExpiresAt', () => {
  const MIN = 60 * 1000;

  // one fixed instant for every case — a pure operation needs no live clock
  const NOW = asIsoTimeStamp(new Date('2026-08-04T12:00:00.000Z'));
  const atMinutesFromNow = (minutes: number) =>
    asIsoTimeStamp(new Date(new Date(NOW).getTime() + minutes * MIN));

  given('[case1] no grant expiry is reported', () => {
    when('[t0] the requested duration is under the cap', () => {
      then('e1: the requested duration is honored, unchanged', () => {
        const { effectiveDurationMs } = computeExpiresAt({
          now: NOW,
          requestedDurationMs: 30 * MIN,
          maxDurationMs: null,
        });
        expect(effectiveDurationMs).toEqual(30 * MIN);
      });

      // the purity makes the OUTPUT STAMP assertable too, which drift made impossible
      then('e1: expiresAt is exactly now + the requested duration', () => {
        const { expiresAt } = computeExpiresAt({
          now: NOW,
          requestedDurationMs: 30 * MIN,
          maxDurationMs: null,
        });
        expect(expiresAt).toEqual(atMinutesFromNow(30));
      });
    });

    when('[t1] the requested duration exceeds the per-key cap', () => {
      then('the cap wins — the extant maxDuration bound is intact', () => {
        const { effectiveDurationMs } = computeExpiresAt({
          now: NOW,
          requestedDurationMs: 540 * MIN,
          maxDurationMs: 60 * MIN,
        });
        expect(effectiveDurationMs).toEqual(60 * MIN);
      });

      // .note = the cap is REPORTED, never announced. a `console.warn` inside a `compute*`
      //         would be i/o in a pure grain, and it would also make this very assertion
      //         need a console spy to make. as a returned flag it is plain data
      then(
        'the cap is reported to the caller, not printed by the transformer',
        () => {
          expect(
            computeExpiresAt({
              now: NOW,
              requestedDurationMs: 540 * MIN,
              maxDurationMs: 60 * MIN,
            }).cappedByMaxDuration,
          ).toEqual(true);
        },
      );

      then('an uncapped compute reports no cap', () => {
        expect(
          computeExpiresAt({
            now: NOW,
            requestedDurationMs: 30 * MIN,
            maxDurationMs: 60 * MIN,
          }).cappedByMaxDuration,
        ).toEqual(false);
      });
    });
  });

  given('[case2] the mech reports the credential’s true life', () => {
    when('[t0] the grant dies BEFORE the requested duration ends', () => {
      then('e17: the grant’s own expiry wins', () => {
        const { effectiveDurationMs } = computeExpiresAt({
          now: NOW,
          requestedDurationMs: 540 * MIN, // the 9h default
          maxDurationMs: null,
          grantExpiresAt: atMinutesFromNow(55),
        });
        expect(effectiveDurationMs).toEqual(55 * MIN);
      });

      then('e17: expiresAt is the grant’s timestamp, not a later one', () => {
        const grantExpiresAt = atMinutesFromNow(55);
        const { expiresAt } = computeExpiresAt({
          now: NOW,
          requestedDurationMs: 540 * MIN,
          maxDurationMs: null,
          grantExpiresAt,
        });
        expect(expiresAt).toEqual(grantExpiresAt);
      });
    });

    when('[t1] the grant outlives the requested duration', () => {
      then('the requested duration wins — min() never lengthens', () => {
        const { effectiveDurationMs } = computeExpiresAt({
          now: NOW,
          requestedDurationMs: 30 * MIN,
          maxDurationMs: null,
          grantExpiresAt: atMinutesFromNow(55),
        });
        expect(effectiveDurationMs).toEqual(30 * MIN);
      });
    });

    when('[t2] all three bounds apply at once', () => {
      then('e17: the shortest of the three wins', () => {
        const { effectiveDurationMs } = computeExpiresAt({
          now: NOW,
          requestedDurationMs: 540 * MIN, // bound 1
          maxDurationMs: 120 * MIN, //       bound 2
          grantExpiresAt: atMinutesFromNow(55), // bound 3
        });
        expect(effectiveDurationMs).toEqual(55 * MIN);
      });
    });

    when('[t3] the grant is already dead', () => {
      then('e17: the ttl is non-positive rather than a lie about life', () => {
        const { effectiveDurationMs } = computeExpiresAt({
          now: NOW,
          requestedDurationMs: 540 * MIN,
          maxDurationMs: null,
          grantExpiresAt: atMinutesFromNow(-5),
        });
        expect(effectiveDurationMs).toEqual(-5 * MIN);
      });
    });
  });

  /**
   * .note = the purity claim itself, put to a test rather than left to a comment — which is
   *         the exact failure this operation already had once. the note read "PURE" while
   *         the code read `Date.now()`, and three review rounds took the note's word for it
   */
  given('[case3] the purity claim, asserted rather than annotated', () => {
    when(
      '[t0] the same input is computed twice, far apart in wall time',
      () => {
        then('it is deterministic — the wall clock cannot reach it', () => {
          const args = {
            now: NOW,
            requestedDurationMs: 540 * MIN,
            maxDurationMs: 120 * MIN,
            grantExpiresAt: atMinutesFromNow(55),
          };
          const first = computeExpiresAt(args);
          const second = computeExpiresAt(args);
          expect(second).toEqual(first);
        });

        // ⚠️ THE clamp on the regression: were `now` dropped for a live `Date.now()`, this
        //    stamp would track the hour the suite runs rather than the instant handed in
        then(
          'the output is pinned to the instant supplied, not to today',
          () => {
            const { expiresAt } = computeExpiresAt({
              now: NOW,
              requestedDurationMs: 30 * MIN,
              maxDurationMs: null,
            });
            // .note = `asIsoTimeStamp` drops zero millis, so the stamp is `:00Z`, not `:00.000Z`
            expect(expiresAt).toEqual('2026-08-04T12:30:00Z');
          },
        );
      },
    );
  });
});
