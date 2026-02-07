import { getError, given, then, when } from 'test-fns';

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { withTempHome } from '../../../.test/infra/withTempHome';
import {
  KeyrackHostManifest,
  KeyrackKeyHost,
} from '../../../domain.objects/keyrack';
import { daoKeyrackHostManifest } from './index';

describe('daoKeyrackHostManifest', () => {
  const tempHome = withTempHome({ name: 'daoKeyrackHostManifest' });

  beforeAll(() => tempHome.setup());
  afterAll(() => tempHome.teardown());

  given('[case1] no manifest exists', () => {
    when('[t0] get called', () => {
      then('returns null', async () => {
        const result = await daoKeyrackHostManifest.get({});
        expect(result).toBeNull();
      });
    });

    when('[t1] set.findsert called with new manifest', () => {
      then('creates manifest file', async () => {
        const manifest = new KeyrackHostManifest({
          uri: '~/.rhachet/keyrack.manifest.json',
          hosts: {},
        });

        const result = await daoKeyrackHostManifest.set({ findsert: manifest });

        expect(result.uri).toEqual(manifest.uri);

        const path = join(tempHome.path, '.rhachet', 'keyrack.manifest.json');
        expect(existsSync(path)).toBe(true);
      });

      then('round-trips correctly', async () => {
        const keyHost = new KeyrackKeyHost({
          slug: 'XAI_API_KEY',
          mech: 'REPLICA',
          vault: 'os.direct',
          exid: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        const manifest = new KeyrackHostManifest({
          uri: '~/.rhachet/keyrack.manifest.json',
          hosts: { XAI_API_KEY: keyHost },
        });

        await daoKeyrackHostManifest.set({ upsert: manifest });
        const result = await daoKeyrackHostManifest.get({});

        expect(result).not.toBeNull();
        expect(result?.hosts.XAI_API_KEY).toBeDefined();
        expect(result?.hosts.XAI_API_KEY?.slug).toEqual('XAI_API_KEY');
        expect(result?.hosts.XAI_API_KEY?.mech).toEqual('REPLICA');
        expect(result?.hosts.XAI_API_KEY?.vault).toEqual('os.direct');
      });
    });
  });

  given('[case2] manifest exists', () => {
    beforeEach(async () => {
      const manifest = new KeyrackHostManifest({
        uri: '~/.rhachet/keyrack.manifest.json',
        hosts: {
          OLD_KEY: new KeyrackKeyHost({
            slug: 'OLD_KEY',
            mech: 'REPLICA',
            vault: 'os.direct',
            exid: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }),
        },
      });
      await daoKeyrackHostManifest.set({ upsert: manifest });
    });

    when('[t0] set.findsert called with same uri', () => {
      then('returns found manifest without update', async () => {
        const manifestDesired = new KeyrackHostManifest({
          uri: '~/.rhachet/keyrack.manifest.json',
          hosts: {
            NEW_KEY: new KeyrackKeyHost({
              slug: 'NEW_KEY',
              mech: 'GITHUB_APP',
              vault: '1password',
              exid: 'op://vault/item',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }),
          },
        });

        const result = await daoKeyrackHostManifest.set({
          findsert: manifestDesired,
        });

        // findsert returns the found manifest, not the desired one
        expect(result.hosts.OLD_KEY).toBeDefined();
        expect(result.hosts.NEW_KEY).toBeUndefined();
      });
    });

    when('[t1] set.findsert called with different uri', () => {
      then('throws error', async () => {
        const manifestDesired = new KeyrackHostManifest({
          uri: '~/.rhachet/keyrack.other.json',
          hosts: {},
        });

        const error = await getError(
          daoKeyrackHostManifest.set({ findsert: manifestDesired }),
        );

        expect(error).toBeDefined();
        expect(error?.message).toContain('different uri');
      });
    });

    when('[t2] set.upsert called', () => {
      then('overwrites manifest', async () => {
        const manifestDesired = new KeyrackHostManifest({
          uri: '~/.rhachet/keyrack.manifest.json',
          hosts: {
            NEW_KEY: new KeyrackKeyHost({
              slug: 'NEW_KEY',
              mech: 'GITHUB_APP',
              vault: '1password',
              exid: 'op://vault/item',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }),
          },
        });

        const result = await daoKeyrackHostManifest.set({
          upsert: manifestDesired,
        });

        // upsert replaces the manifest
        expect(result.hosts.NEW_KEY).toBeDefined();
        expect(result.hosts.OLD_KEY).toBeUndefined();

        // verify on disk
        const path = join(tempHome.path, '.rhachet', 'keyrack.manifest.json');
        const content = readFileSync(path, 'utf8');
        expect(content).toContain('NEW_KEY');
        expect(content).not.toContain('OLD_KEY');
      });
    });
  });

  given('[case3] manifest has invalid json', () => {
    beforeEach(async () => {
      const { mkdirSync, writeFileSync } = await import('node:fs');
      const dir = join(tempHome.path, '.rhachet');
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'keyrack.manifest.json'), '{ invalid json }');
    });

    when('[t0] get called', () => {
      then('throws error about invalid json', async () => {
        const error = await getError(daoKeyrackHostManifest.get({}));
        expect(error).toBeDefined();
        expect(error?.message).toContain('invalid json');
      });
    });
  });

  given('[case4] manifest has invalid schema', () => {
    beforeEach(async () => {
      const { mkdirSync, writeFileSync } = await import('node:fs');
      const dir = join(tempHome.path, '.rhachet');
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        join(dir, 'keyrack.manifest.json'),
        JSON.stringify({ notUri: 'bad', hosts: 'notAnObject' }),
      );
    });

    when('[t0] get called', () => {
      then('throws error about invalid schema', async () => {
        const error = await getError(daoKeyrackHostManifest.get({}));
        expect(error).toBeDefined();
        expect(error?.message).toContain('invalid schema');
      });
    });
  });
});
