import { asIsoTimeStamp } from 'iso-time';

import { genSampleKeyrackSsoGrant } from '@src/.test/assets/genSampleKeyrackSsoGrant';

import type { DaemonRenewalEntry } from '../domain.objects/daemonRenewalRecord';
import { getAllStatusKeysRenewalStopped } from './getAllStatusKeysRenewalStopped';

const grant = genSampleKeyrackSsoGrant({
  expiresAt: asIsoTimeStamp('2026-11-14T01:00:00Z'),
});

/**
 * .what = one renewal entry for the sample grant, with a given status
 */
const genEntry = (input: {
  status: DaemonRenewalEntry['status'];
}): { address: string; entry: DaemonRenewalEntry } => ({
  address: grant.slug,
  entry: {
    grant,
    expiresAtMax: asIsoTimeStamp('2026-11-14T09:00:00Z'),
    status: input.status,
    count: { renewed: 3, faulted: 0 },
    error: null,
  },
});

const TEST_CASES = [
  {
    description:
      'a lapsed entry whose grant left the store yields an expired key',
    given: { entry: genEntry({ status: 'lapsed' }), grantsLive: [] },
    expect: { keys: 1 },
  },
  {
    description: 'a lapsed entry whose grant is still live yields no key here',
    given: { entry: genEntry({ status: 'lapsed' }), grantsLive: [grant] },
    expect: { keys: 0 },
  },
  {
    description: 'an `on` entry yields no key',
    given: { entry: genEntry({ status: 'on' }), grantsLive: [] },
    expect: { keys: 0 },
  },
];

describe('getAllStatusKeysRenewalStopped', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      const keys = getAllStatusKeysRenewalStopped({
        renewalEntries: [thisCase.given.entry],
        grantsLive: thisCase.given.grantsLive,
      });
      expect(keys.length).toEqual(thisCase.expect.keys);
    }),
  );

  test('the expired key carries no time left and the renewal state', () => {
    const [key] = getAllStatusKeysRenewalStopped({
      renewalEntries: [genEntry({ status: 'lapsed' })],
      grantsLive: [],
    });
    expect(key).toMatchObject({
      slug: grant.slug,
      expiresIn: { seconds: 0 },
      renewal: { status: 'lapsed', count: { renewed: 3 }, error: null },
    });
  });
});
