import type { Command } from 'commander';

import type { RoleRegistry } from '../sdk';
import { invokeBriefsBoot } from './invokeBriefsBoot';
import { invokeBriefsLink } from './invokeBriefsLink';

/**
 * .what = adds the "briefs" command to the CLI with subcommands
 * .why = manages role briefs (link from node_modules, boot/print context)
 * .how = registers "link" and "boot" subcommands under "briefs"
 */
export const invokeBriefs = ({
  program,
  registries,
}: {
  program: Command;
  registries: RoleRegistry[];
}): void => {
  const briefsCommand = program
    .command('briefs')
    .description('manage role briefs (link, boot)');

  invokeBriefsLink({ command: briefsCommand, registries });
  invokeBriefsBoot({ command: briefsCommand });
};
