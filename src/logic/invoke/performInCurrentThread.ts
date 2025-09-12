import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';

import { RoleRegistry } from '../../domain/objects';
import { InvokeOpts } from '../../domain/objects/InvokeOpts';
import { enweaveOneStitcher } from '../weave/enweaveOneStitcher';
import { assureFindRole } from './assureFindRole';
import { getSkillContext } from './getSkillContext';
import { getSkillThreads } from './getSkillThreads';

/**
 * .what = perform a skill within the current thread
 * .why =
 *   - this is the default way to perform a skill; contrasted to within isolated threads, for isolated parallelism
 *   - this is reused within the performance of skills within isolated threads
 */
export const performInCurrentThread = async (input: {
  opts: InvokeOpts<{
    ask: string;
    role?: string;
    skill?: string;
  }>;
  registries: RoleRegistry[];
}): Promise<void> => {
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
  const skill = role.skills.find((s) => s.slug === input.opts.skill);
  if (!skill)
    BadRequestError.throw(
      `unknown skill "${input.opts.skill}" under role "${input.opts.role}"`,
    );

  // instantiate the threads
  const threads = await getSkillThreads({
    getter: skill.threads,
    from: { lookup: { argv: input.opts } },
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
  console.log(input.opts.ask);
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
