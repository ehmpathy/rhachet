import type { KeyrackHostManifest } from '@src/domain.objects/keyrack/KeyrackHostManifest';
import type { KeyrackKeyAsk } from '@src/domain.objects/keyrack/KeyrackKeyAsk';

/**
 * .what = expand key ask to matched sudo slugs from hostManifest
 * .why = sudo keys use org-scoped lookup: repo org first, then @all fallback
 *
 * .note = if full slug provided (org.env.key format), uses it directly
 * .note = if key name only, expands to {repoOrg}.sudo.{keyAsk} + @all.sudo.{keyAsk}
 * .note = asks come from CLI callers
 */
export const getAllSudoSlugsForKeyAsk = (input: {
  keyAsk: KeyrackKeyAsk;
  repoOrg: string | null;
  hostManifest: KeyrackHostManifest;
}): string[] => {
  // detect if keyAsk is a full slug (org.env.key format)
  const isFullSlug =
    input.keyAsk.includes('.') && input.hostManifest.hosts[input.keyAsk];

  // expand keyAsk to candidate slugs
  const candidateSlugs: string[] = isFullSlug
    ? [input.keyAsk]
    : [
        // org-specific slug (if repo has org declared)
        ...(input.repoOrg ? [`${input.repoOrg}.sudo.${input.keyAsk}`] : []),
        // cross-org wildcard
        `@all.sudo.${input.keyAsk}`,
      ];

  // filter to slugs that exist in hostManifest
  return candidateSlugs.filter((slug) => input.hostManifest.hosts[slug]);
};
