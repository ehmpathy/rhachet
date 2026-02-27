import { given, then, when } from 'test-fns';

import { withTempHome } from '@src/.test/infra/withTempHome';

import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { vaultAdapterOsDirect } from './vaultAdapterOsDirect';

describe('vaultAdapterOsDirect', () => {
  const tempHome = withTempHome({ name: 'vaultAdapterOsDirect' });

  beforeAll(() => tempHome.setup());
  afterAll(() => tempHome.teardown());

  beforeEach(() => {
    // clean up store before each test
    const storePath = join(
      tempHome.path,
      '.rhachet',
      'keyrack',
      'vault',
      'os.direct',
      'owner=default',
      'keyrack.direct.json',
    );
    rmSync(storePath, { force: true });
  });

  given('[case1] empty store', () => {
    when('[t0] isUnlocked called', () => {
      then('returns true (always unlocked)', async () => {
        const result = await vaultAdapterOsDirect.isUnlocked();
        expect(result).toBe(true);
      });
    });

    when('[t1] get called for nonexistent key', () => {
      then('returns null', async () => {
        const result = await vaultAdapterOsDirect.get({ slug: 'NONEXISTENT' });
        expect(result).toBeNull();
      });
    });

    when('[t2] set called with new key', () => {
      then('creates store file', async () => {
        await vaultAdapterOsDirect.set({
          slug: 'XAI_API_KEY',
          secret: 'xai-test-key-123',
          env: 'test',
          org: 'testorg',
        });

        const storePath = join(
          tempHome.path,
          '.rhachet',
          'keyrack',
          'vault',
          'os.direct',
          'owner=default',
          'keyrack.direct.json',
        );
        expect(existsSync(storePath)).toBe(true);
      });

      then('stores key value', async () => {
        await vaultAdapterOsDirect.set({
          slug: 'XAI_API_KEY',
          secret: 'xai-test-key-123',
          env: 'test',
          org: 'testorg',
        });

        const result = await vaultAdapterOsDirect.get({ slug: 'XAI_API_KEY' });
        expect(result).toEqual('xai-test-key-123');
      });
    });
  });

  given('[case2] store has keys', () => {
    beforeEach(async () => {
      await vaultAdapterOsDirect.set({
        slug: 'KEY_A',
        secret: 'value-a',
        env: 'test',
        org: 'testorg',
      });
      await vaultAdapterOsDirect.set({
        slug: 'KEY_B',
        secret: 'value-b',
        env: 'test',
        org: 'testorg',
      });
    });

    when('[t0] get called for stored key', () => {
      then('returns value', async () => {
        const resultA = await vaultAdapterOsDirect.get({ slug: 'KEY_A' });
        expect(resultA).toEqual('value-a');

        const resultB = await vaultAdapterOsDirect.get({ slug: 'KEY_B' });
        expect(resultB).toEqual('value-b');
      });
    });

    when('[t1] set called to update key', () => {
      then('updates value', async () => {
        await vaultAdapterOsDirect.set({
          slug: 'KEY_A',
          secret: 'new-value-a',
          env: 'test',
          org: 'testorg',
        });

        const result = await vaultAdapterOsDirect.get({ slug: 'KEY_A' });
        expect(result).toEqual('new-value-a');
      });

      then('does not affect other keys', async () => {
        await vaultAdapterOsDirect.set({
          slug: 'KEY_A',
          secret: 'new-value-a',
          env: 'test',
          org: 'testorg',
        });

        const resultB = await vaultAdapterOsDirect.get({ slug: 'KEY_B' });
        expect(resultB).toEqual('value-b');
      });
    });

    when('[t2] del called for stored key', () => {
      then('removes key', async () => {
        await vaultAdapterOsDirect.del({ slug: 'KEY_A' });

        const result = await vaultAdapterOsDirect.get({ slug: 'KEY_A' });
        expect(result).toBeNull();
      });

      then('does not affect other keys', async () => {
        await vaultAdapterOsDirect.del({ slug: 'KEY_A' });

        const resultB = await vaultAdapterOsDirect.get({ slug: 'KEY_B' });
        expect(resultB).toEqual('value-b');
      });
    });

    when('[t3] unlock called', () => {
      then('is a noop (always unlocked)', async () => {
        await vaultAdapterOsDirect.unlock({});

        // verify store is unchanged
        const resultA = await vaultAdapterOsDirect.get({ slug: 'KEY_A' });
        expect(resultA).toEqual('value-a');
      });
    });
  });

  given('[case3] store file format', () => {
    beforeEach(async () => {
      await vaultAdapterOsDirect.set({
        slug: 'KEY_A',
        secret: 'value-a',
        env: 'test',
        org: 'testorg',
      });
      await vaultAdapterOsDirect.set({
        slug: 'KEY_B',
        secret: 'value-b',
        env: 'test',
        org: 'testorg',
      });
    });

    when('[t0] store file read directly', () => {
      then('contains valid json with entry format', async () => {
        const storePath = join(
          tempHome.path,
          '.rhachet',
          'keyrack',
          'vault',
          'os.direct',
          'owner=default',
          'keyrack.direct.json',
        );
        const content = readFileSync(storePath, 'utf8');
        const parsed = JSON.parse(content);

        expect(parsed.KEY_A).toEqual({ value: 'value-a' });
        expect(parsed.KEY_B).toEqual({ value: 'value-b' });
      });

      then('is formatted with indentation', async () => {
        const storePath = join(
          tempHome.path,
          '.rhachet',
          'keyrack',
          'vault',
          'os.direct',
          'owner=default',
          'keyrack.direct.json',
        );
        const content = readFileSync(storePath, 'utf8');

        // check for newlines (formatted json)
        expect(content).toContain('\n');
      });
    });
  });

  given('[case4] ephemeral entries with expiry', () => {
    when('[t0] set called with expiresAt', () => {
      then('stores entry with expiry', async () => {
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour from now
        await vaultAdapterOsDirect.set({
          slug: 'EPHEMERAL_KEY',
          secret: 'ghs_token123',
          env: 'test',
          org: 'testorg',
          expiresAt,
        });

        const storePath = join(
          tempHome.path,
          '.rhachet',
          'keyrack',
          'vault',
          'os.direct',
          'owner=default',
          'keyrack.direct.json',
        );
        const content = readFileSync(storePath, 'utf8');
        const parsed = JSON.parse(content);

        expect(parsed.EPHEMERAL_KEY).toEqual({
          value: 'ghs_token123',
          expiresAt,
        });
      });

      then('get returns value when not expired', async () => {
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour from now
        await vaultAdapterOsDirect.set({
          slug: 'EPHEMERAL_KEY',
          secret: 'ghs_token123',
          env: 'test',
          org: 'testorg',
          expiresAt,
        });

        const result = await vaultAdapterOsDirect.get({
          slug: 'EPHEMERAL_KEY',
        });
        expect(result).toEqual('ghs_token123');
      });
    });

    when('[t1] get called for expired entry', () => {
      then('returns null', async () => {
        const expiresAt = new Date(Date.now() - 1000).toISOString(); // 1 second ago
        await vaultAdapterOsDirect.set({
          slug: 'EXPIRED_KEY',
          secret: 'expired_token',
          env: 'test',
          org: 'testorg',
          expiresAt,
        });

        const result = await vaultAdapterOsDirect.get({ slug: 'EXPIRED_KEY' });
        expect(result).toBeNull();
      });

      then('deletes expired entry from store', async () => {
        const expiresAt = new Date(Date.now() - 1000).toISOString(); // 1 second ago
        await vaultAdapterOsDirect.set({
          slug: 'EXPIRED_KEY',
          secret: 'expired_token',
          env: 'test',
          org: 'testorg',
          expiresAt,
        });

        // trigger get to check expiry
        await vaultAdapterOsDirect.get({ slug: 'EXPIRED_KEY' });

        // verify entry is deleted
        const storePath = join(
          tempHome.path,
          '.rhachet',
          'keyrack',
          'vault',
          'os.direct',
          'owner=default',
          'keyrack.direct.json',
        );
        const content = readFileSync(storePath, 'utf8');
        const parsed = JSON.parse(content);

        expect(parsed.EXPIRED_KEY).toBeUndefined();
      });
    });
  });
});
