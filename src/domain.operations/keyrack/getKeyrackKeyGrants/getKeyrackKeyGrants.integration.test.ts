import { ConstraintError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { keyrack } from '@src/contract/sdk.keyrack';

import { asKeyrackAttemptSlug } from '../asKeyrackAttemptSlug';
import { relockKeyrack } from '../session/relockKeyrack';
import { getKeyrackKeyGrants } from './getKeyrackKeyGrants';

/**
 * .what = integration test for the shared get-or-unlock core
 * .why = proves the core returns raw attempts (never throws on status), that unlock is a
 *        genuine opt-in (locked stays locked when unlock:false, becomes granted when true),
 *        and that both the keys and repo selectors route through the same resolution
 */
describe('getKeyrackKeyGrants.integration', () => {
  const owner = 'ehmpathy';
  const env = 'test';
  const key = 'XAI_API_KEY';
  const slug = 'ehmpathy.test.XAI_API_KEY';

  /**
   * .what = fail fast (caller-fix) if the given key is not granted on this host
   * .why = an absent host setup is a caller constraint — throw loud, not a silent skip; verifies
   *        via the lower-level `keyrack.get` primitive so a bug in the core cannot masquerade as
   *        an un-set-up host
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

  given('[case1] an ungettable key with unlock disabled', () => {
    when(
      '[t0] the key (no live source) is requested with with.unlock=false',
      () => {
        then(
          'the core surfaces it as not-granted — no unlock, no throw, no fabricated grant',
          async () => {
            await assertKeyGranted(slug);

            // remove the env-var source and purge the daemon so the key is genuinely
            // ungettable (the harness sources keys into env; this key has no local vault
            // copy on this host, so it lands as `absent` rather than `locked`)
            const envBefore = process.env[key];
            delete process.env[key];
            try {
              await relockKeyrack({ owner, slugs: [slug] });

              const attempts = await getKeyrackKeyGrants({
                for: { keys: [key] },
                with: { unlock: false },
                owner,
                env,
              });

              // unlock disabled → the ungettable key is not advanced to granted
              expect(attempts).toHaveLength(1);
              expect(attempts[0]!.status).not.toEqual('granted');
            } finally {
              // restore the env-var so later tests/files still find the key granted
              if (envBefore !== undefined) process.env[key] = envBefore;
            }
          },
        );
      },
    );
  });

  given('[case2] a key requested with unlock enabled', () => {
    when('[t0] the relocked key is requested with with.unlock=true', () => {
      then(
        'the core returns it granted (unlock opt-in yields a grant, no throw)',
        async () => {
          await assertKeyGranted(slug);
          await relockKeyrack({ owner, slugs: [slug] });

          const attempts = await getKeyrackKeyGrants({
            for: { keys: [key] },
            with: { unlock: true },
            owner,
            env,
          });

          expect(attempts).toHaveLength(1);
          expect(attempts[0]!.status).toEqual('granted');
        },
      );
    });
  });

  given('[case3] the repo selector', () => {
    when('[t0] all env keys are requested via for.repo', () => {
      then(
        'the core returns an attempt per manifest key, incl. the known key',
        async () => {
          await assertKeyGranted(slug);

          // repo selector with unlock disabled — pure get across the whole env manifest
          const attempts = await getKeyrackKeyGrants({
            for: { repo: true },
            with: { unlock: false },
            owner,
            env,
          });

          expect(attempts.length).toBeGreaterThan(0);
          const known = attempts.find(
            (attempt) => asKeyrackAttemptSlug({ attempt }) === slug,
          );
          expect(known).toBeDefined();
          expect(known!.status).toEqual('granted');
        },
      );
    });
  });
});
