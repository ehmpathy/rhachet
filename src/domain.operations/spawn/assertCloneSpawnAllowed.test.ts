import { ConstraintError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { assertCloneSpawnAllowed } from './assertCloneSpawnAllowed';

describe('assertCloneSpawnAllowed', () => {
  given('[case1] a work clone asks to spawn', () => {
    when('[t0] it enrolls a clone', () => {
      then('it passes — every work clone may enroll one more', () => {
        expect(() =>
          assertCloneSpawnAllowed({ isCallerLeaf: false, door: 'enroll' }),
        ).not.toThrow();
      });
    });

    when('[t1] it runs a repl brain', () => {
      then('it passes — a work clone may run its reviews', () => {
        expect(() =>
          assertCloneSpawnAllowed({ isCallerLeaf: false, door: 'repl' }),
        ).not.toThrow();
      });
    });
  });

  given('[case2] a reviewer clone asks to spawn, at the enroll door', () => {
    when('[t0] it enrolls a clone', () => {
      then('it refuses as a constraint that names the reviewer', async () => {
        const error = await getError(() =>
          assertCloneSpawnAllowed({ isCallerLeaf: true, door: 'enroll' }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('a reviewer clone may not spawn');
        expect(error.message).toMatchSnapshot();
      });

      then('the metadata names the door and the cause', async () => {
        const error = await getError(() =>
          assertCloneSpawnAllowed({ isCallerLeaf: true, door: 'enroll' }),
        );
        expect(error.message).toContain(
          '"via": "a clone enroll (`rhx enroll`)"',
        );
        expect(error.message).toContain('print-mode enroll');
      });

      then(
        'the hint never names the leaf env var — an agent reads it, and a clear of the var would pass the bound',
        async () => {
          const error = await getError(() =>
            assertCloneSpawnAllowed({ isCallerLeaf: true, door: 'enroll' }),
          );
          expect(error.message).not.toContain('RHACHET_CLONE');
          expect(error.message).toContain('do not retry');
        },
      );
    });
  });

  given('[case3] a reviewer clone asks to spawn, at the repl door', () => {
    when('[t0] it runs a repl brain', () => {
      then('the door line says a review brain is a spawn', async () => {
        const error = await getError(() =>
          assertCloneSpawnAllowed({ isCallerLeaf: true, door: 'repl' }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('`rhx review`');
        expect(error.message).toMatchSnapshot();
      });
    });
  });
});
