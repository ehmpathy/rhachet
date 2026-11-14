/**
 * .what = the kind of a repo slug under `.agent/` — this repo's own roles, its mods, or a
 *         role package
 * .why = `.this` and `.mods` are the two reserved repo literals, and neither is a role
 *        supplier. every scanner of `.agent/repo=*` asks this one predicate, so the next
 *        scanner cannot forget a literal
 *
 * .note = takes a bare slug (`.mods`) or a dir entry (`repo=.mods`), so a scanner passes
 *   what it already holds
 */
export const asRepoSlugKind = (input: {
  slug: string;
}): 'native' | 'mods' | 'package' => {
  const slug = input.slug.startsWith('repo=')
    ? input.slug.slice('repo='.length)
    : input.slug;
  if (slug === '.this') return 'native';
  if (slug === '.mods') return 'mods';
  return 'package';
};
