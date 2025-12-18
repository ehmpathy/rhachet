import type { Command } from 'commander';

import type { RoleRegistry } from '@src/contract/sdk';

import { invokeRolesBoot } from './invokeRolesBoot';
import { invokeRolesCost } from './invokeRolesCost';
import { invokeRolesLink } from './invokeRolesLink';

/**
 * .what = adds the "roles" command to the CLI with subcommands
 * .why = manages role resources (briefs and skills) in .agent/ directory structure
 * .how = registers "link", "boot", and "cost" subcommands under "roles"
 */
export const invokeRoles = ({
  program,
  registries,
}: {
  program: Command;
  registries: RoleRegistry[];
}): void => {
  const rolesCommand = program
    .command('roles')
    .description('manage role resources (link, boot, cost)');

  invokeRolesLink({ command: rolesCommand, registries });
  invokeRolesBoot({ command: rolesCommand, registries });
  invokeRolesCost({ command: rolesCommand, registries });
};
