import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';

describe('keyrack env-all-org-scope', () => {
  // kill any stale daemon to ensure fresh daemon with current code
  beforeAll(() => killKeyrackDaemonForTests());

  /**
   * [uc13] env=all is per-org scoped
   * keys set with env=all for orgA should NOT appear for orgB
   */
  given('[case8] env=all org scope', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-multi-env' }),
    );

    // ensure daemon cache is cleared before each test
    beforeEach(async () => {
      await invokeRhachetCliBinary({
        args: ['keyrack', 'relock'],
        cwd: repo.path,
        env: { HOME: repo.path },
        logOnError: false,
      });
    });

    when('[t0] set key for testorg.all', () => {
      // set a key with env=all for testorg
      const setResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'ORG_SCOPED_TOKEN',
            '--org',
            '@this',
            '--env',
            'all',
            '--mech',
            'REPLICA',
            '--vault',
            'os.direct',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'testorg-all-value-123\n',
        }),
      );

      then('set exits with status 0', () => {
        expect(setResult.status).toEqual(0);
      });

      then('set creates testorg.all.ORG_SCOPED_TOKEN', () => {
        const parsed = JSON.parse(setResult.stdout);
        expect(parsed.slug).toEqual('testorg.all.ORG_SCOPED_TOKEN');
      });
    });

    when('[t1] get --for repo --env prod returns testorg.all keys', () => {
      // first set the key
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'ORG_SCOPED_TOKEN',
            '--org',
            '@this',
            '--env',
            'all',
            '--mech',
            'REPLICA',
            '--vault',
            'os.direct',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'testorg-all-value-123\n',
        }),
      );

      // unlock all keys
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'all'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--for', 'repo', '--env', 'prod', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('includes testorg.all.ORG_SCOPED_TOKEN in prod results', () => {
        const parsed = JSON.parse(result.stdout);
        const allKey = parsed.find(
          (a: { grant?: { slug: string } }) =>
            a.grant?.slug === 'testorg.all.ORG_SCOPED_TOKEN',
        );
        expect(allKey).toBeDefined();
        expect(allKey.grant.key.secret).toEqual('testorg-all-value-123');
      });
    });

    when('[t2] otherorg keys do NOT appear in testorg query (org isolation)', () => {
      // create a second repo with org: otherorg (but SAME HOME as testorg for shared daemon)
      const otherorgRepo = useBeforeAll(async () => {
        const otherRepo = await genTestTempRepo({ fixture: 'with-keyrack-multi-env' });
        // overwrite keyrack.yml with org: otherorg
        const fs = await import('fs/promises');
        const path = await import('path');
        await fs.writeFile(
          path.join(otherRepo.path, '.agent', 'keyrack.yml'),
          'org: otherorg\n\nenv.all:\n  - OTHERORG_TOKEN\n\nenv.prod:\n  - OTHERORG_PROD_KEY\n',
        );
        return otherRepo;
      });

      // set key for otherorg with env=all (SAME HOME as testorg for shared daemon)
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'OTHERORG_TOKEN',
            '--org',
            '@this',
            '--env',
            'all',
            '--mech',
            'REPLICA',
            '--vault',
            'os.direct',
          ],
          cwd: otherorgRepo.path,
          env: { HOME: repo.path }, // shared HOME for daemon
          stdin: 'otherorg-secret-value\n',
        }),
      );

      // unlock otherorg keys (so they're in daemon, shared HOME)
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'all'],
          cwd: otherorgRepo.path,
          env: { HOME: repo.path }, // shared HOME for daemon
        }),
      );

      // set key for testorg with env=all (shared HOME)
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'TESTORG_ONLY_TOKEN',
            '--org',
            '@this',
            '--env',
            'all',
            '--mech',
            'REPLICA',
            '--vault',
            'os.direct',
          ],
          cwd: repo.path,
          env: { HOME: repo.path }, // shared HOME for daemon
          stdin: 'testorg-only-value-456\n',
        }),
      );

      // unlock testorg keys (shared HOME)
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'all'],
          cwd: repo.path,
          env: { HOME: repo.path }, // shared HOME for daemon
        }),
      );

      // query from testorg repo (shared HOME — daemon has both orgs' keys)
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--for', 'repo', '--env', 'prod', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path }, // shared HOME for daemon
        }),
      );

      then('testorg.all.TESTORG_ONLY_TOKEN is in results (positive)', () => {
        const parsed = JSON.parse(result.stdout);
        const testorgKey = parsed.find(
          (a: { grant?: { slug: string }; slug?: string }) =>
            (a.grant?.slug ?? a.slug) === 'testorg.all.TESTORG_ONLY_TOKEN',
        );
        expect(testorgKey).toBeDefined();
      });

      then('otherorg.all.OTHERORG_TOKEN does NOT appear (negative - org isolation)', () => {
        const parsed = JSON.parse(result.stdout);
        const otherOrgKeys = parsed.filter(
          (a: { grant?: { slug: string }; slug?: string }) =>
            (a.grant?.slug ?? a.slug)?.startsWith('otherorg.'),
        );
        expect(otherOrgKeys.length).toEqual(0);
      });

      then('only testorg.* keys appear', () => {
        const parsed = JSON.parse(result.stdout);
        for (const attempt of parsed) {
          const slug = attempt.grant?.slug ?? attempt.slug;
          expect(slug).toMatch(/^testorg\./);
        }
      });
    });
  });
});
