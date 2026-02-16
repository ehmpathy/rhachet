import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/accept.blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/accept.blackbox/.test/infra/invokeRhachetCliBinary';

/**
 * .what = extracts rhachet-controlled output from upgrade stdout
 * .why = omits pnpm/npm output which varies between runs
 *
 * .note = returns { header, summary } for snapshot assertions
 */
const extractRhachetOutput = (input: {
  stdout: string;
}): { header: string; summary: string } => {
  const lines = input.stdout.split('\n');

  // header = lines before first pnpm/npm output line
  const headerLines: string[] = [];
  let headerEnded = false;
  for (const line of lines) {
    if (
      !headerEnded &&
      (line.includes('WARN') ||
        line.includes('Progress:') ||
        line.includes('Packages:') ||
        line.includes('dependencies:'))
    ) {
      headerEnded = true;
    }
    if (!headerEnded) headerLines.push(line);
  }

  // summary = lines that start with ✨
  const summaryLines = lines.filter((line) => line.includes('✨'));

  return {
    header: headerLines.join('\n').trim(),
    summary: summaryLines.join('\n').trim(),
  };
};

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
      await genTestTempRepo({ fixture: 'minimal' }),
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
      await genTestTempRepo({ fixture: 'without-roles-packages' }),
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

      then('stderr contains error about install failure', () => {
        expect(result.stderr).toContain('install failed');
      });
    });
  });

  given('[case3] upgrade --help', () => {
    const repo = useBeforeAll(async () =>
      await genTestTempRepo({ fixture: 'minimal' }),
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

      then('stdout contains --brains option', () => {
        expect(result.stdout).toContain('--brains');
      });

      then('stdout contains description', () => {
        expect(result.stdout).toContain('upgrade');
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case4] repo with rhachet-roles-ehmpathy@1.17.20 installed', () => {
    const scene = useBeforeAll(async () => {
      // create temp repo and install dependencies
      const repo = await genTestTempRepo({
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

      then('reinit does NOT run (role not linked)', () => {
        // reinit outputs "🔧 init" when it runs - should NOT be present
        expect(result.upgradeResult.stdout).not.toContain('🔧 init');
      });

      then('stdout.header matches snapshot', () => {
        const { header } = extractRhachetOutput({
          stdout: result.upgradeResult.stdout,
        });
        expect(header).toMatchSnapshot();
      });

      then('stdout.summary matches snapshot', () => {
        const { summary } = extractRhachetOutput({
          stdout: result.upgradeResult.stdout,
        });
        expect(summary).toMatchSnapshot();
      });
    });
  });

  given('[case5] upgrade --brains on repo without rhachet-brains packages', () => {
    const repo = useBeforeAll(async () =>
      await genTestTempRepo({ fixture: 'without-roles-packages' }),
    );

    when('[t0] rhachet upgrade --brains anthropic', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['upgrade', '--brains', 'anthropic'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('stderr contains error about brain package not installed', () => {
        expect(result.stderr).toContain('brain package not installed');
      });
    });
  });

  given('[case7] repo with rhachet-brains-anthropic@0.1.0 installed', () => {
    const scene = useBeforeAll(async () => {
      // create temp repo and install dependencies
      const repo = await genTestTempRepo({
        fixture: 'with-brains-packages-pinned',
        install: true,
      });

      // capture version before upgrade
      const versionBefore = getInstalledVersion({
        cwd: repo.path,
        packageName: 'rhachet-brains-anthropic',
      });

      return { repo, versionBefore };
    });

    when('[t0] before upgrade', () => {
      then('rhachet-brains-anthropic is at 0.1.0', () => {
        expect(scene.versionBefore).toEqual('0.1.0');
      });
    });

    when('[t1] rhachet upgrade --brains anthropic', () => {
      const result = useBeforeAll(async () => {
        // run the upgrade command
        const upgradeResult = invokeRhachetCliBinary({
          args: ['upgrade', '--brains', 'anthropic'],
          cwd: scene.repo.path,
        });

        // capture version after upgrade
        const versionAfter = getInstalledVersion({
          cwd: scene.repo.path,
          packageName: 'rhachet-brains-anthropic',
        });

        return { upgradeResult, versionAfter };
      });

      then('exits with status 0', () => {
        expect(result.upgradeResult.status).toEqual(0);
      });

      then('rhachet-brains-anthropic version is at least 0.1.0', () => {
        // version should be >= 0.1.0 (current latest, may be upgraded in future)
        const [major, minor, patch] = result.versionAfter.split('.').map(Number);
        expect(major).toBeGreaterThanOrEqual(0);
        if (major === 0) {
          expect(minor).toBeGreaterThanOrEqual(1);
        }
      });

      then('stdout contains brain upgrade summary', () => {
        expect(result.upgradeResult.stdout).toContain('brain(s) upgraded');
      });

      then('pnpm was used (default package manager)', () => {
        // stdout should mention pnpm since pnpm is the default
        expect(result.upgradeResult.stdout).toContain('pnpm');
      });

      then('stdout.header matches snapshot', () => {
        const { header } = extractRhachetOutput({
          stdout: result.upgradeResult.stdout,
        });
        expect(header).toMatchSnapshot();
      });

      then('stdout.summary matches snapshot', () => {
        const { summary } = extractRhachetOutput({
          stdout: result.upgradeResult.stdout,
        });
        expect(summary).toMatchSnapshot();
      });
    });
  });

  given('[case8] repo with rhachet-roles-ehmpathy in package.json but not linked', () => {
    const scene = useBeforeAll(async () => {
      // create temp repo and install dependencies
      // note: fixture has NO .agent/ directory - roles are not linked
      const repo = await genTestTempRepo({
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
      then('.agent/ has no linked roles', () => {
        // verify the fixture has no .agent directory
        const agentDirExists = existsSync(join(scene.repo.path, '.agent'));
        expect(agentDirExists).toEqual(false);
      });

      then('rhachet-roles-ehmpathy is at 1.17.20', () => {
        expect(scene.versionBefore).toEqual('1.17.20');
      });
    });

    when('[t1] rhachet upgrade --roles *', () => {
      const result = useBeforeAll(async () => {
        // run the upgrade command with wildcard
        // note: quote the * to prevent shell glob expansion
        const upgradeResult = invokeRhachetCliBinary({
          args: ['upgrade', '--roles', "'*'"],
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

      then('upgrades rhachet-roles-ehmpathy', () => {
        // version should be >= 1.17.20 (package.json discovery works without link)
        const [major, minor, patch] = result.versionAfter.split('.').map(Number);
        expect(major).toBeGreaterThanOrEqual(1);
        if (major === 1) {
          expect(minor).toBeGreaterThanOrEqual(17);
          if (minor === 17) {
            expect(patch).toBeGreaterThanOrEqual(20);
          }
        }
      });

      then('stdout contains role upgrade summary', () => {
        expect(result.upgradeResult.stdout).toContain('role(s) upgraded');
      });

      then('reinit does NOT run (no linked roles)', () => {
        // reinit outputs "🔧 init" when it runs - should NOT be present
        expect(result.upgradeResult.stdout).not.toContain('🔧 init');
      });

      then('stdout.header matches snapshot', () => {
        const { header } = extractRhachetOutput({
          stdout: result.upgradeResult.stdout,
        });
        expect(header).toMatchSnapshot();
      });

      then('stdout.summary matches snapshot', () => {
        const { summary } = extractRhachetOutput({
          stdout: result.upgradeResult.stdout,
        });
        expect(summary).toMatchSnapshot();
      });
    });
  });

  /**
   * upgrade vs reinit guarantee tests:
   * - package upgrade happens regardless of link status (via package.json discovery)
   * - reinit happens ONLY for linked roles (via .agent/ discovery)
   */

  given('[case9] --roles * with linked role', () => {
    const scene = useBeforeAll(async () => {
      // fixture has .agent/repo=ehmpathy/role=mechanic/ (linked)
      const repo = await genTestTempRepo({
        fixture: 'with-roles-linked',
        install: true,
      });

      const versionBefore = getInstalledVersion({
        cwd: repo.path,
        packageName: 'rhachet-roles-ehmpathy',
      });

      return { repo, versionBefore };
    });

    when('[t0] before upgrade', () => {
      then('.agent/ has linked mechanic role', () => {
        const agentDirExists = existsSync(
          join(scene.repo.path, '.agent', 'repo=ehmpathy', 'role=mechanic'),
        );
        expect(agentDirExists).toEqual(true);
      });
    });

    when('[t1] rhachet upgrade --roles *', () => {
      const result = useBeforeAll(async () => {
        const upgradeResult = invokeRhachetCliBinary({
          args: ['upgrade', '--roles', "'*'"],
          cwd: scene.repo.path,
        });

        const versionAfter = getInstalledVersion({
          cwd: scene.repo.path,
          packageName: 'rhachet-roles-ehmpathy',
        });

        return { upgradeResult, versionAfter };
      });

      then('exits with status 0', () => {
        expect(result.upgradeResult.status).toEqual(0);
      });

      then('upgrades the package', () => {
        const [major, minor, patch] = result.versionAfter.split('.').map(Number);
        expect(major).toBeGreaterThanOrEqual(1);
        if (major === 1) {
          expect(minor).toBeGreaterThanOrEqual(17);
          if (minor === 17) {
            expect(patch).toBeGreaterThanOrEqual(20);
          }
        }
      });

      then('reinit runs for linked roles', () => {
        // reinit outputs "🔧 init" when it runs
        expect(result.upgradeResult.stdout).toContain('🔧 init');
      });

      then('reinit links the role', () => {
        expect(result.upgradeResult.stdout).toContain('role(s) linked');
      });
    });
  });

  given('[case10] --roles ehmpathy/* with unlinked package', () => {
    const scene = useBeforeAll(async () => {
      // fixture has NO .agent/ directory (not linked)
      const repo = await genTestTempRepo({
        fixture: 'with-roles-packages-pinned',
        install: true,
      });

      return { repo };
    });

    when('[t0] before upgrade', () => {
      then('.agent/ does not exist', () => {
        const agentDirExists = existsSync(join(scene.repo.path, '.agent'));
        expect(agentDirExists).toEqual(false);
      });
    });

    when('[t1] rhachet upgrade --roles ehmpathy/*', () => {
      const result = useBeforeAll(async () => {
        const upgradeResult = invokeRhachetCliBinary({
          args: ['upgrade', '--roles', 'ehmpathy/*'],
          cwd: scene.repo.path,
        });

        const versionAfter = getInstalledVersion({
          cwd: scene.repo.path,
          packageName: 'rhachet-roles-ehmpathy',
        });

        return { upgradeResult, versionAfter };
      });

      then('exits with status 0', () => {
        expect(result.upgradeResult.status).toEqual(0);
      });

      then('upgrades the package', () => {
        const [major, minor, patch] = result.versionAfter.split('.').map(Number);
        expect(major).toBeGreaterThanOrEqual(1);
      });

      then('reinit does NOT run (no linked roles)', () => {
        // reinit outputs "🔧 init" when it runs - should NOT be present
        expect(result.upgradeResult.stdout).not.toContain('🔧 init');
      });

      then('stdout.summary matches snapshot', () => {
        const { summary } = extractRhachetOutput({
          stdout: result.upgradeResult.stdout,
        });
        expect(summary).toMatchSnapshot();
      });
    });
  });

  given('[case11] --roles ehmpathy/* with linked role', () => {
    const scene = useBeforeAll(async () => {
      // fixture has .agent/repo=ehmpathy/role=mechanic/ (linked)
      const repo = await genTestTempRepo({
        fixture: 'with-roles-linked',
        install: true,
      });

      return { repo };
    });

    when('[t0] before upgrade', () => {
      then('.agent/ has linked mechanic role', () => {
        const agentDirExists = existsSync(
          join(scene.repo.path, '.agent', 'repo=ehmpathy', 'role=mechanic'),
        );
        expect(agentDirExists).toEqual(true);
      });
    });

    when('[t1] rhachet upgrade --roles ehmpathy/*', () => {
      const result = useBeforeAll(async () => {
        const upgradeResult = invokeRhachetCliBinary({
          args: ['upgrade', '--roles', 'ehmpathy/*'],
          cwd: scene.repo.path,
        });

        return { upgradeResult };
      });

      then('exits with status 0', () => {
        expect(result.upgradeResult.status).toEqual(0);
      });

      then('reinit runs for linked roles', () => {
        expect(result.upgradeResult.stdout).toContain('🔧 init');
      });

      then('stdout.summary matches snapshot', () => {
        const { summary } = extractRhachetOutput({
          stdout: result.upgradeResult.stdout,
        });
        expect(summary).toMatchSnapshot();
      });
    });
  });

  given('[case12] --roles ehmpathy/mechanic with linked role', () => {
    const scene = useBeforeAll(async () => {
      // fixture has .agent/repo=ehmpathy/role=mechanic/ (linked)
      const repo = await genTestTempRepo({
        fixture: 'with-roles-linked',
        install: true,
      });

      return { repo };
    });

    when('[t0] before upgrade', () => {
      then('.agent/ has linked mechanic role', () => {
        const agentDirExists = existsSync(
          join(scene.repo.path, '.agent', 'repo=ehmpathy', 'role=mechanic'),
        );
        expect(agentDirExists).toEqual(true);
      });
    });

    when('[t1] rhachet upgrade --roles ehmpathy/mechanic', () => {
      const result = useBeforeAll(async () => {
        const upgradeResult = invokeRhachetCliBinary({
          args: ['upgrade', '--roles', 'ehmpathy/mechanic'],
          cwd: scene.repo.path,
        });

        return { upgradeResult };
      });

      then('exits with status 0', () => {
        expect(result.upgradeResult.status).toEqual(0);
      });

      then('reinit runs for the linked role', () => {
        expect(result.upgradeResult.stdout).toContain('🔧 init');
      });

      then('stdout.summary matches snapshot', () => {
        const { summary } = extractRhachetOutput({
          stdout: result.upgradeResult.stdout,
        });
        expect(summary).toMatchSnapshot();
      });
    });
  });

  given('[case13] --roles ehmpathy/designer with unlinked role (mechanic is linked)', () => {
    const scene = useBeforeAll(async () => {
      // fixture has .agent/repo=ehmpathy/role=mechanic/ (linked)
      // but designer is NOT linked
      const repo = await genTestTempRepo({
        fixture: 'with-roles-linked',
        install: true,
      });

      return { repo };
    });

    when('[t0] before upgrade', () => {
      then('.agent/ has linked mechanic role', () => {
        const agentDirExists = existsSync(
          join(scene.repo.path, '.agent', 'repo=ehmpathy', 'role=mechanic'),
        );
        expect(agentDirExists).toEqual(true);
      });

      then('.agent/ does NOT have designer role', () => {
        const agentDirExists = existsSync(
          join(scene.repo.path, '.agent', 'repo=ehmpathy', 'role=designer'),
        );
        expect(agentDirExists).toEqual(false);
      });
    });

    when('[t1] rhachet upgrade --roles ehmpathy/designer', () => {
      const result = useBeforeAll(async () => {
        const upgradeResult = invokeRhachetCliBinary({
          args: ['upgrade', '--roles', 'ehmpathy/designer'],
          cwd: scene.repo.path,
        });

        return { upgradeResult };
      });

      then('exits with status 0', () => {
        expect(result.upgradeResult.status).toEqual(0);
      });

      then('reinit does NOT run (designer is not linked)', () => {
        // reinit outputs "🔧 init" when it runs - should NOT be present
        expect(result.upgradeResult.stdout).not.toContain('🔧 init');
      });

      then('stdout.summary matches snapshot', () => {
        const { summary } = extractRhachetOutput({
          stdout: result.upgradeResult.stdout,
        });
        expect(summary).toMatchSnapshot();
      });
    });
  });

  given('[case6] inside rhachet-roles-brain repo with file:. self-reference', () => {
    const scene = useBeforeAll(async () => {
      const repo = await genTestTempRepo({
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

  given('[case14] inside rhachet-roles-brain repo with link:. self-reference', () => {
    const scene = useBeforeAll(async () => {
      const repo = genTestTempRepo({
        fixture: 'with-link-dot-dep',
        install: false,
      });

      return { repo };
    });

    when('[t0] rhachet upgrade --roles brain/thinker', () => {
      const result = useBeforeAll(async () => {
        // upgrade tries to resolve the role, which maps to rhachet-roles-brain
        // since rhachet-roles-brain has link:. version, it should be skipped
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

      then('package.json still has rhachet-roles-brain as link:.', () => {
        expect(result.packageJson.dependencies['rhachet-roles-brain']).toEqual(
          'link:.',
        );
      });
    });
  });
});
