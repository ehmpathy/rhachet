import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * .what = detects current global rhachet version (if installed)
 * .why = enables check before global upgrade
 *
 * .note = uses `which rhx` to find global install, then parses wrapper or reads package.json
 * .note = handles pnpm's shell wrappers by parsing NODE_PATH or exec path
 */
export const getGlobalRhachetVersion = (): string | null => {
  const debug = process.env.DEBUG_UPGRADE === 'true';

  // find rhx binary location via which
  const whichResult = spawnSync('which', ['rhx'], {
    stdio: 'pipe',
    shell: true,
  });

  if (debug) {
    console.log('[DEBUG] which rhx status:', whichResult.status);
    console.log('[DEBUG] which rhx stdout:', whichResult.stdout?.toString());
  }

  if (whichResult.status !== 0) return null;

  const rhxPath = whichResult.stdout.toString().trim();
  if (!rhxPath) return null;

  try {
    // read the rhx file (could be symlink, shell wrapper, or binary)
    const rhxContent = readFileSync(rhxPath, 'utf-8');

    if (debug) {
      console.log(
        '[DEBUG] rhx file first 200 chars:',
        rhxContent.slice(0, 200),
      );
    }

    // pnpm creates shell wrapper with path containing rhachet@version
    // e.g., /path/.pnpm/rhachet@1.39.11_.../node_modules/rhachet/bin/rhx
    const versionMatch = rhxContent.match(/rhachet@(\d+\.\d+\.\d+)/);
    if (versionMatch?.[1]) {
      if (debug) {
        console.log('[DEBUG] found version in wrapper:', versionMatch[1]);
      }
      return versionMatch[1];
    }

    // npm symlink: extract path from realpath and find package.json
    const realPathResult = spawnSync('realpath', [rhxPath], {
      stdio: 'pipe',
      shell: true,
    });

    if (realPathResult.status === 0) {
      const realPath = realPathResult.stdout.toString().trim();
      // path is like .../node_modules/rhachet/bin/rhx, go up to package root
      const pkgRoot = realPath.replace(/\/bin\/rhx$/, '');
      const pkgJsonPath = join(pkgRoot, 'package.json');

      try {
        const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf-8')) as {
          name?: string;
          version?: string;
        };
        if (pkg.name === 'rhachet' && pkg.version) {
          if (debug) {
            console.log('[DEBUG] found package.json version:', pkg.version);
          }
          return pkg.version;
        }
      } catch {
        // package.json not found, continue
      }
    }

    return null;
  } catch {
    return null;
  }
};
