import { given, then, when } from 'test-fns';

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

      then('matches expected format', () => {
        const sessionId = getLoginSessionId({ pid: process.pid });
        const path = getKeyrackDaemonSocketPath();
        expect(path).toEqual(`/run/user/1000/keyrack.${sessionId}.sock`);
      });
    });
  });

  given('[case2] XDG_RUNTIME_DIR is unset', () => {
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
});
