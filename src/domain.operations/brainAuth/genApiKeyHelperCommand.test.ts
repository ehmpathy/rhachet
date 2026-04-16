import { given, then, when } from 'test-fns';

import type { BrainAuthSpecShape } from '@src/domain.objects/BrainAuthSpec';

import { genApiKeyHelperCommand } from './genApiKeyHelperCommand';

describe('genApiKeyHelperCommand', () => {
  given('[case1] default strategy with no source', () => {
    when('[t0] spec has default strategy and null source', () => {
      then('returns null (use env var)', () => {
        const spec: BrainAuthSpecShape = {
          strategy: 'default',
          source: null,
        };
        const result = genApiKeyHelperCommand({ spec });
        expect(result).toBeNull();
      });
    });
  });

  given('[case2] default strategy with source', () => {
    when('[t0] spec has source keyrack URI', () => {
      then('returns keyrack get command', () => {
        const spec: BrainAuthSpecShape = {
          strategy: 'default',
          source: 'keyrack://ehmpathy/prod/ANTHROPIC_API_KEY_1',
        };
        const result = genApiKeyHelperCommand({ spec });
        expect(result).toEqual(
          'rhx keyrack get --key ANTHROPIC_API_KEY_1 --env prod --owner ehmpath --output token',
        );
      });
    });
  });

  given('[case3] solo strategy', () => {
    when('[t0] spec has exact key', () => {
      then('returns keyrack get command', () => {
        const spec: BrainAuthSpecShape = {
          strategy: 'solo',
          source: 'keyrack://ehmpathy/test/MY_API_KEY',
        };
        const result = genApiKeyHelperCommand({ spec });
        expect(result).toEqual(
          'rhx keyrack get --key MY_API_KEY --env test --owner ehmpath --output token',
        );
      });
    });

    when('[t1] custom owner provided', () => {
      then('uses custom owner in command', () => {
        const spec: BrainAuthSpecShape = {
          strategy: 'solo',
          source: 'keyrack://ehmpathy/prod/ANTHROPIC_API_KEY_1',
        };
        const result = genApiKeyHelperCommand({ spec, owner: 'myowner' });
        expect(result).toEqual(
          'rhx keyrack get --key ANTHROPIC_API_KEY_1 --env prod --owner myowner --output token',
        );
      });
    });
  });

  given('[case4] pool strategy', () => {
    when('[t0] spec has wildcard pattern', () => {
      then('returns brains auth supply command', () => {
        const spec: BrainAuthSpecShape = {
          strategy: 'pool',
          source: 'keyrack://ehmpathy/prod/ANTHROPIC_API_KEY_*',
        };
        const result = genApiKeyHelperCommand({ spec });
        expect(result).toEqual(
          'rhx brains auth supply --spec "pool(keyrack://ehmpathy/prod/ANTHROPIC_API_KEY_*)" --owner ehmpath',
        );
      });
    });

    when('[t1] custom owner provided', () => {
      then('uses custom owner in command', () => {
        const spec: BrainAuthSpecShape = {
          strategy: 'pool',
          source: 'keyrack://acme/test/API_KEY_*',
        };
        const result = genApiKeyHelperCommand({ spec, owner: 'acme' });
        expect(result).toEqual(
          'rhx brains auth supply --spec "pool(keyrack://acme/test/API_KEY_*)" --owner acme',
        );
      });
    });
  });
});
