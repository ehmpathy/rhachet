import { asIsoTimeStamp } from 'iso-time';
import { given, then, when } from 'test-fns';

import { genMockKeyrackKeyGrant } from '@src/.test/assets/genMockKeyrackKeyGrant';
import { genSampleKeyrackSsoGrant } from '@src/.test/assets/genSampleKeyrackSsoGrant';
import type { KeyrackKeyGrant } from '@src/domain.objects/keyrack/KeyrackKeyGrant';

import { createDaemonRenewalRecord } from '../domain.objects/daemonRenewalRecord';
import { asDaemonStatusKey } from './asDaemonStatusKey';

const EXPIRES_AT = asIsoTimeStamp('2026-11-14T02:00:00Z');

/**
 * .what = the renewal entry the record files for a grant, under a given max expiry
 */
const genEntryFor = (input: {
  grant: KeyrackKeyGrant;
  expiresAtMax: string;
}) => {
  const record = createDaemonRenewalRecord();
  record.set({
    grant: input.grant,
    expiresAtMax: asIsoTimeStamp(input.expiresAtMax),
  });
  return record.entries()[0]!.entry;
};

describe('asDaemonStatusKey', () => {
  given('[case1] a grant with no renewal entry', () => {
    when('[t0] it is cast', () => {
      const key = asDaemonStatusKey({
        grant: genSampleKeyrackSsoGrant({ expiresAt: EXPIRES_AT }),
        renewalEntry: null,
        expiresIn: { minutes: 1 },
      });

      then('the key carries no renewal field at all', () => {
        expect('renewal' in key).toEqual(false);
        expect(key.expiresAt).toEqual(EXPIRES_AT);
        expect(key.expiresIn).toEqual({ minutes: 1 });
      });
    });
  });

  given('[case2] a grant with a renewal entry below its max', () => {
    when('[t0] it is cast', () => {
      const grant = genSampleKeyrackSsoGrant({ expiresAt: EXPIRES_AT });
      const key = asDaemonStatusKey({
        grant,
        renewalEntry: genEntryFor({
          grant,
          expiresAtMax: '2026-11-14T09:00:00Z',
        }),
        expiresIn: { minutes: 1 },
      });

      then('the renewal reads `on`, its count, and no error', () => {
        expect(key.renewal).toEqual({
          status: 'on',
          count: { renewed: 0 },
          error: null,
        });
      });
    });
  });

  given('[case3] a grant whose expiry already sits at its max', () => {
    when('[t0] it is cast', () => {
      const grant = genSampleKeyrackSsoGrant({ expiresAt: EXPIRES_AT });
      const key = asDaemonStatusKey({
        grant,
        renewalEntry: genEntryFor({ grant, expiresAtMax: EXPIRES_AT }),
        expiresIn: { minutes: 1 },
      });

      then('the renewal reads `off`, since no more renewals will come', () => {
        expect(key.renewal?.status).toEqual('off');
      });
    });
  });

  given('[case4] a renewal entry that halted, with a count', () => {
    when('[t0] it is cast', () => {
      const grant = genSampleKeyrackSsoGrant({ expiresAt: EXPIRES_AT });
      const entry = genEntryFor({
        grant,
        expiresAtMax: '2026-11-14T09:00:00Z',
      });
      const key = asDaemonStatusKey({
        grant,
        renewalEntry: {
          ...entry,
          status: 'halted',
          count: { renewed: 3, faulted: 3 },
          error: 'renew timed out',
        },
        expiresIn: { seconds: 0 },
      });

      then(
        'the key carries the status, the count, and the error as filed',
        () => {
          expect(key.renewal).toEqual({
            status: 'halted',
            count: { renewed: 3 },
            error: 'renew timed out',
          });
          expect(key.expiresIn).toEqual({ seconds: 0 });
        },
      );
    });
  });

  given('[case5] a grant with no expiry', () => {
    when('[t0] it is cast', () => {
      const key = asDaemonStatusKey({
        grant: genMockKeyrackKeyGrant({ slug: 'ahbode.camp.AWS_PROFILE' }),
        renewalEntry: null,
        expiresIn: null,
      });

      then('the expiry and the expiresIn both read null, never zero', () => {
        expect(key.expiresAt).toEqual(null);
        expect(key.expiresIn).toEqual(null);
      });
    });
  });
});
