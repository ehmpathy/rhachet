import { given, then, when } from 'test-fns';

import { genMockedContextBrainAuthSlotMint } from '@src/.test/assets/genMockedContextBrainAuthSlotMint';

import { BRAIN_AUTH_SLOT_MINT_PACE } from './brainAuthSlotMintPace';
import { getOneBrainAuthSlotAccessMinted } from './getOneBrainAuthSlotAccessMinted';

const input = { owner: null, email: 'a@example.com' };

describe('getOneBrainAuthSlotAccessMinted', () => {
  given('[case1] a parked token that mints', () => {
    when('[t0] the slot is minted', () => {
      then('it returns the rotated token, and writes no keyrack', async () => {
        const fakes = genMockedContextBrainAuthSlotMint({
          slot: { status: 'granted', token: 't1' },
          tokensLive: ['t1'],
          slotAfterRereads: [],
        });
        const result = await getOneBrainAuthSlotAccessMinted(
          input,
          fakes.context,
        );
        expect(result.status === 'ok' && result.refreshToken).toEqual(
          't1-next',
        );
        expect(result.status === 'ok' && result.accessToken).toEqual(
          'access-of-t1',
        );
        expect(fakes.parkTries).toEqual([]);
        expect(fakes.sleeps).toEqual([]);
      });
    });
  });

  given(
    '[case2] a peer spent the token first, and parked its successor',
    () => {
      when('[t0] the slot is minted', () => {
        then(
          'it re-reads the slot, mints the successor, and is not dead',
          async () => {
            const fakes = genMockedContextBrainAuthSlotMint({
              slot: { status: 'granted', token: 't1' },
              tokensLive: ['t2'],
              slotAfterRereads: ['t2'],
            });
            const result = await getOneBrainAuthSlotAccessMinted(
              input,
              fakes.context,
            );
            expect(result.status).toEqual('ok');
            expect(fakes.minted).toEqual(['t1', 't2']);
            expect(fakes.parkTries).toEqual([]);
          },
        );
      });
    },
  );

  given('[case3] a token that is truly dead, the slot never moves', () => {
    when('[t0] the slot is minted', () => {
      then('it reads dead after each re-read', async () => {
        const fakes = genMockedContextBrainAuthSlotMint({
          slot: { status: 'granted', token: 't1' },
          tokensLive: [],
          slotAfterRereads: [],
        });
        const result = await getOneBrainAuthSlotAccessMinted(
          input,
          fakes.context,
        );
        expect(result.status).toEqual('dead');
        expect(fakes.sleeps).toEqual(
          Array.from({ length: BRAIN_AUTH_SLOT_MINT_PACE.rereads }, () => 500),
        );
      });
    });
  });

  given('[case3b] a peer rewrites the slot without pause', () => {
    when('[t0] each successor is already spent when it is minted', () => {
      then(
        'it chases a bounded count of successors, then reads unreadable, never dead',
        async () => {
          const fakes = genMockedContextBrainAuthSlotMint({
            slot: { status: 'granted', token: 't1' },
            tokensLive: [],
            slotAfterRereads: Array.from(
              { length: 10 },
              (_, index) => `t${index + 2}`,
            ),
          });
          const result = await getOneBrainAuthSlotAccessMinted(
            input,
            fakes.context,
          );
          expect(result.status).toEqual('unreadable');
          expect(fakes.minted).toHaveLength(
            BRAIN_AUTH_SLOT_MINT_PACE.racerHops + 1,
          );
        },
      );
    });
  });

  given('[case4] the endpoint rate-limits', () => {
    when('[t0] the slot is minted', () => {
      then('it returns rate-limited at once, with no re-read', async () => {
        const fakes = genMockedContextBrainAuthSlotMint({
          slot: { status: 'granted', token: 't1' },
          tokensLive: ['t1'],
          slotAfterRereads: [],
          mintStatusOther: 'rate-limited',
        });
        const result = await getOneBrainAuthSlotAccessMinted(
          input,
          fakes.context,
        );
        expect(result.status).toEqual('rate-limited');
        expect(fakes.sleeps).toEqual([]);
      });
    });
  });

  given('[case5] no parked token, or a locked keyrack', () => {
    when('[t0] the slot is absent', () => {
      then('it returns absent and mints naught', async () => {
        const fakes = genMockedContextBrainAuthSlotMint({
          slot: { status: 'absent', fix: null },
          tokensLive: [],
          slotAfterRereads: [],
        });
        const result = await getOneBrainAuthSlotAccessMinted(
          input,
          fakes.context,
        );
        expect(result).toEqual({ status: 'absent' });
        expect(fakes.minted).toEqual([]);
      });
    });
    when('[t1] the keyrack is locked', () => {
      then('it returns locked with the fix', async () => {
        const fakes = genMockedContextBrainAuthSlotMint({
          slot: { status: 'locked', fix: 'rhx keyrack unlock' },
          tokensLive: [],
          slotAfterRereads: [],
        });
        const result = await getOneBrainAuthSlotAccessMinted(
          input,
          fakes.context,
        );
        expect(result).toEqual({ status: 'locked', fix: 'rhx keyrack unlock' });
      });
    });
  });
});
