import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';

describe('keyrack validation', () => {
  /**
   * [edge.2] no keyrack.yml in repo
   * verifies clear error when keyrack.yml is absent
   */
  given('[case0] repo without keyrack.yml', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'minimal' }),
    );

    when('[t0] keyrack get --for repo', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--for', 'repo'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('error mentions manifest not found', () => {
        const output = result.stdout + result.stderr;
        expect(output).toMatch(/manifest.*not found|keyrack\.yml|keyrack init/i);
      });

      then('stderr matches snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t1] keyrack unlock', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('error mentions manifest not found', () => {
        const output = result.stdout + result.stderr;
        expect(output).toMatch(/manifest.*not found|keyrack\.yml|keyrack init/i);
      });

      then('stderr matches snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });
  });

  /**
   * [uc5] key absent
   * returns absent status with fix instructions
   */
  given('[case1] repo with manifest but no host config', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-manifest' }),
    );

    when('[t0] keyrack get --key XAI_API_KEY --json (key not configured)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'testorg.test.XAI_API_KEY', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path, XAI_API_KEY: undefined },
          logOnError: false,
        }),
      );

      then('status is locked (key in manifest but not on host)', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('locked');
      });

      then('message indicates key is locked', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.message).toMatch(/locked|unlock/i);
      });

      then('fix instructions are provided', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.fix).toBeDefined();
        expect(parsed.fix).toMatch(/keyrack set|keyrack unlock/i);
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });

    when('[t1] keyrack get --key XAI_API_KEY (human readable)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'testorg.test.XAI_API_KEY'],
          cwd: repo.path,
          env: { HOME: repo.path, XAI_API_KEY: undefined },
          logOnError: false,
        }),
      );

      then('output contains locked indicator', () => {
        expect(result.stdout).toContain('locked');
        expect(result.stdout).toContain('XAI_API_KEY');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  /**
   * [uc8] all-or-none semantics
   * if any key fails, return all failures
   */
  given('[case2] repo with multiple keys, one absent', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-manifest' }),
    );

    when('[t0] keyrack get --for repo --json', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--for', 'repo', '--env', 'test', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path, XAI_API_KEY: undefined, GITHUB_APP_CREDS: undefined },
          logOnError: false,
        }),
      );

      then('result contains all attempts', () => {
        const parsed = JSON.parse(result.stdout);
        expect(Array.isArray(parsed)).toBe(true);
        expect(parsed.length).toEqual(2);
      });

      then('all attempts have locked status (keys in manifest but not on host)', () => {
        const parsed = JSON.parse(result.stdout);
        for (const attempt of parsed) {
          expect(attempt.status).toEqual('locked');
        }
      });

      then('stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchSnapshot();
      });
    });
  });

  /**
   * validation errors
   * invalid --mech and --vault options
   */
  given('[case3] validation errors', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-manifest' }),
    );

    when('[t0] keyrack set with invalid --mech', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'TEST',
            '--mech',
            'INVALID_MECH',
            '--vault',
            'os.direct',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('stderr contains error about invalid mech', () => {
        expect(result.stderr).toContain('invalid --mech');
      });

      then('stderr matches snapshot', () => {
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t1] keyrack set with invalid --vault', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'TEST',
            '--mech',
            'REPLICA',
            '--vault',
            'invalid_vault',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('stderr contains error about invalid vault', () => {
        expect(result.stderr).toContain('invalid --vault');
      });

      then('stderr matches snapshot', () => {
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t2] keyrack get without --for or --key', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('stderr contains error about required options', () => {
        expect(result.stderr).toContain('must specify');
      });

      then('stderr matches snapshot', () => {
        expect(result.stderr).toMatchSnapshot();
      });
    });
  });
});
