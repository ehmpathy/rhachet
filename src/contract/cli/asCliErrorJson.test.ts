import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { asCliErrorJson } from './asCliErrorJson';

describe('asCliErrorJson', () => {
  given('[case1] a ConstraintError with a hint', () => {
    const error = new ConstraintError('bad --as value', {
      hint: 'use --as @:<slug>',
    });

    when('[t0] projected', () => {
      then('it names the class, message, and hint', () => {
        const shape = asCliErrorJson({ error });
        expect(shape.class).toEqual('ConstraintError');
        expect(shape.message).toEqual('bad --as value');
        expect(shape.hint).toEqual('use --as @:<slug>');
      });

      then('reachState is null (no reach metadata)', () => {
        expect(asCliErrorJson({ error }).reachState).toBeNull();
      });
    });
  });

  given('[case2] a MalfunctionError with no metadata', () => {
    const error = new MalfunctionError('the socket server crashed');

    when('[t0] projected', () => {
      then('it names the class and message, hint null', () => {
        const shape = asCliErrorJson({ error });
        expect(shape.class).toEqual('MalfunctionError');
        expect(shape.message).toEqual('the socket server crashed');
        expect(shape.hint).toBeNull();
      });
    });
  });

  given('[case3] a reach error whose metadata holds a reachState', () => {
    const error = new ConstraintError('no live clone for this address', {
      hint: 're-enroll to spawn a fresh clone',
      reachState: 'DEAD',
      reachCause: 'DEAD-same-host',
    });

    when('[t0] projected', () => {
      then('reachState is read off the metadata, not re-derived', () => {
        expect(asCliErrorJson({ error }).reachState).toEqual('DEAD');
      });

      then('reachCause carries the FINER same-host cause', () => {
        // a machine consumer needs DEAD-same-host (re-enroll here) distinct from
        // DEAD-cross-host (reach from origin) — the coarse reachState collapses both
        expect(asCliErrorJson({ error }).reachCause).toEqual('DEAD-same-host');
      });
    });
  });

  given('[case4] an error whose metadata.reachState is a garbage value', () => {
    const error = new ConstraintError('weird', { reachState: 'FLYING' });

    when('[t0] projected', () => {
      then('the invalid reachState is dropped to null (guarded)', () => {
        expect(asCliErrorJson({ error }).reachState).toBeNull();
      });
    });
  });

  given(
    '[case5] a wedged dispatch fault (reachCause, but NO reachState)',
    () => {
      // the two in-flight faults (wedged / exited-mid-dispatch) are thrown by sayClone
      // with a reachCause but NO reachState — so reachState alone reads them as a
      // generic error (null). reachCause is the ONLY field that names them to a machine
      const error = new ConstraintError(
        'the clone accepted the connection but did not answer in time',
        {
          hint: 'the brain may be busy — retry, or re-enroll if it stays unresponsive',
          reachCause: 'wedged',
        },
      );

      when('[t0] projected', () => {
        then('reachCause names the wedged fault', () => {
          expect(asCliErrorJson({ error }).reachCause).toEqual('wedged');
        });

        then(
          'reachState is null — the wedged fault carries no coarse state',
          () => {
            // this is the exact machine-parity gap the projection closes: without
            // reachCause, a wedged fault is indistinguishable from any other error
            expect(asCliErrorJson({ error }).reachState).toBeNull();
          },
        );
      });
    },
  );

  given('[case6] an exited-mid-dispatch fault', () => {
    const error = new ConstraintError(
      'the clone exited while the message was in flight',
      {
        hint: 're-enroll to spawn a fresh clone, then re-send',
        reachCause: 'exited-mid-dispatch',
      },
    );

    when('[t0] projected', () => {
      then('reachCause names the exited-mid-dispatch fault', () => {
        expect(asCliErrorJson({ error }).reachCause).toEqual(
          'exited-mid-dispatch',
        );
      });
    });
  });

  given('[case7] an error whose metadata.reachCause is a garbage value', () => {
    const error = new ConstraintError('weird', { reachCause: 'SPINNING' });

    when('[t0] projected', () => {
      then('the invalid reachCause is dropped to null (guarded)', () => {
        expect(asCliErrorJson({ error }).reachCause).toBeNull();
      });
    });
  });

  given('[case8] a non-reach error (no reach metadata at all)', () => {
    const error = new ConstraintError('bad --as value', {
      hint: 'use --as @:<slug>',
    });

    when('[t0] projected', () => {
      then('both reachState and reachCause are null', () => {
        const shape = asCliErrorJson({ error });
        expect(shape.reachState).toBeNull();
        expect(shape.reachCause).toBeNull();
      });
    });
  });
});
