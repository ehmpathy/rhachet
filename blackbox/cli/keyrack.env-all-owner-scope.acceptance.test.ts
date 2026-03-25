import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';

describe('keyrack env-all-owner-scope', () => {
  // kill any stale daemon to ensure fresh daemon with current code
  beforeAll(() => killKeyrackDaemonForTests());

  /**
   * [uc14] env=all is per-owner scoped
   * keys set with env=all by ownerA should NOT appear for ownerB
   *
   * note: org comes from repo's keyrack.yml (testorg), not from owner
   * owner isolation = each owner has separate host manifest at ~/.rhachet/keyrack/owner=$owner/
   */
  given('[case10] env=all owner scope', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-multi-env' }),
    );

    // init mechanic owner
    useBeforeAll(async () =>
      invokeRhachetCliBinary({
        args: ['keyrack', 'init', '--for', 'mechanic'],
        cwd: repo.path,
        env: { HOME: repo.path },
      }),
    );

    // init foreman owner
    useBeforeAll(async () =>
      invokeRhachetCliBinary({
        args: ['keyrack', 'init', '--for', 'foreman'],
        cwd: repo.path,
        env: { HOME: repo.path },
      }),
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

    when('[t0] set key for mechanic with env=all', () => {
      const setResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'OWNER_SCOPED_TOKEN',
            '--for',
            'mechanic',
            '--env',
            'all',
            '--mech',
            'PERMANENT_VIA_REPLICA',
            '--vault',
            'os.direct',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'mechanic-secret-123\n',
        }),
      );

      then('set exits with status 0', () => {
        expect(setResult.status).toEqual(0);
      });

      then('set creates testorg.all.OWNER_SCOPED_TOKEN (org from repo)', () => {
        const parsed = JSON.parse(setResult.stdout);
        // org is testorg (from keyrack.yml), owner is mechanic (from --for)
        expect(parsed.slug).toEqual('testorg.all.OWNER_SCOPED_TOKEN');
      });
    });

    when('[t1] mechanic can access their env=all key (positive)', () => {
      // set key for mechanic
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'OWNER_SCOPED_TOKEN',
            '--for',
            'mechanic',
            '--env',
            'all',
            '--mech',
            'PERMANENT_VIA_REPLICA',
            '--vault',
            'os.direct',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'mechanic-secret-123\n',
        }),
      );

      // unlock mechanic keys
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--for', 'mechanic', '--env', 'all'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'testorg.all.OWNER_SCOPED_TOKEN',
            '--owner',
            'mechanic',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('testorg.all.OWNER_SCOPED_TOKEN is granted for mechanic', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('granted');
        expect(parsed.grant.slug).toEqual('testorg.all.OWNER_SCOPED_TOKEN');
        expect(parsed.grant.key.secret).toEqual('mechanic-secret-123');
      });
    });

    when('[t2] foreman cannot access mechanic env=all key (negative)', () => {
      // set key for mechanic
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'MECHANIC_ONLY_TOKEN',
            '--for',
            'mechanic',
            '--env',
            'all',
            '--mech',
            'PERMANENT_VIA_REPLICA',
            '--vault',
            'os.direct',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'mechanic-only-value-456\n',
        }),
      );

      // unlock foreman keys (not mechanic)
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--for', 'foreman', '--env', 'all'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'testorg.all.MECHANIC_ONLY_TOKEN',
            '--owner',
            'foreman',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('mechanic key is NOT granted to foreman (owner isolation)', () => {
        const parsed = JSON.parse(result.stdout);
        // key should be locked or absent since foreman's host manifest doesn't have it
        expect(parsed.status).not.toEqual('granted');
      });

      then('mechanic secret is NOT exposed', () => {
        expect(result.stdout).not.toContain('mechanic-only-value-456');
      });
    });

    when('[t3] list shows only own owner keys (negative)', () => {
      // set key for mechanic
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'MECHANIC_LIST_TOKEN',
            '--for',
            'mechanic',
            '--env',
            'all',
            '--mech',
            'PERMANENT_VIA_REPLICA',
            '--vault',
            'os.direct',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'mechanic-list-value\n',
        }),
      );

      // set key for foreman
      useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'FOREMAN_LIST_TOKEN',
            '--for',
            'foreman',
            '--env',
            'all',
            '--mech',
            'PERMANENT_VIA_REPLICA',
            '--vault',
            'os.direct',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'foreman-list-value\n',
        }),
      );

      const mechanicList = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'list', '--for', 'mechanic', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      const foremanList = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'list', '--for', 'foreman', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('mechanic list contains testorg.all.MECHANIC_LIST_TOKEN', () => {
        const parsed = JSON.parse(mechanicList.stdout);
        expect(parsed['testorg.all.MECHANIC_LIST_TOKEN']).toBeDefined();
      });

      then('mechanic list does NOT contain testorg.all.FOREMAN_LIST_TOKEN', () => {
        const parsed = JSON.parse(mechanicList.stdout);
        expect(parsed['testorg.all.FOREMAN_LIST_TOKEN']).toBeUndefined();
      });

      then('foreman list contains testorg.all.FOREMAN_LIST_TOKEN', () => {
        const parsed = JSON.parse(foremanList.stdout);
        expect(parsed['testorg.all.FOREMAN_LIST_TOKEN']).toBeDefined();
      });

      then('foreman list does NOT contain testorg.all.MECHANIC_LIST_TOKEN', () => {
        const parsed = JSON.parse(foremanList.stdout);
        expect(parsed['testorg.all.MECHANIC_LIST_TOKEN']).toBeUndefined();
      });
    });
  });
});
