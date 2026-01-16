import { BadRequestError } from 'helpful-errors';

import type { InvokeOpts } from '@src/domain.objects/InvokeOpts';
import { genActor } from '@src/domain.operations/actor/genActor';
import { getBrainsByConfigExplicit } from '@src/domain.operations/config/getBrainsByConfigExplicit';
import { getRoleRegistriesByConfigExplicit } from '@src/domain.operations/config/getRoleRegistriesByConfigExplicit';

import { assureFindRole } from './assureFindRole';
import { inferRepoByRole } from './inferRepoByRole';

/**
 * .what = executes actor.act() within an isolated thread
 * .why = enables parallel attempts for rigid skills with same isolation as stitch-mode
 */
export const performInCurrentThreadForActor = async (input: {
  opts: InvokeOpts<{
    config: string;
    role: string;
    skill: string;
    brain?: string;
    input?: string;
    output?: string;
  }>;
}): Promise<void> => {
  // get registries from config
  const registries = await getRoleRegistriesByConfigExplicit({
    opts: input.opts,
  });

  // get brains from config
  const brains = await getBrainsByConfigExplicit({ opts: input.opts }); // todo: support implicit lookup via rhachet-brains-* pattern
  if (brains.length === 0)
    BadRequestError.throw(
      'no brains available. add getBrainRepls() to your rhachet.use.ts',
    );

  // find role
  const role = assureFindRole({ registries, slug: input.opts.role });
  if (!role)
    BadRequestError.throw(`role "${input.opts.role}" not found`, {
      availableRoles: registries.flatMap((r) => r.roles.map((rr) => rr.slug)),
    });

  // resolve brain reference if provided
  let brainRef: { repo: string; slug: string } | undefined;
  if (input.opts.brain) {
    const firstSlashIndex = input.opts.brain.indexOf('/');
    if (firstSlashIndex === -1)
      BadRequestError.throw(
        `invalid brain format "${input.opts.brain}". expected: repo/slug`,
      );
    const repo = input.opts.brain.slice(0, firstSlashIndex);
    const slug = input.opts.brain.slice(firstSlashIndex + 1);
    if (!repo || !slug)
      BadRequestError.throw(
        `invalid brain format "${input.opts.brain}". expected: repo/slug`,
      );
    brainRef = { repo, slug };
  }

  // create actor
  const actor = genActor({ role, brains });

  // parse skill input from opts
  const skillInput = extractSkillInputFromOpts({ opts: input.opts });

  // add output to skill input if specified
  const skillInputWithOutput = input.opts.output
    ? { ...skillInput, output: input.opts.output }
    : skillInput;

  // infer repo for logging
  const repo = inferRepoByRole({ registries, slugRole: input.opts.role });

  // get attempt info from env (set by performInIsolatedThread.invoke)
  const attempt = process.env.RHACHET_ATTEMPT ?? '1';
  const attempts = process.env.RHACHET_ATTEMPTS ?? '1';

  // log which skill will run
  console.log(``);
  console.log(
    `🔩 act rigid skill repo=${repo.slug}/role=${input.opts.role}/skill=${input.opts.skill} attempt=${attempt}/${attempts}`,
  );
  console.log(``);

  // invoke actor.act
  const result = await actor.act({
    brain: brainRef,
    skill: { [input.opts.skill]: skillInputWithOutput },
  });

  // write output (skill handles writing via its own logic)
  // output to stdout as JSON for parent process to capture if needed
  console.log(JSON.stringify(result, null, 2));
};

/**
 * .what = extracts skill input from opts, excluding meta fields
 * .why = separates skill-specific input from CLI control fields
 */
const extractSkillInputFromOpts = (input: {
  opts: InvokeOpts<{
    config: string;
    role: string;
    skill: string;
    brain?: string;
    input?: string;
    output?: string;
  }>;
}): Record<string, unknown> => {
  // if explicit input JSON is provided, use that
  if (input.opts.input) return JSON.parse(input.opts.input);

  // otherwise, extract from opts (excluding meta fields)
  const metaFields = new Set([
    'config',
    'role',
    'skill',
    'brain',
    'input',
    'output',
    'attempts',
    'attempt',
    'concurrency',
    'ask', // for compatibility with stitch-mode opts
    'mode', // mode field for thread type
  ]);

  const skillInput: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input.opts)) {
    if (!metaFields.has(key) && value !== undefined) skillInput[key] = value;
  }

  return skillInput;
};
