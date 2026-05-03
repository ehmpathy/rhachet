import { LogoutCommand, SSOClient } from '@aws-sdk/client-sso';
import { unlinkSync } from 'node:fs';
import { getAllAwsSsoCacheEntries } from './getAllAwsSsoCacheEntries';

/**
 * .what = clears aws sso cache for a specific domain (server-side + disk)
 * .why = enables targeted logout that leaves other sso domains intact
 *
 * .note = preferred over `aws sso logout` because that command logs out ALL domains
 *         @see https://docs.aws.amazon.com/cli/latest/reference/sso/logout.html
 *         > Removes all cached AWS IAM Identity Center access tokens
 *         > and any cached temporary AWS credentials retrieved with SSO
 *         > access tokens across all profiles.
 *
 * .note = calls AWS SDK LogoutCommand to invalidate server-side session
 *         which also invalidates the browser session (they share the same session)
 * .note = then deletes local cache files so cli prompts for re-auth
 */
export const clearAwsSsoCacheForDomain = async (input: {
  ssoStartUrl: string;
}): Promise<{
  deleted: string[];
  skipped: Array<{ file: string; reason: string }>;
}> => {
  const entries = getAllAwsSsoCacheEntries();

  const deleted: string[] = [];
  const skipped: Array<{ file: string; reason: string }> = [];

  for (const entry of entries) {
    if (entry.parseError) {
      // couldn't read/parse — skip with reason
      skipped.push({ file: entry.file, reason: `parse: ${entry.parseError}` });
    } else if (entry.startUrl === input.ssoStartUrl) {
      // matches target domain — logout server-side, then delete local cache

      // step 1: invalidate server-side session (kills browser session too)
      if (entry.accessToken && entry.region) {
        try {
          const client = new SSOClient({ region: entry.region });
          await client.send(
            new LogoutCommand({ accessToken: entry.accessToken }),
          );
        } catch (error) {
          // server-side logout failed — still delete local cache
          // this can happen if token is already expired/invalid
          const reason =
            error instanceof Error ? error.message : 'unknown logout error';
          skipped.push({
            file: entry.file,
            reason: `server-logout: ${reason}`,
          });
        }
      }

      // step 2: delete local cache file
      try {
        unlinkSync(entry.filePath);
        deleted.push(entry.file);
      } catch (error) {
        // delete failed — capture reason
        const reason =
          error instanceof Error ? error.message : 'unknown delete error';
        skipped.push({ file: entry.file, reason: `delete: ${reason}` });
      }
    }
    // non-match: don't touch (not tracked in skipped)
  }

  return { deleted, skipped };
};
