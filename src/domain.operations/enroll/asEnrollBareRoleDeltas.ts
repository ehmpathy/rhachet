import { isEnrollBareRoleDelta } from './isEnrollBareRoleDelta';

/**
 * .what = split the brain passthrough into the bare role deltas it carries and the rest
 * .why = enroll reads its roles off `--roles` AND off bare deltas after the brain; the deltas
 *   must leave the passthrough, or the brain receives `-driver` and reads it as its own flag
 *   (claude reads `-d` as `--debug`)
 */
export const asEnrollBareRoleDeltas = (input: {
  passthrough: string[];
  rolesLinked: string[];
}): { deltas: string[]; passthrough: string[] } => ({
  deltas: input.passthrough.filter((token) =>
    isEnrollBareRoleDelta({ token, rolesLinked: input.rolesLinked }),
  ),
  passthrough: input.passthrough.filter(
    (token) =>
      !isEnrollBareRoleDelta({ token, rolesLinked: input.rolesLinked }),
  ),
});
