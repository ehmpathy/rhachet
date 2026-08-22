import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { getOneAgeRecipientOrNull } from './getOneAgeRecipientOrNull';

// inject a fake ssh-crypto converter (dependency injection) so each case controls exactly what it
// throws/returns — this proves the rethrow/swallow split (the fail-loud e6 guarantee) for every
// caller of the helper at once, WITHOUT a jest.mock (rule.forbid.unit.remote-boundaries).
const genFakeConvert =
  (behavior: { returns?: string; throws?: Error }) =>
  async (): Promise<string> => {
    if (behavior.throws) throw behavior.throws;
    return behavior.returns!;
  };

describe('getOneAgeRecipientOrNull', () => {
  given('[case1] the pubkey converts cleanly', () => {
    when('[t0] getOneAgeRecipientOrNull is called', () => {
      then('it returns the age recipient', async () => {
        const recipient = await getOneAgeRecipientOrNull(
          { pubkey: 'ssh-...' },
          { convert: genFakeConvert({ returns: 'age1example' }) },
        );
        expect(recipient).toEqual('age1example');
      });
    });
  });

  given('[case2] the pubkey is malformed/unsupported (generic Error)', () => {
    when('[t0] getOneAgeRecipientOrNull is called', () => {
      then(
        'it swallows the error and returns null (skip this key)',
        async () => {
          const recipient = await getOneAgeRecipientOrNull(
            { pubkey: 'ssh-rsa' },
            {
              convert: genFakeConvert({
                throws: new Error('only ed25519 keys supported'),
              }),
            },
          );
          expect(recipient).toBeNull();
        },
      );
    });
  });

  given(
    '[case3] the pure-esm crypto module is broken (MalfunctionError)',
    () => {
      when('[t0] getOneAgeRecipientOrNull is called', () => {
        then('it rethrows the MalfunctionError — fails loud (e6)', async () => {
          const error = await getError(
            getOneAgeRecipientOrNull(
              { pubkey: 'ssh-...' },
              {
                convert: genFakeConvert({
                  throws: new MalfunctionError(
                    'failed to load the @noble/curves/ed25519.js module for ssh pubkey to age recipient conversion',
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
    when('[t0] getOneAgeRecipientOrNull is called', () => {
      then('it rethrows the ConstraintError — fails loud', async () => {
        const error = await getError(
          getOneAgeRecipientOrNull(
            { pubkey: 'ssh-...' },
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
});
