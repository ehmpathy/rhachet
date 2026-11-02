import { ConstraintError } from 'helpful-errors';
import * as fs from 'fs/promises';
import * as path from 'path';

import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';

/**
 * .what = the repo actor's brain dir, relative to the repo root
 * .why = a setup step reaches it by path; the cli under test is still reached only by argv
 */
const REPO_ACTOR_BRAIN_DIR_REL = '.agent/.actors/actor.via.repo=ambient/brain/.claude';

/**
 * .what = a HOME with no `.claude/settings.json`, so no brain dir holds grove arrows
 * .why = a grove on the host would leak the host's settings into the asserts
 */
const invokeWithoutGrove = (
  input: Parameters<typeof invokeRhachetCliBinary>[0],
): ReturnType<typeof invokeRhachetCliBinary> =>
  invokeRhachetCliBinary({
    ...input,
    env: { HOME: genTempDir({ slug: 'init-preflight-home' }), ...input.env },
  });

/**
 * .what = a setup step that must succeed, or the case fails fast with its output
 */
const invokeSetupOrThrow = (
  input: Parameters<typeof invokeRhachetCliBinary>[0],
): void => {
  const result = invokeWithoutGrove(input);
  if (result.status !== 0)
    throw new ConstraintError('a setup step of this case failed', {
      args: input.args,
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
    });
};

/**
 * .what = the authors of every hook the repo actor's settings.of.repo.json holds
 */
const getHookAuthorsOfRepoSettings = async (input: {
  repoPath: string;
}): Promise<string[]> => {
  const content = await fs.readFile(
    path.join(input.repoPath, REPO_ACTOR_BRAIN_DIR_REL, 'settings.of.repo.json'),
    'utf-8',
  );
  const config = JSON.parse(content) as {
    hooks?: Record<
      string,
      Array<{ matcher?: string; hooks?: Array<{ author?: string }> }>
    >;
  };
  return Object.values(config.hooks ?? {}).flatMap((entries) =>
    entries.flatMap((entry) =>
      (entry.hooks ?? []).map((hook) => hook.author ?? ''),
    ),
  );
};

describe('rhachet init — refusals before any role links, and a part-way init', () => {
  given('[case1] the repo actor brain dir is not writable (vision case 2)', () => {
    const repo = useBeforeAll(async () => {
      // a root process writes past a 0o555 mode, so this case cannot hold under root
      if (process.getuid?.() === 0)
        throw new ConstraintError('this case cannot run as root', {
          hint: 'run the suite as a non-root user',
        });
      const r = await genTestTempRepo({ fixture: 'with-role-hooks' });
      invokeSetupOrThrow({ args: ['init', '--roles', 'tester'], cwd: r.path });
      const settingsBefore = await fs.readFile(
        path.join(r.path, REPO_ACTOR_BRAIN_DIR_REL, 'settings.of.repo.json'),
        'utf-8',
      );
      await fs.chmod(path.join(r.path, REPO_ACTOR_BRAIN_DIR_REL), 0o555);
      return { path: r.path, settingsBefore };
    });

    when('[t0] init --roles tester --hooks', () => {
      const result = useBeforeAll(async () => {
        const brainDir = path.join(repo.path, REPO_ACTOR_BRAIN_DIR_REL);
        const invoked = invokeWithoutGrove({
          args: ['init', '--roles', 'tester', '--hooks'],
          cwd: repo.path,
          logOnError: false,
        });
        await fs.chmod(brainDir, 0o755);
        return invoked;
      });

      then('it exits 2, a constraint', () => {
        expect(result.status).toEqual(2);
      });

      then('it names the dir, the errno and the mode', () => {
        expect(result.stderr).toContain('the repo actor brain dir is not writable');
        expect(result.stderr).toContain('EACCES');
        expect(result.stderr).toContain('555');
      });

      then('no role links and no hook syncs', () => {
        expect(result.stdout).not.toContain('link role');
        expect(result.stdout).not.toContain('search for linked roles with hooks');
      });

      then('settings.of.repo.json is byte-equal to before', async () => {
        const settingsAfter = await fs.readFile(
          path.join(repo.path, REPO_ACTOR_BRAIN_DIR_REL, 'settings.of.repo.json'),
          'utf-8',
        );
        expect(settingsAfter).toEqual(repo.settingsBefore);
      });

      then('the refusal matches snapshot', () => {
        // the facts the snapshot carries are asserted here too, so a resnap cannot hide a drift
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('✋ ConstraintError');

        // the owner ids are the host's user; the field names stay live, the numbers are masked,
        //   one token per id ($UID, $GID), so a reader never reads the two as one value.
        //   stdout rides beside stderr, so a banner or a stray row on a refusal shows in the diff
        expect({
          stdout: asSnapshotSafe(result.stdout),
          stderr: asSnapshotSafe(result.stderr).replace(
            /"(uid|gid)": \d+/g,
            (_, key: string) => `"${key}": "$${key.toUpperCase()}"`,
          ),
        }).toMatchSnapshot();
      });
    });

    when('[t1] write is granted, and the same init reruns', () => {
      // [t0] grants write back once its run returns, so this run meets a writable dir
      const result = useBeforeAll(async () =>
        invokeWithoutGrove({
          args: ['init', '--roles', 'tester', '--hooks'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('it exits 0', () => {
        expect(result.status).toEqual(0);
      });
    });
  });

  given('[case2] <repo>/.claude is a symlink to another place (vision case 4)', () => {
    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-role-hooks' });
      invokeSetupOrThrow({ args: ['init', '--roles', 'tester'], cwd: r.path });
      await fs.rm(path.join(r.path, '.claude'));
      await fs.mkdir(path.join(r.path, 'other'));
      await fs.symlink('other', path.join(r.path, '.claude'));
      return r;
    });

    when('[t0] init --roles tester --hooks', () => {
      const result = useBeforeAll(async () =>
        invokeWithoutGrove({
          args: ['init', '--roles', 'tester', '--hooks'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('it exits 2, a constraint', () => {
        expect(result.status).toEqual(2);
      });

      then('it names both realpaths, so it diagnoses itself', async () => {
        expect(result.stderr).toContain('a symlink to another place');
        expect(result.stderr).toContain(
          await fs.realpath(path.join(repo.path, 'other')),
        );
        expect(result.stderr).toContain(
          await fs.realpath(path.join(repo.path, REPO_ACTOR_BRAIN_DIR_REL)),
        );
      });

      then('no role writes through the link', async () => {
        expect(await fs.readdir(path.join(repo.path, 'other'))).toEqual([]);
        expect(result.stdout).not.toContain('link role');
      });

      then('the link itself is left as found', async () => {
        expect(await fs.readlink(path.join(repo.path, '.claude'))).toEqual('other');
      });

      then('the refusal matches snapshot', () => {
        // the facts the snapshot carries are asserted here too, so a resnap cannot hide a drift
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('a symlink to another place');
        expect({
          stdout: asSnapshotSafe(result.stdout),
          stderr: asSnapshotSafe(result.stderr),
        }).toMatchSnapshot();
      });
    });

    when('[t1] the link is removed, and the same init reruns', () => {
      const result = useBeforeAll(async () => {
        await fs.rm(path.join(repo.path, '.claude'));
        return invokeWithoutGrove({
          args: ['init', '--roles', 'tester', '--hooks'],
          cwd: repo.path,
          logOnError: false,
        });
      });

      then('it exits 0', () => {
        expect(result.status).toEqual(0);
      });

      then('the link is created relative, to the repo actor brain dir', async () => {
        expect(await fs.readlink(path.join(repo.path, '.claude'))).toEqual(
          REPO_ACTOR_BRAIN_DIR_REL,
        );
      });
    });
  });

  given('[case3] a fresh clone whose first role init fails part-way (vision case 3)', () => {
    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-role-hooks' });

      // the committed state: hooks of both roles in the repo settings
      invokeSetupOrThrow({
        args: ['init', '--roles', 'tester', 'reviewer', '--hooks'],
        cwd: r.path,
      });

      // a fresh clone: the role links are not committed, so none is on disk
      await fs.rm(path.join(r.path, '.agent', 'repo=test'), {
        recursive: true,
      });

      // the first role's init now fails
      const pkgDir = path.join(r.path, 'node_modules', 'rhachet-roles-test');
      const initPath = path.join(pkgDir, 'roles', 'tester', 'inits', 'fail.sh');
      await fs.mkdir(path.dirname(initPath), { recursive: true });
      await fs.writeFile(initPath, '#!/bin/bash\necho "tester init fails"\nexit 1\n');
      await fs.chmod(initPath, 0o755);
      const ymlPath = path.join(pkgDir, 'rhachet.repo.yml');
      const yml = await fs.readFile(ymlPath, 'utf-8');
      await fs.writeFile(
        ymlPath,
        yml.replace(
          '      dirs: roles/tester/skills\n',
          '      dirs: roles/tester/skills\n    inits:\n      exec:\n        - roles/tester/inits/fail.sh\n',
        ),
      );
      return r;
    });

    when('[t0] before the init', () => {
      then('the repo settings hold the hooks of both roles', async () => {
        const authors = await getHookAuthorsOfRepoSettings({ repoPath: repo.path });
        expect(authors.some((a) => a.includes('repo=test/role=tester'))).toBe(true);
        expect(authors.some((a) => a.includes('repo=test/role=reviewer'))).toBe(true);
      });
    });

    when('[t1] init --roles tester reviewer --hooks', () => {
      const result = useBeforeAll(async () =>
        invokeWithoutGrove({
          args: ['init', '--roles', 'tester', 'reviewer', '--hooks'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('it exits 1: the cause is a role init the system cannot classify', () => {
        expect(result.status).toEqual(1);
      });

      then('it names the failed role, the linked set and the unlinked set', () => {
        expect(result.stderr).toContain(
          'role init failed part-way, at repo=test/role=tester',
        );
        expect(result.stderr).toContain('notLinked');
        expect(result.stderr).toContain('repo=test/role=reviewer');
      });

      then('the hooks sync to the roles linked on disk', () => {
        expect(result.stdout).toContain('search for linked roles with hooks');
      });

      then('no hook is left for the role that is not linked', async () => {
        const authors = await getHookAuthorsOfRepoSettings({ repoPath: repo.path });
        expect(authors.some((a) => a.includes('repo=test/role=reviewer'))).toBe(false);
      });

      then('the failed role keeps its link, so its hooks stay', async () => {
        const authors = await getHookAuthorsOfRepoSettings({ repoPath: repo.path });
        expect(authors.some((a) => a.includes('repo=test/role=tester'))).toBe(true);
      });

      then('the refusal matches snapshot', () => {
        // the facts the snapshot carries are asserted here too, so a resnap cannot hide a drift
        expect(result.status).toEqual(1);
        expect(result.stderr).toContain('role init failed part-way');
        // stdout carries the hook sync to the linked roles, which runs before the refusal
        expect({
          stdout: asSnapshotSafe(result.stdout),
          stderr: asSnapshotSafe(result.stderr),
        }).toMatchSnapshot();
      });
    });

    when('[t2] the tester init is fixed, and the same init reruns', () => {
      const result = useBeforeAll(async () => {
        await fs.writeFile(
          path.join(
            repo.path,
            'node_modules/rhachet-roles-test/roles/tester/inits/fail.sh',
          ),
          '#!/bin/bash\necho "tester init passes"\nexit 0\n',
        );
        return invokeWithoutGrove({
          args: ['init', '--roles', 'tester', 'reviewer', '--hooks'],
          cwd: repo.path,
          logOnError: false,
        });
      });

      then('it exits 0', () => {
        expect(result.status).toEqual(0);
      });

      then('the hooks of tester and reviewer both return', async () => {
        const authors = await getHookAuthorsOfRepoSettings({ repoPath: repo.path });
        expect(authors.some((a) => a.includes('repo=test/role=tester'))).toBe(true);
        expect(authors.some((a) => a.includes('repo=test/role=reviewer'))).toBe(true);
      });
    });
  });

  given('[case4] a tree that pins another rhachet than the one that runs (vision case 7)', () => {
    const repo = useBeforeAll(async () => {
      // a real dir, never the fixture's self-link: a write through that link would land in this repo
      const dir = genTempDir({ slug: 'init-preflight-skew', git: true });
      await fs.mkdir(path.join(dir, 'node_modules', 'rhachet'), { recursive: true });
      await fs.writeFile(
        path.join(dir, 'node_modules', 'rhachet', 'package.json'),
        JSON.stringify({ name: 'rhachet', version: '0.0.1-pinned' }),
      );
      await fs.writeFile(
        path.join(dir, 'package.json'),
        JSON.stringify({ name: 'test-skew', dependencies: {} }),
      );
      return { path: dir };
    });

    when('[t0] init', () => {
      const result = useBeforeAll(async () =>
        invokeWithoutGrove({ args: ['init'], cwd: repo.path, logOnError: false }),
      );

      then('one notice row names the active and the pinned rhx', () => {
        const notices = result.stdout
          .split('\n')
          .filter((row) => row.includes('this repo pins'));
        expect(notices).toHaveLength(1);
        expect(notices[0]).toMatch(/^🐚 rhx \S+ runs; this repo pins 0\.0\.1-pinned$/);
      });

      then('the skew is named, never refused', () => {
        expect(result.stderr).not.toContain('ConstraintError');
        expect(result.stderr).not.toContain('MalfunctionError');
      });

      then('the notice row matches snapshot', () => {
        // the version that runs bumps on every release; the pinned one is the fixture's own
        const notice = result.stdout
          .split('\n')
          .filter((row) => row.includes('this repo pins'))
          .join('\n')
          .replace(/rhx \d+\.\d+\.\d+(?:-[\w.]+)?/, 'rhx $VERSION');
        expect(notice).toMatchSnapshot();
      });
    });
  });

  given('[case5] <repo>/.claude is a file', () => {
    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-role-hooks' });
      invokeSetupOrThrow({ args: ['init', '--roles', 'tester'], cwd: r.path });
      await fs.rm(path.join(r.path, '.claude'));
      await fs.writeFile(path.join(r.path, '.claude'), 'not a dir\n');
      return r;
    });

    when('[t0] init --roles tester --hooks', () => {
      const result = useBeforeAll(async () =>
        invokeWithoutGrove({
          args: ['init', '--roles', 'tester', '--hooks'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('it exits 2, a constraint', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('✋ ConstraintError');
      });

      then('it names the file', () => {
        expect(result.stderr).toContain('is a file');
      });

      then('no role links', () => {
        expect(result.stdout).not.toContain('link role');
      });

      then('the file is left as found', async () => {
        expect(await fs.readFile(path.join(repo.path, '.claude'), 'utf-8')).toEqual(
          'not a dir\n',
        );
      });

      then('the refusal matches snapshot, stdout and stderr', () => {
        // the facts the snapshot carries are asserted here too, so a resnap cannot hide a drift
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('is a file');
        expect({
          stdout: asSnapshotSafe(result.stdout),
          stderr: asSnapshotSafe(result.stderr),
        }).toMatchSnapshot();
      });
    });
  });

  given('[case6] <repo>/.claude is a link that lands on the repo actor brain dir (vision case 6)', () => {
    when('[t0] the link is absolute, and init --roles tester --hooks runs', () => {
      const scene = useBeforeAll(async () => {
        const repo = await genTestTempRepo({ fixture: 'with-role-hooks' });
        invokeSetupOrThrow({ args: ['init', '--roles', 'tester'], cwd: repo.path });
        const linkTarget = path.join(repo.path, REPO_ACTOR_BRAIN_DIR_REL);
        await fs.rm(path.join(repo.path, '.claude'));
        await fs.symlink(linkTarget, path.join(repo.path, '.claude'));
        const result = invokeWithoutGrove({
          args: ['init', '--roles', 'tester', '--hooks'],
          cwd: repo.path,
          logOnError: false,
        });
        return { repo, linkTarget, result };
      });

      then('it exits 0, never refused', () => {
        expect(scene.result.status).toEqual(0);
        expect(scene.result.stderr).not.toContain('ConstraintError');
      });

      then('the role links', () => {
        expect(scene.result.stdout).toContain('link role');
      });

      then('the link lands on the repo actor brain dir', async () => {
        expect(await fs.realpath(path.join(scene.repo.path, '.claude'))).toEqual(
          await fs.realpath(scene.linkTarget),
        );
      });

      then('the absolute link is rewritten relative', async () => {
        expect(await fs.readlink(path.join(scene.repo.path, '.claude'))).toEqual(
          REPO_ACTOR_BRAIN_DIR_REL,
        );
        expect(scene.result.stdout).toContain(`.claude → ${REPO_ACTOR_BRAIN_DIR_REL}`);
      });

      then('the screen matches snapshot, stdout and stderr', () => {
        // the facts the snapshot carries are asserted here too, so a resnap cannot hide a drift
        expect(scene.result.status).toEqual(0);
        expect(scene.result.stderr).not.toContain('ConstraintError');
        expect({
          stdout: asSnapshotSafe(scene.result.stdout),
          stderr: asSnapshotSafe(scene.result.stderr),
        }).toMatchSnapshot();
      });
    });

    when('[t1] the link reaches the brain dir through a hop, and init --roles tester --hooks runs', () => {
      const scene = useBeforeAll(async () => {
        const repo = await genTestTempRepo({ fixture: 'with-role-hooks' });
        invokeSetupOrThrow({ args: ['init', '--roles', 'tester'], cwd: repo.path });
        await fs.rm(path.join(repo.path, '.claude'));
        // a hop: .claude -> hop -> the repo actor brain dir
        await fs.symlink(REPO_ACTOR_BRAIN_DIR_REL, path.join(repo.path, 'hop'));
        await fs.symlink('hop', path.join(repo.path, '.claude'));
        const result = invokeWithoutGrove({
          args: ['init', '--roles', 'tester', '--hooks'],
          cwd: repo.path,
          logOnError: false,
        });
        return { repo, result };
      });

      then('it exits 0, never refused', () => {
        expect(scene.result.status).toEqual(0);
        expect(scene.result.stderr).not.toContain('ConstraintError');
      });

      then('the link lands on the repo actor brain dir', async () => {
        expect(await fs.realpath(path.join(scene.repo.path, '.claude'))).toEqual(
          await fs.realpath(path.join(scene.repo.path, REPO_ACTOR_BRAIN_DIR_REL)),
        );
      });

      then('the link is left as found, through its hop', async () => {
        expect(await fs.readlink(path.join(scene.repo.path, '.claude'))).toEqual('hop');
      });

      then('the brain dir report is silent, since naught changed', () => {
        expect(scene.result.stdout).not.toContain('🧠');
      });

      then('the screen matches snapshot, stdout and stderr', () => {
        // the facts the snapshot carries are asserted here too, so a resnap cannot hide a drift
        expect(scene.result.status).toEqual(0);
        expect(scene.result.stderr).not.toContain('ConstraintError');
        expect({
          stdout: asSnapshotSafe(scene.result.stdout),
          stderr: asSnapshotSafe(scene.result.stderr),
        }).toMatchSnapshot();
      });
    });
  });
});
