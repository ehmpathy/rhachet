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

/** .what = a per-box grant in a real settings.local.json the layout must replace */
const LOCAL_GRANT = 'Bash(echo role-inits-local-grant)';

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

/**
 * .what = the `🧠` layout report block from a `roles init` stdout: its header, the `replaced`
 *   label, and the rows under it — never the init output that follows
 */
const asLayoutReportBlock = (input: { stdout: string }): string => {
  const lines = input.stdout.split('\n');
  const start = lines.findIndex((line) => line.startsWith('🧠 '));
  if (start === -1) return '';
  const rest = lines.slice(start + 1);
  const end = rest.findIndex(
    (line) => !/^ {3}└─ replaced$|^ {6}[├└]─ /.test(line),
  );
  return [lines[start], ...rest.slice(0, end === -1 ? rest.length : end)].join(
    '\n',
  );
};

/** .what = a hand claudeMdExcludes entry rhachet does not derive */
const HAND_EXCLUDE = '**/docs/CLAUDE.md';

/**
 * .what = the first `🧠` tree from a stdout: its header and every branch line under it, up to
 *   the blank line that ends the tree
 */
const asBrainTreeBlock = (input: { stdout: string }): string => {
  const lines = input.stdout.split('\n');
  const start = lines.findIndex((line) => line.startsWith('🧠 '));
  if (start === -1) return '';
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.trim() === '');
  return [lines[start], ...rest.slice(0, end === -1 ? rest.length : end)].join(
    '\n',
  );
};

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

      then(
        'settings.of.repo.json is a real file, findserted with only the claudeMdExcludes (case=11)',
        () => {
          const path = join(scene.repo.path, REPO_ACTOR_BRAIN_DIR, 'settings.of.repo.json');
          expect(lstatSync(path).isFile()).toBe(true);
          expect(JSON.parse(readFileSync(path, 'utf8'))).toEqual({
            claudeMdExcludes: [
              '**/home/*/.claude/CLAUDE.md',
              '**/Users/*/.claude/CLAUDE.md',
              '/root/.claude/CLAUDE.md',
              '/github/home/.claude/CLAUDE.md',
              '**/CLAUDE.local.md',
            ],
          });
        },
      );
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

  given('[case4] a split-layout repo with a real settings.local.json', () => {
    const scene = useBeforeAll(async () => {
      const repo = await genRepoWithPermissionInit();
      const home = genHomeWithGrove({ slug: 'role-inits-roles-init-home' });

      // link the tester role, which lays the split layout
      invokeRhachetCliBinary({
        args: ['init', '--roles', 'tester'],
        cwd: repo.path,
        env: { HOME: home },
      });

      // a human's per-box grants, as a real file where the local arrow belongs
      const localPath = join(repo.path, REPO_ACTOR_BRAIN_DIR, 'settings.local.json');
      rmSync(localPath, { force: true });
      writeFileSync(
        localPath,
        `${JSON.stringify({ permissions: { allow: [LOCAL_GRANT] } }, null, 2)}\n`,
      );
      return { repo, home };
    });

    when('[t0] rhx roles init --role tester', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'init', '--role', 'tester'],
          cwd: scene.repo.path,
          env: { HOME: scene.home },
          logOnError: false,
        }),
      );

      then('exits 0: the init ran', () => {
        expect({ status: result.status, stderr: result.stderr }).toMatchObject({
          status: 0,
        });
        expect(result.stdout).toContain('tester init: allow written');
      });

      then('settings.local.json is the arrow again', () => {
        expect(
          readlinkSync(
            join(scene.repo.path, REPO_ACTOR_BRAIN_DIR, 'settings.local.json'),
          ),
        ).toEqual('settings.of.repo.json');
      });

      then('the per-box grant rode nowhere', () => {
        expect(
          getRepoSettings({ repoPath: scene.repo.path }).permissions?.allow,
        ).not.toContain(LOCAL_GRANT);
      });

      then('stdout names the replaced file, and says its content is gone', () => {
        expect(result.stdout).toContain(
          '.claude/settings.local.json → settings.of.repo.json — a real file was here; its content is gone',
        );
      });

      then('the replaced report is locked to a snapshot', () => {
        expect(asLayoutReportBlock({ stdout: result.stdout })).toMatchSnapshot();
      });
    });
  });

  given('[case5] a split-layout repo with a hand claudeMdExcludes entry', () => {
    const scene = useBeforeAll(async () => {
      const repo = await genRepoWithPermissionInit();
      const home = genHomeWithGrove({ slug: 'role-inits-unexcluded-home' });

      // link the tester role, which lays the split layout
      invokeRhachetCliBinary({
        args: ['init', '--roles', 'tester'],
        cwd: repo.path,
        env: { HOME: home },
      });

      // a human adds an exclude rhachet does not derive
      const settings = getRepoSettings({ repoPath: repo.path });
      writeFileSync(
        join(repo.path, REPO_ACTOR_BRAIN_DIR, 'settings.of.repo.json'),
        `${JSON.stringify(
          {
            ...settings,
            claudeMdExcludes: [
              ...((settings as { claudeMdExcludes?: string[] })
                .claudeMdExcludes ?? []),
              HAND_EXCLUDE,
            ],
          },
          null,
          2,
        )}\n`,
      );
      return { repo, home };
    });

    when('[t0] rhx init --roles tester', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['init', '--roles', 'tester'],
          cwd: scene.repo.path,
          env: { HOME: scene.home },
          logOnError: false,
        }),
      );

      then('exits 0', () => {
        expect({ status: result.status, stderr: result.stderr }).toMatchObject({
          status: 0,
        });
      });

      then('the hand exclude is gone from settings.of.repo.json', () => {
        expect(
          (
            getRepoSettings({ repoPath: scene.repo.path }) as {
              claudeMdExcludes?: string[];
            }
          ).claudeMdExcludes,
        ).not.toContain(HAND_EXCLUDE);
      });

      then('stdout names the dropped entry under unexcluded', () => {
        expect(result.stdout).toContain('└─ unexcluded');
        expect(result.stdout).toContain(
          `${HAND_EXCLUDE} — a claudeMdExcludes entry rhachet does not derive; rhachet owns this key, so it was dropped`,
        );
      });

      then('the unexcluded report is locked to a snapshot', () => {
        expect(asBrainTreeBlock({ stdout: result.stdout })).toMatchSnapshot();
      });
    });
  });

  given('[case6] a repo whose <repo>/.claude is a plain file', () => {
    const scene = useBeforeAll(async () => {
      const repo = await genTestTempRepo({ fixture: 'with-roles-full' });
      const home = genHomeWithGrove({ slug: 'role-inits-layout-fault-home' });

      // link the tester role, then put a plain file where the brain dir link belongs
      invokeRhachetCliBinary({
        args: ['init', '--roles', 'tester'],
        cwd: repo.path,
        env: { HOME: home },
      });
      rmSync(join(repo.path, '.claude'), { recursive: true, force: true });
      writeFileSync(join(repo.path, '.claude'), 'not a dir\n');
      return { repo, home };
    });

    when('[t0] rhx roles init --role tester', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'init', '--role', 'tester'],
          cwd: scene.repo.path,
          env: { HOME: scene.home },
          logOnError: false,
        }),
      );

      then('exits 0: the init still ran', () => {
        expect({ status: result.status, stderr: result.stderr }).toMatchObject({
          status: 0,
        });
        expect(result.stdout).toContain('tester init complete');
      });

      then('<repo>/.claude is still the plain file: naught was forced', () => {
        expect(lstatSync(join(scene.repo.path, '.claude')).isFile()).toBe(true);
      });

      then('stdout names that the layout did not land, and how to see why', () => {
        expect(result.stdout).toContain(
          '   └─ 🟡 the layout did not land; run `rhx init` to see why',
        );
      });

      then('the warn tree is locked to a snapshot', () => {
        expect(asBrainTreeBlock({ stdout: result.stdout })).toMatchSnapshot();
      });
    });
  });
});
