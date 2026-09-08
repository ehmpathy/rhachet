import { ConstraintError } from 'helpful-errors';

import type { RoleBriefRef } from './getRoleBriefRefs';

/**
 * .what = failfast if orphan .md.min files are detected
 * .why = .md.min is derived from .md source — orphan .md.min without
 *        source .md is a defect that must be caught early
 *
 * .note = the class is `ConstraintError` (exit 2), never `MalfunctionError`: the orphan
 *   sits in the CALLER's brief tree, so only the caller can settle it — restore the `.md`
 *   or delete the `.md.min`. an unclassified `Error` here reached the cli with no verdict,
 *   so the frame guessed `MalfunctionError` and told a human OUR install was broken.
 */
export const assertZeroOrphanMinifiedBriefs = (input: {
  orphans: Array<Omit<RoleBriefRef, 'pathToOriginal'>>;
}): void => {
  // no orphans = no-op
  if (input.orphans.length === 0) return;

  // failfast with error that names each orphan
  const orphanPaths = input.orphans
    .map((o) => `  - ${o.pathToMinified}`)
    .join('\n');

  // .note = the message carries NO glyph. `asCliErrorFrame` prepends one from the error's
  //   class, so a glyph here renders twice.
  throw new ConstraintError(
    `orphan .md.min file(s) detected without .md source:\n${orphanPaths}\n\neach .md.min file must have a matched .md source file.`,
    {
      orphanPaths: input.orphans.map((o) => o.pathToMinified),
      hint: 'a .md.min is derived from its .md source — restore the absent .md, or delete the orphan .md.min',
    },
  );
};
