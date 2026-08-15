import { ConstraintError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { asCliOutputMode } from './asCliOutputMode';

describe('asCliOutputMode', () => {
  given('[case1] an absent --output flag', () => {
    when('[t0] parsed', () => {
      then('it defaults to tree', () => {
        expect(asCliOutputMode({ raw: undefined })).toEqual('tree');
      });
    });
  });

  given('[case2] an explicit tree', () => {
    when('[t0] parsed', () => {
      then('it returns tree', () => {
        expect(asCliOutputMode({ raw: 'tree' })).toEqual('tree');
      });
    });
  });

  given('[case3] an explicit json', () => {
    when('[t0] parsed', () => {
      then('it returns json', () => {
        expect(asCliOutputMode({ raw: 'json' })).toEqual('json');
      });
    });
  });

  given('[case4] an unrecognized mode', () => {
    when('[t0] parsed', () => {
      then('it fails loud (ConstraintError) and names the fix', async () => {
        const error = await getError(async () =>
          asCliOutputMode({ raw: 'josn' }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('josn');
        expect(error.message).toContain('--output');
      });
    });
  });
});
