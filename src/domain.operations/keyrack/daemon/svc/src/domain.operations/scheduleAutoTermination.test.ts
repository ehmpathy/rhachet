import { asIsoTimeStamp } from 'iso-time';
import { given, then, when } from 'test-fns';

import { KeyrackKeyGrant } from '@src/domain.objects/keyrack/KeyrackKeyGrant';

import { genDaemonActivityClock } from '../domain.objects/daemonActivityClock';
import { createDaemonKeyStore } from '../domain.objects/daemonKeyStore';
import { scheduleAutoTermination } from './scheduleAutoTermination';

/**
 * .what = build a grant that stays valid until `validForMs` from now
 * .why = every case here needs a key with a controlled expiry
 */
const genGrantValidFor = (input: { validForMs: number }): KeyrackKeyGrant =>
  new KeyrackKeyGrant({
    slug: 'test-key',
    key: {
      secret: 'test-secret',
      grade: { protection: 'encrypted', duration: 'ephemeral' },
    },
    source: { vault: '1password', mech: 'PERMANENT_VIA_REPLICA' },
    env: 'test',
    org: 'test-org',
    expiresAt: asIsoTimeStamp(new Date(Date.now() + input.validForMs)),
  });

describe('scheduleAutoTermination', () => {
  // track process.exit calls
  let exitSpy: jest.SpyInstance;
  let exitCalled: boolean;
  const intervalMs = 1000;
  const idleTimeoutMs = 1000;

  beforeEach(() => {
    // use fake timers that also control the clocks this operation reads
    // .note = the activity clock reads performance.now(), which jest's modern fake
    // timers fake alongside Date — so advanceTimersByTime moves the idle delta too.
    // the grants below still read Date.now() for their expiry, which is correct:
    // a TTL is an absolute deadline on the wall clock, where the idle window is an
    // elapsed duration on a monotonic one. both are faked here, so both advance
    jest.useFakeTimers({ advanceTimers: false });
    jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    exitCalled = false;
    exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {
      exitCalled = true;
    }) as never);
    process.env['KEYRACK_DAEMON_TERMINATION_CHECK_MS'] = String(intervalMs);
    process.env['KEYRACK_DAEMON_IDLE_TIMEOUT_MS'] = String(idleTimeoutMs);
  });

  afterEach(() => {
    jest.useRealTimers();
    exitSpy.mockRestore();
    delete process.env['KEYRACK_DAEMON_TERMINATION_CHECK_MS'];
    delete process.env['KEYRACK_DAEMON_IDLE_TIMEOUT_MS'];
  });

  given('[case1] a daemon that never received a key', () => {
    when('[t0] the idle window lapses with no demand served', () => {
      then('terminates', () => {
        // .why = this is the leak. a daemon spawned against a temp HOME that no
        // client ever unlocks against holds zero keys forever. gated on key
        // *history* its exit branch was unreachable — the guard selected for
        // exactly the population it was meant to retire. gated on demand, it exits.
        const keyStore = createDaemonKeyStore();
        const activity = genDaemonActivityClock();

        const intervalHandle = scheduleAutoTermination({ keyStore, activity });

        jest.advanceTimersByTime(intervalMs + 1);

        clearInterval(intervalHandle);
        expect(exitCalled).toBe(true);
      });
    });

    when('[t1] demand arrives inside the startup window', () => {
      then('survives', () => {
        // .why = this is the race the old hasEverHadKeys latch existed to prevent,
        // and it must stay closed. the clock starts at daemon start, so a fresh
        // daemon holds a full window of grace; demand inside it renews the lease.
        // .note = "demand", not "a client connects". the wish phrases this race as
        // "a client connects inside the startup window", but a bare connect is
        // deliberately NOT demand — isDaemonReachable connects and destroys without
        // a byte sent, and were that counted, a poll-for-death would keep its target
        // alive forever. what renews the lease is inbound bytes.
        const keyStore = createDaemonKeyStore();
        const activity = genDaemonActivityClock();

        const intervalHandle = scheduleAutoTermination({ keyStore, activity });

        // demand arrives just before the window would lapse
        jest.advanceTimersByTime(idleTimeoutMs - 1);
        activity.touch();

        // the tick fires; idle is now 1ms, far inside the window
        jest.advanceTimersByTime(2);

        clearInterval(intervalHandle);
        expect(exitCalled).toBe(false);
      });
    });
  });

  given('[case2] key store with keys', () => {
    when('[t0] scheduler runs check while keys present', () => {
      then('does not terminate', () => {
        const keyStore = createDaemonKeyStore();
        keyStore.set({ grant: genGrantValidFor({ validForMs: 600000 }) });

        const intervalHandle = scheduleAutoTermination({
          keyStore,
          activity: genDaemonActivityClock(),
        });

        jest.advanceTimersByTime(intervalMs + 1);

        clearInterval(intervalHandle);
        expect(exitCalled).toBe(false);
      });
    });

    when('[t1] keys are held but no demand arrives for a long while', () => {
      then('does not terminate', () => {
        // .why = a daemon that holds live keys survives whatever its query rate.
        // the key check short-circuits before the idle check ever reads the clock.
        const keyStore = createDaemonKeyStore();
        keyStore.set({ grant: genGrantValidFor({ validForMs: 600000 }) });

        const intervalHandle = scheduleAutoTermination({
          keyStore,
          activity: genDaemonActivityClock(),
        });

        // many idle windows pass with no demand at all
        jest.advanceTimersByTime(intervalMs * 20);

        clearInterval(intervalHandle);
        expect(exitCalled).toBe(false);
      });
    });
  });

  given('[case3] keys were present then expired', () => {
    when('[t0] scheduler runs check after keys expire', () => {
      then('terminates', () => {
        const keyStore = createDaemonKeyStore();

        // key valid at t=0, expires at t=1500; checked at t=1000 (valid), t=2000 (expired)
        keyStore.set({ grant: genGrantValidFor({ validForMs: 1500 }) });

        const intervalHandle = scheduleAutoTermination({
          keyStore,
          activity: genDaemonActivityClock(),
        });

        // first check at t=1000: key still valid → survives on the key gate
        jest.advanceTimersByTime(intervalMs);
        expect(exitCalled).toBe(false);

        // second check at t=2000: entries empty AND idle 2000ms ≥ window → terminate
        jest.advanceTimersByTime(intervalMs);
        expect(exitCalled).toBe(true);

        clearInterval(intervalHandle);
      });
    });

    when('[t1] keys expire but the client is still active', () => {
      then('survives one more window', () => {
        // .why = expiry alone no longer suffices; a caller still at work keeps its
        // daemon, which is what lets a re-unlock land on the same process
        const keyStore = createDaemonKeyStore();
        const activity = genDaemonActivityClock();

        keyStore.set({ grant: genGrantValidFor({ validForMs: 1500 }) });

        const intervalHandle = scheduleAutoTermination({ keyStore, activity });

        // first check at t=1000: key valid
        jest.advanceTimersByTime(intervalMs);
        expect(exitCalled).toBe(false);

        // the client asks for work at t=1900, after the key lapsed
        jest.advanceTimersByTime(900);
        activity.touch();

        // second check at t=2000: no keys, but idle is only 100ms → survives
        jest.advanceTimersByTime(100);
        expect(exitCalled).toBe(false);

        clearInterval(intervalHandle);
      });
    });
  });

  given('[case4] interval handle', () => {
    when('[t0] scheduleAutoTermination is called', () => {
      then('returns clearable interval handle', () => {
        const intervalHandle = scheduleAutoTermination({
          keyStore: createDaemonKeyStore(),
          activity: genDaemonActivityClock(),
        });

        // should be clearable
        expect(() => clearInterval(intervalHandle)).not.toThrow();
      });
    });
  });

  given('[case6] the wall clock jumps backward mid-life', () => {
    // .why = ntp sync, a vm resume, or a manual clock set can move Date.now in either
    // direction. a *backward* move is the lethal one: on a wall-clock idle delta it
    // reads negative, so the idle gate holds forever and a keyless daemon becomes
    // immortal — the exact defect this whole operation exists to retire, re-created
    // by a clock adjustment rather than by a boolean latch.

    when('[t0] the clock is set back further than the idle window', () => {
      then('still terminates, since the idle delta is monotonic', () => {
        const keyStore = createDaemonKeyStore();
        const activity = genDaemonActivityClock();

        const intervalHandle = scheduleAutoTermination({ keyStore, activity });

        // the wall clock lurches an hour into the past, well past the idle window
        jest.setSystemTime(new Date('2025-12-31T23:00:00.000Z'));

        // the idle window lapses in real elapsed time regardless
        jest.advanceTimersByTime(intervalMs + 1);

        clearInterval(intervalHandle);
        expect(exitCalled).toBe(true);
      });
    });
  });

  given('[case5] an env override that is not a positive integer', () => {
    // .why = parseInt yields NaN on a typo, and NaN is silent in both directions
    // here: setInterval(fn, NaN) fires as fast as the loop allows, and
    // `idleMs < NaN` is always false, so the idle gate no longer holds and every
    // daemon exits on its first tick. a bad override must be loud, not lethal.

    when('[t0] the idle window override is unparseable or non-positive', () => {
      then('throws rather than falls through to NaN', () => {
        for (const value of ['abc', '0', '-1', '1.5px']) {
          process.env['KEYRACK_DAEMON_IDLE_TIMEOUT_MS'] = value;
          expect(() =>
            scheduleAutoTermination({
              keyStore: createDaemonKeyStore(),
              activity: genDaemonActivityClock(),
            }),
          ).toThrow(
            /KEYRACK_DAEMON_IDLE_TIMEOUT_MS must be a positive integer/,
          );
        }
      });
    });

    when('[t1] the check interval override is unparseable', () => {
      then('throws too, since the same hazard sits on its twin', () => {
        // .why = a guard applied to one of a symmetric pair is a guard not applied;
        // the twin's failure mode (a busy-loop interval) is the worse of the two
        process.env['KEYRACK_DAEMON_TERMINATION_CHECK_MS'] = 'abc';
        expect(() =>
          scheduleAutoTermination({
            keyStore: createDaemonKeyStore(),
            activity: genDaemonActivityClock(),
          }),
        ).toThrow(
          /KEYRACK_DAEMON_TERMINATION_CHECK_MS must be a positive integer/,
        );
      });
    });

    when('[t2] the override is set but empty', () => {
      then('reads as unset and falls back to the default', () => {
        // .why = an empty value is how a shell reports "not configured"; to throw
        // there would fail a daemon whose operator configured no override at all
        process.env['KEYRACK_DAEMON_IDLE_TIMEOUT_MS'] = '';
        const intervalHandle = scheduleAutoTermination({
          keyStore: createDaemonKeyStore(),
          activity: genDaemonActivityClock(),
        });
        clearInterval(intervalHandle);
      });
    });
  });
});
