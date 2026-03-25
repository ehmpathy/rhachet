import { asIsoTimeStamp } from 'iso-time';
import { given, then, useBeforeAll, when } from 'test-fns';

import {
  daemonAccessGet,
  daemonAccessUnlock,
} from '@src/domain.operations/keyrack/daemon/sdk';
import { createKeyrackDaemonServer } from '@src/domain.operations/keyrack/daemon/svc';

import { existsSync, unlinkSync } from 'node:fs';

describe('vaultAdapterOsDaemon integration', () => {
  // use unique socket path for tests
  const testSocketPath = `/tmp/keyrack-os-daemon-adapter-test-${process.pid}.sock`;
  const testPidPath = testSocketPath.replace(/\.sock$/, '.pid');
  const testHomeHash = 'adapter-test-hash';

  // cleanup before and after tests
  beforeAll(() => {
    if (existsSync(testSocketPath)) unlinkSync(testSocketPath);
    if (existsSync(testPidPath)) unlinkSync(testPidPath);
  });

  afterAll(() => {
    if (existsSync(testSocketPath)) unlinkSync(testSocketPath);
    if (existsSync(testPidPath)) unlinkSync(testPidPath);
  });

  given('[case1] daemon server is active', () => {
    const scene = useBeforeAll(async () => {
      return createKeyrackDaemonServer({
        socketPath: testSocketPath,
        homeHash: testHomeHash,
      });
    });

    afterAll(() => {
      scene.server.close();
    });

    when('[t0] key is stored via daemonAccessUnlock', () => {
      then('vaultAdapterOsDaemon.get retrieves it', async () => {
        const testSlug = 'testorg.test.VAULT_ADAPTER_GET_TEST';
        const testSecret = 'adapter-get-test-secret';

        // store key directly via daemon sdk
        await daemonAccessUnlock({
          keys: [
            {
              slug: testSlug,
              key: {
                secret: testSecret,
                grade: { protection: 'encrypted', duration: 'transient' },
              },
              source: { vault: 'os.daemon', mech: 'EPHEMERAL_VIA_SESSION' },
              env: 'test',
              org: 'testorg',
              expiresAt: asIsoTimeStamp(new Date(Date.now() + 60000)),
            },
          ],
          socketPath: testSocketPath,
        });

        // retrieve via adapter.get
        const result = await daemonAccessGet({
          slugs: [testSlug],
          socketPath: testSocketPath,
        });

        expect(result).not.toBeNull();
        const keyEntry = result!.keys.find((k) => k.slug === testSlug);
        expect(keyEntry).toBeDefined();
        expect(keyEntry?.key.secret).toBe(testSecret);
      });
    });

    when('[t1] key is stored with source vault os.daemon', () => {
      then('source reflects os.daemon and EPHEMERAL_VIA_SESSION', async () => {
        const testSlug = 'testorg.test.SOURCE_CHECK_KEY';

        // store via daemon sdk with os.daemon source
        await daemonAccessUnlock({
          keys: [
            {
              slug: testSlug,
              key: {
                secret: 'source-check-secret',
                grade: { protection: 'encrypted', duration: 'transient' },
              },
              source: { vault: 'os.daemon', mech: 'EPHEMERAL_VIA_SESSION' },
              env: 'test',
              org: 'testorg',
              expiresAt: asIsoTimeStamp(new Date(Date.now() + 60000)),
            },
          ],
          socketPath: testSocketPath,
        });

        // verify via get
        const result = await daemonAccessGet({
          slugs: [testSlug],
          socketPath: testSocketPath,
        });

        expect(result).not.toBeNull();
        const keyEntry = result!.keys.find((k) => k.slug === testSlug);
        expect(keyEntry).toBeDefined();
        expect(keyEntry?.source.vault).toBe('os.daemon');
        expect(keyEntry?.source.mech).toBe('EPHEMERAL_VIA_SESSION');
      });
    });

    when('[t2] get called for absent key', () => {
      then('returns empty keys array', async () => {
        const result = await daemonAccessGet({
          slugs: ['testorg.test.NONEXISTENT_ADAPTER_KEY'],
          socketPath: testSocketPath,
        });

        expect(result).not.toBeNull();
        expect(result!.keys.length).toBe(0);
      });
    });
  });
});
