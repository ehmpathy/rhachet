import type { Command } from 'commander';

import { discoverSkillExecutables } from '@src/domain.operations/invoke/discoverSkillExecutables';
import { getSkillListTreestruct } from '@src/domain.operations/invoke/getSkillListTreestruct/getSkillListTreestruct';

/**
 * .what = prints list help treestruct to stdout
 * .why = provides discoverable list command options
 */
const emitListHelpOutput = (): void => {
  console.log(`🪨 rhx list [pattern] [--repo X] [--role X] [--all]`);
  console.log(`   └─ options`);
  console.log(
    `      ├─ [pattern]     search skills (contains, or glob if has *?[])`,
  );
  console.log(`      ├─ --repo X      filter by repo`);
  console.log(`      ├─ --role X      filter by role`);
  console.log(`      └─ --all         show all (no truncation)`);
};

/**
 * .what = adds the "list" subcommand to the "run" command
 * .why = lets users list discovered skills from .agent/ directories
 */
export const invokeRunList = ({
  runCommand,
}: {
  runCommand: Command;
}): void => {
  runCommand
    .command('list')
    .description('list available skills from .agent/ directories')
    .argument('[pattern]', 'search pattern (contains or glob)')
    .option('--repo <slug>', 'filter by repo')
    .option('--role <slug>', 'filter by role')
    .option('--all', 'show all skills (no truncation)')
    .option('-h, --help', 'show help')
    .helpOption(false) // disable built-in --help; bin/rhx translates to 'help' pattern
    .action(
      (
        pattern: string | undefined,
        opts: {
          repo?: string;
          role?: string;
          all?: boolean;
          help?: boolean;
        },
      ) => {
        // handle help request (--help/-h flag or 'help' as pattern)
        if (opts.help || pattern === 'help') return emitListHelpOutput();

        // discover skills from .agent/ directories
        const skills = discoverSkillExecutables({
          slugRepo: opts.repo,
          slugRole: opts.role,
        });

        // generate treestruct output
        const lines = getSkillListTreestruct({
          skills,
          pattern: pattern ?? null,
          truncate: !opts.all,
        });

        // print each line
        for (const line of lines) {
          console.log(line);
        }
      },
    );
};
