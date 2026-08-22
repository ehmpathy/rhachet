import {
  BadRequestError,
  ConstraintError,
  MalfunctionError,
} from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { getOneAgeIdentityOrNull } from './getOneAgeIdentityOrNull';

// inject a fake ssh-crypto converter (dependency injection) so each case controls exactly what it
// throws/returns — this proves the rethrow/swallow split (the fail-loud e6 guarantee) for every
// caller of the helper at once, WITHOUT a jest.mock (rule.forbid.unit.remote-boundaries).
const genFakeConvert =
  (behavior: { returns?: string; throws?: Error }) =>
  async (): Promise<string> => {
    if (behavior.throws) throw behavior.throws;
    return behavior.returns!;
  };

describe('getOneAgeIdentityOrNull', () => {
  given('[case1] the key converts cleanly', () => {
    when('[t0] getOneAgeIdentityOrNull is called', () => {
      then('it returns the derived age identity', async () => {
        const identity = await getOneAgeIdentityOrNull(
          { keyPath: '/k' },
          { convert: genFakeConvert({ returns: 'AGE-SECRET-KEY-1EXAMPLE' }) },
        );
        expect(identity).toEqual('AGE-SECRET-KEY-1EXAMPLE');
      });
    });
  });

  given('[case2] the key file is unreadable/invalid (generic Error)', () => {
    when('[t0] getOneAgeIdentityOrNull is called', () => {
      then(
        'it swallows the error and returns null (skip this key)',
        async () => {
          const identity = await getOneAgeIdentityOrNull(
            { keyPath: '/k' },
            {
              convert: genFakeConvert({
                throws: new Error('not a valid openssh private key format'),
              }),
            },
          );
          expect(identity).toBeNull();
        },
      );
    });
  });

  given(
    '[case3] the pure-esm crypto module is broken (MalfunctionError)',
    () => {
      when('[t0] getOneAgeIdentityOrNull is called', () => {
        then('it rethrows the MalfunctionError — fails loud (e6)', async () => {
          const error = await getError(
            getOneAgeIdentityOrNull(
              { keyPath: '/k' },
              {
                convert: genFakeConvert({
                  throws: new MalfunctionError(
                    'failed to load the @noble/hashes/sha2.js module for ssh prikey to age identity conversion',
                  ),
                }),
              },
            ),
          );
          expect(error).toBeInstanceOf(MalfunctionError);
        });
      });
    },
  );

  given('[case4] the input is invalid (ConstraintError)', () => {
    when('[t0] getOneAgeIdentityOrNull is called', () => {
      then('it rethrows the ConstraintError — fails loud', async () => {
        const error = await getError(
          getOneAgeIdentityOrNull(
            { keyPath: '/k' },
            {
              convert: genFakeConvert({
                throws: new ConstraintError('bad input'),
              }),
            },
          ),
        );
        expect(error).toBeInstanceOf(ConstraintError);
      });
    });
  });

  // regression clamp: a bare BadRequestError (ConstraintError's PARENT) is the exact class the old
  // allowlist (`instanceof ConstraintError`) let slip through and swallowed — the actionable
  // "install age" error for a passphrase-protected key. the denylist guard must rethrow it loud.
  given(
    '[case5] an actionable parent-class HelpfulError (BadRequestError)',
    () => {
      when('[t0] getOneAgeIdentityOrNull is called', () => {
        then(
          'it rethrows the BadRequestError — fails loud (no swallow)',
          async () => {
            const error = await getError(
              getOneAgeIdentityOrNull(
                { keyPath: '/k' },
                {
                  convert: genFakeConvert({
                    throws: new BadRequestError(
                      'install age to use passphrase-protected keys',
                    ),
                  }),
                },
              ),
            );
            expect(error).toBeInstanceOf(BadRequestError);
          },
        );
      });
    },
  );
});
