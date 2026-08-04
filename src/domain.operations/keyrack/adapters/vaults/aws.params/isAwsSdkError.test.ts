import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { isAwsSdkError } from './isAwsSdkError';

/**
 * .what = unit clamp for the aws.params catch allowlist
 * .why = the three aws.params catch sites classify ONLY a recognized AWS SDK error into a keyrack
 *        gate, and rethrow every other error UNCHANGED (rule.forbid.failhide). this locks WHICH
 *        errors are inside the allowlist, so a later edit that widens it (and so masks a foreign
 *        error behind a keyrack gate) or narrows it (and so lets a real AWS denial escape bare)
 *        fails here
 */
describe('isAwsSdkError', () => {
  given('[case1] a recognized AWS SDK error', () => {
    const cases: unknown[] = [
      // a service exception — carries the structured $metadata bag
      Object.assign(new Error('access denied'), {
        name: 'AccessDeniedException',
        $metadata: { httpStatusCode: 400 },
      }),
      // a service exception known only by $fault
      Object.assign(new Error('server fault'), { $fault: 'server' }),
      // a service exception known only by its name suffix
      Object.assign(new Error('throttled'), { name: 'ThrottlingException' }),
      // credential-chain errors — thrown before any HTTP call, so no $metadata
      Object.assign(new Error('no identity'), {
        name: 'CredentialsProviderError',
      }),
      Object.assign(new Error('chain fault'), { name: 'ProviderError' }),
      Object.assign(new Error('token fault'), { name: 'TokenProviderError' }),
    ];
    when('[t0] assessed', () => {
      cases.forEach((cause) => {
        then(`${String(cause)} is an AWS SDK error`, () => {
          expect(isAwsSdkError(cause)).toBe(true);
        });
      });
    });
  });

  given(
    '[case2] an error OUTSIDE the allowlist (must rethrow unchanged)',
    () => {
      const cases: unknown[] = [
        // native code bugs — a real bug in our own overlay code, never an AWS fault
        new TypeError('x'),
        new ReferenceError('x'),
        new RangeError('x'),
        // a foreign / unclassified error with no AWS markers
        new Error('some foreign lib fault'),
        Object.assign(new Error('other'), { name: 'SomeOtherError' }),
        // keyrack's own classed errors are not raw AWS errors
        new ConstraintError('caller must fix'),
        new MalfunctionError('server fault'),
        // non-Error causes
        'a bare string',
        null,
        undefined,
        { name: 'AccessDeniedException' },
      ];
      when('[t0] assessed', () => {
        cases.forEach((cause) => {
          then(`${String(cause)} is NOT an AWS SDK error`, () => {
            expect(isAwsSdkError(cause)).toBe(false);
          });
        });
      });
    },
  );
});
