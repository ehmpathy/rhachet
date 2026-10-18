/**
 * .what = renders a raw `org:` value as the text an init report shows
 * .why = `org:` may be a scalar or a list; a list cast to text with `as string` would render
 *        as `ahbode,bhanya` by accident, so a report names the list in declared order instead
 *
 * .note = a value that is neither a nonempty text nor a list yields the fallback
 */
export const asKeyrackManifestOrgText = (input: {
  org: unknown;
  fallback: string;
}): string => {
  if (Array.isArray(input.org) && input.org.length > 0)
    return input.org.map(String).join(', ');
  if (typeof input.org === 'string' && input.org !== '') return input.org;
  return input.fallback;
};
