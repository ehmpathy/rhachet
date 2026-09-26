import { getError, given, then, useBeforeAll, when } from 'test-fns';

import { getOneIdentityThatDecrypts } from '@src/domain.operations/keyrack/getOneIdentityThatDecrypts';
import {
  encryptToRecipients,
  generateAgeKeyPair,
} from '@src/infra/ssh/ageRecipientCrypto';

describe('getOneIdentityThatDecrypts', () => {
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

    when('[t0] the pool holds the correct identity', () => {
      then('it returns that identity and the recovered plaintext', async () => {
        const found = await getOneIdentityThatDecrypts({
          ciphertext: scene.ciphertext,
          pool: [scene.identity],
        });
        expect(found).not.toBeNull();
        expect(found?.identity).toEqual(scene.identity);
        expect(found?.plaintext).toEqual(scene.plaintext);
      });
    });
  });

  given(
    '[case2] a ciphertext whose recipient identity is NOT in the pool',
    () => {
      const scene = useBeforeAll(async () => {
        const target = await generateAgeKeyPair();
        const other = await generateAgeKeyPair();
        const ciphertext = await encryptToRecipients({
          plaintext: 'super-secret-value',
          recipients: [
            {
              mech: 'age',
              pubkey: target.recipient,
              label: 'test',
              addedAt: '2026-07-24T00:00:00Z',
            },
          ],
        });
        return { otherIdentity: other.identity, ciphertext };
      });

      when('[t0] the pool holds only a wrong identity', () => {
        then(
          'the EXPECTED wrong-identity failure is swallowed → null',
          async () => {
            const found = await getOneIdentityThatDecrypts({
              ciphertext: scene.ciphertext,
              pool: [scene.otherIdentity],
            });
            expect(found).toBeNull();
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

      when('[t0] the ciphertext is unparseable', () => {
        then(
          'the genuine fault fails loud, never a masked null (rule.forbid.failhide)',
          async () => {
            const error = await getError(
              getOneIdentityThatDecrypts({
                ciphertext: 'this-is-not-valid-age-armor',
                pool: [scene.identity],
              }),
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
