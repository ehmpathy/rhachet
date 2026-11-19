import type { RoleRegistryManifest } from '@src/domain.objects';
import type { HasPackageRoot } from '@src/domain.operations/config/ContextConfigOfUsage';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * .what = the installed package (name, version, roles) whose registry slug a role specifier names,
 *         or null where the specifier names no repo, or no installed package has that slug
 * .why = a declared role whose own package is installed, yet carries it no more, was dropped
 *        or renamed by that package. the refusal names the version, so the human knows which
 *        upgrade took it (inventory row 28)
 */
export const getRolePackageOfRepo = (input: {
  specifier: string;
  manifests: HasPackageRoot<RoleRegistryManifest>[];
}): { name: string; version: string; roles: string[] } | null => {
  // a bare role slug names no repo
  const slashIndex = input.specifier.indexOf('/');
  if (slashIndex < 0) return null;
  const repo = input.specifier.slice(0, slashIndex);

  // the installed package with that registry slug, if any
  const manifest = input.manifests.find((one) => one.slug === repo);
  if (!manifest) return null;

  // its name and version, from its own package.json
  const packageJson: { name?: unknown; version?: unknown } = JSON.parse(
    readFileSync(join(manifest.packageRoot, 'package.json'), 'utf8'),
  );
  return {
    name: typeof packageJson.name === 'string' ? packageJson.name : repo,
    version:
      typeof packageJson.version === 'string' ? packageJson.version : 'unknown',
    roles: manifest.roles.map((role) => `${repo}/${role.slug}`),
  };
};
