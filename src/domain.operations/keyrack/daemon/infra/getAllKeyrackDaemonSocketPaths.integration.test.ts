import { given, then, when } from 'test-fns';

import { getHomeHash } from '@src/infra/host/getHomeHash';

import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getAllKeyrackDaemonSocketPaths } from './getAllKeyrackDaemonSocketPaths';
import { getLoginSessionId } from './getLoginSessionId';

/**
 * .what = an INTEGRATION test, not a unit test
 * .why = the subject reads a real directory, and these cases write real socket files into it
 * via `writeFileSync`, plus read `/proc` for the login session id. both are remote boundaries,
 * which `rule.forbid.unit.remote-boundaries` bars from a `.test.ts`.
 *
 * .note = the alternative — inject `fs` and mock it — would assert only what the mock was told
 * to return, while this subject's whole contract is which real filenames it accepts and which
 * it skips. a mocked readdir proves the filter, not the enumeration. so the real filesystem is
 * the point of these cases, and the file is classified to match rather than the boundary hidden.
 */
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

  given(
    '[case3] sockets exist under homeHash values the caller does not share',
    () => {
      const sessionId = getLoginSessionId({ pid: process.pid });

      // three foreign hashes, as a caller that mints temp HOMEs would leave behind
      const hashesForeign = ['a1b2c3d4', 'deadbeef', '00ff11ee'];

      beforeAll(() => {
        for (const hash of hashesForeign) {
          writeFileSync(
            join(testRuntimeDir, `keyrack.${sessionId}.${hash}.sock`),
            '',
          );
        }

        // one of them also carries an owner suffix
        writeFileSync(
          join(testRuntimeDir, `keyrack.${sessionId}.a1b2c3d4.mechanic.sock`),
          '',
        );

        // malformed tails that must be skipped
        writeFileSync(
          join(testRuntimeDir, `keyrack.${sessionId}.nothex!!.sock`),
          '',
        );
        writeFileSync(
          join(testRuntimeDir, `keyrack.${sessionId}.toolonghash.sock`),
          '',
        );
        // an owner that itself carries a dot; owner is interpolated unsanitized
        // into the filename, so this shape is expressible and must stay reachable
        writeFileSync(
          join(testRuntimeDir, `keyrack.${sessionId}.a1b2c3d4.one.two.sock`),
          '',
        );
      });

      when('[t0] getAllKeyrackDaemonSocketPaths is called', () => {
        then(
          'finds every homeHash in the session, not only the one it shares',
          () => {
            // .why = this is the whole of fix 2. HOME is caller-set, so a divergent
            // homeHash IS the leak; a prefix pinned to the pruner's own hash searches
            // the one shelf the leaked daemons are never filed under.
            const result = getAllKeyrackDaemonSocketPaths();

            for (const hash of hashesForeign) {
              const found = result.find((r) =>
                r.socketPath.endsWith(`keyrack.${sessionId}.${hash}.sock`),
              );
              expect(found).toBeDefined();
              expect(found!.owner).toBeNull();
            }
          },
        );

        then('parses the owner off a foreign-hash socket', () => {
          const result = getAllKeyrackDaemonSocketPaths();

          const found = result.find((r) =>
            r.socketPath.endsWith(
              `keyrack.${sessionId}.a1b2c3d4.mechanic.sock`,
            ),
          );
          expect(found).toBeDefined();
          expect(found!.owner).toBe('mechanic');
        });

        then('skips tails whose homeHash is malformed', () => {
          // .why = the widened prefix admits any tail, so shape is verified in the parse
          const result = getAllKeyrackDaemonSocketPaths();

          const paths = result.map((r) => r.socketPath);
          expect(paths.some((p) => p.includes('nothex!!'))).toBe(false);
          expect(paths.some((p) => p.includes('toolonghash'))).toBe(false);
        });

        then('keeps an owner that carries a dot', () => {
          // .why = owner is interpolated into the filename unsanitized, so a dotted
          // owner is expressible. to treat the extra dot as malformed would hide a
          // real daemon from prune — the exact failure mode fix 2 exists to end.
          const result = getAllKeyrackDaemonSocketPaths();

          const found = result.find((r) =>
            r.socketPath.endsWith(`keyrack.${sessionId}.a1b2c3d4.one.two.sock`),
          );
          expect(found).toBeDefined();
          expect(found!.owner).toBe('one.two');
        });

        then('still excludes a different login session', () => {
          // .why = the session pin stays deliberately. cross-session access is refused
          // elsewhere, and to reap another session's daemons would drop its cached keys.
          const result = getAllKeyrackDaemonSocketPaths();

          expect(
            result.some((r) => r.socketPath.includes('keyrack.999999.')),
          ).toBe(false);
        });
      });
    },
  );
});
