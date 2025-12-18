import type { Command } from 'commander';
import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';

import type { InvokeOpts } from '@src/contract/sdk';
import type { InvokeHooks } from '@src/domain.objects/InvokeHooks';
import type { RoleRegistry } from '@src/domain.objects/RoleRegistry';
import { assureFindRole } from '@src/domain.operations/invoke/assureFindRole';
import { onInvokeAskInput } from '@src/domain.operations/invoke/hooks/onInvokeAskInput';
import { performInCurrentThread } from '@src/domain.operations/invoke/performInCurrentThread';
import { performInIsolatedThreads } from '@src/domain.operations/invoke/performInIsolatedThreads';

/**
 * .what = adds the "ask" command to the CLI
 * .why = lets users invoke a skill from any role in the given registries
 */
export const invokeAsk = ({
  program,
  registries,
  ...input
}: {
  program: Command;
  config: { path: string };
  registries: RoleRegistry[];
  hooks: null | InvokeHooks;
}): void => {
  const askCommand = program
    .command('ask')
    .requiredOption('-r, --role <slug>', 'role to invoke')
    .requiredOption('-s, --skill <slug>', 'skill to invoke')
    .option('-a, --ask <ask>', 'your ask')
    .option(
      '--attempts <int>',
      'number of independent outputs (requires -o/--output)',
    )
    .option('--concurrency <int>', 'parallel subthreads limit (default 3)')
    .allowUnknownOption(true)
    .allowExcessArguments(true);

  // 💉 dynamically inject CLI flags from skill inputs
  askCommand.hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();

    const role = assureFindRole({ registries, slug: opts.role });
    const skill = role?.skills.refs.find((s) => s.slug === opts.skill);
    if (!skill)
      BadRequestError.throw(
        `no skill named "${opts.skill}" under role "${opts.role}"`,
        {
          opts,
          role: {
            skills: role?.skills.refs.map((thisSkill) => thisSkill.slug),
          },
        },
      );

    // register the dynamic inputs
    for (const [key, meta] of Object.entries(skill.threads.lookup)) {
      const isOptional = meta.type.startsWith('?');
      const typeParsed = isOptional ? meta.type.slice(1) : meta.type;
      const typeLabel = isOptional ? `[${typeParsed}]` : `<${typeParsed}>`;
      thisCommand.option(`-${meta.char}, --${key} ${typeLabel}`, meta.desc);
    }

    // re-parse with updated option definitions
    thisCommand.parseOptions(thisCommand.parent?.args ?? []);
  });

  // 🧠 perform the skill
  askCommand.action(async (opts: Record<string, string>) => {
    // instantiate the composed argv
    const argvWithAsk: InvokeOpts<{ ask: string; config: string }> = {
      ...opts,
      ask:
        opts.ask ??
        UnexpectedCodePathError.throw('ask was not declared', { opts }),
      config: input.config.path, // required for isolated child threads when used with attempts
    };

    // apply the onInvokeAskHooks
    const argvWithHooks: InvokeOpts<{ ask: string; config: string }> =
      input.hooks
        ? onInvokeAskInput({ opts: argvWithAsk, hooks: input.hooks })
        : argvWithAsk;

    // if attempts were requested, perform the skill in isolated threads per attempt
    if (opts.attempts)
      return await performInIsolatedThreads({ opts: argvWithHooks });

    // otherwise, perform in the main thread by default
    return await performInCurrentThread({ opts: argvWithHooks, registries });
  });
};
