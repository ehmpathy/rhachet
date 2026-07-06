import { ConstraintError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { relockKeyrack } from '@src/domain.operations/keyrack/session/relockKeyrack';

import { keyrack } from './sdk.keyrack';

/**
 * .what = integration test for the sdk `keyrack.get({ with: { unlock } })` contract
 * .why = proves the new opt-in unlock flag routes through the get-or-unlock core: a locked key
 *        auto-unlocks when `with.unlock` is set, and stays locked (pure get) when it is not
 */
describe('keyrack.get unlock (sdk).integration', () => {
  const owner = 'ehmpathy';
  const env = 'test';
  const key = 'XAI_API_KEY';
  const slug = 'ehmpathy.test.XAI_API_KEY';

  /**
   * .what = fail fast (caller-fix) if the key is not granted on this host
   * .why = an absent host setup is a caller constraint — throw loud, not a silent skip
   */
  const assertKeyGranted = async (): Promise<void> => {
    const granted = await keyrack
      .get({ for: { key: slug }, env, owner })
      .then(({ attempt }) => attempt.status === 'granted')
      .catch(() => false);
    if (!granted)
      throw new ConstraintError(
        'keyrack not set up for XAI_API_KEY on this host',
        {
          hint: 'run: rhx keyrack unlock --owner ehmpathy --env test',
        },
      );
  };

  given('[case1] a locked key requested with with.unlock=true', () => {
    when('[t0] keyrack.get is called after a relock', () => {
      then(
        'it auto-unlocks and returns a granted attempt + stdout',
        async () => {
          await assertKeyGranted();
          await relockKeyrack({ owner, slugs: [slug] });

          const { attempt, emit } = await keyrack.get({
            for: { key },
            with: { unlock: true },
            env,
            owner,
          });

          expect(attempt.status).toEqual('granted');
          // the treestruct stdout projection is still emitted, names the key, holds no secret
          expect(emit.stdout).toContain(key);
        },
      );
    });
  });

  given('[case2] an ungettable key requested without an unlock opt-in', () => {
    when(
      '[t0] keyrack.get is called after removing the live source, no with',
      () => {
        then('it stays not-granted — a pure get, no unlock', async () => {
          await assertKeyGranted();

          // remove the env-var source and purge the daemon so the key is genuinely
          // ungettable (the harness sources keys into env; this key has no local vault
          // copy on this host, so it lands as `absent` rather than `locked`)
          const envBefore = process.env[key];
          delete process.env[key];
          try {
            await relockKeyrack({ owner, slugs: [slug] });

            const { attempt } = await keyrack.get({ for: { key }, env, owner });
            // no unlock opt-in → the ungettable key is not advanced to granted
            expect(attempt.status).not.toEqual('granted');
          } finally {
            // restore the env-var so later tests/files still find the key granted
            if (envBefore !== undefined) process.env[key] = envBefore;
          }
        });
      },
    );
  });
});
