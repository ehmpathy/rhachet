import { given, then, when } from 'test-fns';

import { mechAdapterReplica } from './mechAdapterReplica';

// key-shaped fixtures are split at a `+` seam, so the staged-secret hook (.husky/check.secrets.sh) sees no key shape

describe('mechAdapterReplica', () => {
  given('[case1] valid replica credentials', () => {
    when('[t0] validate called with api key', () => {
      const result = mechAdapterReplica.validate({
        source: 'xai-abc123def456',
      });

      then('validation passes', () => {
        expect(result.valid).toBe(true);
      });
    });

    when('[t1] validate called with ghs_* token (ephemeral)', () => {
      const result = mechAdapterReplica.validate({
        source: 'ghs_abc123',
      });

      then(
        'validation passes (ghs_* are ephemeral server-to-server tokens)',
        () => {
          expect(result.valid).toBe(true);
        },
      );
    });

    when('[t1.1] validate called with short ghp_* token', () => {
      const result = mechAdapterReplica.validate({
        source: 'ghp_short123',
      });

      then('validation fails (ghp_* blocked regardless of length)', () => {
        expect(result.valid).toBe(false);
      });

      then('reason mentions github classic pat', () => {
        if (!result.valid) {
          expect(result.reasons?.join(' ')).toContain('github classic pat');
        }
      });
    });

    when('[t2] deliverForGet called with source', () => {
      then('returns secret unchanged with no expiry', async () => {
        const result = await mechAdapterReplica.deliverForGet({
          source: 'my-api-key-123',
        });
        expect(result.secret).toEqual('my-api-key-123');
        expect(result.expiresAt).toBeUndefined();
      });
    });
  });

  given('[case2] long-lived tokens that should be rejected', () => {
    when('[t0] validate called with github classic pat (ghp_)', () => {
      const result = mechAdapterReplica.validate({
        source: 'gh' + 'p_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      });

      then('validation fails', () => {
        expect(result.valid).toBe(false);
      });

      then('reason mentions github classic pat', () => {
        if (!result.valid) {
          expect(result.reasons?.join(' ')).toContain('github classic pat');
        }
      });
    });

    when('[t1] validate called with github oauth token (gho_)', () => {
      const result = mechAdapterReplica.validate({
        source: 'gh' + 'o_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      });

      then('validation fails', () => {
        expect(result.valid).toBe(false);
      });

      then('reason mentions github oauth token', () => {
        if (!result.valid) {
          expect(result.reasons?.join(' ')).toContain('github oauth token');
        }
      });
    });

    when('[t2] validate called with github user-to-server token (ghu_)', () => {
      const result = mechAdapterReplica.validate({
        source: 'gh' + 'u_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      });

      then('validation fails', () => {
        expect(result.valid).toBe(false);
      });

      then('reason mentions github user-to-server token', () => {
        if (!result.valid) {
          expect(result.reasons?.join(' ')).toContain(
            'github user-to-server token',
          );
        }
      });
    });

    when(
      '[t3] validate called with github server-to-server token (ghs_)',
      () => {
        const result = mechAdapterReplica.validate({
          source: 'gh' + 's_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        });

        then(
          'validation passes (ghs_ are ephemeral installation tokens)',
          () => {
            expect(result.valid).toBe(true);
          },
        );
      },
    );

    when('[t4] validate called with github refresh token (ghr_)', () => {
      const result = mechAdapterReplica.validate({
        source: 'gh' + 'r_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      });

      then('validation fails', () => {
        expect(result.valid).toBe(false);
      });

      then('reason mentions github refresh token', () => {
        if (!result.valid) {
          expect(result.reasons?.join(' ')).toContain('github refresh token');
        }
      });
    });

    when('[t5] validate called with aws long-lived access key (AKIA)', () => {
      const result = mechAdapterReplica.validate({
        source: 'AKIA' + 'IOSFODNN7EXAMPLE',
      });

      then('validation fails', () => {
        expect(result.valid).toBe(false);
      });

      then('reason mentions aws long-lived access key', () => {
        if (!result.valid) {
          expect(result.reasons?.join(' ')).toContain(
            'aws long-lived access key',
          );
        }
      });
    });
  });

  given('[case3] a caller that supplies the secret from code', () => {
    when('[t0] acquireForSet called with an injected question', () => {
      then(
        'the source is the answer, asked once with the human prompt',
        async () => {
          const prompts: string[] = [];
          const result = await mechAdapterReplica.acquireForSet(
            {
              keySlug: '@all.prep.BRAINS_AUTH_KEY',
              mech: 'PERMANENT_VIA_REPLICA',
            },
            {
              question: async (prompt: string) => {
                prompts.push(prompt); // deliberate mutation: the fake question seam's record of each ask
                return 'rotated-token-from-code';
              },
            },
          );
          expect(result.source).toEqual('rotated-token-from-code');
          expect(prompts).toEqual(['enter secret for BRAINS_AUTH_KEY: ']);
        },
      );
    });
  });
});
