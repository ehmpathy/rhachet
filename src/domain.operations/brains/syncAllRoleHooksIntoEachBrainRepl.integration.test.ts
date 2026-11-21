import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import type { BrainHook } from '@src/domain.objects/BrainHook';
import type { BrainHooksAdapter } from '@src/domain.objects/BrainHooksAdapter';
import { ContextCli } from '@src/domain.objects/ContextCli';
import type { HasRepo } from '@src/domain.objects/HasRepo';
import { Role } from '@src/domain.objects/Role';
import { HOOK_DISPATCH } from '@src/domain.operations/brains/dispatch/constants';

import { readFileSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import * as detectBrainReplsModule from './detectBrainReplsInRepo';
import { syncAllRoleHooksIntoEachBrainRepl } from './syncAllRoleHooksIntoEachBrainRepl';

/**
 * .what = an in-memory hooks adapter for a second brain, `test-brain`; no second real supplier with a
 *         hooks adapter is installed, so the second brain of a multi-brain sweep is this fake
 */
const mockHooksOfTestBrain: BrainHook[] = [];
const mockAdapterOfTestBrain: BrainHooksAdapter = {
  slug: 'test-brain',
  dao: {
    get: {
      one: async () => null,
      all: async () => [...mockHooksOfTestBrain],
    },
    set: {
      findsert: async ({ hook }) => {
        mockHooksOfTestBrain.push(hook);
        return hook;
      },
      upsert: async ({ hook }) => {
        mockHooksOfTestBrain.push(hook);
        return hook;
      },
    },
    del: async () => undefined,
  },
};

/**
 * .mock = `getBrainHooksAdapterByConfigImplicit`, the package loader; for `claude-code` it returns
 *         the REAL claude code adapter from the installed `rhachet-brains-anthropic`, imported
 *         statically; for `test-brain`, the in-memory fake above
 * .why = the loader imports a supplier via a vm dynamic import, which jest refuses without
 *        `--experimental-vm-modules`; only the load is swapped, the claude adapter and its writes are real
 * .real = the init hooks acceptance suite loads the supplier through the real loader, in a cli
 */
jest.mock(
  '@src/domain.operations/config/getBrainHooksAdapterByConfigImplicit',
  () => ({
    getBrainHooksAdapterByConfigImplicit: jest.fn(
      async (
        input: { brain: string; configTargetDir?: string },
        context: { cwd: string },
      ) =>
        input.brain === 'test-brain'
          ? mockAdapterOfTestBrain
          : jest
              .requireActual('rhachet-brains-anthropic')
              .genBrainHooksAdapterForClaudeCode({
                repoPath: input.configTargetDir ?? context.cwd,
              }),
    ),
  }),
);

/**
 * .what = the repo root, whose package.json names the installed `rhachet-brains-anthropic`
 */
const REPO_ROOT = join(__dirname, '../../..');

/**
 * .what = a role with one hook the dispatcher runs as declared (`foreign`), so no role file is owed
 */
const ROLE: HasRepo<Role> = {
  ...new Role({
    slug: 'tester',
    name: 'Tester',
    purpose: 'a role whose hook the sweep moves into the manifest',
    readme: { uri: 'readme.md' },
    traits: [],
    skills: { dirs: { uri: 'skills' }, refs: [] },
    briefs: { dirs: { uri: 'briefs' } },
    hooks: {
      onBrain: {
        onBoot: [{ command: 'echo boot', timeout: 'PT10S' }],
      },
    },
  }),
  repo: 'demo',
};

/**
 * .what = a second role, whose hook sits on another event (onTool), so one manifest holds both
 */
const ROLE_DESIGNER: HasRepo<Role> = {
  ...new Role({
    slug: 'designer',
    name: 'Designer',
    purpose: 'a second role in the sweep',
    readme: { uri: 'readme.md' },
    traits: [],
    skills: { dirs: { uri: 'skills' }, refs: [] },
    briefs: { dirs: { uri: 'briefs' } },
    hooks: {
      onBrain: {
        onTool: [{ command: 'echo design', timeout: 'PT10S' }],
      },
    },
  }),
  repo: 'demo',
};

/**
 * .mock = `detectBrainReplsInRepo`, as a spy that calls through to the real detection
 * .why = an explicit `brains` list must override detection; the spy proves it never ran. a
 *        compiled module export cannot be redefined, so `jest.spyOn` cannot wrap it in place
 * .real = the [case4] unit case and every cli run use the real detection unwrapped
 */
jest.mock('./detectBrainReplsInRepo', () => {
  const actual = jest.requireActual('./detectBrainReplsInRepo');
  return {
    detectBrainReplsInRepo: jest.fn(actual.detectBrainReplsInRepo),
  };
});
const spyDetect = detectBrainReplsModule.detectBrainReplsInRepo as jest.Mock;

describe('syncAllRoleHooksIntoEachBrainRepl', () => {
  given('[case1] the claude code brain, through its real adapter', () => {
    when('[t0] the sweep runs for one role', () => {
      const scene = useBeforeAll(async () => {
        // the write lands in a temp brain dir, as init writes each actor's brain dir
        const configTargetDir = realpathSync(
          genTempDir({ slug: 'sync-all-role-hooks-claude-code' }),
        );
        const result = await syncAllRoleHooksIntoEachBrainRepl(
          { roles: [ROLE], brains: ['claude-code'], configTargetDir },
          new ContextCli({ cwd: REPO_ROOT, gitroot: REPO_ROOT }),
        );
        const manifest = readFileSync(
          join(configTargetDir, '.claude', HOOK_DISPATCH.manifest),
          'utf-8',
        );
        return { result, manifest };
      });

      then('the sweep reports no error', () => {
        expect(scene.result.errors).toEqual([]);
      });

      then('the applied result names the claude code brain', () => {
        expect(scene.result.applied).toHaveLength(1);
        expect(scene.result.applied[0]?.brain).toEqual('claude-code');
      });

      then('the applied result names the role', () => {
        expect(scene.result.applied[0]?.role.slug).toEqual('tester');
      });

      then('the brain was named, so detection never ran', () => {
        expect(spyDetect).not.toHaveBeenCalled();
      });

      then('the applied result shows 1 hook created', () => {
        expect(scene.result.applied[0]?.hooks.created).toHaveLength(1);
        expect(scene.result.applied[0]?.hooks.created[0]?.command).toEqual(
          'echo boot',
        );
      });

      then('the hook lands as a rule in the dispatch manifest', () => {
        expect(scene.manifest).toContain('echo boot');
        expect(scene.manifest).toContain('repo=demo/role=tester');
      });
    });
  });

  given(
    '[case2] two roles, the claude code brain, through its real adapter',
    () => {
      when('[t0] the sweep runs for both roles', () => {
        const scene = useBeforeAll(async () => {
          const configTargetDir = realpathSync(
            genTempDir({ slug: 'sync-all-role-hooks-claude-code-two' }),
          );
          const result = await syncAllRoleHooksIntoEachBrainRepl(
            {
              roles: [ROLE, ROLE_DESIGNER],
              brains: ['claude-code'],
              configTargetDir,
            },
            new ContextCli({ cwd: REPO_ROOT, gitroot: REPO_ROOT }),
          );
          const manifest = readFileSync(
            join(configTargetDir, '.claude', HOOK_DISPATCH.manifest),
            'utf-8',
          );
          return { result, manifest };
        });

        then('the sweep reports no error', () => {
          expect(scene.result.errors).toEqual([]);
        });

        then(
          'one applied result per role, each on the claude code brain',
          () => {
            expect(
              scene.result.applied.map((applied) => ({
                role: applied.role.slug,
                brain: applied.brain,
                created: applied.hooks.created.map((hook) => hook.command),
              })),
            ).toEqual([
              { role: 'tester', brain: 'claude-code', created: ['echo boot'] },
              {
                role: 'designer',
                brain: 'claude-code',
                created: ['echo design'],
              },
            ]);
          },
        );

        then("both roles' hooks land in one manifest", () => {
          expect(scene.manifest).toContain('repo=demo/role=tester');
          expect(scene.manifest).toContain('repo=demo/role=designer');
          expect(scene.manifest).toContain('echo design');
        });
      });
    },
  );

  given(
    '[case3] the claude code brain beside a second brain, in one sweep',
    () => {
      when('[t0] the sweep runs for one role across both brains', () => {
        const scene = useBeforeAll(async () => {
          const configTargetDir = realpathSync(
            genTempDir({ slug: 'sync-all-role-hooks-two-brains' }),
          );
          const result = await syncAllRoleHooksIntoEachBrainRepl(
            {
              roles: [ROLE],
              brains: ['claude-code', 'test-brain'],
              configTargetDir,
            },
            new ContextCli({ cwd: REPO_ROOT, gitroot: REPO_ROOT }),
          );
          const manifest = readFileSync(
            join(configTargetDir, '.claude', HOOK_DISPATCH.manifest),
            'utf-8',
          );
          return {
            result,
            manifest,
            hooksOfTestBrain: [...mockHooksOfTestBrain],
          };
        });

        then('the sweep reports no error', () => {
          expect(scene.result.errors).toEqual([]);
        });

        then('one applied result per brain, in the order named', () => {
          expect(
            scene.result.applied.map((applied) => ({
              brain: applied.brain,
              created: applied.hooks.created.map((hook) => hook.command),
            })),
          ).toEqual([
            { brain: 'claude-code', created: ['echo boot'] },
            { brain: 'test-brain', created: ['echo boot'] },
          ]);
        });

        then('the claude code brain gets the hook as a manifest rule', () => {
          expect(scene.manifest).toContain('echo boot');
          expect(scene.manifest).toContain('repo=demo/role=tester');
        });

        then(
          'the second brain gets the hook through its own adapter, as is',
          () => {
            expect(scene.hooksOfTestBrain.map((hook) => hook.command)).toEqual([
              'echo boot',
            ]);
            expect(scene.hooksOfTestBrain[0]?.author).toEqual(
              'repo=demo/role=tester',
            );
          },
        );
      });
    },
  );
});
