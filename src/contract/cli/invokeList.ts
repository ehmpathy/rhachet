import type { Command } from 'commander';
import { BadRequestError } from 'helpful-errors';

import type { ContextConfigOfUsage } from '@src/domain.operations/config/ContextConfigOfUsage';
import { assureFindRole } from '@src/domain.operations/invoke/assureFindRole';

/**
 * .what = adds the "list" command to the CLI
 * .why = lets users list all available roles or skills across multiple registries
 *
 * .note = requires explicit config (rhachet.use.ts)
 */
export const invokeList = (
  { program }: { program: Command },
  context: ContextConfigOfUsage,
): void => {
  program
    .command('list')
    .description('list available roles or skills under a role')
    .option('--repo <slug>', 'list roles under this repo')
    .option('--role <slug>', 'list skills under this role (repo optional)')
    .action(async (opts: { repo?: string; role?: string }) => {
      // load registries just-in-time
      const registries = (await context.config.usage.get.registries.explicit())
        .registries;

      // list skills for a specific role
      if (opts.role) {
        const role = assureFindRole({ registries, slug: opts.role });
        if (!role) BadRequestError.throw(`no role named "${opts.role}"`);

        console.log(``);
        console.log(`📖 ${role.slug}`);
        const skills = role.skills.refs;
        for (let i = 0; i < skills.length; i++) {
          const isLast = i === skills.length - 1;
          const prefix = isLast ? '└── ' : '├── ';
          console.log(`${prefix}${skills[i]!.slug}`);
        }
        console.log(``);
        return;
      }

      // list roles for a specific repo
      if (opts.repo) {
        const registry = registries.find((r) => r.slug === opts.repo);
        if (!registry) BadRequestError.throw(`no repo named "${opts.repo}"`);

        console.log(``);
        console.log(`📖 ${registry.slug}`);
        const roles = registry.roles;
        for (let i = 0; i < roles.length; i++) {
          const isLast = i === roles.length - 1;
          const prefix = isLast ? '└── ' : '├── ';
          console.log(`${prefix}${roles[i]!.slug}: ${roles[i]!.purpose}`);
        }
        console.log(``);
        return;
      }

      // list all repos and roles
      console.log(``);
      console.log(`📖 repos`);
      for (let i = 0; i < registries.length; i++) {
        const registry = registries[i]!;
        const isLastRegistry = i === registries.length - 1;
        const registryPrefix = isLastRegistry ? '└── ' : '├── ';
        const childPrefix = isLastRegistry ? '    ' : '│   ';

        console.log(`${registryPrefix}${registry.slug}`);
        const roles = registry.roles;
        for (let j = 0; j < roles.length; j++) {
          const isLastRole = j === roles.length - 1;
          const rolePrefix = isLastRole ? '└── ' : '├── ';
          console.log(
            `${childPrefix}${rolePrefix}${roles[j]!.slug}: ${roles[j]!.purpose}`,
          );
        }
      }
      console.log(``);
    });
};
