import { ConstraintError } from 'helpful-errors';
import { genTempDir, getError, given, then, when } from 'test-fns';

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getOneRoleBootContent } from './getOneRoleBootContent';

/**
 * .what = write one role dir with two briefs, one skill, and an optional boot.yml
 */
const genRoleDir = (input: {
  slug: string;
  bootYml: string | null;
}): string => {
  const repoPath = genTempDir({ slug: input.slug });
  const roleDir = join(repoPath, '.agent', 'repo=.this', 'role=any');
  mkdirSync(join(roleDir, 'briefs'), { recursive: true });
  mkdirSync(join(roleDir, 'skills'), { recursive: true });
  writeFileSync(join(roleDir, 'readme.md'), 'readme body');
  writeFileSync(join(roleDir, 'briefs', 'core.md'), 'core brief body');
  writeFileSync(join(roleDir, 'briefs', 'extra.md'), 'extra brief body');
  writeFileSync(
    join(roleDir, 'skills', 'hello.sh'),
    '#!/bin/bash\n# .what = say hello\necho hi',
  );
  if (input.bootYml !== null)
    writeFileSync(join(roleDir, 'boot.yml'), input.bootYml);
  return repoPath;
};

describe('getOneRoleBootContent', () => {
  given(
    '[case1] a role with a boot.yml that says one brief and refs the other',
    () => {
      when('[t0] rendered', () => {
        then(
          'the said brief is inlined, the ref brief is a path, and stats count both',
          async () => {
            const repoPath = genRoleDir({
              slug: 'getOneRoleBootContent-c1t0',
              bootYml:
                'always:\n  briefs:\n    say:\n      - briefs/core.md\n    ref:\n      - briefs/extra.md\n',
            });

            const { body, stats } = await getOneRoleBootContent({
              slugRepo: '.this',
              slugRole: 'any',
              subjects: null,
              cwd: repoPath,
            });

            expect(body).toContain(
              '<brief.say path=".agent/repo=.this/role=any/briefs/core.md">\ncore brief body\n</brief.say>',
            );
            expect(body).toContain(
              '<brief.ref path=".agent/repo=.this/role=any/briefs/extra.md"/>',
            );
            expect(body).not.toContain('extra brief body');
            expect(body).not.toContain('<stats>');
            expect(stats.roles).toEqual(1);
            expect(stats.briefsSay).toEqual(1);
            expect(stats.briefsRef).toEqual(1);
            expect(stats.chars).toBeGreaterThan('core brief body'.length);
          },
        );
      });
    },
  );

  given('[case2] a role with no boot.yml', () => {
    when('[t0] rendered twice', () => {
      then(
        'both briefs are said, and the two bodies are byte-equal',
        async () => {
          const repoPath = genRoleDir({
            slug: 'getOneRoleBootContent-c2t0',
            bootYml: null,
          });
          const render = () =>
            getOneRoleBootContent({
              slugRepo: '.this',
              slugRole: 'any',
              subjects: null,
              cwd: repoPath,
            });

          const first = await render();
          const second = await render();

          expect(first.body).toContain('core brief body');
          expect(first.body).toContain('extra brief body');
          expect(second.body).toEqual(first.body);
        },
      );
    });
  });

  given('[case3] a boot.yml with say: []', () => {
    when('[t0] rendered', () => {
      then('no brief is said', async () => {
        const repoPath = genRoleDir({
          slug: 'getOneRoleBootContent-c3t0',
          bootYml: 'always:\n  briefs:\n    say: []\n',
        });

        const { stats } = await getOneRoleBootContent({
          slugRepo: '.this',
          slugRole: 'any',
          subjects: null,
          cwd: repoPath,
        });

        expect(stats.briefsSay).toEqual(0);
      });
    });
  });

  given('[case4] a boot.yml with no say key (parsed as say: null)', () => {
    when('[t0] rendered', () => {
      then('every brief not ref-listed is said', async () => {
        const repoPath = genRoleDir({
          slug: 'getOneRoleBootContent-c4t0',
          bootYml: 'briefs:\n  ref:\n    - briefs/extra.md\n',
        });

        const { body, stats } = await getOneRoleBootContent({
          slugRepo: '.this',
          slugRole: 'any',
          subjects: null,
          cwd: repoPath,
        });

        expect(body).toContain('core brief body');
        expect(body).not.toContain('extra brief body');
        expect(stats.briefsSay).toEqual(1);
        expect(stats.briefsRef).toEqual(1);
      });
    });
  });

  given('[case6] the same role content, under two different repo paths', () => {
    when('[t0] each is rendered', () => {
      /**
       * .what = the cross-worktree clamp behind the cache-eligible claim (M2)
       * .why = a prompt cache hits on a byte-identical prefix. so a second worktree, a
       *   colleague's checkout, or CI reads the cache ONLY if the corpus carries no bytes
       *   that vary by where the repo sits. `[case2]` renders twice at ONE path, which
       *   proves idempotence and says naught about portability — a leaked absolute path
       *   is stable across two renders of one dir and differs across two dirs
       *
       * .note = this clamps the half rhachet owns. that a byte-identical prefix then bills
       *   a cache read is the brain-cli's half, and the journey's M2 step measures it
       */
      then('the two bodies are byte-equal — no path leaks in', async () => {
        const render = (repoPath: string) =>
          getOneRoleBootContent({
            slugRepo: '.this',
            slugRole: 'any',
            subjects: null,
            cwd: repoPath,
          });

        const pathHere = genRoleDir({
          slug: 'getOneRoleBootContent-c6t0-here',
          bootYml: null,
        });
        const pathThere = genRoleDir({
          slug: 'getOneRoleBootContent-c6t0-there',
          bootYml: null,
        });

        // .note = without this the clamp is vacuous: two renders of ONE dir would
        //   pass it while a leaked path went uncaught. the paths differ in length
        //   too, so a leak cannot coincide on char count either
        expect(pathThere).not.toEqual(pathHere);
        expect(pathThere.length).not.toEqual(pathHere.length);

        const here = await render(pathHere);
        const there = await render(pathThere);

        expect(there.body).toEqual(here.body);
        expect(there.stats.chars).toEqual(here.stats.chars);
      });
    });
  });

  given('[case5] a role not linked on disk', () => {
    when('[t0] rendered', () => {
      then('a ConstraintError names the role and the re-link', async () => {
        const repoPath = genTempDir({ slug: 'getOneRoleBootContent-c5t0' });

        const error = await getError(
          getOneRoleBootContent({
            slugRepo: 'ehmpathy',
            slugRole: 'mechanic',
            subjects: null,
            cwd: repoPath,
          }),
        );

        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('repo=ehmpathy role=mechanic');
        expect(JSON.stringify(error)).toContain(
          'rhx roles link --repo ehmpathy --role mechanic',
        );
      });
    });
  });
});
