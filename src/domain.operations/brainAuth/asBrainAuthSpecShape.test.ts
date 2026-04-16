import { BadRequestError, getError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { asBrainAuthSpecShape } from './asBrainAuthSpecShape';

describe('asBrainAuthSpecShape', () => {
  given('[case1] pool strategy with keyrack URI', () => {
    when('[t0] spec has pool wrapper', () => {
      then('returns pool strategy with source', () => {
        const result = asBrainAuthSpecShape({
          spec: 'pool(keyrack://ehmpathy/prod/ANTHROPIC_API_KEY_*)',
        });
        expect(result.strategy).toEqual('pool');
        expect(result.source).toEqual(
          'keyrack://ehmpathy/prod/ANTHROPIC_API_KEY_*',
        );
      });
    });
  });

  given('[case2] solo strategy with keyrack URI', () => {
    when('[t0] spec has solo wrapper', () => {
      then('returns solo strategy with source', () => {
        const result = asBrainAuthSpecShape({
          spec: 'solo(keyrack://ehmpathy/prod/ANTHROPIC_API_KEY_1)',
        });
        expect(result.strategy).toEqual('solo');
        expect(result.source).toEqual(
          'keyrack://ehmpathy/prod/ANTHROPIC_API_KEY_1',
        );
      });
    });
  });

  given('[case3] raw keyrack URI (default strategy)', () => {
    when('[t0] spec is just a keyrack URI', () => {
      then('returns default strategy with source', () => {
        const result = asBrainAuthSpecShape({
          spec: 'keyrack://ehmpathy/prod/ANTHROPIC_API_KEY_1',
        });
        expect(result.strategy).toEqual('default');
        expect(result.source).toEqual(
          'keyrack://ehmpathy/prod/ANTHROPIC_API_KEY_1',
        );
      });
    });
  });

  given('[case4] empty or null spec', () => {
    when('[t0] spec is empty string', () => {
      then('returns default strategy with null source', () => {
        const result = asBrainAuthSpecShape({ spec: '' });
        expect(result.strategy).toEqual('default');
        expect(result.source).toBeNull();
      });
    });

    when('[t1] spec is null', () => {
      then('returns default strategy with null source', () => {
        const result = asBrainAuthSpecShape({ spec: null });
        expect(result.strategy).toEqual('default');
        expect(result.source).toBeNull();
      });
    });

    when('[t2] spec is whitespace only', () => {
      then('returns default strategy with null source', () => {
        const result = asBrainAuthSpecShape({ spec: '   ' });
        expect(result.strategy).toEqual('default');
        expect(result.source).toBeNull();
      });
    });
  });

  given('[case5] invalid spec format', () => {
    when('[t0] spec has invalid wrapper name', () => {
      then('throws BadRequestError', async () => {
        const error = await getError(async () =>
          asBrainAuthSpecShape({
            spec: 'invalid(keyrack://ehmpathy/prod/KEY)',
          }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error!.message).toContain('invalid auth spec format');
      });
    });

    when('[t1] pool wrapper has non-keyrack source', () => {
      then('throws BadRequestError', async () => {
        const error = await getError(async () =>
          asBrainAuthSpecShape({
            spec: 'pool(https://example.com/key)',
          }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error!.message).toContain('expected keyrack:// URI');
      });
    });

    when('[t2] spec is arbitrary string', () => {
      then('throws BadRequestError', async () => {
        const error = await getError(async () =>
          asBrainAuthSpecShape({
            spec: 'some-random-string',
          }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error!.message).toContain('invalid auth spec format');
      });
    });
  });
});
