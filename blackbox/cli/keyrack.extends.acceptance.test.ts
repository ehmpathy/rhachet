import { given, then, useBeforeAll, useThen, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';

describe('keyrack extends', () => {
  /**
   * usecase.3 = key lookup via extends
   * verifies that keys from extended keyrack are available
   */
  given('[case1] repo with keyrack that extends role keyrack', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-extends' }),
    );

    when('[t0] keyrack get for key from extended manifest', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--for', 'repo', '--env', 'test', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 2 (locked keys exit non-zero)', () => {
        expect(result.status).toEqual(2);
      });

      then('returns key from extended keyrack (ROLE_KEY)', () => {
        const parsed = JSON.parse(result.stdout) as Array<{ slug: string }>;
        expect(parsed.some((item) => item.slug.includes('ROLE_KEY'))).toBe(true);
      });

      then('returns key from root keyrack (LOCAL_KEY)', () => {
        const parsed = JSON.parse(result.stdout) as Array<{ slug: string }>;
        expect(parsed.some((item) => item.slug.includes('LOCAL_KEY'))).toBe(true);
      });

      then('stdout matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });
  });

  /**
   * usecase.7 = full spec inheritance
   * verifies that key specs (grade, etc) are inherited from extended keyrack
   */
  given('[case2] repo with keyrack that extends keyrack with graded keys', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-manifest' }),
    );

    when('[t0] extended keyrack has key with grade', () => {
      // write extended keyrack with graded key
      beforeAll(async () => {
        const { mkdirSync, writeFileSync } = await import('node:fs');
        const { join } = await import('node:path');

        const extendedDir = join(repo.path, '.agent', 'extended');
        mkdirSync(extendedDir, { recursive: true });

        writeFileSync(
          join(extendedDir, 'keyrack.yml'),
          `org: testorg
env.test:
  - GRADED_KEY: encrypted
`,
        );

        writeFileSync(
          join(repo.path, '.agent', 'keyrack.yml'),
          `org: testorg
extends:
  - .agent/extended/keyrack.yml
env.test:
  - LOCAL_KEY
`,
        );
      });

      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--for', 'repo', '--env', 'test', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 2 (locked keys exit non-zero)', () => {
        expect(result.status).toEqual(2);
      });

      then('inherited key is found via extends (GRADED_KEY)', () => {
        const parsed = JSON.parse(result.stdout) as Array<{ slug: string }>;
        const gradedKey = parsed.find((item) => item.slug.includes('GRADED_KEY'));
        expect(gradedKey).toBeDefined();
      });

      then('local key is also found (LOCAL_KEY)', () => {
        const parsed = JSON.parse(result.stdout) as Array<{ slug: string }>;
        const localKey = parsed.find((item) => item.slug.includes('LOCAL_KEY'));
        expect(localKey).toBeDefined();
      });

      then('stdout matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });
  });

  /**
   * usecase.8 = extends order semantics (last-wins, root-wins)
   * verifies merge order: later extends override earlier, root overrides all
   */
  given('[case3] repo with multiple extends and duplicate keys', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-manifest' }),
    );

    when('[t0] two extends with same key, different grades', () => {
      beforeAll(async () => {
        const { mkdirSync, writeFileSync } = await import('node:fs');
        const { join } = await import('node:path');

        const pathA = join(repo.path, '.agent', 'pathA');
        const pathB = join(repo.path, '.agent', 'pathB');
        mkdirSync(pathA, { recursive: true });
        mkdirSync(pathB, { recursive: true });

        // pathA declares CONFLICT_KEY as encrypted
        writeFileSync(
          join(pathA, 'keyrack.yml'),
          `org: testorg
env.test:
  - CONFLICT_KEY: encrypted
`,
        );

        // pathB declares CONFLICT_KEY as ephemeral (last-wins)
        writeFileSync(
          join(pathB, 'keyrack.yml'),
          `org: testorg
env.test:
  - CONFLICT_KEY: ephemeral
`,
        );

        // root extends both, pathB is last
        writeFileSync(
          join(repo.path, '.agent', 'keyrack.yml'),
          `org: testorg
extends:
  - .agent/pathA/keyrack.yml
  - .agent/pathB/keyrack.yml
env.test:
  - ROOT_ONLY_KEY
`,
        );
      });

      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--for', 'repo', '--env', 'test', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 2 (locked keys exit non-zero)', () => {
        expect(result.status).toEqual(2);
      });

      then('CONFLICT_KEY is found (merged from extends)', () => {
        const parsed = JSON.parse(result.stdout) as Array<{ slug: string }>;
        const conflictKey = parsed.find((item) =>
          item.slug.includes('CONFLICT_KEY'),
        );
        expect(conflictKey).toBeDefined();
      });

      then('ROOT_ONLY_KEY is found (from root manifest)', () => {
        const parsed = JSON.parse(result.stdout) as Array<{ slug: string }>;
        const rootKey = parsed.find((item) =>
          item.slug.includes('ROOT_ONLY_KEY'),
        );
        expect(rootKey).toBeDefined();
      });

      then('stdout matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] root declares same key as extended (root-wins)', () => {
      beforeAll(async () => {
        const { mkdirSync, writeFileSync } = await import('node:fs');
        const { join } = await import('node:path');

        const extended = join(repo.path, '.agent', 'extended2');
        mkdirSync(extended, { recursive: true });

        // extended declares ROOT_OVERRIDE_KEY as encrypted
        writeFileSync(
          join(extended, 'keyrack.yml'),
          `org: testorg
env.test:
  - ROOT_OVERRIDE_KEY: encrypted
`,
        );

        // root declares same key as ephemeral (root-wins)
        writeFileSync(
          join(repo.path, '.agent', 'keyrack.yml'),
          `org: testorg
extends:
  - .agent/extended2/keyrack.yml
env.test:
  - ROOT_OVERRIDE_KEY: ephemeral
`,
        );
      });

      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--for', 'repo', '--env', 'test', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 2 (locked keys exit non-zero)', () => {
        expect(result.status).toEqual(2);
      });

      then('ROOT_OVERRIDE_KEY is found (root declaration wins)', () => {
        const parsed = JSON.parse(result.stdout) as Array<{ slug: string }>;
        const key = parsed.find((item) =>
          item.slug.includes('ROOT_OVERRIDE_KEY'),
        );
        expect(key).toBeDefined();
      });

      then('stdout matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });
  });

  /**
   * usecase.10 = recursive extends support
   * verifies that extends chains are followed recursively
   */
  given('[case4] repo with deep extends chain (A extends B extends C)', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-recursive-extends' }),
    );

    when('[t0] keyrack get traverses full extends chain', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--for', 'repo', '--env', 'test', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 2 (locked keys exit non-zero)', () => {
        expect(result.status).toEqual(2);
      });

      then('returns key from deepest level (DEEP_KEY from pathB)', () => {
        const parsed = JSON.parse(result.stdout) as Array<{ slug: string }>;
        expect(parsed.some((item) => item.slug.includes('DEEP_KEY'))).toBe(true);
      });

      then('stdout matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });
  });

  /**
   * usecase.4 = extends path validation
   * verifies that non-existent extends paths produce clear error
   */
  given('[case5] repo with extends that points to non-existent file', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-manifest' }),
    );

    when('[t0] keyrack.yml modified to extend non-existent file', () => {
      // write a keyrack.yml with bad extends path
      beforeAll(async () => {
        const { writeFileSync } = await import('node:fs');
        const { join } = await import('node:path');
        writeFileSync(
          join(repo.path, '.agent', 'keyrack.yml'),
          `org: testorg
extends:
  - .agent/does-not-exist/keyrack.yml
env.test:
  - TEST_KEY
`,
        );
      });

      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--for', 'repo', '--env', 'test', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('error mentions extended keyrack not found', () => {
        const output = result.stdout + result.stderr;
        expect(output).toMatch(/extended keyrack not found|does-not-exist/i);
      });

      then('stderr matches snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });
  });

  /**
   * usecase.9 = circular extends detection
   * verifies circular extends chains are detected with clear error
   */
  given('[case6] repo with circular extends chain', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-manifest' }),
    );

    when('[t0] keyrack.yml modified to have self-referential extends', () => {
      // write keyrack files that create a circular reference
      beforeAll(async () => {
        const { mkdirSync, writeFileSync } = await import('node:fs');
        const { join } = await import('node:path');

        // create path structure
        const pathA = join(repo.path, '.agent', 'pathA');
        const pathB = join(repo.path, '.agent', 'pathB');
        mkdirSync(pathA, { recursive: true });
        mkdirSync(pathB, { recursive: true });

        // root extends pathA
        writeFileSync(
          join(repo.path, '.agent', 'keyrack.yml'),
          `org: testorg
extends:
  - .agent/pathA/keyrack.yml
env.test:
  - ROOT_KEY
`,
        );

        // pathA extends pathB
        writeFileSync(
          join(pathA, 'keyrack.yml'),
          `org: testorg
extends:
  - .agent/pathB/keyrack.yml
env.test:
  - PATH_A_KEY
`,
        );

        // pathB extends pathA (circular!)
        writeFileSync(
          join(pathB, 'keyrack.yml'),
          `org: testorg
extends:
  - .agent/pathA/keyrack.yml
env.test:
  - PATH_B_KEY
`,
        );
      });

      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--for', 'repo', '--env', 'test', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('error mentions circular extends', () => {
        const output = result.stdout + result.stderr;
        expect(output).toMatch(/circular extends/i);
      });

      then('stderr matches snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });
  });

  /**
   * usecase.unlock = keyrack unlock via extends chain
   * verifies that keys from extended keyrack can be unlocked
   */
  given('[case7] repo with key set in extended keyrack (unlock via extends)', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-manifest' }),
    );

    when('[t0] key is set in extended keyrack, then unlocked via root extends', () => {
      // set up extended keyrack with a key
      beforeAll(async () => {
        const { mkdirSync, writeFileSync } = await import('node:fs');
        const { join } = await import('node:path');

        // create extended keyrack directory
        const extendedDir = join(repo.path, '.agent', 'role-keyrack');
        mkdirSync(extendedDir, { recursive: true });

        // create extended keyrack.yml
        writeFileSync(
          join(extendedDir, 'keyrack.yml'),
          `org: testorg
env.test:
  - EXTENDED_SECRET
`,
        );

        // update root keyrack to extend the role keyrack
        writeFileSync(
          join(repo.path, '.agent', 'keyrack.yml'),
          `org: testorg
extends:
  - .agent/role-keyrack/keyrack.yml
env.test:
  - LOCAL_KEY
`,
        );
      });

      // set the key in the extended keyrack
      const setResult = useThen('key is set in extended keyrack', async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'EXTENDED_SECRET',
            '--env',
            'test',
            '--mech',
            'PERMANENT_VIA_REPLICA',
            '--vault',
            'os.direct',
            '--at',
            '.agent/role-keyrack/keyrack.yml',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'extended-secret-value\n',
        }),
      );

      then('set exits with status 0', () => {
        expect(setResult.status).toEqual(0);
      });

      then('unlock finds key via extends chain', async () => {
        const unlockResult = await invokeRhachetCliBinary({
          args: [
            'keyrack',
            'unlock',
            '--key',
            'EXTENDED_SECRET',
            '--env',
            'test',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        });
        expect(unlockResult.status).toEqual(0);
        const parsed = JSON.parse(unlockResult.stdout);
        expect(parsed.unlocked).toHaveLength(1);
        expect(parsed.unlocked[0].slug).toContain('EXTENDED_SECRET');
      });

      then('set stdout matches snapshot', () => {
        expect(asSnapshotSafe(setResult.stdout)).toMatchSnapshot();
      });
    });
  });

  /**
   * usecase.unlock.envall = keyrack unlock via env.all extends
   * verifies that env.all keys from extended keyrack are resolvable
   */
  given('[case8] repo with env.all key in extended keyrack', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-manifest' }),
    );

    when('[t0] env.all key is set in extended keyrack', () => {
      // set up extended keyrack with env.all key
      beforeAll(async () => {
        const { mkdirSync, writeFileSync } = await import('node:fs');
        const { join } = await import('node:path');

        // create extended keyrack directory
        const extendedDir = join(repo.path, '.agent', 'role-envall');
        mkdirSync(extendedDir, { recursive: true });

        // create extended keyrack.yml with env.all
        writeFileSync(
          join(extendedDir, 'keyrack.yml'),
          `org: testorg
env.all:
  - SHARED_TOKEN
env.prod: null
env.test: null
`,
        );

        // update root keyrack to extend and declare envs
        writeFileSync(
          join(repo.path, '.agent', 'keyrack.yml'),
          `org: testorg
extends:
  - .agent/role-envall/keyrack.yml
env.prod:
  - PROD_ONLY
env.test:
  - TEST_ONLY
`,
        );
      });

      // set the env.all key in the extended keyrack
      const setResult = useThen('key is set with env all', async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'SHARED_TOKEN',
            '--env',
            'all',
            '--mech',
            'PERMANENT_VIA_REPLICA',
            '--vault',
            'os.direct',
            '--at',
            '.agent/role-envall/keyrack.yml',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'shared-token-value\n',
        }),
      );

      then('set exits with status 0', () => {
        expect(setResult.status).toEqual(0);
      });

      then('unlock with --env all finds key directly', async () => {
        const unlockResult = await invokeRhachetCliBinary({
          args: [
            'keyrack',
            'unlock',
            '--key',
            'SHARED_TOKEN',
            '--env',
            'all',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        });
        expect(unlockResult.status).toEqual(0);
        const parsed = JSON.parse(unlockResult.stdout);
        expect(parsed.unlocked).toHaveLength(1);
        expect(parsed.unlocked[0].slug).toContain('SHARED_TOKEN');
      });

      then('keyrack get --env prod shows key via expansion (repo manifest)', async () => {
        // note: env.all keys are expanded to declared envs in repo manifest (keyrack get)
        // but unlock requires the key to be stored under the same env in host manifest
        const getResult = await invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--for',
            'repo',
            '--env',
            'prod',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        });
        // note: exit 2 because other keys in repo may be locked (--for repo gets all keys)
        expect(getResult.status).toEqual(2);
        const parsed = JSON.parse(getResult.stdout) as Array<{
          slug?: string;
          grant?: { slug: string };
        }>;
        // note: slug is at k.slug for locked items, k.grant.slug for granted items
        expect(
          parsed.some((k) =>
            (k.slug ?? k.grant?.slug)?.includes('SHARED_TOKEN'),
          ),
        ).toBe(true);
      });

      then('unlock with --env test finds key via expansion', async () => {
        const unlockResult = await invokeRhachetCliBinary({
          args: [
            'keyrack',
            'unlock',
            '--key',
            'SHARED_TOKEN',
            '--env',
            'test',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        });
        expect(unlockResult.status).toEqual(0);
        const parsed = JSON.parse(unlockResult.stdout);
        expect(parsed.unlocked).toHaveLength(1);
        expect(parsed.unlocked[0].slug).toContain('SHARED_TOKEN');
      });

      then('set stdout matches snapshot', () => {
        expect(asSnapshotSafe(setResult.stdout)).toMatchSnapshot();
      });
    });
  });

  /**
   * usecase.crossorg = cross-org extends uses root org in slugs
   * verifies that when root org differs from extended org, all keys use root org
   * ref: wish v2026_04_27.fix-keyrack-orgs — regression: set used ahbode, unlock used ehmpathy
   */
  given('[case9] cross-org extends uses root org for set, unlock, get', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-manifest' }),
    );

    when('[t0] root org=rootorg extends keyrack with org=extendorg', () => {
      // set up cross-org extends
      beforeAll(async () => {
        const { mkdirSync, writeFileSync } = await import('node:fs');
        const { join } = await import('node:path');

        // create extended keyrack directory
        const extendedDir = join(repo.path, '.agent', 'extended-org');
        mkdirSync(extendedDir, { recursive: true });

        // create extended keyrack.yml with different org
        writeFileSync(
          join(extendedDir, 'keyrack.yml'),
          `org: extendorg
env.test:
  - CROSS_ORG_KEY
`,
        );

        // update root keyrack with different org
        writeFileSync(
          join(repo.path, '.agent', 'keyrack.yml'),
          `org: rootorg
extends:
  - .agent/extended-org/keyrack.yml
env.test:
  - ROOT_KEY
`,
        );
      });

      // set the extended key — slug should use rootorg
      const setResult = useThen('set extended key uses root org in slug', async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'CROSS_ORG_KEY',
            '--env',
            'test',
            '--mech',
            'PERMANENT_VIA_REPLICA',
            '--vault',
            'os.direct',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'cross-org-secret\n',
        }),
      );

      then('set exits with status 0', () => {
        expect(setResult.status).toEqual(0);
      });

      then('set output shows rootorg in slug (not extendorg)', () => {
        const parsed = JSON.parse(setResult.stdout);
        expect(parsed.slug).toContain('rootorg');
        expect(parsed.slug).not.toContain('extendorg');
      });

      then('unlock finds key with rootorg slug', async () => {
        const unlockResult = await invokeRhachetCliBinary({
          args: [
            'keyrack',
            'unlock',
            '--key',
            'CROSS_ORG_KEY',
            '--env',
            'test',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        });
        expect(unlockResult.status).toEqual(0);
        const parsed = JSON.parse(unlockResult.stdout);
        expect(parsed.unlocked).toHaveLength(1);
        expect(parsed.unlocked[0].slug).toContain('rootorg');
        expect(parsed.unlocked[0].slug).not.toContain('extendorg');
        expect(asSnapshotSafe(unlockResult.stdout)).toMatchSnapshot();
      });

      then('get shows key with rootorg slug', async () => {
        const getResult = await invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'CROSS_ORG_KEY',
            '--env',
            'test',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        });
        expect(getResult.status).toEqual(0);
        const parsed = JSON.parse(getResult.stdout);
        expect(parsed.grant.slug).toContain('rootorg');
        expect(parsed.grant.slug).not.toContain('extendorg');
        expect(asSnapshotSafe(getResult.stdout)).toMatchSnapshot();
      });

      then('stdout matches snapshot', async () => {
        // re-run set for snapshot (idempotent)
        const snapshotResult = await invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'CROSS_ORG_KEY',
            '--env',
            'test',
            '--mech',
            'PERMANENT_VIA_REPLICA',
            '--vault',
            'os.direct',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'cross-org-secret\n',
        });
        expect(asSnapshotSafe(snapshotResult.stdout)).toMatchSnapshot();
      });
    });
  });

  /**
   * usecase.nestedcrossorg = nested cross-org extends uses outermost org
   * verifies A(org:alpha) extends B(org:beta) extends C(org:gamma) — all keys use alpha
   */
  given('[case10] nested cross-org extends uses outermost org', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-manifest' }),
    );

    when('[t0] A(alpha) extends B(beta) extends C(gamma)', () => {
      // set up nested cross-org extends
      beforeAll(async () => {
        const { mkdirSync, writeFileSync } = await import('node:fs');
        const { join } = await import('node:path');

        // create directories
        const pathB = join(repo.path, '.agent', 'pathB');
        const pathC = join(repo.path, '.agent', 'pathC');
        mkdirSync(pathB, { recursive: true });
        mkdirSync(pathC, { recursive: true });

        // C: deepest level with org:gamma
        writeFileSync(
          join(pathC, 'keyrack.yml'),
          `org: gamma
env.test:
  - GAMMA_KEY
`,
        );

        // B: middle level with org:beta, extends C
        writeFileSync(
          join(pathB, 'keyrack.yml'),
          `org: beta
extends:
  - .agent/pathC/keyrack.yml
env.test:
  - BETA_KEY
`,
        );

        // A: root level with org:alpha, extends B
        writeFileSync(
          join(repo.path, '.agent', 'keyrack.yml'),
          `org: alpha
extends:
  - .agent/pathB/keyrack.yml
env.test:
  - ALPHA_KEY
`,
        );
      });

      // set the deepest key — slug should use alpha (outermost)
      const setResult = useThen('set deepest key uses outermost org', async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'GAMMA_KEY',
            '--env',
            'test',
            '--mech',
            'PERMANENT_VIA_REPLICA',
            '--vault',
            'os.direct',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'gamma-secret\n',
        }),
      );

      then('set exits with status 0', () => {
        expect(setResult.status).toEqual(0);
      });

      then('set output shows alpha in slug (not beta or gamma)', () => {
        const parsed = JSON.parse(setResult.stdout);
        expect(parsed.slug).toContain('alpha');
        expect(parsed.slug).not.toContain('beta');
        expect(parsed.slug).not.toContain('gamma');
      });

      then('unlock finds key with alpha slug', async () => {
        const unlockResult = await invokeRhachetCliBinary({
          args: [
            'keyrack',
            'unlock',
            '--key',
            'GAMMA_KEY',
            '--env',
            'test',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        });
        expect(unlockResult.status).toEqual(0);
        const parsed = JSON.parse(unlockResult.stdout);
        expect(parsed.unlocked).toHaveLength(1);
        expect(parsed.unlocked[0].slug).toContain('alpha');
      });

      then('get shows middle key (BETA_KEY) with alpha slug', async () => {
        // first set the middle key
        await invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'BETA_KEY',
            '--env',
            'test',
            '--mech',
            'PERMANENT_VIA_REPLICA',
            '--vault',
            'os.direct',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'beta-secret\n',
        });

        // unlock the key
        await invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--key', 'BETA_KEY', '--env', 'test'],
          cwd: repo.path,
          env: { HOME: repo.path },
        });

        // then get it
        const getResult = await invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'BETA_KEY',
            '--env',
            'test',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        });
        expect(getResult.status).toEqual(0);
        const parsed = JSON.parse(getResult.stdout);
        expect(parsed.grant.slug).toContain('alpha');
        expect(parsed.grant.slug).not.toContain('beta');
      });

      then('stdout matches snapshot', async () => {
        const snapshotResult = await invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'GAMMA_KEY',
            '--env',
            'test',
            '--mech',
            'PERMANENT_VIA_REPLICA',
            '--vault',
            'os.direct',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'gamma-secret\n',
        });
        expect(asSnapshotSafe(snapshotResult.stdout)).toMatchSnapshot();
      });
    });
  });
});
