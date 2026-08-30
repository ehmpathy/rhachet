import { given, then, when } from 'test-fns';

import type { KeyrackKeyOmission } from '@src/domain.objects/keyrack/KeyrackKeyOmission';

import {
  formatKeyrackKeyBranch,
  KEYRACK_OMISSION_STATUS_LABEL,
} from './emitKeyrackKeyBranch';

/**
 * .what = a clamp that the render can show EVERY omission cause `KeyrackKeyOmission['reason']`
 *   names — checked by an actual render of each, not by a claim about types
 * .why = absent a clamp, a reason added to the domain would compile everywhere and reach a human
 *   as no branch at all: a key would vanish from the tree rather than report why it was omitted.
 *   that is the exact class of two-readers-disagree defect this whole behavior was dispatched to fix
 *
 * .note = ⚠️ the render's exhaustiveness is now held by PRODUCTION code, not by an assertion in a
 *   test: `KEYRACK_OMISSION_STATUS_LABEL` is a `Record` keyed by the reason union, so a fifth
 *   reason fails `--what types` at the record itself. this suite is the RUNTIME half — it proves
 *   each label the record declares actually reaches stdout, which a type can never show
 * .note = the prior shape of this file asserted two `true`-literal types (`expect(true)` in
 *   effect), which could not fail at runtime — the fake-verification shape `rule.forbid.failhide`
 *   forbids. the cases below render and read real output instead
 */

// every reason the domain names, read off the render's own record — so this list cannot fall
// behind the union the way a hand-written array would
const reasonsAll = Object.keys(
  KEYRACK_OMISSION_STATUS_LABEL,
) as KeyrackKeyOmission['reason'][];

describe('emitKeyrackKeyBranch conformance', () => {
  given('[case1] every omission cause the domain names', () => {
    when('[t0] each is rendered as a branch', () => {
      then('there is one, and the domain names four', () => {
        expect(reasonsAll.sort()).toEqual([
          'absent',
          'errored',
          'lost',
          'remote',
        ]);
      });

      then('each renders a status line that names its own cause', () => {
        for (const reason of reasonsAll) {
          const lines = formatKeyrackKeyBranch({
            entry: { type: reason, slug: 'testorg.prep.MY_KEY', tip: null },
            isLast: true,
          });
          const status = lines.find((line) => line.includes('status:'));
          expect(status).toBeDefined();
          expect(status).toContain(reason);
        }
      });

      then('each renders the slug it reports on', () => {
        for (const reason of reasonsAll) {
          const lines = formatKeyrackKeyBranch({
            entry: { type: reason, slug: 'testorg.prep.MY_KEY', tip: null },
            isLast: true,
          });
          expect(lines[0]).toContain('testorg.prep.MY_KEY');
        }
      });

      then(
        'none renders an empty branch — a silent drop is the defect guarded',
        () => {
          for (const reason of reasonsAll) {
            const lines = formatKeyrackKeyBranch({
              entry: { type: reason, slug: 'testorg.prep.MY_KEY', tip: null },
              isLast: true,
            });
            expect(lines.length).toBeGreaterThan(1);
          }
        },
      );
    });

    when('[t1] each is rendered AT A REACH', () => {
      then('every cause names the reach its row reports on', () => {
        for (const reason of reasonsAll) {
          const lines = formatKeyrackKeyBranch({
            entry: {
              type: reason,
              slug: '@all.prep.MY_KEY',
              tip: null,
              reach: { exid: 'casey@ahction.com' },
            },
            isLast: true,
          });
          // ⚠️ asserted for ALL four, never for one — the reach leaf used to be hand-written per
          //    branch, so a leaf dropped from a single cause was a live drift hazard
          expect(
            lines.some((line) => line.includes('reach: casey@ahction.com')),
          ).toEqual(true);
        }
      });
    });

    when('[t2] each is rendered with NO reach', () => {
      then(
        'no cause emits a reach leaf — a reachless row stays as it was',
        () => {
          for (const reason of reasonsAll) {
            const lines = formatKeyrackKeyBranch({
              entry: { type: reason, slug: 'testorg.prep.MY_KEY', tip: null },
              isLast: true,
            });
            expect(lines.some((line) => line.includes('reach:'))).toEqual(
              false,
            );
          }
        },
      );
    });
  });
});
