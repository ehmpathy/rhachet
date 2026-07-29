import type { ContextCli } from '@src/domain.objects/ContextCli';
import type { HasRepo } from '@src/domain.objects/HasRepo';
import type { Role } from '@src/domain.objects/Role';
import type { RoleRegistry } from '@src/domain.objects/RoleRegistry';
import { importPackageExports } from '@src/infra/importEsmSafe/importPackageExports';

import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

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
  errors: Array<{
    repoSlug: string;
    roleSlug: string;
    phase: 'load' | 'use';
    error: Error;
  }>;
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

  const roles: HasRepo<Role>[] = [];
  const errors: Array<{
    repoSlug: string;
    roleSlug: string;
    phase: 'load' | 'use';
    error: Error;
  }> = [];

  for (const repoDir of repoDirs) {
    const repoSlug = repoDir.replace('repo=', '');
    const repoPath = join(agentDir, repoDir);

    // scan for role=* directories within this repo
    const roleDirs = readdirSync(repoPath).filter((name) =>
      name.startsWith('role='),
    );

    const packageName = `rhachet-roles-${repoSlug}`;

    // record a failure for EVERY linked role in this repo, tagged by the phase that faulted
    // (load vs use) so the caller can point at the true layer — the same phase-accuracy the
    // twin getBrainHooksAdapterByConfigImplicit carries. one bad repo never sinks discovery
    // of the others (acc#3): the failure is isolated to this repo's roles (recorded in errors[],
    // surfaced by the caller), and the loop continues. observability, not a failhide.
    // .note-channel = this site returns structured errors[] (its caller owns presentation); its
    //   two package-load peers differ by consumer BY DESIGN — getAvailableBrains/
    //   getBrainsFromPackageExports warn via console.warn, getBrainHooksAdapterByConfigImplicit
    //   emits via console.error. the divergence is a deliberate per-consumer contract, not drift.
    const recordRepoFailure = (error: unknown, phase: 'load' | 'use'): void => {
      for (const roleDir of roleDirs) {
        errors.push({
          repoSlug,
          roleSlug: roleDir.replace('role=', ''),
          phase,
          error:
            error instanceof Error
              ? error
              : new Error(`failed to load package: ${String(error)}`),
        });
      }
    };

    // phase 1 — load the package (caller-rooted, esm-safe, isolated as a union) via the
    // shared importPackageExports leaf, the one resolution strategy across all load sites
    const loaded = await importPackageExports<{
      getRoleRegistry?: () => RoleRegistry;
    }>({
      packageName,
      fromPackageJson: `${context.gitroot}/package.json`,
    });
    if (!loaded.ok) {
      recordRepoFailure(loaded.error, 'load');
      continue;
    }

    // phase 2 — read the registry and its roles. a loaded-but-malformed registry (e.g. from
    // a stale/incompatible version, `.roles` absent) throws HERE; the catch isolates it to
    // this repo (not the load), so the loop continues to the next repo (acc#3).
    try {
      if (!loaded.module.getRoleRegistry) {
        throw new Error(
          `package ${packageName} does not export getRoleRegistry`,
        );
      }
      const registry = loaded.module.getRoleRegistry();

      // for each linked role, find it in the registry and check for hooks
      for (const roleDir of roleDirs) {
        const roleSlug = roleDir.replace('role=', '');
        const role = registry.roles.find((r) => r.slug === roleSlug);

        if (!role) {
          // use-phase: the registry loaded fine, but this role is absent from it
          errors.push({
            repoSlug,
            roleSlug,
            phase: 'use',
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
    } catch (error) {
      recordRepoFailure(error, 'use');
    }
  }

  return { roles, errors };
};
