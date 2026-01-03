import type { Command } from 'commander';
import { BadRequestError } from 'helpful-errors';

import type { RoleRegistry } from '@src/domain.objects/RoleRegistry';
import { bootRoleResources } from '@src/domain.operations/invoke/bootRoleResources';
import { inferRepoByRole } from '@src/domain.operations/invoke/inferRepoByRole';

/**
 * .what = adds the "roles boot" subcommand to the CLI
 * .why = outputs role resources (briefs and skills) with stats for context loading
 * .how = resolves repo and role, then delegates to bootRoleResources
 */
export const invokeRolesBoot = ({
  command,
  registries,
}: {
  command: Command;
  registries: RoleRegistry[];
}): void => {
  command
    .command('boot')
    .description('boot context from role resources (briefs and skills)')
    .option('--repo <slug>', 'the repository slug for the role')
    .option('--role <slug>', 'the role to boot resources for')
    .option(
      '--if-present',
      'exit silently if role directory does not exist (no error)',
    )
    .action(
      async (opts: { repo?: string; role?: string; ifPresent?: boolean }) => {
        // require --role for all cases
        if (!opts.role)
          BadRequestError.throw('--role is required (e.g., --role mechanic)');
        const slugRole = opts.role;

        // resolve slugRepo
        const slugRepo = (() => {
          // normalize "this"/"THIS"/".this" to ".this"
          const normalized = opts.repo?.trim().toLowerCase();
          if (normalized === 'this' || normalized === '.this') return '.this';

          // otherwise lookup from registries
          const repo = opts.repo
            ? registries.find((r) => r.slug === opts.repo)
            : inferRepoByRole({ registries, slugRole });
          if (!repo)
            BadRequestError.throw(`No repo found with slug "${opts.repo}"`);
          return repo.slug;
        })();

        // boot the role resources
        await bootRoleResources({
          slugRepo,
          slugRole,
          ifPresent: opts.ifPresent ?? false,
        });
      },
    );
};
