import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/accept.blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/accept.blackbox/.test/infra/invokeRhachetCliBinary';

describe('rhachet repo introspect', () => {
  given('[case1] repo with rhachet.use.ts that defines roles', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-roles-package' }),
    );

    when('[t0] repo introspect with default output', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['repo', 'introspect'],
          cwd: repo.path,
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('creates rhachet.repo.yml at package root', () => {
        const manifestPath = resolve(repo.path, 'rhachet.repo.yml');
        expect(existsSync(manifestPath)).toBe(true);
      });

      then('yml contains role slug', () => {
        const manifestPath = resolve(repo.path, 'rhachet.repo.yml');
        const content = readFileSync(manifestPath, 'utf-8');
        expect(content).toContain('slug:');
      });

      then('yml contains roles array', () => {
        const manifestPath = resolve(repo.path, 'rhachet.repo.yml');
        const content = readFileSync(manifestPath, 'utf-8');
        expect(content).toContain('roles:');
      });
    });

    when('[t1] repo introspect --output - (stdout)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['repo', 'introspect', '--output', '-'],
          cwd: repo.path,
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('stdout contains yaml content', () => {
        expect(result.stdout).toContain('slug:');
        expect(result.stdout).toContain('roles:');
      });
    });
  });

  given('[case2] rhachet-roles package without getRoleRegistry export', () => {
    const repo = useBeforeAll(async () => {
      const tempRepo = genTestTempRepo({ fixture: 'with-roles-package' });
      // overwrite index.js to remove getRoleRegistry export
      const fs = require('fs');
      fs.writeFileSync(
        resolve(tempRepo.path, 'index.js'),
        'exports.foo = 1;',
      );
      return tempRepo;
    });

    when('[t0] repo introspect', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['repo', 'introspect'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('stderr contains error about getRoleRegistry', () => {
        expect(result.stderr).toContain('getRoleRegistry');
      });
    });
  });
});
