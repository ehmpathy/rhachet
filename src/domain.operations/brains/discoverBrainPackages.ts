import * as fs from 'fs/promises';
import * as path from 'path';

import type { ContextCli } from '@src/domain.objects/ContextCli';

/**
 * .what = scans package.json for rhachet-brains-* dependencies
 * .why = enables implicit discovery of brain supplier packages
 */
export const discoverBrainPackages = async (
  context: ContextCli,
): Promise<string[]> => {
  const packageJsonPath = path.join(context.cwd, 'package.json');

  // read package.json
  let packageJsonContent: string;
  try {
    packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
  } catch {
    return [];
  }

  // parse package.json
  const packageJson = JSON.parse(packageJsonContent) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  // find all rhachet-brains-* packages
  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  const brainPackages = Object.keys(allDeps).filter((name) =>
    name.startsWith('rhachet-brains-'),
  );

  return brainPackages;
};
