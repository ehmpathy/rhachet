import type { Command } from 'commander';

import type { ContextConfigOfUsage } from '@src/domain.operations/config/ContextConfigOfUsage';

import { invokeRolesBoot } from './invokeRolesBoot';
import { invokeRolesCost } from './invokeRolesCost';
import { invokeRolesInit } from './invokeRolesInit';
import { invokeRolesLink } from './invokeRolesLink';

/**
 * .what = adds the "roles" command to the CLI with subcommands
 * .why = manages role resources (briefs, skills, inits) in .agent/ directory structure
 * .how = registers "link", "init", "boot", and "cost" subcommands under "roles"
 *
 * .note = link/init subcommands use implicit registries (from packages)
 * .note = boot/cost subcommands work directly from .agent/ filesystem
 */
export const invokeRoles = (
  { program }: { program: Command },
  context: ContextConfigOfUsage,
): void => {
  const rolesCommand = program
    .command('roles')
    .description('manage role resources (link, init, boot, cost)');

  invokeRolesLink({ command: rolesCommand }, context);
  invokeRolesInit({ command: rolesCommand }, context);
  invokeRolesBoot({ command: rolesCommand });
  invokeRolesCost({ command: rolesCommand });
};
