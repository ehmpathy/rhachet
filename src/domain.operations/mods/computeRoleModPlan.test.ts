import { ConstraintError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import {
  RoleBootSpecSimplified,
  RoleBootSpecSubjected,
} from '@src/domain.objects/RoleBootSpec';

import { computeRoleModPlan } from './computeRoleModPlan';
import { parseRoleModBootYaml } from './parseRoleModBootYaml';

const asSpec = (lines: string[]) =>
  parseRoleModBootYaml({
    content: ['of: ehmpathy/mechanic', ...lines, ''].join('\n'),
    path: '.agent/repo=.mods/role=mechanic/boot.yml',
    roleDir: 'mechanic',
    reposLinked: ['ehmpathy'],
  });

const FILES_PUBLISHED = [
  'briefs/rule.require.surf-wax.md',
  'briefs/rule.require.surf-wax.md.min',
  'briefs/rule.forbid.wipeouts.md',
  'briefs/rule.forbid.wipeouts.md.min',
  'briefs/howto.paddle-out.md',
  'skills/wax.board.sh',
  'skills/paddle.out.sh',
];

describe('computeRoleModPlan', () => {
  given(
    '[case0] a mod dir that holds os and editor litter beside a shadow',
    () => {
      when('[t0] the plan is computed', () => {
        const plan = computeRoleModPlan({
          spec: asSpec([]),
          specRole: null,
          filesPublished: FILES_PUBLISHED,
          filesMod: [
            '.DS_Store',
            'briefs/.DS_Store',
            'briefs/.gitkeep',
            'briefs/rule.require.surf-wax.md',
            'briefs/.rule.require.surf-wax.md.swp',
            'skills/wax.board.sh~',
          ],
        });

        then('the litter is no mod file: no refusal, no add, no shadow', () => {
          expect(plan.shadows).toEqual(['briefs/rule.require.surf-wax.md']);
          expect(plan.adds).toEqual([]);
        });
      });
    },
  );

  given('[case1] a mod that shadows, adds, and nots', () => {
    when('[t0] the plan is computed', () => {
      const plan = computeRoleModPlan({
        spec: asSpec([
          'briefs:',
          '  say:',
          '    - briefs/rule.require.reef-etiquette.md',
          '  not:',
          '    - briefs/rule.forbid.wipeouts.md',
        ]),
        specRole: null,
        filesPublished: FILES_PUBLISHED,
        filesMod: [
          'briefs/rule.require.surf-wax.md',
          'briefs/rule.require.reef-etiquette.md',
        ],
      });

      then('a mod file at a held path is a shadow', () => {
        expect(plan.shadows).toEqual(['briefs/rule.require.surf-wax.md']);
      });

      then('a mod file at an unheld, said path is an add', () => {
        expect(plan.adds).toEqual(['briefs/rule.require.reef-etiquette.md']);
      });

      then('a not glob drops the held path it matches', () => {
        expect(plan.nots).toEqual(['briefs/rule.forbid.wipeouts.md']);
      });

      then(
        'the shadowed and the not-ed brief each hide their published minification',
        () => {
          expect(plan.minsDropped).toEqual([
            'briefs/rule.forbid.wipeouts.md.min',
            'briefs/rule.require.surf-wax.md.min',
          ]);
        },
      );
    });
  });

  given('[case2] a mod that ships its own minification', () => {
    when('[t0] it shadows a brief and its .md.min', () => {
      const plan = computeRoleModPlan({
        spec: asSpec([]),
        specRole: null,
        filesPublished: FILES_PUBLISHED,
        filesMod: [
          'briefs/rule.require.surf-wax.md',
          'briefs/rule.require.surf-wax.md.min',
        ],
      });

      then('both are shadows, and no published minification is dropped', () => {
        expect(plan.shadows).toEqual([
          'briefs/rule.require.surf-wax.md',
          'briefs/rule.require.surf-wax.md.min',
        ]);
        expect(plan.minsDropped).toEqual([]);
      });
    });

    when('[t1] it adds a brief and its .md.min', () => {
      const plan = computeRoleModPlan({
        spec: asSpec([
          'briefs:',
          '  say:',
          '    - briefs/rule.require.tide.md',
        ]),
        specRole: null,
        filesPublished: FILES_PUBLISHED,
        filesMod: [
          'briefs/rule.require.tide.md',
          'briefs/rule.require.tide.md.min',
        ],
      });

      then('the minification rides with its brief, unsaid', () => {
        expect(plan.adds).toEqual([
          'briefs/rule.require.tide.md',
          'briefs/rule.require.tide.md.min',
        ]);
      });
    });
  });

  given('[case3] a mod file the plan cannot place', () => {
    when('[t0] a typo of a held path, which no say names', () => {
      then(
        'it is refused, never read as an add, and names the nearest held path',
        async () => {
          const error = await getError(async () =>
            computeRoleModPlan({
              spec: asSpec([]),
              specRole: null,
              filesPublished: FILES_PUBLISHED,
              filesMod: ['briefs/rule.require.surf-wux.md'],
            }),
          );
          expect(error).toBeInstanceOf(ConstraintError);
          expect(error.message).toContain('no say or ref names it');
          expect(JSON.stringify(error)).toContain(
            'briefs/rule.require.surf-wax.md',
          );
          expect(JSON.stringify(error)).toContain(
            '(briefs.say: [briefs/rule.require.surf-wux.md])',
          );
          expect(error.message).toMatchSnapshot();
        },
      );
    });

    when('[t3] a typo, under a role in subject mode', () => {
      then(
        'the fix names the always section the mod must say it in',
        async () => {
          const error = await getError(async () =>
            computeRoleModPlan({
              spec: asSpec([]),
              specRole: new RoleBootSpecSubjected({
                mode: 'subject',
                budget: null,
                always: null,
                subjects: {},
              }),
              filesPublished: FILES_PUBLISHED,
              filesMod: ['briefs/rule.require.surf-wux.md'],
            }),
          );
          expect(error).toBeInstanceOf(ConstraintError);
          expect(JSON.stringify(error)).toContain(
            '(always.briefs.say: [briefs/rule.require.surf-wux.md])',
          );
        },
      );
    });

    when('[t4] an unsaid file far from every held path', () => {
      then('it is refused, and offers no "did you mean"', async () => {
        const error = await getError(async () =>
          computeRoleModPlan({
            spec: asSpec([]),
            specRole: null,
            filesPublished: FILES_PUBLISHED,
            filesMod: ['briefs/rule.require.reef-etiquette.md'],
          }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('no say or ref names it');
        expect(JSON.stringify(error)).not.toContain('did you mean');
      });
    });

    when('[t1] an orphan minification', () => {
      then('it is refused', async () => {
        const error = await getError(async () =>
          computeRoleModPlan({
            spec: asSpec([]),
            specRole: null,
            filesPublished: FILES_PUBLISHED,
            filesMod: ['briefs/rule.require.ghost.md.min'],
          }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('with no .md beside it');
        expect(error.message).toMatchSnapshot();
      });
    });

    when('[t2] a file outside briefs and skills', () => {
      then('it is refused as out of scope', async () => {
        const error = await getError(async () =>
          computeRoleModPlan({
            spec: asSpec([]),
            specRole: null,
            filesPublished: FILES_PUBLISHED,
            filesMod: ['keyrack.yml'],
          }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('a kind a mod cannot change');
        expect(error.message).toMatchSnapshot();
      });
    });
  });

  given('[case4] a not that removes naught', () => {
    when('[t0] the glob matches no held file of its kind', () => {
      then('it is refused, and names the nearest held path', async () => {
        const error = await getError(async () =>
          computeRoleModPlan({
            spec: asSpec(['skills:', '  not:', '    - skills/wax.bored.sh']),
            specRole: null,
            filesPublished: FILES_PUBLISHED,
            filesMod: [],
          }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('matches no skills file');
        expect(JSON.stringify(error)).toContain('skills/wax.board.sh');
        expect(error.message).toMatchSnapshot();
      });
    });
  });

  given('[case5] a mod with no files and no section', () => {
    when('[t0] the plan is computed', () => {
      then('the plan is empty', () => {
        expect(
          computeRoleModPlan({
            spec: asSpec([]),
            specRole: null,
            filesPublished: FILES_PUBLISHED,
            filesMod: [],
          }),
        ).toMatchObject({ shadows: [], adds: [], nots: [], minsDropped: [] });
      });
    });
  });

  given('[case6] a not that covers a path the mod also shadows', () => {
    when('[t0] the plan is computed', () => {
      then('it is refused, and names the path and the glob', async () => {
        const error = await getError(async () =>
          computeRoleModPlan({
            spec: asSpec(['briefs:', '  not:', '    - briefs/rule.*.md']),
            specRole: null,
            filesPublished: FILES_PUBLISHED,
            filesMod: ['briefs/rule.require.surf-wax.md'],
          }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('briefs/rule.*.md');
        expect(error.message).toContain(
          'removes briefs/rule.require.surf-wax.md, a path the mod also shadows',
        );
        expect(error.message).toMatchSnapshot();
      });
    });
  });

  given('[case7] an add that a not glob matches', () => {
    when('[t0] the mod nots a glob its own add matches', () => {
      then(
        'it is refused, never planned as an add the boot would drop',
        async () => {
          const error = await getError(async () =>
            computeRoleModPlan({
              spec: asSpec([
                'briefs:',
                '  say:',
                '    - briefs/rule.forbid.wipeouts-renamed.md',
                '  not:',
                '    - briefs/rule.forbid.wipeouts*.md',
              ]),
              specRole: null,
              filesPublished: FILES_PUBLISHED,
              filesMod: ['briefs/rule.forbid.wipeouts-renamed.md'],
            }),
          );
          expect(error).toBeInstanceOf(ConstraintError);
          expect(error.message).toContain(
            'its not `briefs/rule.forbid.wipeouts*.md` removes briefs/rule.forbid.wipeouts-renamed.md, a path the mod adds',
          );
          expect(error.message).toMatchSnapshot();
        },
      );
    });

    when("[t1] the role's own not matches the add", () => {
      then(
        'it is refused, since the boot would drop the add with no word',
        async () => {
          const error = await getError(async () =>
            computeRoleModPlan({
              spec: asSpec([
                'briefs:',
                '  say:',
                '    - briefs/howto.paddle-back.md',
              ]),
              specRole: new RoleBootSpecSimplified({
                mode: 'simple',
                budget: null,
                briefs: { say: null, ref: [], not: ['briefs/howto.*.md'] },
                skills: null,
              }),
              filesPublished: FILES_PUBLISHED,
              filesMod: ['briefs/howto.paddle-back.md'],
            }),
          );
          expect(error).toBeInstanceOf(ConstraintError);
          expect(error.message).toContain(
            "the role's not `briefs/howto.*.md` removes briefs/howto.paddle-back.md, a path the mod adds",
          );
          expect(error.message).toMatchSnapshot();
        },
      );
    });

    when('[t2] a not that leaves the add', () => {
      then('the add is planned', () => {
        const plan = computeRoleModPlan({
          spec: asSpec([
            'briefs:',
            '  say:',
            '    - briefs/rule.forbid.wipeouts-renamed.md',
            '  not:',
            '    - briefs/rule.forbid.wipeouts.md',
          ]),
          specRole: null,
          filesPublished: FILES_PUBLISHED,
          filesMod: ['briefs/rule.forbid.wipeouts-renamed.md'],
        });
        expect(plan.adds).toEqual(['briefs/rule.forbid.wipeouts-renamed.md']);
        expect(plan.nots).toEqual(['briefs/rule.forbid.wipeouts.md']);
      });
    });
  });
});
