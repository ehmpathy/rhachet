import {
  genTempDir,
  getError,
  given,
  then,
  useBeforeAll,
  when,
} from 'test-fns';

import { execFileSync } from 'node:child_process';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { syncDefaultBrainDir } from './syncDefaultBrainDir';

const DEFAULT_BRAIN_DIR_REL =
  '.agent/.actors/actor.via.slug=.default/brain/.claude';

/**
 * .what = a git repo with two synthetic roles, `.this/any` and `fixture/zeta`
 */
const genRepoWithRoles = (input: { slug: string }): string => {
  const repoPath = realpathSync(genTempDir({ slug: input.slug, git: true }));
  const roles = [
    { repo: '.this', role: 'any', brief: 'any brief body' },
    { repo: 'fixture', role: 'zeta', brief: 'zeta brief body' },
  ];
  for (const role of roles) {
    const roleDir = join(
      repoPath,
      '.agent',
      `repo=${role.repo}`,
      `role=${role.role}`,
    );
    mkdirSync(join(roleDir, 'briefs'), { recursive: true });
    writeFileSync(join(roleDir, 'readme.md'), `${role.role} readme`);
    writeFileSync(join(roleDir, 'briefs', 'core.md'), role.brief);
  }
  writeFileSync(
    join(repoPath, '.gitignore'),
    'node_modules\n.agent/.actors/\n',
  );
  return repoPath;
};

const ROLES = [
  { repo: '.this', role: 'any' },
  { repo: 'fixture', role: 'zeta' },
];

/**
 * .what = whether git ignores a path in a repo, via the index-free check
 */
const isIgnored = (input: { repo: string; path: string }): boolean => {
  try {
    execFileSync('git', ['check-ignore', '--no-index', '-q', input.path], {
      cwd: input.repo,
    });
    return true;
  } catch {
    return false;
  }
};

describe('syncDefaultBrainDir', () => {
  given('[case1] a repo with two linked roles and no <repo>/.claude', () => {
    const scene = useBeforeAll(async () => {
      const repoPath = genRepoWithRoles({ slug: 'sync-default-brain-dir' });
      const result = await syncDefaultBrainDir({ repoPath, refsLinked: ROLES });
      return { repoPath, result };
    });

    when('[t0] the default brain dir is synced', () => {
      then('boot.md holds both roles, under the default scope', () => {
        expect(scene.result.render.scope).toEqual({ kind: 'default' });
        expect(scene.result.render.bootMdPath).toEqual(
          join(scene.repoPath, DEFAULT_BRAIN_DIR_REL, 'boot.md'),
        );
        const bootMd = readFileSync(scene.result.render.bootMdPath, 'utf8');
        expect(bootMd).toContain('any brief body');
        expect(bootMd).toContain('zeta brief body');
      });

      then(
        '<repo>/.claude is the relative symlink to the default brain dir',
        () => {
          expect(scene.result.symlink.effect).toEqual('CREATED');
          expect(readlinkSync(join(scene.repoPath, '.claude'))).toEqual(
            DEFAULT_BRAIN_DIR_REL,
          );
          expect(
            readFileSync(join(scene.repoPath, '.claude', 'AGENTS.md'), 'utf8'),
          ).toEqual('@boot.md\n');
        },
      );

      then(
        'boot.md and local settings are ignored, and the rest of the default dir is not',
        () => {
          expect(
            readFileSync(
              join(scene.repoPath, DEFAULT_BRAIN_DIR_REL, '.gitignore'),
              'utf8',
            ),
          ).toEqual('boot.md\n*.local.json\n');
          expect(
            isIgnored({
              repo: scene.repoPath,
              path: `${DEFAULT_BRAIN_DIR_REL}/settings.local.json`,
            }),
          ).toBe(true);
          expect(
            isIgnored({
              repo: scene.repoPath,
              path: `${DEFAULT_BRAIN_DIR_REL}/boot.md`,
            }),
          ).toBe(true);
          for (const tracked of ['AGENTS.md', 'CLAUDE.md', 'settings.json'])
            expect(
              isIgnored({
                repo: scene.repoPath,
                path: `${DEFAULT_BRAIN_DIR_REL}/${tracked}`,
              }),
            ).toBe(false);
        },
      );

      then(
        'the repo .gitignore spares the default dir and still ignores a hash actor',
        () => {
          expect(
            readFileSync(join(scene.repoPath, '.gitignore'), 'utf8'),
          ).toEqual(
            'node_modules\n.agent/.actors/*\n!.agent/.actors/actor.via.slug=.default/\n',
          );
          expect(
            isIgnored({
              repo: scene.repoPath,
              path: '.agent/.actors/actor.via.hash=abc12345/actor.json',
            }),
          ).toBe(true);
        },
      );
    });

    when('[t1] the default brain dir is synced again', () => {
      const rerun = useBeforeAll(async () => {
        const gitignoreBefore = readFileSync(
          join(scene.repoPath, '.gitignore'),
          'utf8',
        );
        const result = await syncDefaultBrainDir({
          repoPath: scene.repoPath,
          refsLinked: ROLES,
        });
        const gitignoreAfter = readFileSync(
          join(scene.repoPath, '.gitignore'),
          'utf8',
        );
        return { result, gitignoreBefore, gitignoreAfter };
      });

      then('the link and the .gitignore are unchanged', () => {
        expect(rerun.result.symlink.effect).toEqual('FOUND');
        expect(rerun.gitignoreAfter).toEqual(rerun.gitignoreBefore);
      });
    });
  });

  given('[case2] a render that throws', () => {
    const scene = useBeforeAll(async () => {
      const repoPath = genRepoWithRoles({
        slug: 'sync-default-brain-dir-throw',
      });
      const error = await getError(
        syncDefaultBrainDir({
          repoPath,
          refsLinked: [{ repo: 'fixture', role: 'absent' }],
        }),
      );
      return { repoPath, error };
    });

    when('[t0] the default brain dir is synced', () => {
      then('the error propagates', () => {
        expect(scene.error).toBeInstanceOf(Error);
      });

      then('no <repo>/.claude is made', () => {
        expect(existsSync(join(scene.repoPath, '.claude'))).toBe(false);
        expect(() => lstatSync(join(scene.repoPath, '.claude'))).toThrow();
      });
    });
  });
});
