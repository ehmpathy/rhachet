import { ConstraintError } from 'helpful-errors';
import { given, then, useThen, when } from 'test-fns';

import { keyrack } from '@src/contract/sdk.keyrack';

import { relockKeyrack } from '../session/relockKeyrack';
import { getKeyrackKeySecrets } from './getKeyrackKeySecrets';

/**
 * .what = integration test for the secrets projection over the get-or-unlock core
 * .why = proves a locked key is auto-unlocked then re-got (with.unlock:true), that a locked key
 *        with unlock disabled fails as a caller constraint, and that absent keys fail as
 *        caller-fix constraints (not server malfunctions)
 */
describe('getKeyrackKeySecrets.integration', () => {
  const owner = 'ehmpathy';
  const env = 'test';
  const key = 'XAI_API_KEY';
  const slug = 'ehmpathy.test.XAI_API_KEY';

  /**
   * .what = fail fast (caller-fix) if the given key is not granted on this host
   * .why = an absent host setup is a caller constraint — throw loud with an unlock hint,
   *        not a silent skip. verifies via the lower-level `keyrack.get` primitive rather
   *        than `getKeyrackKeySecrets` (the function under test) so a bug in the function
   *        cannot masquerade as an un-set-up host
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

  given('[case1] a key that was never configured (absent)', () => {
    when('[t0] getKeyrackKeySecrets is called for it', () => {
      then(
        'it throws a ConstraintError — caller must act (absent or blocked)',
        async () => {
          // capture the error directly (not via a useThen proxy, which breaks instanceof)
          const error = await getKeyrackKeySecrets({
            for: { keys: ['NONEXISTENT_KEY_FOR_TEST'] },
            with: { unlock: true },
            owner,
            env,
          }).catch((caught) => caught);

          // absent key is caller-fix, not a server malfunction
          expect(error).toBeInstanceOf(ConstraintError);
          expect(error.code.exit).toEqual(2);
          expect(error.message).toContain('NONEXISTENT_KEY_FOR_TEST');

          // the failed attempt carries the specific key + status
          expect(error.metadata.attempts[0].key).toEqual(
            'NONEXISTENT_KEY_FOR_TEST',
          );
          expect(error.metadata.attempts[0].status).toEqual('absent');

          // snapshot the error shape for regression detection (no secret values present)
          expect({
            message: error.message,
            metadata: error.metadata,
          }).toMatchSnapshot();
        },
      );
    });
  });

  given('[case2] a configured key that is currently locked', () => {
    when('[t0] the key is relocked, then requested with unlock enabled', () => {
      const secrets = useThen(
        'it auto-unlocks and returns the secret',
        async () => {
          // fail fast (caller-fix) if the key is not granted on this host
          await assertKeyGranted(slug);

          // force a locked state: purge the key from the daemon
          await relockKeyrack({ owner, slugs: [slug] });

          // get-or-unlock should notice it is locked, unlock it, and grant it
          return getKeyrackKeySecrets({
            for: { keys: [key] },
            with: { unlock: true },
            owner,
            env,
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
    });
  });

  given(
    '[case3] multiple keys with mixed statuses (one granted, one locked)',
    () => {
      // two real keys configured for env=test on this host
      const keyA = 'XAI_API_KEY';
      const keyB = 'OPENAI_API_KEY';
      const slugA = 'ehmpathy.test.XAI_API_KEY';
      const slugB = 'ehmpathy.test.OPENAI_API_KEY';

      when(
        '[t0] only one of the two keys is relocked, then both requested',
        () => {
          const secrets = useThen(
            'it grants the still-unlocked key and auto-unlocks the locked one',
            async () => {
              // fail fast (caller-fix) if either key is not granted on this host
              await assertKeyGranted(slugA);
              await assertKeyGranted(slugB);

              // relock only keyB — keyA stays granted, keyB becomes locked
              await relockKeyrack({ owner, slugs: [slugB] });

              // get-or-unlock should grant keyA directly and auto-unlock keyB
              return getKeyrackKeySecrets({
                for: { keys: [keyA, keyB] },
                with: { unlock: true },
                owner,
                env,
              });
            },
          );

          then('both secrets are present and non-empty', () => {
            expect(secrets[keyA]!.length).toBeGreaterThan(10);
            expect(secrets[keyB]!.length).toBeGreaterThan(10);
          });

          then('exactly the two requested keys are returned', () => {
            expect(Object.keys(secrets).sort()).toEqual([keyA, keyB].sort());
          });

          then('result structure matches snapshot', () => {
            // snapshot keys only, not secret values
            expect({ keys: Object.keys(secrets).sort() }).toMatchSnapshot();
          });
        },
      );
    },
  );

  given('[case4] an ungettable key with unlock disabled', () => {
    when(
      '[t0] the key (no live source) is requested with with.unlock=false',
      () => {
        then(
          'it throws a ConstraintError instead of an unlock (caller must act)',
          async () => {
            // fail fast (caller-fix) if the key is not granted on this host
            await assertKeyGranted(slug);

            // remove the env-var source and purge the daemon so the key is genuinely
            // ungettable (the harness sources keys into env; this key has no local vault
            // copy on this host, so it lands as `absent` rather than `locked`)
            const envBefore = process.env[key];
            delete process.env[key];
            try {
              await relockKeyrack({ owner, slugs: [slug] });

              // unlock disabled → an ungettable key fails as a caller constraint, no unlock
              const error = await getKeyrackKeySecrets({
                for: { keys: [key] },
                with: { unlock: false },
                owner,
                env,
              }).catch((caught) => caught);

              expect(error).toBeInstanceOf(ConstraintError);
              expect(error.code.exit).toEqual(2);
              expect(error.message).toContain(key);
              expect(error.metadata.attempts[0].status).not.toEqual('granted');
            } finally {
              // restore the env-var so later tests/files still find the key granted
              if (envBefore !== undefined) process.env[key] = envBefore;
            }
          },
        );
      },
    );
  });
});
