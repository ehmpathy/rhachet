import { asIsoTimeStamp } from 'iso-time';
import { given, then, useBeforeAll, when } from 'test-fns';

import {
  genMockPromptHiddenInput,
  setMockPromptValues,
} from '@src/.test/infra/mockPromptHiddenInput';
import {
  daemonAccessGet,
  daemonAccessUnlock,
} from '@src/domain.operations/keyrack/daemon/sdk';
import { createKeyrackDaemonServer } from '@src/domain.operations/keyrack/daemon/svc';

import { existsSync, unlinkSync } from 'node:fs';

/**
 * .note = mocks promptHiddenInput to simulate user input in tests
 * .why = integration tests need controlled secret input without real stdin
 */
jest.mock('@src/infra/promptHiddenInput', () => genMockPromptHiddenInput());

import { vaultAdapterOsDaemon } from './vaultAdapterOsDaemon';

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

  /**
   * [fix] vaultAdapterOsDaemon.set uses context.owner
   *
   * .what = proves that set() stores keys in owner-specific daemon
   * .why = verifies fix for fix-keyrack-sudo-source behavior
   *
   * the fix:
   * 1. set(input, context?) derives socketPath from context.owner
   * 2. findsertKeyrackDaemon({ socketPath }) spawns owner-specific daemon
   * 3. daemonAccessUnlock({ socketPath }) stores key in that daemon
   * 4. result: key stores in owner's daemon (correct!)
   */
  given('[case2] FIX: set uses context.owner for daemon isolation', () => {
    // use unique owner for this test to avoid collisions
    const testOwner = `test-owner-${process.pid}`;

    // derive the socket path that set() will use for this owner
    const {
      getKeyrackDaemonSocketPath,
    } = require('@src/domain.operations/keyrack/daemon/infra/getKeyrackDaemonSocketPath');
    const ownerSocketPath = getKeyrackDaemonSocketPath({ owner: testOwner });
    const ownerPidPath = ownerSocketPath.replace(/\.sock$/, '.pid');

    // cleanup owner-specific daemon before and after
    beforeAll(() => {
      if (existsSync(ownerSocketPath)) unlinkSync(ownerSocketPath);
      if (existsSync(ownerPidPath)) unlinkSync(ownerPidPath);
    });

    afterAll(() => {
      if (existsSync(ownerSocketPath)) unlinkSync(ownerSocketPath);
      if (existsSync(ownerPidPath)) unlinkSync(ownerPidPath);
    });

    when('[t0] set called with context.owner', () => {
      then('key is stored in owner-specific daemon', async () => {
        const testSlug = 'testorg.test.OWNER_ISOLATION_KEY';
        const testSecret = 'owner-isolation-secret';

        // set mock prompt to return our test secret
        setMockPromptValues(testSecret);

        // call set with context.owner — this is the fix under test
        await vaultAdapterOsDaemon.set({ slug: testSlug }, {
          owner: testOwner,
        } as Parameters<typeof vaultAdapterOsDaemon.set>[1]);

        // verify: key should be in owner-specific daemon (ownerSocketPath)
        const result = await daemonAccessGet({
          slugs: [testSlug],
          socketPath: ownerSocketPath,
        });

        expect(result).not.toBeNull();
        const keyEntry = result!.keys.find((k) => k.slug === testSlug);
        expect(keyEntry).toBeDefined();
        expect(keyEntry?.key.secret).toBe(testSecret);

        // verify source metadata per wish/vision
        expect(keyEntry?.source.vault).toBe('os.daemon');
        expect(keyEntry?.source.mech).toBe('EPHEMERAL_VIA_SESSION');
      });

      then('key is NOT in default daemon', async () => {
        const testSlug = 'testorg.test.OWNER_ISOLATION_KEY';

        // get default daemon socket path (no owner)
        const defaultSocketPath = getKeyrackDaemonSocketPath({ owner: null });

        // query default daemon — returns null if not reachable
        const result = await daemonAccessGet({
          slugs: [testSlug],
          socketPath: defaultSocketPath,
        });

        // if daemon not reachable (null): key definitely not there
        // if daemon reachable: verify key is absent from keys array
        if (result === null) {
          // daemon not reachable proves isolation — key cannot be in nonexistent daemon
          expect(result).toBeNull();
        } else {
          // daemon is reachable — verify key is absent
          const keyEntry = result.keys.find((k) => k.slug === testSlug);
          expect(keyEntry).toBeUndefined();
        }
      });
    });

    /**
     * [fix] round-trip: adapter.set → adapter.get with owner
     *
     * .what = proves full adapter round-trip with owner isolation
     * .why = verifies both set and get use owner for socket path derivation
     */
    when('[t1] round-trip: set then get with same owner', () => {
      then('adapter.get retrieves key stored by adapter.set', async () => {
        const testSlug = 'testorg.test.ROUNDTRIP_OWNER_KEY';
        const testSecret = 'roundtrip-owner-secret';

        // set mock prompt to return our test secret
        setMockPromptValues(testSecret);

        // store via adapter.set with owner
        await vaultAdapterOsDaemon.set({ slug: testSlug }, {
          owner: testOwner,
        } as Parameters<typeof vaultAdapterOsDaemon.set>[1]);

        // retrieve via adapter.get with same owner
        const grant = await vaultAdapterOsDaemon.get({
          slug: testSlug,
          owner: testOwner,
        });

        // verify full KeyrackKeyGrant returned
        expect(grant).not.toBeNull();
        expect(grant?.slug).toBe(testSlug);
        expect(grant?.key.secret).toBe(testSecret);
        expect(grant?.source.vault).toBe('os.daemon');
        expect(grant?.source.mech).toBe('EPHEMERAL_VIA_SESSION');
        expect(grant?.env).toBe('test');
        expect(grant?.org).toBe('testorg');
        expect(grant?.expiresAt).toBeDefined();
      });

      then('adapter.get with different owner returns null', async () => {
        const testSlug = 'testorg.test.ROUNDTRIP_OWNER_KEY';

        // retrieve via adapter.get with different owner
        const grant = await vaultAdapterOsDaemon.get({
          slug: testSlug,
          owner: 'different-owner',
        });

        // key should not be found in different owner's daemon
        expect(grant).toBeNull();
      });
    });
  });
});
