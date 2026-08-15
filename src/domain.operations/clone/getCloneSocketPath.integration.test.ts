import { ConstraintError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { getCloneSocketPath } from './getCloneSocketPath';

describe('getCloneSocketPath', () => {
  given(
    'a POSIX host (the ci/dev host is linux, so process.getuid is present)',
    () => {
      // fail loud if the host is somehow non-POSIX — this suite proves the POSIX branch
      if (typeof process.getuid !== 'function')
        throw new ConstraintError(
          'getCloneSocketPath POSIX suite must run on a POSIX host',
          { hint: 'run on linux/macos where process.getuid exists' },
        );

      when('a serial is derived to a socket path', () => {
        then(
          'the path is under a runtime dir and names the serial + a home hash',
          () => {
            const path = getCloneSocketPath({ serial: '7f3a-serial' });
            expect(path).not.toBeNull();
            expect(path).toContain('clone.7f3a-serial.');
            expect(path).toContain('.sock');
          },
        );

        then(
          'the whole path stays well under the ~104-char unix-socket limit',
          () => {
            const path = getCloneSocketPath({ serial: 'a'.repeat(36) });
            expect(path).not.toBeNull();
            expect((path as string).length).toBeLessThan(104);
          },
        );

        then('it honors an explicit XDG_RUNTIME_DIR', () => {
          const before = process.env['XDG_RUNTIME_DIR'];
          process.env['XDG_RUNTIME_DIR'] = '/run/user/1000';
          try {
            const path = getCloneSocketPath({ serial: 'xdg' });
            expect(path).toContain('/run/user/1000/clone.xdg.');
          } finally {
            if (before === undefined) delete process.env['XDG_RUNTIME_DIR'];
            else process.env['XDG_RUNTIME_DIR'] = before;
          }
        });
      });
    },
  );
});
