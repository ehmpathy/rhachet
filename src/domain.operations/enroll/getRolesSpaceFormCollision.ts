import { isRolesFlag } from '@src/domain.operations/roles/deltas/isRolesFlag';

import { isEnrollBareRoleDelta } from './isEnrollBareRoleDelta';

/**
 * .what = returns the first extra role token that appears as a SEPARATE argument
 *         after enroll's single-valued `--roles` value — i.e. an unquoted
 *         multi-delta space form — or null when there is no such collision
 * .why = enroll's `--roles <spec>` is single-valued, so commander keeps only the
 *        first token as the value. a second space-separated token like `-reviewer`
 *        is left raw and commander's combo-short-flag branch mangles it (`-r` is
 *        enroll's own `--roles` alias) into a garbage role name, which silently
 *        drops the first delta. a detection here lets enroll fail loud with the
 *        comma-form fix instead of a misleading "role 'eviewer' not found".
 *
 * .note = only a token whose bare name is a LINKED role counts as a collision, so
 *   a genuine brain passthrough short flag (e.g. `-v`, whose bare `v` is not a
 *   linked role) is never mistaken for a role delta
 */
export const getRolesSpaceFormCollision = (input: {
  rawArgs: string[];
  rolesLinked: string[];
}): string | null => {
  const { rawArgs, rolesLinked } = input;

  // locate the roles flag; commander consumes exactly one value after it
  const flagIndex = rawArgs.findIndex(
    (arg) => isRolesFlag({ token: arg }) || arg.startsWith('--roles='),
  );
  if (flagIndex === -1) return null;

  // the separate form (`--roles x`) consumes the token at flagIndex+1 as the one
  // value; the inline form (`--roles=x`) embeds its value in the flag token, so
  // the scan for extra role tokens starts one position sooner
  const isSeparateForm = isRolesFlag({ token: rawArgs[flagIndex]! });
  const scanStart = isSeparateForm ? flagIndex + 2 : flagIndex + 1;

  // the first post-value token that names a linked role (bare, or in +/-/repo
  // sigiled shape) is the collision — a role a user meant as a second delta.
  // `isEnrollBareRoleDelta` holds the one linked-role rule; an unsigiled token is read
  // as an addition so it counts too, and a `--long` flag is never a role token
  const collision = rawArgs.slice(scanStart).find((token) =>
    isEnrollBareRoleDelta({
      token: /^[+-]/.test(token) ? token : `+${token}`,
      rolesLinked,
    }),
  );

  return collision ?? null;
};
