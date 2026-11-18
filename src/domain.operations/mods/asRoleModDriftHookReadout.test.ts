import { given, then, when } from 'test-fns';

import { genSampleRoleModPlan } from '@src/.test/assets/genSampleRoleModPlan';

import { asRoleModDriftHookReadout } from './asRoleModDriftHookReadout';

const PLAN = genSampleRoleModPlan();
const INVOCATION = 'roles cost --all --when hook.onStop';

const DRIFT_MECHANIC = {
  role: 'ehmpathy/mechanic',
  versionDeclared: '1.39.5',
  versionInstalled: '1.40.0',
  pathToSpec: '.agent/repo=.mods/role=mechanic/boot.yml',
  plan: PLAN,
};
const DRIFT_SURFER = {
  role: 'test/surfer',
  versionDeclared: '0.9.0',
  versionInstalled: '1.0.0',
  pathToSpec: '.agent/repo=.mods/role=surfer/boot.yml',
  plan: PLAN,
};

describe('asRoleModDriftHookReadout', () => {
  given('[case1] one pinned mod whose role moved', () => {
    when('[t0] the hold is rendered', () => {
      const lines = asRoleModDriftHookReadout({
        invocation: INVOCATION,
        drifts: [DRIFT_MECHANIC],
      });

      then('it opens on the invocation, then the qualified class line', () => {
        expect(lines[0]).toEqual(`🧢 ${INVOCATION}`);
        expect(lines[1]).toEqual(
          '   ├─ ✋ ConstraintError: 1 modded role moved off the version its mod pins',
        );
      });

      then(
        'the drift is a branch named by its role, its readout nested below',
        () => {
          expect(lines).toContain('   │  └─ ehmpathy/mechanic');
          expect(lines).toContain('   │     ├─ role    = ehmpathy/mechanic');
          expect(lines).toContain(
            '   │     └─ then set `of: ehmpathy/mechanic@1.40.0` in the mod boot.yml',
          );
        },
      );

      then('it closes on what clears the hold', () => {
        expect(lines.at(-2)).toEqual(
          "   └─ the stop holds until each mod's `of:` names the installed version",
        );
      });

      then('the hold matches its snapshot', () => {
        expect(lines.join('\n')).toMatchSnapshot();
      });
    });
  });

  given('[case2] two pinned mods whose roles moved', () => {
    when('[t0] the hold is rendered', () => {
      const lines = asRoleModDriftHookReadout({
        invocation: INVOCATION,
        drifts: [DRIFT_MECHANIC, DRIFT_SURFER],
      });

      then('the class line counts both, in the plural', () => {
        expect(lines[1]).toEqual(
          '   ├─ ✋ ConstraintError: 2 modded roles moved off the version their mods pin',
        );
      });

      then(
        'each drift is its own branch; the first keeps the spine open',
        () => {
          expect(lines).toContain('   │  ├─ ehmpathy/mechanic');
          expect(lines).toContain('   │  │  ├─ role    = ehmpathy/mechanic');
          expect(lines).toContain('   │  └─ test/surfer');
          expect(lines).toContain('   │     ├─ role    = test/surfer');
        },
      );

      then('the hold matches its snapshot', () => {
        expect(lines.join('\n')).toMatchSnapshot();
      });
    });
  });
});
