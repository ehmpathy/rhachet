import type { RoleRegistryManifest } from '@src/domain.objects';
import type { ContextCli } from '@src/domain.objects/ContextCli';

import { createRequire } from 'node:module';
import { dirname } from 'node:path';
import { discoverRolePackages } from '../init/discoverRolePackages';
import { getRoleRegistryManifest } from '../manifest/getRoleRegistryManifest';
import type { HasPackageRoot } from './ContextConfigOfUsage';

/**
 * .what = discovers role registries from rhachet-roles-* packages via manifest
 * .why = enables init --roles to find roles from installed packages
 *
 * .note = returns manifests with packageRoot for path resolution
 * .note = packages without rhachet.repo.yml are collected as errors
 */
export const getRoleRegistriesByConfigImplicit = async (
  context: ContextCli,
): Promise<{
  manifests: HasPackageRoot<RoleRegistryManifest>[];
  errors: { packageName: string; error: Error }[];
}> => {
  // find rhachet-roles-* packages
  const packageNames = await discoverRolePackages(context);

  // create require from repo root for package resolution
  const require = createRequire(`${context.gitroot}/package.json`);

  // resolve each package and load manifest
  const manifests: HasPackageRoot<RoleRegistryManifest>[] = [];
  const errors: { packageName: string; error: Error }[] = [];

  for (const packageName of packageNames) {
    try {
      // resolve package root via package.json (main export depth is unpredictable)
      const packageJsonPath = require.resolve(`${packageName}/package.json`);
      const packageRoot = dirname(packageJsonPath);

      // load manifest directly (no cast to registry)
      const manifest = getRoleRegistryManifest({ packageRoot });
      manifests.push({ ...manifest, packageRoot });
    } catch (error) {
      if (!(error instanceof Error)) throw error;

      // collect error and continue — broken packages shouldn't halt init
      errors.push({ packageName, error });
    }
  }

  return { manifests, errors };
};
