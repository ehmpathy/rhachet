import { given, then, when } from 'test-fns';

import { createDaemonKeyStore } from '../domain.objects/daemonKeyStore';
import { handleGetCommand } from './handleGetCommand';
import { handleRelockCommand } from './handleRelockCommand';
import { handleStatusCommand } from './handleStatusCommand';
import { handleUnlockCommand } from './handleUnlockCommand';

describe('handleUnlockCommand', () => {
  given('[case1] keys to unlock', () => {
    const keyStore = createDaemonKeyStore();
    const expiresAt = Date.now() + 60000;

    when('[t0] unlock command is handled', () => {
      then('keys are stored in keyStore', () => {
        const result = handleUnlockCommand(
          {
            keys: [
              {
                slug: 'AWS_SSO_PREP',
                key: {
                  secret: 'secret-1',
                  grade: { protection: 'encrypted', duration: 'ephemeral' },
                },
                expiresAt,
              },
              {
                slug: 'XAI_API_KEY',
                key: {
                  secret: 'secret-2',
                  grade: { protection: 'encrypted', duration: 'permanent' },
                },
                expiresAt,
              },
            ],
          },
          { keyStore },
        );

        expect(result.unlocked).toEqual(['AWS_SSO_PREP', 'XAI_API_KEY']);
        expect(keyStore.get({ slug: 'AWS_SSO_PREP' })?.key.secret).toBe(
          'secret-1',
        );
        expect(keyStore.get({ slug: 'XAI_API_KEY' })?.key.secret).toBe(
          'secret-2',
        );
      });
    });
  });
});

describe('handleGetCommand', () => {
  given('[case1] keys in store', () => {
    const keyStore = createDaemonKeyStore();
    const expiresAt = Date.now() + 60000;

    beforeEach(() => {
      keyStore.set({
        slug: 'KEY_A',
        key: {
          secret: 'secret-a',
          grade: { protection: 'encrypted', duration: 'ephemeral' },
        },
        expiresAt,
      });
      keyStore.set({
        slug: 'KEY_B',
        key: {
          secret: 'secret-b',
          grade: { protection: 'plaintext', duration: 'permanent' },
        },
        expiresAt,
      });
    });

    when('[t0] get command requests some keys', () => {
      then('returns the requested keys that exist', () => {
        const result = handleGetCommand(
          { slugs: ['KEY_A', 'KEY_C'] },
          { keyStore },
        );

        expect(result.keys.length).toBe(1);
        expect(result.keys[0]?.slug).toBe('KEY_A');
        expect(result.keys[0]?.key.secret).toBe('secret-a');
      });
    });

    when('[t1] get command requests all keys', () => {
      then('returns all keys', () => {
        const result = handleGetCommand(
          { slugs: ['KEY_A', 'KEY_B'] },
          { keyStore },
        );

        expect(result.keys.length).toBe(2);
      });
    });
  });
});

describe('handleStatusCommand', () => {
  given('[case1] keys in store with valid TTL', () => {
    const keyStore = createDaemonKeyStore();
    const now = Date.now();
    const expiresAt1 = now + 60000; // 1 min
    const expiresAt2 = now + 120000; // 2 min

    beforeEach(() => {
      keyStore.set({
        slug: 'KEY_1',
        key: {
          secret: 'secret-1',
          grade: { protection: 'encrypted', duration: 'ephemeral' },
        },
        expiresAt: expiresAt1,
      });
      keyStore.set({
        slug: 'KEY_2',
        key: {
          secret: 'secret-2',
          grade: { protection: 'encrypted', duration: 'transient' },
        },
        expiresAt: expiresAt2,
      });
    });

    when('[t0] status command is handled', () => {
      then('returns keys with TTL left', () => {
        const result = handleStatusCommand({}, { keyStore });

        expect(result.keys.length).toBe(2);

        const key1 = result.keys.find((k) => k.slug === 'KEY_1');
        const key2 = result.keys.find((k) => k.slug === 'KEY_2');

        expect(key1?.expiresAt).toBe(expiresAt1);
        expect(key2?.expiresAt).toBe(expiresAt2);

        // ttlLeftMs should be approximately correct (allow 100ms margin)
        expect(key1?.ttlLeftMs).toBeGreaterThan(59000);
        expect(key1?.ttlLeftMs).toBeLessThanOrEqual(60000);
      });
    });
  });

  given('[case2] empty store', () => {
    const keyStore = createDaemonKeyStore();

    when('[t0] status command is handled', () => {
      then('returns empty keys array', () => {
        const result = handleStatusCommand({}, { keyStore });
        expect(result.keys).toEqual([]);
      });
    });
  });
});

describe('handleRelockCommand', () => {
  given('[case1] keys in store', () => {
    const keyStore = createDaemonKeyStore();
    const expiresAt = Date.now() + 60000;

    beforeEach(() => {
      keyStore.set({
        slug: 'KEY_A',
        key: {
          secret: 'secret-a',
          grade: { protection: 'encrypted', duration: 'ephemeral' },
        },
        expiresAt,
      });
      keyStore.set({
        slug: 'KEY_B',
        key: {
          secret: 'secret-b',
          grade: { protection: 'encrypted', duration: 'transient' },
        },
        expiresAt,
      });
    });

    when('[t0] relock command with specific slugs', () => {
      then('deletes only specified keys', () => {
        const result = handleRelockCommand({ slugs: ['KEY_A'] }, { keyStore });

        expect(result.relocked).toEqual(['KEY_A']);
        expect(keyStore.get({ slug: 'KEY_A' })).toBeNull();
        expect(keyStore.get({ slug: 'KEY_B' })).not.toBeNull();
      });
    });

    when('[t1] relock command without slugs', () => {
      then('clears all keys', () => {
        const result = handleRelockCommand({}, { keyStore });

        expect(result.relocked.sort()).toEqual(['KEY_A', 'KEY_B']);
        expect(keyStore.size()).toBe(0);
      });
    });

    when('[t2] relock command with empty slugs array', () => {
      then('clears all keys', () => {
        const result = handleRelockCommand({ slugs: [] }, { keyStore });

        expect(result.relocked.sort()).toEqual(['KEY_A', 'KEY_B']);
        expect(keyStore.size()).toBe(0);
      });
    });
  });
});
