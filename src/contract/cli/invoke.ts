import { Command } from 'commander';
import { withEmojiSpaceShim } from 'emoji-space-shim';

import type { ContextConfigOfUsage } from '@src/domain.operations/config/ContextConfigOfUsage';
import { genContextConfigOfUsage } from '@src/domain.operations/config/genContextConfigOfUsage';
import { assureUniqueRoles } from '@src/domain.operations/invoke/assureUniqueRoles';
import { getCommandFromArgv } from '@src/domain.operations/roles/deltas/getCommandFromArgv';
import { getPreprocessedRoleArgv } from '@src/domain.operations/roles/deltas/getPreprocessedRoleArgv';

import { defineGlobalOptions } from './defineGlobalOptions';
import { emitCliErrorAndExit } from './emitCliErrorAndExit';
import { exitCleanOnClosedPipe } from './exitCleanOnClosedPipe';

/**
 * .what = registers one top-level command onto the program
 */
type CommandRegistrar = (
  input: { program: Command },
  context: ContextConfigOfUsage,
) => void;

/**
 * .what = each top-level command, mapped to the lazy loaders of the registrars that declare it
 * .why = a registrar's module graph is loaded only when its command runs. an eager import of
 *        all sixteen pulled ~4k modules (the aws sdk, clone, act, keyrack) into every call, for
 *        a command that needed a fraction of them (rule.require.thinnest-import-path)
 *
 * .note = the dynamic `import()` compiles to an in-function `require()` under commonjs, so the
 *   registrar module is evaluated at call time, never at module-eval of this entry
 * .note = key order is the help order; `repo` lists introspect first, since compile finds the
 *   `repo` command that introspect declares
 */
const COMMAND_REGISTRARS: Record<
  string,
  Array<() => Promise<CommandRegistrar>>
> = {
  init: [async () => (await import('./invokeInit')).invokeInit],
  repo: [
    async () => (await import('./invokeRepoIntrospect')).invokeRepoIntrospect,
    async () => (await import('./invokeRepoCompile')).invokeRepoCompile,
  ],
  roles: [async () => (await import('./invokeRoles')).invokeRoles],
  list: [async () => (await import('./invokeList')).invokeList],
  readme: [async () => (await import('./invokeReadme')).invokeReadme],
  run: [async () => (await import('./invokeRun')).invokeRun],
  enroll: [async () => (await import('./invokeEnroll')).invokeEnroll],
  actor: [async () => (await import('./invokeActor')).invokeActor],
  clone: [async () => (await import('./invokeClone')).invokeClone],
  choose: [async () => (await import('./invokeChoose')).invokeChoose],
  ask: [async () => (await import('./invokeAsk')).invokeAsk],
  act: [async () => (await import('./invokeAct')).invokeAct],
  upgrade: [async () => (await import('./invokeUpgrade')).invokeUpgrade],
  update: [async () => (await import('./invokeUpdate')).invokeUpdate],
  keyrack: [async () => (await import('./invokeKeyrack')).invokeKeyrack],
};

/**
 * .what = picks the registrar loaders the argv needs
 * .why = a known command loads only its own registrars; no command (bare `--help`) or an
 *        unknown one loads all, so the top-level help and commander's unknown-command
 *        refusal both see the full command set
 */
const getAllRegistrarLoadersForArgv = (input: {
  args: string[];
}): Array<() => Promise<CommandRegistrar>> => {
  const command = getCommandFromArgv({ args: input.args });
  const loadersOfCommand =
    command === null ? undefined : COMMAND_REGISTRARS[command];
  return loadersOfCommand ?? Object.values(COMMAND_REGISTRARS).flat();
};

/**
 * .what = main entrypoint for CLI execution
 * .why = routes commands to handlers with lazy config load
 *
 * .note = uses genContextConfigOfUsage for just-in-time config resolution
 * .note = registers only the invoked command's registrars; each loads what it needs
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

  // register the invoked command's registrars, loaded lazily and in order
  // each command uses context.config.usage.get.* just-in-time
  const registrars = await Promise.all(
    getAllRegistrarLoadersForArgv({ args }).map((load) => load()),
  );
  for (const register of registrars) register({ program }, context);

  // assure unique roles when explicit config is available
  if (context.config.usage.isExplicit()) {
    const registries = (await context.config.usage.get.registries.explicit())
      .registries;
    await assureUniqueRoles(registries);
  }

  // invoke it (parse the preprocessed argv so `-role` tokens survive commander)
  await program.parseAsync(args, { from: 'user' });
};

// wrap with emoji space shim for correct terminal render
// ⚠️ the handler wraps the WHOLE of `_invoke`, never `parseAsync` alone: the config load, the
//   command registration, and `assureUniqueRoles` all throw ABOVE that call
export const invoke = (input: { args: string[] }): Promise<void> => {
  // a truncated pipe (`rhx … | head`) is a normal end, never a node stack trace for a human.
  // ⚠️ armed OUTSIDE the shim, so it is live before the first wrapped write, and once per
  //   process rather than once per command
  exitCleanOnClosedPipe({
    stream: process.stdout,
    exit: (code) => process.exit(code),
    codePrior: () => process.exitCode,
  });

  return withEmojiSpaceShim({
    logic: () =>
      _invoke(input).catch((error: unknown) =>
        emitCliErrorAndExit({ error, args: input.args }),
      ),
  });
};
