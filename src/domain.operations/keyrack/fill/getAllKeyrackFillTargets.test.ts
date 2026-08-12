import { given, then, when } from 'test-fns';

import { asKeyrackKeyReach } from '@src/domain.operations/keyrack/reach/asKeyrackKeyReach';

import { getAllKeyrackFillTargets } from './getAllKeyrackFillTargets';

/**
 * .what = clamps what `fill` provisions for a key
 * .why = a repo declares the FLOOR of reaches, so the reachless target must be
 *        unconditional. were it conditional, a repo that declares a reach would stop
 *        provision of its own default key — a silent regression on every extant repo
 */
describe('getAllKeyrackFillTargets', () => {
  given('[case1] a key that declares no reach', () => {
    when('[t0] its targets are derived', () => {
      const targets = getAllKeyrackFillTargets({ reaches: [] });

      then('exactly one target stands — the reachless key (e1)', () => {
        expect(targets).toEqual([{}]);
      });

      then('it carries no reach, absent rather than null (e16)', () => {
        expect(targets[0]).not.toHaveProperty('reach');
      });
    });
  });

  given('[case2] a key that declares two reaches', () => {
    when('[t0] its targets are derived', () => {
      const targets = getAllKeyrackFillTargets({
        reaches: [
          asKeyrackKeyReach({ exid: 'github://org=ahbode' }),
          asKeyrackKeyReach({ exid: 'beav@ehmpathy.com' }),
        ],
      });

      then('the reachless target still leads — a floor, never a cap', () => {
        expect(targets).toHaveLength(3);
        expect(targets[0]).toEqual({});
      });

      then('the exids ride through verbatim, unreshaped', () => {
        expect(targets[1]?.reach?.exid).toEqual('github://org=ahbode');
        expect(targets[2]?.reach?.exid).toEqual('beav@ehmpathy.com');
      });

      then('each declared reach is one target, equal in weight', () => {
        // no strength tier rides beside an exid, so the shape of a declared target is
        // exactly `{ reach }` — a field that graded one above another would show here
        expect(Object.keys(targets[1] ?? {})).toEqual(['reach']);
        expect(Object.keys(targets[2] ?? {})).toEqual(['reach']);
      });
    });
  });
});
