import { asIsoTimeStamp } from 'iso-time';
import { given, then, when } from 'test-fns';

import { genMockKeyrackKeyGrant } from '@src/.test/assets/genMockKeyrackKeyGrant';
import { genSampleKeyrackSsoGrant } from '@src/.test/assets/genSampleKeyrackSsoGrant';
import type { KeyrackKeyGrant } from '@src/domain.objects/keyrack/KeyrackKeyGrant';

import { createDaemonRenewRecord } from '../domain.objects/daemonRenewRecord';
import { asDaemonStatusRow } from './asDaemonStatusRow';

const EXPIRES_AT = asIsoTimeStamp('2026-11-14T02:00:00Z');

/**
 * .what = the renew entry the record files for a grant, under a given cap
 */
const genEntryFor = (input: { grant: KeyrackKeyGrant; capAt: string }) => {
  const record = createDaemonRenewRecord();
  record.set({ grant: input.grant, capAt: asIsoTimeStamp(input.capAt) });
  return record.entries()[0]!.entry;
};

describe('asDaemonStatusRow', () => {
  given('[case1] a grant with no renew entry', () => {
    when('[t0] it is cast', () => {
      const row = asDaemonStatusRow({
        grant: genSampleKeyrackSsoGrant({ expiresAt: EXPIRES_AT }),
        renewEntry: null,
        ttlLeftMs: 60_000,
      });

      then('the row carries no renew field at all', () => {
        expect('renew' in row).toEqual(false);
        expect(row.expiresAt).toEqual(EXPIRES_AT);
        expect(row.ttlLeftMs).toEqual(60_000);
      });
    });
  });

  given('[case2] a grant with a renew entry below its cap', () => {
    when('[t0] it is cast', () => {
      const grant = genSampleKeyrackSsoGrant({ expiresAt: EXPIRES_AT });
      const row = asDaemonStatusRow({
        grant,
        renewEntry: genEntryFor({ grant, capAt: '2026-11-14T09:00:00Z' }),
        ttlLeftMs: 60_000,
      });

      then('the renew reads its count and no mark, with no cap flag', () => {
        expect(row.renew).toEqual({ renewedCount: 0, mark: null });
      });
    });
  });

  given('[case3] a grant whose expiry already sits at its cap', () => {
    when('[t0] it is cast', () => {
      const grant = genSampleKeyrackSsoGrant({ expiresAt: EXPIRES_AT });
      const row = asDaemonStatusRow({
        grant,
        renewEntry: genEntryFor({ grant, capAt: EXPIRES_AT }),
        ttlLeftMs: 60_000,
      });

      then('the renew carries the cap flag, set to true', () => {
        expect(row.renew?.isAtCap).toEqual(true);
      });
    });
  });

  given('[case4] a renew entry that carries a mark and a count', () => {
    when('[t0] it is cast', () => {
      const grant = genSampleKeyrackSsoGrant({ expiresAt: EXPIRES_AT });
      const entry = genEntryFor({ grant, capAt: '2026-11-14T09:00:00Z' });
      const row = asDaemonStatusRow({
        grant,
        renewEntry: {
          ...entry,
          renewedCount: 3,
          mark: { kind: 'lapsed', error: null },
        },
        ttlLeftMs: 0,
      });

      then('the row carries the mark and the count as filed', () => {
        expect(row.renew).toEqual({
          renewedCount: 3,
          mark: { kind: 'lapsed', error: null },
        });
        expect(row.ttlLeftMs).toEqual(0);
      });
    });
  });

  given('[case5] a grant with no expiry', () => {
    when('[t0] it is cast', () => {
      const row = asDaemonStatusRow({
        grant: genMockKeyrackKeyGrant({ slug: 'ahbode.camp.AWS_PROFILE' }),
        renewEntry: null,
        ttlLeftMs: null,
      });

      then('the expiry and the ttl both read null, never zero', () => {
        expect(row.expiresAt).toEqual(null);
        expect(row.ttlLeftMs).toEqual(null);
      });
    });
  });
});
