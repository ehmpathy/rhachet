import type { ContextCli } from '@src/domain.objects/ContextCli';

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { UpgradeExecutionError } from './UpgradeExecutionError';

/**
 * .what = detects package manager based on lock files
 * .why = use pnpm if pnpm-lock.yaml present, npm if package-lock.json present
 *
 * .note = prefers pnpm-lock.yaml over package-lock.json if both exist
 */
export const detectPackageManager = (input: {
  cwd: string;
}): 'pnpm' | 'npm' => {
  const hasPnpmLock = existsSync(join(input.cwd, 'pnpm-lock.yaml'));
  const hasNpmLock = existsSync(join(input.cwd, 'package-lock.json'));

  // prefer pnpm if its lock file exists
  if (hasPnpmLock) return 'pnpm';

  // fallback to npm if its lock file exists
  if (hasNpmLock) return 'npm';

  // default to pnpm if no lock file found
  return 'pnpm';
};

/**
 * .what = executes package install for packages at latest version
 * .why = enables upgrade of rhachet and role packages
 *
 * .note = appends @latest to each package name
 * .note = inherits stdio for real-time install output
 * .note = detects pnpm vs npm via lock file presence
 */
export const execNpmInstall = (
  input: { packages: string[] },
  context: ContextCli,
): void => {
  // handle empty input
  if (input.packages.length === 0) return;

  // detect package manager
  const pm = detectPackageManager({ cwd: context.cwd });

  // build package list with @latest
  const packagesLatest = input.packages.map((p) => `${p}@latest`);

  // log what we're about to do
  console.log(`📦 upgrade (${pm}): ${packagesLatest.join(', ')}`);

  // execute install
  const result = spawnSync(pm, ['install', ...packagesLatest], {
    cwd: context.cwd,
    stdio: 'inherit',
    shell: true,
  });

  // fail fast on error
  if (result.status !== 0) {
    throw new UpgradeExecutionError(`${pm} install failed`, {
      packages: input.packages,
      exitCode: result.status,
    });
  }
};
