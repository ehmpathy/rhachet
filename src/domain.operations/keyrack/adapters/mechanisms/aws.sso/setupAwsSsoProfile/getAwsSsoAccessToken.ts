import { readdirSync, readFileSync } from 'fs';
import { UnexpectedCodePathError } from 'helpful-errors';
import os from 'os';
import path from 'path';

/**
 * .what = finds valid sso access token for a specific domain
 * .why = needed to call aws sso list-accounts and list-account-roles
 *
 * .note = filters by ssoStartUrl to avoid cross-domain token contamination
 */
export const getAwsSsoAccessToken = (input: {
  ssoStartUrl: string;
}): string => {
  const ssoCacheDir = path.join(os.homedir(), '.aws', 'sso', 'cache');

  try {
    const files = readdirSync(ssoCacheDir);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const content = readFileSync(path.join(ssoCacheDir, file), 'utf-8');
      const data = JSON.parse(content);
      // filter by ssoStartUrl to use the correct domain's token
      if (data.startUrl && data.startUrl !== input.ssoStartUrl) continue;
      if (data.accessToken && data.expiresAt) {
        const expiresAt = new Date(data.expiresAt);
        if (expiresAt > new Date()) {
          return data.accessToken;
        }
      }
    }
  } catch {
    throw new UnexpectedCodePathError(
      'could not find sso cache. run aws sso login first.',
    );
  }

  throw new UnexpectedCodePathError(
    `no valid sso access token found for ${input.ssoStartUrl}. run aws sso login first.`,
  );
};
