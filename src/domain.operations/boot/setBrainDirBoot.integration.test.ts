import { ConstraintError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { genSampleRepoWithRoles } from '@src/.test/assets/genSampleRepoWithRoles';
import { genSampleRepoWithSubjects } from '@src/.test/assets/genSampleRepoWithSubjects';

import { mkdirSync, readFileSync, readlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getOneRhachetBootIntro } from './getOneRhachetBootIntro';
import { setBrainDirBoot } from './setBrainDirBoot';

const ROLES = [
  { repo: '.this', role: 'any', subjects: null },
  { repo: 'fixture', role: 'zeta', subjects: null },
];

/**
 * .what = a repo with two synthetic roles, `.this/any` and `fixture/zeta`
 */
const genRepoWithRoles = (input: { slug: string }): string =>
  genSampleRepoWithRoles({ slug: input.slug, roles: ROLES });

describe('setBrainDirBoot', () => {
  given('[case1] a repo with two linked roles', () => {
    when('[t0] one brain dir is rendered', () => {
      then(
        'boot.md holds both roles, no stats block, and the pointer files are set',
        async () => {
          const repoPath = genRepoWithRoles({ slug: 'setBrainDirBoot-c1t0' });
          const brainDir = join(repoPath, 'brain', '.claude');

          const render = await setBrainDirBoot({
            brainDir,
            roles: ROLES,
            repoPath,
            scope: { kind: 'repo' },
          });

          const bootMd = readFileSync(render.bootMdPath, 'utf8');
          expect(render.bootMdPath).toEqual(join(brainDir, 'boot.md'));
          expect(bootMd).toContain('any brief body');
          expect(bootMd).toContain('zeta brief body');
          expect(bootMd).not.toContain('<stats>');
          expect(render.stats.roles).toEqual(2);
          expect(render.agentsMdReset).toEqual(false);
          expect(readFileSync(join(brainDir, 'AGENTS.md'), 'utf8')).toEqual(
            '@boot.md\n',
          );
          expect(readlinkSync(join(brainDir, 'CLAUDE.md'))).toEqual(
            'AGENTS.md',
          );
          expect(bootMd).toMatchSnapshot();
        },
      );

      then(
        'boot.md opens with the rhachet intro, ahead of every role',
        async () => {
          const repoPath = genRepoWithRoles({ slug: 'setBrainDirBoot-c1t0b' });
          const render = await setBrainDirBoot({
            brainDir: join(repoPath, 'brain', '.claude'),
            roles: ROLES,
            repoPath,
            scope: { kind: 'actor', actorExid: 'abc12345' },
          });

          // the intro tells a clone `rhx list` and `rhx <skill> --help` exist; a clone must
          //   read it first, in every actor's brain dir alike
          const bootMd = readFileSync(render.bootMdPath, 'utf8');
          const intro = getOneRhachetBootIntro().body;
          expect(bootMd.startsWith(intro)).toEqual(true);
          expect(bootMd.indexOf(intro)).toBeLessThan(
            bootMd.indexOf('any brief body'),
          );
          expect(bootMd.indexOf(intro)).toBeLessThan(
            bootMd.indexOf('zeta brief body'),
          );
        },
      );
    });

    when('[t1] two brain dirs are rendered, roles in opposite order', () => {
      then('the two boot.md files are byte-equal', async () => {
        const repoPath = genRepoWithRoles({ slug: 'setBrainDirBoot-c1t1' });

        const renderA = await setBrainDirBoot({
          brainDir: join(repoPath, 'a'),
          roles: ROLES,
          repoPath,
          scope: { kind: 'repo' },
        });
        const renderB = await setBrainDirBoot({
          brainDir: join(repoPath, 'b'),
          roles: [...ROLES].reverse(),
          repoPath,
          scope: { kind: 'actor', actorExid: 'abc12345' },
        });

        expect(readFileSync(renderB.bootMdPath, 'utf8')).toEqual(
          readFileSync(renderA.bootMdPath, 'utf8'),
        );
      });
    });

    when('[t2] one brain dir is rendered twice', () => {
      then('the second render yields the same bytes and no reset', async () => {
        const repoPath = genRepoWithRoles({ slug: 'setBrainDirBoot-c1t2' });
        const brainDir = join(repoPath, 'brain');
        const first = await setBrainDirBoot({
          brainDir,
          roles: ROLES,
          repoPath,
          scope: { kind: 'repo' },
        });
        const bytesFirst = readFileSync(first.bootMdPath, 'utf8');

        const second = await setBrainDirBoot({
          brainDir,
          roles: ROLES,
          repoPath,
          scope: { kind: 'repo' },
        });

        expect(readFileSync(second.bootMdPath, 'utf8')).toEqual(bytesFirst);
        expect(second.agentsMdReset).toEqual(false);
      });
    });

    when('[t3] the same roles are rendered in two repos at two paths', () => {
      then('the two boot.md files are byte-equal', async () => {
        // two repos stand in for two worktrees: a repo path leaked into the corpus breaks this
        const repoPathA = genRepoWithRoles({ slug: 'setBrainDirBoot-c1t3a' });
        const repoPathB = genRepoWithRoles({ slug: 'setBrainDirBoot-c1t3b' });
        expect(repoPathA).not.toEqual(repoPathB);

        const renderA = await setBrainDirBoot({
          brainDir: join(repoPathA, 'brain'),
          roles: ROLES,
          repoPath: repoPathA,
          scope: { kind: 'repo' },
        });
        const renderB = await setBrainDirBoot({
          brainDir: join(repoPathB, 'brain'),
          roles: ROLES,
          repoPath: repoPathB,
          scope: { kind: 'repo' },
        });

        expect(readFileSync(renderB.bootMdPath, 'utf8')).toEqual(
          readFileSync(renderA.bootMdPath, 'utf8'),
        );
      });
    });
  });

  given('[case2] a role not linked on disk', () => {
    when('[t0] the brain dir is rendered', () => {
      then(
        'a ConstraintError names the role, and no boot.md is written',
        async () => {
          const repoPath = genRepoWithRoles({ slug: 'setBrainDirBoot-c2t0' });
          const brainDir = join(repoPath, 'brain');

          const error = await getError(
            setBrainDirBoot({
              brainDir,
              roles: [
                ...ROLES,
                { repo: 'fixture', role: 'absent', subjects: null },
              ],
              repoPath,
              scope: { kind: 'repo' },
            }),
          );

          expect(error).toBeInstanceOf(ConstraintError);
          expect(error.message).toContain('role=absent');
          const bootMdRead = await getError(async () =>
            readFileSync(join(brainDir, 'boot.md'), 'utf8'),
          );
          expect((bootMdRead as NodeJS.ErrnoException).code).toEqual('ENOENT');
        },
      );
    });
  });

  given('[case3] a brain dir with a hand-edited AGENTS.md', () => {
    when('[t0] the brain dir is rendered', () => {
      then('the render reports the reset', async () => {
        const repoPath = genRepoWithRoles({ slug: 'setBrainDirBoot-c3t0' });
        const brainDir = join(repoPath, 'brain');
        mkdirSync(brainDir, { recursive: true });
        writeFileSync(join(brainDir, 'AGENTS.md'), 'hand edit\n');

        const render = await setBrainDirBoot({
          brainDir,
          roles: ROLES,
          repoPath,
          scope: { kind: 'repo' },
        });

        expect(render.agentsMdReset).toEqual(true);
      });
    });
  });

  given('[case4] a brain dir with a CLAUDE.md file', () => {
    when('[t0] the brain dir is rendered', () => {
      then('a ConstraintError is thrown', async () => {
        const repoPath = genRepoWithRoles({ slug: 'setBrainDirBoot-c4t0' });
        const brainDir = join(repoPath, 'brain');
        mkdirSync(brainDir, { recursive: true });
        writeFileSync(join(brainDir, 'CLAUDE.md'), 'a human file');

        const error = await getError(
          setBrainDirBoot({
            brainDir,
            roles: ROLES,
            repoPath,
            scope: { kind: 'repo' },
          }),
        );

        expect(error).toBeInstanceOf(ConstraintError);
      });
    });
  });

  given('[case5] a role that declares subjects (wish 2, 3)', () => {
    // `always` holds base; `flow` inherits it; `lean` sheds it (genSampleRepoWithSubjects)
    when('[t0] the role is rendered at the focus any::flow', () => {
      then('boot.md holds always and flow, and no other subject', async () => {
        const repoPath = genSampleRepoWithSubjects({
          slug: 'setBrainDirBoot-c5t0',
        });
        const render = await setBrainDirBoot({
          brainDir: join(repoPath, 'brain', '.claude'),
          roles: [
            { repo: '.this', role: 'any', subjects: ['flow'] },
            { repo: 'fixture', role: 'zeta', subjects: null },
          ],
          repoPath,
          scope: { kind: 'repo' },
        });
        const bootMd = readFileSync(render.bootMdPath, 'utf8');
        expect(bootMd).toContain('any base body');
        expect(bootMd).toContain('any flow body');
        expect(bootMd).not.toContain('any lean body');
        expect(bootMd).toContain('zeta brief body');
      });

      then('the focused subject brings its own skills (SK1)', async () => {
        const repoPath = genSampleRepoWithSubjects({
          slug: 'setBrainDirBoot-c5t0-skill',
        });
        const render = await setBrainDirBoot({
          brainDir: join(repoPath, 'brain', '.claude'),
          roles: [{ repo: '.this', role: 'any', subjects: ['flow'] }],
          repoPath,
          scope: { kind: 'repo' },
        });
        expect(readFileSync(render.bootMdPath, 'utf8')).toContain(
          'skills/flow.sh',
        );
      });
    });

    when('[t1] the role is rendered at the focus any::lean', () => {
      then('boot.md holds lean alone, since lean sheds always', async () => {
        const repoPath = genSampleRepoWithSubjects({
          slug: 'setBrainDirBoot-c5t1',
        });
        const render = await setBrainDirBoot({
          brainDir: join(repoPath, 'brain', '.claude'),
          roles: [{ repo: '.this', role: 'any', subjects: ['lean'] }],
          repoPath,
          scope: { kind: 'repo' },
        });
        const bootMd = readFileSync(render.bootMdPath, 'utf8');
        expect(bootMd).toContain('any lean body');
        expect(bootMd).not.toContain('any base body');
        expect(bootMd).not.toContain('any flow body');
        expect(bootMd).not.toContain('skills/flow.sh');
      });
    });

    when('[t2] the role is rendered whole', () => {
      then('boot.md holds always and every subject, as before', async () => {
        const repoPath = genSampleRepoWithSubjects({
          slug: 'setBrainDirBoot-c5t2',
        });
        const render = await setBrainDirBoot({
          brainDir: join(repoPath, 'brain', '.claude'),
          roles: [{ repo: '.this', role: 'any', subjects: null }],
          repoPath,
          scope: { kind: 'repo' },
        });
        const bootMd = readFileSync(render.bootMdPath, 'utf8');
        expect(bootMd).toContain('any base body');
        expect(bootMd).toContain('any flow body');
        expect(bootMd).toContain('any lean body');
      });
    });

    when(
      '[t3] the recorded focus names a subject the spec no longer declares (U1)',
      () => {
        then(
          'the render halts loud and names the declared subjects',
          async () => {
            const repoPath = genSampleRepoWithSubjects({
              slug: 'setBrainDirBoot-c5t3',
            });
            const error = await getError(
              setBrainDirBoot({
                brainDir: join(repoPath, 'brain', '.claude'),
                roles: [{ repo: '.this', role: 'any', subjects: ['gone'] }],
                repoPath,
                scope: { kind: 'repo' },
              }),
            );
            expect(error).toBeInstanceOf(ConstraintError);
            expect(error.message).toContain("declares no subject 'gone'");
            expect(error.message).toContain('::flow');
            expect(error.message).toContain('::lean');
          },
        );
      },
    );
  });
});
