import { getError, given, then, when } from 'test-fns';

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadManifestHydrated } from './loadManifestHydrated';

describe('loadManifestHydrated', () => {
  const testDir = join(__dirname, './.temp/loadManifestHydrated');

  beforeAll(() => {
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(testDir, { recursive: true });
  });

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  given('[case1] file does not exist', () => {
    when('[t0] loadManifestHydrated called', () => {
      then('returns null', () => {
        const result = loadManifestHydrated(
          { path: join(testDir, 'nonexistent.yml') },
          { gitroot: testDir },
        );
        expect(result).toBeNull();
      });
    });
  });

  given('[case2] valid keyrack.yml without extends', () => {
    const manifestPath = join(testDir, 'case2.yml');

    beforeEach(() => {
      writeFileSync(
        manifestPath,
        `org: testorg
env.test:
  - TEST_KEY
  - ANOTHER_KEY: encrypted
`,
      );
    });

    when('[t0] loadManifestHydrated called', () => {
      then('returns hydrated manifest', () => {
        const result = loadManifestHydrated(
          { path: manifestPath },
          { gitroot: testDir },
        );
        expect(result).not.toBeNull();
        expect(result!.org).toEqual('testorg');
      });

      then('keys are hydrated as KeyrackKeySpec objects', () => {
        const result = loadManifestHydrated(
          { path: manifestPath },
          { gitroot: testDir },
        );
        expect(result!.keys['testorg.test.TEST_KEY']).toBeDefined();
        expect(result!.keys['testorg.test.TEST_KEY']?.name).toEqual('TEST_KEY');
        expect(
          result!.keys['testorg.test.ANOTHER_KEY']?.grade?.protection,
        ).toEqual('encrypted');
      });
    });
  });

  given('[case3] keyrack.yml with extends', () => {
    const rootPath = join(testDir, 'case3-root.yml');
    const extendedPath = join(testDir, 'case3-extended.yml');

    beforeEach(() => {
      // create extended keyrack
      writeFileSync(
        extendedPath,
        `org: extendorg
env.test:
  - EXTENDED_KEY
`,
      );

      // create root keyrack that extends
      writeFileSync(
        rootPath,
        `org: testorg
extends:
  - case3-extended.yml
env.test:
  - ROOT_KEY
`,
      );
    });

    when('[t0] loadManifestHydrated called', () => {
      then('returns merged keys from both manifests', () => {
        const result = loadManifestHydrated(
          { path: rootPath },
          { gitroot: testDir },
        );
        expect(result).not.toBeNull();
        // root org is used for all keys
        expect(result!.keys['testorg.test.ROOT_KEY']).toBeDefined();
        expect(result!.keys['extendorg.test.EXTENDED_KEY']).toBeDefined();
      });

      then('includes extends chain in manifest', () => {
        const result = loadManifestHydrated(
          { path: rootPath },
          { gitroot: testDir },
        );
        expect(result!.extends).toContain('case3-extended.yml');
      });
    });
  });

  given('[case4] keyrack.yml extends non-extant file', () => {
    const manifestPath = join(testDir, 'case4.yml');

    beforeEach(() => {
      writeFileSync(
        manifestPath,
        `org: testorg
extends:
  - nonexistent-keyrack.yml
env.test:
  - LOCAL_KEY
`,
      );
    });

    when('[t0] loadManifestHydrated called', () => {
      then('throws error about extended keyrack not found', async () => {
        const error = await getError(async () =>
          loadManifestHydrated({ path: manifestPath }, { gitroot: testDir }),
        );
        expect(error).toBeDefined();
        expect(error?.message).toContain('extended keyrack not found');
      });
    });
  });
});
