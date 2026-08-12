import { given, then, when } from 'test-fns';

import type { KeyrackGrantAttempt } from '@src/domain.objects/keyrack/KeyrackGrantAttempt';
import { asKeyrackKeyReach } from '@src/domain.operations/keyrack/reach/asKeyrackKeyReach';

import {
  asKeyrackAttemptAddress,
  asKeyrackAttemptReach,
} from './asKeyrackAttemptAddress';

/**
 * .what = an attempt's address is its slug AND the reach it asked for
 * .why = any collection keyed by slug alone evicts one reach with another. under a sweep
 *        that enumerates reaches, that eviction reads as a STATUS — a locked reach
 *        rendered as granted because its reachless peer was
 */
describe('asKeyrackAttemptAddress', () => {
  const reachBeav = asKeyrackKeyReach({ exid: 'beav@ehmpathy.com' });

  const asLocked = (input: {
    slug: string;
    reach?: ReturnType<typeof asKeyrackKeyReach>;
  }): KeyrackGrantAttempt => ({
    status: 'locked',
    slug: input.slug,
    ...(input.reach ? { reach: input.reach } : {}),
    message: 'locked',
  });

  given('[case1:e1] an attempt that names no reach', () => {
    const attempt = asLocked({ slug: 'ehmpathy.test.ANTHROPIC_API_KEY' });

    when('[t0] it is addressed', () => {
      then('the address is its bare slug, byte for byte', () => {
        expect(asKeyrackAttemptAddress({ attempt })).toEqual(
          'ehmpathy.test.ANTHROPIC_API_KEY',
        );
      });

      then('its reach reads as absent, never null', () => {
        expect(asKeyrackAttemptReach({ attempt })).toBeUndefined();
      });
    });
  });

  given('[case2] two attempts of ONE slug at different reaches', () => {
    const attemptReachless = asLocked({
      slug: 'ehmpathy.test.ANTHROPIC_API_KEY',
    });
    const attemptAtReach = asLocked({
      slug: 'ehmpathy.test.ANTHROPIC_API_KEY',
      reach: reachBeav,
    });

    when('[t0] both are addressed', () => {
      // ⚠️ THE clamp. these two attempts share a slug, so a slug-keyed Map holds ONE entry
      //    for them and the second write evicts the first. that is the silent eviction
      //    reach-as-identity exists to remove, and it would land at the very last line of
      //    the get-or-unlock pipeline where a merge reports one status for both
      then('their addresses differ, so a Map holds both', () => {
        const addressReachless = asKeyrackAttemptAddress({
          attempt: attemptReachless,
        });
        const addressAtReach = asKeyrackAttemptAddress({
          attempt: attemptAtReach,
        });
        expect(addressReachless).not.toEqual(addressAtReach);

        const byAddress = new Map([
          [addressReachless, attemptReachless],
          [addressAtReach, attemptAtReach],
        ]);
        expect(byAddress.size).toEqual(2);
      });

      then(
        'the reach is carried onto the attempt, not the message alone',
        () => {
          expect(asKeyrackAttemptReach({ attempt: attemptAtReach })).toEqual(
            reachBeav,
          );
        },
      );
    });
  });

  given('[case3] a GRANTED attempt, whose reach sits on its grant', () => {
    const attempt: KeyrackGrantAttempt = {
      status: 'granted',
      grant: {
        slug: 'ehmpathy.test.ANTHROPIC_API_KEY',
        reach: reachBeav,
      } as KeyrackGrantAttempt extends { grant: infer G } ? G : never,
    };

    when('[t0] it is addressed', () => {
      // the split this operation exists to hide: a granted attempt carries its identity
      // under `grant`, every other status carries it flat. a caller that re-derives the
      // split at each site is one forgotten branch away from a slug-keyed collection
      then('it addresses the same way a non-granted attempt does', () => {
        expect(asKeyrackAttemptAddress({ attempt })).toEqual(
          'ehmpathy.test.ANTHROPIC_API_KEY@beav@ehmpathy.com',
        );
      });
    });
  });
});
