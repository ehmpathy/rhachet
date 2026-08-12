import { given, then, when } from 'test-fns';

import type { KeyrackKeyHost } from '@src/domain.objects/keyrack';
import { asKeyrackKeyReach } from '@src/domain.operations/keyrack/reach/asKeyrackKeyReach';
import { asKeyrackKeySlugAtReach } from '@src/domain.operations/keyrack/reach/asKeyrackKeySlugAtReach';

import { asKeyrackListTreestruct } from './asKeyrackListTreestruct';

/**
 * .what = snaps the `🔐 keyrack list` tree, with and without reach-cut keys
 * .why = `list` answers the POSSESSION question — which reaches does this machine
 *        hold, unlocked or not. it is the only command that answers it, so the reach
 *        leaf here is load-bearing and owed a snap
 *        (rule.require.contract-snapshot-exhaustiveness)
 */
const genHost = (input: { slug: string; exid?: string }): KeyrackKeyHost =>
  ({
    slug: input.slug,
    exid: null,
    vault: 'os.secure',
    mech: 'PERMANENT_VIA_REPLICA',
    env: 'prep',
    org: 'ahbode',
    ...(input.exid ? { reach: asKeyrackKeyReach({ exid: input.exid }) } : {}),
    meta: null,
    maxDuration: null,
    createdAt: '2026-08-03T00:00:00.000Z',
    updatedAt: '2026-08-03T00:00:00.000Z',
  }) as KeyrackKeyHost;

describe('asKeyrackListTreestruct', () => {
  const SLUG = 'ahbode.prep.EHMPATH_BEAVER_GITHUB_TOKEN';

  given('[case1] a host that holds only reachless keys', () => {
    when('[t0] the rack is rendered', () => {
      const lines = asKeyrackListTreestruct({
        hosts: { [SLUG]: genHost({ slug: SLUG }) },
      });

      then(
        'no reach leaf is emitted — the tree is what it is today (e1)',
        () => {
          expect(lines.filter((line) => line.includes('reach:'))).toHaveLength(
            0,
          );
        },
      );

      then('it renders the extant shape', () => {
        expect(lines).toMatchSnapshot();
      });
    });
  });

  given('[case2] one slug held at three reaches', () => {
    const reachGithub = asKeyrackKeyReach({ exid: 'github://org=ehmpathy' });
    const reachAccount = asKeyrackKeyReach({ exid: 'beav@ehmpathy.com' });

    when('[t0] the rack is rendered', () => {
      const lines = asKeyrackListTreestruct({
        hosts: {
          [SLUG]: genHost({ slug: SLUG }),
          [asKeyrackKeySlugAtReach({ slug: SLUG, reach: reachGithub })]:
            genHost({ slug: SLUG, exid: 'github://org=ehmpathy' }),
          [asKeyrackKeySlugAtReach({ slug: SLUG, reach: reachAccount })]:
            genHost({ slug: SLUG, exid: 'beav@ehmpathy.com' }),
        },
      });

      then('three branches render, one per reach', () => {
        expect(
          lines.filter((line) => line.includes('EHMPATH_BEAVER')),
        ).toHaveLength(3);
      });

      then('each branch heads with the true SLUG, never the address', () => {
        // .note = the address ($slug@$exid) is a storage key; no human ever reads it.
        //         so an account exid may appear ONLY on a reach leaf — never welded
        //         onto the slug that heads a branch
        const withAccountExid = lines.filter((line) =>
          line.includes('beav@ehmpathy.com'),
        );
        expect(withAccountExid).toHaveLength(1);
        expect(withAccountExid[0]).toContain('├─ reach: beav@ehmpathy.com');
      });

      then('the rack reads as three keys, one name', () => {
        expect(lines).toMatchSnapshot();
      });
    });
  });
});
