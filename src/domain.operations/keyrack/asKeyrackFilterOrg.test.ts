import { ConstraintError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { asKeyrackFilterOrg } from './asKeyrackFilterOrg';

/**
 * .what = the unit clamp for the sweep-filter expansion rule
 * .why = this rule is shared by `unlock` (manifest in hand) and `status`/`list` (manifest
 *        loaded). before it was one operation each site hand-rolled it, and the answers
 *        DIVERGED — `@this` with no manifest refused loud on one and yielded every
 *        machine-wide key on the other. these rows are what hold the one answer in place
 */
describe('asKeyrackFilterOrg', () => {
  given('[case1] no --org flag', () => {
    when('[t0] a manifest is in hand', () => {
      // ⚠️ .why = THE DEFAULT ROW. an absent filter must mean the verb's EXTANT scope, never
      //         `@this`. an `@this` default would silently drop every machine-wide key from a
      //         sweep that has always included them — a regression in a new flag's clothes
      then('there is no filter', () => {
        expect(asKeyrackFilterOrg({ org: null, orgOfRepo: 'testorg' })).toEqual(
          null,
        );
      });
    });

    when('[t1] no manifest is in hand', () => {
      then('there is still no filter, and no refusal', () => {
        expect(asKeyrackFilterOrg({ org: null, orgOfRepo: null })).toEqual(
          null,
        );
      });
    });
  });

  given('[case2] --org @all', () => {
    when('[t0] no manifest is in hand', () => {
      // ⚠️ .why = THE INVARIANT ROW. a machine-wide filter must cost no manifest, so it must
      //         answer identically with one and without one (ehmpathy/rhachet#467)
      then('it expands to @all, with no refusal', () => {
        expect(asKeyrackFilterOrg({ org: '@all', orgOfRepo: null })).toEqual(
          '@all',
        );
      });
    });

    when('[t1] a manifest is in hand', () => {
      then('it still expands to @all — the manifest is never consulted', () => {
        expect(
          asKeyrackFilterOrg({ org: '@all', orgOfRepo: 'testorg' }),
        ).toEqual('@all');
      });
    });
  });

  given('[case3] --org @this', () => {
    when('[t0] a manifest is in hand', () => {
      then('it expands to the manifest org', () => {
        expect(
          asKeyrackFilterOrg({ org: '@this', orgOfRepo: 'testorg' }),
        ).toEqual('testorg');
      });
    });

    when('[t1] NO manifest is in hand', () => {
      // ⚠️ .why = THE REFUSAL ROW. `@this` names a repo and there is none to name. a silent
      //         `null` here would read as "no filter" and serve the WHOLE swept set — the
      //         opposite of the ask. a soft fallback from a specific-org ask to the
      //         machine-wide grain is what `rule.require.org-scope-grain-hardcut` forbids
      then('it refuses loud, and the refusal names the fix', async () => {
        const error = await getError(async () =>
          asKeyrackFilterOrg({ org: '@this', orgOfRepo: null }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('--org @this');
      });
    });
  });

  given('[case4] --org names a literal org', () => {
    when('[t0] it is not this repo', () => {
      // .why = a literal segment is already what a host slug carries, so it passes through
      //        verbatim. that is what lets a filter answer an off-org ask with an EMPTY set
      //        rather than a silent yield of this repo's keys under another org's name
      then('it passes through verbatim', () => {
        expect(
          asKeyrackFilterOrg({ org: 'otherorg', orgOfRepo: 'testorg' }),
        ).toEqual('otherorg');
      });
    });

    when('[t1] no manifest is in hand', () => {
      then('it passes through, since a literal needs no expansion', () => {
        expect(
          asKeyrackFilterOrg({ org: 'otherorg', orgOfRepo: null }),
        ).toEqual('otherorg');
      });
    });
  });
});
