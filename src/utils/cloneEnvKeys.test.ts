import { given, then, when } from 'test-fns';

import {
  CLONE_ENV_KEYS,
  CLONE_ENV_KEYS_HANDOFF,
  CLONE_ENV_KEYS_IDENTITY,
} from './cloneEnvKeys';

describe('cloneEnvKeys', () => {
  given('[case1] the two key groups', () => {
    when('[t0] they are joined', () => {
      const joined = [...CLONE_ENV_KEYS_IDENTITY, ...CLONE_ENV_KEYS_HANDOFF];

      // a key in neither group escapes the settings strip, the repl scope and the consume
      then('🔴 together they cover every clone env key, once each', () => {
        expect([...joined].sort()).toEqual(
          [...Object.values(CLONE_ENV_KEYS)].sort(),
        );
      });
    });
  });
});
