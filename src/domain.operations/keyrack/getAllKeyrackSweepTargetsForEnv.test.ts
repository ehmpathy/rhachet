import { given, then, when } from 'test-fns';

import { genMockKeyrackRepoManifest } from '@src/.test/assets/genMockKeyrackRepoManifest';
import { asKeyrackKeyReach } from '@src/domain.operations/keyrack/reach/asKeyrackKeyReach';

import { getAllKeyrackSweepTargetsForEnv } from './getAllKeyrackSweepTargetsForEnv';

/**
 * .what = the sweep must ask for every (key × reach) a repo declares
 * .why = a slug-keyed sweep returns the reachless credential and reports not one word about
 *        the reaches declared beside it — the silent omission this feature closes
 */
describe('getAllKeyrackSweepTargetsForEnv', () => {
  const reachBeav = asKeyrackKeyReach({ exid: 'beav@ehmpathy.com' });
  const reachVlad = asKeyrackKeyReach({ exid: 'vlad@ehmpathy.com' });

  given('[case1:e1] a manifest where no key declares a reach', () => {
    const manifest = genMockKeyrackRepoManifest({
      org: 'ehmpathy',
      envs: ['test'],
      keys: {
        'ehmpathy.test.AWS_PROFILE': { env: 'test', name: 'AWS_PROFILE' },
        'ehmpathy.test.XAI_API_KEY': { env: 'test', name: 'XAI_API_KEY' },
      },
    });

    when('[t0] the sweep targets are derived', () => {
      const targets = getAllKeyrackSweepTargetsForEnv({
        manifest,
        env: 'test',
      });

      then('there is exactly one target per slug', () => {
        expect(targets).toHaveLength(2);
      });

      // ⚠️ this is the e1 clamp, and it is why `reach` must be ABSENT rather than null.
      //    a `reach: null` on every target would serialize onto the daemon wire and into
      //    `--json`, so a repo that declares no reach would render differently than it
      //    does today — the byte-identical guarantee broken by the enumerate that was
      //    supposed to leave it untouched
      then(
        'not one target names a reach, and none carries the key at all',
        () => {
          expect(targets).toEqual([
            { slug: 'ehmpathy.test.AWS_PROFILE' },
            { slug: 'ehmpathy.test.XAI_API_KEY' },
          ]);
          expect(targets.every((target) => !('reach' in target))).toBe(true);
        },
      );
    });
  });

  given('[case2] a manifest where one key declares two reaches', () => {
    const manifest = genMockKeyrackRepoManifest({
      org: 'ehmpathy',
      envs: ['test'],
      keys: {
        'ehmpathy.test.AWS_PROFILE': { env: 'test', name: 'AWS_PROFILE' },
        'ehmpathy.test.ANTHROPIC_API_KEY': {
          env: 'test',
          name: 'ANTHROPIC_API_KEY',
          reaches: [reachBeav, reachVlad],
        },
      },
    });

    when('[t0] the sweep targets are derived', () => {
      const targets = getAllKeyrackSweepTargetsForEnv({
        manifest,
        env: 'test',
      });

      then(
        'the declared key yields its reachless target AND one per reach',
        () => {
          expect(targets).toEqual([
            { slug: 'ehmpathy.test.AWS_PROFILE' },
            { slug: 'ehmpathy.test.ANTHROPIC_API_KEY' },
            { slug: 'ehmpathy.test.ANTHROPIC_API_KEY', reach: reachBeav },
            { slug: 'ehmpathy.test.ANTHROPIC_API_KEY', reach: reachVlad },
          ]);
        },
      );

      // the reachless target is UNCONDITIONAL — a repo declares a MINIMUM, never a maximum,
      // so a `reaches:` line adds reaches beside the base key and never replaces it
      then(
        'the reachless target is first, so the base key is never displaced',
        () => {
          expect(targets[1]).toEqual({
            slug: 'ehmpathy.test.ANTHROPIC_API_KEY',
          });
        },
      );

      then(
        'a key that declares no reach is untouched beside one that does',
        () => {
          expect(
            targets.filter(
              (target) => target.slug === 'ehmpathy.test.AWS_PROFILE',
            ),
          ).toEqual([{ slug: 'ehmpathy.test.AWS_PROFILE' }]);
        },
      );
    });
  });

  given('[case3] a manifest whose declared reaches sit in another env', () => {
    const manifest = genMockKeyrackRepoManifest({
      org: 'ehmpathy',
      envs: ['test', 'prep'],
      keys: {
        'ehmpathy.test.ANTHROPIC_API_KEY': {
          env: 'test',
          name: 'ANTHROPIC_API_KEY',
          reaches: [reachBeav],
        },
        'ehmpathy.prep.ANTHROPIC_API_KEY': {
          env: 'prep',
          name: 'ANTHROPIC_API_KEY',
          reaches: [reachVlad],
        },
      },
    });

    when('[t0] one env is swept', () => {
      const targets = getAllKeyrackSweepTargetsForEnv({
        manifest,
        env: 'test',
      });

      then('only that env contributes its reaches', () => {
        expect(targets).toEqual([
          { slug: 'ehmpathy.test.ANTHROPIC_API_KEY' },
          { slug: 'ehmpathy.test.ANTHROPIC_API_KEY', reach: reachBeav },
        ]);
      });
    });
  });
});
