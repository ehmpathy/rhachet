import { MalfunctionError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { getAllAgeRecipientPairs } from './getAllAgeRecipientPairs';

// inject a fake per-key getter (dependency injection) so each case controls exactly what each ssh
// recipient converts to — this proves the filter-map-drop (only ssh recipients convert; a non-null
// age recipient pairs back to its original) plus that a rethrown crypto load is NOT swallowed by
// the shape, WITHOUT a jest.mock (rule.forbid.unit.remote-boundaries).
const genFakeGetOne =
  (
    byPubkey: Record<string, string | null>,
    throwFor?: { pubkey: string; error: Error },
  ) =>
  async (input: { pubkey: string }): Promise<string | null> => {
    if (throwFor && input.pubkey === throwFor.pubkey) throw throwFor.error;
    return input.pubkey in byPubkey ? byPubkey[input.pubkey]! : null;
  };

describe('getAllAgeRecipientPairs', () => {
  given(
    '[case1] a mix of ssh and non-ssh recipients, some convert and some miss',
    () => {
      when('[t0] getAllAgeRecipientPairs is called', () => {
        then(
          'it keeps only ssh recipients that convert, paired with origin',
          async () => {
            const pairs = await getAllAgeRecipientPairs(
              {
                recipients: [
                  { mech: 'ssh', pubkey: 'ssh-a' },
                  { mech: 'gpg', pubkey: 'gpg-x' }, // non-ssh — skipped, never converted
                  { mech: 'ssh', pubkey: 'ssh-b' }, // ssh but converts to null — dropped
                ],
              },
              {
                getOne: genFakeGetOne({
                  'ssh-a': 'age1a',
                  'ssh-b': null,
                }),
              },
            );
            expect(pairs).toEqual([
              {
                original: { mech: 'ssh', pubkey: 'ssh-a' },
                ageRecipient: 'age1a',
              },
            ]);
          },
        );
      });
    },
  );

  given('[case2] no recipients are supplied', () => {
    when('[t0] getAllAgeRecipientPairs is called', () => {
      then('it returns an empty array', async () => {
        const pairs = await getAllAgeRecipientPairs(
          { recipients: [] },
          { getOne: genFakeGetOne({}) },
        );
        expect(pairs).toEqual([]);
      });
    });
  });

  given(
    '[case3] one ssh pubkey throws a broken-crypto MalfunctionError',
    () => {
      when('[t0] getAllAgeRecipientPairs is called', () => {
        then(
          'it propagates the error — fails loud (e6), not a smaller set',
          async () => {
            await expect(
              getAllAgeRecipientPairs(
                { recipients: [{ mech: 'ssh', pubkey: 'ssh-a' }] },
                {
                  getOne: genFakeGetOne(
                    {},
                    {
                      pubkey: 'ssh-a',
                      error: new MalfunctionError(
                        'failed to load the crypto module',
                      ),
                    },
                  ),
                },
              ),
            ).rejects.toBeInstanceOf(MalfunctionError);
          },
        );
      });
    },
  );
});
