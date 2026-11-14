import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { ContextCli } from '@src/domain.objects/ContextCli';

import {
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readlinkSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { join, relative } from 'node:path';
import { setRoleUnmoddedView } from './setRoleUnmoddedView';

/**
 * .what = a repo whose role mounts its briefs from two package dirs, now shown as a modded view
 * .why = an array-dir link names each entry by its source dir's basename; the restore must
 *   rebuild that same layout
 */
const genRepoWithArrayDirModdedView = (): {
  context: ContextCli;
  roleDir: string;
} => {
  const repoPath = genTempDir({ slug: 'setRoleUnmoddedView-array' });
  const pkgDir = join(repoPath, 'node_modules', 'rhachet-roles-surf');
  for (const [dir, file] of [
    ['briefs.reef', 'rule.prefer.reef-breaks.md'],
    ['briefs.point', 'rule.prefer.point-breaks.md'],
  ] as const) {
    mkdirSync(join(pkgDir, dir), { recursive: true });
    writeFileSync(join(pkgDir, dir, file), `# ${file}\n`);
  }
  const roleDir = join(repoPath, '.agent', 'repo=surf', 'role=surfer');

  // the modded view: per-file links, under each entry, as a render leaves them
  for (const [dir, file] of [
    ['briefs.reef', 'rule.prefer.reef-breaks.md'],
    ['briefs.point', 'rule.prefer.point-breaks.md'],
  ] as const) {
    const entryDir = join(roleDir, 'briefs', dir);
    mkdirSync(entryDir, { recursive: true });
    symlinkSync(
      relative(entryDir, join(pkgDir, dir, file)),
      join(entryDir, file),
    );
  }
  return {
    context: new ContextCli({ cwd: repoPath, gitroot: repoPath }),
    roleDir,
  };
};

describe('setRoleUnmoddedView', () => {
  given('[case1] a role whose briefs mount from two package dirs', () => {
    const scene = useBeforeAll(async () => genRepoWithArrayDirModdedView());

    when('[t0] the view is restored', () => {
      useBeforeAll(async () => {
        const target = (dir: string): string =>
          relative(
            scene.roleDir,
            join(
              scene.context.gitroot,
              'node_modules',
              'rhachet-roles-surf',
              dir,
            ),
          );
        setRoleUnmoddedView(
          {
            roleDir: scene.roleDir,
            sources: {
              briefs: [
                { at: 'briefs.point', target: target('briefs.point') },
                { at: 'briefs.reef', target: target('briefs.reef') },
              ],
              skills: [],
            },
          },
          scene.context,
        );
        return {};
      });

      then('each entry is a dir link, named as the record holds it', () => {
        const briefsDir = join(scene.roleDir, 'briefs');
        expect(readdirSync(briefsDir).sort()).toEqual([
          'briefs.point',
          'briefs.reef',
        ]);
        for (const entry of ['briefs.point', 'briefs.reef'])
          expect(lstatSync(join(briefsDir, entry)).isSymbolicLink()).toBe(true);
      });

      then('each entry points at its own source dir', () => {
        const briefsDir = join(scene.roleDir, 'briefs');
        expect(readlinkSync(join(briefsDir, 'briefs.reef'))).toContain(
          'briefs.reef',
        );
        expect(
          existsSync(
            join(briefsDir, 'briefs.point', 'rule.prefer.point-breaks.md'),
          ),
        ).toBe(true);
      });

      then('a kind with no source holds no dir', () => {
        expect(existsSync(join(scene.roleDir, 'skills'))).toBe(false);
      });
    });
  });

  given('[case2] a source mounted under a name other than its basename', () => {
    const scene = useBeforeAll(async () => genRepoWithArrayDirModdedView());

    when('[t0] the view is restored', () => {
      useBeforeAll(async () => {
        const target = (dir: string): string =>
          relative(
            scene.roleDir,
            join(
              scene.context.gitroot,
              'node_modules',
              'rhachet-roles-surf',
              dir,
            ),
          );
        setRoleUnmoddedView(
          {
            roleDir: scene.roleDir,
            sources: {
              briefs: [
                { at: 'point', target: target('briefs.point') },
                { at: 'reef', target: target('briefs.reef') },
              ],
              skills: [],
            },
          },
          scene.context,
        );
        return {};
      });

      then('each entry comes back at its recorded at, not its basename', () => {
        const briefsDir = join(scene.roleDir, 'briefs');
        expect(readdirSync(briefsDir).sort()).toEqual(['point', 'reef']);
        expect(
          existsSync(join(briefsDir, 'reef', 'rule.prefer.reef-breaks.md')),
        ).toBe(true);
      });
    });
  });
});
