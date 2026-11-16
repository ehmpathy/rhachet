import type { getOneClaudeAccessMinted } from '@src/domain.operations/brain/auth/account/claude/getOneClaudeAccessMinted';

import { BRAIN_AUTH_SLOT_MINT_PACE } from './brainAuthSlotMintPace';
import type { getOneBrainAuthSlotToken } from './getOneBrainAuthSlotToken';

/**
 * .what = one entry per slot re-read a dead mint may spend
 * .why = a counted loop with no `let` (rule.require.immutable-vars)
 */
const REREAD_TURNS = Array.from(
  { length: BRAIN_AUTH_SLOT_MINT_PACE.rereads },
  (_, index) => index + 1,
);

type ContextMintPastRacers = {
  getSlotToken: typeof getOneBrainAuthSlotToken;
  mint: typeof getOneClaudeAccessMinted;
  sleep: (input: { ms: number }) => Promise<void>;
};

/**
 * .what = mint from a parked token; on `dead`, wait for a racer's successor in the slot and mint that
 * .why = a token one peer spent a moment ago reads dead to the next; only an unmoved slot proves it
 *   dead (the racer cell of `get`)
 * .note = no lockfile is held across the provider call; the re-read is the whole of the race guard
 * .note = at most `racerHops` successors are chased; a slot still in motion after them reads
 *   `unreadable` (a retry may help), never `dead`, since a newer token exists
 */
export const getOneBrainAuthSlotMintPastRacers = async (
  input: { owner: string | null; email: string; token: string },
  context: ContextMintPastRacers,
): ReturnType<typeof getOneClaudeAccessMinted> =>
  getOneMintPastRacersWithin(
    { ...input, hopsLeft: BRAIN_AUTH_SLOT_MINT_PACE.racerHops },
    context,
  );

/**
 * .what = one hop of the racer chase, with the hops left to spend
 * .why = the bound lives in the recursion's own input, so every path to a further hop spends one
 */
const getOneMintPastRacersWithin = async (
  input: {
    owner: string | null;
    email: string;
    token: string;
    hopsLeft: number;
  },
  context: ContextMintPastRacers,
): ReturnType<typeof getOneClaudeAccessMinted> => {
  // mint from the token in hand
  const minted = await context.mint({ refreshToken: input.token });
  if (minted.status !== 'dead') return minted;

  // re-read the slot, up to `rereads` times; a peer that won the race parks its successor within moments
  for (const _turn of REREAD_TURNS) {
    await context.sleep({ ms: BRAIN_AUTH_SLOT_MINT_PACE.rereadGapMs });
    const slot = await context.getSlotToken({
      owner: input.owner,
      email: input.email,
    });
    if (slot.status !== 'granted') return minted;
    if (slot.token === input.token) continue;

    // a successor landed; chase it while hops are left
    if (input.hopsLeft === 0) return { status: 'unreadable' };
    return getOneMintPastRacersWithin(
      { ...input, token: slot.token, hopsLeft: input.hopsLeft - 1 },
      context,
    );
  }

  // the slot never moved: the token is truly dead
  return minted;
};
