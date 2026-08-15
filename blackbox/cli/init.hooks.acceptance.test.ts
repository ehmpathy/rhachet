import * as fs from 'fs/promises';
import * as path from 'path';

import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';

describe('rhachet init --hooks', () => {
  given('[case1] repo with claude config but no roles linked', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-claude-config' }),
    );

    when('[t0] init --hooks without linked roles', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
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
        const configPath = path.join(repo.path, '.claude', 'settings.json');
        const content = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(content);
        expect(config.hooks).toEqual({});
      });
    });

    when('[t1] init --roles tester to link the role', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
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
        invokeRhachetCliBinary({
          args: ['init', '--roles', 'tester'],
          cwd: repo.path,
        });

        // then apply hooks
        return invokeRhachetCliBinary({
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
        const configPath = path.join(repo.path, '.claude', 'settings.json');
        const content = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(content);
        expect(config.hooks.SessionStart).toBeDefined();
        expect(config.hooks.SessionStart.length).toBeGreaterThan(0);
      });

      then('claude settings.json has PreToolUse hooks', async () => {
        const configPath = path.join(repo.path, '.claude', 'settings.json');
        const content = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(content);
        expect(config.hooks.PreToolUse).toBeDefined();
        expect(config.hooks.PreToolUse.length).toBeGreaterThan(0);
      });

      then('hooks have correct author namespace', async () => {
        const configPath = path.join(repo.path, '.claude', 'settings.json');
        const content = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(content);
        const firstHook = config.hooks.SessionStart[0];
        expect(firstHook.matcher).toContain('repo=test/role=tester');
      });
    });

    when('[t3] init --roles tester --hooks to link and apply in one command', () => {
      const repoFresh = useBeforeAll(async () =>
        genTestTempRepo({ fixture: 'with-role-hooks' }),
      );

      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
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
        const configPath = path.join(repoFresh.path, '.claude', 'settings.json');
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
      invokeRhachetCliBinary({
        args: ['init', '--roles', 'tester', '--hooks'],
        cwd: r.path,
      });
      return r;
    });

    when('[t0] init --hooks is run again', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['init', '--hooks'],
          cwd: repo.path,
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('hooks remain correctly configured', async () => {
        const configPath = path.join(repo.path, '.claude', 'settings.json');
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
      invokeRhachetCliBinary({
        args: ['init', '--roles', 'tester'],
        cwd: r.path,
      });
      return r;
    });

    when('[t0] init --hooks claude-code', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
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
      invokeRhachetCliBinary({
        args: ['init', '--roles', 'tester', '--hooks'],
        cwd: r.path,
      });

      return r;
    });

    when('[t0] hooks are initially applied', () => {
      then('claude settings.json has 2 SessionStart hooks', async () => {
        const configPath = path.join(repo.path, '.claude', 'settings.json');
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
        return invokeRhachetCliBinary({
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
        const configPath = path.join(repo.path, '.claude', 'settings.json');
        const content = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(content);
        expect(config.hooks.SessionStart).toHaveLength(1);
        expect(config.hooks.SessionStart[0].command).toContain('boot-hook-1');
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
      invokeRhachetCliBinary({
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
      // mirror the root's initial claude config (empty hooks) into the actor's
      // brain dir, exactly as an enroll would have left it before the sync
      await fs.writeFile(
        path.join(actorBrainClaudeDir, 'settings.json'),
        JSON.stringify({ hooks: {} }, null, 2),
        'utf-8',
      );

      // re-run init --hooks — this is the per-actor pass under test
      const result = invokeRhachetCliBinary({
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
        // the row shows the abbreviated hash (7 chars), never the on-disk token
        expect(repo.result.stdout).toContain('apply hooks to enrolled actors');
        expect(repo.result.stdout).toContain(actorHash.slice(0, 7));
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
            'settings.json',
          );
          const content = await fs.readFile(actorConfigPath, 'utf-8');
          const config = JSON.parse(content);
          expect(config.hooks.SessionStart).toBeDefined();
          expect(config.hooks.SessionStart.length).toBeGreaterThan(0);
          const matchers = config.hooks.SessionStart.map(
            (h: { matcher: string }) => h.matcher,
          );
          expect(matchers).toContainEqual(
            expect.stringContaining('role=tester'),
          );
        },
      );

      then('the repo root config ALSO still carries the role hooks', async () => {
        const rootConfigPath = path.join(repo.path, '.claude', 'settings.json');
        const content = await fs.readFile(rootConfigPath, 'utf-8');
        const config = JSON.parse(content);
        expect(config.hooks.SessionStart.length).toBeGreaterThan(0);
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
        invokeRhachetCliBinary({
          args: ['init', '--roles', 'tester'],
          cwd: repo.path,
        });
        invokeRhachetCliBinary({
          args: ['init', '--roles', 'reviewer'],
          cwd: repo.path,
        });

        // apply hooks
        return invokeRhachetCliBinary({
          args: ['init', '--hooks'],
          cwd: repo.path,
        });
      });

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('claude settings.json has hooks from both roles', async () => {
        const configPath = path.join(repo.path, '.claude', 'settings.json');
        const content = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(content);
        // tester has 2 onBoot hooks, reviewer has 1
        expect(config.hooks.SessionStart).toHaveLength(3);
      });

      then('hooks have distinct author namespaces', async () => {
        const configPath = path.join(repo.path, '.claude', 'settings.json');
        const content = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(content);
        const matchers = config.hooks.SessionStart.map(
          (h: { matcher: string }) => h.matcher,
        );
        expect(matchers).toContainEqual(
          expect.stringContaining('role=tester'),
        );
        expect(matchers).toContainEqual(
          expect.stringContaining('role=reviewer'),
        );
      });

      then('each role has correct commands', async () => {
        const configPath = path.join(repo.path, '.claude', 'settings.json');
        const content = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(content);
        const testerHooks = config.hooks.SessionStart.filter(
          (h: { matcher: string }) => h.matcher.includes('role=tester'),
        );
        const reviewerHooks = config.hooks.SessionStart.filter(
          (h: { matcher: string }) => h.matcher.includes('role=reviewer'),
        );
        expect(testerHooks).toHaveLength(2);
        expect(reviewerHooks).toHaveLength(1);
        expect(reviewerHooks[0].command).toContain('reviewer-boot');
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
        return invokeRhachetCliBinary({
          args: ['init', '--hooks'],
          cwd: repo.path,
        });
      });

      then('exits with status 0', () => {
        expect(resultAfterUnlink.status).toEqual(0);
      });

      then('tester hooks are removed', async () => {
        const configPath = path.join(repo.path, '.claude', 'settings.json');
        const content = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(content);
        const matchers = config.hooks.SessionStart.map(
          (h: { matcher: string }) => h.matcher,
        );
        expect(matchers).not.toContainEqual(
          expect.stringContaining('role=tester'),
        );
      });

      then('reviewer hooks remain', async () => {
        const configPath = path.join(repo.path, '.claude', 'settings.json');
        const content = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(content);
        expect(config.hooks.SessionStart).toHaveLength(1);
        expect(config.hooks.SessionStart[0].matcher).toContain('role=reviewer');
      });
    });
  });
});
