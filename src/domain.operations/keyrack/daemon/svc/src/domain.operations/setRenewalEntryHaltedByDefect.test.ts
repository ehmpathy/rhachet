import { asIsoTimeStamp } from 'iso-time';
import { given, then, when } from 'test-fns';

import { genSampleKeyrackSsoGrant } from '@src/.test/assets/genSampleKeyrackSsoGrant';

import { createDaemonRenewalRecord } from '../domain.objects/daemonRenewalRecord';
import { setRenewalEntryHaltedByDefect } from './setRenewalEntryHaltedByDefect';

const EXPIRES_AT_MAX = asIsoTimeStamp('2026-11-14T09:00:00Z');
const EXPIRES_AT = asIsoTimeStamp('2026-11-14T01:00:00Z');
const DEFECT = '💥 defect TypeError: entries is not iterable';

describe('setRenewalEntryHaltedByDefect', () => {
  given('[case1] an `on` entry, still the one held', () => {
    when('[t0] a defect is set on it', () => {
      then('the entry is halted with the defect text', () => {
        const record = createDaemonRenewalRecord();
        const grant = genSampleKeyrackSsoGrant({ expiresAt: EXPIRES_AT });
        record.set({ grant, expiresAtMax: EXPIRES_AT_MAX });
        const [held] = record.entries();

        setRenewalEntryHaltedByDefect(
          { address: held!.address, entry: held!.entry, error: DEFECT },
          { renewalRecord: record },
        );

        expect(record.get({ slug: grant.slug })).toMatchObject({
          status: 'halted',
          error: DEFECT,
        });
      });
    });
  });

  given('[case2] an entry an unlock replaced after it was read', () => {
    when('[t0] a defect is set on the stale read', () => {
      then('the fresh entry wins, still `on`', () => {
        const record = createDaemonRenewalRecord();
        const grant = genSampleKeyrackSsoGrant({ expiresAt: EXPIRES_AT });
        record.set({ grant, expiresAtMax: EXPIRES_AT_MAX });
        const [stale] = record.entries();

        // an unlock lands meanwhile, and files a fresh entry at the same address
        record.set({
          grant: genSampleKeyrackSsoGrant({
            expiresAt: asIsoTimeStamp('2026-11-14T02:00:00Z'),
          }),
          expiresAtMax: EXPIRES_AT_MAX,
        });

        setRenewalEntryHaltedByDefect(
          { address: stale!.address, entry: stale!.entry, error: DEFECT },
          { renewalRecord: record },
        );

        expect(record.get({ slug: grant.slug })?.status).toEqual('on');
      });
    });
  });

  given('[case3] an entry a relock removed after it was read', () => {
    when('[t0] a defect is set on the stale read', () => {
      then('no entry comes back', () => {
        const record = createDaemonRenewalRecord();
        const grant = genSampleKeyrackSsoGrant({ expiresAt: EXPIRES_AT });
        record.set({ grant, expiresAtMax: EXPIRES_AT_MAX });
        const [stale] = record.entries();
        record.del({ slug: grant.slug });

        setRenewalEntryHaltedByDefect(
          { address: stale!.address, entry: stale!.entry, error: DEFECT },
          { renewalRecord: record },
        );

        expect(record.get({ slug: grant.slug })).toBeNull();
      });
    });
  });
});
