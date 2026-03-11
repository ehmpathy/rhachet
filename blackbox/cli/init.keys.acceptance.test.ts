import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';

describe('rhachet init --keys', () => {
  given('[case1] repo with role keyrack and scoped package name', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-role-keyrack' }),
    );

    when('[t0] init --keys --roles tester', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['init', '--keys', '--roles', 'tester'],
          cwd: repo.path,
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('creates .agent/keyrack.yml', () => {
        const manifestPath = join(repo.path, '.agent', 'keyrack.yml');
        expect(existsSync(manifestPath)).toBe(true);
      });

      then('keyrack.yml contains org from package.json scope', () => {
        const manifestPath = join(repo.path, '.agent', 'keyrack.yml');
        const content = readFileSync(manifestPath, 'utf-8');
        expect(content).toContain('org: test-org');
      });

      then('keyrack.yml contains extends with role keyrack', () => {
        const manifestPath = join(repo.path, '.agent', 'keyrack.yml');
        const content = readFileSync(manifestPath, 'utf-8');
        expect(content).toContain('extends:');
        expect(content).toContain(
          '.agent/repo=test-repo/role=tester/keyrack.yml',
        );
      });

      then('keyrack.yml contains env sections', () => {
        const manifestPath = join(repo.path, '.agent', 'keyrack.yml');
        const content = readFileSync(manifestPath, 'utf-8');
        expect(content).toContain('env.prod:');
        expect(content).toContain('env.prep:');
        expect(content).toContain('env.test:');
      });

      then('stdout shows keyrack init tree', () => {
        expect(result.stdout).toContain('keyrack init');
        expect(result.stdout).toContain('org: test-org');
        expect(result.stdout).toContain('extends:');
        expect(result.stdout).toContain('created');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case2] --keys without --roles (fail-fast)', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-role-keyrack' }),
    );

    when('[t0] init --keys without --roles', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['init', '--keys'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('error mentions --roles required', () => {
        const output = result.stdout + result.stderr;
        expect(output).toContain('--keys requires --roles');
      });

      then('stderr matches snapshot', () => {
        expect(result.stderr).toMatchSnapshot();
      });
    });
  });

  given('[case3] idempotent re-run', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-role-keyrack' }),
    );

    // first init
    useBeforeAll(async () =>
      invokeRhachetCliBinary({
        args: ['init', '--keys', '--roles', 'tester'],
        cwd: repo.path,
      }),
    );

    when('[t0] init --keys --roles tester again', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['init', '--keys', '--roles', 'tester'],
          cwd: repo.path,
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('stdout shows found (no changes)', () => {
        expect(result.stdout).toContain('found');
        expect(result.stdout).toContain('no changes');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case4] role lacks keyrack (skip, create manifest anyway)', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-role-no-keyrack' }),
    );

    when('[t0] init --keys --roles norack', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['init', '--keys', '--roles', 'norack'],
          cwd: repo.path,
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('creates .agent/keyrack.yml', () => {
        const manifestPath = join(repo.path, '.agent', 'keyrack.yml');
        expect(existsSync(manifestPath)).toBe(true);
      });

      then('keyrack.yml has no extends (role skipped)', () => {
        const manifestPath = join(repo.path, '.agent', 'keyrack.yml');
        const content = readFileSync(manifestPath, 'utf-8');
        // should not contain extends since no roles have keyracks
        expect(content).not.toContain('extends:');
      });

      then('keyrack.yml still has org and env sections', () => {
        const manifestPath = join(repo.path, '.agent', 'keyrack.yml');
        const content = readFileSync(manifestPath, 'utf-8');
        expect(content).toContain('org: test-org');
        expect(content).toContain('env.prod:');
        expect(content).toContain('env.prep:');
        expect(content).toContain('env.test:');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case5] scoped extends via --roles', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-role-keyrack' }),
    );

    when('[t0] init --keys --roles tester', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['init', '--keys', '--roles', 'tester'],
          cwd: repo.path,
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('keyrack.yml created', () => {
        const manifestPath = join(repo.path, '.agent', 'keyrack.yml');
        expect(existsSync(manifestPath)).toBe(true);
      });

      then('keyrack.yml contains only specified role keyrack', () => {
        const manifestPath = join(repo.path, '.agent', 'keyrack.yml');
        const content = readFileSync(manifestPath, 'utf-8');
        expect(content).toContain(
          '.agent/repo=test-repo/role=tester/keyrack.yml',
        );
      });

      then('stdout shows keyrack init activity', () => {
        expect(result.stdout).toContain('keyrack init');
      });
    });
  });

  given('[case6] org not detectable', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-role-keyrack-no-org' }),
    );

    when('[t0] init --keys --roles tester (org undetectable)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['init', '--keys', '--roles', 'tester'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('error mentions org detection failed', () => {
        const output = result.stdout + result.stderr;
        expect(output).toContain('unable to detect org');
      });

      then('error suggests keyrack init', () => {
        const output = result.stdout + result.stderr;
        expect(output).toContain('keyrack init');
      });

      then('stderr matches snapshot', () => {
        expect(result.stderr).toMatchSnapshot();
      });
    });
  });
});
