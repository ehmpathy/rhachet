import {
  chmodSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';

/**
 * .what = role inits meet the split brain dir layout: `rhx init --roles` and `rhx upgrade`
 *         put the repo actor's brain dir in the layout BEFORE the role inits, and the layout
 *         always holds `settings.of.repo.json`
 * .why = a permission init (the #895 design) adds its allows to `settings.of.repo.json`. run
 *        before the layout, it met a real `<repo>/.claude` with no such file, and the next
 *        layout findsert replaced what it wrote (`inventory.of=requirements.case=8`)
 *
 * .note = the tester init refuses unless `<repo>/.claude` is already the brain dir link and
 *   `settings.of.repo.json` is already present, so a regression of either the order or the
 *   guarantee fails the command, not only an assert
 */

/** .what = the repo actor's brain dir, relative to a repo root */
const REPO_ACTOR_BRAIN_DIR = join(
  '.agent',
  '.actors',
  'actor.via.repo=ambient',
  'brain',
  '.claude',
);

/** .what = the allow the tester init adds */
const INIT_ALLOW = 'Bash(npx rhachet run:*)';

/** .what = the grove content: the human's home settings */
const GROVE_CONTENT = `${JSON.stringify({ theme: 'dark' }, null, 2)}\n`;

/**
 * .what = a role init in the #895 shape: it adds its allow to `settings.of.repo.json`, via temp +
 *   rename, and refuses if the layout is not in place before it runs
 */
const PERMISSION_INIT_SCRIPT = `#!/bin/bash
set -euo pipefail
if [ ! -L .claude ]; then echo "tester init: .claude is not yet the brain dir link" >&2; exit 1; fi
if [ ! -f .claude/settings.of.repo.json ]; then echo "tester init: .claude/settings.of.repo.json is absent" >&2; exit 1; fi
node -e '
const fs = require("fs");
const path = ".claude/settings.of.repo.json";
const config = JSON.parse(fs.readFileSync(path, "utf8"));
const allow = (config.permissions && config.permissions.allow) || [];
if (!allow.includes("${INIT_ALLOW}")) allow.push("${INIT_ALLOW}");
config.permissions = Object.assign({}, config.permissions, { allow });
const temp = path + "." + process.pid + ".tmp";
fs.writeFileSync(temp, JSON.stringify(config, null, 2) + "\\n");
fs.renameSync(temp, path);
'
echo "tester init: allow written"
`;

/**
 * .what = a temp HOME with a grove, so each brain dir's settings.json is an arrow
 */
const genHomeWithGrove = (input: { slug: string }): string => {
  const home = genTempDir({ slug: input.slug });
  mkdirSync(join(home, '.claude'), { recursive: true });
  writeFileSync(join(home, '.claude', 'settings.json'), GROVE_CONTENT);
  return home;
};

/**
 * .what = a temp repo with the test roles, whose tester init is the permission init
 */
const genRepoWithPermissionInit = async (): Promise<{ path: string }> => {
  const repo = await genTestTempRepo({ fixture: 'with-roles-full' });
  const scriptPath = join(
    repo.path,
    'node_modules',
    'rhachet-roles-test',
    'roles',
    'tester',
    'inits',
    'setup.init.sh',
  );
  writeFileSync(scriptPath, PERMISSION_INIT_SCRIPT);
  chmodSync(scriptPath, 0o755);
  return repo;
};

/**
 * .what = turn `<repo>/.claude` into a pre-layout real dir with a real settings.json, and
 *   drop the repo actor dir, as every repo that predates the split layout holds them
 */
const setRepoToLegacyLayout = (input: { repoPath: string }): void => {
  rmSync(join(input.repoPath, '.claude'), { recursive: true, force: true });
  rmSync(join(input.repoPath, '.agent', '.actors', 'actor.via.repo=ambient'), {
    recursive: true,
    force: true,
  });
  mkdirSync(join(input.repoPath, '.claude'), { recursive: true });
  writeFileSync(
    join(input.repoPath, '.claude', 'settings.json'),
    `${JSON.stringify({ hooks: {} }, null, 2)}\n`,
  );
};

/**
 * .what = the repo actor's settings.of.repo.json, parsed
 */
const getRepoSettings = (input: {
  repoPath: string;
}): {
  permissions?: { allow?: string[] };
  hooks?: Record<string, unknown[]>;
} =>
  JSON.parse(
    readFileSync(
      join(input.repoPath, REPO_ACTOR_BRAIN_DIR, 'settings.of.repo.json'),
      'utf8',
    ),
  );

describe('role inits meet the split brain dir layout', () => {
  given('[case1] a legacy repo whose role init writes allows', () => {
    const scene = useBeforeAll(async () => {
      const repo = await genRepoWithPermissionInit();
      const home = genHomeWithGrove({ slug: 'role-inits-init-home' });
      setRepoToLegacyLayout({ repoPath: repo.path });
      return { repo, home };
    });

    when('[t0] rhx init --roles tester --hooks, once', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['init', '--roles', 'tester', '--hooks'],
          cwd: scene.repo.path,
          env: { HOME: scene.home },
          logOnError: false,
        }),
      );

      then('exits 0: the init met the link and settings.of.repo.json', () => {
        expect({ status: result.status, stdout: result.stdout }).toMatchObject({
          status: 0,
        });
        expect(result.stdout).toContain('tester init: allow written');
      });

      then('the allow is in the repo actor settings.of.repo.json', () => {
        expect(
          getRepoSettings({ repoPath: scene.repo.path }).permissions?.allow,
        ).toEqual([INIT_ALLOW]);
      });

      then('the hooks the sync wrote sit beside it: naught dropped', () => {
        expect(
          getRepoSettings({ repoPath: scene.repo.path }).hooks?.SessionStart
            ?.length,
        ).toBeGreaterThan(0);
      });

      then("claude's settings.json is the grove arrow", () => {
        expect(
          readlinkSync(
            join(scene.repo.path, REPO_ACTOR_BRAIN_DIR, 'settings.json'),
          ),
        ).toEqual('settings.of.grove.json');
      });

      then('the home settings are byte-identical', () => {
        expect(
          readFileSync(join(scene.home, '.claude', 'settings.json'), 'utf8'),
        ).toEqual(GROVE_CONTENT);
      });

      then('the migration is still reported, though it ran before the inits', () => {
        expect(result.stdout).toContain('linked');
      });
    });

    when('[t1] rhx init --roles tester --hooks, again', () => {
      const again = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['init', '--roles', 'tester', '--hooks'],
          cwd: scene.repo.path,
          env: { HOME: scene.home },
          logOnError: false,
        }),
      );

      then('exits 0', () => {
        expect(again.status).toEqual(0);
      });

      then('the allow is held once, never doubled or dropped', () => {
        expect(
          getRepoSettings({ repoPath: scene.repo.path }).permissions?.allow,
        ).toEqual([INIT_ALLOW]);
      });
    });
  });

  given('[case2] a migrated repo with no hooked roles and no settings.of.repo.json', () => {
    const scene = useBeforeAll(async () => {
      const repo = await genTestTempRepo({ fixture: 'with-roles-full' });
      const home = genHomeWithGrove({ slug: 'role-inits-nohooks-home' });

      // migrate once, then drop settings.of.repo.json, as a repo from before the guarantee holds
      invokeRhachetCliBinary({
        args: ['init', '--roles', 'reviewer'],
        cwd: repo.path,
        env: { HOME: home },
      });
      rmSync(join(repo.path, REPO_ACTOR_BRAIN_DIR, 'settings.of.repo.json'), {
        force: true,
      });
      return { repo, home };
    });

    when('[t0] rhx init --roles reviewer, with no hook sync', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['init', '--roles', 'reviewer'],
          cwd: scene.repo.path,
          env: { HOME: scene.home },
          logOnError: false,
        }),
      );

      then('exits 0', () => {
        expect(result.status).toEqual(0);
      });

      then('settings.of.repo.json is a real file, findserted empty', () => {
        const path = join(scene.repo.path, REPO_ACTOR_BRAIN_DIR, 'settings.of.repo.json');
        expect(lstatSync(path).isFile()).toBe(true);
        expect(readFileSync(path, 'utf8')).toEqual('{}\n');
      });
    });
  });

  given('[case3] a legacy repo with a linked role whose init writes allows', () => {
    const scene = useBeforeAll(async () => {
      const repo = await genRepoWithPermissionInit();
      const home = genHomeWithGrove({ slug: 'role-inits-upgrade-home' });

      // link the tester role, then return the brain dir to its pre-layout shape
      invokeRhachetCliBinary({
        args: ['init', '--roles', 'tester'],
        cwd: repo.path,
        env: { HOME: home },
      });
      setRepoToLegacyLayout({ repoPath: repo.path });
      return { repo, home };
    });

    when('[t0] rhx upgrade --roles test/tester --which local, once', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['upgrade', '--roles', 'test/tester', '--which', 'local'],
          cwd: scene.repo.path,
          env: { HOME: scene.home },
          logOnError: false,
        }),
      );

      then('exits 0: the init met the link and settings.of.repo.json', () => {
        expect({ status: result.status, stdout: result.stdout }).toMatchObject({
          status: 0,
        });
        expect(result.stdout).toContain('tester init: allow written');
      });

      then('the allow is in the repo actor settings.of.repo.json', () => {
        expect(
          getRepoSettings({ repoPath: scene.repo.path }).permissions?.allow,
        ).toEqual([INIT_ALLOW]);
      });

      then('the hooks the upgrade synced sit beside it: naught dropped', () => {
        expect(
          getRepoSettings({ repoPath: scene.repo.path }).hooks?.SessionStart
            ?.length,
        ).toBeGreaterThan(0);
      });

      then("claude's settings.json is the grove arrow", () => {
        expect(
          readlinkSync(
            join(scene.repo.path, REPO_ACTOR_BRAIN_DIR, 'settings.json'),
          ),
        ).toEqual('settings.of.grove.json');
      });

      then('the home settings are byte-identical', () => {
        expect(
          readFileSync(join(scene.home, '.claude', 'settings.json'), 'utf8'),
        ).toEqual(GROVE_CONTENT);
      });
    });
  });
});
