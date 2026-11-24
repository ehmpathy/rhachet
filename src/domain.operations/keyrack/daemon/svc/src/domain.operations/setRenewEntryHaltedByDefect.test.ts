import { asIsoTimeStamp } from 'iso-time';
import { given, then, when } from 'test-fns';

import { genSampleKeyrackSsoGrant } from '@src/.test/assets/genSampleKeyrackSsoGrant';

import { createDaemonRenewRecord } from '../domain.objects/daemonRenewRecord';
import { setRenewEntryHaltedByDefect } from './setRenewEntryHaltedByDefect';

const CAP_AT = asIsoTimeStamp('2026-11-14T09:00:00Z');
const EXPIRES_AT = asIsoTimeStamp('2026-11-14T01:00:00Z');
const DEFECT = '💥 defect TypeError: entries is not iterable';

describe('setRenewEntryHaltedByDefect', () => {
  given('[case1] an unmarked entry, still the one held', () => {
    when('[t0] a defect is set on it', () => {
      then('the entry is halted with the defect text', () => {
        const record = createDaemonRenewRecord();
        const grant = genSampleKeyrackSsoGrant({ expiresAt: EXPIRES_AT });
        record.set({ grant, capAt: CAP_AT });
        const [held] = record.entries();

        setRenewEntryHaltedByDefect(
          { address: held!.address, entry: held!.entry, error: DEFECT },
          { renewRecord: record },
        );

        expect(record.get({ slug: grant.slug })?.mark).toEqual({
          kind: 'halted',
          error: DEFECT,
        });
      });
    });
  });

  given('[case2] an entry an unlock replaced after it was read', () => {
    when('[t0] a defect is set on the stale read', () => {
      then('the fresh entry wins, unmarked', () => {
        const record = createDaemonRenewRecord();
        const grant = genSampleKeyrackSsoGrant({ expiresAt: EXPIRES_AT });
        record.set({ grant, capAt: CAP_AT });
        const [stale] = record.entries();

        // an unlock lands meanwhile, and files a fresh entry at the same address
        record.set({
          grant: genSampleKeyrackSsoGrant({
            expiresAt: asIsoTimeStamp('2026-11-14T02:00:00Z'),
          }),
          capAt: CAP_AT,
        });

        setRenewEntryHaltedByDefect(
          { address: stale!.address, entry: stale!.entry, error: DEFECT },
          { renewRecord: record },
        );

        expect(record.get({ slug: grant.slug })?.mark).toBeNull();
      });
    });
  });

  given('[case3] an entry a relock removed after it was read', () => {
    when('[t0] a defect is set on the stale read', () => {
      then('no entry comes back', () => {
        const record = createDaemonRenewRecord();
        const grant = genSampleKeyrackSsoGrant({ expiresAt: EXPIRES_AT });
        record.set({ grant, capAt: CAP_AT });
        const [stale] = record.entries();
        record.del({ slug: grant.slug });

        setRenewEntryHaltedByDefect(
          { address: stale!.address, entry: stale!.entry, error: DEFECT },
          { renewRecord: record },
        );

        expect(record.get({ slug: grant.slug })).toBeNull();
      });
    });
  });
});
