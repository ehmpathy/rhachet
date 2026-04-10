import { spawnSync } from 'node:child_process';

/**
 * .what = detects if pnpm is available globally
 * .why = prefer pnpm over npm for global installs
 */
export const isPnpmAvailable = (): boolean => {
  const result = spawnSync('which', ['pnpm'], {
    stdio: 'pipe',
    shell: true,
  });
  return result.status === 0;
};

/**
 * .what = executes global install for specified packages
 * .why = enables upgrade of global rhachet install
 *
 * .note = uses pnpm if available, falls back to npm
 * .note = fails fast on EACCES/EPERM errors
 * .note = uses stdio inherit for real-time output
 */
export const execNpmInstallGlobal = (input: {
  packages: string[];
}): { upgraded: boolean } => {
  const packagesLatest = input.packages.map((p) => `${p}@latest`);

  // detect package manager: prefer pnpm
  const usePnpm = isPnpmAvailable();
  const pm = usePnpm ? 'pnpm' : 'npm';
  const args = usePnpm
    ? ['add', '-g', ...packagesLatest]
    : ['install', '-g', ...packagesLatest];

  // log what we're about to do with treestruct format
  console.log('');
  console.log(`📦 upgrade (${pm} -g)`);
  packagesLatest.forEach((pkg, i) => {
    const isLast = i === packagesLatest.length - 1;
    const prefix = isLast ? '└──' : '├──';
    console.log(`   ${prefix} ${pkg}`);
  });
  console.log('');

  const result = spawnSync(pm, args, {
    stdio: 'inherit',
    shell: true,
  });

  if (result.status !== 0) {
    throw new Error(`global install failed with exit code ${result.status}`);
  }

  return { upgraded: true };
};
