import { ConstraintError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { parseRoleBootSpecFromRaw } from '@src/domain.operations/role/parseRoleBootSpecFromRaw';

import { assertRoleModModeMatchesRole } from './assertRoleModModeMatchesRole';
import { parseRoleModBootYaml } from './parseRoleModBootYaml';

const asMod = (lines: string[]) =>
  parseRoleModBootYaml({
    content: ['of: ehmpathy/mechanic', ...lines, ''].join('\n'),
    path: '.agent/repo=.mods/role=mechanic/boot.yml',
    roleDir: 'mechanic',
    reposLinked: ['ehmpathy'],
  });

const asRole = (raw: Record<string, unknown>) =>
  parseRoleBootSpecFromRaw({ raw, path: 'boot.yml' });

const ROLE_SIMPLE = asRole({ briefs: { say: ['briefs/*.md'] } });
const ROLE_SUBJECT = asRole({
  always: { briefs: { say: ['briefs/rule.*.md'] } },
  'subject.flow': { briefs: { say: ['briefs/howto.*.md'] } },
});

describe('assertRoleModModeMatchesRole', () => {
  given('[case1] a mod in its role mode', () => {
    when('[t0] both are simple', () => {
      then('it passes', () => {
        expect(() =>
          assertRoleModModeMatchesRole({
            mod: asMod(['briefs:', '  say:', '    - briefs/x.md']),
            role: ROLE_SIMPLE,
          }),
        ).not.toThrow();
      });
    });

    when('[t1] both are subject, and the mod names a role subject', () => {
      then('it passes', () => {
        expect(() =>
          assertRoleModModeMatchesRole({
            mod: asMod([
              'subject.flow:',
              '  briefs:',
              '    say:',
              '      - briefs/x.md',
            ]),
            role: ROLE_SUBJECT,
          }),
        ).not.toThrow();
      });
    });

    when('[t2] the role has no boot.yml and the mod is simple', () => {
      then('it passes, since no boot.yml says all', () => {
        expect(() =>
          assertRoleModModeMatchesRole({
            mod: asMod(['briefs:', '  say:', '    - briefs/x.md']),
            role: null,
          }),
        ).not.toThrow();
      });
    });

    when('[t3] the mod has no section', () => {
      then('it passes against a subject role', () => {
        expect(() =>
          assertRoleModModeMatchesRole({ mod: asMod([]), role: ROLE_SUBJECT }),
        ).not.toThrow();
      });
    });
  });

  given('[case2] a mod in the other mode', () => {
    when('[t0] the mod is subject, the role simple', () => {
      then('it is refused, and the fix names the simple form', async () => {
        const error = await getError(async () =>
          assertRoleModModeMatchesRole({
            mod: asMod([
              'always:',
              '  briefs:',
              '    say:',
              '      - briefs/x.md',
            ]),
            role: ROLE_SIMPLE,
          }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('in subject mode');
        expect(JSON.stringify(error)).toContain('top-level `briefs:`');
      });
    });

    when('[t1] the mod is simple, the role subject', () => {
      then('it is refused, and the fix names the subject form', async () => {
        const error = await getError(async () =>
          assertRoleModModeMatchesRole({
            mod: asMod(['briefs:', '  say:', '    - briefs/x.md']),
            role: ROLE_SUBJECT,
          }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('in simple mode');
      });
    });
  });

  given('[case3] a subject mod that names a subject the role lacks', () => {
    when('[t0] checked', () => {
      then('it is refused, and names the role subjects', async () => {
        const error = await getError(async () =>
          assertRoleModModeMatchesRole({
            mod: asMod([
              'subject.reef:',
              '  briefs:',
              '    say:',
              '      - briefs/x.md',
            ]),
            role: ROLE_SUBJECT,
          }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('(reef)');
        expect(JSON.stringify(error)).toContain('flow');
        expect(error.message).toMatchSnapshot();
      });
    });
  });
});
