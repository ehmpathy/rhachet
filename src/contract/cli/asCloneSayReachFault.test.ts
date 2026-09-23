import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { asCloneSayReachFault } from './asCloneSayReachFault';

describe('asCloneSayReachFault', () => {
  given(
    '[case1] the MEASURED wedge — a MalfunctionError carrying reachCause, at the 30s floor',
    () => {
      // the shape joker t3/t5 threw twice on 2026-09-18 while both messages LANDED. before
      // this projection existed the run wrote no diagnostic at all, so the one failure class
      // that blocks a reliable say was the one class with no instrument
      const error = new MalfunctionError(
        'the clone did not settle the dispatch',
        {
          reachCause: 'wedged',
          wedgedMs: 30_000,
        },
      );

      when('[t0] the fault is projected', () => {
        const fault = asCloneSayReachFault({ error, sinceDispatchMs: 30_000 });

        then(
          'the class is carried, so a reader sorts caller-fault from server-fault',
          () => {
            expect(fault.class).toEqual('MalfunctionError');
          },
        );

        then('reachCause is read off the metadata — the FINER signal', () => {
          // a wedge carries NO reachState (it is not DEAD, DEAF, or LIVE-refused — it is a
          // live clone that answered no frame at all), so reachCause is the only field that
          // names it
          expect(fault.reachCause).toEqual('wedged');
          expect(fault.reachState).toEqual(null);
        });

        then('the elapsed time is carried verbatim', () => {
          // 🔴 the field that carries the diagnosis. 30000ms is the wedged-timeout FLOOR, so
          // it names a TIMER that ran out; the same error class at 12ms would name a socket
          // that died instantly. one number parts two causes the class cannot
          expect(fault.sinceDispatchMs).toEqual(30_000);
        });

        then('the message is undecorated', () => {
          expect(fault.message).toEqual(
            'the clone did not settle the dispatch',
          );
        });
      });
    },
  );

  given(
    '[case2] a ConstraintError with a reachState — the other reach shape',
    () => {
      const error = new ConstraintError('clone is not live', {
        reachState: 'DEAD',
        reachCause: 'exited-mid-dispatch',
      });

      when('[t0] the fault is projected', () => {
        const fault = asCloneSayReachFault({ error, sinceDispatchMs: 12 });

        then('both reach fields are carried when the error holds both', () => {
          expect(fault.reachState).toEqual('DEAD');
          expect(fault.reachCause).toEqual('exited-mid-dispatch');
        });

        then('a caller-fault class is preserved, never coerced', () => {
          expect(fault.class).toEqual('ConstraintError');
        });

        then('a fast fault reports its small elapsed time', () => {
          // the counter-half of case1's floor: this is what a dead socket looks like, and the
          // ONLY field that tells the two apart in a day log
          expect(fault.sinceDispatchMs).toEqual(12);
        });
      });
    },
  );

  given('[case3] an error carrying NO reach metadata at all', () => {
    // a plain throw from somewhere inside the dispatch. it must still project, since the
    // capture's whole purpose is that NO fault escapes the log (rule.forbid.failhide)
    const error = new Error('socket hangup');

    when('[t0] the fault is projected', () => {
      const fault = asCloneSayReachFault({ error, sinceDispatchMs: 400 });

      then('the reach fields degrade to null rather than throw', () => {
        expect(fault.reachState).toEqual(null);
        expect(fault.reachCause).toEqual(null);
      });

      then('the class and message still land', () => {
        expect(fault.class).toEqual('Error');
        expect(fault.message).toEqual('socket hangup');
      });
    });
  });

  given('[case4] a NON-Error throw — a bare string', () => {
    // 🔴 the clamp that matters most: this projection runs INSIDE a catch block. a throw here
    // would convert a diagnosable wedge into an undiagnosable one — the exact inversion the
    // capture exists to prevent. so a non-Error is wrapped, never dropped and never re-thrown
    when('[t0] the fault is projected', () => {
      const fault = asCloneSayReachFault({
        error: 'a thrown string',
        sinceDispatchMs: 7,
      });

      then('it does not throw, and names the wrapped class', () => {
        expect(fault.class).toEqual('Error');
      });

      then('the thrown value survives as the message', () => {
        expect(fault.message).toEqual('a thrown string');
      });
    });
  });
});
