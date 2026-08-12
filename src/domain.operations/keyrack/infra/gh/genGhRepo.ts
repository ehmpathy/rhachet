import { ConstraintError, MalfunctionError } from 'helpful-errors';

import { getGhRepoExists } from './getGhRepoExists';
import { getGhRepoVisibility } from './getGhRepoVisibility';
import { isGhAlreadyExistsStderr } from './isGhAlreadyExistsStderr';
import type { GhRun } from './runGh';

/**
 * .what = findsert a private github repo; create only when absent
 * .why = keyrack-infra bootstrap needs the $org/keyrack-infra repo to exist
 *
 * .note = idempotent: returns 'found' when the repo already exists, else creates it
 * .note = concurrency-safe: the check-then-create is a toctou race, but github is the
 *         atomic arbiter — a concurrent create that loses the race gets a 422 "already
 *         exists", which we treat as 'found', so parallel runs converge without a lost
 *         failure
 * .note = anyone with repo-create rights in the org may run this (per decision)
 */
export const genGhRepo = (
  input: { slug: string },
  context: { ghRun: GhRun },
): { effect: 'created' | 'found' } => {
  // findsert fast-path: skip create when the repo already exists
  if (getGhRepoExists({ slug: input.slug }, context)) {
    // the lock IS the private access: a public keyrack-infra would leak the org's
    // app/install ids to the world. a create is always --private, but a pre-extant repo
    // could have been flipped public out-of-band, so we assert it here and fail loud
    const visibility = getGhRepoVisibility({ slug: input.slug }, context);
    if (visibility !== 'private')
      throw new ConstraintError(
        'keyrack-infra repo exists but is not private',
        {
          slug: input.slug,
          visibility,
          hint: `keyrack-infra must be private — its access is the lock. run: gh repo edit ${input.slug} --visibility private`,
        },
      );

    return { effect: 'found' };
  }

  // create the private repo
  const result = context.ghRun({
    args: ['repo', 'create', input.slug, '--private'],
  });

  // success → we created it
  if (result.status === 0) return { effect: 'created' };

  // toctou race: a concurrent caller created it first (422 already exists) → the
  // repo now exists, so this findsert converges to 'found' rather than a hard error
  if (isGhAlreadyExistsStderr({ stderr: result.stderr }))
    return { effect: 'found' };

  // any other gh error → fail loud, with a hint the caller can act on.
  // .note = the hint names both levers because this catch-all covers distinct faults:
  //         a 401 is authn (fix via `gh auth status`), a 403 is authz (the token is valid
  //         but the org has not granted repo-create — ask an owner). to conflate the two
  //         sends a 403 caller to the wrong lever, so we spell out both
  throw new MalfunctionError('gh repo create failed', {
    slug: input.slug,
    stderr: result.stderr,
    status: result.status,
    hint: 'if unauthenticated, run `gh auth status`; if authenticated but forbidden (403), ask an org owner to grant you repo-create access',
  });
};
