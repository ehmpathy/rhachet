import { given, then, when } from 'test-fns';

import { isPtyDeviceRefusedError } from './isPtyDeviceRefusedError';

/**
 * .what = the classifier that decides WHOSE defect a pty-spawn throw is
 * .why = it is the sole gate between a caller-must-fix ConstraintError and a
 *   we-must-fix MalfunctionError, so a false positive silently reassigns a real
 *   bug of ours to the human (`rule.forbid.failhide`)
 */
describe('isPtyDeviceRefusedError', () => {
  given(
    '[case1] the shapes node-pty prints when the HOST refuses a device',
    () => {
      // every string here is quoted from node-pty's own `src/unix/pty.cc` /
      // `src/win/conpty.cc`, so the set is the emitter's, never a guess
      const REFUSALS = [
        'forkpty(3) failed.',
        'openpty(3) failed.',
        'Could not set master fd to nonblocking.',
        'Could not set slave fd to nonblocking.',
        'posix_openpt failed: Resource temporarily unavailable',
        'grantpt failed: Permission denied',
        'unlockpt failed: Invalid argument',
        'open slave pty failed: Too many open files',
        'tcsetattr failed: Inappropriate ioctl for device',
        'posix_spawn failed: No such file or directory',
        'posix_spawnattr_setflags failed: Invalid argument',
        'ioctl(TIOCPTYGNAME) failed: Bad file descriptor',
        'ioctl(TIOCSWINSZ) failed: Bad file descriptor',
        'Cannot launch conpty',
        'Failed to initialize conpty conin',
        'Failed to initialize conpty conout',
      ];

      when('[t0] each is classified', () => {
        then('every one reads as a device refusal', () => {
          for (const message of REFUSALS)
            expect({
              message,
              refused: isPtyDeviceRefusedError(new Error(message)),
            }).toEqual({ message, refused: true });
        });
      });
    },
  );

  given('[case2] the shapes that are OURS to repair, never the hosts', () => {
    // 🚨 this is the row the whole file exists for. each of these can escape the same
    //   guarded block, and each must reach a human as a MalfunctionError with its own
    //   stack — never as `pass --no-socket`
    const OURS = [
      // node-pty's own arity complaint = a defect in how WE call it
      'Usage: pty.fork(file, args, env, cwd, cols, rows, uid, gid, utf8, helperPath, onexit)',
      'args as a string is not supported on unix.',
      'name must be a string (not a number)',
      // the socket bind, which the guarded block also runs
      'listen EADDRINUSE: address already in use /tmp/clone.sock',
      'listen EACCES: permission denied /tmp/clone.sock',
      // a plain defect of ours
      "Cannot read properties of undefined (reading 'size')",
      'host.enterRawMode is not a function',
    ];

    when('[t0] each is classified', () => {
      then('not one reads as a device refusal', () => {
        for (const message of OURS)
          expect({
            message,
            refused: isPtyDeviceRefusedError(new Error(message)),
          }).toEqual({ message, refused: false });
      });
    });
  });

  given('[case3] a loose token that a bare marker WOULD have matched', () => {
    // the anchor discipline, held by assertion rather than by prose. each string
    // carries a word from the marker set in a shape its emitter never prints
    const NEAR_MISSES = [
      // `failed` alone
      'the socket server failed to start',
      // `ioctl(2) failed` comes from the RESIZE path, a different operation
      'ioctl(2) failed, EBADF',
      // names a pty function without the emitter's `failed:` shape
      'could not find forkpty on this platform',
      // names conpty without either conpty marker's shape
      'conpty is unsupported before windows 10 1809',
    ];

    when('[t0] each is classified', () => {
      then('not one matches', () => {
        for (const message of NEAR_MISSES)
          expect({
            message,
            refused: isPtyDeviceRefusedError(new Error(message)),
          }).toEqual({ message, refused: false });
      });
    });
  });

  given('[case4] a throw that is not an Error at all', () => {
    when('[t0] a bare string is classified', () => {
      then('it is not a device refusal', () => {
        // a non-Error carries no message we can read, so it cannot be allowlisted —
        // it must propagate as the unknown malfunction it is
        expect(isPtyDeviceRefusedError('openpty(3) failed.')).toEqual(false);
        expect(isPtyDeviceRefusedError(null)).toEqual(false);
        expect(isPtyDeviceRefusedError(undefined)).toEqual(false);
      });
    });
  });
});
