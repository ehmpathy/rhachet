import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import type { KeyrackGrantMechanismAdapter } from '@src/domain.objects/keyrack/KeyrackGrantMechanismAdapter';

import { getOneKeyrackMechSecretDelivered } from './getOneKeyrackMechSecretDelivered';

/**
 * .what = a mech adapter whose delivery is given, injected as a fake (no module mock)
 */
const genMechAdapterFake = (input: {
  deliver: () => Promise<{ secret: string }>;
}): KeyrackGrantMechanismAdapter => ({
  validate: () => ({ valid: true, errors: [] }),
  acquireForSet: async () => ({ source: '' }),
  deliverForGet: input.deliver,
});

describe('getOneKeyrackMechSecretDelivered', () => {
  given('[case1] the mech delivers', () => {
    when('[t0] called', () => {
      then('it returns the secret and never builds the cure', async () => {
        const cure = jest.fn(() => 'the cure');
        const delivered = await getOneKeyrackMechSecretDelivered({
          mechAdapter: genMechAdapterFake({
            deliver: async () => ({ secret: 'ghs_x' }),
          }),
          source: '{}',
          cure,
        });
        expect(delivered.secret).toEqual('ghs_x');
        expect(cure).not.toHaveBeenCalled();
      });
    });
  });

  given('[case2] the mint is refused', () => {
    when('[t0] called', () => {
      then('the refusal carries the cure after its hint', async () => {
        const error = await getError(
          getOneKeyrackMechSecretDelivered({
            mechAdapter: genMechAdapterFake({
              deliver: async () => {
                throw new ConstraintError('refused', {
                  fault: 'key-refused',
                  hint: 're-file the current blob',
                });
              },
            }),
            source: '{}',
            cure: () => 'the cure',
          }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('re-file the current blob; the cure');
      });
    });
  });

  given('[case3] a fault that is no mint refusal', () => {
    when('[t0] called', () => {
      then('it is rethrown untouched', async () => {
        const fault = new MalfunctionError('unreached', { appId: '1' });
        const error = await getError(
          getOneKeyrackMechSecretDelivered({
            mechAdapter: genMechAdapterFake({
              deliver: async () => {
                throw fault;
              },
            }),
            source: '{}',
            cure: () => 'the cure',
          }),
        );
        expect(error).toBe(fault);
      });
    });
  });
});
