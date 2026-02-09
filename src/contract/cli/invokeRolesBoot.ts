import type { Command } from 'commander';
import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';

import { bootRoleResources } from '@src/domain.operations/invoke/bootRoleResources';
import { findUniqueRoleDir } from '@src/domain.operations/invoke/findUniqueRoleDir';

/**
 * .what = adds the "roles boot" subcommand to the CLI
 * .why = outputs role resources (briefs and skills) with stats for context load
 * .how = resolves repo and role via .agent/ scan, then delegates to bootRoleResources
 */
export const invokeRolesBoot = ({ command }: { command: Command }): void => {
  command
    .command('boot')
    .description('boot context from role resources (briefs and skills)')
    .option('--repo <slug>', 'the repository slug for the role')
    .option('--role <slug>', 'the role to boot resources for')
    .option(
      '--if-present',
      'exit silently if role directory does not exist (no error)',
    )
    .option(
      '--subject <slugs>',
      'boot specific subjects (comma-separated, subject mode only)',
    )
    .action(
      async (opts: {
        repo?: string;
        role?: string;
        ifPresent?: boolean;
        subject?: string;
      }) => {
        // require --role for all cases
        if (!opts.role)
          BadRequestError.throw('--role is required (e.g., --role mechanic)');

        // discover role dir from .agent/
        const roleDir = findUniqueRoleDir({
          slugRepo: opts.repo,
          slugRole: opts.role,
          ifPresent: opts.ifPresent,
        });

        // skip if role not found and --if-present
        if (!roleDir) {
          if (!opts.ifPresent)
            throw new UnexpectedCodePathError(
              'roleDir null without ifPresent',
              {
                opts,
              },
            );
          console.log(`🫧 role not present, skipped`);
          return;
        }

        // parse subject option
        const subjects = opts.subject
          ? opts.subject.split(',').map((s) => s.trim())
          : undefined;

        // boot the role resources
        await bootRoleResources({
          slugRepo: roleDir.slugRepo,
          slugRole: roleDir.slugRole,
          ifPresent: opts.ifPresent ?? false,
          subjects,
        });
      },
    );
};
