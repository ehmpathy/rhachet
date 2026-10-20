import { ConstraintError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { assertCloneSpawnDepthWithinLimit } from './assertCloneSpawnDepthWithinLimit';

describe('assertCloneSpawnDepthWithinLimit', () => {
  given('[case1] a child that would sit at depth 0 or 1', () => {
    when('[t0] the child is a top-level clone (0)', () => {
      then('it passes', () => {
        expect(() =>
          assertCloneSpawnDepthWithinLimit({ depthChild: 0 }),
        ).not.toThrow();
      });
    });

    when('[t1] the child is spawned by a top-level clone (1)', () => {
      then('it passes — depth 0 may spawn', () => {
        expect(() =>
          assertCloneSpawnDepthWithinLimit({ depthChild: 1 }),
        ).not.toThrow();
      });
    });
  });

  given('[case2] a child that would sit at depth 2', () => {
    when('[t0] a depth-1 clone tries to spawn', () => {
      then('it refuses as a constraint that names the limit', async () => {
        const error = await getError(() =>
          assertCloneSpawnDepthWithinLimit({ depthChild: 2 }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('clone spawn depth limit reached');
        expect(error.message).toMatchSnapshot();
      });

      then(
        'the metadata names the caller depth and the max that may spawn',
        async () => {
          const error = await getError(() =>
            assertCloneSpawnDepthWithinLimit({ depthChild: 2 }),
          );
          expect(error.message).toContain('"depth": 1');
          expect(error.message).toContain('"depthMaxToSpawn": 0');
        },
      );

      then(
        'the hint never names the depth env var — an agent reads it, and a clear of the var would pass the limit',
        async () => {
          const error = await getError(() =>
            assertCloneSpawnDepthWithinLimit({ depthChild: 2 }),
          );
          expect(error.message).not.toContain('RHACHET_CLONE_DEPTH');
        },
      );
    });
  });
});
