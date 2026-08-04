import type {
  KeyrackGrantAttempt,
  KeyrackRepoManifest,
} from '@src/domain.objects/keyrack';

import { asKeyrackKeyOrg } from './asKeyrackKeyOrg';
import { getAllKeyrackSlugsForEnv } from './getAllKeyrackSlugsForEnv';
import { inferKeyrackVaultFromKey } from './inferKeyrackVaultFromKey';

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
  if (asKeyrackKeyOrg({ slug }) === '@all') return attempt;
  if (!repoManifest) return attempt;

  const repoSlugs = getAllKeyrackSlugsForEnv({ manifest: repoManifest, env });
  if (repoSlugs.includes(slug)) return attempt;

  const vaultHint = inferKeyrackVaultFromKey({ keyName }) ?? '<vault>';
  return {
    status: 'absent',
    slug,
    message: `credential '${slug}' not found in repo manifest (keyrack.yml)`,
    fix: `rhx keyrack set --key ${keyName} --env ${env} --vault ${vaultHint}`,
  };
};
