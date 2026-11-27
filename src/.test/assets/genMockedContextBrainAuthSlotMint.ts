/**
 * .what = a fake keyrack slot and a fake token endpoint, where each token mints once
 * .why = the slot mint and the slot rotate suites race readers and fault parks with no real
 *   keyrack or network
 */
export const genMockedContextBrainAuthSlotMint = (input: {
  slot:
    | { status: 'granted'; token: string }
    | { status: 'absent' | 'locked'; fix: string | null };
  tokensLive: string[];
  slotAfterRereads: string[];
  mintStatusOther?: 'rate-limited';
  parkFaults?: number;
}) => {
  // deliberate mutation, in this fake only: each array and set below records or spends state
  const parked: string[] = [];
  const parkTries: string[] = [];
  const minted: string[] = [];
  const sleeps: number[] = [];
  const rereadsLeft = [...input.slotAfterRereads];
  const tokensLive = new Set(input.tokensLive);
  let isFirstRead = true; // deliberate mutation: the fake slot's read cursor
  const context = {
    getSlotToken: async () => {
      if (isFirstRead) {
        isFirstRead = false;
        return input.slot;
      }
      const next = rereadsLeft.shift();
      if (next) return { status: 'granted' as const, token: next };
      return input.slot;
    },
    mint: async ({ refreshToken }: { refreshToken: string }) => {
      minted.push(refreshToken); // deliberate mutation: the fake endpoint's record of each mint
      if (input.mintStatusOther) return { status: input.mintStatusOther };
      if (!tokensLive.has(refreshToken)) return { status: 'dead' as const };
      tokensLive.delete(refreshToken); // deliberate mutation: a token mints once
      return {
        status: 'ok' as const,
        accessToken: `access-of-${refreshToken}`,
        refreshToken: `${refreshToken}-next`,
        expiresAt: 1,
        scopes: [],
      };
    },
    setSlotToken: async ({ token }: { token: string }) => {
      parkTries.push(token); // deliberate mutation: the fake's record of each park try
      if (parkTries.length <= (input.parkFaults ?? 0))
        throw new Error('keyrack hiccup');
      parked.push(token); // deliberate mutation: the fake slot's record of each park that landed
    },
    sleep: async ({ ms }: { ms: number }) => {
      sleeps.push(ms); // deliberate mutation: the fake clock's record of each wait
    },
  };
  return { context, parked, parkTries, minted, sleeps };
};
