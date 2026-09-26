import { given, then, when } from 'test-fns';

import { EventEmitter } from 'node:events';
import { exitCleanOnClosedPipe } from './exitCleanOnClosedPipe';

/**
 * .what = unit for the guard that keeps a truncated pipe from a raw node stack trace
 * .why = the defect it repairs was found on a live walk: `rhx init --hooks | head -3` dumped
 *        `node:events:497 … throw er; // Unhandled 'error' event … Error: write EPIPE` over a
 *        human's terminal. that render is what `def.frictionless` rejects and what
 *        `rule.require.errors-name-the-fix` forbids
 *
 * .why = a unit rather than an end-to-end walk, deliberately. the stdout `error` event is ASYNC, so
 *        a command that finishes fast exits before the event fires and one that pauses mid-render
 *        crashes — measured both ways on the same build. an acceptance row over that difference is
 *        a race, and a race yields a clamp with no teeth (`rule.require.clamp-edge-cases`). the two
 *        halves of the contract are pinned here instead, and BOTH bite
 */
describe('exitCleanOnClosedPipe', () => {
  given('[case1] the consumer closed the pipe — EPIPE', () => {
    when('[t0] the stream emits the write error', () => {
      const scene = (): { exits: number[]; emit: () => void } => {
        const stream = new EventEmitter();
        const exits: number[] = [];
        exitCleanOnClosedPipe({
          stream,
          exit: (code) => {
            exits.push(code);
          },
          codePrior: () => undefined,
        });
        const error: NodeJS.ErrnoException = new Error('write EPIPE');
        error.code = 'EPIPE';
        return { exits, emit: () => stream.emit('error', error) };
      };

      then('it exits 0 — a closed consumer is a normal end', () => {
        const { exits, emit } = scene();
        emit();
        expect(exits).toEqual([0]);
      });

      then('it does NOT rethrow — no stack trace reaches a human', () => {
        const { emit } = scene();
        expect(() => emit()).not.toThrow();
      });
    });
  });

  given('[case2] a REAL write error — the disk is full (ENOSPC)', () => {
    /**
     * .why = this is the `rule.forbid.failhide` half, and it is the half a bare
     *        `on('error', () => process.exit(0))` would have destroyed: every write error on
     *        stdout, of every cause, would exit 0 and report success
     */
    when('[t0] the stream emits the write error', () => {
      const scene = (): {
        exits: number[];
        error: NodeJS.ErrnoException;
        emit: () => void;
      } => {
        const stream = new EventEmitter();
        const exits: number[] = [];
        exitCleanOnClosedPipe({
          stream,
          exit: (code) => {
            exits.push(code);
          },
          codePrior: () => undefined,
        });
        const error: NodeJS.ErrnoException = new Error('write ENOSPC');
        error.code = 'ENOSPC';
        return { exits, error, emit: () => stream.emit('error', error) };
      };

      then('it RETHROWS the very same error — never swallowed', () => {
        const { error, emit } = scene();
        expect(() => emit()).toThrow(error);
      });

      then('it does NOT exit 0 — a real fault must not report success', () => {
        const { exits, emit } = scene();
        expect(() => emit()).toThrow();
        expect(exits).toEqual([]);
      });
    });
  });

  given('[case3] a write error with NO code at all', () => {
    /**
     * .why = an unclassified error is treated as real, never as a truncation. the guard keys on
     *        `EPIPE` explicitly, so an absent code falls to the rethrow — which is the safe side
     */
    when('[t0] the stream emits it', () => {
      then('it rethrows', () => {
        const stream = new EventEmitter();
        const exits: number[] = [];
        exitCleanOnClosedPipe({
          stream,
          exit: (code) => {
            exits.push(code);
          },
          codePrior: () => undefined,
        });
        expect(() => stream.emit('error', new Error('write failed'))).toThrow(
          'write failed',
        );
        expect(exits).toEqual([]);
      });
    });
  });

  given('[case4] EPIPE, but the run had ALREADY failed — a code is set', () => {
    /**
     * .what = a truncation arrives on a run that already recorded a non-zero exit
     * .why = 🔴 the harm this clamps is a SUCCESS report for a REFUSED command.
     *        `rhx run --skill <absent> | head -1` sets exit 2 for its `✋ ConstraintError`,
     *        then the reader closes the pipe. a flat `exit(0)` there tells every caller that
     *        scripts on `$?` the command SUCCEEDED — the `rule.forbid.failhide` shape at the
     *        exit-code grain, and silent, since the stderr frame still renders correctly
     * .note = the code is read AT EVENT TIME, never at arm time: the guard is armed before the
     *         command runs, so a value captured up front would always be the initial one. the
     *         thunk is what makes the late assignment visible, and this case is what proves it
     */
    when('[t0] the stream emits EPIPE while exit 2 is set', () => {
      const scene = (): { exits: number[]; emit: () => void } => {
        const stream = new EventEmitter();
        const exits: number[] = [];
        // undefined at ARM time, 2 by the time the pipe closes — the real cli sequence
        let codeOfRun: number | undefined;
        exitCleanOnClosedPipe({
          stream,
          exit: (code) => {
            exits.push(code);
          },
          codePrior: () => codeOfRun,
        });
        codeOfRun = 2;
        const error: NodeJS.ErrnoException = new Error('write EPIPE');
        error.code = 'EPIPE';
        return { exits, emit: () => stream.emit('error', error) };
      };

      then('it exits 2 — the prior failure outranks the truncation', () => {
        const { exits, emit } = scene();
        emit();
        expect(exits).toEqual([2]);
      });

      then(
        'it does NOT exit 0 — a refused command never reports success',
        () => {
          const { exits, emit } = scene();
          emit();
          expect(exits).not.toContain(0);
        },
      );

      then('it still does NOT rethrow — EPIPE stays a clean end', () => {
        const { emit } = scene();
        expect(() => emit()).not.toThrow();
      });
    });
  });

  given('[case5] EPIPE with a prior code of 0 — a run that succeeded', () => {
    /**
     * .why = the boundary of case4. a 0 is a REAL value, never an absent one, so the guard must
     *        not read it as "no code set" and must not flip it either — 0 in, 0 out. this is the
     *        case a `||` would have handled by accident and a future refactor could break
     */
    when('[t0] the stream emits EPIPE', () => {
      then('it exits 0', () => {
        const stream = new EventEmitter();
        const exits: number[] = [];
        exitCleanOnClosedPipe({
          stream,
          exit: (code) => {
            exits.push(code);
          },
          codePrior: () => 0,
        });
        const error: NodeJS.ErrnoException = new Error('write EPIPE');
        error.code = 'EPIPE';
        stream.emit('error', error);
        expect(exits).toEqual([0]);
      });
    });
  });

  given('[case6] EPIPE with a prior code node typed as a string', () => {
    /**
     * .why = node types `process.exitCode` as `number | string | undefined`, so the string arm is
     *        reachable by contract rather than by imagination. a numeric string carries its value;
     *        an unparseable one falls to 1, since node rejects such a code at exit and the safe
     *        side of an unknown is failure (`rule.forbid.failhide`), never a success report
     */
    const scene = (input: {
      codePrior: () => number | string | undefined;
    }): number[] => {
      const stream = new EventEmitter();
      const exits: number[] = [];
      exitCleanOnClosedPipe({
        stream,
        exit: (code) => {
          exits.push(code);
        },
        codePrior: input.codePrior,
      });
      const error: NodeJS.ErrnoException = new Error('write EPIPE');
      error.code = 'EPIPE';
      stream.emit('error', error);
      return exits;
    };

    when('[t0] the code is the numeric string "2"', () => {
      then('it exits 2 — the value carries, never the type', () => {
        expect(scene({ codePrior: () => '2' })).toEqual([2]);
      });
    });

    when('[t1] the code is unparseable', () => {
      then('it exits 1 — an unknown is a failure, never a success', () => {
        expect(scene({ codePrior: () => 'boom' })).toEqual([1]);
      });
    });
  });
});
