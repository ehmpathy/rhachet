import { ConstraintError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { parseRoleModBootYaml } from './parseRoleModBootYaml';

const parse = (content: string) =>
  parseRoleModBootYaml({
    content,
    path: '.agent/repo=.mods/role=mechanic/boot.yml',
    roleDir: 'mechanic',
    reposLinked: ['ehmpathy'],
  });

describe('parseRoleModBootYaml', () => {
  given('[case1] a mod with only an of', () => {
    when('[t0] parsed', () => {
      const spec = parse('of: ehmpathy/mechanic@1.39.5\n');

      then('the target is read', () => {
        expect(spec.of).toMatchObject({
          repo: 'ehmpathy',
          role: 'mechanic',
          version: '1.39.5',
        });
      });

      then('a mod with no section matches any role, as only shadows', () => {
        expect(spec.sections).toEqual(null);
      });
    });
  });

  given('[case2] a simple-mode mod that says and nots', () => {
    when('[t0] parsed', () => {
      const spec = parse(
        [
          'of: ehmpathy/mechanic',
          'briefs:',
          '  say:',
          '    - briefs/rule.require.surf-wax.md',
          '  not:',
          '    - briefs/rule.forbid.wipeouts.md',
          '',
        ].join('\n'),
      );

      then('the sections are the role schema, in simple mode', () => {
        expect(spec.sections?.mode).toEqual('simple');
      });

      then('the not glob is kept', () => {
        expect(
          spec.sections?.mode === 'simple' ? spec.sections.briefs?.not : null,
        ).toEqual(['briefs/rule.forbid.wipeouts.md']);
      });
    });
  });

  given('[case3] a mod that declares a key its role owns', () => {
    when('[t0] it declares a budget', () => {
      then('it is refused, and the fix names the role budget', async () => {
        const error = await getError(async () =>
          parse('of: ehmpathy/mechanic\nbudget:\n  tokens: 5000\n'),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('declares a `budget:`');
      });
    });

    when('[t1] it declares an inherit in a subject section', () => {
      then('it is refused, and names the section', async () => {
        const error = await getError(async () =>
          parse(
            [
              'of: ehmpathy/mechanic',
              'subject.flow:',
              '  inherit:',
              '    always: false',
              '',
            ].join('\n'),
          ),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('declares `inherit:`');
        expect(JSON.stringify(error)).toContain('subject.flow');
        expect(error.message).toMatchSnapshot();
      });
    });
  });

  given('[case4] a mod with no of', () => {
    when('[t0] parsed', () => {
      then('it is refused before any other check', async () => {
        const error = await getError(async () =>
          parse('budget:\n  tokens: 5000\n'),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('declares no `of:`');
      });
    });
  });
});
