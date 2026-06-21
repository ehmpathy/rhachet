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

import { invokeRunList } from './invokeRunList';

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
    `💪 init role repo=${init.slugRepo}/role=${init.slugRole}/init=${init.slug}`,
  );
  console.log(``);

  // get all args after 'run' for passthrough
  const rawArgs = getRawArgsAfterRun();

  // execute with all args passed through
  executeInit({ init, args: rawArgs });
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
 * .what = prints help treestruct to stdout
 * .why = provides discoverable command reference
 */
const emitHelpOutput = (): void => {
  console.log(`🪨 rhx [command] [...args]`);
  console.log(`   ├─ commands`);
  console.log(`   │  ├─ [skill]     run a skill (default)`);
  console.log(`   │  ├─ list        show available skills`);
  console.log(`   │  ├─ keyrack     manage credentials`);
  console.log(`   │  ├─ enroll      enroll brain in role`);
  console.log(`   │  └─ upgrade     upgrade rhachet`);
  console.log(`   └─ options`);
  console.log(
    `      ├─ --skill X   run skill by name (required, or use positional)`,
  );
  console.log(`      ├─ --init X    run init by name`);
  console.log(`      ├─ --repo X    filter to specific repo`);
  console.log(`      └─ --role X    filter to specific role`);
  console.log(``);
  console.log(`ref: https://github.com/ehmpathy/rhachet#readme`);
};

/**
 * .what = adds the "run" command to the CLI
 * .why = discovers and executes solid skills (deterministic, no brain)
 */
export const invokeRun = ({ program }: { program: Command }): void => {
  const runCommand = program
    .command('run')
    .description('run a solid skill (deterministic, no brain)')
    .option('-s, --skill <slug>', 'the skill to execute')
    .option('-i, --init <slug>', 'the init to execute')
    .option('--repo <slug>', 'filter to specific repo')
    .option('-r, --role <slug>', 'filter to specific role')
    .option('--attempts <int>', 'not supported for run command')
    .option('-h, --help', 'show help')
    .helpOption(false) // disable built-in --help so it passes through to skills
    .enablePositionalOptions() // options after subcommand name belong to subcommand
    .passThroughOptions() // stop parse at subcommand, pass options to it
    .allowUnknownOption(true)
    .allowExcessArguments(true) // positional args pass through to skills
    .action(
      (opts: {
        skill?: string;
        init?: string;
        repo?: string;
        role?: string;
        attempts?: string;
        help?: boolean;
      }) => {
        // handle help request
        if (opts.help) return emitHelpOutput();

        // validate --attempts is not used with run
        if (opts.attempts)
          BadRequestError.throw(
            '--attempts is not supported for "run" (solid skills are deterministic). use "ask --skill --attempts" for stitch-mode or "act --skill --attempts" for actor-mode.',
            { attempts: opts.attempts },
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
              // print header + status to stderr (so it shows when stdout hidden)
              const init = findUniqueInitExecutable({
                slugRepo: opts.repo,
                slugRole: opts.role,
                slugInit: opts.init!,
              });
              console.error(``);
              console.error(
                `💪 init role repo=${init.slugRepo}/role=${init.slugRole}/init=${init.slug}`,
              );
              if (error.exitCode === 2) {
                console.error(`   └─ ✋ blocked by constraints`);
              } else {
                console.error(`   └─ 💥 failed with an error`);
              }
              console.error(``);
              if (error.stderr) console.error(error.stderr);
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
              // print header + status to stderr (so it shows when stdout hidden)
              const skill = findUniqueSkillExecutable({
                slugRepo: opts.repo,
                slugRole: opts.role,
                slugSkill: opts.skill!,
              });
              console.error(``);
              console.error(
                `🪨 run solid skill repo=${skill.slugRepo}/role=${skill.slugRole}/skill=${skill.slug}`,
              );
              if (error.exitCode === 2) {
                console.error(`   └─ ✋ blocked by constraints`);
              } else {
                console.error(`   └─ 💥 failed with an error`);
              }
              console.error(``);
              if (error.stderr) console.error(error.stderr);
              process.exit(error.exitCode);
            }
            throw error;
          }
        }

        // neither mode specified
        BadRequestError.throw(
          '--skill or --init is required (e.g., --skill test.speed or --init setup.claude)',
          { opts },
        );
      },
    );

  // register list subcommand
  invokeRunList({ runCommand });
};
