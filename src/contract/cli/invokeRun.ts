import type { Command } from 'commander';
import { BadRequestError } from 'helpful-errors';

import { executeSkill } from '@src/domain.operations/invoke/executeSkill';
import { findUniqueSkillExecutable } from '@src/domain.operations/invoke/findUniqueSkillExecutable';

/**
 * .what = extracts all args after 'run' command from process.argv
 * .why = captures full arg list for passthrough to skill
 */
const getRawArgsAfterRun = (): string[] => {
  const argv = process.argv;
  const runIdx = argv.indexOf('run');
  if (runIdx === -1) return [];
  return argv.slice(runIdx + 1);
};

/**
 * .what = adds the "run" command to the CLI
 * .why = discovers and executes skills from linked role directories
 */
export const invokeRun = ({ program }: { program: Command }): void => {
  program
    .command('run')
    .description('run a skill from linked role directories')
    .option('-s, --skill <slug>', 'the skill to execute')
    .option('--repo <slug>', 'filter to specific repo')
    .option('--role <slug>', 'filter to specific role')
    .allowUnknownOption(true)
    .allowExcessArguments(true)
    .action(async (opts: { skill?: string; repo?: string; role?: string }) => {
      // validate skill is provided
      if (!opts.skill)
        BadRequestError.throw(
          '--skill is required (e.g., --skill init.claude)',
        );

      // find unique skill
      const skill = findUniqueSkillExecutable({
        repoSlug: opts.repo,
        roleSlug: opts.role,
        skillSlug: opts.skill,
      });

      // log which skill will run
      console.log(``);
      console.log(
        `🌊 skill "${skill.slug}" from repo=${skill.repoSlug} role=${skill.roleSlug}`,
      );
      console.log(``);

      // get all args after 'run' for passthrough
      const rawArgs = getRawArgsAfterRun();

      // execute with all args passed through
      executeSkill({ skill, args: rawArgs });
    });
};
