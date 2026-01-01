import type { Command } from 'commander';
import { BadRequestError } from 'helpful-errors';

import type { BrainRepl } from '@src/domain.objects/BrainRepl';
import type { InvokeHooks } from '@src/domain.objects/InvokeHooks';
import type { RoleRegistry } from '@src/domain.objects/RoleRegistry';
import { genActor } from '@src/domain.operations/actor/genActor';
import { assureFindRole } from '@src/domain.operations/invoke/assureFindRole';

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * .what = adds the "act" command to the CLI
 * .why = invokes a rigid skill with brain from any role in the given registries
 */
export const invokeAct = ({
  program,
  registries,
  brains,
  hooks,
}: {
  program: Command;
  registries: RoleRegistry[];
  brains: BrainRepl[];
  hooks: null | InvokeHooks;
}): void => {
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
      // validate brains are available
      if (brains.length === 0)
        throw new BadRequestError(
          'no brains available. add getBrainRepls() to your rhachet.use.ts',
        );

      // find the role
      const role = assureFindRole({ registries, slug: opts.role });
      if (!role)
        throw new BadRequestError(`role "${opts.role}" not found`, {
          availableRoles: registries.flatMap((r) => r.roles.map((rr) => rr)),
        });

      // resolve brain reference if provided
      let brainRef: { repo: string; slug: string } | undefined;
      if (opts.brain) {
        // split on first '/' only; slug may contain additional slashes
        const firstSlashIndex = opts.brain.indexOf('/');
        if (firstSlashIndex === -1)
          throw new BadRequestError(
            `invalid brain format "${opts.brain}". expected: repo/slug`,
          );
        const repo = opts.brain.slice(0, firstSlashIndex);
        const slug = opts.brain.slice(firstSlashIndex + 1);
        if (!repo || !slug)
          throw new BadRequestError(
            `invalid brain format "${opts.brain}". expected: repo/slug`,
          );
        brainRef = { repo, slug };
      }

      // create actor with all available brains
      const actor = genActor({ role, brains });

      // parse skill input
      const skillArgs = opts.input ? JSON.parse(opts.input) : {};

      // apply hooks if present
      const inputWithHooks = hooks?.onInvokeActInput
        ? hooks.onInvokeActInput({ skill: opts.skill, input: skillArgs })
        : skillArgs;

      // determine number of attempts
      const attempts = opts.attempts ? parseInt(opts.attempts, 10) : 1;

      // validate attempts requires output
      if (attempts > 1 && !opts.output)
        throw new BadRequestError('--attempts requires --output path');

      // execute skill for each attempt
      for (let attempt = 1; attempt <= attempts; attempt++) {
        // log which skill will run
        console.log(``);
        console.log(
          `🔩 skill "${opts.skill}" from role="${opts.role}" attempt=${attempt}/${attempts}`,
        );
        console.log(``);

        // invoke actor.act with skill
        const result = await actor.act({
          brain: brainRef,
          skill: { [opts.skill]: inputWithHooks },
        });

        // handle output
        if (opts.output) {
          // for multiple attempts, suffix with attempt number
          const outputPath =
            attempts > 1
              ? opts.output.replace(/(\.\w+)$/, `.i${attempt}$1`)
              : opts.output;
          const resolvedPath = resolve(process.cwd(), outputPath);
          writeFileSync(resolvedPath, JSON.stringify(result, null, 2));
          console.log(`📝 output written to ${outputPath}`);
        } else {
          // output to stdout
          console.log(JSON.stringify(result, null, 2));
        }
      }
    },
  );
};
