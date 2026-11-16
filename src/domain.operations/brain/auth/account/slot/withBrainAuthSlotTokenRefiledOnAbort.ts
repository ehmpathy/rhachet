import { MalfunctionError } from 'helpful-errors';

import { asBrainAuthSetHint } from '../asBrainAuthSetHint';
import { setBrainAuthSlotToken } from './setBrainAuthSlotToken';

/**
 * .what = run a logic; on any throw, refile an account's rotated token to its slot, then rethrow
 * .why = a mint spends the slot's token, so the rotated one in memory is the account's only live
 *   copy until its new holder has it; an abort must not strand the account (case=8 [t1])
 * .note = never swallows: the abort error is rethrown as is after the refile. if the refile fails
 *   too, the abort error rides as the `cause` of a malfunction that names the refile fault and the fix
 * .note = `isHeldByNewHolder` is asked on abort: a logic that faults after its new holder took the
 *   token (e.g. a lock teardown after the install) must not refile it, or one single-use token
 *   would have two holders
 */
export const withBrainAuthSlotTokenRefiledOnAbort = async <T>(
  input: {
    slot: { owner: string | null; email: string; token: string };
    isHeldByNewHolder: () => boolean;
    logic: () => Promise<T>;
  },
  context: { setSlotToken: typeof setBrainAuthSlotToken } = {
    setSlotToken: setBrainAuthSlotToken,
  },
): Promise<T> => {
  try {
    return await input.logic();
  } catch (abort) {
    // the new holder already has the token: it has one holder, so naught to refile
    if (input.isHeldByNewHolder()) throw abort;

    // refile the rotated token; a refile fault must not hide the abort that caused it
    await context.setSlotToken(input.slot).catch((refileFault: unknown) => {
      throw new MalfunctionError(
        'the abort could not refile the rotated login; the account may be stranded',
        {
          email: input.slot.email,
          refileFault:
            refileFault instanceof Error
              ? refileFault.message
              : String(refileFault),
          hint: `rhx brains auth get --brain claude --account ${input.slot.email}; if it reads dead, ${asBrainAuthSetHint({ email: input.slot.email })}`,
          cause: abort instanceof Error ? abort : undefined,
        },
      );
    });
    throw abort;
  }
};
