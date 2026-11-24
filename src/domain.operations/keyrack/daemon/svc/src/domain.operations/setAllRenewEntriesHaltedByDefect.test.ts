import { asIsoTimeStamp } from 'iso-time';
import { given, then, when } from 'test-fns';

import { genSampleKeyrackSsoGrant } from '@src/.test/assets/genSampleKeyrackSsoGrant';

import { createDaemonRenewRecord } from '../domain.objects/daemonRenewRecord';
import { setAllRenewEntriesHaltedByDefect } from './setAllRenewEntriesHaltedByDefect';

const CAP_AT = asIsoTimeStamp('2026-11-14T09:00:00Z');
const EXPIRES_AT = asIsoTimeStamp('2026-11-14T01:00:00Z');

describe('setAllRenewEntriesHaltedByDefect', () => {
  given('[case1] a record with one unmarked entry and one lapsed entry', () => {
    when('[t0] a tick-level defect reaches the boundary', () => {
      then('the unmarked entry is halted with the defect, class named', () => {
        const record = createDaemonRenewRecord();
        const grantLive = genSampleKeyrackSsoGrant({
          slug: 'ahbode.camp.AWS_PROFILE',
          expiresAt: EXPIRES_AT,
        });
        const grantLapsed = genSampleKeyrackSsoGrant({
          slug: 'ahbode.camp.OTHER_PROFILE',
          expiresAt: EXPIRES_AT,
        });
        record.set({ grant: grantLive, capAt: CAP_AT });
        record.set({ grant: grantLapsed, capAt: CAP_AT });
        const heldLapsed = record
          .entries()
          .find(({ entry }) => entry.grant.slug === grantLapsed.slug)!;
        record.setIfHeld({
          address: heldLapsed.address,
          before: heldLapsed.entry,
          after: { ...heldLapsed.entry, mark: { kind: 'lapsed', error: null } },
        });

        setAllRenewEntriesHaltedByDefect(
          { defect: new TypeError('entries is not iterable') },
          { renewRecord: record, inflight: new Set<string>() },
        );

        expect(record.get({ slug: grantLive.slug })?.mark).toEqual({
          kind: 'halted',
          error: '💥 defect TypeError: entries is not iterable',
        });
      });

      then('the lapsed entry keeps its lapse', () => {
        const record = createDaemonRenewRecord();
        const grantLapsed = genSampleKeyrackSsoGrant({
          expiresAt: EXPIRES_AT,
        });
        record.set({ grant: grantLapsed, capAt: CAP_AT });
        const [held] = record.entries();
        record.setIfHeld({
          address: held!.address,
          before: held!.entry,
          after: { ...held!.entry, mark: { kind: 'lapsed', error: null } },
        });

        setAllRenewEntriesHaltedByDefect(
          { defect: new TypeError('entries is not iterable') },
          { renewRecord: record, inflight: new Set<string>() },
        );

        expect(record.get({ slug: grantLapsed.slug })?.mark).toEqual({
          kind: 'lapsed',
          error: null,
        });
      });
    });
  });

  given('[case3] an unmarked entry mid-renew from a prior tick', () => {
    when('[t0] a tick-level defect reaches the boundary', () => {
      then(
        'the entry is skipped, so its try can still write its result',
        () => {
          const record = createDaemonRenewRecord();
          const grant = genSampleKeyrackSsoGrant({ expiresAt: EXPIRES_AT });
          record.set({ grant, capAt: CAP_AT });
          const [held] = record.entries();

          setAllRenewEntriesHaltedByDefect(
            { defect: new TypeError('entries is not iterable') },
            { renewRecord: record, inflight: new Set([held!.address]) },
          );

          expect(record.get({ slug: grant.slug })?.mark).toBeNull();
        },
      );
    });
  });

  given('[case2] a defect that is not an Error', () => {
    when('[t0] it reaches the boundary', () => {
      then('the mark holds its text', () => {
        const record = createDaemonRenewRecord();
        const grant = genSampleKeyrackSsoGrant({ expiresAt: EXPIRES_AT });
        record.set({ grant, capAt: CAP_AT });

        setAllRenewEntriesHaltedByDefect(
          { defect: 'a thrown string' },
          { renewRecord: record, inflight: new Set<string>() },
        );

        expect(record.get({ slug: grant.slug })?.mark).toEqual({
          kind: 'halted',
          error: '💥 defect: a thrown string',
        });
      });
    });
  });
});
