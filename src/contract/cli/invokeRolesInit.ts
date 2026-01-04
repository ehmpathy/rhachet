import type { Command } from 'commander';
import { BadRequestError } from 'helpful-errors';

import type { RoleRegistry } from '@src/contract/sdk';
import { assureFindRole } from '@src/domain.operations/invoke/assureFindRole';
import { inferRepoByRole } from '@src/domain.operations/invoke/inferRepoByRole';

import { spawnSync } from 'node:child_process';
import * as path from 'node:path';

/**
 * .what = adds the "roles init" subcommand to the CLI
 * .why = executes role initialization commands after link
 * .how = runs Role.inits.exec commands sequentially
 *
 * .note = for single init execution, use `run --init <slug>` instead
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
    .description('execute role initialization commands (run-all mode)')
    .option('--repo <slug>', 'the repository slug for the role')
    .option('--role <slug>', 'the role to initialize')
    .action((opts: { repo?: string; role?: string }) => {
      // run all Role.inits.exec commands
      if (!opts.role)
        BadRequestError.throw('--role is required (e.g., --role mechanic)');

      const role = assureFindRole({ registries, slug: opts.role });
      const repo = opts.repo
        ? registries.find((r) => r.slug === opts.repo)
        : inferRepoByRole({ registries, slugRole: opts.role });
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
      console.log(`🔧 run init repo=${repo.slug}/role=${role.slug}`);

      // execute each command sequentially with explicit stdin passthrough
      for (let i = 0; i < execCmds.length; i++) {
        const { cmd } = execCmds[i]!;
        const cmdRelative = path.relative(process.cwd(), cmd);
        const branch = i === execCmds.length - 1 ? '└─' : '├─';
        console.log(`   ${branch} ${cmdRelative}`);
        const result = spawnSync(cmd, [], {
          cwd: process.cwd(),
          stdio: [process.stdin, process.stdout, process.stderr],
          shell: '/bin/bash',
        });

        // propagate non-zero exit codes
        if (result.status !== 0) {
          process.exit(result.status ?? 1);
        }
      }

      console.log(``);
      console.log(`✨ repo=${repo.slug}/role=${role.slug} init complete`);
      console.log(``);
    });
};
