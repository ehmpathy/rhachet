import type { KeyrackGrantAttempt } from '@src/domain.objects/keyrack/KeyrackGrantAttempt';

import { asKeyrackAttemptSlug } from '../asKeyrackAttemptSlug';
import { getAllKeyrackSlugsForOrg } from '../getAllKeyrackSlugsForOrg';

/**
 * .what = narrow a set of grant attempts to those whose slug carries one org
 * .why = `source`'s bare sweep advertises `--org` in its help, and a flag a human can read but
 *        the code never consults is a published contract that partially works — the friction
 *        hazard a help line makes a promise about. this is what makes the promise true
 *
 * .note = the slug is read through `asKeyrackAttemptSlug`, so a locked or absent attempt is
 *         narrowed on the same axis as a granted one. to filter granted attempts alone would
 *         drop the very rows that TELL a human a key is locked
 * .note = the org-segment rule is DELEGATED to `getAllKeyrackSlugsForOrg`, so `source` cannot
 *         drift from `unlock`, `list`, and `status` on what "the org segment" means
 */
export const getAllKeyrackAttemptsForOrg = (input: {
  attempts: KeyrackGrantAttempt[];

  /** .what = the literal org segment to keep, or null for no filter */
  org: string | null;
}): KeyrackGrantAttempt[] => {
  if (!input.org) return input.attempts;

  const slugsForOrg = new Set(
    getAllKeyrackSlugsForOrg({
      slugs: input.attempts.map((attempt) => asKeyrackAttemptSlug({ attempt })),
      org: input.org,
    }),
  );

  return input.attempts.filter((attempt) =>
    slugsForOrg.has(asKeyrackAttemptSlug({ attempt })),
  );
};
