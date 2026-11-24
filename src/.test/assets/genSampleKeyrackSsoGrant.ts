import type { IsoTimeStamp } from 'iso-time';

import type { KeyrackKeyReach } from '@src/domain.objects/keyrack/KeyrackKeyReach';

import { genMockKeyrackKeyGrant } from './genMockKeyrackKeyGrant';

/**
 * .what = a sample aws sso grant, the shape the daemon renews
 * .why = the renew suites (record, tick, daemon integration) each need the same sso
 *        grant with a controlled expiry; one fixture keeps a shape change in one place
 *        (rule.require.shared-test-fixtures)
 *
 * .note = the secret is the profile name, as an aws.config sso grant holds it
 * .note = `reach` is omitted unless supplied (see genMockKeyrackKeyGrant, e16)
 */
export const genSampleKeyrackSsoGrant = (input: {
  slug?: string;
  reach?: KeyrackKeyReach;
  expiresAt: IsoTimeStamp;
}): ReturnType<typeof genMockKeyrackKeyGrant> =>
  genMockKeyrackKeyGrant({
    slug: input.slug ?? 'ahbode.camp.AWS_PROFILE',
    key: {
      secret: 'ahbode.camp',
      grade: { protection: 'reference', duration: 'ephemeral' },
    },
    source: { vault: 'aws.config', mech: 'EPHEMERAL_VIA_AWS_SSO' },
    env: 'camp',
    org: 'ahbode',
    ...(input.reach ? { reach: input.reach } : {}),
    expiresAt: input.expiresAt,
  });
