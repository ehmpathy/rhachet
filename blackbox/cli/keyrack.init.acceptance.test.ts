import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';

describe('keyrack init', () => {
  /**
   * [uc1] keyrack init with default ssh key (fresh repo)
   * tests initialization on a repo with no prior keyrack manifest
   * verifies default behavior uses ssh key discovery
   */
  given('[case1] keyrack init with default ssh key (fresh repo)', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'minimal' }),
    );

    when('[t0] init (json output)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'init', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('response contains owner null for default', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.host.owner).toBeNull();
      });

      then('response contains manifestPath', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.host.manifestPath).toContain('keyrack.host.age');
      });

      then('response contains recipient with mech (default discovery)', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.host.recipient.mech).toBeDefined();
        expect(parsed.host.recipient.pubkey).toBeDefined();
      });
    });

    when('[t1] init again (idempotent)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'init', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('response contains same recipient (idempotent)', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.host.recipient.mech).toBeDefined();
        expect(parsed.host.recipient.pubkey).toBeDefined();
      });
    });
  });

  /**
   * [uc2] keyrack init with --for (per-owner isolation)
   * tests that each owner gets isolated manifest
   */
  given('[case2] keyrack init with --for owner', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'minimal' }),
    );

    when('[t0] init --for mechanic', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'init', '--for', 'mechanic', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('response contains owner mechanic', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.host.owner).toEqual('mechanic');
      });

      then('manifestPath includes owner suffix', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.host.manifestPath).toContain('keyrack.host.mechanic.age');
      });
    });

    when('[t1] init --for foreman (different owner)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'init', '--for', 'foreman', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('response contains owner foreman', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.host.owner).toEqual('foreman');
      });

      then('manifestPath includes foreman suffix', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.host.manifestPath).toContain('keyrack.host.foreman.age');
      });
    });
  });

  /**
   * [uc3] keyrack init with --label
   * tests custom label for recipient
   */
  given('[case3] keyrack init with --label', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'minimal' }),
    );

    when('[t0] init --label macbook', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'init', '--label', 'macbook', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('recipient has custom label', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.host.recipient.label).toEqual('macbook');
      });
    });
  });

  /**
   * [uc4] keyrack init with --pubkey (gap.1 coverage)
   * tests explicit ssh key path via --pubkey flag
   */
  given('[case4] keyrack init with --pubkey', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'minimal' }),
    );

    when('[t0] init --pubkey with private key path', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'init',
            '--pubkey',
            `${repo.path}/.ssh/id_ed25519`,
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('recipient mech is defined', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.host.recipient.mech).toBeDefined();
      });

      then('recipient pubkey is defined', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.host.recipient.pubkey).toBeDefined();
      });
    });

    when('[t1] init --pubkey with .pub file path', () => {
      // use a different owner to avoid conflict with t0
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'init',
            '--for',
            'pubkey-test',
            '--pubkey',
            `${repo.path}/.ssh/id_ed25519.pub`,
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('recipient mech is defined', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.host.recipient.mech).toBeDefined();
      });

      then('owner is pubkey-test', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.host.owner).toEqual('pubkey-test');
      });
    });

  });

  /**
   * [uc5] keyrack init human-readable output
   * tests display format for humans
   */
  given('[case5] keyrack init human-readable output', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'minimal' }),
    );

    when('[t0] init (human readable, first time)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'init'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output shows keyrack init header', () => {
        expect(result.stdout).toContain('keyrack init');
      });

      then('output shows host manifest status', () => {
        expect(result.stdout).toContain('host manifest');
      });

      then('stdout matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] init again (human readable, idempotent)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'init'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output shows keyrack init header (idempotent)', () => {
        expect(result.stdout).toContain('keyrack init');
      });

      then('output shows host manifest status (idempotent)', () => {
        expect(result.stdout).toContain('host manifest');
      });

      then('stdout matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });
  });

  /**
   * [uc6] keyrack init without ssh key (graceful error)
   * tests that init fails with helpful error when no ssh key present
   */
  given('[case6] keyrack init without ssh key', () => {
    const scene = useBeforeAll(async () => {
      // create a temp dir with NO .ssh/ directory at all
      const dir = mkdtempSync(join(tmpdir(), 'rhachet-test-nokey-'));
      mkdirSync(join(dir, '.rhachet', 'keyrack'), { recursive: true });
      execSync('git init', { cwd: dir, stdio: 'ignore' });
      execSync('git config user.email "test@example.com"', {
        cwd: dir,
        stdio: 'ignore',
      });
      execSync('git config user.name "Test"', { cwd: dir, stdio: 'ignore' });
      return { path: dir };
    });

    when('[t0] init (no ssh key available)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'init', '--json'],
          cwd: scene.path,
          env: { HOME: scene.path },
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('error mentions ssh-keygen', () => {
        const output = result.stdout + result.stderr;
        expect(output).toContain('ssh-keygen');
      });
    });
  });

  /**
   * [uc7] keyrack init --at (custom path)
   * usecase.6 = keyrack init --at
   * verifies that keyrack init creates keyrack.yml at custom path
   */
  given('[case7] keyrack init --at custom path', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'minimal' }),
    );

    when('[t0] init --at with custom path', () => {
      const customPath = 'src/roles/mechanic/keyrack.yml';

      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'init', '--org', 'testorg', '--at', customPath],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('creates keyrack.yml at custom path', () => {
        const fullPath = join(repo.path, customPath);
        expect(existsSync(fullPath)).toBe(true);
      });

      then('keyrack.yml contains org declaration', () => {
        const fullPath = join(repo.path, customPath);
        const content = readFileSync(fullPath, 'utf-8');
        expect(content).toContain('org: testorg');
      });

      then('does not create keyrack.yml at default path', () => {
        const defaultPath = join(repo.path, '.agent', 'keyrack.yml');
        expect(existsSync(defaultPath)).toBe(false);
      });
    });
  });

  /**
   * [uc8] keyrack init --at with deep nested path
   * verifies that parent directories are created
   */
  given('[case8] keyrack init --at with deep nested path', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'minimal' }),
    );

    when('[t0] init --at with deeply nested path', () => {
      const customPath = 'deep/nested/path/to/keyrack.yml';

      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'init', '--org', 'testorg', '--at', customPath],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('creates keyrack.yml at deeply nested path', () => {
        const fullPath = join(repo.path, customPath);
        expect(existsSync(fullPath)).toBe(true);
      });

      then('parent directories are created', () => {
        const parentDir = join(repo.path, 'deep/nested/path/to');
        expect(existsSync(parentDir)).toBe(true);
      });
    });
  });

  /**
   * [uc9] keyrack init --at idempotent
   * verifies idempotent behavior (returns found, not error)
   */
  given('[case9] keyrack init --at idempotent', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'minimal' }),
    );

    when('[t0] init --at twice at same path', () => {
      const customPath = 'custom/keyrack.yml';

      // first init creates the file
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'init', '--org', 'testorg', '--at', customPath],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      // second init should find the file
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'init',
            '--org',
            'differentorg',
            '--at',
            customPath,
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('reports found effect (not created)', () => {
        const output = JSON.parse(result.stdout);
        expect(output.repo.effect).toEqual('found');
      });

      then('preserves original org (not overwritten)', () => {
        const fullPath = join(repo.path, customPath);
        const content = readFileSync(fullPath, 'utf-8');
        // original org should be preserved
        expect(content).toContain('org: testorg');
        expect(content).not.toContain('org: differentorg');
      });
    });
  });
});
