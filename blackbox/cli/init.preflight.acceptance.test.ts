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
      await fs.chmod(path.join(r.path, REPO_ACTOR_BRAIN_DIR_REL), 0o555);
      return r;
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

      then('the refusal matches snapshot', () => {
        // the owner ids are the host's user; the field names stay live, the numbers are masked
        expect(
          asSnapshotSafe(result.stderr).replace(
            /"(uid|gid)": \d+/g,
            '"$1": $ID',
          ),
        ).toMatchSnapshot();
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

      then('the refusal matches snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
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
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });
  });
});
