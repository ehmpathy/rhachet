import { given, then, when } from 'test-fns';

import { asRoleCostHookHoldLines } from './asRoleCostHookHoldLines';

const INVOCATION = 'roles cost --all --when hook.onStop';

const READOUT_BUDGET = [
  `🧢 ${INVOCATION}`,
  '   ├─ ✋ ConstraintError: 1 boot spec over budget',
  '   │  └─ .agent/repo=.this/role=any/boot.yml (9k / 1k tokens)',
  '   │',
  '   └─ fix — four strategies, cheapest first',
  '      ├─ catalogize  replace a set with one catalog that indexes it',
  '      ├─ condense    author an x.md.min beside x.md',
  '      ├─ reference   move a say entry to ref (it stays addressable, costs its path line)',
  '      └─ eliminate   list what does not earn its boot under `not` (the file stays)',
  '',
];

const READOUT_DEFECTS = [
  `🧢 ${INVOCATION}`,
  '   └─ ✋ ConstraintError: 1 role content defect, set aside at boot',
  '      └─ .agent/repo=.this/role=any/briefs/lost.md.min',
  '         └─ an orphan .md.min, skipped — restore its .md source, or delete the .md.min',
  '',
];

describe('asRoleCostHookHoldLines', () => {
  given('[case1] one readout', () => {
    when('[t0] the hold is composed', () => {
      then('it renders byte for byte as the readout alone', () => {
        expect(
          asRoleCostHookHoldLines({
            invocation: INVOCATION,
            readouts: [READOUT_DEFECTS],
          }),
        ).toEqual(READOUT_DEFECTS);
      });
    });
  });

  given('[case2] two readouts, a budget breach then a content defect', () => {
    when('[t0] the hold is composed', () => {
      const lines = asRoleCostHookHoldLines({
        invocation: INVOCATION,
        readouts: [READOUT_BUDGET, READOUT_DEFECTS],
      });

      then('the invocation heads the frame once', () => {
        expect(
          lines.filter((line) => line === `🧢 ${INVOCATION}`),
        ).toHaveLength(1);
      });

      then(
        'the first section is reopened, and its nested rows carry the spine',
        () => {
          expect(lines).toContain(
            '   ├─ fix — four strategies, cheapest first',
          );
          expect(lines).toContain(
            '   │  ├─ catalogize  replace a set with one catalog that indexes it',
          );
          expect(lines).toContain(
            '   │  └─ eliminate   list what does not earn its boot under `not` (the file stays)',
          );
        },
      );

      then('the last section ends the root, as it did alone', () => {
        expect(lines).toContain(
          '   └─ ✋ ConstraintError: 1 role content defect, set aside at boot',
        );
      });

      then('the frame is locked', () => {
        expect(lines.join('\n')).toMatchSnapshot();
      });
    });
  });
});
