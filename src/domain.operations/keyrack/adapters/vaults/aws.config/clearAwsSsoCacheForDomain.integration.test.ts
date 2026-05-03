import { ConstraintError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { clearAwsSsoCacheForDomain } from './clearAwsSsoCacheForDomain';
import { previewAwsSsoCacheForDomain } from './previewAwsSsoCacheForDomain';

describe('clearAwsSsoCacheForDomain', () => {
  given('[case1] a target sso start url', () => {
    const targetDomain = 'https://d-90660aa711.awsapps.com/start';
    const cacheDir = join(homedir(), '.aws', 'sso', 'cache');

    when('[t0] preview mode (no deletion)', () => {
      then('shows which files would be deleted', () => {
        if (!existsSync(cacheDir)) {
          throw new ConstraintError('cache directory not found', {
            cacheDir,
            hint: 'aws sso cache must exist for integration test — run aws sso login first',
          });
        }

        const result = previewAwsSsoCacheForDomain({
          ssoStartUrl: targetDomain,
        });

        console.log('\n=== PREVIEW (no files deleted) ===');
        console.log(`\nTarget domain: ${targetDomain}`);
        console.log(`\nMatched (would be deleted): ${result.matched.length}`);
        result.matched.forEach((m) => {
          console.log(`  - ${m.file}`);
          console.log(`    startUrl: ${m.startUrl}`);
          console.log(`    expiresAt: ${m.expiresAt}`);
        });

        console.log(`\nUnmatched (would be kept): ${result.unmatched.length}`);
        result.unmatched.forEach((u) => {
          console.log(`  - ${u.file}`);
          if (u.startUrl) console.log(`    startUrl: ${u.startUrl}`);
        });

        // verify shape
        expect(result.matched).toBeInstanceOf(Array);
        expect(result.unmatched).toBeInstanceOf(Array);
      });
    });
  });

  given('[case2] a test cache file for a specific domain', () => {
    const testDomain = 'https://rhachet-test-domain.awsapps.com/start';
    const cacheDir = join(homedir(), '.aws', 'sso', 'cache');
    const testFileName = 'rhachet-test-cache-clear.json';
    const testFilePath = join(cacheDir, testFileName);

    // setup: create test cache file if cache dir exists
    beforeEach(() => {
      if (!existsSync(cacheDir)) {
        mkdirSync(cacheDir, { recursive: true });
      }
      writeFileSync(
        testFilePath,
        JSON.stringify({
          startUrl: testDomain,
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          accessToken: 'test-token',
        }),
      );
    });

    // cleanup: ensure test file is removed
    afterEach(() => {
      if (existsSync(testFilePath)) {
        require('node:fs').unlinkSync(testFilePath);
      }
    });

    when('[t0] clearAwsSsoCacheForDomain is called', () => {
      then('deletes the matched cache file', async () => {
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
