import { Command } from 'commander';
import { BadRequestError } from 'helpful-errors';
import { getGitRepoRoot } from 'rhachet-artifact-git';

import { assureUniqueRoles } from '@src/domain.operations/invoke/assureUniqueRoles';
import { getBrainReplsByOpts } from '@src/domain.operations/invoke/getBrainReplsByOpts';
import { getInvokeHooksByOpts } from '@src/domain.operations/invoke/getInvokeHooksByOpts';
import { getRegistriesByOpts } from '@src/domain.operations/invoke/getRegistriesByOpts';

import { resolve } from 'node:path';
import { invokeAct } from './invokeAct';
import { invokeAsk } from './invokeAsk';
import { invokeChoose } from './invokeChoose';
import { invokeInit } from './invokeInit';
import { invokeList } from './invokeList';
import { invokeReadme } from './invokeReadme';
import { invokeRoles } from './invokeRoles';
import { invokeRun } from './invokeRun';

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
  // treat init command specially - it's purpose is to run before configs exists
  // note: only the bare 'init' command, not 'roles init' which requires config
  if (input.args[0] === 'init') {
    const program = new Command();
    program.name('rhachet');
    invokeInit({ program });
    await program.parseAsync(input.args, { from: 'user' });
    return;
  }

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
  const brains = await getBrainReplsByOpts({
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
  invokeRun({ program, registries, brains });
  invokeChoose({ program });
  invokeAsk({
    program,
    config: { path: configPath },
    registries,
    brains,
    hooks,
  });
  invokeAct({
    program,
    config: { path: configPath },
    registries,
    brains,
    hooks,
  });

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
