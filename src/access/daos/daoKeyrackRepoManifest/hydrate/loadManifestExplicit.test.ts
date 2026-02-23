import { getError, given, then, when } from 'test-fns';

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadManifestExplicit } from './loadManifestExplicit';

describe('loadManifestExplicit', () => {
  const testDir = join(__dirname, './.temp/loadManifestExplicit');

  beforeAll(() => {
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(testDir, { recursive: true });
  });

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  given('[case1] file does not exist', () => {
    when('[t0] loadManifestExplicit called', () => {
      then('returns null', () => {
        const result = loadManifestExplicit({
          path: join(testDir, 'nonexistent.yml'),
        });
        expect(result).toBeNull();
      });
    });
  });

  given('[case2] valid keyrack.yml with org and env sections', () => {
    const manifestPath = join(testDir, 'case2.yml');

    beforeEach(() => {
      writeFileSync(
        manifestPath,
        `org: testorg
env.all:
  - SHARED_KEY
env.test:
  - TEST_KEY
env.prod:
  - PROD_KEY: encrypted
`,
      );
    });

    when('[t0] loadManifestExplicit called', () => {
      then('returns explicit manifest with org', () => {
        const result = loadManifestExplicit({ path: manifestPath });
        expect(result).not.toBeNull();
        expect(result!.org).toEqual('testorg');
      });

      then('returns explicit manifest with envSections', () => {
        const result = loadManifestExplicit({ path: manifestPath });
        expect(result!.envSections['env.all']).toEqual(['SHARED_KEY']);
        expect(result!.envSections['env.test']).toEqual(['TEST_KEY']);
        expect(result!.envSections['env.prod']).toEqual([
          { PROD_KEY: 'encrypted' },
        ]);
      });

      then('extends is undefined when not present', () => {
        const result = loadManifestExplicit({ path: manifestPath });
        expect(result!.extends).toBeUndefined();
      });
    });
  });

  given('[case3] keyrack.yml with extends', () => {
    const manifestPath = join(testDir, 'case3.yml');

    beforeEach(() => {
      writeFileSync(
        manifestPath,
        `org: testorg
extends:
  - .agent/repo=foo/role=bar/keyrack.yml
  - .agent/repo=baz/role=qux/keyrack.yml
env.test:
  - LOCAL_KEY
`,
      );
    });

    when('[t0] loadManifestExplicit called', () => {
      then('returns explicit manifest with extends array', () => {
        const result = loadManifestExplicit({ path: manifestPath });
        expect(result!.extends).toEqual([
          '.agent/repo=foo/role=bar/keyrack.yml',
          '.agent/repo=baz/role=qux/keyrack.yml',
        ]);
      });
    });
  });

  given('[case4] keyrack.yml with invalid yaml', () => {
    const manifestPath = join(testDir, 'case4.yml');

    beforeEach(() => {
      writeFileSync(
        manifestPath,
        `org: testorg
env.test:
  - invalid: [yaml: structure
`,
      );
    });

    when('[t0] loadManifestExplicit called', () => {
      then('throws error about invalid yaml', async () => {
        const error = await getError(async () =>
          loadManifestExplicit({ path: manifestPath }),
        );
        expect(error).toBeDefined();
        expect(error?.message).toContain('invalid yaml');
      });
    });
  });

  given('[case5] keyrack.yml without org', () => {
    const manifestPath = join(testDir, 'case5.yml');

    beforeEach(() => {
      writeFileSync(
        manifestPath,
        `env.test:
  - ORPHAN_KEY
`,
      );
    });

    when('[t0] loadManifestExplicit called', () => {
      then('throws error about invalid schema', async () => {
        const error = await getError(async () =>
          loadManifestExplicit({ path: manifestPath }),
        );
        expect(error).toBeDefined();
        expect(error?.message).toContain('invalid schema');
      });
    });
  });

  given('[case6] keyrack.yml with null env sections', () => {
    const manifestPath = join(testDir, 'case6.yml');

    beforeEach(() => {
      writeFileSync(
        manifestPath,
        `org: testorg
env.prod: null
env.test: null
env.all:
  - SHARED_KEY
`,
      );
    });

    when('[t0] loadManifestExplicit called', () => {
      then('treats null env sections as empty arrays', () => {
        const result = loadManifestExplicit({ path: manifestPath });
        expect(result).not.toBeNull();
        expect(result!.envSections['env.prod']).toEqual([]);
        expect(result!.envSections['env.test']).toEqual([]);
        expect(result!.envSections['env.all']).toEqual(['SHARED_KEY']);
      });

      then('includes all declared envs in envSections keys', () => {
        const result = loadManifestExplicit({ path: manifestPath });
        expect(Object.keys(result!.envSections).sort()).toEqual([
          'env.all',
          'env.prod',
          'env.test',
        ]);
      });
    });
  });
});
