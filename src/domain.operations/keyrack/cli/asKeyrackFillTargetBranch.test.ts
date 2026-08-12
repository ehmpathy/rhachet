import { given, then, when } from 'test-fns';

import { asKeyrackKeyReach } from '@src/domain.operations/keyrack/reach/asKeyrackKeyReach';

import { getAllKeyrackFillTargets } from '../fill/getAllKeyrackFillTargets';
import { asKeyrackFillTargetBranch } from './asKeyrackFillTargetBranch';

/**
 * .what = snaps what `rhx keyrack fill` renders per reach
 * .why = a human reads this to see which reaches were provisioned, so it is a
 *        user-faced contract owed a snap (rule.require.contract-snapshot-exhaustiveness).
 *        the claim that carries the weight is [case1]: a key that declares no reach must
 *        render byte for byte what it renders today (e1) — no header, no extra indent
 */
describe('asKeyrackFillTargetBranch', () => {
  const BRANCH_CONTINUE = '│  ';

  given('[case1] a key that declares no reach', () => {
    when('[t0] its lone target is rendered', () => {
      const branch = asKeyrackFillTargetBranch({
        target: {},
        isLast: true,
        isLone: true,
        branchContinue: BRANCH_CONTINUE,
      });

      then('no header line is emitted at all (e1)', () => {
        expect(branch.header).toEqual(null);
      });

      then('the indent is untouched — the flat shape it has today (e1)', () => {
        expect(branch.indent).toEqual(BRANCH_CONTINUE);
      });
    });
  });

  given('[case2] a key that declares two reaches', () => {
    const targets = getAllKeyrackFillTargets({
      reaches: [
        asKeyrackKeyReach({ exid: 'github://org=ahbode' }),
        asKeyrackKeyReach({ exid: 'beav@ehmpathy.com' }),
      ],
    });

    when('[t0] every target is rendered', () => {
      const branches = targets.map((target, index) =>
        asKeyrackFillTargetBranch({
          target,
          isLast: index === targets.length - 1,
          isLone: targets.length === 1,
          branchContinue: BRANCH_CONTINUE,
        }),
      );

      then('the reachless target is named "default", never blank', () => {
        expect(branches[0]?.header).toContain('at reach default');
      });

      then('each reach header carries its exid, and only its exid', () => {
        expect(branches[1]?.header).toContain('at reach github://org=ahbode');
        expect(branches[2]?.header).toContain('at reach beav@ehmpathy.com');
      });

      then('only the last target closes its branch', () => {
        expect(branches[0]?.header).toContain('├─');
        expect(branches[2]?.header).toContain('└─');
      });

      then('the whole per-reach render holds still', () => {
        expect(branches).toMatchSnapshot();
      });
    });
  });
});
