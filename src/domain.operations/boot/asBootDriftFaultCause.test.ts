import { MalfunctionError } from 'helpful-errors';
import { given, then } from 'test-fns';

import { runInNewContext } from 'node:vm';
import { asBootDriftFaultCause } from './asBootDriftFaultCause';

describe('asBootDriftFaultCause', () => {
  given('[case1] a filesystem error with an errno code', () => {
    then('it is collected as the cause', () => {
      const error = Object.assign(new Error('EISDIR: is a dir'), {
        code: 'EISDIR',
      });
      expect(asBootDriftFaultCause({ error })).toBe(error);
    });
  });

  given('[case1b] a filesystem error from another realm', () => {
    then('it is still collected, though `instanceof Error` is false', () => {
      // a test sandbox hands fs errors across realms; this was a rethrow once
      const error: unknown = runInNewContext(
        "Object.assign(new Error('EISDIR: is a dir'), { code: 'EISDIR' })",
      );
      expect(error instanceof Error).toBe(false);
      expect(asBootDriftFaultCause({ error })).toBe(error);
    });
  });

  given('[case2] a read wrapped as a malfunction', () => {
    then(
      'it is collected as the cause, where its cause is an errno fault',
      () => {
        const error = new MalfunctionError(
          'a boot drift file could not be read',
          {
            path: '/a/boots/serial=abc/boot.md',
            cause: Object.assign(new Error('ENOENT: absent'), {
              code: 'ENOENT',
            }),
          },
        );
        expect(asBootDriftFaultCause({ error })).toBe(error);
      },
    );
  });

  given('[case2b] a malfunction thrown for a broken invariant', () => {
    then('it is null, so the caller rethrows: no errno cause', () => {
      const error = new MalfunctionError('a spawn boot meta was malformed', {
        path: '/a/boots/serial=abc/boot.meta.json',
      });
      expect(asBootDriftFaultCause({ error })).toBeNull();
    });
  });

  given('[case3] a defect in the code', () => {
    then('a plain error is null, so the caller rethrows', () => {
      expect(
        asBootDriftFaultCause({ error: new TypeError('x is undefined') }),
      ).toBeNull();
    });
    then('a non-error throw is null, so the caller rethrows', () => {
      expect(asBootDriftFaultCause({ error: 'boom' })).toBeNull();
    });
  });
});
