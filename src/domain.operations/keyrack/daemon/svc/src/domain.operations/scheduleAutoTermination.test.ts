import { asIsoTimeStamp } from 'iso-time';
import { given, then, when } from 'test-fns';

import { KeyrackKeyGrant } from '@src/domain.objects/keyrack/KeyrackKeyGrant';

import { createDaemonKeyStore } from '../domain.objects/daemonKeyStore';
import { scheduleAutoTermination } from './scheduleAutoTermination';

describe('scheduleAutoTermination', () => {
  // track process.exit calls
  let exitSpy: jest.SpyInstance;
  let exitCalled: boolean;
  const intervalMs = 1000;

  beforeEach(() => {
    // use fake timers that also control Date.now() and new Date()
    jest.useFakeTimers({ advanceTimers: false });
    jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    exitCalled = false;
    exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {
      exitCalled = true;
    }) as never);
    // set env var for short check interval (used by scheduleAutoTermination)
    process.env['KEYRACK_DAEMON_TERMINATION_CHECK_MS'] = String(intervalMs);
  });

  afterEach(() => {
    jest.useRealTimers();
    exitSpy.mockRestore();
    delete process.env['KEYRACK_DAEMON_TERMINATION_CHECK_MS'];
  });

  given('[case1] empty key store', () => {
    when('[t0] scheduler runs first check', () => {
      then('does not terminate (no keys were ever present)', () => {
        const keyStore = createDaemonKeyStore();

        const intervalHandle = scheduleAutoTermination({ keyStore });

        // advance time to trigger interval
        jest.advanceTimersByTime(intervalMs + 1);

        clearInterval(intervalHandle);
        expect(exitCalled).toBe(false);
      });
    });
  });

  given('[case2] key store with keys', () => {
    when('[t0] scheduler runs check while keys present', () => {
      then('does not terminate', () => {
        const keyStore = createDaemonKeyStore();

        // add a non-expired key (far future)
        keyStore.set({
          grant: new KeyrackKeyGrant({
            slug: 'test-key',
            key: {
              secret: 'test-secret',
              grade: { protection: 'encrypted', duration: 'ephemeral' },
            },
            source: { vault: '1password', mech: 'PERMANENT_VIA_REPLICA' },
            env: 'test',
            org: 'test-org',
            expiresAt: asIsoTimeStamp(new Date(Date.now() + 600000)), // 10 min from now
          }),
        });

        const intervalHandle = scheduleAutoTermination({ keyStore });

        // advance time to trigger interval
        jest.advanceTimersByTime(intervalMs + 1);

        clearInterval(intervalHandle);
        expect(exitCalled).toBe(false);
      });
    });
  });

  given('[case3] keys were present then expired', () => {
    when('[t0] scheduler runs check after keys expire', () => {
      then('terminates', () => {
        const keyStore = createDaemonKeyStore();

        // add a key that will expire between first and second check
        // key valid at t=0, expires at t=1500, checked at t=1000 (valid), t=2000 (expired)
        const now = Date.now();
        keyStore.set({
          grant: new KeyrackKeyGrant({
            slug: 'test-key',
            key: {
              secret: 'test-secret',
              grade: { protection: 'encrypted', duration: 'ephemeral' },
            },
            source: { vault: '1password', mech: 'PERMANENT_VIA_REPLICA' },
            env: 'test',
            org: 'test-org',
            expiresAt: asIsoTimeStamp(new Date(now + 1500)),
          }),
        });

        const intervalHandle = scheduleAutoTermination({ keyStore });

        // first check at t=1000: key still valid → hasEverHadKeys = true
        jest.advanceTimersByTime(intervalMs);
        expect(exitCalled).toBe(false);

        // second check at t=2000: key expired → entries empty → terminate
        jest.advanceTimersByTime(intervalMs);
        expect(exitCalled).toBe(true);

        clearInterval(intervalHandle);
      });
    });
  });

  given('[case4] interval handle', () => {
    when('[t0] scheduleAutoTermination is called', () => {
      then('returns clearable interval handle', () => {
        const keyStore = createDaemonKeyStore();

        const intervalHandle = scheduleAutoTermination({ keyStore });

        // should be clearable
        expect(() => clearInterval(intervalHandle)).not.toThrow();
      });
    });
  });
});
