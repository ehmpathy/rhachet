import { getError, given, then, when } from 'test-fns';

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { hydrateKeyrackRepoManifest } from './hydrateKeyrackRepoManifest';
import type { KeyrackManifestExplicit } from './loadManifestExplicit';

describe('hydrateKeyrackRepoManifest', () => {
  const testDir = join(__dirname, './.temp/hydrateKeyrackRepoManifest');

  beforeAll(() => {
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(testDir, { recursive: true });
  });

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  given('[case1] explicit manifest without extends', () => {
    const explicit: KeyrackManifestExplicit = {
      org: 'testorg',
      envSections: {
        'env.test': ['KEY_A', 'KEY_B'],
        'env.prod': [{ KEY_C: 'encrypted' }],
      },
    };

    when('[t0] hydrateKeyrackRepoManifest called', () => {
      then('returns manifest with hydrated keys', () => {
        const result = hydrateKeyrackRepoManifest(
          { explicit, manifestPath: '/fake/path' },
          { gitroot: testDir },
        );
        expect(result.org).toEqual('testorg');
        expect(result.keys['testorg.test.KEY_A']).toBeDefined();
        expect(result.keys['testorg.test.KEY_B']).toBeDefined();
        expect(result.keys['testorg.prod.KEY_C']).toBeDefined();
      });

      then('grade is parsed from shorthand', () => {
        const result = hydrateKeyrackRepoManifest(
          { explicit, manifestPath: '/fake/path' },
          { gitroot: testDir },
        );
        expect(result.keys['testorg.prod.KEY_C']?.grade?.protection).toEqual(
          'encrypted',
        );
      });

      then('extends is undefined', () => {
        const result = hydrateKeyrackRepoManifest(
          { explicit, manifestPath: '/fake/path' },
          { gitroot: testDir },
        );
        expect(result.extends).toBeUndefined();
      });
    });
  });

  given('[case2] explicit manifest with env.all expansion', () => {
    const explicit: KeyrackManifestExplicit = {
      org: 'testorg',
      envSections: {
        'env.all': ['SHARED_KEY'],
        'env.test': ['TEST_ONLY'],
        'env.prod': [],
      },
    };

    when('[t0] hydrateKeyrackRepoManifest called', () => {
      then('env.all keys are directly resolvable with .all. slug', () => {
        const result = hydrateKeyrackRepoManifest(
          { explicit, manifestPath: '/fake/path' },
          { gitroot: testDir },
        );
        // SHARED_KEY should be accessible via .all. slug
        expect(result.keys['testorg.all.SHARED_KEY']).toBeDefined();
        expect(result.keys['testorg.all.SHARED_KEY']?.env).toEqual('all');
      });

      then('env.all keys are also expanded to all declared envs', () => {
        const result = hydrateKeyrackRepoManifest(
          { explicit, manifestPath: '/fake/path' },
          { gitroot: testDir },
        );
        // SHARED_KEY should also appear in both test and prod envs
        expect(result.keys['testorg.test.SHARED_KEY']).toBeDefined();
        expect(result.keys['testorg.prod.SHARED_KEY']).toBeDefined();
        // TEST_ONLY should only appear in test
        expect(result.keys['testorg.test.TEST_ONLY']).toBeDefined();
        expect(result.keys['testorg.prod.TEST_ONLY']).toBeUndefined();
      });
    });
  });

  given('[case2b] env.all with no other declared envs', () => {
    const explicit: KeyrackManifestExplicit = {
      org: 'testorg',
      envSections: {
        'env.all': ['ONLY_ALL_KEY'],
      },
    };

    when('[t0] hydrateKeyrackRepoManifest called', () => {
      then('env.all keys are directly resolvable with .all. slug', () => {
        const result = hydrateKeyrackRepoManifest(
          { explicit, manifestPath: '/fake/path' },
          { gitroot: testDir },
        );
        // ONLY_ALL_KEY should be accessible via .all. slug
        expect(result.keys['testorg.all.ONLY_ALL_KEY']).toBeDefined();
        expect(result.keys['testorg.all.ONLY_ALL_KEY']?.env).toEqual('all');
      });
    });
  });

  given('[case3] explicit manifest with extends', () => {
    const extendedPath = join(testDir, 'extended.yml');

    beforeEach(() => {
      writeFileSync(
        extendedPath,
        `org: extendorg
env.test:
  - EXTENDED_KEY
`,
      );
    });

    const explicit: KeyrackManifestExplicit = {
      org: 'rootorg',
      extends: ['extended.yml'],
      envSections: {
        'env.test': ['ROOT_KEY'],
      },
    };

    when('[t0] hydrateKeyrackRepoManifest called', () => {
      then('merges keys from extended manifest with root org', () => {
        const result = hydrateKeyrackRepoManifest(
          { explicit, manifestPath: join(testDir, 'root.yml') },
          { gitroot: testDir },
        );
        // root key with root org
        expect(result.keys['rootorg.test.ROOT_KEY']).toBeDefined();
        // extended key RE-SLUGGED to root org (all keys use root manifest's org)
        expect(result.keys['rootorg.test.EXTENDED_KEY']).toBeDefined();
        // extended key should NOT exist under original org
        expect(result.keys['extendorg.test.EXTENDED_KEY']).toBeUndefined();
      });

      then('includes extends in result', () => {
        const result = hydrateKeyrackRepoManifest(
          { explicit, manifestPath: join(testDir, 'root.yml') },
          { gitroot: testDir },
        );
        expect(result.extends).toContain('extended.yml');
      });
    });
  });

  given('[case4] root key overrides extended key (root wins)', () => {
    const extendedPath = join(testDir, 'extended-override.yml');

    beforeEach(() => {
      writeFileSync(
        extendedPath,
        `org: testorg
env.test:
  - SHARED_KEY: encrypted
`,
      );
    });

    const explicit: KeyrackManifestExplicit = {
      org: 'testorg',
      extends: ['extended-override.yml'],
      envSections: {
        'env.test': [{ SHARED_KEY: 'ephemeral' }],
      },
    };

    when('[t0] hydrateKeyrackRepoManifest called', () => {
      then('root key spec overrides extended key spec', () => {
        const result = hydrateKeyrackRepoManifest(
          { explicit, manifestPath: join(testDir, 'root-override.yml') },
          { gitroot: testDir },
        );
        const sharedKey = result.keys['testorg.test.SHARED_KEY'];
        expect(sharedKey).toBeDefined();
        // root declares ephemeral, extended declares encrypted
        // root should win
        expect(sharedKey?.grade?.duration).toEqual('ephemeral');
        expect(sharedKey?.grade?.protection).toBeNull();
      });
    });
  });

  given('[case5] circular extends detection', () => {
    const pathA = join(testDir, 'circularA.yml');
    const pathB = join(testDir, 'circularB.yml');

    beforeEach(() => {
      writeFileSync(
        pathA,
        `org: testorg
extends:
  - circularB.yml
env.test:
  - KEY_A
`,
      );
      writeFileSync(
        pathB,
        `org: testorg
extends:
  - circularA.yml
env.test:
  - KEY_B
`,
      );
    });

    when('[t0] hydrateKeyrackRepoManifest called with circular extends', () => {
      then('throws error about circular extends', async () => {
        const explicit: KeyrackManifestExplicit = {
          org: 'testorg',
          extends: ['circularA.yml'],
          envSections: {
            'env.test': ['ROOT_KEY'],
          },
        };

        const error = await getError(async () =>
          hydrateKeyrackRepoManifest(
            { explicit, manifestPath: join(testDir, 'root-circular.yml') },
            { gitroot: testDir },
          ),
        );
        expect(error).toBeDefined();
        expect(error?.message).toContain('circular extends');
      });
    });
  });

  given('[case6] last-wins for multiple extends', () => {
    const pathA = join(testDir, 'extendsA.yml');
    const pathB = join(testDir, 'extendsB.yml');

    beforeEach(() => {
      writeFileSync(
        pathA,
        `org: testorg
env.test:
  - CONFLICT_KEY: encrypted
`,
      );
      writeFileSync(
        pathB,
        `org: testorg
env.test:
  - CONFLICT_KEY: ephemeral
`,
      );
    });

    const explicit: KeyrackManifestExplicit = {
      org: 'testorg',
      extends: ['extendsA.yml', 'extendsB.yml'],
      envSections: {
        'env.test': [],
      },
    };

    when('[t0] hydrateKeyrackRepoManifest called', () => {
      then('later extends override earlier extends (last-wins)', () => {
        const result = hydrateKeyrackRepoManifest(
          { explicit, manifestPath: join(testDir, 'root-multi.yml') },
          { gitroot: testDir },
        );
        const conflictKey = result.keys['testorg.test.CONFLICT_KEY'];
        expect(conflictKey).toBeDefined();
        // pathB is last, so ephemeral should win over encrypted
        expect(conflictKey?.grade?.duration).toEqual('ephemeral');
        expect(conflictKey?.grade?.protection).toBeNull();
      });
    });
  });

  given('[case7] nested extends re-slug to outermost root org', () => {
    // A(org:alpha) extends B(org:beta) extends C(org:gamma)
    // all keys should use alpha's org
    const pathC = join(testDir, 'nestedC.yml');
    const pathB = join(testDir, 'nestedB.yml');

    beforeEach(() => {
      writeFileSync(
        pathC,
        `org: gamma
env.test:
  - GAMMA_KEY
`,
      );
      writeFileSync(
        pathB,
        `org: beta
extends:
  - nestedC.yml
env.test:
  - BETA_KEY
`,
      );
    });

    const explicit: KeyrackManifestExplicit = {
      org: 'alpha',
      extends: ['nestedB.yml'],
      envSections: {
        'env.test': ['ALPHA_KEY'],
      },
    };

    when('[t0] hydrateKeyrackRepoManifest called', () => {
      then('all keys use outermost root org', () => {
        const result = hydrateKeyrackRepoManifest(
          { explicit, manifestPath: join(testDir, 'nestedA.yml') },
          { gitroot: testDir },
        );
        // all keys should be under alpha (root org)
        expect(result.keys['alpha.test.ALPHA_KEY']).toBeDefined();
        expect(result.keys['alpha.test.BETA_KEY']).toBeDefined();
        expect(result.keys['alpha.test.GAMMA_KEY']).toBeDefined();

        // original orgs should NOT exist
        expect(result.keys['beta.test.BETA_KEY']).toBeUndefined();
        expect(result.keys['gamma.test.GAMMA_KEY']).toBeUndefined();
      });
    });
  });

  given('[case8] same org in extends (no re-slug needed)', () => {
    const extendedPath = join(testDir, 'same-org-extended.yml');

    beforeEach(() => {
      writeFileSync(
        extendedPath,
        `org: sameorg
env.test:
  - EXTENDED_SAME_KEY
`,
      );
    });

    const explicit: KeyrackManifestExplicit = {
      org: 'sameorg',
      extends: ['same-org-extended.yml'],
      envSections: {
        'env.test': ['ROOT_SAME_KEY'],
      },
    };

    when('[t0] hydrateKeyrackRepoManifest called', () => {
      then('keys remain under same org (no change needed)', () => {
        const result = hydrateKeyrackRepoManifest(
          { explicit, manifestPath: join(testDir, 'root-same-org.yml') },
          { gitroot: testDir },
        );
        expect(result.keys['sameorg.test.ROOT_SAME_KEY']).toBeDefined();
        expect(result.keys['sameorg.test.EXTENDED_SAME_KEY']).toBeDefined();
      });
    });
  });
});
