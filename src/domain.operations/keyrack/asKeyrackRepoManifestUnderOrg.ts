import { KeyrackRepoManifest } from '@src/domain.objects/keyrack/KeyrackRepoManifest';

/**
 * .what = the repo manifest, its declared keys re-slugged under one member of its org allowlist
 * .why = a sweep builds its slugs from the declared keys, which all carry the default org. a
 *        sweep asked for another member (`unlock --org bhanya`) must ask for that member's slugs,
 *        or it filters the default org's slugs down to an empty rack — one flag, two answers by
 *        verb (case=4, F2)
 *
 * .note = each spec rides across the re-slug, since the spec belongs to the declaration and not
 *         to the org; specs are keyed by full slug downstream (`decideIsKeyStrictlyRequired`), so
 *         a re-slug that dropped them would silently lose `is-optional-if-has` and `reaches`
 * .note = the caller owns the check that `org` is on the allowlist. the default org, or any
 *         value equal to `manifest.org`, returns the manifest untouched
 */
export const asKeyrackRepoManifestUnderOrg = (input: {
  manifest: KeyrackRepoManifest;
  org: string;
}): KeyrackRepoManifest => {
  // the default org is what every declared slug already carries
  if (input.org === input.manifest.org) return input.manifest;

  // swap the first org segment of each declared slug for the asked member
  const prefixFrom = `${input.manifest.org}.`;
  const keys = Object.fromEntries(
    Object.entries(input.manifest.keys).map(([slug, spec]) => {
      const slugUnderOrg = slug.startsWith(prefixFrom)
        ? `${input.org}.${slug.slice(prefixFrom.length)}`
        : slug;
      return [slugUnderOrg, { ...spec, slug: slugUnderOrg }];
    }),
  );

  return new KeyrackRepoManifest({
    ...input.manifest,
    org: input.org,
    keys,
  });
};
