import { Command } from 'commander';
import { BadRequestError } from 'helpful-errors';
import { resolve } from 'node:path';
import { getGitRepoRoot } from 'rhachet-artifact-git';

import { assureUniqueRoles } from '../../logic/invoke/assureUniqueRoles';
import { getInvokeHooksByOpts } from '../../logic/invoke/getInvokeHooksByOpts';
import { getRegistriesByOpts } from '../../logic/invoke/getRegistriesByOpts';
import { invokeAsk } from './invokeAsk';
import { invokeBriefs } from './invokeBriefs';
import { invokeChoose } from './invokeChoose';
import { invokeList } from './invokeList';
import { invokeReadme } from './invokeReadme';
import { invokeRoles } from './invokeRoles';

/**
 * .what = main entrypoint for CLI execution
 * .why =
 *   - sets up CLI commands and loads dynamic config from project root
 *   - enables skills to be registered dynamically via `rhachet.use.ts`
 * .how =
 *   - defaults to loading `@gitroot/rhachet.use.ts` unless overridden with `--config` or `-c`
 *   - config must export a `getRoleRegistries()` function returning a set of RoleRegistries to support
 */
export const invoke = async (input: { args: string[] }): Promise<void> => {
  // grab the config.registries
  const configArg = input.args.findIndex((a) => a === '--config' || a === '-c');
  const configPathExplicit =
    configArg >= 0 && input.args[configArg + 1]
      ? input.args[configArg + 1]!
      : undefined;
  const cwd = process.cwd(); //
  const configPath = configPathExplicit
    ? resolve(cwd, configPathExplicit)
    : resolve(await getGitRepoRoot({ from: cwd }), 'rhachet.use.ts');
  const registries = await getRegistriesByOpts({
    opts: { config: configPath },
  });
  const hooks = await getInvokeHooksByOpts({
    opts: { config: configPath }, // todo: maybe, getConfigByOpts ? returns both?
  });

  // failfast on duplicate roles // todo: update commands to allow registry based disambiguation
  await assureUniqueRoles(registries);

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
    .option('-c, --config <path>', 'where to find the rhachet.use.ts config'); // tell commander that we expect the config input and not to complain about it
  invokeReadme({ program, registries });
  invokeList({ program, registries });
  invokeRoles({ program, registries });
  invokeBriefs({ program, registries });
  invokeChoose({ program });
  invokeAsk({ program, config: { path: configPath }, registries, hooks });

  // invoke it
  await program.parseAsync(input.args, { from: 'user' }).catch((error) => {
    if (error instanceof BadRequestError) {
      console.error(``);
      console.error(`❌ ${error.message}`);
      console.error(``);
      console.error(`[args] ${input.args}`);
      console.error(``);
      process.exit(1);
    }
    throw error;
  });
};
