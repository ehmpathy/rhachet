import { ConstraintError } from 'helpful-errors';

import type { KeyrackKeyReach } from '@src/domain.objects/keyrack';

/**
 * .what = the convention this mech imposes on a reach exid it is handed
 * .why = a reach is plaintext everywhere else, but THIS mech must mint a token FOR a
 *        reach — so it needs the exid to name a github org it can look up
 */
const GITHUB_REACH_PATTERN = /^github:\/\/org=(.+)$/;

/**
 * .what = read the github org out of a reach exid
 * .why = EPHEMERAL_VIA_GITHUB_APP is the one mech that INTERPRETS a reach. every other
 *        mech carries the exid through opaquely, because for them a reach only decides
 *        which spot the value is stored in — it does not decide what gets minted
 *
 * .note = this lives in the mech, not in `asKeyrackKeyReach`, precisely because it is a
 *         mech-local convention. keyrack itself has no schemes and no uris; an exid is
 *         legal on its own terms, and only this mech asks more of it
 * .note = the rejection names the form rather than guess an org from a bare word. a bare
 *         exid read as an org would mint a token for a reach the human never named,
 *         which is the whole failure this design exists to make impossible (e2)
 */
export const asGithubOrgFromReach = (input: {
  reach: KeyrackKeyReach;
}): string => {
  const matched = GITHUB_REACH_PATTERN.exec(input.reach.exid);

  if (!matched)
    throw new ConstraintError(
      `a github-app key needs its reach to name a github org, and '${input.reach.exid}' does not — this mech MINTS a token for one org's installation, so it must know which org, and it will not guess one from a plaintext exid`,
      {
        exid: input.reach.exid,
        hint: 'name the org — --reach github://org=$org',
      },
    );

  return matched[1]!;
};
