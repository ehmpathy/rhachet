import { given, then, useBeforeAll, when } from 'test-fns';

import {
  genTestTempRepo,
  TEST_SSH_AGE_RECIPIENT,
} from '@/blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';

describe('keyrack roundtrip', () => {
  // kill any stale daemon to ensure fresh code is used
  beforeAll(() => {
    killKeyrackDaemonForTests({ owner: null });
  });

  /**
   * [uc1] sudo + os.secure roundtrip
   * set -> get-locked -> unlock -> get-granted -> relock -> get-locked
   */
  given('[case1] sudo + os.secure roundtrip', () => {
    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'minimal' });
      // init keyrack so we have encrypted manifest and recipients
      await invokeRhachetCliBinary({
        args: ['keyrack', 'init'],
        cwd: r.path,
        env: { HOME: r.path },
      });
      return r;
    });

    when('[t0] set --key SUDO_SECURE_KEY --env sudo --vault os.secure', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'SUDO_SECURE_KEY',
            '--env',
            'sudo',
            '--vault',
            'os.secure',
            '--vault-recipient',
            TEST_SSH_AGE_RECIPIENT,
            '--org',
            '@all',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'sudo-secure-secret-value\n',
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('response contains env: sudo', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.env).toEqual('sudo');
      });

      then('response contains vault: os.secure', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.vault).toEqual('os.secure');
      });
    });

    when('[t1] get before unlock (returns locked)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'SUDO_SECURE_KEY',
            '--env',
            'sudo',
            '--org',
            '@all',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('status is locked', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('locked');
      });

      then('output contains unlock hint', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.fix).toContain('unlock');
      });
    });

    when('[t2] unlock --env sudo --key SUDO_SECURE_KEY', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'unlock',
            '--env',
            'sudo',
            '--key',
            'SUDO_SECURE_KEY',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output contains the unlocked key slug', () => {
        expect(result.stdout).toContain('SUDO_SECURE_KEY');
      });
    });

    when('[t3] get after unlock (returns granted)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'SUDO_SECURE_KEY',
            '--env',
            'sudo',
            '--org',
            '@all',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('status is granted', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('granted');
      });

      then('value matches what was set', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.key.secret).toEqual('sudo-secure-secret-value');
      });
    });

    when('[t4] relock', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'relock'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output mentions prune', () => {
        expect(result.stdout).toContain('prune');
      });
    });

    when('[t5] get after relock (returns locked again)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'SUDO_SECURE_KEY',
            '--env',
            'sudo',
            '--org',
            '@all',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('status is locked', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('locked');
      });
    });
  });

  /**
   * [uc2] sudo + os.direct roundtrip
   * set -> get-locked -> unlock -> get-granted -> relock -> get-locked
   */
  given('[case2] sudo + os.direct roundtrip', () => {
    // kill daemon to isolate from case1 state
    beforeAll(() => killKeyrackDaemonForTests({ owner: null }));

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'minimal' });
      await invokeRhachetCliBinary({
        args: ['keyrack', 'init'],
        cwd: r.path,
        env: { HOME: r.path },
      });
      return r;
    });

    when('[t0] set --key SUDO_DIRECT_KEY --env sudo --vault os.direct', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'SUDO_DIRECT_KEY',
            '--env',
            'sudo',
            '--vault',
            'os.direct',
            '--org',
            '@all',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'sudo-direct-secret-value\n',
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('response contains vault: os.direct', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.vault).toEqual('os.direct');
      });
    });

    when('[t1] get before unlock (returns locked)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'SUDO_DIRECT_KEY',
            '--env',
            'sudo',
            '--org',
            '@all',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('status is locked', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('locked');
      });
    });

    when('[t2] unlock --env sudo --key SUDO_DIRECT_KEY', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'unlock',
            '--env',
            'sudo',
            '--key',
            'SUDO_DIRECT_KEY',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output contains the unlocked key slug', () => {
        expect(result.stdout).toContain('SUDO_DIRECT_KEY');
      });
    });

    when('[t3] get after unlock (returns granted)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'SUDO_DIRECT_KEY',
            '--env',
            'sudo',
            '--org',
            '@all',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('status is granted', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('granted');
      });

      then('value matches what was set', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.key.secret).toEqual('sudo-direct-secret-value');
      });
    });

    when('[t4] relock --env sudo', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'relock', '--env', 'sudo'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });
    });

    when('[t5] get after relock (returns locked again)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'SUDO_DIRECT_KEY',
            '--env',
            'sudo',
            '--org',
            '@all',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('status is locked', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('locked');
      });
    });
  });

  /**
   * [uc3] regular + os.direct roundtrip
   * set -> get-locked -> unlock -> get-granted
   */
  given('[case3] regular + os.direct roundtrip', () => {
    // kill daemon to prevent state leakage from prior cases
    beforeAll(() => killKeyrackDaemonForTests({ owner: null }));

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-keyrack-multi-env' });
      await invokeRhachetCliBinary({
        args: ['keyrack', 'init'],
        cwd: r.path,
        env: { HOME: r.path },
      });
      return r;
    });

    when('[t0] set --key REGULAR_DIRECT_KEY --env prod --vault os.direct', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'REGULAR_DIRECT_KEY',
            '--env',
            'prod',
            '--vault',
            'os.direct',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'regular-direct-secret-value\n',
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('response contains vault: os.direct', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.vault).toEqual('os.direct');
      });
    });

    when('[t1] get before unlock (returns locked)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'REGULAR_DIRECT_KEY',
            '--env',
            'prod',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('status is locked', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('locked');
      });
    });

    when('[t2] unlock --env prod --key REGULAR_DIRECT_KEY', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'unlock',
            '--env',
            'prod',
            '--key',
            'REGULAR_DIRECT_KEY',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output contains the unlocked key slug', () => {
        expect(result.stdout).toContain('REGULAR_DIRECT_KEY');
      });
    });

    when('[t3] get after unlock (returns granted)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'REGULAR_DIRECT_KEY',
            '--env',
            'prod',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('status is granted', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('granted');
      });

      then('value matches what was set', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.key.secret).toEqual('regular-direct-secret-value');
      });
    });
  });

  /**
   * [uc4] regular + os.secure roundtrip
   * set -> get-locked -> unlock -> get-granted
   */
  given('[case4] regular + os.secure roundtrip', () => {
    // kill daemon to prevent state leakage from prior cases
    beforeAll(() => killKeyrackDaemonForTests({ owner: null }));

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-keyrack-multi-env' });
      await invokeRhachetCliBinary({
        args: ['keyrack', 'init'],
        cwd: r.path,
        env: { HOME: r.path },
      });
      return r;
    });

    when('[t0] set --key REGULAR_SECURE_KEY --env prod --vault os.secure', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'REGULAR_SECURE_KEY',
            '--env',
            'prod',
            '--vault',
            'os.secure',
            '--vault-recipient',
            TEST_SSH_AGE_RECIPIENT,
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'regular-secure-secret-value\n',
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('response contains vault: os.secure', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.vault).toEqual('os.secure');
      });
    });

    when('[t1] get before unlock (returns locked)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'REGULAR_SECURE_KEY',
            '--env',
            'prod',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('status is locked', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('locked');
      });
    });

    when('[t2] unlock --env prod --key REGULAR_SECURE_KEY', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'unlock',
            '--env',
            'prod',
            '--key',
            'REGULAR_SECURE_KEY',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output contains the unlocked key slug', () => {
        expect(result.stdout).toContain('REGULAR_SECURE_KEY');
      });
    });

    when('[t3] get after unlock (returns granted)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'REGULAR_SECURE_KEY',
            '--env',
            'prod',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('status is granted', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('granted');
      });

      then('value matches what was set', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.key.secret).toEqual('regular-secure-secret-value');
      });
    });
  });
});
