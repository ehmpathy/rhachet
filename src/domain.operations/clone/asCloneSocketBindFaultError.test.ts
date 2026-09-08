import { MalfunctionError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { HOST_SPECIFIC_SHELL_TOKENS } from '@src/.test/assets/hostSpecificShellTokens';

import { asCloneSocketBindFaultError } from './asCloneSocketBindFaultError';

/**
 * .what = pin the payload of the bind-fault report — its class, its sentence, and the
 *   hint a human acts on
 *
 * 🚨 .why the CLASS is the assertion that matters most = this is the third member of a
 *   set whose other two are constraints, and the temptation is to make it a third. it is
 *   not: `computeCloneSocketOmissionReason` already cleared a socket for this enroll, so a bind
 *   that then faults says OUR gate was wrong. to class it a constraint would tell a human
 *   "you can fix this" for a defect they cannot reach — loud about the wrong party, which
 *   `rule.forbid.failhide` names as a hide even when it is loud.
 */
describe('asCloneSocketBindFaultError', () => {
  const HOST_TUPLE_EXAMPLE = 'linux-x64-glibc';

  /** .what = mint the shape node itself mints, so the rows read the real field set */
  const genErrnoError = (input: {
    message: string;
    code: string;
    syscall: string;
  }): Error => {
    const error = new Error(input.message) as NodeJS.ErrnoException;
    error.code = input.code;
    error.syscall = input.syscall;
    return error;
  };

  given(
    '[case1] a bind that faulted after the gate had cleared a socket',
    () => {
      const SOCKET_ERROR =
        'listen EADDRINUSE: address already in use /run/x.sock';
      const error = asCloneSocketBindFaultError({
        error: genErrnoError({
          message: SOCKET_ERROR,
          code: 'EADDRINUSE',
          syscall: 'listen',
        }),
        hostTuple: HOST_TUPLE_EXAMPLE,
      });

      when('[t0] a human reads the report', () => {
        then('it is a MALFUNCTION — we act next, not the caller', () => {
          expect(error).toBeInstanceOf(MalfunctionError);
          expect(error.message).toContain('its socket could not be bound');
        });

        then('it says outright that the defect is OURS', () => {
          // 🚨 the class alone sets the exit code; the SENTENCE is what a human reads. so
          //   the party must be named in words too, or a reader sees only a cure that
          //   looks like theirs to apply and concludes they misused the tool
          expect(error.metadata.hint).toContain('a defect in rhachet');
          expect(error.metadata.hint).toContain('report it');
        });

        then(
          '--no-socket is offered as a way FORWARD, never as the fix',
          () => {
            // the opt-out unblocks the human today, and it repairs naught. a hint that
            // named it as the cure would be the confident-wrong-cure shape this whole wish
            // exists to retire (`rule.require.errors-name-the-fix`)
            expect(error.metadata.hint).toContain('--no-socket');
            expect(error.metadata.hint).toContain('meanwhile');
          },
        );

        then(
          'it does NOT blame the install, which is demonstrably fine',
          () => {
            // the addon LOADED and the device was GRANTED by this point, so a reinstall
            // repairs it not — the same distinction `asPtyDeviceRefusedError` draws
            expect(error.metadata.hint).not.toContain('reinstall rhachet');
            expect(error.metadata.hint).not.toContain('pnpm rebuild');
          },
        );

        then('the cause is carried inline, and it is LAST', () => {
          // inline, because `asCliErrorJson` strips the metadata tail from the human
          // frame — a datum that lives only there reaches no reader
          expect(error.metadata.hint).toContain(SOCKET_ERROR);
          expect(error.metadata.hint.endsWith(`\`${SOCKET_ERROR}\``)).toEqual(
            true,
          );
        });

        then('the sentence carries NO doubled punctuation', () => {
          expect(error.metadata.hint).not.toMatch(/\.\./);
        });

        then(
          'it names a portable cure and no host-specific shell token',
          () => {
            // a bind can fault on linux, darwin, AND win32, so a cure that runs on one and
            // errors on the others sends the reader from one dead end to a second
            // (`rule.forbid.host-specific-cures-in-hints`)
            for (const token of HOST_SPECIFIC_SHELL_TOKENS)
              expect(error.metadata.hint).not.toContain(token);
          },
        );
      });

      when('[t1] a machine reads the metadata', () => {
        then(
          'the errno and the syscall are both carried for a bug report',
          () => {
            // the pair is what makes a filed report actionable — the errno says WHAT the
            // kernel refused, the syscall says at WHICH of the gate's three calls
            expect(error.metadata.socketErrno).toEqual('EADDRINUSE');
            expect(error.metadata.socketSyscall).toEqual('listen');
            expect(error.metadata.hostTuple).toEqual(HOST_TUPLE_EXAMPLE);
          },
        );

        then('the whole payload is locked (visual spot-check)', () => {
          expect({
            class: error.constructor.name,
            message: error.message,
            metadata: error.metadata,
          }).toMatchSnapshot();
        });
      });
    },
  );

  given('[case2] a thrown value that carries no errno fields at all', () => {
    when('[t0] the throw was a bare string', () => {
      const error = asCloneSocketBindFaultError({
        error: 'a bare string throw',
        hostTuple: HOST_TUPLE_EXAMPLE,
      });

      then('the value still reaches the reader, with stated ignorance', () => {
        // 🚨 `null`, never a fabricated errno. a report that invents a code sends the
        //   next reader to search for a fault that never happened
        expect(error.metadata.socketError).toEqual('a bare string throw');
        expect(error.metadata.socketErrno).toEqual(null);
        expect(error.metadata.socketSyscall).toEqual(null);
        expect(error.metadata.hint).toContain('a bare string throw');
      });
    });
  });
});
