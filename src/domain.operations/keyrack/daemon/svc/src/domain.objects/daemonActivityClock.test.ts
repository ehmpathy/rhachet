import { given, then, when } from 'test-fns';

import { genDaemonActivityClock } from '@src/domain.operations/keyrack/daemon/svc/src/domain.objects/daemonActivityClock';

describe('genDaemonActivityClock', () => {
  /**
   * [uc1] the clock is live from birth — a fresh daemon is never already idle
   *
   * .why = this is the startup grace the `hasEverHadKeys` latch used to provide. the
   * latch protected a fresh daemon by a refusal to let it exit until it had held a key;
   * this clock protects it because it starts at daemon start, so a daemon born one tick
   * before a check reads an idle delta near zero. the grace is preserved, and — unlike
   * the latch — it expires, which is the whole point of the fix
   */
  given('[case1] a clock just born', () => {
    when('[t0] the last-demand stamp is read at once', () => {
      then('the idle delta is far below any plausible idle window', () => {
        const activity = genDaemonActivityClock();
        const idleMs = performance.now() - activity.getLastAt();

        // generous bound: this asserts "the clock began at birth", not a latency budget
        expect(idleMs).toBeGreaterThanOrEqual(0);
        expect(idleMs).toBeLessThan(1000);
      });
    });
  });

  /**
   * [uc2] a touch renews the lease; a read does not
   *
   * .why = the exit rule subtracts getLastAt() from now, so touch must move the stamp
   * forward and getLastAt must leave it alone. a getLastAt that touched would make the
   * daemon immortal — every idle check would renew the very lease it came to judge
   */
  given('[case2] a clock that has aged a measurable amount', () => {
    when('[t0] time passes with no touch', () => {
      then('the stamp holds still, so the idle delta grows', async () => {
        const activity = genDaemonActivityClock();
        const stampBefore = activity.getLastAt();

        await new Promise<void>((emit) => setTimeout(emit, 25));

        // read twice: the stamp is unchanged, and the delta against now has grown
        expect(activity.getLastAt()).toEqual(stampBefore);
        expect(performance.now() - activity.getLastAt()).toBeGreaterThanOrEqual(
          20,
        );
      });
    });

    when('[t1] demand arrives', () => {
      then(
        'touch moves the stamp forward and resets the idle delta',
        async () => {
          const activity = genDaemonActivityClock();
          const stampBefore = activity.getLastAt();

          await new Promise<void>((emit) => setTimeout(emit, 25));
          activity.touch();

          const stampAfter = activity.getLastAt();
          expect(stampAfter).toBeGreaterThan(stampBefore);
          expect(performance.now() - stampAfter).toBeLessThan(20);
        },
      );
    });
  });

  /**
   * [uc3] each clock is its own — two daemons do not share a lease
   *
   * .why = the clock is born inside createKeyrackDaemonServer, once per server. were the
   * stamp module-scoped rather than closure-scoped, two daemons in one process (which is
   * exactly the shape of this repo's integration tests) would renew each other's leases,
   * and the [case11] successor-vs-orphan clamp would pass for the wrong reason
   */
  given('[case3] two clocks in one process', () => {
    when('[t0] only one of them is touched', () => {
      then('the other one keeps its own, older stamp', async () => {
        const activityOne = genDaemonActivityClock();
        const activityTwo = genDaemonActivityClock();

        await new Promise<void>((emit) => setTimeout(emit, 25));
        activityOne.touch();

        expect(activityOne.getLastAt()).toBeGreaterThan(
          activityTwo.getLastAt(),
        );
      });
    });
  });
});
