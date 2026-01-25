import type { Command } from 'commander';

import { genContextCli } from '@src/domain.objects/ContextCli';
import { execUpgrade } from '@src/domain.operations/upgrade/execUpgrade';

/**
 * .what = adds the "upgrade" command to the CLI
 * .why = enables upgrade of rhachet, role, and brain packages to latest versions
 */
export const invokeUpgrade = ({ program }: { program: Command }): void => {
  program
    .command('upgrade')
    .description(
      'upgrade rhachet, role, and/or brain packages to latest versions',
    )
    .option('--self', 'upgrade rhachet itself')
    .option(
      '--roles <roles...>',
      'role specifiers to upgrade (* for all linked)',
    )
    .option(
      '--brains <brains...>',
      'brain specifiers to upgrade (* for all installed)',
    )
    .action(
      async (options: {
        self?: boolean;
        roles?: string[];
        brains?: string[];
      }) => {
        const context = await genContextCli({ cwd: process.cwd() });
        const result = await execUpgrade(
          {
            self: options.self,
            roleSpecs: options.roles,
            brainSpecs: options.brains,
          },
          context,
        );

        // summary
        console.log('');
        if (result.upgradedSelf) {
          console.log('✨ rhachet upgraded');
        }
        if (result.upgradedRoles.length > 0) {
          console.log(
            `✨ ${result.upgradedRoles.length} role(s) upgraded: ${result.upgradedRoles.map((r) => `${r.repo}/${r.role}`).join(', ')}`,
          );
        }
        if (result.upgradedBrains.length > 0) {
          console.log(
            `✨ ${result.upgradedBrains.length} brain(s) upgraded: ${result.upgradedBrains.join(', ')}`,
          );
        }
        console.log('');
      },
    );
};
