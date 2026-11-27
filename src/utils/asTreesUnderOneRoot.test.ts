import { given, then, when } from 'test-fns';

import { asTreesUnderOneRoot } from './asTreesUnderOneRoot';

const TREE_DRIFT = [
  '🧢 roles cost --all --when hook.onStop',
  '   ├─ ✋ ConstraintError: 1 modded role moved off the version its mod pins',
  '   │  └─ test/surfer',
  '   │',
  "   └─ the stop holds until each mod's `of:` names the installed version",
  '',
];

const TREE_BUDGET = [
  '🧢 roles cost --all --when hook.onStop',
  '   ├─ ✋ ConstraintError: 1 boot spec over budget',
  '   │  └─ boot.yml (9k / 8k tokens)',
  '   │',
  '   └─ fix — two strategies, cheapest first',
  '      ├─ catalogize a set',
  '      └─ condense a say entry',
  '',
];

const TREE_FAULT = [
  '🧢 roles cost --all --when hook.onStop',
  '   ├─ ✋ ConstraintError: 1 mod fault, held at the first stop of each turn until cured',
  '   │  └─ role=surfer',
  '   │',
  '   └─ the first stop of each turn holds until each mod is cured',
  '',
];

describe('asTreesUnderOneRoot', () => {
  given('[case1] one tree', () => {
    when('[t0] it is joined', () => {
      const lines = asTreesUnderOneRoot({ trees: [TREE_FAULT] });

      then('it is the tree unchanged', () => {
        expect(lines).toEqual(TREE_FAULT);
      });
    });
  });

  given('[case2] two trees under one root', () => {
    when('[t0] they are joined', () => {
      const lines = asTreesUnderOneRoot({ trees: [TREE_DRIFT, TREE_FAULT] });

      then('the root line shows once', () => {
        expect(
          lines.filter((line) => line.startsWith('🧢 roles cost')).length,
        ).toEqual(1);
      });

      then(
        'the first tree is left open, so the second sits as its peer',
        () => {
          expect(lines).toContain(
            "   ├─ the stop holds until each mod's `of:` names the installed version",
          );
          expect(
            lines.filter((line) => line.startsWith('   └─')).length,
          ).toEqual(1);
        },
      );

      then('the joined tree matches its snapshot', () => {
        expect(lines.join('\n')).toMatchSnapshot();
      });
    });
  });

  given('[case3] a first tree whose last branch has children', () => {
    when('[t0] it is joined above another', () => {
      const lines = asTreesUnderOneRoot({ trees: [TREE_BUDGET, TREE_FAULT] });

      then('its children are re-spined under the now open branch', () => {
        expect(lines).toContain('   │  ├─ catalogize a set');
        expect(lines).toContain('   │  └─ condense a say entry');
        expect(lines.some((line) => line.startsWith('      '))).toEqual(false);
      });

      then('the joined tree matches its snapshot', () => {
        expect(lines.join('\n')).toMatchSnapshot();
      });
    });
  });

  given('[case4] no trees', () => {
    when('[t0] they are joined', () => {
      then('it renders no line', () => {
        expect(asTreesUnderOneRoot({ trees: [] })).toEqual([]);
      });
    });
  });
});
