import type { ContextCli } from '@src/domain.objects/ContextCli';
import type { HasRepo } from '@src/domain.objects/HasRepo';
import type { Role } from '@src/domain.objects/Role';
import type { RoleRegistry } from '@src/domain.objects/RoleRegistry';

import { existsSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

/**
 * .what = discovers linked roles and loads their full Role objects with hooks
 * .why = enables hook application for roles already linked into .agent/
 *
 * .note = scans .agent/repo=* directories (skips repo=.this) to find linked roles
 * .note = imports packages dynamically to get full Role objects with hooks.onBrain
 * .note = returns HasRepo<Role> so caller knows which repo each role came from
 */
export const getLinkedRolesWithHooks = async (
  context: ContextCli,
): Promise<{
  roles: HasRepo<Role>[];
  errors: Array<{ repoSlug: string; roleSlug: string; error: Error }>;
}> => {
  const agentDir = join(context.gitroot, '.agent');

  // check if .agent/ exists
  if (!existsSync(agentDir)) {
    return { roles: [], errors: [] };
  }

  // scan for repo=* directories (skip repo=.this)
  const repoDirs = readdirSync(agentDir).filter(
    (name) => name.startsWith('repo=') && name !== 'repo=.this',
  );

  // create require from repo root for package resolution
  const require = createRequire(`${context.gitroot}/package.json`);

  const roles: HasRepo<Role>[] = [];
  const errors: Array<{ repoSlug: string; roleSlug: string; error: Error }> =
    [];

  for (const repoDir of repoDirs) {
    const repoSlug = repoDir.replace('repo=', '');
    const repoPath = join(agentDir, repoDir);

    // scan for role=* directories within this repo
    const roleDirs = readdirSync(repoPath).filter((name) =>
      name.startsWith('role='),
    );

    // try to load the full registry from the package
    let registry: RoleRegistry | null = null;
    try {
      const packageName = `rhachet-roles-${repoSlug}`;
      const packageJsonPath = require.resolve(`${packageName}/package.json`);
      const packageRoot = dirname(packageJsonPath);

      // dynamic import to get getRoleRegistry
      const pkg: { getRoleRegistry?: () => RoleRegistry } = await import(
        packageName
      );
      if (!pkg.getRoleRegistry) {
        throw new Error(
          `package ${packageName} does not export getRoleRegistry`,
        );
      }
      registry = pkg.getRoleRegistry();
    } catch (error) {
      // if we can't load the package, record error for each role
      for (const roleDir of roleDirs) {
        const roleSlug = roleDir.replace('role=', '');
        errors.push({
          repoSlug,
          roleSlug,
          error:
            error instanceof Error
              ? error
              : new Error(`failed to load package: ${String(error)}`),
        });
      }
      continue;
    }

    // for each linked role, find it in the registry and check for hooks
    for (const roleDir of roleDirs) {
      const roleSlug = roleDir.replace('role=', '');
      const role = registry.roles.find((r) => r.slug === roleSlug);

      if (!role) {
        errors.push({
          repoSlug,
          roleSlug,
          error: new Error(
            `role ${roleSlug} not found in registry ${repoSlug}`,
          ),
        });
        continue;
      }

      // only include roles that have hooks.onBrain declared
      if (role.hooks?.onBrain) {
        roles.push({ ...role, repo: registry.slug });
      }
    }
  }

  return { roles, errors };
};
