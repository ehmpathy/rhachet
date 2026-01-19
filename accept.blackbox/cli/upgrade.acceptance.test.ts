import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/accept.blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/accept.blackbox/.test/infra/invokeRhachetCliBinary';

/**
 * .what = reads the installed version of a package from package.json
 * .why = verifies upgrade actually changed the version
 */
const getInstalledVersion = (input: {
  cwd: string;
  packageName: string;
}): string => {
  const packageJsonPath = join(
    input.cwd,
    'node_modules',
    input.packageName,
    'package.json',
  );
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
  return packageJson.version;
};

describe('rhachet upgrade', () => {
  given('[case1] discoverability: user runs "update"', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'minimal' }),
    );

    when('[t0] rhachet update', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['update'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('stderr suggests "upgrade"', () => {
        expect(result.stderr).toContain('upgrade');
      });

      then('stderr shows helpful error message', () => {
        expect(result.stderr).toContain('not a valid command');
      });
    });
  });

  given('[case2] upgrade --roles on repo without rhachet-roles packages', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'without-roles-packages' }),
    );

    when('[t0] rhachet upgrade --roles mechanic', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['upgrade', '--roles', 'mechanic'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('stderr contains error about package not installed', () => {
        expect(result.stderr).toContain('not installed');
      });
    });
  });

  given('[case3] upgrade --help', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'minimal' }),
    );

    when('[t0] rhachet upgrade --help', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['upgrade', '--help'],
          cwd: repo.path,
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('stdout contains --self option', () => {
        expect(result.stdout).toContain('--self');
      });

      then('stdout contains --roles option', () => {
        expect(result.stdout).toContain('--roles');
      });

      then('stdout contains description', () => {
        expect(result.stdout).toContain('upgrade');
      });
    });
  });

  given('[case4] repo with rhachet-roles-ehmpathy@1.17.20 installed', () => {
    const scene = useBeforeAll(async () => {
      // create temp repo and install dependencies
      const repo = genTestTempRepo({
        fixture: 'with-roles-packages-pinned',
        install: true,
      });

      // capture version before upgrade
      const versionBefore = getInstalledVersion({
        cwd: repo.path,
        packageName: 'rhachet-roles-ehmpathy',
      });

      return { repo, versionBefore };
    });

    when('[t0] before upgrade', () => {
      then('rhachet-roles-ehmpathy is at 1.17.20', () => {
        expect(scene.versionBefore).toEqual('1.17.20');
      });
    });

    when('[t1] rhachet upgrade --roles ehmpathy/mechanic', () => {
      const result = useBeforeAll(async () => {
        // run the upgrade command
        const upgradeResult = invokeRhachetCliBinary({
          args: ['upgrade', '--roles', 'ehmpathy/mechanic'],
          cwd: scene.repo.path,
        });

        // capture version after upgrade
        const versionAfter = getInstalledVersion({
          cwd: scene.repo.path,
          packageName: 'rhachet-roles-ehmpathy',
        });

        return { upgradeResult, versionAfter };
      });

      then('exits with status 0', () => {
        expect(result.upgradeResult.status).toEqual(0);
      });

      then('rhachet-roles-ehmpathy version is at least 1.17.20', () => {
        // version should be >= 1.17.20 (current latest, may be upgraded in future)
        const [major, minor, patch] = result.versionAfter.split('.').map(Number);
        expect(major).toBeGreaterThanOrEqual(1);
        if (major === 1) {
          expect(minor).toBeGreaterThanOrEqual(17);
          if (minor === 17) {
            expect(patch).toBeGreaterThanOrEqual(20);
          }
        }
      });

      then('pnpm was used (default package manager)', () => {
        // stdout should mention pnpm since pnpm is the default
        expect(result.upgradeResult.stdout).toContain('pnpm');
      });
    });
  });

  given('[case5] inside rhachet-roles-brain repo with file:. self-reference', () => {
    const scene = useBeforeAll(async () => {
      const repo = genTestTempRepo({
        fixture: 'with-file-dot-dep',
        install: false,
      });

      return { repo };
    });

    when('[t0] rhachet upgrade --roles brain/thinker', () => {
      const result = useBeforeAll(async () => {
        // upgrade tries to resolve the role, which maps to rhachet-roles-brain
        // since rhachet-roles-brain has file:. version, it should be skipped
        const upgradeResult = invokeRhachetCliBinary({
          args: ['upgrade', '--roles', 'brain/thinker'],
          cwd: scene.repo.path,
          logOnError: false,
        });

        const packageJson = JSON.parse(
          readFileSync(join(scene.repo.path, 'package.json'), 'utf-8'),
        );

        return { upgradeResult, packageJson };
      });

      then('package.json still has rhachet-roles-brain as file:.', () => {
        expect(result.packageJson.dependencies['rhachet-roles-brain']).toEqual(
          'file:.',
        );
      });
    });
  });
});
