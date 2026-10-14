import { ConstraintError } from 'helpful-errors';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { ContextCli } from '@src/domain.objects/ContextCli';

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * .mock = the adapter lookup only: it loads the brain packages a repo installs, and a temp
 *   repo installs none. detection runs for real against the temp dir
 */
jest.mock('@src/domain.operations/config/getBrainHooksAdapterByConfigImplicit');

import { getBrainHooksAdapterByConfigImplicit } from '@src/domain.operations/config/getBrainHooksAdapterByConfigImplicit';

import { getBrainsDetectedAndSupplied } from './getBrainsDetectedAndSupplied';

const mockGetAdapter = getBrainHooksAdapterByConfigImplicit as jest.Mock;

/**
 * .what = a temp repo whose `.claude` holds the seeded `settings.of.repo.json`, as every repo
 *   actor brain dir does once the layout ran
 */
const genRepoWithSeededClaude = (input: { slug: string }): string => {
  const dir = genTempDir({ slug: input.slug });
  mkdirSync(join(dir, '.claude'), { recursive: true });
  writeFileSync(join(dir, '.claude', 'settings.of.repo.json'), '{}\n');
  return dir;
};

describe('getBrainsDetectedAndSupplied', () => {
  beforeEach(() => jest.clearAllMocks());

  given('[case1] claude detected, and a package supplies its adapter', () => {
    const scene = useBeforeAll(async () => {
      const dir = genRepoWithSeededClaude({ slug: 'brains-supplied' });
      mockGetAdapter.mockResolvedValue({ slug: 'test/claude' });
      return {
        result: await getBrainsDetectedAndSupplied(
          new ContextCli({ cwd: dir, gitroot: dir }),
        ),
      };
    });

    when('[t0] the brains are resolved', () => {
      then('claude is kept', () => {
        expect(scene.result).toEqual(['anthropic/claude/code']);
      });
    });
  });

  given('[case2] claude detected, and no package supplies its adapter', () => {
    const scene = useBeforeAll(async () => {
      const dir = genRepoWithSeededClaude({ slug: 'brains-unsupplied' });
      mockGetAdapter.mockResolvedValue(null);
      return {
        result: await getBrainsDetectedAndSupplied(
          new ContextCli({ cwd: dir, gitroot: dir }),
        ),
      };
    });

    when('[t0] the brains are resolved', () => {
      then('claude is skipped: a seeded brain dir asks for no hooks', () => {
        expect(scene.result).toEqual([]);
      });
    });
  });

  given('[case3] claude detected, and the adapter lookup faults', () => {
    const scene = useBeforeAll(async () => {
      const dir = genRepoWithSeededClaude({ slug: 'brains-ambiguous' });
      mockGetAdapter.mockRejectedValue(
        new ConstraintError('multiple brain hooks adapters matched'),
      );
      return {
        result: await getBrainsDetectedAndSupplied(
          new ContextCli({ cwd: dir, gitroot: dir }),
        ),
      };
    });

    when('[t0] the brains are resolved', () => {
      then('claude is kept, so the sync reports the fault per role', () => {
        expect(scene.result).toEqual(['anthropic/claude/code']);
      });
    });
  });
});
