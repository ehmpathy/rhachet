import { given, then, when } from 'test-fns';

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
          expect(result.reason).toContain('not valid json');
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
          expect(result.reason).toContain('not a json object');
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
          expect(result.reason).toContain('appId');
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
          expect(result.reason).toContain('privateKey');
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
          expect(result.reason).toContain('installationId');
        }
      });
    });
  });
});
