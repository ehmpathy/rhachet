import { asIsoTimeStamp } from 'iso-time';
import { given, then, when } from 'test-fns';

import { genSampleKeyrackSsoGrant } from '@src/.test/assets/genSampleKeyrackSsoGrant';

import { getOneUnlockRenewalForGrant } from './getOneUnlockRenewalForGrant';

const CAP_AT = asIsoTimeStamp('2026-11-14T09:00:00Z');
const EXPIRES_AT = asIsoTimeStamp('2026-11-14T01:00:00Z');

describe('getOneUnlockRenewalForGrant', () => {
  given('[case1] a renewal at the grant exact address', () => {
    when('[t0] the grant is looked up', () => {
      then('that renewal is returned', () => {
        const grant = genSampleKeyrackSsoGrant({ expiresAt: EXPIRES_AT });
        const renewal = { slug: grant.slug, capAt: CAP_AT };
        expect(
          getOneUnlockRenewalForGrant({ grant, renewals: [renewal] }),
        ).toEqual(renewal);
      });
    });
  });

  given('[case2] a renewal for another slug only', () => {
    when('[t0] the grant is looked up', () => {
      then('null is returned, so the grant is not opted in', () => {
        const grant = genSampleKeyrackSsoGrant({ expiresAt: EXPIRES_AT });
        expect(
          getOneUnlockRenewalForGrant({
            grant,
            renewals: [{ slug: 'ahbode.camp.OTHER_KEY', capAt: CAP_AT }],
          }),
        ).toBeNull();
      });
    });
  });

  given('[case3] a renewal for the same slug at another reach', () => {
    when('[t0] a reachless grant is looked up', () => {
      then('null is returned; the match is by full address', () => {
        const grant = genSampleKeyrackSsoGrant({ expiresAt: EXPIRES_AT });
        expect(
          getOneUnlockRenewalForGrant({
            grant,
            renewals: [
              {
                slug: grant.slug,
                reach: { exid: 'github://org=ahbode' },
                capAt: CAP_AT,
              },
            ],
          }),
        ).toBeNull();
      });
    });
  });

  given('[case4] no renewals on the wire', () => {
    when('[t0] the grant is looked up', () => {
      then('null is returned', () => {
        const grant = genSampleKeyrackSsoGrant({ expiresAt: EXPIRES_AT });
        expect(getOneUnlockRenewalForGrant({ grant, renewals: [] })).toBeNull();
      });
    });
  });
});
