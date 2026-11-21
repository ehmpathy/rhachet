import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { ContextCli } from '@src/domain.objects/ContextCli';
import type { HasRepo } from '@src/domain.objects/HasRepo';
import { Role } from '@src/domain.objects/Role';
import { HOOK_DISPATCH } from '@src/domain.operations/brains/dispatch/constants';
import { setHookDispatchersViaAdapter } from '@src/domain.operations/brains/dispatch/setHookDispatchersViaAdapter';

import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { syncRoleHooksIntoTarget } from './syncRoleHooksIntoTarget';

/**
 * .mock = `setHookDispatchersViaAdapter`, wrapped; every call delegates to the real swap
 * .why = the order this proves (manifest whole on disk, then the settings swap) lives between two
 *        awaits of one process; no outside observer can stop the sync at that point on demand. the
 *        wrap reads the real disk as the swap begins, then runs the real swap against it. (a spy on
 *        the module export cannot redefine it, so the module is wrapped whole)
 * .real = the hook dispatcher and init hooks acceptance suites drive the same sync through the cli
 *         with no wrap at all
 */
jest.mock(
  '@src/domain.operations/brains/dispatch/setHookDispatchersViaAdapter',
  () => {
    const actual = jest.requireActual(
      '@src/domain.operations/brains/dispatch/setHookDispatchersViaAdapter',
    );
    return {
      ...actual,
      setHookDispatchersViaAdapter: jest.fn(
        actual.setHookDispatchersViaAdapter,
      ),
    };
  },
);
/**
 * .mock = `getBrainHooksAdapterByConfigImplicit`, the package loader; it returns the REAL claude
 *         code adapter from the installed `rhachet-brains-anthropic`, imported statically
 * .why = the loader imports a supplier via a vm dynamic import, which jest refuses without
 *        `--experimental-vm-modules`; only the load is swapped, the adapter and its writes are real
 * .real = the init hooks acceptance suite loads the supplier through the real loader, in a cli
 */
jest.mock(
  '@src/domain.operations/config/getBrainHooksAdapterByConfigImplicit',
  () => ({
    getBrainHooksAdapterByConfigImplicit: jest.fn(
      async (input: { configTargetDir?: string }, context: { cwd: string }) =>
        jest
          .requireActual('rhachet-brains-anthropic')
          .genBrainHooksAdapterForClaudeCode({
            repoPath: input.configTargetDir ?? context.cwd,
          }),
    ),
  }),
);

const swapActual = jest.requireActual<
  typeof import('@src/domain.operations/brains/dispatch/setHookDispatchersViaAdapter')
>(
  '@src/domain.operations/brains/dispatch/setHookDispatchersViaAdapter',
).setHookDispatchersViaAdapter;

/**
 * .what = the repo root, whose package.json names the installed `rhachet-brains-anthropic`
 */
const REPO_ROOT = join(__dirname, '../../../..');

/**
 * .what = a role with two hooks the dispatcher runs as declared (`foreign`), so no role file is owed
 */
const ROLE: HasRepo<Role> = {
  ...new Role({
    slug: 'tester',
    name: 'Tester',
    purpose: 'a role whose hooks the sync moves into the manifest',
    readme: { uri: 'readme.md' },
    traits: [],
    skills: { dirs: { uri: 'skills' }, refs: [] },
    briefs: { dirs: { uri: 'briefs' } },
    hooks: {
      onBrain: {
        onTool: [
          { command: 'echo tool', timeout: 'PT10S', filter: { what: 'Bash' } },
        ],
        onStop: [{ command: 'echo stop', timeout: 'PT10S' }],
      },
    },
  }),
  repo: 'demo',
};

/**
 * .what = what the disk held at the moment the swap to dispatchers began
 */
type DiskAtSwap = {
  manifest: string | null;
  settings: string | null;
};

const readOrNull = (path: string): string | null =>
  existsSync(path) ? readFileSync(path, 'utf-8') : null;

describe('syncRoleHooksIntoTarget', () => {
  given('[case1] a brain dir the claude supplier writes, mid-sync', () => {
    const scene = useBeforeAll(async () => {
      // the write lands in a temp brain dir, as init writes each actor's brain dir
      const configTargetDir = realpathSync(
        genTempDir({ slug: 'sync-role-hooks-order' }),
      );
      const paths = {
        manifest: join(configTargetDir, '.claude', HOOK_DISPATCH.manifest),
        settings: join(configTargetDir, '.claude', 'settings.json'),
      };
      return { configTargetDir, paths };
    });

    when('[t0] the sync runs', () => {
      const result = useBeforeAll(async () => {
        // the wrap reads the disk as the swap begins, then runs the real swap
        const disksAtSwap: DiskAtSwap[] = [];
        jest
          .mocked(setHookDispatchersViaAdapter)
          .mockImplementation(async (input) => {
            disksAtSwap.push({
              manifest: readOrNull(scene.paths.manifest),
              settings: readOrNull(scene.paths.settings),
            });
            return swapActual(input);
          });
        const out = await syncRoleHooksIntoTarget(
          {
            authorsDesired: new Set(['repo=demo/role=tester']),
            roles: [ROLE],
            brains: ['claude-code'],
            configTargetDir: scene.configTargetDir,
          },
          new ContextCli({ cwd: REPO_ROOT, gitroot: REPO_ROOT }),
        );
        return { out, disksAtSwap };
      });

      then('the sync reports no fault', () => {
        expect(result.out.faults).toEqual([]);
        expect(result.out.syncResult.errors).toEqual([]);
      });

      then('the swap to dispatchers runs once', () => {
        expect(result.disksAtSwap).toHaveLength(1);
      });

      then('the manifest is whole on disk before the swap begins', () => {
        const manifest = result.disksAtSwap[0]!.manifest;
        expect(manifest).not.toBeNull();
        expect(manifest).toContain('echo tool');
        expect(manifest).toContain('echo stop');
      });

      then('the settings name no dispatcher before the swap begins', () => {
        expect(result.disksAtSwap[0]!.settings ?? '').not.toContain(
          HOOK_DISPATCH.author,
        );
      });

      then(
        'after the swap, the settings name the dispatcher and hold no role hook',
        () => {
          const settings = readFileSync(scene.paths.settings, 'utf-8');
          expect(settings).toContain(HOOK_DISPATCH.author);
          expect(settings).toContain(HOOK_DISPATCH.manifest);
          expect(settings).not.toContain('repo=demo/role=tester');
          expect(settings).not.toContain('echo tool');
        },
      );
    });
  });
});
