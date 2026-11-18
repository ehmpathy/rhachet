import { basename, dirname } from 'node:path';

/**
 * .what = the actor dir that holds a brain dir, or null when the brain dir sits outside the
 *         `<actor>/brain/.claude` layout
 * .why = the inverse of `getBrainOndiskDir`. a boot render knows only its brain dir, and the
 *        drift fan-out it triggers writes under the actor; a brain dir of any other shape has
 *        no actor to write under, so the answer is null rather than a guess
 */
export const getActorOndiskDirOfBrainDir = (input: {
  brainDir: string;
}): string | null => {
  // the brain dir must be `<actor>/brain/.claude`
  const isActorLayout =
    basename(input.brainDir) === '.claude' &&
    basename(dirname(input.brainDir)) === 'brain';
  if (!isActorLayout) return null;

  return dirname(dirname(input.brainDir));
};
