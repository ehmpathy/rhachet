import { given, then, when } from 'test-fns';

import { genTestTempDir } from '@src/.test/infra/genTestTempDir';
import { ContextCli } from '@src/domain.objects/ContextCli';

import { readFileSync, writeFileSync } from 'node:fs';
import { execNpmInstall } from './execNpmInstall';
import { UpgradeExecutionError } from './UpgradeExecutionError';

describe('execNpmInstall', () => {
  given('a directory with package.json', () => {
    const testDir = genTestTempDir({
      base: __dirname,
      name: 'execNpmInstall',
    });

    beforeAll(() => {
      testDir.setup();
      writeFileSync(
        'package.json',
        JSON.stringify({
          name: 'test-execnpminstall',
          version: '0.0.0',
          dependencies: {},
        }),
      );
    });

    afterAll(() => testDir.teardown());

    when('execNpmInstall is called with a valid package', () => {
      then('npm install succeeds and package is added', () => {
        const context = new ContextCli({
          cwd: testDir.path,
          gitroot: testDir.path,
        });

        // install a small, fast package
        execNpmInstall({ packages: ['is-odd'] }, context);

        // verify package was added
        const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
        expect(pkg.dependencies['is-odd']).toBeDefined();
      });
    });

    when('execNpmInstall is called with empty packages array', () => {
      then('returns early without error', () => {
        const context = new ContextCli({
          cwd: testDir.path,
          gitroot: testDir.path,
        });

        // should not throw
        execNpmInstall({ packages: [] }, context);
      });
    });
  });

  given('a directory with package.json but invalid package name', () => {
    const testDir = genTestTempDir({
      base: __dirname,
      name: 'execNpmInstall-invalid-pkg',
    });

    beforeAll(() => {
      testDir.setup();
      writeFileSync(
        'package.json',
        JSON.stringify({
          name: 'test-execnpminstall-invalid',
          version: '0.0.0',
          dependencies: {},
        }),
      );
    });

    afterAll(() => testDir.teardown());

    when('execNpmInstall is called with nonexistent package', () => {
      then('throws UpgradeExecutionError', () => {
        const context = new ContextCli({
          cwd: testDir.path,
          gitroot: testDir.path,
        });

        expect(() => {
          execNpmInstall(
            { packages: ['@rhachet/this-package-does-not-exist-12345'] },
            context,
          );
        }).toThrow(UpgradeExecutionError);
      });
    });
  });
});
