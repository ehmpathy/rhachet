import { asHashSha256Sync } from 'hash-fns';
import { given, then, when } from 'test-fns';

import { asKeyrackOwnerDir } from '@src/domain.operations/keyrack/asKeyrackOwnerDir';
import { asKeyrackSlugHash } from '@src/domain.operations/keyrack/asKeyrackSlugHash';

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

  // inventory path
  const inventoryOwnerDir = asKeyrackOwnerDir({ owner });
  const inventoryDir = join(
    home,
    '.rhachet',
    'keyrack',
    'inventory',
    inventoryOwnerDir,
  );

  // cleanup before and after
  beforeAll(() => {
    if (existsSync(osSecureDir)) rmSync(osSecureDir, { recursive: true });
    if (existsSync(osDirectDir)) rmSync(osDirectDir, { recursive: true });
    if (existsSync(inventoryDir)) rmSync(inventoryDir, { recursive: true });
  });
  afterAll(() => {
    if (existsSync(osSecureDir)) rmSync(osSecureDir, { recursive: true });
    if (existsSync(osDirectDir)) rmSync(osDirectDir, { recursive: true });
    if (existsSync(inventoryDir)) rmSync(inventoryDir, { recursive: true });
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

  given('[case5] key exists in inventory (vault-agnostic check)', () => {
    // .note = inventory is vault-agnostic source of truth
    // .note = works for aws.config, 1password, and any other vault type
    const slug = 'testorg.test.AWS_PROFILE';
    const hash = asKeyrackSlugHash({ slug });

    beforeAll(() => {
      mkdirSync(inventoryDir, { recursive: true });
      writeFileSync(join(inventoryDir, `${hash}.stocked`), '', { mode: 0o600 });
    });

    when('[t0] status is inferred', () => {
      then('returns locked (inventory entry exists)', () => {
        const result = inferKeyrackKeyStatusWhenNotGranted({ slug, owner });
        expect(result).toBe('locked');
      });
    });
  });

  given('[case6] key does not exist in inventory or any vault', () => {
    // .note = no inventory entry, no vault entry → truly absent
    const slug = 'nonexistent.env.ANY_KEY';

    when('[t0] status is inferred', () => {
      then('returns absent (no inventory, no vault)', () => {
        const result = inferKeyrackKeyStatusWhenNotGranted({ slug, owner });
        expect(result).toBe('absent');
      });
    });
  });

  given('[case7] key exists in inventory with env=all (fallback)', () => {
    // inventory stored under env=all
    const allSlug = 'testorg.all.INVENTORY_FALLBACK';
    const hash = asKeyrackSlugHash({ slug: allSlug });

    beforeAll(() => {
      mkdirSync(inventoryDir, { recursive: true });
      writeFileSync(join(inventoryDir, `${hash}.stocked`), '', { mode: 0o600 });
    });

    when('[t0] status is inferred for env=test slug', () => {
      then('returns locked via env=all fallback', () => {
        // request env=test but inventory is under env=all
        const result = inferKeyrackKeyStatusWhenNotGranted({
          slug: 'testorg.test.INVENTORY_FALLBACK',
          owner,
        });
        expect(result).toBe('locked');
      });
    });
  });
});
