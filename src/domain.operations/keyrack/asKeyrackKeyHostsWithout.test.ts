import { given, then, when } from 'test-fns';

import { KeyrackKeyHost } from '@src/domain.objects/keyrack';

import { asKeyrackKeyHostsWithout } from './asKeyrackKeyHostsWithout';

const hostAt = (slug: string): KeyrackKeyHost =>
  new KeyrackKeyHost({
    slug,
    exid: null,
    vault: 'os.direct',
    mech: 'PERMANENT_VIA_REPLICA',
    env: 'all',
    org: '@all',
    meta: null,
    maxDuration: null,
    createdAt: '2026-11-14T00:00:00.000Z',
    updatedAt: '2026-11-14T00:00:00.000Z',
  });

describe('asKeyrackKeyHostsWithout', () => {
  given('[case1] hosts that hold the address and a peer', () => {
    const hosts = { 'a.KEY': hostAt('a.KEY'), 'b.KEY': hostAt('b.KEY') };

    when('[t0] the address is dropped', () => {
      then('only the peer is kept', () => {
        expect(asKeyrackKeyHostsWithout({ hosts, address: 'a.KEY' })).toEqual({
          'b.KEY': hosts['b.KEY'],
        });
      });

      then('the input is left as it was', () => {
        asKeyrackKeyHostsWithout({ hosts, address: 'a.KEY' });
        expect(Object.keys(hosts)).toEqual(['a.KEY', 'b.KEY']);
      });
    });
  });

  given('[case2] hosts that lack the address', () => {
    when('[t0] the address is dropped', () => {
      then('it returns null, so no write is owed', () => {
        expect(
          asKeyrackKeyHostsWithout({
            hosts: { 'b.KEY': hostAt('b.KEY') },
            address: 'a.KEY',
          }),
        ).toBeNull();
      });
    });
  });
});
