import { given, then, when } from 'test-fns';

import { CLONE_SOCKET_BIND_TIMEOUT_MARK } from './constants.bind';
import { isCloneSocketBindFaultError } from './isCloneSocketBindFaultError';

/**
 * .what = pin which throws out of the pty spawn block are the SOCKET GATE's, and which
 *   belong to some other party
 *
 * 🚨 .why it is the sharp half = this predicate decides whether a fault is re-reported as
 *   ours or propagates raw. a set too WIDE relabels an unrelated defect as a socket bind
 *   and names a cure that repairs it not; a set too NARROW leaves a real bind fault to
 *   reach a human as a bare node stack — the exact condition the classifier was added to
 *   retire (`rule.forbid.failhide`).
 *
 * ⚠️ .why it reads `syscall` rather than the message = its peer `isPtyDeviceRefusedError`
 *   must match prose, because node-pty prints prose. node does not: it stamps every errno
 *   exception with the call that failed. so the negative rows below are the point — an
 *   error whose MESSAGE contains every bind word and whose `syscall` is absent must not
 *   match, and that is only true of a structural read.
 */
describe('isCloneSocketBindFaultError', () => {
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

  given('a fault out of the socket gate', () => {
    when('[t0] the bind faulted on a path already in use', () => {
      then('it is recognized', () => {
        expect(
          isCloneSocketBindFaultError(
            genErrnoError({
              message: 'listen EADDRINUSE: address already in use /run/x.sock',
              code: 'EADDRINUSE',
              syscall: 'listen',
            }),
          ),
        ).toEqual(true);
      });
    });

    when('[t1] the bind faulted on an absent parent dir', () => {
      then('it is recognized', () => {
        expect(
          isCloneSocketBindFaultError(
            genErrnoError({
              message: 'bind ENOENT: no such file or directory',
              code: 'ENOENT',
              syscall: 'bind',
            }),
          ),
        ).toEqual(true);
      });
    });

    when('[t2] the socket bound but its LOCKDOWN faulted', () => {
      then('it is recognized too — one gate, one owner', () => {
        // 🚨 `genCloneSocketServer` closes the server and re-emits this down the same
        //   `'error'` channel, precisely so a bound-but-unlocked socket is never
        //   observable. that re-emit is worthless if the classifier one layer up drops
        //   the fault on the floor, so this row is what keeps the two halves joined
        expect(
          isCloneSocketBindFaultError(
            genErrnoError({
              message:
                "chmod EPERM: operation not permitted, chmod '/run/x.sock'",
              code: 'EPERM',
              syscall: 'chmod',
            }),
          ),
        ).toEqual(true);
      });
    });
  });

  given('a throw from ANY other party in the same guarded block', () => {
    when('[t0] node-pty refused the device', () => {
      then('it is NOT a bind fault — the pty allowlist owns it', () => {
        // the two allowlists must stay disjoint. were this true, a caller-must-fix
        // constraint would be reported as our malfunction, and the human would be told
        // to file a bug for a host condition they can work around today
        expect(
          isCloneSocketBindFaultError(new Error('forkpty(3) failed.')),
        ).toEqual(false);
      });
    });

    when('[t1] our own code threw a plain programmer defect', () => {
      then('it is NOT a bind fault — it keeps its own stack', () => {
        expect(
          isCloneSocketBindFaultError(
            new TypeError('Cannot read properties of null'),
          ),
        ).toEqual(false);
      });
    });

    when('[t2] the message reads like a bind but carries NO syscall', () => {
      then(
        'it is NOT a bind fault — the field decides, never the prose',
        () => {
          // 🚨 the row that proves the structural read. every bind word is present, and a
          //   marker regex over the message would match it. node stamped no `syscall`, so
          //   node did not raise it — and a value that merely quotes a bind is not one
          expect(
            isCloneSocketBindFaultError(
              new Error(
                'listen EADDRINUSE: address already in use /run/x.sock',
              ),
            ),
          ).toEqual(false);
        },
      );
    });

    when('[t3] a NON-Error value was thrown', () => {
      then('it degrades to false rather than crash the classifier', () => {
        expect(isCloneSocketBindFaultError('a bare string throw')).toEqual(
          false,
        );
        expect(isCloneSocketBindFaultError(null)).toEqual(false);
        expect(isCloneSocketBindFaultError(undefined)).toEqual(false);
      });
    });

    when(
      '[t4] a plain object carries the syscall, with no Error prototype',
      () => {
        then('it MATCHES — the read is realm-independent by design', () => {
          // 🚨 the row that locks the deliberate absence of an `instanceof Error` guard.
          //   node mints this fault inside its own `net` module, which under jest does not
          //   share a realm with this sandbox — so `instanceof` answered false for exactly
          //   the errors the classifier exists to classify, and the integration clamp
          //   ([case5]) caught it as an UNCLASSIFIED throw.
          //
          //   ⚠️ so the widened surface is the point, never an oversight: what is asked is
          //   whether NODE STAMPED a syscall, and that question has one answer in every
          //   realm. a future edit that reintroduces the prototype check reddens this row
          expect(isCloneSocketBindFaultError({ syscall: 'listen' })).toEqual(
            true,
          );
        });
      },
    );

    when(
      '[t5] the BIND TIMEOUT fired — the fault node declares no syscall for',
      () => {
        // the exact value `genCloneSocketServer` mints and stamps. the KEY is imported
        // rather than typed, so a rename breaks the producer and this row together —
        // a literal repeated here could drift silently back to the defect
        const error = Object.assign(
          new Error(
            'clone socket bind neither succeeded nor faulted within 10000ms: /tmp/x.sock',
          ),
          { [CLONE_SOCKET_BIND_TIMEOUT_MARK]: true },
        );

        then(
          'it MATCHES — an anticipated fault of OURS, never an unknown one',
          () => {
            // 🚨 the row that closes a real gap, found by peer review at i060. the timeout was
            //   added to bound the third bind outcome (neither event fires), and it throws a
            //   plain Error with no `syscall` — because no call declared a fault, which is the
            //   condition itself. so this predicate answered FALSE, `isPtyDeviceRefusedError`
            //   answered false (it reads node-pty prose), `genCloneSpawn` took its
            //   `neither → unclassified` row, and `withCliOutputErrors` rethrew it raw for want
            //   of a `HelpfulError`. the one liveness bound this module added would, on the
            //   single occasion it fired, emit exactly the bare stack the classifier retires
            //
            //   ⚠️ the `unclassified` row exists so an UNKNOWN throw from the guarded block is
            //   never mislabeled. this fault is minted by this module, ten lines above the
            //   allowlist this module closes — anticipated, named, and ours. it was left out
            //   because the set was closed while three conditions existed and a fourth landed
            //   after, never because it belonged outside
            expect(isCloneSocketBindFaultError(error)).toEqual(true);
          },
        );

        then('the mark is read STRUCTURALLY, never off the message', () => {
          // the same sentence with no mark must NOT match — otherwise the match above proves
          // only that some bind-ish prose was present, which is the discipline this whole
          // predicate exists to refuse
          expect(
            isCloneSocketBindFaultError(
              new Error(
                'clone socket bind neither succeeded nor faulted within 10000ms: /tmp/x.sock',
              ),
            ),
          ).toEqual(false);
        });

        then('a FALSY mark does not match — the read is `=== true`', () => {
          expect(
            isCloneSocketBindFaultError({
              [CLONE_SOCKET_BIND_TIMEOUT_MARK]: false,
            }),
          ).toEqual(false);
        });
      },
    );
  });
});
