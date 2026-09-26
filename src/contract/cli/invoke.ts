import { Command } from 'commander';
import { withEmojiSpaceShim } from 'emoji-space-shim';
import { HelpfulError } from 'helpful-errors';

import { genContextConfigOfUsage } from '@src/domain.operations/config/genContextConfigOfUsage';
import { assureUniqueRoles } from '@src/domain.operations/invoke/assureUniqueRoles';
import { getPreprocessedRoleArgv } from '@src/domain.operations/roles/deltas/getPreprocessedRoleArgv';

import { defineGlobalOptions } from './defineGlobalOptions';
import { getExitCodeFromError } from './getExitCodeFromError';
import { invokeAct } from './invokeAct';
import { invokeAsk } from './invokeAsk';
import { invokeChoose } from './invokeChoose';
import { invokeEnroll } from './invokeEnroll';
import { invokeInit } from './invokeInit';
import { invokeKeyrack } from './invokeKeyrack';
import { invokeList } from './invokeList';
import { invokeReadme } from './invokeReadme';
import { invokeRepoCompile } from './invokeRepoCompile';
import { invokeRepoIntrospect } from './invokeRepoIntrospect';
import { invokeRoles } from './invokeRoles';
import { invokeRun } from './invokeRun';
import { invokeUpdate } from './invokeUpdate';
import { invokeUpgrade } from './invokeUpgrade';

/**
 * .what = main entrypoint for CLI execution
 * .why = routes commands to handlers with lazy config load
 *
 * .note = uses genContextConfigOfUsage for just-in-time config resolution
 * .note = all commands registered unconditionally; each loads what it needs
 */
const _invoke = async (input: { args: string[] }): Promise<void> => {
  const cwd = process.cwd();

  // encode `-role` remove tokens past commander's variadic parser (init --roles)
  const args = getPreprocessedRoleArgv({ args: input.args });

  // create context with lazy config loaders
  const context = await genContextConfigOfUsage({ args, cwd });

  // declare the cli program
  const program = new Command();
  program.configureOutput({
    writeErr: (str) => {
      console.error('[commander error]', str);
    },
  });
  program
    .name('rhachet')
    .description(
      'rhachet cli interface. weave threads 🧵 of thought, stitched 🪡 with a rhachet ⚙️',
    )
    .enablePositionalOptions(); // required for subcommand passThroughOptions

  // declare the program-level global options in one shared place, so the argv
  // preprocessor's GLOBAL_VALUE_FLAGS can be enforced against them by a test
  defineGlobalOptions({ program });

  // register all commands unconditionally
  // each command uses context.config.usage.get.* just-in-time

  invokeInit({ program });
  invokeRepoIntrospect({ program }); // self-contained, no context needed
  invokeRepoCompile({ program }); // self-contained, no context needed
  invokeRoles({ program }, context);
  invokeList({ program }, context);
  invokeReadme({ program }, context);
  invokeRun({ program }); // filesystem only, no context needed
  invokeEnroll({ program }); // filesystem only, no context needed
  invokeChoose({ program }); // no config needed
  invokeAsk({ program }, context);
  invokeAct({ program }, context);
  invokeUpgrade({ program });
  invokeUpdate({ program });
  invokeKeyrack({ program }); // filesystem only, no context needed

  // assure unique roles when explicit config is available
  if (context.config.usage.isExplicit()) {
    const registries = (await context.config.usage.get.registries.explicit())
      .registries;
    await assureUniqueRoles(registries);
  }

  // invoke it (parse the preprocessed argv so `-role` tokens survive commander)
  await program.parseAsync(args, { from: 'user' }).catch((error) => {
    // any HelpfulError gets a clean message + `[args]` line, not a raw stack
    // trace. this covers the init `--roles` BadRequestError path (present
    // pre-feature) AND the keyrack unlock MalfunctionError class (empty agent
    // signature, spawn timeout, unparseable SSH_AGENT_PID) — every HelpfulError
    // carries emoji + class + context and a sensible exit code, so the vision's
    // "clean tree + named fix" holds for the whole HelpfulError family, not just
    // BadRequestError. it echoes `input.args` (the user's original argv), so the
    // sentinel-encoded `-role` never leaks a null byte
    if (error instanceof HelpfulError) {
      // HelpfulError already includes emoji + class name in message (e.g., "✋ ConstraintError: ...")
      console.error(``);
      console.error(error.message);
      console.error(``);
      console.error(`[args] ${input.args}`);
      console.error(``);
      // use error's exit code if available (ConstraintError = 2, else 1)
      const exitCode = getExitCodeFromError({ error });
      process.exit(exitCode);
    }
    throw error;
  });
};

// wrap with emoji space shim for correct terminal render
export const invoke = (input: { args: string[] }): Promise<void> =>
  withEmojiSpaceShim({ logic: () => _invoke(input) });
