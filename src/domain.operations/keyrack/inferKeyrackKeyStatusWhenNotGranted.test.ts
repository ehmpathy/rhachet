import { asHashSha256Sync } from 'hash-fns';
import { given, then, when } from 'test-fns';

import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { inferKeyrackKeyStatusWhenNotGranted } from './inferKeyrackKeyStatusWhenNotGranted';

describe('inferKeyrackKeyStatusWhenNotGranted', () => {
  const home = homedir();
  const owner = 'test-infer';
  const ownerDir = `owner=${owner}`;

  // vault paths
  const osSecureDir = join(
    home,
    '.rhachet',
    'keyrack',
    'vault',
    'os.secure',
    ownerDir,
  );
  const osDirectDir = join(
    home,
    '.rhachet',
    'keyrack',
    'vault',
    'os.direct',
    ownerDir,
  );

  // cleanup before and after
  beforeAll(() => {
    if (existsSync(osSecureDir)) rmSync(osSecureDir, { recursive: true });
    if (existsSync(osDirectDir)) rmSync(osDirectDir, { recursive: true });
  });
  afterAll(() => {
    if (existsSync(osSecureDir)) rmSync(osSecureDir, { recursive: true });
    if (existsSync(osDirectDir)) rmSync(osDirectDir, { recursive: true });
  });

  given('[case1] key does not exist in any vault', () => {
    when('[t0] status is inferred', () => {
      then('returns absent', () => {
        const result = inferKeyrackKeyStatusWhenNotGranted({
          slug: 'testorg.test.NONEXISTENT_KEY',
          owner,
        });
        expect(result).toBe('absent');
      });
    });
  });

  given('[case2] key exists in os.secure vault with exact env', () => {
    const slug = 'testorg.test.SECURE_KEY';
    const hash = asHashSha256Sync(slug).slice(0, 16);

    beforeAll(() => {
      mkdirSync(osSecureDir, { recursive: true });
      writeFileSync(join(osSecureDir, `${hash}.age`), 'encrypted-content');
    });

    when('[t0] status is inferred', () => {
      then('returns locked', () => {
        const result = inferKeyrackKeyStatusWhenNotGranted({ slug, owner });
        expect(result).toBe('locked');
      });
    });
  });

  given('[case3] key exists in os.secure vault with env=all (fallback)', () => {
    // key stored under env=all
    const allSlug = 'testorg.all.FALLBACK_KEY';
    const hash = asHashSha256Sync(allSlug).slice(0, 16);

    beforeAll(() => {
      mkdirSync(osSecureDir, { recursive: true });
      writeFileSync(join(osSecureDir, `${hash}.age`), 'encrypted-content');
    });

    when('[t0] status is inferred for env=test slug', () => {
      then('returns locked via env=all fallback', () => {
        // request env=test but key is stored under env=all
        const result = inferKeyrackKeyStatusWhenNotGranted({
          slug: 'testorg.test.FALLBACK_KEY',
          owner,
        });
        expect(result).toBe('locked');
      });
    });
  });

  given('[case4] key exists in os.direct vault with env=all (fallback)', () => {
    // key stored under env=all in os.direct
    const allSlug = 'testorg.all.DIRECT_FALLBACK';

    beforeAll(() => {
      mkdirSync(osDirectDir, { recursive: true });
      const store = { [allSlug]: 'plaintext-secret' };
      writeFileSync(
        join(osDirectDir, 'keyrack.direct.json'),
        JSON.stringify(store),
      );
    });

    when('[t0] status is inferred for env=test slug', () => {
      then('returns locked via env=all fallback', () => {
        const result = inferKeyrackKeyStatusWhenNotGranted({
          slug: 'testorg.test.DIRECT_FALLBACK',
          owner,
        });
        expect(result).toBe('locked');
      });
    });
  });
});
