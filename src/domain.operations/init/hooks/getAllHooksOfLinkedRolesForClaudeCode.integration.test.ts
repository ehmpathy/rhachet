import { MalfunctionError } from 'helpful-errors';
import {
  genTempDir,
  getError,
  given,
  then,
  useBeforeAll,
  when,
} from 'test-fns';

import { genSampleFileTree } from '@src/.test/assets/genSampleFileTree';
import { genBrainHooksAdapterForClaudeCode } from '@src/_topublish/rhachet-brains-anthropic/src/hooks/genBrainHooksAdapterForClaudeCode';
import { REPO_THIS_BUDGET_HOOK_COMMAND } from '@src/domain.operations/brains/getAllRepoThisRolesWithHooks';

import { readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * .mock = the adapter lookup only: it loads the brain packages a repo installs, and a temp
 *   repo installs none. it answers with the real claude adapter from this repo, aimed at the
 *   dir the sync asks for, so the hook render and the settings read run for real
 */
jest.mock('@src/domain.operations/config/getBrainHooksAdapterByConfigImplicit');

import { getBrainHooksAdapterByConfigImplicit } from '@src/domain.operations/config/getBrainHooksAdapterByConfigImplicit';

import { getAllHooksOfLinkedRolesForClaudeCode } from './getAllHooksOfLinkedRolesForClaudeCode';

const mockGetAdapter = getBrainHooksAdapterByConfigImplicit as jest.Mock;

/**
 * .what = a temp repo with the given files
 */
const genRepo = (input: { slug: string; files: Record<string, string> }) => {
  const repoPath = genTempDir({ slug: input.slug });
  genSampleFileTree({ dir: repoPath, files: input.files });
  return repoPath;
};

/**
 * .what = the roles the actor under test holds — `any` for the `.this` budget gate, `phantom`
 *   for the unreadable package of case4
 */
const ROLES_HELD = ['any', 'phantom'];

const FILES_CLAUDE_SEEDED = { '.claude/settings.of.repo.json': '{}\n' };
const FILES_THIS_BUDGETED = {
  '.agent/repo=.this/role=any/boot.yml':
    'budget:\n  tokens: 5_000\nbriefs:\n  say: []\n',
};

describe('getAllHooksOfLinkedRolesForClaudeCode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAdapter.mockImplementation(
      async (input: { configTargetDir: string }) =>
        genBrainHooksAdapterForClaudeCode({ repoPath: input.configTargetDir }),
    );
  });

  given('[case1] a repo where no claude brain is detected', () => {
    const scene = useBeforeAll(async () => {
      const repoPath = genRepo({
        slug: 'hooks-union-no-claude',
        files: FILES_THIS_BUDGETED,
      });
      return {
        hooks: await getAllHooksOfLinkedRolesForClaudeCode({
          repoPath,
          roles: ROLES_HELD,
        }),
      };
    });

    when('[t0] the union is computed', () => {
      then('it is empty — no claude brain, no claude hooks', () => {
        expect(scene.hooks).toEqual({});
      });
    });
  });

  given('[case2] claude detected, and no linked role declares a hook', () => {
    const scene = useBeforeAll(async () => {
      const repoPath = genRepo({
        slug: 'hooks-union-no-roles',
        files: FILES_CLAUDE_SEEDED,
      });
      return {
        hooks: await getAllHooksOfLinkedRolesForClaudeCode({
          repoPath,
          roles: ROLES_HELD,
        }),
      };
    });

    when('[t0] the union is computed', () => {
      then('it is empty', () => {
        expect(scene.hooks).toEqual({});
      });
    });
  });

  given(
    '[case3] claude detected, and a `.this` role whose boot.yml declares a budget',
    () => {
      const scene = useBeforeAll(async () => {
        const repoPath = genRepo({
          slug: 'hooks-union-budget',
          files: { ...FILES_CLAUDE_SEEDED, ...FILES_THIS_BUDGETED },
        });
        const entriesBefore = readdirSync(repoPath).sort();
        const hooks = await getAllHooksOfLinkedRolesForClaudeCode({
          repoPath,
          roles: ROLES_HELD,
        });
        const entriesAfter = readdirSync(repoPath).sort();
        return { repoPath, hooks, entriesBefore, entriesAfter };
      });

      when('[t0] the union is computed', () => {
        then(
          'it holds the budget gate, as the claude adapter renders it',
          () => {
            expect(JSON.stringify(scene.hooks)).toContain(
              REPO_THIS_BUDGET_HOOK_COMMAND,
            );
            expect(Object.keys(scene.hooks)).toEqual(['Stop']);
          },
        );

        then(
          'no file remains in the repo — the in-repo scratch dir is removed before return',
          () => {
            expect(scene.entriesAfter).toEqual(scene.entriesBefore);
            expect(readdirSync(join(scene.repoPath, '.claude')).sort()).toEqual(
              ['settings.of.repo.json'],
            );
            expect(
              readdirSync(
                join(scene.repoPath, '.agent', '.cache', 'hooks-union'),
              ),
            ).toEqual([]);
          },
        );
      });
    },
  );

  given(
    '[case4] claude detected, and a linked role whose package cannot be read',
    () => {
      const scene = useBeforeAll(async () => {
        const repoPath = genRepo({
          slug: 'hooks-union-fault',
          files: {
            ...FILES_CLAUDE_SEEDED,
            '.agent/repo=ghost/role=phantom/readme.md': '# phantom\n',
          },
        });
        return {
          error: await getError(
            getAllHooksOfLinkedRolesForClaudeCode({
              repoPath,
              roles: ROLES_HELD,
            }),
          ),
        };
      });

      when('[t0] the union is computed', () => {
        then('it fails loud and names the role, never a silent absence', () => {
          expect(scene.error).toBeInstanceOf(MalfunctionError);
          expect(scene.error.message).toContain(
            'a linked role could not be read for its hooks',
          );
          expect(scene.error.message).toContain('ghost/phantom');
        });
      });
    },
  );

  given(
    '[case5] claude detected, and an unreadable linked role the actor does not hold',
    () => {
      const scene = useBeforeAll(async () => {
        const repoPath = genRepo({
          slug: 'hooks-union-stale-link',
          files: {
            ...FILES_CLAUDE_SEEDED,
            ...FILES_THIS_BUDGETED,
            '.agent/repo=ghost/role=phantom/readme.md': '# phantom\n',
          },
        });
        return {
          hooks: await getAllHooksOfLinkedRolesForClaudeCode({
            repoPath,
            roles: ['any'],
          }),
        };
      });

      when('[t0] the union is computed for that actor', () => {
        then(
          'the stale link blocks no actor that never held it — its own hooks still render',
          () => {
            expect(JSON.stringify(scene.hooks)).toContain(
              REPO_THIS_BUDGET_HOOK_COMMAND,
            );
          },
        );
      });
    },
  );

  given(
    '[case6] claude detected, and a hooked role the actor does not hold',
    () => {
      const scene = useBeforeAll(async () => {
        const repoPath = genRepo({
          slug: 'hooks-union-not-held',
          files: { ...FILES_CLAUDE_SEEDED, ...FILES_THIS_BUDGETED },
        });
        return {
          hooks: await getAllHooksOfLinkedRolesForClaudeCode({
            repoPath,
            roles: ['mechanic'],
          }),
        };
      });

      when('[t0] the union is computed for that actor', () => {
        then('it is empty — only held roles render', () => {
          expect(scene.hooks).toEqual({});
        });
      });
    },
  );
});
