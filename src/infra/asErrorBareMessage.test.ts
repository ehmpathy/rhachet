import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { asErrorBareMessage } from './asErrorBareMessage';

describe('asErrorBareMessage', () => {
  given('[case1] a ConstraintError with metadata', () => {
    when('[t0] made bare', () => {
      then('only the headline is kept: no glyph, class, or metadata', () => {
        const bare = asErrorBareMessage({
          error: new ConstraintError('blob is stale', {
            appId: '123',
            hint: 're-file it',
          }),
        });
        expect(bare).toEqual('blob is stale');
      });
    });
  });

  given('[case2] a MalfunctionError with a cause', () => {
    when('[t0] made bare', () => {
      then('the cause is dropped with the class prefix', () => {
        const bare = asErrorBareMessage({
          error: new MalfunctionError('mint failed', {
            cause: new Error('socket hang up'),
          }),
        });
        expect(bare).toEqual('mint failed');
      });
    });
  });

  given('[case3] a plain Error', () => {
    when('[t0] made bare', () => {
      then('its message is kept verbatim', () => {
        expect(
          asErrorBareMessage({ error: new Error('plain fault: detail') }),
        ).toEqual('plain fault: detail');
      });
    });
  });

  given('[case4] a class name that appears mid-message', () => {
    when('[t0] made bare', () => {
      then('it is never cut', () => {
        expect(
          asErrorBareMessage({ error: new Error('see Error: in the log') }),
        ).toEqual('see Error: in the log');
      });
    });
  });

  given('[case5] a non-error value', () => {
    when('[t0] made bare', () => {
      then('its string form is returned', () => {
        expect(asErrorBareMessage({ error: 'raw text' })).toEqual('raw text');
      });
    });
  });
});
