import type {
  KeyrackGrantAttempt,
  KeyrackRepoManifest,
} from '@src/domain.objects/keyrack';

import { asKeyrackRepoManifestUnderOrg } from './asKeyrackRepoManifestUnderOrg';
import { asKeyrackSlugParts } from './asKeyrackSlugParts';
import { getAllKeyrackSlugsForEnv } from './getAllKeyrackSlugsForEnv';
import { inferKeyrackVaultFromKey } from './inferKeyrackVaultFromKey';
import { isKeyrackSlugMachineWide } from './isKeyrackSlugMachineWide';

/**
 * .what = promotes a locked or absent keyed read to `absent` when its key is not declared in keyrack.yml
 * .why = a human told "locked, unlock it" for an undeclared key would unlock forever and never be
 *        told to declare it; the absent fix line names the `keyrack set` that closes the gap
 */
export const asResolvedAttempt = (input: {
  attempt: KeyrackGrantAttempt;
  slug: string;
  keyName: string;
  env: string;
  repoManifest: KeyrackRepoManifest | null;
}): KeyrackGrantAttempt => {
  const { attempt, slug, keyName, env, repoManifest } = input;

  if (attempt.status !== 'locked' && attempt.status !== 'absent')
    return attempt;
  if (env === 'sudo') return attempt;
  // a machine-wide `@all` key lives in the host manifest, NOT any repo keyrack.yml — exactly like
  // a sudo key. so it must bypass the repo-manifest-membership promotion: a registered-but-locked
  // `@all` key is never a "not in repo manifest" absence, it is genuinely locked until unlock runs.
  if (isKeyrackSlugMachineWide({ slug })) return attempt;
  if (!repoManifest) return attempt;

  // a member slug is declared when its key is declared, so read the manifest under that member
  // .why = every declared slug carries the default org. without the re-slug, a locked
  //        `bhanya.prep.X` reads as "not in keyrack.yml" for a key the manifest does declare
  const { org: orgOfSlug } = asKeyrackSlugParts({ slug });
  const isMember = repoManifest.orgs.includes(orgOfSlug);
  const manifestForSlug = isMember
    ? asKeyrackRepoManifestUnderOrg({ manifest: repoManifest, org: orgOfSlug })
    : repoManifest;
  const repoSlugs = getAllKeyrackSlugsForEnv({
    manifest: manifestForSlug,
    env,
  });
  if (repoSlugs.includes(slug)) return attempt;

  // the fix line spells --org for a non-default member, so a copy-paste sets the key asked for
  const vaultHint = inferKeyrackVaultFromKey({ keyName }) ?? '<vault>';
  const orgFlag = (() => {
    if (!isMember) return '';
    if (orgOfSlug === repoManifest.org) return '';
    return ` --org ${orgOfSlug}`;
  })();
  return {
    status: 'absent',
    slug,
    message: `credential '${slug}' not found in repo manifest (keyrack.yml)`,
    fix: `rhx keyrack set --key ${keyName} --env ${env}${orgFlag} --vault ${vaultHint}`,
  };
};
