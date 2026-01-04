import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';

import type { RoleRegistry } from '@src/domain.objects';
import type { InvokeOpts } from '@src/domain.objects/InvokeOpts';
import { enweaveOneStitcher } from '@src/domain.operations/weave/enweaveOneStitcher';

import { assureFindRole } from './assureFindRole';
import { getSkillContext } from './getSkillContext';
import { getSkillThreads } from './getSkillThreads';

/**
 * .what = perform a skill within the current thread
 * .why =
 *   - this is the default way to perform a skill; contrasted to within isolated threads, for isolated parallelism
 *   - this is reused within the performance of skills within isolated threads
 */
export const performInCurrentThreadForStitch = async (input: {
  opts: InvokeOpts<{
    ask?: string;
    role?: string;
    skill?: string;
  }>;
  registries: RoleRegistry[];
}): Promise<void> => {
  // validate ask is provided for stitch-mode
  const ask =
    input.opts.ask ??
    UnexpectedCodePathError.throw('opts.ask not defined for stitch-mode', {
      opts: input.opts,
    });

  // create narrowed opts with validated ask
  const optsWithAsk = { ...input.opts, ask };

  // lookup the role
  const role = assureFindRole({
    registries: input.registries,
    slug:
      input.opts.role ??
      UnexpectedCodePathError.throw('opts.role slug not defined. why not?', {
        opts: input.opts,
      }),
  });
  if (!role) BadRequestError.throw(`unknown role "${input.opts.role}"`);

  // lookup the skill
  const skill = role.skills.refs.find((s) => s.slug === input.opts.skill);
  if (!skill)
    BadRequestError.throw(
      `unknown skill "${input.opts.skill}" under role "${input.opts.role}"`,
    );

  // instantiate the threads
  const threads = await getSkillThreads({
    getter: skill.threads,
    from: { lookup: { argv: optsWithAsk } },
  });

  // instantiate the context
  const env = process.env as Record<string, string | undefined>;
  const context = await getSkillContext({
    getter: skill.context,
    from: { lookup: { env } },
  });

  // execute the weave
  console.log('');
  console.log('');
  console.log('🎙️  heard');
  console.log('');
  console.log(ask);
  console.log('');
  console.log('🫡  on it!');
  console.log('');
  await enweaveOneStitcher(
    {
      stitcher: skill.route,
      threads,
    },
    context,
  );
};
