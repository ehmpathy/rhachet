import type { Command } from 'commander';
import { BadRequestError } from 'helpful-errors';

import type { ContextConfigOfUsage } from '@src/domain.operations/config/ContextConfigOfUsage';
import { getRoleBySpecifier } from '@src/domain.operations/invoke/getRoleBySpecifier';
import { execRoleLink } from '@src/domain.operations/invoke/link/execRoleLink';

/**
 * .what = adds the "roles link" subcommand to the CLI
 * .why = creates .agent/ directory structure and links role resources
 * .how = delegates to execRoleLink for shared link logic
 *
 * .note = uses getRoleBySpecifier for unified explicit/implicit resolution
 */
export const invokeRolesLink = (
  { command }: { command: Command },
  context: ContextConfigOfUsage,
): void => {
  command
    .command('link')
    .description('link role resources into .agent/ directory structure')
    .option('--repo <slug>', 'the repository slug for the role')
    .option('--role <slug>', 'the role to link resources for')
    .action(async (opts: { repo?: string; role?: string }) => {
      if (!opts.role)
        BadRequestError.throw('--role is required (e.g., --role mechanic)');

      // resolve role via unified lookup
      const resolved = await getRoleBySpecifier(
        { role: opts.role, repo: opts.repo },
        context,
      );

      console.log(``);
      execRoleLink({ role: resolved.role, repo: resolved.repo });
      console.log(``);
    });
};
