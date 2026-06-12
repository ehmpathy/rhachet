import { given, then, when } from 'test-fns';

import { genMockKeyrackRepoManifest } from '@src/.test/assets/genMockKeyrackRepoManifest';
import type { KeyrackGrantAttempt } from '@src/domain.objects/keyrack/KeyrackGrantAttempt';

import { decideIsKeyStrictlyRequired } from './decideIsKeyStrictlyRequired';

/**
 * .what = unit tests for decideIsKeyStrictlyRequired
 * .why = verify is-optional-if-has waiver logic in strict mode
 *
 * rule: strict mode fails if ANY required key is not granted
 * waiver: absent key with flags.isOptionalIfHas is waived if alternative is present in env
 */
describe('decideIsKeyStrictlyRequired', () => {
  given('[absent key with flags.isOptionalIfHas]', () => {
    const manifest = genMockKeyrackRepoManifest({
      keys: {
        'testorg.test.AWS_PROFILE': {
          flags: { isOptionalIfHas: 'AWS_ACCESS_KEY_ID' },
        },
      },
    });

    when('[t0] alternative IS present in env', () => {
      then('key is NOT strictly required (waived)', () => {
        const attempt: KeyrackGrantAttempt = {
          status: 'absent',
          slug: 'testorg.test.AWS_PROFILE',
          message: 'key not configured',
        };
        const env = { AWS_ACCESS_KEY_ID: 'AKIA...' };

        const result = decideIsKeyStrictlyRequired({ attempt, manifest, env });

        expect(result).toBe(false); // requirement waived
      });
    });

    when('[t1] alternative is NOT present in env', () => {
      then('key IS strictly required', () => {
        const attempt: KeyrackGrantAttempt = {
          status: 'absent',
          slug: 'testorg.test.AWS_PROFILE',
          message: 'key not configured',
        };
        const env = {}; // no AWS_ACCESS_KEY_ID

        const result = decideIsKeyStrictlyRequired({ attempt, manifest, env });

        expect(result).toBe(true); // requirement stands
      });
    });

    when('[t2] alternative is present but empty string', () => {
      then(
        'key IS strictly required (empty string does not provide auth)',
        () => {
          const attempt: KeyrackGrantAttempt = {
            status: 'absent',
            slug: 'testorg.test.AWS_PROFILE',
            message: 'key not configured',
          };
          const env = { AWS_ACCESS_KEY_ID: '' }; // empty but present

          const result = decideIsKeyStrictlyRequired({
            attempt,
            manifest,
            env,
          });

          // empty string is falsy, so it does not waive the requirement
          // this is intentional: an empty AWS_ACCESS_KEY_ID cannot provide auth
          expect(result).toBe(true); // requirement stands
        },
      );
    });
  });

  given('[absent key without flags.isOptionalIfHas]', () => {
    const manifest = genMockKeyrackRepoManifest({
      keys: {
        'testorg.test.API_KEY': {
          // no flags.isOptionalIfHas
        },
      },
    });

    when('[t3] key has no alternative declared', () => {
      then('key IS strictly required', () => {
        const attempt: KeyrackGrantAttempt = {
          status: 'absent',
          slug: 'testorg.test.API_KEY',
          message: 'key not configured',
        };
        const env = { SOME_OTHER_KEY: 'value' };

        const result = decideIsKeyStrictlyRequired({ attempt, manifest, env });

        expect(result).toBe(true); // no waiver possible
      });
    });
  });

  given('[locked key]', () => {
    const manifest = genMockKeyrackRepoManifest({
      keys: {
        'testorg.test.AWS_PROFILE': {
          flags: { isOptionalIfHas: 'AWS_ACCESS_KEY_ID' },
        },
      },
    });

    when('[t4] vault requires unlock', () => {
      then('key IS strictly required (no waiver for locked)', () => {
        const attempt: KeyrackGrantAttempt = {
          status: 'locked',
          slug: 'testorg.test.AWS_PROFILE',
          message: 'vault requires unlock',
        };
        // even with flags.isOptionalIfHas set, locked keys cannot be waived
        const env = { AWS_ACCESS_KEY_ID: 'AKIA...' };

        const result = decideIsKeyStrictlyRequired({ attempt, manifest, env });

        expect(result).toBe(true); // locked keys are always required
      });
    });
  });

  given('[blocked key]', () => {
    const manifest = genMockKeyrackRepoManifest({
      keys: {
        'testorg.test.AWS_PROFILE': {
          flags: { isOptionalIfHas: 'AWS_ACCESS_KEY_ID' },
        },
      },
    });

    when('[t5] value violates mechanism constraint', () => {
      then('key IS strictly required (no waiver for blocked)', () => {
        const attempt: KeyrackGrantAttempt = {
          status: 'blocked',
          slug: 'testorg.test.AWS_PROFILE',
          reasons: ['invalid format'],
        };
        const env = { AWS_ACCESS_KEY_ID: 'AKIA...' };

        const result = decideIsKeyStrictlyRequired({ attempt, manifest, env });

        expect(result).toBe(true); // blocked keys are always required
      });
    });
  });

  given('[edge cases]', () => {
    when('[t6] alternative key exists but is undefined', () => {
      const manifest = genMockKeyrackRepoManifest({
        keys: {
          'testorg.test.AWS_PROFILE': {
            flags: { isOptionalIfHas: 'AWS_ACCESS_KEY_ID' },
          },
        },
      });

      then('key IS strictly required (undefined is not present)', () => {
        const attempt: KeyrackGrantAttempt = {
          status: 'absent',
          slug: 'testorg.test.AWS_PROFILE',
          message: 'key not configured',
        };
        const env: Record<string, string | undefined> = {
          AWS_ACCESS_KEY_ID: undefined,
        };

        const result = decideIsKeyStrictlyRequired({ attempt, manifest, env });

        expect(result).toBe(true); // undefined means not set
      });
    });

    when('[t7] flags.isOptionalIfHas is empty string', () => {
      const manifest = genMockKeyrackRepoManifest({
        keys: {
          'testorg.test.AWS_PROFILE': {
            flags: { isOptionalIfHas: '' }, // empty alt name
          },
        },
      });

      then('key IS strictly required (empty alt name has no effect)', () => {
        const attempt: KeyrackGrantAttempt = {
          status: 'absent',
          slug: 'testorg.test.AWS_PROFILE',
          message: 'key not configured',
        };
        const env = { '': 'some value' }; // even if '' key exists

        const result = decideIsKeyStrictlyRequired({ attempt, manifest, env });

        // empty string isOptionalIfHas is falsy, so !alt returns true
        // this means we return true immediately without env lookup
        // effectively empty isOptionalIfHas = "no alternative declared"
        expect(result).toBe(true); // requirement stands
      });
    });
  });

  given('[granted key passed by mistake]', () => {
    /**
     * .note = granted keys should not be passed to this function
     *         (caller should filter first). test documents edge case behavior.
     */
    const manifest = genMockKeyrackRepoManifest({
      keys: {
        'testorg.test.API_KEY': {},
      },
    });

    when('[t8] granted attempt is passed', () => {
      then('returns true (granted status is not absent)', () => {
        const attempt: KeyrackGrantAttempt = {
          status: 'granted',
          grant: {
            slug: 'testorg.test.API_KEY',
            key: {
              secret: 'secret',
              grade: { protection: 'encrypted', duration: 'permanent' },
            },
            source: { vault: 'os.daemon', mech: 'PERMANENT_VIA_REPLICA' },
            env: 'test',
            org: 'testorg',
          },
        };
        const env = {};

        const result = decideIsKeyStrictlyRequired({ attempt, manifest, env });

        // function returns true because status !== 'absent'
        // but this is a degenerate case - caller should not pass granted keys
        expect(result).toBe(true);
      });
    });
  });
});
