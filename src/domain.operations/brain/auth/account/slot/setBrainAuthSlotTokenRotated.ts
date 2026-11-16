import { MalfunctionError } from 'helpful-errors';

import { asBrainAuthSetHint } from '@src/domain.operations/brain/auth/account/asBrainAuthSetHint';
import { getOneClaudeAccessMinted } from '@src/domain.operations/brain/auth/account/claude/getOneClaudeAccessMinted';

import { BRAIN_AUTH_SLOT_MINT_PACE } from './brainAuthSlotMintPace';
import { getOneBrainAuthSlotAccessMinted } from './getOneBrainAuthSlotAccessMinted';
import { getOneBrainAuthSlotToken } from './getOneBrainAuthSlotToken';
import { setBrainAuthSlotToken } from './setBrainAuthSlotToken';

/**
 * .what = mint one parked account, and park its rotated refresh token back in the keyrack
 * .why = `get` and `set` begin here: a mint spends the parked token, so its successor must land
 *   in the keyrack before aught else, or the account is stranded (case=9)
 * .note = 🔴 the park runs FIRST, before the caller sees the access token: the old token is spent
 *   the moment the mint succeeds, so a fault after it must not lose the new one. a park that
 *   faults is retried; one that never lands fails loud with the fix, never silent
 * .note = returns the mint's result, so the caller reads usage with the access token
 */
export const setBrainAuthSlotTokenRotated = async (
  input: { owner: string | null; email: string },
  context: {
    getSlotToken: typeof getOneBrainAuthSlotToken;
    mint: typeof getOneClaudeAccessMinted;
    setSlotToken: typeof setBrainAuthSlotToken;
    sleep: (input: { ms: number }) => Promise<void>;
  } = {
    getSlotToken: getOneBrainAuthSlotToken,
    mint: getOneClaudeAccessMinted,
    setSlotToken: setBrainAuthSlotToken,
    sleep: ({ ms }) => new Promise<void>((done) => setTimeout(done, ms)),
  },
): ReturnType<typeof getOneBrainAuthSlotAccessMinted> => {
  // mint the parked token
  const minted = await getOneBrainAuthSlotAccessMinted(input, context);
  if (minted.status !== 'ok') return minted;

  // park the rotated refresh token before aught else
  await setRotatedTokenParked(
    {
      owner: input.owner,
      email: input.email,
      token: minted.refreshToken,
      triesLeft: BRAIN_AUTH_SLOT_MINT_PACE.parkTries,
    },
    context,
  );
  return minted;
};

/**
 * .what = write the rotated token to its slot; retry a fault, then fail loud with the fix
 * .why = the rotated token is the account's only live copy once the mint lands, so one keyrack
 *   hiccup must not strand it, and a park that never lands must say so, never return as ok
 */
const setRotatedTokenParked = async (
  input: {
    owner: string | null;
    email: string;
    token: string;
    triesLeft: number;
  },
  context: {
    setSlotToken: typeof setBrainAuthSlotToken;
    sleep: (input: { ms: number }) => Promise<void>;
  },
): Promise<void> => {
  const slot = { owner: input.owner, email: input.email, token: input.token };
  await context.setSlotToken(slot).catch(async (fault: unknown) => {
    // retry while tries are left; the write is idempotent
    if (input.triesLeft > 1) {
      await context.sleep({ ms: BRAIN_AUTH_SLOT_MINT_PACE.parkGapMs });
      return setRotatedTokenParked(
        { ...input, triesLeft: input.triesLeft - 1 },
        context,
      );
    }

    // every try faulted: the account's live login exists only in this process now
    throw new MalfunctionError(
      'the rotated login could not be parked; the account may be stranded',
      {
        email: input.email,
        tries: BRAIN_AUTH_SLOT_MINT_PACE.parkTries,
        hint: asBrainAuthSetHint({ email: input.email }),
        cause: fault instanceof Error ? fault : undefined,
      },
    );
  });
};
