import { MalfunctionError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { isTraceLogWriteFault } from './isTraceLogWriteFault';

describe('isTraceLogWriteFault', () => {
  given('[case1] an fs fault on the allowlist', () => {
    when('[t0] its errno is read', () => {
      then(
        'each allowlisted code is a write fault the sink may pass over',
        () => {
          ['EACCES', 'ENOSPC', 'ENOTDIR', 'ENOENT', 'EROFS'].forEach((code) =>
            expect(
              isTraceLogWriteFault({
                error: Object.assign(new Error(code), { code }),
              }),
            ).toBe(true),
          );
        },
      );
      then(
        'an error-shaped value from another realm still reads by its code',
        () => {
          expect(isTraceLogWriteFault({ error: { code: 'EACCES' } })).toBe(
            true,
          );
        },
      );
    });
  });

  given('[case2] a fault the sink must throw up', () => {
    when('[t0] it carries no fs errno', () => {
      then('an unknown fault is not a write fault', () => {
        expect(
          isTraceLogWriteFault({
            error: new MalfunctionError('an unknown fault'),
          }),
        ).toBe(false);
      });
      then('a code defect is not a write fault', () => {
        expect(
          isTraceLogWriteFault({ error: new TypeError('x is undefined') }),
        ).toBe(false);
      });
    });
    when('[t1] it carries an errno off the allowlist', () => {
      then('it is not a write fault', () => {
        expect(isTraceLogWriteFault({ error: { code: 'ECONNREFUSED' } })).toBe(
          false,
        );
        expect(isTraceLogWriteFault({ error: { code: 42 } })).toBe(false);
      });
    });
    when('[t2] it is not an object at all', () => {
      then('it is not a write fault', () => {
        expect(isTraceLogWriteFault({ error: null })).toBe(false);
        expect(isTraceLogWriteFault({ error: 'EACCES' })).toBe(false);
      });
    });
  });
});
