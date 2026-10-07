import { given, then, when } from 'test-fns';

import { asBootSweepOverBudgetReadout } from './asBootSweepOverBudgetReadout';

describe('asBootSweepOverBudgetReadout', () => {
  given('[case1] one owned spec over its cap', () => {
    when('[t0] the readout renders', () => {
      const readout = asBootSweepOverBudgetReadout({
        invocation: 'roles cost --all --when hook.onStop',
        cwd: '/repo',
        over: [
          {
            pathToSpec: '/repo/.agent/repo=.this/role=any/boot.yml',
            tokens: 29264,
            budget: 5000,
            isForeign: false,
          },
        ],
      }).join('\n');

      then('the class line names a singular spec', () => {
        expect(readout).toContain(
          '✋ ConstraintError: 1 boot spec over budget',
        );
      });

      then('it names the spec relative to the repo, with its overage', () => {
        expect(readout).toContain(
          '.agent/repo=.this/role=any/boot.yml (29,264 / 5,000 tokens)',
        );
      });

      then('it hands the cost instrument for that spec', () => {
        expect(readout).toContain(
          'rhx cost --what .agent/repo=.this/role=any/boot.yml',
        );
      });

      then('it offers the simple-mode ladder, never narrow', () => {
        expect(readout).toContain('fix — four strategies, cheapest first');
        expect(readout).not.toContain('narrow');
      });

      then('it renders as snapshotted', () => {
        expect(readout).toMatchSnapshot();
      });
    });
  });

  given('[case2] two owned specs over their caps', () => {
    when('[t0] the readout renders', () => {
      const readout = asBootSweepOverBudgetReadout({
        invocation: 'roles cost --all --when hook.onStop',
        cwd: '/repo',
        over: [
          {
            pathToSpec: '/repo/.agent/repo=.this/role=any/boot.yml',
            tokens: 300,
            budget: 20,
            isForeign: false,
          },
          {
            pathToSpec: '/repo/.agent/repo=.this/role=user/boot.yml',
            tokens: 500,
            budget: 40,
            isForeign: false,
          },
        ],
      }).join('\n');

      then('the class line names a plural count', () => {
        expect(readout).toContain(
          '✋ ConstraintError: 2 boot specs over budget',
        );
      });

      then('the last spec row closes its branch', () => {
        expect(readout).toContain(
          '└─ .agent/repo=.this/role=user/boot.yml (500 / 40 tokens)',
        );
      });

      then('it renders as snapshotted', () => {
        expect(readout).toMatchSnapshot();
      });
    });
  });
});
