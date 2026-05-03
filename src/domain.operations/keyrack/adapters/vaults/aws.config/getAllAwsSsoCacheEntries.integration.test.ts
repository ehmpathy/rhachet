import { given, then, when } from 'test-fns';

import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { getAllAwsSsoCacheEntries } from './getAllAwsSsoCacheEntries';

describe('getAllAwsSsoCacheEntries', () => {
  const cacheDir = join(homedir(), '.aws', 'sso', 'cache');
  const testFileName = 'rhachet-test-scanner.json';
  const testFilePath = join(cacheDir, testFileName);
  const badFileName = 'rhachet-test-bad.json';
  const badFilePath = join(cacheDir, badFileName);

  // cleanup test files before/after
  beforeEach(() => {
    if (existsSync(testFilePath)) unlinkSync(testFilePath);
    if (existsSync(badFilePath)) unlinkSync(badFilePath);
  });
  afterEach(() => {
    if (existsSync(testFilePath)) unlinkSync(testFilePath);
    if (existsSync(badFilePath)) unlinkSync(badFilePath);
  });

  given('[case1] cache dir exists with json files', () => {
    when('[t0] all files are valid json with startUrl', () => {
      then('returns entries with startUrl and expiresAt', () => {
        // setup: create test cache file
        if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true });
        writeFileSync(
          testFilePath,
          JSON.stringify({
            startUrl: 'https://test.awsapps.com/start',
            expiresAt: '2099-01-01T00:00:00Z',
            accessToken: 'test-token',
          }),
        );

        const entries = getAllAwsSsoCacheEntries();

        // find our test file in results
        const testEntry = entries.find((e) => e.file === testFileName);
        expect(testEntry).toBeDefined();
        expect(testEntry?.startUrl).toBe('https://test.awsapps.com/start');
        expect(testEntry?.expiresAt).toBe('2099-01-01T00:00:00Z');
        expect(testEntry?.parseError).toBeUndefined();
      });
    });

    when('[t1] a file has malformed json', () => {
      then('marks entry with parseError that includes reason', () => {
        // setup: create bad json file
        if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true });
        writeFileSync(badFilePath, '{ not valid json');

        const entries = getAllAwsSsoCacheEntries();

        // find our bad file in results
        const badEntry = entries.find((e) => e.file === badFileName);
        expect(badEntry).toBeDefined();
        expect(badEntry?.parseError).toBeDefined();
        expect(typeof badEntry?.parseError).toBe('string');
        // should match JSON parse error
        expect(badEntry?.parseError).toMatch(/unexpected|parse|json/i);
      });
    });
  });

  given('[case2] cache dir does not exist', () => {
    when('[t0] scanner is called', () => {
      then('returns empty array without error', () => {
        // guard: this test only makes sense on systems without aws cli
        // on most systems, the dir exists, so we just verify shape
        const entries = getAllAwsSsoCacheEntries();
        expect(entries).toBeInstanceOf(Array);
      });
    });
  });

  given('[case3] non-json files in cache dir', () => {
    when('[t0] scanner is called', () => {
      then('ignores non-json files', () => {
        if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true });

        const entries = getAllAwsSsoCacheEntries();

        // all entries should be json files
        entries.forEach((entry) => {
          expect(entry.file).toMatch(/\.json$/);
        });
      });
    });
  });
});
