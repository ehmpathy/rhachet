import { MalfunctionError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { genMockedContextBrainAuthSlotMint } from '@src/.test/assets/genMockedContextBrainAuthSlotMint';

import { BRAIN_AUTH_SLOT_MINT_PACE } from './brainAuthSlotMintPace';
import { setBrainAuthSlotTokenRotated } from './setBrainAuthSlotTokenRotated';

const input = { owner: null, email: 'a@example.com' };

describe('setBrainAuthSlotTokenRotated', () => {
  given('[case1] a parked token that mints', () => {
    when('[t0] the slot is rotated', () => {
      then(
        'it returns the access token, and parks the rotated one first',
        async () => {
          const fakes = genMockedContextBrainAuthSlotMint({
            slot: { status: 'granted', token: 't1' },
            tokensLive: ['t1'],
            slotAfterRereads: [],
          });
          const result = await setBrainAuthSlotTokenRotated(
            input,
            fakes.context,
          );
          expect(result.status).toEqual('ok');
          expect(fakes.parked).toEqual(['t1-next']);
          expect(fakes.sleeps).toEqual([]);
        },
      );
    });
  });

  given(
    '[case2] a peer spent the token first, and parked its successor',
    () => {
      when('[t0] the slot is rotated', () => {
        then('it parks the successor of the successor', async () => {
          const fakes = genMockedContextBrainAuthSlotMint({
            slot: { status: 'granted', token: 't1' },
            tokensLive: ['t2'],
            slotAfterRereads: ['t2'],
          });
          const result = await setBrainAuthSlotTokenRotated(
            input,
            fakes.context,
          );
          expect(result.status).toEqual('ok');
          expect(fakes.minted).toEqual(['t1', 't2']);
          expect(fakes.parked).toEqual(['t2-next']);
        });
      });
    },
  );

  given('[case3] a mint that does not land', () => {
    when('[t0] the token is truly dead', () => {
      then('it returns dead, and parks naught', async () => {
        const fakes = genMockedContextBrainAuthSlotMint({
          slot: { status: 'granted', token: 't1' },
          tokensLive: [],
          slotAfterRereads: [],
        });
        const result = await setBrainAuthSlotTokenRotated(input, fakes.context);
        expect(result.status).toEqual('dead');
        expect(fakes.parkTries).toEqual([]);
      });
    });
    when('[t1] a peer rewrites the slot without pause', () => {
      then('it returns unreadable, and parks naught', async () => {
        const fakes = genMockedContextBrainAuthSlotMint({
          slot: { status: 'granted', token: 't1' },
          tokensLive: [],
          slotAfterRereads: Array.from(
            { length: 10 },
            (_, index) => `t${index + 2}`,
          ),
        });
        const result = await setBrainAuthSlotTokenRotated(input, fakes.context);
        expect(result.status).toEqual('unreadable');
        expect(fakes.parkTries).toEqual([]);
      });
    });
  });

  given('[case4] the park of the rotated token faults', () => {
    when('[t0] it faults once, then lands', () => {
      then('it retries after a wait, and returns ok', async () => {
        const fakes = genMockedContextBrainAuthSlotMint({
          slot: { status: 'granted', token: 't1' },
          tokensLive: ['t1'],
          slotAfterRereads: [],
          parkFaults: 1,
        });
        const result = await setBrainAuthSlotTokenRotated(input, fakes.context);
        expect(result.status).toEqual('ok');
        expect(fakes.parkTries).toEqual(['t1-next', 't1-next']);
        expect(fakes.parked).toEqual(['t1-next']);
        expect(fakes.sleeps).toEqual([BRAIN_AUTH_SLOT_MINT_PACE.parkGapMs]);
      });
    });
    when('[t1] it faults on every try', () => {
      then(
        'it fails loud as a malfunction that names the account and the fix',
        async () => {
          const fakes = genMockedContextBrainAuthSlotMint({
            slot: { status: 'granted', token: 't1' },
            tokensLive: ['t1'],
            slotAfterRereads: [],
            parkFaults: BRAIN_AUTH_SLOT_MINT_PACE.parkTries,
          });
          const error = await getError(
            setBrainAuthSlotTokenRotated(input, fakes.context),
          );
          expect(error).toBeInstanceOf(MalfunctionError);
          expect(error.message).toContain('could not be parked');
          expect(error.message).toContain('rhx brains auth set --brain claude');
          expect(fakes.parkTries).toHaveLength(
            BRAIN_AUTH_SLOT_MINT_PACE.parkTries,
          );
          expect(fakes.parked).toEqual([]);
        },
      );
    });
  });
});
