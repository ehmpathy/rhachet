import { MalfunctionError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { KeyrackKeyHost, KeyrackKeyReach } from '@src/domain.objects/keyrack';

import { assertKeyrackHostAddressed } from './assertKeyrackHostAddressed';

/**
 * .what = clamps that a host-manifest entry whose map key disagrees with its own `slug` and
 *         `reach` halts the load, rather than yields a wrong-reach credential in silence
 * .why = the manifest records a key's reach TWICE, and DIFFERENT halves of the system
 *        read different copies: lookup addresses by the map KEY, while `unlockKeyrackKeys`
 *        builds its grant from the entry's `reach` FIELD and `daemonKeyStore.set` re-keys off
 *        that grant. so an entry filed under one reach whose field names another hands
 *        back a credential for the wrong reach with no error at any point — e18's class
 * .note = `[case3]` is the clamp that bites hardest: a reach-key filed under its BARE slug.
 *         under the defect it loads clean, then answers a reachless ask with a reach-key's
 *         credential (rule.require.clamp-edge-cases)
 */
describe('assertKeyrackHostAddressed', () => {
  const aHost = (input: {
    slug: string;
    reach?: KeyrackKeyReach;
  }): KeyrackKeyHost =>
    new KeyrackKeyHost({
      slug: input.slug,
      exid: null,
      vault: 'os.secure',
      mech: 'PERMANENT_VIA_REPLICA',
      env: 'test',
      org: 'ehmpathy',
      // spread rather than assign, so an absent reach leaves NO key at all (e16)
      ...(input.reach ? { reach: input.reach } : {}),
      meta: {},
      maxDuration: null,
      createdAt: '2026-08-03T00:00:00Z',
      updatedAt: '2026-08-03T00:00:00Z',
    } as KeyrackKeyHost);

  given('[case1] a reachless entry filed under its bare slug', () => {
    when('[t0] the entry is checked', () => {
      then('it does not throw — this is every key that exists today', () => {
        expect(() =>
          assertKeyrackHostAddressed({
            address: 'ehmpathy.test.FOO',
            host: aHost({ slug: 'ehmpathy.test.FOO' }),
          }),
        ).not.toThrow();
      });
    });
  });

  given('[case2] a reach entry filed under its composite address', () => {
    const reach = new KeyrackKeyReach({ exid: 'github://org=ahbode' });

    when('[t0] the entry is checked', () => {
      then('it does not throw — key and field agree', () => {
        expect(() =>
          assertKeyrackHostAddressed({
            address: 'ehmpathy.test.FOO@github://org=ahbode',
            host: aHost({ slug: 'ehmpathy.test.FOO', reach }),
          }),
        ).not.toThrow();
      });
    });
  });

  given('[case3] a reach entry filed under the BARE slug', () => {
    // .note = THIS is the drift that costs the most. the entry loads as the reachless key,
    //         so a reachless ask finds it — and then `unlockKeyrackKeys` reads the FIELD and
    //         mints for a reach the caller never named
    const reach = new KeyrackKeyReach({ exid: 'github://org=ahbode' });

    when('[t0] the entry is checked', () => {
      then(
        'it throws a MalfunctionError — a corrupt file, not a setup gap',
        async () => {
          const error = await getError(async () =>
            assertKeyrackHostAddressed({
              address: 'ehmpathy.test.FOO',
              host: aHost({ slug: 'ehmpathy.test.FOO', reach }),
            }),
          );
          expect(error).toBeInstanceOf(MalfunctionError);
        },
      );

      then(
        'the message names BOTH the filed key and the expected one',
        async () => {
          const error = await getError(async () =>
            assertKeyrackHostAddressed({
              address: 'ehmpathy.test.FOO',
              host: aHost({ slug: 'ehmpathy.test.FOO', reach }),
            }),
          );
          expect(error.message).toContain('misaddressed');
          expect(error.message).toContain(`filed under 'ehmpathy.test.FOO'`);
          expect(error.message).toContain(
            `describe 'ehmpathy.test.FOO@github://org=ahbode'`,
          );
        },
      );
    });
  });

  given('[case4] a reachless entry filed under a composite address', () => {
    // the mirror of case3: the key claims a reach the entry's own fields do not
    when('[t0] the entry is checked', () => {
      then(
        'it throws — an absent field cannot back a reach address',
        async () => {
          const error = await getError(async () =>
            assertKeyrackHostAddressed({
              address: 'ehmpathy.test.FOO@github://org=ahbode',
              host: aHost({ slug: 'ehmpathy.test.FOO' }),
            }),
          );
          expect(error).toBeInstanceOf(MalfunctionError);
        },
      );
    });
  });

  given('[case5] a reach entry filed under a DIFFERENT reach', () => {
    // both halves name a reach, and they are not the same reach
    const reach = new KeyrackKeyReach({ exid: 'github://org=ahbode' });

    when('[t0] the entry is checked', () => {
      then('it throws — two reaches, one entry', async () => {
        const error = await getError(async () =>
          assertKeyrackHostAddressed({
            address: 'ehmpathy.test.FOO@github://org=seaturtle',
            host: aHost({ slug: 'ehmpathy.test.FOO', reach }),
          }),
        );
        expect(error).toBeInstanceOf(MalfunctionError);
      });
    });
  });

  given('[case6] an exid that legally holds an `@`', () => {
    // an email is the obvious name for an account, so the address is CONSTRUCT-only —
    // a parse back into parts would need a split rule this label defeats
    const reach = new KeyrackKeyReach({ exid: 'beav@ehmpathy.com' });

    when('[t0] the entry is checked', () => {
      then(
        'it does not throw — rebuild-and-compare needs no split rule',
        () => {
          expect(() =>
            assertKeyrackHostAddressed({
              address: 'ehmpathy.test.FOO@beav@ehmpathy.com',
              host: aHost({ slug: 'ehmpathy.test.FOO', reach }),
            }),
          ).not.toThrow();
        },
      );
    });
  });
});
