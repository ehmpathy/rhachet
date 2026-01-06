import { BadRequestError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { genMockedBrainAtom } from '@src/.test.assets/genMockedBrainAtom';
import type { BrainAtom } from '@src/domain.objects/BrainAtom';

import { findBrainAtomByRef } from './findBrainAtomByRef';

describe('findBrainAtomByRef', () => {
  given('[case1] atoms array contains matching atom', () => {
    const mockAtom = genMockedBrainAtom();
    const atoms = [mockAtom];

    when('[t0] findBrainAtomByRef is called with matching ref', () => {
      then('it returns the matching atom', () => {
        const result = findBrainAtomByRef({
          atoms,
          ref: mockAtom,
        });
        expect(result).toBe(mockAtom);
      });
    });
  });

  given('[case2] atoms array is empty', () => {
    const mockAtom = genMockedBrainAtom();
    const atoms: BrainAtom[] = [];

    when('[t0] findBrainAtomByRef is called', () => {
      then('it throws BadRequestError with "no atoms available"', () => {
        expect(() =>
          findBrainAtomByRef({
            atoms,
            ref: mockAtom,
          }),
        ).toThrow(BadRequestError);

        try {
          findBrainAtomByRef({
            atoms,
            ref: mockAtom,
          });
        } catch (error) {
          expect((error as Error).message).toContain('no atoms available');
        }
      });
    });
  });

  given('[case3] atoms array does not contain matching atom', () => {
    const mockAtomInArray = genMockedBrainAtom({
      repo: '__mock_repo_other__',
      slug: '__mock_atom_other__',
    });
    const mockAtomToFind = genMockedBrainAtom();
    const atoms = [mockAtomInArray];

    when('[t0] findBrainAtomByRef is called with non-matching ref', () => {
      then('it throws BadRequestError with "brain atom not found"', () => {
        expect(() =>
          findBrainAtomByRef({
            atoms,
            ref: mockAtomToFind,
          }),
        ).toThrow(BadRequestError);

        try {
          findBrainAtomByRef({
            atoms,
            ref: mockAtomToFind,
          });
        } catch (error) {
          expect((error as Error).message).toContain('brain atom not found');
        }
      });
    });
  });

  given('[case4] atoms array has multiple atoms', () => {
    const atom1 = genMockedBrainAtom({
      repo: '__mock_repo_1__',
      slug: '__mock_atom_1__',
      description: 'first atom',
    });
    const atom2 = genMockedBrainAtom({
      repo: '__mock_repo_2__',
      slug: '__mock_atom_2__',
      description: 'second atom',
    });
    const atoms = [atom1, atom2];

    when('[t0] findBrainAtomByRef is called for second atom', () => {
      then('it returns the correct atom', () => {
        const result = findBrainAtomByRef({
          atoms,
          ref: atom2,
        });
        expect(result).toBe(atom2);
        expect(result.description).toEqual('second atom');
      });
    });
  });
});
