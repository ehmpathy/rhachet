import { given, then, when } from 'test-fns';

import { daoKeyrackRepoManifest } from '@src/access/daos/daoKeyrackRepoManifest';

import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

describe('daoKeyrackRepoManifest.init', () => {
  const testDir = join(__dirname, './.temp/initKeyrackRepoManifest');

  beforeAll(() => {
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(testDir, { recursive: true });
  });

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    // clean test directory before each test
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(testDir, { recursive: true });
  });

  given('[case1] init at default path (.agent/keyrack.yml)', () => {
    when('[t0] init called without --at', () => {
      then('creates keyrack.yml at default path', async () => {
        const result = await daoKeyrackRepoManifest.init({
          gitroot: testDir,
          org: 'testorg',
        });

        expect(result.effect).toEqual('created');
        expect(result.manifestPath).toContain('.agent/keyrack.yml');
        expect(existsSync(result.manifestPath)).toBe(true);
      });

      then('keyrack.yml contains org declaration', async () => {
        const result = await daoKeyrackRepoManifest.init({
          gitroot: testDir,
          org: 'testorg',
        });

        const content = readFileSync(result.manifestPath, 'utf-8');
        expect(content).toContain('org: testorg');
      });
    });

    when('[t1] init called again at same path (idempotent)', () => {
      then('returns found effect', async () => {
        // first init
        await daoKeyrackRepoManifest.init({
          gitroot: testDir,
          org: 'testorg',
        });

        // second init
        const result = await daoKeyrackRepoManifest.init({
          gitroot: testDir,
          org: 'differentorg',
        });

        expect(result.effect).toEqual('found');
        expect(result.org).toEqual('testorg'); // original org preserved
      });
    });
  });

  given('[case2] init at custom path (--at)', () => {
    when('[t0] init called with --at relative path', () => {
      then('creates keyrack.yml at custom path', async () => {
        const customPath = 'src/roles/mechanic/keyrack.yml';
        const result = await daoKeyrackRepoManifest.init({
          gitroot: testDir,
          org: 'testorg',
          at: customPath,
        });

        expect(result.effect).toEqual('created');
        expect(result.manifestPath).toEqual(join(testDir, customPath));
        expect(existsSync(result.manifestPath)).toBe(true);
      });

      then('does not create keyrack.yml at default path', async () => {
        const customPath = 'custom/keyrack.yml';
        await daoKeyrackRepoManifest.init({
          gitroot: testDir,
          org: 'testorg',
          at: customPath,
        });

        const defaultPath = join(testDir, '.agent', 'keyrack.yml');
        expect(existsSync(defaultPath)).toBe(false);
      });
    });

    when('[t1] init called with --at deeply nested path', () => {
      then('creates parent directories', async () => {
        const customPath = 'deep/nested/path/to/keyrack.yml';
        const result = await daoKeyrackRepoManifest.init({
          gitroot: testDir,
          org: 'testorg',
          at: customPath,
        });

        expect(result.effect).toEqual('created');
        expect(existsSync(result.manifestPath)).toBe(true);
        expect(existsSync(join(testDir, 'deep/nested/path/to'))).toBe(true);
      });
    });

    when('[t2] init called with --at absolute path', () => {
      then('creates keyrack.yml at absolute path', async () => {
        const absolutePath = join(testDir, 'absolute/path/keyrack.yml');
        const result = await daoKeyrackRepoManifest.init({
          gitroot: testDir,
          org: 'testorg',
          at: absolutePath,
        });

        expect(result.effect).toEqual('created');
        expect(result.manifestPath).toEqual(absolutePath);
        expect(existsSync(absolutePath)).toBe(true);
      });
    });
  });

  given('[case3] init at custom path idempotent', () => {
    when('[t0] init called twice at same custom path', () => {
      then('returns found effect and preserves original org', async () => {
        const customPath = 'custom/keyrack.yml';

        // first init
        await daoKeyrackRepoManifest.init({
          gitroot: testDir,
          org: 'originalorg',
          at: customPath,
        });

        // second init with different org
        const result = await daoKeyrackRepoManifest.init({
          gitroot: testDir,
          org: 'differentorg',
          at: customPath,
        });

        expect(result.effect).toEqual('found');
        expect(result.org).toEqual('originalorg'); // original preserved

        // verify file content unchanged
        const content = readFileSync(result.manifestPath, 'utf-8');
        expect(content).toContain('org: originalorg');
        expect(content).not.toContain('org: differentorg');
      });
    });
  });
});
