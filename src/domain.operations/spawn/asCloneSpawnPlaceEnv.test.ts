import { given, then, when } from 'test-fns';

import { CLONE_ENV_KEYS } from '@src/utils/cloneEnvKeys';

import { asCloneSpawnPlaceEnv } from './asCloneSpawnPlaceEnv';

describe('asCloneSpawnPlaceEnv', () => {
  given('[case1] a work child, spawned by a work clone', () => {
    when('[t0] its env is built', () => {
      const env = asCloneSpawnPlaceEnv({
        env: { PATH: '/bin', [CLONE_ENV_KEYS.depth]: '1' },
        depth: 2,
        leaf: false,
      });

      then('it carries its own depth', () => {
        expect(env[CLONE_ENV_KEYS.depth]).toEqual('2');
      });

      then(
        '🔴 it carries no leaf key at all — a work clone may enroll one more',
        () => {
          expect(Object.keys(env)).not.toContain(CLONE_ENV_KEYS.leaf);
        },
      );

      then('the rest of the caller env passes through', () => {
        expect(env.PATH).toEqual('/bin');
      });
    });
  });

  given('[case2] a reviewer child, spawned by a print-mode enroll', () => {
    when('[t0] its env is built', () => {
      const env = asCloneSpawnPlaceEnv({
        env: { [CLONE_ENV_KEYS.depth]: '0' },
        depth: 1,
        leaf: true,
      });

      then('it carries the leaf mark', () => {
        expect(env[CLONE_ENV_KEYS.leaf]).toEqual('1');
      });
    });
  });

  given('[case3] a caller env that holds a stray leaf key', () => {
    when('[t0] a work child env is built from it', () => {
      const env = asCloneSpawnPlaceEnv({
        env: { [CLONE_ENV_KEYS.leaf]: '1' },
        depth: 1,
        leaf: false,
      });

      then(
        'the stray key is dropped — the mark is the spawn decision, never inherited',
        () => {
          expect(Object.keys(env)).not.toContain(CLONE_ENV_KEYS.leaf);
        },
      );
    });
  });
});
