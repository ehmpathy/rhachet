import type { RoleBriefRef } from './getRoleBriefRefs';

/**
 * .what = failfast if orphan .md.min files are detected
 * .why = .md.min is derived from .md source — orphan .md.min without
 *        source .md is a defect that must be caught early
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
  throw new Error(
    `orphan .md.min file(s) detected without .md source:\n${orphanPaths}\n\neach .md.min file must have a matched .md source file.`,
  );
};
