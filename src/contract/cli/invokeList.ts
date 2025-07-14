import { Command } from 'commander';
import { BadRequestError } from 'helpful-errors';

import { assureFindRole } from '../../logic/invoke/assureFindRole';
import { RoleRegistry } from '../sdk';

/**
 * .what = adds the "list" command to the CLI
 * .why = lets users list all available roles or skills across multiple registries
 */
export const invokeList = ({
  program,
  registries,
}: {
  program: Command;
  registries: RoleRegistry[];
}): void => {
  program
    .command('list')
    .description('list available roles or skills under a role')
    .option('--registry <slug>', 'list roles under this registry')
    .option('--role <slug>', 'list skills under this role (registry optional)')
    .action((opts: { registry?: string; role?: string }) => {
      if (opts.role) {
        const role = assureFindRole({ registries, slug: opts.role });
        if (!role) BadRequestError.throw(`no role named "${opts.role}"`);

        console.log(``);
        console.log(`📖 ${role.slug}.skills =`);
        for (const skill of role.skills)
          console.log(`  - ${role.slug}.${skill.slug}`);
        console.log(``);
        return;
      }

      if (opts.registry) {
        const registry = registries.find((r) => r.slug === opts.registry);
        if (!registry)
          BadRequestError.throw(`no registry named "${opts.registry}"`);

        console.log(``);
        console.log(`📖 ${registry.slug}.roles =`);
        for (const role of registry.roles)
          console.log(`  - ${role.slug}; purpose = ${role.purpose}`);
        console.log(``);
        return;
      }

      console.log(``);
      console.log(`📖 all.roles =`);
      const allRoles = registries.flatMap((registry) =>
        registry.roles.map(
          (role) => `${registry.slug}.${role.slug}; purpose = ${role.purpose}`,
        ),
      );
      for (const name of allRoles.sort()) console.log(`  - ${name}`);
      console.log(``);
    });
};
