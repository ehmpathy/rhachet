import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';

describe('keyrack set', () => {
  /**
   * [uc3] set --key --mech --vault
   * creates host entry, persists to config
   */
  given('[case1] repo without host manifest', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-manifest' }),
    );

    when('[t0] keyrack set --key NEW_KEY --mech REPLICA --vault os.direct --json', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'NEW_KEY',
            '--env',
            'test',
            '--mech',
            'REPLICA',
            '--vault',
            'os.direct',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'new-key-test-value\n',
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output contains configured key', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.slug).toEqual('testorg.test.NEW_KEY');
        expect(parsed.mech).toEqual('REPLICA');
        expect(parsed.vault).toEqual('os.direct');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        // redact timestamps for stable snapshots
        const snapped = {
          ...parsed,
          createdAt: '__TIMESTAMP__',
          updatedAt: '__TIMESTAMP__',
        };
        expect(snapped).toMatchSnapshot();
      });
    });

    when('[t1] keyrack list after set', () => {
      // first set the key
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'ANOTHER_KEY',
            '--env',
            'test',
            '--mech',
            'REPLICA',
            '--vault',
            'os.direct',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'another-key-test-value\n',
        }),
      );

      const listResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'list', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('list shows configured key', () => {
        const parsed = JSON.parse(listResult.stdout);
        expect(parsed['testorg.test.ANOTHER_KEY']).toBeDefined();
        expect(parsed['testorg.test.ANOTHER_KEY'].mech).toEqual('REPLICA');
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(listResult.stdout);
        // redact timestamps for stable snapshots
        const snapped = Object.fromEntries(
          Object.entries(parsed).map(([k, v]: [string, any]) => [
            k,
            { ...(v as Record<string, unknown>), createdAt: '__TIMESTAMP__', updatedAt: '__TIMESTAMP__' },
          ]),
        );
        expect(snapped).toMatchSnapshot();
      });
    });
  });

  /**
   * [uc11] keyrack set --at (custom path)
   * writes key to custom keyrack.yml path for role-level keyracks
   */
  given('[case2] keyrack set --at with custom path', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-manifest' }),
    );

    when('[t0] init custom keyrack then set key', () => {
      const customPath = 'src/roles/mechanic/keyrack.yml';

      // first init the custom keyrack
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'init', '--org', 'customorg', '--at', customPath],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      // then set a key to it
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'ROLE_KEY',
            '--env',
            'test',
            '--mech',
            'REPLICA',
            '--vault',
            'os.direct',
            '--at',
            customPath,
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'role-key-value\n',
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('key slug uses org from custom keyrack', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.slug).toEqual('customorg.test.ROLE_KEY');
      });

      then('key appears in custom keyrack.yml', () => {
        const fullPath = join(repo.path, customPath);
        const content = readFileSync(fullPath, 'utf8');
        expect(content).toContain('ROLE_KEY');
      });

      then('root keyrack.yml is NOT modified', () => {
        const rootPath = join(repo.path, '.agent', 'keyrack.yml');
        const content = readFileSync(rootPath, 'utf8');
        expect(content).not.toContain('ROLE_KEY');
      });
    });
  });

  /**
   * [uc11.error] keyrack set --at when custom path doesn't exist
   * should fail with helpful error
   */
  given('[case3] keyrack set --at when path not found', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-manifest' }),
    );

    when('[t0] set --at nonexistent path', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'SOME_KEY',
            '--env',
            'test',
            '--mech',
            'REPLICA',
            '--vault',
            'os.direct',
            '--at',
            'nonexistent/keyrack.yml',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'some-value\n',
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('error mentions keyrack not found', () => {
        const output = result.stdout + result.stderr;
        expect(output).toContain('keyrack not found');
      });

      then('error suggests keyrack init --at', () => {
        const output = result.stdout + result.stderr;
        expect(output).toContain('keyrack init');
      });
    });
  });

  /**
   * [uc4] regular credential dual storage
   * non-sudo set stores in BOTH encrypted host manifest AND keyrack.yml
   */
  given('[case4] regular credential dual storage (non-sudo)', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-manifest' }),
    );

    when('[t0] set --key with --env test (non-sudo)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'DUAL_STORE_KEY',
            '--env',
            'test',
            '--mech',
            'REPLICA',
            '--vault',
            'os.direct',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'dual-store-value\n',
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('key appears in keyrack.yml', () => {
        const keyrackYmlPath = join(repo.path, '.agent', 'keyrack.yml');
        expect(existsSync(keyrackYmlPath)).toBe(true);
        const content = readFileSync(keyrackYmlPath, 'utf8');
        expect(content).toContain('DUAL_STORE_KEY');
      });

      then('host manifest is also updated (encrypted)', () => {
        const manifestPath = join(
          repo.path,
          '.rhachet',
          'keyrack',
          'keyrack.host.age',
        );
        expect(existsSync(manifestPath)).toBe(true);
        const stats = statSync(manifestPath);
        expect(stats.size).toBeGreaterThan(0);
      });
    });
  });
});
