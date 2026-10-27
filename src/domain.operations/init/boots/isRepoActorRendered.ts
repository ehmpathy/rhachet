import type { syncBootsForBrainDirs } from './syncBootsForBrainDirs';

/**
 * .what = whether the repo actor's brain dir rendered: no failure in the list is the repo's
 * .why = the hook sync keeps the role boot hooks while the repo actor's render is absent, so a
 *   repo never holds neither
 * .note = pass the unsplit list: a skip sets no exit code, yet a skipped repo actor did not
 *   render either
 */
export const isRepoActorRendered = (input: {
  failures: Awaited<ReturnType<typeof syncBootsForBrainDirs>>['failures'];
}): boolean => input.failures.every((failure) => failure.scope.kind !== 'repo');
