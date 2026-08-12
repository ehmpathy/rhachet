import { given, then, when } from 'test-fns';

import { KeyrackKeyReach } from '@src/domain.objects/keyrack';

import { asKeyrackKeyReachLeaves } from './asKeyrackKeyReachLeaves';

/**
 * .what = clamps the two invariants the `reach:` leaf carries, now that three renders share
 *         one home for it
 * .why = `unlock`, `status`, and `list` each restated these in their own words before this
 *        transformer. one home is only an improvement if the home is clamped — otherwise the
 *        sweep traded three stated reasons for one unstated one
 */
describe('asKeyrackKeyReachLeaves', () => {
  given('[case1] a key cut for no reach', () => {
    when('[t0] the leaf is rendered', () => {
      then('it yields NO line at all — an empty array (e1)', () => {
        expect(asKeyrackKeyReachLeaves({ indent: '      ' })).toEqual([]);
      });

      then('a spread of it leaves the branch untouched', () => {
        const branch = [
          '      ├─ org: ahbode',
          ...asKeyrackKeyReachLeaves({ indent: '      ' }),
          '      └─ expires in: 55m',
        ];
        expect(branch).toEqual([
          '      ├─ org: ahbode',
          '      └─ expires in: 55m',
        ]);
      });
    });
  });

  given('[case2] a key cut for a reach', () => {
    const reach = new KeyrackKeyReach({ exid: 'github://org=ehmpathy' });

    when('[t0] the leaf is rendered', () => {
      then('it yields exactly one line', () => {
        expect(asKeyrackKeyReachLeaves({ indent: '      ', reach })).toEqual([
          '      ├─ reach: github://org=ehmpathy',
        ]);
      });

      then('the connector is `├─`, never terminal', () => {
        // reach is never the last leaf on any of the three renders, so a `└─` here would
        // draw a broken tree — every caller emits at least one leaf after it
        const [line] = asKeyrackKeyReachLeaves({ indent: '      ', reach });
        expect(line).toContain('├─');
        expect(line).not.toContain('└─');
      });
    });

    when('[t1] the branch is not the last of its tree', () => {
      then('the caller-supplied indent is honored verbatim', () => {
        expect(asKeyrackKeyReachLeaves({ indent: '   │  ', reach })).toEqual([
          '   │  ├─ reach: github://org=ehmpathy',
        ]);
      });
    });
  });

  given('[case3] a plaintext account exid', () => {
    const reach = new KeyrackKeyReach({ exid: 'beav@ehmpathy.com' });

    when('[t0] the leaf is rendered', () => {
      then('the exid renders verbatim — no scheme is parsed', () => {
        expect(asKeyrackKeyReachLeaves({ indent: '      ', reach })).toEqual([
          '      ├─ reach: beav@ehmpathy.com',
        ]);
      });
    });
  });
});
