import { BadRequestError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { isBrainSocketCapable } from './isBrainSocketCapable';

describe('isBrainSocketCapable', () => {
  given('[case1] a socket-capable brain', () => {
    when('[t0] checked', () => {
      then('claude is socket-capable', () => {
        expect(isBrainSocketCapable({ brain: 'claude' })).toBe(true);
      });
    });
  });

  given('[case2] an unsupported brain', () => {
    when('[t0] checked', () => {
      then(
        'it fails loud (an unknown brain is a caller fault, not "not capable")',
        async () => {
          const error = await getError(() =>
            isBrainSocketCapable({ brain: 'nonesuch' }),
          );
          expect(error).toBeInstanceOf(BadRequestError);
        },
      );
    });
  });
});
