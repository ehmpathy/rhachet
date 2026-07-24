import { ConstraintError } from 'helpful-errors';

import { getAllKeyrackInfraRegistryGithubApps } from './getAllKeyrackInfraRegistryGithubApps';
import { getAllKeyrackInfraRegistryGithubAppsFromInstalls } from './getAllKeyrackInfraRegistryGithubAppsFromInstalls';
import { getAllKeyrackInfraRegistryGithubAppsUnregistered } from './getAllKeyrackInfraRegistryGithubAppsUnregistered';
import { getKeyrackInfraExists } from './getKeyrackInfraExists';
import { getGhOrgInstalls } from './gh/getGhOrgInstalls';
import type { GhRun } from './gh/runGh';
import type { KeyrackInfraRegistryGithubApp } from './KeyrackInfraRegistryGithubApp';

/**
 * .what = discover the github apps a caller may pick for an org, admin-free
 * .why = members read the keyrack-infra registry; admins additionally see any
 *        org-installed app not yet registered, so a new app is discoverable even
 *        when the registry already holds others (per the vision discovery order)
 *
 * .note = requires keyrack-infra to exist (mandatory prerequisite); fails loud otherwise
 * .note = member (403) → registry only; empty registry → fail loud "ask an admin"
 * .note = admin → union of registry + freshly-discovered installs (deduped by slug),
 *         so an admin can register a brand-new app even with a non-empty registry
 * .note = github returns 404 for both an absent repo AND a private repo the caller
 *         cannot read — the two are indistinguishable at the api, so the not-found
 *         error names both remedies (init it, or ask for read access)
 */
export const getKeyrackInfraCandidateApps = (
  input: { org: string },
  context: { ghRun: GhRun },
): KeyrackInfraRegistryGithubApp[] => {
  const { org } = input;

  // require keyrack-infra to be reachable for this org (mandatory prerequisite)
  // a 404 means either the repo is absent or the caller lacks read access — github
  // hides the difference, so the hint covers both remedies
  if (!getKeyrackInfraExists({ org }, context))
    throw new ConstraintError(`keyrack-infra not reachable for ${org}`, {
      hint: `if it is not set up yet, run: rhx keyrack infra init --org ${org}; if it exists, ask an admin to grant you read access to ${org}/keyrack-infra`,
    });

  // read the member-readable registry (the admin-free discovery source)
  const registryApps = getAllKeyrackInfraRegistryGithubApps({ org }, context);

  // attempt the admin-only install list to surface any not-yet-registered apps;
  // this is also how we classify the caller — a 403 marks a member
  const adminResult = getGhOrgInstalls({ org }, context);

  // member (403) → the registry is the only source they can read
  if (adminResult.forbidden) {
    // registry has apps → the member picks from the registry (no admin needed)
    if (registryApps.length > 0) return registryApps;

    // registry empty + member → they cannot discover apps, must ask an admin
    throw new ConstraintError(`no github apps registered for ${org}`, {
      hint: 'ask an admin to add a github app to keyrack for this org',
    });
  }

  // admin → union the registry with freshly-discovered installs (deduped by slug),
  // so a brand-new app is discoverable even when the registry already holds others
  const installApps = getAllKeyrackInfraRegistryGithubAppsFromInstalls({
    org,
    installs: adminResult.installs,
  });
  return [
    ...registryApps,
    ...getAllKeyrackInfraRegistryGithubAppsUnregistered({
      registryApps,
      installApps,
    }),
  ];
};
