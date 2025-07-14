import { UnexpectedCodePathError, BadRequestError } from 'helpful-errors';
import { PickOne } from 'type-fns';

import { Threads } from '../../domain/objects';
import { RoleSkillThreadsGetter } from '../../domain/objects/RoleSkillArgGetter';

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
    lookup: { argv: Record<string, string> };
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
    const ask = argv.ask;
    if (!ask)
      BadRequestError.throw('missing required argument: --ask', { argv });

    // instantiate the collected input set
    const collected: Record<string, string> = { ask };

    // grab all the requested ones
    for (const [key, spec] of Object.entries(getter.lookup)) {
      const val = argv[key] ?? (spec.char ? argv[spec.char] : undefined);
      if (val === undefined) {
        BadRequestError.throw(`missing required arg --${key} (-${spec.char})`, {
          key,
          spec,
        });
      }
      collected[key] = val;
    }

    // verify they look right
    if (!getter.assess(collected))
      UnexpectedCodePathError.throw(
        'from.lookup -> collected was assessed to have incorrect shape. this should not be possible',
        { from, collected },
      );

    // instantiate
    return await getter.instantiate(collected);
  }

  throw new UnexpectedCodePathError('unsupported lookup.from', { input });
};
