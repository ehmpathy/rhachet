/**
 * .what = extract org label from aws sso config
 * .why = enables org display in domain picker (e.g., "https://d-xxx.awsapps.com/start — ahbode")
 *
 * .note = tries subdomain first, falls back to common prefix of profile names
 * .note = profile names follow $org.$env pattern (e.g., ahbode.test, ahbode.prod)
 */
export const asOrgLabelFromSsoStartUrl = (input: {
  ssoStartUrl: string;
  profileNames?: string[];
}): string | null => {
  // try subdomain if meaningful (not a random d-xxx ID)
  const subdomainMatch = input.ssoStartUrl.match(
    /^https:\/\/([^.]+)\.awsapps\.com\/start$/,
  );
  if (subdomainMatch) {
    const subdomain = subdomainMatch[1] ?? '';
    // skip if random ID like d-90660aa711
    if (!subdomain.startsWith('d-')) {
      return subdomain;
    }
  }

  // try common prefix from profile names
  if (input.profileNames && input.profileNames.length > 0) {
    const commonPrefix = asCommonPrefixFromProfileNames({
      profileNames: input.profileNames,
    });
    if (commonPrefix) return commonPrefix;
  }

  return null;
};

/**
 * .what = extract common prefix from profile names
 * .why = profiles follow $org.$env pattern, common prefix is the org
 *
 * .example = ['ahbode.test', 'ahbode.prod', 'ahbode.prep'] → 'ahbode'
 */
export const asCommonPrefixFromProfileNames = (input: {
  profileNames: string[];
}): string | null => {
  if (input.profileNames.length === 0) return null;

  // extract first segment (org) from each profile name
  const orgs = input.profileNames
    .map((name) => name.split('.')[0])
    .filter((org): org is string => !!org);

  if (orgs.length === 0) return null;

  // check if all orgs are the same
  const firstOrg = orgs[0]!;
  const allSame = orgs.every((org) => org === firstOrg);

  return allSame ? firstOrg : null;
};
