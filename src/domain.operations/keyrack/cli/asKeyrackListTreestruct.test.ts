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

  /**
   * ⚠️ .why = THE EMPTY-RACK CLAMP. an empty render has two wholly different causes, and before
   *        this operation was told which, it said "no keys configured on host" for BOTH. on a
   *        host that holds keys that is a SILENT WRONG ANSWER at exit 0 — the same shape this
   *        wish exists to close, found by a dogfood of `--org @al` on a real box that held 29
   *        keys and was told it had none (`rule.forbid.failhide`)
   * ⚠️ .why.direction = the two cases below pin OPPOSITE renders and BOTH are needed. a fix
   *        written too wide would name a filter even when the rack is truly empty, which would
   *        send a human to check a flag that was never the cause
   */
  given('[case3] the narrowed rack is EMPTY', () => {
    when('[t0] the host held keys, and a filter ate them all', () => {
      const lines = asKeyrackListTreestruct({
        hosts: {},
        narrow: { org: '@al', env: null, countBefore: 29 },
      });

      then('it does NOT claim the host is empty — it is not', () => {
        expect(lines.join('\n')).not.toContain('no keys configured on host');
      });

      then('it names the filter at fault, so a typo is visible', () => {
        expect(lines.join('\n')).toContain('no keys matched this filter');
        expect(lines.join('\n')).toContain('filter: --org @al');
      });

      then('it names how many keys the host DOES hold', () => {
        expect(lines.join('\n')).toContain('of: 29 keys held on this host');
      });

      then('it names the fix (rule.require.errors-name-the-fix)', () => {
        expect(lines.join('\n')).toContain('--org @all');
        expect(lines.join('\n')).toContain('--org @this');
      });

      then('the render a human reads is snapped', () => {
        expect(lines).toMatchSnapshot();
      });
    });

    when('[t1] the host is GENUINELY empty, under the same filter', () => {
      // ⚠️ the guard row. `countBefore: 0` means the filter is innocent — so the message must
      //    NOT blame it, else a human checks a flag that was never the cause
      const lines = asKeyrackListTreestruct({
        hosts: {},
        narrow: { org: '@all', env: null, countBefore: 0 },
      });

      then('it says the host is empty, and blames no filter', () => {
        expect(lines.join('\n')).toContain('(no keys configured on host)');
        expect(lines.join('\n')).not.toContain('no keys matched this filter');
      });
    });

    when('[t2] no filter was spelled at all', () => {
      // the backwards-compatible row — an unnarrowed caller renders exactly as before
      const lines = asKeyrackListTreestruct({ hosts: {} });

      then('it reads exactly as it did before the narrow existed', () => {
        expect(lines.join('\n')).toContain('(no keys configured on host)');
        expect(lines.join('\n')).not.toContain('no keys matched this filter');
      });
    });
  });
});
