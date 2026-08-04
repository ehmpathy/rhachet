import { given, then, when } from 'test-fns';

import { asKeyrackDaemonPidPath } from '@src/domain.operations/keyrack/daemon/infra/asKeyrackDaemonPidPath';

describe('asKeyrackDaemonPidPath', () => {
  /**
   * [uc1] the pid path is derived from the socket path by one rule, in one place
   *
   * .why = the .sock and .pid files are minted together and unlinked together. before
   * this transformer the rule was re-stated as a bare `.replace(/\.sock$/, '.pid')` at
   * each site that needed the companion path, and a hand-copied rule is one that drifts
   * — which is exactly how killKeyrackDaemonForTests came to build a path shape the
   * path builder had not produced in months
   */
  given('[case1] a socket path in the shape the path builder emits', () => {
    when('[t0] the default owner (no owner segment)', () => {
      then('the .sock suffix becomes .pid and all else is untouched', () => {
        expect(
          asKeyrackDaemonPidPath({
            socketPath: '/run/user/1000/keyrack.4.ffb3e5bd.sock',
          }),
        ).toEqual('/run/user/1000/keyrack.4.ffb3e5bd.pid');
      });
    });

    when('[t1] an owner-suffixed socket', () => {
      then('the owner segment survives the derivation', () => {
        expect(
          asKeyrackDaemonPidPath({
            socketPath: '/run/user/1000/keyrack.4.ffb3e5bd.mechanic.sock',
          }),
        ).toEqual('/run/user/1000/keyrack.4.ffb3e5bd.mechanic.pid');
      });
    });
  });

  /**
   * [uc2] only a TERMINAL .sock is the suffix — the anchor carries real weight
   *
   * .why = the regex is anchored with `$` on purpose. a daemon runtime dir is
   * caller-supplied (XDG_RUNTIME_DIR, or a test's mkdtemp), so a directory or a
   * home-hash could contain the literal text ".sock". an unanchored replace would
   * rewrite that interior text and derive a pid path that names a file no daemon
   * ever wrote — which reads to every caller as "no daemon here"
   */
  given('[case2] a path whose interior contains the text .sock', () => {
    when('[t0] a directory segment holds it', () => {
      then('only the terminal suffix is rewritten', () => {
        expect(
          asKeyrackDaemonPidPath({
            socketPath: '/tmp/my.sock.dir/keyrack.4.aaaa0000.sock',
          }),
        ).toEqual('/tmp/my.sock.dir/keyrack.4.aaaa0000.pid');
      });
    });
  });

  /**
   * [uc3] a path that does not end in .sock is returned unchanged
   *
   * .note = this is the transformer's honest behavior, asserted rather than assumed.
   * it does not throw, because its one guarantee to callers is "give me the companion
   * path for a socket path" and every call site derives its input from
   * getKeyrackDaemonSocketPath, which always ends in .sock. an input that does not is a
   * caller defect this transformer has no authority to diagnose — so it neither repairs
   * it nor hides it; it leaves the value visibly wrong at its own boundary
   */
  given('[case3] a path with no .sock suffix', () => {
    when('[t0] the value is already a pid path', () => {
      then('it passes through unchanged', () => {
        expect(
          asKeyrackDaemonPidPath({
            socketPath: '/run/user/1000/keyrack.4.ffb3e5bd.pid',
          }),
        ).toEqual('/run/user/1000/keyrack.4.ffb3e5bd.pid');
      });
    });
  });
});
