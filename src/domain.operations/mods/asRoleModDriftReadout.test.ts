import { given, then, when } from 'test-fns';

import { genSampleRoleModPlan } from '@src/.test/assets/genSampleRoleModPlan';

import { asRoleModDriftReadout } from './asRoleModDriftReadout';

const PLAN = genSampleRoleModPlan();

describe('asRoleModDriftReadout', () => {
  given('[case1] a pinned mod whose role moved', () => {
    when('[t0] the readout is rendered', () => {
      const lines = asRoleModDriftReadout({
        role: 'ehmpathy/mechanic',
        versionDeclared: '1.39.5',
        versionInstalled: '1.40.0',
        pathToSpec: '.agent/repo=.mods/role=mechanic/boot.yml',
        plan: PLAN,
      });

      then('it lists every mod, the last on a closed branch', () => {
        expect(lines).toContain(
          '   │  ├─ [~] shadow briefs/rule.require.surf-wax.md',
        );
        expect(lines).toContain('   │  └─ [-] not skills/wax.board.sh');
      });

      then('it ends on the one-line fix, at the installed version', () => {
        expect(lines.at(-1)).toEqual(
          '   └─ then set `of: ehmpathy/mechanic@1.40.0` in the mod boot.yml',
        );
      });

      then('the readout matches its snapshot', () => {
        expect(lines.join('\n')).toMatchSnapshot();
      });
    });
  });
});
