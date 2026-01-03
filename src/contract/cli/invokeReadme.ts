import type { Command } from 'commander';
import { BadRequestError } from 'helpful-errors';

import type { RoleRegistry } from '@src/contract/sdk';
import { assureFindRole } from '@src/domain.operations/invoke/assureFindRole';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

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
    .option('--repo <slug>', 'which repo to inspect')
    .option('--role <slug>', 'which role to inspect')
    .option('--skill <slug>', 'which skill to inspect')
    .action((opts: { repo?: string; role?: string; skill?: string }) => {
      // no inputs provided
      if (!opts.repo && !opts.role)
        BadRequestError.throw('must provide --repo or --role');

      // resolve registry by repo slug
      const registry = opts.repo
        ? registries.find((r) => r.slug === opts.repo)
        : null;
      if (!opts.role) {
        if (!registry) BadRequestError.throw(`no repo matches given options`);

        // repo level readme
        const repoReadmeContent = readFileSync(
          resolve(process.cwd(), registry.readme.uri),
          'utf-8',
        );
        return printReadme(`${registry.slug}`, repoReadmeContent);
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
      if (!opts.skill) {
        const roleReadmeContent = readFileSync(
          resolve(process.cwd(), role.readme.uri),
          'utf-8',
        );
        return printReadme(`${role.slug}`, roleReadmeContent);
      }

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
