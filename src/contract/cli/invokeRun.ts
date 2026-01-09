import type { Command } from 'commander';
import { BadRequestError } from 'helpful-errors';

import {
  executeInit,
  InitExecutionError,
} from '@src/domain.operations/invoke/executeInit';
import {
  executeSkill,
  SkillExecutionError,
} from '@src/domain.operations/invoke/executeSkill';
import { findUniqueInitExecutable } from '@src/domain.operations/invoke/findUniqueInitExecutable';
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
 * .what = performs run via init-mode (execute init from .agent/)
 * .why = discovers and executes init scripts from .agent/ directories
 */
const performRunViaInitMode = (input: {
  opts: { init: string; repo?: string; role?: string };
}): void => {
  // discover init via .agent/ dirs
  const init = findUniqueInitExecutable({
    slugRepo: input.opts.repo,
    slugRole: input.opts.role,
    slugInit: input.opts.init,
  });

  // log which init will run
  console.log(``);
  console.log(
    `🔧 run init repo=${init.slugRepo}/role=${init.slugRole}/init=${init.slug}`,
  );
  console.log(``);

  // get all args after 'run' for passthrough
  const rawArgs = getRawArgsAfterRun();

  // execute with all args passed through
  executeInit({ init, args: rawArgs });
};

// /**
//  * .what = performs run via actor-mode (typed solid skill on role)
//  * .why = executes a typed solid skill via actor.run with full type safety
//  *
//  * .note = actor-mode is not supported yet via bun binary
//  *         we need to support .agent/ linkage for actor-mode solid skills
//  *         for now, we only support command-mode
//  *
//  * .question = do we even need actor support via cli? or is cmd enough?
//  *             actor-mode requires registries+brains which means JIT path anyway
//  */
// const performRunViaActorMode = async (input: {
//   opts: { skill: string; role: string };
//   role: Role;
//   brains: BrainRepl[];
// }): Promise<void> => {
//   // create actor
//   const actor = genActor({ role: input.role, brains: input.brains });
//
//   // log which skill will run
//   console.log(``);
//   console.log(
//     `🪨 run solid skill role=${input.opts.role}/skill=${input.opts.skill}`,
//   );
//   console.log(``);
//
//   // parse skill input from rest of args
//   const rawArgs = getRawArgsAfterRun();
//   const skillArgs = parseArgsToObject(rawArgs, input.opts.skill);
//
//   // invoke actor.run
//   await actor.run({ skill: { [input.opts.skill]: skillArgs } });
// };

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
export const invokeRun = ({ program }: { program: Command }): void => {
  program
    .command('run')
    .description('run a solid skill (deterministic, no brain)')
    .option('-s, --skill <slug>', 'the skill to execute')
    .option('-i, --init <slug>', 'the init to execute')
    .option('--repo <slug>', 'filter to specific repo')
    .option('-r, --role <slug>', 'filter to specific role')
    .option('--attempts <int>', 'not supported for run command')
    .allowUnknownOption(true)
    .allowExcessArguments(true)
    .action(
      (opts: {
        skill?: string;
        init?: string;
        repo?: string;
        role?: string;
        attempts?: string;
      }) => {
        // validate --attempts is not used with run
        if (opts.attempts)
          BadRequestError.throw(
            '--attempts is not supported for "run" (solid skills are deterministic). use "ask --skill --attempts" for stitch-mode or "act --skill --attempts" for actor-mode.',
          );

        // determine mode
        const isInitMode = !!opts.init;
        const isCommandMode = !!opts.skill;

        // 🔧 init-mode: run init from .agent/
        if (isInitMode) {
          try {
            return performRunViaInitMode({
              opts: { init: opts.init!, repo: opts.repo, role: opts.role },
            });
          } catch (error) {
            // handle init failures cleanly without stack trace
            if (error instanceof InitExecutionError) {
              console.error(`\n⛈️ ${error.message}`);
              process.exit(error.exitCode);
            }
            throw error;
          }
        }

        // 🐚 command-mode: discover and execute shell skill
        if (isCommandMode) {
          try {
            return performRunViaCommandMode({
              opts: { skill: opts.skill!, repo: opts.repo, role: opts.role },
            });
          } catch (error) {
            // handle skill failures cleanly without stack trace
            if (error instanceof SkillExecutionError) {
              console.error(`\n⛈️ ${error.message}`);
              process.exit(error.exitCode);
            }
            throw error;
          }
        }

        // neither mode specified
        BadRequestError.throw(
          '--skill or --init is required (e.g., --skill test.speed or --init setup.claude)',
        );
      },
    );
};
