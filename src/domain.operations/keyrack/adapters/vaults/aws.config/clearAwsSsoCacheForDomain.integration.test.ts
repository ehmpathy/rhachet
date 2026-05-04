import { genTempDir, given, then, when } from 'test-fns';

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { clearAwsSsoCacheForDomain } from './clearAwsSsoCacheForDomain';
import { previewAwsSsoCacheForDomain } from './previewAwsSsoCacheForDomain';

describe('clearAwsSsoCacheForDomain', () => {
  // isolate HOME to temp directory for each test run
  const tempDir = genTempDir({ slug: 'clearAwsSsoCacheForDomain' });
  const originalHome = process.env.HOME;
  const cacheDir = join(tempDir, '.aws', 'sso', 'cache');

  beforeEach(() => {
    process.env.HOME = tempDir;
    mkdirSync(cacheDir, { recursive: true });
  });

  afterAll(() => {
    process.env.HOME = originalHome;
  });

  given('[case1] preview mode with provisioned cache files', () => {
    const targetDomain = 'https://rhachet-test-preview.awsapps.com/start';
    const otherDomain = 'https://rhachet-test-other.awsapps.com/start';
    const matchFile = 'rhachet-test-preview-match.json';
    const otherFile = 'rhachet-test-preview-other.json';

    beforeEach(() => {
      // create one file that matches target domain
      writeFileSync(
        join(cacheDir, matchFile),
        JSON.stringify({
          startUrl: targetDomain,
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          accessToken: 'test-token-match',
        }),
      );
      // create one file that does NOT match target domain
      writeFileSync(
        join(cacheDir, otherFile),
        JSON.stringify({
          startUrl: otherDomain,
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          accessToken: 'test-token-other',
        }),
      );
    });

    when('[t0] previewAwsSsoCacheForDomain is called', () => {
      then('returns matched and unmatched files correctly', () => {
        const result = previewAwsSsoCacheForDomain({
          ssoStartUrl: targetDomain,
        });

        // verify shape
        expect(result.matched).toBeInstanceOf(Array);
        expect(result.unmatched).toBeInstanceOf(Array);

        // verify our test file is in matched
        const matchedFiles = result.matched.map((m) => m.file);
        expect(matchedFiles).toContain(matchFile);

        // verify our other file is in unmatched
        const unmatchedFiles = result.unmatched.map((u) => u.file);
        expect(unmatchedFiles).toContain(otherFile);
      });
    });
  });

  given('[case2] a test cache file for a specific domain', () => {
    const testDomain = 'https://rhachet-test-domain.awsapps.com/start';
    const testFileName = 'rhachet-test-cache-clear.json';

    beforeEach(() => {
      writeFileSync(
        join(cacheDir, testFileName),
        JSON.stringify({
          startUrl: testDomain,
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          accessToken: 'test-token',
        }),
      );
    });

    when('[t0] clearAwsSsoCacheForDomain is called', () => {
      then('deletes the matched cache file', async () => {
        const testFilePath = join(cacheDir, testFileName);

        // verify test file exists before clear
        expect(existsSync(testFilePath)).toBe(true);

        // clear cache for test domain
        // note: server-side logout is skipped because test file has no region
        const result = await clearAwsSsoCacheForDomain({
          ssoStartUrl: testDomain,
        });

        // verify file was deleted
        expect(existsSync(testFilePath)).toBe(false);

        // verify return shape
        expect(result.deleted).toBeInstanceOf(Array);
        expect(result.deleted.length).toBe(1);
        expect(result.deleted[0]).toContain(testFileName);
      });
    });

    when(
      '[t1] clearAwsSsoCacheForDomain is called for non-matching domain',
      () => {
        then('preserves the cache file', async () => {
          const testFilePath = join(cacheDir, testFileName);

          // verify test file exists before clear
          expect(existsSync(testFilePath)).toBe(true);

          // clear cache for different domain
          const result = await clearAwsSsoCacheForDomain({
            ssoStartUrl: 'https://other-domain.awsapps.com/start',
          });

          // verify file was NOT deleted
          expect(existsSync(testFilePath)).toBe(true);

          // verify no files deleted
          expect(result.deleted).toEqual([]);
        });
      },
    );
  });
});
