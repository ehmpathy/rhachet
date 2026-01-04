import type { Command } from 'commander';
import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';

import type { InvokeOpts } from '@src/contract/sdk';
import type { BrainRepl } from '@src/domain.objects/BrainRepl';
import type { InvokeHooks } from '@src/domain.objects/InvokeHooks';
import type { Role } from '@src/domain.objects/Role';
import type { RoleRegistry } from '@src/domain.objects/RoleRegistry';
import { genActor } from '@src/domain.operations/actor/genActor';
import { assureFindRole } from '@src/domain.operations/invoke/assureFindRole';
import { onInvokeAskInput } from '@src/domain.operations/invoke/hooks/onInvokeAskInput';
import { inferRepoByRole } from '@src/domain.operations/invoke/inferRepoByRole';
import { performInCurrentThreadForStitch } from '@src/domain.operations/invoke/performInCurrentThreadForStitch';
import { performInIsolatedThreads } from '@src/domain.operations/invoke/performInIsolatedThreads';

/**
 * .what = performs ask via stitch-mode (--skill invocation)
 * .why = executes a registered skill with deterministic stitch-threads
 */
const performAskViaStitchMode = async (input: {
  opts: { role: string; skill: string; ask?: string; attempts?: string };
  config: { path: string };
  registries: RoleRegistry[];
  hooks: null | InvokeHooks;
}): Promise<void> => {
  // instantiate the composed argv
  const argvWithAsk: InvokeOpts<{
    ask: string;
    config: string;
    mode: 'stitch' | 'actor';
  }> = {
    ...input.opts,
    ask:
      input.opts.ask ??
      UnexpectedCodePathError.throw('ask was not declared', {
        opts: input.opts,
      }),
    config: input.config.path, // required for isolated child threads when used with attempts
    mode: 'stitch', // stitch-mode for ask --skill
  };

  // apply the onInvokeAskHooks
  const argvWithHooks: InvokeOpts<{
    ask: string;
    config: string;
    mode: 'stitch' | 'actor';
  }> = input.hooks
    ? {
        ...onInvokeAskInput({ opts: argvWithAsk, hooks: input.hooks }),
        mode: 'stitch' as const,
      }
    : argvWithAsk;

  // if attempts were requested, perform the skill in isolated threads per attempt
  if (input.opts.attempts)
    return await performInIsolatedThreads({ opts: argvWithHooks });

  // otherwise, perform in the main thread by default
  return await performInCurrentThreadForStitch({
    opts: argvWithHooks,
    registries: input.registries,
  });
};

/**
 * .what = performs ask via actor-mode (fluid brain conversation)
 * .why = enables open-ended conversation with a role via brain.repl
 */
const performAskViaActorMode = async (input: {
  opts: { role: string; ask?: string };
  role: Role;
  brains: BrainRepl[];
  registries: RoleRegistry[];
}): Promise<void> => {
  // validate brains are available
  if (input.brains.length === 0)
    throw new BadRequestError(
      'no brains available. add getBrainRepls() to your rhachet.use.ts',
    );

  // create actor with all available brains
  const actor = genActor({ role: input.role, brains: input.brains });

  // validate prompt is provided
  if (!input.opts.ask)
    throw new BadRequestError(
      '--ask is required (e.g., --ask "review my code")',
    );

  // log which role will be asked
  const repo = inferRepoByRole({
    registries: input.registries,
    slugRole: input.opts.role,
  });
  console.log(``);
  console.log(`💧 ask fluid skill repo=${repo.slug}/role=${input.opts.role}`);
  console.log(``);

  // invoke actor.ask
  const result = await actor.ask({ prompt: input.opts.ask });

  // output response
  console.log(result.response);
};

/**
 * .what = adds the "ask" command to the CLI
 * .why = lets users invoke a skill from any role in the given registries
 *        or start a fluid conversation with an actor (when no --skill)
 */
export const invokeAsk = ({
  program,
  registries,
  brains,
  ...input
}: {
  program: Command;
  config: { path: string };
  registries: RoleRegistry[];
  brains: BrainRepl[];
  hooks: null | InvokeHooks;
}): void => {
  const askCommand = program
    .command('ask')
    .description('invoke a skill or start a fluid conversation with an actor')
    .requiredOption('-r, --role <slug>', 'role to invoke')
    .option('-s, --skill <slug>', 'skill to invoke (stitch-mode)')
    .option('-a, --ask <ask>', 'your ask or prompt')
    .option(
      '--attempts <int>',
      'number of independent outputs (requires -o/--output)',
    )
    .option('--concurrency <int>', 'parallel subthreads limit (default 3)')
    .allowUnknownOption(true)
    .allowExcessArguments(true);

  // 💉 dynamically inject CLI flags from skill inputs (only in stitch-mode)
  askCommand.hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();

    // skip dynamic injection if no skill specified (actor-mode)
    if (!opts.skill) return;

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

  // 🧠 perform the skill or actor conversation
  askCommand.action(
    async (opts: {
      role: string;
      skill?: string;
      ask?: string;
      attempts?: string;
    }) => {
      // determine which mode to use
      const isStitchMode = opts.skill !== undefined;
      const isActorMode = !isStitchMode;

      // 🧵 stitch-mode: invoke skill via thread.stitch
      if (isStitchMode) {
        const skill = opts.skill!; // asserted as string (validated by isStitchMode)
        return await performAskViaStitchMode({
          opts: { ...opts, skill },
          config: input.config,
          registries,
          hooks: input.hooks,
        });
      }

      // 💧 actor-mode: invoke fluid conversation via brain.repl
      if (isActorMode) {
        const role = assureFindRole({ registries, slug: opts.role });
        if (!role)
          throw new BadRequestError(`role "${opts.role}" not found`, {
            availableRoles: registries.flatMap((r) => r.roles),
          });
        return await performAskViaActorMode({ opts, role, brains, registries });
      }

      // neither mode matched - unexpected
      throw new UnexpectedCodePathError(
        'invokeAsk: neither stitch-mode nor actor-mode matched',
        { opts },
      );
    },
  );
};
