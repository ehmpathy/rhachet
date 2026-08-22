import { MalfunctionError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { getAllAgeIdentitiesForKeyPaths } from './getAllAgeIdentitiesForKeyPaths';

// inject a fake per-key getter (dependency injection) so each case controls exactly what each path
// converts to — this proves the array-shape (map-then-drop-nulls) plus that a rethrown crypto load is
// NOT swallowed by the shape, WITHOUT a jest.mock (rule.forbid.unit.remote-boundaries).
const genFakeGetOne =
  (
    byPath: Record<string, string | null>,
    throwFor?: { keyPath: string; error: Error },
  ) =>
  async (input: { keyPath: string }): Promise<string | null> => {
    if (throwFor && input.keyPath === throwFor.keyPath) throw throwFor.error;
    return input.keyPath in byPath ? byPath[input.keyPath]! : null;
  };

describe('getAllAgeIdentitiesForKeyPaths', () => {
  given('[case1] some paths convert and some miss', () => {
    when('[t0] getAllAgeIdentitiesForKeyPaths is called', () => {
      then('it returns only the converted identities, in order', async () => {
        const identities = await getAllAgeIdentitiesForKeyPaths(
          { keyPaths: ['/a', '/b', '/c'] },
          {
            getOne: genFakeGetOne({
              '/a': 'AGE-SECRET-KEY-1A',
              '/b': null,
              '/c': 'AGE-SECRET-KEY-1C',
            }),
          },
        );
        expect(identities).toEqual(['AGE-SECRET-KEY-1A', 'AGE-SECRET-KEY-1C']);
      });
    });
  });

  given('[case2] no paths are supplied', () => {
    when('[t0] getAllAgeIdentitiesForKeyPaths is called', () => {
      then('it returns an empty array', async () => {
        const identities = await getAllAgeIdentitiesForKeyPaths(
          { keyPaths: [] },
          { getOne: genFakeGetOne({}) },
        );
        expect(identities).toEqual([]);
      });
    });
  });

  given('[case3] one path throws a broken-crypto MalfunctionError', () => {
    when('[t0] getAllAgeIdentitiesForKeyPaths is called', () => {
      then(
        'it propagates the error — fails loud (e6), not a smaller pool',
        async () => {
          await expect(
            getAllAgeIdentitiesForKeyPaths(
              { keyPaths: ['/a'] },
              {
                getOne: genFakeGetOne(
                  {},
                  {
                    keyPath: '/a',
                    error: new MalfunctionError(
                      'failed to load the crypto module',
                    ),
                  },
                ),
              },
            ),
          ).rejects.toBeInstanceOf(MalfunctionError);
        },
      );
    });
  });
});
