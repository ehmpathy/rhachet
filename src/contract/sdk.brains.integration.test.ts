import { ConstraintError } from 'helpful-errors';
import { given, then, useThen, when } from 'test-fns';

// import via the PUBLIC contract surface (the `rhachet/brain` subpath source), not the
// domain-operations path — this proves the exported symbol is wired and that a real
// consumer's journey holds through the contract, not just the internal function
import { getSdkCredsFromBrainSupplies } from '@src/contract/sdk.brains';
import { keyrack } from '@src/contract/sdk.keyrack';
import { relockKeyrack } from '@src/domain.operations/keyrack/session/relockKeyrack';

/**
 * .what = contract-level test for the brain creds sdk export (`rhachet/brain`)
 * .why = getSdkCredsFromBrainSupplies is a public contract export; this proves the exported
 *        symbol works and the hero journey — a brain supplier configured with
 *        `{ keyrack: { owner, env } }`, key locked, call succeeds because auto-unlock ran —
 *        holds when a consumer imports it from the contract surface
 */
describe('getSdkCredsFromBrainSupplies (contract).integration', () => {
  const owner = 'ehmpathy';
  const env = 'test';
  const key = 'XAI_API_KEY';
  const slug = 'ehmpathy.test.XAI_API_KEY';

  /**
   * .what = fail fast (caller-fix) if the key is not granted on this host
   * .why = an absent host setup is a caller constraint — throw loud with an unlock hint.
   *        verifies via the lower-level `keyrack.get` primitive, not the export under test
   */
  const assertKeyGranted = async (keySlug: string): Promise<void> => {
    const granted = await keyrack
      .get({ for: { key: keySlug }, env, owner })
      .then(({ attempt }) => attempt.status === 'granted')
      .catch(() => false);
    if (!granted)
      throw new ConstraintError(
        `keyrack not set up for ${keySlug} on this host`,
        { hint: 'run: rhx keyrack unlock --owner ehmpathy --env test' },
      );
  };

  given('[case1] a brain supplier configured with keyrack creds', () => {
    when(
      '[t0] the requested key is locked, then creds are fetched via the sdk export',
      () => {
        const secrets = useThen(
          'it auto-unlocks the locked key and returns the secret',
          async () => {
            // fail fast (caller-fix) if the key is not granted on this host
            await assertKeyGranted(slug);

            // force a locked state: purge the key from the daemon
            await relockKeyrack({ owner, slugs: [slug] });

            // the public sdk export should notice locked, unlock, and grant — no manual ritual
            return getSdkCredsFromBrainSupplies({
              creds: { keyrack: { owner, env } },
              keys: [key] as const,
            });
          },
        );

        then('the secret is present and non-empty', () => {
          expect(secrets[key]).toBeDefined();
          expect(typeof secrets[key]).toEqual('string');
          expect(secrets[key]!.length).toBeGreaterThan(10);
        });

        then('only the requested key is returned', () => {
          expect(Object.keys(secrets)).toEqual([key]);
        });

        then('result structure matches snapshot', () => {
          // snapshot keys only, not secret values
          expect({ keys: Object.keys(secrets).sort() }).toMatchSnapshot();
        });
      },
    );
  });
});
