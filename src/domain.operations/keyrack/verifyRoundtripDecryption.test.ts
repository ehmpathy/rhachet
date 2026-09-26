import { getError, given, then, useBeforeAll, when } from 'test-fns';

import {
  type ContextKeyrack,
  genContextKeyrack,
} from '@src/domain.operations/keyrack/genContextKeyrack';
import { verifyRoundtripDecryption } from '@src/domain.operations/keyrack/verifyRoundtripDecryption';
import {
  encryptToRecipients,
  generateAgeKeyPair,
} from '@src/infra/ssh/ageRecipientCrypto';

/**
 * .what = build a keyrack context whose identity pool is exactly the given
 *         age identities (discovered), with no manifest/prescribed identity
 * .why = verifyRoundtripDecryption reads only context.identity to build its pool;
 *        a real context (sync object build) with identity overridden lets each
 *        case pin the pool without a real ssh key or filesystem
 */
const genContextWithIdentities = (identities: string[]): ContextKeyrack => {
  const base = genContextKeyrack({ owner: null });
  return {
    ...base,
    identity: {
      getOne: async () => null,
      getAll: { discovered: async () => identities, prescribed: [] },
    },
  };
};

describe('verifyRoundtripDecryption', () => {
  given('[case1] a ciphertext whose recipient identity is in the pool', () => {
    const scene = useBeforeAll(async () => {
      const { identity, recipient } = await generateAgeKeyPair();
      const plaintext = 'super-secret-value';
      const ciphertext = await encryptToRecipients({
        plaintext,
        recipients: [
          {
            mech: 'age',
            pubkey: recipient,
            label: 'test',
            addedAt: '2026-07-24T00:00:00Z',
          },
        ],
      });
      return { identity, plaintext, ciphertext };
    });

    when('[t0] verify runs with the correct identity', () => {
      then('it verifies true', async () => {
        const { verified } = await verifyRoundtripDecryption(
          {
            expected: {
              ciphertext: scene.ciphertext,
              plaintext: scene.plaintext,
            },
            owner: null,
          },
          genContextWithIdentities([scene.identity]),
        );
        expect(verified).toEqual(true);
      });
    });
  });

  given(
    '[case2] a ciphertext whose recipient identity is NOT in the pool',
    () => {
      const scene = useBeforeAll(async () => {
        const target = await generateAgeKeyPair();
        const other = await generateAgeKeyPair();
        const plaintext = 'super-secret-value';
        const ciphertext = await encryptToRecipients({
          plaintext,
          recipients: [
            {
              mech: 'age',
              pubkey: target.recipient,
              label: 'test',
              addedAt: '2026-07-24T00:00:00Z',
            },
          ],
        });
        return { otherIdentity: other.identity, plaintext, ciphertext };
      });

      when('[t0] verify runs with only a wrong identity', () => {
        then(
          'the EXPECTED wrong-identity failure is swallowed → verified false',
          async () => {
            const { verified } = await verifyRoundtripDecryption(
              {
                expected: {
                  ciphertext: scene.ciphertext,
                  plaintext: scene.plaintext,
                },
                owner: null,
              },
              genContextWithIdentities([scene.otherIdentity]),
            );
            expect(verified).toEqual(false);
          },
        );
      });
    },
  );

  given(
    '[case3] a malformed ciphertext — a genuine fault, not a wrong identity',
    () => {
      const scene = useBeforeAll(async () => {
        const { identity } = await generateAgeKeyPair();
        return { identity };
      });

      when('[t0] verify runs against unparseable ciphertext', () => {
        then(
          'the genuine fault fails loud, never a masked verified false (rule.forbid.failhide)',
          async () => {
            const error = await getError(
              verifyRoundtripDecryption(
                {
                  expected: {
                    ciphertext: 'this-is-not-valid-age-armor',
                    plaintext: 'x',
                  },
                  owner: null,
                },
                genContextWithIdentities([scene.identity]),
              ),
            );
            // it surfaced rather than a swallow → the allowlist rethrew it
            expect(error).toBeInstanceOf(Error);
            // and it is NOT the one EXPECTED wrong-identity message the loop tolerates
            expect(error.message).not.toContain(
              "no identity matched any of the file's recipients",
            );
          },
        );
      });
    },
  );
});
