import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * .what = scans aws sso cache directory and returns all entries
 * .why = shared scanner for preview and clear operations
 *
 * .note = aws sso caches are stored in ~/.aws/sso/cache/
 * .note = access token files have `startUrl`, `accessToken`, `region` at top level
 */
export const getAllAwsSsoCacheEntries = (): Array<{
  file: string;
  filePath: string;
  startUrl?: string;
  accessToken?: string;
  region?: string;
  expiresAt?: string;
  parseError?: string | null;
}> => {
  const cacheDir = join(homedir(), '.aws', 'sso', 'cache');
  const entries: Array<{
    file: string;
    filePath: string;
    startUrl?: string;
    accessToken?: string;
    region?: string;
    expiresAt?: string;
    parseError?: string | null;
  }> = [];

  // check if cache directory exists
  if (!existsSync(cacheDir)) {
    return entries;
  }

  // get all json files in cache directory
  const files = readdirSync(cacheDir).filter((f) => f.endsWith('.json'));

  for (const file of files) {
    const filePath = join(cacheDir, file);

    try {
      const content = readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);

      entries.push({
        file,
        filePath,
        startUrl: parsed.startUrl,
        accessToken: parsed.accessToken,
        region: parsed.region,
        expiresAt: parsed.expiresAt,
      });
    } catch (error) {
      // parse error — capture reason, don't fail
      const reason =
        error instanceof Error ? error.message : 'unknown parse error';
      entries.push({
        file,
        filePath,
        parseError: reason,
      });
    }
  }

  return entries;
};
