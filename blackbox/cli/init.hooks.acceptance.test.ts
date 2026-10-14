import * as fs from 'fs/promises';
import * as path from 'path';

import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';

/**
 * .what = a HOME with no `.claude/settings.json`, so no brain dir holds grove arrows
 * .why = with a grove on the host, each brain dir's `settings.json` is an arrow to the
 *   host's `~/.claude/settings.json`: a seed or a stray write through that name would land
 *   in the host's own settings, and the host's content would leak into the asserts. an
 *   empty HOME keeps every run hermetic
 * .note = a fresh HOME per call, never one shared by the file: a call that wrote into HOME
 *   would otherwise leave its bytes for the next case, and the grove's absence would be an
 *   assumption about the test bodies rather than a fact of each run
 */
const invokeWithoutGrove = (
  input: Parameters<typeof invokeRhachetCliBinary>[0],
): ReturnType<typeof invokeRhachetCliBinary> =>
  invokeRhachetCliBinary({
    ...input,
    env: { HOME: genTempDir({ slug: 'init-hooks-home' }), ...input.env },
  });

/**
 * .what = the hooks of one claude event, flat as `{ author, command }`
 * .why = the test brain writes the real claude shape — `{ matcher, hooks: [{ command,
 *   author }] }` — while a seeded prior config may hold a legacy flat entry
 *   `{ matcher: <author>, command }`. one read covers both, so each assert names the hook
 *   by what it is, never by where the shape nests it
 */
const asFlatHooks = (
  entries: unknown[] | undefined,
): Array<{ author: string; command: string }> =>
  (entries ?? []).flatMap((entry) => {
    const e = entry as {
      matcher?: string;
      command?: string;
      hooks?: Array<{ author?: string; command: string }>;
    };
    if (Array.isArray(e.hooks))
      return e.hooks.map((h) => ({
        author: h.author ?? '',
        command: h.command,
      }));
    return [{ author: e.matcher ?? '', command: e.command ?? '' }];
  });

describe('rhachet init --hooks', () => {
  given('[case1] repo with claude config but no roles linked', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-claude-config' }),
    );

    when('[t0] init --hooks without linked roles', () => {
      const result = useBeforeAll(async () =>
        invokeWithoutGrove({
          args: ['init', '--hooks'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('stdout indicates no roles with hooks found', () => {
        expect(result.stdout).toContain('no roles with hooks found');
      });
    });
  });

  given('[case2] repo with roles package with hooks', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-role-hooks' }),
    );

    when('[t0] before any changes', () => {
      then('claude settings.json has empty hooks', async () => {
        // before any init, `.claude` is the fixture's own real dir, and its legacy file
        const configPath = path.join(repo.path, '.claude', 'settings.json');
        const content = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(content);
        expect(config.hooks).toEqual({});
      });
    });

    when('[t1] init --roles tester to link the role', () => {
      const result = useBeforeAll(async () =>
        invokeWithoutGrove({
          args: ['init', '--roles', 'tester'],
          cwd: repo.path,
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('role is linked', () => {
        expect(result.stdout).toContain('repo=test/role=tester');
      });
    });

    when('[t2] init --hooks to apply hooks', () => {
      // first link the role, then apply hooks
      const result = useBeforeAll(async () => {
        // link the role first
        invokeWithoutGrove({
          args: ['init', '--roles', 'tester'],
          cwd: repo.path,
        });

        // then apply hooks
        return invokeWithoutGrove({
          args: ['init', '--hooks'],
          cwd: repo.path,
        });
      });

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('stdout indicates hooks were created', () => {
        expect(result.stdout).toContain('created');
      });

      then('claude settings.json has SessionStart hooks', async () => {
        const configPath = path.join(repo.path, '.claude', 'settings.of.repo.json');
        const content = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(content);
        expect(config.hooks.SessionStart).toBeDefined();
        expect(config.hooks.SessionStart.length).toBeGreaterThan(0);
      });

      then('claude settings.json has PreToolUse hooks', async () => {
        const configPath = path.join(repo.path, '.claude', 'settings.of.repo.json');
        const content = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(content);
        expect(config.hooks.PreToolUse).toBeDefined();
        expect(config.hooks.PreToolUse.length).toBeGreaterThan(0);
      });

      then('hooks have correct author namespace', async () => {
        const configPath = path.join(repo.path, '.claude', 'settings.of.repo.json');
        const content = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(content);
        const firstHook = asFlatHooks(config.hooks.SessionStart)[0]!;
        expect(firstHook.author).toContain('repo=test/role=tester');
      });

      then('the written hooks take the NESTED claude shape, never the legacy flat one', async () => {
        // `asFlatHooks` reads both shapes on purpose (a seeded prior config may be flat), so
        //   the author asserts above cannot tell a writer that reverted to the flat shape.
        //   this reads the raw file and pins the shape the writer must emit
        const configPath = path.join(repo.path, '.claude', 'settings.of.repo.json');
        const content = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(content);
        for (const entry of config.hooks.SessionStart) {
          expect(entry).toHaveProperty('hooks');
          expect(entry).not.toHaveProperty('command');
          expect(entry.hooks[0]).toHaveProperty('command');
          expect(entry.hooks[0].author).toContain('repo=test/role=tester');
        }
      });
    });

    when('[t3] init --roles tester --hooks to link and apply in one command', () => {
      const repoFresh = useBeforeAll(async () =>
        genTestTempRepo({ fixture: 'with-role-hooks' }),
      );

      const result = useBeforeAll(async () =>
        invokeWithoutGrove({
          args: ['init', '--roles', 'tester', '--hooks'],
          cwd: repoFresh.path,
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('role is linked', () => {
        expect(result.stdout).toContain('repo=test/role=tester');
      });

      then('hooks are applied', () => {
        expect(result.stdout).toContain('created');
      });

      then('claude settings.json has hooks', async () => {
        const configPath = path.join(repoFresh.path, '.claude', 'settings.of.repo.json');
        const content = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(content);
        expect(Object.keys(config.hooks).length).toBeGreaterThan(0);
      });
    });
  });

  given('[case3] repo with role hooks - idempotency test', () => {
    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-role-hooks' });
      // link role and apply hooks
      invokeWithoutGrove({
        args: ['init', '--roles', 'tester', '--hooks'],
        cwd: r.path,
      });
      return r;
    });

    when('[t0] init --hooks is run again', () => {
      const result = useBeforeAll(async () =>
        invokeWithoutGrove({
          args: ['init', '--hooks'],
          cwd: repo.path,
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('hooks remain correctly configured', async () => {
        const configPath = path.join(repo.path, '.claude', 'settings.of.repo.json');
        const content = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(content);
        expect(config.hooks.SessionStart).toBeDefined();
        expect(config.hooks.SessionStart.length).toBeGreaterThan(0);
      });
    });
  });

  given('[case4] repo with role hooks - explicit brain slug', () => {
    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-role-hooks' });
      // link role first
      invokeWithoutGrove({
        args: ['init', '--roles', 'tester'],
        cwd: r.path,
      });
      return r;
    });

    when('[t0] init --hooks claude-code', () => {
      const result = useBeforeAll(async () =>
        invokeWithoutGrove({
          args: ['init', '--hooks', 'claude-code'],
          cwd: repo.path,
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('hooks are applied', () => {
        expect(result.stdout).toContain('created');
      });
    });
  });

  given('[case5] repo with role hooks - declarative removal', () => {
    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-role-hooks' });

      // link role and apply hooks
      invokeWithoutGrove({
        args: ['init', '--roles', 'tester', '--hooks'],
        cwd: r.path,
      });

      return r;
    });

    when('[t0] hooks are initially applied', () => {
      then('claude settings.json has 2 SessionStart hooks', async () => {
        const configPath = path.join(repo.path, '.claude', 'settings.of.repo.json');
        const content = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(content);
        expect(config.hooks.SessionStart).toHaveLength(2);
      });
    });

    when('[t1] role removes one hook declaration and init --hooks is re-run', () => {
      const result = useBeforeAll(async () => {
        // modify the role to have only 1 onBoot hook instead of 2
        const roleIndexPath = path.join(
          repo.path,
          'node_modules/rhachet-roles-test/dist/index.js',
        );
        const modifiedRole = `
const getRoleRegistry = () => ({
  slug: 'test',
  readme: { uri: 'readme.md' },
  roles: [
    {
      slug: 'tester',
      name: 'Tester',
      purpose: 'test role with hooks',
      readme: { uri: 'roles/tester/readme.md' },
      traits: [],
      skills: { dirs: { uri: 'roles/tester/skills' }, refs: [] },
      briefs: { dirs: { uri: 'roles/tester/briefs' } },
      hooks: {
        onBrain: {
          onBoot: [
            { command: 'echo boot-hook-1', timeout: 'PT10S' },
            // boot-hook-2 removed
          ],
          onTool: [
            { command: 'echo tool-hook', timeout: 'PT5S' },
          ],
        },
      },
    },
  ],
});
module.exports = { getRoleRegistry };
`;
        await fs.writeFile(roleIndexPath, modifiedRole, 'utf-8');

        // re-run init --hooks
        return invokeWithoutGrove({
          args: ['init', '--hooks'],
          cwd: repo.path,
        });
      });

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('stdout indicates hooks were deleted', () => {
        expect(result.stdout).toContain('deleted');
      });

      then('claude settings.json now has only 1 SessionStart hook', async () => {
        const configPath = path.join(repo.path, '.claude', 'settings.of.repo.json');
        const content = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(content);
        const hooks = asFlatHooks(config.hooks.SessionStart);
        expect(hooks).toHaveLength(1);
        expect(hooks[0]!.command).toContain('boot-hook-1');
      });
    });
  });

  given('[case7] a repo with an enrolled actor on disk (usecase.9)', () => {
    // the per-actor pass of syncHooksForLinkedRoles: one `init --hooks` must apply
    // the SAME role hooks to the repo root AND to every enrolled actor's own brain
    // config dir, so an actor's brain/.claude/settings.json never drifts from root.
    // this proves it end-to-end with a REAL role-with-hooks package + a REAL actor
    // dir on disk — no mocks (the mocked unit case is retired in favor of this).
    const actorHash = 'deadbeef';
    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-role-hooks' });

      // link the tester role + apply hooks to the repo root
      invokeWithoutGrove({
        args: ['init', '--roles', 'tester', '--hooks'],
        cwd: r.path,
      });

      // seed a REAL enrolled actor dir on disk (the shape findsertActorOndisk
      // writes: an actor.json manifest + a brain/ config dir). schemaVersion 1 is
      // the current ACTOR_MANIFEST_SCHEMA_VERSION; an older value is tolerant-read
      // (upgrade-on-read), so this fixture stays valid across a field-add bump.
      const actorDir = path.join(
        r.path,
        '.agent/.actors',
        `actor.via.hash=${actorHash}`,
      );
      const actorBrainClaudeDir = path.join(actorDir, 'brain', '.claude');
      await fs.mkdir(actorBrainClaudeDir, { recursive: true });
      await fs.writeFile(
        path.join(actorDir, 'actor.json'),
        JSON.stringify({
          schemaVersion: 1,
          brain: 'claude-code',
          roles: ['tester'],
        }) + '\n',
        'utf-8',
      );
      // seed a LEGACY actor brain dir: a real `settings.json` (empty hooks), as an enroll
      //   left it before the settings layout. the sync must fold it into
      //   `settings.of.repo.json` and keep the raw file aside (the snapshot pins that row)
      // .note = the write lands in a dir this test just made, so no grove arrow sits at
      //   `settings.json` for it to follow out to a home file
      await fs.writeFile(
        path.join(actorBrainClaudeDir, 'settings.json'),
        JSON.stringify({ hooks: {} }, null, 2),
        'utf-8',
      );

      // re-run init --hooks — this is the per-actor pass under test
      const result = invokeWithoutGrove({
        args: ['init', '--hooks'],
        cwd: r.path,
      });

      return { path: r.path, actorBrainClaudeDir, result };
    });

    when('[t0] init --hooks re-run with an actor on disk', () => {
      then('exits with status 0', () => {
        expect(repo.result.status).toEqual(0);
      });

      then('stdout names the actor in the per-actor apply tree', () => {
        // the row shows the actor's whole exid, never the on-disk dir name
        expect(repo.result.stdout).toContain('apply hooks to enrolled actors');
        expect(repo.result.stdout).toContain(`hash=${actorHash}`);
        expect(repo.result.stdout).not.toContain(`actor.via.hash=${actorHash}`);
      });

      then('the per-actor apply tree stdout is locked', () => {
        // lock the new "apply hooks to enrolled actors" surface so a reviewer
        // vibechecks the whole tree in the pr diff — the deterministic actor hash
        // (`deadbeef`) stays visible, temp paths mask to /TMP_REPO. paired with
        // the functional asserts above, never snapshot-only (rule.forbid.failhide)
        expect(asSnapshotSafe(repo.result.stdout)).toMatchSnapshot();
      });

      then(
        'the actor`s OWN brain config gets the role SessionStart hooks (not just root)',
        async () => {
          const actorConfigPath = path.join(
            repo.actorBrainClaudeDir,
            'settings.of.repo.json',
          );
          const content = await fs.readFile(actorConfigPath, 'utf-8');
          const config = JSON.parse(content);
          expect(config.hooks.SessionStart).toBeDefined();
          expect(config.hooks.SessionStart.length).toBeGreaterThan(0);
          const authors = asFlatHooks(config.hooks.SessionStart).map(
            (h) => h.author,
          );
          expect(authors).toContainEqual(
            expect.stringContaining('role=tester'),
          );
        },
      );

      then('the repo root config ALSO still carries the role hooks', async () => {
        const rootConfigPath = path.join(repo.path, '.claude', 'settings.of.repo.json');
        const content = await fs.readFile(rootConfigPath, 'utf-8');
        const config = JSON.parse(content);
        expect(config.hooks.SessionStart.length).toBeGreaterThan(0);
      });
    });
  });

  given('[case8] a role that declares a role boot hook (D3)', () => {
    // the brain dir boot.md supersedes each `rhachet roles boot` onBoot hook, so discovery drops
    // it and the per-author reconcile deletes the extant one. the adhoc route.drive onBoot hook
    // shares that author and stays; a human-authored hook is never touched
    const rolesBootCommand =
      './node_modules/.bin/rhachet roles boot --repo test --role tester';
    const routeDriveCommand =
      './node_modules/.bin/rhachet run --repo bhrain --skill route.drive --when hook.onBoot';
    const humanCommand = 'echo human-hook';
    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-role-hooks' });

      // the role declares a role boot hook beside the adhoc route.drive hook
      await fs.writeFile(
        path.join(r.path, 'node_modules/rhachet-roles-test/dist/index.js'),
        `
const getRoleRegistry = () => ({
  slug: 'test',
  readme: { uri: 'readme.md' },
  roles: [
    {
      slug: 'tester',
      name: 'Tester',
      purpose: 'test role with a role boot hook',
      readme: { uri: 'roles/tester/readme.md' },
      traits: [],
      skills: { dirs: { uri: 'roles/tester/skills' }, refs: [] },
      briefs: { dirs: { uri: 'roles/tester/briefs' } },
      hooks: {
        onBrain: {
          onBoot: [
            { command: '${rolesBootCommand}', timeout: 'PT60S' },
            { command: '${routeDriveCommand}', timeout: 'PT30S' },
          ],
        },
      },
    },
  ],
});
module.exports = { getRoleRegistry };
`,
        'utf-8',
      );

      // settings.of.repo.json as a prior rhachet left it: the role boot hook installed, plus a
      //   human hook. it is the repo's own file, so the migration moves it whole; a real
      //   settings.json would be replaced by the grove arrow, its content never carried
      await fs.writeFile(
        path.join(r.path, '.claude', 'settings.of.repo.json'),
        JSON.stringify(
          {
            hooks: {
              SessionStart: [
                {
                  matcher: 'repo=test/role=tester',
                  command: rolesBootCommand,
                  timeout: 'PT60S',
                },
                { matcher: 'human', command: humanCommand, timeout: 'PT5S' },
              ],
            },
          },
          null,
          2,
        ),
        'utf-8',
      );
      return r;
    });

    when('[t0] init --roles tester --hooks', () => {
      const result = useBeforeAll(async () =>
        invokeWithoutGrove({
          args: ['init', '--roles', 'tester', '--hooks'],
          cwd: repo.path,
        }),
      );
      const commands = useBeforeAll(async () => {
        const config = JSON.parse(
          await fs.readFile(
            path.join(repo.path, '.claude', 'settings.of.repo.json'),
            'utf-8',
          ),
        );
        return {
          list: asFlatHooks(config.hooks.SessionStart).map(
            (hook) => hook.command,
          ),
        };
      });

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('settings.json holds no role boot hook', () => {
        expect(commands.list).not.toContain(rolesBootCommand);
      });

      then('the adhoc route.drive hook is present', () => {
        expect(commands.list).toContain(routeDriveCommand);
      });

      then('the human hook is present', () => {
        expect(commands.list).toContain(humanCommand);
      });

      then('the init stdout is locked', () => {
        // D3 changes what a human READS on this journey, not merely what lands in
        // settings.json: the role boot hook is superseded, so the apply tree renders a
        // different hook set than it did before. the three asserts above prove the
        // reconcile; this pins the surface the human meets, so a reworded or reordered
        // tree shows up in the pr diff (`rule.require.acceptance-journey-coverage` —
        // a new journey's stdout is snapped). paired with those asserts, never
        // snapshot-only (`rule.forbid.failhide`)
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case6] repo with multiple roles', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-role-hooks' }),
    );

    when('[t0] both roles are linked and hooks applied', () => {
      const result = useBeforeAll(async () => {
        // link both roles
        invokeWithoutGrove({
          args: ['init', '--roles', 'tester'],
          cwd: repo.path,
        });
        invokeWithoutGrove({
          args: ['init', '--roles', 'reviewer'],
          cwd: repo.path,
        });

        // apply hooks
        return invokeWithoutGrove({
          args: ['init', '--hooks'],
          cwd: repo.path,
        });
      });

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('claude settings.json has hooks from both roles', async () => {
        const configPath = path.join(repo.path, '.claude', 'settings.of.repo.json');
        const content = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(content);
        // tester has 2 onBoot hooks, reviewer has 1
        expect(config.hooks.SessionStart).toHaveLength(3);
      });

      then('hooks have distinct author namespaces', async () => {
        const configPath = path.join(repo.path, '.claude', 'settings.of.repo.json');
        const content = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(content);
        const authors = asFlatHooks(config.hooks.SessionStart).map(
          (h) => h.author,
        );
        expect(authors).toContainEqual(
          expect.stringContaining('role=tester'),
        );
        expect(authors).toContainEqual(
          expect.stringContaining('role=reviewer'),
        );
      });

      then('each role has correct commands', async () => {
        const configPath = path.join(repo.path, '.claude', 'settings.of.repo.json');
        const content = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(content);
        const hooks = asFlatHooks(config.hooks.SessionStart);
        const testerHooks = hooks.filter((h) => h.author.includes('role=tester'));
        const reviewerHooks = hooks.filter((h) =>
          h.author.includes('role=reviewer'),
        );
        expect(testerHooks).toHaveLength(2);
        expect(reviewerHooks).toHaveLength(1);
        expect(reviewerHooks[0]!.command).toContain('reviewer-boot');
      });
    });

    when('[t1] one role is unlinked', () => {
      const resultAfterUnlink = useBeforeAll(async () => {
        // remove tester role symlink
        const testerSymlink = path.join(
          repo.path,
          '.agent/repo=test/role=tester',
        );
        await fs.rm(testerSymlink, { recursive: true, force: true });

        // re-run init --hooks
        return invokeWithoutGrove({
          args: ['init', '--hooks'],
          cwd: repo.path,
        });
      });

      then('exits with status 0', () => {
        expect(resultAfterUnlink.status).toEqual(0);
      });

      then('tester hooks are removed', async () => {
        const configPath = path.join(repo.path, '.claude', 'settings.of.repo.json');
        const content = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(content);
        const authors = asFlatHooks(config.hooks.SessionStart).map(
          (h) => h.author,
        );
        expect(authors).not.toContainEqual(
          expect.stringContaining('role=tester'),
        );
      });

      then('reviewer hooks remain', async () => {
        const configPath = path.join(repo.path, '.claude', 'settings.of.repo.json');
        const content = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(content);
        const hooks = asFlatHooks(config.hooks.SessionStart);
        expect(hooks).toHaveLength(1);
        expect(hooks[0]!.author).toContain('role=reviewer');
      });
    });
  });
});
