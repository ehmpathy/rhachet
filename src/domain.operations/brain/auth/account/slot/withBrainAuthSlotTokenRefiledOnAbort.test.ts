import { MalfunctionError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { withBrainAuthSlotTokenRefiledOnAbort } from './withBrainAuthSlotTokenRefiledOnAbort';

type SlotOfTest = { owner: string | null; email: string; token: string };
const slot: SlotOfTest = {
  owner: 'ehmpath',
  email: 'two@example.com',
  token: 'rotated',
};

/**
 * .what = a fake slot setter that records each refile, or faults on each
 */
const genFakeSetter = (input: { faults: boolean }) => {
  const refiled: SlotOfTest[] = [];
  const context = {
    setSlotToken: async (call: SlotOfTest) => {
      refiled.push(call); // deliberate mutation: the fake's record of each call
      if (input.faults) throw new Error('keyrack locked');
    },
  };
  return { refiled, context };
};

describe('withBrainAuthSlotTokenRefiledOnAbort', () => {
  given('[case1] the logic completes', () => {
    when('[t0] it runs', () => {
      then('it returns the logic result and refiles naught', async () => {
        const { refiled, context } = genFakeSetter({ faults: false });
        const result = await withBrainAuthSlotTokenRefiledOnAbort(
          {
            slot,
            isHeldByNewHolder: () => false,
            logic: async () => 'installed',
          },
          context,
        );
        expect(result).toEqual('installed');
        expect(refiled).toEqual([]);
      });
    });
  });

  given('[case2] the logic throws before the new holder has the token', () => {
    const abort = new Error('grove login changed mid-swap');
    const logic = async () => {
      throw abort;
    };

    when('[t0] the refile lands', () => {
      then('it refiles the rotated token to its slot, once', async () => {
        const { refiled, context } = genFakeSetter({ faults: false });
        await getError(
          withBrainAuthSlotTokenRefiledOnAbort(
            { slot, isHeldByNewHolder: () => false, logic },
            context,
          ),
        );
        expect(refiled).toEqual([slot]);
      });

      then('it rethrows the very same error, never a wrap', async () => {
        const { context } = genFakeSetter({ faults: false });
        const error = await getError(
          withBrainAuthSlotTokenRefiledOnAbort(
            { slot, isHeldByNewHolder: () => false, logic },
            context,
          ),
        );
        expect(error).toBe(abort);
      });
    });

    when('[t1] the refile faults too', () => {
      then(
        'it throws a malfunction that names the refile fault and keeps the abort as its cause',
        async () => {
          const { context } = genFakeSetter({ faults: true });
          const error = await getError(
            withBrainAuthSlotTokenRefiledOnAbort(
              { slot, isHeldByNewHolder: () => false, logic },
              context,
            ),
          );
          expect(error).toBeInstanceOf(MalfunctionError);
          expect(error.message).toContain('could not refile the rotated login');
          expect(error.message).toContain('keyrack locked');
          expect(error).toMatchObject({ cause: abort });
        },
      );
    });
  });

  given('[case3] the logic throws after the new holder took the token', () => {
    const abort = new Error('lock teardown faulted');
    const logic = async () => {
      throw abort;
    };

    when('[t0] the abort is caught', () => {
      then('it refiles naught, so the token keeps one holder', async () => {
        const { refiled, context } = genFakeSetter({ faults: false });
        await getError(
          withBrainAuthSlotTokenRefiledOnAbort(
            { slot, isHeldByNewHolder: () => true, logic },
            context,
          ),
        );
        expect(refiled).toEqual([]);
      });

      then('it rethrows the very same error', async () => {
        const { context } = genFakeSetter({ faults: false });
        const error = await getError(
          withBrainAuthSlotTokenRefiledOnAbort(
            { slot, isHeldByNewHolder: () => true, logic },
            context,
          ),
        );
        expect(error).toBe(abort);
      });
    });
  });
});
