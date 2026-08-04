/**
 * .what = an INTEGRATION test, not a unit test
 * .why = the subject crosses two remote boundaries on every call, so
 * `rule.forbid.unit.remote-boundaries` bars it from a `.test.ts`:
 *   1. `getLoginSessionId` reads `/proc/self/sessionid` — a kernel interface
 *   2. `getHomeHash` calls `realpathSync` on `$HOME` — the filesystem
 *
 * .note = the alternative — inject both and fake them — would assert only what the
 * fakes were told to return, while this subject's whole contract is the SHAPE it
 * builds out of the real session id and the real home hash. a faked pair proves the
 * template, not the identity the daemon is actually keyed on. so the real boundaries
 * are the point of these cases, and the file is classified to match rather than the
 * boundary hidden.
 *
 * .note = this mirrors the same reclassification made for
 * `getAllKeyrackDaemonSocketPaths.integration.test.ts`, whose subject reads the same
 * kernel interface. the two are the read and write halves of one identity scheme and
 * belong at one scope.
 */
import { given, then, when } from 'test-fns';

import { mkdtempSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getKeyrackDaemonSocketPathForTests } from '../../../../../blackbox/.test/infra/getKeyrackDaemonSocketPathForTests';
import { getHomeHash } from './getHomeHash';
import { getKeyrackDaemonSocketPath } from './getKeyrackDaemonSocketPath';
import { getLoginSessionId } from './getLoginSessionId';

describe('getKeyrackDaemonSocketPath', () => {
  given('[case1] XDG_RUNTIME_DIR is set', () => {
    const runtimeDirOriginal = process.env['XDG_RUNTIME_DIR'];

    beforeEach(() => {
      process.env['XDG_RUNTIME_DIR'] = '/run/user/1000';
    });

    afterEach(() => {
      if (runtimeDirOriginal !== undefined) {
        process.env['XDG_RUNTIME_DIR'] = runtimeDirOriginal;
      } else {
        delete process.env['XDG_RUNTIME_DIR'];
      }
    });

    when('[t0] socket path is requested', () => {
      then('uses XDG_RUNTIME_DIR', () => {
        const path = getKeyrackDaemonSocketPath();
        expect(path).toContain('/run/user/1000');
      });

      then('includes keyrack prefix', () => {
        const path = getKeyrackDaemonSocketPath();
        expect(path).toContain('keyrack.');
      });

      then('includes .sock extension', () => {
        const path = getKeyrackDaemonSocketPath();
        expect(path).toMatch(/\.sock$/);
      });

      then('includes session id', () => {
        const sessionId = getLoginSessionId({ pid: process.pid });
        const path = getKeyrackDaemonSocketPath();
        expect(path).toContain(`.${sessionId}.`);
      });

      then('includes home hash', () => {
        const homeHash = getHomeHash();
        const path = getKeyrackDaemonSocketPath();
        expect(path).toContain(`.${homeHash}.`);
      });

      then('matches expected format', () => {
        const sessionId = getLoginSessionId({ pid: process.pid });
        const homeHash = getHomeHash();
        const path = getKeyrackDaemonSocketPath();
        expect(path).toEqual(
          `/run/user/1000/keyrack.${sessionId}.${homeHash}.sock`,
        );
      });
    });
  });

  given('[case2] owner is specified', () => {
    const runtimeDirOriginal = process.env['XDG_RUNTIME_DIR'];

    beforeEach(() => {
      process.env['XDG_RUNTIME_DIR'] = '/run/user/1000';
    });

    afterEach(() => {
      if (runtimeDirOriginal !== undefined) {
        process.env['XDG_RUNTIME_DIR'] = runtimeDirOriginal;
      } else {
        delete process.env['XDG_RUNTIME_DIR'];
      }
    });

    when('[t0] owner is mechanic', () => {
      then('includes owner in socket path', () => {
        const path = getKeyrackDaemonSocketPath({ owner: 'mechanic' });
        expect(path).toContain('.mechanic.sock');
      });

      then('matches expected format', () => {
        const sessionId = getLoginSessionId({ pid: process.pid });
        const homeHash = getHomeHash();
        const path = getKeyrackDaemonSocketPath({ owner: 'mechanic' });
        expect(path).toEqual(
          `/run/user/1000/keyrack.${sessionId}.${homeHash}.mechanic.sock`,
        );
      });
    });

    when('[t1] owner is foreman', () => {
      then('includes owner in socket path', () => {
        const path = getKeyrackDaemonSocketPath({ owner: 'foreman' });
        expect(path).toContain('.foreman.sock');
      });
    });

    when('[t2] owner is null', () => {
      then('uses default socket path (no owner suffix)', () => {
        const sessionId = getLoginSessionId({ pid: process.pid });
        const homeHash = getHomeHash();
        const path = getKeyrackDaemonSocketPath({ owner: null });
        expect(path).toEqual(
          `/run/user/1000/keyrack.${sessionId}.${homeHash}.sock`,
        );
      });
    });

    when("[t3] owner is 'default'", () => {
      then('uses same socket path as null (no owner suffix)', () => {
        const sessionId = getLoginSessionId({ pid: process.pid });
        const homeHash = getHomeHash();
        const pathDefault = getKeyrackDaemonSocketPath({ owner: 'default' });
        const pathNull = getKeyrackDaemonSocketPath({ owner: null });
        // 'default' is an alias for null — both mean "the default owner"
        expect(pathDefault).toEqual(pathNull);
        expect(pathDefault).toEqual(
          `/run/user/1000/keyrack.${sessionId}.${homeHash}.sock`,
        );
      });
    });
  });

  given('[case3] XDG_RUNTIME_DIR is unset', () => {
    const runtimeDirOriginal = process.env['XDG_RUNTIME_DIR'];

    beforeEach(() => {
      delete process.env['XDG_RUNTIME_DIR'];
    });

    afterEach(() => {
      if (runtimeDirOriginal !== undefined) {
        process.env['XDG_RUNTIME_DIR'] = runtimeDirOriginal;
      }
    });

    when('[t0] socket path is requested', () => {
      then('falls back to /run/user/$UID', () => {
        if (typeof process.getuid !== 'function') return; // skip on non-POSIX
        const uid = process.getuid();
        const path = getKeyrackDaemonSocketPath();
        expect(path).toContain(`/run/user/${uid}`);
      });

      then('still includes session id', () => {
        const sessionId = getLoginSessionId({ pid: process.pid });
        const path = getKeyrackDaemonSocketPath();
        expect(path).toContain(`.${sessionId}.`);
      });
    });
  });

  given('[case4] HOME is changed', () => {
    const runtimeDirOriginal = process.env['XDG_RUNTIME_DIR'];
    const homeOriginal = process.env['HOME'];

    beforeEach(() => {
      process.env['XDG_RUNTIME_DIR'] = '/run/user/1000';
    });

    afterEach(() => {
      process.env['HOME'] = homeOriginal;
      if (runtimeDirOriginal !== undefined) {
        process.env['XDG_RUNTIME_DIR'] = runtimeDirOriginal;
      } else {
        delete process.env['XDG_RUNTIME_DIR'];
      }
    });

    when('[t0] HOME is changed to different path', () => {
      then('produces different socket path', () => {
        const pathBefore = getKeyrackDaemonSocketPath();

        // change HOME to a different path
        const tempDir = mkdtempSync(join(tmpdir(), 'keyrack-test-'));
        process.env['HOME'] = tempDir;

        const pathAfter = getKeyrackDaemonSocketPath();
        expect(pathAfter).not.toEqual(pathBefore);

        // cleanup
        rmdirSync(tempDir);
      });

      then('same session id, different home hash', () => {
        const sessionId = getLoginSessionId({ pid: process.pid });
        const homeHashBefore = getHomeHash();
        const pathBefore = getKeyrackDaemonSocketPath();

        // change HOME to a different path
        const tempDir = mkdtempSync(join(tmpdir(), 'keyrack-test-'));
        process.env['HOME'] = tempDir;

        const homeHashAfter = getHomeHash();
        const pathAfter = getKeyrackDaemonSocketPath();

        // session id is same
        expect(pathBefore).toContain(`.${sessionId}.`);
        expect(pathAfter).toContain(`.${sessionId}.`);

        // home hash is different
        expect(homeHashAfter).not.toEqual(homeHashBefore);
        expect(pathBefore).toContain(`.${homeHashBefore}.`);
        expect(pathAfter).toContain(`.${homeHashAfter}.`);

        // cleanup
        rmdirSync(tempDir);
      });
    });
  });

  given('[case5] the blackbox replica of this path builder', () => {
    // .why = blackbox tests import no src, so their daemon cleanup rebuilds this
    // path by hand. that replica silently fell a whole segment behind — it omitted
    // homeHash — and every blackbox cleanup became a no-op no test could notice,
    // because a cleanup that reaps zero daemons looks exactly like one that had
    // zero to reap. this case is the conformance check that replica lacked.
    // .note = the import direction is deliberate: src's test may read the blackbox
    // util, but the blackbox util must never read src
    const runtimeDirOriginal = process.env['XDG_RUNTIME_DIR'];

    beforeEach(() => {
      process.env['XDG_RUNTIME_DIR'] = '/run/user/1000';
    });

    afterEach(() => {
      if (runtimeDirOriginal !== undefined) {
        process.env['XDG_RUNTIME_DIR'] = runtimeDirOriginal;
      } else {
        delete process.env['XDG_RUNTIME_DIR'];
      }
    });

    when('[t0] each owner shape is built by both', () => {
      then('the replica agrees with the real builder', () => {
        for (const owner of [null, 'default', 'mechanic', 'ehmpath.demo']) {
          expect(getKeyrackDaemonSocketPathForTests({ owner })).toEqual(
            getKeyrackDaemonSocketPath({ owner }),
          );
        }
      });
    });
  });
});
