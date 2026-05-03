import { getAllAwsSsoCacheEntries } from './getAllAwsSsoCacheEntries';

/**
 * .what = preview which aws sso cache files match a domain (without delete)
 * .why = verify targeted deletion logic before actual deletion
 */
export const previewAwsSsoCacheForDomain = (input: {
  ssoStartUrl: string;
}): {
  matched: Array<{ file: string; startUrl: string; expiresAt?: string }>;
  unmatched: Array<{ file: string; startUrl?: string }>;
} => {
  const entries = getAllAwsSsoCacheEntries();

  const matched: Array<{
    file: string;
    startUrl: string;
    expiresAt?: string;
  }> = [];
  const unmatched: Array<{ file: string; startUrl?: string }> = [];

  for (const entry of entries) {
    if (entry.parseError) {
      // file couldn't be parsed
      unmatched.push({ file: entry.file });
    } else if (entry.startUrl === input.ssoStartUrl) {
      // matches target domain
      matched.push({
        file: entry.file,
        startUrl: entry.startUrl,
        expiresAt: entry.expiresAt,
      });
    } else {
      // different domain or no startUrl
      unmatched.push({ file: entry.file, startUrl: entry.startUrl });
    }
  }

  return { matched, unmatched };
};
