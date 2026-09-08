import { Command } from 'commander';
import { withEmojiSpaceShim } from 'emoji-space-shim';

import { genContextConfigOfUsage } from '@src/domain.operations/config/genContextConfigOfUsage';
import { assureUniqueRoles } from '@src/domain.operations/invoke/assureUniqueRoles';
import { getPreprocessedRoleArgv } from '@src/domain.operations/roles/deltas/getPreprocessedRoleArgv';

import { asCliErrorClassified } from './asCliErrorClassified';
import { asCliErrorFrame } from './asCliErrorFrame';
import { defineGlobalOptions } from './defineGlobalOptions';
import { getExitCodeFromError } from './getExitCodeFromError';
import { invokeAct } from './invokeAct';
import { invokeActor } from './invokeActor';
import { invokeAsk } from './invokeAsk';
import { invokeChoose } from './invokeChoose';
import { invokeClone } from './invokeClone';
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
  invokeActor({ program }); // filesystem only, no context needed
  invokeClone({ program }); // filesystem only, no context needed
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
  await program.parseAsync(args, { from: 'user' });
};

/**
 * .what = render a failed cli run for the human, then exit with its semantic code
 *
 * ⚠️ it catches EVERY throw, classified or not — this is the LAST handler, and past it sits
 *   node's uncaught-exception dump. an `instanceof HelpfulError` gate here would hand that
 *   dump to a human for every error our contract has not classified yet.
 *
 * ⚠️ it wraps the WHOLE of `_invoke`, never `parseAsync` alone: the config load, the command
 *   registration, and `assureUniqueRoles` all throw ABOVE that call.
 *
 * .note = the `[args]` trailer stays HERE rather than inside `asCliErrorFrame`. it is this
 *   handler's own context — the wrapped path (`withCliOutputErrors`) knows its args from
 *   its own invoker and does not want the line (`rule.require.single-responsibility`)
 *
 * .note = the render sits INSIDE the emoji shim, so the frame's `💥`/`✋` keep the terminal
 *   width the shim exists to hold
 */
const emitCliErrorAndExit = (input: {
  error: unknown;
  args: string[];
}): never => {
  const error = asCliErrorClassified({ error: input.error });

  // ⚠️ the SHARED frame, never `.message` — a `HelpfulError`'s `.message` appends its
  //   serialized metadata. `asCliErrorFrame` is the one owner of what a human reads off a
  //   cli error, so this path and `withCliOutputErrors` cannot disagree
  for (const line of asCliErrorFrame({ error })) console.error(line);
  console.error(`[args] ${input.args}`);
  console.error(``);

  // the class's own code (ConstraintError = 2, MalfunctionError = 1)
  return process.exit(getExitCodeFromError({ error }));
};

// wrap with emoji space shim for correct terminal render
export const invoke = (input: { args: string[] }): Promise<void> =>
  withEmojiSpaceShim({
    logic: () =>
      _invoke(input).catch((error: unknown) =>
        emitCliErrorAndExit({ error, args: input.args }),
      ),
  });
