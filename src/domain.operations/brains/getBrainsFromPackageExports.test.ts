import { given, then, when } from 'test-fns';

import { genMockedBrainAtom } from '@src/.test.assets/genMockedBrainAtom';

import { getBrainsFromPackageExports } from './getBrainsFromPackageExports';

describe('getBrainsFromPackageExports', () => {
  given('[case1] a healthy package exports valid collectors', () => {
    const mockAtom = genMockedBrainAtom({
      repo: 'anthropic',
      slug: 'anthropic/claude-opus',
    });

    when('[t0] brains are gotten from the exports', () => {
      then(
        'it delegates to asBrainsFromPackageExports and returns the brains',
        () => {
          const { atoms } = getBrainsFromPackageExports({
            packageName: 'rhachet-brains-anthropic',
            exports: { getBrainAtomsByAnthropic: () => [mockAtom] },
          });
          expect(atoms).toHaveLength(1);
          expect(atoms[0]).toBe(mockAtom);
        },
      );
    });
  });

  given('[case2] a package whose collector throws when called', () => {
    // .note = acc#3 regression clamp: a bad package must NOT sink discovery of the rest.
    //   asBrainsFromPackageExports is fail-loud (propagates), so THIS boundary must catch
    //   the throw, warn, and degrade to empty — never re-propagate out of the loop.
    when('[t0] brains are gotten from the exports', () => {
      then('it isolates the bad package: returns empty, does NOT throw', () => {
        const result = getBrainsFromPackageExports({
          packageName: 'rhachet-brains-broken',
          exports: {
            getBrainAtomsByBroken: () => {
              throw new Error('collector boom');
            },
          },
        });
        expect(result).toEqual({ atoms: [], repls: [] });
      });
    });
  });
});
