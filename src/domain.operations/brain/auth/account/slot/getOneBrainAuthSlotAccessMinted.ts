import { getOneClaudeAccessMinted } from '@src/domain.operations/brain/auth/account/claude/getOneClaudeAccessMinted';

import { getOneBrainAuthSlotMintPastRacers } from './getOneBrainAuthSlotMintPastRacers';
import { getOneBrainAuthSlotToken } from './getOneBrainAuthSlotToken';

/**
 * .what = a fresh access token for one parked account, and the rotated refresh token beside it
 * .why = `use` begins here: the rotated token goes to the scope, never back to the keyrack, so no
 *   instant exists where two places hold it and a peer `get` could spend the token a grove now
 *   runs on. the caller refiles it on any abort
 * .note = this op writes no keyrack. a caller that must park the rotated token back (a `get`, a
 *   `set`) calls `setBrainAuthSlotTokenRotated`, whose name says it writes
 * .note = it survives a peer `rhx` that spent the same parked token a moment before (the racer
 *   cell of `get`)
 * .note = deps are injectable, so a unit test can race two readers with fakes and no real keyrack
 *   or network
 */
export const getOneBrainAuthSlotAccessMinted = async (
  input: { owner: string | null; email: string },
  context: {
    getSlotToken: typeof getOneBrainAuthSlotToken;
    mint: typeof getOneClaudeAccessMinted;
    sleep: (input: { ms: number }) => Promise<void>;
  } = {
    getSlotToken: getOneBrainAuthSlotToken,
    mint: getOneClaudeAccessMinted,
    sleep: ({ ms }) => new Promise<void>((done) => setTimeout(done, ms)),
  },
): Promise<
  | {
      status: 'ok';
      accessToken: string;
      refreshToken: string;
      expiresAt: number;
      scopes: string[];
    }
  | { status: 'absent' }
  | { status: 'locked' | 'blocked'; fix: string | null }
  | { status: 'dead' | 'rate-limited' | 'unreadable' }
> => {
  // read the parked token
  const slot = await context.getSlotToken({
    owner: input.owner,
    email: input.email,
  });
  if (slot.status === 'absent') return { status: 'absent' };
  if (slot.status !== 'granted') return { status: slot.status, fix: slot.fix };

  // mint; a refusal as dead may be a peer that spent this token first
  return getOneBrainAuthSlotMintPastRacers(
    { owner: input.owner, email: input.email, token: slot.token },
    context,
  );
};
