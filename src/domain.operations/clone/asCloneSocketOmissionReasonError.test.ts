import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { HOST_SPECIFIC_SHELL_TOKENS } from '@src/.test/assets/hostSpecificShellTokens';

import { asCloneSocketOmissionReasonError } from './asCloneSocketOmissionReasonError';

/**
 * .what = pin every row of the omission-reason→class table
 * .why  = the class IS the message. an absent addon on a supported host, reported as a
 *   constraint, names the wrong party (rule.forbid.failhide)
 */
/**
 * .what = a fixed stand-in for the caller's `getRhachetRealpathFromProcess()` read
 *
 * .why  = the operation is pure, so this value is an INPUT and every row stays
 *   deterministic on any host
 *
 * .note = the shape is deliberate: the STALE store form (`<pnpm-root>/.pnpm/…`, never
 *   `<pnpm-root>/node_modules/.pnpm/…`), so the snapshot below shows the very trap the
 *   hint teaches a human to read for
 *
 * .note = the home segment is `__HOME__`, a MASK in this repo's own fixture-token idiom
 *   (`__SERIAL__`, `__TIMESTAMP__`), so no reader of the snapshot can mistake it for a
 *   real machine's path. it was `surfer` — synthetic too, but only the docblock said so,
 *   and a reviewer reads the SNAPSHOT, where no docblock travels. two lanes re-raised it
 *   on that basis, which is the evidence that a comment cannot carry this claim
 *
 * .note = only the HOME segment is masked, never the whole path. the acceptance tier
 *   strips this value to `/PATH_STRIPPED` because there it is incidental; here the
 *   stale-store SHAPE is the subject under test, so a full strip would delete the very
 *   trap the snapshot exists to show
 */
const RHACHET_REALPATH_EXAMPLE =
  '/home/__HOME__/.local/share/pnpm/.pnpm/rhachet@1.47.2/node_modules/rhachet/dist/index.js';

describe('asCloneSocketOmissionReasonError', () => {
  given(
    '[case1] an absent pty addon on a platform we ship a prebuild for',
    () => {
      when('[t0] the error is cast', () => {
        const error = asCloneSocketOmissionReasonError({
          socketOmissionReason: 'pty-absent',
          ptyPlatformSupport: 'supported',
          hostTuple: 'linux-x64',
          rhachetRealpath: RHACHET_REALPATH_EXAMPLE,
        });

        then(
          'it is a MALFUNCTION — a broken artifact is ours to repair',
          () => {
            expect(error).toBeInstanceOf(MalfunctionError);
            expect(error.message).toContain('reach socket is unavailable');
            expect(error.message).toContain('supported platform');
          },
        );

        then(
          'the fix it names is ours to apply, never a step the caller skipped',
          () => {
            const meta = error as unknown as {
              metadata?: {
                socketOmissionReason?: string;
                hostTuple?: string;
                hint?: string;
              };
            };
            expect(meta.metadata?.socketOmissionReason).toBe('pty-absent');
            expect(meta.metadata?.hostTuple).toBe('linux-x64');
            expect(meta.metadata?.hint).toContain('reinstall rhachet');
          },
        );

        then(
          'it also names the ONE condition under which that reinstall does NOT repair it',
          () => {
            // on a host where `rhx` execs from a store the package manager no longer
            // writes to, a bare "reinstall" is a dead end — it runs clean and changes
            // naught. so the hint must carry the escape
            // (rule.require.errors-name-the-fix)
            const meta = error as unknown as { metadata?: { hint?: string } };
            expect(meta.metadata?.hint).toContain('stale store');
          },
        );

        then(
          'it HANDS OVER the stale-store read rather than name a command to produce it',
          () => {
            // the escape needs one datum: where the rhachet that ran lives. we hold it,
            // so the report carries it. this row fires on all three platform families,
            // so no one command would serve them all (see HOST_SPECIFIC_SHELL_TOKENS)
            const meta = error as unknown as {
              metadata?: { rhachetRealpath?: string; hint?: string };
            };
            expect(meta.metadata?.rhachetRealpath).toBe(
              RHACHET_REALPATH_EXAMPLE,
            );

            // 🚨 the hint must carry the VALUE inline — never merely POINT at the field.
            //   `asCliErrorJson`'s `getUndecoratedMessage` strips the serialized-metadata
            //   tail, and its `CliErrorJson` shape carries no `rhachetRealpath` key — so a
            //   pointer reaches neither the `✋` human frame nor the `--output json`
            //   payload. a hint that carries its own datum is correct in EVERY render
            expect(meta.metadata?.hint).toContain(RHACHET_REALPATH_EXAMPLE);

            // and it reaches `.message` (the decorated form a log or an unhandled throw
            // shows), which holds it twice — in the serialized metadata, and in the hint
            expect(error.message).toContain(RHACHET_REALPATH_EXAMPLE);
          },
        );

        then('the hint names no host-specific shell command', () => {
          // ⚠️ see HOST_SPECIFIC_SHELL_TOKENS for why each token is on the list, and
          //   why `ldd` is not. the mutation that reddens this: splice a
          //   `(or run \`readlink -f $(which rhx)\`)` clause back into the hint
          const meta = error as unknown as { metadata?: { hint?: string } };

          // presence BEFORE absence: a vanished hint satisfies every `.not.toContain`
          // below, so the negatives alone would read a LOST hint as a portable one
          expect(typeof meta.metadata?.hint).toEqual('string');

          HOST_SPECIFIC_SHELL_TOKENS.forEach((token) =>
            expect(meta.metadata?.hint).not.toContain(token),
          );
        });
      });
    },
  );

  given(
    '[case1b] the same row, on a host whose realpath could NOT be read',
    () => {
      when('[t0] the error is cast with a null realpath', () => {
        const error = asCloneSocketOmissionReasonError({
          socketOmissionReason: 'pty-absent',
          ptyPlatformSupport: 'supported',
          hostTuple: 'linux-x64',
          rhachetRealpath: null,
        });

        then('it is STILL the classified MalfunctionError', () => {
          // 🚨 the reason the reader is nullable rather than left to throw.
          //   `getRhachetRealpathFromProcess` is read INLINE while this error is built,
          //   so a throw there yields no classified error at all — a bare fs error
          //   propagates and the human reads a stack trace. an unreadable DIAGNOSTIC
          //   must never cost the caller its REPORT
          expect(error).toBeInstanceOf(MalfunctionError);
          expect(error.message).toContain('supported platform');
        });

        then('the cure that WORKS is still named', () => {
          // the reinstall does not depend on the realpath, so it must survive the
          // degrade rather than be dropped with the clause that does
          const meta = error as unknown as { metadata?: { hint?: string } };
          expect(meta.metadata?.hint).toContain('reinstall rhachet');
        });

        then('the absence is STATED, never fabricated and never silent', () => {
          // rule.forbid.failhide, at the render grain. neither a sentinel string
          // (`loaded from unknown` reads as a path to go hunt for) nor a silent drop
          // of the clause — the hint states outright that the read failed
          const meta = error as unknown as { metadata?: { hint?: string } };
          expect(meta.metadata?.hint).toContain('could not read');
          expect(meta.metadata?.hint).not.toContain('loaded from null');
          expect(meta.metadata?.hint).not.toContain('undefined');
        });

        then('it names no host-specific shell command either', () => {
          // the degraded branch is a SECOND hint string, so a second place the
          // portability defect could return (see HOST_SPECIFIC_SHELL_TOKENS)
          const meta = error as unknown as { metadata?: { hint?: string } };
          expect(typeof meta.metadata?.hint).toEqual('string');
          HOST_SPECIFIC_SHELL_TOKENS.forEach((token) =>
            expect(meta.metadata?.hint).not.toContain(token),
          );
        });

        then('the degraded words a human reads match the snapshot', () => {
          const meta = error as unknown as { metadata?: { hint?: string } };
          expect({
            class: error.constructor.name,
            message: error.message,
            hint: meta.metadata?.hint,
          }).toMatchSnapshot();
        });
      });
    },
  );

  given(
    '[case2] an absent pty addon on a platform upstream ships no prebuild for',
    () => {
      when('[t0] the error is cast', () => {
        const error = asCloneSocketOmissionReasonError({
          socketOmissionReason: 'pty-absent',
          ptyPlatformSupport: 'unsupported',
          hostTuple: 'freebsd-x64',
          rhachetRealpath: RHACHET_REALPATH_EXAMPLE,
        });

        then(
          'it is a CONSTRAINT — no binary exists, so only the caller can move',
          () => {
            expect(error).toBeInstanceOf(ConstraintError);
            expect(error.message).toContain(
              'no prebuilt addon for this platform',
            );
          },
        );

        then('the only honest move — the opt-out — is the one it names', () => {
          const meta = error as unknown as { metadata?: { hint?: string } };
          expect(meta.metadata?.hint).toContain('--no-socket');
        });
      });
    },
  );

  given('[case3] a host that cannot open a unix socket at all', () => {
    when('[t0] the error is cast on a SUPPORTED platform', () => {
      const error = asCloneSocketOmissionReasonError({
        socketOmissionReason: 'host-incapable',
        ptyPlatformSupport: 'supported',
        hostTuple: 'win32-x64',
        rhachetRealpath: RHACHET_REALPATH_EXAMPLE,
      });

      then(
        'it is a CONSTRAINT — the addon is fine; the HOST is the limit',
        () => {
          expect(error).toBeInstanceOf(ConstraintError);
          expect(error.message).toContain('cannot open a unix socket');
          const meta = error as unknown as {
            metadata?: { socketOmissionReason?: string; hint?: string };
          };
          expect(meta.metadata?.socketOmissionReason).toBe('host-incapable');
          expect(meta.metadata?.hint).toContain('--no-socket');
        },
      );
    });

    when('[t0] the error is cast on an UNSUPPORTED platform', () => {
      const error = asCloneSocketOmissionReasonError({
        socketOmissionReason: 'host-incapable',
        ptyPlatformSupport: 'unsupported',
        hostTuple: 'freebsd-x64',
        rhachetRealpath: RHACHET_REALPATH_EXAMPLE,
      });

      then(
        'it is a CONSTRAINT too — platform support does not decide this row',
        () => {
          expect(error).toBeInstanceOf(ConstraintError);
          expect(error.message).toContain('cannot open a unix socket');
        },
      );
    });

    when('[t0] the error is cast on an UNKNOWN platform', () => {
      const error = asCloneSocketOmissionReasonError({
        socketOmissionReason: 'host-incapable',
        ptyPlatformSupport: 'unknown',
        hostTuple: 'linux-x64',
        rhachetRealpath: RHACHET_REALPATH_EXAMPLE,
      });

      then('it is the host-incapable CONSTRAINT, never the libc one', () => {
        // an unreadable libc is irrelevant when the host cannot open a socket at all —
        // the addon is not even reached
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('cannot open a unix socket');
        expect(error.message).not.toContain('libc');
      });
    });
  });

  given(
    '[case4] an absent pty addon on a host whose libc could not be read',
    () => {
      when('[t0] the error is cast', () => {
        const error = asCloneSocketOmissionReasonError({
          socketOmissionReason: 'pty-absent',
          ptyPlatformSupport: 'unknown',
          hostTuple: 'linux-x64',
          rhachetRealpath: RHACHET_REALPATH_EXAMPLE,
        });

        then(
          'it names the ambiguity outright rather than guess a party',
          () => {
            // the two rows above carry OPPOSITE cures, and on this host we cannot tell
            // which applies. to pick one would state a guess as fact
            expect(error.message).toContain('libc could not be read');
          },
        );

        then(
          'it names a DIAGNOSTIC that works, never a cure that might not',
          () => {
            // `ldd --version` settles it in one command, and each of its two answers
            // routes to the row it belongs to — a fix that works on BOTH branches
            // (rule.require.errors-name-the-fix)
            const meta = error as unknown as { metadata?: { hint?: string } };
            expect(meta.metadata?.hint).toContain('ldd --version');
            expect(meta.metadata?.hint).toContain('reinstall rhachet');
            expect(meta.metadata?.hint).toContain('--no-socket');
          },
        );

        then('it does NOT claim the install is damaged', () => {
          // the supported row states "this install is damaged" as fact. told to a musl
          // human that is false — upstream ships them no binary at all. this row must
          // not borrow that claim
          expect(error.message).not.toContain('supported platform');
          const meta = error as unknown as { metadata?: { hint?: string } };
          expect(meta.metadata?.hint).not.toContain('this install is damaged');
        });

        then(
          "it is a CONSTRAINT — the next move is the caller's, though the defect may be ours",
          () => {
            // classed for WHO ACTS NEXT (the caller runs one command), never as a
            // verdict on whose defect it is
            expect(error).toBeInstanceOf(ConstraintError);
          },
        );
      });
    },
  );

  given(
    '[case5] an omission reason no row handles — the shape a FUTURE union member would take',
    () => {
      when('[t0] the error is cast', () => {
        // .note = the `as` cast is the only way to reach this row:
        //   `Exclude<CloneSocketOmissionReason, null>` seals the union, so no caller can
        //   produce this value today. documented per rule.forbid.as-cast; it goes the
        //   day a third kind is real
        const error = asCloneSocketOmissionReasonError({
          socketOmissionReason: 'pty-crash' as 'host-incapable',
          ptyPlatformSupport: 'supported',
          hostTuple: 'linux-x64',
          rhachetRealpath: RHACHET_REALPATH_EXAMPLE,
        });

        then(
          'it is a MALFUNCTION — a kind we failed to classify is OUR defect, never the caller’s',
          () => {
            expect(error).toBeInstanceOf(MalfunctionError);
            expect(error.message).toContain('could not be classified');
          },
        );

        then(
          'it never borrows the host-incapable cure, which would name the wrong cause',
          () => {
            // the mutation that reddens this: let an unhandled kind fall into the
            // host-incapable row, which reports it as a POSIX problem
            const meta = error as unknown as { metadata?: { hint?: string } };
            expect(meta.metadata?.hint).toBeDefined();
            expect(meta.metadata?.hint).not.toContain('POSIX host');
          },
        );

        then('it carries the unhandled kind, so a report names it', () => {
          const meta = error as unknown as {
            metadata?: { socketOmissionReason?: string };
          };
          expect(meta.metadata?.socketOmissionReason).toBe('pty-crash');
        });
      });
    },
  );

  given('[case6] any omission reason at all', () => {
    when('[t0] every row is cast', () => {
      const errors = [
        asCloneSocketOmissionReasonError({
          socketOmissionReason: 'pty-absent',
          ptyPlatformSupport: 'supported',
          hostTuple: 'linux-x64',
          rhachetRealpath: RHACHET_REALPATH_EXAMPLE,
        }),
        asCloneSocketOmissionReasonError({
          socketOmissionReason: 'pty-absent',
          ptyPlatformSupport: 'unsupported',
          hostTuple: 'freebsd-x64',
          rhachetRealpath: RHACHET_REALPATH_EXAMPLE,
        }),
        asCloneSocketOmissionReasonError({
          socketOmissionReason: 'pty-absent',
          ptyPlatformSupport: 'unknown',
          hostTuple: 'linux-x64',
          rhachetRealpath: RHACHET_REALPATH_EXAMPLE,
        }),
        asCloneSocketOmissionReasonError({
          socketOmissionReason: 'host-incapable',
          ptyPlatformSupport: 'supported',
          hostTuple: 'win32-x64',
          rhachetRealpath: RHACHET_REALPATH_EXAMPLE,
        }),
      ];

      then('the dead-end cure is named by none of them', () => {
        // `pnpm rebuild` has no --global flag, so it can never repair a global
        // install — it must never appear in a hint
        errors.forEach((error) => {
          const meta = error as unknown as { metadata?: { hint?: string } };

          // presence BEFORE content: a vanished hint satisfies any `.not.toContain`,
          // so the negative check alone would read a LOST hint as a cured one
          expect(typeof meta.metadata?.hint).toEqual('string');
          expect(meta.metadata?.hint?.length).toBeGreaterThan(0);

          expect(meta.metadata?.hint).not.toContain('pnpm rebuild');
        });
      });

      then('no row names a host-specific shell command', () => {
        // .why = [case1]'s guard reads ONE row. this reads all four, so a host-specific
        //   cure cannot enter a row the targeted guard does not look at. the mutation
        //   that reddens this and NOT [case1]: add a `readlink` clause to the
        //   UNSUPPORTED row's hint
        errors.forEach((error) => {
          const meta = error as unknown as { metadata?: { hint?: string } };
          expect(typeof meta.metadata?.hint).toEqual('string');
          HOST_SPECIFIC_SHELL_TOKENS.forEach((token) =>
            expect(meta.metadata?.hint).not.toContain(token),
          );
        });
      });

      then('each names the host TUPLE it fired on, at the right grain', () => {
        errors.forEach((error) => {
          const meta = error as unknown as {
            metadata?: { hostTuple?: string };
          };
          expect(meta.metadata?.hostTuple).toBeDefined();

          // .why = presence alone is not the property. the field carries
          //   `platform-arch`, and the kin `getPtyPlatformSupport` takes a BARE
          //   platform — so the guard is on a tuple collapsed to one grain, which
          //   `toBeDefined` sails past
          expect(meta.metadata?.hostTuple).toContain('-');
        });
      });

      then('the WORDS a human reads match the snapshot', () => {
        // .why = the asserts above pin one decisive phrase per row; this pins the FULL
        //   text of every row at once — the class, the sentence, and the cure
        //   (rule.require.snapshots). a HelpfulError's `.message` carries its glyph and
        //   class prefix, so this also pins 💥-vs-✋ — the read of "whose defect is
        //   this", and the one a row swap would silently invert
        //
        // .note = ⚠️ the committed `.snap` shows BARE double quotes in `hint` and
        //   ESCAPED ones in `message`. both are correct: `message` embeds the metadata
        //   json-serialized, so JSON.stringify put the `\"` there. do not hand-edit
        //   either to match the other
        const rendered = errors.map((error) => {
          const meta = error as unknown as { metadata?: { hint?: string } };
          return {
            class: error.constructor.name,
            message: error.message,
            hint: meta.metadata?.hint,
          };
        });
        expect(rendered).toMatchSnapshot();
      });
    });
  });
});
