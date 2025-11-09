import { Command } from 'commander';

import { RoleRegistry } from '../sdk';
import { invokeRolesBoot } from './invokeRolesBoot';
import { invokeRolesLink } from './invokeRolesLink';

/**
 * .what = adds the "roles" command to the CLI with subcommands
 * .why = manages role resources (briefs and skills) in .agent/ directory structure
 * .how = registers "link" and "boot" subcommands under "roles"
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
    .description('manage role resources (link, boot)');

  invokeRolesLink({ command: rolesCommand, registries });
  invokeRolesBoot({ command: rolesCommand });
};
