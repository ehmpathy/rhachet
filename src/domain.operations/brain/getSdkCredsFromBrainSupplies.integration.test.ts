import { ConstraintError } from 'helpful-errors';
import { given, then, useThen, when } from 'test-fns';

import { keyrack } from '@src/contract/sdk.keyrack';
import { relockKeyrack } from '@src/domain.operations/keyrack/session/relockKeyrack';

import { getSdkCredsFromBrainSupplies } from './getSdkCredsFromBrainSupplies';

/**
 * .what = fail fast (caller-fix) when keyrack is not set up for XAI_API_KEY on this host
 * .why = an absent host setup is a caller constraint, not a server malfunction — throw loud
 *        with an actionable unlock hint instead of a silent skip
 */
const assertKeyrackConfigured = async (): Promise<void> => {
  const granted = await keyrack
    .get({
      for: { key: 'ehmpathy.test.XAI_API_KEY' },
      env: 'test',
      owner: 'ehmpathy',
    })
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

describe('getSdkCredsFromBrainSupplies.integration', () => {
  given('[case1] getter mode', () => {
    when('[t0] creds is an async function', () => {
      const result = useThen('it returns the getter result', async () =>
        getSdkCredsFromBrainSupplies({
          creds: async () => ({
            EXAMPLE_API_KEY: 'test-key-from-getter',
            OTHER_KEY: 'other-value',
          }),
          keys: ['EXAMPLE_API_KEY', 'OTHER_KEY'],
        }),
      );

      then('all requested keys are present', () => {
        expect(result.EXAMPLE_API_KEY).toEqual('test-key-from-getter');
        expect(result.OTHER_KEY).toEqual('other-value');
      });

      then('result matches snapshot', () => {
        expect(result).toMatchSnapshot();
      });
    });

    when('[t1] getter rejects', () => {
      then('it throws BadRequestError with actionable context', async () => {
        const error = await getSdkCredsFromBrainSupplies({
          creds: async () => {
            throw new Error('vault connection failed');
          },
          keys: ['SOME_KEY'],
        }).catch((e) => e);

        // error is instance
        expect(error).toBeInstanceOf(Error);

        // message is actionable with original error and fix
        expect(error.message).toContain(
          'brain supplier credential getter failed',
        );
        expect(error.message).toContain('vault connection failed');
        expect(error.message).toContain('check your credential source');

        // metadata has context
        expect(error.metadata).toBeDefined();
        expect(error.metadata.fix).toContain('verify your credential getter');

        // snapshot for regression detection
        expect({
          message: error.message,
          metadata: error.metadata,
        }).toMatchSnapshot();
      });
    });
  });

  given('[case2] keyrack mode with real keys', () => {
    when('[t0] keyrack key exists', () => {
      const result = useThen('it retrieves the credential', async () => {
        // fail fast (caller-fix) if keyrack is not set up on this host
        await assertKeyrackConfigured();
        return getSdkCredsFromBrainSupplies({
          creds: { keyrack: { owner: 'ehmpathy', env: 'test' } },
          keys: ['XAI_API_KEY'] as const,
        });
      });

      then('key is present and non-empty', () => {
        expect(result.XAI_API_KEY).toBeDefined();
        expect(typeof result.XAI_API_KEY).toEqual('string');
        expect(result.XAI_API_KEY!.length).toBeGreaterThan(10);
      });

      then('result structure matches snapshot', () => {
        // snapshot keys only, not secret values
        expect({ keys: Object.keys(result).sort() }).toMatchSnapshot();
      });
    });

    when('[t1] a key that was never set', () => {
      then(
        'it throws ConstraintError — caller must act (absent or blocked)',
        async () => {
          // fail fast (caller-fix) if keyrack is not set up on this host
          await assertKeyrackConfigured();

          // capture the error directly (not via a useThen proxy, which breaks instanceof)
          const error = await getSdkCredsFromBrainSupplies({
            creds: { keyrack: { owner: 'ehmpathy', env: 'test' } },
            keys: ['NONEXISTENT_KEY_FOR_TEST'],
          }).catch((caught) => caught);

          // absent key is caller-fix, not a server malfunction
          expect(error).toBeInstanceOf(ConstraintError);
          expect(error.code.exit).toEqual(2);

          // message names the domain + the specific absent key
          expect(error.message).toContain('keyrack');
          expect(error.message).toContain('NONEXISTENT_KEY_FOR_TEST');

          // metadata carries the failed attempt with its specific key + status
          expect(error.metadata).toBeDefined();
          expect(error.metadata.attempts[0].key).toEqual(
            'NONEXISTENT_KEY_FOR_TEST',
          );
          expect(error.metadata.attempts[0].status).toEqual('absent');

          // snapshot the error shape for regression detection
          expect({
            message: error.message,
            metadata: error.metadata,
          }).toMatchSnapshot();
        },
      );
    });

    when(
      '[t2] a locked key is requested — auto-unlocks at brain surface',
      () => {
        const result = useThen(
          'it auto-unlocks the relocked key and returns the secret',
          async () => {
            // fail fast (caller-fix) if keyrack is not set up on this host
            await assertKeyrackConfigured();

            // force a locked state: purge the key from the daemon
            await relockKeyrack({
              owner: 'ehmpathy',
              slugs: ['ehmpathy.test.XAI_API_KEY'],
            });

            // the brain surface should notice locked, unlock, and grant
            return getSdkCredsFromBrainSupplies({
              creds: { keyrack: { owner: 'ehmpathy', env: 'test' } },
              keys: ['XAI_API_KEY'] as const,
            });
          },
        );

        then('the secret is present and non-empty', () => {
          expect(result.XAI_API_KEY).toBeDefined();
          expect(typeof result.XAI_API_KEY).toEqual('string');
          expect(result.XAI_API_KEY!.length).toBeGreaterThan(10);
        });

        then('result structure matches snapshot', () => {
          // snapshot keys only, not secret values
          expect({ keys: Object.keys(result).sort() }).toMatchSnapshot();
        });
      },
    );
  });

  given('[case3] invalid creds shape', () => {
    when('[t0] creds is neither function nor keyrack object', () => {
      then('it throws BadRequestError with actionable message', async () => {
        const error = await getSdkCredsFromBrainSupplies({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          creds: { invalid: 'shape' } as any,
          keys: ['SOME_KEY'],
        }).catch((e) => e);

        // error is instance
        expect(error).toBeInstanceOf(Error);

        // message is actionable with fix in message
        expect(error.message).toContain('invalid creds shape');
        expect(error.message).toContain('expected function or { keyrack');
        expect(error.message).toContain('pass creds as');

        // snapshot for regression detection
        expect({
          message: error.message,
          metadata: error.metadata,
        }).toMatchSnapshot();
      });
    });

    when('[t1] creds is null', () => {
      then('it throws BadRequestError with actionable message', async () => {
        const error = await getSdkCredsFromBrainSupplies({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          creds: null as any,
          keys: ['SOME_KEY'],
        }).catch((e) => e);

        // error is instance
        expect(error).toBeInstanceOf(Error);

        // message is actionable
        expect(error.message).toContain('invalid creds shape');

        // snapshot for regression detection
        expect({
          message: error.message,
          metadata: error.metadata,
        }).toMatchSnapshot();
      });
    });
  });

  given('[case4] incomplete keyrack config', () => {
    when('[t0] keyrack config lacks owner', () => {
      then('it throws BadRequestError with actionable message', async () => {
        const error = await getSdkCredsFromBrainSupplies({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          creds: { keyrack: { env: 'test' } } as any,
          keys: ['SOME_KEY'],
        }).catch((e) => e);

        // error is instance
        expect(error).toBeInstanceOf(Error);

        // message is actionable
        expect(error.message).toContain('invalid keyrack config');
        expect(error.message).toContain('owner absent');
        expect(error.message).toContain('pass { keyrack: { owner, env } }');

        // snapshot for regression detection
        expect({
          message: error.message,
          metadata: error.metadata,
        }).toMatchSnapshot();
      });
    });

    when('[t1] keyrack config lacks env', () => {
      then('it throws BadRequestError with actionable message', async () => {
        const error = await getSdkCredsFromBrainSupplies({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          creds: { keyrack: { owner: 'ehmpathy' } } as any,
          keys: ['SOME_KEY'],
        }).catch((e) => e);

        // error is instance
        expect(error).toBeInstanceOf(Error);

        // message is actionable
        expect(error.message).toContain('invalid keyrack config');
        expect(error.message).toContain('env absent');
        expect(error.message).toContain('pass { keyrack: { owner, env } }');

        // snapshot for regression detection
        expect({
          message: error.message,
          metadata: error.metadata,
        }).toMatchSnapshot();
      });
    });
  });
});
