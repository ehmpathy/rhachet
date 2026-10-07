import { relative, sep } from 'node:path';

/**
 * .what = the role a path under `.agent/` names, by its coordinate segments
 */
export interface BootRoleCoordinates {
  slugRepo: string;
  slugRole: string;
}

/**
 * .what = reads the `.agent/repo=$slug/role=$name/` coordinate a path sits at, or null
 * .why = the coordinate shape is ONE contract with TWO readers — the gate-2 source picker
 *        and the foreign-spec predicate — so it lives in one place
 *        (`rule.require.named-transformers`).
 *
 * .note = the two readers ask different questions:
 *     - the SOURCE picker asks "is this exact path a role's spec?" — so it needs the
 *       `boot.yml` filename and the exact depth, or it would treat a brief as a spec
 *     - the FOREIGN predicate asks "does this path sit UNDER a linked role?" — so it must
 *       hold for `…/role=x/briefs/y.md` too, which a depth check would reject
 *   ⇒ one decode, two questions, and each caller states which it asks.
 */
export const asBootRoleCoordinates = (input: {
  path: string;
  cwd: string;
  /**
   * when true, the path must be exactly `.agent/repo=$slug/role=$name/boot.yml`.
   * when false, any path UNDER `.agent/repo=$slug/role=$name/` qualifies.
   */
  strict: boolean;
}): BootRoleCoordinates | null => {
  const segments = relative(input.cwd, input.path).split(sep);

  const segmentRepo = segments[1];
  const segmentRole = segments[2];

  const isUnderRoleCoordinate =
    segments[0] === '.agent' &&
    (segmentRepo?.startsWith('repo=') ?? false) &&
    (segmentRole?.startsWith('role=') ?? false);
  if (!isUnderRoleCoordinate) return null;

  // the strict caller wants the spec ITSELF, never a resource beneath it
  const isAtSpecExactly = segments.length === 4 && segments[3] === 'boot.yml';
  if (input.strict && !isAtSpecExactly) return null;

  return {
    slugRepo: segmentRepo!.slice('repo='.length),
    slugRole: segmentRole!.slice('role='.length),
  };
};
