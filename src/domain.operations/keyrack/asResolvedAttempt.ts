import type {
  KeyrackGrantAttempt,
  KeyrackRepoManifest,
} from '@src/domain.objects/keyrack';

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
