import { ConstraintError, MalfunctionError } from 'helpful-errors';

import { getBrainOndiskDir } from '@src/domain.operations/actor/enrolled/getBrainOndiskDir';
import { getOneRepoActorOndiskDir } from '@src/domain.operations/actor/enrolled/getOneRepoActorOndiskDir';
import { isErrnoOfDenial } from '@src/infra/filesystem/isErrnoOfDenial';

import { relative } from 'node:path';
import { getOneReadonlyOutsideSettingsTargetOrNull } from './getOneReadonlyOutsideSettingsTargetOrNull';

/**
 * .what = probe the repo actor's `settings.json` arrow for a read-only home file, and settle the
 *   probe into its target or its fault
 * .why = the probe runs after every write, only to print a note. a fault it throws must report
 *   as a row and an error, never kill init with a stack once the work is done
 *
 * .note = a skipped repo actor yields neither: its dir lands outside the repo, and its `⚠️`
 *   block already names it
 * .note = a denial (EACCES, EPERM, EROFS) becomes a ConstraintError that names the path and the
 *   fix; any other Error keeps its own class, so a malfunction is never relabelled
 */
export const getOneRepoActorReadonlyTargetSettled = (input: {
  repoPath: string;
  isSkipped: boolean;
}): {
  target: { path: string; landsAt: string } | null;
  fault: Error | null;
} => {
  // a skipped repo actor has no arrow of ours to probe
  if (input.isSkipped) return { target: null, fault: null };

  // probe the arrow; a probe fault is settled, never thrown
  const brainDir = getBrainOndiskDir({
    actorDir: getOneRepoActorOndiskDir({ repoPath: input.repoPath }),
  });
  try {
    return {
      target: getOneReadonlyOutsideSettingsTargetOrNull({
        repoPath: input.repoPath,
        brainDir,
      }),
      fault: null,
    };
  } catch (error) {
    return {
      target: null,
      fault: asProbeFault({
        error,
        brainDirRel: relative(input.repoPath, brainDir),
      }),
    };
  }
};

/**
 * .what = the fault a probe reports: a denial names the path and the fix, a throw that is no
 *   Error becomes a MalfunctionError, any other Error keeps its own class
 * .note = the denial is read first and structurally: an fs error thrown across a vm realm (e.g.
 *   under jest) fails `instanceof Error`, yet is still a denial
 */
const asProbeFault = (input: {
  error: unknown;
  brainDirRel: string;
}): Error => {
  // a denial names the path and the fix
  if (isErrnoOfDenial(input.error)) {
    // .note = a cast at the node fs boundary: `isErrnoOfDenial` has just proven the string
    //   `code` is present on an fs error
    const errorFs = input.error as NodeJS.ErrnoException;
    const errno = errorFs.code;
    return new ConstraintError(
      `repo actor settings could not be read (${errno})`,
      {
        path: input.brainDirRel,
        errno,
        hint: 'restore read access to that dir, then rerun `rhx init --hooks`',
        cause: errorFs,
      },
    );
  }

  // any other Error keeps its own class
  if (input.error instanceof Error) return input.error;

  // a throw that is no Error carries no class to keep: ours to report
  return new MalfunctionError('repo actor settings probe threw a non-Error', {
    path: input.brainDirRel,
    reason: input.error,
    hint: 'rerun `rhx init --hooks`; if it fails again, report this output as a rhachet bug',
  });
};
