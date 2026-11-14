import { given, then, when } from 'test-fns';

import { asRoleModsUncostedReadout } from './asRoleModsUncostedReadout';

describe('asRoleModsUncostedReadout', () => {
  given('[case1] no modded role is left unpriced', () => {
    when('[t0] the readout is rendered', () => {
      then('it is empty, so the sweep is unchanged', () => {
        expect(
          asRoleModsUncostedReadout({
            refsWithoutSpec: [],
            refsStale: [],
            refsRefused: [],
            slugsUnplaced: [],
            entriesStray: [],
          }),
        ).toEqual([]);
      });
    });
  });

  given('[case2] two modded roles lack a boot.yml', () => {
    when('[t0] the readout is rendered', () => {
      const lines = asRoleModsUncostedReadout({
        refsWithoutSpec: [
          { repo: 'ehmpathy', role: 'mechanic' },
          { repo: 'bhuild', role: 'behaver' },
        ],
        refsStale: [],
        refsRefused: [],
        slugsUnplaced: [],
        entriesStray: [],
      });

      then('it names each role by repo/role, in order', () => {
        expect(lines.slice(-2)).toEqual([
          '      ├─ bhuild/behaver',
          '      └─ ehmpathy/mechanic',
        ]);
      });

      then('it carries the [~] modded mark', () => {
        expect(lines.join('\n')).toContain('[~] modded');
      });

      then('it matches its snapshot', () => {
        expect(lines.join('\n')).toMatchSnapshot();
      });
    });
  });

  given(
    '[case3] one role of each kind: no spec, a stale view, a refused mod',
    () => {
      when('[t0] the readout is rendered', () => {
        const lines = asRoleModsUncostedReadout({
          refsWithoutSpec: [{ repo: 'ehmpathy', role: 'mechanic' }],
          refsStale: [{ repo: 'test', role: 'surfer' }],
          refsRefused: [{ repo: 'bhuild', role: 'behaver' }],
          slugsUnplaced: [],
          entriesStray: [],
        });

        then('each kind is its own branch, under one header', () => {
          expect(lines).toEqual([
            '🧢 .agent/repo=.mods',
            '   ├─ [~] modded, with no boot.yml to cost (rhx roles boot shows what its mod does)',
            '   │  └─ ehmpathy/mechanic',
            '   ├─ [~] modded, view not current (rhx init --hooks)',
            '   │  └─ test/surfer',
            '   └─ [~] modded, refused (rhx roles boot names why)',
            '      └─ bhuild/behaver',
          ]);
        });

        then('it matches its snapshot', () => {
          expect(lines.join('\n')).toMatchSnapshot();
        });
      });
    },
  );

  given('[case4] a mod over no linked role', () => {
    when('[t0] the readout is rendered', () => {
      const lines = asRoleModsUncostedReadout({
        refsWithoutSpec: [],
        refsStale: [],
        refsRefused: [],
        slugsUnplaced: ['wavecaster'],
        entriesStray: [],
      });

      then('the mod is named by its slug, with the fix', () => {
        expect(lines).toEqual([
          '🧢 .agent/repo=.mods',
          '   └─ [~] a mod over no linked role (rhx init --roles <repo>/<role>, or delete the mod)',
          '      └─ role=wavecaster',
        ]);
      });
    });
  });

  given('[case5] a mods dir that holds entries that name no role', () => {
    when('[t0] the readout is rendered', () => {
      const lines = asRoleModsUncostedReadout({
        refsWithoutSpec: [],
        refsStale: [],
        refsRefused: [],
        slugsUnplaced: [],
        entriesStray: ['readme.md', 'mechanic'],
      });

      then(
        'each stray entry is named, with the fix, so the report never crashes',
        () => {
          expect(lines).toEqual([
            '🧢 .agent/repo=.mods',
            '   └─ an entry that names no role (rename it to role=<slug>, or move it out)',
            '      ├─ mechanic',
            '      └─ readme.md',
          ]);
        },
      );
    });
  });
});
