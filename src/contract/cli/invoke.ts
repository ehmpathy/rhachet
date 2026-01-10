import { Command } from 'commander';
import { withEmojiSpaceShim } from 'emoji-space-shim';
import { BadRequestError } from 'helpful-errors';

import { genContextConfigOfUsage } from '@src/domain.operations/config/genContextConfigOfUsage';
import { assureUniqueRoles } from '@src/domain.operations/invoke/assureUniqueRoles';

import { invokeAct } from './invokeAct';
import { invokeAsk } from './invokeAsk';
import { invokeChoose } from './invokeChoose';
import { invokeInit } from './invokeInit';
import { invokeList } from './invokeList';
import { invokeReadme } from './invokeReadme';
import { invokeRepoIntrospect } from './invokeRepoIntrospect';
import { invokeRoles } from './invokeRoles';
import { invokeRun } from './invokeRun';

/**
 * .what = main entrypoint for CLI execution
 * .why = routes commands to handlers with lazy config load
 *
 * .note = uses genContextConfigOfUsage for just-in-time config resolution
 * .note = all commands registered unconditionally; each loads what it needs
 */
const _invoke = async (input: { args: string[] }): Promise<void> => {
  const cwd = process.cwd();

  // create context with lazy config loaders
  const context = await genContextConfigOfUsage({ args: input.args, cwd });

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
    .option('-c, --config <path>', 'where to find the rhachet.use.ts config');

  // register all commands unconditionally
  // each command uses context.config.usage.get.* just-in-time

  invokeInit({ program });
  invokeRepoIntrospect({ program }); // self-contained, no context needed
  invokeRoles({ program }, context);
  invokeList({ program }, context);
  invokeReadme({ program }, context);
  invokeRun({ program }); // filesystem only, no context needed
  invokeChoose({ program }); // no config needed
  invokeAsk({ program }, context);
  invokeAct({ program }, context);

  // assure unique roles when explicit config is available
  if (context.config.usage.isExplicit()) {
    const registries = (await context.config.usage.get.registries.explicit())
      .registries;
    await assureUniqueRoles(registries);
  }

  // invoke it
  await program.parseAsync(input.args, { from: 'user' }).catch((error) => {
    if (error instanceof BadRequestError) {
      console.error(``);
      console.error(`⛈️ ${error.message}`);
      console.error(``);
      console.error(`[args] ${input.args}`);
      console.error(``);
      process.exit(1);
    }
    throw error;
  });
};

// wrap with emoji space shim for correct terminal render
export const invoke = (input: { args: string[] }): Promise<void> =>
  withEmojiSpaceShim({ logic: () => _invoke(input) });
