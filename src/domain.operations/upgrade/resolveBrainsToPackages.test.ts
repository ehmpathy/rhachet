import { given, then, when } from 'test-fns';

import { ContextCli } from '@src/domain.objects/ContextCli';

import { resolveBrainsToPackages } from './resolveBrainsToPackages';

// mock discoverBrainPackages
jest.mock('@src/domain.operations/brains/discoverBrainPackages', () => ({
  discoverBrainPackages: jest.fn(),
}));

import { discoverBrainPackages } from '@src/domain.operations/brains/discoverBrainPackages';

const mockDiscoverBrainPackages = discoverBrainPackages as jest.MockedFunction<
  typeof discoverBrainPackages
>;

describe('resolveBrainsToPackages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  given('[case1] empty specs array', () => {
    when('[t0] resolveBrainsToPackages is called', () => {
      then('returns empty array without discovery', async () => {
        const context = new ContextCli({ cwd: '/test', gitroot: '/test' });
        const result = await resolveBrainsToPackages({ specs: [] }, context);
        expect(result).toEqual([]);
        expect(mockDiscoverBrainPackages).not.toHaveBeenCalled();
      });
    });
  });

  given('[case2] wildcard spec with installed brain packages', () => {
    beforeEach(() => {
      mockDiscoverBrainPackages.mockResolvedValue([
        'rhachet-brains-anthropic',
        'rhachet-brains-opencode',
      ]);
    });

    when('[t0] resolveBrainsToPackages is called with *', () => {
      then('expands via discovery and returns all brain packages', async () => {
        const context = new ContextCli({ cwd: '/test', gitroot: '/test' });
        const result = await resolveBrainsToPackages({ specs: ['*'] }, context);
        expect(result).toContain('rhachet-brains-anthropic');
        expect(result).toContain('rhachet-brains-opencode');
        expect(result).toHaveLength(2);
      });
    });
  });

  given('[case3] explicit slug spec', () => {
    beforeEach(() => {
      mockDiscoverBrainPackages.mockResolvedValue(['rhachet-brains-anthropic']);
    });

    when('[t0] resolveBrainsToPackages is called with slug', () => {
      then('resolves slug to full package name', async () => {
        const context = new ContextCli({ cwd: '/test', gitroot: '/test' });
        const result = await resolveBrainsToPackages(
          { specs: ['anthropic'] },
          context,
        );
        expect(result).toEqual(['rhachet-brains-anthropic']);
      });
    });
  });

  given('[case4] full package name spec', () => {
    beforeEach(() => {
      mockDiscoverBrainPackages.mockResolvedValue(['rhachet-brains-anthropic']);
    });

    when(
      '[t0] resolveBrainsToPackages is called with full package name',
      () => {
        then('passes through unchanged', async () => {
          const context = new ContextCli({ cwd: '/test', gitroot: '/test' });
          const result = await resolveBrainsToPackages(
            { specs: ['rhachet-brains-anthropic'] },
            context,
          );
          expect(result).toEqual(['rhachet-brains-anthropic']);
        });
      },
    );
  });

  given('[case5] brain package not installed', () => {
    beforeEach(() => {
      mockDiscoverBrainPackages.mockResolvedValue(['rhachet-brains-anthropic']);
    });

    when('[t0] resolveBrainsToPackages is called with absent package', () => {
      then('throws BadRequestError with suggestion', async () => {
        const context = new ContextCli({ cwd: '/test', gitroot: '/test' });
        await expect(
          resolveBrainsToPackages({ specs: ['nonexistent'] }, context),
        ).rejects.toThrow('brain package not installed');
      });
    });
  });

  given('[case6] duplicate specs', () => {
    beforeEach(() => {
      mockDiscoverBrainPackages.mockResolvedValue(['rhachet-brains-anthropic']);
    });

    when('[t0] resolveBrainsToPackages is called with duplicates', () => {
      then('deduplicates packages', async () => {
        const context = new ContextCli({ cwd: '/test', gitroot: '/test' });
        const result = await resolveBrainsToPackages(
          { specs: ['anthropic', 'anthropic', 'rhachet-brains-anthropic'] },
          context,
        );
        expect(result).toEqual(['rhachet-brains-anthropic']);
      });
    });
  });
});
