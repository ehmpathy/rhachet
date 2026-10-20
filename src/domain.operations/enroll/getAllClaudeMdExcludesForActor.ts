import { join, relative } from 'node:path';
import { asClaudeMdExcludesOutsideDirs } from './asClaudeMdExcludesOutsideDirs';
import { getAllClaudeMdExcludes } from './getAllClaudeMdExcludes';

/**
 * .what = the `claudeMdExcludes` one actor's `settings.of.repo.json` carries: every door but
 *         the actor's own
 * .why = enroll (at spawn) and init (at layout) write the same list, so it derives one way
 *
 * .note = the repo actor's doors have two paths — its real dir, and `<repo>/.claude`, a
 *   symlink to it — so neither path may be excluded for it, or its own boot would hide
 * .note = whether the actor IS the repo actor is read off the two dirs, never passed beside
 *   them, so a caller cannot name one actor's dir and the other's role
 */
export const getAllClaudeMdExcludesForActor = (input: {
  repoPath: string;
  repoActorBrainDir: string;
  actorBrainDir: string;
}): string[] => {
  const isRepoActor =
    relative(input.repoActorBrainDir, input.actorBrainDir) === '';
  return asClaudeMdExcludesOutsideDirs({
    excludes: getAllClaudeMdExcludes({
      repoPath: input.repoPath,
      repoActorBrainDir: input.repoActorBrainDir,
    }),
    dirs: isRepoActor
      ? [input.actorBrainDir, join(input.repoPath, '.claude')]
      : [input.actorBrainDir],
  });
};
