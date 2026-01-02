import type { Command } from 'commander';
import { BadRequestError } from 'helpful-errors';

import type { RoleRegistry } from '@src/contract/sdk';
import { assureFindRole } from '@src/domain.operations/invoke/assureFindRole';
import { executeInit } from '@src/domain.operations/invoke/executeInit';
import { findUniqueInitExecutable } from '@src/domain.operations/invoke/findUniqueInitExecutable';
import { inferRepoByRole } from '@src/domain.operations/invoke/inferRepoByRole';

import { spawnSync } from 'node:child_process';

/**
 * .what = extracts all args after 'init' command from process.argv
 * .why = captures full arg list for passthrough to init script
 */
const getRawArgsAfterInit = (): string[] => {
  const argv = process.argv;
  const initIdx = argv.indexOf('init');
  if (initIdx === -1) return [];
  return argv.slice(initIdx + 1);
};

/**
 * .what = adds the "roles init" subcommand to the CLI
 * .why = executes role initialization commands after linking
 * .how = runs Role.inits.exec commands sequentially, or a specific init via --command
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
    .option('--command <slug>', 'a specific init command to run')
    .allowUnknownOption(true)
    .allowExcessArguments(true)
    .action((opts: { repo?: string; role?: string; command?: string }) => {
      // handle --command mode: run a specific init from linked inits directory
      if (opts.command) {
        const init = findUniqueInitExecutable({
          repoSlug: opts.repo,
          roleSlug: opts.role,
          initSlug: opts.command,
        });

        // log which init will run
        console.log(``);
        console.log(
          `🔧 init "${init.slug}" from repo=${init.repoSlug} role=${init.roleSlug}`,
        );
        console.log(``);

        // get all args after 'init' for passthrough
        const rawArgs = getRawArgsAfterInit();

        // execute with all args passed through
        executeInit({ init, args: rawArgs });
        return;
      }

      // handle run-all mode: run all Role.inits.exec commands
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

      // execute each command sequentially with explicit stdin passthrough
      for (const { cmd } of execCmds) {
        console.log(`  ▸ ${cmd}`);
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
      console.log(`✨ Role "${role.slug}" initialized successfully.`);
      console.log(``);
    });
};
