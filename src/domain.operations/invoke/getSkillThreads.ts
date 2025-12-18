import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';
import type { PickOne } from 'type-fns';

import type { Threads } from '@src/domain.objects';
import type { InvokeOpts } from '@src/domain.objects/InvokeOpts';
import type { RoleSkillThreadsGetter } from '@src/domain.objects/RoleSkillArgGetter';

/**
 * .what = hydrates skill threads using either passin or lookup mode
 * .why = enables flexible runtime use from CLI or direct invocation
 */
export const getSkillThreads = async <
  TOutput extends Threads<any>,
  TVars extends Record<string, any>,
>(input: {
  getter: RoleSkillThreadsGetter<TOutput, TVars>;
  from: PickOne<{
    passin: TVars;
    lookup: { argv: InvokeOpts<{ ask: string }> };
  }>;
}): Promise<TOutput> => {
  const { getter, from } = input;

  // support passin mode
  if ('passin' in from) {
    if (!getter.assess(from.passin))
      BadRequestError.throw(
        'from.passin was assessed to have incorrect shape',
        { from },
      );
    return await getter.instantiate(from.passin);
  }

  // support lookup mode
  if ('lookup' in from) {
    const argv = from.lookup.argv;

    // verify that ask was provided; its always required by default
    const ask: string = argv.ask;
    if (!ask)
      BadRequestError.throw('missing required argument: --ask', { argv });

    // instantiate the collected input set
    const collected: Record<string, string> = { ask };

    // grab all the requested ones
    for (const [key, spec] of Object.entries(getter.lookup)) {
      const val = argv[key] ?? (spec.char ? argv[spec.char] : undefined);
      if (val !== undefined) collected[key] = String(val);
      if (val === undefined && !spec.type.startsWith('?'))
        BadRequestError.throw(`missing required arg --${key} (-${spec.char})`, {
          key,
          spec,
        });
    }

    // verify they look right
    if (!getter.assess(collected))
      UnexpectedCodePathError.throw(
        'getter.assess=false; did you forget to update your .assess function in the skill declaration?',
        { from, collected },
      );

    // instantiate
    return await getter.instantiate(collected);
  }

  throw new UnexpectedCodePathError('unsupported lookup.from', { input });
};
