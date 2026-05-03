import { clearAwsSsoCacheForDomain } from '@src/domain.operations/keyrack/adapters/vaults/aws.config/clearAwsSsoCacheForDomain';

/**
 * .what = logs out of aws sso session for a specific domain (server-side + disk)
 * .why = clears both server-side session AND local cache to prevent cross-user contamination
 *
 * .note = we do NOT use `aws sso logout` because it logs out ALL domains
 *         @see https://docs.aws.amazon.com/cli/latest/reference/sso/logout.html
 *         > Removes all cached AWS IAM Identity Center access tokens
 *         > and any cached temporary AWS credentials retrieved with SSO
 *         > access tokens across all profiles.
 *
 * instead, this function does targeted logout:
 * 1. server-side — calls AWS SDK LogoutCommand with accessToken to invalidate session
 *    this also kills the browser session (they share the same server-side session)
 * 2. disk cache — deletes ~/.aws/sso/cache/*.json files for this ssoStartUrl only
 *
 * .note = server-side logout is what actually logs out the browser
 *         if we only delete local files, browser session remains alive
 */
export const logoutAwsSsoSession = async (input: {
  ssoStartUrl: string;
}): Promise<{
  diskCache: {
    deleted: string[];
    skipped: Array<{ file: string; reason: string }>;
  };
}> => {
  // clear server-side session (kills browser) + disk cache for this domain only
  const diskCache = await clearAwsSsoCacheForDomain({
    ssoStartUrl: input.ssoStartUrl,
  });

  return { diskCache };
};
