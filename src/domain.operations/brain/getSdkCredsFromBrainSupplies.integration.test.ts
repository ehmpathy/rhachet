import { given, then, useThen, when } from 'test-fns';

import { keyrack } from '@src/contract/sdk.keyrack';

import { getSdkCredsFromBrainSupplies } from './getSdkCredsFromBrainSupplies';

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
        expect(error.message).toContain('brain supplier credential getter failed');
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
    // check if keyrack is available before test execution
    const keyrackAvailable = useThen(
      'it checks keyrack availability',
      async () => {
        try {
          const { attempt } = await keyrack.get({
            for: { key: 'ehmpathy.test.XAI_API_KEY' },
            env: 'test',
            owner: 'ehmpathy',
          });
          return attempt.status === 'granted';
        } catch {
          return false;
        }
      },
    );

    when('[t0] keyrack key exists', () => {
      const result = useThen('it retrieves the credential', async () => {
        if (!keyrackAvailable) {
          throw new Error(
            'keyrack not available; run: rhx keyrack unlock --owner ehmpathy --env test',
          );
        }
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

    when('[t1] keyrack key does not exist', () => {
      then('it throws BadRequestError with actionable context', async () => {
        if (!keyrackAvailable) {
          throw new Error(
            'keyrack not available; run: rhx keyrack unlock --owner ehmpathy --env test',
          );
        }

        const error = await getSdkCredsFromBrainSupplies({
          creds: { keyrack: { owner: 'ehmpathy', env: 'test' } },
          keys: ['NONEXISTENT_KEY_FOR_TEST'],
        }).catch((e) => e);

        // error is instance
        expect(error).toBeInstanceOf(Error);

        // message contains keyrack formatted output
        expect(error.message).toContain('keyrack');
        expect(error.message).toContain('NONEXISTENT_KEY_FOR_TEST');

        // metadata has context
        expect(error.metadata).toBeDefined();
        expect(error.metadata.status).toBeDefined();
        expect(error.metadata.key).toEqual('NONEXISTENT_KEY_FOR_TEST');

        // snapshot for regression detection
        expect({
          message: error.message,
          metadata: error.metadata,
        }).toMatchSnapshot();
      });
    });
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
