import type { Command } from 'commander';
import { BadRequestError } from 'helpful-errors';

import type { ContextConfigOfUsage } from '@src/domain.operations/config/ContextConfigOfUsage';
import { getRoleBySpecifier } from '@src/domain.operations/invoke/getRoleBySpecifier';
import { execRoleInits } from '@src/domain.operations/invoke/init/execRoleInits';

/**
 * .what = adds the "roles init" subcommand to the CLI
 * .why = executes role initialization commands after link
 * .how = delegates to execRoleInits for shared init logic
 *
 * .note = for single init execution, use `run --init <slug>` instead
 * .note = uses getRoleBySpecifier for unified explicit/implicit resolution
 */
export const invokeRolesInit = (
  { command }: { command: Command },
  context: ContextConfigOfUsage,
): void => {
  command
    .command('init')
    .description('execute role initialization commands (run-all mode)')
    .option('--repo <slug>', 'the repository slug for the role')
    .option('--role <slug>', 'the role to initialize')
    .action(async (opts: { repo?: string; role?: string }) => {
      if (!opts.role)
        BadRequestError.throw('--role is required (e.g., --role mechanic)');

      // resolve role via unified lookup
      const resolved = await getRoleBySpecifier(
        { role: opts.role, repo: opts.repo },
        context,
      );

      // execute init commands
      const result = await execRoleInits({
        role: resolved.role,
        repo: resolved.repo,
      });

      // show message if no init commands
      if (result.commandsTotal === 0) {
        console.log(``);
        console.log(
          `⚠️  Role "${resolved.role.slug}" has no initialization commands.`,
        );
        console.log(``);
        return;
      }

      console.log(``);
      console.log(
        `✨ repo=${resolved.repo.slug}/role=${resolved.role.slug} init complete`,
      );
      console.log(``);
    });
};
