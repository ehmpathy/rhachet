import { CLONE_ENV_KEYS } from '@src/utils/cloneEnvKeys';

/**
 * .what = an env with a spawned clone's place in the chain written in: its depth, and
 *   its leaf mark when it is a reviewer
 * .why =
 *   - one owner for both enroll spawn branches (the pty clone and the plain spawn), so
 *     neither can drop the mark a reviewer must carry (#577)
 *   - a WORK child carries no leaf key at all, never `''` or `'undefined'`: node-pty
 *     writes an `undefined` value through as the literal string, which would read as a
 *     leaf and lock the work clone out of its own reviews
 */
export const asCloneSpawnPlaceEnv = (input: {
  env: NodeJS.ProcessEnv;
  depth: number;
  leaf: boolean;
}): NodeJS.ProcessEnv => ({
  ...Object.fromEntries(
    Object.entries(input.env).filter(([key]) => key !== CLONE_ENV_KEYS.leaf),
  ),
  [CLONE_ENV_KEYS.depth]: String(input.depth),
  ...(input.leaf ? { [CLONE_ENV_KEYS.leaf]: '1' } : {}),
});
