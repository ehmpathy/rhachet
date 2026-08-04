import { given, then, when } from 'test-fns';

import { getKeyrackDaemonSocketPath } from '@src/domain.operations/keyrack/daemon/infra/getKeyrackDaemonSocketPath';

import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { killKeyrackDaemonForTests } from '../../../../../../../blackbox/.test/infra/killKeyrackDaemonForTests';
import { killKeyrackDaemon } from './killKeyrackDaemon';

/**
 * .what = a pid that names no live process
 * .why = these cases assert the kill path's file handling, not its signal delivery.
 *        a pid this high is unallocated on any normal linux, so process.kill raises
 *        ESRCH — the branch both implementations must allow and neither may swallow
 */
const PID_ABSENT = 4194303;

/**
 * .what = write a socket + pid pair at the daemon's canonical path
 * .why = both implementations derive their own path, so a fixture must land where
 *        they will look rather than where a test finds convenient
 */
const genDaemonFilesFound = (input: {
  pid: number;
}): {
  socketPath: string;
  pidPath: string;
} => {
  const socketPath = getKeyrackDaemonSocketPath({ owner: null });
  const pidPath = socketPath.replace(/\.sock$/, '.pid');
  writeFileSync(socketPath, '');
  writeFileSync(pidPath, String(input.pid));
  return { socketPath, pidPath };
};

describe('killKeyrackDaemon', () => {
  given('[case1] the blackbox replica of this kill operation', () => {
    // .why = blackbox tests import no src, so their daemon cleanup rebuilds this
    // whole operation by hand — the same error allowlists, the same signal-then-
    // unlink sequence. the PATH half of that replica already drifted a segment
    // behind once, and every blackbox cleanup became a silent no-op for months.
    // getKeyrackDaemonSocketPath.test.ts [case5] now clamps the path half; this
    // clamps the behavior half, so the same class of drift cannot recur one file
    // over from where it was just closed.
    // .note = the import direction is deliberate: src's test may read the blackbox
    // util, but the blackbox util must never read src

    const runtimeDirOriginal = process.env['XDG_RUNTIME_DIR'];
    let runtimeDirTest: string;

    beforeEach(() => {
      // a short /tmp path, not a nested temp dir
      // .why = a unix socket path is capped near 108 bytes, so a deep fixture dir
      // would push the daemon's own filename past the limit
      runtimeDirTest = mkdtempSync('/tmp/kkd-');
      process.env['XDG_RUNTIME_DIR'] = runtimeDirTest;
    });

    afterEach(() => {
      if (runtimeDirOriginal !== undefined) {
        process.env['XDG_RUNTIME_DIR'] = runtimeDirOriginal;
      } else {
        delete process.env['XDG_RUNTIME_DIR'];
      }
      rmSync(runtimeDirTest, { recursive: true, force: true });
    });

    when('[t0] a daemon pid file names a process that is gone', () => {
      then('both report the same verdict and leave no file behind', () => {
        // the real operation
        const found = genDaemonFilesFound({ pid: PID_ABSENT });
        const resultReal = killKeyrackDaemon({});
        const leftoverReal = {
          socket: existsSync(found.socketPath),
          pid: existsSync(found.pidPath),
        };

        // the replica, against an identical fixture
        genDaemonFilesFound({ pid: PID_ABSENT });
        const resultReplica = killKeyrackDaemonForTests({});
        const leftoverReplica = {
          socket: existsSync(found.socketPath),
          pid: existsSync(found.pidPath),
        };

        expect(resultReplica).toEqual(resultReal);
        expect(leftoverReplica).toEqual(leftoverReal);

        // and the verdict itself is the one both should reach
        // .why = parity alone would pass if both were equally broken; this pins
        // what "correct" is, so the pair cannot drift together
        expect(resultReal).toEqual({ killed: true, pid: PID_ABSENT });
        expect(leftoverReal).toEqual({ socket: false, pid: false });
      });
    });

    when('[t1] no daemon files are present at all', () => {
      then('both report the same absence', () => {
        const resultReal = killKeyrackDaemon({});
        const resultReplica = killKeyrackDaemonForTests({});

        expect(resultReplica).toEqual(resultReal);
        expect(resultReal).toEqual({ killed: false, pid: null });
      });
    });

    when('[t2] the pid file holds a value that is not a number', () => {
      then('both decline rather than signal a garbage pid', () => {
        const found = genDaemonFilesFound({ pid: PID_ABSENT });
        writeFileSync(found.pidPath, 'not-a-pid');
        const resultReal = killKeyrackDaemon({});

        writeFileSync(found.pidPath, 'not-a-pid');
        const resultReplica = killKeyrackDaemonForTests({});

        expect(resultReplica).toEqual(resultReal);
        expect(resultReal).toEqual({ killed: false, pid: null });
      });
    });
  });
});
