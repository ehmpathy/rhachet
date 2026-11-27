import { asIsoTimeStamp } from 'iso-time';
import { given, then, when } from 'test-fns';

import { genSampleKeyrackSsoGrant } from '@src/.test/assets/genSampleKeyrackSsoGrant';

import { createDaemonRenewalRecord } from '../domain.objects/daemonRenewalRecord';
import { setAllRenewalEntriesHaltedByDefect } from './setAllRenewalEntriesHaltedByDefect';

const EXPIRES_AT_MAX = asIsoTimeStamp('2026-11-14T09:00:00Z');
const EXPIRES_AT = asIsoTimeStamp('2026-11-14T01:00:00Z');

describe('setAllRenewalEntriesHaltedByDefect', () => {
  given('[case1] a record with one `on` entry and one lapsed entry', () => {
    when('[t0] a tick-level defect reaches the boundary', () => {
      then('the `on` entry is halted with the defect, class named', () => {
        const record = createDaemonRenewalRecord();
        const grantLive = genSampleKeyrackSsoGrant({
          slug: 'ahbode.camp.AWS_PROFILE',
          expiresAt: EXPIRES_AT,
        });
        const grantLapsed = genSampleKeyrackSsoGrant({
          slug: 'ahbode.camp.OTHER_PROFILE',
          expiresAt: EXPIRES_AT,
        });
        record.set({ grant: grantLive, expiresAtMax: EXPIRES_AT_MAX });
        record.set({ grant: grantLapsed, expiresAtMax: EXPIRES_AT_MAX });
        const heldLapsed = record
          .entries()
          .find(({ entry }) => entry.grant.slug === grantLapsed.slug)!;
        record.setIfHeld({
          address: heldLapsed.address,
          before: heldLapsed.entry,
          after: { ...heldLapsed.entry, status: 'lapsed' },
        });

        setAllRenewalEntriesHaltedByDefect(
          { defect: new TypeError('entries is not iterable') },
          { renewalRecord: record, inflight: new Set<string>() },
        );

        expect(record.get({ slug: grantLive.slug })).toMatchObject({
          status: 'halted',
          error: '💥 defect TypeError: entries is not iterable',
        });
      });

      then('the lapsed entry keeps its lapse', () => {
        const record = createDaemonRenewalRecord();
        const grantLapsed = genSampleKeyrackSsoGrant({
          expiresAt: EXPIRES_AT,
        });
        record.set({ grant: grantLapsed, expiresAtMax: EXPIRES_AT_MAX });
        const [held] = record.entries();
        record.setIfHeld({
          address: held!.address,
          before: held!.entry,
          after: { ...held!.entry, status: 'lapsed' },
        });

        setAllRenewalEntriesHaltedByDefect(
          { defect: new TypeError('entries is not iterable') },
          { renewalRecord: record, inflight: new Set<string>() },
        );

        expect(record.get({ slug: grantLapsed.slug })).toMatchObject({
          status: 'lapsed',
          error: null,
        });
      });
    });
  });

  given('[case3] an `on` entry mid-renew from a prior tick', () => {
    when('[t0] a tick-level defect reaches the boundary', () => {
      then(
        'the entry is skipped, so its try can still write its result',
        () => {
          const record = createDaemonRenewalRecord();
          const grant = genSampleKeyrackSsoGrant({ expiresAt: EXPIRES_AT });
          record.set({ grant, expiresAtMax: EXPIRES_AT_MAX });
          const [held] = record.entries();

          setAllRenewalEntriesHaltedByDefect(
            { defect: new TypeError('entries is not iterable') },
            { renewalRecord: record, inflight: new Set([held!.address]) },
          );

          expect(record.get({ slug: grant.slug })?.status).toEqual('on');
        },
      );
    });
  });

  given('[case2] a defect that is not an Error', () => {
    when('[t0] it reaches the boundary', () => {
      then('the error holds its text', () => {
        const record = createDaemonRenewalRecord();
        const grant = genSampleKeyrackSsoGrant({ expiresAt: EXPIRES_AT });
        record.set({ grant, expiresAtMax: EXPIRES_AT_MAX });

        setAllRenewalEntriesHaltedByDefect(
          { defect: 'a thrown string' },
          { renewalRecord: record, inflight: new Set<string>() },
        );

        expect(record.get({ slug: grant.slug })).toMatchObject({
          status: 'halted',
          error: '💥 defect: a thrown string',
        });
      });
    });
  });
});
