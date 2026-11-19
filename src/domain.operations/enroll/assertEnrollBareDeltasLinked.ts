import { distance } from 'fastest-levenshtein';
import { ConstraintError } from 'helpful-errors';

import { getDecodedRoleDeltaToken } from '@src/domain.operations/roles/deltas/getDecodedRoleDeltaToken';

/**
 * .what = refuse a bare delta in the brain passthrough that names no linked role — a typo
 * .why = `rhx clone @spare +alhpa` would hand `+alhpa` to the brain as its prompt, spawn the
 *   base actor, and exit 0; the human never learns the override was dropped
 *
 * .note = a `+`-led token is never a brain flag, so one that names no linked role is a typo
 * .note = a `-`-led token may be a brain flag (`-p`, `-c`), so it is refused only when its body
 *   is a multi-letter word near a linked role (`-bta` → `beta`); every other one passes through
 * .note = the passthrough here already holds no delta that names a linked role
 *   (`asEnrollBareRoleDeltas`), so each sigiled token left is a candidate typo
 */
export const assertEnrollBareDeltasLinked = (input: {
  passthrough: string[];
  rolesLinked: string[];
}): void => {
  for (const raw of input.passthrough) {
    const token = getDecodedRoleDeltaToken({ token: raw });
    const typo = asTypoOfToken({ token, rolesLinked: input.rolesLinked });
    if (typo === null) continue;
    const suggestionText = typo.nearest
      ? `, did you mean '${token[0]}${typo.nearest}'?`
      : '';
    throw new ConstraintError(
      `role delta '${token}' names no linked role${suggestionText}`,
      {
        token,
        rolesLinked: input.rolesLinked,
        hint:
          input.rolesLinked.length > 0
            ? `linked roles: ${input.rolesLinked.join(', ')}`
            : 'no roles linked yet — run `rhx init` first',
      },
    );
  }
};

/**
 * .what = the typo a sigiled token carries, with its nearest linked role; null when the
 *   token is not a delta typo
 */
const asTypoOfToken = (input: {
  token: string;
  rolesLinked: string[];
}): { nearest: string | null } | null => {
  // a `--long` flag, or an unsigiled word, is never a delta
  const sigil = input.token[0];
  if (sigil !== '+' && sigil !== '-') return null;
  if (input.token.startsWith('--')) return null;

  // the role is the body after an optional `repo/`, before an optional `::focus`
  const body = input.token.slice(1).split('/').pop()?.split('::')[0] ?? '';
  if (!/^[a-z][a-z0-9-]*$/.test(body)) return null;
  const nearest = getNearestRole({
    role: body,
    rolesLinked: input.rolesLinked,
  });

  // `+` is never a brain flag: any body that is a word is a typo
  if (sigil === '+') return { nearest };

  // `-` may be a brain flag: only a multi-letter body near a linked role is a typo
  if (body.length < 3 || nearest === null) return null;
  return { nearest };
};

/**
 * .what = the linked role nearest a body, within half its length; null when none is near
 */
const getNearestRole = (input: {
  role: string;
  rolesLinked: string[];
}): string | null => {
  const ranked = input.rolesLinked
    .map((candidate) => ({ candidate, dist: distance(input.role, candidate) }))
    .sort((a, b) => a.dist - b.dist);
  const best = ranked[0];
  if (!best) return null;
  return best.dist <= Math.ceil(input.role.length / 2) ? best.candidate : null;
};
