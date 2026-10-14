import { getDecodedRoleDeltaToken } from '../roles/deltas/getDecodedRoleDeltaToken';

/**
 * .what = is this token a bare role delta — `+role`, `-role`, `+repo/role` — that names a LINKED role?
 * .why = `rhx enroll claude -driver` is an alias of `rhx enroll claude --roles -driver`
 *   (`inventory.of=requirements.case=4`). a bare `-<x>` also looks like a brain's own short
 *   flag, so only a token whose body names a linked role reads as a delta; `-c`, `-p` and
 *   every other brain flag pass through to the brain untouched
 *
 * .note = the token may arrive sentinel-encoded (commander's view of argv), so it is decoded first
 * .note = the repo, when qualified, is left to the enrollment to check: the linked set holds
 *   one ref per slug, so a qualified token for a second repo's copy of a role must still
 *   read as a delta here
 */
export const isEnrollBareRoleDelta = (input: {
  token: string;
  rolesLinked: string[];
}): boolean => {
  const token = getDecodedRoleDeltaToken({ token: input.token });

  // a delta wears a sigil; a `--long` flag never is one
  const isSigiled =
    token.startsWith('+') || (token.startsWith('-') && !token.startsWith('--'));
  if (!isSigiled) return false;

  // the role is the body after an optional `repo/`
  const parts = token.slice(1).split('/');
  if (parts.length > 2) return false;
  const role = parts[parts.length - 1];
  if (!role) return false;

  // a delta only when the body names a linked role
  return input.rolesLinked.includes(role);
};
