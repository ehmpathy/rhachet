import { given, then, when } from 'test-fns';

import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getAllKeyrackDaemonSocketPaths } from './getAllKeyrackDaemonSocketPaths';
import { getHomeHash } from './getHomeHash';
import { getLoginSessionId } from './getLoginSessionId';

describe('getAllKeyrackDaemonSocketPaths', () => {
  // use a temp directory for test sockets
  const testRuntimeDir = `/tmp/keyrack-test-runtime-${process.pid}`;

  beforeAll(() => {
    // create test runtime dir
    if (!existsSync(testRuntimeDir)) {
      mkdirSync(testRuntimeDir, { recursive: true });
    }
    // set XDG_RUNTIME_DIR for tests
    process.env['XDG_RUNTIME_DIR'] = testRuntimeDir;
  });

  afterAll(() => {
    // cleanup
    delete process.env['XDG_RUNTIME_DIR'];
    if (existsSync(testRuntimeDir)) {
      rmSync(testRuntimeDir, { recursive: true, force: true });
    }
  });

  given('[case1] no socket files exist', () => {
    when('[t0] getAllKeyrackDaemonSocketPaths is called', () => {
      then('returns empty array', () => {
        const result = getAllKeyrackDaemonSocketPaths();
        expect(result).toEqual([]);
      });
    });
  });

  given('[case2] socket files exist for current session', () => {
    const sessionId = getLoginSessionId({ pid: process.pid });
    const homeHash = getHomeHash();

    // create test socket files
    beforeAll(() => {
      // default owner socket
      const defaultSocket = join(
        testRuntimeDir,
        `keyrack.${sessionId}.${homeHash}.sock`,
      );
      writeFileSync(defaultSocket, '');

      // owner-specific socket
      const ownerSocket = join(
        testRuntimeDir,
        `keyrack.${sessionId}.${homeHash}.ehmpath.sock`,
      );
      writeFileSync(ownerSocket, '');

      // unrelated socket (different session)
      const unrelatedSocket = join(
        testRuntimeDir,
        `keyrack.999999.${homeHash}.sock`,
      );
      writeFileSync(unrelatedSocket, '');

      // non-keyrack file
      const otherFile = join(testRuntimeDir, 'other-file.sock');
      writeFileSync(otherFile, '');
    });

    when('[t0] getAllKeyrackDaemonSocketPaths is called', () => {
      then('returns only sockets for current session', () => {
        const result = getAllKeyrackDaemonSocketPaths();

        // should have 2 entries: default and ehmpath
        expect(result.length).toBe(2);

        // check default owner socket
        const defaultEntry = result.find((r) => r.owner === null);
        expect(defaultEntry).toBeDefined();
        expect(defaultEntry!.socketPath).toContain(
          `keyrack.${sessionId}.${homeHash}.sock`,
        );

        // check ehmpath owner socket
        const ehmpathEntry = result.find((r) => r.owner === 'ehmpath');
        expect(ehmpathEntry).toBeDefined();
        expect(ehmpathEntry!.socketPath).toContain(
          `keyrack.${sessionId}.${homeHash}.ehmpath.sock`,
        );
      });
    });
  });
});
