import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * .what = identifies dependencies with local ref version specifiers (file: or link:)
 * .why = these dependencies should be excluded from upgrade (local refs)
 */
export const getLocalRefDependencies = (input: {
  cwd: string;
}): Set<string> => {
  const packageJsonPath = join(input.cwd, 'package.json');

  // handle absent package.json gracefully
  if (!existsSync(packageJsonPath)) return new Set();

  // read and parse package.json
  const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  // merge all dependencies
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

  // filter to local ref versions (file: or link:)
  const localRefDeps = new Set<string>();
  for (const [name, version] of Object.entries(allDeps)) {
    if (version.startsWith('file:') || version.startsWith('link:')) {
      localRefDeps.add(name);
    }
  }

  return localRefDeps;
};

/**
 * @deprecated use getLocalRefDependencies instead
 */
export const getFileDotDependencies = getLocalRefDependencies;
