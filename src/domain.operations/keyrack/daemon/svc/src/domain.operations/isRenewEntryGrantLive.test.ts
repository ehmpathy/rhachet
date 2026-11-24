import { asIsoTimeStamp } from 'iso-time';
import { given, then, when } from 'test-fns';

import { genMockKeyrackKeyGrant } from '@src/.test/assets/genMockKeyrackKeyGrant';
import { genSampleKeyrackSsoGrant } from '@src/.test/assets/genSampleKeyrackSsoGrant';
import type { KeyrackKeyGrant } from '@src/domain.objects/keyrack/KeyrackKeyGrant';

import { createDaemonRenewRecord } from '../domain.objects/daemonRenewRecord';
import { isRenewEntryGrantLive } from './isRenewEntryGrantLive';

const CAP_AT = asIsoTimeStamp('2026-11-14T09:00:00Z');
const NOW = asIsoTimeStamp('2026-11-14T01:00:00Z');

/**
 * .what = the renew entry the record files for a grant
 */
const genEntryFor = (input: { grant: KeyrackKeyGrant }) => {
  const record = createDaemonRenewRecord();
  record.set({ grant: input.grant, capAt: CAP_AT });
  return record.entries()[0]!.entry;
};

describe('isRenewEntryGrantLive', () => {
  given('[case1] a grant whose expiry is after now', () => {
    when('[t0] it is checked', () => {
      then('it reads as live', () => {
        const entry = genEntryFor({
          grant: genSampleKeyrackSsoGrant({
            expiresAt: asIsoTimeStamp('2026-11-14T01:00:01Z'),
          }),
        });
        expect(isRenewEntryGrantLive({ entry, now: NOW })).toEqual(true);
      });
    });
  });

  given('[case2] a grant whose expiry is exactly now', () => {
    when('[t0] it is checked', () => {
      then('it reads as not live, so a stall counts as a fault', () => {
        const entry = genEntryFor({
          grant: genSampleKeyrackSsoGrant({ expiresAt: NOW }),
        });
        expect(isRenewEntryGrantLive({ entry, now: NOW })).toEqual(false);
      });
    });
  });

  given('[case3] a grant whose expiry is before now', () => {
    when('[t0] it is checked', () => {
      then('it reads as not live', () => {
        const entry = genEntryFor({
          grant: genSampleKeyrackSsoGrant({
            expiresAt: asIsoTimeStamp('2026-11-14T00:59:59Z'),
          }),
        });
        expect(isRenewEntryGrantLive({ entry, now: NOW })).toEqual(false);
      });
    });
  });

  given('[case4] a grant with no expiry', () => {
    when('[t0] it is checked', () => {
      then('it reads as not live, so a stall counts rather than waits', () => {
        const entry = genEntryFor({
          grant: genMockKeyrackKeyGrant({ slug: 'ahbode.camp.AWS_PROFILE' }),
        });
        expect(isRenewEntryGrantLive({ entry, now: NOW })).toEqual(false);
      });
    });
  });
});
