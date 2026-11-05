import { ConstraintError, MalfunctionError } from 'helpful-errors';

import { isErrnoOfDenial } from '@src/infra/filesystem/isErrnoOfDenial';

/**
 * .what = the fault an actor's settings pass reports: an fs denial becomes a ConstraintError
 *   that names the actor, its roles, the path, the errno and the fix; a rejection that is no
 *   Error becomes a MalfunctionError; any other Error keeps its own class
 * .why = a raw fs error is no HelpfulError, so its row printed with no hint. the wrap gives the
 *   row its roles, its path and its fix
 * .note = only the errnos of denial (EACCES, EPERM, EROFS) are wrapped, so a malfunction is
 *   never relabelled as a caller fault; the raw error rides as the cause
 */
export const asActorSettingsFaultWrapped = (input: {
  error: unknown;
  actorExid: string;
  roles: string[];
  brainDirRel: string;
}): Error => {
  // a rejection that is no Error carries no class to keep: ours to report
  if (!(input.error instanceof Error))
    return new MalfunctionError('actor settings derivation rejected', {
      actorExid: input.actorExid,
      reason: input.error,
      hint: 'rerun `rhx init --hooks`; if it fails again, report this output as a rhachet bug',
    });

  // any fault but a denial keeps its own class
  if (!isErrnoOfDenial(input.error)) return input.error;

  // .note = a cast at the node fs boundary: node types its fs errors as a plain `Error`, and
  //   `isErrnoOfDenial` has just proven the string `code` is present
  const errno = (input.error as NodeJS.ErrnoException).code;
  return new ConstraintError(`actor settings could not be written (${errno})`, {
    actorExid: input.actorExid,
    roles: input.roles,
    path: input.brainDirRel,
    errno,
    hint: 'restore write access to that dir, then rerun `rhx init --hooks`',
    cause: input.error,
  });
};
