import { ConstraintError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { HOST_SPECIFIC_SHELL_TOKENS } from '@src/.test/assets/hostSpecificShellTokens';

import { asPtyDeviceRefusedError } from './asPtyDeviceRefusedError';

/**
 * .what = pin the payload of the device-refusal report — its class, its sentence, and
 *   the hint a human acts on
 *
 * 🚨 .why this file exists at all = the report shipped with NO unit test of its own. its
 *   peer `asCloneSocketOmissionReasonError` has one; this one leaned on the classifier's test
 *   (a different subject) plus one integration row (a different grain). a transformer
 *   whose whole output is a rendered sentence, with no test that reads that sentence, is
 *   a gap that reads as coverage because two adjacent files are green.
 *
 * ⚠️ .why the two termination rows are the point = node-pty terminates its messages
 *   inconsistently, and the extant integration row happened to use the ONE shape that
 *   hides a doubled period (`posix_openpt failed: EAGAIN`, with no period at its end).
 *   so the defect was invisible to every payload test that existed. these rows drive
 *   BOTH shapes, which is what makes the punctuation rule falsifiable rather than merely
 *   stated in a docblock.
 */
describe('asPtyDeviceRefusedError', () => {
  const HOST_TUPLE_EXAMPLE = 'linux-x64-glibc';

  given('[case1] a host that refused a pty device', () => {
    when('[t0] node-pty emits a PERIOD-terminated message', () => {
      // `pty.cc`'s forkpty/openpty path, verbatim — the half that ends in `.`
      const PTY_ERROR = 'forkpty(3) failed.';
      const error = asPtyDeviceRefusedError({
        error: new Error(PTY_ERROR),
        hostTuple: HOST_TUPLE_EXAMPLE,
      });

      then('it is a constraint — the caller acts next, not us', () => {
        // a kernel with no pty to give is not ours to repair, and a retry with the same
        // request fails identically (`rule.require.exit-code-semantics`)
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain(
          'the pty device could not be allocated',
        );
      });

      then('the sentence carries NO doubled punctuation', () => {
        // 🚨 the regression this file was born from. the hint interpolated the cause
        //   MID-SENTENCE and appended a period, so this exact input rendered
        //   `forkpty(3) failed..` on a human's terminal. it passed a unit snapshot of
        //   the payload, an integration row, and prose review — and was caught by the
        //   first render through the compiled binary
        //   (`rule.forbid.snapshot-visual-blemishes`).
        //
        //   the mutation that reddens this: append any character after the quoted cause
        expect(error.metadata.hint).not.toMatch(/\.\./);
      });

      then('the cause is carried inline, and it is LAST', () => {
        // inline, because `asCliErrorJson` strips the metadata tail from the human
        // frame — a datum that lives only there reaches no reader.
        // last, because terminal position is the only position that needs no further
        // character, and so is correct for both terminations
        expect(error.metadata.hint).toContain(PTY_ERROR);
        expect(error.metadata.hint.endsWith(`\`${PTY_ERROR}\``)).toEqual(true);
      });
    });

    when('[t1] node-pty emits an UNTERMINATED message', () => {
      // the darwin/posix_spawn path via `format_error`, which prints `<func> failed:
      // <strerror>` and appends no period. the shape the extant integration row used —
      // and the reason that row could not see the defect above
      const PTY_ERROR = 'posix_openpt failed: EAGAIN';
      const error = asPtyDeviceRefusedError({
        error: new Error(PTY_ERROR),
        hostTuple: HOST_TUPLE_EXAMPLE,
      });

      then(
        'this shape reads correctly TOO — one hint, both terminations',
        () => {
          // ⚠️ the pair is the assertion. a hint that reads well on one marker family
          //   and badly on the other is still a defect; only both rows together prove
          //   the interpolation is right by construction rather than by luck of fixture
          expect(error.metadata.hint).not.toMatch(/\.\./);
          expect(error.metadata.hint.endsWith(`\`${PTY_ERROR}\``)).toEqual(
            true,
          );
        },
      );
    });

    when('[t2] the thrown value is not an Error at all', () => {
      // node-pty throws Errors, but the guard upstream accepts `unknown`, so a
      // non-Error must degrade to its string form rather than render `[object Object]`
      // or crash the reporter that exists to report
      const error = asPtyDeviceRefusedError({
        error: 'a bare string throw',
        hostTuple: HOST_TUPLE_EXAMPLE,
      });

      then('the value still reaches the reader', () => {
        expect(error.metadata.hint).toContain('a bare string throw');
        expect(error.metadata.ptyError).toEqual('a bare string throw');
      });
    });
  });

  given('[case2] the hint must serve every platform this row fires on', () => {
    const error = asPtyDeviceRefusedError({
      error: new Error('forkpty(3) failed.'),
      hostTuple: HOST_TUPLE_EXAMPLE,
    });

    when('[t0] a human on any of linux, darwin, or win32 reads it', () => {
      then('it names a portable cure and no host-specific shell token', () => {
        // this report is reachable on all three families — a pty can be refused
        // anywhere — so a cure that runs on one and errors on the others sends the
        // reader from one dead end to a second
        // (`rule.forbid.host-specific-cures-in-hints`)
        expect(error.metadata.hint).toContain('--no-socket');
        for (const token of HOST_SPECIFIC_SHELL_TOKENS)
          expect(error.metadata.hint).not.toContain(token);
      });

      then('it does NOT blame the install, which is demonstrably fine', () => {
        // 🚨 the distinction from all three peer rows. the addon LOADED here, so a
        //   reinstall repairs naught — it is the confident-wrong-cure shape this whole
        //   wish exists to retire (`rule.require.errors-name-the-fix`)
        expect(error.metadata.hint).not.toContain('reinstall rhachet');
        expect(error.metadata.hint).not.toContain('pnpm rebuild');
        expect(error.metadata.hint).toContain('rather than a damaged install');
      });
    });
  });

  given('[case3] the report is read by a machine', () => {
    when('[t0] a consumer reads the metadata', () => {
      const error = asPtyDeviceRefusedError({
        error: new Error('forkpty(3) failed.'),
        hostTuple: HOST_TUPLE_EXAMPLE,
      });

      then('the host tuple is carried for a bug report', () => {
        // the tuple is what makes a filed report actionable — it says which platform,
        // arch, and libc the refusal happened on
        expect(error.metadata.hostTuple).toEqual(HOST_TUPLE_EXAMPLE);
      });

      then('the whole payload is locked (visual spot-check)', () => {
        expect({
          class: error.constructor.name,
          message: error.message,
          metadata: error.metadata,
        }).toMatchSnapshot();
      });
    });
  });
});
