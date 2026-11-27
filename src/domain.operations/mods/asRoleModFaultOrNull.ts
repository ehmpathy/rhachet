import {
  ConstraintError,
  type HelpfulError,
  MalfunctionError,
} from 'helpful-errors';

import { asErrnoCode } from '@src/infra/filesystem/asErrnoCode';
import { isRepoMutexHeldError } from '@src/infra/lock/asRepoMutexHeldError';

import { types } from 'node:util';
import { asRoleModFaultOfErrno } from './asRoleModFaultOfErrno';

/**
 * .what = a thrown value as a fault of a mod, as the mod gate admits it, or null
 * .why = the gate skips a mod on a fault a human can cure, and lets every other throw escape
 *        loud (`rule.forbid.failhide`): a code defect is never reported as a fault of a mod
 *
 * .note = three classes, each one the mods domain mints or meets: a refusal (ConstraintError),
 *   a corrupt view record (MalfunctionError), and an fs errno on a path the mod or its view
 *   holds (a native error with a string `code`), classed with its fix (`asRoleModFaultOfErrno`)
 * .note = the one allowlist of the domain: the boot gate, the render, the published re-read, and
 *   the stop sweep each read it, so a fault one skips is a fault each skips
 * .note = a repo lock another rhx process held past the wait is a ConstraintError, yet never a
 *   fault of a mod: it is host contention, so it escapes loud with its own hint, and a sound mod
 *   is never skipped under a notice that blames it (`isRepoMutexHeldError`)
 * .note = the errno branch reads the error structurally (`isNativeError`, `asErrnoCode`), since an
 *   fs error thrown across a vm realm (e.g. under jest) fails `instanceof Error`
 */
export const asRoleModFaultOrNull = (input: {
  error: unknown;
}): HelpfulError | null => {
  const { error } = input;
  if (isRepoMutexHeldError({ error })) return null;
  if (error instanceof ConstraintError || error instanceof MalfunctionError)
    return error;
  if (!types.isNativeError(error)) return null;
  const code = asErrnoCode({ error });
  if (code === null) return null;
  return asRoleModFaultOfErrno({ error, code });
};
