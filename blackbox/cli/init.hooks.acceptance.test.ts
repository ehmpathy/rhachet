import { execSync } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';

import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  getAllHookDispatchManifestRows,
  HOOK_DISPATCH_AUTHOR,
} from '@/blackbox/.test/infra/getAllHookDispatchManifestRows';
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

      then('role rules have correct author namespace', async () => {
        const rows = await getAllHookDispatchManifestRows({
          claudeDir: path.join(repo.path, '.claude'),
        });
        const firstRule = rows.find((row) => row.event === 'SessionStart')!;
        expect(firstRule.author).toContain('repo=test/role=tester');
      });

      then('the written hooks take the NESTED claude shape, never the legacy flat one', async () => {
        // `asFlatHooks` reads both shapes on purpose (a seeded prior config may be flat), so
        //   it cannot tell a writer that reverted to the flat shape. this reads the raw file
        //   and pins the shape the writer must emit: one dispatcher per event, nested
        const configPath = path.join(repo.path, '.claude', 'settings.of.repo.json');
        const content = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(content);
        expect(config.hooks.SessionStart).toHaveLength(1);
        for (const entry of config.hooks.SessionStart) {
          expect(entry).toHaveProperty('hooks');
          expect(entry).not.toHaveProperty('command');
          expect(entry.hooks[0]).toHaveProperty('command');
          expect(entry.hooks[0].author).toEqual(HOOK_DISPATCH_AUTHOR);
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
      then('the manifest has 2 SessionStart rules', async () => {
        const rows = await getAllHookDispatchManifestRows({
          claudeDir: path.join(repo.path, '.claude'),
        });
        expect(rows.filter((row) => row.event === 'SessionStart')).toHaveLength(2);
      });

      then('claude settings.json has 1 SessionStart hook, the dispatcher', async () => {
        const configPath = path.join(repo.path, '.claude', 'settings.of.repo.json');
        const content = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(content);
        const hooks = asFlatHooks(config.hooks.SessionStart);
        expect(hooks).toHaveLength(1);
        expect(hooks[0]!.author).toEqual(HOOK_DISPATCH_AUTHOR);
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

      then('the manifest now has only 1 SessionStart rule', async () => {
        const rows = await getAllHookDispatchManifestRows({
          claudeDir: path.join(repo.path, '.claude'),
        });
        const rules = rows.filter((row) => row.event === 'SessionStart');
        expect(rules).toHaveLength(1);
        expect(rules[0]!.command).toContain('boot-hook-1');
      });
    });
  });

  given('[case9] a hook a human added by hand beside the dispatchers', () => {
    // the sync owns only the role hooks it moved into the manifest and the dispatchers it
    //   wrote; a hook with no role author is the human's, and a re-sync keeps it in the
    //   settings, untouched, beside the dispatcher (rhachet#764)
    const handHook = { type: 'command', command: 'echo hand-added-guard', timeout: 7 };
    const scene = useBeforeAll(async () => {
      const repo = await genTestTempRepo({ fixture: 'with-role-hooks' });
      invokeWithoutGrove({ args: ['init', '--roles', 'tester', '--hooks'], cwd: repo.path });
      const configPath = path.join(repo.path, '.claude', 'settings.of.repo.json');
      const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
      const configWithHand = {
        ...config,
        hooks: {
          ...config.hooks,
          PreToolUse: [...config.hooks.PreToolUse, { matcher: 'Bash', hooks: [handHook] }],
        },
      };
      await fs.writeFile(configPath, `${JSON.stringify(configWithHand, null, 2)}\n`, 'utf-8');
      const result = invokeWithoutGrove({ args: ['init', '--hooks'], cwd: repo.path });
      const configAfter = JSON.parse(await fs.readFile(configPath, 'utf-8'));
      const rows = await getAllHookDispatchManifestRows({
        claudeDir: path.join(repo.path, '.claude'),
      });
      return { result, configAfter, rows };
    });

    when('[t0] init --hooks re-syncs the roles', () => {
      then('exits with status 0', () => {
        expect(scene.result.status).toEqual(0);
      });

      then('the hand-added hook stays in the settings, byte for byte, under its own matcher', () => {
        const entry = scene.configAfter.hooks.PreToolUse.find(
          (each: { matcher?: string }) => each.matcher === 'Bash',
        );
        expect(entry).toEqual({ matcher: 'Bash', hooks: [handHook] });
      });

      then('the PreToolUse dispatcher stays beside it', () => {
        const authors = asFlatHooks(scene.configAfter.hooks.PreToolUse).map((hook) => hook.author);
        expect(authors.filter((author) => author === HOOK_DISPATCH_AUTHOR)).toHaveLength(1);
      });

      then('the hand-added hook never enters the manifest', () => {
        expect(scene.rows.map((row) => row.command).join('\n')).not.toContain('hand-added-guard');
      });

      // .note = this fixture's brain (`rhachet-brains-test`) writes a hook's timeout as rhachet hands
      //   it over (`{ seconds: 10 }`), a shape claude never reads; the snap masks it, so the baseline
      //   pins only what the claude code adapter writes too (enroll [case2e][t3] snaps `"timeout": 10`)
      then('the PreToolUse hooks match the snapshot', () => {
        const view = JSON.stringify(scene.configAfter.hooks.PreToolUse, null, 2).replace(
          /"timeout": \{[^}]*\}/g,
          '"timeout": "__FIXTURE_TIMEOUT__"',
        );
        expect(view).toMatchSnapshot();
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
          // the actor's settings start the dispatcher; its own manifest holds the rules
          const actorConfigPath = path.join(
            repo.actorBrainClaudeDir,
            'settings.of.repo.json',
          );
          const content = await fs.readFile(actorConfigPath, 'utf-8');
          const config = JSON.parse(content);
          expect(asFlatHooks(config.hooks.SessionStart)).toEqual([
            expect.objectContaining({ author: HOOK_DISPATCH_AUTHOR }),
          ]);
          const rows = await getAllHookDispatchManifestRows({
            claudeDir: repo.actorBrainClaudeDir,
          });
          const authors = rows
            .filter((row) => row.event === 'SessionStart')
            .map((row) => row.author);
          expect(authors).toContainEqual(
            expect.stringContaining('role=tester'),
          );
        },
      );

      then('the actor`s re-derived config turns claude attribution off', async () => {
        // an init re-derives every actor; the derive carries the attribution-off key
        const content = await fs.readFile(
          path.join(repo.actorBrainClaudeDir, 'settings.of.repo.json'),
          'utf-8',
        );
        expect(JSON.parse(content).attribution).toEqual({ commit: '', pr: '' });
      });

      then('the repo root config ALSO still carries the role hooks', async () => {
        const rows = await getAllHookDispatchManifestRows({
          claudeDir: path.join(repo.path, '.claude'),
        });
        expect(
          rows.filter((row) => row.event === 'SessionStart').length,
        ).toBeGreaterThan(0);
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
      // every SessionStart command that runs: the settings' own hooks, plus the manifest's rules
      //   the dispatcher runs
      const commands = useBeforeAll(async () => {
        const config = JSON.parse(
          await fs.readFile(
            path.join(repo.path, '.claude', 'settings.of.repo.json'),
            'utf-8',
          ),
        );
        const rows = await getAllHookDispatchManifestRows({
          claudeDir: path.join(repo.path, '.claude'),
        });
        return {
          list: [
            ...asFlatHooks(config.hooks.SessionStart).map(
              (hook) => hook.command,
            ),
            ...rows
              .filter((row) => row.event === 'SessionStart')
              .map((row) => row.command),
          ],
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

  given('[case10] a role hook whose matcher the dispatcher cannot read', () => {
    // `Bash\d` is js-only regex syntax: bash `=~` reads `\d` as a literal `d`, so the
    //   dispatcher would decide it unlike claude. the sync refuses the hook rather than run it
    //   under a matcher that fits other tools; the other role's hooks are read for what lands
    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-role-hooks' });
      await fs.writeFile(
        path.join(r.path, 'node_modules/rhachet-roles-test/dist/index.js'),
        `
const asRole = (input) => ({
  slug: input.slug,
  name: input.slug,
  purpose: 'test role',
  readme: { uri: 'roles/' + input.slug + '/readme.md' },
  traits: [],
  skills: { dirs: { uri: 'roles/' + input.slug + '/skills' }, refs: [] },
  briefs: { dirs: { uri: 'roles/' + input.slug + '/briefs' } },
  hooks: { onBrain: input.onBrain },
});
const getRoleRegistry = () => ({
  slug: 'test',
  readme: { uri: 'readme.md' },
  roles: [
    asRole({
      slug: 'tester',
      onBrain: {
        onTool: [{ command: 'echo digit-tool', timeout: '5s', filter: { what: 'Bash\\\\d' } }],
      },
    }),
    asRole({
      slug: 'reviewer',
      onBrain: { onBoot: [{ command: 'echo reviewer-boot', timeout: '10s' }] },
    }),
  ],
});
module.exports = { getRoleRegistry };
`,
        'utf-8',
      );
      return r;
    });

    when('[t0] init --roles tester,reviewer --hooks', () => {
      const result = useBeforeAll(async () =>
        invokeWithoutGrove({
          args: ['init', '--roles', 'tester,reviewer', '--hooks'],
          cwd: repo.path,
        }),
      );
      const manifest = useBeforeAll(async () => ({
        commands: (
          await getAllHookDispatchManifestRows({
            claudeDir: path.join(repo.path, '.claude'),
          })
        ).map((row) => row.command),
      }));

      then('exits 1, as every hook sync fault set does', () => {
        // the fault set header is a MalfunctionError by design: a set may mix owners, so it
        //   renders at the harsher one. the row itself carries the ConstraintError
        expect(result.status).toEqual(1);
      });

      then('the fault row names the role and its ConstraintError', () => {
        expect(result.stdout).toContain(
          '✗ test/tester → anthropic/claude/code: ✋ ConstraintError:',
        );
      });

      then('the refused hook reaches no manifest row', () => {
        expect(manifest.commands).not.toContain('echo digit-tool');
      });

      then("the other role's hook still lands", () => {
        expect(manifest.commands).toContain('echo reviewer-boot');
      });

      then('the fault row names the matcher it refused, and the fix', () => {
        expect(result.stdout).toContain('matcher = Bash\\d');
        expect(result.stdout).toContain('hint = declare the matcher');
      });

      then('the stdout and stderr are locked', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot('stdout');
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot('stderr');
      });
    });
  });

  given('[case6] repo with multiple roles', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-role-hooks' }),
    );

    when('[t0] both roles are linked and hooks applied', () => {
      // the sync and the manifest read run once; each then reads the shared rows
      const scene = useBeforeAll(async () => {
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
        const result = invokeWithoutGrove({
          args: ['init', '--hooks'],
          cwd: repo.path,
        });
        const rows = await getAllHookDispatchManifestRows({
          claudeDir: path.join(repo.path, '.claude'),
        });
        return { result, rows };
      });

      then('exits with status 0', () => {
        expect(scene.result.status).toEqual(0);
      });

      then('the manifest has rules from both roles', () => {
        // tester has 2 onBoot hooks, reviewer has 1
        expect(scene.rows.filter((row) => row.event === 'SessionStart')).toHaveLength(3);
      });

      then('hooks have distinct author namespaces', () => {
        const authors = scene.rows
          .filter((row) => row.event === 'SessionStart')
          .map((row) => row.author);
        expect(authors).toContainEqual(
          expect.stringContaining('role=tester'),
        );
        expect(authors).toContainEqual(
          expect.stringContaining('role=reviewer'),
        );
      });

      then('each role has correct commands', () => {
        const hooks = scene.rows.filter((row) => row.event === 'SessionStart');
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
      // the re-sync and the reads run once; each then reads the shared result
      const sceneAfterUnlink = useBeforeAll(async () => {
        // remove tester role symlink
        const testerSymlink = path.join(
          repo.path,
          '.agent/repo=test/role=tester',
        );
        await fs.rm(testerSymlink, { recursive: true, force: true });

        // re-run init --hooks
        const result = invokeWithoutGrove({
          args: ['init', '--hooks'],
          cwd: repo.path,
        });
        const configPath = path.join(repo.path, '.claude', 'settings.of.repo.json');
        const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
        const rows = await getAllHookDispatchManifestRows({
          claudeDir: path.join(repo.path, '.claude'),
        });
        return { result, config, rows };
      });

      then('exits with status 0', () => {
        expect(sceneAfterUnlink.result.status).toEqual(0);
      });

      then('tester hooks are removed', () => {
        const authors = [
          ...asFlatHooks(sceneAfterUnlink.config.hooks.SessionStart).map((h) => h.author),
          ...sceneAfterUnlink.rows.map((row) => row.author),
        ];
        expect(authors).not.toContainEqual(
          expect.stringContaining('role=tester'),
        );
      });

      then('reviewer hooks remain', () => {
        const rules = sceneAfterUnlink.rows.filter((row) => row.event === 'SessionStart');
        expect(rules).toHaveLength(1);
        expect(rules[0]!.author).toContain('role=reviewer');
      });
    });
  });

  given(
    '[case9] a repo actor whose committed file names two homes in claudeMdExcludes',
    () => {
      // the repo actor's settings.of.repo.json is committed; a prior release wrote one absolute
      //   home path per machine that enrolled. `init --hooks` re-derives the repo actor's file
      //   wherever its actor.json sits on disk, so that pass must clean the per-machine entries
      const repoActorDir = '.agent/.actors/actor.via.repo=ambient';
      const repo = useBeforeAll(async () => {
        const r = await genTestTempRepo({ fixture: 'with-role-hooks' });
        invokeWithoutGrove({
          args: ['init', '--roles', 'tester', '--hooks'],
          cwd: r.path,
        });

        // the manifest a bare enroll leaves for the repo actor
        await fs.writeFile(
          path.join(r.path, repoActorDir, 'actor.json'),
          JSON.stringify({
            schemaVersion: 1,
            brain: 'claude',
            roles: ['tester'],
            rolesDelta: null,
          }) + '\n',
          'utf-8',
        );

        // the committed file, as two machines left it
        const configPath = path.join(
          r.path,
          repoActorDir,
          'brain/.claude/settings.of.repo.json',
        );
        const configPrior = JSON.parse(await fs.readFile(configPath, 'utf-8'));
        await fs.writeFile(
          configPath,
          JSON.stringify(
            {
              ...configPrior,
              claudeMdExcludes: [
                '/home/camper/.claude/CLAUDE.md',
                '/home/fixturehuman/.claude/CLAUDE.md',
                '**/CLAUDE.local.md',
              ],
            },
            null,
            2,
          ) + '\n',
          'utf-8',
        );

        // the grove link, as a prior release left it: tracked at HEAD, aimed at one machine
        const groveRel = `${repoActorDir}/brain/.claude/settings.of.grove.json`;
        await fs.rm(path.join(r.path, groveRel), { force: true });
        await fs.symlink(
          '/home/otherhuman/.claude/settings.json',
          path.join(r.path, groveRel),
        );
        execSync(`git add -f ${groveRel}`, { cwd: r.path, stdio: 'ignore' });
        execSync('git commit -m "seed" --quiet', {
          cwd: r.path,
          stdio: 'ignore',
        });

        const resultFirst = invokeWithoutGrove({
          args: ['init', '--hooks'],
          cwd: r.path,
        });
        const contentFirst = await fs.readFile(configPath, 'utf-8');
        const resultSecond = invokeWithoutGrove({
          args: ['init', '--hooks'],
          cwd: r.path,
        });
        const contentSecond = await fs.readFile(configPath, 'utf-8');
        const groveTracked = execSync(`git ls-files -- ${groveRel}`, {
          cwd: r.path,
        }).toString();
        return {
          resultFirst,
          resultSecond,
          contentFirst,
          contentSecond,
          groveRel,
          groveTracked,
        };
      });

      when('[t0] init --hooks runs', () => {
        then('exits with status 0', () => {
          expect(repo.resultFirst.status).toEqual(0);
        });

        then(
          'claudeMdExcludes holds the portable globs alone — no home path',
          () => {
            const config = JSON.parse(repo.contentFirst);
            expect(config.claudeMdExcludes).toEqual([
              '**/!(brain)/.claude/CLAUDE.md',
              '**/CLAUDE.local.md',
            ]);
            expect(repo.contentFirst).not.toContain('/home/');
          },
        );

        then('stdout names each exclude it dropped, beneath the actor', () => {
          expect(repo.resultFirst.stdout).toContain(
            'claudeMdExcludes dropped /home/camper/.claude/CLAUDE.md',
          );
          expect(repo.resultFirst.stdout).toContain(
            'claudeMdExcludes dropped /home/fixturehuman/.claude/CLAUDE.md',
          );
        });

        then(
          'stdout names the grove link it untracked, with the teammate cure',
          () => {
            expect(repo.resultFirst.stdout).toContain(
              `${repo.groveRel} — names this machine; kept on disk, commit its deletion`,
            );
            expect(repo.resultFirst.stdout).toContain(
              `git checkout -- ${repo.groveRel}`,
            );
          },
        );

        then('the grove link leaves the index', () => {
          expect(repo.groveTracked).toEqual('');
        });

        then('the two trees this case changes match snapshot, each whole', () => {
          // .note = each tree is cut from its header to the blank line that closes it, so a
          //   group is never cut mid-branch; the role list above them varies with the fixture
          const lines = repo.resultFirst.stdout.split('\n');
          const asTreeFrom = (header: string): string[] => {
            const start = lines.findIndex((line) => line.startsWith(header));
            if (start === -1) return [];
            const end = lines.findIndex(
              (line, index) => index > start && line.trim() === '',
            );
            return lines.slice(start, end === -1 ? lines.length : end);
          };
          const brainTree = asTreeFrom('🧠 brain://repo=ambient');
          const actorsTree = asTreeFrom('🧢 apply hooks to enrolled actors');
          expect(brainTree.length).toBeGreaterThan(0);
          expect(actorsTree.length).toBeGreaterThan(0);
          expect(
            asSnapshotSafe([...brainTree, '', ...actorsTree].join('\n')),
          ).toMatchSnapshot();
        });
      });

      when('[t1] init --hooks runs again', () => {
        then('the committed file is byte-identical — idempotent', () => {
          expect(repo.resultSecond.status).toEqual(0);
          expect(repo.contentSecond).toEqual(repo.contentFirst);
        });

        then('stdout names no dropped exclude and no untrack', () => {
          expect(repo.resultSecond.stdout).not.toContain(
            'claudeMdExcludes dropped',
          );
          expect(repo.resultSecond.stdout).not.toContain('git checkout --');
        });
      });
    },
  );

  given(
    '[case11] one repo, init on two boxes whose homes differ (#779, #816)',
    () => {
      // 🔴 each box that runs init must leave the tracked tree as it found it: the grove arrow
      //   is findserted per box and untracked, and settings.of.repo.json names no home
      const repoActorDir = '.agent/.actors/actor.via.repo=ambient';
      const groveRel = `${repoActorDir}/brain/.claude/settings.of.grove.json`;
      const settingsRel = `${repoActorDir}/brain/.claude/settings.of.repo.json`;

      /**
       * .what = a home that holds a grove, as a real box does
       * .why = only a home with `~/.claude/settings.json` gets the grove arrow written
       */
      const genHomeWithGrove = async (input: { slug: string }) => {
        const home = await fs.realpath(genTempDir({ slug: input.slug }));
        await fs.mkdir(path.join(home, '.claude'), { recursive: true });
        await fs.writeFile(
          path.join(home, '.claude', 'settings.json'),
          '{}\n',
          'utf-8',
        );
        return home;
      };

      const repo = useBeforeAll(async () => {
        const r = await genTestTempRepo({ fixture: 'with-role-hooks' });
        const homeA = await genHomeWithGrove({ slug: 'init-box-a-home' });
        const homeB = await genHomeWithGrove({ slug: 'init-box-b-home' });

        // box A: link the role and apply hooks, then enroll the repo actor's manifest
        const resultA = invokeRhachetCliBinary({
          args: ['init', '--roles', 'tester', '--hooks'],
          cwd: r.path,
          env: { HOME: homeA },
        });
        await fs.writeFile(
          path.join(r.path, repoActorDir, 'actor.json'),
          JSON.stringify({
            schemaVersion: 1,
            brain: 'claude',
            roles: ['tester'],
            rolesDelta: null,
          }) + '\n',
          'utf-8',
        );
        const resultA2 = invokeRhachetCliBinary({
          args: ['init', '--hooks'],
          cwd: r.path,
          env: { HOME: homeA },
        });

        // box A commits what init left, as a crew would
        execSync('git add -A', { cwd: r.path, stdio: 'ignore' });
        execSync('git commit -m "box a init" --quiet', {
          cwd: r.path,
          stdio: 'ignore',
        });
        const settingsA = await fs.readFile(
          path.join(r.path, settingsRel),
          'utf-8',
        );

        // box B runs init on the same tree
        const resultB = invokeRhachetCliBinary({
          args: ['init', '--hooks'],
          cwd: r.path,
          env: { HOME: homeB },
        });
        const settingsB = await fs.readFile(
          path.join(r.path, settingsRel),
          'utf-8',
        );
        const statusB = execSync('git status --porcelain', {
          cwd: r.path,
        }).toString();
        const groveTracked = execSync(`git ls-files -- ${groveRel}`, {
          cwd: r.path,
        }).toString();
        const groveTarget = await fs.readlink(path.join(r.path, groveRel));
        const treeTracked = execSync('git ls-files', {
          cwd: r.path,
        }).toString();
        return {
          homeA,
          homeB,
          resultA,
          resultA2,
          resultB,
          settingsA,
          settingsB,
          statusB,
          groveTracked,
          groveTarget,
          treeTracked,
        };
      });

      when('[t0] box A inits, then box B inits the committed tree', () => {
        then('every init exits with status 0', () => {
          expect(repo.resultA.status).toEqual(0);
          expect(repo.resultA2.status).toEqual(0);
          expect(repo.resultB.status).toEqual(0);
        });

        then('git status is clean after box B', () => {
          expect(repo.statusB).toEqual('');
        });

        then('the tracked settings.of.repo.json is byte-equal on both boxes', () => {
          expect(repo.settingsB).toEqual(repo.settingsA);
        });

        then('the tracked settings name neither home (#816)', () => {
          expect(repo.settingsA).not.toContain(repo.homeA);
          expect(repo.settingsA).not.toContain(repo.homeB);
          expect(repo.settingsA).not.toContain('/home/');
        });

        then('the grove arrow is never tracked (#779)', () => {
          expect(repo.groveTracked).toEqual('');
          expect(repo.treeTracked).not.toContain('settings.of.grove.json');
        });

        then("the grove arrow on box B points at box B's home", () => {
          expect(repo.groveTarget).toEqual(
            path.join(repo.homeB, '.claude', 'settings.json'),
          );
        });
      });
    },
  );
});
