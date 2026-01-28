import type { Command } from 'commander';
import { BadRequestError } from 'helpful-errors';

import type { BrainRepl } from '@src/domain.objects/BrainRepl';
import type { InvokeOpts } from '@src/domain.objects/InvokeOpts';
import type { RoleHooksOnDispatch } from '@src/domain.objects/RoleHooksOnDispatch';
import type { RoleRegistry } from '@src/domain.objects/RoleRegistry';
import { genActor } from '@src/domain.operations/actor/genActor';
import type { ContextConfigOfUsage } from '@src/domain.operations/config/ContextConfigOfUsage';
import { assureFindRole } from '@src/domain.operations/invoke/assureFindRole';
import { assureRigidSkillHasOutputInput } from '@src/domain.operations/invoke/assureRigidSkillHasOutputInput';
import { inferRepoByRole } from '@src/domain.operations/invoke/inferRepoByRole';
import { performInIsolatedThreads } from '@src/domain.operations/invoke/performInIsolatedThreads';

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * .what = performs act via isolated threads for parallel attempts
 * .why = enables N independent attempts of a rigid skill in parallel
 */
const performActViaIsolatedThreads = async (input: {
  opts: {
    role: string;
    skill: string;
    brain?: string;
    input?: string;
    output: string;
    attempts: string;
    concurrency?: string;
  };
  config: { path: string };
  registries: RoleRegistry[];
}): Promise<void> => {
  // find the role and skill to validate output input
  const role = assureFindRole({
    registries: input.registries,
    slug: input.opts.role,
  });
  if (!role)
    BadRequestError.throw(`role "${input.opts.role}" not found`, {
      availableRoles: input.registries.flatMap((r) =>
        r.roles.map((rr) => rr.slug),
      ),
    });
  const skill = role.skills.refs.find((s) => s.slug === input.opts.skill);
  if (!skill)
    BadRequestError.throw(
      `unknown skill "${input.opts.skill}" under role "${input.opts.role}"`,
    );

  // validate rigid skill has output in schema.input
  assureRigidSkillHasOutputInput({ skill });

  // compose opts for isolated threads
  const optsForThreads: InvokeOpts<{
    config: string;
    mode: 'stitch' | 'actor';
    role: string;
    skill: string;
    brain?: string;
    output: string;
  }> = {
    ...input.opts,
    config: input.config.path,
    mode: 'actor',
  };

  // perform in isolated threads
  await performInIsolatedThreads({ opts: optsForThreads });
};

/**
 * .what = performs act in the current thread (single attempt)
 * .why = default behavior for single-attempt rigid skill execution
 */
const performActInCurrentThread = async (input: {
  opts: {
    role: string;
    skill: string;
    brain?: string;
    input?: string;
    output?: string;
  };
  registries: RoleRegistry[];
  brains: BrainRepl[];
  hooks: null | RoleHooksOnDispatch;
}): Promise<void> => {
  // validate brains are available
  if (input.brains.length === 0)
    throw new BadRequestError(
      'no brains available. add getBrainRepls() to your rhachet.use.ts',
    );

  // find the role
  const role = assureFindRole({
    registries: input.registries,
    slug: input.opts.role,
  });
  if (!role)
    throw new BadRequestError(`role "${input.opts.role}" not found`, {
      availableRoles: input.registries.flatMap((r) => r.roles.map((rr) => rr)),
    });

  // resolve brain reference if provided
  // note: slug is the full namespaced identifier (e.g., 'openai/codex')
  // repo is extracted from the first part of the slug
  let brainRef: { repo: string; slug: string } | undefined;
  if (input.opts.brain) {
    const firstSlashIndex = input.opts.brain.indexOf('/');
    if (firstSlashIndex === -1)
      throw new BadRequestError(
        `invalid brain format "${input.opts.brain}". expected: repo/slug`,
      );
    const repo = input.opts.brain.slice(0, firstSlashIndex);
    const slug = input.opts.brain;
    brainRef = { repo, slug };
  }

  // create actor with all available brains
  const actor = genActor({ role, brains: input.brains });

  // parse skill input
  const skillArgs = input.opts.input ? JSON.parse(input.opts.input) : {};

  // apply hooks if present
  const inputWithHooks = input.hooks?.onInvokeActInput
    ? input.hooks.onInvokeActInput({
        skill: input.opts.skill,
        input: skillArgs,
      })
    : skillArgs;

  // infer repo for logging
  const repo = inferRepoByRole({
    registries: input.registries,
    slugRole: input.opts.role,
  });

  // log which skill will run
  console.log(``);
  console.log(
    `🔩 act rigid skill repo=${repo.slug}/role=${input.opts.role}/skill=${input.opts.skill}`,
  );
  console.log(``);

  // invoke actor.act with skill
  const result = await actor.act({
    brain: brainRef,
    skill: { [input.opts.skill]: inputWithHooks },
  });

  // handle output
  if (input.opts.output) {
    const resolvedPath = resolve(process.cwd(), input.opts.output);
    writeFileSync(resolvedPath, JSON.stringify(result, null, 2));
    console.log(`🌊 output written to ${input.opts.output}`);
  } else {
    // output to stdout
    console.log(JSON.stringify(result, null, 2));
  }
};

/**
 * .what = adds the "act" command to the CLI
 * .why = invokes a rigid skill with brain from any role in the given registries
 *
 * .note = requires explicit config (rhachet.use.ts)
 */
export const invokeAct = (
  { program }: { program: Command },
  context: ContextConfigOfUsage,
): void => {
  const actCommand = program
    .command('act')
    .description('invoke a rigid skill with brain')
    .requiredOption('-r, --role <slug>', 'role to invoke')
    .requiredOption('-s, --skill <slug>', 'skill to invoke')
    .option('-b, --brain <ref>', 'brain to use (format: repo/slug)')
    .option('-i, --input <json>', 'input JSON for the skill')
    .option('-o, --output <path>', 'output file path')
    .option(
      '--attempts <int>',
      'number of independent outputs (requires -o/--output)',
    )
    .option('--concurrency <int>', 'parallel subthreads limit (default 3)')
    .allowUnknownOption(true)
    .allowExcessArguments(true);

  // 🧠 perform the skill
  actCommand.action(
    async (opts: {
      role: string;
      skill: string;
      brain?: string;
      input?: string;
      output?: string;
      attempts?: string;
      concurrency?: string;
    }) => {
      // load resources just-in-time
      const registries = (await context.config.usage.get.registries.explicit())
        .registries;
      const brains = await context.config.usage.get.brains.explicit();
      const hooks = await context.config.usage.get.hooks.explicit();
      const configPath = context.config.usage.getExplicitPath();

      // determine if isolated threads mode is requested for parallel attempts
      const useIsolatedThreads = opts.attempts !== undefined;

      // validate attempts requires output
      if (useIsolatedThreads && !opts.output)
        throw new BadRequestError('--attempts requires --output path');

      // 🧵 isolated threads mode: parallel attempts
      if (useIsolatedThreads) {
        return await performActViaIsolatedThreads({
          opts: {
            ...opts,
            output: opts.output!, // validated above
            attempts: opts.attempts!, // validated by useIsolatedThreads
          },
          config: { path: configPath },
          registries,
        });
      }

      // 🔩 current thread mode: single attempt
      return await performActInCurrentThread({
        opts,
        registries,
        brains,
        hooks,
      });
    },
  );
};
