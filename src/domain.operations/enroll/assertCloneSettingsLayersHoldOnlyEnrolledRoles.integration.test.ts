import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { genTempDir, getError, given, then, when } from 'test-fns';

import { mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { asBrainCliSpawnArgs } from './asBrainCliSpawnArgs';
import { assertCloneSettingsLayersHoldOnlyEnrolledRoles } from './assertCloneSettingsLayersHoldOnlyEnrolledRoles';

const genSettingsOfAuthors = (input: { authors: string[] }) =>
  JSON.stringify({
    hooks: {
      SessionStart: [
        {
          matcher: '*',
          hooks: input.authors.map((author) => ({
            type: 'command',
            command: `boot ${author}`,
            author,
          })),
        },
      ],
    },
  });

/**
 * .what = a repo with one actor brain dir in the split layout, and a home with a grove
 */
const genScene = (input: {
  slug: string;
  repoAuthors: string[];
  groveAuthors: string[];
}) => {
  const root = genTempDir({ slug: input.slug });
  const home = join(root, 'home');
  const repo = join(root, 'repo');
  const brainDir = join(
    repo,
    '.agent/.actors/actor.via.hash=abc/brain/.claude',
  );
  mkdirSync(join(home, '.claude'), { recursive: true });
  mkdirSync(brainDir, { recursive: true });
  writeFileSync(
    join(home, '.claude/settings.json'),
    genSettingsOfAuthors({ authors: input.groveAuthors }),
  );
  symlinkSync(
    join(home, '.claude/settings.json'),
    join(brainDir, 'settings.of.grove.json'),
  );
  symlinkSync('settings.of.grove.json', join(brainDir, 'settings.json'));
  writeFileSync(
    join(brainDir, 'settings.of.repo.json'),
    genSettingsOfAuthors({ authors: input.repoAuthors }),
  );
  const args = asBrainCliSpawnArgs({
    configPath: join(brainDir, 'settings.of.repo.json'),
    passthrough: [],
  });
  return { home, repo, brainDir, args };
};

describe('assertCloneSettingsLayersHoldOnlyEnrolledRoles', () => {
  given('[case1] every layer holds only enrolled roles', () => {
    const scene = genScene({
      slug: 'assert-clone-layers-clean',
      repoAuthors: ['repo=ehmpathy/role=mechanic'],
      groveAuthors: [],
    });
    when('[t0] the guard runs', () => {
      then('it passes', () => {
        expect(() =>
          assertCloneSettingsLayersHoldOnlyEnrolledRoles({
            args: scene.args,
            brainDir: scene.brainDir,
            cwd: scene.repo,
            roles: ['mechanic'],
            home: scene.home,
          }),
        ).not.toThrow();
      });
    });
  });

  given(
    '[case2] the repo layer holds a driver hook for a -driver clone',
    () => {
      const scene = genScene({
        slug: 'assert-clone-layers-repo-leak',
        repoAuthors: ['repo=ehmpathy/role=mechanic', 'repo=bhrain/role=driver'],
        groveAuthors: [],
      });
      when('[t0] the guard runs', () => {
        then('it fails as a malfunction that names the leak', async () => {
          const error = await getError(async () =>
            assertCloneSettingsLayersHoldOnlyEnrolledRoles({
              args: scene.args,
              brainDir: scene.brainDir,
              cwd: scene.repo,
              roles: ['mechanic'],
              home: scene.home,
            }),
          );
          expect(error).toBeInstanceOf(MalfunctionError);
          expect(error.message).toContain('repo=bhrain/role=driver');
          expect(error.message).toContain('settings.of.repo.json');
        });
      });
    },
  );

  given(
    '[case3] the grove (home) holds a driver hook — the layout main shipped',
    () => {
      const scene = genScene({
        slug: 'assert-clone-layers-grove-leak',
        repoAuthors: ['repo=ehmpathy/role=mechanic'],
        groveAuthors: ['repo=bhrain/role=driver'],
      });
      when('[t0] the guard runs', () => {
        then(
          'it fails as a constraint the human fixes in their home settings',
          async () => {
            const error = await getError(async () =>
              assertCloneSettingsLayersHoldOnlyEnrolledRoles({
                args: scene.args,
                brainDir: scene.brainDir,
                cwd: scene.repo,
                roles: ['mechanic'],
                home: scene.home,
              }),
            );
            expect(error).toBeInstanceOf(ConstraintError);
            expect(error.message).toContain('repo=bhrain/role=driver');
            expect(error.message).toContain('home');
          },
        );
      });
    },
  );

  given(
    '[case4] the repo carries a settings.local.json with a driver hook',
    () => {
      const scene = genScene({
        slug: 'assert-clone-layers-local-unread',
        repoAuthors: ['repo=ehmpathy/role=mechanic'],
        groveAuthors: [],
      });
      mkdirSync(join(scene.repo, '.claude'), { recursive: true });
      writeFileSync(
        join(scene.repo, '.claude/settings.local.json'),
        genSettingsOfAuthors({ authors: ['repo=bhrain/role=driver'] }),
      );
      when('[t0] the guard runs on the enroll argv', () => {
        then('it passes, since a clone reads the user source only', () => {
          expect(() =>
            assertCloneSettingsLayersHoldOnlyEnrolledRoles({
              args: scene.args,
              brainDir: scene.brainDir,
              cwd: scene.repo,
              roles: ['mechanic'],
              home: scene.home,
            }),
          ).not.toThrow();
        });
      });

      when('[t1] the human passes `--setting-sources local` through', () => {
        then(
          'it fails as a constraint that names the flag, never a malfunction',
          async () => {
            const error = await getError(async () =>
              assertCloneSettingsLayersHoldOnlyEnrolledRoles({
                args: asBrainCliSpawnArgs({
                  configPath: join(scene.brainDir, 'settings.of.repo.json'),
                  passthrough: ['--setting-sources', 'local'],
                }),
                brainDir: scene.brainDir,
                cwd: scene.repo,
                roles: ['mechanic'],
                home: scene.home,
              }),
            );
            expect(error).toBeInstanceOf(ConstraintError);
            expect(error.message).toContain('--setting-sources');
            expect(error.message).toContain('repo=bhrain/role=driver');
          },
        );
      });
    },
  );
});
