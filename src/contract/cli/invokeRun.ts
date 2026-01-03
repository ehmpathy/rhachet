import type { Command } from 'commander';
import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';

import type { BrainRepl } from '@src/domain.objects/BrainRepl';
import type { Role } from '@src/domain.objects/Role';
import type { RoleRegistry } from '@src/domain.objects/RoleRegistry';
import { genActor } from '@src/domain.operations/actor/genActor';
import {
  executeSkill,
  SkillExecutionError,
} from '@src/domain.operations/invoke/executeSkill';
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
 * .what = performs run via actor-mode (typed solid skill on role)
 * .why = executes a typed solid skill via actor.run with full type safety
 */
const performRunViaActorMode = async (input: {
  opts: { skill: string; role: string };
  role: Role;
  brains: BrainRepl[];
}): Promise<void> => {
  // create actor
  const actor = genActor({ role: input.role, brains: input.brains });

  // log which skill will run
  console.log(``);
  console.log(
    `🪨 run solid skill role=${input.opts.role}/skill=${input.opts.skill}`,
  );
  console.log(``);

  // parse skill input from remaining args
  const rawArgs = getRawArgsAfterRun();
  const skillArgs = parseArgsToObject(rawArgs, input.opts.skill);

  // invoke actor.run
  await actor.run({ skill: { [input.opts.skill]: skillArgs } });
};

/**
 * .what = performs run via command-mode (shell skill discovery)
 * .why = discovers and executes shell skills from .agent/ directories
 */
const performRunViaCommandMode = (input: {
  opts: { skill: string; repo?: string; role?: string };
}): void => {
  // discover skill via .agent/ dirs
  const skill = findUniqueSkillExecutable({
    slugRepo: input.opts.repo,
    slugRole: input.opts.role,
    slugSkill: input.opts.skill,
  });

  // log which skill will run
  console.log(``);
  console.log(
    `🪨 run solid skill repo=${skill.slugRepo}/role=${skill.slugRole}/skill=${skill.slug}`,
  );
  console.log(``);

  // get all args after 'run' for passthrough
  const rawArgs = getRawArgsAfterRun();

  // execute with all args passed through
  executeSkill({ skill, args: rawArgs });
};

/**
 * .what = adds the "run" command to the CLI
 * .why = discovers and executes solid skills (deterministic, no brain)
 */
export const invokeRun = ({
  program,
  registries,
  brains,
}: {
  program: Command;
  registries: RoleRegistry[];
  brains: BrainRepl[];
}): void => {
  program
    .command('run')
    .description('run a solid skill (deterministic, no brain)')
    .option('-s, --skill <slug>', 'the skill to execute')
    .option('--repo <slug>', 'filter to specific repo')
    .option('-r, --role <slug>', 'filter to specific role')
    .allowUnknownOption(true)
    .allowExcessArguments(true)
    .action(async (opts: { skill?: string; repo?: string; role?: string }) => {
      // validate skill is provided
      if (!opts.skill)
        BadRequestError.throw(
          '--skill is required (e.g., --skill init.claude)',
        );

      // determine which mode to use
      const allRoles = registries.flatMap((r) => r.roles);
      const roleFound = opts.role
        ? allRoles.find((r) => r.slug === opts.role)
        : undefined;
      const hasTypedSolidSkill =
        roleFound?.skills?.solid?.[opts.skill] !== undefined;

      const isActorMode = roleFound && hasTypedSolidSkill && brains.length > 0;
      const isCommandMode = !isActorMode;

      // 🪨 actor-mode: invoke typed solid skill via actor.run
      if (isActorMode)
        return await performRunViaActorMode({
          opts: { skill: opts.skill, role: opts.role! },
          role: roleFound,
          brains,
        });

      // 🐚 command-mode: discover and execute shell skill
      if (isCommandMode) {
        try {
          return performRunViaCommandMode({
            opts: { skill: opts.skill, repo: opts.repo, role: opts.role },
          });
        } catch (error) {
          // handle skill failures cleanly without stack trace
          if (error instanceof SkillExecutionError) {
            console.error(`\n⛈️ ${error.message}`);
            process.exit(1);
          }
          throw error;
        }
      }

      // neither mode matched - unexpected
      throw new UnexpectedCodePathError(
        'invokeRun: neither actor-mode nor command-mode matched',
        { opts },
      );
    });
};

/**
 * .what = parses raw CLI args into object for skill input
 * .why = converts --key value pairs to { key: value } object
 */
const parseArgsToObject = (
  rawArgs: string[],
  slugSkill: string,
): Record<string, string> => {
  const result: Record<string, string> = {};
  let i = 0;

  while (i < rawArgs.length) {
    const arg = rawArgs[i]!;

    // skip --skill, --role, --repo (already consumed)
    if (
      arg === '--skill' ||
      arg === '-s' ||
      arg === '--role' ||
      arg === '-r' ||
      arg === '--repo'
    ) {
      i += 2; // skip flag and its value
      continue;
    }

    // skip the skill slug value if it matches
    if (arg === slugSkill) {
      i++;
      continue;
    }

    // parse --key value or --key=value
    if (arg.startsWith('--')) {
      const eqIdx = arg.indexOf('=');
      if (eqIdx > 0) {
        // --key=value format
        const key = arg.slice(2, eqIdx);
        const value = arg.slice(eqIdx + 1);
        result[key] = value;
        i++;
      } else {
        // --key value format
        const key = arg.slice(2);
        const value = rawArgs[i + 1] ?? '';
        result[key] = value;
        i += 2;
      }
    } else {
      i++;
    }
  }

  return result;
};
