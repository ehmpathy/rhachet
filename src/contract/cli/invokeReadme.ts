import type { Command } from 'commander';
import { BadRequestError } from 'helpful-errors';

import { assureFindRole } from '../../logic/invoke/assureFindRole';
import type { RoleRegistry } from '../sdk';

/**
 * .what = main entrypoint for `readme` CLI command
 * .why = allows devs to introspect registry, role, or skill documentation from the CLI
 */
export const invokeReadme = ({
  program,
  registries,
}: {
  program: Command;
  registries: RoleRegistry[];
}): void => {
  program
    .command('readme')
    .description('print documentation for the registry, a role, or a skill')
    .option('--registry <slug>', 'which registry to inspect')
    .option('--role <slug>', 'which role to inspect')
    .option('--skill <slug>', 'which skill to inspect')
    .action((opts: { registry?: string; role?: string; skill?: string }) => {
      // no inputs provided
      if (!opts.registry && !opts.role)
        BadRequestError.throw('must provide --registry or --role');

      // resolve registry
      const registry = opts.registry
        ? registries.find((r) => r.slug === opts.registry)
        : null;
      if (!opts.role) {
        if (!registry)
          BadRequestError.throw(`no registry matches given options`);

        // registry level readme
        return printReadme(`${registry.slug}`, registry.readme);
      }

      // resolve role
      const role = assureFindRole({ registries, slug: opts.role });
      if (!role)
        BadRequestError.throw(
          `no role named "${opts.role}" in configured registries`,
          {
            registries: registries.map((thisRegistry) => thisRegistry.slug),
          },
        );

      // role-level readme
      if (!opts.skill) return printReadme(`${role.slug}`, role.readme);

      // resolve skill
      const skill = role.skills.refs.find((s) => s.slug === opts.skill);
      if (!skill)
        BadRequestError.throw(
          `no skill "${opts.skill}" in role "${opts.role}"`,
          { skills: role.skills.refs.map((thisSkill) => thisSkill.slug) },
        );

      // skill-level readme
      return printReadme(`${role.slug}.${skill.slug}`, skill.readme);
    });
};

/**
 * .what = logs a formatted markdown readme block with label
 * .why = standardizes output for registry/role/skill readmes in CLI
 */
const printReadme = (slug: string, markdown: string) => {
  console.log('');
  console.log(`📜 ${slug}.readme`);
  console.log('');
  console.log(indentLines(markdown));
  console.log('');
};

/**
 * .what = indents each line of a string by a fixed number of spaces
 * .why = ensures markdown blocks are consistently readable in nested output
 */
export const indentLines = (text: string, spaces = 4): string => {
  const prefix = ' '.repeat(spaces);
  return text
    .split('\n')
    .map((line) => `${prefix}${line}`)
    .join('\n');
};
