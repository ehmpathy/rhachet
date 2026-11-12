import { ConstraintError } from 'helpful-errors';

import type { RoleLinkRef } from '@src/domain.objects/RoleLinkRef';

import { BOOT_CACHE_BOUNDARY_LINE } from './getOneBootCacheBoundary';

/**
 * .what = refuse a render where any role's boot body holds the cache boundary literal, anywhere
 * .why = claude splits the system prompt at that line; a second copy inside a role body would cut
 *        the cache in the wrong place, silently. only the render places it
 * .note = strict on purpose: the vendor documents an own-line split, and whether an inline copy
 *         also splits is unmeasured. a refusal fails loud; a lenient pass would fail silent
 */
export const assertRoleBootsFreeOfCacheBoundary = (input: {
  roles: { ref: RoleLinkRef; body: string }[];
}): void => {
  // find each role whose body holds the boundary literal
  const offenders = input.roles
    .filter(({ body }) => body.includes(BOOT_CACHE_BOUNDARY_LINE))
    .map(({ ref }) => `repo=${ref.repo}/role=${ref.role}`);
  if (offenders.length === 0) return;

  // refuse, and name the roles to fix
  throw new ConstraintError('a role boot holds the cache boundary literal', {
    offenders,
    literal: BOOT_CACHE_BOUNDARY_LINE,
    hint: 'the render owns this literal. a role of this repo (repo=.this): name it another way in its briefs (e.g. "the system prompt boundary line"). a role from a package: upgrade it, or unlink it via `rhx init --roles -<role>`, and report the brief to its owner',
  });
};
