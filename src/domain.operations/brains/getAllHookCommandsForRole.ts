import { MalfunctionError } from 'helpful-errors';

import type { RoleLinkRef } from '@src/domain.objects/RoleLinkRef';
import type { RoleRegistry } from '@src/domain.objects/RoleRegistry';
import { toRolePackageFromRepo } from '@src/domain.objects/RoleSupplierSlug';
import { importPackageExports } from '@src/infra/importEsmSafe/importPackageExports';

import { asHookCommandsOfRegistryRole } from './asHookCommandsOfRegistryRole';

/**
 * .what = every hook command one linked package role declares, on each brain event
 * .why = the one narrow read of a role's hook commands, so a caller that needs one role's
 *        commands never loads every linked package
 *
 * .note = a package that fails to load, or lacks the role, is returned as an error, never as
 *   an empty list: with no hooks to read, a caller could not tell "no hooks" from "unread"
 */
export const getAllHookCommandsForRole = async (input: {
  ref: RoleLinkRef;
  gitroot: string;
}): Promise<
  { commands: string[]; error: null } | { commands: null; error: Error }
> => {
  // load only the package of this role
  const packageName = toRolePackageFromRepo(input.ref.repo);
  const loaded = await importPackageExports<{
    getRoleRegistry?: () => RoleRegistry;
  }>({ packageName, fromPackageJson: `${input.gitroot}/package.json` });
  if (!loaded.ok)
    return {
      commands: null,
      error:
        loaded.error instanceof Error
          ? loaded.error
          : new MalfunctionError(
              `failed to load package: ${String(loaded.error)}`,
            ),
    };

  // a package with no registry, a malformed one, or one with no such role has no readable hooks
  const registry = (() => {
    try {
      return loaded.module.getRoleRegistry?.() ?? null;
    } catch (error: unknown) {
      if (!(error instanceof Error)) throw error;
      return error;
    }
  })();
  if (registry instanceof Error) return { commands: null, error: registry };
  if (!registry?.roles)
    return {
      commands: null,
      error: new MalfunctionError(
        `package ${packageName} does not export getRoleRegistry`,
      ),
    };

  // every command the role declares, on every brain event
  return asHookCommandsOfRegistryRole({ registry, role: input.ref.role });
};
