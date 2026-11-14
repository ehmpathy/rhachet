import { ConstraintError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { asRoleModRefusalsUpgradeReadout } from './asRoleModRefusalsUpgradeReadout';

describe('asRoleModRefusalsUpgradeReadout', () => {
  given('[case1] an upgrade that left every mod sound', () => {
    when('[t0] the readout is rendered', () => {
      then('it is empty, so the upgrade prints naught for mods', () => {
        expect(asRoleModRefusalsUpgradeReadout({ refusals: [] })).toEqual([]);
      });
    });
  });

  given('[case2] a refused mod and a stray entry in the mods dir', () => {
    when('[t0] the readout is rendered', () => {
      const lines = asRoleModRefusalsUpgradeReadout({
        refusals: [
          {
            role: null,
            error: new ConstraintError(
              'a mods dir holds an entry that names no role',
              { fix: 'rename it to role=<slug>' },
            ),
          },
          {
            role: 'mechanic',
            error: new ConstraintError(
              'the mod shadows briefs/rule.md, which the role no longer ships',
            ),
          },
        ],
      });

      then('it names each refusal, and the fix where one is carried', () => {
        expect(lines).toEqual([
          '🧢 a mod no longer applies',
          '   ├─ .agent/repo=.mods — ✋ ConstraintError: a mods dir holds an entry that names no role',
          '   │  └─ fix = rename it to role=<slug>',
          '   └─ role=mechanic — ✋ ConstraintError: the mod shadows briefs/rule.md, which the role no longer ships',
        ]);
      });

      then('it matches its snapshot', () => {
        expect(lines.join('\n')).toMatchSnapshot();
      });
    });
  });
});
