import { given, then, when } from 'test-fns';

import {
  genMockPromptHiddenInput,
  setMockPromptValues,
} from '@src/.test/infra/mockPromptHiddenInput';
import { withTempHome } from '@src/.test/infra/withTempHome';

import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

jest.mock('@src/infra/promptHiddenInput', () => genMockPromptHiddenInput());

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
        setMockPromptValues('xai-test-key-123');
        await vaultAdapterOsDirect.set({
          slug: 'XAI_API_KEY',
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
        setMockPromptValues('xai-test-key-123');
        await vaultAdapterOsDirect.set({
          slug: 'XAI_API_KEY',
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
      setMockPromptValues(['value-a', 'value-b']);
      await vaultAdapterOsDirect.set({
        slug: 'KEY_A',
        env: 'test',
        org: 'testorg',
      });
      await vaultAdapterOsDirect.set({
        slug: 'KEY_B',
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
        setMockPromptValues('new-value-a');
        await vaultAdapterOsDirect.set({
          slug: 'KEY_A',
          env: 'test',
          org: 'testorg',
        });

        const result = await vaultAdapterOsDirect.get({ slug: 'KEY_A' });
        expect(result).toEqual('new-value-a');
      });

      then('does not affect other keys', async () => {
        setMockPromptValues('new-value-a');
        await vaultAdapterOsDirect.set({
          slug: 'KEY_A',
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
        await vaultAdapterOsDirect.unlock({ identity: null });

        // verify store is unchanged
        const resultA = await vaultAdapterOsDirect.get({ slug: 'KEY_A' });
        expect(resultA).toEqual('value-a');
      });
    });
  });

  given('[case3] store file format', () => {
    beforeEach(async () => {
      setMockPromptValues(['value-a', 'value-b']);
      await vaultAdapterOsDirect.set({
        slug: 'KEY_A',
        env: 'test',
        org: 'testorg',
      });
      await vaultAdapterOsDirect.set({
        slug: 'KEY_B',
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
        setMockPromptValues('ghs_token123');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour from now
        await vaultAdapterOsDirect.set({
          slug: 'EPHEMERAL_KEY',
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
        setMockPromptValues('ghs_token123');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour from now
        await vaultAdapterOsDirect.set({
          slug: 'EPHEMERAL_KEY',
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
        setMockPromptValues('expired_token');
        const expiresAt = new Date(Date.now() - 1000).toISOString(); // 1 second ago
        await vaultAdapterOsDirect.set({
          slug: 'EXPIRED_KEY',
          env: 'test',
          org: 'testorg',
          expiresAt,
        });

        const result = await vaultAdapterOsDirect.get({ slug: 'EXPIRED_KEY' });
        expect(result).toBeNull();
      });

      then('deletes expired entry from store', async () => {
        setMockPromptValues('expired_token');
        const expiresAt = new Date(Date.now() - 1000).toISOString(); // 1 second ago
        await vaultAdapterOsDirect.set({
          slug: 'EXPIRED_KEY',
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
