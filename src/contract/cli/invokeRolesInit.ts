import type { Command } from 'commander';
import { BadRequestError } from 'helpful-errors';

import type { RoleRegistry } from '@src/contract/sdk';
import { assureFindRole } from '@src/domain.operations/invoke/assureFindRole';
import { inferRepoByRole } from '@src/domain.operations/invoke/inferRepoByRole';

import { execSync } from 'node:child_process';

/**
 * .what = adds the "roles init" subcommand to the CLI
 * .why = executes role initialization commands after linking
 * .how = runs Role.inits.exec commands sequentially from cwd
 */
export const invokeRolesInit = ({
  command,
  registries,
}: {
  command: Command;
  registries: RoleRegistry[];
}): void => {
  command
    .command('init')
    .description('execute role initialization commands')
    .option('--repo <slug>', 'the repository slug for the role')
    .option('--role <slug>', 'the role to initialize')
    .action((opts: { repo?: string; role?: string }) => {
      if (!opts.role)
        BadRequestError.throw('--role is required (e.g., --role mechanic)');

      const role = assureFindRole({ registries, slug: opts.role });
      const repo = opts.repo
        ? registries.find((r) => r.slug === opts.repo)
        : inferRepoByRole({ registries, roleSlug: opts.role });
      if (!repo)
        BadRequestError.throw(`No repo found with slug "${opts.repo}"`);

      // check if role has init commands
      const execCmds = role.inits?.exec ?? [];
      if (execCmds.length === 0) {
        console.log(``);
        console.log(`⚠️  Role "${role.slug}" has no initialization commands.`);
        console.log(``);
        return;
      }

      console.log(``);
      console.log(`🔧 Init role "${role.slug}" from repo "${repo.slug}"`);
      console.log(``);

      // execute each command sequentially
      for (const { cmd } of execCmds) {
        console.log(`  ▸ ${cmd}`);
        execSync(cmd, {
          cwd: process.cwd(),
          stdio: 'inherit',
          shell: '/bin/bash',
        });
      }

      console.log(``);
      console.log(`✨ Role "${role.slug}" initialized successfully.`);
      console.log(``);
    });
};
