import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { given, then, useBeforeAll, when } from 'test-fns';

import { genBrainHooksAdapterForClaudeCode } from '@src/_topublish/rhachet-brains-anthropic/src/hooks/genBrainHooksAdapterForClaudeCode';
import { BrainHook } from '@src/domain.objects/BrainHook';

import { pruneOrphanedRoleHooksFromOneBrain } from './pruneOrphanedRoleHooksFromOneBrain';

describe('pruneOrphanedRoleHooksFromOneBrain', () => {
  given('[case1] orphaned hook exists, symlink does not exist', () => {
    const scene = useBeforeAll(async () => {
      // create temp repo
      const repoPath = path.join(
        os.tmpdir(),
        `prune-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      );
      await fs.mkdir(path.join(repoPath, '.claude'), { recursive: true });
      await fs.mkdir(path.join(repoPath, '.agent'), { recursive: true });

      // create adapter
      const adapter = genBrainHooksAdapterForClaudeCode({ repoPath });

      // add an orphan hook (author not in authorsDesired)
      const orphanHook = new BrainHook({
        author: 'repo=orphan-registry/role=orphan-role',
        event: 'onBoot',
        command: 'echo orphan',
        timeout: 'PT30S',
      });
      await adapter.dao.set.upsert({ hook: orphanHook });

      // add a linked hook (author in authorsDesired)
      const linkedHook = new BrainHook({
        author: 'repo=linked-registry/role=linked-role',
        event: 'onBoot',
        command: 'echo linked',
        timeout: 'PT30S',
      });
      await adapter.dao.set.upsert({ hook: linkedHook });

      // define linked authors (only linked-role is linked)
      const authorsDesired = new Set(['repo=linked-registry/role=linked-role']);

      return { repoPath, adapter, orphanHook, linkedHook, authorsDesired };
    });

    when('[t0] prune is executed', () => {
      const result = useBeforeAll(async () =>
        pruneOrphanedRoleHooksFromOneBrain({
          adapter: scene.adapter,
          authorsDesired: scene.authorsDesired,
        }),
      );

      then('returns 1 removed hook', () => {
        expect(result.removed).toHaveLength(1);
      });

      then('removed hook is the orphan', () => {
        expect(result.removed[0]?.author).toEqual(
          'repo=orphan-registry/role=orphan-role',
        );
      });

      then('orphan hook no longer exists in adapter', async () => {
        const hooksFound = await scene.adapter.dao.get.all();
        const orphanFound = hooksFound.find(
          (h) => h.author === 'repo=orphan-registry/role=orphan-role',
        );
        expect(orphanFound).toBeUndefined();
      });

      then('linked hook still exists in adapter', async () => {
        const hooksFound = await scene.adapter.dao.get.all();
        const linkedFound = hooksFound.find(
          (h) => h.author === 'repo=linked-registry/role=linked-role',
        );
        expect(linkedFound).toBeDefined();
      });
    });
  });

  given('[case2] no hooks to prune', () => {
    const scene = useBeforeAll(async () => {
      // create temp repo
      const repoPath = path.join(
        os.tmpdir(),
        `prune-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      );
      await fs.mkdir(path.join(repoPath, '.claude'), { recursive: true });
      await fs.mkdir(path.join(repoPath, '.agent'), { recursive: true });

      // create adapter (no hooks)
      const adapter = genBrainHooksAdapterForClaudeCode({ repoPath });

      const authorsDesired = new Set<string>();

      return { repoPath, adapter, authorsDesired };
    });

    when('[t0] prune is executed', () => {
      const result = useBeforeAll(async () =>
        pruneOrphanedRoleHooksFromOneBrain({
          adapter: scene.adapter,
          authorsDesired: scene.authorsDesired,
        }),
      );

      then('returns 0 removed hooks', () => {
        expect(result.removed).toHaveLength(0);
      });
    });
  });

  given('[case3] non-rhachet hooks are ignored', () => {
    const scene = useBeforeAll(async () => {
      // create temp repo
      const repoPath = path.join(
        os.tmpdir(),
        `prune-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      );
      await fs.mkdir(path.join(repoPath, '.claude'), { recursive: true });
      await fs.mkdir(path.join(repoPath, '.agent'), { recursive: true });

      // create adapter
      const adapter = genBrainHooksAdapterForClaudeCode({ repoPath });

      // add a non-rhachet hook (author doesn't match repo=/role= pattern)
      const nonRhachetHook = new BrainHook({
        author: 'some-other-tool',
        event: 'onBoot',
        command: 'echo external',
        timeout: 'PT30S',
      });
      await adapter.dao.set.upsert({ hook: nonRhachetHook });

      const authorsDesired = new Set<string>();

      return { repoPath, adapter, nonRhachetHook, authorsDesired };
    });

    when('[t0] prune is executed', () => {
      const result = useBeforeAll(async () =>
        pruneOrphanedRoleHooksFromOneBrain({
          adapter: scene.adapter,
          authorsDesired: scene.authorsDesired,
        }),
      );

      then('returns 0 removed hooks (non-rhachet ignored)', () => {
        expect(result.removed).toHaveLength(0);
      });

      then('non-rhachet hook still exists', async () => {
        const hooksFound = await scene.adapter.dao.get.all();
        const found = hooksFound.find((h) => h.author === 'some-other-tool');
        expect(found).toBeDefined();
      });
    });
  });
});
