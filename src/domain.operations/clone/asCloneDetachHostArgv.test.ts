import { given, then, when } from 'test-fns';

import { asCloneDetachHostArgv } from './asCloneDetachHostArgv';

/**
 * .what = unit coverage for the argv a detached enroll host is re-execed with
 * .why = the motive is the ONE input a host cannot re-derive — the caller drained the
 *   pipe and the host has no stdin. every way the swap can miss records an enroll with
 *   no stated reason, which is invisible until someone asks why a clone exists
 */
describe('asCloneDetachHostArgv', () => {
  given('[case1] a `--reason @stdin` in the space form', () => {
    const argv = ['enroll', 'claude', '--reason', '@stdin'];

    when('[t0] the resolved motive is substituted', () => {
      then('the host is handed the text, never the flag value', () => {
        expect(
          asCloneDetachHostArgv({ argv, reason: 'nightly cron refresh' }),
        ).toEqual(['enroll', 'claude', '--reason', 'nightly cron refresh']);
      });
    });
  });

  given('[case2] a `--reason=@stdin` in the equals form', () => {
    const argv = ['enroll', 'claude', '--reason=@stdin'];

    when('[t0] the resolved motive is substituted', () => {
      // commander accepts both spellings, so a swap that handled one would lose the
      // motive for every caller who typed the other
      then('the equals form is rewritten too', () => {
        expect(asCloneDetachHostArgv({ argv, reason: 'because' })).toEqual([
          'enroll',
          'claude',
          '--reason=because',
        ]);
      });
    });
  });

  given('[case3] a multi-line motive off a pipe', () => {
    const argv = ['enroll', 'claude', '--reason', '@stdin'];

    when('[t0] it is substituted', () => {
      // argv elements are passed as an ARRAY (no shell), so a newline needs no escape
      // and must survive verbatim — the audit stores what the human piped in
      then('the newline survives into the argv element', () => {
        expect(
          asCloneDetachHostArgv({ argv, reason: 'line one\nline two' }),
        ).toEqual(['enroll', 'claude', '--reason', 'line one\nline two']);
      });
    });
  });

  given('[case4] a literal `--reason "<text>"`, never @stdin', () => {
    const argv = ['enroll', 'claude', '--reason', 'a stated motive'];

    when('[t0] the argv is built', () => {
      then('it replays verbatim — there is no pipe to recover', () => {
        expect(
          asCloneDetachHostArgv({ argv, reason: 'a stated motive' }),
        ).toEqual(argv);
      });
    });
  });

  given('[case5] a bare `@stdin` that is NOT the reason flag value', () => {
    // 🔴 the swap is keyed to the PRECEDING element, never to the token alone — a
    //   `--as @stdin` slug (or any future flag) must not be rewritten into the motive
    const argv = ['enroll', 'claude', '--as', '@stdin'];

    when('[t0] the argv is built', () => {
      then('the unrelated value is left alone', () => {
        expect(asCloneDetachHostArgv({ argv, reason: 'a motive' })).toEqual(
          argv,
        );
      });
    });
  });

  given('[case6] no motive at all', () => {
    const argv = ['enroll', 'claude'];

    when('[t0] the argv is built', () => {
      then('it replays verbatim', () => {
        expect(asCloneDetachHostArgv({ argv, reason: null })).toEqual(argv);
      });
    });
  });

  given('[case7] an EMPTY motive read off the pipe', () => {
    // an empty string is a resolved motive, distinct from null — the host must be
    // handed it rather than left to re-read a pipe that is already drained
    const argv = ['enroll', 'claude', '--reason', '@stdin'];

    when('[t0] the argv is built', () => {
      then('the flag value is emptied, never left as `@stdin`', () => {
        expect(asCloneDetachHostArgv({ argv, reason: '' })).toEqual([
          'enroll',
          'claude',
          '--reason',
          '',
        ]);
      });
    });
  });
});
