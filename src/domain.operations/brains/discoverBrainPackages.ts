import * as fs from 'fs/promises';
import { ConstraintError } from 'helpful-errors';
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
  // .note = an ABSENT package.json (ENOENT) degrades to [] (no manifest → no deps to discover — a
  //   normal state, e.g. a bare cwd). that is the ONLY allowlisted failure: any OTHER read error
  //   (e.g. a permission denial) is a real fault and rethrows, rather than silently degrade to the
  //   same [] as a healthy no-brains repo (rule.forbid.failhide — allowlist, never blanket-swallow).
  let packageJsonContent: string;
  try {
    packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    if (code === 'ENOENT') return [];
    throw error;
  }

  // parse package.json
  // .note = a MALFORMED package.json (present but corrupt — a stray comma, a merge-conflict
  //   marker) is a real defect in the caller's own repo, NOT one-bad-brain-among-many. discovery
  //   parses the SINGLE root manifest; there is no set to isolate a bad member from. so we failfast
  //   + failloud (rule.forbid.failhide): a ConstraintError names the fix, rather than degrade the
  //   corrupt manifest to the same [] as a healthy no-brains repo — which would silently drop every
  //   brain (the exact bug class #429 kills).
  let packageJson: {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  try {
    packageJson = JSON.parse(packageJsonContent);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new ConstraintError(
      `package.json is not valid json: ${packageJsonPath} — ${message}`,
      { packageJsonPath, hint: 'fix the json syntax in package.json' },
    );
  }

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
