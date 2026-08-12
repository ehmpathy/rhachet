import { ConstraintError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { genMockGhRun } from '@src/.test/assets/genMockGhRun';

import { mechAdapterGithubApp } from './mechAdapterGithubApp';

describe('mechAdapterGithubApp', () => {
  given('[case1] valid github app credentials json', () => {
    when('[t0] validate called with valid json (camelCase)', () => {
      const creds = JSON.stringify({
        appId: '12345',
        privateKey:
          '-----BEGIN RSA PRIVATE KEY-----\ntest\n-----END RSA PRIVATE KEY-----',
        installationId: '67890',
      });
      const result = mechAdapterGithubApp.validate({ source: creds });

      then('validation passes', () => {
        expect(result.valid).toBe(true);
      });
    });

    when('[t1] validate called with valid json (snake_case)', () => {
      const creds = JSON.stringify({
        app_id: '12345',
        private_key:
          '-----BEGIN RSA PRIVATE KEY-----\ntest\n-----END RSA PRIVATE KEY-----',
        installation_id: '67890',
      });
      const result = mechAdapterGithubApp.validate({ source: creds });

      then('validation passes', () => {
        expect(result.valid).toBe(true);
      });
    });

    when('[t2] validate called with numeric ids', () => {
      const creds = JSON.stringify({
        appId: 12345,
        privateKey:
          '-----BEGIN RSA PRIVATE KEY-----\ntest\n-----END RSA PRIVATE KEY-----',
        installationId: 67890,
      });
      const result = mechAdapterGithubApp.validate({ source: creds });

      then('validation passes', () => {
        expect(result.valid).toBe(true);
      });
    });
  });

  given('[case2] invalid github app credentials', () => {
    when('[t0] validate called with non-json value', () => {
      const result = mechAdapterGithubApp.validate({ source: 'not-json' });

      then('validation fails', () => {
        expect(result.valid).toBe(false);
      });

      then('reason mentions invalid json', () => {
        if (!result.valid) {
          expect(result.reasons?.[0]).toContain('not valid json');
        }
      });
    });

    when('[t1] validate called with non-object json', () => {
      const result = mechAdapterGithubApp.validate({ source: '"a string"' });

      then('validation fails', () => {
        expect(result.valid).toBe(false);
      });

      then('reason mentions not a json object', () => {
        if (!result.valid) {
          expect(result.reasons?.[0]).toContain('not a json object');
        }
      });
    });

    when('[t2] validate called with json lack appId', () => {
      const creds = JSON.stringify({
        privateKey:
          '-----BEGIN RSA PRIVATE KEY-----\ntest\n-----END RSA PRIVATE KEY-----',
        installationId: '67890',
      });
      const result = mechAdapterGithubApp.validate({ source: creds });

      then('validation fails', () => {
        expect(result.valid).toBe(false);
      });

      then('reason mentions appId field', () => {
        if (!result.valid) {
          expect(result.reasons?.[0]).toContain('appId');
        }
      });
    });

    when('[t3] validate called with json lack privateKey', () => {
      const creds = JSON.stringify({
        appId: '12345',
        installationId: '67890',
      });
      const result = mechAdapterGithubApp.validate({ source: creds });

      then('validation fails', () => {
        expect(result.valid).toBe(false);
      });

      then('reason mentions privateKey field', () => {
        if (!result.valid) {
          expect(result.reasons?.[0]).toContain('privateKey');
        }
      });
    });

    when('[t4] validate called with json lack installationId', () => {
      const creds = JSON.stringify({
        appId: '12345',
        privateKey:
          '-----BEGIN RSA PRIVATE KEY-----\ntest\n-----END RSA PRIVATE KEY-----',
      });
      const result = mechAdapterGithubApp.validate({ source: creds });

      then('validation fails', () => {
        expect(result.valid).toBe(false);
      });

      then('reason mentions installationId field', () => {
        if (!result.valid) {
          expect(result.reasons?.[0]).toContain('installationId');
        }
      });
    });
  });

  given(
    '[case2b] deliverForGet mint error path — a malformed private key',
    () => {
      // the POSITIVE mint (a real ~1h installation token) needs a real GitHub App + installation, so
      // it is not reachable creds-free at any grain (deliverForGet calls the real GitHub API and has
      // NO endpoint-override seam, unlike the SSM read path). but the mint's caller-fixable ERROR path
      // IS creds-free: a malformed .pem fails at the LOCAL jwt sign step (node crypto), BEFORE any
      // network call, so this proves deliverForGet converts that crypto fault into a ConstraintError
      // that names the fix — the one slice of the mint provable without GitHub (mechAdapterGithubApp.ts:236)
      when(
        '[t0] deliverForGet called with a syntactically-valid-json but non-rsa private key',
        () => {
          const source = JSON.stringify({
            appId: '12345',
            // passes parseGithubAppCredentials (all fields present) but is NOT a valid rsa key, so the
            // local jwt sign throws a crypto DECODER error before any GitHub request is attempted
            privateKey:
              '-----BEGIN RSA PRIVATE KEY-----\nnot-a-real-rsa-key\n-----END RSA PRIVATE KEY-----',
            installationId: '67890',
          });

          then(
            'it throws a ConstraintError that names the invalid-private-key fix',
            async () => {
              const error = await getError(
                mechAdapterGithubApp.deliverForGet({ source }),
              );
              expect(error).toBeInstanceOf(ConstraintError);
              expect(error.message).toContain('private key');
            },
          );
        },
      );
    },
  );

  given(
    '[case3] acquireForSet on a non-TTY stdin (unattended, no injected question)',
    () => {
      // an unattended provision task with explicit --mech EPHEMERAL_VIA_GITHUB_APP reaches
      // acquireForSet with no injected question; stdin is not a terminal, so the guided pem
      // prompt can never be answered — it MUST fail loud, never open a readline that hangs.
      //
      // the no-TTY guard is deferred to the actual pem-read point (mechAdapterGithubApp.ts:150):
      // discovery runs first, so a mock gh runner seeds ONE registered app for the org, which
      // auto-selects (no choice prompt). the flow then reaches getPemPath, whose first prompt
      // trips the guard on the forced non-TTY stdin. the injected runner also keeps the unit
      // test hermetic — it never touches the real gh cli (rule.forbid.unit.remote-boundaries).
      const ghRun = genMockGhRun({
        files: [
          {
            repo: 'ehmpathy/keyrack-infra',
            path: 'registry/github-apps.json',
            content: JSON.stringify([
              {
                org: 'ehmpathy',
                appId: '123',
                installationId: '456',
                slug: 'my-app',
              },
            ]),
          },
        ],
      });

      when(
        '[t0] acquireForSet called with no question and stdin is not a terminal',
        () => {
          // force a deterministic non-TTY stdin regardless of the test runner's tty state
          const priorIsTTY = process.stdin.isTTY;
          beforeAll(() => {
            Object.defineProperty(process.stdin, 'isTTY', {
              value: false,
              configurable: true,
            });
          });
          afterAll(() => {
            Object.defineProperty(process.stdin, 'isTTY', {
              value: priorIsTTY,
              configurable: true,
            });
          });

          then(
            'it throws a ConstraintError that states stdin is not a terminal',
            async () => {
              const error = await getError(
                mechAdapterGithubApp.acquireForSet(
                  {
                    keySlug: 'ehmpathy.test.XAI_API_KEY',
                    mech: 'EPHEMERAL_VIA_GITHUB_APP',
                  },
                  { ghRun },
                ),
              );
              expect(error).toBeInstanceOf(ConstraintError);
              expect(error.message).toContain('stdin is not a terminal');
            },
          );
        },
      );
    },
  );
});
