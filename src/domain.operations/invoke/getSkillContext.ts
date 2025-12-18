import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';
import type { PickOne } from 'type-fns';

import type { GStitcher } from '@src/domain.objects';
import type { RoleSkillContextGetter } from '@src/domain.objects/RoleSkillArgGetter';

/**
 * .what = hydrates skill context using either passin or lookup mode
 * .why =
 *   - supports flexible skill execution via CLI, tests, or runtime composition
 *   - ensures all required env inputs are present and valid
 */
export const getSkillContext = async <
  TOutput extends GStitcher['context'],
  TVars extends Record<string, any>,
>(input: {
  getter: RoleSkillContextGetter<TOutput, TVars>;
  from: PickOne<{
    passin: TVars;
    lookup: { env: Record<string, string | undefined> };
  }>;
}): Promise<TOutput> => {
  const { getter, from } = input;

  // support passin mode: directly provided context vars
  if ('passin' in from) {
    if (!getter.assess(from.passin)) {
      BadRequestError.throw(
        'from.passin was assessed to have incorrect shape',
        {
          from,
        },
      );
    }
    return await getter.instantiate(from.passin);
  }

  // support lookup mode: pull from env vars
  if ('lookup' in from) {
    const env = from.lookup.env;
    const collected: Record<string, string> = {};

    for (const [key, spec] of Object.entries(getter.lookup)) {
      const val = env[spec.envar];
      if (val === undefined) {
        BadRequestError.throw(`missing required env var ${spec.envar}`, {
          key,
          spec,
        });
      }
      collected[key] = val;
    }

    if (!getter.assess(collected))
      UnexpectedCodePathError.throw(
        'from.lookup -> collected was assessed to have incorrect shape. this should not be possible',
        { from: { env: true }, collected: Object.keys(collected) },
      );

    return await getter.instantiate(collected);
  }

  // 🛑 should be unreachable (guard for future extension)
  throw new UnexpectedCodePathError('unsupported context.from', { input });
};
