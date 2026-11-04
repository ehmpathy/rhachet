import { given, then, when } from 'test-fns';

import {
  CLONE_ENV_KEYS,
  CLONE_ENV_KEYS_HANDOFF,
  CLONE_ENV_KEYS_IDENTITY,
} from '@src/utils/cloneEnvKeys';

/**
 * .what = clamps the integration tier's clone-env scrub (`jest.integration.env.ts`)
 * .why = a run inside a leaf clone hands its leaf mark to every test, and the spawn guard then
 *   refuses each mocked repl; cicd holds no clone identity, so only this case goes red on a revert
 */
describe('jest.integration.env', () => {
  given('a host env that carries a clone identity', () => {
    const keys = [...CLONE_ENV_KEYS_IDENTITY, ...CLONE_ENV_KEYS_HANDOFF];
    const envBefore = { ...process.env };
    afterAll(() => {
      for (const key of keys) {
        delete process.env[key];
        if (envBefore[key] !== undefined) process.env[key] = envBefore[key];
      }
    });

    when('[t0] the env file loads', () => {
      then('every clone identity and handoff key is gone', async () => {
        // .note = deliberate global mutation: seed the host's identity; afterAll restores it
        for (const key of keys) process.env[key] = '1';
        expect(process.env[CLONE_ENV_KEYS.leaf]).toEqual('1');

        await jest.isolateModulesAsync(async () => {
          await import('../../../jest.integration.env');
        });

        for (const key of keys) expect(process.env[key]).toBeUndefined();
      });
    });
  });
});
