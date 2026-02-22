import { given, then, useBeforeAll, when } from 'test-fns';

import { ContextCli } from '@src/domain.objects/ContextCli';
import * as discoverModule from '@src/domain.operations/brains/discoverBrainPackages';

import { getBrainHooksAdapterByConfigImplicit } from './getBrainHooksAdapterByConfigImplicit';

// mock the discoverBrainPackages module
jest.mock('../brains/discoverBrainPackages');

describe('getBrainHooksAdapterByConfigImplicit', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  given('[case1] no brain packages found', () => {
    when('[t0] discoverBrainPackages returns empty', () => {
      const scene = useBeforeAll(async () => {
        jest
          .spyOn(discoverModule, 'discoverBrainPackages')
          .mockResolvedValue([]);
        const context = new ContextCli({ cwd: '/test', gitroot: '/test' });
        const result = await getBrainHooksAdapterByConfigImplicit(
          { brain: 'claude-code' },
          context,
        );
        return { result };
      });

      then('returns null', () => {
        expect(scene.result).toBeNull();
      });
    });
  });

  given('[case2] package resolution fails gracefully', () => {
    when('[t0] package cannot be resolved from repo path', () => {
      const scene = useBeforeAll(async () => {
        jest
          .spyOn(discoverModule, 'discoverBrainPackages')
          .mockResolvedValue(['rhachet-brains-nonexistent']);

        // capture stderr calls directly (survives mock reset)
        const stderrCalls: string[] = [];
        jest.spyOn(console, 'error').mockImplementation((msg: string) => {
          stderrCalls.push(msg);
        });

        // use a path that doesn't have the package installed
        const context = new ContextCli({
          cwd: '/nonexistent/repo',
          gitroot: '/nonexistent/repo',
        });
        const result = await getBrainHooksAdapterByConfigImplicit(
          { brain: 'claude-code' },
          context,
        );
        return { result, stderrCalls };
      });

      then('returns null (continues after resolution failure)', () => {
        expect(scene.result).toBeNull();
      });

      then('emits resolution failure to stderr', () => {
        expect(scene.stderrCalls.length).toBeGreaterThan(0);
        expect(scene.stderrCalls[0]).toContain(
          'brain package resolution failed',
        );
        expect(scene.stderrCalls[0]).toContain('rhachet-brains-nonexistent');
      });
    });
  });

  // note: actual adapter resolution is tested via acceptance tests
  // see: accept.blackbox/cli/init.hooks.acceptance.test.ts
});
