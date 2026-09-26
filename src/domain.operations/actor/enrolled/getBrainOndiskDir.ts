import { join } from 'node:path';

/**
 * .what = an actor's brain dir, the config dir its clones read
 * .why = one owner of the `brain/.claude` segment, for a hash actor and the default alike
 */
export const getBrainOndiskDir = (input: { actorDir: string }): string =>
  join(input.actorDir, 'brain', '.claude');
